import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = path.resolve('artifacts/issue-10/click-check');
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

async function openFarm(page) {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  const farmPage = page.locator('.farm-page').first();
  const visible = await farmPage.isVisible().catch(() => false);
  if (!visible) {
    await page.locator('header button').filter({ hasText: '🌱' }).first().click();
  }
  await page.locator('[data-testid="farm-plot-board-v2"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
}

async function runForViewport(browser, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  try {
    const page = await context.newPage();
    await page.addInitScript(seedFarmStateScript());
    await openFarm(page);

    const slots = page.locator('[data-testid="farm-plot-board-v2"] > div');
    const bottomEmpty = slots.nth(6).locator('[data-state="empty"]');
    const bottomGrowing = slots.nth(7).locator('[data-state="growing"]');
    const bottomMature = slots.nth(8).locator('[data-state="mature"]');

    await bottomEmpty.click();
    await page.getByText('选择种子').first().waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(outDir, `empty-click-${viewport.name}.png`) });
    await page.getByRole('button', { name: /普通/ }).first().click();
    await page.getByText('选择种子').first().waitFor({ state: 'hidden' });

    await bottomGrowing.click();
    await page.getByTestId('farm-v2-growth-info-card').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(outDir, `growing-click-${viewport.name}.png`) });
    await page.getByRole('button', { name: 'Close growth tooltip' }).click();

    await bottomMature.click();
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('watermelon-farm');
      if (!raw) return false;
      const farm = JSON.parse(raw);
      return farm.plots?.[8]?.state === 'empty';
    }, { timeout: 5000 });
    await page.screenshot({ path: path.join(outDir, `mature-click-${viewport.name}.png`) });

    const result = await page.evaluate(() => {
      const farm = JSON.parse(localStorage.getItem('watermelon-farm') || '{}');
      const shed = JSON.parse(localStorage.getItem('watermelon-shed') || '{}');
      return {
        plot6State: farm.plots?.[6]?.state,
        plot7State: farm.plots?.[7]?.state,
        plot8State: farm.plots?.[8]?.state,
        normalSeeds: shed.seeds?.normal,
      };
    });

    fs.writeFileSync(path.join(outDir, `result-${viewport.name}.json`), JSON.stringify(result, null, 2));
    console.log(`checked ${viewport.name}`);
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await runForViewport(browser, { name: '390x844', width: 390, height: 844 });
  await runForViewport(browser, { name: '360x800', width: 360, height: 800 });
} finally {
  await browser.close();
}
