# Visual & structural consistency

## **Design tokens**

- Centralize **color, radius, shadow, and semantic colors** (primary, danger, muted, error text) in CSS custom properties, with **light/dark** (or theme) variants on a root attribute.

## **Avoid flash of wrong theme**

- For user-chosen appearance, run a **tiny inline script before first paint** if needed so theme variables apply immediately.

## **Layout stability**

- Reserve **minimum height** for dynamic slots (test results, modals loading body) to reduce layout shift when content appears.
