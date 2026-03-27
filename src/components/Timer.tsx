/**
 * Timer — Core timer display component
 *
 * Renders the circular SVG progress ring, countdown/overtime digits,
 * phase label capsule, and control buttons (✗ / ▶⏸ / ✓).
 *
 * Shared by both Pomodoro mode and Project mode — the parent maps
 * its state into the props defined below.
 *
 * Key behaviors:
 * - Idle: shows ▶ start button + quick duration picker on digit click
 * - Running: shows ✗ (abandon) + ⏸ (pause) + ✓ (complete)
 * - Break phase: hides ✗/✓, only shows ⏸/▶
 * - Overtime: progress ring turns red with pulse animation, digits show "+MM:SS"
 * - Celebration: overlay with confetti + bouncing growth icon
 * - Count-up/down toggle: click digits during running/paused to switch display mode
 *
 * v0.4.6: ✓/✗ buttons use a 300ms debounce lock (guardedAction) to prevent
 * race conditions from rapid taps.
 * v0.5.0: Click timer digits to toggle between countdown and count-up display.
 *         Preference saved to localStorage, persists across sessions.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import type { TimerPhase, TimerStatus } from '../hooks/useTimer';
import type { GrowthStage } from '../types';
import { formatTime } from '../utils/time';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import { CelebrationOverlay } from './CelebrationOverlay';
import { Toast } from './Toast';

/** Timer display mode: countdown (default) or count-up */
type TimerDisplayMode = 'countdown' | 'countup';

const DISPLAY_MODE_KEY = 'pomodoro-timer-display-mode';

/** Available quick-pick durations shown when user clicks the timer digits in idle state */
const QUICK_DURATIONS = [5, 10, 15, 20, 25, 30, 45, 60];

/** Debounce window (ms) for ✓/✗ button actions to prevent double-tap race conditions */
const ACTION_DEBOUNCE_MS = 300;

/** Long-press duration (ms) for ✓/✗ buttons */
const LONG_PRESS_MS = 1500;

interface TimerProps {
  timeLeft: number;
  totalDuration: number;
  phase: TimerPhase;
  status: TimerStatus;
  celebrating: boolean;
  celebrationStage: GrowthStage | null;
  celebrationIsRipe: boolean;
  workMinutes: number;
  onCelebrationComplete: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onAbandon: () => void;
  onChangeWorkMinutes: (minutes: number) => void;
  /** Overtime mode: show elapsed time counting up with red styling */
  overtime?: { seconds: number };
}

/** Read saved display mode from localStorage */
function loadDisplayMode(): TimerDisplayMode {
  try {
    const v = localStorage.getItem(DISPLAY_MODE_KEY);
    return v === 'countup' ? 'countup' : 'countdown';
  } catch { return 'countdown'; }
}

