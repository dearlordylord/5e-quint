// KERNEL-COVERAGE: parity-witness BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE
import { unitId as parseUnitId } from "@dnd/shared/game-facts";
import {
  difficultyClass,
  movementFeet,
  resourceCount,
} from "@dnd/shared/types";
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { Result } from "effect";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  ammunitionStockIssues,
  missingRequiredAmmunitionKinds,
  requiredAmmunitionKinds,
  battleAmmunitionStock,
  ammunitionForAttackIsReady,
  spendAmmunitionForAcceptedAttack,
  spendAmmunitionForAcceptedAttackPendingContinuation,
} from "./battle-ammunition.ts";
import { attackActionOptionsForActor } from "./battle-reducer/attack-damage-apply.ts";
import { attackExecutionSelectionForOption } from "./battle-action-options.ts";
import { statBlockAttackDamageSelectionUsesOnlyComponentNotation } from "./stat-block-attack-damage-selection.ts";
import { BattleSnapshotSchema } from "./battle-reducer/battle-codecs.ts";
import { snapshotBattle } from "./battle-execution-composition.ts";
import {
  attackRollFill,
  battleFrontierInterruptDecisionForState,
  interruptDecisionFill,
  attackTargetDistanceSpatialFact,
  attackTargetFill,
  characterSeed,
  damageRollFill,
  fighterId,
  goblinId,
  readyTriggerDescriptionForTest,
  requireHole,
  skeletonId,
  skeletonCreatureInit,
  startBattleSessionRight,
  statBlockCreatureInit,
  longbowWeaponMasterySelections,
  testRangedCleaveLongbowAttack,
  testRangedCleaveLongbowUnitRef,
  testSlingAttack,
  testSlingUnitRef,
  wizardId,
  wizardVsSkeletonBattle,
} from "./battle-runtime.test-support.ts";
import { battleObjectId, battleTablePositionId } from "./identity.ts";
import { battleCreatureWithSpellCreatedHeldObjectHand } from "./battle-reducer/spell-created-held-object.ts";
import { battleStateWithGroundObjects } from "./battle-reducer/battle-object-lifecycle.ts";
import type { BattleState } from "./battle-state-execution.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import {
  battleId,
  battleInitializationIssueMessage,
  combatantId,
  discoverBattleActs,
  resolveBattleSubject,
  resolveBattleInterrupt,
  startBattle,
  type BattleFill,
} from "./index.ts";

