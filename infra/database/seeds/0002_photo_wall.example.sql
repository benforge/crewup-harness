PRAGMA foreign_keys = ON;

-- Optional development-only seed. Keep production COS secrets and private URLs out of seed data.
INSERT INTO media_assets (
  id,
  provider,
  original_url,
  mime_type,
  size_bytes,
  width,
  height,
  access_policy,
  status,
  metadata,
  created_at,
  updated_at
) VALUES (
  'media_example_workspace',
  'static_url',
  '/images/photo-wall/workspace-example.webp',
  'image/webp',
  245760,
  1600,
  1067,
  'public',
  'ready',
  '{"placeholderColor":"#d8d2c7"}',
  '2026-05-21T00:00:00.000Z',
  '2026-05-21T00:00:00.000Z'
);

INSERT INTO photos (
  id,
  title,
  description,
  alt,
  media_asset_id,
  category_slug,
  tags,
  taken_at,
  published_at,
  status,
  sort_order,
  featured,
  created_at,
  updated_at
) VALUES (
  'photo_example_workspace',
  'Workspace example',
  'Development seed for verifying the photo wall data shape.',
  'A tidy engineering workspace used as photo wall seed data.',
  'media_example_workspace',
  'workspace',
  '["workspace","engineering"]',
  '2026-05-21T00:00:00.000Z',
  '2026-05-21T00:00:00.000Z',
  'published',
  100,
  1,
  '2026-05-21T00:00:00.000Z',
  '2026-05-21T00:00:00.000Z'
);
