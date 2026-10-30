import { test } from "bun:test";
import assert from "node:assert/strict";
import { UnsafeLinkError } from "../build/url-safety.ts";
import type { DocsConfig } from "./config.ts";
import { docUrl, editUrl, type LinkContext, LinkError, resolveLink } from "./links.ts";

const config: DocsConfig = {
  repos: {
    api: {
      repo: "lorenzh/pulse-api",
      sha: "a".repeat(40),
      date: "2026-10-29T00:00:00Z",
      files: ["docs/index.md", "docs/install.md", "docs/concepts.md"],
    },
    notify: {
      repo: "lorenzh/pulse-notify",
      sha: "b".repeat(40),
      date: "2026-10-29T00:00:00Z",
      files: ["docs/channels.md", "docs/channels/email.md", "docs/channels/slack.md"],
    },
  },
};

function ctx(repoKey: string, file: string): LinkContext {
  return {
    config,
    repoKey,
    file,
    headingIds: (k, f) =>
      k === "api" && f === "docs/concepts.md" ? new Set(["quorum"]) : undefined,
  };
}

test("maps published files to site URLs", () => {
  assert.equal(docUrl("api", "docs/index.md"), "/docs/api/");
  assert.equal(docUrl("api", "docs/rest-api.md"), "/docs/api/rest-api/");
  assert.equal(docUrl("notify", "docs/channels/email.md"), "/docs/notify/channels/email/");
  assert.equal(
    editUrl("lorenzh/pulse-api", "docs/install.md"),
    "https://github.com/lorenzh/pulse-api/edit/main/docs/install.md",
  );
});

test("relative .md links to published files become site URLs with the anchor", () => {
  const c = ctx("api", "docs/install.md");
  assert.deepEqual(resolveLink("concepts.md#quorum", c), {
    href: "/docs/api/concepts/#quorum",
    isExternal: false,
  });
  assert.deepEqual(resolveLink("./concepts.md", c), {
    href: "/docs/api/concepts/",
    isExternal: false,
  });
  const n = ctx("notify", "docs/channels/slack.md");
  assert.equal(resolveLink("../channels.md", n).href, "/docs/notify/channels/");
  assert.equal(resolveLink("email.md", n).href, "/docs/notify/channels/email/");
});

test("links to unpublished files point to the pinned blob on GitHub", () => {
  const c = ctx("api", "docs/install.md");
  assert.deepEqual(resolveLink("../AGENTS.md", c), {
    href: `https://github.com/lorenzh/pulse-api/blob/${"a".repeat(40)}/AGENTS.md`,
    isExternal: true,
  });
  assert.equal(
    resolveLink("../../pulse-notify/docs/channels.md", c).href,
    "/docs/notify/channels/",
  );
  assert.match(
    resolveLink("../../pulse-notify/README.md", c).href,
    /pulse-notify\/blob\/b{40}\/README\.md$/,
  );
});

test("http links stay; mailto stays but is not an external page", () => {
  const c = ctx("api", "docs/install.md");
  assert.deepEqual(resolveLink("https://nodemailer.com", c), {
    href: "https://nodemailer.com",
    isExternal: true,
  });
  // eslint-disable-next-line sonarjs/no-clear-text-protocols -- a scheme fixture, never fetched
  assert.deepEqual(resolveLink("HTTP://x", c), { href: "HTTP://x", isExternal: true });
  assert.deepEqual(resolveLink("mailto:a@b.c", c), { href: "mailto:a@b.c", isExternal: false });
  assert.deepEqual(resolveLink("MAILTO:a@b.c", c), { href: "MAILTO:a@b.c", isExternal: false });
});

const UNSAFE = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(1)",
  " javascript:alert(1)",
  "\u0001javascript:alert(1)",
  "java\tscript:alert(1)",
  "java\nscript:x",
  "data:text/html,<script>alert(1)</script>",
  "DATA:text/html,x",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
  "tel:+41000",
  // eslint-disable-next-line sonarjs/no-clear-text-protocols -- a scheme fixture, never fetched
  "ftp://x",
  "foo:bar",
  "blob:https://x/y",
];

test("every unsafe scheme fails with the repository, the file and the quoted link", () => {
  const c = ctx("api", "docs/install.md");
  for (const href of UNSAFE) {
    assert.throws(
      () => resolveLink(href, c),
      (e: unknown) =>
        e instanceof UnsafeLinkError &&
        e.message ===
          `lorenzh/pulse-api docs/install.md: unsafe link ${JSON.stringify(href)}: only http:, https:, mailto: and in-site links are allowed`,
      JSON.stringify(href),
    );
  }
});

test("an unknown repository key names itself in the unsafe-link error", () => {
  assert.throws(
    () => resolveLink("javascript:x", ctx("gone", "docs/a.md")),
    /^UnsafeLinkError: gone docs\/a\.md: unsafe link "javascript:x"/,
  );
});

test("anchors are checked against the target's heading ids", () => {
  const c = ctx("api", "docs/install.md");
  assert.throws(() => resolveLink("concepts.md#nope", c), LinkError);
  assert.throws(() => resolveLink("../../elsewhere/x.md", c), /leaves the repository/);
  assert.deepEqual(resolveLink("#local", { ...c, headingIds: () => new Set(["local"]) }), {
    href: "#local",
    isExternal: false,
  });
  assert.throws(
    () => resolveLink("#gone", { ...c, headingIds: () => new Set() }),
    /missing heading/,
  );
});
