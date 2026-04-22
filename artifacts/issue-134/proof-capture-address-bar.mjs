import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4273';
const outDir = process.argv[2] ?? 'artifacts/issue-134/proof-address-bar';

const viewports = [
  { name: '390x844', width: 390, height: 844, visibleHeight: 760, isMobile: true, deviceScaleFactor: 3 },
  { name: '360x800', width: 360, height: 800, visibleHeight: 716, isMobile: true, deviceScaleFactor: 3 },
  { name: '1440x900', width: 1440, height: 900, visibleHeight: 900, isMobile: false, deviceScaleFactor: 1 },
];

function getTodayKey(now = Date.now()) {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function createPlot(id, state) {
  if (state === 'growing') {
    return {
      id,
      state: 'growing',
      seedQuality: 'normal',
      varietyId: 'jade-stripe',
      progress: 0.42,
      accumulatedMinutes: 4200,
      mutationStatus: 'none',
      mutationChance: 0.02,
      isMutant: false,
      lastActivityTimestamp: Date.now(),
      plantedDate: getTodayKey(),
      lastUpdateDate: getTodayKey(),
      hasTracker: false,
    };
  }

  if (state === 'mature') {
    return {
      id,
      state: 'mature',
      seedQuality: 'normal',
      varietyId: 'jade-stripe',
      progress: 1,
      accumulatedMinutes: 12000,
      mutationStatus: 'none',
      mutationChance: 0.02,
      isMutant: false,
      lastActivityTimestamp: Date.now(),
      plantedDate: getTodayKey(),
      lastUpdateDate: getTodayKey(),
      hasTracker: false,
    };
  }

  return {
    id,
    state: 'empty',
    progress: 0,
    mutationStatus: 'none',
    mutationChance: 0.02,
    isMutant: false,
    accumulatedMinutes: 0,
    lastActivityTimestamp: 0,
    hasTracker: false,
  };
}

function createSeedState() {
  const now = Date.now();
  const states = ['empty', 'growing', 'mature', 'empty', 'growing', 'mature', 'empty', 'growing', 'mature'];

  return {
    settings: {
      workMinutes: 25,
      shortBreakMinutes: 5,
      theme: 'dark',
      language: 'zh',
    },
    farm: {
      plots: states.map((state, index) => createPlot(index, state)),
      collection: ['jade-stripe'],
      lastActiveDate: getTodayKey(now),
      consecutiveInactiveDays: 0,
      lastActivityTimestamp: now,
      guardianBarrierDate: '',
      stolenRecords: [],
    },
    shed: {
      seeds: { normal: 9, epic: 0, legendary: 0 },
      items: {},
      totalSliced: 0,
      pity: { epicPity: 0, legendaryPity: 0 },
      injectedSeeds: [],
      hybridSeeds: [],
      prismaticSeeds: [],
      darkMatterSeeds: [],
    },
    gene: {
      fragments: [],
    },
    weatherState: {
      current: 'sunny',
      lastChangeAt: now,
    },
  };
}

async function seedInit(page) {
  const state = createSeedState();
  await page.addInitScript((payload) => {
    localStorage.clear();
    localStorage.setItem('pomodoro-guide-seen', '1');
    localStorage.setItem('pomodoro-settings', JSON.stringify(payload.settings));
    localStorage.setItem('watermelon-farm', JSON.stringify(payload.farm));
    localStorage.setItem('watermelon-shed', JSON.stringify(payload.shed));
    localStorage.setItem('watermelon-genes', JSON.stringify(payload.gene));
    localStorage.setItem('weatherState', JSON.stringify(payload.weatherState));
    localStorage.removeItem('weatherDebugOverride');
    localStorage.removeItem('watermelon-debug');
  }, state);
}

async function overrideVisualViewport(page, viewport) {
  if (!viewport.isMobile) return;
  await page.addInitScript(({ width, visibleHeight }) => {
    const listeners = { resize: new Set(), scroll: new Set() };
    const fakeVisualViewport = {
      width,
      height: visibleHeight,
      scale: 1,
      offsetLeft: 0,
      offsetTop: 0,
      pageLeft: 0,
      pageTop: 0,
      addEventListener(type, callback) {
        listeners[type]?.add(callback);
      },
      removeEventListener(type, callback) {
        listeners[type]?.delete(callback);
      },
      dispatchEvent() {
        return true;
      },
    };

    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: fakeVisualViewport,
    });
  }, { width: viewport.width, visibleHeight: viewport.visibleHeight });
}

async function goToFarm(page) {
  await page.goto(baseURL);
  await page.getByRole('button', { name: /(Farm|农场|🌱)/ }).first().click();
  await page.locator('[data-testid="farm-v2-scene"]').waitFor();
}

async function captureMetrics(page) {
  return page.evaluate(() => {
    const board = document.querySelector('[data-testid="farm-plot-board-v2"]');
    const scene = document.querySelector('[data-testid="farm-v2-scene"]');
    const weatherBadge = document.querySelector('[data-testid="farm-v2-weather-badge"]');
    const fence = document.querySelector('[data-testid="farm-v2-fence"]');
    const tiles = Array.from(document.querySelectorAll('[data-testid="farm-plot-board-v2"] [data-slot-state]'));
    const lastRow = tiles.slice(-3).map((tile) => tile.getBoundingClientRect());
    const visualViewportHeight = window.visualViewport?.height ?? window.innerHeight;

    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      visualViewportHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      sceneRect: scene?.getBoundingClientRect() ?? null,
      boardRect: board?.getBoundingClientRect() ?? null,
      weatherBadgeRect: weatherBadge?.getBoundingClientRect() ?? null,
      fenceRect: fence?.getBoundingClientRect() ?? null,
      lastRow,
      lastRowVisibleBottomGap: lastRow.length > 0 ? visualViewportHeight - Math.max(...lastRow.map((tile) => tile.bottom)) : null,
      sceneVisibleBottomGap: scene ? visualViewportHeight - scene.getBoundingClientRect().bottom : null,
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
      deviceScaleFactor: viewport.deviceScaleFactor,
    });
    const page = await context.newPage();
    await overrideVisualViewport(page, viewport);
    await seedInit(page);
    await goToFarm(page);

    const metrics = await captureMetrics(page);
    const baseName = `farm-${viewport.name}-address-bar-expanded`;
    await page.screenshot({ path: path.join(outDir, `${baseName}.png`), fullPage: true });
    await fs.writeFile(path.join(outDir, `${baseName}.json`), JSON.stringify({ metrics }, null, 2));
    await context.close();
  }
} finally {
  await browser.close();
}
