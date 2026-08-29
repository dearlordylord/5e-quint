import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { Result, Schema } from "effect";

import publicPlaySessionPolicy from "./public-play-session-policy.json" with { type: "json" };

const PublicPlaySessionPolicySchema = Schema.Struct({
  guestInactivityRetentionMs: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.positive(),
  ),
  guestPressureProtectionMs: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.positive(),
  ),
  savedInactivityRetentionMs: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.positive(),
  ),
});
const decodedPublicPlaySessionPolicy = Schema.decodeUnknownSync(
  PublicPlaySessionPolicySchema,
  { onExcessProperty: "error" },
)(publicPlaySessionPolicy);

export const GUEST_INACTIVITY_RETENTION_MS =
  decodedPublicPlaySessionPolicy.guestInactivityRetentionMs;
export const GUEST_PRESSURE_PROTECTION_MS =
  decodedPublicPlaySessionPolicy.guestPressureProtectionMs;
export const SAVED_INACTIVITY_RETENTION_MS =
  decodedPublicPlaySessionPolicy.savedInactivityRetentionMs;
export const DEFAULT_MAX_SAVED_PLAY_SESSIONS_PER_PRINCIPAL = 20;
export const DEFAULT_MAX_RETAINED_COMMANDS_PER_PLAY_SESSION = 10_000;
export const DEFAULT_MAX_GUEST_PLAY_SESSIONS = 1_000;
export const DEFAULT_PLAY_SESSION_REQUESTS_PER_MINUTE = 120;
export const PLAY_SESSION_RATE_LIMIT_WINDOW_MS = 60_000;

export const GuestAccessGrantSchema = Schema.String.pipe(
  Schema.pattern(/^guest-access:[0-9a-f]{64}$/u),
  Schema.brand("GuestAccessGrant"),
);
export type GuestAccessGrant = typeof GuestAccessGrantSchema.Type;
export type GuestAccessGrantFactory = () => GuestAccessGrant;

export const GuestAccessGrantDigestSchema = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{64}$/u),
  Schema.brand("GuestAccessGrantDigest"),
);
export type GuestAccessGrantDigest = typeof GuestAccessGrantDigestSchema.Type;

const PlaySessionRateLimitKeyDigestSchema = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{64}$/u),
  Schema.brand("PlaySessionRateLimitKeyDigest"),
);
export type PlaySessionRateLimitKeyDigest =
  typeof PlaySessionRateLimitKeyDigestSchema.Type;

export const PrincipalIdSchema = Schema.Trimmed.check(Schema.isNonEmpty()).pipe(
  Schema.check(Schema.isMaxLength(512)),
  Schema.brand("PrincipalId"),
);
export type PrincipalId = typeof PrincipalIdSchema.Type;

export const EpochMillisecondsSchema = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
).pipe(Schema.brand("EpochMilliseconds"));
export type EpochMilliseconds = typeof EpochMillisecondsSchema.Type;

export const decodeEpochMilliseconds = Schema.decodeUnknownResult(
  EpochMillisecondsSchema,
);

export function currentEpochMilliseconds(): EpochMilliseconds {
  return Schema.decodeUnknownSync(EpochMillisecondsSchema)(Date.now());
}

export type PlaySessionCaller =
  | { readonly tag: "anonymous" }
  | { readonly tag: "guest"; readonly guestAccessGrant: GuestAccessGrant }
  | { readonly tag: "authenticated"; readonly principalId: PrincipalId };

export type StoredPlaySessionTenure =
  | {
      readonly tag: "guest";
      readonly guestAccessGrantDigest: GuestAccessGrantDigest;
      readonly lastActivityAtMs: EpochMilliseconds;
    }
  | {
      readonly tag: "saved";
      readonly principalId: PrincipalId;
      readonly lastActivityAtMs: EpochMilliseconds;
    };

export type PlaySessionTenureProjection =
  | {
      readonly tag: "guest";
      readonly persistence: "temporary";
      readonly inactiveExpiresAt: string;
      readonly pressureCleanupEligibleAt: string;
    }
  | {
      readonly tag: "saved";
      readonly persistence: "saved";
      readonly inactiveExpiresAt: string;
      readonly deletionAvailable: true;
    };

