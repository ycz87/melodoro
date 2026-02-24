import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { chromium } from 'playwright';

const TASK_ID = 'E-001-T02';
const ROOT_DIR = '/home/ycz87/.openclaw/workspace-coder/cosmelon';
const BASELINE_DIR = path.join(ROOT_DIR, 'baseline', 'e001-t01');
const OUTPUT_ROOT = path.join(ROOT_DIR, 'artifacts', 'e001-t02');
const DEV_SERVER_PORT = 4173;
const DEV_SERVER_URL = `http://127.0.0.1:${DEV_SERVER_PORT}`;

const viewports = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'mobile', width: 390, height: 640 },
  { name: 'detail', width: 1024, height: 1024 },
];

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

function seedFarmStateScript() {
  return () => {
    const now = Date.UTC(2026, 1, 24, 12, 0, 0, 0);
    const day = new Date(now).toISOString().slice(0, 10);

    localStorage.clear();
    localStorage.setItem('pomodoro-guide-seen', '1');
    localStorage.setItem('pomodoro-settings', JSON.stringify({
      workMinutes: 25,
      shortBreakMinutes: 5,
      language: 'zh',
      theme: 'light',
    }));
    localStorage.setItem('watermelon-farm', JSON.stringify({
      plots: [
        { id: 0, state: 'empty', progress: 0, mutationStatus: 'none', mutationChance: 0.02, isMutant: false, accumulatedMinutes: 0, lastActivityTimestamp: 0, hasTracker: false },
        { id: 1, state: 'empty', progress: 0, mutationStatus: 'none', mutationChance: 0.02, isMutant: false, accumulatedMinutes: 0, lastActivityTimestamp: 0, hasTracker: false },
        { id: 2, state: 'empty', progress: 0, mutationStatus: 'none', mutationChance: 0.02, isMutant: false, accumulatedMinutes: 0, lastActivityTimestamp: 0, hasTracker: false },
        { id: 3, state: 'empty', progress: 0, mutationStatus: 'none', mutationChance: 0.02, isMutant: false, accumulatedMinutes: 0, lastActivityTimestamp: 0, hasTracker: false },
      ],
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

async function captureCurrentScreenshots(outputDir) {
  const browser = await chromium.launch();
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      await page.addInitScript(seedFarmStateScript());
      await page.goto(DEV_SERVER_URL, { waitUntil: 'networkidle' });
      await page.locator('header button').filter({ hasText: '🌱' }).first().click();
      await page.locator('.farm-page').waitFor({ state: 'visible' });

      const currentPath = path.join(outputDir, `${TASK_ID}-current-${viewport.name}.png`);
      await page.screenshot({ path: currentPath, fullPage: false });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

function buildCompareHeaderSvg(width, headerHeight, viewportName) {
  const leftCenter = Math.round(width * 0.25);
  const rightCenter = Math.round(width * 0.75);
  const dividerX = Math.round(width / 2);
  return Buffer.from(`
    <svg width="${width}" height="${headerHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${headerHeight}" fill="#0f172a"/>
      <line x1="${dividerX}" y1="10" x2="${dividerX}" y2="${headerHeight - 10}" stroke="#334155" stroke-width="2"/>
      <text x="${leftCenter}" y="26" font-size="17" font-family="Arial, sans-serif" text-anchor="middle" fill="#e2e8f0">Reference (E-001-T01 baseline)</text>
      <text x="${rightCenter}" y="26" font-size="17" font-family="Arial, sans-serif" text-anchor="middle" fill="#e2e8f0">Current Implementation</text>
      <text x="${width / 2}" y="48" font-size="14" font-family="Arial, sans-serif" text-anchor="middle" fill="#94a3b8">${TASK_ID} · ${viewportName}</text>
    </svg>
  `);
}

async function buildCompareImage({ viewportName, baselinePath, currentPath, outputPath }) {
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
  const compareCanvas = await sharp({
    create: {
      width: outW * 2,
      height: outH + headerHeight,
      channels: 4,
      background: '#111827',
    },
  })
    .composite([
      { input: buildCompareHeaderSvg(outW * 2, headerHeight, viewportName), top: 0, left: 0 },
      { input: await sharp(baselinePath).png().toBuffer(), top: headerHeight, left: 0 },
      { input: resizedCurrent, top: headerHeight, left: outW },
    ])
    .png()
    .toBuffer();

  await sharp(compareCanvas).toFile(outputPath);
}

async function generateCompareArtifacts(runId) {
  const outputDir = path.join(OUTPUT_ROOT, runId);
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
    await captureCurrentScreenshots(outputDir);

    for (const viewport of viewports) {
      const baselinePath = path.join(BASELINE_DIR, `e001-t01-baseline-${viewport.name}.png`);
      const currentPath = path.join(outputDir, `${TASK_ID}-current-${viewport.name}.png`);
      const outputPath = path.join(outputDir, `${TASK_ID}-compare-${viewport.name}.png`);

      await buildCompareImage({
        viewportName: viewport.name,
        baselinePath,
        currentPath,
        outputPath,
      });
    }

    const summary = {
      taskId: TASK_ID,
      runId,
      outputDir,
      compareFiles: viewports.map((viewport) => `${TASK_ID}-compare-${viewport.name}.png`),
      generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(outputDir, `${TASK_ID}-summary.json`), JSON.stringify(summary, null, 2));

    return outputDir;
  } finally {
    devServerProcess.kill('SIGTERM');
  }
}

async function main() {
  const runId = buildRunId();
  const outputDir = await generateCompareArtifacts(runId);
  console.log(`Triptych compare output generated: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
