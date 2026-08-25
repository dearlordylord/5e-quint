import {
  GUEST_INACTIVITY_RETENTION_MS,
  GUEST_PRESSURE_PROTECTION_MS,
  SAVED_INACTIVITY_RETENTION_MS,
} from "./play-session-access.ts";
import type { PublicMcpPublisherName } from "./public-service-operations.ts";

export const PUBLIC_PUBLISHER_SITE_PATHS = [
  "/",
  "/support",
  "/privacy",
  "/terms",
] as const;

type PublicPublisherSitePath = (typeof PUBLIC_PUBLISHER_SITE_PATHS)[number];

const DAY_MS = 24 * 60 * 60 * 1_000;
const SECURITY_HEADERS = {
  "content-security-policy":
    "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "cross-origin-resource-policy": "same-origin",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

const pages: Record<PublicPublisherSitePath, { title: string; body: string }> =
  {
    "/": {
      title: "5.5e SRD Oracle",
      body: `<p>Explore the redistributable 5.5e SRD catalog, create a character, and play rules-backed battles with an AI agent.</p>
<p>You can browse and play as a guest without signing in. The agent carries the temporary session access grant for you and should tell you when a session is not saved.</p>
<nav><a href="/support">Support</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></nav>`,
    },
    "/support": {
      title: "5.5e SRD Oracle support",
      body: `<p>For help, bug reports, or deletion problems, open an issue in the <a href="https://github.com/dearlordylord/5e-quint/issues">public support tracker</a>.</p>
<p>Do not include access grants, OAuth tokens, or private session content in a report. Include the release from <code>/version</code> and a redacted description of the failed operation.</p>`,
    },
    "/privacy": {
      title: "5.5e SRD Oracle privacy notice",
      body: `<p>Catalog browsing requires no account. Guest Play Sessions are temporary and normally expire after ${days(GUEST_INACTIVITY_RETENTION_MS)} inactive days. Under capacity pressure, the oldest inactive guest sessions may be removed, but never before ${hours(GUEST_PRESSURE_PROTECTION_MS)} inactive hours.</p>
<p>Standard MCP OAuth is requested only to save, list, resume, or permanently delete account-owned sessions. Signed-in sessions are saved by default, belong to one account, are not shared, and expire after ${days(SAVED_INACTIVITY_RETENTION_MS)} inactive days.</p>
<p>The service stores the character and battle state needed to continue a Play Session. It does not use session content for advertising. Operational telemetry is bounded and redacted: it excludes request arguments, response content, bearer tokens, guest grants, session identifiers, and account identifiers.</p>
<p>Deleting a saved Play Session is permanent. Losing a guest grant makes that guest session unavailable even if it has not yet expired.</p>`,
    },
    "/terms": {
      title: "5.5e SRD Oracle terms",
      body: `<p>This service is an exploratory rules tool based only on the repository's redistributable SRD corpus and visibly synthetic test content. It does not provide or execute closed-license PHB+ content.</p>
<p>Do not submit secrets or unlawful content. Availability is not guaranteed; temporary guest sessions may be removed under the retention and capacity rules in the privacy notice. You remain responsible for reviewing an agent's choices and outputs.</p>
<p>The software is provided without warranties to the extent permitted by law. Source-code licensing and SRD attribution are published in the <a href="https://github.com/dearlordylord/5e-quint">project repository</a>.</p>`,
    },
  };

export function publicPublisherSiteResponse(
  pathname: string,
  method: string | undefined,
  publisherName: PublicMcpPublisherName,
): Response | undefined {
  if (!isPublicPublisherSitePath(pathname)) return undefined;
  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...SECURITY_HEADERS, allow: "GET, HEAD" },
    });
  }
  const page = pages[pathname];
  return new Response(
    method === "HEAD"
      ? null
      : html(page.title, page.body, escapeHtml(publisherName)),
    {
      headers: {
        ...SECURITY_HEADERS,
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    },
  );
}

export function isPublicPublisherSitePath(
  pathname: string,
): pathname is PublicPublisherSitePath {
  return PUBLIC_PUBLISHER_SITE_PATHS.some((path) => path === pathname);
}

function days(milliseconds: number): number {
  return milliseconds / DAY_MS;
}

function hours(milliseconds: number): number {
  return milliseconds / (60 * 60 * 1_000);
}

function html(title: string, body: string, publisherLabel: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body><main><h1>${title}</h1>${body}<footer>Published by ${publisherLabel}.</footer></main></body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
