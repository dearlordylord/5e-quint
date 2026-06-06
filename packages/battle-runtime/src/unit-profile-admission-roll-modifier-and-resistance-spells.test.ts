// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV30B bane bless guidance
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-PASS-WITHOUT-TRACE pass_without_trace
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3SPELL-01-ENHANCE-ABILITY-UPCAST-PER-TARGET enhance_ability
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-ENTHRALL-PERCEPTION-RUNTIME enthrall
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-PROTECTION-FROM-POISON protection_from_poison
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV30F resistance
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-roll-modifier spell.invocation-damage-reduction spell.invocation-condition-removal-protection
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
import { describe, expect, test } from "vitest";
import {
  baneUnitId,
  blessUnitId,
  enhanceAbilityUnitId,
  enthrallUnitId,
  guidanceUnitId,
  passWithoutTraceUnitId,
  poisonSprayUnitId,
  protectionFromPoisonUnitId,
  rayOfFrostUnitId,
  resistanceUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackDamageDispositionFill,
  attackRollFill,
  attackTargetFill,
  completedWeaponDamageInput,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  abilityChoiceFill,
  requireSpellDamageReductionHole,
  savingThrowOutcomeFill,
  skillChoiceFill,
  spellAct,
  targetAbilityChoicesFill,
  spellTargetFill,
  spellTargetListFill,
  withResistanceEffect,
} from "./unit-profile-admission-spell-fill-support.ts";
import {
  spellRollModifierAbilityChoiceHoleId,
  spellRollModifierSkillChoiceHoleId,
  spellRollModifierTargetAbilityChoicesHoleId,
  spellSavingThrowOutcomeHoleId,
  spellTargetListHoleId,
} from "./battle-reducer/spells-holes-fills.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  applyCondition,
  battleCreatureStateWithKnockOutPreservedConditions,
  breakBattleConcentration,
  cantripSpellInvocationRef,
  combatantId,
  elapsedTimeTicks,
  endTurn,
  hasCondition,
  Hp,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./unit-profile-admission-test-support.ts";
import {
  passivePerceptionModifierDelta,
  requiredAbilityCheckRollMode,
} from "./battle-reducer/hole-helpers.ts";
import { BattleHoleSchema } from "./index.ts";
import { Either, Schema } from "effect";

function withProtectionFromPoisonResistance(
  state: BattleState,
  targetId: typeof spellTargetId,
): BattleState {
  const target = requireCombatant(state, targetId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects,
        {
          kind: "damageResistance" as const,
          sourceSpellId: protectionFromPoisonUnitId,
          sourceCombatantId: spellCasterId,
          damageType: "poison" as const,
          expiresAt: {
            kind: "duration" as const,
            durationTicks: elapsedTimeTicks(600),
          },
        },
      ],
    }),
  };
}

