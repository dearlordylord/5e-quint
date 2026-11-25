// KERNEL-COVERAGE: parity-witness BATTLE.ACTION.ATTACK_WEAPON_CHANGE
import { describe, expect, it } from "vitest";
import { unitId as parseUnitId } from "@dnd/shared/game-facts";
import {
  attackRollFill,
  attackTargetDistanceSpatialFact,
  battleFrontierInterruptDecisionForState,
  battleId,
  battleObjectId,
  battleResolutionHolesForTest,
  battleTablePositionId,
  characterSeed,
  discoverBattleActCandidates,
  endTurn,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  findHole,
  goblinId,
  interruptDecisionFill,
  movementFeet,
  readyDeclarationFillForTest,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  startBattleRight,
  statBlockCreatureInit,
  testDaggerAttack,
  testShortswordAttack,
} from "./battle-runtime.test-support.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import {
  weaponChangeDropOutcome,
  weaponDropPositionHole,
} from "./battle-reducer/attack-weapon-change.ts";
import { loadoutWeaponIsStowed } from "./battle-reducer/character-effective-loadout.ts";
import { isCharacterBattleCreatureState } from "./battle-reducer/creature-state-queries.ts";
import {
  battleGroundObjectState,
  battleObjectIsOnGround,
} from "./battle-reducer/object-custody-queries.ts";
import { stateWithOwnedWeaponChange } from "./battle-reducer/owned-weapon-custody.ts";
import { readiedAttackReleaseEnd } from "./battle-reducer/readied-attack-weapon-change.ts";
import type {
  BattleFill,
  BattleResolutionResult,
  BattleState,
} from "./battle-state-execution.ts";
import type {
  BattleReadyResponse,
  ReadiedAttackWeaponChange,
} from "./battle-subjects.ts";
import type { BattleObjectId } from "./identity.ts";
import { characterEffectiveLoadout, resolveBattleSubject } from "./index.ts";

// RAW trace: .references/srd-5.2.1/rules-glossary.md#Ready [Action]: the
// readied action is taken as a Reaction right after the trigger finishes.
// #Attack [Action], Equipping and Unequipping Weapons: one weapon equipped or
// unequipped when you make an attack as part of this action, before or after
// the attack. equipment.md#Thrown: a thrown weapon leaves the hand.
// ASSUMPTIONS.md A63: the release carries the change and its timing, and
// preparing Ready grants none.

const longswordId = battleObjectId("main:weapon_longsword");
const dropPositionId = battleTablePositionId("dropped-after-readied-attack");

type ReadiedAttackResponse = Extract<
  BattleReadyResponse,
  { readonly kind: "attack" }
>;

/**
 * The Fighter readies the first attack `pick` accepts, ends its turn, and the
 * Goblin reports the trigger. Returns the battle awaiting the Fighter's
 * Reaction and the readied attack.
 */
function readiedAttackTriggered(
  state: BattleState,
  pick: (response: ReadiedAttackResponse) => boolean = () => true,
): {
  readonly reported: Extract<
    BattleResolutionResult,
    { readonly tag: "needsHoles" }
  >;
  readonly response: ReadiedAttackResponse;
} {
  const readySubject = {
    tag: "action" as const,
    actorId: fighterId,
    action: "ready" as const,
  };
  const declaration = discoverBattleActCandidates(state)
    .find(
      (act) => act.subject.tag === "action" && act.subject.action === "ready",
    )
    ?.initialHoles.find((hole) => hole.kind === "readyDeclaration");
  if (declaration?.kind !== "readyDeclaration") {
    throw new Error("Expected the Ready declaration.");
  }
  const response = declaration.responseChoices.find(
    (candidate): candidate is ReadiedAttackResponse =>
      candidate.kind === "attack" && pick(candidate),
  );
  if (response === undefined) throw new Error("Expected an attack to Ready.");
  const readied = requireResolved(
    resolveBattleSubject({
      state,
      subject: readySubject,
      fills: [
        readyDeclarationFillForTest(
          declaration,
          "the goblin comes within reach",
          response,
        ),
      ],
    }),
  );
  const goblinTurn = requireResolved(
    endTurn({ state: readied.state, actorId: fighterId }),
  );
  const reported = resolveBattleSubject({
    state: goblinTurn.state,
    subject: {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "reportReadyTrigger",
      readiedActorId: fighterId,
    },
    fills: [],
  });
  if (reported.tag !== "needsHoles") {
    throw new Error("Expected the Ready trigger's Reaction window.");
  }
  return { reported, response };
}

