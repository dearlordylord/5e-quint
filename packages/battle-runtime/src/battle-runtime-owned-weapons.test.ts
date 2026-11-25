// KERNEL-COVERAGE: parity-witness BATTLE.ACTION.ATTACK_WEAPON_CHANGE
import { describe, expect, it } from "vitest";
import { unitId as parseUnitId } from "@dnd/shared/game-facts";
import {
  abilityModifier as battleAbilityModifier,
  attackBonus,
} from "@dnd/shared/types";
import { Result, Schema } from "effect";
import {
  attackRollFill,
  attackTargetFill,
  battleId,
  battleObjectId,
  battleTablePositionId,
  BattleSnapshotSchema,
  characterSeed,
  difficultyClass,
  discoverBattleActCandidates,
  fighterAttackSubject,
  fighterId,
  goblinId,
  movementFeet,
  requireHole,
  requireResolved,
  startBattleRight,
  startBattleSessionRight,
  statBlockCreatureInit,
  testCharacterWeaponAttackForUnit,
  testDaggerAttack,
  testShortswordAttack,
  testSlingAttack,
} from "./battle-runtime.test-support.ts";
import type {
  BattleState,
  CharacterBattleCreatureState,
} from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import { resolveBattleSubject, snapshotBattle, startBattle } from "./index.ts";
import {
  characterBoundWeaponAttacks,
  isCharacterBattleCreatureState,
} from "./battle-reducer/creature-state-queries.ts";
import { combatantHandUses } from "./battle-reducer/creature-state-leaves.ts";
import { attackActionOptionsForActor } from "./battle-reducer/attack-damage-apply.ts";
import { weaponAttackIsThrown } from "./battle-reducer/thrown-weapon-attack.ts";
import { attackActionOptionPresentationName } from "./stat-block-presentation.ts";
import { battleObjectIsOnGround } from "./battle-reducer/object-custody-queries.ts";
import {
  ownedWeaponChangeIssue,
  stateWithOwnedWeaponChange,
  type AppliedAttackWeaponChange,
} from "./battle-reducer/owned-weapon-custody.ts";

// RAW trace: .references/srd-5.2.1/rules-glossary.md#Attack [Action],
// Equipping and Unequipping Weapons: "Equipping a weapon includes drawing it
// from a sheath or picking it up." Any weapon the character owns can be
// equipped, into a hand slot whose weapon is out of hand (ASSUMPTIONS.md A63).
// .references/srd-5.2.1/equipment.md "Two-Handed": "A Two-Handed weapon
// requires two hands when you attack with it."

const longswordId = battleObjectId("main:weapon_longsword");
const shortswordId = battleObjectId("main:weapon_shortsword");
const daggerId = battleObjectId("main:weapon_dagger");
const greataxeId = battleObjectId("main:weapon_greataxe");

function greataxeAttack() {
  return testCharacterWeaponAttackForUnit(parseUnitId("weapon_greataxe"));
}

/** A Fighter with a Longsword in hand, carrying a Dagger and a Greataxe. */
function armedFighterBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-owned-weapons"),
    combatants: [
      characterSeed({
        initiative: 20,
        otherOwnedWeapons: [
          { itemId: daggerId, attack: testDaggerAttack() },
          { itemId: greataxeId, attack: greataxeAttack() },
        ],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function fighter(state: BattleState): CharacterBattleCreatureState {
  const actor = state.combatants.get(fighterId);
  if (actor === undefined || !isCharacterBattleCreatureState(actor)) {
    throw new Error("Expected the Fighter.");
  }
  return actor;
}

function changed(
  state: BattleState,
  change: AppliedAttackWeaponChange,
): BattleState {
  const result = stateWithOwnedWeaponChange(state, fighterId, change);
  if (result.tag !== "applied") throw new Error(result.message);
  return result.state;
}

function stowedLongsword(): BattleState {
  return changed(armedFighterBattle(), {
    kind: "stow",
    objectId: longswordId,
  });
}

function attackActs(state: BattleState) {
  return discoverBattleActCandidates(state).flatMap((act) =>
    act.subject.tag === "action" && act.subject.action === "attack"
      ? [act.subject]
      : [],
  );
}

/** The carried Dagger's thrown attacks that need no weapon change. */
function carriedDaggerThrows(state: BattleState) {
  const dagger = fighter(state).origin.otherOwnedWeaponAttacks.find(
    ({ weaponObjectId }) => weaponObjectId === daggerId,
  );
  return attackActs(state).filter(
    (subject) =>
      !("weaponChange" in subject) &&
      "procedureRef" in subject &&
      subject.procedureRef === dagger?.procedureRef &&
      "weaponDelivery" in subject &&
      subject.weaponDelivery === "thrown",
  );
}

/** Resolves an attack on the Goblin to a miss. */
function missedAttack(state: BattleState, subject: BattleSubject): BattleState {
  const targetHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(targetHole, fighterId, goblinId);
  const rollHole = requireHole(
    resolveBattleSubject({ state, subject, fills: [targetFill] }),
    "attackRoll",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill,
        attackRollFill(rollHole, { total: 2, naturalD20: 2 }),
      ],
    }),
  ).state;
}

