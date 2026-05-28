# 数据库迁移记录

## 是否涉及数据库

- [x] 是
- [ ] 否

## 迁移文件

- `infra/database/migrations/0001_initial.sql`
- `infra/database/migrations/0001_initial.down.sql`

## 表结构变化

本次 database agent 沿用现有 `articles` / `article_tags` 命名，不引入 `posts` / `post_tags`，避免后续 backend/frontend 契约漂移。

- `users`
  - 保留 `id`、`username`、`password_hash`、`display_name`、`role`、`created_at`、`updated_at`。
  - `username` 使用大小写不敏感唯一约束。
  - `role` 增加 `CHECK (role IN ('admin', 'editor'))`。
- `categories`
  - 保留 `id`、`slug`、`name`、`created_at`、`updated_at`。
  - 新增 `description TEXT`，支持分类描述。
  - `slug` 使用大小写不敏感唯一约束。
- `articles`
  - 保留 `id`、`slug`、`title`、`summary`、`body`、`cover_image`、`status`、`category_id`、`seo_title`、`seo_description`、`published_at`、`created_at`、`updated_at`。
  - 新增 `author_id TEXT NOT NULL`，外键引用 `users(id)`。
  - 新增 `seo_keywords TEXT`，作为 MVP+ SEO 扩展字段。
  - 新增 `canonical_url TEXT`。
  - 新增 `ai_summary TEXT`。
  - 新增 `content_summary TEXT`。
  - `slug` 使用大小写不敏感唯一约束。
  - `status` 增加 `CHECK (status IN ('draft', 'published'))`。
  - `category_id` 外键调整为 `ON DELETE SET NULL`，删除分类时不破坏文章数据。
- `tags`
  - 保留 `id`、`slug`、`name`、`created_at`、`updated_at`。
  - `slug` 使用大小写不敏感唯一约束。
- `article_tags`
  - 保留 `article_id`、`tag_id` 复合主键。
  - 保留文章/标签删除时级联删除关联行。

## 索引变化

- 保留：
  - `articles_status_idx`
  - `articles_published_at_idx`
  - `articles_category_id_idx`
- 新增：
  - `articles_status_published_at_idx`：支持公开文章按状态和发布时间倒序查询。
  - `articles_author_id_idx`：支持后续按作者查询或管理端审计。
  - `articles_category_status_published_at_idx`：支持分类页只查询 published 文章并按发布时间排序。
  - `article_tags_tag_id_idx`：支持标签页按 tag 找文章。

## 数据迁移

- 未执行数据库迁移。
- 未写入 seed 数据。
- 当前变更更新的是初始 SQLite SQL migration，目标是支持后续从空库初始化 MVP+ schema。
- 如果已有数据库已经执行旧版 `0001_initial.sql`，不能直接重复执行新版 `0001_initial.sql` 来补列；需要 backend/database 后续在确认目标环境后补单独的增量 migration，或重建本地开发库。

## 风险

- `infra/database/**` 与 `*.sql` 属于高风险范围；本次只编辑 migration 文件和 run artifact，没有连接或修改任何真实数据库。
- `articles.author_id` 为 `NOT NULL`。后续 seed 或 backend repository 写入文章时，必须先确保有对应 `users.id`。
- SQLite 外键需要连接侧启用 `PRAGMA foreign_keys = ON`。migration 文件已声明该 pragma，但后续 backend repository 仍应在数据库连接初始化时启用外键约束。
- `slug` 改为 `COLLATE NOCASE UNIQUE` 后，`hello-world` 与 `Hello-World` 会被视为冲突；这符合公开 URL slug 的一致性预期，但可能影响旧开发数据。

## 回滚 SQL 或回滚方式

回滚文件已同步更新：`infra/database/migrations/0001_initial.down.sql`。

回滚顺序：

1. 删除新增和既有索引：
   - `article_tags_tag_id_idx`
   - `articles_category_status_published_at_idx`
   - `articles_category_id_idx`
   - `articles_author_id_idx`
   - `articles_status_published_at_idx`
   - `articles_published_at_idx`
   - `articles_status_idx`
2. 删除表：
   - `article_tags`
   - `articles`
   - `tags`
   - `categories`
   - `users`

注意：该 down migration 会删除所有核心表及数据，只适合空库初始化验证或明确允许重建的本地开发库。生产或共享数据环境必须先备份，并由用户确认后再执行。

## 是否执行迁移

- [ ] 已执行
- [x] 未执行

原因：用户明确要求不要实际执行迁移；本次仅提交 schema/migration 文件和说明文档，等待后续 backend/tester/reviewer 基于此继续推进。
