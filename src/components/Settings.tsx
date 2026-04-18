/**
 * 设置面板 — 齿轮图标展开，包含所有用户可配置项
 * v3: 分组标题 + iOS toggle 色 + 主题网格 + 帮助入口
 */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PomodoroSettings, ThemeId } from '../types';
import { THEMES } from '../types';
import { setMasterAlertVolume, setMasterAmbienceVolume, getActiveSoundsSummary } from '../audio';
import type { AmbienceMixerConfig } from '../audio';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import type { Locale } from '../i18n';
import { withOpacity } from '../utils/color';
import { AmbienceMixerModal } from './AmbienceMixerModal';
import { AlertPickerModal } from './AlertPickerModal';
import { LanguagePickerModal } from './LanguagePickerModal';
import { UserProfile } from './UserProfile';
import { LoginPanel } from './LoginPanel';
import type { User } from '../hooks/useAuth';

interface SettingsProps {
  settings: PomodoroSettings;
  onChange: (settings: PomodoroSettings) => void;
  disabled: boolean;
  isWorkRunning: boolean;
  onExport: () => void;
  onActivateDebug: () => void;
  onShowGuide?: () => void;
  auth?: {
    user: User | null;
    isLoading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (data: { displayName?: string; avatarUrl?: string }) => void;
  };
}

const TOGGLE_GREEN = '#34C759';

/** Section header */
function SectionHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <div
      className="text-xs font-semibold tracking-wider uppercase"
      style={{ color: theme.accent }}
    >
      {title}
    </div>
  );
}

/** 开关组件 — iOS green when active */
function Toggle({ label, checked, onChange, disabled }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <div className={`flex items-center justify-between gap-3 ${disabled ? 'opacity-40' : ''}`}>
      <div className="text-sm" style={{ color: t.textMuted }}>{label}</div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ease-in-out ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ backgroundColor: checked ? TOGGLE_GREEN : t.inputBg }}
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}

