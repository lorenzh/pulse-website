const SERVICES = [
  {
    name: "pulse-probe",
    badge: "One per location",
    text: "Runs HTTP, TLS, TCP, DNS and domain checks, reloads them from the API and buffers results while it is away.",
  },
  {
    name: "pulse-api",
    badge: "The source of truth",
    text: "Stores results in SQLite, applies quorum and maintenance, rolls checks up into components, opens and resolves incidents, takes heartbeat pings and admin changes without a restart.",
  },
  { name: "pulse-status", badge: "Read only", text: "The public page, redacted and cached." },
  {
    name: "pulse-notify",
    badge: "Read only",
    text: "Sends opened, resolved and reminder messages, at least once.",
  },
] as const;

/** Inline SVG with a title, a description and the same facts as a list below it. */
export function ArchitectureDiagram() {
  return (
    <div className="architecture">
      <svg
        className="diagram"
        viewBox="0 0 720 220"
        role="img"
        aria-labelledby="arch-title arch-desc"
      >
        <title id="arch-title">How the pulse services connect</title>
        <desc id="arch-desc">
          The probe posts results to the API. The status page and the notifier read from the API.
          All four share pulse-contract.
        </desc>
        <defs>
          <marker
            id="arch-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path d="M0 0 10 5 0 10z" fill="currentColor" />
          </marker>
        </defs>
        <g className="diagram-box">
          <rect x="8" y="80" width="150" height="60" rx="12" />
          <rect x="285" y="80" width="150" height="60" rx="12" className="diagram-core" />
          <rect x="562" y="16" width="150" height="60" rx="12" />
          <rect x="562" y="144" width="150" height="60" rx="12" />
        </g>
        <g className="diagram-text">
          <text x="83" y="116" textAnchor="middle">
            pulse-probe
          </text>
          <text x="360" y="116" textAnchor="middle">
            pulse-api
          </text>
          <text x="637" y="52" textAnchor="middle">
            pulse-status
          </text>
          <text x="637" y="180" textAnchor="middle">
            pulse-notify
          </text>
        </g>
        <g className="diagram-line" markerEnd="url(#arch-arrow)">
          <path d="M160 110H281" />
          <path d="M437 96 560 52" />
          <path d="M437 124 560 168" />
        </g>
        <g className="diagram-label">
          <text x="220" y="100" textAnchor="middle">
            POST /results
          </text>
          <text x="500" y="64" textAnchor="middle">
            GET
          </text>
          <text x="500" y="168" textAnchor="middle">
            GET
          </text>
        </g>
      </svg>
      <ol className="service-list">
        {SERVICES.map((s) => (
          <li key={s.name} className="card">
            <span className="tag">{s.badge}</span>
            <span className="service-name">{s.name}</span>
            <span>{s.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
