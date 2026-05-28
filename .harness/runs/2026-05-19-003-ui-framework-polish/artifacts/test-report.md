# 测试报告

## Run

- runId: 2026-05-19-003-ui-framework-polish
- generatedAt: 2026-05-19T12:07:08.913Z

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
    √ lists published articles (237 ms)
    √ returns published article details (19 ms)
    √ does not expose draft article details publicly (11 ms)
    √ lists categories and category articles (24 ms)
    √ lists tags and tag articles (14 ms)
    √ returns an error for invalid login (20 ms)
    √ logs in an admin (8 ms)
    √ rejects unauthenticated admin requests (8 ms)
    √ returns current admin (10 ms)
    √ saves a draft article (11 ms)
    √ updates a draft article (14 ms)
    √ publishes a draft article (13 ms)
    √ unpublishes an article (14 ms)
    √ creates categories and tags (12 ms)

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        2.904 s, estimated 4 s
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
[2mdist/[22m[35massets/index-CBHWDRJZ.css  [39m[1m[2m    5.11 kB[22m[1m[22m[2m │ gzip:   1.88 kB[22m
[2mdist/[22m[36massets/index-iz5P1WRL.js   [39m[1m[33m1,147.74 kB[39m[22m[2m │ gzip: 365.49 kB[22m
[33m
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m
[32m✓ built in 4.77s[39m

> @blog/api@0.1.0 build
> tsc -p tsconfig.build.json


> @project/web@0.1.0 build
> next build

▲ Next.js 16.2.6 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 1703ms
  Running TypeScript ...
  Finished TypeScript in 1918ms ...
  Collecting page data using 11 workers ...
  Generating static pages using 11 workers (0/16) ...
  Generating static pages using 11 workers (4/16) 
  Generating static pages using 11 workers (8/16) 
  Generating static pages using 11 workers (12/16) 
✓ Generating static pages using 11 workers (16/16) in 592ms
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

