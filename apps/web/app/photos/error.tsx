"use client";

import { ErrorState } from "../../components/states/ErrorState";

export default function PhotosError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main-content">
      <ErrorState
        eyebrow="照片页错误"
        title="相册暂时无法加载"
        description="照片服务暂时不可用。你可以重试，或者先回到文章页继续浏览。"
        primaryLabel="重试"
        secondaryHref="/articles"
        secondaryLabel="回到文章归档"
      />
      <button
        className="mt-3.5 inline-flex min-h-10 cursor-pointer items-center rounded-md border border-[rgb(23_107_91_/_0.28)] bg-[var(--accent)] px-3.5 font-[inherit] font-[750] text-[var(--button-ink)]"
        type="button"
        onClick={reset}
      >
        重试相册
      </button>
    </main>
  );
}
