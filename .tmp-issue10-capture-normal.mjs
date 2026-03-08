import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = path.resolve('artifacts/issue-10/normal-shell-baseline');
fs.mkdirSync(outDir, { recursive: true });

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

async function captureViewport(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });

  try {
    const page = await context.newPage();
    await page.addInitScript(seedFarmStateScript());
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });

    const farmPage = page.locator('.farm-page').first();
    const farmVisible = await farmPage.isVisible().catch(() => false);
    if (!farmVisible) {
      await page.locator('header button').filter({ hasText: '🌱' }).first().click();
    }

    await page.locator('[data-testid="farm-plot-board-v2"]').waitFor({ state: 'visible' });
    await page.waitForTimeout(700);

    const screenshotPath = path.join(outDir, `farm-${viewport.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const metrics = await page.evaluate(() => {
      const board = document.querySelector('[data-testid="farm-plot-board-v2"]');
      const wrappers = Array.from(document.querySelectorAll('[data-testid="farm-plot-board-v2"] > div'));
      const lastRow = wrappers.slice(6, 9).map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      });
      const farmPageNode = document.querySelector('.farm-page');

      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        boardRect: board ? (() => {
          const rect = board.getBoundingClientRect();
          return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          };
        })() : null,
        farmPageRect: farmPageNode ? (() => {
          const rect = farmPageNode.getBoundingClientRect();
          return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          };
        })() : null,
        lastRow,
      };
    });

    fs.writeFileSync(path.join(outDir, `farm-${viewport.name}.json`), JSON.stringify(metrics, null, 2));
    console.log(`captured ${viewport.name}`);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await captureViewport(browser, { name: '390x844', width: 390, height: 844 });
  await captureViewport(browser, { name: '360x800', width: 360, height: 800 });
  await captureViewport(browser, { name: '1440x900', width: 1440, height: 900 });
} finally {
  await browser.close();
}
