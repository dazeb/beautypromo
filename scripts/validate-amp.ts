import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface ValidationResult {
  status: string;
  errors: { severity: string; line: number; col: number; message: string }[];
}
const { newInstance } = createRequire(import.meta.url)("amphtml-validator") as {
  newInstance(source: string): { init(): Promise<void>; validateString(document: string): ValidationResult };
};

// curl honours the session's HTTPS proxy and CA configuration. A cached official
// validator can be supplied when the AMP CDN is unavailable.
let validatorSource: string;
try {
  validatorSource = process.env.AMP_VALIDATOR_JS
    ? readFileSync(process.env.AMP_VALIDATOR_JS, "utf8")
    : execFileSync("curl", ["--fail", "--silent", "--show-error", "--location", "--max-time", "20", "https://cdn.ampproject.org/v0/validator_wasm.js"], {
      encoding: "utf8", maxBuffer: 20 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
    });
} catch {
  console.error("Official AMP validation could not start: the validator rules could not be loaded. Allow cdn.ampproject.org or set AMP_VALIDATOR_JS to a cached official validator_wasm.js file.");
  process.exit(1);
}

const directory = mkdtempSync(join(tmpdir(), "beautypromos-amp-validation-"));
process.env.DATABASE_PATH = join(directory, "validation.db");
const { db, upsertDeal } = await import("../server/db.ts");
try {
  const { createSite } = await import("../server/site.ts");
  const { renderAmp } = await import("../server/amp.ts");
  const site = createSite();
  upsertDeal({
    slug: "amp-validation-fixture", retailer: "Validation & example", title: "Skincare & gifting", headline: "A beauty set", sub: "Sample contents",
    details: "A test of complete offer markup, including <escaped> text.", categories: ["gift"], code: "SAMPLE", terms: "Sample terms only",
    url: "https://example.com/offer", affiliateUrl: null, price: 20, worth: 30, note: "A sample note", endsAt: "2099-12-31T12:00:00Z",
    featured: false, status: "published", verifiedAt: "2026-11-01T12:00:00Z",
  });
  db().prepare("INSERT INTO key_dates (date, label, note) VALUES (?, ?, ?)").run("2099-12-01", "A future event", "A sample diary entry");
  const validator = newInstance(validatorSource);
  await validator.init();
  const documents = [
    { name: "AMP offers with full content", document: await (await site.request("/amp/")).text() },
    { name: "AMP empty edit", document: renderAmp({ deals: [], dates: [], verifiedOn: null }, "0.1.0") },
  ];
  let failed = false;
  for (const entry of documents) {
    const result = validator.validateString(entry.document);
    console.log(`${entry.name}: ${result.status}`);
    for (const error of result.errors) console.log(`  ${error.severity} ${error.line}:${error.col} ${error.message}`);
    if (result.status !== "PASS") failed = true;
  }
  if (failed) process.exitCode = 1;
} finally {
  db().close();
  rmSync(directory, { recursive: true, force: true });
}
