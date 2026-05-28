DROP INDEX IF EXISTS article_tags_tag_id_idx;
DROP INDEX IF EXISTS articles_category_status_published_at_idx;
DROP INDEX IF EXISTS articles_category_id_idx;
DROP INDEX IF EXISTS articles_author_id_idx;
DROP INDEX IF EXISTS articles_status_published_at_idx;
DROP INDEX IF EXISTS articles_published_at_idx;
DROP INDEX IF EXISTS articles_status_idx;

DROP TABLE IF EXISTS article_tags;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
