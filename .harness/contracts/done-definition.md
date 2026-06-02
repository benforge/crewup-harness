# Definition Of Done

A formal run is complete only when all applicable conditions are satisfied.

- [ ] Goals and non-goals are clear.
- [ ] Acceptance criteria are verified one by one.
- [ ] Code, configuration, and documentation changes inside impact scope are handled.
- [ ] Tests have run, or limitations are documented.
- [ ] Review has no blocking issues.
- [ ] API, database, environment, deployment, and rollback changes are recorded when applicable.
- [ ] Release summary and rollback strategy are written.
- [ ] Run state is updated.
- [ ] Native subagent results are captured; every result-marked agent has `logs/native-subagents/<agent>.result.md`.
- [ ] All close_required agents are closed before archive.
- [ ] Archive reminder is generated and the git worktree is checked for unrelated changes.
- [ ] Archive commit is created when policy allows it, or skip/failure reason is logged.
