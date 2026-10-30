type State = "up" | "degraded" | "maintenance";

const ROWS: { name: string; state: State; label: string; note?: string; bars?: boolean }[] = [
  { name: "Website", state: "up", label: "Up", bars: true },
  {
    name: "Checkout API",
    state: "degraded",
    label: "Degraded",
    note: "Slower than its latency objective since 14:02.",
  },
  { name: "Nightly backup", state: "up", label: "Up", note: "Last ping 03:14 · heartbeat" },
  {
    name: "Search",
    state: "maintenance",
    label: "Maintenance",
    note: "Planned index rebuild until 16:00.",
  },
];

/** Static mock of the status page. Every state is a word; the bars are decoration. */
export function StatusMock() {
  return (
    <figure className="status-mock">
      <div className="mock-head">
        <span className="mock-name">Acme status</span>
        <span className="state state-degraded">
          <span className="state-dot" aria-hidden="true" />
          Partial degradation
        </span>
      </div>
      <ul className="mock-rows">
        {ROWS.map((r) => (
          <li key={r.name} className="mock-row">
            <span className="mock-check">{r.name}</span>
            <span className={`state state-${r.state}`}>
              <span className="state-dot" aria-hidden="true" />
              {r.label}
            </span>
            {r.bars ? (
              <span className="bars" aria-hidden="true">
                {Array.from({ length: 30 }, (_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: 30 identical decorative bars
                  <span key={`bar-${i + 1}`} className={i === 17 ? "bar bar-warn" : "bar"} />
                ))}
              </span>
            ) : null}
            {r.note ? <span className="mock-note">{r.note}</span> : null}
          </li>
        ))}
      </ul>
      <figcaption className="mock-caption">
        Example only: Website up, Checkout API degraded, Nightly backup up, Search in maintenance.
      </figcaption>
    </figure>
  );
}
