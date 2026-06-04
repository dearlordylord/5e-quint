// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.spell-slot-healing-modifier
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3PUTB-03 cleric_disciple_of_life
// UNIT-IDENTITY-MBT-REPLAY: L3PUTB-03 cleric_disciple_of_life doSlotHealingModifier doNonModifierSlotHealing doNonSlotHealingExcluded doEachCreatureHealed
import * as path from "node:path";

import { Hp } from "@dnd/shared/types";

import {
  damageRollFillWithGroups,
  type BattleState,
  type CombatantId,
} from "./battle-runtime-test-support.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  clericDiscipleOfLifeUnitId,
  cureWoundsUnitId,
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

type DiscipleOfLifeLastResult =
  | "init"
  | "slotHealingModifier"
  | "nonModifierSlotHealing"
  | "nonSlotHealingExcluded"
  | "eachCreatureHealed";
type DiscipleOfLifeProjection = {
  readonly targetHp: number;
  readonly secondTargetHp: number;
  readonly spellSlotsRemaining: number;
  readonly lastResult: DiscipleOfLifeLastResult;
};

const discipleOfLifeUnit = unitLibrary.requireUnit(clericDiscipleOfLifeUnitId);
const discipleOfLifeUnitRef = requireDiscipleOfLifeUnitRef();
const [secondTargetId] = massHealingTargetIds.slice(1);
if (secondTargetId === undefined) {
  throw new Error("Disciple of Life selected identity requires two targets.");
}

defineSelectedIdentityWitness({
  describeLabel: "Disciple of Life selected identity MBT",
  taskId: "L3PUTB-03",
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-disciple-of-life.mbt.qnt",
  ),
  projectionSchema: {
    targetHp: "int",
    secondTargetHp: "int",
    spellSlotsRemaining: "int",
    lastResult: "str",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: clericDiscipleOfLifeUnitId,
      procedures: [
        {
          actionName: "doSlotHealingModifier",
          projectionAfter: expectedProjection({
            targetHp: 9,
            spellSlotsRemaining: 0,
            lastResult: "slotHealingModifier",
          }),
          discover: () =>
            projectBattleState(
              resolveCureWounds(discipleOfLifeBattle(), {
                targetId: spellTargetId,
                dice: [1, 1],
              }),
              "slotHealingModifier",
            ),
        },
        {
          actionName: "doNonModifierSlotHealing",
          projectionAfter: expectedProjection({
            targetHp: 6,
            spellSlotsRemaining: 0,
            lastResult: "nonModifierSlotHealing",
          }),
          discover: () =>
            projectBattleState(
              resolveCureWounds(healingBattleWithoutModifier(), {
                targetId: spellTargetId,
                dice: [1, 1],
              }),
              "nonModifierSlotHealing",
            ),
        },
        {
          actionName: "doNonSlotHealingExcluded",
          projectionAfter: expectedProjection({
            targetHp: 1,
            spellSlotsRemaining: 1,
            lastResult: "nonSlotHealingExcluded",
          }),
          discover: () =>
            projectBattleState(
              noSlotHealingCantripExcludedBattle(),
              "nonSlotHealingExcluded",
            ),
        },
        {
          actionName: "doEachCreatureHealed",
          projectionAfter: expectedProjection({
            targetHp: 11,
            secondTargetHp: 11,
            spellSlotsRemaining: 0,
            lastResult: "eachCreatureHealed",
          }),
          discover: () =>
            projectBattleState(
              resolveMassHealingWord({
                dice: [1, 1],
              }),
              "eachCreatureHealed",
            ),
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<DiscipleOfLifeProjection> = {},
): DiscipleOfLifeProjection {
  return {
    targetHp: 1,
    secondTargetHp: 1,
    spellSlotsRemaining: 1,
    lastResult: "init",
    ...overrides,
  };
}

function projectBattleState(
  state: BattleState,
  lastResult: DiscipleOfLifeLastResult,
): DiscipleOfLifeProjection {
  return {
    targetHp: currentHp(state, spellTargetId),
    secondTargetHp: currentHp(state, secondTargetId),
    spellSlotsRemaining: spellSlotsRemaining(state),
    lastResult,
  };
}

function discipleOfLifeBattle(): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(cureWoundsUnitId)],
    casterClassLevels: [{ className: "cleric", level: classLevel(3) }],
    casterUnitRefs: [discipleOfLifeUnitRef],
    casterUnitFeatures: [{ unit: discipleOfLifeUnit }],
    spellSlots: [{ spellLevel: 1, count: 1 }],
    targetHp: 1,
    targetMaxHp: 20,
    extraTargetHp: 1,
    extraTargetMaxHp: 20,
    extraTargetIds: [secondTargetId],
  });
}

