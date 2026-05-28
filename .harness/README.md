# Harness 模板

`.harness/` 是可复用的 AI 工作流层。它适合复制到任意项目，然后在目标项目中初始化。

## 边界

- `.harness/config/`、`.harness/agents/`、`.harness/rules/`、`.harness/contracts/`、`.harness/templates/`、`.harness/scripts/` 是可复用工作流核心。
- `.harness/project/` 是目标项目生成出来的适配层。
- `.harness/runs/`、`.harness/reports/`、`.harness/knowledge/`、`.harness/dashboard/`、`.harness/backlog/` 是运行态和状态目录。
- 项目源码、产品文档、应用目录、包目录和历史 run 输出，不应作为模板的一部分。

## 新项目初始化

```bash
npm install
npm run harness:inspect -- --no-ai
npm run harness:init -- --force
npm run harness:check
```

`harness:inspect` 会收集项目证据，并写入 `.harness/project/inspect.json` 和 `.harness/project/adapter-plan.json`。

`harness:init` 会把适配计划生成成：

- `.harness/project/profile.yaml`
- `.harness/project/overlay.yaml`
- `.harness/project/rules/language.md`
- `.harness/project/rules/testing.md`
- `.harness/project/rules/domain.md`

长期 `docs/` 目录不是模板默认要求；只有目标项目明确启用产品文档同步时才需要。

## 常规工作流

```text
intake -> backlog -> new-run -> prepare-run -> context-pack -> native-plan
-> subagents -> verify -> review -> release -> done -> archive commit
```

推荐入口：

```bash
npm run harness:run -- "现在直接实现：..."
```

常用检查：

```bash
npm run harness:status
npm run harness:next -- <run-id>
npm run harness:report -- <run-id>
npm run harness:gate-check -- <run-id>
```

## 复制模板

复制到新项目时，保留：

- `.harness/`
- `AGENTS.md`
- `package.json`
- 如果需要锁定 harness 依赖版本，保留 `package-lock.json`
- `.gitignore`

除非你有意迁移运行历史，否则不要复制目标项目的运行态内容：

- `.harness/runs/*`
- `.harness/reports/*`
- `.harness/knowledge/*`
- `.harness/dashboard/*`
- 已生成的 `.harness/project/inspect.json`
- 已生成的 `.harness/project/adapter-plan.json`

这个仓库已经被清理为可复用 harness 核心。
