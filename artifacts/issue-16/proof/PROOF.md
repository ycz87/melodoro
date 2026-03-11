# Issue #16 Proof - 繁體中文（zh-TW）支持

## 任务目标

补充繁体中文（zh-TW）支持并兼容 zh-TW / zh-HK / zh-Hant 自动识别

## 改动摘要

### 代码改动
- **新增文件**: `src/i18n/locales/zhTW.ts` (929 行，繁体中文翻译字典)
- **修改文件**:
  - `src/i18n/index.ts`: 扩展 Locale 类型，新增 normalizeLocale() 函数，改进 detectLocale()
  - `src/components/LanguagePickerModal.tsx`: 语言列表新增"繁體中文"
  - `src/components/Settings.tsx`: LANGUAGE_DISPLAY 新增 zh-TW
  - `src/types.ts`: migrateSettings() 使用 normalizeLocale() 兼容旧设置

### 核心逻辑
1. **Locale 类型扩展**: `'zh' | 'zh-TW' | 'en' | ...`
2. **normalizeLocale()**: 将 `zh-TW / zh-HK / zh-MO / zh-Hant*` 归并到 `zh-TW`；`zh / zh-CN / zh-SG / zh-Hans*` 归并到 `zh`
3. **detectLocale()**: 遍历 `navigator.languages` + `navigator.language`，优先匹配最精确的 locale
4. **migrateSettings()**: 旧设置中的 `zh-TW / zh-HK / zh-Hant` 正确迁移到 `zh-TW`

## 验收标准核对

### AC1: 设置页语言入口中出现"繁體中文" ✅
- 截图: `01-language-picker-zh-tw-visible.png`
- 浏览器脚本在 `en-US` 环境打开设置页语言弹窗，可见 `🇹🇼 繁體中文`

### AC2: zh-TW / zh-HK / zh-Hant 浏览器环境默认进入繁体中文 ✅
- 截图:
  - `03-auto-detect-zh-tw.png`
  - `04-auto-detect-zh-hk.png`
  - `05-auto-detect-zh-hant.png`
- 自动化验证摘要见 `summary.json`
- 首屏文案均落到繁体：`西瓜時鐘 / 專注 / 農場 / 商城 / 種一顆西瓜，收穫專注`
- 代码路径：`normalizeLocale()` 将 `zh-tw / zh-hk / zh-mo / zh-hant*` 统一归并到 `zh-TW`

### AC3: 用户切换语言后页面即时更新 ✅
- 截图: `02-main-page-manual-zh-tw.png`
- 浏览器脚本在 `en-US` 环境手动切换到 `繁體中文` 后，主页面即时显示繁体文案：
  - `西瓜時鐘`
  - `專注 / 瓜棚 / 農場 / 商城`
  - `這個西瓜鐘要做什麼？`
  - `種一顆西瓜，收穫專注 🍉`

### AC4: 简体中文现有行为保持不变 ✅
- 截图: `06-auto-detect-zh-cn.png`
- `zh-CN` 环境首屏仍为简体：`西瓜时钟 / 专注 / 农场 / 商城 / 种一颗西瓜，收获专注`
- `normalizeLocale()` 将 `zh / zh-CN / zh-SG / zh-Hans*` 归并到 `zh`
- 简体 locale 文件 `zh.ts` 未改动

### AC5: 项目构建通过，核心页面文案无明显缺失或 key 泄漏 ✅
- `npm run build` 通过
- TypeScript 编译无错误
- 繁体 locale 文件完整实现 `Messages` 接口

## 技术细节

### 繁体文案生成方式
- 使用 opencc-js (cn → twp) 自动转换
- 人工修正关键术语：
  - "西瓜鍾" → "西瓜鐘" (时钟的"钟")
  - "点击" → "點選" (台湾习惯用语)
  - "设置" → "設定" (台湾习惯用语)

### 浏览器语言检测优先级
1. 遍历 `navigator.languages` 数组（用户偏好语言列表）
2. 回退到 `navigator.language`（主语言）
3. 每个候选语言通过 `normalizeLocale()` 归一化
4. 首个匹配成功的 locale 作为默认语言
5. 无匹配时默认 `en`

## 产物清单

### Git
- 分支: `feature/r001-zh-tw-rebuild`
- Commit: `a13cca2` - "feat(i18n): add zh-TW locale detection"
- 远端: `origin/feature/r001-zh-tw-rebuild`

### 截图 / 摘要
- `01-language-picker-zh-tw-visible.png`: 语言选择弹窗，"繁體中文"可见
- `02-main-page-manual-zh-tw.png`: 手动切换到繁体中文后的主页面
- `03-auto-detect-zh-tw.png`: `zh-TW` 自动识别首屏
- `04-auto-detect-zh-hk.png`: `zh-HK` 自动识别首屏
- `05-auto-detect-zh-hant.png`: `zh-Hant` 自动识别首屏
- `06-auto-detect-zh-cn.png`: `zh-CN` 简体未回退首屏
- `summary.json`: 浏览器自动化验证摘要

### 构建
- `npm run build`: ✅ 通过
- 产物: `dist/` (已生成)

## 已知限制

1. **繁体文案质量**: 当前以自动转换 + 少量人工修正为主，未经完整人工校对
2. **zh-HK 专属词汇**: 本次统一落到 zh-TW（台湾繁中），未单独提供香港繁中专属词汇版本
3. **截图字体处理**: 由于当前主机缺少 CJK 系统字体，proof 截图在浏览器自动化中临时注入了 `Noto Sans TC` 网页字体，以保证中文截图可读；这不影响产线代码。
4. **浏览器兼容性**: 依赖 `navigator.languages` API（现代浏览器均支持）

## 下一步

- [x] 开 PR：`#17`
- [ ] 等待代码审查
- [ ] 根据审查意见修改
- [ ] 等待任务验收
