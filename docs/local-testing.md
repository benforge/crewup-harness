# 本地测试 CrewUp

[English](./local-testing.en.md) | 中文

这份文档用于在发包前测试 CrewUp 本身。推荐使用本地 `npm pack` 生成 tarball，再安装到临时项目里测试，这比只在源码仓库里跑脚本更接近真实用户路径。

## 测试什么

本地测试应覆盖：

- install / init / check
- `install --force` 安全升级和运行态保留
- `install --reset` 清空重装
- sealed core / `.harness/core-lock.json`
- run 创建和语义化 runId
- native plan 和 `next-agent` 顺序约束
- implementation agents 等架构分配后才启动
- audit / gate-check 越权拦截
- archive / cancel / continue 生命周期
- 无初始 git commit 时 archive commit 写 audit 并跳过

## 快速命令

源码仓库内：

```bash
npm run harness:check
npm test
npm run test:install-flow
npm run harness:test-flow
npm run release:preflight
```

## 安装链路测试

只测试安装、升级、`--force`、`--reset` 和 sealed core：

```bash
npm run test:install-flow
```

这个测试会创建临时项目，安装本地 tarball，并验证：

- `crewup install` 会生成 `.harness/core-lock.json`
- `crewup install --force` 会更新 core，但保留 runs、knowledge、project、reports、dashboard
- `crewup install --reset` 会删除旧 `.harness/` 后清空重装
- 修改已安装 `.harness/scripts/check.mjs` 后，`crewup check` 会发现 sealed core 漂移
- `doctor` 和 `check` 在目标项目可用

## 完整工作流测试

```bash
npm run harness:test-flow
```

这个测试会创建临时项目，安装本地包，并验证：

- run 创建
- plan-only 路由
- strict workflow 路由
- `requirements-plan -> requirements -> architect` 顺序
- `next-agent` runnable / blocked 输出
- architecture-owned implementation dispatch
- native-state 提前启动拦截
- removed repair-artifacts command guard
- tool-fallback 日志
- status/runs 状态卡
- cancel/archive/continue 生命周期闭环
- archive commit 在无初始提交时跳过并写审计
- audit 越界拦截
- gate-check owner artifact 拦截

## 手动 tarball 测试

PowerShell 示例：

```powershell
npm pack
mkdir C:\tmp\crewup-app
cd C:\tmp\crewup-app
npm init -y
npm install -D "C:\path\to\crewup-harness-<version>.tgz"
npx crewup install
npx crewup init --agent codex --yes
npx crewup check
```

如果 tarball 路径包含空格，必须加引号：

```powershell
npm install -D "C:\Users\me\Documents\New project\crewup-harness-<version>.tgz"
```

否则 npm 会把路径拆开，出现找不到 `package.json` 的错误。

## 最小 run 案例

```bash
npx crewup run --mode=strict "使用 CrewUp 做一个最小 counter web app，跑完整 workflow。验收标准：页面显示 counter，初始值为 0；可以 +1、-1、reset；刷新后数值保留。范围：只做一个很小的前端实现。完成后请根据项目配置自行发现并执行必要验证。"
```

随后检查：

```bash
npx crewup status <run-id>
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
```

## API Key 检查

如果要测试真实 AI 子 agent：

```bash
npx crewup doctor
```

SDK/API 模式或 `inspect --ai` 需要：

```powershell
$env:OPENAI_API_KEY="sk-..."
```

Codex Desktop native 子 agent 以 Codex Desktop 的登录状态和工具能力为准。CrewUp 只负责生成 spawn prompt、native-state 和 gate，不替用户登录模型服务。

## 常见失败

### `next-agent` 没有返回下一个 agent

说明上游 result 没登记，或者 native-state 不完整：

```bash
npx crewup native-state <run-id> diagnose
```

### `gate-check` 报 owner artifact provenance

artifact 可能是主 agent 写的，或者子 agent 没在 result JSON 里声明 `artifactUpdates`。应恢复 owner agent 执行，不让主 agent 复制内容。

### owner artifact 不能由主 agent 修复

活跃 native run 里，owner artifact 应先由 owner agent 修复。结构或生命周期异常时使用 `repair-state` 做审计化状态修复，不再提供 `repair-artifacts` 入口。

### sealed core 漂移

用户项目里不应该修 `.harness` 核心脚本。恢复安装态核心：

```bash
npx crewup install --force
```

如果是 CrewUp 产品 bug，在 CrewUp 源码仓库补测试、修复并发布。

## Lite 测试覆盖

`npm run harness:test-flow` 已覆盖：

- 显式 `--mode=lite` 创建 run。
- `lite` 生成 `spec.md`、`tasks.md`、`validation.md`、`summary.md`。
- `lite` 不生成 native subagent tasks 和 native plan。
- pending 状态下 `finish` 会失败。
- 更新 `validation.md` 和 `summary.md` 后可以 success 归档。

修改 `lite` 模式、轻量收口、模板或文档入口时，至少运行：

```bash
npm run harness:check
npm run harness:test-flow
```
