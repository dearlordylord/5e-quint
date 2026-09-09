import { describe, expect, test } from "vitest";
import { Result, Schema } from "effect";
import { PositiveInteger } from "@dnd/shared/types";
import { unitId } from "@dnd/shared/game-facts";
import { battleSpellExecutionSourceFromAdmission } from "../../battle-state-execution.ts";
import { spellProcedureExecution } from "../../character-execution-admission.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { rollModifierProfile } from "./roll-modifier.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";

import {
  mechanicsSource,
  commonHeaderPaths,
  sourceWith,
  contextFor,
  expectedIssue,
  removeOngoingCharacteristicEffect,
  replaceOngoingCharacteristicEffect,
  removeRollModifierCharacteristicOperation,
} from "./support-spell-procedure-admission.test-support.js";
import type {
  AreaAttachment,
  NumericRollEffect,
  OngoingEffectMechanics,
} from "./support-spell-procedure-admission.test-support.js";

describe("Roll-modifier spell procedure admission", () => {
  test("roll-modifier ownership excludes canonical and renamed condition-immunity turn-start temporary-hit-point mechanics", () => {
    const source = spellAdmissionSource(spellRecord("heroism"));
    const renamed = {
      ...source,
      id: unitId("synthetic_support_condition_immunity_turn_start_temp_hp"),
      name: "Synthetic Courage Ward",
    };

    expect(rollModifierProfile.admitMechanics(mechanicsSource(source))).toEqual(
      { tag: "notRepresented" },
    );
    expect(
      rollModifierProfile.admitMechanics(mechanicsSource(renamed)),
    ).toEqual({ tag: "notRepresented" });
  });

  test.each([
    "bless",
    "guidance",
    "bane",
    "enhance_ability",
    "pass_without_trace",
  ] as const)(
    "keeps renamed %s roll-modifier mechanics owned by Surface shape",
    (spellId) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const renamed = {
        ...source,
        id: unitId(`synthetic_support_${spellId}_roll_modifier_owner`),
        name: "Synthetic Roll Modifier",
      };
      expect(
        rollModifierProfile.admitMechanics(mechanicsSource(renamed)),
      ).toMatchObject({ tag: "supported" });
    },
  );

  test("rejects an empty roll-modifier skill choice at the execution codec boundary", () => {
    const source = spellAdmissionSource(spellRecord("guidance"));
    const result = rollModifierProfile.admitMechanics(mechanicsSource(source));
    expect(result).toMatchObject({ tag: "supported" });
    if (result.tag !== "supported") return;
    const [invocation] = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      contextFor(source.castingSource),
    );
    expect(invocation).toBeDefined();
    if (
      invocation === undefined ||
      invocation.effect.kind !== "d20RollModifier"
    ) {
      return;
    }
    const decodeInvocation = Schema.decodeUnknownResult(
      rollModifierProfile.executionSchema,
    );
    const execution = spellProcedureExecution(invocation);
    expect(Result.isSuccess(decodeInvocation(execution))).toBe(true);
    const malformedInvocation = {
      ...execution,
      effect: {
        ...execution.effect,
        skillFilter: { kind: "choice", options: [] },
      },
    };
    expect(Result.isFailure(decodeInvocation(malformedInvocation))).toBe(true);
  });

  test("direct roll-modifier inspection keeps deleted Guidance unsupported at its exact operation path", () => {
    const result = rollModifierProfile.admitMechanics(
      sourceWith("guidance", removeOngoingCharacteristicEffect),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "operationCount",
          spellOngoingOperationPath(PositiveInteger(1)),
        ),
        expectedIssue(
          "rollModifier",
          "operation",
          spellOngoingOperationEffectPath(PositiveInteger(1)),
        ),
        expectedIssue(
          "rollModifier",
          "effect",
          spellOngoingOperationEffectPath(PositiveInteger(1)),
        ),
      ],
    });
  });

  test("keeps Pass without Trace characteristic-only deletion at the inferred vacant ordinal", () => {
    const result = rollModifierProfile.admitMechanics(
      sourceWith(
        "pass_without_trace",
        removeRollModifierCharacteristicOperation,
      ),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "operation",
          spellOngoingOperationEffectPath(PositiveInteger(2)),
        ),
        expectedIssue(
          "rollModifier",
          "effect",
          spellOngoingOperationEffectPath(PositiveInteger(2)),
        ),
      ],
    });
    expect(
      rollModifierProfile.admitMechanics(
        sourceWith("pass_without_trace", removeOngoingCharacteristicEffect),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test.each([
    "bless",
    "guidance",
    "enhance_ability",
    "pass_without_trace",
  ] as const)(
    "keeps replaced %s roll-modifier mechanics represented at the characteristic effect path",
    (spellId) => {
      const source = sourceWith(spellId, replaceOngoingCharacteristicEffect);
      const renamedSource = {
        ...spellAdmissionSource(spellRecord(spellId)),
        id: unitId(`synthetic_support_${spellId}_replaced_roll_modifier`),
        name: "Synthetic Replaced Roll Modifier",
        mechanics: source.mechanics,
        spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
      };
      for (const candidate of [source, mechanicsSource(renamedSource)]) {
        const result = rollModifierProfile.admitMechanics(candidate);
        expect(result.tag).toBe("unsupported");
        if (result.tag !== "unsupported") continue;
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expectedIssue(
              "rollModifier",
              "effect",
              spellOngoingOperationEffectPath(PositiveInteger(1)),
            ),
          ]),
        );
      }
    },
  );

  test("keeps reordered Pass without Trace replacement at the actual characteristic ordinal", () => {
    const result = rollModifierProfile.admitMechanics(
      sourceWith("pass_without_trace", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        const [rollModifier, movementTrace, ...rest] = mechanics.operations;
        if (rollModifier === undefined || movementTrace === undefined) {
          throw new Error("Expected paired roll-modifier operations.");
        }
        return replaceOngoingCharacteristicEffect({
          ...mechanics,
          operations: [movementTrace, rollModifier, ...rest],
        });
      }),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "operationCount",
          spellOngoingOperationPath(PositiveInteger(2)),
        ),
        expectedIssue(
          "rollModifier",
          "operation",
          spellOngoingOperationEffectPath(PositiveInteger(2)),
        ),
        expectedIssue(
          "rollModifier",
          "effect",
          spellOngoingOperationEffectPath(PositiveInteger(2)),
        ),
      ],
    });
  });

  test("closes every structural layer of the effect-missing roll-modifier envelope", () => {
    const updates: readonly [
      label: string,
      update: (mechanics: OngoingEffectMechanics) => void,
    ][] = [
      ["root", (mechanics) => Reflect.set(mechanics, "syntheticRoot", true)],
      [
        "casting time",
        (mechanics) => Reflect.set(mechanics.castingTime, "ritual", true),
      ],
      [
        "components",
        (mechanics) => Reflect.set(mechanics.components, "materialCostGp", 1),
      ],
      ["range", (mechanics) => Reflect.set(mechanics.range, "feet", 5)],
      [
        "duration",
        (mechanics) => Reflect.set(mechanics.duration, "earlyEnd", []),
      ],
      [
        "duration value",
        (mechanics) => {
          if (mechanics.duration.kind !== "concentration") return;
          Reflect.set(mechanics.duration.upTo, "syntheticUnit", true);
        },
      ],
      [
        "attachment",
        (mechanics) => Reflect.set(mechanics.attachment, "synthetic", true),
      ],
      [
        "selection",
        (mechanics) => {
          if (
            mechanics.attachment.kind !== "hole" ||
            mechanics.attachment.value.kind !== "target"
          ) {
            return;
          }
          Reflect.set(
            mechanics.attachment.value.selection,
            "repeatsAllowed",
            true,
          );
        },
      ],
      [
        "operation",
        (mechanics) => Reflect.set(mechanics.operations[0], "predicate", {}),
      ],
      [
        "trigger",
        (mechanics) =>
          Reflect.set(
            mechanics.operations[0]?.trigger ?? {},
            "synthetic",
            true,
          ),
      ],
      [
        "effect",
        (mechanics) =>
          Reflect.set(mechanics.operations[0]?.effect ?? {}, "synthetic", true),
      ],
      [
        "operation cardinality",
        (mechanics) => {
          const operation = mechanics.operations[0];
          if (operation !== undefined) {
            Reflect.set(mechanics, "operations", [
              ...mechanics.operations,
              operation,
            ]);
          }
        },
      ],
    ];

    for (const [label, update] of updates) {
      const source = sourceWith("guidance", (mechanics) => {
        const replaced = replaceOngoingCharacteristicEffect(mechanics);
        if (replaced.family !== "ongoing_effect") return replaced;
        const updated = structuredClone(replaced);
        update(updated);
        return updated;
      });
      expect(rollModifierProfile.admitMechanics(source), label).toEqual({
        tag: "notRepresented",
      });
    }
  });

  test("reports Pass without Trace movement-trace suppression as exact unowned mechanics", () => {
    const result = rollModifierProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(spellRecord("pass_without_trace"))),
    );

    expect(result).toMatchObject({ tag: "supported" });
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence).toEqual({
      consumed: [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
      ],
      unowned: [
        spellOngoingOperationPath(PositiveInteger(2)),
        spellOngoingOperationEffectPath(PositiveInteger(2)),
      ],
    });
  });

  test("tracks Pass without Trace ownership by effect shape after authored reordering", () => {
    const result = rollModifierProfile.admitMechanics(
      sourceWith("pass_without_trace", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        const [rollBonus, movementTrace, ...rest] = mechanics.operations;
        if (rollBonus === undefined || movementTrace === undefined) {
          throw new Error("Expected Pass without Trace operation pair.");
        }
        return {
          ...mechanics,
          operations: [movementTrace, rollBonus, ...rest],
        };
      }),
    );

    expect(result).toMatchObject({ tag: "supported" });
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence).toMatchObject({
      consumed: [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(2)),
        spellOngoingOperationEffectPath(PositiveInteger(2)),
      ],
      unowned: [
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
      ],
    });
  });

  test.each([
    [
      "weaponFilter",
      (effect: NumericRollEffect) => ({
        ...effect,
        weaponFilter: { kind: "weapon_property", property: "finesse" },
      }),
    ],
    [
      "abilityFilter",
      (effect: NumericRollEffect) => ({
        ...effect,
        abilityFilter: ["str"] as const,
      }),
    ],
    ["count", (effect: NumericRollEffect) => ({ ...effect, count: 1 })],
  ] as const)(
    "rejects a dropped roll-modifier numeric %s constraint at its effect path",
    (failedFact, update) => {
      const result = rollModifierProfile.admitMechanics(
        sourceWith("bless", (mechanics) => {
          if (mechanics.family !== "ongoing_effect") return mechanics;
          const updated = structuredClone(mechanics);
          const operation = updated.operations[0];
          if (operation?.effect.kind !== "modify_roll_numeric") {
            throw new Error("Expected Bless numeric roll-modifier effect.");
          }
          Reflect.set(operation, "effect", update(operation.effect));
          Reflect.set(updated, "operations", [operation]);
          return updated;
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            "rollModifier",
            failedFact,
            spellOngoingOperationEffectPath(PositiveInteger(1)),
          ),
        ],
      });
    },
  );

  test.each([
    [
      "selection",
      (attachment: AreaAttachment): AreaAttachment => ({
        ...attachment,
        selection: { mode: "one", targetKinds: ["creature"] },
      }),
    ],
    [
      "occupantDispositionFilter",
      (attachment: AreaAttachment): AreaAttachment => ({
        ...attachment,
        occupantDispositionFilter: "friendly_to_source",
      }),
    ],
    [
      "occupantPerceptionFilter",
      (attachment: AreaAttachment): AreaAttachment => ({
        ...attachment,
        occupantPerceptionFilter: "can_see_area_effect",
      }),
    ],
    [
      "excludedAreas",
      (attachment: AreaAttachment): AreaAttachment => ({
        ...attachment,
        excludedAreas: { chooser: "caster", count: "one_or_more", size: "any" },
      }),
    ],
    [
      "rangeOrigin",
      (attachment: AreaAttachment): AreaAttachment => ({
        ...attachment,
        rangeOrigin: "caster",
      }),
    ],
  ] as const)(
    "rejects dropped roll-modifier area %s semantics at the attachment path",
    (failedFact, update) => {
      const result = rollModifierProfile.admitMechanics(
        sourceWith("pass_without_trace", (mechanics) => {
          if (mechanics.family !== "ongoing_effect") return mechanics;
          if (mechanics.attachment.kind !== "area") {
            throw new Error("Expected Pass Without Trace area attachment.");
          }
          return { ...mechanics, attachment: update(mechanics.attachment) };
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            "rollModifier",
            failedFact,
            spellOngoingAttachmentPath(),
          ),
        ],
      });
    },
  );

  test("selects the semantic roll-modifier save gate and reports a prepended sibling ordinal", () => {
    const result = rollModifierProfile.admitMechanics(
      sourceWith("bane", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const phase = mechanics.phases[0];
        if (phase?.kind !== "save_gate") {
          throw new Error("Expected Bane save gate.");
        }
        return {
          ...mechanics,
          phases: [{ ...phase, onFail: { kind: "none" } }, phase],
        };
      }),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(1)),
        ),
      ],
    });
  });

  test("keeps malformed roll-modifier owners represented for typed rejection", () => {
    const ongoingResult = rollModifierProfile.admitMechanics(
      sourceWith("bless", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        const operation = mechanics.operations[0];
        if (operation?.effect.kind !== "modify_roll_numeric") {
          throw new Error("Expected Bless numeric roll-modifier effect.");
        }
        return {
          ...mechanics,
          operations: [
            {
              ...operation,
              effect: {
                ...operation.effect,
                delta: {
                  kind: "ability_modifier",
                  ability: "str",
                  sign: "+",
                },
              },
            },
          ],
        };
      }),
    );
    expect(ongoingResult).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "effect",
          spellOngoingOperationEffectPath(PositiveInteger(1)),
        ),
      ],
    });

    const missingEffectResult = rollModifierProfile.admitMechanics(
      sourceWith("bane", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const phase = mechanics.phases[0];
        if (phase?.kind !== "save_gate") {
          throw new Error("Expected numeric save-penalty gate.");
        }
        return {
          ...mechanics,
          phases: [{ ...phase, onFail: { kind: "none" } }],
        };
      }),
    );
    expect(missingEffectResult).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "effect",
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        ),
      ],
    });

    const omittedBaseLevelSource = sourceWith("bane", (mechanics) => {
      if (mechanics.family !== "activation") return mechanics;
      const updated = structuredClone(mechanics);
      const phase = updated.phases[0];
      if (
        phase?.kind !== "save_gate" ||
        phase.attachment.kind !== "hole" ||
        phase.attachment.value.kind !== "target" ||
        phase.attachment.value.selection.mode !== "choose_up_to" ||
        typeof phase.attachment.value.selection.count !== "object" ||
        phase.attachment.value.selection.count.kind !== "linear"
      ) {
        throw new Error("Expected slot-scaled numeric save-penalty targeting.");
      }
      Reflect.deleteProperty(
        phase.attachment.value.selection.count,
        "baseLevel",
      );
      Reflect.set(phase, "onFail", { kind: "none" });
      return updated;
    });
    const renamedOmittedBaseLevelSource = {
      ...spellAdmissionSource(spellRecord("bane")),
      id: unitId("synthetic_support_omitted_base_level_save_penalty"),
      name: "Synthetic Omitted Base Level Save Penalty",
      mechanics: omittedBaseLevelSource.mechanics,
      spellDefinitionRuleFacts: omittedBaseLevelSource.spellDefinitionRuleFacts,
    };
    for (const source of [
      omittedBaseLevelSource,
      mechanicsSource(renamedOmittedBaseLevelSource),
    ]) {
      expect(rollModifierProfile.admitMechanics(source)).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            "rollModifier",
            "effect",
            spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
          ),
        ],
      });
    }

    const independentlyMalformedResult = rollModifierProfile.admitMechanics(
      sourceWith("bane", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const updated = structuredClone(mechanics);
        const phase = updated.phases[0];
        if (phase?.kind !== "save_gate") {
          throw new Error("Expected numeric save-penalty gate.");
        }
        Reflect.set(updated, "castingTime", { kind: "bonus_action" });
        Reflect.set(updated, "duration", { kind: "permanent" });
        Reflect.set(phase, "attachment", { kind: "object", count: 1 });
        Reflect.set(updated, "phases", [phase]);
        return updated;
      }),
    );
    expect(independentlyMalformedResult).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "castingTime",
          spellMechanicsHeaderPath("castingTime"),
        ),
        expectedIssue("rollModifier", "duration", spellDurationValuePath()),
        expectedIssue(
          "rollModifier",
          "attachment",
          spellActivationAttachmentPath(PositiveInteger(1)),
        ),
      ],
    });
  });
});
