import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  CAPABILITY_PROJECTION_SCHEMA_VERSION,
  CAPABILITY_CONTEXT_MAX_BYTES,
  CAPABILITY_ROLES,
  CANONICAL_CAPABILITY_PROJECTION,
  CapabilityProjectionSchema,
  capabilityContextForRole,
  capabilityProjectionFor,
  parseCapabilityRole,
} from "./capability-projection.ts";

describe("Raw Swarm capability projection", () => {
  test("is one versioned projection that validates at its boundary", () => {
    const decoded = Schema.decodeUnknownResult(CapabilityProjectionSchema, {
      onExcessProperty: "error",
    })(CANONICAL_CAPABILITY_PROJECTION);
    expect(Result.isSuccess(decoded)).toBe(true);
    expect(CANONICAL_CAPABILITY_PROJECTION.schemaVersion).toBe(
      CAPABILITY_PROJECTION_SCHEMA_VERSION,
    );
    expect(
      new Set(CANONICAL_CAPABILITY_PROJECTION.capabilities.map(({ id }) => id))
        .size,
    ).toBe(CANONICAL_CAPABILITY_PROJECTION.capabilities.length);
  });

  test("projects only the operations and boundaries owned by a role", () => {
    const player = capabilityProjectionFor("player");
    const character = capabilityProjectionFor("characterAuthoring");
    expect(player.capabilities.map(({ operation }) => operation)).toEqual([
      "discoverBattleActs",
      "scenarioRelation",
      "resolveBattleRuntimeSubject",
      "resolveScenarioMovement",
      "resolveBattleRuntimeInterrupt",
      "endBattleRuntimeTurn",
    ]);
    expect(character.capabilities.map(({ operation }) => operation)).toEqual([
      "createCharacterDraft",
      "discoverCreationHoles",
      "fillCreationHoles",
      "finalizeCharacterDraft",
      "createFreshCharacterSheet",
    ]);
    expect(
      player.capabilities.some(({ operation }) =>
        character.capabilities.some(
          (candidate) => candidate.operation === operation,
        ),
      ),
    ).toBe(false);
  });

  test("rejects unknown or cross-owner operations at the projection boundary", () => {
    const characterCapability =
      CANONICAL_CAPABILITY_PROJECTION.capabilities.find(
        ({ operation }) => operation === "createCharacterDraft",
      );
    expect(characterCapability).toBeDefined();
    if (characterCapability === undefined) return;
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(CapabilityProjectionSchema, {
          onExcessProperty: "error",
        })({
          ...CANONICAL_CAPABILITY_PROJECTION,
          capabilities: [{ ...characterCapability, roles: ["player"] }],
        }),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(CapabilityProjectionSchema, {
          onExcessProperty: "error",
        })({
          ...CANONICAL_CAPABILITY_PROJECTION,
          capabilities: [
            { ...characterCapability, operation: "not-a-public-operation" },
          ],
        }),
      ),
    ).toBe(true);
  });

  test("renders bounded role context without declaration or document bundles", () => {
    for (const role of CAPABILITY_ROLES) {
      const context = capabilityContextForRole(role);
      expect(Buffer.byteLength(context, "utf8")).toBeLessThanOrEqual(
        CAPABILITY_CONTEXT_MAX_BYTES,
      );
      expect(context).toContain(
        `Raw Swarm capability projection v${String(CAPABILITY_PROJECTION_SCHEMA_VERSION)}`,
      );
      expect(context).not.toContain("SCENARIO_CHARACTERS.md");
      expect(context).not.toContain("README.md");
      expect(context).not.toContain(".d.ts");
      expect(context).not.toContain("declarations/");
    }
    for (const role of ["generation", "review"] as const) {
      const context = capabilityContextForRole(role);
      expect(context).toContain("public setup SDK initializes");
      expect(context).toContain("public player SDK discovers Battle acts");
      expect(context).toContain("one exclusive spatial boundary");
      expect(context).toContain("not a reusable conditional terrain rule");
      expect(context).toContain("becomes stale");
      expect(context).toContain("do not create hypothetical spatial branches");
    }
  });

  test("makes resolved monster HP distinct from the absent Table choice workflow", () => {
    const mechanicalBoundary =
      "battleCreatureInitFromStatBlock accepts a resolved currentHp and typed initial conditions, but the public SDK does not surface the Table's fixed-vs-rolled monster Hit Points selection or roll workflow";
    const revisionPolicy =
      "For supportedOnly generation and review, a Candidate requiring an absent public-SDK operation must be classified as unsupported and needsRevision, never marked ready";
    for (const role of ["generation", "review"] as const) {
      const context = capabilityContextForRole(role);
      expect(context).toContain(mechanicalBoundary);
      expect(context).toContain(revisionPolicy);
    }
    const setupContext = capabilityContextForRole("setupAuthoring");
    expect(setupContext).toContain(mechanicalBoundary);
    expect(setupContext).not.toContain(revisionPolicy);
    expect(setupContext.split(mechanicalBoundary)).toHaveLength(2);
  });

  test("makes cross-authority numeric contradictions a review revision", () => {
    for (const role of ["generation", "review"] as const) {
      const context = capabilityContextForRole(role);
      expect(context).toContain(
        "reconcile every concrete quantity or count, coordinate or position, derived distance or range",
      );
      expect(context).toContain(
        "across Candidate prose, typed stage facts, and catalogue-comparison evidence",
      );
      expect(context).toContain(
        "Contradictions or unresolved mismatches are needsRevision findings",
      );
      expect(context).toContain("must never be silently repaired");
    }
  });

  test("rejects an unrecognized role instead of widening the projection", () => {
    expect(Result.isFailure(parseCapabilityRole("reviewer"))).toBe(true);
    expect(Result.isSuccess(parseCapabilityRole("review"))).toBe(true);
  });
});
