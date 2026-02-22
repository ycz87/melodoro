/**
 * FarmEnvironment - Full-screen farm background.
 *
 * Recreates a simple cartoon farm scene with a clear sky/grass split,
 * smiling sun, rounded clouds and weather overlays.
 */
import type { Weather } from '../../types/farm';

interface FarmEnvironmentProps {
  weather?: Weather | null;
}

interface CloudPosition {
  left: string;
  top: string;
  scale: number;
}

const SUN_RAY_ANGLES = [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320] as const;

const CLOUD_POSITIONS: CloudPosition[] = [
  { left: '20%', top: '15%', scale: 1.02 },
  { left: '44%', top: '10%', scale: 0.9 },
  { left: '70%', top: '14%', scale: 1.02 },
  { left: '86%', top: '21%', scale: 0.84 },
];

function getWeatherOverlay(weather: Weather | null | undefined): string | null {
  if (weather === 'sunny') {
    return 'radial-gradient(circle at 82% 16%, rgba(255,245,203,0.3) 0%, rgba(255,245,203,0) 36%)';
  }
  if (weather === 'cloudy') {
    return 'linear-gradient(to bottom, rgba(120,136,150,0.24) 0%, rgba(120,136,150,0.08) 44%, rgba(74,103,74,0.1) 100%)';
  }
  if (weather === 'rainy') {
    return 'linear-gradient(to bottom, rgba(36,67,99,0.34) 0%, rgba(36,67,99,0.16) 45%, rgba(24,56,40,0.2) 100%), repeating-linear-gradient(105deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 1px, rgba(255,255,255,0) 4px, rgba(255,255,255,0) 12px)';
  }
  if (weather === 'night') {
    return 'linear-gradient(to bottom, rgba(6,20,44,0.32) 0%, rgba(10,30,58,0.22) 44%, rgba(20,48,40,0.25) 100%)';
  }
  if (weather === 'rainbow') {
    return 'radial-gradient(circle at 24% 18%, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0) 34%), linear-gradient(112deg, rgba(255,0,0,0.18) 0%, rgba(255,127,0,0.18) 16%, rgba(255,255,0,0.16) 32%, rgba(0,255,0,0.15) 48%, rgba(0,127,255,0.14) 64%, rgba(0,0,255,0.15) 80%, rgba(139,0,255,0.18) 100%)';
  }
  if (weather === 'snowy') {
    return 'linear-gradient(to bottom, rgba(208,227,255,0.3) 0%, rgba(228,240,255,0.22) 45%, rgba(226,242,232,0.24) 100%), radial-gradient(circle at 26% 16%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0) 34%)';
  }
  if (weather === 'stormy') {
    return 'linear-gradient(to bottom, rgba(18,24,42,0.68) 0%, rgba(24,30,46,0.46) 40%, rgba(18,35,30,0.46) 100%), radial-gradient(circle at 78% 18%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 30%)';
  }
  return null;
}

function Cloud({ left, top, scale }: CloudPosition) {
  return (
    <svg
      className="absolute"
      style={{
        left,
        top,
        width: `${114 * scale}px`,
        height: `${62 * scale}px`,
      }}
      viewBox="0 0 114 62"
    >
      <ellipse cx="57" cy="52" rx="42" ry="8" fill="#E0E0E0" opacity="0.6" />
      <path
        d="M15 43 C11 33 17 21 30 20 C33 11 43 6 53 8 C60 2 73 2 80 8 C90 8 99 16 101 26 C108 26 113 31 113 38 C113 47 104 53 94 53 H24 C15 53 7 48 7 41 C7 39 9 36 15 43 Z"
        fill="#FFFFFF"
      />
      <path
        d="M15 44 C12 34 18 22 30 22 C34 13 44 8 53 10 C60 4 72 4 79 10 C88 10 98 17 100 27 C106 27 111 32 111 38 C111 45 103 51 94 51 H25 C17 51 9 46 9 40 C9 38 11 36 15 44 Z"
        fill="none"
        stroke="#E0E0E0"
        strokeWidth="2"
      />
    </svg>
  );
}

export function FarmEnvironment({ weather = null }: FarmEnvironmentProps) {
  const weatherOverlay = getWeatherOverlay(weather);

  return (
    <div className="pointer-events-none absolute inset-0 z-[-1] overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, #87CEEB 0%, #E0F6FF 50%, #C8E6A0 50%, #C8E6A0 100%)',
        }}
      />

      <svg
        className="absolute left-[8%] top-[8%] h-[96px] w-[96px] sm:h-[114px] sm:w-[114px]"
        viewBox="0 0 120 120"
      >
        <circle cx="60" cy="60" r="30" fill="#FFD767" stroke="#E5AB33" strokeWidth="4" />
        {SUN_RAY_ANGLES.map((angle) => {
          const radian = (angle * Math.PI) / 180;
          const x1 = 60 + Math.cos(radian) * 38;
          const y1 = 60 + Math.sin(radian) * 38;
          const x2 = 60 + Math.cos(radian) * 50;
          const y2 = 60 + Math.sin(radian) * 50;
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#E5AB33"
              strokeWidth="5"
              strokeLinecap="round"
            />
          );
        })}
        <circle cx="49" cy="56" r="3.5" fill="#6E4A1F" />
        <circle cx="71" cy="56" r="3.5" fill="#6E4A1F" />
        <circle cx="42" cy="66" r="3.4" fill="#FFB89B" />
        <circle cx="78" cy="66" r="3.4" fill="#FFB89B" />
        <path d="M47 72 Q60 83 73 72" stroke="#6E4A1F" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </svg>

      {CLOUD_POSITIONS.map((cloud) => (
        <Cloud key={`${cloud.left}-${cloud.top}`} left={cloud.left} top={cloud.top} scale={cloud.scale} />
      ))}

      {weatherOverlay && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: weatherOverlay,
          }}
        />
      )}
    </div>
  );
}
