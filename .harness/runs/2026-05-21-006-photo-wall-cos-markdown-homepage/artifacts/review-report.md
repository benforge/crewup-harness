# Review Report

Run: `2026-05-21-006-photo-wall-cos-markdown-homepage`

Reviewer: harness reviewer agent

Review date: 2026-05-21

Scope:
- `apps/admin/src/main.tsx`
- `apps/api/src/photos/**`
- `apps/web/app/photos/page.tsx`
- `apps/web/app/photos/[id]/page.tsx`
- `apps/web/components/photos/PhotoImage.tsx`
- `apps/web/components/photos/PhotoMasonryGrid.tsx`
- `apps/web/app/globals.css`
- `.harness/runs/2026-05-21-006-photo-wall-cos-markdown-homepage/artifacts/test-report.md`

## Conclusion

- [ ] Pass
- [x] Conditional pass
- [ ] Fail

This run can enter release with conditions. The previous P0/P1 release blockers have been closed enough for this iteration's stated scope: photo wall, admin photo management contract, Markdown rendering, and future Tencent COS adapter boundary.

The conditions are non-blocking follow-up items, not release blockers:
- Real Tencent COS signing/upload remains a future integration boundary and must not be described as completed.
- SQLite migration up/down was not executed locally because `sqlite3` CLI is unavailable.
- Admin browser-level authenticated CRUD was not fully automated; current evidence includes code review plus API smoke.

## Rereview Findings

### Previous P0: Admin photo form/API contract and fake local success

Status: closed.

Evidence:
- `apps/admin/src/main.tsx:665` `savePhoto()` now sends a real request to `/api/admin/photos` or `/api/admin/photos/:id`, uses the returned `response.photo`, and only shows success after the request resolves.
- `apps/admin/src/main.tsx:695` save failure now calls `handleRequestError(...)`; it no longer fabricates a `local-*` photo record.
- `apps/admin/src/main.tsx:712` `changePhotoStatus()` now calls `PATCH /api/admin/photos/:id/status` and only mutates local state from the returned API photo.
- `apps/admin/src/main.tsx:667` and `apps/admin/src/main.tsx:714` make the fallback photo workspace read-only when the photo API is unavailable.
- `apps/api/src/photos/dto/create-photo.dto.ts` and `apps/api/src/photos/dto/update-photo.dto.ts` now accept both admin-friendly `imageUrl`/`thumbnailUrl`/`category` and backend-native `mediaAssetId`/`thumbnailAssetId`/`categorySlug`.
- `apps/api/src/photos/photos.service.ts:191` resolves direct URL creation by registering a `static_url` media asset when `mediaAssetId` is not provided.
- `apps/api/src/photos/photos.service.ts:178` returns admin-compatible flattened fields including `imageUrl`, `thumbnailUrl`, and `category`.

Test evidence:
- Main Agent Rereview Verification records login, admin photo creation with `imageUrl`/`thumbnailUrl`/`category`, returned persisted id `photo-2`, status update to `hidden`, and unauthenticated admin photo request returning `401`.

Residual note:
- `photoPayload()` remains in `apps/admin/src/main.tsx` as an unused helper, but it is no longer part of the save path and is not blocking.

### Previous P1: C-side `/photos` mobile overflow/cropping

Status: closed.

Evidence:
- `apps/web/app/globals.css:64` no longer masks page-level overflow with `body { overflow-x: hidden; }`.
- `apps/web/app/globals.css:933` changes `.photo-result-bar` to a grid with `minmax(0, 1fr)`.
- `apps/web/app/globals.css:944` and `apps/web/app/globals.css:950` allow result text and the home link to wrap instead of forcing a wide row.
- `apps/web/app/globals.css:955` and `apps/web/app/globals.css:962` constrain masonry and cards to `width: 100%`, `max-width: 100%`, and `min-width: 0`.
- `apps/web/app/globals.css:1271` and `apps/web/app/globals.css:1373` collapse the result bar and masonry appropriately on smaller screens.

Test evidence:
- `output/playwright/photos-rereview-mobile-emulated.png` shows the page fitting a 390px mobile viewport.
- Test report records mobile emulation metrics: `innerWidth=390`, `clientWidth=390`, `documentElement.scrollWidth=390`, `body.scrollWidth=390`.
- Test report records `.lede` and `.photo-card` bounding boxes inside the 390px viewport.

### Previous P1: Single photo image failure fallback/placeholder

Status: closed.

Evidence:
- `apps/web/components/photos/PhotoImage.tsx` is a client component with `onError={() => setFailed(true)}`.
- Missing or failed `src` renders a visible `Image unavailable` placeholder.
- `apps/web/components/photos/PhotoMasonryGrid.tsx` uses `PhotoImage` for wall cards.
- `apps/web/app/photos/[id]/page.tsx` uses `PhotoImage` for detail images.
- `apps/web/app/globals.css:991` styles `.photo-image-fallback` with stable size, readable text, and card/detail compatibility.

Test evidence:
- Test report records an image failure smoke where the first photo image was forced to `/__missing-photo-smoke.jpg`; fallback count became `1` and visible text included `Image unavailable`.

### Test Evidence

Status: sufficient for conditional release.

Passed verification recorded in `artifacts/test-report.md`:
- `npm --workspace @project/web run typecheck`
- `npm --workspace @project/web run build`
- `npm --workspace @blog/api run typecheck`
- `npm --workspace @blog/api run build`
- `npm --workspace @blog/admin run typecheck`
- `npm --workspace @blog/admin run build`
- `npm test --workspaces --if-present`
- `npm run harness:check`
- `npm run harness:gate-check -- 2026-05-21-006-photo-wall-cos-markdown-homepage`

Additional smoke evidence:
- Admin/API login, create photo, status change, and unauthenticated rejection were verified through HTTP smoke.
- Clean production web process on `localhost:3201` served the current CSS asset successfully.
- Desktop and mobile rereview screenshots were produced under `output/playwright/`.

Known gaps are not blocking this release gate because they are outside this iteration's completed boundary or are already recorded:
- Real COS signing/upload/expiry behavior is not implemented.
- SQLite migration up/down was not executed locally.
- Admin authenticated browser CRUD is not automated end-to-end.
- Admin Vite build still warns about a large bundle.

## Release Gate

Decision: allow entry to release as a conditional pass.

Release notes must avoid claiming real Tencent COS completion. Describe the storage work as an adapter/API boundary plus static URL registration support for the current admin workflow.

Follow-up backlog items:
1. Add persisted DB-backed photo/media repository tests once the production database adapter is selected.
2. Add admin browser E2E for login, create photo, edit photo, hide/publish photo, and read-only fallback behavior.
3. Execute migration up/down in an environment with the target database CLI available.
4. Replace mock COS signing with Tencent COS SDK-backed signing and expiry validation when credentials and deployment target are ready.
5. Split the admin Vite bundle or introduce route-level code splitting.
