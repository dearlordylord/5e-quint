import { describe, expect, it } from "vitest";
import { Result, Schema } from "effect";
import { RollDiceArgsSchema } from "../dice-tool-input.ts";
import { statBlockAttackActionOptions } from "../../../battle-runtime/src/stat-block-execution-state.ts";
import { DieRollResult } from "@dnd/shared/types";
import type { BattleHole } from "@dnd/battle-runtime";
import {
  battleProcedureExecutionRefForTest,
  fighterId,
  goblinId,
  goblinTurnBattle,
  testQuarterstaffAttack,
} from "../../../battle-runtime/src/battle-runtime.test-support.ts";
import { attackDamageHole } from "../../../battle-runtime/src/battle-reducer/attack-damage-apply.ts";
import { attackRollHole } from "../../../battle-runtime/src/battle-reducer/attack-roll.ts";
import { validateRolledDiceForWeaponAttack } from "../../../battle-runtime/src/battle-reducer/attack-resolution.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../../test-support/json-schema.ts";
import { battleInputGuidance } from "./battle-input-guidance.ts";

const attack = testQuarterstaffAttack();
const hit = {
  total: 25,
  d20TestRoll: { tag: "single", naturalD20: DieRollResult(20) },
} as const;
function guidanceFor(hole: BattleHole) {
  const [guidance] = battleInputGuidance(hole);
  if (guidance === undefined) throw new Error("Expected dice guidance");
  return guidance;
}
function validatorFor(hole: BattleHole) {
  return createDraft2020JsonSchemaValidator().getValidator(
    requireJsonSchema(guidanceFor(hole).fillSchema, "current dice fill"),
  );
}

describe("current Battle dice input", () => {
  for (const critical of [false, true]) {
    it(`bounds the actual ${critical ? "critical" : "ordinary"} damage request`, () => {
      const hole = attackDamageHole(attack, critical, hit);
      const validate = validatorFor(hole);
      const dice = critical ? [6, 1] : [6];
      const fill = (results: readonly number[]) => ({
        kind: "rolledDice",
        holeId: hole.holeId,
        value: [{ results }],
      });
      expect(validate(fill(dice)).valid).toBe(true);
      expect(
        validateRolledDiceForWeaponAttack(
          [{ results: dice.map(DieRollResult) }],
          attack,
          critical,
          hit,
          [],
          [],
          [],
        ),
      ).toBeNull();
      for (const results of [
        [],
        [...dice, 2],
        dice.map(() => 7),
        dice.map(() => 1.5),
      ]) {
        expect(validate(fill(results)).valid).toBe(false);
      }
      expect(guidanceFor(hole).instructions.join(" ")).toContain(
        "already include critical-hit doubling",
      );
    });
  }

  for (const mode of ["normal", "advantage", "disadvantage"] as const) {
    it(`requires the current ${mode} d20 form`, () => {
      const hole = attackRollHole(undefined, attack, mode);
      const validate = validatorFor(hole);
      const single = { tag: "single", naturalD20: 4 };
      const multiple = { tag: "multiple", first: 4, second: 2, rollMode: mode };
      const fill = (d20TestRoll: object) => ({
        kind: "attackRoll",
        holeId: hole.holeId,
        value: { total: 9, d20TestRoll },
      });
      expect(validate(fill(mode === "normal" ? single : multiple)).valid).toBe(
        true,
      );
      expect(validate(fill(mode === "normal" ? multiple : single)).valid).toBe(
        false,
      );
      const invalid =
        mode === "normal"
          ? { ...single, naturalD20: 21 }
          : { ...multiple, first: 21 };
      expect(validate(fill(invalid)).valid).toBe(false);
      const fractional =
        mode === "normal"
          ? { ...single, naturalD20: 1.5 }
          : { ...multiple, first: 1.5 };
      expect(validate(fill(fractional)).valid).toBe(false);
    });
  }

  it("publishes sampler-compatible critical groups including a Stat Block advantage bonus", () => {
    const goblin = goblinTurnBattle().combatants.get(goblinId);
    if (goblin?.origin.kind !== "statBlock")
      throw new Error("Expected Stat Block actor");
    const action = statBlockAttackActionOptions(goblin.origin.execution).find(
      (candidate) =>
        candidate.attack.attackType === "melee" &&
        candidate.attack.onHit.damage.baseComponents.every(
          (component) => component.kind === "rolled",
        ),
    );
    if (action === undefined) throw new Error("Expected rolled melee attack");
    const criticalAdvantage = {
      total: 25,
      d20TestRoll: {
        tag: "multiple",
        first: DieRollResult(20),
        second: DieRollResult(19),
        rollMode: "advantage",
      },
    } as const;
    const hole = attackDamageHole(action, true, criticalAdvantage);
    expect(hole.damageDice).toEqual({
      kind: "fixed",
      groups: [
        { dice: 2, dieSize: 6 },
        { dice: 2, dieSize: 4 },
      ],
    });
    if (hole.damageDice.kind !== "fixed")
      throw new Error("Expected fixed groups");
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(RollDiceArgsSchema)({
          groups: hole.damageDice.groups,
        }),
      ),
    ).toBe(true);
    const value = [{ results: [6, 1] }, { results: [4, 2] }];
    const validate = validatorFor(hole);
    expect(
      validate({ kind: "rolledDice", holeId: hole.holeId, value }).valid,
    ).toBe(true);
    expect(
      validate({ kind: "rolledDice", holeId: hole.holeId, value: [value[0]] })
        .valid,
    ).toBe(false);
    expect(
      validateRolledDiceForWeaponAttack(
        value.map(({ results }) => ({ results: results.map(DieRollResult) })),
        action,
        true,
        criticalAdvantage,
        [],
        [],
        [],
      ),
    ).toBeNull();
  });

  it("does not impose fixed counts on optional damage-rider choices", () => {
    const rider = {
      attackerId: fighterId,
      procedureRef: battleProcedureExecutionRefForTest(
        "synthetic-optional-damage",
      ),
      optional: true,
      damage: { dice: 1, dieSize: 6, damageType: "fire" },
    } as const;
    const hole = attackDamageHole(attack, true, hit, [rider]);
    expect(hole.damageDice.kind).toBe("selectionDependent");
    const validate = validatorFor(hole);
    expect(
      validate({
        kind: "rolledDice",
        holeId: hole.holeId,
        selectedAttackDamageRiderProcedureRefs: [rider.procedureRef],
        value: [{ results: [6, 1] }, { results: [2, 3] }],
      }).valid,
    ).toBe(true);
  });
});
