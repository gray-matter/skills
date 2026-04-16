# Information architecture & codebase structure

## **Modular surfaces (separation of concerns)**

- **Page shell vs. feature chrome**: Keep a thin layout (navigation, global styles, shared scripts) in a base template; mount each screen’s markup, styles, and behavior in dedicated files.
- **Composable partials**: Break cards, grids, and repeated blocks into include-friendly fragments so each file stays a single conceptual unit—easier for humans and for tools that work with limited context.
- **Co-located assets**: Pair each major view with its own CSS and JS loaded only on that view (e.g. via template blocks), avoiding one monolithic bundle for the whole app.

## **Context-sized files**

- Prefer **many small, named files** over few large ones when it does not hurt caching or HTTP overhead—especially for templates and scripts that agents or reviewers load whole.

## **Cache-safe static URLs**

- **Fingerprint static assets** so browsers always pick up changes after deploy: append a version query parameter derived from the file’s identity on disk (e.g. last-modified time) or from a **content hash** at build time.
- Hashes are stricter (two files with the same mtime can still confuse caches); mtimes are simpler for small server-rendered apps.

## **Progressive enhancement & hybrid delivery**

- **Server-render first**: Ship meaningful HTML from the server; enhance with HTMX and `fetch` for partial updates and secondary data.
- **Non-blocking shell**: Let the initial paint complete with layout and placeholders, then **hydrate or fetch** richer data .
- **Stable listeners across DOM swaps**: Attach behavior to `document` (or other ancestors that outlive swapped regions) when inner fragments are replaced via HTMX or similar.
