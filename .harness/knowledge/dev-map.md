# Harness 项目导航地图

> 本文件由 `npm run harness:knowledge` 自动生成。不要手工维护这里的包列表；模块局部知识请写到代码旁边的 `.ai/rules.md`，项目级规则请写到 `.harness/project/ai/`。

## 项目

- 名称：New project
- 包管理器：npm
- overlay: .harness/project/ai/profile.yaml
- 本地规则文件：.ai/rules.md
- 生成时间：2026-05-28T02:53:06.581Z

## 标准命令

- install: `npm install`
- build: `npm run build`
- test: `npm run test`
- typecheck: `npm run typecheck`
- lint: `npm run lint`

## 模块

| 路径 | 包名 | 脚本 | 本地规则 |
| --- | --- | --- | --- |
| `apps/admin` | @blog/admin | `build`, `dev`, `preview`, `typecheck` | `apps/admin/.ai/rules.md` |
| `apps/api` | @blog/api | `build`, `dev`, `start`, `start:dev`, `test`, `typecheck` | `apps/api/.ai/rules.md` |
| `apps/web` | @project/web | `build`, `dev`, `start`, `typecheck` | `apps/web/.ai/rules.md` |
| `packages/sdk` | @blog/sdk | - | `packages/sdk/.ai/rules.md` |
| `packages/types` | @blog/types | - | `packages/types/.ai/rules.md` |
| `packages/ui` | - | - | `packages/ui/.ai/rules.md` |

## 影响范围

| 影响范围(scope) | 负责 agent | 可写路径 | 规则文件 |
| --- | --- | --- | --- |
| admin | frontend | `apps/admin/**` | `apps/admin/.ai/rules.md` |
| api | backend | `apps/api/**` | `apps/api/.ai/rules.md` |
| db | database | `infra/database/**`<br>`apps/api/**/migrations/**` | - |
| docs | release | `.harness/runs/<run>/artifacts/release-summary.md` | - |
| infra | devops | `infra/**`<br>`.github/workflows/**` | - |
| sdk | frontend | `packages/sdk/**` | `packages/sdk/.ai/rules.md` |
| types | backend | `packages/types/**` | `packages/types/.ai/rules.md` |
| ui | frontend | `packages/ui/**` | `packages/ui/.ai/rules.md` |
| web | frontend | `apps/web/**` | `apps/web/.ai/rules.md` |

## 角色使用方式

- PM / requirements：扩写模糊需求前先看本文件，了解项目模块和当前 scope。
- Architect：把 scope 和模块路径作为第一版影响地图，再通过读取真实代码确认。
- 实现类 agent：本文件只作为入口索引；编辑前必须读取 allowed write scope 内的真实文件。
- Reviewer / tester：对照本地图检查需求声明的影响范围是否遗漏模块。

