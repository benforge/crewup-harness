# Harness 扩展指南

中文 | [English](./harness-extension-guide.en.md)

这份指南定义了如何扩展 CrewUp，而不把核心 harness 和目标项目的边界揉在一起。

## 扩展点

| 扩展 | 位置 | 说明 |
| --- | --- | --- |
| Skills 映射 | `.harness/config/skills.yaml` | 声明候选项、别名和安装方式 |
| 项目级 skills | `.agents/skills/<skill-name>/SKILL.md` | 由项目拥有，必要时随仓库复制 |
| 全局 skills | `%USERPROFILE%/.codex/skills/<skill-name>/SKILL.md` | 个人跨项目复用 skills |
| Agent 角色 | `.harness/agents/*.md` | 可复用的角色 prompt 和职责 |
| Policies | `.harness/config/*.yaml` | 委派、模型、风险、写入、归档、质量门禁 |
| Rules | `.harness/rules/*.md` | 面向前端、后端、数据库、安全、测试的通用约束 |
| Templates | `.harness/templates/*.md` | 报告和产物骨架 |

## Skill 规则

CrewUp 负责引用 skills，不负责垄断拥有它们。

- 如果 skill 是项目专属，放在项目里。
- 如果 skill 是个人常用并跨仓库复用，放在全局 Codex skills 目录。
- 如果 skill 只需要映射或发现能力，写进 `.harness/config/skills.yaml`。

## 降级规则

如果 skill 或插件缺失，工作流应继续使用：

1. 项目文件
2. README
3. lockfiles
4. 官方文档链接
5. 普通上下文分析

插件缺失不能中断工作流。

## Init 规则

`crewup init` 应基于真实仓库推断项目结构并生成适配层，但不能假装自己比仓库证据更懂项目。

## 变更规则

新增扩展点时，应同步更新：

- 文档
- 对应 policy 或 mapping 文件
- 若影响校验，还要更新 check 脚本
