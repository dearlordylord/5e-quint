import { describe, expect, test } from "vitest";

import { movementFeet, spellSlotLevel } from "@dnd/shared/types";
import type {
  Attachment,
  EffectAtom,
  OngoingEffect,
  SpellMechanics,
  TopLevelSpellCastingTime,
} from "@dnd/surface/surface/types";
import { topLevelSpellCastingTime } from "@dnd/surface/surface/types";

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
import { spellCasterId } from "./unit-profile-admission-catalog.test-support.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";

type PhasedMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" | "triggered_reaction" }
>;

function directPhase(spellId: string, phaseIndex = 0) {
  const mechanics = spellRecord(spellId).mechanics;
  if (!isPhasedMechanics(mechanics)) {
    throw new Error(`Expected phased mechanics for ${spellId}.`);
  }
  const phase = mechanics.phases[phaseIndex];
  if (phase?.kind !== "direct") {
    throw new Error(`Expected direct phase ${phaseIndex + 1} for ${spellId}.`);
  }
  return { mechanics, phase };
}

function directEffect(spellId: string, effectIndex = 0) {
  const { mechanics, phase } = directPhase(spellId);
  const effect = phase.effects?.[effectIndex];
  if (effect === undefined) {
    throw new Error(`Expected effect ${effectIndex + 1} for ${spellId}.`);
  }
  if (effect.kind === "push_unsecured_objects") {
    throw new Error(`Expected an ordinary effect for ${spellId}.`);
  }
  return { mechanics, effect };
}

function ongoingEffect(spellId: string, operationIndex = 0) {
  const mechanics = spellRecord(spellId).mechanics;
  if (mechanics.family !== "ongoing_effect") {
    throw new Error(`Expected ongoing mechanics for ${spellId}.`);
  }
  const operation = mechanics.operations[operationIndex];
  if (operation === undefined) {
    throw new Error(`Expected operation ${operationIndex + 1} for ${spellId}.`);
  }
  if (operation.effect.kind === "creature_type_ward") {
    throw new Error(`Expected an ordinary ongoing effect for ${spellId}.`);
  }
  return { mechanics, effect: operation.effect };
}

function ongoingAttachment(spellId: string) {
  const mechanics = spellRecord(spellId).mechanics;
  if (mechanics.family !== "ongoing_effect") {
    throw new Error(`Expected ongoing mechanics for ${spellId}.`);
  }
  return mechanics.attachment;
}

function saveGateEffect(spellId: string) {
  const mechanics = spellRecord(spellId).mechanics;
  if (mechanics.family !== "activation") {
    throw new Error(`Expected activation mechanics for ${spellId}.`);
  }
  const phase = mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    throw new Error(`Expected save-gate phase for ${spellId}.`);
  }
  if (phase.onFail.kind !== "modify_roll_numeric") {
    throw new Error(`Expected numeric failed-save effect for ${spellId}.`);
  }
  return { mechanics, phase, effect: phase.onFail };
}

function isPhasedMechanics(
  mechanics: SpellMechanics,
): mechanics is PhasedMechanics {
  return (
    mechanics.family === "activation" ||
    mechanics.family === "triggered_reaction"
  );
}

function spellCastingTime(spellId: string): TopLevelSpellCastingTime {
  const castingTime = topLevelSpellCastingTime(spellRecord(spellId).mechanics);
  if (castingTime === null) {
    throw new Error(`Expected top-level casting time for ${spellId}.`);
  }
  return castingTime;
}

function numericEffect(effect: EffectAtom | OngoingEffect) {
  if (effect.kind !== "modify_roll_numeric") {
    throw new Error("Expected a numeric roll-modifier effect.");
  }
  return effect;
}

function advantageEffect(effect: EffectAtom | OngoingEffect) {
  if (effect.kind !== "modify_roll_advantage") {
    throw new Error("Expected an advantage roll-modifier effect.");
  }
  return effect;
}

