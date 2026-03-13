import type { CSSProperties } from 'react';
import type { Plot } from '../../types/farm';

export type FarmPlotTileState = 'empty' | 'growing' | 'mature' | 'locked';

interface FarmPlotTileV2Props {
  state: FarmPlotTileState;
  onClick?: () => void;
}

const MOTION_CLASS = 'farm-v2-motion';

const TILE_PALETTES: Record<FarmPlotTileState, {
  frameBorder: string;
  frameBackground: string;
  frameShadow: string;
  innerBorder: string;
  innerBackground: string;
  cellBorder: string;
  cellBackground: string;
  highlight: string;
}> = {
  empty: {
    frameBorder: '#8f5637',
    frameBackground: 'linear-gradient(170deg, #b6764e 0%, #8b5238 100%)',
    frameShadow: '0 3px 0 rgba(100,60,38,0.34), 0 8px 14px rgba(41,24,14,0.2)',
    innerBorder: '#633725',
    innerBackground: 'linear-gradient(165deg, #8b5339 0%, #744231 100%), repeating-linear-gradient(135deg, rgba(255,221,170,0.08) 0px, rgba(255,221,170,0.08) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 9px)',
    cellBorder: 'rgba(111,63,43,0.66)',
    cellBackground: 'radial-gradient(circle at 36% 32%, rgba(170,105,74,0.46) 0%, rgba(105,62,42,0.34) 55%, rgba(91,53,36,0.36) 100%), repeating-linear-gradient(120deg, rgba(255,214,158,0.07) 0px, rgba(255,214,158,0.07) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 6px)',
    highlight: 'linear-gradient(180deg, rgba(255,231,192,0.3) 0%, rgba(255,231,192,0.06) 100%)',
  },
  growing: {
    frameBorder: '#8d5a35',
    frameBackground: 'linear-gradient(170deg, #b9784a 0%, #8d5437 100%)',
    frameShadow: '0 3px 0 rgba(100,60,38,0.34), 0 8px 14px rgba(41,24,14,0.2)',
    innerBorder: '#643826',
    innerBackground: 'linear-gradient(165deg, #875134 0%, #71412a 100%), repeating-linear-gradient(135deg, rgba(255,232,184,0.08) 0px, rgba(255,232,184,0.08) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 9px)',
    cellBorder: 'rgba(111,63,43,0.64)',
    cellBackground: 'radial-gradient(circle at 36% 32%, rgba(172,111,76,0.44) 0%, rgba(104,64,44,0.34) 55%, rgba(92,56,37,0.38) 100%), repeating-linear-gradient(120deg, rgba(255,222,170,0.07) 0px, rgba(255,222,170,0.07) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 6px)',
    highlight: 'linear-gradient(180deg, rgba(255,236,198,0.28) 0%, rgba(255,236,198,0.06) 100%)',
  },
  mature: {
    frameBorder: '#845031',
    frameBackground: 'linear-gradient(170deg, #af6d42 0%, #814b31 100%)',
    frameShadow: '0 3px 0 rgba(96,58,36,0.34), 0 8px 14px rgba(41,24,14,0.2)',
    innerBorder: '#5e3424',
    innerBackground: 'linear-gradient(165deg, #7f4c32 0%, #673926 100%), repeating-linear-gradient(135deg, rgba(255,229,188,0.08) 0px, rgba(255,229,188,0.08) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 9px)',
    cellBorder: 'rgba(103,58,37,0.66)',
    cellBackground: 'radial-gradient(circle at 36% 32%, rgba(167,104,69,0.42) 0%, rgba(98,59,40,0.32) 55%, rgba(87,51,35,0.36) 100%), repeating-linear-gradient(120deg, rgba(255,216,158,0.06) 0px, rgba(255,216,158,0.06) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 6px)',
    highlight: 'linear-gradient(180deg, rgba(255,226,186,0.28) 0%, rgba(255,226,186,0.06) 100%)',
  },
  locked: {
    frameBorder: '#837160',
    frameBackground: 'linear-gradient(170deg, #b3a28f 0%, #8f7e6b 100%)',
    frameShadow: '0 3px 0 rgba(83,72,60,0.28), 0 8px 14px rgba(41,24,14,0.14)',
    innerBorder: '#62584b',
    innerBackground: 'linear-gradient(165deg, #938574 0%, #7a6c5d 100%), repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 9px)',
    cellBorder: 'rgba(100,88,75,0.62)',
    cellBackground: 'radial-gradient(circle at 36% 32%, rgba(194,184,168,0.42) 0%, rgba(136,122,106,0.34) 55%, rgba(113,99,85,0.38) 100%), repeating-linear-gradient(120deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 6px)',
    highlight: 'linear-gradient(180deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.06) 100%)',
  },
};

