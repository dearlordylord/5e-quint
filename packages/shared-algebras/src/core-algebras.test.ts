import { DieRollResult } from "@dnd/shared/types";
import { srdUnitCollection } from "@dnd/surface/surface/unit-catalog";
import { describe, expect, test } from "vitest";

import {
  abilityModifier,
  armorClass,
  armorClassDelta,
  currentArmorClass,
  currentCreatureArmorClass,
  defaultArmorClassState,
  statBlockArmorClassState,
  type ArmorClassState,
} from "./armor-class-algebra.ts";
import {
  attackRollHits,
  attackRollIsCritical,
  attackRollResultIsValid,
} from "./attack-roll-algebra.ts";
import {
  isAttackExceptionRetainedCompanionProtocol,
  isRetainedCompanionProtocolTag,
  ordinaryFamiliarLikeProtocol,
  ownerLongRestExpiringFamiliarLikeProtocol,
  pactFamiliarLikeProtocol,
  retainedCompanionProtocolFacts,
} from "./companion-protocol-algebra.ts";
import { isMonkWeapon } from "./martial-arts-algebra.ts";
import {
  rolledDiceTotal,
  validateRolledDiceForDiceExpr,
} from "./runtime-dice-algebra.ts";
import {
  holeId,
  holeInstanceKey,
  holeLocalKey,
  holeStepKey,
} from "./runtime-hole-algebra.ts";
import { zeroHitPointReplacementUnitProfile } from "./zero-hit-point-replacement-algebra.ts";

function armorState(input: Partial<ArmorClassState> = {}): ArmorClassState {
  return { ...defaultArmorClassState(), ...input };
}

describe("armor class algebra", () => {
  test("computes stat-block, ability, and armor formula bases", () => {
    expect(currentArmorClass(defaultArmorClassState())).toBe(10);
    expect(currentArmorClass(statBlockArmorClassState(14))).toBe(14);
    expect(
      currentArmorClass(
        armorState({
          abilityModifiers: {
            ...defaultArmorClassState().abilityModifiers,
            dex: abilityModifier(3),
            wis: abilityModifier(2),
          },
          base: {
            kind: "ability_sum",
            base: armorClass(10),
            abilityModifiers: ["dex", "wis"],
            source: "unarmored_defense",
            sourceUnitId: "synthetic:unarmored-defense",
          },
        }),
      ),
    ).toBe(15);

    for (const [formula, dexterity, expected] of [
      [{ kind: "light_dex", base: 11 }, 3, 14],
      [{ kind: "medium_dex_max_2", base: 12 }, 4, 14],
      [{ kind: "medium_dex_max_2", base: 12 }, -1, 11],
      [{ kind: "heavy_fixed", ac: 16 }, 4, 16],
    ] as const) {
      expect(
        currentArmorClass(
          armorState({
            abilityModifiers: {
              ...defaultArmorClassState().abilityModifiers,
              dex: abilityModifier(dexterity),
            },
            base: { kind: "armor", category: "light", formula },
          }),
        ),
      ).toBe(expected);
    }
  });

  test("applies only eligible bonuses and the highest floor", () => {
    const state = armorState({
      base: {
        kind: "armor",
        category: "medium",
        formula: { kind: "medium_dex_max_2", base: 12 },
      },
      leftHandUse: "shield",
      armorTraining: new Set(["shield"]),
      bonuses: [
        { kind: "flat", bonus: armorClassDelta(1) },
        {
          kind: "shield",
          bonus: armorClassDelta(2),
          handUse: "shield",
          trainingRequired: "shield",
        },
        { kind: "unarmored_no_shield", bonus: armorClassDelta(9) },
        {
          kind: "wearing_armor",
          bonus: armorClassDelta(1),
          categories: ["medium"],
        },
        {
          kind: "wearing_armor",
          bonus: armorClassDelta(9),
          categories: ["heavy"],
        },
      ],
      floors: [{ floor: armorClass(12) }, { floor: armorClass(20) }],
    });
    expect(currentArmorClass(state)).toBe(20);
    expect(currentCreatureArmorClass({ armorClass: state })).toBe(20);

    expect(
      currentArmorClass(
        armorState({
          bonuses: [
            {
              kind: "unarmored_no_shield",
              bonus: armorClassDelta(2),
            },
            {
              kind: "shield",
              bonus: armorClassDelta(9),
              handUse: "shield",
              trainingRequired: "shield",
            },
          ],
        }),
      ),
    ).toBe(12);
  });
});

