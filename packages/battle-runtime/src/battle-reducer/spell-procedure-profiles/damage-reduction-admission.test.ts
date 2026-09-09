import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import { unitId } from "@dnd/shared/game-facts";
import { battleSpellExecutionSourceFromAdmission } from "../../battle-state-execution.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { spellTouchRangeFeet } from "./spell-mechanics-admission.ts";
import { damageReductionProfile } from "./damage-reduction.ts";
import {
  spellOngoingAttachmentPath,
  spellOngoingOperationEffectPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type {
  SpellMechanics,
  TargetSelection,
} from "@dnd/surface/surface/types";

import {
  mechanicsSource,
  sourceWith,
  contextFor,
  ongoingPredicate,
  expectedIssue,
  removeOngoingCharacteristicEffect,
  ensureSinglePassiveNoneOperation,
  expectDamageReductionFallbackNotRepresented,
} from "./support-spell-procedure-admission.test-support.js";

describe("Damage-reduction spell procedure admission", () => {
  test("damage-reduction ownership supports canonical and renamed Resistance", () => {
    const source = spellAdmissionSource(spellRecord("resistance"));
    const renamed = {
      ...source,
      id: unitId("synthetic_support_resistance_supported"),
      name: "Synthetic Damage Reduction Spell",
    };

    for (const candidate of [source, renamed]) {
      expect(
        damageReductionProfile.admitMechanics(mechanicsSource(candidate)),
      ).toMatchObject({ tag: "supported" });
    }
  });

  test.each([
    ["deleted", removeOngoingCharacteristicEffect],
    [
      "replaced",
      (mechanics: SpellMechanics): SpellMechanics => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        const operation = mechanics.operations[0];
        if (operation === undefined) {
          throw new Error("Expected Resistance operation.");
        }
        return {
          ...mechanics,
          operations: [{ ...operation, effect: { kind: "none" } }],
        };
      },
    ],
  ] as const)(
    "keeps %s Resistance operation mutation unsupported at its exact path",
    (_label, update) => {
      const result = damageReductionProfile.admitMechanics(
        sourceWith("resistance", update),
      );
      expect(result.tag).toBe("unsupported");
      if (result.tag !== "unsupported") return;
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expectedIssue(
            "damageReduction",
            "damage",
            spellOngoingOperationEffectPath(PositiveInteger(1)),
          ),
        ]),
      );
    },
  );

  test("damage-reduction ownership excludes a material Resistance fallback", () => {
    expectDamageReductionFallbackNotRepresented(
      (mechanics) => ({
        ...mechanics,
        components: {
          ...mechanics.components,
          m: "a synthetic material component",
        },
      }),
      "synthetic_support_resistance_material_collision",
      "Synthetic Material Resistance",
    );
  });

  test("damage-reduction ownership excludes a bonus-action Resistance fallback", () => {
    expectDamageReductionFallbackNotRepresented(
      (mechanics) => ({
        ...mechanics,
        castingTime: { kind: "bonus_action" as const },
      }),
      "synthetic_support_resistance_bonus_action_collision",
      "Synthetic Bonus Action Resistance",
    );
  });

  test("damage-reduction ownership excludes a two-minute Resistance fallback", () => {
    expectDamageReductionFallbackNotRepresented(
      (mechanics) => ({
        ...mechanics,
        duration: {
          kind: "concentration" as const,
          upTo: { amount: 2, unit: "minute" as const },
        },
      }),
      "synthetic_support_resistance_two_minute_collision",
      "Synthetic Two-Minute Resistance",
    );
  });

  test("damage-reduction ownership excludes a non-willing Resistance fallback", () => {
    expectDamageReductionFallbackNotRepresented(
      (mechanics) => {
        if (
          mechanics.family !== "ongoing_effect" ||
          mechanics.attachment.kind !== "hole" ||
          mechanics.attachment.value.kind !== "target"
        ) {
          throw new Error("Expected Resistance target attachment.");
        }
        const selection = structuredClone(mechanics.attachment.value.selection);
        Reflect.deleteProperty(selection, "disposition");
        return {
          ...mechanics,
          attachment: {
            ...mechanics.attachment,
            value: {
              ...mechanics.attachment.value,
              selection,
            },
          },
        };
      },
      "synthetic_support_resistance_non_willing_collision",
      "Synthetic Non-Willing Resistance",
    );
  });

  test("damage-reduction ownership excludes an extra passive-none Resistance fallback", () => {
    expectDamageReductionFallbackNotRepresented(
      (mechanics) => ({
        ...mechanics,
        operations: [
          {
            trigger: { kind: "passive" as const },
            effect: { kind: "none" as const },
          },
          {
            trigger: { kind: "passive" as const },
            effect: { kind: "none" as const },
          },
        ],
      }),
      "synthetic_support_resistance_extra_passive_none_collision",
      "Synthetic Extra Passive None Resistance",
    );
  });

  test.each([
    [
      "root exact keys",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        Reflect.set(updated, "syntheticRootFact", true);
        return updated;
      },
    ],
    [
      "target attachment wrapper missing label",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        if (
          updated.family === "ongoing_effect" &&
          updated.attachment.kind === "hole"
        ) {
          Reflect.deleteProperty(updated.attachment, "label");
        }
        return updated;
      },
    ],
    [
      "target attachment wrapper missing hole id",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        if (
          updated.family === "ongoing_effect" &&
          updated.attachment.kind === "hole"
        ) {
          Reflect.deleteProperty(updated.attachment, "holeId");
        }
        return updated;
      },
    ],
    [
      "target attachment value missing selection",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        if (
          updated.family === "ongoing_effect" &&
          updated.attachment.kind === "hole"
        ) {
          Reflect.deleteProperty(updated.attachment.value, "selection");
        }
        return updated;
      },
    ],
    [
      "target attachment value missing kind",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        if (
          updated.family === "ongoing_effect" &&
          updated.attachment.kind === "hole"
        ) {
          Reflect.deleteProperty(updated.attachment.value, "kind");
        }
        return updated;
      },
    ],
    [
      "level",
      (mechanics: SpellMechanics): SpellMechanics => ({
        ...mechanics,
        level: 1,
      }),
    ],
    [
      "range kind",
      (mechanics: SpellMechanics): SpellMechanics => ({
        ...mechanics,
        range: { kind: "unlimited" },
      }),
    ],
    [
      "range exact keys",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        Reflect.set(updated.range, "synthetic", true);
        return updated;
      },
    ],
    [
      "verbal component",
      (mechanics: SpellMechanics): SpellMechanics => ({
        ...mechanics,
        components: { ...mechanics.components, v: false },
      }),
    ],
    [
      "somatic component",
      (mechanics: SpellMechanics): SpellMechanics => ({
        ...mechanics,
        components: { ...mechanics.components, s: false },
      }),
    ],
    [
      "component exact keys",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        Reflect.set(updated.components, "materialCostGp", 1);
        return updated;
      },
    ],
    [
      "casting-time exact keys",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        if (updated.family === "ongoing_effect") {
          Reflect.set(updated.castingTime, "ritual", true);
        }
        return updated;
      },
    ],
    [
      "duration kind",
      (mechanics: SpellMechanics): SpellMechanics => ({
        ...mechanics,
        duration: {
          kind: "timed",
          value: { amount: 1, unit: "minute" },
        },
      }),
    ],
    [
      "duration unit",
      (mechanics: SpellMechanics): SpellMechanics => ({
        ...mechanics,
        duration: {
          kind: "concentration",
          upTo: { amount: 1, unit: "hour" },
        },
      }),
    ],
    [
      "duration exact keys",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        if (updated.duration.kind === "concentration") {
          Reflect.set(updated.duration, "earlyEnd", [
            { kind: "target_makes_attack_roll" },
          ]);
        }
        return updated;
      },
    ],
    [
      "duration value exact keys",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        if (updated.duration.kind === "concentration") {
          Reflect.set(updated.duration.upTo, "upcastTiers", [
            { atSlot: 2, amount: 1 },
          ]);
        }
        return updated;
      },
    ],
    [
      "target attachment kind",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        if (
          updated.family === "ongoing_effect" &&
          updated.attachment.kind === "hole"
        ) {
          Reflect.set(updated.attachment.value, "kind", "area");
        }
        return updated;
      },
    ],
    [
      "target attachment exact keys",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        if (updated.family === "ongoing_effect") {
          Reflect.set(updated.attachment, "rangeOrigin", "caster");
        }
        return updated;
      },
    ],
    [
      "target selection mode",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        if (
          updated.family === "ongoing_effect" &&
          updated.attachment.kind === "hole" &&
          updated.attachment.value.kind === "target"
        ) {
          Reflect.set(
            updated.attachment.value.selection,
            "mode",
            "choose_up_to",
          );
          Reflect.set(updated.attachment.value.selection, "count", 1);
        }
        return updated;
      },
    ],
    [
      "target selection count",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        if (
          updated.family === "ongoing_effect" &&
          updated.attachment.kind === "hole" &&
          updated.attachment.value.kind === "target"
        ) {
          Reflect.set(updated.attachment.value.selection, "count", 1);
        }
        return updated;
      },
    ],
    [
      "target selection target kinds",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        if (
          updated.family === "ongoing_effect" &&
          updated.attachment.kind === "hole" &&
          updated.attachment.value.kind === "target"
        ) {
          Reflect.set(updated.attachment.value.selection, "targetKinds", [
            "object",
          ]);
        }
        return updated;
      },
    ],
    [
      "target selection exact keys",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(mechanics);
        if (
          updated.family === "ongoing_effect" &&
          updated.attachment.kind === "hole" &&
          updated.attachment.value.kind === "target"
        ) {
          Reflect.set(updated.attachment.value.selection, "typeFilter", [
            "aberration",
          ]);
        }
        return updated;
      },
    ],
    [
      "operation exact keys",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(
          ensureSinglePassiveNoneOperation(mechanics),
        );
        if (updated.family !== "ongoing_effect") return updated;
        const operation = updated.operations[0];
        if (operation === undefined) return updated;
        Reflect.set(operation, "predicate", ongoingPredicate);
        Reflect.set(operation, "effect", { kind: "none" });
        Reflect.set(updated, "operations", [operation]);
        return updated;
      },
    ],
    [
      "operation trigger kind",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(
          ensureSinglePassiveNoneOperation(mechanics),
        );
        if (updated.family !== "ongoing_effect") return updated;
        const operation = updated.operations[0];
        if (operation === undefined) return updated;
        Reflect.set(operation, "effect", { kind: "none" });
        Reflect.set(operation.trigger, "kind", "on_effect_starts");
        Reflect.set(updated, "operations", [operation]);
        return updated;
      },
    ],
    [
      "operation trigger exact keys",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(
          ensureSinglePassiveNoneOperation(mechanics),
        );
        if (updated.family !== "ongoing_effect") return updated;
        const operation = updated.operations[0];
        if (operation === undefined) return updated;
        Reflect.set(operation, "effect", { kind: "none" });
        Reflect.set(operation.trigger, "synthetic", true);
        Reflect.set(updated, "operations", [operation]);
        return updated;
      },
    ],
    [
      "operation effect kind",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(
          ensureSinglePassiveNoneOperation(mechanics),
        );
        if (updated.family !== "ongoing_effect") return updated;
        const operation = updated.operations[0];
        const guidance = spellAdmissionSource(
          spellRecord("guidance"),
        ).mechanics;
        if (
          operation === undefined ||
          guidance.family !== "ongoing_effect" ||
          guidance.operations[0] === undefined
        ) {
          return updated;
        }
        Reflect.set(
          operation,
          "effect",
          structuredClone(guidance.operations[0].effect),
        );
        Reflect.set(updated, "operations", [operation]);
        return updated;
      },
    ],
    [
      "operation effect exact keys",
      (mechanics: SpellMechanics): SpellMechanics => {
        const updated = structuredClone(
          ensureSinglePassiveNoneOperation(mechanics),
        );
        if (updated.family !== "ongoing_effect") return updated;
        const operation = updated.operations[0];
        if (operation === undefined) return updated;
        Reflect.set(operation, "effect", { kind: "none", synthetic: true });
        Reflect.set(updated, "operations", [operation]);
        return updated;
      },
    ],
  ] as const)(
    "damage-reduction fallback rejects the Resistance %s envelope mutation",
    (_label, update) => {
      expectDamageReductionFallbackNotRepresented(
        update,
        "synthetic_support_resistance_fallback_envelope_mutation",
        "Synthetic Resistance Envelope Mutation",
      );
    },
  );

  test("threads the admitted damage-reduction amount, targeting, and range into execution", () => {
    const source = spellAdmissionSource(spellRecord("resistance"));
    const result = damageReductionProfile.admitMechanics(
      mechanicsSource(source),
    );
    expect(result).toMatchObject({ tag: "supported" });
    if (result.tag !== "supported") return;

    expect(result.admitted.facts).toMatchObject({
      amount: { dice: 1, dieSize: 4 },
      targeting: {
        kind: "targetList",
        minTargets: 1,
        maxTargets: 1,
        requiredTargetDisposition: "willing",
      },
      rangeFeet: spellTouchRangeFeet(),
    });
    const [invocation] = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      contextFor(source.castingSource),
    );
    expect(invocation).toBeDefined();
    if (invocation === undefined) return;
    expect(invocation.amount).toBe(result.admitted.facts.amount);
    expect(invocation.targeting).toBe(result.admitted.facts.targeting);
    expect(invocation.rangeFeet).toBe(result.admitted.facts.rangeFeet);
  });

  test.each([
    [
      "typeFilter",
      (selection: TargetSelection): TargetSelection => ({
        ...selection,
        typeFilter: ["aberration"] as const,
      }),
    ],
    [
      "stateFilter",
      (selection: TargetSelection): TargetSelection => ({
        ...selection,
        stateFilter: ["dead"] as const,
      }),
    ],
    [
      "visibility",
      (selection: TargetSelection): TargetSelection => ({
        ...selection,
        visibility: "caster_can_see" as const,
      }),
    ],
  ] as const)(
    "rejects a dropped damage-reduction target %s constraint at its attachment path",
    (failedFact, update) => {
      const result = damageReductionProfile.admitMechanics(
        sourceWith("resistance", (mechanics) => {
          if (
            mechanics.family !== "ongoing_effect" ||
            mechanics.attachment.kind !== "hole" ||
            mechanics.attachment.value.kind !== "target"
          ) {
            throw new Error("Expected Resistance target attachment.");
          }
          return {
            ...mechanics,
            attachment: {
              ...mechanics.attachment,
              value: {
                ...mechanics.attachment.value,
                selection: update(mechanics.attachment.value.selection),
              },
            },
          };
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            "damageReduction",
            failedFact,
            spellOngoingAttachmentPath(),
          ),
        ],
      });
    },
  );

  test.each([
    ["spellcastingMod", { spellcastingMod: true }],
    ["abilityModifier", { abilityModifier: "str" as const }],
  ] as const)(
    "rejects a dropped damage-reduction %s constraint at its effect path",
    (failedFact, update) => {
      const result = damageReductionProfile.admitMechanics(
        sourceWith("resistance", (mechanics) => {
          if (mechanics.family !== "ongoing_effect") return mechanics;
          const operation = mechanics.operations[0];
          if (
            operation?.effect.kind !== "reduce_damage_taken" ||
            operation.effect.amount.kind !== "fixed"
          ) {
            throw new Error("Expected Resistance fixed damage reduction.");
          }
          return {
            ...mechanics,
            operations: [
              {
                ...operation,
                effect: {
                  ...operation.effect,
                  amount: {
                    ...operation.effect.amount,
                    expr: { ...operation.effect.amount.expr, ...update },
                  },
                },
              },
            ],
          };
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            "damageReduction",
            failedFact,
            spellOngoingOperationEffectPath(PositiveInteger(1)),
          ),
        ],
      });
    },
  );
});
