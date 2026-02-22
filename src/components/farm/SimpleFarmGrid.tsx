/**
 * SimpleFarmGrid - 7-plot cartoon farm layout in a straightforward grid.
 *
 * Keeps card behavior centralized by reusing the existing PlotCard
 * component from FarmPage.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useI18n } from '../../i18n';
import type { Plot, StolenRecord, Weather } from '../../types/farm';
import { PlotCard } from '../FarmPage';

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
      <div className={`mx-auto grid w-full grid-cols-2 justify-center sm:grid-cols-3 md:grid-cols-4 ${layout.gapClass}`}>
        {plots.map((plot, plotIndex) => {
          const isLastMobilePlot = isMobile && plotIndex === plots.length - 1;

          return (
            <div
              key={plot ? `plot-simple-${plot.id}` : `plot-locked-${plotIndex}`}
              className={`relative rounded-xl border-[3px] border-[#8B6914] bg-[#C4956A] shadow-md ${
                isLastMobilePlot ? 'col-span-2 justify-self-center' : ''
              }`}
              style={{ width: layout.plotSize, height: layout.plotSize }}
            >
              <div className="absolute inset-[12px]">
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
                  <div className="flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed border-[#8B6914] bg-[#C4956A]/40">
                    <span className="text-2xl leading-none">🔒</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
