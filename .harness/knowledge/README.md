# Harness 知识层

这个目录是 harness 写入仓库的项目知识层，用来沉淀项目地图、任务态势和可晋级的经验。

## 文件

- `dev-map.md`：自动生成的项目导航地图，给 agent 作为入口索引。
- `module-index.json`：自动生成的模块和 scope 结构化索引。
- `task-board.md`：自动生成的 backlog/run 轻量看板。
- `lessons-learned.md`：人工或 agent 共同维护的错题沉淀和晋级入口。

## 刷新

```bash
npm run harness:knowledge
```

## 规则

- 不要手工维护 `dev-map.md` 或 `task-board.md` 里的自动生成列表。
- 模块局部知识优先写到代码旁边的 `.ai/rules.md`。
- 项目级经验先写入 `lessons-learned.md`，再晋级为 rule 或 script。
- 能机械检查的经验，优先晋级为脚本或门禁，不要长期停留在自然语言规则里。
