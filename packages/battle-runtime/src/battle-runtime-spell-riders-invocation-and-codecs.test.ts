import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { battleObjectId } from "./identity.ts";
import {
  battleProcedureExecutionRefForTest,
  startBattleSessionRight,
  requireResolved,
  requireHole,
  targetFill,
  attackTargetFill,
  attackRollFill,
  movementFill,
  savingThrowOutcomeFill,
  damageRollFill,
  damageRollFillWithGroups,
  characterSeed,
  wizardSpellcasting,
  slotAttackDamageSpell,
  spellRecord,
  magicSubject,
  fighterAttackSubject,
  characterAttackSubjectForTest,
  attackExecutionSelectionForSubjectForTest,
  fighterId,
  goblinId,
  skeletonId,
  wizardId,
  secondWizardId,
  attackBonus,
  BattleFillSchema,
  BattleHoleSchema,
  BattleSubjectSchema,
  battleId,
  Either,
  elapsedTimeTicks,
  endTurn,
  discoverBattleActs,
  findAct,
  holeId,
  holeInstanceKey,
  movementFeet,
  resolveBattleSubject,
  Schema,
} from "./battle-runtime.test-support.ts";
import type {
  BattleSubject,
  BattleRuntimeSession,
  CombatantId,
} from "./battle-runtime.test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: spell riders, invocations, and codecs", () => {
  test("spell attack riders use SRD-specific expiration anchors", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-spell-rider-anchors"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("shocking_grasp")],
            preparedSpells: [
              spellRecord("guiding_bolt"),
              spellRecord("ray_of_sickness"),
            ],
            spellSlots: [{ spellLevel: 1, count: 3 }],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Fighter",
          initiative: 15,
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
        }),
      ],
    });

    const state = session.state;
    const sicknessSubject = findAct(
      session,
      magicSubject("ray_of_sickness"),
    ).subject;
    const shockingGraspSubject = findAct(
      session,
      magicSubject("shocking_grasp"),
    ).subject;
    const sickTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: sicknessSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const sickRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: sicknessSubject,
        fills: [targetFill(sickTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const sickDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: sicknessSubject,
        fills: [
          targetFill(sickTarget, skeletonId),
          attackRollFill(sickRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const sick = requireResolved(
      resolveBattleSubject({
        state,
        subject: sicknessSubject,
        fills: [
          targetFill(sickTarget, skeletonId),
          attackRollFill(sickRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(sickDamage, [[1, 1]]),
        ],
      }),
    );
    expect(sick.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ poisoned: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "spellCondition",
          condition: "poisoned",
          expiresAt: {
            kind: "endOfTurn",
            combatantId: wizardId,
            round: 2,
          },
        }),
      ],
    });
    const afterWizard = endTurn({ state: sick.state, actorId: wizardId });
    const afterFighter =
      afterWizard.tag === "resolved"
        ? endTurn({ state: afterWizard.state, actorId: fighterId })
        : afterWizard;
    const afterSkeleton =
      afterFighter.tag === "resolved"
        ? endTurn({ state: afterFighter.state, actorId: skeletonId })
        : afterFighter;
    const afterNextWizard =
      afterSkeleton.tag === "resolved"
        ? endTurn({ state: afterSkeleton.state, actorId: wizardId })
        : afterSkeleton;
    expect(afterNextWizard).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: fighterId },
          {
            combatantId: skeletonId,
            conditions: expect.not.arrayContaining(["poisoned"]),
          },
        ],
      },
    });

    const graspTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: shockingGraspSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const graspRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: shockingGraspSubject,
        fills: [targetFill(graspTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const graspDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: shockingGraspSubject,
        fills: [
          targetFill(graspTarget, skeletonId),
          attackRollFill(graspRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const grasp = requireResolved(
      resolveBattleSubject({
        state,
        subject: shockingGraspSubject,
        fills: [
          targetFill(graspTarget, skeletonId),
          attackRollFill(graspRoll, { total: 18, naturalD20: 12 }),
          damageRollFill(graspDamage, 1),
        ],
      }),
    );
    expect(
      grasp.state.combatants.get(skeletonId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "opportunityAttackDenied",
        expiresAt: { kind: "startOfTurn", combatantId: skeletonId },
      }),
    );
    const fighterTurn = requireResolved(
      endTurn({ state: grasp.state, actorId: wizardId }),
    ).state;
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const move = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject: moveSubject,
        fills: [],
      }),
      "movement",
    );
    expect(
      resolveBattleSubject({
        state: fighterTurn,
        subject: moveSubject,
        fills: [
          movementFill(move, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [
              {
                reactorId: skeletonId,
                ...attackExecutionSelectionForSubjectForTest(
                  characterAttackSubjectForTest(
                    fighterTurn,
                    skeletonId,
                    "Longsword",
                  ),
                ),
              },
            ],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
  });

  test("spell condition riders preserve unrelated pre-existing conditions", () => {
    const poisonedSession = startBattleSessionRight({
      battleId: battleId("battle-spell-condition-rider-source"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("ray_of_sickness")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          conditions: ["poisoned"],
        }),
      ],
    });
    const poisoned = poisonedSession.state;
    const subject = findAct(
      poisonedSession,
      magicSubject("ray_of_sickness"),
    ).subject;
    const target = requireHole(
      resolveBattleSubject({
        state: poisoned,
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: poisoned,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: poisoned,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(roll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state: poisoned,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(roll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[1, 1]]),
        ],
      }),
    );
    const skeletonTurn = requireResolved(
      endTurn({ state: resolved.state, actorId: wizardId }),
    ).state;
    const nextWizard = endTurn({ state: skeletonTurn, actorId: skeletonId });
    if (nextWizard.tag !== "resolved") {
      throw new Error("Expected turn sequence to resolve.");
    }
    const refreshRoll = requireHole(
      resolveBattleSubject({
        state: nextWizard.state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const refreshDamage = requireHole(
      resolveBattleSubject({
        state: nextWizard.state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(refreshRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const refreshed = requireResolved(
      resolveBattleSubject({
        state: nextWizard.state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(refreshRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(refreshDamage, [[1, 1]]),
        ],
      }),
    );
    const nextSkeletonAfterRefresh = requireResolved(
      endTurn({ state: refreshed.state, actorId: wizardId }),
    ).state;
    const nextWizardAfterRefresh = requireResolved(
      endTurn({ state: nextSkeletonAfterRefresh, actorId: skeletonId }),
    ).state;
    const expired = endTurn({
      state: nextWizardAfterRefresh,
      actorId: wizardId,
    });
    expect(expired).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          {
            combatantId: skeletonId,
            conditions: expect.arrayContaining(["poisoned"]),
          },
        ],
      },
    });
  });

  test("overlapping spell condition riders preserve a pre-existing non-spell condition source", () => {
    const poisoned = startBattleSessionRight({
      battleId: battleId("battle-spell-condition-rider-overlap-source"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("ray_of_sickness")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Second Wizard",
          initiative: 15,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("ray_of_sickness")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          conditions: ["poisoned"],
        }),
      ],
    });

    const castRayOfSickness = (
      session: BattleRuntimeSession,
      actorId: CombatantId,
    ) => {
      const act = discoverBattleActs(session).find(
        (candidate) =>
          candidate.subject.actorId === actorId &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            "ray_of_sickness",
      );
      if (act?.subject.tag !== "actionSpell") {
        throw new Error("Expected Ray of Sickness action-spell act.");
      }
      const subject = act.subject;
      const state = session.state;
      const spatialFacts = [
        {
          kind: "spellTarget" as const,
          casterId: actorId,
          targetId: skeletonId,
          sourceProcedureRef: subject.procedureRef,
        },
      ];
      const target = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      );
      const roll = requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [targetFill(target, skeletonId, spatialFacts)],
        }),
        "attackRoll",
      );
      const damage = requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetFill(target, skeletonId, spatialFacts),
            attackRollFill(roll, { total: 18, naturalD20: 12 }),
          ],
        }),
        "rolledDice",
      );
      const resolvedState = requireResolved(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetFill(target, skeletonId, spatialFacts),
            attackRollFill(roll, { total: 18, naturalD20: 12 }),
            damageRollFillWithGroups(damage, [[1, 1]]),
          ],
        }),
      ).state;
      return battleRuntimeSessionForTest({
        state: resolvedState,
        context: session.context,
      });
    };

    const firstSpell = castRayOfSickness(poisoned, wizardId);
    const secondWizardTurn = requireResolved(
      endTurn({ state: firstSpell.state, actorId: wizardId }),
    ).state;
    const secondSpell = castRayOfSickness(
      battleRuntimeSessionForTest({
        state: secondWizardTurn,
        context: firstSpell.context,
      }),
      secondWizardId,
    );
    const skeletonTurn = requireResolved(
      endTurn({ state: secondSpell.state, actorId: secondWizardId }),
    ).state;
    const nextWizardTurn = requireResolved(
      endTurn({ state: skeletonTurn, actorId: skeletonId }),
    ).state;
    const firstSpellExpired = requireResolved(
      endTurn({ state: nextWizardTurn, actorId: wizardId }),
    ).state;
    expect(firstSpellExpired.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ poisoned: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "spellCondition",
          sourceCombatantId: secondWizardId,
          condition: "poisoned",
        }),
      ],
    });

    const allSpellSourcesExpired = endTurn({
      state: firstSpellExpired,
      actorId: secondWizardId,
    });
    expect(allSpellSourcesExpired).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: secondWizardId },
          {
            combatantId: skeletonId,
            conditions: expect.arrayContaining(["poisoned"]),
          },
        ],
      },
    });
    expect(
      requireResolved(allSpellSourcesExpired).state.combatants.get(skeletonId)
        ?.activeEffects,
    ).not.toContainEqual(
      expect.objectContaining({
        kind: "spellCondition",
        condition: "poisoned",
      }),
    );
  });

  test("one-shot spell attack-roll riders affect only matching attack rolls", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-spell-one-shot-riders"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("vicious_mockery")],
            preparedSpells: [spellRecord("guiding_bolt")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Fighter",
          initiative: 15,
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
        }),
      ],
    });
    const state = session.state;
    const guidingBoltSubject = findAct(
      session,
      magicSubject("guiding_bolt"),
    ).subject;
    const viciousMockerySubject = findAct(
      session,
      magicSubject("vicious_mockery"),
    ).subject;
    const guidingTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: guidingBoltSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const guidingRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: guidingBoltSubject,
        fills: [targetFill(guidingTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const guidingDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: guidingBoltSubject,
        fills: [
          targetFill(guidingTarget, skeletonId),
          attackRollFill(guidingRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const guided = requireResolved(
      resolveBattleSubject({
        state,
        subject: guidingBoltSubject,
        fills: [
          targetFill(guidingTarget, skeletonId),
          attackRollFill(guidingRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(guidingDamage, [[1, 1, 1, 1]]),
        ],
      }),
    );
    const fighterTurn = endTurn({ state: guided.state, actorId: wizardId });
    if (fighterTurn.tag !== "resolved") {
      throw new Error("Expected Fighter turn after Guiding Bolt.");
    }
    const fighterAttack: BattleSubject = fighterAttackSubject(
      state,
      "Longsword",
    );
    const fighterTarget = requireHole(
      resolveBattleSubject({
        state: fighterTurn.state,
        subject: fighterAttack,
        fills: [],
      }),
      "targetChoice",
    );
    const fighterRoll = requireHole(
      resolveBattleSubject({
        state: fighterTurn.state,
        subject: fighterAttack,
        fills: [attackTargetFill(fighterTarget, fighterId, skeletonId)],
      }),
      "attackRoll",
    );
    expect(fighterRoll).toMatchObject({ rollMode: "advantage" });
    const consumed = resolveBattleSubject({
      state: fighterTurn.state,
      subject: fighterAttack,
      fills: [
        attackTargetFill(fighterTarget, fighterId, skeletonId),
        attackRollFill(fighterRoll, {
          total: 8,
          naturalD20: 4,
          rollMode: "advantage",
        }),
      ],
    });
    expect(consumed).toMatchObject({ tag: "resolved" });
    expect(
      requireResolved(consumed).state.combatants.get(skeletonId)?.activeEffects,
    ).toEqual([]);

    const mockeryTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: viciousMockerySubject,
        fills: [],
      }),
      "targetChoice",
    );
    const save = requireHole(
      resolveBattleSubject({
        state,
        subject: viciousMockerySubject,
        fills: [targetFill(mockeryTarget, skeletonId)],
      }),
      "savingThrowOutcome",
    );
    const mockeryDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: viciousMockerySubject,
        fills: [
          targetFill(mockeryTarget, skeletonId),
          savingThrowOutcomeFill(save, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    const mocked = requireResolved(
      resolveBattleSubject({
        state,
        subject: viciousMockerySubject,
        fills: [
          targetFill(mockeryTarget, skeletonId),
          savingThrowOutcomeFill(save, [
            { targetId: skeletonId, succeeded: false },
          ]),
          damageRollFill(mockeryDamage, 1),
        ],
      }),
    );
    const afterWizard = endTurn({ state: mocked.state, actorId: wizardId });
    const afterFighter =
      afterWizard.tag === "resolved"
        ? endTurn({ state: afterWizard.state, actorId: fighterId })
        : afterWizard;
    if (afterFighter.tag !== "resolved") {
      throw new Error("Expected Skeleton turn after Vicious Mockery.");
    }
    const skeletonAttack: BattleSubject = characterAttackSubjectForTest(
      afterFighter.state,
      skeletonId,
      "Longsword",
    );
    const skeletonTarget = requireHole(
      resolveBattleSubject({
        state: afterFighter.state,
        subject: skeletonAttack,
        fills: [],
      }),
      "targetChoice",
    );
    const skeletonRoll = requireHole(
      resolveBattleSubject({
        state: afterFighter.state,
        subject: skeletonAttack,
        fills: [attackTargetFill(skeletonTarget, skeletonId, wizardId)],
      }),
      "attackRoll",
    );
    expect(skeletonRoll).toMatchObject({ rollMode: "disadvantage" });
  });

  test("spell damage invocation holes reject contradictory access and resource pairs", () => {
    const spell = slotAttackDamageSpell();
    const baseHole = {
      kind: "rolledDice",
      holeId: holeId("battle:test:invalid-spell-damage"),
      holeInstanceKey: holeInstanceKey("battle:test:invalid-spell-damage"),
      label: "Invalid spell damage",
      critical: false,
      spell: {
        procedure: "spellAttackDamage",
        spell,
        targeting: { kind: "singleCombatant" },
        damage: { expr: { dice: 1, dieSize: 8 }, damageType: "cold" },
        rangeFeet: movementFeet(60),
        attackKind: "ranged_spell_attack",
        attackBonus: attackBonus(5),
        postDamageRiders: [],
      },
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "classCantrip" },
            resource: { tag: "spellSlot", slotLevel: 1 },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "prepared" },
            resource: { tag: "none" },
          },
        }),
      ),
    ).toBe(true);
  });

  test("persistent armor invocation holes reject contradictory Armor of Shadows resource pairs", () => {
    const baseHole = {
      kind: "spellTargetList",
      holeId: holeId("battle:test:invalid-persistent-armor"),
      holeInstanceKey: holeInstanceKey("battle:test:invalid-persistent-armor"),
      label: "Invalid persistent armor target",
      minTargets: 1,
      maxTargets: 1,
      choices: [fighterId],
      requiresTableSpatialFact: true,
      spell: {
        procedure: "persistentArmorEffect",
        spell: { id: "mage_armor" },
        rangeFeet: movementFeet(0),
        activeEffect: { tag: "mageArmor" },
      },
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "prepared" },
            resource: { tag: "none" },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "armorOfShadows" },
            resource: { tag: "spellSlot", slotLevel: 1 },
          },
        }),
      ),
    ).toBe(true);
  });

  test("spell saving throw outcome codec preserves target roll modes", () => {
    const hole = {
      kind: "savingThrowOutcome",
      holeId: holeId("battle:test:charm-person-save"),
      holeInstanceKey: holeInstanceKey("battle:test:charm-person-save"),
      label: "Spell Saving Throw outcomes",
      sourceProcedureRef: battleProcedureExecutionRefForTest("charm-person"),
      outcomeTargeting: "singleTarget",
      ability: "wis",
      dc: { kind: "caster_spell_save_dc" },
      areaChoices: [],
      targetRollModes: [{ targetId: goblinId, rollMode: "advantage" }],
      targetFlatBonuses: [],
      relationshipFactRequest: {
        kind: "savingThrowTargetIsEnemy",
        actorId: wizardId,
      },
    };

    const decoded = Schema.decodeUnknownEither(BattleHoleSchema)(hole);

    if (Either.isLeft(decoded)) {
      throw new Error(String(decoded.left));
    }
    expect(decoded.right).toMatchObject({
      kind: "savingThrowOutcome",
      targetRollModes: [{ targetId: goblinId, rollMode: "advantage" }],
    });
  });

  test("spell target-list codec preserves the willing-target evidence request", () => {
    const encoded = {
      kind: "spellTargetList",
      holeId: holeId("battle:test:willing-target-list"),
      holeInstanceKey: holeInstanceKey("battle:test:willing-target-list"),
      label: "Synthetic willing targets",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "willing-target-list",
      ),
      minTargets: 1,
      maxTargets: 1,
      spatialTargeting: { kind: "individualTargets" },
      choices: [fighterId],
      requiresTableSpatialFact: true,
      requiresKnownWillingTargets: true,
    };
    const decoded = Schema.decodeUnknownEither(BattleHoleSchema)(encoded);

    if (Either.isLeft(decoded)) throw new Error(String(decoded.left));
    expect(decoded.right).toMatchObject({
      kind: "spellTargetList",
      requiresKnownWillingTargets: true,
    });
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...encoded,
          procedure: "jumpMovementReplacement",
        }),
      ),
    ).toBe(true);
  });

  test.each([
    {
      tag: "actionSpell" as const,
      mode: { tag: "cast" as const },
    },
    {
      tag: "bonusActionSpell" as const,
      mode: { tag: "cast" as const },
    },
    {
      tag: "findFamiliarTouchSpell" as const,
      companionId: goblinId,
      spellAction: "action" as const,
      mode: { tag: "cast" as const },
    },
  ])(
    "$tag replay subject codec rejects redundant component weapon identity",
    (subject) => {
      expect(
        Either.isLeft(
          Schema.decodeUnknownEither(BattleSubjectSchema)({
            ...subject,
            actorId: wizardId,
            procedureRef: battleProcedureExecutionRefForTest(
              "hosted-weapon-procedure",
            ),
            componentWeaponObjectId: battleObjectId("main:synthetic-weapon"),
          }),
        ),
      ).toBe(true);
    },
  );

  test("rolled-dice codec rejects positional Empowered Spell die identity", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          kind: "rolledDice",
          holeId: holeId("battle:test:empowered-spell"),
          spellDamageReroll: {
            kind: "reroll",
            effectKind: "damage_dice_reroll",
            dice: [{ dieRef: "legacy-position", original: 1, replacement: 2 }],
          },
          value: [{ results: [1] }],
        }),
      ),
    ).toBe(true);
  });

  test("movement codec preserves Forceful Blow straight-toward-target facts", () => {
    const hole = {
      kind: "movement",
      holeId: "battle:test:forceful-blow-movement",
      holeInstanceKey: "battle:test:forceful-blow-movement",
      label: "Forceful Blow movement straight toward target",
      actorId: fighterId,
      movementBudgetFeet: 15,
      speedKinds: [{ kind: "walk", movementBudgetFeet: 15 }],
      brutalStrikeForcefulBlow: {
        kind: "brutalStrikeForcefulBlowStraightTowardTarget",
        targetId: goblinId,
      },
    };
    const decodedHole = Schema.decodeUnknownEither(BattleHoleSchema)(hole);
    expect(Either.isRight(decodedHole)).toBe(true);
    if (Either.isRight(decodedHole)) {
      expect(decodedHole.right).toMatchObject({
        brutalStrikeForcefulBlow: {
          kind: "brutalStrikeForcefulBlowStraightTowardTarget",
          targetId: goblinId,
        },
      });
    }
    const fill = {
      kind: "movement",
      holeId: "battle:test:forceful-blow-movement",
      value: {
        speedKind: "walk",
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
        additionalSpeedSegments: [
          {
            speedKind: "fly",
            movementCostFeet: 5,
            provokedOpportunityAttacks: [],
          },
        ],
        brutalStrikeForcefulBlow: {
          kind: "brutalStrikeForcefulBlowStraightTowardTarget",
          targetId: goblinId,
        },
      },
    };
    const decodedFill = Schema.decodeUnknownEither(BattleFillSchema)(fill);
    expect(Either.isRight(decodedFill)).toBe(true);
    if (Either.isRight(decodedFill)) {
      expect(Schema.encodeSync(BattleFillSchema)(decodedFill.right)).toEqual(
        fill,
      );
    }
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          ...fill,
          value: {
            ...fill.value,
            brutalStrikeForcefulBlow: {
              kind: "brutalStrikeForcefulBlowStraightTowardTarget",
            },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          ...fill,
          value: {
            ...fill.value,
            commandFlee: {
              kind: "commandFleeFastestAvailableRouteAwayFromCaster",
            },
          },
        }),
      ),
    ).toBe(true);
  });

  test("spell saving throw outcome codec rejects incomplete Grease area facts", () => {
    const invalidGreaseArea = {
      originAnchorId: wizardId,
      affectedTargetIds: [goblinId],
      kind: "greaseGroundArea",
    };
    const greaseInvocation = {
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: 1 },
      procedure: "greaseGroundHazard",
      spell: { id: "grease" },
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
      targeting: { kind: "pointOriginCube", sideFeet: movementFeet(10) },
      durationTicks: elapsedTimeTicks(10),
      rangeFeet: movementFeet(60),
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          kind: "savingThrowOutcome",
          holeId: holeId("battle:test:invalid-grease-area-hole"),
          holeInstanceKey: holeInstanceKey(
            "battle:test:invalid-grease-area-hole",
          ),
          label: "Invalid Grease area facts",
          spell: greaseInvocation,
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          areaChoices: [invalidGreaseArea],
          targetRollModes: [],
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          kind: "savingThrowOutcome",
          holeId: "battle:test:invalid-grease-area-fill",
          value: {
            area: invalidGreaseArea,
            outcomes: [{ targetId: goblinId, succeeded: false }],
          },
        }),
      ),
    ).toBe(true);
  });

  test("Sanctuary interdiction codec admits only Wisdom save holes", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          kind: "sanctuaryInterdictionOutcome",
          holeId: holeId("battle:test:invalid-sanctuary-save"),
          holeInstanceKey: holeInstanceKey(
            "battle:test:invalid-sanctuary-save",
          ),
          label: "Invalid Sanctuary save",
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("sanctuary"),
          ),
          sourceCombatantId: wizardId,
          wardedCombatantId: wizardId,
          triggeringCombatantId: goblinId,
          triggeringTargetEventId: holeId(
            "battle:test:invalid-sanctuary-target-event",
          ),
          ability: "str",
          dc: { kind: "caster_spell_save_dc" },
          choices: [fighterId],
        }),
      ),
    ).toBe(true);
  });

  test("Sanctuary replacement target fills reject malformed spatial facts", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          kind: "sanctuaryInterdictionOutcome",
          holeId: holeId("battle:test:invalid-sanctuary-replacement-fact"),
          value: {
            saveSucceeded: false,
            outcome: {
              kind: "newTarget",
              targetId: fighterId,
              replacementTargetKind: "nonAttack",
              spatialFacts: [
                {
                  kind: "notBattleTargetSpatialFact",
                  targetId: fighterId,
                },
              ],
            },
          },
        }),
      ),
    ).toBe(true);
  });

  test("spell-hosted weapon invocation holes reject non-weapon component attacks", () => {
    const baseHole = {
      kind: "attackRoll",
      holeId: holeId("battle:test:invalid-true-strike-component"),
      holeInstanceKey: holeInstanceKey(
        "battle:test:invalid-true-strike-component",
      ),
      label: "Invalid True Strike component attack",
      attackBonus: attackBonus(3),
      spell: {
        access: { tag: "classCantrip" },
        resource: { tag: "none" },
        procedure: "spellHostedWeaponAttack",
        spell: { id: "true_strike" },
        actionCost: "magicAction",
        componentWeapon: {
          itemId: "main:unarmed",
          attack: {
            kind: "unarmedStrike",
            effect: {
              kind: "damage",
              damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
            },
            attackAbility: "str",
            attackAbilityModifier: 0,
            attackBonus: 2,
            damageAbilityModifier: 0,
          },
        },
        spellcastingAbilityModifier: 3,
        damageTypeChoices: ["radiant", "bludgeoning"],
        bonusDamage: {
          expr: { dice: 1, dieSize: 6 },
          damageType: "radiant",
        },
      },
    };

    expect(
      Either.isLeft(Schema.decodeUnknownEither(BattleHoleSchema)(baseHole)),
    ).toBe(true);
  });
});
