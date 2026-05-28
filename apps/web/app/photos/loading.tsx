export default function PhotosLoading() {
  return (
    <main id="main-content">
      <section className="grid max-w-[min(760px,100%)] gap-2.5 py-[58px] pb-[34px] max-[720px]:pt-10">
        <p className="mb-0 font-mono text-[13px] font-[750] text-[var(--accent)]">相册加载中</p>
        <h1 className="mb-4 max-w-[820px] break-words font-serif text-[56px] font-[650] leading-[1.08] [text-wrap:balance] max-[720px]:text-[32px] max-[720px]:leading-[1.12]">
          正在整理照片墙
        </h1>
        <p className="m-0 max-w-[min(740px,100%)] text-lg leading-[1.78] text-[var(--muted)] [overflow-wrap:anywhere] max-[720px]:text-[17px]">正在准备照片条目和筛选条件。</p>
      </section>
      <div className="columns-[300px] gap-[18px] max-[860px]:columns-[260px] max-[720px]:columns-1" aria-label="照片加载中">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="mb-[18px] animate-[photo-loading_1.2s_linear_infinite] rounded-lg border border-[var(--rule)] bg-[linear-gradient(90deg,transparent,var(--surface-raised),transparent),var(--surface-alt)] bg-[length:220%_100%]"
            key={index}
            style={{ aspectRatio: index % 2 ? "4 / 5" : "3 / 2" }}
          />
        ))}
      </div>
    </main>
  );
}
