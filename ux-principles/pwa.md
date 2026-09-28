# PWA install checklist

## Manifest (`manifest.webmanifest`)

- `name`, `short_name`, `start_url`, `scope`, `display: "standalone"` (or `fullscreen`/`minimal-ui`).
- Icons as **real files** (PNG), never `data:` URIs — some engines' installability checks skip inline icons.
- At least one icon **192×192** and one **512×512** (512 is required for the splash/store listing).
- Include a `purpose: "maskable"` icon set (192 + 512) alongside the default `purpose: "any"` set, for Android adaptive icons.
- Serve with `Content-Type: application/manifest+json` (or `application/json`).
- Linked from HTML: `<link rel="manifest" href="/manifest.webmanifest">`.

## iOS-specific (ignores the manifest for the home-screen icon)

- `<link rel="apple-touch-icon" href="...">` — without this, iOS shows no icon regardless of manifest content.
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-title" content="...">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="...">` if a custom status bar look is wanted.

## Other head tags

- `<meta name="mobile-web-app-capable" content="yes">` (Android/Chrome).
- `<meta name="theme-color" content="...">` matching the manifest's `theme_color`.
- Regular `<link rel="icon">` favicon as a real file, not a `data:` URI.

## Service worker (`sw.js`)

- Registered at the **root scope** (`/`) so it can control the whole app, not a subpath.
- Register with `updateViaCache: 'none'` — otherwise the browser byte-compares the new `sw.js` against its own HTTP-cached copy instead of the network, and a deploy can stay invisible for as long as that response's max-age.
- Serve `sw.js` with `Cache-Control: no-cache` so updates are picked up promptly.
- Bump the cache name on every deploy that changes precached assets (manifest, icons, shell files) — otherwise old installs keep stale entries. A deploy that changes assets but not the cache name lets the incoming worker overwrite entries the *currently running* page is still reading from that same cache.
- Precache the manifest and all icon files, not just app shell HTML/CSS/JS — anything a page loads must be listed, or it 404s offline.
- **Fill the cache in two phases: download everything, then write.** `Promise.all` every precache fetch first; only open the cache and `put()` once every response is in hand. A half-written cache (new HTML paired with old JS, or a page missing an asset) is worse than the build it would replace, and that's the likely outcome of writing incrementally while a connection is dropping. Reject before any write so the `install` event fails cleanly and the browser discards the broken worker, leaving the current one in control.
- Fetch precache assets with `cache: 'reload'`, not a plain `fetch()` — the URLs being cached are unversioned, so a plain fetch can be satisfied by the browser's HTTP cache and silently re-cache the build you already have instead of the new one.
- **Don't call `skipWaiting()` on install by default.** Leaving the new worker in `waiting` lets the page show an update affordance and switch on the user's terms, instead of an install-in-progress user getting yanked onto new code (and new cached assets) mid-session. Only skip waiting in response to an explicit user action or message.
- On `activate`, delete every cache whose name isn't the current one, then `clients.claim()`.
- In the `fetch` handler, resolve the response from *this worker's own* cache object (open by name), not a bare `caches.match()` that searches every cache. While a new worker sits in `waiting`, its cache is already full of the next build; a cross-cache match would leak next-build assets into a page still running the current build.
- Give the offline fallback (`catch` on `fetch`) a real target, e.g. `cache.match('/')`, so a dropped connection degrades to the shell instead of a rejected promise.
- With Workbox's `precacheAndRoute` (e.g. `injectManifest`), precached entries match by **exact literal URL** — `index.html` doesn't match a navigation request to `/`. Add a separate `NavigationRoute(createHandlerBoundToURL('index.html'))` or offline navigations fall through to the network and fail.
- Matching a lazily-cached asset by `pathname.endsWith('name.ext')`? Build tools hash filenames as `name-<hash>.ext` — the hash lands before the extension, so the suffix never matches and the file is never cached. Match with `/name.*\.ext$/` instead.

## Update detection & version rollout

