import { DatabaseSync } from "node:sqlite";

export type SavedSessionAuthorizationCapacities = {
  readonly anonymousVaults: number;
  readonly oauthClients: number;
  readonly retainedRecords: number;
};

export const SAVED_SESSION_AUTHORIZATION_CAPACITIES = {
  anonymousVaults: 10_000,
  oauthClients: 10_000,
  retainedRecords: 100_000,
} as const satisfies SavedSessionAuthorizationCapacities;

const AUTHORIZATION_STATE_MUTATION_PATHS = new Set([
  "/api/auth/sign-in/anonymous",
  "/api/auth/oauth2/register",
  "/api/auth/oauth2/consent",
  "/api/auth/oauth2/token",
]);

const RETAINED_AUTHORIZATION_TABLES = [
  "user",
  "session",
  "verification",
  "oauthClient",
  "oauthClientResource",
  "oauthRefreshToken",
  "oauthAccessToken",
  "oauthConsent",
  "oauthClientAssertion",
] as const;

export function applySavedSessionAuthorizationBackpressure(
  database: DatabaseSync,
  request: Request,
  capacities: SavedSessionAuthorizationCapacities,
): Response | undefined {
  const pathname = new URL(request.url).pathname;
  if (!isAuthorizationStateMutation(request, pathname)) {
    return undefined;
  }
  pruneExpiredAuthorizationState(database, Date.now());
  const anonymousVaultCapacityReached =
    pathname === "/api/auth/sign-in/anonymous" &&
    tableRowCount(database, "user") >= capacities.anonymousVaults;
  const oauthClientCapacityReached =
    ((request.method === "POST" && pathname === "/api/auth/oauth2/register") ||
      authorizationIntroducesClient(database, request, pathname)) &&
    tableRowCount(database, "oauthClient") >= capacities.oauthClients;
  const retainedRecordCapacityReached =
    retainedAuthorizationRecordCount(database) >= capacities.retainedRecords;
  return anonymousVaultCapacityReached ||
    oauthClientCapacityReached ||
    retainedRecordCapacityReached
    ? authorizationCapacityResponse()
    : undefined;
}

function isAuthorizationStateMutation(
  request: Request,
  pathname: string,
): boolean {
  return (
    (request.method === "POST" &&
      AUTHORIZATION_STATE_MUTATION_PATHS.has(pathname)) ||
    (request.method === "GET" && pathname === "/api/auth/oauth2/authorize")
  );
}

function authorizationIntroducesClient(
  database: DatabaseSync,
  request: Request,
  pathname: string,
): boolean {
  if (request.method !== "GET" || pathname !== "/api/auth/oauth2/authorize") {
    return false;
  }
  const clientId = new URL(request.url).searchParams.get("client_id");
  if (clientId === null) return false;
  return (
    database
      .prepare('SELECT 1 FROM "oauthClient" WHERE "clientId" = ? LIMIT 1')
      .get(clientId) === undefined
  );
}

export function pruneExpiredAuthorizationState(
  database: DatabaseSync,
  nowEpochMilliseconds: number,
): void {
  database
    .prepare(
      `DELETE FROM "oauthAccessToken"
       WHERE "expiresAt" <= ? OR "revoked" IS NOT NULL`,
    )
    .run(nowEpochMilliseconds);
  database
    .prepare(
      `DELETE FROM "oauthRefreshToken"
       WHERE "expiresAt" <= ?
          OR (
            "revoked" IS NOT NULL
            AND (
              "rotationReplayExpiresAt" IS NULL
              OR "rotationReplayExpiresAt" <= ?
            )
          )`,
    )
    .run(nowEpochMilliseconds, nowEpochMilliseconds);
  for (const table of [
    "session",
    "verification",
    "oauthClientAssertion",
  ] as const) {
    database
      .prepare(`DELETE FROM "${table}" WHERE "expiresAt" <= ?`)
      .run(nowEpochMilliseconds);
  }
}

function retainedAuthorizationRecordCount(database: DatabaseSync): number {
  return RETAINED_AUTHORIZATION_TABLES.reduce(
    (count, table) => count + tableRowCount(database, table),
    0,
  );
}

function tableRowCount(database: DatabaseSync, table: string): number {
  const row = database
    .prepare(`SELECT COUNT(*) AS count FROM "${table}"`)
    .get();
  if (
    row === undefined ||
    typeof row.count !== "number" ||
    !Number.isSafeInteger(row.count)
  ) {
    throw new Error(`Could not count saved-session authorization ${table}`);
  }
  return row.count;
}

function authorizationCapacityResponse(): Response {
  return Response.json(
    {
      error: "temporarily_unavailable",
      error_description:
        "Saved-session authorization is temporarily at capacity. Try again later.",
    },
    {
      status: 503,
      headers: { "cache-control": "no-store", "retry-after": "60" },
    },
  );
}
