# Agent 协作契约

## 基本契约

- 每个 agent 只对自己的职责范围负责。
- 修改代码前必须读取当前 run 的 `input.md` 和相关 artifacts。
- 不确定时记录问题，不把猜测当成事实。
- 产物必须写入对应 artifact 文件，不能只停留在聊天里。

## 交接契约

- 上游必须写清输入、约束、风险和未决问题。
- 下游必须先确认输入完整，再开始执行。
- 发现上游缺失信息时，补写到 `artifacts/blockers.md`。

## 技能契约

- skill 是能力，不是权限。
- agent 只能使用完成当前职责需要的 skill。
- Context7、Playwright、Figma、Browser、各类 MCP 和插件都是可选增强能力，不是 Harness 的硬依赖。
- 只有当当前会话工具列表或已安装 skill 明确显示能力可用时，agent 才能调用对应工具。
- 涉及库、框架、SDK、CLI、云服务文档时，若 Context7 可用则优先使用；若不可用，必须降级为项目内文档、README、锁文件、官方文档链接或普通上下文分析，并在产物中记录降级原因。
