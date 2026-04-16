# Interaction & feedback

## **In-app overlays, not native dialogs**

- Avoid `alert`, `confirm`, and `prompt`. Use **modal overlays** (backdrop + focused panel) for forms, confirmations, and errors so tone, branding, and accessibility stay under your control.
- When a modal is open, **trap scroll** on the body (e.g. `body.modal-open { overflow: hidden }`) and sync open state for focus/ARIA as needed.

## **Destructive and irreversible actions**

- Use a **dedicated confirmation modal** with explicit copy and primary/secondary actions; never rely on a one-line system confirm.

## **Action-attached loading states (progressive disclosure of work)**

- Any control that triggers a **network round-trip** should enter a **busy state**: disabled control, optional `is-loading` styling, and label text that names the operation (`Saving…`, `Removing…`, `Loading…`) via something like `data-loading-text`.
- Restore the original label when the request settles (success or failure).

## **Pending / transitional regions (skeleton of trust)**

- While a region is **stale or refetching**, **de-emphasize** it: lower opacity, desaturate, or dim—paired with `aria-busy="true"` where appropriate.
- For long or ambiguous waits, add a **lightweight progress indicator** (spinner, subtle overlay) so users know the UI is working, not broken.

## **Abort superseded requests**

- When the user can trigger overlapping fetches (e.g. changing month quickly), **cancel obsolete requests** so late responses do not overwrite fresh UI state.
