import { useEffect, useState } from "react";
import { endsLabel } from "../../shared/format";
import { CATEGORIES, type Deal } from "../../shared/types";
import { api, download, useApi } from "../api";
import { Button, EmptyState, ErrorNote, PageHeader, Panel, StatusBadge, buttonClass, cx } from "../components/ui";
import { Link, navigate, useLocation } from "../router";

type Row = Deal & { clicks30: number };
type BulkAction = "publish" | "draft" | "archive" | "delete" | "feature" | "unfeature";

const STATUS_FILTERS = [
  { id: "", label: "All" },
  { id: "live", label: "Live" },
  { id: "draft", label: "Drafts" },
  { id: "expired", label: "Expired" },
  { id: "archived", label: "Archived" },
];

export function Offers() {
  const { search } = useLocation();
  const status = search.get("status") ?? "";
  const category = search.get("category") ?? "";
  const q = search.get("q") ?? "";
  const [query, setQuery] = useState(q);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [actionError, setActionError] = useState<string>();
  const { data, error, reload } = useApi<Row[]>(`/deals?${new URLSearchParams({ q, status, category })}`);

  // Debounce the search box into the URL.
  useEffect(() => {
    if (query === q) return;
    const t = setTimeout(() => setParam("q", query, true), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => setSelected(new Set()), [q, status, category]);

  function setParam(key: string, value: string, replace = false) {
    const params = new URLSearchParams(location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    navigate(`/admin/offers${qs ? `?${qs}` : ""}`, { replace });
  }

  async function bulk(action: BulkAction, ids = [...selected]) {
    if (action === "delete" && !confirm(`Delete ${ids.length} offer${ids.length > 1 ? "s" : ""} and their click history? This can't be undone.`)) return;
    setActionError(undefined);
    try {
      await api("/deals/bulk", { body: { ids, action } });
      setSelected(new Set());
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  async function duplicate(id: number) {
    try {
      const { id: newId } = await api<{ id: number }>(`/deals/${id}/duplicate`, { body: {} });
      navigate(`/admin/offers/${newId}`);
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  const rows = data ?? [];
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const now = new Date();

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Offers"
        actions={
          <>
            <Button onClick={() => download("/export", `lumiere-offers-${new Date().toISOString().slice(0, 10)}.json`).catch((e) => setActionError(e.message))}>
              Export JSON
            </Button>
            <Link to="/admin/offers/new" className={buttonClass("primary")}>
              New offer
            </Link>
          </>
        }
      />

      <div className="adm-toolbar">
        <label className="visually-hidden" htmlFor="offer-search">
          Search offers
        </label>
        <input
          id="offer-search"
          type="search"
          className="adm-input adm-toolbar__search"
          placeholder="Search title, retailer, slug or code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="adm-segmented" role="group" aria-label="Status">
          {STATUS_FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={status === f.id} onClick={() => setParam("status", f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <select className="adm-input" aria-label="Category" value={category} onChange={(e) => setParam("category", e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {selected.size > 0 ? (
        <div className="adm-bulkbar" role="region" aria-label="Bulk actions">
          <strong role="status">{selected.size} selected</strong>
          <Button size="sm" onClick={() => bulk("publish")}>
            Publish
          </Button>
          <Button size="sm" onClick={() => bulk("draft")}>
            Move to drafts
          </Button>
          <Button size="sm" onClick={() => bulk("archive")}>
            Archive
          </Button>
          <Button size="sm" onClick={() => bulk("feature")}>
            Feature
          </Button>
          <Button size="sm" variant="danger" onClick={() => bulk("delete")}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      ) : null}

      <ErrorNote message={error ?? actionError} />

      <Panel>
        {data && rows.length === 0 ? (
          <EmptyState title="No offers match">Try a different search or filter.</EmptyState>
        ) : (
          <table className="adm-table adm-table--stack adm-table--offers" role="table" aria-label="Offers">
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader" className="adm-w-check">
                  <input
                    type="checkbox"
                    aria-label="Select all offers"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                  />
                </th>
                <th role="columnheader" className="adm-w-star">
                  <span className="visually-hidden">Featured</span>
                </th>
                <th role="columnheader">Offer</th>
                <th role="columnheader">Headline</th>
                <th role="columnheader">Status</th>
                <th role="columnheader">Ends</th>
                <th role="columnheader" className="adm-right">
                  Clicks 30d
                </th>
                <th role="columnheader" className="adm-right">
                  Link
                </th>
                <th role="columnheader">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {rows.map((d) => (
                <tr key={d.id} role="row" className={cx(selected.has(d.id) && "is-selected")}>
                  <td role="cell" className="adm-cell-check">
                    <input type="checkbox" aria-label={`Select ${d.title}`} checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                  </td>
                  <td role="cell" className="adm-cell-star">
                    <button
                      type="button"
                      className={cx("adm-star", d.featured && "is-on")}
                      aria-pressed={d.featured}
                      aria-label={`Featured: ${d.title}`}
                      title={d.featured ? "Featured: shown as offer of the week" : "Feature this offer"}
                      onClick={() => bulk(d.featured ? "unfeature" : "feature", [d.id])}
                    >
                      <span aria-hidden="true">★</span>
                    </button>
                  </td>
                  <td role="cell" className="adm-cell-main">
                    <Link to={`/admin/offers/${d.id}`} className="adm-row-title">
                      {d.title}
                    </Link>
                    <div className="adm-muted adm-small">
                      {d.retailer} · {d.categories.map((c) => CATEGORIES.find((x) => x.id === c)?.label).join(", ")}
                    </div>
                  </td>
                  <td role="cell" className="adm-serif adm-cell-headline">
                    {d.categories.includes("advent") ? `£${d.price} / £${d.worth}` : d.headline}
                  </td>
                  <td role="cell">
                    <StatusBadge status={d.status} endsAt={d.endsAt} />
                  </td>
                  <td role="cell" className="adm-small adm-nowrap">
                    {endsLabel(d, now)}
                  </td>
                  <td role="cell" className="adm-num adm-right" data-label="Clicks">
                    {d.clicks30}
                  </td>
                  <td role="cell" className="adm-right">
                    {d.affiliateUrl ? (
                      <span className="adm-badge adm-badge--good" title={d.affiliateUrl}>
                        Affiliate
                      </span>
                    ) : (
                      <span className="adm-badge adm-badge--neutral" title="Clicks go to the plain retailer link">
                        Plain link
                      </span>
                    )}
                  </td>
                  <td role="cell" className="adm-right adm-nowrap adm-cell-end">
                    <Button size="sm" variant="ghost" onClick={() => duplicate(d.id)}>
                      Duplicate<span className="visually-hidden"> {d.title}</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
