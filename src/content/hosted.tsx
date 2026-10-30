import { Icon, type IconName } from "../components/Icon.tsx";

export const PLACEHOLDERS = [
  "PRICE",
  "REGIONS",
  "TRIAL",
  "DATA_LOCATION",
  "OSS_TERMS",
  "STATUS_URL",
  "AVAILABILITY",
  "LIMIT",
  "BACKUPS",
  "NETWORK_INDEPENDENCE",
  "OPERATION",
  "PARITY",
] as const;

/** A scrolling area must take focus so keyboard users can scroll it; it is labelled as a region. */
export function scrollRegion(label: string) {
  return { role: "region", tabIndex: 0, "aria-label": label } as const;
}

export type PlaceholderName = (typeof PLACEHOLDERS)[number];

/** A commercial fact that nobody has decided yet. Visible on purpose. */
export function Placeholder({ name }: { name: PlaceholderName }) {
  return <mark className="placeholder">{`[${name}]`}</mark>;
}

const INCLUDED: { icon: IconName; title: string; text: React.ReactNode }[] = [
  {
    icon: "server",
    title: "Managed API",
    text: (
      <>
        pulse-api with its database. Upgrades and backups: <Placeholder name="BACKUPS" />
      </>
    ),
  },
  {
    icon: "globe",
    title: "Hosted probes",
    text: (
      <>
        Probes in <Placeholder name="REGIONS" /> decide by quorum. Bring your own probes for
        internal targets, or use both.
      </>
    ),
  },
  {
    icon: "monitor",
    title: "Status page on your domain",
    text: (
      <>
        Planned: white-labelling and TLS for your own domain. <Placeholder name="AVAILABILITY" />
      </>
    ),
  },
  {
    icon: "bell",
    title: "Notifications included",
    text: (
      <>
        Slack, Teams, email and webhooks, planned to be sent from our side.{" "}
        <Placeholder name="AVAILABILITY" />
      </>
    ),
  },
];

type Plan = {
  name: string;
  blurb: string;
  price: React.ReactNode;
  items: React.ReactNode[];
  cta: { label: string; href: string };
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Self-hosted",
    blurb: "Everything, on your own machine.",
    price: (
      <>
        <span className="plan-price">Free</span>
        <span className="plan-per">MIT licence</span>
      </>
    ),
    items: ["All features, one Compose file", "Source and issues on GitHub"],
    cta: { label: "Read the quick start", href: "/docs/api/install/" },
  },
  {
    name: "Starter",
    blurb: "For a side project or a small product.",
    price: (
      <span className="plan-price">
        <Placeholder name="PRICE" />
      </span>
    ),
    items: [
      <>
        <Placeholder name="LIMIT" /> checks and <Placeholder name="LIMIT" /> interval
      </>,
      <>
        Hosted in <Placeholder name="REGIONS" />
      </>,
      <>
        Status page on a pulse subdomain <Placeholder name="AVAILABILITY" />
      </>,
      <>
        <Placeholder name="LIMIT" /> of history
      </>,
    ],
    cta: { label: "Join the waitlist", href: "#waitlist" },
  },
  {
    name: "Team",
    blurb: "For a company with customers to inform.",
    price: (
      <span className="plan-price">
        <Placeholder name="PRICE" />
      </span>
    ),
    items: [
      <>
        <Placeholder name="LIMIT" /> checks and <Placeholder name="LIMIT" /> interval
      </>,
      <>
        Hosted regions plus your own probes <Placeholder name="AVAILABILITY" />
      </>,
      <>
        Your domain, logo, colours and fonts <Placeholder name="AVAILABILITY" />
      </>,
      <>
        Slack, Teams, reminders and heartbeats <Placeholder name="AVAILABILITY" />
      </>,
    ],
    cta: { label: "Join the waitlist", href: "#waitlist" },
    featured: true,
  },
  {
    name: "Business",
    blurb: "For uptime that is part of a contract.",
    price: (
      <span className="plan-price">
        <Placeholder name="PRICE" />
      </span>
    ),
    items: [
      <>
        <Placeholder name="AVAILABILITY" /> availability, in writing
      </>,
      <>
        Data kept in <Placeholder name="DATA_LOCATION" />
      </>,
      <>
        Several status pages, private pages <Placeholder name="AVAILABILITY" />
      </>,
      <>
        Data processing agreement and invoice <Placeholder name="AVAILABILITY" />
      </>,
    ],
    cta: { label: "Join the waitlist", href: "#waitlist" },
  },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Can I move from self-hosted to hosted, and back?",
    a: (
      <>
        That is the plan: hosted pulse is meant to run the same open-source code and read the same{" "}
        <code>checks.json</code>. <Placeholder name="AVAILABILITY" />
      </>
    ),
  },
  {
    q: "Can I monitor services inside my network?",
    a: "Run a pulse-probe inside your network. It only sends results out; nothing needs to reach in.",
  },
  {
    q: "Who counts as an open-source project?",
    a: (
      <>
        <Placeholder name="OSS_TERMS" />
      </>
    ),
  },
  {
    q: "Where is my data stored?",
    a: (
      <>
        <Placeholder name="DATA_LOCATION" />
      </>
    ),
  },
  {
    q: "Who watches the watcher?",
    a: (
      <>
        Hosted pulse will have its own public status page: <Placeholder name="STATUS_URL" />.
      </>
    ),
  },
];

