/**
 * IsometricPlotShell - 2.5D rectangular soil bed for farm plots.
 *
 * Renders a wide, flat rectangular bed with rounded corners and a slight
 * 3D depth on the bottom edge, matching the reference art style.
 */
import { useId } from 'react';
import type { ReactNode } from 'react';
import type { Plot } from '../../types/farm';

type PlotShellState = Plot['state'] | 'locked';

interface PlotShellPalette {
  topLight: string;
  topDark: string;
  sideLight: string;
  sideDark: string;
  edge: string;
  highlight: string;
  shadow: string;
  contactShadow: string;
}

interface IsometricPlotShellProps {
  size: number;
  state: PlotShellState;
  children: ReactNode;
}

const PALETTES: Record<PlotShellState, PlotShellPalette> = {
  empty: {
    topLight: '#e8cfa0',
    topDark: '#c4a06a',
    sideLight: '#b08550',
    sideDark: '#8a6438',
    edge: '#7c5c39',
    highlight: 'rgba(255,248,226,0.48)',
    shadow: 'rgba(86,66,42,0.22)',
    contactShadow: 'rgba(70,52,31,0.3)',
  },
  growing: {
    topLight: '#e2c89a',
    topDark: '#c09a64',
    sideLight: '#ab7e4c',
    sideDark: '#876036',
    edge: '#775a37',
    highlight: 'rgba(244,255,222,0.44)',
    shadow: 'rgba(82,65,40,0.22)',
    contactShadow: 'rgba(68,51,30,0.3)',
  },
  mature: {
    topLight: '#e8be8e',
    topDark: '#ba7e40',
    sideLight: '#a06e38',
    sideDark: '#7e5028',
    edge: '#6c4927',
    highlight: 'rgba(255,237,194,0.44)',
    shadow: 'rgba(82,57,32,0.24)',
    contactShadow: 'rgba(70,46,25,0.32)',
  },
  withered: {
    topLight: '#d0c0aa',
    topDark: '#a08868',
    sideLight: '#8a7458',
    sideDark: '#6a5640',
    edge: '#62513f',
    highlight: 'rgba(252,249,244,0.32)',
    shadow: 'rgba(68,55,44,0.2)',
    contactShadow: 'rgba(56,43,34,0.28)',
  },
  stolen: {
    topLight: '#d49488',
    topDark: '#a45850',
    sideLight: '#964e48',
    sideDark: '#703830',
    edge: '#6a3934',
    highlight: 'rgba(255,224,216,0.36)',
    shadow: 'rgba(78,46,40,0.22)',
    contactShadow: 'rgba(69,36,31,0.3)',
  },
  locked: {
    topLight: '#d8c6a8',
    topDark: '#ac9070',
    sideLight: '#987c58',
    sideDark: '#725e40',
    edge: '#65523f',
    highlight: 'rgba(255,252,245,0.3)',
    shadow: 'rgba(69,57,45,0.18)',
    contactShadow: 'rgba(61,48,37,0.28)',
  },
};

