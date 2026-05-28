# API 变化记录

## 是否涉及 API

- [x] 是
- [ ] 否

## 新增接口

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/api/categories` | 获取公开分类列表 | 公开 |
| GET | `/api/categories/:slug/articles` | 获取某分类下的已发布文章 | 公开 |
| GET | `/api/tags` | 获取公开标签列表 | 公开 |
| GET | `/api/tags/:slug/articles` | 获取某标签下的已发布文章 | 公开 |
| GET | `/api/admin/me` | 获取当前管理员信息 | Admin token |
| GET | `/api/admin/articles/:id` | 获取管理端文章详情 | Admin token |
| PATCH | `/api/admin/articles/:id` | 更新文章草稿、分类、标签、SEO/GEO 字段 | Admin token |
| POST | `/api/admin/articles/:id/unpublish` | 下架文章，切回 draft | Admin token |
| GET | `/api/admin/categories` | 获取管理端分类列表 | Admin token |
| POST | `/api/admin/categories` | 创建分类 | Admin token |
| PATCH | `/api/admin/categories/:id` | 更新分类 | Admin token |
| DELETE | `/api/admin/categories/:id` | 删除分类，文章分类置空 | Admin token |
| GET | `/api/admin/tags` | 获取管理端标签列表 | Admin token |
| POST | `/api/admin/tags` | 创建标签 | Admin token |
| PATCH | `/api/admin/tags/:id` | 更新标签 | Admin token |
| DELETE | `/api/admin/tags/:id` | 删除标签并移除文章关联 | Admin token |

## 修改接口

| 方法 | 路径 | 修改点 | 兼容性 |
| --- | --- | --- | --- |
| GET | `/api/articles` | 文章摘要新增 author、category、tags 对象、SEO/GEO 字段；继续只返回 published | 向后兼容，字段增加 |
| GET | `/api/articles/:slug` | 文章详情新增 author、category、tags 对象、SEO/GEO 字段；draft 继续 404 | 向后兼容，字段增加 |
| GET | `/api/admin/articles` | 支持 `status=draft|published` 查询参数 | 向后兼容 |
| POST | `/api/admin/articles` | 请求体新增 categoryId、coverImage、seoTitle、seoDescription、seoKeywords、canonicalUrl、aiSummary、contentSummary | 向后兼容，旧字段仍可用 |

## 删除接口

| 方法 | 路径 | 替代方案 |
| --- | --- | --- |
| 无 | 无 | 无 |

## 错误结构

继续使用稳定错误结构：

```json
{
  "error": {
    "code": "ARTICLE_NOT_FOUND",
    "message": "Article not found"
  }
}
```

新增 slug 冲突错误码：

- `ARTICLE_SLUG_CONFLICT`
- `CATEGORY_SLUG_CONFLICT`
- `TAG_SLUG_CONFLICT`

## OpenAPI 或 SDK 更新

- 暂未生成 OpenAPI。
- Web 与 Admin 侧已直接按新 REST 契约更新本地 API client。
