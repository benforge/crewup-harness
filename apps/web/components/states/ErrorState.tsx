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
    <section className="error-state" aria-label={title}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="inline-actions">
        <Link href={primaryHref}>{primaryLabel}</Link>
        <Link href={secondaryHref}>{secondaryLabel}</Link>
      </div>
    </section>
  );
}
