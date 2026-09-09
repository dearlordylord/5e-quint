import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellMechanicsHeaderPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { directConditionRemovalProfile } from "./direct-condition-removal.ts";

import {
  spellWithInvalidDirectEffects,
  targetSelectionConstraintMutations,
} from "./activation-spell-procedure-admission.test-support.js";

describe("Direct-removal spell procedure admission", () => {
  test("accumulates independent direct-removal facts at exact paths", () => {
    const base = spellRecord("lesser_restoration");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...base.mechanics,
        level: 1,
        range: { kind: "self" },
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct"
            ? phase
            : {
                ...phase,
                attachment: {
                  ...phase.attachment,
                  ...(phase.attachment.kind === "hole" &&
                  phase.attachment.value.kind === "target"
                    ? {
                        value: {
                          ...phase.attachment.value,
                          selection: {
                            mode: "one",
                            targetKinds: ["object"] as const,
                          },
                        },
                      }
                    : {}),
                },
              },
        ),
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionRemovalProfile.admitMechanics({
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
      { failedFact: "level", mechanicsPath: spellMechanicsHeaderPath("level") },
      { failedFact: "range", mechanicsPath: spellMechanicsHeaderPath("range") },
      {
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
    ]);
  });

  test.each(targetSelectionConstraintMutations)(
    "rejects unrepresented direct-removal selection constraint %s at attachment path",
    (_name, selectionMutation) => {
      const base = spellRecord("lesser_restoration");
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_activation_direct_removal_selection_${_name}`,
        name: `Synthetic Direct Removal Selection ${_name}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_activation_direct_removal_selection_${_name}`,
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
      const result = directConditionRemovalProfile.admitMechanics({
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

  test.each([
    ["removed", []],
    ["replaced", [{ kind: "none" }]],
  ] as const)(
    "keeps direct-removal ownership stable when the owned effect is %s",
    (_name, effects) => {
      const base = spellRecord("lesser_restoration");
      const malformed = spellWithInvalidDirectEffects(base, effects);
      const source = spellAdmissionSource(malformed);
      const result = directConditionRemovalProfile.admitMechanics({
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

  test("keeps direct-removal ownership stable when only school changes", () => {
    const base = spellRecord("lesser_restoration");
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_activation_direct_removal_school",
      name: "Synthetic Direct Removal School",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_direct_removal_school",
      },
      mechanics: { ...base.mechanics, school: "evocation" },
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionRemovalProfile.admitMechanics({
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
        failedFact: "school",
        mechanicsPath: spellMechanicsHeaderPath("school"),
      },
    ]);
  });

  test("keeps direct-removal ownership stable when only attachment changes", () => {
    const base = spellRecord("lesser_restoration");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_activation_direct_removal_attachment",
      name: "Synthetic Direct Removal Attachment",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_direct_removal_attachment",
      },
      mechanics: {
        ...base.mechanics,
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct"
            ? phase
            : { ...phase, attachment: { kind: "self" } },
        ),
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionRemovalProfile.admitMechanics({
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

  test("rejects direct-removal target range origin at the attachment path", () => {
    const base = spellRecord("lesser_restoration");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_activation_direct_removal_range_origin",
      name: "Synthetic Direct Removal Range Origin",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_direct_removal_range_origin",
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
                    rangeOrigin: "caster",
                  },
                },
              },
        ),
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionRemovalProfile.admitMechanics({
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

  test("reports direct-removal extras around the actual owned effect", () => {
    const base = spellRecord("lesser_restoration");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_activation_direct_removal_reordered",
      name: "Synthetic Direct Removal Reordered",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_direct_removal_reordered",
      },
      mechanics: {
        ...base.mechanics,
        phases: base.mechanics.phases.map((phase) =>
          phase.kind !== "direct"
            ? phase
            : {
                ...phase,
                effects: [
                  {
                    kind: "remove_condition",
                    condition: { kind: "choose", from: ["blinded"] },
                  },
                  ...(phase.effects ?? []),
                ],
              },
        ),
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directConditionRemovalProfile.admitMechanics({
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
        failedFact: "effects",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ]);
  });
});
