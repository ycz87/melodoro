/**
 * SimpleFarmGrid - 7-plot farm layout with an isometric shell per slot.
 *
 * Reuses PlotCard to keep all plot interactions and state logic unchanged.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useI18n } from '../../i18n';
import type { Plot, StolenRecord, Weather } from '../../types/farm';
import { PlotCard } from '../FarmPage';
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
}

interface GridLayout {
  gapClass: 'gap-3' | 'gap-4' | 'gap-5';
  plotSize: number;
}

const MOBILE_BREAKPOINT = 640;
const TABLET_BREAKPOINT = 768;
const DESKTOP_VIEWPORT_WIDTH = 1024;
const TOTAL_SLOTS = 7;

const MOBILE_LAYOUT: GridLayout = {
  gapClass: 'gap-3',
  plotSize: 90,
};

const TABLET_LAYOUT: GridLayout = {
  gapClass: 'gap-4',
  plotSize: 130,
};

const DESKTOP_LAYOUT: GridLayout = {
  gapClass: 'gap-5',
  plotSize: 160,
};

function getViewportWidth(): number {
  if (typeof window === 'undefined') {
    return DESKTOP_VIEWPORT_WIDTH;
  }
  return window.innerWidth;
}

function getGridLayout(viewportWidth: number): GridLayout {
  if (viewportWidth < MOBILE_BREAKPOINT) {
    return MOBILE_LAYOUT;
  }
  if (viewportWidth < TABLET_BREAKPOINT) {
    return TABLET_LAYOUT;
  }
  return DESKTOP_LAYOUT;
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
}: SimpleFarmGridProps) {
  const theme = useTheme();
  const t = useI18n();
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
  const isMobile = viewportWidth < MOBILE_BREAKPOINT;

  return (
    <div className="relative w-full overflow-visible" onClick={() => onActiveTooltipChange(null)}>
      <div className={`farm-grid-perspective mx-auto grid w-full grid-cols-2 items-start justify-center sm:grid-cols-3 md:grid-cols-4 ${layout.gapClass}`}>
        {Array.from({ length: TOTAL_SLOTS }).map((_, slotIndex) => {
          const plot = slotIndex < plots.length ? plots[slotIndex] : null;
          const isLastMobilePlot = isMobile && TOTAL_SLOTS % 2 === 1 && slotIndex === TOTAL_SLOTS - 1;

          return (
            <div
              key={plot ? `plot-simple-${plot.id}` : `plot-locked-${slotIndex}`}
              className={`relative ${
                isLastMobilePlot ? 'col-span-2 justify-self-center' : ''
              }`}
              style={{ width: layout.plotSize }}
            >
              <IsometricPlotShell size={layout.plotSize} state={plot ? plot.state : 'locked'}>
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
                      borderColor: `${theme.textMuted}88`,
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.16) 0%, rgba(0,0,0,0.12) 100%)',
                    }}
                  >
                    <span className="text-2xl leading-none" style={{ color: theme.textMuted }}>🔒</span>
                    <span className="text-[9px] font-medium leading-none" style={{ color: theme.textFaint }}>
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
  );
}
