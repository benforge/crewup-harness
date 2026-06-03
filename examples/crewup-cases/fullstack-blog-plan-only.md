# 全栈博客规划案例

复制下面内容到聊天窗口：

```text
使用 CrewUp 规划一个全栈博客系统。当前阶段只做需求澄清、技术选型建议、目录结构设计、模块边界、开发阶段拆分和验收标准，不写业务代码。系统包含 C 端博客前台、Admin 后台、后端 API、数据库。
```

期望流程：

```text
requirements-plan -> requirements -> architect -> reviewer
```

这个案例用于验证：

- plan-only profile 是否识别正确
- `requirements-plan.md` 是否由 requirements-plan agent 写入
- `requirement.md` 是否由 requirements agent 写入
- `architecture.md` 和 `implementation-plan.md` 是否由 architect agent 写入
- 主 agent 是否没有代写规划产物

检查命令：

```bash
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
```
