import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const TASK_ID = 'E-001-T20';
const ROOT_DIR = '/home/ycz87/.openclaw/workspace-coder/cosmelon';
const DEV_SERVER_PORT = 4173;
const DEV_SERVER_URL = `http://127.0.0.1:${DEV_SERVER_PORT}`;
const MOTION_DURATION_MS = 12_000;

const viewports = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'mobile', width: 390, height: 640 },
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
      // wait for readiness
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Dev server did not become ready within ${timeoutMs}ms: ${url}`);
}

function seedFarmStateScript() {
  return () => {
    const now = Date.UTC(2026, 1, 24, 12, 0, 0, 0);
    const day = new Date(now).toISOString().slice(0, 10);
    const plotCount = 9;
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
    localStorage.setItem('weatherState', JSON.stringify({
      current: 'sunny',
      lastChangeAt: now,
    }));
    localStorage.removeItem('creatures');
    localStorage.removeItem('alienVisit');
  };
}

async function captureMotionVideo(outputDir) {
  const browser = await chromium.launch();
  try {
    const motionFiles = [];

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

      const farmPage = page.locator('.farm-page');
      const farmVisible = await farmPage.isVisible().catch(() => false);
      if (!farmVisible) {
        await page.locator('header button').filter({ hasText: '🌱' }).first().click();
      }
      await farmPage.waitFor({ state: 'visible' });

      const video = page.video();
      if (!video) {
        throw new Error(`Video capture failed for ${viewport.name}: missing recorder handle`);
      }

      await page.waitForTimeout(MOTION_DURATION_MS);
      await context.close();

      const sourcePath = await video.path();
      const targetPath = path.join(outputDir, `${TASK_ID}-motion-${viewport.name}.webm`);
      if (sourcePath !== targetPath) {
        fs.renameSync(sourcePath, targetPath);
      }
      motionFiles.push(path.basename(targetPath));
    }

    const summaryPath = path.join(outputDir, `${TASK_ID}-motion-summary.json`);
    fs.writeFileSync(summaryPath, JSON.stringify({
      taskId: TASK_ID,
      durationMs: MOTION_DURATION_MS,
      outputDir,
      motionFiles,
      generatedAt: new Date().toISOString(),
    }, null, 2));
  } finally {
    await browser.close();
  }
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
    await captureMotionVideo(outputDir);
    console.log(`Motion capture output generated: ${outputDir}`);
  } finally {
    devServerProcess.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
