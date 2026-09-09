import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import { unitId } from "@dnd/shared/game-facts";
import {
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { damageReductionProfile } from "./damage-reduction.ts";
import { heldLightProfile } from "./held-light.ts";
import { linkedDefenseResistanceDamageShareProfile } from "./linked-defense-damage-share-profile.ts";
import { movableLightManifestationProfile } from "./movable-illumination-manifestation.ts";
import { rollModifierProfile } from "./roll-modifier.ts";
import { scalarBuffProfile } from "./scalar-buff.ts";
import { seeInvisibleObserverSightProfile } from "./see-invisible-observer-sight.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { TargetSelection } from "@dnd/surface/surface/types";
import {
  mechanicsSource,
  sourceWith,
  authoredConditionalMechanic,
  ongoingOperationUpdates,
  saveGateOptionalUpdates,
  expectedIssue,
  damageReductionMultiIssueUpdate,
  rollModifierMultiIssueUpdate,
  scalarBuffMultiIssueUpdate,
  seeInvisibleMultiIssueUpdate,
  heldLightMultiIssueUpdate,
  appendOngoingNoop,
  appendActivationPhase,
} from "./support-spell-procedure-admission.test-support.js";

describe("Support profile admission issue paths", () => {
  test("effect-present malformed duration remains a typed unsupported result", () => {
    const source = spellAdmissionSource(spellRecord("resistance"));
    if (source.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Resistance ongoing-effect mechanics.");
    }
    const mechanics = structuredClone(source.mechanics);
    Reflect.set(mechanics.duration, "upTo", undefined);
    const renamed = {
      ...source,
      id: unitId("synthetic_support_resistance_malformed_effect_duration"),
      name: "Synthetic Malformed Resistance Duration",
      mechanics,
      spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
    };

    expect(() =>
      damageReductionProfile.admitMechanics(mechanicsSource(renamed)),
    ).not.toThrow();
    expect(
      damageReductionProfile.admitMechanics(mechanicsSource(renamed)),
    ).toMatchObject({
      tag: "unsupported",
      issues: expect.arrayContaining([
        expectedIssue("damageReduction", "duration", spellDurationValuePath()),
      ]),
    });
  });

  test.each([
    [
      "damage reduction",
      "resistance",
      damageReductionProfile,
      damageReductionMultiIssueUpdate,
      [
        expectedIssue(
          "damageReduction",
          "level",
          spellMechanicsHeaderPath("level"),
        ),
        expectedIssue(
          "damageReduction",
          "range",
          spellMechanicsHeaderPath("range"),
        ),
      ],
    ],
    [
      "roll modifier",
      "bless",
      rollModifierProfile,
      rollModifierMultiIssueUpdate,
      [
        expectedIssue("rollModifier", "duration", spellDurationValuePath()),
        expectedIssue(
          "rollModifier",
          "range",
          spellMechanicsHeaderPath("range"),
        ),
      ],
    ],
    [
      "scalar buff",
      "longstrider",
      scalarBuffProfile,
      scalarBuffMultiIssueUpdate,
      [
        expectedIssue(
          "scalarBuff",
          "castingTime",
          spellMechanicsHeaderPath("castingTime"),
        ),
        expectedIssue("scalarBuff", "range", spellMechanicsHeaderPath("range")),
      ],
    ],
    [
      "see invisible",
      "see_invisibility",
      seeInvisibleObserverSightProfile,
      seeInvisibleMultiIssueUpdate,
      [
        expectedIssue(
          "seeInvisibleObserverSight",
          "level",
          spellMechanicsHeaderPath("level"),
        ),
        expectedIssue(
          "seeInvisibleObserverSight",
          "range",
          spellMechanicsHeaderPath("range"),
        ),
      ],
    ],
    [
      "held light",
      "produce_flame",
      heldLightProfile,
      heldLightMultiIssueUpdate,
      [
        expectedIssue("heldLight", "range", spellMechanicsHeaderPath("range")),
        expectedIssue("heldLight", "duration", spellDurationValuePath()),
      ],
    ],
  ] as const)(
    "accumulates exact multi-issue failures for %s",
    (_label, spellId, profile, update, issues) => {
      const result = profile.admitMechanics(sourceWith(spellId, update));
      expect(result).toEqual({ tag: "unsupported", issues });
    },
  );

  test.each([
    [
      "damage reduction",
      "resistance",
      damageReductionProfile,
      appendOngoingNoop,
      "damageReduction",
      "operationCount",
      spellOngoingOperationPath(PositiveInteger(2)),
    ],
    [
      "roll modifier",
      "bless",
      rollModifierProfile,
      appendOngoingNoop,
      "rollModifier",
      "operationCount",
      spellOngoingOperationPath(PositiveInteger(2)),
    ],
    [
      "scalar buff",
      "longstrider",
      scalarBuffProfile,
      appendActivationPhase,
      "scalarBuff",
      "phaseCount",
      spellActivationPhasePath(PositiveInteger(2)),
    ],
    [
      "see invisible",
      "see_invisibility",
      seeInvisibleObserverSightProfile,
      appendActivationPhase,
      "seeInvisibleObserverSight",
      "phaseCount",
      spellActivationPhasePath(PositiveInteger(2)),
    ],
    [
      "held light",
      "produce_flame",
      heldLightProfile,
      appendOngoingNoop,
      "heldLight",
      "operationCount",
      spellOngoingOperationPath(PositiveInteger(3)),
    ],
  ] as const)(
    "reports an extra branch at its actual %s ordinal",
    (
      _label,
      spellId,
      profile,
      update,
      procedure,
      failedFact,
      mechanicsPath,
    ) => {
      const result = profile.admitMechanics(sourceWith(spellId, update));
      expect(result).toEqual({
        tag: "unsupported",
        issues: [expectedIssue(procedure, failedFact, mechanicsPath)],
      });
    },
  );

  test.each([
    ["roll modifier", "bless", rollModifierProfile, "rollModifier"],
    ["scalar buff", "longstrider", scalarBuffProfile, "scalarBuff"],
  ] as const)(
    "rejects dropped target rangeOrigin for %s at the actual attachment path",
    (_label, spellId, profile, procedure) => {
      const result = profile.admitMechanics(
        sourceWith(spellId, (mechanics) => {
          if (procedure === "scalarBuff") {
            if (mechanics.family !== "activation") {
              throw new Error("Expected scalar-buff activation mechanics.");
            }
            const updated = structuredClone(mechanics);
            const phase = updated.phases[0];
            if (
              phase?.kind !== "direct" ||
              phase.attachment.kind !== "hole" ||
              phase.attachment.value.kind !== "target"
            ) {
              throw new Error("Expected scalar-buff target attachment.");
            }
            Reflect.set(phase.attachment.value, "rangeOrigin", "caster");
            return updated;
          }
          if (
            mechanics.family !== "ongoing_effect" ||
            mechanics.attachment.kind !== "hole" ||
            mechanics.attachment.value.kind !== "target"
          ) {
            throw new Error("Expected ongoing target attachment.");
          }
          const updated = structuredClone(mechanics);
          if (
            updated.attachment.kind !== "hole" ||
            updated.attachment.value.kind !== "target"
          )
            throw new Error("Expected cloned ongoing target attachment.");
          Reflect.set(updated.attachment.value, "rangeOrigin", "caster");
          return updated;
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            procedure,
            "rangeOrigin",
            procedure === "scalarBuff"
              ? spellActivationAttachmentPath(PositiveInteger(1))
              : spellOngoingAttachmentPath(),
          ),
        ],
      });
    },
  );

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
        disposition: "willing",
        visibility: "caster_can_see",
      }),
    ],
  ] as const)(
    "rejects dropped target selection %s for roll modifier and scalar buff",
    (failedFact, update) => {
      for (const [spellId, profile, procedure] of [
        ["bless", rollModifierProfile, "rollModifier"],
        ["longstrider", scalarBuffProfile, "scalarBuff"],
      ] as const) {
        const result = profile.admitMechanics(
          sourceWith(spellId, (mechanics) => {
            if (procedure === "scalarBuff") {
              if (mechanics.family !== "activation") {
                throw new Error("Expected scalar-buff activation mechanics.");
              }
              const updated = structuredClone(mechanics);
              const phase = updated.phases[0];
              if (
                phase?.kind !== "direct" ||
                phase.attachment.kind !== "hole" ||
                phase.attachment.value.kind !== "target"
              ) {
                throw new Error("Expected scalar-buff target attachment.");
              }
              Reflect.set(
                phase.attachment.value,
                "selection",
                update(phase.attachment.value.selection),
              );
              return updated;
            }
            if (
              mechanics.family !== "ongoing_effect" ||
              mechanics.attachment.kind !== "hole" ||
              mechanics.attachment.value.kind !== "target"
            ) {
              throw new Error("Expected ongoing target attachment.");
            }
            const updated = structuredClone(mechanics);
            if (
              updated.attachment.kind !== "hole" ||
              updated.attachment.value.kind !== "target"
            )
              throw new Error("Expected cloned ongoing target attachment.");
            Reflect.set(
              updated.attachment.value,
              "selection",
              update(updated.attachment.value.selection),
            );
            return updated;
          }),
        );
        expect(result).toEqual({
          tag: "unsupported",
          issues: [
            expectedIssue(
              procedure,
              failedFact,
              procedure === "scalarBuff"
                ? spellActivationAttachmentPath(PositiveInteger(1))
                : spellOngoingAttachmentPath(),
            ),
          ],
        });
      }
    },
  );

  test.each([
    {
      caseName: "root-only",
      includeConditionalMechanic: false,
      expectedFacts: ["mechanics"],
    },
    {
      caseName: "root and conditional-mechanic",
      includeConditionalMechanic: true,
      expectedFacts: ["mechanics", "authoredConditionalMechanics"],
    },
  ] as const)(
    "reports $caseName defects separately for linked defense and movable light",
    ({ includeConditionalMechanic, expectedFacts }) => {
      for (const [spellId, profile] of [
        ["warding_bond", linkedDefenseResistanceDamageShareProfile],
        ["dancing_lights", movableLightManifestationProfile],
      ] as const) {
        const result = profile.admitMechanics(
          sourceWith(spellId, (mechanics) => {
            if (mechanics.family !== "ongoing_effect")
              throw new Error("Expected ongoing-effect mechanics.");
            const malformed = structuredClone(mechanics);
            Reflect.set(malformed, "syntheticRootFact", true);
            if (includeConditionalMechanic)
              Reflect.set(malformed, "authoredConditionalMechanics", [
                authoredConditionalMechanic,
              ]);
            return malformed;
          }),
        );

        expect(result.tag).toBe("unsupported");
        if (result.tag !== "unsupported") continue;
        expect(
          result.issues.map(({ failedFact, mechanicsPath }) => ({
            failedFact,
            mechanicsPath,
          })),
        ).toEqual(
          expectedFacts.map((failedFact) => ({
            failedFact,
            mechanicsPath: spellMechanicsRootPath(),
          })),
        );
      }
    },
  );

  test.each(ongoingOperationUpdates)(
    "rejects unsupported ongoing operation %s at its operation path",
    (failedFact, update) => {
      for (const [spellId, profile, procedure] of [
        ["resistance", damageReductionProfile, "damageReduction"],
        ["bless", rollModifierProfile, "rollModifier"],
        ["barkskin", scalarBuffProfile, "scalarBuff"],
        ["produce_flame", heldLightProfile, "heldLight"],
      ] as const) {
        const result = profile.admitMechanics(
          sourceWith(spellId, (mechanics) => {
            if (mechanics.family !== "ongoing_effect") {
              throw new Error("Expected ongoing-effect mechanics.");
            }
            const operation = mechanics.operations[0];
            if (operation === undefined) {
              throw new Error("Expected an ongoing operation.");
            }
            return {
              ...mechanics,
              operations: [update(operation), ...mechanics.operations.slice(1)],
            };
          }),
        );
        expect(result).toEqual({
          tag: "unsupported",
          issues: [
            expectedIssue(
              procedure,
              failedFact,
              spellOngoingOperationPath(PositiveInteger(1)),
            ),
          ],
        });
      }
    },
  );

  test.each(saveGateOptionalUpdates)(
    "rejects unsupported save-gate %s at its canonical path",
    (failedFact, update, mechanicsPath) => {
      const result = rollModifierProfile.admitMechanics(
        sourceWith("bane", (mechanics) => {
          if (mechanics.family !== "activation") {
            throw new Error("Expected activation mechanics.");
          }
          const phase = mechanics.phases[0];
          if (phase?.kind !== "save_gate") {
            throw new Error("Expected Bane save gate.");
          }
          return { ...mechanics, phases: [update(phase)] };
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [expectedIssue("rollModifier", failedFact, mechanicsPath)],
      });
    },
  );

  test("selects the semantic scalar direct phase and reports its prepended sibling ordinal", () => {
    const result = scalarBuffProfile.admitMechanics(
      sourceWith("longstrider", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const updated = structuredClone(mechanics);
        const phase = updated.phases[0];
        if (phase?.kind !== "direct") {
          throw new Error("Expected Longstrider direct phase.");
        }
        return {
          ...mechanics,
          phases: [{ ...phase, effects: [{ kind: "none" }] }, phase],
        };
      }),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "scalarBuff",
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(1)),
        ),
      ],
    });
  });

  test("selects the scalar effect by semantic kind and reports its actual effect ordinal", () => {
    const result = scalarBuffProfile.admitMechanics(
      sourceWith("longstrider", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const updated = structuredClone(mechanics);
        const phase = updated.phases[0];
        if (phase?.kind !== "direct") {
          throw new Error("Expected Longstrider direct phase.");
        }
        Reflect.set(phase, "effects", [
          { kind: "none" },
          ...(phase.effects ?? []),
        ]);
        Reflect.set(updated, "phases", [phase]);
        return updated;
      }),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "scalarBuff",
          "effect",
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        ),
      ],
    });
  });
});
