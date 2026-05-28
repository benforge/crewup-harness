PRAGMA foreign_keys = ON;

ALTER TABLE articles
  ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0);

