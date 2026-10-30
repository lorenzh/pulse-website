// bun run check:budget: gzip size of HTML, CSS and JS per page against budget.json.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { evaluatePage, parseBudget } from "../src/build/budget.ts";
import { readDist } from "../src/build/dist-files.ts";

const root = process.cwd();
const budget = parseBudget(JSON.parse(await readFile(path.join(root, "budget.json"), "utf8")));
const dist = await readDist(path.join(root, "dist"));
const texts = new Map<string, string>();
for (const f of dist.files.filter((x) => /\.(css|js)$/.test(x)))
  texts.set(`/${f}`, (await dist.text(f)) ?? "");
const sizes = new Map<string, number>();
for (const f of dist.files.filter((x) => x.endsWith(".woff2")))
  sizes.set(`/${f}`, await dist.size(f));

const problems: string[] = [];
const rows: string[] = [];
let worst = { html: 0, css: 0, js: 0 };
for (const [file, html] of dist.html) {
  const result = evaluatePage(
    html,
    budget,
    (p) => texts.get(p),
    (p) => sizes.get(p) ?? 0,
  );
  const u = result.usage;
  worst = {
    html: Math.max(worst.html, u.htmlBytes),
    css: Math.max(worst.css, u.cssBytes),
    js: Math.max(worst.js, u.jsBytes),
  };
  const fonts = Object.entries(u.fontFiles)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
  rows.push(
    `${file.padEnd(34)} html ${u.htmlBytes} css ${u.cssBytes} js ${u.jsBytes} B gzip; fonts ${u.fontBytes} B (${fonts})`,
  );
  problems.push(...result.problems.map((p) => `${file}: ${p}`));
}
console.log(rows.join("\n"));
console.log(`worst page: html ${worst.html} B, css ${worst.css} B, js ${worst.js} B gzip`);
console.log(
  `budget:     html ${budget.htmlBytes} B, css ${budget.cssBytes} B, js ${budget.jsBytes} B gzip`,
);
if (problems.length > 0) {
  console.error(`over budget:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("budget ok");
