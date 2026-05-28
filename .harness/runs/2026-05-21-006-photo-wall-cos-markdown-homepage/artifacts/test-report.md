# 测试报告

## Run

- runId: 2026-05-21-006-photo-wall-cos-markdown-homepage
- generatedAt: 2026-05-21T07:26:00.418Z

## 结果汇总

| 检查 | 状态 | 必需 | 退出码 |
| --- | --- | --- | --- |
| Harness structure and config check | passed | 是 | 0 |
| Harness skill inventory report | passed | 否 | 0 |
| Installed skill audit | passed | 否 | 0 |
| Lint | skipped | 否 | - |
| Typecheck | passed | 否 | 0 |
| Test | passed | 否 | 0 |
| Build | passed | 否 | 0 |

## 详细输出

### Harness structure and config check

状态：passed

```text
> project-ai-harness@0.1.0 harness:check
> node .harness/scripts/check.mjs

Harness check passed.
```

### Harness skill inventory report

状态：passed

```text
> project-ai-harness@0.1.0 harness:skills
> node .harness/scripts/skills-report.mjs

Skill report written: .harness\reports\skills.md
```

### Installed skill audit

状态：passed

```text
> project-ai-harness@0.1.0 harness:skills:audit
> node .harness/scripts/skills-audit.mjs

Skill audit written: .harness\reports\skills-audit.md
```

### Lint

状态：skipped

```text
跳过：package.json 中没有 lint 脚本。
```

### Typecheck

状态：passed

```text
> project-ai-harness@0.1.0 typecheck
> npm run typecheck --workspaces --if-present


> @blog/admin@0.1.0 typecheck
> tsc --noEmit


> @blog/api@0.1.0 typecheck
> tsc --noEmit


> @project/web@0.1.0 typecheck
> tsc --noEmit
```

### Test

状态：passed

```text
> project-ai-harness@0.1.0 test
> npm run test --workspaces --if-present


> @blog/api@0.1.0 test
> jest --config ./test/jest-e2e.json

PASS test/app.e2e-spec.ts
  Blog API MVP
    √ lists published articles (204 ms)
    √ returns published article details (15 ms)
    √ does not expose draft article details publicly (13 ms)
    √ lists categories and category articles (24 ms)
    √ lists tags and tag articles (13 ms)
    √ returns an error for invalid login (22 ms)
    √ logs in an admin (12 ms)
    √ rejects unauthenticated admin requests (12 ms)
    √ returns current admin (12 ms)
    √ saves a draft article (13 ms)
    √ updates a draft article (16 ms)
    √ publishes a draft article (14 ms)
    √ unpublishes an article (15 ms)
    √ creates categories and tags (14 ms)

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        3.009 s, estimated 4 s
Ran all test suites.
```

### Build

状态：passed

