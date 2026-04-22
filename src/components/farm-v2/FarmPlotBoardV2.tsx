import { useEffect, useMemo, useRef, useState } from 'react';
import type { Plot, Weather } from '../../types/farm';
import { WEATHER_ICON_MAP } from '../../utils/weather';
import { FarmPlotTileV2 } from './FarmPlotTileV2';

interface FarmPlotBoardV2Props {
  plots: Plot[];
  weather: Weather;
  weatherLabel: string;
  compactMode?: boolean;
  todayFocusMinutes: number;
  coinBalance: number;
  plantableSeedCount: number;
  harvestablePlotCount: number;
  onPlotClick?: (plotId: number, state: 'empty' | 'growing' | 'mature') => void;
}

interface CloudSpec {
  top: string;
  left?: string;
  right?: string;
  width: string;
  height: string;
  opacity: number;
  duration: string;
  delay: string;
  filter?: string;
  zIndex?: number;
}

interface RainLayerSpec {
  top: string;
  topCompact?: string;
  topTight?: string;
  height: string;
  heightCompact?: string;
  heightTight?: string;
  left?: string;
  leftCompact?: string;
  leftTight?: string;
  width: string;
  widthCompact?: string;
  widthTight?: string;
  opacity: number;
  blur: string;
  duration: string;
  delay: string;
  angle: number;
  stripeGap: number;
  stripeWidth: number;
  tint: string;
}

interface RainbowSpec {
  top: string;
  topCompact?: string;
  topTight?: string;
  left: string;
  leftCompact?: string;
  leftTight?: string;
  width: string;
  widthCompact?: string;
  widthTight?: string;
  height: string;
  heightCompact?: string;
  heightTight?: string;
  opacity: number;
  rotation?: string;
}

interface WeatherBackdropVisuals {
  sceneBackground: string;
  skyGradient: string;
  skyGradientTight: string;
  skyOverlay?: string;
  hillGradient: string;
  backHillGradient: string;
  frontHillGradient: string;
  grassGradient: string;
  foregroundGradient: string;
  celestialKind: 'sun' | 'moon';
  celestialHalo: string;
  celestialBody: string;
  celestialShadow: string;
  celestialOpacity: number;
  haloOpacity: number;
  cloudSpecs: CloudSpec[];
  rainLayers: RainLayerSpec[];
  rainbow: RainbowSpec | null;
}

const GRID_SIDE = 3;
const TOTAL_PLOTS = GRID_SIDE * GRID_SIDE;
const MOTION_CLASS = 'farm-v2-motion';
const WEATHER_TRANSITION_MS = 320;

interface WeatherTransitionOverlayState {
  previousWeather: Weather;
  nextWeather: Weather;
  token: number;
}

function getBackdropTestId(prefix: string, suffix: string) {
  return `${prefix}-${suffix}`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getViewportHeightPx() {
  if (typeof window === 'undefined') return null;
  const visualViewportHeight = window.visualViewport?.height;
  if (typeof visualViewportHeight === 'number' && Number.isFinite(visualViewportHeight) && visualViewportHeight > 0) {
    return visualViewportHeight;
  }
  return window.innerHeight;
}

function useViewportHeightPx(enabled: boolean) {
  const [heightPx, setHeightPx] = useState<number | null>(() => (enabled ? getViewportHeightPx() : null));

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const updateHeight = () => setHeightPx(getViewportHeightPx());
    updateHeight();

    window.addEventListener('resize', updateHeight);
    window.visualViewport?.addEventListener('resize', updateHeight);
    window.visualViewport?.addEventListener('scroll', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
      window.visualViewport?.removeEventListener('resize', updateHeight);
      window.visualViewport?.removeEventListener('scroll', updateHeight);
    };
  }, [enabled]);

  return heightPx;
}

const SUNNY_CLOUDS: CloudSpec[] = [
  { top: '3%', left: '6%', width: '22%', height: '10%', opacity: 0.74, duration: '13s', delay: '-0.8s', filter: 'saturate(1.04) brightness(1.04)' },
  { top: '8%', left: '35%', width: '20%', height: '10%', opacity: 0.68, duration: '16s', delay: '-2.4s', filter: 'saturate(1.02) brightness(1.02)' },
  { top: '4%', right: '6%', width: '24%', height: '11%', opacity: 0.72, duration: '14s', delay: '-1.8s', filter: 'saturate(1.02) brightness(1.03)' },
];

const CLOUDY_CLOUDS: CloudSpec[] = [
  { top: '3%', left: '3%', width: '26%', height: '11%', opacity: 0.88, duration: '14s', delay: '-1.2s', filter: 'grayscale(0.18) brightness(0.96)', zIndex: 9 },
  { top: '7%', left: '26%', width: '24%', height: '11%', opacity: 0.92, duration: '17s', delay: '-2.8s', filter: 'grayscale(0.2) brightness(0.95)', zIndex: 9 },
  { top: '5%', right: '8%', width: '28%', height: '12%', opacity: 0.94, duration: '15s', delay: '-2s', filter: 'grayscale(0.22) brightness(0.94)', zIndex: 9 },
  { top: '10%', right: '30%', width: '22%', height: '10%', opacity: 0.82, duration: '18s', delay: '-1.4s', filter: 'grayscale(0.16) brightness(0.98)' },
];

