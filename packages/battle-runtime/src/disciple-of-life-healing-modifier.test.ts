// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.spell-slot-healing-modifier
import { describe, expect, test } from "vitest";

import { Hp } from "@dnd/shared/types";

import {
  damageRollFillWithGroups,
  type BattleState,
  type CombatantId,
} from "./battle-runtime-test-support.ts";
import {
  clericDiscipleOfLifeUnitId,
  cureWoundsUnitId,
  healingWordUnitId,
  massHealingTargetIds,
  massHealingWordUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  maybeSpellAct,
  spellAct,
  spellTargetFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleSpellSlotHealingModifierSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  resolveBattleSubject,
} from "./unit-profile-admission-test-support.ts";
import type { BattleResolutionResult, BattleUnitRef } from "./index.ts";

const discipleOfLifeUnit = unitLibrary.requireUnit(clericDiscipleOfLifeUnitId);
const discipleOfLifeUnitRef = requireDiscipleOfLifeUnitRef();

describe("Disciple of Life slot-cast healing modifier", () => {
  test("adds 2 plus the Spell Slot level to a Cure Wounds target", () => {
    const state = discipleOfLifeBattle({ spellId: cureWoundsUnitId });
    const resolved = resolveCureWounds(state, {
      targetId: spellTargetId,
      dice: [1, 1],
    });

    expect(currentHp(resolved, spellTargetId)).toBe(9);
  });

  test("does not affect slot-cast healing without the support profile", () => {
    const state = healingBattleWithoutModifier({ spellId: cureWoundsUnitId });
    const resolved = resolveCureWounds(state, {
      targetId: spellTargetId,
      dice: [1, 1],
    });

    expect(currentHp(resolved, spellTargetId)).toBe(6);
  });

  test("does not admit no-slot healing for the modifier", () => {
    const state = spellBattle({
      cantrips: [syntheticHealingCantrip()],
      casterClassLevels: [{ className: "cleric", level: classLevel(3) }],
      casterUnitRefs: [discipleOfLifeUnitRef],
      casterUnitFeatures: [{ unit: discipleOfLifeUnit }],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      targetHp: 1,
      targetMaxHp: 20,
    });

    expect(
      maybeSpellAct({ state, spellId: syntheticHealingCantripUnitId }),
    ).toBeUndefined();
    expect(currentHp(state, spellTargetId)).toBe(1);
  });

  test("uses the spent Spell Slot level for higher-level Healing Word", () => {
    const state = discipleOfLifeBattle({
      spellId: healingWordUnitId,
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = bonusSpellAct({
      state,
      spellId: healingWordUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const awaitingHealing = recordNeedsHolesResult(
      resolveBattleSubjectOrThrow({
        state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            targetHole,
            healingWordUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
    );
    const healingRoll = requireHole(awaitingHealing.holes, "rolledDice");
    const resolved = recordResolvedState(
      resolveBattleSubjectOrThrow({
        state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            targetHole,
            healingWordUnitId,
            spellCasterId,
            spellTargetId,
          ),
          damageRollFillWithGroups(healingRoll, [[1, 1, 1, 1]]),
        ],
      }),
    );

    expect(currentHp(resolved, spellTargetId)).toBe(12);
  });

  test("adds the bonus to each creature healed by one spell", () => {
    const [secondTargetId] = massHealingTargetIds.slice(1);
    if (secondTargetId === undefined) {
      throw new Error("Mass healing fixture requires a second target.");
    }
    const state = discipleOfLifeBattle({
      spellId: massHealingWordUnitId,
      spellSlots: [{ spellLevel: 3, count: 1 }],
      extraTargetIds: [secondTargetId],
    });
    const act = bonusSpellAct({
      state,
      spellId: massHealingWordUnitId,
      slotLevel: 3,
    });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");
    const targets = spellTargetListFill(
      targetListHole,
      spellCasterId,
      massHealingWordUnitId,
      [spellTargetId, secondTargetId],
    );
    const awaitingHealing = recordNeedsHolesResult(
      resolveBattleSubjectOrThrow({
        state,
        subject: act.subject,
        fills: [targets],
      }),
    );
    const healingRoll = requireHole(awaitingHealing.holes, "rolledDice");
    const resolved = recordResolvedState(
      resolveBattleSubjectOrThrow({
        state,
        subject: act.subject,
        fills: [targets, damageRollFillWithGroups(healingRoll, [[1, 1]])],
      }),
    );

    expect(currentHp(resolved, spellTargetId)).toBe(11);
    expect(currentHp(resolved, secondTargetId)).toBe(11);
  });
});

function discipleOfLifeBattle(input: {
  readonly spellId:
    | typeof cureWoundsUnitId
    | typeof healingWordUnitId
    | typeof massHealingWordUnitId;
  readonly spellSlots?: Parameters<typeof spellBattle>[0]["spellSlots"];
  readonly extraTargetIds?: readonly CombatantId[];
}): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(input.spellId)],
    casterClassLevels: [{ className: "cleric", level: classLevel(3) }],
    casterUnitRefs: [discipleOfLifeUnitRef],
    casterUnitFeatures: [{ unit: discipleOfLifeUnit }],
    targetHp: 1,
    targetMaxHp: 20,
    extraTargetHp: 1,
    extraTargetMaxHp: 20,
    ...(input.spellSlots === undefined
      ? {}
      : { spellSlots: input.spellSlots }),
    ...(input.extraTargetIds === undefined
      ? {}
      : { extraTargetIds: input.extraTargetIds }),
  });
}

