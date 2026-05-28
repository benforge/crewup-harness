import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleList } from "../../../components/article/ArticleList";
import { MarkdownRenderer } from "../../../components/article/MarkdownRenderer";
import { EmptyState } from "../../../components/states/EmptyState";
import { ErrorState } from "../../../components/states/ErrorState";
import { ArticleViewTracker } from "../../../components/article/ArticleViewTracker";
import {
  formatPublishedAt,
  getArticleReadingText,
  getAuthorName,
  getPublishedArticle,
  getTagName,
  getTagSlug,
  loadPublishedArticle,
  loadPublishedArticles,
  listPublishedArticles,
  normalizeArticleViewCount,
  shouldTrackArticleView,
  type ArticleDetail,
  type ArticleSummary,
} from "../../../lib/api";
import { absoluteUrl, siteName } from "../../../lib/site";

type ArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const articles = await listPublishedArticles().catch(() => []);

  return articles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticle(slug).catch(() => null);

  if (!article) {
    return {
      title: "Article not found",
    };
  }

  const title = article.seoTitle ?? article.title;
  const description = article.seoDescription ?? article.summary;
  const path = `/articles/${article.slug}`;
  const canonical = article.canonicalUrl ?? path;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "article",
      url: path,
      siteName,
      title,
      description,
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt,
      authors: [getAuthorName(article.author)],
      tags: article.tags.map(getTagName),
      images: article.coverImage ? [article.coverImage] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const [articleResult, allArticlesResult] = await Promise.all([
    loadPublishedArticle(slug).catch(() => null),
    loadPublishedArticles(),
  ]);
  const article = articleResult?.data ?? null;
  const allArticles = allArticlesResult.data;

  if (!article) {
    notFound();
  }

  const isUsingFallback = articleResult?.state === "fallback" || allArticlesResult.state === "fallback";
  const shouldTrackView = shouldTrackArticleView(articleResult?.state, article);
  const related = getRelatedArticles(article, allArticles);
  const currentIndex = allArticles.findIndex((item) => item.slug === article.slug);
  const previousArticle = currentIndex > 0 ? allArticles[currentIndex - 1] : null;
  const nextArticle = currentIndex >= 0 && currentIndex < allArticles.length - 1 ? allArticles[currentIndex + 1] : null;

  return (
    <main id="main-content">
      <article className="grid justify-items-start pt-[54px] max-[720px]:pt-[42px]">
        <header className="grid w-full max-w-[var(--container-reading)] grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)] gap-7 border-l-4 border-[var(--accent)] pb-[18px] pl-[18px] max-[860px]:grid-cols-1">
          <div>
            <p className="mb-2.5 font-mono text-[13px] font-[750] text-[var(--accent)]">
              Notebook entry / {formatPublishedAt(article.publishedAt)}
              {article.category ? ` / ${article.category.name}` : ""}
            </p>
            <h1 className="mb-[18px] max-w-[820px] break-words font-serif text-[56px] font-[650] leading-[1.08] [text-wrap:balance] max-[720px]:text-[32px] max-[720px]:leading-[1.12]">
              {article.title}
            </h1>
            <p className="max-w-[var(--container-reading)] text-[19px] leading-[1.78] text-[var(--muted)] max-[720px]:text-[17px]">{article.summary}</p>
            <div className="my-[18px] mb-3.5 flex flex-wrap gap-x-3.5 gap-y-2 text-sm text-[var(--muted)] [&_a]:inline-flex [&_a]:min-h-[26px] [&_a]:items-center [&_a]:text-[var(--blueprint)] [&_span]:inline-flex [&_span]:min-h-[26px] [&_span]:items-center" aria-label="Article information">
              <span>Author / {getAuthorName(article.author)}</span>
              <span>Updated / {formatPublishedAt(article.updatedAt)}</span>
              <span>{getArticleReadingText(article)}</span>
              <span>Views / {normalizeArticleViewCount(article.viewCount).toLocaleString("zh-CN")}</span>
              {article.category ? <Link href={`/categories/${article.category.slug}`}>Category / {article.category.name}</Link> : null}
            </div>
          </div>

          <aside className="grid content-start gap-4 border-y border-[var(--rule)] py-4">
            <div>
              <p className="mb-2.5 font-mono text-[13px] font-[750] text-[var(--accent)]">Reading note</p>
              <strong className="block leading-[1.55]">这篇文章属于工程手记，而不是营销页面。</strong>
            </div>
            {article.tags.length > 0 ? (
              <div className="mt-0.5 flex min-w-0 flex-wrap gap-2" aria-label="Tags">
                {article.tags.map((tag) => (
                  <Link
                    className="inline-flex min-h-[30px] max-w-full items-center rounded-full border border-[var(--tag-border)] bg-[var(--tag-bg)] px-2.5 py-1 text-[13px] leading-[1.35] text-[var(--tag-ink)] break-words"
                    href={`/tags/${getTagSlug(tag)}`}
                    key={getTagSlug(tag)}
                  >
                    {getTagName(tag)}
                  </Link>
                ))}
              </div>
            ) : null}
          </aside>
        </header>

        {isUsingFallback ? (
          <ErrorState
            eyebrow="Fallback content"
            title="当前使用本地手记数据"
            description="公开 API 暂时不可用，页面正在渲染备用文章。阅读体验仍然可用，但内容可能不是最新线上版本。"
            primaryHref={`/articles/${article.slug}`}
            primaryLabel="重试文章"
            secondaryHref="/articles"
            secondaryLabel="返回文章列表"
          />
        ) : null}

        {article.coverImage ? (
          <img
            alt={`${article.title} cover image`}
            className="mt-[30px] max-h-[420px] w-full max-w-[960px] rounded-lg object-cover"
            decoding="async"
            height={420}
            loading="lazy"
            src={article.coverImage}
            width={960}
          />
        ) : null}

        {article.aiSummary || article.geoDescription ? (
          <aside
            className="mt-7 max-w-[var(--container-reading)] rounded-md border-l-4 border-[var(--amber)] bg-[var(--amber-soft)] px-[18px] py-4"
            aria-label="Reading note"
          >
            <strong className="mb-1 block">阅读提示</strong>
            <p className="m-0 leading-[1.72] text-[var(--note-text)]">{article.aiSummary ?? article.geoDescription}</p>
          </aside>
        ) : null}

        {article.body.trim() ? (
          <>
            <ArticleViewTracker slug={article.slug} enabled={shouldTrackView} />
            <MarkdownRenderer body={article.body} />
          </>
        ) : (
          <div className="max-w-[var(--container-reading)] pt-[34px] text-lg leading-[1.86] max-[720px]:text-[17px] max-[720px]:leading-[1.82]">
            <EmptyState
              eyebrow="Draft issue"
              title="正文还没有准备好"
              description="这篇文章已经发布，但正文为空。你可以回到文章时间线继续阅读其他工程手记。"
              primaryHref="/articles"
              primaryLabel="返回文章列表"
              secondaryHref="/"
              secondaryLabel="返回首页"
            />
          </div>
        )}
      </article>

      <ArticleNavigation previousArticle={previousArticle} nextArticle={nextArticle} />

      {related.length > 0 ? (
        <section className="mt-[26px] max-w-[var(--container-reading)] py-9 max-[720px]:py-[30px]" aria-labelledby="related-title">
          <div className="mb-3.5 flex items-center justify-between gap-[18px]">
            <h2 className="m-0 text-[27px] leading-[1.24] max-[720px]:text-2xl" id="related-title">
              Related reading
            </h2>
          </div>
          <ArticleList articles={related} compact ariaLabel="Related articles" />
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(createArticleJsonLd(article)).replace(/</g, "\\u003c"),
        }}
      />
    </main>
  );
}