const RAINY_CLOUDS: CloudSpec[] = [
  { top: '3%', left: '-3%', width: '32%', height: '12%', opacity: 0.94, duration: '16s', delay: '-1.8s', filter: 'grayscale(0.52) brightness(0.82)', zIndex: 9 },
  { top: '6%', left: '20%', width: '29%', height: '12%', opacity: 0.97, duration: '19s', delay: '-3s', filter: 'grayscale(0.56) brightness(0.8)', zIndex: 9 },
  { top: '4%', right: '3%', width: '31%', height: '13%', opacity: 0.98, duration: '18s', delay: '-2.2s', filter: 'grayscale(0.58) brightness(0.78)', zIndex: 9 },
  { top: '10%', left: '10%', width: '24%', height: '10%', opacity: 0.88, duration: '15s', delay: '-1s', filter: 'grayscale(0.5) brightness(0.84)' },
  { top: '11%', right: '24%', width: '22%', height: '10%', opacity: 0.86, duration: '17s', delay: '-2.4s', filter: 'grayscale(0.48) brightness(0.86)' },
];

const NIGHT_CLOUDS: CloudSpec[] = [
  { top: '4%', left: '7%', width: '24%', height: '10%', opacity: 0.7, duration: '13s', delay: '-0.8s', filter: 'saturate(0.62) brightness(0.58)' },
  { top: '9%', left: '35%', width: '21%', height: '10%', opacity: 0.64, duration: '16s', delay: '-2.4s', filter: 'saturate(0.58) brightness(0.56)' },
  { top: '5%', right: '7%', width: '25%', height: '11%', opacity: 0.7, duration: '14s', delay: '-1.8s', filter: 'saturate(0.62) brightness(0.58)' },
];

const RAINBOW_CLOUDS: CloudSpec[] = [
  { top: '4%', left: '4%', width: '22%', height: '10%', opacity: 0.76, duration: '13s', delay: '-0.8s', filter: 'grayscale(0.08) brightness(1.03)' },
  { top: '9%', left: '28%', width: '22%', height: '10%', opacity: 0.74, duration: '16s', delay: '-2.2s', filter: 'grayscale(0.08) brightness(1.02)' },
  { top: '5%', right: '6%', width: '24%', height: '11%', opacity: 0.78, duration: '14s', delay: '-1.5s', filter: 'grayscale(0.1) brightness(1.04)' },
  { top: '11%', right: '32%', width: '18%', height: '9%', opacity: 0.66, duration: '17s', delay: '-2.6s', filter: 'grayscale(0.05) brightness(1.05)' },
];

