import { test, expect } from '@playwright/test';

interface DebugState {
  settings: Record<string, unknown>;
  farm: Record<string, unknown>;
  shed: Record<string, unknown>;
  gene: Record<string, unknown>;
}

function createSeedPayload(): DebugState {
  const now = Date.now();
  const todayKey = new Date(now).toISOString().slice(0, 10);

  return {
    settings: {
      workMinutes: 25,
      shortBreakMinutes: 5,
      theme: 'dark',
      language: 'zh',
    },
    farm: {
      plots: [
        {
          id: 0,
          state: 'growing',
          seedQuality: 'normal',
          varietyId: 'jade-stripe',
          progress: 0.95,
          accumulatedMinutes: 9500,
          plantedDate: todayKey,
          lastUpdateDate: todayKey,
          lastActivityTimestamp: now,
        },
        { id: 1, state: 'empty', progress: 0, accumulatedMinutes: 0, lastActivityTimestamp: 0 },
        { id: 2, state: 'empty', progress: 0, accumulatedMinutes: 0, lastActivityTimestamp: 0 },
        { id: 3, state: 'empty', progress: 0, accumulatedMinutes: 0, lastActivityTimestamp: 0 },
      ],
      collection: [],
      lastActiveDate: todayKey,
      consecutiveInactiveDays: 0,
      lastActivityTimestamp: now,
    },
    shed: {
      seeds: { normal: 5, epic: 0, legendary: 0 },
    },
    gene: {
      fragments: [],
    },
  };
}

async function goToFarm(page: import('@playwright/test').Page) {
  await page.goto('/');
  const farmTab = page.locator('header button').filter({ hasText: '🌱' }).first();
  await farmTab.click();
  await expect(page.locator('.farm-grid-perspective')).toBeVisible();
}

async function openDebugPanel(page: import('@playwright/test').Page) {
  const debugTitle = page.getByText('🧪 Debug Toolbar');
  const resetButton = page.getByRole('button', { name: '🔄 重置所有数据' });
  if (!(await resetButton.isVisible().catch(() => false))) {
    await debugTitle.click();
  }
  await expect(resetButton).toBeVisible();
}

