# pulse-website

The static website of [pulse](https://github.com/lorenzh/pulse-meta): a home page, the documentation generated from the pulse repositories, the REST API reference, and a hosted-plans page with placeholders. It is built from the design in [`design/website/`](https://github.com/lorenzh/pulse-meta/tree/main/design/website) in pulse-meta. There is no deployment yet: this repository builds `dist/` and checks it.

## Commands

Bun 1.4.0 (package manager, runtime and test runner).

| Task                                                   | Command                                       |
| ------------------------------------------------------ | --------------------------------------------- |
| Install                                                | `bun install --frozen-lockfile`               |
| Lint, typecheck, unit tests (80 % line coverage)       | `bun run check`                               |
| Build `dist/`                                          | `bun run build`                               |
| Build, then links, budget and accessibility checks     | `bun run check:site`                          |
| All checks (the pull request is done when this passes) | `bun run check:all`                           |
| Pin the docs to `main` of every repo / of one repo     | `bun run docs:bump` / `bun run docs:bump api` |
| Regenerate the token CSS                               | `bun run tokens`                              |

`check:a11y` needs Chromium: `bunx playwright install --with-deps chromium`.

## Layout

| Path                            | Content                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/content/`                  | Hand-written content: home, hosted, 404, illustrations, `facts.ts` (CC BY 4.0)                                                                                |
| `src/components/`               | Document, header, footer, docs page (TSX)                                                                                                                     |
| `src/islands/`                  | The only code shipped to the browser. Preact: theme toggle, menu, docs navigation, copy button. Vanilla: network canvas, live preview, scroll-in, heart burst |
| `src/lib/`                      | Pure, tested logic: node placement (`network.ts`), frame throttle, command extraction, preview clock                                                          |
| `src/docs/`                     | Docs pipeline: config, fetch and cache, Markdown renderer, link rewriting, nav, bump                                                                          |
| `src/build/`                    | Meta tags, sitemap, theme script, tokens CSS, URL safety, Content-Security-Policy, link and budget checks, static server                                      |
| `src/styles/`                   | CSS; `tokens.css` is generated from `design/losoft-tokens.json`                                                                                               |
| `scripts/`                      | `build.ts`, `bump-docs.ts`, `check-links.ts`, `check-budget.ts`, `check-a11y.ts`, `tokens.ts`                                                                 |
| `docs.config.json`              | The pinned SHAs and the file list of every docs repo                                                                                                          |
| `budget.json`, `site.config.ts` | Size budget; site URL                                                                                                                                         |
| `test/fixtures/`                | Copies of pinned upstream files used by the facts test                                                                                                        |
| `dist/`                         | Build output (ignored)                                                                                                                                        |

The server render uses real React (`renderToStaticMarkup`); `react` is aliased to `preact/compat` only in the island bundles. Every page renders without JavaScript. Fonts are the two `@fontsource-variable` packages, latin subset files only, copied to `dist/assets/fonts/` with our own `@font-face`.

## Spacing, motion and effects (Home and Hosted)

- **Spacing:** `--section-space: clamp(64px, 8vw, 128px)` sits between sections (half above, half below each); no rules or `<hr>` between sections. Motion tokens (`--ease`, `--dur-reveal`, `--dur-lift`, `--dur-underline`, `--ease-spring`) and the canvas colours (`--net-line`, `--net-node`, `--net-pulse`, `--net-pulse2`) live in `design/losoft-tokens.json` and are generated into `tokens.css`.
- **Scroll-in:** the inline head script sets `js-reveal` on `<html>` only if `IntersectionObserver` exists and `prefers-reduced-motion` is not `reduce`. Only then are `[data-reveal]` items hidden (opacity and `translateY(32px)`), and a CSS failsafe shows them after 3 s if the script never runs. `scroll-reveal.ts` uses one observer (`threshold: 0.15`), unobserves after the first hit, staggers siblings by 100 ms and shows items already in view, or already scrolled past, at once.
- **Network canvas:** `network-canvas.ts` draws a fixed, `aria-hidden`, pointer-less canvas below the content. Placement (receivers 280 px, senders 60 px apart; 168 and 36 px floor on phones; angle between links at least 20°, 15° at nodes with 12 or more links; links that break the angle rule are dropped), pulse timing and the 33 ms frame cap are pure code in `src/lib/` with tests. Sizes are measured on resize only, theme colours on theme change only. The loop stops while the tab is hidden or the canvas is off screen; reduced motion draws one static frame. It starts after `load`, when the browser is idle. Without JavaScript there is no canvas content.
- **Canvas contrast:** the canvas layers are very faint on purpose. `src/build/contrast.test.ts` stacks a link, a node and a pulse of either colour over `--bg` in both themes and requires `--text`, `--lead`, `--muted` and `--accent-text` to stay at 4.5:1 or better (worst case 4.6:1; alphas 0.04, 0.05, 0.06). Axe cannot see text over a canvas, so this computation is the guard.
- **Outline button:** the curtain `.fill` carries a second copy of the label in `--on-strong` and is clipped with `clip-path`, so every glyph is `--text` on `--bg` (light 14.1:1, dark 11.5:1) or `--on-strong` on `--accent` (light 4.92:1, dark 6.92:1). No frame mixes the two. Plain `--text` on `--accent` would fail (2.87:1 light, 1.66:1 dark), which is why the curtain does not scale a single label.
- **Live preview:** `live-preview.ts` swaps two snapshots in one grid cell (every 4 s, "ago" counter every second, 600 ms crossfade). Only the visible one is exposed; the other has `aria-hidden`. Timers stop while hidden or off screen. Without JavaScript or with reduced motion the first state stays.
- **Heart burst:** the open-source card on Hosted (`heart-burst.ts`) makes 8 `aria-hidden` particles per burst on `pointerenter` (hover media) and `focusin`, re-armed on leave; the card's link makes focus reachable. Reduced motion: the heart only fills.
- **Hover rule:** every `:hover` rule sits in `@media (hover: hover)`; focus effects stay outside it. `src/build/hover-scan.ts` is tested on the sources, and `check:a11y` scans the built CSS. Docs sidebar links keep only a colour transition.
- **Reduced motion:** one block in `base.css` switches off every animation and transition.
- **Docs copy buttons:** `src/lib/commands.ts` decides at build time which fenced blocks are command blocks (`bash`, `sh`, `shell`, `console` with a `$ ` line, or a shell block of commands only) and what is copied (prompt removed; output and `#` comments skipped; `\` continuations and heredocs kept). Only those blocks get the `copy-button` island, so other pages ship none.

## How the docs are pinned

`docs.config.json` holds, for each of the six repos (`api`, `probe`, `status`, `notify`, `contract`, `kit`), the repository, a 40-character commit SHA, its commit date and the list of published files (`docs/*.md` and `docs/channels/*.md`). It is the only place with SHAs. The build fetches `https://raw.githubusercontent.com/<repo>/<sha>/<path>`, caches it in `.cache/docs/` (ignored) and fails on a non-200 answer, a bad SHA or an empty file. The README of a repo is not published. A cache file is written to a temp file (`*.tmp`) next to it and renamed into place, so an interrupted build leaves no partial cache hit; a `.tmp` left by a killed build is never read and not cleaned up.

To update: `bun run docs:bump`, review the diff (a new upstream file shows up as a new line), run `bun run check:all`, merge. The build fails on a dangling link anchor and when a published file is not in the navigation (`src/docs/nav.ts`, which maps each sidebar entry to a file). Never edit a generated page by hand; change the source repository.

URLs: `/docs/<repo>/<page>/` (`index.md` is `/docs/<repo>/`), `/docs/notify/channels/<name>/`, `/docs/api/rest-api/`. `/docs/` shows the quick start (same content as `/docs/api/install/`, with that page as its canonical link).

## Product facts

Every fact on the home page is a constant in `src/content/facts.ts` with its source file. `src/content/facts.test.ts` checks them against copies of the pinned files in `test/fixtures/`. When a bump changes a source, refresh the fixture and fix the fact.

## Hosted page placeholders

Nothing about the hosted offer is decided. Prices, limits, regions, trial, availability, data location, open-source terms and the status URL are shown as marked placeholders such as `[PRICE]`, `[REGIONS]`, `[TRIAL]`, `[DATA_LOCATION]`, `[OSS_TERMS]`, `[STATUS_URL]`, `[AVAILABILITY]`, `[LIMIT]`, `[DISCOUNT]`, `[REGION]`, `[BACKUP REGION]` and `[RETENTION]`, with the note "Planned offer, details not final" above the plans. The waitlist form is disabled, has no `action` and sends nothing. A test fails if the built page contains a currency sign, a price, `status.losoft.dev` or a form action. A person replaces the placeholders when the offer exists.

## Link rule and Content-Security-Policy

**Links.** A page links only to `http:`, `https:` and `mailto:` URLs and to in-site targets: relative paths, `/…`, `#fragment`, `?query` and `//host`. `src/build/url-safety.ts` decides this. Like a browser, it first strips leading and trailing control characters and spaces and removes every tab, LF and CR, then takes the text before the first `:` (if that comes before any `/`, `?` and `#`) as the scheme, case-insensitive. Every other scheme fails, `javascript:`, `data:`, `vbscript:`, `file:` and `tel:` included. Three places apply it:

- `resolveLink` (docs Markdown, links and images): the build fails with `<owner/repo> <file>: unsafe link "<link>": only http:, https:, mailto: and in-site links are allowed`.
- `renderSite` (every rendered page, hand-written ones included, after decoding entities such as `&#106;` and `&colon;` once; like the browser, a numeric reference decodes even without its `;`, as in `javascript&#58alert(1)`): `<dist file>: unsafe link <tag> <attr>="<value>": …`.
- `bun run check:links` on `dist/`: `<file>: unsafe link scheme in <tag> <attr>="<value>"`.

The last two read tags as the browser's HTML tokenizer does (`src/build/html-refs.ts`): a `/` or a closing quote also separates attributes (`<a/href=…>`, `<a title="t"href=…>`), names are matched case-insensitively, and of two equal attributes the first counts, as in the browser.

The link is quoted with `JSON.stringify`, so control characters show as `\u0001` or `\t` and the message stays on one line. A docs link with another scheme must be fixed in its source repository.

**Policy.** `src/build/csp.ts` puts this meta tag first in the `<head>` of every page:

```text
default-src 'self'; script-src 'self' 'sha256-…'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'
```

- The `sha256-…` source is `themeScriptHash()` of the inline theme script, the only inline script. `src/build/csp.test.ts` pins the hash, so a change to `THEME_SCRIPT` must update that pin.
- No page uses inline styles; islands change styles only through `style.setProperty`. No `'unsafe-inline'` or `'unsafe-eval'` exists.
- `img-src data:` is kept but unused today; a `data:` image cannot run script.
- `bun run check:links` checks the tag, its place, the policy, the script hash and the absence of `style` attributes and `<style>` elements on every page in `dist/` (heading `csp`). It finds the meta tags, the style attributes and the `<style>` elements with the same browser-like tag reader as the link check, so `<p/style=…>`, `<p title="t"style=…>` and `<style/>` count too. The check fails closed where markup could hide something: the page must start with only whitespace, an optional doctype, `<html>` and `<head>` before the CSP meta tag (a comment, `<template>` or text there is a problem), and every `<script` followed by whitespace, `/` or `>` counts as a script, also inside comments, attribute values or `<textarea>`, so a fake `<script src>` cannot hide the real script after it. A script with `src` is external only if it has no text, because an SVG script ignores `src` and runs its text. The `http-equiv` value must be `Content-Security-Policy` in any ASCII case, without surrounding whitespace, as Chromium compares it; a padded value is no CSP. A script ends where the browser ends it, at `</script` followed by whitespace, `/` or `>`, so a script closed by `</script/>` or `</script x>` is counted as well. `bun run check:a11y` fails on any CSP violation or CSP console message in every browser context, and a positive control proves that a blocked inline script is seen.
- A meta tag cannot carry `frame-ancestors`, `report-uri`/`report-to` or `sandbox`. HTTP headers (`frame-ancestors 'none'`, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` and reporting) follow once a host is chosen.

## Site URL and meta

`SITE_URL` is `siteUrl` in `site.config.ts`. Its default `https://pulse.example` is a placeholder; it feeds `sitemap.xml`, `robots.txt`, canonical links and `og:url`. No deployment exists. Pages have no `og:image` (there is no image yet).

## Dev-only tooling (exact pins)

`esbuild` 0.28.2, `@playwright/test` 1.64.1, `@axe-core/playwright` 4.14.0, `typescript` 7.0.2, `@biomejs/biome` 2.6.3, `lefthook` 2.2.2, `@types/node`, `@types/react`, `@types/react-dom`, and `@lorenzh/pulse-config` (a full commit SHA). Runtime packages: `preact` 11.1.0, `react` and `react-dom` 19.3.1 (build time only), `marked` 18.1.2 (build time Markdown), and the two fontsource packages 5.3.0. They must be on the approved-packages list in pulse-meta before this repository merges.

## License

- Code (build, components, scripts, styles): MIT, see `LICENSE`.
- Generated docs: MIT, as in their source repos; each page names its source file and repository.
- Hand-written content (`src/content/`: home, hosted, illustrations): CC BY 4.0, see `LICENSE-content`.
- The names "pulse" and "losoft" and their logos are not licensed (all rights reserved).
- Fonts keep their OFL-1.1 licence from the `@fontsource-variable` packages.

The footer reads "Code MIT · Content CC BY 4.0" with links to both files.
