import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleList } from "../../../components/article/ArticleList";
import { EmptyState } from "../../../components/states/EmptyState";
import { ErrorState } from "../../../components/states/ErrorState";
import { getTag, loadPublishedArticles, loadTags, listTags } from "../../../lib/api";

type TagPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const tags = await listTags().catch(() => []);

  return tags.map((tag) => ({
    slug: tag.slug,
  }));
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTag(slug);

  if (!tag) {
    return {
      title: "标签未找到",
    };
  }

  const description = tag.description ?? `浏览 ${tag.name} 技术索引下的已发布文章。`;

  return {
    title: `${tag.name} 技术索引`,
    description,
    alternates: {
      canonical: `/tags/${tag.slug}`,
    },
    openGraph: {
      title: `${tag.name} 技术索引`,
      description,
      url: `/tags/${tag.slug}`,
    },
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params;
  const [tagsResult, articlesResult] = await Promise.all([loadTags(), loadPublishedArticles()]);
  const tag = tagsResult.data.find((item) => item.slug === slug) ?? null;
  const articles = articlesResult.data.filter((article) => article.tags.some((item) => item.slug === slug));
  const isUsingFallback = tagsResult.state === "fallback" || articlesResult.state === "fallback";

  if (!tag) {
    notFound();
  }

  return (
    <main id="main-content">
      <section className="grid max-w-[min(820px,100%)] grid-cols-[minmax(0,1fr)_minmax(220px,0.38fr)] gap-9 pt-[58px] max-[860px]:grid-cols-1" aria-labelledby="tag-title">
        <div className="grid gap-2.5">
          <p className="mb-0 font-mono text-[13px] font-[750] text-[var(--accent)]">Technical index</p>
          <h1 className="mb-4 max-w-[820px] break-words font-serif text-[56px] font-[650] leading-[1.08] [text-wrap:balance] max-[720px]:text-[32px] max-[720px]:leading-[1.12]" id="tag-title">
            {tag.name}
          </h1>
          <p className="m-0 max-w-[min(740px,100%)] text-lg leading-[1.78] text-[var(--muted)] [overflow-wrap:anywhere] max-[720px]:text-[17px]">
            {tag.description ?? "标签用于横向索引框架、工具、语言和方法，帮助读者跨主题追踪同类工程问题。"}
          </p>
        </div>
        <aside className="grid content-start gap-2.5 border-y border-[var(--rule)] py-4">
          <span className="font-mono text-[13px] text-[var(--muted)]">索引文章</span>
          <strong className="text-[27px] leading-[1.24] text-[var(--ink)]">{articles.length}</strong>
          <p className="m-0 leading-[1.65] text-[var(--muted)]">标签是横向索引，不应承担主主题归档的职责。</p>
        </aside>
      </section>

      {isUsingFallback ? (
        <ErrorState
          eyebrow="Fallback content"
          title="当前使用备用内容"
          description="公开 API 暂时不可用，该技术索引正在基于内置备用文章生成。标签统计和关联关系可能不是最新线上数据。"
          primaryHref={`/tags/${tag.slug}`}
          primaryLabel="重新加载索引"
          secondaryHref="/articles"
          secondaryLabel="返回全部文章"
        />
      ) : null}

      {articles.length > 0 ? (
        <ArticleList articles={articles} activeTagSlug={tag.slug} ariaLabel={`${tag.name} 标签文章`} />
      ) : (
        <EmptyState
          eyebrow="No posts in index"
          title="这个技术索引还没有公开文章"
          description="标签存在，但当前还没有关联内容。你可以先浏览全部文章或回到首页。"
          primaryHref="/articles"
          primaryLabel="浏览全部文章"
          secondaryHref="/"
          secondaryLabel="返回首页"
        />
      )}

      <div className="mt-9 flex flex-wrap items-center gap-3.5">
        <Link className="inline-flex max-w-full min-w-0 text-sm font-bold leading-[1.35] text-[var(--accent)] [overflow-wrap:anywhere]" href="/articles">
          返回全部文章
        </Link>
      </div>
    </main>
  );
}
