import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

/** All files below `dir`, as paths relative to it with forward slashes. */
export async function listFiles(dir: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(path.join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) out.push(...(await listFiles(dir, rel)));
    else out.push(rel);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export type Dist = {
  files: string[];
  html: Map<string, string>;
  text: (file: string) => Promise<string | undefined>;
  size: (file: string) => Promise<number>;
};

export async function readDist(dir: string): Promise<Dist> {
  const files = await listFiles(dir).catch(() => {
    throw new Error(`${dir} does not exist: run npm run build first`);
  });
  const html = new Map<string, string>();
  for (const f of files.filter((x) => x.endsWith(".html")))
    html.set(f, await readFile(path.join(dir, f), "utf8"));
  return {
    files,
    html,
    text: async (file) =>
      files.includes(file) ? readFile(path.join(dir, file), "utf8") : undefined,
    size: async (file) => (await stat(path.join(dir, file))).size,
  };
}
