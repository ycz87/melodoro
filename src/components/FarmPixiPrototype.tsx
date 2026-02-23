/**
 * FarmPixiPrototype — Phase 0 Pixi.js 技术样机（0.1 ~ 0.3）
 *
 * 独立演示内容：
 * 1) 2.5D 等距地块（厚度 + 阴影 + 卡通描边）
 * 2) 三状态交互（empty / growing / mature，点击切换，hover 反馈）
 * 3) 页面内性能读数（Desktop FPS / Mobile FPS 模拟 / 首屏加载毫秒）
 *
 * 说明：
 * - 当前运行环境无法安装 npm 新包，因此此样机通过 CDN 动态加载 pixi.js。
 * - 默认业务页面不受影响，只有进入 prototype 入口才会渲染该组件。
 */
import { useEffect, useMemo, useRef, useState } from 'react';

type PlotState = 'empty' | 'growing' | 'mature';
type PrototypeStatus = 'loading' | 'ready' | 'error';
type DeviceTier = 'low' | 'mid' | 'high';

interface PerformanceSnapshot {
  desktopFps: number;
  mobileFpsSimulated: number;
  firstPaintMs: number;
  sampledFrames: number;
  qualityTier: DeviceTier;
  renderResolution: number;
}

interface PlotPalette {
  top: number;
  left: number;
  right: number;
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
  cacheAsBitmap: boolean;
}

interface PixiContainerLike extends PixiDisplayObjectLike {
  addChild(...children: PixiDisplayObjectLike[]): void;
}

interface PixiGraphicsLike extends PixiDisplayObjectLike {
  clear(): PixiGraphicsLike;
  lineStyle(width: number, color: number, alpha?: number): PixiGraphicsLike;
  beginFill(color: number, alpha?: number): PixiGraphicsLike;
  drawPolygon(path: number[]): PixiGraphicsLike;
  drawEllipse(x: number, y: number, width: number, height: number): PixiGraphicsLike;
  endFill(): PixiGraphicsLike;
  interactive: boolean;
  cursor: string;
  on(event: 'pointertap' | 'pointerover' | 'pointerout', fn: () => void): void;
}

interface PixiTextLike extends PixiDisplayObjectLike {
  text: string;
  anchor: { set(x: number, y?: number): void };
  style?: Partial<PixiTextStyleLike>;
}

interface PixiTickerLike {
  add(fn: (deltaTime: number) => void): void;
  remove(fn: (deltaTime: number) => void): void;
}

interface PixiRendererLike {
  resolution: number;
  resize(width: number, height: number): void;
  render(displayObject: PixiContainerLike): void;
}

interface PixiApplicationLike {
  stage: PixiContainerLike;
  ticker: PixiTickerLike;
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
  dropShadow?: boolean;
  dropShadowColor?: string;
  dropShadowBlur?: number;
  dropShadowDistance?: number;
  align?: 'left' | 'center' | 'right';
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
}

interface RenderPlot {
  id: number;
  baseX: number;
  baseY: number;
  container: PixiContainerLike;
  shape: PixiGraphicsLike;
  label: PixiTextLike;
}

interface DeviceRenderStrategy {
  tier: DeviceTier;
  antialias: boolean;
  resolution: number;
  coarsePointer: boolean;
}

const PIXI_CDN_URL = 'https://cdn.jsdelivr.net/npm/pixi.js@7.4.3/dist/pixi.min.mjs';
const DESKTOP_SAMPLE_SIZE = 180;
const MOBILE_CPU_FACTOR = 2.2;
const MOBILE_GPU_PENALTY_MS = 4;
const MAX_RENDER_RESOLUTION = 1.25;
const MID_RENDER_RESOLUTION = 1;
const LOW_RENDER_RESOLUTION = 0.9;
const MIN_RENDER_RESOLUTION = 0.75;
const LOW_RESOLUTION_STEP = 0.075;
const DESKTOP_SLOW_RENDER_COST_MS = 15;
const MOBILE_SLOW_RENDER_COST_MS = 13;
const SLOW_RENDER_STREAK_FOR_DOWNGRADE = 3;

