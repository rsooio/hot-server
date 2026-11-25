import worker from "./app/index.ts";
import { mkdir, readdir, unlink } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { Hono } from "hono";

const WORKSPACE = `${import.meta.dir}${sep}app${sep}`;

const kernel = new Hono()

kernel.get("/kernel/uptime", (c) => {
  return c.text(process.uptime().toString());
});

kernel.get("/kernel/code", async (c) => {
  return c.json(await readdir("app", { recursive: true }));
});

kernel.get("/kernel/editor", async (c) => {
  return c.html(await Bun.file(`${import.meta.dir}/editor.html`).text());
});

kernel.use("/kernel/code/:file{.+}", async (c, next) => {
  const path = resolve(WORKSPACE, c.req.param("file"));
  if (!path.startsWith(WORKSPACE)) return c.text("Illegal path", 400);
  if (!path.endsWith(".ts")) return c.text("Only .ts files are allowed", 400);
  await next();
});

kernel.get("/kernel/code/:file{.+}", async (c) => {
  const path = resolve(WORKSPACE, c.req.param("file"));
  return c.text(await Bun.file(path).text());
});

kernel.put("/kernel/code/:file{.+}", async (c) => {
  const path = resolve(WORKSPACE, c.req.param("file"));
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, await c.req.text());
  return c.body(null, 204);
});

kernel.delete("/kernel/code/:file{.+}", async (c) => {
  const path = resolve(WORKSPACE, c.req.param("file"));
  await unlink(path);
  return c.body(null, 204);
});

async function fetch(req: Request, server: ReturnType<typeof Bun.serve>) {
  const { pathname } = new URL(req.url);
  try {
    if (pathname.startsWith("/api/")) return await worker.fetch(req, server);
    if (pathname.startsWith("/kernel/")) return await kernel.fetch(req, server);
    return new Response(`Not Found`, { status: 404 });
  } catch (err) {
    console.error(`[kernel] pid=${process.pid} fetch error:`, err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// 端口由内核决定;worker 只提供 fetch,由内核主动调用
const { error, websocket } = worker;
Bun.serve({ fetch, error, websocket });

console.log(`[kernel] pid=${process.pid} uptime=${process.uptime()}`);
