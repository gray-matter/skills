---
name: coding-style
description: Apply these conventions whenever writing, editing, or reviewing code, in any language. Points to the language-specific file to load.
---

# coding-style

Baseline conventions for code, regardless of project — unless the project's own AGENTS.md/README explicitly overrides one of these. Load only the file for the language currently in play.

## Comments

- Comments explain *why*, not *what* — the code already says what it does; a comment repeating that in English is dead weight.
- Write one only when it conveys something the code can't: intent, a non-obvious constraint, the reason for an unusual choice, a warning about a subtlety.
- If you're tempted to comment what a line does, rename things or restructure until the code says it, instead.
- An outdated comment is worse than no comment — don't add one you won't keep current.

## References

Citations only — the bullets above are the rules to apply. Don't fetch these unless the user explicitly asks for more detail.

- ["Coding Without Comments"](https://blog.codinghorror.com/coding-without-comments/) — Jeff Atwood, Coding Horror
- [Comment (computer programming)](https://en.wikipedia.org/wiki/Comment_(computer_programming)) — Wikipedia

## Languages

- **Python**: [python.md](python.md)
