# Forms & inputs

## **Required fields (visible + semantic)**

- Mark mandatory fields with a **consistent visual** (e.g. red asterisk in a `.req-star` class) on the label.
- Keep the star **decorative for screen readers** (`aria-hidden="true"`) when the control already exposes `required` (or `aria-required`), so AT users are not told “star” twice.

## **Validation feedback**

- Prefer **inline, contextual errors** next to the form or in a modal error region with `aria-live="polite"` for async failures.
- Use native `required` where it matches server rules to get baseline behavior without extra JS.

## **Conditional requiredness**

- When “required” depends on another control (e.g. alarm time only if alarm is on), **toggle both** the visible star and validation logic together.

## **Minimal on-screen guidance**

- Default to **self-explanatory labels and controls**; avoid long help text on every field.
- Add **targeted instructions** only for **non-standard interactions** (keyboard modifiers, drag-and-drop, hidden gestures).

## **Status and success**

- Short, **transient status lines** next to the relevant control are enough for many saves; reserve prominent banners for page-level failures or rare states.
