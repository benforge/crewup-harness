# 实施计划

## 任务摘要

将 C 端调整为更克制的工程内容站风格，并补上主题切换与移动端适配。

## 文件和模块

- `apps/web/app/layout.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/page.tsx`
- `apps/web/app/articles/[slug]/page.tsx`
- `apps/web/app/categories/[slug]/page.tsx`
- `apps/web/app/tags/[slug]/page.tsx`
- `apps/web/components/theme/ThemeToggle.tsx`
- `apps/web/components/article/ArticleList.tsx`

## 步骤

1. 接入主题切换，使用 `localStorage` 持久化并同步到 `html.dark`。
2. 重排首页层级：hero、本期重点、最近手记、技术索引、现场档案。
3. 统一文章详情、分类页和标签页的内容结构与信息密度。
4. 文章列表补充阅读量展示，保持单列可扫描。
5. 调整 `globals.css` 的主题变量、布局断点、移动端折叠和交互态。

## 风险

- 远端浏览器无法访问本机开发服务，截图验证需要本机补跑。
- 当前页面数据依赖 fallback 时，视觉会更接近本地手记内容。

## 测试计划

- `npm --workspace apps/web run typecheck`
- `npm --workspace apps/web run build`
- 本机浏览器检查首页、文章页、分类页、标签页和主题切换。

## 完成检查

- [x] 需求理解清楚
- [x] 实现完成
- [x] 类型检查通过
- [x] 构建通过
- [ ] 截图验收补完
