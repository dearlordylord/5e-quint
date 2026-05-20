// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV95 flame_blade
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-spell-created-held-object
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { difficultyClass, type HandUse } from "@dnd/shared/types";
import { decodeSpellRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  counterspellUnitId,
  flameBladeUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackRollFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  maybeSpellAct,
  spellAct,
  spellHoleInvocation,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  breakBattleConcentration,
  canSpendAction,
  classLevel,
  discoverBattleActs,
  elapsedTimeTicks,
  Hp,
  movementFeet,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  type BattleState,
} from "./unit-profile-admission-test-support.ts";
import {
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  type BattleFill,
  type CombatantId,
} from "./index.ts";

describe("SRDINV95 deterministic Flame Blade admission", () => {
  test("flame_blade casts as a Bonus Action slot spell and occupies the canonical free hand", () => {
    const spell = spellRecord(flameBladeUnitId);
    const state = flameBladeBattle();
    const act = bonusSpellAct({ state, spellId: flameBladeUnitId });

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          tag: "bonusActionSpell",
          actorId: spellCasterId,
          invocation: spellSlotInvocationRef(
            flameBladeUnitId,
            2,
            "spellCreatedHeldObject",
          ),
          mode: { tag: "cast" },
        },
        initialHoles: [],
      }),
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionAvailable: false,
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
        },
        lightEmitters: [
          {
            kind: "spellLightEmitter",
            sourceSpellId: flameBladeUnitId,
            sourceCombatantId: spellCasterId,
            attachment: { kind: "combatant", combatantId: spellCasterId },
            emission: {
              kind: "brightAndDim",
              brightRadiusFeet: movementFeet(10),
              dimAdditionalFeet: movementFeet(10),
            },
            opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
            expiresAt: {
              kind: "concentration",
              combatantId: spellCasterId,
              durationTicks: elapsedTimeTicks(100),
            },
          },
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Flame Blade to resolve.");
    }
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster.armorClass).toEqual(
      expect.objectContaining({
        leftHandUse: "spellCreatedHeldObject",
        rightHandUse: "mainWeapon",
      }),
    );
    expect(caster.concentration).toEqual({
      sourceSpellId: flameBladeUnitId,
      effectKind: "spellEffect",
    });
    expect(caster.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "spellCreatedHeldObject",
        sourceSpellId: flameBladeUnitId,
        sourceCombatantId: spellCasterId,
        objectState: { kind: "held" },
        light: { brightRadiusFeet: 10, dimAdditionalFeet: 10 },
        attack: {
          damage: {
            expr: { dice: 3, dieSize: 6, flat: 3 },
            damageType: "fire",
          },
          attackKind: "melee_spell_attack",
          attackBonus: 5,
        },
      }),
    );
    expect(
      caster.origin.kind === "character"
        ? caster.origin.spellcasting?.spellSlots
        : [],
    ).toEqual([{ spellLevel: 2, count: 1, expended: 1 }]);
    expect(spell.name).toBe("Flame Blade");
  });

  test("held flame_blade admits a Magic Action melee spell attack without a second Spell Slot spend", () => {
    const spell = spellRecord(flameBladeUnitId);
    const state = flameBladeBattle({ targetHp: 20, targetMaxHp: 20 });
    const cast = castFlameBlade(state);
    const attackAct = spellAct({
      state: cast.state,
      spellId: flameBladeUnitId,
    });

    expect(attackAct.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: {
        tag: "spellEffect",
        spellId: flameBladeUnitId,
        sourceCombatantId: spellCasterId,
        procedure: "spellCreatedHeldObjectAttack",
      },
      mode: { tag: "cast" },
    });
    expect(attackAct.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
    const targetFill = spellTargetFill(
      requireHole(attackAct.initialHoles, "targetChoice"),
      flameBladeUnitId,
      spellCasterId,
      spellTargetId,
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: cast.state,
        subject: attackAct.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation([attackRoll])).toEqual(
      expect.objectContaining({
        access: { tag: "spellEffect", sourceCombatantId: spellCasterId },
        resource: { tag: "none" },
        procedure: "spellCreatedHeldObjectAttack",
        spell,
        targeting: { kind: "singleCombatant" },
        damage: {
          expr: { dice: 3, dieSize: 6, flat: 3 },
          damageType: "fire",
        },
        rangeFeet: 5,
        attackKind: "melee_spell_attack",
        attackBonus: 5,
      }),
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state: cast.state,
        subject: attackAct.subject,
        fills: [
          targetFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage.label).toBe("Flame Blade damage (3d6+3-fire)");

    const resolved = resolveBattleSubject({
      state: cast.state,
      subject: attackAct.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[2, 3, 4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Flame Blade attack to resolve.");
    }
    expect(resolved.state.combatants.get(spellTargetId)?.hp).toStrictEqual(
      Hp(8),
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellCreatedHeldObject",
        objectState: { kind: "held" },
      }),
    );
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toHaveLength(1);
  });

  test("hidden flame_blade attacks keep Advantage for the roll and reveal after the attack roll", () => {
    const cast = castFlameBlade(
      flameBladeBattle({ targetHp: 20, targetMaxHp: 20 }),
    );
    const hidden = withHiddenCaster(cast.state);
    const attackAct = spellAct({ state: hidden, spellId: flameBladeUnitId });
    const targetFill = spellTargetFill(
      requireHole(attackAct.initialHoles, "targetChoice"),
      flameBladeUnitId,
      spellCasterId,
      spellTargetId,
    );
    const awaitingAttackRoll = resolveBattleSubject({
      state: hidden,
      subject: attackAct.subject,
      fills: [targetFill],
    });

    expect(awaitingAttackRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected hidden Flame Blade attack roll hole.");
    }
    const attackRoll = requireHole(awaitingAttackRoll.holes, "attackRoll");
    expect(attackRoll).toMatchObject({ rollMode: "advantage" });
    expect(
      requireCombatant(awaitingAttackRoll.state, spellCasterId).hidden,
    ).toEqual({ discoveryDc: difficultyClass(17) });

    const awaitingDamage = resolveBattleSubject({
      state: hidden,
      subject: attackAct.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, {
          total: 18,
          naturalD20: 12,
          rollMode: "advantage",
        }),
      ],
    });

    expect(awaitingDamage).toMatchObject({ tag: "needsHoles" });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected hidden Flame Blade damage hole.");
    }
    expect(
      requireCombatant(awaitingDamage.state, spellCasterId).hidden,
    ).toBeNull();
    const damage = requireHole(awaitingDamage.holes, "rolledDice");

    const resolved = resolveBattleSubject({
      state: hidden,
      subject: attackAct.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, {
          total: 18,
          naturalD20: 12,
          rollMode: "advantage",
        }),
        damageRollFillWithGroups(damage, [[2, 3, 4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected hidden Flame Blade attack to resolve.");
    }
    expect(requireCombatant(resolved.state, spellCasterId).hidden).toBeNull();
  });

  test("flame_blade attack rejects spell-cast Reaction facts", () => {
    const cast = castFlameBlade(flameBladeBattle());
    const attackAct = spellAct({
      state: cast.state,
      spellId: flameBladeUnitId,
    });
    const targetFill = spellTargetFill(
      requireHole(attackAct.initialHoles, "targetChoice"),
      flameBladeUnitId,
      spellCasterId,
      spellTargetId,
    );

    const rejected = resolveBattleSubject({
      state: cast.state,
      subject: attackAct.subject,
      fills: [
        targetFill,
        spellCastReactionFactsFill([
          counterspellTriggerFact({
            reactorId: spellTargetId,
            casterId: spellCasterId,
          }),
        ]),
      ],
    });

    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell-created held object attacks are not spell casts and do not accept spell-cast Reaction facts.",
    });
  });

  test("letting go removes flame_blade light and enables later Bonus Action re-evocation without a slot spend", () => {
    const state = flameBladeBattle();
    const cast = castFlameBlade(state);
    const releaseAct = releaseFlameBladeAct(cast.state);
    const released = resolveBattleSubject({
      state: cast.state,
      subject: releaseAct.subject,
      fills: [],
    });

    expect(released).toMatchObject({
      tag: "resolved",
      snapshot: { lightEmitters: [] },
    });
    if (released.tag !== "resolved") {
      throw new Error("Expected Flame Blade release to resolve.");
    }
    expect(
      maybeSpellAct({ state: released.state, spellId: flameBladeUnitId }),
    ).toBeUndefined();
    expect(
      requireCombatant(released.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellCreatedHeldObject",
        objectState: { kind: "notHeld" },
      }),
    );
    expect(requireCombatant(released.state, spellCasterId).armorClass).toEqual(
      expect.objectContaining({
        leftHandUse: "free",
        rightHandUse: "mainWeapon",
      }),
    );

    const nextCasterTurn = advanceToNextCasterTurn(released.state);
    const reEvokeAct = bonusSpellAct({
      state: nextCasterTurn,
      spellId: flameBladeUnitId,
    });
    expect(reEvokeAct.subject).toEqual({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      invocation: {
        tag: "spellEffect",
        spellId: flameBladeUnitId,
        sourceCombatantId: spellCasterId,
        procedure: "spellCreatedHeldObjectReEvoke",
      },
      mode: { tag: "cast" },
    });
    const reEvoked = resolveBattleSubject({
      state: nextCasterTurn,
      subject: reEvokeAct.subject,
      fills: [],
    });

    expect(reEvoked).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionAvailable: false,
          spellSlotUsesThisTurn: [],
        },
        lightEmitters: [
          expect.objectContaining({
            sourceSpellId: flameBladeUnitId,
            attachment: { kind: "combatant", combatantId: spellCasterId },
          }),
        ],
      },
    });
    if (reEvoked.tag !== "resolved") {
      throw new Error("Expected Flame Blade re-evocation to resolve.");
    }
    const caster = requireCombatant(reEvoked.state, spellCasterId);
    expect(caster.armorClass).toEqual(
      expect.objectContaining({
        leftHandUse: "spellCreatedHeldObject",
        rightHandUse: "mainWeapon",
      }),
    );
    expect(caster.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "spellCreatedHeldObject",
        objectState: { kind: "held" },
      }),
    );
    expect(
      caster.origin.kind === "character"
        ? caster.origin.spellcasting?.spellSlots
        : [],
    ).toEqual([{ spellLevel: 2, count: 1, expended: 1 }]);
  });

  test("flame_blade rejects canonical hand state with no free hand", () => {
    const state = flameBladeBattle();
    const act = bonusSpellAct({ state, spellId: flameBladeUnitId });
    const noFreeHand = withCasterHands(state, {
      leftHandUse: "shield",
      rightHandUse: "mainWeapon",
    });

    expect(
      maybeSpellAct({ state: noFreeHand, spellId: flameBladeUnitId }),
    ).toBeUndefined();

    const rejected = resolveBattleSubject({
      state: noFreeHand,
      subject: act.subject,
      fills: [],
    });

    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Spell-created held object requires a free hand.",
    });
  });

  test("flame_blade rejects fabricated held-object facts fills", () => {
    const state = flameBladeBattle();
    const act = bonusSpellAct({ state, spellId: flameBladeUnitId });

    const rejected = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          kind: "heldObjectFacts",
          holeId: holeId("synthetic:flame-blade:held-object-facts"),
          value: { objectIds: [] },
        },
      ],
    });

    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Fill heldObjectFacts does not match the spell replay holes.",
    });
  });

  test("held flame_blade blocks other canonical free-hand consumers", () => {
    const state = flameBladeBattle();
    expect(discoverBattleActs(state)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "action",
            action: "grapple",
          }),
        }),
      ]),
    );

    const cast = castFlameBlade(state);

    expect(discoverBattleActs(cast.state)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "action",
            action: "grapple",
          }),
        }),
      ]),
    );
  });

  test("flame_blade support admission rejects extra executable Surface facts", () => {
    const spell = spellRecord(flameBladeUnitId);
    const mechanics = requireOngoingEffectMechanics(spell);
    const initialPhase = mechanics.initialPhase;
    if (initialPhase?.kind !== "direct" || initialPhase.effects === undefined) {
      throw new Error("Expected Flame Blade to have initial Surface effects.");
    }
    const extraOperation = mechanics.operations[0];
    if (extraOperation === undefined) {
      throw new Error("Expected Flame Blade to have a Surface operation.");
    }
    const extraInitialEffect = initialPhase.effects[0];
    if (extraInitialEffect === undefined) {
      throw new Error(
        "Expected Flame Blade to have an initial Surface effect.",
      );
    }
    const unsupportedOperationSpell: SpellRecord = {
      ...spell,
      mechanics: {
        ...mechanics,
        operations: [...mechanics.operations, extraOperation],
      },
    };
    const unsupportedInitialEffectSpell = decodeSpellRecordSync({
      ...spell,
      mechanics: {
        ...mechanics,
        initialPhase: {
          ...initialPhase,
          effects: [...initialPhase.effects, extraInitialEffect],
        },
      },
    });

    for (const unsupportedSpell of [
      unsupportedOperationSpell,
      unsupportedInitialEffectSpell,
    ]) {
      const state = spellBattle({
        preparedSpells: [unsupportedSpell],
        spellSlots: [{ spellLevel: 2, count: 1 }],
        casterClassLevels: [{ className: "druid", level: classLevel(3) }],
        attack: zeroAbilityWeaponAttack("weapon_longsword"),
      });

      expect(
        maybeSpellAct({ state, spellId: flameBladeUnitId }),
      ).toBeUndefined();
    }
  });

  test("flame_blade concentration break and duration expiry remove the held blade light", () => {
    const cast = castFlameBlade(flameBladeBattle());
    const broken = breakBattleConcentration(cast.state, spellCasterId);

    expect(requireCombatant(broken, spellCasterId).concentration).toBeNull();
    expect(requireCombatant(broken, spellCasterId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "spellCreatedHeldObject" }),
      ]),
    );
    expect(requireCombatant(broken, spellCasterId).armorClass).toEqual(
      expect.objectContaining({
        leftHandUse: "free",
        rightHandUse: "mainWeapon",
      }),
    );
    expect(snapshotBattle(broken).lightEmitters).toEqual([]);

    const caster = requireCombatant(cast.state, spellCasterId);
    const nearlyExpired: BattleState = {
      ...cast.state,
      combatants: new Map(cast.state.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: caster.activeEffects.map((effect) =>
          effect.kind === "spellCreatedHeldObject" &&
          effect.expiresAt.kind === "concentration"
            ? {
                ...effect,
                expiresAt: {
                  ...effect.expiresAt,
                  durationTicks: elapsedTimeTicks(1),
                },
              }
            : effect,
        ),
      }),
    };
    const expired = advanceToNextCasterTurn(nearlyExpired);

    expect(requireCombatant(expired, spellCasterId).concentration).toBeNull();
    expect(requireCombatant(expired, spellCasterId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "spellCreatedHeldObject" }),
      ]),
    );
    expect(requireCombatant(expired, spellCasterId).armorClass).toEqual(
      expect.objectContaining({
        leftHandUse: "free",
        rightHandUse: "mainWeapon",
      }),
    );
    expect(snapshotBattle(expired).lightEmitters).toEqual([]);
  });
});

