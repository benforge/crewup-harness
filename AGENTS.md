# Project Agent Entry

本项目使用 `.harness/` 作为 AI 协作层。除非用户明确说“不要用 harness”，否则 Codex 在处理正式项目需求时必须默认读取并遵守：

- `.harness/AGENTS.md`
- `.harness/orchestrator/main-agent.md`
- `.harness/orchestrator/routing-rules.md`
- `.harness/config/delegation-policy.yaml`
- `.harness/config/model-policy.yaml`
- `.harness/config/write-policy.yaml`
- `.harness/config/risk-policy.yaml`
- `.harness/config/document-policy.yaml`

## 默认工作方式

- 用户只是问概念、解释文件、查看状态、做很小的文档修补时，主 agent 可以直接回答或直接处理。
- 用户提出新功能、正式迭代、需求分析、技术方案、代码实现、测试、评审、发布总结时，主 agent 必须进入 harness 工作流。
- 正式需求默认先创建或选择 run，再按角色委派；不要由主 agent 在主窗口里独自完成完整需求分析、架构规划或开发实现。
- 主 agent 永远不直接修改业务代码。即使是很小的文案、样式、组件、API 或测试改动，也必须由对应开发类 agent 执行；主 agent 只负责创建/选择 run、生成任务、启动 agent、收集结果、运行门禁和汇总。
- 默认省 token：优先 light/fast，只启动必要 agent。只有上下文不足、架构风险较高或用户要求深度分析时才扩大上下文。
- 开发类工作只能交给开发类 agent：`frontend`、`backend`、`database`、`devops`、`tester`。
- 非开发类 agent 默认不直接写业务代码：`pm`、`requirements`、`architect`、`reviewer`、`release`。
- 高风险操作必须先让用户确认，包括数据库迁移、生产配置、CI/CD、密钥、删除、覆盖、重置和不可逆操作。
- 需求规划、设计方案和实施计划默认写入 `.harness/runs/<run>/artifacts/`；`docs/product/` 只用于用户确认后的产品沉淀或 release 同步。

## 委派优先级

正式项目需求的默认顺序是：

```text
pm -> requirements -> architect -> implementation agents -> tester -> reviewer -> release -> main summary
```

主 agent 的职责是调度、收集结果、处理阻塞、更新 artifacts、运行检查并向用户汇总。若当前环境无法启动子 agent，主 agent 必须说明阻塞原因，并把阻塞记录写入 run 日志或最终汇总；不能改为自己完成正式工作。
