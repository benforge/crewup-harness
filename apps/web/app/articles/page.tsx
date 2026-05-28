import type { Metadata } from "next";
import Link from "next/link";
import { ArticleList } from "../../components/article/ArticleList";
import { EmptyState } from "../../components/states/EmptyState";
import { ErrorState } from "../../components/states/ErrorState";
import {
  getTagName,
  loadCategories,
  loadPublishedArticles,
  loadTags,
  type ArticleSummary,
} from "../../lib/api";

export const metadata: Metadata = {
  title: "文章",
  description: "按发布时间倒序浏览工程实践、架构思考、项目复盘和工具方法文章。",
  alternates: {
    canonical: "/articles",
  },
  openGraph: {
    title: "文章",
    description: "按发布时间倒序浏览工程实践、架构思考、项目复盘和工具方法文章。",
    url: "/articles",
  },
};

type ArticlesPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
  }>;
};

const articlesPerPage = 6;

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams;
  const query = getSingleSearchParam(params.q).trim();
  const requestedPage = parsePageParam(getSingleSearchParam(params.page));

  const [articlesResult, categoriesResult, tagsResult] = await Promise.all([
    loadPublishedArticles(),
    loadCategories(),
    loadTags(),
  ]);
  const articles = articlesResult.data;
  const categories = categoriesResult.data;
  const tags = tagsResult.data;
  const filteredArticles = filterArticles(articles, query);
  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / articlesPerPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * articlesPerPage;
  const pagedArticles = filteredArticles.slice(pageStart, pageStart + articlesPerPage);
  const isUsingFallback =
    articlesResult.state === "fallback" || categoriesResult.state === "fallback" || tagsResult.state === "fallback";

  return (
    <main id="main-content">
      <section className="grid max-w-[min(820px,100%)] gap-2.5 pb-7 pt-[58px]" aria-labelledby="articles-title">
        <p className="mb-0 font-mono text-[13px] font-[750] text-[var(--accent)]">Archive / notes</p>
        <h1 className="mb-4 max-w-[820px] break-words font-serif text-[56px] font-[650] leading-[1.08] [text-wrap:balance] max-[720px]:text-[32px] max-[720px]:leading-[1.12]" id="articles-title">
          全部文章
        </h1>
        <p className="m-0 max-w-[min(740px,100%)] text-lg leading-[1.78] text-[var(--muted)] [overflow-wrap:anywhere] max-[720px]:text-[17px]">
          按时间浏览公开工程手记。每篇文章保留摘要、主题归档、技术标签和阅读时间，方便快速扫描。
        </p>
        <p className="m-0 font-mono text-[13px] text-[var(--muted)]">当前公开 {articles.length} 篇文章</p>
      </section>

      {isUsingFallback ? (
        <ErrorState
          eyebrow="Fallback content"
          title="当前使用备用内容"
          description="公开 API 暂时不可用，页面正在展示内置备用文章、分类或标签。你仍然可以搜索和浏览，但这些内容可能不是最新线上数据。"
          primaryHref="/articles"
          primaryLabel="重新加载文章"
          secondaryHref="/"
          secondaryLabel="返回首页"
        />
      ) : null}

      <section className="grid max-w-[1000px] grid-cols-[minmax(0,1fr)_minmax(280px,0.78fr)] gap-11 border-t border-[var(--rule)] pt-9 max-[860px]:grid-cols-1" aria-label="文章筛选入口">
        <div className="min-w-0">
          <div className="mb-3.5 flex items-center justify-between gap-[18px]">
            <h2 className="m-0 text-[27px] leading-[1.24] max-[720px]:text-2xl">按主题归档</h2>
          </div>
          <div className="grid">
            {categories.map((category) => (
              <Link
                className="grid gap-1.5 border-l-2 border-transparent border-t border-[var(--rule)] py-4 pl-3 last:border-b hover:border-l-[rgb(23_107_91_/_0.34)]"
                href={`/categories/${category.slug}`}
                key={category.slug}
              >
                <strong className="break-words">{category.name}</strong>
                {category.description ? <span className="leading-[1.65] text-[var(--muted)]">{category.description}</span> : null}
              </Link>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <div className="mb-3.5 flex items-center justify-between gap-[18px]">
            <h2 className="m-0 text-[27px] leading-[1.24] max-[720px]:text-2xl">按技术索引</h2>
          </div>
          <div className="mt-0.5 flex min-w-0 flex-wrap gap-2" aria-label="标签入口">
            {tags.map((tag) => (
              <Link
                className="inline-flex min-h-[30px] max-w-full items-center rounded-full border border-[var(--tag-border)] bg-[var(--tag-bg)] px-2.5 py-1 text-[13px] leading-[1.35] text-[var(--tag-ink)] break-words"
                href={`/tags/${tag.slug}`}
                key={tag.slug}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid max-w-[1000px] grid-cols-[210px_minmax(0,1fr)] items-start gap-[42px] py-9 max-[860px]:grid-cols-1 max-[720px]:py-[30px]" aria-labelledby="article-list-title">
        <div className="sticky top-6 grid items-start gap-3 max-[860px]:static">
          <div>
            <p className="mb-2.5 font-mono text-[13px] font-[750] text-[var(--accent)]">Reading queue</p>
            <h2 className="m-0 text-[27px] leading-[1.24] max-[720px]:text-2xl" id="article-list-title">
              手记时间线
            </h2>
          </div>
          <p className="m-0 leading-[1.65] text-[var(--muted)]">列表保持单列密度，不做卡片墙。可按关键词搜索标题、摘要、分类和标签；分页以 URL 参数保留当前位置。</p>
        </div>

        <div className="grid min-w-0 gap-[22px]">
          <form className="grid max-w-[var(--container-reading)] gap-2.5 border-y border-l-[3px] border-y-[var(--rule)] border-l-[rgb(169_101_23_/_0.28)] py-[18px] pb-5 pl-4" action="/articles" role="search">
            <label className="text-sm font-[750] text-[var(--ink)]" htmlFor="article-search">
              搜索文章
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 max-[720px]:grid-cols-1">
              <input
                className="min-h-11 min-w-0 rounded-md border border-[var(--rule)] bg-[var(--surface-raised)] px-[13px] font-[inherit] text-[var(--ink)] focus:border-[rgb(23_107_91_/_0.42)] focus:outline-[3px_solid_rgb(23_107_91_/_0.12)]"
                id="article-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="输入 Next.js、CI/CD、性能优化..."
              />
              <button
                className="min-h-11 cursor-pointer rounded-md border border-[rgb(23_107_91_/_0.28)] bg-[var(--accent)] px-4 font-[inherit] font-[750] text-[var(--button-ink)] hover:bg-[var(--accent-hover)]"
                type="submit"
              >
                搜索
              </button>
            </div>
            <p className="m-0 text-[13px] leading-[1.55] text-[var(--muted)]">
              {query
                ? `找到 ${filteredArticles.length} 篇匹配“${query}”的文章`
                : `按时间线显示全部 ${filteredArticles.length} 篇文章`}
            </p>
          </form>

          {pagedArticles.length > 0 ? (
            <>
              <ArticleList articles={pagedArticles} />
              <Pagination
                currentPage={currentPage}
                totalItems={filteredArticles.length}
                totalPages={totalPages}
                query={query}
              />
            </>
        ) : (
          <EmptyState
              eyebrow={query ? "No search results" : "No public posts"}
              title={query ? "没有找到匹配的文章" : "暂时没有公开文章"}
              description={
                query
                  ? "换一个更宽的关键词，或清空搜索回到完整时间线。"
                  : "可能还在整理草稿或等待发布。你可以先返回首页了解本站的写作方向。"
              }
              primaryHref="/articles"
              primaryLabel={query ? "清空搜索" : "刷新文章列表"}
              secondaryHref="/about"
              secondaryLabel="了解本站"
          />
        )}
        </div>
      </section>
    </main>
  );
}

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parsePageParam(value: string) {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function filterArticles(articles: ArticleSummary[], query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return articles;

  return articles.filter((article) => {
    const searchableText = normalizeSearchText(
      [
        article.title,
        article.summary,
        article.category?.name,
        article.category?.description,
        ...article.tags.map((tag) => getTagName(tag)),
      ]
        .filter(Boolean)
        .join(" "),
    );

    return searchableText.includes(normalizedQuery);
  });
}

function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase("zh-CN").replace(/\s+/g, " ").trim();
}

function Pagination({
  currentPage,
  totalItems,
  totalPages,
  query,
}: {
  currentPage: number;
  totalItems: number;
  totalPages: number;
  query: string;
}) {
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * articlesPerPage + 1;
  const lastItem = Math.min(currentPage * articlesPerPage, totalItems);

  return (
    <nav
      className="flex max-w-[var(--container-reading)] flex-wrap items-center justify-between gap-x-5 gap-y-3.5 border-t border-[var(--rule)] pt-[18px]"
      aria-label="文章分页"
    >
      <p className="m-0 text-[13px] leading-[1.55] text-[var(--muted)]">
        第 {currentPage} / {totalPages} 页，每页 {articlesPerPage} 篇，当前显示 {firstItem}-{lastItem} / {totalItems}
      </p>
      <div className="flex items-center gap-2.5">
        {currentPage > 1 ? (
          <Link className="inline-flex min-h-9 items-center rounded-md border border-[var(--rule)] bg-[var(--surface-raised)] px-3 text-sm font-bold text-[var(--accent)]" href={createArticlesHref(currentPage - 1, query)}>
            上一页
          </Link>
        ) : (
          <span className="inline-flex min-h-9 items-center rounded-md border border-[var(--rule)] px-3 text-sm font-bold text-[var(--soft)]">上一页</span>
        )}
        {currentPage < totalPages ? (
          <Link className="inline-flex min-h-9 items-center rounded-md border border-[var(--rule)] bg-[var(--surface-raised)] px-3 text-sm font-bold text-[var(--accent)]" href={createArticlesHref(currentPage + 1, query)}>
            下一页
          </Link>
        ) : (
          <span className="inline-flex min-h-9 items-center rounded-md border border-[var(--rule)] px-3 text-sm font-bold text-[var(--soft)]">下一页</span>
        )}
      </div>
    </nav>
  );
}

function createArticlesHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const queryString = params.toString();
  return queryString ? `/articles?${queryString}` : "/articles";
}
