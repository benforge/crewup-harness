# 测试报告

## Run

- runId: 2026-05-18-002-complete-blog-system
- generatedAt: 2026-05-19T07:44:16.359Z

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
    √ lists published articles (228 ms)
    √ returns published article details (11 ms)
    √ does not expose draft article details publicly (10 ms)
    √ lists categories and category articles (13 ms)
    √ lists tags and tag articles (10 ms)
    √ returns an error for invalid login (22 ms)
    √ logs in an admin (10 ms)
    √ rejects unauthenticated admin requests (9 ms)
    √ returns current admin (11 ms)
    √ saves a draft article (11 ms)
    √ updates a draft article (14 ms)
    √ publishes a draft article (13 ms)
    √ unpublishes an article (14 ms)
    √ creates categories and tags (13 ms)

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        3.03 s
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
[2mdist/[22m[35massets/index-Q-n9i4Iz.css  [39m[1m[2m  3.97 kB[22m[1m[22m[2m │ gzip:  1.39 kB[22m
[2mdist/[22m[36massets/index-DEcueA_x.js   [39m[1m[2m209.29 kB[22m[1m[22m[2m │ gzip: 65.38 kB[22m
[32m✓ built in 727ms[39m

> @blog/api@0.1.0 build
> tsc -p tsconfig.build.json


> @project/web@0.1.0 build
> next build

▲ Next.js 16.2.6 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 1596ms
  Running TypeScript ...
  Finished TypeScript in 1950ms ...
  Collecting page data using 11 workers ...
  Generating static pages using 11 workers (0/16) ...
  Generating static pages using 11 workers (4/16) 
  Generating static pages using 11 workers (8/16) 
  Generating static pages using 11 workers (12/16) 
✓ Generating static pages using 11 workers (16/16) in 616ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /about
├ ƒ /articles
├ ƒ /articles/[slug]
├ ƒ /categories/[slug]
├ ○ /robots.txt
├ ƒ /sitemap.xml
└ ƒ /tags/[slug]


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## 新标准补充验证

### 后台路由 / 鉴权

- 访问 `http://localhost:5175/articles`，未登录状态会进入登录页，截图：`artifacts/admin-protected-route.png`。
- API 鉴权仍由 e2e 覆盖：无 token 管理端请求会被拒绝、登录成功可访问 `/api/admin/me`。
- 前端实现已覆盖登录成功回跳、会话恢复校验和退出回登录页；由于 Browser 插件超时、Playwright Test 未作为项目依赖安装，登录点击流未沉淀为正式自动化用例。

### C 端视觉 / 响应式

- 桌面首页截图：`artifacts/web-home-desktop.png`。
- 移动端首页截图：`artifacts/web-home-mobile.png`。
- 截图检查结果：首屏主标题、重点文章、继续阅读、分类和标签层级清晰；移动端没有明显文本重叠。

### 工具降级记录

- Browser 插件连接两次超时。
- `npx playwright install chromium` 超时，改用本机 Edge channel 完成截图验证。
