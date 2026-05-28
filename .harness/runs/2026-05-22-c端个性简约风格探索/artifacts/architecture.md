# C 端个性简约风格方案

## 影响范围

- [x] web
- [ ] admin
- [ ] api
- [ ] db
- [ ] infra
- [x] docs

`docs` 仅指本 run 的 harness artifacts。规划阶段不写入 `docs/product/`。

## 方案

### 方向定位

本轮采用用户已确认的主方向：`工程手札 + 冷静编辑部秩序`。

目标不是把 C 端变成一个新的营销首页，而是在现有技术站基础上建立更稳定的作者识别感：

- 像工程师长期维护的手记：真实、克制、有现场感。
- 像小型技术编辑部：有结构、有筛选、有标题秩序。
- 仍然是内容优先：文章阅读体验高于视觉展示。

### 文档和技术依据

- `frontend-design`：要求选择清晰审美方向，避免模板化和 generic AI aesthetics；本轮以“工程手札”作为单一主方向。
- `information-architecture`：先定义页面层级、导航、内容优先级，再做视觉实现。
- `tailwind-design-system`：现有 Web 已使用 Tailwind CSS v4，继续在 `globals.css` 的 `@theme` 和语义 CSS 变量中收敛 token。
- `frontend-architecture`：优先建立共享展示组件和样式边界，避免页面级重复拼装。
- 官方资料：Tailwind CSS v4 官方文档仍使用 `@import "tailwindcss"` 与 `@theme` 定义设计 token；Next.js App Router 官方文档仍以 `app/` 目录、文件系统路由和 metadata API 组织页面。
- Context7 限制：按项目规则应优先使用 Context7 查询库文档，但当前会话未暴露 `resolve-library-id/query-docs` 工具；已降级为官方文档与本地 skill 依据。

### 信息架构

站点地图保持不变，不新增路由：

- Home `/`
- Articles `/articles`
- Article detail `/articles/[slug]`
- Categories `/categories/[slug]`
- Tags `/tags/[slug]`
- Photos `/photos`
- Photo detail `/photos/[id]`
- About `/about`
- 404 / not found

导航模型：

- Primary nav 保留 `Home / Articles / Photos / About`，不引入二级导航。
- Footer 保留文章、照片、关于入口，语气可更贴近工程手记。
- 移动端仍使用简单换行导航，不引入抽屉或复杂菜单。

内容优先级：

- 首页：作者气质与写作方向 > 最新/精选文章 > 近期文章 > 技术索引 > 轻量照片入口。
- 文章列表：搜索/归档线索 > 单列时间线 > 分页。
- 文章详情：标题与摘要 > 元信息 > 正文 > 阅读 note / 代码 / 引用 > 上下篇与相关内容。
- 关于页：站点定位 > 写作边界 > 内容范围 > 开始阅读入口。
- 照片墙：筛选与结果 > 照片网格 > 照片详情；只作为辅助真实感。

### 视觉系统

保持现有低噪音基础，但强化识别层：

- 背景：保留轻网格，但应更像工程纸面或标注底纹；避免大面积渐变、插画、装饰块。
- 色彩：继续以暖纸色、墨色、弱灰绿为基础；保留一个稳定识别色用于链接、注释线、焦点和 active 状态。
- 字体：中文可读优先。标题使用现有 serif 气质增强手札感，正文保持 sans 清晰度；不引入依赖不确定的外部字体。
- 线条：只用于强结构边界、时间线、注释和 code/note，不再把每个模块都框起来。
- 圆角：维持 4-8px，避免过度圆润的消费产品感。
- 动效：只使用低强度 hover / focus / image scale；不使用滚动叙事或复杂入场动画。
- 图像：照片作为真实工作痕迹，入口轻，不占据主视觉。

### 页面方案

首页 `/`：

- 首屏从“hero + featured article”改为更像工程手札的 opening spread。
- 保留一个主标题焦点，增强作者身份与写作主题；弱化多个同权 signal item。
- 最新文章可像“当前手记条目”或“Latest note”，而不是传统卡片。
- 技术索引和照片入口保持下方辅助，使用更轻的分隔与标注。

文章列表 `/articles`：

- 保持单列时间线，强化 archive / issue / reading queue 的秩序感。
- 分类和标签入口可以更像“索引栏”，不做复杂筛选面板。
- 搜索面板保持功能清晰，但减少表单厚重感。

文章详情 `/articles/[slug]`：

- 标题区增加手札感：日期、分类、阅读时间、标签像条目元信息。
- 正文排版保持现有宽度与行高。
- `reading-note`、blockquote、inline code、pre code 使用同一套识别色和纸面标注规则。
- 上下篇导航不做大卡片墙，改为简洁的前后条目。

关于页 `/about`：

- 作为作者气质强化页，可更明显地表达“站点不是简历页/营销页，而是工程日志”。
- 原有原则列表可转成更像写作准则或 operating notes。

照片墙 `/photos`：

- 保持次级入口，强调“field notes / workbench notes”。
- 首页只给一条轻量入口，不把照片墙提升为首页主故事。
- Masonry 可保留，但文案和边界更轻，避免照片墙压过文章。

404 / 空态 / fallback：

- 延续工程手札语气，状态表达清楚，不展示调试堆栈。
- EmptyState / ErrorState 可作为共享组件继续复用，但视觉上减少默认模板感。

### 组件边界

后续实现优先抽取小而稳定的展示组件，不做大重构：

- 可新增 `apps/web/components/site/`：如 `SectionHeader`、`NotebookRule`、`EditorialNote`。
- 可扩展 `apps/web/components/article/`：如 `ArticleMetaLine`、`ReadingNote`。
- 保留现有 `ArticleList`、`MarkdownRenderer`、`EmptyState`、`ErrorState`，按需要微调 class。
- 不引入新的状态管理、UI 框架或路由层。

### Tailwind / CSS 策略

- 继续集中修改 `apps/web/app/globals.css`。
- 使用现有 Tailwind v4 `@theme` token，必要时新增语义 token：
  - paper / ink / rule / accent / note / blueprint
  - reading width / page width / section gap
  - quiet motion timing
- 使用共享 class 表达站点级样式，如 `note-line`、`editorial-kicker`、`archive-index`。
- 避免在每个页面堆大量一次性 utility，降低后续维护成本。

### 验收和截图

桌面视口建议：

- `/`
- `/articles`
- `/articles/[slug]` 使用现有 fallback 或种子文章
- `/about`
- `/photos`
- 不存在路由触发 404

移动视口建议：

- `/`
- `/articles`
- `/articles/[slug]`
- `/about`
- 404 / 空态

检查项：

- 首屏焦点唯一，能识别工程手札气质。
- 文章详情可读性不下降。
- 不出现卡片套卡片、过量边框、强背景互抢。
- 移动端无横向滚动、文字遮挡、导航溢出、按钮过窄。
- 首页、详情、关于、状态页属于同一套视觉语言。

## 风险

- 视觉过度：标注线、网格和纸面效果加多会破坏此前“减少线条噪音”的成果。
- 感知不足：如果只做颜色和间距微调，无法达到“个性”的目标。
- 中英文语气不统一：当前导航和部分文案使用英文，后续需要在实现中统一技术感与中文站点气质。
- 移动端拥挤：手札/编辑部元素容易占空间，移动端需要优先降级为单列、少装饰。
- 字体风险：外部字体依赖会增加加载与跨平台不确定性，本轮建议继续使用本地/系统字体栈。
- 工具限制：Context7 MCP 当前不可用；方案已记录降级，后续如工具恢复，可在实现前补查 Tailwind / Next 文档。
