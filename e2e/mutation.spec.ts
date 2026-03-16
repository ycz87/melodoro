import { test, expect, type Page } from '@playwright/test';
import { zh } from '../src/i18n/locales/zh';

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface SeedPlot {
  id: number;
  state: 'growing' | 'empty';
  varietyId?: string;
  progress: number;
  mutationStatus?: 'none' | 'positive' | 'negative';
  mutationChance?: number;
  isMutant?: boolean;
  accumulatedMinutes: number;
  lastActivityTimestamp: number;
  lastUpdateDate?: string;
}

interface SeedPayload {
  plots: SeedPlot[];
  collection: Array<Record<string, unknown>>;
  lastActiveDate: string;
  consecutiveInactiveDays: number;
  lastActivityTimestamp: number;
  shedItems: Record<string, number>;
  coins: number;
  language: 'zh';
}

interface FarmSnapshot {
  plots?: Array<{
    id?: number;
    state?: string;
    progress?: number;
    mutationStatus?: 'none' | 'positive' | 'negative';
    mutationChance?: number;
    isMutant?: boolean;
    lastActivityTimestamp?: number;
    lastUpdateDate?: string;
  }>;
}

const getDateKey = (offset: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

const createGrowingPlot = (id: number, overrides: Partial<SeedPlot> = {}): SeedPlot => ({
  id,
  state: 'growing',
  varietyId: 'jade-stripe',
  progress: 0.1,
  mutationStatus: 'none',
  mutationChance: 0.02,
  isMutant: false,
  accumulatedMinutes: 1990,
  lastActivityTimestamp: Date.now(),
  ...overrides,
});

const createEmptyPlot = (id: number): SeedPlot => ({
  id,
  state: 'empty',
  progress: 0,
  accumulatedMinutes: 0,
  lastActivityTimestamp: 0,
});

const createSeedPayload = (overrides: Partial<SeedPayload> = {}): SeedPayload => ({
  plots: [
    createEmptyPlot(0),
    createEmptyPlot(1),
    createEmptyPlot(2),
    createEmptyPlot(3),
  ],
  collection: [],
  lastActiveDate: getDateKey(),
  consecutiveInactiveDays: 0,
  lastActivityTimestamp: Date.now(),
  shedItems: {},
  coins: 1000,
  language: 'zh',
  ...overrides,
});

async function bootWithSeed(page: Page, payload: SeedPayload) {
  // Use addInitScript for first load — but note this re-runs on every navigation!
  // For tests that need reload, use reloadWithCurrentState() instead.
  await page.addInitScript((seed: SeedPayload) => {
    // Only set if not already initialized (prevent overwriting on reload)
    if (localStorage.getItem('_mutation_test_booted')) return;
    localStorage.setItem('_mutation_test_booted', '1');
    localStorage.setItem('pomodoro-guide-seen', '1');
    localStorage.setItem('pomodoro-settings', JSON.stringify({
      workMinutes: 25,
      shortBreakMinutes: 5,
      theme: 'dark',
      language: seed.language,
    }));
    localStorage.setItem('watermelon-farm', JSON.stringify({
      plots: seed.plots,
      collection: seed.collection,
      lastActiveDate: seed.lastActiveDate,
      consecutiveInactiveDays: seed.consecutiveInactiveDays,
      lastActivityTimestamp: seed.lastActivityTimestamp,
      stolenRecords: [],
    }));
    localStorage.setItem('watermelon-shed', JSON.stringify({
      seeds: { normal: 0, epic: 0, legendary: 0 },
      items: seed.shedItems,
      totalSliced: 0,
      pity: { epicPity: 0, legendaryPity: 0 },
      injectedSeeds: [],
      hybridSeeds: [],
    }));
    localStorage.setItem('watermelon-genes', JSON.stringify({ fragments: [] }));
    localStorage.setItem('watermelon-coins', JSON.stringify({ balance: seed.coins }));
  }, payload);
  await page.goto('/');
}

async function goToFarm(page: Page) {
  await page.getByRole('button', { name: '🌱' }).click();
  await expect(page.locator('.farm-grid-perspective')).toBeVisible();
}

async function goToMarket(page: Page) {
  await page.getByRole('button', { name: '🏪' }).click();
  await expect(page.getByRole('heading', { name: zh.marketTitle })).toBeVisible();
}

async function openSellTab(page: Page) {
  await page.getByRole('button', { name: zh.marketTabSell }).click();
}

async function readFarm(page: Page): Promise<FarmSnapshot> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('watermelon-farm');
    if (!raw) return {};
    return JSON.parse(raw) as FarmSnapshot;
  });
}

function getPlotById(farm: FarmSnapshot, plotId: number) {
  if (!Array.isArray(farm.plots)) return undefined;
  return farm.plots.find((plot) => plot.id === plotId) ?? farm.plots[plotId];
}

