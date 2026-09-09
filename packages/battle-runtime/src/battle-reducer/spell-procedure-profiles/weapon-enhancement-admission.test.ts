import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import {
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { spellRecord } from "../../unit-profile-admission-spell-record.test-support.ts";
import { weaponAttackDamageEnhancementProfile } from "./weapon-attack-enhancement.ts";

import {
  mechanicsSourceWithBaseDefinitionFacts,
  issuesOf,
} from "./ongoing-spell-procedure-admission.test-support.js";

describe("Weapon-enhancement spell procedure admission", () => {
  test("reports deleted and replaced weapon-enhancement attachments at the exact path", () => {
    const base = spellRecord("magic_weapon");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const deletedAttachment = { ...base.mechanics };
    Reflect.deleteProperty(deletedAttachment, "attachment");
    const replacedAttachment = Object.defineProperty(
      { ...base.mechanics },
      "attachment",
      {
        configurable: true,
        enumerable: true,
        value: { kind: "self" },
        writable: true,
      },
    );
    for (const mechanics of [deletedAttachment, replacedAttachment]) {
      const result = weaponAttackDamageEnhancementProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual([
        {
          failedFact: "attachment",
          mechanicsPath: spellOngoingAttachmentPath(),
        },
      ]);
    }
  });

  test("retains weapon-enhancement ownership when its characteristic operation or effect is absent", () => {
    const base = spellRecord("magic_weapon");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const operation = base.mechanics.operations[0];
    if (operation === undefined) {
      throw new Error("Expected a weapon-enhancement operation.");
    }
    const deletedEffect = { ...operation };
    Reflect.deleteProperty(deletedEffect, "effect");
    const replacedEffect = Object.defineProperty({ ...operation }, "effect", {
      configurable: true,
      enumerable: true,
      value: { kind: "none" },
      writable: true,
    });
    const deletedOperationMechanics = { ...base.mechanics };
    Reflect.set(deletedOperationMechanics, "operations", []);
    const expectUnsupportedIssues = (
      mechanics: ReturnType<typeof spellRecord>["mechanics"],
      issues: ReturnType<typeof issuesOf>,
    ) => {
      const result = weaponAttackDamageEnhancementProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual(issues);
    };
    expectUnsupportedIssues(deletedOperationMechanics, [
      {
        failedFact: "operationCount",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
      },
      {
        failedFact: "operation",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
      },
      {
        failedFact: "enhancementEffect",
        mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
      },
      {
        failedFact: "enhancementBonus",
        mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
      },
    ]);
    for (const effectlessOperation of [deletedEffect, replacedEffect]) {
      expectUnsupportedIssues(
        { ...base.mechanics, operations: [effectlessOperation] },
        [
          {
            failedFact: "enhancementEffect",
            mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
          },
          {
            failedFact: "enhancementBonus",
            mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
          },
        ],
      );
    }
  });

  test("reports malformed weapon-enhancement operation, effect, and bonus branches exactly", () => {
    const base = spellRecord("magic_weapon");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const operation = base.mechanics.operations[0];
    if (
      operation === undefined ||
      operation.effect.kind !== "grant_weapon_attack_enhancement"
    ) {
      throw new Error("Expected a weapon-enhancement operation.");
    }
    const malformedOperation = Object.defineProperty(
      { ...operation },
      "syntheticUnexpectedField",
      {
        configurable: true,
        enumerable: true,
        value: true,
        writable: true,
      },
    );
    const malformedEffect = Object.defineProperty(
      { ...operation.effect },
      "syntheticUnexpectedField",
      {
        configurable: true,
        enumerable: true,
        value: true,
        writable: true,
      },
    );
    const malformedBonus = Object.defineProperty(
      { ...operation.effect.bonus },
      "syntheticUnexpectedField",
      {
        configurable: true,
        enumerable: true,
        value: true,
        writable: true,
      },
    );
    const cases = [
      {
        operation: malformedOperation,
        issues: [
          {
            failedFact: "operation",
            mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
          },
        ],
      },
      {
        operation: { ...operation, effect: malformedEffect },
        issues: [
          {
            failedFact: "enhancementEffect",
            mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
          },
          {
            failedFact: "enhancementBonus",
            mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
          },
        ],
      },
      {
        operation: {
          ...operation,
          effect: { ...operation.effect, bonus: malformedBonus },
        },
        issues: [
          {
            failedFact: "enhancementBonus",
            mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
          },
        ],
      },
    ];
    for (const variant of cases) {
      const result = weaponAttackDamageEnhancementProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, {
          ...base.mechanics,
          operations: [variant.operation],
        }),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual(variant.issues);
    }
  });

  test("selects a weapon-enhancement operation by semantics and reports its sibling", () => {
    const base = spellRecord("magic_weapon");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const operation = base.mechanics.operations[0];
    if (operation === undefined) {
      throw new Error("Expected a weapon-enhancement operation.");
    }
    const result = weaponAttackDamageEnhancementProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, {
        ...base.mechanics,
        operations: [
          { trigger: { kind: "passive" }, effect: { kind: "none" } },
          operation,
        ],
      }),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "operationCount",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
      },
    ]);
  });

  test("rejects typed weapon-enhancement root branches while retaining ownership", () => {
    const base = spellRecord("magic_weapon");
    const initialPhaseSource = spellRecord("spiritual_weapon");
    const conditionalSource = spellRecord("phantasmal_force");
    if (
      base.mechanics.family !== "ongoing_effect" ||
      initialPhaseSource.mechanics.family !== "ongoing_effect" ||
      initialPhaseSource.mechanics.initialPhase === undefined ||
      conditionalSource.mechanics.family !== "ongoing_effect" ||
      conditionalSource.mechanics.authoredConditionalMechanics?.[0] ===
        undefined
    ) {
      throw new Error("Expected typed ongoing root branch fixtures.");
    }
    const expectUnsupportedIssue = (
      mechanics: ReturnType<typeof spellRecord>["mechanics"],
      issue: ReturnType<typeof issuesOf>[number],
    ) => {
      const result = weaponAttackDamageEnhancementProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual([issue]);
    };
    expectUnsupportedIssue(
      {
        ...base.mechanics,
        initialPhase: initialPhaseSource.mechanics.initialPhase,
      },
      {
        failedFact: "initialPhase",
        mechanicsPath: spellOngoingInitialPhasePath(),
      },
    );
    expectUnsupportedIssue(
      {
        ...base.mechanics,
        authoredConditionalMechanics: [
          conditionalSource.mechanics.authoredConditionalMechanics[0],
        ],
      },
      {
        failedFact: "authoredConditionalMechanics",
        mechanicsPath: spellMechanicsRootPath(),
      },
    );
  });
});
