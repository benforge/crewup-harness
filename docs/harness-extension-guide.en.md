# Harness Extension Guide

[中文](./harness-extension-guide.md) | English

This guide defines how to extend CrewUp without blurring the boundary between the core harness and the target project.

## Extension Points

| Extension | Location | Notes |
| --- | --- | --- |
| Skills mapping | `.harness/config/skills.yaml` | declares candidates, aliases, and installation mode |
| Project skills | `.agents/skills/<skill-name>/SKILL.md` | project-owned, copy with the repository if needed |
| Global skills | `%USERPROFILE%/.codex/skills/<skill-name>/SKILL.md` | personal cross-project skills |
| Agent roles | `.harness/agents/*.md` | reusable role prompts and responsibilities |
| Policies | `.harness/config/*.yaml` | delegation, model, risk, write, archive, quality gates |
| Rules | `.harness/rules/*.md` | reusable guardrails for frontend, backend, database, security, testing |
| Templates | `.harness/templates/*.md` | report and artifact skeletons |

## Skill Rule

CrewUp should reference skills, not own them.

- If the skill is project-specific, keep it in the project.
- If the skill is personal and reused across repos, keep it in the global Codex skills directory.
- If the skill only needs mapping or discovery, declare it in `.harness/config/skills.yaml`.

## Fallback Rule

If a skill or plugin is missing, the workflow should continue with:

1. project files
2. README
3. lockfiles
4. official docs links
5. ordinary context analysis

The absence of a plugin must not break the workflow.

## Init Rule

`crewup init` should infer the project shape from the real repository and generate the adaptation layer, but it must not pretend to know the project better than the repository evidence.

## Change Rule

When adding a new extension point, update:

- the docs
- the relevant policy or mapping file
- the check script if the new extension affects validation
