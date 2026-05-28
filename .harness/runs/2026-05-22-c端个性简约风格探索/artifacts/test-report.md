# 测试报告

## Run

- runId: 2026-05-22-c端个性简约风格探索
- generatedAt: 2026-05-22T09:15:44.797Z
- scope_mode: full
- impact_scopes: web, admin, api
- workspace_targets: (none)

## 结果汇总

| 检查 | 范围 | 状态 | 必需 | 退出码 |
| --- | --- | --- | --- | --- |
| Harness structure and config check | full | passed | 是 | 0 |
| Harness skill inventory report | full | passed | 否 | 0 |
| Installed skill audit | full | passed | 否 | 0 |
| Lint | full | skipped | 否 | - |
| Typecheck | full | passed | 否 | 0 |
| Test | full | passed | 否 | 0 |
| Build | full | passed | 否 | 0 |

## 详细输出

### Harness structure and config check

范围：full
状态：passed

```text
> project-ai-harness@0.1.0 harness:check
> node .harness/scripts/check.mjs

Harness check passed.
```

### Harness skill inventory report

范围：full
状态：passed

```text
> project-ai-harness@0.1.0 harness:skills
> node .harness/scripts/skills-report.mjs

Skill report written: .harness\reports\skills.md
```

### Installed skill audit

范围：full
状态：passed

```text
> project-ai-harness@0.1.0 harness:skills:audit
> node .harness/scripts/skills-audit.mjs

Skill audit written: .harness\reports\skills-audit.md
```

### Lint

范围：full
状态：skipped

```text
跳过：package.json 中没有 lint 脚本。
```

### Typecheck

范围：full
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

范围：full
状态：passed

```text
> project-ai-harness@0.1.0 test
> npm run test --workspaces --if-present


> @blog/api@0.1.0 test
> jest --config ./test/jest-e2e.json

PASS test/app.e2e-spec.ts
  Blog API MVP
    √ lists published articles (205 ms)
    √ returns published article details (22 ms)
    √ does not expose draft article details publicly (29 ms)
    √ lists categories and category articles (15 ms)
    √ lists tags and tag articles (14 ms)
    √ returns an error for invalid login (30 ms)
    √ logs in an admin (11 ms)
    √ rejects unauthenticated admin requests (10 ms)
    √ returns current admin (13 ms)
    √ saves a draft article (15 ms)
    √ updates a draft article (15 ms)
    √ publishes a draft article (15 ms)
    √ unpublishes an article (15 ms)
    √ creates categories and tags (14 ms)

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        3.092 s, estimated 4 s
Ran all test suites.
```

### Build

范围：full
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
[2mdist/[22m[36massets/index-Tj1OFbMH.js   [39m[1m[33m1,249.21 kB[39m[22m[2m │ gzip: 396.03 kB[22m
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
✓ Compiled successfully in 2.1s
  Running TypeScript ...
  Finished TypeScript in 2.4s ...
  Collecting page data using 14 workers ...
  Generating static pages using 14 workers (0/19) ...
  Generating static pages using 14 workers (4/19) 
  Generating static pages using 14 workers (9/19) 
  Generating static pages using 14 workers (14/19) 
✓ Generating static pages using 14 workers (19/19) in 694ms
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

## 执行项

- Harness structure and config check: npm run harness:check
- Harness skill inventory report: npm run harness:skills
- Installed skill audit: npm run harness:skills:audit
- Lint: npm run lint
- Typecheck: npm run typecheck
- Test: npm run test
- Build: npm run build

## 通过项

- Harness structure and config check
- Harness skill inventory report
- Installed skill audit
- Typecheck
- Test
- Build

## 失败 / 阻塞项

- 无

## 未覆盖风险

- Lint 未运行：跳过：package.json 中没有 lint 脚本。
- 额外运行 `npm --workspace apps/web run typecheck`，通过。
- 额外运行 `npm --workspace apps/web run build`，通过。
- 启动本地 Web 服务并访问 `http://127.0.0.1:3000` 返回 HTTP 200。
- 浏览器截图验收未完成：Codex in-app Browser 连接返回 `browser-client is not trusted`；Playwright 通过 `npx --package` 在当前 Windows/Node 环境下无法解析 `playwright` 模块。未引入新的测试依赖以避免扩大变更范围。
