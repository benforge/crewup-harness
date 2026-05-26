import type { Metadata } from "next";
import Link from "next/link";
import { ArticleList } from "../components/article/ArticleList";
import { EmptyState } from "../components/states/EmptyState";
import { ErrorState } from "../components/states/ErrorState";
import { formatPublishedAt, getArticleReadingText, loadPublishedArticles, loadTags } from "../lib/api";
import { siteDescription, siteName } from "../lib/site";

export const metadata: Metadata = {
  title: siteName,
  description: siteDescription,
  alternates: { canonical: "/" },
};

const writingSignals = [
  { label: "工程实践", text: "把真实交付里的边界、排查路径和质量门槛写成可复用记录。" },
  { label: "架构取舍", text: "记录模块、数据流、性能和长期维护成本之间的平衡。" },
  { label: "项目复盘", text: "用上线后的证据回看决策，让下一次迭代少走一点弯路。" },
];

export default async function HomePage() {
  const [articlesResult, tagsResult] = await Promise.all([loadPublishedArticles(), loadTags()]);
  const articles = articlesResult.data;
  const tags = tagsResult.data;
  const [leadArticle, ...secondaryArticles] = articles;
  const recentArticles = secondaryArticles.slice(0, 4);
  const isUsingFallback = articlesResult.state === "fallback" || tagsResult.state === "fallback";

  return (
    <main id="main-content">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow">工程手记 / 2026</p>
          <h1 id="home-title">把工程现场整理成能复用的手记。</h1>
          <p className="lede">{siteDescription}</p>
          <div className="hero-actions">
            <Link className="primary-action" href="/articles">
              阅读文章
            </Link>
            <Link className="text-link" href="/about">
              了解作者
            </Link>
          </div>
        </div>
        <div className="hero-panel" aria-label="内容方向">
          {writingSignals.map((signal) => (
            <div className="signal-item" key={signal.label}>
              <strong>{signal.label}</strong>
              <span>{signal.text}</span>
            </div>
          ))}
        </div>
      </section>

      {isUsingFallback ? (
        <ErrorState
          eyebrow="备用内容"
          title="当前正在使用本地手记"
          description="公开 API 暂时不可用，首页正在渲染备用文章和标签。你仍然可以按手记时间线继续浏览。"
          primaryHref="/articles"
          primaryLabel="打开手记时间线"
          secondaryHref="/"
          secondaryLabel="刷新首页"
        />
      ) : null}

      {leadArticle ? (
        <section className="lead-note section-rule" aria-labelledby="lead-note-title">
          <div className="section-heading">
            <p className="eyebrow">当前重点</p>
            <h2 id="lead-note-title">本期重点</h2>
          </div>
          <Link className="featured-article" href={`/articles/${leadArticle.slug}`}>
            <span className="meta">
              {formatPublishedAt(leadArticle.publishedAt)} / {getArticleReadingText(leadArticle)}
            </span>
            <h2>{leadArticle.title}</h2>
            <p>{leadArticle.summary}</p>
            <span className="text-link">阅读这篇手记</span>
          </Link>
        </section>
      ) : null}

      <section className="section-block editorial-grid section-rule" aria-labelledby="latest-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">阅读队列</p>
            <h2 id="latest-title">最近手记</h2>
          </div>
          <p>列表保持单列密度，优先让标题、摘要、时间、主题和阅读量都能快速扫读。</p>
          <Link className="text-link" href="/articles">
            查看全部文章
          </Link>
        </div>

        {recentArticles.length > 0 ? (
          <ArticleList articles={recentArticles} ariaLabel="最新文章" />
        ) : (
          <EmptyState
            eyebrow="暂无更多"
            title="还没有更多公开文章"
            description="更多工程手记会在发布后出现在这里。"
            primaryHref="/articles"
            primaryLabel="打开文章归档"
            secondaryHref="/about"
            secondaryLabel="查看写作范围"
          />
        )}
      </section>

      <section className="home-tags section-rule" aria-labelledby="tag-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">技术索引</p>
            <h2 id="tag-title">技术索引</h2>
          </div>
          <p>标签只做横向索引，用来串起框架、工具、方法和重复出现的工程问题。</p>
        </div>
        {tags.length > 0 ? (
          <div className="tag-list" aria-label="标签链接">
            {tags.map((tag) => (
              <Link className="tag" href={`/tags/${tag.slug}`} key={tag.slug}>
                {tag.name}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            eyebrow="暂无标签"
            title="暂时还没有技术标签"
            description="文章发布后，标签会在这里形成横向索引。"
            primaryHref="/articles"
            primaryLabel="阅读文章"
            secondaryHref="/about"
            secondaryLabel="查看关于页"
          />
        )}
      </section>

      <section className="photo-entry section-rule" aria-labelledby="photo-entry-title">
        <div>
          <p className="eyebrow">现场记录</p>
          <h2 id="photo-entry-title">轻量现场档案</h2>
          <p>照片墙保持次级入口，只在图像能补充项目现场、工作台细节或社区记录时出现。</p>
        </div>
        <Link className="text-link" href="/photos">
          打开现场档案
        </Link>
      </section>
    </main>
  );
}
