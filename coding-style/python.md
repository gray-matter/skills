# Python

Baseline conventions for Python work.

## Environment & tooling

- Never use the global/system Python interpreter. Every project gets its own virtual environment.
- Use `uv` to manage the environment, dependencies, and running code (`uv venv`, `uv add`, `uv run`, `uv sync`). Don't reach for other tools (e.g. `pip`) unless the project already standardized on one of them.
- Project metadata and dependencies live in `pyproject.toml` per PEP 518 / PEP 621 — not `requirements.txt`, `setup.py`, or `setup.cfg`.

## Imports

- All imports go at the top of the file, per PEP 8's Imports section — no inline/deferred imports inside functions "to be safe" or for lazy loading, unless there's a proven circular-import or startup-cost reason.
- Don't guard imports with `try/except ImportError` for libraries the project depends on. If a required library is missing, let the `ImportError` surface — that's a setup bug, not a runtime case to handle gracefully.

## Typing

- Type-annotate function signatures and non-obvious variables, per PEP 484 (type hints) and PEP 526 (variable annotation syntax).
- Prefer built-in generics (`list[str]`, `dict[str, int]`) over `typing.List`/`typing.Dict` (PEP 585, Python ≥3.9).
- Treat annotations as checked, not decorative: run a type checker (`mypy` or `pyright`) as part of the dev loop.

## References

Citations only — the bullets above are the rules to apply. Don't fetch these unless the user explicitly asks for the spec's exact wording or an edge case genuinely isn't covered above.

- [PEP 8](https://peps.python.org/pep-0008/) — Style Guide for Python Code (imports section: `#imports`)
- [PEP 484](https://peps.python.org/pep-0484/) — Type Hints
- [PEP 526](https://peps.python.org/pep-0526/) — Syntax for Variable Annotations
- [PEP 585](https://peps.python.org/pep-0585/) — Type Hinting Generics In Standard Collections
- [PEP 518](https://peps.python.org/pep-0518/) — Specifying Minimum Build System Requirements (`pyproject.toml`)
- [PEP 621](https://peps.python.org/pep-0621/) — Storing Project Metadata in `pyproject.toml`
- [uv docs](https://docs.astral.sh/uv/) — tooling commands (not a PEP; uv is a third-party tool)
