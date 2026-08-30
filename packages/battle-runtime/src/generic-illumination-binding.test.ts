import { describe, expect, test } from "vitest";
import type { SpellRecord } from "@dnd/surface/surface/types";

import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleFrontierInterruptDecisionForState,
  characterSpellInvocationRefForProcedureRefForTest,
} from "./battle-runtime.test-support.ts";
import {
  faerieFireUnitId,
  shiningSmiteUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  interruptDecisionFill,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  battleObjectId,
  elapsedTimeTicks,
  movementFeet,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
} from "./unit-profile-admission.test-support.ts";

const syntheticOutlineSpellId = "synthetic_outline_beacon";
const syntheticAfterHitSpellId = "synthetic_after_hit_beacon";

describe("generic illumination procedure bindings", () => {
  test("a synthetic outline spell projects its admitted Dim Light radius for combatants and objects", () => {
    const spell = syntheticOutlineSpell();
    const objectId = battleObjectId("synthetic-outline-object");
    const session = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({ session, spellId: syntheticOutlineSpellId });
    const savingThrows = requireHole(act.initialHoles, "savingThrowOutcome");
    const savingThrowFill = savingThrowOutcomeFill(savingThrows, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const result = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        {
          ...savingThrowFill,
          value: {
            ...savingThrowFill.value,
            area: {
              kind: "saveGatedTargetProjectionArea",
              originAnchorId: spellCasterId,
              affectedTargetIds: [spellTargetId],
              affectedObjectIds: [objectId],
            },
          },
        },
      ],
    });
    if (result.tag !== "resolved") {
      throw new Error("Expected the synthetic outline spell to resolve.");
    }

    expect(result.snapshot.lightEmitters).toEqual([
      {
        kind: "spellLightEmitter",
        sourceProcedureRef: act.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        attachment: { kind: "combatant", combatantId: spellTargetId },
        emission: { kind: "dim", radiusFeet: movementFeet(17) },
        opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      },
      {
        kind: "spellLightEmitter",
        sourceProcedureRef: act.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        attachment: { kind: "object", objectId },
        emission: { kind: "dim", radiusFeet: movementFeet(17) },
        opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      },
    ]);
  });

  test("a synthetic after-hit spell projects its admitted Bright and Dim Light radii", () => {
    const spell = syntheticAfterHitSpell();
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      targetHp: 30,
      targetMaxHp: 30,
    });
    const subject = weaponAttackSubject(session, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: session.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
    const roll = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingInterrupt = resolveBattleSubject({
      state: session.state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingInterrupt.tag !== "needsHoles") {
      throw new Error("Expected an after-hit interrupt window.");
    }
    const choice = battleFrontierInterruptDecisionForState(
      awaitingInterrupt.state,
    )?.choices.find((candidate) => {
      if (candidate.kind !== "castAttackHitBonusActionSpell") return false;
      return (
        characterSpellInvocationRefForProcedureRefForTest(
          battleRuntimeSessionForTest({
            ...session,
            state: awaitingInterrupt.state,
          }),
          candidate.reactorId,
          candidate.subject.procedureRef,
        ).spellId === syntheticAfterHitSpellId
      );
    });
    if (choice?.kind !== "castAttackHitBonusActionSpell") {
      throw new Error("Expected the synthetic after-hit spell choice.");
    }
    const afterSpell = resolveBattleInterrupt({
      state: awaitingInterrupt.state,
      fill: interruptDecisionFill(
        requireHole(awaitingInterrupt.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [],
          },
        },
      ),
    });
    if (afterSpell.tag !== "needsHoles") {
      throw new Error("Expected the host attack damage hole.");
    }
    const damage = requireHole(afterSpell.holes, "rolledDice");
    const resolved = resolveBattleSubject({
      state: afterSpell.state,
      subject,
      fills: [
        targetFill,
        rollFill,
        damageRollFillWithGroups(damage, [[4], [2, 3]]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected the synthetic after-hit spell to resolve.");
    }

    expect(snapshotBattle(resolved.state).lightEmitters).toEqual([
      {
        kind: "spellLightEmitter",
        sourceProcedureRef: choice.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        attachment: { kind: "combatant", combatantId: spellTargetId },
        emission: {
          kind: "brightAndDim",
          brightRadiusFeet: movementFeet(9),
          dimAdditionalFeet: movementFeet(4),
        },
        opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(10),
        },
      },
    ]);
  });
});

function syntheticOutlineSpell(): SpellRecord {
  const base = spellRecord(faerieFireUnitId);
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected an activation spell fixture.");
  }
  const phase = base.mechanics.phases[0];
  if (phase?.kind !== "save_gate" || phase.onFail.kind !== "composite") {
    throw new Error("Expected a composite save-gate fixture.");
  }
  return decodeSpellRecordForTest({
    ...base,
    id: syntheticOutlineSpellId,
    name: "Synthetic Outline Beacon",
    provenance: {
      kind: "synthetic-test",
      section: "battle-runtime/generic-outline-illumination",
    },
    mechanics: {
      ...base.mechanics,
      phases: [
        {
          ...phase,
          onFail: {
            ...phase.onFail,
            effects: phase.onFail.effects.map((effect) =>
              effect.kind === "emit_light"
                ? {
                    ...effect,
                    brightRadiusFeet: 0,
                    dimAdditionalFeet: 17,
                  }
                : effect,
            ),
          },
        },
      ],
    },
  });
}

function syntheticAfterHitSpell(): SpellRecord {
  const base = spellRecord(shiningSmiteUnitId);
  if (base.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected an ongoing-effect spell fixture.");
  }
  return decodeSpellRecordForTest({
    ...base,
    id: syntheticAfterHitSpellId,
    name: "Synthetic After-Hit Beacon",
    provenance: {
      kind: "synthetic-test",
      section: "battle-runtime/generic-after-hit-illumination",
    },
    mechanics: {
      ...base.mechanics,
      operations: base.mechanics.operations.map((operation) =>
        operation.effect.kind === "emit_light"
          ? {
              ...operation,
              effect: {
                ...operation.effect,
                brightRadiusFeet: 9,
                dimAdditionalFeet: 4,
              },
            }
          : operation,
      ),
    },
  });
}
