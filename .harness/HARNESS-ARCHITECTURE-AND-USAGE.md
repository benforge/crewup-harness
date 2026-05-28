# Harness 架构设计与使用手册

本文档说明当前 `.harness/` 的分层设计、运行机制、目录职责和标准用法。

## 1. Harness 是什么

`.harness/` 是本项目的 AI 协作层，不替代业务代码，只负责把一次需求变成可追踪、可调度、可验证、可归档的闭环流程。

它主要解决四件事：

1. 把模糊想法整理成可执行需求
2. 把需求拆给合适的角色
3. 把上下文压缩到足够小
4. 把结果沉淀成可追踪记录

它不负责：

1. 替你长期记忆历史
2. 替你直接写完整业务闭环
3. 替你跳过需求、验证、评审和归档

## 2. 总体架构

当前 harness 可以理解为五层：

### 2.1 输入层

来源包括：

- 用户自然语言需求
- backlog
- 既有 run
- 产品文档
- 项目 overlay
- 上下文和规则文件

### 2.2 调度层

负责决定：

- 这次是否进入 harness
- 创建还是复用 run
- 要启动哪些角色
- 哪些任务先做、哪些并行做
- 哪些子 agent 该保留、该关闭

核心文件：

- `.harness/AGENTS.md`
- `.harness/orchestrator/main-agent.md`
- `.harness/orchestrator/native-subagents.md`
- `.harness/orchestrator/routing-rules.md`
- `.harness/config/delegation-policy.yaml`
- `.harness/config/workflow.yaml`
- `.harness/config/native-subagents.yaml`

### 2.3 上下文层

负责把“所有内容”压缩成“当前角色需要看的内容”。

核心产物：

- `artifact-index.md`
- 每个 agent 的 `context-pack`
- `native-plan`
- `desktop prompt`

核心目标：

- 默认轻量
- 只给当前角色必要内容
- 需要细节时再展开原文

### 2.4 执行层

负责真正完成任务。

分两种路径：

1. `orchestrate.mjs` 的 API 执行路径
2. `spawn_agent / wait_agent / close_agent` 的 native subagent 路径

### 2.5 沉淀层

负责把结果保留为长期可追踪资料。

主要目录：

- `.harness/runs/<run>/artifacts/`
- `.harness/runs/<run>/logs/`
- `.harness/knowledge/`
- `docs/product/`

## 3. 目录结构

```text
.harness/
  AGENTS.md
  HARNESS-WORKFLOW.md
  HARNESS-ARCHITECTURE-AND-USAGE.md
  agents/
  backlog/
  config/
  contracts/
  dashboard/
  knowledge/
  orchestrator/
  project/
  reports/
  rules/
  runs/
  scripts/
  templates/
  skills/
```

### 3.1 `config/`

决定 harness 怎么跑。

重要配置：

| 文件 | 作用 |
| --- | --- |
| `workflow.yaml` | 阶段、状态和门禁 |
| `delegation-policy.yaml` | 哪些任务该委派给谁 |
| `model-policy.yaml` | 不同角色使用什么模型 |
| `context-policy.yaml` | 上下文怎么压缩、怎么升级 |
| `native-subagents.yaml` | 原生子 agent 生命周期和保留池 |
| `write-policy.yaml` | 谁能写、写哪里 |
| `risk-policy.yaml` | 哪些操作算高风险 |
| `document-policy.yaml` | run artifact 和长期产品文档的边界 |
| `artifact-schema.yaml` | artifact 必须有哪些内容 |

### 3.2 `project/ai/`

当前仓库的项目级 overlay。

适合放：

- 通用语言规则
- 当前项目业务规则
- 当前项目测试约定
- 当前项目共通 scope 规则

不适合放：

- 某个具体页面/接口/模块的细节规则
- 过于局部、只在一个目录里生效的约束

### 3.3 `rules/`

跨项目通用角色规则。

例如：

- frontend 通用规范
- backend 通用规范
- tester 通用规范
- security 通用规范

### 3.4 `agents/`

角色定义文件。

每个文件描述一个角色：

- 身份
- 职责
- 输入
- 输出
- 不该做什么

### 3.5 `orchestrator/`

主调度规则。

关键职责：

- 主 agent 的边界
- native subagent 生命周期
- 路由规则
- 人工确认点
- 桌面执行方式

### 3.6 `contracts/`

协作契约。

包括：

- agent 怎么交接
- artifact 最低要求
- 什么叫 done
- handoff 里要保留什么

### 3.7 `templates/`

各种产物模板。

包括：

- requirement
- architecture
- implementation plan
- test report
- review report
- release summary
- main summary

### 3.8 `scripts/`

真正执行 harness 的脚本层。

常用命令：

```bash
npm run harness:run -- "..."
npm run harness:check
npm run harness:status
npm run harness:intake -- --text="..."
npm run harness:backlog-item -- --text="..."
npm run harness:new-run -- <backlog-file>
npm run harness:prepare-run -- <run-id>
npm run harness:context-pack -- <run-id>
npm run harness:native-plan -- <run-id>
npm run harness:native-state -- <run-id> status
npm run harness:transition -- <run-id> --to=plan
npm run harness:verify -- <run-id>
npm run harness:report -- <run-id>
npm run harness:dashboard
npm run harness:changed-files -- <run-id> add <file...>
npm run harness:changed-files -- <run-id> infer
npm run harness:next -- <run-id>
npm run harness:knowledge
```

`harness:run` 是默认统一入口；只有需要调试或手工推进某个阶段时，才拆开调用其它命令。

### 3.9 `backlog/`

正式 run 之前的需求池。

目录语义：

- `new/`：刚出现、还模糊
- `ready/`：已整理好，随时可开 run
- `in-progress/`：正在推进
- `review/`：等待确认或评审
- `done/`：已完成

