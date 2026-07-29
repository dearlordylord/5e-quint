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
