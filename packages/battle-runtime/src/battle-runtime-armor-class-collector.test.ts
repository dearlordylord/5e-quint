// KERNEL-COVERAGE: parity-witness BATTLE.ARMOR_CLASS.COLLECTOR
// RAW: .references/srd-5.2.1/rules-glossary.md, "Armor Class": "If a rule
// gives you another base AC calculation, you choose which calculation to use;
// you can't use more than one." spells.md, Mage Armor: "the target's base AC
// becomes 13 plus its Dexterity modifier"; Shield of Faith: "+2 bonus to AC";
// Barkskin: "an Armor Class of 17 if its AC is lower than that".
// rules-glossary.md, "Cover": Half Cover gives "+2 bonus to AC".
import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import type { RuledCoverType } from "@dnd/shared/types";
import { Match } from "effect";
import { describe, expect, test } from "vitest";
import {
  ARMOR_CLASS_BASE_CALCULATION_SOURCES,
  ARMOR_CLASS_FLOOR_SOURCES,
  ARMOR_CLASS_MODIFIER_SOURCES,
  armorClassContributions,
  collectedArmorClass,
  type ArmorClassContribution,
} from "./battle-reducer/armor-class-collector.ts";
import type { BattleState } from "./battle-state-execution.ts";
import {
  abilityModifier,
  attackExecutionSelectionForSubjectForTest,
  attackRollFill,
  attackTargetDistanceSpatialFact,
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
  defaultArmorClassState,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  movementFeet,
  requireElapsedHours,
  requireHole,
  resolveBattleSubject,
  snapshotBattle,
  targetFill,
} from "./battle-runtime.test-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture.test-support.ts";

const spellSource = battleProcedureExecutionRefForTest("synthetic-ac-spell");

// Dexterity +3 and Wisdom +4, with no armor or Shield.
function goblinWithUnarmoredBase(
  state: BattleState,
  base: "classFeature" | "default",
): BattleState {
  const goblin = requireCombatant(state, goblinId);
  const unarmored = defaultArmorClassState();
  return {
    ...state,
    combatants: new Map(state.combatants).set(goblinId, {
      ...goblin,
      armorClass: {
        ...unarmored,
        abilityModifiers: {
          ...unarmored.abilityModifiers,
          dex: abilityModifier(3),
          wis: abilityModifier(4),
        },
        base:
          base === "classFeature"
            ? {
                kind: "ability_sum",
                base: armorClass(10),
                abilityModifiers: ["dex", "wis"],
                source: "class_feature_base_plus_ability",
                sourceUnitId: "synthetic_unarmored_calculation",
              }
            : unarmored.base,
      },
    }),
  };
}

function withMageArmor(state: BattleState): BattleState {
  return battleStateWithAllocatedEffectForTest({
    state,
    ownerId: goblinId,
    effect: {
      kind: "spellBaseArmorClass",
      sourceProcedureRef: spellSource,
      sourceCombatantId: fighterId,
      base: armorClass(13),
      ability: "dex",
      earlyEnds: [{ kind: "targetDonsArmor" }],
      expiresAt: {
        kind: "duration",
        durationTicks: requireElapsedHours(8),
      },
    },
  });
}

function withEffect(
  state: BattleState,
  effect:
    | { readonly kind: "spellArmorClassBonus"; readonly bonus: number }
    | { readonly kind: "spellArmorClassFloor"; readonly floor: number },
): BattleState {
  return battleStateWithAllocatedEffectForTest({
    state,
    ownerId: goblinId,
    effect:
      effect.kind === "spellArmorClassBonus"
        ? {
            kind: "spellArmorClassBonus",
            sourceProcedureRef: spellSource,
            sourceCombatantId: fighterId,
            bonus: effect.bonus,
            negatesRepeatedDamageAllocation: false,
            expiresAt: { kind: "concentration", combatantId: fighterId },
          }
        : {
            kind: "spellArmorClassFloor",
            sourceProcedureRef: spellSource,
            sourceCombatantId: fighterId,
            floor: armorClass(effect.floor),
            expiresAt: { kind: "concentration", combatantId: fighterId },
          },
  });
}

function snapshotArmorClass(state: BattleState): number {
  const goblin = snapshotBattle(state).combatants.find(
    (combatant) => combatant.combatantId === goblinId,
  );
  if (goblin === undefined) throw new Error("Expected the goblin snapshot.");
  return Number(goblin.armorClass);
}

