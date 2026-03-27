import { test, expect, type Page } from '@playwright/test';
import { createEmptyPlot, type Plot } from '../src/types/farm';
import { SHOP_ITEMS, PLOT_PRICES, type ShopItemId } from '../src/types/market';
import { zh } from '../src/i18n/locales/zh';
import { en } from '../src/i18n/locales/en';
import { ja } from '../src/i18n/locales/ja';
import { ko } from '../src/i18n/locales/ko';
import { de } from '../src/i18n/locales/de';
import { fr } from '../src/i18n/locales/fr';
import { es } from '../src/i18n/locales/es';
import { pt } from '../src/i18n/locales/pt';

type LocaleCode = 'zh' | 'en' | 'ja' | 'ko' | 'de' | 'fr' | 'es' | 'pt';

interface DebugState {
  settings: Record<string, unknown>;
  farm: {
    plots: Plot[];
    collection: Array<Record<string, unknown>>;
    lastActiveDate: string;
    consecutiveInactiveDays: number;
    lastActivityTimestamp: number;
  };
  shed: {
    seeds: { normal: number; epic: number; legendary: number };
    items: Record<string, number>;
    totalSliced: number;
    pity: { epicPity: number; legendaryPity: number };
    injectedSeeds: Array<Record<string, unknown>>;
    hybridSeeds: Array<Record<string, unknown>>;
  };
  gene: {
    fragments: Array<Record<string, unknown>>;
  };
  coins: { balance: number };
}

function createSeedPayload(options?: {
  language?: LocaleCode;
  balance?: number;
  plotCount?: number;
}): DebugState {
  const now = Date.now();
  const todayKey = new Date(now).toISOString().slice(0, 10);
  const plotCount = options?.plotCount ?? 4;

  return {
    settings: {
      workMinutes: 25,
      shortBreakMinutes: 5,
      theme: 'dark',
      language: options?.language ?? 'zh',
    },
    farm: {
      plots: Array.from({ length: plotCount }, (_, index) => createEmptyPlot(index)),
      collection: [],
      lastActiveDate: todayKey,
      consecutiveInactiveDays: 0,
      lastActivityTimestamp: now,
    },
    shed: {
      seeds: { normal: 0, epic: 0, legendary: 0 },
      items: {},
      totalSliced: 0,
      pity: { epicPity: 0, legendaryPity: 0 },
      injectedSeeds: [],
      hybridSeeds: [],
    },
    gene: {
      fragments: [],
    },
    coins: {
      balance: options?.balance ?? 0,
    },
  };
}

async function bootWithSeed(page: Page, payload: DebugState) {
  await page.goto('/');
  await page.evaluate((state: DebugState) => {
    localStorage.clear();
    localStorage.setItem('pomodoro-guide-seen', '1');
    localStorage.setItem('pomodoro-settings', JSON.stringify(state.settings));
    localStorage.setItem('watermelon-farm', JSON.stringify(state.farm));
    localStorage.setItem('watermelon-shed', JSON.stringify(state.shed));
    localStorage.setItem('watermelon-genes', JSON.stringify(state.gene));
    localStorage.setItem('watermelon-coins', JSON.stringify(state.coins));
  }, payload);
  await page.reload();
}

async function goToMarket(page: Page) {
  await page.getByRole('button', { name: '🏪' }).click();
  await expect(page.getByRole('heading', { name: zh.marketTitle })).toBeVisible();
}

async function openBuyTab(page: Page) {
  await page.getByRole('button', { name: zh.marketTabBuy }).click();
}

function getItemCard(page: Page, itemId: ShopItemId) {
  return page.locator('button').filter({ hasText: zh.itemName(itemId) }).first();
}

function getPlotCard(page: Page, plotIndex: number) {
  return page.locator('button').filter({ hasText: zh.marketPlotName(plotIndex) }).first();
}

async function readBalance(page: Page): Promise<number> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('watermelon-coins');
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { balance?: unknown };
    return typeof parsed.balance === 'number' ? parsed.balance : 0;
  });
}

async function readShedItemCount(page: Page, itemId: ShopItemId): Promise<number> {
  return page.evaluate((targetId: ShopItemId) => {
    const raw = localStorage.getItem('watermelon-shed');
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { items?: Record<string, unknown> };
    const count = parsed.items?.[targetId];
    return typeof count === 'number' ? count : 0;
  }, itemId);
}

