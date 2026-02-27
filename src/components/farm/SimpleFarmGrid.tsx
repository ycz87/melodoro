/**
 * SimpleFarmGrid - 7-plot portrait farm scene with centered subject.
 *
 * Reuses PlotCard to keep all plot interactions and state logic unchanged.
 */
import { useEffect, useId, useMemo, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useI18n } from '../../i18n';
import type { ThemeColors } from '../../types';
import type { Plot, StolenRecord, Weather } from '../../types/farm';
import { PlotCard } from '../FarmPage';
import { FarmDecorations } from './FarmDecorations';
import { IsometricPlotShell } from './IsometricPlotShell';

interface SimpleFarmGridProps {
  plots: Plot[];
  weather: Weather | null;
  nowTimestamp: number;
  activeTooltipPlotId: number | null;
  stolenRecordByPlotId?: Map<number, StolenRecord>;
  mutationGunCount: number;
  moonDewCount: number;
  nectarCount: number;
  starTrackerCount: number;
  trapNetCount: number;
  onActiveTooltipChange: (plotId: number | null) => void;
  onPlant: (plotId: number) => void;
  onHarvest: (plotId: number) => void;
  onClear: (plotId: number) => void;
  onUseMutationGun: (plotId: number) => void;
  onUseMoonDew: (plotId: number) => void;
  onUseNectar: (plotId: number) => void;
  onUseStarTracker: (plotId: number) => void;
  onUseTrapNet: (plotId: number) => void;
  compactMode?: boolean;
}

interface GridLayout {
  gap: number;
  plotSize: number;
}

const SMALL_MOBILE_BREAKPOINT = 420;
const MOBILE_BREAKPOINT = 640;
const TABLET_BREAKPOINT = 1024;
const DESKTOP_VIEWPORT_WIDTH = 1024;
const TOTAL_SLOTS = 7;

const COMPACT_MOBILE_LAYOUT: GridLayout = {
  gap: 1,
  plotSize: 100,
};

const MOBILE_LAYOUT: GridLayout = {
  gap: 2,
  plotSize: 108,
};

const TABLET_LAYOUT: GridLayout = {
  gap: 3,
  plotSize: 124,
};

const DESKTOP_LAYOUT: GridLayout = {
  gap: 4,
  plotSize: 140,
};

function getViewportWidth(): number {
  if (typeof window === 'undefined') {
    return DESKTOP_VIEWPORT_WIDTH;
  }
  return window.innerWidth;
}

function getGridLayout(viewportWidth: number): GridLayout {
  if (viewportWidth < SMALL_MOBILE_BREAKPOINT) {
    return COMPACT_MOBILE_LAYOUT;
  }
  if (viewportWidth < MOBILE_BREAKPOINT) {
    return MOBILE_LAYOUT;
  }
  if (viewportWidth < TABLET_BREAKPOINT) {
    return TABLET_LAYOUT;
  }
  return DESKTOP_LAYOUT;
}

interface SlotPlacement {
  column: 1 | 2 | 3;
  row: 1 | 2 | 3 | 4 | 5;
  xOffset: number;
  yOffset: number;
}

interface ScenePalette {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  skyHaze: string;
  sunCore: string;
  sunRing: string;
  sunGlow: string;
  cloudMain: string;
  cloudShade: string;
  ridgeFarTop: string;
  ridgeFarBottom: string;
  ridgeMidTop: string;
  ridgeMidBottom: string;
  hillNearTop: string;
  hillNearBottom: string;
  meadowTop: string;
  meadowMid: string;
  meadowBottom: string;
  meadowLight: string;
  horizonMist: string;
  fieldShadow: string;
  clusterShadow: string;
}

const PORTRAIT_SLOT_PLACEMENTS: SlotPlacement[] = [
  { column: 2, row: 1, xOffset: 0, yOffset: 0 },
  { column: 1, row: 2, xOffset: 16, yOffset: -6 },
  { column: 3, row: 2, xOffset: -16, yOffset: -6 },
  { column: 2, row: 3, xOffset: 0, yOffset: -12 },
  { column: 1, row: 4, xOffset: 16, yOffset: -18 },
  { column: 3, row: 4, xOffset: -16, yOffset: -18 },
  { column: 2, row: 5, xOffset: 0, yOffset: -24 },
];

