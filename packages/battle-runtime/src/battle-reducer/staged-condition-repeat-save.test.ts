import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { Index, Round } from "@dnd/shared/types";
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { battleProcedureExecutionRefForTest } from "../battle-runtime.test-support.ts";
import { battleStartTurnOccurrenceId, combatantId } from "../identity.ts";
import {
  saveGatedConditionDamageOccurrenceKeyForAttackResume,
  saveGatedConditionDamageOccurrenceKeyForChainedSpellStep,
  saveGatedConditionDamageOccurrenceKeyForHole,
  saveGatedConditionDamageOccurrenceKeyForHoleTarget,
  saveGatedConditionDamageOccurrenceKeyForStartTurn,
} from "./staged-condition-repeat-save.ts";

describe("save-gated condition damage occurrence identity", () => {
  test("constructor families cannot collide when their legacy delimiter text matches", () => {
    const holeFamily = saveGatedConditionDamageOccurrenceKeyForHole(
      holeId("damage:target"),
    );
    const holeTargetFamily = saveGatedConditionDamageOccurrenceKeyForHoleTarget(
      {
        holeId: holeId("damage"),
        targetId: combatantId("target"),
      },
    );
    const chainedFamily =
      saveGatedConditionDamageOccurrenceKeyForChainedSpellStep({
        sourceProcedureRef: battleProcedureExecutionRefForTest("damage"),
        stepIndex: Index(1),
        targetId: combatantId("target"),
      });
    const startTurnFamily = saveGatedConditionDamageOccurrenceKeyForStartTurn({
      actorId: combatantId("damage"),
      round: Round(1),
      occurrenceId: battleStartTurnOccurrenceId("target"),
    });
    const attackResumeFamily =
      saveGatedConditionDamageOccurrenceKeyForAttackResume({
        sourceProcedureRef: battleProcedureExecutionRefForTest("damage:1"),
        targetId: combatantId("target"),
      });

    expect(
      new Set([
        holeFamily,
        holeTargetFamily,
        chainedFamily,
        startTurnFamily,
        attackResumeFamily,
      ]).size,
    ).toBe(5);
  });

  test("all constructor families remain disjoint for arbitrary delimiter-rich components", () => {
    const identityText = fc
      .array(fc.constantFrom("a", "b", ":", "%"), {
        minLength: 1,
        maxLength: 30,
      })
      .map((characters) => characters.join(""));

    fc.assert(
      fc.property(identityText, identityText, (holeText, targetText) => {
        const holeFamily = saveGatedConditionDamageOccurrenceKeyForHole(
          holeId(`${holeText}:${targetText}`),
        );
        const holeTargetFamily =
          saveGatedConditionDamageOccurrenceKeyForHoleTarget({
            holeId: holeId(holeText),
            targetId: combatantId(targetText),
          });
        const chainedFamily =
          saveGatedConditionDamageOccurrenceKeyForChainedSpellStep({
            sourceProcedureRef: battleProcedureExecutionRefForTest(holeText),
            stepIndex: Index(1),
            targetId: combatantId(targetText),
          });
        const startTurnFamily =
          saveGatedConditionDamageOccurrenceKeyForStartTurn({
            actorId: combatantId(holeText),
            round: Round(1),
            occurrenceId: battleStartTurnOccurrenceId(targetText),
          });
        const attackResumeFamily =
          saveGatedConditionDamageOccurrenceKeyForAttackResume({
            sourceProcedureRef: battleProcedureExecutionRefForTest(holeText),
            targetId: combatantId(targetText),
          });

        expect(
          new Set([
            holeFamily,
            holeTargetFamily,
            chainedFamily,
            startTurnFamily,
            attackResumeFamily,
          ]).size,
        ).toBe(5);
      }),
    );
  });

  test("length framing separates delimiter-rich component boundaries", () => {
    const delimiterInHole = saveGatedConditionDamageOccurrenceKeyForHoleTarget({
      holeId: holeId("damage:event"),
      targetId: combatantId("target"),
    });
    const delimiterInTarget =
      saveGatedConditionDamageOccurrenceKeyForHoleTarget({
        holeId: holeId("damage"),
        targetId: combatantId("event:target"),
      });

    expect(delimiterInHole).not.toBe(delimiterInTarget);
  });
});
