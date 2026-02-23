/**
 * IsometricPlotShell - 2.5D wrapper for farm plots.
 *
 * Keeps existing plot interaction content untouched while softening depth,
 * unifying color temperature, and improving ground contact shadows.
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
  edgeSoft: string;
  highlight: string;
  shadow: string;
  groundTint: string;
  contactShadow: string;
}

interface IsometricPlotShellProps {
  size: number;
  state: PlotShellState;
  children: ReactNode;
}

const PALETTES: Record<PlotShellState, PlotShellPalette> = {
  empty: {
    topLight: '#e2c694',
    topDark: '#cfae79',
    leftLight: '#c69c65',
    leftDark: '#ae844f',
    rightLight: '#c19862',
    rightDark: '#a9804d',
    edge: '#846541',
    edgeSoft: 'rgba(141,112,73,0.72)',
    highlight: 'rgba(255,247,220,0.5)',
    shadow: 'rgba(83,64,38,0.18)',
    groundTint: 'rgba(156,191,106,0.22)',
    contactShadow: 'rgba(72,54,32,0.24)',
  },
  growing: {
    topLight: '#dfc893',
    topDark: '#c9ab72',
    leftLight: '#c29a62',
    leftDark: '#aa804b',
    rightLight: '#bb935d',
    rightDark: '#a37a46',
    edge: '#7f643f',
    edgeSoft: 'rgba(133,109,72,0.68)',
    highlight: 'rgba(239,255,213,0.48)',
    shadow: 'rgba(79,64,38,0.18)',
    groundTint: 'rgba(149,193,106,0.25)',
    contactShadow: 'rgba(70,54,33,0.24)',
  },
  mature: {
    topLight: '#e4bf89',
    topDark: '#c99558',
    leftLight: '#b9864f',
    leftDark: '#9d6d3f',
    rightLight: '#b37f49',
    rightDark: '#98673b',
    edge: '#775834',
    edgeSoft: 'rgba(124,93,59,0.72)',
    highlight: 'rgba(255,236,184,0.48)',
    shadow: 'rgba(80,58,33,0.2)',
    groundTint: 'rgba(152,188,98,0.2)',
    contactShadow: 'rgba(72,49,28,0.27)',
  },
  withered: {
    topLight: '#c8b9a4',
    topDark: '#ac967f',
    leftLight: '#9b866f',
    leftDark: '#836f5b',
    rightLight: '#958169',
    rightDark: '#7c6854',
    edge: '#685747',
    edgeSoft: 'rgba(109,94,79,0.66)',
    highlight: 'rgba(250,248,243,0.36)',
    shadow: 'rgba(66,54,43,0.2)',
    groundTint: 'rgba(145,173,114,0.16)',
    contactShadow: 'rgba(58,45,36,0.24)',
  },
  stolen: {
    topLight: '#cb8e82',
    topDark: '#ad675d',
    leftLight: '#a76a61',
    leftDark: '#8b4f47',
    rightLight: '#a0655d',
    rightDark: '#845149',
    edge: '#72403a',
    edgeSoft: 'rgba(120,74,68,0.68)',
    highlight: 'rgba(255,221,214,0.4)',
    shadow: 'rgba(78,44,39,0.24)',
    groundTint: 'rgba(147,172,106,0.16)',
    contactShadow: 'rgba(70,37,33,0.28)',
  },
  locked: {
    topLight: '#d0bf9f',
    topDark: '#baa284',
    leftLight: '#ab9374',
    leftDark: '#90795f',
    rightLight: '#a48d6f',
    rightDark: '#8b765d',
    edge: '#6f5d4a',
    edgeSoft: 'rgba(116,99,79,0.68)',
    highlight: 'rgba(255,252,244,0.34)',
    shadow: 'rgba(67,56,44,0.18)',
    groundTint: 'rgba(144,171,113,0.16)',
    contactShadow: 'rgba(63,50,39,0.24)',
  },
};

export function IsometricPlotShell({ size, state, children }: IsometricPlotShellProps) {
  const gradientId = useId().replace(/:/g, '');
  const palette = PALETTES[state];

  const topHeight = Math.round(size * 0.6);
  const halfTopHeight = topHeight / 2;
  const depth = Math.max(7, Math.round(size * 0.14));
  const shadowPad = Math.max(10, Math.round(size * 0.15));
  const shellHeight = topHeight + depth + shadowPad;

  const contentWidth = Math.round(size * 0.69);
  const contentTop = Math.round(topHeight * 0.08);

  const shadowWidth = Math.round(size * 0.96);
  const shadowHeight = Math.max(8, Math.round(size * 0.12));
  const contactShadowWidth = Math.round(size * 0.72);
  const contactShadowHeight = Math.max(5, Math.round(size * 0.065));

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
          <radialGradient id={`shine-${gradientId}`} cx="50%" cy="22%" r="78%">
            <stop offset="0%" stopColor={palette.highlight} />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id={`ground-${gradientId}`} cx="50%" cy="50%" r="64%">
            <stop offset="0%" stopColor={palette.groundTint} />
            <stop offset="100%" stopColor="rgba(149,193,106,0)" />
          </radialGradient>
          <filter id={`shadow-${gradientId}`} x="-28%" y="-130%" width="156%" height="296%">
            <feGaussianBlur stdDeviation={Math.max(1.4, size * 0.015)} />
          </filter>
        </defs>

        <ellipse
          cx={size / 2}
          cy={topHeight + depth + shadowHeight * 0.35}
          rx={shadowWidth / 2}
          ry={shadowHeight / 2}
          fill={`url(#ground-${gradientId})`}
          filter={`url(#shadow-${gradientId})`}
        />
        <ellipse
          cx={size / 2}
          cy={topHeight + depth + shadowHeight * 0.58}
          rx={shadowWidth / 2}
          ry={shadowHeight / 2}
          fill={palette.shadow}
          filter={`url(#shadow-${gradientId})`}
        />
        <ellipse
          cx={size / 2}
          cy={topHeight + depth + contactShadowHeight * 0.35}
          rx={contactShadowWidth / 2}
          ry={contactShadowHeight / 2}
          fill={palette.contactShadow}
          opacity="0.72"
        />

        <polygon points={leftPoints} fill={`url(#left-${gradientId})`} stroke={palette.edgeSoft} strokeWidth={Math.max(0.8, size * 0.008)} strokeLinejoin="round" />
        <polygon points={rightPoints} fill={`url(#right-${gradientId})`} stroke={palette.edgeSoft} strokeWidth={Math.max(0.8, size * 0.008)} strokeLinejoin="round" />

        <polygon
          points={topPoints}
          fill={`url(#top-${gradientId})`}
          stroke={palette.edge}
          strokeWidth={Math.max(1, size * 0.012)}
          strokeLinejoin="round"
        />
        <polygon points={topPoints} fill={`url(#shine-${gradientId})`} opacity="0.56" />
        <polyline
          points={`0,${halfTopHeight} ${size / 2},0 ${size},${halfTopHeight}`}
          stroke={palette.highlight}
          strokeWidth={Math.max(0.75, size * 0.007)}
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
