import { test } from "bun:test";
import assert from "node:assert/strict";
import { CspError, contentSecurityPolicy, cspMetaTag, cspProblems, withCsp } from "./csp.ts";
import { themeScriptHash } from "./theme-hash.ts";
import { THEME_SCRIPT } from "./theme-script.ts";

/**
 * The hash of THEME_SCRIPT, pinned. Changing the theme script means updating this pin on purpose;
 * a computed-only test would always match its own script.
 */
const THEME_SCRIPT_HASH = "sha256-m2/mfe1OQmY5a40WTYgDAY4XxsBxNZ4wP7fBc7UnTs4=";

const POLICY =
  "default-src 'self'; script-src 'self' 'sha256-m2/mfe1OQmY5a40WTYgDAY4XxsBxNZ4wP7fBc7UnTs4='; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";

const page = (head: string, body = "<p>x</p>"): string =>
  `<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`;
const THEME = `<script>${THEME_SCRIPT}</script>`;
const GOOD_HEAD = `<meta charSet="utf-8"/><title>t</title>${THEME}<script type="module" src="/a.js"></script>`;

test("the policy is exact and the theme script hash is pinned", () => {
  assert.equal(themeScriptHash(), THEME_SCRIPT_HASH);
  assert.equal(contentSecurityPolicy(), POLICY);
});