describe("SRDINV30B deterministic roll modifier Spell Unit admission", () => {
  test("bless is admitted as a concentration d4 bonus with slot-scaled targets", () => {
    const spell = spellRecord(blessUnitId);
    const secondTargetId = combatantId("unit-profile-bless-target-2");
    const thirdTargetId = combatantId("unit-profile-bless-target-3");
    const fourthTargetId = combatantId("unit-profile-bless-target-4");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      extraTargetIds: [secondTargetId, thirdTargetId, fourthTargetId],
    });
    const act = spellAct({ state, spellId: blessUnitId, slotLevel: 2 });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(blessUnitId, 2, "rollModifier"),
      mode: { tag: "cast" },
    });
    expect(targetListHole).toEqual(
      expect.objectContaining({ minTargets: 1, maxTargets: 4 }),
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetListHole, spellCasterId, blessUnitId, [
          spellTargetId,
          secondTargetId,
          thirdTargetId,
          fourthTargetId,
        ]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            concentrating: true,
          }),
          expect.anything(),
          expect.anything(),
          expect.anything(),
          expect.anything(),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Bless to resolve.");
    }
    expect(
      resolved.state.combatants.get(spellTargetId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "d20RollModifier",
        sourceSpellId: blessUnitId,
        sourceCombatantId: spellCasterId,
        on: ["attack_roll", "saving_throw"],
        delta: { dice: 1, dieSize: 4, sign: "+" },
        skill: null,
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      }),
    );
  });

  test("recasting bless replaces prior concentration-owned roll modifiers without removing the new one", () => {
    const spell = spellRecord(blessUnitId);
    const secondTargetId = combatantId("unit-profile-bless-recast-target-2");
    const state = spellBattle({
      preparedSpells: [spell],
      extraTargetIds: [secondTargetId],
    });
    const caster = state.combatants.get(spellCasterId);
    const firstTarget = state.combatants.get(spellTargetId);
    const secondTarget = state.combatants.get(secondTargetId);
    if (
      caster === undefined ||
      firstTarget === undefined ||
      secondTarget === undefined
    ) {
      throw new Error("Expected Bless recast combatants.");
    }
    const priorBlessEffect = {
      kind: "d20RollModifier" as const,
      sourceSpellId: blessUnitId,
      sourceCombatantId: spellCasterId,
      on: ["attack_roll", "saving_throw"] as const,
      delta: { dice: 1, dieSize: 4, sign: "+" } as const,
      skill: null,
      expiresAt: { kind: "concentration" as const, combatantId: spellCasterId },
    };
    const stateWithPriorBless: BattleState = {
      ...state,
      combatants: new Map(state.combatants)
        .set(spellCasterId, {
          ...caster,
          concentration: {
            sourceSpellId: blessUnitId,
            effectKind: "spellEffect",
          },
        })
        .set(spellTargetId, {
          ...firstTarget,
          activeEffects: [...firstTarget.activeEffects, priorBlessEffect],
        })
        .set(secondTargetId, {
          ...secondTarget,
          activeEffects: [...secondTarget.activeEffects, priorBlessEffect],
        }),
    };
    const act = spellAct({ state: stateWithPriorBless, spellId: blessUnitId });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");

    const resolved = resolveBattleSubject({
      state: stateWithPriorBless,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetListHole, spellCasterId, blessUnitId, [
          spellTargetId,
        ]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Bless recast to resolve.");
    }
    expect(resolved.state.combatants.get(spellCasterId)?.concentration).toEqual(
      {
        sourceSpellId: blessUnitId,
        effectKind: "spellEffect",
      },
    );
    expect(
      resolved.state.combatants
        .get(spellTargetId)
        ?.activeEffects.filter(
          (effect) =>
            effect.kind === "d20RollModifier" &&
            effect.sourceSpellId === blessUnitId,
        ),
    ).toEqual([
      expect.objectContaining({
        sourceSpellId: blessUnitId,
        sourceCombatantId: spellCasterId,
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      }),
    ]);
    expect(
      resolved.state.combatants
        .get(secondTargetId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "d20RollModifier" &&
            effect.sourceSpellId === blessUnitId,
        ),
    ).toBe(false);
  });

  test("bane applies its negative d4 modifier only to targets that fail the Charisma save", () => {
    const spell = spellRecord(baneUnitId);
    const secondTargetId = combatantId("unit-profile-bane-target-2");
    const state = spellBattle({
      preparedSpells: [spell],
      extraTargetIds: [secondTargetId],
    });
    const act = spellAct({ state, spellId: baneUnitId });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(
      targetListHole,
      spellCasterId,
      baneUnitId,
      [spellTargetId, secondTargetId],
    );
    const awaitingSaves = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    });
    const saveHole = requireResultHole(awaitingSaves, "savingThrowOutcome");

    expect(saveHole).toEqual(
      expect.objectContaining({
        ability: "cha",
        targetRollModes: [],
      }),
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: false },
          { targetId: secondTargetId, succeeded: true },
        ]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Bane to resolve.");
    }
    expect(
      resolved.state.combatants.get(spellTargetId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "d20RollModifier",
        sourceSpellId: baneUnitId,
        on: ["attack_roll", "saving_throw"],
        delta: { dice: 1, dieSize: 4, sign: "-" },
      }),
    );
    expect(
      resolved.state.combatants
        .get(secondTargetId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "d20RollModifier" &&
            effect.sourceSpellId === baneUnitId,
        ),
    ).toBe(false);
  });

  test("guidance requires a cast-time skill choice and stores it on the d4 ability-check modifier", () => {
    const spell = spellRecord(guidanceUnitId);
    const state = spellBattle({ cantrips: [spell], spellSlots: [] });
    const act = spellAct({ state, spellId: guidanceUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const skillHole = requireHole(act.initialHoles, "skillChoice");

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(guidanceUnitId, "rollModifier"),
      mode: { tag: "cast" },
    });
    expect(skillHole.choices).toContain("stealth");
    expect(targetHole.choices).toEqual([spellCasterId]);

    const unwillingTarget = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          guidanceUnitId,
          spellCasterId,
          spellTargetId,
        ),
        skillChoiceFill(skillHole, "stealth"),
      ],
    });
    expect(unwillingTarget).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          guidanceUnitId,
          spellCasterId,
          spellCasterId,
        ),
        skillChoiceFill(skillHole, "stealth"),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Guidance to resolve.");
    }
    expect(
      resolved.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "d20RollModifier",
        sourceSpellId: guidanceUnitId,
        on: ["ability_check"],
        delta: { dice: 1, dieSize: 4, sign: "+" },
        skill: "stealth",
      }),
    );
  });

  test("pass without trace stores a fixed Stealth ability-check bonus on the caster and chosen creatures in the emanation", () => {
    const spell = spellRecord(passWithoutTraceUnitId);
    const secondTargetId = combatantId(
      "unit-profile-pass-without-trace-target-2",
    );
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      extraTargetIds: [secondTargetId],
    });
    const act = spellAct({
      state,
      spellId: passWithoutTraceUnitId,
      slotLevel: 2,
    });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        passWithoutTraceUnitId,
        2,
        "rollModifier",
      ),
      mode: { tag: "cast" },
    });
    expect(targetListHole).toEqual(
      expect.objectContaining({ minTargets: 1, maxTargets: 3 }),
    );

    const missingCaster = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(
          targetListHole,
          spellCasterId,
          passWithoutTraceUnitId,
          [spellTargetId],
        ),
      ],
    });
    expect(missingCaster).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(
          targetListHole,
          spellCasterId,
          passWithoutTraceUnitId,
          [spellCasterId, spellTargetId],
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Pass without Trace to resolve.");
    }
    expect(
      resolved.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "d20RollModifier",
        sourceSpellId: passWithoutTraceUnitId,
        sourceCombatantId: spellCasterId,
        on: ["ability_check"],
        delta: { dice: 10, dieSize: 1, sign: "+" },
        skill: "stealth",
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      }),
    );
    expect(
      resolved.state.combatants.get(spellTargetId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "d20RollModifier",
        sourceSpellId: passWithoutTraceUnitId,
        skill: "stealth",
      }),
    );
    expect(
      resolved.state.combatants
        .get(secondTargetId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "d20RollModifier" &&
            effect.sourceSpellId === passWithoutTraceUnitId,
        ),
    ).toBe(false);
  });

  test("enhance ability requires a chosen ability and projects Ability Check Advantage for that ability", () => {
    const spell = spellRecord(enhanceAbilityUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: enhanceAbilityUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const abilityHole = requireHole(act.initialHoles, "abilityChoice");

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        enhanceAbilityUnitId,
        2,
        "rollModifier",
      ),
      mode: { tag: "cast" },
    });
    expect(targetHole.choices).toContain(spellTargetId);
    expect(abilityHole.choices).toEqual(["str", "dex", "int", "wis", "cha"]);

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          enhanceAbilityUnitId,
          spellCasterId,
          spellTargetId,
        ),
        abilityChoiceFill(abilityHole, "dex"),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            concentrating: true,
          }),
          expect.anything(),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Enhance Ability to resolve.");
    }
    expect(
      resolved.state.combatants.get(spellTargetId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "abilityCheckRollMode",
        sourceSpellId: enhanceAbilityUnitId,
        sourceCombatantId: spellCasterId,
        mode: "advantage",
        ability: "dex",
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
        },
      }),
    );
    expect(
      requiredAbilityCheckRollMode(resolved.state, spellTargetId, "dex", {
        skill: "stealth",
      }),
    ).toBe("advantage");
    expect(
      requiredAbilityCheckRollMode(resolved.state, spellTargetId, "str", {
        skill: "athletics",
      }),
    ).toBeUndefined();
  });

  test("enthrall applies its fixed Perception penalty only to failed Wisdom saves from an unbounded caller-supplied target list", () => {
    const spell = spellRecord(enthrallUnitId);
    const secondTargetId = combatantId("unit-profile-enthrall-target-2");
    const thirdTargetId = combatantId("unit-profile-enthrall-target-3");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      extraTargetIds: [secondTargetId, thirdTargetId],
    });
    const act = spellAct({ state, spellId: enthrallUnitId, slotLevel: 2 });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(enthrallUnitId, 2, "rollModifier"),
      mode: { tag: "cast" },
    });
    expect(targetListHole).toEqual(
      expect.objectContaining({ minTargets: 1, maxTargets: 4 }),
    );

    const targetFill = spellTargetListFill(
      targetListHole,
      spellCasterId,
      enthrallUnitId,
      [spellTargetId, secondTargetId, thirdTargetId],
    );
    const awaitingSaves = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    });
    const saveHole = requireResultHole(awaitingSaves, "savingThrowOutcome");

    expect(saveHole).toEqual(
      expect.objectContaining({
        ability: "wis",
        targetRollModes: [],
      }),
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: false },
          { targetId: secondTargetId, succeeded: true },
          { targetId: thirdTargetId, succeeded: false },
        ]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            concentrating: true,
          }),
          expect.anything(),
          expect.anything(),
          expect.anything(),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Enthrall to resolve.");
    }
    const failedTargetEffect = {
      kind: "d20RollModifier" as const,
      sourceSpellId: enthrallUnitId,
      sourceCombatantId: spellCasterId,
      on: ["ability_check"] as const,
      delta: { kind: "fixedNumber" as const, amount: 10, sign: "-" as const },
      skill: "perception" as const,
      expiresAt: { kind: "concentration" as const, combatantId: spellCasterId },
    };
    expect(
      resolved.state.combatants.get(spellTargetId)?.activeEffects,
    ).toContainEqual(failedTargetEffect);
    expect(
      resolved.state.combatants.get(thirdTargetId)?.activeEffects,
    ).toContainEqual(failedTargetEffect);
    expect(
      resolved.state.combatants
        .get(secondTargetId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "d20RollModifier" &&
            effect.sourceSpellId === enthrallUnitId,
        ),
    ).toBe(false);
    expect(passivePerceptionModifierDelta(resolved.state, spellTargetId)).toBe(
      -10,
    );
    expect(passivePerceptionModifierDelta(resolved.state, secondTargetId)).toBe(
      0,
    );

    const ended = breakBattleConcentration(resolved.state, spellCasterId);
    expect(
      requireCombatant(ended, spellTargetId).activeEffects.some(
        (effect) =>
          effect.kind === "d20RollModifier" &&
          effect.sourceSpellId === enthrallUnitId,
      ),
    ).toBe(false);
    expect(passivePerceptionModifierDelta(ended, spellTargetId)).toBe(0);
  });

  test("enhance ability scales targets by slot and applies per-target ability choices", () => {
    const spell = spellRecord(enhanceAbilityUnitId);
    const secondTargetId = combatantId("unit-profile-enhance-target-2");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      extraTargetIds: [secondTargetId],
    });
    const act = spellAct({
      state,
      spellId: enhanceAbilityUnitId,
      slotLevel: 3,
    });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");
    const abilityByTargetHole = requireHole(
      act.initialHoles,
      "targetAbilityChoices",
    );

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        enhanceAbilityUnitId,
        3,
        "rollModifier",
      ),
      mode: { tag: "cast" },
    });
    expect(targetListHole.maxTargets).toBe(2);
    expect(abilityByTargetHole.choices).toEqual([
      "str",
      "dex",
      "int",
      "wis",
      "cha",
    ]);
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleHoleSchema)(abilityByTargetHole),
      ),
    ).toBe(true);
    if (!("abilityChoiceApplication" in abilityByTargetHole.spell)) {
      throw new Error(
        "Expected target ability choices hole to carry an ability-choice roll modifier invocation.",
      );
    }
    const {
      abilityChoiceApplication: _abilityChoiceApplication,
      ...spellWithoutAbilityChoiceApplication
    } = abilityByTargetHole.spell;
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...abilityByTargetHole,
          spell: spellWithoutAbilityChoiceApplication,
        }),
      ),
    ).toBe(true);

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(
          targetListHole,
          spellCasterId,
          enhanceAbilityUnitId,
          [spellTargetId, secondTargetId],
        ),
        targetAbilityChoicesFill(abilityByTargetHole, [
          { targetId: spellTargetId, ability: "dex" },
          { targetId: secondTargetId, ability: "wis" },
        ]),
      ],
    });

    expect(resolved.tag).toBe("resolved");
    if (resolved.tag !== "resolved") {
      throw new Error("Expected upcast Enhance Ability to resolve.");
    }
    expect(
      resolved.state.combatants.get(spellTargetId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "abilityCheckRollMode",
        sourceSpellId: enhanceAbilityUnitId,
        ability: "dex",
      }),
    );
    expect(
      resolved.state.combatants.get(secondTargetId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "abilityCheckRollMode",
        sourceSpellId: enhanceAbilityUnitId,
        ability: "wis",
      }),
    );
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster.origin.kind).toBe("character");
    if (caster.origin.kind !== "character") {
      throw new Error("Expected Enhance Ability caster to be a character.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 3, count: 1, expended: 1 },
    ]);
  });

  test("enhance ability higher-level slot rejects over-targeted and invalid per-target choices", () => {
    const spell = spellRecord(enhanceAbilityUnitId);
    const secondTargetId = combatantId("unit-profile-enhance-invalid-target-2");
    const thirdTargetId = combatantId("unit-profile-enhance-invalid-target-3");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      extraTargetIds: [secondTargetId, thirdTargetId],
    });
    const act = spellAct({
      state,
      spellId: enhanceAbilityUnitId,
      slotLevel: 3,
    });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");
    const abilityByTargetHole = requireHole(
      act.initialHoles,
      "targetAbilityChoices",
    );
    const validTargets = spellTargetListFill(
      targetListHole,
      spellCasterId,
      enhanceAbilityUnitId,
      [spellTargetId, secondTargetId],
    );

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetListFill(
            targetListHole,
            spellCasterId,
            enhanceAbilityUnitId,
            [spellTargetId, secondTargetId, thirdTargetId],
          ),
          targetAbilityChoicesFill(abilityByTargetHole, [
            { targetId: spellTargetId, ability: "dex" },
            { targetId: secondTargetId, ability: "wis" },
            { targetId: thirdTargetId, ability: "cha" },
          ]),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [validTargets],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "targetAbilityChoices" })],
    });

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          validTargets,
          {
            kind: "abilityChoice" as const,
            holeId: spellRollModifierAbilityChoiceHoleId(
              abilityByTargetHole.spell,
            ),
            value: "dex" as const,
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          validTargets,
          targetAbilityChoicesFill(abilityByTargetHole, [
            { targetId: spellTargetId, ability: "con" },
            { targetId: secondTargetId, ability: "wis" },
          ]),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          validTargets,
          targetAbilityChoicesFill(abilityByTargetHole, [
            { targetId: spellTargetId, ability: "dex" },
            { targetId: spellTargetId, ability: "wis" },
          ]),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("resistance stores a chosen damage-type reduction with a once-per-turn use marker", () => {
    const spell = spellRecord(resistanceUnitId);
    const state = spellBattle({ cantrips: [spell], spellSlots: [] });
    const act = spellAct({ state, spellId: resistanceUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const damageTypeHole = requireHole(act.initialHoles, "damageTypeChoice");

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        resistanceUnitId,
        "damageReduction",
      ),
      mode: { tag: "cast" },
    });
    expect(targetHole.choices).toEqual([spellCasterId]);
    expect(damageTypeHole.choices).toEqual([
      "acid",
      "bludgeoning",
      "cold",
      "fire",
      "lightning",
      "necrotic",
      "piercing",
      "poison",
      "radiant",
      "slashing",
      "thunder",
    ]);

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          resistanceUnitId,
          spellCasterId,
          spellCasterId,
        ),
        {
          kind: "damageTypeChoice",
          holeId: damageTypeHole.holeId,
          value: "bludgeoning",
        },
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Resistance to resolve.");
    }
    expect(
      resolved.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellDamageReduction",
        sourceSpellId: resistanceUnitId,
        sourceCombatantId: spellCasterId,
        damageType: "bludgeoning",
        amount: { dice: 1, dieSize: 4 },
        usedThisTurn: false,
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      }),
    );
  });

  test("resistance rejects fill kinds owned by other spell procedures", () => {
    const spell = spellRecord(resistanceUnitId);
    const state = spellBattle({ cantrips: [spell], spellSlots: [] });
    const act = spellAct({ state, spellId: resistanceUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const damageTypeHole = requireHole(act.initialHoles, "damageTypeChoice");
    const invocation = damageTypeHole.spell;
    const baseFills = [
      spellTargetFill(
        targetHole,
        resistanceUnitId,
        spellCasterId,
        spellCasterId,
      ),
      {
        kind: "damageTypeChoice" as const,
        holeId: damageTypeHole.holeId,
        value: "bludgeoning" as const,
      },
    ];
    const nonDamageReductionFills = [
      {
        kind: "spellTargetList" as const,
        holeId: spellTargetListHoleId(invocation),
        value: { targetIds: [spellCasterId] },
        spatialFacts: [
          {
            kind: "spellTarget" as const,
            casterId: spellCasterId,
            targetId: spellCasterId,
            spellId: resistanceUnitId,
          },
        ],
      },
      {
        kind: "savingThrowOutcome" as const,
        holeId: spellSavingThrowOutcomeHoleId(invocation),
        value: {
          outcomes: [{ targetId: spellCasterId, succeeded: false }],
        },
      },
      {
        kind: "skillChoice" as const,
        holeId: spellRollModifierSkillChoiceHoleId(invocation),
        value: "stealth" as const,
      },
      {
        kind: "targetAbilityChoices" as const,
        holeId: spellRollModifierTargetAbilityChoicesHoleId(invocation),
        value: {
          choices: [{ targetId: spellCasterId, ability: "dex" as const }],
        },
      },
    ];

    for (const fill of nonDamageReductionFills) {
      expect(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [...baseFills, fill],
        }),
      ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    }
  });

  test("roll modifier delegated selection rejects non-owned fill kinds", () => {
    const guidanceSpell = spellRecord(guidanceUnitId);
    const guidanceState = spellBattle({
      cantrips: [guidanceSpell],
      spellSlots: [],
    });
    const guidanceAct = spellAct({
      state: guidanceState,
      spellId: guidanceUnitId,
    });
    const guidanceTargetHole = requireHole(
      guidanceAct.initialHoles,
      "targetChoice",
    );
    const guidanceSkillHole = requireHole(
      guidanceAct.initialHoles,
      "skillChoice",
    );
    const guidanceInvocation = guidanceSkillHole.spell;
    const guidanceTargetFill = spellTargetFill(
      guidanceTargetHole,
      guidanceUnitId,
      spellCasterId,
      spellCasterId,
    );
    const guidanceSkillFill = skillChoiceFill(guidanceSkillHole, "stealth");

    const targetListResult = resolveBattleSubject({
      state: guidanceState,
      subject: guidanceAct.subject,
      fills: [
        {
          kind: "spellTargetList" as const,
          holeId: spellTargetListHoleId(guidanceInvocation),
          value: { targetIds: [spellCasterId] },
          spatialFacts: [
            {
              kind: "spellTarget" as const,
              casterId: spellCasterId,
              targetId: spellCasterId,
              spellId: guidanceUnitId,
            },
          ],
        },
        guidanceSkillFill,
      ],
    });
    expect(targetListResult).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const targetAbilityResult = resolveBattleSubject({
      state: guidanceState,
      subject: guidanceAct.subject,
      fills: [
        guidanceTargetFill,
        guidanceSkillFill,
        {
          kind: "targetAbilityChoices" as const,
          holeId:
            spellRollModifierTargetAbilityChoicesHoleId(guidanceInvocation),
          value: {
            choices: [{ targetId: spellCasterId, ability: "dex" as const }],
          },
        },
      ],
    });
    expect(targetAbilityResult).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const savingThrowResult = resolveBattleSubject({
      state: guidanceState,
      subject: guidanceAct.subject,
      fills: [
        guidanceTargetFill,
        guidanceSkillFill,
        {
          kind: "savingThrowOutcome" as const,
          holeId: spellSavingThrowOutcomeHoleId(guidanceInvocation),
          value: {
            outcomes: [{ targetId: spellCasterId, succeeded: false }],
          },
        },
      ],
    });
    expect(savingThrowResult).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const blessSpell = spellRecord(blessUnitId);
    const blessState = spellBattle({
      preparedSpells: [blessSpell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const blessAct = spellAct({
      state: blessState,
      spellId: blessUnitId,
      slotLevel: 1,
    });
    const blessTargetListHole = requireHole(
      blessAct.initialHoles,
      "spellTargetList",
    );
    const skillChoiceResult = resolveBattleSubject({
      state: blessState,
      subject: blessAct.subject,
      fills: [
        spellTargetListFill(blessTargetListHole, spellCasterId, blessUnitId, [
          spellTargetId,
        ]),
        {
          kind: "skillChoice" as const,
          holeId: spellRollModifierSkillChoiceHoleId(blessTargetListHole.spell),
          value: "stealth" as const,
        },
      ],
    });
    expect(skillChoiceResult).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("resistance damage reduction consumes one matching d4 roll for the turn", () => {
    const baseState = spellBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      spellSlots: [],
    });
    const targetCombatant = baseState.combatants.get(spellTargetId);
    if (targetCombatant === undefined) {
      throw new Error("Expected spell target.");
    }
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(spellTargetId, {
        ...targetCombatant,
        activeEffects: [
          ...targetCombatant.activeEffects,
          {
            kind: "spellDamageReduction" as const,
            sourceSpellId: resistanceUnitId,
            sourceCombatantId: spellCasterId,
            damageType: "slashing" as const,
            amount: { dice: 1 as const, dieSize: 4 as const },
            usedThisTurn: false,
            expiresAt: {
              kind: "concentration" as const,
              combatantId: spellCasterId,
            },
          },
        ],
      }),
    };
    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      target,
      spellCasterId,
      spellTargetId,
      "Longsword",
    );
    const attack = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    const attackFill = attackRollFill(attack, {
      total: 18,
      naturalD20: 12,
    });
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill, attackFill],
      }),
      "rolledDice",
    );
    const needsReduction = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, attackFill, damageRollFillWithGroups(damage, [[4]])],
    });
    expect(needsReduction).toMatchObject({ tag: "needsHoles" });
    if (needsReduction.tag !== "needsHoles") {
      throw new Error("Expected Resistance reduction roll hole.");
    }
    const reduction = requireSpellDamageReductionHole(needsReduction.holes);
    expect(reduction.spellDamageReduction).toEqual({
      sourceSpellId: resistanceUnitId,
      sourceCombatantId: spellCasterId,
      targetId: spellTargetId,
      damageType: "slashing",
      amount: { dice: 1, dieSize: 4 },
    });

    const resolved = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill,
        attackFill,
        damageRollFillWithGroups(damage, [[4]]),
        damageRollFillWithGroups(reduction, [[3]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected attack to resolve.");
    }
    const damaged = resolved.state.combatants.get(spellTargetId);
    expect(damaged?.hp).toBe(Hp(Number(targetCombatant.hp) - 1));
    expect(damaged?.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "spellDamageReduction",
        sourceSpellId: resistanceUnitId,
        usedThisTurn: true,
      }),
    );
  });

  test("resistance does not offer a reduction for nonmatching damage or after the turn use is spent", () => {
    const baseState = spellBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      spellSlots: [],
    });
    const targetCombatant = requireCombatant(baseState, spellTargetId);
    const state = withResistanceEffect(
      baseState,
      spellTargetId,
      "piercing",
      false,
    );
    const attack = completedWeaponDamageInput(state);
    const resolved = resolveBattleSubject({
      state,
      subject: attack.subject,
      fills: attack.fills,
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected nonmatching attack to resolve.");
    }
    expect(resolved.state.combatants.get(spellTargetId)?.hp).toBe(
      Hp(Number(targetCombatant.hp) - 4),
    );

    const spentState = withResistanceEffect(
      baseState,
      spellTargetId,
      "slashing",
      true,
    );
    const spentAttack = completedWeaponDamageInput(spentState);
    const spentResolved = resolveBattleSubject({
      state: spentState,
      subject: spentAttack.subject,
      fills: spentAttack.fills,
    });
    expect(spentResolved).toMatchObject({ tag: "resolved" });
    if (spentResolved.tag !== "resolved") {
      throw new Error("Expected spent Resistance attack to resolve.");
    }
    expect(spentResolved.state.combatants.get(spellTargetId)?.hp).toBe(
      Hp(Number(targetCombatant.hp) - 4),
    );
  });

  test("resistance once-per-turn marker resets on the next turn boundary", () => {
    const baseState = spellBattle({ spellSlots: [] });
    const state = withResistanceEffect(
      baseState,
      spellTargetId,
      "slashing",
      true,
    );

    const reset = endTurn({ state, actorId: spellCasterId });

    expect(reset).toMatchObject({ tag: "resolved" });
    if (reset.tag !== "resolved") {
      throw new Error("Expected end turn to resolve.");
    }
    expect(
      reset.state.combatants.get(spellTargetId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellDamageReduction",
        sourceSpellId: resistanceUnitId,
        damageType: "slashing",
        usedThisTurn: false,
      }),
    );
  });

  test("resistance applies to fixed attack damage and matching spell damage", () => {
    const fixedBase = spellBattle({ attack: null, spellSlots: [] });
    const fixedState = withResistanceEffect(
      fixedBase,
      spellTargetId,
      "bludgeoning",
      false,
    );
    const unarmedSubject: Extract<BattleSubject, { readonly tag: "action" }> = {
      tag: "action",
      actorId: spellCasterId,
      action: "attack",
      attackName: "Unarmed Strike",
    };
    const target = requireResultHole(
      resolveBattleSubject({
        state: fixedState,
        subject: unarmedSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
    const attack = requireResultHole(
      resolveBattleSubject({
        state: fixedState,
        subject: unarmedSubject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const needsFixedReduction = resolveBattleSubject({
      state: fixedState,
      subject: unarmedSubject,
      fills: [
        targetFill,
        attackRollFill(attack, { total: 18, naturalD20: 12 }),
      ],
    });
    expect(needsFixedReduction).toMatchObject({ tag: "needsHoles" });
    if (needsFixedReduction.tag !== "needsHoles") {
      throw new Error("Expected fixed damage Resistance roll.");
    }
    const fixedReduction = requireSpellDamageReductionHole(
      needsFixedReduction.holes,
    );
    const fixedResolved = resolveBattleSubject({
      state: fixedState,
      subject: unarmedSubject,
      fills: [
        targetFill,
        attackRollFill(attack, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(fixedReduction, [[1]]),
      ],
    });
    expect(fixedResolved).toMatchObject({ tag: "resolved" });
    if (fixedResolved.tag !== "resolved") {
      throw new Error("Expected fixed damage attack to resolve.");
    }
    expect(fixedResolved.state.combatants.get(spellTargetId)?.hp).toBe(
      requireCombatant(fixedBase, spellTargetId).hp,
    );

    const spell = spellRecord(rayOfFrostUnitId);
    const spellBase = spellBattle({ cantrips: [spell], spellSlots: [] });
    const spellState = withResistanceEffect(
      spellBase,
      spellTargetId,
      "cold",
      false,
    );
    const act = spellAct({ state: spellState, spellId: rayOfFrostUnitId });
    const spellTarget = requireResultHole(
      resolveBattleSubject({
        state: spellState,
        subject: act.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const spellTargetFillValue = spellTargetFill(
      spellTarget,
      rayOfFrostUnitId,
      spellCasterId,
      spellTargetId,
    );
    const spellAttack = requireResultHole(
      resolveBattleSubject({
        state: spellState,
        subject: act.subject,
        fills: [spellTargetFillValue],
      }),
      "attackRoll",
    );
    const spellAttackFill = attackRollFill(spellAttack, {
      total: 18,
      naturalD20: 12,
    });
    const spellDamage = requireResultHole(
      resolveBattleSubject({
        state: spellState,
        subject: act.subject,
        fills: [spellTargetFillValue, spellAttackFill],
      }),
      "rolledDice",
    );
    const needsSpellReduction = resolveBattleSubject({
      state: spellState,
      subject: act.subject,
      fills: [
        spellTargetFillValue,
        spellAttackFill,
        damageRollFillWithGroups(spellDamage, [[4]]),
      ],
    });
    expect(needsSpellReduction).toMatchObject({ tag: "needsHoles" });
    if (needsSpellReduction.tag !== "needsHoles") {
      throw new Error("Expected spell damage Resistance roll.");
    }
    const spellReduction = requireSpellDamageReductionHole(
      needsSpellReduction.holes,
    );
    const spellResolved = resolveBattleSubject({
      state: spellState,
      subject: act.subject,
      fills: [
        spellTargetFillValue,
        spellAttackFill,
        damageRollFillWithGroups(spellDamage, [[4]]),
        damageRollFillWithGroups(spellReduction, [[3]]),
      ],
    });
    expect(spellResolved).toMatchObject({ tag: "resolved" });
    if (spellResolved.tag !== "resolved") {
      throw new Error("Expected spell damage to resolve.");
    }
    expect(spellResolved.state.combatants.get(spellTargetId)?.hp).toBe(
      Hp(Number(requireCombatant(spellBase, spellTargetId).hp) - 1),
    );
  });

  test("resistance Opportunity Attack replay preserves the reduction roll across follow-up holes", () => {
    const baseState = spellBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      spellSlots: [],
      targetHp: 1,
      targetMaxHp: 10,
    });
    const state = withResistanceEffect(
      baseState,
      spellTargetId,
      "slashing",
      false,
    );
    const subject: Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "opportunityAttack" }
    > = {
      tag: "runtimeCommand",
      actorId: spellCasterId,
      command: "opportunityAttack",
      reactorId: spellCasterId,
      targetId: spellTargetId,
      attackName: "Longsword",
    };
    const attack = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "attackRoll",
    );
    const attackFill = attackRollFill(attack, {
      total: 18,
      naturalD20: 12,
    });
    const damage = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [attackFill] }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damage, [[4]]);
    const needsReduction = resolveBattleSubject({
      state,
      subject,
      fills: [attackFill, damageFill],
    });
    expect(needsReduction).toMatchObject({ tag: "needsHoles" });
    if (needsReduction.tag !== "needsHoles") {
      throw new Error("Expected Resistance reduction roll hole.");
    }
    const reduction = requireSpellDamageReductionHole(needsReduction.holes);
    const reductionFill = damageRollFillWithGroups(reduction, [[3]]);
    const needsDisposition = resolveBattleSubject({
      state,
      subject,
      fills: [attackFill, damageFill, reductionFill],
    });
    expect(needsDisposition).toMatchObject({ tag: "needsHoles" });
    if (needsDisposition.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack damage disposition hole.");
    }
    const disposition = requireHole(
      needsDisposition.holes,
      "attackDamageDisposition",
    );

    const resolved = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackFill,
        damageFill,
        reductionFill,
        attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Opportunity Attack to resolve.");
    }
    const damaged = requireCombatant(resolved.state, spellTargetId);
    expect(damaged.hp).toBe(Hp(0));
    expect(damaged.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "spellDamageReduction",
        sourceSpellId: resistanceUnitId,
        usedThisTurn: true,
      }),
    );
  });
});

