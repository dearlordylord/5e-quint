import { Schema } from "effect";
import * as Either from "effect/Either";
import { unitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";
import {
  battleObjectId,
  goblinId,
  goblinTurnBattle,
  testGreataxeAttack,
} from "../battle-runtime.test-support.ts";
import { attackActionOptionsForActor } from "./attack-damage-apply.ts";
import {
  CharacterWeaponAttackActionOptionSchema,
  SupportedAttackActionOptionSchema,
} from "./codec-building-blocks.ts";

describe("battle action option codecs", () => {
  test("accepts a synthetic weapon with a domain-valid damage-type choice", () => {
    const greataxe = testGreataxeAttack();
    const attack = {
      ...greataxe,
      weaponObjectId: battleObjectId("main:synthetic_damage_choice_weapon"),
      weapon: {
        ...greataxe.weapon,
        weaponUnitId: unitId("synthetic_damage_choice_weapon"),
      },
      damageTypeChoices: ["slashing", "bludgeoning"],
    } as const;

    expect(
      Either.isRight(
        Schema.decodeUnknownEither(CharacterWeaponAttackActionOptionSchema)(
          attack,
        ),
      ),
    ).toBe(true);
  });

  test("rejects a damage-type choice with fewer than two choices", () => {
    const greataxe = testGreataxeAttack();
    const decoded = Schema.decodeUnknownEither(
      CharacterWeaponAttackActionOptionSchema,
    )({
      ...greataxe,
      weaponObjectId: battleObjectId("main:synthetic_single_damage_choice"),
      weapon: {
        ...greataxe.weapon,
        weaponUnitId: unitId("synthetic_single_damage_choice"),
      },
      damageTypeChoices: ["slashing"],
    });

    expect(Either.isLeft(decoded)).toBe(true);
    if (Either.isLeft(decoded)) {
      expect(String(decoded.left)).toContain(
        "Weapon attack damage type choices must contain at least two choices.",
      );
    }
  });

  test("accepts the admitted Stat Block attack options exposed by the runtime", () => {
    const state = goblinTurnBattle();
    const attacks = attackActionOptionsForActor(state, goblinId);

    expect(attacks.length).toBeGreaterThan(0);
    expect(
      attacks.every((attack) =>
        Either.isRight(
          Schema.decodeUnknownEither(SupportedAttackActionOptionSchema)(attack),
        ),
      ),
    ).toBe(true);
  });
});
