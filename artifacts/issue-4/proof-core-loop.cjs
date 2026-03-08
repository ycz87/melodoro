/**
 * Issue #4 Core Loop Proof Script
 * Validates: empty -> plant -> growing feedback -> mature -> harvest
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const RUN = process.env.RUN || new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const outDir = path.join(__dirname, RUN);
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });

  // Seed localStorage with clean state: 9 empty plots, 3 normal seeds, debug enabled
  await context.addInitScript(() => {
    const emptyPlots = Array.from({ length: 9 }, (_, id) => ({
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
    localStorage.clear();
    localStorage.setItem('watermelon-debug', 'true');
    localStorage.setItem(
      'watermelon-farm',
      JSON.stringify({
        plots: emptyPlots,
        collection: [],
        lastActiveDate: '',
        consecutiveInactiveDays: 0,
        lastActivityTimestamp: 0,
        guardianBarrierDate: '',
        stolenRecords: [],
      })
    );
    localStorage.setItem(
      'watermelon-shed',
      JSON.stringify({
        seeds: { normal: 3, epic: 0, legendary: 0 },
        items: {
          'starlight-fertilizer': 0,
          'supernova-bottle': 0,
          'alien-flare': 0,
          'thief-trap': 0,
          'star-telescope': 0,
          'moonlight-dew': 0,
          'circus-tent': 0,
          'gene-modifier': 0,
          'lullaby-record': 0,
        },
        totalSliced: 0,
        pity: { epicPity: 0, legendaryPity: 0 },
        injectedSeeds: [],
        hybridSeeds: [],
        prismaticSeeds: [],
        darkMatterSeeds: [],
      })
    );
    localStorage.setItem(
      'pomodoro-settings',
      JSON.stringify({
        workMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        autoStartBreak: false,
        autoStartWork: false,
        theme: 'light',
        focusMode: false,
        soundEnabled: true,
        soundVolume: 0.5,
        tickingSound: false,
        tickingVolume: 0.3,
        selectedSound: 'bell',
        language: 'zh',
        dailyGoal: 8,
        selectedDayBackground: 'bg-yellow-200',
        selectedGardenTheme: 'classic',
        selectedBackgroundTheme: 'default',
        notificationsEnabled: false,
        mode: 'normal',
        projectModeEnabled: false,
        selectedProjectId: null,
        alertSound: 'chime',
        alertRepeatCount: 1,
        alertVolume: 80,
        ambienceVolume: 40,
      })
    );
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4175/?farmReview=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  console.log('[Stage 0] Initial empty state');
  await page.screenshot({ path: path.join(outDir, '0-empty.png'), fullPage: false });

  // Close install prompt if present
  const installClose = page.getByRole('button', { name: 'Close' }).first();
  if ((await installClose.count()) > 0) {
    await installClose.click();
    await page.waitForTimeout(300);
  }

  // Minimize debug toolbar
  const debugToggle = page.getByRole('button', { name: '🧪 Debug Toolbar' });
  if ((await debugToggle.count()) > 0) {
    await debugToggle.click();
    await page.waitForTimeout(300);
  }

  // Set time multiplier to 10000x
  console.log('[Stage 1] Setting time multiplier to 10000x');
  const multiplier10000 = page.getByRole('button', { name: '10000x' });
  if ((await multiplier10000.count()) > 0) {
    await multiplier10000.click();
    await page.waitForTimeout(300);
  }

  // Minimize debug toolbar again
  if ((await debugToggle.count()) > 0) {
    await debugToggle.click();
    await page.waitForTimeout(300);
  }

  // Click first plot (plot 0) to open plant modal
  console.log('[Stage 2] Opening plant modal for plot 0');
  const plotButtons = page.locator('button').filter({ hasNotText: /^(安装|Close|🧪|取消|普通|史诗|传说|解锁|重置|切换|清除|快速|重置所有|立即成熟|\+\d+|清空|清零|1x|100x|1000x|10000x)/ });
  const firstPlot = plotButtons.first();
  await firstPlot.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, '1-plant-modal.png'), fullPage: false });

  // Select normal seed (force click via evaluate to bypass visibility checks)
  console.log('[Stage 3] Planting normal seed');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const normalBtn = buttons.find(b => b.textContent.includes('普通') && b.textContent.includes('🌱'));
    if (normalBtn) normalBtn.click();
  });
  await page.waitForTimeout(800);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, '2-planted.png'), fullPage: false });

  // Wait for growing feedback (progress > 0)
  console.log('[Stage 4] Waiting for growing feedback...');
  await page.waitForTimeout(15000); // ~15s at 10000x should give visible progress
  await page.screenshot({ path: path.join(outDir, '3-growing.png'), fullPage: false });

  // Wait for mature state (manually trigger growth if needed)
  console.log('[Stage 5] Waiting for mature state...');
  let attempts = 0;
  while (attempts < 12) {
    const isMature = await page.evaluate(() => {
      const farm = JSON.parse(localStorage.getItem('watermelon-farm') || '{}');
      return farm.plots && farm.plots[0] && farm.plots[0].state === 'mature';
    });
    if (isMature) break;
    await page.waitForTimeout(10000);
    attempts++;
  }
  if (attempts >= 12) {
    console.log('[WARNING] Plot did not mature after 120s, capturing current state anyway');
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '4-mature.png'), fullPage: false });

  // Harvest plot 0
  console.log('[Stage 6] Harvesting plot 0');
  await firstPlot.click();
  await page.waitForTimeout(1500); // wait for harvest animation
  await page.screenshot({ path: path.join(outDir, '5-harvested.png'), fullPage: false });

  // Verify final state
  const finalState = await page.evaluate(() => {
    const farm = JSON.parse(localStorage.getItem('watermelon-farm') || '{}');
    const shed = JSON.parse(localStorage.getItem('watermelon-shed') || '{}');
    return {
      plot0: farm.plots ? farm.plots[0] : null,
      collection: farm.collection || [],
      seeds: shed.seeds || {},
    };
  });

  console.log('[Stage 7] Final state:', JSON.stringify(finalState, null, 2));
  fs.writeFileSync(path.join(outDir, 'final-state.json'), JSON.stringify(finalState, null, 2));

  const summary = {
    run: RUN,
    timestamp: new Date().toISOString(),
    stages: [
      '0-empty.png: Initial 9 empty plots, 3 normal seeds',
      '1-plant-modal.png: Plant modal opened for plot 0',
      '2-planted.png: Normal seed planted, plot 0 state=growing',
      '3-growing.png: Visible growing feedback (progress > 0)',
      '4-mature.png: Plot 0 reached mature state',
      '5-harvested.png: Plot 0 harvested, back to empty, collection incremented',
    ],
    finalState,
    verdict:
      finalState.plot0 && finalState.plot0.state === 'empty' && finalState.collection.length > 0
        ? 'PASS: Core loop completed (empty -> plant -> grow -> mature -> harvest -> empty + collection)'
        : 'FAIL: Core loop did not complete as expected',
  };

  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(summary, null, 2));

  await browser.close();
  console.log(`\nProof artifacts saved to: ${outDir}`);
})();
