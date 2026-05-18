# Codebase Walkthrough

Codebase Walkthrough is a skill bundle for generating concise onboarding walkthrough packs under `docs/walkthrough/` in target repositories. It also includes a small Python-hosted Docsify viewer for reading those artifacts with clickable source references that open an inline local source viewer.

Agent-specific dev-loop guidance lives in [AGENTS.md](AGENTS.md).

## Requirements

- Any agent environment that can load this directory as a skill.
- Python 3.10+ for `scripts/serve_viewer.py`; the commands below use `python3.11`.
- A modern browser with access to jsDelivr when using the viewer, because `viewer/index.html` loads Docsify and source pages load Prism from the CDN.

## Setup

No package installation is required. From a checkout of the skills repository:

```sh
cd codebase-walkthrough
```

## Run

Generate or refresh walkthrough artifacts by invoking the `codebase-walkthrough` skill against a target repository.

To read an existing walkthrough pack, serve the target repository and open the printed URL:

```sh
python3.11 scripts/serve_viewer.py /path/to/target/repo
```

The target repository must contain `docs/walkthrough/walkthrough.json`. Use `--walkthrough-dir`, `--host`, or `--port` when the defaults do not match the target pack.

## Layout

```text
codebase-walkthrough/                 # Skill bundle for walkthrough generation and viewing
|-- AGENTS.md                         # Agent-specific dev loop, conventions, and gotchas
|-- README.md                         # Human setup, run, and layout guide
|-- SKILL.md                          # Skill instructions and generation workflow
|-- references/                       # Artifact contract documentation
|   `-- artifact-schema.md            # Canonical fields, enums, source-reference rules, and viewer behavior
|-- scripts/                          # Local helper commands
|   `-- serve_viewer.py               # Python stdlib server for rendering walkthrough artifacts and source files
|-- templates/                        # Markdown and JSON scaffolds for generated walkthrough packs
|   |-- architecture.md               # Architecture overview template
|   |-- index.md                      # Walkthrough landing page template
|   |-- running.md                    # Runtime and command template
|   |-- walkthrough.json              # Machine-readable map template
|   `-- features/                     # Selected feature walkthrough templates
|       `-- feature.md                # Feature drill-down template
`-- viewer/                           # Static Docsify-based walkthrough reader assets
    |-- app.js                        # Panel rendering, inline source-link handling, and prompt-copy behavior
    |-- index.html                    # Viewer shell and Docsify CDN imports
    `-- styles.css                    # Viewer layout, badges, forms, and responsive styles
```

## Additional Docs

- [references/artifact-schema.md](references/artifact-schema.md)
