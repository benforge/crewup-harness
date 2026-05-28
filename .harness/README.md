# `.harness/` 使用说明

`.harness/` 是项目的 AI 协作层，不直接替代业务工程，也不把所有事情交给 AI 自由发挥。它负责把需求、角色、工作流、技能、质量门禁和交付物组织起来。

## 最小闭环

```text
backlog/new -> backlog/ready -> runs/<本次任务>/artifacts -> review -> done
```

## 推荐入口

优先使用统一入口，让 harness 自己判断是进入 backlog、创建 run，还是只做轻量回答：

```bash
npm run harness:run -- "现在直接实现：给首页加一个搜索入口"
```

它会自动执行 intake、backlog 编号、必要时创建 run、生成需求扩写任务、复杂度分析、context-pack 和 native-plan。需要调试单个阶段时，再拆开使用 `harness:intake`、`harness:new-run`、`harness:prepare-run` 等命令。

业务代码、产品文档或跨 run 文件改动需要记录到本次 run：

```bash
npm run harness:changed-files -- <run-id> add <file...>
```

也可以先让 harness 基于 git baseline 推断候选变更，只输出文件列表，不读取 diff：

```bash
npm run harness:changed-files -- <run-id> infer
```

归档提交默认只暂存当前 run 目录、来源 backlog 文件和 changed-files 清单里的文件，避免误提交其它迭代。

run 通过 `harness:transition -- <run-id> --to=done` 后会按 `.harness/config/archive-policy.yaml` 自动触发归档提交；不需要额外配置。若提交没有发生，优先查看：

```bash
npm run harness:archive-commit -- <run-id> -- --dry-run
```

常见原因是工作区里有不属于当前 run、也不在 changed-files 清单里的新变更。确认属于本次迭代后再记录：

```bash
npm run harness:changed-files -- <run-id> add <file...>
npm run harness:archive-commit -- <run-id>
```

查看某个 run 的下一步建议：

```bash
npm run harness:next -- <run-id>
```

生成面向主 agent 汇总的表格化报告：

```bash
npm run harness:report -- <run-id>
```

报告会汇总 native subagent 状态、各 `<agent>.result.md`、changed-files、归档提交状态和阻塞项，主 agent 最终反馈应优先引用这份报告。

刷新跨 run 轻量记忆索引：

```bash
npm run harness:knowledge
```

它会生成 `.harness/knowledge/run-index.json` 和 `.harness/knowledge/decision-index.md`，默认只保存摘要，不读取历史 run 全文。

## 目录说明

```text
.harness/
├── AGENTS.md                 # 总控规则，给所有 agent 看的入口说明
├── config/                   # agent、技能、流程、质量门禁配置
├── agents/                   # 每个 agent 的职责说明
├── contracts/                # 协作契约和完成定义
├── templates/                # 需求、方案、评审、发布等模板
├── backlog/                  # 需求池
├── runs/                     # 每次开发任务的过程记录
└── scripts/                  # 本地辅助脚本
```

## 推荐节奏

1. 任何想法先进入 `backlog/new/`。
2. PM Agent 和 Requirement Agent 把它整理成可验收需求。
3. 达到可开发标准后移动到 `backlog/ready/`。
4. 使用 `npm run harness:new-run -- <文件名>` 创建 run。
5. 使用 `npm run harness:prepare-run -- <run-id>` 生成 agent 子任务。
6. 主 agent 先委派 PM / Requirements / Architect，产出 `requirement.md`、`architecture.md`、`implementation-plan.md`。
7. 主 agent 把需求、方案、风险和实施计划汇总给用户审核；用户确认后再委派开发、测试、评审和 release。
8. 使用 `npm run harness:gate-check -- <run-id>` 检查基础质量门禁。
9. release 完成且用户确认沉淀后，再同步到 `docs/product/`。

## 方案 A 的运行方式

本仓库默认采用方案 A：Codex 当前会话担任主 agent，`.harness/agents/` 中的文件提供角色边界，`.harness/runs/<run>/tasks/` 中的任务文件提供本次执行边界。

这意味着脚本负责生成结构和检查状态，主 agent 负责调度、执行、汇总，并在需要人工判断时暂停确认。

## 文档落点

- `.harness/backlog/` 和 `.harness/runs/<run-id>/artifacts/` 是正式需求的过程工作区。
- 需求细化、验收标准、设计方案、实施路线图和风险分析默认写入 run artifacts。
- `docs/product/` 是产品长期沉淀区，只保存用户明确要求维护的产品文档，或 release 完成后从 run artifacts 同步出的摘要。
- 主 agent 不应在刚收到需求或规划阶段直接把设计方案写到 `docs/product/`。

## 核心原则

- 一个需求对应一个 run。
- 一个 run 尽量对应一个分支或一次 PR。
- 没有验收标准的需求不进入开发。
- 没有测试结果和评审记录的变更不算完成。
- agent 只获得完成职责所需的技能和上下文。
- 没有用户确认，不把规划草稿沉淀到 `docs/product/`。

## 默认委派原则

- 用户提出正式项目需求时，主 agent 默认进入 harness 工作流，不需要用户念特定关键词。
- 主 agent 默认负责调度、阻塞判断、结果整合和最终汇总。
- 需求分析默认交给 `requirements`，架构规划默认交给 `architect`，开发实现默认交给对应开发 agent。
- 主 agent 可以直接处理简单问答、状态查看、只读检查和很小的文档修补。
- 如果不能启动子 agent，主 agent 必须说明降级原因，并把原本应委派的任务和风险写进最终汇总。
