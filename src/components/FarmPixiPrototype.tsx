/**
 * FarmPixiPrototype — Step 1 + Step 2 可验收 Pixi 样机。
 *
 * 目标：
 * 1) 3x3 等距地块（前 4 解锁，后 5 锁定）
 * 2) 地块厚度感（顶面 + 左右侧面 + 接地阴影）
 * 3) 最小状态集（空地/生长中/成熟/枯萎/锁定）与基础交互
 * 4) 背景层（天空渐变 + 草地）与装饰层（太阳/云/房屋/谷仓/栅栏/牛羊）
 *
 * 约束：
 * - 不接入 Phase2 机制，仅验证视觉与交互原型
 */
import { useEffect, useMemo, useRef, useState } from 'react';

type PlotState = 'empty' | 'growing' | 'mature' | 'withered';
type PlotVisualState = PlotState | 'locked';
type PrototypeStatus = 'loading' | 'ready' | 'error';

interface PlotPalette {
  top: number;
  left: number;
  right: number;
  edge: number;
  label: string;
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

interface PixiTextLike extends PixiDisplayObjectLike {
  text: string;
  anchor: { set(x: number, y?: number): void };
  style?: Partial<PixiTextStyleLike>;
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

interface PixiTextStyleLike {
  fontFamily: string;
  fontSize: number;
  fill: number;
  fontWeight: string | number;
  align?: 'left' | 'center' | 'right';
  dropShadow?: boolean;
  dropShadowColor?: string;
  dropShadowBlur?: number;
  dropShadowDistance?: number;
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
  Text: new (text: string, style: PixiTextStyleLike) => PixiTextLike;
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
  iconFontSize: number;
}

interface RenderPlot {
  id: number;
  baseX: number;
  baseY: number;
  container: PixiContainerLike;
  shape: PixiGraphicsLike;
  overlay: PixiGraphicsLike;
  lockIcon: PixiTextLike;
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

const DEFAULT_PLOT_STATES: PlotVisualState[] = [
  'empty',
  'growing',
  'mature',
  'withered',
  'locked',
  'locked',
  'locked',
  'locked',
  'locked',
];

const PLOT_PALETTES: Record<PlotVisualState, PlotPalette> = {
  empty: {
    top: 0xe0b07c,
    left: 0xaa7449,
    right: 0x966239,
    edge: 0x6a4427,
    label: 'EMPTY',
  },
  growing: {
    top: 0xd6b67e,
    left: 0x9d7642,
    right: 0x8f6837,
    edge: 0x674726,
    label: 'GROWING',
  },
  mature: {
    top: 0xd7ac73,
    left: 0x8f663a,
    right: 0x7f582f,
    edge: 0x5c3e24,
    label: 'MATURE',
  },
  withered: {
    top: 0xac9a83,
    left: 0x746353,
    right: 0x675849,
    edge: 0x43372e,
    label: 'WITHERED',
  },
  locked: {
    top: 0xa8a4a1,
    left: 0x898683,
    right: 0x7b7875,
    edge: 0x5a5856,
    label: 'LOCKED',
  },
};

let pixiLegacyLoadPromise: Promise<PixiModuleLike> | null = null;

function isPixiModule(value: unknown): value is PixiModuleLike {
  if (!value || typeof value !== 'object') return false;
  const objectValue = value as Record<string, unknown>;
  return (
    typeof objectValue.Application === 'function' &&
    typeof objectValue.Container === 'function' &&
    typeof objectValue.Graphics === 'function' &&
    typeof objectValue.Text === 'function' &&
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
  if (current === 'empty') return 'growing';
  if (current === 'growing') return 'mature';
  if (current === 'mature') return 'withered';
  return 'empty';
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
  const farGroundY = backdropLayout.groundTopY + grassHeight * 0.47;
  const leftBuildingX = Math.max(56 * scale, viewportWidth * 0.12);
  const rightBuildingX = Math.min(viewportWidth - 56 * scale, viewportWidth * 0.88);
  const farFenceOffset = Math.max(6, 14 * scale);
  const farSegmentWidth = Math.max(8, 14 * scale);
  const farFenceSpan = 5 * farSegmentWidth;

  drawSun(
    farLayer,
    viewportWidth * 0.15,
    Math.max(50 * scale, viewportHeight * 0.1),
    Math.max(20, 28 * scale),
  );
  drawCloud(farLayer, viewportWidth * 0.14, viewportHeight * 0.2, 0.68 * scale);
  drawCloud(farLayer, viewportWidth * 0.56, viewportHeight * 0.13, 0.76 * scale);
  drawCloud(farLayer, viewportWidth * 0.9, viewportHeight * 0.18, 0.86 * scale);

  drawCottage(farLayer, leftBuildingX, farGroundY + 2 * scale, 0.64 * scale);
  drawBarn(farLayer, rightBuildingX, farGroundY + 3 * scale, 0.67 * scale);
  drawFence(farLayer, farFenceOffset, farGroundY + 5 * scale, 5, farSegmentWidth, 0.74 * scale);
  drawFence(
    farLayer,
    viewportWidth - farFenceSpan - farFenceOffset,
    farGroundY + 5 * scale,
    5,
    farSegmentWidth,
    0.74 * scale,
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
  const postWidth = Math.max(3, Math.round(7 * scale));
  const postHeight = Math.max(9, Math.round(24 * scale));
  const railHeight = Math.max(2, Math.round(4 * scale));
  const spanWidth = segmentCount * segmentWidth;

  layer.lineStyle(2, 0x8b5e33, 0.82);
  layer.beginFill(0xc88f5d, 0.96);
  layer.drawRect(startX - postWidth * 0.5, groundY - postHeight + 6 * scale, spanWidth + postWidth, railHeight);
  layer.drawRect(startX - postWidth * 0.5, groundY - postHeight * 0.45, spanWidth + postWidth, railHeight);
  layer.endFill();

  for (let index = 0; index <= segmentCount; index += 1) {
    const postX = startX + index * segmentWidth;
    layer.lineStyle(2, 0x8b5e33, 0.9);
    layer.beginFill(0xcf9d69, 1);
    layer.drawRect(postX - postWidth * 0.5, groundY - postHeight, postWidth, postHeight);
    layer.endFill();
  }
}

function drawCottage(layer: PixiGraphicsLike, centerX: number, groundY: number, scale: number): void {
  const bodyWidth = 96 * scale;
  const bodyHeight = 70 * scale;
  const roofHeight = 45 * scale;
  const leftX = centerX - bodyWidth * 0.5;
  const topY = groundY - bodyHeight;

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x5d6a57, 0.22);
  layer.drawEllipse(centerX, groundY + 5 * scale, bodyWidth * 0.54, 12 * scale);
  layer.endFill();

  layer.lineStyle(2, 0x8a6548, 0.92);
  layer.beginFill(0xf9e2c0, 1);
  layer.drawRect(leftX, topY, bodyWidth, bodyHeight);
  layer.endFill();

  layer.lineStyle(2, 0x8a5537, 0.95);
  layer.beginFill(0xbe6c46, 1);
  layer.drawPolygon([
    centerX, topY - roofHeight,
    leftX - 6 * scale, topY + 8 * scale,
    leftX + bodyWidth + 6 * scale, topY + 8 * scale,
  ]);
  layer.endFill();

  layer.lineStyle(2, 0x8a6548, 0.92);
  layer.beginFill(0xe8f2ff, 1);
  layer.drawRect(leftX + bodyWidth * 0.12, topY + bodyHeight * 0.22, bodyWidth * 0.2, bodyHeight * 0.28);
  layer.drawRect(leftX + bodyWidth * 0.68, topY + bodyHeight * 0.22, bodyWidth * 0.2, bodyHeight * 0.28);
  layer.endFill();

  layer.lineStyle(2, 0x855530, 0.95);
  layer.beginFill(0xc99264, 1);
  layer.drawRect(leftX + bodyWidth * 0.39, topY + bodyHeight * 0.46, bodyWidth * 0.22, bodyHeight * 0.54);
  layer.endFill();
}

function drawBarn(layer: PixiGraphicsLike, centerX: number, groundY: number, scale: number): void {
  const bodyWidth = 114 * scale;
  const bodyHeight = 76 * scale;
  const roofRise = 34 * scale;
  const leftX = centerX - bodyWidth * 0.5;
  const topY = groundY - bodyHeight;

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x5d6a57, 0.22);
  layer.drawEllipse(centerX, groundY + 6 * scale, bodyWidth * 0.56, 13 * scale);
  layer.endFill();

  layer.lineStyle(2, 0x86493b, 0.94);
  layer.beginFill(0xde5c4e, 1);
  layer.drawRect(leftX, topY, bodyWidth, bodyHeight);
  layer.endFill();

  layer.lineStyle(2, 0x6e4f4c, 0.94);
  layer.beginFill(0x927579, 1);
  layer.drawPolygon([
    leftX - 6 * scale, topY + 3 * scale,
    centerX, topY - roofRise,
    leftX + bodyWidth + 6 * scale, topY + 3 * scale,
    leftX + bodyWidth, topY + 18 * scale,
    leftX, topY + 18 * scale,
  ]);
  layer.endFill();

  const doorWidth = bodyWidth * 0.42;
  const doorHeight = bodyHeight * 0.65;
  const doorLeft = centerX - doorWidth * 0.5;
  const doorTop = groundY - doorHeight;
  layer.lineStyle(2, 0xeec8a8, 0.9);
  layer.beginFill(0xb75044, 1);
  layer.drawRect(doorLeft, doorTop, doorWidth, doorHeight);
  layer.endFill();

  layer.lineStyle(2, 0xeec8a8, 0.84);
  layer.moveTo(doorLeft, doorTop);
  layer.lineTo(doorLeft + doorWidth, doorTop + doorHeight);
  layer.moveTo(doorLeft + doorWidth, doorTop);
  layer.lineTo(doorLeft, doorTop + doorHeight);

  layer.lineStyle(2, 0xeec8a8, 0.9);
  layer.beginFill(0xce6e61, 1);
  layer.drawRect(leftX + bodyWidth * 0.32, topY + bodyHeight * 0.12, bodyWidth * 0.18, bodyHeight * 0.2);
  layer.endFill();
}

function drawCow(layer: PixiGraphicsLike, originX: number, hoofY: number, scale: number, facingLeft: boolean): void {
  const direction = facingLeft ? -1 : 1;
  const legTop = hoofY - 20 * scale;
  const bodyY = legTop - 8 * scale;
  const lineWidth = Math.max(1, Math.round(2 * scale));

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x54724a, 0.2);
  layer.drawEllipse(originX + 2 * direction * scale, hoofY + 4 * scale, 24 * scale, 8 * scale);
  layer.endFill();

