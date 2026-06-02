# Harness 核心边界

中文 | [English](./harness-core-boundary.en.md)

CrewUp 把可复用工作流核心和项目专属适配层分开。

核心只定义流程协议、角色契约、门禁和运行态结构；业务事实来自目标项目，正式产物由对应子 agent 或外部 runner 生成。主 agent 不应把项目专属判断硬编码进可复用核心。

## 分层

| 层级 | 作用 | 应包含 |
| --- | --- | --- |
| `.harness/` | 可复用工作流核心 | agents、policies、scripts、contracts、templates、rules |
| `.harness/project/` | 项目适配层 | 生成的 profile、overlay、语言规则、测试规则、领域规则 |
| `.harness/runs/` | 运行态执行数据 | 当前和历史 run 记录 |
| `.harness/reports/` | 运行态报告 | run 摘要、交付报告、诊断 |
| `.harness/knowledge/` | 可重建知识索引 | lessons、索引、抽取出的项目知识 |
| `.harness/dashboard/` | 运行态看板 | 生成的 dashboard 产物 |

## 激活边界

- 普通聊天、问答、小修改不应因为仓库里安装了 CrewUp 就自动进入 harness。
- 用户明确说 `CrewUp`、`harness`、`crewup run`、`用 CrewUp 做...` 时，才进入严格流程。
- 进入流程后不能临时绕过角色归属、产物 provenance 或阶段门禁。
- 如果用户只要求规划或发现，`plan_only` / `discovery` 应禁止业务代码变更。

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

`runs/`、`reports/`、`dashboard/`、`backlog/`、`project/` 以及 `knowledge/` 都不应在普通升级时被删除。

- `crewup install --force` 是安全升级：更新可复用核心，但保留已有运行态、知识、backlog 和项目适配层。
- `crewup install --reset` 是清空重装：会删除旧 `.harness/`，只应在用户明确要重置时使用。
