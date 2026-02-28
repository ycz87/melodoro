import { useMemo } from 'react';
import type { Plot } from '../../types/farm';
import { FarmPlotTileV2, mapPlotStateToTileState } from './FarmPlotTileV2';

interface FarmPlotBoardV2Props {
  plots: Plot[];
  compactMode?: boolean;
}

const GRID_SIDE = 3;
const TOTAL_PLOTS = GRID_SIDE * GRID_SIDE;

export function FarmPlotBoardV2({ plots, compactMode = false }: FarmPlotBoardV2Props) {
  const displaySlots = useMemo(
    () => Array.from({ length: TOTAL_PLOTS }, (_, index) => plots[index] ?? null),
    [plots],
  );

  const tileSize = compactMode ? 'min(26vw, 120px)' : 'min(23vw, 132px)';
  const boardGap = compactMode ? 10 : 12;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        minHeight: compactMode ? '100dvh' : 'auto',
        background: 'linear-gradient(180deg, #9bd8f6 0%, #a5e8ff 32%, #9ed07a 74%, #8bbd67 100%)',
      }}
    >
      <div className="mx-auto w-full px-3 pb-24 pt-6 sm:px-4 sm:pb-8">
        <div
          className="mx-auto grid grid-cols-3"
          data-testid="farm-plot-board-v2"
          style={{
            width: `calc(${tileSize} * 3 + ${boardGap * 2}px)`,
            gap: `${boardGap}px`,
          }}
        >
          {displaySlots.map((plot, index) => (
            <div
              key={`farm-v2-slot-${plot?.id ?? index}`}
              style={{ width: tileSize }}
            >
              <FarmPlotTileV2 state={mapPlotStateToTileState(plot)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
