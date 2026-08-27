import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.magic-action-area-save-damage-healing
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3PUTB-08-DRUID-LANDS-AID-RUNTIME druid_lands_aid
// UNIT-IDENTITY-REPLAY: L3PUTB-08-DRUID-LANDS-AID-RUNTIME druid_lands_aid doResolveAreaSaveDamageHealing doResolveAreaSaveDamageHealingLevel10 doResolveAreaSaveDamageHealingLevel14 doRejectMissingResource doRejectMissingAreaMembership doRejectDuplicateSaveFill doRejectInvalidHealingTarget doRejectInvalidDamageRoll doRejectInvalidHealingRoll
import { DieRollResult, movementFeet } from "@dnd/shared/types";
import { Result } from "effect";

import {
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleTargetSpatialFact,
  type CombatantId,
} from "./index.ts";
import {
  characterBattleFeatureInitForTest,
  characterSeed,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import {
  druidLandsAidUnitId,
  spellCasterId,
  spellTargetId,
  statBlockCatalog,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  battleId,
  battleMagicActionAreaSaveDamageHealingSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  combatantId,
  discoverBattleActCandidates,
  resolveBattleSubject,
  startBattle,
} from "./unit-profile-admission.test-support.ts";

type LandsAidLastResult =
  | "init"
  | "resolved"
  | "rejectMissingResource"
  | "rejectMissingAreaMembership"
  | "rejectDuplicateSaveFill"
  | "rejectInvalidHealingTarget"
  | "rejectInvalidDamageRoll"
  | "rejectInvalidHealingRoll";

const DRUID_LANDS_AID_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  Resolved: "resolved",
  RejectMissingResource: "rejectMissingResource",
  RejectMissingAreaMembership: "rejectMissingAreaMembership",
  RejectDuplicateSaveFill: "rejectDuplicateSaveFill",
  RejectInvalidHealingTarget: "rejectInvalidHealingTarget",
  RejectInvalidDamageRoll: "rejectInvalidDamageRoll",
  RejectInvalidHealingRoll: "rejectInvalidHealingRoll",
} as const;

type LandsAidProjection = {
  readonly targetHp: number;
  readonly secondTargetHp: number;
  readonly healingTargetHp: number;
  readonly wildShapeUsesRemaining: number;
  readonly actionResourcesRemaining: number;
  readonly lastResult: LandsAidLastResult;
};

