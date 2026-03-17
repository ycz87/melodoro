# Issue #39 Proof - 农场图鉴首页：当前阶段 / 下一里程碑 / 五行共鸣进度

## 实现摘要

在图鉴首页顶部新增三张引导卡片，展示收集进度的关键信息：

1. **当前阶段卡片** - 显示玩家当前所处的收集阶段（core-discovery / core-expansion / five-element-resonance / prismatic-journey / dark-matter-journey / collection-complete）
2. **下一里程碑卡片** - 显示下一个待解锁的星系或收集目标，附带进度条
3. **五行共鸣进度卡片** - 显示五大核心星系的收集状态和杂交品种进度

## 改动文件

- `src/farm/galaxy.ts` - 新增 `getCollectionGuideSnapshot()` 函数和相关类型定义
- `src/components/CollectionPage.tsx` - 新增 `CollectionGuideOverview` 组件
- `src/i18n/types.ts` - 新增 19 个 i18n key 类型定义
- `src/i18n/locales/{zh,zhTW,en,ja,ko,es,fr,de,ru}.ts` - 补充 9 个 locale 的完整翻译

## 构建验证

```bash
npm run build
```

✅ 编译通过，无 TypeScript 错误

## 功能验证

使用 Debug Toolbar 注入测试数据（25 个品种），验证以下场景：

### 场景 1：Core Expansion 阶段
- 当前阶段：五星扩张
- 下一里程碑：解锁 Wood（完成 2 个核心星系）
- 五行共鸣：5 个核心星系中 4 个已点亮，杂交品种 0/3

### UI 表现
- 三张卡片在手机端（390x844）和桌面端（1440x900）均正常显示
- 响应式布局：手机端单列，桌面端三列网格
- 五行共鸣卡片显示 5 个星系的收集状态，未收集的星系显示灰色
- 进度条和文案与 Issue #23 正式 progression 规则一致

## Proof 截图

- `proof-mobile-390x844.jpg` - 手机端主用口径验证
- `proof-desktop-1440x900.jpg` - 桌面端 spot-check

## 已知问题

无

## 回归风险

低 - 仅在 CollectionPage 顶部新增组件，不影响现有图鉴列表和详情功能
