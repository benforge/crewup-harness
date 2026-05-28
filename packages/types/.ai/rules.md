# packages/types AI 规则

- 作用域：`packages/types`，共享类型和 Zod schema；命中共享契约、API 响应、前后端类型同步时加载。
- schema 是前后端契约事实源之一；新增字段要同时考虑后端 DTO、SDK parse、前端展示和兼容性。
- 不随意放宽校验来绕过错误；必须说明缺省值、nullable、optional 和历史数据兼容策略。
- 破坏性字段变更要写入 API 影响、迁移/回滚说明和测试要求。
- 导出保持稳定，避免让业务 app 直接依赖内部临时结构。
