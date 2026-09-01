import { describe, expect, test } from "vitest";
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  spellActivationAttachmentPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellActivationEffectPath,
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { projectSpellDefinitionRuleFacts } from "../../procedure-admission/spell-definition-rule-facts.ts";
import {
  abilityD20TestRollModeSaveGateMechanicsFacts,
  saveGatedAttackRollAdvantageMechanicsFacts,
  saveGatedConditionImmunityMechanicsFacts,
  saveGatedConditionMechanicsFacts,
  saveGatedConditionTargetingFromFacts,
} from "./_save-gate-helpers.ts";
import { abilityD20TestRollModeSaveGateProfile } from "./ability-d20-test-roll-mode-save-gate.ts";
import { saveGatedAttackRollAdvantageProfile } from "./save-gated-attack-roll-advantage.ts";
import { saveGatedConditionImmunityProfile } from "./save-gated-condition-immunity.ts";
import { saveGatedConditionProfile } from "./save-gated-condition.ts";
import type { SpellMechanicsAdmissionSource } from "./spell-mechanics-admission.ts";

function mechanicsSource(spellId: Parameters<typeof spellRecord>[0]) {
  return mechanicsSourceForSpell(spellRecord(spellId));
}

function mechanicsSourceForSpell(spell: SpellRecord) {
  return {
    mechanics: spell.mechanics,
    spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(spell.mechanics),
  } satisfies SpellMechanicsAdmissionSource;
}

function mechanicsOnly(spellId: Parameters<typeof spellRecord>[0]) {
  return { mechanics: spellRecord(spellId).mechanics };
}

function renamedSyntheticSpell(
  spellId: Parameters<typeof spellRecord>[0],
  id: string,
  name: string,
): SpellRecord {
  const original = spellRecord(spellId);
  return decodeSpellRecordForTest({
    ...original,
    id,
    name,
    provenance: { kind: "synthetic-test", section: id },
  });
}

function saveGatePhase(spell: SpellRecord) {
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected activation spell mechanics.");
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    throw new Error("Expected save-gate spell mechanics.");
  }
  return phase;
}

function spellWithDuration(
  spellId: Parameters<typeof spellRecord>[0],
  duration: SpellRecord["mechanics"]["duration"],
  id: string,
): SpellRecord {
  const base = spellRecord(spellId);
  return decodeSpellRecordForTest({
    ...base,
    id,
    name: `Synthetic ${id}`,
    provenance: { kind: "synthetic-test", section: id },
    mechanics: { ...base.mechanics, duration },
  });
}

function slotTieredDurationWithBaseChildren(
  duration: Extract<
    SpellRecord["mechanics"]["duration"],
    { readonly kind: "timed" | "concentration" }
  >,
): SpellRecord["mechanics"]["duration"] {
  const extension = { atSlot: 2, amount: 1 };
  if (duration.kind === "timed") {
    return {
      kind: "slot_tiered",
      base: {
        kind: "timed",
        value: { ...duration.value, upcastTiers: [extension] },
        earlyEnd: [{ kind: "caster_recasts_spell" }],
      },
      tiers: [
        {
          atSlot: 2,
          duration: { kind: "timed", value: duration.value },
        },
      ],
    };
  }
  return {
    kind: "slot_tiered",
    base: {
      kind: "concentration",
      upTo: { ...duration.upTo, upcastTiers: [extension] },
      earlyEnd: [{ kind: "caster_recasts_spell" }],
      permanentIfMaintainedFull: true,
    },
    tiers: [
      {
        atSlot: 2,
        duration: { kind: "concentration", upTo: duration.upTo },
      },
    ],
  };
}

const commonHeaderPaths = [
  spellMechanicsHeaderPath("level"),
  spellMechanicsHeaderPath("school"),
  spellMechanicsHeaderPath("range"),
  spellMechanicsHeaderPath("components"),
  spellMechanicsHeaderPath("duration"),
  spellMechanicsHeaderPath("castingTime"),
  spellMechanicsHeaderPath("family"),
];

