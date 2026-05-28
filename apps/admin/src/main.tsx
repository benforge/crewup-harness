import { StrictMode, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  Alert,
  App as AntApp,
  Badge,
  Breadcrumb,
  Button,
  Card,
  ConfigProvider,
  Empty,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Result,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  Upload,
  theme,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import "antd/dist/reset.css";
import "./styles.css";

const { Content, Header, Sider } = Layout;
const { Paragraph, Text, Title } = Typography;

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
const sessionKey = "blog-admin-token";

type ArticleStatus = "draft" | "published";
type PhotoStatus = "draft" | "published" | "hidden";

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type TagModel = {
  id: string;
  slug: string;
  name: string;
};

type ArticleSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body?: string;
  viewCount: number;
  coverImage: string | null;
  category: Category | null;
  tags: TagModel[];
  status: ArticleStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  aiSummary: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

type PhotoRecord = {
  id: string;
  title: string;
  description: string | null;
  mediaAssetId?: string;
  thumbnailAssetId?: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  alt: string;
  category: string | null;
  tags: string[];
  status: PhotoStatus;
  sortOrder: number;
  featured: boolean;
  takenAt: string | null;
  updatedAt: string;
};

type MediaAssetRecord = {
  id: string;
  originalUrl: string | null;
  width: number | null;
  height: number | null;
};

type AdminPhotoRecord = Omit<PhotoRecord, "imageUrl" | "thumbnailUrl" | "category"> & {
  imageUrl?: string;
  thumbnailUrl?: string | null;
  category?: string | null;
  mediaAssetId: string;
  thumbnailAssetId: string | null;
  categorySlug: string | null;
  mediaAsset: MediaAssetRecord | null;
  thumbnailAsset: MediaAssetRecord | null;
};

type LoginState = {
  token: string;
  displayName: string;
};

type ArticleFormState = {
  slug: string;
  title: string;
  summary: string;
  body: string;
  coverImage: string;
  categoryId: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  aiSummary: string;
};

type PhotoFormState = {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  alt: string;
  category: string;
  tags: string;
  status: PhotoStatus;
  sortOrder: number;
  featured: boolean;
  takenAt: string;
};

type TaxonomyFormState = {
  id?: string;
  slug: string;
  name: string;
  description?: string;
};

type ArticleFilters = {
  status: "all" | ArticleStatus;
  categoryId: "all" | string;
  query: string;
};

type PhotoFilters = {
  status: "all" | PhotoStatus;
  query: string;
};

type Route =
  | { name: "login"; returnTo: string }
  | { name: "dashboard" }
  | { name: "articles" }
  | { name: "photos" }
  | { name: "article-new" }
  | { name: "article-edit"; id: string }
  | { name: "categories" }
  | { name: "tags" }
  | { name: "not-found"; path: string };

type RouteMeta = {
  title: string;
  description: string;
  menuKey?: string;
  breadcrumbs: string[];
};

type FieldErrors = Partial<Record<keyof ArticleFormState, string>>;

class RequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RequestError";
    this.status = status;
  }
}

const initialArticleForm: ArticleFormState = {
  slug: "",
  title: "",
  summary: "",
  body: "",
  coverImage: "",
  categoryId: "",
  tags: "",
  seoTitle: "",
  seoDescription: "",
  canonicalUrl: "",
  aiSummary: "",
};

const initialPhotoForm: PhotoFormState = {
  title: "",
  description: "",
  imageUrl: "",
  thumbnailUrl: "",
  alt: "",
  category: "",
  tags: "",
  status: "draft",
  sortOrder: 0,
  featured: false,
  takenAt: "",
};

const fallbackAdminPhotos: PhotoRecord[] = [
  {
    id: "mock-desk-observability",
    title: "Observability desk",
    description: "Mock entry used until the photo API is available.",
    imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
    thumbnailUrl: null,
    alt: "Laptop showing code on a developer desk",
    category: "workbench",
    tags: ["workspace", "observability"],
    status: "published",
    sortOrder: 90,
    featured: true,
    takenAt: "2026-05-12",
    updatedAt: "2026-05-21T00:00:00.000Z",
  },
];

const initialCategoryForm: TaxonomyFormState = {
  slug: "",
  name: "",
  description: "",
};

const initialTagForm: TaxonomyFormState = {
  slug: "",
  name: "",
};

const routeMeta: Record<Exclude<Route["name"], "login" | "article-edit" | "not-found">, RouteMeta> = {
  dashboard: {
    title: "Workspace",
    description: "A focused CMS control room for drafting, organizing, and publishing engineering content.",
    menuKey: "dashboard",
    breadcrumbs: ["Workspace"],
  },
  articles: {
    title: "Articles",
    description: "Review content status, filter the archive, and continue editorial work with clear ownership.",
    menuKey: "articles",
    breadcrumbs: ["Content", "Articles"],
  },
  photos: {
    title: "Photos",
    description: "Register image sources, metadata, status, and ordering for the public photo wall.",
    menuKey: "photos",
    breadcrumbs: ["Content", "Photos"],
  },
  "article-new": {
    title: "New article",
    description: "Create a draft with the required publishing metadata before it reaches the public site.",
    menuKey: "articles",
    breadcrumbs: ["Content", "Articles", "New"],
  },
  categories: {
    title: "Categories",
    description: "Maintain long-lived topic archives used by the public blog navigation.",
    menuKey: "categories",
    breadcrumbs: ["Content taxonomy", "Categories"],
  },
  tags: {
    title: "Tags",
    description: "Maintain cross-cutting engineering indexes for frameworks, tools, methods, and concepts.",
    menuKey: "tags",
    breadcrumbs: ["Content taxonomy", "Tags"],
  },
};