  layer.lineStyle(lineWidth, 0x6d5948, 0.9);
  layer.beginFill(0x382d26, 1);
  layer.drawRect(originX - 17 * scale, legTop, 7 * scale, 20 * scale);
  layer.drawRect(originX - 4 * scale, legTop, 7 * scale, 20 * scale);
  layer.drawRect(originX + 9 * scale, legTop, 7 * scale, 20 * scale);
  layer.endFill();

  layer.lineStyle(lineWidth, 0x6d5948, 0.9);
  layer.beginFill(0xffffff, 1);
  layer.drawEllipse(originX, bodyY, 26 * scale, 17 * scale);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x2f2a28, 0.92);
  layer.drawEllipse(originX - 10 * scale, bodyY - 2 * scale, 8 * scale, 6 * scale);
  layer.drawEllipse(originX + 8 * scale, bodyY + 4 * scale, 7 * scale, 5 * scale);
  layer.endFill();

  const headX = originX + direction * 29 * scale;
  const headY = bodyY - 1 * scale;
  layer.lineStyle(lineWidth, 0x6d5948, 0.9);
  layer.beginFill(0xffffff, 1);
  layer.drawCircle(headX, headY, 12 * scale);
  layer.endFill();

  layer.beginFill(0xffffff, 1);
  layer.drawCircle(headX - direction * 8 * scale, headY - 10 * scale, 4 * scale);
  layer.drawCircle(headX + direction * 8 * scale, headY - 9 * scale, 4 * scale);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0xffc3c3, 1);
  layer.drawEllipse(headX + direction * 5 * scale, headY + 6 * scale, 7 * scale, 5 * scale);
  layer.endFill();

