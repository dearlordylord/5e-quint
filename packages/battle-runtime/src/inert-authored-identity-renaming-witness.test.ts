import { describe, expect, test } from "vitest";
import { initiativeOrder } from "@dnd/shared-algebras/initiative-algebra";
import type { ConditionState } from "@dnd/shared-algebras/conditions-algebra";
import { characterId, combatantId, type CombatantId } from "./identity.ts";
import type { BattleState } from "./battle-state-execution.ts";
import { KnockedOutConditionState } from "./battle-reducer/knocked-out-state.ts";
import { fighterVsGoblinBattle } from "./battle-runtime-test-support.ts";

/**
 * Synthetic-renaming witness for inert authored identity fields.
 *
 * This test demonstrates that the fields classified as "inert" in the #224
 * inventory do not affect reducer-visible mechanical outcomes. It is
 * intentionally narrow: behavior-driving identity fields (e.g. weaponUnitId
 * for mastery, formStatBlockId for Wild Shape, spellId for class-feature free
 * casts) are excluded because renaming them currently changes outcomes.
 */

type MechanicalProjection = {
  readonly initiativeOrder: readonly CombatantId[];
  readonly combatants: ReadonlyMap<
    CombatantId,
    {
      readonly hp: number;
      readonly maxHp: number;
      readonly armorClassState: unknown;
      readonly size: string;
      readonly movementSpentFeet: number;
      readonly reactionAvailable: boolean;
      readonly activeConditionCount: number;
    }
  >;
};

function activeConditionCount(
  conditions: ConditionState | KnockedOutConditionState,
): number {
  const flags = conditions as ConditionState;
  return (
    Object.entries(flags).filter(
      ([key, value]) => key !== "directIncapacitated" && value,
    ).length + (flags.directIncapacitated ? 1 : 0)
  );
}

function mechanicalProjection(state: BattleState): MechanicalProjection {
  const combatants = new Map(
    Array.from(state.combatants.entries()).map(([id, combatant]) => [
      id,
      {
        hp: Number(combatant.hp),
        maxHp: Number(combatant.maxHp),
        armorClassState: combatant.armorClass,
        size: combatant.size,
        movementSpentFeet: Number(combatant.movementSpentFeet),
        reactionAvailable: combatant.reactionAvailable,
        activeConditionCount: activeConditionCount(combatant.conditions),
      },
    ]),
  );
  return {
    initiativeOrder: initiativeOrder(state.initiative),
    combatants,
  };
}

function renameInertIdentityFields(state: BattleState): BattleState {
  const syntheticCharacterId = characterId("synthetic-character-id-witness");
  const syntheticDisplayName = "Synthetic Witness Name";

  const renamedCombatants = new Map(
    Array.from(state.combatants.entries()).map(([id, combatant]) => {
      if (combatant.origin.kind !== "character") {
        return [id, combatant];
      }
      return [
        id,
        {
          ...combatant,
          origin: {
            ...combatant.origin,
            characterId: syntheticCharacterId,
            displayName: syntheticDisplayName,
          },
        },
      ];
    }),
  );

  return { ...state, combatants: renamedCombatants };
}

describe("inert authored identity renaming witness (#224)", () => {
  test("renaming characterId and displayName does not change mechanical projection", () => {
    const state = fighterVsGoblinBattle();

    const original = mechanicalProjection(state);
    const renamed = mechanicalProjection(renameInertIdentityFields(state));

    expect(renamed).toEqual(original);
  });

  test("the witness actually mutates the inert fields", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(combatantId("fighter"));
    expect(fighter?.origin.kind).toBe("character");
    if (fighter?.origin.kind !== "character") return;

    const renamed = renameInertIdentityFields(state);
    const renamedFighter = renamed.combatants.get(combatantId("fighter"));
    expect(renamedFighter?.origin.kind).toBe("character");
    if (renamedFighter?.origin.kind !== "character") return;

    expect(renamedFighter.origin.characterId).toBe(
      characterId("synthetic-character-id-witness"),
    );
    expect(renamedFighter.origin.displayName).toBe("Synthetic Witness Name");
  });
});
