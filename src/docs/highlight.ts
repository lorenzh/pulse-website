import { escapeHtml } from "./escape.ts";

type Kind = "key" | "string" | "number" | "punct" | "comment" | "keyword";

function wrap(kind: Kind, text: string): string {
  return `<span class="tok-${kind}">${escapeHtml(text)}</span>`;
}

const JSON_TOKEN =
  // eslint-disable-next-line sonarjs/regex-complexity -- one tokenizer pattern for json
  /("(?:[^"\\\n]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;

function highlightJson(code: string): string {
  let out = "";
  let last = 0;
  for (const m of code.matchAll(JSON_TOKEN)) {
    out += escapeHtml(code.slice(last, m.index));
    if (m[1] !== undefined) {
      out += m[2] === undefined ? wrap("string", m[1]) : wrap("key", m[1]) + wrap("punct", m[2]);
    } else if (m[3] !== undefined) out += wrap("number", m[3]);
    else if (m[4] !== undefined) out += wrap("keyword", m[4]);
    else out += wrap("punct", m[5] ?? "");
    last = (m.index ?? 0) + m[0].length;
  }
  return out + escapeHtml(code.slice(last));
}

function highlightYamlLine(line: string): string {
  const comment = /^(\s*)(#.*)$/.exec(line);
  if (comment) return escapeHtml(comment[1] ?? "") + wrap("comment", comment[2] ?? "");
  const kv = /^(\s*(?:- )?)([A-Za-z0-9_."-]+)(:)(\s.*|)$/.exec(line);
  if (!kv) return escapeHtml(line);
  const value = kv[4] ?? "";
  // eslint-disable-next-line sonarjs/super-linear-regex -- a single yaml line
  const body = /^(\s*)(.*?)(\s+#.*)?$/.exec(value);
  const lead = body?.[1] ?? "";
  const scalar = body?.[2] ?? "";
  const tail = body?.[3] ?? "";
  let rendered = escapeHtml(scalar);
  if (/^-?\d+(\.\d+)?$/.test(scalar)) rendered = wrap("number", scalar);
  else if (/^".*"$|^'.*'$/.test(scalar)) rendered = wrap("string", scalar);
  return (
    escapeHtml(kv[1] ?? "") +
    wrap("key", kv[2] ?? "") +
    wrap("punct", ":") +
    escapeHtml(lead) +
    rendered +
    (tail
      ? wrap("comment", tail.trimStart()).replace(
          "<span",
          `${escapeHtml(tail.slice(0, tail.length - tail.trimStart().length))}<span`,
        )
      : "")
  );
}

function highlightYaml(code: string): string {
  return code.split("\n").map(highlightYamlLine).join("\n");
}

const BASH_TOKEN =
  // eslint-disable-next-line sonarjs/regex-complexity -- one tokenizer pattern for shell
  /((?<=^|\s)#.*$)|("(?:[^"\\]|\\.)*"|'[^']*')|(\s--?[A-Za-z][\w-]*)|(\$\{?[A-Za-z_]\w*\}?)/gm;

function highlightBash(code: string): string {
  let out = "";
  let last = 0;
  for (const m of code.matchAll(BASH_TOKEN)) {
    const start = m.index ?? 0;
    out += escapeHtml(code.slice(last, start));
    if (m[1] !== undefined) out += wrap("comment", m[1]);
    else if (m[2] !== undefined) out += wrap("string", m[2]);
    else if (m[3] !== undefined) out += escapeHtml(m[3].slice(0, 1)) + wrap("key", m[3].slice(1));
    else out += wrap("number", m[4] ?? "");
    last = start + m[0].length;
  }
  return out + escapeHtml(code.slice(last));
}

const LANGUAGES: ReadonlyMap<string, (code: string) => string> = new Map([
  ["json", highlightJson],
  ["jsonc", highlightJson],
  ["yaml", highlightYaml],
  ["yml", highlightYaml],
  ["sh", highlightBash],
  ["bash", highlightBash],
  ["shell", highlightBash],
]);

/** Small own tokenizer for json, yaml and bash. Other languages are escaped plain text. */
export function highlight(code: string, language: string | undefined): string {
  const tokenize = language === undefined ? undefined : LANGUAGES.get(language);
  return tokenize ? tokenize(code) : escapeHtml(code);
}
