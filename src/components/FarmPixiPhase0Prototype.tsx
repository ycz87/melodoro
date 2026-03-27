import { useEffect, useMemo, useRef, useState } from 'react';

type PlotState = 'empty' | 'sprout' | 'mature';

type PixiScaleLike = { set(x: number, y?: number): void };

type PixiDisplayObjectLike = {
  x: number;
  y: number;
  alpha: number;
  scale: PixiScaleLike;
};

type PixiContainerLike = PixiDisplayObjectLike & {
  addChild(...children: PixiDisplayObjectLike[]): void;
};

type PixiGraphicsLike = PixiDisplayObjectLike & {
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
  on(event: 'pointertap', fn: () => void): void;
};

type PixiRendererLike = {
  resize(width: number, height: number): void;
  render(displayObject: PixiContainerLike): void;
};

type PixiApplicationLike = {
  stage: PixiContainerLike;
  renderer: PixiRendererLike;
  view?: HTMLCanvasElement;
  destroy(removeView?: boolean, options?: { children?: boolean; texture?: boolean; baseTexture?: boolean }): void;
};

type PixiModuleLike = {
  Application: new (options: {
    width: number;
    height: number;
    antialias: boolean;
    autoDensity: boolean;
    resolution: number;
    backgroundAlpha: number;
  }) => PixiApplicationLike;
  Container: new () => PixiContainerLike;
  Graphics: new () => PixiGraphicsLike;
};

interface PlotNode {
  id: number;
  x: number;
  y: number;
  container: PixiContainerLike;
  baseShadow: PixiGraphicsLike;
  topFace: PixiGraphicsLike;
  rightFace: PixiGraphicsLike;
  leftFace: PixiGraphicsLike;
  cropLayer: PixiGraphicsLike;
  highlight: PixiGraphicsLike;
}

const PIXI_ESM_CDN_URL = 'https://cdn.jsdelivr.net/npm/pixi.js@7.4.3/dist/pixi.min.mjs';

const INITIAL_STATES: PlotState[] = [
  'empty',
  'sprout',
  'mature',
  'empty',
  'sprout',
  'mature',
  'mature',
];

const PHASE0_LAYOUT = [
  { x: 0, y: -2.32 },
  { x: -1.62, y: -1.1 },
  { x: 1.62, y: -1.1 },
  { x: 0, y: 0.2 },
  { x: -1.62, y: 1.5 },
  { x: 1.62, y: 1.5 },
  { x: 0, y: 2.84 },
] as const;

function isPixiModule(value: unknown): value is PixiModuleLike {
  if (!value || typeof value !== 'object') return false;
  const objectValue = value as Record<string, unknown>;
  return (
    typeof objectValue.Application === 'function' &&
    typeof objectValue.Container === 'function' &&
    typeof objectValue.Graphics === 'function'
  );
}

function nextState(state: PlotState): PlotState {
  if (state === 'empty') return 'sprout';
  if (state === 'sprout') return 'mature';
  return 'empty';
}

function drawBackground(layer: PixiGraphicsLike, width: number, height: number): void {
  const skyTop = 0x7dd3fc;
  const skyBottom = 0xdbeafe;
  const horizonY = Math.round(height * 0.42);
  const skyBands = 20;

  layer.clear();
  layer.lineStyle(0, 0x000000, 0);

  for (let i = 0; i < skyBands; i += 1) {
    const ratio = i / (skyBands - 1);
    const color = mixColor(skyTop, skyBottom, ratio);
    const y = Math.round((horizonY * i) / skyBands);
    const nextY = Math.round((horizonY * (i + 1)) / skyBands);
    layer.beginFill(color, 1);
    layer.drawRect(0, y, width, Math.max(2, nextY - y + 1));
    layer.endFill();
  }

  layer.beginFill(0x9dd76b, 1);
  layer.drawPolygon([
    0, horizonY + 12,
    width * 0.12, horizonY + 2,
    width * 0.3, horizonY + 18,
    width * 0.5, horizonY + 4,
    width * 0.68, horizonY + 14,
    width * 0.86, horizonY + 6,
    width, horizonY + 16,
    width, height,
    0, height,
  ]);
  layer.endFill();

  layer.beginFill(0x6faa45, 0.42);
  layer.drawEllipse(width * 0.5, height * 0.82, width * 0.48, height * 0.18);
  layer.endFill();
}

function mixColor(from: number, to: number, ratio: number): number {
  const r = Math.max(0, Math.min(1, ratio));
  const fr = (from >> 16) & 0xff;
  const fg = (from >> 8) & 0xff;
  const fb = from & 0xff;
  const tr = (to >> 16) & 0xff;
  const tg = (to >> 8) & 0xff;
  const tb = to & 0xff;
  const nr = Math.round(fr + (tr - fr) * r);
  const ng = Math.round(fg + (tg - fg) * r);
  const nb = Math.round(fb + (tb - fb) * r);
  return (nr << 16) | (ng << 8) | nb;
}

