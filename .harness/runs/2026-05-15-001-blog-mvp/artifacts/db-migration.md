# 数据库迁移记录

## 是否涉及数据库

- [x] 是
- [ ] 否

## 本轮状态

本轮已新增 SQL 初始迁移骨架：

- `infra/database/migrations/0001_initial.sql`
- `infra/database/migrations/0001_initial.down.sql`
- `infra/database/README.md`

MVP 运行时暂以 NestJS 内存 repository/seed 数据闭环，数据库迁移文件作为下一步持久化接入边界。

## 计划表结构

### users

| 字段 | 说明 |
| --- | --- |
| id | 主键 |
| username | 登录名，唯一 |
| password_hash | 密码哈希 |
| display_name | 展示名 |
| role | 角色，MVP 默认为 `admin` 或 `editor` |
| created_at | 创建时间 |
| updated_at | 更新时间 |

### articles

| 字段 | 说明 |
| --- | --- |
| id | 主键 |
| slug | 文章 slug，唯一 |
| title | 标题 |
| summary | 摘要 |
| body | 正文，MVP 可用 Markdown 文本 |
| cover_image | 封面图，可为空 |
| status | `draft` 或 `published` |
| category_id | 分类 ID，可为空 |
| seo_title | SEO 标题，可为空 |
| seo_description | SEO 描述，可为空 |
| published_at | 发布时间，可为空 |
| created_at | 创建时间 |
| updated_at | 更新时间 |

### categories

| 字段 | 说明 |
| --- | --- |
| id | 主键 |
| slug | 分类 slug，唯一 |
| name | 分类名 |
| created_at | 创建时间 |
| updated_at | 更新时间 |

### tags

| 字段 | 说明 |
| --- | --- |
| id | 主键 |
| slug | 标签 slug，唯一 |
| name | 标签名 |
| created_at | 创建时间 |
| updated_at | 更新时间 |

### article_tags

| 字段 | 说明 |
| --- | --- |
| article_id | 文章 ID，外键 |
| tag_id | 标签 ID，外键 |

## 索引变化

- `users.username` 唯一索引。
- `articles.slug` 唯一索引。
- `articles.status` 普通索引，用于前台列表过滤 published。
- `articles.published_at` 普通索引，用于按发布时间排序。
- `categories.slug` 唯一索引。
- `tags.slug` 唯一索引。
- `article_tags.article_id + tag_id` 组合唯一索引。

## 数据迁移

- 初始 seed 由 API 内存 repository 提供，包含 1 个管理员、1 篇 published 示例文章、1 篇 draft 示例文章、若干 tags。
- SQL migration 不写入明文密码或 seed 密码。
- 后续接入真实 SQLite 时，seed 脚本应读取环境变量或生成本地开发默认值并明确标注。

## 回滚 SQL 或回滚方式

- 已提供 `0001_initial.down.sql`，删除顺序为 `article_tags`、`articles`、`tags`、`categories`、`users`。
- 业务代码回滚通过 Git revert；数据库回滚执行 down SQL。

## 文档依据

- Drizzle 当前文档已通过 Context7 复核：支持 SQLite schema、外键、索引、多对多关联表和 drizzle-kit 配置/导出能力。
