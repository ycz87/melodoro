import type { Plot } from '../../types/farm';

export type FarmPlotTileState = 'empty' | 'growing' | 'mature';

interface FarmPlotTileV2Props {
  state: FarmPlotTileState;
}

function Sprout() {
  return (
    <span className="relative block h-5 w-5">
      <span
        className="absolute left-1/2 bottom-[1px] h-[7px] w-[2px] -translate-x-1/2 rounded-full"
        style={{ backgroundColor: '#5a9b47' }}
      />
      <span
        className="absolute left-[4px] top-[6px] h-[7px] w-[5px] -rotate-[24deg] rounded-[100%_0_100%_0]"
        style={{
          background: 'linear-gradient(160deg, #8cd268 0%, #58a646 100%)',
          border: '1px solid rgba(73,126,56,0.74)',
        }}
      />
      <span
        className="absolute right-[4px] top-[6px] h-[7px] w-[5px] rotate-[24deg] rounded-[0_100%_0_100%]"
        style={{
          background: 'linear-gradient(200deg, #8cd268 0%, #58a646 100%)',
          border: '1px solid rgba(73,126,56,0.74)',
        }}
      />
    </span>
  );
}

function Melon({ x, y }: { x: string; y: string }) {
  return (
    <span
      className="absolute block rounded-full"
      style={{
        left: x,
        top: y,
        width: '24%',
        height: '24%',
        background: 'radial-gradient(circle at 32% 28%, #96dc77 0%, #4eac42 42%, #2d7b2e 100%)',
        border: '2px solid #2d6f2a',
        boxShadow: '0 2px 2px rgba(0,0,0,0.22)',
      }}
    >
      <span
        className="absolute inset-[18%] rounded-full opacity-52"
        style={{
          background:
            'repeating-linear-gradient(90deg, rgba(31,95,38,0.9) 0px, rgba(31,95,38,0.9) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 6px)',
        }}
      />
    </span>
  );
}

export function FarmPlotTileV2({ state }: FarmPlotTileV2Props) {
  return (
    <div
      className="relative overflow-hidden rounded-[14px] border-[2.5px]"
      data-state={state}
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        borderColor: '#7f4b2f',
        background: 'linear-gradient(160deg, #9b603c 0%, #77472f 100%)',
        boxShadow: '0 2px 0 rgba(66,40,27,0.32)',
      }}
    >
      <div
        className="absolute inset-[7px] rounded-[10px] border-2"
        style={{
          borderColor: '#5f3624',
          backgroundColor: '#7a4b33',
        }}
      >
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-[2px] p-[3px]">
          {Array.from({ length: 9 }).map((_, index) => (
            <span
              key={`farm-v2-cell-${state}-${index}`}
              className="relative grid place-items-center rounded-[3px]"
              style={{
                backgroundColor: '#6e402d',
                boxShadow: 'inset 0 1px 0 rgba(255,209,152,0.16)',
              }}
            >
              {state === 'growing' && <Sprout />}
            </span>
          ))}
        </div>
      </div>

      {state === 'mature' && (
        <div className="pointer-events-none absolute inset-[10px]">
          <Melon x="17%" y="17%" />
          <Melon x="58%" y="17%" />
          <Melon x="17%" y="58%" />
          <Melon x="58%" y="58%" />
        </div>
      )}
    </div>
  );
}

export function mapPlotStateToTileState(plot: Plot | null): FarmPlotTileState {
  if (plot?.state === 'mature') return 'mature';
  if (plot?.state === 'growing') return 'growing';
  return 'empty';
}
