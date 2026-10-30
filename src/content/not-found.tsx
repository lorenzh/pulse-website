export function NotFoundContent() {
  return (
    <section className="hero hero-single">
      <p className="eyebrow">404</p>
      <h1 className="t-h1">This page does not exist</h1>
      <p className="t-lead lead">The address may be old or mistyped. Try one of these:</p>
      <div className="btn-row">
        <a className="btn btn-primary" href="/">
          Home
        </a>
        <a className="btn btn-secondary" href="/docs/">
          Docs
        </a>
        <a className="btn btn-secondary" href="/hosted/">
          Hosted
        </a>
      </div>
    </section>
  );
}
