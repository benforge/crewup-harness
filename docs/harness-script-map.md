# CrewUp 脚本边界图

中文 | [English](./script-map.en.md)

这份文档用于维护 CrewUp 的脚本边界。目标不是让普通用户记住所有脚本，而是保持产品入口稳定、内部流水线清晰，避免后续用补丁方式不断叠加流程。

## 核心产品入口

这些命令应保持稳定，并推荐给普通开发者使用：

| 命令 | 脚本 | 定位 |
| --- | --- | --- |
| `crewup install` | `bin/crewup.mjs` | 安装或升级 harness 模板 |
| `crewup doctor` | `doctor.mjs` | 检查本地环境和可用能力 |
| `crewup inspect --no-ai` | `inspect.mjs` | 可选，扫描已有复杂项目 |
| `crewup init` | `init.mjs` | 生成项目适配层 |
| `crewup check` | `check.mjs` | 校验 harness 完整性 |
| `crewup run` | `run.mjs` | 正式 run 入口 |
| `crewup status` / `crewup runs` | `status.mjs` | 查看 run 列表或单个状态卡 |
| `crewup next-agent` | `next-agent.mjs` | 查看当前真正可启动的子 agent |
| `crewup native-state` | `native-state.mjs` | 登记和诊断 native 子 agent 状态、结果 |
| `crewup audit` | `orchestration-audit.mjs` | 审计调度顺序、owner 边界、修复回路和上下文压力 |
| `crewup gate-check` | `gate-check.mjs` | 质量门禁、归属和越权检查 |
| `crewup report` | `report.mjs` | 生成交付报告 |
| `crewup archive` | `archive.mjs` | 归档任意结局并保留证据 |
| `crewup cancel` | `cancel.mjs` | 取消 run 并归档取消原因 |
| `crewup continue` | `continue-run.mjs` | 基于历史 run 创建延续 run |
| `crewup finish` | `finish.mjs` | 成功完成、报告和策略归档 |

## 核心运行流水线

这些脚本是 `crewup run` 或后续阶段内部会用到的核心实现，不应该成为普通用户的主要心智负担：

| 脚本 | 职责 |
| --- | --- |
| `run.mjs` | 创建或继续正式 run，并准备 tasks、context、native plan |
| `status.mjs` | 展示单个 run 状态卡或所有 runs 列表 |
| `prepare-run.mjs` | 生成任务、候选 agent 和 artifact scaffold |
| `spec-freeze.mjs` | 冻结需求摘要 |
| `context-pack.mjs` | 生成 agent 上下文包 |
| `native-plan.mjs` | 生成 native/bridge agent plan |
| `transition.mjs` | 阶段切换和阶段门禁 |
| `changed-files.mjs` | 变更文件归属检查 |
| `archive.mjs` | 归档 `success`、`partial`、`blocked`、`canceled`、`failed` 等结局 |
| `cancel.mjs` | 取消 run 并归档取消原因 |
| `continue-run.mjs` | 基于历史 run 创建延续 run |
| `archive-commit.mjs` | done 后按归档策略提交 |

## 子 Agent 与修复支持

这些脚本用于子 agent 执行、反馈修复或人工恢复：

| 脚本 | 职责 |
| --- | --- |
| `repair-plan.mjs` | 把 tester/reviewer requiredFixes 分组为 owner repair task |
| `repair-artifacts.mjs` | 维护工具：规范 artifact heading 和空状态；默认不直接修复活跃 owner artifact |
| `repair-state.mjs` | 诊断后修复异常 run/native state |
| `verify.mjs` | 项目测试/构建检查辅助 |
| `dev-service.mjs` | run 级预览服务生命周期 |
| `dashboard.mjs` | 生成 dashboard |

## 可选或高级能力

这些不是核心严格流程的必需能力：

| 脚本 | 定位 |
| --- | --- |
| `tool-fallback.mjs` | 记录 Context7/MCP/插件等可选工具不可用时的降级证据 |
| `integrations.mjs` | 可选集成状态，例如 CodeGraph |
| `knowledge.mjs` / `knowledge-select.mjs` | knowledge 层刷新和选择 |
| `skills-*.mjs` | skill 报告、解析、安装和审计 |
| `orchestrate.mjs` | bridge/外部 runner 结果收集路径 |
| `product-sync.mjs` | release 后产品文档同步 |
| `cleanup.mjs` | 清理运行态文件 |
| `token-ledger.mjs` | token 预算和消耗记录 |

## 角色真源

脚本里的 agent 角色集合和执行顺序由 `.harness/scripts/lib/agent-roles.mjs` 统一维护。调度、门禁、native-state、native-plan、transition 不应各自维护一份角色列表。

| 分组 | Agent |
| --- | --- |
| Planning | `requirements-plan`, `requirements`, `architect` |
| Optional coordination | `pm` |
| Implementation | `frontend`, `docs`, `backend`, `database`, `devops` |
| Code implementation | `frontend`, `backend`, `database`, `devops` |
| Write owner | `frontend`, `docs`, `backend`, `database`, `devops`, `tester` |
| Verification/release | `tester`, `reviewer`, `release` |

## 当前核心工作流契约

1. `crewup run` 可以根据入口需求生成候选 agent，但 implementation agent 只是候选。
2. `requirements-plan`、`requirements`、`architect` 必须按顺序完成。
3. `requirements-plan` 负责澄清卡、问题、扩散、边界、验收标准和非目标，不由主 agent 代写。
4. `architect` 拥有 `architecture.md` 和 `implementation-plan.md`，并必须用精确 agent id 标注实现分配。
5. `next-agent` 和 `native-state` 根据 `implementation-plan.md` 决定哪些 implementation agents 可以真正启动。
6. 未被 `implementation-plan.md` 分配的 implementation candidates 会被跳过，且不会阻塞 tester。
7. tester/reviewer 反馈必须回到 owner implementation agents，不允许 main agent 直接修业务代码。
8. owner artifact 结构问题优先恢复 owner agent 处理，`repair-artifacts` 只作维护/兼容路径。
9. 可选工具不可用必须用 `tool-fallback` 记录到 run logs。
10. 默认关 `audit`、`gate-check`、`report`，再关闭保留的子 agent。
