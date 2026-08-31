import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { describe, expect, test } from "vitest";

import {
  unitLibrary,
  unitMechanicsVariant,
} from "../unit-profile-admission-catalog.test-support.ts";
import { admitAtomicClassFeatureProcedure } from "./atomic-class-feature.ts";

const ROOT_MECHANICS_EVIDENCE = {
  family: "unit",
  nodes: [{ kind: "singleton", role: "recordMechanics" }],
} as const;

describe("atomic class-feature procedure admission", () => {
  test("admits the canonical delegated Bonus Action root as source-free ready facts", () => {
    expect(
      admitAtomicClassFeatureProcedure(
        unitLibrary.requireUnit("rogue_fast_hands"),
      ),
    ).toEqual({
      tag: "admitted",
      procedure: {
        binding: "ready",
        facts: {
          kind: "bonusActionDelegatedStandardActions",
          actionEconomy: {
            kind: "bonusActionDelegatedStandardActions",
            activationCost: { kind: "bonusAction" },
            sleightOfHand: {
              abilityCheck: {
                ability: "dex",
                skill: "sleight_of_hand",
              },
              operations: [
                "pick_lock_with_thieves_tools",
                "disarm_trap_with_thieves_tools",
                "pick_pocket",
              ],
            },
            objectUse: {
              actions: [
                { action: "utilize" },
                {
                  action: "magic",
                  restrictedTo: "magicItemRequiresMagicAction",
                },
              ],
            },
          },
        },
        evidence: { consumed: [ROOT_MECHANICS_EVIDENCE], unowned: [] },
      },
    });
  });

  test("admits the canonical conditional traversal root as source-free ready facts", () => {
    expect(
      admitAtomicClassFeatureProcedure(
        unitLibrary.requireUnit("monk_acrobatic_movement"),
      ),
    ).toEqual({
      tag: "admitted",
      procedure: {
        binding: "ready",
        facts: {
          kind: "acrobaticMovement",
          acrobaticMovement: {
            condition: { kind: "unarmoredUnshielded" },
            timing: "onYourTurn",
            paths: [
              {
                kind: "verticalSurface",
                path: "alongVerticalSurface",
                withoutFallingDuringMovement: true,
              },
              {
                kind: "liquid",
                path: "acrossLiquid",
                withoutFallingDuringMovement: true,
              },
            ],
          },
        },
        evidence: { consumed: [ROOT_MECHANICS_EVIDENCE], unowned: [] },
      },
    });
  });

  test.each(["rogue_fast_hands", "monk_acrobatic_movement"])(
    "%s admission is unchanged by renamed synthetic authored identity",
    (unitId) => {
      const canonical = unitLibrary.requireUnit(unitId);
      const renamed = decodeUnitRecordSync({
        ...canonical,
        id: `synthetic_${unitId}`,
        name: `Synthetic ${unitId}`,
        provenance: { kind: "synthetic-test", section: unitId },
      });

      expect(admitAtomicClassFeatureProcedure(renamed)).toEqual(
        admitAtomicClassFeatureProcedure(canonical),
      );
    },
  );

  test("rejects a represented delegated-action root with incomplete mechanics", () => {
    const canonical = unitLibrary.requireUnit("rogue_fast_hands");
    if (
      canonical.kind !== "class_feature" ||
      canonical.mechanics.family !== "bonus_action_delegated_standard_actions"
    ) {
      throw new Error("Expected delegated standard-action mechanics.");
    }
    const malformed = unitMechanicsVariant(canonical, {
      id: "synthetic_incomplete_delegated_actions",
      mechanics: {
        ...canonical.mechanics,
        sleightOfHand: {
          ...canonical.mechanics.sleightOfHand,
          operations: [
            "pick_lock_with_thieves_tools",
            "pick_pocket",
            "disarm_trap_with_thieves_tools",
          ],
        },
      },
    });

    expect(admitAtomicClassFeatureProcedure(malformed)).toEqual({
      tag: "rejected",
      issues: [
        {
          tag: "atomicClassFeatureProcedureAdmissionIssue",
          procedure: "bonusActionDelegatedStandardActions",
          failedFact: "unsupportedSleightOfHandOperations",
          mechanicsPath: ROOT_MECHANICS_EVIDENCE,
          message:
            "Unsupported delegated standard-action mechanics fact: unsupportedSleightOfHandOperations.",
        },
      ],
    });
  });

  test("rejects a represented traversal root with incomplete mechanics", () => {
    const canonical = unitLibrary.requireUnit("monk_acrobatic_movement");
    if (
      canonical.kind !== "class_feature" ||
      canonical.mechanics.family !== "acrobatic_movement"
    ) {
      throw new Error("Expected acrobatic-movement mechanics.");
    }
    const malformed = unitMechanicsVariant(canonical, {
      id: "synthetic_incomplete_conditional_traversal",
      mechanics: {
        ...canonical.mechanics,
        condition: {
          kind: "all_of",
          predicates: [{ kind: "not_wielding_shield" }],
        },
      },
    });

    expect(admitAtomicClassFeatureProcedure(malformed)).toMatchObject({
      tag: "rejected",
      issues: [
        {
          tag: "atomicClassFeatureProcedureAdmissionIssue",
          procedure: "acrobaticMovement",
          failedFact: "unsupportedEquipmentCondition",
          mechanicsPath: ROOT_MECHANICS_EVIDENCE,
        },
      ],
    });
  });

  test("accumulates every unsupported fact in one represented root", () => {
    const canonical = unitLibrary.requireUnit("monk_acrobatic_movement");
    if (
      canonical.kind !== "class_feature" ||
      canonical.mechanics.family !== "acrobatic_movement"
    ) {
      throw new Error("Expected acrobatic-movement mechanics.");
    }
    const malformed = unitMechanicsVariant(canonical, {
      id: "synthetic_multiple_unsupported_traversal_facts",
      mechanics: {
        ...canonical.mechanics,
        condition: {
          kind: "all_of",
          predicates: [{ kind: "not_wielding_shield" }],
        },
        movement: {
          ...canonical.mechanics.movement,
          timing: "synthetic_other_timing",
          liquids: {
            path: "synthetic_other_liquid_path",
            withoutFallingDuringMovement: false,
          },
        },
      },
    });

    const admission = admitAtomicClassFeatureProcedure(malformed);
    expect(admission).toMatchObject({ tag: "rejected" });
    if (admission.tag !== "rejected") {
      throw new Error("Expected rejected traversal mechanics.");
    }
    expect(admission.issues.map((issue) => issue.failedFact)).toEqual([
      "unsupportedEquipmentCondition",
      "unsupportedMovementTiming",
      "unsupportedLiquidTraversal",
    ]);
  });

  test("leaves unrelated class-feature and non-class-feature roots unowned", () => {
    expect(
      admitAtomicClassFeatureProcedure(
        unitLibrary.requireUnit("rogue_second_story_work"),
      ),
    ).toEqual({ tag: "notBattleOwned" });
    expect(
      admitAtomicClassFeatureProcedure(unitLibrary.requireUnit("mastery_sap")),
    ).toEqual({ tag: "notBattleOwned" });
  });
});
