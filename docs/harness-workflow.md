# Harness Workflow

中文 | [English](./harness-workflow.en.md)

CrewUp 是显式启用的严格 AI engineering harness。没有明确的 CrewUp / harness / run 信号时，普通聊天不会进入这套流程。一旦进入正式 run，主 agent 只负责创建 run、调度、登记结果、跑审计和汇总，不代写 owner artifact，也不代写业务代码。

## 入口

有两种有效入口：

- CLI 入口：用户运行 `npx crewup run "..."`。
- 聊天入口：用户明确说“使用 CrewUp / 按 harness 流程 / 继续某个 run”。这时主 agent 应自己运行 `npx crewup run`，提取 runId，然后继续 `next-agent` 调度。

聊天入口不应该要求用户先手动生成 runId。

## 执行前置条件

CrewUp 可以在没有 API key 的情况下创建 run、任务、context pack、audit 和 gate。真实 AI 子 agent 执行需要你选择的 agent 环境已经配置好模型访问方式：

- `codex` native 模式需要 Codex 环境可以启动子 agent。Codex Desktop / CLI 可能使用自己的登录态；SDK/API 路径和 `inspect --ai` 需要 `OPENAI_API_KEY`。
- `claude`、`cursor`、`trae` 当前使用 bridge 模式。这些工具使用自己的认证方式，并且必须把 CrewUp 兼容的 result JSON 写回 run。
- `manual` 模式不需要 AI key；人或外部工具执行 handoff，并写回 result JSON。

如果 native 工具或模型访问不可用，应记录 fallback 并停止正式委派工作。fallback 不授权主 agent 代写 owner artifact 或业务代码。

## 语言和契约

- 面向用户的状态、阻塞、交接、总结默认用中文。
- Harness 机器契约保持英文：artifact heading、JSON 字段、文件路径、命令、状态值和 schema label。
- 读取本地中文文件时使用显式 UTF-8，避免 Windows 终端编码导致误判。

## 核心工作流

```text
intake -> requirements_plan -> requirements_confirm -> plan
  -> implement -> verify -> review -> release -> done
```

严格流程不靠跳过角色省 token，而是通过更窄的任务、更清楚的 result schema、更少的重复返工来降低浪费。

需求里明确排除的范围只会移除误判候选。例如用户说 `no backend/database/auth/routing`，CrewUp 不应为了确认无关而启动 backend/database agent。但是否需要 backend、database、auth、routing，应该主要由需求和 architect 的 `implementation-plan.md` 决定，而不是由主 agent 主观接管。

## Owner Artifacts

| Artifact | Owner |
| --- | --- |
| `artifacts/requirement-plan.md` | requirements-plan |
| `artifacts/requirement.md` | requirements |
| `artifacts/architecture.md` | architect |
| `artifacts/implementation-plan.md` | architect |
| implementation files | frontend/backend/database/devops/docs owner agents |
| `artifacts/test-report.md` | tester |
| `artifacts/review-report.md` | reviewer |
| `artifacts/release-summary.md` | release |

主 agent 不允许把子 agent 的文本复制进 owner artifact。如果 owner artifact 缺失、结构不合格或需要返修，优先恢复对应 owner agent 处理。

`repair-artifacts` 是维护工具，不是 owner-agent repair 的第一选择。默认情况下，如果 native-state 里存在对应 owner agent，它会拒绝直接修改 owner artifact；只有维护旧数据或明确诊断时才使用 `--allow-owner-artifacts`。

## Native Subagent Path

```bash
npx crewup context-pack <run-id> --agents=<agents>
npx crewup native-plan <run-id> --agents=<agents>
npx crewup next-agent <run-id>
npx crewup native-state <run-id> status
```

主 agent 启动 agent 前必须运行 `next-agent`，只启动 runnable 列表里的 agent。不能凭 native plan 猜测，也不能在上游结果没有 captured 前启动下游 agent。

必要顺序：

```text
requirements-plan -> requirements -> architect -> implementation agents -> tester -> reviewer -> release
```

`architect` 完成后，implementation candidates 只有被 `artifacts/implementation-plan.md` 用精确 agent id 分配，才能真正启动。`next-agent` 和 `native-state` 会执行这个架构归属规则。

## 工具降级日志

Context7、MCP、插件、Playwright、Browser、CodeGraph 等都是可选增强。不可用时不要只在聊天里说一声，应记录到 run logs：

```bash
npx crewup tool-fallback <run-id> --tool Context7 --reason "not available in this session" --fallback "architect uses project evidence and checked-in docs"
```

工具降级日志只记录证据，不改变职责归属。比如 Context7 不可用，不代表主 agent 可以代替 architect 完成技术选型。

## Audit 和 Gate

```bash
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup report <run-id>
```

`audit` 检查调度本身是否干净：下游提前启动、implementation 未经架构分配、owner artifact 缺 provenance、tester/reviewer 反馈未回派、保留 agent 过多、上下文压力过大等。

`gate-check` 判断当前 run 能否过质量门禁：artifact schema、owner provenance、native results、changed files、服务状态和归档状态。

默认关闭顺序是先 `audit`、`gate-check`、`report`，再关闭不需要保留的子 agent。只有保留容量不足时，才先用 `native-state recommend-close` 释放低价值 agent，并记录原因。

## 返修结果

当子 agent 的新结果是在修复旧结果时，result JSON 应保留 lineage：

```json
{
  "repairOf": ["RF-01", ".harness/runs/<run-id>/logs/native-subagents/frontend.result.json"],
  "repairReason": "tester reported a blocking issue",
  "previousResultPath": ".harness/runs/<run-id>/logs/native-subagents/frontend.result.json"
}
```

这样 report 能说明“这次结果修复了什么”，减少重复返工和上下文混乱。

## 发布前验证

```bash
npm run harness:check
npm run harness:test-flow
npm run release:preflight
```

这会覆盖配置完整性、临时项目安装、run 创建、任务顺序、owner artifact gate、implementation dispatch、repair-plan 和基础发布打包检查。
