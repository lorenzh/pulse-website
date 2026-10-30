import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileForUrl, startStaticServer } from "./static-server.ts";

let root = "";
let origin = "";
let close = async (): Promise<void> => {};

before(async () => {
  root = await mkdtemp(path.join(tmpdir(), "static-"));
  await mkdir(path.join(root, "docs"));
  await writeFile(path.join(root, "index.html"), "home");
  await writeFile(path.join(root, "docs/index.html"), "docs");
  await writeFile(path.join(root, "404.html"), "missing");
  const started = await startStaticServer(root);
  origin = started.origin;
  close = () => new Promise((resolve) => started.server.close(() => resolve()));
});
after(async () => {
  await close();
  await rm(root, { recursive: true, force: true });
});

test("directories answer index.html, unknown paths 404.html with status 404", async () => {
  assert.equal(await (await fetch(`${origin}/`)).text(), "home");
  assert.equal(await (await fetch(`${origin}/docs/`)).text(), "docs");
  const missing = await fetch(`${origin}/nope/`);
  assert.equal(missing.status, 404);
  assert.equal(await missing.text(), "missing");
});

test("paths that climb out of the root are refused", () => {
  assert.equal(fileForUrl("/srv/dist", "/../etc/passwd"), undefined);
  assert.equal(fileForUrl("/srv/dist", "/a/b/"), "/srv/dist/a/b/index.html");
});
