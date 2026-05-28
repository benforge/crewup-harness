# 任务路由规则

主 agent 根据需求里的影响范围选择角色 agent。

## 默认委派入口

正式项目需求不要由主 agent 独自完成。主 agent 先根据用户需求判断触发类型，再委派给对应 agent：

在判断角色之前，必须先做入口判定。入口判定以 `.harness/config/intake-policy.yaml` 为准：

- 没有明确开工信号：默认 `backlog_new`
- 明确排期但不立即执行：`backlog_ready`
- 明确现在执行或继续 run：`direct_run`
- 简单解释/状态/只读检查：`no_harness`

只有 `direct_run` 才能创建或选择 run；其他正式需求先留在 backlog 或需求扩写阶段。

- 新功能或正式迭代：`pm`、`requirements`
- 需求撰写、用户故事、验收标准：`requirements`
- 技术方案、架构规划、影响范围：`architect`
- 前端页面、组件、UI、交互：`frontend`
- 后端 API、服务、认证、业务逻辑：`backend`
- 数据库 schema、迁移、索引：`database`
- 部署、CI/CD、环境配置：`devops`
- 测试验证：`tester`
- 代码评审和风险评审：`reviewer`
- 发布摘要：`release`

主 agent 只负责调度、阻塞判断、结果整合和用户汇总。简单问答、状态查看、只读检查和很小的文档修补可以直接处理。

## 执行形态

- 首选：native subagents。使用 `.harness/scripts/native-plan.mjs` 生成 spawn-ready 计划，然后由主 agent 调用 `spawn_agent`、`wait_agent`、`close_agent` 管理真实子智能体生命周期。
- 降级：desktop prompts。用于当前环境无法调用 native subagent 工具时，把任务提示词交给外部窗口或人工复制执行。
- 最低降级：main-agent coordination only。只允许用于小任务、只读任务或用户明确接受降级的场景；正式开发、测试和评审默认不走这个形态。

开发阶段可以并行启动 `frontend`、`backend`、`database`、`devops`，但只有在写入范围互不冲突时才并行。规划阶段和验证阶段按依赖顺序等待。

## 路由表

| 影响范围 | 角色 agent | 典型任务 |
| --- | --- | --- |
| web | Frontend Agent | 面向用户的前端入口、页面、路由、组件、数据请求和体验 |
| admin | Frontend Agent | 管理后台的前端入口、页面、表单、表格、权限状态和交互 |
| frontend | Frontend Agent | 任何前端工程、组件体系、状态管理、可访问性、性能和构建相关任务 |
| api | Backend Agent | 后端服务、API 契约、领域逻辑、权限安全、数据访问和错误处理 |
| backend | Backend Agent | 任何后端架构、服务边界、集成、可靠性和性能相关任务 |
| db | Database Agent | 表结构、迁移、索引、数据一致性 |
| infra | DevOps Agent | Docker、CI/CD、部署、环境变量 |
| docs | PM / Release Agent | 文档、发布摘要、使用说明；需求规划草稿仍先写入 run artifacts，确认后才沉淀到长期文档目录 |

## 默认参与角色

每个 run 默认都需要：

- PM Agent
- Requirement Agent
- Architect Agent
- Frontend Agent，当前需求涉及 `web`、`admin` 或 `frontend` 时参与
- Tester Agent
- Reviewer Agent
- Release Agent

## 人工确认优先

如果需求同时涉及 `db` 和 `infra`，并且包含生产环境、真实数据、删除、迁移、覆盖、重置等词，主 agent 必须先请求用户确认。

需求和方案阶段也需要人工确认：`pm`、`requirements`、`architect` 完成后，主 agent 先汇总 `requirement.md`、`architecture.md`、`implementation-plan.md` 给用户审核；用户确认继续后，才启动开发类 agent。