function getRelatedArticles(article: ArticleDetail, allArticles: ArticleSummary[]) {
  return allArticles
    .filter((item) => item.slug !== article.slug)
    .filter((item) => {
      const sameCategory = item.category?.slug && item.category.slug === article.category?.slug;
      const sameTag = item.tags.some((tag) => article.tags.some((articleTag) => articleTag.slug === tag.slug));
      return sameCategory || sameTag;
    })
    .slice(0, 3);
}

function ArticleNavigation({
  previousArticle,
  nextArticle,
}: {
  previousArticle: ArticleSummary | null;
  nextArticle: ArticleSummary | null;
}) {
  if (!previousArticle && !nextArticle) {
    return (
      <section className="mt-[38px] grid w-full max-w-[var(--container-reading)] grid-cols-1 gap-3.5 border-t border-[var(--rule)] pt-6" aria-label="Continue reading">
        <Link className="grid min-h-[104px] min-w-0 gap-[7px] rounded-lg border border-l-[3px] border-[var(--rule)] border-l-[rgb(23_107_91_/_0.2)] bg-[var(--surface-raised)] p-4 pl-[18px] hover:border-[rgb(23_107_91_/_0.36)] hover:bg-[var(--surface)]" href="/articles">
          <span className="text-[13px] text-[var(--soft)]">Back to index</span>
          <strong className="break-words font-serif text-[19px] leading-[1.35] text-[var(--ink)]">回到全部工程手记</strong>
        </Link>
      </section>
    );
  }

  return (
    <nav className="mt-[38px] grid w-full max-w-[var(--container-reading)] grid-cols-2 gap-3.5 border-t border-[var(--rule)] pt-6 max-[720px]:grid-cols-1" aria-label="Previous and next article">
      {previousArticle ? (
        <Link className="grid min-h-[104px] min-w-0 gap-[7px] rounded-lg border border-l-[3px] border-[var(--rule)] border-l-[rgb(23_107_91_/_0.2)] bg-[var(--surface-raised)] p-4 pl-[18px] hover:border-[rgb(23_107_91_/_0.36)] hover:bg-[var(--surface)]" href={`/articles/${previousArticle.slug}`}>
          <span className="text-[13px] text-[var(--soft)]">Previous / newer note</span>
          <strong className="break-words font-serif text-[19px] leading-[1.35] text-[var(--ink)]">{previousArticle.title}</strong>
        </Link>
      ) : (
        <Link className="grid min-h-[104px] min-w-0 gap-[7px] rounded-lg border border-l-[3px] border-[var(--rule)] border-l-[rgb(23_107_91_/_0.2)] bg-transparent p-4 pl-[18px] hover:border-[rgb(23_107_91_/_0.36)] hover:bg-[var(--surface)]" href="/articles">
          <span className="text-[13px] text-[var(--soft)]">Newest note</span>
          <strong className="break-words font-serif text-[19px] leading-[1.35] text-[var(--muted)]">回到手记时间线</strong>
        </Link>
      )}
      {nextArticle ? (
        <Link className="grid min-h-[104px] min-w-0 gap-[7px] rounded-lg border border-l-[3px] border-[var(--rule)] border-l-[rgb(23_107_91_/_0.2)] bg-[var(--surface-raised)] p-4 pl-[18px] hover:border-[rgb(23_107_91_/_0.36)] hover:bg-[var(--surface)]" href={`/articles/${nextArticle.slug}`}>
          <span className="text-[13px] text-[var(--soft)]">Next / older note</span>
          <strong className="break-words font-serif text-[19px] leading-[1.35] text-[var(--ink)]">{nextArticle.title}</strong>
        </Link>
      ) : (
        <Link className="grid min-h-[104px] min-w-0 gap-[7px] rounded-lg border border-l-[3px] border-[var(--rule)] border-l-[rgb(23_107_91_/_0.2)] bg-transparent p-4 pl-[18px] hover:border-[rgb(23_107_91_/_0.36)] hover:bg-[var(--surface)]" href="/articles">
          <span className="text-[13px] text-[var(--soft)]">Archive end</span>
          <strong className="break-words font-serif text-[19px] leading-[1.35] text-[var(--muted)]">回到手记时间线</strong>
        </Link>
      )}
    </nav>
  );
}

function createArticleJsonLd(article: ArticleDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.aiSummary ?? article.summary,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Person",
      name: getAuthorName(article.author),
      url: article.author.url,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: absoluteUrl("/"),
    },
    articleSection: article.category?.name,
    keywords: article.tags.map(getTagName),
    image: article.coverImage ?? undefined,
    mainEntityOfPage: article.canonicalUrl ?? absoluteUrl(`/articles/${article.slug}`),
  };
}
