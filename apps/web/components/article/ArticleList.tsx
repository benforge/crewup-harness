import Link from "next/link";
import {
  formatPublishedAt,
  normalizeArticleViewCount,
  getArticleReadingText,
  getTagName,
  getTagSlug,
  type ArticleSummary,
} from "../../lib/api";

type ArticleListProps = {
  articles: ArticleSummary[];
  activeTagSlug?: string;
  compact?: boolean;
  ariaLabel?: string;
};

export function ArticleList({ articles, activeTagSlug, compact = false, ariaLabel = "文章列表" }: ArticleListProps) {
  return (
    <section className={compact ? "grid max-w-[var(--container-reading)]" : "grid max-w-[var(--container-reading)]"} aria-label={ariaLabel}>
      {articles.map((article) => (
        <ArticleListItem article={article} activeTagSlug={activeTagSlug} key={article.id} />
      ))}
    </section>
  );
}

type ArticleListItemProps = {
  article: ArticleSummary;
  activeTagSlug?: string;
};

export function ArticleListItem({ article, activeTagSlug }: ArticleListItemProps) {
  return (
    <article className="relative grid gap-2.5 border-t border-[var(--rule-soft)] py-[25px] pl-[18px] last:border-b last:border-[var(--rule-soft)] before:absolute before:bottom-[25px] before:left-0 before:top-[25px] before:w-[3px] before:rounded-full before:bg-[rgb(23_107_91_/_0.16)] max-[720px]:py-[23px] max-[720px]:pl-0 max-[720px]:before:hidden">
      <div className="m-0 flex flex-wrap items-center gap-x-[9px] gap-y-1.5 font-mono text-[13px] leading-[1.45] text-[var(--soft)] [&_a]:text-[var(--blueprint)]">
        <span>手记 / {formatPublishedAt(article.publishedAt)}</span>
        {article.category ? (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/categories/${article.category.slug}`}>{article.category.name}</Link>
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span>{getArticleReadingText(article)}</span>
        <span aria-hidden="true">/</span>
        <span>{normalizeArticleViewCount(article.viewCount).toLocaleString("zh-CN")} 次阅读</span>
      </div>
      <h2 className="m-0 font-serif text-[27px] leading-[1.24] max-[720px]:text-2xl">
        <Link className="break-words hover:text-[var(--accent)]" href={`/articles/${article.slug}`}>
          {article.title}
        </Link>
      </h2>
      <p className="mb-0 max-w-[720px] text-base leading-[1.75] text-[var(--muted)]">{article.summary}</p>
      {article.tags.length > 0 ? (
        <div className="mt-0.5 flex min-w-0 flex-wrap gap-2" aria-label="标签">
          {article.tags.map((tag) => {
            const slug = getTagSlug(tag);
            return (
              <Link
                className={
                  slug === activeTagSlug
                    ? "inline-flex min-h-[30px] max-w-full items-center rounded-full border border-[color-mix(in_srgb,var(--amber)_34%,var(--rule))] bg-[var(--amber-soft)] px-2.5 py-1 text-[13px] leading-[1.35] text-[var(--ink)] break-words"
                    : "inline-flex min-h-[30px] max-w-full items-center rounded-full border border-[var(--tag-border)] bg-[var(--tag-bg)] px-2.5 py-1 text-[13px] leading-[1.35] text-[var(--tag-ink)] break-words"
                }
                href={`/tags/${slug}`}
                key={slug}
              >
                {getTagName(tag)}
              </Link>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}
