import type { Metadata } from "next";
import { EmptyState } from "../components/states/EmptyState";

export const metadata: Metadata = {
  title: "页面未找到",
  description: "页面不存在、文章尚未发布，或分类与标签路径已经调整。",
};

export default function NotFound() {
  return (
    <main id="main-content">
      <section className="page-heading compact" aria-labelledby="not-found-title">
        <p className="eyebrow">404 / 未找到</p>
        <h1 id="not-found-title">这个页面没有找到</h1>
        <p className="lede">链接可能已变更，文章可能尚未发布，或者分类与标签路径已经调整。</p>
      </section>

      <EmptyState
        eyebrow="路由未找到"
        title="继续寻找内容"
        description="这里不会展示调试堆栈。你可以回到首页，按主题归档，或者继续浏览文章。"
        primaryHref="/articles"
        primaryLabel="浏览文章列表"
        secondaryHref="/"
        secondaryLabel="返回首页"
      />
    </main>
  );
}
