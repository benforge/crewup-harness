# Harness Core Boundary

[中文](./harness-core-boundary.md) | English

CrewUp separates reusable workflow core from project-specific adaptation.

The core defines process protocols, role contracts, gates, and runtime structure. Business facts come from the target project, and formal artifacts are produced by the corresponding subagent or external runner. The main agent should not hard-code project-specific judgment into the reusable core.

## Layering

| Layer | Purpose | Should contain |
| --- | --- | --- |
| `.harness/` | Reusable workflow core | agents, policies, scripts, contracts, templates, rules |
| `.harness/project/` | Project adaptation layer | generated profile, overlay, language rules, testing rules, domain rules |
| `.harness/runs/` | Runtime execution data | active and historical run records |
| `.harness/reports/` | Runtime reports | run summaries, delivery reports, diagnostics |
| `.harness/knowledge/` | Rebuildable knowledge index | lessons, indexes, extracted project knowledge |
| `.harness/dashboard/` | Runtime dashboard | generated dashboard artifacts |

## Activation Boundary

- Normal chat, Q&A, and tiny edits should not enter the harness just because CrewUp is installed.
- The strict workflow starts only when the user explicitly says `CrewUp`, `harness`, `crewup run`, or asks to use CrewUp.
- Once active, role ownership, artifact provenance, and stage gates should not be bypassed.
- If the user asks only for planning or discovery, `plan_only` / `discovery` must forbid business code changes.

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

`runs/`, `reports/`, `dashboard/`, `backlog/`, `project/`, and `knowledge/` should not be deleted during normal upgrades.

- `crewup install --force` is a safe upgrade: it updates the reusable core while preserving existing runtime state, knowledge, backlog items, and project adaptation.
- `crewup install --reset` is a clean reinstall: it deletes the old `.harness/` and should be used only when the user explicitly wants to reset.
