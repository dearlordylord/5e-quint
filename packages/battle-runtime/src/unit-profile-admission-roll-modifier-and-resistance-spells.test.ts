// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV30B bane bless guidance
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-MISSING-ENHANCE-ABILITY enhance_ability
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV30F resistance
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-roll-modifier spell.invocation-damage-reduction
import { describe, expect, test } from "vitest";
import {
  baneUnitId,
  blessUnitId,
  enhanceAbilityUnitId,
  guidanceUnitId,
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
  spellTargetFill,
  spellTargetListFill,
  withResistanceEffect,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  cantripSpellInvocationRef,
  combatantId,
  endTurn,
  Hp,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./unit-profile-admission-test-support.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";

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
