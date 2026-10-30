import { test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CHANNELS,
  CHECKS_SAMPLE,
  CLONE_COMMANDS,
  COMPOSE_COMMANDS,
  COMPOSE_SERVICES,
  ENV_VARS,
  STATUS_PAGE_URL,
} from "./facts.ts";

const fixture = (name: string): string => readFileSync(`test/fixtures/${name}`, "utf8");
const install = fixture("api-install.md");
const compose = fixture("api-compose.yaml");

test("the Compose commands on the home page are in install.md", () => {
  for (const command of COMPOSE_COMMANDS) {
    assert.ok(install.includes(command), `install.md does not contain: ${command}`);
  }
});

test("the clone commands use the pulse-api repository of docs.config.json", () => {
  const config = JSON.parse(readFileSync("docs.config.json", "utf8")) as {
    repos: { api: { repo: string } };
  };
  assert.equal(CLONE_COMMANDS[0], `git clone https://github.com/${config.repos.api.repo}.git`);
  assert.equal(CLONE_COMMANDS[1], `cd ${config.repos.api.repo.split("/")[1]}`);
  assert.ok(compose.includes("name: pulse"));
});

test("the status page URL and the ports are the documented ones", () => {
  assert.ok(install.includes(`Open ${STATUS_PAGE_URL}`));
  // biome-ignore lint/suspicious/noTemplateCurlyInString: compose.yaml contains this literal text
  assert.ok(compose.includes("${PULSE_API_PORT:-3000}:3000"));
  // biome-ignore lint/suspicious/noTemplateCurlyInString: compose.yaml contains this literal text
  assert.ok(compose.includes("${PULSE_STATUS_PORT:-8080}:8080"));
  assert.equal(ENV_VARS.PULSE_API_PORT, "3000");
  assert.equal(ENV_VARS.PULSE_STATUS_PORT, "8080");
});

test("every env var on the page appears in compose.yaml with its default", () => {
  for (const [name, fallback] of Object.entries(ENV_VARS)) {
    assert.ok(compose.includes(name), `${name} missing in compose.yaml`);
    if (fallback !== "none") assert.ok(compose.includes(`${name}:-${fallback}`), `${name} default`);
  }
});

test("one Compose file starts api, probe, status and notify without a profile", () => {
  const services = compose.split(/\nservices:\n/)[1]?.split(/\nconfigs:\n|\nvolumes:\n/)[0] ?? "";
  const blocks = services.split(/\n {2}(?=[a-z][\w-]*:\n)/);
  const plain = blocks
    // eslint-disable-next-line sonarjs/super-linear-regex -- small fixed fixture
    .filter((b) => !/\n\s+profiles:/.test(b))
    .map((b) => /^\s*([a-z][\w-]*):/.exec(b)?.[1])
    .filter((n): n is string => n !== undefined && n !== "");
  for (const name of COMPOSE_SERVICES) assert.ok(plain.includes(name), `service ${name}`);
});

test("the notification channels are the five of pulse-notify", () => {
  const channels = fixture("notify-channels.md");
  assert.equal(CHANNELS.length, 5);
  for (const type of ["slack", "teams", "email", "webhook", "file"]) {
    assert.ok(channels.includes(`\`${type}\``) || channels.includes(`channels/${type}.md`), type);
  }
});

test("the endpoints named on the page exist in rest-api.md", () => {
  const rest = fixture("api-rest-api.md");
  assert.ok(rest.includes("## POST /results"));
  assert.ok(rest.includes("/heartbeat/:id"));
});

test("the checks.json sample is a copy of checks in the pinned example", () => {
  const example = JSON.parse(fixture("api-checks.example.json")) as { checks: { id: string }[] };
  for (const check of CHECKS_SAMPLE.checks) {
    const pinned = example.checks.find((c) => c.id === check.id);
    assert.ok(pinned, `${check.id} is not in checks.example.json`);
    assert.deepEqual(JSON.parse(JSON.stringify(check)), pinned);
  }
});
