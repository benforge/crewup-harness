# 数据库迁移记录

## 是否涉及数据库
- [x] 是
- [ ] 否

## 表结构变化
- 新增迁移：`infra/database/migrations/0003_article_view_count.sql`
- 目标表：`articles`
- 新增字段：`view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0)`
- 字段语义：文章维度的总阅读次数，API/前端共享字段名建议映射为 `viewCount`。
- 默认值：`0`。历史文章执行迁移后自动获得默认阅读量，后续新写入文章在数据库层也有默认保护。
- 非负约束：`CHECK (view_count >= 0)`，避免持久化负数阅读量。

## 索引变化
- 本次不新增索引。阅读量当前用于展示和单文章自增，不承担列表排序或检索条件。

## 数据迁移
- 无需单独 backfill SQL。SQLite 在新增 `NOT NULL DEFAULT 0` 列后，旧数据读取该列时兼容为 `0`。
- 当前运行时仍是 in-memory repository，本迁移仅准备持久化模型；本轮不引入数据库 adapter，因此执行迁移不会自动改变线上运行时的阅读量存储行为。
- 后续接入真实数据库 repository 时，需要将代码层 `viewCount` 与数据库列 `view_count` 做显式映射，并确保自增写入仍保持非负整数。

## 回滚 SQL 或回滚方式
- 匹配回滚迁移：`infra/database/migrations/0003_article_view_count.down.sql`
- 回滚 SQL：`ALTER TABLE articles DROP COLUMN view_count;`
- 回滚影响：会删除已持久化的阅读量统计数据。若环境中已经产生有效阅读量，回滚前应先导出 `articles.id`、`articles.slug`、`articles.view_count` 并由负责人确认是否可丢弃。
- SQLite 版本注意：`DROP COLUMN` 需要 SQLite 3.35+。如目标环境版本更低，需要采用建临时表、复制旧列、重命名表的手工回滚流程。

## 验证记录
- 已用临时 SQLite 数据库顺序执行 `0001_initial.sql`、`0002_photo_wall_media.sql`、`0003_article_view_count.sql`。
- 已验证历史文章迁移后 `view_count` 默认值为 `0`。
- 已验证 `CHECK (view_count >= 0)` 可拦截负数写入。
- 已验证 `0003_article_view_count.down.sql` 可移除 `view_count` 列。

