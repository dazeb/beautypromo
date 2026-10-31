import { useEffect, useMemo, useRef, useState } from "react";
import { goUrl, pounds, savingPct, slugify } from "../../shared/format";
import { CATEGORIES, STATUSES, type Category, type Deal, type PublicDeal, type Status } from "../../shared/types";
import { DealCard } from "../../site/components/DealCard";
import { ApiError, api, useApi } from "../api";
import { CopyLinkButton, linkInstructions, ProgrammeLink, TrackingLink, type RetailerRow } from "../programmes";
import { Button, ErrorNote, Field, Kbd, PageHeader, Panel, PanelHeader, StatusBadge, cx } from "../components/ui";
import { Link, navigate } from "../router";

interface Form {
  retailer: string;
  title: string;
  slug: string;
  headline: string;
  sub: string;
  details: string;
  terms: string;
  code: string;
  url: string;
  affiliateUrl: string;
  price: string;
  worth: string;
  note: string;
  endsAt: string;
  verifiedAt: string;
  categories: Category[];
  status: Status;
  featured: boolean;
}

const EMPTY: Form = {
  retailer: "",
  title: "",
  slug: "",
  headline: "",
  sub: "",
  details: "",
  terms: "",
  code: "",
  url: "",
  affiliateUrl: "",
  price: "",
  worth: "",
  note: "",
  endsAt: "",
  verifiedAt: new Date().toISOString().slice(0, 10),
  categories: [],
  status: "published",
  featured: false,
};

