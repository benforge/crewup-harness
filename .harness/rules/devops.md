# DevOps Rules

## Principles

- CI/CD, deployment, environment variables, and infrastructure changes are high-risk areas.
- Explain impact before changing `.github/workflows/**`, `infra/**`, or deployment files.
- Never write secrets, tokens, or account credentials into the repository.

## Output

- Record deployment steps, verification steps, and rollback method.
- For environment variables, record only variable names and purpose, never real values.
