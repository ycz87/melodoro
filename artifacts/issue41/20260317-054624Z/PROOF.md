# Issue #41 Proof — 农场里程碑奖励发放 / 记录 / 持久化

## 变更范围

本单为农场 progression 建立统一的 milestone reward source of truth：

- 新增 `src/farm/milestoneRewards.ts` 统一定义 12 个里程碑与 16 个奖励
- `FarmStorage` 新增 `milestoneRewards` 持久化字段（`milestones[]` + `rewards[]`）
- 达成时按 `live` / `backfill` 两种来源写入记录
- 同一奖励只会被记一次，不因 reload / 重复进入页面 / 重复收获重复发放
- 图鉴首页新增“里程碑奖励”账本，作为稳定可见入口
- 宇宙之心从 ad hoc 自动插入，改为纳入统一里程碑奖励系统

## 基础验证

### `npm run lint`

```bash
> pomodoro@0.61.13 lint
> eslint .
```

结果：通过（exit 0）

### `npm run build`

```bash
> pomodoro@0.61.13 build
> tsc -b && vite build
...
✓ built in 4.38s
```

结果：通过（exit 0）

备注：仍存在既有 Vite CSS warning（`rounded-[var(--radius-*)]`），为仓库已有 warning，本单未扩大处理。

### `git diff --check`

```bash
(no output)
```

结果：通过（exit 0）

## Proof 1 — 首次达成发放（live grant）

### 初始状态
通过浏览器 `localStorage` 注入一个仅有 2 个品种的农场存档：

- `collection = ['jade-stripe', 'black-pearl']`
- `milestoneRewards = { milestones: [], rewards: [] }`

读取结果：

```json
{
  "milestones": [],
  "rewards": [],
  "collection": ["jade-stripe", "black-pearl"]
}
```

### 触发动作
在 Debug Toolbar 点击 `🌱 +3品种`，使图鉴从 2 个品种增长到 5 个品种。

### 发放结果
再次读取 `watermelon-farm.milestoneRewards`：

```json
{
  "collectionCount": 5,
  "milestones": [
    {"milestoneId": "collect-3-varieties", "achievedAt": "2026-03-17", "source": "live"},
    {"milestoneId": "collect-5-varieties", "achievedAt": "2026-03-17", "source": "live"},
    {"milestoneId": "unlock-fire-galaxy", "achievedAt": "2026-03-17", "source": "live"}
  ],
  "rewards": [
    {"rewardId": "plot-5", "milestoneId": "collect-3-varieties", "grantedAt": "2026-03-17", "source": "live"},
    {"rewardId": "plot-6", "milestoneId": "collect-5-varieties", "grantedAt": "2026-03-17", "source": "live"},
    {"rewardId": "fire-galaxy", "milestoneId": "unlock-fire-galaxy", "grantedAt": "2026-03-17", "source": "live"}
  ]
}
```

结论：首次达成时，奖励被真实写入持久化状态，且来源正确标记为 `live`。

可见 proof：
- `live-ledger-mobile-390x844.jpg`

## Proof 2 — reload 后不重复发放

在 Proof 1 已发放完成后直接 reload 页面，再次读取 `watermelon-farm.milestoneRewards`：

```json
{
  "milestoneCount": 3,
  "rewardCount": 3,
  "rewards": [
    "plot-5:live",
    "plot-6:live",
    "fire-galaxy:live"
  ]
}
```

结论：reload 后记录数保持不变，没有重复补发同一奖励。

## Proof 3 — 已有 save 回补（backfill）

### 构造旧存档
先把图鉴提升到 15 个品种；随后手动清空 `milestoneRewards`，模拟“老版本已有 progression，但还没有 reward record 的存档”：

- `collectionCount = 15`
- `milestoneRewards = { milestones: [], rewards: [] }`

### 进入新版本后的回补结果
reload 后再次读取：

```json
{
  "rewardCount": 7,
  "milestoneCount": 6,
  "rewardSources": [
    "plot-5:backfill",
    "plot-6:backfill",
    "fire-galaxy:backfill",
    "plot-7:backfill",
    "water-galaxy:backfill",
    "plot-8:backfill",
    "cosmic-ambience:backfill"
  ]
}
```

结论：

- 已有 save 在进入新版本后，会按当前正式 progression 自动回补奖励记录
- 回补来源明确标记为 `backfill`
- 只补当前缺失记录，不重复补发已经存在的奖励记录

可见 proof：
- `backfill-ledger-mobile-390x844.jpg`
- `backfill-ledger-desktop-1440x900.jpg`

## Proof 4 — 用户可感知入口

图鉴首页顶部新增“里程碑奖励”账本：

- 已获得 live 奖励显示 `✓ 已获得 · YYYY-MM-DD`
- 回补奖励显示 `✓ 回补 · YYYY-MM-DD`
- 未获得奖励显示 `未获得`
- 主题 / 背景音等暂未落完整资产的内容奖励，显示 entitlement 已记录并附最小状态表达 `（内容待接入）`

结论：用户现在可以从稳定入口感知奖励已获得 / 已解锁 / 已记录，不再需要靠猜。

## 回归说明

- 地块、星系、五行融合、暗物质星等奖励记录全部按当前正式 progression 规则计算
- 卖出品种不会回收图鉴条目；里程碑奖励记录独立持久化，不受库存消耗影响
- 宇宙之心继续保持“达成主收集目标后自动发放”的用户语义，但现在纳入统一 reward record 管理
