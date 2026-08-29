import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84F hideous_laughter
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { resourceCount } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import { HEIGHTENED_METAMAGIC_EFFECT_KIND } from "./battle-reducer/metamagic.ts";
import {
  fireBoltUnitId,
  heroismUnitId,
  saveGatedConditionWithRepeatDurationTicks,
  saveGatedConditionWithRepeatUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackRollFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  declineTargetReadiedSpellAfterFailedSave,
  spellBattle,
  spellBattleWithTargetReadiedRay,
} from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  applyBattleHitPointDamage,
  applyCondition,
  battleCreatureStateWithKnockOutPreservedConditions,
  discoverBattleActCandidates,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  hasCondition,
  saveGatedConditionWithRepeatRepeatSavingThrowOutcomeHole,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import type {
  BattleActiveEffect,
  BattleFill,
  BattleHole,
  BattleRuntimeSession,
  BattleState,
} from "./unit-profile-admission.test-support.ts";
import {
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime.test-support.ts";
import { boundSaveGatedConditionWithRepeatEffect } from "./battle-reducer/spell-modifier-binding.ts";

function requireBoundHideousLaughterEffect(
  state: BattleState,
  effect: Extract<
    BattleActiveEffect,
    { readonly kind: "saveGatedConditionWithRepeat" }
  >,
) {
  const bound = boundSaveGatedConditionWithRepeatEffect(state, effect);
  if (bound === undefined) {
    throw new Error("Expected bound Hideous Laughter procedure facts.");
  }
  return bound;
}

function heightenedHideousLaughterFixture() {
  const spell = spellRecord(saveGatedConditionWithRepeatUnitId);
  const session = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 1, count: 1 }],
    casterClassLevels: [{ className: "sorcerer", level: 5 }],
    casterResources: [
      {
        unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
        pointsRemaining: resourceCount(4),
      },
    ],
    casterMetamagic: {
      sorceryPointResourceUnitId: parseSharedUnitId("sorcerer_font_of_magic"),
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: [
        {
          effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND,
          stackingMode: "one_per_spell",
          sorceryPointCost: resourceCount(2),
        },
      ],
    },
  });
  const act = discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "saveGatedConditionWithRepeat" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined || act.subject.tag !== "actionSpell") {
    throw new Error("Expected Heightened Hideous Laughter act.");
  }
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const heightenedHole = requireHole(act.initialHoles, "targetChoice");
  const targetFill = spellTargetListFill(
    targetHole,
    spellCasterId,
    saveGatedConditionWithRepeatUnitId,
    [spellTargetId],
  );
  const heightenedFill = targetChoiceFill(heightenedHole, spellTargetId);
  return { session, act, targetFill, heightenedFill };
}

function castHeightenedHideousLaughter() {
  const { session, act, targetFill, heightenedFill } =
    heightenedHideousLaughterFixture();
  const needsSave = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [targetFill, heightenedFill],
  });
  const initialSave = requireResultHole(needsSave, "savingThrowOutcome");
  expect(initialSave.targetRollModes).toEqual([
    { targetId: spellTargetId, rollMode: "disadvantage" },
  ]);
  const resolved = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      targetFill,
      heightenedFill,
      savingThrowOutcomeFill(initialSave, [
        { targetId: spellTargetId, succeeded: false },
      ]),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Heightened Hideous Laughter cast to resolve.");
  }
  return resolved;
}

function targetChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: typeof spellTargetId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [],
  };
}

