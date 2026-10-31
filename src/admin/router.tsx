import { useEffect, useState } from "react";

const NAV = "lumiere:navigate";

export function navigate(to: string, { replace = false } = {}) {
  if (replace) history.replaceState(null, "", to);
  else history.pushState(null, "", to);
  window.dispatchEvent(new Event(NAV));
  window.scrollTo(0, 0);
}

export function useLocation() {
  const read = () => ({ path: location.pathname.replace(/\/+$/, "") || "/", search: new URLSearchParams(location.search) });
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const update = () => setLoc(read());
    window.addEventListener("popstate", update);
    window.addEventListener(NAV, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(NAV, update);
    };
  }, []);
  return loc;
}

export function Link({ to, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return (
    <a
      {...props}
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
      }}
    />
  );
}
