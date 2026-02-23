/**
 * IsometricPlotShell - 2.5D wrapper for farm plots.
 *
 * Draws a diamond top, side thickness, and a ground shadow while keeping
 * a free content layer for PlotCard interactions and tooltips.
 */
import { useId } from 'react';
import type { ReactNode } from 'react';
import type { Plot } from '../../types/farm';

type PlotShellState = Plot['state'] | 'locked';

interface PlotShellPalette {
  topLight: string;
  topDark: string;
  leftLight: string;
  leftDark: string;
  rightLight: string;
  rightDark: string;
  edge: string;
  highlight: string;
  shadow: string;
}

interface IsometricPlotShellProps {
  size: number;
  state: PlotShellState;
  children: ReactNode;
}

const PALETTES: Record<PlotShellState, PlotShellPalette> = {
  empty: {
    topLight: '#E0B07C',
    topDark: '#C89161',
    leftLight: '#AA7449',
    leftDark: '#895A33',
    rightLight: '#9A673F',
    rightDark: '#7D522F',
    edge: '#6A4427',
    highlight: 'rgba(255,255,255,0.38)',
    shadow: 'rgba(50,30,15,0.3)',
  },
  growing: {
    topLight: '#D6B67E',
    topDark: '#B99055',
    leftLight: '#9D7642',
    leftDark: '#7D5930',
    rightLight: '#8F6837',
    rightDark: '#704F2B',
    edge: '#674726',
    highlight: 'rgba(235,255,214,0.32)',
    shadow: 'rgba(56,38,22,0.3)',
  },
  mature: {
    topLight: '#D7AC73',
    topDark: '#A87948',
    leftLight: '#8F663A',
    leftDark: '#6C4928',
    rightLight: '#805A32',
    rightDark: '#624326',
    edge: '#5C3E24',
    highlight: 'rgba(255,236,177,0.34)',
    shadow: 'rgba(52,34,20,0.33)',
  },
  withered: {
    topLight: '#AC9A83',
    topDark: '#8B7661',
    leftLight: '#746353',
    leftDark: '#564939',
    rightLight: '#675849',
    rightDark: '#4B3E31',
    edge: '#43372E',
    highlight: 'rgba(255,255,255,0.22)',
    shadow: 'rgba(24,18,12,0.35)',
  },
  stolen: {
    topLight: '#9D5E55',
    topDark: '#783A34',
    leftLight: '#68302B',
    leftDark: '#4E2521',
    rightLight: '#5F2D28',
    rightDark: '#45201C',
    edge: '#3D1B18',
    highlight: 'rgba(255,200,193,0.24)',
    shadow: 'rgba(37,13,11,0.42)',
  },
  locked: {
    topLight: '#BCA58A',
    topDark: '#9C846A',
    leftLight: '#886F56',
    leftDark: '#68543F',
    rightLight: '#7E6851',
    rightDark: '#624E3B',
    edge: '#564534',
    highlight: 'rgba(255,255,255,0.24)',
    shadow: 'rgba(40,31,24,0.3)',
  },
};

export function IsometricPlotShell({ size, state, children }: IsometricPlotShellProps) {
  const gradientId = useId().replace(/:/g, '');
  const palette = PALETTES[state];

  const topHeight = Math.round(size * 0.62);
  const halfTopHeight = topHeight / 2;
  const depth = Math.max(10, Math.round(size * 0.2));
  const shadowPad = Math.max(12, Math.round(size * 0.2));
  const shellHeight = topHeight + depth + shadowPad;

  const contentWidth = Math.round(size * 0.68);
  const contentTop = Math.round(topHeight * 0.1);

  const shadowWidth = Math.round(size * 0.82);
  const shadowHeight = Math.max(10, Math.round(size * 0.16));

  const topPoints = `${size / 2},0 ${size},${halfTopHeight} ${size / 2},${topHeight} 0,${halfTopHeight}`;
  const leftPoints = `0,${halfTopHeight} ${size / 2},${topHeight} ${size / 2},${topHeight + depth} 0,${halfTopHeight + depth}`;
  const rightPoints = `${size},${halfTopHeight} ${size / 2},${topHeight} ${size / 2},${topHeight + depth} ${size},${halfTopHeight + depth}`;

  return (
    <div className="relative overflow-visible" style={{ width: size, height: shellHeight }}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 ${size} ${shellHeight}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`top-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.topLight} />
            <stop offset="100%" stopColor={palette.topDark} />
          </linearGradient>
          <linearGradient id={`left-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.leftLight} />
            <stop offset="100%" stopColor={palette.leftDark} />
          </linearGradient>
          <linearGradient id={`right-${gradientId}`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.rightLight} />
            <stop offset="100%" stopColor={palette.rightDark} />
          </linearGradient>
        </defs>

        <ellipse
          cx={size / 2}
          cy={topHeight + depth + shadowHeight * 0.5}
          rx={shadowWidth / 2}
          ry={shadowHeight / 2}
          fill={palette.shadow}
        />

        <polygon points={leftPoints} fill={`url(#left-${gradientId})`} />
        <polygon points={rightPoints} fill={`url(#right-${gradientId})`} />

        <polygon
          points={topPoints}
          fill={`url(#top-${gradientId})`}
          stroke={palette.edge}
          strokeWidth={Math.max(1.2, size * 0.014)}
          strokeLinejoin="round"
        />
        <polyline
          points={`0,${halfTopHeight} ${size / 2},0 ${size},${halfTopHeight}`}
          stroke={palette.highlight}
          strokeWidth={Math.max(0.9, size * 0.008)}
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      <div
        className="absolute left-1/2 z-20 -translate-x-1/2 overflow-visible"
        style={{ top: contentTop, width: contentWidth }}
      >
        {children}
      </div>
    </div>
  );
}
