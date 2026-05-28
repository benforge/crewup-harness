# API 变化记录

## 是否涉及 API

- [x] 是
- [ ] 否

## 设计原则

- 公开 API 只返回发布态照片和展示字段；后台 API 需要管理员鉴权。
- 图片访问 URL 由后端生成，前端不直接接触 COS Secret、Bucket 私有策略或 SDK。
- 上传流程分为签名/上传/登记/关联，保证媒体资产和照片记录可追踪、可重试、可回滚。
- API 路径草案遵循当前 NestJS 已有 public/admin controller 分层，最终命名由 backend agent 对齐现有约定。

## 新增接口

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/photos` | 公开照片列表，支持 `page`、`pageSize`、`tag`、`category`、`year`、`cursor`、`sort`；只返回 published。 | 公开 |
| GET | `/photos/:id` | 公开照片详情，返回大图 URL、缩略图 URL、标题、描述、alt、标签、分类、拍摄时间、邻近导航可选字段。 | 公开 |
| GET | `/admin/photos` | 后台照片列表，支持状态、标签、分类、关键词、时间范围筛选。 | 管理员 |
| POST | `/admin/photos` | 创建照片记录，可关联已登记 `mediaAssetId` 和 `thumbnailAssetId`。 | 管理员 |
| GET | `/admin/photos/:id` | 后台照片详情，包含内部状态、对象 key、错误诊断字段。 | 管理员 |
| PATCH | `/admin/photos/:id` | 更新照片元数据、状态、排序、标签、分类、alt、拍摄时间。 | 管理员 |
| DELETE | `/admin/photos/:id` | 删除或软删除照片记录；首期建议软删除。 | 管理员 |
| PATCH | `/admin/photos/:id/status` | 快速发布、隐藏、草稿切换。 | 管理员 |
| PATCH | `/admin/photos/reorder` | 批量更新排序值；需保证失败时不产生半更新或返回明确失败项。 | 管理员 |
| POST | `/admin/media/upload-signature` | 获取上传签名/策略或临时上传参数，限定 mime、大小、key 前缀、有效期。 | 管理员 |
| POST | `/admin/media/upload-file` | 可选：服务端中转上传，后端使用 COS SDK `uploadFile`/分片上传。 | 管理员 |
| POST | `/admin/media/complete` | 上传完成登记，保存 objectKey、etag/hash、size、mime、width、height、provider。 | 管理员 |
| POST | `/admin/media/refresh-url` | 后台刷新一个或多个 media asset 的访问 URL，用于预览或诊断。 | 管理员 |
| GET | `/media/:id/url` | 可选：刷新公开展示 URL；应校验该 media 已关联 published photo。 | 公开或受限公开 |

## 请求/响应草案

### `GET /photos`

- Query: `page`、`pageSize`、`cursor`、`tag`、`category`、`year`、`sort`。
- Response: `items[]` 包含 `id`、`title`、`description` 摘要、`alt`、`imageUrl`、`thumbnailUrl`、`width`、`height`、`tags`、`category`、`takenAt`、`publishedAt`、`sortOrder`；包含 `pagination` 或 `nextCursor`。
- 错误：参数非法返回 400；服务异常返回统一错误结构。

### `GET /photos/:id`

- Response: 在列表字段基础上增加完整 `description`、`relatedProject`、`sourceNote`、可选 `previousId`/`nextId`。
- 当签名 URL 生成失败时，允许返回照片元数据和占位 URL，附带可展示错误状态，但不泄露内部 COS 错误。

### `POST /admin/photos`

- Body: `title`、`description`、`alt`、`mediaAssetId`、`thumbnailAssetId`、`tags`、`categorySlug`、`takenAt`、`status`、`sortOrder`、`featured`。
- 校验：标题、alt、mediaAssetId、状态、排序值；发布态必须有关联可用 media asset。

### `POST /admin/media/upload-signature`

- Body: `filename`、`contentType`、`sizeBytes`、`purpose`。
- Response: 可包含 `provider`、`objectKey`、`uploadUrl` 或临时 credential/signature、`expiresAt`、`headers`、`maxSizeBytes`。
- 安全：签名有效期短，限定 key 前缀和操作；不返回长期 Secret。

### `POST /admin/media/complete`

- Body: `provider`、`objectKey`、`etag`/`hash`、`sizeBytes`、`mimeType`、`width`、`height`、`originalFilename`。
- Response: `mediaAssetId`、`previewUrl`、`expiresAt`、`status`。
- 后端需校验对象 key 前缀、mime、大小、图片尺寸，并记录登记状态。

### `POST /admin/media/refresh-url`

- Body: `mediaAssetIds[]` 或 `objectKeys[]`。
- Response: `items[]` 包含 `mediaAssetId`、`url`、`expiresAt`；失败项返回可诊断错误码。

## 修改接口

| 方法 | 路径 | 修改点 | 兼容性 |
| --- | --- | --- | --- |
| GET | `/articles/:slug` 或现有文章详情 API | 如 API 当前返回 markdown 原文，保持字段不变；如未来预处理 Shiki，可新增 `renderedHtml` 或 `codeHighlights` 字段。 | 新增字段向后兼容 |
| GET | `/tags/:slug` 或现有标签聚合 API | 如照片标签需与文章标签聚合，后续可增加 `include=photos`；首期不要求。 | 默认行为不变 |

## 删除接口

| 方法 | 路径 | 替代方案 |
| --- | --- | --- |
| 无 | 无 | 本次为新增规划，不删除现有 API。 |

## OpenAPI 或 SDK 更新

- 后续 backend agent 需要同步 OpenAPI/接口文档中的 photo/media DTO、错误码、权限说明。
- 如 `packages/sdk` 用于前后端共享 API client，需要新增 public photos、admin photos、admin media 方法。
- 如 `packages/types` 存放共享类型，需要新增 `PhotoSummary`、`PhotoDetail`、`PhotoStatus`、`MediaAsset`、`UploadSignature`、`RefreshMediaUrlResult`。

## 错误码与安全约束

- `PHOTO_NOT_FOUND`: 照片不存在、未发布或已删除；公开侧统一为 404。
- `MEDIA_NOT_READY`: 媒体未登记完成或不可展示。
- `UPLOAD_POLICY_DENIED`: mime、大小、purpose 或 key 前缀不符合策略。
- `SIGNED_URL_EXPIRED`: URL 过期；前端应重新请求刷新或详情。
- `STORAGE_PROVIDER_ERROR`: 存储服务异常；后台可展示诊断 ID，公开侧只展示通用错误。
- 所有 admin 接口未登录返回 401，无权限返回 403；响应不得包含 Secret、Token、完整内部栈。

## Backend implementation notes - 2026-05-21

- Implemented in `apps/api/src/photos/**` using the current in-memory repository pattern. No `infra/database` files were changed.
- Registered `PhotosModule` in `apps/api/src/app.module.ts`.
- Implemented public endpoints under the existing global `/api` prefix:
  - `GET /api/photos`
  - `GET /api/photos/:id`
- Implemented admin endpoints with the existing `AdminAuthGuard`:
  - `GET /api/admin/photos`
  - `POST /api/admin/photos`
  - `GET /api/admin/photos/:id`
  - `PATCH /api/admin/photos/:id`
  - `DELETE /api/admin/photos/:id`
  - `PATCH /api/admin/photos/:id/status`
  - `PATCH /api/admin/photos/reorder`
  - `POST /api/admin/media/upload-signature`
  - `POST /api/admin/media/complete`
  - `POST /api/admin/media/refresh-url`
- Storage boundary is adapter-based: `MockStorageAdapter` and `CosStorageAdapter` implement the same interface. COS behavior is simulated only; no real Tencent Cloud SDK call and no real secret are present.
- Server-only environment variable names used as placeholders:
  - `PHOTO_STORAGE_PROVIDER`
  - `PHOTO_SIGNED_URL_TTL_SECONDS`
  - `PHOTO_MAX_UPLOAD_BYTES`
  - `COS_SECRET_ID`
  - `COS_SECRET_KEY`
  - `COS_BUCKET`
  - `COS_REGION`
  - `COS_PROTOCOL`
- Public photo responses return display URLs, dimensions, alt text, tags, category, published/taken timestamps and ordering fields. They do not return COS secrets, bucket internals, or raw provider credentials.
- Admin media responses mask bucket/region as `configured` when present and never expose secret values.
- DB assumptions kept aligned with `db-migration.md`: first backend pass assumes future `photos` and `media_assets` tables with JSON/text tags, `category_slug`, soft delete, status, `sort_order`, dimensions, provider/object key metadata, and runtime-generated display URLs.
- Validation/check run: `npm --workspace @blog/api run typecheck` passed.

## Backend fix note - 2026-05-21 P0 admin/API contract

- `POST /api/admin/photos` now supports two equivalent creation contracts:
  - Existing media flow: provide `mediaAssetId` and optional `thumbnailAssetId`.
  - Existing URL flow: provide `imageUrl` and optional `thumbnailUrl`; the API registers each URL as a `static_url` media asset with `public` access, then creates the photo.
- `PATCH /api/admin/photos/:id` accepts the same admin-facing URL fields for metadata edits and image replacement.
- Admin photo responses now include the flat fields used by the current admin UI:
  - `imageUrl`
  - `thumbnailUrl`
  - `category`
  - `tags`
  - `status`
  - `sortOrder`
  - `featured`
  - `takenAt`
  - `updatedAt`
- The canonical backend fields are still returned for backend/admin diagnostics:
  - `mediaAssetId`
  - `thumbnailAssetId`
  - `categorySlug`
  - sanitized `mediaAsset`
  - sanitized `thumbnailAsset`
- `POST /api/admin/media/complete` remains available for the explicit two-step flow. If `originalUrl` is sent without an explicit `provider`, the backend records it as `static_url` instead of using the active upload provider. The response contract is:
  - Request: `originalUrl`, `mimeType`, `sizeBytes`, optional `width`, `height`, `hash`, `originalFilename`, `accessPolicy`, `provider`.
  - Response: `mediaAssetId`, `previewUrl`, `expiresAt`, `status`, `provider`.
  - Admin can then send `mediaAssetId` to `POST /api/admin/photos`.
- Security boundary remains unchanged: no Tencent COS SDK call is made, no real COS Secret is read or returned, and admin media objects still mask bucket/region as `configured`.