describe("SR-04G support and reaction projection boundaries", () => {
  test("projects scalar support facts from canonical spell shapes", () => {
    expect(
      sameCreatureTypeSet(["beast", "humanoid"], ["humanoid", "beast"]),
    ).toBe(true);
    expect(sameCreatureTypeSet(["humanoid", "humanoid"], ["humanoid"])).toBe(
      false,
    );
    expect(sameCreatureTypeSet(["beast"], ["humanoid"])).toBe(false);

    expect(scalarBuffSpellActionCost(spellCastingTime("aid"))).toBe(
      "magicAction",
    );
    expect(scalarBuffSpellActionCost(spellCastingTime("healing_word"))).toBe(
      "bonusAction",
    );
    expect(scalarBuffSpellActionCost(spellCastingTime("shield"))).toBeNull();
    expect(
      scalarBuffSpellRangeFeet(spellRecord("false_life").mechanics.range),
    ).toEqual(movementFeet(0));
    expect(
      scalarBuffSpellRangeFeet(spellRecord("mage_armor").mechanics.range),
    ).toEqual(movementFeet(5));
    expect(
      scalarBuffSpellRangeFeet(spellRecord("aid").mechanics.range),
    ).toEqual(movementFeet(30));

    const selfAttachment = directPhase("false_life").phase.attachment;
    const willingAttachment = directPhase("fly").phase.attachment;
    const objectAttachment = {
      kind: "hole",
      holeId: "sr04g_object_target",
      value: {
        kind: "target",
        selection: { mode: "one", targetKinds: ["object"] },
      },
    } satisfies Attachment;
    expect(
      scalarBuffSpellTargeting(selfAttachment, 1, spellSlotLevel(1)),
    ).toEqual({
      kind: "self",
    });
    expect(
      scalarBuffSpellTargeting(willingAttachment, 3, spellSlotLevel(3)),
    ).toEqual({
      kind: "targetList",
      minTargets: 1,
      maxTargets: 1,
      requiredTargetDisposition: "willing",
    });
    expect(
      scalarBuffSpellTargeting(objectAttachment, 1, spellSlotLevel(1)),
    ).toBeNull();

    const oneCreature = {
      mode: "one",
      targetKinds: ["creature"],
    } as const;
    const willingCreature = {
      mode: "one",
      targetKinds: ["creature"],
      disposition: "willing",
    } as const;
    expect(creatureTargetSelection(oneCreature)).toBe(true);
    expect(willingCreatureTargetSelection(willingCreature)).toBe(true);
    expect(willingCreatureTargetSelection(oneCreature)).toBe(false);
  });

  test("projects every admitted scalar active-effect family exactly", () => {
    const falseLife = directEffect("false_life");
    const falseLifeEffect = falseLife.effect;
    if (falseLifeEffect.kind !== "grant_temp_hp") {
      throw new Error("Expected False Life temporary hit points.");
    }
    expect(
      supportedTemporaryHitPointsAmountExpr(
        falseLifeEffect.amount,
        falseLife.mechanics.level,
        spellSlotLevel(1),
      ),
    ).toEqual({ dice: 2, dieSize: 4, flat: 4 });
    expect(
      supportedTemporaryHitPointsAmountExpr(
        falseLifeEffect.amount,
        falseLife.mechanics.level + 1,
        spellSlotLevel(1),
      ),
    ).toBeNull();
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spellAdmissionSource(spellRecord("false_life")),
        falseLifeEffect,
        falseLife.mechanics.duration,
        falseLife.mechanics.level,
        spellSlotLevel(1),
      ),
    ).toEqual({
      kind: "temporaryHitPoints",
      amount: { expr: { dice: 2, dieSize: 4, flat: 4 } },
    });

    const spiderClimb = directEffect("spider_climb");
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spellAdmissionSource(spellRecord("spider_climb")),
        spiderClimb.effect,
        spiderClimb.mechanics.duration,
        spiderClimb.mechanics.level,
        spellSlotLevel(2),
      ),
    ).toEqual({
      kind: "activeEffect",
      activeEffect: {
        kind: "specialSpeedGrant",
        sourceCombatantId: spellCasterId,
        speedKind: "climb",
        speed: { kind: "equalToSpeed" },
        hover: false,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: 600,
        },
      },
    });

    const fly = directEffect("fly");
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spellAdmissionSource(spellRecord("fly")),
        fly.effect,
        fly.mechanics.duration,
        fly.mechanics.level,
        spellSlotLevel(3),
      ),
    ).toEqual({
      kind: "activeEffect",
      activeEffect: {
        kind: "specialSpeedGrant",
        sourceCombatantId: spellCasterId,
        speedKind: "fly",
        speed: { kind: "fixed", speedFeet: 60 },
        hover: true,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: 100,
        },
      },
    });

    const longstrider = directEffect("longstrider");
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spellAdmissionSource(spellRecord("longstrider")),
        longstrider.effect,
        longstrider.mechanics.duration,
        longstrider.mechanics.level,
        spellSlotLevel(1),
      ),
    ).toEqual({
      kind: "activeEffect",
      activeEffect: {
        kind: "speedDelta",
        sourceCombatantId: spellCasterId,
        deltaFeet: 10,
        expiresAt: { kind: "duration", durationTicks: 600 },
      },
    });

    const shieldOfFaith = directEffect("shield_of_faith");
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spellAdmissionSource(spellRecord("shield_of_faith")),
        shieldOfFaith.effect,
        shieldOfFaith.mechanics.duration,
        shieldOfFaith.mechanics.level,
        spellSlotLevel(1),
      ),
    ).toEqual({
      kind: "activeEffect",
      activeEffect: {
        kind: "spellArmorClassBonus",
        sourceCombatantId: spellCasterId,
        bonus: 2,
        negatesRepeatedDamageAllocation: false,
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      },
    });

    const barkskin = ongoingEffect("barkskin");
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spellAdmissionSource(spellRecord("barkskin")),
        barkskin.effect,
        barkskin.mechanics.duration,
        barkskin.mechanics.level,
        spellSlotLevel(2),
      ),
    ).toEqual({
      kind: "activeEffect",
      activeEffect: {
        kind: "spellArmorClassFloor",
        sourceCombatantId: spellCasterId,
        floor: 17,
        expiresAt: { kind: "duration", durationTicks: 600 },
      },
    });

    const aid = directEffect("aid");
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spellAdmissionSource(spellRecord("aid")),
        aid.effect,
        aid.mechanics.duration,
        aid.mechanics.level,
        spellSlotLevel(4),
      ),
    ).toEqual({
      kind: "hitPointMaximumIncrease",
      activeEffect: {
        kind: "hitPointMaximumIncrease",
        sourceCombatantId: spellCasterId,
        amount: 15,
        expiresAt: { kind: "duration", durationTicks: 4800 },
      },
    });

    const haste = directEffect("haste", 0);
    expect(
      scalarBuffSpellEffect(
        spellCasterId,
        spellAdmissionSource(spellRecord("haste")),
        haste.effect,
        haste.mechanics.duration,
        haste.mechanics.level,
        spellSlotLevel(3),
      ),
    ).toBeNull();

    expect(
      scalarBuffActiveEffectExpiration(
        spellCasterId,
        spellRecord("bless").mechanics.duration,
      ),
    ).toEqual({ kind: "concentration", combatantId: spellCasterId });
    expect(
      scalarBuffActiveEffectExpiration(
        spellCasterId,
        spellRecord("aid").mechanics.duration,
      ),
    ).toEqual({ kind: "duration", durationTicks: 4800 });
    expect(
      scalarBuffActiveEffectExpiration(
        spellCasterId,
        spellRecord("false_life").mechanics.duration,
      ),
    ).toBeNull();
  });

  test("projects canonical numeric and ability-choice roll modifiers", () => {
    const guidance = numericEffect(ongoingEffect("guidance").effect);
    const bless = numericEffect(ongoingEffect("bless").effect);
    const enhanceAbility = advantageEffect(
      ongoingEffect("enhance_ability").effect,
    );
    const bane = saveGateEffect("bane");

    expect(rollModifierDelta(guidance.delta)).toEqual({
      dice: 1,
      dieSize: 4,
      sign: "+",
    });
    expect(rollModifierKindsAreSupported(bless.on)).toBe(true);
    expect(rollModifierKindsAreSupported(["death_saving_throw"])).toBe(false);
    expect(rollModifierSkillFilter(guidance.skillFilter)).toMatchObject({
      kind: "choice",
    });
    expect(rollModifierSkillFilter(undefined)).toEqual({ kind: "none" });

    const concentrationExpiration = scalarBuffActiveEffectExpiration(
      spellCasterId,
      spellRecord("bless").mechanics.duration,
    );
    if (concentrationExpiration === null) {
      throw new Error("Expected Bless concentration expiration.");
    }
    expect(
      rollModifierActiveEffect(
        spellCasterId,
        spellAdmissionSource(spellRecord("bless")),
        bless,
        concentrationExpiration,
      ),
    ).toEqual({
      kind: "d20RollModifier",
      sourceCombatantId: spellCasterId,
      on: ["attack_roll", "saving_throw"],
      delta: { dice: 1, dieSize: 4, sign: "+" },
      skillFilter: { kind: "none" },
      expiresAt: { kind: "concentration", combatantId: spellCasterId },
    });
    expect(
      rollModifierActiveEffect(
        spellCasterId,
        spellAdmissionSource(spellRecord("bane")),
        bane.effect,
        concentrationExpiration,
      ),
    ).toEqual({
      kind: "d20RollModifier",
      sourceCombatantId: spellCasterId,
      on: ["attack_roll", "saving_throw"],
      delta: { dice: 1, dieSize: 4, sign: "-" },
      skillFilter: { kind: "none" },
      expiresAt: { kind: "concentration", combatantId: spellCasterId },
    });

    expect(
      rollModifierAbilityCheckRollModeEffect(
        spellCasterId,
        spellAdmissionSource(spellRecord("enhance_ability")),
        enhanceAbility,
        concentrationExpiration,
      ),
    ).toEqual({
      effect: {
        kind: "abilityCheckRollMode",
        sourceCombatantId: spellCasterId,
        mode: "advantage",
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      },
      abilityChoices: ["str", "dex", "int", "wis", "cha"],
      abilityChoiceApplication: "perTarget",
    });

    const hasteRollMode = advantageEffect(directEffect("haste", 2).effect);
    expect(
      rollModifierAbilityCheckRollModeEffect(
        spellCasterId,
        spellAdmissionSource(spellRecord("haste")),
        hasteRollMode,
        concentrationExpiration,
      ),
    ).toBeNull();

    const guidanceProjection = rollModifierSpellProjection(
      spellCasterId,
      spellAdmissionSource(spellRecord("guidance")),
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
    expect(guidanceProjection).toMatchObject({
      rangeFeet: 5,
      saveGate: null,
      abilityChoices: null,
      targeting: { kind: "targetList", maxTargets: 1 },
    });
    expect(enhanceProjection).toMatchObject({
      rangeFeet: 5,
      saveGate: null,
      abilityChoices: ["str", "dex", "int", "wis", "cha"],
      abilityChoiceApplication: "perTarget",
    });
    expect(baneProjection).toMatchObject({
      rangeFeet: 30,
      saveGate: { ability: "cha", dc: { kind: "caster_spell_save_dc" } },
      abilityChoices: null,
      targeting: { kind: "targetList", maxTargets: 3 },
    });
    if (guidanceProjection === null || enhanceProjection === null) {
      throw new Error("Expected canonical roll-modifier projections.");
    }
    expect(isD20RollModifierSpellProjection(guidanceProjection)).toBe(true);
    expect(isD20RollModifierSpellProjection(enhanceProjection)).toBe(false);

    expect(
      rollModifierSpellTargeting(
        ongoingAttachment("pass_without_trace"),
        2,
        spellSlotLevel(2),
      ),
    ).toEqual({ kind: "selfAndChosenLegalTargets", minTargets: 1 });
    expect(
      rollModifierSpellTargeting(
        saveGateEffect("enthrall").phase.attachment,
        3,
        spellSlotLevel(3),
      ),
    ).toEqual({
      kind: "targetList",
      minTargets: 1,
      maxTargets: "allLegalTargets",
      requiredTargetDisposition: "unrestricted",
    });
    expect(
      rollModifierSpellTargeting(
        ongoingAttachment("bless"),
        1,
        spellSlotLevel(1),
      ),
    ).toMatchObject({ kind: "targetList", maxTargets: 3 });
  });
});
