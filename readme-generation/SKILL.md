---
name: readme-generation
description: Generate README.md for code repositories
---

# readme-generation

Paired with `agents-generation`. README is for humans (contributors and users) and covers setup, configuration, run, and layout. Agent-specific guidance (dev loop, conventions, gotchas) lives in `AGENTS.md` — link, don't duplicate.

**Scope:** Sections below assume a runnable project (service, CLI, app, notebook). For library-only repos, replace **Run** with **Usage** (minimal import + call example) and drop sections that don't apply.

## Template

```markdown
# [Project title]

[One-paragraph summary: what the project does and who it's for. Naming the primary language or framework is fine when it meaningfully orients readers (e.g. "A Rust CLI for …"). Avoid a feature dump.]

## Requirements

- [Runtime or tool with minimum version if applicable]
- [Dev-only tools the contributor must install locally: test runner, formatter, linter, task runner, etc. Setup and all commands below assume these are installed.]

## Setup

[Exact commands to prepare a fresh clone for development, in a code block. No runtime version assumptions — Requirements lists those.]

## Configuration

[Command(s) to create a fresh configuration, in a code block. Omit the section entirely if the project has no user-facing configuration. Omit prose if the generated config is self-explanatory.]

## Run

[How to start the service, run the CLI, open the notebook, or otherwise *use* the project after setup. Minimal prose only for actions that can't be expressed as commands. For libraries, replace with **Usage** showing a minimal example.]

## Layout

Produce a `tree`-style diagram with `#` end-of-line comments (aligned where practical).

**Include (expand as needed, not limited to depth 2):** application entrypoint(s), runtime/user-facing configuration (env templates, app config modules, deploy manifests when they explain behavior), database/migrations, domain or route modules, integrations, main features, dependency manifests. One summary comment per line.

**Omit from the tree** (unless they are the primary subject of the repo): files that only wire local developer tooling — editor hints, language-server configs, test-runner option files, formatter/linter configs, CI-only YAML. Contributors discover these via docs or their IDE; listing them adds noise.

**May summarize instead of expanding:** generated caches, vendored assets, or many small files of the same kind — one tree line plus a summary comment.

**Goal:** trade length for signal — enough depth and naming that a contributor or agent can jump to the correct file without reading the whole repo.

## License

[One line, e.g. `MIT — see LICENSE`. Omit if private/unlicensed.]
```
