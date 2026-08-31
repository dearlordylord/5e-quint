import { characterBattleFeatureInitForTest } from "./battle-runtime.test-support.ts";
import { battleReducerRouteEventsForDiscoveredAct } from "./battle-reducer/reducer-route.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.passive-ability-check-roll-mode unit-feature.passive-damage-resistance unit-feature.passive-saving-throw-roll-mode
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3MSPEC-11-SPECIES-SELECTED-IDENTITY-AUDIT species_dragonborn_damage_resistance dwarf_dwarven_resilience species_goliath_powerful_build
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-HALFLING-BRAVE-RUNTIME species_halfling_brave
// UNIT-IDENTITY-REPLAY: L3MSPEC-11-SPECIES-SELECTED-IDENTITY-AUDIT species_dragonborn_damage_resistance doDragonbornDamageResistance
// UNIT-IDENTITY-REPLAY: L3MSPEC-11-SPECIES-SELECTED-IDENTITY-AUDIT dwarf_dwarven_resilience doDwarvenResilience
// UNIT-IDENTITY-REPLAY: L3MSPEC-11-SPECIES-SELECTED-IDENTITY-AUDIT species_goliath_powerful_build doGoliathPowerfulBuild
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-HALFLING-BRAVE-RUNTIME species_halfling_brave doHalflingBrave
import { describe, expect, it } from "vitest";

import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  MBT_TEST_TIMEOUT_MS,
  decodeReducerRoute,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintField,
  quintStateRecord,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { decodeSpeciesRecordSync } from "@dnd/surface/surface/schema";
import { Result } from "effect";

import speciesDragonbornInput from "../../surface/content/species_dragonborn.json";
import { damageAmountAfterTargetAdjustments } from "./battle-reducer/damage-helpers.ts";
import { savingThrowRollModeProjections } from "./battle-reducer/spells-damage-fills.ts";
import {
  battleId,
  battleTablePositionId,
  combatantId,
  discoverBattleActCandidates,
  endTurn,
  startBattle,
  type BattleState,
  type BattleSubject,
} from "./index.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import {
  dwarfDwarvenResilienceUnitId,
  speciesHalflingBraveUnitId,
  speciesDragonbornDamageResistanceUnitId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture.test-support.ts";
