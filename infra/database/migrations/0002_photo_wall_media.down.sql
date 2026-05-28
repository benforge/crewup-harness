PRAGMA foreign_keys = ON;

DROP INDEX IF EXISTS photos_thumbnail_asset_id_idx;
DROP INDEX IF EXISTS photos_media_asset_id_idx;
DROP INDEX IF EXISTS photos_taken_at_idx;
DROP INDEX IF EXISTS photos_category_status_deleted_idx;
DROP INDEX IF EXISTS photos_public_list_idx;
DROP INDEX IF EXISTS media_assets_deleted_at_idx;
DROP INDEX IF EXISTS media_assets_status_provider_idx;
DROP INDEX IF EXISTS media_assets_provider_object_key_unique_idx;

DROP TABLE IF EXISTS photos;
DROP TABLE IF EXISTS media_assets;
