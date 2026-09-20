import {
  GUEST_INACTIVITY_RETENTION_MS,
  GUEST_PRESSURE_PROTECTION_MS,
  SAVED_INACTIVITY_RETENTION_MS,
} from "./play-session-access.ts";
import type { PublicMcpPublisherName } from "./public-service-operations.ts";
import {
  DEFAULT_PUBLIC_MCP_OPERATOR_DATA_HANDLING,
  type PublicMcpOperatorDataHandling,
} from "./public-operator-data-handling.ts";

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
<p>You can browse the catalog without signing in. Hosted character and battle sessions use standard MCP OAuth and are saved to your connected account; local development sessions last only for their server process.</p>
<nav><a href="/support">Support</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></nav>`,
    },
    "/support": {
      title: "5.5e SRD Oracle support",
      body: `<p>For help, bug reports, or deletion problems, open an issue in the <a href="https://github.com/dearlordylord/5e-quint/issues">public support tracker</a>.</p>
<p>Do not include OAuth tokens or private session content in a report. Include the release from <code>/version</code> and a redacted description of the failed operation.</p>`,
    },
    "/privacy": {
      title: "5.5e SRD Oracle privacy notice",
      body: `<section id="play-session-data"><h2>Play Session data</h2><p>Catalog browsing requires no account. Standard MCP OAuth is required for hosted stateful play. Signed-in sessions are saved by default, belong to one account (the connected account), are available to that account and the service operator, are not shared, and expire after ${days(SAVED_INACTIVITY_RETENTION_MS)} inactive days. The service stores the fictional character and battle state needed to continue them and does not use that content for advertising. Deleting a saved Play Session is permanent.</p><p>Legacy temporary sessions from an older release are not accessible through the public tools. They expire after ${days(GUEST_INACTIVITY_RETENTION_MS)} inactive days and may be removed under capacity pressure after at least ${hours(GUEST_PRESSURE_PROTECTION_MS)} inactive hours.</p></section>
<section id="authorization-records"><h2>Authorization records</h2><p>The authorization service stores OAuth client, consent, synthetic account identity, token, session, verification, and client-assertion records needed to link the MCP client and authorize account-owned sessions. These records are available to the authorization service and connected account. Expired or revoked credentials and other expiring records are pruned; client, consent, and synthetic identity records remain subject to service capacity until operator cleanup. OAuth consent can be declined, and OAuth credentials are not exposed in tool results.</p></section>
<section id="rate-limit-capacity"><h2>Security and capacity state</h2><p>The service stores hashed authorization buckets, bounded request counts, and current capacity counts for the service operator to protect availability and enforce service limits. Rate buckets older than one minute are pruned as requests are admitted; capacity counts are derived from current records. Automatic pruning and fixed capacity limits control this state.</p></section>
<section id="request-observations"><h2>Request observations and process metrics</h2><p>For service operation and diagnosis, the service operator receives bounded route, timing, outcome, release, environment, and aggregate process measurements. Stderr retention is set by the hosting operator and must match the submission attestation. This telemetry excludes request arguments, response content, bearer tokens, Play Session identifiers, and account identifiers.</p></section>
<section id="budget-monitoring"><h2>Budget monitoring</h2><p>When enabled by the operator, aggregate request, resource, storage, network, and fixed-cost measurements are retained by calendar month and threshold alerts are sent to the configured service operator. They do not contain session content or account identifiers.</p></section>
<section id="access-logs"><h2>Hosting access logs</h2><p>The hosting and ingress operators receive ordinary HTTP access metadata for security and service operation. Access-log retention is set by those operators and must match the submission attestation. They must not record MCP arguments, response bodies, authorization headers, or session content.</p></section>`,
    },
    "/terms": {
      title: "5.5e SRD Oracle terms",
      body: `<p>This service is an exploratory rules tool based only on the repository's redistributable SRD corpus and visibly synthetic test content. It does not provide or execute closed-license PHB+ content.</p>
<p>Do not submit secrets or unlawful content. Availability is not guaranteed. You remain responsible for reviewing an agent's choices and outputs.</p>
<p>The software is provided without warranties to the extent permitted by law. Source-code licensing and SRD attribution are published in the <a href="https://github.com/dearlordylord/5e-quint">project repository</a>.</p>`,
    },
  };

export function publicPublisherSiteResponse(
  pathname: string,
  method: string | undefined,
  publisherName: PublicMcpPublisherName,
  operatorDataHandling: PublicMcpOperatorDataHandling = DEFAULT_PUBLIC_MCP_OPERATOR_DATA_HANDLING,
): Response | undefined {
  if (!isPublicPublisherSitePath(pathname)) return undefined;
  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...SECURITY_HEADERS, allow: "GET, HEAD" },
    });
  }
  const page = pages[pathname];
  const body =
    pathname === "/privacy"
      ? privacyBody(page.body, operatorDataHandling)
      : page.body;
  return new Response(
    method === "HEAD"
      ? null
      : html(page.title, body, escapeHtml(publisherName)),
    {
      headers: {
        ...SECURITY_HEADERS,
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    },
  );
}

function privacyBody(
  base: string,
  handling: PublicMcpOperatorDataHandling,
): string {
  const recipients = handling.hostingRecipients.map(escapeHtml).join(", ");
  const budgetStatement =
    handling.budget.tag === "enabled"
      ? `Budget monitoring is enabled for this deployment, and aggregate alerts go to ${escapeHtml(handling.budget.alertRecipient)}.`
      : "Budget monitoring is disabled for this deployment.";
  return base
    .replace(
      '<section id="request-observations"><h2>Request observations and process metrics</h2>',
      `$&<p>Deployment stderr retention is ${escapeHtml(handling.stderrRetention)}.</p>`,
    )
    .replace(
      '<section id="budget-monitoring"><h2>Budget monitoring</h2>',
      `$&<p>${budgetStatement}</p>`,
    )
    .replace(
      '<section id="access-logs"><h2>Hosting access logs</h2>',
      `$&<p>The deployment recipients are ${recipients}. Deployment access-log retention is ${escapeHtml(handling.ingressAccessLogRetention)}.</p>`,
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