function buildScenePalette(theme: ThemeColors): ScenePalette {
  return {
    skyTop: `color-mix(in oklab, #8fd6ff 86%, ${theme.bg} 14%)`,
    skyMid: `color-mix(in oklab, #c3ecff 88%, ${theme.surface} 12%)`,
    skyBottom: `color-mix(in oklab, #ecfbff 90%, ${theme.surface} 10%)`,
    skyHaze: 'rgba(234,248,255,0.74)',
    sunCore: '#ffe99a',
    sunRing: '#ffd47b',
    sunGlow: 'rgba(255,226,133,0.55)',
    cloudMain: `color-mix(in oklab, #ffffff 92%, ${theme.surface} 8%)`,
    cloudShade: `color-mix(in oklab, #d8e9f4 84%, ${theme.bg} 16%)`,
    ridgeFarTop: `color-mix(in oklab, #caebb4 86%, ${theme.surface} 14%)`,
    ridgeFarBottom: `color-mix(in oklab, #b5dd9d 84%, ${theme.surface} 16%)`,
    ridgeMidTop: `color-mix(in oklab, #bde6a1 88%, ${theme.surface} 12%)`,
    ridgeMidBottom: `color-mix(in oklab, #a4d88b 86%, ${theme.surface} 14%)`,
    hillNearTop: `color-mix(in oklab, #b2e08c 88%, ${theme.surface} 12%)`,
    hillNearBottom: `color-mix(in oklab, #96cc72 86%, ${theme.surface} 14%)`,
    meadowTop: `color-mix(in oklab, #b6e58a 90%, ${theme.surface} 10%)`,
    meadowMid: `color-mix(in oklab, #9ed271 88%, ${theme.surface} 12%)`,
    meadowBottom: `color-mix(in oklab, #89bf61 88%, ${theme.surface} 12%)`,
    meadowLight: 'rgba(237,255,199,0.46)',
    horizonMist: 'rgba(220,244,252,0.72)',
    fieldShadow: 'rgba(85,126,56,0.2)',
    clusterShadow: 'rgba(88,132,60,0.28)',
  };
}

