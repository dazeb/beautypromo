import { useState } from "react";
import { api } from "../api";
import { Badge, Button, EmptyState, ErrorNote, PageHeader, Panel, PanelHeader } from "../components/ui";

interface Result {
  index: number;
  slug: string | null;
  action: "create" | "update" | "error";
  error?: string;
}

const EXAMPLE = `[
  {
    "retailer": "Space NK",
    "title": "The Beauty Insider Gift",
    "headline": "Free",
    "sub": "a 29-piece gift worth over £350",
    "details": "Spend £220 and take home minis from …",
    "categories": ["gift", "makeup"],
    "terms": "While stocks last.",
    "url": "https://www.spacenk.com/uk/beauty-gift-with-purchase.html",
    "affiliateUrl": null,
    "worth": 350,
    "endsAt": "2026-11-30T23:59:00Z",
    "status": "published"
  }
]`;

export function Import() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [checkedText, setCheckedText] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function run(dryRun: boolean) {
    setError(undefined);
    setDone(undefined);
    let items: unknown;
    try {
      items = JSON.parse(text);
    } catch (e) {
      setError(`That isn't valid JSON: ${(e as Error).message}`);
      return;
    }
    if (!Array.isArray(items)) items = [items];
    setBusy(true);
    try {
      const res = await api<{ results: Result[] }>("/import", { body: { items, dryRun } });
      setResults(res.results);
      if (dryRun) setCheckedText(text);
      else {
        const ok = res.results.filter((r) => r.action !== "error");
        setDone(`Imported ${ok.length} offer${ok.length === 1 ? "" : "s"}.`);
        setCheckedText(null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const counts = results?.reduce((acc, r) => ({ ...acc, [r.action]: (acc[r.action] ?? 0) + 1 }), {} as Record<string, number>);
  const canImport = checkedText === text && results?.some((r) => r.action !== "error");

  return (
    <>
      <PageHeader eyebrow="Catalogue" title="Bulk import" />
      <div className="adm-two">
        <Panel>
          <PanelHeader title="Paste offers as JSON" />
          <div className="adm-pad">
            <p className="adm-small adm-muted">
              An array of offers in the same shape as <code>data/seed-offers.json</code> and the Offers page's <em>Export JSON</em>. Offers are matched by{" "}
              <code>slug</code> (generated from retailer and title if missing): existing ones are updated, new ones created. Check first, then import.
            </p>
            <textarea
              className="adm-input adm-mono adm-import"
              rows={18}
              spellCheck={false}
              placeholder={EXAMPLE}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Offers JSON"
            />
            <ErrorNote message={error} />
            {done ? <p className="adm-ok">{done}</p> : null}
            <div className="adm-inline">
              <Button onClick={() => run(true)} disabled={busy || !text.trim()}>
                Check
              </Button>
              <Button variant="primary" onClick={() => run(false)} disabled={busy || !canImport}>
                Import
              </Button>
              {!canImport && results ? <span className="adm-small adm-muted">Run Check again after editing.</span> : null}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Result"
            action={
              counts ? (
                <span className="adm-inline">
                  {counts.create ? <Badge tone="good">{counts.create} new</Badge> : null}
                  {counts.update ? <Badge>{counts.update} update</Badge> : null}
                  {counts.error ? <Badge tone="bad">{counts.error} invalid</Badge> : null}
                </span>
              ) : null
            }
          />
          {!results ? (
            <EmptyState title="Nothing checked yet">Paste offers and press Check to see what would change.</EmptyState>
          ) : (
            <ol className="adm-list adm-list--numbered">
              {results.map((r) => (
                <li key={r.index}>
                  <span className="adm-num adm-muted adm-w-rank" aria-hidden="true">
                    {r.index + 1}
                  </span>
                  <span className="adm-list__main">
                    <code>{r.slug ?? "—"}</code>
                    {r.error ? <span className="adm-small adm-warn">{r.error}</span> : null}
                  </span>
                  <Badge tone={r.action === "error" ? "bad" : r.action === "create" ? "good" : "neutral"}>{r.action}</Badge>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </>
  );
}
