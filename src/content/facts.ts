// Product facts shown on the home page. Each constant names the file it comes from; the facts
// test checks what a machine can check against the pinned copies in test/fixtures/. Where the
// design and the code differ, the code wins. Change a fact only after its source changed.

/** Source: the repository list (docs.config.json: lorenzh/pulse-api holds compose.yaml). */
export const CLONE_COMMANDS = [
  "git clone https://github.com/lorenzh/pulse-api.git",
  "cd pulse-api",
] as const;

/** Source: pulse-api docs/install.md, "With Docker Compose" and "The .env file". */
export const COMPOSE_COMMANDS = [
  "cp .env.example .env",
  'sed -i.bak "s/^PULSE_PROBE_TOKEN=.*/PULSE_PROBE_TOKEN=$(openssl rand -hex 32)/" .env && rm .env.bak',
  "docker compose up -d --build",
] as const;

/** Source: pulse-api compose.yaml (`name: pulse`, services api, probe, status, notify). */
export const COMPOSE_SERVICES = ["api", "probe", "status", "notify"] as const;

/** Source: pulse-api docs/install.md ("Open http://localhost:8080"). */
export const STATUS_PAGE_URL = "http://localhost:8080";

/** Source: pulse-api docs/install.md, table of Compose settings; .env.example. */
export const ENV_VARS = {
  PULSE_PROBE_TOKEN: "none",
  PULSE_LOCATION: "default",
  PULSE_API_PORT: "3000",
  PULSE_STATUS_PORT: "8080",
} as const;

/** Source: pulse-notify docs/channels.md, table of channel types. */
export const CHANNELS = ["Slack", "Microsoft Teams", "email", "webhook", "file"] as const;

/** Source: pulse-api docs/rest-api.md ("POST /results", "GET /checks", "GET /heartbeat/:id"). */
export const ENDPOINTS = {
  postResults: "POST /results",
  heartbeat: "/heartbeat/:id",
} as const;

/**
 * Source: pulse-api checks.example.json (checks `example` and `nightly-backup`, copied as they
 * are). The facts test compares both with the pinned file.
 */
export const CHECKS_SAMPLE = {
  checks: [
    {
      id: "example",
      name: "Example endpoint",
      url: "http://localhost:9000/",
      intervalMs: 10000,
      timeoutMs: 1000,
      latencyObjectiveMs: 500,
      availabilityTarget: 99.9,
      keyword: "ok",
      retries: 2,
      retryDelayMs: 500,
    },
    {
      id: "nightly-backup",
      name: "Nightly backup",
      type: "heartbeat",
      period: 86400000,
      grace: 3600000,
      secret: "replace-with-a-random-secret",
    },
  ],
} as const;

/** Source: pulse-status docs/operation.md and docs/index.md (90 daily bars, hidden details). */
export const STATUS_PAGE_FACTS = {
  uptimeDays: 90,
  detailsHiddenByDefault: true,
} as const;