describe("small runtime algebras", () => {
  test("maps retained companion protocols to their executable facts", () => {
    const ordinary = ordinaryFamiliarLikeProtocol();
    const pact = pactFamiliarLikeProtocol();
    const expiring = ownerLongRestExpiringFamiliarLikeProtocol();

    expect(retainedCompanionProtocolFacts(ordinary).attack.tag).toBe(
      "cannotAttack",
    );
    expect(retainedCompanionProtocolFacts(pact).formCatalog).toBe(
      "pactOfTheChain",
    );
    expect(retainedCompanionProtocolFacts(expiring).expiration.tag).toBe(
      "ownerFinishedLongRest",
    );
    expect(isAttackExceptionRetainedCompanionProtocol(pact)).toBe(true);
    expect(isAttackExceptionRetainedCompanionProtocol(ordinary)).toBe(false);
    expect(
      isRetainedCompanionProtocolTag("ownerLongRestFamiliarLikeOneAtATime"),
    ).toBe(true);
    expect(isRetainedCompanionProtocolTag("synthetic:unknown")).toBe(false);
  });

  test("validates attack and damage rolls", () => {
    const roll = {
      total: 15,
      naturalD20: DieRollResult(10),
      rollMode: "normal" as const,
    };
    expect(attackRollHits(roll, 15)).toBe(true);
    expect(attackRollHits({ ...roll, naturalD20: DieRollResult(1) }, 1)).toBe(
      false,
    );
    expect(attackRollHits({ ...roll, naturalD20: DieRollResult(20) }, 99)).toBe(
      true,
    );
    expect(
      attackRollIsCritical({ ...roll, naturalD20: DieRollResult(20) }),
    ).toBe(true);
    expect(attackRollIsCritical(roll)).toBe(false);
    expect(attackRollResultIsValid(roll)).toBe(true);
    expect(attackRollResultIsValid({ ...roll, total: 1.5 })).toBe(false);
    expect(
      attackRollResultIsValid({
        ...roll,
        naturalD20: DieRollResult(21),
      }),
    ).toBe(false);

    const groups = [
      { results: [DieRollResult(2), DieRollResult(5)] },
      { results: [DieRollResult(3)] },
    ];
    expect(rolledDiceTotal(groups)).toBe(10);
    expect(
      validateRolledDiceForDiceExpr(groups, {
        dice: 3,
        dieSize: 6,
        flat: 0,
      }),
    ).toBeNull();
    expect(
      validateRolledDiceForDiceExpr(groups, {
        dice: 2,
        dieSize: 6,
        flat: 0,
      }),
    ).toMatchObject({ reason: expect.stringContaining("count") });
    expect(
      validateRolledDiceForDiceExpr([{ results: [DieRollResult(7)] }], {
        dice: 1,
        dieSize: 6,
        flat: 0,
      }),
    ).toMatchObject({ reason: expect.stringContaining("outside") });
  });

  test("recognizes Monk weapons and constructs runtime hole identities", () => {
    expect(isMonkWeapon({ usage: "melee", category: "simple" })).toBe(true);
    expect(
      isMonkWeapon({
        usage: "melee",
        category: "martial",
        properties: [{ kind: "light" }],
      }),
    ).toBe(true);
    expect(
      isMonkWeapon({
        usage: "melee",
        category: "martial",
        properties: [],
      }),
    ).toBe(false);
    expect(
      isMonkWeapon({
        usage: "melee",
        category: "martial",
      }),
    ).toBe(false);
    expect(isMonkWeapon({ usage: "ranged", category: "simple" })).toBe(false);
    expect(String(holeId("synthetic:hole"))).toBe("synthetic:hole");
    expect(String(holeStepKey("synthetic:step"))).toBe("synthetic:step");
    expect(String(holeLocalKey("synthetic:local"))).toBe("synthetic:local");
    expect(String(holeInstanceKey("synthetic:instance"))).toBe(
      "synthetic:instance",
    );
  });

  test("admits only the shipped zero-hit-point replacement shape", () => {
    const profile = srdUnitCollection.units
      .map(zeroHitPointReplacementUnitProfile)
      .find((candidate) => candidate !== null);
    expect(profile).toMatchObject({
      optional: true,
      replacementHp: 1,
      resetCadence: "longRest",
    });
    expect(
      zeroHitPointReplacementUnitProfile(srdUnitCollection.units[0]),
    ).toBeNull();
    if (profile === undefined || profile === null) return;
    expect(
      zeroHitPointReplacementUnitProfile({
        ...profile.unit,
        mechanics: {
          ...profile.unit.mechanics,
          effect: {
            ...profile.unit.mechanics.effect,
            replacementHp: 2,
          },
        },
      }),
    ).toBeNull();
  });
});
