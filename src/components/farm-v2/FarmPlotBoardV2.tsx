import { useEffect, useMemo, useRef, useState } from 'react';
import type { Plot, TimeOfDay, TimeOfDayDebugOverride, Weather, WeatherDebugOverride, WeatherState } from '../../types/farm';
import { getWeatherContinuityPhase, getWeatherWetnessState, WEATHER_ICON_MAP } from '../../utils/weather';
import { FarmPlotTileV2 } from './FarmPlotTileV2';

interface FarmPlotBoardV2Props {
  plots: Plot[];
  weather: Weather;
  timeOfDay: TimeOfDay;
  weatherState: WeatherState;
  debugWeatherOverride: WeatherDebugOverride;
  debugTimeOfDayOverride: TimeOfDayDebugOverride;
  weatherLabel: string;
  forecastLabel: string;
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

interface TerrainBackdropVisuals {
  distantRidgeGradient: string;
  distantRidgeHighlight: string;
  distantRidgeShadow: string;
  backHillTexture: string;
  backHillHighlight: string;
  backHillShadow: string;
  frontHillTexture: string;
  frontHillHighlight: string;
  frontHillShadow: string;
  horizonMist: string;
  horizonMistOpacity: number;
  pathGradient: string;
  pathEdge: string;
  pathTexture: string;
}

interface CottageBackdropVisuals {
  groundShadow: string;
  path: string;
  pathEdge: string;
  shrub: string;
  shrubShadow: string;
  roof: string;
  roofShade: string;
  roofHighlight: string;
  roofTrim: string;
  wall: string;
  wallShade: string;
  wallTrim: string;
  door: string;
  doorGlow: string;
  window: string;
  windowGlow: string;
  windowFrame: string;
  chimney: string;
  smoke: string;
  filter?: string;
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
  terrain?: TerrainBackdropVisuals;
  cottage?: CottageBackdropVisuals;
}

const GRID_SIDE = 3;
const TOTAL_PLOTS = GRID_SIDE * GRID_SIDE;
const MOTION_CLASS = 'farm-v2-motion';
const WEATHER_TRANSITION_MS = 320;

interface WeatherTransitionOverlayState {
  previousWeather: Weather;
  nextWeather: Weather;
  previousTimeOfDay: TimeOfDay;
  nextTimeOfDay: TimeOfDay;
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

function getDayWeatherBackdropVisuals(weather: Weather): WeatherBackdropVisuals {
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

function getNightWeatherBackdropVisuals(weather: Weather): WeatherBackdropVisuals {
  const dayVisuals = getDayWeatherBackdropVisuals(weather);
  const nightBase: WeatherBackdropVisuals = {
    ...dayVisuals,
    sceneBackground: 'linear-gradient(180deg, #132844 0%, #294967 38%, #4a665c 58%, #526f4e 80%, #476541 100%)',
    skyGradient: 'linear-gradient(180deg, #0f243f 0%, #203f61 56%, #3d5d78 100%)',
    skyGradientTight: 'linear-gradient(180deg, #112540 0%, #213d5f 50%, #395a76 100%)',
    skyOverlay: 'radial-gradient(circle at 78% 18%, rgba(218,231,255,0.18) 0%, rgba(218,231,255,0.08) 22%, rgba(218,231,255,0) 44%), linear-gradient(180deg, rgba(9,16,34,0.34) 0%, rgba(9,16,34,0.12) 66%, rgba(9,16,34,0) 100%)',
    hillGradient: 'linear-gradient(180deg, #607f73 0%, #5a7b6c 42%, #4b6750 100%)',
    backHillGradient: 'linear-gradient(180deg, rgba(76,112,88,0.9) 0%, rgba(54,82,61,0.94) 100%)',
    frontHillGradient: 'linear-gradient(180deg, rgba(87,126,94,0.82) 0%, rgba(58,94,66,0.88) 100%)',
    grassGradient: 'linear-gradient(180deg, #638f62 0%, #527d52 45%, #466b45 100%)',
    foregroundGradient: 'linear-gradient(180deg, rgba(66,98,76,0.26) 0%, rgba(40,64,48,0.48) 100%), repeating-linear-gradient(0deg, rgba(74,106,67,0.08) 0px, rgba(74,106,67,0.08) 22px, rgba(0,0,0,0) 22px, rgba(0,0,0,0) 56px)',
    celestialKind: 'moon',
    celestialHalo: 'radial-gradient(circle at 50% 50%, rgba(238,245,255,0.18) 0%, rgba(205,222,252,0.34) 44%, rgba(186,204,236,0) 100%)',
    celestialBody: 'radial-gradient(circle at 35% 30%, #f8fbff 0%, #e1ebfb 58%, #aebfd8 100%)',
    celestialShadow: '0 0 0 2px rgba(233,242,255,0.26), 0 0 24px rgba(198,216,248,0.34)',
    celestialOpacity: 0.92,
    haloOpacity: 0.78,
    cloudSpecs: weather === 'rainy'
      ? RAINY_CLOUDS.map((cloud) => ({
        ...cloud,
        top: `calc(${cloud.top} + 1.4%)`,
        opacity: Math.min(0.92, cloud.opacity * 0.82),
        filter: 'grayscale(0.72) brightness(0.48) saturate(0.72)',
      }))
      : NIGHT_CLOUDS,
    rainLayers: dayVisuals.rainLayers.map((layer, index) => ({
      ...layer,
      opacity: layer.opacity * (index === 0 ? 0.58 : 0.52),
      tint: index === 0 ? 'rgba(165, 190, 220, 0.42)' : 'rgba(124, 154, 190, 0.34)',
      blur: index === 0 ? '0.7px' : '1px',
      duration: index === 0 ? '1.45s' : '1.9s',
    })),
    rainbow: null,
  };

  if (weather === 'rainy') {
    return {
      ...nightBase,
      sceneBackground: 'linear-gradient(180deg, #0f2239 0%, #203952 34%, #3f5558 56%, #455f48 79%, #3d573c 100%)',
      skyGradient: 'linear-gradient(180deg, #0c1e35 0%, #1f354d 52%, #3a4f61 100%)',
      skyGradientTight: 'linear-gradient(180deg, #0e1f35 0%, #1e334b 50%, #354b5f 100%)',
      skyOverlay: 'linear-gradient(180deg, rgba(6,12,25,0.38) 0%, rgba(35,52,68,0.2) 52%, rgba(35,52,68,0.04) 100%)',
      hillGradient: 'linear-gradient(180deg, #596c67 0%, #50675e 44%, #425846 100%)',
      grassGradient: 'linear-gradient(180deg, #557958 0%, #486c49 45%, #3d5d3d 100%)',
      foregroundGradient: 'linear-gradient(180deg, rgba(49,70,62,0.38) 0%, rgba(33,52,44,0.62) 100%), repeating-linear-gradient(0deg, rgba(55,83,61,0.08) 0px, rgba(55,83,61,0.08) 22px, rgba(0,0,0,0) 22px, rgba(0,0,0,0) 56px)',
      celestialOpacity: 0.48,
      haloOpacity: 0.34,
    };
  }

  if (weather === 'rainbow') {
    return {
      ...nightBase,
      sceneBackground: 'linear-gradient(180deg, #142844 0%, #284666 38%, #4b6468 58%, #557854 80%, #4a6a45 100%)',
      skyGradient: 'linear-gradient(180deg, #102641 0%, #244565 58%, #466479 100%)',
      skyOverlay: 'radial-gradient(circle at 28% 30%, rgba(184,219,255,0.12) 0%, rgba(184,219,255,0.04) 34%, rgba(184,219,255,0) 58%), linear-gradient(180deg, rgba(13,23,43,0.3) 0%, rgba(13,23,43,0.1) 68%, rgba(13,23,43,0) 100%)',
      cloudSpecs: RAINBOW_CLOUDS.map((cloud) => ({
        ...cloud,
        opacity: cloud.opacity * 0.66,
        filter: 'grayscale(0.35) brightness(0.58) saturate(0.68)',
      })),
      celestialOpacity: 0.88,
      haloOpacity: 0.72,
      rainbow: {
        top: '8%',
        topCompact: '9%',
        topTight: '10%',
        left: '7%',
        leftCompact: '5%',
        leftTight: '2%',
        width: '45%',
        widthCompact: '45%',
        widthTight: '50%',
        height: '25%',
        heightCompact: '21%',
        heightTight: '19%',
        opacity: 0.42,
        rotation: '-5deg',
      },
    };
  }

  if (weather === 'cloudy') {
    return {
      ...nightBase,
      cloudSpecs: CLOUDY_CLOUDS.map((cloud) => ({
        ...cloud,
        opacity: cloud.opacity * 0.7,
        filter: 'grayscale(0.5) brightness(0.55) saturate(0.62)',
      })),
      celestialOpacity: 0.68,
      haloOpacity: 0.5,
    };
  }

  return nightBase;
}

function getTerrainBackdropVisuals(weather: Weather, timeOfDay: TimeOfDay): TerrainBackdropVisuals {
  if (timeOfDay === 'night') {
    if (weather === 'rainy') {
      return {
        distantRidgeGradient: 'linear-gradient(180deg, rgba(73,94,102,0.78) 0%, rgba(61,87,79,0.86) 56%, rgba(45,69,53,0.94) 100%)',
        distantRidgeHighlight: 'linear-gradient(116deg, rgba(177,202,219,0.12) 0%, rgba(177,202,219,0.05) 26%, rgba(177,202,219,0) 54%)',
        distantRidgeShadow: 'radial-gradient(ellipse at 72% 68%, rgba(12,22,28,0.28) 0%, rgba(12,22,28,0.12) 42%, rgba(12,22,28,0) 72%)',
        backHillTexture: 'radial-gradient(ellipse at 24% 30%, rgba(149,179,150,0.1) 0%, rgba(149,179,150,0) 34%), repeating-linear-gradient(118deg, rgba(182,207,190,0.06) 0px, rgba(182,207,190,0.06) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 20px)',
        backHillHighlight: 'linear-gradient(112deg, rgba(197,216,213,0.12) 0%, rgba(197,216,213,0.04) 30%, rgba(197,216,213,0) 58%)',
        backHillShadow: 'radial-gradient(ellipse at 78% 74%, rgba(9,20,20,0.26) 0%, rgba(9,20,20,0.12) 45%, rgba(9,20,20,0) 74%)',
        frontHillTexture: 'radial-gradient(ellipse at 32% 20%, rgba(160,190,152,0.12) 0%, rgba(160,190,152,0) 34%), repeating-linear-gradient(106deg, rgba(204,224,196,0.06) 0px, rgba(204,224,196,0.06) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 18px)',
        frontHillHighlight: 'linear-gradient(105deg, rgba(195,218,198,0.14) 0%, rgba(195,218,198,0.05) 32%, rgba(195,218,198,0) 62%)',
        frontHillShadow: 'radial-gradient(ellipse at 78% 78%, rgba(10,25,18,0.25) 0%, rgba(10,25,18,0.12) 46%, rgba(10,25,18,0) 75%)',
        horizonMist: 'linear-gradient(90deg, rgba(168,194,205,0) 0%, rgba(168,194,205,0.34) 24%, rgba(122,154,170,0.28) 58%, rgba(168,194,205,0) 100%)',
        horizonMistOpacity: 0.66,
        pathGradient: 'linear-gradient(180deg, rgba(173,151,121,0.62) 0%, rgba(121,103,82,0.72) 100%)',
        pathEdge: 'rgba(196,214,174,0.18)',
        pathTexture: 'radial-gradient(circle at 28% 34%, rgba(238,236,208,0.16) 0 1px, rgba(238,236,208,0) 2px), radial-gradient(circle at 64% 64%, rgba(115,89,68,0.14) 0 1px, rgba(115,89,68,0) 2px)',
      };
    }

    if (weather === 'rainbow') {
      return {
        distantRidgeGradient: 'linear-gradient(180deg, rgba(84,113,126,0.8) 0%, rgba(70,105,94,0.88) 56%, rgba(55,88,62,0.95) 100%)',
        distantRidgeHighlight: 'linear-gradient(112deg, rgba(180,218,255,0.17) 0%, rgba(180,218,255,0.07) 34%, rgba(180,218,255,0) 62%)',
        distantRidgeShadow: 'radial-gradient(ellipse at 72% 70%, rgba(12,25,34,0.22) 0%, rgba(12,25,34,0.1) 46%, rgba(12,25,34,0) 76%)',
        backHillTexture: 'radial-gradient(ellipse at 22% 26%, rgba(170,212,178,0.12) 0%, rgba(170,212,178,0) 36%), repeating-linear-gradient(118deg, rgba(186,219,208,0.07) 0px, rgba(186,219,208,0.07) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 21px)',
        backHillHighlight: 'linear-gradient(112deg, rgba(187,223,224,0.14) 0%, rgba(187,223,224,0.06) 32%, rgba(187,223,224,0) 62%)',
        backHillShadow: 'radial-gradient(ellipse at 76% 74%, rgba(13,32,30,0.22) 0%, rgba(13,32,30,0.1) 44%, rgba(13,32,30,0) 74%)',
        frontHillTexture: 'radial-gradient(ellipse at 35% 18%, rgba(172,221,158,0.14) 0%, rgba(172,221,158,0) 36%), repeating-linear-gradient(106deg, rgba(206,232,202,0.07) 0px, rgba(206,232,202,0.07) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 18px)',
        frontHillHighlight: 'linear-gradient(105deg, rgba(207,235,206,0.16) 0%, rgba(207,235,206,0.06) 34%, rgba(207,235,206,0) 64%)',
        frontHillShadow: 'radial-gradient(ellipse at 78% 78%, rgba(15,37,22,0.2) 0%, rgba(15,37,22,0.1) 48%, rgba(15,37,22,0) 76%)',
        horizonMist: 'linear-gradient(90deg, rgba(184,218,238,0) 0%, rgba(184,218,238,0.32) 24%, rgba(182,202,236,0.24) 56%, rgba(184,218,238,0) 100%)',
        horizonMistOpacity: 0.48,
        pathGradient: 'linear-gradient(180deg, rgba(185,165,119,0.64) 0%, rgba(132,112,82,0.7) 100%)',
        pathEdge: 'rgba(214,236,185,0.18)',
        pathTexture: 'radial-gradient(circle at 30% 36%, rgba(247,239,194,0.18) 0 1px, rgba(247,239,194,0) 2px), radial-gradient(circle at 66% 62%, rgba(120,92,70,0.12) 0 1px, rgba(120,92,70,0) 2px)',
      };
    }

    return {
      distantRidgeGradient: 'linear-gradient(180deg, rgba(76,105,119,0.82) 0%, rgba(66,103,91,0.88) 56%, rgba(51,85,58,0.95) 100%)',
      distantRidgeHighlight: 'linear-gradient(112deg, rgba(190,217,243,0.14) 0%, rgba(190,217,243,0.06) 32%, rgba(190,217,243,0) 62%)',
      distantRidgeShadow: 'radial-gradient(ellipse at 72% 70%, rgba(10,24,32,0.22) 0%, rgba(10,24,32,0.1) 46%, rgba(10,24,32,0) 76%)',
      backHillTexture: 'radial-gradient(ellipse at 22% 26%, rgba(161,198,166,0.12) 0%, rgba(161,198,166,0) 36%), repeating-linear-gradient(118deg, rgba(186,214,200,0.07) 0px, rgba(186,214,200,0.07) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 21px)',
      backHillHighlight: 'linear-gradient(112deg, rgba(190,220,217,0.14) 0%, rgba(190,220,217,0.06) 32%, rgba(190,220,217,0) 62%)',
      backHillShadow: 'radial-gradient(ellipse at 76% 74%, rgba(13,30,28,0.22) 0%, rgba(13,30,28,0.1) 44%, rgba(13,30,28,0) 74%)',
      frontHillTexture: 'radial-gradient(ellipse at 35% 18%, rgba(168,211,157,0.14) 0%, rgba(168,211,157,0) 36%), repeating-linear-gradient(106deg, rgba(206,231,199,0.07) 0px, rgba(206,231,199,0.07) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 18px)',
      frontHillHighlight: 'linear-gradient(105deg, rgba(204,232,205,0.16) 0%, rgba(204,232,205,0.06) 34%, rgba(204,232,205,0) 64%)',
      frontHillShadow: 'radial-gradient(ellipse at 78% 78%, rgba(15,35,22,0.2) 0%, rgba(15,35,22,0.1) 48%, rgba(15,35,22,0) 76%)',
      horizonMist: 'linear-gradient(90deg, rgba(188,214,232,0) 0%, rgba(188,214,232,0.28) 24%, rgba(166,197,220,0.2) 58%, rgba(188,214,232,0) 100%)',
      horizonMistOpacity: 0.42,
      pathGradient: 'linear-gradient(180deg, rgba(181,158,111,0.62) 0%, rgba(128,104,74,0.68) 100%)',
      pathEdge: 'rgba(208,229,179,0.18)',
      pathTexture: 'radial-gradient(circle at 30% 36%, rgba(242,234,188,0.18) 0 1px, rgba(242,234,188,0) 2px), radial-gradient(circle at 66% 62%, rgba(119,91,68,0.12) 0 1px, rgba(119,91,68,0) 2px)',
    };
  }

  if (weather === 'rainy') {
    return {
      distantRidgeGradient: 'linear-gradient(180deg, rgba(186,205,195,0.86) 0%, rgba(144,177,137,0.9) 56%, rgba(113,154,100,0.96) 100%)',
      distantRidgeHighlight: 'linear-gradient(112deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0) 58%)',
      distantRidgeShadow: 'radial-gradient(ellipse at 72% 70%, rgba(67,103,78,0.22) 0%, rgba(67,103,78,0.1) 46%, rgba(67,103,78,0) 76%)',
      backHillTexture: 'radial-gradient(ellipse at 24% 26%, rgba(221,235,210,0.14) 0%, rgba(221,235,210,0) 36%), repeating-linear-gradient(118deg, rgba(235,244,226,0.08) 0px, rgba(235,244,226,0.08) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 21px)',
      backHillHighlight: 'linear-gradient(112deg, rgba(240,249,226,0.18) 0%, rgba(240,249,226,0.06) 34%, rgba(240,249,226,0) 62%)',
      backHillShadow: 'radial-gradient(ellipse at 78% 76%, rgba(66,111,69,0.22) 0%, rgba(66,111,69,0.1) 46%, rgba(66,111,69,0) 76%)',
      frontHillTexture: 'radial-gradient(ellipse at 34% 20%, rgba(232,246,212,0.16) 0%, rgba(232,246,212,0) 36%), repeating-linear-gradient(106deg, rgba(238,247,220,0.08) 0px, rgba(238,247,220,0.08) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 18px)',
      frontHillHighlight: 'linear-gradient(105deg, rgba(235,248,218,0.2) 0%, rgba(235,248,218,0.06) 34%, rgba(235,248,218,0) 64%)',
      frontHillShadow: 'radial-gradient(ellipse at 78% 78%, rgba(68,115,67,0.22) 0%, rgba(68,115,67,0.1) 48%, rgba(68,115,67,0) 76%)',
      horizonMist: 'linear-gradient(90deg, rgba(221,235,239,0) 0%, rgba(221,235,239,0.46) 25%, rgba(188,209,216,0.34) 58%, rgba(221,235,239,0) 100%)',
      horizonMistOpacity: 0.74,
      pathGradient: 'linear-gradient(180deg, rgba(193,169,126,0.62) 0%, rgba(139,113,84,0.72) 100%)',
      pathEdge: 'rgba(214,230,194,0.2)',
      pathTexture: 'radial-gradient(circle at 28% 34%, rgba(241,236,200,0.16) 0 1px, rgba(241,236,200,0) 2px), radial-gradient(circle at 64% 62%, rgba(111,84,64,0.14) 0 1px, rgba(111,84,64,0) 2px), linear-gradient(180deg, rgba(210,232,237,0.16), rgba(210,232,237,0))',
    };
  }

  if (weather === 'cloudy') {
    return {
      distantRidgeGradient: 'linear-gradient(180deg, rgba(204,222,208,0.88) 0%, rgba(164,196,151,0.92) 56%, rgba(130,173,111,0.96) 100%)',
      distantRidgeHighlight: 'linear-gradient(112deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0) 58%)',
      distantRidgeShadow: 'radial-gradient(ellipse at 72% 70%, rgba(71,113,75,0.18) 0%, rgba(71,113,75,0.08) 46%, rgba(71,113,75,0) 76%)',
      backHillTexture: 'radial-gradient(ellipse at 24% 26%, rgba(235,246,222,0.14) 0%, rgba(235,246,222,0) 36%), repeating-linear-gradient(118deg, rgba(246,251,233,0.08) 0px, rgba(246,251,233,0.08) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 21px)',
      backHillHighlight: 'linear-gradient(112deg, rgba(247,252,231,0.18) 0%, rgba(247,252,231,0.06) 34%, rgba(247,252,231,0) 62%)',
      backHillShadow: 'radial-gradient(ellipse at 78% 76%, rgba(69,119,72,0.18) 0%, rgba(69,119,72,0.08) 46%, rgba(69,119,72,0) 76%)',
      frontHillTexture: 'radial-gradient(ellipse at 34% 20%, rgba(244,251,224,0.16) 0%, rgba(244,251,224,0) 36%), repeating-linear-gradient(106deg, rgba(248,253,230,0.08) 0px, rgba(248,253,230,0.08) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 18px)',
      frontHillHighlight: 'linear-gradient(105deg, rgba(247,253,229,0.2) 0%, rgba(247,253,229,0.06) 34%, rgba(247,253,229,0) 64%)',
      frontHillShadow: 'radial-gradient(ellipse at 78% 78%, rgba(70,123,73,0.18) 0%, rgba(70,123,73,0.08) 48%, rgba(70,123,73,0) 76%)',
      horizonMist: 'linear-gradient(90deg, rgba(232,240,239,0) 0%, rgba(232,240,239,0.4) 26%, rgba(205,221,220,0.28) 60%, rgba(232,240,239,0) 100%)',
      horizonMistOpacity: 0.58,
      pathGradient: 'linear-gradient(180deg, rgba(206,181,129,0.66) 0%, rgba(149,118,83,0.72) 100%)',
      pathEdge: 'rgba(217,235,190,0.2)',
      pathTexture: 'radial-gradient(circle at 30% 36%, rgba(248,239,193,0.18) 0 1px, rgba(248,239,193,0) 2px), radial-gradient(circle at 66% 62%, rgba(123,93,67,0.12) 0 1px, rgba(123,93,67,0) 2px)',
    };
  }

  if (weather === 'rainbow') {
    return {
      distantRidgeGradient: 'linear-gradient(180deg, rgba(219,245,212,0.9) 0%, rgba(176,224,151,0.94) 56%, rgba(137,202,105,0.98) 100%)',
      distantRidgeHighlight: 'linear-gradient(112deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.1) 32%, rgba(255,255,255,0) 62%)',
      distantRidgeShadow: 'radial-gradient(ellipse at 72% 70%, rgba(72,132,68,0.16) 0%, rgba(72,132,68,0.08) 46%, rgba(72,132,68,0) 76%)',
      backHillTexture: 'radial-gradient(ellipse at 24% 26%, rgba(255,255,224,0.22) 0%, rgba(255,255,224,0) 36%), repeating-linear-gradient(118deg, rgba(255,255,238,0.1) 0px, rgba(255,255,238,0.1) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 21px)',
      backHillHighlight: 'linear-gradient(112deg, rgba(255,255,226,0.25) 0%, rgba(255,255,226,0.08) 34%, rgba(255,255,226,0) 62%)',
      backHillShadow: 'radial-gradient(ellipse at 78% 76%, rgba(71,135,68,0.16) 0%, rgba(71,135,68,0.08) 46%, rgba(71,135,68,0) 76%)',
      frontHillTexture: 'radial-gradient(ellipse at 34% 20%, rgba(255,255,222,0.22) 0%, rgba(255,255,222,0) 36%), repeating-linear-gradient(106deg, rgba(255,255,236,0.1) 0px, rgba(255,255,236,0.1) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 18px)',
      frontHillHighlight: 'linear-gradient(105deg, rgba(255,255,225,0.28) 0%, rgba(255,255,225,0.08) 34%, rgba(255,255,225,0) 64%)',
      frontHillShadow: 'radial-gradient(ellipse at 78% 78%, rgba(72,139,68,0.16) 0%, rgba(72,139,68,0.08) 48%, rgba(72,139,68,0) 76%)',
      horizonMist: 'linear-gradient(90deg, rgba(241,255,246,0) 0%, rgba(241,255,246,0.42) 23%, rgba(217,240,255,0.34) 58%, rgba(241,255,246,0) 100%)',
      horizonMistOpacity: 0.62,
      pathGradient: 'linear-gradient(180deg, rgba(222,189,123,0.7) 0%, rgba(159,123,77,0.74) 100%)',
      pathEdge: 'rgba(229,247,196,0.24)',
      pathTexture: 'radial-gradient(circle at 30% 36%, rgba(255,246,196,0.2) 0 1px, rgba(255,246,196,0) 2px), radial-gradient(circle at 66% 62%, rgba(128,95,62,0.12) 0 1px, rgba(128,95,62,0) 2px)',
    };
  }

  return {
    distantRidgeGradient: 'linear-gradient(180deg, rgba(216,241,211,0.9) 0%, rgba(174,219,150,0.94) 56%, rgba(135,197,104,0.98) 100%)',
    distantRidgeHighlight: 'linear-gradient(112deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.09) 30%, rgba(255,255,255,0) 60%)',
    distantRidgeShadow: 'radial-gradient(ellipse at 72% 70%, rgba(69,128,65,0.16) 0%, rgba(69,128,65,0.08) 46%, rgba(69,128,65,0) 76%)',
    backHillTexture: 'radial-gradient(ellipse at 24% 26%, rgba(255,255,222,0.18) 0%, rgba(255,255,222,0) 36%), repeating-linear-gradient(118deg, rgba(255,255,236,0.09) 0px, rgba(255,255,236,0.09) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 21px)',
    backHillHighlight: 'linear-gradient(112deg, rgba(255,255,226,0.22) 0%, rgba(255,255,226,0.08) 34%, rgba(255,255,226,0) 62%)',
    backHillShadow: 'radial-gradient(ellipse at 78% 76%, rgba(69,128,65,0.16) 0%, rgba(69,128,65,0.08) 46%, rgba(69,128,65,0) 76%)',
    frontHillTexture: 'radial-gradient(ellipse at 34% 20%, rgba(255,255,222,0.2) 0%, rgba(255,255,222,0) 36%), repeating-linear-gradient(106deg, rgba(255,255,236,0.09) 0px, rgba(255,255,236,0.09) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 18px)',
    frontHillHighlight: 'linear-gradient(105deg, rgba(255,255,225,0.24) 0%, rgba(255,255,225,0.08) 34%, rgba(255,255,225,0) 64%)',
    frontHillShadow: 'radial-gradient(ellipse at 78% 78%, rgba(70,132,66,0.16) 0%, rgba(70,132,66,0.08) 48%, rgba(70,132,66,0) 76%)',
    horizonMist: 'linear-gradient(90deg, rgba(238,253,255,0) 0%, rgba(238,253,255,0.36) 23%, rgba(214,242,235,0.24) 58%, rgba(238,253,255,0) 100%)',
    horizonMistOpacity: 0.5,
    pathGradient: 'linear-gradient(180deg, rgba(218,187,122,0.7) 0%, rgba(157,121,76,0.72) 100%)',
    pathEdge: 'rgba(226,246,194,0.22)',
    pathTexture: 'radial-gradient(circle at 30% 36%, rgba(255,246,196,0.2) 0 1px, rgba(255,246,196,0) 2px), radial-gradient(circle at 66% 62%, rgba(128,95,62,0.12) 0 1px, rgba(128,95,62,0) 2px)',
  };
}

function getCottageBackdropVisuals(weather: Weather, timeOfDay: TimeOfDay): CottageBackdropVisuals {
  if (timeOfDay === 'night') {
    const rainyFilter = weather === 'rainy' ? 'saturate(0.78) brightness(0.84)' : undefined;
    const moonbowLift = weather === 'rainbow' ? 'drop-shadow(0 0 10px rgba(173,215,255,0.18))' : undefined;

    return {
      groundShadow: 'radial-gradient(ellipse at center, rgba(11,28,22,0.46) 0%, rgba(11,28,22,0.22) 58%, rgba(0,0,0,0) 100%)',
      path: 'linear-gradient(180deg, rgba(143,116,82,0.62) 0%, rgba(91,74,57,0.74) 100%)',
      pathEdge: 'rgba(171,196,146,0.18)',
      shrub: 'radial-gradient(circle at 36% 28%, #6a9464 0%, #416b4e 72%, #2e4f3b 100%)',
      shrubShadow: 'rgba(20,45,31,0.28)',
      roof: 'linear-gradient(180deg, #9c5d4e 0%, #703e39 66%, #5b302f 100%)',
      roofShade: 'linear-gradient(90deg, rgba(255,218,169,0.1) 0%, rgba(60,25,24,0.18) 100%), repeating-linear-gradient(118deg, rgba(255,226,183,0.12) 0px, rgba(255,226,183,0.12) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 9px)',
      roofHighlight: 'rgba(255,218,164,0.2)',
      roofTrim: 'linear-gradient(180deg, #c18a69 0%, #8a5a45 100%)',
      wall: 'linear-gradient(180deg, #c9af88 0%, #9f825e 100%)',
      wallShade: 'linear-gradient(90deg, rgba(255,236,187,0.12) 0%, rgba(79,46,31,0.22) 100%)',
      wallTrim: 'rgba(82,54,36,0.5)',
      door: 'linear-gradient(180deg, #8f5b3a 0%, #623d2d 100%)',
      doorGlow: 'rgba(255,188,88,0.32)',
      window: 'linear-gradient(180deg, #ffe79f 0%, #ffb95f 100%)',
      windowGlow: '0 0 11px rgba(255,181,83,0.66), inset 0 0 5px rgba(255,247,184,0.74)',
      windowFrame: 'rgba(94,58,37,0.86)',
      chimney: 'linear-gradient(180deg, #8d5549 0%, #5f3835 100%)',
      smoke: 'rgba(201,217,221,0.2)',
      filter: rainyFilter ?? moonbowLift,
    };
  }

  if (weather === 'rainy' || weather === 'cloudy') {
    return {
      groundShadow: 'radial-gradient(ellipse at center, rgba(71,111,62,0.36) 0%, rgba(71,111,62,0.16) 58%, rgba(0,0,0,0) 100%)',
      path: 'linear-gradient(180deg, rgba(210,174,119,0.66) 0%, rgba(148,113,79,0.78) 100%)',
      pathEdge: 'rgba(215,232,185,0.26)',
      shrub: 'radial-gradient(circle at 34% 26%, #a1cc79 0%, #6aa655 70%, #4d8244 100%)',
      shrubShadow: 'rgba(63,115,58,0.22)',
      roof: 'linear-gradient(180deg, #c57554 0%, #9e573e 66%, #7b3f35 100%)',
      roofShade: 'linear-gradient(90deg, rgba(255,219,171,0.16) 0%, rgba(99,42,33,0.18) 100%), repeating-linear-gradient(118deg, rgba(255,229,190,0.14) 0px, rgba(255,229,190,0.14) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 9px)',
      roofHighlight: 'rgba(255,227,183,0.26)',
      roofTrim: 'linear-gradient(180deg, #dfaa78 0%, #aa704f 100%)',
      wall: 'linear-gradient(180deg, #ecd3a8 0%, #d3a978 100%)',
      wallShade: 'linear-gradient(90deg, rgba(255,244,204,0.2) 0%, rgba(135,83,51,0.18) 100%)',
      wallTrim: 'rgba(130,82,50,0.52)',
      door: 'linear-gradient(180deg, #9a603e 0%, #6e432e 100%)',
      doorGlow: 'rgba(255,190,94,0.22)',
      window: 'linear-gradient(180deg, #d9eff6 0%, #93bfd4 100%)',
      windowGlow: 'inset 0 0 5px rgba(255,255,255,0.4)',
      windowFrame: 'rgba(113,70,43,0.8)',
      chimney: 'linear-gradient(180deg, #a2604c 0%, #794437 100%)',
      smoke: 'rgba(217,229,226,0.22)',
      filter: weather === 'rainy' ? 'saturate(0.9) brightness(0.94)' : undefined,
    };
  }

  return {
    groundShadow: 'radial-gradient(ellipse at center, rgba(89,132,66,0.34) 0%, rgba(89,132,66,0.14) 58%, rgba(0,0,0,0) 100%)',
    path: 'linear-gradient(180deg, rgba(224,185,116,0.7) 0%, rgba(160,121,72,0.74) 100%)',
    pathEdge: 'rgba(230,247,190,0.28)',
    shrub: weather === 'rainbow' ? 'radial-gradient(circle at 34% 26%, #b8e383 0%, #78bf58 70%, #589447 100%)' : 'radial-gradient(circle at 34% 26%, #aee07a 0%, #74b94f 70%, #538d40 100%)',
    shrubShadow: 'rgba(74,125,55,0.2)',
    roof: weather === 'rainbow' ? 'linear-gradient(180deg, #dd8758 0%, #b8643d 66%, #934737 100%)' : 'linear-gradient(180deg, #d47d55 0%, #ad603b 66%, #884336 100%)',
    roofShade: 'linear-gradient(90deg, rgba(255,232,176,0.22) 0%, rgba(116,49,34,0.16) 100%), repeating-linear-gradient(118deg, rgba(255,235,194,0.16) 0px, rgba(255,235,194,0.16) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 9px)',
    roofHighlight: 'rgba(255,237,188,0.34)',
    roofTrim: 'linear-gradient(180deg, #ebb06f 0%, #b7744d 100%)',
    wall: weather === 'rainbow' ? 'linear-gradient(180deg, #f7deb1 0%, #e2b87f 100%)' : 'linear-gradient(180deg, #f1d7ab 0%, #ddb682 100%)',
    wallShade: 'linear-gradient(90deg, rgba(255,249,213,0.26) 0%, rgba(139,84,50,0.16) 100%)',
    wallTrim: 'rgba(128,78,47,0.5)',
    door: 'linear-gradient(180deg, #a16742 0%, #74472e 100%)',
    doorGlow: 'rgba(255,196,99,0.18)',
    window: 'linear-gradient(180deg, #d9f3ff 0%, #9fd5ef 100%)',
    windowGlow: 'inset 0 0 5px rgba(255,255,255,0.48)',
    windowFrame: 'rgba(118,73,43,0.82)',
    chimney: 'linear-gradient(180deg, #ad694d 0%, #81483a 100%)',
    smoke: 'rgba(232,242,235,0.2)',
  };
}

function getWeatherBackdropVisuals(weather: Weather, timeOfDay: TimeOfDay): WeatherBackdropVisuals {
  const visuals = timeOfDay === 'night' ? getNightWeatherBackdropVisuals(weather) : getDayWeatherBackdropVisuals(weather);

  return {
    ...visuals,
    terrain: getTerrainBackdropVisuals(weather, timeOfDay),
    cottage: getCottageBackdropVisuals(weather, timeOfDay),
  };
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
  timeOfDay,
  weatherState,
  debugWeatherOverride,
  debugTimeOfDayOverride,
  weatherLabel,
  forecastLabel,
  todayFocusMinutes,
  coinBalance,
  plantableSeedCount,
  harvestablePlotCount,
}: {
  compactMode: boolean;
  useTightMobileSpacing: boolean;
  weather: Weather;
  timeOfDay: TimeOfDay;
  weatherState: WeatherState;
  debugWeatherOverride: WeatherDebugOverride;
  debugTimeOfDayOverride: TimeOfDayDebugOverride;
  weatherLabel: string;
  forecastLabel: string;
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
            data-production-current-weather={weatherState.current}
            data-production-next-weather={weatherState.next}
            data-effective-weather={weather}
            data-time-of-day={timeOfDay}
            data-debug-weather-override={debugWeatherOverride ?? ''}
            data-debug-time-of-day-override={debugTimeOfDayOverride ?? ''}
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

        <div className={`flex justify-center ${useTightMobileSpacing ? 'mt-0.5' : 'mt-1'}`}>
          <div
            data-testid="farm-v2-weather-forecast"
            data-current-weather={weatherState.current}
            data-next-weather={weatherState.next}
            data-next-change-at={String(weatherState.nextChangeAt)}
            className={`flex items-center whitespace-nowrap rounded-full border font-semibold ${useTightMobileSpacing ? 'gap-1 px-2 py-[2px] text-[9px] sm:text-[10px]' : 'gap-1 px-2.5 py-[3px] text-[10px] sm:text-[11px]'}`}
            style={{
              borderColor: 'rgba(88, 125, 155, 0.26)',
              color: '#2f5168',
              background: 'linear-gradient(180deg, rgba(241,250,255,0.9) 0%, rgba(224,240,250,0.82) 100%)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.38) inset',
            }}
          >
            <span aria-hidden="true">{WEATHER_ICON_MAP[weatherState.next]}</span>
            <span>{forecastLabel}</span>
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
      className={`pointer-events-none absolute ${MOTION_CLASS}`}
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
      className="pointer-events-none absolute z-[7] overflow-hidden"
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
      className="pointer-events-none absolute z-[6] overflow-hidden"
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
    <div className="pointer-events-none absolute z-[7]" data-testid={testId} style={wrapperStyle}>
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

function Cottage({
  left,
  top,
  visuals,
}: {
  left: string;
  top: string;
  visuals: CottageBackdropVisuals;
}) {
  const windowStyle = {
    background: visuals.window,
    border: `1px solid ${visuals.windowFrame}`,
    boxShadow: visuals.windowGlow,
  };

  return (
    <div
      className="pointer-events-none absolute z-[7]"
      data-testid="farm-v2-cottage"
      style={{ left, top, width: '64px', height: '60px', filter: visuals.filter }}
    >
      <div
        className="absolute left-1/2 bottom-[-2px] h-[18px] w-[42px] -translate-x-1/2"
        style={{
          clipPath: 'polygon(45% 0%, 55% 0%, 76% 100%, 24% 100%)',
          background: visuals.path,
        }}
      />
      <div
        className="absolute left-1/2 bottom-[-1px] h-[18px] w-[48px] -translate-x-1/2"
        style={{
          clipPath: 'polygon(40% 0%, 60% 0%, 86% 100%, 14% 100%)',
          background: `linear-gradient(90deg, ${visuals.pathEdge} 0%, rgba(255,255,255,0) 18%, rgba(255,255,255,0) 82%, ${visuals.pathEdge} 100%)`,
          opacity: 0.84,
        }}
      />
      <div
        className="absolute left-[1px] bottom-[5px] h-[17px] w-[22px] rounded-full"
        style={{ background: visuals.shrub, boxShadow: `0 5px 0 ${visuals.shrubShadow}` }}
      />
      <div
        className="absolute right-[1px] bottom-[4px] h-[18px] w-[23px] rounded-full"
        style={{ background: visuals.shrub, boxShadow: `0 5px 0 ${visuals.shrubShadow}` }}
      />
      <div
        className="absolute left-1/2 bottom-[1px] h-[9px] w-[46px] -translate-x-1/2 rounded-full"
        style={{ background: visuals.groundShadow }}
      />
      <div
        className="absolute left-[42px] top-[6px] h-[19px] w-[8px] rounded-t-[3px]"
        style={{ background: visuals.chimney, border: '1px solid rgba(75,44,34,0.28)' }}
      />
      <div className="absolute left-[43px] top-[3px] h-[5px] w-[11px] rounded-[3px]" style={{ background: visuals.chimney }} />
      <div
        className="absolute left-[47px] top-[-2px] h-[10px] w-[15px] rounded-full"
        style={{ background: visuals.smoke, filter: 'blur(3px)', opacity: 0.84 }}
      />
      <div
        className="absolute left-1/2 top-[1px] h-[24px] w-[48px] -translate-x-1/2 drop-shadow-[0_2px_1px_rgba(91,51,35,0.18)]"
        style={{
          clipPath: 'polygon(0% 96%, 50% 0%, 100% 96%, 92% 100%, 50% 18%, 8% 100%)',
          background: visuals.roofShade,
        }}
      />
      <div
        className="absolute left-1/2 top-[2px] h-[24px] w-[50px] -translate-x-1/2"
        style={{
          clipPath: 'polygon(0% 100%, 50% 0%, 100% 100%)',
          background: visuals.roof,
          borderBottom: '1px solid rgba(98,52,35,0.36)',
        }}
      />
      <div
        className="absolute left-1/2 top-[18px] h-[6px] w-[54px] -translate-x-1/2 rounded-full"
        style={{ background: visuals.roofTrim, boxShadow: '0 2px 2px rgba(92,49,31,0.2)' }}
      />
      <div
        className="absolute left-[18px] top-[8px] h-[15px] w-[2px] rotate-[33deg] rounded-full"
        style={{ background: visuals.roofHighlight }}
      />
      <div
        className="absolute right-[18px] top-[8px] h-[15px] w-[2px] -rotate-[33deg] rounded-full"
        style={{ background: 'rgba(91,45,30,0.18)' }}
      />
      <div
        className="absolute bottom-[3px] left-1/2 h-[36px] w-[46px] -translate-x-1/2 overflow-hidden rounded-[8px]"
        style={{ background: visuals.wall, border: `1px solid ${visuals.wallTrim}` }}
      >
        <div className="absolute inset-0" style={{ background: visuals.wallShade }} />
        <div
          className="absolute inset-x-[5px] top-[6px] h-[1px]"
          style={{ background: 'rgba(255,255,255,0.24)' }}
        />
        <div
          className="absolute left-[7px] top-[9px] h-[10px] w-[10px] rounded-[3px]"
          style={windowStyle}
        >
          <div className="absolute left-1/2 top-0 h-full w-[1px] -translate-x-1/2" style={{ background: visuals.windowFrame }} />
          <div className="absolute inset-x-0 top-1/2 h-[1px] -translate-y-1/2" style={{ background: visuals.windowFrame }} />
        </div>
        <div
          className="absolute right-[7px] top-[9px] h-[10px] w-[10px] rounded-[3px]"
          style={windowStyle}
        >
          <div className="absolute left-1/2 top-0 h-full w-[1px] -translate-x-1/2" style={{ background: visuals.windowFrame }} />
          <div className="absolute inset-x-0 top-1/2 h-[1px] -translate-y-1/2" style={{ background: visuals.windowFrame }} />
        </div>
        <div
          className="absolute bottom-[1px] left-1/2 h-[18px] w-[11px] -translate-x-1/2 rounded-t-[5px]"
          style={{ background: visuals.door, border: `1px solid ${visuals.wallTrim}`, boxShadow: `0 0 9px ${visuals.doorGlow}` }}
        >
          <div className="absolute right-[2px] top-[8px] h-[2px] w-[2px] rounded-full bg-[#f8cf80]" />
          <div className="absolute inset-x-[2px] top-[4px] h-[1px] rounded-full bg-[rgba(255,232,176,0.22)]" />
        </div>
        <div
          className="absolute inset-x-[5px] bottom-[1px] h-[3px] rounded-full"
          style={{ background: 'rgba(102,69,43,0.22)' }}
        />
      </div>
    </div>
  );
}

function FarmBackdropV2({
  compactMode,
  weather,
  timeOfDay,
  testIdPrefix = 'farm-v2',
}: {
  compactMode: boolean;
  weather: Weather;
  timeOfDay: TimeOfDay;
  testIdPrefix?: string;
}) {
  const isNarrowScreen = typeof window !== 'undefined' && window.innerWidth < 640;
  const useCompactMobilePolish = isNarrowScreen && compactMode;
  const useTightBackdrop = isNarrowScreen && !compactMode;
  const visuals = getWeatherBackdropVisuals(weather, timeOfDay);
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
  const terrain = visuals.terrain ?? getTerrainBackdropVisuals(weather, timeOfDay);
  const cottage = visuals.cottage ?? getCottageBackdropVisuals(weather, timeOfDay);
  const hillTop = compactMode
    ? useCompactMobilePolish
      ? '23.8%'
      : '28%'
    : useTightBackdrop
      ? (tightBackdropMetrics?.hillTop ?? '27%')
      : '27%';
  const hillHeight = compactMode
    ? '16%'
    : useTightBackdrop
      ? (tightBackdropMetrics?.hillHeight ?? '16%')
      : '16%';
  const backHillTop = compactMode
    ? useCompactMobilePolish
      ? '24.6%'
      : '28.8%'
    : useTightBackdrop
      ? (tightBackdropMetrics?.backHillTop ?? '28%')
      : '28%';
  const backHillHeight = compactMode
    ? '17.6%'
    : useTightBackdrop
      ? (tightBackdropMetrics?.backHillHeight ?? '13.9%')
      : '17.2%';
  const frontHillTop = compactMode
    ? useCompactMobilePolish
      ? '26.2%'
      : '30.2%'
    : useTightBackdrop
      ? (tightBackdropMetrics?.frontHillTop ?? '29.5%')
      : '29.5%';
  const frontHillHeight = compactMode
    ? '13.6%'
    : useTightBackdrop
      ? (tightBackdropMetrics?.frontHillHeight ?? '10.6%')
      : '13.2%';
  const pathTop = compactMode
    ? useCompactMobilePolish
      ? '26.4%'
      : '30.8%'
    : useTightBackdrop
      ? (tightBackdropMetrics?.pathTop ?? '29.8%')
      : '29.8%';
  const grassTop = compactMode
    ? useCompactMobilePolish
      ? '39.2%'
      : '44%'
    : useTightBackdrop
      ? (tightBackdropMetrics?.grassTop ?? '43%')
      : '43%';

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
          top: hillTop,
          height: hillHeight,
          background: visuals.hillGradient,
        }}
      />

      <div
        data-testid={getBackdropTestId(testIdPrefix, 'distant-ridge')}
        className="absolute z-[3] overflow-hidden"
        style={{
          left: compactMode ? '-13%' : '-10%',
          right: compactMode ? '-13%' : '-10%',
          top: hillTop,
          height: compactMode ? '14.8%' : useTightBackdrop ? '11.2%' : '14.2%',
          clipPath: compactMode
            ? 'polygon(0% 58%, 9% 42%, 18% 56%, 28% 30%, 39% 54%, 51% 32%, 62% 57%, 74% 38%, 86% 56%, 100% 43%, 100% 100%, 0% 100%)'
            : 'polygon(0% 60%, 8% 43%, 17% 54%, 29% 28%, 42% 55%, 53% 31%, 65% 58%, 77% 40%, 90% 55%, 100% 44%, 100% 100%, 0% 100%)',
          background: terrain.distantRidgeGradient,
        }}
      >
        <div className="absolute inset-0" style={{ background: terrain.distantRidgeHighlight }} />
        <div className="absolute inset-0" style={{ background: terrain.distantRidgeShadow }} />
        <div
          className="absolute inset-x-[7%] top-[28%] h-[2px] rounded-full"
          style={{ background: 'rgba(255,255,255,0.18)', filter: 'blur(0.2px)', opacity: isNight ? 0.32 : 0.58 }}
        />
      </div>

      <div
        className="absolute z-[4] overflow-hidden"
        style={{
          left: compactMode ? '-8%' : '-6%',
          right: compactMode ? '-8%' : '-6%',
          top: backHillTop,
          height: backHillHeight,
          borderRadius: '50% 50% 0 0 / 78% 78% 0 0',
          background: visuals.backHillGradient,
        }}
      >
        <div className="absolute inset-0" style={{ background: terrain.backHillTexture }} />
        <div className="absolute inset-0" style={{ background: terrain.backHillHighlight }} />
        <div className="absolute inset-0" style={{ background: terrain.backHillShadow }} />
        <div
          className="absolute left-[16%] top-[14%] h-[2px] w-[38%] rounded-full"
          style={{ background: 'rgba(255,255,255,0.2)', transform: 'rotate(-7deg)', opacity: isNight ? 0.24 : 0.5 }}
        />
        <div
          className="absolute right-[18%] top-[32%] h-[2px] w-[30%] rounded-full"
          style={{ background: 'rgba(55,105,60,0.16)', transform: 'rotate(5deg)', opacity: isNight ? 0.3 : 0.44 }}
        />
      </div>
      <div
        className="absolute z-[5] overflow-hidden"
        style={{
          left: compactMode ? '10%' : '13%',
          width: compactMode ? '76%' : '70%',
          top: frontHillTop,
          height: frontHillHeight,
          borderRadius: '54% 46% 0 0 / 100% 100% 0 0',
          background: visuals.frontHillGradient,
        }}
      >
        <div className="absolute inset-0" style={{ background: terrain.frontHillTexture }} />
        <div className="absolute inset-0" style={{ background: terrain.frontHillHighlight }} />
        <div className="absolute inset-0" style={{ background: terrain.frontHillShadow }} />
        <div
          className="absolute left-[10%] top-[18%] h-[2px] w-[42%] rounded-full"
          style={{ background: 'rgba(255,255,255,0.22)', transform: 'rotate(-5deg)', opacity: isNight ? 0.26 : 0.54 }}
        />
        <div
          className="absolute right-[12%] top-[40%] h-[2px] w-[32%] rounded-full"
          style={{ background: 'rgba(58,116,62,0.16)', transform: 'rotate(6deg)', opacity: isNight ? 0.32 : 0.42 }}
        />
      </div>

      <div
        data-testid={getBackdropTestId(testIdPrefix, 'horizon-mist')}
        className="absolute inset-x-[-8%] z-[6] rounded-full"
        style={{
          top: compactMode
            ? useCompactMobilePolish
              ? '31.2%'
              : '35.4%'
            : useTightBackdrop
              ? '29.6%'
              : '34.2%',
          height: compactMode ? '8.8%' : useTightBackdrop ? '6.2%' : '8.4%',
          opacity: terrain.horizonMistOpacity,
          background: terrain.horizonMist,
          filter: 'blur(8px)',
        }}
      />

      <div
        className="absolute inset-x-0 bottom-0 z-[1]"
        style={{
          top: grassTop,
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
          key={`farm-v2-cloud-${weather}-${timeOfDay}-${index}`}
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
        className="absolute z-[6] overflow-hidden"
        style={{
          top: pathTop,
          left: '50%',
          width: compactMode ? '38%' : '28%',
          height: compactMode ? '11.5%' : '10.8%',
          transform: 'translateX(-50%)',
          clipPath: 'polygon(45% 0%, 55% 0%, 78% 100%, 22% 100%)',
          background: terrain.pathGradient,
          boxShadow: `inset 9px 0 10px -12px ${terrain.pathEdge}, inset -9px 0 10px -12px ${terrain.pathEdge}`,
        }}
      >
        <div className="absolute inset-0" style={{ background: terrain.pathTexture, opacity: isNight ? 0.58 : 0.82 }} />
        <div
          className="absolute inset-y-0 left-[18%] w-[2px] rounded-full"
          style={{ background: terrain.pathEdge, transform: 'rotate(-8deg)', opacity: 0.72 }}
        />
        <div
          className="absolute inset-y-0 right-[18%] w-[2px] rounded-full"
          style={{ background: terrain.pathEdge, transform: 'rotate(8deg)', opacity: 0.72 }}
        />
      </div>

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
        visuals={cottage}
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
  previousTimeOfDay,
  nextTimeOfDay,
  token,
}: {
  compactMode: boolean;
  previousWeather: Weather;
  nextWeather: Weather;
  previousTimeOfDay: TimeOfDay;
  nextTimeOfDay: TimeOfDay;
  token: number;
}) {
  const previousVisuals = getWeatherBackdropVisuals(previousWeather, previousTimeOfDay);
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
      data-from-time-of-day={previousTimeOfDay}
      data-to-time-of-day={nextTimeOfDay}
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
      <FarmBackdropV2 compactMode={compactMode} weather={previousWeather} timeOfDay={previousTimeOfDay} testIdPrefix="farm-v2-transition" />
    </div>
  );
}

function FarmWeatherContinuityLayer({
  weather,
  timeOfDay,
  weatherState,
  now,
}: {
  weather: Weather;
  timeOfDay: TimeOfDay;
  weatherState: WeatherState;
  now: number;
}) {
  const wetness = getWeatherWetnessState(weatherState, weather, now);
  const phase = getWeatherContinuityPhase(weatherState, weather, now);
  const showForecastShade = phase === 'sunny-to-cloudy' || phase === 'cloudy-to-rainy';
  const showWetness = wetness.isWet;
  const showAftermathGlow = wetness.visualMode === 'aftermath' && (weather === 'sunny' || weather === 'rainbow');

  return (
    <div
      data-testid="farm-v2-weather-continuity"
      data-production-current-weather={weatherState.current}
      data-production-next-weather={weatherState.next}
      data-visual-weather={weather}
      data-time-of-day={timeOfDay}
      data-continuity-phase={phase}
      data-wetness-mode={wetness.visualMode}
      className="pointer-events-none absolute inset-0 z-[11] overflow-hidden"
    >
      {showForecastShade && (
        <div
          data-testid="farm-v2-continuity-haze"
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: '43%',
            background: phase === 'cloudy-to-rainy'
              ? 'linear-gradient(180deg, rgba(88,117,139,0.22) 0%, rgba(118,149,163,0.12) 52%, rgba(118,149,163,0) 100%)'
              : 'linear-gradient(180deg, rgba(207,224,232,0.18) 0%, rgba(218,231,235,0.09) 56%, rgba(218,231,235,0) 100%)',
          }}
        />
      )}

