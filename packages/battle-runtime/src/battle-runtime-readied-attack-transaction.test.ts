import { unitId } from "@dnd/shared/game-facts";
import { classLevel } from "@dnd/shared/types";
import { resolveBattleRuntimeSubject } from "./battle-session-execution.ts";
import { expect, test } from "vitest";
import {
  settleBattleRuntimeTransaction,
  type BattleRuntimeTransactionResult,
} from "./battle-runtime-transaction.ts";
import {
  battleId,
  characterSeed,
  statBlockCreatureInit,
  startBattleSessionRight,
  fighterId,
  goblinId,
  readyDeclarationFillForTest,
  attackTargetDistanceSpatialFact,
  movementFeet,
  attackRollFill,
  damageRollFill,
  interruptDecisionFill,
  battleFrontierInterruptDecisionForState,
  battleObjectId,
  battleTablePositionId,
  characterBattleFeatureInitForTest,
  combatantId,
  findHole,
  reactionModifierChoice,
  reactionModifierUnitRef,
  requireCharacterSpellProcedureRefForTest,
  spellSlotInvocationRef,
  cuttingWordsDamageOnlyUnit,
  cuttingWordsResource,
  testDaggerAttack,
  testShortswordAttack,
  uncannyDodgeUnit,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { attackFillsForAttackHitReplay } from "./battle-reducer/attack-damage-events.ts";
import { battleContinuationFillEquals } from "./battle-reducer/battle-fill-equality.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import type {
  BattleSubject,
  ReadiedAttackWeaponChange,
} from "./battle-subjects.ts";
import type { BattleFill } from "./battle-state-execution.ts";
import { weaponDropPositionHole } from "./battle-reducer/attack-weapon-change.ts";
import { battleGroundObjectState } from "./battle-reducer/object-custody-queries.ts";
import { loadoutWeaponIsStowed } from "./battle-reducer/character-effective-loadout.ts";
import type { CombatantId } from "./identity.ts";
import type { BattleRuntimeSession } from "./index.ts";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";

const dropPositionId = battleTablePositionId("dropped-after-readied-attack");
const offHandDaggerId = battleObjectId("off:weapon_dagger");

type TransactionOperation = Parameters<
  typeof settleBattleRuntimeTransaction
>[0]["operation"];

/**
 * Drives one session through `settleBattleRuntimeTransaction`, keeping the
 * session and the open transaction between operations.
 */
function transactionDriver(initial: BattleRuntimeSession) {
  let session = initial;
  let transaction: Parameters<
    typeof settleBattleRuntimeTransaction
  >[0]["transaction"] = null;
  const settle = (operation: TransactionOperation) => {
    const result = settleBattleRuntimeTransaction({
      session,
      transaction,
      operation,
    });
    if (result.tag === "needsHoles") {
      session = result.resolution.session;
      transaction = result.transaction;
    } else if (result.tag === "settled") {
      session = result.session;
      transaction = null;
    } else
      throw new Error(
        `Unexpected transaction result: ${
          "message" in result.resolution
            ? result.resolution.message
            : result.tag
        }`,
      );
    return result;
  };
  return {
    settle,
    subject: (value: BattleSubject, fills: readonly BattleFill[] = []) =>
      settle({ kind: "ordinarySubject", subject: value, fills }),
    session: () => session,
  };
}

function pendingFrontier(result: BattleRuntimeTransactionResult) {
  if (result.tag !== "needsHoles")
    throw new Error("Expected pending transaction");
  return result.resolution.envelope.frontier;
}

function targetSpatialFactsFill(
  targetId: CombatantId,
  selection: Parameters<typeof attackTargetDistanceSpatialFact>[2],
  distance: number,
): Extract<BattleFill, { readonly kind: "targetSpatialFacts" }> {
  return {
    kind: "targetSpatialFacts",
    holeId: ATTACK_TARGET_HOLE_ID,
    spatialFacts: [
      attackTargetDistanceSpatialFact(
        fighterId,
        targetId,
        selection,
        movementFeet(distance),
      ),
    ],
  };
}

