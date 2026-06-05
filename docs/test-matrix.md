# CrewUp 测试矩阵

中文 | [English](./test-matrix.en.md)

这份文档给维护者使用，用来判断一次改动应该跑哪些测试。

## 快速检查

```bash
npm run harness:check
npm test
```

覆盖：

- harness 配置、脚本、模板完整性
- YAML / JSON 解析
- UTF-8 异常字符检查
- 最小示例项目 smoke test

## 安装和升级矩阵

```bash
npm run test:install-flow
```

覆盖：

- 本地 `npm pack` tarball 安装
- `crewup install`
- `crewup install --force` 保留 `.harness/runs/`、`.harness/knowledge/`、`.harness/project/`、`.harness/reports/`、`.harness/dashboard/`
- `crewup install --reset` 清空旧 `.harness/` 后重装
- `.harness/core-lock.json` 生成和 sealed core 漂移检测
- `doctor` / `check` 在安装态项目中可用

## 完整工作流矩阵

```bash
npm run harness:test-flow
```

覆盖：

- run 创建和语义化 runId
- run 分支创建和 dirty baseline 记录
- `requirements-plan -> requirements -> architect` 顺序
- implementation agents 等 `implementation-plan.md` 精确分配后才启动
- `next-agent` runnable / blocked 输出
- owner artifact provenance 拦截
- tester/reviewer repair 回派
- `changed-files` / `gate-check` 越权拦截
- cancel / archive / continue 生命周期

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

## 什么时候跑哪一个

| 改动类型 | 推荐测试 |
| --- | --- |
| 安装、升级、core-lock、CLI install | `npm run test:install-flow` |
| agent 顺序、run 生命周期、gate、repair | `npm run harness:test-flow` |
| 文档或配置小改 | `npm run harness:check` |
| 发布前 | `npm run release:preflight` |

## 维护原则

- 新增 CLI 命令时，至少补 `harness:check` required path 或对应 flow 测试。
- 修改 install / force / reset 时，必须补 `test:install-flow`。
- 修改工作流顺序、agent gating、owner artifact、repair 规则时，必须补 `harness:test-flow`。
- 不要只在真实用户项目里发现问题后临时修 `.harness`。先在 CrewUp 源码仓库加测试，再修实现。
