# CrewUp Mode Picker

[中文](./mode-picker.md) | English

CrewUp does not guess a formal run mode from keywords when the user has not chosen one.

If a command would create a real run and it does not include `--mode` or `--profile`, CrewUp prints a mode picker and exits without creating a run.

## Why

Natural language is often ambiguous. A request can mention planning, implementation, risks, and ideas in the same sentence. If the harness guesses the wrong mode, the run meaning becomes confusing:

- A user wanted implementation, but got a plan-only run.
- A user wanted planning, but code changed.
- A small follow-up bugfix became a full strict workflow.

The mode picker makes the user choose the run contract before the run exists.

## Modes

| Choice | Mode | Use When | Creates Code Changes |
| --- | --- | --- | --- |
| A | `plan` | You only want planning, architecture, acceptance criteria, or a roadmap. | No |
| B | `lite-v2` | You want a small scoped implementation, one bugfix, one UI/copy change, or one phase from a plan. | Yes |
| C | `strict` | You want complete delivery for a larger feature or cross-module change with tester/reviewer/release evidence. | Yes |

## Run Behavior

This command does not create a run:

```bash
npx crewup run "Build a comment system"
```

It prints a picker with three copyable commands:

```bash
npx crewup run --mode=plan "Build a comment system"
npx crewup run --mode=lite "Build a comment system"
npx crewup run --mode=strict "Build a comment system"
```

These commands create runs immediately:

```bash
npx crewup run --mode=plan "Plan a comment system; do not write code"
npx crewup run --mode=lite "Fix the login button copy"
npx crewup run --mode=strict "Build a comment system"
```

## Continue Behavior

This command does not create a continuation run:

```bash
npx crewup continue <run-id> "Continue the work"
```

It prints a continuation picker and asks the user to choose:

```bash
npx crewup continue <run-id> --mode=plan "Continue the work"
npx crewup continue <run-id> --mode=lite "Continue the work"
npx crewup continue <run-id> --mode=strict "Continue the work"
```

If the source run is a `plan` run, the picker explains how to use the approved plan:

- choose `plan` to refine the plan only;
- choose `lite-v2` to implement one small phase;
- choose `strict` to implement the full approved plan.

## Recommended User Phrases

Use these when you already know the mode:

```text
Use CrewUp plan. Only plan the feature; do not change code.
Use CrewUp lite-v2. Fix this small runtime bug and run the necessary validation.
Use CrewUp strict. Implement the complete feature and run the full delivery workflow.
```

Use these when continuing from a plan:

```text
Continue this plan run with strict mode and implement the full plan.
Continue this plan run with lite-v2 and implement only the first phase.
```

## Product Rule

No explicit mode means no formal run is created.

The AI may recommend a mode, but the user chooses the mode.
