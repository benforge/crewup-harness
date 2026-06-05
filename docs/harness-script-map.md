# CrewUp 脚本边界图

中文 | [English](./harness-script-map.en.md)

这份文档面向维护者，用来说明 CrewUp 的公开入口、核心流水线、兼容工具和维护脚本边界。普通使用者不需要记住所有 `.harness/scripts` 文件；他们只需要理解 `install -> init/check -> run -> status/next-agent -> gate/report/archive/finish` 这条主线。

## 公开产品入口

这些命令是推荐暴露给开发者的稳定入口：

| 命令 | 脚本 | 定位 |
| --- | --- | --- |
| `crewup install` | `bin/crewup.mjs` | 安装或升级 `.harness/` 模板；`--force` 保留运行态，`--reset` 重装核心 |
| `crewup doctor` | `doctor.mjs` | 检查 Node、git、模板状态、sealed core 和可选能力 |
| `crewup inspect --no-ai` | `inspect.mjs` | 可选：扫描已有复杂项目，生成项目适配输入 |
| `crewup init` | `init.mjs` | 生成 `.harness/project/` 适配层和 agent 环境配置 |
| `crewup check` | `check.mjs` | 校验核心文件、配置、模板、编码和工作流约束 |
| `crewup run` | `run.mjs` | 创建正式 run；正式工作必须从 run 开始 |
| `crewup status` / `crewup runs` | `status.mjs` | 查看单个 run 状态卡或 run 列表 |
| `crewup next-agent` | `next-agent.mjs` | 根据当前 stage、产物和 implementation plan 计算可启动子 agent |
| `crewup native-state` | `native-state.mjs` | 登记 native 子 agent 的 handle、结果、fallback 和诊断信息 |
| `crewup audit` | `orchestration-audit.mjs` | 审计调度顺序、owner 边界、重复返工和上下文压力 |
| `crewup gate-check` | `gate-check.mjs` | 执行质量门禁、产物归属和主 agent 越界检查 |
| `crewup report` | `report.mjs` | 生成 run 交付报告 |
| `crewup archive` | `archive.mjs` | 归档 success、partial、blocked、canceled、failed 等任意结局 |
| `crewup cancel` | `cancel.mjs` | 取消 run，并保留取消原因与现场证据 |
| `crewup continue` | `continue-run.mjs` | 基于历史 run 创建延续 run |
| `crewup finish` | `finish.mjs` | 完成报告、归档和按策略提交 |

## 核心运行流水线

这些脚本由公开入口或主 agent 调用，是严格 workflow 的核心实现：

| 脚本 | 职责 |
| --- | --- |
| `prepare-run.mjs` | 创建 run scaffold、候选 agent、任务清单和上下文 |
| `spec-freeze.mjs` | 生成当前需求摘要快照，不代表绕过需求 agent |
| `clarify.mjs` | 将 `requirements-plan` 的澄清卡片渲染给用户确认 |
| `context-pack.mjs` | 为子 agent 生成短上下文包 |
| `native-plan.mjs` | 生成 Codex native 或 bridge handoff 计划 |
| `transition.mjs` | 执行阶段切换和 stage entry gates |
| `changed-files.mjs` | 记录和校验 run 变更文件归属 |
| `archive-commit.mjs` | 在 finish/归档策略允许时创建提交 |
| `archive-status.mjs` | 判断当前 run 是否具备归档提交条件 |

## 子 Agent 与修复支持

这些脚本服务于子 agent 结果收集、反馈修复和异常恢复：

| 脚本 | 职责 |
| --- | --- |
| `orchestrate.mjs` | bridge/外部 runner 的结果收集和产物写回 |
| `repair-plan.mjs` | 将 tester/reviewer 的 required fixes 按 owner 分组 |
| `repair-artifacts.mjs` | 维护/兼容工具：规范 artifact 标题和空状态，不替代 owner agent |
| `repair-state.mjs` | 诊断后修复异常 run/native state |
| `verify.mjs` | 根据项目脚本执行测试/构建辅助检查 |
| `dev-service.mjs` | 启动、停止或查看 run 级预览服务 |
| `dashboard.mjs` | 生成 `.harness/dashboard/index.html` |

## 可选与高级能力

这些能力不属于最小严格闭环，但在复杂项目或工具集成里有价值：

| 脚本 | 定位 |
| --- | --- |
| `integrations.mjs` | 查看可选集成状态，例如 CodeGraph |
| `tool-fallback.mjs` | 记录 Context7、MCP、插件等可选工具不可用时的降级证据 |
| `knowledge.mjs` / `knowledge-select.mjs` | 刷新和选择 knowledge 层上下文 |
| `skills-report.mjs` / `skills-resolve.mjs` / `skills-install.mjs` / `skills-audit.mjs` | skill 报告、解析、安装和审计 |
| `product-sync.mjs` | release 后按用户确认同步产品长期文档 |
| `cleanup.mjs` | 清理运行态文件 |
| `token-ledger.mjs` | 记录 token 预算和消耗 |
| `next.mjs` | 状态建议器，不负责正式子 agent 派发 |

## 角色真源

Agent 角色集合和执行顺序由 `.harness/scripts/lib/agent-roles.mjs` 统一维护。调度、门禁、native-state、native-plan 和 transition 不应各自维护一份角色列表。

| 分组 | Agents |
| --- | --- |
| Planning | `requirements-plan`, `requirements`, `architect` |
| Optional coordination | `pm` |
| Implementation | `frontend`, `docs`, `backend`, `database`, `devops` |
| Code implementation | `frontend`, `backend`, `database`, `devops` |
| Write owner | `frontend`, `docs`, `backend`, `database`, `devops`, `tester` |
| Verification/release | `tester`, `reviewer`, `release` |

## 当前核心工作流契约

1. `crewup run` 创建正式 run，并生成候选 agent；implementation agent 仍只是候选。
2. `requirements-plan -> requirements -> architect` 必须按顺序完成。
3. `requirements-plan` 负责澄清卡、问题、边界、验收标准和非目标；主 agent 不代写 `requirement-plan.md`。
4. `requirements` 负责正式 `requirement.md`；`architect` 负责 `architecture.md` 和 `implementation-plan.md`。
5. `implementation-plan.md` 必须用精确 agent id 分配实现工作。
6. `next-agent` 和 `native-state` 根据 stage、产物、provenance 和 implementation assignment 决定哪些子 agent 可启动。
7. 未被 `implementation-plan.md` 分配的 implementation candidates 会被跳过，不阻塞 tester。
8. tester/reviewer 反馈必须回到 owner implementation agent；主 agent 不直接修业务代码。
9. 默认在关闭保留子 agent 前运行 `audit`、`gate-check` 和 `report`。

## 已移除的历史路径

- `finalize.mjs` 已移除；使用 `finish.mjs`。
- `requirements-interview.mjs` 和旧 `requirements-plan.mjs` 脚本已移除；需求产物必须由对应子 agent 写入。
- `desktop-plan.mjs` 和 `desktop-light.mjs` 已移除；非 native 环境使用 `native-plan.mjs` 生成 bridge handoff。
