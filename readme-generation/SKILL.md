---
name: readme-generation
description: Generate README.md for code repositories
---

# readme-generation

```markdown
# [Project title]

[One-paragraph high-level **functional** view of repo's main tool or app. Do not mention any specific library, technology or brand name in this specific section]

## Requirements

- [Tool 1 with minimum version if applicable]
- [Tool 2]

## Setup

[Exact commands to run to prepare the project to run in a fresh environment, wrapped in a code block, with no tool or runtime version assumption]

## Configuration

[Command to run to create a fresh configuration, in a code block]
[No prose at all if configuration is self-documenting]

## Run

[How to start the service or run tools]
[Minimal prose **only** if some action is necessary after running the command above. No mention of configuration]

## Layout

Produce a `tree`-style layout with `#` end-of-line comments (aligned where practical).

**Include (expand as needed, not limited to depth 2):** Application entrypoint, configuration, database/migrations, domain or route modules, integrations, main features. Include a summary for each line.

**May summarize instead of expanding:** Generated caches, vendored assets, or many small files of the same kind -- use one tree line plus a comment (e.g. `├── static/js/plant_form/   # modular form scripts`).

**Goal:** Trade length for signal—enough depth and naming that a **contributor** or **agent** can jump to the correct file without pasting the entire repository.

```