- Track "what build is this cache serving" as data **inside the cache itself** (e.g. a synthetic cached response holding a version stamp), not in `localStorage`. A value outside the cache can drift from the assets the cache actually holds; a value written by the same operation that fills the cache cannot.
- Ship a small, separately-fetchable version file (e.g. `version.json`) that the service worker stamps into its cache on install, and that the page also fetches live. Compare live vs. cached to decide whether to offer an update. Fetch both copies with `cache: 'no-store'` — this is the one place a stale HTTP-cached read defeats the entire mechanism.
- **Use two independent update signals, not one:** a waiting worker only exists when `sw.js` itself changed; the version stamp only exists once a worker has actually run and filled a cache. A content-only deploy (assets changed, `sw.js` didn't) trips the second signal but never produces a waiting worker — checking only for the former misses most real deploys.
- **Every deploy must bump both** the version file and the service worker's cache name together. Bumping only the version file leaves the old cache/worker in place with nothing to trigger an actual asset refresh; bumping only the cache name with no version change gives the page nothing to compare against, so it never surfaces the update affordance.
- The version-check network call should have **no offline fallback**. If it fails, let it fail — treat that as "nothing to compare against" and stay quiet. A synthetic fallback value reads as a version different from whatever is cached and pops an update prompt with no connection available to satisfy it.
- Re-run the update check on `visibilitychange` (when the tab/app returns to the foreground), throttled to a minimum interval. A PWA can be left open for days without a fresh page load, so a check that only runs on load will never see later deploys.
- Handle both "a new worker is waiting" and "the cache needs a refill with no new worker" (e.g. static assets changed but `sw.js` didn't) as distinct update paths: the first hands off via `skipWaiting` + `controllerchange` + reload; the second messages the active worker to refill its own cache in place, then reloads — a plain reload without refilling just re-serves the stale entries.

## Update UI: reusable refresh-button pattern

A small, framework-agnostic pattern for surfacing "a new version is available" and letting the user apply it on their own terms, instead of yanking them onto new code mid-session.

- **One button, hidden by default.** Both update-detection signals (waiting worker, or `version.json` vs. cached-stamp mismatch) converge on the same "un-hide the button" call — the button itself doesn't need to remember *which* signal fired.
- **On click, disable the button; don't re-hide it.** A slow or offline update should read as "stuck," not silently revert to looking like nothing happened.
- **On click, re-read the service worker registration's live state — don't act on whatever triggered the button.** Time passes between "button shown" and "user clicks it," and the registration can move on in that window (installing → waiting → activated, or vice versa if another tab already updated it). Branching on a stashed "why we showed the button" flag acts on stale information; re-checking `getRegistration()` at click time is correct no matter what happened in between. This is the single biggest source of flaky "update did nothing" reports.
- **Handle all four states the registration can be in at click time, not just the happy path:** no registration at all (clear every cache and reload — starting clean is always safe here); a worker still installing (wait for it to finish rather than misreading "not waiting yet" as "nothing changed"); a worker waiting (tell it to activate, then reload); and — the case that's easiest to skip — an active worker with *no* waiting worker, meaning `sw.js` itself didn't change but the assets it caches did. That last case has no worker to hand control to, so it needs its own path: message the current worker to refill its own cache in place, then reload. A plain reload without that step just re-serves the same stale entries back out of the cache that's already there.
- **Never wait on a single event with no way out.** The handoff to a new worker is normally signaled by a `controllerchange` event, but that event can be missed (e.g. the tab was backgrounded when it fired) and there's no browser-level retry. Race it against a short timer instead of only listening for it — the first one to fire reloads the page, the loser is a no-op. Same idea for the "refill the cache in place" request: don't fire-and-forget it, get an acknowledgement back (a `MessageChannel` reply works well) with its own timeout, and re-enable the button on timeout/failure instead of leaving it disabled forever or reloading into content you never confirmed was actually refreshed.
- **The two operations — "activate a different, already-installed worker" vs. "refill this worker's own cache" — are different messages to the worker, not one generic "update" message.** They do genuinely different things and the client already knows which one applies from the state it just checked; collapsing them into one message just pushes that branch into the worker where it's harder to reason about.

## Local dev

- A registered service worker outranks every cache-busting trick once it has taken control of the origin: `?v=N` query strings and even `fetch(url, { cache: 'reload' })` are answered from the worker's cache-first fetch handler before they ever reach the network. An edit that verifiably reached disk but doesn't show up in the browser is this, not a phantom bug — unregister the worker and clear its caches (`serviceWorker.getRegistrations()` → `unregister()`, `caches.keys()` → `caches.delete()`) before trusting what you see.
- A bare static file server typically sends no cache headers either, so plain HTTP caching alone can also serve stale modules — a cache-busting query string is still worth appending when no service worker is involved.

## Icons (`/static/icons/`)

- Keep all manifest/favicon/apple-touch icon files under this one path so they can be referenced and whitelisted (e.g. auth-proxy bypass rules) as a single wildcard.
