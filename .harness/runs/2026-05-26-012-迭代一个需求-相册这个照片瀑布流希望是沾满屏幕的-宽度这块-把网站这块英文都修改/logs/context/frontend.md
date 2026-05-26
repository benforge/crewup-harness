# frontend 上下文包

- runId（运行 ID）：2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改
- 上下文模式：full
- 生成时间：2026-05-26T10:58:08.211Z
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
- 后台改动必须关注登录态、受保护路由、刷新保持、退出、权限失败、表单校验和错误提示。
- 列表和表单需求要明确加载态、空态、提交中、提交成功、提交失败、重试和边界数据表现。
- 后台只管理内容和运营配置，不把 C 端营销式展示结构直接搬进管理端。
- 涉及文章、分类、标签、照片、媒体资源等数据时，同步检查 `packages/types` 和 `packages/sdk` 的契约影响。
- 验证记录至少说明关键后台路径、登录/未登录状态和一条失败路径；无法验证时写明原因。

## packages/sdk/.ai/rules.md

# packages/sdk AI 规则

- 作用域：`packages/sdk`，共享 API client；命中前后端调用契约或 SDK 文件时加载。
- SDK 负责集中请求路径、请求体校验、响应 schema parse 和基础错误处理，避免页面散落重复 fetch 逻辑。
- 新增接口时同步检查 `packages/types`、`apps/api` controller 契约和调用端错误处理。
- 不在 SDK 中硬编码生产地址、密钥、真实 token 或环境私密值；baseUrl 必须可配置或沿用现有默认方式。
- 错误信息要适合调用端展示或二次包装，不能吞掉状态码、校验错误和权限失败的关键信息。

## packages/types/.ai/rules.md

# packages/types AI 规则

- 作用域：`package

...(truncated; read project overlay rule file if needed)

## 相关文件

### .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/artifacts/test-report.md
- 字节数：291

```text
# 测试报告

## Run

- runId: 2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改

## 结果汇总

待 Tester Agent 补充。

## 执行项

-

## 通过项

-

## 失败 / 阻塞项

-

## 未覆盖风险

-

```

### apps/admin/.ai/rules.md
- 字节数：893

```text
# apps/admin AI 规则

- 作用域：`apps/admin`，面向内容管理后台；只有任务命中 `admin` scope 或 `apps/admin/**` 时加载。
- 技术栈以当前工程为准：Vite、React、Ant Design；优先沿用已有表单、表格、导航、状态和样式模式。
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
- 已纳入字节数：3236