/** 数字步进器 */
function NumberStepper({ label, value, onChange, min, max, step = 1, unit, disabled }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; unit: string; disabled: boolean;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTheme();

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm" style={{ color: t.textMuted }}>{label}</div>
      <div className={`flex items-center gap-1 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
        <button onClick={() => onChange(clamp(value - step))}
          className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button cursor-pointer text-sm"
          style={{ backgroundColor: t.inputBg, color: t.textMuted }}>−</button>
        <input ref={inputRef} type="number" value={value}
          onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) onChange(clamp(v)); }}
          onBlur={() => { if (inputRef.current) { const v = parseInt(inputRef.current.value, 10); if (isNaN(v) || v < min) onChange(min); else if (v > max) onChange(max); } }}
          min={min} max={max}
          className="w-12 h-8 rounded-[var(--radius-sm)] text-center text-sm outline-none transition-all duration-200 ease-in-out focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:ring-opacity-50 focus:shadow-[0_0_0_3px_var(--focus-ring-glow)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{
            backgroundColor: t.inputBg,
            color: t.text,
            '--focus-ring-color': withOpacity(t.accent, 0.5),
            '--focus-ring-glow': withOpacity(t.accent, 0.1),
          } as React.CSSProperties}
        />
        <button onClick={() => onChange(clamp(value + step))}
          className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button cursor-pointer text-sm"
          style={{ backgroundColor: t.inputBg, color: t.textMuted }}>+</button>
        <span className="text-xs ml-1 w-8" style={{ color: t.textMuted }}>{unit}</span>
      </div>
    </div>
  );
}

/** 音量滑块 */
function VolumeSlider({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  const t = useTheme();
  const pct = value; // 0-100
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm shrink-0" style={{ color: t.textMuted }}>{label}</div>
      <div className="flex items-center gap-2 flex-1 max-w-[160px]">
        <input type="range" min={0} max={100} value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="range-slider flex-1"
          style={{
            '--range-accent': t.accent,
            '--range-bg': 'rgba(255,255,255,0.12)',
            '--range-pct': `${pct}%`,
          } as React.CSSProperties} />
        <span className="text-xs w-8 text-right tabular-nums" style={{ color: t.textMuted }}>{value}%</span>
      </div>
    </div>
  );
}

const REPEAT_OPTIONS = [1, 3, 5, 0];
const LANGUAGE_DISPLAY: Record<Locale, { flag: string; name: string }> = {
  zh: { flag: '🇨🇳', name: '中文' },
  'zh-TW': { flag: '🇹🇼', name: '繁體中文' },
  en: { flag: '🇺🇸', name: 'English' },
  ja: { flag: '🇯🇵', name: '日本語' },
  ko: { flag: '🇰🇷', name: '한국어' },
  es: { flag: '🇪🇸', name: 'Español' },
  fr: { flag: '🇫🇷', name: 'Français' },
  de: { flag: '🇩🇪', name: 'Deutsch' },
  ru: { flag: '🇷🇺', name: 'Русский' },
};
// Divider color is now theme-aware via theme.border

export function Settings({ settings, onChange, disabled, isWorkRunning, onExport, onActivateDebug, onShowGuide, auth }: SettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAmbienceModal, setShowAmbienceModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showLoginPanel, setShowLoginPanel] = useState(false);
  const versionClickTimestampsRef = useRef<number[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const i18n = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.('[data-modal-overlay]')) return;
      if (panelRef.current && !panelRef.current.contains(target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const update = (patch: Partial<PomodoroSettings>) => {
    const next = { ...settings, ...patch };
    // >25min 时自动关闭 autoStartBreak
    if ('workMinutes' in patch && (patch.workMinutes ?? 0) > 25) {
      next.autoStartBreak = false;
    }
    onChange(next);
    if ('alertVolume' in patch) setMasterAlertVolume(next.alertVolume);
    if ('ambienceVolume' in patch) setMasterAmbienceVolume(next.ambienceVolume);
  };

  const optBtn = (active: boolean) =>
    `px-3 py-1 rounded-[var(--radius-sm)] text-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button cursor-pointer ${active ? 'font-medium' : ''}`;
  const optStyle = (active: boolean) => ({
    backgroundColor: active ? `${theme.accent}30` : theme.surface,
    color: active ? theme.accent : theme.textMuted,
  });

  const themeLabels: Record<ThemeId, string> = {
    dark: i18n.themeDark,
    light: i18n.themeLight,
    forest: i18n.themeForest,
    ocean: i18n.themeOcean,
    warm: i18n.themeWarm,
  };

  const ambienceSummary = getActiveSoundsSummary(settings.ambienceMixer, i18n.ambienceNames);
  const autoStartWorkDisabled = disabled;
  const autoStartBreakDisabled = disabled || settings.workMinutes > 25;

  const handleVersionClick = () => {
    const now = Date.now();
    versionClickTimestampsRef.current = [
      ...versionClickTimestampsRef.current.filter((ts) => now - ts <= 2000),
      now,
    ];
    if (versionClickTimestampsRef.current.length >= 7) {
      versionClickTimestampsRef.current = [];
      onActivateDebug();
    }
  };

  return (
    <>
      <div className="relative" ref={panelRef}>
        <button onClick={() => setIsOpen(!isOpen)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button cursor-pointer"
          style={{ color: isOpen ? theme.textMuted : theme.textFaint }}
          aria-label={i18n.settings}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-12 w-[calc(100vw-1.5rem)] sm:w-80 p-4 rounded-[var(--radius-panel)] border shadow-[var(--shadow-elevated)] z-50 animate-fade-up max-h-[75vh] overflow-y-auto settings-scrollbar"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <div className="flex flex-col gap-4">
              {/* ── 👤 Account ── */}
              {auth && (
                <>
                  <UserProfile
                    user={auth.user}
                    isLoading={auth.isLoading}
                    onLoginClick={() => { setShowLoginPanel(true); setIsOpen(false); }}
                    onLogout={auth.logout}
                    onUpdateProfile={auth.updateProfile}
                  />
                </>
              )}

              {disabled && (
                <div
                  className="text-xs p-3 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]"
                  style={{ color: '#fbbf24', backgroundColor: `${theme.accent}14`, borderColor: `${theme.accent}30` }}
                >
                  {i18n.timerRunningHint}
                </div>
              )}

              {/* ── ⏱ 计时 ── */}
              <div
                className="rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-card)]"
                style={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
              >
                <SectionHeader title={i18n.sectionTimer} />
                <div className="flex flex-col gap-4 mt-3">
                  <NumberStepper label={i18n.workDuration} value={settings.workMinutes}
                    onChange={(v) => update({ workMinutes: v })} min={1} max={120} disabled={disabled} unit={i18n.minutes} />
                  {settings.workMinutes > 25 && (
                    <div
                      className="rounded-[var(--radius-card)] border px-3 py-2 text-[11px] leading-relaxed"
                      style={{
                        color: theme.textMuted,
                        borderColor: `${theme.accent}40`,
                        backgroundColor: `${theme.accent}14`,
                      }}
                      role="note"
                      aria-live="polite"
                    >
                      {i18n.healthReminder}
                    </div>
                  )}
                  <NumberStepper label={i18n.shortBreak} value={settings.shortBreakMinutes}
                    onChange={(v) => update({ shortBreakMinutes: v })} min={1} max={30} disabled={disabled} unit={i18n.minutes} />
                  <Toggle label={i18n.autoStartBreak} checked={settings.autoStartBreak}
                    onChange={(v) => update({ autoStartBreak: v })} disabled={autoStartBreakDisabled} />
                  <Toggle label={i18n.autoStartWork} checked={settings.autoStartWork}
                    onChange={(v) => update({ autoStartWork: v })} disabled={autoStartWorkDisabled} />
                </div>
              </div>

              {/* ── 🔔 提醒 ── */}
              <div
                className="rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-card)]"
                style={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
              >
                <SectionHeader title={i18n.sectionAlerts} />
                <div className="flex flex-col gap-4 mt-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm" style={{ color: theme.textMuted }}>{i18n.alertSound}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs truncate max-w-[100px]" style={{ color: theme.text }}>
                        {i18n.alertNames[settings.alertSound]}
                      </span>
                      <button
                        onClick={() => setShowAlertModal(true)}
                        className="px-3 py-1 rounded-[var(--radius-sm)] text-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button cursor-pointer"
                        style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>
                        {i18n.alertCustomize}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm" style={{ color: theme.textMuted }}>{i18n.alertRepeatCount}</div>
                    <div className="flex gap-1">
                      {REPEAT_OPTIONS.map((n) => (
                        <button key={n} onClick={() => update({ alertRepeatCount: n })}
                          className={optBtn(settings.alertRepeatCount === n)}
                          style={optStyle(settings.alertRepeatCount === n)}>
                          {i18n.repeatTimes(n)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <VolumeSlider label={i18n.alertVolume} value={settings.alertVolume}
                    onChange={(v) => update({ alertVolume: v })} />

                  {/* 专注背景音 */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm" style={{ color: theme.textMuted }}>{i18n.focusAmbience}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs truncate max-w-[120px]" style={{ color: ambienceSummary ? theme.text : theme.textFaint }}>
                        {ambienceSummary || i18n.ambienceOff}
                      </span>
                      <button
                        onClick={() => setShowAmbienceModal(true)}
                        className="px-3 py-1 rounded-[var(--radius-sm)] text-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button cursor-pointer"
                        style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>
                        {i18n.ambienceCustomize}
                      </button>
                    </div>
                  </div>

                  {ambienceSummary && (
                    <VolumeSlider label={i18n.ambienceVolume} value={settings.ambienceVolume}
                      onChange={(v) => update({ ambienceVolume: v })} />
                  )}
                </div>
              </div>

              {/* ── 🎨 外观 ── */}
              <div
                className="rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-card)]"
                style={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
              >
                <SectionHeader title={i18n.sectionAppearance} />
                <div className="flex flex-col gap-4 mt-3">
                  {/* 主题选择 — 3 列网格 */}
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                      <button key={id} onClick={() => update({ theme: id })}
                        className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button cursor-pointer"
                        style={{
                          backgroundColor: settings.theme === id ? `${THEMES[id].colors.accent}30` : theme.surface,
                          color: settings.theme === id ? THEMES[id].colors.accent : theme.textMuted,
                        }}>
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: THEMES[id].colors.accent }} />
                        {themeLabels[id]}
                      </button>
                    ))}
                  </div>

                  {/* 语言切换 */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm" style={{ color: theme.textMuted }}>{i18n.language}</div>
                    <button
                      onClick={() => setShowLanguageModal(true)}
                      className="flex items-center gap-2 px-3 py-1 rounded-[var(--radius-sm)] text-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button cursor-pointer"
                      style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>
                      <span>{LANGUAGE_DISPLAY[settings.language]?.flag}</span>
                      <span>{LANGUAGE_DISPLAY[settings.language]?.name}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── ⚙ 通用 ── */}
              <div
                className="rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-card)]"
                style={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
              >
                <SectionHeader title={i18n.sectionGeneral} />
                <div className="flex flex-col gap-3 mt-3">
                  <button
                    onClick={onExport}
                    className="w-full py-2 rounded-[var(--radius-sm)] text-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button cursor-pointer"
                    style={{ backgroundColor: theme.surface, color: theme.textMuted }}
                  >
                    {i18n.exportData}
                  </button>

                  {onShowGuide && (
                    <button
                      onClick={() => { onShowGuide(); setIsOpen(false); }}
                      className="w-full py-2 rounded-[var(--radius-sm)] text-xs transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button cursor-pointer"
                      style={{ backgroundColor: theme.surface, color: theme.textMuted }}
                    >
                      {i18n.settingsGuide}
                    </button>
                  )}
                </div>
              </div>

              {/* 版本号 */}
              <div className="text-center pt-4 pb-1">
                <span
                  className="text-[11px] cursor-pointer select-none"
                  style={{ color: theme.textFaint }}
                  onClick={handleVersionClick}
                >
                  v{__APP_VERSION__}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals — portaled to document.body to escape header's backdrop-filter containing block */}
      {showAmbienceModal && createPortal(
        <AmbienceMixerModal
          config={settings.ambienceMixer}
          onChange={(mixer: AmbienceMixerConfig) => update({ ambienceMixer: mixer })}
          onClose={() => setShowAmbienceModal(false)}
          keepOnClose={isWorkRunning}
        />,
        document.body,
      )}
      {showAlertModal && createPortal(
        <AlertPickerModal
          selected={settings.alertSound}
          onSelect={(id) => update({ alertSound: id })}
          onClose={() => setShowAlertModal(false)}
        />,
        document.body,
      )}
      {showLanguageModal && createPortal(
        <LanguagePickerModal
          selected={settings.language}
          onSelect={(locale) => update({ language: locale })}
          onClose={() => setShowLanguageModal(false)}
        />,
        document.body,
      )}
      {auth && (
        <LoginPanel
          open={showLoginPanel}
          onClose={() => setShowLoginPanel(false)}
          onLogin={auth.login}
        />
      )}
    </>
  );
}