function getWeatherBackdropVisuals(weather: Weather): WeatherBackdropVisuals {
  switch (weather) {
    case 'cloudy':
      return {
        sceneBackground: 'linear-gradient(180deg, #7fb3cf 0%, #bfd4df 36%, #b5d0b1 58%, #9ebd85 80%, #8fb26d 100%)',
        skyGradient: 'linear-gradient(180deg, #7ca9c4 0%, #bfd0da 62%, #dde8ec 100%)',
        skyGradientTight: 'linear-gradient(180deg, #7ea9c2 0%, #b8c9d4 54%, #d4dfe5 100%)',
        skyOverlay: 'linear-gradient(180deg, rgba(132,156,177,0.22) 0%, rgba(132,156,177,0.08) 60%, rgba(255,255,255,0) 100%)',
        hillGradient: 'linear-gradient(180deg, #ccdcbf 0%, #b3cca7 44%, #96b784 100%)',
        backHillGradient: 'linear-gradient(180deg, rgba(139,179,117,0.88) 0%, rgba(105,152,86,0.92) 100%)',
        frontHillGradient: 'linear-gradient(180deg, rgba(161,196,130,0.82) 0%, rgba(115,165,95,0.86) 100%)',
        grassGradient: 'linear-gradient(180deg, #a0ce88 0%, #8aba68 45%, #7eb75c 100%)',
        foregroundGradient: 'linear-gradient(180deg, rgba(150,194,125,0.3) 0%, rgba(118,172,89,0.48) 100%), repeating-linear-gradient(0deg, rgba(116,164,78,0.08) 0px, rgba(116,164,78,0.08) 22px, rgba(0,0,0,0) 22px, rgba(0,0,0,0) 56px)',
        celestialKind: 'sun',
        celestialHalo: 'radial-gradient(circle at 50% 50%, rgba(255,243,178,0.12) 0%, rgba(255,224,153,0.2) 46%, rgba(255,198,126,0) 100%)',
        celestialBody: 'radial-gradient(circle at 35% 30%, #fff4c9 0%, #efd99b 58%, #d7a871 100%)',
        celestialShadow: '0 0 0 2px rgba(255,226,168,0.18), 0 0 18px rgba(255,220,169,0.18)',
        celestialOpacity: 0.66,
        haloOpacity: 0.48,
        cloudSpecs: CLOUDY_CLOUDS,
        rainLayers: [],
        rainbow: null,
      };
    case 'rainy':
      return {
        sceneBackground: 'linear-gradient(180deg, #68879d 0%, #93a9b8 34%, #afc1b1 56%, #92b076 79%, #809f60 100%)',
        skyGradient: 'linear-gradient(180deg, #6c8ca4 0%, #90a8b8 52%, #b9c7cf 100%)',
        skyGradientTight: 'linear-gradient(180deg, #6e8ca2 0%, #8da4b4 50%, #b0bec7 100%)',
        skyOverlay: 'linear-gradient(180deg, rgba(70,95,115,0.34) 0%, rgba(70,95,115,0.18) 48%, rgba(70,95,115,0.04) 100%)',
        hillGradient: 'linear-gradient(180deg, #c2d0ba 0%, #aac09f 44%, #8eaa80 100%)',
        backHillGradient: 'linear-gradient(180deg, rgba(130,165,111,0.86) 0%, rgba(95,136,77,0.9) 100%)',
        frontHillGradient: 'linear-gradient(180deg, rgba(148,179,122,0.8) 0%, rgba(104,148,82,0.84) 100%)',
        grassGradient: 'linear-gradient(180deg, #96c07d 0%, #7fad5f 45%, #739f55 100%)',
        foregroundGradient: 'linear-gradient(180deg, rgba(126,154,109,0.36) 0%, rgba(102,133,82,0.56) 100%), repeating-linear-gradient(0deg, rgba(104,144,72,0.08) 0px, rgba(104,144,72,0.08) 22px, rgba(0,0,0,0) 22px, rgba(0,0,0,0) 56px)',
        celestialKind: 'sun',
        celestialHalo: 'radial-gradient(circle at 50% 50%, rgba(255,239,184,0.08) 0%, rgba(247,223,166,0.16) 40%, rgba(191,171,133,0) 100%)',
        celestialBody: 'radial-gradient(circle at 35% 30%, #ecd9b1 0%, #c7ab77 60%, #98714d 100%)',
        celestialShadow: '0 0 0 2px rgba(234,218,190,0.1), 0 0 16px rgba(207,194,169,0.14)',
        celestialOpacity: 0.28,
        haloOpacity: 0.18,
        cloudSpecs: RAINY_CLOUDS,
        rainLayers: [
          {
            top: '12%',
            topCompact: '12%',
            topTight: '12%',
            height: '30%',
            heightCompact: '18%',
            heightTight: '22%',
            left: '-4%',
            leftCompact: '-6%',
            leftTight: '-8%',
            width: '112%',
            widthCompact: '116%',
            widthTight: '118%',
            opacity: 0.42,
            blur: '0.4px',
            duration: '1.25s',
            delay: '-0.2s',
            angle: 101,
            stripeGap: 18,
            stripeWidth: 2,
            tint: 'rgba(220, 238, 255, 0.7)',
          },
          {
            top: '15%',
            topCompact: '15%',
            topTight: '14%',
            height: '26%',
            heightCompact: '16%',
            heightTight: '20%',
            left: '-2%',
            leftCompact: '-5%',
            leftTight: '-6%',
            width: '108%',
            widthCompact: '112%',
            widthTight: '114%',
            opacity: 0.28,
            blur: '0.8px',
            duration: '1.7s',
            delay: '-1.1s',
            angle: 99,
            stripeGap: 24,
            stripeWidth: 2,
            tint: 'rgba(186, 210, 234, 0.66)',
          },
        ],
        rainbow: null,
      };
    case 'night':
      return {
        sceneBackground: 'linear-gradient(180deg, #16314f 0%, #355374 38%, #56714e 58%, #638853 80%, #5d7f4c 100%)',
        skyGradient: 'linear-gradient(180deg, #112845 0%, #23486a 56%, #486987 100%)',
        skyGradientTight: 'linear-gradient(180deg, #132845 0%, #264669 50%, #456685 100%)',
        skyOverlay: 'linear-gradient(180deg, rgba(16,24,45,0.28) 0%, rgba(16,24,45,0.08) 65%, rgba(16,24,45,0) 100%)',
        hillGradient: 'linear-gradient(180deg, #6f8c7b 0%, #668773 42%, #557058 100%)',
        backHillGradient: 'linear-gradient(180deg, rgba(87,126,92,0.88) 0%, rgba(63,94,68,0.92) 100%)',
        frontHillGradient: 'linear-gradient(180deg, rgba(101,147,103,0.8) 0%, rgba(70,110,73,0.86) 100%)',
        grassGradient: 'linear-gradient(180deg, #6f9c67 0%, #5f8c57 45%, #507949 100%)',
        foregroundGradient: 'linear-gradient(180deg, rgba(77,111,82,0.22) 0%, rgba(52,76,54,0.42) 100%), repeating-linear-gradient(0deg, rgba(83,122,67,0.08) 0px, rgba(83,122,67,0.08) 22px, rgba(0,0,0,0) 22px, rgba(0,0,0,0) 56px)',
        celestialKind: 'moon',
        celestialHalo: 'radial-gradient(circle at 50% 50%, rgba(238,245,255,0.2) 0%, rgba(215,229,255,0.38) 44%, rgba(186,204,236,0) 100%)',
        celestialBody: 'radial-gradient(circle at 35% 30%, #fcfdff 0%, #e6efff 58%, #b8cae3 100%)',
        celestialShadow: '0 0 0 2px rgba(233,242,255,0.34), 0 0 24px rgba(211,224,249,0.42)',
        celestialOpacity: 1,
        haloOpacity: 1,
        cloudSpecs: NIGHT_CLOUDS,
        rainLayers: [],
        rainbow: null,
      };
    case 'rainbow':
      return {
        sceneBackground: 'linear-gradient(180deg, #89d6fb 0%, #d7f2ff 38%, #c7ecb7 58%, #a9dd85 80%, #92cf6a 100%)',
        skyGradient: 'linear-gradient(180deg, #86d6ff 0%, #d6f1ff 62%, #eefdf3 100%)',
        skyGradientTight: 'linear-gradient(180deg, #89d6fc 0%, #cfedff 54%, #e6f8ef 100%)',
        skyOverlay: 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(252,227,181,0.08) 58%, rgba(255,255,255,0) 100%)',
        hillGradient: 'linear-gradient(180deg, #d8edc9 0%, #c1e3b1 44%, #9ed187 100%)',
        backHillGradient: 'linear-gradient(180deg, rgba(152,203,120,0.9) 0%, rgba(118,178,87,0.94) 100%)',
        frontHillGradient: 'linear-gradient(180deg, rgba(171,217,137,0.84) 0%, rgba(127,187,96,0.88) 100%)',
        grassGradient: 'linear-gradient(180deg, #afdf96 0%, #98d473 45%, #8ccf67 100%)',
        foregroundGradient: 'linear-gradient(180deg, rgba(171,223,151,0.34) 0%, rgba(136,197,96,0.54) 100%), repeating-linear-gradient(0deg, rgba(123,182,78,0.08) 0px, rgba(123,182,78,0.08) 22px, rgba(0,0,0,0) 22px, rgba(0,0,0,0) 56px)',
        celestialKind: 'sun',
        celestialHalo: 'radial-gradient(circle at 50% 50%, rgba(255,244,195,0.18) 0%, rgba(255,213,126,0.28) 46%, rgba(255,179,80,0) 100%)',
        celestialBody: 'radial-gradient(circle at 35% 30%, #fff2b8 0%, #ffd97c 60%, #f0aa45 100%)',
        celestialShadow: '0 0 0 2px rgba(255,223,144,0.28), 0 0 22px rgba(255,206,110,0.32)',
        celestialOpacity: 0.92,
        haloOpacity: 0.72,
        cloudSpecs: RAINBOW_CLOUDS,
        rainLayers: [],
        rainbow: {
          top: '8%',
          topCompact: '9%',
          topTight: '10%',
          left: '8%',
          leftCompact: '6%',
          leftTight: '2%',
          width: '44%',
          widthCompact: '44%',
          widthTight: '50%',
          height: '26%',
          heightCompact: '22%',
          heightTight: '20%',
          opacity: 0.96,
          rotation: '-5deg',
        },
      };
    default:
      return {
        sceneBackground: 'linear-gradient(180deg, #88d5fb 0%, #c9efff 38%, #b9e7ab 58%, #9fd97b 80%, #8ccc65 100%)',
        skyGradient: 'linear-gradient(180deg, #7fd3ff 0%, #bdeeff 66%, #e6fbff 100%)',
        skyGradientTight: 'linear-gradient(180deg, #82d4fb 0%, #b7ebff 58%, #d8f3ea 100%)',
        skyOverlay: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 55%, rgba(255,255,255,0) 100%)',
        hillGradient: 'linear-gradient(180deg, #d8efcb 0%, #c0e0af 44%, #9ecc88 100%)',
        backHillGradient: 'linear-gradient(180deg, rgba(151,198,115,0.9) 0%, rgba(116,171,86,0.94) 100%)',
        frontHillGradient: 'linear-gradient(180deg, rgba(171,212,132,0.86) 0%, rgba(126,182,94,0.88) 100%)',
        grassGradient: 'linear-gradient(180deg, #a8de90 0%, #95d06f 45%, #89c761 100%)',
        foregroundGradient: 'linear-gradient(180deg, rgba(161,215,124,0.34) 0%, rgba(130,194,86,0.54) 100%), repeating-linear-gradient(0deg, rgba(123,182,78,0.08) 0px, rgba(123,182,78,0.08) 22px, rgba(0,0,0,0) 22px, rgba(0,0,0,0) 56px)',
        celestialKind: 'sun',
        celestialHalo: 'radial-gradient(circle at 50% 50%, rgba(255,243,178,0.2) 0%, rgba(255,209,106,0.34) 48%, rgba(255,179,80,0) 100%)',
        celestialBody: 'radial-gradient(circle at 35% 30%, #fff2b0 0%, #ffd56f 60%, #f0a640 100%)',
        celestialShadow: '0 0 0 2px rgba(255,215,124,0.34), 0 0 22px rgba(255,202,94,0.46)',
        celestialOpacity: 1,
        haloOpacity: 1,
        cloudSpecs: SUNNY_CLOUDS,
        rainLayers: [],
        rainbow: null,
      };
  }
}

