import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  status: number;
  errors: Record<string, string>;
  constructor(status: number, message: string, errors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

/** Fired when any request comes back 401, so the shell can show the login screen. */
export const SIGNED_OUT = "lumiere:signed-out";

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = init.method ?? (init.body === undefined ? "GET" : "POST");
  const res = await fetch(`/api/admin${path}`, {
    method,
    credentials: "same-origin",
    headers: method === "GET" ? {} : { "content-type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(init.body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/login") window.dispatchEvent(new Event(SIGNED_OUT));
  if (!res.ok) throw new ApiError(res.status, data.error ?? Object.values(data.errors ?? {})[0] ?? `Request failed (${res.status})`, data.errors);
  return data as T;
}

/** Download a file from an admin endpoint (keeps the session cookie). */
export async function download(path: string, filename: string) {
  const res = await fetch(`/api/admin${path}`, { credentials: "same-origin" });
  if (!res.ok) throw new ApiError(res.status, "Download failed");
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api<T>(path)
      .then((d) => !cancelled && (setData(d), setError(undefined)))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [path, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, reload, setData };
}
