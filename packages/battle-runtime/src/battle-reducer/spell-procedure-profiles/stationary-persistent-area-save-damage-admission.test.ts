import { unitId } from "@dnd/shared/game-facts";
import { PositiveInteger } from "@dnd/shared/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { describe, expect, test } from "vitest";

import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
} from "../../battle-state-execution.ts";
import { spellAdmissionContextFor } from "./admission-context.ts";
import { projectSpellDefinitionRuleFacts } from "../../procedure-admission/spell-definition-rule-facts.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import { spellCasterId } from "../../unit-profile-admission-catalog.test-support.ts";
import { stationaryPersistentAreaSaveDamageProfile } from "./stationary-persistent-area-save-damage.ts";
import type { SpellMechanicsAdmissionSource } from "./spell-mechanics-admission.ts";

function mechanicsSource(
  source: BattleSpellAdmissionSource,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function coordinate(path: UnitMechanicsPath): string {
  return path.nodes
    .map((node) =>
      node.kind === "singleton" ? node.role : `${node.role}:${node.ordinal}`,
    )
    .join("/");
}

describe("stationary persistent-area static admission", () => {
  test("projects Insect Plague with exact partial-root branch evidence", () => {
    const source = spellAdmissionSource(spellRecord("insect_plague"));
    const result = stationaryPersistentAreaSaveDamageProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;

    expect(result.admitted.evidence.consumed.map(coordinate)).toEqual([
      "recordMechanics/generalFact:1",
      "recordMechanics/generalFact:2",
      "recordMechanics/generalFact:3",
      "recordMechanics/generalFact:4",
      "recordMechanics/generalFact:5",
      "recordMechanics/generalFact:6",
      "recordMechanics/generalFact:7",
      "recordMechanics/generalFact:5/generalFact:1",
      "recordMechanics/effect:1",
      "recordMechanics/action",
      "recordMechanics/procedure:1/effect:1",
      "recordMechanics/procedure:2/effect:1",
      "recordMechanics/procedure:3/effect:1",
    ]);
    expect(result.admitted.evidence.unowned.map(coordinate)).toEqual([
      "recordMechanics/procedure:1",
      "recordMechanics/procedure:2",
      "recordMechanics/procedure:3",
    ]);
  });

  test("keeps the admitted closure mechanics-free at contextual admission", () => {
    const spell = spellRecord("insect_plague");
    const source = spellAdmissionSource(spell);
    const result = stationaryPersistentAreaSaveDamageProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;

    const session = spellBattle({
      spellSlots: [{ spellLevel: 5, count: 1 }],
    });
    const actor = session.state.combatants.get(spellCasterId);
    if (actor === undefined) {
      throw new Error(
        "Expected the spell-admission caster in the test battle.",
      );
    }
    const context = spellAdmissionContextFor(actor, session.state);
    if (context === null) {
      throw new Error(
        "Expected a spell-admission context for the test caster.",
      );
    }

    const [invocation] = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      { ...context, castingSource: source.castingSource },
    );
    expect(invocation).toMatchObject({
      procedure: "persistentAreaSaveDamage",
      lifecycle: { kind: "stationary" },
      resource: { tag: "spellSlot", slotLevel: 5 },
      durationTicks: 100,
      rangeFeet: 300,
      targeting: { kind: "pointOriginSphere", radiusFeet: 20 },
      damage: { expr: { dice: 4, dieSize: 10 }, damageType: "piercing" },
    });
    expect(invocation?.spell).not.toHaveProperty("mechanics");
  });

  test("keeps renamed authored records statically equivalent", () => {
    const original = spellAdmissionSource(spellRecord("insect_plague"));
    const renamed = {
      ...original,
      id: unitId("synthetic_renamed_stationary_area"),
      name: "Synthetic Swarm Hazard",
    };
    const originalResult =
      stationaryPersistentAreaSaveDamageProfile.admitMechanics(
        mechanicsSource(original),
      );
    const renamedResult =
      stationaryPersistentAreaSaveDamageProfile.admitMechanics(
        mechanicsSource(renamed),
      );

    expect(originalResult.tag).toBe("supported");
    expect(renamedResult.tag).toBe("supported");
    if (originalResult.tag !== "supported") return;
    if (renamedResult.tag !== "supported") return;
    expect(renamedResult.admitted.facts).toEqual(originalResult.admitted.facts);
    expect(renamedResult.admitted.evidence).toEqual(
      originalResult.admitted.evidence,
    );
  });

  test("does not represent unrelated activation or translating area mechanics", () => {
    const activation = spellAdmissionSource(spellRecord("fire_bolt"));
    const translating = spellAdmissionSource(spellRecord("cloudkill"));

    expect(
      stationaryPersistentAreaSaveDamageProfile.admitMechanics(
        mechanicsSource(activation),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      stationaryPersistentAreaSaveDamageProfile.admitMechanics(
        mechanicsSource(translating),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test("accumulates represented failures with exact branch paths", () => {
    const source = spellAdmissionSource(spellRecord("insect_plague"));
    if (source.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Insect Plague ongoing mechanics.");
    }
    const [passiveOperation, ...remainingOperations] =
      source.mechanics.operations;
    if (passiveOperation === undefined) {
      throw new Error("Expected Insect Plague operations.");
    }
    const unsupportedMechanics = {
      ...source.mechanics,
      castingTime: { kind: "bonus_action" as const },
      range: { kind: "point" as const, feet: 120 },
      duration: {
        kind: "concentration" as const,
        upTo: { amount: 1, unit: "minute" as const },
      },
      attachment: {
        ...source.mechanics.attachment,
        value: {
          ...source.mechanics.attachment.value,
          shape: { kind: "sphere" as const, radiusFeet: 10 },
        },
      },
      operations: [
        {
          ...passiveOperation,
          effect: { kind: "area_is_lightly_obscured" as const },
        },
        ...remainingOperations,
      ],
    };
    const result = stationaryPersistentAreaSaveDamageProfile.admitMechanics({
      mechanics: unsupportedMechanics,
      spellDefinitionRuleFacts:
        projectSpellDefinitionRuleFacts(unsupportedMechanics),
    });

    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(
      result.issues.map((issue) => ({
        failedFact: issue.failedFact,
        mechanicsPath: coordinate(issue.mechanicsPath),
      })),
    ).toEqual([
      {
        failedFact: "castingTime",
        mechanicsPath: coordinate(spellMechanicsHeaderPath("castingTime")),
      },
      {
        failedFact: "range",
        mechanicsPath: coordinate(spellMechanicsHeaderPath("range")),
      },
      {
        failedFact: "duration",
        mechanicsPath: coordinate(spellDurationValuePath()),
      },
      {
        failedFact: "attachment",
        mechanicsPath: coordinate(spellOngoingAttachmentPath()),
      },
      {
        failedFact: "passiveOperation",
        mechanicsPath: coordinate(
          spellOngoingOperationEffectPath(PositiveInteger(1)),
        ),
      },
    ]);
  });

  test("reports the singleton initial phase branch when its save gate is absent", () => {
    const source = spellAdmissionSource(spellRecord("insect_plague"));
    if (source.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Insect Plague ongoing mechanics.");
    }
    const unsupportedMechanics = {
      ...source.mechanics,
      initialPhase: undefined,
    };
    const result = stationaryPersistentAreaSaveDamageProfile.admitMechanics({
      mechanics: unsupportedMechanics,
      spellDefinitionRuleFacts:
        projectSpellDefinitionRuleFacts(unsupportedMechanics),
    });

    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          failedFact: "initialSaveDamage",
          mechanicsPath: spellOngoingInitialPhasePath(),
        }),
        expect.objectContaining({
          failedFact: "oncePerTurnLimitGroup",
          mechanicsPath: spellOngoingInitialPhasePath(),
        }),
      ]),
    );
    expect(result.issues).toHaveLength(2);
  });

  test("uses operation branches without inventing dependency coordinates", () => {
    const source = spellAdmissionSource(spellRecord("insect_plague"));
    const result = stationaryPersistentAreaSaveDamageProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    const allPaths = [
      ...result.admitted.evidence.consumed,
      ...result.admitted.evidence.unowned,
    ].map(coordinate);
    expect(allPaths.some((path) => path.includes("dependency"))).toBe(false);
    expect(result.admitted.evidence.unowned).toEqual([
      spellOngoingOperationPath(PositiveInteger(1)),
      spellOngoingOperationPath(PositiveInteger(2)),
      spellOngoingOperationPath(PositiveInteger(3)),
    ]);
  });
});
