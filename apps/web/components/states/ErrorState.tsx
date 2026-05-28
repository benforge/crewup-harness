import Link from "next/link";

type ErrorStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function ErrorState({
  eyebrow = "错误状态",
  title,
  description,
  primaryHref = "/",
  primaryLabel = "重试",
  secondaryHref = "/",
  secondaryLabel = "返回首页",
}: ErrorStateProps) {
  return (
    <section
      className="grid max-w-[660px] gap-2.5 border-l-4 border-[var(--color-danger)] py-6 pl-[18px] text-[var(--muted)]"
      aria-label={title}
    >
      <p className="mb-0 font-mono text-[13px] font-[750] text-[var(--accent)]">{eyebrow}</p>
      <h2 className="m-0 text-[27px] leading-[1.24] text-[var(--ink)] max-[720px]:text-2xl">{title}</h2>
      <p className="mb-0 leading-[1.7]">{description}</p>
      <div className="flex flex-wrap items-center gap-3.5">
        <Link className="inline-flex max-w-full min-w-0 text-sm font-bold leading-[1.35] text-[var(--accent)] [overflow-wrap:anywhere]" href={primaryHref}>
          {primaryLabel}
        </Link>
        <Link className="inline-flex max-w-full min-w-0 text-sm font-bold leading-[1.35] text-[var(--accent)] [overflow-wrap:anywhere]" href={secondaryHref}>
          {secondaryLabel}
        </Link>
      </div>
    </section>
  );
}
