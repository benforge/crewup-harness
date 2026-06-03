# CrewUp 脚本边界图

中文 | [English](./script-map.en.md)

这个文档用于维护 CrewUp 的脚本边界。目标不是让用户记住所有脚本，而是明确哪些是稳定产品入口，哪些只是内部流水线、兼容路径或维护工具，避免后续继续用补丁方式堆叠流程。

## 核心产品入口

这些命令应该保持稳定、文档清晰，并推荐给普通开发者使用：

| 命令 | 脚本 | 定位 |
| --- | --- | --- |
| `crewup install` | `bin/crewup.mjs` | 安装或升级 harness 模板 |
| `crewup doctor` | `doctor.mjs` | 检查本地环境和可用能力 |
| `crewup inspect --no-ai` | `inspect.mjs` | 可选，扫描已有复杂项目 |
| `crewup init` | `init.mjs` | 生成项目适配层 |
| `crewup check` | `check.mjs` | 校验 harness 完整性 |
| `crewup run` | `run.mjs` | 正式 run 入口 |
| `crewup next-agent` | `next-agent.mjs` | 查看当前真正可启动的子 agent |
| `crewup native-state` | `native-state.mjs` | 登记和诊断 native 子 agent 状态/结果 |
| `crewup audit` | `orchestration-audit.mjs` | 审计调度顺序、owner 边界、修复回路和上下文压力 |
| `crewup gate-check` | `gate-check.mjs` | 质量门禁、归属和越权检查 |
| `crewup report` | `report.mjs` | 生成交付报告 |
| `crewup finish` | `finish.mjs` | 完成、归档和收尾 |

## 核心运行流水线

这些脚本是 `crewup run` 或后续阶段内部会用到的核心实现，不应该成为普通用户的主要心智负担：

| 脚本 | 职责 |
| --- | --- |
| `intake.mjs` | 判断 no-harness / backlog / direct run |
| `backlog-item.mjs` | 创建 backlog item |
| `new-run.mjs` | 创建 run 目录和初始状态 |
| `prepare-run.mjs` | 生成任务、候选 agent 和 artifact scaffold |
| `spec-freeze.mjs` | 冻结需求摘要 |
| `context-pack.mjs` | 生成 agent 上下文包 |
| `native-plan.mjs` | 生成 native/bridge agent plan |
| `transition.mjs` | 阶段切换和阶段门禁 |
| `changed-files.mjs` | changed-files ownership guard |
| `archive-commit.mjs` | done 后按归档策略提交 |

## 子 Agent 与修复支持

这些脚本用于子 agent 执行、反馈修复或人工恢复：

| 脚本 | 职责 |
| --- | --- |
| `repair-plan.mjs` | 把 tester/reviewer requiredFixes 分组为 owner repair task |
| `repair-artifacts.mjs` | 规范 artifact heading 和空状态，偏维护工具 |
| `repair-state.mjs` | 诊断后修复异常 run/native state |
| `verify.mjs` | 项目测试/构建检查辅助 |
| `dev-service.mjs` | run 级预览服务生命周期 |
| `dashboard.mjs` | 生成 dashboard |

## 可选或高级能力

这些不是核心严格流程必须能力：

| 脚本 | 定位 |
| --- | --- |
| `integrations.mjs` | 可选集成状态，例如 CodeGraph |
| `knowledge.mjs` / `knowledge-select.mjs` | knowledge 层刷新和选择 |
| `skills-*.mjs` | skill 报告、解析和安装 |
| `orchestrate.mjs` | bridge/外部 runner 结果收集路径 |
| `product-sync.mjs` | release 后产品文档同步 |
| `cleanup.mjs` | 清理运行态文件 |
| `token-ledger.mjs` | token 预算和消耗记录 |

## 角色真源

脚本里的 agent 角色集合和执行顺序由 `.harness/scripts/lib/agent-roles.mjs` 统一维护。调度、门禁、native-state、native-plan、transition 不应该各自再维护一份角色列表。

| 分组 | Agent |
| --- | --- |
| Planning | `pm`, `requirements-plan`, `requirements`, `architect` |
| Implementation | `frontend`, `docs`, `backend`, `database`, `devops` |
| Code implementation | `frontend`, `backend`, `database`, `devops` |
| Write owner | `frontend`, `docs`, `backend`, `database`, `devops`, `tester` |
| Verification/release | `tester`, `reviewer`, `release` |

## 可以收敛的方向

- `finalize.mjs` 已删除；统一使用 `finish.mjs`。
- `requirements-interview.mjs` 和 `requirements-plan.mjs` 已删除；需求规划必须由 `requirements-plan` / `requirements` 子 agent 写 owner artifacts。
- `desktop-plan.mjs` 和 `desktop-light.mjs` 已删除；非 native 环境统一走 `native-plan.mjs` 生成的 bridge handoff。
- `orchestrate.mjs` 是 bridge path 的高级能力。Codex native 主路径应优先使用 `native-plan`、`next-agent`、`native-state`。
- `next.mjs` 是状态建议器，不是执行器。正式调度以 `next-agent` 为准。

## 当前核心工作流契约

1. `crewup run` 可以根据入口需求生成候选 agent，但 implementation agent 只是候选。
2. `requirements-plan`、`requirements`、`architect` 必须按顺序完成。
3. `architect` 拥有 `implementation-plan.md`，并必须用精确 agent id 标注实现分配。
4. `next-agent` 和 `native-state` 根据 `implementation-plan.md` 决定哪些 implementation agents 可以真正启动。
5. 未被 `implementation-plan.md` 分配的 implementation candidates 会被跳过，且不会阻塞 tester。
6. tester/reviewer 反馈必须回到 owner implementation agents，不允许 main agent 直接修业务代码。
7. `gate-check` 负责检查 owner artifact、native result、changed files、review/test 状态和 overreach 风险。
