# API Rules

## Principles

- Keep API naming, error shape, pagination, filtering, and sorting consistent.
- Make input and output types explicit.
- Record compatibility impact for breaking API changes.

## Output

- Added, changed, or removed endpoints must be recorded in `artifacts/api-change.md`.
- If frontend calls are affected, update shared types or SDKs when they exist.
