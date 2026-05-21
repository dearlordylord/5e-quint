// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-ANTIMAGIC-FIELD-TRACKED-LIGHT-SUPPRESSION antimagic_field
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-antimagic-field-tracked-light-suppression
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import {
  antimagicFieldUnitId,
  continualFlameUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleAreaId,
  battleObjectId,
  breakBattleConcentration,
  endTurn,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  type BattleAntimagicFieldAffectedOngoingSpellLight,
  type BattleFill,
  type BattleHole,
  type BattleLightEmitter,
  type BattleState,
  type BattleTrackedOngoingSpellLightEmitter,
} from "./index.ts";

const antimagicFieldAreaId = battleAreaId("unit-profile-antimagic-field-area");

describe("SRD Antimagic Field tracked spell-light suppression admission", () => {
  test("antimagic field is admitted as a level-8 self Emanation suppression spell", () => {
    const state = antimagicFieldBattle();

    const act = spellAct({
      state,
      spellId: antimagicFieldUnitId,
      slotLevel: 8,
    });

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          tag: "actionSpell",
          actorId: spellCasterId,
          invocation: spellSlotInvocationRef(
            antimagicFieldUnitId,
            8,
            "antimagicFieldOngoingSpellSuppression",
          ),
          mode: { tag: "cast" },
        },
        initialHoles: [
          expect.objectContaining({
            kind: "spellAreaChoice",
            area: {
              kind: "selfOriginEmanation",
              radiusFeet: movementFeet(10),
            },
          }),
        ],
      }),
    );
  });

  test("suppresses ordinary tracked spell light without deleting the occurrence", () => {
    const continualFlameEffectId = battleSpellEffectOccurrenceId(
      "unit-profile-antimagic-continual-flame-effect",
    );
    const artifactEffectId = battleSpellEffectOccurrenceId(
      "unit-profile-antimagic-artifact-light-effect",
    );
    const ordinaryLight = trackedObjectSpellLightEmitter({
      sourceSpellId: continualFlameUnitId,
      sourceEffectId: continualFlameEffectId,
      sourceSpellLevel: 2,
      objectId: "unit-profile-antimagic-continual-flame-object",
    });
    const artifactLight = trackedObjectSpellLightEmitter({
      sourceSpellId: "synthetic_artifact_light",
      sourceEffectId: artifactEffectId,
      sourceSpellLevel: 2,
      objectId: "unit-profile-antimagic-artifact-light-object",
    });
    const state = antimagicFieldBattle({
      lightEmitters: [ordinaryLight, artifactLight],
    });

    const resolved = castAntimagicField(state, [
      antimagicAffectedLight(continualFlameEffectId, "ordinarySpell"),
      antimagicAffectedLight(artifactEffectId, "artifact"),
    ]);

    expect(resolved.state.lightEmitters).toEqual([ordinaryLight, artifactLight]);
    expect(resolved.snapshot.lightEmitters).toEqual([artifactLight]);
    expect(
      resolved.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual({
      kind: "antimagicFieldOngoingSpellSuppression",
      sourceSpellId: antimagicFieldUnitId,
      sourceCombatantId: spellCasterId,
      areaId: antimagicFieldAreaId,
      radiusFeet: movementFeet(10),
      suppressedSpellLightEffectIds: [continualFlameEffectId],
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: elapsedTimeTicks(600),
      },
    });

    const restored = breakBattleConcentration(resolved.state, spellCasterId);
    expect(snapshotBattle(restored).lightEmitters).toEqual([
      ordinaryLight,
      artifactLight,
    ]);
  });

  test("suppressed duration-based spell light still expires while suppressed", () => {
    const sourceEffectId = battleSpellEffectOccurrenceId(
      "unit-profile-antimagic-duration-light-effect",
    );
    const durationLight = trackedObjectSpellLightEmitter({
      sourceSpellId: "synthetic_duration_light",
      sourceEffectId,
      sourceSpellLevel: 1,
      objectId: "unit-profile-antimagic-duration-light-object",
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(1) },
    });
    const state = antimagicFieldBattle({ lightEmitters: [durationLight] });
    const suppressed = castAntimagicField(state, [
      antimagicAffectedLight(sourceEffectId, "ordinarySpell"),
    ]);

    expect(suppressed.state.lightEmitters).toEqual([durationLight]);
    expect(suppressed.snapshot.lightEmitters).toEqual([]);

    const targetTurn = endTurn({
      state: suppressed.state,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(casterTurn.tag).toBe("resolved");
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected caster turn.");
    }

    expect(casterTurn.state.lightEmitters).toEqual([]);
  });
});

