import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const OUTPUT_DIR = '/tmp/cosmelon-issue24/artifacts/issue24/20260315-061924Z';
const REPORT_PATH = path.join(OUTPUT_DIR, 'lint-report.json');
const RAW_PATH = path.join(OUTPUT_DIR, 'lint-raw.txt');
const data = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const lintCommand = `npm run lint > ${path.relative(process.cwd(), RAW_PATH)} 2>&1`;
const jsonCommand = `npx eslint . -f json -o ${path.relative(process.cwd(), REPORT_PATH)}`;

function rel(filePath) {
  return path.relative(process.cwd(), filePath).replaceAll('\\', '/');
}

function moduleName(relPath) {
  const parts = relPath.split('/');
  if (parts[0] === 'src' && parts[1]) return `src/${parts[1]}`;
  if (parts[0] === 'auth' && parts[1]) return 'auth';
  return parts[0];
}

function ruleFamily(ruleId) {
  if (!ruleId) return 'unknown';
  const slash = ruleId.indexOf('/');
  return slash === -1 ? ruleId : ruleId.slice(0, slash);
}

function autoFixability(messages) {
  const fixed = messages.filter((message) => Object.prototype.hasOwnProperty.call(message, 'fix')).length;
  if (fixed === 0) return 'no';
  if (fixed === messages.length) return 'yes';
  return 'partial';
}

let totalErrors = 0;
let totalWarnings = 0;
let totalFixable = 0;
const fileRuleMap = new Map();
const moduleCounts = new Map();
const ruleCounts = new Map();
const autoFixCounts = new Map();
const topFiles = [];

for (const file of data) {
  const messages = file.messages ?? [];
  if (messages.length === 0) continue;
  const relPath = rel(file.filePath);
  const mod = moduleName(relPath);
  const fileMessageCount = messages.length;
  topFiles.push({ file: relPath, count: fileMessageCount });
  moduleCounts.set(mod, (moduleCounts.get(mod) ?? 0) + fileMessageCount);
  totalFixable += (file.fixableErrorCount ?? 0) + (file.fixableWarningCount ?? 0);

  for (const message of messages) {
    if (message.severity === 2) totalErrors += 1;
    if (message.severity === 1) totalWarnings += 1;
    const ruleId = message.ruleId ?? '(no-rule-id)';
    const key = `${relPath}__${ruleId}`;
    const current = fileRuleMap.get(key) ?? {
      file: relPath,
      module: mod,
      ruleId,
      ruleFamily: ruleFamily(ruleId),
      severity: message.severity === 2 ? 'error' : 'warning',
      count: 0,
      autoFixability: 'no',
      lines: [],
      sampleMessages: [],
    };
    current.count += 1;
    current.lines.push(`${message.line}:${message.column}`);
    if (current.sampleMessages.length < 3) current.sampleMessages.push(message.message.replace(/\s+/g, ' ').trim());
    fileRuleMap.set(key, current);
    ruleCounts.set(ruleId, (ruleCounts.get(ruleId) ?? 0) + 1);
  }
}

const debtRows = [...fileRuleMap.values()]
  .map((row) => {
    const messages = data
      .find((file) => rel(file.filePath) === row.file)
      .messages
      .filter((message) => (message.ruleId ?? '(no-rule-id)') === row.ruleId);
    const fixability = autoFixability(messages);
    autoFixCounts.set(fixability, (autoFixCounts.get(fixability) ?? 0) + row.count);
    return {
      ...row,
      autoFixability: fixability,
      lines: row.lines.join(', '),
      sampleMessages: row.sampleMessages.join(' | '),
    };
  })
  .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file) || a.ruleId.localeCompare(b.ruleId));

const topRules = [...ruleCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([ruleId, count]) => ({ ruleId, count }));

const topModules = [...moduleCounts.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([module, count]) => ({ module, count }));

const topDebtFiles = topFiles
  .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file))
  .slice(0, 10);

