import type { Metadata } from "next";
import { PhotoFilters } from "../../components/photos/PhotoFilters";
import { PhotoMasonryGrid } from "../../components/photos/PhotoMasonryGrid";
import { EmptyState } from "../../components/states/EmptyState";
import { ErrorState } from "../../components/states/ErrorState";
import { filterPhotos, loadPhotos } from "../../lib/api";
import { siteDescription } from "../../lib/site";

export const metadata: Metadata = {
  title: "相册",
  description: "浏览按时间排序的公开照片、筛选现场记录，并查看每张照片的上下文说明。",
  alternates: { canonical: "/photos" },
};

type PhotosPageProps = {
  searchParams: Promise<{
    tag?: string | string[];
    category?: string | string[];
    year?: string | string[];
  }>;
};

export default async function PhotosPage({ searchParams }: PhotosPageProps) {
  const params = await searchParams;
  const filters = {
    tag: getSingleSearchParam(params.tag),
    category: getSingleSearchParam(params.category),
    year: getSingleSearchParam(params.year),
  };

  const photosResult = await loadPhotos();
  const photos = photosResult.data;
  const filteredPhotos = filterPhotos(photos, filters);

  return (
    <main id="main-content">
      <section className="grid max-w-[min(820px,100%)] gap-2.5 pb-7 pt-[58px]" aria-labelledby="photos-title">
        <p className="mb-0 font-mono text-[13px] font-[750] text-[var(--accent)]">现场记录 / 相册</p>
        <h1 className="mb-4 max-w-[820px] break-words font-serif text-[56px] font-[650] leading-[1.08] [text-wrap:balance] max-[720px]:text-[32px] max-[720px]:leading-[1.12]" id="photos-title">
          把照片墙铺到更宽的视野里。
        </h1>
        <p className="m-0 max-w-[min(740px,100%)] text-lg leading-[1.78] text-[var(--muted)] [overflow-wrap:anywhere] max-[720px]:text-[17px]">{siteDescription}</p>
      </section>

      {photosResult.state === "fallback" ? (
        <ErrorState
          eyebrow="备用内容"
          title="当前正在使用备用照片数据"
          description="公开照片服务暂时不可用，页面会显示本地缓存的相册内容。"
          primaryHref="/photos"
          primaryLabel="重新加载相册"
          secondaryHref="/"
          secondaryLabel="返回首页"
        />
      ) : null}

      <section
        className="mx-auto grid w-[min(100%,calc(var(--container-page)+320px))] max-w-[calc(100vw_-_40px)] min-w-0 grid-cols-[230px_minmax(0,1fr)] items-start gap-9 pt-4 max-[860px]:grid-cols-1"
        aria-label="相册浏览区"
      >
        <PhotoFilters filters={filters} photos={photos} />
        <div className="min-w-0 w-full">
          <div className="mb-4 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 text-sm text-[var(--muted)] max-[860px]:grid-cols-1 max-[860px]:items-start max-[720px]:gap-2">
            <p className="m-0 min-w-0 [overflow-wrap:anywhere]">
              共找到 {filteredPhotos.length} 张照片
              {filters.tag || filters.category || filters.year ? "，当前启用了筛选条件" : "，按发布时间与权重排序"}
            </p>
            {filteredPhotos.length > 0 ? (
              <a className="inline-flex max-w-full min-w-0 justify-self-end text-sm font-bold leading-[1.35] text-[var(--accent)] [overflow-wrap:anywhere] max-[860px]:justify-self-start" href="#photo-wall-grid">
                跳到照片墙
              </a>
            ) : null}
          </div>

          {filteredPhotos.length > 0 ? (
            <PhotoMasonryGrid photos={filteredPhotos} />
          ) : (
            <EmptyState
              eyebrow="没有匹配项"
              title="没有找到符合条件的照片"
              description="试着放宽筛选条件，或者清除一个筛选项后再看。"
              primaryHref="/photos"
              primaryLabel="清除筛选"
              secondaryHref="/articles"
              secondaryLabel="去看文章"
            />
          )}
        </div>
      </section>
    </main>
  );
}

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
