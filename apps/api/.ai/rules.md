# apps/api AI 规则

- 作用域：`apps/api`，面向 NestJS 后端服务；只有任务命中 `api` scope 或 `apps/api/**` 时加载。
- 先读既有 module、controller、service、repository、DTO、filter、guard 和错误响应模式，再新增或修改代码。
- API 输入必须有明确校验，错误响应保持稳定，不把内部异常、密钥、真实账号或生产配置暴露给调用方。
- 新增或修改接口时，同步评估 `packages/types`、`packages/sdk`、前端调用和 `artifacts/api-change.md`。
- 认证、授权、数据写入、删除、迁移、文件上传、对象存储和真实数据相关变更必须记录风险、回滚方式和验证路径。
- Repository 和 storage adapter 边界要清晰，避免把基础设施实现写死进 controller 或页面假设里。
- 测试至少覆盖正向路径、校验失败、权限失败和关键边界；无法自动化时写明手工验证路径。
