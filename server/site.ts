import { readFileSync } from "node:fs";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { html } from "hono/html";
import { adminMetadata } from "../src/shared/metadata.ts";
import { app, publicAmpData, publicData } from "./app.ts";
import { renderAmp } from "./amp.ts";
import { applyContentUpdates } from "./content-updates.ts";
import { createBlog } from "./blog.ts";
import { renderLlms } from "./llms.ts";

/** Production app: API + click tracker + the built site and admin from dist/. */
export function createSite(dist = "dist") {
  applyContentUpdates();
  const siteHtml = readFileSync(`${dist}/index.html`, "utf8");
  const adminHtml = readFileSync(`${dist}/admin/index.html`, "utf8");
  const { version } = JSON.parse(readFileSync(`${dist}/version.json`, "utf8")) as { version: string };

  // Embed the live offers in the page so it paints complete, without a loading flash.
  const renderSite = () =>
    siteHtml.replace("<!--lumiere-data-->", `<script>window.__LUMIERE__=${JSON.stringify(publicData()).replace(/</g, "\\u003c")}</script>`);

  const site = new Hono();
  site.route("/", app);
  site.route("/", createBlog(version, publicData));
  site.get("/", (c) => c.html(renderSite()));
  site.get("/llms.txt", (c) => {
    c.header("Cache-Control", "public, max-age=60");
    return c.text(renderLlms(publicData()));
  });
  site.get("/amp", (c) => c.redirect("/amp/", 301));
  site.get("/amp/", (c) => {
    c.header("Cache-Control", "public, max-age=60");
    return c.html(renderAmp(publicAmpData(), version));
  });
  site.get("/admin", (c) => {
    c.header("X-Robots-Tag", "noindex, nofollow");
    return c.redirect("/admin/");
  });
  site.get("/admin/*", (c) => {
    const metadata = adminMetadata(c.req.path);
    const page = adminHtml
      .replace(/<title>[^<]*<\/title>/, String(html`<title>${metadata.title}</title>`))
      .replace(/<meta name="description" content="[^"]*"\s*\/?>/, String(html`<meta name="description" content="${metadata.description}" />`))
      .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, String(html`<link rel="canonical" href="${metadata.canonical}" />`));
    c.header("X-Robots-Tag", "noindex, nofollow");
    c.header("Cache-Control", "no-store");
    return c.html(page);
  });
  site.use("/*", serveStatic({ root: dist }));
  site.notFound((c) => c.redirect("/"));
  return site;
}