describe("save-gate static profile admission", () => {
  test("condition consumes exact save-gate and repeat branches", () => {
    const result = saveGatedConditionProfile.admitMechanics(
      mechanicsSource("hold_person"),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence).toEqual({
      consumed: [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        spellActivationRepeatPath(PositiveInteger(1), PositiveInteger(1)),
      ],
      unowned: [],
    });
    expect(result.admitted.facts).not.toHaveProperty("phase");
  });

  test.each([
    ["animal_friendship", "charmed", ["beast"]],
    ["charm_person", "charmed", ["humanoid"]],
    ["hold_person", "paralyzed", ["humanoid"]],
    ["hold_monster", "paralyzed", null],
    ["blindness_deafness", "choice", null],
    ["color_spray", "blinded", null],
    ["entangle", "restrained", null],
  ] as const)(
    "supports the %s condition variant",
    (spellId, expectedCondition, expectedCreatureTypes) => {
      const result = saveGatedConditionMechanicsFacts(mechanicsOnly(spellId));

      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") return;
      expect(result.facts.targetCreatureTypes).toEqual(expectedCreatureTypes);
      if (expectedCondition === "choice") {
        expect(result.facts.effect).toMatchObject({
          kind: "choice",
          choices: ["blinded", "deafened"],
        });
      } else {
        expect(result.facts.effect).toMatchObject({
          kind: "fixed",
          condition: expectedCondition,
        });
      }
    },
  );

  test("Charm Person consumes its supported duration ending", () => {
    const result = saveGatedConditionProfile.admitMechanics(
      mechanicsSource("charm_person"),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence).toEqual({
      consumed: [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellDurationEndingPath(PositiveInteger(1)),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
      unowned: [],
    });
  });

  test("condition does not claim sibling damage, immunity, or repeat roots", () => {
    for (const spellId of [
      "acid_splash",
      "calm_emotions",
      "hideous_laughter",
      "contagion",
      "sleep",
    ] as const) {
      expect(saveGatedConditionMechanicsFacts(mechanicsOnly(spellId))).toEqual({
        tag: "notRepresented",
      });
    }
  });

  test("condition static facts and evidence are invariant under synthetic renaming", () => {
    const original = spellRecord("hold_person");
    const renamed = decodeSpellRecordForTest({
      ...original,
      id: "synthetic_renamed_save_condition",
      name: "Synthetic Binding Person",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_renamed_save_condition",
      },
    });
    const originalResult = saveGatedConditionProfile.admitMechanics(
      mechanicsSource("hold_person"),
    );
    const renamedResult = saveGatedConditionProfile.admitMechanics({
      mechanics: renamed.mechanics,
      spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(
        renamed.mechanics,
      ),
    });

    expect(originalResult.tag).toBe("supported");
    expect(renamedResult.tag).toBe("supported");
    if (
      originalResult.tag !== "supported" ||
      renamedResult.tag !== "supported"
    ) {
      return;
    }
    expect(renamedResult.admitted.facts).toMatchObject({
      ability: originalResult.admitted.facts.ability,
      dc: originalResult.admitted.facts.dc,
      targetCreatureTypes: originalResult.admitted.facts.targetCreatureTypes,
      effect: originalResult.admitted.facts.effect,
      saveRollModeRule: originalResult.admitted.facts.saveRollModeRule,
      targeting: originalResult.admitted.facts.targeting,
    });
    expect(
      saveGatedConditionTargetingFromFacts(
        renamedResult.admitted.facts.targeting,
        spellSlotLevel(2),
      ),
    ).toEqual(
      saveGatedConditionTargetingFromFacts(
        originalResult.admitted.facts.targeting,
        spellSlotLevel(2),
      ),
    );
    expect(renamedResult.admitted.evidence).toEqual(
      originalResult.admitted.evidence,
    );
  });

  test("condition facts retain no authored-targeting closure", () => {
    const result = saveGatedConditionProfile.admitMechanics(
      mechanicsSource("hold_person"),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(typeof result.admitted.facts.targeting).not.toBe("function");
    expect(result.admitted.facts.targeting).toEqual({
      kind: "targetList",
      count: { base: 1, baseLevel: 2, perSlotAboveBase: 1 },
    });
  });

  test("each sibling profile owns its save-gate root", () => {
    expect(
      saveGatedConditionImmunityMechanicsFacts(mechanicsOnly("calm_emotions")),
    ).toMatchObject({ tag: "supported" });
    expect(
      saveGatedAttackRollAdvantageMechanicsFacts(mechanicsOnly("faerie_fire")),
    ).toMatchObject({ tag: "supported" });
    expect(
      abilityD20TestRollModeSaveGateMechanicsFacts(
        mechanicsOnly("ray_of_enfeeblement"),
      ),
    ).toMatchObject({ tag: "supported" });
  });

  test("condition-immunity consumes its complete save-gate evidence", () => {
    const result = saveGatedConditionImmunityProfile.admitMechanics(
      mechanicsSource("calm_emotions"),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence).toEqual({
      consumed: [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(2)),
      ],
      unowned: [],
    });
  });

  test("attack-roll advantage consumes its complete save-gate evidence", () => {
    const result = saveGatedAttackRollAdvantageProfile.admitMechanics(
      mechanicsSource("faerie_fire"),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence).toEqual({
      consumed: [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(2)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(3)),
      ],
      unowned: [],
    });
  });

  test("ability-D20 consumes its complete save-gate evidence", () => {
    const result = abilityD20TestRollModeSaveGateProfile.admitMechanics(
      mechanicsSource("ray_of_enfeeblement"),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence).toEqual({
      consumed: [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(2)),
        spellActivationRepeatPath(PositiveInteger(1), PositiveInteger(1)),
      ],
      unowned: [],
    });
  });

  test("condition-immunity facts and evidence are invariant under synthetic renaming", () => {
    const original = saveGatedConditionImmunityProfile.admitMechanics(
      mechanicsSource("calm_emotions"),
    );
    const renamed = renamedSyntheticSpell(
      "calm_emotions",
      "synthetic_renamed_condition_immunity",
      "Synthetic Calm Ward",
    );
    const renamedResult = saveGatedConditionImmunityProfile.admitMechanics(
      mechanicsSourceForSpell(renamed),
    );

    expect(original.tag).toBe("supported");
    expect(renamedResult.tag).toBe("supported");
    if (original.tag !== "supported" || renamedResult.tag !== "supported") {
      return;
    }
    expect(renamedResult.admitted.facts).toEqual(original.admitted.facts);
    expect(renamedResult.admitted.evidence).toEqual(original.admitted.evidence);
  });

  test("attack-roll advantage facts and evidence are invariant under synthetic renaming", () => {
    const original = saveGatedAttackRollAdvantageProfile.admitMechanics(
      mechanicsSource("faerie_fire"),
    );
    const renamed = renamedSyntheticSpell(
      "faerie_fire",
      "synthetic_renamed_attack_advantage",
      "Synthetic Revealing Cube",
    );
    const renamedResult = saveGatedAttackRollAdvantageProfile.admitMechanics(
      mechanicsSourceForSpell(renamed),
    );

    expect(original.tag).toBe("supported");
    expect(renamedResult.tag).toBe("supported");
    if (original.tag !== "supported" || renamedResult.tag !== "supported") {
      return;
    }
    expect(renamedResult.admitted.facts).toEqual(original.admitted.facts);
    expect(renamedResult.admitted.evidence).toEqual(original.admitted.evidence);
  });

  test("ability-D20 facts and evidence are invariant under synthetic renaming", () => {
    const original = abilityD20TestRollModeSaveGateProfile.admitMechanics(
      mechanicsSource("ray_of_enfeeblement"),
    );
    const renamed = renamedSyntheticSpell(
      "ray_of_enfeeblement",
      "synthetic_renamed_d20_save_gate",
      "Synthetic Weakening Ray",
    );
    const renamedResult = abilityD20TestRollModeSaveGateProfile.admitMechanics(
      mechanicsSourceForSpell(renamed),
    );

    expect(original.tag).toBe("supported");
    expect(renamedResult.tag).toBe("supported");
    if (original.tag !== "supported" || renamedResult.tag !== "supported") {
      return;
    }
    expect(renamedResult.admitted.facts).toEqual(original.admitted.facts);
    expect(renamedResult.admitted.evidence).toEqual(original.admitted.evidence);
  });

  test("condition accumulates independent header and phase failures", () => {
    const base = spellRecord("hold_person");
    const phase = saveGatePhase(base);
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_save_condition_multiple_failures",
      name: "Synthetic Binding With Multiple Failures",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_save_condition_multiple_failures",
      },
      mechanics: {
        ...base.mechanics,
        castingTime: { kind: "bonus_action" },
        range: { kind: "point", feet: 30 },
        phases: [{ ...phase, ability: "str" }],
      },
    });
    const result = saveGatedConditionMechanicsFacts({
      mechanics: malformed.mechanics,
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
        failedFact: "castingTime",
        mechanicsPath: spellMechanicsHeaderPath("castingTime"),
      },
      {
        failedFact: "range",
        mechanicsPath: spellMechanicsHeaderPath("range"),
      },
      {
        failedFact: "phaseAbility",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      },
    ]);
  });

  test("condition-immunity accumulates independent header and phase failures", () => {
    const base = spellRecord("calm_emotions");
    const phase = saveGatePhase(base);
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_condition_immunity_multiple_failures",
      name: "Synthetic Calm Ward With Multiple Failures",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_condition_immunity_multiple_failures",
      },
      mechanics: {
        ...base.mechanics,
        level: 3,
        range: { kind: "point", feet: 30 },
        phases: [{ ...phase, ability: "wis" }],
      },
    });
    const result = saveGatedConditionImmunityMechanicsFacts({
      mechanics: malformed.mechanics,
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
        failedFact: "level",
        mechanicsPath: spellMechanicsHeaderPath("level"),
      },
      {
        failedFact: "range",
        mechanicsPath: spellMechanicsHeaderPath("range"),
      },
      {
        failedFact: "phaseAbility",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      },
    ]);
  });

  test("attack-roll advantage accumulates independent header and phase failures", () => {
    const base = spellRecord("faerie_fire");
    const phase = saveGatePhase(base);
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_attack_advantage_multiple_failures",
      name: "Synthetic Revealing Cube With Multiple Failures",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_attack_advantage_multiple_failures",
      },
      mechanics: {
        ...base.mechanics,
        castingTime: { kind: "bonus_action" },
        range: { kind: "point", feet: 30 },
        phases: [{ ...phase, ability: "con" }],
      },
    });
    const result = saveGatedAttackRollAdvantageMechanicsFacts({
      mechanics: malformed.mechanics,
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
        failedFact: "castingTime",
        mechanicsPath: spellMechanicsHeaderPath("castingTime"),
      },
      {
        failedFact: "range",
        mechanicsPath: spellMechanicsHeaderPath("range"),
      },
      {
        failedFact: "phaseAbility",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      },
    ]);
  });

  test("ability-D20 accumulates independent header and phase failures", () => {
    const base = spellRecord("ray_of_enfeeblement");
    const phase = saveGatePhase(base);
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_d20_multiple_failures",
      name: "Synthetic Weakening Ray With Multiple Failures",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_d20_multiple_failures",
      },
      mechanics: {
        ...base.mechanics,
        level: 3,
        range: { kind: "point", feet: 30 },
        phases: [{ ...phase, ability: "wis" }],
      },
    });
    const result = abilityD20TestRollModeSaveGateMechanicsFacts({
      mechanics: malformed.mechanics,
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
        failedFact: "level",
        mechanicsPath: spellMechanicsHeaderPath("level"),
      },
      {
        failedFact: "range",
        mechanicsPath: spellMechanicsHeaderPath("range"),
      },
      {
        failedFact: "phaseAbility",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      },
    ]);
  });

  test("condition rejects every unsupported duration child at its canonical path", () => {
    const base = spellRecord("charm_person");
    if (base.mechanics.duration.kind !== "timed") {
      throw new Error("Expected Charm Person timed duration.");
    }
    const malformed = spellWithDuration(
      "charm_person",
      {
        ...base.mechanics.duration,
        value: {
          ...base.mechanics.duration.value,
          upcastTiers: [{ atSlot: 2, amount: 1 }],
        },
        earlyEnd: [
          { kind: "caster_recasts_spell" },
          { kind: "target_takes_damage" },
        ],
        permanentAfter: {
          kind: "repeated_casts",
          cadence: "daily",
          count: 1,
          target: "same_target",
          endsOn: ["dispel"],
        },
      },
      "synthetic_condition_duration_children",
    );
    const result = saveGatedConditionMechanicsFacts({
      mechanics: malformed.mechanics,
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
        failedFact: "durationExtension",
        mechanicsPath: spellDurationExtensionPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(2)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(3)),
      },
    ]);
  });

  test("condition-immunity rejects every unsupported duration child at its canonical path", () => {
    const base = spellRecord("calm_emotions");
    if (base.mechanics.duration.kind !== "concentration") {
      throw new Error("Expected Calm Emotions concentration duration.");
    }
    const malformed = spellWithDuration(
      "calm_emotions",
      {
        ...base.mechanics.duration,
        upTo: {
          ...base.mechanics.duration.upTo,
          upcastTiers: [{ atSlot: 3, amount: 1 }],
        },
        earlyEnd: [{ kind: "caster_recasts_spell" }],
        permanentIfMaintainedFull: true,
      },
      "synthetic_condition_immunity_duration_children",
    );
    const result = saveGatedConditionImmunityMechanicsFacts({
      mechanics: malformed.mechanics,
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
        failedFact: "durationExtension",
        mechanicsPath: spellDurationExtensionPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(2)),
      },
    ]);
  });

  test("attack-roll advantage rejects every unsupported duration child at its canonical path", () => {
    const base = spellRecord("faerie_fire");
    if (base.mechanics.duration.kind !== "concentration") {
      throw new Error("Expected Faerie Fire concentration duration.");
    }
    const malformed = spellWithDuration(
      "faerie_fire",
      {
        ...base.mechanics.duration,
        upTo: {
          ...base.mechanics.duration.upTo,
          upcastTiers: [{ atSlot: 2, amount: 1 }],
        },
        earlyEnd: [
          { kind: "caster_recasts_spell" },
          { kind: "target_takes_damage" },
        ],
        permanentIfMaintainedFull: true,
      },
      "synthetic_attack_duration_children",
    );
    const result = saveGatedAttackRollAdvantageMechanicsFacts({
      mechanics: malformed.mechanics,
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
        failedFact: "durationExtension",
        mechanicsPath: spellDurationExtensionPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(2)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(3)),
      },
    ]);
  });

  test("ability-D20 rejects every unsupported duration child at its canonical path", () => {
    const base = spellRecord("ray_of_enfeeblement");
    if (base.mechanics.duration.kind !== "concentration") {
      throw new Error("Expected Ray of Enfeeblement concentration duration.");
    }
    const malformed = spellWithDuration(
      "ray_of_enfeeblement",
      {
        ...base.mechanics.duration,
        upTo: {
          ...base.mechanics.duration.upTo,
          upcastTiers: [{ atSlot: 2, amount: 1 }],
        },
        earlyEnd: [{ kind: "caster_recasts_spell" }],
        permanentIfMaintainedFull: true,
      },
      "synthetic_d20_duration_children",
    );
    const result = abilityD20TestRollModeSaveGateMechanicsFacts({
      mechanics: malformed.mechanics,
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
        failedFact: "durationExtension",
        mechanicsPath: spellDurationExtensionPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(2)),
      },
    ]);
  });

  test("slot-tiered duration reports only real tier extensions", () => {
    const projections = [
      {
        label: "condition",
        spellId: "charm_person",
        project: saveGatedConditionMechanicsFacts,
      },
      {
        label: "condition-immunity",
        spellId: "calm_emotions",
        project: saveGatedConditionImmunityMechanicsFacts,
      },
      {
        label: "attack-roll advantage",
        spellId: "faerie_fire",
        project: saveGatedAttackRollAdvantageMechanicsFacts,
      },
      {
        label: "ability-D20",
        spellId: "ray_of_enfeeblement",
        project: abilityD20TestRollModeSaveGateMechanicsFacts,
      },
    ] as const;

    for (const { label, spellId, project } of projections) {
      const base = spellRecord(spellId);
      if (
        base.mechanics.duration.kind !== "timed" &&
        base.mechanics.duration.kind !== "concentration"
      ) {
        throw new Error(`Expected ${label} duration branch.`);
      }
      const malformed = spellWithDuration(
        spellId,
        slotTieredDurationWithBaseChildren(base.mechanics.duration),
        `synthetic_slot_tiered_${spellId}`,
      );
      const result = project({ mechanics: malformed.mechanics });

      expect(result.tag, label).toBe("unsupported");
      if (result.tag !== "unsupported") continue;
      expect(
        result.issues.map(({ failedFact, mechanicsPath }) => ({
          failedFact,
          mechanicsPath,
        })),
        label,
      ).toEqual([
        {
          failedFact: "duration",
          mechanicsPath: spellDurationValuePath(),
        },
        {
          failedFact: "durationExtension",
          mechanicsPath: spellDurationExtensionPath(PositiveInteger(1)),
        },
      ]);
    }
  });

  test("dedicated roots decline save-gated-damage composite collisions", () => {
    const base = spellRecord("acid_splash");
    const phase = saveGatePhase(base);
    const conditionImmunityCollision = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_damage_condition_immunity_collision",
      name: "Synthetic Damage With Condition Immunity",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_damage_condition_immunity_collision",
      },
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            onFail: {
              kind: "composite",
              effects: [
                phase.onFail,
                { kind: "grant_condition_immunity", condition: "charmed" },
              ],
            },
          },
        ],
      },
    });
    const attackCollision = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_damage_attack_collision",
      name: "Synthetic Damage With Attack Projection",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_damage_attack_collision",
      },
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            onFail: {
              kind: "composite",
              effects: [
                phase.onFail,
                {
                  kind: "modify_roll_advantage",
                  mode: "advantage",
                  on: ["attack_roll"],
                },
                {
                  kind: "suppress_condition_benefit",
                  condition: "invisible",
                },
                { kind: "emit_dim_illumination", radiusFeet: 10 },
              ],
            },
          },
        ],
      },
    });
    const d20Collision = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_damage_d20_collision",
      name: "Synthetic Damage With D20 Projection",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_damage_d20_collision",
      },
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            onSuccess: {
              kind: "modify_roll_advantage",
              mode: "disadvantage",
              on: ["attack_roll"],
              count: 1,
              expiresOn: { kind: "caster_turn_start" },
            },
            onFail: {
              kind: "composite",
              effects: [
                phase.onFail,
                {
                  kind: "modify_damage_numeric",
                  delta: {
                    kind: "fixed_dice",
                    dice: 1,
                    dieSize: 8,
                    sign: "-",
                  },
                },
              ],
            },
          },
        ],
      },
    });

    expect(
      saveGatedConditionImmunityMechanicsFacts({
        mechanics: conditionImmunityCollision.mechanics,
      }),
    ).toEqual({ tag: "notRepresented" });
    expect(
      saveGatedAttackRollAdvantageMechanicsFacts({
        mechanics: attackCollision.mechanics,
      }),
    ).toEqual({ tag: "notRepresented" });
    expect(
      abilityD20TestRollModeSaveGateMechanicsFacts({
        mechanics: d20Collision.mechanics,
      }),
    ).toEqual({ tag: "notRepresented" });
  });

  test("sibling profiles retain mechanics-free correlated facts", () => {
    const profiles = [
      [saveGatedConditionImmunityProfile, "calm_emotions"],
      [saveGatedAttackRollAdvantageProfile, "faerie_fire"],
      [abilityD20TestRollModeSaveGateProfile, "ray_of_enfeeblement"],
    ] as const;

    for (const [profile, spellId] of profiles) {
      const result = profile.admitMechanics(mechanicsSource(spellId));
      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") continue;
      expect(result.admitted.facts).not.toHaveProperty("phase");
      expect(result.admitted.evidence.unowned).toEqual([]);
      expect(result.admitted.evidence.consumed.length).toBeGreaterThan(0);
    }
  });

  test("composite projections identify missing effect roles separately", () => {
    const immunityBase = spellRecord("calm_emotions");
    const immunityPhase = saveGatePhase(immunityBase);
    if (immunityPhase.onFail.kind !== "composite") {
      throw new Error("Expected composite condition-immunity effects.");
    }
    const firstImmunityEffect = immunityPhase.onFail.effects[0];
    if (firstImmunityEffect === undefined) {
      throw new Error("Expected a condition-immunity effect.");
    }
    const immunityMissingRole = decodeSpellRecordForTest({
      ...immunityBase,
      id: "synthetic_condition_immunity_missing_role",
      name: "Synthetic Calm Ward Missing Role",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_condition_immunity_missing_role",
      },
      mechanics: {
        ...immunityBase.mechanics,
        phases: [
          {
            ...immunityPhase,
            onFail: { kind: "composite", effects: [firstImmunityEffect] },
          },
        ],
      },
    });
    const immunityResult = saveGatedConditionImmunityMechanicsFacts({
      mechanics: immunityMissingRole.mechanics,
    });
    expect(immunityResult.tag).toBe("unsupported");
    if (immunityResult.tag !== "unsupported") return;
    expect(immunityResult.issues).toContainEqual({
      tag: "spellProcedureAdmissionIssue",
      procedure: "saveGatedConditionImmunity",
      failedFact: "conditionImmunityEffect",
      mechanicsPath: spellActivationEffectPath(
        PositiveInteger(1),
        PositiveInteger(2),
      ),
      message:
        "Save-gated condition immunity is missing a required condition-immunity effect.",
    });

    const d20Base = spellRecord("ray_of_enfeeblement");
    const d20Phase = saveGatePhase(d20Base);
    if (d20Phase.onFail.kind !== "composite") {
      throw new Error("Expected composite D20 failed-save effects.");
    }
    const secondD20Effect = d20Phase.onFail.effects[1];
    if (secondD20Effect === undefined) {
      throw new Error("Expected two D20 failed-save effects.");
    }
    const d20MissingRole = decodeSpellRecordForTest({
      ...d20Base,
      id: "synthetic_d20_missing_role",
      name: "Synthetic Weakening Ray Missing Role",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_d20_missing_role",
      },
      mechanics: {
        ...d20Base.mechanics,
        phases: [
          {
            ...d20Phase,
            onFail: {
              kind: "composite",
              effects: [secondD20Effect],
            },
          },
        ],
      },
    });
    const d20Result = abilityD20TestRollModeSaveGateMechanicsFacts({
      mechanics: d20MissingRole.mechanics,
    });
    expect(d20Result.tag).toBe("unsupported");
    if (d20Result.tag !== "unsupported") return;
    expect(d20Result.issues.map(({ failedFact }) => failedFact)).toEqual([
      "d20DisadvantageEffect",
    ]);
  });
});
