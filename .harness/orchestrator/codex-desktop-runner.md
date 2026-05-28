# Codex Desktop 多 Agent Runner

这个 runner 用于 Codex 桌面客户端。它和 `harness:orchestrate` 的区别是：

- Codex Desktop runner 使用桌面客户端的子 agent tabs，用户可以切换查看每个 agent 的对话过程。
- Node orchestrator 使用 OpenAI Agents SDK，适合后台脚本化执行和 CI，但不会出现在右侧 tabs。

推荐日常开发使用 Codex Desktop runner，自动化批处理使用 Node orchestrator。

## 主 Agent 职责

主 agent 是当前对话中的 Codex。主 agent 必须：

1. 读取 `.harness/AGENTS.md`。
2. 读取 `.harness/orchestrator/codex-desktop-runner.md`。
3. 读取 `.harness/config/desktop-runner.yaml`。
4. 读取当前 run 的 `input.md`、`state.json`、`tasks/*.task.md`、`artifacts/*.md`。
5. 读取 `model-policy.yaml`、`write-policy.yaml`、`risk-policy.yaml`。
6. 读取 `.harness/config/document-policy.yaml`。
7. 判断哪些 agent 可以并行，哪些必须顺序。
8. 检查并管理已有子 agent tabs，复用仍相关的 agent，关闭已完成且不再需要的 agent。
9. 使用 Codex Desktop 子 agent tabs 委派任务。
10. 收集子 agent 结果，更新 artifacts、logs、dashboard。
11. 在需求和方案阶段结束后请求用户审核，确认后再进入开发。
12. 运行 `harness:verify` 和 `harness:gate-check`。
13. 用中文向用户汇总结果。

## 子 Agent 可见性

当主 agent 使用 Codex Desktop 子 agent 能力委派任务时，用户可以在桌面客户端右侧看到不同子 agent 的 tabs，并查看它们的工作过程。

这类子 agent 的完整对话不会自动写入仓库；因此主 agent 应要求每个子 agent 在最终输出中给出可写回的结果摘要。必要时，主 agent 把结果保存到：

```text
.harness/runs/<run-id>/logs/desktop-agents/<agent>.result.md
```

## 执行顺序

默认分三组：

```text
intake:
  pm -> requirements -> architect

implementation:
  frontend / backend / database / devops 可并行

verification:
  tester -> reviewer -> release
```

实际是否并行由主 agent 根据当前任务依赖判断。

## Tab 生命周期

- 启动新子 agent 前，主 agent 必须先检查已有子 agent tabs。
- 如果同一角色 agent 已存在且上下文仍相关，优先向该 agent 继续发送任务，而不是新建 tab。
- 如果 agent 已完成，主 agent 必须先收集结果摘要；确认后关闭该 agent，释放线程额度。
- 如果 agent 被中断或阻塞，主 agent 必须记录原因，再决定复用、关闭或请求用户介入。
- 线程额度满不是直接越职理由；必须先复用或关闭。清理后仍无法启动时，主 agent 应暂停并把阻塞写入 run 日志。

## 模型策略

主 agent 应读取 `.harness/config/model-policy.yaml`。

如果 Codex Desktop 子 agent 支持指定模型：

- `pm`、`release` 使用低成本模型。
- `requirements`、`devops` 使用中等模型。
- `frontend`、`backend`、`tester` 使用编码强模型。
- `architect`、`database`、`reviewer` 使用强推理模型。

如果当前环境无法指定子 agent 模型，主 agent 必须在最终汇总中说明降级。

## 写代码规则

只有开发类 agent 可以写业务代码：

```text
frontend
backend
database
devops
tester
```

非开发 agent 不直接写业务代码：

```text
pm
requirements
architect
reviewer
release
```

开发类 agent 也只能改对应 task 的 `允许修改` 范围。命中高风险路径或内容时，必须人工确认。

需求规划、设计方案和实施路线图必须先写入 `.harness/runs/<run-id>/artifacts/`。`docs/product/` 只在 release 完成并得到用户确认后，由主 agent 同步产品沉淀。

## 子 Agent Prompt 约定

主 agent 可以使用下面命令为当前 run 生成子 agent prompt：

```bash
npm run harness:desktop-plan -- <run-id>
```

生成结果：

```text
.harness/runs/<run-id>/logs/desktop-agents/<agent>.prompt.md
.harness/runs/<run-id>/logs/desktop-agents/desktop-execution-plan.md
```

主 agent 委派子 agent 时，应优先使用这些 prompt 内容。

## 子 Agent 输出契约

每个子 agent 最终必须输出：

```text
Agent:
Status: completed / blocked / needs_input
Summary:
Files changed:
Artifacts updated:
Tests:
Blockers:
Handoff:
```

如果子 agent 修改了文件，必须列出完整路径和修改原因。

## 默认委派要求

正式项目需求下，Codex Desktop runner 的默认行为是“主 agent 调度，子 agent 执行”。

主 agent 必须额外读取 `.harness/config/delegation-policy.yaml`，并遵守：

- 需求分析、用户故事、验收标准、非目标和边界澄清默认委派给 `requirements` agent。
- 技术选型、架构边界、影响范围和跨模块方案默认委派给 `architect` agent。
- 前端代码、页面、组件、交互和样式默认委派给 `frontend` agent。
- 后端 API、服务、认证、业务逻辑和错误处理默认委派给 `backend` agent。
- 数据库 schema、迁移、索引和种子数据默认委派给 `database` agent。
- 测试验证默认委派给 `tester` agent。
- 代码评审和风险评审默认委派给 `reviewer` agent。
- 发布摘要默认委派给 `release` agent；产品文档同步由主 agent 在用户确认后执行。

主 agent 可以直接处理简单问答、状态查看、只读检查和很小的文档修补。除此之外，如果主 agent 没有启动子 agent，必须先说明已尝试的复用/关闭动作；仍无法委派时，默认暂停等待用户确认，不应直接接管正式开发、测试或评审。