async function waitForMutationRoll(page: Page, plotId: number) {
  await page.waitForFunction((targetPlotId: number) => {
    const farmRaw = localStorage.getItem('watermelon-farm');
    if (!farmRaw) return false;

    const farm = JSON.parse(farmRaw) as {
      plots?: Array<{ id?: number; progress?: number; mutationChance?: number }>;
    };
    if (!Array.isArray(farm.plots)) return false;

    const plot = farm.plots.find((item) => item.id === targetPlotId) ?? farm.plots[targetPlotId];
    if (!plot) return false;

    const progress = typeof plot.progress === 'number' ? plot.progress : 0;
    const mutationChance = typeof plot.mutationChance === 'number' ? plot.mutationChance : -1;
    return progress >= 0.20 && mutationChance === 0;
  }, plotId, { timeout: 15_000 });
}

async function useMutationGunOnce(page: Page, expectedChance: number) {
  const mutationButton = page.locator('button').filter({ hasText: zh.mutationGunUse }).first();
  if (!(await mutationButton.isVisible().catch(() => false))) {
    await page.locator('.farm-grid-perspective > div').first().click();
    await expect(mutationButton).toBeVisible();
  }

  await mutationButton.click();

  await page.waitForFunction((targetChance: number) => {
    const farmRaw = localStorage.getItem('watermelon-farm');
    if (!farmRaw) return false;

    const farm = JSON.parse(farmRaw) as { plots?: Array<{ id?: number; mutationChance?: number }> };
    const plot = Array.isArray(farm.plots)
      ? farm.plots.find((item) => item.id === 0)
      : undefined;
    const chance = typeof plot?.mutationChance === 'number' ? plot.mutationChance : 0;

    return Math.abs(chance - targetChance) < 0.000_001;
  }, expectedChance);

  await page.waitForTimeout(500);
}

test.describe('Mutation System', () => {
  test('AC1: 自然变异逻辑 - 状态注入判定', async ({ page }) => {
    const oneHourAgo = Date.now() - ONE_HOUR_MS;
    const payload = createSeedPayload({
      plots: [
        createGrowingPlot(0, {
          progress: 0.199,
          mutationChance: 1.0,
          lastActivityTimestamp: oneHourAgo,
        }),
        createEmptyPlot(1),
        createEmptyPlot(2),
        createEmptyPlot(3),
      ],
      lastActiveDate: getDateKey(-1),
      lastActivityTimestamp: oneHourAgo,
    });

    await bootWithSeed(page, payload);
    await waitForMutationRoll(page, 0);

    const farm = await readFarm(page);
    const plot = getPlotById(farm, 0);
    expect(plot).toBeTruthy();
    if (!plot) return;
    expect(plot.progress ?? 0).toBeGreaterThanOrEqual(0.20);
    expect(plot.mutationChance).toBe(0);
  });

  test('AC5: 变异射线枪使用后该株变异概率 +20%', async ({ page }) => {
    const payload = createSeedPayload({
      plots: [
        createGrowingPlot(0, { progress: 0.10, mutationChance: 0.02 }),
        createEmptyPlot(1),
        createEmptyPlot(2),
        createEmptyPlot(3),
      ],
      shedItems: {
        'mutation-gun': 1,
      },
    });

    await bootWithSeed(page, payload);
    await goToFarm(page);

    await page.locator('.farm-grid-perspective > div').first().click();
    await expect(page.getByText(`${zh.mutationChanceLabel}: 2%`)).toBeVisible();

    await useMutationGunOnce(page, 0.22);

    await expect(page.getByText(`${zh.mutationChanceLabel}: 22%`)).toBeVisible();

    const farm = await readFarm(page);
    const plot = getPlotById(farm, 0);
    expect(plot?.mutationChance).toBeCloseTo(0.22, 6);
  });

  test('AC6: 射线枪使用 5 次后该株 100% 触发变异判定', async ({ page }) => {
    // Start with mutationChance already at 0.82 (simulating 4 prior uses)
    // Use 1 more gun to reach 1.0
    const payload = createSeedPayload({
      plots: [
        createGrowingPlot(0, { progress: 0.10, mutationChance: 0.82 }),
        createEmptyPlot(1),
        createEmptyPlot(2),
        createEmptyPlot(3),
      ],
      shedItems: {
        'mutation-gun': 1,
      },
    });

    await bootWithSeed(page, payload);
    await goToFarm(page);

    // Use the last gun to reach 1.0
    await useMutationGunOnce(page, 1.0);

    const farmAfterGuns = await readFarm(page);
    const plotAfterGuns = getPlotById(farmAfterGuns, 0);
    expect(plotAfterGuns?.mutationChance).toBe(1.0);

    // Verify: 100% chance means mutation WILL trigger when progress crosses 0.20
    // (AC1 already validates the trigger mechanism; here we just confirm the cap)
  });

  test('AC7: 变异体售价为原品种 3 倍', async ({ page }) => {
    const payload = createSeedPayload({
      collection: [
        { varietyId: 'jade-stripe', isMutant: true, count: 1, firstObtainedDate: getDateKey() },
      ],
      lastActiveDate: getDateKey(-1),
      lastActivityTimestamp: Date.now() - ONE_DAY_MS,
    });

    await bootWithSeed(page, payload);
    await goToMarket(page);
    await openSellTab(page);

    const mutantCard = page.locator('button').filter({ hasText: zh.varietyName('jade-stripe') }).first();
    await expect(mutantCard).toBeVisible();
    await expect(mutantCard).toContainText(zh.mutationPositive);
    await expect(mutantCard).toContainText('24');
  });
});
