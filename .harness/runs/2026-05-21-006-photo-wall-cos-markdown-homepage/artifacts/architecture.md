# 架构和影响范围

## 影响范围

- [x] web: Next.js 16 / React 19 C 端首页、文章详情 Markdown 渲染、照片墙列表与详情入口。
- [x] admin: React 19 + Ant Design 5 + Vite 后台新增照片管理、上传/登记流程与状态反馈。
- [x] api: NestJS 11 新增 photo/media 边界、公开查询、后台 CRUD、上传签名/登记/URL 刷新接口。
- [x] db: 新增照片与媒体资源模型，补充状态、排序、标签/分类、对象存储元数据和索引。
- [ ] infra: 本 run 不改 CI/CD、云资源和生产环境；仅规划 COS 环境变量和存储适配边界。
- [x] docs: 仅更新当前 run artifacts，不写入 `docs/product/`。

本阶段只规划，不开发，不修改 `apps/`，不执行迁移，不新增真实 COS 密钥。

## 方案

### 总体架构决策

- 将“照片”作为内容域的一等资源，但与文章域保持松耦合：新增 `photos` 负责公开展示和后台管理，新增 `media_assets` 负责存储对象、URL、尺寸、mime、hash、来源和访问策略。
- C 端只消费 API 返回的可展示 URL、尺寸、alt 和元数据，不直接理解 COS SDK、不持有 `SecretId`/`SecretKey`。
- 后端通过 Storage Adapter 隔离本地/静态 URL/COS：首期可支持手工登记 URL 或对象 key；COS 接入时由 NestJS 服务端初始化 COS Node SDK，统一处理上传、签名 URL 和刷新。
- Markdown 渲染从当前自定义 parser 演进到 `react-markdown + remark-gfm + components`，代码高亮由 Shiki 在服务端或构建期完成，客户端只渲染受控组件和高亮 HTML。

### C 端 IA 与视觉边界

- 首页 `/` 信息层级固定为个人介绍、文章、标签；照片墙仅作为轻量入口出现在主导航、页尾或低优先级文字/图标入口，不在首屏放大面积照片预览。
- 文章列表 `/articles` 与标签聚合 `/tags/[slug]` 保持现有主流程，不因照片墙引入新的内容权重。
- 文章详情 `/articles/[slug]` 增强 Markdown/GFM、目录、表格、引用、图片、链接、代码块和代码高亮；保留现有文章元信息、发布日期、标签入口。
- 照片墙 `/photos` 为独立公共页面，采用克制、专业、内容优先的视觉方向：少装饰、明确留白、稳定网格、图片为主体，筛选与状态控件不抢视觉焦点。
- 照片详情建议首期采用独立路由 `/photos/[id]`，理由是移动端可分享、可刷新、可返回，且比弹层更容易处理签名 URL 过期刷新；桌面端后续可在列表中增强轻量预览。

### 组件边界

- web 组件建议拆分为 `PhotoWallPage`、`PhotoMasonryGrid`、`PhotoCard`、`PhotoFilters`、`PhotoDetail`、`MarkdownRenderer`、`CodeBlock`、`TableOfContents`。
- `PhotoMasonryGrid` 只负责布局、占位尺寸和响应式列数，不发起业务请求；数据加载放在页面级或 `lib/api` 调用层。
- `MarkdownRenderer` 只接受已授权展示的 markdown 字符串和组件映射，不直接读取文章数据；链接、图片、表格、代码块通过 `components` 统一落地样式和安全策略。
- admin 组件建议拆分为照片列表页、照片表单抽屉/页面、上传登记控件、状态/排序操作区；上传签名与登记通过 API service 层封装。

### 照片墙瀑布流方案

- 桌面端使用 CSS columns 或稳定 masonry grid 策略；移动端降为单列或紧凑双列，图片容器必须保留宽高比，避免加载过程造成明显布局跳动。
- API 返回 `width`、`height`、`blurHash`/占位色或 thumbnail URL，前端据此预留尺寸；非首屏图片懒加载。
- 支持标签、分类、年份筛选；首期可以先实现标签筛选，但 API/DB 预留分类与拍摄年份字段。
- 状态必须覆盖 loading、空列表、筛选无结果、接口错误、单图加载失败、签名 URL 过期重取。
- 排序默认为 `sortOrder desc, takenAt desc, createdAt desc, id desc`，保证同排序值下结果稳定。

### Markdown 渲染方案

- 采用 `react-markdown` 渲染 Markdown，接入 `remark-gfm` 支持表格、任务列表、删除线、自动链接等 GFM 能力。
- 通过 `components` 覆盖 `h1-h6`、`a`、`img`、`table`、`blockquote`、`pre/code` 等元素，统一排版、响应式表格、站外链接 `rel` 策略、图片 alt 和错误占位。
- 默认不启用原始 HTML；如后续必须支持 HTML，应通过明确白名单和清洗策略后再打开 `rehype-raw`，不得让文章正文执行任意脚本。
- Shiki 使用 light/dark 双主题，例如 `vitesse-light` / `vitesse-dark` 或项目确定的等价主题；优先在服务端组件、构建期或 API 预处理阶段异步生成高亮 HTML。
- 未知语言、无语言标识或 Shiki 初始化失败时降级为普通 `<pre><code>`，正文阅读不因高亮失败中断。

### Admin 管理路由