const SPROUT_VARIANTS: Array<{
  rotate: string;
  leafTilt: string;
  size: string;
  swayDuration: string;
  delay: string;
}> = [
  { rotate: '-8deg', leafTilt: '-22deg', size: 'scale(0.98)', swayDuration: '2.8s', delay: '-0.8s' },
  { rotate: '6deg', leafTilt: '16deg', size: 'scale(0.9)', swayDuration: '3.1s', delay: '-1.4s' },
  { rotate: '-4deg', leafTilt: '-12deg', size: 'scale(1.04)', swayDuration: '2.6s', delay: '-0.5s' },
];

function Sprout({
  variant,
}: {
  variant: { rotate: string; leafTilt: string; size: string; swayDuration: string; delay: string };
}) {
  return (
    <span
      className="pointer-events-none absolute left-1/2 top-1/2 block h-5 w-5 -translate-x-1/2 -translate-y-1/2"
      style={{ transform: `translate(-50%, -50%) ${variant.size}` }}
    >
      <span
        className="absolute left-1/2 bottom-[1px] h-[4px] w-[8px] -translate-x-1/2 rounded-[999px]"
        style={{ background: 'linear-gradient(180deg, #b98557 0%, #875432 100%)' }}
      />
      <span
        className={`absolute inset-0 block ${MOTION_CLASS}`}
        style={{
          animation: `farmV2SproutSway ${variant.swayDuration} ease-in-out ${variant.delay} infinite`,
          transformOrigin: '50% 88%',
        }}
      >
        <span
          className="absolute left-1/2 bottom-[3px] h-[9px] w-[2.5px] -translate-x-1/2 rounded-full"
          style={{
            background: 'linear-gradient(180deg, #90cd67 0%, #4f9140 100%)',
            transform: `rotate(${variant.rotate})`,
          }}
        />
        <span
          className="absolute left-[3px] top-[4px] h-[7px] w-[6px] rounded-[100%_0_100%_0]"
          style={{
            transform: `rotate(${variant.leafTilt})`,
            border: '1px solid rgba(69,110,54,0.82)',
            background: 'linear-gradient(160deg, #a6e681 0%, #67b853 100%)',
          }}
        />
        <span
          className="absolute right-[3px] top-[4px] h-[7px] w-[6px] rounded-[0_100%_0_100%]"
          style={{
            transform: `rotate(calc(${variant.leafTilt} * -1))`,
            border: '1px solid rgba(69,110,54,0.82)',
            background: 'linear-gradient(200deg, #a6e681 0%, #67b853 100%)',
          }}
        />
      </span>
    </span>
  );
}

function Leaf({ style }: { style: CSSProperties }) {
  return (
    <span
      className="absolute block"
      style={{
        width: '20%',
        height: '11%',
        borderRadius: '62% 38% 72% 28%',
        border: '1px solid rgba(55,98,44,0.8)',
        background: 'linear-gradient(145deg, #8dcf68 0%, #58a145 100%)',
        boxShadow: '0 1px 1px rgba(0,0,0,0.16)',
        ...style,
      }}
    />
  );
}

function Melon({
  x,
  y,
  size,
  duration,
  delay,
}: {
  x: string;
  y: string;
  size: string;
  duration: string;
  delay: string;
}) {
  return (
    <span
      className={`absolute block rounded-full ${MOTION_CLASS}`}
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        border: '2px solid #2f7030',
        background: 'radial-gradient(circle at 33% 30%, #9ce67e 0%, #58b84a 45%, #2e8132 100%)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.24)',
        animation: `farmV2MelonBreath ${duration} ease-in-out ${delay} infinite`,
      }}
    >
      <span
        className="absolute inset-[14%] rounded-full"
        style={{
          opacity: 0.62,
          background:
            'repeating-linear-gradient(90deg, rgba(31,100,40,0.92) 0px, rgba(31,100,40,0.92) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 8px)',
        }}
      />
      <span
        className="absolute left-[20%] top-[16%] h-[18%] w-[20%] rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.32)' }}
      />
    </span>
  );
}

