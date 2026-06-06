// RAW-COVERAGE: runtime-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.attack-action-area-save-damage-replacement
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.attack-action-area-save-damage-replacement
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3MSPEC-03-DRAGONBORN-BREATH-WEAPON-RUNTIME species_dragonborn_breath_weapon
// UNIT-IDENTITY-MBT-REPLAY: L3MSPEC-03-DRAGONBORN-BREATH-WEAPON-RUNTIME species_dragonborn_breath_weapon doResolveBreathWeapon doOpenExtraAttackSlot doRejectMissingResource doRejectMismatchedArea doRejectInvalidDamageRoll
import * as path from "node:path";

import { describe, expect, test } from "vitest";

import { DieRollResult } from "@dnd/shared/types";
import * as Either from "effect/Either";

import type {
  BattleFill,
  BattleHole,
  BattleResolutionResult,
  BattleState,
  CombatantId,
} from "./index.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  fighterExtraAttackUnitId,
  oppositionSide,
  partySide,
  speciesDragonbornBreathWeaponUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  battleId,
  battleAttackActionAreaSaveDamageReplacementSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  combatantId,
  discoverBattleActs,
  resolveBattleSubject,
  startBattle,
} from "./unit-profile-admission-test-support.ts";
import { extraAttackBattleUnitRef } from "./unit-profile-admission-feature-fixture-support.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";

type BreathWeaponLastResult =
  | "init"
  | "resolved"
  | "openedExtraAttack"
  | "rejectMissingResource"
  | "rejectMismatchedArea"
  | "rejectInvalidDamageRoll";
type BreathWeaponProjection = {
  readonly targetHp: number;
  readonly secondTargetHp: number;
  readonly breathWeaponUsesRemaining: number;
  readonly actionResourcesRemaining: number;
  readonly lastResult: BreathWeaponLastResult;
};

const breathWeaponUnit = unitLibrary.requireUnit(
  speciesDragonbornBreathWeaponUnitId,
);
const secondTargetId = combatantId("dragonborn-breath-second-target");

defineSelectedIdentityWitness({
  describeLabel: "Dragonborn Breath Weapon selected identity MBT",
  taskId: "L3MSPEC-03-DRAGONBORN-BREATH-WEAPON-RUNTIME",
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-dragonborn-breath-weapon.mbt.qnt",
  ),
  projectionSchema: {
    targetHp: "int",
    secondTargetHp: "int",
    breathWeaponUsesRemaining: "int",
    actionResourcesRemaining: "int",
    lastResult: "str",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: speciesDragonbornBreathWeaponUnitId,
      procedures: [
        {
          actionName: "doResolveBreathWeapon",
          projectionAfter: expectedProjection({
            targetHp: 10,
            secondTargetHp: 15,
            breathWeaponUsesRemaining: 2,
            actionResourcesRemaining: 0,
            lastResult: "resolved",
          }),
          discover: () =>
            projectBattleState(
              recordResolvedState(
                resolveBreathWeapon(breathWeaponBattle(), {
                  outcomes: [
                    { targetId: spellTargetId, succeeded: false },
                    { targetId: secondTargetId, succeeded: true },
                  ],
                  areaTargetIds: [spellTargetId, secondTargetId],
                  damageRolls: [6, 4],
                }),
              ),
              "resolved",
            ),
        },
        {
          actionName: "doOpenExtraAttackSlot",
          projectionAfter: expectedProjection({
            targetHp: 10,
            breathWeaponUsesRemaining: 2,
            actionResourcesRemaining: 1,
            lastResult: "openedExtraAttack",
          }),
          discover: () =>
            projectBattleState(
              recordResolvedState(
                resolveBreathWeapon(breathWeaponBattle({ extraAttack: true }), {
                  outcomes: [{ targetId: spellTargetId, succeeded: false }],
                  areaTargetIds: [spellTargetId],
                  damageRolls: [5, 5],
                }),
              ),
              "openedExtraAttack",
            ),
        },
        {
          actionName: "doRejectMissingResource",
          projectionAfter: expectedProjection({
            breathWeaponUsesRemaining: 0,
            lastResult: "rejectMissingResource",
          }),
          discover: () => {
            const state = breathWeaponBattle({ usesRemaining: 0 });
            recordInvalidResult(
              resolveBattleSubject({
                state,
                subject: breathWeaponSubject(),
                fills: [],
              }),
            );
            return projectBattleState(state, "rejectMissingResource");
          },
        },
        {
          actionName: "doRejectMismatchedArea",
          projectionAfter: expectedProjection({
            lastResult: "rejectMismatchedArea",
          }),
          discover: () => {
            const state = breathWeaponBattle();
            recordInvalidResult(
              resolveBreathWeaponSave(state, {
                outcomes: [{ targetId: spellTargetId, succeeded: false }],
                areaTargetIds: [spellTargetId, secondTargetId],
              }),
            );
            return projectBattleState(state, "rejectMismatchedArea");
          },
        },
        {
          actionName: "doRejectInvalidDamageRoll",
          projectionAfter: expectedProjection({
            lastResult: "rejectInvalidDamageRoll",
          }),
          discover: () => {
            const state = breathWeaponBattle();
            recordInvalidResult(
              resolveBreathWeapon(state, {
                outcomes: [{ targetId: spellTargetId, succeeded: false }],
                areaTargetIds: [spellTargetId],
                damageRolls: [11, 4],
              }),
            );
            return projectBattleState(state, "rejectInvalidDamageRoll");
          },
        },
      ],
    },
  ],
});

