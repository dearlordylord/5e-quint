// SRD 5.2.1 Unarmed Strike: the target "must succeed on a Strength or
// Dexterity saving throw (it chooses which)". Paralyzed: "You automatically
// fail Strength and Dexterity saving throws."
import { combatantId, type BattleHole } from "@dnd/battle-runtime";
import { difficultyClass } from "@dnd/shared/types";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { describe, expect, it } from "vitest";
import { battleInputGuidance } from "./battle-input-guidance.ts";

type ShoveOutcomeHole = Extract<BattleHole, { readonly kind: "shoveOutcome" }>;

const actorId = combatantId("synthetic-shove-actor");
const targetId = combatantId("synthetic-shove-target");
const choose =
  "The target chooses a Strength or a Dexterity saving throw. Roll the save it chooses with that choice's roll mode and bonuses from targetSavingThrowChoices; a choice whose targetAutomaticFailures lists the target fails without rolling.";
const failBoth =
  "The target automatically fails both the Strength and the Dexterity saving throw, because of the conditions in targetSavingThrowChoices. Give succeeded false.";

function choices(
  paralyzed: boolean,
): ShoveOutcomeHole["targetSavingThrowChoices"] {
  const targetAutomaticFailures = paralyzed
    ? [{ targetId, conditions: ["paralyzed"] as const }]
    : [];
  return [
    {
      ability: "str",
      targetRollModes: [],
      targetFlatBonuses: [],
      targetAutomaticFailures,
    },
    {
      ability: "dex",
      targetRollModes: [],
      targetFlatBonuses: [],
      targetAutomaticFailures,
    },
  ];
}

function shoveHole(paralyzed: boolean): ShoveOutcomeHole {
  return {
    kind: "shoveOutcome",
    holeId: holeId("synthetic-shove"),
    holeInstanceKey: holeInstanceKey("synthetic-shove-instance"),
    label: "Synthetic shove",
    actorId,
    targetId,
    dc: difficultyClass(12),
    targetSavingThrowChoices: choices(paralyzed),
  };
}

function instructions(hole: BattleHole) {
  const [guidance] = battleInputGuidance(hole);
  if (guidance === undefined) throw new Error("Expected save guidance.");
  return guidance.instructions;
}

describe("Strength-or-Dexterity save guidance", () => {
  it("tells the table the Shove target chooses its save", () => {
    expect(instructions(shoveHole(false))).toContain(choose);
    expect(instructions(shoveHole(false))).not.toContain(failBoth);
  });

  it("tells the table a target failing both saves fails the Grapple", () => {
    const hole = {
      ...shoveHole(true),
      kind: "grappleOutcome",
      mode: "grappleSave",
    } as const;
    expect(instructions(hole)).toContain(failBoth);
    expect(instructions(hole)).not.toContain(choose);
  });
});
