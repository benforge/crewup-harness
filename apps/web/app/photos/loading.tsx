export default function PhotosLoading() {
  return (
    <main id="main-content">
      <section className="page-heading compact">
        <p className="eyebrow">相册加载中</p>
        <h1>正在整理照片墙</h1>
        <p className="lede">正在准备照片条目和筛选条件。</p>
      </section>
      <div className="photo-masonry" aria-label="照片加载中">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="photo-skeleton" key={index} style={{ aspectRatio: index % 2 ? "4 / 5" : "3 / 2" }} />
        ))}
      </div>
    </main>
  );
}
