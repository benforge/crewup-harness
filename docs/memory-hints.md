# CrewUp Memory Hints

中文 | [English](./memory-hints.en.md)

Memory Hints 是 CrewUp 的轻量经验复用机制。它的目标不是把历史 run 的长日志塞进每次上下文，而是从真实交付中提取少量可复用经验，并且只有经过显式晋级后才进入后续选择。

## 设计目标

- 降低重复踩坑：把已经验证过的流程经验沉淀下来。
- 控制 token 消耗：默认只选择短提示，不读取整段历史日志。
- 保持稳定性：候选经验不会自动影响调度、gate 或 owner 规则。
- 保留人工判断：只有维护者确认有价值的经验才晋级为 active hints。

## 目录结构

| 路径 | 作用 |
| --- | --- |
| `.harness/knowledge/lessons/candidates/` | 候选经验，来自某个 run 的证据提取 |
| `.harness/knowledge/lessons/active/` | 已晋级经验，可被后续 run 选择 |
| `.harness/knowledge/lessons/archived/` | 被归档或废弃的经验 |
| `.harness/knowledge/memory-hints.md` | 面向后续上下文的短提示集合 |
| `.harness/knowledge/recalled-lessons.md` | 最近一次选择到的经验记录 |
| `.harness/knowledge/lesson-index.json` | 机器可读索引 |

## 常用命令

从一个 run 中提取候选经验：

```bash
npx crewup learn <run-id>
```

晋级一条候选经验：

```bash
npx crewup learn-promote <lesson-id>
```

归档一条候选或 active 经验：

```bash
npx crewup learn-promote <lesson-id> --archive --reason="no longer useful"
```

刷新知识层：

```bash
npx crewup knowledge
```

## 什么时候晋级

适合晋级的经验通常满足这些条件：

- 来自真实 run 证据，而不是主观猜测。
- 能减少重复返工、错误调度、遗漏 gate 或上下文浪费。
- 表述足够短，可以作为后续 run 的提示。
- 不绑定某个一次性需求、临时文件名或过时命令。

不建议晋级：

- 只是某次任务的长总结。
- 需要大量背景才能理解的历史记录。
- 与当前工作流规则冲突的临时绕路。
- 已经被代码、测试或文档固定下来的规则。

## Token 成本

Memory Hints 的成本应该很低。它不会默认读取所有候选经验，也不会把完整历史 run 带入每次任务。后续 run 只会按相关性选择少量 active hints，并写入 `recalled-lessons.md` 作为审计记录。

如果发现 hints 变长、重复或过时，应归档或重写，而不是继续叠加。

## 与归档的关系

`archive` 会在收口阶段尝试刷新知识层并生成候选经验，但这不等于自动启用经验。正式影响后续上下文之前，仍然需要 `learn-promote` 显式晋级。

这条边界很重要：经验可以沉淀，但不能悄悄改变调度规则、owner 边界或 gate 结果。
