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
- Keep implementation claims close to repo-relative source references such as `src/app.ts:42`.
- Avoid agent-only jargon.
- Remove unused placeholder sections when generating real docs.
- Mark inferred commands, uncertain boundaries, and low-confidence feature candidates clearly.

## ID And Enum Rules

- Feature IDs use kebab-case.
- Confidence values are `high`, `medium`, or `low`.
- Feature status values are `candidate`, `documented`, or `deferred`.
- `schema_version` is `1.0.0` for this format.

## `walkthrough.json`

Required top-level fields:

| Field | Type | Purpose |
| --- | --- | --- |
| `schema_version` | string | Artifact interface version. |
| `generated_at` | string | ISO 8601 timestamp for the walkthrough generation. |
| `source_revision` | string | Git revision, release tag, or `unknown`; when it matches the current repo revision, agents should treat the pack as fresh without further validation. |
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
| `confidence` | string | `high`, `medium`, or `low`. |
| `doc` | string | Repo-relative feature Markdown path. |
| `evidence` | array | Source files or docs that support the feature interpretation. |

Evidence entries should include `path`, optional `line`, and `reason`.
