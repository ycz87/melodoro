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
      className="px-3 py-2.5 transition-colors duration-150 sm:px-4 sm:py-3"
      style={{
        opacity: dimmed ? 0.66 : 1,
        backgroundColor: 'transparent',
      }}
    >
      <div className="grid grid-cols-[auto,minmax(0,1fr)] gap-x-3 gap-y-1.5 sm:grid-cols-[auto,minmax(0,1fr),auto] sm:items-center">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-lg sm:h-10 sm:w-10 sm:text-2xl"
          style={{
            backgroundColor: `${theme.accent}12`,
            color: theme.text,
            border: `1px solid ${theme.accent}18`,
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
                  backgroundColor: `${theme.accent}12`,
                  color: theme.accent,
                }}
              >
                <span className="truncate">{metaText}</span>
              </span>
            )}
          </div>
          <div
            className="mt-0.5 text-xs leading-5"
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

        <div className="col-span-2 flex items-center justify-end gap-2.5 pl-11 sm:col-span-1 sm:min-w-[132px] sm:pl-0">
          <div className="text-sm font-semibold whitespace-nowrap" style={{ color: disabled ? theme.textMuted : '#fbbf24' }}>
            {priceText}
          </div>
          <button
            type="button"
            onClick={onAction}
            disabled={disabled}
            className="shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
            style={{
              backgroundColor: disabled ? theme.border : `${theme.accent}16`,
              color: disabled ? theme.textMuted : theme.accent,
              border: `1px solid ${disabled ? theme.border : `${theme.accent}30`}`,
              minWidth: '84px',
            }}
          >
            {actionText}
          </button>
        </div>
      </div>
    </div>
  );
}
