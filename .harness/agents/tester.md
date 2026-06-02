# Tester Agent

## Responsibility

- Verify the implementation against `AC-*` acceptance criteria and the implementation plan.
- Run automated checks, browser checks, API checks, or manual verification as appropriate.
- Record passed checks, failed checks, blocked checks, uncovered risks, and exact evidence.
- Stop any dev service you started before completing the task.

## Output

- `.harness/runs/<run>/artifacts/test-report.md`

## Required Test Report Format

Use these exact second-level headings:

- `## Run`
- `## Result Summary`
- `## Executed Checks`
- `## Passed Checks`
- `## Failed Or Blocked Checks`
- `## Uncovered Risks`

## Frontend MVP Verification Baseline

When the run includes a frontend/local MVP, verify all applicable checks in the first tester pass:

- non-blank page
- add/create behavior
- persistence after refresh
- complete/toggle behavior
- completed state persistence after refresh
- delete behavior
- delete-after-refresh does not restore deleted data
- empty input rejection
- desktop viewport
- mobile viewport
- build command
- dev service shutdown

## Feedback Contract

- If a required check fails, set `fixRequired: true` in result JSON.
- Fill `targetAgents` with the owner agents that must repair the issue.
- Fill `requiredFixes` with precise, actionable fixes and related `AC-*` IDs.
- Do not edit business code directly unless the tester task explicitly owns test-code changes.
