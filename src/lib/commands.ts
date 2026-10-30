// Which fenced code blocks of the docs are command blocks, and what the copy button copies.

const SHELL_LANGUAGES = new Set(["bash", "sh", "shell", "console"]);
const PROMPT = "$ ";
const HEREDOC = /<<-?\s*(['"]?)([A-Za-z_][\w-]*)\1/;

export function isShellLanguage(language: string | undefined): boolean {
  return language !== undefined && SHELL_LANGUAGES.has(language);
}

function endsWithContinuation(line: string): boolean {
  return line.trimEnd().endsWith("\\");
}

/**
 * The text to copy for a fenced block, or `undefined` when the block gets no copy button.
 *
 * - Only `bash`, `sh`, `shell` and `console` blocks qualify.
 * - With at least one `$ ` line, the lines with the prompt are the commands (prompt removed).
 *   Lines after a command without a prompt are output and skipped, except `\` continuation
 *   lines and heredoc bodies, which stay with their command.
 * - Without a prompt, a `console` block is output only; a `bash`, `sh` or `shell` block is all
 *   commands.
 * - Comment lines (`#`) and blank lines are never copied.
 */
export function copyableCommands(language: string | undefined, code: string): string | undefined {
  if (!isShellLanguage(language)) return undefined;
  const lines = code.replace(/\r\n?/g, "\n").split("\n");
  const prompted = lines.some((line) => line.startsWith(PROMPT));
  if (!prompted && language === "console") return undefined;
  const out: string[] = [];
  let open: Open = {};
  for (const line of lines) {
    if (open.heredoc !== undefined || open.continuing) {
      out.push(line);
      open = follow(open, line);
      continue;
    }
    const text = prompted ? commandOf(line) : line;
    if (text === undefined || text.trim() === "" || text.trimStart().startsWith("#")) continue;
    out.push(text);
    open = { continuing: endsWithContinuation(text), heredoc: HEREDOC.exec(text)?.[2] };
  }
  return out.length > 0 ? out.join("\n") : undefined;
}

/** What is still open after a command line: a `\` continuation or a heredoc waiting for its end. */
type Open = { continuing?: boolean; heredoc?: string | undefined };

function follow(open: Open, line: string): Open {
  if (open.heredoc !== undefined) {
    return line.trim() === open.heredoc ? {} : open;
  }
  return { continuing: endsWithContinuation(line) };
}

/** The command of a line in a prompted block, or `undefined` for output. */
function commandOf(line: string): string | undefined {
  return line.startsWith(PROMPT) ? line.slice(PROMPT.length) : undefined;
}
