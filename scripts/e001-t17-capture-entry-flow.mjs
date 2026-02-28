import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT_DIR = '/home/ycz87/.openclaw/workspace-coder/cosmelon';
const TASK_ID = 'E-001-T17';
const DEV_SERVER_PORT = 4173;
const DEV_SERVER_URL = `http://127.0.0.1:${DEV_SERVER_PORT}`;

const viewports = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
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

function parseOutputDir() {
  const arg = process.argv.find((item) => item.startsWith('--output-dir='));
  if (!arg) {
    const runId = buildRunId();
    return path.join(ROOT_DIR, 'artifacts', 'e-001-t17', runId);
  }
  return arg.slice('--output-dir='.length);
}

async function waitForDevServer(url, timeoutMs = 30_000) {
  const startAt = Date.now();
  while (Date.now() - startAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Continue polling until dev server is available.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Dev server did not become ready within ${timeoutMs}ms: ${url}`);
}

function seedFarmStateScript() {
  return () => {
    const now = Date.UTC(2026, 1, 24, 12, 0, 0, 0);
    const day = new Date(now).toISOString().slice(0, 10);

    const plots = Array.from({ length: 9 }, (_, id) => ({
      id,
      state: 'empty',
      progress: 0,
      mutationStatus: 'none',
      mutationChance: 0.02,
      isMutant: false,
      accumulatedMinutes: 0,
      lastActivityTimestamp: 0,
      hasTracker: false,
    })).map((plot, index) => {
      const matureIndexes = [2, 5, 8];
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
  };
}

async function captureEntryFlow(outputDir) {
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

    const browser = await chromium.launch();
    try {
      for (const viewport of viewports) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
        const page = await context.newPage();
        await page.addInitScript(seedFarmStateScript());
        await page.goto(`${DEV_SERVER_URL}/`, { waitUntil: 'networkidle' });

        await page.locator('header').waitFor({ state: 'visible' });
        const beforePath = path.join(outputDir, `${TASK_ID}-entry-${viewport.name}-step1-main-tabs.png`);
        await page.screenshot({ path: beforePath, fullPage: false });

        await page.locator('header button').filter({ hasText: '🌱' }).first().click();
        await page.locator('.farm-page').first().waitFor({ state: 'visible' });
        await page.locator('[data-testid="farm-plot-board-v2"]').waitFor({ state: 'visible' });

        const afterPath = path.join(outputDir, `${TASK_ID}-entry-${viewport.name}-step2-plots-v2.png`);
        await page.screenshot({ path: afterPath, fullPage: false });

        await context.close();
      }
    } finally {
      await browser.close();
    }
  } finally {
    devServerProcess.kill('SIGTERM');
  }
}

async function main() {
  const outputDir = parseOutputDir();
  await captureEntryFlow(outputDir);
  console.log(`Entry flow screenshots generated: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
