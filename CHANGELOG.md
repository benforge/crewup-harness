# Changelog

## 0.3.0-beta.2

- Updated the README hero artwork with a more minimal blue, white, and black developer-tool style.

## 0.3.0-beta.1

- Added explicit CrewUp activation policy so normal chat does not automatically enter the harness.
- Added discovery and plan-only workflow routing, plus stricter lite profile semantics for formal narrow tasks.
- Added artifact owner/provenance checks and no-code gates to keep the main agent in an orchestration role.
- Expanded bridge result JSON examples with `artifactUpdates` and `artifactsUpdated`.
- Added pack-install release validation through `npm run test:pack-install` and `npm run release:preflight`.
- Reworked README and workflow docs around the large-project, strict-harness positioning.
- Replaced the README hero with a lighter minimal SVG.

## 0.2.0

- Rewrote the README into a more standard open-source project landing page
- Clarified that CrewUp adapts to the real repository shape instead of assuming a fixed layout
- Added clearer workflow, command, mode, docs, and boundary sections in both Chinese and English
- Verified the workflow with `npm test` and `npm run test:flow`

## 0.1.0

- Renamed the package and CLI to `crewup`
- Added brand assets and bilingual README structure
- Kept `.harness/` as the reusable workflow core
- Added workflow checks for packaging and template boundaries
