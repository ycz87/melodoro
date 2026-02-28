import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { chromium } from 'playwright';

const DEFAULT_TASK_ID = 'E-001-T02';
const ROOT_DIR = '/home/ycz87/.openclaw/workspace-coder/cosmelon';
const BASELINE_DIR = path.join(ROOT_DIR, 'baseline', 'e001-t01');
const E001_T12_REFERENCE_PATH = '/home/ycz87/.openclaw/media/inbound/file_21---3f96fab5-a32c-497b-ad28-95a0ff5ead39.jpg';
const DEV_SERVER_PORT = 4173;
const DEV_SERVER_URL = `http://127.0.0.1:${DEV_SERVER_PORT}`;

const viewports = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'mobile', width: 390, height: 640 },
  { name: 'detail', width: 1024, height: 1024 },
];

function parseTaskIdFromArgs() {
  const arg = process.argv.find((item) => item.startsWith('--task-id='));
  if (!arg) {
    return DEFAULT_TASK_ID;
  }
  const value = arg.slice('--task-id='.length).trim();
  if (!value) {
    return DEFAULT_TASK_ID;
  }
  return value.toUpperCase();
}

function toTaskSlug(taskId) {
  return taskId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function buildRunId(now = new Date()) {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}Z`;
}

function ensureFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }
}

async function waitForDevServer(url, timeoutMs = 30_000) {
  const startAt = Date.now();
  while (Date.now() - startAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep waiting until dev server is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Dev server did not become ready within ${timeoutMs}ms: ${url}`);
}

function seedFarmStateScript(taskId) {
  return () => {
    const now = Date.UTC(2026, 1, 24, 12, 0, 0, 0);
    const day = new Date(now).toISOString().slice(0, 10);
    const isT11 = taskId === 'E-001-T11';
    const isT12 = taskId === 'E-001-T12';
    const isT13 = taskId === 'E-001-T13';
    const isT14 = taskId === 'E-001-T14';
    const isT15 = taskId === 'E-001-T15';
    const plotCount = isT11 ? 7 : (isT12 || isT13 || isT14 || isT15) ? 9 : 4;
    const basePlots = Array.from({ length: plotCount }, (_, id) => ({
      id,
      state: 'empty',
      progress: 0,
      mutationStatus: 'none',
      mutationChance: 0.02,
      isMutant: false,
      accumulatedMinutes: 0,
      lastActivityTimestamp: 0,
      hasTracker: false,
    }));

    const plots = isT11
      ? basePlots.map((plot, index) => {
        if (index === 2 || index === 3 || index === 6) {
          return {
            ...plot,
            state: 'mature',
            progress: 1,
            varietyId: 'jade-stripe',
            seedQuality: 'normal',
            plantedDate: day,
            lastUpdateDate: day,
          };
        }
        if (index === 1 || index === 5) {
          return {
            ...plot,
            state: 'growing',
            progress: 0.46,
            accumulatedMinutes: 4600,
            varietyId: 'jade-stripe',
            seedQuality: 'normal',
            plantedDate: day,
            lastUpdateDate: day,
          };
        }
        return plot;
      })
      : (isT12 || isT14 || isT15)
        ? basePlots.map((plot, index) => {
          const matureIndexes = (isT14 || isT15) ? [2, 5, 8] : [2, 3, 6, 8];
          const growingIndexes = [1, 4, 7];

          if (matureIndexes.includes(index)) {
            return {
              ...plot,
              state: 'mature',
              progress: 1,
              varietyId: 'jade-stripe',
              seedQuality: 'normal',
              plantedDate: day,
              lastUpdateDate: day,
            };
          }
          if (growingIndexes.includes(index)) {
            return {
              ...plot,
              state: 'growing',
              progress: 0.46,
              accumulatedMinutes: 4600,
              varietyId: 'jade-stripe',
              seedQuality: 'normal',
              plantedDate: day,
              lastUpdateDate: day,
            };
          }
          return plot;
        })
        : basePlots;

    localStorage.clear();
    localStorage.setItem('pomodoro-guide-seen', '1');
    localStorage.setItem('pomodoro-settings', JSON.stringify({
      workMinutes: 25,
      shortBreakMinutes: 5,
      language: 'zh',
      theme: 'light',
    }));
    localStorage.setItem('watermelon-farm', JSON.stringify({
      plots,
      collection: [],
      lastActiveDate: day,
      consecutiveInactiveDays: 0,
      lastActivityTimestamp: now,
      guardianBarrierDate: '',
      stolenRecords: [],
    }));
    localStorage.setItem('watermelon-shed', JSON.stringify({
      seeds: { normal: 8, epic: 0, legendary: 0 },
      items: {},
      totalSliced: 0,
      pity: { epicPity: 0, legendaryPity: 0 },
      injectedSeeds: [],
      hybridSeeds: [],
      prismaticSeeds: [],
      darkMatterSeeds: [],
    }));
    localStorage.setItem('watermelon-genes', JSON.stringify({ fragments: [] }));
    localStorage.setItem('weatherState', JSON.stringify({
      current: 'sunny',
      lastChangeAt: now,
    }));
    localStorage.removeItem('creatures');
    localStorage.removeItem('alienVisit');
  };
}

