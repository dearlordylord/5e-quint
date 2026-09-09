import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellDurationExtensionPath,
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { directConditionProfile } from "./direct-condition.ts";

import {
  mechanicsSource,
  mechanicsSourceFromSpell,
  spellWithInvalidDirectEffects,
  withUnmodeledObjectField,
  mapNonEmptyFirst,
  renamedSpell,
} from "./activation-spell-procedure-admission.test-support.js";

describe("Direct-condition spell procedure admission", () => {
  test("keeps direct-condition facts and evidence invariant under authored renaming", () => {
    const originalResult = directConditionProfile.admitMechanics(
      mechanicsSource("invisibility"),
    );
    const renamedResult = directConditionProfile.admitMechanics(
      mechanicsSourceFromSpell(
        renamedSpell("invisibility", "synthetic_activation_direct_condition"),
      ),
    );
    expect(originalResult.tag).toBe("supported");
    expect(renamedResult.tag).toBe("supported");
    if (
      originalResult.tag !== "supported" ||
      renamedResult.tag !== "supported"
    ) {
      return;
    }
    expect(renamedResult.admitted.facts).toEqual(originalResult.admitted.facts);
    expect(renamedResult.admitted.evidence).toEqual(
      originalResult.admitted.evidence,
    );
  });

  test.each([
    {
      name: "activation root",
      mutate: (mechanics: Extract<SpellMechanics, { family: "activation" }>) =>
        withUnmodeledObjectField(mechanics, "unmodeledRoot"),
      expected: {
        failedFact: "mechanics",
        mechanicsPath: spellMechanicsRootPath(),
      },
    },
    {
      name: "casting time",
      mutate: (mechanics: Extract<SpellMechanics, { family: "activation" }>) =>
        ({
          ...mechanics,
          castingTime: withUnmodeledObjectField(
            mechanics.castingTime,
            "ritual",
          ),
        }) as const,
      expected: {
        failedFact: "castingTime",
        mechanicsPath: spellMechanicsHeaderPath("castingTime"),
      },
    },
    {
      name: "range",
      mutate: (mechanics: Extract<SpellMechanics, { family: "activation" }>) =>
        ({
          ...mechanics,
          range: withUnmodeledObjectField(mechanics.range, "radiusFeet"),
        }) as const,
      expected: {
        failedFact: "range",
        mechanicsPath: spellMechanicsHeaderPath("range"),
      },
    },
    {
      name: "duration",
      mutate: (mechanics: Extract<SpellMechanics, { family: "activation" }>) =>
        ({
          ...mechanics,
          duration: withUnmodeledObjectField(
            mechanics.duration,
            "unmodeledDuration",
          ),
        }) as const,
      expected: {
        failedFact: "duration",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
    },
    {
      name: "duration value",
      mutate: (mechanics: Extract<SpellMechanics, { family: "activation" }>) =>
        mechanics.duration.kind !== "concentration"
          ? mechanics
          : ({
              ...mechanics,
              duration: {
                ...mechanics.duration,
                upTo: withUnmodeledObjectField(
                  mechanics.duration.upTo,
                  "unmodeledValue",
                ),
              },
            } as const),
      expected: {
        failedFact: "durationValue",
        mechanicsPath: spellDurationValuePath(),
      },
    },
    {
      name: "duration ending",
      mutate: (
        mechanics: Extract<SpellMechanics, { family: "activation" }>,
      ) => {
        if (
          mechanics.duration.kind !== "concentration" ||
          mechanics.duration.earlyEnd === undefined
        ) {
          return mechanics;
        }
        return {
          ...mechanics,
          duration: {
            ...mechanics.duration,
            earlyEnd: mapNonEmptyFirst(mechanics.duration.earlyEnd, (ending) =>
              withUnmodeledObjectField(ending, "unmodeledEnding"),
            ),
          },
        };
      },
      expected: {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
      },
      additionalExpected: [
        {
          failedFact: "durationEnding",
          mechanicsPath: spellMechanicsHeaderPath("duration"),
        },
      ],
    },
  ])(
    "rejects an unmodeled direct-condition %s field at its owned path",
    (testCase) => {
      const base = spellRecord("invisibility");
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const malformed = {
        ...base,
        mechanics: testCase.mutate(base.mechanics),
      };
      const result = directConditionProfile.admitMechanics(
        mechanicsSourceFromSpell(malformed),
      );
      expect(result.tag).toBe("unsupported");
      if (result.tag !== "unsupported") return;
      expect(
        result.issues.map(({ failedFact, mechanicsPath }) => ({
          failedFact,
          mechanicsPath,
        })),
      ).toEqual([
        testCase.expected,
        ...("additionalExpected" in testCase
          ? testCase.additionalExpected
          : []),
      ]);
    },
  );

  test("rejects a direct-condition duration extension at its extension path", () => {
    const base = spellRecord("invisibility");
    if (
      base.mechanics.family !== "activation" ||
      base.mechanics.duration.kind !== "concentration"
    ) {
      throw new Error("Expected concentration activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...base.mechanics,
        duration: {
          ...base.mechanics.duration,
          upTo: {
            ...base.mechanics.duration.upTo,
            upcastTiers: [{ atSlot: 3, amount: 2 }],
          },
        },
      },
    });
    const result = directConditionProfile.admitMechanics(
      mechanicsSourceFromSpell(malformed),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(
      result.issues.map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      })),
    ).toEqual([
      {
        failedFact: "durationExtension",
        mechanicsPath: spellDurationExtensionPath(PositiveInteger(1)),
      },
    ]);
  });

  test("reports direct-condition extra duration branches instead of silently consuming them", () => {
    const base = spellRecord("invisibility");
    if (
      base.mechanics.family !== "activation" ||
      base.mechanics.duration.kind !== "concentration"
    ) {
      throw new Error("Expected concentration activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...base.mechanics,
        duration: {
          ...base.mechanics.duration,
          upTo: { amount: 1, unit: "minute" },
          earlyEnd: [
            ...(base.mechanics.duration.earlyEnd ?? []),
            { kind: "target_makes_attack_roll" },
          ],
        },
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionProfile.admitMechanics({
      mechanics: source.mechanics,
      spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
    });
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(
      result.issues.map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      })),
    ).toEqual([
      { failedFact: "durationValue", mechanicsPath: spellDurationValuePath() },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(4)),
      },
    ]);
  });

  test.each([
    ["repeatsAllowed", { repeatsAllowed: true }],
    ["typeFilter", { typeFilter: ["beast"] as const }],
    [
      "castingRequirement",
      {
        castingRequirement: {
          kind: "remain_within_spell_range_for_entire_casting",
        } as const,
      },
    ],
  ] as const)(
    "rejects unrepresented direct-condition selection constraint %s at attachment path",
    (_name, selectionMutation) => {
      const base = spellRecord("invisibility");
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_activation_direct_condition_selection_${_name}`,
        name: `Synthetic Direct Condition Selection ${_name}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_activation_direct_condition_selection_${_name}`,
        },
        mechanics: {
          ...base.mechanics,
          phases: base.mechanics.phases.map((phase) =>
            phase.kind !== "direct" ||
            phase.attachment.kind !== "hole" ||
            phase.attachment.value.kind !== "target"
              ? phase
              : {
                  ...phase,
                  attachment: {
                    ...phase.attachment,
                    value: {
                      ...phase.attachment.value,
                      selection: {
                        ...phase.attachment.value.selection,
                        ...selectionMutation,
                      },
                    },
                  },
                },
          ),
        },
      });
      const source = spellAdmissionSource(malformed);
      const result = directConditionProfile.admitMechanics({
        mechanics: source.mechanics,
        spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
      });
      expect(result.tag).toBe("unsupported");
      if (result.tag !== "unsupported") return;
      expect(
        result.issues.map(({ failedFact, mechanicsPath }) => ({
          failedFact,
          mechanicsPath,
        })),
      ).toEqual([
        {
          failedFact: "attachment",
          mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
        },
      ]);
    },
  );

  test("rejects direct-condition target range origin at the attachment path", () => {
    const base = spellRecord("invisibility");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_activation_direct_condition_range_origin",
      name: "Synthetic Direct Condition Range Origin",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_direct_condition_range_origin",
      },
      mechanics: {
        ...base.mechanics,
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct" ||
          phase.attachment.kind !== "hole" ||
          phase.attachment.value.kind !== "target"
            ? phase
            : {
                ...phase,
                attachment: {
                  ...phase.attachment,
                  value: {
                    ...phase.attachment.value,
                    rangeOrigin: "spell_sensor",
                  },
                },
              },
        ),
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionProfile.admitMechanics({
      mechanics: source.mechanics,
      spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
    });
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(
      result.issues.map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      })),
    ).toEqual([
      {
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
    ]);
  });

  test("keeps direct-condition ownership stable when attachment and condition are both malformed", () => {
    const base = spellRecord("invisibility");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_activation_direct_condition_combined",
      name: "Synthetic Direct Condition Combined",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_direct_condition_combined",
      },
      mechanics: {
        ...base.mechanics,
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct"
            ? phase
            : {
                ...phase,
                attachment: {
                  ...phase.attachment,
                  value: {
                    kind: "target",
                    selection: { mode: "one" },
                  },
                },
                effects: (phase.effects ?? []).map((effect) =>
                  effect.kind === "apply_condition"
                    ? { ...effect, condition: "blinded" }
                    : effect,
                ),
              },
        ),
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionProfile.admitMechanics({
      mechanics: source.mechanics,
      spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
    });
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(
      result.issues.map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      })),
    ).toEqual([
      {
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      {
        failedFact: "condition",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ]);
  });

  test.each([
    ["removed", []],
    ["replaced", [{ kind: "none" }]],
  ] as const)(
    "keeps direct-condition ownership stable when the semantic effect is %s and equivalent endings are reordered",
    (_name, effects) => {
      const base = spellRecord("invisibility");
      if (
        base.mechanics.family !== "activation" ||
        base.mechanics.duration.kind !== "concentration"
      ) {
        throw new Error("Expected concentration activation mechanics.");
      }
      const reordered = decodeSpellRecordForTest({
        ...base,
        mechanics: {
          ...base.mechanics,
          duration: {
            ...base.mechanics.duration,
            earlyEnd: [...(base.mechanics.duration.earlyEnd ?? [])].reverse(),
          },
        },
      });
      const malformed = spellWithInvalidDirectEffects(reordered, effects);
      const result = directConditionProfile.admitMechanics(
        mechanicsSourceFromSpell(malformed),
      );
      expect(result.tag).toBe("unsupported");
      if (result.tag !== "unsupported") return;
      expect(
        result.issues.map(({ failedFact, mechanicsPath }) => ({
          failedFact,
          mechanicsPath,
        })),
      ).toEqual(
        _name === "removed"
          ? [
              {
                failedFact: "effects",
                mechanicsPath: spellActivationEffectPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
              },
              {
                failedFact: "condition",
                mechanicsPath: spellActivationEffectPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
              },
            ]
          : [
              {
                failedFact: "condition",
                mechanicsPath: spellActivationEffectPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
              },
            ],
      );
    },
  );

  test("reports a missing direct-condition duration kind without inventing an ending path", () => {
    const base = spellRecord("invisibility");
    if (
      base.mechanics.family !== "activation" ||
      base.mechanics.duration.kind !== "concentration"
    ) {
      throw new Error("Expected concentration activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_activation_direct_condition_missing_ending",
      name: "Synthetic Direct Condition Missing Ending",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_direct_condition_missing_ending",
      },
      mechanics: {
        ...base.mechanics,
        duration: {
          ...base.mechanics.duration,
          earlyEnd: base.mechanics.duration.earlyEnd?.slice(0, 2),
        },
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionProfile.admitMechanics({
      mechanics: source.mechanics,
      spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
    });
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(
      result.issues.map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      })),
    ).toEqual([
      {
        failedFact: "durationEnding",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
    ]);
  });
});
