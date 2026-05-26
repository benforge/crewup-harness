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
    <section className={compact ? "article-list compact-list" : "article-list"} aria-label={ariaLabel}>
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
    <article className="article-card">
      <div className="article-card-meta">
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
      <h2>
        <Link href={`/articles/${article.slug}`}>{article.title}</Link>
      </h2>
      <p className="article-card-summary">{article.summary}</p>
      {article.tags.length > 0 ? (
        <div className="tag-list" aria-label="标签">
          {article.tags.map((tag) => {
            const slug = getTagSlug(tag);
            return (
              <Link className={slug === activeTagSlug ? "tag active" : "tag"} href={`/tags/${slug}`} key={slug}>
                {getTagName(tag)}
              </Link>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}
