/**
 * useProjectTimer — 项目计时模式核心逻辑
 *
 * 驱动与番茄钟相同的 Timer 组件：输出 timeLeft, totalDuration, phase, status
 * 管理项目的创建、执行、暂停、恢复、跳过、插入子任务等。
 * 状态持久化到 localStorage 以支持中断恢复。
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerPhase, TimerStatus } from './useTimer';
import type {
  ProjectTask, ProjectTaskResult, ProjectState, ProjectRecord, ProjectPhase,
} from '../types/project';
import { getTodayKey } from '../utils/time';

const STORAGE_KEY = 'pomodoro-project-state';

// ─── Persistence helpers ───

function saveState(state: ProjectState | null): void {
  try {
    if (state) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* storage full */ }
}

function loadState(): ProjectState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProjectState;
  } catch {
    return null;
  }
}

// ─── Hook ───

export interface ProjectTimerView {
  /** Timer-compatible fields for driving the Timer component */
  timeLeft: number;
  totalDuration: number;
  phase: TimerPhase;
  status: TimerStatus;
  /** Current task name (shown above timer) */
  taskName: string;
  /** Progress label e.g. "2/5" */
  progressLabel: string;
  /** Progress fraction 0-1 */
  progressFraction: number;
  /** Is in overtime (past estimated time) */
  isOvertime: boolean;
  /** Overtime seconds elapsed beyond estimate */
  overtimeSeconds: number;
}

export interface UseProjectTimerReturn {
  /** Current project state (null = no active project) */
  state: ProjectState | null;
  /** Timer-compatible view for rendering */
  timerView: ProjectTimerView | null;
  /** Is there a saved project that can be recovered? */
  hasSavedProject: boolean;

  // Setup
  createProject: (name: string, tasks: ProjectTask[]) => void;
  recoverProject: () => void;
  discardSavedProject: () => void;

  // Execution
  startProject: () => void;
  pause: () => void;
  resume: () => void;

  // Task actions
  completeCurrentTask: () => void;
  skipCurrentTask: () => void;

  // Exit actions (two-step exit flow)
  /** Exit current task (mark as abandoned), returns to a "choosing" state */
  exitCurrentTask: () => void;
  /** After exit: restart the same task from zero */
  restartCurrentTask: () => void;
  /** After exit: go to next task (or finish project if last) */
  goToNextTask: () => void;
  /** After exit: go back to previous task (overtime-continued) */
  goToPreviousTask: () => void;
  /** Exit entire project immediately */
  abandonProject: () => void;

  // Mid-execution edits
  insertTask: (afterIndex: number, task: ProjectTask) => void;
  removeTask: (index: number) => void;

  // Finish
  finishProject: () => ProjectRecord;
}

