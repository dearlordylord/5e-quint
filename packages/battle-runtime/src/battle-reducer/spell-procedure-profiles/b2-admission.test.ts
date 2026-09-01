import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import { PositiveInteger } from "@dnd/shared/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";

import {
  battleSpellExecutionSourceFromAdmission,
  type BattleCreatureState,
  type BattleSpellAdmissionSource,
} from "../../battle-state-execution.ts";
import { spellAdmissionContextFor } from "./admission-context.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import { spellCasterId } from "../../unit-profile-admission-catalog.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { saveGatedAreaControlProfile } from "./area-control-condition.ts";
import { grantedAlternateActionCostProfile } from "./bonus-action-dash.ts";
import { chosenDamageResistanceProfile } from "./chosen-damage-resistance.ts";
import { conditionRemovalProtectionProfile } from "./condition-removal-protection.ts";
import { fixedCostMovementReplacementProfile } from "./fixed-cost-movement-replacement.ts";
import { persistentAreaDurationChildPaths } from "./persistent-area-save-evidence.ts";
import {
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  type SpellMechanicsAdmissionSource,
} from "./spell-mechanics-admission.ts";

function mechanicsSource(
  source: BattleSpellAdmissionSource,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function coordinate(
  path: SpellMechanicsBranchPath | UnitMechanicsPath,
): string {
  return path.nodes
    .map((node) =>
      node.kind === "singleton"
        ? node.role
        : `${node.role}:${String(node.ordinal)}`,
    )
    .join("/");
}

function spellAdmissionActor(): BattleCreatureState {
  const actor = spellBattle({
    preparedSpells: [],
    spellSlots: [{ spellLevel: 3, count: 1 }],
  }).state.combatants.get(spellCasterId);
  if (actor === undefined) {
    throw new Error("Expected a spell-admission caster fixture.");
  }
  return actor;
}

describe("SR-04G-B static spell procedure admission", () => {
  test("supports each B2 fixture with exact complete-root evidence", () => {
    const cases = [
      {
        result: saveGatedAreaControlProfile.admitMechanics(
          mechanicsSource(
            spellAdmissionSource(spellRecord("hypnotic_pattern")),
          ),
        ),
        expected: [
          spellMechanicsHeaderPath("level"),
          spellMechanicsHeaderPath("school"),
          spellMechanicsHeaderPath("range"),
          spellMechanicsHeaderPath("components"),
          spellMechanicsHeaderPath("duration"),
          spellMechanicsHeaderPath("castingTime"),
          spellMechanicsHeaderPath("family"),
          spellDurationValuePath(),
          spellDurationEndingPath(PositiveInteger(1)),
          spellActivationPhasePath(PositiveInteger(1)),
          spellActivationAttachmentPath(PositiveInteger(1)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(2)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(3)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(4)),
        ],
        durationTicks: 10,
      },
      {
        result: grantedAlternateActionCostProfile.admitMechanics(
          mechanicsSource(
            spellAdmissionSource(spellRecord("expeditious_retreat")),
          ),
        ),
        expected: [
          spellMechanicsHeaderPath("level"),
          spellMechanicsHeaderPath("school"),
          spellMechanicsHeaderPath("range"),
          spellMechanicsHeaderPath("components"),
          spellMechanicsHeaderPath("duration"),
          spellMechanicsHeaderPath("castingTime"),
          spellMechanicsHeaderPath("family"),
          spellDurationValuePath(),
          spellOngoingAttachmentPath(),
          spellOngoingInitialPhasePath(),
          spellOngoingOperationPath(PositiveInteger(1)),
          spellOngoingOperationEffectPath(PositiveInteger(1)),
        ],
        durationTicks: 100,
      },
      {
        result: chosenDamageResistanceProfile.admitMechanics(
          mechanicsSource(
            spellAdmissionSource(spellRecord("protection_from_energy")),
          ),
        ),
        expected: [
          spellMechanicsHeaderPath("level"),
          spellMechanicsHeaderPath("school"),
          spellMechanicsHeaderPath("range"),
          spellMechanicsHeaderPath("components"),
          spellMechanicsHeaderPath("duration"),
          spellMechanicsHeaderPath("castingTime"),
          spellMechanicsHeaderPath("family"),
          spellDurationValuePath(),
          spellActivationPhasePath(PositiveInteger(1)),
          spellActivationAttachmentPath(PositiveInteger(1)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        ],
        durationTicks: 600,
      },
      {
        result: conditionRemovalProtectionProfile.admitMechanics(
          mechanicsSource(
            spellAdmissionSource(spellRecord("protection_from_poison")),
          ),
        ),
        expected: [
          spellMechanicsHeaderPath("level"),
          spellMechanicsHeaderPath("school"),
          spellMechanicsHeaderPath("range"),
          spellMechanicsHeaderPath("components"),
          spellMechanicsHeaderPath("duration"),
          spellMechanicsHeaderPath("castingTime"),
          spellMechanicsHeaderPath("family"),
          spellDurationValuePath(),
          spellActivationPhasePath(PositiveInteger(1)),
          spellActivationAttachmentPath(PositiveInteger(1)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(2)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(3)),
        ],
        durationTicks: 600,
      },
      {
        result: fixedCostMovementReplacementProfile.admitMechanics(
          mechanicsSource(spellAdmissionSource(spellRecord("jump"))),
        ),
        expected: [
          spellMechanicsHeaderPath("level"),
          spellMechanicsHeaderPath("school"),
          spellMechanicsHeaderPath("range"),
          spellMechanicsHeaderPath("components"),
          spellMechanicsHeaderPath("duration"),
          spellMechanicsHeaderPath("castingTime"),
          spellMechanicsHeaderPath("family"),
          spellDurationValuePath(),
          spellActivationPhasePath(PositiveInteger(1)),
          spellActivationAttachmentPath(PositiveInteger(1)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        ],
        durationTicks: 10,
      },
    ] as const;

    for (const { result, expected, durationTicks } of cases) {
      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") continue;
      expect(result.admitted.evidence).toEqual({
        consumed: expected,
        unowned: [],
      });
      expect(result.admitted.facts).not.toHaveProperty("rangeFeet");
      expect("durationTicks" in result.admitted.facts).toBe(true);
      if ("durationTicks" in result.admitted.facts) {
        expect(Number(result.admitted.facts.durationTicks)).toBe(durationTicks);
      }
    }
  });

  test("keeps static facts and evidence invariant under synthetic renaming", () => {
    const cases = [
      [saveGatedAreaControlProfile, "hypnotic_pattern"],
      [grantedAlternateActionCostProfile, "expeditious_retreat"],
      [chosenDamageResistanceProfile, "protection_from_energy"],
      [conditionRemovalProtectionProfile, "protection_from_poison"],
      [fixedCostMovementReplacementProfile, "jump"],
    ] as const;

    for (const [profile, spellId] of cases) {
      const original = spellRecord(spellId);
      const renamed = decodeSpellRecordForTest({
        ...original,
        id: unitId(`synthetic_renamed_${spellId}`),
        name: "Synthetic Renamed Spell",
      });
      const originalResult = profile.admitMechanics(
        mechanicsSource(spellAdmissionSource(original)),
      );
      const renamedResult = profile.admitMechanics(
        mechanicsSource(spellAdmissionSource(renamed)),
      );
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

  test("does not claim sibling spell shapes", () => {
    expect(
      saveGatedAreaControlProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(spellRecord("hold_person"))),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      grantedAlternateActionCostProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(spellRecord("haste"))),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      chosenDamageResistanceProfile.admitMechanics(
        mechanicsSource(
          spellAdmissionSource(spellRecord("protection_from_poison")),
        ),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      conditionRemovalProtectionProfile.admitMechanics(
        mechanicsSource(
          spellAdmissionSource(spellRecord("protection_from_energy")),
        ),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      fixedCostMovementReplacementProfile.admitMechanics(
        mechanicsSource(
          spellAdmissionSource(spellRecord("expeditious_retreat")),
        ),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test("accumulates independent unsupported facts at their canonical paths", () => {
    const area = spellRecord("hypnotic_pattern");
    if (
      area.mechanics.family !== "activation" ||
      area.mechanics.phases[0]?.kind !== "save_gate"
    ) {
      throw new Error("Expected Hypnotic Pattern save-gate mechanics.");
    }
    const areaPhase = area.mechanics.phases[0];
    const areaResult = saveGatedAreaControlProfile.admitMechanics(
      mechanicsSource(
        spellAdmissionSource(
          decodeSpellRecordForTest({
            ...area,
            mechanics: {
              ...area.mechanics,
              level: 2,
              phases: [{ ...areaPhase, ability: "con" }],
            },
          }),
        ),
      ),
    );
    expect(areaResult.tag).toBe("unsupported");
    if (areaResult.tag === "unsupported") {
      expect(
        areaResult.issues.map((issue) => [
          issue.failedFact,
          coordinate(issue.mechanicsPath),
        ]),
      ).toEqual([
        ["level", coordinate(spellMechanicsHeaderPath("level"))],
        [
          "phaseAbility",
          coordinate(spellActivationPhasePath(PositiveInteger(1))),
        ],
      ]);
    }

    const energy = spellRecord("protection_from_energy");
    if (energy.mechanics.family !== "activation") {
      throw new Error("Expected Protection from Energy activation mechanics.");
    }
    const energyResult = chosenDamageResistanceProfile.admitMechanics(
      mechanicsSource(
        spellAdmissionSource(
          decodeSpellRecordForTest({
            ...energy,
            mechanics: {
              ...energy.mechanics,
              level: 2,
              range: { kind: "self" },
            },
          }),
        ),
      ),
    );
    expect(energyResult.tag).toBe("unsupported");
    if (energyResult.tag === "unsupported") {
      expect(
        energyResult.issues.map((issue) => [
          issue.failedFact,
          coordinate(issue.mechanicsPath),
        ]),
      ).toEqual([
        ["level", coordinate(spellMechanicsHeaderPath("level"))],
        ["range", coordinate(spellMechanicsHeaderPath("range"))],
      ]);
    }
  });

  test("keeps the dash profile represented when either identifying witness remains", () => {
    const expeditious = spellRecord("expeditious_retreat");
    if (
      expeditious.mechanics.family !== "ongoing_effect" ||
      expeditious.mechanics.initialPhase?.kind !== "direct"
    ) {
      throw new Error("Expected Expeditious Retreat ongoing mechanics.");
    }
    const initialPhase = expeditious.mechanics.initialPhase;
    const operation = expeditious.mechanics.operations[0];
    if (operation === undefined || initialPhase.effects === undefined) {
      throw new Error("Expected Expeditious Retreat witnesses.");
    }

    const malformedInitialEffect = decodeSpellRecordForTest({
      ...expeditious,
      mechanics: {
        ...expeditious.mechanics,
        initialPhase: {
          ...initialPhase,
          effects: [{ kind: "end_current_effect" }],
        },
      },
    });
    const malformedInitialResult =
      grantedAlternateActionCostProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(malformedInitialEffect)),
      );
    expect(malformedInitialResult.tag).toBe("unsupported");
    if (malformedInitialResult.tag === "unsupported") {
      expect(malformedInitialResult.issues).toEqual([
        expect.objectContaining({
          failedFact: "initialEffect",
          mechanicsPath: spellOngoingInitialPhasePath(),
        }),
      ]);
    }

    const malformedOperation = decodeSpellRecordForTest({
      ...expeditious,
      mechanics: {
        ...expeditious.mechanics,
        operations: [
          {
            ...operation,
            trigger: {
              kind: "on_attached_spends_action",
              cost: { kind: "action" },
            },
          },
        ],
      },
    });
    const malformedOperationResult =
      grantedAlternateActionCostProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(malformedOperation)),
      );
    expect(malformedOperationResult.tag).toBe("unsupported");
    if (malformedOperationResult.tag === "unsupported") {
      expect(malformedOperationResult.issues).toEqual([
        expect.objectContaining({
          failedFact: "operation",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
        }),
      ]);
    }

    const { initialPhase: _initialPhase, ...mechanicsWithoutInitialPhase } =
      expeditious.mechanics;
    const missingInitialPhase = decodeSpellRecordForTest({
      ...expeditious,
      mechanics: mechanicsWithoutInitialPhase,
    });
    const missingInitialResult =
      grantedAlternateActionCostProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(missingInitialPhase)),
      );
    expect(missingInitialResult.tag).toBe("unsupported");
    if (missingInitialResult.tag === "unsupported") {
      expect(missingInitialResult.issues).toEqual([
        expect.objectContaining({
          failedFact: "initialPhase",
          mechanicsPath: spellOngoingInitialPhasePath(),
        }),
      ]);
    }
  });

  test("matches composite roles independent of authored effect order", () => {
    const area = spellRecord("hypnotic_pattern");
    if (area.mechanics.family !== "activation") {
      throw new Error("Expected Hypnotic Pattern activation mechanics.");
    }
    const areaPhase = area.mechanics.phases[0];
    if (
      areaPhase?.kind !== "save_gate" ||
      areaPhase.onFail.kind !== "composite"
    ) {
      throw new Error(
        "Expected Hypnotic Pattern composite save-gate mechanics.",
      );
    }
    const areaEffects = areaPhase.onFail.effects;
    const reorderedArea = decodeSpellRecordForTest({
      ...area,
      mechanics: {
        ...area.mechanics,
        phases: [
          {
            ...areaPhase,
            onFail: {
              ...areaPhase.onFail,
              effects: [
                areaEffects[3],
                areaEffects[1],
                areaEffects[0],
                areaEffects[2],
              ],
            },
          },
        ],
      },
    });
    const areaResult = saveGatedAreaControlProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(reorderedArea)),
    );
    expect(areaResult.tag).toBe("supported");
    if (areaResult.tag === "supported") {
      expect(areaResult.admitted.evidence.consumed).toContainEqual(
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      );
      expect(areaResult.admitted.evidence.consumed).toContainEqual(
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(4)),
      );
    }
    const malformedReorderedArea = decodeSpellRecordForTest({
      ...area,
      mechanics: {
        ...area.mechanics,
        phases: [
          {
            ...areaPhase,
            onFail: {
              ...areaPhase.onFail,
              effects: [
                areaEffects[3],
                { kind: "end_current_effect" },
                areaEffects[0],
                areaEffects[2],
              ],
            },
          },
        ],
      },
    });
    const malformedAreaResult = saveGatedAreaControlProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(malformedReorderedArea)),
    );
    expect(malformedAreaResult.tag).toBe("unsupported");
    if (malformedAreaResult.tag === "unsupported") {
      expect(malformedAreaResult.issues).toEqual([
        expect.objectContaining({
          failedFact: "failedSaveEffect",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(2),
          ),
        }),
      ]);
    }

    const protection = spellRecord("protection_from_poison");
    if (
      protection.mechanics.family !== "activation" ||
      protection.mechanics.phases[0]?.kind !== "direct"
    ) {
      throw new Error("Expected Protection from Poison direct mechanics.");
    }
    const protectionPhase = protection.mechanics.phases[0];
    const outerEffect = protectionPhase.effects?.[0];
    if (outerEffect?.kind !== "composite") {
      throw new Error("Expected Protection from Poison composite mechanics.");
    }
    const protectionEffects = outerEffect.effects;
    const reorderedProtection = decodeSpellRecordForTest({
      ...protection,
      mechanics: {
        ...protection.mechanics,
        phases: [
          {
            ...protectionPhase,
            effects: [
              {
                ...outerEffect,
                effects: [
                  protectionEffects[2],
                  protectionEffects[0],
                  protectionEffects[1],
                ],
              },
            ],
          },
        ],
      },
    });
    const protectionResult = conditionRemovalProtectionProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(reorderedProtection)),
    );
    expect(protectionResult.tag).toBe("supported");
    if (protectionResult.tag === "supported") {
      expect(protectionResult.admitted.evidence.consumed).toContainEqual(
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      );
      expect(protectionResult.admitted.evidence.consumed).toContainEqual(
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(3)),
      );
      expect("protection" in protectionResult.admitted.facts).toBe(true);
      if ("protection" in protectionResult.admitted.facts) {
        expect(protectionResult.admitted.facts.protection).toEqual({
          condition: "poisoned",
          damageType: "poison",
        });
      }
    }
    const malformedReorderedProtection = decodeSpellRecordForTest({
      ...protection,
      mechanics: {
        ...protection.mechanics,
        phases: [
          {
            ...protectionPhase,
            effects: [
              {
                ...outerEffect,
                effects: [
                  protectionEffects[2],
                  { kind: "remove_condition", condition: "blinded" },
                  protectionEffects[1],
                ],
              },
            ],
          },
        ],
      },
    });
    const malformedProtectionResult =
      conditionRemovalProtectionProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(malformedReorderedProtection)),
      );
    expect(malformedProtectionResult.tag).toBe("unsupported");
    if (malformedProtectionResult.tag === "unsupported") {
      expect(malformedProtectionResult.issues).toEqual([
        expect.objectContaining({
          failedFact: "conditionRemoval",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(2),
          ),
        }),
      ]);
    }

    const malformedReorderedSaveRoll = decodeSpellRecordForTest({
      ...protection,
      mechanics: {
        ...protection.mechanics,
        phases: [
          {
            ...protectionPhase,
            effects: [
              {
                ...outerEffect,
                effects: [
                  protectionEffects[2],
                  { ...protectionEffects[1], mode: "disadvantage" },
                  protectionEffects[0],
                ],
              },
            ],
          },
        ],
      },
    });
    const malformedSaveRollResult =
      conditionRemovalProtectionProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(malformedReorderedSaveRoll)),
      );
    expect(malformedSaveRollResult.tag).toBe("unsupported");
    if (malformedSaveRollResult.tag === "unsupported") {
      expect(malformedSaveRollResult.issues).toEqual([
        expect.objectContaining({
          failedFact: "conditionSaveRollMode",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(2),
          ),
        }),
      ]);
    }
  });

  test("retains area ownership when either failed-save witness is malformed", () => {
    const hypnoticPattern = spellRecord("hypnotic_pattern");
    if (hypnoticPattern.mechanics.family !== "activation") {
      throw new Error("Expected Hypnotic Pattern activation mechanics.");
    }
    const phase = hypnoticPattern.mechanics.phases[0];
    if (phase?.kind !== "save_gate" || phase.onFail.kind !== "composite") {
      throw new Error("Expected Hypnotic Pattern save-gate mechanics.");
    }
    const effects = phase.onFail.effects;
    const malformedShake = decodeSpellRecordForTest({
      ...hypnoticPattern,
      mechanics: {
        ...hypnoticPattern.mechanics,
        phases: [
          {
            ...phase,
            onFail: {
              ...phase.onFail,
              effects: [...effects.slice(0, 3), { kind: "end_current_effect" }],
            },
          },
        ],
      },
    });
    const malformedShakeResult = saveGatedAreaControlProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(malformedShake)),
    );
    expect(malformedShakeResult.tag).toBe("unsupported");
    if (malformedShakeResult.tag === "unsupported") {
      expect(malformedShakeResult.issues).toEqual([
        expect.objectContaining({
          failedFact: "failedSaveEffect",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(4),
          ),
        }),
      ]);
    }

    const malformedCondition = decodeSpellRecordForTest({
      ...hypnoticPattern,
      mechanics: {
        ...hypnoticPattern.mechanics,
        phases: [
          {
            ...phase,
            onFail: {
              ...phase.onFail,
              effects: [{ kind: "end_current_effect" }, ...effects.slice(1)],
            },
          },
        ],
      },
    });
    const malformedConditionResult = saveGatedAreaControlProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(malformedCondition)),
    );
    expect(malformedConditionResult.tag).toBe("unsupported");
    if (malformedConditionResult.tag === "unsupported") {
      expect(malformedConditionResult.issues).toEqual([
        expect.objectContaining({
          failedFact: "failedSaveEffect",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(1),
          ),
        }),
      ]);
    }

    const missingShake = decodeSpellRecordForTest({
      ...hypnoticPattern,
      mechanics: {
        ...hypnoticPattern.mechanics,
        phases: [
          {
            ...phase,
            onFail: {
              ...phase.onFail,
              effects: effects.slice(0, 3),
            },
          },
        ],
      },
    });
    const missingShakeResult = saveGatedAreaControlProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(missingShake)),
    );
    expect(missingShakeResult.tag).toBe("unsupported");
    if (missingShakeResult.tag === "unsupported") {
      expect(missingShakeResult.issues).toEqual([
        expect.objectContaining({
          failedFact: "failedSaveEffect",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(4),
          ),
        }),
      ]);
    }
  });

  test("requires one target-damage duration ending and deduplicates missing branches", () => {
    const hypnoticPattern = spellRecord("hypnotic_pattern");
    if (
      hypnoticPattern.mechanics.family !== "activation" ||
      hypnoticPattern.mechanics.duration.kind !== "concentration"
    ) {
      throw new Error("Expected Hypnotic Pattern concentration mechanics.");
    }
    const duration = hypnoticPattern.mechanics.duration;
    const duplicateTargetEnding = decodeSpellRecordForTest({
      ...hypnoticPattern,
      mechanics: {
        ...hypnoticPattern.mechanics,
        duration: {
          ...duration,
          earlyEnd: [
            ...(duration.earlyEnd ?? []),
            { kind: "target_takes_damage" },
          ],
        },
      },
    });
    const duplicateResult = saveGatedAreaControlProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(duplicateTargetEnding)),
    );
    expect(duplicateResult.tag).toBe("unsupported");
    if (duplicateResult.tag === "unsupported") {
      expect(duplicateResult.issues).toEqual([
        expect.objectContaining({
          failedFact: "durationEnding",
          mechanicsPath: spellDurationEndingPath(PositiveInteger(2)),
        }),
      ]);
    }

    const maintainedPermanent = decodeSpellRecordForTest({
      ...hypnoticPattern,
      mechanics: {
        ...hypnoticPattern.mechanics,
        duration: {
          kind: "concentration",
          upTo: duration.upTo,
          permanentIfMaintainedFull: true,
        },
      },
    });
    const maintainedPermanentResult =
      saveGatedAreaControlProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(maintainedPermanent)),
      );
    expect(maintainedPermanentResult.tag).toBe("unsupported");
    if (maintainedPermanentResult.tag === "unsupported") {
      expect(maintainedPermanentResult.issues).toEqual([
        expect.objectContaining({
          failedFact: "durationEnding",
          mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
        }),
      ]);
    }
  });

  test("keeps slot-tiered duration evidence at top-level coordinates", () => {
    const jump = spellRecord("jump");
    if (
      jump.mechanics.family !== "activation" ||
      jump.mechanics.duration.kind !== "timed"
    ) {
      throw new Error("Expected Jump timed activation mechanics.");
    }
    const slotTieredSpell = decodeSpellRecordForTest({
      ...jump,
      mechanics: {
        ...jump.mechanics,
        duration: {
          kind: "slot_tiered",
          base: jump.mechanics.duration,
          tiers: [
            {
              atSlot: 2,
              duration: jump.mechanics.duration,
            },
          ],
        },
      },
    });
    if (slotTieredSpell.mechanics.duration.kind !== "slot_tiered") {
      throw new Error("Expected slot-tiered duration mechanics.");
    }
    const children = spellDurationChildCoordinates(
      slotTieredSpell.mechanics.duration,
    );
    expect(children).toEqual([
      { branch: "extension", ordinal: PositiveInteger(1) },
    ]);
    expect(children.map(spellDurationChildPath)).toEqual([
      spellDurationExtensionPath(PositiveInteger(1)),
    ]);
    expect(
      spellDurationEvidencePaths(slotTieredSpell.mechanics.duration),
    ).toEqual([
      spellDurationValuePath(),
      spellDurationExtensionPath(PositiveInteger(1)),
    ]);
  });

  test("projects concentration upcast duration children through C1 evidence", () => {
    const hypnoticPattern = spellRecord("hypnotic_pattern");
    if (
      hypnoticPattern.mechanics.family !== "activation" ||
      hypnoticPattern.mechanics.duration.kind !== "concentration"
    ) {
      throw new Error("Expected Hypnotic Pattern concentration mechanics.");
    }
    const duration = decodeSpellRecordForTest({
      ...hypnoticPattern,
      mechanics: {
        ...hypnoticPattern.mechanics,
        duration: {
          ...hypnoticPattern.mechanics.duration,
          upTo: {
            ...hypnoticPattern.mechanics.duration.upTo,
            upcastTiers: [{ atSlot: 4, amount: 2 }],
          },
          earlyEnd: [{ kind: "target_takes_damage" }],
        },
      },
    }).mechanics.duration;
    expect(persistentAreaDurationChildPaths(duration)).toEqual([
      spellDurationExtensionPath(PositiveInteger(1)),
      spellDurationEndingPath(PositiveInteger(1)),
    ]);
  });

  test("rejects unprojected area attachment constraints at the attachment path", () => {
    const hypnoticPattern = spellRecord("hypnotic_pattern");
    if (hypnoticPattern.mechanics.family !== "activation") {
      throw new Error("Expected Hypnotic Pattern activation mechanics.");
    }
    const phase = hypnoticPattern.mechanics.phases[0];
    if (
      phase?.kind !== "save_gate" ||
      phase.attachment.kind !== "hole" ||
      phase.attachment.value.kind !== "area"
    ) {
      throw new Error("Expected Hypnotic Pattern area attachment.");
    }
    const attachment = phase.attachment;
    const variants = [
      { selection: { mode: "one" } },
      { occupantDispositionFilter: "friendly_to_source" },
      {
        excludedAreas: {
          chooser: "caster",
          count: "one_or_more",
          size: "any",
        },
      },
      { rangeOrigin: "caster" },
    ] as const;
    for (const variant of variants) {
      const malformed = decodeSpellRecordForTest({
        ...hypnoticPattern,
        mechanics: {
          ...hypnoticPattern.mechanics,
          phases: [
            {
              ...phase,
              attachment: {
                ...attachment,
                value: { ...attachment.value, ...variant },
              },
            },
          ],
        },
      });
      const result = saveGatedAreaControlProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(malformed)),
      );
      expect(result.tag).toBe("unsupported");
      if (result.tag === "unsupported") {
        expect(result.issues).toEqual([
          expect.objectContaining({
            failedFact: "attachment",
            mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
          }),
        ]);
      }
    }
  });

  test("rejects unprojected target-selection filters at the attachment path", () => {
    const targetSelectionVariants = [
      { typeFilter: ["humanoid"] },
      { stateFilter: ["dead"] },
      { visibility: "caster_can_see" },
    ] as const;

    const energy = spellRecord("protection_from_energy");
    if (
      energy.mechanics.family !== "activation" ||
      energy.mechanics.phases[0]?.kind !== "direct"
    ) {
      throw new Error("Expected Protection from Energy direct mechanics.");
    }
    const energyPhase = energy.mechanics.phases[0];
    if (
      energyPhase.attachment.kind !== "hole" ||
      energyPhase.attachment.value.kind !== "target"
    ) {
      throw new Error("Expected Protection from Energy target attachment.");
    }
    for (const variant of targetSelectionVariants) {
      const malformed = decodeSpellRecordForTest({
        ...energy,
        mechanics: {
          ...energy.mechanics,
          phases: [
            {
              ...energyPhase,
              attachment: {
                ...energyPhase.attachment,
                value: {
                  ...energyPhase.attachment.value,
                  selection: {
                    ...energyPhase.attachment.value.selection,
                    ...variant,
                  },
                },
              },
            },
          ],
        },
      });
      const result = chosenDamageResistanceProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(malformed)),
      );
      expect(result.tag).toBe("unsupported");
      if (result.tag === "unsupported") {
        expect(result.issues).toEqual([
          expect.objectContaining({
            failedFact: "attachment",
            mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
          }),
        ]);
      }
    }

    const protection = spellRecord("protection_from_poison");
    if (
      protection.mechanics.family !== "activation" ||
      protection.mechanics.phases[0]?.kind !== "direct"
    ) {
      throw new Error("Expected Protection from Poison direct mechanics.");
    }
    const protectionPhase = protection.mechanics.phases[0];
    if (
      protectionPhase.attachment.kind !== "hole" ||
      protectionPhase.attachment.value.kind !== "target"
    ) {
      throw new Error("Expected Protection from Poison target attachment.");
    }
    const conditionSelectionVariants = [
      { mode: "one", typeFilter: ["humanoid"] },
      { mode: "one", targetKinds: ["creature"], stateFilter: ["dead"] },
      {
        mode: "one",
        targetKinds: ["creature"],
        disposition: "willing",
        visibility: "caster_can_see",
      },
      {
        mode: "one",
        targetKinds: ["creature"],
        creatureSizeFilter: { kind: "exact", creatureSize: "medium" },
      },
      {
        mode: "one",
        targetKinds: ["creature"],
        relativePosition: {
          kind: "within_feet_of_attachment",
          attachmentHoleId: protectionPhase.attachment.holeId,
          feet: 5,
        },
      },
    ] as const;
    for (const selection of conditionSelectionVariants) {
      const malformed = decodeSpellRecordForTest({
        ...protection,
        mechanics: {
          ...protection.mechanics,
          phases: [
            {
              ...protectionPhase,
              attachment: {
                ...protectionPhase.attachment,
                value: {
                  ...protectionPhase.attachment.value,
                  selection,
                },
              },
            },
          ],
        },
      });
      const result = conditionRemovalProtectionProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(malformed)),
      );
      expect(result.tag).toBe("unsupported");
      if (result.tag === "unsupported") {
        expect(result.issues).toEqual([
          expect.objectContaining({
            failedFact: "attachment",
            mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
          }),
        ]);
      }
    }

    const jump = spellRecord("jump");
    if (
      jump.mechanics.family !== "activation" ||
      jump.mechanics.phases[0]?.kind !== "direct"
    ) {
      throw new Error("Expected Jump direct mechanics.");
    }
    const jumpPhase = jump.mechanics.phases[0];
    if (
      jumpPhase.attachment.kind !== "hole" ||
      jumpPhase.attachment.value.kind !== "target"
    ) {
      throw new Error("Expected Jump target attachment.");
    }
    for (const variant of targetSelectionVariants) {
      const malformed = decodeSpellRecordForTest({
        ...jump,
        mechanics: {
          ...jump.mechanics,
          phases: [
            {
              ...jumpPhase,
              attachment: {
                ...jumpPhase.attachment,
                value: {
                  ...jumpPhase.attachment.value,
                  selection: {
                    ...jumpPhase.attachment.value.selection,
                    ...variant,
                  },
                },
              },
            },
          ],
        },
      });
      const result = fixedCostMovementReplacementProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(malformed)),
      );
      expect(result.tag).toBe("unsupported");
      if (result.tag === "unsupported") {
        expect(result.issues).toEqual([
          expect.objectContaining({
            failedFact: "attachment",
            mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
          }),
        ]);
      }
    }
  });

  test("rejects a target disposition constraint at the canonical attachment path", () => {
    const protection = spellRecord("protection_from_poison");
    if (
      protection.mechanics.family !== "activation" ||
      protection.mechanics.phases[0]?.kind !== "direct"
    ) {
      throw new Error("Expected Protection from Poison direct mechanics.");
    }
    const protectionPhase = protection.mechanics.phases[0];
    if (
      protectionPhase.attachment.kind !== "hole" ||
      protectionPhase.attachment.value.kind !== "target"
    ) {
      throw new Error("Expected Protection from Poison target attachment.");
    }
    const malformed = decodeSpellRecordForTest({
      ...protection,
      mechanics: {
        ...protection.mechanics,
        phases: [
          {
            ...protectionPhase,
            attachment: {
              ...protectionPhase.attachment,
              value: {
                ...protectionPhase.attachment.value,
                selection: {
                  mode: "one",
                  targetKinds: ["creature"],
                  disposition: "willing",
                },
              },
            },
          },
        ],
      },
    });
    const result = conditionRemovalProtectionProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(malformed)),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        {
          tag: "spellProcedureAdmissionIssue",
          procedure: "conditionRemovalProtection",
          failedFact: "attachment",
          mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
          message:
            "Unsupported conditionRemovalProtection mechanics fact: attachment.",
        },
      ],
    });
  });

  test("rejects target attachment spell-sensor range origins at the canonical path", () => {
    const attachmentPath = spellActivationAttachmentPath(PositiveInteger(1));

    const energy = spellRecord("protection_from_energy");
    if (
      energy.mechanics.family !== "activation" ||
      energy.mechanics.phases[0]?.kind !== "direct"
    ) {
      throw new Error("Expected Protection from Energy direct mechanics.");
    }
    const energyPhase = energy.mechanics.phases[0];
    if (
      energyPhase.attachment.kind !== "hole" ||
      energyPhase.attachment.value.kind !== "target"
    ) {
      throw new Error("Expected Protection from Energy target attachment.");
    }
    const energyResult = chosenDamageResistanceProfile.admitMechanics(
      mechanicsSource(
        spellAdmissionSource(
          decodeSpellRecordForTest({
            ...energy,
            mechanics: {
              ...energy.mechanics,
              phases: [
                {
                  ...energyPhase,
                  attachment: {
                    ...energyPhase.attachment,
                    value: {
                      ...energyPhase.attachment.value,
                      rangeOrigin: "spell_sensor",
                    },
                  },
                },
              ],
            },
          }),
        ),
      ),
    );
    expect(energyResult).toEqual({
      tag: "unsupported",
      issues: [
        {
          tag: "spellProcedureAdmissionIssue",
          procedure: "chosenDamageResistance",
          failedFact: "attachment",
          mechanicsPath: attachmentPath,
          message:
            "Unsupported chosenDamageResistance mechanics fact: attachment.",
        },
      ],
    });

    const protection = spellRecord("protection_from_poison");
    if (
      protection.mechanics.family !== "activation" ||
      protection.mechanics.phases[0]?.kind !== "direct"
    ) {
      throw new Error("Expected Protection from Poison direct mechanics.");
    }
    const protectionPhase = protection.mechanics.phases[0];
    if (
      protectionPhase.attachment.kind !== "hole" ||
      protectionPhase.attachment.value.kind !== "target"
    ) {
      throw new Error("Expected Protection from Poison target attachment.");
    }
    const protectionResult = conditionRemovalProtectionProfile.admitMechanics(
      mechanicsSource(
        spellAdmissionSource(
          decodeSpellRecordForTest({
            ...protection,
            mechanics: {
              ...protection.mechanics,
              phases: [
                {
                  ...protectionPhase,
                  attachment: {
                    ...protectionPhase.attachment,
                    value: {
                      ...protectionPhase.attachment.value,
                      rangeOrigin: "spell_sensor",
                    },
                  },
                },
              ],
            },
          }),
        ),
      ),
    );
    expect(protectionResult).toEqual({
      tag: "unsupported",
      issues: [
        {
          tag: "spellProcedureAdmissionIssue",
          procedure: "conditionRemovalProtection",
          failedFact: "attachment",
          mechanicsPath: attachmentPath,
          message:
            "Unsupported conditionRemovalProtection mechanics fact: attachment.",
        },
      ],
    });

    const jump = spellRecord("jump");
    if (
      jump.mechanics.family !== "activation" ||
      jump.mechanics.phases[0]?.kind !== "direct"
    ) {
      throw new Error("Expected Jump direct mechanics.");
    }
    const jumpPhase = jump.mechanics.phases[0];
    if (
      jumpPhase.attachment.kind !== "hole" ||
      jumpPhase.attachment.value.kind !== "target"
    ) {
      throw new Error("Expected Jump target attachment.");
    }
    const jumpResult = fixedCostMovementReplacementProfile.admitMechanics(
      mechanicsSource(
        spellAdmissionSource(
          decodeSpellRecordForTest({
            ...jump,
            mechanics: {
              ...jump.mechanics,
              phases: [
                {
                  ...jumpPhase,
                  attachment: {
                    ...jumpPhase.attachment,
                    value: {
                      ...jumpPhase.attachment.value,
                      rangeOrigin: "spell_sensor",
                    },
                  },
                },
              ],
            },
          }),
        ),
      ),
    );
    expect(jumpResult).toEqual({
      tag: "unsupported",
      issues: [
        {
          tag: "spellProcedureAdmissionIssue",
          procedure: "fixedCostMovementReplacement",
          failedFact: "attachment",
          mechanicsPath: attachmentPath,
          message:
            "Unsupported fixedCostMovementReplacement mechanics fact: attachment.",
        },
      ],
    });
  });

  test("retains every duration ending payload as a typed discriminant", () => {
    const jump = spellRecord("jump");
    const hypnoticPattern = spellRecord("hypnotic_pattern");
    if (
      jump.mechanics.family !== "activation" ||
      jump.mechanics.duration.kind !== "timed" ||
      hypnoticPattern.mechanics.family !== "activation" ||
      hypnoticPattern.mechanics.duration.kind !== "concentration"
    ) {
      throw new Error("Expected timed and concentration activation mechanics.");
    }
    const timedEarlyEnd = decodeSpellRecordForTest({
      ...jump,
      mechanics: {
        ...jump.mechanics,
        duration: {
          ...jump.mechanics.duration,
          earlyEnd: [{ kind: "target_takes_damage" }],
        },
      },
    });
    const timedPermanentAfter = decodeSpellRecordForTest({
      ...jump,
      mechanics: {
        ...jump.mechanics,
        duration: {
          ...jump.mechanics.duration,
          permanentAfter: {
            kind: "repeated_casts",
            cadence: "daily",
            count: 1,
            target: "same_target",
            endsOn: ["dispel"],
          },
        },
      },
    });
    const concentrationPermanent = decodeSpellRecordForTest({
      ...hypnoticPattern,
      mechanics: {
        ...hypnoticPattern.mechanics,
        duration: {
          kind: "concentration",
          upTo: hypnoticPattern.mechanics.duration.upTo,
          permanentIfMaintainedFull: true,
        },
      },
    });
    const permanentEndsOn = decodeSpellRecordForTest({
      ...jump,
      mechanics: {
        ...jump.mechanics,
        duration: { kind: "permanent", endsOn: ["dispel", "damage"] },
      },
    });

    expect(
      spellDurationChildCoordinates(timedEarlyEnd.mechanics.duration),
    ).toEqual([
      {
        branch: "ending",
        ordinal: PositiveInteger(1),
        ending: {
          kind: "earlyEnd",
          trigger: { kind: "target_takes_damage" },
        },
      },
    ]);
    expect(
      spellDurationChildCoordinates(timedPermanentAfter.mechanics.duration),
    ).toEqual([
      {
        branch: "ending",
        ordinal: PositiveInteger(1),
        ending: {
          kind: "permanentAfter",
          transition: {
            kind: "repeated_casts",
            cadence: "daily",
            count: 1,
            target: "same_target",
            endsOn: ["dispel"],
          },
        },
      },
    ]);
    expect(
      spellDurationChildCoordinates(concentrationPermanent.mechanics.duration),
    ).toEqual([
      {
        branch: "ending",
        ordinal: PositiveInteger(1),
        ending: {
          kind: "permanentIfMaintainedFull",
        },
      },
    ]);
    expect(
      spellDurationChildCoordinates(permanentEndsOn.mechanics.duration),
    ).toEqual([
      {
        branch: "ending",
        ordinal: PositiveInteger(1),
        ending: { kind: "endsOn", trigger: "dispel" },
      },
      {
        branch: "ending",
        ordinal: PositiveInteger(2),
        ending: { kind: "endsOn", trigger: "damage" },
      },
    ]);
  });

  test("binds contextual admissions to mechanics-free execution sources", () => {
    const cases = [
      [saveGatedAreaControlProfile, "hypnotic_pattern"],
      [grantedAlternateActionCostProfile, "expeditious_retreat"],
      [chosenDamageResistanceProfile, "protection_from_energy"],
      [conditionRemovalProtectionProfile, "protection_from_poison"],
      [fixedCostMovementReplacementProfile, "jump"],
    ] as const;
    const actor = spellAdmissionActor();
    const contextBase = spellAdmissionContextFor(actor, undefined);
    if (contextBase === null) {
      throw new Error("Expected a spell-admission context.");
    }

    for (const [profile, spellId] of cases) {
      const source = spellAdmissionSource(spellRecord(spellId));
      const result = profile.admitMechanics(mechanicsSource(source));
      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") continue;
      const invocations = result.admitted.admit(
        battleSpellExecutionSourceFromAdmission(source),
        { ...contextBase, castingSource: source.castingSource },
      );
      expect(invocations.length).toBeGreaterThan(0);
      for (const invocation of invocations) {
        expect(invocation.spell).not.toHaveProperty("mechanics");
      }
    }
  });
});
