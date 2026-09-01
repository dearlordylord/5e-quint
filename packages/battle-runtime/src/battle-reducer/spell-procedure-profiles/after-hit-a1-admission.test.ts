import { describe, expect, test } from "vitest";
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMaterialComponentPath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";

import {
  battleSpellExecutionSourceFromAdmission,
  type BattleCreatureState,
} from "../../battle-state-execution.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import { spellCasterId } from "../../unit-profile-admission-catalog.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { afterHitDamageProfile } from "./after-hit-damage.ts";
import { afterHitDamageAndIlluminationProfile } from "./after-hit-damage-and-illumination.ts";
import { afterHitSaveGatedConditionProfile } from "./after-hit-save-gated-condition.ts";
import { afterHitTimedDamageAndSaveProfile } from "./after-hit-timed-damage-and-save.ts";
import { attackBurstSaveDamageProfile } from "./attack-burst-save-damage.ts";
import type { SpellAdmissionActor } from "./profile.ts";

function mechanicsSource(spell: SpellRecord) {
  const source = spellAdmissionSource(spell);
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function coordinate(path: { readonly nodes: readonly unknown[] }): string {
  return path.nodes
    .map((node) => {
      if (
        typeof node !== "object" ||
        node === null ||
        !("kind" in node) ||
        !("role" in node)
      ) {
        return "invalid";
      }
      if (node.kind === "singleton") return String(node.role);
      if (node.kind === "occurrence" && "ordinal" in node) {
        return `${String(node.role)}:${String(node.ordinal)}`;
      }
      return "invalid";
    })
    .join("/");
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

describe("SR-04G-A1 static spell procedure admission", () => {
  test("supports each representable fixture and consumes its canonical owned roots", () => {
    const cases = [
      {
        result: afterHitDamageProfile.admitMechanics(
          mechanicsSource(spellRecord("divine_smite")),
        ),
        expected: [
          spellMechanicsHeaderPath("level"),
          spellMechanicsHeaderPath("school"),
          spellMechanicsHeaderPath("range"),
          spellMechanicsHeaderPath("components"),
          spellMechanicsHeaderPath("duration"),
          spellMechanicsHeaderPath("castingTime"),
          spellMechanicsHeaderPath("family"),
          spellActivationPhasePath(PositiveInteger(1)),
          spellActivationAttachmentPath(PositiveInteger(1)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(2)),
        ],
      },
      {
        result: afterHitTimedDamageAndSaveProfile.admitMechanics(
          mechanicsSource(spellRecord("searing_smite")),
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
      },
      {
        result: afterHitDamageAndIlluminationProfile.admitMechanics(
          mechanicsSource(spellRecord("shining_smite")),
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
          spellOngoingOperationPath(PositiveInteger(2)),
          spellOngoingOperationEffectPath(PositiveInteger(2)),
          spellOngoingOperationPath(PositiveInteger(3)),
          spellOngoingOperationEffectPath(PositiveInteger(3)),
        ],
      },
      {
        result: attackBurstSaveDamageProfile.admitMechanics(
          mechanicsSource(spellRecord("ice_knife")),
        ),
        expected: [
          spellMechanicsHeaderPath("level"),
          spellMechanicsHeaderPath("school"),
          spellMechanicsHeaderPath("range"),
          spellMechanicsHeaderPath("components"),
          spellMechanicsHeaderPath("duration"),
          spellMechanicsHeaderPath("castingTime"),
          spellMechanicsHeaderPath("family"),
          spellActivationPhasePath(PositiveInteger(1)),
          spellActivationAttachmentPath(PositiveInteger(1)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(2)),
          spellActivationPhasePath(PositiveInteger(2)),
          spellActivationAttachmentPath(PositiveInteger(2)),
          spellActivationEffectPath(PositiveInteger(2), PositiveInteger(1)),
        ],
      },
    ] as const;

    for (const { result, expected } of cases) {
      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") continue;
      expect(result.admitted.evidence).toEqual({
        consumed: expected,
        unowned: [],
      });
      expect(result.admitted.facts).toHaveProperty("level");
      expect(result.admitted.facts).not.toHaveProperty("rangeFeet");
      expect(result.admitted.facts).not.toHaveProperty("durationTicks");
    }
  });

  test("does not overclaim sibling after-hit or attack-phase shapes", () => {
    expect(
      afterHitDamageProfile.admitMechanics(
        mechanicsSource(spellRecord("searing_smite")),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      afterHitTimedDamageAndSaveProfile.admitMechanics(
        mechanicsSource(spellRecord("ensnaring_strike")),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      afterHitSaveGatedConditionProfile.admitMechanics(
        mechanicsSource(spellRecord("shining_smite")),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      afterHitDamageAndIlluminationProfile.admitMechanics(
        mechanicsSource(spellRecord("searing_smite")),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      attackBurstSaveDamageProfile.admitMechanics(
        mechanicsSource(spellRecord("fire_bolt")),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test("rejects Ensnaring Strike because its authored graph lacks the escape fact", () => {
    const result = afterHitSaveGatedConditionProfile.admitMechanics(
      mechanicsSource(spellRecord("ensnaring_strike")),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues).toEqual([
      expect.objectContaining({
        failedFact: "escape",
        mechanicsPath: spellOngoingInitialPhasePath(),
      }),
    ]);
  });

  test("retains independent failed facts that share one mechanics path", () => {
    const ensnaring = spellRecord("ensnaring_strike");
    if (
      ensnaring.mechanics.family !== "ongoing_effect" ||
      ensnaring.mechanics.initialPhase?.kind !== "save_gate"
    ) {
      throw new Error("Expected Ensnaring Strike save-gate mechanics.");
    }
    const result = afterHitSaveGatedConditionProfile.admitMechanics(
      mechanicsSource(
        decodeSpellRecordForTest({
          ...ensnaring,
          mechanics: {
            ...ensnaring.mechanics,
            initialPhase: {
              ...ensnaring.mechanics.initialPhase,
              ability: "dex",
            },
          },
        }),
      ),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(
      result.issues
        .filter(
          (issue) =>
            coordinate(issue.mechanicsPath) ===
            coordinate(spellOngoingInitialPhasePath()),
        )
        .map((issue) => issue.failedFact),
    ).toEqual(["saveGate", "escape"]);
  });

  test("keeps static recognition and evidence invariant under synthetic renaming", () => {
    const cases = [
      {
        profile: afterHitDamageProfile,
        spell: spellRecord("divine_smite"),
        id: "synthetic_renamed_divine_smite",
      },
      {
        profile: afterHitTimedDamageAndSaveProfile,
        spell: spellRecord("searing_smite"),
        id: "synthetic_renamed_searing_smite",
      },
      {
        profile: afterHitSaveGatedConditionProfile,
        spell: spellRecord("ensnaring_strike"),
        id: "synthetic_renamed_ensnaring_strike",
      },
      {
        profile: afterHitDamageAndIlluminationProfile,
        spell: spellRecord("shining_smite"),
        id: "synthetic_renamed_shining_smite",
      },
      {
        profile: attackBurstSaveDamageProfile,
        spell: spellRecord("ice_knife"),
        id: "synthetic_renamed_ice_knife",
      },
    ] as const;

    for (const { profile, spell, id } of cases) {
      const original = profile.admitMechanics(mechanicsSource(spell));
      const renamed = decodeSpellRecordForTest({
        ...spell,
        id,
        name: "Synthetic Renamed Spell",
      });
      const renamedResult = profile.admitMechanics(mechanicsSource(renamed));
      expect(renamedResult.tag).toBe(original.tag);
      if (original.tag === "supported" && renamedResult.tag === "supported") {
        expect(renamedResult.admitted.facts).toEqual(original.admitted.facts);
        expect(renamedResult.admitted.evidence).toEqual(
          original.admitted.evidence,
        );
      }
      if (
        original.tag === "unsupported" &&
        renamedResult.tag === "unsupported"
      ) {
        expect(
          renamedResult.issues.map((issue) => ({
            failedFact: issue.failedFact,
            path: coordinate(issue.mechanicsPath),
          })),
        ).toEqual(
          original.issues.map((issue) => ({
            failedFact: issue.failedFact,
            path: coordinate(issue.mechanicsPath),
          })),
        );
      }
    }
  });

  test("binds each representable A1 closure to mechanics-free execution", () => {
    const cases = [
      {
        profile: afterHitDamageProfile,
        spell: spellRecord("divine_smite"),
      },
      {
        profile: afterHitTimedDamageAndSaveProfile,
        spell: spellRecord("searing_smite"),
      },
      {
        profile: afterHitDamageAndIlluminationProfile,
        spell: spellRecord("shining_smite"),
      },
      {
        profile: attackBurstSaveDamageProfile,
        spell: spellRecord("ice_knife"),
      },
    ] as const;

    for (const { profile, spell } of cases) {
      const source = spellAdmissionSource(spell);
      const result = profile.admitMechanics(mechanicsSource(spell));
      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") continue;
      const actor = spellAdmissionActor();
      const invocations = result.admitted.admit(
        battleSpellExecutionSourceFromAdmission(source),
        {
          actor,
          castingSource: source.castingSource,
          battle: undefined,
          spellCastOptions: [
            {
              spellLevel: spellSlotLevel(1),
              payment: { tag: "slot" },
            },
            {
              spellLevel: spellSlotLevel(2),
              payment: { tag: "slot" },
            },
          ],
        },
      );
      expect(invocations.length).toBeGreaterThan(0);
      for (const invocation of invocations) {
        expect(invocation.spell).not.toHaveProperty("mechanics");
      }
    }
  });

  test("reports each A1 profile's unsupported branch at its exact path", () => {
    const divine = spellRecord("divine_smite");
    if (divine.mechanics.family !== "activation") {
      throw new Error("Expected Divine Smite activation mechanics.");
    }
    const divinePhase = divine.mechanics.phases[0];
    if (divinePhase?.kind !== "direct" || divinePhase.effects === undefined) {
      throw new Error("Expected Divine Smite direct effects.");
    }
    const divineResult = afterHitDamageProfile.admitMechanics(
      mechanicsSource(
        decodeSpellRecordForTest({
          ...divine,
          mechanics: {
            ...divine.mechanics,
            phases: [
              {
                ...divinePhase,
                effects: [divinePhase.effects[0]!, { kind: "none" }],
              },
            ],
          },
        }),
      ),
    );
    expect(divineResult).toMatchObject({
      tag: "unsupported",
      issues: [
        expect.objectContaining({
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(2),
          ),
        }),
      ],
    });

    const shining = spellRecord("shining_smite");
    if (shining.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Shining Smite ongoing mechanics.");
    }
    const shiningOperations = shining.mechanics.operations;
    const shiningResult = afterHitDamageAndIlluminationProfile.admitMechanics(
      mechanicsSource(
        decodeSpellRecordForTest({
          ...shining,
          mechanics: {
            ...shining.mechanics,
            operations: [
              shiningOperations[0]!,
              { ...shiningOperations[1]!, effect: { kind: "none" } },
              shiningOperations[2]!,
            ],
          },
        }),
      ),
    );
    expect(shiningResult.tag).toBe("unsupported");
    if (shiningResult.tag !== "unsupported") return;
    expect(shiningResult.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(2)),
        }),
        expect.objectContaining({
          failedFact: "operationCount",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(2)),
        }),
      ]),
    );

    const searing = spellRecord("searing_smite");
    if (
      searing.mechanics.family !== "ongoing_effect" ||
      searing.mechanics.duration.kind !== "timed"
    ) {
      throw new Error("Expected Searing Smite timed ongoing mechanics.");
    }
    const searingResult = afterHitTimedDamageAndSaveProfile.admitMechanics(
      mechanicsSource(
        decodeSpellRecordForTest({
          ...searing,
          mechanics: {
            ...searing.mechanics,
            duration: {
              ...searing.mechanics.duration,
              value: { ...searing.mechanics.duration.value, amount: 2 },
            },
          },
        }),
      ),
    );
    expect(searingResult).toMatchObject({
      tag: "unsupported",
      issues: [
        expect.objectContaining({
          mechanicsPath: spellDurationValuePath(),
        }),
      ],
    });

    const ensnaring = spellRecord("ensnaring_strike");
    if (
      ensnaring.mechanics.family !== "ongoing_effect" ||
      ensnaring.mechanics.duration.kind !== "concentration"
    ) {
      throw new Error("Expected Ensnaring Strike concentration mechanics.");
    }
    const ensnaringResult = afterHitSaveGatedConditionProfile.admitMechanics(
      mechanicsSource(
        decodeSpellRecordForTest({
          ...ensnaring,
          mechanics: {
            ...ensnaring.mechanics,
            duration: {
              ...ensnaring.mechanics.duration,
              upTo: { ...ensnaring.mechanics.duration.upTo, amount: 2 },
            },
          },
        }),
      ),
    );
    expect(ensnaringResult).toMatchObject({
      tag: "unsupported",
      issues: [
        expect.objectContaining({
          mechanicsPath: spellDurationValuePath(),
        }),
        expect.objectContaining({
          mechanicsPath: spellOngoingInitialPhasePath(),
        }),
      ],
    });

    const iceKnife = spellRecord("ice_knife");
    if (iceKnife.mechanics.family !== "activation") {
      throw new Error("Expected Ice Knife activation mechanics.");
    }
    const attackPhase = iceKnife.mechanics.phases[0];
    if (attackPhase?.kind !== "attack_roll") {
      throw new Error("Expected Ice Knife attack phase.");
    }
    const attackResult = attackBurstSaveDamageProfile.admitMechanics(
      mechanicsSource(
        decodeSpellRecordForTest({
          ...iceKnife,
          mechanics: {
            ...iceKnife.mechanics,
            phases: [
              {
                ...attackPhase,
                onMiss: [{ kind: "set_speed", feet: 10 }, { kind: "none" }],
              },
              iceKnife.mechanics.phases[1]!,
            ],
          },
        }),
      ),
    );
    expect(attackResult).toMatchObject({
      tag: "unsupported",
      issues: [
        expect.objectContaining({
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(2),
          ),
        }),
        expect.objectContaining({
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(3),
          ),
        }),
      ],
    });
  });

  test("rejects unprojected duration branches at their exact child paths", () => {
    const searing = spellRecord("searing_smite");
    if (
      searing.mechanics.family !== "ongoing_effect" ||
      searing.mechanics.duration.kind !== "timed"
    ) {
      throw new Error("Expected Searing Smite timed ongoing mechanics.");
    }
    const timedVariant = decodeSpellRecordForTest({
      ...searing,
      mechanics: {
        ...searing.mechanics,
        duration: {
          kind: "timed",
          value: {
            ...searing.mechanics.duration.value,
            upcastTiers: [{ atSlot: 2, amount: 2 }],
          },
          earlyEnd: [{ kind: "target_takes_damage" }],
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
    const timedResult = afterHitTimedDamageAndSaveProfile.admitMechanics(
      mechanicsSource(timedVariant),
    );
    expect(timedResult.tag).toBe("unsupported");
    if (timedResult.tag !== "unsupported") return;
    expect(timedResult.issues.map((issue) => issue.mechanicsPath)).toEqual(
      expect.arrayContaining([
        spellDurationExtensionPath(PositiveInteger(1)),
        spellDurationEndingPath(PositiveInteger(1)),
        spellDurationEndingPath(PositiveInteger(2)),
      ]),
    );
    expect(timedResult.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          mechanicsPath: spellMechanicsHeaderPath("duration"),
        }),
      ]),
    );

    const shining = spellRecord("shining_smite");
    if (
      shining.mechanics.family !== "ongoing_effect" ||
      shining.mechanics.duration.kind !== "concentration"
    ) {
      throw new Error("Expected Shining Smite concentration mechanics.");
    }
    const concentrationVariant = decodeSpellRecordForTest({
      ...shining,
      mechanics: {
        ...shining.mechanics,
        duration: {
          kind: "concentration",
          upTo: shining.mechanics.duration.upTo,
          earlyEnd: [{ kind: "target_takes_damage" }],
          permanentIfMaintainedFull: true,
        },
      },
    });
    const concentrationResult =
      afterHitDamageAndIlluminationProfile.admitMechanics(
        mechanicsSource(concentrationVariant),
      );
    expect(concentrationResult.tag).toBe("unsupported");
    if (concentrationResult.tag !== "unsupported") return;
    expect(
      concentrationResult.issues.map((issue) => issue.mechanicsPath),
    ).toEqual(
      expect.arrayContaining([
        spellDurationEndingPath(PositiveInteger(1)),
        spellDurationEndingPath(PositiveInteger(2)),
      ]),
    );
  });

  test("records generic and structured material branches as exact consumed evidence", () => {
    const base = spellRecord("divine_smite");
    const genericCost = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...base.mechanics,
        components: {
          v: true,
          s: true,
          m: "a synthetic priced focus",
          materialCostGp: 25,
        },
      },
    });
    const genericCostResult = afterHitDamageProfile.admitMechanics(
      mechanicsSource(genericCost),
    );
    expect(genericCostResult.tag).toBe("supported");
    if (genericCostResult.tag !== "supported") return;
    expect(genericCostResult.admitted.evidence).toEqual({
      consumed: [
        spellMechanicsHeaderPath("level"),
        spellMechanicsHeaderPath("school"),
        spellMechanicsHeaderPath("range"),
        spellMechanicsHeaderPath("components"),
        spellMechanicsHeaderPath("duration"),
        spellMechanicsHeaderPath("castingTime"),
        spellMechanicsHeaderPath("family"),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(2)),
        spellMaterialComponentPath("cost"),
      ],
      unowned: [],
    });

    const genericConsumption = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...base.mechanics,
        components: {
          v: true,
          s: true,
          m: "a synthetic consumed component",
          materialConsumed: true,
        },
      },
    });
    const genericConsumptionResult = afterHitDamageProfile.admitMechanics(
      mechanicsSource(genericConsumption),
    );
    expect(genericConsumptionResult.tag).toBe("supported");
    if (genericConsumptionResult.tag !== "supported") return;
    expect(genericConsumptionResult.admitted.evidence.consumed).toContainEqual(
      spellMaterialComponentPath("consumption"),
    );

    const structured = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...base.mechanics,
        components: {
          v: true,
          s: true,
          m: {
            kind: "paired_worn_items",
            itemKind: "ring",
            material: "platinum",
            minimumValueGpEach: 1,
            wornBy: ["caster", "target"],
            requiredFor: "spell_duration",
          },
        },
      },
    });
    const structuredResult = afterHitDamageProfile.admitMechanics(
      mechanicsSource(structured),
    );
    expect(structuredResult.tag).toBe("supported");
    if (structuredResult.tag !== "supported") return;
    expect(structuredResult.admitted.evidence.consumed).toContainEqual(
      spellMaterialComponentPath("cost"),
    );
    expect(structuredResult.admitted.evidence.consumed).not.toContainEqual(
      spellMaterialComponentPath("consumption"),
    );
  });

  test("accumulates attack miss and extra-phase issues at their actual paths", () => {
    const base = spellRecord("ice_knife");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected Ice Knife activation mechanics.");
    }
    const attackPhase = base.mechanics.phases[0];
    const savePhase = base.mechanics.phases[1];
    if (
      attackPhase?.kind !== "attack_roll" ||
      savePhase?.kind !== "save_gate"
    ) {
      throw new Error("Expected Ice Knife attack and save phases.");
    }
    const unsupported = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...attackPhase,
            onMiss: [
              { kind: "set_speed", feet: 10 },
              { kind: "none" },
              { kind: "none" },
            ],
          },
          savePhase,
          savePhase,
        ],
      },
    });
    const result = attackBurstSaveDamageProfile.admitMechanics(
      mechanicsSource(unsupported),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(
      result.issues.map((issue) => ({
        failedFact: issue.failedFact,
        path: coordinate(issue.mechanicsPath),
      })),
    ).toEqual([
      {
        failedFact: "phaseCount",
        path: "recordMechanics/procedure:3",
      },
      {
        failedFact: "missDamage",
        path: "recordMechanics/procedure:1/effect:2",
      },
      {
        failedFact: "missDamage",
        path: "recordMechanics/procedure:1/effect:3",
      },
      {
        failedFact: "missDamage",
        path: "recordMechanics/procedure:1/effect:4",
      },
    ]);
  });

  test("recognizes semantic procedures before rejecting reordered branches", () => {
    const iceKnife = spellRecord("ice_knife");
    if (iceKnife.mechanics.family !== "activation") {
      throw new Error("Expected Ice Knife activation mechanics.");
    }
    const [attackPhase, savePhase] = iceKnife.mechanics.phases;
    if (
      attackPhase?.kind !== "attack_roll" ||
      savePhase?.kind !== "save_gate"
    ) {
      throw new Error("Expected Ice Knife attack and save phases.");
    }
    const reorderedAttack = attackBurstSaveDamageProfile.admitMechanics(
      mechanicsSource(
        decodeSpellRecordForTest({
          ...iceKnife,
          mechanics: {
            ...iceKnife.mechanics,
            phases: [savePhase, attackPhase],
          },
        }),
      ),
    );
    expect(reorderedAttack.tag).toBe("unsupported");
    if (reorderedAttack.tag !== "unsupported") return;
    expect(
      reorderedAttack.issues
        .filter((issue) => issue.failedFact === "phaseOrder")
        .map((issue) => coordinate(issue.mechanicsPath)),
    ).toEqual(["recordMechanics/procedure:2", "recordMechanics/procedure:1"]);

    const shining = spellRecord("shining_smite");
    if (shining.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Shining Smite ongoing mechanics.");
    }
    const [illumination, advantage, suppression] = shining.mechanics.operations;
    if (
      illumination === undefined ||
      advantage === undefined ||
      suppression === undefined
    ) {
      throw new Error("Expected Shining Smite operations.");
    }
    const reorderedIllumination =
      afterHitDamageAndIlluminationProfile.admitMechanics(
        mechanicsSource(
          decodeSpellRecordForTest({
            ...shining,
            mechanics: {
              ...shining.mechanics,
              operations: [advantage, illumination, suppression],
            },
          }),
        ),
      );
    expect(reorderedIllumination.tag).toBe("unsupported");
    if (reorderedIllumination.tag !== "unsupported") return;
    expect(
      reorderedIllumination.issues
        .filter((issue) => issue.failedFact === "operationOrder")
        .map((issue) => coordinate(issue.mechanicsPath)),
    ).toEqual(["recordMechanics/procedure:2", "recordMechanics/procedure:1"]);

    const divine = spellRecord("divine_smite");
    if (divine.mechanics.family !== "activation") {
      throw new Error("Expected Divine Smite activation mechanics.");
    }
    const directPhase = divine.mechanics.phases[0];
    if (directPhase?.kind !== "direct") {
      throw new Error("Expected Divine Smite direct phase.");
    }
    const reorderedDamage = afterHitDamageProfile.admitMechanics(
      mechanicsSource(
        decodeSpellRecordForTest({
          ...divine,
          mechanics: {
            ...divine.mechanics,
            phases: [savePhase, directPhase],
          },
        }),
      ),
    );
    expect(reorderedDamage.tag).toBe("unsupported");
    if (reorderedDamage.tag !== "unsupported") return;
    expect(
      reorderedDamage.issues
        .filter((issue) => issue.failedFact === "phaseCount")
        .map((issue) => coordinate(issue.mechanicsPath)),
    ).toEqual(["recordMechanics/procedure:2", "recordMechanics/procedure:1"]);
  });

  test("uses reordered attack and save phase ordinals for nested attack-burst issues", () => {
    const base = spellRecord("ice_knife");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected Ice Knife activation mechanics.");
    }
    const attackPhase = base.mechanics.phases[0];
    const savePhase = base.mechanics.phases[1];
    if (
      attackPhase?.kind !== "attack_roll" ||
      savePhase?.kind !== "save_gate"
    ) {
      throw new Error("Expected Ice Knife attack and save phases.");
    }
    const result = attackBurstSaveDamageProfile.admitMechanics(
      mechanicsSource(
        decodeSpellRecordForTest({
          ...base,
          mechanics: {
            ...base.mechanics,
            phases: [
              {
                ...savePhase,
                attachment: { kind: "self" },
                onFail: { kind: "none" },
              },
              {
                ...attackPhase,
                attachment: { kind: "self" },
                onHit: [{ kind: "none" }],
              },
            ],
          },
        }),
      ),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          failedFact: "attackAttachment",
          mechanicsPath: spellActivationAttachmentPath(PositiveInteger(2)),
        }),
        expect.objectContaining({
          failedFact: "hitDamage",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(2),
            PositiveInteger(1),
          ),
        }),
        expect.objectContaining({
          failedFact: "burstAttachment",
          mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
        }),
        expect.objectContaining({
          failedFact: "burstDamage",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(1),
          ),
        }),
      ]),
    );
  });

  test("uses the reordered direct phase ordinal for nested after-hit damage issues", () => {
    const divine = spellRecord("divine_smite");
    const iceKnife = spellRecord("ice_knife");
    if (
      divine.mechanics.family !== "activation" ||
      iceKnife.mechanics.family !== "activation"
    ) {
      throw new Error("Expected activation mechanics.");
    }
    const directPhase = divine.mechanics.phases[0];
    const extraPhase = iceKnife.mechanics.phases[1];
    if (
      directPhase?.kind !== "direct" ||
      directPhase.effects === undefined ||
      extraPhase?.kind !== "save_gate"
    ) {
      throw new Error("Expected Divine Smite direct and extra save phases.");
    }
    const result = afterHitDamageProfile.admitMechanics(
      mechanicsSource(
        decodeSpellRecordForTest({
          ...divine,
          mechanics: {
            ...divine.mechanics,
            phases: [
              extraPhase,
              {
                ...directPhase,
                attachment: { kind: "self" },
                effects: [
                  { ...directPhase.effects[0]!, damageType: "cold" },
                  directPhase.effects[1]!,
                  { kind: "none" },
                ],
              },
            ],
          },
        }),
      ),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          failedFact: "attachment",
          mechanicsPath: spellActivationAttachmentPath(PositiveInteger(2)),
        }),
        expect.objectContaining({
          failedFact: "effects",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(2),
            PositiveInteger(3),
          ),
        }),
        expect.objectContaining({
          failedFact: "damage",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(2),
            PositiveInteger(1),
          ),
        }),
      ]),
    );
  });

  test("uses reordered operation ordinals for malformed illumination effects", () => {
    const shining = spellRecord("shining_smite");
    if (shining.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Shining Smite ongoing mechanics.");
    }
    const [illumination, advantage, suppression] = shining.mechanics.operations;
    if (
      illumination?.effect.kind !== "emit_bright_illumination" ||
      advantage?.effect.kind !== "modify_roll_advantage" ||
      suppression?.effect.kind !== "suppress_condition_benefit"
    ) {
      throw new Error("Expected Shining Smite illumination operations.");
    }
    const result = afterHitDamageAndIlluminationProfile.admitMechanics(
      mechanicsSource(
        decodeSpellRecordForTest({
          ...shining,
          mechanics: {
            ...shining.mechanics,
            operations: [
              {
                ...advantage,
                effect: { ...advantage.effect, mode: "disadvantage" },
              },
              {
                ...suppression,
                effect: { ...suppression.effect, condition: "blinded" },
              },
              {
                ...illumination,
                effect: { kind: "emit_dim_illumination", radiusFeet: 5 },
              },
            ],
          },
        }),
      ),
    );
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          failedFact: "attackAdvantage",
          mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
        }),
        expect.objectContaining({
          failedFact: "invisibleSuppression",
          mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(2)),
        }),
        expect.objectContaining({
          failedFact: "illumination",
          mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(3)),
        }),
      ]),
    );
  });

  test("counts only non-semantic reordered phases and operations as extras", () => {
    const iceKnife = spellRecord("ice_knife");
    const divine = spellRecord("divine_smite");
    if (
      iceKnife.mechanics.family !== "activation" ||
      divine.mechanics.family !== "activation"
    ) {
      throw new Error("Expected activation mechanics.");
    }
    const extraPhase = divine.mechanics.phases[0];
    const savePhase = iceKnife.mechanics.phases[1];
    const attackPhase = iceKnife.mechanics.phases[0];
    if (
      extraPhase === undefined ||
      savePhase?.kind !== "save_gate" ||
      attackPhase?.kind !== "attack_roll"
    ) {
      throw new Error("Expected extra, save, and attack phases.");
    }
    const attackBurstResult = attackBurstSaveDamageProfile.admitMechanics(
      mechanicsSource(
        decodeSpellRecordForTest({
          ...iceKnife,
          mechanics: {
            ...iceKnife.mechanics,
            phases: [extraPhase, savePhase, attackPhase],
          },
        }),
      ),
    );
    expect(attackBurstResult.tag).toBe("unsupported");
    if (attackBurstResult.tag !== "unsupported") return;
    expect(attackBurstResult.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          failedFact: "phaseCount",
          mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
        }),
      ]),
    );
    expect(attackBurstResult.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          failedFact: "phaseCount",
          mechanicsPath: spellActivationPhasePath(PositiveInteger(3)),
        }),
      ]),
    );

    const shining = spellRecord("shining_smite");
    if (shining.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Shining Smite ongoing mechanics.");
    }
    const extraOperation = {
      effect: { kind: "none" },
      trigger: { kind: "passive" },
    };
    const illuminationResult =
      afterHitDamageAndIlluminationProfile.admitMechanics(
        mechanicsSource(
          decodeSpellRecordForTest({
            ...shining,
            mechanics: {
              ...shining.mechanics,
              operations: [extraOperation, ...shining.mechanics.operations],
            },
          }),
        ),
      );
    expect(illuminationResult.tag).toBe("unsupported");
    if (illuminationResult.tag !== "unsupported") return;
    expect(illuminationResult.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          failedFact: "operationCount",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
        }),
      ]),
    );
    expect(illuminationResult.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          failedFact: "operationCount",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(4)),
        }),
      ]),
    );

    const searing = spellRecord("searing_smite");
    if (searing.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Searing Smite ongoing mechanics.");
    }
    const timedResult = afterHitTimedDamageAndSaveProfile.admitMechanics(
      mechanicsSource(
        decodeSpellRecordForTest({
          ...searing,
          mechanics: {
            ...searing.mechanics,
            operations: [extraOperation, ...searing.mechanics.operations],
          },
        }),
      ),
    );
    expect(timedResult.tag).toBe("unsupported");
    if (timedResult.tag !== "unsupported") return;
    expect(timedResult.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          failedFact: "operationCount",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
        }),
      ]),
    );
    expect(timedResult.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          failedFact: "operationCount",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(2)),
        }),
      ]),
    );

    const ensnaring = spellRecord("ensnaring_strike");
    if (ensnaring.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Ensnaring Strike ongoing mechanics.");
    }
    const conditionResult = afterHitSaveGatedConditionProfile.admitMechanics(
      mechanicsSource(
        decodeSpellRecordForTest({
          ...ensnaring,
          mechanics: {
            ...ensnaring.mechanics,
            operations: [extraOperation, ...ensnaring.mechanics.operations],
          },
        }),
      ),
    );
    expect(conditionResult.tag).toBe("unsupported");
    if (conditionResult.tag !== "unsupported") return;
    expect(conditionResult.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          failedFact: "operationCount",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
        }),
      ]),
    );
    expect(conditionResult.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          failedFact: "operationCount",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(2)),
        }),
      ]),
    );
  });
});
