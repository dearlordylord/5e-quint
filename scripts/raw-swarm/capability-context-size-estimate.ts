import {
  CAPABILITY_CONTEXT_MAX_BYTES,
  CAPABILITY_ROLES,
  capabilityContextForRole,
  type CapabilityRole,
} from "./capability-projection.ts";

/** Source-derived size report for the bounded capability projection. */
export type CapabilityContextSizeEstimate = {
  readonly schemaVersion: 1;
  readonly source: "utf8-byte-measurement";
  readonly maxBytes: typeof CAPABILITY_CONTEXT_MAX_BYTES;
  readonly roles: readonly {
    readonly role: CapabilityRole;
    readonly bytes: number;
    readonly estimatedTokens: number;
  }[];
  readonly totalBytes: number;
  readonly estimatedTokens: number;
};

export function capabilityContextSizeEstimate(): CapabilityContextSizeEstimate {
  const roles = CAPABILITY_ROLES.map((role) => {
    const bytes = Buffer.byteLength(capabilityContextForRole(role), "utf8");
    return {
      role,
      bytes,
      estimatedTokens: Math.ceil(bytes / 4),
    };
  });
  return {
    schemaVersion: 1,
    source: "utf8-byte-measurement",
    maxBytes: CAPABILITY_CONTEXT_MAX_BYTES,
    roles,
    totalBytes: roles.reduce((total, { bytes }) => total + bytes, 0),
    estimatedTokens: roles.reduce(
      (total, { estimatedTokens }) => total + estimatedTokens,
      0,
    ),
  };
}
