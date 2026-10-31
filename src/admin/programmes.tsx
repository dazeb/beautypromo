import { useEffect, useState } from "react";
import type { Retailer } from "../shared/types";
import { Button, ExternalLink, buttonClass } from "./components/ui";

export type RetailerRow = Retailer & { liveDeals: number; monetised: number };

/** Where to open a publisher account on each network. One account covers every programme on it. */
export const NETWORKS: Record<string, string> = {
  Awin: "https://www.awin.com/gb/",
  Partnerize: "https://partnerize.com/partners/affiliates",
  Skimlinks: "https://www.skimlinks.com/",
  CJ: "https://www.cj.com/publisher",
  Webgains: "https://www.webgains.com/publishers/",
};

/** Account-specific link builders require signing in; use the network's verified portal. */
export const LINK_TOOLS: Record<string, { url: string; instructions: string }> = {
  Awin: {
    url: "https://ui.awin.com/",
    instructions: "Sign in to Awin, then choose Toolbox → Link Builder. Select this retailer, paste the offer's page URL and copy the generated deep link. You must be approved for the programme first.",
  },
  Partnerize: {
    url: "https://console.partnerize.com/",
    instructions: "Sign in to Partnerize, open Tracking → Create a Link and select this retailer's approved campaign. Use the offer's page URL as the destination, then copy your tracking link.",
  },
  Skimlinks: {
    url: "https://hub.skimlinks.com/",
    instructions: "Sign in to the Skimlinks Hub and open its Link Generator. Paste the offer's page URL and copy the monetised link. Your site must be approved and the retailer available to your account.",
  },
  CJ: {
    url: "https://members.cj.com/",
    instructions: "Sign in to CJ, join the retailer's advertiser programme, then use Links → Create Link (or the advertiser's deep-link tool). Paste the exact offer page as the destination and copy the generated tracking URL. Availability depends on advertiser approval and your publisher account.",
  },
  Webgains: {
    url: "https://publisher.webgains.com/",
    instructions: "Sign in to Webgains and apply to the advertiser first. Once approved, open the advertiser's links/deep-link tools, enter the exact offer page as the destination and copy the generated tracking URL. Check that the advertiser permits voucher-code publishers.",
  },
};

export function linkInstructions(retailer: Retailer) {
  return LINK_TOOLS[retailer.network ?? ""]?.instructions ??
    (retailer.signupUrl
      ? "Open the retailer's programme page. Once approved, use the link tool or instructions they provide to get your tracking link for the offer's page."
      : "No public affiliate programme has been found for this retailer.");
}

export function TrackingLink({ retailer }: { retailer: Retailer }) {
  const tool = LINK_TOOLS[retailer.network ?? ""];
  if (!tool) return null;
  return (
    <ExternalLink href={tool.url} className={buttonClass("secondary", "sm")} context={`in ${retailer.network} for ${retailer.name}; sign-in required`}>
      Get tracking link
    </ExternalLink>
  );
}

export function CopyLinkButton({ value, label }: { value: string; label: string }) {
  const [message, setMessage] = useState("");
  useEffect(() => setMessage(""), [value]);
  return (
    <>
      <Button size="sm" disabled={!value} onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setMessage(`${label}: copied`);
        } catch {
          setMessage("Could not copy. Select the link text and copy it manually.");
        }
      }}>{label}</Button>
      <span className="adm-small" role="status">{message}</span>
    </>
  );
}

export const STATUS: Record<Retailer["status"], { label: string; tone: "neutral" | "good" | "warn" | "bad" }> = {
  todo: { label: "To apply", tone: "warn" },
  applied: { label: "Applied", tone: "neutral" },
  approved: { label: "Approved", tone: "good" },
  rejected: { label: "Rejected", tone: "bad" },
};

const onNetwork = (r: Retailer) => (r.network && r.network !== "Direct" ? ` on ${r.network}` : "");

/** "Apply on Awin" before approval, "Open on Awin" after; links to the retailer's programme page. */
export function ProgrammeLink({ retailer, size = "sm", variant }: { retailer: Retailer; size?: "sm" | "md"; variant?: "primary" | "secondary" }) {
  if (!retailer.signupUrl) return null;
  const approved = retailer.status === "approved";
  return (
    <ExternalLink
      href={retailer.signupUrl}
      className={buttonClass(variant ?? (approved ? "secondary" : "primary"), size)}
      context={`for ${retailer.name}`}
    >
      {approved ? "Open" : "Apply"}
      {onNetwork(retailer)}
    </ExternalLink>
  );
}
