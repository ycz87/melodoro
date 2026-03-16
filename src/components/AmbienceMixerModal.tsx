/**
 * AmbienceMixerModal — 自定义背景音混音面板
 * 列出所有可用背景音，每个有开关 + 独立音量滑块
 * 支持多音效同时叠加
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import type { AmbienceMixerConfig, AmbienceSoundId } from '../audio';
import {
  ALL_AMBIENCE_SOUNDS, startAmbienceSound, stopAmbienceSound, setAmbienceSoundVolume,
  applyMixerConfig, enterPreviewMode, exitPreviewMode,
} from '../audio';

interface Props {
  config: AmbienceMixerConfig;
  onChange: (config: AmbienceMixerConfig) => void;
  onClose: () => void;
  /** If true, keep sounds playing on close (timer is running) */
  keepOnClose?: boolean;
}

export function AmbienceMixerModal({ config, onChange, onClose, keepOnClose }: Props) {
  const theme = useTheme();
  const i18n = useI18n();
  const [local, setLocal] = useState<AmbienceMixerConfig>({ ...config });
  // Track latest config via ref so cleanup can access it
  const localRef = useRef(local);
  const keepOnCloseRef = useRef(keepOnClose);

  useEffect(() => {
    localRef.current = local;
  }, [local]);

  useEffect(() => {
    keepOnCloseRef.current = keepOnClose;
  }, [keepOnClose]);

  // Enter preview mode on mount, exit on unmount
  useEffect(() => {
    enterPreviewMode();
    // Start any already-enabled sounds for preview
    for (const meta of ALL_AMBIENCE_SOUNDS) {
      const cfg = config[meta.id];
      if (cfg?.enabled) {
        startAmbienceSound(meta.id, cfg.volume);
      }
    }
    return () => {
      const keep = keepOnCloseRef.current;
      exitPreviewMode(!keep);
      // When keeping sounds (timer running), re-apply the latest config
      // so the mixer state is properly synchronized after leaving preview mode
      if (keep) {
        applyMixerConfig(localRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync changes to parent + audio engine in real-time
  const updateSound = useCallback((id: AmbienceSoundId, enabled: boolean, volume: number) => {
    setLocal((prev) => {
      const next = { ...prev, [id]: { enabled, volume } };
      onChange(next);
      // Immediately start/stop/adjust audio
      if (enabled) {
        startAmbienceSound(id, volume);
      } else {
        stopAmbienceSound(id);
      }
      return next;
    });
  }, [onChange]);

  const toggleSound = useCallback((id: AmbienceSoundId) => {
    const current = local[id];
    updateSound(id, !current.enabled, current.volume);
  }, [local, updateSound]);

  const changeVolume = useCallback((id: AmbienceSoundId, volume: number) => {
    const current = local[id];
    updateSound(id, current.enabled, volume);
    if (current.enabled) {
      setAmbienceSoundVolume(id, volume);
    }
  }, [local, updateSound]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const categoryLabels: Record<string, string> = {
    nature: i18n.ambienceCategoryNature,
    environment: i18n.ambienceCategoryEnvironment,
    noise: i18n.ambienceCategoryNoise,
    clock: i18n.ambienceCategoryClock,
  };

  // Group sounds by category
  const categories = ['nature', 'environment', 'noise', 'clock'] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      data-modal-overlay
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[80vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-fade-up"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: theme.border }}>
          <h2 className="text-base font-medium" style={{ color: theme.text }}>
            🎧 {i18n.focusAmbience}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
            style={{ color: theme.textMuted, backgroundColor: theme.inputBg }}>
            ✕
          </button>
        </div>

        {/* Sound list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 settings-scrollbar">
          {categories.map((cat) => {
            const sounds = ALL_AMBIENCE_SOUNDS.filter((s) => s.category === cat);
            return (
              <div key={cat} className="mb-4">
                <div className="text-xs font-medium mb-2 uppercase tracking-wider"
                  style={{ color: theme.textMuted }}>
                  {categoryLabels[cat]}
                </div>
                <div className="flex flex-col gap-2">
                  {sounds.map((meta) => {
                    const cfg = local[meta.id];
                    return (
                      <div key={meta.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                        style={{
                          backgroundColor: cfg.enabled ? `${theme.accent}12` : 'transparent',
                        }}>
                        {/* Toggle button */}
                        <button
                          onClick={() => toggleSound(meta.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 transition-all cursor-pointer"
                          style={{
                            backgroundColor: cfg.enabled ? `${theme.accent}25` : theme.inputBg,
                          }}>
                          {meta.emoji}
                        </button>

                        {/* Name + volume */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate"
                            style={{ color: cfg.enabled ? theme.text : theme.textMuted }}>
                            {i18n.ambienceNames[meta.id]}
                          </div>
                          {cfg.enabled && (
                            <input
                              type="range" min={0} max={1} step={0.01}
                              value={cfg.volume}
                              onChange={(e) => changeVolume(meta.id, parseFloat(e.target.value))}
                              className="w-full range-slider mt-1.5"
                              style={{ '--range-accent': theme.accent, '--range-bg': 'rgba(255,255,255,0.12)', '--range-pct': `${Math.round(cfg.volume * 100)}%` } as React.CSSProperties}
                            />
                          )}
                        </div>

                        {/* On/Off indicator */}
                        <div className="w-10 text-right text-xs shrink-0"
                          style={{ color: cfg.enabled ? theme.accent : theme.textFaint }}>
                          {cfg.enabled ? `${Math.round(cfg.volume * 100)}%` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
