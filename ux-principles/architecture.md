# Information architecture & codebase structure

## **Modular surfaces (separation of concerns)**

- **Page shell vs. feature chrome**: Keep a thin layout (navigation, global styles, shared scripts) in a base template; mount each screen’s markup, styles, and behavior in dedicated files.
- **Composable partials**: Break cards, grids, and repeated blocks into include-friendly fragments so each file stays a single conceptual unit—easier for humans and for tools that work with limited context.
- **Co-located assets**: Pair each major view with its own CSS and JS loaded only on that view (e.g. via template blocks), avoiding one monolithic bundle for the whole app.

## **Context-sized files**

- Prefer **many small, named files** over few large ones when it does not hurt caching or HTTP overhead—especially for templates and scripts that agents or reviewers load whole.

## **Cache-safe static URLs**

- **Fingerprint static asset URLs** (prefer a content hash) when deploys should let browsers cache each version for a long time; a changed file then gets a new URL.
- Use **ETags or other revalidation** when an asset keeps the same URL and clients should check whether it changed. ETags validate a cached response; they do not give a changed asset a new identity, so they are not a replacement for fingerprinted URLs when using long-lived caching.
- Choose the URL versioning and HTTP cache headers together for the app’s deployment setup. A generated version query parameter can work for small server-rendered apps, but should change reliably whenever the file changes.

## **Progressive enhancement & hybrid delivery**

- **Server-render first**: Ship meaningful HTML from the server; enhance with HTMX and `fetch` for partial updates and secondary data.
- **Non-blocking shell**: Let the initial paint complete with layout and placeholders, then **hydrate or fetch** richer data .
- **Stable listeners across DOM swaps**: Attach behavior to `document` (or other ancestors that outlive swapped regions) when inner fragments are replaced via HTMX or similar.
