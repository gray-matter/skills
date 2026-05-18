# Codebase Walkthrough - agent guide

Use this for repo-specific dev-loop details. Human setup and runtime usage live in README **Setup** and **Run**.

## Commands

```sh
python3.11 -m py_compile scripts/serve_viewer.py # validate the Python viewer server
```

Primary run workflow: same as README **Run**.

## Conventions

- Module layout: see README **Layout**.
- Keep the workflow contract in `SKILL.md`; update `references/artifact-schema.md` when schema fields, enum values, source-reference rules, or viewer behavior change.
- Keep generated pack scaffolds under `templates/`; use `{{placeholder}}` names consistently across Markdown and JSON templates.
- Keep the viewer runtime self-contained: `scripts/serve_viewer.py` uses Python stdlib, and browser behavior stays in `viewer/app.js` and `viewer/styles.css`.
- Keep generated Markdown rules aligned across `SKILL.md`, `templates/`, and `references/artifact-schema.md`.

## Gotchas

- `scripts/serve_viewer.py` exits before serving unless the target repo has the configured walkthrough directory and `walkthrough.json`.
- `viewer/index.html` loads Docsify from jsDelivr, and source pages load Prism from jsDelivr; browser smoke tests need network access or a cached CDN response.
- Source references must remain repo-relative `path:line` text or trailing-slash directory paths; do not bake source-viewer URLs into generated Markdown.
