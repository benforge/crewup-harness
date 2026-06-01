# Harness 加固路线图

中文 | [English](./harness-hardening-roadmap.en.md)

这份路线图聚焦稳定性、可扩展性和开源可用性。

## P0

1. 已完成：收紧可复用 harness 文件和项目适配文件之间的边界。
2. 已完成：让 `init` 对检测、降级和人工修正更明确。
3. 已完成：增加显式 opt-in scope policy，避免安装后自动吞掉普通聊天。
4. 已完成：增加 artifact provenance 和 no-code gate，保护主 agent 只做调度。
5. 已完成：用可重复的 pack-install 测试覆盖真实发布和安装路径。

## P1

1. 为 web、admin、backend、script、desktop 和混合项目补充最小模板。
2. 逐步记录运行态状态机和 stage transition 规则。
3. 发布扩展 skills、agents 和 policies 的开发者指南。
4. 补充操作系统、Node 和工具集成兼容矩阵。
5. 为 bridge runner 增加更多 result JSON 示例和失败恢复示例。

## P2

1. 改进 dashboard 输出。
2. 扩展生成的知识覆盖。
3. 为 init 和 doctor 增加更丰富的诊断。
4. 增加更多示例项目。

## 成功标准

当满足以下条件时，harness 才适合更广泛的开发者使用：

- 新仓库可以干净地完成 install、inspect、init、check、run 和 finish
- npm tarball 安装路径可以通过 `npm run test:pack-install`
- 扩展作者可以在不改动核心假设的情况下新增能力
- 缺失的可选工具不会破坏流程
- README 和 docs 与实际行为一致
