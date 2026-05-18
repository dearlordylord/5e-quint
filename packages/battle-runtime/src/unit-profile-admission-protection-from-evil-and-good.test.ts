// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV60A protection_from_evil_and_good
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.creature-type-protection-and-charm
import { describe, expect, test } from "vitest";
import {
  charmPersonUnitId,
  oppositionSide,
  protectionFromEvilAndGoodUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackTargetFill,
  requireCombatant,
  requireHole,
  requireResultHole,
  statBlockAttackAct,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  knownWillingSpellTargetFill,
  savingThrowOutcomeFill,
  spellAct,
  spellActInvocation,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  applyCondition,
  applyFailedSaveSpellConditionEffects,
  battleCreatureStateWithKnockOutPreservedConditions,
  breakBattleConcentration,
  combatantId,
  conditionApplicationPreventedByCreatureTypeProtection,
  difficultyClass,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  resolveBattlePossessionAttempt,
  resolveBattleSubject,
  selectFailedSaveConditionEffect,
  spellId,
  spellSavingThrowOutcomeHole,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
  CombatantId,
  SupportedSpellInvocation,
} from "./unit-profile-admission-test-support.ts";

function selectedFixedConditionEffect(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedCondition" }
  >,
) {
  const selected = selectFailedSaveConditionEffect(invocation.effect, null);
  if (selected.tag !== "selected") {
    throw new Error("Expected a fixed failed-save condition effect.");
  }
  return selected.effect;
}

