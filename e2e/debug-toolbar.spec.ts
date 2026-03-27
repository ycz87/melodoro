import { test, expect } from '@playwright/test';

type WarehouseStorage = {
  items: Record<string, number>;
  legendaryPity: number;
  totalCollected: number;
};

type FarmStorage = {
  plots: Array<{ state: string }>;
  collection: Array<{ varietyId: string }>;
};

type DebugToolbarWindow = Window & typeof globalThis & {
  __e2eNavigationType?: string;
  __e2eStorageLengthAtInit?: number;
  __e2eStorageKeysAtInit?: string[];
};

async function dismissGuideIfPresent(page: import('@playwright/test').Page) {
  const getStarted = page.locator('button', { hasText: 'Get Started' });
  if (await getStarted.isVisible({ timeout: 2000 }).catch(() => false)) {
    await getStarted.click();
    await getStarted.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }
}

async function activateDebugMode(page: import('@playwright/test').Page) {
  await page.goto('/');
  await dismissGuideIfPresent(page);

  const settingsButton = page.getByRole('button', { name: /settings|设置/i });
  await settingsButton.click();

  const versionBadge = page.locator('.settings-scrollbar span').filter({ hasText: /^v\d+\.\d+\.\d+$/ });
  await expect(versionBadge).toBeVisible();

  for (let i = 0; i < 7; i += 1) {
    await versionBadge.click();
  }

  await expect(page.getByText('🧪 Debug Toolbar')).toBeVisible();
}

async function openDebugPanel(page: import('@playwright/test').Page) {
  const title = page.getByText('🧪 Debug Toolbar');
  const resetAllButton = page.getByRole('button', { name: '🔄 重置所有数据' });

  if (!(await resetAllButton.isVisible().catch(() => false))) {
    await title.click();
  }

  await expect(resetAllButton).toBeVisible();
}

async function readWarehouseStorage(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('watermelon-warehouse');
    return raw ? JSON.parse(raw) as WarehouseStorage : null;
  });
}

async function readFarmStorage(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('watermelon-farm');
    return raw ? JSON.parse(raw) as FarmStorage : null;
  });
}

test.describe('Debug toolbar E2E', () => {
  test('warehouse actions keep working (add/reset)', async ({ page }) => {
    await activateDebugMode(page);
    await openDebugPanel(page);

    const warehouseSection = page.locator('section').filter({ hasText: '瓜棚道具' });
    const seedRow = warehouseSection.locator('div').filter({ hasText: 'seed 🌱' }).first();

    await seedRow.getByRole('button', { name: '+10' }).click();

    await expect.poll(async () => (await readWarehouseStorage(page))?.items.seed ?? -1).toBe(10);
    await expect.poll(async () => (await readWarehouseStorage(page))?.totalCollected ?? -1).toBe(10);

    await warehouseSection.getByRole('button', { name: '清空瓜棚' }).click();

    await expect.poll(async () => {
      const warehouse = await readWarehouseStorage(page);
      if (!warehouse) return -1;
      return Object.values(warehouse.items).reduce((sum, value) => sum + value, 0);
    }).toBe(0);
    await expect.poll(async () => (await readWarehouseStorage(page))?.totalCollected ?? -1).toBe(0);
    await expect.poll(async () => (await readWarehouseStorage(page))?.legendaryPity ?? -1).toBe(0);
  });

  test('farm actions keep working (+varieties/reset)', async ({ page }) => {
    await activateDebugMode(page);
    await openDebugPanel(page);

    const farmSection = page.locator('section').filter({ hasText: '农场' });

    await farmSection.getByRole('button', { name: '🌱 +3品种' }).click();
    await expect.poll(async () => (await readFarmStorage(page))?.collection.length ?? -1).toBe(3);

    await farmSection.getByRole('button', { name: '🗑️ 重置农场' }).click();
    await expect.poll(async () => (await readFarmStorage(page))?.collection.length ?? -1).toBe(0);
    await expect.poll(async () => {
      const farm = await readFarmStorage(page);
      return farm ? farm.plots.every((plot) => plot.state === 'empty') : false;
    }).toBe(true);
  });

  test('time multiplier actions keep working (active state switches)', async ({ page }) => {
    await activateDebugMode(page);
    await openDebugPanel(page);

    const multiplierSection = page.locator('section').filter({ hasText: '时间倍率' });
    const oneXButton = multiplierSection.getByRole('button', { name: '1x' });
    const tenXButton = multiplierSection.getByRole('button', { name: '10x' });

    const tenXBgBefore = await tenXButton.evaluate((el) => getComputedStyle(el).backgroundColor);
    const oneXBgBefore = await oneXButton.evaluate((el) => getComputedStyle(el).backgroundColor);

    await tenXButton.click();

    await expect.poll(async () => tenXButton.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(tenXBgBefore);
    await expect.poll(async () => oneXButton.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(oneXBgBefore);
  });

  test('reset all data clears localStorage and triggers a real page reload', async ({ page }) => {
    await page.addInitScript(() => {
      const debugWindow = window as DebugToolbarWindow;
      debugWindow.__e2eNavigationType = performance.getEntriesByType('navigation')[0]?.type ?? 'unknown';
      debugWindow.__e2eStorageLengthAtInit = localStorage.length;
      debugWindow.__e2eStorageKeysAtInit = Object.keys(localStorage);
    });

    await activateDebugMode(page);
    await openDebugPanel(page);

    await page.evaluate(() => {
      localStorage.setItem('e2e-debug-toolbar-test', JSON.stringify({ foo: 'bar' }));
      localStorage.setItem('e2e-debug-toolbar-test-2', '1');
    });

    await expect.poll(async () => page.evaluate(() => localStorage.length)).toBeGreaterThan(0);

    await Promise.all([
      page.waitForFunction(() => {
        const debugWindow = window as DebugToolbarWindow;
        return debugWindow.__e2eNavigationType === 'reload';
      }),
      page.getByRole('button', { name: '🔄 重置所有数据' }).click(),
    ]);

    await page.waitForLoadState('domcontentloaded');

    await expect.poll(async () => page.evaluate(() => {
      const debugWindow = window as DebugToolbarWindow;
      return debugWindow.__e2eNavigationType;
    })).toBe('reload');
    await expect.poll(async () => page.evaluate(() => {
      const debugWindow = window as DebugToolbarWindow;
      return debugWindow.__e2eStorageLengthAtInit;
    })).toBe(0);
    await expect.poll(async () => page.evaluate(() => {
      const debugWindow = window as DebugToolbarWindow;
      return debugWindow.__e2eStorageKeysAtInit?.length ?? -1;
    })).toBe(0);
  });
});