function antimagicFieldBattle(input?: {
  readonly lightEmitters?: readonly BattleLightEmitter[];
}): BattleState {
  return {
    ...spellBattle({
      preparedSpells: [spellRecord(antimagicFieldUnitId)],
      spellSlots: [{ spellLevel: 8, count: 1 }],
    }),
    lightEmitters: input?.lightEmitters ?? [],
  };
}

function castAntimagicField(
  state: BattleState,
  affectedOngoingSpellLights: readonly BattleAntimagicFieldAffectedOngoingSpellLight[],
): Extract<ReturnType<typeof resolveBattleSubject>, { readonly tag: "resolved" }> {
  const act = spellAct({
    state,
    spellId: antimagicFieldUnitId,
    slotLevel: 8,
  });
  const areaHole = requireHole(act.initialHoles, "spellAreaChoice");
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      antimagicFieldAreaFill({
        hole: areaHole,
        affectedOngoingSpellLights,
      }),
    ],
  });
  expect(resolved.tag).toBe("resolved");
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Antimagic Field to resolve.");
  }
  return resolved;
}

function antimagicFieldAreaFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "spellAreaChoice" }>;
  readonly affectedOngoingSpellLights: readonly BattleAntimagicFieldAffectedOngoingSpellLight[];
}): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: input.hole.holeId,
    value: {
      kind: "antimagicFieldSelfEmanation",
      areaId: antimagicFieldAreaId,
      affectedOngoingSpellLights: input.affectedOngoingSpellLights,
    },
  };
}

function antimagicAffectedLight(
  sourceEffectId: ReturnType<typeof battleSpellEffectOccurrenceId>,
  sourceKind: BattleAntimagicFieldAffectedOngoingSpellLight["sourceKind"],
): BattleAntimagicFieldAffectedOngoingSpellLight {
  return {
    kind: "antimagicFieldAffectedOngoingSpellLight",
    sourceEffectId,
    sourceKind,
  };
}

function trackedObjectSpellLightEmitter(input: {
  readonly sourceSpellId: string;
  readonly sourceEffectId: ReturnType<typeof battleSpellEffectOccurrenceId>;
  readonly sourceSpellLevel: number;
  readonly objectId: string;
  readonly expiresAt?: BattleTrackedOngoingSpellLightEmitter["expiresAt"];
}): BattleTrackedOngoingSpellLightEmitter {
  const sourceSpellLevel = parseBattleSpellEffectLevel(input.sourceSpellLevel);
  if (sourceSpellLevel === null) {
    throw new Error(`Invalid spell effect level ${input.sourceSpellLevel}.`);
  }
  return {
    kind: "spellLightEmitter",
    sourceSpellId: input.sourceSpellId,
    sourceCombatantId: spellCasterId,
    sourceEffectId: input.sourceEffectId,
    sourceSpellLevel,
    attachment: {
      kind: "object",
      objectId: battleObjectId(input.objectId),
    },
    emission: {
      kind: "brightAndDim",
      brightRadiusFeet: movementFeet(20),
      dimAdditionalFeet: movementFeet(20),
    },
    opaqueCoverInteraction: { kind: "blocksEmission" },
    expiresAt: input.expiresAt ?? { kind: "untilDispelled" },
  };
}