  layer.beginFill(0x2a2a2a, 1);
  layer.drawCircle(headX + direction * 1 * scale, headY - 2 * scale, 1.6 * scale);
  layer.drawCircle(headX + direction * 8 * scale, headY - 1 * scale, 1.6 * scale);
  layer.endFill();
}

function drawSheep(layer: PixiGraphicsLike, originX: number, hoofY: number, scale: number, facingLeft: boolean): void {
  const direction = facingLeft ? -1 : 1;
  const bodyY = hoofY - 23 * scale;
  const lineWidth = Math.max(1, Math.round(2 * scale));

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x5c7551, 0.18);
  layer.drawEllipse(originX, hoofY + 4 * scale, 20 * scale, 7 * scale);
  layer.endFill();

  layer.lineStyle(lineWidth, 0x756a5a, 0.9);
  layer.beginFill(0x6a5848, 1);
  layer.drawRect(originX - 13 * scale, hoofY - 16 * scale, 5 * scale, 16 * scale);
  layer.drawRect(originX - 2 * scale, hoofY - 16 * scale, 5 * scale, 16 * scale);
  layer.drawRect(originX + 9 * scale, hoofY - 16 * scale, 5 * scale, 16 * scale);
  layer.endFill();

  layer.lineStyle(lineWidth, 0x9b8d79, 0.9);
  layer.beginFill(0xffffff, 1);
  layer.drawCircle(originX - 12 * scale, bodyY, 9 * scale);
  layer.drawCircle(originX - 1 * scale, bodyY - 4 * scale, 11 * scale);
  layer.drawCircle(originX + 11 * scale, bodyY, 9 * scale);
  layer.drawEllipse(originX + 1 * scale, bodyY + 3 * scale, 18 * scale, 10 * scale);
  layer.endFill();

  const faceX = originX + direction * 24 * scale;
  const faceY = bodyY + 2 * scale;
  layer.lineStyle(lineWidth, 0x66594b, 0.94);
  layer.beginFill(0xf9efe2, 1);
  layer.drawCircle(faceX, faceY, 9 * scale);
  layer.endFill();

  layer.lineStyle(0, 0x000000, 0);
  layer.beginFill(0x2f2f2f, 1);
  layer.drawCircle(faceX - direction * 3 * scale, faceY - 1 * scale, 1.4 * scale);
  layer.drawCircle(faceX + direction * 3 * scale, faceY - 1 * scale, 1.4 * scale);
  layer.endFill();

  layer.lineStyle(1, 0x6a5a49, 0.88);
  layer.moveTo(faceX - direction * 2 * scale, faceY + 4 * scale);
  layer.lineTo(faceX, faceY + 5.5 * scale);
  layer.lineTo(faceX + direction * 2 * scale, faceY + 4 * scale);
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
  const frontSegmentWidth = Math.max(9, 15 * scale);
  const frontFenceSpan = 5 * frontSegmentWidth;
  const edgeOffset = Math.max(10, 14 * scale);
  const plotBottomY =
    sceneLayout.stageY +
    sceneLayout.stepY * 4 +
    sceneLayout.halfHeight +
    sceneLayout.thickness +
    sceneLayout.shadowOffsetY;
  const frontGroundY = clamp(plotBottomY + 20 * scale, viewportHeight * 0.78, viewportHeight - 10);

  drawBarn(frontLayer, -20 * scale, viewportHeight * 0.987, 0.76 * scale);
  drawCottage(frontLayer, viewportWidth + 20 * scale, viewportHeight * 0.987, 0.72 * scale);

  drawFence(frontLayer, edgeOffset, frontGroundY + 2 * scale, 5, frontSegmentWidth, 0.82 * scale);
  drawFence(
    frontLayer,
    viewportWidth - frontFenceSpan - edgeOffset,
    frontGroundY + 2 * scale,
    5,
    frontSegmentWidth,
    0.82 * scale,
  );

  drawCow(frontLayer, Math.max(20 * scale, viewportWidth * 0.09), frontGroundY - 18 * scale, 0.68 * scale, false);
  drawSheep(frontLayer, viewportWidth - Math.max(22 * scale, viewportWidth * 0.1), frontGroundY - 20 * scale, 0.64 * scale, true);
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
  const stepY = Math.round(halfHeight * 0.98);
  const shadowWidth = Math.round(halfWidth * 0.86);
  const shadowHeight = Math.max(8, Math.round(halfHeight * 0.38));
  const shadowOffsetY = Math.round(thickness + shadowHeight * 0.34 + 1);
  const sceneBottom = 4 * stepY + halfHeight + thickness + shadowOffsetY + shadowHeight;
  const preferredStageY = Math.round(backdropLayout.groundTopY + halfHeight + Math.max(10, halfHeight * 0.45));
  const minStageY = Math.max(halfHeight + 12, backdropLayout.groundTopY + Math.round(halfHeight * 0.72));
  const maxStageY = Math.max(minStageY, viewportHeight - sceneBottom - 12);
  const stageY = clamp(preferredStageY, minStageY, maxStageY);
  const iconFontSize = Math.max(14, Math.round(halfWidth * 0.34));
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
    iconFontSize,
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

