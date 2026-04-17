import type { ThemeColors } from '../../types';

interface MarketItemCardProps {
  icon: string;
  name: string;
  description: string;
  metaText?: string;
  priceText: string;
  actionText: string;
  disabled?: boolean;
  dimmed?: boolean;
  onAction: () => void;
  theme: ThemeColors;
}

export function MarketItemCard(props: MarketItemCardProps) {
  const {
    icon,
    name,
    description,
    metaText,
    priceText,
    actionText,
    disabled = false,
    dimmed = false,
    onAction,
    theme,
  } = props;

  return (
    <div
      className="rounded-[var(--radius-card)] border px-3 py-3 shadow-[var(--shadow-card)] transition-all duration-200 ease-out"
      style={{
        backgroundColor: theme.inputBg,
        borderColor: disabled ? `${theme.border}` : `${theme.accent}18`,
        opacity: dimmed ? 0.68 : 1,
      }}
    >
      <div className="grid grid-cols-[auto,minmax(0,1fr)] gap-x-3 gap-y-3 sm:grid-cols-[auto,minmax(0,1fr),auto] sm:items-center">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl"
          style={{
            background: `linear-gradient(135deg, ${theme.accent}24 0%, ${theme.accentEnd}18 100%)`,
            border: `1px solid ${theme.accent}22`,
          }}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 text-sm font-semibold leading-5" style={{ color: theme.text }}>
              {name}
            </div>
            {metaText && (
              <span
                className="inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: `${theme.accent}14`,
                  color: theme.accent,
                  border: `1px solid ${theme.accent}20`,
                }}
              >
                <span className="truncate">{metaText}</span>
              </span>
            )}
          </div>
          <div
            className="mt-1 text-xs leading-5"
            style={{
              color: theme.textMuted,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </div>
        </div>

        <div className="col-start-2 flex min-w-0 items-center justify-between gap-3 sm:col-start-auto sm:min-w-[132px] sm:flex-col sm:items-end sm:justify-center">
          <div className="text-sm font-semibold whitespace-nowrap" style={{ color: disabled ? theme.textMuted : '#fbbf24' }}>
            {priceText}
          </div>
          <button
            type="button"
            onClick={onAction}
            disabled={disabled}
            className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ease-out cursor-pointer disabled:cursor-not-allowed"
            style={{
              backgroundColor: disabled ? theme.border : theme.accent,
              color: disabled ? theme.textMuted : '#ffffff',
              minWidth: '88px',
            }}
          >
            {actionText}
          </button>
        </div>
      </div>
    </div>
  );
}
