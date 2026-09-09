import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import { unitId } from "@dnd/shared/game-facts";
import {
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { heldLightProfile } from "./held-light.ts";
import {
  spellDurationValuePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";

import {
  mechanicsSource,
  sourceWith,
  heldLightExplodingMaxDieAmount,
  updateHeldLightHurlOperation,
  heldLightHurlOptionalUpdates,
  expectedIssue,
} from "./support-spell-procedure-admission.test-support.js";

describe("Held-light spell procedure admission", () => {
  test("held-light ownership excludes canonical and renamed created-held-object mechanics", () => {
    const source = spellAdmissionSource(spellRecord("flame_blade"));
    const renamed = {
      ...source,
      id: unitId("synthetic_support_created_held_object"),
      name: "Synthetic Created Held Object",
    };

    expect(heldLightProfile.admitMechanics(mechanicsSource(source))).toEqual({
      tag: "notRepresented",
    });
    expect(heldLightProfile.admitMechanics(mechanicsSource(renamed))).toEqual({
      tag: "notRepresented",
    });
  });

  test("held-light keeps each exact ownership discriminant defect represented", () => {
    const durationDefect = heldLightProfile.admitMechanics(
      sourceWith("produce_flame", (mechanics) => {
        if (mechanics.duration.kind !== "timed")
          throw new Error("Expected Produce Flame timed duration.");
        return {
          ...mechanics,
          duration: {
            ...mechanics.duration,
            value: { ...mechanics.duration.value, amount: 9 },
          },
        };
      }),
    );
    expect(durationDefect).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue("heldLight", "duration", spellDurationValuePath()),
      ],
    });

    const hurlDefect = heldLightProfile.admitMechanics(
      sourceWith("produce_flame", (mechanics) =>
        updateHeldLightHurlOperation(mechanics, (operation) => {
          if (operation.effect.kind !== "attack_roll")
            throw new Error("Expected Produce Flame hurl attack.");
          return {
            ...operation,
            effect: {
              ...operation.effect,
              attackKind: "melee_spell_attack",
            },
          };
        }),
      ),
    );
    expect(hurlDefect).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "heldLight",
          "operationCount",
          spellOngoingOperationPath(PositiveInteger(2)),
        ),
        expectedIssue(
          "heldLight",
          "operation",
          spellOngoingOperationPath(PositiveInteger(1)),
        ),
        expectedIssue(
          "heldLight",
          "hurl",
          spellOngoingOperationEffectPath(PositiveInteger(1)),
        ),
      ],
    });
  });

  test.each(heldLightHurlOptionalUpdates)(
    "rejects dropped held-light hurl %s at its actual path",
    (failedFact, update, mechanicsPath) => {
      const result = heldLightProfile.admitMechanics(
        sourceWith("produce_flame", (mechanics) =>
          updateHeldLightHurlOperation(mechanics, update),
        ),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [expectedIssue("heldLight", failedFact, mechanicsPath)],
      });
    },
  );

  test("rejects held-light exploding max-die amount at the selected hurl effect", () => {
    const result = heldLightProfile.admitMechanics(
      sourceWith("produce_flame", (mechanics) =>
        updateHeldLightHurlOperation(mechanics, (operation) => {
          if (operation.effect.kind !== "attack_roll") {
            throw new Error("Expected Produce Flame hurl attack effect.");
          }
          const hitDamage = operation.effect.onHit[0];
          if (hitDamage?.kind !== "damage") {
            throw new Error("Expected Produce Flame hurl damage effect.");
          }
          return {
            ...operation,
            effect: {
              ...operation.effect,
              onHit: [{ ...hitDamage, amount: heldLightExplodingMaxDieAmount }],
            },
          };
        }),
      ),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "heldLight",
          "hurl",
          spellOngoingOperationEffectPath(PositiveInteger(2)),
        ),
      ],
    });
  });

  test("matches held light operation roles independent of authored ordering", () => {
    const result = heldLightProfile.admitMechanics(
      sourceWith("produce_flame", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        const [first, second, ...rest] = mechanics.operations;
        if (first === undefined || second === undefined) {
          throw new Error("Expected paired held-light operations.");
        }
        return {
          ...mechanics,
          operations: [second, first, ...rest],
        };
      }),
    );
    expect(result).toMatchObject({ tag: "supported" });
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence).toMatchObject({ unowned: [] });
  });
});
