import { requireCharacterUnitProcedureRefForTest } from "./battle-runtime-test-support.ts";
// RAW-COVERAGE: runtime-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.attack-action-area-save-damage-replacement
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.attack-action-area-save-damage-replacement
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3MSPEC-03-DRAGONBORN-BREATH-WEAPON-RUNTIME species_dragonborn_breath_weapon
// UNIT-IDENTITY-REPLAY: L3MSPEC-03-DRAGONBORN-BREATH-WEAPON-RUNTIME species_dragonborn_breath_weapon doResolveBreathWeapon doOpenExtraAttackSlot doRejectMissingResource doRejectMismatchedArea doRejectInvalidDamageRoll
import { describe, expect, test } from "vitest";

import { DieRollResult } from "@dnd/shared/types";
import * as Either from "effect/Either";

import type {
  BattleFill,
  BattleHole,
  BattleReducerRouteEvent,
  BattleReducerRouteHole,
  BattleReducerRouteOwnerGroup,
  BattleResolutionResult,
  BattleRuntimeSession,
  BattleState,
  CombatantId,
} from "./index.ts";
import { battleReducerStartRouteEvent } from "./index.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  fighterExtraAttackUnitId,
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
  discoverBattleActCandidates,
  resolveBattleSubject,
  startBattle,
} from "./unit-profile-admission-test-support.ts";
import { extraAttackBattleUnitRef } from "./unit-profile-admission-feature-fixture-support.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";

type BreathWeaponLastResult =
  | "init"
  | "resolved"
  | "openedExtraAttack"
  | "rejectMissingResource"
  | "rejectMismatchedArea"
  | "rejectInvalidDamageRoll";

