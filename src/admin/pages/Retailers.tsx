import { useEffect, useRef, useState } from "react";
import type { Retailer } from "../../shared/types";
import { ApiError, api, useApi } from "../api";
import { Badge, Button, EmptyState, ErrorNote, ExternalLink, Field, PageHeader, Panel, PanelHeader } from "../components/ui";
import { CopyLinkButton, LINK_TOOLS, linkInstructions, NETWORKS, ProgrammeLink, type RetailerRow, STATUS, TrackingLink } from "../programmes";
import { Link } from "../router";

type Draft = Omit<Retailer, "id" | "updatedAt">;

const blank: Draft = { name: "", network: null, signupUrl: null, commission: null, status: "todo", myLink: null, notes: null };
const toDraft = ({ id: _i, updatedAt: _u, liveDeals: _l, monetised: _m, ...draft }: RetailerRow): Draft => draft;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function SavedLink({ retailer, onSaved }: { retailer: RetailerRow; onSaved: () => void }) {
  const [value, setValue] = useState(retailer.myLink ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState("");
  useEffect(() => setValue(retailer.myLink ?? ""), [retailer.myLink]);

  return (
    <form className="adm-prog__link" aria-label={`Tracking link for ${retailer.name}`} noValidate onSubmit={async (e) => {
      e.preventDefault();
      setPending(true);
      setError(undefined);
      setMessage("");
      try {
        await api(`/retailers/${retailer.id}/link`, { method: "PATCH", body: { myLink: value.trim() || null } });
        setMessage(value.trim() ? "Tracking link saved." : "Saved link cleared.");
        onSaved();
      } catch (e) {
        setError(e instanceof ApiError ? e.errors.myLink ?? e.message : (e as Error).message);
      } finally {
        setPending(false);
      }
    }}>
      <Field label={`Your tracking link for ${retailer.name}`} error={error} hint="Save your generated link here for reference. Paste a deep link for each offer in its editor; saving here does not change any Shop buttons.">
        <input className="adm-input" type="url" inputMode="url" value={value} placeholder="Paste your tracking link" disabled={pending} onChange={(e) => {
          setValue(e.target.value);
          setError(undefined);
          setMessage("");
        }} />
      </Field>
      <div className="adm-inline">
        <Button type="submit" size="sm" disabled={pending || value.trim() === (retailer.myLink ?? "")}>{pending ? "Saving…" : "Save link"}</Button>
        {retailer.myLink ? <CopyLinkButton value={retailer.myLink} label="Copy saved link" /> : null}
      </div>
      <span className="adm-small" role="status">{message}</span>
    </form>
  );
}

export function Retailers() {
  const { data, error, reload, setData } = useApi<RetailerRow[]>("/retailers");
  const [editing, setEditing] = useState<{ id: number | null; draft: Draft } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string>();
  const [announce, setAnnounce] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Bring the form into view and focus its first field when it opens (it sits above a long list on phones).
  useEffect(() => {
    if (!editing) return;
    formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    formRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }, [editing?.id, editing === null]);

  async function save() {
    if (!editing) return;
    setErrors({});
    try {
      await api(editing.id ? `/retailers/${editing.id}` : "/retailers", { method: editing.id ? "PUT" : "POST", body: editing.draft });
      setAnnounce(`${editing.draft.name} saved`);
      setEditing(null);
      reload();
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.errors).length) setErrors(e.errors);
      else setActionError((e as Error).message);
    }
  }

  async function setStatus(r: RetailerRow, status: Retailer["status"]) {
    setData((rows) => rows?.map((x) => (x.id === r.id ? { ...x, status } : x)));
    try {
      await api(`/retailers/${r.id}`, { method: "PUT", body: { ...toDraft(r), status } });
      setAnnounce(`${r.name} marked ${STATUS[status].label.toLowerCase()}`);
    } catch (e) {
      setActionError((e as Error).message);
      reload();
    }
  }

  async function remove(r: RetailerRow) {
    if (!confirm(`Remove ${r.name} from the programme list? Its offers are not affected.`)) return;
    await api(`/retailers/${r.id}`, { method: "DELETE" }).catch((e) => setActionError(e.message));
    reload();
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e));
  const text = (k: keyof Draft, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      className="adm-input"
      value={(editing?.draft[k] as string) ?? ""}
      onChange={(e) => set(k, (e.target.value || null) as never)}
      aria-invalid={errors[k] ? true : undefined}
      {...props}
    />
  );

  // Most live offers first: that's where an approval earns the most.
  const rows = [...(data ?? [])].sort((a, b) => b.liveDeals - a.liveDeals || a.name.localeCompare(b.name));
  const todo = rows.filter((r) => r.status === "todo" && r.liveDeals > 0 && r.signupUrl).length;
  const networks = Object.entries(NETWORKS)
    .map(([name, url]) => ({ name, url, count: rows.filter((r) => r.network === name).length }))
    .filter((n) => n.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <PageHeader
        eyebrow="Monetisation"
        title="Affiliate programmes"
        actions={
          <Button variant="primary" onClick={() => setEditing({ id: null, draft: blank })}>
            Add retailer
          </Button>
        }
      />
      <p className="adm-lede">
        Apply to a programme, use <em>Get tracking link</em> to open its network dashboard, then paste the generated deep link into each offer's <em>Affiliate link</em> field. Network sign-in and approval are required.{" "}
        {todo > 0 ? <strong className="adm-warn">{plural(todo, "programme")} with live offers still to apply for.</strong> : null}
      </p>
      <p className="visually-hidden" role="status">
        {announce}
      </p>
      <ErrorNote message={error ?? actionError} />

      {networks.length > 0 ? (
        <Panel>
          <PanelHeader title="Start with a network account" />
          <ul className="adm-networks">
            {networks.map((n) => (
              <li key={n.name}>
                <span>
                  <strong>{n.name}</strong> runs {plural(n.count, "programme")} here. One account, then apply to each.
                </span>
                <div className="adm-inline">
                  <ExternalLink href={n.url} className="adm-link" context="publisher sign-up">Join {n.name}</ExternalLink>
                  <ExternalLink href={LINK_TOOLS[n.name].url} className="adm-link" context="publisher dashboard; sign-in required">Open dashboard</ExternalLink>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {editing ? (
        <Panel>
          <PanelHeader title={editing.id ? `Edit ${editing.draft.name}` : "Add retailer"} />
          <form
            ref={formRef}
            className="adm-fields"
            aria-label={editing.id ? `Edit ${editing.draft.name}` : "Add retailer"}
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <Field label="Retailer" error={errors.name}>
              {text("name", { required: true, autoComplete: "off" })}
            </Field>
            <Field label="Status">
              <select className="adm-input" value={editing.draft.status} onChange={(e) => set("status", e.target.value as Retailer["status"])}>
                {Object.entries(STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Network" hint="e.g. Awin, Partnerize, Skimlinks, Direct.">
              {text("network")}
            </Field>
            <Field label="Commission">{text("commission", { placeholder: "e.g. 5% on sales, 30-day cookie" })}</Field>
            <Field label="Programme page" hint="Where you apply, and where the Apply button goes." error={errors.signupUrl} wide>
              {text("signupUrl", { type: "url", inputMode: "url", placeholder: "https://…" })}
            </Field>
            <Field label="Your base link" hint="Your general tracking link for this retailer, for reference." error={errors.myLink} wide>
              {text("myLink", { type: "url", inputMode: "url", placeholder: "https://…" })}
            </Field>
            <Field label="Notes" wide>
              <textarea className="adm-input" rows={3} value={editing.draft.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} />
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

      {data && rows.length === 0 ? (
        <Panel>
          <EmptyState title="No retailers yet">Retailers are added automatically when you seed offers, or add one above.</EmptyState>
        </Panel>
      ) : (
        <ul className="adm-progs">
          {rows.map((r) => (
            <li key={r.id} className="adm-prog">
              <div className="adm-prog__head">
                <h2 className="adm-prog__name">{r.name}</h2>
                <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
              </div>
              <dl className="adm-prog__facts">
                <div>
                  <dt>Network</dt>
                  <dd>{r.network ?? "None found"}</dd>
                </div>
                {r.commission ? (
                  <div>
                    <dt>Commission</dt>
                    <dd>{r.commission}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Live offers</dt>
                  <dd>
                    {r.liveDeals > 0 ? <Link to={`/admin/offers?q=${encodeURIComponent(r.name)}`}>{r.liveDeals}</Link> : 0}
                    {r.liveDeals > 0 ? (
                      <span className={r.monetised < r.liveDeals ? "adm-warn" : "adm-ok"}>, {r.monetised} with affiliate link</span>
                    ) : null}
                  </dd>
                </div>
              </dl>
              {r.notes ? <p className="adm-prog__notes">{r.notes}</p> : null}
              <details className="adm-prog__help">
                <summary>How to get your link</summary>
                <p>{linkInstructions(r)}</p>
              </details>
              <SavedLink retailer={r} onSaved={reload} />
              <div className="adm-prog__actions">
                <ProgrammeLink retailer={r} />
                <TrackingLink retailer={r} />
                {r.myLink ? (
                  <ExternalLink href={r.myLink} className="adm-link adm-small" context={`for ${r.name}`}>
                    Your link
                  </ExternalLink>
                ) : null}
                <label className="adm-prog__status">
                  <span className="visually-hidden">Status for {r.name}</span>
                  <select className="adm-input" value={r.status} onChange={(e) => setStatus(r, e.target.value as Retailer["status"])}>
                    {Object.entries(STATUS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setErrors({});
                    setEditing({ id: r.id, draft: toDraft(r) });
                  }}
                >
                  Edit<span className="visually-hidden"> {r.name}</span>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                  Remove<span className="visually-hidden"> {r.name}</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
