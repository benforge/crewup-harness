# Harness 核心边界

中文 | [English](./harness-core-boundary.en.md)

CrewUp 把可复用工作流核心和项目专属适配层分开。

## 分层

| 层级 | 作用 | 应包含 |
| --- | --- | --- |
| `.harness/` | 可复用工作流核心 | agents、policies、scripts、contracts、templates、rules |
| `.harness/project/` | 项目适配层 | 生成的 profile、overlay、语言规则、测试规则、领域规则 |
| `.harness/runs/` | 运行态执行数据 | 当前和历史 run 记录 |
| `.harness/reports/` | 运行态报告 | run 摘要、交付报告、诊断 |
| `.harness/knowledge/` | 可重建知识索引 | lessons、索引、抽取出的项目知识 |
| `.harness/dashboard/` | 运行态看板 | 生成的 dashboard 产物 |

## 不要混在一起

项目业务资产不要放进可复用核心：

- 应用源码
- 产品专属 README 逻辑
- 应用运行态数据
- 生成的 run 输出
- 一次性测试夹具

## 目标项目推荐保留文件

执行 `crewup init` 后，目标项目通常保留：

- `.harness/`
- `.harness/project/profile.yaml`
- `.harness/project/overlay.yaml`
- `AGENTS.md`
- `README.md`
- `package.json`

## 重置规则

`runs/`、`reports/`、`dashboard/` 以及大部分 `knowledge/` 都应视为可重新生成的运行态状态。
