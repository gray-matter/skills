# {{project_name}} Walkthrough

This walkthrough helps new contributors understand the repository from the top down. It can be read directly or used by an agent during an interactive tour.

## Start Here

- To run or test the project, read `docs/walkthrough/running.md`.
- To understand the system shape, read `docs/walkthrough/architecture.md`.
- To drill into a feature, choose one from the feature map below.

## Walkthrough Modes

- **Read-only:** read the overview and feature notes without stopping for prompts.
- **Guided navigation:** open the referenced files in order while an agent explains the path.

## Apps And Packages

| Name | Kind | Entry Points | Notes |
| --- | --- | --- | --- |
| {{app_name}} | {{app_kind}} | `{{entrypoint_path}}` | {{app_notes}} |

## Feature Map

| Feature | Status | Confidence | Start Here |
| --- | --- | --- | --- |
| {{feature_label}} | {{feature_status}} | {{feature_confidence}} | `docs/walkthrough/features/{{feature_id}}.md` |

## Suggested Paths

- **First pass:** `running.md` -> `architecture.md` -> one selected feature.
- **Changing code:** read the relevant feature doc, then reopen each referenced source file.
- **Debugging:** start from the failing command or test, then follow the feature evidence list.
- **Interactive start:** choose read-only overview or guided source navigation, then pick one feature from the map.

## Notes

{{notes}}