      {showWetness && (
        <>
          <div
            data-testid="farm-v2-wetness-layer"
            data-wetness-kind={wetness.visualMode}
            className="pointer-events-none absolute inset-x-0 bottom-0"
            style={{
              height: '48%',
              opacity: wetness.visualMode === 'rainy' ? (timeOfDay === 'night' ? 0.52 : 0.82) : (timeOfDay === 'night' ? 0.4 : 0.58),
              background: wetness.visualMode === 'rainy'
                ? 'radial-gradient(ellipse at 50% 72%, rgba(181,222,239,0.34) 0%, rgba(181,222,239,0.16) 32%, rgba(181,222,239,0) 68%), linear-gradient(180deg, rgba(98,128,107,0) 0%, rgba(89,121,104,0.2) 70%, rgba(67,105,91,0.26) 100%)'
                : 'radial-gradient(ellipse at 48% 70%, rgba(235,255,237,0.35) 0%, rgba(169,221,189,0.18) 34%, rgba(169,221,189,0) 70%), linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(161,214,180,0.14) 72%, rgba(115,178,145,0.18) 100%)',
              filter: timeOfDay === 'night' ? 'saturate(0.72) brightness(0.72)' : undefined,
            }}
          />
          <div
            data-testid="farm-v2-puddle-layer"
            data-wetness-kind={wetness.visualMode}
            className="pointer-events-none absolute inset-x-[8%] bottom-[4%] z-[1]"
            style={{
              height: '28%',
              opacity: wetness.visualMode === 'rainy' ? (timeOfDay === 'night' ? 0.42 : 0.7) : (timeOfDay === 'night' ? 0.24 : 0.38),
              background: 'radial-gradient(ellipse at 22% 74%, rgba(170,213,230,0.42) 0%, rgba(118,171,191,0.18) 34%, rgba(118,171,191,0) 62%), radial-gradient(ellipse at 68% 66%, rgba(187,229,240,0.36) 0%, rgba(126,176,193,0.16) 32%, rgba(126,176,193,0) 60%), radial-gradient(ellipse at 47% 86%, rgba(144,196,211,0.28) 0%, rgba(117,166,183,0.12) 36%, rgba(117,166,183,0) 66%)',
              filter: timeOfDay === 'night' ? 'saturate(0.62) brightness(0.62)' : undefined,
            }}
          />
          <div
            data-testid="farm-v2-rain-ripple-layer"
            data-wetness-kind={wetness.visualMode}
            className={`pointer-events-none absolute inset-x-[10%] bottom-[5%] z-[2] ${MOTION_CLASS}`}
            style={{
              height: '24%',
              opacity: wetness.visualMode === 'rainy' ? (timeOfDay === 'night' ? 0.38 : 0.62) : (timeOfDay === 'night' ? 0.18 : 0.28),
              background: 'radial-gradient(ellipse at 24% 78%, rgba(236,249,255,0) 0%, rgba(236,249,255,0) 52%, rgba(236,249,255,0.46) 56%, rgba(236,249,255,0) 64%), radial-gradient(ellipse at 66% 68%, rgba(236,249,255,0) 0%, rgba(236,249,255,0) 50%, rgba(236,249,255,0.38) 54%, rgba(236,249,255,0) 63%), radial-gradient(ellipse at 46% 88%, rgba(236,249,255,0) 0%, rgba(236,249,255,0) 50%, rgba(236,249,255,0.3) 55%, rgba(236,249,255,0) 64%)',
              animation: 'farmV2RainRipple 2.6s ease-in-out -0.4s infinite',
              filter: timeOfDay === 'night' ? 'brightness(0.68)' : undefined,
            }}
          />
          <div
            data-testid="farm-v2-rain-mist-layer"
            className={`pointer-events-none absolute inset-x-0 bottom-[32%] z-[1] ${MOTION_CLASS}`}
            style={{
              height: '18%',
              opacity: wetness.visualMode === 'rainy' ? (timeOfDay === 'night' ? 0.22 : 0.36) : (timeOfDay === 'night' ? 0.12 : 0.2),
              background: 'linear-gradient(90deg, rgba(216,236,239,0) 0%, rgba(216,236,239,0.36) 26%, rgba(216,236,239,0.18) 58%, rgba(216,236,239,0) 100%)',
              filter: 'blur(10px)',
              animation: 'farmV2MistDrift 8s ease-in-out -1.2s infinite',
            }}
          />
          {wetness.visualMode === 'rainy' && (
            <div
              data-testid="farm-v2-rain-splash-layer"
              className={`pointer-events-none absolute inset-x-[12%] bottom-[8%] z-[3] ${MOTION_CLASS}`}
              style={{
                height: '20%',
                opacity: timeOfDay === 'night' ? 0.22 : 0.36,
                background: 'radial-gradient(circle at 18% 82%, rgba(229,245,255,0.64) 0 1px, rgba(229,245,255,0) 2px), radial-gradient(circle at 42% 74%, rgba(229,245,255,0.58) 0 1px, rgba(229,245,255,0) 2px), radial-gradient(circle at 68% 88%, rgba(229,245,255,0.5) 0 1px, rgba(229,245,255,0) 2px), radial-gradient(circle at 82% 66%, rgba(229,245,255,0.46) 0 1px, rgba(229,245,255,0) 2px)',
                animation: 'skyRainSplash 1.8s ease-out -0.35s infinite',
              }}
            />
          )}
        </>
      )}

