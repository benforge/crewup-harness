# CrewUp Lite 轻量流程

[English](./lite-v2.en.md) | 中文

`lite` 是公开、显式启用的轻量 CrewUp 流程。它内部映射到 `lite-v2` profile，适合低风险、小范围实现任务：记录小规格、任务清单、验证证据和总结，然后由主 agent 在范围内直接实现。

`lite` 不替代 strict，也不能被描述成 strict 审计交付证明。

## 启用方式

```bash
npx crewup run --mode=lite "修复 Admin 文章列表移动端横向溢出，并根据项目配置自行发现和执行必要验证"
```

旧脚本仍可使用兼容别名：

```bash
npx crewup run --profile=lite-v2 "修复一个小 UI 问题"
```

聊天里这样说：

```text
使用 CrewUp lite，只改前端样式和交互。完成后根据项目配置自行发现并执行必要验证，必要时做页面预览验证，并更新 validation.md 和 summary.md。
```

## 适合

- UI 样式、布局、文案、空状态、移动端适配。
- 单模块 bugfix。
- 小功能、小脚本、小文档联动修改。
- 需要 run 证据，但不需要完整 strict 审计链的工作。

## 不适合

- 数据库 schema、migration 或真实数据变更。
- Auth、权限、安全、支付、生产部署、CI/CD。
- 跨多个业务模块的大功能。
- 需要完整审计证据的正式交付。

这些场景应该使用 `strict` 或 `strict --risk=high`。

## 固定生成文件

```text
.harness/runs/<run-id>/
  input.md
  spec.md
  tasks.md
  validation.md
  summary.md
  state.json
  RUN_STATUS.md
```

`lite` 不创建 native subagent task，也不生成 `logs/native-subagents/native-subagent-plan.json`。

## 四个核心文件

| 文件 | 作用 |
| --- | --- |
| `spec.md` | 目标、范围、非目标、验收标准、风险 |
| `tasks.md` | 实现清单、允许范围、验证发现步骤 |
| `validation.md` | 从项目配置发现的命令/检查、页面预览或 smoke 证据 |
| `summary.md` | 结果、改动文件、验证结论、剩余风险 |

`validation.md` 和 `summary.md` 不能停留在 pending 状态。`finish` 会在它们未更新时拒绝 success。

## 推荐执行顺序

```text
run --mode=lite
  -> read spec.md/tasks.md
  -> implement directly in scoped files
  -> discover and run validation
  -> update validation.md
  -> update summary.md
  -> crewup finish <run-id>
```

## 完成标准

- `spec.md` 和 `tasks.md` 存在。
- `validation.md` 存在且不再是 pending。
- `summary.md` 存在且不再是 pending。
- 验证失败时不能伪装成 success，应该修复或归档为 blocked/partial。

## 和 strict 的区别

| 能力 | lite | strict |
| --- | --- | --- |
| 启用方式 | 显式 `--mode=lite` | 显式 `--mode=strict` |
| 主 agent 写业务代码 | 允许，但必须限范围 | 不允许，必须 owner agent |
| native subagents | 默认不创建 | 主路径 |
| owner provenance | 不要求 strict 级别 | 必须 |
| tester/reviewer/release | 不要求 | 必须 |
| 适合 | 低风险、小范围 | 高风险、跨模块、审计交付 |

## 卡住处理

先检查 `validation.md`、`summary.md` 是否仍是 pending，验证发现是否充分、实际检查是否失败，以及是否发现需要升级 strict 的风险。风险升级时不要强行 `finish`，应记录 blocked/partial，或者创建 strict continuation。

## 稳定边界

- 不把 `lite` 做成自动默认。
- 不删除 strict。
- 不让 `lite` 跳过验证证据。
- 不把 `lite` success 描述成 strict audit success。