function mapPlotStateToTileState(plot: Plot | null) {
  if (!plot) return 'locked' as const;
  if (plot.state === 'mature') return 'mature' as const;
  if (plot.state === 'growing') return 'growing' as const;
  return 'empty' as const;
}

function FarmHudV2({
  compactMode,
  useTightMobileSpacing,
  weather,
  weatherLabel,
  todayFocusMinutes,
  coinBalance,
  plantableSeedCount,
  harvestablePlotCount,
}: {
  compactMode: boolean;
  useTightMobileSpacing: boolean;
  weather: Weather;
  weatherLabel: string;
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
        className={`mx-auto w-full px-2 ${useTightMobileSpacing ? 'pt-1 sm:pt-2' : 'pt-1 sm:pt-2'} sm:px-4`}
        style={{ maxWidth: compactMode ? '100%' : '940px' }}
      >
        <div
          className={`flex w-full items-center justify-center px-2 ${useTightMobileSpacing ? 'h-8 gap-1 sm:h-10 sm:gap-1.5 sm:px-3' : 'h-10 gap-1.5 sm:h-11 sm:gap-2 sm:px-4'}`}
          style={{
            borderBottom: '1px solid rgba(100,145,175,0.22)',
            background: 'linear-gradient(180deg, rgba(167,217,242,0.42) 0%, rgba(167,217,242,0.08) 100%)',
          }}
        >
          {badgeItems.map((badge) => (
            <div
              key={`farm-v2-hud-${badge.label}`}
              className={`flex items-center rounded-full border font-semibold ${useTightMobileSpacing ? 'gap-0.5 px-1.5 py-[1px] text-[10px] sm:gap-1 sm:px-2.5 sm:text-[11px]' : 'gap-1 px-2 py-[3px] text-[11px] sm:px-3 sm:text-xs'}`}
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

        <div className={`flex justify-center ${useTightMobileSpacing ? 'mt-1' : 'mt-1.5'}`}>
          <div
            data-testid="farm-v2-weather-badge"
            className={`flex items-center whitespace-nowrap rounded-full border font-semibold ${useTightMobileSpacing ? 'gap-1 px-2.5 py-[3px] text-[10px] sm:gap-1.5 sm:px-3.5 sm:text-[11px]' : 'gap-1.5 px-3 py-1 text-[11px] sm:gap-2 sm:px-3.5 sm:text-xs'}`}
            style={{
              borderColor: 'rgba(91, 146, 128, 0.32)',
              color: '#21503b',
              background: 'linear-gradient(180deg, rgba(245,255,249,0.96) 0%, rgba(229,247,237,0.92) 100%)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.42) inset',
            }}
          >
            <span aria-hidden="true">{WEATHER_ICON_MAP[weather]}</span>
            <span>{weatherLabel}</span>
          </div>
        </div>
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
  filter,
  zIndex,
  testId,
}: CloudSpec & { testId?: string }) {
  return (
    <div
      data-testid={testId}
      className={`absolute ${MOTION_CLASS}`}
      style={{
        top,
        left,
        right,
        zIndex: zIndex ?? 8,
        width,
        height,
        opacity,
        filter,
        animation: `farmV2CloudDrift ${duration} ease-in-out ${delay} infinite`,
      }}
    >
      <div className="absolute inset-x-[8%] bottom-[6%] top-[32%] rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.62) 100%)' }} />
      <div className="absolute left-[2%] top-[30%] h-[48%] w-[38%] rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(255,255,255,0.68) 100%)' }} />
      <div className="absolute right-[4%] top-[16%] h-[56%] w-[46%] rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.7) 100%)' }} />
      <div className="absolute left-[32%] top-[2%] h-[54%] w-[40%] rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.74) 100%)' }} />
    </div>
  );
}

function RainLayer({
  spec,
  compactMode,
  useTightBackdrop,
  testId,
}: {
  spec: RainLayerSpec;
  compactMode: boolean;
  useTightBackdrop: boolean;
  testId?: string;
}) {
  const top = compactMode
    ? spec.topCompact ?? spec.top
    : useTightBackdrop
      ? spec.topTight ?? spec.top
      : spec.top;
  const height = compactMode
    ? spec.heightCompact ?? spec.height
    : useTightBackdrop
      ? spec.heightTight ?? spec.height
      : spec.height;
  const left = compactMode
    ? spec.leftCompact ?? spec.left ?? '0%'
    : useTightBackdrop
      ? spec.leftTight ?? spec.left ?? '0%'
      : spec.left ?? '0%';
  const width = compactMode
    ? spec.widthCompact ?? spec.width
    : useTightBackdrop
      ? spec.widthTight ?? spec.width
      : spec.width;

  return (
    <div
      data-testid={testId}
      className="absolute z-[7] overflow-hidden"
      style={{
        top,
        left,
        width,
        height,
        opacity: spec.opacity,
      }}
    >
      <div
        className={`absolute inset-0 ${MOTION_CLASS}`}
        style={{
          background: `repeating-linear-gradient(${spec.angle}deg, ${spec.tint} 0px, ${spec.tint} ${spec.stripeWidth}px, rgba(255,255,255,0) ${spec.stripeWidth}px, rgba(255,255,255,0) ${spec.stripeGap}px)`,
          filter: `blur(${spec.blur})`,
          animation: `skyRainFallLong ${spec.duration} linear ${spec.delay} infinite`,
          transform: 'translateZ(0)',
        }}
      />
      <div
        className={`absolute inset-0 ${MOTION_CLASS}`}
        style={{
          background: `repeating-linear-gradient(${spec.angle - 3}deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) ${spec.stripeGap + 8}px)`,
          filter: `blur(calc(${spec.blur} + 0.6px))`,
          animation: `skyRainFallLong ${spec.duration} linear calc(${spec.delay} - 0.35s) infinite`,
          transform: 'translateZ(0)',
        }}
      />
    </div>
  );
}

function RainbowArc({
  spec,
  compactMode,
  useTightBackdrop,
  testId,
}: {
  spec: RainbowSpec;
  compactMode: boolean;
  useTightBackdrop: boolean;
  testId?: string;
}) {
  const top = compactMode
    ? spec.topCompact ?? spec.top
    : useTightBackdrop
      ? spec.topTight ?? spec.top
      : spec.top;
  const left = compactMode
    ? spec.leftCompact ?? spec.left
    : useTightBackdrop
      ? spec.leftTight ?? spec.left
      : spec.left;
  const width = compactMode
    ? spec.widthCompact ?? spec.width
    : useTightBackdrop
      ? spec.widthTight ?? spec.width
      : spec.width;
  const height = compactMode
    ? spec.heightCompact ?? spec.height
    : useTightBackdrop
      ? spec.heightTight ?? spec.height
      : spec.height;
  const stripeColors = ['#ff7b7b', '#ffaf5a', '#ffe066', '#7fdc76', '#69c6ff', '#b68cff'];

  return (
    <div
      data-testid={testId}
      className="absolute z-[6] overflow-hidden"
      style={{
        top,
        left,
        width,
        height,
        opacity: spec.opacity,
        transform: `rotate(${spec.rotation ?? '0deg'})`,
        filter: 'drop-shadow(0 10px 16px rgba(118, 182, 255, 0.16))',
      }}
    >
      <div className="absolute inset-0 rounded-t-[999px]" style={{ background: 'radial-gradient(circle at 50% 100%, rgba(255,255,255,0) 52%, rgba(255,255,255,0.18) 68%, rgba(255,255,255,0) 82%)' }} />
      {stripeColors.map((color, index) => (
        <div
          key={`farm-v2-rainbow-band-${color}`}
          className="absolute rounded-t-[999px] border-x border-t border-b-0"
          style={{
            inset: `${index * 7}px`,
            borderColor: color,
            borderWidth: compactMode || useTightBackdrop ? '4px' : '5px',
            opacity: 0.92 - index * 0.06,
          }}
        />
      ))}
      <div
        className="absolute left-[14%] right-[14%] bottom-0 rounded-t-[999px]"
        style={{
          top: compactMode || useTightBackdrop ? '36%' : '34%',
          background: 'linear-gradient(180deg, rgba(215,243,255,0.14) 0%, rgba(215,243,255,0) 100%)',
        }}
      />
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

function FarmBackdropV2({
  compactMode,
  weather,
  testIdPrefix = 'farm-v2',
}: {
  compactMode: boolean;
  weather: Weather;
  testIdPrefix?: string;
}) {
  const isNarrowScreen = typeof window !== 'undefined' && window.innerWidth < 640;
  const useCompactMobilePolish = isNarrowScreen && compactMode;
  const useTightBackdrop = isNarrowScreen && !compactMode;
  const visuals = getWeatherBackdropVisuals(weather);
  const isNight = visuals.celestialKind === 'moon';
  const tightBackdropMetrics = useTightBackdrop
    ? {
      skyHeight: '18.8%',
      hillTop: '18.8%',
      hillHeight: '12.8%',
      backHillTop: '20.5%',
      backHillHeight: '13.9%',
      frontHillTop: '22.9%',
      frontHillHeight: '10.6%',
      grassTop: '31.9%',
      pathTop: '28.1%',
      leftTreeTop: '28.5%',
      cottageTop: '29.2%',
      rightTreeTop: '28.6%',
      fenceTop: '35.1%',
      foregroundTop: '40.8%',
    }
    : null;
  const skyHeight = compactMode
    ? useCompactMobilePolish
      ? '23.8%'
      : '28%'
    : useTightBackdrop
      ? (tightBackdropMetrics?.skyHeight ?? '18.8%')
      : '27%';

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        data-testid={getBackdropTestId(testIdPrefix, 'sky-layer')}
        className="absolute inset-x-0 top-0 z-[1]"
        style={{
          height: skyHeight,
          background: useTightBackdrop ? visuals.skyGradientTight : visuals.skyGradient,
        }}
      />
      {visuals.skyOverlay && (
        <div
          className="absolute inset-x-0 top-0 z-[2]"
          style={{
            height: skyHeight,
            background: visuals.skyOverlay,
          }}
        />
      )}

      <div
        className="absolute inset-x-0 z-[2]"
        style={{
          top: compactMode
            ? useCompactMobilePolish
              ? '23.8%'
              : '28%'
            : useTightBackdrop
              ? (tightBackdropMetrics?.hillTop ?? '27%')
              : '27%',
          height: compactMode
            ? '16%'
            : useTightBackdrop
              ? (tightBackdropMetrics?.hillHeight ?? '16%')
              : '16%',
          background: visuals.hillGradient,
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
              ? (tightBackdropMetrics?.backHillTop ?? '28%')
              : '28%',
          height: compactMode
            ? '17.6%'
            : useTightBackdrop
              ? (tightBackdropMetrics?.backHillHeight ?? '13.9%')
              : '17.2%',
          borderRadius: '50% 50% 0 0 / 78% 78% 0 0',
          background: visuals.backHillGradient,
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
              ? (tightBackdropMetrics?.frontHillTop ?? '29.5%')
              : '29.5%',
          height: compactMode
            ? '13.6%'
            : useTightBackdrop
              ? (tightBackdropMetrics?.frontHillHeight ?? '10.6%')
              : '13.2%',
          borderRadius: '54% 46% 0 0 / 100% 100% 0 0',
          background: visuals.frontHillGradient,
        }}
      />

      <div
        className="absolute inset-x-0 bottom-0 z-[1]"
        style={{
          top: compactMode
            ? useCompactMobilePolish
              ? '39.2%'
              : '44%'
            : useTightBackdrop
              ? (tightBackdropMetrics?.grassTop ?? '43%')
              : '43%',
          background: visuals.grassGradient,
        }}
      />

      {visuals.rainbow && (
        <RainbowArc
          spec={visuals.rainbow}
          compactMode={compactMode}
          useTightBackdrop={useTightBackdrop || useCompactMobilePolish}
          testId={getBackdropTestId(testIdPrefix, 'rainbow')}
        />
      )}

      <div
        data-testid={getBackdropTestId(testIdPrefix, 'celestial-halo')}
        className={`absolute z-[6] rounded-full ${MOTION_CLASS}`}
        style={{
          top: compactMode ? '5%' : '4.5%',
          right: compactMode ? (isNight ? '14%' : '12%') : (isNight ? '18.5%' : '14%'),
          width: compactMode ? (isNight ? '82px' : '84px') : '98px',
          height: compactMode ? (isNight ? '82px' : '84px') : '98px',
          opacity: visuals.haloOpacity,
          background: visuals.celestialHalo,
          animation: 'farmV2SunHalo 5.6s ease-in-out -0.8s infinite',
        }}
      />
      <div
        className={`absolute ${isNight ? 'z-[9]' : 'z-[7]'} rounded-full ${MOTION_CLASS}`}
        data-testid={getBackdropTestId(testIdPrefix, 'celestial-body')}
        aria-label={isNight ? 'moon' : 'sun'}
        style={{
          top: compactMode ? (isNight ? '7.4%' : '7.2%') : (isNight ? '7%' : '6.8%'),
          right: compactMode ? (isNight ? '16.6%' : '14.4%') : (isNight ? '21%' : '16%'),
          width: compactMode ? (isNight ? '42px' : '46px') : (isNight ? '54px' : '56px'),
          height: compactMode ? (isNight ? '42px' : '46px') : (isNight ? '54px' : '56px'),
          opacity: visuals.celestialOpacity,
          background: visuals.celestialBody,
          boxShadow: visuals.celestialShadow,
          animation: 'farmV2SunFloat 7.8s ease-in-out -1.2s infinite',
        }}
      >
        {isNight && (
          <>
            <div
              className="absolute rounded-full"
              style={{
                left: '24%',
                top: '24%',
                width: '18%',
                height: '18%',
                background: 'rgba(178,194,219,0.32)',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                right: '26%',
                bottom: '22%',
                width: '14%',
                height: '14%',
                background: 'rgba(178,194,219,0.26)',
              }}
            />
          </>
        )}
      </div>

      {visuals.cloudSpecs.map((cloud, index) => (
        <CloudCluster
          key={`farm-v2-cloud-${weather}-${index}`}
          {...cloud}
          testId={getBackdropTestId(testIdPrefix, 'cloud-cluster')}
        />
      ))}
      {visuals.rainLayers.map((spec, index) => (
        <RainLayer
          key={`farm-v2-rain-${index}`}
          spec={spec}
          compactMode={compactMode}
          useTightBackdrop={useTightBackdrop || useCompactMobilePolish}
          testId={getBackdropTestId(testIdPrefix, 'rain-layer')}
        />
      ))}

      <div
        className="absolute z-[6]"
        style={{
          top: compactMode
            ? useCompactMobilePolish
              ? '26.4%'
              : '30.8%'
            : useTightBackdrop
              ? (tightBackdropMetrics?.pathTop ?? '29.8%')
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
            ? (tightBackdropMetrics?.leftTreeTop ?? '29.8%')
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
            ? (tightBackdropMetrics?.cottageTop ?? '30.2%')
            : '30.2%'}
      />
      <FruitTree
        right={compactMode ? '7.8%' : useTightBackdrop ? '7.2%' : '8.8%'}
        top={compactMode
          ? useCompactMobilePolish
            ? '26.1%'
            : '30.6%'
          : useTightBackdrop
            ? (tightBackdropMetrics?.rightTreeTop ?? '29.9%')
            : '29.9%'}
        scale={compactMode ? 0.86 : useTightBackdrop ? 0.92 : 0.98}
        testId="farm-v2-tree-right"
      />

      <div
        data-testid="farm-v2-fence"
        className="absolute left-[7%] right-[7%] z-[8]"
        style={{
          top: compactMode
            ? useCompactMobilePolish
              ? '35.6%'
              : '39.3%'
            : useTightBackdrop
              ? (tightBackdropMetrics?.fenceTop ?? '38.2%')
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
              ? (tightBackdropMetrics?.foregroundTop ?? '54%')
              : '54%',
          height: compactMode
            ? '44%'
            : useTightBackdrop
              ? `calc(100% - ${tightBackdropMetrics?.foregroundTop ?? '40.8%'})`
              : '46%',
          background: visuals.foregroundGradient,
        }}
      />
    </div>
  );
}

function FarmWeatherTransitionOverlay({
  compactMode,
  previousWeather,
  nextWeather,
  token,
}: {
  compactMode: boolean;
  previousWeather: Weather;
  nextWeather: Weather;
  token: number;
}) {
  const previousVisuals = getWeatherBackdropVisuals(previousWeather);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div
      data-testid="farm-v2-weather-transition-overlay"
      data-from-weather={previousWeather}
      data-to-weather={nextWeather}
      data-transition-token={String(token)}
      data-transition-ms={String(WEATHER_TRANSITION_MS)}
      className="pointer-events-none absolute inset-0 z-[12] overflow-hidden"
      style={{
        background: previousVisuals.sceneBackground,
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${WEATHER_TRANSITION_MS}ms ease-out`,
        willChange: 'opacity',
      }}
    >
      <FarmBackdropV2 compactMode={compactMode} weather={previousWeather} testIdPrefix="farm-v2-transition" />
    </div>
  );
}

function FarmBoardSceneDecorV2({
  compactMode,
  useTightMobileSpacing,
}: {
  compactMode: boolean;
  useTightMobileSpacing: boolean;
}) {
  if (useTightMobileSpacing) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-[999px]"
      style={{
        bottom: compactMode ? '-18px' : '-20px',
        height: '40px',
        width: compactMode ? 'calc(100% + 56px)' : 'calc(100% + 140px)',
        background: 'radial-gradient(circle at center, rgba(83,128,55,0.58) 0%, rgba(88,128,54,0.22) 56%, rgba(88,128,54,0) 100%)',
      }}
    />
  );
}

export function FarmPlotBoardV2({
  plots,
  weather,
  weatherLabel,
  compactMode = false,
  todayFocusMinutes,
  coinBalance,
  plantableSeedCount,
  harvestablePlotCount,
  onPlotClick,
}: FarmPlotBoardV2Props) {
  const previousWeatherRef = useRef(weather);
  const hasMountedRef = useRef(false);
  const transitionTokenRef = useRef(0);
  const activeTransitionTokenRef = useRef(0);
  const [transitionOverlay, setTransitionOverlay] = useState<WeatherTransitionOverlayState | null>(null);
  const [lastTransitionMeta, setLastTransitionMeta] = useState<WeatherTransitionOverlayState | null>(null);
  const [mountedTransitionToken, setMountedTransitionToken] = useState(0);
  const [clearedTransitionToken, setClearedTransitionToken] = useState(0);
  const displaySlots = useMemo(
    () => Array.from({ length: TOTAL_PLOTS }, (_, index) => ({
      plot: plots[index] ?? null,
      isLocked: index >= plots.length,
    })),
    [plots],
  );

  const isNarrowScreen = typeof window !== 'undefined' && window.innerWidth < 640;
  const useCompactMobilePolish = compactMode && isNarrowScreen;
  const useTightMobileSpacing = isNarrowScreen && !compactMode;
  const viewportHeightPx = useViewportHeightPx(useTightMobileSpacing || useCompactMobilePolish);
  const tightSceneHeightPx = useMemo(
    () => (useTightMobileSpacing ? clampNumber(Math.round((viewportHeightPx ?? 800) * 0.76), 600, 644) : null),
    [useTightMobileSpacing, viewportHeightPx],
  );
  const tightBoardPaddingTopPx = useMemo(
    () => (tightSceneHeightPx ? clampNumber(Math.round(tightSceneHeightPx * 0.35), 214, 232) : null),
    [tightSceneHeightPx],
  );

  const boardWidth = compactMode
    ? 'min(96vw, 500px)'
    : useTightMobileSpacing
      ? 'min(calc(100% - 24px), 470px)'
      : 'min(82vw, calc(100dvh - 290px), 620px)';
  const boardGap = compactMode
    ? 'clamp(6px, 1vw, 9px)'
    : useTightMobileSpacing
      ? 'clamp(5px, 0.9vw, 8px)'
      : 'clamp(8px, 0.8vw, 11px)';
  const sceneMinHeight = compactMode
    ? useCompactMobilePolish
      ? '100dvh'
      : 'min(100dvh, 630px)'
    : useTightMobileSpacing
      ? `${tightSceneHeightPx ?? 620}px`
      : 'min(76dvh, 660px)';
  const boardPaddingTop = compactMode
    ? useCompactMobilePolish
      ? 'clamp(162px, 29vh, 204px)'
      : 'clamp(168px, 31vh, 214px)'
    : useTightMobileSpacing
      ? `${tightBoardPaddingTopPx ?? 222}px`
      : 'clamp(96px, 14.5vh, 132px)';
  const boardPaddingBottom = compactMode
    ? useCompactMobilePolish
      ? 'clamp(4px, 0.8vh, 8px)'
      : 'clamp(6px, 1.1vh, 10px)'
    : useTightMobileSpacing
      ? 'calc(env(safe-area-inset-bottom, 0px) + 8px)'
      : 'clamp(18px, 2.5vh, 28px)';
  const hudWeatherBadgeOffset = useTightMobileSpacing ? 28 : compactMode ? 38 : 34;
  const backdropVisuals = getWeatherBackdropVisuals(weather);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      previousWeatherRef.current = weather;
      return;
    }

    if (previousWeatherRef.current === weather) {
      return;
    }

    transitionTokenRef.current += 1;
    const nextTransition = {
      previousWeather: previousWeatherRef.current,
      nextWeather: weather,
      token: transitionTokenRef.current,
    };
    setTransitionOverlay(nextTransition);
    setLastTransitionMeta(nextTransition);
    setMountedTransitionToken(nextTransition.token);
    activeTransitionTokenRef.current = nextTransition.token;
    previousWeatherRef.current = weather;
  }, [weather]);

  useEffect(() => {
    if (!transitionOverlay) {
      return;
    }

    const transitionToken = transitionOverlay.token;
    const timeoutId = window.setTimeout(() => {
      if (activeTransitionTokenRef.current !== transitionToken) {
        return;
      }

      activeTransitionTokenRef.current = 0;
      setTransitionOverlay(null);
      setClearedTransitionToken(transitionToken);
    }, WEATHER_TRANSITION_MS + 40);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [transitionOverlay]);

  return (
    <div
      data-testid="farm-v2-scene"
      data-current-weather={weather}
      data-transition-active={transitionOverlay ? 'true' : 'false'}
      data-last-transition-from={lastTransitionMeta?.previousWeather ?? ''}
      data-last-transition-to={lastTransitionMeta?.nextWeather ?? ''}
      data-last-transition-token={lastTransitionMeta ? String(lastTransitionMeta.token) : '0'}
      data-last-transition-mounted-token={String(mountedTransitionToken)}
      data-last-transition-cleared-token={String(clearedTransitionToken)}
      className="relative w-full overflow-hidden"
      style={{
        minHeight: sceneMinHeight,
        isolation: 'isolate',
        background: backdropVisuals.sceneBackground,
      }}
    >
      <FarmBackdropV2 compactMode={compactMode} weather={weather} />
      {transitionOverlay && (
        <FarmWeatherTransitionOverlay
          key={transitionOverlay.token}
          compactMode={compactMode}
          previousWeather={transitionOverlay.previousWeather}
          nextWeather={transitionOverlay.nextWeather}
          token={transitionOverlay.token}
        />
      )}
      <FarmHudV2
        compactMode={compactMode}
        useTightMobileSpacing={useTightMobileSpacing}
        weather={weather}
        weatherLabel={weatherLabel}
        todayFocusMinutes={todayFocusMinutes}
        coinBalance={coinBalance}
        plantableSeedCount={plantableSeedCount}
        harvestablePlotCount={harvestablePlotCount}
      />

      <div
        className={`relative z-20 mx-auto flex w-full justify-center ${useTightMobileSpacing ? 'px-2 sm:px-2' : 'px-0 sm:px-2'}`}
        style={{
          paddingTop: `calc(${boardPaddingTop} + ${hudWeatherBadgeOffset}px)`,
          paddingBottom: boardPaddingBottom,
        }}
      >
        <div className="relative" style={{ width: boardWidth }}>
          <FarmBoardSceneDecorV2 compactMode={compactMode} useTightMobileSpacing={useTightMobileSpacing} />
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
            {displaySlots.map(({ plot, isLocked }, index) => {
              const tileState = isLocked ? 'locked' : mapPlotStateToTileState(plot);
              const interactiveState = tileState === 'locked' ? null : tileState;
              return (
                <div
                  key={`farm-v2-slot-${plot?.id ?? index}`}
                  data-slot-state={tileState}
                  style={{
                    transform: `translateY(${Math.floor(index / GRID_SIDE) * (compactMode ? 2.4 : useTightMobileSpacing ? 2.2 : 3.2)}px)`,
                  }}
                >
                  <FarmPlotTileV2
                    state={tileState}
                    onClick={
                      onPlotClick && plot && interactiveState
                        ? () => onPlotClick(plot.id, interactiveState)
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