/**
 * The Fighter takes the Ready action with its attack response, ends its turn,
 * and `triggerActorId` reports the trigger. Returns the attack response and
 * the trigger's interrupt decision hole.
 */
function readyAttackAndReportTrigger(
  driver: ReturnType<typeof transactionDriver>,
  turnsToEnd: readonly CombatantId[],
  triggerActorId: CombatantId,
) {
  const ready = { tag: "action", actorId: fighterId, action: "ready" } as const;
  const declarationFrontier = pendingFrontier(driver.subject(ready));
  const declaration =
    declarationFrontier.kind === "holes"
      ? declarationFrontier.holes[0]
      : undefined;
  if (declaration?.kind !== "readyDeclaration")
    throw new Error("Expected Ready declaration");
  const response = declaration.responseChoices.find(
    (choice) => choice.kind === "attack",
  );
  if (response?.kind !== "attack") throw new Error("Expected attack response");
  driver.subject(ready, [
    readyDeclarationFillForTest(
      declaration,
      "When the opponent moves",
      response,
    ),
  ]);
  for (const actorId of turnsToEnd) {
    driver.subject({ tag: "runtimeCommand", actorId, command: "endTurn" });
  }
  const trigger = pendingFrontier(
    driver.subject({
      tag: "runtimeCommand",
      actorId: triggerActorId,
      command: "reportReadyTrigger",
      readiedActorId: fighterId,
    }),
  );
  if (trigger.kind !== "interruptDecision")
    throw new Error("Expected Ready trigger decision");
  return { response, triggerHole: trigger.decisionHole };
}

function releaseReadiedAttack(
  driver: ReturnType<typeof transactionDriver>,
  readied: ReturnType<typeof readyAttackAndReportTrigger>,
  targetId: CombatantId,
  spatialFill = targetSpatialFactsFill(targetId, readied.response.selection, 5),
  weaponChange?: ReadiedAttackWeaponChange,
) {
  const changeFills: BattleFill[] =
    weaponChange?.change.kind === "drop"
      ? [
          {
            kind: "weaponDropPosition",
            holeId: weaponDropPositionHole(
              fighterId,
              weaponChange.change.objectId,
            ).holeId,
            value: { positionId: dropPositionId },
          },
        ]
      : [];
  const released = pendingFrontier(
    driver.settle({
      kind: "interruptDecision",
      fill: interruptDecisionFill(readied.triggerHole, {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "releaseReadiedAttack",
          targetId,
          procedureRef: readied.response.selection.procedureRef,
          ...(weaponChange === undefined ? {} : { weaponChange }),
          fills: [...changeFills, spatialFill],
        },
      }),
    }),
  );
  if (released.kind !== "holes") throw new Error("Expected attack roll");
  return released;
}