function healingBattleWithoutModifier(): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(cureWoundsUnitId)],
    casterClassLevels: [{ className: "cleric", level: classLevel(3) }],
    spellSlots: [{ spellLevel: 1, count: 1 }],
    targetHp: 1,
    targetMaxHp: 20,
    extraTargetHp: 1,
    extraTargetMaxHp: 20,
    extraTargetIds: [secondTargetId],
  });
}

const syntheticHealingCantripUnitId = "synthetic_healing_cantrip";

function noSlotHealingCantripExcludedBattle(): BattleState {
  const state = spellBattle({
    cantrips: [syntheticHealingCantrip()],
    casterClassLevels: [{ className: "cleric", level: classLevel(3) }],
    casterUnitRefs: [discipleOfLifeUnitRef],
    casterUnitFeatures: [{ unit: discipleOfLifeUnit }],
    spellSlots: [{ spellLevel: 1, count: 1 }],
    targetHp: 1,
    targetMaxHp: 20,
    extraTargetHp: 1,
    extraTargetMaxHp: 20,
    extraTargetIds: [secondTargetId],
  });
  const act = maybeSpellAct({ state, spellId: syntheticHealingCantripUnitId });
  if (act !== undefined) {
    throw new Error("No-slot healing cantrip must not admit a healing act.");
  }
  return state;
}

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
  const awaitingHealing = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target],
  });
  if (awaitingHealing.tag !== "needsHoles") {
    throw new Error(`Expected Cure Wounds healing roll, got ${awaitingHealing.tag}.`);
  }
  const healingRoll = requireHole(awaitingHealing.holes, "rolledDice");
  return recordResolvedState(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [target, damageRollFillWithGroups(healingRoll, [input.dice])],
    }),
  );
}

function resolveMassHealingWord(input: {
  readonly dice: readonly number[];
}): BattleState {
  const state = spellBattle({
    preparedSpells: [spellRecord(massHealingWordUnitId)],
    casterClassLevels: [{ className: "cleric", level: classLevel(3) }],
    casterUnitRefs: [discipleOfLifeUnitRef],
    casterUnitFeatures: [{ unit: discipleOfLifeUnit }],
    spellSlots: [{ spellLevel: 3, count: 1 }],
    targetHp: 1,
    targetMaxHp: 20,
    extraTargetHp: 1,
    extraTargetMaxHp: 20,
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
  const awaitingHealing = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [targets],
  });
  if (awaitingHealing.tag !== "needsHoles") {
    throw new Error(
      `Expected Mass Healing Word healing roll, got ${awaitingHealing.tag}.`,
    );
  }
  const healingRoll = requireHole(awaitingHealing.holes, "rolledDice");
  return recordResolvedState(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targets, damageRollFillWithGroups(healingRoll, [input.dice])],
    }),
  );
}

function recordResolvedState(result: BattleResolutionResult): BattleState {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved spell healing, got ${result.tag}.`);
  }
  return result.state;
}

function currentHp(state: BattleState, combatantId: CombatantId): number {
  return Number(state.combatants.get(combatantId)?.hp ?? Hp(0));
}

function spellSlotsRemaining(state: BattleState): number {
  const caster = state.combatants.get(spellCasterId);
  if (caster?.origin.kind !== "character") {
    throw new Error("Disciple of Life witness requires a character caster.");
  }
  return caster.origin.spellcasting?.spellSlots.reduce(
    (remaining, slot) => remaining + Number(slot.count - slot.expended),
    0,
  ) ?? 0;
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
