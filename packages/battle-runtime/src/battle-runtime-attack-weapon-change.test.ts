import { describe, expect, it } from "vitest";
import { unitId as parseUnitId } from "@dnd/shared/game-facts";
import {
  attackExecutionSelectionForSubjectForTest,
  attackRollFill,
  attackTargetFill,
  battleFrontierInterruptDecisionForState,
  battleId,
  battleObjectId,
  battleResolutionHolesForTest,
  battleTablePositionId,
  characterSeed,
  difficultyClass,
  discoverBattleActCandidates,
  endTurn,
  fighterAttackSubject,
  fighterGrapplesGoblin,
  fighterId,
  fighterVsGoblinBattle,
  findHole,
  goblinId,
  interruptDecisionFill,
  movementFeet,
  movementFill,
  opportunityAttackProcedureSelectionForTest,
  reactionChoiceWithSubject,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  shoveOutcomeFill,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testDaggerAttack,
  testShortswordAttack,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import { ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE } from "./unit-feature-support.ts";
import type { BattleFill, BattleState } from "./battle-state-execution.ts";
import type { AttackWeaponChange, BattleSubject } from "./battle-subjects.ts";
import { characterEffectiveLoadout, resolveBattleSubject } from "./index.ts";
import { isCharacterBattleCreatureState } from "./battle-reducer/creature-state-queries.ts";
import { weaponDropPositionHole } from "./battle-reducer/attack-weapon-change.ts";
import {
  battleGroundObjectState,
  battleObjectIsOnGround,
} from "./battle-reducer/object-custody-queries.ts";
import { stateWithLoadoutWeaponChange } from "./battle-reducer/loadout-weapon-custody.ts";
import { loadoutWeaponIsStowed } from "./battle-reducer/character-effective-loadout.ts";

// RAW trace: .references/srd-5.2.1/rules-glossary.md#Attack [Action],
// Equipping and Unequipping Weapons: one weapon equipped or unequipped with
// each attack of the Attack action, before or after it; a weapon equipped
// before an attack needn't be the one used. ASSUMPTIONS.md A63: an after
// change comes before the Attack action's next attack; where a dropped weapon
// lands is the table's.

const longswordId = battleObjectId("main:weapon_longsword");
const dropPositionId = battleTablePositionId("dropped-longsword");

type AttackSubject = ReturnType<typeof fighterAttackSubject>;

function withChange(
  subject: AttackSubject,
  weaponChange: AttackWeaponChange,
): AttackSubject & { readonly weaponChange: AttackWeaponChange } {
  return { ...subject, weaponChange };
}

/** Resolves the Fighter's attack on the Goblin to a miss. */
function missedAttack(
  state: BattleState,
  subject: BattleSubject,
  changeFills: readonly BattleFill[] = [],
): BattleState {
  const targetHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [...changeFills] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(targetHole, fighterId, goblinId);
  const rollHole = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [...changeFills, targetFill],
    }),
    "attackRoll",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        ...changeFills,
        targetFill,
        attackRollFill(rollHole, { total: 2, naturalD20: 2 }),
      ],
    }),
  ).state;
}

function unarmedStrike(state: BattleState): AttackSubject {
  return fighterAttackSubject(state, "Unarmed Strike");
}

function heldWeaponId(state: BattleState) {
  const fighter = state.combatants.get(fighterId);
  if (fighter === undefined || !isCharacterBattleCreatureState(fighter)) {
    throw new Error("Expected the Fighter.");
  }
  return characterEffectiveLoadout(state, fighter).weapon?.itemId;
}

function attackActs(state: BattleState) {
  return discoverBattleActCandidates(state).flatMap((act) =>
    act.subject.tag === "action" && act.subject.action === "attack"
      ? [act.subject]
      : [],
  );
}

function afterAttackChanges(state: BattleState) {
  return discoverBattleActCandidates(state).flatMap((act) =>
    act.subject.tag === "runtimeCommand" &&
    act.subject.command === "changeWeaponAfterAttack"
      ? [act.subject.weaponChange]
      : [],
  );
}