function drawEmptyOverlay(overlay: PixiGraphicsLike, layout: SceneLayout): void {
  const dotRadius = Math.max(2, Math.round(layout.halfWidth * 0.03));
  overlay.beginFill(0x7a4b28, 0.42);
  overlay.drawCircle(-layout.halfWidth * 0.2, layout.halfHeight * 0.14, dotRadius);
  overlay.drawCircle(layout.halfWidth * 0.03, layout.halfHeight * 0.05, dotRadius);
  overlay.drawCircle(layout.halfWidth * 0.21, layout.halfHeight * 0.16, dotRadius);
  overlay.endFill();
}

function drawGrowingOverlay(overlay: PixiGraphicsLike, layout: SceneLayout): void {
  const stemTop = -layout.halfHeight * 0.02;
  const stemBottom = layout.halfHeight * 0.27;

  overlay.lineStyle(2, 0x3f6212, 1);
  overlay.moveTo(0, stemBottom);
  overlay.lineTo(0, stemTop);

  overlay.beginFill(0x86efac, 1);
  overlay.drawPolygon([
    0, stemTop - 2,
    -layout.halfWidth * 0.25, layout.halfHeight * 0.14,
    -layout.halfWidth * 0.02, layout.halfHeight * 0.19,
  ]);
  overlay.endFill();

  overlay.beginFill(0x4ade80, 1);
  overlay.drawPolygon([
    0, stemTop,
    layout.halfWidth * 0.24, layout.halfHeight * 0.08,
    layout.halfWidth * 0.02, layout.halfHeight * 0.2,
  ]);
  overlay.endFill();
}

