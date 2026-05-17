import {
  startBattleRight,
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
} from "./battle-runtime-test-support.ts";
import type { BattleSubject } from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Starry Wisp", () => {
  test("Starry Wisp applies a shared Dim Light emitter to a hit creature until the caster's next turn ends", () => {
    const state = startBattleRight({
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
    const subject = magicSubject("starry_wisp");
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
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Starry Wisp damage (2d8-radiant)",
      spell: expect.objectContaining({
        targeting: { kind: "singleCreatureOrObject" },
        attackKind: "ranged_spell_attack",
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 2, dieSize: 8 },
          damageType: "radiant",
        },
        postDamageRiders: [
          {
            kind: "lightEmission",
            emission: { kind: "dim", radiusFeet: 10 },
            expiresAt: "endOfCasterNextTurn",
          },
          {
            kind: "invisibleBenefitDenied",
            expiresAt: "endOfCasterNextTurn",
          },
        ],
      }),
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, skeletonId),
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[5, 6]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        lightEmitters: [
          {
            sourceSpellId: "starry_wisp",
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
          { combatantId: skeletonId, hp: 2 },
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

    const afterWizardNextTurn = requireResolved(
      endTurn({
        state: afterSkeletonTurn.state,
        actorId: wizardId,
      }),
    );
    expect(afterWizardNextTurn.state.lightEmitters).toEqual([]);
  });

  test("Starry Wisp hit denies Invisible benefit without removing the condition until the caster's next turn ends", () => {
    const allyId = combatantId("starry-wisp-ally");
    const state = startBattleRight({
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
    const skeleton = state.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected Starry Wisp target combatant.");
    }
    const invisibleState = {
      ...state,
      combatants: new Map(state.combatants).set(
        skeletonId,
        testBattleCreatureStateWithConditions(
          skeleton,
          applyCondition(skeleton.conditions, "invisible"),
        ),
      ),
    };
    const subject = magicSubject("starry_wisp");
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
          sourceSpellId: "starry_wisp",
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
    const allyAttack: BattleSubject = {
      tag: "action",
      actorId: allyId,
      action: "attack",
      attackName: "Longsword",
    };
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
    const state = startBattleRight({
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
    const subject = magicSubject("starry_wisp");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        objectTargetFill({
          hole: objectTarget,
          spellId: "starry_wisp",
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
    const state = startBattleRight({
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
    const subject = magicSubject("starry_wisp");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      spellId: "starry_wisp",
      armorClass: armorClass(13),
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );

    const result = resolveBattleSubject({
      state,
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
    const state = startBattleRight({
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
    const subject = magicSubject("starry_wisp");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      spellId: "starry_wisp",
      armorClass: armorClass(13),
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({ rollMode: "disadvantage" });
    expect(attackRoll).not.toHaveProperty("missToHitReplacements");

    expect(
      resolveBattleSubject({
        state,
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
      state,
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
    const state = startBattleRight({
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
    const subject = magicSubject("starry_wisp");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const objectId = battleObjectId("training-crystal");
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      objectId,
      spellId: "starry_wisp",
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(5) },
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFillForObject,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
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
          damageType: "radiant",
          rolledDamage: damageAmount(6),
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
            sourceSpellId: "starry_wisp",
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
    expect(objectInvisibleBenefitDenied(resolved.state, objectId)).toBe(true);
    expect(resolved.state.objectOutlines).toEqual([]);

    const thresholdObjectId = battleObjectId("reinforced-training-crystal");
    const thresholdTargetFill = objectTargetFill({
      hole: objectTarget,
      objectId: thresholdObjectId,
      spellId: "starry_wisp",
      damageDisposition: {
        kind: "hitPointsWithDamageThreshold",
        hitPoints: Hp(10),
        damageThreshold: damageAmount(10),
      },
    });
    const thresholdDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          thresholdTargetFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const thresholdResult = resolveBattleSubject({
      state,
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
          rolledDamage: damageAmount(6),
          effectiveDamage: damageAmount(0),
          priorHitPoints: Hp(10),
          nextHitPoints: Hp(10),
          destroyed: false,
        },
      ],
    });
  });

  test("Starry Wisp object Invisible-benefit denial expires with its object Dim Light emitter", () => {
    const state = startBattleRight({
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
    const subject = magicSubject("starry_wisp");
    const objectId = battleObjectId("invisible-training-crystal");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const objectFill = objectTargetFill({
      hole: objectTarget,
      objectId,
      spellId: "starry_wisp",
      damageDisposition: { kind: "tableResolved" },
    });
    const attackRoll = requireHole(
      resolveBattleSubject({ state, subject, fills: [objectFill] }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
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
        state,
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
        sourceSpellId: "starry_wisp",
        objectId,
      }),
    ]);

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