const DRAGONBORN_BREATH_WEAPON_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  Resolved: "resolved",
  OpenedExtraAttack: "openedExtraAttack",
  RejectMissingResource: "rejectMissingResource",
  RejectMismatchedArea: "rejectMismatchedArea",
  RejectInvalidDamageRoll: "rejectInvalidDamageRoll",
} as const;

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

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Dragonborn Breath Weapon selected identity replay",
  taskId: "L3MSPEC-03-DRAGONBORN-BREATH-WEAPON-RUNTIME",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-dragonborn-breath-weapon.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: DRAGONBORN_BREATH_WEAPON_SCENARIO_OUTCOME_BY_TAG,
  },
  witnessInvalidScenarioReasons: {
    rejectMissingResource: "invalidFill",
    rejectMismatchedArea: "invalidFill",
    rejectInvalidDamageRoll: "invalidFill",
  },
  projectionSchema: {
    targetHp: "int",
    secondTargetHp: "int",
    breathWeaponUsesRemaining: "int",
    actionResourcesRemaining: "int",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: speciesDragonbornBreathWeaponUnitId,
      procedures: [
        {
          actionName: "doResolveBreathWeapon",
          discover: () =>
            projectBattleState(
              recordResolvedState(
                resolveBreathWeapon(breathWeaponBattle().state, {
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
          discover: () =>
            projectBattleState(
              recordResolvedState(
                resolveBreathWeapon(
                  breathWeaponBattle({ extraAttack: true }).state,
                  {
                    outcomes: [{ targetId: spellTargetId, succeeded: false }],
                    areaTargetIds: [spellTargetId],
                    damageRolls: [5, 5],
                  },
                ),
              ),
              "openedExtraAttack",
            ),
        },
        {
          actionName: "doRejectMissingResource",
          discover: () => {
            const session = breathWeaponBattle({ usesRemaining: 0 });
            const state = session.state;
            recordInvalidResult(
              resolveBattleSubject({
                state,
                subject: breathWeaponSubjectForSession(session),
                fills: [],
              }),
            );
            return projectBattleState(state, "rejectMissingResource");
          },
        },
        {
          actionName: "doRejectMismatchedArea",
          discover: () => {
            const state = breathWeaponBattle().state;
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
          discover: () => {
            const state = breathWeaponBattle().state;
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
  test("observes copied qRoute through public reducer entrypoints", () => {
    const resolved = resolvedBreathWeaponPublicRoute(
      breathWeaponBattle().state,
      {
        outcomes: [
          { targetId: spellTargetId, succeeded: false },
          { targetId: secondTargetId, succeeded: true },
        ],
        areaTargetIds: [spellTargetId, secondTargetId],
        damageRolls: [6, 4],
      },
    );
    expect(resolved).toEqual([
      battleReducerStartRouteEvent(),
      attackActionAreaSaveDamageReplacementDiscoverRoute([
        "savingThrowOutcome",
      ]),
      attackActionAreaSaveDamageReplacementResolveRoute(
        "savingThrowOutcome",
        ["rolledDice"],
        "battleAreaShape",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        ["rolledDice"],
        "battleSavingThrowOutcome",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        ["rolledDice"],
        "battleDamageType",
      ),
      attackActionAreaSaveDamageReplacementResolveRoute(
        "rolledDice",
        [],
        "battleDamageRoll",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        [],
        "battleHitPoint",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        [],
        "battleFeatureResource",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        [],
        "battleAttackActionProcedure",
      ),
    ]);

    const openedExtraAttack = resolvedBreathWeaponPublicRoute(
      breathWeaponBattle({ extraAttack: true }).state,
      {
        outcomes: [{ targetId: spellTargetId, succeeded: false }],
        areaTargetIds: [spellTargetId],
        damageRolls: [5, 5],
      },
    );
    expect(openedExtraAttack).toEqual([
      battleReducerStartRouteEvent(),
      attackActionAreaSaveDamageReplacementDiscoverRoute([
        "savingThrowOutcome",
      ]),
      attackActionAreaSaveDamageReplacementResolveRoute(
        "savingThrowOutcome",
        ["rolledDice"],
        "battleAreaShape",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        ["rolledDice"],
        "battleSavingThrowOutcome",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        ["rolledDice"],
        "battleDamageType",
      ),
      attackActionAreaSaveDamageReplacementResolveRoute(
        "rolledDice",
        [],
        "battleDamageRoll",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        [],
        "battleHitPoint",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        [],
        "battleFeatureResource",
      ),
      {
        kind: "discoverBattleActs",
        subject: "weaponAttack",
        holes: ["targetChoice"],
        owner: "battleAttackActionProcedure",
      },
    ]);

    const missingResourceSession = breathWeaponBattle({
      usesRemaining: 0,
    });
    const missingResourceState = missingResourceSession.state;
    const missingResource = resolveBattleSubject({
      state: missingResourceState,
      subject: breathWeaponSubjectForSession(missingResourceSession),
      fills: [],
    });
    recordInvalidResult(missingResource);
    expect([
      battleReducerStartRouteEvent(),
      ...(missingResource.routeEvents ?? []),
    ]).toEqual([
      battleReducerStartRouteEvent(),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        [],
        "battleFeatureResource",
      ),
    ]);

    const mismatchedAreaState = breathWeaponBattle().state;
    const mismatchedAreaAct = breathWeaponAct(mismatchedAreaState);
    const mismatchedArea = resolveBreathWeaponSave(mismatchedAreaState, {
      outcomes: [{ targetId: spellTargetId, succeeded: false }],
      areaTargetIds: [spellTargetId, secondTargetId],
    });
    recordInvalidResult(mismatchedArea);
    expect([
      battleReducerStartRouteEvent(),
      ...(mismatchedAreaAct.routeEvents ?? []),
      ...(mismatchedArea.routeEvents ?? []),
    ]).toEqual([
      battleReducerStartRouteEvent(),
      attackActionAreaSaveDamageReplacementDiscoverRoute([
        "savingThrowOutcome",
      ]),
      attackActionAreaSaveDamageReplacementResolveRoute(
        "savingThrowOutcome",
        ["savingThrowOutcome"],
        "battleAreaShape",
      ),
    ]);

    const invalidDamageRoll = invalidDamageRollPublicRoute(
      breathWeaponBattle().state,
      {
        outcomes: [{ targetId: spellTargetId, succeeded: false }],
        areaTargetIds: [spellTargetId],
        damageRolls: [11, 4],
      },
    );
    expect(invalidDamageRoll).toEqual([
      battleReducerStartRouteEvent(),
      attackActionAreaSaveDamageReplacementDiscoverRoute([
        "savingThrowOutcome",
      ]),
      attackActionAreaSaveDamageReplacementResolveRoute(
        "savingThrowOutcome",
        ["rolledDice"],
        "battleAreaShape",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        ["rolledDice"],
        "battleSavingThrowOutcome",
      ),
      attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
        ["rolledDice"],
        "battleDamageType",
      ),
      attackActionAreaSaveDamageReplacementResolveRoute(
        "rolledDice",
        ["rolledDice"],
        "battleDamageRoll",
      ),
    ]);
  });

  test("discovers Breath Weapon from selected Draconic Ancestry source facts", () => {
    const session = breathWeaponBattle();
    const state = session.state;
    const act = breathWeaponAct(state);

    expect(act.subject).toMatchObject({
      tag: "unitFeature",
      actorId: spellCasterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        spellCasterId,
        speciesDragonbornBreathWeaponUnitId,
      ),
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
    const state = breathWeaponBattle().state;
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
        subject: breathWeaponSubject(state),
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
    const state = breathWeaponBattle({ extraAttack: true }).state;
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
    const state = breathWeaponBattle().state;
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
): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("dragonborn-breath-weapon-runtime"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Dragonborn Fighter",
        initiative: 20,
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
        currentHp: 20,
        maxHp: 20,
      }),
      characterCreature({
        combatantId: secondTargetId,
        displayName: "Successful Save Target",
        initiative: 9,
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
  const act = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.actorId === spellCasterId,
  );
  if (act === undefined) {
    throw new Error("Expected Breath Weapon act.");
  }
  return act;
}

function breathWeaponSubject(state: BattleState) {
  return breathWeaponAct(state).subject;
}

function breathWeaponSubjectForSession(session: BattleRuntimeSession) {
  return {
    tag: "unitFeature" as const,
    actorId: spellCasterId,
    procedureRef: requireCharacterUnitProcedureRefForTest(
      session,
      spellCasterId,
      speciesDragonbornBreathWeaponUnitId,
    ),
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
    subject: breathWeaponSubject(state),
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
    subject: breathWeaponSubject(state),
    fills: [
      breathWeaponSavingThrowFill(save, input.outcomes, input.areaTargetIds),
      rolledDiceFill(damage, input.damageRolls),
    ],
  });
}

function resolvedBreathWeaponPublicRoute(
  state: BattleState,
  input: {
    readonly outcomes: readonly {
      readonly targetId: CombatantId;
      readonly succeeded: boolean;
    }[];
    readonly areaTargetIds: readonly CombatantId[];
    readonly damageRolls: readonly number[];
  },
): readonly BattleReducerRouteEvent[] {
  const act = breathWeaponAct(state);
  const save = requireHole(act.initialHoles, "savingThrowOutcome");
  const savingThrowFill = breathWeaponSavingThrowFill(
    save,
    input.outcomes,
    input.areaTargetIds,
  );
  const pendingDamage = resolveBattleSubject({
    state,
    subject: breathWeaponSubject(state),
    fills: [savingThrowFill],
  });
  if (pendingDamage.tag !== "needsHoles") {
    throw new Error(`Expected Breath Weapon damage roll: ${pendingDamage.tag}`);
  }
  const damage = requireHole(pendingDamage.holes, "rolledDice");
  const resolved = resolveBattleSubject({
    state,
    subject: breathWeaponSubject(state),
    fills: [savingThrowFill, rolledDiceFill(damage, input.damageRolls)],
  });
  recordResolvedState(resolved);
  return [
    battleReducerStartRouteEvent(),
    ...(act.routeEvents ?? []),
    ...(pendingDamage.routeEvents ?? []),
    ...(resolved.routeEvents ?? []),
  ];
}

function invalidDamageRollPublicRoute(
  state: BattleState,
  input: {
    readonly outcomes: readonly {
      readonly targetId: CombatantId;
      readonly succeeded: boolean;
    }[];
    readonly areaTargetIds: readonly CombatantId[];
    readonly damageRolls: readonly number[];
  },
): readonly BattleReducerRouteEvent[] {
  const act = breathWeaponAct(state);
  const save = requireHole(act.initialHoles, "savingThrowOutcome");
  const savingThrowFill = breathWeaponSavingThrowFill(
    save,
    input.outcomes,
    input.areaTargetIds,
  );
  const pendingDamage = resolveBattleSubject({
    state,
    subject: breathWeaponSubject(state),
    fills: [savingThrowFill],
  });
  if (pendingDamage.tag !== "needsHoles") {
    throw new Error(`Expected Breath Weapon damage roll: ${pendingDamage.tag}`);
  }
  const damage = requireHole(pendingDamage.holes, "rolledDice");
  const invalid = resolveBattleSubject({
    state,
    subject: breathWeaponSubject(state),
    fills: [savingThrowFill, rolledDiceFill(damage, input.damageRolls)],
  });
  recordInvalidResult(invalid);
  return [
    battleReducerStartRouteEvent(),
    ...(act.routeEvents ?? []),
    ...(pendingDamage.routeEvents ?? []),
    ...(invalid.routeEvents ?? []),
  ];
}

function attackActionAreaSaveDamageReplacementDiscoverRoute(
  holes: readonly BattleReducerRouteHole[],
): BattleReducerRouteEvent {
  return {
    kind: "discoverBattleActs",
    subject: "attackActionAreaSaveDamageReplacement",
    holes,
    owner: "battleFeatureResource",
  };
}

function attackActionAreaSaveDamageReplacementResolveRoute(
  fill: "savingThrowOutcome" | "rolledDice",
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubject",
    subject: "attackActionAreaSaveDamageReplacement",
    fill,
    holes,
    owner,
  };
}

function attackActionAreaSaveDamageReplacementResolveWithoutFillRoute(
  holes: readonly BattleReducerRouteHole[],
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: "attackActionAreaSaveDamageReplacement",
    holes,
    owner,
  };
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
    subject: breathWeaponSubject(state),
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
      unit: unitLibrary.requireUnit(speciesDragonbornBreathWeaponUnitId),
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
  const binding = actor.origin.execution.procedureBindings.find(
    (candidate) =>
      candidate.procedure.kind === "unitFeature" &&
      candidate.procedure.source.kind === "resourcePool" &&
      candidate.procedure.execution.kind ===
        "attackActionAreaSaveDamageReplacement",
  );
  if (
    binding === undefined ||
    binding.procedure.kind !== "unitFeature" ||
    binding.procedure.source.kind !== "resourcePool"
  ) {
    throw new Error("Expected Breath Weapon mechanical procedure.");
  }
  const resourcePoolRef = binding.procedure.source.resourcePoolRef;
  const resource = actor.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === resourcePoolRef,
  );
  if (resource === undefined || !("usesRemaining" in resource)) {
    throw new Error("Expected Breath Weapon use-count resource.");
  }
  return Number(resource.usesRemaining);
}
