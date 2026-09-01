import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
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
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import {
  saveGatedDamageMechanicsFacts,
  supportedCantripSaveGateDamageProfile,
} from "./_save-gate-helpers.ts";
import { saveGatedDamageProfile } from "./save-gated-damage.ts";

function acidSplashWithComponents(
  components: SpellRecord["mechanics"]["components"],
): SpellRecord {
  const base = spellRecord("acid_splash");
  return decodeSpellRecordForTest({
    ...base,
    mechanics: {
      ...base.mechanics,
      components,
    },
  });
}

function expectedAcidSplashMaterialEvidence(
  materialBranch: "cost" | "consumption",
) {
  return {
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
      spellMaterialComponentPath(materialBranch),
    ],
    unowned: [],
  };
}

describe("save-gated damage static admission", () => {
  test("projects a save-gated damage shape once and records its owned paths", () => {
    const source = spellAdmissionSource(spellRecord("acid_splash"));
    const result = saveGatedDamageMechanicsFacts(source);

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;

    expect(result.facts.ability).toBe("dex");
    expect(result.evidence.consumed).toEqual(
      expect.arrayContaining([
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
      ]),
    );
  });

  test("keeps the correlated profile facts on the admitted closure", () => {
    const source = spellAdmissionSource(spellRecord("acid_splash"));
    const result = saveGatedDamageProfile.admitMechanics(source);

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;

    expect(result.admitted.facts).toMatchObject({
      level: source.spellDefinitionRuleFacts.level,
      ability: "dex",
      successDamage: "none",
    });
    expect(result.admitted.facts).toHaveProperty("failedSaveEffects");
    expect(result.admitted.facts).toHaveProperty("targeting");
  });

  test("retains a mechanics-free spell shell on compatibility projections", () => {
    const source = spellAdmissionSource(spellRecord("acid_splash"));
    const [invocation] = supportedCantripSaveGateDamageProfile(source, 5);

    expect(invocation?.spell).toBeDefined();
    expect(invocation?.spell).not.toHaveProperty("mechanics");
  });

  test("does not claim an unrelated activation phase", () => {
    const result = saveGatedDamageMechanicsFacts({
      mechanics: spellRecord("fire_bolt").mechanics,
    });

    expect(result).toEqual({ tag: "notRepresented" });
  });

  test("does not claim sibling save-gate condition, immunity, or repeat shapes", () => {
    for (const spellId of [
      "charm_person",
      "calm_emotions",
      "hideous_laughter",
      "contagion",
    ]) {
      expect(
        saveGatedDamageMechanicsFacts({
          mechanics: spellRecord(spellId).mechanics,
        }),
      ).toEqual({ tag: "notRepresented" });
    }
  });

  test("accumulates represented unsupported branches at shape-derived paths", () => {
    const base = spellRecord("acid_splash");
    const baseMechanics = base.mechanics;
    if (baseMechanics.family !== "activation") {
      throw new Error("Expected Acid Splash activation mechanics.");
    }
    const firstPhase = baseMechanics.phases[0];
    if (firstPhase?.kind !== "save_gate") {
      throw new Error("Expected Acid Splash save-gate phase.");
    }
    const unsupported = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...baseMechanics,
        castingTime: { kind: "bonus_action" },
        phases: [
          {
            ...firstPhase,
            attachment: {
              kind: "area",
              origin: { kind: "self" },
              shape: { kind: "sphere", radiusFeet: 20 },
            },
          },
        ],
      },
    });
    const result = saveGatedDamageMechanicsFacts({
      mechanics: unsupported.mechanics,
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
        failedFact: "phaseAttachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
    ]);
  });

  test("adds evidence only for present duration branches", () => {
    const base = spellRecord("acid_splash");
    const baseMechanics = base.mechanics;
    if (baseMechanics.family !== "activation") {
      throw new Error("Expected Acid Splash activation mechanics.");
    }
    const withBranches = decodeSpellRecordForTest({
      ...base,
      mechanics: {
        ...baseMechanics,
        duration: {
          kind: "timed",
          value: {
            unit: "minute",
            amount: 1,
            upcastTiers: [{ atSlot: 2, amount: 1 }],
          },
          earlyEnd: [{ kind: "target_takes_damage" }],
        },
      },
    });
    const result = saveGatedDamageMechanicsFacts({
      mechanics: withBranches.mechanics,
    });

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.evidence.consumed).toEqual(
      expect.arrayContaining([
        spellDurationValuePath(),
        spellDurationExtensionPath(PositiveInteger(1)),
        spellDurationEndingPath(PositiveInteger(1)),
      ]),
    );
    expect(result.evidence.unowned).toEqual([]);
  });

  test("records a generic priced material component as consumed cost evidence only", () => {
    const base = spellRecord("acid_splash");
    const spell = acidSplashWithComponents({
      v: base.mechanics.components.v,
      s: base.mechanics.components.s,
      m: "a pinch of synthetic ash",
      materialCostGp: 1,
    });
    const result = saveGatedDamageMechanicsFacts({
      mechanics: spell.mechanics,
    });

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.evidence).toEqual(expectedAcidSplashMaterialEvidence("cost"));
  });

  test("records a generic consumed material component as consumption evidence only", () => {
    const base = spellRecord("acid_splash");
    const spell = acidSplashWithComponents({
      v: base.mechanics.components.v,
      s: base.mechanics.components.s,
      m: "a pinch of synthetic ash",
      materialConsumed: true,
    });
    const result = saveGatedDamageMechanicsFacts({
      mechanics: spell.mechanics,
    });

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.evidence).toEqual(
      expectedAcidSplashMaterialEvidence("consumption"),
    );
  });

  test("records structured priced material as cost evidence without consumption", () => {
    const base = spellRecord("acid_splash");
    const spell = acidSplashWithComponents({
      v: base.mechanics.components.v,
      s: base.mechanics.components.s,
      m: {
        kind: "paired_worn_items",
        itemKind: "ring",
        material: "platinum",
        minimumValueGpEach: 1,
        wornBy: ["caster", "target"],
        requiredFor: "spell_duration",
      },
    });
    const result = saveGatedDamageMechanicsFacts({
      mechanics: spell.mechanics,
    });

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.evidence).toEqual(expectedAcidSplashMaterialEvidence("cost"));
  });

  test("static admission is invariant under a renamed synthetic authored record", () => {
    const original = spellRecord("acid_splash");
    const renamedSynthetic = decodeSpellRecordForTest({
      ...original,
      id: "synthetic_save_gated_damage_parity",
      name: "Synthetic Ember Splash",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_save_gated_damage_parity",
      },
    });
    const originalResult = saveGatedDamageProfile.admitMechanics(
      spellAdmissionSource(original),
    );
    const renamedResult = saveGatedDamageProfile.admitMechanics(
      spellAdmissionSource(renamedSynthetic),
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
});
