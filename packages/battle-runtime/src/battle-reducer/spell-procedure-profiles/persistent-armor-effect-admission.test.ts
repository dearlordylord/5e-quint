import { PositiveInteger } from "@dnd/shared/types";
import type { SpellMechanics, SpellRecord } from "@dnd/surface/surface/types";
import {
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { describe, expect, test } from "vitest";

import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
} from "../../battle-state-execution.ts";
import { spellAdmissionContextFor } from "./admission-context.ts";
import { persistentArmorEffectProfile } from "./persistent-armor-effect.ts";
import { admitPersistentArmorEffectSpell } from "../../procedure-admission/persistent-armor-effect-facts.ts";
import type { SpellMechanicsAdmissionSource } from "./spell-mechanics-admission.ts";
import {
  spellCasterId,
  unitLibrary,
} from "../../unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";

type OngoingSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;

function mechanicsSource(
  source: BattleSpellAdmissionSource,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function mageArmorMechanics(): OngoingSpellMechanics {
  const mechanics = spellRecord("mage_armor").mechanics;
  if (mechanics.family !== "ongoing_effect") {
    throw new Error("Expected the shipped Mage Armor mechanics to be ongoing.");
  }
  return mechanics;
}

function syntheticMageArmorRecord(
  mutate: (mechanics: OngoingSpellMechanics) => unknown,
  suffix: string,
): SpellRecord {
  const mechanics = mageArmorMechanics();
  return decodeSpellRecordForTest({
    id: `synthetic_persistent_armor_${suffix}`,
    kind: "spell",
    name: `Synthetic Persistent Armor ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic_persistent_armor_${suffix}`,
    },
    mechanics: mutate(mechanics),
  });
}

function syntheticMageArmorSource(
  mutate: (mechanics: OngoingSpellMechanics) => unknown,
  suffix: string,
): BattleSpellAdmissionSource {
  return spellAdmissionSource(syntheticMageArmorRecord(mutate, suffix));
}

function issueShape(result: {
  readonly tag: string;
  readonly issues?: readonly {
    readonly failedFact: string;
    readonly mechanicsPath: unknown;
  }[];
}): readonly {
  readonly failedFact: string;
  readonly mechanicsPath: unknown;
}[] {
  return result.tag === "unsupported"
    ? (result.issues ?? []).map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      }))
    : [];
}

