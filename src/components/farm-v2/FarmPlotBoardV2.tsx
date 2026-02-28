import { useMemo } from 'react';
import type { Plot } from '../../types/farm';
import { FarmPlotTileV2, mapPlotStateToTileState } from './FarmPlotTileV2';

interface FarmPlotBoardV2Props {
  plots: Plot[];
  compactMode?: boolean;
}

const GRID_SIDE = 3;
const TOTAL_PLOTS = GRID_SIDE * GRID_SIDE;

function FarmHudV2({ compactMode }: { compactMode: boolean }) {
  const badgeItems = [
    { icon: '🏅', label: compactMode ? 'Lv12' : 'Level 12' },
    { icon: '🪙', label: '1,580' },
    { icon: '💎', label: '75' },
    { icon: '❤️', label: compactMode ? '4' : 'Life 4' },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-40 px-2 sm:px-4">
      <div className="mx-auto flex w-full max-w-[640px] items-center justify-center gap-1.5 sm:gap-2">
        {badgeItems.map((badge) => (
          <div
            key={`farm-v2-hud-${badge.label}`}
            className="flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs"
            style={{
              borderColor: '#b17d49',
              color: '#5d3a1f',
              background: 'linear-gradient(180deg, rgba(255,243,214,0.95) 0%, rgba(245,222,181,0.92) 100%)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.45) inset, 0 1px 3px rgba(76,45,21,0.18)',
            }}
          >
            <span>{badge.icon}</span>
            <span>{badge.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FarmBottomBarV2({ compactMode }: { compactMode: boolean }) {
  const toolButtons = [
    { icon: '💧', label: 'Water' },
    { icon: '🌱', label: 'Seed' },
    { icon: '🧤', label: 'Care' },
    { icon: '🧺', label: 'Bag' },
  ];
  const navButtons = ['Shop', 'Bag', 'Tasks', 'Social'];

  return (
    <div className="absolute inset-x-0 bottom-0 z-40 px-2 pb-2 sm:px-4 sm:pb-3">
      <div
        className="mx-auto overflow-hidden rounded-[14px] border-[2px]"
        style={{
          width: compactMode ? 'min(96vw, 420px)' : 'min(72vw, 620px)',
          borderColor: '#8c5833',
          background: 'linear-gradient(180deg, #d48a57 0%, #b96f3d 100%)',
          boxShadow: '0 -1px 0 rgba(255,255,255,0.35) inset, 0 4px 16px rgba(47,27,12,0.28)',
        }}
      >
        <div
          className="flex items-center justify-center gap-1.5 px-2 py-2 sm:gap-2"
          style={{
            borderBottom: '2px solid rgba(126,74,42,0.75)',
            background: 'linear-gradient(180deg, rgba(248,205,152,0.62) 0%, rgba(223,158,106,0.44) 100%)',
          }}
        >
          {toolButtons.map((button) => (
            <div
              key={`farm-v2-tool-${button.label}`}
              className="grid h-9 w-9 place-items-center rounded-[10px] border text-xs sm:h-10 sm:w-10"
              style={{
                borderColor: '#9b6037',
                color: '#5a361a',
                background: 'linear-gradient(180deg, #f7e4ba 0%, #ebc98f 100%)',
              }}
            >
              <span>{button.icon}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1 px-1.5 py-1.5">
          {navButtons.map((label, index) => (
            <div
              key={`farm-v2-nav-${label}`}
              className="rounded-[8px] border px-1 py-1 text-center text-[10px] font-semibold sm:text-xs"
              style={{
                borderColor: '#8f5732',
                color: index === 0 ? '#5d3117' : '#6f4829',
                background: index === 0
                  ? 'linear-gradient(180deg, #f6dd94 0%, #efbf5a 100%)'
                  : 'linear-gradient(180deg, #f0c98f 0%, #dca266 100%)',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FarmBackdropV2({ compactMode }: { compactMode: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute -top-4 left-[6%] h-9 w-20 rounded-full bg-white/55 blur-[0.4px]" />
      <div className="absolute top-4 left-[13%] h-7 w-16 rounded-full bg-white/75" />
      <div className="absolute top-6 right-[10%] h-8 w-20 rounded-full bg-white/70" />
      <div className="absolute top-2 right-[16%] h-6 w-14 rounded-full bg-white/50" />

      <div
        className="absolute inset-x-0"
        style={{
          top: compactMode ? '36%' : '33%',
          height: compactMode ? '20%' : '18%',
          background: 'linear-gradient(180deg, rgba(180,217,146,0.52) 0%, rgba(137,195,102,0.44) 100%)',
        }}
      />
      <div
        className="absolute inset-x-0"
        style={{
          top: compactMode ? '42%' : '39%',
          height: compactMode ? '58%' : '61%',
          background: 'linear-gradient(180deg, rgba(151,204,111,0.22) 0%, rgba(126,188,84,0.42) 100%)',
        }}
      />
    </div>
  );
}

function FarmBoardSceneDecorV2({ compactMode }: { compactMode: boolean }) {
  return (
    <>
      <div
        className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2"
        style={{
          top: compactMode ? '-40px' : '-48px',
          width: compactMode ? 'calc(100% + 26px)' : 'calc(100% + 96px)',
        }}
      >
        <div
          className="relative h-8 rounded-[16px] border-2"
          style={{
            borderColor: '#8e5936',
            background: 'linear-gradient(180deg, #dca26a 0%, #be7948 100%)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.3) inset',
          }}
        >
          <div
            className="absolute inset-x-3 bottom-[6px] h-[10px]"
            style={{
              background:
                'repeating-linear-gradient(90deg, rgba(123,72,43,0.88) 0px, rgba(123,72,43,0.88) 6px, rgba(0,0,0,0) 6px, rgba(0,0,0,0) 18px)',
            }}
          />
        </div>
      </div>

      <div
        className="pointer-events-none absolute z-0 rounded-[12px] border-2"
        style={{
          top: compactMode ? '-34px' : '-44px',
          left: compactMode ? '-12px' : '-44px',
          width: compactMode ? '52px' : '72px',
          height: compactMode ? '40px' : '54px',
          borderColor: '#8c5a38',
          background: 'linear-gradient(180deg, #f2d29a 0%, #d8a668 100%)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.35) inset',
        }}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: compactMode ? '-17px' : '-22px',
            width: compactMode ? '38px' : '50px',
            height: compactMode ? '20px' : '26px',
            clipPath: 'polygon(0% 100%, 50% 0%, 100% 100%)',
            background: 'linear-gradient(180deg, #cc7950 0%, #a54d2d 100%)',
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute z-0"
        style={{
          top: compactMode ? '-48px' : '-62px',
          right: compactMode ? '-14px' : '-40px',
          width: compactMode ? '58px' : '74px',
          height: compactMode ? '58px' : '74px',
        }}
      >
        <div
          className="absolute bottom-0 left-1/2 h-5 w-2 -translate-x-1/2 rounded-full"
          style={{ backgroundColor: '#7c5635' }}
        />
        <div className="absolute left-0 top-0 h-8 w-8 rounded-full bg-[#85c364]" />
        <div className="absolute right-0 top-1 h-8 w-8 rounded-full bg-[#78b856]" />
        <div className="absolute left-[14px] top-[15px] h-9 w-9 rounded-full bg-[#69a54a]" />
      </div>

      <div
        className="pointer-events-none absolute left-1/2 z-10 h-10 -translate-x-1/2 rounded-[999px]"
        style={{
          bottom: compactMode ? '-18px' : '-20px',
          width: compactMode ? 'calc(100% + 40px)' : 'calc(100% + 120px)',
          background: 'radial-gradient(circle at center, rgba(88,128,54,0.58) 0%, rgba(88,128,54,0.2) 56%, rgba(88,128,54,0) 100%)',
        }}
      />
    </>
  );
}

export function FarmPlotBoardV2({ plots, compactMode = false }: FarmPlotBoardV2Props) {
  const displaySlots = useMemo(
    () => Array.from({ length: TOTAL_PLOTS }, (_, index) => plots[index] ?? null),
    [plots],
  );

  const boardWidth = compactMode
    ? 'min(96vw, calc(100dvh - 286px), 420px)'
    : 'min(58vw, 520px)';
  const boardGap = compactMode ? 'clamp(6px, 1vw, 9px)' : 'clamp(8px, 0.9vw, 12px)';

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        minHeight: compactMode ? '100dvh' : 'min(100dvh, 760px)',
        background: 'linear-gradient(180deg, #9bd8f6 0%, #a5e8ff 34%, #9ed07a 74%, #8bbd67 100%)',
      }}
    >
      <FarmBackdropV2 compactMode={compactMode} />
      <FarmHudV2 compactMode={compactMode} />

      <div
        className="relative z-20 mx-auto flex w-full justify-center px-2 sm:px-4"
        style={{
          paddingTop: compactMode ? 'clamp(186px, 35vh, 226px)' : 'clamp(134px, 22vh, 190px)',
          paddingBottom: compactMode ? 'clamp(102px, 14vh, 126px)' : 'clamp(122px, 16vh, 152px)',
        }}
      >
        <div className="relative" style={{ width: boardWidth }}>
          <FarmBoardSceneDecorV2 compactMode={compactMode} />
          <div
            className="relative z-20 grid grid-cols-3"
            data-testid="farm-plot-board-v2"
            style={{
              width: '100%',
              gap: boardGap,
              filter: 'drop-shadow(0 10px 12px rgba(46,72,27,0.24))',
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

      <FarmBottomBarV2 compactMode={compactMode} />
    </div>
  );
}
