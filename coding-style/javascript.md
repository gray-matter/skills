# JavaScript

Baseline conventions for JavaScript work. Follow the project’s runtime, module system, and tooling when they are already established.

## Basics

- Declare values with `const` by default; use `let` only when a value must be reassigned. Avoid `var`.
- Compare values with `===` and `!==`. Convert values explicitly when types might differ instead of relying on JavaScript’s implicit coercion.

## Modules and data

- Use the module system already used by the project. Keep dependencies explicit with imports and exports; avoid adding new globals.
- Treat data from users, the network, and browser storage as untrusted. Check its shape before using it.
- When putting text into the page, use `textContent`. Avoid `innerHTML` for untrusted content, and never use `eval`.

## Async code and errors

- Use `async`/`await` to make promise-based code easier to follow. Handle failures or let them reach a caller that can handle them; don’t silently discard rejected promises.
- Use `Promise.all` for independent work that can run together. Use `for...of` with `await` when each step depends on the previous one.
- Catch errors where you can recover or add useful context. Avoid empty `catch` blocks.

## Types

- Use TypeScript when the project already uses it. In JavaScript projects, add JSDoc types for reusable functions or values whose expected shape is not obvious.

## References

Citations only — the bullets above are the rules to apply. Don’t fetch these unless the user asks for more detail or an edge case is unclear.

- [JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) — MDN
- [Strict equality](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality) — MDN
- [Cross-site scripting (XSS)](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS) — MDN
