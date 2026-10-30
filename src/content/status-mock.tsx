type State = "up" | "degraded" | "maintenance";
type Row = { name: string; state: State; label: string; note?: string; bars?: boolean };
type Snapshot = { summary: { state: State; label: string }; rows: Row[] };

const SNAPSHOTS: Snapshot[] = [
  {
    summary: { state: "degraded", label: "Partial degradation" },
    rows: [
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
    ],
  },
  {
    summary: { state: "up", label: "All systems operational" },
    rows: [
      { name: "Website", state: "up", label: "Up", bars: true },
      {
        name: "Checkout API",
        state: "up",
        label: "Up",
        note: "Back within its latency objective.",
      },
      { name: "Nightly backup", state: "up", label: "Up", note: "Last ping 03:14 · heartbeat" },
      {
        name: "Search",
        state: "maintenance",
        label: "Maintenance",
        note: "Planned index rebuild until 16:00.",
      },
    ],
  },
];

function RowItem({ row }: { row: Row }) {
  return (
    <li className="mock-row">
      <span className="mock-check">{row.name}</span>
      <span className={`state state-${row.state}`}>
        <span className="state-dot" aria-hidden="true" />
        {row.label}
      </span>
      {row.bars ? (
        <span className="bars" aria-hidden="true">
          {Array.from({ length: 30 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 30 identical decorative bars
            <span key={`bar-${i + 1}`} className={i === 17 ? "bar bar-warn" : "bar"} />
          ))}
        </span>
      ) : null}
      {row.note ? <span className="mock-note">{row.note}</span> : null}
    </li>
  );
}

/**
 * Mock of the status page. Every state is a word; the bars are decoration. The snapshots share
 * one grid cell, so the box never changes size. Only the first one is exposed without
 * JavaScript; the `live-preview` island swaps the visible one and moves `aria-hidden` with it, so
 * the accessible text always equals the visible text.
 */
export function StatusMock() {
  return (
    <figure className="status-mock" data-island="live-preview">
      <div className="mock-head">
        <span className="mock-name">Acme status</span>
        <span className="mock-ago">
          Updated <span data-ago>0</span> s ago
        </span>
      </div>
      <div className="mock-states">
        {SNAPSHOTS.map((snapshot, index) => (
          <div
            key={snapshot.summary.label}
            className="mock-state"
            data-state
            data-active={index === 0}
            {...(index === 0 ? {} : { "aria-hidden": "true" as const })}
          >
            <p className="mock-summary">
              <span className={`state state-${snapshot.summary.state}`}>
                <span className="state-dot" aria-hidden="true" />
                {snapshot.summary.label}
              </span>
            </p>
            <ul className="mock-rows">
              {snapshot.rows.map((row) => (
                <RowItem key={row.name} row={row} />
              ))}
            </ul>
          </div>
        ))}
      </div>
      <figcaption className="mock-caption">
        Example only. The preview changes every few seconds, unless you prefer reduced motion.
      </figcaption>
    </figure>
  );
}