import { battleUnitRefWithSupportProfiles } from "./unit-profile-admission.test-support.ts";
import { battleInitializationIssueMessage } from "./battle-reducer/api-lifecycle.ts";
import {
  resolveBattleSubject,
  attackRollFill,
  characterSeed,
  damageRollFillWithGroups,
  movementFill,
  grappleOutcomeFill,
  requireHole,
  requireResolved,
  savingThrowOutcomeFill,
  spellRecord,
  targetFill,
  testBattleCreatureStateWithConditions,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { difficultyClass } from "@dnd/shared/types";
import { battleStateWithLowLevelSourceOwnedEffectOccurrenceForTest } from "./low-level-effect-occurrence.test-support.ts";

const speciesGoliathPowerfulBuildUnitId = "species_goliath_powerful_build";
const speciesHalflingNimblenessUnitId = "species_halfling_nimbleness";
const dragonbornDamageResistanceTargetId = combatantId(
  "species-passive-dragonborn-target",
);
const dwarvenResilienceTargetId = combatantId("species-passive-dwarf-target");
const poisonedDwarvenResilienceTargetId = combatantId(
  "species-passive-dwarf-poisoned-target",
);
const substrateMoverId = combatantId("species-passive-substrate-mover");
const substrateBlockerId = combatantId("species-passive-substrate-blocker");
const substrateOccupiedPositionId = battleTablePositionId(
  "species-passive-substrate-occupied-space",
);
const dragonbornSpeciesRecord = decodeSpeciesRecordSync(speciesDragonbornInput);
if (dragonbornSpeciesRecord.species !== "dragonborn") {
  throw new Error("Expected Dragonborn species source record.");
}
const selectedDraconicAncestry =
  dragonbornSpeciesRecord.draconicAncestry.damageType.options.find(
    (option) => option.id === "red",
  );
if (selectedDraconicAncestry === undefined) {
  throw new Error("Expected Red Draconic Ancestry source option.");
}
const draconicAncestrySourceFacts = {
  draconicAncestryDamageType: selectedDraconicAncestry.damageType,
} as const;

type SpeciesPassiveTraitLastResult =
  | "init"
  | "dragonbornDamageResistance"
  | "dwarvenResilience"
  | "halflingBrave"
  | "goliathPowerfulBuild";
type ProjectedRollMode = "advantage" | "disadvantage" | "normal";
type SpeciesPassiveTraitProjection = {
  readonly dragonbornFireDamageAfter: number;
  readonly dragonbornColdDamageAfter: number;
  readonly dwarfPoisonDamageAfter: number;
  readonly dwarfFireDamageAfter: number;
  readonly dwarfPoisonedSaveAdvantage: boolean;
  readonly dwarfCharmedSaveAdvantage: boolean;
  readonly halflingFrightenedAvoidSaveAdvantage: boolean;
  readonly halflingFrightenedEndSaveAdvantage: boolean;
  readonly halflingPoisonedSaveAdvantage: boolean;
  readonly goliathEscapeRollMode: ProjectedRollMode;
  readonly goliathPoisonedEscapeRollMode: ProjectedRollMode;
  readonly lastResult: SpeciesPassiveTraitLastResult;
};

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Species passive trait selected identity replay",
  taskId: "L3MSPEC-11-SPECIES-SELECTED-IDENTITY-AUDIT",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-species-passive-trait-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      DragonbornDamageResistance: "dragonbornDamageResistance",
      DwarvenResilience: "dwarvenResilience",
      HalflingBrave: "halflingBrave",
      GoliathPowerfulBuild: "goliathPowerfulBuild",
    },
  },
  projectionSchema: {
    dragonbornFireDamageAfter: "int",
    dragonbornColdDamageAfter: "int",
    dwarfPoisonDamageAfter: "int",
    dwarfFireDamageAfter: "int",
    dwarfPoisonedSaveAdvantage: "bool",
    dwarfCharmedSaveAdvantage: "bool",
    halflingFrightenedAvoidSaveAdvantage: "bool",
    halflingFrightenedEndSaveAdvantage: "bool",
    halflingPoisonedSaveAdvantage: "bool",
    goliathEscapeRollMode: "str",
    goliathPoisonedEscapeRollMode: "str",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: speciesDragonbornDamageResistanceUnitId,
      procedures: [
        {
          actionName: "doDragonbornDamageResistance",
          discover: () =>
            projectDragonbornDamageResistance(
              dragonbornDamageResistanceBattle(),
            ),
        },
      ],
    },
    {
      unitId: dwarfDwarvenResilienceUnitId,
      procedures: [
        {
          actionName: "doDwarvenResilience",
          discover: () => projectDwarvenResilience(dwarvenResilienceBattle()),
        },
      ],
    },
    {
      unitId: speciesHalflingBraveUnitId,
      procedures: [
        {
          actionName: "doHalflingBrave",
          discover: () => projectHalflingBrave(halflingBraveBattle()),
        },
      ],
    },
    {
      unitId: speciesGoliathPowerfulBuildUnitId,
      procedures: [
        {
          actionName: "doGoliathPowerfulBuild",
          discover: () => ({
            ...expectedProjection({
              goliathEscapeRollMode: escapeGrappleRollMode({
                selected: true,
              }),
              goliathPoisonedEscapeRollMode: escapeGrappleRollMode({
                selected: true,
                poisoned: true,
              }),
              lastResult: "goliathPowerfulBuild",
            }),
          }),
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<SpeciesPassiveTraitProjection> = {},
): SpeciesPassiveTraitProjection {
  return {
    dragonbornFireDamageAfter: 9,
    dragonbornColdDamageAfter: 9,
    dwarfPoisonDamageAfter: 9,
    dwarfFireDamageAfter: 9,
    dwarfPoisonedSaveAdvantage: false,
    dwarfCharmedSaveAdvantage: false,
    halflingFrightenedAvoidSaveAdvantage: false,
    halflingFrightenedEndSaveAdvantage: false,
    halflingPoisonedSaveAdvantage: false,
    goliathEscapeRollMode: "normal",
    goliathPoisonedEscapeRollMode: "normal",
    lastResult: "init",
    ...overrides,
  };
}

function dragonbornDamageResistanceBattle(): BattleState {
  const unit = unitLibrary.requireUnit(speciesDragonbornDamageResistanceUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
    sourceFacts: draconicAncestrySourceFacts,
  });
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  const result = startBattle({
    battleId: battleId("species-passive-dragonborn-resistance"),
    combatants: [
      characterCreature({
        combatantId: dragonbornDamageResistanceTargetId,
        displayName: "Dragonborn Target",
        initiative: 10,
        characterUnitRefs: [unitRef.success],
      }),
      characterCreature({
        combatantId: combatantId("species-passive-dragonborn-attacker"),
        displayName: "Attacker",
        initiative: 5,
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleInitializationIssueMessage(result.failure));
  }
  return result.success.state;
}

function projectDragonbornDamageResistance(
  state: BattleState,
): SpeciesPassiveTraitProjection {
  const target = state.combatants.get(dragonbornDamageResistanceTargetId);
  if (target === undefined) {
    throw new Error("Expected Dragonborn target combatant.");
  }
  return expectedProjection({
    dragonbornFireDamageAfter: damageAmountAfterTargetAdjustments(
      state,
      target,
      9,
      "fire",
    ),
    dragonbornColdDamageAfter: damageAmountAfterTargetAdjustments(
      state,
      target,
      9,
      "cold",
    ),
    lastResult: "dragonbornDamageResistance",
  });
}

function dwarvenResilienceBattle(): BattleState {
  const unit = unitLibrary.requireUnit(dwarfDwarvenResilienceUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  const result = startBattle({
    battleId: battleId("species-passive-dwarven-resilience"),
    combatants: [
      characterCreature({
        combatantId: dwarvenResilienceTargetId,
        displayName: "Dwarf Target",
        initiative: 10,
        unitFeatures: [characterBattleFeatureInitForTest(unit)],
        characterUnitRefs: [unitRef.success],
      }),
      characterSeed({
        combatantId: wizardId,
        displayName: "Attacker",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord("ray_of_sickness")],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleInitializationIssueMessage(result.failure));
  }
  return result.success.state;
}

function poisonedDwarvenResilienceEndTurnBattle(): BattleState {
  const unit = unitLibrary.requireUnit(dwarfDwarvenResilienceUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  const result = startBattle({
    battleId: battleId("species-passive-dwarven-resilience-poisoned-save"),
    combatants: [
      characterCreature({
        combatantId: poisonedDwarvenResilienceTargetId,
        displayName: "Poisoned Dwarf Target",
        initiative: 20,
        unitFeatures: [characterBattleFeatureInitForTest(unit)],
        characterUnitRefs: [unitRef.success],
      }),
      characterSeed({
        combatantId: wizardId,
        displayName: "Poison Source",
        initiative: 10,
        attack: null,
        spellcasting: wizardSpellcasting(),
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleInitializationIssueMessage(result.failure));
  }
  // This fixture exercises the lower-level repeat-save interaction, not spell
  // admission. Give that synthetic boundary its own source-owned procedure and
  // fixed DC so it cannot be mistaken for an admitted spell lifecycle.
  const allocated = battleStateWithLowLevelSourceOwnedEffectOccurrenceForTest({
    state: result.success.state,
    sourceCombatantId: wizardId,
    ownerId: poisonedDwarvenResilienceTargetId,
    effect: {
      kind: "spellConditionEndTurnSave",
      condition: "poisoned",
      conditionHadNonSpellSource: false,
      heightenedSpellTargetDisadvantage: null,
      save: {
        ability: "con",
        dc: { kind: "fixed", dc: difficultyClass(10) },
      },
      expiresAt: {
        kind: "duration",
        durationTicks: elapsedTimeTicks(10),
      },
    },
  });
  const target = allocated.state.combatants.get(
    poisonedDwarvenResilienceTargetId,
  );
  if (target === undefined) {
    throw new Error("Expected poisoned Dwarven Resilience target.");
  }
  const poisonedTarget = {
    ...testBattleCreatureStateWithConditions(
      target,
      applyCondition(target.conditions, "poisoned"),
    ),
  };
  return {
    ...allocated.state,
    combatants: new Map(allocated.state.combatants).set(
      poisonedDwarvenResilienceTargetId,
      poisonedTarget,
    ),
  };
}

function projectDwarvenResilience(
  state: BattleState,
): SpeciesPassiveTraitProjection {
  const target = state.combatants.get(dwarvenResilienceTargetId);
  if (target === undefined) {
    throw new Error("Expected Dwarven Resilience target combatant.");
  }
  const poisonedSaveTargets = savingThrowRollModeProjections(state, "con", {
    condition: "poisoned",
  }).map((projection) => projection.targetId);
  const charmedSaveTargets = savingThrowRollModeProjections(state, "con", {
    condition: "charmed",
  }).map((projection) => projection.targetId);
  return expectedProjection({
    dwarfPoisonDamageAfter: damageAmountAfterTargetAdjustments(
      state,
      target,
      9,
      "poison",
    ),
    dwarfFireDamageAfter: damageAmountAfterTargetAdjustments(
      state,
      target,
      9,
      "fire",
    ),
    dwarfPoisonedSaveAdvantage: poisonedSaveTargets.includes(
      dwarvenResilienceTargetId,
    ),
    dwarfCharmedSaveAdvantage: charmedSaveTargets.includes(
      dwarvenResilienceTargetId,
    ),
    lastResult: "dwarvenResilience",
  });
}

function halflingBraveBattle(): BattleState {
  const unit = unitLibrary.requireUnit(speciesHalflingBraveUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  const targetId = combatantId("species-passive-halfling-target");
  const result = startBattle({
    battleId: battleId("species-passive-halfling-brave"),
    combatants: [
      characterCreature({
        combatantId: targetId,
        displayName: "Halfling Target",
        initiative: 10,
        unitFeatures: [characterBattleFeatureInitForTest(unit)],
        characterUnitRefs: [unitRef.success],
      }),
      characterCreature({
        combatantId: combatantId("species-passive-halfling-attacker"),
        displayName: "Attacker",
        initiative: 5,
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleInitializationIssueMessage(result.failure));
  }
  return result.success.state;
}

function projectHalflingBrave(
  state: BattleState,
): SpeciesPassiveTraitProjection {
  const targetId = combatantId("species-passive-halfling-target");
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    throw new Error("Expected Halfling Brave target combatant.");
  }
  const frightenedAvoidSaveTargets = savingThrowRollModeProjections(
    state,
    "wis",
    { condition: "frightened" },
  ).map((projection) => projection.targetId);
  const frightenedEndSaveTargets = savingThrowRollModeProjections(
    state,
    "con",
    { condition: "frightened" },
  ).map((projection) => projection.targetId);
  const poisonedSaveTargets = savingThrowRollModeProjections(state, "con", {
    condition: "poisoned",
  }).map((projection) => projection.targetId);
  return expectedProjection({
    halflingFrightenedAvoidSaveAdvantage:
      frightenedAvoidSaveTargets.includes(targetId),
    halflingFrightenedEndSaveAdvantage:
      frightenedEndSaveTargets.includes(targetId),
    halflingPoisonedSaveAdvantage: poisonedSaveTargets.includes(targetId),
    lastResult: "halflingBrave",
  });
}

function escapeGrappleRollMode(input: {
  readonly selected: boolean;
  readonly poisoned?: boolean;
}): ProjectedRollMode {
  const unit = unitLibrary.requireUnit(speciesGoliathPowerfulBuildUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  const actorId = combatantId(
    input.poisoned === true
      ? "species-passive-poisoned-goliath"
      : "species-passive-goliath",
  );
  const grapplerId = combatantId(
    input.poisoned === true
      ? "species-passive-poisoned-grappler"
      : "species-passive-grappler",
  );
  const state = startBattle({
    battleId: battleId(
      input.poisoned === true
        ? "species-passive-poisoned-goliath-grapple"
        : "species-passive-goliath-grapple",
    ),
    combatants: [
      characterCreature({
        combatantId: grapplerId,
        displayName: "Grappler",
        initiative: 12,
      }),
      characterCreature({
        combatantId: actorId,
        displayName: "Goliath Target",
        initiative: 10,
        characterUnitRefs: input.selected ? [unitRef.success] : [],
        unitFeatures: input.selected
          ? [characterBattleFeatureInitForTest(unit)]
          : [],
        conditions: input.poisoned === true ? ["poisoned"] : [],
      }),
    ],
  });
  if (Result.isFailure(state)) {
    throw new Error(battleInitializationIssueMessage(state.failure));
  }
  const grappleSubject = {
    tag: "action",
    actorId: grapplerId,
    action: "grapple",
  } as const;
  const target = requireHole(
    resolveBattleSubject({
      state: state.success.state,
      subject: grappleSubject,
      fills: [],
    }),
    "targetChoice",
  );
  const targetChoice = targetFill(target, actorId, [
    { kind: "grappleTargetWithinReach", grapplerId, targetId: actorId },
  ]);
  const outcome = requireHole(
    resolveBattleSubject({
      state: state.success.state,
      subject: grappleSubject,
      fills: [targetChoice],
    }),
    "grappleOutcome",
  );
  const grappled = requireResolved(
    resolveBattleSubject({
      state: state.success.state,
      subject: grappleSubject,
      fills: [targetChoice, grappleOutcomeFill(outcome, false)],
    }),
  );
  const actorTurn = requireResolved(
    endTurn({ state: grappled.state, actorId: grapplerId }),
  ).state;
  const escape = requireHole(
    resolveBattleSubject({
      state: actorTurn,
      subject: { tag: "action", actorId, action: "escapeGrapple" },
      fills: [],
    }),
    "grappleOutcome",
  );
  if (escape.kind !== "grappleOutcome") {
    throw new Error("Expected Escape Grapple outcome hole.");
  }
  return escape.rollMode ?? "normal";
}

type SpeciesPassiveTraitSubstrateRouteProjection = {
  readonly route: readonly ReducerRouteEvent[];
};

const speciesPassiveTraitSubstrateRouteDriverSchema = {
  init: {},
  doProjectSpeciesBaseSizeSpeed: {},
  doRoutePassiveDamageAdjustment: {},
  doRoutePassiveSavingThrowRollMode: {},
  doRoutePassiveAbilityCheckRollMode: {},
  doMoveThroughLargerCreatureSpace: {},
  doRejectOccupiedStop: {},
  doRejectMissingMovementPermission: {},
  doRejectSameSizeTraversal: {},
  step: {},
} as const;

describe("Species passive trait substrate route MBT", () => {
  it(
    "routes passive trait substrates through generic battle owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-species-passive-trait-substrates.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createSpeciesPassiveTraitSubstrateRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(8),
        stateCheck: speciesPassiveTraitSubstrateRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createSpeciesPassiveTraitSubstrateRouteDriver() {
  return defineDriver<
    typeof speciesPassiveTraitSubstrateRouteDriverSchema,
    SpeciesPassiveTraitSubstrateRouteProjection
  >(speciesPassiveTraitSubstrateRouteDriverSchema, () => {
    let route: readonly ReducerRouteEvent[] = [];

    function reset(): void {
      route = routeStart(
        requireCreatureStatProjectionRoute(dragonbornDamageResistanceBattle()),
      );
    }

    reset();

    return {
      init: reset,
      doProjectSpeciesBaseSizeSpeed: () => {
        route = requireCreatureStatProjectionRoute(
          dragonbornDamageResistanceBattle(),
        );
      },
      doRoutePassiveDamageAdjustment: () => {
        route = [
          ...route,
          ...requirePassiveDamageAdjustmentRoute(dwarvenResilienceBattle()),
        ];
      },
      doRoutePassiveSavingThrowRollMode: () => {
        route = [...route, ...requirePassiveSavingThrowRollModeRoute()];
      },
      doRoutePassiveAbilityCheckRollMode: () => {
        route = [
          ...route,
          ...requirePassiveAbilityCheckRollModeRoute(
            goliathPowerfulBuildBattle(),
          ),
        ];
      },
      doMoveThroughLargerCreatureSpace: () => {
        route = [
          ...route,
          ...observeAcceptedCreatureSpaceMovementRoute(
            halflingNimblenessSubstrateBattle({ selected: true }),
          ),
        ];
      },
      doRejectOccupiedStop: () => {
        route = [
          ...route,
          ...observeRejectedCreatureSpaceMovementRoute({
            state: halflingNimblenessSubstrateBattle({ selected: true }),
            destination: {
              kind: "occupiedCreatureSpace",
              occupantId: substrateBlockerId,
              positionId: substrateOccupiedPositionId,
            },
          }),
        ];
      },
      doRejectMissingMovementPermission: () => {
        route = [
          ...route,
          ...observeRejectedCreatureSpaceMovementRoute({
            state: halflingNimblenessSubstrateBattle({ selected: false }),
            destination: {
              kind: "unoccupiedSpace",
              positionId: battleTablePositionId(
                "species-passive-substrate-missing-profile-destination",
              ),
            },
          }),
        ];
      },
      doRejectSameSizeTraversal: () => {
        route = [
          ...route,
          ...observeRejectedCreatureSpaceMovementRoute({
            state: halflingNimblenessSubstrateBattle({
              selected: true,
              blockerSize: "small",
            }),
            destination: {
              kind: "unoccupiedSpace",
              positionId: battleTablePositionId(
                "species-passive-substrate-same-size-destination",
              ),
            },
          }),
        ];
      },
      step: () => {},
      getState: () => ({ route }),
    };
  });
}

function requireCreatureStatProjectionRoute(
  state: BattleState,
): readonly ReducerRouteEvent[] {
  const target = state.combatants.get(dragonbornDamageResistanceTargetId);
  if (target === undefined) {
    throw new Error("Expected Dragonborn target for creature stat route.");
  }
  const proneState: BattleState = {
    ...state,
    combatants: new Map(state.combatants).set(
      dragonbornDamageResistanceTargetId,
      testBattleCreatureStateWithConditions(
        target,
        applyCondition(target.conditions, "prone"),
      ),
    ),
  };
  const subject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: dragonbornDamageResistanceTargetId,
    command: "standFromProne",
  };
  const standAct = discoverBattleActCandidates(proneState).find(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      act.subject.actorId === dragonbornDamageResistanceTargetId &&
      act.subject.command === "standFromProne",
  );
  if (standAct === undefined) {
    throw new Error("Expected public Stand from Prone act for stat route.");
  }
  const resolved = requireResolved(
    resolveBattleSubject({ state: proneState, subject, fills: [] }),
  );
  return routeEventsWithSubject(
    [
      ...(battleReducerRouteEventsForDiscoveredAct(proneState, standAct) ?? []),
      ...(resolved.routeEvents ?? []),
    ],
    "creatureStatProjection",
    { includeStartOwner: "battleCreatureState" },
  );
}

function requirePassiveDamageAdjustmentRoute(
  state: BattleState,
): readonly ReducerRouteEvent[] {
  const act = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === wizardId,
  );
  if (act === undefined || act.subject.tag !== "actionSpell") {
    throw new Error("Expected public Ray of Sickness act for damage route.");
  }
  const target = act.initialHoles.find((hole) => hole.kind === "targetChoice");
  if (target === undefined) {
    throw new Error("Expected Ray of Sickness target-choice hole.");
  }
  const targetChoice = targetFill(target, dwarvenResilienceTargetId);
  const awaitingAttack = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [targetChoice],
  });
  const attack = requireHole(awaitingAttack, "attackRoll");
  const attackRoll = attackRollFill(attack, {
    total: 18,
    naturalD20: 12,
  });
  const awaitingDamage = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [targetChoice, attackRoll],
  });
  const damage = requireHole(awaitingDamage, "rolledDice");
  const damageResult = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetChoice,
      attackRoll,
      damageRollFillWithGroups(damage, [[3, 5]]),
    ],
  });
  if (damageResult.tag !== "resolved") {
    throw new Error(
      `Expected Ray of Sickness damage to resolve, got ${damageResult.tag}: ${
        "message" in damageResult ? damageResult.message : "no message"
      }`,
    );
  }
  return routeEventsWithSubject(
    [
      ...(battleReducerRouteEventsForDiscoveredAct(state, act) ?? []),
      ...(awaitingAttack.routeEvents ?? []),
      ...(awaitingDamage.routeEvents ?? []),
      ...(damageResult.routeEvents ?? []),
    ],
    "passiveDamageAdjustment",
  );
}

function requirePassiveSavingThrowRollModeRoute(): readonly ReducerRouteEvent[] {
  const routeState = poisonedDwarvenResilienceEndTurnBattle();
  const subject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: poisonedDwarvenResilienceTargetId,
    command: "endTurn",
  };
  const endTurnAct = discoverBattleActCandidates(routeState).find(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      act.subject.actorId === poisonedDwarvenResilienceTargetId &&
      act.subject.command === "endTurn",
  );
  if (endTurnAct === undefined) {
    throw new Error("Expected public End Turn act for poisoned save route.");
  }
  const awaitingSave = resolveBattleSubject({
    state: routeState,
    subject,
    fills: [],
  });
  const save = requireHole(awaitingSave, "savingThrowOutcome");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: routeState,
      subject,
      fills: [
        savingThrowOutcomeFill(save, [
          { targetId: poisonedDwarvenResilienceTargetId, succeeded: true },
        ]),
      ],
    }),
  );
  return routeEventsWithSubject(
    [
      ...(battleReducerRouteEventsForDiscoveredAct(routeState, endTurnAct) ??
        []),
      ...(awaitingSave.routeEvents ?? []),
      ...(resolved.routeEvents ?? []),
    ],
    "passiveSavingThrowRollMode",
  );
}

function requirePassiveAbilityCheckRollModeRoute(
  state: BattleState,
): readonly ReducerRouteEvent[] {
  const actorId = combatantId("species-passive-substrate-goliath");
  const grapplerId = combatantId("species-passive-substrate-grappler");
  const grappleSubject = {
    tag: "action",
    actorId: grapplerId,
    action: "grapple",
  } as const;
  const target = requireHole(
    resolveBattleSubject({
      state,
      subject: grappleSubject,
      fills: [],
    }),
    "targetChoice",
  );
  const targetChoice = targetFill(target, actorId, [
    { kind: "grappleTargetWithinReach", grapplerId, targetId: actorId },
  ]);
  const outcome = requireHole(
    resolveBattleSubject({
      state,
      subject: grappleSubject,
      fills: [targetChoice],
    }),
    "grappleOutcome",
  );
  const grappled = requireResolved(
    resolveBattleSubject({
      state,
      subject: grappleSubject,
      fills: [targetChoice, grappleOutcomeFill(outcome, false)],
    }),
  );
  const actorTurn = requireResolved(
    endTurn({ state: grappled.state, actorId: grapplerId }),
  ).state;
  const escapeSubject: BattleSubject = {
    tag: "action",
    actorId,
    action: "escapeGrapple",
  };
  const escapeAct = discoverBattleActCandidates(actorTurn).find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.actorId === actorId &&
      act.subject.action === "escapeGrapple",
  );
  if (escapeAct === undefined) {
    throw new Error("Expected public Escape Grapple act for ability route.");
  }
  const awaitingEscape = resolveBattleSubject({
    state: actorTurn,
    subject: escapeSubject,
    fills: [],
  });
  const escape = requireHole(awaitingEscape, "grappleOutcome");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: actorTurn,
      subject: escapeSubject,
      fills: [grappleOutcomeFill(escape, true)],
    }),
  );
  return routeEventsWithSubject(
    [
      ...(battleReducerRouteEventsForDiscoveredAct(actorTurn, escapeAct) ?? []),
      ...(awaitingEscape.routeEvents ?? []),
      ...(resolved.routeEvents ?? []),
    ],
    "passiveAbilityCheckRollMode",
  );
}

function routeEventsWithSubject(
  events: readonly ReducerRouteEvent[],
  subject: Extract<ReducerRouteEvent, { readonly subject: string }>["subject"],
  input: {
    readonly includeStartOwner?: Extract<
      ReducerRouteEvent,
      { readonly kind: "startBattle" }
    >["owner"];
  } = {},
): readonly ReducerRouteEvent[] {
  const routeEvents = events.filter((event) => {
    if (event.kind === "startBattle") {
      return event.owner === input.includeStartOwner;
    }
    return "subject" in event && event.subject === subject;
  });
  if (routeEvents.length === 0) {
    throw new Error(`Expected public route events for subject ${subject}.`);
  }
  return routeEvents;
}

function routeStart(
  route: readonly ReducerRouteEvent[],
): readonly [ReducerRouteEvent] {
  const [start] = route;
  if (start === undefined || start.kind !== "startBattle") {
    throw new Error("Expected route to start with startBattle.");
  }
  return [start];
}

function goliathPowerfulBuildBattle(): BattleState {
  const unit = unitLibrary.requireUnit(speciesGoliathPowerfulBuildUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  const result = startBattle({
    battleId: battleId("species-passive-substrate-goliath-powerful-build"),
    combatants: [
      characterCreature({
        combatantId: combatantId("species-passive-substrate-grappler"),
        displayName: "Grappler",
        initiative: 12,
      }),
      characterCreature({
        combatantId: combatantId("species-passive-substrate-goliath"),
        displayName: "Goliath Target",
        initiative: 10,
        characterUnitRefs: [unitRef.success],
        unitFeatures: [characterBattleFeatureInitForTest(unit)],
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleInitializationIssueMessage(result.failure));
  }
  return result.success.state;
}

function halflingNimblenessSubstrateBattle(input: {
  readonly selected: boolean;
  readonly blockerSize?: "small" | "medium";
}): BattleState {
  const unit = unitLibrary.requireUnit(speciesHalflingNimblenessUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  const result = startBattle({
    battleId: battleId(
      input.blockerSize === "small"
        ? "species-passive-substrate-halfling-same-size"
        : input.selected
          ? "species-passive-substrate-halfling-selected"
          : "species-passive-substrate-halfling-missing-profile",
    ),
    combatants: [
      characterSeed({
        combatantId: substrateMoverId,
        displayName: "Nimble Mover",
        initiative: 20,
        size: "small",
        unitFeatures: input.selected
          ? [characterBattleFeatureInitForTest(unit)]
          : [],
        characterUnitRefs: input.selected ? [unitRef.success] : [],
      }),
      characterSeed({
        combatantId: substrateBlockerId,
        displayName: "Blocker",
        initiative: 10,
        size: input.blockerSize ?? "medium",
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleInitializationIssueMessage(result.failure));
  }
  return result.success.state;
}

function observeAcceptedCreatureSpaceMovementRoute(
  state: BattleState,
): readonly ReducerRouteEvent[] {
  return observeCreatureSpaceMovementRoute(state, {
    destination: {
      kind: "unoccupiedSpace",
      positionId: battleTablePositionId(
        "species-passive-substrate-accepted-destination",
      ),
    },
  });
}

function observeRejectedCreatureSpaceMovementRoute(input: {
  readonly state: BattleState;
  readonly destination: NonNullable<
    Parameters<typeof observeCreatureSpaceMovementRoute>[1]["destination"]
  >;
}): readonly ReducerRouteEvent[] {
  return observeCreatureSpaceMovementRoute(input.state, {
    destination: input.destination,
  });
}

function observeCreatureSpaceMovementRoute(
  state: BattleState,
  input: {
    readonly destination:
      | {
          readonly kind: "unoccupiedSpace";
          readonly positionId: ReturnType<typeof battleTablePositionId>;
        }
      | {
          readonly kind: "occupiedCreatureSpace";
          readonly occupantId: typeof substrateBlockerId;
          readonly positionId: typeof substrateOccupiedPositionId;
        };
  },
): readonly ReducerRouteEvent[] {
  const subject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: substrateMoverId,
    command: "move",
  };
  const moveAct = discoverBattleActCandidates(state).find(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      act.subject.actorId === substrateMoverId &&
      act.subject.command === "move",
  );
  if (moveAct === undefined) {
    throw new Error(
      "Expected public Movement act for species substrate route.",
    );
  }
  const hole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "movement",
  );
  const result = resolveBattleSubject({
    state,
    subject,
    fills: [
      movementFill(hole, {
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
        creatureSpaceTraversal: {
          kind: "occupiedCreatureSpaceTraversal",
          occupiedSpaces: [
            {
              occupantId: substrateBlockerId,
              positionId: substrateOccupiedPositionId,
            },
          ],
          destination: input.destination,
        },
      }),
    ],
  });
  return [
    ...(battleReducerRouteEventsForDiscoveredAct(state, moveAct) ?? []),
    ...(result.routeEvents ?? []),
  ];
}

const speciesPassiveTraitSubstrateRouteStateCheck = stateCheck(
  normalizeSpeciesPassiveTraitSubstrateRouteQuintState,
  compareSpeciesPassiveTraitSubstrateRouteStates,
);

function normalizeSpeciesPassiveTraitSubstrateRouteQuintState(
  raw: unknown,
): SpeciesPassiveTraitSubstrateRouteProjection {
  const state = quintStateRecord(raw);
  return {
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function compareSpeciesPassiveTraitSubstrateRouteStates(
  spec: SpeciesPassiveTraitSubstrateRouteProjection,
  impl: SpeciesPassiveTraitSubstrateRouteProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}
