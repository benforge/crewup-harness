# apps/web AI 规则

- 作用域：`apps/web`，面向公开访问的 C 端博客站点；只有任务命中 `web` scope 或 `apps/web/**` 时加载。
- 技术栈以当前工程为准：Next.js App Router、React、Tailwind CSS；先读现有路由、组件、样式和数据请求模式，再改动。
- Tailwind CSS v4 是 C 端样式默认实现方式：新增页面/组件样式优先写 Tailwind utility class，复用 `app/globals.css` 中 `@theme` token，不再默认新增页面级语义 class。
- `app/globals.css` 已经较大，只作为 Tailwind 入口、theme token、base、少量跨页面 utility 和 Markdown/第三方样式覆盖使用。除非有明确架构理由，不要继续向其中追加单页面布局、卡片、列表、按钮和状态样式。
- 需要自定义 CSS 时，必须在 run 结果中解释原因，并尽量使用 Tailwind v4 `@theme`、`@utility` 或局部组件封装，避免把一次性样式升级为全局契约。
- C 端体验优先服务阅读、内容发现、分类/标签浏览和照片内容浏览，不引入后台管理式控件。
- 页面改动必须考虑桌面和移动端布局、加载态、空态、错误态、404/异常数据和 SEO 元信息。
- 涉及 API 数据时优先复用 `packages/sdk` 和 `packages/types`，不要在页面里重复定义会漂移的接口类型。
- 不为单个页面需求引入新的大型状态管理、UI 框架或全局设计体系；确需引入时先写入架构风险和替代方案。
- 视觉调整要转化为可验收标准，例如信息层级、响应式断点、可读性、图片比例、交互状态和截图验证路径。