export function useProjectTimer(
  onTaskComplete: (result: ProjectTaskResult) => void,
  onProjectComplete: (record: ProjectRecord) => void,
  onOvertimeStart?: () => void,
  /** Whether to auto-start work after break ends (from user settings) */
  autoStartWork?: boolean,
): UseProjectTimerReturn {
  const [state, setState] = useState<ProjectState | null>(null);
  const [hasSavedProject, setHasSavedProject] = useState(() => {
    const saved = loadState();
    return !!(saved && saved.phase !== 'setup' && saved.phase !== 'summary');
  });
  const onTaskCompleteRef = useRef(onTaskComplete);
  const onProjectCompleteRef = useRef(onProjectComplete);
  const onOvertimeStartRef = useRef(onOvertimeStart);
  const autoStartWorkRef = useRef(autoStartWork ?? false);

  useEffect(() => { onTaskCompleteRef.current = onTaskComplete; }, [onTaskComplete]);
  useEffect(() => { onProjectCompleteRef.current = onProjectComplete; }, [onProjectComplete]);
  useEffect(() => { onOvertimeStartRef.current = onOvertimeStart; }, [onOvertimeStart]);
  useEffect(() => { autoStartWorkRef.current = autoStartWork ?? false; }, [autoStartWork]);

  // Persist state changes
  useEffect(() => {
    if (state) {
      saveState(state);
    }
  }, [state]);

  const statePhase = state?.phase;

  // ─── Timer tick ───
  // 1s interval that drives the countdown for running/break/overtime phases.
  // - running: decrements timeLeft, transitions to overtime when timeLeft hits 0
  // - overtime: increments elapsedSeconds (counting up past the estimate)
  // - break: decrements timeLeft, auto-starts next task or goes to summary when done
  useEffect(() => {
    if (statePhase !== 'running' && statePhase !== 'break' && statePhase !== 'overtime') return;

    const interval = setInterval(() => {
      setState((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();

        if (prev.phase === 'running') {
          const newElapsed = prev.elapsedSeconds + 1;
          const newTimeLeft = prev.timeLeft - 1;

          if (newTimeLeft <= 0) {
            // Time's up — enter overtime, fire alert
            onOvertimeStartRef.current?.();
            return { ...prev, timeLeft: 0, elapsedSeconds: newElapsed, phase: 'overtime', lastTickAt: now };
          }
          return { ...prev, timeLeft: newTimeLeft, elapsedSeconds: newElapsed, lastTickAt: now };
        }

        if (prev.phase === 'overtime') {
          return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1, lastTickAt: now };
        }

        if (prev.phase === 'break') {
          const newTimeLeft = prev.timeLeft - 1;
          if (newTimeLeft <= 0) {
            // Break over — check if we should auto-start or pause
            if (prev.currentTaskIndex >= prev.tasks.length) {
              return { ...prev, timeLeft: 0, phase: 'summary', lastTickAt: now };
            }
            const nextTask = prev.tasks[prev.currentTaskIndex];
            if (autoStartWorkRef.current) {
              // Auto-start: immediately begin next task
              return {
                ...prev,
                timeLeft: nextTask.estimatedMinutes * 60,
                elapsedSeconds: 0,
                phase: 'running',
                lastTickAt: now,
              };
            } else {
              // Pause: wait for user to manually start
              return {
                ...prev,
                timeLeft: nextTask.estimatedMinutes * 60,
                elapsedSeconds: 0,
                phase: 'paused',
                pausedFrom: 'running',
                lastTickAt: now,
              };
            }
          }
          return { ...prev, timeLeft: newTimeLeft, lastTickAt: now };
        }

        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [statePhase]);

  // ─── Compute timer view ───
  // Maps the internal ProjectState into a flat object that the Timer component
  // can render directly. Returns null when the project is in setup/summary/exited
  // (i.e., no active countdown to display).
  //
  // Key mapping rules:
  //   - break phase → TimerPhase 'break', status 'running'
  //   - paused phase → status 'paused', phase from pausedFrom
  //   - running/overtime → TimerPhase 'work', status 'running'
  //   - progressLabel shows "N/total" where N = completed count (break) or completed+1 (work)
  const timerView: ProjectTimerView | null = (() => {
    if (!state || state.phase === 'setup' || state.phase === 'summary' || state.phase === 'exited') return null;

    const currentTask = state.tasks[state.currentTaskIndex];
    const completedCount = state.results.length;
    const totalCount = state.tasks.length;
    const isOvertime = state.phase === 'overtime' || (state.phase === 'paused' && state.pausedFrom === 'overtime');
    const isBreak = state.phase === 'break';
    const overtimeSeconds = isOvertime ? state.elapsedSeconds - (currentTask.estimatedMinutes * 60) : 0;

    // Map to Timer-compatible phase/status
    let phase: TimerPhase;
    let status: TimerStatus;

    if (isBreak) {
      phase = 'break';
      status = 'running';
    } else if (state.phase === 'paused') {
      phase = state.pausedFrom === 'break' ? 'break' : 'work';
      status = 'paused';
    } else {
      phase = 'work';
      status = isOvertime ? 'running' : 'running';
    }

    // totalDuration for the progress ring.
    // During break, currentTaskIndex already points to the NEXT task,
    // but the break duration was set from the PREVIOUS task's breakMinutes.
    // Use the previous task's breakMinutes for accurate ring display.
    const isInBreakPhase = isBreak || (state.phase === 'paused' && state.pausedFrom === 'break');
    let totalDuration: number;
    if (isInBreakPhase) {
      const prevTaskIndex = state.currentTaskIndex - 1;
      const breakTask = prevTaskIndex >= 0 ? state.tasks[prevTaskIndex] : currentTask;
      totalDuration = breakTask.breakMinutes * 60;
    } else {
      totalDuration = currentTask.estimatedMinutes * 60;
    }

    const showBreakProgress = isInBreakPhase;

    return {
      timeLeft: isOvertime ? overtimeSeconds : state.timeLeft,
      totalDuration,
      phase,
      status,
      taskName: currentTask?.name || '',
      progressLabel: `${showBreakProgress ? completedCount : completedCount + 1}/${totalCount}`,
      progressFraction: totalCount > 0 ? completedCount / totalCount : 0,
      isOvertime,
      overtimeSeconds,
    };
  })();

  // ─── Setup ───

  const createProject = useCallback((name: string, tasks: ProjectTask[]) => {
    const newState: ProjectState = {
      id: Date.now().toString(),
      name,
      tasks,
      results: [],
      currentTaskIndex: 0,
      phase: 'setup',
      timeLeft: tasks[0]?.estimatedMinutes * 60 || 0,
      elapsedSeconds: 0,
      lastTickAt: new Date().toISOString(),
      startedAt: '',
    };
    setState(newState);
    setHasSavedProject(false);
  }, []);

  /**
   * Recover a saved project from localStorage.
   * Calculates the time delta since the last tick to fast-forward the timer,
   * then pauses so the user can review the state before resuming.
   *
   * Recovery scenarios:
   * - running: subtract delta from timeLeft; if ≤0, enter overtime
   * - break: subtract delta from timeLeft; if ≤0, advance to next task or summary
   * - overtime: add delta to elapsedSeconds
   * - paused: no time adjustment needed (timer wasn't ticking)
   */
  const recoverProject = useCallback(() => {
    const saved = loadState();
    if (!saved) return;

    // Calculate time delta for recovery
    if (saved.phase === 'running' || saved.phase === 'break' || saved.phase === 'overtime') {
      const elapsed = Math.floor((Date.now() - new Date(saved.lastTickAt).getTime()) / 1000);

      if (saved.phase === 'running') {
        saved.elapsedSeconds += elapsed;
        saved.timeLeft = Math.max(0, saved.timeLeft - elapsed);
        if (saved.timeLeft <= 0) {
          saved.phase = 'overtime';
        }
      } else if (saved.phase === 'break') {
        saved.timeLeft = Math.max(0, saved.timeLeft - elapsed);
        if (saved.timeLeft <= 0) {
          // currentTaskIndex already points to next task
          if (saved.currentTaskIndex >= saved.tasks.length) {
            saved.phase = 'summary';
          } else {
            saved.timeLeft = saved.tasks[saved.currentTaskIndex].estimatedMinutes * 60;
            saved.elapsedSeconds = 0;
            saved.phase = 'running';
          }
        }
      } else if (saved.phase === 'overtime') {
        saved.elapsedSeconds += elapsed;
      }

      // Pause after recovery so user can see the state
      if (saved.phase === 'running' || saved.phase === 'overtime') {
        saved.phase = 'paused';
      }
    }

    saved.lastTickAt = new Date().toISOString();
    setState(saved);
    setHasSavedProject(false);
  }, []);

  const discardSavedProject = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedProject(false);
  }, []);

  // ─── Execution ───

  const startProject = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.tasks.length === 0) return prev;
      const firstTask = prev.tasks[0];
      return {
        ...prev,
        phase: 'running',
        currentTaskIndex: 0,
        timeLeft: firstTask.estimatedMinutes * 60,
        elapsedSeconds: 0,
        startedAt: new Date().toISOString(),
        lastTickAt: new Date().toISOString(),
      };
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      if (prev.phase === 'running' || prev.phase === 'break' || prev.phase === 'overtime') {
        return { ...prev, pausedFrom: prev.phase, phase: 'paused', lastTickAt: new Date().toISOString() };
      }
      return prev;
    });
  }, []);

  const resume = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.phase !== 'paused') return prev;
      const resumePhase: ProjectPhase = prev.pausedFrom || 'running';
      return { ...prev, phase: resumePhase, pausedFrom: undefined, lastTickAt: new Date().toISOString() };
    });
  }, []);

  // ─── Task actions ───

  /**
   * Record a task result and transition to the next state.
   * After recording, either enters break (with currentTaskIndex advanced to next task)
   * or goes to summary if this was the last task.
   *
   * Note: currentTaskIndex is advanced at break entry (not break exit).
   * This means during break, currentTaskIndex already points to the NEXT task,
   * which is important for break duration lookup and progressLabel display.
   */
  const recordTaskResult = useCallback((prev: ProjectState, status: 'completed' | 'skipped'): ProjectState => {
    const task = prev.tasks[prev.currentTaskIndex];
    const result: ProjectTaskResult = {
      taskId: task.id,
      name: task.name,
      estimatedMinutes: task.estimatedMinutes,
      actualSeconds: prev.elapsedSeconds,
      status,
      completedAt: new Date().toISOString(),
      ...(prev.revisitPreviousSeconds != null ? { previousSeconds: prev.revisitPreviousSeconds } : {}),
    };

    onTaskCompleteRef.current(result);

    const newResults = [...prev.results, result];
    const nextIndex = prev.currentTaskIndex + 1;

    // Check if this was the last task
    if (nextIndex >= prev.tasks.length) {
      return {
        ...prev,
        results: newResults,
        phase: 'summary',
        timeLeft: 0,
        revisitPreviousSeconds: undefined,
        lastTickAt: new Date().toISOString(),
      };
    }

    // Enter break, advance currentTaskIndex to next task already
    return {
      ...prev,
      results: newResults,
      currentTaskIndex: nextIndex,
      phase: 'break',
      timeLeft: task.breakMinutes * 60,
      revisitPreviousSeconds: undefined,
      lastTickAt: new Date().toISOString(),
    };
  }, []);

  /**
   * Complete current task during work/overtime: records result and enters break.
   * During break: skips remaining break time and starts the next task immediately.
   * Blocked during setup/summary/exited and paused-from-break states.
   */
  const completeCurrentTask = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      if (prev.phase === 'setup' || prev.phase === 'summary' || prev.phase === 'exited') return prev;
      // Allow completing during break — skip the break and start next task
      if (prev.phase === 'break') {
        const nextTask = prev.tasks[prev.currentTaskIndex];
        if (!nextTask) return { ...prev, phase: 'summary', timeLeft: 0, lastTickAt: new Date().toISOString() };
        return {
          ...prev,
          phase: 'running',
          timeLeft: nextTask.estimatedMinutes * 60,
          elapsedSeconds: 0,
          lastTickAt: new Date().toISOString(),
        };
      }
      if (prev.phase === 'paused' && prev.pausedFrom === 'break') return prev;
      return recordTaskResult(prev, 'completed');
    });
  }, [recordTaskResult]);

  const skipCurrentTask = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      if (prev.phase === 'break' || prev.phase === 'setup' || prev.phase === 'summary' || prev.phase === 'exited') return prev;
      if (prev.phase === 'paused' && prev.pausedFrom === 'break') return prev;
      return recordTaskResult(prev, 'skipped');
    });
  }, [recordTaskResult]);

  // ─── Exit flow (two-step) ───

  /** Step 1: Exit current task — record as abandoned, enter 'exited' phase */
  const exitCurrentTask = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      if (prev.phase === 'setup' || prev.phase === 'summary' || prev.phase === 'exited') return prev;
      // If in break, just exit (no task to abandon)
      if (prev.phase === 'break') {
        return { ...prev, phase: 'exited', lastTickAt: new Date().toISOString() };
      }
      // Record current task as abandoned (only in state.results, NOT triggering App callback yet).
      // The callback is deferred until the user makes a final choice:
      // - restartCurrentTask: removes the abandoned result (no callback needed)
      // - goToNextTask: fires the callback for the abandoned result
      // - goToPreviousTask: removes the abandoned result (no callback needed)
      const task = prev.tasks[prev.currentTaskIndex];
      const result: ProjectTaskResult = {
        taskId: task.id,
        name: task.name,
        estimatedMinutes: task.estimatedMinutes,
        actualSeconds: prev.elapsedSeconds,
        status: 'abandoned',
        completedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        results: [...prev.results, result],
        phase: 'exited',
        lastTickAt: new Date().toISOString(),
      };
    });
  }, []);

  /** Step 2a: Restart the same task from zero — removes the abandoned result from exit */
  const restartCurrentTask = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.phase !== 'exited') return prev;
      const task = prev.tasks[prev.currentTaskIndex];
      // Remove the abandoned result that was added during exitCurrentTask,
      // since the user chose to restart (the abandoned attempt shouldn't count)
      const lastResult = prev.results[prev.results.length - 1];
      const cleanedResults = (lastResult && lastResult.taskId === task.id && lastResult.status === 'abandoned')
        ? prev.results.slice(0, -1)
        : prev.results;
      return {
        ...prev,
        results: cleanedResults,
        phase: 'running',
        timeLeft: task.estimatedMinutes * 60,
        elapsedSeconds: 0,
        lastTickAt: new Date().toISOString(),
      };
    });
  }, []);

  /** Step 2b: Go to next task (or finish if last) — fires abandoned callback */
  const goToNextTask = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.phase !== 'exited') return prev;

      // Now that the user confirmed moving on, fire the callback for the abandoned task
      const abandonedResult = prev.results[prev.results.length - 1];
      if (abandonedResult && abandonedResult.status === 'abandoned') {
        onTaskCompleteRef.current(abandonedResult);
      }

      const nextIndex = prev.currentTaskIndex + 1;
      if (nextIndex >= prev.tasks.length) {
        // Last task — go to summary
        return { ...prev, phase: 'summary', timeLeft: 0, lastTickAt: new Date().toISOString() };
      }
      // Enter break before next task, advance index now
      const currentTask = prev.tasks[prev.currentTaskIndex];
      return {
        ...prev,
        currentTaskIndex: nextIndex,
        phase: 'break',
        timeLeft: currentTask.breakMinutes * 60,
        lastTickAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Step 2c: Go back to previous task (overtime-continued).
   * Restores the actual elapsed time from the previous result so overtime
   * continues from where it left off. Removes the previous result to avoid
   * duplicate rewards when the task is completed again.
   */
  const goToPreviousTask = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.phase !== 'exited') return prev;
      if (prev.currentTaskIndex === 0) return prev; // Can't go back from first
      const prevIndex = prev.currentTaskIndex - 1;
      const prevTask = prev.tasks[prevIndex];

      // Find and remove the previous result for this task to avoid duplicate rewards
      let prevResultIndex = -1;
      for (let i = prev.results.length - 1; i >= 0; i--) {
        if (prev.results[i].taskId === prevTask.id) { prevResultIndex = i; break; }
      }
      let restoredElapsed = prevTask.estimatedMinutes * 60; // fallback
      let cleanedResults = prev.results;

      if (prevResultIndex !== -1) {
        // Restore the actual elapsed time from the previous attempt
        restoredElapsed = prev.results[prevResultIndex].actualSeconds;
        // Remove that result — it will be re-recorded when the task completes again
        cleanedResults = [...prev.results];
        cleanedResults.splice(prevResultIndex, 1);
      }

      // Also remove the abandoned result from the current task's exit (if any)
      const currentTask = prev.tasks[prev.currentTaskIndex];
      const lastResult = cleanedResults[cleanedResults.length - 1];
      if (lastResult && lastResult.taskId === currentTask.id && lastResult.status === 'abandoned') {
        cleanedResults = cleanedResults.slice(0, -1);
      }

      return {
        ...prev,
        results: cleanedResults,
        currentTaskIndex: prevIndex,
        phase: 'overtime',
        timeLeft: 0,
        elapsedSeconds: restoredElapsed,
        revisitPreviousSeconds: restoredElapsed,
        lastTickAt: new Date().toISOString(),
      };
    });
  }, []);

  // ─── Mid-execution edits ───

  const insertTask = useCallback((afterIndex: number, task: ProjectTask) => {
    setState((prev) => {
      if (!prev) return prev;
      const newTasks = [...prev.tasks];
      newTasks.splice(afterIndex + 1, 0, task);
      return { ...prev, tasks: newTasks };
    });
  }, []);

  const removeTask = useCallback((index: number) => {
    setState((prev) => {
      if (!prev) return prev;
      if (index === prev.currentTaskIndex && prev.phase !== 'setup') return prev;
      const newTasks = prev.tasks.filter((_, i) => i !== index);
      let newIndex = prev.currentTaskIndex;
      if (index < prev.currentTaskIndex) {
        newIndex = Math.max(0, newIndex - 1);
      }
      return { ...prev, tasks: newTasks, currentTaskIndex: newIndex };
    });
  }, []);

  // ─── Finish ───

  const finishProject = useCallback((): ProjectRecord => {
    if (!state) throw new Error('No active project');
    const record: ProjectRecord = {
      id: state.id,
      name: state.name,
      tasks: state.results,
      totalEstimatedSeconds: state.tasks.reduce((sum, t) => sum + t.estimatedMinutes * 60, 0),
      totalActualSeconds: state.results.reduce((sum, r) => sum + r.actualSeconds, 0),
      startedAt: state.startedAt,
      completedAt: new Date().toISOString(),
      date: getTodayKey(),
    };
    onProjectCompleteRef.current(record);
    localStorage.removeItem(STORAGE_KEY);
    setState(null);
    return record;
  }, [state]);

  const abandonProject = useCallback(() => {
    // Fire callback for any pending abandoned result before clearing state
    const current = state;
    if (current && current.phase === 'exited') {
      const abandonedResult = current.results[current.results.length - 1];
      if (abandonedResult && abandonedResult.status === 'abandoned') {
        onTaskCompleteRef.current(abandonedResult);
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    setState(null);
  }, [state]);

  return {
    state,
    timerView,
    hasSavedProject,
    createProject,
    recoverProject,
    discardSavedProject,
    startProject,
    pause,
    resume,
    completeCurrentTask,
    skipCurrentTask,
    exitCurrentTask,
    restartCurrentTask,
    goToNextTask,
    goToPreviousTask,
    abandonProject,
    insertTask,
    removeTask,
    finishProject,
  };
}
