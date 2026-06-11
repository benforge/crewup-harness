# CrewUp Memory Hints

[中文](./memory-hints.md) | English

Memory Hints are CrewUp's lightweight lesson-reuse mechanism. The goal is not to push long historical run logs into every future context. The goal is to extract a few useful lessons from real delivery evidence, then promote only the valuable ones into later context.

## Design Goals

- Reduce repeated mistakes by preserving proven workflow lessons.
- Keep token cost low by selecting short hints instead of loading full run history.
- Preserve stability: candidate lessons do not automatically change routing, gates, or owner rules.
- Keep human judgment: maintainers explicitly promote lessons before they become active hints.

## Directory Layout

| Path | Purpose |
| --- | --- |
| `.harness/knowledge/lessons/candidates/` | Candidate lessons extracted from run evidence |
| `.harness/knowledge/lessons/active/` | Promoted lessons that can be selected for later runs |
| `.harness/knowledge/lessons/archived/` | Archived or rejected lessons |
| `.harness/knowledge/memory-hints.md` | Short hints for future context |
| `.harness/knowledge/recalled-lessons.md` | Audit record of recently selected lessons |
| `.harness/knowledge/lesson-index.json` | Machine-readable index |

## Commands

Extract candidate lessons from a run:

```bash
npx crewup learn <run-id>
```

Promote one candidate:

```bash
npx crewup learn-promote <lesson-id>
```

Archive a candidate or active lesson:

```bash
npx crewup learn-promote <lesson-id> --archive --reason="no longer useful"
```

Refresh the knowledge layer:

```bash
npx crewup knowledge
```

## Promotion Criteria

Good lessons usually have these traits:

- They come from real run evidence, not guesswork.
- They reduce repeated repair, bad routing, missed gates, or context waste.
- They are short enough to act as a future run hint.
- They are not tied to a one-off request, temporary filename, or removed command.

Avoid promoting:

- Long summaries of a single task.
- Historical notes that need lots of background to understand.
- Temporary workarounds that conflict with current workflow rules.
- Rules already enforced by code, tests, or documentation.

## Token Cost

Memory Hints should stay cheap. CrewUp does not load every candidate lesson by default, and it does not carry full historical runs into every task. Later runs select only relevant active hints and write the selected set to `recalled-lessons.md` for auditability.

If hints become long, repetitive, or stale, archive or rewrite them instead of appending more text.

## Relationship To Archive

`archive` may refresh the knowledge layer and generate candidate lessons during closeout, but that is not automatic activation. A lesson affects future context only after explicit `learn-promote`.

This boundary matters: CrewUp can learn from history without silently changing routing rules, owner boundaries, or gate outcomes.
