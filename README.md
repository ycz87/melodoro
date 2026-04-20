# 🍉 Melodoro（西瓜时钟）

Melodoro 是一款以番茄工作法为核心、带有西瓜宇宙成长体验的专注计时应用。
这个仓库是 Melodoro 的主仓库，集中承载 Web 主应用、管理后台、业务 API、认证服务、Android 壳，以及 Tauri 桌面端打包工程。

- 在线体验：[clock.cosmelon.app](https://clock.cosmelon.app/)
- GitHub 仓库：[ycz87/melodoro](https://github.com/ycz87/melodoro)

## 这个仓库包含什么

| 子系统 | 目录 | 用途 | 最小入口 |
| --- | --- | --- | --- |
| Web 主应用 | 根目录 `src/` + `public/` | 用户实际使用的主产品界面 | `npm install && npm run dev` |
| Admin | `admin/` | 管理后台 | `cd admin && npm install && npm run dev` |
| API | `api/` | Cloudflare Workers 业务 API | `cd api && npm install && npm run dev` |
| Auth | `auth/` | Cloudflare Workers 认证服务 | `cd auth && npm install && npm run dev` |
| Android | `android/` + `capacitor.config.ts` | Android 壳与打包工程 | 作为移动端壳层维护 |
| Desktop | `src-tauri/` | Tauri 桌面端工程（Windows / Linux） | 作为桌面端打包目标维护 |

> 入口 README 只保留第一次访问者需要的总览信息。更细的产品能力、流程约束和发布细节，请继续往下方文档导航走。

## 仓库结构总览

| 路径 | 说明 |
| --- | --- |
| `src/` | Web 主应用源码 |
| `public/` | Web 静态资源 |
| `admin/` | 管理后台应用 |
| `api/` | Cloudflare Workers 业务 API |
| `auth/` | Cloudflare Workers 认证服务 |
| `android/` | Capacitor Android 工程 |
| `src-tauri/` | Tauri 桌面端工程 |
| `scripts/` | 仓库级脚本与辅助工具 |
| `docs/` | 产品与开发文档 |
| `roadmap/` | 路线图与规划资料 |
| `.github/` | CI workflows、PR 模板与 review checklist |

## 本地开发快速开始

建议使用 **Node.js 22**。

### 先跑 Web 主流程

```bash
npm install
npm run dev
```

常用后续命令：

```bash
npm run build
npm run preview
npm run lint
npm run guard:pr
```

### 进入其他子系统

```bash
cd admin && npm install && npm run dev
cd api && npm install && npm run dev
cd auth && npm install && npm run dev
```

如果你只是第一次熟悉仓库，建议先从根目录 Web 主应用开始，再按需要进入 `admin/`、`api/`、`auth/`。

## 常用命令

### 根仓库（Web 主流程）

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动 Web 主应用开发环境 |
| `npm run build` | 构建 Web 主应用 |
| `npm run preview` | 本地预览构建产物 |
| `npm run lint` | 运行仓库级 lint |
| `npm run guard:pr` | 执行默认 PR guard 流程 |

### 子系统最小常用命令

| 子系统 | 常用命令 |
| --- | --- |
| `admin/` | `npm run dev`, `npm run build`, `npm run preview` |
| `api/` | `npm run dev`, `npm run deploy` |
| `auth/` | `npm run dev`, `npm run deploy` |

## CI / 发布简版

| Workflow | 作用 | 触发方式 |
| --- | --- | --- |
| `.github/workflows/pr-guard.yml` | PR Guard，检查 lint / build / diff | PR 到 `main` 时自动触发，也可手动触发 |
| `.github/workflows/deploy.yml` | 构建并部署 Web 主应用到 Cloudflare Pages | push 到 `main` 时自动触发 |
| `.github/workflows/android.yml` | 构建 Android debug APK | 手动触发 |
| `.github/workflows/tauri-build.yml` | 构建并发布 Tauri Windows / Linux 产物 | 手动触发 |

## 核心文档导航

- [产品概览](docs/PRODUCT.md)，先看产品定位、当前能力和部署口径
- [路线图](roadmap/roadmap.md)，看项目主线、进行中 Epic 和后续规划
- [PR Guard 与 lint 护栏](docs/lint-guardrails.md)，看提交前的默认质量门槛
- [PR 模板](.github/pull_request_template.md)，新建 PR 时按这里组织摘要与验证信息
- [Review Checklist](.github/review-checklist.md)，看 reviewer 关注点和拦截条件

## License

MIT
