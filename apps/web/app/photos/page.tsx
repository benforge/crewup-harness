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
    <main id="main-content" className="photo-page">
      <section className="page-heading archive-heading photo-page-heading" aria-labelledby="photos-title">
        <p className="eyebrow">现场记录 / 相册</p>
        <h1 id="photos-title">把照片墙铺到更宽的视野里。</h1>
        <p className="lede">{siteDescription}</p>
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

      <section className="photo-wall-layout" aria-label="相册浏览区">
        <PhotoFilters filters={filters} photos={photos} />
        <div className="photo-wall-results">
          <div className="photo-result-bar">
            <p>
              共找到 {filteredPhotos.length} 张照片
              {filters.tag || filters.category || filters.year ? "，当前启用了筛选条件" : "，按发布时间与权重排序"}
            </p>
            {filteredPhotos.length > 0 ? (
              <a className="text-link" href="#photo-wall-grid">
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