export function IsometricPlotShell({ size, state, children }: IsometricPlotShellProps) {
  const gradientId = useId().replace(/:/g, '');
  const palette = PALETTES[state];

  // Rectangular bed dimensions
  const bedWidth = size;
  const bedHeight = Math.round(size * 0.58);
  const depth = Math.max(8, Math.round(size * 0.11));
  const cornerR = Math.round(size * 0.08);
  const shadowPad = Math.max(6, Math.round(size * 0.06));
  const shellHeight = bedHeight + depth + shadowPad;

  const contentWidth = Math.round(size * 0.88);
  const contentHeight = Math.round(bedHeight * 0.84);
  const contentTop = Math.round(bedHeight * 0.08);

  // SVG rounded rect path for the top face
  const topPath = `M ${cornerR} 0 L ${bedWidth - cornerR} 0 Q ${bedWidth} 0 ${bedWidth} ${cornerR} L ${bedWidth} ${bedHeight - cornerR} Q ${bedWidth} ${bedHeight} ${bedWidth - cornerR} ${bedHeight} L ${cornerR} ${bedHeight} Q 0 ${bedHeight} 0 ${bedHeight - cornerR} L 0 ${cornerR} Q 0 0 ${cornerR} 0 Z`;

  // Side face (bottom edge depth)
  const sidePath = `M 0 ${bedHeight - cornerR} Q 0 ${bedHeight} ${cornerR} ${bedHeight} L ${bedWidth - cornerR} ${bedHeight} Q ${bedWidth} ${bedHeight} ${bedWidth} ${bedHeight - cornerR} L ${bedWidth} ${bedHeight - cornerR + depth} Q ${bedWidth} ${bedHeight + depth} ${bedWidth - cornerR} ${bedHeight + depth} L ${cornerR} ${bedHeight + depth} Q 0 ${bedHeight + depth} 0 ${bedHeight - cornerR + depth} Z`;

  return (
    <div className="relative overflow-visible" style={{ width: bedWidth, height: shellHeight }}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 ${bedWidth} ${shellHeight}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`top-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.topLight} />
            <stop offset="100%" stopColor={palette.topDark} />
          </linearGradient>
          <linearGradient id={`side-${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.sideLight} />
            <stop offset="100%" stopColor={palette.sideDark} />
          </linearGradient>
          <radialGradient id={`shine-${gradientId}`} cx="38%" cy="28%" r="72%">
            <stop offset="0%" stopColor={palette.highlight} />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id={`shadow-${gradientId}`} x="-20%" y="-40%" width="140%" height="200%">
            <feGaussianBlur stdDeviation={Math.max(1.2, size * 0.012)} />
          </filter>
          <filter id={`grain-${gradientId}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="grayNoise" />
            <feComponentTransfer in="grayNoise" result="softNoise">
              <feFuncA type="table" tableValues="0 0.05" />
            </feComponentTransfer>
          </filter>
        </defs>

        {/* Ground shadow */}
        <ellipse
          cx={bedWidth * 0.5}
          cy={bedHeight + depth + shadowPad * 0.4}
          rx={bedWidth * 0.46}
          ry={shadowPad * 0.6}
          fill={palette.shadow}
          filter={`url(#shadow-${gradientId})`}
        />
        <ellipse
          cx={bedWidth * 0.5}
          cy={bedHeight + depth + 1}
          rx={bedWidth * 0.42}
          ry={Math.max(2, depth * 0.3)}
          fill={palette.contactShadow}
          opacity="0.7"
        />

        {/* Side face (depth) */}
        <path
          d={sidePath}
          fill={`url(#side-${gradientId})`}
          stroke={palette.edge}
          strokeWidth={Math.max(0.8, size * 0.008)}
          strokeLinejoin="round"
        />

        {/* Top face */}
        <path
          d={topPath}
          fill={`url(#top-${gradientId})`}
          stroke={palette.edge}
          strokeWidth={Math.max(1.2, size * 0.014)}
          strokeLinejoin="round"
        />
        {/* Shine overlay */}
        <path d={topPath} fill={`url(#shine-${gradientId})`} opacity="0.48" />
        {/* Grain texture */}
        <path d={topPath} fill="#ffffff" filter={`url(#grain-${gradientId})`} opacity="0.28" />
        {/* Top edge highlight */}
        <path
          d={`M ${cornerR} 0 L ${bedWidth - cornerR} 0 Q ${bedWidth} 0 ${bedWidth} ${cornerR}`}
          stroke={palette.highlight}
          strokeWidth={Math.max(0.8, size * 0.008)}
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      <div
        className="absolute left-1/2 z-20 -translate-x-1/2 overflow-visible"
        style={{ top: contentTop, width: contentWidth, height: contentHeight }}
      >
        {children}
      </div>
    </div>
  );
}
