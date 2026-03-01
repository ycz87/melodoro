import { useMemo } from 'react';
import type { Plot } from '../../types/farm';
import { FarmPlotTileV2, mapPlotStateToTileState } from './FarmPlotTileV2';

interface FarmPlotBoardV2Props {
  plots: Plot[];
  compactMode?: boolean;
}

const GRID_SIDE = 3;
const TOTAL_PLOTS = GRID_SIDE * GRID_SIDE;
const MOTION_CLASS = 'farm-v2-motion';

function FarmHudV2({ compactMode }: { compactMode: boolean }) {
  const badgeItems = [
    { icon: '🏅', label: compactMode ? 'Lv12' : 'Level 12' },
    { icon: '🪙', label: '1,580' },
    { icon: '💎', label: '75' },
    { icon: '❤️', label: compactMode ? '4' : 'Life 4' },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40">
      <div
        className="mx-auto flex h-10 w-full items-center justify-center gap-1.5 px-2 sm:h-11 sm:gap-2 sm:px-4"
        style={{
          maxWidth: compactMode ? '100%' : '920px',
          borderBottom: '1px solid rgba(103,146,177,0.2)',
          background: 'linear-gradient(180deg, rgba(171,220,244,0.42) 0%, rgba(171,220,244,0.08) 100%)',
        }}
      >
        {badgeItems.map((badge) => (
          <div
            key={`farm-v2-hud-${badge.label}`}
            className="flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px] font-semibold sm:px-3 sm:text-xs"
            style={{
              borderColor: '#b17d49',
              color: '#5d3a1f',
              background: 'linear-gradient(180deg, rgba(255,244,216,0.94) 0%, rgba(247,226,188,0.9) 100%)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.34) inset',
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
          borderColor: '#8f5a34',
          background: 'linear-gradient(180deg, #d89c67 0%, #c07845 100%)',
          boxShadow: '0 -1px 0 rgba(255,255,255,0.24) inset, 0 3px 12px rgba(47,27,12,0.2)',
        }}
      >
        <div
          className="flex items-center justify-center gap-1.5 px-2 py-2 sm:gap-2"
          style={{
            borderBottom: '2px solid rgba(126,74,42,0.58)',
            background: 'linear-gradient(180deg, rgba(247,209,156,0.46) 0%, rgba(221,155,101,0.3) 100%)',
          }}
        >
          {toolButtons.map((button) => (
            <div
              key={`farm-v2-tool-${button.label}`}
              className="grid h-9 w-9 place-items-center rounded-[10px] border text-xs sm:h-10 sm:w-10"
              style={{
                borderColor: '#9b6037',
                color: '#5a361a',
                background: 'linear-gradient(180deg, #f7e8c4 0%, #edd2a2 100%)',
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
                  ? 'linear-gradient(180deg, #f7df99 0%, #f0c46a 100%)'
                  : 'linear-gradient(180deg, #f0ce9f 0%, #dfae75 100%)',
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

function CloudCluster({
  top,
  left,
  right,
  width,
  height,
  opacity,
  duration,
  delay,
}: {
  top: string;
  left?: string;
  right?: string;
  width: string;
  height: string;
  opacity: number;
  duration: string;
  delay: string;
}) {
  return (
    <div
      className={`absolute z-[8] ${MOTION_CLASS}`}
      style={{
        top,
        left,
        right,
        width,
        height,
        opacity,
        animation: `farmV2CloudDrift ${duration} ease-in-out ${delay} infinite`,
      }}
    >
      <div className="absolute inset-x-[8%] bottom-[6%] top-[32%] rounded-full bg-white/68" />
      <div className="absolute left-[2%] top-[30%] h-[48%] w-[38%] rounded-full bg-white/76" />
      <div className="absolute right-[4%] top-[16%] h-[56%] w-[46%] rounded-full bg-white/78" />
      <div className="absolute left-[32%] top-[2%] h-[54%] w-[40%] rounded-full bg-white/82" />
    </div>
  );
}

function FarmBackdropV2({ compactMode }: { compactMode: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 z-[1]"
        style={{
          height: compactMode ? '62%' : '58%',
          background: 'linear-gradient(180deg, #88cef2 0%, #a6e1f7 52%, #c7edf8 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 z-[1]"
        style={{
          height: compactMode ? '52%' : '54%',
          background: 'linear-gradient(180deg, #afe39f 0%, #99d477 42%, #89c760 100%)',
        }}
      />

      <div
        className={`absolute z-[6] rounded-full ${MOTION_CLASS}`}
        style={{
          top: compactMode ? '7.8%' : '7%',
          right: compactMode ? '11%' : '13%',
          width: compactMode ? '78px' : '96px',
          height: compactMode ? '78px' : '96px',
          background: 'radial-gradient(circle at 50% 50%, rgba(255,243,178,0.2) 0%, rgba(255,209,106,0.34) 48%, rgba(255,179,80,0) 100%)',
          animation: 'farmV2SunHalo 5.6s ease-in-out -0.8s infinite',
        }}
      />
      <div
        className={`absolute z-[7] rounded-full ${MOTION_CLASS}`}
        style={{
          top: compactMode ? '9.6%' : '8.8%',
          right: compactMode ? '13.2%' : '14.8%',
          width: compactMode ? '44px' : '54px',
          height: compactMode ? '44px' : '54px',
          background: 'radial-gradient(circle at 35% 30%, #fff2b0 0%, #ffd56f 60%, #f0a640 100%)',
          boxShadow: '0 0 0 2px rgba(255,215,124,0.34), 0 0 22px rgba(255,202,94,0.46)',
          animation: 'farmV2SunFloat 7.8s ease-in-out -1.2s infinite',
        }}
      />

      <CloudCluster top="6%" left="7%" width="22%" height="11%" opacity={0.88} duration="13s" delay="-0.8s" />
      <CloudCluster top="11%" left="31%" width="20%" height="10%" opacity={0.82} duration="16s" delay="-2.4s" />
      <CloudCluster top="8%" right="7%" width="24%" height="12%" opacity={0.86} duration="14s" delay="-1.8s" />

      <div
        className="absolute inset-x-0 z-[3]"
        style={{
          top: compactMode ? '23%' : '21%',
          height: compactMode ? '23%' : '20%',
          background:
            'linear-gradient(180deg, rgba(170,221,188,0.16) 0%, rgba(154,204,136,0.42) 100%), radial-gradient(circle at 17% 88%, rgba(117,171,87,0.54) 0%, rgba(0,0,0,0) 52%), radial-gradient(circle at 83% 86%, rgba(107,162,79,0.52) 0%, rgba(0,0,0,0) 52%)',
        }}
      />
      <div
        className="absolute z-[4] rounded-full"
        style={{
          left: compactMode ? '-4%' : '2%',
          top: compactMode ? '28%' : '26%',
          width: compactMode ? '48%' : '34%',
          height: compactMode ? '17%' : '14%',
          background: 'radial-gradient(circle at 55% 50%, rgba(153,194,116,0.62) 0%, rgba(110,159,82,0.78) 100%)',
        }}
      />
      <div
        className="absolute z-[4] rounded-full"
        style={{
          right: compactMode ? '-5%' : '4%',
          top: compactMode ? '29%' : '27%',
          width: compactMode ? '44%' : '30%',
          height: compactMode ? '16%' : '13%',
          background: 'radial-gradient(circle at 45% 50%, rgba(155,199,118,0.6) 0%, rgba(113,162,80,0.78) 100%)',
        }}
      />

      <div
        className="absolute z-[5]"
        style={{
          top: compactMode ? '31.2%' : '28.8%',
          left: '50%',
          width: compactMode ? '48%' : '34%',
          height: compactMode ? '18%' : '16%',
          transform: 'translateX(-50%)',
          clipPath: 'polygon(45% 0%, 55% 0%, 81% 100%, 19% 100%)',
          background: 'linear-gradient(180deg, rgba(230,202,141,0.78) 0%, rgba(191,145,96,0.78) 100%)',
        }}
      />

      <div
        className="absolute left-[7%] right-[7%] z-[6] rounded-full"
        style={{
          top: compactMode ? '43.6%' : '40.3%',
          height: compactMode ? '14px' : '16px',
          background: 'linear-gradient(180deg, rgba(207,149,99,0.46) 0%, rgba(167,111,68,0.52) 100%)',
        }}
      />
      <div
        className="absolute left-[8%] right-[8%] z-[7]"
        style={{
          top: compactMode ? '44.3%' : '41.2%',
          height: compactMode ? '6px' : '7px',
          opacity: 0.62,
          background:
            'repeating-linear-gradient(90deg, rgba(126,73,41,0.84) 0px, rgba(126,73,41,0.84) 5px, rgba(0,0,0,0) 5px, rgba(0,0,0,0) 14px)',
        }}
      />

      <div
        className="absolute z-[7] rounded-[12px]"
        style={{
          top: compactMode ? '37.3%' : '34.6%',
          left: '6%',
          width: compactMode ? '48px' : '60px',
          height: compactMode ? '34px' : '42px',
          opacity: 0.78,
          background: 'linear-gradient(180deg, rgba(212,155,104,0.66) 0%, rgba(188,121,75,0.75) 100%)',
          border: '1px solid rgba(136,84,51,0.62)',
        }}
      />
      <div
        className="absolute z-[7] rounded-full"
        style={{
          top: compactMode ? '35.2%' : '31.8%',
          right: '7%',
          width: compactMode ? '70px' : '84px',
          height: compactMode ? '58px' : '68px',
          opacity: 0.76,
          background: 'radial-gradient(circle at 40% 45%, rgba(125,194,88,0.86) 0%, rgba(87,150,63,0.94) 100%)',
        }}
      />

      <div
        className="absolute inset-x-0 z-[2]"
        style={{
          top: compactMode ? '46%' : '42.8%',
          height: compactMode ? '25%' : '23%',
          background: 'linear-gradient(180deg, rgba(182,223,156,0.5) 0%, rgba(141,199,104,0.44) 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 z-[2]"
        style={{
          top: compactMode ? '57%' : '53%',
          height: compactMode ? '43%' : '47%',
          background:
            'linear-gradient(180deg, rgba(158,212,119,0.3) 0%, rgba(131,194,86,0.5) 100%), repeating-linear-gradient(0deg, rgba(123,182,78,0.08) 0px, rgba(123,182,78,0.08) 22px, rgba(0,0,0,0) 22px, rgba(0,0,0,0) 56px)',
        }}
      />
    </div>
  );
}

function FarmBoardSceneDecorV2({ compactMode }: { compactMode: boolean }) {
  return (
    <>
      <div
        className="pointer-events-none absolute z-0 rounded-[12px] border"
        style={{
          top: compactMode ? '10px' : '2px',
          left: compactMode ? '-10px' : '-32px',
          width: compactMode ? '50px' : '62px',
          height: compactMode ? '36px' : '42px',
          opacity: 0.72,
          borderColor: 'rgba(131,81,48,0.62)',
          background: 'linear-gradient(180deg, rgba(243,211,158,0.72) 0%, rgba(206,149,99,0.78) 100%)',
        }}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: compactMode ? '-15px' : '-18px',
            width: compactMode ? '34px' : '42px',
            height: compactMode ? '18px' : '22px',
            clipPath: 'polygon(0% 100%, 50% 0%, 100% 100%)',
            background: 'linear-gradient(180deg, rgba(204,121,80,0.85) 0%, rgba(165,77,45,0.88) 100%)',
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute z-0"
        style={{
          top: compactMode ? '-8px' : '-12px',
          right: compactMode ? '-10px' : '-30px',
          width: compactMode ? '56px' : '66px',
          height: compactMode ? '56px' : '66px',
          opacity: 0.78,
        }}
      >
        <div
          className="absolute bottom-0 left-1/2 h-4 w-2 -translate-x-1/2 rounded-full"
          style={{ backgroundColor: '#7c5635' }}
        />
        <div className="absolute left-0 top-2 h-7 w-7 rounded-full bg-[#85c364]" />
        <div className="absolute right-0 top-3 h-7 w-7 rounded-full bg-[#78b856]" />
        <div className="absolute left-[12px] top-[18px] h-8 w-8 rounded-full bg-[#69a54a]" />
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
    ? 'min(100vw, calc(100dvh - 260px), 446px)'
    : 'min(91vw, 840px)';
  const boardGap = compactMode ? 'clamp(6px, 1vw, 9px)' : 'clamp(8px, 0.8vw, 11px)';

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        minHeight: compactMode ? '100dvh' : 'min(100dvh, 760px)',
        isolation: 'isolate',
        background: 'linear-gradient(180deg, #8dd1f3 0%, #a8e3f8 34%, #b2e8a5 56%, #99d376 78%, #8bc665 100%)',
      }}
    >
      <FarmBackdropV2 compactMode={compactMode} />
      <FarmHudV2 compactMode={compactMode} />

      <div
        className="relative z-20 mx-auto flex w-full justify-center px-0 sm:px-2"
        style={{
          paddingTop: compactMode ? 'clamp(146px, 30vh, 184px)' : 'clamp(94px, 15vh, 134px)',
          paddingBottom: compactMode ? 'clamp(100px, 14vh, 124px)' : 'clamp(100px, 12vh, 128px)',
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
