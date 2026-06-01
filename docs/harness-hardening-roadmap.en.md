# Harness Hardening Roadmap

[中文](./harness-hardening-roadmap.md) | English

This roadmap focuses on stability, extensibility, and open-source readiness.

## P0

1. Done: tighten the core boundary between reusable harness files and project adaptation files.
2. Done: make `init` more explicit about detection, fallback, and manual correction.
3. Done: add explicit opt-in scope policy so installation does not capture normal chat.
4. Done: add artifact provenance and no-code gates to keep the main agent in orchestration.
5. Done: cover the real publish and install path with a repeatable pack-install test.

## P1

1. Add minimal templates for web, admin, backend, script, desktop, and mixed projects.
2. Document the runtime state machine and stage transition rules step by step.
3. Publish a developer guide for adding skills, agents, and policies.
4. Add a compatibility matrix for OS, Node, and tool integrations.
5. Add more bridge runner result JSON examples and failure-recovery examples.

## P2

1. Improve dashboard output.
2. Expand generated knowledge coverage.
3. Add richer diagnostics for init and doctor.
4. Add more sample projects.

## Success Criteria

The harness is ready for wider developer use when:

- a new repository can install, inspect, initialize, check, run, and finish cleanly
- npm tarball installation path passes `npm run test:pack-install`
- extension authors can add capabilities without editing core assumptions
- missing optional tools do not break the flow
- README and docs match actual behavior
