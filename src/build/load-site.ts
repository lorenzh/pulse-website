import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

export type SiteModule = typeof import("../site.tsx");

/**
 * Compiles src/site.tsx (TSX, real React for the server render) into .build/ and imports it.
 * Node does not run JSX, so the page code goes through esbuild first. Packages stay external.
 */
export async function loadSite(root: string = process.cwd()): Promise<SiteModule> {
  const base = path.join(root, ".build");
  await mkdir(base, { recursive: true });
  const dir = await mkdtemp(path.join(base, "site-"));
  const outfile = path.join(dir, "site.mjs");
  await build({
    entryPoints: [path.join(root, "src/site.tsx")],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    jsx: "automatic",
    logLevel: "silent",
  });
  return (await import(pathToFileURL(outfile).href)) as SiteModule;
}