describe("persistentArmorEffect static admission", () => {
  test("projects Mage Armor's exact facts and complete mechanics evidence", () => {
    const source = spellAdmissionSource(spellRecord("mage_armor"));
    const result = persistentArmorEffectProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 1,
      range: { kind: "touch" },
      duration: {
        kind: "timed",
        value: { unit: "hour", amount: 8 },
        earlyEnd: [{ kind: "target_dons_armor" }],
      },
      baseArmorClass: 13,
      ability: "dex",
    });
    expect(result.admitted.evidence).toEqual({
      consumed: [
        spellMechanicsHeaderPath("level"),
        spellMechanicsHeaderPath("school"),
        spellMechanicsHeaderPath("range"),
        spellMechanicsHeaderPath("components"),
        spellMechanicsHeaderPath("duration"),
        spellMechanicsHeaderPath("castingTime"),
        spellMechanicsHeaderPath("family"),
        spellDurationValuePath(),
        spellDurationEndingPath(PositiveInteger(1)),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
      ],
      unowned: [],
    });
  });

  test("keeps authored renaming out of static recognition and evidence", () => {
    const original = spellAdmissionSource(spellRecord("mage_armor"));
    const renamed = spellAdmissionSource(
      decodeSpellRecordForTest({
        id: "synthetic_persistent_armor_renamed",
        kind: "spell",
        name: "Synthetic Ward of Agility",
        provenance: {
          kind: "synthetic-test",
          section: "synthetic_persistent_armor_renamed",
        },
        mechanics: original.mechanics,
      }),
    );
    const originalResult = persistentArmorEffectProfile.admitMechanics(
      mechanicsSource(original),
    );
    const renamedResult = persistentArmorEffectProfile.admitMechanics(
      mechanicsSource(renamed),
    );

    expect(originalResult.tag).toBe("supported");
    expect(renamedResult.tag).toBe("supported");
    if (originalResult.tag !== "supported") return;
    if (renamedResult.tag !== "supported") return;
    expect(renamedResult.admitted.facts).toEqual(originalResult.admitted.facts);
    expect(renamedResult.admitted.evidence).toEqual(
      originalResult.admitted.evidence,
    );
  });

  test("does not claim any unrelated shipped SRD spell in the whole catalog", () => {
    const unrelatedSpellResults = unitLibrary
      .listUnits()
      .filter(
        (unit): unit is SpellRecord =>
          unit.kind === "spell" && unit.id !== "mage_armor",
      )
      .map((spell) =>
        persistentArmorEffectProfile.admitMechanics(
          mechanicsSource(spellAdmissionSource(spell)),
        ),
      );

    expect(unrelatedSpellResults.length).toBeGreaterThan(0);
    expect(unrelatedSpellResults).toEqual(
      unrelatedSpellResults.map(() => ({ tag: "notRepresented" })),
    );
  });

  test("does not claim a roll-modifier sibling with one armor-effect mutation", () => {
    const guidance = spellRecord("guidance");
    if (guidance.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected the shipped Guidance mechanics to be ongoing.");
    }
    const operation = guidance.mechanics.operations[0];
    if (operation === undefined) {
      throw new Error("Expected the shipped Guidance operation.");
    }
    const mutatedGuidance = spellAdmissionSource(
      decodeSpellRecordForTest({
        id: "synthetic_roll_modifier_with_armor_effect",
        kind: "spell",
        name: "Synthetic Guided Armor",
        provenance: {
          kind: "synthetic-test",
          section: "synthetic_roll_modifier_with_armor_effect",
        },
        mechanics: {
          ...guidance.mechanics,
          operations: [
            {
              ...operation,
              effect: {
                kind: "modify_ac_set_base",
                formula: { kind: "base_plus_dex", base: 13 },
              },
            },
          ],
        },
      }),
    );

    expect(
      persistentArmorEffectProfile.admitMechanics(
        mechanicsSource(mutatedGuidance),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test("uses the same exact base-Armor-Class gate for Spell Access", () => {
    const baseFourteen = syntheticMageArmorRecord((mechanics) => {
      const operation = mechanics.operations[0];
      if (
        operation === undefined ||
        operation.effect.kind !== "modify_ac_set_base" ||
        operation.effect.formula.kind !== "base_plus_dex"
      ) {
        throw new Error("Expected the Mage Armor base-AC operation.");
      }
      return {
        ...mechanics,
        operations: [
          {
            ...operation,
            effect: {
              ...operation.effect,
              formula: { ...operation.effect.formula, base: 14 },
            },
          },
        ],
      };
    }, "base_fourteen");

    expect(admitPersistentArmorEffectSpell(baseFourteen)).toBeNull();
  });

  test("keeps a malformed sibling candidate represented and rejects exact owned paths", () => {
    const malformedSibling = syntheticMageArmorSource((mechanics) => {
      const operation = mechanics.operations[0];
      if (operation === undefined) {
        throw new Error("Expected the Mage Armor operation.");
      }
      return {
        ...mechanics,
        operations: [
          {
            ...operation,
            effect: {
              kind: "modify_ac_set_floor" as const,
              const: 17,
            },
          },
        ],
      };
    }, "malformed_sibling");
    const result = persistentArmorEffectProfile.admitMechanics(
      mechanicsSource(malformedSibling),
    );

    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues).toEqual([
      expect.objectContaining({
        failedFact: "armorClassEffect",
        mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
      }),
    ]);
  });

  test.each([
    [
      "level",
      (mechanics: OngoingSpellMechanics) => ({ ...mechanics, level: 2 }),
      "level",
      spellMechanicsHeaderPath("level"),
    ],
    [
      "school",
      (mechanics: OngoingSpellMechanics) => ({
        ...mechanics,
        school: "transmutation",
      }),
      "school",
      spellMechanicsHeaderPath("school"),
    ],
    [
      "range",
      (mechanics: OngoingSpellMechanics) => ({
        ...mechanics,
        range: { kind: "self" as const },
      }),
      "range",
      spellMechanicsHeaderPath("range"),
    ],
    [
      "components",
      (mechanics: OngoingSpellMechanics) => ({
        ...mechanics,
        components: { v: true, s: true, m: false },
      }),
      "components",
      spellMechanicsHeaderPath("components"),
    ],
    [
      "duration value",
      (mechanics: OngoingSpellMechanics) => {
        if (mechanics.duration.kind !== "timed") {
          throw new Error("Expected a timed Mage Armor duration.");
        }
        return {
          ...mechanics,
          duration: {
            ...mechanics.duration,
            value: { ...mechanics.duration.value, amount: 9 },
          },
        };
      },
      "durationValue",
      spellDurationValuePath(),
    ],
    [
      "duration ending",
      (mechanics: OngoingSpellMechanics) => ({
        ...mechanics,
        duration: {
          ...mechanics.duration,
          earlyEnd: [{ kind: "target_casts_spell" as const }],
        },
      }),
      "durationEnding",
      spellDurationEndingPath(PositiveInteger(1)),
    ],
    [
      "casting time",
      (mechanics: OngoingSpellMechanics) => ({
        ...mechanics,
        castingTime: { kind: "bonus_action" as const },
      }),
      "castingTime",
      spellMechanicsHeaderPath("castingTime"),
    ],
    [
      "attachment selection",
      (mechanics: OngoingSpellMechanics) => {
        if (
          mechanics.attachment.kind !== "hole" ||
          mechanics.attachment.value.kind !== "target"
        ) {
          throw new Error("Expected a target attachment hole.");
        }
        return {
          ...mechanics,
          attachment: {
            ...mechanics.attachment,
            value: {
              ...mechanics.attachment.value,
              selection: { mode: "one" as const, targetKinds: ["creature"] },
            },
          },
        };
      },
      "attachment",
      spellOngoingAttachmentPath(),
    ],
    [
      "armor formula",
      (mechanics: OngoingSpellMechanics) => {
        const operation = mechanics.operations[0];
        if (
          operation === undefined ||
          operation.effect.kind !== "modify_ac_set_base"
        ) {
          throw new Error("Expected the Mage Armor base-AC operation.");
        }
        return {
          ...mechanics,
          operations: [
            {
              ...operation,
              effect: {
                ...operation.effect,
                formula: { kind: "base_plus_dex_con" as const, base: 13 },
              },
            },
          ],
        };
      },
      "armorClassEffect",
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    ],
  ] as const)(
    "keeps a one-field %s mutation represented with one exact issue",
    (_label, mutate, failedFact, mechanicsPath) => {
      const source = syntheticMageArmorSource(mutate, `mutation_${failedFact}`);
      const result = persistentArmorEffectProfile.admitMechanics(
        mechanicsSource(source),
      );

      expect(result.tag).toBe("unsupported");
      if (result.tag !== "unsupported") return;
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({ failedFact, mechanicsPath });
      expect(issueShape(result)).toEqual([{ failedFact, mechanicsPath }]);
    },
  );

  test("invokes the admitted closure with total projected execution facts", () => {
    const source = spellAdmissionSource(spellRecord("mage_armor"));
    const result = persistentArmorEffectProfile.admitMechanics(
      mechanicsSource(source),
    );
    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;

    const session = spellBattle({
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const actor = session.state.combatants.get(spellCasterId);
    if (actor === undefined) {
      throw new Error(
        "Expected the spell-admission caster in the test battle.",
      );
    }
    const context = spellAdmissionContextFor(actor, session.state);
    if (context === null) {
      throw new Error(
        "Expected a spell-admission context for the test caster.",
      );
    }

    const invocations = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      { ...context, castingSource: source.castingSource },
    );
    expect(invocations).toHaveLength(1);
    expect(invocations[0]).toMatchObject({
      procedure: "persistentArmorEffect",
      resource: { tag: "spellSlot", slotLevel: 1 },
      rangeFeet: 5,
      activeEffect: {
        kind: "spellBaseArmorClass",
        sourceCombatantId: spellCasterId,
        base: 13,
        ability: "dex",
        expiresAt: { kind: "duration", durationTicks: 4_800 },
        earlyEnds: [{ kind: "targetDonsArmor" }],
      },
    });
    expect(invocations[0]?.spell).not.toHaveProperty("mechanics");
  });
});