export function HostedContent() {
  return (
    <>
      <section className="hero hero-single">
        <p className="eyebrow">Hosted pulse · Early access</p>
        <h1 className="t-h1">
          The same pulse, <span className="t-accent">without the server</span>.
        </h1>
        <p className="t-lead lead">
          We plan to run the API, the database, the status page and the notifier for you, with
          backups and upgrades. Your checks file stays the same, so you can move between hosted and
          self-hosted.
        </p>
        <p className="notice" role="note">
          These details are not decided yet. Every{" "}
          <mark className="placeholder">[PLACEHOLDER]</mark> on this page stands for a price, a
          limit or a promise that nobody has fixed.
        </p>
        <div className="btn-row">
          <a className="btn btn-primary" href="#waitlist">
            About the waitlist
            <Icon name="arrow" size={16} />
          </a>
          <a className="btn btn-secondary" href="#plans">
            Compare plans
          </a>
        </div>
      </section>

      <section className="band" aria-labelledby="included-title">
        <h2 id="included-title" className="t-h2">
          What we plan to run for you
        </h2>
        <ul className="feature-grid">
          {INCLUDED.map((i) => (
            <li key={i.title} className="card">
              <Icon name={i.icon} size={22} />
              <h3 className="t-h3">{i.title}</h3>
              <p>{i.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="plans" className="band" aria-labelledby="plans-title">
        <p className="eyebrow">Plans</p>
        <h2 id="plans-title" className="t-h2">
          Start free on your own server, move up when you want us to run it
        </h2>
        <ul className="plan-grid">
          {PLANS.map((p) => (
            <li key={p.name} className={p.featured ? "card plan plan-featured" : "card plan"}>
              <h3 className="t-h3">{p.name}</h3>
              <p>{p.blurb}</p>
              <p className="plan-priceline">{p.price}</p>
              <ul className="plan-items">
                {p.items.map((item, n) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: the list is static and never reordered
                  <li key={`${p.name}-${n + 1}`}>
                    <Icon name="check" size={16} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <a className={p.featured ? "btn btn-primary" : "btn btn-secondary"} href={p.cta.href}>
                {p.cta.label}
              </a>
            </li>
          ))}
        </ul>
        <div id="oss" className="card oss">
          <p className="eyebrow">Open source</p>
          <h3 className="t-h3">Terms for open-source projects</h3>
          <p>
            <Placeholder name="OSS_TERMS" />
          </p>
        </div>
        <p className="fineprint">
          Pricing: <Placeholder name="PRICE" />. Trial: <Placeholder name="TRIAL" />.
        </p>
      </section>

      <section className="band" aria-labelledby="compare-title">
        <h2 id="compare-title" className="t-h2">
          Self-hosted or hosted
        </h2>
        <div className="table-scroll" {...scrollRegion("Self-hosted compared with hosted")}>
          <table>
            <thead>
              <tr>
                <th scope="col">You get</th>
                <th scope="col">Self-hosted</th>
                <th scope="col">Hosted</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Who runs the servers</th>
                <td>You</td>
                <td>
                  <Placeholder name="OPERATION" />
                </td>
              </tr>
              <tr>
                <th scope="row">Upgrades and backups</th>
                <td>You run them</td>
                <td>
                  <Placeholder name="BACKUPS" />
                </td>
              </tr>
              <tr>
                <th scope="row">Probe locations</th>
                <td>Wherever you deploy them</td>
                <td>
                  <Placeholder name="REGIONS" />, plus your own
                </td>
              </tr>
              <tr>
                <th scope="row">Is the monitor down when your network is?</th>
                <td>It can be</td>
                <td>
                  <Placeholder name="NETWORK_INDEPENDENCE" />
                </td>
              </tr>
              <tr>
                <th scope="row">Checks file and API</th>
                <td>Same</td>
                <td>
                  <Placeholder name="PARITY" />
                </td>
              </tr>
              <tr>
                <th scope="row">Price</th>
                <td>Free, MIT</td>
                <td>
                  <Placeholder name="PRICE" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="band" aria-labelledby="faq-title">
        <h2 id="faq-title" className="t-h2">
          Questions
        </h2>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="waitlist" className="band" aria-labelledby="waitlist-title">
        <h2 id="waitlist-title" className="t-h2">
          Get early access
        </h2>
        <p className="lead">Sign-up is not open yet. Nothing you type is sent anywhere.</p>
        <form className="waitlist" aria-describedby="waitlist-note">
          <label htmlFor="waitlist-email">Work email</label>
          <div className="waitlist-row">
            <input
              id="waitlist-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              disabled
            />
            <button type="button" className="btn btn-primary" disabled>
              Join the waitlist
            </button>
          </div>
          <span id="waitlist-note" className="fineprint">
            The form is switched off until a person decides how sign-ups are handled.
          </span>
        </form>
      </section>
    </>
  );
}