function MatureCanopy() {
  return (
    <div
      className={`pointer-events-none absolute inset-[6px] ${MOTION_CLASS}`}
      style={{
        animation: 'farmV2CanopySwing 6.4s ease-in-out -1.2s infinite',
        transformOrigin: '50% 72%',
      }}
    >
      <div
        className="absolute left-[14%] top-[31%] h-[4px] w-[72%] rounded-full"
        style={{ backgroundColor: '#4a863d' }}
      />
      <div
        className="absolute left-[18%] top-[61%] h-[4px] w-[66%] rounded-full"
        style={{ backgroundColor: '#4a863d' }}
      />
      <div
        className="absolute left-[31%] top-[20%] h-[54%] w-[4px] rounded-full"
        style={{ backgroundColor: '#4b8740' }}
      />
      <div
        className="absolute left-[58%] top-[19%] h-[56%] w-[4px] rounded-full"
        style={{ backgroundColor: '#4b8740' }}
      />

      <Leaf style={{ left: '7%', top: '26%', transform: 'rotate(-24deg)' }} />
      <Leaf style={{ left: '66%', top: '12%', transform: 'rotate(18deg)' }} />
      <Leaf style={{ left: '8%', top: '56%', transform: 'rotate(-12deg)' }} />
      <Leaf style={{ left: '66%', top: '58%', transform: 'rotate(22deg)' }} />
      <Leaf style={{ left: '40%', top: '2%', transform: 'rotate(-2deg)' }} />

      <Melon x="6%" y="14%" size="42%" duration="4.8s" delay="-0.2s" />
      <Melon x="45%" y="12%" size="42%" duration="5.2s" delay="-1.1s" />
      <Melon x="16%" y="52%" size="34%" duration="4.6s" delay="-1.8s" />
      <Melon x="54%" y="50%" size="34%" duration="5.4s" delay="-2.4s" />
      <Melon x="38%" y="40%" size="24%" duration="5s" delay="-2.1s" />
    </div>
  );
}

function LockedOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 opacity-55"
        style={{
          background: 'repeating-linear-gradient(135deg, rgba(86,74,62,0.18) 0px, rgba(86,74,62,0.18) 8px, rgba(255,255,255,0) 8px, rgba(255,255,255,0) 16px)',
        }}
      />
      <div
        className="absolute inset-[10px] rounded-[16px]"
        style={{
          border: '1px solid rgba(93,82,70,0.42)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(82,71,60,0.12) 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#54493d]">
        <div
          className="grid h-11 w-11 place-items-center rounded-full border text-xl"
          style={{
            borderColor: 'rgba(98,84,70,0.55)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(220,210,195,0.92) 100%)',
            boxShadow: '0 4px 10px rgba(72,60,50,0.12)',
          }}
        >
          🔒
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.18em]"
          style={{
            color: '#5e5145',
            background: 'rgba(255,248,239,0.78)',
            border: '1px solid rgba(101,87,73,0.26)',
          }}
        >
          锁定
        </span>
      </div>
    </div>
  );
}

export function FarmPlotTileV2({ state, onClick }: FarmPlotTileV2Props) {
  const palette = TILE_PALETTES[state];
  const isLocked = state === 'locked';
  const isInteractive = Boolean(onClick) && !isLocked;

  return (
    <div
      className={`relative overflow-hidden${isInteractive ? ' cursor-pointer' : ''}`}
      data-state={state}
      data-locked={isLocked ? 'true' : 'false'}
      onClick={isInteractive ? onClick : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-disabled={isLocked ? true : undefined}
      onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: '22px',
        border: `3px solid ${palette.frameBorder}`,
        background: palette.frameBackground,
        boxShadow: palette.frameShadow,
        filter: isLocked ? 'saturate(0.82)' : undefined,
      }}
    >
      <div
        className="pointer-events-none absolute left-[8%] top-[6%] h-[14%] w-[40%] rounded-[999px]"
        style={{
          background: palette.highlight,
        }}
      />
      <div
        className="absolute inset-[7px]"
        style={{
          borderRadius: '15px',
          border: `2px solid ${palette.innerBorder}`,
          background: palette.innerBackground,
        }}
      >
        <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-[3px] p-[4px]">
          {Array.from({ length: 9 }).map((_, index) => {
            const variant = SPROUT_VARIANTS[index % SPROUT_VARIANTS.length];
            return (
              <span
                key={`farm-v2-cell-${state}-${index}`}
                className="relative overflow-hidden rounded-[4px]"
                style={{
                  border: `1px solid ${palette.cellBorder}`,
                  background: palette.cellBackground,
                  boxShadow: isLocked ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'inset 0 1px 0 rgba(255,224,176,0.16)',
                }}
              >
                {state === 'growing' && <Sprout variant={variant} />}
              </span>
            );
          })}
        </div>
      </div>

      {state === 'mature' && <MatureCanopy />}
      {isLocked && <LockedOverlay />}
    </div>
  );
}

export function mapPlotStateToTileState(plot: Plot | null): FarmPlotTileState {
  if (!plot) return 'locked';
  if (plot.state === 'mature') return 'mature';
  if (plot.state === 'growing') return 'growing';
  return 'empty';
}