function drawMatureOverlay(overlay: PixiGraphicsLike, layout: SceneLayout): void {
  const radius = Math.max(5, Math.round(layout.halfWidth * 0.12));
  const melons = [
    { x: -layout.halfWidth * 0.21, y: layout.halfHeight * 0.12 },
    { x: layout.halfWidth * 0.02, y: layout.halfHeight * 0.03 },
    { x: layout.halfWidth * 0.23, y: layout.halfHeight * 0.13 },
  ];

  for (const melon of melons) {
    overlay.beginFill(0x22c55e, 1);
    overlay.drawCircle(melon.x, melon.y, radius);
    overlay.endFill();

    overlay.lineStyle(1, 0x14532d, 0.88);
    overlay.moveTo(melon.x - radius * 0.6, melon.y - radius * 0.78);
    overlay.lineTo(melon.x - radius * 0.15, melon.y + radius * 0.78);
    overlay.moveTo(melon.x - radius * 0.1, melon.y - radius * 0.82);
    overlay.lineTo(melon.x + radius * 0.35, melon.y + radius * 0.76);
  }
}

function drawWitheredOverlay(overlay: PixiGraphicsLike, layout: SceneLayout): void {
  overlay.lineStyle(2, 0x6b5b4a, 1);
  overlay.moveTo(0, layout.halfHeight * 0.28);
  overlay.lineTo(-layout.halfWidth * 0.03, -layout.halfHeight * 0.03);
  overlay.lineTo(layout.halfWidth * 0.08, -layout.halfHeight * 0.2);

  overlay.moveTo(-layout.halfWidth * 0.02, layout.halfHeight * 0.08);
  overlay.lineTo(-layout.halfWidth * 0.2, layout.halfHeight * 0.16);
  overlay.moveTo(0, layout.halfHeight * 0.02);
  overlay.lineTo(layout.halfWidth * 0.18, layout.halfHeight * 0.09);

  overlay.beginFill(0x8c7b69, 0.95);
  overlay.drawPolygon([
    layout.halfWidth * 0.06, -layout.halfHeight * 0.18,
    layout.halfWidth * 0.26, -layout.halfHeight * 0.02,
    layout.halfWidth * 0.12, layout.halfHeight * 0.03,
  ]);
  overlay.endFill();
}

