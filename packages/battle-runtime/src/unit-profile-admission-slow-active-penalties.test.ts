// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-SLOW-ACTIVE-PENALTIES-RUNTIME slow
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-SLOW-TURN-AND-SOMATIC-RUNTIME slow
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
import {
  canSpendAction,
  canSpendBonusAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { describe, expect, test } from "vitest";
import {
  activeEffectArmorClass,
  combatantCanTakeReactions,
} from "./battle-reducer/creature-state.ts";
import { SLOW_ACTIVE_PENALTIES_SOMATIC_FAILURE_PERCENT } from "./battle-reducer/domain-constants.ts";
import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import { savingThrowFlatBonusProjections } from "./battle-reducer/spells-damage-fills.ts";
import {
  attackRollFill,
  attackTargetFill,
  combatantId,
  commandUnitId,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  expeditiousRetreatUnitId,
  extraAttackBattleUnitRef,
  flamingSphereAreaId,
  flamingSphereRepositionAct,
  flamingSphereRepositionMovementFill,
  flamingSphereUnitId,
  maybeSpellAct,
  movementFeet,
  requireCombatant,
  requireHole,
  requireResultHole,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  singleTargetSavingThrowOutcomeFill,
  slowUnitId,
  spellAct,
  spellCasterId,
  spellSlotInvocationRef,
  spellTargetId,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-test-support.ts";
import type {
  AvailableBattleAct,
  BattleActiveEffect,
  BattleFill,
  BattleHole,
  BattleSpellSavingThrowOutcomeHole,
  BattleState,
  CombatantId,
} from "./unit-profile-admission-test-support.ts";
import { monsterMultiattackStatBlock } from "./battle-runtime-test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";

const slowExtraTargetId = combatantId("unit-profile-slow-extra-target");
const slowMultiattackTargetId = combatantId(
  "unit-profile-slow-multiattack-target",
);

describe("Task 12 deterministic Slow active-penalties admission", () => {
  test("Slow admits level-3+ Magic Action casting and applies failed-save active penalties", () => {
    const spell = spellRecord(slowUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
      extraTargetIds: [slowExtraTargetId],
    });

    expect(maybeSpellAct({ state, spellId: slowUnitId, slotLevel: 2 })).toBe(
      undefined,
    );
    const act = spellAct({
      state,
      spellId: slowUnitId,
      slotLevel: 3,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(slowUnitId, 3, "slowActivePenalties"),
      mode: { tag: "cast" },
    });

    const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Slow point-origin Cube Saving Throw outcomes",
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(savingThrow.spell).toEqual(
      expect.objectContaining({
        procedure: "slowActivePenalties",
        spell,
        resource: { tag: "spellSlot", slotLevel: 3 },
        targeting: { kind: "pointOriginCube", sideFeet: 40 },
        maxTargets: 6,
        rangeFeet: 120,
        durationTicks: elapsedTimeTicks(10),
      }),
    );

    const baseTarget = requireCombatant(state, spellTargetId);
    const baseArmorClass = Number(
      currentArmorClass(activeEffectArmorClass(baseTarget)),
    );
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        slowSavingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
          { targetId: slowExtraTargetId, succeeded: true },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error(`Expected Slow cast to resolve: ${JSON.stringify(cast)}`);
    }

    const target = requireCombatant(cast.state, spellTargetId);
    const savedTarget = requireCombatant(cast.state, slowExtraTargetId);
    expect(target.activeEffects).toEqual([
      expect.objectContaining({
        kind: "slowActivePenalties",
        sourceSpellId: slowUnitId,
        sourceCombatantId: spellCasterId,
        save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    ]);
    expect(savedTarget.activeEffects).toEqual([]);
    expect(Number(effectiveWalkSpeed(target))).toBe(15);
    expect(Number(currentArmorClass(activeEffectArmorClass(target)))).toBe(
      baseArmorClass - 2,
    );
    expect(savingThrowFlatBonusProjections(cast.state, "dex")).toEqual([
      {
        targetId: spellTargetId,
        sourceSpellId: slowUnitId,
        bonus: -2,
      },
    ]);
    expect(savingThrowFlatBonusProjections(cast.state, "wis")).toEqual([]);
    expect(combatantCanTakeReactions(target)).toBe(false);
    expect(requireCombatant(cast.state, spellCasterId).concentration).toEqual({
      sourceSpellId: slowUnitId,
      effectKind: "spellEffect",
    });
  });

  test("Slow rejects generic area save fills without Cube and chosen-creature witnesses", () => {
    const state = spellBattle({
      preparedSpells: [spellRecord(slowUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: slowUnitId, slotLevel: 3 });
    const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);

    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });

    expect(cast).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("successful end-of-target-turn save removes Slow penalties and clears Concentration", () => {
    const cast = castFailedSlow(
      spellBattle({
        preparedSpells: [spellRecord(slowUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
    );
    const slowed = requireCombatant(cast, spellTargetId);
    expect(Number(effectiveWalkSpeed(slowed))).toBe(15);
    expect(combatantCanTakeReactions(slowed)).toBe(false);

    const casterTurnEnded = endTurn({ state: cast, actorId: spellCasterId });
    if (casterTurnEnded.tag !== "resolved") {
      throw new Error("Expected Slow caster End Turn to resolve.");
    }
    const targetTurnNeedsSave = endTurn({
      state: casterTurnEnded.state,
      actorId: spellTargetId,
    });
    expect(targetTurnNeedsSave).toMatchObject({ tag: "needsHoles" });
    if (targetTurnNeedsSave.tag !== "needsHoles") {
      throw new Error("Expected Slow target End Turn to request a save.");
    }
    const repeatSave = requireSlowEndTurnSaveHole(targetTurnNeedsSave.holes);
    expect(repeatSave).toEqual(
      expect.objectContaining({
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
        slowActivePenaltiesEndTurnSave: {
          targetId: spellTargetId,
          sourceSpellId: slowUnitId,
          sourceCombatantId: spellCasterId,
          save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
        },
      }),
    );

    const saved = endTurn({
      state: casterTurnEnded.state,
      actorId: spellTargetId,
      fills: [
        singleTargetSavingThrowOutcomeFill(repeatSave, spellTargetId, true),
      ],
    });
    if (saved.tag !== "resolved") {
      throw new Error(
        `Expected Slow repeat save to resolve: ${JSON.stringify(saved)}`,
      );
    }

    const target = requireCombatant(saved.state, spellTargetId);
    expect(target.activeEffects).toEqual([]);
    expect(Number(effectiveWalkSpeed(target))).toBe(30);
    expect(combatantCanTakeReactions(target)).toBe(true);
    expect(savingThrowFlatBonusProjections(saved.state, "dex")).toEqual([]);
    expect(
      requireCombatant(saved.state, spellCasterId).concentration,
    ).toBeNull();
  });

  test("slowed target turn can spend either an Action or a Bonus Action, not both", () => {
    const targetTurn = targetTurnAfterFailedSlow(
      spellBattle({
        preparedSpells: [spellRecord(slowUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
    );

    expect(
      targetTurn.currentTurnResources.actionOrBonusActionExclusion,
    ).toEqual({
      kind: "restricted",
      choice: "notChosen",
    });
    expect(canSpendAction(targetTurn.currentTurnResources, "dodge")).toBe(true);
    expect(canSpendBonusAction(targetTurn.currentTurnResources)).toBe(true);

    const dodge = actionAct(targetTurn, spellTargetId, "dodge");
    const dodged = resolveBattleSubject({
      state: targetTurn,
      subject: dodge.subject,
      fills: [],
    });
    if (dodged.tag !== "resolved") {
      throw new Error(
        `Expected slowed Dodge to resolve: ${JSON.stringify(dodged)}`,
      );
    }

    expect(dodged.state.currentTurnResources.actionResources).toEqual([]);
    expect(dodged.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(
      dodged.state.currentTurnResources.actionOrBonusActionExclusion,
    ).toEqual({
      kind: "restricted",
      choice: "action",
    });
    expect(canSpendAction(dodged.state.currentTurnResources, "attack")).toBe(
      false,
    );
    expect(canSpendBonusAction(dodged.state.currentTurnResources)).toBe(false);
  });

  test("Slow applied to the current actor immediately reconciles prior Action spending", () => {
    const state = spellBattle({
      preparedSpells: [spellRecord(slowUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: slowUnitId, slotLevel: 3 });
    const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);

    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        slowSavingThrowOutcomeFill(savingThrow, [
          { targetId: spellCasterId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error(
        `Expected self-targeted Slow cast to resolve: ${JSON.stringify(cast)}`,
      );
    }

    expect(requireCombatant(cast.state, spellCasterId).activeEffects).toEqual([
      expect.objectContaining({ kind: "slowActivePenalties" }),
    ]);
    expect(cast.state.currentTurnResources.actionResources).toEqual([]);
    expect(cast.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(
      cast.state.currentTurnResources.actionOrBonusActionExclusion,
    ).toEqual({
      kind: "restricted",
      choice: "action",
    });
    expect(canSpendAction(cast.state.currentTurnResources, "attack")).toBe(
      false,
    );
    expect(canSpendBonusAction(cast.state.currentTurnResources)).toBe(false);
    expect(
      discoverBattleActs(cast.state).some(
        (candidate) =>
          candidate.subject.actorId === spellCasterId &&
          (candidate.subject.tag === "action" ||
            candidate.subject.tag === "bonusAction"),
      ),
    ).toBe(false);
  });

  test("slowed target Attack action does not open an Extra Attack slot", () => {
    const targetTurn = targetTurnAfterFailedSlow(
      spellBattle({
        preparedSpells: [spellRecord(slowUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
        targetAttack: zeroAbilityWeaponAttack("weapon_club"),
        targetUnitRefs: [extraAttackBattleUnitRef()],
      }),
    );

    const attack = actionAct(targetTurn, spellTargetId, "attack", "Club");
    const targetHole = requireResultHole(
      resolveBattleSubject({
        state: targetTurn,
        subject: attack.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      targetHole,
      spellTargetId,
      spellCasterId,
      "Club",
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: targetTurn,
        subject: attack.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const attacked = resolveBattleSubject({
      state: targetTurn,
      subject: attack.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
      ],
    });
    if (attacked.tag !== "resolved") {
      throw new Error(
        `Expected slowed Attack action to resolve: ${JSON.stringify(attacked)}`,
      );
    }

    expect(
      attacked.state.currentTurnResources.actionResources.filter(
        (resource) => resource.source === "classFeatureExtraAttack",
      ),
    ).toEqual([]);
    expect(canSpendAction(attacked.state.currentTurnResources, "attack")).toBe(
      false,
    );
  });

  test("slowed Stat Block Multiattack does not open follow-up dispatch attacks", () => {
    const targetTurn = statBlockTargetTurnAfterFailedSlow();

    const multiattack = actionAct(
      targetTurn,
      slowMultiattackTargetId,
      "multiattack",
    );
    const resolved = resolveBattleSubject({
      state: targetTurn,
      subject: multiattack.subject,
      fills: [],
    });
    if (resolved.tag !== "resolved") {
      throw new Error(
        `Expected slowed Stat Block Multiattack to resolve: ${JSON.stringify(resolved)}`,
      );
    }

    expect(
      resolved.state.currentTurnResources.actionResources.filter(
        (resource) => resource.source === "statBlockMultiattack",
      ),
    ).toEqual([]);
    expect(canSpendAction(resolved.state.currentTurnResources, "attack")).toBe(
      false,
    );
    expect(
      discoverBattleActs(resolved.state).some(
        (candidate) =>
          candidate.subject.tag === "action" &&
          candidate.subject.actorId === slowMultiattackTargetId &&
          candidate.subject.action === "attack",
      ),
    ).toBe(false);
  });

  test("slowed target Flaming Sphere Bonus Action prevents a later Action", () => {
    const targetTurn = withCombatantActiveEffect(
      targetTurnAfterFailedSlow(
        spellBattle({
          preparedSpells: [spellRecord(slowUnitId)],
          spellSlots: [{ spellLevel: 3, count: 1 }],
        }),
      ),
      spellTargetId,
      targetOwnedFlamingSphereEffect(),
    );

    const reposition = flamingSphereRepositionAct(targetTurn, spellTargetId);
    const movement = requireHole(
      reposition.initialHoles,
      "movableZoneRepositionMovement",
    );
    const moved = resolveBattleSubject({
      state: targetTurn,
      subject: reposition.subject,
      fills: [flamingSphereRepositionMovementFill(movement)],
    });
    if (moved.tag !== "resolved") {
      throw new Error(
        `Expected slowed Flaming Sphere reposition to resolve: ${JSON.stringify(moved)}`,
      );
    }

    expect(moved.state.currentTurnResources.actionResources).toEqual([]);
    expect(moved.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(
      moved.state.currentTurnResources.actionOrBonusActionExclusion,
    ).toEqual({
      kind: "restricted",
      choice: "bonusAction",
    });
    expect(canSpendAction(moved.state.currentTurnResources, "dodge")).toBe(
      false,
    );
    expect(canSpendBonusAction(moved.state.currentTurnResources)).toBe(false);
    expect(
      discoverBattleActs(moved.state).some(
        (candidate) =>
          candidate.subject.tag === "action" &&
          candidate.subject.actorId === spellTargetId,
      ),
    ).toBe(false);
  });

  test("slowed Somatic spell cast asks for chance outcome and a failed outcome spends only cast resources", () => {
    const targetTurn = targetTurnAfterFailedSlow(
      spellBattle({
        preparedSpells: [spellRecord(slowUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
        targetPreparedSpells: [spellRecord(expeditiousRetreatUnitId)],
      }),
    );

    const act = spellActForActor(
      targetTurn,
      spellTargetId,
      expeditiousRetreatUnitId,
    );
    const slowChance = requireSlowSomaticSpellFailureHole(act.initialHoles);
    expect(slowChance).toEqual(
      expect.objectContaining({
        actorId: spellTargetId,
        spellId: expeditiousRetreatUnitId,
        failurePercent: SLOW_ACTIVE_PENALTIES_SOMATIC_FAILURE_PERCENT,
        activeEffectSources: [
          {
            sourceSpellId: slowUnitId,
            sourceCombatantId: spellCasterId,
          },
        ],
      }),
    );

    const failed = resolveBattleSubject({
      state: targetTurn,
      subject: act.subject,
      fills: [slowSomaticSpellFailureFill(slowChance, true)],
    });
    if (failed.tag !== "resolved") {
      throw new Error(
        `Expected failed slowed Somatic spell cast to resolve: ${JSON.stringify(failed)}`,
      );
    }

    const target = requireCombatant(failed.state, spellTargetId);
    expect(target.activeEffects).toEqual([
      expect.objectContaining({ kind: "slowActivePenalties" }),
    ]);
    expect(failed.state.currentTurnResources.actionResources).toEqual([]);
    expect(failed.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(
      failed.state.currentTurnResources.actionOrBonusActionExclusion,
    ).toEqual({
      kind: "restricted",
      choice: "bonusAction",
    });
    expect(
      failed.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toContainEqual({
      kind: "committed",
      combatantId: spellTargetId,
    });
  });

  test("slowed spell cast without an effective Somatic component does not ask for the Slow chance outcome", () => {
    const targetTurn = targetTurnAfterFailedSlow(
      spellBattle({
        preparedSpells: [spellRecord(slowUnitId)],
        spellSlots: [{ spellLevel: 3, count: 1 }],
        targetPreparedSpells: [spellRecord(commandUnitId)],
      }),
    );

    const act = spellActForActor(targetTurn, spellTargetId, commandUnitId);

    expect(
      act.initialHoles.some(
        (hole) => hole.kind === "slowSomaticSpellFailureOutcome",
      ),
    ).toBe(false);
  });
});

function castFailedSlow(state: BattleState): BattleState {
  return castSlowWithOutcomes(state, [
    { targetId: spellTargetId, succeeded: false },
  ]);
}

function castSlowWithOutcomes(
  state: BattleState,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): BattleState {
  const act = spellAct({ state, spellId: slowUnitId, slotLevel: 3 });
  const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);
  const cast = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [slowSavingThrowOutcomeFill(savingThrow, outcomes)],
  });
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Slow cast to resolve: ${JSON.stringify(cast)}`);
  }
  return cast.state;
}

function statBlockTargetTurnAfterFailedSlow(): BattleState {
  const cast = castSlowWithOutcomes(
    spellBattle({
      preparedSpells: [spellRecord(slowUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      statBlockTargets: [
        {
          combatantId: slowMultiattackTargetId,
          statBlock: monsterMultiattackStatBlock(),
          initiative: 15,
        },
      ],
    }),
    [{ targetId: slowMultiattackTargetId, succeeded: false }],
  );
  const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Slow caster End Turn to resolve.");
  }
  return targetTurn.state;
}

function targetTurnAfterFailedSlow(state: BattleState): BattleState {
  const cast = castFailedSlow(state);
  const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Slow caster End Turn to resolve.");
  }
  return targetTurn.state;
}

function withCombatantActiveEffect(
  state: BattleState,
  combatantId: CombatantId,
  effect: BattleActiveEffect,
): BattleState {
  const combatant = requireCombatant(state, combatantId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, {
      ...combatant,
      activeEffects: [...combatant.activeEffects, effect],
    }),
  };
}

function targetOwnedFlamingSphereEffect(): Extract<
  BattleActiveEffect,
  { readonly kind: "flamingSphere" }
> {
  return {
    kind: "flamingSphere",
    sourceSpellId: flamingSphereUnitId,
    sourceCombatantId: spellTargetId,
    areaId: flamingSphereAreaId,
    save: { ability: "dex", dc: { kind: "caster_spell_save_dc" } },
    damage: { expr: { dice: 2, dieSize: 6 }, damageType: "fire" },
    ramMaxMoveFeet: movementFeet(30),
    expiresAt: {
      kind: "concentration",
      combatantId: spellTargetId,
      durationTicks: elapsedTimeTicks(10),
    },
  };
}

function actionAct(
  state: BattleState,
  actorId: CombatantId,
  action: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "action" }
  >["action"],
  attackName?: string,
): AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "action" }
  >;
} {
  const act = discoverBattleActs(state).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        AvailableBattleAct["subject"],
        { readonly tag: "action" }
      >;
    } =>
      candidate.subject.tag === "action" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.action === action &&
      (attackName === undefined ||
        ("attackName" in candidate.subject &&
          candidate.subject.attackName === attackName)),
  );
  if (act === undefined) {
    throw new Error(`Expected ${action} act for ${actorId}.`);
  }
  return act;
}

function spellActForActor(
  state: BattleState,
  actorId: CombatantId,
  unitId: string,
): AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    {
      readonly tag: "actionSpell" | "bonusActionSpell" | "bonusActionDashSpell";
    }
  >;
} {
  const act = discoverBattleActs(state).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        AvailableBattleAct["subject"],
        {
          readonly tag:
            | "actionSpell"
            | "bonusActionSpell"
            | "bonusActionDashSpell";
        }
      >;
    } =>
      (candidate.subject.tag === "actionSpell" ||
        candidate.subject.tag === "bonusActionSpell" ||
        candidate.subject.tag === "bonusActionDashSpell") &&
      candidate.subject.actorId === actorId &&
      candidate.subject.invocation.spellId === unitId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${unitId} spell act for ${actorId}.`);
  }
  return act;
}

function slowSavingThrowOutcomeFill(
  hole: BattleSpellSavingThrowOutcomeHole,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "slowArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
        cubeSideFeet: 40,
        affectedCreatureWitnesses: outcomes.map((outcome) => ({
          targetId: outcome.targetId,
          inCube: true,
          chosenByCaster: true,
        })),
      },
      outcomes,
    },
  };
}

function requireSpellSavingThrowOutcomeHole(
  holes: readonly BattleHole[],
): BattleSpellSavingThrowOutcomeHole {
  const hole = requireHole(holes, "savingThrowOutcome");
  if (!("spell" in hole)) {
    throw new Error("Expected spell Saving Throw outcome hole.");
  }
  return hole;
}

function requireSlowEndTurnSaveHole(holes: readonly BattleHole[]): Extract<
  BattleHole,
  { readonly kind: "savingThrowOutcome" }
> & {
  readonly slowActivePenaltiesEndTurnSave: unknown;
} {
  const hole = requireHole(holes, "savingThrowOutcome");
  if (!("slowActivePenaltiesEndTurnSave" in hole)) {
    throw new Error("Expected Slow end-turn Saving Throw outcome hole.");
  }
  return hole;
}

function requireSlowSomaticSpellFailureHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "slowSomaticSpellFailureOutcome" }> {
  return requireHole(holes, "slowSomaticSpellFailureOutcome");
}

function slowSomaticSpellFailureFill(
  hole: Extract<
    BattleHole,
    { readonly kind: "slowSomaticSpellFailureOutcome" }
  >,
  spellFailed: boolean,
): Extract<BattleFill, { readonly kind: "slowSomaticSpellFailureOutcome" }> {
  return {
    kind: "slowSomaticSpellFailureOutcome",
    holeId: hole.holeId,
    value: { spellFailed },
  };
}
