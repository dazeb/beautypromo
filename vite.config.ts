import { getRequestListener } from "@hono/node-server";
import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

function buildVersion() {
  try {
    const commitCount = execFileSync("git", ["rev-list", "--count", "HEAD"], {
      cwd: import.meta.dirname,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return `${version.split(".").slice(0, 2).join(".")}.${commitCount}`;
  } catch {
    return version;
  }
}

const appVersion = buildVersion();

/** In dev, serve the Hono API and click tracker from the Vite server, and route /admin/* to the admin SPA. */
function api(): Plugin {
  return {
    name: "lumiere-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        if (path === "/amp" || path === "/amp/" || path === "/blog" || path.startsWith("/blog/") || path.startsWith("/api/") || path.startsWith("/go/")) {
          await server.ssrLoadModule("/server/env.ts");
          const { applyContentUpdates } = await server.ssrLoadModule("/server/content-updates.ts");
          applyContentUpdates();
        }
        if (path === "/blog" || path.startsWith("/blog/")) {
          const { publicData } = await server.ssrLoadModule("/server/app.ts");
          const { createBlog } = await server.ssrLoadModule("/server/blog.ts");
          return getRequestListener(createBlog(appVersion, publicData).fetch)(req, res);
        }
        if (path === "/amp" || path === "/amp/") {
          if (path === "/amp") {
            res.writeHead(301, { Location: "/amp/" }).end();
            return;
          }
          const { publicAmpData } = await server.ssrLoadModule("/server/app.ts");
          const { renderAmp } = await server.ssrLoadModule("/server/amp.ts");
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(renderAmp(publicAmpData(), appVersion));
          return;
        }
        if (path.startsWith("/api/") || path.startsWith("/go/")) {
          const { app } = await server.ssrLoadModule("/server/app.ts");
          return getRequestListener(app.fetch)(req, res);
        }
        if (path === "/admin") {
          res.writeHead(302, { Location: "/admin/" }).end();
          return;
        }
        if (path.startsWith("/admin/") && !path.includes(".")) req.url = "/admin/index.html";
        next();
      });
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [react(), api(), {
    name: "build-version",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ version: appVersion }) });
    },
  }],
  build: {
    rollupOptions: {
      input: { site: "index.html", admin: "admin/index.html" },
    },
  },
});
