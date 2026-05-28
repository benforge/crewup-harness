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
      <article className="grid grid-cols-[minmax(0,1fr)_minmax(280px,360px)] items-start gap-8 pt-[42px] max-[860px]:grid-cols-1">
        <div className="overflow-hidden rounded-lg border border-[var(--rule)] bg-[var(--surface-alt)] [&_img]:h-auto [&_img]:w-full">
          <PhotoImage
            alt={photo.alt}
            height={photo.height}
            loading="eager"
            src={photo.imageUrl}
            width={photo.width}
          />
        </div>
        <aside className="sticky top-6 grid gap-4 max-[860px]:static">
          <Link className="inline-flex max-w-full min-w-0 text-sm font-bold leading-[1.35] text-[var(--accent)] [overflow-wrap:anywhere]" href="/photos">
            Back to field notes
          </Link>
          <p className="mb-0 font-mono text-[13px] font-[750] text-[var(--accent)]">{photo.category ?? "照片"}</p>
          <h1 className="m-0 max-w-[820px] break-words font-serif text-[42px] font-[650] leading-[1.08] [text-wrap:balance] max-[720px]:text-[34px]">
            {photo.title}
          </h1>
          {photo.description ? <p className="m-0 max-w-[min(740px,100%)] text-lg leading-[1.78] text-[var(--muted)] [overflow-wrap:anywhere] max-[720px]:text-[17px]">{photo.description}</p> : null}
          <dl className="m-0 grid gap-3 border-y border-[var(--rule)] py-4">
            <div className="grid gap-1">
              <dt className="text-xs font-[750] uppercase text-[var(--soft)]">Recorded</dt>
              <dd className="m-0 leading-[1.55] text-[var(--muted)]">{formatPublishedAt(photo.takenAt)}</dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-xs font-[750] uppercase text-[var(--soft)]">Alt note</dt>
              <dd className="m-0 leading-[1.55] text-[var(--muted)]">{photo.alt}</dd>
            </div>
          </dl>
          {photo.tags.length > 0 ? (
            <div className="mt-0.5 flex min-w-0 flex-wrap gap-2" aria-label="Photo tags">
              {photo.tags.map((tag) => (
                <Link
                  className="inline-flex min-h-[30px] max-w-full items-center rounded-full border border-[var(--tag-border)] bg-[var(--tag-bg)] px-2.5 py-1 text-[13px] leading-[1.35] text-[var(--tag-ink)] break-words"
                  href={`/photos?tag=${encodeURIComponent(tag)}`}
                  key={tag}
                >
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
