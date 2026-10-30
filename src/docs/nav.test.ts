import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseDocsConfig } from "./config.ts";
import { findEntry, flattenNav, type NavGroup, navProblems, neighbours } from "./nav.ts";

const config = parseDocsConfig(JSON.parse(readFileSync("docs.config.json", "utf8")));

test("every published file is in the nav exactly once and every entry exists", () => {
  assert.deepEqual(navProblems(config), []);
});

test("navProblems reports missing, unknown and double entries", () => {
  const groups: NavGroup[] = [
    {
      title: "G",
      entries: [
        { label: "A", repoKey: "api", file: "docs/index.md" },
        { label: "A", repoKey: "api", file: "docs/index.md" },
        { label: "B", repoKey: "api", file: "docs/gone.md" },
      ],
    },
  ];
  const problems = navProblems(config, groups).join("\n");
  assert.match(problems, /api:docs\/index\.md is in the nav 2 times/);
  assert.match(problems, /docs\/gone\.md, which is not published/);
  assert.match(problems, /api:docs\/install\.md is published but not in the nav/);
  assert.match(problems, /label "A" is used twice/);
});

test("previous and next follow the nav order across groups", () => {
  const flat = flattenNav();
  assert.equal(flat[0]?.label, "Overview");
  const quick = neighbours("api", "docs/install.md");
  assert.equal(quick.previous?.label, "Overview");
  assert.equal(quick.next?.label, "Concepts");
  assert.equal(neighbours("api", "docs/index.md").previous, undefined);
  const last = flat[flat.length - 1];
  assert.equal(neighbours(last?.repoKey ?? "", last?.file ?? "").next, undefined);
  assert.equal(neighbours("nope", "docs/x.md").next, undefined);
});

test("findEntry returns the group for the breadcrumb", () => {
  assert.equal(findEntry("api", "docs/rest-api.md")?.group, "Reference");
  assert.equal(findEntry("api", "docs/none.md"), undefined);
});
