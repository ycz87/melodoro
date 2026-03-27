/**
 * ProjectExitModal — 项目模式两步退出弹窗
 * Step 1: 确认退出当前任务 + 退出整个项目选项
 * Step 2: 选择下一步（重新开始/下一个/返回上一个）
 *
 * v0.4.6 fixes:
 * - Reset step to 'confirm' on mount (useEffect) so re-opening always starts fresh
 * - Disable all buttons for 300ms after step transition to prevent race conditions
 * - Buttons use min-h-[44px] for stable mobile touch targets
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';

interface Props {
  taskName: string;
  isFirstTask: boolean;
  isLastTask: boolean;
  isBreak: boolean;             // Whether currently in break phase
  onCancel: () => void;
  onExitTask: () => void;       // Confirm exit current task
  onAbandonProject: () => void; // Exit entire project
  onRestart: () => void;        // Restart same task
  onNext: () => void;           // Go to next task (or finish project)
  onPrevious: () => void;       // Go back to previous task
}

type Step = 'confirm' | 'choose';

const DEBOUNCE_MS = 300;

export function ProjectExitModal({
  taskName, isFirstTask, isLastTask, isBreak,
  onCancel, onExitTask, onAbandonProject,
  onRestart, onNext, onPrevious,
}: Props) {
  const [step, setStep] = useState<Step>('confirm');
  const [locked, setLocked] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const theme = useTheme();
  const t = useI18n();

  // Use breakAccent during break phase for visual consistency
  const phaseAccent = isBreak ? theme.breakAccent : theme.accent;

  useEffect(() => {
    return () => { if (lockTimer.current) clearTimeout(lockTimer.current); };
  }, []);

  // Lock buttons briefly after any action to prevent double-tap / race
  const withLock = useCallback((fn: () => void) => {
    if (locked) return;
    setLocked(true);
    fn();
    lockTimer.current = setTimeout(() => setLocked(false), DEBOUNCE_MS);
  }, [locked]);

  // Step 1 title adapts to break vs work phase
  const step1Title = isBreak ? t.projectExitChooseTitle : t.projectExitConfirmTitle;
  const step1Desc = isBreak ? null : taskName;

  if (step === 'confirm' && !isBreak) {
    // Normal (non-break) step 1: confirm exit current task
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" data-modal-overlay>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onCancel} />
        <div className="relative w-full max-w-xs rounded-2xl p-5 animate-fade-up"
          style={{ backgroundColor: theme.surface }}>
          <h3 className="text-base font-semibold mb-1" style={{ color: theme.text }}>
            {step1Title}
          </h3>
          {step1Desc && (
            <p className="text-sm mb-4 truncate" style={{ color: theme.textMuted }}>
              {step1Desc}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <button
              disabled={locked}
              onClick={() => withLock(() => { onExitTask(); setStep('choose'); })}
              className="w-full min-h-[44px] py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: `${phaseAccent}20`, color: phaseAccent }}>
              {t.projectExitConfirm}
            </button>
            <button
              disabled={locked}
              onClick={() => withLock(onCancel)}
              className="w-full min-h-[44px] py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: theme.inputBg, color: theme.textMuted }}>
              {t.cancel}
            </button>
            <div className="border-t my-1" style={{ borderColor: theme.border }} />
            <button
              disabled={locked}
              onClick={() => withLock(onAbandonProject)}
              className="w-full min-h-[44px] py-2 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
              style={{ color: '#ef4444' }}>
              {t.projectExitAll}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If in break phase, skip step 1 (no task to abandon) and go straight to choose.
  // Also shown after step 1 confirm for non-break.
  // Step 2: Choose next action
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" data-modal-overlay>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={isBreak ? onCancel : undefined} />
      <div className="relative w-full max-w-xs rounded-2xl p-5 animate-fade-up"
        style={{ backgroundColor: theme.surface }}>
        <h3 className="text-base font-semibold mb-4" style={{ color: theme.text }}>
          {t.projectExitChooseTitle}
        </h3>
        <div className="flex flex-col gap-2">
          {/* Only show restart if we came from a non-break exit (task was abandoned) */}
          {!isBreak && (
            <button
              disabled={locked}
              onClick={() => withLock(onRestart)}
              className="w-full min-h-[44px] py-3 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: `${phaseAccent}15`, color: phaseAccent }}>
              🔄 {t.projectExitRestart}
            </button>
          )}
          <button
            disabled={locked}
            onClick={() => withLock(onNext)}
            className="w-full min-h-[44px] py-3 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: isBreak ? `${phaseAccent}15` : theme.inputBg, color: isBreak ? phaseAccent : theme.text }}>
            ⏭️ {isLastTask ? t.projectExitFinish : t.projectExitNext}
          </button>
          {!isFirstTask && (
            <button
              disabled={locked}
              onClick={() => withLock(onPrevious)}
              className="w-full min-h-[44px] py-3 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: theme.inputBg, color: theme.textMuted }}>
              ⏮️ {t.projectExitPrevious}
            </button>
          )}
          {isBreak && (
            <>
              <div className="border-t my-1" style={{ borderColor: theme.border }} />
              <button
                disabled={locked}
                onClick={() => withLock(onCancel)}
                className="w-full min-h-[44px] py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: theme.inputBg, color: theme.textMuted }}>
                {t.cancel}
              </button>
              <button
                disabled={locked}
                onClick={() => withLock(onAbandonProject)}
                className="w-full min-h-[44px] py-2 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
                style={{ color: '#ef4444' }}>
                {t.projectExitAll}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
