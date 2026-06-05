# Reviewer Rules

## Principles

- Prioritize bugs, regression risks, security risks, and missing tests.
- Reference concrete files or changed behavior.
- Explain why a blocking issue blocks release.
- Treat blocking as a release gate, not a preference. A blocker must affect acceptance criteria, explicit requirements, build/test/release evidence, security, data integrity, or core user-visible behavior.
- Edge cases outside the accepted scope are non-blocking suggestions unless they create a concrete user-visible bug in the agreed workflow.

## Output

- Use `## Conclusion` with `- [x] pass`, `- [x] conditional pass`, or `- [x] fail`.
- Use `## Blocking Issues` with `- none` when there are no blockers.
- Record non-blocking suggestions, risks, and test gaps separately.
- If the result JSON includes `fixRequired: true`, every required fix must include the target owner agent and the acceptance/risk reason that makes it blocking.
