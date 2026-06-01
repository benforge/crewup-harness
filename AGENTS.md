# Harness 模板入口

这个仓库是一套可复用的 AI 工作流 harness 模板。它不预设任何产品、应用、monorepo 目录、框架或部署目标。

把这套模板复制到真实项目后，Codex 在处理正式项目工作前，应先读取并遵守这些文件：

- `.harness/AGENTS.md`
- `.harness/orchestrator/main-agent.md`
- `.harness/orchestrator/routing-rules.md`
- `.harness/config/delegation-policy.yaml`
- `.harness/config/harness-scope-policy.yaml`
- `.harness/config/model-policy.yaml`
- `.harness/config/write-policy.yaml`
- `.harness/config/risk-policy.yaml`
- `.harness/config/document-policy.yaml`

## 模板规则

- `.harness/` 是可复用的工作流核心。
- `.harness/project/` 是按目标项目生成的适配层，每个项目都可以重新生成。
- `.harness/runs/`、`.harness/reports/`、`.harness/dashboard/`、`.harness/backlog/`、`.harness/knowledge/` 是运行态和状态目录。
- `.harness/config/skills.yaml` 只声明 skill 映射、候选项和安装方式；不代表 skill 已安装。
- 项目级 skill 放 `.agents/skills/<skill-name>/SKILL.md`；个人全局 skill 放 `%USERPROFILE%/.codex/skills/<skill-name>/SKILL.md`。
- `.cursor`、Claude 等目录只作为工具适配层，不作为 Harness skill 的主真源。
- 默认不假设当前存在任何产品源码、应用目录或业务领域。
- CrewUp 是显式启用的严格工作流；安装模板不代表接管所有 AI 对话。
- 只有用户执行 `crewup run` / `npm run harness:run`，或在聊天中明确说“使用 CrewUp / 按 harness 流程 / 继续当前 CrewUp run”时，才进入 harness 工作流。
- 没有显式 CrewUp 信号时，简单问答、只读解释、临时讨论和很小的非正式修补不创建 run。
- 一旦创建 run，就必须遵守委派、产物归属、门禁、报告和归档规则，不允许主 agent 绕过子 agent 完成正式实现。
- 主 agent 负责协调、委派、检查门禁和汇总；当实现类 agent 可用时，主 agent 不应直接完成正式业务代码实现。

## 在目标项目首次初始化

把 `.harness/` 复制到目标项目后，运行：

```bash
npm install
npm run harness:inspect -- --no-ai
npm run harness:init
npm run harness:check
```

只有在已配置 OpenAI API key，并且希望模型基于真实项目证据进一步修正适配层时，才使用：

```bash
npm run harness:inspect -- --ai
```
