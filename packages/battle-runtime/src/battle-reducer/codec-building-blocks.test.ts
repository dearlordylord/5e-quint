import { projectMechanicalAttackActionOption } from "../battle-mechanical-attack-options.ts";
import { BattleMechanicalHoleSchema } from "../battle-mechanical-frontier.ts";
import { BattleHoleSchema } from "./battle-codecs.ts";
import { attackRollHole } from "./attack-roll.ts";
import { attackDamageHole } from "./attack-damage-apply.ts";
import {
  attackTargetConstraint,
  weaponAttackTargetConstraint,
} from "./statblock-attacks.ts";
import { admitVersatileMeleeDamage } from "../weapon-melee-grip-damage.ts";
import { Schema } from "effect";
import { Result } from "effect";
import { unitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";
import {
  battleObjectId,
  goblinId,
  goblinTurnBattle,
  testGreataxeAttack,
  testLongswordAttack,
  testDaggerAttack,
  fighterVsGoblinBattle,
  fighterId,
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
      Result.isSuccess(
        Schema.decodeUnknownResult(CharacterWeaponAttackActionOptionSchema)(
          attack,
        ),
      ),
    ).toBe(true);
  });

  test("rejects a damage-type choice with fewer than two choices", () => {
    const greataxe = testGreataxeAttack();
    const decoded = Schema.decodeUnknownResult(
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

    expect(Result.isFailure(decoded)).toBe(true);
    if (Result.isFailure(decoded)) {
      expect(String(decoded.failure)).toContain('["damageTypeChoices"][1]');
    }
  });

  test("melee grip evidence must belong to the base weapon", () => {
    const weapon = testLongswordAttack();
    const admitted = admitVersatileMeleeDamage(weapon.weapon, "two_handed");
    if (Result.isFailure(admitted) || admitted.success === undefined)
      throw new Error("Expected the fixture's admitted Versatile property.");
    const attack = {
      ...weapon,
      weaponObjectId: battleObjectId("codec-melee-grip"),
      meleeGripDamage: admitted.success,
    };
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(CharacterWeaponAttackActionOptionSchema)(
          attack,
        ),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(CharacterWeaponAttackActionOptionSchema)({
          ...attack,
          meleeGripDamage: {
            ...admitted.success,
            damage: { ...admitted.success.damage, dieSize: 12 },
          },
        }),
      ),
    ).toBe(true);
  });

  test.each(["attackRoll", "rolledDice"] as const)(
    "%s retains admitted thrown range through labeled and mechanical codecs",
    (kind) => {
      const state = fighterVsGoblinBattle({ attack: testDaggerAttack() });
      const actor = state.combatants.get(fighterId);
      const thrown = attackActionOptionsForActor(state, fighterId).find(
        (attack) =>
          attack.kind === "weapon" && attack.weaponDelivery !== undefined,
      );
      if (actor === undefined || thrown?.kind !== "weapon")
        throw new Error("Expected the fixture's admitted throw.");
      const hole =
        kind === "attackRoll"
          ? attackRollHole(actor, thrown)
          : attackDamageHole(thrown);
      const decoded = Schema.decodeUnknownSync(BattleHoleSchema)(
        Schema.encodeSync(BattleHoleSchema)(hole),
      );
      if (
        (decoded.kind !== "attackRoll" && decoded.kind !== "rolledDice") ||
        !("attack" in decoded) ||
        decoded.attack.kind !== "weapon"
      )
        throw new Error("Expected the decoded weapon hole.");
      expect(decoded.attack.weaponDelivery).toEqual({
        kind: "thrown",
        range: { normal: 20, long: 60 },
      });
      expect(attackTargetConstraint(decoded.attack)).toMatchObject({
        kind: "rangedRange",
        normalFeet: 20,
        longFeet: 60,
      });
      const mechanical = Schema.decodeUnknownSync(BattleMechanicalHoleSchema)({
        ...decoded,
        attack: projectMechanicalAttackActionOption(decoded.attack),
      });
      if (
        (mechanical.kind !== "attackRoll" &&
          mechanical.kind !== "rolledDice") ||
        !("attack" in mechanical) ||
        mechanical.attack.kind !== "weapon"
      )
        throw new Error("Expected the decoded mechanical weapon hole.");
      expect(mechanical.attack.weapon).not.toHaveProperty("weaponUnitId");
      expect(weaponAttackTargetConstraint(mechanical.attack)).toMatchObject({
        kind: "rangedRange",
        normalFeet: 20,
        longFeet: 60,
      });
      expect(
        Result.isFailure(
          Schema.decodeUnknownResult(SupportedAttackActionOptionSchema)({
            ...thrown,
            weaponDelivery: { kind: "thrown", range: { normal: 21, long: 60 } },
          }),
        ),
      ).toBe(true);
    },
  );

  test("accepts the admitted Stat Block attack options exposed by the runtime", () => {
    const state = goblinTurnBattle();
    const attacks = attackActionOptionsForActor(state, goblinId);

    expect(attacks.length).toBeGreaterThan(0);
    expect(
      attacks.every((attack) =>
        Result.isSuccess(
          Schema.decodeUnknownResult(SupportedAttackActionOptionSchema)(attack),
        ),
      ),
    ).toBe(true);
  });
});
