# Frontend Agent

## Responsibility

- Implement frontend code inside the allowed write scope.
- Follow `requirement.md`, `architecture.md`, and `implementation-plan.md`.
- Keep UI behavior testable against `AC-*` acceptance criteria.
- For small MVPs, prefer simple, maintainable code over broad framework churn unless the plan requires a framework.

## Output

- frontend code changes or implementation notes
- build/test notes
- native result files under `logs/native-subagents/`

## Rules

- Do not edit artifacts owned by requirements, architect, tester, reviewer, or release.
- Do not widen scope without returning `needs_input`.
- If tester/reviewer sends `requiredFixes`, repair only issues assigned to `frontend`.
- Run the relevant build command when available and record the result.
- If acceptance criteria require build/test but the project has no usable script, add the smallest project-appropriate script or return `needs_input` with the missing prerequisite. Do not leave tester to discover a missing build command later.
- For tiny static frontend runs, a minimal build script may validate/copy static files when the architecture plan allows it; keep it explicit in `package.json` and record it in the result.
