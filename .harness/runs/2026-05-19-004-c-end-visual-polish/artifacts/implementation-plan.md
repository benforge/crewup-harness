# C 端视觉专项实施计划

## 任务摘要

后续开发阶段按架构方案优化 C 端首页、文章列表、文章详情、分类/标签和 404 的信息架构与视觉层级，重点减少线条、边框、卡片和区块噪音。

## 文件和模块

- 样式核心：`apps/web/app/globals.css`
- 全站框架：`apps/web/app/layout.tsx`
- 首页：`apps/web/app/page.tsx`
- 文章列表：`apps/web/app/articles/page.tsx`
- 文章详情：`apps/web/app/articles/[slug]/page.tsx`
- 分类/标签：`apps/web/app/categories/[slug]/page.tsx`、`apps/web/app/tags/[slug]/page.tsx`
- 404/空状态：`apps/web/app/not-found.tsx`
- 回归观察：`apps/web/app/about/page.tsx`

## 步骤

## 开发顺序

1. 整理 `globals.css`：建立 Tailwind v4 `@theme` token、语义变量和共享 class。
2. 调整 `layout.tsx`：控制 shell、header、footer 的密度和边界。
3. 调整首页：明确最新重点文章、最近文章、分类/标签入口的主次。
4. 调整 `/articles`：统一单列列表样式。
5. 调整分类/标签页：复用列表结构，处理 active tag 和空状态。
6. 调整详情页：正文限宽、标题区层级、AI 摘要、相关内容。
7. 调整 404：简化结构和行动入口。
8. 回归 `/about`，确认共享样式未破坏阅读。

## 截图验收

- 桌面端：`/`、`/articles`、`/articles/hello-world`、`/categories/product-notes`、`/tags/mvp`、不存在路由。
- 移动端：同上关键页面至少覆盖首页、列表、详情、404。
- 检查项：无横向滚动、文字不遮挡、标签可换行、首屏主次清晰、列表可扫描、正文阅读宽度合理、线条/边框明显减少。

## 测试计划

- 运行 web lint/build，若仓库已有对应脚本则使用现有脚本。
- 浏览器截图验收桌面与移动端。
- API fallback 场景至少确认页面仍可读。

## 风险与降级

- 若全局样式影响过大，按页面分批回退，优先保留 `globals.css` token。
- 若视觉改造不符合预期，按文件回滚：先页面文件，再 `layout.tsx`，最后 `globals.css`。
- 若移动端出现挤压，优先降级为单列、减少并排信息和固定宽度。

## 回滚方式

- 使用 git 按文件回滚本轮涉及的 web 文件。
- 可优先回滚单个页面，保留共享 token；若 token 造成大面积回归，再整体回滚 `globals.css`。

## 完成检查

- [ ] 仅修改 C 端 web 范围。
- [ ] 首页/列表/详情/分类/标签/404 截图验收通过。
- [ ] lint/build 通过或记录原因。
- [ ] 无 API、DB、Admin、infra 变更。