function drawPlot(node: PlotNode, state: PlotState, selected: boolean, halfW: number, halfH: number, depth: number): void {
  node.baseShadow.clear();
  node.baseShadow.beginFill(0x1f2937, selected ? 0.28 : 0.2);
  node.baseShadow.drawEllipse(0, halfH + depth + 7, halfW * 0.8, halfH * 0.36);
  node.baseShadow.endFill();

  node.leftFace.clear();
  node.leftFace.lineStyle(1.5, 0x5b371f, 0.78);
  node.leftFace.beginFill(0x9a6034, 1);
  node.leftFace.drawPolygon([
    -halfW, 0,
    0, halfH,
    0, halfH + depth,
    -halfW, depth,
  ]);
  node.leftFace.endFill();

  node.rightFace.clear();
  node.rightFace.lineStyle(1.5, 0x5b371f, 0.78);
  node.rightFace.beginFill(0x7e4e2b, 1);
  node.rightFace.drawPolygon([
    0, halfH,
    halfW, 0,
    halfW, depth,
    0, halfH + depth,
  ]);
  node.rightFace.endFill();

  node.topFace.clear();
  node.topFace.lineStyle(selected ? 2.8 : 1.8, selected ? 0xfef08a : 0x704223, selected ? 0.96 : 0.86);
  node.topFace.beginFill(0xc68b57, 1);
  node.topFace.drawPolygon([
    0, -halfH,
    halfW, 0,
    0, halfH,
    -halfW, 0,
  ]);
  node.topFace.endFill();

  node.cropLayer.clear();
  if (state === 'sprout') {
    node.cropLayer.lineStyle(2, 0x166534, 0.98);
    node.cropLayer.beginFill(0x16a34a, 1);
    node.cropLayer.drawPolygon([
      0, halfH * 0.2,
      0, -halfH * 0.26,
      halfW * 0.24, -halfH * 0.02,
      halfW * 0.04, halfH * 0.16,
    ]);
    node.cropLayer.drawPolygon([
      0, halfH * 0.2,
      0, -halfH * 0.28,
      -halfW * 0.24, halfH * 0.02,
      -halfW * 0.04, halfH * 0.16,
    ]);
    node.cropLayer.endFill();
  }

  if (state === 'mature') {
    const melonPositions = [
      { x: -halfW * 0.2, y: halfH * 0.05, r: 1 },
      { x: halfW * 0.04, y: -halfH * 0.06, r: 1.08 },
      { x: halfW * 0.23, y: halfH * 0.08, r: 0.94 },
      { x: halfW * 0.03, y: halfH * 0.18, r: 0.78 },
    ] as const;
    for (const melon of melonPositions) {
      const radius = Math.max(4, halfW * 0.1 * melon.r);
      node.cropLayer.lineStyle(1.4, 0x14532d, 0.92);
      node.cropLayer.beginFill(0x22c55e, 1);
      node.cropLayer.drawCircle(melon.x, melon.y, radius);
      node.cropLayer.endFill();

      node.cropLayer.lineStyle(1.2, 0x14532d, 0.74);
      node.cropLayer.beginFill(0x86efac, 0.22);
      node.cropLayer.drawCircle(melon.x - radius * 0.24, melon.y - radius * 0.22, radius * 0.34);
      node.cropLayer.endFill();

      node.cropLayer.moveTo(melon.x - radius * 0.54, melon.y - radius * 0.68);
      node.cropLayer.lineTo(melon.x - radius * 0.14, melon.y + radius * 0.7);
      node.cropLayer.moveTo(melon.x - radius * 0.06, melon.y - radius * 0.72);
      node.cropLayer.lineTo(melon.x + radius * 0.34, melon.y + radius * 0.66);
    }
  }

  node.highlight.clear();
  node.highlight.alpha = selected ? 1 : 0;
  if (selected) {
    node.highlight.lineStyle(2.6, 0xfef08a, 0.85);
    node.highlight.drawPolygon([
      0, -halfH - 2,
      halfW + 2, 0,
      0, halfH + 2,
      -halfW - 2, 0,
    ]);
  }
}

