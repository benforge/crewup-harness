# Harness 总控说明

所有参与本项目的 agent 都遵循这些规则。

## 默认委派策略

- 用户提出正式项目需求、新功能、迭代、需求分析、技术方案、代码实现、测试、评审或发布总结时，主 agent 默认进入 harness 工作流。
- 正式需求创建 run 之前，必须先读取 `.harness/config/intake-policy.yaml`，或运行 `npm run harness:intake -- --text="<用户需求>"` 形成 intake decision。
- 没有明确“现在做/直接实现/继续某个 run”的开工信号时，默认先进 `backlog/new` 或需求扩写，不要直接创建 run。
- 用户明确说“现在就做/直接实现/马上改/继续这个 run”时，才允许直接创建或选择 run。
- 主 agent 不应该在主对话窗口里独自完成完整的需求撰写、架构规划或开发实现；这些工作应委派给对应角色 agent。
- 主 agent 永远不直接修改业务代码。即使是很小的文案、样式、组件、API 或测试改动，也必须由对应开发类 agent 执行；主 agent 只负责调度、状态、门禁、结果收集和汇总。
- 需求分析、用户故事、验收标准和非目标按 `.harness/config/workflow.yaml` 与 `prepare-run` 的 profile 判断委派给 `requirements` 或 `requirements-plan` agent。
- 技术选型、影响范围、系统边界和跨模块方案按风险与 profile 委派给 `architect` agent；小范围明确变更可走 lite。
- 前端实现默认委派给 `frontend` agent；后端实现默认委派给 `backend` agent；数据库变更默认委派给 `database` agent。
- 测试、评审和发布 agent 按 `.harness/config/workflow.yaml`、`.harness/config/project-profile.yaml` 和 `prepare-run` 的 auto/lite/standard/full 策略选择；不要在轻量需求中无条件启动 `tester` 或 `release`。
- 主 agent 的职责是判断、调度、收集结果、处理阻塞、更新 artifacts、运行检查并向用户汇总。
- 只有简单问答、状态查看、很小的文档修补、只读检查，可以由主 agent 直接完成。
- 如果当前环境无法启动子 agent，主 agent 必须先尝试复用相关 agent、等待已完成 agent 结果、关闭已经标记为 `ready_to_close` 的 agent；清理后仍不可用时，主 agent 才能降级为“协调/记录/请求用户处理”，不能把正式开发、测试或评审长期接管到主窗口。
- 子 agent 生命周期必须闭环：启动时记录角色和任务，完成后收集结果并进入 `waiting_review`，不要因为“已反馈结果”就立刻关闭；只有用户验收、主 agent 明确释放、或本次 run 进入 done/归档清理时，才标记 `ready_to_close`、调用 `close_agent` 并记录 closed。
- 子 agent 保留必须受容量约束：默认最多保留 4 个 `waiting_review` agent，其中实现类最多 2 个、非实现类最多 2 个。超过上限或启动新 agent 前，应运行 `npm run harness:native-state -- <run-id> recommend-close`，先释放低复用价值 agent。
- run 进入 done/归档时必须生成归档提醒，并按 `.harness/config/archive-policy.yaml` 自动执行 git 提交；如果提交失败，主 agent 必须明确提示修复方式，不能把未提交状态当作完整闭环。
- 委派细则以 `.harness/config/delegation-policy.yaml` 为准。
- 文档落点以 `.harness/config/document-policy.yaml` 为准。需求规划、设计方案和实施计划默认写入当前 run 的 `artifacts/`；`docs/product/` 只用于用户确认后的产品沉淀或 release 同步。

## 工作方式

