# 🍉 Melodoro（西瓜时钟）

Melodoro 是一款以西瓜宇宙为主题的番茄工作法应用。这个仓库同时承载 Web 主应用、Cloudflare Workers 服务、管理后台、Android 壳和 Tauri 桌面端。

- 在线体验：<https://clock.cosmelon.app/>
- GitHub：<https://github.com/ycz87/melodoro>

## 核心亮点

- **专注计时**：番茄模式、项目模式、历史统计、提醒音效与主题系统
- **成长进度**：瓜棚、农场、商城、成就等长期玩法模块
- **账户与同步**：邮箱验证码 / OAuth 登录，跨设备数据同步
- **多端交付**：Web、Android、Tauri 桌面端共用同一仓库演进

## 仓库概览

| 路径 | 用途 |
| --- | --- |
| `src/` | Web 主应用源码 |
| `public/` | Web 静态资源 |
| `admin/` | 管理后台 |
| `api/` | Cloudflare Workers 业务 API |
| `auth/` | Cloudflare Workers 认证服务 |
| `android/` | Capacitor Android 工程 |
| `src-tauri/` | Tauri 桌面端工程 |
| `scripts/` | 自动化与辅助脚本 |
| `docs/` | 产品与开发文档 |
| `roadmap/` | 路线图与规划资料 |

## 本地开发

建议使用 **Node.js 22**。

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
npm run guard:pr
```

### PR guard 说明

`npm run guard:pr` 会按当前仓库规则依次执行：

1. `npm run lint`
2. `npm run build`
3. `git diff --check`
4. `npm run guard:pr:patch-check`

`guard:pr:patch-check` 默认基于 `origin/main` 做 patch 检查，也支持通过 `PR_GUARD_BASE_REF` 覆盖 base ref：

```bash
PR_GUARD_BASE_REF=origin/main npm run guard:pr:patch-check
```

## CI / Workflow

- `.github/workflows/deploy.yml`：`main` 分支 push 后构建并部署到 Cloudflare Pages
- `.github/workflows/pr-guard.yml`：面向 `main` 的 PR Guard（lint / build / diff checks）
- `.github/workflows/android.yml`：手动触发 Android debug APK 构建
- `.github/workflows/tauri-build.yml`：手动触发 Tauri Windows / Linux 构建与 Release 发布

## 相关文档

- `docs/PRODUCT.md`：产品概览
- `docs/lint-guardrails.md`：PR Guard 与 lint 护栏说明
- `.github/pull_request_template.md`：PR 描述模板
- `.github/review-checklist.md`：Reviewer checklist

## License

MIT
