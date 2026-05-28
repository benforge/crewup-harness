# 数据库迁移记录

## 是否涉及数据库

- [x] 是
- [ ] 否

## 表结构变化

### `media_assets`

用于隔离媒体存储与业务展示，避免照片表直接绑定 COS。

| 字段 | 类型草案 | 说明 |
| --- | --- | --- |
| `id` | uuid / text | 主键，按现有项目主键策略确定。 |
| `provider` | varchar | `local`、`static_url`、`cos`、`mock`。 |
| `bucket` | varchar nullable | COS bucket；公开响应不返回。 |
| `region` | varchar nullable | COS region；公开响应不返回。 |
| `object_key` | varchar nullable | 对象 key；公开响应不返回或仅后台返回。 |
| `original_url` | text nullable | 静态 URL 或外部 URL provider 使用。 |
| `mime_type` | varchar | 图片 MIME，如 `image/jpeg`、`image/png`、`image/webp`。 |
| `size_bytes` | bigint nullable | 文件大小，用于校验和后台展示。 |
| `width` | integer nullable | 原图宽度；照片墙布局强依赖，发布前建议必填。 |
| `height` | integer nullable | 原图高度；照片墙布局强依赖，发布前建议必填。 |
| `hash` | varchar nullable | etag、sha256 或对象摘要，用于去重和诊断。 |
| `access_policy` | varchar | `public`、`private_signed`、`admin_only`。 |
| `status` | varchar | `pending`、`ready`、`failed`、`deleted`。 |
| `metadata` | json/text nullable | EXIF、占位色、blurHash、错误诊断等扩展信息。 |
| `created_at` | timestamp | 创建时间。 |
| `updated_at` | timestamp | 更新时间。 |
| `deleted_at` | timestamp nullable | 软删除时间。 |

### `photos`

用于 C 端照片墙展示和后台管理。

| 字段 | 类型草案 | 说明 |
| --- | --- | --- |
| `id` | uuid / text | 主键，公开详情 ID。 |
| `title` | varchar | 标题，后台必填。 |
| `description` | text nullable | 描述或项目说明。 |
| `alt` | varchar | 图片替代文本；发布前建议必填。 |
| `media_asset_id` | fk -> `media_assets.id` | 主图资源。 |
| `thumbnail_asset_id` | fk nullable -> `media_assets.id` | 缩略图资源；无则使用主图派生 URL。 |
| `category_slug` | varchar nullable | 首期可独立保存；后续可关联分类表。 |
| `tags` | json/text nullable | 首期可保存字符串数组；后续可迁移关系表。 |
| `taken_at` | timestamp nullable | 拍摄时间，用于年份筛选和排序。 |
| `published_at` | timestamp nullable | 发布时间。 |
| `status` | varchar | `draft`、`published`、`hidden`、`deleted`。 |
| `sort_order` | integer | 人工排序，默认 0。 |
| `featured` | boolean | 是否精选/封面候选。 |
| `created_at` | timestamp | 创建时间。 |
| `updated_at` | timestamp | 更新时间。 |
| `deleted_at` | timestamp nullable | 软删除时间。 |

### 可选关系表

- `photo_tags(photo_id, tag_id 或 tag_slug)`: 若决定复用现有 tags，使用关系表支持跨内容聚合和高效筛选。
- `photo_categories(photo_id, category_id 或 category_slug)`: 如照片分类要与文章分类分离，可暂不建；首期 `category_slug` 足够。

## 索引变化

- `media_assets(provider, object_key)`: 唯一或准唯一索引，避免同一对象重复登记；`object_key` nullable 时需按数据库能力处理部分索引。
- `media_assets(status, provider)`: 后台筛选和诊断。
- `photos(status, deleted_at, sort_order, taken_at, created_at, id)`: 公开列表稳定排序和过滤。
- `photos(category_slug, status, deleted_at)`: 分类筛选。
- `photos(taken_at)`: 年份筛选；如数据库支持表达式索引，可后续增加按 year 的索引。
- `photos(media_asset_id)`: join 主图资源。
- 如 `tags` 使用 JSON/text，首期可不建复杂索引；若筛选性能不足，再迁移关系表并索引 `photo_tags(tag_slug, photo_id)`。

## 数据迁移

- 本次为新增表规划，不修改现有文章、分类、标签数据。
- 首次上线可无历史数据；由后台创建照片记录或 seed 少量示例数据，示例数据不得引用真实私有 COS Secret。
- 若已有静态图片需要迁入，应分批登记为 `media_assets(provider = static_url)`，再创建 `photos` 关联，最后再按需切换为 COS。
- 迁移应分两步上线更稳妥：先建表和后端只读/后台能力，再开放 C 端入口；避免空表或半完成 API 影响首页。
- 发布态照片建议要求 `media_asset_id` 指向 `ready` 资源，且 `width`、`height`、`alt` 不为空；该规则可先在服务层校验，后续再加数据库约束。

## 回滚 SQL 或回滚方式

- 首期新增表迁移应提供 down migration：先删除可选关系表，再删除 `photos`，最后删除 `media_assets`。
- 如果已有生产照片数据，禁止直接 drop；需先导出 `photos`、`media_assets` 和对象 key 清单，确认用户允许后再执行破坏性回滚。
- 回滚应用功能时优先隐藏 `/photos` 入口和 admin 菜单，不必立即删除数据表。
- COS 回滚不应删除对象存储文件；只切换 `provider` 或禁用 COS adapter，保留数据库登记用于后续恢复。
- Markdown/首页相关变更不依赖数据库迁移，可独立回滚。

## 迁移风险

- 物理删除照片记录会破坏对象追踪和恢复能力，首期建议使用软删除。
- JSON tags 便于首期交付，但跨内容聚合和高效筛选能力有限；若产品确认照片标签要与文章标签统一，应优先设计关系表。
- `width`/`height` 缺失会影响瀑布流布局稳定性；发布前应通过后台校验或服务端图片探测补齐。
- 私有 COS URL 不应持久化为长期可访问地址；数据库保存 object key 和 provider 元数据，访问 URL 运行时生成或短期缓存。
- 新增迁移文件属于高风险路径，后续 database agent 执行前需人工确认并做好备份。

## 实际落地记录（Database worker）

- 已按现有 `infra/database` 的 SQLite SQL migration 约定新增 `migrations/0002_photo_wall_media.sql`。
- 已提供对应 down migration：`migrations/0002_photo_wall_media.down.sql`，回滚顺序为先删索引，再删 `photos`，最后删 `media_assets`。
- 已新增开发态可选示例 seed：`seeds/0002_photo_wall.example.sql`，仅用于验证照片墙数据形状；示例使用 `static_url`，不包含 COS 密钥、真实私有 bucket 或生产对象。
- 本项目当前未发现实际迁移框架配置；本次落地方式为文档化 SQL 文件。执行时应在目标 SQLite 数据库上按 `0001_initial.sql` -> `0002_photo_wall_media.sql` 的顺序手动或由后续迁移工具执行。
- 未单独新增 `photo_tags` 关系表；照片标签首期落地为 `photos.tags` JSON/text 字段，后续如需要跨内容高效聚合，再迁移到 `photo_tags` 关系表。
- 软删除通过 `deleted_at` 字段与 `status = deleted` 状态保留；公开查询应由服务层过滤 `status = published` 且 `deleted_at IS NULL`。