export type GuestPlaySessionCreationAccess = {
  readonly tag: "guest";
  readonly guestAccessGrant: GuestAccessGrant;
};

export const GUEST_PLAY_SESSION_GUIDANCE =
  "This Play Session is temporary and is not saved to an account. Keep its guest access grant private. Sign in and use save_play_session to retain it as a saved session.";
export const GUEST_ONLY_PLAY_SESSION_GUIDANCE =
  "This Play Session is temporary and is not saved to an account. Keep its guest access grant private. Saving is not available on this server.";

export function generatedGuestAccessGrant(): GuestAccessGrant {
  const decoded = Schema.decodeUnknownResult(GuestAccessGrantSchema)(
    `guest-access:${randomBytes(32).toString("hex")}`,
  );
  if (Result.isFailure(decoded)) {
    throw new Error("Generated Guest Play Session access grant was invalid.");
  }
  return decoded.success;
}

export function decodeGuestAccessGrant(
  input: unknown,
): Result.Result<GuestAccessGrant, string> {
  return Result.mapError(
    Schema.decodeUnknownResult(GuestAccessGrantSchema)(input),
    (issue) => issue.message,
  );
}

export function decodePrincipalId(
  input: unknown,
): Result.Result<PrincipalId, string> {
  return Result.mapError(
    Schema.decodeUnknownResult(PrincipalIdSchema)(input),
    (issue) => issue.message,
  );
}

export function guestAccessGrantDigest(
  grant: GuestAccessGrant,
): GuestAccessGrantDigest {
  return Schema.decodeUnknownSync(GuestAccessGrantDigestSchema)(
    createHash("sha256").update(grant).digest("hex"),
  );
}

export function guestAccessGrantMatchesDigest(
  grant: GuestAccessGrant,
  expectedDigest: GuestAccessGrantDigest,
): boolean {
  const actual = Buffer.from(guestAccessGrantDigest(grant), "hex");
  const expected = Buffer.from(expectedDigest, "hex");
  return (
    actual.byteLength === expected.byteLength &&
    timingSafeEqual(actual, expected)
  );
}

export function playSessionRateLimitKeyDigest(
  tenure: StoredPlaySessionTenure,
): PlaySessionRateLimitKeyDigest {
  const accessIdentity =
    tenure.tag === "guest"
      ? `guest:${tenure.guestAccessGrantDigest}`
      : `principal:${tenure.principalId}`;
  return Schema.decodeUnknownSync(PlaySessionRateLimitKeyDigestSchema)(
    createHash("sha256").update(accessIdentity).digest("hex"),
  );
}

export function projectPlaySessionTenure(
  tenure: Extract<StoredPlaySessionTenure, { tag: "guest" }>,
): Extract<PlaySessionTenureProjection, { tag: "guest" }>;
export function projectPlaySessionTenure(
  tenure: Extract<StoredPlaySessionTenure, { tag: "saved" }>,
): Extract<PlaySessionTenureProjection, { tag: "saved" }>;
export function projectPlaySessionTenure(
  tenure: StoredPlaySessionTenure,
): PlaySessionTenureProjection;
export function projectPlaySessionTenure(
  tenure: StoredPlaySessionTenure,
): PlaySessionTenureProjection {
  return tenure.tag === "guest"
    ? {
        tag: "guest",
        persistence: "temporary",
        inactiveExpiresAt: new Date(
          tenure.lastActivityAtMs + GUEST_INACTIVITY_RETENTION_MS,
        ).toISOString(),
        pressureCleanupEligibleAt: new Date(
          tenure.lastActivityAtMs + GUEST_PRESSURE_PROTECTION_MS,
        ).toISOString(),
      }
    : {
        tag: "saved",
        persistence: "saved",
        inactiveExpiresAt: new Date(
          tenure.lastActivityAtMs + SAVED_INACTIVITY_RETENTION_MS,
        ).toISOString(),
        deletionAvailable: true,
      };
}

export function playSessionIsExpired(
  tenure: StoredPlaySessionTenure,
  nowMs: EpochMilliseconds,
): boolean {
  const retention =
    tenure.tag === "guest"
      ? GUEST_INACTIVITY_RETENTION_MS
      : SAVED_INACTIVITY_RETENTION_MS;
  return nowMs >= tenure.lastActivityAtMs + retention;
}
