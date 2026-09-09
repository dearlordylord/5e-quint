import { describe, expect, test } from "vitest";
import {
  elapsedTimeTicks,
  elapsedTimeTicksFromTimeSpanDuration,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  difficultyClass,
  movementFeet,
  spellSlotLevel,
} from "@dnd/shared/types";
import type {
  Attachment,
  TopLevelSpellCastingTime,
} from "@dnd/surface/surface/types";

import { battleCreatureWithSpellActiveEffects } from "./active-effect/lifecycle.ts";
import type {
  BattleActiveEffect,
  BattleState,
} from "./battle-state-execution.ts";
import { protectionRelevantEffectSavingThrowOutcomeHole } from "./battle-reducer/spell-condition-effects-helpers.ts";
import {
  resolveCreatureTypeProtectionConditionAttemptCommand,
  resolveCreatureTypeProtectionPossessionAttemptCommand,
  resolveProtectionRelevantEffectSaveCommand,
} from "./battle-reducer/protection-charm-procedures.ts";
import {
  reactionTriggerIncludesHitByAttackRoll,
  reactionTriggerNamedSpellIds,
  reactionTriggerNamedSpellIdsFromTrigger,
  type ReactionTrigger,
} from "./battle-reducer/spell-reaction-trigger-shape.ts";
import {
  creatureTargetSelection,
  isD20RollModifierSpellProjection,
  rollModifierAbilityCheckRollModeEffect,
  rollModifierActiveEffect,
  rollModifierDelta,
  rollModifierKindsAreSupported,
  rollModifierSkillFilter,
  rollModifierSpellProjection,
  rollModifierSpellTargeting,
  sameCreatureTypeSet,
  scalarBuffActiveEffectExpiration,
  scalarBuffSpellActionCost,
  scalarBuffSpellEffect,
  scalarBuffSpellRangeFeet,
  scalarBuffSpellTargeting,
  supportedTemporaryHitPointsAmountExpr,
  willingCreatureTargetSelection,
} from "./battle-reducer/spells-profiles-support.ts";
import type { CreatureTypeProtectionActiveEffect } from "./active-effect/creature-type-protection.ts";
import {
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  savingThrowOutcomeFill,
} from "./battle-runtime.test-support.ts";
import {
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import { combatantId } from "./unit-profile-admission.test-support.ts";
import { creatureTypeProtectionProfile } from "./battle-reducer/spell-procedure-profiles/creature-type-protection.ts";
import { perceptionGatedAttackRollDefenseProfile } from "./battle-reducer/spell-procedure-profiles/perception-gated-attack-roll-defense.ts";
import { targetingSaveInterdictionProfile } from "./battle-reducer/spell-procedure-profiles/targeting-save-interdiction.ts";
import { triggeredArmorDefenseProfile } from "./battle-reducer/spell-procedure-profiles/triggered-armor-defense.ts";

const spell = spellAdmissionSource(spellRecord("bless"));
const concentrationDuration = spell.mechanics.duration;
const timedDuration = spellAdmissionSource(spellRecord("longstrider")).mechanics
  .duration;
const instantaneousDuration = spellAdmissionSource(spellRecord("false_life"))
  .mechanics.duration;

function fixedDiceAmount(flat: number) {
  return {
    kind: "fixed" as const,
    expr: { dice: 0, dieSize: 1, flat },
  };
}

function linearDiceAmount(
  startingAtLevel: number,
  flat: number,
  perLevel: number,
) {
  return {
    kind: "linear_per_level" as const,
    axis: "slot" as const,
    startingAtLevel,
    base: { dice: 0, dieSize: 1, flat },
    perLevel: { dice: 0, dieSize: 1, flat: perLevel },
  };
}

function targetAttachment(selection: object): Attachment {
  return {
    kind: "hole",
    holeId: "sr04g_target",
    value: { kind: "target", selection },
  } as Attachment;
}

function mechanicsSource(spellId: string) {
  const source = spellAdmissionSource(spellRecord(spellId));
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function stateWithTargetEffects(
  state: BattleState,
  activeEffects: readonly BattleActiveEffect[],
): BattleState {
  const target = state.combatants.get(spellTargetId);
  if (target === undefined) throw new Error("Expected spell target fixture.");
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      spellTargetId,
      battleCreatureWithSpellActiveEffects(target, activeEffects),
    ),
  };
}

