import { describe, expect, test } from "vitest";
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingConcurrentEffectLimitPath,
  spellOngoingModeChoicePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";

import {
  battleSpellExecutionSourceFromAdmission,
  type BattleCreatureState,
  type BattleSpellAdmissionSource,
} from "../../battle-state-execution.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import { spellCasterId } from "../../unit-profile-admission-catalog.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import type { SpellAdmissionActor } from "./profile.ts";
import type { SpellMechanicsAdmissionSource } from "./spell-mechanics-admission.ts";
import { selfTeleportProfile } from "./self-teleport.ts";
import { targetingSaveInterdictionProfile } from "./targeting-save-interdiction.ts";
import { temporaryAbilityCheckRollModeProfile } from "./temporary-ability-check-roll-mode.ts";

const headers = [
  spellMechanicsHeaderPath("level"),
  spellMechanicsHeaderPath("school"),
  spellMechanicsHeaderPath("range"),
  spellMechanicsHeaderPath("components"),
  spellMechanicsHeaderPath("duration"),
  spellMechanicsHeaderPath("castingTime"),
  spellMechanicsHeaderPath("family"),
];

function mechanicsSource(
  source: BattleSpellAdmissionSource,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function sourceFor(spellId: string): BattleSpellAdmissionSource {
  return spellAdmissionSource(spellRecord(spellId));
}

function spellAdmissionActor(): SpellAdmissionActor {
  const actor = spellBattle({ preparedSpells: [] }).state.combatants.get(
    spellCasterId,
  );
  if (!isSpellAdmissionActor(actor)) {
    throw new Error("Expected a spellcasting character fixture.");
  }
  return actor;
}

function isSpellAdmissionActor(
  actor: BattleCreatureState | undefined,
): actor is SpellAdmissionActor {
  return (
    actor?.origin.kind === "character" &&
    actor.origin.spellcasting?.canCastSpells === true
  );
}

describe("SR-04G-B4 static spell procedure admission", () => {
  test("admits Misty Step with complete exact phase evidence and facts", () => {
    const source = sourceFor("misty_step");
    const result = selfTeleportProfile.admitMechanics(mechanicsSource(source));

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 2,
      maxDistanceFeet: 30,
    });
    expect(result.admitted.evidence).toEqual({
      consumed: [
        ...headers,
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
      unowned: [],
    });

    const [invocation] = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        actor: spellAdmissionActor(),
        castingSource: source.castingSource,
        battle: undefined,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(2), payment: { tag: "slot" } },
        ],
      },
    );
    expect(invocation?.spell).not.toHaveProperty("mechanics");
  });

  test("admits Sanctuary with complete exact duration and operation evidence", () => {
    const source = sourceFor("sanctuary");
    const result = targetingSaveInterdictionProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 1,
      rangeFeet: 30,
      durationTicks: 10,
      saveDc: { kind: "caster_spell_save_dc" },
    });
    expect(result.admitted.evidence).toEqual({
      consumed: [
        ...headers,
        spellDurationValuePath(),
        spellDurationEndingPath(PositiveInteger(1)),
        spellDurationEndingPath(PositiveInteger(2)),
        spellDurationEndingPath(PositiveInteger(3)),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
      ],
      unowned: [],
    });

    const [invocation] = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        actor: spellAdmissionActor(),
        castingSource: source.castingSource,
        battle: undefined,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(1), payment: { tag: "slot" } },
        ],
      },
    );
    expect(invocation?.spell).not.toHaveProperty("mechanics");
  });

  test("admits Thaumaturgy as an explicitly partial collective mode root", () => {
    const source = sourceFor("thaumaturgy");
    const result = temporaryAbilityCheckRollModeProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 0,
      rangeFeet: 30,
      durationTicks: 10,
      selectedMode: {
        kind: "abilityCheckRollMode",
        ability: "cha",
        skill: "intimidation",
        rollMode: "advantage",
        effectDuration: "spellDuration",
      },
      concurrentDurationModeLimit: { maximumActive: 3 },
    });
    const modePath = spellOngoingModeChoicePath();
    expect(result.admitted.evidence).toEqual({
      consumed: [
        ...headers,
        spellDurationValuePath(),
        spellOngoingAttachmentPath(),
        spellOngoingConcurrentEffectLimitPath(),
      ],
      unowned: [modePath],
    });

    const [invocation] = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        actor: spellAdmissionActor(),
        castingSource: source.castingSource,
        battle: undefined,
        spellCastOptions: [],
      },
    );
    expect(invocation?.spell).not.toHaveProperty("mechanics");
  });

  test("keeps the three B4 readers collision-free across sibling roots", () => {
    expect(
      selfTeleportProfile.admitMechanics(
        mechanicsSource(sourceFor("sanctuary")),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      selfTeleportProfile.admitMechanics(
        mechanicsSource(sourceFor("thaumaturgy")),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      targetingSaveInterdictionProfile.admitMechanics(
        mechanicsSource(sourceFor("misty_step")),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      targetingSaveInterdictionProfile.admitMechanics(
        mechanicsSource(sourceFor("thaumaturgy")),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      temporaryAbilityCheckRollModeProfile.admitMechanics(
        mechanicsSource(sourceFor("misty_step")),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      temporaryAbilityCheckRollModeProfile.admitMechanics(
        mechanicsSource(sourceFor("sanctuary")),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test("keeps static facts and evidence invariant under authored renaming", () => {
    const cases = [
      [selfTeleportProfile, "misty_step"],
      [targetingSaveInterdictionProfile, "sanctuary"],
      [temporaryAbilityCheckRollModeProfile, "thaumaturgy"],
    ] as const;

    for (const [profile, spellId] of cases) {
      const original = spellRecord(spellId);
      const renamed = decodeSpellRecordForTest({
        ...original,
        id: `synthetic_b4_${spellId}`,
        name: `Synthetic B4 ${spellId}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_b4_${spellId}`,
        },
      });
      const originalResult = profile.admitMechanics(
        mechanicsSource(sourceFor(spellId)),
      );
      const renamedSource = spellAdmissionSource(renamed);
      const renamedResult = profile.admitMechanics(
        mechanicsSource(renamedSource),
      );
      expect(renamedResult.tag).toBe(originalResult.tag);
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

  test("reports the exact Misty Step teleport path after a one-field mutation", () => {
    const base = spellRecord("misty_step");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected Misty Step activation mechanics.");
    }
    const phase = base.mechanics.phases[0];
    if (
      phase?.kind !== "direct" ||
      phase.effects === undefined ||
      phase.effects[0]?.kind !== "teleport"
    ) {
      throw new Error("Expected Misty Step direct teleport mechanics.");
    }
    const teleport = phase.effects[0];
    const mutated = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_b4_misty_step_distance",
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            effects: [{ ...teleport, maxFeet: 25 }],
          },
        ],
      },
    });
    const result = selfTeleportProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(mutated)),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expect.objectContaining({
          failedFact: "teleport",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(1),
          ),
        }),
      ],
    });
  });

  test("reports the exact Sanctuary trigger path after a one-field mutation", () => {
    const base = spellRecord("sanctuary");
    if (
      base.mechanics.family !== "ongoing_effect" ||
      base.mechanics.operations[0] === undefined
    ) {
      throw new Error("Expected Sanctuary ongoing operation mechanics.");
    }
    const operation = base.mechanics.operations[0];
    const mutated = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_b4_sanctuary_trigger",
      mechanics: {
        ...base.mechanics,
        operations: [
          {
            ...operation,
            trigger: { ...operation.trigger, targeting: ["attack_roll"] },
          },
        ],
      },
    });
    const result = targetingSaveInterdictionProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(mutated)),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expect.objectContaining({
          failedFact: "trigger",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
        }),
      ],
    });
  });

  test("admits Sanctuary early endings in any semantic-set permutation", () => {
    const base = spellRecord("sanctuary");
    if (
      base.mechanics.family !== "ongoing_effect" ||
      base.mechanics.duration.kind !== "timed" ||
      base.mechanics.duration.earlyEnd === undefined
    ) {
      throw new Error("Expected Sanctuary timed duration endings.");
    }
    const earlyEnd = base.mechanics.duration.earlyEnd;
    const permuted = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_b4_sanctuary_permuted_endings",
      mechanics: {
        ...base.mechanics,
        duration: {
          ...base.mechanics.duration,
          earlyEnd: [...earlyEnd].reverse(),
        },
      },
    });
    const result = targetingSaveInterdictionProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(permuted)),
    );
    expect(result.tag).toBe("supported");
  });

  test("reports duplicate and missing Sanctuary endings without semantic ordinals", () => {
    const base = spellRecord("sanctuary");
    if (
      base.mechanics.family !== "ongoing_effect" ||
      base.mechanics.duration.kind !== "timed" ||
      base.mechanics.duration.earlyEnd === undefined
    ) {
      throw new Error("Expected Sanctuary timed duration endings.");
    }
    const earlyEnd = base.mechanics.duration.earlyEnd;
    const [firstEnding, , thirdEnding] = earlyEnd;
    if (firstEnding === undefined || thirdEnding === undefined) {
      throw new Error("Expected three Sanctuary duration endings.");
    }
    const duplicate = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_b4_sanctuary_duplicate_ending",
      mechanics: {
        ...base.mechanics,
        duration: {
          ...base.mechanics.duration,
          earlyEnd: [firstEnding, firstEnding, thirdEnding],
        },
      },
    });
    const result = targetingSaveInterdictionProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(duplicate)),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expect.objectContaining({
          failedFact: "durationEnding",
          mechanicsPath: spellDurationEndingPath(PositiveInteger(2)),
        }),
        expect.objectContaining({
          failedFact: "durationEnding",
          mechanicsPath: spellMechanicsHeaderPath("duration"),
        }),
      ],
    });
  });

  test("reports an extra Sanctuary ending at its authored ordinal", () => {
    const base = spellRecord("sanctuary");
    if (
      base.mechanics.family !== "ongoing_effect" ||
      base.mechanics.duration.kind !== "timed" ||
      base.mechanics.duration.earlyEnd === undefined
    ) {
      throw new Error("Expected Sanctuary timed duration endings.");
    }
    const extra = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_b4_sanctuary_extra_ending",
      mechanics: {
        ...base.mechanics,
        duration: {
          ...base.mechanics.duration,
          earlyEnd: [
            ...base.mechanics.duration.earlyEnd,
            { kind: "target_takes_damage" },
          ],
        },
      },
    });
    const result = targetingSaveInterdictionProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(extra)),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expect.objectContaining({
          failedFact: "durationEnding",
          mechanicsPath: spellDurationEndingPath(PositiveInteger(4)),
        }),
      ],
    });
  });

  test("reports a missing Sanctuary ending on the duration header", () => {
    const base = spellRecord("sanctuary");
    if (
      base.mechanics.family !== "ongoing_effect" ||
      base.mechanics.duration.kind !== "timed" ||
      base.mechanics.duration.earlyEnd === undefined
    ) {
      throw new Error("Expected Sanctuary timed duration endings.");
    }
    const missing = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_b4_sanctuary_missing_ending",
      mechanics: {
        ...base.mechanics,
        duration: {
          ...base.mechanics.duration,
          earlyEnd: base.mechanics.duration.earlyEnd.slice(0, 2),
        },
      },
    });
    const result = targetingSaveInterdictionProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(missing)),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expect.objectContaining({
          failedFact: "durationEnding",
          mechanicsPath: spellMechanicsHeaderPath("duration"),
        }),
      ],
    });
  });

  test("reports Sanctuary permanent-after as an extra ending ordinal", () => {
    const base = spellRecord("sanctuary");
    if (
      base.mechanics.family !== "ongoing_effect" ||
      base.mechanics.duration.kind !== "timed" ||
      base.mechanics.duration.earlyEnd === undefined
    ) {
      throw new Error("Expected Sanctuary timed duration endings.");
    }
    const permanentAfter = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_b4_sanctuary_permanent_after",
      mechanics: {
        ...base.mechanics,
        duration: {
          ...base.mechanics.duration,
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
    const result = targetingSaveInterdictionProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(permanentAfter)),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expect.objectContaining({
          failedFact: "durationEnding",
          mechanicsPath: spellDurationEndingPath(PositiveInteger(4)),
        }),
      ],
    });
  });

  test("reports Thaumaturgy's exact collective path after mutating the owned effect", () => {
    const base = spellRecord("thaumaturgy");
    if (base.mechanics.family !== "modal_ongoing_effect") {
      throw new Error("Expected Thaumaturgy modal ongoing mechanics.");
    }
    const mutated = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_b4_thaumaturgy_effect",
      mechanics: {
        ...base.mechanics,
        mode: {
          ...base.mechanics.mode,
          options: base.mechanics.mode.options.map((option) =>
            option.id === "booming_voice"
              ? {
                  ...option,
                  effects: option.effects?.map((effect) => ({
                    ...effect,
                    mode: "disadvantage",
                  })),
                }
              : option,
          ),
        },
      },
    });
    const result = temporaryAbilityCheckRollModeProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(mutated)),
    );
    const collectivePath = spellOngoingModeChoicePath();
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expect.objectContaining({
          failedFact: "effect",
          mechanicsPath: collectivePath,
        }),
      ],
    });
    if (result.tag === "unsupported") {
      expect(result.issues[0]?.mechanicsPath).toEqual(collectivePath);
    }
  });

  test("rejects an unsupported Thaumaturgy effect count at the collective path", () => {
    const base = spellRecord("thaumaturgy");
    if (base.mechanics.family !== "modal_ongoing_effect") {
      throw new Error("Expected Thaumaturgy modal ongoing mechanics.");
    }
    const mutated = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_b4_thaumaturgy_count",
      mechanics: {
        ...base.mechanics,
        mode: {
          ...base.mechanics.mode,
          options: base.mechanics.mode.options.map((option) =>
            option.id === "booming_voice"
              ? {
                  ...option,
                  effects: option.effects?.map((effect) => ({
                    ...effect,
                    count: 2,
                  })),
                }
              : option,
          ),
        },
      },
    });
    const result = temporaryAbilityCheckRollModeProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(mutated)),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expect.objectContaining({
          failedFact: "effect",
          mechanicsPath: spellOngoingModeChoicePath(),
        }),
      ],
    });
  });

  test("rejects an unsupported Thaumaturgy expiry at the collective path", () => {
    const base = spellRecord("thaumaturgy");
    if (base.mechanics.family !== "modal_ongoing_effect") {
      throw new Error("Expected Thaumaturgy modal ongoing mechanics.");
    }
    const mutated = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_b4_thaumaturgy_expiry",
      mechanics: {
        ...base.mechanics,
        mode: {
          ...base.mechanics.mode,
          options: base.mechanics.mode.options.map((option) =>
            option.id === "booming_voice"
              ? {
                  ...option,
                  effects: option.effects?.map((effect) => ({
                    ...effect,
                    expiresOn: { kind: "end_of_next_turn" },
                  })),
                }
              : option,
          ),
        },
      },
    });
    const result = temporaryAbilityCheckRollModeProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(mutated)),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expect.objectContaining({
          failedFact: "effect",
          mechanicsPath: spellOngoingModeChoicePath(),
        }),
      ],
    });
  });

  test("reports the exact Thaumaturgy concurrency resource path after mutation", () => {
    const base = spellRecord("thaumaturgy");
    if (
      base.mechanics.family !== "modal_ongoing_effect" ||
      base.mechanics.concurrentEffectLimit === undefined
    ) {
      throw new Error("Expected Thaumaturgy concurrent-effect limit.");
    }
    const mutated = decodeSpellRecordForTest({
      ...base,
      id: "synthetic_b4_thaumaturgy_limit",
      mechanics: {
        ...base.mechanics,
        concurrentEffectLimit: {
          ...base.mechanics.concurrentEffectLimit,
          maximumActive: 2,
        },
      },
    });
    const result = temporaryAbilityCheckRollModeProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(mutated)),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expect.objectContaining({
          failedFact: "concurrentEffectLimit",
          mechanicsPath: spellOngoingConcurrentEffectLimitPath(),
        }),
      ],
    });
  });

  test("does not treat a collective Thaumaturgy node as five fabricated option paths", () => {
    const result = temporaryAbilityCheckRollModeProfile.admitMechanics(
      mechanicsSource(sourceFor("thaumaturgy")),
    );
    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence.unowned).toEqual([
      spellOngoingModeChoicePath(),
    ]);
    expect(result.admitted.evidence.unowned[0]?.nodes).toEqual(
      spellOngoingModeChoicePath().nodes,
    );
  });
});
