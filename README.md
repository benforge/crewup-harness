# Eff Harness

默认语言：中文 | [English](./README.en.md)

Eff Harness 是一套可复用的 AI 协作工作流层，用于把需求拆解、上下文管理、子 agent 协作、质量门禁、交付汇总和归档提交标准化。它不绑定具体技术栈，也不要求项目必须采用 `apps/`、`packages/` 或 monorepo 结构。

它适合希望在真实工程仓库中稳定使用 AI agent 的开发者和团队：让每一次 AI 迭代都有明确输入、角色分工、执行记录、质量检查和归档路径。

## 安装

```bash
npm install -D eff-harness
```

安装后推荐使用短命令 `eh`：

```bash
npx eh install
```

`eff-harness` 是 npm 包名和完整 CLI 名称；`eh` 是日常短命令；`harness` 是兼容别名，方便已有脚本迁移。

## 快速开始

在目标项目根目录执行：

```bash
npx eh install
npx eh inspect --no-ai
npx eh init --force
npx eh check
```

这些命令会安装 `.harness/` 和 `AGENTS.md`，读取真实项目目录，生成 `.harness/project/` 适配层，并检查核心配置是否可用。

## 工作流

```text
intake -> backlog -> run -> context-pack -> native-plan
       -> subagents -> verify -> review -> release -> done -> archive
```

常用命令：

```bash
npx eh run "现在直接实现：..."
npx eh status
npx eh next <run-id>
npx eh report <run-id>
npx eh gate-check <run-id>
npx eh finalize <run-id>
```

`run` 会根据需求复杂度创建或准备 run，并生成子 agent 计划。`finalize` 会尝试推进到 `done`，通过门禁后按归档策略触发 git 提交。

## 运行模式与认证

| 模式 | 入口 | 是否需要 `OPENAI_API_KEY` | 说明 |
| --- | --- | --- | --- |
| Codex 原生子 agent | `native-plan` 后由主 agent 调用 `spawn_agent` | 不需要额外配置 | 使用 Codex 当前登录会话和宿主工具。 |
| Node SDK/API | `inspect --ai`、`orchestrate` 非 `--dry-run` | 需要 | 终端 Node 进程直接调用 OpenAI SDK，无法读取 Codex Desktop 登录态。 |
| 静态/启发式 | `inspect --no-ai`、`check`、`report` | 不需要 | 只读本地文件和配置，不调用模型。 |

AI 辅助项目识别：

```bash
npx eh inspect --ai
```

PowerShell：

```powershell
$env:OPENAI_API_KEY="your_api_key"
npx eh inspect --ai
```

macOS/Linux：

```bash
OPENAI_API_KEY="your_api_key" npx eh inspect --ai
```

## 自动 Git 提交

自动提交由 `.harness/config/archive-policy.yaml` 控制。默认只有 run 进入 `done` 后才会提交，并且只暂存当前 run、来源 backlog 文件和 `changed-files` manifest 中登记的文件。

```bash
npx eh archive-commit <run-id> --dry-run
npx eh finalize <run-id>
```

如果提交被阻塞，先登记本次变更：

```bash
npx eh changed-files <run-id> add <file...>
npx eh archive-commit <run-id>
```

## 报告输出

`report <run-id>` 会生成结构化 Markdown 报告，用表格展示 agent 名称、类型、执行状态、结果文件、摘要、变更、测试、阻塞点和 handoff。

## 目录结构

```text
.harness/
  agents/          # 角色说明
  backlog/         # 需求队列
  config/          # 工作流、模型、委派、风险、归档策略
  knowledge/       # 可再生成的知识层索引
  orchestrator/    # 主 agent 调度规则
  project/         # 当前项目适配层
  reports/         # 运行期报告
  runs/            # 每次迭代的 run 数据
  scripts/         # CLI 和工作流脚本
  templates/       # artifacts 模板
AGENTS.md          # 仓库级 agent 入口
```

在目标项目中，建议提交 `.harness/` 的工作流核心、`.harness/project/profile.yaml`、`.harness/project/overlay.yaml`、`AGENTS.md`、`README.md` 和 `package.json`。Eff Harness 模板包本身不内置具体项目的 `.harness/project/*.yaml`，这些文件由 `eh init` 在目标项目内生成。

通常不建议提交 `.harness/runs/*`、`.harness/reports/*`、`.harness/dashboard/*`、`.harness/project/inspect.json`、`.harness/project/adapter-plan.json` 或临时 smoke test backlog。

## 发布前检查

```bash
npm run harness:check
node bin/harness.mjs --help
npm pack --dry-run
```

重点确认：

- `package.json` 的 `name` 是 `eff-harness`
- `author` 是 `Ben`
- `version` 符合当前发布阶段
- `bin.eh`、`bin.eff-harness` 和 `bin.harness` 都指向 `./bin/harness.mjs`
- npm tarball 不包含历史业务项目、历史 runs 或临时测试产物

## 边界

Eff Harness 不替代构建系统、测试框架或业务架构。它提供的是 AI 协作和交付闭环协议。真实项目仍应保留自己的 README、测试命令、CI/CD、发布流程和代码规范；Harness 会通过 `.harness/project/` 读取并引用这些信息。
