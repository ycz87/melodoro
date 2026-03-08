# Issue #8 修复验收材料

## 基本信息

- **Issue:** #8 农场手机端横向溢出与右侧黑边修复
- **版本:** v0.61.6
- **分支:** `feature/issue8-mobile-overflow`
- **基线 commit:** `6ef3812` (origin/main)
- **时间戳:** 2026-03-08 12:34:12 UTC

## 问题描述

生产站 `v0.61.5` 复核时发现：农场页在手机端（`390x844` / `360x800`）出现横向溢出，右侧露出明显黑边。

**根因:**
- `FarmPlotBoardV2` 根容器在手机端使用了 `overflow-visible`
- 两层装饰元素（底部阴影 + HUD 背景）横向越界，导致 `scrollWidth > innerWidth`

## 修复方案

**改动文件:** `src/components/farm-v2/FarmPlotBoardV2.tsx`

**改动内容:**
```diff
- className={`relative w-full ${useTightMobileSpacing ? 'overflow-visible' : 'overflow-hidden'}`}
+ className="relative w-full overflow-hidden"
```

**说明:**
- 统一使用 `overflow-hidden`，裁剪越界装饰元素
- 不影响地块交互、种植弹窗、数据联动等已通过功能

## 验收结果

### ✅ 手机端横向溢出修复

| 口径 | innerWidth | scrollWidth | 结果 |
|------|-----------|------------|------|
| 390x844 | 390 | 390 | ✅ 无溢出 |
| 360x800 | 360 | 360 | ✅ 无溢出 |

### ✅ 无种子边界保持正常

- 点击空地仍弹出种植弹窗
- 三类种子均显示 `×0` 且为 `disabled`
- 符合 Issue #6 验收口径

### ✅ 桌面端无明显回退

- `1440x900` 下农场页面正常显示
- `scrollWidth = innerWidth = 1440`
- 地块布局、装饰、交互均无异常

## 截图

- `mobile-390x844.png` — 390x844 手机端农场页
- `mobile-360x800.png` — 360x800 手机端农场页
- `desktop-1440x900.png` — 1440x900 桌面端农场页

## 交付清单

- [x] 版本号已更新至 `v0.61.6`
- [x] 手机端 `390x844` / `360x800` 无横向溢出
- [x] 无种子边界保持正常（种植弹窗 + disabled 状态）
- [x] 桌面端 `1440x900` 无明显回退
- [x] 截图已归档至 `artifacts/issue-8/20260308-123412Z/`
- [x] 改动已提交至 `feature/issue8-mobile-overflow` 分支

## 下一步

等待 PM 验收通过后：
1. 提交 commit 并 push
2. 创建 PR 合并至 `main`
3. 部署至生产环境
