# Agent 任务：frontend

## Run 信息

- runId: 2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改
- agent: frontend
- stage: implement
- category: implementation
- impact_scopes: (none)

## 推荐模型

- profile: coding_strong
- model: gpt-5.3-codex
- reasoning_effort: high

## 输入

- .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/input.md
- .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/artifacts/requirement.md
- .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/artifacts/architecture.md
- .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/artifacts/implementation-plan.md
- .harness/AGENTS.md
- .harness/agents/frontend.md
- .harness/config/agents.yaml
- .harness/config/project-profile.yaml
- .harness/project/ai/profile.yaml
- .harness/config/model-policy.yaml
- .harness/config/document-policy.yaml
- .harness/rules/frontend.md
- .harness/project/ai/rules/language.md
- .harness/project/ai/rules/domain-blog.md
- apps/admin/.ai/rules.md
- packages/sdk/.ai/rules.md
- packages/types/.ai/rules.md
- packages/ui/.ai/rules.md
- apps/web/.ai/rules.md

## 项目 Overlay

overlay: .harness/project/ai/profile.yaml
project: New project
language: zh-CN
scope_rules: 6

## 职责范围

- 前端架构
- 页面和路由
- 组件体系
- 状态管理
- 数据请求
- 表单和交互
- 可访问性和性能

## 允许修改范围

- apps/admin/**
- .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/artifacts/test-report.md
- apps/web/**
- packages/sdk/**
- packages/ui/**

## 禁止事项

- 无关业务代码
- 其他活跃 agent 负责的文件
- 未经 release 确认前的 docs/product/**
- 密钥、token、生产环境文件

## 必须产出

- frontend code changes or implementation notes
- verification notes

## 当前 run 输入快照

# 迭代一个需求，相册这个照片瀑布流希望是沾满屏幕的，宽度这块，把网站这块英文都修改

- backlogId: 012
- createdAt: 2026-05-26T09:14:03.349Z
- queue: ready
- intake_policy: .harness/config/intake-policy.yaml

## 原始需求

现在做：迭代一个需求，相册这个照片瀑布流希望是沾满屏幕的，宽度这块，把网站这块英文都修改成中文

## 完成检查清单

- [ ] 已阅读 run 输入和相关 artifacts
- [ ] 已保持在职责范围和允许修改范围内
- [ ] 已记录测试，或说明无法运行测试的原因
- [ ] 已更新对应 artifact 或结果摘要
