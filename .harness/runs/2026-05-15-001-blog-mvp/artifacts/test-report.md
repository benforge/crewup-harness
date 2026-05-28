# 测试报告

## Run

- runId: 2026-05-15-001-blog-mvp
- generatedAt: 2026-05-18T06:52:43.165Z

## 结果汇总

| 检查 | 状态 | 必需 | 退出码 |
| --- | --- | --- | --- |
| Harness 结构检查 | passed | 是 | 0 |
| Lint | skipped | 否 | - |
| Typecheck | passed | 否 | 0 |
| Test | passed | 否 | 0 |
| Build | passed | 否 | 0 |

## 详细输出

### Harness 结构检查

状态：passed

```text
> project-ai-harness@0.1.0 harness:check
> node .harness/scripts/check.mjs

Harness 检查通过。
```

## 本地运行检查

- API dev server: `http://localhost:3001`
- Web dev server: `http://localhost:3000`
- Admin dev server: `http://localhost:5173`
- API 健康检查：通过，`GET /api/health` 返回 `{ ok: true, service: "api" }`
- 前台首页：通过，`GET /` 返回 200 并包含 `Hello World`
- 文章详情：通过，`GET /articles/hello-world` 返回 200 并包含 `Hello World`
- 后台入口：通过，`GET /` on `localhost:5173` 返回 200 并包含 `Blog Admin`
- 管理链路 smoke：通过，调用登录、保存草稿、发布文章接口成功；发布后前台首页可看到 `Run Smoke Post`
- Playwright 截图：未完成，Chromium 下载时网络 `ECONNRESET`

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
    √ lists published articles (230 ms)
    √ returns published article details (10 ms)
    √ returns an error for invalid login (22 ms)
    √ logs in an admin (8 ms)
    √ saves a draft article (12 ms)
    √ publishes a draft article (13 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        3.063 s
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
[32m✓[39m 28 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m  0.40 kB[22m[1m[22m[2m │ gzip:  0.27 kB[22m
[2mdist/[22m[35massets/index-CPNpfHO0.css  [39m[1m[2m  1.82 kB[22m[1m[22m[2m │ gzip:  0.83 kB[22m
[2mdist/[22m[36massets/index-CTU86w76.js   [39m[1m[2m197.71 kB[22m[1m[22m[2m │ gzip: 62.38 kB[22m
[32m✓ built in 727ms[39m

> @blog/api@0.1.0 build
> tsc -p tsconfig.build.json


> @project/web@0.1.0 build
> next build

▲ Next.js 16.2.6 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 1341ms
  Running TypeScript ...
  Finished TypeScript in 1796ms ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (0/7) ...
  Generating static pages using 7 workers (1/7) 
  Generating static pages using 7 workers (3/7) 
  Generating static pages using 7 workers (5/7) 
✓ Generating static pages using 7 workers (7/7) in 532ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /articles/[slug]
├ ○ /robots.txt
└ ƒ /sitemap.xml


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```
