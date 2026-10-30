import { Marked, Renderer, type Tokens } from "marked";
import { escapeHtml } from "./escape.ts";
import { highlight } from "./highlight.ts";
import type { ResolvedLink } from "./links.ts";
import { createSlugger } from "./slug.ts";

export type Heading = { depth: number; text: string; id: string };

export type RenderedDoc = {
  title: string;
  description: string;
  html: string;
  headings: Heading[];
};

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

export function htmlToText(html: string): string {
  return (
    html
      // eslint-disable-next-line sonarjs/super-linear-regex -- strips tags from HTML our own renderer produced
      .replace(/<[^>]*>/g, "")
      .replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m)
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

const LANGUAGE_LABEL: Record<string, string> = {
  sh: "Shell commands",
  bash: "Shell commands",
  json: "JSON",
  yaml: "YAML",
  text: "Plain text",
};

function codeLabel(lang: string | undefined): string {
  return (lang && LANGUAGE_LABEL[lang]) || "Code";
}

function calloutClass(inner: string): string {
  const m = /^<p><strong>(Warning|Note)[:.]?<\/strong>/i.exec(inner);
  return m ? ` callout-${(m[1] ?? "").toLowerCase()}` : "";
}

/**
 * Renders GFM to HTML. Raw HTML in the source is escaped, headings get GitHub-style ids,
 * tables and code sit in focusable scroll regions and links go through `resolve`.
 */
export function renderMarkdown(
  source: string,
  resolve: (href: string) => ResolvedLink,
): RenderedDoc {
  const slug = createSlugger();
  const headings: Heading[] = [];
  let title = "";
  const marked = new Marked({
    gfm: true,
    renderer: {
      html({ text }: Tokens.HTML | Tokens.Tag): string {
        return escapeHtml(text);
      },
      heading(this: Renderer, { tokens, depth }: Tokens.Heading): string {
        const inner = this.parser.parseInline(tokens);
        const text = htmlToText(inner);
        const id = slug(text);
        headings.push({ depth, text, id });
        if (depth === 1 && title === "") {
          title = text;
          return "";
        }
        return `<h${depth} id="${escapeHtml(id)}">${inner}</h${depth}>\n`;
      },
      code({ text, lang }: Tokens.Code): string {
        const language = (lang ?? "").split(/\s/)[0] || undefined;
        const label = codeLabel(language);
        const langClass = language ? ` class="language-${escapeHtml(language)}"` : "";
        return (
          `<div class="code-block"><pre class="code" tabindex="0" role="region" aria-label="${label}">` +
          `<code${langClass}>${highlight(text, language)}</code></pre>` +
          `<span class="copy-slot" data-island="copy-button"></span></div>\n`
        );
      },
      table(this: Renderer, token: Tokens.Table): string {
        const first = token.header[0]?.text ?? "";
        const label = `Table: ${htmlToText(first)}`;
        return `<div class="table-scroll" tabindex="0" role="region" aria-label="${escapeHtml(label)}">${Renderer.prototype.table.call(this, token)}</div>\n`;
      },
      blockquote(this: Renderer, { tokens }: Tokens.Blockquote): string {
        const inner = this.parser.parse(tokens);
        return `<blockquote class="callout${calloutClass(inner)}">${inner}</blockquote>\n`;
      },
      checkbox({ checked }: Tokens.Checkbox): string {
        return `<span class="task-box" role="img" aria-label="${checked ? "Done" : "Not done"}">${checked ? "☑" : "☐"}</span> `;
      },
      link(this: Renderer, { href, title: linkTitle, tokens }: Tokens.Link): string {
        const target = resolve(href);
        const rel = target.isExternal ? ' rel="noopener"' : "";
        const t = linkTitle ? ` title="${escapeHtml(linkTitle)}"` : "";
        return `<a href="${escapeHtml(target.href)}"${t}${rel}>${this.parser.parseInline(tokens)}</a>`;
      },
      image({ href, text }: Tokens.Image): string {
        // No images are published: an image becomes a link to its source.
        const target = resolve(href);
        const rel = target.isExternal ? ' rel="noopener"' : "";
        return `<a href="${escapeHtml(target.href)}"${rel}>${escapeHtml(text || href)}</a>`;
      },
    },
  });
  const html = marked.parse(source, { async: false });
  const firstParagraph = marked.lexer(source).find((t) => t.type === "paragraph");
  const description =
    firstParagraph && firstParagraph.type === "paragraph"
      ? truncate(htmlToText(marked.parseInline(firstParagraph.text, { async: false })), 160)
      : "";
  return { title, description, html, headings };
}
