/**
 * useTimer — Pomodoro timer state machine
 *
 * Manages a simple work → break → work → break infinite cycle.
 * No long-break / round system (removed in v0.4).
 *
 * v0.8.1: Added overtime mode for workMinutes > 25.
 * When workMinutes > 25, timer enters overtime (count-up) at 0 instead of
 * auto-completing. User must manually click Done to finish.
 *
 * State machine:
 *   idle ──start──▶ running ──pause──▶ paused ──resume──▶ running
 *     ▲                │                                      │
 *     └── abandon ─────┘                                      │
 *     └──────────── timeLeft=0 ───▶ overtime (count-up) ──────┘
 *                                       │
 *                                       └── skip (manual Done) ──▶ break
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { PomodoroSettings } from '../types';

/** Timer phase: 'work' = focus session, 'break' = rest period, 'overtime' = past set time */
export type TimerPhase = 'work' | 'break' | 'overtime';

/** Timer status: 'idle' = not started, 'running' = counting down/up, 'paused' = frozen */
export type TimerStatus = 'idle' | 'running' | 'paused';

interface UseTimerOptions {
  settings: PomodoroSettings;
  /** Called when a phase completes (timeLeft reaches 0 for ≤25min, or manual Done) */
  onComplete: (phase: TimerPhase) => void;
  /** Called when user manually completes (✓) during work — receives elapsed seconds */
  onSkipWork: (elapsedSeconds: number) => void;
}

interface UseTimerReturn {
  timeLeft: number;
  phase: TimerPhase;
  status: TimerStatus;
  /** True while the celebration animation is playing after work completion */
  celebrating: boolean;
  celebrationStage: TimerPhase | null;
  /** Overtime seconds (counting up past set time, 0 when not in overtime) */
  overtimeSeconds: number;
  dismissCelebration: () => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  /** Manual complete: records partial work or skips break */
  skip: () => void;
  /** Abandon current session without recording (resets to idle) */
  abandon: () => void;
  reset: () => void;
}

/** Get the duration in seconds for a given phase */
function getDuration(phase: TimerPhase, settings: PomodoroSettings): number {
  if (phase === 'overtime') return 0;
  return phase === 'work'
    ? settings.workMinutes * 60
    : settings.shortBreakMinutes * 60;
}

export function useTimer({ settings, onComplete, onSkipWork }: UseTimerOptions): UseTimerReturn {
  const [phase, setPhase] = useState<TimerPhase>('work');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [timeLeft, setTimeLeft] = useState(settings.workMinutes * 60);
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [celebrationStage, setCelebrationStage] = useState<TimerPhase | null>(null);
  const [generation, setGeneration] = useState(0);
  // Refs to avoid stale closures in effects/callbacks.
  const onCompleteRef = useRef(onComplete);
  const onSkipWorkRef = useRef(onSkipWork);
  const settingsRef = useRef(settings);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onSkipWorkRef.current = onSkipWork; }, [onSkipWork]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const handlePhaseElapsed = useCallback((completedPhase: Exclude<TimerPhase, 'overtime'>) => {
    try {
      const s = settingsRef.current;

      if (completedPhase === 'work') {
        // >25min: enter overtime mode, don't auto-complete
        if (s.workMinutes > 25) {
          setPhase('overtime');
          setOvertimeSeconds(0);
          setGeneration((g) => g + 1); // restart interval for count-up
          return;
        }

        // <=25min: normal completion
        setCelebrating(true);
        setCelebrationStage(completedPhase);
      }

      // Transition to next phase
      const nextPhase: TimerPhase = completedPhase === 'work' ? 'break' : 'work';
      setPhase(nextPhase);
      setTimeLeft(getDuration(nextPhase, s));
      setOvertimeSeconds(0);

      // Auto-start logic (autoStartBreak disabled for >25min, but we only reach here for <=25min work)
      const shouldAutoStart = completedPhase === 'work'
        ? s.autoStartBreak
        : s.autoStartWork;

      if (shouldAutoStart) {
        setGeneration((g) => g + 1);
      } else {
        setStatus('idle');
      }

      onCompleteRef.current(completedPhase);
    } catch (err) {
      console.error('[useTimer] phase completion error:', err);
    }
  }, []);

  // Core countdown interval — ticks every 1s while running.
  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      if (phase === 'overtime') {
        // Count up in overtime
        setOvertimeSeconds((prev) => prev + 1);
      } else {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, generation, phase]);

  // Phase completion handler — schedule transition when timeLeft hits 0 during running.
  useEffect(() => {
    if (timeLeft !== 0 || status !== 'running' || phase === 'overtime') return;

    const completedPhase = phase;
    const timeoutId = window.setTimeout(() => {
      handlePhaseElapsed(completedPhase);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [timeLeft, status, phase, handlePhaseElapsed]);

  const start = useCallback(() => {
    const s = settingsRef.current;
    setTimeLeft(getDuration(phase, s));
    setOvertimeSeconds(0);
    setGeneration((g) => g + 1);
    setStatus('running');
  }, [phase]);

  const pause = useCallback(() => {
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    setGeneration((g) => g + 1);
    setStatus('running');
  }, []);

  /**
   * Skip (manual complete): during work/overtime, records elapsed time via onSkipWork;
   * during break, just advances to next phase.
   */
  const skip = useCallback(() => {
    const s = settingsRef.current;

    if (phase === 'work' || phase === 'overtime') {
      const totalWorkSeconds = s.workMinutes * 60;
      const elapsedSeconds = phase === 'overtime'
        ? totalWorkSeconds + overtimeSeconds
        : totalWorkSeconds - timeLeft;

      if (elapsedSeconds > 0) {
        onSkipWorkRef.current(elapsedSeconds);
      }

      // Show celebration for work/overtime completion
      setCelebrating(true);
      setCelebrationStage('work');
    }

    const nextPhase: TimerPhase = (phase === 'work' || phase === 'overtime') ? 'break' : 'work';
    setPhase(nextPhase);
    setTimeLeft(getDuration(nextPhase, s));
    setOvertimeSeconds(0);

    // Auto-start logic: disabled for break after >25min work
    const isFromWork = phase === 'work' || phase === 'overtime';
    const shouldAutoStart = isFromWork
      ? (s.workMinutes <= 25 && s.autoStartBreak)
      : s.autoStartWork;

    if (shouldAutoStart) {
      setGeneration((g) => g + 1);
      setStatus('running');
    } else {
      setStatus('idle');
    }
  }, [phase, timeLeft, overtimeSeconds]);

  const abandon = useCallback(() => {
    const s = settingsRef.current;
    setPhase('work');
    setTimeLeft(getDuration('work', s));
    setOvertimeSeconds(0);
    setStatus('idle');
    setCelebrating(false);
    setCelebrationStage(null);
  }, []);

  const reset = useCallback(() => {
    setPhase('work');
    setTimeLeft(settingsRef.current.workMinutes * 60);
    setOvertimeSeconds(0);
    setStatus('idle');
    setCelebrating(false);
    setCelebrationStage(null);
  }, []);

  const dismissCelebration = useCallback(() => {
    setCelebrating(false);
    setCelebrationStage(null);
  }, []);

  const effectiveTimeLeft = status === 'idle' ? getDuration(phase, settings) : timeLeft;
  const effectiveOvertimeSeconds = status === 'idle' ? 0 : overtimeSeconds;

  return {
    timeLeft: effectiveTimeLeft,
    phase,
    status,
    celebrating,
    celebrationStage,
    overtimeSeconds: effectiveOvertimeSeconds,
    dismissCelebration,
    start,
    pause,
    resume,
    skip,
    abandon,
    reset,
  };
}
