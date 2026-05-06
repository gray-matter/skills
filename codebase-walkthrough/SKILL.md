---
name: codebase-walkthrough
description: Portable workflow for generating human-readable codebase walkthrough docs. Use when helping a human explore an unfamiliar repository, create reusable architecture/onboarding walkthrough artifacts, or refresh selected feature walkthrough docs.
---

# Codebase Walkthrough

Use this workflow to generate human-readable walkthrough docs for an unfamiliar codebase. The output should help a reader understand what the repository does, how it runs, how it is shaped, and where selected features live in source.

## Output

Generate walkthrough artifacts in the target repository at `docs/walkthrough/` unless the human asks for another location.

Required core artifacts:

- `index.md`
- `running.md`
- `architecture.md`
- `walkthrough.json`

Generate feature docs only for features the human selects or explicitly asks to document:

- `features/<feature-id>.md`

## Operating Principles

- Write Markdown for humans first and tools second.
- Use repo-relative `path:line` source references for files.
- Use trailing-slash repo-relative references such as `app/models/` for directories.
- Keep machine-oriented state in `walkthrough.json`, not in prose docs.
- Do not add Markdown generation banners, source revision lines, status/confidence labels, or other metadata summaries. If the value is needed, put it in `walkthrough.json`.
- Avoid framework-specific assumptions. Infer structure from the repository in front of you.
- Prefer selected feature drill-downs over documenting every feature upfront.
- Use `references/artifact-schema.md` as the source of truth for field names, enum values, and `walkthrough.json` structure.

## Generation Workflow

Generate or refresh the walkthrough pack in one content-generation pass. Inspect the repository, write or update the needed artifacts, validate them, and provide the viewer command.

If an existing `docs/walkthrough/walkthrough.json` exists, use it to preserve stable IDs, selected feature docs, prior notes, and the previous `source_revision`. Compare `source_revision` to the current repository revision with `git rev-parse HEAD` when Git is available so you can decide what content needs refresh.

Do not regenerate everything by default. Update the smallest useful set of artifacts:

- core docs when the repository has no walkthrough pack or the top-level understanding has changed
- selected feature docs when the human explicitly asks to document a selected feature or the pack is stale
- `walkthrough.json` whenever documented apps, features, evidence, timestamps, notes, or source revision changes

## Generation Steps

### 1. Establish Repo Context

Start from the target repository root. If the root is unclear, discover it with the surrounding environment; if it cannot be discovered, report that the repository path is required.

Inspect likely orientation sources before explaining anything:

- top-level README, contributor docs, architecture docs, changelogs, and existing project instructions
- package manifests, build files, workspace files, dependency locks, compose files, deploy files, and environment examples
- top-level source directories, app/package directories, tests, examples, scripts, migrations, templates, static assets, and generated-doc locations

Do not install dependencies, call external APIs, run migrations, or start services unless the human asks for that as part of the walkthrough.

### 2. Identify Apps And Runtime

Identify each runnable app, package, service, CLI, library entrypoint, notebook, or deployable unit. For each app, collect evidence for:

- what it is and who uses it
- how it is started or invoked
- how it is tested, linted, typechecked, built, or packaged
- required configuration or environment
- important runtime boundaries such as database, queue, browser, file system, network, or external services

Prefer commands already documented in repo files. If commands are inferred, mark them as inferred in `running.md` and `walkthrough.json`.

### 3. Identify Feature Candidates

Build feature candidates by clustering source evidence, not by applying a fixed framework taxonomy.

Useful evidence can include:

- user-facing pages, commands, routes, handlers, controllers, jobs, tasks, APIs, notebooks, or examples
- domain modules, services, models, repositories, schemas, migrations, or data fixtures
- tests and snapshots
- templates, UI assets, docs, or sample outputs
- recurring names across directories and files

For each candidate, record the fields defined in `references/artifact-schema.md`, including a stable ID, human label, short description, status, and evidence files with repo-relative paths.

If two candidates overlap, do not force a premature answer. Record the ambiguity in the notes and defer the merge/split decision unless the human already specified it.

### 4. Generate Core Docs And JSON

Use the templates in this bundle to create or update:

- `index.md`: entrypoint, project summary, app list, linked feature menu, and suggested reading paths
- `running.md`: setup/run/test/debug commands and operational notes
- `architecture.md`: top-down map from user-facing behavior to runtime, modules, data, and tests
- `walkthrough.json`: machine-readable companion map with the same apps/features/evidence

Keep generated docs concise. Refer to source evidence with repo-relative inline code spans such as `` `app/main.py:41` `` for files and `` `app/models/` `` for directories.

`walkthrough.json` should contain generation timestamps, source revision, feature status, evidence, and any machine-readable notes. Markdown should contain explanation, reading order, and source references only. The feature menu in `index.md` should be a simple list of feature labels linked to their docs; do not put feature IDs, status, or evidence tables there.

### 5. Generate Selected Feature Docs

For a requested feature, write or refresh `features/<feature-id>.md`.

Cover:

- user workflow or external behavior
- main code path from entrypoint to result
- implementation boundaries and responsibilities
- important data flow or state changes
- tests or examples that demonstrate expected behavior
- reading sequence with source references
- uncertainties and stale assumptions

Feature docs should stay focused on walkthrough content, source evidence, reading order, and uncertainty.

### 6. Validate And Provide Viewer Command

Before finishing, validate the generated artifacts:

- core docs exist under `docs/walkthrough/`
- docs are valid Markdown
- source references are repo-relative `path:line` values or trailing-slash directory paths
- referenced files and directories exist when they are source references
- `walkthrough.json` matches the documented apps and features
- selected feature docs are backed by explicit source evidence
- run/test commands are sourced from repo evidence or marked as inferred
- generated Markdown has no metadata banner, source revision line, status/confidence label, or viewer-specific URL

After validation, summarize what changed briefly and provide the command to open the viewer with absolute paths:

```sh
python /path/to/codebase-walkthrough/scripts/serve_viewer.py /path/to/repo
```

## Generalization Rules

- Infer repository shape from evidence, not from previous walkthroughs.
- Use the repository's own names for apps, packages, workflows, and boundaries.
- Keep optional tooling optional unless the human asks for it.
- Do not hide uncertainty. Mark uncertain interpretations and defer decisions when source evidence supports multiple readings.
