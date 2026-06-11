# Counter MVP Full Development Loop

Copy this into the chat window:

```text
Use CrewUp to build a tiny counter web app and run the full workflow. Acceptance criteria: page shows counter, initial value is 0, +1/-1/reset work, and value persists after refresh. Scope: tiny frontend only; no backend, database, auth, or routing. Discover and run the necessary validation from the project configuration.
```

Expected flow:

```text
requirements-plan -> requirements -> architect -> frontend -> tester -> reviewer -> release
```

Verification commands:

```bash
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
npx crewup report <run-id>
```

Watch for:

- initial runnable agent should only be `requirements-plan`
- `architect` should not run in parallel with `requirements`
- `frontend` should start only after `implementation-plan.md` assigns it
- the main agent should not write business code directly
- tester/reviewer feedback should be delegated back to `frontend`