describe("Dragonborn Breath Weapon runtime", () => {
  test("discovers Breath Weapon from selected Draconic Ancestry source facts", () => {
    const state = breathWeaponBattle();
    const act = breathWeaponAct(state);

    expect(act.subject).toMatchObject({
      tag: "unitFeature",
      actorId: spellCasterId,
      unitId: speciesDragonbornBreathWeaponUnitId,
    });
    expect(requireHole(act.initialHoles, "savingThrowOutcome")).toMatchObject({
      unitFeature: {
        unitId: speciesDragonbornBreathWeaponUnitId,
        label: "Breath Weapon",
      },
      ability: "dex",
      dc: { kind: "fixed", dc: 11 },
      targetIds: expect.arrayContaining([spellTargetId, secondTargetId]),
    });
  });

  test("resolves Dexterity saves, rolls selected ancestry damage, and spends one use", () => {
    const state = breathWeaponBattle();
    const pendingDamage = resolveBreathWeaponSave(state, {
      outcomes: [
        { targetId: spellTargetId, succeeded: false },
        { targetId: secondTargetId, succeeded: true },
      ],
      areaTargetIds: [spellTargetId, secondTargetId],
    });
    expect(pendingDamage).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "rolledDice",
          label: "Breath Weapon damage (2d10)",
        }),
      ],
    });
    if (pendingDamage.tag !== "needsHoles") {
      throw new Error("Expected Breath Weapon to request a damage roll.");
    }

    const damage = requireHole(pendingDamage.holes, "rolledDice");
    const resolved = recordResolvedState(
      resolveBattleSubject({
        state,
        subject: breathWeaponSubject(),
        fills: [
          breathWeaponSavingThrowFill(
            requireHole(
              breathWeaponAct(state).initialHoles,
              "savingThrowOutcome",
            ),
            [
              { targetId: spellTargetId, succeeded: false },
              { targetId: secondTargetId, succeeded: true },
            ],
            [spellTargetId, secondTargetId],
          ),
          rolledDiceFill(damage, [6, 4]),
        ],
      }),
    );

    expect(currentHp(resolved, spellTargetId)).toBe(10);
    expect(currentHp(resolved, secondTargetId)).toBe(15);
    expect(breathWeaponUsesRemaining(resolved)).toBe(2);
    expect(resolved.currentTurnResources.actionResources).toHaveLength(0);
  });

  test("opens the remaining Extra Attack slot after replacing the first attack", () => {
    const state = breathWeaponBattle({ extraAttack: true });
    const resolved = recordResolvedState(
      resolveBreathWeapon(state, {
        outcomes: [{ targetId: spellTargetId, succeeded: false }],
        areaTargetIds: [spellTargetId],
        damageRolls: [5, 5],
      }),
    );

    expect(resolved.currentTurnResources.actionResources).toEqual([
      expect.objectContaining({
        source: "classFeatureExtraAttack",
        sourceUnitId: fighterExtraAttackUnitId,
      }),
    ]);
  });

  test("rejects Saving Throw outcomes that do not match the table area", () => {
    const state = breathWeaponBattle();
    const result = resolveBreathWeaponSave(state, {
      outcomes: [{ targetId: spellTargetId, succeeded: false }],
      areaTargetIds: [spellTargetId, secondTargetId],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Breath Weapon Saving Throw outcomes must cover every table-supplied area affected target.",
    });
  });
});

