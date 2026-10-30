import { test } from "bun:test";
import assert from "node:assert/strict";
import { copyableCommands } from "./commands.ts";

test("only shell languages get a button", () => {
  assert.equal(copyableCommands("json", '$ {"a":1}'), undefined);
  assert.equal(copyableCommands("text", "$ ls"), undefined);
  assert.equal(copyableCommands(undefined, "$ ls"), undefined);
  assert.equal(copyableCommands("yaml", "ls"), undefined);
});

test("with prompts, the prompt is removed and output is skipped", () => {
  const code = "$ curl localhost:3000/checks\n[]\n$ docker compose up -d\nStarted";
  assert.equal(copyableCommands("bash", code), "curl localhost:3000/checks\ndocker compose up -d");
});

test("comments and blank lines are skipped", () => {
  assert.equal(copyableCommands("sh", "# first\n\ncp a b\n  # later\nls\n"), "cp a b\nls");
  assert.equal(copyableCommands("sh", "$ # note\n$ ls"), "ls");
});

test("a shell block without prompts is all commands", () => {
  assert.equal(copyableCommands("sh", "cp a b\nbun start"), "cp a b\nbun start");
  assert.equal(copyableCommands("shell", "ls"), "ls");
});

test("output-only blocks get no button", () => {
  assert.equal(copyableCommands("console", "Started\nHealthy"), undefined);
  assert.equal(copyableCommands("sh", "# only a comment\n"), undefined);
  assert.equal(copyableCommands("bash", "$ # nothing\nout"), undefined);
});

test("continuation lines stay with their command, also without a prompt", () => {
  const code = "$ docker run --rm \\\n  -p 3000:3000 \\\n  image\nlistening\n$ ls";
  assert.equal(
    copyableCommands("bash", code),
    "docker run --rm \\\n  -p 3000:3000 \\\n  image\nls",
  );
  assert.equal(
    copyableCommands("sh", "curl -i \\\n  -H x \\\n  url"),
    "curl -i \\\n  -H x \\\n  url",
  );
});

test("a heredoc body stays with its command, including comment-like lines", () => {
  const code = "$ cat > a.env <<'EOF'\n# not a comment here\nA=1\nEOF\n$ cat a.env\nA=1";
  assert.equal(
    copyableCommands("bash", code),
    "cat > a.env <<'EOF'\n# not a comment here\nA=1\nEOF\ncat a.env",
  );
});

test("CRLF line endings are handled", () => {
  assert.equal(copyableCommands("sh", "ls\r\npwd\r\n"), "ls\npwd");
});
