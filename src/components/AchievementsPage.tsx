/**
 * AchievementsPage — full-screen achievement gallery
 * Shows all 44 achievements grouped by series with progress bars.
 */
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import type { AchievementData, AchievementSeries } from '../achievements/types';
import { SERIES_CONFIG } from '../achievements/types';
import { ACHIEVEMENTS_BY_SERIES, ALL_ACHIEVEMENTS } from '../achievements/definitions';
import { getBadgeUrl } from '../achievements/badges';
import type { AchievementDef } from '../achievements/types';

interface AchievementsPageProps {
  data: AchievementData;
  onClose: () => void;
  onMarkSeen: (ids: string[]) => void;
  language: 'zh' | 'en' | string;
}

const SERIES_ORDER: AchievementSeries[] = ['streak', 'focus', 'house', 'farm', 'hidden'];

function BadgeIcon({ def, unlocked, series, size = 64 }: {
  def: AchievementDef; unlocked: boolean; series: AchievementSeries; size?: number;
}) {
  const config = SERIES_CONFIG[series];
  const isHidden = series === 'hidden';
  const [imageError, setImageError] = useState(false);
  const badgeUrl = getBadgeUrl(def.id);
  const canShowImage = !imageError && badgeUrl.length > 0;

  if (!unlocked) {
    if (isHidden) {
      return (
        <div
          className="rounded-full flex items-center justify-center shrink-0"
          style={{
            width: size, height: size,
            backgroundColor: 'rgba(128,128,128,0.2)',
            border: '2px solid rgba(128,128,128,0.3)',
          }}
        >
          <span style={{ fontSize: size * 0.35 }}>❓</span>
        </div>
      );
    }

    return (
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: size, height: size,
        }}
      >
        {canShowImage ? (
          <img
            src={badgeUrl}
            alt={`${def.id} badge`}
            className="w-full h-full object-contain"
            style={{ filter: 'grayscale(1) opacity(0.4)' }}
            onError={() => setImageError(true)}
          />
        ) : (
          <span
            className="rounded-full flex items-center justify-center w-full h-full"
            style={{
              backgroundColor: 'rgba(128,128,128,0.2)',
              border: '2px solid rgba(128,128,128,0.3)',
            }}
          >
            <span style={{ fontSize: size * 0.35 }}>🔒</span>
          </span>
        )}
      </div>
    );
  }

  if (canShowImage) {
    return (
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: size, height: size,
        }}
      >
        <img
          src={badgeUrl}
          alt={`${def.id} badge`}
          className="w-full h-full object-contain"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  const bg = config.colorEnd
    ? `linear-gradient(135deg, ${config.color}, ${config.colorEnd})`
    : config.color;

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 relative"
      style={{
        width: size, height: size,
        background: bg,
        boxShadow: `0 0 ${size * 0.3}px ${config.color}40`,
      }}
    >
      <span style={{ fontSize: size * 0.4 }}>{def.emoji}</span>
      {/* Subtle glow */}
      <div className="absolute inset-0 rounded-full" style={{
        background: `radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)`,
      }} />
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(128,128,128,0.2)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function BadgeDetailModal({ def, data, series, language, onClose }: {
  def: AchievementDef;
  data: AchievementData;
  series: AchievementSeries;
  language: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const i18n = useI18n();
  const unlocked = def.id in data.unlocked;
  const isHidden = series === 'hidden';
  const config = SERIES_CONFIG[series];
  const isZh = language.startsWith('zh');

  const name = isHidden && !unlocked ? i18n.achievementsHiddenLocked : (isZh ? def.nameZh : def.nameEn);
  const desc = isHidden && !unlocked
    ? i18n.achievementsHiddenHint
    : (isZh ? def.descZh : def.descEn);

  // Progress for locked achievements
  let progressValue = 0;
  let progressMax = 0;
  if (!unlocked && def.target && def.progressKey) {
    progressMax = def.target;
    const key = def.progressKey as keyof typeof data.progress;
    progressValue = Math.min(Number(data.progress[key]) || 0, progressMax);
  }

  const unlockedDate = unlocked
    ? new Date(data.unlocked[def.id]).toLocaleDateString(isZh ? 'zh-CN' : 'en-US')
    : '';

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
      data-modal-overlay
    >
      <div className="absolute inset-0 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} />
      <div
        className="relative w-full max-w-xs rounded-[var(--radius-panel)] p-6 border animate-fade-up"
        style={{ backgroundColor: theme.surface, borderColor: theme.border, boxShadow: 'var(--shadow-elevated)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-4">
          <BadgeIcon def={def} unlocked={unlocked} series={series} size={96} />
          <div className="text-center">
            <div className="text-base font-semibold" style={{ color: theme.text }}>{name}</div>
            {desc && (
              <div className="text-sm mt-1" style={{ color: theme.textMuted }}>{desc}</div>
            )}
          </div>

          {unlocked ? (
            <div className="text-xs" style={{ color: theme.textFaint }}>
              {i18n.achievementsUnlockedAt(unlockedDate)}
            </div>
          ) : (
            <div className="w-full flex flex-col gap-2">
              {!isHidden && (isZh ? def.conditionZh : def.conditionEn) && (
                <div className="text-xs text-center" style={{ color: theme.textMuted }}>
                  {i18n.achievementsCondition}: {isZh ? def.conditionZh : def.conditionEn}
                </div>
              )}
              {progressMax > 0 && !isHidden && (
                <div className="flex flex-col gap-1">
                  <ProgressBar value={progressValue} max={progressMax} color={config.color} />
                  <div className="text-xs text-center" style={{ color: theme.textFaint }}>
                    {progressValue} / {progressMax}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function AchievementsPage({ data, onClose, onMarkSeen, language }: AchievementsPageProps) {
  const theme = useTheme();
  const i18n = useI18n();
  const [selectedBadge, setSelectedBadge] = useState<AchievementDef | null>(null);
  const isZh = language.startsWith('zh');

  const totalUnlocked = Object.keys(data.unlocked).length;
  const totalAchievements = ALL_ACHIEVEMENTS.length;

  // Mark all unseen as seen when page opens
  const unseenIds = useMemo(() => {
    return Object.keys(data.unlocked).filter(id => !data.seen.includes(id));
  }, [data.unlocked, data.seen]);

  // Mark seen on mount
  useMemo(() => {
    if (unseenIds.length > 0) onMarkSeen(unseenIds);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const seriesNames: Record<AchievementSeries, string> = {
    streak: i18n.achievementsSeriesStreak,
    focus: i18n.achievementsSeriesFocus,
    house: i18n.achievementsSeriesHouse,
    farm: i18n.achievementsSeriesFarm,
    hidden: i18n.achievementsSeriesHidden,
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <header
        className="w-full h-12 flex items-center px-4 shrink-0 border-b"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out hover:-translate-y-0.5 cursor-pointer"
          style={{ color: theme.textMuted }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 text-center text-sm font-semibold" style={{ color: theme.text }}>
          {i18n.achievementsTitle}
        </div>
        <div className="w-8" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 settings-scrollbar">
        <div className="flex flex-col gap-4">
          {/* Total progress */}
          <div
            className="p-4 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]"
            style={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
          >
            <div className="text-xs mb-2 text-center" style={{ color: theme.textMuted }}>
              {i18n.achievementsProgress(totalUnlocked, totalAchievements)}
            </div>
            <ProgressBar
              value={totalUnlocked}
              max={totalAchievements}
              color={theme.accent}
            />
          </div>

          {/* Series sections */}
          {SERIES_ORDER.map(seriesKey => {
            const config = SERIES_CONFIG[seriesKey];
            const achievements = ACHIEVEMENTS_BY_SERIES[seriesKey] || [];
            const seriesUnlocked = achievements.filter(a => a.id in data.unlocked).length;

            return (
              <div
                key={seriesKey}
                className="p-4 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]"
                style={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
              >
                {/* Series header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: config.color }}>
                      {seriesNames[seriesKey]}
                    </span>
                    {config.comingSoon && (
                      <span
                        className="text-[10px] px-2 py-1 rounded-full"
                        style={{ backgroundColor: 'rgba(128,128,128,0.2)', color: theme.textFaint }}
                      >
                        {i18n.achievementsComingSoon}
                      </span>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: theme.textFaint }}>
                    {i18n.achievementsSeriesProgress(seriesUnlocked, config.count)}
                  </span>
                </div>

                {/* Series progress bar */}
                <div className="mb-3">
                  <ProgressBar value={seriesUnlocked} max={config.count} color={config.color} />
                </div>

                {/* Badge grid */}
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {achievements.map(def => {
                    const unlocked = def.id in data.unlocked;
                    const isHidden = seriesKey === 'hidden';
                    const name = isHidden && !unlocked
                      ? '???'
                      : (isZh ? def.nameZh : def.nameEn);

                    return (
                      <button
                        key={def.id}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)] transition-all duration-200 ease-in-out ${
                          config.comingSoon ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95 ui-hover-card'
                        }`}
                        onClick={() => !config.comingSoon && setSelectedBadge(def)}
                        disabled={config.comingSoon}
                        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                      >
                        <BadgeIcon def={def} unlocked={unlocked} series={seriesKey} size={48} />
                        <span
                          className="text-[10px] leading-tight text-center line-clamp-2"
                          style={{ color: unlocked ? theme.text : theme.textFaint }}
                        >
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badge detail modal */}
      {selectedBadge && (
        <BadgeDetailModal
          def={selectedBadge}
          data={data}
          series={selectedBadge.series}
          language={language}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </div>,
    document.body,
  );
}