describe("ammunition lifecycle", () => {
  it("rejects duplicate stocks and reports missing required stock at admission", () => {
    const skeleton = skeletonCreatureInit({ initiative: 10 });
    const withStocks = (
      ammunitionStocks: typeof skeleton.ammunitionStocks,
    ) => ({
      ...skeleton,
      ammunitionStocks,
    });

    const duplicate = startBattle({
      battleId: battleId("battle-ammunition-duplicate-stock"),
      combatants: [
        withStocks([
          battleAmmunitionStock("arrow", 20),
          battleAmmunitionStock("arrow", 19),
        ]),
      ],
    });
    expect(Result.isFailure(duplicate)).toBe(true);
    if (Result.isSuccess(duplicate)) return;
    expect(battleInitializationIssueMessage(duplicate.failure)).toBe(
      "Duplicate ammunition stock for ammunition kind: arrow",
    );

    const missing = startBattle({
      battleId: battleId("battle-ammunition-missing-stock"),
      combatants: [withStocks([])],
    });
    expect(Result.isFailure(missing)).toBe(true);
    if (Result.isSuccess(missing)) return;
    expect(battleInitializationIssueMessage(missing.failure)).toBe(
      "Stat Block battle initialization requires an explicit arrow ammunition stock.",
    );
  });

  it("derives distinct required and missing ammunition kinds across attack shapes", () => {
    const attacks = [
      { attackType: "melee" as const },
      { attackType: "ranged" as const },
      { attackType: "ranged" as const, ammunition: "arrow" as const },
      { attackType: "ranged" as const, ammunition: "arrow" as const },
      { attackType: "ranged" as const, ammunition: "bolt" as const },
    ];

    expect(requiredAmmunitionKinds(attacks)).toEqual(["arrow", "bolt"]);
    expect(
      missingRequiredAmmunitionKinds(attacks, [
        battleAmmunitionStock("arrow", 20),
      ]),
    ).toEqual(["bolt"]);
    expect(
      ammunitionStockIssues([
        battleAmmunitionStock("arrow", 20),
        battleAmmunitionStock("bolt", 20),
        battleAmmunitionStock("arrow", 19),
      ]),
    ).toEqual(["Duplicate ammunition stock for ammunition kind: arrow"]);
  });

  it("does not spend without an actor or positive stock and preserves other stocks", () => {
    const initial = wizardVsSkeletonBattle().state;
    const shortbow = attackActionOptionsForActor(initial, skeletonId).find(
      (attack) =>
        attack.kind === "statBlockAttack" &&
        attack.attack.ammunition === "arrow",
    );
    expect(shortbow).toBeDefined();
    if (shortbow?.kind !== "statBlockAttack") return;
    const actor = initial.combatants.get(skeletonId);
    expect(actor).toBeDefined();
    if (actor === undefined) return;

    const stocked = {
      ...initial,
      combatants: new Map(initial.combatants).set(skeletonId, {
        ...actor,
        ammunitionStocks: [
          battleAmmunitionStock("arrow", 1),
          battleAmmunitionStock("bolt", 7),
        ],
      }),
    };
    const spent = spendAmmunitionForAcceptedAttack({
      state: stocked,
      actorId: skeletonId,
      attack: shortbow,
    });
    expect(spent.combatants.get(skeletonId)?.ammunitionStocks).toEqual([
      battleAmmunitionStock("arrow", 0),
      battleAmmunitionStock("bolt", 7),
    ]);

    const exhausted = {
      ...stocked,
      combatants: new Map(stocked.combatants).set(skeletonId, {
        ...actor,
        ammunitionStocks: [
          battleAmmunitionStock("arrow", 0),
          battleAmmunitionStock("bolt", 7),
        ],
      }),
    };
    expect(
      spendAmmunitionForAcceptedAttack({
        state: exhausted,
        actorId: skeletonId,
        attack: shortbow,
      }),
    ).toBe(exhausted);

    const combatants = new Map(initial.combatants);
    combatants.delete(skeletonId);
    const missingActor = { ...initial, combatants };
    expect(
      spendAmmunitionForAcceptedAttack({
        state: missingActor,
        actorId: skeletonId,
        attack: shortbow,
      }),
    ).toBe(missingActor);
  });

  it("requires positive matching stock and spends an accepted attack exactly once across continuation", () => {
    const initial = wizardVsSkeletonBattle().state;
    const shortbow = attackActionOptionsForActor(initial, skeletonId).find(
      (attack) =>
        attack.kind === "statBlockAttack" &&
        attack.attack.ammunition === "arrow" &&
        statBlockAttackDamageSelectionUsesOnlyComponentNotation(
          attackExecutionSelectionForOption(attack).statBlockDamageSelection,
          "rolled",
        ),
    );
    expect(shortbow).toBeDefined();
    if (shortbow?.kind !== "statBlockAttack") return;
    const attackSelection = attackExecutionSelectionForOption(shortbow);

    const subject = {
      tag: "action" as const,
      actorId: skeletonId,
      action: "attack" as const,
      ...attackSelection,
    };
    const pending = spendAmmunitionForAcceptedAttackPendingContinuation({
      state: initial,
      actorId: skeletonId,
      attack: shortbow,
      subject,
    });
    expect(pending.combatants.get(skeletonId)?.ammunitionStocks).toEqual([
      { ammunition: "arrow", remaining: resourceCount(19) },
    ]);
    expect(
      spendAmmunitionForAcceptedAttackPendingContinuation({
        state: pending,
        actorId: skeletonId,
        attack: shortbow,
        subject,
      }).combatants.get(skeletonId)?.ammunitionStocks,
    ).toEqual([{ ammunition: "arrow", remaining: resourceCount(19) }]);

    const completed = spendAmmunitionForAcceptedAttack({
      state: pending,
      actorId: skeletonId,
      attack: shortbow,
    });
    expect(completed.subjectResolutionPhase).toEqual({
      kind: "subjectContinuation",
      subject,
    });
    const completedActor = completed.combatants.get(skeletonId);
    expect(completedActor).toBeDefined();
    if (completedActor === undefined) return;
    const emptyActor = {
      ...completedActor,
      ammunitionStocks: [
        { ammunition: "arrow" as const, remaining: resourceCount(0) },
      ],
    };
    const empty = {
      ...completed,
      combatants: new Map(completed.combatants).set(skeletonId, emptyActor),
    };
    expect(
      attackActionOptionsForActor(empty, skeletonId).some(
        (attack) =>
          attack.kind === "statBlockAttack" &&
          attack.attack.ammunition === "arrow",
      ),
    ).toBe(false);

    const snapshot = Schema.decodeUnknownSync(BattleSnapshotSchema)(
      snapshotBattle(pending),
    );
    expect(
      snapshot.combatants.find(
        (combatant) => combatant.combatantId === skeletonId,
      )?.ammunitionStocks,
    ).toEqual([{ ammunition: "arrow", remaining: resourceCount(19) }]);
  });

  it("spends on public miss and on public hit before damage continuation without double-spending", () => {
    const secondSkeletonId = combatantId("second-skeleton");
    const session = startBattleSessionRight({
      battleId: battleId("battle-ammunition-public-resolution"),
      combatants: [
        skeletonCreatureInit({ initiative: 20 }),
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          statBlock: skeletonCreatureInit({ initiative: 15 }).statBlock,
          statBlockName: "Second Skeleton",
          initiative: 15,
        }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Synthetic Target",
          initiative: 10,
          attack: null,
        }),
      ],
    });
    const shortbow = attackActionOptionsForActor(
      session.state,
      skeletonId,
    ).find(
      (attack) =>
        attack.kind === "statBlockAttack" &&
        attack.attack.ammunition === "arrow",
    );
    expect(shortbow).toBeDefined();
    if (shortbow?.kind !== "statBlockAttack") return;
    const attackAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.actorId === skeletonId &&
        candidate.presentation.kind === "attack" &&
        candidate.presentation.procedureRef === shortbow.procedureRef,
    );
    expect(attackAct).toBeDefined();
    if (
      attackAct === undefined ||
      attackAct.subject.tag !== "action" ||
      attackAct.subject.action !== "attack"
    ) {
      return;
    }
    const targetRequest = resolveBattleSubject({
      state: session.state,
      subject: attackAct.subject,
      fills: [],
    });
    const targetHole = requireHole(targetRequest, "targetChoice");
    const target = attackTargetFill(targetHole, skeletonId, wizardId);
    const rollRequest = resolveBattleSubject({
      state: session.state,
      subject: attackAct.subject,
      fills: [target],
    });
    const attackRoll = requireHole(rollRequest, "attackRoll");

    const missed = resolveBattleSubject({
      state: session.state,
      subject: attackAct.subject,
      fills: [target, attackRollFill(attackRoll, { total: 1, naturalD20: 1 })],
    });
    expect(missed.tag).toBe("resolved");
    if (missed.tag !== "resolved") return;
    expect(
      missed.state.combatants.get(skeletonId)?.ammunitionStocks[0]?.remaining,
    ).toBe(resourceCount(19));
    expect(
      missed.state.combatants.get(secondSkeletonId)?.ammunitionStocks[0]
        ?.remaining,
    ).toBe(resourceCount(20));

    const hit = resolveBattleSubject({
      state: session.state,
      subject: attackAct.subject,
      fills: [
        target,
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
      ],
    });
    const damageHole = requireHole(hit, "rolledDice");
    expect(hit.tag).toBe("needsHoles");
    if (hit.tag !== "needsHoles") return;
    expect(
      hit.state.combatants.get(skeletonId)?.ammunitionStocks[0]?.remaining,
    ).toBe(resourceCount(19));
    const completedHit = resolveBattleSubject({
      state: hit.state,
      subject: attackAct.subject,
      fills: [
        target,
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
        damageRollFill(damageHole, 4),
      ],
    });
    expect(completedHit.tag).toBe("resolved");
    if (completedHit.tag !== "resolved") return;
    expect(
      completedHit.state.combatants.get(skeletonId)?.ammunitionStocks[0]
        ?.remaining,
    ).toBe(resourceCount(19));
  });

  it("spends readied reaction-attack ammunition exactly once across a damage continuation", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-ammunition-reaction"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Synthetic Target",
          initiative: 20,
          attack: null,
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const shortbow = attackActionOptionsForActor(
      session.state,
      skeletonId,
    ).find(
      (attack) =>
        attack.kind === "statBlockAttack" &&
        attack.attack.ammunition === "arrow" &&
        statBlockAttackDamageSelectionUsesOnlyComponentNotation(
          attackExecutionSelectionForOption(attack).statBlockDamageSelection,
          "rolled",
        ),
    );
    expect(shortbow).toBeDefined();
    if (shortbow?.kind !== "statBlockAttack") return;
    const attackSelection = attackExecutionSelectionForOption(shortbow);
    const targetSpatialFacts = {
      kind: "targetSpatialFacts" as const,
      holeId: ATTACK_TARGET_HOLE_ID,
      spatialFacts: [
        attackTargetDistanceSpatialFact(
          skeletonId,
          wizardId,
          attackSelection,
          movementFeet(5),
        ),
        {
          kind: "rangedAttackEnemyProximity" as const,
          attackerId: skeletonId,
          procedureRef: shortbow.procedureRef,
          enemies: [],
        },
      ],
    };
    const state = {
      ...session.state,
      readiedResponses: new Map(session.state.readiedResponses).set(
        skeletonId,
        {
          trigger: readyTriggerDescriptionForTest("the synthetic target moves"),
          response: {
            kind: "attack" as const,
            selection: attackSelection,
          },
          expiresAt: { kind: "startOfTurn" as const, combatantId: skeletonId },
        },
      ),
    };
    const awaiting = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: wizardId,
        command: "reportReadyTrigger",
        readiedActorId: skeletonId,
      },
      fills: [],
    });
    if (awaiting.tag !== "needsHoles") {
      throw new Error("Expected the readied attack trigger checkpoint.");
    }
    const pending = battleFrontierInterruptDecisionForState(awaiting.state);
    const choice = pending?.choices.find(
      (candidate) =>
        candidate.kind === "nestedProcedure" &&
        candidate.subject.command === "releaseReadiedAttack",
    );
    if (
      pending === null ||
      choice?.kind !== "nestedProcedure" ||
      choice.subject.command !== "releaseReadiedAttack"
    ) {
      throw new Error("Expected the offered readied attack.");
    }
    const subject = choice.subject;
    const beginAttack = (fills: readonly BattleFill[]) =>
      resolveBattleInterrupt({
        state: awaiting.state,
        fill: interruptDecisionFill(pending.decisionHole, {
          kind: "resolve",
          responderId: skeletonId,
          choice: {
            kind: "releaseReadiedAttack",
            targetId: wizardId,
            procedureRef: subject.procedureRef,
            fills,
          },
        }),
      });
    const beyondLongRangeTargetSpatialFacts = {
      ...targetSpatialFacts,
      spatialFacts: [
        attackTargetDistanceSpatialFact(
          skeletonId,
          wizardId,
          attackSelection,
          movementFeet(400),
        ),
        ...targetSpatialFacts.spatialFacts.slice(1),
      ],
    };
    expect(beginAttack([beyondLongRangeTargetSpatialFacts])).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expect.stringContaining(
        "outside the selected attack's legal range",
      ),
    });
    const rollRequest = beginAttack([targetSpatialFacts]);
    if (rollRequest.tag !== "needsHoles") {
      throw new Error("Expected the active readied attack roll.");
    }
    const roll = requireHole(rollRequest, "attackRoll");
    const hit = resolveBattleSubject({
      state: rollRequest.state,
      subject,
      fills: [
        targetSpatialFacts,
        attackRollFill(roll, { total: 20, naturalD20: 15 }),
      ],
    });
    const damage = requireHole(hit, "rolledDice");
    expect(hit.tag).toBe("needsHoles");
    if (hit.tag !== "needsHoles") return;
    expect(
      hit.state.combatants.get(skeletonId)?.ammunitionStocks[0]?.remaining,
    ).toBe(resourceCount(19));
    const resolved = resolveBattleSubject({
      state: hit.state,
      subject,
      fills: [
        targetSpatialFacts,
        attackRollFill(roll, { total: 20, naturalD20: 15 }),
        damageRollFill(damage, 4),
      ],
    });
    expect(resolved.tag).toBe("resolved");
    if (resolved.tag !== "resolved") return;
    expect(
      resolved.state.combatants.get(skeletonId)?.ammunitionStocks[0]?.remaining,
    ).toBe(resourceCount(19));
  });

  describe("loading a one-handed Ammunition weapon", () => {
    // SRD "Ammunition": "Drawing the ammunition is part of the attack (you
    // need a free hand to load a one-handed weapon)."
    const sling = {
      itemId: battleObjectId("main:weapon_sling"),
      unitId: parseUnitId("weapon_sling"),
      grip: "one_handed" as const,
    };
    const slingWielder = (withShield: boolean) =>
      startBattleSessionRight({
        battleId: battleId("battle-ammunition-free-hand"),
        combatants: [
          characterSeed({
            initiative: 20,
            characterUnitRefs: [testSlingUnitRef()],
            attack: testSlingAttack(),
            ammunitionStocks: [battleAmmunitionStock("sling_bullet", 20)],
            selectedLoadout: withShield
              ? {
                  weapon: sling,
                  shield: {
                    itemId: battleObjectId("shield:equipment_shield"),
                    unitId: parseUnitId("equipment_shield"),
                  },
                }
              : { weapon: sling },
            armorClass: {
              ...defaultArmorClassState(),
              leftHandUse: withShield ? "shield" : "free",
              rightHandUse: "mainWeapon",
            },
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }).state;
    const weaponNames = (state: ReturnType<typeof slingWielder>) =>
      attackActionOptionsForActor(state, fighterId).flatMap((attack) =>
        attack.kind === "weapon" ? [attack.weapon.weaponUnitId] : [],
      );

    it("offers the attack while the other hand is free", () => {
      expect(weaponNames(slingWielder(false))).toEqual(["weapon_sling"]);
    });

    it("withholds the attack while the other hand holds a shield", () => {
      const state = slingWielder(true);
      expect(weaponNames(state)).toEqual([]);
      expect(
        attackActionOptionsForActor(state, fighterId).map(
          (attack) => attack.kind,
        ),
      ).toEqual(["unarmedStrike"]);
    });

    it("withholds the attack while the other hand grapples", () => {
      const free = slingWielder(false);
      const grappling = {
        ...free,
        grapples: [
          {
            grapplerId: fighterId,
            targetId: goblinId,
            escapeDc: difficultyClass(13),
            reachFeet: movementFeet(5),
            hand: "left" as const,
          },
        ],
      };
      expect(weaponNames(grappling)).toEqual([]);
    });

    // SRD "Two-Handed": "A Two-Handed weapon requires two hands when you
    // attack with it." Its second hand also loads it.
    const longbowWielder = (grappling: boolean) => {
      const state = startBattleSessionRight({
        battleId: battleId("battle-ammunition-two-handed-loading"),
        combatants: [
          characterSeed({
            initiative: 20,
            characterUnitRefs: [testRangedCleaveLongbowUnitRef()],
            attack: testRangedCleaveLongbowAttack(),
            weaponMasteries: longbowWeaponMasterySelections(),
            ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
            selectedLoadout: {
              weapon: {
                itemId: battleObjectId("main:weapon_longbow"),
                unitId: parseUnitId("weapon_longbow"),
                grip: "two_handed",
              },
            },
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }).state;
      return grappling
        ? {
            ...state,
            grapples: [
              {
                grapplerId: fighterId,
                targetId: goblinId,
                escapeDc: difficultyClass(13),
                reachFeet: movementFeet(5),
                hand: "left" as const,
              },
            ],
          }
        : state;
    };

    it("offers a Two-Handed Ammunition weapon held in both hands", () => {
      expect(weaponNames(longbowWielder(false))).toEqual(["weapon_longbow"]);
    });

    it("withholds a Two-Handed Ammunition weapon while its second hand grapples", () => {
      expect(weaponNames(longbowWielder(true))).toEqual([]);
    });

    it("fires with both hands on the same bow and spends its ammunition", () => {
      const state = longbowWielder(false);
      const attack = attackActionOptionsForActor(state, fighterId).find(
        (option) => option.kind === "weapon",
      );
      if (attack?.kind !== "weapon")
        throw new Error("Expected Longbow attack.");
      const subject = {
        tag: "action" as const,
        actorId: fighterId,
        action: "attack" as const,
        ...attackExecutionSelectionForOption(attack),
      };
      const target = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      );
      const targetChoice = attackTargetFill(
        target,
        fighterId,
        goblinId,
        attackExecutionSelectionForOption(attack),
        [],
        movementFeet(30),
      );
      const roll = requireHole(
        resolveBattleSubject({ state, subject, fills: [targetChoice] }),
        "attackRoll",
      );
      const fired = resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRollFill(roll, { total: 1, naturalD20: 1 }),
        ],
      });
      expect(fired.tag).toBe("resolved");
      if (fired.tag !== "resolved")
        throw new Error("Expected bow attack to resolve");
      expect(fired.state.combatants.get(fighterId)?.ammunitionStocks).toEqual([
        battleAmmunitionStock("arrow", 19),
      ]);
    });

    it("cannot fire a one-handed weapon with a grapple in the attacking hand", () => {
      const state = slingWielder(false);
      const occupied = {
        ...state,
        grapples: [
          {
            grapplerId: fighterId,
            targetId: goblinId,
            escapeDc: difficultyClass(13),
            reachFeet: movementFeet(5),
            hand: "right" as const,
          },
        ],
      };
      expect(weaponNames(occupied)).toEqual([]);
    });

    it("does not treat a spell-created held object as a loading hand", () => {
      const state = slingWielder(false);
      const actor = state.combatants.get(fighterId);
      if (actor === undefined) throw new Error("Expected Sling wielder.");
      const occupied = {
        ...state,
        combatants: new Map(state.combatants).set(
          fighterId,
          battleCreatureWithSpellCreatedHeldObjectHand(actor, "left"),
        ),
      };
      expect(weaponNames(occupied)).toEqual([]);
    });

    it.each(["left", "right"] as const)(
      "refuses a Two-Handed Ammunition attack with a grapple in its %s hand",
      (hand) => {
        const state = longbowWielder(false);
        const occupied = {
          ...state,
          grapples: [
            {
              grapplerId: fighterId,
              targetId: goblinId,
              escapeDc: difficultyClass(13),
              reachFeet: movementFeet(5),
              hand,
            },
          ],
        };
        expect(weaponNames(occupied)).toEqual([]);
      },
    );

    it.each(["shield", "offWeapon", "spellCreatedHeldObject"] as const)(
      "never counts foreign %s occupancy as operating the same Two-Handed weapon",
      (foreignUse) => {
        const state = longbowWielder(false);
        const actor = state.combatants.get(fighterId);
        if (actor === undefined) throw new Error("Expected Longbow wielder.");
        // Adversarial readiness input: an unrelated occupancy must not become
        // permission to operate the bow, even if a caller retains its grip.
        const occupied: BattleState = {
          ...state,
          combatants: new Map(state.combatants).set(fighterId, {
            ...actor,
            armorClass: { ...actor.armorClass, leftHandUse: foreignUse },
          }),
        };
        expect(weaponNames(occupied)).toEqual([]);
      },
    );

    it("uses the actual off-hand weapon identity and still requires a free loading hand", () => {
      const offHandWeaponId = battleObjectId("off:weapon_sling");
      const state = startBattleSessionRight({
        battleId: battleId("battle-ammunition-off-hand-readiness"),
        combatants: [
          characterSeed({
            initiative: 20,
            characterUnitRefs: [testSlingUnitRef()],
            attack: null,
            offHandAttack: {
              ...testSlingAttack(),
              weaponObjectId: offHandWeaponId,
            },
            ammunitionStocks: [battleAmmunitionStock("sling_bullet", 20)],
            selectedLoadout: {
              offHandWeapon: { itemId: offHandWeaponId, unitId: sling.unitId },
            },
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }).state;
      const actor = state.combatants.get(fighterId);
      if (
        actor?.origin.kind !== "character" ||
        actor.origin.offHandAttack === undefined
      ) {
        throw new Error("Expected held off-hand weapon.");
      }
      expect(
        ammunitionForAttackIsReady(state, actor, actor.origin.offHandAttack),
      ).toBe(true);
      for (const hand of ["left", "right"] as const) {
        const occupied = battleCreatureWithSpellCreatedHeldObjectHand(
          actor,
          hand,
        );
        const occupiedState = {
          ...state,
          combatants: new Map(state.combatants).set(fighterId, occupied),
        };
        expect(
          ammunitionForAttackIsReady(
            occupiedState,
            occupied,
            actor.origin.offHandAttack,
          ),
        ).toBe(false);
      }
    });

    it("requires custody of the same attacking weapon, not another selected weapon", () => {
      const state = longbowWielder(false);
      const actor = state.combatants.get(fighterId);
      if (
        actor?.origin.kind !== "character" ||
        actor.origin.attack?.kind !== "weapon"
      ) {
        throw new Error("Expected character Longbow attack.");
      }
      expect(
        ammunitionForAttackIsReady(state, actor, actor.origin.attack),
      ).toBe(true);
      expect(
        ammunitionForAttackIsReady(state, actor, {
          ...actor.origin.attack,
          weaponObjectId: battleObjectId("synthetic:another-bow"),
        }),
      ).toBe(false);
      const grounded = battleStateWithGroundObjects(state, [
        {
          actorId: fighterId,
          objectId: actor.origin.attack.weaponObjectId,
          positionId: battleTablePositionId("synthetic:bow-ground"),
          source: {
            kind: "spell",
            sourceCombatantId: goblinId,
            sourceProcedureRef: actor.origin.attack.procedureRef,
          },
        },
      ]);
      expect(grounded.tag).toBe("applied");
      if (grounded.tag !== "applied") return;
      expect(
        ammunitionForAttackIsReady(grounded.state, actor, actor.origin.attack),
      ).toBe(false);
    });
  });
});
