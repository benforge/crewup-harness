# CrewUp 测试矩阵

中文 | [English](./test-matrix.en.md)

这份文档面向维护者，用来判断一次改动应该运行哪些测试。发布前必须跑完整 preflight；只改文档也至少要跑 `harness:check`，因为它会检查配置、模板和文档编码。

## 快速检查

```bash
npm run harness:check
npm test
```

覆盖：

- harness 配置、脚本和模板完整性
- YAML / JSON 解析
- `.harness/` 和 `docs/` 的可疑 UTF-8 / 乱码检查
- 最小示例项目 smoke test

## 安装与升级矩阵

```bash
npm run test:install-flow
```

覆盖：

- 本地 `npm pack` tarball 安装
- `crewup install`
- `crewup install --force` 保留 `.harness/runs/`、`.harness/knowledge/`、`.harness/project/`、`.harness/reports/`、`.harness/dashboard/`
- `crewup install --reset` 删除旧 `.harness/` 后重装
- `.harness/core-lock.json` 生成和 sealed core 漂移检测
- 安装态项目里的 `doctor` / `check`

## 完整工作流矩阵

```bash
npm run harness:test-flow
```

覆盖：

- run 创建和语义化 runId
- run 分支创建和 dirty baseline 记录
- `requirements-plan -> requirements -> architect` 顺序
- implementation agents 等待 `implementation-plan.md` 精确分配后才启动
- `next-agent` runnable / blocked 输出
- owner artifact provenance 拦截
- tester/reviewer repair 回派
- `changed-files` / `gate-check` 越权拦截
- cancel / archive / continue 生命周期
- 无初始 git commit 时 archive commit 跳过并写 audit
- 编码帮助和状态卡输出

## 发布前检查

```bash
npm run release:preflight
```

覆盖：

- `harness:check`
- `npm test`
- `test:install-flow`
- 完整 pack-install workflow
- `npm pack --dry-run`

## 什么改动跑哪一个

| 改动类型 | 推荐测试 |
| --- | --- |
| 安装、升级、core-lock、CLI install | `npm run test:install-flow` |
| agent 顺序、run 生命周期、gate、repair | `npm run harness:test-flow` |
| 归档、finish、archive commit | `npm run harness:test-flow` + `npm run release:preflight` |
| 状态卡、run list、用户可见 CLI | `npm run harness:test-flow` |
| 文档或配置小改 | `npm run harness:check` |
| 发布前 | `npm run release:preflight` |

## 维护原则

- 新增 CLI 命令时，至少补 `harness:check` required path 或对应 flow 测试。
- 修改 install / force / reset 时，必须跑 `test:install-flow`。
- 修改工作流顺序、agent gating、owner artifact 或 repair 规则时，必须跑 `harness:test-flow`。
- 不要在真实用户项目里临时修 `.harness` 核心脚本。应先回到 CrewUp 源码仓库补回归测试，再修实现。

## Lite 测试矩阵

`lite` 相关改动至少运行：

```bash
npm run harness:check
npm run harness:test-flow
```

覆盖点：

- 显式 `--mode=lite` opt-in。
- 生成 `spec.md`、`tasks.md`、`validation.md`、`summary.md`。
- 不生成 native subagent tasks 和 native plan。
- pending evidence 阻止 `finish`。
- 更新 validation/summary 后 success archive。
