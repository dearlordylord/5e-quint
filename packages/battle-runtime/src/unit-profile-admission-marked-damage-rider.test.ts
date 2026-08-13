// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-marked-damage-rider
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  discoverBattleActs,
  spellBattle,
  spellRecord,
} from "./unit-profile-admission.test-support.ts";
import { decodeSpellRecordForTest } from "./unit-profile-admission-spell-record.test-support.ts";

describe("marked-damage rider spell admission", () => {
  test("rejects synthetic near misses that change the mark, damage, ability-check, or duration contract", () => {
    const huntersMark = spellRecord("hunters_mark");
    const hex = spellRecord("hex");
    if (
      huntersMark.mechanics.family !== "ongoing_effect" ||
      hex.mechanics.family !== "ongoing_effect" ||
      huntersMark.mechanics.duration.kind !== "concentration"
    ) {
      throw new Error("Expected marked-damage ongoing-effect mechanics.");
    }
    const huntersMarkDamage = huntersMark.mechanics.operations[0];
    const hexDamage = hex.mechanics.operations[0];
    const hexAbilityCheck = hex.mechanics.operations[1];
    if (
      huntersMarkDamage?.effect.kind !== "damage" ||
      hexDamage?.effect.kind !== "damage" ||
      hexAbilityCheck?.effect.kind !== "modify_roll_advantage" ||
      hexAbilityCheck.effect.abilityFilter === undefined ||
      !("kind" in hexAbilityCheck.effect.abilityFilter) ||
      hexAbilityCheck.effect.abilityFilter.kind !== "hole"
    ) {
      throw new Error("Expected marked-damage spell execution facts.");
    }
    const { upcastTiers: _upcastTiers, ...oneHour } =
      huntersMark.mechanics.duration.upTo;

    const nearMisses = [
      syntheticSpell(huntersMark, "extra-operation", {
        ...huntersMark.mechanics,
        operations: [huntersMarkDamage, huntersMarkDamage, huntersMarkDamage],
      }),
      syntheticSpell(huntersMark, "passive-damage", {
        ...huntersMark.mechanics,
        operations: [{ ...huntersMarkDamage, trigger: { kind: "passive" } }],
      }),
      syntheticSpell(huntersMark, "fire-damage", {
        ...huntersMark.mechanics,
        operations: [
          {
            ...huntersMarkDamage,
            effect: { ...huntersMarkDamage.effect, damageType: "fire" },
          },
        ],
      }),
      syntheticSpell(huntersMark, "character-scaled-damage", {
        ...huntersMark.mechanics,
        operations: [
          {
            ...huntersMarkDamage,
            effect: {
              ...huntersMarkDamage.effect,
              amount: {
                kind: "threshold_tiers",
                axis: "character",
                base: { dice: 1, dieSize: 6 },
                tiers: [{ atLevel: 5, override: { dice: 2 } }],
              },
            },
          },
        ],
      }),
      syntheticSpell(huntersMark, "minute-duration", {
        ...huntersMark.mechanics,
        duration: {
          ...huntersMark.mechanics.duration,
          upTo: { ...oneHour, unit: "minute" },
        },
      }),
      syntheticSpell(huntersMark, "two-hour-duration", {
        ...huntersMark.mechanics,
        duration: {
          ...huntersMark.mechanics.duration,
          upTo: { ...oneHour, amount: 2 },
        },
      }),
      syntheticSpell(huntersMark, "missing-duration-tiers", {
        ...huntersMark.mechanics,
        duration: { ...huntersMark.mechanics.duration, upTo: oneHour },
      }),
      syntheticSpell(hex, "damage-passive", {
        ...hex.mechanics,
        operations: [hexDamage, huntersMarkDamage],
      }),
      syntheticSpell(hex, "ability-advantage", {
        ...hex.mechanics,
        operations: [
          hexDamage,
          {
            ...hexAbilityCheck,
            effect: { ...hexAbilityCheck.effect, mode: "advantage" },
          },
        ],
      }),
      syntheticSpell(hex, "rolls-against-self", {
        ...hex.mechanics,
        operations: [
          hexDamage,
          {
            ...hexAbilityCheck,
            effect: {
              ...hexAbilityCheck.effect,
              affects: "rolls_against_self",
            },
          },
        ],
      }),
      syntheticSpell(hex, "saving-throw", {
        ...hex.mechanics,
        operations: [
          hexDamage,
          {
            ...hexAbilityCheck,
            effect: { ...hexAbilityCheck.effect, on: ["saving_throw"] },
          },
        ],
      }),
      syntheticSpell(hex, "fixed-ability-filter", {
        ...hex.mechanics,
        operations: [
          hexDamage,
          {
            ...hexAbilityCheck,
            effect: { ...hexAbilityCheck.effect, abilityFilter: ["wis"] },
          },
        ],
      }),
      syntheticSpell(hex, "per-target-ability", {
        ...hex.mechanics,
        operations: [
          hexDamage,
          {
            ...hexAbilityCheck,
            effect: {
              ...hexAbilityCheck.effect,
              abilityFilter: {
                ...hexAbilityCheck.effect.abilityFilter,
                kind: "per_target_hole",
              },
            },
          },
        ],
      }),
      syntheticSpell(hex, "incomplete-ability-choice", {
        ...hex.mechanics,
        operations: [
          hexDamage,
          {
            ...hexAbilityCheck,
            effect: {
              ...hexAbilityCheck.effect,
              abilityFilter: {
                ...hexAbilityCheck.effect.abilityFilter,
                value: {
                  ...hexAbilityCheck.effect.abilityFilter.value,
                  options: ["str", "dex", "con", "int", "wis"],
                },
              },
            },
          },
        ],
      }),
    ];

    for (const nearMiss of nearMisses) {
      const session = spellBattle({
        preparedSpells: [nearMiss],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      });
      expect(
        discoverBattleActs(session).some(
          (candidate) =>
            battleActSpellPresentation(candidate)?.invocation.procedure ===
            "markedDamageRider",
        ),
        nearMiss.name,
      ).toBe(false);
    }
  });

  test("treats an omitted roll owner as the Hex target's own ability check", () => {
    const hex = spellRecord("hex");
    if (hex.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Hex ongoing-effect mechanics.");
    }
    const hexAbilityCheck = hex.mechanics.operations[1];
    if (hexAbilityCheck?.effect.kind !== "modify_roll_advantage") {
      throw new Error("Expected Hex ability-check behavior.");
    }
    const { affects: _affects, ...effectWithoutAffects } =
      hexAbilityCheck.effect;
    const implicitSelfRoll = syntheticSpell(hex, "implicit-self-roll", {
      ...hex.mechanics,
      operations: [
        hex.mechanics.operations[0],
        { ...hexAbilityCheck, effect: effectWithoutAffects },
      ],
    });
    const session = spellBattle({
      preparedSpells: [implicitSelfRoll],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });

    expect(
      discoverBattleActs(session).some(
        (candidate) =>
          battleActSpellPresentation(candidate)?.invocation.procedure ===
          "markedDamageRider",
      ),
    ).toBe(true);
  });
});

function syntheticSpell(
  base: SpellRecord,
  suffix: string,
  mechanics: unknown,
): SpellRecord {
  return decodeSpellRecordForTest({
    ...base,
    id: `synthetic_marked_damage_${suffix}`,
    name: `Synthetic Marked Damage ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic-marked-damage-${suffix}`,
    },
    mechanics,
  });
}
