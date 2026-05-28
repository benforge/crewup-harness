# 数据库迁移

本目录保存个人博客 MVP 的数据库模型和迁移说明。

## MVP 方案

- 数据库：SQLite
- 迁移方式：首版保留 SQL migration，后续可接入 Drizzle Kit 生成和管理迁移。
- 初始模型：`users`、`articles`、`categories`、`tags`、`article_tags`

## 执行顺序

1. 从空库执行 `migrations/0001_initial.sql`
2. 照片墙开发阶段继续执行 `migrations/0002_photo_wall_media.sql`
3. 写入开发态 seed 数据，至少包含 1 个管理员、1 篇 published 文章、1 篇 draft 文章
4. 如需验证照片墙数据形状，可在开发库额外执行 `seeds/0002_photo_wall.example.sql`；该 seed 只使用静态示例 URL，不包含 COS 密钥或真实私有对象。

## 回滚

按 `migrations/0001_initial.down.sql` 的顺序执行，先删关联表，再删文章、标签、分类、用户表。

照片墙迁移回滚执行 `migrations/0002_photo_wall_media.down.sql`。生产环境如已写入照片数据，先导出 `photos`、`media_assets` 及对象 key 清单并人工确认，再执行 drop 类回滚。
