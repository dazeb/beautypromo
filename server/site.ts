import { readFileSync } from "node:fs";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
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
  site.get("/admin", (c) => c.redirect("/admin/"));
  site.get("/admin/*", serveStatic({ root: dist }), (c) => {
    c.header("X-Robots-Tag", "noindex");
    return c.html(adminHtml);
  });
  site.use("/*", serveStatic({ root: dist }));
  site.notFound((c) => c.redirect("/"));
  return site;
}
