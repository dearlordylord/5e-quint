import { describe, expect, it } from "vitest";
import { initiativeDurationRounds } from "@dnd/shared-algebras/elapsed-time-algebra";

import {
  addEffect,
  applyCondition,
  freshCreature,
  removeEffect,
} from "#/battle-machine-creature.ts";
import { CreatureId } from "#/types.ts";

describe("battle-machine-creature conditional grants", () => {
  it("keeps conditions from another active Sting source when one source ends", () => {
    let target = freshCreature(20, "PC");
    target = addEffect(
      target,
      "monster:A:sting",
      initiativeDurationRounds(600),
      "end",
      CreatureId("A"),
      {
        expiryOwnerId: CreatureId("B"),
        grantedConditions: ["poisoned"],
        conditionalGrantedConditions: [
          {
            condition: "unconscious",
            whileCondition: "poisoned",
            endsEarlyOnDamage: true,
            endsEarlyOnWakeActionWithinFeet: 5,
          },
        ],
      },
    );
    target = applyCondition(applyCondition(target, "poisoned"), "unconscious");
    target = addEffect(
      target,
      "monster:C:sting",
      initiativeDurationRounds(600),
      "end",
      CreatureId("C"),
      {
        expiryOwnerId: CreatureId("B"),
        grantedConditions: ["poisoned"],
        conditionalGrantedConditions: [
          {
            condition: "unconscious",
            whileCondition: "poisoned",
            endsEarlyOnDamage: true,
            endsEarlyOnWakeActionWithinFeet: 5,
          },
        ],
      },
    );
    target = applyCondition(applyCondition(target, "poisoned"), "unconscious");

    const updated = removeEffect(target, "monster:A:sting");

    expect(updated.poisoned).toBe(true);
    expect(updated.unconscious).toBe(true);
    expect(updated.activeEffects).toHaveLength(1);
    expect(updated.activeEffects[0]?.spellId).toBe("monster:C:sting");
  });
});
