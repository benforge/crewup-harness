import Link from "next/link";
import type { PhotoItem } from "../../lib/api";
import { formatPublishedAt } from "../../lib/api";
import { PhotoImage } from "./PhotoImage";

type PhotoMasonryGridProps = {
  photos: PhotoItem[];
};

export function PhotoMasonryGrid({ photos }: PhotoMasonryGridProps) {
  return (
    <div className="photo-masonry" id="photo-wall-grid" aria-label="照片墙">
      {photos.map((photo, index) => (
        <Link className="photo-card" href={`/photos/${photo.id}`} key={photo.id}>
          <span className="photo-image-frame" style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
            <PhotoImage
              alt={photo.alt}
              height={photo.height}
              loading={index < 4 ? "eager" : "lazy"}
              src={photo.thumbnailUrl ?? photo.imageUrl}
              width={photo.width}
            />
          </span>
          <span className="photo-card-copy">
            <strong>{photo.title}</strong>
            <span>
              {photo.category ?? "照片"} / {formatPublishedAt(photo.takenAt)}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
