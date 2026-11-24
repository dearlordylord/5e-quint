// SRD 5.2.1 "Cover": Half Cover gives +2 and Three-Quarters Cover +5 to a
// target's Dexterity saving throws. Sacred Flame: "The target gains no
// benefit from Half Cover or Three-Quarters Cover for this save."
import {
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
  battleStatBlockExecutionScopeRef,
  combatantId,
  type BattleSpellSavingThrowOutcomeHole,
} from "@dnd/battle-runtime";
import { NonNegativeInteger } from "@dnd/shared/types";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { describe, expect, it } from "vitest";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../../test-support/json-schema.ts";
import { battleInputGuidance } from "./battle-input-guidance.ts";

const actorId = combatantId("synthetic-cover-caster");
const targetId = "synthetic-cover-target";
const saveHole = {
  kind: "savingThrowOutcome",
  holeId: holeId("synthetic-cover-save"),
  holeInstanceKey: holeInstanceKey("synthetic-cover-save-instance"),
  label: "Synthetic cover save",
  sourceProcedureRef: battleProcedureExecutionRef(
    battleStatBlockExecutionScopeRef(
      battleId("synthetic-cover-guidance"),
      actorId,
      battleExecutionScopeOrdinal(0),
    ),
    NonNegativeInteger(0),
  ),
  outcomeTargeting: "singleTarget",
  ability: "dex",
  dc: { kind: "fixed", dc: 13 },
  areaChoices: [],
  targetRollModes: [],
  targetFlatBonuses: [],
} as const satisfies BattleSpellSavingThrowOutcomeHole;

function guidanceFor(hole: BattleSpellSavingThrowOutcomeHole) {
  const [guidance] = battleInputGuidance(hole);
  if (guidance === undefined) throw new Error("Expected save guidance.");
  return guidance;
}

function validateCover(hole: BattleSpellSavingThrowOutcomeHole) {
  const validate = createDraft2020JsonSchemaValidator().getValidator(
    requireJsonSchema(guidanceFor(hole).fillSchema, "Saving throw fill"),
  );
  return (cover: unknown) =>
    validate({
      kind: "savingThrowOutcome",
      holeId: hole.holeId,
      value: {
        outcomes: [
          {
            targetId,
            succeeded: true,
            d20TestRoll: { tag: "single", naturalD20: 12 },
            cover,
          },
        ],
      },
    });
}

describe("Saving throw cover guidance", () => {
  it("asks the table for each rolled target's cover on a Dexterity save", () => {
    const instructions = guidanceFor(saveHole).instructions;
    expect(
      instructions.some((instruction) =>
        instruction.startsWith("Cover adds to this Dexterity saving throw."),
      ),
    ).toBe(true);
    const validate = validateCover(saveHole);
    expect(validate("half").valid).toBe(true);
    expect(validate("threeQuarters").valid).toBe(true);
    expect(validate("total").valid).toBe(false);
  });

  it("tells the table to omit cover where it adds nothing to the save", () => {
    for (const hole of [
      { ...saveHole, ability: "con" },
      { ...saveHole, saveCover: { kind: "denied" } },
    ] as const satisfies readonly BattleSpellSavingThrowOutcomeHole[]) {
      expect(guidanceFor(hole).instructions).toContain(
        "Cover adds nothing to this saving throw. Omit cover on the outcomes.",
      );
    }
  });
});
