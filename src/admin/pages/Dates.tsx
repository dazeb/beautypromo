import { useState } from "react";
import type { KeyDate } from "../../shared/types";
import { ApiError, api, useApi } from "../api";
import { Button, EmptyState, ErrorNote, Field, PageHeader, Panel, PanelHeader } from "../components/ui";

type Draft = Omit<KeyDate, "id">;
const blank: Draft = { date: "", label: "", note: "" };

export function Dates() {
  const { data, error, reload } = useApi<KeyDate[]>("/dates");
  const [editing, setEditing] = useState<{ id: number | null; draft: Draft } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string>();
  const today = new Date().toISOString().slice(0, 10);

  async function save() {
    if (!editing) return;
    setErrors({});
    try {
      await api(editing.id ? `/dates/${editing.id}` : "/dates", { method: editing.id ? "PUT" : "POST", body: editing.draft });
      setEditing(null);
      reload();
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.errors);
      else setActionError((e as Error).message);
    }
  }

  async function remove(d: KeyDate) {
    if (!confirm(`Delete “${d.label}”?`)) return;
    await api(`/dates/${d.id}`, { method: "DELETE" }).catch((e) => setActionError(e.message));
    reload();
  }

  const set = (k: keyof Draft, v: string) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e));

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Key dates"
        actions={
          <Button variant="primary" onClick={() => setEditing({ id: null, draft: blank })}>
            Add date
          </Button>
        }
      />
      <p className="adm-lede">Shown in “The dates that matter” on the home page. Past dates hide themselves.</p>
      <ErrorNote message={error ?? actionError} />

      {editing ? (
        <Panel>
          <PanelHeader title={editing.id ? "Edit date" : "Add date"} />
          <form
            className="adm-fields adm-pad"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Field label="Date" error={errors.date}>
              <input className="adm-input" type="date" value={editing.draft.date} onChange={(e) => set("date", e.target.value)} required />
            </Field>
            <Field label="Label" error={errors.label}>
              <input className="adm-input" value={editing.draft.label} onChange={(e) => set("label", e.target.value)} placeholder="Black Friday" required />
            </Field>
            <Field label="Note" wide>
              <input className="adm-input" value={editing.draft.note} onChange={(e) => set("note", e.target.value)} />
            </Field>
            <div className="adm-inline adm-field--wide">
              <Button type="submit" variant="primary">
                Save
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel>
        {data && data.length === 0 ? (
          <EmptyState title="No dates yet" />
        ) : (
          <table className="adm-table adm-table--stack" role="table" aria-label="Key dates">
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader">Date</th>
                <th role="columnheader">Label</th>
                <th role="columnheader">Note</th>
                <th role="columnheader">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {(data ?? []).map((d) => (
                <tr key={d.id} role="row" className={d.date < today ? "is-past" : undefined}>
                  <td role="cell" className="adm-num adm-nowrap">
                    {d.date}
                  </td>
                  <td role="cell" className="adm-row-title adm-cell-main">
                    {d.label}
                  </td>
                  <td role="cell" className="adm-small adm-muted adm-cell-wide">
                    {d.note}
                  </td>
                  <td role="cell" className="adm-right adm-nowrap adm-cell-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditing({ id: d.id, draft: { date: d.date, label: d.label, note: d.note } })}>
                      Edit<span className="visually-hidden"> {d.label}</span>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(d)}>
                      Delete<span className="visually-hidden"> {d.label}</span>
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