describe("L12G Protection from Poison deterministic Spell Unit admission", () => {
  test("protection_from_poison removes Poisoned and stores condition-save Advantage plus poison Resistance", () => {
    const spell = spellRecord(protectionFromPoisonUnitId);
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const target = requireCombatant(baseState, spellTargetId);
    const state: BattleState = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(
        spellTargetId,
        battleCreatureStateWithKnockOutPreservedConditions(
          {
            ...target,
            activeEffects: [
              ...target.activeEffects,
              {
                kind: "spellCondition" as const,
                sourceSpellId: poisonSprayUnitId,
                sourceCombatantId: spellCasterId,
                condition: "poisoned" as const,
                conditionHadNonSpellSource: true,
                escape: null,
                turnStartDamage: null,
                expiresAt: {
                  kind: "duration" as const,
                  durationTicks: elapsedTimeTicks(600),
                },
              },
            ],
          },
          applyCondition(target.conditions, "poisoned"),
        ),
      ),
    };
    const act = spellAct({
      state,
      spellId: protectionFromPoisonUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        protectionFromPoisonUnitId,
        2,
        "conditionRemovalProtection",
      ),
      mode: { tag: "cast" },
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          protectionFromPoisonUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Protection from Poison to resolve.");
    }
    const protectedTarget = requireCombatant(resolved.state, spellTargetId);
    expect(hasCondition(protectedTarget.conditions, "poisoned")).toBe(false);
    expect(
      protectedTarget.activeEffects.some(
        (effect) =>
          effect.kind === "spellCondition" && effect.condition === "poisoned",
      ),
    ).toBe(false);
    expect(protectedTarget.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "conditionSavingThrowRollMode",
        sourceSpellId: protectionFromPoisonUnitId,
        sourceCombatantId: spellCasterId,
        condition: "poisoned",
        mode: "advantage",
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    );
    expect(protectedTarget.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "damageResistance",
        sourceSpellId: protectionFromPoisonUnitId,
        sourceCombatantId: spellCasterId,
        damageType: "poison",
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    );
  });

  test("protection_from_poison poison Resistance halves poison damage only", () => {
    const poisonSpell = spellRecord(poisonSprayUnitId);
    const poisonBase = spellBattle({
      cantrips: [poisonSpell],
      spellSlots: [],
    });
    const poisonState = withProtectionFromPoisonResistance(
      poisonBase,
      spellTargetId,
    );
    const act = spellAct({ state: poisonState, spellId: poisonSprayUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      targetHole,
      poisonSprayUnitId,
      spellCasterId,
      spellTargetId,
    );
    const attack = requireResultHole(
      resolveBattleSubject({
        state: poisonState,
        subject: act.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const attackFill = attackRollFill(attack, {
      total: 18,
      naturalD20: 12,
    });
    const damage = requireResultHole(
      resolveBattleSubject({
        state: poisonState,
        subject: act.subject,
        fills: [targetFill, attackFill],
      }),
      "rolledDice",
    );
    const poisonResolved = resolveBattleSubject({
      state: poisonState,
      subject: act.subject,
      fills: [targetFill, attackFill, damageRollFillWithGroups(damage, [[5]])],
    });
    expect(poisonResolved).toMatchObject({ tag: "resolved" });
    if (poisonResolved.tag !== "resolved") {
      throw new Error("Expected resisted poison damage to resolve.");
    }
    expect(poisonResolved.state.combatants.get(spellTargetId)?.hp).toBe(
      Hp(Number(requireCombatant(poisonBase, spellTargetId).hp) - 2),
    );

    const weaponBase = spellBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      spellSlots: [],
    });
    const weaponState = withProtectionFromPoisonResistance(
      weaponBase,
      spellTargetId,
    );
    const weaponAttack = completedWeaponDamageInput(weaponState);
    const weaponResolved = resolveBattleSubject({
      state: weaponState,
      subject: weaponAttack.subject,
      fills: weaponAttack.fills,
    });
    expect(weaponResolved).toMatchObject({ tag: "resolved" });
    if (weaponResolved.tag !== "resolved") {
      throw new Error("Expected non-poison weapon damage to resolve.");
    }
    expect(weaponResolved.state.combatants.get(spellTargetId)?.hp).toBe(
      Hp(Number(requireCombatant(weaponBase, spellTargetId).hp) - 4),
    );
  });

  test("protection_from_poison projects Advantage on Poisoned end-condition saves", () => {
    const baseState = spellBattle({ spellSlots: [] });
    const target = requireCombatant(baseState, spellTargetId);
    const state: BattleState = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(
        spellTargetId,
        battleCreatureStateWithKnockOutPreservedConditions(
          {
            ...target,
            activeEffects: [
              ...target.activeEffects,
              {
                kind: "spellConditionEndTurnSave" as const,
                sourceSpellId: poisonSprayUnitId,
                sourceCombatantId: spellCasterId,
                condition: "poisoned" as const,
                conditionHadNonSpellSource: false,
                heightenedSpellTargetDisadvantage: null,
                save: {
                  ability: "con" as const,
                  dc: { kind: "caster_spell_save_dc" as const },
                },
                expiresAt: {
                  kind: "duration" as const,
                  durationTicks: elapsedTimeTicks(600),
                },
              },
              {
                kind: "conditionSavingThrowRollMode" as const,
                sourceSpellId: protectionFromPoisonUnitId,
                sourceCombatantId: spellCasterId,
                condition: "poisoned" as const,
                mode: "advantage" as const,
                expiresAt: {
                  kind: "duration" as const,
                  durationTicks: elapsedTimeTicks(600),
                },
              },
            ],
          },
          applyCondition(target.conditions, "poisoned"),
        ),
      ),
    };
    const targetTurn = endTurn({ state, actorId: spellCasterId });
    expect(targetTurn).toMatchObject({ tag: "resolved" });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster turn to end.");
    }

    const awaitingSave = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    const save = requireResultHole(awaitingSave, "savingThrowOutcome");
    expect(save).toMatchObject({
      spellConditionEndTurnSave: {
        targetId: spellTargetId,
        condition: "poisoned",
      },
      ability: "con",
      targetRollModes: [{ targetId: spellTargetId, rollMode: "advantage" }],
    });

    const saved = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [
        savingThrowOutcomeFill(save, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(saved).toMatchObject({ tag: "resolved" });
    if (saved.tag !== "resolved") {
      throw new Error("Expected Poisoned end-condition save to resolve.");
    }
    const savedTarget = requireCombatant(saved.state, spellTargetId);
    expect(hasCondition(savedTarget.conditions, "poisoned")).toBe(false);
    expect(
      savedTarget.activeEffects.some(
        (effect) => effect.kind === "spellConditionEndTurnSave",
      ),
    ).toBe(false);
  });

  test("protection_from_poison protection expires after duration cleanup", () => {
    const spell = spellRecord(protectionFromPoisonUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: protectionFromPoisonUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          protectionFromPoisonUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Protection from Poison to resolve.");
    }

    const protectedTarget = requireCombatant(resolved.state, spellTargetId);
    const expiringTarget = {
      ...protectedTarget,
      activeEffects: protectedTarget.activeEffects.map((effect) =>
        (effect.kind === "conditionSavingThrowRollMode" ||
          effect.kind === "damageResistance") &&
        effect.sourceSpellId === protectionFromPoisonUnitId
          ? {
              ...effect,
              expiresAt: {
                kind: "duration" as const,
                durationTicks: elapsedTimeTicks(1),
              },
            }
          : effect,
      ),
    };
    const oneRoundRemaining: BattleState = {
      ...resolved.state,
      combatants: new Map(resolved.state.combatants).set(
        spellTargetId,
        expiringTarget,
      ),
    };
    const targetTurn = endTurn({
      state: oneRoundRemaining,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Protection from Poison caster turn to end.");
    }
    const nextRound = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(nextRound).toMatchObject({ tag: "resolved" });
    if (nextRound.tag !== "resolved") {
      throw new Error("Expected Protection from Poison duration tick.");
    }
    const expiredTarget = requireCombatant(nextRound.state, spellTargetId);
    expect(
      expiredTarget.activeEffects.some(
        (effect) =>
          (effect.kind === "conditionSavingThrowRollMode" ||
            effect.kind === "damageResistance") &&
          effect.sourceSpellId === protectionFromPoisonUnitId,
      ),
    ).toBe(false);
  });
});
