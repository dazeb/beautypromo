import { useState } from "react";
import { timeLeft } from "../../shared/format";
import type { Dashboard as DashboardData } from "../../shared/types";
import { api, useApi } from "../api";
import { ClicksChart } from "../components/ClicksChart";
import { Button, EmptyState, ErrorNote, PageHeader, Panel, PanelHeader, Stat, StatusBadge, buttonClass, relativeTime } from "../components/ui";
import { ProgrammeLink, type RetailerRow } from "../programmes";
import { Link } from "../router";

const n = (v: number) => v.toLocaleString("en-GB");

export function Dashboard() {
  const { data, error, reload } = useApi<DashboardData>("/dashboard");
  const programmes = useApi<RetailerRow[]>("/retailers").data ?? [];
  // Unapplied programmes, biggest payoff first.
  const nextUp = programmes
    .filter((r) => r.status === "todo" && r.signupUrl && r.liveDeals > 0)
    .sort((a, b) => b.liveDeals - a.liveDeals)
    .slice(0, 4);
  const [busy, setBusy] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string>();

  async function act(id: number, fn: () => Promise<unknown>) {
    setBusy(id);
    setActionError(undefined);
    try {
      await fn();
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        actions={
          <Link to="/admin/offers/new" className={buttonClass("primary")}>
            New offer
          </Link>
        }
      />
      <ErrorNote message={error ?? actionError} />
      {!data ? null : (
        <>
          <Panel className="adm-stats">
            <Stat label="Live offers" value={n(data.live)} />
            <Stat label="Drafts" value={n(data.drafts)} />
            <Stat label="Clicks today" value={n(data.clicksToday)} />
            <Stat label="Clicks 7d" value={n(data.clicks7d)} />
            <Stat label="Clicks 30d" value={n(data.clicks30d)} />
            <Stat label="Subscribers" value={n(data.subscribers)} />
          </Panel>

          <Panel>
            <div className="adm-monetise">
              <div>
                <h2 className="adm-eyebrow">Monetisation</h2>
                <p>
                  <strong>{n(data.monetised)}</strong> of <strong>{n(data.live)}</strong> live offers use an affiliate link
                  {data.live > data.monetised ? <span className="adm-warn"> · {n(data.live - data.monetised)} still on a plain retailer link</span> : null}
                </p>
              </div>
              <Link to="/admin/retailers" className={buttonClass("secondary", "sm")}>
                All programmes
              </Link>
            </div>
            {nextUp.length > 0 ? (
              <>
                <h3 className="adm-subhead">Apply next</h3>
                <ul className="adm-list">
                  {nextUp.map((r) => (
                    <li key={r.id}>
                      <span className="adm-list__main">
                        <span className="adm-row-title">{r.name}</span>
                        <span className="adm-small adm-muted">
                          {r.liveDeals} live {r.liveDeals === 1 ? "offer" : "offers"}
                          {r.network ? ` · ${r.network}` : ""}
                          {r.commission ? ` · ${r.commission}` : ""}
                        </span>
                      </span>
                      <ProgrammeLink retailer={r} />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Panel>

          <Panel>
            <PanelHeader title="Clicks, last 30 days" action={<span className="adm-eyebrow">UK days</span>} />
            {data.clicks30d === 0 ? (
              <EmptyState title="No clicks recorded yet">
                Every “Shop” link goes through <code>/go/&lt;slug&gt;</code>, which logs a click before sending the shopper on. Run{" "}
                <code>pnpm db:seed --demo-clicks</code> locally to see the chart with sample data.
              </EmptyState>
            ) : (
              <ClicksChart daily={data.daily} />
            )}
          </Panel>

          <div className="adm-two">
            <Panel>
              <PanelHeader title="Top offers by clicks (7d)" />
              {data.top.length === 0 ? (
                <EmptyState title="Nothing clicked this week" />
              ) : (
                <ol className="adm-list">
                  {data.top.map((t, i) => (
                    <li key={t.id}>
                      <span className="adm-num adm-muted adm-w-rank" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span className="adm-list__main">
                        <Link to={`/admin/offers/${t.id}`} className="adm-row-title">
                          {t.title}
                        </Link>
                        <span className="adm-muted adm-small">{t.retailer}</span>
                      </span>
                      <span className="adm-num">
                        {n(t.clicks)}
                        <span className="visually-hidden"> clicks</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel>
              <PanelHeader title="Ending in the next 72 hours" />
              {data.expiring.length === 0 ? (
                <EmptyState title="Nothing ends in the next 3 days">Offers with an end date appear here so you can extend or retire them.</EmptyState>
              ) : (
                <ul className="adm-list">
                  {data.expiring.map((d) => (
                    <li key={d.id}>
                      <span className="adm-list__main">
                        <Link to={`/admin/offers/${d.id}`} className="adm-row-title">
                          {d.title}
                        </Link>
                        <span className="adm-small adm-warn">
                          {d.retailer} · {timeLeft(d.endsAt, new Date())}
                        </span>
                      </span>
                      <Button size="sm" disabled={busy === d.id} onClick={() => act(d.id, () => api(`/deals/${d.id}/extend`, { body: { days: 7 } }))}>
                        Extend +7d<span className="visually-hidden">: {d.title}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === d.id}
                        onClick={() => act(d.id, () => api("/deals/bulk", { body: { ids: [d.id], action: "archive" } }))}
                      >
                        Archive<span className="visually-hidden"> {d.title}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel>
            <PanelHeader
              title="Recently added"
              action={
                <Link to="/admin/import" className="adm-link adm-small">
                  Bulk import
                </Link>
              }
            />
            {data.recent.length === 0 ? (
              <EmptyState title="No offers yet">
                Add one with <Link to="/admin/offers/new">New offer</Link>, or run <code>pnpm db:seed</code> to load the launch edit.
              </EmptyState>
            ) : (
              <ul className="adm-list">
                {data.recent.map((d) => (
                  <li key={d.id}>
                    <span className="adm-list__main">
                      <Link to={`/admin/offers/${d.id}`} className="adm-row-title">
                        {d.title}
                      </Link>
                      <span className="adm-muted adm-small">
                        {d.retailer} · added {relativeTime(d.createdAt)}
                      </span>
                    </span>
                    <StatusBadge status={d.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