function flameBladeBattle(
  input: {
    readonly targetHp?: number;
    readonly targetMaxHp?: number;
  } = {},
): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(flameBladeUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    casterClassLevels: [{ className: "druid", level: classLevel(3) }],
    attack: zeroAbilityWeaponAttack("weapon_longsword"),
    ...input,
  });
}

function castFlameBlade(state: BattleState) {
  const act = bonusSpellAct({ state, spellId: flameBladeUnitId });
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [],
  });
  if (result.tag !== "resolved") {
    throw new Error("Expected Flame Blade cast to resolve.");
  }
  return result;
}

function releaseFlameBladeAct(state: BattleState) {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "releaseSpellCreatedHeldObject" &&
      candidate.subject.sourceSpellId === flameBladeUnitId,
  );
  if (act === undefined) {
    throw new Error("Expected Flame Blade release act.");
  }
  return act;
}

function advanceToNextCasterTurn(state: BattleState): BattleState {
  const casterEnd = resolveBattleSubject({
    state,
    subject: {
      tag: "runtimeCommand",
      actorId: spellCasterId,
      command: "endTurn",
    },
    fills: [],
  });
  if (casterEnd.tag !== "resolved") {
    throw new Error("Expected Flame Blade caster end turn.");
  }
  const targetEnd = resolveBattleSubject({
    state: casterEnd.state,
    subject: {
      tag: "runtimeCommand",
      actorId: spellTargetId,
      command: "endTurn",
    },
    fills: [],
  });
  if (targetEnd.tag !== "resolved") {
    throw new Error("Expected Flame Blade target end turn.");
  }
  return targetEnd.state;
}

