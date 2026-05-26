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

  return (
    <aside className="photo-filter-panel" aria-label="照片筛选">
      <div>
        <p className="eyebrow">筛选</p>
        <h2>缩小范围</h2>
      </div>
      <div className="photo-filter-group">
        <span>标签</span>
        <div className="photo-filter-options">
          {options.tags.map((tag) => (
            <Link
              className={`tag ${filters.tag === tag ? "active" : ""}`}
              href={filterHref({ ...filters, tag: filters.tag === tag ? undefined : tag })}
              key={tag}
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>
      <div className="photo-filter-group">
        <span>分类</span>
        <div className="photo-filter-options">
          {options.categories.map((category) => (
            <Link
              className={`tag ${filters.category === category ? "active" : ""}`}
              href={filterHref({ ...filters, category: filters.category === category ? undefined : category })}
              key={category}
            >
              {category}
            </Link>
          ))}
        </div>
      </div>
      <div className="photo-filter-group">
        <span>年份</span>
        <div className="photo-filter-options">
          {options.years.map((year) => (
            <Link
              className={`tag ${filters.year === String(year) ? "active" : ""}`}
              href={filterHref({ ...filters, year: filters.year === String(year) ? undefined : String(year) })}
              key={year}
            >
              {year}
            </Link>
          ))}
        </div>
      </div>
      {hasFilters ? (
        <Link className="text-link" href="/photos">
          清除筛选
        </Link>
      ) : null}
    </aside>
  );
}
