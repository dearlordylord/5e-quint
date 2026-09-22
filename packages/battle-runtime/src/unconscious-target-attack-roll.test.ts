import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { movementFeet } from "@dnd/shared/types";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { describe, expect, test } from "vitest";

// RAW trace:
// - rules-glossary.md#Unconscious grants attack-roll Advantage and makes a
//   hit from within 5 feet a Critical Hit; it also applies Prone.
// - rules-glossary.md#Prone keys its attack-roll source to within 5 feet, not
//   to melee versus ranged attacks.
// - playing-the-game.md#Ranged-Attacks-in-Close-Combat excludes an
//   Incapacitated nearby enemy; Unconscious applies Incapacitated.
import weaponLongbowInput from "../../surface/content/weapon_longbow.json";
import weaponPikeInput from "../../surface/content/weapon_pike.json";
import { battleAmmunitionStock } from "./battle-ammunition.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./battle-reducer/creature-hit-point-state.ts";
import {
  admitCharacterWeaponAttackExecutionWeapon,
  attackInitialTargetHole,
  attackRollFill,
  attackTargetFill,
  battleAbilityModifier,
  battleId,
  battleObjectId,
  characterSeed,
  fighterAttackSubject,
  fighterId,
  goblinId,
  requireHole,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";

describe("battle runtime: attacks against an Unconscious target", () => {
  test("a Reach melee attack from 10 feet is a normal roll and not an automatic critical", () => {
    const pike = decodeUnitRecordSync(weaponPikeInput);
    if (pike.kind !== "weapon") {
      throw new Error("Expected the Pike weapon Unit.");
    }
    const initialState = startBattleRight({
      battleId: battleId("battle-unconscious-reach-attack"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: {
            kind: "weapon",
            ...admitCharacterWeaponAttackExecutionWeapon(
              pike,
              battleObjectId(`main:${pike.id}`),
            ),
            ability: "str",
            abilityModifier: battleAbilityModifier(3),
          },
          characterUnitRefs: [{ unit: pike, supportProfiles: [] }],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const goblin = initialState.combatants.get(goblinId);
    if (goblin === undefined) {
      throw new Error("Expected the goblin fixture.");
    }
    const state = {
      ...initialState,
      combatants: new Map(initialState.combatants).set(
        goblinId,
        battleCreatureStateWithKnockOutPreservedConditions(
          goblin,
          applyCondition(goblin.conditions, "unconscious"),
        ),
      ),
    };
    const subject = fighterAttackSubject(state, "Pike");
    const targetHole = attackInitialTargetHole(state, subject);
    const target = attackTargetFill(
      targetHole,
      fighterId,
      goblinId,
      undefined,
      [],
      movementFeet(10),
    );
    const rollHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [target] }),
      "attackRoll",
    );
    expect(rollHole).toMatchObject({ rollMode: "normal" });

    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          target,
          attackRollFill(rollHole, {
            total: 15,
            naturalD20: 10,
            rollMode: "normal",
          }),
        ],
      }),
      "rolledDice",
    );
    expect(damageHole).toMatchObject({ critical: false });
  });

  test("a bow attack from 5 feet against its lone Unconscious enemy has Advantage and is an automatic critical", () => {
    const longbow = decodeUnitRecordSync(weaponLongbowInput);
    if (longbow.kind !== "weapon") {
      throw new Error("Expected the Longbow weapon Unit.");
    }
    const initialState = startBattleRight({
      battleId: battleId("battle-unconscious-bow-attack"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: {
            kind: "weapon",
            ...admitCharacterWeaponAttackExecutionWeapon(
              longbow,
              battleObjectId(`main:${longbow.id}`),
            ),
            ability: "dex",
            abilityModifier: battleAbilityModifier(3),
          },
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
          characterUnitRefs: [{ unit: longbow, supportProfiles: [] }],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const goblin = initialState.combatants.get(goblinId);
    if (goblin === undefined) {
      throw new Error("Expected the goblin fixture.");
    }
    const state = {
      ...initialState,
      combatants: new Map(initialState.combatants).set(
        goblinId,
        battleCreatureStateWithKnockOutPreservedConditions(
          goblin,
          applyCondition(goblin.conditions, "unconscious"),
        ),
      ),
    };
    const subject = fighterAttackSubject(state, "Longbow");
    const targetHole = attackInitialTargetHole(state, subject);
    const target = attackTargetFill(
      targetHole,
      fighterId,
      goblinId,
      undefined,
      [],
      movementFeet(5),
    );
    const rollHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [target] }),
      "attackRoll",
    );
    expect(rollHole).toMatchObject({ rollMode: "advantage" });

    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          target,
          attackRollFill(rollHole, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
          }),
        ],
      }),
      "rolledDice",
    );
    expect(damageHole).toMatchObject({ critical: true });
  });
});
