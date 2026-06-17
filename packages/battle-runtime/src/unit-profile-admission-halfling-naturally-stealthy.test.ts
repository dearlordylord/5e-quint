// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-HALFLING-NATURALLY-STEALTHY-RUNTIME species_halfling_naturally_stealthy
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.hide-action-obscurement-permission

import type { Size, UnitRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import type {
  BattleHidePrerequisite,
  BattleState,
} from "./battle-reducer.ts";
import type { BattleUnitRef } from "./battle-init.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import {
  abilityCheckFill,
  characterSeed,
  fighterId,
  findAct,
  findHole,
  hidePrerequisites,
  oppositionSide,
  requireResolved,
  resolveBattleSubject,
  startBattle,
  startBattleRight,
} from "./battle-runtime-test-support.ts";
import {
  battleHideActionObscurementPermissionSupportForUnit,
  battleId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  discoverBattleActs,
  Either,
  HIDE_ACTION_OBSCUREMENT_PERMISSION_SUPPORT_PROFILE,
  hideActionObscurementPermissionProfileForUnit,
  parseSupportedUnitFeatureProfile,
  speciesHalflingNaturallyStealthyUnitId,
  unitLibrary,
  unitMechanicsVariant,
} from "./unit-profile-admission-test-support.ts";

const obscuringCreatureId = combatantId(
  "naturally-stealthy-obscuring-creature",
);

const expectedPermission = {
  allowedObscurement: {
    kind: "obscuredOnlyByCreature",
    creatureSizeRelationToSelf: "atLeastOneSizeLarger",
  },
} as const;

const expectedSupport = {
  kind: HIDE_ACTION_OBSCUREMENT_PERMISSION_SUPPORT_PROFILE,
  permission: expectedPermission,
} as const;

const hideSubject: BattleSubject = {
  tag: "action",
  actorId: fighterId,
  action: "hide",
};

describe("L3-FOLLOWUP-HALFLING-NATURALLY-STEALTHY-RUNTIME deterministic profile slice", () => {
  test("Naturally Stealthy admits the Hide action creature-obscurement permission profile", () => {
    const unit = unitLibrary.requireUnit(speciesHalflingNaturallyStealthyUnitId);

    expect(hideActionObscurementPermissionProfileForUnit(unit)).toEqual(
      expectedPermission,
    );
    expect(battleHideActionObscurementPermissionSupportForUnit(unit)).toEqual(
      expectedSupport,
    );
    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: speciesHalflingNaturallyStealthyUnitId,
        supportProfiles: [expectedSupport],
      }),
    );
    expect(parseSupportedUnitFeatureProfile(unit, [])).toEqual({
      kind: "hideActionObscurementPermission",
      unit,
      permission: expectedPermission,
    });
  });

  test("Hide obscurement permission admission follows mechanics shape rather than Unit identity", () => {
    const syntheticUnit = syntheticHideObscurementPermissionUnit();

    expect(
      battleHideActionObscurementPermissionSupportForUnit(syntheticUnit),
    ).toEqual(expectedSupport);
    expect(parseSupportedUnitFeatureProfile(syntheticUnit, [])).toEqual({
      kind: "hideActionObscurementPermission",
      unit: syntheticUnit,
      permission: expectedPermission,
    });
  });

  test("a selected Hide obscurement permission allows Hide when a larger creature is the only obscurement", () => {
    const syntheticUnit = syntheticHideObscurementPermissionUnit();
    const { unitRef } = supportSelection(syntheticUnit);
    const state = naturallyStealthyBattle({
      actorSize: "small",
      obscuringCreatureSize: "medium",
      unitRef,
    });

    const hide = findAct(state, hideSubject);
    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject: hideSubject,
        fills: [
          abilityCheckFill(findHole(hide.initialHoles, "abilityCheck"), 18),
        ],
      }),
    );

    expect(hidden.state.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: 18,
    });
    expect(hidden.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          conditions: expect.arrayContaining(["invisible"]),
        }),
      ]),
    );
  });

  test("creature-obscured Hide is unavailable without the selected permission profile", () => {
    const state = naturallyStealthyBattle({
      actorSize: "small",
      obscuringCreatureSize: "medium",
      unitRef: null,
    });

    expect(discoverBattleActs(state).map((act) => act.subject)).not.toContainEqual(
      hideSubject,
    );
    expect(resolveBattleSubject({ state, subject: hideSubject, fills: [] }))
      .toMatchObject({
        tag: "invalid",
        reason: "unsupportedActOption",
      });
  });

  test("creature-obscured Hide requires the obscuring creature to be at least one size larger", () => {
    const { unitRef } = supportSelection(
      unitLibrary.requireUnit(speciesHalflingNaturallyStealthyUnitId),
    );
    const state = naturallyStealthyBattle({
      actorSize: "small",
      obscuringCreatureSize: "small",
      unitRef,
    });

    expect(discoverBattleActs(state).map((act) => act.subject)).not.toContainEqual(
      hideSubject,
    );
    expect(resolveBattleSubject({ state, subject: hideSubject, fills: [] }))
      .toMatchObject({
        tag: "invalid",
        reason: "unsupportedActOption",
      });
  });

  test("creature-obscurement prerequisites reject unknown or self-obscuring combatants", () => {
    const { unitRef } = supportSelection(
      unitLibrary.requireUnit(speciesHalflingNaturallyStealthyUnitId),
    );
    const unknown = startBattle({
      battleId: battleId("naturally-stealthy-unknown-obscurer"),
      combatants: [
        hiderSeed({
          actorSize: "small",
          unitRef,
        }),
      ],
      hidePrerequisites: hidePrerequisites([
        [
          fighterId,
          {
            kind: "obscuredOnlyByCreatureOutOfEnemyLineOfSight",
            obscuringCreatureId,
          },
        ],
      ]),
    });
    const selfObscuring = startBattle({
      battleId: battleId("naturally-stealthy-self-obscurer"),
      combatants: [
        hiderSeed({
          actorSize: "small",
          unitRef,
        }),
      ],
      hidePrerequisites: hidePrerequisites([
        [
          fighterId,
          {
            kind: "obscuredOnlyByCreatureOutOfEnemyLineOfSight",
            obscuringCreatureId: fighterId,
          },
        ],
      ]),
    });

    expect(Either.isLeft(unknown)).toBe(true);
    expect(Either.isLeft(selfObscuring)).toBe(true);
  });
});