- 在现有后台受保护路由下新增照片管理入口，建议路径为 `/photos` 或 `/content/photos`，由现有后台路由结构最终决定。
- 列表能力：缩略图、标题、状态、排序、标签、分类、拍摄时间、创建/更新时间、快速发布/隐藏、编辑、删除或软删除。
- 表单能力：标题、描述、alt、标签、分类、拍摄时间、排序值、状态、精选/封面标记、图片 URL 或对象 key、缩略图 key。
- 上传流程建议拆成“获取上传签名/策略 -> 客户端上传或服务端 uploadFile -> 完成登记 media asset -> 创建/关联 photo”。
- 未登录或权限不足用户不得访问照片管理、上传签名、媒体登记和 URL 刷新后台接口。

### NestJS API 边界

- 新增 `photos` 模块，公开 controller 只读：`GET /photos`、`GET /photos/:id`。
- 新增 admin controller 管理照片：`GET/POST/PATCH/DELETE /admin/photos` 及状态、排序等子操作。
- 新增 media/storage controller 或 service：签名 URL、上传登记、访问 URL 刷新由后端集中处理，避免分散在照片 controller。
- 业务服务边界：`PhotoService` 负责 photo 聚合、公开过滤、排序和状态；`MediaService` 负责媒体资产登记和访问 URL；`StorageService`/`CosStorageAdapter` 负责 COS SDK 调用。
- 错误模型沿用现有 NestJS API exception/filter 风格，公开接口不泄露 bucket、Secret、内部对象路径策略和云厂商原始错误细节。

### 数据库模型

- `media_assets`: 存储媒体文件通用元数据，包括 storage provider、bucket、region、objectKey、originalUrl、mimeType、sizeBytes、width、height、hash、accessPolicy、status、createdAt、updatedAt。
- `photos`: 存储照片展示元数据，包括 title、description、alt、mediaAssetId、thumbnailAssetId、categorySlug、tags、takenAt、publishedAt、status、sortOrder、featured、createdAt、updatedAt、deletedAt。
- 如现有标签/分类模型可复用，优先复用；否则照片首期可用数组/JSON 保存 tags，并在后续需要跨内容聚合时迁移到关系表。
- 公开查询只读取 `status = published` 且未软删除记录；后台查询可按状态过滤。

### COS 存储适配

- 服务端使用 COS Node SDK 初始化 `SecretId`、`SecretKey`，并从环境配置读取 Bucket、Region、Protocol、超时和并发策略；这些配置不得下发前端。
- 大文件或原图上传规划使用 SDK 的 `uploadFile`/分片上传能力，设置合理 `SliceSize`、并发和超时；首期也可先登记已有对象 key。
- 私有桶访问通过 `getObjectUrl` 生成带过期时间的签名 URL；公开桶可返回 CDN/公开 URL，但仍由后端统一组装。
- URL 过期时由前端调用刷新接口或重新请求照片详情/列表，由后端重新签发可访问 URL。
- 存储适配接口应保留本地/mock provider，COS 故障时可回退到已登记静态 URL，不阻塞首页和文章阅读。

### 安全边界

- 前端、C 端页面、admin 页面均不得保存长期 COS Secret；上传签名和访问 URL 必须短期有效且限定操作范围。
- 后台接口全部走现有管理员鉴权；上传登记需校验 mime、扩展名、大小、图片尺寸、对象 key 前缀和归属状态。
- Markdown 默认禁用原始 HTML；站外链接增加安全属性；图片来源可做域名 allowlist 或经后端媒体资源登记后展示。
- 公开 API 只返回发布态照片和必要展示字段，不返回内部 bucket、Secret、未发布对象 key、原始错误栈。

### 回滚

- 首页简化、照片墙、Markdown 渲染、COS 适配拆成可独立回退的 feature scope。
- 若照片墙质量不达标，可临时隐藏 `/photos` 导航入口，保留首页文章/标签主流程。
- 若 COS 接入失败，回退到 mock/local/static URL provider，照片记录仍可用已登记 URL 展示。
- 若 Markdown 高亮失败，降级为 `react-markdown + remark-gfm` 基础渲染；若 Markdown 渲染出现严重兼容问题，文章详情可临时切回现有自定义 parser。
- 数据库迁移回滚要求先确认无生产照片数据或已导出备份；涉及新增表时优先可逆新增，不在首期破坏现有文章表。

## 风险

- 照片墙图片尺寸缺失会导致瀑布流抖动：API/DB 必须保存宽高，前端必须按比例预留空间。
- 签名 URL 与浏览器/CDN 缓存策略冲突会导致过期坏图：需要明确 URL TTL、刷新接口和缓存头策略。
- Markdown 原始 HTML 若开放会带来 XSS 风险：首期默认禁用，后续开放必须走白名单清洗和安全评审。
- Shiki 高亮异步处理可能增加服务端渲染耗时：优先缓存高亮结果或限制语言集合，失败可降级普通代码块。
- admin 上传流程涉及云存储和数据库一致性：需要明确“上传成功但登记失败”“登记成功但照片创建失败”的补偿与可重试策略。
- 数据模型若过早绑定 COS 会削弱回滚能力：必须通过 `storageProvider` 和 adapter 保留本地/mock/静态 URL 路径。
- 现有 API 只有文章/分类/标签，无 photo/gallery 模型：后续 backend/database agent 需要先补模块和迁移，再让 frontend 接入真实数据。
