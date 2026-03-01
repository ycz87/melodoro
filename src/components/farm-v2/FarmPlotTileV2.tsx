import type { CSSProperties } from 'react';
import type { Plot } from '../../types/farm';

export type FarmPlotTileState = 'empty' | 'growing' | 'mature';

interface FarmPlotTileV2Props {
  state: FarmPlotTileState;
}

const MOTION_CLASS = 'farm-v2-motion';

const SPROUT_VARIANTS: Array<{
  rotate: string;
  leafTilt: string;
  size: string;
  swayDuration: string;
  delay: string;
}> = [
  { rotate: '-8deg', leafTilt: '-20deg', size: 'scale(0.88)', swayDuration: '2.8s', delay: '-0.8s' },
  { rotate: '6deg', leafTilt: '16deg', size: 'scale(0.82)', swayDuration: '3.1s', delay: '-1.4s' },
  { rotate: '-4deg', leafTilt: '-14deg', size: 'scale(0.92)', swayDuration: '2.6s', delay: '-0.5s' },
];

function Sprout({
  variant,
}: {
  variant: { rotate: string; leafTilt: string; size: string; swayDuration: string; delay: string };
}) {
  return (
    <span
      className="pointer-events-none absolute left-1/2 top-1/2 block h-4 w-4 -translate-x-1/2 -translate-y-1/2"
      style={{ transform: `translate(-50%, -50%) ${variant.size}` }}
    >
      <span
        className={`absolute inset-0 block ${MOTION_CLASS}`}
        style={{
          animation: `farmV2SproutSway ${variant.swayDuration} ease-in-out ${variant.delay} infinite`,
          transformOrigin: '50% 88%',
        }}
      >
        <span
          className="absolute left-1/2 bottom-[1px] h-[8px] w-[2px] -translate-x-1/2 rounded-full"
          style={{
            background: 'linear-gradient(180deg, #82be5f 0%, #4d8f3f 100%)',
            transform: `rotate(${variant.rotate})`,
          }}
        />
        <span
          className="absolute left-[2px] top-[4px] h-[6px] w-[5px] rounded-[100%_0_100%_0]"
          style={{
            transform: `rotate(${variant.leafTilt})`,
            border: '1px solid rgba(69,110,54,0.8)',
            background: 'linear-gradient(160deg, #9de177 0%, #63b350 100%)',
          }}
        />
        <span
          className="absolute right-[2px] top-[4px] h-[6px] w-[5px] rounded-[0_100%_0_100%]"
          style={{
            transform: `rotate(calc(${variant.leafTilt} * -1))`,
            border: '1px solid rgba(69,110,54,0.8)',
            background: 'linear-gradient(200deg, #9de177 0%, #63b350 100%)',
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
        width: '18%',
        height: '10%',
        borderRadius: '60% 40% 70% 30%',
        border: '1px solid rgba(58,99,45,0.75)',
        background: 'linear-gradient(145deg, #79bb5e 0%, #4f9341 100%)',
        boxShadow: '0 1px 1px rgba(0,0,0,0.16)',
        ...style,
      }}
    />
  );
}

function Melon({
  x,
  y,
  duration,
  delay,
}: {
  x: string;
  y: string;
  duration: string;
  delay: string;
}) {
  return (
    <span
      className={`absolute block rounded-full ${MOTION_CLASS}`}
      style={{
        left: x,
        top: y,
        width: '26%',
        height: '26%',
        border: '2px solid #2f7030',
        background: 'radial-gradient(circle at 33% 30%, #95df78 0%, #51ad44 44%, #2d7d31 100%)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.24)',
        animation: `farmV2MelonBreath ${duration} ease-in-out ${delay} infinite`,
      }}
    >
      <span
        className="absolute inset-[16%] rounded-full"
        style={{
          opacity: 0.58,
          background:
            'repeating-linear-gradient(90deg, rgba(31,100,40,0.92) 0px, rgba(31,100,40,0.92) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 7px)',
        }}
      />
      <span
        className="absolute left-[22%] top-[18%] h-[18%] w-[20%] rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.32)' }}
      />
    </span>
  );
}

