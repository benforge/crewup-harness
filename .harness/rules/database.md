# Database Rules

## Principles

- Read requirements, architecture, and backend rules before schema work.
- Treat destructive migrations as high risk and require explicit confirmation.
- Consider uniqueness, indexes, foreign keys, soft deletes, audit fields, and rollback.

## Migration Requirements

- Explain up/down or equivalent rollback behavior.
- Explain whether data migration is required.
- Explain compatibility impact on existing data.
- Update `artifacts/db-migration.md`.
