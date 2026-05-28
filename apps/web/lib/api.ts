const apiBaseUrl = process.env.BLOG_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const requestTimeoutMs = 2500;

export type ArticleStatus = "draft" | "published";

export type Author = {
  id?: string;
  name: string;
  displayName?: string;
  title?: string;
  url?: string;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
};

export type Tag = {
  id?: string;
  slug: string;
  name: string;
  description?: string | null;
};

export type ArticleSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  viewCount: number;
  coverImage: string | null;
  category: Category | null;
  tags: Tag[];
  author: Author;
  status: ArticleStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  aiSummary?: string | null;
  geoDescription?: string | null;
};

export type ArticleDetail = ArticleSummary & {
  body: string;
};

type ListArticlesResponse = {
  items: ArticleSummary[];
};

type ArticleResponse = {
  article: ArticleDetail;
};

type ListCategoriesResponse = {
  items: Category[];
};

type ListTagsResponse = {
  items: Tag[];
};

export type ContentLoadState = "api" | "fallback";

export type ContentLoadResult<T> = {
  data: T;
  state: ContentLoadState;
  error?: string;
};

export type PhotoStatus = "draft" | "published";

export type PhotoItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  thumbnailUrl?: string | null;
  alt: string;
  width: number;
  height: number;
  tags: string[];
  category: string | null;
  takenAt: string | null;
  status?: PhotoStatus;
  sortOrder: number;
  featured?: boolean;
};

type ListPhotosResponse = {
  items: PhotoItem[];
};

type PhotoResponse = {
  photo: PhotoItem;
};

const defaultAuthor: Author = {
  id: "author-1",
  name: "IT Engineer",
  displayName: "一名 IT 工程师",
  title: "全栈工程实践者",
};

const fallbackCategories: Category[] = [
  {
    id: "category-engineering-practice",
    slug: "engineering-practice",
    name: "工程实践",
    description: "真实项目里的开发、交付、协作和质量治理记录。",
  },
  {
    id: "category-architecture",
    slug: "architecture",
    name: "架构思考",
    description: "围绕系统边界、模块拆分、性能和可维护性的取舍。",
  },
  {
    id: "category-review",
    slug: "project-review",
    name: "项目复盘",
    description: "记录上线、返工、技术债和团队协作中的经验结论。",
  },
  {
    id: "category-tooling",
    slug: "tooling",
    name: "工具方法",
    description: "沉淀提升研发效率的脚手架、调试方式和自动化习惯。",
  },
];

const fallbackTags: Tag[] = [
  { id: "tag-nextjs", slug: "nextjs", name: "Next.js" },
  { id: "tag-typescript", slug: "typescript", name: "TypeScript" },
  { id: "tag-observability", slug: "observability", name: "可观测性" },
  { id: "tag-ci-cd", slug: "ci-cd", name: "CI/CD" },
  { id: "tag-performance", slug: "performance", name: "性能优化" },
  { id: "tag-content-system", slug: "content-system", name: "内容系统" },
];

