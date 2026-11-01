import { readFileSync } from "node:fs";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { html } from "hono/html";
import { adminMetadata } from "../src/shared/metadata.ts";
import { app, publicData } from "./app.ts";

/** Production app: API + click tracker + the built site and admin from dist/. */
export function createSite(dist = "dist") {
  const siteHtml = readFileSync(`${dist}/index.html`, "utf8");
  const adminHtml = readFileSync(`${dist}/admin/index.html`, "utf8");

  // Embed the live offers in the page so it paints complete, without a loading flash.
  const renderSite = () =>
    siteHtml.replace("<!--lumiere-data-->", `<script>window.__LUMIERE__=${JSON.stringify(publicData()).replace(/</g, "\\u003c")}</script>`);

  const site = new Hono();
  site.route("/", app);
  site.get("/", (c) => c.html(renderSite()));
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