const metadata = {
  issue: 24,
  generatedAt: new Date().toISOString(),
  branch,
  commit,
  version,
  lintCommand,
  jsonCommand,
  rawOutput: path.relative(process.cwd(), RAW_PATH),
  jsonOutput: path.relative(process.cwd(), REPORT_PATH),
  totals: {
    filesWithDebt: topFiles.length,
    messages: totalErrors + totalWarnings,
    errors: totalErrors,
    warnings: totalWarnings,
    fixableWithEslintFix: totalFixable,
  },
};

const summary = {
  ...metadata,
  topRules,
  topModules,
  topDebtFiles,
  autoFixCounts: {
    yes: autoFixCounts.get('yes') ?? 0,
    partial: autoFixCounts.get('partial') ?? 0,
    no: autoFixCounts.get('no') ?? 0,
  },
};

const csvHeader = [
  'file',
  'module',
  'ruleId',
  'ruleFamily',
  'severity',
  'count',
  'autoFixability',
  'lines',
  'sampleMessages',
];
const csvLines = [csvHeader.join(',')];
for (const row of debtRows) {
  const values = csvHeader.map((key) => {
    const value = String(row[key] ?? '');
    return `"${value.replaceAll('"', '""')}"`;
  });
  csvLines.push(values.join(','));
}

const summaryMd = `# Issue #24 lint baseline debt summary\n\n- Version: \`v${version}\`\n- Branch: \`${branch}\`\n- Commit: \`${commit}\`\n- Raw lint command: \`${lintCommand}\`\n- JSON lint command: \`${jsonCommand}\`\n\n## Totals\n\n- Files with debt: ${summary.totals.filesWithDebt}\n- Total messages: ${summary.totals.messages}\n- Errors: ${summary.totals.errors}\n- Warnings: ${summary.totals.warnings}\n- Built-in ESLint auto-fixable messages: ${summary.totals.fixableWithEslintFix}\n\n## Main concentration\n\n### Top modules\n${topModules.map(({ module, count }) => `- ${module}: ${count}`).join('\n')}\n\n### Top rules\n${topRules.map(({ ruleId, count }) => `- ${ruleId}: ${count}`).join('\n')}\n\n### Top files\n${topDebtFiles.map(({ file, count }) => `- ${file}: ${count}`).join('\n')}\n\n## Auto-fixability split\n\n- Auto-fixable now: ${summary.autoFixCounts.yes}\n- Partially auto-fixable: ${summary.autoFixCounts.partial}\n- Manual-only in current baseline: ${summary.autoFixCounts.no}\n\n## Short governance policy\n\n- This issue is baseline inventory + split planning only, not repo-wide cleanup.\n- New changes should not introduce new lint debt.\n- Historical lint debt should be retired through dedicated cleanup issues, not mixed into feature work.\n`;

