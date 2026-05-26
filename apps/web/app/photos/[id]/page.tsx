import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorState } from "../../../components/states/ErrorState";
import { PhotoImage } from "../../../components/photos/PhotoImage";
import { formatPublishedAt, getPhoto, listPhotos, loadPhoto } from "../../../lib/api";

type PhotoPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateStaticParams() {
  const photos = await listPhotos().catch(() => []);
  return photos.map((photo) => ({
    id: photo.id,
  }));
}

export async function generateMetadata({ params }: PhotoPageProps): Promise<Metadata> {
  const { id } = await params;
  const photo = await getPhoto(id).catch(() => null);
  if (!photo) return { title: "Photo not found" };
  return {
    title: photo.title,
    description: photo.description ?? photo.alt,
    openGraph: {
      title: photo.title,
      description: photo.description ?? photo.alt,
      images: [photo.imageUrl],
    },
  };
}

export default async function PhotoDetailPage({ params }: PhotoPageProps) {
  const { id } = await params;
  const result = await loadPhoto(id).catch(() => null);
  const photo = result?.data ?? null;

  if (!photo) notFound();

  return (
    <main id="main-content">
      <article className="photo-detail">
        <div className="photo-detail-media">
          <PhotoImage
            alt={photo.alt}
            height={photo.height}
            loading="eager"
            src={photo.imageUrl}
            width={photo.width}
          />
        </div>
        <aside className="photo-detail-copy">
          <Link className="text-link" href="/photos">
            Back to field notes
          </Link>
          <p className="eyebrow">{photo.category ?? "照片"}</p>
          <h1>{photo.title}</h1>
          {photo.description ? <p className="lede">{photo.description}</p> : null}
          <dl className="photo-meta-list">
            <div>
              <dt>Recorded</dt>
              <dd>{formatPublishedAt(photo.takenAt)}</dd>
            </div>
            <div>
              <dt>Alt note</dt>
              <dd>{photo.alt}</dd>
            </div>
          </dl>
          {photo.tags.length > 0 ? (
            <div className="tag-list" aria-label="Photo tags">
              {photo.tags.map((tag) => (
                <Link className="tag" href={`/photos?tag=${encodeURIComponent(tag)}`} key={tag}>
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}
          {result?.state === "fallback" ? (
            <ErrorState
              eyebrow="Fallback photo"
              title="当前使用本地照片样例"
              description="照片详情 API 暂时不可用。这个页面仍然保留路由、布局、替代文本和响应式图片检查。"
              primaryHref={`/photos/${photo.id}`}
              primaryLabel="Retry detail"
              secondaryHref="/photos"
              secondaryLabel="返回相册"
            />
          ) : null}
        </aside>
      </article>
    </main>
  );
}
