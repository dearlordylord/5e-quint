// RAW traceability: spell-slot admission and higher-level scaling follow
// .references/srd-5.2.1/Spells/Gaining-and-Casting.md:44-69; component and
// range projections follow .references/srd-5.2.1/Spells/Gaining-and-Casting.md:124-145.
// Canonical spell shapes are checked
// against .references/srd-5.2.1/Spells/Descriptions-A-D.md:1277-1289,
// .references/srd-5.2.1/Spells/Descriptions-E-L.md:253-263,1654-1664 and
// .references/srd-5.2.1/Spells/Descriptions-S-Z.md:35-49.
import { describe, expect, test } from "vitest";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { movementFeet, spellSlotLevel } from "@dnd/shared/types";
import {
  type Attachment,
  type DiceAmount,
  type TargetSelection,
} from "@dnd/surface/surface/types";
import {
  characterSeed,
  spellRecord,
  startBattleSessionRight,
  statBlockCreatureInit,
  wizardId,
  wizardSpellcasting,
  battleId,
} from "./battle-runtime.test-support.ts";
import {
  diceExprWithDelta,
  sameStringSet,
  scalarBuffSpellTargetCount,
  scalarBuffSpellTargetCountBySlot,
  singleTargetSpellRangeFeet,
  supportedDamageAmountExpr,
  supportedRepeatedEffectCount,
  targetCountBySlot,
  targetSelectionFromAttachment,
} from "./battle-reducer/spells-execution-facts.ts";
import {
  isPreparedDamageSpellSource,
  isScalarBuffTargetListInvocation,
  isTargetListSpellInvocation,
} from "./battle-reducer/spells-invocation-guards.ts";
import {
  creatureTargetSelection,
  rollModifierDelta,
  rollModifierKindsAreSupported,
  rollModifierSkillFilter,
  sameCreatureTypeSet,
  scalarBuffActiveEffectExpiration,
  scalarBuffSpellActionCost,
  scalarBuffSpellRangeFeet,
  scalarBuffSpellTargeting,
  supportedTemporaryHitPointsAmountExpr,
} from "./battle-reducer/spells-profiles-support.ts";