test("readied attack transaction retains spatial evidence exactly once across attack and damage", () => {
  const driver = transactionDriver(
    startBattleSessionRight({
      battleId: battleId("readied-attack-transaction"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    }),
  );
  const readied = readyAttackAndReportTrigger(driver, [fighterId], goblinId);
  const attackFrontier = releaseReadiedAttack(driver, readied, goblinId);
  const attackRollHole = findHole(attackFrontier.holes, "attackRoll");
  const spatial = (distance: number) =>
    targetSpatialFactsFill(goblinId, readied.response.selection, distance);
  const observedRoll = attackRollFill(attackRollHole, {
    total: 30,
    naturalD20: 15,
  });
  // Direct owner callers must not replace an admitted distance. Transaction
  // replay supplies the exact retained fill; both paths share native validation.
  const conflict = resolveBattleRuntimeSubject({
    session: driver.session(),
    subject: attackFrontier.replaySubject,
    fills: [spatial(10), observedRoll],
  });
  expect(conflict.tag).toBe("invalid");
  const duplicate = resolveBattleRuntimeSubject({
    session: driver.session(),
    subject: attackFrontier.replaySubject,
    fills: [spatial(5), spatial(5), observedRoll],
  });
  expect(duplicate.tag).toBe("invalid");
  const exactReplay = resolveBattleRuntimeSubject({
    session: driver.session(),
    subject: attackFrontier.replaySubject,
    fills: [spatial(5), observedRoll],
  });
  expect(exactReplay.tag).toBe("needsHoles");
  const damageFrontier = pendingFrontier(
    driver.subject(attackFrontier.replaySubject, [
      attackRollFill(attackRollHole, { total: 30, naturalD20: 15 }),
    ]),
  );
  if (damageFrontier.kind !== "holes") throw new Error("Expected damage roll");
  const finished = driver.subject(damageFrontier.replaySubject, [
    damageRollFill(findHole(damageFrontier.holes, "rolledDice"), 1),
  ]);
  expect(finished.tag).toBe("settled");
  const session = driver.session();
  expect(session.state.combatants.get(fighterId)?.reactionAvailable).toBe(
    false,
  );
  expect(session.state.readiedResponses.has(fighterId)).toBe(false);
});

test("direct readied attack continuation accepts reordered facts but rejects replacements and duplicates", () => {
  const driver = transactionDriver(
    startBattleSessionRight({
      battleId: battleId("readied-attack-spatial-replay"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    }),
  );
  const readied = readyAttackAndReportTrigger(driver, [fighterId], goblinId);
  const visibility = {
    kind: "attackTargetCannotSeeAttacker",
    attackerId: fighterId,
    targetId: goblinId,
  } as const;
  const spatial = (distance: number) => {
    const fill = targetSpatialFactsFill(
      goblinId,
      readied.response.selection,
      distance,
    );
    return { ...fill, spatialFacts: [...fill.spatialFacts, visibility] };
  };
  const attack = releaseReadiedAttack(driver, readied, goblinId, spatial(5));
  const observedRoll = attackRollFill(findHole(attack.holes, "attackRoll"), {
    total: 20,
    rollMode: "advantage",
    rolledD20s: { first: 15, second: 10 },
  });
  const original = spatial(5);
  const reordered = {
    ...original,
    spatialFacts: [...original.spatialFacts].reverse(),
  };
  for (const fills of [[], [spatial(5)], [reordered]]) {
    const result = resolveBattleRuntimeSubject({
      session: driver.session(),
      subject: attack.replaySubject,
      fills: [...fills, observedRoll],
    });
    expect(result.tag).toBe("needsHoles");
    if (result.tag !== "needsHoles")
      throw new Error("Expected pending damage roll");
    const frontier = result.envelope.frontier;
    if (frontier.kind !== "holes") throw new Error("Expected damage holes");
    expect(findHole(frontier.holes, "rolledDice").kind).toBe("rolledDice");
  }
  for (const fills of [
    [spatial(10)],
    [spatial(5), spatial(5)],
    [original, reordered],
  ]) {
    const result = resolveBattleRuntimeSubject({
      session: driver.session(),
      subject: attack.replaySubject,
      fills: [...fills, observedRoll],
    });
    expect(result.tag).toBe("invalid");
    if (result.tag !== "invalid")
      throw new Error("Expected spatial fill rejection");
    expect(result.message).toBe(
      "Attack target spatial facts were filled twice.",
    );
  }
});

/**
 * A Fighter readies a Dagger attack for when a level 5 Rogue moves, releases
 * it at the Rogue, and hits. The Rogue's Uncanny Dodge Reaction is offered on
 * the hit; `rogueAnswer` uses it or declines it. Returns the Hit Points the
 * Rogue loses to a damage roll of 4.
 */
function readiedDaggerHitOnUncannyDodgeRogue(
  rogueAnswer: "useUncannyDodge" | "decline",
  weaponChange?: ReadiedAttackWeaponChange,
) {
  const rogueId = combatantId("readied-attack-rogue");
  const driver = transactionDriver(
    startBattleSessionRight({
      battleId: battleId("readied-attack-hit-reaction"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testDaggerAttack(),
          offHandAttack: {
            ...testDaggerAttack(),
            weaponObjectId: offHandDaggerId,
          },
          selectedLoadout: {
            weapon: {
              itemId: battleObjectId("main:weapon_dagger"),
              unitId: unitId("weapon_dagger"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: offHandDaggerId,
              unitId: unitId("weapon_dagger"),
            },
          },
        }),
        statBlockCreatureInit({ initiative: 15 }),
        characterSeed({
          combatantId: rogueId,
          displayName: "Rogue Target",
          initiative: 10,
          classLevels: [{ className: "rogue", level: 5 }],
          attack: null,
          unitFeatures: [
            characterBattleFeatureInitForTest(uncannyDodgeUnit(), [
              { className: "rogue", level: classLevel(5) },
            ]),
          ],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
      ],
    }),
  );
  const readied = readyAttackAndReportTrigger(
    driver,
    [fighterId, goblinId],
    rogueId,
  );
  const attackRoll = releaseReadiedAttack(
    driver,
    readied,
    rogueId,
    targetSpatialFactsFill(rogueId, readied.response.selection, 5),
    weaponChange,
  );
  const hit = pendingFrontier(
    driver.subject(attackRoll.replaySubject, [
      attackRollFill(findHole(attackRoll.holes, "attackRoll"), {
        total: 20,
        naturalD20: 15,
      }),
    ]),
  );
  if (hit.kind !== "interruptDecision")
    throw new Error("Expected the attack-hit Reaction decision");
  const pendingDecision = battleFrontierInterruptDecisionForState(
    driver.session().state,
  );
  if (pendingDecision === null)
    throw new Error("Expected a pending interrupt decision");
  const uncannyDodge = reactionModifierChoice(
    pendingDecision.choices,
    "rogue_uncanny_dodge",
    "attackDamageReduction",
  );
  const damage = pendingFrontier(
    driver.settle({
      kind: "interruptDecision",
      fill: interruptDecisionFill(
        hit.decisionHole,
        rogueAnswer === "useUncannyDodge"
          ? {
              kind: "resolve",
              responderId: rogueId,
              choice: {
                kind: "reactionRollOrDamageReduction",
                procedureRef: uncannyDodge.modifier.procedureRef,
                modifierKind: "attackDamageReduction",
                fills: [],
              },
            }
          : { kind: "decline", responderId: rogueId },
      ),
    }),
  );
  if (damage.kind !== "holes") throw new Error("Expected damage roll");
  const hpBefore = driver.session().state.combatants.get(rogueId)?.hp ?? 0;
  const finished = driver.subject(damage.replaySubject, [
    damageRollFill(findHole(damage.holes, "rolledDice"), 4),
  ]);
  if (finished.tag !== "settled")
    throw new Error("Expected the release to settle");
  const state = driver.session().state;
  expect(state.readiedResponses.has(fighterId)).toBe(false);
  return {
    hpLost: hpBefore - (state.combatants.get(rogueId)?.hp ?? 0),
    state,
    droppedObjects: finished.resolution.droppedObjects,
  };
}

test("a readied attack resumes to its damage after a Reaction to its hit, used or declined", () => {
  const declinedDamage = readiedDaggerHitOnUncannyDodgeRogue("decline").hpLost;
  const dodgedDamage =
    readiedDaggerHitOnUncannyDodgeRogue("useUncannyDodge").hpLost;

  expect(declinedDamage).toBeGreaterThan(0);
  expect(dodgedDamage).toBe(Math.floor(declinedDamage / 2));
});

test("a readied attack resumed after a Reaction to its hit makes its weapon change after it once it's over", () => {
  const daggerId = battleObjectId("main:weapon_dagger");
  const dropped = readiedDaggerHitOnUncannyDodgeRogue("decline", {
    timing: "afterAttack",
    change: { kind: "drop", objectId: daggerId },
  });

  expect(dropped.hpLost).toBeGreaterThan(0);
  expect(battleGroundObjectState(dropped.state, fighterId, daggerId)).toEqual({
    positionId: dropPositionId,
    source: { kind: "attackWeaponChange" },
  });
});

/** A target whose Reaction a readied attack's damage offers. */
type DamageReactionTarget = "hellishRebuke" | "cuttingWords";

function damageReactionTargetInit(
  reaction: DamageReactionTarget,
  targetId: CombatantId,
) {
  return reaction === "hellishRebuke"
    ? characterSeed({
        combatantId: targetId,
        displayName: "Hellish Rebuke caster",
        initiative: 10,
        attack: null,
        spellcasting: wizardSpellcasting({
          cantrips: [],
          preparedSpells: [spellRecord("hellish_rebuke")],
          spellSlots: [{ spellLevel: 2, count: 1 }],
        }),
      })
    : characterSeed({
        combatantId: targetId,
        displayName: "Bard Target",
        initiative: 10,
        classLevels: [{ className: "bard", level: 3 }],
        attack: null,
        resources: [
          cuttingWordsResource({ unit: cuttingWordsDamageOnlyUnit() }),
        ],
        characterUnitRefs: [
          {
            unit: cuttingWordsDamageOnlyUnit(),
            supportProfiles: ["reactionRollOrDamageReduction"],
          },
        ],
      });
}

/**
 * A Fighter with a Shortsword and a Dagger readies an attack for when the
 * target moves, releases it at the target with `weaponChange`, and hits. The
 * target's Reaction to the damage is offered and declined: Hellish Rebuke
 * once the damage is dealt, or Cutting Words on the damage roll. Returns the
 * battle and the drops the release reports once that window closes.
 */
function readiedHitBehindDamageReaction(
  reaction: DamageReactionTarget,
  weaponChange: ReadiedAttackWeaponChange,
) {
  const targetId = combatantId("readied-attack-damage-reactor");
  const mainAttack = testShortswordAttack();
  const session = startBattleSessionRight({
    battleId: battleId("readied-attack-damage-reaction"),
    combatants: [
      characterSeed({
        initiative: 20,
        attack: mainAttack,
        offHandAttack: {
          ...testDaggerAttack(),
          weaponObjectId: offHandDaggerId,
        },
        selectedLoadout: {
          weapon: {
            itemId: mainAttack.weaponObjectId,
            unitId: unitId("weapon_shortsword"),
            grip: "one_handed",
          },
          offHandWeapon: {
            itemId: offHandDaggerId,
            unitId: unitId("weapon_dagger"),
          },
        },
      }),
      statBlockCreatureInit({ initiative: 15 }),
      damageReactionTargetInit(reaction, targetId),
    ],
  });
  const driver = transactionDriver(session);
  const readied = readyAttackAndReportTrigger(
    driver,
    [fighterId, goblinId],
    targetId,
  );
  const distance = targetSpatialFactsFill(
    targetId,
    readied.response.selection,
    5,
  );
  const attackRoll = releaseReadiedAttack(
    driver,
    readied,
    targetId,
    reaction === "hellishRebuke"
      ? {
          ...distance,
          spatialFacts: [
            ...distance.spatialFacts,
            {
              kind: "reactionSpellDamagerVisibleWithinRange",
              reactorId: targetId,
              damageSourceId: fighterId,
              sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
                session,
                targetId,
                spellSlotInvocationRef("hellish_rebuke", 2, "saveGatedDamage"),
              ),
              rangeFeet: movementFeet(60),
            },
          ],
        }
      : distance,
    weaponChange,
  );
  const damage = pendingFrontier(
    driver.subject(attackRoll.replaySubject, [
      attackRollFill(findHole(attackRoll.holes, "attackRoll"), {
        total: 20,
        naturalD20: 15,
      }),
    ]),
  );
  if (damage.kind !== "holes") throw new Error("Expected damage roll");
  const reactionWindow = pendingFrontier(
    driver.subject(damage.replaySubject, [
      damageRollFill(findHole(damage.holes, "rolledDice"), 4),
    ]),
  );
  if (reactionWindow.kind !== "interruptDecision")
    throw new Error("Expected the damage Reaction window");
  expect(reactionWindow.trigger).toBe(
    reaction === "hellishRebuke" ? "afterDamage" : "attackDamage",
  );
  // Only a change before the attack has been made while the window is open.
  expect(
    battleGroundObjectState(driver.session().state, fighterId, offHandDaggerId)
      ?.source,
  ).toEqual(
    weaponChange.timing === "beforeAttack" &&
      weaponChange.change.kind === "drop"
      ? { kind: "attackWeaponChange" }
      : undefined,
  );
  const declined = driver.settle({
    kind: "interruptDecision",
    fill: interruptDecisionFill(reactionWindow.decisionHole, {
      kind: "decline",
      responderId: targetId,
    }),
  });
  if (declined.tag !== "settled")
    throw new Error("Expected the release to settle");
  return {
    state: driver.session().state,
    droppedObjects: declined.resolution.droppedObjects,
  };
}

test.each(["hellishRebuke", "cuttingWords"] as const)(
  "a readied attack's weapon change after it is made once a Reaction to its damage (%s) is over, and a drop is reported once",
  (reaction) => {
    const daggerId = offHandDaggerId;
    const droppedBefore = readiedHitBehindDamageReaction(reaction, {
      timing: "beforeAttack",
      change: { kind: "drop", objectId: daggerId },
    });
    const droppedAfter = readiedHitBehindDamageReaction(reaction, {
      timing: "afterAttack",
      change: { kind: "drop", objectId: daggerId },
    });
    const stowedAfter = readiedHitBehindDamageReaction(reaction, {
      timing: "afterAttack",
      change: { kind: "stow", objectId: daggerId },
    });
    const drop = {
      kind: "objectDropped",
      actorId: fighterId,
      objectId: daggerId,
      source: { kind: "attackWeaponChange" },
    };

    expect(droppedBefore.droppedObjects).toEqual([drop]);
    expect(droppedAfter.droppedObjects).toEqual([drop]);
    expect(
      battleGroundObjectState(droppedAfter.state, fighterId, daggerId),
    ).toEqual({
      positionId: dropPositionId,
      source: { kind: "attackWeaponChange" },
    });
    expect(stowedAfter.droppedObjects).toBeUndefined();
    expect(loadoutWeaponIsStowed(stowedAfter.state, fighterId, daggerId)).toBe(
      true,
    );
  },
);

test("a readied attack resumed after a Reaction to its hit makes its weapon change before it once", () => {
  const dropped = readiedDaggerHitOnUncannyDodgeRogue("decline", {
    timing: "beforeAttack",
    change: { kind: "drop", objectId: offHandDaggerId },
  });

  expect(dropped.hpLost).toBeGreaterThan(0);
  expect(dropped.droppedObjects).toEqual([
    {
      kind: "objectDropped",
      actorId: fighterId,
      objectId: offHandDaggerId,
      source: { kind: "attackWeaponChange" },
    },
  ]);
  expect(
    battleGroundObjectState(dropped.state, fighterId, offHandDaggerId),
  ).toEqual({
    positionId: dropPositionId,
    source: { kind: "attackWeaponChange" },
  });
});

test("the attack-hit replay keeps a fixed target's spatial facts and compares them by value, in any order", () => {
  const driver = transactionDriver(
    startBattleSessionRight({
      battleId: battleId("readied-attack-replay-fills"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    }),
  );
  const { selection } = readyAttackAndReportTrigger(
    driver,
    [fighterId],
    goblinId,
  ).response;
  const recorded = targetSpatialFactsFill(goblinId, selection, 5);
  const otherDamageType: BattleFill = {
    kind: "damageTypeChoice",
    holeId: holeId("unrelated-damage-type"),
    value: "fire",
  };

  expect(attackFillsForAttackHitReplay([recorded, otherDamageType])).toEqual([
    recorded,
  ]);
  expect(
    battleContinuationFillEquals(
      recorded,
      targetSpatialFactsFill(goblinId, selection, 5),
    ),
  ).toBe(true);
  expect(
    battleContinuationFillEquals(
      recorded,
      targetSpatialFactsFill(goblinId, selection, 10),
    ),
  ).toBe(false);
  const cannotSee = {
    kind: "attackTargetCannotSeeAttacker" as const,
    attackerId: fighterId,
    targetId: goblinId,
  };
  const withTwoFacts = {
    ...recorded,
    spatialFacts: [...recorded.spatialFacts, cannotSee],
  };
  expect(
    battleContinuationFillEquals(withTwoFacts, {
      ...recorded,
      spatialFacts: [cannotSee, ...recorded.spatialFacts],
    }),
  ).toBe(true);
  expect(battleContinuationFillEquals(withTwoFacts, recorded)).toBe(false);
});