const druidWildShapeUnitId = "druid_wild_shape";
const landsAidUnit = unitLibrary.requireUnit(druidLandsAidUnitId);
const wildShapeUnit = unitLibrary.requireUnit(druidWildShapeUnitId);
const secondTargetId = combatantId("lands-aid-selected-second-target");
const healingTargetId = combatantId("lands-aid-selected-healing-target");

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Druid Land's Aid selected identity replay",
  taskId: "L3PUTB-08-DRUID-LANDS-AID-RUNTIME",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-druid-lands-aid.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: DRUID_LANDS_AID_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: {
    targetHp: "int",
    secondTargetHp: "int",
    healingTargetHp: "int",
    wildShapeUsesRemaining: "int",
    actionResourcesRemaining: "int",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: druidLandsAidUnitId,
      procedures: [
        {
          actionName: "doResolveAreaSaveDamageHealing",
          discover: () =>
            projectBattleState(
              recordResolvedState(
                resolveLandsAid(landsAidBattle(), {
                  outcomes: [
                    { targetId: spellTargetId, succeeded: false },
                    { targetId: secondTargetId, succeeded: true },
                  ],
                  areaTargetIds: [
                    spellTargetId,
                    secondTargetId,
                    healingTargetId,
                  ],
                  healingTargetId,
                  damageRolls: [4, 4],
                  healingRolls: [3, 4],
                }),
              ),
              "resolved",
            ),
        },
        {
          actionName: "doResolveAreaSaveDamageHealingLevel10",
          discover: () =>
            projectBattleState(
              recordResolvedState(
                resolveLandsAid(landsAidBattle({ druidLevel: 10 }), {
                  outcomes: [
                    { targetId: spellTargetId, succeeded: false },
                    { targetId: secondTargetId, succeeded: true },
                  ],
                  areaTargetIds: [
                    spellTargetId,
                    secondTargetId,
                    healingTargetId,
                  ],
                  healingTargetId,
                  damageRolls: [4, 4, 4],
                  healingRolls: [3, 4, 5],
                }),
              ),
              "resolved",
            ),
        },
        {
          actionName: "doResolveAreaSaveDamageHealingLevel14",
          discover: () =>
            projectBattleState(
              recordResolvedState(
                resolveLandsAid(landsAidBattle({ druidLevel: 14 }), {
                  outcomes: [
                    { targetId: spellTargetId, succeeded: false },
                    { targetId: secondTargetId, succeeded: true },
                  ],
                  areaTargetIds: [
                    spellTargetId,
                    secondTargetId,
                    healingTargetId,
                  ],
                  healingTargetId,
                  damageRolls: [4, 4, 4, 4],
                  healingRolls: [3, 4, 5, 6],
                }),
              ),
              "resolved",
            ),
        },
        {
          actionName: "doRejectMissingResource",
          discover: () => {
            const state = landsAidBattle({ wildShapeUsesRemaining: 0 });
            recordInvalidResult(
              resolveBattleSubject({
                state,
                subject: landsAidAct(state).subject,
                fills: [],
              }),
            );
            return projectBattleState(state, "rejectMissingResource");
          },
        },
        {
          actionName: "doRejectMissingAreaMembership",
          discover: () => {
            const state = landsAidBattle();
            recordInvalidResult(
              resolveLandsAid(state, {
                outcomes: [{ targetId: spellTargetId, succeeded: false }],
                areaTargetIds: [],
                healingTargetId,
                damageRolls: [4, 4],
                healingRolls: [3, 4],
              }),
            );
            return projectBattleState(state, "rejectMissingAreaMembership");
          },
        },
        {
          actionName: "doRejectDuplicateSaveFill",
          discover: () => {
            const state = landsAidBattle();
            recordInvalidResult(
              resolveLandsAid(state, {
                outcomes: [
                  { targetId: spellTargetId, succeeded: false },
                  { targetId: spellTargetId, succeeded: true },
                ],
                areaTargetIds: [spellTargetId, healingTargetId],
                healingTargetId,
                damageRolls: [4, 4],
                healingRolls: [3, 4],
              }),
            );
            return projectBattleState(state, "rejectDuplicateSaveFill");
          },
        },
        {
          actionName: "doRejectInvalidHealingTarget",
          discover: () => {
            const state = landsAidBattle();
            recordInvalidResult(
              resolveLandsAid(state, {
                outcomes: [{ targetId: spellTargetId, succeeded: false }],
                areaTargetIds: [spellTargetId],
                healingTargetId,
                damageRolls: [4, 4],
                healingRolls: [3, 4],
              }),
            );
            return projectBattleState(state, "rejectInvalidHealingTarget");
          },
        },
        {
          actionName: "doRejectInvalidDamageRoll",
          discover: () => {
            const state = landsAidBattle();
            recordInvalidResult(
              resolveLandsAid(state, {
                outcomes: [{ targetId: spellTargetId, succeeded: false }],
                areaTargetIds: [spellTargetId, healingTargetId],
                healingTargetId,
                damageRolls: [4],
                healingRolls: [3, 4],
              }),
            );
            return projectBattleState(state, "rejectInvalidDamageRoll");
          },
        },
        {
          actionName: "doRejectInvalidHealingRoll",
          discover: () => {
            const state = landsAidBattle();
            recordInvalidResult(
              resolveLandsAid(state, {
                outcomes: [{ targetId: spellTargetId, succeeded: false }],
                areaTargetIds: [spellTargetId, healingTargetId],
                healingTargetId,
                damageRolls: [4, 4],
                healingRolls: [3, 7],
              }),
            );
            return projectBattleState(state, "rejectInvalidHealingRoll");
          },
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<LandsAidProjection> = {},
): LandsAidProjection {
  return {
    targetHp: 20,
    secondTargetHp: 20,
    healingTargetHp: 5,
    wildShapeUsesRemaining: 2,
    actionResourcesRemaining: 1,
    lastResult: "init",
    ...overrides,
  };
}

function projectBattleState(
  state: BattleState,
  lastResult: LandsAidLastResult,
): LandsAidProjection {
  return {
    targetHp: currentHp(state, spellTargetId),
    secondTargetHp: currentHp(state, secondTargetId),
    healingTargetHp: currentHp(state, healingTargetId),
    wildShapeUsesRemaining: wildShapeUsesRemaining(state),
    actionResourcesRemaining: state.currentTurnResources.actionResources.length,
    lastResult,
  };
}

function landsAidBattle(
  input: {
    readonly wildShapeUsesRemaining?: number;
    readonly druidLevel?: number;
  } = {},
): BattleState {
  const druidLevel = input.druidLevel ?? 3;
  const result = startBattle({
    battleId: battleId("druid-lands-aid-selected-identity"),
    combatants: [
      characterSeed({
        combatantId: spellCasterId,
        displayName: "Land Druid",
        initiative: 20,
        classLevels: [{ className: "druid", level: classLevel(druidLevel) }],
        characterUnitRefs: [requireLandsAidUnitRef(druidLevel)],
        unitFeatures: [
          characterBattleFeatureInitForTest(landsAidUnit, [
            { className: "druid", level: classLevel(druidLevel) },
          ]),
        ],
        resources: [
          {
            unit: wildShapeUnit,
            usesRemaining: input.wildShapeUsesRemaining ?? 2,
          },
        ],
        spellcasting: {
          ...wizardSpellcasting(),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "druid",
            abilityModifier: 3,
          },
        },
        attack: null,
        druidWildShapeAvailableForms: druidWildShapeAvailableForms(druidLevel),
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
      characterCreature({
        combatantId: healingTargetId,
        displayName: "Healing Target",
        initiative: 8,
        currentHp: 5,
        maxHp: 20,
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success.state;
}

function landsAidAct(
  state: BattleState,
): ReturnType<typeof discoverBattleActCandidates>[number] {
  const act = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.actorId === spellCasterId,
  );
  if (act === undefined) {
    throw new Error("Expected Land's Aid act.");
  }
  return act;
}

function resolveLandsAid(
  state: BattleState,
  input: {
    readonly outcomes: readonly {
      readonly targetId: CombatantId;
      readonly succeeded: boolean;
    }[];
    readonly areaTargetIds: readonly CombatantId[];
    readonly healingTargetId: CombatantId;
    readonly damageRolls: readonly number[];
    readonly healingRolls: readonly number[];
  },
): BattleResolutionResult {
  const act = landsAidAct(state);
  const save = requireHole(act.initialHoles, "savingThrowOutcome");
  const target = requireHole(act.initialHoles, "targetChoice");
  const rolls = act.initialHoles.filter(
    (hole): hole is Extract<BattleHole, { readonly kind: "rolledDice" }> =>
      hole.kind === "rolledDice",
  );
  const damage = rolls.find((hole) => hole.label?.includes("damage"));
  const healing = rolls.find((hole) => hole.label?.includes("healing"));
  if (damage === undefined || healing === undefined) {
    throw new Error("Expected Land's Aid damage and healing roll holes.");
  }
  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      landsAidSavingThrowFill(save, input.outcomes, input.areaTargetIds),
      rolledDiceFill(damage, input.damageRolls),
      targetChoiceFill(target, input.healingTargetId),
      rolledDiceFill(healing, input.healingRolls),
    ],
  });
}

function landsAidSavingThrowFill(
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
    value: { outcomes },
    spatialFacts:
      areaTargetIds.length === 0 ? [] : [landsAidAreaFact(areaTargetIds)],
  };
}

function landsAidAreaFact(
  targetIds: readonly CombatantId[],
): BattleTargetSpatialFact {
  return {
    kind: "magicActionAreaSaveDamageHealingTargetsInSphere",
    actorId: spellCasterId,
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(druidLandsAidUnitId),
    ),
    originWithinRangeFeet: movementFeet(60),
    radiusFeet: movementFeet(10),
    targetIds,
  };
}

function targetChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
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

function druidWildShapeAvailableForms(druidLevel: number) {
  const forms = [
    statBlockCatalog.requireStatBlock("stat_block_rat"),
    statBlockCatalog.requireStatBlock("stat_block_riding_horse"),
    statBlockCatalog.requireStatBlock("stat_block_lizard"),
    statBlockCatalog.requireStatBlock("stat_block_cat"),
    statBlockCatalog.requireStatBlock("stat_block_bat"),
    statBlockCatalog.requireStatBlock("stat_block_frog"),
    statBlockCatalog.requireStatBlock("stat_block_hawk"),
    statBlockCatalog.requireStatBlock("stat_block_owl"),
  ];
  const knownFormCount = druidLevel >= 8 ? 8 : druidLevel >= 4 ? 6 : 4;
  return forms.slice(0, knownFormCount);
}

function recordResolvedState(result: BattleResolutionResult): BattleState {
  if (result.tag !== "resolved") {
    throw new Error(`Expected Land's Aid to resolve: ${result.tag}`);
  }
  return result.state;
}

function recordInvalidResult(result: BattleResolutionResult): void {
  if (result.tag !== "invalid") {
    throw new Error(`Expected Land's Aid to reject: ${result.tag}`);
  }
}

function currentHp(state: BattleState, combatantId: CombatantId): number {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return Number(combatant.hp);
}

function wildShapeUsesRemaining(state: BattleState): number {
  const actor = state.combatants.get(spellCasterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Druid actor.");
  }
  const resource = actor.origin.resources.find(
    (candidate) => "usesRemaining" in candidate,
  );
  if (resource === undefined || !("usesRemaining" in resource)) {
    throw new Error("Expected Druid Wild Shape use-count resource.");
  }
  return Number(resource.usesRemaining);
}

function requireLandsAidUnitRef(druidLevel = 3) {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: parseSharedUnitId(druidLandsAidUnitId) },
    unit: landsAidUnit,
    classLevels: [{ className: "druid", level: classLevel(druidLevel) }],
  });
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  const support =
    battleMagicActionAreaSaveDamageHealingSupportForUnit(landsAidUnit);
  if (support === null || support === "unsupported") {
    throw new Error("Expected Land's Aid damage/healing support.");
  }
  return unitRef.success;
}