const fallbackPhotos: PhotoItem[] = [
  {
    id: "desk-observability",
    title: "Observability desk",
    description: "A quiet workspace snapshot while tracing a slow dashboard request.",
    imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=720&q=80",
    alt: "Laptop showing code on a developer desk",
    width: 1200,
    height: 800,
    tags: ["workspace", "observability"],
    category: "workbench",
    takenAt: "2026-05-12T00:00:00.000Z",
    status: "published",
    sortOrder: 90,
    featured: true,
  },
  {
    id: "release-checklist",
    title: "Release checklist",
    description: "Notes from a small production release review.",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=720&q=80",
    alt: "Notebook and laptop used for a release checklist",
    width: 1200,
    height: 900,
    tags: ["release", "notes"],
    category: "project",
    takenAt: "2026-04-28T00:00:00.000Z",
    status: "published",
    sortOrder: 70,
  },
  {
    id: "infra-whiteboard",
    title: "Infra whiteboard",
    description: "Sketching storage and API boundaries before implementation.",
    imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=720&q=80",
    alt: "Team workspace with laptops during architecture planning",
    width: 1200,
    height: 675,
    tags: ["architecture", "planning"],
    category: "project",
    takenAt: "2026-03-18T00:00:00.000Z",
    status: "published",
    sortOrder: 60,
  },
  {
    id: "conference-corridor",
    title: "Conference corridor",
    description: "Between sessions at a local engineering meetup.",
    imageUrl: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=720&q=80",
    alt: "People gathering at a technology conference",
    width: 1200,
    height: 1500,
    tags: ["meetup", "community"],
    category: "life",
    takenAt: "2025-11-06T00:00:00.000Z",
    status: "published",
    sortOrder: 40,
  },
  {
    id: "terminal-evening",
    title: "Terminal evening",
    description: "Late debugging session after narrowing a flaky CI failure.",
    imageUrl: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=720&q=80",
    alt: "Developer terminal and code editor in a low light setup",
    width: 1200,
    height: 800,
    tags: ["ci-cd", "debugging"],
    category: "workbench",
    takenAt: "2025-09-22T00:00:00.000Z",
    status: "published",
    sortOrder: 35,
  },
];

