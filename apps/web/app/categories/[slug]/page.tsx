import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleList } from "../../../components/article/ArticleList";
import { EmptyState } from "../../../components/states/EmptyState";
import { ErrorState } from "../../../components/states/ErrorState";
import { getCategory, loadCategories, loadPublishedArticles, listCategories } from "../../../lib/api";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const categories = await listCategories().catch(() => []);

  return categories.map((category) => ({
    slug: category.slug,
  }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    return {
      title: "分类未找到",
    };
  }

  const description = category.description ?? `浏览 ${category.name} 主题归档下的已发布文章。`;

  return {
    title: `${category.name} 主题归档`,
    description,
    alternates: {
      canonical: `/categories/${category.slug}`,
    },
    openGraph: {
      title: `${category.name} 主题归档`,
      description,
      url: `/categories/${category.slug}`,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const [categoriesResult, articlesResult] = await Promise.all([loadCategories(), loadPublishedArticles()]);
  const category = categoriesResult.data.find((item) => item.slug === slug) ?? null;
  const articles = articlesResult.data.filter((article) => article.category?.slug === slug);
  const isUsingFallback = categoriesResult.state === "fallback" || articlesResult.state === "fallback";

  if (!category) {
    notFound();
  }

  return (
    <main id="main-content">
      <section className="grid max-w-[min(820px,100%)] grid-cols-[minmax(0,1fr)_minmax(220px,0.38fr)] gap-9 pt-[58px] max-[860px]:grid-cols-1" aria-labelledby="category-title">
        <div className="grid gap-2.5">
          <p className="mb-0 font-mono text-[13px] font-[750] text-[var(--accent)]">Topic archive</p>
          <h1 className="mb-4 max-w-[820px] break-words font-serif text-[56px] font-[650] leading-[1.08] [text-wrap:balance] max-[720px]:text-[32px] max-[720px]:leading-[1.12]" id="category-title">
            {category.name}
          </h1>
          <p className="m-0 max-w-[min(740px,100%)] text-lg leading-[1.78] text-[var(--muted)] [overflow-wrap:anywhere] max-[720px]:text-[17px]">
            {category.description ?? "该主题归档用于组织长期写作方向，帮助读者连续阅读同一类工程问题。"}
          </p>
        </div>
        <aside className="grid content-start gap-2.5 border-y border-[var(--rule)] py-4">
          <span className="font-mono text-[13px] text-[var(--muted)]">公开文章</span>
          <strong className="text-[27px] leading-[1.24] text-[var(--ink)]">{articles.length}</strong>
          <p className="m-0 leading-[1.65] text-[var(--muted)]">分类是主主题归档，数量应少而稳定。</p>
        </aside>
      </section>

      {isUsingFallback ? (
        <ErrorState
          eyebrow="Fallback content"
          title="当前使用备用内容"
          description="公开 API 暂时不可用，该归档正在基于内置备用文章生成。文章数量和主题归属可能不是最新线上数据。"
          primaryHref={`/categories/${category.slug}`}
          primaryLabel="重新加载归档"
          secondaryHref="/articles"
          secondaryLabel="返回全部文章"
        />
      ) : null}

      {articles.length > 0 ? (
        <ArticleList articles={articles} ariaLabel={`${category.name} 主题文章`} />
      ) : (
        <EmptyState
          eyebrow="No posts in topic"
          title="这个主题还没有公开文章"
          description="分类存在，但当前还没有归档到这里的公开内容。你可以先浏览全部文章或回到首页。"
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
