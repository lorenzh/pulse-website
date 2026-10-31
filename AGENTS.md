# AGENTS.md

Instructions for coding agents in this repository. They bind every change.

## Project

pulse-website is the static website of pulse: a home page, docs generated from the `docs/*.md` of the pulse repositories at pinned commits, the REST API reference, and a hosted-plans page whose commercial facts are placeholders. Work arrives as an issue with an approved spec from the meta repository; implement only the section for this repository. Bun 1.4.0 (package manager, runtime, `bun:test`), ESM, strict TypeScript (`tsc --noEmit`), Biome, ESLint (SonarJS), Lefthook. Pages are TSX, rendered at build time with React (`renderToStaticMarkup`); only the Preact islands in `src/islands` run in the browser.

## Commands

| Task                                                          | Command                                        |
| ------------------------------------------------------------- | ---------------------------------------------- |
| Install from the lockfile (also installs the pre-commit hook) | `bun install --frozen-lockfile`                |
| Lint, typecheck, unit tests (CI job `check`)                  | `bun run check`                                |
| Build, links, budget, a11y (CI job `site`)                    | `bun run check:site`                           |
| Everything                                                    | `bun run check:all`                            |
| Build `dist/` (fetches the pinned docs)                       | `bun run build`                                |
| Pin the docs to the current `main` of each repo               | `bun run docs:bump [<repo>]`                   |
| Regenerate `src/styles/tokens.css`                            | `bun run tokens`                               |
| One test file                                                 | `bun test src/<dir>/<name>.test.ts`            |
| Lint and format check / apply fixes                           | `bun run lint` / `bun run format`              |
| Browser for `check:a11y` (once)                               | `bunx playwright install --with-deps chromium` |
- A change is done when `bun run check:all` passes. Never run `git commit --no-verify`, and never weaken `biome.json`, `tsconfig.json`, the ESLint config, `budget.json` or CI to pass. A budget changes only with a stated reason in the pull request.

## Repository boundaries

- Edit only this repository. Other repositories are read-only context.
- Do not add `.factory/`, plan, or note files to this repository.
- Never edit generated or fetched docs by hand; change the source repo, then bump the pin.
- Product facts only from the sources in `src/content/facts.ts`. Each constant names its source file; a test checks what a machine can check against `test/fixtures/`. Where the design and the code differ, the code wins.
- The SHAs of the docs live only in `docs.config.json`, written by `bun run docs:bump`. The build reads nothing else and fetches only those SHAs.
- Prices, regions, trial terms, availability, data location, open-source terms and the status URL of the hosted offer are placeholders (`<mark class="placeholder">[PRICE]</mark>`). Do not invent them. The waitlist form stays disabled and has no `action`.
- No request to another origin at run time: no CDN, analytics, tracking or web fonts from elsewhere.
- Runtime dependencies only if the package is on the approved-packages list in pulse-meta. Pin every dependency exactly.

## TypeScript

- Scripts and logic run unbuilt under Bun; keep to erasable syntax as a style rule (no `enum`, `namespace`, parameter properties). TSX is compiled by esbuild (`src/build/load-site.ts`, `src/build/assets.ts`); keep logic in `.ts` files so tests can import it.
- Relative imports carry the `.ts` or `.tsx` extension. Built-ins use the `node:` prefix.
- Type-only imports use `import type`.
- No `any`. No non-null `!` in `src/`. Use `as` only right after a check at a trust boundary.
- Give exported functions explicit return types (components excepted). Named exports only. No barrel files and no generic `utils.ts`.

## Code design

- One module, one responsibility, named after its job. Files are kebab-case (components `PascalCase.tsx`).
- Keep logic pure. I/O (files, `fetch`, `git`, Playwright) stays in `scripts/` and `src/build/`; pass `fetch` and file readers in as dependencies.
- Islands (`src/islands`) are written against the React API; only their esbuild bundles alias `react` to `preact/compat`. A page ships a script only for the islands it contains. Every page must work without JavaScript.
- Interactive targets are at least 44 × 44 px; colours, sizes and radii come from the tokens (`design/losoft-tokens.json` → `src/styles/tokens.css`).
- Validate untrusted input at the edge: `docs.config.json`, fetched Markdown, GitHub API answers.
- Throw only `Error` subclasses with a `name`; never swallow an error silently.
- Links only with `http:`, `https:`, `mailto:` or in-site targets (`src/build/url-safety.ts`).
- No inline script besides the hashed theme script, no `style` attributes and no `<style>` elements. Every page keeps the Content-Security-Policy meta tag first in `<head>`; a policy change needs a reason in the pull request.

## Tests

- Red, green, refactor. A bug fix starts with a test that reproduces it.
- Tests sit next to the code as `*.test.ts`. No real clock, no external network (a fake `fetch` is passed in), each test writes only to its own `mkdtemp` directory.
- `bun test` enforces 80 % line coverage. The browser checks (`check:a11y`) are separate and not part of the gate.

## Documentation and licences

- `README.md` owns what the repository does, commands, layout, pinning and placeholders. Update it with the change.
- Code: MIT (`LICENSE`). Hand-written content in `src/content/`: CC BY 4.0 (`LICENSE-content`). Generated docs: MIT, from their source repos. The names "pulse" and "losoft" and their logos are not licensed. Fonts keep OFL-1.1.

## Commits and pull requests

- Conventional Commits, imperative, lower case. One change per pull request, limited to the issue's spec section. The pull request names the issue, the checks that ran and the known limits.
- Shared tooling configuration lives in `lorenzh/pulse-config` (pinned to a full SHA in `package.json` and `ci.yml`).
