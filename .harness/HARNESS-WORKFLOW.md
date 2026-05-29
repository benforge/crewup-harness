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

## Close rule

Do not call a run complete until the workflow has a report, verification, review, and archive decision.
