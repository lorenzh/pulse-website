import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { build, transform } from "esbuild";

export const ISLANDS = ["theme-toggle", "menu-toggle", "docs-nav", "copy-button"] as const;

const CSS_FILES = [
  "src/styles/tokens.css",
  "src/styles/fonts.css",
  "src/styles/base.css",
  "src/styles/components.css",
  "src/styles/docs.css",
];

const FONT_FILES = [
  ["@fontsource-variable/space-grotesk", "space-grotesk-latin-wght-normal.woff2"],
  ["@fontsource-variable/jetbrains-mono", "jetbrains-mono-latin-wght-normal.woff2"],
  ["@fontsource-variable/jetbrains-mono", "jetbrains-mono-latin-wght-italic.woff2"],
] as const;

function shortHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 10);
}

/** Copies public/ and the latin font files, writes the hashed stylesheet. Returns its URL. */
export async function buildStatic(root: string, dist: string): Promise<string> {
  await cp(path.join(root, "public"), dist, { recursive: true });
  const fonts = path.join(dist, "assets/fonts");
  await mkdir(fonts, { recursive: true });
  for (const [pkg, file] of FONT_FILES) {
    await cp(path.join(root, "node_modules", pkg, "files", file), path.join(fonts, file));
  }
  const parts = await Promise.all(CSS_FILES.map((f) => readFile(path.join(root, f), "utf8")));
  const { code } = await transform(parts.join("\n"), { loader: "css", minify: true });
  const name = `site-${shortHash(code)}.css`;
  await writeFile(path.join(dist, "assets", name), code);
  return `/assets/${name}`;
}

/** Bundles every island with Preact in place of React. Returns island name -> script URL. */
export async function buildIslands(root: string, dist: string): Promise<Record<string, string>> {
  const outdir = path.join(dist, "assets/js");
  await rm(outdir, { recursive: true, force: true });
  const result = await build({
    entryPoints: ISLANDS.map((name) => path.join(root, `src/islands/${name}.tsx`)),
    outdir,
    entryNames: "[name]-[hash]",
    chunkNames: "chunk-[hash]",
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    metafile: true,
    jsx: "automatic",
    // The islands are written against the React API; only their bundles run on Preact.
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
      "react-dom/client": "preact/compat/client",
    },
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
  });
  const islands: Record<string, string> = {};
  for (const [out, meta] of Object.entries(result.metafile.outputs)) {
    if (!meta.entryPoint) continue;
    const name = path.basename(meta.entryPoint, ".tsx");
    islands[name] = `/assets/js/${path.basename(out)}`;
  }
  return islands;
}
