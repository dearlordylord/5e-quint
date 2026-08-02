import { describe, expect, test } from "vitest";

import {
  battleId,
  characterSeed,
  combatantId,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  startBattleRight,
  statBlockCreatureInit,
  wizardId,
} from "../battle-runtime.test-support.ts";
import { helpAttackTargetChoices } from "./help-attack.ts";

describe("Help attack choices", () => {
  test("rejects an ally that is not currently eligible", () => {
    expect(
      helpAttackTargetChoices(
        fighterVsGoblinBattle(),
        fighterId,
        combatantId("absent-help-ally"),
      ),
    ).toEqual([]);
  });

  test("offers the remaining participant after choosing an eligible ally", () => {
    const state = startBattleRight({
      battleId: battleId("help-attack-choice-test"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 5,
        }),
      ],
    });

    expect(helpAttackTargetChoices(state, fighterId, wizardId)).toEqual([
      goblinId,
    ]);
  });
});
