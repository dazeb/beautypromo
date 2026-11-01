const SITE_URL = "https://beautypromos.deals";

const ADMIN_PAGES: Record<string, { title: string; description: string }> = {
  "/admin": {
    title: "Dashboard",
    description: "Manage beauty offers, affiliate programmes and subscribers in the private beautypromos dashboard.",
  },
  "/admin/offers": {
    title: "Offers",
    description: "Manage published, draft and archived beauty offers in the private beautypromos admin.",
  },
  "/admin/offers/new": {
    title: "New offer",
    description: "Create a beauty offer with retailer terms, dates and affiliate links in the private beautypromos admin.",
  },
  "/admin/retailers": {
    title: "Affiliate programmes",
    description: "Manage retailer affiliate programmes, applications and tracking links in the private beautypromos admin.",
  },
  "/admin/dates": {
    title: "Key dates",
    description: "Manage upcoming beauty shopping dates and events in the private beautypromos admin.",
  },
  "/admin/subscribers": {
    title: "Subscribers",
    description: "Manage newsletter subscribers in the private beautypromos admin.",
  },
  "/admin/import": {
    title: "Bulk import",
    description: "Validate and import beauty offers in the private beautypromos admin.",
  },
};

export function adminMetadata(pathname: string) {
  const path = pathname.replace(/\/index\.html$/, "").replace(/\/+$/, "");
  const editing = /^\/admin\/offers\/\d+$/.test(path);
  const route = editing || ADMIN_PAGES[path] ? path : "/admin";
  const page = editing
    ? { title: "Edit offer", description: "Edit beauty offer details, retailer terms and affiliate links in the private beautypromos admin." }
    : ADMIN_PAGES[route];
  return {
    title: `${page.title} · beautypromos admin`,
    description: page.description,
    canonical: `${SITE_URL}${route === "/admin" ? "/admin/" : route}`,
  };
}
