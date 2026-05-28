# Harness 决策索引

> 本文件由 `npm run harness:knowledge` 自动生成。它是跨 run 的轻量记忆索引，只放摘要；需要细节时再打开对应 run artifact。

- 生成时间：2026-05-28T02:53:06.580Z
- run 数量：15

## 最近决策

| run | 状态 | 模块 | 能力 / 决策摘要 |
| --- | --- | --- | --- |
| 2026-05-28-016-现在直接完善-harness-以会话id-019e4e5b-f80d-7a62 | in-progress/requirements_plan | - | 概述本轮用户可感知变更和技术变更。<br>写成可执行、可验收的目标列表。<br>说明本轮技术方案、模块边界和执行路径。<br>回滚本 run 产生的代码、配置和文档变更；涉及数据库、生产配置或迁移时由对应 agent 补充专门回滚步骤。 |
| 2026-05-27-015-现在需要迭代一个技术需求-要帮我把-web-和-admin-两个前端项目里已经做 | done/done | web | 本次发布范围已从原始 web + admin 需求收敛为仅处理 apps/web Tailwind-first 样式迁移。<br>apps/admin、API、数据库、infra、权限、路由语义、数据获取方式、SEO 元信息逻辑和生产配置均无变更。<br>关键变更为 apps/web 已有公开页面和相关展示组件的页面/组件 class 迁移：布局、间距、宽度、对齐、响应式、交互状态、加载态、错误态和空态尽量改为 Tailwind utility class 表达。<br>页面层：仅迁移 apps/web/app/**/page.tsx、layout.tsx、not-found.tsx、photos/loading.tsx、photos/error.tsx 中的页面级布局、容器、间距、对齐、排版、响应式、状态展示和交互外观。 |
| 2026-05-27-014-把-web-首页按钮文案改成开始使用 | in-progress/requirements_plan | - | - |
| 2026-05-27-013-给-web-页面加一个搜索框 | in-progress/requirements_plan | - | - |
| 2026-05-26-012-迭代一个需求-相册这个照片瀑布流希望是沾满屏幕的-宽度这块-把网站这块英文都修改 | done/done | - | 相册页改为更贴近全屏的瀑布流布局。<br>网站相关英文文案统一改为中文。 |
| 2026-05-26-011-c端设计稿调整开发-参照会话id-019e6260-2e94-7a02-9c5e | blocked/requirements_plan | - | - |
| 2026-05-22-c端个性简约风格探索 | in-progress/review | web, docs | C 端视觉方向落地为 工程手札 + 冷静编辑部秩序。<br>调整 Web 全局视觉 token 和共享样式，增强纸面、注释线、手记条目和低噪音工程感。<br>更新首页首屏、最近手记、技术索引、照片入口文案和结构。<br>更新文章列表、文章详情元信息、上下篇导航、关于页、照片墙、照片详情、loading/error/404 的语气与视觉细节。 |
| 2026-05-22-008-现在迭代一个功能-增加阅读量这个统计 | done/done | web, admin, api, db, docs | 为已发布的公开文章补充阅读量统计能力，文章详情页在内容成功渲染后会触发一次计数，且不影响标题、摘要、正文和元信息展示。<br>后端新增公开阅读记录接口 POST /api/articles/:slug/view，并保持 GET /api/articles/:slug 为纯读取。<br>Article / ArticleSummary / ArticleDetail 统一增加 viewCount 字段，API 响应和 SDK 解析结果同步更新。<br>backend：负责 API/types/repository/service/controller 运行时改造，新增公开计数接口和 API e2e 覆盖。 |
| 2026-05-21-006-photo-wall-cos-markdown-homepage | done/release | web, admin, api, db, docs | 明确首页信息架构：首屏和主体内容只围绕个人介绍、文章、标签展开；照片墙只作为轻量入口存在。<br>明确照片墙 C 端体验：规划 /photos、瀑布流、筛选、详情、加载态、空态、错误态、移动端、性能和无障碍要求。<br>明确后台照片管理需求：支持照片元数据、展示状态、排序、上传/登记流程、成功失败提示和权限边界。<br>将“照片”作为内容域的一等资源，但与文章域保持松耦合：新增 photos 负责公开展示和后台管理，新增 media_assets 负责存储对象、URL、尺寸、mime、hash、来源和访问策略。 |
| 2026-05-20-005-it-engineer-blog-experience-redesign | done/release | web, admin, docs | C 端从通用博客体验收敛为“IT 工程师博客”阅读体验，覆盖首页、文章列表、文章详情、分类归档、标签归档、关于页、404、空状态、错误/fallback 提示。<br>C 端文章列表已支持基于 URL 参数的搜索与分页展示，包括搜索无结果空状态、当前页/总页数、上一页/下一页导航。<br>C 端 API fallback 不再静默掩盖真实失败，使用备用内容时会展示明确的降级提示。<br>Admin 侧完成 CMS 工作台体验强化，覆盖登录/鉴权、Dashboard、文章列表、新建/编辑文章、分类管理、标签管理、反馈状态与危险操作确认。 |
| 2026-05-19-004-c-end-visual-polish | done/release | web, docs | 本 run 围绕 C 端 Web 的视觉专业化与内容层级整理收尾，目标是减少布局混乱、区块线条杂乱、卡片和边框噪音，提升首页、文章列表、文章详情、分类/标签、404/空态的阅读体验与扫描效率。<br>已按规划沉淀需求、架构、实施计划、测试报告和复核报告，明确本轮方向为“专业内容站 / 阅读体验”，而不是营销型首页、品牌重做或复杂动效。<br>实现侧复核记录显示，完成范围主要集中在 articles、categories、tags 三类列表/聚合页及共享 archive/list 样式，方向符合“减少卡片感、降低线条和边框噪音、提升列表扫描效率”的目标。<br>本 run 未记录越界修改 Admin、API、DB、infra 或 docs/product。 |
| 2026-05-19-003-ui-framework-polish | ready-for-user-review/release | web, admin, docs | Admin 侧接入 Ant Design v5，依赖解析为 antd@5.29.3，入口使用 antd/dist/reset.css、ConfigProvider、App 与主题 token。<br>Admin 后台外壳、导航、表单、表格、确认弹窗、消息提示、加载态、空态和错误态已用 Ant Design 基础组件收敛。<br>Admin 登录、受保护路由、未授权/会话失效回登录、退出确认等鉴权 UI 闭环已保留并补齐基础反馈。<br>Web C 端接入 Tailwind CSS v4，依赖解析为 tailwindcss@4.3.0、@tailwindcss/postcss@4.3.0，新增 PostCSS 配置并在全局 CSS 引入 @import "tailwindcss";。 |
| 2026-05-18-002-complete-blog-system | archived/done | web, admin, api, db, docs | C 端 Web 补全专业简约博客体验：首页重点文章、继续阅读、文章列表、文章详情、分类页、标签页、关于页、404、导航、页脚、sitemap、SEO/GEO metadata 和 JSON-LD。<br>Admin 补全后台管理路由闭环：登录页、受保护路由、登录后回跳、会话恢复、退出、仪表盘、文章列表、文章编辑页、分类页、标签页和操作反馈。<br>API 补全 MVP+ REST 契约：公开分类/标签接口、按分类/标签查询文章、管理端当前用户、文章更新/下架、分类/标签管理。<br>P0：持久化、文章 CRUD、published 过滤、分类/标签、C 端页面完整性、管理端基础操作。 |
| 2026-05-15-001-blog-mvp | in-progress/verify | web, admin, api, db, infra, docs | 前台 web 计划落地为 Next.js App Router，承载公开博客、文章详情、SEO/GEO。<br>后台 admin 计划落地为 React + Vite，承载登录、文章草稿和发布。<br>后端 API 计划落地为 NestJS REST 服务。<br>共享 SDK 和类型契约已更新。 |
| 2026-05-14-001-blog-mvp | in-progress/plan | - | - |

## 使用规则

- 新需求只默认读取本索引，不默认读取历史 run 全文。
- 最多选择 3 个相关历史 run 深读。
- 只有命中高风险、跨模块或用户要求追溯时，才打开对应 artifacts。