export function SimpleFarmGrid({
  plots,
  weather,
  nowTimestamp,
  activeTooltipPlotId,
  stolenRecordByPlotId,
  mutationGunCount,
  moonDewCount,
  nectarCount,
  starTrackerCount,
  trapNetCount,
  onActiveTooltipChange,
  onPlant,
  onHarvest,
  onClear,
  onUseMutationGun,
  onUseMoonDew,
  onUseNectar,
  onUseStarTracker,
  onUseTrapNet,
  compactMode = false,
}: SimpleFarmGridProps) {
  const theme = useTheme();
  const t = useI18n();
  const sceneId = useId().replace(/:/g, '');
  const [viewportWidth, setViewportWidth] = useState<number>(() => getViewportWidth());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const layout = useMemo(() => getGridLayout(viewportWidth), [viewportWidth]);
  const scenePalette = useMemo(() => buildScenePalette(theme), [theme]);
  const isCompactMobile = viewportWidth < SMALL_MOBILE_BREAKPOINT;
  const isMobile = viewportWidth < MOBILE_BREAKPOINT;

  const plotScale = compactMode
    ? (isCompactMobile ? 1.34 : isMobile ? 1.38 : 1.48)
    : 1;
  const effectivePlotSize = Math.round(layout.plotSize * plotScale);
  const safeSideInset = compactMode ? 0 : (isCompactMobile ? 12 : isMobile ? 10 : 0);
  const sceneWidth = effectivePlotSize * 3 + layout.gap * 2;
  const sceneFrameMaxWidth = compactMode
    ? undefined
    : sceneWidth + (isMobile ? 72 : 108);

  // Compact review mode intentionally prioritizes first-screen focus on plots.
  const sceneTopPadding = compactMode
    ? (isCompactMobile
      ? Math.round(effectivePlotSize * 1.72)
      : isMobile
        ? Math.round(effectivePlotSize * 1.66)
        : Math.round(effectivePlotSize * 1.3))
    : (isCompactMobile
      ? Math.round(effectivePlotSize * 1.52)
      : isMobile
        ? Math.round(effectivePlotSize * 1.56)
        : Math.round(effectivePlotSize * 1.42));
  const sceneBottomPadding = compactMode
    ? 0
    : (isCompactMobile
      ? Math.round(effectivePlotSize * 0.52)
      : isMobile
        ? Math.round(effectivePlotSize * 0.5)
        : Math.round(effectivePlotSize * 0.44));
  const slotOffsetScale = compactMode
    ? (isCompactMobile ? 0.96 : isMobile ? 0.98 : 0.98)
    : (isCompactMobile ? 0.96 : isMobile ? 1 : 1.02);

  return (
    <div className="relative w-full overflow-visible" onClick={() => onActiveTooltipChange(null)} style={{ backgroundColor: scenePalette.meadowBottom }}>
      <div
        className="relative mx-auto w-full overflow-visible"
        style={{
          maxWidth: sceneFrameMaxWidth,
          minHeight: compactMode ? '100dvh' : undefined,
          paddingLeft: safeSideInset,
          paddingRight: safeSideInset,
        }}
      >
        <div
          className={`pointer-events-none absolute inset-0 overflow-hidden ${compactMode ? 'rounded-none' : 'rounded-[var(--radius-container)]'}`}
          aria-hidden="true"
        >
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 1000 1400"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`farm-sky-${sceneId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={scenePalette.skyTop} />
                <stop offset="56%" stopColor={scenePalette.skyMid} />
                <stop offset="76%" stopColor={scenePalette.skyBottom} />
                <stop offset="100%" stopColor={scenePalette.meadowTop} />
              </linearGradient>
              <radialGradient id={`farm-sky-haze-${sceneId}`} cx="50%" cy="24%" r="72%">
                <stop offset="0%" stopColor={scenePalette.skyHaze} />
                <stop offset="100%" stopColor="rgba(234,248,255,0)" />
              </radialGradient>
              <linearGradient id={`farm-ridge-far-${sceneId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={scenePalette.ridgeFarTop} />
                <stop offset="100%" stopColor={scenePalette.ridgeFarBottom} />
              </linearGradient>
              <linearGradient id={`farm-ridge-mid-${sceneId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={scenePalette.ridgeMidTop} />
                <stop offset="100%" stopColor={scenePalette.ridgeMidBottom} />
              </linearGradient>
              <linearGradient id={`farm-hill-near-${sceneId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={scenePalette.hillNearTop} />
                <stop offset="100%" stopColor={scenePalette.hillNearBottom} />
              </linearGradient>
              <linearGradient id={`farm-meadow-${sceneId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={scenePalette.meadowTop} />
                <stop offset="44%" stopColor={scenePalette.meadowMid} />
                <stop offset="100%" stopColor={scenePalette.meadowBottom} />
              </linearGradient>
              <radialGradient id={`farm-sun-glow-${sceneId}`} cx="50%" cy="50%" r="62%">
                <stop offset="0%" stopColor={scenePalette.sunGlow} />
                <stop offset="100%" stopColor="rgba(255,226,121,0)" />
              </radialGradient>
              <radialGradient id={`farm-horizon-mist-${sceneId}`} cx="50%" cy="50%" r="68%">
                <stop offset="0%" stopColor={scenePalette.horizonMist} />
                <stop offset="100%" stopColor="rgba(222,247,255,0)" />
              </radialGradient>
              <radialGradient id={`farm-meadow-light-${sceneId}`} cx="50%" cy="50%" r="64%">
                <stop offset="0%" stopColor={scenePalette.meadowLight} />
                <stop offset="100%" stopColor="rgba(237,255,199,0)" />
              </radialGradient>
              <filter id={`farm-ridge-soft-${sceneId}`} x="-20%" y="-18%" width="140%" height="158%">
                <feGaussianBlur stdDeviation="3.4" />
              </filter>
              <filter id={`farm-cloud-soft-${sceneId}`} x="-20%" y="-36%" width="140%" height="172%">
                <feGaussianBlur stdDeviation="1.2" />
              </filter>
            </defs>

            <rect x="0" y="0" width="1000" height="1400" fill={`url(#farm-sky-${sceneId})`} />
            <rect x="0" y="0" width="1000" height="640" fill={`url(#farm-sky-haze-${sceneId})`} />
            <ellipse cx="500" cy="660" rx="620" ry="160" fill={`url(#farm-horizon-mist-${sceneId})`} opacity="0.76" />

            <ellipse cx="156" cy="128" rx="106" ry="106" fill={`url(#farm-sun-glow-${sceneId})`} />
            <g transform="translate(156 128)">
              <circle cx="0" cy="0" r="42" fill={scenePalette.sunRing} opacity="0.54" />
              <circle cx="0" cy="0" r="32" fill={scenePalette.sunCore} />
              <circle cx="-14" cy="-6" r="3.2" fill="#cd8a41" />
              <circle cx="14" cy="-6" r="3.2" fill="#cd8a41" />
              <path d="M -12 11 Q 0 20 12 11" stroke="#cd8a41" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>

            <g opacity="0.87" filter={`url(#farm-cloud-soft-${sceneId})`}>
              <g transform="translate(264 154)">
                <ellipse cx="0" cy="0" rx="42" ry="23" fill={scenePalette.cloudMain} />
                <ellipse cx="-29" cy="9" rx="25" ry="15" fill={scenePalette.cloudMain} />
                <ellipse cx="30" cy="10" rx="23" ry="14" fill={scenePalette.cloudMain} />
                <ellipse cx="8" cy="17" rx="36" ry="8" fill={scenePalette.cloudShade} opacity="0.46" />
              </g>
              <g transform="translate(686 170)">
                <ellipse cx="0" cy="0" rx="47" ry="25" fill={scenePalette.cloudMain} />
                <ellipse cx="-34" cy="10" rx="25" ry="15" fill={scenePalette.cloudMain} />
                <ellipse cx="36" cy="11" rx="25" ry="15" fill={scenePalette.cloudMain} />
                <ellipse cx="10" cy="18" rx="40" ry="9" fill={scenePalette.cloudShade} opacity="0.46" />
              </g>
              <g transform="translate(504 124)" opacity="0.8">
                <ellipse cx="0" cy="0" rx="34" ry="18" fill={scenePalette.cloudMain} />
                <ellipse cx="-24" cy="7" rx="20" ry="12" fill={scenePalette.cloudMain} />
                <ellipse cx="22" cy="7" rx="18" ry="11" fill={scenePalette.cloudMain} />
                <ellipse cx="4" cy="14" rx="30" ry="7" fill={scenePalette.cloudShade} opacity="0.44" />
              </g>
            </g>

            <path
              d="M -120 628 C 84 560 242 578 382 556 C 542 530 706 600 864 570 C 954 552 1044 574 1120 548 L 1120 834 L -120 834 Z"
              fill={`url(#farm-ridge-far-${sceneId})`}
              opacity="0.78"
              filter={`url(#farm-ridge-soft-${sceneId})`}
            />
            <path
              d="M -132 718 C 72 656 246 674 406 650 C 584 620 744 694 902 662 C 988 644 1064 662 1132 640 L 1132 954 L -132 954 Z"
              fill={`url(#farm-ridge-mid-${sceneId})`}
              opacity="0.84"
              filter={`url(#farm-ridge-soft-${sceneId})`}
            />
            <path
              d="M -146 810 C 86 752 264 772 432 744 C 608 716 786 790 964 760 C 1038 748 1088 756 1144 748 L 1144 1098 L -146 1098 Z"
              fill={`url(#farm-hill-near-${sceneId})`}
              opacity="0.9"
            />
            <path
              d="M -160 930 C 88 862 276 882 456 852 C 648 822 836 900 1024 870 C 1082 862 1116 868 1160 860 L 1160 1410 L -160 1410 Z"
              fill={`url(#farm-meadow-${sceneId})`}
            />
            <ellipse cx="520" cy="1118" rx="372" ry="164" fill={`url(#farm-meadow-light-${sceneId})`} opacity="0.58" />
            <ellipse cx="508" cy="1080" rx="306" ry="124" fill={scenePalette.meadowLight} opacity="0.34" />
          </svg>

          <div
            className="absolute inset-x-[12%] bottom-[8.5%] h-[15%]"
            style={{
              background: `radial-gradient(ellipse at center, ${scenePalette.clusterShadow} 0%, transparent 76%)`,
              filter: 'blur(8px)',
            }}
          />
          <span className="absolute left-[12%] top-[63%] h-[5px] w-[5px] rounded-full" style={{ backgroundColor: 'rgba(246,255,223,0.5)' }} />
          <span className="absolute right-[14%] top-[61.5%] h-[5px] w-[5px] rounded-full" style={{ backgroundColor: 'rgba(246,255,223,0.5)' }} />
        </div>

        <FarmDecorations />

        <div
          className="pointer-events-none absolute inset-x-[20%] bottom-[10%] z-[7] h-[18%]"
          aria-hidden="true"
          style={{
            background: `radial-gradient(ellipse at center, ${scenePalette.fieldShadow} 0%, rgba(81,124,48,0.08) 48%, transparent 100%)`,
            filter: 'blur(6px)',
          }}
        />

        <div
          className="relative z-10 flex justify-center px-3 sm:px-4"
          style={{
            paddingTop: sceneTopPadding,
            paddingBottom: sceneBottomPadding,
          }}
        >
          <div
            className="farm-grid-perspective grid grid-cols-3 justify-items-center"
            style={{
              width: sceneWidth,
              gap: layout.gap,
              gridTemplateColumns: `repeat(3, minmax(0, ${effectivePlotSize}px))`,
              gridAutoRows: `${Math.round(effectivePlotSize * (compactMode ? (isMobile ? 0.8 : 0.7) : 0.56))}px`,
            }}
          >
            {Array.from({ length: TOTAL_SLOTS }).map((_, slotIndex) => {
              const plot = slotIndex < plots.length ? plots[slotIndex] : null;
              const placement = PORTRAIT_SLOT_PLACEMENTS[slotIndex] ?? PORTRAIT_SLOT_PLACEMENTS[0];

              return (
                <div
                  key={plot ? `plot-simple-${plot.id}` : `plot-locked-${slotIndex}`}
                  className="relative justify-self-center"
                  style={{
                    width: effectivePlotSize,
                    gridColumnStart: placement.column,
                    gridRowStart: placement.row,
                    transform: `translate(${Math.round(placement.xOffset * slotOffsetScale)}px, ${Math.round(placement.yOffset * slotOffsetScale)}px)`,
                  }}
                >
                  <IsometricPlotShell size={effectivePlotSize} state={plot ? plot.state : 'locked'}>
                    {plot ? (
                      <PlotCard
                        plot={plot}
                        weather={weather}
                        stolenRecord={stolenRecordByPlotId?.get(plot.id)}
                        nowTimestamp={nowTimestamp}
                        theme={theme}
                        t={t}
                        isTooltipOpen={activeTooltipPlotId === plot.id}
                        onTooltipToggle={() => onActiveTooltipChange(activeTooltipPlotId === plot.id ? null : plot.id)}
                        onPlantClick={() => onPlant(plot.id)}
                        onHarvestClick={() => onHarvest(plot.id)}
                        onClearClick={() => onClear(plot.id)}
                        mutationGunCount={mutationGunCount}
                        onUseMutationGun={() => onUseMutationGun(plot.id)}
                        moonDewCount={moonDewCount}
                        onUseMoonDew={() => onUseMoonDew(plot.id)}
                        nectarCount={nectarCount}
                        onUseNectar={() => onUseNectar(plot.id)}
                        starTrackerCount={starTrackerCount}
                        onUseStarTracker={() => onUseStarTracker(plot.id)}
                        trapNetCount={trapNetCount}
                        onUseTrapNet={() => onUseTrapNet(plot.id)}
                      />
                    ) : (
                      <div
                        className="flex aspect-square w-full flex-col items-center justify-center gap-1 border-2 border-dashed"
                        style={{
                          borderColor: 'rgba(128,159,95,0.58)',
                          background: 'linear-gradient(150deg, rgba(255,255,255,0.34) 0%, rgba(190,228,144,0.48) 100%)',
                        }}
                      >
                        <span className="text-2xl leading-none" style={{ color: '#6f8f56' }}>🔒</span>
                        <span className="text-[9px] font-medium leading-none" style={{ color: '#6f8f56' }}>
                          {t.marketPlotName(slotIndex)}
                        </span>
                      </div>
                    )}
                  </IsometricPlotShell>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-x-[17%] bottom-[8%] z-[6] h-[11%]"
          aria-hidden="true"
          style={{
            background: `radial-gradient(ellipse at center, rgba(96,138,62,0.42) 0%, rgba(96,138,62,0.18) 44%, rgba(96,138,62,0) 100%)`,
            filter: 'blur(2px)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-[13%] bottom-[5.8%] z-[6] h-[8%]"
          aria-hidden="true"
          style={{
            background: 'linear-gradient(180deg, rgba(176,216,122,0) 0%, rgba(159,205,103,0.44) 48%, rgba(144,193,90,0.62) 100%)',
            clipPath: 'ellipse(48% 88% at 50% 100%)',
          }}
        />
      </div>
    </div>
  );
}
