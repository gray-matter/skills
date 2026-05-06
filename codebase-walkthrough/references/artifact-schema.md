# Walkthrough Artifact Schema

This reference defines the walkthrough artifact interface. Generated artifacts live in `docs/walkthrough/` by default.

## Directory Layout

```text
docs/walkthrough/
  index.md
  running.md
  architecture.md
  walkthrough.json
  features/
    <feature-id>.md
```

`features/` contains only selected or requested feature drill-downs. A repo does not need full feature coverage for the walkthrough to be useful.

## Markdown Rules

- Write for humans first.
- Use concise headings and paragraphs.
- Keep implementation claims close to repo-relative source references such as `src/app.ts:42` for files or `src/app/` for directories.
- Do not embed source-viewer URLs in generated Markdown.
- Do not add generation banners, source revision lines, feature status/confidence labels, or other machine-readable state to generated Markdown.
- Avoid assistant-only jargon.
- Remove unused placeholder sections when generating real docs.
- Mark inferred commands, uncertain boundaries, and unresolved assumptions clearly.

## ID And Enum Rules

- Feature IDs use kebab-case.
- Feature status values are `candidate`, `documented`, or `deferred`.
- `schema_version` is `1.0.0` for this format.

## `walkthrough.json`

Required top-level fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `schema_version` | string | Artifact interface version. |
| `generated_at` | string | ISO 8601 timestamp for the walkthrough generation. |
| `source_revision` | string | Git revision, release tag, or `unknown`; when it matches the current repo revision, the pack can be treated as fresh without further validation. |
| `target_path` | string | Artifact location, usually `docs/walkthrough`. |
| `project` | object | Project name and short summary. |
| `apps` | array | Runnable apps, packages, services, CLIs, libraries, or deployable units. |
| `features` | array | Candidate and documented features. |
| `notes` | array | Cross-cutting uncertainty, stale assumptions, or follow-up notes. |

Required app fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | string | Stable kebab-case app/package identifier. |
| `name` | string | Human label. |
| `kind` | string | Human-readable type, such as application, CLI, library, worker, package, or unknown. |
| `entrypoints` | array | Repo-relative entrypoint files or commands. |
| `run_commands` | array | Commands with evidence and inferred flag. |
| `test_commands` | array | Commands with evidence and inferred flag. |

Required feature fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | string | Stable kebab-case feature identifier. |
| `label` | string | Human label. |
| `description` | string | Short explanation of the user-facing or developer-facing workflow. |
| `status` | string | `candidate`, `documented`, or `deferred`. |
| `doc` | string | Repo-relative feature Markdown path. |
| `evidence` | array | Source files or docs that support the feature interpretation. |

Evidence entries should include `path`, optional `line`, and `reason`.

## Source References

Generated artifacts store source evidence, not source-viewer decisions. Keep references as repo-relative paths plus optional line numbers. Use a trailing slash for directory references:

```md
See `app/main.py:41`.
The models live under `app/models/`.
```

The reusable viewer resolves these references at browse time. Viewer source-link settings are presentation state and are not written into generated Markdown or `walkthrough.json`.

## Skill-Hosted Viewer

The viewer assets live in the `codebase-walkthrough` skill directory, not in generated repositories. To view a pack, serve it through:

```sh
python /path/to/codebase-walkthrough/scripts/serve_viewer.py /path/to/repo
```

The server uses Python stdlib, serves this skill's `viewer/` assets, exposes the target repo's generated `docs/walkthrough/` files under `/walkthrough/`, exposes local repo browsing under `/browse/` for directory references, and exposes inferred local context under `/api/context`.
