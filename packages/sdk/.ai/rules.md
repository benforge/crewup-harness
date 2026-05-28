# packages/sdk AI 规则

- 作用域：`packages/sdk`，共享 API client；命中前后端调用契约或 SDK 文件时加载。
- SDK 负责集中请求路径、请求体校验、响应 schema parse 和基础错误处理，避免页面散落重复 fetch 逻辑。
- 新增接口时同步检查 `packages/types`、`apps/api` controller 契约和调用端错误处理。
- 不在 SDK 中硬编码生产地址、密钥、真实 token 或环境私密值；baseUrl 必须可配置或沿用现有默认方式。
- 错误信息要适合调用端展示或二次包装，不能吞掉状态码、校验错误和权限失败的关键信息。
