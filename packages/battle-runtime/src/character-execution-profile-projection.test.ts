import { describe, expect, test } from "vitest";
import * as Either from "effect/Either";
import { CLASS_NAMES } from "@dnd/shared/game-facts";
import { NonNegativeInteger, classLevel } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import {
  unitFeatureProcedureExecution,
  unitSupportProcedureExecution,
} from "./character-execution-admission.ts";
import {
  battleUnitSupportProfilesForUnit,
  parseSupportedUnitFeatureProfile,
} from "./unit-feature-support.ts";
import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
  battleResourcePoolExecutionRef,
  combatantId,
} from "./identity.ts";

const catalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (catalogResult.tag !== "ok") {
  throw new Error("Character execution projection test catalog must build.");
}

const units = catalogResult.catalog.listUnits();
const classLevels = CLASS_NAMES.map((className) => ({
  className,
  level: classLevel(20),
}));
const scopeRef = battleCharacterExecutionScopeRef(
  battleId("character-execution-profile-projection"),
  combatantId("profile-projection-character"),
  battleExecutionScopeOrdinal(0),
);
const resourcePoolRef = battleResourcePoolExecutionRef(
  scopeRef,
  NonNegativeInteger(0),
);
const procedureRef = battleProcedureExecutionRef(
  scopeRef,
  NonNegativeInteger(0),
);
const resourcePoolRefsByUnitId = new Map(
  units.map((unit) => [unit.id, resourcePoolRef] as const),
);
const procedureRefsByUnitId = new Map(
  units.map((unit) => [unit.id, procedureRef] as const),
);
const sourceFacts = { draconicAncestryDamageType: "acid" } as const;

describe("character execution profile projection", () => {
  test("projects every admitted SRD Unit feature into execution facts", () => {
    const projectedKinds = new Set<string>();
    const supportOwnedKinds = new Set<string>();

    for (const unit of units) {
      const profile = parseSupportedUnitFeatureProfile(
        unit,
        classLevels,
        sourceFacts,
      );
      if (profile === null) continue;

      const execution = unitFeatureProcedureExecution(profile, {
        resourcePoolRefsByUnitId,
      });
      if (execution === undefined) {
        supportOwnedKinds.add(profile.kind);
        continue;
      }
      expect(execution, `${unit.id}:${profile.kind}`).toBeDefined();
      expect(execution.kind).toBe(profile.kind);
      projectedKinds.add(execution.kind);
    }

    expect(projectedKinds.size).toBeGreaterThan(20);
    expect(supportOwnedKinds).toEqual(
      new Set(["cunningStrike", "cunningStrikeOptionGrant"]),
    );
  });

  test("projects every admitted SRD Unit support profile into execution facts", () => {
    const projectedKinds = new Set<string>();

    for (const unit of units) {
      const profiles = battleUnitSupportProfilesForUnit({
        unit,
        classLevels,
        sourceFacts,
      });
      if (Either.isLeft(profiles)) continue;

      for (const profile of profiles.right) {
        const execution = unitSupportProcedureExecution(profile, {
          resourcePoolRefsByUnitId,
          unitFeatureProcedureRefsByUnitId: procedureRefsByUnitId,
          supportProcedureRefsByUnitId: procedureRefsByUnitId,
        });
        const profileKind =
          typeof profile === "string" ? profile : profile.kind;
        expect(execution, `${unit.id}:${profileKind}`).toBeDefined();
        if (execution !== undefined) {
          const executionKind =
            typeof execution === "string" ? execution : execution.kind;
          expect(executionKind).toBe(profileKind);
          projectedKinds.add(executionKind);
        }
      }
    }

    expect(projectedKinds.size).toBeGreaterThan(20);
  });
});
