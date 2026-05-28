# 异常归档说明

## 结论

本 run 以 `blocked_not_done` 方式归档。业务代码改动暂时保留，但不视为 harness 标准流程完成。

## 原因

- 本次 C 端设计稿调整属于正式前端迭代，应由 `frontend` 子 agent 执行业务代码改动。
- 实际执行中，主 agent 在主窗口直接修改了 `apps/web` 业务代码，缺少真实 native subagent 执行记录。
- 这违反了 harness 的主 agent 边界，因此不能推进到 `done`，也不能写入正常归档提交。

## 已保留的代码状态

本次保留已产生的前端改动，作为异常交付现场留存。未回滚业务代码。

已验证：

- `npm --workspace apps/web run typecheck` 通过
- `npm --workspace apps/web run build` 通过

## 已修复的 harness 问题

- 增加 delegation guard。
- `harness:changed-files` 会阻止未委派的业务代码进入变更清单。
- `harness:transition` 会阻止未委派的业务代码推进阶段。
- `harness:gate-check` 会阻止未委派的业务代码通过质量门禁。
- `harness:check` 会检查 delegation guard 是否接入关键脚本。

## 下个窗口接力说明

请重新提交需求，并观察 harness 是否：

- 创建/选择 run。
- 生成 native plan。
- 在需要开发时启动 `frontend` 子 agent。
- 如果 native tools 不可用，只记录 fallback 并停止，不再由主 agent 直接改业务代码。

本 run 不应再作为正常完成事项继续推进；如要继续交付，应新开 run 走标准委派流程。
