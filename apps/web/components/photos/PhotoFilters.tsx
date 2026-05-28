import Link from "next/link";
import type { PhotoItem } from "../../lib/api";
import { getPhotoFilterOptions } from "../../lib/api";

type PhotoFiltersProps = {
  filters: {
    tag?: string;
    category?: string;
    year?: string;
  };
  photos: PhotoItem[];
};

function filterHref(next: PhotoFiltersProps["filters"]) {
  const params = new URLSearchParams();
  if (next.tag) params.set("tag", next.tag);
  if (next.category) params.set("category", next.category);
  if (next.year) params.set("year", next.year);
  const query = params.toString();
  return query ? `/photos?${query}` : "/photos";
}

export function PhotoFilters({ filters, photos }: PhotoFiltersProps) {
  const options = getPhotoFilterOptions(photos);
  const hasFilters = Boolean(filters.tag || filters.category || filters.year);
  const tagClassName =
    "inline-flex min-h-[30px] max-w-full items-center rounded-full border border-[var(--tag-border)] bg-[var(--tag-bg)] px-2.5 py-1 text-[13px] leading-[1.35] text-[var(--tag-ink)] break-words";
  const activeTagClassName =
    "inline-flex min-h-[30px] max-w-full items-center rounded-full border border-[color-mix(in_srgb,var(--amber)_34%,var(--rule))] bg-[var(--amber-soft)] px-2.5 py-1 text-[13px] leading-[1.35] text-[var(--ink)] break-words";

  return (
    <aside
      className="sticky top-6 grid min-w-0 gap-5 border-y border-[var(--rule)] py-[18px] max-[860px]:static"
      aria-label="照片筛选"
    >
      <div>
        <p className="mb-2.5 font-mono text-[13px] font-[750] text-[var(--accent)]">筛选</p>
        <h2 className="m-0 text-[22px] leading-[1.24]">缩小范围</h2>
      </div>
      <div className="grid gap-2">
        <span className="text-[13px] font-[750] text-[var(--muted)]">标签</span>
        <div className="flex min-w-0 flex-wrap gap-[7px]">
          {options.tags.map((tag) => (
            <Link
              className={filters.tag === tag ? activeTagClassName : tagClassName}
              href={filterHref({ ...filters, tag: filters.tag === tag ? undefined : tag })}
              key={tag}
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <span className="text-[13px] font-[750] text-[var(--muted)]">分类</span>
        <div className="flex min-w-0 flex-wrap gap-[7px]">
          {options.categories.map((category) => (
            <Link
              className={filters.category === category ? activeTagClassName : tagClassName}
              href={filterHref({ ...filters, category: filters.category === category ? undefined : category })}
              key={category}
            >
              {category}
            </Link>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <span className="text-[13px] font-[750] text-[var(--muted)]">年份</span>
        <div className="flex min-w-0 flex-wrap gap-[7px]">
          {options.years.map((year) => (
            <Link
              className={filters.year === String(year) ? activeTagClassName : tagClassName}
              href={filterHref({ ...filters, year: filters.year === String(year) ? undefined : String(year) })}
              key={year}
            >
              {year}
            </Link>
          ))}
        </div>
      </div>
      {hasFilters ? (
        <Link className="inline-flex max-w-full min-w-0 break-words text-sm font-bold leading-[1.35] text-[var(--accent)]" href="/photos">
          清除筛选
        </Link>
      ) : null}
    </aside>
  );
}