const PLOT_POSITIONS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0, y: 0 },
  { x: -128, y: 80 },
  { x: 128, y: 80 },
];

const PLOT_PALETTES: Record<PlotState, PlotPalette> = {
  empty: { top: 0xe6c79f, left: 0xbc8d61, right: 0x9c704a, label: 'EMPTY' },
  growing: { top: 0x88d86f, left: 0x53ae47, right: 0x3a8a38, label: 'GROW' },
  mature: { top: 0xf9d465, left: 0xe0ad2a, right: 0xc98717, label: 'MATURE' },
};

function isPixiModule(value: unknown): value is PixiModuleLike {
  if (!value || typeof value !== 'object') return false;
  const objectValue = value as Record<string, unknown>;
  return (
    typeof objectValue.Application === 'function' &&
    typeof objectValue.Container === 'function' &&
    typeof objectValue.Graphics === 'function' &&
    typeof objectValue.Text === 'function'
  );
}

function cyclePlotState(current: PlotState): PlotState {
  if (current === 'empty') return 'growing';
  if (current === 'growing') return 'mature';
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

function drawPlot(plot: RenderPlot, state: PlotState, hovered: boolean, tier: DeviceTier, hoverEnabled: boolean): void {
  const halfWidth = 90;
  const halfHeight = 44;
  const thickness = 20;
  const palette = PLOT_PALETTES[state];
  const simplified = tier === 'low';
  const isHoverActive = hoverEnabled && hovered && !simplified;
  const borderColor = hovered ? 0x59391f : 0x6f4725;
  const topColor = isHoverActive ? lightenColor(palette.top, 0.18) : palette.top;
  const hoverLift = isHoverActive ? -6 : 0;
  const hoverScale = isHoverActive ? 1.05 : 1;

  plot.container.y = plot.baseY + hoverLift;
  plot.container.scale.set(hoverScale);

  plot.shape.clear();

  if (!simplified) {
    // Ground shadow to strengthen depth cue.
    plot.shape.beginFill(0x0f172a, hovered ? 0.24 : 0.18);
    plot.shape.drawEllipse(0, halfHeight + thickness + 12, halfWidth * 0.82, 16);
    plot.shape.endFill();
  }

  // Left side wall.
  plot.shape.lineStyle(simplified ? 1 : 2, borderColor, simplified ? 0.45 : 1);
  plot.shape.beginFill(palette.left, 1);
  plot.shape.drawPolygon([
    -halfWidth, 0,
    0, halfHeight,
    0, halfHeight + thickness,
    -halfWidth, thickness,
  ]);
  plot.shape.endFill();

  // Right side wall.
  plot.shape.lineStyle(simplified ? 1 : 2, borderColor, simplified ? 0.45 : 1);
  plot.shape.beginFill(palette.right, 1);
  plot.shape.drawPolygon([
    0, halfHeight,
    halfWidth, 0,
    halfWidth, thickness,
    0, halfHeight + thickness,
  ]);
  plot.shape.endFill();

  // Top face.
  plot.shape.lineStyle(simplified ? 2 : hovered ? 4 : 3, borderColor, simplified ? 0.75 : 1);
  plot.shape.beginFill(topColor, 1);
  plot.shape.drawPolygon([
    0, -halfHeight,
    halfWidth, 0,
    0, halfHeight,
    -halfWidth, 0,
  ]);
  plot.shape.endFill();

  if (!simplified) {
    // Cartoon highlight band on top face.
    plot.shape.beginFill(0xffffff, hovered ? 0.26 : 0.17);
    plot.shape.drawPolygon([
      -halfWidth * 0.38, -halfHeight * 0.02,
      0, -halfHeight * 0.45,
      halfWidth * 0.38, -halfHeight * 0.02,
      0, halfHeight * 0.22,
    ]);
    plot.shape.endFill();
  }

  plot.label.text = palette.label;
  plot.label.alpha = simplified ? 0.9 : hovered ? 0.98 : 0.88;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '--';
  return value.toFixed(1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveResolutionForTier(tier: DeviceTier, cappedDpr: number): number {
  if (tier === 'high') return cappedDpr;
  if (tier === 'mid') return Math.min(MID_RENDER_RESOLUTION, cappedDpr);
  return Math.min(LOW_RENDER_RESOLUTION, cappedDpr);
}

function resolveLowerTier(current: DeviceTier): DeviceTier {
  if (current === 'high') return 'mid';
  return 'low';
}

function resolveDeviceRenderStrategy(): DeviceRenderStrategy {
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  const deviceMemory = navigatorWithMemory.deviceMemory ?? 4;
  const cpuCores = navigator.hardwareConcurrency ?? 4;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const compactViewport = Math.min(window.innerWidth, window.innerHeight) < 820;
  const likelyMobile = coarsePointer || compactViewport;

  let tier: DeviceTier = 'mid';
  if (deviceMemory <= 4 || cpuCores <= 4 || likelyMobile) {
    tier = 'low';
  } else if (deviceMemory >= 8 && cpuCores >= 8 && !likelyMobile) {
    tier = 'high';
  }

  const cappedDpr = clamp(window.devicePixelRatio || 1, MIN_RENDER_RESOLUTION, MAX_RENDER_RESOLUTION);
  const resolution = resolveResolutionForTier(tier, cappedDpr);

  // Default keeps antialias disabled and only enables it for clear high-end desktop profile.
  const antialias = tier === 'high' && !likelyMobile && cappedDpr <= 1.1;

  return { tier, antialias, resolution, coarsePointer };
}

export function FarmPixiPrototype() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PixiApplicationLike | null>(null);
  const plotObjectsRef = useRef<RenderPlot[]>([]);
  const renderRequestIdRef = useRef<number | null>(null);
  const isRenderQueuedRef = useRef(false);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const currentResolutionRef = useRef(LOW_RENDER_RESOLUTION);
  const currentTierRef = useRef<DeviceTier>('mid');
  const viewportSizeRef = useRef({ width: 360, height: 420 });

  const [plotStates, setPlotStates] = useState<PlotState[]>(['empty', 'growing', 'mature']);
  const [hoveredPlotId, setHoveredPlotId] = useState<number | null>(null);
  const [hoverEnabled, setHoverEnabled] = useState(true);
  const [status, setStatus] = useState<PrototypeStatus>('loading');
  const [errorText, setErrorText] = useState('');
  const [metrics, setMetrics] = useState<PerformanceSnapshot>({
    desktopFps: 0,
    mobileFpsSimulated: 0,
    firstPaintMs: 0,
    sampledFrames: 0,
    qualityTier: 'mid',
    renderResolution: LOW_RENDER_RESOLUTION,
  });

  const hoveredStateLabel = useMemo(() => {
    if (hoveredPlotId === null) return 'NONE';
    return PLOT_PALETTES[plotStates[hoveredPlotId] ?? 'empty'].label;
  }, [hoveredPlotId, plotStates]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const initStart = performance.now();

    const setupPrototype = async () => {
      try {
        const pixiUnknown: unknown = await import(/* @vite-ignore */ PIXI_CDN_URL);
        if (cancelled) return;
        if (!isPixiModule(pixiUnknown)) {
          throw new Error('Pixi CDN module shape is invalid');
        }
        const pixi = pixiUnknown;
        const host = mountRef.current;
        if (!host) return;
        const renderStrategy = resolveDeviceRenderStrategy();
        currentResolutionRef.current = renderStrategy.resolution;
        currentTierRef.current = renderStrategy.tier;
        setHoverEnabled(!renderStrategy.coarsePointer);
        setHoveredPlotId(null);
        setMetrics((current) => ({
          ...current,
          qualityTier: renderStrategy.tier,
          renderResolution: renderStrategy.resolution,
        }));

        const app = new pixi.Application({
          width: Math.max(360, host.clientWidth || 360),
          height: 420,
          antialias: renderStrategy.antialias,
          autoDensity: true,
          resolution: renderStrategy.resolution,
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

        const stage = new pixi.Container();
        stage.x = app.screen.width / 2;
        stage.y = Math.max(120, app.screen.height * 0.28);
        app.stage.addChild(stage);

        const staticLayer = new pixi.Container();
        const dynamicLayer = new pixi.Container();
        stage.addChild(staticLayer, dynamicLayer);

        const horizonGlow = new pixi.Graphics();
        horizonGlow.beginFill(0x7dd3fc, 0.14);
        horizonGlow.drawEllipse(0, -116, 220, 72);
        horizonGlow.endFill();

        const terrainShadow = new pixi.Graphics();
        terrainShadow.beginFill(0x020617, 0.24);
        terrainShadow.drawEllipse(0, 150, 300, 56);
        terrainShadow.endFill();

        staticLayer.addChild(horizonGlow, terrainShadow);

        const shouldUseTextShadow = (tier: DeviceTier) => !renderStrategy.coarsePointer && tier !== 'low';
        const textShadowEnabled = shouldUseTextShadow(renderStrategy.tier);
        const title = new pixi.Text('PIXI FARM PROTOTYPE', {
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: 18,
          fill: 0xe2e8f0,
          fontWeight: 700,
          align: 'center',
          dropShadow: textShadowEnabled,
          dropShadowColor: '#0f172a',
          dropShadowDistance: textShadowEnabled ? 2 : 0,
          dropShadowBlur: textShadowEnabled ? 2 : 0,
        });
        title.anchor.set(0.5, 0);
        title.y = -90;
        staticLayer.addChild(title);

        const applyTextEffects = (tier: DeviceTier) => {
          const enableShadow = shouldUseTextShadow(tier);
          if (title.style) {
            title.style.dropShadow = enableShadow;
            title.style.dropShadowDistance = enableShadow ? 2 : 0;
            title.style.dropShadowBlur = enableShadow ? 2 : 0;
          }

          for (const plot of plotObjectsRef.current) {
            if (!plot.label.style) continue;
            plot.label.style.dropShadow = enableShadow;
            plot.label.style.dropShadowDistance = enableShadow ? 1 : 0;
            plot.label.style.dropShadowBlur = enableShadow ? 1 : 0;
          }
        };

        const refreshStaticCache = () => {
          staticLayer.cacheAsBitmap = false;
          staticLayer.cacheAsBitmap = true;
        };

        const frameDurations: number[] = [];
        let frameDurationSum = 0;
        let sampledFrames = 0;
        let slowRenderStreak = 0;
        let firstPaintRecorded = false;
        const slowRenderCostMs = renderStrategy.coarsePointer ? MOBILE_SLOW_RENDER_COST_MS : DESKTOP_SLOW_RENDER_COST_MS;

        const applyRenderResolution = (nextResolution: number) => {
          const normalized = clamp(nextResolution, MIN_RENDER_RESOLUTION, MAX_RENDER_RESOLUTION);
          if (Math.abs(normalized - currentResolutionRef.current) < 0.001) return false;
          currentResolutionRef.current = normalized;
          app.renderer.resolution = normalized;
          app.renderer.resize(viewportSizeRef.current.width, viewportSizeRef.current.height);
          refreshStaticCache();
          setMetrics((current) => ({
            ...current,
            renderResolution: normalized,
          }));
          requestRenderRef.current?.();
          return true;
        };

        const applyQualityTier = (nextTier: DeviceTier) => {
          if (currentTierRef.current === nextTier) return false;
          currentTierRef.current = nextTier;
          const nextResolution = resolveResolutionForTier(
            nextTier,
            clamp(window.devicePixelRatio || 1, MIN_RENDER_RESOLUTION, MAX_RENDER_RESOLUTION),
          );
          applyTextEffects(nextTier);
          applyRenderResolution(nextResolution);
          setMetrics((current) => ({
            ...current,
            qualityTier: nextTier,
            renderResolution: nextResolution,
          }));
          return true;
        };

        const applyRuntimeDowngrade = () => {
          const currentTier = currentTierRef.current;
          if (currentTier !== 'low') {
            return applyQualityTier(resolveLowerTier(currentTier));
          }

          const nextLowResolution = clamp(currentResolutionRef.current - LOW_RESOLUTION_STEP, MIN_RENDER_RESOLUTION, LOW_RENDER_RESOLUTION);
          return applyRenderResolution(nextLowResolution);
        };

        const renderNow = () => {
          if (cancelled) return;

          const renderStart = performance.now();
          app.renderer.render(app.stage);
          const frameDuration = performance.now() - renderStart;

          if (!firstPaintRecorded) {
            firstPaintRecorded = true;
            setMetrics((current) => ({
              ...current,
              firstPaintMs: performance.now() - initStart,
            }));
          }

          if (frameDuration > 0 && frameDuration < 1000) {
            frameDurations.push(frameDuration);
            frameDurationSum += frameDuration;
            if (frameDurations.length > DESKTOP_SAMPLE_SIZE) {
              const removed = frameDurations.shift();
              if (removed !== undefined) {
                frameDurationSum -= removed;
              }
            }
          }

          if (frameDuration >= slowRenderCostMs) {
            slowRenderStreak += 1;
          } else {
            slowRenderStreak = Math.max(0, slowRenderStreak - 1);
          }

          if (slowRenderStreak >= SLOW_RENDER_STREAK_FOR_DOWNGRADE) {
            const downgraded = applyRuntimeDowngrade();
            slowRenderStreak = downgraded ? 0 : Math.max(1, slowRenderStreak - 1);
          }

          sampledFrames += 1;
          if (frameDurations.length >= 8 && sampledFrames % 8 === 0) {
            const avgDesktopFrameMs = frameDurationSum / frameDurations.length;
            const desktopFps = 1000 / avgDesktopFrameMs;
            const mobileFrameMs = avgDesktopFrameMs * MOBILE_CPU_FACTOR + MOBILE_GPU_PENALTY_MS;
            const mobileFps = 1000 / mobileFrameMs;
            setMetrics((current) => ({
              ...current,
              desktopFps,
              mobileFpsSimulated: mobileFps,
              sampledFrames,
            }));
          }
        };

        const requestRender = () => {
          if (cancelled || isRenderQueuedRef.current) return;
          isRenderQueuedRef.current = true;
          renderRequestIdRef.current = window.requestAnimationFrame(() => {
            isRenderQueuedRef.current = false;
            renderRequestIdRef.current = null;
            renderNow();
          });
        };
        requestRenderRef.current = requestRender;

        const renderPlots = PLOT_POSITIONS.map((position, index) => {
          const container = new pixi.Container();
          container.x = position.x;
          container.y = position.y;

          const shape = new pixi.Graphics();
          shape.interactive = true;
          shape.cursor = 'pointer';
          shape.on('pointertap', () => {
            setPlotStates((previous) => previous.map((value, i) => (i === index ? cyclePlotState(value) : value)));
          });
          if (!renderStrategy.coarsePointer) {
            shape.on('pointerover', () => {
              setHoveredPlotId((current) => (current === index ? current : index));
            });
            shape.on('pointerout', () => {
              setHoveredPlotId((current) => (current === index ? null : current));
            });
          }

          const label = new pixi.Text(PLOT_PALETTES.empty.label, {
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 16,
            fill: 0x0f172a,
            fontWeight: 700,
            dropShadow: textShadowEnabled,
            dropShadowColor: '#ffffff',
            dropShadowDistance: textShadowEnabled ? 1 : 0,
          });
          label.anchor.set(0.5, 0.5);
          label.y = 4;

          container.addChild(shape, label);
          dynamicLayer.addChild(container);

          return {
            id: index,
            baseX: position.x,
            baseY: position.y,
            container,
            shape,
            label,
          } satisfies RenderPlot;
        });
        plotObjectsRef.current = renderPlots;
        applyTextEffects(currentTierRef.current);
        const initialStates: PlotState[] = ['empty', 'growing', 'mature'];
        for (const plot of renderPlots) {
          drawPlot(plot, initialStates[plot.id] ?? 'empty', false, currentTierRef.current, !renderStrategy.coarsePointer);
        }
        refreshStaticCache();

        const resize = () => {
          const nextWidth = Math.max(360, host.clientWidth || 360);
          const nextHeight = window.innerWidth < 768 ? 360 : 440;
          viewportSizeRef.current = { width: nextWidth, height: nextHeight };
          app.renderer.resize(nextWidth, nextHeight);
          stage.x = nextWidth / 2;
          stage.y = Math.max(120, nextHeight * 0.28);
          refreshStaticCache();
          requestRender();
        };
        resize();
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        requestRender();
        setStatus('ready');
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        if (error instanceof Error) {
          setErrorText(error.message);
        } else {
          setErrorText('Unknown Pixi setup error');
        }
      }
    };

    void setupPrototype();

    return () => {
      cancelled = true;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (renderRequestIdRef.current !== null) {
        window.cancelAnimationFrame(renderRequestIdRef.current);
        renderRequestIdRef.current = null;
      }
      isRenderQueuedRef.current = false;
      requestRenderRef.current = null;
      appRef.current?.destroy(true, { children: true, texture: true, baseTexture: true });
      appRef.current = null;
      currentResolutionRef.current = LOW_RENDER_RESOLUTION;
      currentTierRef.current = 'mid';
      plotObjectsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const plots = plotObjectsRef.current;
    if (plots.length === 0) return;
    const activeHoveredPlotId = hoverEnabled ? hoveredPlotId : null;

    for (const plot of plots) {
      plot.container.x = plot.baseX;
      drawPlot(plot, plotStates[plot.id] ?? 'empty', activeHoveredPlotId === plot.id, metrics.qualityTier, hoverEnabled);
    }
    requestRenderRef.current?.();
  }, [hoverEnabled, hoveredPlotId, metrics.qualityTier, plotStates]);

  return (
    <div className="min-h-dvh w-full bg-slate-950 text-slate-100 px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-700/80 bg-slate-900/75 p-4 shadow-[0_20px_80px_rgba(15,23,42,0.55)] backdrop-blur-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-wide text-slate-100 sm:text-xl">Phase 0 • Pixi.js Farm Prototype</h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              Click plots to cycle state ({' '}
              <span className="font-semibold text-amber-300">empty</span> →{' '}
              <span className="font-semibold text-emerald-300">growing</span> →{' '}
              <span className="font-semibold text-yellow-300">mature</span> ),{' '}
              {hoverEnabled ? 'hover for lift feedback.' : 'coarse pointer mode disables hover feedback.'}
            </p>
          </div>
          <a
            className="inline-flex w-fit items-center rounded-full border border-slate-500/80 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-slate-300 hover:text-white"
            href="/"
          >
            Back To App
          </a>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <MetricCard title="Desktop FPS" value={formatNumber(metrics.desktopFps)} suffix="fps" />
          <MetricCard title="Mobile FPS (sim)" value={formatNumber(metrics.mobileFpsSimulated)} suffix="fps" />
          <MetricCard
            title="Quality Tier"
            value={metrics.qualityTier.toUpperCase()}
            suffix={`${formatNumber(metrics.renderResolution)}x`}
          />
          <MetricCard title="First Paint" value={formatNumber(metrics.firstPaintMs)} suffix="ms" />
          <MetricCard title="Samples" value={String(metrics.sampledFrames)} suffix="frames" />
        </div>

        <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-300">
          <p>
            Sampling formula: desktop FPS uses rolling render-cost average; mobile simulation uses{' '}
            <code className="rounded bg-slate-700 px-1">mobileFrameMs = desktopFrameMs * {MOBILE_CPU_FACTOR} + {MOBILE_GPU_PENALTY_MS}ms</code>.
          </p>
          <p className="mt-1 text-slate-400">
            Runtime downgrade: high → mid → low tier, then low tier resolution floors at {MIN_RENDER_RESOLUTION}x.
          </p>
          <p className="mt-1 text-slate-400">Hover Plot State: {hoverEnabled ? hoveredStateLabel : 'DISABLED'}</p>
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-700 bg-[linear-gradient(160deg,#0f172a_0%,#1e293b_45%,#0b1325_100%)] p-2 sm:p-3">
          <div
            ref={mountRef}
            className="h-[360px] w-full rounded-2xl bg-[radial-gradient(circle_at_50%_16%,rgba(148,197,255,0.28),transparent_45%),linear-gradient(180deg,rgba(125,211,252,0.18),rgba(56,189,248,0.05)_32%,rgba(2,6,23,0.46))]"
          />
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
