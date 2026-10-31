import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import path from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

/** File inside `root` for a URL path, or undefined when it escapes root. */
export function fileForUrl(root: string, urlPath: string): string | undefined {
  let clean: string;
  try {
    clean = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  } catch (error) {
    if (error instanceof URIError) return undefined;
    throw error;
  }
  const relative = clean.endsWith("/") ? `${clean}index.html` : clean;
  const file = path.join(root, relative);
  return file.startsWith(root + path.sep) || file === root ? file : undefined;
}

/** Serves dist on 127.0.0.1 like a plain static host: directories answer index.html, else 404.html. */
export function startStaticServer(root: string): Promise<{ server: Server; origin: string }> {
  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const file = fileForUrl(root, req.url ?? "/");
    try {
      if (!file) throw new Error("outside root");
      const body = await readFile(file);
      res.writeHead(200, {
        "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
      });
      res.end(body);
    } catch {
      const body = await readFile(path.join(root, "404.html")).catch(() =>
        Buffer.from("not found"),
      );
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      res.end(body);
    }
  };
  const server = createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      console.error("static server failed", error);
      if (res.headersSent) {
        res.end();
        return;
      }
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end("internal error");
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") return reject(new Error("no port"));
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}