function MatureCanopy() {
  return (
    <div
      className={`pointer-events-none absolute inset-[8px] ${MOTION_CLASS}`}
      style={{
        animation: 'farmV2CanopySwing 6.6s ease-in-out -1.2s infinite',
        transformOrigin: '50% 72%',
      }}
    >
      <div
        className="absolute left-[20%] top-[28%] h-[3px] w-[56%] rounded-full"
        style={{ backgroundColor: '#467b39' }}
      />
      <div
        className="absolute left-[20%] top-[61%] h-[3px] w-[56%] rounded-full"
        style={{ backgroundColor: '#467b39' }}
      />
      <div
        className="absolute left-[30%] top-[22%] h-[52%] w-[3px] rounded-full"
        style={{ backgroundColor: '#487f3b' }}
      />
      <div
        className="absolute left-[63%] top-[22%] h-[52%] w-[3px] rounded-full"
        style={{ backgroundColor: '#487f3b' }}
      />

      <Leaf style={{ left: '14%', top: '19%', transform: 'rotate(-24deg)' }} />
      <Leaf style={{ left: '64%', top: '16%', transform: 'rotate(16deg)' }} />
      <Leaf style={{ left: '10%', top: '55%', transform: 'rotate(-10deg)' }} />
      <Leaf style={{ left: '66%', top: '56%', transform: 'rotate(20deg)' }} />
      <Leaf style={{ left: '44%', top: '4%', transform: 'rotate(-2deg)' }} />

      <Melon x="16%" y="16%" duration="4.8s" delay="-0.2s" />
      <Melon x="58%" y="16%" duration="5.2s" delay="-1.1s" />
      <Melon x="16%" y="58%" duration="4.6s" delay="-1.8s" />
      <Melon x="58%" y="58%" duration="5.4s" delay="-2.4s" />
    </div>
  );
}

export function FarmPlotTileV2({ state }: FarmPlotTileV2Props) {
  return (
    <div
      className="relative overflow-hidden"
      data-state={state}
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: '20px',
        border: '3px solid #8b5334',
        background: 'linear-gradient(170deg, #b06f48 0%, #874f36 100%)',
        boxShadow: '0 3px 0 rgba(100,60,38,0.34), 0 8px 14px rgba(41,24,14,0.2)',
      }}
    >
      <div
        className="pointer-events-none absolute left-[8%] top-[6%] h-[14%] w-[36%] rounded-[999px]"
        style={{
          background: 'linear-gradient(180deg, rgba(255,231,192,0.28) 0%, rgba(255,231,192,0.04) 100%)',
        }}
      />
      <div
        className="absolute inset-[7px]"
        style={{
          borderRadius: '14px',
          border: '2px solid #633725',
          background:
            'linear-gradient(165deg, #865036 0%, #733f2d 100%), repeating-linear-gradient(135deg, rgba(255,221,170,0.07) 0px, rgba(255,221,170,0.07) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 9px)',
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
                  border: '1px solid rgba(109,63,44,0.64)',
                  background:
                    'radial-gradient(circle at 36% 32%, rgba(168,103,72,0.45) 0%, rgba(104,61,42,0.34) 55%, rgba(89,52,36,0.36) 100%), repeating-linear-gradient(120deg, rgba(255,214,158,0.07) 0px, rgba(255,214,158,0.07) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 6px)',
                  boxShadow: 'inset 0 1px 0 rgba(255,224,176,0.14)',
                }}
              >
                {state === 'growing' && <Sprout variant={variant} />}
              </span>
            );
          })}
        </div>
      </div>

      {state === 'mature' && <MatureCanopy />}
    </div>
  );
}

export function mapPlotStateToTileState(plot: Plot | null): FarmPlotTileState {
  if (plot?.state === 'mature') return 'mature';
  if (plot?.state === 'growing') return 'growing';
  return 'empty';
}
