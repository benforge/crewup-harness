# 发布检查技能 SOP

在 run 进入 release 或 done 前使用本 SOP。

## 步骤

1. 确认 `test-report.md` 没有必需检查失败。
2. 确认 `review-report.md` 没有阻塞问题。
3. 确认 `release-summary.md` 包含变更范围、部署说明、回滚说明和剩余风险。
4. 如果使用了 native subagents，运行 `npm run harness:native-state -- <run-id> status`。
5. 在 done/归档前，确保所有 `close_required` agent 都已关闭。

## 输出

发布检查结果应写入 `.harness/runs/<run>/artifacts/release-summary.md`。
