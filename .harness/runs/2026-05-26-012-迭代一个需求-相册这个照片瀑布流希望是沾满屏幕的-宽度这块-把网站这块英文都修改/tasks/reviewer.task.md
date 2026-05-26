# Agent 任务：reviewer

## Run 信息

- runId: 2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改
- agent: reviewer
- stage: review
- category: review
- impact_scopes: (none)

## 推荐模型

- profile: review_strong
- model: gpt-5.5
- reasoning_effort: high

## 输入

- .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/input.md
- .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/artifacts/requirement.md
- .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/artifacts/architecture.md
- .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/artifacts/implementation-plan.md
- .harness/AGENTS.md
- .harness/agents/reviewer.md
- .harness/config/agents.yaml
- .harness/config/project-profile.yaml
- .harness/project/ai/profile.yaml
- .harness/config/model-policy.yaml
- .harness/config/document-policy.yaml
- .harness/rules/reviewer.md
- .harness/rules/security.md
- .harness/project/ai/rules/language.md
- .harness/project/ai/rules/domain-blog.md
- .harness/project/ai/rules/testing.md

## 项目 Overlay

overlay: .harness/project/ai/profile.yaml
project: New project
language: zh-CN
scope_rules: 6

## 职责范围

- 代码审查
- 安全风险
- 回归风险
- 完成定义检查

## 允许修改范围

- .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/artifacts/review-report.md

## 禁止事项

- 无关业务代码
- 其他活跃 agent 负责的文件
- 未经 release 确认前的 docs/product/**
- 密钥、token、生产环境文件

## 必须产出

- artifacts/review-report.md

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