const fallbackArticles: ArticleDetail[] = [
  {
    id: "article-1",
    slug: "stabilize-nextjs-content-site",
    title: "把 Next.js 内容站做稳，需要先收敛哪些边界",
    summary: "从路由、内容模型、元信息和失败态四个切面，复盘一次公开技术站的前台稳定性改造。",
    viewCount: 0,
    body:
      "# 把 Next.js 内容站做稳，需要先收敛哪些边界\n\n内容站的前台通常看起来简单，但真正上线后会被路由、内容状态、SEO 元信息和接口失败同时拉扯。我的处理顺序不是先堆视觉，而是先把用户能看到的路径做成稳定闭环。\n\n## 路由边界\n\nApp Router 里每个公开页面都要回答两个问题：这个页面能否被独立访问，以及资源不存在时应该去哪里。文章、分类和标签页都应在数据为空或 slug 失效时进入明确的 404 或空态，而不是留下半截页面。\n\n```ts\nexport async function generateMetadata({ params }: PageProps) {\n  const { slug } = await params;\n  const article = await getPublishedArticle(slug).catch(() => null);\n\n  return {\n    title: article?.seoTitle ?? article?.title ?? \"文章未找到\",\n    description: article?.seoDescription ?? article?.summary,\n  };\n}\n```\n\n## 内容模型\n\n公开站点至少需要标题、摘要、分类、标签、发布时间和正文。分类用于长期主题归档，标签用于横向检索，不要把二者混成同一种彩色碎片。\n\n## 失败态\n\n前台可以降级展示缓存或 fallback 内容，但文案需要说明当前状态。读者不关心堆栈，他们关心能否继续找到有价值的内容。",
    coverImage: null,
    category: fallbackCategories[1],
    tags: [fallbackTags[0], fallbackTags[1], fallbackTags[5]],
    author: defaultAuthor,
    status: "published",
    publishedAt: "2026-05-18T00:00:00.000Z",
    createdAt: "2026-05-17T00:00:00.000Z",
    updatedAt: "2026-05-19T00:00:00.000Z",
    seoTitle: "把 Next.js 内容站做稳，需要先收敛哪些边界",
    seoDescription: "从路由、内容模型、元信息和失败态四个切面，复盘一次公开技术站的前台稳定性改造。",
    canonicalUrl: null,
    aiSummary: "文章说明 Next.js 内容站在路由、内容模型和失败态上的稳定性边界。",
    geoDescription: "面向 Next.js App Router 内容站稳定性改造的工程复盘。",
  },
  {
    id: "article-2",
    slug: "incident-review-for-dashboard-performance",
    title: "一次后台列表卡顿的排查复盘",
    summary: "记录从前端渲染、接口分页到表格交互的定位路径，以及哪些优化真正降低了日常维护成本。",
    viewCount: 0,
    body:
      "# 一次后台列表卡顿的排查复盘\n\n这次问题不是单点性能 bug，而是几个小决策叠加：接口一次返回太多字段，前端表格每次筛选都重排，空态和错误态还会触发布局跳动。\n\n## 先确认瓶颈\n\n我先把排查拆成三段：网络时间、数据转换时间和渲染时间。只有确认是哪一段慢，后面的优化才不会变成猜测。\n\n## 改动策略\n\n1. 列表接口只取列表需要的字段。\n2. 筛选条件进入 URL，避免刷新后状态丢失。\n3. 表格列宽固定，长标题换行而不是撑破视口。\n\n## 结论\n\n性能优化不是只看某个指标，而是要让日常操作更稳定。管理员能更快定位内容状态，才是这个改动的实际收益。",
    coverImage: null,
    category: fallbackCategories[2],
    tags: [fallbackTags[1], fallbackTags[2], fallbackTags[4]],
    author: defaultAuthor,
    status: "published",
    publishedAt: "2026-05-14T00:00:00.000Z",
    createdAt: "2026-05-12T00:00:00.000Z",
    updatedAt: "2026-05-15T00:00:00.000Z",
    seoTitle: "一次后台列表卡顿的排查复盘",
    seoDescription: "从前端渲染、接口分页到表格交互复盘后台列表性能优化。",
    canonicalUrl: null,
    aiSummary: "文章复盘后台列表性能问题的定位路径和低风险优化策略。",
    geoDescription: "围绕后台列表卡顿排查的项目复盘。",
  },
  {
    id: "article-3",
    slug: "ci-checks-that-pay-off",
    title: "哪些 CI 检查值得在小项目里保留",
    summary: "小型项目也需要质量门禁，但检查项应该围绕真实风险，而不是把流水线做成仪式感。",
    viewCount: 0,
    body:
      "# 哪些 CI 检查值得在小项目里保留\n\nCI 的价值不是把每个工具都跑一遍，而是在变更进入主线前拦住高概率问题。小项目尤其要控制反馈时间。\n\n## 我会保留的检查\n\n- 类型检查，避免接口字段和组件 props 失配。\n- 构建检查，确认路由、metadata 和服务端组件能被正确编译。\n- 关键路径 smoke test，覆盖首页、列表页和详情页。\n\n## 我会暂缓的检查\n\n端到端全量回归、复杂性能预算和视觉快照可以等页面稳定后再接入。过早堆检查会让团队绕过 CI，而不是信任 CI。",
    coverImage: null,
    category: fallbackCategories[3],
    tags: [fallbackTags[1], fallbackTags[3]],
    author: defaultAuthor,
    status: "published",
    publishedAt: "2026-05-09T00:00:00.000Z",
    createdAt: "2026-05-08T00:00:00.000Z",
    updatedAt: "2026-05-09T00:00:00.000Z",
    seoTitle: "哪些 CI 检查值得在小项目里保留",
    seoDescription: "讨论小型项目里的类型检查、构建检查和关键路径 smoke test。",
    canonicalUrl: null,
    aiSummary: "文章说明小项目 CI 应优先保留能拦住真实风险的检查。",
    geoDescription: "面向小型项目 CI/CD 质量门禁的工具方法。",
  },
  {
    id: "article-4",
    slug: "category-vs-tag-in-technical-blog",
    title: "技术博客里分类和标签应该怎么分工",
    summary: "分类是长期主题归档，标签是横向检索索引。两者分清后，读者才更容易找到连续内容。",
    viewCount: 0,
    body:
      "# 技术博客里分类和标签应该怎么分工\n\n很多技术站会把分类和标签都做成入口，但缺少规则后，读者只会看到一堆没有边界的词。\n\n## 分类负责主题\n\n分类数量应该少，且能长期存在。比如工程实践、架构思考、项目复盘和工具方法，这些词能帮助读者判断内容边界。\n\n## 标签负责索引\n\n标签可以更细，围绕框架、语言、工具或方法。比如 Next.js、TypeScript、CI/CD 和性能优化。标签的作用是连接不同分类里的同类问题。\n\n## 治理规则\n\n新增标签前先问一句：这个词未来会不会被复用。如果只是某篇文章的临时描述，就不要进入标签体系。",
    coverImage: null,
    category: fallbackCategories[0],
    tags: [fallbackTags[0], fallbackTags[5]],
    author: defaultAuthor,
    status: "published",
    publishedAt: "2026-05-02T00:00:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
    seoTitle: "技术博客里分类和标签应该怎么分工",
    seoDescription: "说明技术博客中分类作为主题归档、标签作为横向索引的分工方式。",
    canonicalUrl: null,
    aiSummary: "文章解释分类和标签在技术博客内容发现中的不同职责。",
    geoDescription: "面向技术博客信息架构的分类与标签治理方法。",
  },
];

