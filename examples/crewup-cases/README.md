# CrewUp Cases

[中文](#中文案例) | [English](#english-cases)

这些案例用于本地测试和真实项目演示。复制需求到聊天窗口，或作为 `npx crewup run "..."` 的输入。

## 中文案例

| 文件 | 用途 |
| --- | --- |
| [counter-mvp-full-flow.md](./counter-mvp-full-flow.md) | 最小开发闭环，包含实现、测试、review、release |
| [fullstack-blog-plan-only.md](./fullstack-blog-plan-only.md) | 只做需求和架构规划，不写业务代码 |
| [docs-only-update.md](./docs-only-update.md) | 只改文档，验证 docs agent / tester / reviewer 路径 |

## English Cases

| File | Purpose |
| --- | --- |
| [counter-mvp-full-flow.en.md](./counter-mvp-full-flow.en.md) | Minimal development loop with implementation, test, review, and release |
| [fullstack-blog-plan-only.en.md](./fullstack-blog-plan-only.en.md) | Requirements and architecture planning only, no business code |
| [docs-only-update.en.md](./docs-only-update.en.md) | Documentation-only change to validate docs/tester/reviewer path |

## 使用建议

- 第一次真实跑完整流程，优先用 counter MVP。
- 只想验证 requirements 和 architect 是否按顺序启动，用 fullstack blog plan-only。
- 没有 API key 时，可以先用这些案例跑 `run --dry-run`、`next-agent`、`audit` 和 `gate-check` 的静态链路。

## API Key 提醒

真实子 agent 执行需要对应 agent 环境已配置模型访问方式。Codex native 路径依赖 Codex Desktop / CLI 登录态或 API 环境；SDK/API 模式和 `inspect --ai` 需要 `OPENAI_API_KEY`。
