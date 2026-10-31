import { useEffect, useRef, useState } from "react";
import { SIGNED_OUT, api } from "./api";
import { Button, ErrorNote, Kbd, cx } from "./components/ui";
import { Dashboard } from "./pages/Dashboard";
import { Dates } from "./pages/Dates";
import { Import } from "./pages/Import";
import { OfferEditor } from "./pages/OfferEditor";
import { Offers } from "./pages/Offers";
import { Retailers } from "./pages/Retailers";
import { Subscribers } from "./pages/Subscribers";
import { Link, navigate, useLocation } from "./router";

const NAV = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/offers", label: "Offers" },
  { to: "/admin/retailers", label: "Affiliate programmes" },
  { to: "/admin/dates", label: "Key dates" },
  { to: "/admin/subscribers", label: "Subscribers" },
  { to: "/admin/import", label: "Bulk import" },
];

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

function Page({ path }: { path: string }) {
  if (path === "/admin") return <Dashboard />;
  if (path === "/admin/offers") return <Offers />;
  if (path === "/admin/offers/new") return <OfferEditor id={null} />;
  const edit = /^\/admin\/offers\/(\d+)$/.exec(path);
  if (edit) return <OfferEditor id={Number(edit[1])} />;
  if (path === "/admin/retailers") return <Retailers />;
  if (path === "/admin/dates") return <Dates />;
  if (path === "/admin/subscribers") return <Subscribers />;
  if (path === "/admin/import") return <Import />;
  return <p className="adm-lede">That page doesn't exist.</p>;
}

function Login({ configured, onSignedIn }: { configured: boolean; onSignedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api("/login", { body: { password } });
      onSignedIn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    document.title = "Sign in · beautypromos admin";
  }, []);

  return (
    <main className="adm-login">
      <form className="adm-login__card" onSubmit={submit}>
        <h1 className="wordmark">
          <span className="wordmark__name">beautypromos</span>
          <span className="wordmark__tag">Admin sign-in</span>
        </h1>
        {configured ? (
          <>
            <div className="adm-field">
              <label className="adm-field__label" htmlFor="adm-password">
                Password
              </label>
              <input
                id="adm-password"
                className="adm-input"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "adm-login-error" : undefined}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <ErrorNote message={error} id="adm-login-error" />
            <Button type="submit" variant="primary" disabled={busy || !password}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </>
        ) : (
          <p className="adm-alert">
            Admin isn't configured yet. Set <code>ADMIN_PASSWORD</code> and <code>SESSION_SECRET</code> (32+ characters) in <code>.env</code>, then restart.
          </p>
        )}
      </form>
    </main>
  );
}

export function App() {
  const { path } = useLocation();
  const [session, setSession] = useState<{ signedIn: boolean; configured: boolean }>();
  const [menuOpen, setMenuOpen] = useState(false);

  const check = () =>
    api<{ signedIn: boolean; configured: boolean }>("/me")
      .then(setSession)
      .catch(() => setSession({ signedIn: false, configured: true }));

  useEffect(() => {
    check();
    const out = () => setSession((s) => ({ configured: s?.configured ?? true, signedIn: false }));
    window.addEventListener(SIGNED_OUT, out);
    return () => window.removeEventListener(SIGNED_OUT, out);
  }, []);

  // "N" anywhere in the admin starts a new offer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      e.preventDefault();
      navigate("/admin/offers/new");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // On navigation: close the phone menu and move focus to the new page's heading, so keyboard and
  // screen-reader users land at the top of the new page rather than on a link that no longer exists.
  const firstPath = useRef(path);
  useEffect(() => {
    setMenuOpen(false);
    if (path === firstPath.current) return;
    firstPath.current = "";
    requestAnimationFrame(() => document.querySelector<HTMLElement>(".adm-main h1")?.focus());
  }, [path]);

  // Escape closes the phone menu and returns focus to its button.
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  if (!session) return null;
  if (!session.signedIn) return <Login configured={session.configured} onSignedIn={check} />;

  const active = (item: (typeof NAV)[number]) => (item.exact ? path === item.to : path === item.to || path.startsWith(`${item.to}/`));

  return (
    <div className="adm-shell">
      <a className="skip" href="#adm-main">
        Skip to content
      </a>
      <header className={cx("adm-side", menuOpen && "is-open")}>
        <div className="adm-side__top">
          <Link to="/admin" className="wordmark adm-side__brand">
            <span className="wordmark__name">beautypromos</span>
            <span className="wordmark__tag">Admin</span>
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="adm-side__toggle"
            aria-expanded={menuOpen}
            aria-controls="adm-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
        <div className="adm-side__menu" id="adm-menu">
          <nav className="adm-nav" aria-label="Admin">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} aria-current={active(item) ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="adm-side__foot">
            <Link to="/admin/offers/new" className="adm-btn adm-btn--light adm-btn--md">
              New offer <Kbd>N</Kbd>
            </Link>
            <a href="/" target="_blank" rel="noreferrer" className="adm-side__link">
              View site<span className="visually-hidden"> (opens in a new tab)</span>
              <span aria-hidden="true"> ↗</span>
            </a>
            <button
              type="button"
              className="adm-side__link"
              onClick={async () => {
                await api("/logout", { body: {} }).catch(() => undefined);
                setSession({ signedIn: false, configured: true });
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="adm-main" id="adm-main" tabIndex={-1}>
        <Page path={path} />
      </main>
    </div>
  );
}