describe("QMBT14 deterministic Hideous Laughter effects admission", () => {
  test("Hideous Laughter applies Prone and Incapacitated until a repeat save succeeds", () => {
    const spell = spellRecord(saveGatedConditionWithRepeatUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: saveGatedConditionWithRepeatUnitId,
      slotLevel: 2,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef(
          saveGatedConditionWithRepeatUnitId,
          2,
          "saveGatedConditionWithRepeat",
        ),
      ),
      mode: { tag: "cast" },
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    expect(targetHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 2,
      }),
    );
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      saveGatedConditionWithRepeatUnitId,
      [spellTargetId],
    );
    const needsSave = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [targetFill],
    });
    const initialSave = requireResultHole(needsSave, "savingThrowOutcome");
    const cast = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(initialSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Hideous Laughter cast to resolve.");
    }
    const laughed = requireCombatant(cast.state, spellTargetId);
    expect(hasCondition(laughed.conditions, "prone")).toBe(true);
    expect(hasCondition(laughed.conditions, "incapacitated")).toBe(true);
    expect(laughed.activeEffects).toEqual([
      expect.objectContaining({
        kind: "saveGatedConditionWithRepeat",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: saveGatedConditionWithRepeatDurationTicks,
        },
      }),
    ]);

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    expect(
      discoverBattleActCandidates(targetTurn.state).some(
        (candidate) =>
          candidate.subject.tag === "runtimeCommand" &&
          candidate.subject.command === "standFromProne" &&
          candidate.subject.actorId === spellTargetId,
      ),
    ).toBe(false);

    const needsRepeatSave = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    const repeatSave = requireResultHole(needsRepeatSave, "savingThrowOutcome");
    expect(repeatSave).toEqual(
      expect.objectContaining({
        saveGatedConditionRepeatSave: expect.objectContaining({
          targetId: spellTargetId,
          trigger: "endTurn",
        }),
        targetRollModes: [],
      }),
    );
    const cleared = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [
        savingThrowOutcomeFill(repeatSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    if (cleared.tag !== "resolved") {
      throw new Error("Expected Hideous Laughter repeat save to resolve.");
    }
    const target = requireCombatant(cleared.state, spellTargetId);
    expect(hasCondition(target.conditions, "prone")).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(false);
    expect(target.activeEffects).toEqual([]);
    expect(
      requireCombatant(cleared.state, spellCasterId).concentration,
    ).toBeNull();

    const saveGatedConditionWithRepeatEffect = laughed.activeEffects.find(
      (effect) => effect.kind === "saveGatedConditionWithRepeat",
    );
    if (saveGatedConditionWithRepeatEffect === undefined) {
      throw new Error("Expected Hideous Laughter active effect.");
    }
    const damageSaveHole =
      saveGatedConditionWithRepeatRepeatSavingThrowOutcomeHole(
        spellTargetId,
        requireBoundHideousLaughterEffect(
          cast.state,
          saveGatedConditionWithRepeatEffect,
        ),
        "damage",
      );
    expect(damageSaveHole.targetRollModes).toEqual([
      { targetId: spellTargetId, rollMode: "advantage" },
    ]);
    const zeroDamage = applyBattleHitPointDamage({
      state: cast.state,
      target: laughed,
      damageAmount: 0,
      deathFailuresAtZeroHp: 1,
      damageSourceId: spellCasterId,
      saveGatedConditionWithRepeatDamageRepeatSaves: [],
    });
    const zeroDamageTarget = requireCombatant(zeroDamage, spellTargetId);
    expect(zeroDamageTarget.activeEffects).toContainEqual(
      saveGatedConditionWithRepeatEffect,
    );
    expect(hasCondition(zeroDamageTarget.conditions, "prone")).toBe(true);
    expect(hasCondition(zeroDamageTarget.conditions, "incapacitated")).toBe(
      true,
    );
    const damaged = applyBattleHitPointDamage({
      state: cast.state,
      target: laughed,
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: spellCasterId,
      saveGatedConditionWithRepeatDamageRepeatSaves: [
        savingThrowOutcomeFill(damageSaveHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    const damagedTarget = requireCombatant(damaged, spellTargetId);
    expect(hasCondition(damagedTarget.conditions, "prone")).toBe(false);
    expect(hasCondition(damagedTarget.conditions, "incapacitated")).toBe(false);
    expect(damagedTarget.activeEffects).toEqual([]);
    expect(requireCombatant(damaged, spellCasterId).concentration).toBeNull();

    const expiringEffect = {
      ...saveGatedConditionWithRepeatEffect,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: spellCasterId,
        durationTicks: elapsedTimeTicks(1),
      },
    };
    const expiringState: BattleState = {
      ...cast.state,
      combatants: new Map(cast.state.combatants)
        .set(spellCasterId, {
          ...requireCombatant(cast.state, spellCasterId),
          concentration: {
            sourceProcedureRef:
              saveGatedConditionWithRepeatEffect.sourceProcedureRef,
            effectKind: "spellEffect",
          },
        })
        .set(spellTargetId, {
          ...laughed,
          activeEffects: [expiringEffect],
        }),
    };
    const expiringTargetTurn = endTurn({
      state: expiringState,
      actorId: spellCasterId,
    });
    if (expiringTargetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const expiringRepeatSaveHole =
      saveGatedConditionWithRepeatRepeatSavingThrowOutcomeHole(
        spellTargetId,
        requireBoundHideousLaughterEffect(
          expiringTargetTurn.state,
          expiringEffect,
        ),
        "endTurn",
      );
    const expired = endTurn({
      state: expiringTargetTurn.state,
      actorId: spellTargetId,
      fills: [
        savingThrowOutcomeFill(expiringRepeatSaveHole, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (expired.tag !== "resolved") {
      throw new Error("Expected Hideous Laughter duration expiry to resolve.");
    }
    const expiredCaster = requireCombatant(expired.state, spellCasterId);
    const expiredTarget = requireCombatant(expired.state, spellTargetId);
    expect(expiredCaster.concentration).toBeNull();
    expect(hasCondition(expiredTarget.conditions, "prone")).toBe(false);
    expect(hasCondition(expiredTarget.conditions, "incapacitated")).toBe(false);
    expect(
      expiredTarget.activeEffects.some(
        (effect) => effect.kind === "saveGatedConditionWithRepeat",
      ),
    ).toBe(false);

    const fireBoltSpell = spellRecord(fireBoltUnitId);
    const spellDamageState = spellBattle({
      cantrips: [fireBoltSpell],
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const hideousAct = spellAct({
      session: spellDamageState,
      spellId: saveGatedConditionWithRepeatUnitId,
    });
    const hideousTarget = requireHole(
      hideousAct.initialHoles,
      "spellTargetList",
    );
    const hideousTargetFill = spellTargetListFill(
      hideousTarget,
      spellCasterId,
      saveGatedConditionWithRepeatUnitId,
      [spellTargetId],
    );
    const hideousInitialSave = requireResultHole(
      resolveBattleSubject({
        state: spellDamageState.state,
        subject: hideousAct.subject,
        fills: [hideousTargetFill],
      }),
      "savingThrowOutcome",
    );
    const hideousCast = resolveBattleSubject({
      state: spellDamageState.state,
      subject: hideousAct.subject,
      fills: [
        hideousTargetFill,
        savingThrowOutcomeFill(hideousInitialSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (hideousCast.tag !== "resolved") {
      throw new Error("Expected Hideous Laughter cast to resolve.");
    }
    const targetTurnForDamage = endTurn({
      state: hideousCast.state,
      actorId: spellCasterId,
    });
    if (targetTurnForDamage.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetEndTurnNeedsSave = resolveBattleSubject({
      state: targetTurnForDamage.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    const targetEndTurnRepeatSave = requireResultHole(
      targetEndTurnNeedsSave,
      "savingThrowOutcome",
    );
    const casterTurn = resolveBattleSubject({
      state: targetTurnForDamage.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [
        savingThrowOutcomeFill(targetEndTurnRepeatSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target End Turn to resolve.");
    }
    const fireBoltAct = spellAct({
      session: battleSessionWithState(spellDamageState, casterTurn.state),
      spellId: fireBoltUnitId,
    });
    const fireBoltTarget = requireHole(
      fireBoltAct.initialHoles,
      "targetChoice",
    );
    const fireBoltTargetFill = spellTargetFill(
      fireBoltTarget,
      fireBoltUnitId,
      spellCasterId,
      spellTargetId,
    );
    const fireBoltAttack = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: fireBoltAct.subject,
        fills: [fireBoltTargetFill],
      }),
      "attackRoll",
    );
    const fireBoltDamage = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: fireBoltAct.subject,
        fills: [
          fireBoltTargetFill,
          attackRollFill(fireBoltAttack, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const spellDamageNeedsRepeatSave = resolveBattleSubject({
      state: casterTurn.state,
      subject: fireBoltAct.subject,
      fills: [
        fireBoltTargetFill,
        attackRollFill(fireBoltAttack, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(fireBoltDamage, [[4]]),
      ],
    });
    const spellDamageRepeatSave = requireResultHole(
      spellDamageNeedsRepeatSave,
      "savingThrowOutcome",
    );
    expect(spellDamageRepeatSave).toEqual(
      expect.objectContaining({
        saveGatedConditionRepeatSave: expect.objectContaining({
          targetId: spellTargetId,
          trigger: "damage",
        }),
        targetRollModes: [{ targetId: spellTargetId, rollMode: "advantage" }],
      }),
    );
    expect(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: fireBoltAct.subject,
        fills: [
          fireBoltTargetFill,
          attackRollFill(fireBoltAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(fireBoltDamage, [[4]]),
          savingThrowOutcomeFill(spellDamageRepeatSave, [
            { targetId: spellCasterId, succeeded: true },
          ]),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: fireBoltAct.subject,
        fills: [
          fireBoltTargetFill,
          attackRollFill(fireBoltAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(fireBoltDamage, [[4]]),
          savingThrowOutcomeFill(spellDamageRepeatSave, [
            { targetId: spellTargetId, succeeded: false },
            { targetId: spellTargetId, succeeded: true },
          ]),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("a failed Hideous Laughter save opens the target's readied-spell Reaction", () => {
    const spell = spellRecord(saveGatedConditionWithRepeatUnitId);
    const session = spellBattleWithTargetReadiedRay({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: saveGatedConditionWithRepeatUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      saveGatedConditionWithRepeatUnitId,
      [spellTargetId],
    );
    const needsSave = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill],
    });
    const savingThrow = requireResultHole(needsSave, "savingThrowOutcome");
    const awaitingReaction = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });

    const declined = declineTargetReadiedSpellAfterFailedSave(awaitingReaction);
    const target = requireCombatant(declined.state, spellTargetId);
    expect(hasCondition(target.conditions, "prone")).toBe(true);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(target.activeEffects).toContainEqual(
      expect.objectContaining({ kind: "saveGatedConditionWithRepeat" }),
    );
  });

  test("Heightened Hideous Laughter carries Disadvantage from failed initial save to end-turn repeat save", () => {
    const resolved = castHeightenedHideousLaughter();
    const laughed = requireCombatant(resolved.state, spellTargetId);
    const effect = laughed.activeEffects.find(
      (
        candidate,
      ): candidate is Extract<
        BattleActiveEffect,
        { readonly kind: "saveGatedConditionWithRepeat" }
      > => candidate.kind === "saveGatedConditionWithRepeat",
    );
    if (effect === undefined) {
      throw new Error("Expected Heightened Hideous Laughter active effect.");
    }
    expect(effect.repeatSaveRollMode).toBe("disadvantage");

    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const needsRepeatSave = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    const repeatSave = requireResultHole(needsRepeatSave, "savingThrowOutcome");
    expect(repeatSave).toEqual(
      expect.objectContaining({
        saveGatedConditionRepeatSave: expect.objectContaining({
          targetId: spellTargetId,
          trigger: "endTurn",
        }),
        targetRollModes: [
          { targetId: spellTargetId, rollMode: "disadvantage" },
        ],
      }),
    );
  });

  test("Heightened Hideous Laughter requests its target before the saving throw", () => {
    const { session, act, targetFill } = heightenedHideousLaughterFixture();
    const needsHeightenedTarget = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill],
    });

    expect(needsHeightenedTarget).toMatchObject({ tag: "needsHoles" });
    if (needsHeightenedTarget.tag !== "needsHoles") {
      throw new Error("Expected Heightened Hideous Laughter target hole.");
    }
    expect(needsHeightenedTarget.holes).toHaveLength(1);
    expect(needsHeightenedTarget.holes[0]).toMatchObject({
      kind: "targetChoice",
      label: "Spell Heightened Spell target",
      choices: expect.arrayContaining([spellTargetId]),
    });
    expect(
      needsHeightenedTarget.holes.some(
        (hole) => hole.kind === "savingThrowOutcome",
      ),
    ).toBe(false);
  });

  test("Heightened Hideous Laughter damage repeat save cancels damage Advantage to normal", () => {
    const resolved = castHeightenedHideousLaughter();
    const laughed = requireCombatant(resolved.state, spellTargetId);
    const effect = laughed.activeEffects.find(
      (
        candidate,
      ): candidate is Extract<
        BattleActiveEffect,
        { readonly kind: "saveGatedConditionWithRepeat" }
      > => candidate.kind === "saveGatedConditionWithRepeat",
    );
    if (effect === undefined) {
      throw new Error("Expected Heightened Hideous Laughter active effect.");
    }

    const damageSaveHole =
      saveGatedConditionWithRepeatRepeatSavingThrowOutcomeHole(
        spellTargetId,
        requireBoundHideousLaughterEffect(resolved.state, effect),
        "damage",
      );
    expect(damageSaveHole.targetRollModes).toEqual([
      { targetId: spellTargetId, rollMode: "normal" },
    ]);
  });
  test("Hideous Laughter does not leave Concentration after all initial saves succeed", () => {
    const spell = spellRecord(saveGatedConditionWithRepeatUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: saveGatedConditionWithRepeatUnitId,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      saveGatedConditionWithRepeatUnitId,
      [spellTargetId],
    );
    const initialSave = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(initialSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Hideous Laughter cast to resolve.");
    }
    const caster = requireCombatant(resolved.state, spellCasterId);
    const target = requireCombatant(resolved.state, spellTargetId);
    expect(caster.concentration).toBeNull();
    expect(hasCondition(target.conditions, "prone")).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(false);
    expect(
      target.activeEffects.some(
        (effect) => effect.kind === "saveGatedConditionWithRepeat",
      ),
    ).toBe(false);
  });
  test("Hideous Laughter applies each condition independently of condition immunity", () => {
    const castWithConditionImmunity = (
      immuneCondition: "prone" | "incapacitated",
    ) => {
      const spell = spellRecord(saveGatedConditionWithRepeatUnitId);
      const baseState = spellBattle({ preparedSpells: [spell] });
      requireCombatant(baseState.state, spellTargetId);
      const allocatedState = battleStateWithAllocatedEffectForTest({
        state: baseState.state,
        ownerId: spellTargetId,
        effect: {
          kind: "conditionImmunity",
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(heroismUnitId),
          ),
          sourceCombatantId: spellCasterId,
          condition: immuneCondition,
          conditionHadNonSpellSource: false,
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(600),
          },
        },
      });
      const state: BattleRuntimeSession = battleRuntimeSessionForTest({
        ...baseState,
        state: allocatedState,
      });
      const act = spellAct({
        session: state,
        spellId: saveGatedConditionWithRepeatUnitId,
      });
      const targetHole = requireHole(act.initialHoles, "spellTargetList");
      const targetFill = spellTargetListFill(
        targetHole,
        spellCasterId,
        saveGatedConditionWithRepeatUnitId,
        [spellTargetId],
      );
      const initialSave = requireResultHole(
        resolveBattleSubject({
          state: state.state,
          subject: act.subject,
          fills: [targetFill],
        }),
        "savingThrowOutcome",
      );
      const resolved = resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          targetFill,
          savingThrowOutcomeFill(initialSave, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      });
      if (resolved.tag !== "resolved") {
        throw new Error("Expected Hideous Laughter cast to resolve.");
      }
      return requireCombatant(resolved.state, spellTargetId);
    };

    const proneImmuneTarget = castWithConditionImmunity("prone");
    expect(hasCondition(proneImmuneTarget.conditions, "prone")).toBe(false);
    expect(hasCondition(proneImmuneTarget.conditions, "incapacitated")).toBe(
      true,
    );
    expect(
      proneImmuneTarget.activeEffects.some(
        (effect) => effect.kind === "saveGatedConditionWithRepeat",
      ),
    ).toBe(true);

    const incapacitatedImmuneTarget =
      castWithConditionImmunity("incapacitated");
    expect(hasCondition(incapacitatedImmuneTarget.conditions, "prone")).toBe(
      true,
    );
    expect(
      hasCondition(incapacitatedImmuneTarget.conditions, "incapacitated"),
    ).toBe(false);
    expect(
      incapacitatedImmuneTarget.activeEffects.some(
        (effect) => effect.kind === "saveGatedConditionWithRepeat",
      ),
    ).toBe(true);
  });
  test("Hideous Laughter repeat saves clear only the saved effect", () => {
    const spell = spellRecord(saveGatedConditionWithRepeatUnitId);
    const baseState = spellBattle({
      preparedSpells: [spell],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const target = requireCombatant(baseState.state, spellTargetId);
    const firstEffectTemplate = {
      kind: "saveGatedConditionWithRepeat",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(saveGatedConditionWithRepeatUnitId),
      ),
      sourceCombatantId: spellCasterId,
      conditionHadNonSpellProneSource: false,
      conditionHadNonSpellIncapacitatedSource: false,
      repeatSaveRollMode: null,
      save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: saveGatedConditionWithRepeatDurationTicks,
      },
    } as const;
    const secondEffectTemplate = {
      ...firstEffectTemplate,
      sourceCombatantId: spellTargetId,
      expiresAt: {
        kind: "concentration",
        combatantId: spellTargetId,
        durationTicks: saveGatedConditionWithRepeatDurationTicks,
      },
    } as const;
    const affectedTarget = battleCreatureStateWithKnockOutPreservedConditions(
      target,
      applyCondition(
        applyCondition(target.conditions, "prone"),
        "incapacitated",
      ),
    );
    const preparedState: BattleState = {
      ...baseState.state,
      combatants: new Map(baseState.state.combatants).set(spellTargetId, {
        ...affectedTarget,
      }),
    };
    const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
      state: preparedState,
      occurrences: [
        {
          kind: "activeEffect",
          ownerId: spellTargetId,
          effect: firstEffectTemplate,
        },
        {
          kind: "activeEffect",
          ownerId: spellTargetId,
          effect: secondEffectTemplate,
        },
      ],
    });
    const [firstOccurrence, secondOccurrence] = allocated.occurrences;
    if (
      firstOccurrence?.kind !== "activeEffect" ||
      firstOccurrence.effect.kind !== "saveGatedConditionWithRepeat" ||
      secondOccurrence?.kind !== "activeEffect" ||
      secondOccurrence.effect.kind !== "saveGatedConditionWithRepeat"
    ) {
      throw new Error("Expected two allocated Hideous Laughter occurrences.");
    }
    const firstEffect = firstOccurrence.effect;
    const secondEffect = secondOccurrence.effect;
    const state = allocated.state;

    const damageSaveHole =
      saveGatedConditionWithRepeatRepeatSavingThrowOutcomeHole(
        spellTargetId,
        requireBoundHideousLaughterEffect(state, firstEffect),
        "damage",
      );
    const afterDamage = applyBattleHitPointDamage({
      state,
      target: requireCombatant(state, spellTargetId),
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      saveGatedConditionWithRepeatDamageRepeatSaves: [
        savingThrowOutcomeFill(damageSaveHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    const damageTarget = requireCombatant(afterDamage, spellTargetId);
    expect(
      damageTarget.activeEffects.filter(
        (effect) => effect.kind === "saveGatedConditionWithRepeat",
      ),
    ).toEqual([expect.objectContaining({ sourceCombatantId: spellTargetId })]);
    expect(hasCondition(damageTarget.conditions, "prone")).toBe(true);
    expect(hasCondition(damageTarget.conditions, "incapacitated")).toBe(true);

    const secondDamageSaveHole =
      saveGatedConditionWithRepeatRepeatSavingThrowOutcomeHole(
        spellTargetId,
        requireBoundHideousLaughterEffect(state, secondEffect),
        "damage",
      );
    const afterAllDamageSaves = applyBattleHitPointDamage({
      state,
      target: requireCombatant(state, spellTargetId),
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      saveGatedConditionWithRepeatDamageRepeatSaves: [
        savingThrowOutcomeFill(damageSaveHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
        savingThrowOutcomeFill(secondDamageSaveHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    const allDamageSavesTarget = requireCombatant(
      afterAllDamageSaves,
      spellTargetId,
    );
    expect(
      allDamageSavesTarget.activeEffects.some(
        (effect) => effect.kind === "saveGatedConditionWithRepeat",
      ),
    ).toBe(false);
    expect(hasCondition(allDamageSavesTarget.conditions, "prone")).toBe(false);
    expect(hasCondition(allDamageSavesTarget.conditions, "incapacitated")).toBe(
      false,
    );

    const targetTurn = endTurn({ state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const firstEndTurnHole =
      saveGatedConditionWithRepeatRepeatSavingThrowOutcomeHole(
        spellTargetId,
        requireBoundHideousLaughterEffect(state, firstEffect),
        "endTurn",
      );
    const secondEndTurnHole =
      saveGatedConditionWithRepeatRepeatSavingThrowOutcomeHole(
        spellTargetId,
        requireBoundHideousLaughterEffect(state, secondEffect),
        "endTurn",
      );
    const afterEndTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [
        savingThrowOutcomeFill(firstEndTurnHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
        savingThrowOutcomeFill(secondEndTurnHole, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (afterEndTurn.tag !== "resolved") {
      throw new Error("Expected target End Turn to resolve.");
    }
    const endTurnTarget = requireCombatant(afterEndTurn.state, spellTargetId);
    expect(
      endTurnTarget.activeEffects.filter(
        (effect) => effect.kind === "saveGatedConditionWithRepeat",
      ),
    ).toEqual([expect.objectContaining({ sourceCombatantId: spellTargetId })]);
    expect(hasCondition(endTurnTarget.conditions, "prone")).toBe(true);
    expect(hasCondition(endTurnTarget.conditions, "incapacitated")).toBe(true);
  });
  test("Hideous Laughter does not break Concentration when Incapacitated immunity prevents Incapacitated", () => {
    const spell = spellRecord(saveGatedConditionWithRepeatUnitId);
    const baseState = spellBattle({ preparedSpells: [spell] });
    const target = requireCombatant(baseState.state, spellTargetId);
    const targetConcentration = {
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(heroismUnitId),
      ),
      effectKind: "spellEffect" as const,
    };
    const concentratingState: BattleState = {
      ...baseState.state,
      combatants: new Map(baseState.state.combatants).set(spellTargetId, {
        ...target,
        concentration: targetConcentration,
      }),
    };
    const allocatedState = battleStateWithAllocatedEffectOccurrencesForTest({
      state: concentratingState,
      occurrences: [
        {
          kind: "activeEffect",
          ownerId: spellTargetId,
          effect: {
            kind: "conditionImmunity",
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String(heroismUnitId),
            ),
            sourceCombatantId: spellTargetId,
            condition: "incapacitated",
            conditionHadNonSpellSource: false,
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(600),
            },
          },
        },
        {
          kind: "activeEffect",
          ownerId: spellTargetId,
          effect: {
            kind: "turnStartTemporaryHitPoints",
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String(heroismUnitId),
            ),
            sourceCombatantId: spellTargetId,
            amount: 3,
            expiresAt: {
              kind: "concentration",
              combatantId: spellTargetId,
            },
          },
        },
      ],
    }).state;
    const state: BattleRuntimeSession = battleRuntimeSessionForTest({
      ...baseState,
      state: allocatedState,
    });
    const act = spellAct({
      session: state,
      spellId: saveGatedConditionWithRepeatUnitId,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      saveGatedConditionWithRepeatUnitId,
      [spellTargetId],
    );
    const initialSave = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(initialSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Hideous Laughter cast to resolve.");
    }
    const resolvedTarget = requireCombatant(resolved.state, spellTargetId);
    expect(hasCondition(resolvedTarget.conditions, "prone")).toBe(true);
    expect(hasCondition(resolvedTarget.conditions, "incapacitated")).toBe(
      false,
    );
    expect(resolvedTarget.concentration).toEqual(targetConcentration);
    expect(
      resolvedTarget.activeEffects.some(
        (effect) => effect.kind === "turnStartTemporaryHitPoints",
      ),
    ).toBe(true);
  });
});

function battleSessionWithState(
  session: BattleRuntimeSession,
  state: BattleState,
): BattleRuntimeSession {
  return battleRuntimeSessionForTest({ ...session, state });
}