/** ISO instant → value for <input type="datetime-local"> in the browser's time zone. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
}

function fromDeal(d: Deal): Form {
  return {
    retailer: d.retailer,
    title: d.title,
    slug: d.slug,
    headline: d.headline,
    sub: d.sub,
    details: d.details,
    terms: d.terms,
    code: d.code ?? "",
    url: d.url,
    affiliateUrl: d.affiliateUrl ?? "",
    price: d.price?.toString() ?? "",
    worth: d.worth?.toString() ?? "",
    note: d.note ?? "",
    endsAt: toLocalInput(d.endsAt),
    verifiedAt: d.verifiedAt?.slice(0, 10) ?? "",
    categories: d.categories,
    status: d.status,
    featured: d.featured,
  };
}

function toPayload(f: Form) {
  return {
    ...f,
    endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null,
    verifiedAt: f.verifiedAt ? `${f.verifiedAt}T12:00:00Z` : null,
    price: f.price === "" ? null : Number(f.price),
    worth: f.worth === "" ? null : Number(f.worth),
  };
}

export function OfferEditor({ id }: { id: number | null }) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [saved, setSaved] = useState<Deal | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string }>();
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(id === null);
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const retailers = useApi<RetailerRow[]>("/retailers").data ?? [];
  const programme = retailers.find((r) => r.name.toLowerCase() === form.retailer.trim().toLowerCase());

  useEffect(() => {
    setErrors({});
    setMessage(undefined);
    setDirty(false);
    if (id === null) {
      setForm(EMPTY);
      setSaved(null);
      setSlugTouched(false);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    api<Deal>(`/deals/${id}`)
      .then((d) => {
        setSaved(d);
        setForm(fromDeal(d));
        setSlugTouched(true);
        setLoaded(true);
      })
      .catch((e: Error) => setMessage({ kind: "error", text: e.message }));
  }, [id]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // ⌘/Ctrl+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setDirty(true);
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (!slugTouched && (key === "retailer" || key === "title")) next.slug = slugify(`${next.retailer} ${next.title}`);
      return next;
    });
  }

  const toggleCategory = (c: Category) =>
    set("categories", form.categories.includes(c) ? form.categories.filter((x) => x !== c) : [...form.categories, c]);

  async function save(another: boolean) {
    setSaving(true);
    setErrors({});
    setMessage(undefined);
    try {
      const deal = await api<Deal>(id ? `/deals/${id}` : "/deals", { method: id ? "PUT" : "POST", body: toPayload(form) });
      setDirty(false);
      if (another && id) {
        navigate("/admin/offers/new");
      } else if (another) {
        setForm({ ...EMPTY, retailer: form.retailer, categories: form.categories, verifiedAt: form.verifiedAt });
        setSlugTouched(false);
        setMessage({ kind: "ok", text: `Saved “${deal.title}”. Ready for the next one.` });
      } else if (!id) {
        navigate(`/admin/offers/${deal.id}`, { replace: true });
      } else {
        setSaved(deal);
        setForm(fromDeal(deal));
        setMessage({ kind: "ok", text: "Saved. The public site shows changes immediately." });
      }
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.errors).length) {
        setErrors(e.errors);
        setMessage({ kind: "error", text: "Some fields need attention." });
      } else setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const isAdvent = form.categories.includes("advent");
  const preview: PublicDeal = useMemo(
    () => ({
      slug: form.slug || "preview",
      retailer: form.retailer,
      title: form.title,
      headline: form.headline,
      sub: form.sub,
      details: form.details,
      categories: form.categories,
      code: form.code || null,
      terms: form.terms,
      price: form.price === "" ? null : Number(form.price),
      worth: form.worth === "" ? null : Number(form.worth),
      note: form.note || null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      featured: form.featured,
      verifiedAt: null,
    }),
    [form],
  );

  if (!loaded) return <ErrorNote message={message?.text} />;

  const input = (key: keyof Form, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      className="adm-input"
      name={key}
      value={form[key] as string}
      onChange={(e) => set(key, e.target.value as never)}
      aria-invalid={!!errors[key]}
      {...props}
    />
  );

  return (
    <>
      <PageHeader
        eyebrow={id ? "Edit offer" : "New offer"}
        title={form.title || (id ? "Untitled offer" : "New offer")}
        actions={
          <>
            {saved ? <StatusBadge status={saved.status} endsAt={saved.endsAt} /> : null}
            <Link to="/admin/offers" className="adm-link adm-small">
              All offers
            </Link>
          </>
        }
      />

      <div className="adm-editor">
        <form
          ref={formRef}
          className="adm-editor__form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save(false);
          }}
        >
          <Panel>
            <PanelHeader title="The offer" />
            <div className="adm-fields">
              <Field label="Retailer" error={errors.retailer}>
                {input("retailer", { placeholder: "Space NK", required: true, list: "retailers" })}
              </Field>
              <Field label="Title" error={errors.title}>
                {input("title", { placeholder: "The Beauty Insider Gift", required: true })}
              </Field>
              <Field label="Categories" error={errors.categories} wide group>
                <div className="adm-chips">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={cx("adm-chip", form.categories.includes(c.id) && "is-on")}
                      aria-pressed={form.categories.includes(c.id)}
                      onClick={() => toggleCategory(c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </Field>
              {isAdvent ? null : (
                <>
                  <Field label="Headline" hint="The big figure: “25% off”, “Free”, “£92”, “3 for 2”." error={errors.headline}>
                    {input("headline", { placeholder: "25% off" })}
                  </Field>
                  <Field label="Under the headline" hint="One short line: “worth £454 when you spend £50”." error={errors.sub}>
                    {input("sub", { placeholder: "worth £454 when you spend £50" })}
                  </Field>
                  <Field label="Details" error={errors.details} wide>
                    <textarea
                      className="adm-input"
                      rows={3}
                      value={form.details}
                      onChange={(e) => set("details", e.target.value)}
                      placeholder="What's included, how to get it, any no-code note."
                    />
                  </Field>
                  <Field label="Terms" hint="The catch, in a few words." error={errors.terms}>
                    {input("terms", { placeholder: "While stocks last. Exclusions apply." })}
                  </Field>
                  <Field label="Discount code" error={errors.code}>
                    {input("code", { placeholder: "Optional", className: "adm-input adm-mono" })}
                  </Field>
                </>
              )}
              <Field label="Price paid (£)" hint={isAdvent ? "Required for advent calendars." : "For sets bought with purchase."} error={errors.price}>
                {input("price", { inputMode: "decimal", placeholder: "92" })}
              </Field>
              <Field label="Stated value (£)" hint="Drives the hero's “gift value up to” and advent ranking." error={errors.worth}>
                {input("worth", { inputMode: "decimal", placeholder: "454" })}
              </Field>
              {isAdvent ? (
                <Field label="Note" hint="Shown after the price, e.g. “25 products, 10 full size”." error={errors.note} wide>
                  {input("note")}
                </Field>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Links" />
            <div className="adm-fields">
              <Field label="Offer page" hint="The retailer's own page for this offer. Copy it into the network's link generator as the destination." error={errors.url} action={<CopyLinkButton value={form.url} label="Copy offer URL" />} wide>
                {input("url", { type: "url", placeholder: "https://www.spacenk.com/uk/…", required: true })}
              </Field>
              <Field
                label="Affiliate link"
                hint={
                  programme && programme.status !== "approved" && programme.signupUrl
                    ? `You're not approved by ${programme.name} yet. Apply${programme.network && programme.network !== "Direct" ? ` on ${programme.network}` : ""}, then paste the deep link for this offer here.`
                    : "Where the Shop button sends people, so you earn the commission. Leave blank to use the offer page."
                }
                error={errors.affiliateUrl}
                action={programme ? <ProgrammeLink retailer={programme} variant="secondary" /> : null}
                wide
              >
                {input("affiliateUrl", { type: "url", placeholder: "https://www.awin1.com/cread.php?…" })}
              </Field>
              {programme ? (
                <div className="adm-field--wide adm-prog__guide">
                  <div className="adm-inline"><TrackingLink retailer={programme} /></div>
                  <p className="adm-small">{linkInstructions(programme)}</p>
                  {programme.myLink ? (
                    <details className="adm-prog__help">
                      <summary>Saved tracking link for {programme.name}</summary>
                      <p className="adm-small">This is your retailer reference link. Check that its destination matches this offer before using it.</p>
                      <code className="adm-prog__saved-url">{programme.myLink}</code>
                      <CopyLinkButton value={programme.myLink} label="Copy saved link" />
                    </details>
                  ) : null}
                </div>
              ) : null}
              <Field label="Slug" hint={<>Tracked link: <code>{goUrl(form.slug || "…", "grid").split("?")[0]}</code></>} error={errors.slug} wide>
                <input
                  className="adm-input adm-mono"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", slugify(e.target.value));
                  }}
                />
              </Field>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Timing & visibility" />
            <div className="adm-fields">
              <Field
                label="Ends"
                hint="UK time. Leave empty if the retailer gives no end date."
                error={errors.endsAt}
                action={
                  form.endsAt ? (
                    <Button size="sm" variant="ghost" onClick={() => set("endsAt", "")}>
                      Clear<span className="visually-hidden"> end date</span>
                    </Button>
                  ) : null
                }
              >
                {input("endsAt", { type: "datetime-local" })}
              </Field>
              <Field
                label="Last verified"
                hint="When you last checked the retailer's terms."
                error={errors.verifiedAt}
                action={
                  <Button size="sm" variant="ghost" onClick={() => set("verifiedAt", new Date().toISOString().slice(0, 10))}>
                    Today<span className="visually-hidden">: set last verified to today</span>
                  </Button>
                }
              >
                {input("verifiedAt", { type: "date" })}
              </Field>
              <Field label="Status" error={errors.status}>
                <select className="adm-input" value={form.status} onChange={(e) => set("status", e.target.value as Status)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s === "published" ? "Published" : s === "draft" ? "Draft" : "Archived"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Featured" hint="The first featured offer becomes the offer of the week." group>
                <label className="adm-check">
                  <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> Feature this offer
                </label>
              </Field>
            </div>
          </Panel>

          <datalist id="retailers">
            {retailers.map((r) => (
              <option key={r.name} value={r.name} />
            ))}
          </datalist>

          <div className="adm-savebar">
            {message ? <span className={cx("adm-savebar__msg", message.kind === "error" && "adm-warn")}>{message.text}</span> : <span />}
            <Button onClick={() => save(true)} disabled={saving}>
              Save &amp; add another
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save"} <Kbd>⌘S</Kbd>
            </Button>
          </div>
        </form>

        <aside className="adm-editor__preview" aria-label="Live preview">
          <p className="adm-eyebrow">Live preview</p>
          {isAdvent ? (
            <AdventPreview deal={preview} />
          ) : (
            <ul className="grid adm-preview-grid">
              <DealCard deal={preview} now={new Date()} preview />
            </ul>
          )}
          <p className="adm-small adm-muted">This uses the same component as the public site.</p>
        </aside>
      </div>
    </>
  );
}

function AdventPreview({ deal }: { deal: PublicDeal }) {
  const ok = deal.price != null && deal.worth != null && deal.worth > 0;
  return (
    <ol className="advent__list adm-preview-advent">
      <li className="advent__item">
        <span className="advent__rank">01</span>
        <div className="advent__info">
          <span className="advent__name">{deal.title || "Calendar name"}</span>
          <span className="advent__price">
            {ok ? `${pounds(deal.price!)} for ${pounds(deal.worth!)} of beauty` : "Add a price and value"}
            {deal.note ? ` · ${deal.note}` : ""}
          </span>
          <span className="advent__bar" style={{ "--w": `${ok ? savingPct(deal.price!, deal.worth!) : 0}%` } as React.CSSProperties} />
        </div>
        <span className="advent__saving">
          {ok ? savingPct(deal.price!, deal.worth!) : "—"}
          <small>% off</small>
        </span>
      </li>
    </ol>
  );
}
