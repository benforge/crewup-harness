import type { Metadata } from "next";
import Link from "next/link";
import { ErrorState } from "../../components/states/ErrorState";
import { loadCategories } from "../../lib/api";
import { siteDescription, siteName } from "../../lib/site";

export const metadata: Metadata = {
  title: "关于",
  description: `${siteName} 的定位、技术方向和写作边界。`,
  alternates: {
    canonical: "/about",
  },
};

const principles = [
  {
    title: "先写问题，再写方案",
    description: "每篇文章尽量交代背景、约束、决策和结果，不把工具清单当成经验。",
  },
  {
    title: "关注可维护性",
    description: "优先记录模块边界、错误处理、测试验证和交付后的维护成本。",
  },
  {
    title: "少做口号",
    description: "不追求夸张标题和营销式承诺，保留具体做法、取舍和复盘结论。",
  },
  {
    title: "持续治理内容",
    description: "分类服务长期主题，标签服务横向检索，避免无意义的标签堆叠。",
  },
];

export default async function AboutPage() {
  const categoriesResult = await loadCategories();
  const categories = categoriesResult.data;

  return (
    <main id="main-content">
      <section className="grid max-w-[min(760px,100%)] gap-2.5 py-[58px] pb-[34px] max-[720px]:pt-10" aria-labelledby="about-title">
        <p className="mb-0 font-mono text-[13px] font-[750] text-[var(--accent)]">About / operating notes</p>
        <h1 className="mb-4 max-w-[820px] break-words font-serif text-[56px] font-[650] leading-[1.08] [text-wrap:balance] max-[720px]:text-[32px] max-[720px]:leading-[1.12]" id="about-title">
          关于 {siteName}
        </h1>
        <p className="m-0 max-w-[min(740px,100%)] text-lg leading-[1.78] text-[var(--muted)] [overflow-wrap:anywhere] max-[720px]:text-[17px]">{siteDescription}</p>
      </section>

      <section className="max-w-[var(--container-reading)] border-t border-[var(--rule)] py-9 max-[720px]:py-[30px]" aria-labelledby="positioning-title">
        <h2 className="mb-3 text-[27px] leading-[1.24] max-[720px]:text-2xl" id="positioning-title">
          站点定位
        </h2>
        <p className="mb-4 leading-[1.75] text-[var(--muted)]">
          这里不是简历页，也不是营销落地页。它更像一份持续维护的工程日志，用来沉淀我在 Web
          应用、内容系统、研发流程和交付质量上的实践经验。
        </p>
        <p className="mb-4 leading-[1.75] text-[var(--muted)]">
          文章会尽量保留工程上下文：为什么做、遇到什么限制、最后怎么验证。读者可以把它当作技术决策和项目复盘的参考，而不是照抄清单。
        </p>
      </section>

      <section className="max-w-[var(--container-reading)] border-t border-[var(--rule)] py-9 max-[720px]:py-[30px]" aria-labelledby="scope-title">
        <h2 className="mb-3 text-[27px] leading-[1.24] max-[720px]:text-2xl" id="scope-title">
          内容范围
        </h2>
        {categoriesResult.state === "fallback" ? (
          <ErrorState
            eyebrow="Fallback content"
            title="当前使用备用分类"
            description="公开 API 暂时不可用，内容范围正在展示内置备用分类。分类命名可能不是最新线上配置。"
            primaryHref="/about"
            primaryLabel="重新加载"
            secondaryHref="/articles"
            secondaryLabel="浏览文章"
          />
        ) : null}
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
      </section>

      <section className="max-w-[var(--container-reading)] border-t border-[var(--rule)] py-9 max-[720px]:py-[30px]" aria-labelledby="principles-title">
        <h2 className="mb-3 text-[27px] leading-[1.24] max-[720px]:text-2xl" id="principles-title">
          写作准则
        </h2>
        <div className="mt-[18px] grid grid-cols-2 gap-3.5 max-[860px]:grid-cols-1">
          {principles.map((principle) => (
            <div className="border-l-2 border-l-[rgb(23_107_91_/_0.2)] border-t border-[var(--rule)] py-4 pl-3.5" key={principle.title}>
              <strong className="mb-1.5 block">{principle.title}</strong>
              <p className="m-0 leading-[1.75] text-[var(--muted)]">{principle.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-[var(--container-reading)] border-t border-[var(--rule)] py-9 max-[720px]:py-[30px]" aria-labelledby="start-title">
        <h2 className="mb-3 text-[27px] leading-[1.24] max-[720px]:text-2xl" id="start-title">
          从哪里开始
        </h2>
        <p className="mb-4 leading-[1.75] text-[var(--muted)]">如果你关心技术站建设，可以从架构思考读起；如果你关心交付过程，可以从工程实践和项目复盘读起。</p>
        <div className="flex flex-wrap items-center gap-3.5">
          <Link className="inline-flex max-w-full min-w-0 text-sm font-bold leading-[1.35] text-[var(--accent)] [overflow-wrap:anywhere]" href="/articles">
            浏览全部文章
          </Link>
          <Link className="inline-flex max-w-full min-w-0 text-sm font-bold leading-[1.35] text-[var(--accent)] [overflow-wrap:anywhere]" href="/">
            返回首页
          </Link>
        </div>
      </section>
    </main>
  );
}
