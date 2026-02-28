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

  const boardWidth = compactMode ? 'min(99vw, calc(100dvh - 188px), 720px)' : 'min(82vw, 760px)';
  const boardGap = compactMode ? 'clamp(6px, 1vw, 10px)' : 'clamp(8px, 0.8vw, 12px)';
  const boardPaddingClass = compactMode
    ? 'pt-[204px] pb-0 sm:pt-28 sm:pb-3'
    : 'pt-12 pb-10 sm:pt-14 sm:pb-12';

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        minHeight: compactMode ? '100dvh' : 'min(100dvh, 760px)',
        background: 'linear-gradient(180deg, #9bd8f6 0%, #a5e8ff 34%, #9ed07a 74%, #8bbd67 100%)',
      }}
    >
      <div className={`mx-auto flex w-full justify-center px-3 sm:px-4 ${boardPaddingClass}`}>
        <div
          className="grid grid-cols-3"
          data-testid="farm-plot-board-v2"
          style={{
            width: boardWidth,
            gap: boardGap,
          }}
        >
          {displaySlots.map((plot, index) => (
            <div key={`farm-v2-slot-${plot?.id ?? index}`}>
              <FarmPlotTileV2 state={mapPlotStateToTileState(plot)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