test.describe('Gene Lab & Fragments', () => {
  test('AC1, AC2, AC3: Harvest variety grants gene fragment with correct data, persisted to localStorage', async ({ page }) => {
    const payload = createSeedPayload();
    await page.addInitScript((state: DebugState) => {
      localStorage.clear();
      localStorage.setItem('pomodoro-guide-seen', '1');
      localStorage.setItem('watermelon-debug', 'true');
      localStorage.setItem('pomodoro-settings', JSON.stringify(state.settings));
      localStorage.setItem('watermelon-farm', JSON.stringify(state.farm));
      localStorage.setItem('watermelon-shed', JSON.stringify(state.shed));
      localStorage.setItem('watermelon-genes', JSON.stringify(state.gene));
    }, payload);

    await goToFarm(page);

    // Debug toolbar is already active (watermelon-debug=true in seed data)
    // Open the debug panel and use "instant mature"
    await openDebugPanel(page);
    const matureButton = page.getByRole('button', { name: '⏭️ 立即成熟' });
    await matureButton.click();

    // Close debug panel
    await page.getByText('🧪 Debug Toolbar').first().click();

    // Now harvest the mature plot
    const harvestButton = page.locator('.farm-grid-perspective').getByText('✋ 收获');
    await expect(harvestButton).toBeVisible({ timeout: 5000 });
    await harvestButton.click();

    // Wait for gene fragment to appear in localStorage
    await page.waitForFunction(() => {
      const raw = localStorage.getItem('watermelon-genes');
      if (!raw) return false;
      try {
        const data = JSON.parse(raw);
        return Array.isArray(data.fragments) && data.fragments.length > 0;
      } catch { return false; }
    }, { timeout: 10000 });

    const genes = await page.evaluate(() => {
      const raw = localStorage.getItem('watermelon-genes');
      return raw ? JSON.parse(raw) : null;
    });

    expect(genes).not.toBeNull();
    expect(genes.fragments).toHaveLength(1);
    const fragment = genes.fragments[0];
    expect(fragment.varietyId).toBe('jade-stripe');
    expect(fragment.galaxyId).toBe('thick-earth');
    expect(fragment.rarity).toBe('common');
    expect(fragment.id).toBeTruthy();
    expect(fragment.obtainedAt).toBeTruthy();
  });

  test('AC4: Farm page has Lab tab', async ({ page }) => {
    const payload = createSeedPayload();
    await page.addInitScript((state: DebugState) => {
      localStorage.clear();
      localStorage.setItem('pomodoro-guide-seen', '1');
      localStorage.setItem('pomodoro-settings', JSON.stringify(state.settings));
      localStorage.setItem('watermelon-farm', JSON.stringify(state.farm));
      localStorage.setItem('watermelon-shed', JSON.stringify(state.shed));
    }, payload);

    await goToFarm(page);
    const labTab = page.locator('button').filter({ hasText: '🧬 实验室' });
    await expect(labTab).toBeVisible();
  });

  test('AC5, AC6: Gene Lab shows fragments grouped by galaxy, expandable', async ({ page }) => {
    const payload = createSeedPayload();
    const geneData = {
      fragments: [
        { id: 'test-1', galaxyId: 'thick-earth', varietyId: 'jade-stripe', rarity: 'common', obtainedAt: new Date().toISOString() },
        { id: 'test-2', galaxyId: 'thick-earth', varietyId: 'black-pearl', rarity: 'common', obtainedAt: new Date().toISOString() },
        { id: 'test-3', galaxyId: 'fire', varietyId: 'lava-melon', rarity: 'common', obtainedAt: new Date().toISOString() },
      ],
    };

    await page.addInitScript((args: { state: DebugState; genes: { fragments: Array<Record<string, string>> } }) => {
      localStorage.clear();
      localStorage.setItem('pomodoro-guide-seen', '1');
      localStorage.setItem('pomodoro-settings', JSON.stringify(args.state.settings));
      localStorage.setItem('watermelon-farm', JSON.stringify(args.state.farm));
      localStorage.setItem('watermelon-shed', JSON.stringify(args.state.shed));
      localStorage.setItem('watermelon-genes', JSON.stringify(args.genes));
    }, { state: payload, genes: geneData });

    await goToFarm(page);

    // Switch to Lab tab
    const labTab = page.locator('button').filter({ hasText: '🧬 实验室' });
    await labTab.click();

    // AC5: Verify grouped display
    await expect(page.getByText('基因背包')).toBeVisible();

    // Thick-earth group (厚土星系) - use aria-expanded to target the inventory section
    const earthGroup = page.locator('button[aria-expanded]').filter({ hasText: '厚土星系' });
    await expect(earthGroup).toBeVisible();
    await expect(earthGroup).toContainText('2 份');

    // Fire group (火焰星系)
    const fireGroup = page.locator('button[aria-expanded]').filter({ hasText: '火焰星系' });
    await expect(fireGroup).toBeVisible();
    await expect(fireGroup).toContainText('1 份');

    // AC6: Click to expand thick-earth group
    await earthGroup.click();
    await expect(page.getByText('翠纹瓜')).toBeVisible();
    await expect(page.getByText('黑珍珠')).toBeVisible();
  });

  test('AC7: i18n support - English', async ({ page }) => {
    const payload = createSeedPayload();
    payload.settings.language = 'en';

    await page.addInitScript((state: DebugState) => {
      localStorage.clear();
      localStorage.setItem('pomodoro-guide-seen', '1');
      localStorage.setItem('pomodoro-settings', JSON.stringify(state.settings));
      localStorage.setItem('watermelon-farm', JSON.stringify(state.farm));
      localStorage.setItem('watermelon-shed', JSON.stringify(state.shed));
      localStorage.setItem('watermelon-genes', JSON.stringify(state.gene));
    }, payload);

    await goToFarm(page);

    const labTab = page.locator('button').filter({ hasText: '🧬 Lab' });
    await expect(labTab).toBeVisible();
    await labTab.click();

    await expect(page.getByText('Gene Inventory')).toBeVisible();
    await expect(page.getByText('No gene fragments yet')).toBeVisible();
  });
});
