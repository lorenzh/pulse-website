import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export class DocsFetchError extends Error {
  override name = "DocsFetchError";
}

export type FetchLike = (url: string) => Promise<{
  status: number;
  text(): Promise<string>;
}>;

export type DocSource = { repo: string; sha: string; path: string };

const SHA = /^[0-9a-f]{40}$/;

export function rawUrl(source: DocSource): string {
  return `https://raw.githubusercontent.com/${source.repo}/${source.sha}/${source.path}`;
}

/** Reads a pinned file from the cache, or fetches and caches it. Network is build-time only. */
export async function loadDocFile(
  source: DocSource,
  deps: { fetch: FetchLike; cacheDir: string },
): Promise<string> {
  if (!SHA.test(source.sha)) {
    throw new DocsFetchError(`${source.repo}: "${source.sha}" is not a 40-character commit SHA`);
  }
  const file = path.join(deps.cacheDir, source.repo.replace("/", "__"), source.sha, source.path);
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const url = rawUrl(source);
  let response: Awaited<ReturnType<FetchLike>>;
  try {
    response = await deps.fetch(url);
  } catch (cause) {
    throw new DocsFetchError(`fetching ${url} failed`, { cause });
  }
  if (response.status !== 200) {
    throw new DocsFetchError(`fetching ${url} answered ${response.status}, expected 200`);
  }
  const text = await response.text();
  if (text.trim() === "") throw new DocsFetchError(`${url} is empty`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
  return text;
}
