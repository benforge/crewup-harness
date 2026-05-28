import Link from "next/link";
import type { PhotoItem } from "../../lib/api";
import { formatPublishedAt } from "../../lib/api";
import { PhotoImage } from "./PhotoImage";

type PhotoMasonryGridProps = {
  photos: PhotoItem[];
};

export function PhotoMasonryGrid({ photos }: PhotoMasonryGridProps) {
  return (
    <div className="w-full max-w-full columns-[300px] gap-[18px] max-[860px]:columns-[260px] max-[720px]:columns-1" id="photo-wall-grid" aria-label="照片墙">
      {photos.map((photo, index) => (
        <Link
          className="mb-[18px] grid w-full min-w-0 max-w-full break-inside-avoid gap-2.5 text-[var(--ink)] [&:hover_img]:scale-[1.025]"
          href={`/photos/${photo.id}`}
          key={photo.id}
        >
          <span
            className="block w-full min-w-0 overflow-hidden rounded-lg border border-[var(--rule)] bg-[var(--surface-alt)] [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_img]:transition-transform [&_img]:duration-200 [&_img]:ease-[var(--ease-quiet)]"
            style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
          >
            <PhotoImage
              alt={photo.alt}
              height={photo.height}
              loading={index < 4 ? "eager" : "lazy"}
              src={photo.thumbnailUrl ?? photo.imageUrl}
              width={photo.width}
            />
          </span>
          <span className="grid gap-[3px] pb-1.5">
            <strong className="break-words">{photo.title}</strong>
            <span className="break-words text-[13px] text-[var(--muted)]">
              {photo.category ?? "照片"} / {formatPublishedAt(photo.takenAt)}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