/** The releases of the readied attack against the Goblin. */
function releasesAtGoblin(state: BattleState) {
  return (
    battleFrontierInterruptDecisionForState(state)?.choices ?? []
  ).flatMap((choice) =>
    choice.kind === "nestedProcedure" &&
    choice.subject.tag === "runtimeCommand" &&
    choice.subject.command === "releaseReadiedAttack" &&
    choice.subject.targetId === goblinId
      ? [{ subject: choice.subject, initialHoles: choice.initialHoles }]
      : [],
  );
}

function offeredWeaponChanges(state: BattleState) {
  return releasesAtGoblin(state).map(({ subject }) => subject.weaponChange);
}

function targetSpatialFacts(response: ReadiedAttackResponse): BattleFill {
  return {
    kind: "targetSpatialFacts",
    holeId: ATTACK_TARGET_HOLE_ID,
    spatialFacts: [
      attackTargetDistanceSpatialFact(
        fighterId,
        goblinId,
        response.selection,
        movementFeet(5),
      ),
    ],
  };
}

function dropFill(objectId: BattleObjectId): BattleFill {
  return {
    kind: "weaponDropPosition",
    holeId: weaponDropPositionHole(fighterId, objectId).holeId,
    value: { positionId: dropPositionId },
  };
}

/** The Fighter releases its readied attack at the Goblin with these fills. */
function release(
  triggered: ReturnType<typeof readiedAttackTriggered>,
  weaponChange: ReadiedAttackWeaponChange | undefined,
  fills: readonly BattleFill[],
) {
  return resolveBattleInterrupt({
    state: triggered.reported.state,
    fill: interruptDecisionFill(
      requireHole(triggered.reported, "interruptDecision"),
      {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "releaseReadiedAttack",
          targetId: goblinId,
          procedureRef: triggered.response.selection.procedureRef,
          ...(weaponChange === undefined ? {} : { weaponChange }),
          fills: [...fills],
        },
      },
    ),
  });
}

/** Releases the readied attack with this change and misses the Goblin. */
function releasedAndMissed(
  triggered: ReturnType<typeof readiedAttackTriggered>,
  weaponChange: ReadiedAttackWeaponChange | undefined,
  changeFills: readonly BattleFill[] = [],
) {
  const started = release(triggered, weaponChange, [
    ...changeFills,
    targetSpatialFacts(triggered.response),
  ]);
  if (started.tag !== "needsHoles") {
    throw new Error(
      `Expected the readied attack roll, got ${started.tag === "invalid" ? started.message : started.tag}.`,
    );
  }
  const subject =
    started.frontier.kind === "holes"
      ? started.frontier.replaySubject
      : undefined;
  if (subject === undefined) throw new Error("Expected the attack's holes.");
  return requireResolved(
    resolveBattleSubject({
      state: started.state,
      subject,
      fills: [
        attackRollFill(
          findHole(battleResolutionHolesForTest(started), "attackRoll"),
          { total: 2, naturalD20: 2 },
        ),
      ],
    }),
  );
}

/** Answers the release's drop position hole, then misses the Goblin. */
function missedAfterAnsweringDropHole(
  unplaced: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
) {
  const placed = resolveBattleSubject({
    state: unplaced.state,
    subject: replaySubjectForTest(unplaced),
    fills: [dropFill(longswordId)],
  });
  if (placed.tag !== "needsHoles") {
    throw new Error("Expected the readied attack roll.");
  }
  return requireResolved(
    resolveBattleSubject({
      state: placed.state,
      subject: replaySubjectForTest(placed),
      fills: [
        attackRollFill(
          findHole(battleResolutionHolesForTest(placed), "attackRoll"),
          { total: 2, naturalD20: 2 },
        ),
      ],
    }),
  );
}

function replaySubjectForTest(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
) {
  if (result.frontier.kind !== "holes") {
    throw new Error("Expected the procedure's holes.");
  }
  return result.frontier.replaySubject;
}

function heldWeaponId(state: BattleState) {
  const fighter = state.combatants.get(fighterId);
  if (fighter === undefined || !isCharacterBattleCreatureState(fighter)) {
    throw new Error("Expected the Fighter.");
  }
  return characterEffectiveLoadout(state, fighter).weapon?.itemId;
}

