# reviewer 上下文包

- runId（运行 ID）：2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改
- 上下文模式：full
- 生成时间：2026-05-26T10:58:08.531Z
- 升级原因：task mentions high-risk keyword: security

## 允许修改范围

- .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/artifacts/review-report.md

## 项目 Overlay

# Project Overlay: New project

- overlay: .harness/project/ai/profile.yaml
- language.communication: zh-CN
- language.artifacts: zh-CN
- discovered_scopes: 6
- matched_scopes: (none)

## Project Rule Files

- .harness/project/ai/rules/language.md
- .harness/project/ai/rules/domain-blog.md
- .harness/project/ai/rules/testing.md

## .harness/project/ai/rules/language.md

# 项目语言规则

- 默认使用中文沟通、记录和汇总。
- 需求、方案、实施计划、测试报告、评审报告、发布摘要和交接记录默认使用中文。
- 代码标识、文件路径、API 名称、库名、命令、错误信息和行业通用技术术语可以保留英文。
- 引用外部英文文档时，用中文总结关键结论，不整段复制英文原文。
- 代码注释默认中文；如果周围文件已有英文注释风格，可保持局部一致。

## .harness/project/ai/rules/domain-blog.md

# 当前项目领域规则

- 本项目是个人博客/内容管理系统，核心体验包括公开阅读、分类/标签、文章详情、后台内容管理和基础站点信息。
- C 端体验优先服务阅读和内容发现，不把后台管理式控件直接暴露给普通访问者。
- 后台管理需求要关注模块独立性、受保护路由、登录态、退出、错误提示和刷新后的状态恢复。
- 内容相关变更要注意 SEO、移动端阅读体验、空状态、缺省数据和异常数据展示。
- 需求若只描述风格词，比如“高级”“专业”“简约”，必须转化为可验收的信息层级、布局、色彩、交互和响应式标准。

## .harness/project/ai/rules/testing.md

# 当前项目测试与验证规则

- 验证结果默认写入当前 run 的 `artifacts/test-report.md` 或对应 agent result。
- 前端页面改动至少记录关键路由、桌面视口和移动视口的验证路径。
- 后台管理改动要验证登录态、受保护路由、模块跳转、刷新保持和退出。
- API 或数据写入改动要验证正向路径、错误路径和权限/边界情况。
- 如果无法运行自动化测试，必须写明原因、手工验证路径和未覆盖风险。
- 评审时优先检查验收标准是否逐条对应验证证据，而不是只看构建是否通过。

## 相关文件

### .harness/runs/2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改/artifacts/review-report.md
- 字节数：300

```text
# 评审报告

## 结论

- [ ] 通过
- [ ] 有条件通过
- [ ] 不通过

## 阻塞问题

- 

## 非阻塞建议

- 

## 风险

- 

## 测试缺口

- 

## 是否满足完成定义

- [ ] 是
- [ ] 否

## 复查项

- [ ] 验收标准
- [ ] 测试结果
- [ ] 安全边界
- [ ] 回滚方式

```

## 统计

- 候选文件数：1
- 已纳入文件数：1
- 已纳入字节数：300
