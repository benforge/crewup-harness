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
      <section
        className="grid grid-cols-[minmax(0,1fr)_minmax(280px,0.44fr)] items-stretch gap-[42px] border-b border-[var(--rule)] py-9 pt-[58px] max-[860px]:grid-cols-1 max-[720px]:gap-7 max-[720px]:pt-[42px]"
        aria-labelledby="home-title"
      >
        <div className="relative grid gap-5">
          <p className="mb-0 font-mono text-[13px] font-[750] text-[var(--accent)]">工程手记 / 2026</p>
          <h1 className="m-0 max-w-[820px] break-words font-serif text-[56px] font-[650] leading-[1.08] [text-wrap:balance] max-[720px]:text-[32px] max-[720px]:leading-[1.12]" id="home-title">
            把工程现场整理成能复用的手记。
          </h1>
          <p className="m-0 max-w-[min(740px,100%)] text-lg leading-[1.78] text-[var(--muted)] [overflow-wrap:anywhere] max-[720px]:text-[17px]">{siteDescription}</p>
          <div className="flex flex-wrap items-center gap-x-[18px] gap-y-3">
            <Link
              className="inline-flex min-h-[42px] items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--accent)_44%,var(--rule))] bg-[var(--accent)] px-4 text-sm font-extrabold text-[var(--button-ink)] hover:bg-[var(--accent-hover)] hover:text-[var(--button-ink)]"
              href="/articles"
            >
              阅读文章
            </Link>
            <Link className="inline-flex max-w-full min-w-0 text-sm font-bold leading-[1.35] text-[var(--accent)] [overflow-wrap:anywhere]" href="/about">
              了解作者
            </Link>
          </div>
        </div>
        <div className="grid content-start border-y border-[var(--rule)]" aria-label="内容方向">
          {writingSignals.map((signal, index) => (
            <div
              className="min-w-0 border-l-2 border-[color-mix(in_srgb,var(--accent)_24%,transparent)] py-[18px] pl-3.5 [&+&]:border-t [&+&]:border-[var(--rule)]"
              key={signal.label}
            >
              <strong className="mb-1.5 flex items-baseline gap-2 text-sm">
                <span className="font-mono text-xs font-[750] text-[var(--amber)]" aria-hidden="true">
                  0{index + 1}
                </span>
                {signal.label}
              </strong>
              <span className="text-[13px] leading-[1.55] text-[var(--muted)]">{signal.text}</span>
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
        <section className="grid grid-cols-[210px_minmax(0,1fr)] items-start gap-[42px] border-t border-[var(--rule)] py-9 max-[860px]:grid-cols-1" aria-labelledby="lead-note-title">
          <div className="grid items-start gap-3">
            <p className="mb-0 font-mono text-[13px] font-[750] text-[var(--accent)]">当前重点</p>
            <h2 className="m-0 text-[27px] leading-[1.24] max-[720px]:text-2xl" id="lead-note-title">
              本期重点
            </h2>
          </div>
          <Link
            className="grid gap-3.5 rounded-lg border border-l-4 border-[var(--rule)] border-l-[var(--accent)] bg-[linear-gradient(90deg,var(--accent-soft),transparent_44%),var(--surface-raised)] py-[22px] pl-5 hover:border-[rgb(23_107_91_/_0.38)] max-[720px]:p-[18px]"
            href={`/articles/${leadArticle.slug}`}
          >
            <span className="m-0 font-mono text-[13px] text-[var(--soft)]">
              {formatPublishedAt(leadArticle.publishedAt)} / {getArticleReadingText(leadArticle)}
            </span>
            <h2 className="m-0 text-[25px] leading-[1.24]">{leadArticle.title}</h2>
            <p className="mb-0 leading-[1.72] text-[var(--muted)]">{leadArticle.summary}</p>
            <span className="inline-flex max-w-full min-w-0 text-sm font-bold leading-[1.35] text-[var(--accent)] [overflow-wrap:anywhere]">阅读这篇手记</span>
          </Link>
        </section>
      ) : null}

      <section className="grid max-w-[1000px] grid-cols-[210px_minmax(0,1fr)] items-start gap-[42px] border-t border-[var(--rule)] py-9 max-[860px]:grid-cols-1 max-[720px]:py-[30px]" aria-labelledby="latest-title">
        <div className="sticky top-6 grid items-start gap-3 max-[860px]:static">
          <div>
            <p className="mb-2.5 font-mono text-[13px] font-[750] text-[var(--accent)]">阅读队列</p>
            <h2 className="m-0 text-[27px] leading-[1.24] max-[720px]:text-2xl" id="latest-title">
              最近手记
            </h2>
          </div>
          <p className="m-0 leading-[1.65] text-[var(--muted)]">列表保持单列密度，优先让标题、摘要、时间、主题和阅读量都能快速扫读。</p>
          <Link className="inline-flex max-w-full min-w-0 text-sm font-bold leading-[1.35] text-[var(--accent)] [overflow-wrap:anywhere]" href="/articles">
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

      <section className="grid max-w-[1000px] grid-cols-[240px_minmax(0,1fr)] items-start gap-[42px] border-t border-[var(--rule)] py-9 max-[860px]:grid-cols-1" aria-labelledby="tag-title">
        <div className="grid items-start gap-3">
          <div>
            <p className="mb-2.5 font-mono text-[13px] font-[750] text-[var(--accent)]">技术索引</p>
            <h2 className="m-0 text-[27px] leading-[1.24] max-[720px]:text-2xl" id="tag-title">
              技术索引
            </h2>
          </div>
          <p className="m-0 leading-[1.65] text-[var(--muted)]">标签只做横向索引，用来串起框架、工具、方法和重复出现的工程问题。</p>
        </div>
        {tags.length > 0 ? (
          <div className="mt-0.5 flex min-w-0 flex-wrap gap-2" aria-label="标签链接">
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

      <section
        className="grid max-w-[1000px] grid-cols-[minmax(0,1fr)_auto] items-start gap-[42px] border-t border-[var(--rule)] py-9 max-[860px]:grid-cols-1"
        aria-labelledby="photo-entry-title"
      >
        <div>
          <p className="mb-2.5 font-mono text-[13px] font-[750] text-[var(--accent)]">现场记录</p>
          <h2 className="m-0 text-[27px] leading-[1.24] max-[720px]:text-2xl" id="photo-entry-title">
            轻量现场档案
          </h2>
          <p className="mb-0 max-w-[680px] leading-[1.72] text-[var(--muted)]">照片墙保持次级入口，只在图像能补充项目现场、工作台细节或社区记录时出现。</p>
        </div>
        <Link className="inline-flex max-w-full min-w-0 text-sm font-bold leading-[1.35] text-[var(--accent)] [overflow-wrap:anywhere]" href="/photos">
          打开现场档案
        </Link>
      </section>
    </main>
  );
}
