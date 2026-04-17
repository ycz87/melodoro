import type { ThemeColors } from '../../types';
import type { Messages } from '../../i18n/types';

interface MarketTradeHeroProps {
  balance: number;
  weeklyItemCount: number;
  sellableCount: number;
  messages: Messages;
  theme: ThemeColors;
}

export function MarketTradeHero(props: MarketTradeHeroProps) {
  const { balance, weeklyItemCount, sellableCount, messages, theme } = props;

  return (
    <div
      className="relative overflow-hidden rounded-[24px] border px-4 py-4 shadow-[var(--shadow-card)] sm:px-5 sm:py-5"
      style={{
        borderColor: `${theme.accent}2c`,
        background: `linear-gradient(135deg, ${theme.surface} 0%, ${theme.inputBg} 45%, ${theme.accent}12 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 18% 20%, ${theme.accent}18 0%, transparent 36%), radial-gradient(circle at 86% 18%, ${theme.accentEnd}18 0%, transparent 28%), linear-gradient(180deg, transparent 0%, ${theme.surface}40 100%)`,
        }}
      />

      <svg
        className="pointer-events-none absolute right-0 top-0 h-full w-full opacity-95"
        viewBox="0 0 640 260"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="heroAccent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={theme.accent} stopOpacity="0.28" />
            <stop offset="100%" stopColor={theme.accentEnd} stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="crateGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#fb7185" stopOpacity="0.14" />
          </linearGradient>
        </defs>

        <circle cx="512" cy="70" r="78" fill="url(#heroAccent)" />
        <circle cx="590" cy="170" r="96" fill={theme.accentEnd} fillOpacity="0.08" />

        <path d="M360 102C398 72 442 68 478 90C518 114 562 112 606 86" stroke={theme.accent} strokeWidth="8" strokeLinecap="round" strokeOpacity="0.26" />
        <path d="M372 132C408 104 446 102 484 122C522 142 560 142 598 120" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" strokeDasharray="1 14" strokeOpacity="0.75" />

        <rect x="390" y="136" width="70" height="58" rx="14" fill="url(#crateGlow)" stroke="#fbbf24" strokeOpacity="0.3" />
        <rect x="454" y="116" width="86" height="72" rx="16" fill={theme.surface} fillOpacity="0.54" stroke={theme.accentEnd} strokeOpacity="0.24" />
        <rect x="520" y="146" width="74" height="54" rx="14" fill={theme.surface} fillOpacity="0.48" stroke={theme.accent} strokeOpacity="0.18" />

        <circle cx="424" cy="164" r="15" fill="#22c55e" fillOpacity="0.8" />
        <circle cx="445" cy="166" r="13" fill="#ef4444" fillOpacity="0.8" />
        <circle cx="478" cy="146" r="15" fill="#f59e0b" fillOpacity="0.88" />
        <circle cx="503" cy="146" r="12" fill="#22c55e" fillOpacity="0.72" />
        <circle cx="540" cy="170" r="13" fill="#ef4444" fillOpacity="0.82" />
        <circle cx="565" cy="172" r="12" fill="#22c55e" fillOpacity="0.68" />

        <rect x="402" y="84" width="40" height="24" rx="12" fill={theme.surface} fillOpacity="0.82" stroke="#fbbf24" strokeOpacity="0.45" />
        <path d="M413 95H431" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
        <path d="M425 88V102" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />

        <rect x="512" y="74" width="44" height="24" rx="12" fill={theme.surface} fillOpacity="0.82" stroke={theme.accent} strokeOpacity="0.4" />
        <path d="M523 86L545 86" stroke={theme.accent} strokeWidth="4" strokeLinecap="round" />
        <path d="M539 80L545 86L539 92" stroke={theme.accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

        <circle cx="576" cy="94" r="7" fill="#fbbf24" fillOpacity="0.82" />
        <circle cx="595" cy="110" r="5" fill="#fde68a" fillOpacity="0.9" />
        <circle cx="560" cy="114" r="4" fill="#fde68a" fillOpacity="0.88" />
      </svg>

      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <div
            className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{
              backgroundColor: `${theme.surface}cc`,
              color: theme.accent,
              border: `1px solid ${theme.accent}24`,
            }}
          >
            {messages.marketTitle}
          </div>
          <div className="mt-3 text-xl font-semibold sm:text-2xl" style={{ color: theme.text }}>
            {messages.marketHeroTitle}
          </div>
          <div className="mt-2 max-w-lg text-sm leading-6" style={{ color: theme.textMuted }}>
            {messages.marketHeroSubtitle}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              `${messages.marketBalance} · ${balance} 💰`,
              messages.marketTabWeekly,
              messages.marketGoodsSection,
              messages.marketPlotSection,
            ].map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${theme.surface}d6`,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:min-w-[248px] sm:gap-3">
          <HeroStatCard
            label={messages.marketTabWeekly}
            value={`${weeklyItemCount}`}
            theme={theme}
          />
          <HeroStatCard
            label={messages.marketTabSell}
            value={`${sellableCount}`}
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
}

function HeroStatCard({ label, value, theme }: { label: string; value: string; theme: ThemeColors }) {
  return (
    <div
      className="rounded-2xl px-3 py-3"
      style={{
        backgroundColor: `${theme.surface}d8`,
        border: `1px solid ${theme.border}`,
      }}
    >
      <div className="text-[11px] font-medium leading-4" style={{ color: theme.textMuted }}>
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold" style={{ color: theme.text }}>
        {value}
      </div>
    </div>
  );
}