async function captureCurrentScreenshots(outputDir, taskId) {
  const browser = await chromium.launch();
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      await page.addInitScript(seedFarmStateScript(taskId));
      const reviewUrl = taskId === 'E-001-T13' || taskId === 'E-001-T14' || taskId === 'E-001-T15'
        ? `${DEV_SERVER_URL}/?farmReview=1&farmBoard=v2`
        : `${DEV_SERVER_URL}/?farmReview=1`;
      await page.goto(reviewUrl, { waitUntil: 'networkidle' });

      const farmPage = page.locator('.farm-page');
      const farmVisible = await farmPage.isVisible().catch(() => false);
      if (!farmVisible) {
        await page.locator('header button').filter({ hasText: '🌱' }).first().click();
      }
      await farmPage.waitFor({ state: 'visible' });

      const currentPath = path.join(outputDir, `${taskId}-current-${viewport.name}.png`);
      await page.screenshot({ path: currentPath, fullPage: false });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

function buildCompareHeaderSvg(width, headerHeight, viewportName, taskId) {
  const leftCenter = Math.round(width * 0.25);
  const rightCenter = Math.round(width * 0.75);
  const dividerX = Math.round(width / 2);
  const referenceLabel = taskId === 'E-001-T12' || taskId === 'E-001-T13' || taskId === 'E-001-T14' || taskId === 'E-001-T15'
    ? 'Reference (E-001-T12 new style)'
    : 'Reference (E-001-T01 baseline)';
  return Buffer.from(`
    <svg width="${width}" height="${headerHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${headerHeight}" fill="#0f172a"/>
      <line x1="${dividerX}" y1="10" x2="${dividerX}" y2="${headerHeight - 10}" stroke="#334155" stroke-width="2"/>
      <text x="${leftCenter}" y="26" font-size="17" font-family="Arial, sans-serif" text-anchor="middle" fill="#e2e8f0">${referenceLabel}</text>
      <text x="${rightCenter}" y="26" font-size="17" font-family="Arial, sans-serif" text-anchor="middle" fill="#e2e8f0">Current Implementation</text>
      <text x="${width / 2}" y="48" font-size="14" font-family="Arial, sans-serif" text-anchor="middle" fill="#94a3b8">${taskId} · ${viewportName}</text>
    </svg>
  `);
}

function buildChangeMarkersSvg(totalWidth, totalHeight, viewportName, taskId, headerHeight) {
  if (taskId !== 'E-001-T11' && taskId !== 'E-001-T12' && taskId !== 'E-001-T13' && taskId !== 'E-001-T14' && taskId !== 'E-001-T15') {
    return null;
  }

  const currentLeft = Math.round(totalWidth / 2);
  const markerRadius = viewportName === 'mobile' ? 14 : 16;

  const t11Points = viewportName === 'mobile'
    ? [
        { id: 1, x: currentLeft + 92, y: headerHeight + 245 },
        { id: 2, x: currentLeft + 42, y: headerHeight + 102 },
        { id: 3, x: currentLeft + 118, y: headerHeight + 476 },
      ]
    : [
        { id: 1, x: currentLeft + 260, y: headerHeight + 212 },
        { id: 2, x: currentLeft + 120, y: headerHeight + 120 },
        { id: 3, x: currentLeft + 316, y: headerHeight + 530 },
      ];

  const t12Points = viewportName === 'mobile'
    ? [
        { id: 1, x: currentLeft + 194, y: headerHeight + 360 },
        { id: 2, x: currentLeft + 98, y: headerHeight + 118 },
        { id: 3, x: currentLeft + 120, y: headerHeight + 545 },
      ]
    : [
        { id: 1, x: currentLeft + 452, y: headerHeight + 430 },
        { id: 2, x: currentLeft + 160, y: headerHeight + 134 },
        { id: 3, x: currentLeft + 214, y: headerHeight + 612 },
      ];

  const points = (taskId === 'E-001-T12' || taskId === 'E-001-T13' || taskId === 'E-001-T14' || taskId === 'E-001-T15') ? t12Points : t11Points;
  const legendWidth = viewportName === 'mobile' ? 260 : 350;
  const legendX = totalWidth - legendWidth - 14;
  const legendY = headerHeight + 16;
  const line1 = taskId === 'E-001-T15'
    ? '1. 3x3 board footprint enlarged + centered'
    : taskId === 'E-001-T14'
      ? '1. Reusable V2 single-tile component'
      : taskId === 'E-001-T13'
        ? '1. V2 board mounted via minimal wiring'
        : taskId === 'E-001-T12'
          ? '1. 3x3 board + 9 plots enabled'
          : '1. Corner props enlarged + rebalanced';
  const line2 = taskId === 'E-001-T15'
    ? '2. Spacing density tuned for 9-tile readability'
    : taskId === 'E-001-T14'
      ? '2. Three states: empty / sprout / mature-4'
      : taskId === 'E-001-T13'
        ? '2. 3x3 empty skeleton rendered'
        : taskId === 'E-001-T12'
          ? '2. New 2D reference composition aligned'
          : '2. Compact review shell (header removed)';
  const line3 = taskId === 'E-001-T15'
    ? '3. Desktop/mobile composition kept in sync'
    : taskId === 'E-001-T14'
      ? '3. Desktop/mobile state language aligned'
      : taskId === 'E-001-T13'
        ? '3. Legacy preserved, V2 runs in parallel'
        : taskId === 'E-001-T12'
          ? '3. Mobile-first density + readability tuned'
          : '3. Ground contact blend strengthened';

  return Buffer.from(`
    <svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${legendX}" y="${legendY}" width="${legendWidth}" height="${viewportName === 'mobile' ? 108 : 96}" rx="10" fill="rgba(8,15,36,0.78)" stroke="rgba(148,163,184,0.8)" stroke-width="1.5"/>
      <text x="${legendX + 12}" y="${legendY + 22}" font-size="14" font-family="Arial, sans-serif" fill="#f8fafc">Change Markers</text>
      <text x="${legendX + 12}" y="${legendY + 42}" font-size="12" font-family="Arial, sans-serif" fill="#cbd5e1">${line1}</text>
      <text x="${legendX + 12}" y="${legendY + 60}" font-size="12" font-family="Arial, sans-serif" fill="#cbd5e1">${line2}</text>
      <text x="${legendX + 12}" y="${legendY + 78}" font-size="12" font-family="Arial, sans-serif" fill="#cbd5e1">${line3}</text>
      ${points.map((point) => `
        <circle cx="${point.x}" cy="${point.y}" r="${markerRadius}" fill="#ef4444" stroke="#fff" stroke-width="2"/>
        <text x="${point.x}" y="${point.y + 5}" font-size="16" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle" fill="#fff">${point.id}</text>
      `).join('')}
    </svg>
  `);
}

async function buildCompareImage({ viewportName, baselinePath, currentPath, outputPath, taskId }) {
  ensureFileExists(baselinePath);
  ensureFileExists(currentPath);

  const baselineMeta = await sharp(baselinePath).metadata();
  const outW = baselineMeta.width;
  const outH = baselineMeta.height;
  if (!outW || !outH) {
    throw new Error(`Invalid baseline image metadata: ${baselinePath}`);
  }

  const resizedCurrent = await sharp(currentPath)
    .resize(outW, outH, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer();

  const headerHeight = 60;
  const totalWidth = outW * 2;
  const totalHeight = outH + headerHeight;
  const markerOverlay = buildChangeMarkersSvg(totalWidth, totalHeight, viewportName, taskId, headerHeight);

  const composites = [
    { input: buildCompareHeaderSvg(totalWidth, headerHeight, viewportName, taskId), top: 0, left: 0 },
    { input: await sharp(baselinePath).png().toBuffer(), top: headerHeight, left: 0 },
    { input: resizedCurrent, top: headerHeight, left: outW },
  ];

  if (markerOverlay) {
    composites.push({ input: markerOverlay, top: 0, left: 0 });
  }

  const compareCanvas = await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: '#111827',
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  await sharp(compareCanvas).toFile(outputPath);
}

async function generateCompareArtifacts(runId, taskId) {
  const outputRoot = path.join(ROOT_DIR, 'artifacts', toTaskSlug(taskId));
  const outputDir = path.join(outputRoot, runId);
  fs.mkdirSync(outputDir, { recursive: true });

  const devServerProcess = spawn(
    'npm',
    ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(DEV_SERVER_PORT), '--strictPort'],
    {
      cwd: ROOT_DIR,
      stdio: 'ignore',
      detached: false,
    },
  );

  try {
    await waitForDevServer(DEV_SERVER_URL);
    await captureCurrentScreenshots(outputDir, taskId);

    for (const viewport of viewports) {
      const baselinePath = taskId === 'E-001-T12' || taskId === 'E-001-T13' || taskId === 'E-001-T14' || taskId === 'E-001-T15'
        ? path.join(outputDir, `${taskId}-reference-${viewport.name}.png`)
        : path.join(BASELINE_DIR, `e001-t01-baseline-${viewport.name}.png`);
      const currentPath = path.join(outputDir, `${taskId}-current-${viewport.name}.png`);
      const outputPath = path.join(outputDir, `${taskId}-compare-${viewport.name}.png`);

      if (taskId === 'E-001-T12' || taskId === 'E-001-T13' || taskId === 'E-001-T14' || taskId === 'E-001-T15') {
        await sharp(E001_T12_REFERENCE_PATH)
          .resize(viewport.width, viewport.height, {
            fit: 'contain',
            position: 'center',
            background: '#8ad6ef',
          })
          .png()
          .toFile(baselinePath);
      }

      await buildCompareImage({
        viewportName: viewport.name,
        baselinePath,
        currentPath,
        outputPath,
        taskId,
      });
    }

    const summary = {
      taskId,
      runId,
      outputDir,
      compareFiles: viewports.map((viewport) => `${taskId}-compare-${viewport.name}.png`),
      generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(outputDir, `${taskId}-summary.json`), JSON.stringify(summary, null, 2));

    return outputDir;
  } finally {
    devServerProcess.kill('SIGTERM');
  }
}

async function main() {
  const runId = buildRunId();
  const taskId = parseTaskIdFromArgs();
  const outputDir = await generateCompareArtifacts(runId, taskId);
  console.log(`Triptych compare output generated: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
