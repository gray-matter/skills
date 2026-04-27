---
name: codebase-walkthrough
description: Portable workflow for agents to create and use human-readable codebase walkthrough docs. Use when helping a human explore an unfamiliar repository, generate reusable architecture/onboarding walkthrough artifacts, or guide an interactive read-only or source-navigation tour of selected codebase features.
---

# Codebase Walkthrough

Use this workflow to help a human understand an unfamiliar codebase through generated, human-readable walkthrough docs and an interactive chat or IDE session. The workflow is portable across agent environments and does not assume Codex, Cursor, Claude, or any specific harness.

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

- Write Markdown for humans first and agents second.
- Use repo-relative `path:line` source references so files are easy to open from any editor.
- Put machine-oriented metadata in `walkthrough.json`, not in prose docs.
- Treat generated docs as a reusable map, not as ground truth. Reopen source files before making precise behavioral claims, giving code-change advice, or responding where the source may have changed.
- Avoid framework-specific assumptions. Infer structure from the repository in front of you.
- Prefer selected feature drill-downs over documenting every feature upfront.
- Use `references/artifact-schema.md` as the source of truth for field names, enum values, and `walkthrough.json` structure.
- Use native clickable choice UI when the host environment provides it; otherwise present concise numbered choices in plain text.

## Two-Phase Model

Use the workflow in two phases.

### Freshness Gate

Before Phase A, check whether `docs/walkthrough/walkthrough.json` exists. If it exists, compare its `source_revision` to the current repository revision, using `git rev-parse HEAD` when Git is available.

If `source_revision` matches the current repository revision, treat the walkthrough pack as fresh and good to use. Do not inspect the repository, validate source references, regenerate files, or refresh docs just to confirm the pack. Start Phase B from the saved walkthrough files.

Use Phase A only when the pack is missing, `source_revision` is missing or `unknown`, the current revision cannot be compared, the revision differs, or the human explicitly asks to refresh/regenerate docs.

### Phase A: Build Or Refresh The Walkthrough Pack

Use this phase when the freshness gate says the walkthrough pack is missing or stale, or when the human explicitly asks to generate or refresh docs for a selected feature. Inspect the repository, write or update the needed walkthrough artifacts, and record uncertainty clearly.

Do not regenerate everything by default. Update the smallest useful set of artifacts:

- core docs when the repository has no walkthrough pack or the top-level understanding has changed
- selected feature docs when the human explicitly asks to document a selected feature or the pack is stale
- `walkthrough.json` whenever documented apps, features, evidence, or source revision changes

After Phase A, do not stop at "the files are generated." Transition directly to Phase B by asking the human where to start.

### Phase B: Guide From The Walkthrough Pack

Use this phase when suitable walkthrough artifacts already exist. Read `docs/walkthrough/index.md`, `architecture.md`, `running.md`, `walkthrough.json`, and any selected feature doc before exploring the full repository.

During the guided session, use the saved docs for orientation and reopen source files only when:

- the human asks for implementation details
- a claim depends on exact current code
- the referenced source changed or may be stale
- the saved docs are incomplete, ambiguous, or low confidence

When new source inspection produces durable onboarding value, update the relevant walkthrough artifact.

## Phase A Steps

### 1. Establish Repo Context

Start from the target repository root. If the root is unclear, discover it with the surrounding environment or ask the human for the path.

Inspect likely orientation sources before explaining anything:

- top-level README, contributor docs, architecture docs, changelogs, and existing agent instructions
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

For each candidate, record the fields defined in `references/artifact-schema.md`, including a stable ID, human label, short description, confidence, status, and evidence files with repo-relative paths.

If two candidates overlap, do not force a premature answer. Present the ambiguity to the human and ask whether to merge, split, or defer.

### 4. Generate Core Docs

Use the templates in this bundle to create or update:

- `index.md`: entrypoint, audience, modes, app list, feature menu, and suggested paths
- `running.md`: setup/run/test/debug commands and operational notes
- `architecture.md`: top-down map from user-facing behavior to runtime, modules, data, and tests
- `walkthrough.json`: machine-readable companion map with the same apps/features/evidence

Keep generated docs concise enough to read directly in an editor. Link to source evidence instead of copying long code.

After generating or refreshing docs, validate the files, summarize what changed briefly, then ask the Phase B start prompt in the same response.

## Phase B Steps

### 1. Ask Where To Start

Ask the human for a starting point before drilling into a feature. Use concrete choices from `walkthrough.json` and `index.md`; do not only describe "next steps."

The prompt must include:

- mode choices: read-only overview or guided source navigation
- the discovered apps, packages, features, or workflows
- one recommended starting point with a short reason
- a direct question that invites the human to choose

If the host environment exposes a native choice prompt, use it for this start prompt. Keep the choices mutually exclusive and short. If no native choice prompt is available, use a numbered list.

Example:

```text
Where do you want to start?
1. Read-only architecture overview
2. Guided source tour of <recommended-feature> (recommended because it crosses the main app layers)
3. Guided source tour of <another-feature>
4. Runtime and test workflow
```

If the human already selected a feature, ask only for the mode and then start the walkthrough.

### 2. Feature Drill-Down

For each selected feature, read `features/<feature-id>.md` when it exists. If it is missing but `walkthrough.json.source_revision` matches the current repository revision, continue from `index.md`, `architecture.md`, and `walkthrough.json` evidence; ask whether the human wants a dedicated feature doc generated, but do not automatically inspect the repo. If the feature doc is missing or stale and the revision does not match, return to Phase A before continuing.

Cover:

- user workflow or external behavior
- main code path from entrypoint to result
- implementation boundaries and responsibilities
- important data flow or state changes
- tests or examples that demonstrate expected behavior
- reading sequence with source references
- uncertainties, low-confidence areas, and stale assumptions

Feature docs should stay focused on walkthrough content, source evidence, reading order, and uncertainty.

### 3. Interactive Walkthrough

During the live walkthrough:

- Start top-down before drilling into individual files.
- Reuse generated docs for orientation, then open source files when details matter.
- Show source references near every claim that depends on implementation details.
- Pause at natural boundaries and let the human choose whether to continue, switch features, or inspect source.

When the human asks about code not covered by the generated docs, inspect the source and then update the relevant walkthrough artifact if the answer adds durable onboarding value.

## Generalization Rules

- Infer repository shape from evidence, not from previous walkthroughs.
- Use the repository's own names for apps, packages, workflows, and boundaries.
- Keep optional tooling optional unless the human asks for it.
- Do not hide uncertainty. Mark low-confidence interpretations and request a decision only when source evidence supports multiple readings.

## Completion Checklist

Before considering a walkthrough draft complete, verify:

- core docs exist under `docs/walkthrough/`
- docs are readable without an agent
- source references are repo-relative and point to real files
- `walkthrough.json` matches the documented apps and features
- selected feature docs are backed by explicit source evidence
- run/test commands are sourced from repo evidence or marked as inferred
- no platform-specific adapter is required to use the walkthrough
- after any Phase A generation, the agent asks a concrete Phase B start prompt instead of ending at file creation
