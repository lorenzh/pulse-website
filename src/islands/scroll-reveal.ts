// Scroll-in for Home and Hosted. The inline head script sets `js-reveal` on <html> only when
// IntersectionObserver exists and motion is allowed; without it every item is simply visible.
// One observer serves all items; each item is unobserved after its first hit.

const STAGGER_MS = 100;

function reveal(): void {
  if (!document.documentElement.classList.contains("js-reveal")) return;
  const items = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
  const viewport = window.innerHeight;
  // Items already in view show at once, without a transition and without a flash.
  const later = items.filter((item) => {
    const top = item.getBoundingClientRect().top;
    if (top >= viewport * 0.85) return true;
    item.classList.add("is-in", "is-instant");
    return false;
  });
  const pending = new Set(later);
  const show = (item: HTMLElement, delay: number | undefined): void => {
    if (delay === undefined) item.classList.add("is-instant");
    else item.style.setProperty("--reveal-delay", `${delay}ms`);
    item.classList.add("is-in");
    pending.delete(item);
    observer.unobserve(item);
  };
  const observer = new IntersectionObserver(
    (entries) => {
      let order = 0;
      for (const entry of entries) {
        if (entry.isIntersecting && entry.target instanceof HTMLElement) {
          show(entry.target, order * STAGGER_MS);
          order += 1;
        }
      }
      // Items that were jumped past (anchor link, restored scroll) never intersect: show them at
      // once whenever any item changes, instead of leaving them hidden.
      for (const item of pending) {
        if (item.getBoundingClientRect().bottom <= 0) show(item, undefined);
      }
    },
    { threshold: 0.15 },
  );
  for (const item of later) observer.observe(item);
}

reveal();
