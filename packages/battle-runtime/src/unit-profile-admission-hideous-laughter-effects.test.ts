// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84F hideous_laughter
import { describe, expect, test } from "vitest";
import {
  applyBattleHitPointDamage,
  applyCondition,
  attackRollFill,
  battleCreatureStateWithKnockOutPreservedConditions,
  damageRollFillWithGroups,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  fireBoltUnitId,
  hasCondition,
  heroismUnitId,
  hideousLaughterDurationTicks,
  hideousLaughterRepeatSavingThrowOutcomeHole,
  hideousLaughterUnitId,
  requireCombatant,
  requireHole,
  requireResultHole,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  spellAct,
  spellBattle,
  spellCasterId,
  spellRecord,
  spellSlotInvocationRef,
  spellTargetFill,
  spellTargetId,
  spellTargetListFill,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleActiveEffect,
  BattleState,
} from "./unit-profile-admission-test-support.ts";

describe("QMBT14 deterministic Hideous Laughter effects admission", () => {
  test("Hideous Laughter applies Prone and Incapacitated until a repeat save succeeds", () => {
    const spell = spellRecord(hideousLaughterUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: hideousLaughterUnitId,
      slotLevel: 2,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        hideousLaughterUnitId,
        2,
        "hideousLaughter",
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
      hideousLaughterUnitId,
      [spellTargetId],
    );
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    });
    const initialSave = requireResultHole(needsSave, "savingThrowOutcome");
    const cast = resolveBattleSubject({
      state,
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
        kind: "hideousLaughter",
        sourceSpellId: hideousLaughterUnitId,
        sourceCombatantId: spellCasterId,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: hideousLaughterDurationTicks,
        },
      }),
    ]);

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    expect(
      discoverBattleActs(targetTurn.state).some(
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
        hideousLaughterRepeatSave: expect.objectContaining({
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

    const hideousLaughterEffect = laughed.activeEffects.find(
      (effect) => effect.kind === "hideousLaughter",
    );
    if (hideousLaughterEffect === undefined) {
      throw new Error("Expected Hideous Laughter active effect.");
    }
    const damageSaveHole = hideousLaughterRepeatSavingThrowOutcomeHole(
      spellTargetId,
      hideousLaughterEffect,
      "damage",
    );
    expect(damageSaveHole.targetRollModes).toEqual([
      { targetId: spellTargetId, rollMode: "advantage" },
    ]);
    const damaged = applyBattleHitPointDamage({
      state: cast.state,
      target: laughed,
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: spellCasterId,
      hideousLaughterDamageRepeatSaves: [
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
      ...hideousLaughterEffect,
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
            sourceSpellId: hideousLaughterUnitId,
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
    const expiringRepeatSaveHole = hideousLaughterRepeatSavingThrowOutcomeHole(
      spellTargetId,
      expiringEffect,
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
        (effect) => effect.kind === "hideousLaughter",
      ),
    ).toBe(false);

    const fireBoltSpell = spellRecord(fireBoltUnitId);
    const spellDamageState = spellBattle({
      cantrips: [fireBoltSpell],
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const hideousAct = spellAct({
      state: spellDamageState,
      spellId: hideousLaughterUnitId,
    });
    const hideousTarget = requireHole(
      hideousAct.initialHoles,
      "spellTargetList",
    );
    const hideousTargetFill = spellTargetListFill(
      hideousTarget,
      spellCasterId,
      hideousLaughterUnitId,
      [spellTargetId],
    );
    const hideousInitialSave = requireResultHole(
      resolveBattleSubject({
        state: spellDamageState,
        subject: hideousAct.subject,
        fills: [hideousTargetFill],
      }),
      "savingThrowOutcome",
    );
    const hideousCast = resolveBattleSubject({
      state: spellDamageState,
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
      state: casterTurn.state,
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
        hideousLaughterRepeatSave: expect.objectContaining({
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
  test("Hideous Laughter does not leave Concentration after all initial saves succeed", () => {
    const spell = spellRecord(hideousLaughterUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: hideousLaughterUnitId,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      hideousLaughterUnitId,
      [spellTargetId],
    );
    const initialSave = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const resolved = resolveBattleSubject({
      state,
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
      target.activeEffects.some((effect) => effect.kind === "hideousLaughter"),
    ).toBe(false);
  });
  test("Hideous Laughter applies each condition independently of condition immunity", () => {
    const castWithConditionImmunity = (
      immuneCondition: "prone" | "incapacitated",
    ) => {
      const spell = spellRecord(hideousLaughterUnitId);
      const baseState = spellBattle({ preparedSpells: [spell] });
      const baseTarget = requireCombatant(baseState, spellTargetId);
      const state: BattleState = {
        ...baseState,
        combatants: new Map(baseState.combatants).set(spellTargetId, {
          ...baseTarget,
          activeEffects: [
            ...baseTarget.activeEffects,
            {
              kind: "conditionImmunity",
              sourceSpellId: heroismUnitId,
              sourceCombatantId: spellCasterId,
              condition: immuneCondition,
              expiresAt: {
                kind: "duration",
                durationTicks: elapsedTimeTicks(600),
              },
            },
          ],
        }),
      };
      const act = spellAct({ state, spellId: hideousLaughterUnitId });
      const targetHole = requireHole(act.initialHoles, "spellTargetList");
      const targetFill = spellTargetListFill(
        targetHole,
        spellCasterId,
        hideousLaughterUnitId,
        [spellTargetId],
      );
      const initialSave = requireResultHole(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [targetFill],
        }),
        "savingThrowOutcome",
      );
      const resolved = resolveBattleSubject({
        state,
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
        (effect) => effect.kind === "hideousLaughter",
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
        (effect) => effect.kind === "hideousLaughter",
      ),
    ).toBe(true);
  });
  test("Hideous Laughter repeat saves clear only the saved effect", () => {
    const spell = spellRecord(hideousLaughterUnitId);
    const baseState = spellBattle({
      preparedSpells: [spell],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const target = requireCombatant(baseState, spellTargetId);
    const firstEffect = {
      kind: "hideousLaughter",
      sourceSpellId: hideousLaughterUnitId,
      sourceCombatantId: spellCasterId,
      conditionHadNonSpellProneSource: false,
      conditionHadNonSpellIncapacitatedSource: false,
      save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: hideousLaughterDurationTicks,
      },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "hideousLaughter" }
    >;
    const secondEffect = {
      ...firstEffect,
      sourceCombatantId: spellTargetId,
      expiresAt: {
        kind: "concentration",
        combatantId: spellTargetId,
        durationTicks: hideousLaughterDurationTicks,
      },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "hideousLaughter" }
    >;
    const affectedTarget = battleCreatureStateWithKnockOutPreservedConditions(
      target,
      applyCondition(
        applyCondition(target.conditions, "prone"),
        "incapacitated",
      ),
    );
    const state: BattleState = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(spellTargetId, {
        ...affectedTarget,
        activeEffects: [firstEffect, secondEffect],
      }),
    };

    const damageSaveHole = hideousLaughterRepeatSavingThrowOutcomeHole(
      spellTargetId,
      firstEffect,
      "damage",
    );
    const afterDamage = applyBattleHitPointDamage({
      state,
      target: requireCombatant(state, spellTargetId),
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      hideousLaughterDamageRepeatSaves: [
        savingThrowOutcomeFill(damageSaveHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    const damageTarget = requireCombatant(afterDamage, spellTargetId);
    expect(
      damageTarget.activeEffects.filter(
        (effect) => effect.kind === "hideousLaughter",
      ),
    ).toEqual([expect.objectContaining({ sourceCombatantId: spellTargetId })]);
    expect(hasCondition(damageTarget.conditions, "prone")).toBe(true);
    expect(hasCondition(damageTarget.conditions, "incapacitated")).toBe(true);

    const secondDamageSaveHole = hideousLaughterRepeatSavingThrowOutcomeHole(
      spellTargetId,
      secondEffect,
      "damage",
    );
    const afterAllDamageSaves = applyBattleHitPointDamage({
      state,
      target: requireCombatant(state, spellTargetId),
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      hideousLaughterDamageRepeatSaves: [
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
        (effect) => effect.kind === "hideousLaughter",
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
    const firstEndTurnHole = hideousLaughterRepeatSavingThrowOutcomeHole(
      spellTargetId,
      firstEffect,
      "endTurn",
    );
    const secondEndTurnHole = hideousLaughterRepeatSavingThrowOutcomeHole(
      spellTargetId,
      secondEffect,
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
        (effect) => effect.kind === "hideousLaughter",
      ),
    ).toEqual([expect.objectContaining({ sourceCombatantId: spellTargetId })]);
    expect(hasCondition(endTurnTarget.conditions, "prone")).toBe(true);
    expect(hasCondition(endTurnTarget.conditions, "incapacitated")).toBe(true);
  });
  test("Hideous Laughter does not break Concentration when Incapacitated immunity prevents Incapacitated", () => {
    const spell = spellRecord(hideousLaughterUnitId);
    const baseState = spellBattle({ preparedSpells: [spell] });
    const target = requireCombatant(baseState, spellTargetId);
    const targetConcentration = {
      sourceSpellId: heroismUnitId,
      effectKind: "spellEffect" as const,
    };
    const state: BattleState = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(spellTargetId, {
        ...target,
        concentration: targetConcentration,
        activeEffects: [
          ...target.activeEffects,
          {
            kind: "conditionImmunity",
            sourceSpellId: heroismUnitId,
            sourceCombatantId: spellTargetId,
            condition: "incapacitated",
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(600),
            },
          },
          {
            kind: "turnStartTemporaryHitPoints",
            sourceSpellId: heroismUnitId,
            sourceCombatantId: spellTargetId,
            amount: 3,
            expiresAt: {
              kind: "concentration",
              combatantId: spellTargetId,
            },
          },
        ],
      }),
    };
    const act = spellAct({ state, spellId: hideousLaughterUnitId });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      hideousLaughterUnitId,
      [spellTargetId],
    );
    const initialSave = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const resolved = resolveBattleSubject({
      state,
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