export function Timer({ timeLeft, totalDuration, phase, status, celebrating, celebrationStage, celebrationIsRipe, workMinutes, onCelebrationComplete, onStart, onPause, onResume, onSkip, onAbandon, onChangeWorkMinutes, overtime }: TimerProps) {
  const isWork = phase === 'work' || phase === 'overtime';
  const isOvertime = !!overtime;
  const progress = isOvertime ? 1 : (totalDuration > 0 ? (totalDuration - timeLeft) / totalDuration : 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef<TimerStatus>(status);
  const [showQuickPicker, setShowQuickPicker] = useState(false);

  // ─── Count-up / countdown toggle ───
  const [displayMode, setDisplayMode] = useState<TimerDisplayMode>(loadDisplayMode);
  const [digitBounce, setDigitBounce] = useState(false);

  const toggleDisplayMode = useCallback(() => {
    setDisplayMode((prev) => {
      const next: TimerDisplayMode = prev === 'countdown' ? 'countup' : 'countdown';
      try { localStorage.setItem(DISPLAY_MODE_KEY, next); } catch { /* ignore */ }
      return next;
    });
    // Trigger bounce animation
    setDigitBounce(true);
    setTimeout(() => setDigitBounce(false), 200);
  }, []);

  // ─── Long-press for ✓/✗ buttons ───
  const [longPressProgress, setLongPressProgress] = useState(0); // 0-1
  const [longPressTarget, setLongPressTarget] = useState<'skip' | 'abandon' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const longPressStartRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ─── Health reminder toast (independent from long-press toast) ───
  const [healthToast, setHealthToast] = useState(false);

  const startLongPress = useCallback((target: 'skip' | 'abandon', action: () => void) => {
    longPressStartRef.current = Date.now();
    setLongPressTarget(target);
    setLongPressProgress(0);

    longPressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - longPressStartRef.current;
      const p = Math.min(elapsed / LONG_PRESS_MS, 1);
      setLongPressProgress(p);
      if (p >= 1) {
        clearInterval(longPressTimerRef.current);
        setLongPressTarget(null);
        setLongPressProgress(0);
        action();
      }
    }, 16);
  }, []);

  const cancelLongPress = useCallback((showToastMsg?: string) => {
    if (longPressTimerRef.current) clearInterval(longPressTimerRef.current);
    const wasActive = longPressTarget !== null;
    setLongPressTarget(null);
    setLongPressProgress(0);
    // Show toast only if it was a short tap (not a completed long press)
    if (wasActive && showToastMsg && longPressProgress < 0.3) {
      setToast(showToastMsg);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 1500);
    }
  }, [longPressTarget, longPressProgress]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearInterval(longPressTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ─── Final sprint detection (progressive urgency) ───
  const isSprintT1 = isWork && status === 'running' && !isOvertime && timeLeft <= 60 && timeLeft > 30; // gentle
  const isSprintT2 = isWork && status === 'running' && !isOvertime && timeLeft <= 30 && timeLeft > 10; // urgent
  const isSprintT3 = isWork && status === 'running' && !isOvertime && timeLeft <= 10 && timeLeft > 0;  // intense

  // Bug 2 fix: debounce ✓ and ✗ to prevent race conditions
  const actionLockRef = useRef(false);
  const actionLockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const guardedAction = useCallback((fn: () => void) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    fn();
    actionLockTimer.current = setTimeout(() => { actionLockRef.current = false; }, ACTION_DEBOUNCE_MS);
  }, []);

  const handleStart = useCallback(() => {
    setShowQuickPicker(false);
    onStart();
  }, [onStart]);

  const handleResume = useCallback(() => {
    setShowQuickPicker(false);
    onResume();
  }, [onResume]);

  useEffect(() => {
    return () => { if (actionLockTimer.current) clearTimeout(actionLockTimer.current); };
  }, []);

  useEffect(() => {
    if (status === 'running' && prevStatusRef.current === 'idle' && containerRef.current) {
      containerRef.current.classList.remove('animate-scale-in');
      void containerRef.current.offsetWidth;
      containerRef.current.classList.add('animate-scale-in');
    }
    prevStatusRef.current = status;
  }, [status]);

  // ─── SVG progress ring geometry ───
  // The ring is drawn as a circle with stroke-dasharray/dashoffset to show progress.
  const size = 320;
  const center = size / 2;
  const radius = 136;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Glowing head dot position — follows the progress arc
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  const headX = center + radius * Math.cos(angle);
  const headY = center + radius * Math.sin(angle);

  const theme = useTheme();
  const t = useI18n();

  // 根据主题和阶段选择颜色
  // ─── Phase-dependent color sets ───
  // Work: theme accent gradient; Break: cool tones; Overtime: red warning
  // Final sprint: keep theme colors (glow effect added via CSS classes)
  const workColors = { from: theme.accent, mid: theme.accentEnd, to: theme.accentEnd };
  const breakColors = { from: theme.breakAccent, mid: theme.breakAccentEnd, to: theme.breakAccentEnd };
  const overtimeColors = { from: '#ef4444', mid: '#f87171', to: '#fca5a5' };
  const colors = isOvertime ? overtimeColors : isWork ? workColors : breakColors;

  // ─── Ring base (track) color ───
  // If theme provides explicit ringBase, use it; otherwise fall back to accent + ring opacity
  const ringBaseFrom = theme.ringBase ?? colors.from;
  const ringBaseEnd = theme.ringBaseEnd ?? colors.mid;
  const ringBaseOpacityFrom = theme.ringBase ? '1' : theme.ring;
  const ringBaseOpacityTo = theme.ringBase ? '0.6' : (parseFloat(theme.ring) * 0.4).toFixed(2);

  return (
    <div ref={containerRef} className="flex flex-col items-center relative">
      {/* Celebration overlay */}
      {celebrating && celebrationStage && (
        <CelebrationOverlay
          stage={celebrationStage}
          isRipe={celebrationIsRipe}
          onComplete={onCelebrationComplete}
        />
      )}

      {/* Circular timer */}
      <div className="relative w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] flex items-center justify-center overflow-visible">
        <svg className={`absolute inset-0 overflow-visible ${celebrating ? 'animate-ring-pulse' : ''} ${isOvertime ? 'animate-ring-pulse' : ''} ${isSprintT1 ? 'animate-sprint-breathe-slow' : ''} ${isSprintT2 ? 'animate-sprint-breathe-fast' : ''} ${isSprintT3 ? 'animate-sprint-flash' : ''}`} viewBox={`0 0 ${size} ${size}`} overflow="visible" style={{ filter: `drop-shadow(0 0 12px ${colors.from}40)` }}>
          <defs>
            <linearGradient id="grad-progress" gradientUnits="userSpaceOnUse"
              x1={center} y1="0" x2={size} y2={size}>
              <stop offset="0%" stopColor={colors.from} />
              <stop offset="50%" stopColor={colors.mid} />
              <stop offset="100%" stopColor={colors.to} />
            </linearGradient>
            <linearGradient id="grad-base" gradientUnits="userSpaceOnUse"
              x1={center} y1="0" x2={size} y2={size}>
              <stop offset="0%" stopColor={isWork && !isOvertime ? ringBaseFrom : colors.from} stopOpacity={isWork && !isOvertime ? ringBaseOpacityFrom : '0.20'} />
              <stop offset="100%" stopColor={isWork && !isOvertime ? ringBaseEnd : colors.mid} stopOpacity={isWork && !isOvertime ? ringBaseOpacityTo : '0.08'} />
            </linearGradient>
            <filter id="glow-head" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feFlood floodColor={colors.mid} floodOpacity="0.8" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="inner-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={colors.from} stopOpacity="0.10" />
              <stop offset="50%" stopColor={colors.from} stopOpacity="0.04" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx={center} cy={center} r={radius - 10} fill="url(#inner-glow)" />

          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke="url(#grad-base)" strokeWidth="8"
            transform={`rotate(-90 ${center} ${center})`}
          />

          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke="url(#grad-progress)" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${center} ${center})`}
            className="transition-all duration-1000 ease-linear"
          />

          {progress > 0.005 && status !== 'idle' && (
            <circle
              cx={headX} cy={headY} r="6"
              fill={colors.to} filter="url(#glow-head)"
              className={status === 'running' ? 'animate-glow-dot' : ''}
            />
          )}
        </svg>

        {/* Compute displayed time based on display mode */}
        {(() => {
          // Determine what to show and whether the digit area is clickable for toggle
          const isActive = status === 'running' || status === 'paused';
          const canToggle = isActive && !isOvertime;
          const canQuickPick = status === 'idle' && isWork && !isOvertime;

          let displayText: string;
          if (isOvertime) {
            displayText = `+${formatTime(overtime!.seconds)}`;
          } else if (canToggle && displayMode === 'countup') {
            // Count-up: show elapsed time
            const elapsed = totalDuration - timeLeft;
            displayText = formatTime(elapsed);
          } else {
            displayText = formatTime(timeLeft);
          }

          return (
            <span
              className={`text-6xl sm:text-7xl font-timer tracking-tight select-none transition-all ${
                status === 'paused' ? 'animate-pulse' : ''
              } ${isOvertime ? 'animate-pulse' : ''} ${isSprintT3 ? 'animate-sprint-digits' : ''} ${canQuickPick || canToggle ? 'cursor-pointer hover:opacity-70' : ''} ${digitBounce ? 'scale-95' : 'scale-100'}`}
              style={{
                fontWeight: 300,
                color: isOvertime ? '#ef4444' : theme.text,
                fontVariantNumeric: 'tabular-nums',
                transition: 'transform 0.15s ease-out, opacity 0.2s, text-shadow 0.5s',
                textShadow: isSprintT3 ? `0 0 20px ${theme.accent}, 0 0 40px ${theme.accent}80`
                  : isSprintT2 ? `0 0 12px ${theme.accent}aa`
                  : isSprintT1 ? `0 0 6px ${theme.accent}55`
                  : 'none',
              }}
              onClick={() => {
                if (canToggle) {
                  toggleDisplayMode();
                } else if (canQuickPick) {
                  setShowQuickPicker(!showQuickPicker);
                }
              }}
              title={canToggle ? t.toggleTimerMode : canQuickPick ? t.quickTimeHint : undefined}
            >
              {displayText}
            </span>
          );
        })()}

        {/* Health reminder toast — below time display */}

        {/* Quick duration picker */}
        {showQuickPicker && status === 'idle' && isWork && (
          <div
            className="absolute -bottom-2 translate-y-full flex flex-wrap justify-center gap-2 p-3 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)] animate-fade-up z-10"
            style={{ backgroundColor: `${theme.surface}f0`, borderColor: theme.border }}
          >
            {QUICK_DURATIONS.map((m) => (
              <button key={m}
                onClick={() => {
                  onChangeWorkMinutes(m);
                  setShowQuickPicker(false);
                  if (m > 25) setHealthToast(true);
                  else setHealthToast(false);
                }}
                className="px-3 py-1 rounded-[var(--radius-sm)] text-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 cursor-pointer ui-hover-card"
                style={{
                  backgroundColor: workMinutes === m ? `${theme.accent}30` : theme.inputBg,
                  color: workMinutes === m ? theme.accent : theme.textMuted,
                  fontWeight: workMinutes === m ? 600 : 400,
                }}>
                {m}min
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Health reminder toast — floating, does not occupy layout space */}
      {healthToast && (
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '100%', marginTop: '4px', zIndex: 20 }}>
          <Toast message={t.healthReminder} onDone={() => setHealthToast(false)} />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 sm:gap-4 h-16 mt-6">

        {/* ✗ Abandon/Skip (left) — hidden during idle and break, long-press required */}
        {status !== 'idle' && isWork && (
          <button
            onMouseDown={() => startLongPress('abandon', () => guardedAction(onAbandon))}
            onMouseUp={() => cancelLongPress(t.holdToGiveUp)}
            onMouseLeave={() => cancelLongPress()}
            onTouchStart={() => startLongPress('abandon', () => guardedAction(onAbandon))}
            onTouchEnd={() => cancelLongPress(t.holdToGiveUp)}
            onTouchCancel={() => cancelLongPress()}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all duration-200 ease-in-out hover:-translate-y-0.5 cursor-pointer relative overflow-hidden"
            style={{ backgroundColor: `${theme.textMuted}15`, color: theme.textMuted }}
            title={t.abandon}>
            {/* Long-press ring progress */}
            {longPressTarget === 'abandon' && (
              <svg className="absolute inset-0" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="20" fill="none" stroke={theme.textMuted} strokeWidth="2.5"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - longPressProgress)}
                  transform="rotate(-90 22 22)" strokeLinecap="round" opacity="0.6" />
              </svg>
            )}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="relative z-10">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {/* ▶ Start — idle only */}
        {status === 'idle' && (
          <button onClick={handleStart}
            className="w-[52px] h-[52px] min-w-[52px] min-h-[52px] rounded-full flex items-center justify-center transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 active:scale-95 cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`, boxShadow: `0 2px 12px ${colors.from}30` }}>
            <svg width="18" height="22" viewBox="0 0 20 24" fill="none" className="ml-1">
              <path d="M2 2L18 12L2 22V2Z" fill="white" />
            </svg>
          </button>
        )}

        {/* ⏸ Pause (center) */}
        {status === 'running' && (
          <button onClick={onPause}
            className="w-[52px] h-[52px] min-w-[52px] min-h-[52px] rounded-full flex items-center justify-center transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 active:scale-95 cursor-pointer border"
            style={{ backgroundColor: `${colors.from}20`, borderColor: `${colors.from}40` }}>
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <rect x="1" y="1" width="4.5" height="18" rx="1.5" fill={colors.from} fillOpacity="0.7" />
              <rect x="10.5" y="1" width="4.5" height="18" rx="1.5" fill={colors.from} fillOpacity="0.7" />
            </svg>
          </button>
        )}

        {/* ▶ Resume (center) */}
        {status === 'paused' && (
          <button onClick={handleResume}
            className="w-[52px] h-[52px] min-w-[52px] min-h-[52px] rounded-full flex items-center justify-center transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 active:scale-95 cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`, boxShadow: `0 2px 12px ${colors.from}30` }}>
            <svg width="18" height="22" viewBox="0 0 20 24" fill="none" className="ml-1">
              <path d="M2 2L18 12L2 22V2Z" fill="white" />
            </svg>
          </button>
        )}

        {/* ✓ Complete/Skip (right) — hidden during idle, long-press required */}
        {status !== 'idle' && (
          <button
            onMouseDown={() => startLongPress('skip', () => guardedAction(onSkip))}
            onMouseUp={() => cancelLongPress(t.holdToFinish)}
            onMouseLeave={() => cancelLongPress()}
            onTouchStart={() => startLongPress('skip', () => guardedAction(onSkip))}
            onTouchEnd={() => cancelLongPress(t.holdToFinish)}
            onTouchCancel={() => cancelLongPress()}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all duration-200 ease-in-out hover:-translate-y-0.5 cursor-pointer relative overflow-hidden"
            style={{ backgroundColor: `${colors.from}20`, color: colors.from }}
            title={t.projectMarkDone}>
            {/* Long-press ring progress */}
            {longPressTarget === 'skip' && (
              <svg className="absolute inset-0" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="20" fill="none" stroke={colors.from} strokeWidth="2.5"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - longPressProgress)}
                  transform="rotate(-90 22 22)" strokeLinecap="round" opacity="0.6" />
              </svg>
            )}
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" className="relative z-10">
              <path d="M1.5 6L6 10.5L14.5 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Toast for short-tap hint (long-press buttons) */}
      {toast && (
        <div
          className="absolute -bottom-2 text-xs font-medium px-3 py-1 rounded-full animate-fade-up"
          style={{ backgroundColor: `${theme.surface}ee`, color: theme.textMuted, border: `1px solid ${theme.border}` }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