### 3.10 `runs/`

每次正式迭代的容器。

```text
.harness/runs/<run-id>/
  input.md
  state.json
  tasks/
  artifacts/
  logs/
```

这是最重要的事实边界。

### 3.11 `knowledge/`

跨 run 的长期沉淀。

适合放：

- dev-map
- lessons learned
- task board
- 模块索引

### 3.12 `dashboard/`

运行面板。

用来快速看：

- backlog 状态
- run 状态
- artifact 状态
- native subagent 状态

## 4. 运行链路

标准闭环顺序：

```text
intake
-> backlog
-> new-run
-> prepare-run
-> context-pack
-> native-plan
-> spawn / wait / close
-> verify
-> review
-> release
-> done
-> archive commit
```

## 5. 主 agent 的职责

主 agent 只做总控，不做正式业务实现。

它负责：

1. 判断是否进入 harness
2. 选择或创建 run
3. 生成 tasks
4. 生成 context-pack
5. 生成 native-plan
6. 启动和管理子 agent
7. 运行门禁
8. 收集结果
9. 汇总
10. 归档提交

它不应该：

- 自己承担完整需求分析
- 自己完成正式代码实现
- 自己绕过子 agent 直接把整件事做完

## 6. 子 agent 的职责

子 agent 只做自己角色内的事情。

常见角色：

- `pm`
- `requirements`
- `requirements-plan`
- `architect`
- `frontend`
- `backend`
- `database`
- `devops`
- `tester`
- `reviewer`
- `release`

子 agent 的结果需要回到：

- `waiting_review`
- `ready_to_close`
- `closed`

原则：

- 完成不等于关闭
- 完成后先保留，便于追问和补丁
- 确认不再需要时再关闭

## 7. 上下文设计

当前 harness 的上下文原则是：

1. 默认轻量
2. 只给当前角色需要看的内容
3. 通过摘要和索引替代全文
4. 需要时再展开原文

主 agent 看到的重点是：

- `artifact-index`
- `native-state`
- run state
- 各 agent 摘要
- 门禁结果

子 agent 看到的重点是：

- 自己的任务
- 允许修改范围
- 相关 artifact
- 项目 overlay
- 命中的 scope 规则

## 8. 使用 SOP

### 8.1 用户只是想法

你可以直接说：

```text
我想给首页加一个更明显的搜索入口，但我还没想清楚。
```

系统应优先进入需求整理和澄清，而不是直接写代码。

### 8.2 用户想直接做

你可以直接说：

```text
现在直接实现：给首页加一个搜索入口。
```

这会进入正式 run，走完整调度和闭环。

### 8.3 用户只想分析，不想改代码

你可以直接说：

```text
先帮我分析这个方案，不要改代码。
```

这类任务通常只做分析、记录、澄清或轻量文档，不进入正式实现。

### 8.4 查看状态

```bash
npm run harness:status
npm run harness:dashboard
npm run harness:native-state -- <run-id> status
```

### 8.5 推进阶段

```bash
npm run harness:transition -- <run-id> --to=plan
npm run harness:transition -- <run-id> --to=implement --approve-implementation
npm run harness:transition -- <run-id> --to=verify
npm run harness:transition -- <run-id> --to=review
npm run harness:transition -- <run-id> --to=release
npm run harness:transition -- <run-id> --to=done
```

### 8.6 使用 native subagents

```bash
npm run harness:context-pack -- <run-id> --agents=frontend,backend
npm run harness:native-plan -- <run-id> --agents=frontend,backend
npm run harness:native-state -- <run-id> status
```

生命周期建议：

1. 先生成 context-pack
2. 再生成 native-plan
3. 再 spawn
4. 再记录 handle
5. 再等待结果
6. 再写 result
7. 再决定是否保留到 `waiting_review`
8. 最后才关闭

### 8.7 归档

run 进入 done 后：

- 必须有测试、评审、发布摘要
- 必须清理不再需要的子 agent
- 必须自动走 archive commit
- 归档提交默认只提交当前 run 目录、来源 backlog 文件和 changed-files 清单，业务代码或产品文档变更需要先用 `harness:changed-files` 记录
- `harness:changed-files infer` 只根据 git baseline 输出候选文件列表，不读取完整 diff
- `harness:next` 只输出下一步建议、缺口和风险提醒，避免主 agent 反复读大量文件
- `harness:knowledge` 生成跨 run 摘要索引，默认最多通过摘要引用历史，不默认加载历史 artifacts 全文

## 9. 项目级规则怎么放

正确分层是：

- `.harness/rules/`：通用角色规则
- `.harness/project/ai/rules/`：当前项目公共规则
- `apps/*/.ai/rules.md`：具体 app 规则
- `packages/*/.ai/rules.md`：具体 package 规则

不要把所有项目细节都塞进 `.harness/` 核心里。

## 10. 这套 harness 已经解决了什么

1. 主 agent 只做调度
2. 需求有 run 容器
3. 上下文有索引和摘要
4. 子 agent 生命周期可追踪
5. 阶段推进有门禁
6. 归档可自动提交
7. token 预算可观测

## 11. 仍然要注意什么

1. 不要把全文默认灌给主 agent
2. 不要让主 agent 直接代替子 agent 做正式实现
3. 不要跳过需求、验证、评审和归档
4. 不要把项目细则全部塞进全局层
5. 不要把 done 当作“聊完了”而不是“闭环了”

## 12. 最短使用口诀

```text
模糊想法 -> 先澄清
明确需求 -> 开 run
任务拆分 -> tasks
按需阅读 -> context-pack
真正执行 -> native-plan + subagents
结果收口 -> verify / review / release
归档落盘 -> done + commit
```
