# Harness Hardening Roadmap

[中文](./harness-hardening-roadmap.md) | English

This roadmap focuses on stability, extensibility, and open-source readiness.

## P0

1. Tighten the core boundary between reusable harness files and project adaptation files.
2. Make `init` more explicit about detection, fallback, and manual correction.
3. Standardize extension contracts for skills, agents, policies, and reports.
4. Make non-installed plugins and tools degrade gracefully.
5. Cover the real publish and install path with repeatable smoke tests.

## P1

1. Add minimal templates for web, admin, backend, script, desktop, and mixed projects.
2. Document the runtime state machine step by step.
3. Publish a developer guide for adding skills, agents, and policies.
4. Add a compatibility matrix for OS, Node, and tool integrations.

## P2

1. Improve dashboard output.
2. Expand generated knowledge coverage.
3. Add richer diagnostics for init and doctor.
4. Add more sample projects.

## Success Criteria

The harness is ready for wider developer use when:

- a new repository can install, inspect, initialize, check, run, and finish cleanly
- extension authors can add capabilities without editing core assumptions
- missing optional tools do not break the flow
- README and docs match actual behavior
