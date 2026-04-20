/**
 * SkyLayer — 农场天空层
 *
 * 按当前时间渲染太阳或月亮，并根据时段计算天空中的固定位置。
 */
import { useMemo } from 'react';
import type { Weather } from '../../types/farm';

interface SkyLayerProps {
  weather: Weather;
  currentTime: Date;
}

interface CelestialPosition {
  x: string;
  y: string;
}

const CLOUD_LAYOUTS: Record<number, CelestialPosition[]> = {
  0: [],
  1: [
    { x: '68%', y: '14%' },
  ],
  4: [
    { x: '18%', y: '12%' },
    { x: '72%', y: '10%' },
    { x: '38%', y: '22%' },
    { x: '84%', y: '26%' },
  ],
  5: [
    { x: '14%', y: '12%' },
    { x: '66%', y: '9%' },
    { x: '34%', y: '20%' },
    { x: '82%', y: '24%' },
    { x: '54%', y: '30%' },
  ],
  6: [
    { x: '12%', y: '10%' },
    { x: '46%', y: '8%' },
    { x: '78%', y: '12%' },
    { x: '28%', y: '22%' },
    { x: '64%', y: '24%' },
    { x: '86%', y: '30%' },
  ],
};

function getCloudCount(weather: Weather): number {
  if (weather === 'sunny') return 1;
  if (weather === 'cloudy') return 4;
  if (weather === 'rainy') return 5;
  return 0;
}

function getSunPosition(hour: number): CelestialPosition {
  if (hour >= 6 && hour < 10) {
    return { x: '80%', y: '20%' };
  }
  if (hour >= 10 && hour < 14) {
    return { x: '50%', y: '10%' };
  }
  return { x: '20%', y: '20%' };
}

export function SkyLayer({ weather, currentTime }: SkyLayerProps) {
  const hour = currentTime.getHours();
  const isNight = hour < 6 || hour >= 18;
  const position = isNight ? { x: '75%', y: '15%' } : getSunPosition(hour);
  const cloudCount = getCloudCount(weather);
  const cloudPositions = useMemo<CelestialPosition[]>(
    () => CLOUD_LAYOUTS[cloudCount] ?? [],
    [cloudCount],
  );

  return (
    <div className="w-full h-full relative" data-weather={weather}>
      <span
        className={`absolute z-10 opacity-90 select-none pointer-events-none ${isNight ? 'text-5xl' : 'text-6xl'}`}
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
        }}
        role="img"
        aria-label={isNight ? 'moon' : 'sun'}
      >
        {isNight ? '🌙' : '☀️'}
      </span>
      {cloudPositions.map((cloudPosition, index) => (
        <span
          key={`${cloudPosition.x}-${cloudPosition.y}-${index}`}
          className="absolute z-20 text-4xl opacity-75 select-none pointer-events-none"
          style={{
            left: cloudPosition.x,
            top: cloudPosition.y,
            transform: 'translate(-50%, -50%)',
          }}
          aria-hidden="true"
        >
          ☁️
        </span>
      ))}
    </div>
  );
}
