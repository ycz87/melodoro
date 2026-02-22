/**
 * IsometricFarmGrid - 7-plot isometric farm layout.
 *
 * Uses a responsive 1-2-1-2-1 diamond arrangement and keeps PlotCard logic centralized
 * by reusing the existing PlotCard component from FarmPage.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useI18n } from '../../i18n';
import type { Plot, StolenRecord, Weather } from '../../types/farm';
import { PlotCard } from '../FarmPage';

interface IsometricFarmGridProps {
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

interface PlotPosition {
  x: number;
  y: number;
}

interface FarmLayoutMetrics {
  sceneSize: {
    width: number;
    height: number;
  };
  plotIslandSize: number;
  xOffset: number;
}

const MOBILE_BREAKPOINT = 640;
const TABLET_BREAKPOINT = 768;

const MOBILE_LAYOUT: FarmLayoutMetrics = {
  sceneSize: { width: 350, height: 450 },
  plotIslandSize: 100,
  xOffset: 60,
};

const TABLET_LAYOUT: FarmLayoutMetrics = {
  sceneSize: { width: 550, height: 450 },
  plotIslandSize: 160,
  xOffset: 95,
};

const DESKTOP_LAYOUT: FarmLayoutMetrics = {
  sceneSize: { width: 700, height: 500 },
  plotIslandSize: 200,
  xOffset: 110,
};

const PLOT_Y_RATIOS = [0.12, 0.26, 0.26, 0.42, 0.58, 0.58, 0.74] as const;
const PLOT_X_DIRECTIONS = [0, 1, -1, 0, 1, -1, 0] as const;

function getViewportWidth(): number {
  if (typeof window === 'undefined') {
    return DESKTOP_LAYOUT.sceneSize.width;
  }
  return window.innerWidth;
}

function getLayoutMetrics(viewportWidth: number): FarmLayoutMetrics {
  if (viewportWidth < MOBILE_BREAKPOINT) {
    return MOBILE_LAYOUT;
  }
  if (viewportWidth < TABLET_BREAKPOINT) {
    return TABLET_LAYOUT;
  }
  return DESKTOP_LAYOUT;
}

function getPlotPositions(layout: FarmLayoutMetrics): PlotPosition[] {
  const centerX = layout.sceneSize.width / 2;
  return PLOT_Y_RATIOS.map((yRatio, index) => ({
    x: centerX + (PLOT_X_DIRECTIONS[index] * layout.xOffset),
    y: layout.sceneSize.height * yRatio,
  }));
}

export function IsometricFarmGrid({
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
}: IsometricFarmGridProps) {
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

  const layout = useMemo(() => getLayoutMetrics(viewportWidth), [viewportWidth]);
  const plotPositions = useMemo(() => getPlotPositions(layout), [layout]);
  const plotCardInset = useMemo(
    () => Math.max(12, Math.round(layout.plotIslandSize * 0.14)),
    [layout.plotIslandSize],
  );

  return (
    <div className="relative w-full overflow-visible" onClick={() => onActiveTooltipChange(null)}>
      <div
        className="relative mx-auto origin-top"
        style={{
          width: layout.sceneSize.width,
          height: layout.sceneSize.height,
        }}
      >
        {plotPositions.map((position, index) => {
          const plot = plots[index];
          const plotShellStyle = {
            left: position.x,
            top: position.y,
            width: layout.plotIslandSize,
            height: layout.plotIslandSize,
            transform: 'translate(-50%, -50%)',
            zIndex: Math.round(position.y * 10),
          };

          if (!plot) {
            return (
              <div
                key={`missing-plot-${index}`}
                className="absolute rounded-xl border-[3px] border-[#A0643D] bg-[#C4956A]"
                style={plotShellStyle}
              >
                <div
                  className="absolute z-20 flex items-center justify-center rounded-xl border-2 border-dashed"
                  style={{
                    inset: plotCardInset,
                    borderColor: `${theme.border}cc`,
                    backgroundColor: `${theme.surface}dd`,
                  }}
                >
                  <span className="text-xs font-medium" style={{ color: theme.textMuted }}>
                    {t.collectionLocked}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={`plot-isometric-${plot.id}`}
              className="absolute rounded-xl border-[3px] border-[#A0643D] bg-[#C4956A]"
              style={plotShellStyle}
            >
              <div className="absolute z-20" style={{ inset: plotCardInset }}>
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