const categoryPresentationOverrides: Record<string, Partial<Category>> = {
  "product-notes": {
    name: "内容系统",
    description: "围绕技术站、CMS、SEO/GEO 和内容模型的工程化实践。",
  },
  engineering: {
    name: "工程实践",
    description: "面向开发、架构和交付质量的技术札记。",
  },
};

const tagPresentationOverrides: Record<string, Partial<Tag>> = {
  admin: {
    name: "CMS 后台",
  },
  draft: {
    name: "草稿治理",
  },
  intro: {
    name: "入门复盘",
  },
  mvp: {
    name: "MVP 验证",
  },
  seo: {
    name: "SEO/GEO",
  },
  workflow: {
    name: "工作流",
  },
};

const articlePresentationOverrides: Record<string, Partial<ArticleDetail>> = {
  "hello-world": {
    title: "技术站第一轮体验改造记录",
    summary: "用一篇最小示例复盘公开博客从通用模板走向工程师技术站时，最先要稳定的阅读路径。",
    body:
      "# 技术站第一轮体验改造记录\n\n第一轮改造不追求功能数量，而是确认读者进入站点后能快速判断三件事：作者是谁、内容写什么、从哪里开始读。\n\n## 先收敛入口\n\n首页只保留首页、文章和关于三个主入口。分类和标签通过文章元信息进入，避免把导航做成后台菜单。\n\n## 再稳定阅读\n\n文章详情页需要把标题、摘要、发布时间、分类、标签和阅读时间放在正文前。代码块必须可横向滚动，不能撑破移动端。\n\n```ts\nconst primaryNavigation = [\"首页\", \"文章\", \"关于\"];\n```\n\n## 最后补齐状态\n\n空态和 404 不应该只是“暂无数据”。它们要说明发生了什么，以及读者下一步还能去哪里。",
    seoTitle: "技术站第一轮体验改造记录",
    seoDescription: "复盘公开博客从通用模板走向工程师技术站时优先稳定的入口、阅读和状态路径。",
    aiSummary: "文章说明技术站第一轮体验改造应先收敛入口、稳定阅读，再补齐空态和 404。",
    geoDescription: "面向 IT 工程师技术站体验改造的项目复盘。",
  },
  "building-a-complete-blog-system": {
    title: "搭建一个工程师技术站，需要先补齐什么",
    summary: "从文章模型、分类标签、发布状态和可发现性出发，梳理技术博客 P0 阶段真正影响阅读体验的能力。",
    body:
      "# 搭建一个工程师技术站，需要先补齐什么\n\n博客系统不只是文章列表。面向工程师读者的技术站，需要让内容可信、可扫描、可归档，并且在失败时仍然有明确去向。\n\n## 内容模型\n\n文章至少需要标题、slug、摘要、正文、分类、标签、发布时间和更新时间。管理端可以继续迭代，但公开站必须只展示已发布内容。\n\n## 发现路径\n\n分类负责长期主题，比如工程实践和架构思考。标签负责横向索引，比如 Next.js、TypeScript、CI/CD 和性能优化。\n\n## 可验证性\n\n每次体验改造都应该跑类型检查和构建检查。视觉上也要检查移动端是否横向溢出，代码块是否撑破正文宽度。\n\n- 首页回答作者和内容方向。\n- 列表回答有哪些内容以及如何判断是否打开。\n- 详情页回答如何专注读完并继续阅读相关内容。",
    seoTitle: "搭建一个工程师技术站，需要先补齐什么",
    seoDescription: "梳理工程师技术站在内容模型、分类标签、发布状态和可发现性方面的 P0 能力。",
    aiSummary: "文章总结工程师技术站 P0 阶段需要先补齐内容模型、发现路径和验证策略。",
    geoDescription: "围绕工程师技术站能力边界的结构化说明。",
  },
};