export function FarmPixiPhase0Prototype() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PixiApplicationLike | null>(null);
  const nodesRef = useRef<PlotNode[]>([]);
  const requestRenderRef = useRef<(() => void) | null>(null);

  const [plotStates, setPlotStates] = useState<PlotState[]>(INITIAL_STATES);
  const [selectedPlot, setSelectedPlot] = useState<number>(0);
  const [statusText, setStatusText] = useState('Loading Pixi runtime...');
  const [errorText, setErrorText] = useState('');
  const plotStatesRef = useRef<PlotState[]>(INITIAL_STATES);
  const selectedPlotRef = useRef(0);

  const selectedState = useMemo(() => plotStates[selectedPlot] ?? 'empty', [plotStates, selectedPlot]);

  useEffect(() => {
    plotStatesRef.current = plotStates;
    selectedPlotRef.current = selectedPlot;
  }, [plotStates, selectedPlot]);

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    const mountElement = mountRef.current;

    const boot = async () => {
      try {
        const pixiUnknown: unknown = await import(/* @vite-ignore */ PIXI_ESM_CDN_URL);
        if (!isPixiModule(pixiUnknown)) {
          throw new Error('Pixi module shape is invalid');
        }

        if (disposed) return;

        const host = mountElement;
        if (!host) return;

        const width = Math.max(320, host.clientWidth || 320);
        const height = Math.max(340, host.clientHeight || 460);

        const app = new pixiUnknown.Application({
          width,
          height,
          antialias: true,
          autoDensity: true,
          resolution: Math.min(1.6, window.devicePixelRatio || 1),
          backgroundAlpha: 0,
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

        const scene = new pixiUnknown.Container();
        const background = new pixiUnknown.Graphics();
        const plotLayer = new pixiUnknown.Container();
        scene.addChild(background, plotLayer);
        app.stage.addChild(scene);

        const nodes: PlotNode[] = PHASE0_LAYOUT.map((_, id) => {
          const container = new pixiUnknown.Container();
          const baseShadow = new pixiUnknown.Graphics();
          const leftFace = new pixiUnknown.Graphics();
          const rightFace = new pixiUnknown.Graphics();
          const topFace = new pixiUnknown.Graphics();
          const cropLayer = new pixiUnknown.Graphics();
          const highlight = new pixiUnknown.Graphics();

          topFace.interactive = true;
          topFace.cursor = 'pointer';
          topFace.on('pointertap', () => {
            setSelectedPlot(id);
            setPlotStates((prev) => {
              const next = prev.slice();
              next[id] = nextState(prev[id] ?? 'empty');
              return next;
            });
          });

          container.addChild(baseShadow, leftFace, rightFace, topFace, cropLayer, highlight);
          plotLayer.addChild(container);

          return {
            id,
            x: 0,
            y: 0,
            container,
            baseShadow,
            topFace,
            rightFace,
            leftFace,
            cropLayer,
            highlight,
          };
        });

        nodesRef.current = nodes;

        const render = () => {
          const currentWidth = Math.max(320, host.clientWidth || 320);
          const currentHeight = Math.max(340, host.clientHeight || 460);
          app.renderer.resize(currentWidth, currentHeight);

          drawBackground(background, currentWidth, currentHeight);

          const halfW = Math.max(34, Math.min(74, currentWidth * 0.09));
          const halfH = Math.round(halfW * 0.54);
          const depth = Math.max(14, Math.round(halfH * 0.62));
          const stageX = Math.round(currentWidth * 0.5);
          const stageY = Math.round(currentHeight * 0.56);

          for (const node of nodes) {
            const mapPoint = PHASE0_LAYOUT[node.id];
            node.x = Math.round(stageX + mapPoint.x * halfW * 1.08);
            node.y = Math.round(stageY + mapPoint.y * halfH * 1.12);
            node.container.x = node.x;
            node.container.y = node.y;

            const plotState = plotStatesRef.current[node.id] ?? 'empty';
            drawPlot(node, plotState, selectedPlotRef.current === node.id, halfW, halfH, depth);
          }

          app.renderer.render(app.stage);
        };

        requestRenderRef.current = render;
        render();

        resizeObserver = new ResizeObserver(render);
        resizeObserver.observe(host);

        setStatusText('Ready');
        setErrorText('');
      } catch (error) {
        if (disposed) return;
        const text = error instanceof Error ? error.message : String(error);
        setStatusText('Error');
        setErrorText(text);
      }
    };

    void boot();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      appRef.current?.destroy(true, { children: true, texture: true, baseTexture: true });
      appRef.current = null;
      nodesRef.current = [];
      requestRenderRef.current = null;
      if (mountElement) {
        mountElement.innerHTML = '';
      }
    };
  }, []);

  useEffect(() => {
    requestRenderRef.current?.();
  }, [plotStates, selectedPlot]);

  return (
    <div className="min-h-dvh w-full bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 sm:py-7">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-700/70 bg-slate-900/80 p-4 shadow-[0_18px_70px_rgba(15,23,42,0.45)] sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-wide sm:text-xl">Farm v3 Pixi 2.5D phase-0 prototype</h1>
            <p className="text-xs text-slate-400 sm:text-sm">7 plots / mixed states / tap-to-cycle(empty → sprout → mature)</p>
          </div>
          <a
            className="inline-flex w-fit items-center rounded-full border border-slate-500/80 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-slate-300 hover:text-white"
            href="/"
          >
            Back To App
          </a>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Selected Plot</p>
            <p className="mt-1 text-lg font-semibold">#{selectedPlot + 1}</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">State</p>
            <p className="mt-1 text-lg font-semibold uppercase">{selectedState}</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Scene</p>
            <p className="mt-1 text-lg font-semibold">7 plots</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-800/70 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Runtime</p>
            <p className="mt-1 text-lg font-semibold">{statusText}</p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-2 sm:p-3">
          <div ref={mountRef} className="h-[360px] w-full rounded-2xl bg-slate-950 sm:h-[460px]" />
        </div>

        {errorText && (
          <p className="mt-3 rounded-xl border border-red-500/60 bg-red-900/30 px-3 py-2 text-xs text-red-200">
            Pixi prototype failed to initialize: {errorText}
          </p>
        )}
      </div>
    </div>
  );
}
