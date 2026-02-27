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
  soilLight: string;
  soilDark: string;
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
    topLight: '#dba977',
    topDark: '#b77945',
    sideLight: '#a4673a',
    sideDark: '#85522f',
    soilLight: '#d9ad73',
    soilDark: '#bf8f59',
    edge: '#7b4f2d',
    highlight: 'rgba(255,234,197,0.52)',
    shadow: 'rgba(88,57,33,0.24)',
    contactShadow: 'rgba(74,46,25,0.32)',
  },
  growing: {
    topLight: '#dcab78',
    topDark: '#b77b46',
    sideLight: '#a36639',
    sideDark: '#84522e',
    soilLight: '#c9935d',
    soilDark: '#a77446',
    edge: '#764d2c',
    highlight: 'rgba(253,245,216,0.5)',
    shadow: 'rgba(84,56,34,0.24)',
    contactShadow: 'rgba(71,45,24,0.32)',
  },
  mature: {
    topLight: '#dfa66f',
    topDark: '#b5723f',
    sideLight: '#9e6235',
    sideDark: '#7f4d2b',
    soilLight: '#c1814e',
    soilDark: '#9e6437',
    edge: '#6f4526',
    highlight: 'rgba(255,231,187,0.48)',
    shadow: 'rgba(82,53,30,0.26)',
    contactShadow: 'rgba(67,41,22,0.34)',
  },
  withered: {
    topLight: '#c9b59a',
    topDark: '#9f8362',
    sideLight: '#896d50',
    sideDark: '#6b523c',
    soilLight: '#a78a69',
    soilDark: '#8a6e4d',
    edge: '#614d39',
    highlight: 'rgba(246,238,228,0.32)',
    shadow: 'rgba(68,55,44,0.2)',
    contactShadow: 'rgba(56,43,34,0.28)',
  },
  stolen: {
    topLight: '#cb8f84',
    topDark: '#9f544c',
    sideLight: '#934a43',
    sideDark: '#71372f',
    soilLight: '#b56f64',
    soilDark: '#934f47',
    edge: '#673730',
    highlight: 'rgba(255,222,215,0.36)',
    shadow: 'rgba(78,46,40,0.22)',
    contactShadow: 'rgba(69,36,31,0.3)',
  },
  locked: {
    topLight: '#cfbc9d',
    topDark: '#a88d6d',
    sideLight: '#957856',
    sideDark: '#745e41',
    soilLight: '#bba080',
    soilDark: '#9a7f60',
    edge: '#65523f',
    highlight: 'rgba(255,249,238,0.34)',
    shadow: 'rgba(69,57,45,0.18)',
    contactShadow: 'rgba(61,48,37,0.28)',
  },
};

export function IsometricPlotShell({ size, state, children }: IsometricPlotShellProps) {
  const gradientId = useId().replace(/:/g, '');
  const palette = PALETTES[state];

  // Chunkier near-square bed profile to strengthen the “thick soil” feel.
  const bedWidth = size;
  const bedHeight = Math.round(size * 0.84);
  const depth = Math.max(14, Math.round(size * 0.19));
  const cornerR = Math.round(size * 0.105);
  const shadowPad = Math.max(8, Math.round(size * 0.08));
  const shellHeight = bedHeight + depth + shadowPad;

  const inset = Math.max(8, Math.round(size * 0.095));
  const innerX = inset;
  const innerY = Math.max(7, Math.round(inset * 0.78));
  const innerWidth = Math.max(12, bedWidth - innerX * 2);
  const innerHeight = Math.max(12, bedHeight - innerY - inset * 1.08);
  const innerR = Math.max(8, Math.round(cornerR * 0.72));

  const contentWidth = Math.round(innerWidth * 0.9);
  const contentHeight = Math.round(innerHeight * 0.84);
  const contentTop = Math.round(innerY + (innerHeight - contentHeight) * 0.58);

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
          <linearGradient id={`soil-${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.soilLight} />
            <stop offset="100%" stopColor={palette.soilDark} />
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
          rx={bedWidth * 0.44}
          ry={Math.max(3, depth * 0.34)}
          fill={palette.contactShadow}
          opacity="0.78"
        />

        {/* Side face (depth) */}
        <path
          d={sidePath}
          fill={`url(#side-${gradientId})`}
          stroke={palette.edge}
          strokeWidth={Math.max(1.1, size * 0.011)}
          strokeLinejoin="round"
        />

        {/* Top face */}
        <path
          d={topPath}
          fill={`url(#top-${gradientId})`}
          stroke={palette.edge}
          strokeWidth={Math.max(1.4, size * 0.016)}
          strokeLinejoin="round"
        />

        {/* Inner soil pocket + rim to match cartoon farm tiles */}
        <rect
          x={innerX}
          y={innerY}
          width={innerWidth}
          height={innerHeight}
          rx={innerR}
          fill={`url(#soil-${gradientId})`}
          stroke="rgba(103,62,33,0.62)"
          strokeWidth={Math.max(1.1, size * 0.011)}
        />
        <path
          d={`M ${innerX + innerR} ${innerY} L ${innerX + innerWidth - innerR} ${innerY} Q ${innerX + innerWidth} ${innerY} ${innerX + innerWidth} ${innerY + innerR}`}
          stroke="rgba(255,223,174,0.64)"
          strokeWidth={Math.max(0.9, size * 0.009)}
          fill="none"
          strokeLinecap="round"
        />

        {/* Shine overlay */}
        <path d={topPath} fill={`url(#shine-${gradientId})`} opacity="0.42" />
        {/* Grain texture */}
        <path d={topPath} fill="#ffffff" filter={`url(#grain-${gradientId})`} opacity="0.22" />
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
