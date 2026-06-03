# Counter MVP 完整开发闭环

复制下面内容到聊天窗口：

```text
使用 CrewUp 做一个最小 counter web app，跑完整 workflow。验收标准：页面显示 counter，初始值为 0；可以 +1、-1、reset；刷新后数值保留；build/test 通过。范围：只做一个很小的前端实现；不需要 backend、database、auth、routing。
```

期望流程：

```text
requirements-plan -> requirements -> architect -> frontend -> tester -> reviewer -> release
```

验证命令：

```bash
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup report <run-id>
```

重点观察：

- 初始只允许 `requirements-plan`
- `architect` 不应和 `requirements` 并行启动
- `frontend` 应由 `implementation-plan.md` 分配后启动
- 主 agent 不应直接写业务代码
- tester/reviewer 反馈应回派给 `frontend`
