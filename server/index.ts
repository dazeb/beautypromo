import "./env.ts";
import { serve } from "@hono/node-server";
import { createSite } from "./site.ts";

const port = Number(process.env.PORT ?? 8790);
const hostname = process.env.HOST ?? "127.0.0.1";
serve({ fetch: createSite().fetch, port, hostname }, () => console.log(`Lumière on http://${hostname}:${port} (admin at /admin)`));