// Whether a Longsword attack with this total hits the goblin.
function longswordHits(
  state: BattleState,
  total: number,
  cover?: RuledCoverType,
): boolean {
  const subject = fighterAttackSubject(state, "Longsword");
  const targetHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const distance = attackTargetDistanceSpatialFact(
    fighterId,
    goblinId,
    attackExecutionSelectionForSubjectForTest(subject),
    movementFeet(5),
  );
  const target = targetFill(targetHole, goblinId, [
    cover === undefined ? distance : { ...distance, cover },
  ]);
  const rollHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [target] }),
    "attackRoll",
  );
  const result = resolveBattleSubject({
    state,
    subject,
    fills: [target, attackRollFill(rollHole, { total, naturalD20: 10 })],
  });
  if (result.tag === "resolved") return false;
  requireHole(result, "rolledDice");
  return true;
}

// Each contribution names a source listed for its role.
function sourceIsListedForRole(contribution: ArmorClassContribution): boolean {
  return Match.value(contribution).pipe(
    Match.when({ role: "baseCalculation" }, ({ source }) =>
      ARMOR_CLASS_BASE_CALCULATION_SOURCES.includes(source),
    ),
    Match.when({ role: "modifier" }, ({ source }) =>
      ARMOR_CLASS_MODIFIER_SOURCES.includes(source),
    ),
    Match.when({ role: "floor" }, ({ source }) =>
      ARMOR_CLASS_FLOOR_SOURCES.includes(source),
    ),
    Match.when({ role: "cover" }, ({ source }) => source === "cover"),
    Match.exhaustive,
  );
}

// The snapshot and a weapon attack agree with the collector, at the AC and
// one below it.
function expectEveryRouteAgrees(state: BattleState, expected: number) {
  const goblin = requireCombatant(state, goblinId);
  expect(Number(collectedArmorClass(state, goblin))).toBe(expected);
  expect(
    armorClassContributions(state, goblin, "half").every(sourceIsListedForRole),
  ).toBe(true);
  expect(snapshotArmorClass(state)).toBe(expected);
  expect(longswordHits(state, expected)).toBe(true);
  expect(longswordHits(state, expected - 1)).toBe(false);
}

describe("armor class collector: one rule on every route", () => {
  test("Mage Armor doesn't lower a higher base calculation", () => {
    const state = withMageArmor(
      goblinWithUnarmoredBase(fighterVsGoblinBattle(), "classFeature"),
    );
    expectEveryRouteAgrees(state, 17);
    expect(
      armorClassContributions(state, requireCombatant(state, goblinId), null),
    ).toEqual([
      {
        role: "baseCalculation",
        source: "classFeatureCalculation",
        armorClass: 17,
      },
    ]);
  });

  test("Mage Armor replaces a lower base calculation", () => {
    const state = withMageArmor(
      goblinWithUnarmoredBase(fighterVsGoblinBattle(), "default"),
    );
    expectEveryRouteAgrees(state, 16);
    expect(
      armorClassContributions(state, requireCombatant(state, goblinId), null),
    ).toEqual([
      {
        role: "baseCalculation",
        source: "spellBaseCalculation",
        armorClass: 16,
      },
    ]);
  });

  test("a spell's bonus adds to the base calculation in effect", () => {
    const state = withEffect(
      withMageArmor(
        goblinWithUnarmoredBase(fighterVsGoblinBattle(), "default"),
      ),
      { kind: "spellArmorClassBonus", bonus: 2 },
    );
    expectEveryRouteAgrees(state, 18);
  });

  test("a floor raises a lower AC, and cover adds after it", () => {
    const state = withEffect(
      goblinWithUnarmoredBase(fighterVsGoblinBattle(), "default"),
      { kind: "spellArmorClassFloor", floor: 17 },
    );
    expectEveryRouteAgrees(state, 17);
    expect(longswordHits(state, 18, "half")).toBe(false);
    expect(longswordHits(state, 19, "half")).toBe(true);
    expect(
      armorClassContributions(state, requireCombatant(state, goblinId), "half"),
    ).toEqual([
      { role: "baseCalculation", source: "defaultUnarmored", armorClass: 13 },
      { role: "floor", source: "spellFloor", armorClass: 17 },
      { role: "cover", source: "cover", delta: 2 },
    ]);
  });
});