const splitPlanMd = `# Issue #24 follow-up split plan\n\n## Recommended sequencing\n\n1. Start with the lowest-risk manual sweep: E2E tests (\`@typescript-eslint/no-unused-vars\`, \`@typescript-eslint/no-explicit-any\`).\n2. Then isolate React hook rule clusters in UI components with the highest density (\`react-hooks/purity\`, \`react-hooks/set-state-in-effect\`).\n3. After the dense component clusters, clean App shell / shared hooks (\`react-hooks/exhaustive-deps\`, \`react-hooks/refs\`).\n4. Leave singleton leftovers and plugin-specific one-offs to the final sweep.\n\n## Candidate follow-up issues\n\n1. **仓库治理：E2E 测试 lint 低风险手工清理**\n   - Scope: \`e2e/debug-toolbar.spec.ts\`, \`e2e/farm-layout-v023.spec.ts\`, \`e2e/farm-mobile-square.spec.ts\`, \`e2e/gene-lab.spec.ts\`, \`e2e/market-buy.spec.ts\`, \`e2e/market-sell.spec.ts\`, \`e2e/mutation.spec.ts\`\n   - Rules: \`@typescript-eslint/no-explicit-any\`, \`@typescript-eslint/no-unused-vars\`\n   - Why: test-only scope, low product risk, 13 messages can be retired without touching runtime code.\n\n2. **仓库治理：庆典/动效组件 React Hooks purity 清理**\n   - Scope: \`src/components/CelebrationOverlay.tsx\`, \`src/components/AchievementCelebration.tsx\`, \`src/components/HistoryPanel.tsx\`\n   - Rules: \`react-hooks/purity\`, \`react-hooks/rules-of-hooks\`\n   - Why: 15+ messages are concentrated in a small celebration cluster, making it a self-contained medium-risk cleanup.\n\n3. **仓库治理：农场/实验室页面 set-state-in-effect 清理**\n   - Scope: \`src/components/FarmPage.tsx\`, \`src/components/GeneLabPage.tsx\`, \`src/components/AchievementsPage.tsx\`, \`src/components/Guide.tsx\`, \`src/components/InstallPrompt.tsx\`, \`src/components/ProjectExitModal.tsx\`, \`src/components/Timer.tsx\`\n   - Rules: \`react-hooks/set-state-in-effect\`, plus nearby \`no-unused-vars\` in \`FarmPage.tsx\`\n   - Why: 13 messages share the same hook lifecycle smell and should be reviewed together for consistent fixes.\n\n4. **仓库治理：App shell 与定时器 hooks 依赖/refs 清理**\n   - Scope: \`src/App.tsx\`, \`src/hooks/useTimer.ts\`, \`src/hooks/useProjectTimer.ts\`, \`src/components/AmbienceMixerModal.tsx\`, \`src/components/CodeInput.tsx\`, \`src/hooks/useGeneStorage.ts\`, \`src/hooks/useWarehouse.ts\`, \`src/hooks/useAlienVisit.ts\`\n   - Rules: \`react-hooks/exhaustive-deps\`, \`react-hooks/refs\`, remaining \`react-hooks/set-state-in-effect\`\n   - Why: app shell and shared hooks have cross-cutting timer/state dependencies; fix together to avoid churn.\n\n5. **仓库治理：视觉层与插件专项 lint 收尾**\n   - Scope: \`src/components/farm/SkyLayer.tsx\`, \`src/components/SlicingScene.tsx\`, \`src/components/farm-v2/FarmPlotTileV2.tsx\`, \`src/hooks/useWeeklyShop.ts\`, \`src/hooks/useAuth.ts\`, \`auth/src/routes/auth.ts\`, \`src/components/FarmPixiPhase0Prototype.tsx\`\n   - Rules: \`react-hooks/purity\`, \`react-hooks/static-components\`, \`react-refresh/only-export-components\`, \`react-hooks/immutability\`, \`@typescript-eslint/no-unused-vars\`, \`react-hooks/exhaustive-deps\`\n   - Why: small-count leftovers span multiple plugin families and are better handled as the final catch-all sweep.\n\n## Rationale\n\n- Split first by **risk surface**: tests before production UI.\n- Inside runtime code, split by **rule cluster** so a single issue can apply one consistent fixing strategy.\n- Keep this governance rule in force: feature PRs must stay lint-neutral or lint-improving; historical debt belongs to dedicated cleanup issues only.\n`;

const readme = `# Issue #24 artifacts\n\n## Files\n\n- \`lint-raw.txt\`: original \`npm run lint\` output\n- \`lint-report.json\`: raw ESLint JSON output\n- \`lint-debt-by-file-rule.csv\`: structured debt inventory (file / rule / auto-fixability)\n- \`lint-debt-by-file-rule.json\`: same inventory in JSON\n- \`lint-summary.json\`: machine-readable aggregate counts\n- \`lint-baseline-summary.md\`: readable summary with totals and governance policy\n- \`lint-split-plan.md\`: recommended follow-up split and sequencing\n- \`run-metadata.json\`: branch / commit / version / commands used\n`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'run-metadata.json'), JSON.stringify(metadata, null, 2));
fs.writeFileSync(path.join(OUTPUT_DIR, 'lint-summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(OUTPUT_DIR, 'lint-debt-by-file-rule.json'), JSON.stringify(debtRows, null, 2));
fs.writeFileSync(path.join(OUTPUT_DIR, 'lint-debt-by-file-rule.csv'), `${csvLines.join('\n')}\n`);
fs.writeFileSync(path.join(OUTPUT_DIR, 'lint-baseline-summary.md'), summaryMd);
fs.writeFileSync(path.join(OUTPUT_DIR, 'lint-split-plan.md'), splitPlanMd);
fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readme);
