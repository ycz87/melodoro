# E-001-T02 对比工具固定化（三联对比一键产出）

## 一键命令

```bash
npm run compare:e001-t02
```

## 输出规则（固定）

- 目录：`artifacts/e001-t02/<UTC时间戳>/`
- 文件：
  - `E-001-T02-compare-desktop.png`
  - `E-001-T02-compare-mobile.png`
  - `E-001-T02-compare-detail.png`
- 附加产物：
  - `E-001-T02-summary.json`（记录 runId 和产物路径）

## 对比图标注约定

- 左侧：`Reference (E-001-T01 baseline)`
- 右侧：`Current Implementation`
- 图头包含 `E-001-T02` 与 viewport 名称，便于验收留痕和回溯。

## 依赖与前置

- 已安装项目依赖（含 `playwright` 与 `sharp`）
- 已存在基线图：`baseline/e001-t01/e001-t01-baseline-*.png`
