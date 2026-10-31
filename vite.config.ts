import { getRequestListener } from "@hono/node-server";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/** In dev, serve the Hono API and click tracker from the Vite server, and route /admin/* to the admin SPA. */
function api(): Plugin {
  return {
    name: "lumiere-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        if (path.startsWith("/api/") || path.startsWith("/go/")) {
          await server.ssrLoadModule("/server/env.ts");
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
  plugins: [react(), api()],
  build: {
    rollupOptions: {
      input: { site: "index.html", admin: "admin/index.html" },
    },
  },
});
