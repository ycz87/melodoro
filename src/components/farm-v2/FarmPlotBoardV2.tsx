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

  const boardWidth = compactMode ? 'min(88vw, 360px)' : 'min(70vw, 560px)';
  const boardGap = compactMode ? 8 : 10;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        minHeight: compactMode ? '100dvh' : 'min(100dvh, 740px)',
        background: 'linear-gradient(180deg, #9bd8f6 0%, #a5e8ff 34%, #9ed07a 74%, #8bbd67 100%)',
      }}
    >
      <div
        className="mx-auto flex w-full justify-center px-3 sm:px-4"
        style={{
          paddingTop: compactMode ? 'clamp(18px, 8vh, 72px)' : 'clamp(20px, 6vh, 64px)',
          paddingBottom: compactMode ? 'clamp(72px, 18vh, 160px)' : 'clamp(32px, 10vh, 110px)',
        }}
      >
        <div
          className="grid grid-cols-3"
          data-testid="farm-plot-board-v2"
          style={{
            width: boardWidth,
            gap: `${boardGap}px`,
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