      {showAftermathGlow && (
        <div
          data-testid="farm-v2-rainy-aftermath-glow"
          className="pointer-events-none absolute inset-x-0 bottom-[12%] mx-auto h-[26%] w-full"
          style={{
            background: weather === 'rainbow'
              ? 'radial-gradient(ellipse at 48% 45%, rgba(255,250,178,0.22) 0%, rgba(167,222,255,0.18) 34%, rgba(167,222,255,0) 70%)'
              : 'radial-gradient(ellipse at 50% 48%, rgba(245,255,226,0.2) 0%, rgba(182,231,194,0.14) 38%, rgba(182,231,194,0) 72%)',
          }}
        />
      )}
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
  timeOfDay,
  weatherState,
  weatherLabel,
  forecastLabel,
  debugWeatherOverride,
  debugTimeOfDayOverride,
  compactMode = false,
  todayFocusMinutes,
  coinBalance,
  plantableSeedCount,
  harvestablePlotCount,
  onPlotClick,
}: FarmPlotBoardV2Props) {
  const previousWeatherRef = useRef(weather);
  const previousTimeOfDayRef = useRef(timeOfDay);
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
    () => (useTightMobileSpacing ? clampNumber(Math.round((viewportHeightPx ?? 800) - 86), 628, 688) : null),
    [useTightMobileSpacing, viewportHeightPx],
  );
  const tightBoardPaddingTopPx = useMemo(
    () => (tightSceneHeightPx ? clampNumber(Math.round(tightSceneHeightPx * 0.34), 214, 228) : null),
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
  const hudWeatherBadgeOffset = useTightMobileSpacing ? 48 : compactMode ? 58 : 54;
  const backdropVisuals = getWeatherBackdropVisuals(weather, timeOfDay);
  const [weatherNow, setWeatherNow] = useState(() => Date.now());
  const wetnessState = useMemo(
    () => getWeatherWetnessState(weatherState, weather, weatherNow),
    [weather, weatherNow, weatherState],
  );
  const continuityPhase = useMemo(
    () => getWeatherContinuityPhase(weatherState, weather, weatherNow),
    [weather, weatherNow, weatherState],
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      previousWeatherRef.current = weather;
      previousTimeOfDayRef.current = timeOfDay;
      return;
    }

    if (previousWeatherRef.current === weather && previousTimeOfDayRef.current === timeOfDay) {
      return;
    }

    transitionTokenRef.current += 1;
    const nextTransition = {
      previousWeather: previousWeatherRef.current,
      nextWeather: weather,
      previousTimeOfDay: previousTimeOfDayRef.current,
      nextTimeOfDay: timeOfDay,
      token: transitionTokenRef.current,
    };
    setTransitionOverlay(nextTransition);
    setLastTransitionMeta(nextTransition);
    setMountedTransitionToken(nextTransition.token);
    activeTransitionTokenRef.current = nextTransition.token;
    previousWeatherRef.current = weather;
    previousTimeOfDayRef.current = timeOfDay;
  }, [timeOfDay, weather]);

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

  useEffect(() => {
    if (weatherState.current !== 'rainy' && !weatherState.rainyAftermathUntil) {
      return undefined;
    }

    const intervalId = window.setInterval(() => setWeatherNow(Date.now()), 60 * 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [weatherState]);

  return (
    <div
      data-testid="farm-v2-scene"
      data-current-weather={weather}
      data-effective-weather={weather}
      data-time-of-day={timeOfDay}
      data-debug-weather-override={debugWeatherOverride ?? ''}
      data-debug-time-of-day-override={debugTimeOfDayOverride ?? ''}
      data-production-current-weather={weatherState.current}
      data-production-next-weather={weatherState.next}
      data-weather-continuity-phase={continuityPhase}
      data-wetness-mode={wetnessState.visualMode}
      data-transition-active={transitionOverlay ? 'true' : 'false'}
      data-last-transition-from={lastTransitionMeta?.previousWeather ?? ''}
      data-last-transition-to={lastTransitionMeta?.nextWeather ?? ''}
      data-last-transition-from-time-of-day={lastTransitionMeta?.previousTimeOfDay ?? ''}
      data-last-transition-to-time-of-day={lastTransitionMeta?.nextTimeOfDay ?? ''}
      data-last-transition-token={lastTransitionMeta ? String(lastTransitionMeta.token) : '0'}
      data-last-transition-mounted-token={String(mountedTransitionToken)}
      data-last-transition-cleared-token={String(clearedTransitionToken)}
      className="relative w-full overflow-hidden"
      style={{
        minHeight: sceneMinHeight,
        height: compactMode ? undefined : useTightMobileSpacing ? '100%' : undefined,
        isolation: 'isolate',
        background: backdropVisuals.sceneBackground,
      }}
    >
      <FarmBackdropV2 compactMode={compactMode} weather={weather} timeOfDay={timeOfDay} />
      <FarmWeatherContinuityLayer weather={weather} timeOfDay={timeOfDay} weatherState={weatherState} now={weatherNow} />
      {transitionOverlay && (
        <FarmWeatherTransitionOverlay
          key={transitionOverlay.token}
          compactMode={compactMode}
          previousWeather={transitionOverlay.previousWeather}
          nextWeather={transitionOverlay.nextWeather}
          previousTimeOfDay={transitionOverlay.previousTimeOfDay}
          nextTimeOfDay={transitionOverlay.nextTimeOfDay}
          token={transitionOverlay.token}
        />
      )}
      <FarmHudV2
        compactMode={compactMode}
        useTightMobileSpacing={useTightMobileSpacing}
        weather={weather}
        timeOfDay={timeOfDay}
        weatherState={weatherState}
        debugWeatherOverride={debugWeatherOverride}
        debugTimeOfDayOverride={debugTimeOfDayOverride}
        weatherLabel={weatherLabel}
        forecastLabel={forecastLabel}
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
