PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'static_url' CHECK (provider IN ('local', 'static_url', 'cos', 'mock')),
  bucket TEXT,
  region TEXT,
  object_key TEXT,
  original_url TEXT,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  size_bytes INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  hash TEXT,
  access_policy TEXT NOT NULL DEFAULT 'public' CHECK (access_policy IN ('public', 'private_signed', 'admin_only')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed', 'deleted')),
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  CHECK (object_key IS NOT NULL OR original_url IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  alt TEXT NOT NULL,
  media_asset_id TEXT NOT NULL,
  thumbnail_asset_id TEXT,
  category_slug TEXT,
  tags TEXT,
  taken_at TEXT,
  published_at TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden', 'deleted')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (media_asset_id) REFERENCES media_assets(id),
  FOREIGN KEY (thumbnail_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS media_assets_provider_object_key_unique_idx
  ON media_assets(provider, object_key)
  WHERE object_key IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS media_assets_status_provider_idx
  ON media_assets(status, provider);

CREATE INDEX IF NOT EXISTS media_assets_deleted_at_idx
  ON media_assets(deleted_at);

CREATE INDEX IF NOT EXISTS photos_public_list_idx
  ON photos(status, deleted_at, sort_order, taken_at, created_at, id);

CREATE INDEX IF NOT EXISTS photos_category_status_deleted_idx
  ON photos(category_slug, status, deleted_at);

CREATE INDEX IF NOT EXISTS photos_taken_at_idx
  ON photos(taken_at);

CREATE INDEX IF NOT EXISTS photos_media_asset_id_idx
  ON photos(media_asset_id);

CREATE INDEX IF NOT EXISTS photos_thumbnail_asset_id_idx
  ON photos(thumbnail_asset_id);
