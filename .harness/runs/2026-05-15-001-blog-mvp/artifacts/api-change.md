# API 变更记录

## 是否涉及 API

- [x] 是
- [ ] 否

## 本轮状态

本轮仅调整 API 技术方案：后端服务改为 NestJS REST API，不修改业务代码。具体接口实现放到下一轮，在写代码前先确认实施计划。

## 技术方案

- NestJS bootstrap 使用 `NestFactory.create(AppModule)`。
- 全局启用 CORS。
- 全局 route prefix 建议为 `/api`。
- 全局启用 validation pipe，白名单过滤请求字段。
- 使用 modules/controllers/providers 分层组织 `auth`、`articles`、`db`。
- 使用 exception filter 统一错误响应。
- 使用 guard 或 middleware 处理管理员 Bearer token。

## 计划新增接口

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/api/health` | 服务健康检查 | 无 |
| GET | `/api/articles` | 返回已发布文章列表 | 无 |
| GET | `/api/articles/:slug` | 返回单篇已发布文章详情 | 无 |
| POST | `/api/admin/login` | 管理员登录，返回会话 token | 无 |
| GET | `/api/admin/articles` | 返回后台文章列表，包含草稿和已发布文章 | Bearer token |
| POST | `/api/admin/articles` | 创建或更新文章草稿 | Bearer token |
| POST | `/api/admin/articles/:id/publish` | 发布文章 | Bearer token |

## 统一错误结构

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": {}
  }
}
```

## 计划契约

- 文章摘要: `id`、`slug`、`title`、`summary`、`coverImage`、`tags`、`category`、`status`、`publishedAt`、`createdAt`、`updatedAt`
- 文章详情: 文章摘要字段 + `body`、`seoTitle`、`seoDescription`
- 登录请求: `username`、`password`
- 登录响应: `token`、`admin`、`expiresAt`
- 保存文章请求: `slug`、`title`、`summary`、`body`、`coverImage`、`categoryId`、`tags`、`seoTitle`、`seoDescription`
- 发布文章请求: 可选 `publishedAt`

## OpenAPI / SDK 更新

- 下一轮优先使用 NestJS DTO 描述请求。
- `packages/types` 保留 response 类型和共享领域类型。
- `packages/sdk` 封装 Next.js 调用 NestJS API。
- 可在后续引入 `@nestjs/swagger` 生成 OpenAPI，但不作为 MVP 硬要求。

## 备注

- NestJS 当前文档已通过 Context7 复核：支持 modules/controllers/providers、全局 validation pipe、CORS、global prefix、exception filters 和测试模块。
- Next.js App Router 会通过服务端数据获取调用 API，公开内容 API 需要稳定支持缓存或后续 revalidate 策略。
