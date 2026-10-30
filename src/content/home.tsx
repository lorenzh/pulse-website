import { Icon, type IconName } from "../components/Icon.tsx";
import { highlight } from "../docs/highlight.ts";
import { ArchitectureDiagram } from "./architecture.tsx";
import {
  CHECKS_SAMPLE,
  CLONE_COMMANDS,
  COMPOSE_COMMANDS,
  COMPOSE_SERVICES,
  STATUS_PAGE_URL,
} from "./facts.ts";
import { scrollRegion } from "./hosted.tsx";
import { StatusMock } from "./status-mock.tsx";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "globe",
    title: "HTTP checks",
    text: "Status code, latency objective, a keyword in the body, retries and timeouts per check.",
  },
  {
    icon: "lock",
    title: "TLS certificates",
    text: "Days until expiry for every host, with a warning threshold you set.",
  },
  {
    icon: "pulse",
    title: "Heartbeats",
    text: "Cron jobs and workers ping pulse. No ping within the period and grace opens an incident.",
  },
  {
    icon: "shield",
    title: "Quorum",
    text: "Probes in several locations. A check is down only when the quorum agrees.",
  },
  {
    icon: "calendar",
    title: "Maintenance windows",
    text: "Planned work shows as maintenance, not as an outage, and opens no incident.",
  },
  {
    icon: "monitor",
    title: "White-label status page",
    text: "Your name, logo, colours and fonts. Light and dark, accessible, works without tracking.",
  },
  {
    icon: "bell",
    title: "Notifications",
    text: "Slack, Microsoft Teams, email, webhooks (optionally HMAC-signed) and a file, with reminders while an incident stays open.",
  },
  {
    icon: "chart",
    title: "Metrics and health",
    text: "Every service exposes /metrics for Prometheus and health endpoints for your orchestrator.",
  },
];

const DOC_CARDS = [
  {
    kicker: "Start here",
    title: "Quick start",
    text: "Run the whole stack with Docker Compose.",
    href: "/docs/api/install/",
  },
  {
    kicker: "Concepts",
    title: "States, quorum and incidents",
    text: "How pulse decides that something is up, degraded or down.",
    href: "/docs/api/concepts/",
  },
  {
    kicker: "Reference",
    title: "REST API",
    text: "Every endpoint with parameters, responses and curl examples.",
    href: "/docs/api/rest-api/",
  },
] as const;

function Terminal() {
  const lines = [...CLONE_COMMANDS, ...COMPOSE_COMMANDS];
  return (
    <div className="terminal" role="img" aria-label="Terminal: starting pulse with Docker Compose">
      <div className="terminal-bar" aria-hidden="true">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
        <span className="terminal-title">~/pulse-api</span>
      </div>
      <div className="terminal-body" aria-hidden="true">
        {lines.map((l) => (
          <div key={l} className="term-line">
            <span className="term-prompt">$ </span>
            {l}
          </div>
        ))}
        {COMPOSE_SERVICES.map((s) => (
          <div key={s} className="term-out">
            {` Container pulse-${s}-1  ${s === "api" ? "Healthy" : "Started"}`}
          </div>
        ))}
        <div className="term-out">
          Status page <span className="term-link">{STATUS_PAGE_URL}</span>
        </div>
      </div>
    </div>
  );
}

function ChecksSample() {
  const json = JSON.stringify(CHECKS_SAMPLE, null, 2);
  return (
    <div className="code-card">
      <div className="code-card-title">checks.json</div>
      <pre className="code" {...scrollRegion("Example checks.json")}>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: our own highlighter escapes the constant sample */}
        <code dangerouslySetInnerHTML={{ __html: highlight(json, "json") }} />
      </pre>
    </div>
  );
}

export function HomeContent() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Uptime monitor · Status page · MIT licensed</p>
          <h1 className="t-display">
            Know when it breaks. Tell people <span className="t-accent">when it’s back</span>.
          </h1>
          <p className="t-lead lead">
            pulse checks HTTP endpoints, TLS certificates and cron jobs from several locations,
            decides by quorum, and keeps a calm public status page. Incidents reach Slack, Teams,
            email, a webhook or a file. Self-hosted with one Docker Compose file.
          </p>
          <div className="btn-row">
            <a className="btn btn-primary" href="/docs/api/install/">
              Start with Docker Compose
              <Icon name="arrow" size={16} />
            </a>
            <a className="btn btn-secondary" href="#how">
              See how it works
            </a>
          </div>
        </div>
        <Terminal />
      </section>

      <section className="band" aria-labelledby="preview-title">
        <div className="split">
          <div>
            <p className="eyebrow">The status page</p>
            <h2 id="preview-title" className="t-h2">
              What your visitors see
            </h2>
            <p className="lead">
              Every check with its state written as a word, 90 days of uptime, open and recently
              resolved incidents, and planned maintenance. Targets and error reasons stay private by
              default. Your name, logo, colours and fonts replace the losoft look with one theme
              file.
            </p>
            <a href="/docs/status/theming/">Theming and white label</a>
          </div>
          <StatusMock />
        </div>
      </section>

      <section id="features" className="band" aria-labelledby="features-title">
        <p className="eyebrow">Features</p>
        <h2 id="features-title" className="t-h2">
          Everything a small team needs, nothing it has to babysit
        </h2>
        <ul className="feature-grid">
          {FEATURES.map((f) => (
            <li key={f.title} className="card">
              <Icon name={f.icon} size={22} />
              <h3 className="t-h3">{f.title}</h3>
              <p>{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="how" className="band" aria-labelledby="how-title">
        <p className="eyebrow">How it works</p>
        <h2 id="how-title" className="t-h2">
          Four small services, one shared contract
        </h2>
        <p className="lead">
          Probes run the checks and post results. The API decides the state of every check and keeps
          the incidents. The status page and the notifier only read from it.
        </p>
        <ArchitectureDiagram />
        <p>
          All four share <code>pulse-contract</code>: the wire types, runtime validators and a
          version header, so a mismatched deploy fails loudly instead of quietly.
        </p>
      </section>

      <section className="band" aria-labelledby="start-title">
        <div className="split">
          <div>
            <p className="eyebrow">Configuration</p>
            <h2 id="start-title" className="t-h2">
              Checks live in one file
            </h2>
            <p className="lead">
              Describe each check in <code>checks.json</code>. Unknown keys stop the start with one
              line that names the entry and the key, so typos never pass silently.
            </p>
            <a href="/docs/api/configuration/">Read the configuration guide</a>
          </div>
          <ChecksSample />
        </div>
      </section>

      <section className="band" aria-labelledby="docs-title">
        <p className="eyebrow">Documentation</p>
        <h2 id="docs-title" className="t-h2">
          Written from the code, kept next to it
        </h2>
        <ul className="card-grid">
          {DOC_CARDS.map((c) => (
            <li key={c.href}>
              <a className="card card-link" href={c.href}>
                <span className="eyebrow">{c.kicker}</span>
                <span className="t-h3">{c.title}</span>
                <span>{c.text}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
