# 文档更新案例

复制下面内容到聊天窗口：

```text
使用 CrewUp 更新项目文档，只补充 README 和 docs 中的安装、API key、子 agent 工作流、本地测试说明，不改业务代码。完成后需要 tester 检查链接和命令是否一致，reviewer 检查文档是否清晰、没有误导。
```

期望重点：

- 不应启动 backend/database 等无关实现 agent
- docs agent 应负责文档修改
- tester 检查链接、命令和文档一致性
- reviewer 检查风险和遗漏

检查命令：

```bash
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
```
