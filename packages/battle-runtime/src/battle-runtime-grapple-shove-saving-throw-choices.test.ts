// KERNEL-COVERAGE: parity-witness BATTLE.SAVING_THROW.MODIFIER_COLLECTOR
// RAW: .references/srd-5.2.1/rules-glossary.md, "Unarmed Strike": Grapple
// and Shove: "The target must succeed on a Strength or Dexterity saving throw
// (it chooses which)". "Restrained": "You have Disadvantage on Dexterity
// saving throws." "Paralyzed": "You automatically fail Strength and Dexterity
// saving throws."
import type { Condition } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import type { BattleState } from "./battle-state-execution.ts";
import type { BattleSubject } from "./index.ts";
import {
  applyCondition,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  grappleOutcomeFill,
  requireHole,
  resolveBattleSubject,
  shoveOutcomeFill,
  targetFill,
  testBattleCreatureStateWithConditions,
} from "./battle-runtime.test-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture.test-support.ts";

function goblinWith(condition: Condition): BattleState {
  const state = fighterVsGoblinBattle();
  const goblin = requireCombatant(state, goblinId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      goblinId,
      testBattleCreatureStateWithConditions(
        goblin,
        applyCondition(goblin.conditions, condition),
      ),
    ),
  };
}

const grapple: BattleSubject = {
  tag: "action",
  actorId: fighterId,
  action: "grapple",
};
const shove: BattleSubject = {
  tag: "action",
  actorId: fighterId,
  action: "shove",
};

function outcomeHole(
  state: BattleState,
  subject: BattleSubject,
  kind: "grappleOutcome" | "shoveOutcome",
) {
  const target = targetFill(
    requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    ),
    goblinId,
  );
  return {
    target,
    hole: requireHole(
      resolveBattleSubject({ state, subject, fills: [target] }),
      kind,
    ),
  };
}

const paralyzedChoices = [
  {
    ability: "str",
    targetRollModes: [],
    targetFlatBonuses: [],
    targetAutomaticFailures: [
      { targetId: goblinId, conditions: ["paralyzed"] },
    ],
  },
  {
    ability: "dex",
    targetRollModes: [],
    targetFlatBonuses: [],
    targetAutomaticFailures: [
      { targetId: goblinId, conditions: ["paralyzed"] },
    ],
  },
];

describe("Grapple and Shove saving throw choices", () => {
  test("a Restrained target has Disadvantage only if it chooses Dexterity", () => {
    const state = goblinWith("restrained");
    for (const kind of ["grappleOutcome", "shoveOutcome"] as const) {
      const { hole } = outcomeHole(
        state,
        kind === "grappleOutcome" ? grapple : shove,
        kind,
      );
      expect(hole).toMatchObject({
        targetSavingThrowChoices: [
          { ability: "str", targetRollModes: [] },
          {
            ability: "dex",
            targetRollModes: [{ targetId: goblinId, rollMode: "disadvantage" }],
          },
        ],
      });
    }
  });

  test("a Paralyzed target fails a Grapple's save whichever it chooses", () => {
    const state = goblinWith("paralyzed");
    const { target, hole } = outcomeHole(state, grapple, "grappleOutcome");
    expect(hole).toMatchObject({ targetSavingThrowChoices: paralyzedChoices });
    expect(
      resolveBattleSubject({
        state,
        subject: grapple,
        fills: [target, grappleOutcomeFill(hole, true)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: `${goblinId} automatically fails Strength and Dexterity saving throws; its outcome is a failure.`,
    });
    expect(
      resolveBattleSubject({
        state,
        subject: grapple,
        fills: [target, grappleOutcomeFill(hole, false)],
      }).tag,
    ).toBe("resolved");
  });

  test("a Paralyzed target fails a Shove's save whichever it chooses", () => {
    const state = goblinWith("paralyzed");
    const { target, hole } = outcomeHole(state, shove, "shoveOutcome");
    expect(hole).toMatchObject({ targetSavingThrowChoices: paralyzedChoices });
    expect(
      resolveBattleSubject({
        state,
        subject: shove,
        fills: [target, shoveOutcomeFill(hole, { succeeded: true })],
      }).tag,
    ).toBe("invalid");
    expect(
      resolveBattleSubject({
        state,
        subject: shove,
        fills: [
          target,
          shoveOutcomeFill(hole, {
            succeeded: false,
            failedEffect: { kind: "prone" },
          }),
        ],
      }).tag,
    ).toBe("resolved");
  });
});