describe("SRDINV30C deterministic Protection from Evil and Good admission", () => {
  test("protection from evil and good imposes attack Disadvantage only for scoped creature types", () => {
    const spell = spellRecord(protectionFromEvilAndGoodUnitId);
    const undeadId = combatantId("unit-profile-protection-undead");
    const humanoidId = combatantId("unit-profile-protection-humanoid");
    const state = spellBattle({
      preparedSpells: [spell],
      statBlockTargets: [
        {
          combatantId: undeadId,
          statBlock: statBlockWithCreatureType("undead"),
          initiative: 19,
        },
        {
          combatantId: humanoidId,
          statBlock: statBlockWithCreatureType("humanoid"),
          initiative: 18,
        },
      ],
    });
    const act = spellAct({
      state,
      spellId: protectionFromEvilAndGoodUnitId,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    expect(targetHole.choices).toContain(spellTargetId);
    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            targetHole,
            protectionFromEvilAndGoodUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          protectionFromEvilAndGoodUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Protection from Evil and Good to resolve.");
    }
    expect(
      resolved.state.combatants.get(spellTargetId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "creatureTypeProtection",
        sourceSpellId: protectionFromEvilAndGoodUnitId,
        sourceCombatantId: spellCasterId,
        attackRollMode: "disadvantage",
        protectedAgainstCreatureTypes: [
          "aberration",
          "celestial",
          "elemental",
          "fey",
          "fiend",
          "undead",
        ],
        preventedConditions: ["charmed", "frightened"],
        preventsPossession: true,
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      }),
    );

    const undeadTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    expect(undeadTurn).toMatchObject({ tag: "resolved" });
    if (undeadTurn.tag !== "resolved") {
      throw new Error("Expected to advance to undead attacker turn.");
    }

    const undeadAttack = statBlockAttackAct(
      undeadTurn.state,
      undeadId,
      "Scimitar",
    );
    const undeadTarget = requireResultHole(
      resolveBattleSubject({
        state: undeadTurn.state,
        subject: undeadAttack.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const undeadRoll = requireResultHole(
      resolveBattleSubject({
        state: undeadTurn.state,
        subject: undeadAttack.subject,
        fills: [
          attackTargetFill(undeadTarget, undeadId, spellTargetId, "Scimitar"),
        ],
      }),
      "attackRoll",
    );
    expect(undeadRoll.rollMode).toBe("disadvantage");

    const humanoidTurn = endTurn({
      state: undeadTurn.state,
      actorId: undeadId,
    });
    expect(humanoidTurn).toMatchObject({ tag: "resolved" });
    if (humanoidTurn.tag !== "resolved") {
      throw new Error("Expected to advance to humanoid attacker turn.");
    }
    const humanoidAttack = statBlockAttackAct(
      humanoidTurn.state,
      humanoidId,
      "Scimitar",
    );
    const humanoidTarget = requireResultHole(
      resolveBattleSubject({
        state: humanoidTurn.state,
        subject: humanoidAttack.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const humanoidRoll = requireResultHole(
      resolveBattleSubject({
        state: humanoidTurn.state,
        subject: humanoidAttack.subject,
        fills: [
          attackTargetFill(
            humanoidTarget,
            humanoidId,
            spellTargetId,
            "Scimitar",
          ),
        ],
      }),
      "attackRoll",
    );
    expect(humanoidRoll.rollMode).toBeUndefined();
  });
  test("protection from evil and good prevents new Charmed or Frightened from scoped creature types only", () => {
    const protection = spellRecord(protectionFromEvilAndGoodUnitId);
    const charmPerson = spellRecord(charmPersonUnitId);
    const feySourceId = combatantId("unit-profile-protection-fey-source");
    const state = spellBattle({
      preparedSpells: [protection, charmPerson],
      statBlockTargets: [
        {
          combatantId: feySourceId,
          statBlock: statBlockWithCreatureType("fey"),
          initiative: 9,
        },
      ],
    });
    const protectionAct = spellAct({
      state,
      spellId: protectionFromEvilAndGoodUnitId,
    });
    const protectionTarget = requireHole(
      protectionAct.initialHoles,
      "targetChoice",
    );
    const protectedResult = resolveBattleSubject({
      state,
      subject: protectionAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          protectionTarget,
          protectionFromEvilAndGoodUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(protectedResult).toMatchObject({ tag: "resolved" });
    if (protectedResult.tag !== "resolved") {
      throw new Error("Expected Protection from Evil and Good to resolve.");
    }

    const charmInvocation = spellActInvocation(
      spellAct({ state, spellId: charmPersonUnitId }),
    );
    if (charmInvocation.procedure !== "saveGatedCondition") {
      throw new Error("Expected Charm Person to be a save-gated condition.");
    }
    const charmEffect = selectedFixedConditionEffect(charmInvocation);
    const targetTurn = endTurn({
      state: protectedResult.state,
      actorId: spellCasterId,
    });
    expect(targetTurn).toMatchObject({ tag: "resolved" });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected to advance to the protected target turn.");
    }
    const protectedTarget = requireCombatant(targetTurn.state, spellTargetId);
    if (protectedTarget.positiveHpUnconscious !== null) {
      throw new Error("Expected conscious Protection target.");
    }
    expect(
      conditionApplicationPreventedByCreatureTypeProtection(
        protectedResult.state,
        feySourceId,
        protectedTarget,
        "frightened",
      ),
    ).toBe(true);
    expect(
      resolveBattlePossessionAttempt({
        state: protectedResult.state,
        sourceCombatantId: feySourceId,
        targetId: spellTargetId,
      }),
    ).toEqual({
      tag: "prevented",
      prevention: "creatureTypeProtection",
      sourceCombatantId: feySourceId,
      targetId: spellTargetId,
    });
    expect(
      resolveBattlePossessionAttempt({
        state: protectedResult.state,
        sourceCombatantId: spellCasterId,
        targetId: spellTargetId,
      }),
    ).toEqual({
      tag: "unprevented",
      sourceCombatantId: spellCasterId,
      targetId: spellTargetId,
    });

    const scopedSourceApplied = applyFailedSaveSpellConditionEffects(
      protectedResult.state,
      feySourceId,
      [spellTargetId],
      charmInvocation,
      charmEffect,
    );
    expect(requireCombatant(scopedSourceApplied, spellTargetId)).toMatchObject({
      conditions: expect.not.objectContaining({ charmed: true }),
      activeEffects: expect.not.arrayContaining([
        expect.objectContaining({
          kind: "spellCondition",
          condition: "charmed",
        }),
      ]),
    });

    const unscopedSourceApplied = applyFailedSaveSpellConditionEffects(
      protectedResult.state,
      spellCasterId,
      [spellTargetId],
      charmInvocation,
      charmEffect,
    );
    expect(
      requireCombatant(unscopedSourceApplied, spellTargetId),
    ).toMatchObject({
      conditions: expect.objectContaining({ charmed: true }),
      activeEffects: expect.arrayContaining([
        expect.objectContaining({
          kind: "spellCondition",
          sourceCombatantId: spellCasterId,
          condition: "charmed",
        }),
      ]),
    });
  });
  test("protection from evil and good condition prevention ends with Concentration", () => {
    const protection = spellRecord(protectionFromEvilAndGoodUnitId);
    const charmPerson = spellRecord(charmPersonUnitId);
    const undeadSourceId = combatantId("unit-profile-protection-undead-source");
    const state = spellBattle({
      preparedSpells: [protection, charmPerson],
      statBlockTargets: [
        {
          combatantId: undeadSourceId,
          statBlock: statBlockWithCreatureType("undead"),
          initiative: 9,
        },
      ],
    });
    const protectionAct = spellAct({
      state,
      spellId: protectionFromEvilAndGoodUnitId,
    });
    const targetHole = requireHole(protectionAct.initialHoles, "targetChoice");
    const protectedResult = resolveBattleSubject({
      state,
      subject: protectionAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          protectionFromEvilAndGoodUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    if (protectedResult.tag !== "resolved") {
      throw new Error("Expected Protection from Evil and Good to resolve.");
    }
    const charmInvocation = spellActInvocation(
      spellAct({ state, spellId: charmPersonUnitId }),
    );
    if (charmInvocation.procedure !== "saveGatedCondition") {
      throw new Error("Expected Charm Person to be a save-gated condition.");
    }
    const charmEffect = selectedFixedConditionEffect(charmInvocation);

    const concentrationBroken = breakBattleConcentration(
      protectedResult.state,
      spellCasterId,
    );
    expect(
      requireCombatant(concentrationBroken, spellTargetId).activeEffects,
    ).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ kind: "creatureTypeProtection" }),
      ]),
    );
    expect(
      resolveBattlePossessionAttempt({
        state: concentrationBroken,
        sourceCombatantId: undeadSourceId,
        targetId: spellTargetId,
      }),
    ).toEqual({
      tag: "unprevented",
      sourceCombatantId: undeadSourceId,
      targetId: spellTargetId,
    });

    const afterScopedSource = applyFailedSaveSpellConditionEffects(
      concentrationBroken,
      undeadSourceId,
      [spellTargetId],
      charmInvocation,
      charmEffect,
    );
    expect(requireCombatant(afterScopedSource, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ charmed: true }),
      activeEffects: expect.arrayContaining([
        expect.objectContaining({
          kind: "spellCondition",
          sourceCombatantId: undeadSourceId,
          condition: "charmed",
        }),
      ]),
    });
  });
  test("protection from evil and good does not project Advantage onto fresh spell-cast saves", () => {
    const protection = spellRecord(protectionFromEvilAndGoodUnitId);
    const charmPerson = spellRecord(charmPersonUnitId);
    const feySourceId = combatantId(
      "unit-profile-protection-save-hole-fey-source",
    );
    const state = spellBattle({
      preparedSpells: [protection, charmPerson],
      statBlockTargets: [
        {
          combatantId: feySourceId,
          statBlock: statBlockWithCreatureType("fey"),
          initiative: 9,
          side: oppositionSide,
        },
      ],
    });
    const protectionAct = spellAct({
      state,
      spellId: protectionFromEvilAndGoodUnitId,
    });
    const targetHole = requireHole(protectionAct.initialHoles, "targetChoice");
    const protectedResult = resolveBattleSubject({
      state,
      subject: protectionAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          protectionFromEvilAndGoodUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    if (protectedResult.tag !== "resolved") {
      throw new Error("Expected Protection from Evil and Good to resolve.");
    }

    const charmInvocation = spellActInvocation(
      spellAct({ state, spellId: charmPersonUnitId }),
    );
    if (charmInvocation.procedure !== "saveGatedCondition") {
      throw new Error("Expected Charm Person to be a save-gated condition.");
    }
    expect(
      spellSavingThrowOutcomeHole(
        protectedResult.state,
        feySourceId,
        charmInvocation,
      ).targetRollModes.filter(
        (projection) => projection.targetId === spellTargetId,
      ),
    ).toEqual([]);
  });
  test("protection from evil and good projects Advantage onto saves against already-applied relevant effects", () => {
    const protection = spellRecord(protectionFromEvilAndGoodUnitId);
    const feySourceId = combatantId(
      "unit-profile-protection-repeat-save-fey-source",
    );
    const humanoidSourceId = combatantId(
      "unit-profile-protection-repeat-save-humanoid-source",
    );
    const state = spellBattle({
      preparedSpells: [protection],
      statBlockTargets: [
        {
          combatantId: feySourceId,
          statBlock: statBlockWithCreatureType("fey"),
          initiative: 9,
          side: oppositionSide,
        },
        {
          combatantId: humanoidSourceId,
          statBlock: statBlockWithCreatureType("humanoid"),
          initiative: 8,
          side: oppositionSide,
        },
      ],
    });
    const protectionAct = spellAct({
      state,
      spellId: protectionFromEvilAndGoodUnitId,
    });
    const targetHole = requireHole(protectionAct.initialHoles, "targetChoice");
    const protectedResult = resolveBattleSubject({
      state,
      subject: protectionAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          protectionFromEvilAndGoodUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    if (protectedResult.tag !== "resolved") {
      throw new Error("Expected Protection from Evil and Good to resolve.");
    }
    const targetTurn = endTurn({
      state: protectedResult.state,
      actorId: spellCasterId,
    });
    expect(targetTurn).toMatchObject({ tag: "resolved" });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected to advance to the protected target turn.");
    }
    const protectedTarget = requireCombatant(targetTurn.state, spellTargetId);
    const charmedEffect = {
      kind: "spellCondition",
      sourceSpellId: charmPersonUnitId,
      sourceCombatantId: feySourceId,
      condition: "charmed",
      conditionHadNonSpellSource: false,
      escape: { kind: "targetDamagedByCasterOrAlly" },
      turnStartDamage: null,
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(600) },
    } as const satisfies BattleActiveEffect;
    const repeatCharmedEffect = {
      kind: "spellConditionRepeatSave",
      sourceSpellId: "unit-profile-repeat-charm-effect",
      sourceCombatantId: feySourceId,
      condition: "charmed",
      conditionHadNonSpellSource: false,
      save: { ability: "wis", dc: { kind: "fixed", dc: difficultyClass(13) } },
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(600) },
    } as const satisfies BattleActiveEffect;
    const repeatFrightenedEffect = {
      ...repeatCharmedEffect,
      sourceSpellId: "unit-profile-fear-effect",
      condition: "frightened",
    } as const satisfies BattleActiveEffect;
    const possessionEffect = {
      kind: "possession",
      sourceSpellId: "unit-profile-possession-effect",
      sourceCombatantId: feySourceId,
      save: { ability: "cha", dc: { kind: "fixed", dc: difficultyClass(14) } },
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(600) },
    } as const satisfies BattleActiveEffect;
    const humanoidCharmEffect = {
      ...repeatCharmedEffect,
      sourceSpellId: "unit-profile-humanoid-charm-effect",
      sourceCombatantId: humanoidSourceId,
    } as const satisfies BattleActiveEffect;
    const targetWithRelevantEffects: BattleCreatureState = {
      ...battleCreatureStateWithKnockOutPreservedConditions(
        protectedTarget,
        applyCondition(
          applyCondition(protectedTarget.conditions, "charmed"),
          "frightened",
        ),
      ),
      activeEffects: [
        ...protectedTarget.activeEffects,
        charmedEffect,
        repeatCharmedEffect,
        repeatFrightenedEffect,
        possessionEffect,
        humanoidCharmEffect,
      ],
    };
    const activeEffectState: BattleState = {
      ...targetTurn.state,
      combatants: new Map(targetTurn.state.combatants).set(
        spellTargetId,
        targetWithRelevantEffects,
      ),
    };
    const discoveredRelevantSaveSubjects = discoverBattleActs(activeEffectState)
      .map((act) => act.subject)
      .filter(
        (subject) =>
          subject.tag === "runtimeCommand" &&
          subject.command === "protectionRelevantEffectSave",
      );
    expect(discoveredRelevantSaveSubjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceSpellId: spellId("unit-profile-repeat-charm-effect"),
          relevantEffect: "charmed",
        }),
        expect.objectContaining({
          sourceSpellId: spellId("unit-profile-fear-effect"),
          relevantEffect: "frightened",
        }),
        expect.objectContaining({
          sourceSpellId: spellId("unit-profile-possession-effect"),
          relevantEffect: "possession",
        }),
      ]),
    );
    expect(discoveredRelevantSaveSubjects).not.toContainEqual(
      expect.objectContaining({ sourceSpellId: spellId(charmPersonUnitId) }),
    );

    const relevantEffectSaveNeedsHoles = (
      sourceCombatantId: CombatantId,
      sourceSpellId: string,
      relevantEffect: "charmed" | "frightened" | "possession",
    ) =>
      resolveBattleSubject({
        state: activeEffectState,
        subject: {
          tag: "runtimeCommand",
          actorId: spellTargetId,
          command: "protectionRelevantEffectSave",
          sourceCombatantId,
          sourceSpellId: spellId(sourceSpellId),
          relevantEffect,
        },
        fills: [],
      });
    const ordinaryCharmSave = relevantEffectSaveNeedsHoles(
      feySourceId,
      charmPersonUnitId,
      "charmed",
    );
    expect(ordinaryCharmSave).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    const feyCharmSave = relevantEffectSaveNeedsHoles(
      feySourceId,
      "unit-profile-repeat-charm-effect",
      "charmed",
    );
    const feyFrightenedSave = relevantEffectSaveNeedsHoles(
      feySourceId,
      "unit-profile-fear-effect",
      "frightened",
    );
    const feyPossessionSave = relevantEffectSaveNeedsHoles(
      feySourceId,
      "unit-profile-possession-effect",
      "possession",
    );
    const humanoidCharmSave = relevantEffectSaveNeedsHoles(
      humanoidSourceId,
      "unit-profile-humanoid-charm-effect",
      "charmed",
    );
    for (const result of [feyCharmSave, feyFrightenedSave, feyPossessionSave]) {
      expect(result).toMatchObject({
        tag: "needsHoles",
        holes: [
          expect.objectContaining({
            kind: "savingThrowOutcome",
            targetRollModes: [
              { targetId: spellTargetId, rollMode: "advantage" },
            ],
          }),
        ],
      });
    }
    expect(humanoidCharmSave).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "savingThrowOutcome",
          targetRollModes: [],
        }),
      ],
    });
    if (feyCharmSave.tag !== "needsHoles") {
      throw new Error("Expected an already-applied Charmed save act.");
    }
    const feyCharmHole = requireHole(feyCharmSave.holes, "savingThrowOutcome");
    const afterSuccessfulSave = resolveBattleSubject({
      state: activeEffectState,
      subject: feyCharmSave.subject,
      fills: [
        savingThrowOutcomeFill(feyCharmHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(afterSuccessfulSave).toMatchObject({ tag: "resolved" });
    if (afterSuccessfulSave.tag !== "resolved") {
      throw new Error("Expected Charmed repeat save to resolve.");
    }
    expect(
      requireCombatant(afterSuccessfulSave.state, spellTargetId).activeEffects,
    ).not.toContainEqual(repeatCharmedEffect);
    expect(
      requireCombatant(afterSuccessfulSave.state, spellTargetId).activeEffects,
    ).toContainEqual(charmedEffect);
  });
});
