import { describe, expect, it } from "vitest";
import {
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  attackTargetFill,
  battleObjectId,
  battleTablePositionId,
  discoverBattleActCandidates,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  requireHole,
  requireResolved,
} from "./battle-runtime.test-support.ts";
import type { BattleFill, BattleState } from "./battle-state-execution.ts";
import type { AttackWeaponChange, BattleSubject } from "./battle-subjects.ts";
import { characterEffectiveLoadout, resolveBattleSubject } from "./index.ts";
import { isCharacterBattleCreatureState } from "./battle-reducer/creature-state-queries.ts";
import { weaponDropPositionHole } from "./battle-reducer/attack-weapon-change.ts";
import { battleObjectIsOnGround } from "./battle-reducer/battle-object-lifecycle.ts";
import { stateWithLoadoutWeaponChange } from "./battle-reducer/loadout-weapon-custody.ts";

// RAW trace: .references/srd-5.2.1/rules-glossary.md#Attack [Action],
// Equipping and Unequipping Weapons: one weapon equipped or unequipped with
// each attack of the Attack action, before or after it; a weapon equipped
// before an attack needn't be the one used. ASSUMPTIONS.md A63: an after
// change comes before the creature's next attack; where a dropped weapon
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
  subject: BattleSubject & { readonly tag: "action"; readonly action: "attack" },
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

    expect(stowed.stowedLoadoutWeapons.get(fighterId)?.has(longswordId)).toBe(
      true,
    );
    expect(heldWeaponId(stowed)).toBeUndefined();
    expect(stowed.currentTurnResources.weaponChangeAfterAttack).toBe(
      "unavailable",
    );
    expect(afterAttackChanges(stowed)).toEqual([]);
  });

  it("offers an attack that draws a stowed weapon, and draws it before the roll", () => {
    const stowed = fighterWithStowedLongsword();
    const longswordAttacks = attackActs(stowed).filter(
      (subject) => "weaponChange" in subject,
    );
    expect(longswordAttacks).toEqual([
      withChange(fighterAttackSubject(fighterVsGoblinBattle()), {
        kind: "equip",
        objectId: longswordId,
      }),
    ]);
    const [drawAndAttack] = longswordAttacks;
    if (drawAndAttack === undefined) throw new Error("Expected the attack.");

    const drawn = missedAttack(stowed, drawAndAttack);
    expect(heldWeaponId(drawn)).toBe(longswordId);
    expect(drawn.stowedLoadoutWeapons.has(fighterId)).toBe(false);
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
    expect(dropped.groundObjects.get(fighterId)?.get(longswordId)).toEqual({
      positionId: dropPositionId,
      source: { kind: "attackWeaponChange" },
    });
    expect(heldWeaponId(dropped)).toBeUndefined();
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
          escapeDc: 13 as never,
          reachFeet: 5 as never,
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

    const dropped = requireResolved(
      changeAfterAttack(attacked, { kind: "drop", objectId: longswordId }, [
        dropFill(),
      ]),
    ).state;
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

  it("gives up the change at the end of the turn", () => {
    const state = fighterVsGoblinBattle();
    const attacked = missedAttack(state, fighterAttackSubject(state));
    const ended = requireResolved(
      resolveBattleSubject({
        state: attacked,
        subject: { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
        fills: [],
      }),
    ).state;
    expect(ended.currentTurnResources.weaponChangeAfterAttack).toBe(
      "unavailable",
    );
  });
});
