# 实施计划

## 任务摘要

在后续开发阶段分批交付首页信息收敛、照片墙瀑布流、Markdown/GFM + Shiki 阅读体验、后台照片管理、NestJS photo/media API、数据库模型和 COS 存储适配；当前 run 只输出规划，不进入开发。

## 文件和模块

- web: `apps/web/app/page.tsx`、`apps/web/app/photos/page.tsx`、`apps/web/app/photos/[id]/page.tsx`、`apps/web/app/articles/[slug]/page.tsx`、`apps/web/components/article/*`、`apps/web/components/photos/*`、`apps/web/lib/api.ts`。
- admin: `apps/admin/src/*` 下的路由、菜单、照片列表、照片表单、上传登记组件、API client。
- api: `apps/api/src/photos/*`、`apps/api/src/media/*` 或 `apps/api/src/storage/*`、公共与 admin controller、service、repository、DTO、鉴权 guard 复用。
- db: `infra/database/migrations/*`，新增 `media_assets`、`photos` 及必要关系/索引；同步 repository 类型。
- shared: `packages/types`、`packages/sdk` 如当前项目已用于 API 类型或 SDK，需要补充 photo/media 类型。
- run artifacts: 本阶段仅维护 `.harness/runs/2026-05-21-006-photo-wall-cos-markdown-homepage/artifacts/*`。

## 步骤

### 1. Frontend 阶段

1. 收敛 C 端首页 IA：保留个人介绍、文章、标签为核心层级，照片墙只做轻量入口。
2. 新增照片墙公共页面 `/photos`，实现瀑布流、筛选、加载/空/错/单图失败状态、移动端布局和懒加载。
3. 新增照片详情 `/photos/[id]`，展示大图、标题、描述、标签、拍摄时间和返回路径，处理 URL 过期后的重试。
4. 替换文章详情 Markdown 渲染边界为 `MarkdownRenderer`，规划使用 `react-markdown`、`remark-gfm`、自定义 components。
5. 接入 Shiki 高亮展示策略：优先服务端/构建期异步高亮，客户端提供普通代码块降级。
6. 更新 admin 路由与菜单，新增照片管理列表、表单、状态切换、排序、上传/登记入口。

人工审核点：确认首页照片墙入口位置、照片详情采用独立路由、Markdown 原始 HTML 是否首期完全禁用。

### 2. Backend 阶段

1. 新增 `PhotosModule`，提供公开 `GET /photos`、`GET /photos/:id` 和 admin CRUD 接口。
2. 新增 `MediaModule` 或 `StorageModule`，封装媒体资产登记、上传签名、访问 URL 刷新、COS adapter。
3. 复用现有管理员鉴权，保护 admin photo CRUD、上传签名、媒体登记、URL 刷新后台能力。
4. 实现公开字段裁剪：只返回发布态照片和展示所需字段，不泄露内部存储配置。
5. 设计 COS provider：服务端初始化 SecretId/SecretKey/Bucket/Region，支持 `uploadFile` 分片上传和 `getObjectUrl` 签名 URL。

人工审核点：确认上传主流程是“客户端直传签名”还是“服务端 uploadFile 中转”，确认签名 URL 默认有效期。

### 3. Database 阶段

1. 新增 `media_assets` 与 `photos` 表迁移，字段、约束、软删除和时间戳按 `db-migration.md` 执行。
2. 增加公开查询、后台筛选、排序所需索引。
3. 准备可逆 down migration；生产执行前要求备份并确认无破坏性变更。
4. 若复用现有 tags/categories，需要明确跨域引用策略；若首期用 JSON tags，记录后续关系化迁移路径。

人工审核点：确认 tags/categories 是复用文章模型还是照片域独立字段，确认是否允许软删除替代物理删除。

### 4. Tester 阶段

1. C 端截图验收：首页桌面/移动、照片墙列表、筛选空态、错误态、照片详情、Markdown 文章详情。
2. API 测试：公开查询只返回发布态；后台 CRUD、状态切换、排序、上传签名、登记、URL 刷新覆盖成功和失败路径。
3. DB 测试：迁移 up/down、索引存在、软删除不出现在公开查询、排序稳定。
4. 安全测试：未登录/无权限访问后台接口失败；Markdown 危险 HTML 不执行；COS Secret 不出现在响应和前端构建产物。
5. 性能和可用性测试：图片懒加载、占位尺寸、移动端无横向溢出、代码块不撑破布局。

人工审核点：验收截图需要覆盖桌面和移动端；上传和签名 URL 过期场景需有可复现用例或 mock。

### 5. Reviewer 阶段

1. 审查模块边界：web/admin/api/db 是否按职责拆分，COS SDK 是否只在后端 adapter 内。
2. 审查安全边界：密钥、签名 URL、Markdown HTML、站外链接、上传校验、公开字段裁剪。
3. 审查回滚性：功能入口可隐藏、Markdown 可降级、COS provider 可切回 mock/static URL、迁移可回滚。
4. 审查测试覆盖与人工验收记录，确认达到需求中的可截图验收标准。

人工审核点：确认是否进入 release/product-sync；未通过前不得写入 `docs/product/`。

## 测试计划

- 规划阶段检查：确认只修改当前 run artifacts，未修改 `apps/`、`docs/product/`、迁移 SQL、环境配置或密钥。
- 单元/API 测试：后续 backend/database agent 增加 photo/media service、controller、repository、DTO 和迁移测试。
- E2E/集成测试：后续 tester 覆盖公开照片列表/详情、后台 CRUD、上传登记、URL 刷新、权限拦截。
- 视觉回归：后续 frontend/tester 使用桌面与移动截图验证首页层级、瀑布流、状态页、Markdown 表格和代码块。
- 安全验证：检查构建产物和响应不包含 COS Secret；危险 Markdown HTML 不执行；上传类型/大小/key 前缀校验生效。

## 完成检查

- [ ] architecture.md 已覆盖 C 端 IA/视觉和组件边界、照片墙瀑布流、Markdown、admin、API、DB、COS、安全、回滚。
- [ ] implementation-plan.md 已按 frontend/backend/database/tester/reviewer 分阶段拆分，并列出人工审核点。
- [ ] api-change.md 已列出公开与后台 API、上传签名、上传登记、URL 刷新草案。
- [ ] db-migration.md 已列出 media/photo 表、字段、索引、迁移和回滚风险。
- [ ] 后续开发前已获得用户对需求和架构方案的人工确认。
- [ ] 后续实现完成后测试通过或记录合理说明。
- [ ] reviewer 评审通过后再进入 release；用户确认后才可同步 `docs/product/`。