function AdminApp() {
  const { message, modal, notification } = AntApp.useApp();
  const [route, setRoute] = useState<Route>(() => parseRoute());
  const [session, setSession] = useState<LoginState | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionNotice, setSessionNotice] = useState("Sign in to manage the protected CMS workspace.");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<TagModel[]>([]);
  const [articleFilters, setArticleFilters] = useState<ArticleFilters>({
    status: "all",
    categoryId: "all",
    query: "",
  });
  const [photoFilters, setPhotoFilters] = useState<PhotoFilters>({
    status: "all",
    query: "",
  });
  const [articleForm, setArticleForm] = useState<ArticleFormState>(initialArticleForm);
  const [photoForm, setPhotoForm] = useState<PhotoFormState>(initialPhotoForm);
  const [photoFormOpen, setPhotoFormOpen] = useState(false);
  const [articleFormErrors, setArticleFormErrors] = useState<FieldErrors>({});
  const [categoryForm, setCategoryForm] = useState<TaxonomyFormState>(initialCategoryForm);
  const [tagForm, setTagForm] = useState<TaxonomyFormState>(initialTagForm);
  const [busy, setBusy] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [photoWorkspaceReadOnly, setPhotoWorkspaceReadOnly] = useState(false);

  const selectedArticle =
    route.name === "article-edit" ? articles.find((article) => article.id === route.id) ?? null : null;

  const filteredArticles = useMemo(() => {
    const query = articleFilters.query.trim().toLowerCase();

    return articles.filter((article) => {
      const matchesStatus = articleFilters.status === "all" || article.status === articleFilters.status;
      const matchesCategory = articleFilters.categoryId === "all" || article.category?.id === articleFilters.categoryId;
      const matchesQuery =
        !query ||
        article.title.toLowerCase().includes(query) ||
        article.slug.toLowerCase().includes(query) ||
        article.summary.toLowerCase().includes(query);

      return matchesStatus && matchesCategory && matchesQuery;
    });
  }, [articleFilters, articles]);

  const filteredPhotos = useMemo(() => {
    const query = photoFilters.query.trim().toLowerCase();
    return photos.filter((photo) => {
      const matchesStatus = photoFilters.status === "all" || photo.status === photoFilters.status;
      const matchesQuery =
        !query ||
        photo.title.toLowerCase().includes(query) ||
        photo.alt.toLowerCase().includes(query) ||
        photo.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [photoFilters, photos]);

  useEffect(() => {
    const syncRoute = () => setRoute(parseRoute());
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    void verifyStoredSession();
  }, []);

  useEffect(() => {
    if (checkingSession) return;

    if (!session && route.name !== "login") {
      navigate(`/login?returnTo=${encodeURIComponent(currentProtectedPath())}`, true);
      return;
    }

    if (session && route.name === "login") {
      navigate(route.returnTo, true);
    }
  }, [checkingSession, route, session]);

  useEffect(() => {
    if (session) {
      void loadWorkspace(session.token);
    }
  }, [session]);

  useEffect(() => {
    if (route.name === "article-new") {
      setArticleForm({
        ...initialArticleForm,
        slug: suggestSlug(),
        title: "",
        summary: "",
        body: "",
        tags: "",
      });
      setArticleFormErrors({});
      return;
    }

    if (selectedArticle) {
      setArticleForm(articleToForm(selectedArticle));
      setArticleFormErrors({});
    }
  }, [route.name, selectedArticle?.id]);

  async function verifyStoredSession() {
    const token = sessionStorage.getItem(sessionKey);
    if (!token) {
      setCheckingSession(false);
      return;
    }

    try {
      const payload = await request<{ admin: { displayName?: string; name?: string } }>("/api/admin/me", {
        headers: authHeaders(token),
      });
      setSession({ token, displayName: payload.admin.displayName ?? payload.admin.name ?? "Admin" });
      setSessionNotice("Session restored. You are working in the protected admin area.");
    } catch {
      sessionStorage.removeItem(sessionKey);
      setSession(null);
      setSessionNotice("Your session expired. Sign in again to continue editing.");
    } finally {
      setCheckingSession(false);
    }
  }

  async function loadWorkspace(token: string) {
    setWorkspaceLoading(true);
    setWorkspaceError(null);
    setPhotoWorkspaceReadOnly(false);
    try {
      const [articlePayload, categoryPayload, tagPayload, photoPayload] = await Promise.all([
        request<{ items: ArticleSummary[] }>("/api/admin/articles", { headers: authHeaders(token) }),
        request<{ items: Category[] }>("/api/admin/categories", { headers: authHeaders(token) }),
        request<{ items: TagModel[] }>("/api/admin/tags", { headers: authHeaders(token) }),
        request<{ items: AdminPhotoRecord[] }>("/api/admin/photos", { headers: authHeaders(token) })
          .then((payload) => ({ ...payload, readOnly: false, error: null as string | null }))
          .catch((error) => ({
            items: fallbackAdminPhotos,
            readOnly: true,
            error: readableError(error, "Photo API is not available."),
          })),
      ]);
      setArticles(articlePayload.items);
      setCategories(categoryPayload.items);
      setTags(tagPayload.items);
      setPhotos(photoPayload.items.map(normalizeAdminPhoto));
      setPhotoWorkspaceReadOnly(photoPayload.readOnly);
      if (photoPayload.readOnly) {
        setWorkspaceError(
          `Photo API unavailable: ${photoPayload.error}. Showing read-only fallback photos; photo changes cannot be saved until the API is reachable.`,
        );
      }
    } catch (error) {
      const detail = readableError(error, "Workspace data could not be loaded.");
      setWorkspaceError(detail);
      handleRequestError(error, detail);
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function handleLogin(values: { username: string; password: string }) {
    setBusy(true);
    setLoginError(null);
    setSessionNotice("Checking credentials...");

    try {
      const payload = await request<{ token: string; admin: { displayName?: string; name?: string } }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      sessionStorage.setItem(sessionKey, payload.token);
      setSession({ token: payload.token, displayName: payload.admin.displayName ?? payload.admin.name ?? "Admin" });
      setSessionNotice("Signed in. Loading the workspace...");
      message.success("Signed in successfully.");
      navigate(route.name === "login" ? route.returnTo : "/dashboard", true);
    } catch (error) {
      const detail = readableError(error, "Sign in failed. Check the account and password.");
      setSession(null);
      sessionStorage.removeItem(sessionKey);
      setLoginError(detail);
      setSessionNotice("Sign in failed. Credentials were not accepted.");
      message.error(detail);
    } finally {
      setBusy(false);
    }
  }

  function confirmLogout() {
    modal.confirm({
      title: "Sign out of Admin?",
      content: "You will need to sign in again before editing content.",
      okText: "Sign out",
      cancelText: "Stay signed in",
      okButtonProps: { danger: true },
      onOk: logout,
    });
  }

  function logout() {
    sessionStorage.removeItem(sessionKey);
    setSession(null);
    setArticles([]);
    setPhotos([]);
    setCategories([]);
    setTags([]);
    setSessionNotice("You have signed out.");
    navigate("/login", true);
    message.success("Signed out.");
  }

  async function saveArticle(publishAfterSave: boolean) {
    if (!session) return;

    const errors = validateArticleForm(articleForm);
    setArticleFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      message.error("Resolve the highlighted fields before saving.");
      return;
    }

    setBusy(true);
    try {
      const body = JSON.stringify(articlePayload(articleForm));
      const payload =
        route.name === "article-edit"
          ? await request<{ article: ArticleSummary }>(`/api/admin/articles/${route.id}`, {
              method: "PATCH",
              headers: authHeaders(session.token),
              body,
            })
          : await request<{ article: ArticleSummary }>("/api/admin/articles", {
              method: "POST",
              headers: authHeaders(session.token),
              body,
            });

      let nextArticle = payload.article;
      if (publishAfterSave) {
        const published = await request<{ article: ArticleSummary }>(`/api/admin/articles/${payload.article.id}/publish`, {
          method: "POST",
          headers: authHeaders(session.token),
          body: JSON.stringify({}),
        });
        nextArticle = published.article;
      }

      message.success(publishAfterSave ? "Article saved and published." : "Draft saved.");
      await loadWorkspace(session.token);
      navigate(`/articles/${nextArticle.id}`, true);
    } catch (error) {
      handleRequestError(error, publishAfterSave ? "Save and publish failed." : "Draft save failed.");
    } finally {
      setBusy(false);
    }
  }

  function confirmUnpublish(article: ArticleSummary) {
    modal.confirm({
      title: "Unpublish this article?",
      content: `"${article.title}" will return to draft status and disappear from the public blog.`,
      okText: "Unpublish",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: () => unpublishArticle(article.id),
    });
  }

  async function unpublishArticle(id: string) {
    if (!session) return;
    setBusy(true);
    try {
      await request(`/api/admin/articles/${id}/unpublish`, {
        method: "POST",
        headers: authHeaders(session.token),
        body: JSON.stringify({}),
      });
      message.success("Article unpublished.");
      await loadWorkspace(session.token);
    } catch (error) {
      handleRequestError(error, "Unpublish failed.");
    } finally {
      setBusy(false);
    }
  }

  async function publishExistingArticle(article: ArticleSummary) {
    if (!session) return;
    setBusy(true);
    try {
      await request(`/api/admin/articles/${article.id}/publish`, {
        method: "POST",
        headers: authHeaders(session.token),
        body: JSON.stringify({}),
      });
      message.success("Article published.");
      await loadWorkspace(session.token);
    } catch (error) {
      handleRequestError(error, "Publish failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCategory() {
    if (!session) return;
    setBusy(true);
    try {
      const payload = {
        slug: categoryForm.slug.trim(),
        name: categoryForm.name.trim(),
        description: categoryForm.description?.trim() || null,
      };
      if (categoryForm.id) {
        await request(`/api/admin/categories/${categoryForm.id}`, {
          method: "PATCH",
          headers: authHeaders(session.token),
          body: JSON.stringify(payload),
        });
        message.success("Category updated.");
      } else {
        await request("/api/admin/categories", {
          method: "POST",
          headers: authHeaders(session.token),
          body: JSON.stringify(payload),
        });
        message.success("Category created.");
      }
      setCategoryForm(initialCategoryForm);
      await loadWorkspace(session.token);
    } catch (error) {
      handleRequestError(error, categoryForm.id ? "Category update failed." : "Category creation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTag() {
    if (!session) return;
    setBusy(true);
    try {
      const payload = {
        slug: tagForm.slug.trim(),
        name: tagForm.name.trim(),
      };
      if (tagForm.id) {
        await request(`/api/admin/tags/${tagForm.id}`, {
          method: "PATCH",
          headers: authHeaders(session.token),
          body: JSON.stringify(payload),
        });
        message.success("Tag updated.");
      } else {
        await request("/api/admin/tags", {
          method: "POST",
          headers: authHeaders(session.token),
          body: JSON.stringify(payload),
        });
        message.success("Tag created.");
      }
      setTagForm(initialTagForm);
      await loadWorkspace(session.token);
    } catch (error) {
      handleRequestError(error, tagForm.id ? "Tag update failed." : "Tag creation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function savePhoto() {
    if (!session) return;
    if (photoWorkspaceReadOnly) {
      message.error("Photo API is unavailable. This fallback view is read-only and cannot save changes.");
      return;
    }
    if (!photoForm.title.trim() || !photoForm.imageUrl.trim() || !isValidUrl(photoForm.imageUrl.trim())) {
      message.error("Photo title and a valid image URL are required.");
      return;
    }

    setBusy(true);
    try {
      const payload = photoApiPayload(photoForm);
      const endpoint = photoForm.id ? `/api/admin/photos/${photoForm.id}` : "/api/admin/photos";
      const method = photoForm.id ? "PATCH" : "POST";
      const response = await request<{ photo: AdminPhotoRecord }>(endpoint, {
        method,
        headers: authHeaders(session.token),
        body: JSON.stringify(payload),
      });
      const savedPhoto = normalizeAdminPhoto(response.photo);

      setPhotos((current) => {
        const next = current.filter((photo) => photo.id !== savedPhoto.id);
        return [savedPhoto, ...next].sort((left, right) => right.sortOrder - left.sortOrder);
      });
      setPhotoForm(initialPhotoForm);
      setPhotoFormOpen(false);
      message.success(photoForm.id ? "Photo updated." : "Photo saved.");
    } catch (error) {
      handleRequestError(error, photoForm.id ? "Photo update failed." : "Photo creation failed.");
    } finally {
      setBusy(false);
    }
  }

  function editPhoto(photo: PhotoRecord) {
    setPhotoForm(photoToForm(photo));
    setPhotoFormOpen(true);
  }

  function newPhoto() {
    setPhotoForm(initialPhotoForm);
    setPhotoFormOpen(true);
  }

  async function changePhotoStatus(photo: PhotoRecord, status: PhotoStatus) {
    if (!session) return;
    if (photoWorkspaceReadOnly) {
      message.error("Photo API is unavailable. This fallback view is read-only and cannot change status.");
      return;
    }
    setBusy(true);
    try {
      const response = await request<{ photo: AdminPhotoRecord }>(`/api/admin/photos/${photo.id}/status`, {
        method: "PATCH",
        headers: authHeaders(session.token),
        body: JSON.stringify({ status }),
      });
      const updatedPhoto = normalizeAdminPhoto(response.photo);
      setPhotos((current) => current.map((item) => (item.id === photo.id ? updatedPhoto : item)));
      message.success(`Photo marked ${status}.`);
    } catch (error) {
      handleRequestError(error, "Photo status update failed.");
    } finally {
      setBusy(false);
    }
  }

  function confirmDeleteCategory(category: Category) {
    const referenceCount = countCategoryReferences(category.id, articles);
    if (referenceCount > 0) {
      modal.warning({
        title: "Category is in use",
        content: `${referenceCount} article(s) still reference "${category.name}". Reassign them before deleting this topic archive.`,
      });
      return;
    }

    modal.confirm({
      title: "Delete this category?",
      content: `"${category.name}" will be removed from the CMS taxonomy.`,
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: () => deleteTaxonomy(`/api/admin/categories/${category.id}`, "Category deleted."),
    });
  }

  function confirmDeleteTag(tag: TagModel) {
    const referenceCount = countTagReferences(tag.id, articles);
    if (referenceCount > 0) {
      modal.warning({
        title: "Tag is in use",
        content: `${referenceCount} article(s) still reference "${tag.name}". Remove the tag from those articles before deleting it.`,
      });
      return;
    }

    modal.confirm({
      title: "Delete this tag?",
      content: `"${tag.name}" will be removed from the CMS taxonomy.`,
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: () => deleteTaxonomy(`/api/admin/tags/${tag.id}`, "Tag deleted."),
    });
  }

  async function deleteTaxonomy(path: string, successText: string) {
    if (!session) return;
    setBusy(true);
    try {
      await request(path, {
        method: "DELETE",
        headers: authHeaders(session.token),
      });
      message.success(successText);
      await loadWorkspace(session.token);
    } catch (error) {
      handleRequestError(error, "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleRequestError(error: unknown, fallback: string) {
    const detail = readableError(error, fallback);
    if (error instanceof RequestError && (error.status === 401 || error.status === 403)) {
      sessionStorage.removeItem(sessionKey);
      setSession(null);
      setSessionNotice(
        error.status === 401
          ? "Your session expired. Sign in again to continue."
          : "This account does not have access to the admin workspace.",
      );
      navigate(`/login?returnTo=${encodeURIComponent(currentProtectedPath())}`, true);
      message.warning(error.status === 401 ? "Session expired. Please sign in again." : "Access denied.");
      return;
    }

    notification.error({
      message: fallback,
      description: detail,
      placement: "topRight",
    });
  }

  function navigate(path: string, replace = false) {
    if (replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }
    setRoute(parseRoute());
  }

  if (checkingSession) {
    return <StatusScreen title="Checking session" message="Restoring admin access before loading the workspace." />;
  }

  if (!session || route.name === "login") {
    return (
      <LoginView
        busy={busy}
        error={loginError}
        notice={sessionNotice}
        onNavigate={navigate}
        onSubmit={(values) => void handleLogin(values)}
      />
    );
  }

  const meta = getRouteMeta(route);

  return (
    <AdminLayout
      displayName={session.displayName}
      meta={meta}
      route={route}
      workspaceError={workspaceError}
      onLogout={confirmLogout}
      onNavigate={navigate}
      onRefresh={() => void loadWorkspace(session.token)}
    >
      <Spin spinning={workspaceLoading} tip="Loading workspace data...">
        {route.name === "dashboard" ? (
          <DashboardView articles={articles} categories={categories} photos={photos} tags={tags} onNavigate={navigate} />
        ) : null}
        {route.name === "articles" ? (
          <ArticlesView
            articles={filteredArticles}
            allArticles={articles}
            busy={busy}
            categories={categories}
            filters={articleFilters}
            onFilterChange={setArticleFilters}
            onNavigate={navigate}
            onPublish={publishExistingArticle}
            onUnpublish={confirmUnpublish}
          />
        ) : null}
        {route.name === "article-new" || route.name === "article-edit" ? (
          <ArticleEditorView
            busy={busy}
            categories={categories}
            errors={articleFormErrors}
            form={articleForm}
            isEditing={route.name === "article-edit"}
            selectedArticle={selectedArticle}
            workspaceLoading={workspaceLoading}
            onChange={setArticleForm}
            onNavigate={navigate}
            onSave={(publish) => void saveArticle(publish)}
            onUnpublish={confirmUnpublish}
          />
        ) : null}
        {route.name === "photos" ? (
          <PhotosView
            allPhotos={photos}
            busy={busy}
            filters={photoFilters}
            form={photoForm}
            open={photoFormOpen}
            photos={filteredPhotos}
            readOnly={photoWorkspaceReadOnly}
            onCancel={() => {
              setPhotoFormOpen(false);
              setPhotoForm(initialPhotoForm);
            }}
            onChange={setPhotoForm}
            onEdit={editPhoto}
            onFilterChange={setPhotoFilters}
            onNew={newPhoto}
            onSave={savePhoto}
            onStatusChange={changePhotoStatus}
          />
        ) : null}
        {route.name === "categories" ? (
          <TaxonomyView
            articles={articles}
            busy={busy}
            form={categoryForm}
            items={categories}
            kind="category"
            onCancelEdit={() => setCategoryForm(initialCategoryForm)}
            onChange={setCategoryForm}
            onDelete={confirmDeleteCategory}
            onEdit={(category) =>
              setCategoryForm({
                id: category.id,
                slug: category.slug,
                name: category.name,
                description: category.description ?? "",
              })
            }
            onSubmit={() => void submitCategory()}
          />
        ) : null}
        {route.name === "tags" ? (
          <TaxonomyView
            articles={articles}
            busy={busy}
            form={tagForm}
            items={tags}
            kind="tag"
            onCancelEdit={() => setTagForm(initialTagForm)}
            onChange={setTagForm}
            onDelete={confirmDeleteTag}
            onEdit={(tag) => setTagForm({ id: tag.id, slug: tag.slug, name: tag.name })}
            onSubmit={() => void submitTag()}
          />
        ) : null}
        {route.name === "not-found" ? <NotFoundView onNavigate={navigate} /> : null}
      </Spin>
    </AdminLayout>
  );
}

function LoginView({
  busy,
  error,
  notice,
  onNavigate,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  notice: string;
  onNavigate: (path: string) => void;
  onSubmit: (values: { username: string; password: string }) => void;
}) {
  return (
    <main className="login-shell">
      <section className="login-copy" aria-labelledby="login-title">
        <Badge status="processing" text="Protected CMS" />
        <Title id="login-title" level={1}>
          Engineering blog admin
        </Title>
        <Paragraph>
          A focused workspace for keeping articles, topic archives, and engineering tags in publishable shape.
        </Paragraph>
        <Alert message={notice} showIcon type={error ? "warning" : "info"} />
        <Button className="frontstage-link" onClick={() => window.open("http://localhost:3000", "_blank")}>
          Open public site
        </Button>
      </section>
      <Card className="auth-panel" title="Sign in" bordered={false}>
        {error ? <Alert className="form-alert" message={error} showIcon type="error" /> : null}
        <Form layout="vertical" requiredMark="optional" onFinish={onSubmit}>
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: "Enter the admin username." }]}
          >
            <Input autoComplete="username" placeholder="Enter your admin username" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, message: "Enter the password." }]}>
            <Input.Password autoComplete="current-password" placeholder="Enter your password" />
          </Form.Item>
          <Space className="login-actions" direction="vertical" size={12}>
            <Button block htmlType="submit" loading={busy} type="primary">
              Sign in to workspace
            </Button>
            <Button block type="text" onClick={() => onNavigate("/dashboard")}>
              Return to protected route
            </Button>
          </Space>
        </Form>
      </Card>
    </main>
  );
}

function AdminLayout({
  children,
  displayName,
  meta,
  route,
  workspaceError,
  onLogout,
  onNavigate,
  onRefresh,
}: {
  children: ReactNode;
  displayName: string;
  meta: RouteMeta;
  route: Route;
  workspaceError: string | null;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
}) {
  return (
    <Layout className="admin-shell">
      <Sider breakpoint="lg" className="sidebar" collapsedWidth={0} width={264}>
        <div className="brand">
          <Text type="secondary">Blog Admin</Text>
          <Title level={3}>CMS Desk</Title>
          <Text type="secondary">IT engineer blog operations</Text>
        </div>
        <Menu
          className="admin-menu"
          items={[
            { key: "dashboard", label: "Workspace" },
            {
              key: "content",
              label: "Content",
              type: "group",
              children: [
                { key: "articles", label: "Articles" },
                { key: "photos", label: "Photos" },
              ],
            },
            {
              key: "taxonomy",
              label: "Taxonomy",
              type: "group",
              children: [
                { key: "categories", label: "Categories" },
                { key: "tags", label: "Tags" },
              ],
            },
          ]}
          mode="inline"
          onClick={({ key }) => onNavigate(menuPath(key))}
          selectedKeys={meta.menuKey ? [meta.menuKey] : []}
        />
        <div className="sidebar-footer">
          <Button block onClick={() => window.open("http://localhost:3000", "_blank")}>
            View public site
          </Button>
        </div>
      </Sider>
      <Layout>
        <Header className="workspace-topbar">
          <div>
            <Text type="secondary">Signed in as</Text>
            <strong>{displayName}</strong>
          </div>
          <Space wrap>
            <Button onClick={onRefresh}>Refresh</Button>
            <Button danger onClick={onLogout}>
              Sign out
            </Button>
          </Space>
        </Header>
        <Content className="workspace">
          <PageHeader meta={meta} route={route} />
          {workspaceError ? (
            <Alert
              className="workspace-alert"
              message="Workspace data issue"
              description={workspaceError}
              showIcon
              type="error"
            />
          ) : null}
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

function PageHeader({ meta, route }: { meta: RouteMeta; route: Route }) {
  return (
    <header className="page-heading">
      <Breadcrumb items={meta.breadcrumbs.map((title) => ({ title }))} />
      <div className="page-title-row">
        <div>
          <Title level={2}>{route.name === "article-edit" ? "Edit article" : meta.title}</Title>
          <Paragraph type="secondary">{route.name === "article-edit" ? "Update content, metadata, and publication status." : meta.description}</Paragraph>
        </div>
        <Tag color="blue">Protected</Tag>
      </div>
    </header>
  );
}

function DashboardView({
  articles,
  categories,
  photos,
  tags,
  onNavigate,
}: {
  articles: ArticleSummary[];
  categories: Category[];
  photos: PhotoRecord[];
  tags: TagModel[];
  onNavigate: (path: string) => void;
}) {
  const published = articles.filter((article) => article.status === "published").length;
  const drafts = articles.filter((article) => article.status === "draft").length;
  const totalViews = articles.reduce((sum, article) => sum + Math.max(0, Number(article.viewCount) || 0), 0);
  const recentArticles = [...articles]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 5);

  return (
    <section className="view-stack">
      <div className="metric-grid">
        <MetricCard label="All articles" value={articles.length} />
        <MetricCard label="Published" value={published} tone="success" />
        <MetricCard label="Drafts" value={drafts} tone="warning" />
        <MetricCard label="Total views" value={totalViews} />
        <MetricCard label="Photos" value={photos.length} />
      </div>
      <div className="dashboard-grid">
        <Card bordered={false} title="Next actions">
          <Space className="action-list" direction="vertical" size={10}>
            <Button block type="primary" onClick={() => onNavigate("/articles/new")}>
              Create article
            </Button>
            <Button block onClick={() => onNavigate("/articles")}>
              Review article table
            </Button>
            <Button block onClick={() => onNavigate("/photos")}>
              Manage photo wall
            </Button>
            <Button block onClick={() => onNavigate("/taxonomy/categories")}>
              Maintain categories
            </Button>
            <Button block onClick={() => onNavigate("/taxonomy/tags")}>
              Maintain tags
            </Button>
          </Space>
        </Card>
        <Card bordered={false} title="Recent updates">
          {recentArticles.length === 0 ? (
            <Empty
              description="No articles yet. Start with a draft, then add categories and tags as the content model matures."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => onNavigate("/articles/new")}>
                Create first article
              </Button>
            </Empty>
          ) : (
            <Table
              columns={[
                {
                  title: "Article",
                  dataIndex: "title",
                  render: (_, article: ArticleSummary) => (
                    <Button className="link-button" type="link" onClick={() => onNavigate(`/articles/${article.id}`)}>
                      <span>{article.title}</span>
                      <Text type="secondary">{article.slug}</Text>
                    </Button>
                  ),
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  render: (status: ArticleStatus) => <ArticleStatusLabel status={status} />,
                },
                {
                  title: "Updated",
                  dataIndex: "updatedAt",
                  render: (value: string) => formatDate(value),
                  responsive: ["md"],
                },
                {
                  title: "Views",
                  dataIndex: "viewCount",
                  render: (value: number) => Math.max(0, Number(value) || 0).toLocaleString("zh-CN"),
                  responsive: ["md"],
                },
              ]}
              dataSource={recentArticles}
              pagination={false}
              rowKey="id"
              size="middle"
            />
          )}
        </Card>
      </div>
    </section>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number | string; tone?: "success" | "warning" }) {
  return (
    <Card bordered={false} className={`metric-card ${tone ? `metric-card-${tone}` : ""}`}>
      <Statistic title={label} value={value} />
    </Card>
  );
}

function ArticlesView({
  articles,
  allArticles,
  busy,
  categories,
  filters,
  onFilterChange,
  onNavigate,
  onPublish,
  onUnpublish,
}: {
  articles: ArticleSummary[];
  allArticles: ArticleSummary[];
  busy: boolean;
  categories: Category[];
  filters: ArticleFilters;
  onFilterChange: (filters: ArticleFilters) => void;
  onNavigate: (path: string) => void;
  onPublish: (article: ArticleSummary) => void;
  onUnpublish: (article: ArticleSummary) => void;
}) {
  const columns: ColumnsType<ArticleSummary> = [
    {
      title: "Article",
      dataIndex: "title",
      key: "title",
      width: 320,
      render: (_, article) => (
        <Button className="link-button" type="link" onClick={() => onNavigate(`/articles/${article.id}`)}>
          <span>{article.title}</span>
          <Text type="secondary">{article.slug}</Text>
        </Button>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: ArticleStatus) => <ArticleStatusLabel status={status} />,
    },
    {
      title: "Category",
      dataIndex: ["category", "name"],
      key: "category",
      width: 160,
      render: (_, article) => article.category?.name ?? <Text type="secondary">Unassigned</Text>,
      responsive: ["md"],
    },
    {
      title: "Tags",
      dataIndex: "tags",
      key: "tags",
      width: 220,
      render: (_, article) => (
        <Space size={[4, 4]} wrap>
          {article.tags.length > 0 ? (
            article.tags.slice(0, 3).map((tag) => <Tag key={tag.id}>{tag.name}</Tag>)
          ) : (
            <Text type="secondary">No tags</Text>
          )}
        </Space>
      ),
      responsive: ["lg"],
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (value: string) => formatDate(value),
      responsive: ["md"],
    },
    {
      title: "Views",
      dataIndex: "viewCount",
      key: "viewCount",
      width: 120,
      render: (value: number) => Math.max(0, Number(value) || 0).toLocaleString("zh-CN"),
      responsive: ["lg"],
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 210,
      render: (_, article) => (
        <Space>
          <Button onClick={() => onNavigate(`/articles/${article.id}`)}>Edit</Button>
          {article.status === "published" ? (
            <Button danger disabled={busy} onClick={() => onUnpublish(article)}>
              Unpublish
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => onPublish(article)}>
              Publish
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <section className="view-stack">
      <Card
        bordered={false}
        className="table-card"
        extra={
          <Button type="primary" onClick={() => onNavigate("/articles/new")}>
            New article
          </Button>
        }
        title="Article inventory"
      >
        <div className="table-toolbar">
          <Select
            aria-label="Status filter"
            options={[
              { label: "All statuses", value: "all" },
              { label: "Draft", value: "draft" },
              { label: "Published", value: "published" },
            ]}
            value={filters.status}
            onChange={(status) => onFilterChange({ ...filters, status })}
          />
          <Select
            aria-label="Category filter"
            options={[
              { label: "All categories", value: "all" },
              ...categories.map((category) => ({ label: category.name, value: category.id })),
            ]}
            value={filters.categoryId}
            onChange={(categoryId) => onFilterChange({ ...filters, categoryId })}
          />
          <Input.Search
            allowClear
            aria-label="Search articles"
            placeholder="Search title, slug, or summary"
            value={filters.query}
            onChange={(event) => onFilterChange({ ...filters, query: event.target.value })}
          />
        </div>
        <Table
          columns={columns}
          dataSource={articles}
          locale={{
            emptyText: (
              <Empty
                description={
                  allArticles.length === 0
                    ? "No articles exist yet. Create a draft to start the CMS workflow."
                    : "No articles match the current filters."
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Space>
                  <Button type="primary" onClick={() => onNavigate("/articles/new")}>
                    Create article
                  </Button>
                  {allArticles.length > 0 ? (
                    <Button onClick={() => onFilterChange({ status: "all", categoryId: "all", query: "" })}>
                      Clear filters
                    </Button>
                  ) : null}
                </Space>
              </Empty>
            ),
          }}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          rowKey="id"
          scroll={{ x: 980 }}
        />
      </Card>
    </section>
  );
}

function PhotosView({
  allPhotos,
  busy,
  filters,
  form,
  open,
  photos,
  onCancel,
  onChange,
  onEdit,
  onFilterChange,
  onNew,
  onSave,
  onStatusChange,
  readOnly,
}: {
  allPhotos: PhotoRecord[];
  busy: boolean;
  filters: PhotoFilters;
  form: PhotoFormState;
  open: boolean;
  photos: PhotoRecord[];
  readOnly: boolean;
  onCancel: () => void;
  onChange: (form: PhotoFormState) => void;
  onEdit: (photo: PhotoRecord) => void;
  onFilterChange: (filters: PhotoFilters) => void;
  onNew: () => void;
  onSave: () => void;
  onStatusChange: (photo: PhotoRecord, status: PhotoStatus) => void;
}) {
  const columns: ColumnsType<PhotoRecord> = [
    {
      title: "Photo",
      dataIndex: "title",
      key: "title",
      width: 320,
      render: (_, photo) => (
        <Space>
          <img alt="" className="photo-thumb" src={photo.thumbnailUrl ?? photo.imageUrl} />
          <Button className="link-button" type="link" onClick={() => onEdit(photo)}>
            <span>{photo.title}</span>
            <Text type="secondary">{photo.alt}</Text>
          </Button>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: PhotoStatus) => <PhotoStatusLabel status={status} />,
    },
    {
      title: "Tags",
      key: "tags",
      width: 220,
      render: (_, photo) => (
        <Space size={[4, 4]} wrap>
          {photo.tags.length > 0 ? photo.tags.slice(0, 3).map((tag) => <Tag key={tag}>{tag}</Tag>) : <Text type="secondary">No tags</Text>}
        </Space>
      ),
      responsive: ["md"],
    },
    {
      title: "Sort",
      dataIndex: "sortOrder",
      key: "sortOrder",
      width: 90,
      responsive: ["lg"],
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (value: string) => formatDate(value),
      responsive: ["lg"],
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 240,
      render: (_, photo) => (
        <Space>
          <Button onClick={() => onEdit(photo)}>Edit</Button>
          {photo.status === "published" ? (
            <Button disabled={busy || readOnly} onClick={() => onStatusChange(photo, "hidden")}>
              Hide
            </Button>
          ) : (
            <Button disabled={busy || readOnly} onClick={() => onStatusChange(photo, "published")}>
              Publish
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <section className="view-stack">
      <Alert
        message={readOnly ? "Photo API is unavailable" : "Photo storage boundary"}
        description={
          readOnly
            ? "Fallback photos are shown for review only. Creating, editing, publishing, and hiding photos are disabled until the API can persist changes."
            : "This page persists display metadata and image URLs through the protected photo API. COS credentials and future upload signing stay behind API endpoints."
        }
        showIcon
        type={readOnly ? "warning" : "info"}
      />
      <Card
        bordered={false}
        className="table-card"
        extra={
          <Button disabled={readOnly} type="primary" onClick={onNew}>
            New photo
          </Button>
        }
        title="Photo inventory"
      >
        <div className="table-toolbar photos-toolbar">
          <Select
            aria-label="Photo status filter"
            options={[
              { label: "All statuses", value: "all" },
              { label: "Draft", value: "draft" },
              { label: "Published", value: "published" },
              { label: "Hidden", value: "hidden" },
            ]}
            value={filters.status}
            onChange={(status) => onFilterChange({ ...filters, status })}
          />
          <Input.Search
            allowClear
            aria-label="Search photos"
            placeholder="Search title, alt, or tags"
            value={filters.query}
            onChange={(event) => onFilterChange({ ...filters, query: event.target.value })}
          />
          <Button disabled={allPhotos.length === 0} onClick={() => onFilterChange({ status: "all", query: "" })}>
            Clear filters
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={photos}
          locale={{
            emptyText: (
              <Empty description="No photos match this view. Create a record or clear filters." image={Empty.PRESENTED_IMAGE_SIMPLE}>
                <Button disabled={readOnly} type="primary" onClick={onNew}>
                  New photo
                </Button>
              </Empty>
            ),
          }}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          rowKey="id"
          scroll={{ x: 980 }}
        />
      </Card>
      <Modal
        destroyOnHidden
        okButtonProps={{ disabled: readOnly, loading: busy }}
        okText={form.id ? "Update photo" : "Create photo"}
        onCancel={onCancel}
        onOk={onSave}
        open={open}
        title={form.id ? "Edit photo" : "New photo"}
        width={760}
      >
        <Form layout="vertical" requiredMark="optional">
          <Upload.Dragger
            accept="image/*"
            beforeUpload={() => false}
            maxCount={1}
            showUploadList={false}
            style={{ marginBottom: 16 }}
          >
            <p className="ant-upload-text">Future COS upload area</p>
            <p className="ant-upload-hint">For now, register an existing URL below. No secrets are stored in the browser.</p>
          </Upload.Dragger>
          <div className="form-grid">
            <Form.Item label="Title" required>
              <Input value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} />
            </Form.Item>
            <Form.Item label="Image URL" required>
              <Input value={form.imageUrl} onChange={(event) => onChange({ ...form, imageUrl: event.target.value })} />
            </Form.Item>
            <Form.Item label="Alt text" required>
              <Input value={form.alt} onChange={(event) => onChange({ ...form, alt: event.target.value })} />
            </Form.Item>
            <Form.Item label="Thumbnail URL">
              <Input value={form.thumbnailUrl} onChange={(event) => onChange({ ...form, thumbnailUrl: event.target.value })} />
            </Form.Item>
            <Form.Item label="Category">
              <Input placeholder="workbench" value={form.category} onChange={(event) => onChange({ ...form, category: event.target.value })} />
            </Form.Item>
            <Form.Item label="Tags">
              <Input placeholder="workspace, release" value={form.tags} onChange={(event) => onChange({ ...form, tags: event.target.value })} />
            </Form.Item>
            <Form.Item label="Taken date">
              <Input type="date" value={form.takenAt} onChange={(event) => onChange({ ...form, takenAt: event.target.value })} />
            </Form.Item>
            <Form.Item label="Sort order">
              <Input type="number" value={form.sortOrder} onChange={(event) => onChange({ ...form, sortOrder: Number(event.target.value) })} />
            </Form.Item>
            <Form.Item label="Status">
              <Select
                options={[
                  { label: "Draft", value: "draft" },
                  { label: "Published", value: "published" },
                  { label: "Hidden", value: "hidden" },
                ]}
                value={form.status}
                onChange={(status) => onChange({ ...form, status })}
              />
            </Form.Item>
            <Form.Item label="Featured">
              <Select
                options={[
                  { label: "No", value: "false" },
                  { label: "Yes", value: "true" },
                ]}
                value={String(form.featured)}
                onChange={(value) => onChange({ ...form, featured: value === "true" })}
              />
            </Form.Item>
            <Form.Item className="wide" label="Description">
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 6 }}
                value={form.description}
                onChange={(event) => onChange({ ...form, description: event.target.value })}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </section>
  );
}

function ArticleEditorView({
  busy,
  categories,
  errors,
  form,
  isEditing,
  selectedArticle,
  workspaceLoading,
  onChange,
  onNavigate,
  onSave,
  onUnpublish,
}: {
  busy: boolean;
  categories: Category[];
  errors: FieldErrors;
  form: ArticleFormState;
  isEditing: boolean;
  selectedArticle: ArticleSummary | null;
  workspaceLoading: boolean;
  onChange: (form: ArticleFormState) => void;
  onNavigate: (path: string) => void;
  onSave: (publishAfterSave: boolean) => void;
  onUnpublish: (article: ArticleSummary) => void;
}) {
  if (isEditing && !selectedArticle && !workspaceLoading) {
    return (
      <Result
        status="404"
        title="Article is not editable"
        subTitle="The article was not found in the admin dataset, or it may no longer exist."
        extra={<Button onClick={() => onNavigate("/articles")}>Return to articles</Button>}
      />
    );
  }

  return (
    <section className="editor-grid">
      <Card bordered={false} className="editor-card" title={isEditing ? "Editorial fields" : "Draft foundation"}>
        <Form layout="vertical" requiredMark="optional">
          <div className="form-grid">
            <ValidatedItem error={errors.slug} label="Slug" required>
              <Input
                placeholder="incident-review-template"
                value={form.slug}
                onChange={(event) => onChange({ ...form, slug: event.target.value })}
              />
            </ValidatedItem>
            <ValidatedItem error={errors.title} label="Title" required>
              <Input
                placeholder="A concrete engineering article title"
                value={form.title}
                onChange={(event) => onChange({ ...form, title: event.target.value })}
              />
            </ValidatedItem>
            <Form.Item label="Category">
              <Select
                allowClear
                options={categories.map((category) => ({ label: category.name, value: category.id }))}
                placeholder="Choose a topic archive"
                value={form.categoryId || undefined}
                onChange={(value) => onChange({ ...form, categoryId: value ?? "" })}
              />
            </Form.Item>
            <Form.Item label="Tags">
              <Input
                placeholder="typescript, ci-cd, performance"
                value={form.tags}
                onChange={(event) => onChange({ ...form, tags: event.target.value })}
              />
            </Form.Item>
            <ValidatedItem className="wide" error={errors.summary} label="Summary" required>
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 6 }}
                placeholder="Summarize the engineering problem, boundary, and takeaway."
                value={form.summary}
                onChange={(event) => onChange({ ...form, summary: event.target.value })}
              />
            </ValidatedItem>
            <ValidatedItem error={errors.coverImage} label="Cover image URL">
              <Input
                placeholder="https://..."
                value={form.coverImage}
                onChange={(event) => onChange({ ...form, coverImage: event.target.value })}
              />
            </ValidatedItem>
            <ValidatedItem error={errors.canonicalUrl} label="Canonical URL">
              <Input
                placeholder="https://..."
                value={form.canonicalUrl}
                onChange={(event) => onChange({ ...form, canonicalUrl: event.target.value })}
              />
            </ValidatedItem>
            <Form.Item label="SEO title">
              <Input value={form.seoTitle} onChange={(event) => onChange({ ...form, seoTitle: event.target.value })} />
            </Form.Item>
            <Form.Item label="SEO description">
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 4 }}
                value={form.seoDescription}
                onChange={(event) => onChange({ ...form, seoDescription: event.target.value })}
              />
            </Form.Item>
            <Form.Item className="wide" label="AI/content summary">
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 6 }}
                placeholder="Optional internal summary for downstream presentation."
                value={form.aiSummary}
                onChange={(event) => onChange({ ...form, aiSummary: event.target.value })}
              />
            </Form.Item>
            <ValidatedItem className="wide" error={errors.body} label="Body" required>
              <Input.TextArea
                autoSize={{ minRows: 14, maxRows: 24 }}
                placeholder="Write the article body. Keep code blocks and long URLs readable."
                value={form.body}
                onChange={(event) => onChange({ ...form, body: event.target.value })}
              />
            </ValidatedItem>
          </div>
          <Space wrap>
            <Button loading={busy} onClick={() => onSave(false)}>
              Save draft
            </Button>
            <Button loading={busy} type="primary" onClick={() => onSave(true)}>
              Save and publish
            </Button>
            <Button onClick={() => onNavigate("/articles")}>Back to list</Button>
          </Space>
        </Form>
      </Card>
      <aside className="editor-aside">
        <Card bordered={false} title="Publication state">
          {selectedArticle ? (
            <Space direction="vertical" size={10}>
              <ArticleStatusLabel status={selectedArticle.status} />
              <Text type="secondary">Updated {formatDate(selectedArticle.updatedAt)}</Text>
              <Text type="secondary">
                Published {selectedArticle.publishedAt ? formatDate(selectedArticle.publishedAt) : "not yet"}
              </Text>
              {selectedArticle.status === "published" ? (
                <Button danger loading={busy} onClick={() => onUnpublish(selectedArticle)}>
                  Unpublish article
                </Button>
              ) : null}
            </Space>
          ) : (
            <Empty description="This article has not been saved yet." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
        <Alert
          message="Draft reliability"
          description="Validation errors stay next to fields, failed saves keep your input, and publishing is explicit."
          showIcon
          type="info"
        />
      </aside>
    </section>
  );
}

function ValidatedItem({
  children,
  className,
  error,
  label,
  required,
}: {
  children: ReactNode;
  className?: string;
  error?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <Form.Item
      className={className}
      help={error}
      label={label}
      required={required}
      validateStatus={error ? "error" : undefined}
    >
      {children}
    </Form.Item>
  );
}

function TaxonomyView<T extends Category | TagModel>({
  articles,
  busy,
  form,
  items,
  kind,
  onCancelEdit,
  onChange,
  onDelete,
  onEdit,
  onSubmit,
}: {
  articles: ArticleSummary[];
  busy: boolean;
  form: TaxonomyFormState;
  items: T[];
  kind: "category" | "tag";
  onCancelEdit: () => void;
  onChange: (form: TaxonomyFormState) => void;
  onDelete: (item: T) => void;
  onEdit: (item: T) => void;
  onSubmit: () => void;
}) {
  const isCategory = kind === "category";
  const noun = isCategory ? "category" : "tag";
  const referenceCount = (item: T) =>
    isCategory ? countCategoryReferences(item.id, articles) : countTagReferences(item.id, articles);

  return (
    <section className="split-panel">
      <Card bordered={false} title={form.id ? `Edit ${noun}` : `Create ${noun}`}>
        <Form layout="vertical" requiredMark="optional" onFinish={onSubmit}>
          <Form.Item label="Slug" required>
            <Input
              placeholder={isCategory ? "architecture-design" : "typescript"}
              value={form.slug}
              onChange={(event) => onChange({ ...form, slug: event.target.value })}
            />
          </Form.Item>
          <Form.Item label="Name" required>
            <Input
              placeholder={isCategory ? "Architecture Design" : "TypeScript"}
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
            />
          </Form.Item>
          {isCategory ? (
            <Form.Item label="Description">
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 6 }}
                placeholder="Explain the long-lived topic boundary."
                value={form.description}
                onChange={(event) => onChange({ ...form, description: event.target.value })}
              />
            </Form.Item>
          ) : null}
          <Space wrap>
            <Button disabled={!form.slug || !form.name} htmlType="submit" loading={busy} type="primary">
              {form.id ? `Update ${noun}` : `Create ${noun}`}
            </Button>
            {form.id ? <Button onClick={onCancelEdit}>Cancel edit</Button> : null}
          </Space>
        </Form>
        <Alert
          className="taxonomy-note"
          message={isCategory ? "Categories are topic archives." : "Tags are cross-cutting indexes."}
          description={
            isCategory
              ? "Use categories for durable editorial lanes, not small keyword fragments."
              : "Use tags for frameworks, tools, languages, and engineering methods. Avoid near-duplicates."
          }
          showIcon
          type="info"
        />
      </Card>
      <Card bordered={false} className="table-card" title={`Existing ${noun}s`}>
        <Table
          columns={[
            { title: "Name", dataIndex: "name", key: "name" },
            { title: "Slug", dataIndex: "slug", key: "slug", responsive: ["md"] },
            {
              title: "Articles",
              key: "references",
              width: 100,
              render: (_, item: T) => referenceCount(item),
            },
            {
              title: "Actions",
              key: "actions",
              width: 180,
              render: (_, item: T) => (
                <Space>
                  <Button onClick={() => onEdit(item)}>Edit</Button>
                  <Button danger disabled={busy} onClick={() => onDelete(item)}>
                    Delete
                  </Button>
                </Space>
              ),
            },
          ]}
          dataSource={items}
          locale={{
            emptyText: (
              <Empty
                description={
                  isCategory
                    ? "No categories yet. Create durable topic archives before publishing at scale."
                    : "No tags yet. Add framework, tool, language, or method indexes as content grows."
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
          pagination={items.length > 8 ? { pageSize: 8, showSizeChanger: false } : false}
          rowKey="id"
        />
      </Card>
    </section>
  );
}

function NotFoundView({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <Result
      status="404"
      title="Admin route not found"
      subTitle="This workspace route does not exist. Use the CMS navigation to continue."
      extra={
        <Space>
          <Button type="primary" onClick={() => onNavigate("/dashboard")}>
            Go to workspace
          </Button>
          <Button onClick={() => onNavigate("/articles")}>Open articles</Button>
        </Space>
      }
    />
  );
}

function ArticleStatusLabel({ status }: { status: ArticleStatus }) {
  return status === "published" ? <Tag color="green">Published</Tag> : <Tag color="default">Draft</Tag>;
}

function PhotoStatusLabel({ status }: { status: PhotoStatus }) {
  if (status === "published") return <Tag color="green">Published</Tag>;
  if (status === "hidden") return <Tag color="orange">Hidden</Tag>;
  return <Tag color="default">Draft</Tag>;
}

function StatusScreen({ message, title }: { message: string; title: string }) {
  return (
    <main className="status-screen">
      <Spin size="large" />
      <Title level={2}>{title}</Title>
      <Text type="secondary">{message}</Text>
    </main>
  );
}

async function request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(new URL(path, apiBaseUrl), {
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new RequestError(extractErrorMessage(payload, response.status), response.status);
  }
  return payload as T;
}

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}

function articlePayload(form: ArticleFormState) {
  return {
    slug: form.slug.trim(),
    title: form.title.trim(),
    summary: form.summary.trim(),
    body: form.body,
    coverImage: form.coverImage.trim() || null,
    categoryId: form.categoryId || null,
    tags: parseTags(form.tags),
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
    canonicalUrl: form.canonicalUrl.trim() || null,
    aiSummary: form.aiSummary.trim() || null,
    contentSummary: form.aiSummary.trim() || form.summary.trim(),
  };
}

function articleToForm(article: ArticleSummary): ArticleFormState {
  return {
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    body: article.body ?? "",
    coverImage: article.coverImage ?? "",
    categoryId: article.category?.id ?? "",
    tags: article.tags.map((tag) => tag.slug).join(", "),
    seoTitle: article.seoTitle ?? "",
    seoDescription: article.seoDescription ?? "",
    canonicalUrl: article.canonicalUrl ?? "",
    aiSummary: article.aiSummary ?? "",
  };
}

function photoApiPayload(form: PhotoFormState) {
  const imageUrl = form.imageUrl.trim();
  const thumbnailUrl = form.thumbnailUrl.trim();

  if (thumbnailUrl && !isValidUrl(thumbnailUrl)) {
    throw new Error("Thumbnail URL must be a valid URL.");
  }

  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    alt: form.alt.trim() || form.title.trim(),
    imageUrl,
    thumbnailUrl: thumbnailUrl || null,
    category: form.category.trim() || null,
    tags: parseTags(form.tags),
    status: form.status,
    sortOrder: Number(form.sortOrder || 0),
    featured: form.featured,
    takenAt: dateInputToIso(form.takenAt),
  };
}

function normalizeAdminPhoto(photo: PhotoRecord | AdminPhotoRecord): PhotoRecord {
  if ("mediaAsset" in photo) {
    return {
      id: photo.id,
      title: photo.title,
      description: photo.description ?? null,
      mediaAssetId: photo.mediaAssetId,
      thumbnailAssetId: photo.thumbnailAssetId,
      imageUrl: photo.imageUrl ?? photo.mediaAsset?.originalUrl ?? "",
      thumbnailUrl: photo.thumbnailUrl ?? photo.thumbnailAsset?.originalUrl ?? null,
      alt: photo.alt,
      category: photo.category ?? photo.categorySlug ?? null,
      tags: photo.tags ?? [],
      status: photo.status,
      sortOrder: Number(photo.sortOrder ?? 0),
      featured: Boolean(photo.featured),
      takenAt: photo.takenAt ?? null,
      updatedAt: photo.updatedAt,
    };
  }
  return photo;
}

function dateInputToIso(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null;
}

function photoPayload(form: PhotoFormState): PhotoRecord {
  return {
    id: form.id ?? "",
    title: form.title.trim(),
    description: form.description.trim() || null,
    imageUrl: form.imageUrl.trim(),
    thumbnailUrl: form.thumbnailUrl.trim() || null,
    alt: form.alt.trim() || form.title.trim(),
    category: form.category.trim() || null,
    tags: parseTags(form.tags),
    status: form.status,
    sortOrder: Number(form.sortOrder || 0),
    featured: form.featured,
    takenAt: form.takenAt || null,
    updatedAt: new Date().toISOString(),
  };
}

function photoToForm(photo: PhotoRecord): PhotoFormState {
  return {
    id: photo.id,
    title: photo.title,
    description: photo.description ?? "",
    imageUrl: photo.imageUrl,
    thumbnailUrl: photo.thumbnailUrl ?? "",
    alt: photo.alt,
    category: photo.category ?? "",
    tags: photo.tags.join(", "),
    status: photo.status,
    sortOrder: photo.sortOrder,
    featured: photo.featured,
    takenAt: photo.takenAt?.slice(0, 10) ?? "",
  };
}

function validateArticleForm(form: ArticleFormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
    errors.slug = "Use lowercase letters, numbers, and hyphen-separated words.";
  }
  if (!form.title.trim()) errors.title = "Title is required.";
  if (!form.summary.trim()) errors.summary = "Summary is required.";
  if (!form.body.trim()) errors.body = "Body is required.";
  if (form.coverImage.trim() && !isValidUrl(form.coverImage.trim())) {
    errors.coverImage = "Use a full URL, including https://.";
  }
  if (form.canonicalUrl.trim() && !isValidUrl(form.canonicalUrl.trim())) {
    errors.canonicalUrl = "Use a full URL, including https://.";
  }
  return errors;
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseRoute(): Route {
  const path = window.location.pathname.replace(/\/$/, "") || "/dashboard";
  const params = new URLSearchParams(window.location.search);
  if (path === "/login") {
    const returnTo = params.get("returnTo") ?? "/dashboard";
    return { name: "login", returnTo: returnTo.startsWith("/") && returnTo !== "/login" ? returnTo : "/dashboard" };
  }
  if (path === "/" || path === "/dashboard") return { name: "dashboard" };
  if (path === "/articles") return { name: "articles" };
  if (path === "/photos") return { name: "photos" };
  if (path === "/articles/new") return { name: "article-new" };
  if (path.startsWith("/articles/")) return { name: "article-edit", id: path.split("/")[2] };
  if (path === "/taxonomy/categories") return { name: "categories" };
  if (path === "/taxonomy/tags") return { name: "tags" };
  return { name: "not-found", path };
}

function getRouteMeta(route: Route): RouteMeta {
  if (route.name === "article-edit") {
    return {
      title: "Edit article",
      description: "Update content, metadata, and publication status.",
      menuKey: "articles",
      breadcrumbs: ["Content", "Articles", "Edit"],
    };
  }
  if (route.name === "not-found") {
    return {
      title: "Not found",
      description: "The requested Admin route does not exist.",
      breadcrumbs: ["Not found"],
    };
  }
  if (route.name === "login") {
    return {
      title: "Login",
      description: "Sign in to the protected workspace.",
      breadcrumbs: ["Login"],
    };
  }
  return routeMeta[route.name];
}

function currentProtectedPath() {
  return `${window.location.pathname}${window.location.search}` || "/dashboard";
}

function menuPath(key: string) {
  switch (key) {
    case "articles":
      return "/articles";
    case "photos":
      return "/photos";
    case "categories":
      return "/taxonomy/categories";
    case "tags":
      return "/taxonomy/tags";
    default:
      return "/dashboard";
  }
}

function extractErrorMessage(payload: unknown, status: number) {
  if (isRecord(payload)) {
    const direct = payload.message;
    const nested = isRecord(payload.error) ? payload.error.message : undefined;
    const value = nested ?? direct;
    if (Array.isArray(value)) return value.join(" ");
    if (typeof value === "string") return value;
  }
  return `Request failed with ${status}`;
}

function readableError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function countCategoryReferences(categoryId: string, articles: ArticleSummary[]) {
  return articles.filter((article) => article.category?.id === categoryId).length;
}

function countTagReferences(tagId: string, articles: ArticleSummary[]) {
  return articles.filter((article) => article.tags.some((tag) => tag.id === tagId)).length;
}

function suggestSlug() {
  const date = new Date();
  return `draft-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider
      componentSize="middle"
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          borderRadius: 6,
          colorBgBase: "#f4f6f8",
          colorInfo: "#2563eb",
          colorPrimary: "#1f6f78",
          colorSuccess: "#237a57",
          colorText: "#17202a",
          colorWarning: "#ad6800",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif',
          fontSize: 14,
        },
        components: {
          Button: {
            borderRadius: 5,
            controlHeight: 36,
          },
          Card: {
            borderRadiusLG: 6,
            boxShadowTertiary: "none",
            headerBg: "#ffffff",
          },
          Layout: {
            bodyBg: "#f4f6f8",
            headerBg: "#ffffff",
            siderBg: "#ffffff",
          },
          Menu: {
            itemBorderRadius: 5,
            itemHeight: 38,
          },
          Table: {
            headerBg: "#f7f9fb",
            headerColor: "#405166",
            rowHoverBg: "#f7fbfb",
          },
        },
      }}
    >
      <AntApp>
        <AdminApp />
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
