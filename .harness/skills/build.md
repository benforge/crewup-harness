# 构建技能 SOP

当 agent 需要验证构建健康度时使用本 SOP。

## 步骤

1. 从 run task 或 `dev-map.md` 识别影响范围。
2. 如果命中的 scope 有本地构建脚本，优先运行本地脚本。
3. 如果没有 scope 本地命令，使用 `.harness/config/project-profile.yaml` 中的项目级命令。
4. 在 `artifacts/test-report.md` 记录命令、退出码和关键错误。
5. 没有命令结果时，不要声称构建成功。

## 默认命令

```bash
npm run build
```
