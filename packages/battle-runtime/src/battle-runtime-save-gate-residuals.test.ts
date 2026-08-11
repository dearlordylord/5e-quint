import { describe, expect, test } from "vitest";
import { movementFeet, resourceCount, spellSlotLevel } from "@dnd/shared/types";
import type {
  ActivationPhase,
  SpellRecord,
  TargetSelection,
} from "@dnd/surface/surface/types";
import type { SpellTargeting } from "./procedure-execution/spell-invocation-vocabulary.ts";
import { combatantId } from "./identity.ts";
import { unitLibrary } from "./unit-profile-admission-catalog.test-support.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  areaSaveGateSpellRangeFeet,
  hasSaveGateRepeatSaves,
  isViciousMockeryNextAttackRiderShape,
  oneAdditionalTargetPerSpellSlotAboveBaseLevel,
  saveGateTargeting,
  supportedCantripSaveGateDamageProfile,
  supportedFailedSavePostDamageRiders,
  supportedPreparedAbilityD20TestRollModeSaveGateProfile,
  supportedPreparedSaveGateAttackRollAdvantageProfile,
  supportedPreparedSaveGateConditionImmunityProfile,
  supportedPreparedSaveGateConditionProfile,
  supportedPreparedSaveGateDamageProfile,
  supportedSaveGateConditionSpell,
} from "./battle-reducer/spell-procedure-profiles/_save-gate-helpers.ts";

const spells = unitLibrary
  .listUnits()
  .filter((unit): unit is SpellRecord => unit.kind === "spell");

function activationSaveGatePhase(
  spell: SpellRecord,
): Extract<ActivationPhase, { readonly kind: "save_gate" }> | undefined {
  if (spell.mechanics.family !== "activation") {
    return undefined;
  }
  const phase = spell.mechanics.phases[0];
  return phase?.kind === "save_gate" ? phase : undefined;
}

function targetSelections(spell: SpellRecord): readonly TargetSelection[] {
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  return spell.mechanics.phases.flatMap((phase) => {
    if (phase.kind === "save_gate" || phase.kind === "direct") {
      const attachment = phase.attachment;
      const value = attachment.kind === "hole" ? attachment.value : attachment;
      if (value.kind === "target") {
        return value.selection === undefined ? [] : [value.selection];
      }
      if (value.kind === "area") {
        return value.selection === undefined ? [] : [value.selection];
      }
    }
    return [];
  });
}

const areaTargetings: readonly Exclude<
  SpellTargeting,
  { readonly kind: "singleCombatant" | "singleCreatureOrObject" }
>[] = [
  { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
  {
    kind: "pointOriginSphereDiameter",
    diameterFeet: movementFeet(40),
  },
  {
    kind: "pointOriginCubeExcludingCaster",
    sideFeet: movementFeet(15),
  },
  { kind: "pointOriginCube", sideFeet: movementFeet(15) },
  { kind: "selfOriginCube", sideFeet: movementFeet(15) },
  { kind: "selfOriginCone", lengthFeet: movementFeet(60) },
  {
    kind: "selfOriginLine",
    lengthFeet: movementFeet(100),
    widthFeet: movementFeet(5),
  },
  {
    kind: "selfOriginEmanation",
    radiusFeet: movementFeet(15),
  },
  {
    kind: "primaryTargetOriginEmanation",
    radiusFeet: movementFeet(10),
  },
  {
    kind: "pointOriginCylinder",
    radiusFeet: movementFeet(10),
    heightFeet: movementFeet(20),
  },
  { kind: "targetList", minTargets: 1, maxTargets: 2 },
];

describe("save-gate residual profile coverage", () => {
  test("projects admitted catalog save gates and rejects unrelated selections", () => {
    const preparedSlot = spellSlotLevel(5);
    let saveGateCount = 0;
    let supportedDamageCount = 0;
    let supportedConditionCount = 0;
    const preparedSlotState = {
      spellLevel: preparedSlot,
      count: resourceCount(1),
      expended: resourceCount(0),
    } as const;

    for (const spell of spells) {
      const source = spellAdmissionSource(spell);
      const phase = activationSaveGatePhase(spell);
      hasSaveGateRepeatSaves(
        spell.mechanics.family === "activation"
          ? spell.mechanics.phases[0]
          : undefined,
      );

      for (const selection of targetSelections(spell)) {
        oneAdditionalTargetPerSpellSlotAboveBaseLevel(
          selection,
          spell.mechanics.level,
        );
      }

      const cantripDamage = supportedCantripSaveGateDamageProfile(source, 5);
      const preparedDamage = supportedPreparedSaveGateDamageProfile(source, [
        preparedSlotState,
      ]);
      supportedPreparedSaveGateConditionProfile(source, [preparedSlotState]);
      supportedPreparedSaveGateAttackRollAdvantageProfile(
        combatantId("save-gate-residual-caster"),
        source,
        [preparedSlotState],
      );
      supportedPreparedAbilityD20TestRollModeSaveGateProfile(
        combatantId("save-gate-residual-caster"),
        source,
        [preparedSlotState],
      );
      supportedPreparedSaveGateConditionImmunityProfile(
        combatantId("save-gate-residual-caster"),
        source,
        [preparedSlotState],
      );

      const condition = supportedSaveGateConditionSpell(source);
      if (condition !== null) {
        supportedConditionCount += 1;
      }
      if (cantripDamage.length > 0 || preparedDamage.length > 0) {
        supportedDamageCount += 1;
      }

      if (phase === undefined) {
        continue;
      }
      saveGateCount += 1;
      const targeting = saveGateTargeting(phase.attachment);
      if (targeting !== null && targeting.kind !== "singleCombatant") {
        areaSaveGateSpellRangeFeet(source.mechanics.range, targeting);
      }
      isViciousMockeryNextAttackRiderShape(source, phase);
      supportedFailedSavePostDamageRiders(
        source,
        phase,
        phase.onFail.kind === "composite" ? phase.onFail.effects : [],
      );
    }

    expect(saveGateCount).toBeGreaterThan(20);
    expect(supportedDamageCount).toBeGreaterThan(5);
    expect(supportedConditionCount).toBeGreaterThan(5);
  });

  test("area range projection carries both point and self-origin contracts", () => {
    const pointRange = spellRecord("fireball").mechanics.range;
    const selfRange = spellRecord("thunderwave").mechanics.range;
    for (const targeting of areaTargetings) {
      const pointResult = areaSaveGateSpellRangeFeet(pointRange, targeting);
      const selfResult = areaSaveGateSpellRangeFeet(selfRange, targeting);
      if (
        targeting.kind === "selfOriginCube" ||
        targeting.kind === "selfOriginCone" ||
        targeting.kind === "selfOriginLine" ||
        targeting.kind === "selfOriginEmanation"
      ) {
        expect(pointResult).toBeNull();
        expect(selfResult).toEqual(movementFeet(0));
      } else {
        expect(pointResult).not.toBeNull();
        expect(selfResult).toBeNull();
      }
    }
  });
});
