import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import { PositiveInteger } from "@dnd/shared/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";

import {
  spellAdmissionSource,
  spellRecord,
  decodeSpellRecordForTest,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import type { SpellMechanicsAdmissionSource } from "./spell-mechanics-admission.ts";
import { grantedAreaSaveDamageActionProfile } from "./granted-area-save-damage.ts";
import { stagedSaveConditionProfile } from "./hit-point-budget-condition-admission.ts";
import { saveGatedTurnConstraintBundleProfile } from "./save-gated-turn-constraint-bundle.ts";
import { saveGatedConditionWithRepeatProfile } from "./staged-save-condition.ts";

function mechanicsSource(
  spellId: Parameters<typeof spellRecord>[0],
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spellRecord(spellId));
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

const headers = [
  spellMechanicsHeaderPath("level"),
  spellMechanicsHeaderPath("school"),
  spellMechanicsHeaderPath("range"),
  spellMechanicsHeaderPath("components"),
  spellMechanicsHeaderPath("duration"),
  spellMechanicsHeaderPath("castingTime"),
  spellMechanicsHeaderPath("family"),
];

function activationPaths(
  effectCount: number,
  repeatCount: number,
): readonly ReturnType<typeof spellActivationPhasePath>[] {
  return [
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    ...Array.from({ length: effectCount }, (_, index) =>
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
    ...Array.from({ length: repeatCount }, (_, index) =>
      spellActivationRepeatPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
  ];
}

describe("SR-04G-B3 static spell procedure admission", () => {
  test.each([
    [
      "grantedAreaSaveDamageAction",
      grantedAreaSaveDamageActionProfile,
      "dragons_breath",
      [
        ...headers,
        spellDurationValuePath(),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
      ],
    ],
    [
      "stagedSaveCondition",
      stagedSaveConditionProfile,
      "sleep",
      [
        ...headers,
        spellDurationValuePath(),
        spellDurationEndingPath(PositiveInteger(1)),
        ...activationPaths(2, 1),
      ],
    ],
    [
      "saveGatedConditionWithRepeat",
      saveGatedConditionWithRepeatProfile,
      "hideous_laughter",
      [...headers, spellDurationValuePath(), ...activationPaths(3, 2)],
    ],
    [
      "saveGatedTurnConstraintBundle",
      saveGatedTurnConstraintBundleProfile,
      "slow",
      [...headers, spellDurationValuePath(), ...activationPaths(7, 1)],
    ],
  ] as const)(
    "admits %s with complete non-root evidence",
    (_name, profile, spellId, expected) => {
      const result = profile.admitMechanics(mechanicsSource(spellId));
      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") return;
      expect(result.admitted.evidence).toEqual({
        consumed: expected,
        unowned: [],
      });
    },
  );

  test("projects every Dragon's Breath execution fact instead of recomputing it", () => {
    const result = grantedAreaSaveDamageActionProfile.admitMechanics(
      mechanicsSource("dragons_breath"),
    );
    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      ability: "dex",
      rangeFeet: 5,
      durationTicks: 10,
      coneLengthFeet: 15,
      damageTypeChoices: ["acid", "cold", "fire", "lightning", "poison"],
      damage: {
        baseDice: 3,
        dieSize: 6,
        perSlotDice: 1,
        startingAtLevel: 2,
      },
    });
  });

  test("projects Sleep, Hideous Laughter, and Slow facts into immutable carriers", () => {
    const sleep = stagedSaveConditionProfile.admitMechanics(
      mechanicsSource("sleep"),
    );
    const laughter = saveGatedConditionWithRepeatProfile.admitMechanics(
      mechanicsSource("hideous_laughter"),
    );
    const slow = saveGatedTurnConstraintBundleProfile.admitMechanics(
      mechanicsSource("slow"),
    );

    expect(sleep).toMatchObject({
      tag: "supported",
      admitted: {
        facts: {
          ability: "wis",
          rangeFeet: 60,
          durationTicks: 10,
          targeting: { kind: "pointOriginSphere", radiusFeet: 5 },
        },
      },
    });
    expect(laughter).toMatchObject({
      tag: "supported",
      admitted: {
        facts: {
          ability: "wis",
          rangeFeet: 30,
          durationTicks: 10,
          targeting: {
            kind: "targetList",
            count: { base: 1, baseLevel: 1, perSlotAboveBase: 1 },
          },
        },
      },
    });
    expect(slow).toMatchObject({
      tag: "supported",
      admitted: {
        facts: {
          ability: "wis",
          rangeFeet: 120,
          durationTicks: 10,
          maxTargets: 6,
          constraints: {
            speedRatio: { numerator: 1, denominator: 2 },
            armorClassDelta: -2,
            dexteritySavingThrowDelta: -2,
            restrictsReactions: true,
            actionOrBonusActionChoice: true,
            maxAttacks: 1,
            somaticFailurePercent: 25,
          },
        },
      },
    });
  });

  test("keeps static facts and evidence invariant under authored renaming", () => {
    const cases = [
      [grantedAreaSaveDamageActionProfile, "dragons_breath"],
      [stagedSaveConditionProfile, "sleep"],
      [saveGatedConditionWithRepeatProfile, "hideous_laughter"],
      [saveGatedTurnConstraintBundleProfile, "slow"],
    ] as const;
    for (const [profile, spellId] of cases) {
      const original = spellRecord(spellId);
      const renamed = decodeSpellRecordForTest({
        ...original,
        id: unitId(`synthetic_b3_renamed_${spellId}`),
        name: "Synthetic Renamed Spell",
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_b3_renamed_${spellId}`,
        },
      });
      const originalResult = profile.admitMechanics(mechanicsSource(spellId));
      const renamedSource = spellAdmissionSource(renamed);
      const renamedResult = profile.admitMechanics({
        mechanics: renamedSource.mechanics,
        spellDefinitionRuleFacts: renamedSource.spellDefinitionRuleFacts,
      });
      expect(originalResult.tag).toBe("supported");
      expect(renamedResult.tag).toBe("supported");
      if (
        originalResult.tag !== "supported" ||
        renamedResult.tag !== "supported"
      ) {
        continue;
      }
      expect(renamedResult.admitted.facts).toEqual(
        originalResult.admitted.facts,
      );
      expect(renamedResult.admitted.evidence).toEqual(
        originalResult.admitted.evidence,
      );
    }
  });

  test("does not claim sibling save-gate or ongoing shapes", () => {
    expect(
      stagedSaveConditionProfile.admitMechanics(
        mechanicsSource("hideous_laughter"),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      saveGatedConditionWithRepeatProfile.admitMechanics(
        mechanicsSource("sleep"),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      saveGatedTurnConstraintBundleProfile.admitMechanics(
        mechanicsSource("hypnotic_pattern"),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      grantedAreaSaveDamageActionProfile.admitMechanics(
        mechanicsSource("haste"),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test("accumulates independent Sleep header and phase failures at stable paths", () => {
    const base = spellRecord("sleep");
    if (
      base.mechanics.family !== "activation" ||
      base.mechanics.phases[0]?.kind !== "save_gate"
    ) {
      throw new Error("Expected Sleep save-gate mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: unitId("synthetic_b3_sleep_multiple_failures"),
      name: "Synthetic Sleep Multiple Failures",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_b3_sleep_multiple_failures",
      },
      mechanics: {
        ...base.mechanics,
        level: 2,
        range: { kind: "self" },
        phases: [{ ...base.mechanics.phases[0], ability: "str" }],
      },
    });
    const result = stagedSaveConditionProfile.admitMechanics({
      mechanics: malformed.mechanics,
      spellDefinitionRuleFacts:
        spellAdmissionSource(malformed).spellDefinitionRuleFacts,
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
        failedFact: "phaseAbility",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      },
    ]);
  });

  test("matches reordered composite effects and reports duplicate witnesses at actual ordinals", () => {
    const base = spellRecord("slow");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected Slow composite save-gate mechanics.");
    }
    const phaseCandidate = base.mechanics.phases[0];
    if (
      phaseCandidate?.kind !== "save_gate" ||
      phaseCandidate.onFail.kind !== "composite"
    ) {
      throw new Error("Expected Slow composite save-gate mechanics.");
    }
    const phase = phaseCandidate;
    const failedEffects =
      phase.onFail.kind === "composite" ? phase.onFail.effects : undefined;
    if (failedEffects === undefined) {
      throw new Error("Expected Slow composite failed-save effects.");
    }
    const reordered = decodeSpellRecordForTest({
      ...base,
      id: unitId("synthetic_b3_slow_reordered"),
      name: "Synthetic Reordered Slow",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_b3_slow_reordered",
      },
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            onFail: {
              ...phase.onFail,
              effects: [...failedEffects].reverse(),
            },
          },
        ],
      },
    });
    expect(
      saveGatedTurnConstraintBundleProfile.admitMechanics({
        mechanics: reordered.mechanics,
        spellDefinitionRuleFacts:
          spellAdmissionSource(reordered).spellDefinitionRuleFacts,
      }).tag,
    ).toBe("supported");

    const duplicate = decodeSpellRecordForTest({
      ...base,
      id: unitId("synthetic_b3_slow_duplicate"),
      name: "Synthetic Duplicate Slow",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_b3_slow_duplicate",
      },
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            onFail: {
              ...phase.onFail,
              effects: [failedEffects[0], ...failedEffects],
            },
          },
        ],
      },
    });
    const duplicateResult = saveGatedTurnConstraintBundleProfile.admitMechanics(
      {
        mechanics: duplicate.mechanics,
        spellDefinitionRuleFacts:
          spellAdmissionSource(duplicate).spellDefinitionRuleFacts,
      },
    );
    expect(duplicateResult.tag).toBe("unsupported");
    if (duplicateResult.tag !== "unsupported") return;
    expect(duplicateResult.issues).toContainEqual(
      expect.objectContaining({
        failedFact: "extraFailedSaveEffect",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(2),
        ),
      }),
    );
  });
});
