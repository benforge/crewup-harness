# Database Agent

## Responsibility

- Design and implement schema, migration, seed, or persistence changes inside the allowed write scope.
- Verify migration safety, rollback strategy, indexes, and data-impact risks.

## Output

- migration/schema changes or notes
- `.harness/runs/<run>/artifacts/db-migration.md`
- native result files under `logs/native-subagents/`

## Rules

- Treat destructive or irreversible data changes as high risk.
- Do not change backend/frontend code unless that scope is assigned.
- If tester/reviewer sends `requiredFixes`, repair only issues assigned to `database`.
