# CrewUp Test Matrix

[中文](./test-matrix.md) | English

This document is for maintainers. Use it to decide which tests a change should run.

## Fast Checks

```bash
npm run harness:check
npm test
```

Covers:

- harness config, script, and template integrity
- YAML / JSON parsing
- suspicious UTF-8/mojibake checks for `.harness/` and, in the template package, public `docs/` / README files
- minimal example smoke test

## Install And Upgrade Matrix

```bash
npm run test:install-flow
```

Covers:

- local `npm pack` tarball installation
- `crewup install`
- `crewup install --force` preserving `.harness/runs/`, `.harness/knowledge/`, `.harness/project/`, `.harness/reports/`, and `.harness/dashboard/`
- `crewup install --reset` deleting old `.harness/` before reinstall
- `.harness/core-lock.json` generation and sealed core drift detection
- `doctor` / `check` in an installed target project

## Strict Workflow Matrix

```bash
npm run harness:test-flow
```

Covers:

- run creation and semantic runId generation
- explicit `lite` opt-in behavior
- `lite` lightweight files: `spec.md`, `tasks.md`, `validation.md`, `summary.md`
- `lite` pending-finish protection and success archive
- run branch creation and dirty baseline recording
- `requirements-plan -> requirements -> architect` ordering
- implementation agents waiting for exact `implementation-plan.md` assignments
- `next-agent` runnable / blocked output
- owner artifact provenance blocking
- tester/reviewer repair routing
- `changed-files` / `gate-check` overreach protection
- cancel / archive / continue lifecycle

## Release Preflight

```bash
npm run release:preflight
```

Covers:

- `harness:check`
- `npm test`
- `test:install-flow`
- full pack-install workflow
- `npm pack --dry-run`

## Which Test To Run

| Change type | Recommended test |
| --- | --- |
| install, upgrade, core-lock, CLI install | `npm run test:install-flow` |
| `lite` mode, lightweight closeout, docs links | `npm run harness:test-flow` + `npm run harness:check` |
| agent ordering, run lifecycle, gates, repair | `npm run harness:test-flow` |
| small docs or config changes | `npm run harness:check` |
| before publishing | `npm run release:preflight` |

## Maintenance Principles

- When adding a CLI command, add required-path or flow coverage.
- When changing install / force / reset, update `test:install-flow`.
- When changing workflow order, agent gating, owner artifacts, or repair rules, update `harness:test-flow`.
- Do not patch `.harness` inside a real user project after discovering an issue. Add a regression test in the CrewUp source repository first, then fix the implementation.