function syntheticHideObscurementPermissionUnit(): UnitRecord {
  const unit = unitLibrary.requireUnit(speciesHalflingNaturallyStealthyUnitId);
  if (
    unit.kind !== "species_trait" ||
    unit.mechanics.family !== "hide_action_obscurement_permission"
  ) {
    throw new Error("Expected Naturally Stealthy Hide permission species trait.");
  }
  return unitMechanicsVariant(unit, {
    id: "synthetic_hide_obscurement_permission_fixture",
    mechanics: unit.mechanics,
  });
}

function supportSelection(unit: UnitRecord): { readonly unitRef: BattleUnitRef } {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(Either.isRight(unitRef)).toBe(true);
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return { unitRef: unitRef.right };
}

function naturallyStealthyBattle(input: {
  readonly actorSize: Size;
  readonly obscuringCreatureSize: Size;
  readonly unitRef: BattleUnitRef | null;
  readonly prerequisite?: BattleHidePrerequisite;
}): BattleState {
  return startBattleRight({
    battleId: battleId("naturally-stealthy-creature-obscurement"),
    combatants: [
      hiderSeed({
        actorSize: input.actorSize,
        unitRef: input.unitRef,
      }),
      characterSeed({
        combatantId: obscuringCreatureId,
        displayName: "Obscuring Creature",
        initiative: 10,
        side: oppositionSide,
        size: input.obscuringCreatureSize,
        attack: null,
      }),
    ],
    hidePrerequisites: hidePrerequisites([
      [
        fighterId,
        input.prerequisite ?? {
          kind: "obscuredOnlyByCreatureOutOfEnemyLineOfSight",
          obscuringCreatureId,
        },
      ],
    ]),
  });
}

function hiderSeed(input: {
  readonly actorSize: Size;
  readonly unitRef: BattleUnitRef | null;
}) {
  return characterSeed({
    combatantId: fighterId,
    displayName: "Small Hider",
    initiative: 20,
    size: input.actorSize,
    attack: null,
    characterUnitRefs: input.unitRef === null ? [] : [input.unitRef],
  });
}
