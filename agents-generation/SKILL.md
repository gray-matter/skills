---
name: agents-generation
description: Generate AGENTS.md for code repositories
---

# agents-generation

Paired with `readme-generation`. README covers setup, configuration, run, and layout for humans; AGENTS.md covers the dev loop, conventions, and gotchas for agents. Link across — never duplicate.

## Core principles

- **No overlap with README.** Dev-loop commands, behavioral conventions, and gotchas only. Setup, configuration, runtime usage, requirements (including dev tools), and the file tree live in README; reference them by section name.
- **Every line costs tokens on every agent turn.** Keep it short. Cut anything that restates what the code or README already shows.
- **Imperative, not narrative.** "Run X before Y" beats "We usually run X before Y".
- **Omit empty sections.** If there are no gotchas, delete the heading.
- **Link, don't inline.** Deeper explanations go in `docs/` and are pulled in on demand.
- **Nest for locality.** Area- or stack-specific rules belong in nested `AGENTS.md` files — they load only when the agent works there.

## Conventions vs README Layout

Conventions are *behavioral* — where new code goes, import boundaries, naming, which interpreter/package manager/task runner to invoke, repo-wide "always do X."

Include one pointer to the layout: `Module layout: see README **Layout**`. If every remaining convention bullet would restate a Layout comment, drop them and keep only the pointer. If only the pointer remains, delete the **Conventions** heading and merge the pointer into the opening line or **Commands** prose.

## Commands vs README Run

README **Run** is how a human uses the project after setup. AGENTS **Commands** is the *repeat* dev loop — test, lint, typecheck, format, codegen, and similar.

Default: don't copy README **Run** into the **Commands** block. Add a pointer: `Primary run workflow: same as README **Run**`.

Put Run steps inside **Commands** only when one applies:

- The primary workflow needs several ordered steps or a non-obvious entrypoint.
- In a monorepo, the run command for the component the agent usually edits differs from the top-level README **Run**.
- README **Run** is missing, outdated, or split across docs (fix README when you can).

## Root template

```markdown
# [Project title] — agent guide

[One sentence of orientation. Skip if README's opening paragraph is adjacent and sufficient.]

## Commands

[Dev-loop commands only. One fenced code block. One paste-ready command per line with a `# comment` stating purpose. Typical entries: test, lint, typecheck, format, codegen, and repo-specific maintenance commands (e.g. migrations, asset builds) when they exist. Omit setup — README owns that.]

[Immediately after the block: `Primary run workflow: same as README **Run**` — unless an exception above applies.]

## Conventions

- Module layout: see README **Layout**.
- [Behavioral bullets: where new code goes, import boundaries, naming, which interpreter/package manager to invoke, repo-wide rules.]
- [Delete any bullet that merely restates a Layout `#` comment.]

## Gotchas

- [Non-obvious constraints, e.g. migrations must be reversible.]
- [Generated or vendored paths not to edit, plus the command that regenerates them.]
- [Known ordering requirements, flaky tests, env quirks.]
- [Anti-patterns the team has explicitly rejected.]

## Glossary

[Add only when the repo has ≥3 project-specific terms that don't map to obvious file names. One line each. Otherwise omit the section.]

## Deeper docs

- [List only files that exist — `docs/*.md`, nested `AGENTS.md` for subpackages or areas, etc.]

[Omit the section if no such files exist.]
```

## Nested AGENTS.md (area-level)

Keep it short — only rules that apply inside that directory tree.

```markdown
# [Area name]

## Conventions

- [Pointer to where this area's layout is documented; do not duplicate path lists.]
- [Behavioral rules that apply inside this directory only.]

## Gotchas

- [Area-specific footguns.]

## Commands

[Only if different from root — e.g. a subpackage with its own test runner. Same format as root.]
```

## Writing checklist

- [ ] No overlap with README (setup, layout, run flow, dev tools).
- [ ] Every command is exact and copy-pastable.
- [ ] Every gotcha names a specific file, command, or behavior.
- [ ] All linked files exist.
- [ ] Empty sections removed.
