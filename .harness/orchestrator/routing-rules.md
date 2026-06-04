# Routing Rules

The main agent chooses role agents based on impact scope and workflow stage.

## Entry Decision

CrewUp is an explicitly enabled strict workflow. Without `crewup run`, `npx crewup run`, `npm run harness:run`, or a clear chat request to use CrewUp / follow the harness workflow / continue a CrewUp run, do not automatically create a run.

If the explicit CrewUp signal arrives in chat and the user did not provide a runId, the main agent creates the run with `npx crewup run "<user request>"`, extracts the runId from command output, and continues orchestration. Do not make the user run a separate command only to obtain the runId.

Entry decisions are intentionally simple:

- no explicit CrewUp signal: no harness
- explicit CrewUp signal with no runId: create a new run
- explicit existing runId or "continue this run": continue that run
- simple explanation/status/read-only check: no harness unless the user asks for CrewUp status

Do not route formal work through backlog. `Run` is the only default CrewUp work unit.

## Role Routing

- New feature or formal iteration: `requirements-plan`, then `requirements`
- Requirement expansion, scope clarification, non-goals, and acceptance preview: `requirements-plan`
- Formal requirement writing, user stories, acceptance criteria, and confirmed boundaries: `requirements`
- Technical design, architecture, impact scope, cross-module plan: `architect`
- Frontend pages, components, UI, interaction, styles: `frontend`
- Backend API, services, authentication, business logic: `backend`
- Database schema, migrations, indexes, seeds: `database`
- Deployment, CI/CD, environment configuration: `devops`
- Verification: `tester`
- Code/risk review: `reviewer`
- Release summary: `release`
- README, docs, usage, integration, configuration, migration notes: `docs`

## Execution Shape

- Preferred: native subagents using `native-plan`, `spawn_agent`, `wait_agent`, and `close_agent`.
- Before every native spawn, run `next-agent` and start only currently runnable agents.
- Fallback: desktop prompts when native tools are unavailable.
- Lowest fallback: main-agent coordination only, used only for status, read-only coordination, or blocker records.

Implementation agents selected at run creation are candidates only. They may start only after `architect` completes and `artifacts/implementation-plan.md` assigns their exact agent id. Implementation agents may run in parallel only when allowed write scopes do not conflict. Planning, verification, review, and release stages follow dependency order.

`pm` is optional coordination support only. Do not start `pm` as a default parallel replacement for `requirements-plan`, and do not let `pm` write `requirement.md`.

## Main Agent Boundary

The main agent coordinates, checks blockers, integrates results, and summarizes for the user. Once a run is created, the main agent must not take over formal implementation, testing, review, or release artifacts.

## Routing Table

| Impact Scope | Role Agent | Typical Work |
| --- | --- | --- |
| web | frontend | user-facing frontend entry, pages, routes, components, data requests, experience |
| admin | frontend | admin frontend entry, pages, forms, tables, permission states, interactions |
| frontend | frontend | frontend engineering, components, state, accessibility, performance, build |
| api | backend | backend services, API contract, domain logic, permissions, data access, errors |
| backend | backend | backend architecture, services, integration, reliability, performance |
| db | database | schema, migrations, indexes, data consistency |
| infra | devops | Docker, CI/CD, deployment, environment variables |
| docs | docs | README, docs, usage, integration, configuration, development guide, migration notes |

## Human Confirmation

Ask for explicit confirmation before destructive or high-risk operations such as database deletion, production deployment, real-data migration, secret configuration, or irreversible changes.
