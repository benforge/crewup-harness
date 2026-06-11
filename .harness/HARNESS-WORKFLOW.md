# Harness Workflow

CrewUp keeps the reusable workflow core under `.harness/` and generates project-specific adaptation under `.harness/project/`.

## Core flow

```text
doctor -> install -> inspect -> init -> check -> run -> verify -> review -> finish
```

## What the core owns

- orchestration rules
- agent roles
- policies
- validation
- templates
- runtime scripts

## What the project owns

- detected package manager
- repo shape and module map
- language-specific rules
- testing rules
- domain rules

## What a run should produce

- input
- state
- tasks
- artifacts
- logs
- summary report

## Lite-v2 opt-in run shape

`lite-v2` is a lightweight explicit profile for low-risk scoped tasks:

```bash
npx crewup run --profile=lite-v2 "Fix a small UI issue and run validation"
```

It produces root-level lightweight evidence instead of strict owner artifacts:

- `spec.md`
- `tasks.md`
- `validation.md`
- `summary.md`

It does not create native subagent tasks or `native-subagent-plan.json`. The strict workflow remains unchanged for default, standard, and full runs.

## Close rule

Do not call a run complete until the workflow has a report, verification, review, and archive decision.

For `lite-v2`, closeout means `validation.md` and `summary.md` are updated from pending template state and `crewup finish <run-id>` archives `outcome=success`.
