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
    topLight: '#ecd7aa',
    topDark: '#c8a76e',
    leftLight: '#bc9257',
    leftDark: '#966b3e',
    rightLight: '#c8a169',
    rightDark: '#a37645',
    edge: '#7c5c39',
    edgeSoft: 'rgba(132,102,67,0.7)',
    highlight: 'rgba(255,248,226,0.56)',
    shadow: 'rgba(86,66,42,0.2)',
    groundTint: 'rgba(142,175,98,0.24)',
    contactShadow: 'rgba(70,52,31,0.34)',
  },
  growing: {
    topLight: '#e7d5a5',
    topDark: '#c4a067',
    leftLight: '#b78e52',
    leftDark: '#91683c',
    rightLight: '#c09a63',
    rightDark: '#9b6f42',
    edge: '#775a37',
    edgeSoft: 'rgba(125,101,66,0.68)',
    highlight: 'rgba(244,255,222,0.5)',
    shadow: 'rgba(82,65,40,0.2)',
    groundTint: 'rgba(138,180,95,0.25)',
    contactShadow: 'rgba(68,51,30,0.34)',
  },
  mature: {
    topLight: '#eec898',
    topDark: '#bf8544',
    leftLight: '#ae743e',
    leftDark: '#875327',
    rightLight: '#bd844a',
    rightDark: '#955f31',
    edge: '#6c4927',
    edgeSoft: 'rgba(110,77,45,0.72)',
    highlight: 'rgba(255,237,194,0.52)',
    shadow: 'rgba(82,57,32,0.22)',
    groundTint: 'rgba(143,176,91,0.22)',
    contactShadow: 'rgba(70,46,25,0.36)',
  },
  withered: {
    topLight: '#d4c5b0',
    topDark: '#a58c71',
    leftLight: '#8f7960',
    leftDark: '#6f5b48',
    rightLight: '#9f8a70',
    rightDark: '#7e6852',
    edge: '#62513f',
    edgeSoft: 'rgba(98,84,68,0.66)',
    highlight: 'rgba(252,249,244,0.38)',
    shadow: 'rgba(68,55,44,0.21)',
    groundTint: 'rgba(132,160,102,0.2)',
    contactShadow: 'rgba(56,43,34,0.33)',
  },
  stolen: {
    topLight: '#d99a90',
    topDark: '#a85e56',
    leftLight: '#9c5f57',
    leftDark: '#773e37',
    rightLight: '#ae7269',
    rightDark: '#884f47',
    edge: '#6a3934',
    edgeSoft: 'rgba(106,63,58,0.68)',
    highlight: 'rgba(255,224,216,0.43)',
    shadow: 'rgba(78,46,40,0.24)',
    groundTint: 'rgba(132,156,95,0.2)',
    contactShadow: 'rgba(69,36,31,0.36)',
  },
  locked: {
    topLight: '#ddcbb0',
    topDark: '#b19675',
    leftLight: '#9d825f',
    leftDark: '#786146',
    rightLight: '#ab916f',
    rightDark: '#856d52',
    edge: '#65523f',
    edgeSoft: 'rgba(103,86,66,0.68)',
    highlight: 'rgba(255,252,245,0.36)',
    shadow: 'rgba(69,57,45,0.2)',
    groundTint: 'rgba(132,160,102,0.18)',
    contactShadow: 'rgba(61,48,37,0.33)',
  },
};

export function IsometricPlotShell({ size, state, children }: IsometricPlotShellProps) {
  const gradientId = useId().replace(/:/g, '');
  const palette = PALETTES[state];

  const topHeight = Math.round(size * 0.56);
  const halfTopHeight = topHeight / 2;
  const depth = Math.max(6, Math.round(size * 0.12));
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
          <linearGradient id={`occlusion-${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(68,54,36,0)" />
            <stop offset="100%" stopColor="rgba(68,54,36,0.2)" />
          </linearGradient>
          <filter id={`shadow-${gradientId}`} x="-28%" y="-130%" width="156%" height="296%">
            <feGaussianBlur stdDeviation={Math.max(1.4, size * 0.015)} />
          </filter>
          <filter id={`grain-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="grayNoise" />
            <feComponentTransfer in="grayNoise" result="softNoise">
              <feFuncA type="table" tableValues="0 0.06" />
            </feComponentTransfer>
          </filter>
        </defs>

        <ellipse
          cx={size * 0.53}
          cy={topHeight + depth + shadowHeight * 0.35}
          rx={shadowWidth / 2}
          ry={shadowHeight / 2}
          fill={`url(#ground-${gradientId})`}
          filter={`url(#shadow-${gradientId})`}
        />
        <ellipse
          cx={size * 0.55}
          cy={topHeight + depth + shadowHeight * 0.58}
          rx={shadowWidth / 2}
          ry={shadowHeight / 2}
          fill={palette.shadow}
          filter={`url(#shadow-${gradientId})`}
        />
        <ellipse
          cx={size * 0.54}
          cy={topHeight + depth + contactShadowHeight * 0.35}
          rx={contactShadowWidth / 2}
          ry={contactShadowHeight / 2}
          fill={palette.contactShadow}
          opacity="0.78"
        />

        <polygon points={leftPoints} fill={`url(#left-${gradientId})`} stroke={palette.edgeSoft} strokeWidth={Math.max(0.8, size * 0.008)} strokeLinejoin="round" />
        <polygon points={rightPoints} fill={`url(#right-${gradientId})`} stroke={palette.edgeSoft} strokeWidth={Math.max(0.8, size * 0.008)} strokeLinejoin="round" />
        <polygon points={leftPoints} fill={`url(#occlusion-${gradientId})`} opacity="0.72" />
        <polygon points={rightPoints} fill={`url(#occlusion-${gradientId})`} opacity="0.56" />

        <polygon
          points={topPoints}
          fill={`url(#top-${gradientId})`}
          stroke={palette.edge}
          strokeWidth={Math.max(1, size * 0.012)}
          strokeLinejoin="round"
        />
        <polygon points={topPoints} fill={`url(#shine-${gradientId})`} opacity="0.52" />
        <polygon points={topPoints} fill="#ffffff" filter={`url(#grain-${gradientId})`} opacity="0.34" />
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
