# Release Summary

Run: `2026-05-21-006-photo-wall-cos-markdown-homepage`

Release status: conditional pass.

## Delivery Scope

- C-side homepage direction was simplified around the IT engineer persona: personal introduction, articles, and tags remain the primary content hierarchy; the photo wall is a lightweight entry rather than a homepage focus.
- Added public photo wall capability with `/photos` and `/photos/[id]`, masonry-style photo browsing, filtering-oriented metadata, responsive states, and detail viewing.
- Added Markdown/GFM article rendering support with code block presentation, table/list/quote/link/image handling, and a safe default that does not execute raw HTML.
- Added admin photo management flow for photo metadata, status changes, sorting-oriented fields, image URL registration, and clear success/failure behavior.
- Added photo/media API boundary for public reads, admin CRUD, media completion, URL refresh, and future upload/signature flow.
- Added database migration artifacts for `media_assets` and `photos`, including down migration and example seed data.
- Added Tencent COS boundary only as a future storage adapter contract. This release does not include real COS SDK upload, real signing, production credentials, or cloud resource provisioning.

## Key Fixes

- Closed the admin/API contract gap: admin-facing `imageUrl`, `thumbnailUrl`, and `category` are now supported by the backend, while backend-native `mediaAssetId`, `thumbnailAssetId`, and `categorySlug` remain available.
- Removed fake admin success behavior: photo save and status changes now only show success after API success; API failures keep user input and surface an error instead of creating local `local-*` records.
- Closed mobile `/photos` overflow: the result bar, lede text, home link, masonry container, and cards fit within a 390px mobile viewport without relying on hidden horizontal overflow.
- Added single-image failure fallback: photo wall cards and photo details now display an `Image unavailable` placeholder when an image URL is missing or fails to load.

## Verification Summary

- Web verification passed:
  - `npm --workspace @project/web run typecheck`
  - `npm --workspace @project/web run build`
- API verification passed:
  - `npm --workspace @blog/api run typecheck`
  - `npm --workspace @blog/api run build`
- Admin verification passed:
  - `npm --workspace @blog/admin run typecheck`
  - `npm --workspace @blog/admin run build`
  - Existing warning: Vite reports a large admin bundle chunk over 500 kB.
- Test suite passed:
  - `npm test --workspaces --if-present`
  - Current API e2e suite: 14/14 passed.
- Harness checks passed:
  - `npm run harness:check`
  - `npm run harness:gate-check -- 2026-05-21-006-photo-wall-cos-markdown-homepage`
  - `npm run harness:verify -- 2026-05-21-006-photo-wall-cos-markdown-homepage`
- API smoke passed:
  - Admin login succeeded with local dev credentials.
  - Admin photo creation via `imageUrl`, `thumbnailUrl`, and `category` returned a persisted id.
  - Admin photo status update returned the expected updated status.
  - Unauthenticated admin photo access returned `401`.
- Mobile layout smoke passed:
  - 390px mobile emulation recorded `innerWidth=390`, `clientWidth=390`, `documentElement.scrollWidth=390`, `body.scrollWidth=390`.
  - `.lede` and `.photo-card` stayed inside the 390px viewport.
- Image failure smoke passed:
  - Forced missing image rendered the `Image unavailable` fallback.

## Conditional Pass Items

- Real Tencent Cloud COS integration is not completed. Current work is an adapter/API boundary plus static URL registration support; release notes must not claim real COS signing, upload, expiry refresh, or cloud deployment.
- SQLite migration up/down was not executed locally because the `sqlite3` CLI was unavailable. Migration files exist and still need execution in a target database environment.
- Admin authenticated browser-level CRUD automation is not complete. Current evidence is code review plus HTTP API smoke; full browser E2E should be added later.
- Multi-photo masonry behavior is only partially proven because current smoke data includes limited photo records.

## Follow-Up Recommendations

1. Implement real Tencent COS signing/upload with short-lived credentials, expiry handling, object-key validation, and no frontend secret exposure.
2. Add migration CI or a repeatable local migration runner so `0002_photo_wall_media.sql` and its down migration are executed automatically.
3. Add admin browser E2E for login, create photo, edit photo, publish/hide photo, API failure handling, and read-only fallback mode.
4. Improve image upload UX with upload progress, retry, validation feedback, and media registration diagnostics.
5. Add richer multi-photo seed or fixture data to verify masonry layout, mixed image ratios, filtering, ordering, and empty states.
6. Consider admin route-level code splitting or manual chunks to reduce the current Vite bundle size warning.

## Archive Conclusion

This run is archived as a conditional pass. The MVP iteration now has a usable photo wall, safer Markdown rendering, admin photo-management closure, API/DB boundaries, and a future COS integration path. Remaining items are explicitly tracked as follow-up work and should not block this release archive.