test.describe('Market Buy', () => {
  test('AC1: 14 种常驻商品在买 Tab 正确展示', async ({ page }) => {
    expect(SHOP_ITEMS).toHaveLength(14);

    await bootWithSeed(page, createSeedPayload({ balance: 9999 }));
    await goToMarket(page);
    await openBuyTab(page);

    for (const item of SHOP_ITEMS) {
      await expect(getItemCard(page, item.id), `missing item: ${item.id}`).toBeVisible();
    }
  });

  test('AC2: 购买道具后瓜币减少、道具出现在背包', async ({ page }) => {
    await bootWithSeed(page, createSeedPayload({ balance: 100 }));

    await goToMarket(page);
    await openBuyTab(page);

    await getItemCard(page, 'star-dew').click();
    await expect(page.getByRole('heading', { name: zh.marketBuyConfirmTitle })).toBeVisible();
    await page.getByRole('button', { name: zh.marketBuyConfirmButton }).click();

    await page.waitForFunction(() => {
      const coinRaw = localStorage.getItem('watermelon-coins');
      const shedRaw = localStorage.getItem('watermelon-shed');
      if (!coinRaw || !shedRaw) return false;

      const coins = JSON.parse(coinRaw) as { balance?: unknown };
      const shed = JSON.parse(shedRaw) as { items?: Record<string, unknown> };
      return coins.balance === 80 && shed.items?.['star-dew'] === 1;
    });

    expect(await readBalance(page)).toBe(80);
    expect(await readShedItemCount(page, 'star-dew')).toBe(1);
  });

  test('AC3: 余额不足时无法购买，按钮置灰', async ({ page }) => {
    await bootWithSeed(page, createSeedPayload({ balance: 10 }));

    await goToMarket(page);
    await openBuyTab(page);

    await expect(getItemCard(page, 'star-dew')).toBeDisabled();
  });

  test('AC4: 地块购买逻辑正确（PLOT_PRICES 数据验证）', async () => {
    // 验证地块价格数据完整性
    expect(PLOT_PRICES[4]).toBe(200);
    expect(PLOT_PRICES[5]).toBe(500);
    expect(PLOT_PRICES[6]).toBe(1000);
    expect(PLOT_PRICES[7]).toBe(2000);
    expect(PLOT_PRICES[8]).toBe(5000);
    // 只有 5 个可购买地块（第 5-9 块）
    expect(Object.keys(PLOT_PRICES)).toHaveLength(5);
  });

  test('AC5: 已解锁地块不显示购买选项', async ({ page }) => {
    // 7 块地全部解锁
    await bootWithSeed(page, createSeedPayload({ balance: 9999, plotCount: 7 }));

    await goToMarket(page);
    await openBuyTab(page);

    // 所有地块都应该显示已解锁
    const plot9 = getPlotCard(page, 8);
    await expect(plot9).toBeVisible();
    await expect(plot9).toContainText(zh.marketPlotUnlocked);
    await expect(plot9).toBeDisabled();
  });

  test('AC6: 购买确认弹窗显示正确信息', async ({ page }) => {
    await bootWithSeed(page, createSeedPayload({ balance: 100 }));

    await goToMarket(page);
    await openBuyTab(page);

    await getItemCard(page, 'star-dew').click();

    const modal = page.locator('[data-modal-overlay]').first();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(zh.marketBuyConfirmTitle);
    await expect(modal).toContainText(zh.itemName('star-dew'));
    await expect(modal).toContainText('20');
    await expect(modal).toContainText('100');
    await expect(modal).toContainText(
      zh.marketBuyConfirmMessage(zh.itemName('star-dew'), 20, 100),
    );
  });

  test('AC7: i18n 8 语言无遗漏（买 Tab key）', async () => {
    const locales: Record<LocaleCode, Record<string, unknown>> = {
      zh: zh as unknown as Record<string, unknown>,
      en: en as unknown as Record<string, unknown>,
      ja: ja as unknown as Record<string, unknown>,
      ko: ko as unknown as Record<string, unknown>,
      de: de as unknown as Record<string, unknown>,
      fr: fr as unknown as Record<string, unknown>,
      es: es as unknown as Record<string, unknown>,
      pt: pt as unknown as Record<string, unknown>,
    };

    const stringKeys = [
      'marketBuyConfirmTitle',
      'marketBuyConfirmButton',
      'marketBuyCancelButton',
      'marketBuySuccess',
      'marketPlotSection',
      'marketPlotUnlocked',
      'marketPlotConfirmTitle',
    ] as const;

    const functionKeys = [
      'marketBuyConfirmMessage',
      'marketPlotName',
      'marketPlotConfirmMessage',
    ] as const;

    expect(SHOP_ITEMS).toHaveLength(14);

    for (const [localeName, messages] of Object.entries(locales)) {
      for (const key of stringKeys) {
        expect(typeof messages[key], `${localeName}.${key} should be string`).toBe('string');
      }

      for (const key of functionKeys) {
        expect(typeof messages[key], `${localeName}.${key} should be function`).toBe('function');
      }

      const itemName = messages.itemName;
      expect(typeof itemName, `${localeName}.itemName should be function`).toBe('function');
      if (typeof itemName !== 'function') continue;

      const itemNameFn = itemName as (id: ShopItemId) => string;
      for (const item of SHOP_ITEMS) {
        const translated = itemNameFn(item.id);
        expect(typeof translated, `${localeName}.itemName(${item.id}) should be string`).toBe('string');
        expect(translated.length, `${localeName}.itemName(${item.id}) should not be empty`).toBeGreaterThan(0);
        expect(translated, `${localeName}.itemName(${item.id}) should not fallback to id`).not.toBe(item.id);
      }
    }
  });
});