function breathWeaponBattle(
  input: {
    readonly extraAttack?: boolean;
    readonly usesRemaining?: number;
  } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("dragonborn-breath-weapon-runtime"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Dragonborn Fighter",
        initiative: 20,
        side: partySide,
        classLevels: [{ className: "fighter", level: classLevel(5) }],
        characterUnitRefs: [
          breathWeaponUnitRef(),
          ...(input.extraAttack === true ? [extraAttackBattleUnitRef()] : []),
        ],
        resources: [
          {
            unit: breathWeaponUnit,
            ...(input.usesRemaining === undefined
              ? {}
              : { usesRemaining: input.usesRemaining }),
          },
        ],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Failed Save Target",
        initiative: 10,
        side: oppositionSide,
        currentHp: 20,
        maxHp: 20,
      }),
      characterCreature({
        combatantId: secondTargetId,
        displayName: "Successful Save Target",
        initiative: 9,
        side: oppositionSide,
        currentHp: 20,
        maxHp: 20,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function expectedProjection(
  overrides: Partial<BreathWeaponProjection> = {},
): BreathWeaponProjection {
  return {
    targetHp: 20,
    secondTargetHp: 20,
    breathWeaponUsesRemaining: 3,
    actionResourcesRemaining: 1,
    lastResult: "init",
    ...overrides,
  };
}

function projectBattleState(
  state: BattleState,
  lastResult: BreathWeaponLastResult,
): BreathWeaponProjection {
  return {
    targetHp: currentHp(state, spellTargetId),
    secondTargetHp: currentHp(state, secondTargetId),
    breathWeaponUsesRemaining: breathWeaponUsesRemaining(state),
    actionResourcesRemaining: state.currentTurnResources.actionResources.length,
    lastResult,
  };
}

function breathWeaponAct(state: BattleState) {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.actorId === spellCasterId &&
      candidate.subject.unitId === speciesDragonbornBreathWeaponUnitId,
  );
  if (act === undefined) {
    throw new Error("Expected Breath Weapon act.");
  }
  return act;
}

function breathWeaponSubject() {
  return {
    tag: "unitFeature" as const,
    actorId: spellCasterId,
    unitId: speciesDragonbornBreathWeaponUnitId,
  };
}

function resolveBreathWeapon(
  state: BattleState,
  input: {
    readonly outcomes: readonly {
      readonly targetId: CombatantId;
      readonly succeeded: boolean;
    }[];
    readonly areaTargetIds: readonly CombatantId[];
    readonly damageRolls: readonly number[];
  },
): BattleResolutionResult {
  const save = requireHole(
    breathWeaponAct(state).initialHoles,
    "savingThrowOutcome",
  );
  const pendingDamage = resolveBattleSubject({
    state,
    subject: breathWeaponSubject(),
    fills: [
      breathWeaponSavingThrowFill(save, input.outcomes, input.areaTargetIds),
    ],
  });
  if (pendingDamage.tag !== "needsHoles") {
    return pendingDamage;
  }
  const damage = requireHole(pendingDamage.holes, "rolledDice");
  return resolveBattleSubject({
    state,
    subject: breathWeaponSubject(),
    fills: [
      breathWeaponSavingThrowFill(save, input.outcomes, input.areaTargetIds),
      rolledDiceFill(damage, input.damageRolls),
    ],
  });
}

function resolveBreathWeaponSave(
  state: BattleState,
  input: {
    readonly outcomes: readonly {
      readonly targetId: CombatantId;
      readonly succeeded: boolean;
    }[];
    readonly areaTargetIds: readonly CombatantId[];
  },
): BattleResolutionResult {
  return resolveBattleSubject({
    state,
    subject: breathWeaponSubject(),
    fills: [
      breathWeaponSavingThrowFill(
        requireHole(breathWeaponAct(state).initialHoles, "savingThrowOutcome"),
        input.outcomes,
        input.areaTargetIds,
      ),
    ],
  });
}

function breathWeaponSavingThrowFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
  areaTargetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId: spellCasterId,
        affectedTargetIds: areaTargetIds,
      },
      outcomes,
    },
  };
}

function rolledDiceFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  rolls: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [first, ...rest] = rolls;
  if (first === undefined) {
    throw new Error("Expected at least one die roll.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      {
        results: [DieRollResult(first), ...rest.map(DieRollResult)],
      },
    ],
  };
}

function breathWeaponUnitRef() {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: speciesDragonbornBreathWeaponUnitId },
    unit: breathWeaponUnit,
    sourceFacts: { draconicAncestryDamageType: "fire" },
  });
  const support = battleAttackActionAreaSaveDamageReplacementSupportForUnit({
    unit: breathWeaponUnit,
    draconicAncestryDamageType: "fire",
  });
  if (support === null || support === "unsupported") {
    throw new Error("Expected Breath Weapon support.");
  }
  expect(unitRef).toEqual(
    Either.right({
      unitId: speciesDragonbornBreathWeaponUnitId,
      supportProfiles: [support],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function recordResolvedState(result: BattleResolutionResult): BattleState {
  if (result.tag !== "resolved") {
    throw new Error(`Expected Breath Weapon to resolve: ${result.tag}`);
  }
  return result.state;
}

function recordInvalidResult(result: BattleResolutionResult): void {
  if (result.tag !== "invalid") {
    throw new Error(`Expected Breath Weapon to be invalid: ${result.tag}`);
  }
}

function currentHp(state: BattleState, combatantId: CombatantId): number {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return Number(combatant.hp);
}

function breathWeaponUsesRemaining(state: BattleState): number {
  const actor = state.combatants.get(spellCasterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Dragonborn actor.");
  }
  const resource = actor.origin.resources.find(
    (candidate) => candidate.unit.id === speciesDragonbornBreathWeaponUnitId,
  );
  if (resource === undefined || !("usesRemaining" in resource)) {
    throw new Error("Expected Breath Weapon use-count resource.");
  }
  return Number(resource.usesRemaining);
}
