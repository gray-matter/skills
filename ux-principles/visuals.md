# Visual & structural consistency

## **Design tokens**

- Centralize **color, radius, shadow, and semantic colors** (primary, danger, muted, error text) in CSS custom properties, with **light/dark** (or theme) variants on a root attribute.

## **Avoid flash of wrong theme**

- For user-chosen appearance, run a **tiny inline script before first paint** if needed so theme variables apply immediately.

## **Layout stability**

- Reserve **minimum height** for dynamic slots (test results, modals loading body) to reduce layout shift when content appears.

## **Prefer unambiguous primitives**

- When a visual effect has more than one way to build it, prefer the CSS primitive whose behavior is precisely specified over one that depends on engine-specific assumptions.
- Reach for the more robust primitive by default, not only after a cross-browser bug surfaces — the risk is invisible until someone tests in the engine you didn't.

## **Visual bugs are not verified by reading a property back**

- Confirm visual fixes against rendered pixels (a screenshot, or the user's own confirmation), never against the computed style matching expectation.