function healingBattleWithoutModifier(input: {
  readonly spellId: typeof cureWoundsUnitId;
}): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(input.spellId)],
    casterClassLevels: [{ className: "cleric", level: classLevel(3) }],
    spellSlots: [{ spellLevel: 1, count: 1 }],
    targetHp: 1,
    targetMaxHp: 20,
  });
}

const syntheticHealingCantripUnitId = "synthetic_healing_cantrip";

function syntheticHealingCantrip(): ReturnType<typeof spellRecord> {
  const cureWounds = spellRecord(cureWoundsUnitId);
  return {
    ...cureWounds,
    id: syntheticHealingCantripUnitId,
    name: "Synthetic Healing Cantrip",
    mechanics: {
      ...cureWounds.mechanics,
      level: 0,
    },
  };
}

function resolveCureWounds(
  state: BattleState,
  input: {
    readonly targetId: CombatantId;
    readonly dice: readonly number[];
  },
): BattleState {
  const act = spellAct({ state, spellId: cureWoundsUnitId });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const target = spellTargetFill(
    targetHole,
    cureWoundsUnitId,
    spellCasterId,
    input.targetId,
  );
  const awaitingHealing = recordNeedsHolesResult(
    resolveBattleSubjectOrThrow({
      state,
      subject: act.subject,
      fills: [target],
    }),
  );
  const healingRoll = requireHole(awaitingHealing.holes, "rolledDice");
  return recordResolvedState(
    resolveBattleSubjectOrThrow({
      state,
      subject: act.subject,
      fills: [target, damageRollFillWithGroups(healingRoll, [input.dice])],
    }),
  );
}

function resolveBattleSubjectOrThrow(
  input: Parameters<typeof resolveBattleSubject>[0],
): BattleResolutionResult {
  return resolveBattleSubject(input);
}

function recordResolvedState(result: BattleResolutionResult): BattleState {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved spell healing, got ${result.tag}.`);
  }
  return result.state;
}

function recordNeedsHolesResult(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected spell healing holes, got ${result.tag}.`);
  }
  return result;
}

function currentHp(state: BattleState, combatantId: CombatantId): number {
  return Number(state.combatants.get(combatantId)?.hp ?? Hp(0));
}

function requireDiscipleOfLifeSupport(): Exclude<
  ReturnType<typeof battleSpellSlotHealingModifierSupportForUnit>,
  null | "unsupported"
> {
  const support = battleSpellSlotHealingModifierSupportForUnit(
    discipleOfLifeUnit,
  );
  if (support === null || support === "unsupported") {
    throw new Error("Disciple of Life support profile is required.");
  }
  return support;
}

function requireDiscipleOfLifeUnitRef(): BattleUnitRef {
  const support = requireDiscipleOfLifeSupport();
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: clericDiscipleOfLifeUnitId },
    unit: discipleOfLifeUnit,
  });
  if (unitRef._tag === "Left") {
    throw new Error(unitRef.left.message);
  }
  return { ...unitRef.right, supportProfiles: [support] };
}