/** A Fighter with a Shortsword in one hand and a Dagger in the other. */
function dualWieldingFighterBattle(): BattleState {
  const mainAttack = testShortswordAttack();
  const offHandAttack = {
    ...testDaggerAttack(),
    weaponObjectId: battleObjectId("off:weapon_dagger"),
  };
  return startBattleRight({
    battleId: battleId("battle-readied-attack-weapon-change-dual"),
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
}

/** A Fighter holding only a Dagger. */
function daggerFighterBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-readied-attack-weapon-change-dagger"),
    combatants: [
      characterSeed({
        initiative: 20,
        attack: testDaggerAttack(),
        selectedLoadout: {
          weapon: {
            itemId: battleObjectId("main:weapon_dagger"),
            unitId: parseUnitId("weapon_dagger"),
            grip: "one_handed",
          },
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function fighterWithStowedLongsword(): BattleState {
  const stowed = stateWithOwnedWeaponChange(
    fighterVsGoblinBattle(),
    fighterId,
    { kind: "stow", objectId: longswordId },
  );
  if (stowed.tag !== "applied") throw new Error(stowed.message);
  return stowed.state;
}

describe("weapon change with a readied Attack", () => {
  it("offers the release alone and with each change after it, but none before it that loses the attack", () => {
    const triggered = readiedAttackTriggered(fighterVsGoblinBattle());

    expect(offeredWeaponChanges(triggered.reported.state)).toEqual([
      undefined,
      {
        timing: "afterAttack",
        change: { kind: "stow", objectId: longswordId },
      },
      {
        timing: "afterAttack",
        change: { kind: "drop", objectId: longswordId },
      },
    ]);
  });

  it("stows the weapon once the readied attack is over", () => {
    const triggered = readiedAttackTriggered(fighterVsGoblinBattle());
    const attacked = releasedAndMissed(triggered, {
      timing: "afterAttack",
      change: { kind: "stow", objectId: longswordId },
    });

    expect(loadoutWeaponIsStowed(attacked.state, fighterId, longswordId)).toBe(
      true,
    );
    expect(attacked.state.readiedResponses.has(fighterId)).toBe(false);
    expect(attacked.state.currentTurnResources.weaponChangeAfterAttack).toBe(
      triggered.reported.state.currentTurnResources.weaponChangeAfterAttack,
    );
  });

  it("asks where a weapon dropped after the readied attack lands before the attack starts", () => {
    const triggered = readiedAttackTriggered(fighterVsGoblinBattle());
    const weaponChange = {
      timing: "afterAttack",
      change: { kind: "drop", objectId: longswordId },
    } as const;
    const offered = releasesAtGoblin(triggered.reported.state).find(
      ({ subject }) => subject.weaponChange?.change.kind === "drop",
    );
    expect(offered?.initialHoles).toEqual([
      weaponDropPositionHole(fighterId, longswordId),
    ]);

    const unplaced = release(triggered, weaponChange, [
      targetSpatialFacts(triggered.response),
    ]);
    if (unplaced.tag !== "needsHoles") {
      throw new Error("Expected the drop position hole.");
    }
    expect(battleResolutionHolesForTest(unplaced)).toEqual([
      weaponDropPositionHole(fighterId, longswordId),
    ]);
    const placedLater = missedAfterAnsweringDropHole(unplaced);
    expect(
      battleGroundObjectState(placedLater.state, fighterId, longswordId)
        ?.positionId,
    ).toBe(dropPositionId);
    expect(placedLater.droppedObjects).toEqual([
      weaponChangeDropOutcome(fighterId, longswordId),
    ]);

    const attacked = releasedAndMissed(triggered, weaponChange, [
      dropFill(longswordId),
    ]);
    expect(battleObjectIsOnGround(attacked.state, fighterId, longswordId)).toBe(
      true,
    );
    expect(
      battleGroundObjectState(attacked.state, fighterId, longswordId)
        ?.positionId,
    ).toBe(dropPositionId);
    expect(attacked.droppedObjects).toEqual([
      {
        kind: "objectDropped",
        actorId: fighterId,
        objectId: longswordId,
        source: { kind: "attackWeaponChange" },
      },
    ]);
  });

  it("draws a stowed weapon right before the readied attack it makes", () => {
    const state = fighterWithStowedLongsword();
    const unarmedStrike = fighterAttackSubject(state, "Unarmed Strike");
    const triggered = readiedAttackTriggered(
      state,
      (response) =>
        response.selection.procedureRef !== unarmedStrike.procedureRef,
    );
    const draw = {
      timing: "beforeAttack",
      change: { kind: "equip", objectId: longswordId, slot: "mainWeapon" },
    } as const;

    expect(offeredWeaponChanges(triggered.reported.state)).toEqual([draw]);
    expect(heldWeaponId(triggered.reported.state)).toBeUndefined();

    const attacked = releasedAndMissed(triggered, draw);
    expect(heldWeaponId(attacked.state)).toBe(longswordId);
    expect(attacked.state.readiedResponses.has(fighterId)).toBe(false);
  });

  it("draws a stowed weapon once the readied attack is over", () => {
    const state = fighterWithStowedLongsword();
    const unarmedStrike = fighterAttackSubject(state, "Unarmed Strike");
    const triggered = readiedAttackTriggered(
      state,
      (response) =>
        response.selection.procedureRef === unarmedStrike.procedureRef,
    );
    const draw = {
      timing: "afterAttack",
      change: { kind: "equip", objectId: longswordId, slot: "mainWeapon" },
    } as const;

    expect(offeredWeaponChanges(triggered.reported.state)).toContainEqual(draw);

    const attacked = releasedAndMissed(triggered, draw);
    expect(heldWeaponId(attacked.state)).toBe(longswordId);
    expect(attacked.state.readiedResponses.has(fighterId)).toBe(false);
  });

  it("offers a change before the readied attack only when the attack is still there after it", () => {
    const daggerId = battleObjectId("off:weapon_dagger");
    const shortswordId = testShortswordAttack().weaponObjectId;
    const triggered = readiedAttackTriggered(dualWieldingFighterBattle());

    expect(offeredWeaponChanges(triggered.reported.state)).toEqual([
      undefined,
      { timing: "beforeAttack", change: { kind: "stow", objectId: daggerId } },
      { timing: "beforeAttack", change: { kind: "drop", objectId: daggerId } },
      {
        timing: "afterAttack",
        change: { kind: "stow", objectId: shortswordId },
      },
      {
        timing: "afterAttack",
        change: { kind: "drop", objectId: shortswordId },
      },
      { timing: "afterAttack", change: { kind: "stow", objectId: daggerId } },
      { timing: "afterAttack", change: { kind: "drop", objectId: daggerId } },
    ]);

    const attacked = releasedAndMissed(triggered, {
      timing: "beforeAttack",
      change: { kind: "stow", objectId: daggerId },
    });
    expect(loadoutWeaponIsStowed(attacked.state, fighterId, daggerId)).toBe(
      true,
    );
  });

  it("names no thrown weapon in a change after a readied throw", () => {
    const melee = readiedAttackTriggered(
      daggerFighterBattle(),
      (response) =>
        !("weaponDelivery" in response.selection) ||
        response.selection.weaponDelivery !== "thrown",
    );
    const thrown = readiedAttackTriggered(
      daggerFighterBattle(),
      (response) =>
        "weaponDelivery" in response.selection &&
        response.selection.weaponDelivery === "thrown",
    );

    const daggerId = battleObjectId("main:weapon_dagger");
    expect(offeredWeaponChanges(melee.reported.state)).toEqual([
      undefined,
      { timing: "afterAttack", change: { kind: "stow", objectId: daggerId } },
      { timing: "afterAttack", change: { kind: "drop", objectId: daggerId } },
    ]);
    // A stowed Thrown weapon is drawn as part of its throw ("Thrown"), but a
    // dropped one is picked up, not drawn.
    expect(offeredWeaponChanges(thrown.reported.state)).toEqual([
      undefined,
      { timing: "beforeAttack", change: { kind: "stow", objectId: daggerId } },
    ]);
  });

  it("makes no change after the attack that the reactor can no longer make", () => {
    const releaseOf = (
      state: BattleState,
      weaponChange: ReadiedAttackWeaponChange,
    ) => ({
      subject: {
        tag: "runtimeCommand" as const,
        actorId: goblinId,
        command: "releaseReadiedAttack" as const,
        reactorId: fighterId,
        targetId: goblinId,
        procedureRef: fighterAttackSubject(state).procedureRef,
        weaponChange,
      },
      fills: [],
    });
    const stowAfter = {
      timing: "afterAttack",
      change: { kind: "stow", objectId: longswordId },
    } as const;
    const battleWith = (conditions: readonly "incapacitated"[]) =>
      startBattleRight({
        battleId: battleId("battle-readied-attack-weapon-change-end"),
        combatants: [
          characterSeed({ initiative: 20, conditions: [...conditions] }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      });
    const incapacitated = battleWith(["incapacitated"]);
    const stowed = fighterWithStowedLongsword();
    const able = battleWith([]);
    expect(
      loadoutWeaponIsStowed(
        readiedAttackReleaseEnd(able, releaseOf(able, stowAfter)).state,
        fighterId,
        longswordId,
      ),
    ).toBe(true);

    for (const [state, weaponChange] of [
      // An Incapacitated reactor doesn't finish its action.
      [incapacitated, stowAfter],
      // The weapon is no longer in hand.
      [stowed, stowAfter],
      // A drop without its landing position.
      [
        fighterVsGoblinBattle(),
        {
          timing: "afterAttack",
          change: { kind: "drop", objectId: longswordId },
        },
      ],
    ] as const) {
      expect(
        readiedAttackReleaseEnd(state, releaseOf(state, weaponChange)),
      ).toEqual({ state, droppedObjects: [] });
    }
  });

  it("refuses a release naming a change the Reaction window doesn't offer", () => {
    const triggered = readiedAttackTriggered(fighterVsGoblinBattle());
    const refused = release(
      triggered,
      {
        timing: "beforeAttack",
        change: { kind: "stow", objectId: longswordId },
      },
      [targetSpatialFacts(triggered.response)],
    );

    expect(refused.tag).toBe("invalid");
  });
});