function admittedSpell(spellId: string) {
  const session = startBattleSessionRight({
    battleId: battleId(`gh227-admission-${spellId}`),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord(spellId)],
          spellSlots: [{ spellLevel: 2, count: 1 }],
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const source = session.context.characters
    .get(wizardId)
    ?.spellPresentationSources.find(
      (candidate) => candidate.invocation.spell.id === spellId,
    );
  if (source === undefined) {
    throw new Error(`Expected admitted spell source for ${spellId}.`);
  }
  return source.invocation;
}

describe("GitHub #227 admission and projection boundaries", () => {
  test("projects supported spell damage amounts", () => {
    const fixed: DiceAmount = {
      kind: "fixed",
      expr: { dice: 1, dieSize: 6, flat: 2 },
    };
    const characterTiers: DiceAmount = {
      kind: "threshold_tiers",
      axis: "character",
      base: { dice: 1, dieSize: 6 },
      tiers: [{ atLevel: 5, override: { dice: 2 } }],
    };
    const exploding: DiceAmount = {
      kind: "threshold_tiers_exploding_max_die",
      axis: "character",
      baseDice: 1,
      dieSize: 6,
      tiers: [{ atLevel: 5, dice: 2 }],
      maxAdditionalDice: "spellcasting_ability_modifier",
    };
    const linear: DiceAmount = {
      kind: "linear_per_level",
      axis: "slot",
      startingAtLevel: 2,
      base: { dice: 1, dieSize: 8 },
      perLevel: { dice: 1 },
    };

    expect(supportedDamageAmountExpr({ amount: fixed })).toEqual(fixed.expr);
    expect(
      supportedDamageAmountExpr({ amount: characterTiers, characterLevel: 4 }),
    ).toEqual(characterTiers.base);
    expect(
      supportedDamageAmountExpr({ amount: characterTiers, characterLevel: 5 }),
    ).toEqual({ dice: 2, dieSize: 6 });
    expect(
      supportedDamageAmountExpr({ amount: exploding, characterLevel: 5 }),
    ).toEqual({ dice: 2, dieSize: 6 });
    expect(
      supportedDamageAmountExpr({
        amount: linear,
        spellLevel: 1,
        slotLevel: spellSlotLevel(3),
      }),
    ).toEqual({ dice: 3, dieSize: 8 });
    expect(
      supportedDamageAmountExpr({
        amount: linear,
        spellLevel: 3,
        slotLevel: spellSlotLevel(3),
      }),
    ).toBeNull();

    expect(diceExprWithDelta({ dice: 1, dieSize: 6 }, { flat: 2 })).toEqual({
      dice: 1,
      dieSize: 6,
      flat: 2,
    });
  });

  test("projects target counts, attachments, ranges, and spell guards", () => {
    const one: TargetSelection = { mode: "one" };
    const fixedMany: TargetSelection = {
      mode: "choose_up_to",
      count: 3,
      repeatsAllowed: true,
      targetKinds: ["creature"],
    };
    const linearMany: TargetSelection = {
      mode: "choose_up_to",
      count: { kind: "linear", base: 2, perSlotAboveBase: 1, baseLevel: 1 },
      repeatsAllowed: true,
      targetKinds: ["creature"],
    };
    const noCount: TargetSelection = {
      mode: "choose_up_to",
      count: {
        kind: "threshold_tiers",
        axis: "slot",
        base: 2,
        tiers: [{ atLevel: 3, value: 4 }],
      },
      targetKinds: ["creature"],
    };
    const nonRepeatedMany: TargetSelection = {
      mode: "choose_up_to",
      count: 3,
      targetKinds: ["creature"],
    };
    const self: Attachment = { kind: "self" };
    const target: Attachment = {
      kind: "hole",
      holeId: "gh227_target",
      label: "target",
      value: { kind: "target", selection: one },
    };

    expect(targetCountBySlot(one, 1)?.(spellSlotLevel(9))).toBe(1);
    expect(targetCountBySlot(fixedMany, 1)?.(spellSlotLevel(9))).toBe(3);
    expect(targetCountBySlot(linearMany, 1)?.(spellSlotLevel(3))).toBe(4);
    expect(targetCountBySlot(noCount, 1)).toBeNull();
    expect(
      scalarBuffSpellTargetCountBySlot(linearMany, 1)?.(spellSlotLevel(2)),
    ).toBe(3);
    expect(scalarBuffSpellTargetCount(one, 1, spellSlotLevel(1))).toBe(1);
    expect(
      supportedRepeatedEffectCount(fixedMany, 1)?.(spellSlotLevel(5)),
    ).toBe(3);
    expect(supportedRepeatedEffectCount(nonRepeatedMany, 1)).toBeNull();
    expect(targetSelectionFromAttachment(target)).toEqual(one);
    expect(targetSelectionFromAttachment(self)).toBeNull();
    expect(sameStringSet(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameStringSet(["a"], ["a", "b"])).toBe(false);
    expect(singleTargetSpellRangeFeet({ kind: "point", feet: 30 })).toEqual(
      movementFeet(30),
    );
    expect(singleTargetSpellRangeFeet({ kind: "touch" })).toEqual(
      movementFeet(5),
    );
    expect(singleTargetSpellRangeFeet({ kind: "self" })).toBeNull();

    expect(creatureTargetSelection(one)).toBe(true);
    expect(
      creatureTargetSelection({ mode: "one", targetKinds: ["object"] }),
    ).toBe(false);
  });

  test("projects spell support profiles across accepted and rejected shapes", () => {
    const self: Attachment = { kind: "self" };
    const target: Attachment = {
      kind: "hole",
      holeId: "gh227_target_profile",
      label: "target",
      value: { kind: "target", selection: { mode: "one" } },
    };
    expect(
      sameCreatureTypeSet(["humanoid", "beast"], ["beast", "humanoid"]),
    ).toBe(true);
    expect(sameCreatureTypeSet(["humanoid", "humanoid"], ["humanoid"])).toBe(
      false,
    );
    expect(scalarBuffSpellActionCost({ kind: "action" })).toBe("magicAction");
    expect(scalarBuffSpellActionCost({ kind: "bonus_action" })).toBe(
      "bonusAction",
    );
    expect(
      scalarBuffSpellActionCost({
        kind: "reaction",
        trigger: { kind: "hit_by_attack_roll" },
      }),
    ).toBeNull();
    expect(scalarBuffSpellRangeFeet({ kind: "self" })).toEqual(movementFeet(0));
    expect(scalarBuffSpellRangeFeet({ kind: "touch" })).toEqual(
      movementFeet(5),
    );
    expect(scalarBuffSpellRangeFeet({ kind: "point", feet: 60 })).toEqual(
      movementFeet(60),
    );
    expect(
      scalarBuffSpellRangeFeet({
        kind: "point",
        feet: {
          kind: "threshold_tiers",
          axis: "slot",
          base: 30,
          tiers: [{ atLevel: 3, value: 60 }],
        },
      }),
    ).toBeNull();
    expect(scalarBuffSpellTargeting(self, 1, spellSlotLevel(1))).toEqual({
      kind: "self",
    });
    expect(
      scalarBuffSpellTargeting(target, 1, spellSlotLevel(1)),
    ).toMatchObject({ kind: "targetList", maxTargets: 1 });
    expect(
      scalarBuffSpellTargeting(
        {
          ...target,
          value: {
            kind: "target",
            selection: { mode: "one", targetKinds: ["object"] },
          },
        },
        1,
        spellSlotLevel(1),
      ),
    ).toBeNull();

    expect(
      rollModifierDelta({ kind: "fixed_number", amount: 2, sign: "+" }),
    ).toEqual({ kind: "fixedNumber", amount: 2, sign: "+" });
    expect(
      rollModifierDelta({ kind: "fixed_dice", dice: 1, dieSize: 4, sign: "-" }),
    ).toEqual({ dice: 1, dieSize: 4, sign: "-" });
    expect(
      rollModifierDelta({ kind: "fixed_number", amount: 0, sign: "+" }),
    ).toBeNull();
    expect(
      rollModifierKindsAreSupported(["ability_check", "saving_throw"]),
    ).toBe(true);
    expect(rollModifierKindsAreSupported(["ability_check", "not_a_roll"])).toBe(
      false,
    );
    expect(rollModifierSkillFilter(undefined)).toEqual({ kind: "none" });
    expect(
      rollModifierSkillFilter({ kind: "fixed", skills: ["stealth"] }),
    ).toEqual({ kind: "fixed", skill: "stealth" });
    expect(
      rollModifierSkillFilter({
        kind: "choice",
        options: ["arcana", "history"],
      }),
    ).toEqual({ kind: "choice", options: ["arcana", "history"] });
    expect(
      rollModifierSkillFilter({ kind: "fixed", skills: ["stealth", "arcana"] }),
    ).toBeNull();

    expect(
      scalarBuffActiveEffectExpiration(wizardId, {
        kind: "concentration",
        upTo: { unit: "minute", amount: 10 },
      }),
    ).toMatchObject({ kind: "concentration", combatantId: wizardId });
    expect(
      scalarBuffActiveEffectExpiration(wizardId, {
        kind: "timed",
        value: { unit: "minute", amount: 1 },
      }),
    ).toEqual({ kind: "duration", durationTicks: elapsedTimeTicks(10) });
    expect(
      scalarBuffActiveEffectExpiration(wizardId, { kind: "instantaneous" }),
    ).toBeNull();
    expect(
      supportedTemporaryHitPointsAmountExpr(
        { kind: "fixed", expr: { dice: 0, dieSize: 1, flat: 5 } },
        1,
        spellSlotLevel(1),
      ),
    ).toEqual({ dice: 0, dieSize: 1, flat: 5 });
    expect(
      supportedTemporaryHitPointsAmountExpr(
        {
          kind: "linear_per_level",
          axis: "slot",
          startingAtLevel: 2,
          base: { dice: 1, dieSize: 6 },
          perLevel: { dice: 1 },
        },
        1,
        spellSlotLevel(3),
      ),
    ).toEqual({ dice: 3, dieSize: 6, flat: 0 });
    expect(
      supportedTemporaryHitPointsAmountExpr(
        {
          kind: "linear_per_level",
          axis: "character",
          startingAtLevel: 2,
          base: { dice: 1, dieSize: 6 },
          perLevel: { dice: 1 },
        },
        1,
        spellSlotLevel(3),
      ),
    ).toBeNull();
  });

  test("classifies admitted invocation targeting and source access", () => {
    const spell = admittedSpell("scorching_ray");
    if (spell.procedure !== "spellAttackSequence") {
      throw new Error(
        `Expected Scorching Ray to use spell attack sequence; got ${spell.procedure}.`,
      );
    }
    expect(isPreparedDamageSpellSource(spell)).toBe(true);
    const longstrider = admittedSpell("longstrider");
    if (longstrider.procedure !== "scalarBuff") {
      throw new Error("Expected Longstrider to use scalar buff.");
    }
    expect(isScalarBuffTargetListInvocation(longstrider)).toBe(true);
    expect(isTargetListSpellInvocation(longstrider)).toBe(true);
    expect(isTargetListSpellInvocation(spell)).toBe(false);
    const falseLife = admittedSpell("false_life");
    if (falseLife.procedure !== "scalarBuff") {
      throw new Error("Expected False Life to use scalar buff.");
    }
    expect(isScalarBuffTargetListInvocation(falseLife)).toBe(false);
    expect(isTargetListSpellInvocation(falseLife)).toBe(false);
  });
});
