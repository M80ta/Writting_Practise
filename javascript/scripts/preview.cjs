// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"use strict";
// Optional static-file preview only. All worksheet calculations run in the browser.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const basePath = (process.env.BASE_PATH || "").replace(/\/$/, "");
if (!Number.isInteger(port) || port < 1 || port > 65535 || (basePath && !/^\/[a-zA-Z0-9/_-]+$/.test(basePath))) {
  throw new Error("PORT must be 1–65535; BASE_PATH must be a URL path such as /EnglishPractise/javascript.");
}
const files = new Set(["/index.html", "/app.css", "/app.js", "/worksheet.js", "/legal.html", "/.nojekyll", "/LICENSE.md", "/LEGAL.md", "/NOTICE", "/THIRD_PARTY_NOTICES.md",
  ...fs.readdirSync(path.join(root, "fonts")).map((name) => `/fonts/${name}`)]);
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".ttf": "font/ttf", ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8", "": "text/plain; charset=utf-8" };
const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
  catch { response.writeHead(400).end("Bad request"); return; }
  if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405, { Allow: "GET, HEAD" }).end(); return; }
  if (basePath && !pathname.startsWith(`${basePath}/`)) { response.writeHead(404).end("Not found"); return; }
  pathname = pathname.slice(basePath.length);
  if (pathname === "/") pathname = "/index.html";
  if (!files.has(pathname)) { response.writeHead(404).end("Not found"); return; }
  const file = path.join(root, pathname);
  response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  if (request.method === "HEAD") response.end();
  else fs.createReadStream(file).on("error", () => response.destroy()).pipe(response);
});
server.listen(port, "127.0.0.1", () => console.log(`Letter & Line preview: http://127.0.0.1:${port}${basePath}/`));
server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
process.on("SIGINT", () => { server.close(); server.closeIdleConnections(); });