function changeAfterAttack(
  state: BattleState,
  weaponChange: AttackWeaponChange,
  fills: readonly BattleFill[] = [],
) {
  return resolveBattleSubject({
    state,
    subject: {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "changeWeaponAfterAttack",
      weaponChange,
    },
    fills: [...fills],
  });
}

function dropFill(): BattleFill {
  return {
    kind: "weaponDropPosition",
    holeId: weaponDropPositionHole(fighterId, longswordId).holeId,
    value: { positionId: dropPositionId },
  };
}

/** The Fighter on its turn, with its Longsword stowed and its action left. */
function fighterWithStowedLongsword(): BattleState {
  const stowed = stateWithLoadoutWeaponChange(
    fighterVsGoblinBattle(),
    fighterId,
    { kind: "stow", objectId: longswordId },
  );
  if (stowed.tag !== "applied") throw new Error(stowed.message);
  return stowed.state;
}

function stowedBeforeUnarmedStrike(): BattleState {
  const state = fighterVsGoblinBattle();
  return missedAttack(
    state,
    withChange(unarmedStrike(state), { kind: "stow", objectId: longswordId }),
  );
}

describe("weapon change before an attack", () => {
  it("stows the weapon before an attack with another weapon and leaves no change after it", () => {
    const stowed = stowedBeforeUnarmedStrike();

    expect(loadoutWeaponIsStowed(stowed, fighterId, longswordId)).toBe(true);
    expect(heldWeaponId(stowed)).toBeUndefined();
    expect(stowed.currentTurnResources.weaponChangeAfterAttack).toBe(
      "unavailable",
    );
    expect(afterAttackChanges(stowed)).toEqual([]);
  });

  it("offers attacks that draw a stowed weapon, and draws it before the roll", () => {
    const stowed = fighterWithStowedLongsword();
    const draw = { kind: "equip", objectId: longswordId } as const;
    const drawingAttacks = attackActs(stowed).filter(
      (subject) => "weaponChange" in subject,
    );
    // A weapon equipped before an attack needn't be the one used.
    expect(drawingAttacks).toEqual([
      withChange(fighterAttackSubject(fighterVsGoblinBattle()), draw),
      withChange(unarmedStrike(fighterVsGoblinBattle()), draw),
    ]);
    const [drawAndAttack] = drawingAttacks;
    if (drawAndAttack === undefined) throw new Error("Expected the attack.");

    const drawn = missedAttack(stowed, drawAndAttack);
    expect(heldWeaponId(drawn)).toBe(longswordId);
    expect(drawn.objectCustody.has(fighterId)).toBe(false);
  });

  it("offers an attack that draws a stowed weapon when no attack has a target before the draw", () => {
    // Alone, the Fighter's Unarmed Strike has no target: no creature, and no
    // ordinary object attack. The drawn Longsword can attack an object.
    const stowed = fighterWithStowedLongsword();
    const fighter = stowed.combatants.get(fighterId);
    if (fighter === undefined) throw new Error("Expected the Fighter.");
    const alone = { ...stowed, combatants: new Map([[fighterId, fighter]]) };
    const draw = { kind: "equip", objectId: longswordId } as const;

    expect(attackActs(alone)).toEqual([
      withChange(fighterAttackSubject(fighterVsGoblinBattle()), draw),
    ]);
  });

  it("offers attacks that stow or drop the held weapon first, asking where a dropped one lands", () => {
    const state = fighterVsGoblinBattle();
    const changing = discoverBattleActCandidates(state).filter(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        "weaponChange" in act.subject,
    );
    expect(changing.map((act) => act.subject)).toEqual([
      withChange(unarmedStrike(state), { kind: "stow", objectId: longswordId }),
      withChange(unarmedStrike(state), { kind: "drop", objectId: longswordId }),
    ]);
    // The stow-first act asks only for the attack's own holes, such as its target.
    const attackHoles = changing[0]?.initialHoles ?? [];
    expect(attackHoles.map((hole) => hole.kind)).toContain("targetChoice");
    expect(changing[1]?.initialHoles).toEqual([
      weaponDropPositionHole(fighterId, longswordId),
      ...attackHoles,
    ]);
  });

  it("asks where a weapon dropped before the attack lands", () => {
    const state = fighterVsGoblinBattle();
    const subject = withChange(unarmedStrike(state), {
      kind: "drop",
      objectId: longswordId,
    });
    expect(
      requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "weaponDropPosition",
      ),
    ).toEqual(weaponDropPositionHole(fighterId, longswordId));

    const dropped = missedAttack(state, subject, [dropFill()]);
    expect(battleGroundObjectState(dropped, fighterId, longswordId)).toEqual({
      positionId: dropPositionId,
      source: { kind: "attackWeaponChange" },
    });
    expect(heldWeaponId(dropped)).toBeUndefined();
  });

  it("resumes an attack whose weapon change is already made, without making it again", () => {
    // An interrupt resumes the attack from the state after its change, so
    // the change must not be asked for or applied a second time.
    const ready = fighterVsGoblinBattle();
    const stowed = fighterWithStowedLongsword();
    const cases = [
      {
        before: stowed,
        change: { kind: "equip", objectId: longswordId },
        applied: { kind: "equip", objectId: longswordId },
      },
      {
        before: ready,
        change: { kind: "stow", objectId: longswordId },
        applied: { kind: "stow", objectId: longswordId },
      },
      {
        before: ready,
        change: { kind: "drop", objectId: longswordId },
        applied: {
          kind: "drop",
          objectId: longswordId,
          positionId: dropPositionId,
        },
      },
    ] as const;
    for (const { before, change, applied } of cases) {
      const subject = withChange(unarmedStrike(before), change);
      const changed = stateWithLoadoutWeaponChange(before, fighterId, applied);
      if (changed.tag !== "applied") throw new Error(changed.message);
      const resuming: BattleState = {
        ...changed.state,
        subjectResolutionPhase: { kind: "subjectContinuation", subject },
      };

      const resumed = resolveBattleSubject({
        state: resuming,
        subject,
        fills: [],
      });
      if (resumed.tag !== "needsHoles") {
        throw new Error(`Expected the ${change.kind} attack to resume.`);
      }
      expect(
        battleResolutionHolesForTest(resumed).map((hole) => hole.kind),
        change.kind,
      ).not.toContain("weaponDropPosition");
      expect(heldWeaponId(resumed.state), change.kind).toBe(
        heldWeaponId(changed.state),
      );
    }
  });

  it("refuses to equip a weapon already in hand", () => {
    const state = fighterVsGoblinBattle();
    expect(
      resolveBattleSubject({
        state,
        subject: withChange(fighterAttackSubject(state), {
          kind: "equip",
          objectId: longswordId,
        }),
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  it("refuses to unequip a weapon outside the selected loadout", () => {
    const state = fighterVsGoblinBattle();
    expect(
      resolveBattleSubject({
        state,
        subject: withChange(unarmedStrike(state), {
          kind: "stow",
          objectId: battleObjectId("not-in-the-loadout"),
        }),
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  it("draws a weapon back into the hands of its loadout grip, whatever another object left there", () => {
    const stowed = fighterWithStowedLongsword();
    const fighter = stowed.combatants.get(fighterId);
    if (fighter === undefined) throw new Error("Expected the Fighter.");
    const gripHand =
      fighter.armorClass.rightHandUse === "mainWeapon"
        ? "rightHandUse"
        : "leftHandUse";
    // A spell-created object took the weapon's free hand and then ended,
    // leaving the hand simply free.
    const handLeftFree: BattleState = {
      ...stowed,
      combatants: new Map(stowed.combatants).set(fighterId, {
        ...fighter,
        armorClass: { ...fighter.armorClass, [gripHand]: "free" },
      }),
    };
    const drawn = stateWithLoadoutWeaponChange(handLeftFree, fighterId, {
      kind: "equip",
      objectId: longswordId,
    });
    if (drawn.tag !== "applied") throw new Error(drawn.message);
    expect(drawn.state.combatants.get(fighterId)?.armorClass[gripHand]).toBe(
      "mainWeapon",
    );

    const handHoldingObject: BattleState = {
      ...stowed,
      combatants: new Map(stowed.combatants).set(fighterId, {
        ...fighter,
        armorClass: {
          ...fighter.armorClass,
          [gripHand]: "spellCreatedHeldObject",
        },
      }),
    };
    expect(
      stateWithLoadoutWeaponChange(handHoldingObject, fighterId, {
        kind: "equip",
        objectId: longswordId,
      }),
    ).toMatchObject({ tag: "invalid", reason: "handsOccupied" });
  });

  it("refuses to draw a weapon into a hand that grapples", () => {
    const stowed = fighterWithStowedLongsword();
    const fighter = stowed.combatants.get(fighterId);
    if (fighter === undefined) throw new Error("Expected the Fighter.");
    const hand =
      fighter.armorClass.rightHandUse === "mainWeapon" ? "right" : "left";
    const grappling: BattleState = {
      ...stowed,
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
    expect(
      attackActs(grappling).filter((subject) => "weaponChange" in subject),
    ).toEqual([]);
  });
});

describe("weapon change after an attack", () => {
  it("offers one change after an attack without one, and spends it", () => {
    const state = fighterVsGoblinBattle();
    const attacked = missedAttack(state, fighterAttackSubject(state));
    expect(attacked.currentTurnResources.weaponChangeAfterAttack).toBe(
      "available",
    );
    expect(afterAttackChanges(attacked)).toEqual([
      { kind: "stow", objectId: longswordId },
      { kind: "drop", objectId: longswordId },
    ]);

    const stowed = requireResolved(
      changeAfterAttack(attacked, { kind: "stow", objectId: longswordId }),
    ).state;
    expect(heldWeaponId(stowed)).toBeUndefined();
    expect(stowed.currentTurnResources.weaponChangeAfterAttack).toBe(
      "unavailable",
    );
    expect(afterAttackChanges(stowed)).toEqual([]);
    expect(
      changeAfterAttack(stowed, { kind: "equip", objectId: longswordId }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  it("drops the weapon where the table places it, for its owner to pick up", () => {
    const state = fighterVsGoblinBattle();
    const attacked = missedAttack(state, fighterAttackSubject(state));
    expect(
      requireHole(
        changeAfterAttack(attacked, { kind: "drop", objectId: longswordId }),
        "weaponDropPosition",
      ),
    ).toEqual(weaponDropPositionHole(fighterId, longswordId));

    const droppedResult = requireResolved(
      changeAfterAttack(attacked, { kind: "drop", objectId: longswordId }, [
        dropFill(),
      ]),
    );
    expect(droppedResult.droppedObjects).toEqual([
      {
        kind: "objectDropped",
        actorId: fighterId,
        objectId: longswordId,
        source: { kind: "attackWeaponChange" },
      },
    ]);
    const dropped = droppedResult.state;
    expect(battleObjectIsOnGround(dropped, fighterId, longswordId)).toBe(true);
    expect(
      discoverBattleActCandidates(dropped).some(
        (act) =>
          act.subject.tag === "runtimeCommand" &&
          act.subject.command === "pickUpHeldWeapon",
      ),
    ).toBe(true);
  });

  it("refuses a change after an attack when none is left", () => {
    expect(
      changeAfterAttack(fighterVsGoblinBattle(), {
        kind: "stow",
        objectId: longswordId,
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  it("refuses fills a weapon change doesn't ask for", () => {
    const state = fighterVsGoblinBattle();
    const attacked = missedAttack(state, fighterAttackSubject(state));
    const stow = { kind: "stow", objectId: longswordId } as const;
    const drop = { kind: "drop", objectId: longswordId } as const;
    const otherDropFill: BattleFill = {
      ...dropFill(),
      holeId: weaponDropPositionHole(goblinId, longswordId).holeId,
    };

    expect(changeAfterAttack(attacked, stow, [dropFill()])).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(
      changeAfterAttack(attacked, drop, [dropFill(), otherDropFill]),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(changeAfterAttack(attacked, drop, [dropFill()]).tag).toBe(
      "resolved",
    );
  });

  it("gives up the change at the end of the turn", () => {
    const state = fighterVsGoblinBattle();
    const attacked = missedAttack(state, fighterAttackSubject(state));
    const ended = requireResolved(
      resolveBattleSubject({
        state: attacked,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "endTurn",
        },
        fills: [],
      }),
    ).state;
    expect(ended.currentTurnResources.weaponChangeAfterAttack).toBe(
      "unavailable",
    );
  });
});

/** A level 5 Fighter with Extra Attack, two attacks with each Attack action. */
function extraAttackFighterBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-weapon-change-extra-attack"),
    combatants: [
      characterSeed({
        initiative: 20,
        classLevels: [{ className: "fighter", level: 5 }],
        characterUnitRefs: [
          {
            unit: unitLibrary.requireUnit("fighter_extra_attack"),
            supportProfiles: [
              {
                kind: ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
                additionalAttacks: 1,
              },
            ],
          },
        ],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function shovedGoblin(state: BattleState): BattleState {
  const subject: BattleSubject = {
    tag: "action",
    actorId: fighterId,
    action: "shove",
  };
  const reach = [
    {
      kind: "shoveTargetWithinReach" as const,
      shoverId: fighterId,
      targetId: goblinId,
    },
  ];
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const outcome = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, goblinId, reach)],
    }),
    "shoveOutcome",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, goblinId, reach),
        shoveOutcomeFill(outcome, {
          succeeded: false,
          failedEffect: { kind: "prone" },
        }),
      ],
    }),
  ).state;
}

describe("the window each attack of the Attack action opens", () => {
  const stow = { kind: "stow", objectId: longswordId } as const;

  it("opens a window after a Grapple, which takes the place of an attack", () => {
    const grappled = fighterGrapplesGoblin(fighterVsGoblinBattle()).state;

    expect(grappled.currentTurnResources.weaponChangeAfterAttack).toBe(
      "available",
    );
    expect(afterAttackChanges(grappled)).toContainEqual(stow);
  });

  it("opens a window after a Shove, which takes the place of an attack", () => {
    const shoved = shovedGoblin(fighterVsGoblinBattle());

    expect(afterAttackChanges(shoved)).toContainEqual(stow);
  });

  it("with Extra Attack, gives up the change left from the first attack when the second carries its own", () => {
    const state = extraAttackFighterBattle();
    const afterFirst = missedAttack(state, fighterAttackSubject(state));
    expect(afterFirst.currentTurnResources.weaponChangeAfterAttack).toBe(
      "available",
    );

    const afterSecond = missedAttack(
      afterFirst,
      withChange(unarmedStrike(afterFirst), stow),
    );
    expect(afterSecond.currentTurnResources.weaponChangeAfterAttack).toBe(
      "unavailable",
    );
    expect(afterAttackChanges(afterSecond)).toEqual([]);
  });

  it("with Extra Attack, opens a fresh window after a second attack with no change", () => {
    const state = extraAttackFighterBattle();
    const afterFirst = missedAttack(state, fighterAttackSubject(state));
    const changed = requireResolved(changeAfterAttack(afterFirst, stow)).state;
    expect(changed.currentTurnResources.weaponChangeAfterAttack).toBe(
      "unavailable",
    );

    const afterSecond = missedAttack(changed, unarmedStrike(changed));
    expect(afterSecond.currentTurnResources.weaponChangeAfterAttack).toBe(
      "available",
    );
  });

  it("leaves the window as it was after an off-hand attack with a Bonus Action", () => {
    const mainAttack = testShortswordAttack();
    const offHandAttack = {
      ...testDaggerAttack(),
      weaponObjectId: battleObjectId("off:weapon_dagger"),
    };
    const state = startBattleRight({
      battleId: battleId("battle-weapon-change-off-hand"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: mainAttack,
          offHandAttack,
          selectedLoadout: {
            weapon: {
              itemId: mainAttack.weaponObjectId,
              unitId: parseUnitId("weapon_shortsword"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: offHandAttack.weaponObjectId,
              unitId: parseUnitId("weapon_dagger"),
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const offHandSubject = (current: BattleState) => {
      const subject = discoverBattleActCandidates(current).find(
        (act) =>
          act.subject.tag === "bonusAction" &&
          act.subject.action === "offHandAttack",
      )?.subject;
      if (subject === undefined)
        throw new Error("Expected the off-hand attack.");
      return subject;
    };
    const afterMain = missedAttack(
      state,
      fighterAttackSubject(state, "Shortsword"),
    );
    expect(afterMain.currentTurnResources.weaponChangeAfterAttack).toBe(
      "available",
    );

    const afterOffHand = missedAttack(afterMain, offHandSubject(afterMain));
    expect(afterOffHand.currentTurnResources.weaponChangeAfterAttack).toBe(
      "available",
    );

    const spent = requireResolved(
      changeAfterAttack(afterMain, {
        kind: "stow",
        objectId: mainAttack.weaponObjectId,
      }),
    ).state;
    const afterSpentOffHand = missedAttack(spent, offHandSubject(spent));
    expect(afterSpentOffHand.currentTurnResources.weaponChangeAfterAttack).toBe(
      "unavailable",
    );
  });

  it("opens no window on another character's turn for an Opportunity Attack", () => {
    const state = startBattleRight({
      battleId: battleId("battle-weapon-change-opportunity-attack"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Synthetic Mover",
          initiative: 10,
        }),
      ],
    });
    const moverTurn = requireResolved(
      endTurn({ state, actorId: fighterId }),
    ).state;
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "move",
    };
    const movement = requireHole(
      resolveBattleSubject({
        state: moverTurn,
        subject: moveSubject,
        fills: [],
      }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state: moverTurn,
      subject: moveSubject,
      fills: [
        movementFill(movement, {
          distanceFeet: 5,
          provokedOpportunityAttacks: [
            {
              reactorId: fighterId,
              distanceFeet: movementFeet(5),
              ...attackExecutionSelectionForSubjectForTest(
                fighterAttackSubject(moverTurn),
              ),
            },
          ],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected the move to offer an Opportunity Attack.");
    }
    const pending = battleFrontierInterruptDecisionForState(
      awaitingReaction.state,
    );
    if (pending === null) throw new Error("Expected the reaction window.");
    const choice = reactionChoiceWithSubject(pending.choices);
    const started = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "resolve",
        responderId: fighterId,
        choice: opportunityAttackProcedureSelectionForTest(choice),
      }),
    });
    if (started.tag !== "needsHoles") {
      throw new Error("Expected the Opportunity Attack roll.");
    }
    const roll = findHole(battleResolutionHolesForTest(started), "attackRoll");
    const attacked = requireResolved(
      resolveBattleSubject({
        state: started.state,
        subject: choice.subject,
        fills: [attackRollFill(roll, { total: 2, naturalD20: 2 })],
      }),
    );

    expect(attacked.state.currentTurnResources.weaponChangeAfterAttack).toBe(
      "unavailable",
    );
    expect(
      discoverBattleActCandidates(attacked.state).filter(
        (act) =>
          act.subject.tag === "runtimeCommand" &&
          act.subject.command === "changeWeaponAfterAttack",
      ),
    ).toEqual([]);
  });
});
