# Harness Core Boundary

[中文](./harness-core-boundary.md) | English

CrewUp separates reusable workflow core from project-specific adaptation.

## Layering

| Layer | Purpose | Should contain |
| --- | --- | --- |
| `.harness/` | Reusable workflow core | agents, policies, scripts, contracts, templates, rules |
| `.harness/project/` | Project adaptation layer | generated profile, overlay, language rules, testing rules, domain rules |
| `.harness/runs/` | Runtime execution data | active and historical run records |
| `.harness/reports/` | Runtime reports | run summaries, delivery reports, diagnostics |
| `.harness/knowledge/` | Rebuildable knowledge index | lessons, indexes, extracted project knowledge |
| `.harness/dashboard/` | Runtime dashboard | generated dashboard artifacts |

## Do Not Mix

Keep project business assets out of the reusable core:

- app source code
- product-specific README logic
- application runtime data
- generated run outputs
- one-off test fixtures

## Recommended Target-Project Files

After `crewup init`, target projects typically keep:

- `.harness/`
- `.harness/project/profile.yaml`
- `.harness/project/overlay.yaml`
- `AGENTS.md`
- `README.md`
- `package.json`

## Reset Rule

Anything under `runs/`, `reports/`, `dashboard/`, and most of `knowledge/` should be treated as regenerable runtime state.
