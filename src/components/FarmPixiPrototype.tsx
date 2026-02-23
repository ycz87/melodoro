/**
 * FarmPixiPrototype — Step 5 交互优化版 Pixi 样机。
 *
 * 目标：
 * 1) 保持 Step 4 视觉层（背景/装饰/地块体积感）不回退
 * 2) 使用菱形 hitArea 并可通过日志验证命中
 * 3) 接入种植/生长/收获语义链路与锁定拦截日志
 * 4) 保持交互轻量与渲染流畅
 *
 * 约束：
 * - 不接入 Phase2 机制，仅验证视觉与交互原型
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type PlotState = 'empty' | 'seed' | 'sprout' | 'leaf' | 'flower' | 'fruit' | 'mature' | 'withered';
type PlotVisualState = PlotState | 'locked';
type PrototypeStatus = 'loading' | 'ready' | 'error';
type InteractionAction = 'HIT' | 'PASS' | 'PLANT' | 'GROW' | 'HARVEST' | 'CLEAR' | 'LOCKED_BLOCK';

interface PlotTransition {
  nextState: PlotState;
  action: 'PLANT' | 'GROW' | 'HARVEST' | 'CLEAR';
  result: string;
  harvestedDelta: number;
}

interface InteractionLogEntry {
  id: number;
  time: string;
  plotId: number | null;
  action: InteractionAction;
  result: string;
}

interface LastActionInfo {
  action: InteractionAction | 'NONE';
  detail: string;
}

interface PlotPalette {
  top: number;
  left: number;
  right: number;
  edge: number;
}

interface PixiScaleLike {
  set(x: number, y?: number): void;
}

interface PixiDisplayObjectLike {
  x: number;
  y: number;
  alpha: number;
  scale: PixiScaleLike;
}

interface PixiContainerLike extends PixiDisplayObjectLike {
  addChild(...children: PixiDisplayObjectLike[]): void;
}

interface PixiGraphicsLike extends PixiDisplayObjectLike {
  clear(): PixiGraphicsLike;
  lineStyle(width: number, color: number, alpha?: number): PixiGraphicsLike;
  beginFill(color: number, alpha?: number): PixiGraphicsLike;
  drawRect(x: number, y: number, width: number, height: number): PixiGraphicsLike;
  drawPolygon(path: number[]): PixiGraphicsLike;
  drawEllipse(x: number, y: number, width: number, height: number): PixiGraphicsLike;
  drawCircle(x: number, y: number, radius: number): PixiGraphicsLike;
  moveTo(x: number, y: number): PixiGraphicsLike;
  lineTo(x: number, y: number): PixiGraphicsLike;
  endFill(): PixiGraphicsLike;
  interactive: boolean;
  cursor: string;
  hitArea?: unknown;
  on(event: 'pointertap' | 'pointerover' | 'pointerout', fn: () => void): void;
}

interface PixiRendererLike {
  resize(width: number, height: number): void;
  render(displayObject: PixiContainerLike): void;
}

interface PixiApplicationLike {
  stage: PixiContainerLike;
  renderer: PixiRendererLike;
  screen: { width: number; height: number };
  view?: HTMLCanvasElement;
  destroy(removeView?: boolean, options?: { children?: boolean; texture?: boolean; baseTexture?: boolean }): void;
}

interface PixiModuleLike {
  Application: new (options: {
    width: number;
    height: number;
    antialias: boolean;
    autoDensity: boolean;
    resolution: number;
    backgroundAlpha: number;
    autoStart?: boolean;
  }) => PixiApplicationLike;
  Container: new () => PixiContainerLike;
  Graphics: new () => PixiGraphicsLike;
  Polygon: new (points: number[]) => unknown;
}

interface SceneLayout {
  halfWidth: number;
  halfHeight: number;
  thickness: number;
  stepX: number;
  stepY: number;
  shadowWidth: number;
  shadowHeight: number;
  shadowOffsetY: number;
  stageY: number;
  hoverLift: number;
}

interface RenderPlot {
  id: number;
  baseX: number;
  baseY: number;
  container: PixiContainerLike;
  shape: PixiGraphicsLike;
  overlay: PixiGraphicsLike;
  lockOverlay: PixiGraphicsLike;
}

interface SceneBackdropLayout {
  horizonY: number;
  groundTopY: number;
  decorationScale: number;
}

const PIXI_ESM_CDN_URL = 'https://cdn.jsdelivr.net/npm/pixi.js@7.4.3/dist/pixi.min.mjs';
const PIXI_LEGACY_CDN_URL = 'https://cdn.jsdelivr.net/npm/pixi.js-legacy@7.4.3/dist/pixi-legacy.min.js';
const PIXI_LEGACY_SCRIPT_ID = 'farm-pixi-legacy-runtime';
const GRID_SIZE = 3;
const TOTAL_PLOTS = GRID_SIZE * GRID_SIZE;
const PLOT_RENDER_ORDER = [0, 1, 3, 2, 4, 6, 5, 7, 8] as const;
const MAX_INTERACTION_LOGS = 6;

const DEFAULT_PLOT_STATES: PlotVisualState[] = [
  'empty',
  'seed',
  'sprout',
  'leaf',
  'flower',
  'fruit',
  'mature',
  'withered',
  'locked',
];

const PLOT_PALETTES: Record<PlotVisualState, PlotPalette> = {
  empty: {
    top: 0xd9a367,
    left: 0xa87042,
    right: 0x956136,
    edge: 0x684126,
  },
  seed: {
    top: 0xd4a06a,
    left: 0xa1693f,
    right: 0x8e5b35,
    edge: 0x603d24,
  },
  sprout: {
    top: 0xd6ad75,
    left: 0x9e7544,
    right: 0x8f693b,
    edge: 0x624729,
  },
  leaf: {
    top: 0xd3b67d,
    left: 0x987444,
    right: 0x87663a,
    edge: 0x5f4426,
  },
  flower: {
    top: 0xd6b983,
    left: 0x9a7646,
    right: 0x8a683c,
    edge: 0x60462a,
  },
  fruit: {
    top: 0xcfa572,
    left: 0x92633b,
    right: 0x7f5531,
    edge: 0x563920,
  },
  mature: {
    top: 0xd4a268,
    left: 0x8a5f36,
    right: 0x784f2b,
    edge: 0x53351d,
  },
  withered: {
    top: 0x9f8f7a,
    left: 0x70604f,
    right: 0x615344,
    edge: 0x3f342c,
  },
  locked: {
    top: 0xa6a2a0,
    left: 0x84817f,
    right: 0x757270,
    edge: 0x545251,
  },
};

const HOVER_STATE_LABELS: Record<PlotState, string> = {
  empty: 'EMPTY',
  seed: 'SEED',
  sprout: 'SPROUT',
  leaf: 'LEAF',
  flower: 'FLOWER',
  fruit: 'FRUIT',
  mature: 'MATURE',
  withered: 'WITHERED',
};

const SOIL_MICRO_POINTS: ReadonlyArray<{ x: number; y: number; size: number }> = [
  { x: -0.58, y: -0.02, size: 0.76 },
  { x: -0.48, y: -0.14, size: 0.62 },
  { x: -0.41, y: 0.1, size: 0.82 },
  { x: -0.31, y: -0.2, size: 0.58 },
  { x: -0.24, y: 0.02, size: 0.9 },
  { x: -0.17, y: 0.17, size: 0.7 },
  { x: -0.07, y: -0.11, size: 0.86 },
  { x: 0.02, y: 0.06, size: 0.78 },
  { x: 0.09, y: -0.2, size: 0.66 },
  { x: 0.18, y: -0.03, size: 0.84 },
  { x: 0.24, y: 0.15, size: 0.7 },
  { x: 0.32, y: -0.16, size: 0.64 },
  { x: 0.41, y: 0.05, size: 0.82 },
  { x: 0.53, y: -0.02, size: 0.72 },
];

const SOIL_MICRO_CRACKS: ReadonlyArray<[number, number, number, number, number, number]> = [
  [-0.44, -0.08, -0.24, 0.02, -0.08, -0.03],
  [-0.14, 0.06, 0.02, 0.12, 0.17, 0.06],
  [0.16, -0.1, 0.31, -0.04, 0.44, -0.1],
  [-0.02, -0.2, 0.12, -0.14, 0.21, -0.21],
];

let pixiLegacyLoadPromise: Promise<PixiModuleLike> | null = null;

function isPixiModule(value: unknown): value is PixiModuleLike {
  if (!value || typeof value !== 'object') return false;
  const objectValue = value as Record<string, unknown>;
  return (
    typeof objectValue.Application === 'function' &&
    typeof objectValue.Container === 'function' &&
    typeof objectValue.Graphics === 'function' &&
    typeof objectValue.Polygon === 'function'
  );
}

function isUnlockedState(state: PlotVisualState): state is PlotState {
  return state !== 'locked';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown Pixi setup error';
}

function isAutoDetectRendererError(error: unknown): boolean {
  return /auto-?detect.*suitable renderer/i.test(getErrorMessage(error));
}

function getLegacyPixiFromWindow(): PixiModuleLike | null {
  if (typeof window === 'undefined') return null;
  const globalPixi = (window as Window & { PIXI?: unknown }).PIXI;
  if (!isPixiModule(globalPixi)) return null;
  return globalPixi;
}

function loadPixiLegacyModule(): Promise<PixiModuleLike> {
  const existingModule = getLegacyPixiFromWindow();
  if (existingModule) return Promise.resolve(existingModule);
  if (pixiLegacyLoadPromise) return pixiLegacyLoadPromise;
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Document is unavailable for Pixi legacy fallback'));
  }

  pixiLegacyLoadPromise = new Promise<PixiModuleLike>((resolve, reject) => {
    const resolveLegacyModule = () => {
      const legacyModule = getLegacyPixiFromWindow();
      if (!legacyModule) {
        reject(new Error('Pixi legacy runtime loaded but window.PIXI is unavailable'));
        return;
      }
      resolve(legacyModule);
    };

    const existingScript = document.getElementById(PIXI_LEGACY_SCRIPT_ID);
    const script = existingScript instanceof HTMLScriptElement ? existingScript : document.createElement('script');

    if (!existingScript) {
      script.id = PIXI_LEGACY_SCRIPT_ID;
      script.src = PIXI_LEGACY_CDN_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
    }

    const loadedModule = getLegacyPixiFromWindow();
    if (loadedModule) {
      script.setAttribute('data-loaded', 'true');
      resolve(loadedModule);
      return;
    }

    script.addEventListener(
      'load',
      () => {
        script.setAttribute('data-loaded', 'true');
        resolveLegacyModule();
      },
      { once: true },
    );
    script.addEventListener(
      'error',
      () => {
        reject(new Error('Failed to load pixi.js-legacy fallback runtime'));
      },
      { once: true },
    );

    if (!script.isConnected) {
      const parent = document.head ?? document.body;
      if (!parent) {
        reject(new Error('Document has no head/body to attach Pixi legacy script'));
        return;
      }
      parent.appendChild(script);
      return;
    }

    if (script.getAttribute('data-loaded') === 'true') {
      resolveLegacyModule();
    }
  }).catch((error) => {
    pixiLegacyLoadPromise = null;
    throw error;
  });

  return pixiLegacyLoadPromise;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function cyclePlotState(current: PlotState): PlotState {
  if (current === 'empty') return 'seed';
  if (current === 'seed') return 'sprout';
  if (current === 'sprout') return 'leaf';
  if (current === 'leaf') return 'flower';
  if (current === 'flower') return 'fruit';
  if (current === 'fruit') return 'mature';
  if (current === 'mature') return 'withered';
  return 'empty';
}

function resolvePlotTransition(current: PlotState): PlotTransition {
  if (current === 'empty') {
    return {
      nextState: 'seed',
      action: 'PLANT',
      result: 'empty->seed',
      harvestedDelta: 0,
    };
  }
  if (current === 'mature') {
    return {
      nextState: 'empty',
      action: 'HARVEST',
      result: 'mature->empty',
      harvestedDelta: 1,
    };
  }
  if (current === 'withered') {
    return {
      nextState: 'empty',
      action: 'CLEAR',
      result: 'withered->empty',
      harvestedDelta: 0,
    };
  }

  const nextState = cyclePlotState(current);
  return {
    nextState,
    action: 'GROW',
    result: `${current}->${nextState}`,
    harvestedDelta: 0,
  };
}

function formatLogTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function lightenColor(color: number, ratio: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const nextR = Math.round(r + (255 - r) * ratio);
  const nextG = Math.round(g + (255 - g) * ratio);
  const nextB = Math.round(b + (255 - b) * ratio);
  return (nextR << 16) | (nextG << 8) | nextB;
}

function mixColor(from: number, to: number, ratio: number): number {
  const clampedRatio = clamp(ratio, 0, 1);
  const fromR = (from >> 16) & 0xff;
  const fromG = (from >> 8) & 0xff;
  const fromB = from & 0xff;
  const toR = (to >> 16) & 0xff;
  const toG = (to >> 8) & 0xff;
  const toB = to & 0xff;
  const nextR = Math.round(fromR + (toR - fromR) * clampedRatio);
  const nextG = Math.round(fromG + (toG - fromG) * clampedRatio);
  const nextB = Math.round(fromB + (toB - fromB) * clampedRatio);
  return (nextR << 16) | (nextG << 8) | nextB;
}

function resolveBackdropLayout(viewportWidth: number, viewportHeight: number): SceneBackdropLayout {
  const horizonRatio = viewportWidth < 560 ? 0.37 : viewportWidth < 980 ? 0.35 : 0.33;
  const horizonY = Math.round(viewportHeight * horizonRatio);
  const decorationScale = clamp(Math.min(viewportWidth / 980, viewportHeight / 620), 0.62, 1.2);
  const groundTopY = Math.round(horizonY + 18 * decorationScale);
  return {
    horizonY,
    groundTopY,
    decorationScale,
  };
}

function drawSkyLayer(
  skyLayer: PixiGraphicsLike,
  viewportWidth: number,
  backdropLayout: SceneBackdropLayout,
): void {
  skyLayer.clear();
  skyLayer.lineStyle(0, 0x000000, 0);

  const skyBandCount = 24;
  for (let index = 0; index < skyBandCount; index += 1) {
    const startY = Math.round((backdropLayout.horizonY * index) / skyBandCount);
    const endY = Math.round((backdropLayout.horizonY * (index + 1)) / skyBandCount);
    const bandHeight = Math.max(2, endY - startY + 1);
    const color = mixColor(0x7bccff, 0xecfbff, index / (skyBandCount - 1));
    skyLayer.beginFill(color, 1);
    skyLayer.drawRect(0, startY, viewportWidth, bandHeight);
    skyLayer.endFill();
  }

  skyLayer.beginFill(0xd8f5ff, 0.52);
  skyLayer.drawRect(0, backdropLayout.horizonY - 3, viewportWidth, 8);
  skyLayer.endFill();
}

function drawFarMidLayer(
  farLayer: PixiGraphicsLike,
  viewportWidth: number,
  viewportHeight: number,
  backdropLayout: SceneBackdropLayout,
): void {
  farLayer.clear();
  farLayer.lineStyle(0, 0x000000, 0);

  const hillBaseY = backdropLayout.horizonY + Math.round(30 * backdropLayout.decorationScale);
  farLayer.lineStyle(2, 0x94bc71, 0.62);
  farLayer.beginFill(0xcde8a0, 1);
  farLayer.drawPolygon([
    0, hillBaseY + 16,
    viewportWidth * 0.08, hillBaseY + 2,
    viewportWidth * 0.25, hillBaseY + 14,
    viewportWidth * 0.42, hillBaseY - 1,
    viewportWidth * 0.58, hillBaseY + 13,
    viewportWidth * 0.74, hillBaseY + 1,
    viewportWidth * 0.9, hillBaseY + 14,
    viewportWidth, hillBaseY + 6,
    viewportWidth, viewportHeight,
    0, viewportHeight,
  ]);
  farLayer.endFill();

  const grassBandCount = 22;
  const grassHeight = Math.max(16, viewportHeight - backdropLayout.groundTopY);
  farLayer.lineStyle(0, 0x000000, 0);
  for (let index = 0; index < grassBandCount; index += 1) {
    const startY = backdropLayout.groundTopY + Math.round((grassHeight * index) / grassBandCount);
    const endY = backdropLayout.groundTopY + Math.round((grassHeight * (index + 1)) / grassBandCount);
    const bandHeight = Math.max(2, endY - startY + 1);
    const color = mixColor(0xc6e98c, 0x96c953, index / (grassBandCount - 1));
    farLayer.beginFill(color, 1);
    farLayer.drawRect(0, startY, viewportWidth, bandHeight);
    farLayer.endFill();
  }

  farLayer.beginFill(0xddf4ae, 0.26);
  farLayer.drawEllipse(viewportWidth * 0.23, viewportHeight * 0.84, viewportWidth * 0.33, viewportHeight * 0.11);
  farLayer.drawEllipse(viewportWidth * 0.77, viewportHeight * 0.75, viewportWidth * 0.3, viewportHeight * 0.1);
  farLayer.endFill();

  const scale = backdropLayout.decorationScale;
  const farGroundY = backdropLayout.groundTopY + grassHeight * 0.44;
  const leftBuildingX = Math.max(54 * scale, viewportWidth * 0.11);
  const rightBuildingX = Math.min(viewportWidth - 54 * scale, viewportWidth * 0.89);
  const farFenceOffset = Math.max(6, 14 * scale);
  const farSegmentWidth = Math.max(8, 14 * scale);
  const farFenceSpan = 5 * farSegmentWidth;

  farLayer.beginFill(0xeaf8c9, 0.18);
  farLayer.drawRect(0, backdropLayout.groundTopY - 2, viewportWidth, Math.max(10, 17 * scale));
  farLayer.endFill();

  drawSun(
    farLayer,
    viewportWidth * 0.15,
    Math.max(50 * scale, viewportHeight * 0.1),
    Math.max(20, 28 * scale),
  );
  drawCloud(farLayer, viewportWidth * 0.14, viewportHeight * 0.2, 0.68 * scale);
  drawCloud(farLayer, viewportWidth * 0.56, viewportHeight * 0.13, 0.76 * scale);
  drawCloud(farLayer, viewportWidth * 0.9, viewportHeight * 0.18, 0.86 * scale);

  drawCottage(farLayer, leftBuildingX, farGroundY + 2 * scale, 0.6 * scale);
  drawBarn(farLayer, rightBuildingX, farGroundY + 3 * scale, 0.63 * scale);
  drawFence(farLayer, farFenceOffset, farGroundY + 5 * scale, 5, farSegmentWidth, 0.7 * scale);
  drawFence(
    farLayer,
    viewportWidth - farFenceSpan - farFenceOffset,
    farGroundY + 5 * scale,
    5,
    farSegmentWidth,
    0.7 * scale,
  );
}

function drawCloud(
  layer: PixiGraphicsLike,
  centerX: number,
  centerY: number,
  scale: number,
  alpha = 1,
): void {
  const lineWidth = Math.max(1, Math.round(scale * 2));
  layer.lineStyle(lineWidth, 0x9bc3d7, 0.56 * alpha);
  layer.beginFill(0xffffff, 0.96 * alpha);
  layer.drawCircle(centerX - 34 * scale, centerY + 2 * scale, 18 * scale);
  layer.drawCircle(centerX - 10 * scale, centerY - 9 * scale, 24 * scale);
  layer.drawCircle(centerX + 24 * scale, centerY - 2 * scale, 20 * scale);
  layer.drawCircle(centerX + 52 * scale, centerY + 4 * scale, 14 * scale);
  layer.drawEllipse(centerX + 8 * scale, centerY + 12 * scale, 60 * scale, 19 * scale);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xc6deec, 0.24 * alpha);
  layer.drawEllipse(centerX + 6 * scale, centerY + 13 * scale, 42 * scale, 11 * scale);
  layer.endFill();
}

function drawSun(layer: PixiGraphicsLike, centerX: number, centerY: number, radius: number): void {
  const rayCount = 12;
  const raySpread = 0.2;

  layer.lineStyle(2, 0xd89036, 0.92);
  for (let index = 0; index < rayCount; index += 1) {
    const angle = (index / rayCount) * Math.PI * 2;
    const innerRadius = radius * 1.02;
    const outerRadius = radius * 1.5;
    const leftX = centerX + Math.cos(angle - raySpread) * innerRadius;
    const leftY = centerY + Math.sin(angle - raySpread) * innerRadius;
    const tipX = centerX + Math.cos(angle) * outerRadius;
    const tipY = centerY + Math.sin(angle) * outerRadius;
    const rightX = centerX + Math.cos(angle + raySpread) * innerRadius;
    const rightY = centerY + Math.sin(angle + raySpread) * innerRadius;
    layer.beginFill(0xffcb51, 1);
    layer.drawPolygon([leftX, leftY, tipX, tipY, rightX, rightY]);
    layer.endFill();
  }

  layer.lineStyle(3, 0xd89036, 0.96);
  layer.beginFill(0xffe169, 1);
  layer.drawCircle(centerX, centerY, radius);
  layer.endFill();

  const eyeRadius = Math.max(2, Math.round(radius * 0.1));
  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x5b431c, 1);
  layer.drawCircle(centerX - radius * 0.28, centerY - radius * 0.1, eyeRadius);
  layer.drawCircle(centerX + radius * 0.28, centerY - radius * 0.1, eyeRadius);
  layer.endFill();

  layer.lineStyle(2, 0x8f5f2a, 0.9);
  layer.moveTo(centerX - radius * 0.24, centerY + radius * 0.2);
  layer.lineTo(centerX, centerY + radius * 0.34);
  layer.lineTo(centerX + radius * 0.24, centerY + radius * 0.2);

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xf7a3a0, 0.8);
  layer.drawCircle(centerX - radius * 0.42, centerY + radius * 0.12, radius * 0.13);
  layer.drawCircle(centerX + radius * 0.42, centerY + radius * 0.12, radius * 0.13);
  layer.endFill();
}

function drawFence(
  layer: PixiGraphicsLike,
  startX: number,
  groundY: number,
  segmentCount: number,
  segmentWidth: number,
  scale: number,
): void {
  const postWidth = Math.max(4, 7 * scale);
  const postHeight = Math.max(10, 24 * scale);
  const railHeight = Math.max(2, 3.8 * scale);
  const spanWidth = segmentCount * segmentWidth;
  const lineWidth = Math.max(1, Math.round(1.8 * scale));
  const topRailY = groundY - postHeight + 6 * scale;
  const lowerRailY = groundY - postHeight * 0.46;

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x425b39, 0.2);
  layer.drawEllipse(startX + spanWidth * 0.5, groundY + 4 * scale, spanWidth * 0.64, 7.5 * scale);
  layer.endFill();

  layer.beginFill(0x86562e, 0.34);
  layer.drawRect(startX - postWidth * 0.5, topRailY + railHeight * 0.58, spanWidth + postWidth, railHeight * 0.72);
  layer.drawRect(startX - postWidth * 0.5, lowerRailY + railHeight * 0.58, spanWidth + postWidth, railHeight * 0.72);
  layer.endFill();

  layer.lineStyle(lineWidth, 0x7d502a, 0.9);
  layer.beginFill(0xce9b67, 0.98);
  layer.drawRect(startX - postWidth * 0.5, topRailY, spanWidth + postWidth, railHeight);
  layer.drawRect(startX - postWidth * 0.5, lowerRailY, spanWidth + postWidth, railHeight);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xf4c999, 0.28);
  layer.drawRect(startX - postWidth * 0.44, topRailY + railHeight * 0.16, spanWidth + postWidth * 0.88, railHeight * 0.24);
  layer.drawRect(startX - postWidth * 0.44, lowerRailY + railHeight * 0.16, spanWidth + postWidth * 0.88, railHeight * 0.24);
  layer.endFill();

  for (let index = 0; index <= segmentCount; index += 1) {
    const postX = startX + index * segmentWidth;
    const postLeft = postX - postWidth * 0.5;

    layer.lineStyle(lineWidth, 0x7d502a, 0.92);
    layer.beginFill(0xd7a875, 1);
    layer.drawRect(postLeft, groundY - postHeight, postWidth, postHeight);
    layer.endFill();

    layer.lineStyle(0, 0x000000, 0);
    layer.beginFill(0xf7d3aa, 0.28);
    layer.drawRect(postLeft + postWidth * 0.12, groundY - postHeight + 1 * scale, postWidth * 0.22, postHeight - 1 * scale);
    layer.endFill();

    layer.beginFill(0x8f5d33, 0.24);
    layer.drawRect(postLeft + postWidth * 0.66, groundY - postHeight + 1 * scale, postWidth * 0.2, postHeight - 1 * scale);
    layer.endFill();

    layer.beginFill(0xb57949, 0.68);
    layer.drawPolygon([
      postX - postWidth * 0.62, groundY - postHeight + 1 * scale,
      postX, groundY - postHeight - 2 * scale,
      postX + postWidth * 0.62, groundY - postHeight + 1 * scale,
      postX + postWidth * 0.42, groundY - postHeight + 3 * scale,
      postX - postWidth * 0.42, groundY - postHeight + 3 * scale,
    ]);
    layer.endFill();

    layer.beginFill(0x794b2b, 0.78);
    layer.drawCircle(postX, groundY - postHeight * 0.36, Math.max(0.7, scale * 0.85));
    layer.endFill();
  }

  layer.lineStyle(1, 0x85552f, 0.34);
  for (let index = 0; index < segmentCount; index += 1) {
    const seamX = startX + index * segmentWidth + segmentWidth * 0.5;
    layer.moveTo(seamX, topRailY + railHeight * 0.18);
    layer.lineTo(seamX, topRailY + railHeight * 0.84);
    layer.moveTo(seamX, lowerRailY + railHeight * 0.18);
    layer.lineTo(seamX, lowerRailY + railHeight * 0.84);
  }
}

function drawCottage(layer: PixiGraphicsLike, centerX: number, groundY: number, scale: number): void {
  const bodyWidth = 98 * scale;
  const bodyHeight = 72 * scale;
  const roofHeight = 47 * scale;
  const leftX = centerX - bodyWidth * 0.5;
  const topY = groundY - bodyHeight;
  const lineWidth = Math.max(1, Math.round(1.9 * scale));
  const windowWidth = bodyWidth * 0.2;
  const windowHeight = bodyHeight * 0.29;
  const doorWidth = bodyWidth * 0.23;
  const doorHeight = bodyHeight * 0.55;

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x5a704f, 0.24);
  layer.drawEllipse(centerX, groundY + 6 * scale, bodyWidth * 0.6, 12 * scale);
  layer.drawEllipse(centerX + bodyWidth * 0.15, groundY + 7 * scale, bodyWidth * 0.22, 5 * scale);
  layer.endFill();

  layer.lineStyle(lineWidth, 0x855f43, 0.92);
  layer.beginFill(0xf7ddbc, 1);
  layer.drawRect(leftX, topY, bodyWidth, bodyHeight);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xfff2e0, 0.28);
  layer.drawRect(leftX + bodyWidth * 0.06, topY + bodyHeight * 0.08, bodyWidth * 0.28, bodyHeight * 0.84);
  layer.endFill();

  layer.beginFill(0xdab995, 0.23);
  layer.drawRect(leftX + bodyWidth * 0.68, topY + bodyHeight * 0.08, bodyWidth * 0.24, bodyHeight * 0.84);
  layer.endFill();

  layer.lineStyle(1, 0xd0ab86, 0.35);
  for (let index = 1; index < 5; index += 1) {
    const x = leftX + (bodyWidth * index) / 5;
    layer.moveTo(x, topY + bodyHeight * 0.08);
    layer.lineTo(x, topY + bodyHeight * 0.92);
  }

  layer.lineStyle(lineWidth, 0x885639, 0.94);
  layer.beginFill(0xc7764f, 1);
  layer.drawPolygon([
    centerX, topY - roofHeight,
    leftX - 6 * scale, topY + 8 * scale,
    leftX + bodyWidth + 6 * scale, topY + 8 * scale,
  ]);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x8e563b, 0.62);
  layer.drawPolygon([
    leftX - 6 * scale, topY + 8 * scale,
    leftX + bodyWidth + 6 * scale, topY + 8 * scale,
    leftX + bodyWidth + 2 * scale, topY + 14 * scale,
    leftX - 2 * scale, topY + 14 * scale,
  ]);
  layer.endFill();

  layer.beginFill(0xf0a985, 0.28);
  layer.drawPolygon([
    centerX - bodyWidth * 0.36, topY + 6 * scale,
    centerX, topY - roofHeight + 6 * scale,
    centerX + bodyWidth * 0.08, topY + 7 * scale,
    centerX - bodyWidth * 0.17, topY + 10 * scale,
  ]);
  layer.endFill();

  layer.lineStyle(1, 0x8f5437, 0.36);
  for (let index = 0; index < 3; index += 1) {
    const y = topY - roofHeight * 0.2 + index * roofHeight * 0.24;
    layer.moveTo(centerX - bodyWidth * 0.36 + index * 1.5 * scale, y + roofHeight * 0.2);
    layer.lineTo(centerX + bodyWidth * 0.36 - index * 1.5 * scale, y + roofHeight * 0.24);
  }

  layer.lineStyle(Math.max(1, lineWidth - 0.5), 0x84553e, 0.92);
  layer.beginFill(0xbf7f58, 1);
  layer.drawRect(centerX + bodyWidth * 0.2, topY - roofHeight * 0.46, bodyWidth * 0.12, roofHeight * 0.5);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xe9b691, 0.46);
  layer.drawRect(centerX + bodyWidth * 0.22, topY - roofHeight * 0.42, bodyWidth * 0.03, roofHeight * 0.46);
  layer.endFill();

  layer.beginFill(0x8f5f41, 1);
  layer.drawRect(centerX + bodyWidth * 0.19, topY - roofHeight * 0.5, bodyWidth * 0.14, roofHeight * 0.08);
  layer.endFill();

  for (const offset of [0.12, 0.68]) {
    const windowX = leftX + bodyWidth * offset;
    const windowY = topY + bodyHeight * 0.22;

    layer.lineStyle(lineWidth, 0x7f5a41, 0.92);
    layer.beginFill(0xe7f2ff, 1);
    layer.drawRect(windowX, windowY, windowWidth, windowHeight);
    layer.endFill();

    layer.lineStyle(1, 0xb6d3ee, 0.64);
    layer.moveTo(windowX + windowWidth * 0.08, windowY + windowHeight * 0.28);
    layer.lineTo(windowX + windowWidth * 0.92, windowY + windowHeight * 0.28);
    layer.moveTo(windowX + windowWidth * 0.08, windowY + windowHeight * 0.54);
    layer.lineTo(windowX + windowWidth * 0.92, windowY + windowHeight * 0.54);

    layer.lineStyle(1.1, 0x896246, 0.8);
    layer.moveTo(windowX + windowWidth * 0.5, windowY + windowHeight * 0.06);
    layer.lineTo(windowX + windowWidth * 0.5, windowY + windowHeight * 0.94);
    layer.moveTo(windowX + windowWidth * 0.08, windowY + windowHeight * 0.5);
    layer.lineTo(windowX + windowWidth * 0.92, windowY + windowHeight * 0.5);
  }

  const doorLeft = leftX + bodyWidth * 0.39;
  const doorTop = topY + bodyHeight * 0.45;
  layer.lineStyle(lineWidth, 0x7d4f2e, 0.94);
  layer.beginFill(0xce9b6c, 1);
  layer.drawRect(doorLeft, doorTop, doorWidth, doorHeight);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xeec69c, 0.32);
  layer.drawRect(doorLeft + doorWidth * 0.12, doorTop + 1 * scale, doorWidth * 0.22, doorHeight - 2 * scale);
  layer.endFill();

  layer.beginFill(0x8c5832, 0.2);
  layer.drawRect(doorLeft + doorWidth * 0.64, doorTop + 1 * scale, doorWidth * 0.2, doorHeight - 2 * scale);
  layer.endFill();

  layer.lineStyle(1, 0x7b4f2d, 0.52);
  layer.moveTo(doorLeft + doorWidth * 0.5, doorTop + doorHeight * 0.08);
  layer.lineTo(doorLeft + doorWidth * 0.5, doorTop + doorHeight * 0.92);
  layer.moveTo(doorLeft + doorWidth * 0.2, doorTop + doorHeight * 0.35);
  layer.lineTo(doorLeft + doorWidth * 0.8, doorTop + doorHeight * 0.35);

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x724626, 0.92);
  layer.drawCircle(doorLeft + doorWidth * 0.78, doorTop + doorHeight * 0.58, Math.max(0.8, scale * 1.1));
  layer.endFill();

  layer.beginFill(0x4f6a42, 0.5);
  layer.drawRect(doorLeft - 2 * scale, doorTop + doorHeight - 2 * scale, doorWidth + 4 * scale, 3 * scale);
  layer.endFill();
}

function drawBarn(layer: PixiGraphicsLike, centerX: number, groundY: number, scale: number): void {
  const bodyWidth = 114 * scale;
  const bodyHeight = 76 * scale;
  const roofRise = 34 * scale;
  const leftX = centerX - bodyWidth * 0.5;
  const topY = groundY - bodyHeight;
  const lineWidth = Math.max(1, Math.round(1.9 * scale));

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x5a6e4d, 0.24);
  layer.drawEllipse(centerX, groundY + 6 * scale, bodyWidth * 0.58, 13 * scale);
  layer.drawEllipse(centerX - bodyWidth * 0.18, groundY + 7 * scale, bodyWidth * 0.24, 5 * scale);
  layer.endFill();

  layer.lineStyle(lineWidth, 0x7f4639, 0.94);
  layer.beginFill(0xdf5e50, 1);
  layer.drawRect(leftX, topY, bodyWidth, bodyHeight);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xf08f82, 0.22);
  layer.drawRect(leftX + bodyWidth * 0.08, topY + bodyHeight * 0.07, bodyWidth * 0.24, bodyHeight * 0.86);
  layer.endFill();

  layer.beginFill(0x9e4339, 0.2);
  layer.drawRect(leftX + bodyWidth * 0.68, topY + bodyHeight * 0.07, bodyWidth * 0.24, bodyHeight * 0.86);
  layer.endFill();

  layer.lineStyle(1, 0xb74f43, 0.42);
  for (let index = 1; index < 7; index += 1) {
    const x = leftX + (bodyWidth * index) / 7;
    layer.moveTo(x, topY + bodyHeight * 0.08);
    layer.lineTo(x, topY + bodyHeight * 0.92);
  }

  layer.lineStyle(lineWidth, 0x654948, 0.94);
  layer.beginFill(0x988083, 1);
  layer.drawPolygon([
    leftX - 6 * scale, topY + 3 * scale,
    centerX, topY - roofRise,
    leftX + bodyWidth + 6 * scale, topY + 3 * scale,
    leftX + bodyWidth, topY + 18 * scale,
    leftX, topY + 18 * scale,
  ]);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x7a5f64, 0.68);
  layer.drawPolygon([
    leftX - 2 * scale, topY + 16 * scale,
    leftX + bodyWidth + 2 * scale, topY + 16 * scale,
    leftX + bodyWidth, topY + 20 * scale,
    leftX, topY + 20 * scale,
  ]);
  layer.endFill();

  layer.beginFill(0xc3abb0, 0.28);
  layer.drawPolygon([
    centerX - bodyWidth * 0.32, topY + 8 * scale,
    centerX, topY - roofRise + 7 * scale,
    centerX + bodyWidth * 0.12, topY + 9 * scale,
    centerX - bodyWidth * 0.11, topY + 12 * scale,
  ]);
  layer.endFill();

  layer.lineStyle(1, 0x655154, 0.4);
  layer.moveTo(centerX - bodyWidth * 0.28, topY + 5 * scale);
  layer.lineTo(centerX + bodyWidth * 0.28, topY + 7 * scale);
  layer.moveTo(centerX - bodyWidth * 0.2, topY + 10 * scale);
  layer.lineTo(centerX + bodyWidth * 0.2, topY + 12 * scale);

  const doorWidth = bodyWidth * 0.42;
  const doorHeight = bodyHeight * 0.65;
  const doorLeft = centerX - doorWidth * 0.5;
  const doorTop = groundY - doorHeight;
  layer.lineStyle(lineWidth, 0xeec8a8, 0.9);
  layer.beginFill(0xb74f44, 1);
  layer.drawRect(doorLeft, doorTop, doorWidth, doorHeight);
  layer.endFill();

  layer.lineStyle(2, 0xeec8a8, 0.84);
  layer.moveTo(doorLeft, doorTop);
  layer.lineTo(doorLeft + doorWidth, doorTop + doorHeight);
  layer.moveTo(doorLeft + doorWidth, doorTop);
  layer.lineTo(doorLeft, doorTop + doorHeight);
  layer.moveTo(doorLeft + doorWidth * 0.5, doorTop + 1 * scale);
  layer.lineTo(doorLeft + doorWidth * 0.5, doorTop + doorHeight - 1 * scale);

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xf6d9bf, 0.2);
  layer.drawRect(doorLeft + doorWidth * 0.08, doorTop + 1 * scale, doorWidth * 0.16, doorHeight - 2 * scale);
  layer.endFill();

  layer.beginFill(0x8f3931, 0.2);
  layer.drawRect(doorLeft + doorWidth * 0.76, doorTop + 1 * scale, doorWidth * 0.14, doorHeight - 2 * scale);
  layer.endFill();

  layer.lineStyle(lineWidth, 0xeec8a8, 0.9);
  layer.beginFill(0xcb6d60, 1);
  layer.drawRect(leftX + bodyWidth * 0.31, topY + bodyHeight * 0.12, bodyWidth * 0.18, bodyHeight * 0.2);
  layer.endFill();

  layer.lineStyle(1.2, 0xf7e6d4, 0.7);
  layer.moveTo(leftX + bodyWidth * 0.31 + bodyWidth * 0.09, topY + bodyHeight * 0.12 + 1 * scale);
  layer.lineTo(leftX + bodyWidth * 0.31 + bodyWidth * 0.09, topY + bodyHeight * 0.12 + bodyHeight * 0.2 - 1 * scale);
  layer.moveTo(leftX + bodyWidth * 0.31 + 1 * scale, topY + bodyHeight * 0.12 + bodyHeight * 0.1);
  layer.lineTo(leftX + bodyWidth * 0.49 - 1 * scale, topY + bodyHeight * 0.12 + bodyHeight * 0.1);

  layer.lineStyle(1, 0x725255, 0.68);
  layer.beginFill(0xfff0d9, 0.9);
  layer.drawCircle(centerX, topY - roofRise * 0.24, Math.max(2.2, 4.4 * scale));
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x73585a, 0.82);
  layer.drawCircle(centerX, topY - roofRise * 0.24, Math.max(1.2, 2.2 * scale));
  layer.endFill();
}

function drawCow(layer: PixiGraphicsLike, originX: number, hoofY: number, scale: number, facingLeft: boolean): void {
  const direction = facingLeft ? -1 : 1;
  const legHeight = 20 * scale;
  const legWidth = 6 * scale;
  const bodyY = hoofY - 28 * scale;
  const lineWidth = Math.max(1, Math.round(1.8 * scale));

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x55734c, 0.22);
  layer.drawEllipse(originX + 2 * direction * scale, hoofY + 4 * scale, 27 * scale, 8 * scale);
  layer.endFill();

  layer.lineStyle(lineWidth, 0x6b5848, 0.92);
  layer.beginFill(0x3d3129, 1);
  for (const legOffset of [-17, -5, 7, 17]) {
    const legLeft = originX + legOffset * scale - legWidth * 0.5;
    layer.drawRect(legLeft, hoofY - legHeight, legWidth, legHeight);
  }
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x201913, 0.92);
  for (const legOffset of [-17, -5, 7, 17]) {
    const hoofLeft = originX + legOffset * scale - legWidth * 0.56;
    layer.drawRect(hoofLeft, hoofY - 3 * scale, legWidth * 1.12, 3.4 * scale);
  }
  layer.endFill();

  layer.lineStyle(lineWidth, 0x6d5948, 0.92);
  layer.beginFill(0xffffff, 1);
  layer.drawEllipse(originX - direction * 2 * scale, bodyY, 29 * scale, 18 * scale);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xf1ebe2, 0.48);
  layer.drawEllipse(originX - direction * 8 * scale, bodyY - 5 * scale, 11 * scale, 6 * scale);
  layer.endFill();

  layer.beginFill(0x2f2a28, 0.92);
  layer.drawEllipse(originX - direction * 10 * scale, bodyY - 2 * scale, 8.4 * scale, 6 * scale);
  layer.drawEllipse(originX + direction * 1 * scale, bodyY + 4 * scale, 6.8 * scale, 5 * scale);
  layer.drawEllipse(originX + direction * 12 * scale, bodyY - 1 * scale, 5.6 * scale, 4.2 * scale);
  layer.endFill();

  layer.lineStyle(Math.max(1, lineWidth - 0.4), 0x6d5948, 0.84);
  layer.moveTo(originX - direction * 22 * scale, bodyY - 6 * scale);
  layer.lineTo(originX - direction * 30 * scale, bodyY - 18 * scale);

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x2d2520, 0.92);
  layer.drawCircle(originX - direction * 31 * scale, bodyY - 18 * scale, 2.2 * scale);
  layer.endFill();

  layer.lineStyle(Math.max(1, lineWidth - 0.3), 0x6d5948, 0.86);
  layer.beginFill(0xffffff, 1);
  layer.drawEllipse(originX + direction * 15 * scale, bodyY - 1 * scale, 8.6 * scale, 6.2 * scale);
  layer.endFill();

  const headX = originX + direction * 29 * scale;
  const headY = bodyY - 2 * scale;
  layer.lineStyle(lineWidth, 0x6d5948, 0.92);
  layer.beginFill(0xffffff, 1);
  layer.drawCircle(headX, headY, 12 * scale);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xf4ebe0, 0.5);
  layer.drawCircle(headX - direction * 3 * scale, headY - 4 * scale, 4.4 * scale);
  layer.endFill();

  layer.lineStyle(Math.max(1, lineWidth - 0.5), 0x6d5948, 0.92);
  layer.beginFill(0xffffff, 1);
  layer.drawCircle(headX - direction * 8.5 * scale, headY - 10 * scale, 4.3 * scale);
  layer.drawCircle(headX + direction * 8 * scale, headY - 9.3 * scale, 4 * scale);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xffc3c3, 1);
  layer.drawEllipse(headX + direction * 4.8 * scale, headY + 6 * scale, 7.6 * scale, 5 * scale);
  layer.endFill();

  layer.beginFill(0x2a2a2a, 1);
  layer.drawCircle(headX + direction * 0.8 * scale, headY - 2 * scale, 1.6 * scale);
  layer.drawCircle(headX + direction * 8.2 * scale, headY - 1.2 * scale, 1.6 * scale);
  layer.drawCircle(headX + direction * 3.2 * scale, headY + 6 * scale, 0.9 * scale);
  layer.drawCircle(headX + direction * 6.8 * scale, headY + 6.4 * scale, 0.9 * scale);
  layer.endFill();

  layer.lineStyle(1.2, 0x6f5948, 0.78);
  layer.moveTo(headX + direction * 3 * scale, headY + 8.8 * scale);
  layer.lineTo(headX + direction * 5.2 * scale, headY + 9.6 * scale);

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xffffff, 0.9);
  layer.drawCircle(headX + direction * 2.2 * scale, headY - 2.4 * scale, 0.85 * scale);
  layer.drawCircle(headX + direction * 8.9 * scale, headY - 1.7 * scale, 0.85 * scale);
  layer.endFill();
}

function drawSheep(layer: PixiGraphicsLike, originX: number, hoofY: number, scale: number, facingLeft: boolean): void {
  const direction = facingLeft ? -1 : 1;
  const bodyY = hoofY - 24 * scale;
  const lineWidth = Math.max(1, Math.round(1.8 * scale));
  const legWidth = 5 * scale;
  const legHeight = 16 * scale;

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x5c7551, 0.2);
  layer.drawEllipse(originX, hoofY + 4 * scale, 20 * scale, 7 * scale);
  layer.endFill();

  layer.lineStyle(lineWidth, 0x6f6453, 0.9);
  layer.beginFill(0x6a5848, 1);
  for (const legOffset of [-14, -4, 6, 15]) {
    const legLeft = originX + legOffset * scale - legWidth * 0.5;
    layer.drawRect(legLeft, hoofY - legHeight, legWidth, legHeight);
  }
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x352d27, 0.92);
  for (const legOffset of [-14, -4, 6, 15]) {
    const hoofLeft = originX + legOffset * scale - legWidth * 0.56;
    layer.drawRect(hoofLeft, hoofY - 2.8 * scale, legWidth * 1.12, 3.2 * scale);
  }
  layer.endFill();

  layer.lineStyle(lineWidth, 0x9b8d79, 0.9);
  layer.beginFill(0xffffff, 1);
  layer.drawCircle(originX - 12 * scale, bodyY, 9 * scale);
  layer.drawCircle(originX - 1 * scale, bodyY - 4 * scale, 11 * scale);
  layer.drawCircle(originX + 11 * scale, bodyY, 9 * scale);
  layer.drawEllipse(originX + 1 * scale, bodyY + 3 * scale, 18 * scale, 10 * scale);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xf8f6f0, 0.68);
  layer.drawCircle(originX - 9 * scale, bodyY - 3.5 * scale, 4.8 * scale);
  layer.drawCircle(originX + 4 * scale, bodyY - 4.4 * scale, 4.6 * scale);
  layer.endFill();

  layer.beginFill(0xf8f7f1, 0.82);
  layer.drawCircle(originX + direction * 20 * scale, bodyY - 2 * scale, 4.6 * scale);
  layer.drawCircle(originX - direction * 18 * scale, bodyY - 1 * scale, 4.2 * scale);
  layer.endFill();

  const faceX = originX + direction * 24 * scale;
  const faceY = bodyY + 2 * scale;
  layer.lineStyle(lineWidth, 0x66594b, 0.94);
  layer.beginFill(0xf9efe2, 1);
  layer.drawCircle(faceX, faceY, 9 * scale);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xe7dbca, 0.6);
  layer.drawCircle(faceX - direction * 1.8 * scale, faceY - 2.2 * scale, 3.2 * scale);
  layer.endFill();

  layer.lineStyle(Math.max(1, lineWidth - 0.4), 0x675a4c, 0.9);
  layer.beginFill(0xf8eee0, 1);
  layer.drawPolygon([
    faceX - direction * 7.2 * scale, faceY - 4 * scale,
    faceX - direction * 12 * scale, faceY - 8.4 * scale,
    faceX - direction * 8.3 * scale, faceY + 0.5 * scale,
  ]);
  layer.drawPolygon([
    faceX + direction * 7.2 * scale, faceY - 4 * scale,
    faceX + direction * 12 * scale, faceY - 8.4 * scale,
    faceX + direction * 8.3 * scale, faceY + 0.5 * scale,
  ]);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x2f2f2f, 1);
  layer.drawCircle(faceX - direction * 2.8 * scale, faceY - 1 * scale, 1.4 * scale);
  layer.drawCircle(faceX + direction * 3.1 * scale, faceY - 0.8 * scale, 1.4 * scale);
  layer.drawCircle(faceX + direction * 0.7 * scale, faceY + 2.8 * scale, 1 * scale);
  layer.endFill();

  layer.lineStyle(1, 0x6a5a49, 0.88);
  layer.moveTo(faceX - direction * 2 * scale, faceY + 4 * scale);
  layer.lineTo(faceX, faceY + 5.5 * scale);
  layer.lineTo(faceX + direction * 2 * scale, faceY + 4 * scale);

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xffffff, 0.88);
  layer.drawCircle(faceX - direction * 2.2 * scale, faceY - 1.6 * scale, 0.7 * scale);
  layer.drawCircle(faceX + direction * 3.7 * scale, faceY - 1.4 * scale, 0.7 * scale);
  layer.endFill();
}

function drawGrassTufts(
  layer: PixiGraphicsLike,
  startX: number,
  baseY: number,
  spanWidth: number,
  count: number,
  scale: number,
  color: number,
  alpha: number,
): void {
  if (count <= 0) return;
  const lineWidth = Math.max(1, scale * 1.1);
  for (let index = 0; index < count; index += 1) {
    const ratio = count === 1 ? 0.5 : index / (count - 1);
    const x = startX + spanWidth * ratio;
    const sway = Math.sin(ratio * Math.PI * 4.8) * 2.4 * scale;
    const height = (5.5 + (index % 4) * 1.8) * scale;
    const curveAlpha = alpha * (0.78 + (index % 3) * 0.08);
    layer.lineStyle(lineWidth, color, curveAlpha);
    layer.moveTo(x, baseY);
    layer.lineTo(x + sway, baseY - height);
  }
}

function drawFrontDecorationLayer(
  frontLayer: PixiGraphicsLike,
  viewportWidth: number,
  viewportHeight: number,
  backdropLayout: SceneBackdropLayout,
  sceneLayout: SceneLayout,
): void {
  frontLayer.clear();

  const scale = backdropLayout.decorationScale;
  const depthScale = clamp((viewportHeight - sceneLayout.stageY) / 310, 0.92, 1.18);
  const nearScale = scale * depthScale;
  const frontSegmentWidth = Math.max(10, 16 * nearScale);
  const frontFenceSpan = 5 * frontSegmentWidth;
  const edgeOffset = Math.max(10, 16 * nearScale);
  const plotBottomY =
    sceneLayout.stageY +
    sceneLayout.stepY * 4 +
    sceneLayout.halfHeight +
    sceneLayout.thickness +
    sceneLayout.shadowOffsetY;
  const frontGroundY = clamp(plotBottomY + 12 * scale, viewportHeight * 0.74, viewportHeight - 8);
  const bermTopY = clamp(plotBottomY + 5 * scale, frontGroundY - 22 * nearScale, frontGroundY - 7 * nearScale);

  drawBarn(frontLayer, -28 * nearScale, viewportHeight * 0.996, 0.92 * nearScale);
  drawCottage(frontLayer, viewportWidth + 28 * nearScale, viewportHeight * 0.996, 0.88 * nearScale);

  frontLayer.lineStyle(0, 0x000000, 0);
  frontLayer.beginFill(0x304726, 0.24);
  frontLayer.drawEllipse(viewportWidth * 0.5, frontGroundY + 14 * nearScale, viewportWidth * 0.45, 19 * nearScale);
  frontLayer.endFill();

  frontLayer.beginFill(0x6fa342, 0.92);
  frontLayer.drawPolygon([
    0, viewportHeight,
    0, bermTopY + 12 * nearScale,
    viewportWidth * 0.1, bermTopY + 3 * nearScale,
    viewportWidth * 0.24, bermTopY + 8 * nearScale,
    viewportWidth * 0.38, bermTopY,
    viewportWidth * 0.55, bermTopY + 7 * nearScale,
    viewportWidth * 0.72, bermTopY + 1.5 * nearScale,
    viewportWidth * 0.9, bermTopY + 10 * nearScale,
    viewportWidth, bermTopY + 6 * nearScale,
    viewportWidth, viewportHeight,
  ]);
  frontLayer.endFill();

  frontLayer.beginFill(0xbfdf88, 0.24);
  frontLayer.drawPolygon([
    0, bermTopY + 12.5 * nearScale,
    viewportWidth * 0.14, bermTopY + 5.2 * nearScale,
    viewportWidth * 0.32, bermTopY + 7.6 * nearScale,
    viewportWidth * 0.51, bermTopY + 3.4 * nearScale,
    viewportWidth * 0.69, bermTopY + 7.8 * nearScale,
    viewportWidth * 0.86, bermTopY + 6.5 * nearScale,
    viewportWidth, bermTopY + 9.2 * nearScale,
    viewportWidth, bermTopY + 13.5 * nearScale,
    0, bermTopY + 13.5 * nearScale,
  ]);
  frontLayer.endFill();

  drawFence(frontLayer, edgeOffset, frontGroundY + 1.5 * nearScale, 5, frontSegmentWidth, 0.88 * nearScale);
  drawFence(
    frontLayer,
    viewportWidth - frontFenceSpan - edgeOffset,
    frontGroundY + 1.5 * nearScale,
    5,
    frontSegmentWidth,
    0.88 * nearScale,
  );

  const cowX = clamp(viewportWidth * 0.18, 48 * nearScale, viewportWidth * 0.37);
  const sheepX = clamp(viewportWidth * 0.82, viewportWidth * 0.63, viewportWidth - 46 * nearScale);
  drawCow(frontLayer, cowX, frontGroundY - 21 * nearScale, 0.82 * nearScale, false);
  drawSheep(frontLayer, sheepX, frontGroundY - 22 * nearScale, 0.79 * nearScale, true);

  drawGrassTufts(frontLayer, 0, bermTopY + 12 * nearScale, viewportWidth, 28, 0.72 * nearScale, 0x6d9c40, 0.42);
  drawGrassTufts(frontLayer, 0, bermTopY + 14.6 * nearScale, viewportWidth, 22, 0.58 * nearScale, 0x4f7d2f, 0.3);
}

function getCoarsePointerMode(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(pointer: coarse)').matches;
}

function resolveSceneLayout(
  viewportWidth: number,
  viewportHeight: number,
  backdropLayout: SceneBackdropLayout,
): SceneLayout {
  const horizontalPadding = viewportWidth < 560 ? 20 : 30;
  const safeWidth = Math.max(220, viewportWidth - horizontalPadding * 2);
  const maxByWidth = safeWidth / 6.05;
  const groundHeight = Math.max(150, viewportHeight - backdropLayout.groundTopY - 10);
  const maxByGround = (groundHeight - 26) / 4.35;
  const halfWidth = Math.round(clamp(Math.min(maxByWidth, maxByGround), 32, 70));
  const halfHeight = Math.round(halfWidth * 0.54);
  const thickness = Math.round(clamp(halfHeight * 0.46, 11, 28));
  const stepX = Math.round(halfWidth * 1.0);
  const stepY = Math.round(halfHeight * 0.95);
  const shadowWidth = Math.round(halfWidth * 0.86);
  const shadowHeight = Math.max(8, Math.round(halfHeight * 0.38));
  const shadowOffsetY = Math.round(thickness + shadowHeight * 0.34 + 1);
  const sceneBottom = 4 * stepY + halfHeight + thickness + shadowOffsetY + shadowHeight;
  const preferredStageY = Math.round(backdropLayout.groundTopY + halfHeight + Math.max(10, halfHeight * 0.5));
  const minStageY = Math.max(halfHeight + 12, backdropLayout.groundTopY + Math.round(halfHeight * 0.72));
  const maxStageY = Math.max(minStageY, viewportHeight - sceneBottom - 12);
  const stageY = clamp(preferredStageY, minStageY, maxStageY);
  const hoverLift = Math.max(4, Math.round(thickness * 0.22));

  return {
    halfWidth,
    halfHeight,
    thickness,
    stepX,
    stepY,
    shadowWidth,
    shadowHeight,
    shadowOffsetY,
    stageY,
    hoverLift,
  };
}

function resolvePlotCoordinate(plotId: number, layout: SceneLayout): { x: number; y: number } {
  const row = Math.floor(plotId / GRID_SIZE);
  const col = plotId % GRID_SIZE;
  return {
    x: (col - row) * layout.stepX,
    y: (col + row) * layout.stepY,
  };
}

function findHitPlotId(
  pointerX: number,
  pointerY: number,
  plotLayer: PixiContainerLike,
  plots: RenderPlot[],
  layout: SceneLayout,
): number | null {
  const localX = pointerX - plotLayer.x;
  const localY = pointerY - plotLayer.y;
  for (let index = plots.length - 1; index >= 0; index -= 1) {
    const plot = plots[index];
    const deltaX = localX - plot.container.x;
    const deltaY = localY - plot.container.y;
    const diamondDistance = Math.abs(deltaX) / layout.halfWidth + Math.abs(deltaY) / layout.halfHeight;
    if (diamondDistance <= 1) return plot.id;
  }
  return null;
}

function drawSoilMicroTexture(
  shape: PixiGraphicsLike,
  layout: SceneLayout,
  state: PlotVisualState,
  topColor: number,
  edgeColor: number,
  hoverActive: boolean,
): void {
  const halfWidth = layout.halfWidth;
  const halfHeight = layout.halfHeight;
  const unlockedAlpha =
    state === 'empty' ? 1 : state === 'seed' ? 0.9 : state === 'withered' ? 0.72 : 0.62;
  const textureAlpha = state === 'locked' ? 0.52 : unlockedAlpha;
  const hoverBoost = hoverActive ? 1.08 : 1;
  const grainRadius = Math.max(0.68, halfWidth * 0.0125);
  const darkColor = state === 'locked' ? mixColor(topColor, 0x474443, 0.58) : mixColor(topColor, 0x4a2d18, 0.6);
  const lightColor = state === 'locked' ? lightenColor(topColor, 0.12) : lightenColor(topColor, 0.28);
  const crackColor = state === 'locked' ? mixColor(edgeColor, 0x5d5956, 0.36) : mixColor(edgeColor, 0x5b351f, 0.38);

  shape.lineStyle(0, 0x000000, 0);
  shape.beginFill(darkColor, 0.18 * textureAlpha * hoverBoost);
  for (const point of SOIL_MICRO_POINTS) {
    shape.drawCircle(halfWidth * point.x, halfHeight * point.y, grainRadius * point.size);
  }
  shape.endFill();

  shape.beginFill(lightColor, 0.12 * textureAlpha * hoverBoost);
  for (let index = 0; index < SOIL_MICRO_POINTS.length; index += 2) {
    const point = SOIL_MICRO_POINTS[index];
    shape.drawCircle(
      halfWidth * (point.x + 0.02),
      halfHeight * (point.y - 0.015),
      grainRadius * point.size * 0.64,
    );
  }
  shape.endFill();

  shape.lineStyle(1, crackColor, 0.24 * textureAlpha);
  for (const crack of SOIL_MICRO_CRACKS) {
    shape.moveTo(halfWidth * crack[0], halfHeight * crack[1]);
    shape.lineTo(halfWidth * crack[2], halfHeight * crack[3]);
    shape.lineTo(halfWidth * crack[4], halfHeight * crack[5]);
  }

  shape.lineStyle(0, 0x000000, 0);
  shape.beginFill(mixColor(topColor, edgeColor, 0.52), 0.05 * textureAlpha);
  shape.drawPolygon([
    -halfWidth * 0.7, -halfHeight * 0.01,
    0, -halfHeight * 0.48,
    halfWidth * 0.7, -halfHeight * 0.01,
    0, halfHeight * 0.3,
  ]);
  shape.endFill();
}

function drawEmptyOverlay(overlay: PixiGraphicsLike, layout: SceneLayout): void {
  const grainRadius = Math.max(0.9, layout.halfWidth * 0.013);
  const grains = [
    { x: -0.38, y: -0.02, size: 0.66 },
    { x: -0.3, y: 0.12, size: 0.74 },
    { x: -0.26, y: -0.15, size: 0.58 },
    { x: -0.16, y: 0.05, size: 0.76 },
    { x: -0.07, y: -0.08, size: 0.7 },
    { x: 0, y: 0.04, size: 0.82 },
    { x: 0.09, y: -0.1, size: 0.66 },
    { x: 0.15, y: 0.13, size: 0.74 },
    { x: 0.24, y: -0.04, size: 0.7 },
    { x: 0.31, y: 0.16, size: 0.64 },
    { x: 0.36, y: 0, size: 0.58 },
    { x: -0.04, y: 0.2, size: 0.68 },
    { x: -0.22, y: 0.22, size: 0.62 },
  ];

  overlay.lineStyle(0, 0x000000, 0);
  overlay.beginFill(0x774726, 0.28);
  for (const grain of grains) {
    overlay.drawCircle(layout.halfWidth * grain.x, layout.halfHeight * grain.y, grainRadius * grain.size);
  }
  overlay.endFill();

  overlay.beginFill(0x9e6c46, 0.14);
  overlay.drawEllipse(-layout.halfWidth * 0.2, layout.halfHeight * 0.08, layout.halfWidth * 0.09, layout.halfHeight * 0.04);
  overlay.drawEllipse(layout.halfWidth * 0.19, layout.halfHeight * 0.13, layout.halfWidth * 0.1, layout.halfHeight * 0.045);
  overlay.endFill();

  overlay.lineStyle(1, 0x6d4124, 0.24);
  overlay.moveTo(-layout.halfWidth * 0.42, layout.halfHeight * 0.03);
  overlay.lineTo(-layout.halfWidth * 0.29, layout.halfHeight * 0.1);
  overlay.lineTo(-layout.halfWidth * 0.16, layout.halfHeight * 0.07);
  overlay.moveTo(layout.halfWidth * 0.07, layout.halfHeight * 0.04);
  overlay.lineTo(layout.halfWidth * 0.2, layout.halfHeight * 0.1);
  overlay.lineTo(layout.halfWidth * 0.33, layout.halfHeight * 0.06);

  overlay.lineStyle(1, 0x9b6a45, 0.22);
  overlay.moveTo(-layout.halfWidth * 0.11, -layout.halfHeight * 0.03);
  overlay.lineTo(layout.halfWidth * 0.03, layout.halfHeight * 0.02);
  overlay.lineTo(layout.halfWidth * 0.11, -layout.halfHeight * 0.03);
}

function drawSeedOverlay(overlay: PixiGraphicsLike, layout: SceneLayout): void {
  const moundY = layout.halfHeight * 0.12;
  const moundWidth = layout.halfWidth * 0.34;
  const moundHeight = layout.halfHeight * 0.16;

  overlay.lineStyle(0, 0x000000, 0);
  overlay.beginFill(0x714423, 0.3);
  overlay.drawEllipse(0, moundY + layout.halfHeight * 0.1, moundWidth * 0.88, moundHeight * 0.62);
  overlay.endFill();

  overlay.beginFill(0x99613a, 0.95);
  overlay.drawEllipse(0, moundY, moundWidth, moundHeight);
  overlay.endFill();

  overlay.beginFill(0xc88a58, 0.5);
  overlay.drawEllipse(-layout.halfWidth * 0.09, moundY - layout.halfHeight * 0.03, moundWidth * 0.42, moundHeight * 0.45);
  overlay.endFill();

  overlay.lineStyle(1, 0x5e371d, 0.42);
  overlay.moveTo(-layout.halfWidth * 0.14, moundY + layout.halfHeight * 0.01);
  overlay.lineTo(-layout.halfWidth * 0.01, moundY - layout.halfHeight * 0.03);
  overlay.lineTo(layout.halfWidth * 0.12, moundY + layout.halfHeight * 0.01);

  overlay.lineStyle(0, 0x000000, 0);
  overlay.beginFill(0x6a3e21, 0.9);
  overlay.drawEllipse(layout.halfWidth * 0.03, moundY - layout.halfHeight * 0.05, layout.halfWidth * 0.05, layout.halfHeight * 0.03);
  overlay.endFill();
}

function drawSproutOverlay(overlay: PixiGraphicsLike, layout: SceneLayout): void {
  const stemTop = -layout.halfHeight * 0.04;
  const stemBottom = layout.halfHeight * 0.25;

  overlay.lineStyle(2, 0x2f6f31, 0.98);
  overlay.moveTo(0, stemBottom);
  overlay.lineTo(0, stemTop);

  overlay.lineStyle(0, 0x000000, 0);
  overlay.beginFill(0x86efac, 1);
  overlay.drawPolygon([
    0, stemTop - 1,
    -layout.halfWidth * 0.24, layout.halfHeight * 0.1,
    -layout.halfWidth * 0.01, layout.halfHeight * 0.18,
  ]);
  overlay.endFill();

  overlay.beginFill(0x4ade80, 1);
  overlay.drawPolygon([
    0, stemTop - 1,
    layout.halfWidth * 0.23, layout.halfHeight * 0.04,
    layout.halfWidth * 0.03, layout.halfHeight * 0.17,
  ]);
  overlay.endFill();

  overlay.beginFill(0xcfffd5, 0.45);
  overlay.drawCircle(-layout.halfWidth * 0.05, layout.halfHeight * 0.06, Math.max(1.2, layout.halfWidth * 0.03));
  overlay.drawCircle(layout.halfWidth * 0.05, layout.halfHeight * 0.04, Math.max(1.1, layout.halfWidth * 0.027));
  overlay.endFill();
}

function drawLeafOverlay(overlay: PixiGraphicsLike, layout: SceneLayout): void {
  overlay.lineStyle(2, 0x2f6e31, 0.98);
  overlay.moveTo(-layout.halfWidth * 0.23, layout.halfHeight * 0.24);
  overlay.lineTo(-layout.halfWidth * 0.09, layout.halfHeight * 0.11);
  overlay.lineTo(layout.halfWidth * 0.01, layout.halfHeight * 0.03);
  overlay.lineTo(layout.halfWidth * 0.15, -layout.halfHeight * 0.13);
  overlay.lineTo(layout.halfWidth * 0.23, -layout.halfHeight * 0.21);

  overlay.moveTo(-layout.halfWidth * 0.08, layout.halfHeight * 0.09);
  overlay.lineTo(-layout.halfWidth * 0.24, -layout.halfHeight * 0.03);
  overlay.moveTo(layout.halfWidth * 0.03, layout.halfHeight * 0);
  overlay.lineTo(layout.halfWidth * 0.22, layout.halfHeight * 0.08);

  overlay.lineStyle(0, 0x000000, 0);
  overlay.beginFill(0x34d399, 0.96);
  overlay.drawPolygon([
    -layout.halfWidth * 0.08, layout.halfHeight * 0.09,
    -layout.halfWidth * 0.31, layout.halfHeight * 0.03,
    -layout.halfWidth * 0.21, -layout.halfHeight * 0.15,
    -layout.halfWidth * 0.02, -layout.halfHeight * 0.01,
  ]);
  overlay.endFill();

  overlay.beginFill(0x22c55e, 0.96);
  overlay.drawPolygon([
    layout.halfWidth * 0.02, layout.halfHeight * 0.02,
    layout.halfWidth * 0.27, layout.halfHeight * 0.08,
    layout.halfWidth * 0.19, -layout.halfHeight * 0.1,
    layout.halfWidth * 0.03, -layout.halfHeight * 0.02,
  ]);
  overlay.endFill();

  overlay.beginFill(0x4ade80, 0.92);
  overlay.drawPolygon([
    layout.halfWidth * 0.11, -layout.halfHeight * 0.12,
    layout.halfWidth * 0.29, -layout.halfHeight * 0.18,
    layout.halfWidth * 0.24, -layout.halfHeight * 0.31,
    layout.halfWidth * 0.08, -layout.halfHeight * 0.22,
  ]);
  overlay.endFill();
}

function drawFlowerOverlay(overlay: PixiGraphicsLike, layout: SceneLayout): void {
  drawLeafOverlay(overlay, layout);

  const flowerX = layout.halfWidth * 0.24;
  const flowerY = -layout.halfHeight * 0.27;
  const petalRadius = Math.max(2.1, layout.halfWidth * 0.055);
  const petalOffset = petalRadius * 1.12;

  overlay.lineStyle(0, 0x000000, 0);
  overlay.beginFill(0xfbcfe8, 0.97);
  overlay.drawCircle(flowerX - petalOffset, flowerY, petalRadius);
  overlay.drawCircle(flowerX + petalOffset, flowerY, petalRadius);
  overlay.drawCircle(flowerX, flowerY - petalOffset, petalRadius);
  overlay.drawCircle(flowerX, flowerY + petalOffset, petalRadius);
  overlay.drawCircle(flowerX - petalOffset * 0.72, flowerY + petalOffset * 0.72, petalRadius);
  overlay.drawCircle(flowerX + petalOffset * 0.72, flowerY - petalOffset * 0.72, petalRadius);
  overlay.endFill();

  overlay.beginFill(0xf59e0b, 1);
  overlay.drawCircle(flowerX, flowerY, petalRadius * 0.95);
  overlay.endFill();

  overlay.beginFill(0xfffbeb, 0.6);
  overlay.drawCircle(flowerX - petalRadius * 0.22, flowerY - petalRadius * 0.28, petalRadius * 0.24);
  overlay.endFill();
}

function drawMelonCluster(overlay: PixiGraphicsLike, layout: SceneLayout, scale: number): void {
  const baseRadius = Math.max(4, Math.round(layout.halfWidth * 0.1 * scale));
  const melons = [
    { x: -layout.halfWidth * 0.2, y: layout.halfHeight * 0.14, r: 0.92 },
    { x: -layout.halfWidth * 0.03, y: layout.halfHeight * 0.02, r: 1.02 },
    { x: layout.halfWidth * 0.18, y: layout.halfHeight * 0.12, r: 0.96 },
    { x: layout.halfWidth * 0.05, y: layout.halfHeight * 0.19, r: 0.78 },
  ];

  for (const melon of melons) {
    const radius = baseRadius * melon.r;
    overlay.lineStyle(0, 0x000000, 0);
    overlay.beginFill(0x22c55e, 1);
    overlay.drawCircle(melon.x, melon.y, radius);
    overlay.endFill();

    overlay.beginFill(0x86efac, 0.22);
    overlay.drawCircle(melon.x - radius * 0.25, melon.y - radius * 0.24, radius * 0.32);
    overlay.endFill();

    overlay.lineStyle(Math.max(1, radius * 0.18), 0x14532d, 0.9);
    overlay.moveTo(melon.x - radius * 0.6, melon.y - radius * 0.78);
    overlay.lineTo(melon.x - radius * 0.15, melon.y + radius * 0.78);
    overlay.moveTo(melon.x - radius * 0.1, melon.y - radius * 0.82);
    overlay.lineTo(melon.x + radius * 0.35, melon.y + radius * 0.76);
  }
}

function drawFruitOverlay(overlay: PixiGraphicsLike, layout: SceneLayout): void {
  overlay.lineStyle(2, 0x2f6e31, 0.96);
  overlay.moveTo(-layout.halfWidth * 0.22, layout.halfHeight * 0.24);
  overlay.lineTo(-layout.halfWidth * 0.06, layout.halfHeight * 0.12);
  overlay.lineTo(layout.halfWidth * 0.06, layout.halfHeight * 0.02);
  overlay.lineTo(layout.halfWidth * 0.16, -layout.halfHeight * 0.07);

  overlay.moveTo(-layout.halfWidth * 0.04, layout.halfHeight * 0.1);
  overlay.lineTo(layout.halfWidth * 0.19, layout.halfHeight * 0.2);
  drawMelonCluster(overlay, layout, 0.82);
}

function drawSpark(
  overlay: PixiGraphicsLike,
  centerX: number,
  centerY: number,
  size: number,
  alpha: number,
): void {
  const lineWidth = Math.max(1, size * 0.16);
  overlay.lineStyle(lineWidth, 0xfff6bf, alpha);
  overlay.moveTo(centerX - size, centerY);
  overlay.lineTo(centerX + size, centerY);
  overlay.moveTo(centerX, centerY - size);
  overlay.lineTo(centerX, centerY + size);
  overlay.moveTo(centerX - size * 0.72, centerY - size * 0.72);
  overlay.lineTo(centerX + size * 0.72, centerY + size * 0.72);
  overlay.moveTo(centerX - size * 0.72, centerY + size * 0.72);
  overlay.lineTo(centerX + size * 0.72, centerY - size * 0.72);
}

function drawMatureOverlay(overlay: PixiGraphicsLike, layout: SceneLayout, pulsePhase: number): void {
  const pulse = (Math.sin(pulsePhase * Math.PI * 2) + 1) * 0.5;

  overlay.lineStyle(2, 0x2f6e31, 0.98);
  overlay.moveTo(-layout.halfWidth * 0.22, layout.halfHeight * 0.24);
  overlay.lineTo(-layout.halfWidth * 0.08, layout.halfHeight * 0.11);
  overlay.lineTo(layout.halfWidth * 0.03, layout.halfHeight * 0.01);
  overlay.lineTo(layout.halfWidth * 0.16, -layout.halfHeight * 0.12);
  overlay.lineTo(layout.halfWidth * 0.24, -layout.halfHeight * 0.2);

  overlay.moveTo(-layout.halfWidth * 0.06, layout.halfHeight * 0.08);
  overlay.lineTo(layout.halfWidth * 0.2, layout.halfHeight * 0.19);
  drawMelonCluster(overlay, layout, 1);

  const pulseCenterX = layout.halfWidth * 0.02;
  const pulseCenterY = layout.halfHeight * 0.08;
  const pulseRadiusX = layout.halfWidth * (0.29 + pulse * 0.15);
  const pulseRadiusY = layout.halfHeight * (0.17 + pulse * 0.09);

  overlay.lineStyle(1.5 + pulse * 1.1, 0xfef08a, 0.3 + pulse * 0.5);
  overlay.drawEllipse(pulseCenterX, pulseCenterY, pulseRadiusX, pulseRadiusY);
  overlay.lineStyle(1, 0xfde68a, 0.2 + pulse * 0.32);
  overlay.drawEllipse(pulseCenterX, pulseCenterY, pulseRadiusX * 1.18, pulseRadiusY * 1.24);

  overlay.lineStyle(0, 0x000000, 0);
  overlay.beginFill(0xfef9c3, 0.08 + pulse * 0.15);
  overlay.drawEllipse(pulseCenterX, pulseCenterY, pulseRadiusX * 0.92, pulseRadiusY * 0.74);
  overlay.endFill();

  const sparkAlpha = 0.34 + pulse * 0.6;
  drawSpark(overlay, -layout.halfWidth * 0.26, -layout.halfHeight * 0.03, layout.halfWidth * 0.075, sparkAlpha);
  drawSpark(overlay, layout.halfWidth * 0.28, layout.halfHeight * 0.02, layout.halfWidth * 0.07, sparkAlpha * 0.94);
  drawSpark(overlay, layout.halfWidth * 0.07, -layout.halfHeight * 0.27, layout.halfWidth * 0.06, sparkAlpha * 0.82);
}

function drawWitheredOverlay(overlay: PixiGraphicsLike, layout: SceneLayout): void {
  overlay.lineStyle(0, 0x000000, 0);
  overlay.beginFill(0x554a40, 0.35);
  overlay.drawEllipse(0, layout.halfHeight * 0.2, layout.halfWidth * 0.38, layout.halfHeight * 0.15);
  overlay.endFill();

  overlay.lineStyle(2, 0x5d5044, 0.92);
  overlay.moveTo(-layout.halfWidth * 0.02, layout.halfHeight * 0.25);
  overlay.lineTo(-layout.halfWidth * 0.08, layout.halfHeight * 0.1);
  overlay.lineTo(layout.halfWidth * 0.05, -layout.halfHeight * 0.04);
  overlay.lineTo(layout.halfWidth * 0.01, -layout.halfHeight * 0.19);

  overlay.moveTo(-layout.halfWidth * 0.07, layout.halfHeight * 0.07);
  overlay.lineTo(-layout.halfWidth * 0.25, layout.halfHeight * 0.15);
  overlay.moveTo(layout.halfWidth * 0.01, layout.halfHeight * 0.01);
  overlay.lineTo(layout.halfWidth * 0.22, layout.halfHeight * 0.08);

  overlay.lineStyle(0, 0x000000, 0);
  overlay.beginFill(0x807062, 0.95);
  overlay.drawPolygon([
    -layout.halfWidth * 0.08, layout.halfHeight * 0.08,
    -layout.halfWidth * 0.3, layout.halfHeight * 0.16,
    -layout.halfWidth * 0.16, layout.halfHeight * 0.27,
    -layout.halfWidth * 0.03, layout.halfHeight * 0.15,
  ]);
  overlay.drawPolygon([
    layout.halfWidth * 0.03, layout.halfHeight * 0.02,
    layout.halfWidth * 0.25, layout.halfHeight * 0.09,
    layout.halfWidth * 0.11, layout.halfHeight * 0.19,
    -layout.halfWidth * 0.01, layout.halfHeight * 0.1,
  ]);
  overlay.endFill();

  overlay.beginFill(0x6d6054, 0.92);
  overlay.drawCircle(layout.halfWidth * 0.02, layout.halfHeight * 0.16, Math.max(2.2, layout.halfWidth * 0.07));
  overlay.drawCircle(-layout.halfWidth * 0.15, layout.halfHeight * 0.18, Math.max(1.8, layout.halfWidth * 0.052));
  overlay.endFill();

  overlay.lineStyle(1, 0xa29688, 0.42);
  overlay.moveTo(layout.halfWidth * 0.02, layout.halfHeight * 0.1);
  overlay.lineTo(layout.halfWidth * 0.04, layout.halfHeight * 0.21);
  overlay.moveTo(-layout.halfWidth * 0.16, layout.halfHeight * 0.13);
  overlay.lineTo(-layout.halfWidth * 0.13, layout.halfHeight * 0.2);
}

function drawLockOverlay(lockOverlay: PixiGraphicsLike, layout: SceneLayout, topColor: number): void {
  const bodyWidth = Math.max(12, layout.halfWidth * 0.34);
  const bodyHeight = Math.max(10, layout.halfHeight * 0.58);
  const bodyTopY = -layout.halfHeight * 0.03;
  const shackleCenterY = bodyTopY - bodyHeight * 0.16;
  const shackleOuterX = bodyWidth * 0.46;
  const shackleOuterY = bodyHeight * 0.64;
  const shackleInnerX = bodyWidth * 0.25;
  const shackleInnerY = bodyHeight * 0.44;
  const keyholeY = bodyTopY + bodyHeight * 0.5;
  const keyholeRadius = Math.max(1.6, bodyWidth * 0.09);

  lockOverlay.clear();
  lockOverlay.lineStyle(0, 0x000000, 0);
  lockOverlay.beginFill(0x161210, 0.3);
  lockOverlay.drawEllipse(0, bodyTopY + bodyHeight * 0.96, bodyWidth * 0.84, bodyHeight * 0.3);
  lockOverlay.endFill();

  lockOverlay.lineStyle(2, 0x4d4540, 0.95);
  lockOverlay.beginFill(0xf0ebe5, 1);
  lockOverlay.drawEllipse(0, shackleCenterY, shackleOuterX, shackleOuterY);
  lockOverlay.endFill();

  lockOverlay.lineStyle(0, 0x000000, 0);
  lockOverlay.beginFill(mixColor(topColor, 0x34312f, 0.78), 1);
  lockOverlay.drawEllipse(0, shackleCenterY + bodyHeight * 0.2, shackleInnerX, shackleInnerY);
  lockOverlay.endFill();

  lockOverlay.lineStyle(2, 0x403934, 0.96);
  lockOverlay.beginFill(0xd8d2ca, 1);
  lockOverlay.drawRect(-bodyWidth * 0.5, bodyTopY, bodyWidth, bodyHeight);
  lockOverlay.endFill();

  lockOverlay.lineStyle(1, 0x67605a, 0.78);
  lockOverlay.moveTo(-bodyWidth * 0.36, bodyTopY + bodyHeight * 0.66);
  lockOverlay.lineTo(bodyWidth * 0.36, bodyTopY + bodyHeight * 0.66);

  lockOverlay.lineStyle(0, 0x000000, 0);
  lockOverlay.beginFill(0xffffff, 0.22);
  lockOverlay.drawRect(-bodyWidth * 0.34, bodyTopY + bodyHeight * 0.15, bodyWidth * 0.68, bodyHeight * 0.18);
  lockOverlay.endFill();

  lockOverlay.beginFill(0x2f2a26, 0.98);
  lockOverlay.drawCircle(0, keyholeY, keyholeRadius);
  lockOverlay.drawRect(-keyholeRadius * 0.56, keyholeY, keyholeRadius * 1.12, bodyHeight * 0.2);
  lockOverlay.endFill();
}

function drawPlot(
  plot: RenderPlot,
  state: PlotVisualState,
  hovered: boolean,
  layout: SceneLayout,
  hoverEnabled: boolean,
  pulsePhase: number,
  pixi: PixiModuleLike,
): void {
  const palette = PLOT_PALETTES[state];
  const canInteract = state !== 'locked';
  const hoverActive = hoverEnabled && hovered && canInteract;
  const borderColor = hoverActive ? 0x7a4d2a : palette.edge;
  const topColor = hoverActive ? lightenColor(palette.top, 0.14) : palette.top;
  const halfWidth = layout.halfWidth;
  const halfHeight = layout.halfHeight;
  const thickness = layout.thickness;

  plot.shape.cursor = canInteract ? 'pointer' : 'default';
  plot.container.y = plot.baseY + (hoverActive ? -layout.hoverLift : 0);
  plot.container.scale.set(hoverActive ? 1.04 : 1);

  const shape = plot.shape;
  const overlay = plot.overlay;
  shape.clear();
  overlay.clear();

  shape.hitArea = new pixi.Polygon([
    0, -halfHeight,
    halfWidth, 0,
    0, halfHeight,
    -halfWidth, 0,
  ]);

  const ambientShadowAlpha = state === 'locked' ? 0.08 : hoverActive ? 0.12 : 0.15;
  const contactShadowAlpha = state === 'locked' ? 0.11 : hoverActive ? 0.18 : 0.22;

  shape.lineStyle(0, 0x000000, 0);
  shape.beginFill(0x21160f, ambientShadowAlpha);
  shape.drawEllipse(
    0,
    halfHeight + layout.shadowOffsetY + layout.shadowHeight * 0.38,
    layout.shadowWidth * 1.24,
    layout.shadowHeight * 1.32,
  );
  shape.endFill();

  shape.beginFill(0x17100b, contactShadowAlpha * 0.8);
  shape.drawEllipse(
    0,
    halfHeight + layout.shadowOffsetY + layout.shadowHeight * 0.14,
    layout.shadowWidth * 0.98,
    layout.shadowHeight * 0.78,
  );
  shape.endFill();

  shape.beginFill(0x100a07, contactShadowAlpha);
  shape.drawEllipse(
    0,
    halfHeight + thickness + layout.shadowHeight * 0.08,
    layout.shadowWidth * 0.66,
    layout.shadowHeight * 0.42,
  );
  shape.endFill();

  shape.lineStyle(hoverActive ? 2 : 1.5, borderColor, state === 'locked' ? 0.56 : 0.78);
  shape.beginFill(palette.left, 1);
  shape.drawPolygon([
    -halfWidth, 0,
    0, halfHeight,
    0, halfHeight + thickness,
    -halfWidth, thickness,
  ]);
  shape.endFill();

  shape.lineStyle(0, 0x000000, 0);
  shape.beginFill(lightenColor(palette.left, 0.2), state === 'locked' ? 0.14 : 0.22);
  shape.drawPolygon([
    -halfWidth, 0,
    0, halfHeight,
    0, halfHeight + thickness * 0.26,
    -halfWidth, thickness * 0.26,
  ]);
  shape.endFill();

  shape.beginFill(mixColor(palette.left, topColor, 0.24), state === 'locked' ? 0.08 : 0.14);
  shape.drawPolygon([
    -halfWidth, thickness * 0.2,
    0, halfHeight + thickness * 0.2,
    0, halfHeight + thickness * 0.68,
    -halfWidth, thickness * 0.68,
  ]);
  shape.endFill();

  shape.beginFill(mixColor(palette.left, 0x26170f, 0.5), state === 'locked' ? 0.2 : 0.31);
  shape.drawPolygon([
    -halfWidth, thickness * 0.62,
    0, halfHeight + thickness * 0.62,
    0, halfHeight + thickness,
    -halfWidth, thickness,
  ]);
  shape.endFill();

  shape.lineStyle(hoverActive ? 2 : 1.5, borderColor, state === 'locked' ? 0.56 : 0.78);
  shape.beginFill(palette.right, 1);
  shape.drawPolygon([
    0, halfHeight,
    halfWidth, 0,
    halfWidth, thickness,
    0, halfHeight + thickness,
  ]);
  shape.endFill();

  shape.lineStyle(0, 0x000000, 0);
  shape.beginFill(lightenColor(palette.right, 0.14), state === 'locked' ? 0.12 : 0.2);
  shape.drawPolygon([
    0, halfHeight,
    halfWidth, 0,
    halfWidth, thickness * 0.24,
    0, halfHeight + thickness * 0.24,
  ]);
  shape.endFill();

  shape.beginFill(mixColor(palette.right, topColor, 0.2), state === 'locked' ? 0.08 : 0.14);
  shape.drawPolygon([
    0, halfHeight + thickness * 0.18,
    halfWidth, thickness * 0.18,
    halfWidth, thickness * 0.66,
    0, halfHeight + thickness * 0.66,
  ]);
  shape.endFill();

  shape.beginFill(mixColor(palette.right, 0x21150e, 0.52), state === 'locked' ? 0.22 : 0.34);
  shape.drawPolygon([
    0, halfHeight + thickness * 0.6,
    halfWidth, thickness * 0.6,
    halfWidth, thickness,
    0, halfHeight + thickness,
  ]);
  shape.endFill();

  const topEdgeColor = mixColor(borderColor, 0xf8f0e4, 0.12);
  shape.lineStyle(hoverActive ? 2.4 : 1.8, topEdgeColor, state === 'locked' ? 0.62 : 0.86);
  shape.beginFill(topColor, 1);
  shape.drawPolygon([
    0, -halfHeight,
    halfWidth, 0,
    0, halfHeight,
    -halfWidth, 0,
  ]);
  shape.endFill();

  if (hoverActive) {
    shape.lineStyle(3, 0xfff0b3, 0.94);
    shape.beginFill(0xfff7cf, 0.12);
    shape.drawPolygon([
      0, -halfHeight,
      halfWidth, 0,
      0, halfHeight,
      -halfWidth, 0,
    ]);
    shape.endFill();

    shape.lineStyle(1.4, 0xfffde8, 0.72);
    shape.drawEllipse(0, -halfHeight * 0.04, halfWidth * 0.62, halfHeight * 0.36);
  }

  shape.lineStyle(0, 0x000000, 0);
  shape.beginFill(lightenColor(topColor, 0.22), state === 'locked' ? 0.09 : hoverActive ? 0.23 : 0.17);
  shape.drawPolygon([
    -halfWidth * 0.76, -halfHeight * 0.05,
    0, -halfHeight * 0.9,
    halfWidth * 0.76, -halfHeight * 0.05,
    0, -halfHeight * 0.24,
  ]);
  shape.endFill();

  shape.beginFill(mixColor(topColor, 0xf9e0bc, 0.34), state === 'locked' ? 0.06 : 0.12);
  shape.drawPolygon([
    -halfWidth * 0.52, -halfHeight * 0.04,
    0, -halfHeight * 0.56,
    halfWidth * 0.52, -halfHeight * 0.04,
    0, halfHeight * 0.16,
  ]);
  shape.endFill();

  shape.beginFill(mixColor(topColor, palette.edge, 0.52), state === 'locked' ? 0.1 : 0.18);
  shape.drawPolygon([
    -halfWidth * 0.76, halfHeight * 0.08,
    0, halfHeight * 0.9,
    halfWidth * 0.76, halfHeight * 0.08,
    0, halfHeight * 0.24,
  ]);
  shape.endFill();

  shape.beginFill(mixColor(topColor, 0x1a110b, 0.38), state === 'locked' ? 0.05 : 0.1);
  shape.drawPolygon([
    -halfWidth * 0.94, 0,
    -halfWidth * 0.64, -halfHeight * 0.23,
    -halfWidth * 0.23, -halfHeight * 0.06,
    -halfWidth * 0.52, halfHeight * 0.19,
  ]);
  shape.drawPolygon([
    halfWidth * 0.94, 0,
    halfWidth * 0.64, -halfHeight * 0.23,
    halfWidth * 0.23, -halfHeight * 0.06,
    halfWidth * 0.52, halfHeight * 0.19,
  ]);
  shape.endFill();

  drawSoilMicroTexture(shape, layout, state, topColor, palette.edge, hoverActive);

  if (state === 'locked') {
    shape.lineStyle(0, 0x000000, 0);
    shape.beginFill(0x2e2b29, 0.24);
    shape.drawPolygon([
      0, -halfHeight * 0.86,
      halfWidth * 0.76, 0,
      0, halfHeight * 0.86,
      -halfWidth * 0.76, 0,
    ]);
    shape.endFill();

    shape.lineStyle(1, 0x666260, 0.42);
    shape.moveTo(-halfWidth * 0.56, -halfHeight * 0.06);
    shape.lineTo(0, halfHeight * 0.4);
    shape.lineTo(halfWidth * 0.56, -halfHeight * 0.06);
    shape.moveTo(-halfWidth * 0.42, -halfHeight * 0.32);
    shape.lineTo(halfWidth * 0.42, halfHeight * 0.2);
  }

  shape.lineStyle(1, lightenColor(palette.edge, 0.44), state === 'locked' ? 0.14 : 0.24);
  shape.moveTo(-halfWidth * 0.86, -halfHeight * 0.03);
  shape.lineTo(0, -halfHeight * 0.72);
  shape.lineTo(halfWidth * 0.86, -halfHeight * 0.03);

  shape.lineStyle(1, mixColor(palette.edge, 0x2d1c11, 0.6), state === 'locked' ? 0.16 : 0.24);
  shape.moveTo(0, halfHeight);
  shape.lineTo(0, halfHeight + thickness);

  overlay.alpha = state === 'locked' ? 0 : 1;
  if (state === 'empty') drawEmptyOverlay(overlay, layout);
  if (state === 'seed') drawSeedOverlay(overlay, layout);
  if (state === 'sprout') drawSproutOverlay(overlay, layout);
  if (state === 'leaf') drawLeafOverlay(overlay, layout);
  if (state === 'flower') drawFlowerOverlay(overlay, layout);
  if (state === 'fruit') drawFruitOverlay(overlay, layout);
  if (state === 'mature') drawMatureOverlay(overlay, layout, pulsePhase);
  if (state === 'withered') drawWitheredOverlay(overlay, layout);

  if (state === 'locked') {
    plot.lockOverlay.alpha = 1;
    plot.lockOverlay.y = Math.round(halfHeight * 0.1);
    drawLockOverlay(plot.lockOverlay, layout, topColor);
  } else {
    plot.lockOverlay.clear();
    plot.lockOverlay.alpha = 0;
  }
}

export function FarmPixiPrototype() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PixiApplicationLike | null>(null);
  const pixiRef = useRef<PixiModuleLike | null>(null);
  const stageRef = useRef<PixiContainerLike | null>(null);
  const plotObjectsRef = useRef<RenderPlot[]>([]);
  const layoutRef = useRef<SceneLayout | null>(null);
  const renderPlotsRef = useRef<(() => void) | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const renderRequestIdRef = useRef<number | null>(null);
  const isRenderQueuedRef = useRef(false);
  const pulsePhaseRef = useRef(0);
  const pulseFrameIdRef = useRef<number | null>(null);
  const interactionLogIdRef = useRef(0);

  const [plotStates, setPlotStates] = useState<PlotVisualState[]>(DEFAULT_PLOT_STATES);
  const [hoveredPlotId, setHoveredPlotId] = useState<number | null>(null);
  const [hoverEnabled, setHoverEnabled] = useState(true);
  const [status, setStatus] = useState<PrototypeStatus>('loading');
  const [errorText, setErrorText] = useState('');
  const [harvestedCount, setHarvestedCount] = useState(0);
  const [interactionLogs, setInteractionLogs] = useState<InteractionLogEntry[]>([]);
  const [lastAction, setLastAction] = useState<LastActionInfo>({
    action: 'NONE',
    detail: 'waiting input',
  });

  const plotStatesRef = useRef<PlotVisualState[]>(DEFAULT_PLOT_STATES);
  const hoveredPlotIdRef = useRef<number | null>(null);
  const hoverEnabledRef = useRef(true);

  const appendInteractionLog = useCallback(
    (plotId: number | null, action: InteractionAction, result: string) => {
      interactionLogIdRef.current += 1;
      const logEntry: InteractionLogEntry = {
        id: interactionLogIdRef.current,
        time: formatLogTime(new Date()),
        plotId,
        action,
        result,
      };
      setInteractionLogs((previous) => [logEntry, ...previous].slice(0, MAX_INTERACTION_LOGS));
      setLastAction({
        action,
        detail: plotId === null ? result : `plot ${plotId + 1} • ${result}`,
      });
    },
    [],
  );

  const handlePlotTap = useCallback(
    (plotId: number) => {
      const currentState = plotStatesRef.current[plotId] ?? 'locked';
      if (!isUnlockedState(currentState)) {
        appendInteractionLog(plotId, 'LOCKED_BLOCK', 'locked');
        return;
      }

      const transition = resolvePlotTransition(currentState);
      const nextStates = plotStatesRef.current.slice();
      nextStates[plotId] = transition.nextState;
      plotStatesRef.current = nextStates;
      setPlotStates(nextStates);

      if (transition.harvestedDelta > 0) {
        setHarvestedCount((previous) => previous + transition.harvestedDelta);
      }
      appendInteractionLog(plotId, transition.action, transition.result);
    },
    [appendInteractionLog],
  );

  const unlockedCount = useMemo(() => plotStates.filter((state) => state !== 'locked').length, [plotStates]);
  const lockedCount = TOTAL_PLOTS - unlockedCount;
  const hoveredStateLabel = useMemo(() => {
    if (hoveredPlotId === null) return 'NONE';
    const hoveredState = plotStates[hoveredPlotId] ?? 'locked';
    if (!isUnlockedState(hoveredState)) return 'NONE';
    return HOVER_STATE_LABELS[hoveredState];
  }, [hoveredPlotId, plotStates]);

  useEffect(() => {
    plotStatesRef.current = plotStates;
    hoveredPlotIdRef.current = hoveredPlotId;
    hoverEnabledRef.current = hoverEnabled;
    renderPlotsRef.current?.();
  }, [hoverEnabled, hoveredPlotId, plotStates]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let removeCanvasPointerListener: (() => void) | null = null;

    const resetRuntime = () => {
      if (removeCanvasPointerListener) {
        removeCanvasPointerListener();
        removeCanvasPointerListener = null;
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (renderRequestIdRef.current !== null) {
        window.cancelAnimationFrame(renderRequestIdRef.current);
        renderRequestIdRef.current = null;
      }
      if (pulseFrameIdRef.current !== null) {
        window.cancelAnimationFrame(pulseFrameIdRef.current);
        pulseFrameIdRef.current = null;
      }
      pulsePhaseRef.current = 0;
      isRenderQueuedRef.current = false;
      requestRenderRef.current = null;
      renderPlotsRef.current = null;
      appRef.current?.destroy(true, { children: true, texture: true, baseTexture: true });
      appRef.current = null;
      pixiRef.current = null;
      stageRef.current = null;
      layoutRef.current = null;
      plotObjectsRef.current = [];
      if (mountRef.current) {
        mountRef.current.innerHTML = '';
      }
    };

    const initializeScene = (pixi: PixiModuleLike) => {
      pixiRef.current = pixi;

      const host = mountRef.current;
      if (!host) return;

      const coarsePointer = getCoarsePointerMode();
      setHoverEnabled(!coarsePointer);
      setHoveredPlotId(null);
      hoverEnabledRef.current = !coarsePointer;
      hoveredPlotIdRef.current = null;

      const initialWidth = Math.max(320, host.clientWidth || 320);
      const fallbackHeight = window.innerWidth < 768 ? 360 : 460;
      const initialHeight = Math.max(320, host.clientHeight || fallbackHeight);
      const resolution = clamp(window.devicePixelRatio || 1, 0.9, 1.4);

      const app = new pixi.Application({
        width: initialWidth,
        height: initialHeight,
        antialias: true,
        autoDensity: true,
        resolution,
        backgroundAlpha: 0,
        autoStart: false,
      });
      appRef.current = app;

      const canvas = app.view;
      if (!canvas) {
        throw new Error('Pixi canvas is unavailable');
      }
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      host.innerHTML = '';
      host.appendChild(canvas);

      const sceneRoot = new pixi.Container();
      const skyLayer = new pixi.Graphics();
      const farDecorationLayer = new pixi.Graphics();
      const plotLayer = new pixi.Container();
      const foregroundDecorationLayer = new pixi.Graphics();
      sceneRoot.addChild(skyLayer, farDecorationLayer, plotLayer, foregroundDecorationLayer);
      stageRef.current = plotLayer;
      app.stage.addChild(sceneRoot);

      const handleCanvasPointerUp = (event: PointerEvent) => {
        const activeLayout = layoutRef.current;
        const activePlotLayer = stageRef.current;
        const activeApp = appRef.current;
        if (!activeLayout || !activePlotLayer || !activeApp) return;
        if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;

        const canvasBounds = canvas.getBoundingClientRect();
        if (canvasBounds.width <= 0 || canvasBounds.height <= 0) return;

        const pointerX = ((event.clientX - canvasBounds.left) * activeApp.screen.width) / canvasBounds.width;
        const pointerY = ((event.clientY - canvasBounds.top) * activeApp.screen.height) / canvasBounds.height;
        const hitPlotId = findHitPlotId(pointerX, pointerY, activePlotLayer, plotObjectsRef.current, activeLayout);
        if (hitPlotId === null) {
          appendInteractionLog(null, 'PASS', 'outside_diamond');
          return;
        }
        appendInteractionLog(hitPlotId, 'HIT', 'diamond');
      };
      canvas.addEventListener('pointerup', handleCanvasPointerUp);
      removeCanvasPointerListener = () => {
        canvas.removeEventListener('pointerup', handleCanvasPointerUp);
      };

      const requestRender = () => {
        if (cancelled || isRenderQueuedRef.current) return;
        isRenderQueuedRef.current = true;
        renderRequestIdRef.current = window.requestAnimationFrame(() => {
          isRenderQueuedRef.current = false;
          renderRequestIdRef.current = null;
          app.renderer.render(app.stage);
        });
      };
      requestRenderRef.current = requestRender;

      const renderPlots = () => {
        const activeLayout = layoutRef.current;
        if (!activeLayout) return;

        const activeHoveredPlotId = hoverEnabledRef.current ? hoveredPlotIdRef.current : null;
        const activePulsePhase = pulsePhaseRef.current;
        for (const plot of plotObjectsRef.current) {
          const state = plotStatesRef.current[plot.id] ?? 'locked';
          drawPlot(plot, state, activeHoveredPlotId === plot.id, activeLayout, hoverEnabledRef.current, activePulsePhase, pixi);
        }
        requestRender();
      };
      renderPlotsRef.current = renderPlots;

      const animatePulse = (timestamp: number) => {
        if (cancelled) return;
        pulsePhaseRef.current = (timestamp % 1800) / 1800;
        if (plotStatesRef.current.some((state) => state === 'mature')) {
          renderPlotsRef.current?.();
        }
        pulseFrameIdRef.current = window.requestAnimationFrame(animatePulse);
      };
      pulseFrameIdRef.current = window.requestAnimationFrame(animatePulse);

      const renderPlotsInOrder = PLOT_RENDER_ORDER.map((plotId) => {
        const container = new pixi.Container();
        const shape = new pixi.Graphics();
        const overlay = new pixi.Graphics();
        const lockOverlay = new pixi.Graphics();

        shape.interactive = true;
        shape.cursor = 'pointer';
        shape.on('pointertap', () => {
          handlePlotTap(plotId);
        });

        if (!coarsePointer) {
          shape.on('pointerover', () => {
            if ((plotStatesRef.current[plotId] ?? 'locked') === 'locked') return;
            setHoveredPlotId((current) => (current === plotId ? current : plotId));
          });
          shape.on('pointerout', () => {
            setHoveredPlotId((current) => (current === plotId ? null : current));
          });
        }

        container.addChild(shape, overlay, lockOverlay);
        plotLayer.addChild(container);

        return {
          id: plotId,
          baseX: 0,
          baseY: 0,
          container,
          shape,
          overlay,
          lockOverlay,
        } satisfies RenderPlot;
      });

      plotObjectsRef.current = renderPlotsInOrder;

      const applyLayout = () => {
        const nextWidth = Math.max(320, host.clientWidth || 320);
        const fallbackNextHeight = window.innerWidth < 768 ? 360 : 460;
        const nextHeight = Math.max(320, host.clientHeight || fallbackNextHeight);
        app.renderer.resize(nextWidth, nextHeight);

        const nextBackdropLayout = resolveBackdropLayout(nextWidth, nextHeight);
        const nextLayout = resolveSceneLayout(nextWidth, nextHeight, nextBackdropLayout);
        layoutRef.current = nextLayout;

        drawSkyLayer(skyLayer, nextWidth, nextBackdropLayout);
        drawFarMidLayer(farDecorationLayer, nextWidth, nextHeight, nextBackdropLayout);
        drawFrontDecorationLayer(
          foregroundDecorationLayer,
          nextWidth,
          nextHeight,
          nextBackdropLayout,
          nextLayout,
        );

        plotLayer.x = Math.round(nextWidth / 2);
        plotLayer.y = nextLayout.stageY;

        for (const plot of plotObjectsRef.current) {
          const coordinate = resolvePlotCoordinate(plot.id, nextLayout);
          plot.baseX = coordinate.x;
          plot.baseY = coordinate.y;
          plot.container.x = coordinate.x;
        }

        renderPlots();
      };

      applyLayout();
      resizeObserver = new ResizeObserver(applyLayout);
      resizeObserver.observe(host);
      setStatus('ready');
    };

    const setupPrototype = async () => {
      setStatus('loading');
      setErrorText('');
      try {
        const pixiUnknown: unknown = await import(/* @vite-ignore */ PIXI_ESM_CDN_URL);
        if (cancelled) return;
        if (!isPixiModule(pixiUnknown)) {
          throw new Error('Pixi ESM module shape is invalid');
        }
        initializeScene(pixiUnknown);
      } catch (error) {
        if (cancelled) return;
        if (!isAutoDetectRendererError(error)) {
          setStatus('error');
          setErrorText(getErrorMessage(error));
          return;
        }

        try {
          resetRuntime();
          const legacyPixi = await loadPixiLegacyModule();
          if (cancelled) return;
          initializeScene(legacyPixi);
        } catch (legacyError) {
          if (cancelled) return;
          setStatus('error');
          setErrorText(
            `${getErrorMessage(error)} | Legacy fallback failed: ${getErrorMessage(legacyError)}`,
          );
        }
      }
    };

    void setupPrototype();

    return () => {
      cancelled = true;
      resetRuntime();
    };
  }, [appendInteractionLog, handlePlotTap]);

  return (
    <div className="min-h-dvh w-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 sm:py-7">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-700/80 bg-slate-900/75 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.55)] sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-wide text-slate-100 sm:text-xl">Pixi Farm Prototype • Step 5 Interactive</h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              Step 5：保留 Step 4 视觉层，新增菱形命中日志、hover 强化高亮与种植/生长/收获语义交互。
            </p>
          </div>
          <a
            className="inline-flex w-fit items-center rounded-full border border-slate-500/80 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-slate-300 hover:text-white"
            href="/"
          >
            Back To App
          </a>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard title="Unlocked" value={String(unlockedCount)} suffix="plots" />
          <MetricCard title="Locked" value={String(lockedCount)} suffix="plots" />
          <MetricCard title="Hover" value={hoverEnabled ? 'ON' : 'OFF'} suffix={hoverEnabled ? hoveredStateLabel : 'coarse'} />
          <MetricCard title="Grid" value="3 x 3" suffix="isometric" />
          <MetricCard title="Harvested" value={String(harvestedCount)} suffix="times" />
          <MetricCard title="Last Action" value={lastAction.action} suffix={lastAction.detail} />
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-2 sm:p-3">
          <div ref={mountRef} className="h-[360px] w-full rounded-2xl bg-slate-950 sm:h-[460px]" />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-100 sm:text-base">Interaction Log (Latest 6)</h2>
            <p className="text-[11px] text-slate-400 sm:text-xs">Time / Plot / Action / Result</p>
          </div>
          <div className="mt-3 space-y-1.5">
            {interactionLogs.length === 0 && (
              <p className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                Waiting for interaction...
              </p>
            )}
            {interactionLogs.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[74px_52px_88px_1fr] items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-950/70 px-3 py-2 text-xs text-slate-200"
              >
                <span className="font-mono text-slate-300">{entry.time}</span>
                <span className="text-slate-300">{entry.plotId === null ? '--' : `#${entry.plotId + 1}`}</span>
                <span className="font-semibold tracking-wide text-emerald-200">{entry.action}</span>
                <span className="truncate text-slate-300">{entry.result}</span>
              </div>
            ))}
          </div>
        </div>

        {status === 'loading' && (
          <p className="mt-3 text-xs text-slate-400">Loading Pixi runtime...</p>
        )}
        {status === 'error' && (
          <p className="mt-3 rounded-xl border border-red-500/60 bg-red-900/30 px-3 py-2 text-xs text-red-200">
            Pixi prototype failed to initialize: {errorText}
          </p>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  suffix: string;
}

function MetricCard({ title, value, suffix }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">
        {value}
        <span className="ml-1 text-xs font-normal text-slate-400">{suffix}</span>
      </p>
    </div>
  );
}
