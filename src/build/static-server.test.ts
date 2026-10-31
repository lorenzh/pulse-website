import { afterAll, beforeAll, test } from "bun:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileForUrl, startStaticServer } from "./static-server.ts";

let root = "";
let origin = "";
let close = async (): Promise<void> => {};

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), "static-"));
  await mkdir(path.join(root, "docs"));
  await writeFile(path.join(root, "index.html"), "home");
  await writeFile(path.join(root, "docs/index.html"), "docs");
  await writeFile(path.join(root, "404.html"), "missing");
  const started = await startStaticServer(root);
  origin = started.origin;
  close = () => new Promise((resolve) => started.server.close(() => resolve()));
});
afterAll(async () => {
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

function rawGet(urlPath: string): Promise<{ status: number; body: string }> {
  const { hostname, port } = new URL(origin);
  return new Promise((resolve, reject) => {
    const req = request({ host: hostname, port, path: urlPath }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => {
        body += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("a malformed escape answers 404 and the server keeps serving", async () => {
  assert.equal(fileForUrl("/srv/dist", "/%"), undefined);
  assert.equal(fileForUrl("/srv/dist", "/a%zz"), undefined);
  assert.deepEqual(await rawGet("/%"), { status: 404, body: "missing" });
  const home = await fetch(`${origin}/`);
  assert.equal(home.status, 200);
  assert.equal(await home.text(), "home");
});
