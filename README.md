# 项目 AI Harness 起步模板

这个仓库当前重点是搭建一套可复用的 `.harness/` 协作层，用来承接后续项目开发中的需求整理、多 agent 分工、任务流转、交付物归档和质量门禁。

推荐用法：

1. 把自然语言需求写入 `.harness/backlog/new/`。
2. 需求澄清后移动到 `.harness/backlog/ready/`。
3. 执行 `npm run harness:new-run -- <ready任务文件名>` 创建一次开发 run。
4. 执行 `npm run harness:prepare-run -- <run-id>` 生成角色子任务。
5. 主 agent 按 `.harness/config/workflow.yaml` 和 `tasks/*.task.md` 推进。
6. 每次 run 的过程产物沉淀在 `.harness/runs/<日期-任务名>/artifacts/`。

常用命令：

```bash
npm run harness:check
npm run harness:status
npm run harness:new-run -- 001-blog-mvp.md
npm run harness:prepare-run -- 2026-05-14-001-blog-mvp
npm run harness:context-pack -- 2026-05-14-001-blog-mvp
npm run harness:desktop-plan -- 2026-05-14-001-blog-mvp
npm run harness:orchestrate -- 2026-05-14-001-blog-mvp --dry-run
npm run harness:verify -- 2026-05-14-001-blog-mvp
npm run harness:report -- 2026-05-14-001-blog-mvp
npm run harness:product-sync -- 2026-05-14-001-blog-mvp
npm run harness:dashboard
npm run harness:gate-check -- 2026-05-14-001-blog-mvp
```

这套 harness 的原则是：业务代码放在正常工程目录里，AI 协作规范放在 `.harness/` 里。也就是项目正常开发，AI 只作为可追踪、可复盘、可审查的协作层。

当前默认采用方案 A：Codex 当前会话就是主 agent，负责调度、执行和汇总；仓库脚本负责创建 run、生成子任务和检查基础门禁。

如果需要真实多 agent v1，可以运行 `npm run harness:orchestrate -- <run-id>`。它会按 `tasks/*.task.md` 和 `.harness/config/model-policy.yaml` 启动多个独立模型调用，并把每个 agent 的输出写入 run 日志。真实执行需要 `OPENAI_API_KEY`；不带 key 时可用 `--dry-run` 预览执行计划。

如果要让开发类子 agent 写代码，需要显式加 `--apply-code`。写入会受到 `.harness/config/write-policy.yaml` 和每个 task 的 `允许修改` 限制；非开发 agent 不能写业务代码。

高风险写入还需要显式加 `--approve-risk`。风险规则由 `.harness/config/risk-policy.yaml` 控制，命中数据库迁移、CI/CD、infra、SQL、密钥相关内容时会被拦截。写入前会备份已有文件，并在 `logs/agents/*.code-writes.json` 中记录 hash、备份路径和审批结果。

验证流程由 `.harness/config/checks.yaml` 控制。运行 `npm run harness:verify -- <run-id>` 会执行可用检查，并把结果写入该 run 的 `artifacts/test-report.md`。

上下文包由 `.harness/config/context-policy.yaml` 控制。运行 `npm run harness:context-pack -- <run-id>` 会按每个 agent 的允许修改范围收集相关文件，写入 `logs/context/<agent>.md`，减少子 agent 读取无关上下文。

可视化面板由 `npm run harness:dashboard` 生成，输出到 `.harness/dashboard/index.html`。它会展示 backlog、run、agent 模型、写权限、artifact 状态、验证摘要和日志统计。

产品文档同步由 `npm run harness:product-sync -- <run-id>` 生成。它会读取该 run 的需求、实施计划、发布摘要、阻塞项和测试报告，把产品级摘要写入 `docs/product/runs/<run-id>.md`，并同步更新当周、当月和当年的产品文档。该命令是幂等的，同一个 run 多次同步会替换原有同步块，不会重复追加。

日常开发推荐使用 Codex Desktop 多 agent runner。运行 `npm run harness:desktop-plan -- <run-id>` 会生成每个子 agent 的轻量 prompt，主 agent 可用这些 prompt 在 Codex 桌面客户端右侧 tabs 中委派任务。只有深度执行时才加 `--full`。

模型策略放在 `.harness/config/model-policy.yaml`：调度和状态整理可以使用低成本模型，需求分析使用中等模型，编码和测试修复使用编码模型，评审、数据库和安全风险判断使用更强模型。生成 run 任务时，每个 `tasks/*.task.md` 都会写入推荐模型。

## 省 Token 工作流

日常不要一次启动所有 agent。先按需求判断真正需要谁，例如只改前端和接口时，只生成这两个 agent 的 prompt：

```bash
npm run harness:context-pack -- <run-id> --agents=frontend,backend
npm run harness:desktop-plan -- <run-id> --agents=frontend,backend
```

`harness:desktop-plan` 默认是 `light` 模式，只包含任务、角色摘要、规则摘要和压缩后的上下文。如果只是试跑流程、读代码、拆需求，继续加 `--fast`，会把生成 prompt 里的推荐模型降到低成本模型：

```bash
npm run harness:desktop-plan -- <run-id> --agents=frontend,backend --fast
```

只有当子 agent 明确说上下文不够，或者要做架构级重构时，才使用：

```bash
npm run harness:desktop-plan -- <run-id> --agents=frontend,backend --full
```

建议节奏是：先让 `requirements` 或主 agent 把需求拆小，再只启动 1-3 个开发 agent；每个 agent 完成后再跑 `harness:verify`、`harness:dashboard` 和必要的 `harness:gate-check`。这样能避免 10 个 agent 同时读取全项目上下文，把 token 和时间都打爆。

## 默认委派，不靠关键词

用户正常描述需求即可，不需要每次手动说“请使用子 agent”。根目录 `AGENTS.md` 和 `.harness/config/delegation-policy.yaml` 已约定：

- 正式项目需求默认进入 harness 工作流。
- 主 agent 负责判断、调度、验收和汇总。
- 需求分析、用户故事、验收标准默认委派 `requirements`。
- 技术选型、架构规划、影响范围默认委派 `architect`。
- 开发实现默认委派 `frontend`、`backend`、`database`、`devops` 或 `tester`。
- 评审和风险检查默认委派 `reviewer`。
- 发布摘要和产品沉淀默认委派 `release`。
- 只有简单问答、状态查看、只读检查和很小的文档修补，主 agent 才直接处理。

如果当前 Codex 环境无法启动子 agent，主 agent 可以降级执行，但必须告诉用户哪些任务原本应该委派、为什么没有委派、风险是什么。