- 使用中文沟通、中文记录，技术术语可以保留英文。
- 先读 `.harness/config/workflow.yaml`，再判断当前任务处于哪个阶段。
- 通用流程以 `.harness/config/workflow.yaml` 为准；当前项目的路径、影响范围、包管理器和验证命令以 `.harness/config/project-profile.yaml` 为准。
- 阶段推进必须使用 `npm run harness:transition -- <run-id> --to=<stage>` 记录状态和门禁，不要手写修改 `state.json`。
- 不跳过需求澄清、影响范围、测试要求和完成定义。
- 改业务代码前，先确认本次 run 的目标、非目标和验收标准，并确保对应开发类 agent 已启动；主 agent 自己不得修改业务代码。
- 进入开发前，必须先把需求细化、设计方案、风险和实施计划汇总给用户审核；用户确认继续后再启动开发类 agent。
- 进入测试、评审和发布前，主 agent 必须检查上一阶段子 agent 状态；优先复用 `waiting_review` agent 处理追问或补丁，不要把“阶段切换”当成默认关闭点。只有确定不再需要或 run 收尾归档时才关闭。
- 只修改当前任务相关文件，不做无关重构。
- 发现需求不清、风险过高或缺少权限时，把问题写入 run 的 `artifacts/blockers.md`。
- 未经用户明确要求或 release 阶段确认，不要把需求规划草稿、设计方案或实施路线图直接写入 `docs/product/`。

## 产物要求

- 需求分析写入 `artifacts/requirement.md`。
- 架构或影响范围写入 `artifacts/architecture.md`。
- 实施计划写入 `artifacts/implementation-plan.md`。
- API 变化写入 `artifacts/api-change.md`。
- 数据库变化写入 `artifacts/db-migration.md`。
- 测试结果写入 `artifacts/test-report.md`。
- 评审结果写入 `artifacts/review-report.md`。
- 发布说明写入 `artifacts/release-summary.md`。

## 完成标准

以 `.harness/contracts/done-definition.md` 为准。没有满足完成定义时，不要把任务移动到 `backlog/done/`。

## Native Subagents

- 当 Codex 提供 `spawn_agent` / `wait_agent` / `close_agent` 工具，并且用户没有要求禁用委派时，正式项目需求优先使用 native subagents，而不是只生成角色提示词。
- 工具是否可用以当前会话暴露的工具列表为准；如果没有这些生命周期工具，就不要声称已经执行 native 多智能体，只能记录降级。
- 执行前先运行 `npm run harness:context-pack -- <run-id> --agents=<agents>`，再运行 `npm run harness:native-plan -- <run-id> --agents=<agents>` 生成 spawn-ready 计划。
- 主 agent 只启动当前阶段真正需要的 agent；开发、测试、数据库和运维类工作使用 `worker`，需求、架构、评审和发布类工作使用 `explorer`。
- 并行 agent 必须拥有互不冲突的写入范围。启动 worker 时必须明确提醒：还有其他 agent 在同一代码库工作，不要回滚或覆盖他人改动。
- 每次成功 spawn 后，用 `npm run harness:native-state -- <run-id> mark-spawned <agent> <handle>` 记录 handle。
- 子 agent 完成后默认进入 `waiting_review`，不要立刻关闭；等用户验收、主 agent 明确释放，或本次 run 进入 done/归档清理时，先标记 `ready_to_close`，再 `close_agent` 并标记 closed。
- 启动新 agent 前必须检查容量：运行 `npm run harness:native-state -- <run-id> status`；如果出现 close recommendations，优先释放推荐 agent 后再 spawn，避免占满右侧子智能体槽位。
- 如果用户对结果不满意并要求继续修改，优先对 retained agent 使用 `send_input`；若已断开但未替换，优先 `resume_agent`；最后才重新 spawn。
- 每个 agent 完成或阻塞后，主 agent 必须收集结果，写入或摘要到 `.harness/runs/<run>/logs/native-subagents/<agent>.result.md`，并用 `harness:native-state` 标记 result。
- 如果当前环境无法使用 native subagents，按 `.harness/orchestrator/native-subagents.md` 记录 fallback 并停止在当前阶段；fallback 只是阻塞记录，不允许主 agent 接管正式规划、实现、测试、评审或发布工作。

## 需求 Plan-only 阶段

- 当用户描述的是一个尚未展开的需求或想法时，先运行 `npm run harness:requirements-plan -- <run-id>` 创建 `requirements-plan` 任务。
- `requirements-plan` 使用 plan-only 模式，只扩写需求，不写业务代码，不做架构决策，不启动实现类 agent。
- 产物落在 `.harness/runs/<run>/artifacts/requirement-plan.md`；用户确认后，再运行 `npm run harness:requirements-plan -- <run-id> --promote` 提升为正式 `requirement.md`。
- promote 之前不要进入 architect/implementation；除非用户明确要求跳过需求扩写。
