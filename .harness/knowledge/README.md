# 知识库

这个目录保存自动生成的索引和长期可复用的 harness 经验。

- `dev-map.md`：当前项目结构和 scope 地图
- `decision-index.md`：决策记录索引
- `lesson-index.md` / `lesson-index.json`：Memory Hints 的经验索引
- `run-index.json`：run 索引
- `task-board.md`：run 看板快照
- `module-index.json`：机器可读的 scope 索引
- `lessons/active/`：显式晋级后可进入短提示的经验
- `lessons/candidates/`：自动提炼的候选经验，不自动生效
- `lessons/archived/`：过时经验，仅保留审计

刷新这些文件：

```bash
npm run harness:knowledge
```

从 run 证据中提炼候选经验：

```bash
npm run harness:learn -- <run-id>
```

候选经验不会自动改变路由、门禁或写入策略。需要复用时显式晋级：

```bash
npm run harness:learn-promote -- <lesson-id>
```
