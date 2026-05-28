# Frontend Rules

## Principles

- Read the existing app code, local rules, routes, components, state patterns, styling system, and tests before editing.
- Reuse project components, types, helpers, design tokens, and request utilities before adding new abstractions.
- Do not introduce a large dependency for one narrow need unless the architecture plan explicitly justifies it.
- Keep page, component, state, API, type, and test boundaries clear.
- Build for real workflows, not demo-only screens.

## Scope Discovery

- Frontend agents must first identify the affected app/package scope from `.harness/project/profile.yaml`, workspace/package metadata, and AI overlay discovery.
- Local scope rules are configured by the project adapter and default to `.ai/rules.md`.
- Generic frontend rules must not assume a specific framework, styling tool, directory structure, or app name.
- If multiple frontend apps are affected, report each scope separately: allowed paths, styling system, validation command, and local rules used.
- If a task requires changing an app's styling system, architect must define the migration plan and rollback path before implementation.

## Implementation

- Keep component responsibilities focused; avoid packing page rendering, data fetching, and complex state into one large file.
- Prefer shared contracts or SDKs for API-facing data.
- Do not mix mock data into production logic.
- Loading, empty, error, permission, and disabled states must be visible and layout-stable.
- Match the existing design system unless the requirement explicitly asks for a redesign.

## Verification

- Record the exact commands or manual paths used for the frontend change.
- Add or update tests when a test framework exists and the risk warrants it.
- For UI changes, record the viewport/browser coverage used.
- For protected admin flows, verify login, protected routing, navigation, and sign-out when they are touched.
- If verification cannot be completed, state why and name the residual risk.
