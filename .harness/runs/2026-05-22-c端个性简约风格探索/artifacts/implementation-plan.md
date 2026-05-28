# C 端个性简约风格实施计划

## 任务摘要

后续开发阶段将把 C 端从现有“专业技术站”进一步收敛为 `工程手札 + 冷静编辑部秩序` 的视觉语言。重点不是新增功能，而是通过全局 token、页面结构和细节组件强化作者气质，同时保持阅读舒适和移动端稳定。

本文件是实施计划，不代表已经获准写业务代码。进入实现前仍需用户确认 implementation gate。

## 当前阶段声明

- 本阶段只更新 run artifacts：`requirement.md`、`architecture.md`、`implementation-plan.md`。
- 不修改 `apps/`、Admin、API、数据库、infra、CI/CD、`docs/product/`。
- 后续实现默认只覆盖 `apps/web/**`。

## 文件和模块

后续开发建议文件范围：

- `apps/web/app/globals.css`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/articles/page.tsx`
- `apps/web/app/articles/[slug]/page.tsx`
- `apps/web/app/about/page.tsx`
- `apps/web/app/not-found.tsx`
- `apps/web/app/photos/page.tsx`
- `apps/web/app/photos/[id]/page.tsx`
- `apps/web/app/categories/[slug]/page.tsx`
- `apps/web/app/tags/[slug]/page.tsx`
- `apps/web/components/article/**`
- `apps/web/components/photos/**`
- `apps/web/components/states/**`
- 可新增：`apps/web/components/site/**`

明确不涉及：

- `apps/admin/**`
- `apps/api/**`
- `infra/**`
- `.github/**`
- 数据库迁移
- `docs/product/**`

## 步骤

### Phase 0：实现前确认

目标：确认本计划可以进入业务代码实现。

需要用户确认：

- 采用 `工程手札 + 冷静编辑部秩序`。
- 本轮只改 C 端 web，不碰 Admin/API/DB/infra。
- 接受照片墙保持次级入口。
- 接受不新增外部字体、不引入新 UI 框架。

### Phase 1：全局视觉 token 与共享样式

建议负责人：Frontend Agent。

文件范围：

- `apps/web/app/globals.css`

任务：

- 梳理现有 `@theme` token，保留 Tailwind CSS v4 CSS-first 方式。
- 统一 paper / ink / muted / rule / accent / note / blueprint 等语义变量。
- 调整背景轻网格，使其更接近工程纸面，不增强装饰噪音。
- 增加少量共享 class：例如 section heading、note line、archive index、editorial marker。
- 保持字体栈本地可用，不依赖远程字体。

验收：

- 现有页面未出现大面积颜色回归。
- CSS 颜色不变成单一灰阶或单色主题。
- 全局样式不引入横向滚动。

### Phase 2：全站 layout 与导航语气

文件范围：

- `apps/web/app/layout.tsx`
- `apps/web/app/globals.css`

任务：

- 调整 brand 副标题和 footer 文案，使其更像工程手记，而不是泛技术博客。
- 保持 primary nav 简单稳定，不新增复杂菜单。
- 优化 header/footer 边界线和间距，避免线条过重。
- 检查移动端导航换行与触控区域。

验收：

- 导航项不溢出。
- Header 不压迫首页首屏。
- Footer 和主视觉语言一致。

### Phase 3：首页风格落地

文件范围：

- `apps/web/app/page.tsx`
- 可能新增 `apps/web/components/site/**`

任务：

- 重构首页 opening spread：保留唯一主焦点。
- 把 latest article 从普通卡片调整为“当前手记条目 / latest note”。
- 弱化多个同权 signal item，避免首屏信息噪音。
- 技术索引与照片入口保留下方辅助，加入克制的标注感。

验收：

- 桌面首屏 5 秒内识别“有作者气质的 IT 工程师技术站”。
- 首屏能露出下一段内容线索。
- 移动首屏不拥挤，主标题、摘要和主要入口不互相挤压。

### Phase 4：文章列表与归档页

文件范围：

- `apps/web/app/articles/page.tsx`
- `apps/web/app/categories/[slug]/page.tsx`
- `apps/web/app/tags/[slug]/page.tsx`
- `apps/web/components/article/ArticleList.tsx`

任务：

- 保持单列时间线，强化 archive / reading queue 的秩序。
- 分类与标签入口保留索引感，避免复杂筛选面板。
- 搜索面板减轻视觉重量，但保留可用性。
- 分类/标签页复用同一列表语言。

验收：

- 标题、摘要、元信息扫描效率不下降。
- 搜索、分页、空态仍可用。
- 分类/标签入口在移动端自然换行。

### Phase 5：文章详情阅读系统

文件范围：

- `apps/web/app/articles/[slug]/page.tsx`
- `apps/web/components/article/MarkdownRenderer.tsx`
- `apps/web/app/globals.css`

任务：

- 调整文章标题区，让日期、分类、阅读时间、标签更像手记元信息。
- 统一 note、blockquote、inline code、pre code、table、image 的纸面/标注规则。
- 简化上下篇导航，避免大卡片压过正文收尾。
- 保持正文最大宽度、行高和代码横向滚动策略。

验收：

- 文章详情桌面与移动端阅读舒适。
- 代码块可横向滚动，不撑破页面。
- 图片、表格、引用不遮挡文字。

### Phase 6：关于页、照片入口和状态页

文件范围：

- `apps/web/app/about/page.tsx`
- `apps/web/app/photos/page.tsx`
- `apps/web/app/photos/[id]/page.tsx`
- `apps/web/app/not-found.tsx`
- `apps/web/components/states/**`
- `apps/web/components/photos/**`

任务：

- 关于页强化作者写作边界和工程日志气质。
- 照片墙保持辅助真实感，文案与边界更轻。
- EmptyState / ErrorState / 404 使用统一语气和视觉细节。

验收：

- 关于页比列表页更能体现作者气质，但不变成简历页。
- 照片墙不抢文章主线。
- 404 和空态不出现默认模板感。

### Phase 7：验证与评审

建议负责人：Tester / Reviewer。

## 测试计划

命令建议：

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- 根据可用脚本优先跑 web workspace 对应检查。

截图验收：

- 桌面：`/`、`/articles`、`/articles/[slug]`、`/about`、`/photos`、404。
- 移动：`/`、`/articles`、`/articles/[slug]`、`/about`、404。

人工检查：

- 首页焦点唯一。
- 风格识别明确但不重装饰。
- 文章详情可读性不下降。
- 移动端无横向滚动、遮挡和溢出。
- 所有状态页语言一致。

## 风险与回滚

- 若全局 token 造成大面积回归，优先回滚 `apps/web/app/globals.css` 中本轮新增 token/class。
- 若首页方向不满意，优先回滚 `apps/web/app/page.tsx`，保留通用阅读系统改进。
- 若文章详情可读性下降，优先回滚 `MarkdownRenderer` 和正文相关 CSS。
- 若移动端挤压，优先减少首页标注元素和并排布局，降级为单列。
- 若照片墙抢占主线，回退照片入口文案和首页入口权重。

## 完成检查

- [ ] 用户已确认进入实现。
- [ ] 只修改 C 端 web 范围。
- [ ] 首页、列表、详情、关于、照片、404 截图验收通过。
- [ ] typecheck/lint/build 通过或记录原因。
- [ ] 无 Admin/API/DB/infra 变更。
- [ ] test-report 和 review-report 完整记录。
