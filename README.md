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

| Path                            | Content                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/content/`                  | Hand-written content: home, hosted, 404, illustrations, `facts.ts` (CC BY 4.0)                  |
| `src/components/`               | Document, header, footer, docs page (TSX)                                                       |
| `src/islands/`                  | The only code shipped to the browser (Preact): theme toggle, menu, docs navigation, copy button |
| `src/docs/`                     | Docs pipeline: config, fetch and cache, Markdown renderer, link rewriting, nav, bump            |
| `src/build/`                    | Meta tags, sitemap, theme script, tokens CSS, link and budget checks, static server             |
| `src/styles/`                   | CSS; `tokens.css` is generated from `design/losoft-tokens.json`                                 |
| `scripts/`                      | `build.ts`, `bump-docs.ts`, `check-links.ts`, `check-budget.ts`, `check-a11y.ts`, `tokens.ts`   |
| `docs.config.json`              | The pinned SHAs and the file list of every docs repo                                            |
| `budget.json`, `site.config.ts` | Size budget; site URL                                                                           |
| `test/fixtures/`                | Copies of pinned upstream files used by the facts test                                          |
| `dist/`                         | Build output (ignored)                                                                          |

The server render uses real React (`renderToStaticMarkup`); `react` is aliased to `preact/compat` only in the island bundles. Every page renders without JavaScript. Fonts are the two `@fontsource-variable` packages, latin subset files only, copied to `dist/assets/fonts/` with our own `@font-face`.

## How the docs are pinned

`docs.config.json` holds, for each of the six repos (`api`, `probe`, `status`, `notify`, `contract`, `kit`), the repository, a 40-character commit SHA, its commit date and the list of published files (`docs/*.md` and `docs/channels/*.md`). It is the only place with SHAs. The build fetches `https://raw.githubusercontent.com/<repo>/<sha>/<path>`, caches it in `.cache/docs/` (ignored) and fails on a non-200 answer, a bad SHA or an empty file. The README of a repo is not published.

To update: `bun run docs:bump`, review the diff (a new upstream file shows up as a new line), run `bun run check:all`, merge. The build fails on a dangling link anchor and when a published file is not in the navigation (`src/docs/nav.ts`, which maps each sidebar entry to a file). Never edit a generated page by hand; change the source repository.

URLs: `/docs/<repo>/<page>/` (`index.md` is `/docs/<repo>/`), `/docs/notify/channels/<name>/`, `/docs/api/rest-api/`. `/docs/` shows the quick start (same content as `/docs/api/install/`, with that page as its canonical link).

## Product facts

Every fact on the home page is a constant in `src/content/facts.ts` with its source file. `src/content/facts.test.ts` checks them against copies of the pinned files in `test/fixtures/`. When a bump changes a source, refresh the fixture and fix the fact.

## Hosted page placeholders

Nothing about the hosted offer is decided. Prices, limits, regions, trial, availability, data location, open-source terms and the status URL are shown as marked placeholders such as `[PRICE]`, `[REGIONS]`, `[TRIAL]`, `[DATA_LOCATION]`, `[OSS_TERMS]`, `[STATUS_URL]`, `[AVAILABILITY]` and `[LIMIT]`. The waitlist form is disabled, has no `action` and sends nothing. A test fails if the built page contains a currency sign, a price, `status.losoft.dev` or a form action. A person replaces the placeholders when the offer exists.

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
