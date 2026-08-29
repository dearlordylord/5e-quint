import { CLASS_NAMES } from "@dnd/shared/game-facts";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  rangerHuntersPreyUnitId,
  speciesDragonbornBreathWeaponUnitId,
  speciesDragonbornDamageResistanceUnitId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  admitBattleUnitSupportPlan,
  battleUnitRefWithSupportProfiles,
  bindAdmittedBattleUnitSupportPlan,
  type BattleUnitSupportPlanBindingInput,
} from "./unit-feature-support.ts";

const allClassLevels = CLASS_NAMES.map((className) => ({
  className,
  level: 20,
}));

describe("admitted Unit support plan", () => {
  test("matches the raw aggregate across representative retained contexts", () => {
    const sourceFactUnitIds = [
      speciesDragonbornBreathWeaponUnitId,
      speciesDragonbornDamageResistanceUnitId,
    ];
    const sourceFacts = (
      ["acid", "cold", "fire", "lightning", "poison"] as const
    ).map((draconicAncestryDamageType) => ({
      draconicAncestryDamageType,
    }));
    for (const unit of unitLibrary.listUnits()) {
      const contexts: readonly BattleUnitSupportPlanBindingInput[] = [
        {},
        { classLevels: allClassLevels },
        ...(sourceFactUnitIds.includes(String(unit.id))
          ? sourceFacts.map((facts) => ({ sourceFacts: facts }))
          : []),
        ...(String(unit.id) === rangerHuntersPreyUnitId
          ? [
              {
                selectedOption: {
                  kind: "huntersPrey" as const,
                  selection: "woundedTargetWeaponDamage" as const,
                },
              },
              {
                selectedOption: {
                  kind: "huntersPrey" as const,
                  selection: "nearbyDifferentTargetSameWeaponAttack" as const,
                },
              },
            ]
          : []),
      ];
      const plan = admitBattleUnitSupportPlan(unit);
      if (Either.isLeft(plan)) {
        expect(
          Either.isLeft(
            battleUnitRefWithSupportProfiles({
              unit,
              unitRef: { unitId: unit.id },
            }),
          ),
          String(unit.id),
        ).toBe(true);
        continue;
      }
      for (const binding of contexts) {
        const bound = bindAdmittedBattleUnitSupportPlan({
          plan: plan.right,
          binding,
        });
        const raw = battleUnitRefWithSupportProfiles({
          unit,
          unitRef: {
            unitId: unit.id,
            ...(binding.selectedOption === undefined
              ? {}
              : { selectedOption: binding.selectedOption }),
          },
          ...(binding.classLevels === undefined
            ? {}
            : { classLevels: binding.classLevels }),
          ...(binding.sourceFacts === undefined
            ? {}
            : { sourceFacts: binding.sourceFacts }),
        });
        expect(Either.isRight(bound), `${unit.id} bound`).toBe(
          Either.isRight(raw),
        );
        if (Either.isRight(bound) && Either.isRight(raw)) {
          expect(bound.right, String(unit.id)).toEqual(
            raw.right.supportProfiles,
          );
        }
      }
    }
  });

  test("does not dispatch on authored identity", () => {
    const unit = unitLibrary.requireUnit(
      speciesDragonbornDamageResistanceUnitId,
    );
    const renamed = {
      ...unit,
      id: "synthetic_renamed_resistance",
      name: "Renamed Synthetic Resistance",
    } as typeof unit;
    const original = admitBattleUnitSupportPlan(unit);
    const synthetic = admitBattleUnitSupportPlan(renamed);
    expect(Either.isRight(original)).toBe(true);
    expect(Either.isRight(synthetic)).toBe(true);
    if (Either.isLeft(original) || Either.isLeft(synthetic)) return;
    const binding = {
      sourceFacts: { draconicAncestryDamageType: "lightning" as const },
    };
    expect(
      bindAdmittedBattleUnitSupportPlan({ plan: synthetic.right, binding }),
    ).toEqual(
      bindAdmittedBattleUnitSupportPlan({ plan: original.right, binding }),
    );
  });
});
