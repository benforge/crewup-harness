# Fullstack Blog Planning Case

Copy this into the chat window:

```text
Use CrewUp to plan a fullstack blog system. In this phase, only do requirements clarification, technology selection suggestions, directory structure design, module boundaries, development phase breakdown, and acceptance criteria. Do not write business code. The system includes a public blog frontend, Admin backend UI, backend API, and database.
```

Expected flow:

```text
requirements-plan -> requirements -> architect -> reviewer
```

Use this case to verify:

- plan-only profile detection
- `requirement-plan.md` is written by the requirements-plan agent
- `requirement.md` is written by the requirements agent
- `architecture.md` and `implementation-plan.md` are written by the architect agent
- the main agent does not author planning artifacts

Check commands:

```bash
npx crewup next-agent <run-id>
npx crewup audit <run-id>
npx crewup gate-check <run-id>
```