```text
> project-ai-harness@0.1.0 build
> npm run build --workspaces --if-present


> @blog/admin@0.1.0 build
> tsc -b && vite build

[36mvite v7.3.3 [32mbuilding client environment for production...[36m[39m
transforming...
[32m✓[39m 1570 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m    0.40 kB[22m[1m[22m[2m │ gzip:   0.27 kB[22m
[2mdist/[22m[35massets/index-BovK9dLk.css  [39m[1m[2m    7.23 kB[22m[1m[22m[2m │ gzip:   2.48 kB[22m
[2mdist/[22m[36massets/index-BpPT-WBh.js   [39m[1m[33m1,248.12 kB[39m[22m[2m │ gzip: 395.70 kB[22m
[33m
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m
[32m✓ built in 5.04s[39m

> @blog/api@0.1.0 build
> tsc -p tsconfig.build.json


> @project/web@0.1.0 build
> next build

▲ Next.js 16.2.6 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 1835ms
  Running TypeScript ...
  Finished TypeScript in 2.2s ...
  Collecting page data using 14 workers ...
  Generating static pages using 14 workers (0/19) ...
  Generating static pages using 14 workers (4/19) 
  Generating static pages using 14 workers (9/19) 
  Generating static pages using 14 workers (14/19) 
✓ Generating static pages using 14 workers (19/19) in 662ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /about
├ ƒ /articles
├ ƒ /articles/[slug]
├ ƒ /categories/[slug]
├ ○ /icon.svg
├ ƒ /photos
├ ƒ /photos/[id]
├ ○ /robots.txt
├ ƒ /sitemap.xml
└ ƒ /tags/[slug]


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Tester 复核记录

### 本轮额外执行命令

- `npm run harness:check`：通过，输出 `Harness check passed.`
- `npm run harness:gate-check -- 2026-05-21-006-photo-wall-cos-markdown-homepage`：通过，输出 `质量门禁通过。`
- `npm --workspace @project/web run typecheck`：通过。
- `npm --workspace @project/web run build`：通过，Next.js 构建成功，包含 `/`、`/articles/[slug]`、`/photos`、`/photos/[id]` 等路由。
- `npm --workspace @blog/api run typecheck`：通过。
- `npm --workspace @blog/api run build`：通过。
- `npm --workspace @blog/admin run typecheck`：通过。
- `npm --workspace @blog/admin run build`：通过，但仍有 Vite chunk size warning。
- `npm test --workspaces --if-present`：通过；当前仅 `@blog/api` 提供测试脚本，API e2e 14/14 通过。
- `npm run harness:verify -- 2026-05-21-006-photo-wall-cos-markdown-homepage`：通过，并生成本报告基础内容。

### 截图人工检查

- `output/playwright/home-desktop.png`：通过。首页首屏突出个人介绍和最新文章，照片墙仅作为轻量入口，符合“首页简化、照片墙不抢主线”的验收方向。
- `output/playwright/photos-prod-desktop.png`：基本通过。桌面照片墙能看到筛选项、照片卡片和返回入口；当前样例只有 1 张公开照片，不能充分验证多列瀑布流混排效果。
- `output/playwright/photos-prod-mobile.png`：警告。移动端截图中标题/说明和右侧 `Back to home` 位置疑似存在横向溢出或内容被裁切，照片卡片也呈现超过视口宽度的迹象，需要前端继续复核移动布局。
- `output/playwright/photo-detail-api.png`：基本通过。照片详情能显示大图；截图左下角出现开发/检查提示 `1 Issue`，且未覆盖详情元信息完整可见区域，需要后续用干净生产截图复核。
- `output/playwright/article-prod-desktop.png`：通过。文章详情能渲染 Markdown 内容、代码块和本地 fallback 提示；未从截图确认原始 HTML 安全策略和外链属性。
- `output/playwright/admin-prod-desktop.png`：警告。截图停留在 `Checking session`，不能证明后台工作台、照片管理列表或表单已加载成功。
- `output/playwright/admin-desktop.png`：部分通过。未登录访问后台时显示登录页，能作为后台保护入口的视觉证据；未覆盖已登录后的照片管理流程。

## 通过项

- Harness 结构检查、质量门禁、自动 verify 均通过。
- web/api/admin 的 typecheck 和 build 均通过。
- API 现有 e2e 测试通过，覆盖文章、分类、标签、登录、后台文章管理等既有 MVP 行为。
- 首页桌面截图符合“个人介绍优先、文章和标签为主体、照片墙轻量入口”的信息层级要求。
- 照片墙桌面公开页、照片详情、文章 Markdown 桌面页已有截图产物，且未发现空白页。
- 未修改 `apps/` 或 `infra/`；本轮 tester 仅更新允许范围内的 `artifacts/test-report.md`。`git status --short` 显示仓库大量未跟踪文件，这是当前工作树既有状态，未做回退或清理。

## 警告项

- Admin build 通过但输出 `assets/index-BpPT-WBh.js` 约 1,248.12 kB，Vite 提示超过 500 kB，后续可考虑动态 import 或 manualChunks。
- `photos-prod-mobile.png` 疑似存在移动端横向溢出/裁切，建议作为前端修复或复核项进入 reviewer。
- `admin-prod-desktop.png` 停在会话检查态，不能作为后台照片管理生产态截图验收依据。
- 当前照片墙公开截图只有 1 张照片，无法充分验证多列瀑布流、不同图片比例混排和排序稳定性。

## 未验证项

- 未重新下载或使用 Playwright Chromium；沿用主线程本机 Chrome headless 截图产物进行人工检查。
- 未执行真实浏览器交互用例：筛选点击、清空筛选、筛选空态、详情键盘操作、Escape/焦点管理、图片加载失败重试。
- 未验证后台已登录后的照片新增、编辑、状态切换、排序、上传/登记反馈流程。
- 未验证 COS 真实签名 URL、过期刷新、临时凭证、真实对象不存在或权限失败等场景；当前只验证到构建和截图层面。
- 未执行真实数据库 up/down 迁移；API 测试覆盖的是现有 e2e 行为，不等同于 photo/media 持久化验证。
- 未自动检查 Markdown 安全策略：危险 HTML 不执行、外链 `rel`/`target`、图片失败占位等仍需专项用例。

## Frontend Fix Worker Check - 2026-05-21

Run: `2026-05-21-006-photo-wall-cos-markdown-homepage`
Worker: Frontend fix worker
Delegation note: current Codex session has no child-agent lifecycle controls exposed, so implementation and verification were handled directly in the requested worker role and recorded here.

Scope checked:
- `apps/admin/src/main.tsx`
- `apps/web/app/photos/**`
- `apps/web/components/photos/**`
- `apps/web/app/globals.css`

Changes verified:
- Admin photo create/update no longer fabricates local success after failed API calls.
- New photo save registers static URL media through `/api/admin/media/complete` before POSTing `/api/admin/photos` with `mediaAssetId`.
- Photo edit/status calls use backend-compatible fields/endpoints and keep the form open with input preserved on failures.
- Photo workspace fallback is explicitly read-only and disables photo mutations when `/api/admin/photos` is unavailable.
- `/photos` mobile layout no longer depends on body horizontal clipping; result bar, lede, home link, and photo cards stay inside the viewport.
- Photo cards/detail images render a readable `Image unavailable` placeholder when a single image URL is missing or fails.

Commands run:
- `npm --workspace apps/admin run typecheck` - passed
- `npm --workspace apps/web run typecheck` - passed
- `npm --workspace apps/admin run build` - passed; Vite reported the existing >500 kB chunk warning
- `npm --workspace apps/web run build` - passed
- Local smoke: `http://localhost:3000/photos` returned 200
- Playwright CLI mobile smoke at 390x844: `innerWidth=390`, `documentElement.scrollWidth=390`, `body.scrollWidth=390`, overflowing elements `[]`
- Playwright CLI image failure smoke: forced first photo image to `/__missing-photo-smoke.jpg`; fallback count became `1` and visible text included `Image unavailable`

Blocked/notes:
- In-app Browser plugin setup failed with `browser-client is not trusted`; Playwright CLI was used as fallback for local visual/layout checks.
- No admin authenticated end-to-end save was run because credentials/session setup were not provided in this worker task.

## Main Agent Rereview Verification - 2026-05-21

Run: `2026-05-21-006-photo-wall-cos-markdown-homepage`

Purpose: verify the reviewer-blocking fixes after backend and frontend/admin repair work.

Commands run:
- `npm --workspace @project/web run typecheck` - passed.
- `npm --workspace @project/web run build` - passed.
- `npm --workspace @blog/api run typecheck` - passed.
- `npm --workspace @blog/api run build` - passed.
- `npm --workspace @blog/admin run typecheck` - passed.
- `npm --workspace @blog/admin run build` - passed, with the existing Vite chunk size warning.
- `npm test --workspaces --if-present` - passed; current API e2e suite is 14/14.
- `npm run harness:check` - passed.
- `npm run harness:gate-check -- 2026-05-21-006-photo-wall-cos-markdown-homepage` - passed.

Admin/API smoke:
- Logged in through `POST http://localhost:3001/api/admin/login` with the local dev admin credentials.
- Created a photo through `POST http://localhost:3001/api/admin/photos` using admin-facing `imageUrl`, `thumbnailUrl`, and `category` fields.
- Response returned a persisted API id `photo-2`, preserved `imageUrl`, and mapped `category` to `workspace`.
- Changed the created photo status through `PATCH http://localhost:3001/api/admin/photos/photo-2/status`; response returned `hidden`.
- Unauthenticated `GET http://localhost:3001/api/admin/photos` returned `401`.

Visual/layout smoke:
- A stale Next production process on `localhost:3200` served new HTML but returned `500` for the current CSS asset, so visual verification was moved to a clean `localhost:3201` production process.
- `http://localhost:3201/_next/static/chunks/02fr3djpp1a8c.css` returned `200`.
- Desktop screenshot: `output/playwright/photos-rereview-desktop-3201.png`.
- Mobile emulation screenshot: `output/playwright/photos-rereview-mobile-emulated.png`.
- Mobile emulation metrics: `innerWidth=390`, `clientWidth=390`, `documentElement.scrollWidth=390`, `body.scrollWidth=390`.
- `.lede` and `.photo-card` bounding boxes stayed inside the 390px viewport.

Remaining notes:
- The real Tencent COS integration remains a planned adapter boundary and should not be described as complete.
- SQLite migration up/down was not executed because the local `sqlite3` CLI is unavailable.
