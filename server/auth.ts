import { createHash, timingSafeEqual } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";

const COOKIE = "lumiere_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

function config() {
  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.SESSION_SECRET ?? "";
  return { password, secret, ready: password.length > 0 && secret.length >= 32 };
}

export const authReady = () => config().ready;

const secure = () => process.env.NODE_ENV === "production" && process.env.SESSION_COOKIE_SECURE !== "false";

const digest = (s: string) => createHash("sha256").update(s).digest();

export function passwordMatches(attempt: string) {
  const { password } = config();
  return timingSafeEqual(digest(attempt), digest(password));
}

export async function startSession(c: Context) {
  const expires = Date.now() + MAX_AGE * 1000;
  await setSignedCookie(c, COOKIE, String(expires), config().secret, {
    httpOnly: true,
    sameSite: "Lax",
    secure: secure(),
    path: "/",
    maxAge: MAX_AGE,
  });
}

export const endSession = (c: Context) => deleteCookie(c, COOKIE, { path: "/" });

export async function isAdmin(c: Context) {
  const { ready, secret } = config();
  if (!ready) return false;
  const value = await getSignedCookie(c, secret, COOKIE);
  return typeof value === "string" && Number(value) > Date.now();
}

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  if (!(await isAdmin(c))) return c.json({ error: "Not signed in" }, 401);
  // Every admin write is JSON, which a cross-site form can't send without a CORS preflight.
  if (c.req.method !== "GET" && !c.req.header("content-type")?.includes("application/json")) {
    return c.json({ error: "Expected JSON" }, 415);
  }
  await next();
};

// Login attempts per client: 10 per 15 minutes.
const attempts = new Map<string, { count: number; reset: number }>();

export function loginAllowed(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.reset < now) {
    attempts.set(ip, { count: 1, reset: now + 15 * 60 * 1000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= 10;
}

// The last X-Forwarded-For entry is the one our reverse proxy appended; earlier ones are client-supplied.
export const clientIp = (c: Context) => c.req.header("x-forwarded-for")?.split(",").at(-1)?.trim() || c.req.header("x-real-ip") || "local";
