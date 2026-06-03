# 本地测试指南

[English](./local-testing.en.md) | 中文

这份文档用于测试 CrewUp 包本身。推荐使用 `npm pack` 生成本地 tarball，再安装到一个临时项目里，这比直接在源码仓库里跑更接近真实用户体验。

## 你能测试什么

不配置 API key 时，可以测试：

- install / init / check
- run 创建、命名、profile、任务生成
- native plan 和 next-agent 的顺序约束
- audit / gate-check 的越界拦截
- pack-install 流程

配置好 Codex 或 API key 后，可以继续测试：

- native 子 agent 是否真实启动
- requirements-plan / requirements / architect 是否由对应子 agent 写 owner artifact
- frontend/backend/database/devops/docs 是否按 implementation-plan 分配
- tester/reviewer 反馈是否回派修复
- release / finish / archive 是否完整闭环

## 在源码仓库打包

```bash
cd "C:\Users\Administrator.SKY-20260324MFW\Documents\New project"
npm run release:preflight
npm pack
```

生成类似：

```text
crewup-harness-0.3.6.tgz
```

## 创建临时测试项目

```bash
mkdir C:\Users\Administrator.SKY-20260324MFW\Documents\crewup-local-test
cd C:\Users\Administrator.SKY-20260324MFW\Documents\crewup-local-test
npm init -y
npm install -D "C:\Users\Administrator.SKY-20260324MFW\Documents\New project\crewup-harness-0.3.6.tgz"
```

## 初始化 CrewUp

```bash
npx crewup install
npx crewup init --agent codex --yes
npx crewup doctor
npx crewup check
```

如果你要测试升级保护：

```bash
npx crewup install --force
```

`--force` 应保留：

- `.harness/runs/`
- `.harness/knowledge/`
- `.harness/project/`
- `.harness/reports/`
- `.harness/dashboard/`
- `.harness/backlog/`

## 最小完整开发案例

在聊天窗口输入：

```text
使用 CrewUp 做一个最小 counter web app，跑完整 workflow。验收标准：页面显示 counter，初始值为 0；可以 +1、-1、reset；刷新后数值保留；build/test 通过。范围：只做一个很小的前端实现；不需要 backend、database、auth、routing。
```

这个案例足够小，但会覆盖：

- requirements-plan
- requirements
- architect
- frontend
- tester
- reviewer
- release

## 关键检查命令

拿到 runId 后，每个阶段都可以跑：

```bash
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup report <run-id>
```

你应该重点确认：

- 初始 runnable 只有 `requirements-plan`
- `requirements` 等 `requirements-plan` 完成后才可启动
- `architect` 等 `requirements` 完成后才可启动
- 实现 agent 由 `implementation-plan.md` 决定
- 主 agent 没有代写 owner artifact
- tester/reviewer 问题被回派给 owner agent
- audit 没有 `owner_artifact_before_owner_done`、`downstream_started_before_prerequisite`、`unassigned_implementation_started`

## 只跑脚本链路

在 CrewUp 源码仓库：

```bash
npm run harness:test-flow
```

它会创建临时项目、安装本地包，并验证：

- run 创建
- plan-only 路由
- strict/full workflow 路由
- next-agent 顺序
- architecture-owned implementation dispatch
- native-state 提前启动拦截
- audit 越界拦截
- gate-check owner artifact 拦截

## API Key 检查

如果你要测试真实 AI 子 agent，先确认：

```bash
npx crewup doctor
```

如果使用 SDK/API 模式或 `inspect --ai`，需要：

```powershell
$env:OPENAI_API_KEY="sk-..."
```

如果使用 Codex Desktop native 子 agent，则以 Codex Desktop 的登录态和工具能力为准。CrewUp 只负责生成 spawn prompt、native-state 和 gate，不负责替你登录模型服务。

## 常见失败

### `next-agent` 没有返回下一个 agent

说明上游 result 没登记，或者 native-state 不完整。运行：

```bash
npx crewup native-state <run-id> diagnose
```

### `gate-check` 报 owner artifact provenance

说明 artifact 可能是主 agent 写的，或者子 agent 没在 result JSON 里声明 `artifactUpdates`。应恢复 owner agent 执行，不要让主 agent 复制内容。

### `audit` 报 retained agent 过多

运行：

```bash
npx crewup native-state <run-id> recommend-close
```

然后按建议释放不再需要的子 agent。
