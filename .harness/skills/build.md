# Build Skill SOP

Use this SOP when an agent needs to verify build health.

## Steps

1. Identify the affected scope from the run task, `.harness/knowledge/dev-map.md`, `.harness/project/profile.yaml`, package metadata, or local `.ai/rules.md`.
2. If the affected scope defines a local build command, run that command first.
3. If no scope-local command exists, use the project-level command configured in `.harness/project/profile.yaml`.
4. If no configured command exists, fall back to the package manager's conventional build command.
5. Record the command, exit code, and important output in `artifacts/test-report.md`.
6. If no command can be run, do not claim build success.

## Default Command

```bash
npm run build
```
