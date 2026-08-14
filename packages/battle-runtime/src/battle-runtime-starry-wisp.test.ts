import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  startBattleSessionRight,
  assertBattleSnapshotCodecRoundTripForTest,
  testBattleCreatureStateWithConditions,
  requireResolved,
  requireHole,
  findHole,
  findAct,
  targetFill,
  objectTargetFill,
  attackTargetFill,
  attackRollFill,
  damageRollFillWithGroups,
  characterSeed,
  characterAttackSubjectForTest,
  skeletonCreatureInit,
  wizardSpellcasting,
  spellRecord,
  magicSubject,
  expendedLevelOneSlots,
  skeletonId,
  wizardId,
  applyCondition,
  armorClass,
  battleId,
  battleObjectId,
  combatantCanSee,
  combatantId,
  damageAmount,
  endTurn,
  hasCondition,
  Hp,
  movementFeet,
  objectInvisibleBenefitDenied,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import type { BattleSubject } from "./battle-runtime.test-support.ts";
import { battleLightEmitterProjection } from "./battle-reducer/spells-active-effects.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Starry Wisp", () => {
  test("Starry Wisp applies a shared Dim Light emitter to a hit creature until the caster's next turn ends", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-starry-wisp-creature"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = findAct(state, magicSubject("starry_wisp")).subject;
    const act = findAct(state, subject);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: expect.arrayContaining([skeletonId]),
      }),
      expect.objectContaining({ kind: "objectTargetChoice" }),
    ]);

    const target = findHole(act.initialHoles, "targetChoice");
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Spell damage (2d8-radiant)",
    });

    const result = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        targetFill(target, skeletonId),
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[2, 3]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        lightEmitters: [
          {
            sourceProcedureRef: expect.any(String),
            sourceCombatantId: wizardId,
            attachment: { kind: "combatant", combatantId: skeletonId },
            emission: { kind: "dim", radiusFeet: movementFeet(10) },
            expiresAt: {
              kind: "endOfTurn",
              combatantId: wizardId,
              round: 2,
            },
          },
        ],
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 8 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect("objectDamages" in requireResolved(result)).toBe(false);
    expect(expendedLevelOneSlots(requireResolved(result), wizardId)).toBe(0);

    const afterWizardTurn = requireResolved(
      endTurn({
        state: requireResolved(result).state,
        actorId: wizardId,
      }),
    );
    expect(afterWizardTurn.state.lightEmitters).toHaveLength(1);

    const afterSkeletonTurn = requireResolved(
      endTurn({
        state: afterWizardTurn.state,
        actorId: skeletonId,
      }),
    );
    expect(afterSkeletonTurn.state.lightEmitters).toHaveLength(1);

    const refreshedSession = battleRuntimeSessionForTest({
      state: afterSkeletonTurn.state,
      context: state.context,
    });
    const refreshedSubject = findAct(
      refreshedSession,
      magicSubject("starry_wisp"),
    ).subject;
    const refreshedTarget = findHole(
      findAct(refreshedSession, refreshedSubject).initialHoles,
      "targetChoice",
    );
    const refreshedTargetFill = targetFill(refreshedTarget, skeletonId);
    const refreshedAttackRoll = requireHole(
      resolveBattleSubject({
        state: afterSkeletonTurn.state,
        subject: refreshedSubject,
        fills: [refreshedTargetFill],
      }),
      "attackRoll",
    );
    const refreshedAttackRollFill = attackRollFill(refreshedAttackRoll, {
      total: 18,
      naturalD20: 12,
    });
    const refreshedDamage = requireHole(
      resolveBattleSubject({
        state: afterSkeletonTurn.state,
        subject: refreshedSubject,
        fills: [refreshedTargetFill, refreshedAttackRollFill],
      }),
      "rolledDice",
    );
    const refreshed = requireResolved(
      resolveBattleSubject({
        state: afterSkeletonTurn.state,
        subject: refreshedSubject,
        fills: [
          refreshedTargetFill,
          refreshedAttackRollFill,
          damageRollFillWithGroups(refreshedDamage, [[1, 1]]),
        ],
      }),
    );
    expect(refreshed.state.lightEmitters).toEqual([
      expect.objectContaining({
        attachment: { kind: "combatant", combatantId: skeletonId },
        expiresAt: {
          kind: "endOfTurn",
          combatantId: wizardId,
          round: 3,
        },
      }),
    ]);

    const afterRefreshedWizardTurn = requireResolved(
      endTurn({
        state: refreshed.state,
        actorId: wizardId,
      }),
    );
    expect(afterRefreshedWizardTurn.state.lightEmitters).toHaveLength(1);
    const afterSecondSkeletonTurn = requireResolved(
      endTurn({
        state: afterRefreshedWizardTurn.state,
        actorId: skeletonId,
      }),
    );
    const afterWizardThirdTurn = requireResolved(
      endTurn({
        state: afterSecondSkeletonTurn.state,
        actorId: wizardId,
      }),
    );
    expect(afterWizardThirdTurn.state.lightEmitters).toEqual([]);
  });

  test("Starry Wisp hit denies Invisible benefit without removing the condition until the caster's next turn ends", () => {
    const allyId = combatantId("starry-wisp-ally");
    const state = startBattleSessionRight({
      battleId: battleId("battle-starry-wisp-invisible-denial"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Ally",
          initiative: 15,
        }),
        skeletonCreatureInit({
          initiative: 10,
        }),
      ],
    });
    const skeleton = state.state.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected Starry Wisp target combatant.");
    }
    const invisibleState = {
      ...state.state,
      combatants: new Map(state.state.combatants).set(
        skeletonId,
        testBattleCreatureStateWithConditions(
          skeleton,
          applyCondition(skeleton.conditions, "invisible"),
        ),
      ),
    };
    const invisibleSession = battleRuntimeSessionForTest({
      state: invisibleState,
      context: state.context,
    });
    const subject = findAct(
      invisibleSession,
      magicSubject("starry_wisp"),
    ).subject;
    const target = findHole(
      findAct(invisibleState, subject).initialHoles,
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: invisibleState,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    expect(combatantCanSee(invisibleState, allyId, skeletonId)).toBe(false);
    const damage = requireHole(
      resolveBattleSubject({
        state: invisibleState,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const hit = requireResolved(
      resolveBattleSubject({
        state: invisibleState,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[1, 1]]),
        ],
      }),
    );
    const hitTarget = hit.state.combatants.get(skeletonId);
    if (hitTarget === undefined) {
      throw new Error("Expected Starry Wisp hit target combatant.");
    }
    expect(hitTarget?.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "invisibleBenefitDenied",
          sourceProcedureRef: expect.any(String),
          sourceCombatantId: wizardId,
          expiresAt: {
            kind: "endOfTurn",
            combatantId: wizardId,
            round: 2,
          },
        }),
      ]),
    );
    expect(hasCondition(hitTarget.conditions, "invisible")).toBe(true);
    expect(combatantCanSee(hit.state, allyId, skeletonId)).toBe(true);

    const allyTurn = requireResolved(
      endTurn({ state: hit.state, actorId: wizardId }),
    );
    const allyAttack: BattleSubject = characterAttackSubjectForTest(
      allyTurn.state,
      allyId,
      "Longsword",
    );
    const allyTarget = requireHole(
      resolveBattleSubject({
        state: allyTurn.state,
        subject: allyAttack,
        fills: [],
      }),
      "targetChoice",
    );
    const allyAttackRoll = requireHole(
      resolveBattleSubject({
        state: allyTurn.state,
        subject: allyAttack,
        fills: [attackTargetFill(allyTarget, allyId, skeletonId)],
      }),
      "attackRoll",
    );
    expect(allyAttackRoll).not.toHaveProperty("rollMode");

    const skeletonTurn = requireResolved(
      endTurn({ state: allyTurn.state, actorId: allyId }),
    );
    const wizardNextTurn = requireResolved(
      endTurn({ state: skeletonTurn.state, actorId: skeletonId }),
    );
    const expired = requireResolved(
      endTurn({ state: wizardNextTurn.state, actorId: wizardId }),
    );
    const expiredTarget = expired.state.combatants.get(skeletonId);
    if (expiredTarget === undefined) {
      throw new Error("Expected expired Starry Wisp target combatant.");
    }
    expect(expiredTarget?.activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "invisibleBenefitDenied" }),
      ]),
    );
    expect(hasCondition(expiredTarget.conditions, "invisible")).toBe(true);
    expect(combatantCanSee(expired.state, allyId, skeletonId)).toBe(false);
  });

  test("Starry Wisp object targeting requires a matching caller-supplied object fact", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-starry-wisp-object-fact"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = findAct(state, magicSubject("starry_wisp")).subject;
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );

    const result = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        objectTargetFill({
          hole: objectTarget,
          rangeFeet: movementFeet(30),
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell object target must include a matching table-supplied range and object Armor Class fact.",
    });
  });

  test("Starry Wisp object target miss spends the Magic action without object damage", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-starry-wisp-object-miss"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = findAct(state, magicSubject("starry_wisp")).subject;
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      armorClass: armorClass(13),
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );

    const result = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 12, naturalD20: 7 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect("objectDamages" in requireResolved(result)).toBe(false);
    expect(requireResolved(result).state.lightEmitters).toEqual([]);
    expect(
      objectInvisibleBenefitDenied(
        requireResolved(result).state,
        targetFillForObject.value,
      ),
    ).toBe(false);
  });

  test("Starry Wisp object attack rolls enforce attacker-wide disadvantage", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-starry-wisp-object-poisoned"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          conditions: ["poisoned"],
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = findAct(state, magicSubject("starry_wisp")).subject;
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      armorClass: armorClass(13),
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({ rollMode: "disadvantage" });
    expect(attackRoll).not.toHaveProperty("missToHitReplacements");

    expect(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFillForObject,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell attack roll mode does not match the current attack-roll rule.",
    });

    const result = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, {
          total: 12,
          naturalD20: 7,
          rollMode: "disadvantage",
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect("objectDamages" in requireResolved(result)).toBe(false);
  });

  test("Starry Wisp applies object hit point and damage-threshold disposition on a hit", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-starry-wisp-object-hit"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = findAct(state, magicSubject("starry_wisp")).subject;
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const objectId = battleObjectId("training-crystal");
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      objectId,
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(5) },
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFillForObject,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[3, 3]]),
      ],
    });
    expect(result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          components: [
            { damageType: "radiant", rolledDamage: damageAmount(6) },
          ],
          rolledDamage: damageAmount(6),
          damageAfterImmunities: damageAmount(6),
          effectiveDamage: damageAmount(6),
          priorHitPoints: Hp(5),
          nextHitPoints: Hp(0),
          destroyed: true,
        },
      ],
      snapshot: {
        lightEmitters: [
          {
            kind: "objectInvisibleRevealLightEmitter",
            sourceProcedureRef: expect.any(String),
            sourceCombatantId: wizardId,
            objectId,
            emission: { kind: "dim", radiusFeet: movementFeet(10) },
          },
        ],
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    const resolved = requireResolved(result);
    assertBattleSnapshotCodecRoundTripForTest(resolved.snapshot);
    expect(objectInvisibleBenefitDenied(resolved.state, objectId)).toBe(true);
    expect(resolved.state.objectOutlines).toEqual([]);

    const thresholdObjectId = battleObjectId("reinforced-training-crystal");
    const thresholdTargetFill = objectTargetFill({
      hole: objectTarget,
      objectId: thresholdObjectId,
      damageDisposition: {
        kind: "hitPointsWithDamageThreshold",
        hitPoints: Hp(10),
        damageThreshold: damageAmount(10),
      },
    });
    const thresholdDamage = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          thresholdTargetFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const thresholdResult = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        thresholdTargetFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(thresholdDamage, [[3, 3]]),
      ],
    });

    expect(thresholdResult).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId: thresholdObjectId,
          components: [
            { damageType: "radiant", rolledDamage: damageAmount(6) },
          ],
          rolledDamage: damageAmount(6),
          damageAfterImmunities: damageAmount(6),
          effectiveDamage: damageAmount(0),
          priorHitPoints: Hp(10),
          nextHitPoints: Hp(10),
          destroyed: false,
        },
      ],
    });
  });

  test("Starry Wisp object Invisible-benefit denial expires with its object Dim Light emitter", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-starry-wisp-object-invisible-denial"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = findAct(state, magicSubject("starry_wisp")).subject;
    const objectId = battleObjectId("invisible-training-crystal");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const objectFill = objectTargetFill({
      hole: objectTarget,
      objectId,
      damageDisposition: { kind: "tableResolved" },
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [objectFill],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          objectFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const hit = requireResolved(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          objectFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[3, 3]]),
        ],
      }),
    );

    expect(objectInvisibleBenefitDenied(hit.state, objectId)).toBe(true);
    expect(hit.state.lightEmitters).toEqual([
      expect.objectContaining({
        kind: "objectInvisibleRevealLightEmitter",
        sourceProcedureRef: expect.any(String),
        objectId,
      }),
    ]);
    const emitter = hit.state.lightEmitters[0];
    if (emitter?.kind !== "objectInvisibleRevealLightEmitter") {
      throw new Error("Expected Starry Wisp object light emitter.");
    }
    const matchingFact = {
      kind: "object" as const,
      objectId,
      distanceFeet: movementFeet(5),
      opaqueCover: true,
    };
    expect(battleLightEmitterProjection(emitter, matchingFact)).toEqual({
      emitter,
      illumination: "dimLight",
    });
    expect(
      battleLightEmitterProjection(emitter, {
        ...matchingFact,
        objectId: battleObjectId("different-invisible-training-crystal"),
      }),
    ).toBeNull();

    const afterWizardTurn = requireResolved(
      endTurn({ state: hit.state, actorId: wizardId }),
    );
    const afterSkeletonTurn = requireResolved(
      endTurn({ state: afterWizardTurn.state, actorId: skeletonId }),
    );
    const afterWizardNextTurn = requireResolved(
      endTurn({ state: afterSkeletonTurn.state, actorId: wizardId }),
    );

    expect(objectInvisibleBenefitDenied(afterWizardTurn.state, objectId)).toBe(
      true,
    );
    expect(
      objectInvisibleBenefitDenied(afterSkeletonTurn.state, objectId),
    ).toBe(true);
    expect(
      objectInvisibleBenefitDenied(afterWizardNextTurn.state, objectId),
    ).toBe(false);
    expect(afterWizardNextTurn.state.lightEmitters).toEqual([]);
    expect(afterWizardNextTurn.state.objectOutlines).toEqual([]);
  });
});
