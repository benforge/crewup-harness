# frontend 上下文包

- runId（运行 ID）：2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改
- 上下文模式：full
- 生成时间：2026-05-27T03:00:20.550Z
- 升级原因：task mentions high-risk keyword: 生产

## 允许修改范围

- apps/admin/**
- .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/artifacts/test-report.md
- apps/web/**
- packages/sdk/**
- packages/ui/**

## 项目 Overlay

# Project Overlay: New project

- overlay: .harness/project/ai/profile.yaml
- language.communication: zh-CN
- language.artifacts: zh-CN
- discovered_scopes: 6
- matched_scopes: admin, sdk, web, ui, types

## Project Rule Files

- .harness/project/ai/rules/language.md
- .harness/project/ai/rules/domain-blog.md
- apps/admin/.ai/rules.md
- packages/sdk/.ai/rules.md
- packages/types/.ai/rules.md
- apps/web/.ai/rules.md
- packages/ui/.ai/rules.md

## .harness/project/ai/rules/language.md

# 项目语言规则

- 默认使用中文沟通、记录和汇总。
- 需求、方案、实施计划、测试报告、评审报告、发布摘要和交接记录默认使用中文。
- 代码标识、文件路径、API 名称、库名、命令、错误信息和行业通用技术术语可以保留英文。
- 引用外部英文文档时，用中文总结关键结论，不整段复制英文原文。
- 代码注释默认中文；如果周围文件已有英文注释风格，可保持局部一致。

## .harness/project/ai/rules/domain-blog.md

# 当前项目领域规则

- 本项目是个人博客/内容管理系统，核心体验包括公开阅读、分类/标签、文章详情、后台内容管理和基础站点信息。
- C 端体验优先服务阅读和内容发现，不把后台管理式控件直接暴露给普通访问者。
- 后台管理需求要关注模块独立性、受保护路由、登录态、退出、错误提示和刷新后的状态恢复。
- 内容相关变更要注意 SEO、移动端阅读体验、空状态、缺省数据和异常数据展示。
- 需求若只描述风格词，比如“高级”“专业”“简约”，必须转化为可验收的信息层级、布局、色彩、交互和响应式标准。

## apps/admin/.ai/rules.md

# apps/admin AI 规则

- 作用域：`apps/admin`，面向内容管理后台；只有任务命中 `admin` scope 或 `apps/admin/**` 时加载。
- 技术栈以当前工程为准：Vite、React、Ant Design；优先沿用已有表单、表格、导航、状态和样式模式。
- 当前管理端未配置 Tailwind CSS。除非需求明确要求并经 architect 确认迁移方案，否则不要在 admin 中引入 Tailwind 或按 Tailwind 方式重写 Ant Design 页面。
- 后台样式优先使用 Ant Design 组件能力、组件 props、局部布局结构和现有 `src/styles.css` 约定；新增自定义 CSS 需服务于后台信息密度、表单/表格可用性和权限状态表达。
- 后台改动必须关注登录态、受保护路由、刷新保持、退出、权限失败、表单校验和错误提示。
- 列表和表单需求要明确加载态、空态、提交中、提交成功、提交失败、重试和边界数据表现。
- 后台只管理内容和运营配置，不把 C 端营销式展示结构直接搬进管理端。
- 涉及文章、分类、标签、照片、媒体资源等数据时，同步检查 `packages/types` 和 `packages/sdk` 的契约影响。
- 验证记录至少说明关键后台路径、登录/未登录状态和一条失败路径；无法验证时写明

...(truncated; read project overlay rule file if needed)

## packages/sdk/.ai/rules.md

# packages/sdk AI 规则

- 作用域：`packages/sdk`，共享 API client；命中前后端调用契约或 SDK 文件时加载。
- SDK 负责集中请求路径、请求体校验、响应 schema parse 和基础错误处理，避免页面散落重复 fetch 逻辑。
- 新增接口时同步检查 `packages/types`、`apps/api` controller 契约和调用端错误处理。
- 不在 SDK 中硬编码生产地址、密钥、真实 token 或环境私密值；baseUrl 必须可配置或沿用现有默认方式。
- 错误信息要适合调用端展示或二次包装，不能吞掉状态码、校验错误和权限失败的关键信息。

## packages/types/.ai/rules.md

# packages/types AI 规则

- 作用域：`packages/types`，共享类型和 Zod schema；命中共享契约、API 响应、前后端类型同步时加载。
- schema 是前后端契约事实源之一；新增字段要同时考虑后端 DTO、SDK parse、前端展示和兼容性。
- 不随意放宽校验来绕过错误；必须说明缺省值、nullable、optional 和历史数据兼容策略。
- 破坏性字段变更要写入 API 影响、迁移/回滚说明和测试要求。
- 导出保持稳定，避免让业务 app 直接依赖内部临时结构。

## apps/web/.ai/rules.md

# apps/web AI 规则

- 作用域：`apps/web`，面向公开访问的 C 端博客站点；只有任务命中 `web` scope 或 `apps/web/**` 时加载。
- 技术栈以当前工程为准：Next.js App Router、React、Tailwind CSS；先读现有路由、组件、样式和数据请求模式，再改动。
- Tailwind CSS v4 是 C 端样式默认实现方式：新增页面/组件样式优先写 Tailwind utility class，复用 `app/globals.css` 中 `@theme` token，不再默认新增页面级语义 class。
- `app/globals.css` 已经较大，只作为 Tailwind 入口、theme token、base、少量跨页面 utility 和 Markdown/第三方样式覆盖使用。除非有明确架构理由，不要继续向其中追加单页面布局、卡片、列表、按钮和状态样式。
- 需要自定义 CSS 时，必须在 run 结果中解释原因，并尽量使用 Tailwind v4 `@theme`、`@utility` 或局部组件封装，避免把一次性样式升级为全局契约。
- C 端体验优先服务阅读、内容发现、分类/标签浏览和照片内容浏览，不引入后台管理式控件。
- 页面改动必须考虑桌面和移动端布局、加载态、空态、错误态、404/异常

...(truncated; read project overlay rule file if needed)

## packages/ui/.ai/rules.md

# packages/ui AI 规则

- 作用域：`packages/ui`，共享 UI 包；当前包尚未形成组件库，只有任务明确命中共享组件时加载。
- 不要为了单个页面的小改动提前抽象共享组件；只有跨 `apps/web` 和 `apps/admin` 真实复用时再沉淀。
- 共享组件必须保持 props 简洁、样式边界清晰，并提供加载态、禁用态、错误态或空态等必要状态。

...(truncated; read project overlay rule file if needed)

## 相关文件

### .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/artifacts/test-report.md
- 字节数：419

```text
# Test Report

## Run

- runId: 2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改

## 结果汇总

- `apps/web` typecheck 通过。

## 执行项

- `npm --workspace apps/web run typecheck`

## 通过项

- TypeScript 检查无错误。

## 失败 / 阻塞项

- 无

## 未覆盖风险

- 未做浏览器回归，仅完成类型检查。
```

### apps/admin/.ai/rules.md
- 字节数：1310

```text
# apps/admin AI 规则

- 作用域：`apps/admin`，面向内容管理后台；只有任务命中 `admin` scope 或 `apps/admin/**` 时加载。
- 技术栈以当前工程为准：Vite、React、Ant Design；优先沿用已有表单、表格、导航、状态和样式模式。
- 当前管理端未配置 Tailwind CSS。除非需求明确要求并经 architect 确认迁移方案，否则不要在 admin 中引入 Tailwind 或按 Tailwind 方式重写 Ant Design 页面。
- 后台样式优先使用 Ant Design 组件能力、组件 props、局部布局结构和现有 `src/styles.css` 约定；新增自定义 CSS 需服务于后台信息密度、表单/表格可用性和权限状态表达。
- 后台改动必须关注登录态、受保护路由、刷新保持、退出、权限失败、表单校验和错误提示。
- 列表和表单需求要明确加载态、空态、提交中、提交成功、提交失败、重试和边界数据表现。
- 后台只管理内容和运营配置，不把 C 端营销式展示结构直接搬进管理端。
- 涉及文章、分类、标签、照片、媒体资源等数据时，同步检查 `packages/types` 和 `packages/sdk` 的契约影响。
- 验证记录至少说明关键后台路径、登录/未登录状态和一条失败路径；无法验证时写明原因。

```

### apps/admin/dist/index.html
- 字节数：398

```text
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Blog Admin</title>
    <script type="module" crossorigin src="/assets/index-DxFKpo-k.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-BovK9dLk.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>

```

### apps/admin/index.html
- 字节数：300

```text
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Blog Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```

### apps/admin/node_modules/.vite/deps/_metadata.json
- 字节数：1354

```text
{
  "hash": "bd942c2e",
  "configHash": "07ce59e2",
  "lockfileHash": "7dc9a4b4",
  "browserHash": "776f8bf9",
  "optimized": {
    "react": {
      "src": "../../../../../node_modules/react/index.js",
      "file": "react.js",
      "fileHash": "479021b2",
      "needsInterop": true
    },
    "react-dom": {
      "src": "../../../../../node_modules/react-dom/index.js",
      "file": "react-dom.js",
      "fileHash": "dff2b18e",
      "needsInterop": true
    },
    "react/jsx-dev-runtime": {
      "src": "../../../../../node_modules/react/jsx-dev-runtime.js",
      "file": "react_jsx-dev-runtime.js",
      "fileHash": "09b52a88",
      "needsInterop": true
    },
    "react/jsx-runtime": {
      "src": "../../../../../node_modules/react/jsx-runtime.js",
      "file": "react_jsx-runtime.js",
      "fileHash": "7b4e52c0",
      "needsInterop": true
    },
    "antd": {
      "src": "../../antd/es/index.js",
      "file": "antd.js",
      "fileHash": "e28fe251",
      "needsInterop": false
    },
    "react-dom/client": {
      "src": "../../../../../node_modules/react-dom/client.js",
      "file": "react-dom_client.js",
      "fileHash": "23e3f8b2",
      "needsInterop": true
    }
  },
  "chunks": {
    "chunk-HXIGG44A": {
      "file": "chunk-HXIGG44A.js"
    },
    "chunk-2QCISXSO": {
      "file": "chunk-2QCISXSO.js"
    }
  }
}
```

## 统计

- 候选文件数：9147
- 已纳入文件数：5
- 已纳入字节数：3781
