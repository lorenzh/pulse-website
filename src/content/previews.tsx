import { CLI_WIZARD_PROMPTS, CONSOLE_SETUP } from "./facts.ts";

const STATUS_ROWS = [
  { name: "Shop", state: "up", label: "Up" },
  { name: "API", state: "up", label: "Up" },
  { name: "Search", state: "maintenance", label: "Maintenance" },
] as const;

function StatusPreview() {
  return (
    <div
      className="preview-screen"
      role="img"
      aria-label="Status page preview: Acme status, all systems operational. Shop up, API up, Search in maintenance."
    >
      <div className="preview-head" aria-hidden="true">
        <span className="mock-name">Acme status</span>
      </div>
      <p className="preview-summary" aria-hidden="true">
        All systems operational
      </p>
      <ul className="preview-rows" aria-hidden="true">
        {STATUS_ROWS.map((r) => (
          <li key={r.name} className="preview-row">
            <span>{r.name}</span>
            <span className={`state state-${r.state}`}>
              <span className="state-dot" />
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CliPreview() {
  const [setup, ...services] = CLI_WIZARD_PROMPTS;
  const place = services.pop();
  const line = (p: { question: string; hint: string }) => (
    <div key={p.question} className="term-out">{`${p.question} ${p.hint}`}</div>
  );
  return (
    <div
      className="terminal preview-screen"
      role="img"
      aria-label="CLI wizard preview: the first questions of pulse init."
    >
      <div className="terminal-body" aria-hidden="true">
        <div className="term-line">
          <span className="term-prompt">$ </span>pulse init
        </div>
        {line(setup)}
        {services.map(line)}
        <div className="term-out">…</div>
        {place ? line(place) : null}
        <div className="term-out">…</div>
      </div>
    </div>
  );
}

function ConsolePreview() {
  return (
    <div
      className="preview-screen preview-console"
      role="img"
      aria-label="Console preview: the Create the owner account page of first-run setup."
    >
      <p className="preview-title" aria-hidden="true">
        {CONSOLE_SETUP.title}
      </p>
      {CONSOLE_SETUP.labels.map((label) => (
        <div key={label} className="preview-field" aria-hidden="true">
          <span>{label}</span>
          <span className="preview-box" />
        </div>
      ))}
      <div className="preview-actions" aria-hidden="true">
        {CONSOLE_SETUP.actions.map((action) => (
          <span key={action} className="preview-action">
            {action}
          </span>
        ))}
      </div>
    </div>
  );
}

const PREVIEWS = [
  {
    key: "status",
    screen: <StatusPreview />,
    tag: "Available",
    caption: "Status page: components with their state as a word.",
  },
  {
    key: "cli",
    screen: <CliPreview />,
    tag: "Coming soon",
    caption: "CLI wizard: the first questions of pulse init, abbreviated.",
  },
  {
    key: "console",
    screen: <ConsolePreview />,
    tag: "Preview · in progress",
    caption: "Console: first-run setup as it ships today. Check management is planned.",
  },
] as const;

/** Three static, noninteractive previews: status page, CLI wizard and console setup. */
export function InActionPreviews() {
  return (
    <ul className="preview-grid">
      {PREVIEWS.map((p) => (
        <li key={p.key}>
          <figure className="card preview" data-reveal>
            {p.screen}
            <figcaption>
              <span className="tag">{p.tag}</span> {p.caption}
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
