import { Icon, type IconName } from "./Icon.tsx";

/**
 * A link styled as a button. The primary button moves its arrow on hover and focus. The outline
 * button has a curtain (`.fill`) in the accent colour that carries a second, `aria-hidden` copy of
 * the label in `--on-strong`; the curtain clips that copy, so every glyph is either `--text` on
 * the page background or `--on-strong` on the accent, never a mix (contrast stays >= 4.5:1).
 */
export function ButtonLink({
  href,
  variant,
  label,
  icon,
  iconSide = "end",
}: {
  href: string;
  variant: "primary" | "secondary";
  label: string;
  icon?: IconName;
  iconSide?: "start" | "end";
}) {
  const content = (arrow: boolean) => (
    <>
      {icon && iconSide === "start" ? <Icon name={icon} size={16} /> : null}
      {label}
      {icon && iconSide === "end" ? (
        <Icon name={icon} size={16} {...(arrow ? { className: "btn-arrow" } : {})} />
      ) : null}
    </>
  );
  if (variant === "primary") {
    return (
      <a className="btn btn-primary" href={href}>
        {content(icon === "arrow")}
      </a>
    );
  }
  return (
    <a className="btn btn-secondary" href={href}>
      {content(false)}
      <span className="fill" aria-hidden="true">
        {content(false)}
      </span>
    </a>
  );
}
