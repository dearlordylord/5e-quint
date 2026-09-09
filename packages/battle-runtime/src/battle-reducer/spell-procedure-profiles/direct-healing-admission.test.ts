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
import { directHitPointRestorationProfile } from "./direct-hit-point-restoration.ts";

import {
  spellWithInvalidDirectEffects,
  targetSelectionConstraintMutations,
} from "./activation-spell-procedure-admission.test-support.js";

describe("Direct-healing spell procedure admission", () => {
  test("reports direct healing extras around the actual owned effect", () => {
    const base = spellRecord("cure_wounds");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_activation_direct_healing_reordered",
      name: "Synthetic Direct Healing Reordered",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_direct_healing_reordered",
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
                    kind: "heal_hp",
                    amount: { kind: "fixed", expr: { dice: 1, dieSize: 4 } },
                    target: "target_creature",
                  },
                  ...(phase.effects ?? []),
                ],
              },
        ),
      },
    });
    const source = spellAdmissionSource(malformed);
    const result = directHitPointRestorationProfile.admitMechanics({
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

  test.each(targetSelectionConstraintMutations)(
    "rejects unrepresented direct-healing selection constraint %s at attachment path",
    (_name, selectionMutation) => {
      const base = spellRecord("cure_wounds");
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_activation_direct_healing_selection_${_name}`,
        name: `Synthetic Direct Healing Selection ${_name}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_activation_direct_healing_selection_${_name}`,
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
      const result = directHitPointRestorationProfile.admitMechanics({
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

  test("rejects direct-healing target range origin at the attachment path", () => {
    const base = spellRecord("cure_wounds");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_activation_direct_healing_range_origin",
      name: "Synthetic Direct Healing Range Origin",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_direct_healing_range_origin",
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
    const result = directHitPointRestorationProfile.admitMechanics({
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

  test.each([
    [
      "occupant disposition filter",
      { occupantDispositionFilter: "friendly_to_source" },
    ],
    [
      "occupant perception filter",
      { occupantPerceptionFilter: "can_see_area_effect" },
    ],
    [
      "excluded areas",
      {
        excludedAreas: {
          chooser: "caster",
          count: "one_or_more",
          size: "any",
        },
      },
    ],
    ["range origin", { rangeOrigin: "caster" }],
    [
      "area target selection constraint",
      {
        selection: {
          mode: "choose_up_to",
          count: 6,
          typeFilter: ["beast"] as const,
        },
      },
    ],
  ] as const)(
    "rejects direct-healing area attachment field %s at attachment path",
    (_name, attachmentMutation) => {
      const base = spellRecord("mass_cure_wounds");
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_activation_direct_healing_area_${_name}`,
        name: `Synthetic Direct Healing Area ${_name}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_activation_direct_healing_area_${_name}`,
        },
        mechanics: {
          ...base.mechanics,
          phases: base.mechanics.phases.map((phase) =>
            phase.kind !== "direct" ||
            phase.attachment.kind !== "hole" ||
            phase.attachment.value.kind !== "area"
              ? phase
              : {
                  ...phase,
                  attachment: {
                    ...phase.attachment,
                    value: {
                      ...phase.attachment.value,
                      ...attachmentMutation,
                    },
                  },
                },
          ),
        },
      });
      const source = spellAdmissionSource(malformed);
      const result = directHitPointRestorationProfile.admitMechanics({
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
    ["axis", "axis"],
    ["base flat", "baseFlat"],
    ["base ability modifier", "baseAbilityModifier"],
    ["per-level flat", "perLevelFlat"],
    ["per-level die size", "perLevelDieSize"],
  ] as const)(
    "rejects direct-healing amount fields execution cannot project: %s",
    (_name, mutation) => {
      const base = spellRecord("cure_wounds");
      if (base.mechanics.family !== "activation") {
        throw new Error("Expected activation mechanics.");
      }
      const malformed = decodeSpellRecordForTest({
        ...base,
        id: `synthetic_activation_direct_healing_amount_${mutation}`,
        name: `Synthetic Direct Healing Amount ${mutation}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_activation_direct_healing_amount_${mutation}`,
        },
        mechanics: {
          ...base.mechanics,
          phases: base.mechanics.phases.map((phase) =>
            phase.kind !== "direct"
              ? phase
              : {
                  ...phase,
                  effects: (phase.effects ?? []).map((effect) =>
                    effect.kind !== "heal_hp" ||
                    effect.amount.kind !== "linear_per_level"
                      ? effect
                      : {
                          ...effect,
                          amount:
                            mutation === "axis"
                              ? { ...effect.amount, axis: "character" }
                              : mutation === "baseFlat"
                                ? {
                                    ...effect.amount,
                                    base: { ...effect.amount.base, flat: 1 },
                                  }
                                : mutation === "baseAbilityModifier"
                                  ? {
                                      ...effect.amount,
                                      base: {
                                        ...effect.amount.base,
                                        abilityModifier: "int",
                                      },
                                    }
                                  : mutation === "perLevelFlat"
                                    ? {
                                        ...effect.amount,
                                        perLevel: {
                                          ...effect.amount.perLevel,
                                          flat: 1,
                                        },
                                      }
                                    : {
                                        ...effect.amount,
                                        perLevel: {
                                          ...effect.amount.perLevel,
                                          dieSize: 6,
                                        },
                                      },
                        },
                  ),
                },
          ),
        },
      });
      const source = spellAdmissionSource(malformed);
      const result = directHitPointRestorationProfile.admitMechanics({
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
          failedFact: "healing",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(1),
          ),
        },
      ]);
    },
  );

  test.each([
    ["removed", []],
    ["replaced", [{ kind: "none" }]],
  ] as const)(
    "keeps direct-healing ownership stable when the owned effect is %s",
    (_name, effects) => {
      const base = spellRecord("cure_wounds");
      const malformed = spellWithInvalidDirectEffects(base, effects);
      const source = spellAdmissionSource(malformed);
      const result = directHitPointRestorationProfile.admitMechanics({
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
                failedFact: "healing",
                mechanicsPath: spellActivationEffectPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
              },
            ]
          : [
              {
                failedFact: "healing",
                mechanicsPath: spellActivationEffectPath(
                  PositiveInteger(1),
                  PositiveInteger(1),
                ),
              },
            ],
      );
    },
  );

  test("keeps direct-healing ownership stable when only school changes", () => {
    const base = spellRecord("cure_wounds");
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_activation_direct_healing_school",
      name: "Synthetic Direct Healing School",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_direct_healing_school",
      },
      mechanics: { ...base.mechanics, school: "evocation" },
    });
    const source = spellAdmissionSource(malformed);
    const result = directHitPointRestorationProfile.admitMechanics({
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

  test("keeps direct-healing ownership stable when only attachment changes", () => {
    const base = spellRecord("cure_wounds");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected activation mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_activation_direct_healing_attachment",
      name: "Synthetic Direct Healing Attachment",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_activation_direct_healing_attachment",
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
    const result = directHitPointRestorationProfile.admitMechanics({
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

  test("reports direct healing range at its canonical failed path", () => {
    const base = spellRecord("cure_wounds");
    const malformed = decodeSpellRecordForTest({
      ...base,
      mechanics: { ...base.mechanics, range: { kind: "self" } },
    });
    const source = spellAdmissionSource(malformed);
    const result = directHitPointRestorationProfile.admitMechanics({
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
      { failedFact: "range", mechanicsPath: spellMechanicsHeaderPath("range") },
    ]);
  });
});