function withCasterHands(
  state: BattleState,
  hands: {
    readonly leftHandUse: HandUse;
    readonly rightHandUse: HandUse;
  },
): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      armorClass: {
        ...caster.armorClass,
        ...hands,
      },
    }),
  };
}

function withHiddenCaster(state: BattleState): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      hidden: { discoveryDc: difficultyClass(17) },
    }),
  };
}

type SpellCastReactionFactsFill = Extract<
  BattleFill,
  { readonly kind: "targetSpatialFacts" }
>;

type CounterspellTriggerFact = Extract<
  SpellCastReactionFactsFill["spatialFacts"][number],
  { readonly kind: "counterspellTriggerCasterVisibleWithinRange" }
>;

function counterspellTriggerFact(input: {
  readonly reactorId: CombatantId;
  readonly casterId: CombatantId;
}): CounterspellTriggerFact {
  return {
    kind: "counterspellTriggerCasterVisibleWithinRange",
    reactorId: input.reactorId,
    casterId: input.casterId,
    spellId: counterspellUnitId,
    rangeFeet: movementFeet(60),
  };
}

function spellCastReactionFactsFill(
  spatialFacts: readonly CounterspellTriggerFact[],
): SpellCastReactionFactsFill {
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    spatialFacts,
  };
}

function requireOngoingEffectMechanics(
  spell: SpellRecord,
): Extract<SpellRecord["mechanics"], { readonly family: "ongoing_effect" }> {
  if (spell.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Flame Blade to be an ongoing-effect spell.");
  }
  return spell.mechanics;
}
