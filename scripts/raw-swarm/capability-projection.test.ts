import { Either, Schema } from "effect";
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
    const decoded = Schema.decodeUnknownEither(CapabilityProjectionSchema, {
      onExcessProperty: "error",
    })(CANONICAL_CAPABILITY_PROJECTION);
    expect(Either.isRight(decoded)).toBe(true);
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
      Either.isLeft(
        Schema.decodeUnknownEither(CapabilityProjectionSchema, {
          onExcessProperty: "error",
        })({
          ...CANONICAL_CAPABILITY_PROJECTION,
          capabilities: [{ ...characterCapability, roles: ["player"] }],
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(CapabilityProjectionSchema, {
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
  });

  test("rejects an unrecognized role instead of widening the projection", () => {
    expect(Either.isLeft(parseCapabilityRole("reviewer"))).toBe(true);
    expect(Either.isRight(parseCapabilityRole("review"))).toBe(true);
  });
});
