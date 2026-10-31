import { createRoot } from "react-dom/client";
import type { PublicData } from "../shared/types";
import "../styles/site.css";
import { App } from "./App";

declare global {
  interface Window {
    __LUMIERE__?: PublicData;
  }
}

// In production the server embeds the data in the page; in dev it comes from the API.
const data = window.__LUMIERE__ ?? ((await fetch("/api/public").then((r) => r.json())) as PublicData);

createRoot(document.getElementById("root")!).render(<App data={data} />);
