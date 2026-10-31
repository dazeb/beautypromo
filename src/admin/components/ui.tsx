import { cloneElement, isValidElement, useEffect, useId } from "react";
import type { Status } from "../../shared/types";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" };

export const buttonClass = (variant: ButtonProps["variant"] = "secondary", size: ButtonProps["size"] = "md") => `adm-btn adm-btn--${variant} adm-btn--${size}`;

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cx(buttonClass(variant, size), className)} {...props} />;
}

export function PageHeader({ title, eyebrow, actions }: { title: string; eyebrow?: string; actions?: React.ReactNode }) {
  useEffect(() => {
    document.title = `${title} · beautypromos admin`;
  }, [title]);
  return (
    <header className="adm-page-head">
      <div>
        {eyebrow ? <p className="adm-eyebrow">{eyebrow}</p> : null}
        {/* Focus target after navigation (see App). */}
        <h1 tabIndex={-1}>{title}</h1>
      </div>
      {actions ? <div className="adm-page-head__actions">{actions}</div> : null}
    </header>
  );
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cx("adm-panel", className)}>{children}</section>;
}

export function PanelHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="adm-panel__head">
      <h2>{title}</h2>
      {action}
    </header>
  );
}

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "warn" }) {
  return (
    <div className={cx("adm-stat", tone && `adm-stat--${tone}`)}>
      <span className="adm-stat__value">{value}</span>
      <span className="adm-stat__label">{label}</span>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="adm-empty">
      <p className="adm-empty__title">{title}</p>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

const STATUS_LABEL: Record<Status | "expired", string> = { published: "Live", draft: "Draft", archived: "Archived", expired: "Expired" };

export function StatusBadge({ status, endsAt }: { status: Status; endsAt?: string | null }) {
  const effective = status === "published" && endsAt && Date.parse(endsAt) <= Date.now() ? "expired" : status;
  return <span className={`adm-badge adm-badge--${effective}`}>{STATUS_LABEL[effective]}</span>;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad"; children: React.ReactNode }) {
  return <span className={`adm-badge adm-badge--${tone}`}>{children}</span>;
}

const CONTROLS = new Set(["input", "select", "textarea"]);

export function Field({
  label,
  hint,
  error,
  children,
  wide,
  group,
  action,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  wide?: boolean;
  /** Several controls (e.g. toggle buttons): render a labelled group instead of a <label>. */
  group?: boolean;
  /** A small button shown beside the control, e.g. "Today". */
  action?: React.ReactNode;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  const className = cx("adm-field", wide && "adm-field--wide", error && "adm-field--error");
  const note = error ? (
    <span className="adm-field__error" id={noteId}>
      {error}
    </span>
  ) : hint ? (
    <span className="adm-field__hint" id={noteId}>
      {hint}
    </span>
  ) : null;
  if (group) {
    return (
      <div className={className} role="group" aria-labelledby={id} aria-describedby={note ? noteId : undefined}>
        <span className="adm-field__label" id={id}>
          {label}
        </span>
        {children}
        {note}
      </div>
    );
  }
  // A single form control gets a real label/for pairing, with the hint or error as its description.
  if (isValidElement<Record<string, unknown>>(children) && CONTROLS.has(children.type as string)) {
    const control = cloneElement(children, {
      id,
      "aria-describedby": note ? noteId : undefined,
      "aria-invalid": error ? true : (children.props["aria-invalid"] as boolean | undefined),
    });
    return (
      <div className={className}>
        <label className="adm-field__label" htmlFor={id}>
          {label}
        </label>
        {action ? (
          <div className="adm-inline">
            {control}
            {action}
          </div>
        ) : (
          control
        )}
        {note}
      </div>
    );
  }
  return (
    <label className={className}>
      <span className="adm-field__label">{label}</span>
      {children}
      {note}
    </label>
  );
}

/** A link that opens in a new tab and says so to screen readers. `context` is read after the visible text. */
export function ExternalLink({ href, className, context, children }: { href: string; className?: string; context?: string; children: React.ReactNode }) {
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="visually-hidden">
        {context ? ` ${context}` : ""} (opens in a new tab)
      </span>
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}

export function ErrorNote({ message, id }: { message?: string; id?: string }) {
  return message ? (
    <p className="adm-alert" role="alert" id={id}>
      {message}
    </p>
  ) : null;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="adm-kbd">{children}</kbd>;
}

const rel = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

export function relativeTime(iso: string, now = Date.now()) {
  const diff = Date.parse(iso) - now;
  const abs = Math.abs(diff);
  if (abs < 6e4) return diff < 0 ? "just now" : "in under a minute";
  if (abs < 36e5) return rel.format(Math.round(diff / 6e4), "minute");
  if (abs < 864e5) return rel.format(Math.round(diff / 36e5), "hour");
  return rel.format(Math.round(diff / 864e5), "day");
}

export const shortDateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});