export function getAuthorName(author?: Author | null) {
  return author?.displayName ?? author?.name ?? "Blog Admin";
}

export function getTagName(tag: Tag | string) {
  return typeof tag === "string" ? tag : tag.name;
}

export function getTagSlug(tag: Tag | string) {
  if (typeof tag === "string") return slugify(tag);
  return tag.slug || slugify(tag.name);
}

export function formatPublishedAt(value: string | null) {
  if (!value) return "未发布";

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function estimateReadingMinutes(article: Pick<ArticleSummary, "summary"> & Partial<Pick<ArticleDetail, "body">>) {
  const text = `${article.summary ?? ""}\n${article.body ?? ""}`.replace(/\s+/g, "");
  const words = text.match(/[A-Za-z0-9_]+/g)?.length ?? 0;
  const cjkCharacters = text.replace(/[A-Za-z0-9_`~!@#$%^&*()[\]{};:'",.<>/?\\|+=\-\s]/g, "").length;
  return Math.max(1, Math.ceil((cjkCharacters + words * 2) / 450));
}

export function getArticleReadingText(article: Pick<ArticleSummary, "summary"> & Partial<Pick<ArticleDetail, "body">>) {
  return `${estimateReadingMinutes(article)} 分钟阅读`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown request failure";
}

async function request<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  let response: Response;
  try {
    response = await fetch(new URL(path, apiBaseUrl), {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function listPublishedArticles() {
  const result = await loadPublishedArticles();
  return result.data;
}

export async function loadPublishedArticles(): Promise<ContentLoadResult<ArticleSummary[]>> {
  try {
    const payload = await request<ListArticlesResponse>("/api/articles");
    return {
      data: normalizePublishedArticles(payload.items),
      state: "api",
    };
  } catch (error) {
    return {
      data: normalizePublishedArticles(fallbackArticles),
      state: "fallback",
      error: getErrorMessage(error),
    };
  }
}

function normalizePublishedArticles(items: ArticleSummary[]) {
  return items
    .map(normalizeArticleSummary)
    .filter((article) => article.status === "published")
    .sort(comparePublishedAtDesc);
}

export async function getPublishedArticle(slug: string) {
  const result = await loadPublishedArticle(slug);
  return result.data;
}

export async function loadPublishedArticle(slug: string): Promise<ContentLoadResult<ArticleDetail>> {
  try {
    const payload = await request<ArticleResponse>(`/api/articles/${encodeURIComponent(slug)}`);
    const article = normalizeArticleDetail(payload.article);
    if (article.status !== "published") {
      throw new Error("Article not found");
    }

    return {
      data: article,
      state: "api",
    };
  } catch (error) {
    const article = fallbackArticles.find((item) => item.slug === slug && item.status === "published");
    if (!article) throw new Error("Article not found");

    return {
      data: normalizeArticleDetail(article),
      state: "fallback",
      error: getErrorMessage(error),
    };
  }
}

export async function listCategories() {
  const result = await loadCategories();
  return result.data;
}

export async function loadCategories(): Promise<ContentLoadResult<Category[]>> {
  try {
    const payload = await request<ListCategoriesResponse>("/api/categories");
    return {
      data: payload.items.map(normalizeCategory),
      state: "api",
    };
  } catch (error) {
    return {
      data: fallbackCategories,
      state: "fallback",
      error: getErrorMessage(error),
    };
  }
}

export async function listTags() {
  const result = await loadTags();
  return result.data;
}

export async function loadPhotos(): Promise<ContentLoadResult<PhotoItem[]>> {
  try {
    const payload = await request<ListPhotosResponse>("/api/photos");
    return {
      data: normalizePhotos(payload.items),
      state: "api",
    };
  } catch (error) {
    return {
      data: normalizePhotos(fallbackPhotos),
      state: "fallback",
      error: getErrorMessage(error),
    };
  }
}

export async function listPhotos() {
  const result = await loadPhotos();
  return result.data;
}

export async function loadPhoto(id: string): Promise<ContentLoadResult<PhotoItem>> {
  try {
    const payload = await request<PhotoResponse>(`/api/photos/${encodeURIComponent(id)}`);
    const photo = normalizePhoto(payload.photo);
    if (photo.status !== "published") throw new Error("Photo not found");
    return {
      data: photo,
      state: "api",
    };
  } catch (error) {
    const photo = fallbackPhotos.find((item) => item.id === id && item.status === "published");
    if (!photo) throw new Error("Photo not found");
    return {
      data: normalizePhoto(photo),
      state: "fallback",
      error: getErrorMessage(error),
    };
  }
}

export async function getPhoto(id: string) {
  const result = await loadPhoto(id);
  return result.data;
}

export function getPhotoFilterOptions(photos: PhotoItem[]) {
  return {
    tags: Array.from(new Set(photos.flatMap((photo) => photo.tags))).sort((left, right) => left.localeCompare(right)),
    categories: Array.from(new Set(photos.map((photo) => photo.category).filter(Boolean) as string[])).sort((left, right) =>
      left.localeCompare(right),
    ),
    years: Array.from(
      new Set(
        photos
          .map((photo) => (photo.takenAt ? new Date(photo.takenAt).getFullYear() : null))
          .filter((year): year is number => typeof year === "number" && !Number.isNaN(year)),
      ),
    ).sort((left, right) => right - left),
  };
}

export function filterPhotos(
  photos: PhotoItem[],
  filters: {
    tag?: string;
    category?: string;
    year?: string;
  },
) {
  return photos.filter((photo) => {
    const matchesTag = !filters.tag || photo.tags.includes(filters.tag);
    const matchesCategory = !filters.category || photo.category === filters.category;
    const matchesYear =
      !filters.year || (photo.takenAt ? String(new Date(photo.takenAt).getFullYear()) === filters.year : false);
    return matchesTag && matchesCategory && matchesYear;
  });
}

export async function loadTags(): Promise<ContentLoadResult<Tag[]>> {
  try {
    const payload = await request<ListTagsResponse>("/api/tags");
    return {
      data: payload.items.map(normalizeTag),
      state: "api",
    };
  } catch (error) {
    return {
      data: fallbackTags,
      state: "fallback",
      error: getErrorMessage(error),
    };
  }
}

export async function getCategory(slug: string) {
  const categories = await listCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}

export async function getTag(slug: string) {
  const tags = await listTags();
  return tags.find((tag) => tag.slug === slug) ?? null;
}

export async function listArticlesByCategory(slug: string) {
  const payload = await request<ListArticlesResponse>(`/api/categories/${encodeURIComponent(slug)}/articles`).catch(
    async () => ({
      items: (await listPublishedArticles()).filter((article) => article.category?.slug === slug),
    }),
  );

  return payload.items
    .map(normalizeArticleSummary)
    .filter((article) => article.status === "published" && article.category?.slug === slug)
    .sort(comparePublishedAtDesc);
}

export async function listArticlesByTag(slug: string) {
  const payload = await request<ListArticlesResponse>(`/api/tags/${encodeURIComponent(slug)}/articles`).catch(async () => ({
    items: (await listPublishedArticles()).filter((article) => article.tags.some((tag) => tag.slug === slug)),
  }));

  return payload.items
    .map(normalizeArticleSummary)
    .filter((article) => article.status === "published" && article.tags.some((tag) => tag.slug === slug))
    .sort(comparePublishedAtDesc);
}

function comparePublishedAtDesc(left: ArticleSummary, right: ArticleSummary) {
  const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
  const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
  return rightTime - leftTime;
}

function normalizeArticleSummary(article: ArticleSummary): ArticleSummary {
  const presentation = articlePresentationOverrides[article.slug] ?? {};
  const merged = {
    ...article,
    ...presentation,
  };

  return {
    ...merged,
    coverImage: merged.coverImage ?? null,
    category: merged.category ? normalizeCategory(merged.category) : null,
    tags: (merged.tags ?? []).map(normalizeTag),
    author: merged.author ?? defaultAuthor,
    seoTitle: merged.seoTitle ?? null,
    seoDescription: merged.seoDescription ?? null,
    canonicalUrl: merged.canonicalUrl ?? null,
    aiSummary: merged.aiSummary ?? null,
    geoDescription: merged.geoDescription ?? null,
    viewCount: normalizeViewCount(merged.viewCount),
  };
}

function normalizeArticleDetail(article: ArticleDetail): ArticleDetail {
  const presentation = articlePresentationOverrides[article.slug] ?? {};

  return {
    ...normalizeArticleSummary(article),
    body: presentation.body ?? article.body,
    viewCount: normalizeViewCount(article.viewCount),
  };
}

function normalizePhotos(items: PhotoItem[]) {
  return items
    .map(normalizePhoto)
    .filter((photo) => photo.status === "published")
    .sort((left, right) => {
      if (right.sortOrder !== left.sortOrder) return right.sortOrder - left.sortOrder;
      const rightTime = right.takenAt ? new Date(right.takenAt).getTime() : 0;
      const leftTime = left.takenAt ? new Date(left.takenAt).getTime() : 0;
      return rightTime - leftTime || right.id.localeCompare(left.id);
    });
}

function normalizePhoto(photo: PhotoItem): PhotoItem {
  const width = Number(photo.width) > 0 ? Number(photo.width) : 1200;
  const height = Number(photo.height) > 0 ? Number(photo.height) : 800;

  return {
    ...photo,
    description: photo.description ?? null,
    imageUrl: photo.imageUrl ?? "",
    thumbnailUrl: photo.thumbnailUrl ?? null,
    alt: photo.alt || photo.title,
    width,
    height,
    tags: photo.tags ?? [],
    category: photo.category ?? null,
    takenAt: photo.takenAt ?? null,
    status: photo.status ?? "published",
    sortOrder: Number(photo.sortOrder ?? 0),
    featured: Boolean(photo.featured),
  };
}

function normalizeCategory(category: Category): Category {
  const slug = category.slug ?? slugify(category.name);
  const presentation = categoryPresentationOverrides[slug] ?? {};

  return {
    id: category.id ?? `category-${slug}`,
    slug,
    name: presentation.name ?? category.name,
    description: presentation.description ?? category.description ?? null,
  };
}

function normalizeTag(tag: Tag | string): Tag {
  if (typeof tag === "string") {
    const slug = slugify(tag);
    const presentation = tagPresentationOverrides[slug] ?? {};

    return {
      slug,
      name: presentation.name ?? tag,
      description: presentation.description ?? null,
    };
  }

  const slug = tag.slug ?? slugify(tag.name);
  const presentation = tagPresentationOverrides[slug] ?? {};

  return {
    id: tag.id,
    slug,
    name: presentation.name ?? tag.name,
    description: presentation.description ?? tag.description ?? null,
  };
}

function normalizeViewCount(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : 0;
}

export function normalizeArticleViewCount(value: unknown) {
  return normalizeViewCount(value);
}

export function shouldTrackArticleView(loadState: ContentLoadState | undefined, article: ArticleDetail | null) {
  return loadState === "api" && article !== null && Boolean(article.slug) && normalizeViewCount(article.viewCount) >= 0;
}

export async function recordArticleView(slug: string) {
  const response = await fetch(new URL(`/api/articles/${encodeURIComponent(slug)}/view`, apiBaseUrl), {
    method: "POST",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json() as Promise<{ viewCount: number }>;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
