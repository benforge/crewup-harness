# API 变化记录

## 是否涉及 API

- [x] 是
- [ ] 否

## 新增接口

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| POST | `/api/articles/:slug/view` | 为已发布文章增加一次阅读量，返回 `{ viewCount }` | 公开 |

## 修改接口

| 方法 | 路径 | 修改点 | 兼容性 |
| --- | --- | --- | --- |
| GET | `/api/articles` | 文章列表响应新增 `viewCount` | 向后兼容 |
| GET | `/api/articles/:slug` | 文章详情响应新增 `viewCount`，且读取不触发计数 | 向后兼容 |
| GET | `/api/admin/articles` | 后台文章列表响应新增 `viewCount` | 向后兼容 |

## 删除接口

| 方法 | 路径 | 替代方案 |
| --- | --- | --- |

## OpenAPI 或 SDK 更新

- `packages/types` 已同步文章摘要、详情与阅读量响应 schema 的 `viewCount` 字段。
- `packages/sdk` 已新增 `recordArticleView(slug)`，并同步文章读取接口对 `viewCount` 的解析。