describe("SR-04G reducer support and defense boundaries", () => {
  test("keeps scalar support classifiers total across their accepted boundaries", () => {
    const creatureTypeSets = [["beast", "humanoid"], ["fiend"], []] as const;
    for (const types of creatureTypeSets) {
      expect(sameCreatureTypeSet(types, types)).toBe(true);
    }
    expect(sameCreatureTypeSet(["humanoid", "humanoid"], ["humanoid"])).toBe(
      false,
    );
    expect(sameCreatureTypeSet(["beast"], ["humanoid"])).toBe(false);

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
        feet: { kind: "walk_speed" },
      }),
    ).toBeNull();

    const oneCreature = { mode: "one", targetKinds: ["creature"] } as const;
    const willingCreature = {
      mode: "one",
      targetKinds: ["creature"],
      disposition: "willing",
    } as const;
    const objectTarget = { mode: "one", targetKinds: ["object"] } as const;
    expect(creatureTargetSelection(oneCreature)).toBe(true);
    expect(creatureTargetSelection(objectTarget)).toBe(false);
    expect(willingCreatureTargetSelection(willingCreature)).toBe(true);
    expect(willingCreatureTargetSelection(oneCreature)).toBe(false);

    expect(
      scalarBuffSpellTargeting({ kind: "self" }, 1, spellSlotLevel(1)),
    ).toEqual({ kind: "self" });
    expect(
      scalarBuffSpellTargeting(
        targetAttachment(willingCreature),
        1,
        spellSlotLevel(1),
      ),
    ).toMatchObject({
      kind: "targetList",
      minTargets: 1,
      maxTargets: 1,
      requiredTargetDisposition: "willing",
    });
    expect(
      scalarBuffSpellTargeting(
        targetAttachment(objectTarget),
        1,
        spellSlotLevel(1),
      ),
    ).toBeNull();
  });

  test("projects temporary hit points, speed, armor, and maximum-hit-point effects", () => {
    expect(
      supportedTemporaryHitPointsAmountExpr(
        fixedDiceAmount(5),
        1,
        spellSlotLevel(1),
      ),
    ).toEqual({ dice: 0, dieSize: 1, flat: 5 });
    expect(
      supportedTemporaryHitPointsAmountExpr(
        linearDiceAmount(2, 5, 2),
        1,
        spellSlotLevel(3),
      ),
    ).toEqual({ dice: 0, dieSize: 1, flat: 9 });
    expect(
      supportedTemporaryHitPointsAmountExpr(
        { ...linearDiceAmount(1, 5, 2), axis: "character_level" },
        1,
        spellSlotLevel(3),
      ),
    ).toBeNull();
    expect(
      supportedTemporaryHitPointsAmountExpr(
        { ...linearDiceAmount(2, 5, 2), base: { dice: 1, flat: 5 } },
        1,
        spellSlotLevel(3),
      ),
    ).toBeNull();

    expect(
      scalarBuffActiveEffectExpiration(spellCasterId, concentrationDuration),
    ).toEqual({ kind: "concentration", combatantId: spellCasterId });
    const timedTicks = elapsedTimeTicksFromTimeSpanDuration(
      timedDuration.kind === "timed"
        ? timedDuration.value
        : { unit: "hour", amount: 1 },
    );
    expect(
      scalarBuffActiveEffectExpiration(spellCasterId, timedDuration),
    ).toEqual(
      timedTicks._tag === "Success"
        ? { kind: "duration", durationTicks: timedTicks.success }
        : null,
    );
    expect(
      scalarBuffActiveEffectExpiration(spellCasterId, instantaneousDuration),
    ).toBeNull();

    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spell,
        { kind: "grant_temp_hp", amount: fixedDiceAmount(5) },
        instantaneousDuration,
        1,
        spellSlotLevel(1),
      ),
    ).toEqual({
      kind: "temporaryHitPoints",
      amount: { expr: { dice: 0, dieSize: 1, flat: 5 } },
    });
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spell,
        { kind: "grant_temp_hp", amount: linearDiceAmount(2, 5, 2) },
        instantaneousDuration,
        1,
        spellSlotLevel(3),
      ),
    ).toMatchObject({
      kind: "temporaryHitPoints",
      amount: { expr: { flat: 9 } },
    });
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spell,
        { kind: "grant_temp_hp", amount: fixedDiceAmount(5) },
        timedDuration,
        1,
        spellSlotLevel(1),
      ),
    ).toBeNull();

    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spell,
        {
          kind: "grant_speed",
          speedKind: "swim",
          feet: { kind: "walk_speed" },
        },
        concentrationDuration,
        1,
        spellSlotLevel(1),
      ),
    ).toMatchObject({
      kind: "activeEffect",
      activeEffect: {
        kind: "specialSpeedGrant",
        speedKind: "swim",
        speed: { kind: "equalToSpeed" },
        hover: false,
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      },
    });
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spell,
        {
          kind: "grant_speed",
          speedKind: "fly",
          feet: 60,
          hover: true,
        },
        timedDuration,
        1,
        spellSlotLevel(1),
      ),
    ).toMatchObject({
      activeEffect: {
        kind: "specialSpeedGrant",
        speed: { kind: "fixed", speedFeet: movementFeet(60) },
        hover: true,
      },
    });
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spell,
        { kind: "grant_speed", speedKind: "fly", feet: 60 },
        timedDuration,
        1,
        spellSlotLevel(1),
      ),
    ).toBeNull();

    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spell,
        { kind: "modify_speed", delta: 10, unit: "feet" },
        timedDuration,
        1,
        spellSlotLevel(1),
      ),
    ).toMatchObject({
      activeEffect: { kind: "speedDelta", deltaFeet: 10 },
    });
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spell,
        {
          kind: "modify_ac",
          delta: { kind: "fixed_dice", dice: 1, dieSize: 1, sign: "+" },
        },
        timedDuration,
        1,
        spellSlotLevel(1),
      ),
    ).toMatchObject({
      activeEffect: { kind: "spellArmorClassBonus", bonus: 1 },
    });
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spell,
        { kind: "modify_ac_set_floor", const: 14 },
        timedDuration,
        1,
        spellSlotLevel(1),
      ),
    ).toMatchObject({
      activeEffect: { kind: "spellArmorClassFloor", floor: 14 },
    });
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spell,
        { kind: "modify_ac_set_floor", const: 0 },
        timedDuration,
        1,
        spellSlotLevel(1),
      ),
    ).toBeNull();
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spell,
        {
          kind: "modify_max_hp",
          direction: "increase",
          delta: fixedDiceAmount(7),
        },
        timedDuration,
        1,
        spellSlotLevel(1),
      ),
    ).toMatchObject({
      kind: "hitPointMaximumIncrease",
      activeEffect: { kind: "hitPointMaximumIncrease", amount: 7 },
    });
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spell,
        {
          kind: "modify_max_hp",
          direction: "increase",
          delta: linearDiceAmount(1, 5, 2),
        },
        timedDuration,
        1,
        spellSlotLevel(3),
      ),
    ).toMatchObject({
      kind: "hitPointMaximumIncrease",
      activeEffect: { amount: 9 },
    });
  });

  test("projects numeric and ability-choice roll modifiers with exact filters", () => {
    expect(rollModifierKindsAreSupported(["attack_roll", "saving_throw"])).toBe(
      true,
    );
    expect(rollModifierKindsAreSupported(["not_a_roll"])).toBe(false);
    expect(
      rollModifierDelta({ kind: "fixed_number", amount: 2, sign: "+" }),
    ).toEqual({ kind: "fixedNumber", amount: 2, sign: "+" });
    expect(
      rollModifierDelta({ kind: "fixed_number", amount: 0, sign: "+" }),
    ).toBeNull();
    expect(
      rollModifierDelta({ kind: "fixed_dice", dice: 1, dieSize: 4, sign: "-" }),
    ).toEqual({ dice: 1, dieSize: 4, sign: "-" });
    expect(
      rollModifierDelta({ kind: "fixed_dice", dice: 1, dieSize: 6, sign: "+" }),
    ).toBeNull();

    expect(rollModifierSkillFilter(undefined)).toEqual({ kind: "none" });
    expect(
      rollModifierSkillFilter({ kind: "fixed", skills: ["arcana"] }),
    ).toEqual({ kind: "fixed", skill: "arcana" });
    expect(
      rollModifierSkillFilter({ kind: "fixed", skills: ["arcana", "history"] }),
    ).toBeNull();
    expect(
      rollModifierSkillFilter({
        kind: "choice",
        options: ["arcana", "history"],
      }),
    ).toEqual({ kind: "choice", options: ["arcana", "history"] });

    const expiresAt = {
      kind: "duration" as const,
      durationTicks: elapsedTimeTicks(1),
    };
    const numericEffect = {
      kind: "modify_roll_numeric" as const,
      on: ["attack_roll"] as const,
      delta: { kind: "fixed_number" as const, amount: 2, sign: "+" as const },
      skillFilter: { kind: "fixed" as const, skills: ["acrobatics"] as const },
    };
    expect(
      rollModifierActiveEffect(spellCasterId, spell, numericEffect, expiresAt),
    ).toMatchObject({
      kind: "d20RollModifier",
      sourceCombatantId: spellCasterId,
      delta: { kind: "fixedNumber", amount: 2, sign: "+" },
      skillFilter: { kind: "fixed", skill: "acrobatics" },
    });
    expect(
      rollModifierActiveEffect(
        spellCasterId,
        spell,
        { ...numericEffect, on: ["not_a_roll"] as never },
        expiresAt,
      ),
    ).toBeNull();

    const singleAbilityChoice = {
      kind: "hole" as const,
      holeId: "sr04g_ability",
      value: {
        kind: "choice" as const,
        label: "ability",
        options: ["str", "wis"] as const,
      },
    };
    const perTargetAbilityChoice = {
      kind: "per_target_hole" as const,
      holeId: "sr04g_per_target_ability",
      value: {
        kind: "choice" as const,
        label: "per target ability",
        options: ["str", "wis"] as const,
      },
    };
    const advantageEffect = {
      kind: "modify_roll_advantage" as const,
      mode: "advantage" as const,
      on: ["ability_check"] as const,
      abilityFilter: singleAbilityChoice,
    };
    expect(
      rollModifierAbilityCheckRollModeEffect(
        spellCasterId,
        spell,
        advantageEffect,
        expiresAt,
      ),
    ).toMatchObject({
      effect: { kind: "abilityCheckRollMode", mode: "advantage" },
      abilityChoices: ["str", "wis"],
      abilityChoiceApplication: "single",
    });
    expect(
      rollModifierAbilityCheckRollModeEffect(
        spellCasterId,
        spell,
        { ...advantageEffect, abilityFilter: perTargetAbilityChoice },
        expiresAt,
      ),
    ).toMatchObject({ abilityChoiceApplication: "perTarget" });
    expect(
      rollModifierAbilityCheckRollModeEffect(
        spellCasterId,
        spell,
        { ...advantageEffect, abilityFilter: ["str"] as never },
        expiresAt,
      ),
    ).toBeNull();
    expect(
      rollModifierAbilityCheckRollModeEffect(
        spellCasterId,
        spell,
        {
          ...advantageEffect,
          skillFilter: { kind: "fixed", skills: ["arcana"] },
        },
        expiresAt,
      ),
    ).toBeNull();

    const blessProjection = rollModifierSpellProjection(
      spellCasterId,
      spellAdmissionSource(spellRecord("bless")),
      spellSlotLevel(1),
    );
    const enhanceProjection = rollModifierSpellProjection(
      spellCasterId,
      spellAdmissionSource(spellRecord("enhance_ability")),
      spellSlotLevel(2),
    );
    const baneProjection = rollModifierSpellProjection(
      spellCasterId,
      spellAdmissionSource(spellRecord("bane")),
      spellSlotLevel(1),
    );
    expect(blessProjection).not.toBeNull();
    expect(enhanceProjection).not.toBeNull();
    expect(baneProjection).not.toBeNull();
    if (blessProjection !== null)
      expect(isD20RollModifierSpellProjection(blessProjection)).toBe(true);
    if (enhanceProjection !== null)
      expect(isD20RollModifierSpellProjection(enhanceProjection)).toBe(false);
    if (baneProjection !== null) expect(baneProjection.saveGate).not.toBeNull();
  });

  test("projects roll-modifier targeting at area, list, and invalid object boundaries", () => {
    const selfEmanation: Attachment = {
      kind: "area",
      origin: { kind: "self" },
      shape: { kind: "emanation", radiusFeet: 10 },
    };
    const anyCreature = targetAttachment({ mode: "any_number" });
    const linearCreature = targetAttachment({
      mode: "choose_up_to",
      count: { kind: "linear", base: 1, baseLevel: 1, perSlotAboveBase: 1 },
    });
    const objectTarget = targetAttachment({
      mode: "one",
      targetKinds: ["object"],
    });
    expect(
      rollModifierSpellTargeting(selfEmanation, 1, spellSlotLevel(1)),
    ).toEqual({ kind: "selfAndChosenLegalTargets", minTargets: 1 });
    expect(
      rollModifierSpellTargeting(anyCreature, 1, spellSlotLevel(1)),
    ).toMatchObject({
      kind: "targetList",
      maxTargets: "allLegalTargets",
      requiredTargetDisposition: "unrestricted",
    });
    expect(
      rollModifierSpellTargeting(linearCreature, 1, spellSlotLevel(3)),
    ).toMatchObject({ kind: "targetList", maxTargets: 3 });
    expect(
      rollModifierSpellTargeting(objectTarget, 1, spellSlotLevel(1)),
    ).toBeNull();
    expect(
      rollModifierSpellTargeting(
        {
          kind: "area",
          origin: { kind: "self" },
          shape: { kind: "sphere", radiusFeet: 10 },
        },
        1,
        spellSlotLevel(1),
      ),
    ).toBeNull();
  });

  test("enumerates every reaction trigger shape and recursively preserves named spell ids", () => {
    const triggers: readonly ReactionTrigger[] = [
      { kind: "hit_by_attack_roll" },
      { kind: "takes_damage_from_creature" },
      { kind: "self_or_visible_creature_falls", rangeFeet: 60 },
      { kind: "targeted_by_named_spell", spellId: "synthetic_spell_a" },
      { kind: "creature_casts_spell", components: ["V"] },
      { kind: "spell_save_outcome", outcome: "success" },
    ];
    expect(triggers.map(reactionTriggerNamedSpellIdsFromTrigger)).toEqual([
      [],
      [],
      [],
      ["synthetic_spell_a"],
      [],
      [],
    ]);
    const nested: ReactionTrigger = {
      kind: "any_of",
      triggers: [
        { kind: "targeted_by_named_spell", spellId: "synthetic_spell_a" },
        {
          kind: "any_of",
          triggers: [
            { kind: "hit_by_attack_roll" },
            { kind: "targeted_by_named_spell", spellId: "synthetic_spell_b" },
          ],
        },
      ],
    };
    expect(reactionTriggerNamedSpellIdsFromTrigger(nested)).toEqual([
      "synthetic_spell_a",
      "synthetic_spell_b",
    ]);
    const directReaction = {
      kind: "reaction" as const,
      trigger: { kind: "hit_by_attack_roll" as const },
    } satisfies Extract<TopLevelSpellCastingTime, { kind: "reaction" }>;
    const namedReaction = {
      kind: "reaction" as const,
      trigger: nested,
    } satisfies Extract<TopLevelSpellCastingTime, { kind: "reaction" }>;
    expect(reactionTriggerIncludesHitByAttackRoll(directReaction)).toBe(true);
    expect(reactionTriggerIncludesHitByAttackRoll(namedReaction)).toBe(false);
    expect(reactionTriggerNamedSpellIds(namedReaction)).toEqual([
      "synthetic_spell_a",
      "synthetic_spell_b",
    ]);
    expect(
      reactionTriggerIncludesHitByAttackRoll({
        kind: "reaction",
        trigger: {
          kind: "any_of",
          triggers: [nested, { kind: "hit_by_attack_roll" }],
        },
      }),
    ).toBe(true);
    expect(
      reactionTriggerIncludesHitByAttackRoll({
        kind: "reaction",
        trigger: { kind: "any_of", triggers: [{ kind: "hit_by_attack_roll" }] },
      }),
    ).toBe(true);
  });

  test("resolves protection relevant saves and creature-type protection attempts", () => {
    const repeatSaveEffect = {
      kind: "spellConditionRepeatSave" as const,
      effectRef: battleEffectExecutionRefForTest("sr04g-repeat-save"),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "sr04g-repeat-save-procedure",
      ),
      sourceCombatantId: spellCasterId,
      condition: "charmed" as const,
      conditionHadNonSpellSource: false,
      save: {
        ability: "wis" as const,
        dc: { kind: "fixed" as const, dc: difficultyClass(13) },
      },
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(1),
      },
    } satisfies BattleActiveEffect;
    const possessionEffect = {
      kind: "possession" as const,
      effectRef: battleEffectExecutionRefForTest("sr04g-possession"),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "sr04g-possession-procedure",
      ),
      sourceCombatantId: spellCasterId,
      save: {
        ability: "cha" as const,
        dc: { kind: "fixed" as const, dc: difficultyClass(14) },
      },
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(1),
      },
    } satisfies BattleActiveEffect;
    const protectionEffect = {
      kind: "creatureTypeProtection" as const,
      effectRef: battleEffectExecutionRefForTest("sr04g-protection"),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "sr04g-protection-procedure",
      ),
      sourceCombatantId: spellCasterId,
      creatureTypes: ["humanoid"],
      protections: [
        {
          kind: "relevant_effect_protection" as const,
          conditions: ["charmed", "frightened"] as const,
          possession: "included" as const,
          outcomes: [
            { kind: "new_applications" as const, result: "prevented" as const },
            {
              kind: "new_saves_against_existing_effects" as const,
              mode: "advantage" as const,
            },
          ],
        },
      ],
      expiresAt: { kind: "untilDispelled" as const },
    } satisfies CreatureTypeProtectionActiveEffect;
    const baseState = spellBattle({}).state;
    const repeatState = stateWithTargetEffects(baseState, [repeatSaveEffect]);
    const saveSubject = {
      tag: "runtimeCommand" as const,
      command: "protectionRelevantEffectSave" as const,
      actorId: spellTargetId,
      effectRef: repeatSaveEffect.effectRef,
      relevantEffect: "charmed" as const,
    };
    expect(
      resolveProtectionRelevantEffectSaveCommand({
        state: repeatState,
        subject: saveSubject,
        fills: [],
      }).tag,
    ).toBe("needsHoles");
    const hole = protectionRelevantEffectSavingThrowOutcomeHole(
      repeatState,
      spellTargetId,
      repeatSaveEffect,
    );
    const failedFill = savingThrowOutcomeFill(hole, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const successFill = savingThrowOutcomeFill(hole, [
      { targetId: spellTargetId, succeeded: true },
    ]);
    expect(
      resolveProtectionRelevantEffectSaveCommand({
        state: repeatState,
        subject: saveSubject,
        fills: [failedFill, failedFill],
      }).tag,
    ).toBe("invalid");
    const mismatchedResult = resolveProtectionRelevantEffectSaveCommand({
      state: repeatState,
      subject: { ...saveSubject, relevantEffect: "possession" },
      fills: [],
    });
    expect(mismatchedResult).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    const failedResult = resolveProtectionRelevantEffectSaveCommand({
      state: repeatState,
      subject: saveSubject,
      fills: [failedFill],
    });
    expect(failedResult.tag).toBe("resolved");
    if (failedResult.tag === "resolved") {
      expect(
        failedResult.state.combatants.get(spellTargetId)?.activeEffects,
      ).toContainEqual(repeatSaveEffect);
    }
    const successResult = resolveProtectionRelevantEffectSaveCommand({
      state: repeatState,
      subject: saveSubject,
      fills: [successFill],
    });
    expect(successResult.tag).toBe("resolved");
    if (successResult.tag === "resolved") {
      expect(
        successResult.state.combatants.get(spellTargetId)?.activeEffects,
      ).not.toContainEqual(repeatSaveEffect);
    }

    const unprotectedState = stateWithTargetEffects(baseState, []);
    const conditionSubject = {
      tag: "runtimeCommand" as const,
      command: "creatureTypeProtectionConditionAttempt" as const,
      actorId: spellTargetId,
      sourceCombatantId: spellCasterId,
      condition: "charmed" as const,
    };
    expect(
      resolveCreatureTypeProtectionConditionAttemptCommand({
        state: unprotectedState,
        subject: conditionSubject,
        fills: [{ kind: "savingThrowOutcome", holeId: "unexpected" } as never],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      resolveCreatureTypeProtectionConditionAttemptCommand({
        state: unprotectedState,
        subject: conditionSubject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    const protectedState = stateWithTargetEffects(baseState, [
      protectionEffect,
    ]);
    expect(
      resolveCreatureTypeProtectionConditionAttemptCommand({
        state: protectedState,
        subject: conditionSubject,
        fills: [],
      }).tag,
    ).toBe("resolved");
    expect(
      resolveCreatureTypeProtectionConditionAttemptCommand({
        state: protectedState,
        subject: { ...conditionSubject, actorId: combatantId("sr04g-missing") },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const possessionSubject = {
      tag: "runtimeCommand" as const,
      command: "creatureTypeProtectionPossessionAttempt" as const,
      actorId: spellTargetId,
      sourceCombatantId: spellCasterId,
    };
    expect(
      resolveCreatureTypeProtectionPossessionAttemptCommand({
        state: protectedState,
        subject: possessionSubject,
        fills: [],
      }).tag,
    ).toBe("resolved");
    expect(
      resolveCreatureTypeProtectionPossessionAttemptCommand({
        state: unprotectedState,
        subject: possessionSubject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(
      resolveCreatureTypeProtectionPossessionAttemptCommand({
        state: protectedState,
        subject: {
          ...possessionSubject,
          sourceCombatantId: combatantId("sr04g-missing-source"),
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("keeps the four defensive profiles structured at malformed-shape boundaries", () => {
    const shield = spellRecord("shield");
    if (
      shield.mechanics.family !== "triggered_reaction" ||
      shield.mechanics.phases[0]?.kind !== "direct"
    )
      throw new Error("Expected Shield direct phase.");
    const malformedShield = decodeSpellRecordForTest({
      ...shield,
      id: "synthetic_sr04g_malformed_shield",
      name: "Synthetic Malformed Shield",
      provenance: { kind: "synthetic-test", section: "sr04g_malformed_shield" },
      mechanics: {
        ...shield.mechanics,
        castingTime: {
          kind: "reaction",
          trigger: { kind: "takes_damage_from_creature" },
        },
        phases: [
          { ...shield.mechanics.phases[0], effects: [{ kind: "none" }] },
        ],
      },
    });
    const shieldResult = triggeredArmorDefenseProfile.admitMechanics(
      mechanicsSourceFromRecord(malformedShield),
    );
    expect(shieldResult.tag).toBe("unsupported");
    if (shieldResult.tag === "unsupported") {
      expect(shieldResult.issues.map(({ failedFact }) => failedFact)).toEqual(
        expect.arrayContaining([
          "trigger",
          "effects",
          "armorClassEffect",
          "negationEffect",
        ]),
      );
    }

    const blur = spellRecord("blur");
    if (
      blur.mechanics.family !== "activation" ||
      blur.mechanics.phases[0]?.kind !== "direct"
    )
      throw new Error("Expected Blur direct phase.");
    const malformedBlur = decodeSpellRecordForTest({
      ...blur,
      id: "synthetic_sr04g_malformed_blur",
      name: "Synthetic Malformed Blur",
      provenance: { kind: "synthetic-test", section: "sr04g_malformed_blur" },
      mechanics: {
        ...blur.mechanics,
        phases: [{ ...blur.mechanics.phases[0], effects: [{ kind: "none" }] }],
      },
    });
    const blurResult = perceptionGatedAttackRollDefenseProfile.admitMechanics(
      mechanicsSourceFromRecord(malformedBlur),
    );
    expect(blurResult.tag).toBe("unsupported");
    if (blurResult.tag === "unsupported") {
      expect(blurResult.issues.map(({ failedFact }) => failedFact)).toEqual(
        expect.arrayContaining(["effect"]),
      );
    }

    const sanctuary = spellRecord("sanctuary");
    if (sanctuary.mechanics.family !== "ongoing_effect")
      throw new Error("Expected Sanctuary ongoing mechanics.");
    const sanctuaryOperation = sanctuary.mechanics.operations[0];
    if (sanctuaryOperation === undefined)
      throw new Error("Expected Sanctuary operation.");
    const malformedSanctuary = decodeSpellRecordForTest({
      ...sanctuary,
      id: "synthetic_sr04g_malformed_sanctuary",
      name: "Synthetic Malformed Sanctuary",
      provenance: {
        kind: "synthetic-test",
        section: "sr04g_malformed_sanctuary",
      },
      mechanics: {
        ...sanctuary.mechanics,
        operations: [
          {
            ...sanctuaryOperation,
            trigger: { kind: "passive" },
          },
        ],
      },
    });
    const sanctuaryResult = targetingSaveInterdictionProfile.admitMechanics(
      mechanicsSourceFromRecord(malformedSanctuary),
    );
    expect(sanctuaryResult.tag).toBe("unsupported");
    if (sanctuaryResult.tag === "unsupported") {
      expect(
        sanctuaryResult.issues.map(({ failedFact }) => failedFact),
      ).toEqual(expect.arrayContaining(["trigger"]));
    }

    const protection = spellRecord("protection_from_evil_and_good");
    const malformedProtection = decodeSpellRecordForTest({
      ...protection,
      id: "synthetic_sr04g_malformed_protection",
      name: "Synthetic Malformed Protection",
      provenance: {
        kind: "synthetic-test",
        section: "sr04g_malformed_protection",
      },
      mechanics: {
        ...protection.mechanics,
        duration: { kind: "timed", value: { unit: "minute", amount: 1 } },
      },
    });
    const protectionResult = creatureTypeProtectionProfile.admitMechanics(
      mechanicsSourceFromRecord(malformedProtection),
    );
    expect(protectionResult.tag).toBe("unsupported");
  });
});

function mechanicsSourceFromRecord(record: ReturnType<typeof spellRecord>) {
  const source = spellAdmissionSource(record);
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}
