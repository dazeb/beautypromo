import { useState } from "react";
import type { Subscriber } from "../../shared/types";
import { api, download, useApi } from "../api";
import { Button, EmptyState, ErrorNote, PageHeader, Panel, shortDateTime } from "../components/ui";

export function Subscribers() {
  const { data, error, reload } = useApi<Subscriber[]>("/subscribers");
  const [actionError, setActionError] = useState<string>();

  async function remove(s: Subscriber) {
    if (!confirm(`Remove ${s.email}?`)) return;
    await api(`/subscribers/${s.id}`, { method: "DELETE" }).catch((e) => setActionError(e.message));
    reload();
  }

  return (
    <>
      <PageHeader
        eyebrow="Audience"
        title="Subscribers"
        actions={
          <Button
            disabled={!data?.length}
            onClick={() => download("/subscribers.csv", `lumiere-subscribers-${new Date().toISOString().slice(0, 10)}.csv`).catch((e) => setActionError(e.message))}
          >
            Export CSV
          </Button>
        }
      />
      <p className="adm-lede">
        Sign-ups from “The Sunday Edit” form. Addresses are stored here only; export the CSV into your email platform to send the newsletter.
      </p>
      <ErrorNote message={error ?? actionError} />
      <Panel>
        {data && data.length === 0 ? (
          <EmptyState title="No subscribers yet">They'll appear here as soon as someone joins from the home page.</EmptyState>
        ) : (
          <table className="adm-table adm-table--stack" role="table" aria-label="Subscribers">
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader">Email</th>
                <th role="columnheader">Joined</th>
                <th role="columnheader">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {(data ?? []).map((s) => (
                <tr key={s.id} role="row">
                  <td role="cell" className="adm-cell-main">
                    {s.email}
                  </td>
                  <td role="cell" className="adm-small adm-muted">
                    {shortDateTime.format(new Date(s.createdAt))}
                  </td>
                  <td role="cell" className="adm-right adm-cell-end">
                    <Button size="sm" variant="ghost" onClick={() => remove(s)}>
                      Remove<span className="visually-hidden"> {s.email}</span>
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
