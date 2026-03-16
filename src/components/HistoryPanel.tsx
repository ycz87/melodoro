/**
 * HistoryPanel — 历史记录 + 统计图表 + 连续打卡
 * 全屏面板，从底部滑入
 */
import { useState, useMemo } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import { MiniCalendar } from './MiniCalendar';
import { BarChart } from './BarChart';
import { WeekTrendChart } from './WeekTrendChart';
import { GrowthIcon } from './GrowthIcon';
import { formatDateKey, getRecentDays, getDayMinutes, getStreak, getSummary } from '../utils/stats';
import type { PomodoroRecord } from '../types';
import type { ProjectRecord } from '../types/project';
import { getGrowthStage } from '../types';

interface HistoryPanelProps {
  records: PomodoroRecord[];
  projectRecords?: ProjectRecord[];
  onClose: () => void;
}

type Tab = 'history' | 'stats';

function getPreviousDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return formatDateKey(date);
}

export function HistoryPanel({ records, projectRecords = [], onClose }: HistoryPanelProps) {
  const theme = useTheme();
  const t = useI18n();
  const today = formatDateKey(new Date());
  const [tab, setTab] = useState<Tab>('history');
  const [selectedDate, setSelectedDate] = useState(today);
  const [chartRange, setChartRange] = useState<7 | 30>(7);

  // All dates that have records
  const recordDates = useMemo(() => new Set(records.map((r) => r.date)), [records]);

  // Records for selected date
  const selectedRecords = useMemo(
    () => records.filter((r) => r.date === selectedDate).sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    ),
    [records, selectedDate]
  );

  // Chart data
  const chartData = useMemo(() => {
    const days = getRecentDays(chartRange);
    return days.map((d) => ({ date: d, minutes: getDayMinutes(records, d) }));
  }, [records, chartRange]);

  // Streak
  const streak = useMemo(() => getStreak(records), [records]);

  // Summary
  const summary = useMemo(() => getSummary(records), [records]);

  // Format selected date for display
  const selectedDateLabel = useMemo(() => {
    if (selectedDate === today) return t.today;
    if (selectedDate === getPreviousDateKey(today)) return t.yesterday;
    const [, m, d] = selectedDate.split('-');
    return t.dateFormat(parseInt(m), parseInt(d));
  }, [selectedDate, today, t]);

  const selectedDayMinutes = selectedRecords.reduce((s, r) => s + (r.durationMinutes || 25), 0);

  // Chart range labels
  const chartRangeLabels: Record<7 | 30, string> = {
    7: t.thisWeek,
    30: t.thisMonth,
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative w-full max-w-lg max-h-[85vh] rounded-t-3xl overflow-y-auto animate-slide-up"
        style={{ backgroundColor: theme.surface, color: theme.text }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="sticky top-0 z-10 pt-3 pb-2 flex justify-center" style={{ backgroundColor: theme.surface }}>
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: theme.textFaint }} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 mb-4">
          {(['history', 'stats'] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
              style={{
                backgroundColor: tab === tabKey ? `${theme.accent}20` : 'transparent',
                color: tab === tabKey ? theme.accent : theme.textMuted,
              }}
            >
              {tabKey === 'history' ? t.historyTab : t.statsTab}
            </button>
          ))}
        </div>

        <div className="px-4 pt-4 pb-6">
          {tab === 'history' ? (
            <div className="space-y-4">
              {/* Week trend chart */}
              <WeekTrendChart records={records} />

              {/* Streak banner */}
              {streak.current > 0 && (
                <div
                  className="flex items-center justify-center gap-2 p-3 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)] text-sm"
                  style={{ backgroundColor: `${theme.accent}10`, color: theme.accent, borderColor: `${theme.accent}35` }}
                >
                  {t.streakBanner(streak.current)}
                </div>
              )}

              {/* Calendar */}
              <MiniCalendar
                recordDates={recordDates}
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
              />

              {/* Selected day records */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: theme.text }}>
                    {selectedDateLabel}
                  </span>
                  {selectedRecords.length > 0 && (
                    <span className="text-xs" style={{ color: theme.textMuted }}>
                      {t.countUnit(selectedRecords.length)} · {t.formatMinutes(selectedDayMinutes)}
                    </span>
                  )}
                </div>

                {selectedRecords.length === 0 ? (
                  <div
                    className="text-center p-4 text-sm rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]"
                    style={{ color: theme.textMuted, backgroundColor: theme.inputBg, borderColor: theme.border }}
                  >
                    {t.noRecords}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedRecords.map((record) => {
                      const time = new Date(record.completedAt);
                      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
                      const duration = record.durationMinutes || 25;
                      const stage = getGrowthStage(duration);
                      return (
                        <div
                          key={record.id}
                          className="flex items-center gap-2.5 p-3 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]"
                          style={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
                        >
                          <GrowthIcon stage={stage} size={18} />
                          <span className="flex-1 text-sm truncate" style={{ color: theme.textMuted }}>
                            {record.task || t.unnamed}
                          </span>
                          <span className="text-xs" style={{ color: theme.textMuted }}>{duration}min</span>
                          <span className="text-xs font-mono" style={{ color: theme.textMuted }}>{timeStr}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Project records for selected date */}
                {(() => {
                  const dayProjects = projectRecords.filter((p) => p.date === selectedDate);
                  if (dayProjects.length === 0) return null;
                  return (
                    <div className="mt-4">
                      <div className="text-xs font-medium uppercase tracking-wider mb-2"
                        style={{ color: theme.textMuted }}>
                        📋 {t.projectHistory}
                      </div>
                      <div className="space-y-2">
                        {dayProjects.map((proj) => {
                          const estMin = Math.round(proj.totalEstimatedSeconds / 60);
                          const actMin = Math.round(proj.totalActualSeconds / 60);
                          return (
                            <div
                              key={proj.id}
                              className="p-3 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]"
                              style={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm truncate flex-1" style={{ color: theme.textMuted }}>
                                  {proj.name}
                                </span>
                                <span className="text-xs shrink-0" style={{ color: theme.textMuted }}>
                                  {proj.tasks.length} {t.projectCompleted}
                                </span>
                              </div>
                              <div className="flex gap-3 mt-1 text-xs" style={{ color: theme.textMuted }}>
                                <span>{t.projectHistoryEstimated}: {estMin}min</span>
                                <span>{t.projectHistoryActual}: {actMin}min</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Streak */}
              <div className="flex gap-3">
                <div
                  className="flex-1 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)] p-3 text-center"
                  style={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
                >
                  <div className="text-2xl font-semibold" style={{ color: theme.accent }}>
                    {streak.current}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>{t.currentStreak}</div>
                </div>
                <div
                  className="flex-1 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)] p-3 text-center"
                  style={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
                >
                  <div className="text-2xl font-semibold" style={{ color: theme.text }}>
                    {streak.longest}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>{t.longestStreak}</div>
                </div>
              </div>

              {/* Chart */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color: theme.text }}>{t.focusTrend}</span>
                  <div className="flex gap-1">
                    {([7, 30] as const).map((n) => (
                      <button
                        key={n}
                        onClick={() => setChartRange(n)}
                        className="px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-all"
                        style={{
                          backgroundColor: chartRange === n ? `${theme.accent}20` : theme.inputBg,
                          color: chartRange === n ? theme.accent : theme.textMuted,
                        }}
                      >
                        {chartRangeLabels[n]}
                      </button>
                    ))}
                  </div>
                </div>
                <BarChart data={chartData} />
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4">
                <SummaryCard label={t.thisWeek} value={t.formatMinutes(summary.weekMinutes)} theme={theme} />
                <SummaryCard label={t.thisMonth} value={t.formatMinutes(summary.monthMinutes)} theme={theme} />
                <SummaryCard label={t.totalTime} value={t.formatMinutes(summary.totalMinutes)} theme={theme} />
                <SummaryCard label={t.totalCount} value={t.countUnit(summary.totalCount)} theme={theme} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, theme }: { label: string; value: string; theme: { inputBg: string; border: string; text: string; textMuted: string } }) {
  return (
    <div
      className="rounded-[var(--radius-card)] border shadow-[var(--shadow-card)] p-3"
      style={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
    >
      <div className="text-sm font-medium" style={{ color: theme.text }}>{value}</div>
      <div className="text-[10px] mt-0.5" style={{ color: theme.textMuted }}>{label}</div>
    </div>
  );
}