describe("weapons the character owns outside its loadout", () => {
  it("binds one attack for each owned weapon at battle start, carried", () => {
    const state = armedFighterBattle();
    const { origin } = fighter(state);

    expect(origin.attack?.weaponObjectId).toBe(longswordId);
    expect(
      origin.otherOwnedWeaponAttacks.map(
        ({ weaponObjectId }) => weaponObjectId,
      ),
    ).toEqual([daggerId, greataxeId]);
    const procedureRefs = [
      origin.attack?.procedureRef,
      origin.unarmedStrike.procedureRef,
      ...origin.otherOwnedWeaponAttacks.map(({ procedureRef }) => procedureRef),
    ];
    expect(new Set(procedureRefs).size).toBe(4);
    expect(state.objectCustody.has(fighterId)).toBe(false);
  });

  it("refuses an owned weapon that shares a battle object with the loadout", () => {
    const started = startBattle({
      battleId: battleId("battle-owned-weapon-clash"),
      combatants: [
        characterSeed({
          initiative: 20,
          otherOwnedWeapons: [
            { itemId: longswordId, attack: testDaggerAttack() },
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(Result.isFailure(started)).toBe(true);
    expect(JSON.stringify(started)).toContain(
      "owned weapons outside the loadout must each be a battle object of their own",
    );
  });

  it("admits a carried Ammunition weapon without its ammunition stock, which can't attack even once drawn", () => {
    // SRD 5.2.1 equipment.md "Ammunition": "You can use a weapon that has the
    // Ammunition property to make a ranged attack only if you have ammunition
    // to fire from it."
    const slingId = battleObjectId("main:weapon_sling");
    const state = startBattleRight({
      battleId: battleId("battle-owned-weapon-ammunition"),
      combatants: [
        characterSeed({
          initiative: 20,
          otherOwnedWeapons: [{ itemId: slingId, attack: testSlingAttack() }],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const drawn = changed(
      changed(state, { kind: "stow", objectId: longswordId }),
      { kind: "equip", objectId: slingId, slot: "mainWeapon" },
    );

    expect(fighter(drawn).origin.attack?.weaponObjectId).toBe(slingId);
    expect(
      attackActionOptionsForActor(drawn, fighterId).filter(
        (attack) =>
          attack.kind === "weapon" && attack.weaponObjectId === slingId,
      ),
    ).toEqual([]);
  });

  it("refuses an owned weapon without an authored presentation source, as it would one in hand", () => {
    const character = characterSeed({
      initiative: 20,
      otherOwnedWeapons: [{ itemId: greataxeId, attack: greataxeAttack() }],
    });
    if (character.creatureInit.kind !== "character") {
      throw new Error("Expected the Fighter.");
    }
    const started = startBattle({
      battleId: battleId("battle-owned-weapon-presentation"),
      combatants: [
        {
          ...character,
          creatureInit: {
            ...character.creatureInit,
            characterUnitRefs: character.creatureInit.characterUnitRefs.filter(
              ({ unit }) => unit.id !== "weapon_greataxe",
            ),
          },
        },
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(started).toMatchObject(
      Result.fail({
        kind: "weaponPresentationUnavailable",
        weaponUnitId: "weapon_greataxe",
        availability: "missing",
      }),
    );
  });

  it("offers to draw a carried weapon into the main slot once its weapon is out of hand", () => {
    expect(
      ownedWeaponChangeIssue(armedFighterBattle(), fighterId, {
        kind: "equip",
        objectId: daggerId,
        slot: "mainWeapon",
      }),
    ).toMatchObject({ reason: "slotWeaponHeld" });

    const stowed = stowedLongsword();
    const draws = attackActs(stowed).flatMap((subject) =>
      "weaponChange" in subject ? [subject.weaponChange] : [],
    );
    expect(draws).toEqual(
      expect.arrayContaining([
        { kind: "equip", objectId: longswordId, slot: "mainWeapon" },
        { kind: "equip", objectId: daggerId, slot: "mainWeapon" },
        { kind: "equip", objectId: greataxeId, slot: "mainWeapon" },
      ]),
    );
  });

  it("draws the Dagger in place of the stowed Longsword and attacks with it", () => {
    const drawn = changed(stowedLongsword(), {
      kind: "equip",
      objectId: daggerId,
      slot: "mainWeapon",
    });
    const { origin } = fighter(drawn);

    expect(origin.selectedLoadout.weapon).toEqual({
      itemId: daggerId,
      unitId: parseUnitId("weapon_dagger"),
      grip: "one_handed",
    });
    expect(origin.attack?.weaponObjectId).toBe(daggerId);
    expect(
      origin.otherOwnedWeaponAttacks.map(
        ({ weaponObjectId }) => weaponObjectId,
      ),
    ).toEqual([greataxeId, longswordId]);
    // The Longsword left the loadout, still carried.
    expect(drawn.objectCustody.has(fighterId)).toBe(false);
    expect(combatantHandUses(drawn, fighter(drawn), [])).toEqual({
      left: "free",
      right: "mainWeapon",
    });

    const attacked = missedAttack(drawn, fighterAttackSubject(drawn, "Dagger"));
    expect(attacked.currentTurnResources.weaponChangeAfterAttack).toBe(
      "available",
    );
  });

  it("draws a Two-Handed weapon into both hands, and never into the off hand", () => {
    const stowed = stowedLongsword();
    expect(
      ownedWeaponChangeIssue(armedFighterBattle(), fighterId, {
        kind: "equip",
        objectId: greataxeId,
        slot: "offWeapon",
      }),
    ).toMatchObject({ reason: "twoHandedWeaponInOffHand" });

    const drawn = changed(stowed, {
      kind: "equip",
      objectId: greataxeId,
      slot: "mainWeapon",
    });
    expect(fighter(drawn).origin.selectedLoadout.weapon?.grip).toBe(
      "two_handed",
    );
    expect(combatantHandUses(drawn, fighter(drawn), [])).toEqual({
      left: "mainWeapon",
      right: "mainWeapon",
    });
  });

  it("draws a Two-Handed weapon into one free hand, then needs both hands to attack", () => {
    const occupied = changed(
      changed(armedFighterBattle(), {
        kind: "equip",
        objectId: daggerId,
        slot: "offWeapon",
      }),
      { kind: "stow", objectId: longswordId },
    );
    const drawn = changed(occupied, {
      kind: "equip",
      objectId: greataxeId,
      slot: "mainWeapon",
    });
    expect(fighter(drawn).origin.selectedLoadout.weapon?.grip).toBe(
      "one_handed",
    );
    expect(combatantHandUses(drawn, fighter(drawn), [])).toEqual({
      left: "offWeapon",
      right: "mainWeapon",
    });
    expect(
      attackActionOptionsForActor(drawn, fighterId).some(
        (attack) =>
          attack.kind === "weapon" && attack.weaponObjectId === greataxeId,
      ),
    ).toBe(false);
    const grip = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "changeWeaponGrip",
      grip: "two_handed",
    } as const;
    expect(
      resolveBattleSubject({ state: drawn, subject: grip, fills: [] }),
    ).toMatchObject({ tag: "invalid" });
    const freed = changed(drawn, { kind: "stow", objectId: daggerId });
    const ready = requireResolved(
      resolveBattleSubject({ state: freed, subject: grip, fills: [] }),
    ).state;
    const attacked = missedAttack(
      ready,
      fighterAttackSubject(ready, "Greataxe"),
    );
    expect(attacked.currentTurnResources.weaponChangeAfterAttack).toBe(
      "available",
    );

    // Redrawing the same selected weapon obeys the same holding rule.
    const stowed = changed(drawn, { kind: "stow", objectId: greataxeId });
    const redrawn = changed(stowed, {
      kind: "equip",
      objectId: greataxeId,
      slot: "mainWeapon",
    });
    expect(fighter(redrawn).origin.selectedLoadout.weapon?.grip).toBe(
      "one_handed",
    );
    expect(combatantHandUses(redrawn, fighter(redrawn), [])).toEqual({
      left: "offWeapon",
      right: "mainWeapon",
    });
  });

  it("puts a weapon in the off hand only beside a main weapon in hand", () => {
    expect(
      ownedWeaponChangeIssue(stowedLongsword(), fighterId, {
        kind: "equip",
        objectId: daggerId,
        slot: "offWeapon",
      }),
    ).toMatchObject({ reason: "noMainWeaponInHand" });

    const drawn = changed(armedFighterBattle(), {
      kind: "equip",
      objectId: daggerId,
      slot: "offWeapon",
    });
    const { origin } = fighter(drawn);
    expect(origin.offHandAttack?.weaponObjectId).toBe(daggerId);
    expect(combatantHandUses(drawn, fighter(drawn), [])).toEqual({
      left: "offWeapon",
      right: "mainWeapon",
    });
  });

  it("draws a Light Dagger into the off hand before a Shortsword attack, for the Light Bonus Action attack", () => {
    const state = startBattleRight({
      battleId: battleId("battle-owned-light-weapons"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
          otherOwnedWeapons: [{ itemId: daggerId, attack: testDaggerAttack() }],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const drawDagger = {
      kind: "equip",
      objectId: daggerId,
      slot: "offWeapon",
    } as const;
    const attack = attackActs(state).find(
      (subject) =>
        "weaponChange" in subject &&
        subject.procedureRef === fighter(state).origin.attack?.procedureRef &&
        subject.weaponChange.kind === "equip" &&
        subject.weaponChange.objectId === daggerId,
    );
    expect(attack).toMatchObject({ weaponChange: drawDagger });
    if (attack === undefined) throw new Error("Expected the attack.");

    const attacked = missedAttack(state, attack);
    expect(fighter(attacked).origin.selectedLoadout.weapon?.itemId).toBe(
      shortswordId,
    );
    expect(fighter(attacked).origin.offHandAttack?.weaponObjectId).toBe(
      daggerId,
    );
    expect(
      discoverBattleActCandidates(attacked).some(
        (act) =>
          act.subject.tag === "bonusAction" &&
          act.subject.action === "offHandAttack",
      ),
    ).toBe(true);
  });

  it("leaves a dropped weapon lying when another takes its slot, and picks it back up later", () => {
    const dropped = changed(armedFighterBattle(), {
      kind: "drop",
      objectId: longswordId,
      positionId: battleTablePositionId("dropped-longsword"),
    });
    const withDagger = changed(dropped, {
      kind: "equip",
      objectId: daggerId,
      slot: "mainWeapon",
    });
    expect(battleObjectIsOnGround(withDagger, fighterId, longswordId)).toBe(
      true,
    );
    expect(
      fighter(withDagger).origin.otherOwnedWeaponAttacks.map(
        ({ weaponObjectId }) => weaponObjectId,
      ),
    ).toContain(longswordId);
    expect(
      ownedWeaponChangeIssue(withDagger, fighterId, {
        kind: "equip",
        objectId: longswordId,
        slot: "mainWeapon",
      }),
    ).toMatchObject({ reason: "slotWeaponHeld" });

    const daggerStowed = changed(withDagger, {
      kind: "stow",
      objectId: daggerId,
    });
    const pickedUp = changed(daggerStowed, {
      kind: "equip",
      objectId: longswordId,
      slot: "mainWeapon",
    });
    expect(battleObjectIsOnGround(pickedUp, fighterId, longswordId)).toBe(
      false,
    );
    expect(fighter(pickedUp).origin.attack?.weaponObjectId).toBe(longswordId);
    // The stowed Dagger left the loadout, carried like any other owned weapon.
    expect(pickedUp.objectCustody.has(fighterId)).toBe(false);
  });

  it("throws a carried Thrown weapon drawn as part of the attack, keeping the weapon change", () => {
    // SRD 5.2.1 equipment.md "Thrown": "you can draw that weapon as part of
    // the attack."
    const state = armedFighterBattle();
    const throwDagger = carriedDaggerThrows(state)[0];
    if (throwDagger === undefined) throw new Error("Expected the throw.");

    const thrown = missedAttack(state, throwDagger);
    expect(battleObjectIsOnGround(thrown, fighterId, daggerId)).toBe(true);
    expect(thrown.currentTurnResources.weaponChangeAfterAttack).toBe(
      "available",
    );
    expect(fighter(thrown).origin.attack?.weaponObjectId).toBe(longswordId);
    expect(carriedDaggerThrows(thrown)).toEqual([]);
  });

  it("offers no carried throw while no hand is free", () => {
    const state = armedFighterBattle();
    const hands = combatantHandUses(state, fighter(state), []);
    const freeHand = hands.left === "free" ? "left" : "right";
    const grappling: BattleState = {
      ...state,
      grapples: [
        {
          grapplerId: fighterId,
          targetId: goblinId,
          escapeDc: difficultyClass(13),
          reachFeet: movementFeet(5),
          hand: freeHand,
        },
      ],
    };

    expect(carriedDaggerThrows(state)).toHaveLength(1);
    expect(carriedDaggerThrows(grappling)).toEqual([]);
  });

  it("keeps a snapshot of the moved bindings decodable", () => {
    const drawn = changed(stowedLongsword(), {
      kind: "equip",
      objectId: daggerId,
      slot: "mainWeapon",
    });
    const encoded = Schema.encodeSync(BattleSnapshotSchema)(
      snapshotBattle(drawn),
    );
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)(encoded),
    ).not.toThrow();
  });

  it("names a carried throw by the carried weapon's own binding", () => {
    // The Dagger is bound with Strength and can also attack with Dexterity
    // (SRD 5.2.1 equipment.md "Finesse"); only the other ability is named.
    const dagger = {
      ...testDaggerAttack(),
      alternateAbilityChoices: [
        {
          ability: "dex" as const,
          abilityModifier: battleAbilityModifier(2),
          attackBonus: attackBonus(4),
          damageAbilityModifier: battleAbilityModifier(2),
        },
      ],
    } satisfies ReturnType<typeof testDaggerAttack>;
    const session = startBattleSessionRight({
      battleId: battleId("battle-owned-weapons-carried-throw-name"),
      combatants: [
        characterSeed({
          initiative: 20,
          otherOwnedWeapons: [{ itemId: daggerId, attack: dagger }],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const names = attackActionOptionsForActor(session.state, fighterId)
      .filter(
        (attack) =>
          attack.kind === "weapon" &&
          attack.weaponObjectId === daggerId &&
          weaponAttackIsThrown(attack),
      )
      .map((attack) =>
        Result.getOrThrow(
          attackActionOptionPresentationName(
            session.state,
            session.context,
            fighterId,
            attack,
          ),
        ),
      );

    expect([...names].sort()).toEqual(["Dagger", "Dagger (Dexterity)"]);
  });

  it("offers one of a set of carried copies, and each copy on the ground", () => {
    const firstId = daggerId;
    const secondId = battleObjectId("main:weapon_dagger#2");
    const thirdId = battleObjectId("main:weapon_dagger#3");
    const copyIds = [firstId, secondId, thirdId];
    const carried = changed(
      startBattleRight({
        battleId: battleId("battle-owned-weapons-copies"),
        combatants: [
          characterSeed({
            initiative: 20,
            otherOwnedWeapons: [
              { itemId: firstId, attack: testDaggerAttack() },
              { itemId: secondId, attack: testDaggerAttack() },
              { itemId: thirdId, attack: testDaggerAttack() },
            ],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      { kind: "stow", objectId: longswordId },
    );
    const equippedCopies = (state: BattleState) =>
      new Set(
        attackActs(state).flatMap((subject) =>
          "weaponChange" in subject &&
          subject.weaponChange?.kind === "equip" &&
          copyIds.includes(subject.weaponChange.objectId)
            ? [subject.weaponChange.objectId]
            : [],
        ),
      );
    const thrownWeapons = (state: BattleState) => {
      const bindings = characterBoundWeaponAttacks(fighter(state));
      return new Set(
        attackActs(state).flatMap((subject) =>
          !("weaponChange" in subject) &&
          "weaponDelivery" in subject &&
          subject.weaponDelivery === "thrown"
            ? bindings
                .filter(
                  ({ procedureRef }) =>
                    "procedureRef" in subject &&
                    procedureRef === subject.procedureRef,
                )
                .map(({ weaponObjectId }) => weaponObjectId)
            : [],
        ),
      );
    };

    expect(equippedCopies(carried)).toEqual(new Set([firstId]));
    expect(thrownWeapons(carried)).toEqual(new Set([firstId]));

    // The second copy is drawn, dropped, and then left lying when the third
    // takes its slot.
    const secondOnGround = changed(
      changed(
        changed(carried, {
          kind: "equip",
          objectId: secondId,
          slot: "mainWeapon",
        }),
        {
          kind: "drop",
          objectId: secondId,
          positionId: battleTablePositionId("dropped-dagger-position"),
        },
      ),
      { kind: "equip", objectId: thirdId, slot: "mainWeapon" },
    );
    expect(battleObjectIsOnGround(secondOnGround, fighterId, secondId)).toBe(
      true,
    );
    expect(equippedCopies(secondOnGround)).toEqual(
      new Set([firstId, secondId]),
    );
    expect(thrownWeapons(secondOnGround)).toEqual(new Set([firstId, thirdId]));
  });
});