test("the policy has no unsafe sources, no meta-ignored directives and needs no escaping", () => {
  const policy = contentSecurityPolicy();
  for (const bad of ["'unsafe-inline'", "'unsafe-eval'", "frame-ancestors", "report-", "sandbox"]) {
    assert.equal(policy.includes(bad), false, bad);
  }
  assert.doesNotMatch(policy, /["&<>]/);
  assert.equal(cspMetaTag(), `<meta http-equiv="Content-Security-Policy" content="${POLICY}">`);
});

test("withCsp puts the tag right after the single <head>", () => {
  const html = withCsp(page(GOOD_HEAD));
  assert.ok(html.includes(`<head>${cspMetaTag()}<meta charSet="utf-8"/>`));
  assert.ok(html.indexOf("<meta charSet") < 1024);
  assert.deepEqual(cspProblems("index.html", html), []);
  assert.equal(withCsp('<head class="x"></head>'), `<head class="x">${cspMetaTag()}</head>`);
});

test("withCsp throws on zero or two <head> tags; <header> is not one", () => {
  assert.throws(() => withCsp("<html><body><header></header></body></html>"), CspError);
  assert.throws(() => withCsp("<head></head><head></head>"), /found 2/);
  assert.equal(new CspError("x").name, "CspError");
});

function problemsOf(html: string): string {
  return cspProblems("a.html", html).join("\n");
}

test("cspProblems rejects a missing, a second or a misplaced CSP meta tag", () => {
  assert.match(problemsOf(page(GOOD_HEAD)), /0 CSP meta tags/);
  assert.match(problemsOf(page(cspMetaTag() + cspMetaTag() + GOOD_HEAD)), /2 CSP meta tags/);
  assert.match(
    problemsOf(page(`<meta charSet="utf-8"/>${cspMetaTag()}${THEME}`)),
    /not the first element/,
  );
});

test("cspProblems rejects another policy and a script hash that does not match", () => {
  const other = cspMetaTag().replace("form-action 'none'", "form-action 'self'");
  assert.match(problemsOf(page(other + GOOD_HEAD)), /expected the site policy/);
  const changed = `<script>${THEME_SCRIPT} </script>`;
  assert.match(
    problemsOf(page(`${cspMetaTag()}${changed}`)),
    /^a\.html: the inline script hash sha256-\S+ is not in script-src$/,
  );
});

test("cspProblems rejects a second inline script, a style attribute and a <style> element", () => {
  const good = cspMetaTag() + GOOD_HEAD;
  assert.match(problemsOf(page(`${good}<script>1</script>`)), /2 inline scripts/);
  assert.match(problemsOf(page(good, '<p style="color:red">x</p>')), /a style attribute/);
  assert.match(problemsOf(page(`${good}<style>p{}</style>`)), /a <style> element/);
  assert.equal(problemsOf(page(good, "<p>style=&quot;x&quot; &lt;style&gt;</p>")), "");
});

test("cspProblems reads style attributes and <style> like the browser's tag reader", () => {
  const good = cspMetaTag() + GOOD_HEAD;
  for (const body of [
    '<p/style="color:red" id=t>x</p>',
    '<p id=t title="t"style="color:red">x</p>',
    "<P STYLE=color:red>x</P>",
    "<p\fstyle>x</p>",
  ]) {
    assert.match(problemsOf(page(good, body)), /^a\.html: a style attribute$/, body);
  }
  for (const head of [
    "<style/>p{}</style>",
    "<STYLE\n>p{}</style>",
    "<style media=x>p{}</style>",
  ]) {
    assert.match(problemsOf(page(good + head)), /^a\.html: a <style> element$/, head);
  }
  assert.equal(
    problemsOf(page(good, '<p data-style="x" title="style=y">x</p><styles></styles>')),
    "",
  );
});

test("cspProblems ends inline scripts like the browser's tokenizer", () => {
  const good = cspMetaTag() + GOOD_HEAD;
  for (const body of [
    "<script>alert(1)</script/><p>x</p>",
    "<script>alert(1)</script x><p>x</p>",
    "<script>alert(1)</script\n/><p>x</p>",
    "<SCRIPT/>alert(1)</SCRIPT\t>",
    "<script>alert(1)",
  ]) {
    assert.match(problemsOf(page(good, body)), /^a\.html: 2 inline scripts, expected 1$/, body);
  }
  // A `<script` inside script text is counted too (failing closed): more scripts, never fewer.
  assert.match(
    problemsOf(page(good, '<script>"<script>x</scripts>"</script>')),
    /^a\.html: 3 inline scripts, expected 1$/,
  );
  // A script with src is not inline, whatever its end tag.
  assert.equal(problemsOf(page(good, '<script src="/b.js"></script/>')), "");
  // The theme script itself still hashes right when its end tag has another form.
  const odd = `${cspMetaTag()}<script>${THEME_SCRIPT}</script\n>`;
  assert.equal(problemsOf(page(odd)), "");
});

test("cspProblems reads the CSP meta tag like the browser's tag reader", () => {
  const meta = cspMetaTag();
  const slashed = meta.replace("<meta http-equiv", "<meta/http-equiv");
  const upper = meta
    .replace("<meta http-equiv=", "<META HTTP-EQUIV=")
    .replace("Content-Se", "CONTENT-SE");
  assert.equal(problemsOf(page(upper + GOOD_HEAD)), "");
  assert.match(problemsOf(page(meta + slashed + GOOD_HEAD)), /^a\.html: 2 CSP meta tags/);
  assert.match(problemsOf(page(meta + upper + GOOD_HEAD)), /^a\.html: 2 CSP meta tags/);
  assert.match(
    problemsOf(page(`x${meta}${GOOD_HEAD}`)),
    /^a\.html: the CSP meta tag is not the first element of <head>$/,
  );
  assert.match(
    problemsOf(`<html>${meta}<body>${THEME}</body></html>`),
    /^a\.html: the CSP meta tag is not the first element of <head>$/,
  );
  assert.equal(problemsOf(page(`\n\t${meta}${GOOD_HEAD}`)), "");
});

test("cspProblems is not fooled by tags the browser does not read as tags", () => {
  const good = cspMetaTag() + GOOD_HEAD;
  for (const body of [
    '<!-- <script src="/x.js"> --><script>alert(1)</script>',
    '<p title="<script src=/x.js>">x</p><script>alert(1)</script>',
    "<textarea><script src=/x.js></textarea><script>alert(1)</script>",
    "<noscript><script src=/x.js></noscript><script>alert(1)</script>",
    "<title><script src=/x.js></title><script>alert(1)</script>",
  ]) {
    assert.match(problemsOf(page(good, body)), /2 inline scripts, expected 1/, body);
  }
  const meta = cspMetaTag();
  const rest = `<meta charSet="utf-8"/>${THEME}</head><body></body></html>`;
  for (const html of [
    `<html><!--<head>${meta}--><head>${rest}`,
    `<!doctype html><!--x--><html><head>${meta}${rest}`,
    `<html><template><head>${meta}</template><head>${rest}`,
    `<html><p title="<head>${meta}"><head>${rest}`,
    `<html>x<head>${meta}${rest}`,
  ]) {
    assert.match(problemsOf(html), /0 CSP meta tags|not the first element of <head>/, html);
  }
  // A CSP meta tag in a comment is counted too (failing closed).
  const other = meta.replace("form-action 'none'", "form-action 'self'");
  assert.match(problemsOf(`<html><head>${other}<!--${meta}-->${rest}`), /2 CSP meta tags/);
  // The prefix the browser reads: whitespace, doctype, <html> and <head> with any attributes.
  assert.equal(
    problemsOf(` \n<!DOCTYPE html>\n<HTML lang="en" data-x="<head>"><HEAD/>\n${meta}${rest}`),
    "",
  );
  assert.equal(problemsOf(`<head>${meta}${rest}`), "");
});
