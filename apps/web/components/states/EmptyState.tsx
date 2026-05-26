import Link from "next/link";

type EmptyStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function EmptyState({
  eyebrow = "空状态",
  title,
  description,
  primaryHref = "/articles",
  primaryLabel = "浏览全部文章",
  secondaryHref = "/",
  secondaryLabel = "返回首页",
}: EmptyStateProps) {
  return (
    <section className="empty-state" aria-label={title}>
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
