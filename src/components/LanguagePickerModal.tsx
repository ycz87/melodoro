/**
 * LanguagePickerModal — 语言选择弹窗
 * 列出所有支持的语言，点击选择
 */
import { useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import type { Locale } from '../i18n';

interface Props {
  selected: Locale;
  onSelect: (locale: Locale) => void;
  onClose: () => void;
}

const LANGUAGES: { locale: Locale; flag: string; name: string }[] = [
  { locale: 'zh', flag: '🇨🇳', name: '中文' },
  { locale: 'zh-TW', flag: '🇹🇼', name: '繁體中文' },
  { locale: 'en', flag: '🇺🇸', name: 'English' },
  { locale: 'ja', flag: '🇯🇵', name: '日本語' },
  { locale: 'ko', flag: '🇰🇷', name: '한국어' },
  { locale: 'es', flag: '🇪🇸', name: 'Español' },
  { locale: 'fr', flag: '🇫🇷', name: 'Français' },
  { locale: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { locale: 'ru', flag: '🇷🇺', name: 'Русский' },
];

export function LanguagePickerModal({ selected, onSelect, onClose }: Props) {
  const theme = useTheme();
  const i18n = useI18n();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      data-modal-overlay
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div className="relative w-full max-w-sm max-h-[70vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-fade-up"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: theme.border }}>
          <h2 className="text-base font-medium" style={{ color: theme.text }}>
            🌐 {i18n.language}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
            style={{ color: theme.textMuted, backgroundColor: theme.inputBg }}>
            ✕
          </button>
        </div>

        {/* Language grid */}
        <div className="flex-1 overflow-y-auto px-5 py-3 settings-scrollbar">
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map(({ locale, flag, name }) => {
              const isActive = selected === locale;
              return (
                <button
                  key={locale}
                  onClick={() => {
                    onSelect(locale);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm transition-all cursor-pointer text-left"
                  style={{
                    backgroundColor: isActive ? `${theme.accent}20` : theme.inputBg,
                    color: isActive ? theme.accent : theme.textMuted,
                    borderWidth: '1.5px',
                    borderStyle: 'solid',
                    borderColor: isActive ? `${theme.accent}40` : 'transparent',
                  }}>
                  <span className="text-base">{flag}</span>
                  <span className="truncate">{name}</span>
                  {isActive && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t shrink-0" style={{ borderColor: theme.border }}>
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
            style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>
            {i18n.modalDone}
          </button>
        </div>
      </div>
    </div>
  );
}