function drawPlot(
  plot: RenderPlot,
  state: PlotVisualState,
  hovered: boolean,
  layout: SceneLayout,
  hoverEnabled: boolean,
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

  const shadowAlpha = state === 'locked' ? 0.12 : 0.21;
  shape.beginFill(0x201610, shadowAlpha * 0.7);
  shape.drawEllipse(
    0,
    halfHeight + layout.shadowOffsetY + layout.shadowHeight * 0.2,
    layout.shadowWidth * 1.05,
    layout.shadowHeight * 1.08,
  );
  shape.endFill();

  shape.beginFill(0x120b07, shadowAlpha);
  shape.drawEllipse(0, halfHeight + layout.shadowOffsetY, layout.shadowWidth * 0.78, layout.shadowHeight * 0.66);
  shape.endFill();

  shape.lineStyle(2, borderColor, state === 'locked' ? 0.82 : 1);
  shape.beginFill(palette.left, 1);
  shape.drawPolygon([
    -halfWidth, 0,
    0, halfHeight,
    0, halfHeight + thickness,
    -halfWidth, thickness,
  ]);
  shape.endFill();

  shape.lineStyle(0, 0x000000, 0);
  shape.beginFill(lightenColor(palette.left, 0.17), state === 'locked' ? 0.18 : 0.3);
  shape.drawPolygon([
    -halfWidth, 0,
    0, halfHeight,
    0, halfHeight + thickness * 0.34,
    -halfWidth, thickness * 0.34,
  ]);
  shape.endFill();

  shape.beginFill(mixColor(palette.left, 0x26170f, 0.42), state === 'locked' ? 0.22 : 0.38);
  shape.drawPolygon([
    -halfWidth, thickness * 0.58,
    0, halfHeight + thickness * 0.58,
    0, halfHeight + thickness,
    -halfWidth, thickness,
  ]);
  shape.endFill();

  shape.lineStyle(2, borderColor, state === 'locked' ? 0.82 : 1);
  shape.beginFill(palette.right, 1);
  shape.drawPolygon([
    0, halfHeight,
    halfWidth, 0,
    halfWidth, thickness,
    0, halfHeight + thickness,
  ]);
  shape.endFill();

  shape.lineStyle(0, 0x000000, 0);
  shape.beginFill(lightenColor(palette.right, 0.11), state === 'locked' ? 0.14 : 0.24);
  shape.drawPolygon([
    0, halfHeight,
    halfWidth, 0,
    halfWidth, thickness * 0.3,
    0, halfHeight + thickness * 0.3,
  ]);
  shape.endFill();

  shape.beginFill(mixColor(palette.right, 0x21150e, 0.46), state === 'locked' ? 0.24 : 0.4);
  shape.drawPolygon([
    0, halfHeight + thickness * 0.54,
    halfWidth, thickness * 0.54,
    halfWidth, thickness,
    0, halfHeight + thickness,
  ]);
  shape.endFill();

  shape.lineStyle(hoverActive ? 3 : 2, borderColor, 1);
  shape.beginFill(topColor, 1);
  shape.drawPolygon([
    0, -halfHeight,
    halfWidth, 0,
    0, halfHeight,
    -halfWidth, 0,
  ]);
  shape.endFill();

  shape.beginFill(0xffffff, state === 'locked' ? 0.12 : hoverActive ? 0.24 : 0.18);
  shape.drawPolygon([
    -halfWidth * 0.45, -halfHeight * 0.01,
    0, -halfHeight * 0.52,
    halfWidth * 0.45, -halfHeight * 0.01,
    0, halfHeight * 0.18,
  ]);
  shape.endFill();

  shape.beginFill(mixColor(topColor, palette.edge, 0.42), state === 'locked' ? 0.08 : 0.16);
  shape.drawPolygon([
    -halfWidth * 0.36, halfHeight * 0.06,
    0, halfHeight * 0.3,
    halfWidth * 0.36, halfHeight * 0.06,
    0, -halfHeight * 0.08,
  ]);
  shape.endFill();

  shape.lineStyle(1, lightenColor(palette.edge, 0.45), state === 'locked' ? 0.2 : 0.38);
  shape.moveTo(-halfWidth * 0.8, -halfHeight * 0.02);
  shape.lineTo(0, -halfHeight * 0.66);
  shape.lineTo(halfWidth * 0.8, -halfHeight * 0.02);

  shape.lineStyle(1, 0x4b2e1a, 0.2);
  shape.moveTo(0, halfHeight);
  shape.lineTo(0, halfHeight + thickness);

  overlay.alpha = state === 'locked' ? 0 : 1;
  if (state === 'empty') drawEmptyOverlay(overlay, layout);
  if (state === 'growing') drawGrowingOverlay(overlay, layout);
  if (state === 'mature') drawMatureOverlay(overlay, layout);
  if (state === 'withered') drawWitheredOverlay(overlay, layout);

  plot.lockIcon.alpha = state === 'locked' ? 0.95 : 0;
  plot.lockIcon.y = Math.round(halfHeight * 0.08);
  if (plot.lockIcon.style) {
    plot.lockIcon.style.fontSize = layout.iconFontSize;
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

  const [plotStates, setPlotStates] = useState<PlotVisualState[]>(DEFAULT_PLOT_STATES);
  const [hoveredPlotId, setHoveredPlotId] = useState<number | null>(null);
  const [hoverEnabled, setHoverEnabled] = useState(true);
  const [status, setStatus] = useState<PrototypeStatus>('loading');
  const [errorText, setErrorText] = useState('');

  const plotStatesRef = useRef<PlotVisualState[]>(DEFAULT_PLOT_STATES);
  const hoveredPlotIdRef = useRef<number | null>(null);
  const hoverEnabledRef = useRef(true);

  const unlockedCount = useMemo(() => plotStates.filter((state) => state !== 'locked').length, [plotStates]);
  const lockedCount = TOTAL_PLOTS - unlockedCount;
  const hoveredStateLabel = useMemo(() => {
    if (hoveredPlotId === null) return 'NONE';
    return PLOT_PALETTES[plotStates[hoveredPlotId] ?? 'locked'].label;
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

    const resetRuntime = () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (renderRequestIdRef.current !== null) {
        window.cancelAnimationFrame(renderRequestIdRef.current);
        renderRequestIdRef.current = null;
      }
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
        for (const plot of plotObjectsRef.current) {
          const state = plotStatesRef.current[plot.id] ?? 'locked';
          drawPlot(plot, state, activeHoveredPlotId === plot.id, activeLayout, hoverEnabledRef.current, pixi);
        }
        requestRender();
      };
      renderPlotsRef.current = renderPlots;

      const renderPlotsInOrder = PLOT_RENDER_ORDER.map((plotId) => {
        const container = new pixi.Container();
        const shape = new pixi.Graphics();
        const overlay = new pixi.Graphics();
        const lockIcon = new pixi.Text('🔒', {
          fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
          fontSize: 20,
          fill: 0xffffff,
          fontWeight: 700,
          align: 'center',
        });
        lockIcon.anchor.set(0.5, 0.5);

        shape.interactive = true;
        shape.cursor = 'pointer';
        shape.on('pointertap', () => {
          setPlotStates((previous) => {
            const current = previous[plotId];
            if (!current || !isUnlockedState(current)) return previous;
            const next = previous.slice();
            next[plotId] = cyclePlotState(current);
            return next;
          });
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

        container.addChild(shape, overlay, lockIcon);
        plotLayer.addChild(container);

        return {
          id: plotId,
          baseX: 0,
          baseY: 0,
          container,
          shape,
          overlay,
          lockIcon,
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
  }, []);

  return (
    <div className="min-h-dvh w-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 sm:py-7">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-700/80 bg-slate-900/75 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.55)] sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-wide text-slate-100 sm:text-xl">Pixi Farm Prototype • Step 1 + Step 2</h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              已接入完整背景与装饰（天空、太阳、云、草地、房屋、谷仓、栅栏、牛羊），保留 3x3 地块状态交互。
            </p>
          </div>
          <a
            className="inline-flex w-fit items-center rounded-full border border-slate-500/80 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-slate-300 hover:text-white"
            href="/"
          >
            Back To App
          </a>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <MetricCard title="Unlocked" value={String(unlockedCount)} suffix="plots" />
          <MetricCard title="Locked" value={String(lockedCount)} suffix="plots" />
          <MetricCard title="Hover" value={hoverEnabled ? 'ON' : 'OFF'} suffix={hoverEnabled ? hoveredStateLabel : 'coarse'} />
          <MetricCard title="Grid" value="3 x 3" suffix="isometric" />
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-2 sm:p-3">
          <div ref={mountRef} className="h-[360px] w-full rounded-2xl bg-slate-950 sm:h-[460px]" />
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
