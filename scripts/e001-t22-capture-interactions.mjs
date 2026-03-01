import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const TASK_ID = 'E-001-T22';
const ROOT_DIR = '/home/ycz87/.openclaw/workspace-coder/cosmelon';
const DEV_SERVER_PORT = 4173;
const DEV_SERVER_URL = `http://127.0.0.1:${DEV_SERVER_PORT}`;

const viewports = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
];

function parseArg(prefix) {
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : '';
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

async function waitForDevServer(url, timeoutMs = 30_000) {
  const startAt = Date.now();
  while (Date.now() - startAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the dev server is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Dev server did not become ready within ${timeoutMs}ms: ${url}`);
}

function seedFarmStateScript() {
  return () => {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const day = nowIso.slice(0, 10);

    const basePlots = Array.from({ length: 9 }, (_, id) => ({
      id,
      state: 'empty',
      progress: 0,
      mutationStatus: 'none',
      mutationChance: 0.02,
      isMutant: false,
      accumulatedMinutes: 0,
      lastActivityTimestamp: now,
      hasTracker: false,
    }));

    const matureIndexes = [2, 5, 8];
    const growingIndexes = [1, 4, 7];
    const plots = basePlots.map((plot, index) => {
      if (matureIndexes.includes(index)) {
        return {
          ...plot,
          state: 'mature',
          progress: 1,
          varietyId: 'jade-stripe',
          seedQuality: 'normal',
          plantedDate: nowIso,
          lastUpdateDate: nowIso,
          accumulatedMinutes: 10000,
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
          plantedDate: nowIso,
          lastUpdateDate: nowIso,
        };
      }
      return plot;
    });

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
    localStorage.setItem('weatherState', JSON.stringify({ current: 'sunny', lastChangeAt: now }));
    localStorage.removeItem('creatures');
    localStorage.removeItem('alienVisit');
  };
}

async function runStepBFlow(page) {
  const farmPage = page.locator('.farm-page').first();
  const board = page.locator('[data-testid="farm-plot-board-v2"]');

  const farmVisible = await farmPage.isVisible().catch(() => false);
  if (!farmVisible) {
    await page.locator('header button').filter({ hasText: '🌱' }).first().click();
  }

  await farmPage.waitFor({ state: 'visible' });
  await board.waitFor({ state: 'visible' });
  await page.waitForTimeout(900);

  const growingTile = page.locator('[data-state="growing"]').first();
  await growingTile.click();
  await page.getByRole('button', { name: 'Close growth tooltip' }).waitFor({ state: 'visible' });
  await page.waitForTimeout(1000);

  const emptyTile = page.locator('[data-state="empty"]').first();
  await emptyTile.click();
  await page.getByText('选择种子').first().waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /普通/ }).first().click();
  await page.getByText('选择种子').first().waitFor({ state: 'hidden' });
  await page.waitForTimeout(1200);

  const matureTile = page.locator('[data-state="mature"]').first();
  await matureTile.click();
  await page.waitForTimeout(1400);

  await page.waitForFunction(() => {
    const farmRaw = localStorage.getItem('watermelon-farm');
    if (!farmRaw) return false;
    const farm = JSON.parse(farmRaw);
    if (!Array.isArray(farm.plots)) return false;

    const matureCount = farm.plots.filter((plot) => plot.state === 'mature').length;
    const hasFreshGrowing = farm.plots.some((plot) => plot.state === 'growing' && (plot.accumulatedMinutes ?? 0) <= 1);
    return matureCount <= 2 && hasFreshGrowing;
  }, { timeout: 10_000 });

  await page.waitForTimeout(1200);
}

async function captureInteractionVideos(outputDir) {
  const browser = await chromium.launch();
  const videoFiles = [];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        recordVideo: {
          dir: outputDir,
          size: { width: viewport.width, height: viewport.height },
        },
      });

      const page = await context.newPage();
      await page.addInitScript(seedFarmStateScript());
      await page.goto(`${DEV_SERVER_URL}/`, { waitUntil: 'networkidle' });

      const video = page.video();
      if (!video) {
        throw new Error(`Video capture failed for ${viewport.name}: missing recorder handle`);
      }

      await runStepBFlow(page);
      await context.close();

      const sourcePath = await video.path();
      const targetPath = path.join(outputDir, `${TASK_ID}-step-b-interaction-${viewport.name}.webm`);
      if (sourcePath !== targetPath) {
        fs.renameSync(sourcePath, targetPath);
      }
      videoFiles.push(path.basename(targetPath));
    }
  } finally {
    await browser.close();
  }

  return videoFiles;
}

async function main() {
  const outputDirArg = parseArg('--output-dir=');
  const outputDir = outputDirArg || path.join(ROOT_DIR, 'artifacts', toTaskSlug(TASK_ID), buildRunId());
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
    const videoFiles = await captureInteractionVideos(outputDir);

    const summaryPath = path.join(outputDir, `${TASK_ID}-step-b-interaction-summary.json`);
    fs.writeFileSync(summaryPath, JSON.stringify({
      taskId: TASK_ID,
      scope: 'Step B interaction recovery',
      outputDir,
      videoFiles,
      generatedAt: new Date().toISOString(),
    }, null, 2));

    console.log(`Step B interaction capture output generated: ${outputDir}`);
  } finally {
    devServerProcess.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
