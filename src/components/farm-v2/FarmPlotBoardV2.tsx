import { useMemo } from 'react';
import type { Plot } from '../../types/farm';
import { FarmPlotTileV2, mapPlotStateToTileState } from './FarmPlotTileV2';

interface FarmPlotBoardV2Props {
  plots: Plot[];
  compactMode?: boolean;
  todayFocusMinutes: number;
  coinBalance: number;
  plantableSeedCount: number;
  harvestablePlotCount: number;
  onPlotClick?: (plotId: number, state: 'empty' | 'growing' | 'mature') => void;
}

const GRID_SIDE = 3;
const TOTAL_PLOTS = GRID_SIDE * GRID_SIDE;
const MOTION_CLASS = 'farm-v2-motion';

function FarmHudV2({
  compactMode,
  todayFocusMinutes,
  coinBalance,
  plantableSeedCount,
  harvestablePlotCount,
}: {
  compactMode: boolean;
  todayFocusMinutes: number;
  coinBalance: number;
  plantableSeedCount: number;
  harvestablePlotCount: number;
}) {
  const badgeItems = [
    { icon: '⏱', label: `今日专注 ${todayFocusMinutes}m` },
    { icon: '🪙', label: `瓜币 ${coinBalance.toLocaleString()}` },
    { icon: '🌱', label: `可种 ${plantableSeedCount}` },
    { icon: '🍉', label: `可收 ${harvestablePlotCount}` },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40">
      <div
        className="mx-auto flex h-10 w-full items-center justify-center gap-1.5 px-2 sm:h-11 sm:gap-2 sm:px-4"
        style={{
          maxWidth: compactMode ? '100%' : '940px',
          borderBottom: '1px solid rgba(100,145,175,0.22)',
          background: 'linear-gradient(180deg, rgba(167,217,242,0.42) 0%, rgba(167,217,242,0.08) 100%)',
        }}
      >
        {badgeItems.map((badge) => (
          <div
            key={`farm-v2-hud-${badge.label}`}
            className="flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px] font-semibold sm:px-3 sm:text-xs"
            style={{
              borderColor: '#b57d4a',
              color: '#5d3a1f',
              background: 'linear-gradient(180deg, rgba(255,244,216,0.95) 0%, rgba(247,226,188,0.9) 100%)',
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
      <div className="absolute inset-x-[8%] bottom-[6%] top-[32%] rounded-full bg-white/70" />
      <div className="absolute left-[2%] top-[30%] h-[48%] w-[38%] rounded-full bg-white/78" />
      <div className="absolute right-[4%] top-[16%] h-[56%] w-[46%] rounded-full bg-white/82" />
      <div className="absolute left-[32%] top-[2%] h-[54%] w-[40%] rounded-full bg-white/84" />
    </div>
  );
}

function FruitTree({
  left,
  right,
  top,
  scale = 1,
  testId,
}: {
  left?: string;
  right?: string;
  top: string;
  scale?: number;
  testId?: string;
}) {
  const wrapperStyle = {
    left,
    right,
    top,
    width: `${62 * scale}px`,
    height: `${70 * scale}px`,
  };

  return (
    <div className="absolute z-[7]" data-testid={testId} style={wrapperStyle}>
      <div
        className="absolute left-1/2 bottom-[2px] -translate-x-1/2 rounded-full"
        style={{
          width: `${26 * scale}px`,
          height: `${6 * scale}px`,
          background: 'radial-gradient(circle at center, rgba(92,133,64,0.58) 0%, rgba(92,133,64,0.2) 60%, rgba(0,0,0,0) 100%)',
        }}
      />
      <div
        className="absolute left-1/2 bottom-0 -translate-x-1/2 rounded-full"
        style={{
          width: `${8 * scale}px`,
          height: `${28 * scale}px`,
          background: 'linear-gradient(180deg, #93613e 0%, #74482d 100%)',
        }}
      />
      <div
        className="absolute left-[8%] top-[16%] rounded-full"
        style={{
          width: `${30 * scale}px`,
          height: `${26 * scale}px`,
          background: 'radial-gradient(circle at 35% 30%, #98d26e 0%, #72b84f 100%)',
        }}
      />
      <div
        className="absolute right-[8%] top-[18%] rounded-full"
        style={{
          width: `${28 * scale}px`,
          height: `${24 * scale}px`,
          background: 'radial-gradient(circle at 30% 30%, #93cd67 0%, #6ab148 100%)',
        }}
      />
      <div
        className="absolute left-[26%] top-0 rounded-full"
        style={{
          width: `${30 * scale}px`,
          height: `${26 * scale}px`,
          background: 'radial-gradient(circle at 40% 30%, #9bda70 0%, #74bd52 100%)',
        }}
      />
      <div
        className="absolute"
        style={{ left: `${13 * scale}px`, top: `${18 * scale}px`, width: `${7 * scale}px`, height: `${7 * scale}px`, borderRadius: '999px', backgroundColor: '#ffbe55' }}
      />
      <div
        className="absolute"
        style={{ left: `${36 * scale}px`, top: `${12 * scale}px`, width: `${7 * scale}px`, height: `${7 * scale}px`, borderRadius: '999px', backgroundColor: '#ffbe55' }}
      />
      <div
        className="absolute"
        style={{ left: `${28 * scale}px`, top: `${28 * scale}px`, width: `${7 * scale}px`, height: `${7 * scale}px`, borderRadius: '999px', backgroundColor: '#ffbe55' }}
      />
    </div>
  );
}

function Cottage({ left, top }: { left: string; top: string }) {
  return (
    <div className="absolute z-[7]" data-testid="farm-v2-cottage" style={{ left, top, width: '58px', height: '54px' }}>
      <div
        className="absolute left-1/2 bottom-[1px] h-[7px] w-[28px] -translate-x-1/2 rounded-full"
        style={{
          background: 'radial-gradient(circle at center, rgba(97,136,67,0.58) 0%, rgba(97,136,67,0.2) 60%, rgba(0,0,0,0) 100%)',
        }}
      />
      <div
        className="absolute left-1/2 top-0 h-[20px] w-[40px] -translate-x-1/2"
        style={{
          clipPath: 'polygon(0% 100%, 50% 0%, 100% 100%)',
          background: 'linear-gradient(180deg, #cb7f53 0%, #a85f38 100%)',
        }}
      />
      <div
        className="absolute bottom-0 left-1/2 h-[34px] w-[44px] -translate-x-1/2 rounded-[7px]"
        style={{ background: 'linear-gradient(180deg, #efd6ae 0%, #ddb682 100%)', border: '1px solid rgba(135,86,54,0.55)' }}
      />
      <div className="absolute bottom-[2px] left-1/2 h-[16px] w-[10px] -translate-x-1/2 rounded-[4px] bg-[#9a663f]" />
      <div className="absolute left-[13px] top-[24px] h-[8px] w-[8px] rounded-[3px] bg-[#a8d8f7]" />
      <div className="absolute right-[13px] top-[24px] h-[8px] w-[8px] rounded-[3px] bg-[#a8d8f7]" />
    </div>
  );
}

function FarmBackdropV2({ compactMode }: { compactMode: boolean }) {
  const isNarrowScreen = typeof window !== 'undefined' && window.innerWidth < 640;
  const useCompactMobilePolish = isNarrowScreen && compactMode;
  const useTightBackdrop = isNarrowScreen && !compactMode;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Sky layer */}
      <div
        className="absolute inset-x-0 top-0 z-[1]"
        style={{
          height: compactMode
            ? useCompactMobilePolish
              ? '23.8%'
              : '28%'
            : useTightBackdrop
              ? '35%'
              : '27%',
          background: useTightBackdrop
            ? 'linear-gradient(180deg, #8ed3f5 0%, #b8e8fa 58%, #d1ebc7 100%)'
            : 'linear-gradient(180deg, #8ed3f5 0%, #b8e8fa 66%, #d9f4fb 100%)',
        }}
      />

      {/* Midground: continuous hill belt */}
      <div
        className="absolute inset-x-0 z-[2]"
        style={{
          top: compactMode
            ? useCompactMobilePolish
              ? '23.8%'
              : '28%'
            : useTightBackdrop
              ? '35%'
              : '27%',
          height: compactMode ? '16%' : '16%',
          background: 'linear-gradient(180deg, #d1ebc7 0%, #bbdea9 44%, #9fcc88 100%)',
        }}
      />

      <div
        className="absolute z-[4]"
        style={{
          left: compactMode ? '-8%' : '-6%',
          right: compactMode ? '-8%' : '-6%',
          top: compactMode
            ? useCompactMobilePolish
              ? '24.6%'
              : '28.8%'
            : useTightBackdrop
              ? '35.6%'
              : '28%',
          height: compactMode ? '17.6%' : '17.2%',
          borderRadius: '50% 50% 0 0 / 78% 78% 0 0',
          background: 'linear-gradient(180deg, rgba(151,198,115,0.9) 0%, rgba(116,171,86,0.94) 100%)',
        }}
      />
      <div
        className="absolute z-[5]"
        style={{
          left: compactMode ? '10%' : '13%',
          width: compactMode ? '76%' : '70%',
          top: compactMode
            ? useCompactMobilePolish
              ? '26.2%'
              : '30.2%'
            : useTightBackdrop
              ? '37%'
              : '29.5%',
          height: compactMode ? '13.6%' : '13.2%',
          borderRadius: '54% 46% 0 0 / 100% 100% 0 0',
          background: 'linear-gradient(180deg, rgba(171,212,132,0.86) 0%, rgba(126,182,94,0.88) 100%)',
        }}
      />

      {/* Grass field layer */}
      <div
        className="absolute inset-x-0 bottom-0 z-[1]"
        style={{
          top: compactMode
            ? useCompactMobilePolish
              ? '39.2%'
              : '44%'
            : useTightBackdrop
              ? '51%'
              : '43%',
          background: 'linear-gradient(180deg, #a8de90 0%, #95d06f 45%, #89c761 100%)',
        }}
      />

      <div
        className={`absolute z-[6] rounded-full ${MOTION_CLASS}`}
        style={{
          top: compactMode ? '5%' : '4.5%',
          right: compactMode ? '12%' : '14%',
          width: compactMode ? '84px' : '98px',
          height: compactMode ? '84px' : '98px',
          background: 'radial-gradient(circle at 50% 50%, rgba(255,243,178,0.2) 0%, rgba(255,209,106,0.34) 48%, rgba(255,179,80,0) 100%)',
          animation: 'farmV2SunHalo 5.6s ease-in-out -0.8s infinite',
        }}
      />
      <div
        className={`absolute z-[7] rounded-full ${MOTION_CLASS}`}
        style={{
          top: compactMode ? '7.2%' : '6.8%',
          right: compactMode ? '14.4%' : '16%',
          width: compactMode ? '46px' : '56px',
          height: compactMode ? '46px' : '56px',
          background: 'radial-gradient(circle at 35% 30%, #fff2b0 0%, #ffd56f 60%, #f0a640 100%)',
          boxShadow: '0 0 0 2px rgba(255,215,124,0.34), 0 0 22px rgba(255,202,94,0.46)',
          animation: 'farmV2SunFloat 7.8s ease-in-out -1.2s infinite',
        }}
      />

      <CloudCluster top="3%" left="6%" width="22%" height="10%" opacity={0.9} duration="13s" delay="-0.8s" />
      <CloudCluster top="8%" left="34%" width="20%" height="10%" opacity={0.84} duration="16s" delay="-2.4s" />
      <CloudCluster top="4%" right="6%" width="24%" height="11%" opacity={0.88} duration="14s" delay="-1.8s" />

      <div
        className="absolute z-[6]"
        style={{
          top: compactMode
            ? useCompactMobilePolish
              ? '26.4%'
              : '30.8%'
            : useTightBackdrop
              ? '38.2%'
              : '29.8%',
          left: '50%',
          width: compactMode ? '38%' : '28%',
          height: compactMode ? '11.5%' : '10.8%',
          transform: 'translateX(-50%)',
          clipPath: 'polygon(46% 0%, 54% 0%, 76% 100%, 24% 100%)',
          background: 'linear-gradient(180deg, rgba(232,207,148,0.78) 0%, rgba(193,149,100,0.82) 100%)',
        }}
      />

      <FruitTree
        left={compactMode ? '8.2%' : useTightBackdrop ? '8%' : '9.2%'}
        top={compactMode
          ? useCompactMobilePolish
            ? '26%'
            : '30.5%'
          : useTightBackdrop
            ? '38.2%'
            : '29.8%'}
        scale={compactMode ? 0.84 : useTightBackdrop ? 0.9 : 0.94}
        testId="farm-v2-tree-left"
      />
      <Cottage
        left={compactMode ? '18%' : useTightBackdrop ? '20%' : '23.5%'}
        top={compactMode
          ? useCompactMobilePolish
            ? '26.7%'
            : '31%'
          : useTightBackdrop
            ? '38.6%'
            : '30.2%'}
      />
      <FruitTree
        right={compactMode ? '7.8%' : useTightBackdrop ? '7.2%' : '8.8%'}
        top={compactMode
          ? useCompactMobilePolish
            ? '26.1%'
            : '30.6%'
          : useTightBackdrop
            ? '38.3%'
            : '29.9%'}
        scale={compactMode ? 0.86 : useTightBackdrop ? 0.92 : 0.98}
        testId="farm-v2-tree-right"
      />

      {/* Clear fence: posts + 2 rails */}
      <div
        className="absolute left-[7%] right-[7%] z-[8]"
        style={{
          top: compactMode
            ? useCompactMobilePolish
              ? '35.6%'
              : '39.3%'
            : useTightBackdrop
              ? '47.8%'
              : '38.2%',
          height: compactMode ? '14px' : '15px',
        }}
      >
        <div
          className="absolute left-0 right-0 top-[1px] h-[3px] rounded-full"
          style={{ backgroundColor: 'rgba(128,73,43,0.9)' }}
        />
        <div
          className="absolute left-0 right-0 top-[7px] h-[3px] rounded-full"
          style={{ backgroundColor: 'rgba(128,73,43,0.9)' }}
        />
        <div
          className="absolute left-0 right-0 top-0 h-full"
          style={{
            opacity: 0.74,
            background:
              'repeating-linear-gradient(90deg, rgba(122,69,40,0.9) 0px, rgba(122,69,40,0.9) 3px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 12px)',
          }}
        />
      </div>

      <div
        className="absolute inset-x-0 z-[2]"
        style={{
          top: compactMode
            ? useCompactMobilePolish
              ? '51.8%'
              : '56%'
            : useTightBackdrop
              ? '62%'
              : '54%',
          height: compactMode ? '44%' : '46%',
          background:
            'linear-gradient(180deg, rgba(161,215,124,0.34) 0%, rgba(130,194,86,0.54) 100%), repeating-linear-gradient(0deg, rgba(123,182,78,0.08) 0px, rgba(123,182,78,0.08) 22px, rgba(0,0,0,0) 22px, rgba(0,0,0,0) 56px)',
        }}
      />
    </div>
  );
}

function FarmBoardSceneDecorV2({ compactMode }: { compactMode: boolean }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 z-10 h-10 -translate-x-1/2 rounded-[999px]"
      style={{
        bottom: compactMode ? '-18px' : '-20px',
        width: compactMode ? 'calc(100% + 56px)' : 'calc(100% + 140px)',
        background: 'radial-gradient(circle at center, rgba(83,128,55,0.58) 0%, rgba(88,128,54,0.22) 56%, rgba(88,128,54,0) 100%)',
      }}
    />
  );
}

export function FarmPlotBoardV2({
  plots,
  compactMode = false,
  todayFocusMinutes,
  coinBalance,
  plantableSeedCount,
  harvestablePlotCount,
  onPlotClick,
}: FarmPlotBoardV2Props) {
  const displaySlots = useMemo(
    () => Array.from({ length: TOTAL_PLOTS }, (_, index) => plots[index] ?? null),
    [plots],
  );

  const isNarrowScreen = typeof window !== 'undefined' && window.innerWidth < 640;
  const useCompactMobilePolish = compactMode && isNarrowScreen;
  const useTightMobileSpacing = isNarrowScreen && !compactMode;

  const boardWidth = compactMode
    ? 'min(96vw, 500px)'
    : useTightMobileSpacing
      ? 'min(calc(100% - 4px), 500px)'
      : 'min(92vw, 900px)';
  const boardGap = compactMode || useTightMobileSpacing
    ? 'clamp(6px, 1vw, 9px)'
    : 'clamp(8px, 0.8vw, 11px)';

  return (
    <div
      className={`relative w-full ${useTightMobileSpacing ? 'overflow-visible' : 'overflow-hidden'}`}
      style={{
        minHeight: compactMode
          ? useCompactMobilePolish
            ? 'min(100dvh, 720px)'
            : 'min(100dvh, 630px)'
          : useTightMobileSpacing
            ? 'min(100dvh, 556px)'
            : 'min(100dvh, 760px)',
        isolation: 'isolate',
        background: 'linear-gradient(180deg, #90d6f6 0%, #bdeafd 38%, #b4e8a6 58%, #9ad577 80%, #8cc764 100%)',
      }}
    >
      <FarmBackdropV2 compactMode={compactMode} />
      <FarmHudV2
        compactMode={compactMode}
        todayFocusMinutes={todayFocusMinutes}
        coinBalance={coinBalance}
        plantableSeedCount={plantableSeedCount}
        harvestablePlotCount={harvestablePlotCount}
      />

      <div
        className={`relative z-20 mx-auto flex w-full justify-center ${useTightMobileSpacing ? 'px-1 sm:px-2' : 'px-0 sm:px-2'}`}
        style={{
          paddingTop: compactMode
            ? useCompactMobilePolish
              ? 'clamp(162px, 29vh, 204px)'
              : 'clamp(168px, 31vh, 214px)'
            : useTightMobileSpacing
              ? 'clamp(132px, 19vh, 164px)'
              : 'clamp(132px, 20vh, 186px)',
          paddingBottom: compactMode
            ? useCompactMobilePolish
              ? 'clamp(4px, 0.8vh, 8px)'
              : 'clamp(6px, 1.1vh, 10px)'
            : useTightMobileSpacing
              ? 'clamp(8px, 1.3vh, 12px)'
              : 'clamp(12px, 2vh, 20px)',
          transform: useTightMobileSpacing ? 'translateY(clamp(156px, calc(26.7vw + 63px), 170px))' : undefined,
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
              transform: compactMode
                ? 'perspective(1100px) rotateX(7deg)'
                : 'perspective(1400px) rotateX(8deg)',
              transformOrigin: '50% 28%',
              filter: 'drop-shadow(0 11px 14px rgba(46,72,27,0.24))',
            }}
          >
            {displaySlots.map((plot, index) => {
              const tileState = mapPlotStateToTileState(plot);
              return (
                <div
                  key={`farm-v2-slot-${plot?.id ?? index}`}
                  style={{
                    transform: `translateY(${Math.floor(index / GRID_SIDE) * (compactMode ? 2.4 : 3.2)}px)`,
                  }}
                >
                  <FarmPlotTileV2
                    state={tileState}
                    onClick={
                      onPlotClick && plot
                        ? () => onPlotClick(plot.id, tileState)
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
