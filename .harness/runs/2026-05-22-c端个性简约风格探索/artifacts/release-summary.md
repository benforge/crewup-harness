# 发布摘要

## 变更内容

- C 端视觉方向落地为 `工程手札 + 冷静编辑部秩序`。
- 调整 Web 全局视觉 token 和共享样式，增强纸面、注释线、手记条目和低噪音工程感。
- 更新首页首屏、最近手记、技术索引、照片入口文案和结构。
- 更新文章列表、文章详情元信息、上下篇导航、关于页、照片墙、照片详情、loading/error/404 的语气与视觉细节。
- 保持文章为主线，照片墙仍作为次级现场档案入口。
- 未修改 Admin、API、DB、infra。

## 部署步骤

- 本轮尚未实际部署。
- 发布前建议先完成截图验收：桌面与移动覆盖首页、文章列表、文章详情、关于页、照片页、404。
- 验收通过后按项目常规 Web 发布流程部署。

## 回滚方式

- 优先按文件回滚本轮 C 端改动：
  - `apps/web/app/globals.css`
  - `apps/web/app/layout.tsx`
  - `apps/web/app/page.tsx`
  - `apps/web/app/articles/page.tsx`
  - `apps/web/app/articles/[slug]/page.tsx`
  - `apps/web/app/about/page.tsx`
  - `apps/web/app/photos/page.tsx`
  - `apps/web/app/photos/[id]/page.tsx`
  - `apps/web/app/photos/loading.tsx`
  - `apps/web/app/photos/error.tsx`
  - `apps/web/app/not-found.tsx`
  - `apps/web/components/article/ArticleList.tsx`
- 如果只是首页方向不满意，优先回滚 `apps/web/app/page.tsx`。
- 如果阅读体验受影响，优先回滚 `apps/web/app/globals.css` 中本轮新增的注释线、文章条目和详情样式。

## 当前发布状态

- 暂不推进 release/done。
- 原因：review 阶段为有条件通过，缺少截图级视觉验收。
