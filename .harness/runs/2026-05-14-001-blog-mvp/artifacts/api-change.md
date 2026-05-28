# API 变更记录

## 是否涉及 API

- [x] 是
- [ ] 否

## 新增接口

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/health` | 服务健康检查 | 无 |
| GET | `/api/articles` | 返回已发布文章列表 | 无 |
| GET | `/api/articles/:slug` | 返回单篇已发布文章详情 | 无 |
| POST | `/api/admin/login` | 管理员登录，返回会话 token | 无 |
| GET | `/api/admin/articles` | 返回后台文章列表 | Bearer token |
| POST | `/api/admin/articles` | 创建或更新文章草稿 | Bearer token |
| POST | `/api/admin/articles/:id/publish` | 发布文章 | Bearer token |

## 修改接口

| 方法 | 路径 | 修改点 | 兼容性 |
| --- | --- | --- | --- |
| POST | `/api/admin/login` | 增加稳定错误码 `AUTH_INVALID`、统一错误结构 | 兼容 |
| 全部接口 | - | 错误响应统一为 `{ error: { code, message, details? } }` | 兼容 |

## 删除接口

| 方法 | 路径 | 替代方案 |
| --- | --- | --- |
| 无 | - | - |

## OpenAPI / SDK 更新

- `packages/types` 新增共享契约：`articleSummarySchema`、`articleDetailSchema`、`loginRequestSchema`、`loginResponseSchema`、`upsertArticleSchema`、`publishArticleSchema`、`apiErrorSchema`
- `packages/sdk` 新增 `createApiClient(baseUrl)`，封装文章列表、文章详情、登录、保存草稿和发布调用

## 备注

- 本次后端以内存存储实现 MVP 闭环，已覆盖文章浏览、登录、草稿保存和发布。
- 持久化数据库、迁移脚本和更完整的 OpenAPI 文档留待数据库与文档子任务继续接入。
