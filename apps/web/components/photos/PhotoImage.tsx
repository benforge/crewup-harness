"use client";

import { useState } from "react";

type PhotoImageProps = {
  alt: string;
  decoding?: "async" | "auto" | "sync";
  height: number;
  loading?: "eager" | "lazy";
  src: string | null | undefined;
  width: number;
};

export function PhotoImage({ alt, decoding = "async", height, loading = "lazy", src, width }: PhotoImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className="grid h-full min-h-[180px] w-full place-items-center bg-[linear-gradient(135deg,rgb(23_107_91_/_0.08),transparent_42%),var(--surface-alt)] p-[18px] text-center text-[13px] font-bold text-[var(--muted)]"
        role="img"
        aria-label={alt}
      >
        <span>图片不可用</span>
      </span>
    );
  }

  return (
    <img
      alt={alt}
      decoding={decoding}
      height={height}
      loading={loading}
      src={src}
      width={width}
      onError={() => setFailed(true)}
    />
  );
}
