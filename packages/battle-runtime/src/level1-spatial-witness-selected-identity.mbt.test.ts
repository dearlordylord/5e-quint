// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt level1-spatial-witness dancing_lights faerie_fire feather_fall fog_cloud grease
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness dancing_lights doDancingLightsMovableDimLight
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness faerie_fire doFaerieFireOutlineAdvantageInvisibleDimLight
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness feather_fall doFeatherFallReactionMitigationLanding
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness fog_cloud doFogCloudAreaIdentityObscurementStrongWindCleanup
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness grease doGreaseCastGroundHazardSavingThrows
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  canSpendAction,
  canSpendBonusAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import {
  armorClass,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  applyCondition,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import {
  elapsedTimeTicksFromHours,
  elapsedTimeTicksFromMinutes,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  ATTACK_ROLL_MODES,
  type AttackRollMode,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  activeFeatherFallDescentRateCapFeetPerRound,
  battleCombatantSide,
  battleId,
  battleIlluminationFromLightEmitters,
  battleObjectId,
  battleObscurementZones,
  battleSightObscurement,
  battleTablePositionId,
  characterId,
  combatantId,
  discoverBattleActs,
  FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND,
  initiativeScore,
  objectInvisibleBenefitDenied,
  openCreatureFallsReactionWindow,
  resolveBattleReaction,
  resolveFeatherFallLanding,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleIllumination,
  type BattleLightEmitter,
  type BattleLightEmitterProjectionFact,
  type BattleObscurementZone,
  type BattleObjectId,
  type BattleResolutionResult,
  type BattleSightObscurement,
  type BattleState,
  type BattleSubject,
  type BattleTargetSpatialFact,
  type CombatantId,
} from "./index.ts";

const level1SpatialWitnessSelectedIdentityDriverSchema = {
  init: {},
  doDancingLightsMovableDimLight: {},
  doFaerieFireOutlineAdvantageInvisibleDimLight: {},
  doFeatherFallReactionMitigationLanding: {},
  doFogCloudAreaIdentityObscurementStrongWindCleanup: {},
  doGreaseCastGroundHazardSavingThrows: {},
  step: {},
} as const;
type Level1SpatialWitnessSelectedIdentityDriverAction = Exclude<
  keyof typeof level1SpatialWitnessSelectedIdentityDriverSchema,
  "init" | "step"
>;

type Level1SpatialWitnessSelectedIdentityProjection = {
  readonly lightEmitterCount: number;
  readonly dimLightEmitterCount: number;
  readonly retainedLightIdentityCount: number;
  readonly faerieFireOutlinedCreatureCount: number;
  readonly faerieFireOutlinedObjectCount: number;
  readonly faerieFireCreatureAttackRollMode: ProjectedAttackRollMode;
  readonly faerieFireInvisibleCreatureAttackRollMode: ProjectedAttackRollMode;
  readonly faerieFireObjectAttackRollMode: ProjectedAttackRollMode;
  readonly faerieFireTargetInvisible: boolean;
  readonly faerieFireObjectInvisibleBenefitDenied: boolean;
  readonly featherFallTriggerOffered: boolean;
  readonly featherFallUnwitnessedTriggerRejected: boolean;
  readonly featherFallReactionSpent: boolean;
  readonly featherFallSlotExpended: boolean;
  readonly featherFallMitigatedTargetCountBeforeLanding: number;
  readonly featherFallLandedTargetDescentRateCapFeetPerRound: number;
  readonly featherFallLandingFallDamagePrevented: boolean;
  readonly featherFallLandingFallingPronePrevented: boolean;
  readonly featherFallLandedTargetMitigationCleared: boolean;
  readonly featherFallOtherTargetStillMitigated: boolean;
  readonly fogCloudAreaIdentityRetained: boolean;
  readonly fogCloudHeavilyObscuredZoneCount: number;
  readonly fogCloudRadiusFeet: number;
  readonly fogCloudDurationTicks: number;
  readonly fogCloudStrongWindCommandOffered: boolean;
  readonly fogCloudCleanupClearedEffect: boolean;
  readonly fogCloudCleanupClearedZone: boolean;
  readonly fogCloudCleanupClearedConcentration: boolean;
  readonly fogCloudSlotExpended: boolean;
  readonly greaseAreaIdentityRetained: boolean;
  readonly greaseActiveHazardCount: number;
  readonly greaseDurationTicks: number;
  readonly greaseAffectedTargetOutcomeCount: number;
  readonly greaseFailedTargetProne: boolean;
  readonly greaseSucceededTargetProne: boolean;
  readonly greaseMismatchedAffectedTargetRejected: boolean;
  readonly greaseSlotExpended: boolean;
  readonly projectedIllumination: BattleIllumination;
  readonly ordinarySightObscurement: BattleSightObscurement;
  readonly darkvisionSightObscurement: BattleSightObscurement;
  readonly mismatchedWitnessIllumination: BattleIllumination;
  readonly obscurementZoneCount: number;
  readonly casterConcentrating: boolean;
  readonly magicActionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly lastResult:
    | "init"
    | "dancingLightsMovableDimLight"
    | "faerieFireOutlineAdvantageInvisibleDimLight"
    | "featherFallReactionMitigationLanding"
    | "fogCloudAreaIdentityObscurementStrongWindCleanup"
    | "greaseCastGroundHazardSavingThrows";
};
type ProjectedAttackRollMode = AttackRollMode;
const dancingLightsUnitId = "dancing_lights";
const faerieFireUnitId = "faerie_fire";
const featherFallUnitId = "feather_fall";
const fogCloudUnitId = "fog_cloud";
const greaseUnitId = "grease";
const starryWispUnitId = "starry_wisp";
const level1SpatialWitnessSelectedUnitIds = [
  dancingLightsUnitId,
  faerieFireUnitId,
  featherFallUnitId,
  fogCloudUnitId,
  greaseUnitId,
] as const;
type Level1SpatialWitnessSelectedUnitId =
  (typeof level1SpatialWitnessSelectedUnitIds)[number];
const level1SpatialWitnessCatalogSpellIds = [
  ...level1SpatialWitnessSelectedUnitIds,
  starryWispUnitId,
] as const;
type Level1SpatialWitnessCatalogSpellId =
  (typeof level1SpatialWitnessCatalogSpellIds)[number];
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly Level1SpatialWitnessSelectedIdentityDriverAction[];
  readonly expected: Level1SpatialWitnessSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "level1-spatial-witness";
  readonly unitId: Level1SpatialWitnessSelectedUnitId;
  readonly actions: readonly Level1SpatialWitnessSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type BonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionSpell" }
  >;
};
type FogCloudStrongWindDispersalAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "disperseFogCloud" }
  >;
};
type FogCloudObscurementEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "fogCloudObscurement" }
>;
type SpellObscurementZone = Extract<
  BattleObscurementZone,
  { readonly kind: "spellObscurementZone" }
>;
type SpellLightEmitter = Extract<
  BattleLightEmitter,
  { readonly kind: "spellLightEmitter" }
>;
type DancingLightAttachment = Extract<
  SpellLightEmitter["attachment"],
  { readonly kind: "dancingLight" }
>;
type DancingLightEmitter = SpellLightEmitter & {
  readonly attachment: DancingLightAttachment;
};
type FeatherFallProjection = {
  readonly triggerOffered: boolean;
  readonly unwitnessedTriggerRejected: boolean;
  readonly reactionSpent: boolean;
  readonly slotExpended: boolean;
  readonly mitigatedTargetCountBeforeLanding: number;
  readonly landedTargetDescentRateCapFeetPerRound: number;
  readonly landingFallDamagePrevented: boolean;
  readonly landingFallingPronePrevented: boolean;
  readonly landedTargetMitigationCleared: boolean;
  readonly otherTargetStillMitigated: boolean;
};
type FogCloudProjection = {
  readonly areaIdentityRetained: boolean;
  readonly heavilyObscuredZoneCount: number;
  readonly radiusFeet: number;
  readonly durationTicks: number;
  readonly strongWindCommandOffered: boolean;
  readonly cleanupClearedEffect: boolean;
  readonly cleanupClearedZone: boolean;
  readonly cleanupClearedConcentration: boolean;
  readonly slotExpended: boolean;
};
type GreaseGroundHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "greaseGroundHazard" }
>;
type GreaseProjection = {
  readonly areaIdentityRetained: boolean;
  readonly activeHazardCount: number;
  readonly durationTicks: number;
  readonly affectedTargetOutcomeCount: number;
  readonly failedTargetProne: boolean;
  readonly succeededTargetProne: boolean;
  readonly mismatchedAffectedTargetRejected: boolean;
  readonly slotExpended: boolean;
};
type GreaseSavingThrowOutcome = {
  readonly targetId: CombatantId;
  readonly succeeded: boolean;
};

const casterId = combatantId("level1-spatial-witness-caster");
const observerId = combatantId("level1-spatial-witness-observer");
const featherFallFallingAllyId = combatantId(
  "level1-spatial-witness-feather-fall-ally-a",
);
const featherFallOtherFallingAllyId = combatantId(
  "level1-spatial-witness-feather-fall-ally-b",
);
const greaseFailedTargetId = combatantId(
  "level1-spatial-witness-grease-failed-target",
);
const greaseSuccessfulTargetId = combatantId(
  "level1-spatial-witness-grease-successful-target",
);
const greaseAffectedTargetIds = [
  greaseFailedTargetId,
  greaseSuccessfulTargetId,
] as const satisfies ReadonlyArray<CombatantId>;
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
const dancingLightsDimLightRadiusFeet = movementFeet(10);
const dancingLightsSiblingSpacingFeet = movementFeet(10);
const dancingLightsMoveDistanceFeet = movementFeet(10);
const faerieFireDimLightRadiusFeet = movementFeet(10);
const faerieFireObjectId = battleObjectId("level1-faerie-fire-object");
const faerieFireObjectArmorClass = armorClass(13);
const starryWispObjectTargetRangeFeet = movementFeet(60);
const darkvisionWitnessRangeFeet = movementFeet(60);
const fogCloudAreaId = "level1-fog-cloud-area";
const fogCloudLevelOneRadiusFeet = movementFeet(20);
const fogCloudOneHourDurationTicks = requireElapsedHours(1);
const greaseAreaId = "level1-grease-ground-area";
const greaseOneMinuteDurationTicks = requireElapsedMinutes(1);

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Level 1 spatial witness selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "level1-spatial-witness",
    unitId: "dancing_lights",
    actions: ["doDancingLightsMovableDimLight"],
    sequences: [
      {
        name: "table-witnessed-lights-move-and-project-dim-light",
        actions: ["doDancingLightsMovableDimLight"],
        expected: expectedProjection({
          lightEmitterCount: 2,
          dimLightEmitterCount: 2,
          retainedLightIdentityCount: 2,
          projectedIllumination: "dimLight",
          ordinarySightObscurement: "lightlyObscured",
          darkvisionSightObscurement: "unobscured",
          casterConcentrating: true,
          magicActionAvailable: false,
          bonusActionAvailable: false,
          lastResult: "dancingLightsMovableDimLight",
        }),
      },
    ],
  },
  {
    taskId: "level1-spatial-witness",
    unitId: "faerie_fire",
    actions: ["doFaerieFireOutlineAdvantageInvisibleDimLight"],
    sequences: [
      {
        name: "save-gated-outline-advantage-invisible-denial-and-dim-light",
        actions: ["doFaerieFireOutlineAdvantageInvisibleDimLight"],
        expected: expectedProjection({
          lightEmitterCount: 2,
          dimLightEmitterCount: 2,
          faerieFireOutlinedCreatureCount: 1,
          faerieFireOutlinedObjectCount: 1,
          faerieFireCreatureAttackRollMode: "advantage",
          faerieFireInvisibleCreatureAttackRollMode: "advantage",
          faerieFireObjectAttackRollMode: "advantage",
          faerieFireTargetInvisible: true,
          faerieFireObjectInvisibleBenefitDenied: true,
          projectedIllumination: "dimLight",
          ordinarySightObscurement: "lightlyObscured",
          darkvisionSightObscurement: "unobscured",
          casterConcentrating: true,
          magicActionAvailable: true,
          bonusActionAvailable: true,
          lastResult: "faerieFireOutlineAdvantageInvisibleDimLight",
        }),
      },
    ],
  },
  {
    taskId: "level1-spatial-witness",
    unitId: "feather_fall",
    actions: ["doFeatherFallReactionMitigationLanding"],
    sequences: [
      {
        name: "falling-reaction-mitigation-descent-cap-and-landing-cleanup",
        actions: ["doFeatherFallReactionMitigationLanding"],
        expected: expectedProjection({
          featherFallTriggerOffered: true,
          featherFallUnwitnessedTriggerRejected: true,
          featherFallReactionSpent: true,
          featherFallSlotExpended: true,
          featherFallMitigatedTargetCountBeforeLanding: 2,
          featherFallLandedTargetDescentRateCapFeetPerRound:
            FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND,
          featherFallLandingFallDamagePrevented: true,
          featherFallLandingFallingPronePrevented: true,
          featherFallLandedTargetMitigationCleared: true,
          featherFallOtherTargetStillMitigated: true,
          magicActionAvailable: true,
          bonusActionAvailable: true,
          lastResult: "featherFallReactionMitigationLanding",
        }),
      },
    ],
  },
  {
    taskId: "level1-spatial-witness",
    unitId: "fog_cloud",
    actions: ["doFogCloudAreaIdentityObscurementStrongWindCleanup"],
    sequences: [
      {
        name: "table-supplied-area-obscurement-duration-and-strong-wind-cleanup",
        actions: ["doFogCloudAreaIdentityObscurementStrongWindCleanup"],
        expected: expectedProjection({
          fogCloudAreaIdentityRetained: true,
          fogCloudHeavilyObscuredZoneCount: 1,
          fogCloudRadiusFeet: Number(fogCloudLevelOneRadiusFeet),
          fogCloudDurationTicks: Number(fogCloudOneHourDurationTicks),
          fogCloudStrongWindCommandOffered: true,
          fogCloudCleanupClearedEffect: true,
          fogCloudCleanupClearedZone: true,
          fogCloudCleanupClearedConcentration: true,
          fogCloudSlotExpended: true,
          magicActionAvailable: false,
          bonusActionAvailable: true,
          lastResult: "fogCloudAreaIdentityObscurementStrongWindCleanup",
        }),
      },
    ],
  },
  {
    taskId: "level1-spatial-witness",
    unitId: "grease",
    actions: ["doGreaseCastGroundHazardSavingThrows"],
    sequences: [
      {
        name: "table-supplied-ground-area-on-cast-dexterity-saving-throws",
        actions: ["doGreaseCastGroundHazardSavingThrows"],
        expected: expectedProjection({
          greaseAreaIdentityRetained: true,
          greaseActiveHazardCount: 1,
          greaseDurationTicks: Number(greaseOneMinuteDurationTicks),
          greaseAffectedTargetOutcomeCount: 2,
          greaseFailedTargetProne: true,
          greaseSucceededTargetProne: false,
          greaseMismatchedAffectedTargetRejected: true,
          greaseSlotExpended: true,
          magicActionAvailable: false,
          bonusActionAvailable: true,
          lastResult: "greaseCastGroundHazardSavingThrows",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Level 1 spatial witness selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<Level1SpatialWitnessSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createLevel1SpatialWitnessSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing level 1 spatial witness selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Level 1 spatial witness selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays level 1 spatial witness selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createLevel1SpatialWitnessSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: level1SpatialWitnessSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createLevel1SpatialWitnessSelectedIdentityDriver() {
  return defineDriver(level1SpatialWitnessSelectedIdentityDriverSchema, () => {
    let state = dancingLightsBattle();
    let retainedLightIdentityCount = 0;
    let faerieFireCreatureAttackRollMode: ProjectedAttackRollMode = "normal";
    let faerieFireInvisibleCreatureAttackRollMode: ProjectedAttackRollMode =
      "normal";
    let faerieFireObjectAttackRollMode: ProjectedAttackRollMode = "normal";
    let featherFallProjection = emptyFeatherFallProjection();
    let fogCloudProjection = emptyFogCloudProjection();
    let greaseProjection = emptyGreaseProjection();
    let lastResult: Level1SpatialWitnessSelectedIdentityProjection["lastResult"] =
      "init";

    function reset(): void {
      state = dancingLightsBattle();
      retainedLightIdentityCount = 0;
      faerieFireCreatureAttackRollMode = "normal";
      faerieFireInvisibleCreatureAttackRollMode = "normal";
      faerieFireObjectAttackRollMode = "normal";
      featherFallProjection = emptyFeatherFallProjection();
      fogCloudProjection = emptyFogCloudProjection();
      greaseProjection = emptyGreaseProjection();
      lastResult = "init";
    }

    return {
      init: reset,
      doDancingLightsMovableDimLight: () => {
        state = dancingLightsBattle();
        const castAct = dancingLightsSeparateCastAct(state);
        const cast = resolveBattleSubject({
          state,
          subject: castAct.subject,
          fills: [
            separateCastPlacement(
              requireHole(castAct.initialHoles, "dancingLightsPlacement"),
            ),
          ],
        });
        if (cast.tag !== "resolved") {
          throw new Error(
            `Expected Dancing Lights cast to resolve, got ${cast.tag}.`,
          );
        }

        const beforeMoveEmitters = dancingLightEmitters(cast.state);
        const moveAct = dancingLightsRepositionAct(cast.state);
        const moved = resolveBattleSubject({
          state: cast.state,
          subject: moveAct.subject,
          fills: [
            separateRepositionPlacement(
              requireHole(moveAct.initialHoles, "dancingLightsPlacement"),
              beforeMoveEmitters,
            ),
          ],
        });
        if (moved.tag !== "resolved") {
          throw new Error(
            `Expected Dancing Lights reposition to resolve, got ${moved.tag}.`,
          );
        }

        const afterMoveEmitters = dancingLightEmitters(moved.state);
        retainedLightIdentityCount = retainedIdentityCount(
          beforeMoveEmitters,
          afterMoveEmitters,
        );
        state = moved.state;
        lastResult = "dancingLightsMovableDimLight";
      },
      doFaerieFireOutlineAdvantageInvisibleDimLight: () => {
        state = faerieFireBattle();
        retainedLightIdentityCount = 0;
        const act = faerieFireAct(state);
        const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
        const outlined = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            faerieFireSavingThrowOutcomeFill(
              savingThrow,
              [
                { targetId: casterId, succeeded: true },
                { targetId: observerId, succeeded: false },
              ],
              [faerieFireObjectId],
            ),
          ],
        });
        if (outlined.tag !== "resolved") {
          throw new Error(
            `Expected Faerie Fire outline to resolve, got ${outlined.tag}.`,
          );
        }

        const afterVisibleTargetTurns = advanceBackToCasterTurn(outlined.state);
        faerieFireCreatureAttackRollMode = attackRollModeForMeleeTarget(
          afterVisibleTargetTurns,
        );

        const invisibleOutlined = advanceBackToCasterTurn(
          withInvisibleObserver(outlined.state),
        );
        faerieFireInvisibleCreatureAttackRollMode =
          attackRollModeForMeleeTarget(invisibleOutlined);
        faerieFireObjectAttackRollMode =
          attackRollModeForFaerieFireObject(invisibleOutlined);
        state = invisibleOutlined;
        lastResult = "faerieFireOutlineAdvantageInvisibleDimLight";
      },
      doFeatherFallReactionMitigationLanding: () => {
        state = featherFallBattle();
        retainedLightIdentityCount = 0;
        const unwitnessedTrigger = openFeatherFallWindow(state, []);
        const unwitnessedTriggerRejected =
          unwitnessedTrigger.tag === "resolved" &&
          unwitnessedTrigger.snapshot.pendingReaction === null;
        const awaitingReaction = openFeatherFallWindow(state, [
          featherFallTriggerFact(),
        ]);
        const triggerOffered =
          awaitingReaction.tag === "needsHoles" &&
          awaitingReaction.snapshot.pendingReaction?.trigger ===
            "creatureFalls";
        if (awaitingReaction.tag !== "needsHoles") {
          throw new Error(
            "Expected Feather Fall falling-trigger Reaction window.",
          );
        }

        const choice = featherFallReactionChoice(awaitingReaction);
        const resolved = resolveBattleReaction({
          state: awaitingReaction.state,
          fill: reactionDecisionFill(
            requireHole(awaitingReaction.holes, "reactionDecision"),
            {
              kind: "resolve",
              reactorId: casterId,
              choice: {
                kind: "castTriggeredReactionSpell",
                invocation: choice.invocation,
                fills: [
                  featherFallTargetListFill(
                    requireHole(choice.initialHoles, "spellTargetList"),
                    [featherFallFallingAllyId, featherFallOtherFallingAllyId],
                  ),
                ],
              },
            },
          ),
        });
        if (resolved.tag !== "resolved") {
          throw new Error(
            `Expected Feather Fall Reaction to resolve, got ${resolved.tag}.`,
          );
        }

        const landing = resolveFeatherFallLanding({
          state: resolved.state,
          targetId: featherFallFallingAllyId,
        });
        if (landing.tag !== "mitigated") {
          throw new Error("Expected Feather Fall landing mitigation.");
        }
        featherFallProjection = {
          triggerOffered,
          unwitnessedTriggerRejected,
          reactionSpent: !featherFallCaster(resolved.state).reactionAvailable,
          slotExpended: featherFallCasterSlotExpended(resolved.state),
          mitigatedTargetCountBeforeLanding: featherFallMitigationTargetCount(
            resolved.state,
          ),
          landedTargetDescentRateCapFeetPerRound:
            activeFeatherFallDescentRateCapFeetPerRound(
              featherFallCombatant(resolved.state, featherFallFallingAllyId),
            ) ?? 0,
          landingFallDamagePrevented: landing.fallDamagePrevented,
          landingFallingPronePrevented: landing.fallingPronePrevented,
          landedTargetMitigationCleared:
            activeFeatherFallDescentRateCapFeetPerRound(
              featherFallCombatant(landing.state, featherFallFallingAllyId),
            ) === null,
          otherTargetStillMitigated:
            activeFeatherFallDescentRateCapFeetPerRound(
              featherFallCombatant(
                landing.state,
                featherFallOtherFallingAllyId,
              ),
            ) === FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND,
        };
        state = landing.state;
        lastResult = "featherFallReactionMitigationLanding";
      },
      doFogCloudAreaIdentityObscurementStrongWindCleanup: () => {
        state = fogCloudBattle();
        retainedLightIdentityCount = 0;
        const act = fogCloudAct(state);
        const area = requireHole(act.initialHoles, "spellAreaChoice");
        const cast = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [fogCloudAreaFill(area)],
        });
        if (cast.tag !== "resolved") {
          throw new Error(
            `Expected Fog Cloud cast to resolve, got ${cast.tag}.`,
          );
        }

        const command = fogCloudStrongWindDispersalAct(cast.state);
        const dispersed = resolveBattleSubject({
          state: cast.state,
          subject: command.subject,
          fills: [],
        });
        if (dispersed.tag !== "resolved") {
          throw new Error(
            `Expected Fog Cloud strong-wind cleanup to resolve, got ${dispersed.tag}.`,
          );
        }

        fogCloudProjection = projectFogCloudReplay(
          cast.state,
          dispersed.state,
          {
            strongWindCommandOffered: true,
          },
        );
        state = dispersed.state;
        lastResult = "fogCloudAreaIdentityObscurementStrongWindCleanup";
      },
      doGreaseCastGroundHazardSavingThrows: () => {
        state = greaseBattle();
        retainedLightIdentityCount = 0;
        const act = greaseAct(state);
        const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
        const savingThrowOutcomes = greaseCastSavingThrowOutcomes();
        const mismatched = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            greaseSavingThrowOutcomeFill(
              savingThrow,
              greaseAffectedTargetIds,
              [
                { targetId: greaseFailedTargetId, succeeded: false },
                { targetId: casterId, succeeded: true },
              ],
            ),
          ],
        });
        const mismatchedAffectedTargetRejected =
          mismatched.tag === "invalid" &&
          mismatched.message ===
            "Grease Saving Throw outcomes must match the table-supplied ground-area affected targets.";

        const cast = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            greaseSavingThrowOutcomeFill(
              savingThrow,
              greaseAffectedTargetIds,
              savingThrowOutcomes,
            ),
          ],
        });
        if (cast.tag !== "resolved") {
          throw new Error(
            `Expected Grease cast to resolve, got ${cast.tag}.`,
          );
        }

        greaseProjection = projectGreaseReplay(cast.state, {
          mismatchedAffectedTargetRejected,
          affectedTargetOutcomeCount: savingThrowOutcomes.length,
        });
        state = cast.state;
        lastResult = "greaseCastGroundHazardSavingThrows";
      },
      step: () => {},
      getState: () =>
        projectLevel1SpatialWitnessSelectedIdentityState(
          state,
          retainedLightIdentityCount,
          faerieFireCreatureAttackRollMode,
          faerieFireInvisibleCreatureAttackRollMode,
          faerieFireObjectAttackRollMode,
          featherFallProjection,
          fogCloudProjection,
          greaseProjection,
          lastResult,
        ),
    };
  });
}

function requireElapsedHours(hours: number) {
  const ticks = elapsedTimeTicksFromHours(hours);
  if (Either.isLeft(ticks)) {
    throw new Error(`Expected valid elapsed hours: ${hours}.`);
  }
  return ticks.right;
}

function requireElapsedMinutes(minutes: number) {
  const ticks = elapsedTimeTicksFromMinutes(minutes);
  if (Either.isLeft(ticks)) {
    throw new Error(`Expected valid elapsed minutes: ${minutes}.`);
  }
  return ticks.right;
}

function expectedProjection(
  overrides: Partial<Level1SpatialWitnessSelectedIdentityProjection> = {},
): Level1SpatialWitnessSelectedIdentityProjection {
  return {
    lightEmitterCount: 0,
    dimLightEmitterCount: 0,
    retainedLightIdentityCount: 0,
    faerieFireOutlinedCreatureCount: 0,
    faerieFireOutlinedObjectCount: 0,
    faerieFireCreatureAttackRollMode: "normal",
    faerieFireInvisibleCreatureAttackRollMode: "normal",
    faerieFireObjectAttackRollMode: "normal",
    faerieFireTargetInvisible: false,
    faerieFireObjectInvisibleBenefitDenied: false,
    featherFallTriggerOffered: false,
    featherFallUnwitnessedTriggerRejected: false,
    featherFallReactionSpent: false,
    featherFallSlotExpended: false,
    featherFallMitigatedTargetCountBeforeLanding: 0,
    featherFallLandedTargetDescentRateCapFeetPerRound: 0,
    featherFallLandingFallDamagePrevented: false,
    featherFallLandingFallingPronePrevented: false,
    featherFallLandedTargetMitigationCleared: false,
    featherFallOtherTargetStillMitigated: false,
    fogCloudAreaIdentityRetained: false,
    fogCloudHeavilyObscuredZoneCount: 0,
    fogCloudRadiusFeet: 0,
    fogCloudDurationTicks: 0,
    fogCloudStrongWindCommandOffered: false,
    fogCloudCleanupClearedEffect: false,
    fogCloudCleanupClearedZone: false,
    fogCloudCleanupClearedConcentration: false,
    fogCloudSlotExpended: false,
    greaseAreaIdentityRetained: false,
    greaseActiveHazardCount: 0,
    greaseDurationTicks: 0,
    greaseAffectedTargetOutcomeCount: 0,
    greaseFailedTargetProne: false,
    greaseSucceededTargetProne: false,
    greaseMismatchedAffectedTargetRejected: false,
    greaseSlotExpended: false,
    projectedIllumination: "darkness",
    ordinarySightObscurement: "heavilyObscured",
    darkvisionSightObscurement: "lightlyObscured",
    mismatchedWitnessIllumination: "darkness",
    obscurementZoneCount: 0,
    casterConcentrating: false,
    magicActionAvailable: true,
    bonusActionAvailable: true,
    lastResult: "init",
    ...overrides,
  };
}

function emptyFeatherFallProjection(): FeatherFallProjection {
  return {
    triggerOffered: false,
    unwitnessedTriggerRejected: false,
    reactionSpent: false,
    slotExpended: false,
    mitigatedTargetCountBeforeLanding: 0,
    landedTargetDescentRateCapFeetPerRound: 0,
    landingFallDamagePrevented: false,
    landingFallingPronePrevented: false,
    landedTargetMitigationCleared: false,
    otherTargetStillMitigated: false,
  };
}

function emptyFogCloudProjection(): FogCloudProjection {
  return {
    areaIdentityRetained: false,
    heavilyObscuredZoneCount: 0,
    radiusFeet: 0,
    durationTicks: 0,
    strongWindCommandOffered: false,
    cleanupClearedEffect: false,
    cleanupClearedZone: false,
    cleanupClearedConcentration: false,
    slotExpended: false,
  };
}

function emptyGreaseProjection(): GreaseProjection {
  return {
    areaIdentityRetained: false,
    activeHazardCount: 0,
    durationTicks: 0,
    affectedTargetOutcomeCount: 0,
    failedTargetProne: false,
    succeededTargetProne: false,
    mismatchedAffectedTargetRejected: false,
    slotExpended: false,
  };
}

function dancingLightsBattle(): BattleState {
  const spell = spellRecord(dancingLightsUnitId);
  const result = startBattle({
    battleId: battleId("level1-spatial-witness-selected-identity"),
    combatants: [
      spatialWitnessCreature({
        combatantId: casterId,
        displayName: "Dancing Lights caster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [spell],
          preparedSpells: [],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [],
        },
      }),
      spatialWitnessCreature({
        combatantId: observerId,
        displayName: "Spatial witness observer",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function faerieFireBattle(): BattleState {
  const faerieFire = spellRecord(faerieFireUnitId);
  const starryWisp = spellRecord(starryWispUnitId);
  const result = startBattle({
    battleId: battleId("level1-spatial-witness-selected-identity"),
    combatants: [
      spatialWitnessCreature({
        combatantId: casterId,
        displayName: "Faerie Fire caster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: "druid",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [starryWisp],
          preparedSpells: [faerieFire],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      spatialWitnessCreature({
        combatantId: observerId,
        displayName: "Faerie Fire target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function featherFallBattle(): BattleState {
  const featherFall = spellRecord(featherFallUnitId);
  const result = startBattle({
    battleId: battleId("level1-spatial-witness-selected-identity"),
    combatants: [
      spatialWitnessCreature({
        combatantId: casterId,
        displayName: "Feather Fall caster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [featherFall],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      spatialWitnessCreature({
        combatantId: featherFallFallingAllyId,
        displayName: "Feather Fall falling ally A",
        initiative: 15,
        side: partySide,
      }),
      spatialWitnessCreature({
        combatantId: featherFallOtherFallingAllyId,
        displayName: "Feather Fall falling ally B",
        initiative: 10,
        side: partySide,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function fogCloudBattle(): BattleState {
  const fogCloud = spellRecord(fogCloudUnitId);
  const result = startBattle({
    battleId: battleId("level1-spatial-witness-selected-identity"),
    combatants: [
      spatialWitnessCreature({
        combatantId: casterId,
        displayName: "Fog Cloud caster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: "druid",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [fogCloud],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      spatialWitnessCreature({
        combatantId: observerId,
        displayName: "Fog Cloud observer",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function greaseBattle(): BattleState {
  const grease = spellRecord(greaseUnitId);
  const result = startBattle({
    battleId: battleId("level1-spatial-witness-selected-identity"),
    combatants: [
      spatialWitnessCreature({
        combatantId: casterId,
        displayName: "Grease caster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [grease],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      spatialWitnessCreature({
        combatantId: greaseFailedTargetId,
        displayName: "Grease failed target",
        initiative: 10,
        side: oppositionSide,
      }),
      spatialWitnessCreature({
        combatantId: greaseSuccessfulTargetId,
        displayName: "Grease successful target",
        initiative: 5,
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function spatialWitnessCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [
        {
          className: input.spellcasting?.sourceClassName ?? "wizard",
          level: 1,
        },
      ],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function spellRecord(
  spellUnitId: Level1SpatialWitnessCatalogSpellId,
): SpellRecord {
  const unit = unitLibrary.requireUnit(spellUnitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${spellUnitId} to be a Spell.`);
  }
  return unit;
}

function dancingLightsSeparateCastAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === dancingLightsUnitId &&
      candidate.subject.invocation.procedure === "dancingLightsSeparateCast",
  );
  if (act === undefined) {
    throw new Error("Expected Dancing Lights separate cast action.");
  }
  return act;
}

function dancingLightsRepositionAct(state: BattleState): BonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === dancingLightsUnitId &&
      candidate.subject.invocation.procedure === "dancingLightsReposition",
  );
  if (act === undefined) {
    throw new Error("Expected Dancing Lights reposition Bonus Action.");
  }
  return act;
}

function faerieFireAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === faerieFireUnitId &&
      candidate.subject.invocation.procedure === "saveGatedAttackRollAdvantage",
  );
  if (act === undefined) {
    throw new Error("Expected Faerie Fire save-gated outline action.");
  }
  return act;
}

function fogCloudAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === fogCloudUnitId &&
      candidate.subject.invocation.procedure === "fogCloudObscurement",
  );
  if (act === undefined) {
    throw new Error("Expected Fog Cloud obscurement action.");
  }
  return act;
}

function greaseAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === greaseUnitId &&
      candidate.subject.invocation.procedure === "greaseGroundHazard",
  );
  if (act === undefined) {
    throw new Error("Expected Grease ground-hazard action.");
  }
  return act;
}

function separateCastPlacement(
  hole: Extract<BattleHole, { readonly kind: "dancingLightsPlacement" }>,
): Extract<BattleFill, { readonly kind: "dancingLightsPlacement" }> {
  return {
    kind: "dancingLightsPlacement",
    holeId: hole.holeId,
    value: {
      mode: "cast",
      form: "separateLights",
      lights: [
        {
          positionId: battleTablePositionId("level1-dancing-lights-a"),
          distanceFromCasterFeet: movementFeet(30),
          nearestSiblingDistanceFeet: dancingLightsSiblingSpacingFeet,
        },
        {
          positionId: battleTablePositionId("level1-dancing-lights-b"),
          distanceFromCasterFeet: movementFeet(35),
          nearestSiblingDistanceFeet: dancingLightsSiblingSpacingFeet,
        },
      ],
    },
  };
}

function separateRepositionPlacement(
  hole: Extract<BattleHole, { readonly kind: "dancingLightsPlacement" }>,
  emitters: readonly DancingLightEmitter[],
): Extract<BattleFill, { readonly kind: "dancingLightsPlacement" }> {
  const [firstEmitter, secondEmitter] = emitters;
  if (firstEmitter === undefined || secondEmitter === undefined) {
    throw new Error("Expected two Dancing Lights emitters to reposition.");
  }
  return {
    kind: "dancingLightsPlacement",
    holeId: hole.holeId,
    value: {
      mode: "reposition",
      form: "separateLights",
      lights: [
        {
          lightId: firstEmitter.attachment.lightId,
          positionId: battleTablePositionId("level1-dancing-lights-a-moved"),
          distanceFromCasterFeet: movementFeet(40),
          moveDistanceFeet: dancingLightsMoveDistanceFeet,
          nearestSiblingDistanceFeet: dancingLightsSiblingSpacingFeet,
        },
        {
          lightId: secondEmitter.attachment.lightId,
          positionId: battleTablePositionId("level1-dancing-lights-b-moved"),
          distanceFromCasterFeet: movementFeet(45),
          moveDistanceFeet: dancingLightsMoveDistanceFeet,
          nearestSiblingDistanceFeet: dancingLightsSiblingSpacingFeet,
        },
      ],
    },
  };
}

function faerieFireSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
  affectedObjectIds: readonly BattleObjectId[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "faerieFireArea",
        originAnchorId: casterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
        affectedObjectIds,
      },
      outcomes,
    },
  };
}

function greaseSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  affectedTargetIds: readonly CombatantId[],
  outcomes: readonly GreaseSavingThrowOutcome[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "greaseGroundArea",
        areaId: greaseAreaId,
        originAnchorId: casterId,
        affectedTargetIds,
      },
      outcomes,
    },
  };
}

function greaseCastSavingThrowOutcomes(): readonly GreaseSavingThrowOutcome[] {
  return [
    { targetId: greaseFailedTargetId, succeeded: false },
    { targetId: greaseSuccessfulTargetId, succeeded: true },
  ];
}

function openFeatherFallWindow(
  state: BattleState,
  reactionSpellTargetFacts: readonly BattleTargetSpatialFact[],
): BattleResolutionResult {
  return openCreatureFallsReactionWindow({
    state,
    fallingCreatureId: featherFallFallingAllyId,
    reactionSpellTargetFacts,
  });
}

function featherFallTriggerFact(): Extract<
  BattleTargetSpatialFact,
  { readonly kind: "featherFallTriggerSelfOrVisibleCreatureWithinRange" }
> {
  return {
    kind: "featherFallTriggerSelfOrVisibleCreatureWithinRange",
    reactorId: casterId,
    fallingCreatureId: featherFallFallingAllyId,
    spellId: featherFallUnitId,
    rangeFeet: movementFeet(60),
  };
}

function featherFallReactionChoice(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
) {
  const choice = result.snapshot.pendingReaction?.choices.find(
    (candidate) =>
      candidate.kind === "castTriggeredReactionSpell" &&
      candidate.invocation.tag === "spellSlot" &&
      candidate.invocation.spellId === featherFallUnitId &&
      candidate.invocation.procedure === "featherFallMitigation",
  );
  if (choice === undefined || choice.kind !== "castTriggeredReactionSpell") {
    throw new Error("Expected Feather Fall Reaction choice.");
  }
  return choice;
}

function featherFallTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "featherFallTargetFallingWithinRange",
      casterId,
      targetId,
      spellId: featherFallUnitId,
      rangeFeet: movementFeet(60),
    })),
  };
}

function fogCloudAreaFill(
  hole: Extract<BattleHole, { readonly kind: "spellAreaChoice" }>,
): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: hole.holeId,
    value: { kind: "fogCloudArea", areaId: fogCloudAreaId },
  };
}

function fogCloudStrongWindDispersalAct(
  state: BattleState,
): FogCloudStrongWindDispersalAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is FogCloudStrongWindDispersalAct =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "disperseFogCloud" &&
      candidate.subject.sourceCombatantId === casterId &&
      candidate.subject.sourceSpellId === fogCloudUnitId &&
      candidate.subject.areaId === fogCloudAreaId,
  );
  if (act === undefined) {
    throw new Error("Expected Fog Cloud strong-wind dispersal command.");
  }
  return act;
}

function reactionDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "reactionDecision" }>,
  value: Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "reactionDecision" }> {
  return { kind: "reactionDecision", holeId: hole.holeId, value };
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag === "invalid") {
    throw new Error(result.message);
  }
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${kind} hole, got ${result.tag}.`);
  }
  return requireHole(result.holes, kind);
}

function advanceBackToCasterTurn(state: BattleState): BattleState {
  return resolveEndTurn(
    resolveEndTurn(state, casterId, "Faerie Fire caster"),
    observerId,
    "Faerie Fire target",
  );
}

function resolveEndTurn(
  state: BattleState,
  actorId: CombatantId,
  label: string,
): BattleState {
  const result = resolveBattleSubject({
    state,
    subject: {
      tag: "runtimeCommand",
      actorId,
      command: "endTurn",
    },
    fills: [],
  });
  if (result.tag !== "resolved") {
    throw new Error(`Expected ${label} End Turn to resolve.`);
  }
  return result.state;
}

function withInvisibleObserver(state: BattleState): BattleState {
  const observer = state.combatants.get(observerId);
  if (observer === undefined) {
    throw new Error("Expected Faerie Fire observer combatant.");
  }
  if (observer.positiveHpUnconscious !== null) {
    throw new Error("Expected a conscious Faerie Fire observer combatant.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(observerId, {
      ...observer,
      conditions: applyCondition(observer.conditions, "invisible"),
    }),
  };
}

function attackRollModeForMeleeTarget(
  state: BattleState,
): ProjectedAttackRollMode {
  const subject: BattleSubject = {
    tag: "action",
    actorId: casterId,
    action: "attack",
    attackName: "Unarmed Strike",
  };
  const targetChoice = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [attackTargetFill(targetChoice)],
    }),
    "attackRoll",
  );
  return attackRoll.rollMode ?? "normal";
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: observerId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: casterId,
        targetId: observerId,
        attackName: "Unarmed Strike",
      },
    ],
  };
}

function attackRollModeForFaerieFireObject(
  state: BattleState,
): ProjectedAttackRollMode {
  const act = actionSpellAct(state, starryWispUnitId);
  const objectTarget = requireHole(act.initialHoles, "objectTargetChoice");
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [spellObjectTargetFill(objectTarget)],
    }),
    "attackRoll",
  );
  return attackRoll.rollMode ?? "normal";
}

function actionSpellAct(
  state: BattleState,
  spellUnitId: Level1SpatialWitnessCatalogSpellId,
): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === spellUnitId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellUnitId} action spell act.`);
  }
  return act;
}

function spellObjectTargetFill(
  hole: Extract<BattleHole, { readonly kind: "objectTargetChoice" }>,
): Extract<BattleFill, { readonly kind: "objectTargetChoice" }> {
  return {
    kind: "objectTargetChoice",
    holeId: hole.holeId,
    value: faerieFireObjectId,
    spatialFacts: [
      {
        kind: "spellObjectTarget",
        casterId,
        objectId: faerieFireObjectId,
        spellId: starryWispUnitId,
        rangeFeet: starryWispObjectTargetRangeFeet,
        armorClass: faerieFireObjectArmorClass,
        damageDisposition: { kind: "tableResolved" },
      },
      {
        kind: "spellObjectTargetSight",
        casterId,
        objectId: faerieFireObjectId,
        spellId: starryWispUnitId,
        attackerCanSeeObject: true,
      },
    ],
  };
}

function projectFogCloudReplay(
  activeState: BattleState,
  cleanupState: BattleState,
  input: { readonly strongWindCommandOffered: boolean },
): FogCloudProjection {
  const activeEffect = fogCloudActiveEffect(activeState);
  const activeZone = fogCloudObscurementZone(activeState);
  const radiusMatches =
    activeEffect?.radiusFeet === fogCloudLevelOneRadiusFeet &&
    activeZone?.area.radiusFeet === fogCloudLevelOneRadiusFeet;
  return {
    areaIdentityRetained:
      activeEffect?.areaId === fogCloudAreaId &&
      activeZone?.area.areaId === fogCloudAreaId,
    heavilyObscuredZoneCount: fogCloudHeavilyObscuredZoneCount(activeState),
    radiusFeet: radiusMatches ? Number(fogCloudLevelOneRadiusFeet) : 0,
    durationTicks: fogCloudMatchingDurationTicks(activeEffect, activeZone),
    strongWindCommandOffered: input.strongWindCommandOffered,
    cleanupClearedEffect: fogCloudActiveEffect(cleanupState) === undefined,
    cleanupClearedZone: fogCloudObscurementZone(cleanupState) === undefined,
    cleanupClearedConcentration:
      cleanupState.combatants.get(casterId)?.concentration === null,
    slotExpended: fogCloudCasterSlotExpended(activeState),
  };
}

function fogCloudActiveEffect(
  state: BattleState,
): FogCloudObscurementEffect | undefined {
  return state.combatants
    .get(casterId)
    ?.activeEffects.find(
      (effect): effect is FogCloudObscurementEffect =>
        effect.kind === "fogCloudObscurement" &&
        effect.sourceSpellId === fogCloudUnitId &&
        effect.sourceCombatantId === casterId &&
        effect.areaId === fogCloudAreaId,
    );
}

function fogCloudObscurementZone(
  state: BattleState,
): SpellObscurementZone | undefined {
  return battleObscurementZones(state).find(
    (zone): zone is SpellObscurementZone =>
      zone.kind === "spellObscurementZone" &&
      zone.sourceSpellId === fogCloudUnitId &&
      zone.sourceCombatantId === casterId &&
      zone.obscurement === "heavilyObscured" &&
      zone.area.kind === "pointOriginSphere" &&
      zone.area.areaId === fogCloudAreaId,
  );
}

function fogCloudHeavilyObscuredZoneCount(state: BattleState): number {
  return battleObscurementZones(state).filter(
    (zone) =>
      zone.kind === "spellObscurementZone" &&
      zone.sourceSpellId === fogCloudUnitId &&
      zone.sourceCombatantId === casterId &&
      zone.obscurement === "heavilyObscured" &&
      zone.area.areaId === fogCloudAreaId,
  ).length;
}

function fogCloudMatchingDurationTicks(
  activeEffect: FogCloudObscurementEffect | undefined,
  activeZone: SpellObscurementZone | undefined,
): number {
  if (
    activeEffect === undefined ||
    activeZone === undefined ||
    activeEffect.expiresAt.combatantId !== casterId ||
    activeZone.expiresAt.combatantId !== casterId ||
    activeEffect.expiresAt.durationTicks !== fogCloudOneHourDurationTicks ||
    activeZone.expiresAt.durationTicks !== activeEffect.expiresAt.durationTicks
  ) {
    return 0;
  }
  return Number(activeEffect.expiresAt.durationTicks);
}

function fogCloudCasterSlotExpended(state: BattleState): boolean {
  const caster = state.combatants.get(casterId);
  if (caster?.origin.kind !== "character") {
    throw new Error("Expected Fog Cloud caster to be a character.");
  }
  return (
    caster.origin.spellcasting?.spellSlots.some(
      (slot) => slot.spellLevel === 1 && slot.expended === 1,
    ) ?? false
  );
}

function projectGreaseReplay(
  activeState: BattleState,
  input: {
    readonly mismatchedAffectedTargetRejected: boolean;
    readonly affectedTargetOutcomeCount: number;
  },
): GreaseProjection {
  const activeEffects = greaseActiveEffects(activeState);
  const activeEffect =
    activeEffects.length === 1 ? activeEffects[0] : undefined;
  return {
    areaIdentityRetained: activeEffect?.areaId === greaseAreaId,
    activeHazardCount: activeEffects.length,
    durationTicks:
      activeEffect?.expiresAt.kind === "duration" &&
      activeEffect.expiresAt.durationTicks === greaseOneMinuteDurationTicks
        ? Number(activeEffect.expiresAt.durationTicks)
        : 0,
    affectedTargetOutcomeCount: input.affectedTargetOutcomeCount,
    failedTargetProne: greaseTargetProne(activeState, greaseFailedTargetId),
    succeededTargetProne: greaseTargetProne(
      activeState,
      greaseSuccessfulTargetId,
    ),
    mismatchedAffectedTargetRejected:
      input.mismatchedAffectedTargetRejected,
    slotExpended: greaseCasterSlotExpended(activeState),
  };
}

function greaseActiveEffects(
  state: BattleState,
): readonly GreaseGroundHazardEffect[] {
  return greaseCombatant(state, casterId).activeEffects.filter(
    (effect): effect is GreaseGroundHazardEffect =>
      effect.kind === "greaseGroundHazard" &&
      effect.sourceSpellId === greaseUnitId &&
      effect.sourceCombatantId === casterId &&
      effect.areaId === greaseAreaId,
  );
}

function greaseTargetProne(state: BattleState, targetId: CombatantId): boolean {
  return hasCondition(greaseCombatant(state, targetId).conditions, "prone");
}

function greaseCasterSlotExpended(state: BattleState): boolean {
  const caster = greaseCombatant(state, casterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected Grease caster to be a character.");
  }
  return (
    caster.origin.spellcasting?.spellSlots.some(
      (slot) => slot.spellLevel === 1 && slot.expended === 1,
    ) ?? false
  );
}

function greaseCombatant(state: BattleState, id: CombatantId) {
  const combatant = state.combatants.get(id);
  if (combatant === undefined) {
    throw new Error(`Expected Grease combatant ${id}.`);
  }
  return combatant;
}

function projectLevel1SpatialWitnessSelectedIdentityState(
  state: BattleState,
  retainedLightIdentityCount: number,
  faerieFireCreatureAttackRollMode: ProjectedAttackRollMode,
  faerieFireInvisibleCreatureAttackRollMode: ProjectedAttackRollMode,
  faerieFireObjectAttackRollMode: ProjectedAttackRollMode,
  featherFallProjection: FeatherFallProjection,
  fogCloudProjection: FogCloudProjection,
  greaseProjection: GreaseProjection,
  lastResult: Level1SpatialWitnessSelectedIdentityProjection["lastResult"],
): Level1SpatialWitnessSelectedIdentityProjection {
  const snapshot = snapshotBattle(state);
  const emitters = selectedLightEmitters(state, lastResult);
  const projectedIllumination = battleIlluminationFromLightEmitters(
    snapshot.lightEmitters,
    matchingProjectionFacts(state, lastResult),
  );
  const mismatchedWitnessIllumination = battleIlluminationFromLightEmitters(
    snapshot.lightEmitters,
    mismatchedProjectionFacts(state, lastResult),
  );
  return {
    lightEmitterCount: emitters.length,
    dimLightEmitterCount: emitters.filter(
      (emitter) =>
        emitter.emission.kind === "dim" &&
        emitter.emission.radiusFeet === dimLightRadiusFeet(lastResult),
    ).length,
    retainedLightIdentityCount,
    faerieFireOutlinedCreatureCount: faerieFireOutlinedCreatureCount(state),
    faerieFireOutlinedObjectCount: faerieFireOutlinedObjectCount(state),
    faerieFireCreatureAttackRollMode,
    faerieFireInvisibleCreatureAttackRollMode,
    faerieFireObjectAttackRollMode,
    faerieFireTargetInvisible: faerieFireTargetInvisible(state, lastResult),
    faerieFireObjectInvisibleBenefitDenied:
      faerieFireObjectInvisibleBenefitDenied(state, lastResult),
    featherFallTriggerOffered: featherFallProjection.triggerOffered,
    featherFallUnwitnessedTriggerRejected:
      featherFallProjection.unwitnessedTriggerRejected,
    featherFallReactionSpent: featherFallProjection.reactionSpent,
    featherFallSlotExpended: featherFallProjection.slotExpended,
    featherFallMitigatedTargetCountBeforeLanding:
      featherFallProjection.mitigatedTargetCountBeforeLanding,
    featherFallLandedTargetDescentRateCapFeetPerRound:
      featherFallProjection.landedTargetDescentRateCapFeetPerRound,
    featherFallLandingFallDamagePrevented:
      featherFallProjection.landingFallDamagePrevented,
    featherFallLandingFallingPronePrevented:
      featherFallProjection.landingFallingPronePrevented,
    featherFallLandedTargetMitigationCleared:
      featherFallProjection.landedTargetMitigationCleared,
    featherFallOtherTargetStillMitigated:
      featherFallProjection.otherTargetStillMitigated,
    fogCloudAreaIdentityRetained: fogCloudProjection.areaIdentityRetained,
    fogCloudHeavilyObscuredZoneCount:
      fogCloudProjection.heavilyObscuredZoneCount,
    fogCloudRadiusFeet: fogCloudProjection.radiusFeet,
    fogCloudDurationTicks: fogCloudProjection.durationTicks,
    fogCloudStrongWindCommandOffered:
      fogCloudProjection.strongWindCommandOffered,
    fogCloudCleanupClearedEffect: fogCloudProjection.cleanupClearedEffect,
    fogCloudCleanupClearedZone: fogCloudProjection.cleanupClearedZone,
    fogCloudCleanupClearedConcentration:
      fogCloudProjection.cleanupClearedConcentration,
    fogCloudSlotExpended: fogCloudProjection.slotExpended,
    greaseAreaIdentityRetained: greaseProjection.areaIdentityRetained,
    greaseActiveHazardCount: greaseProjection.activeHazardCount,
    greaseDurationTicks: greaseProjection.durationTicks,
    greaseAffectedTargetOutcomeCount:
      greaseProjection.affectedTargetOutcomeCount,
    greaseFailedTargetProne: greaseProjection.failedTargetProne,
    greaseSucceededTargetProne: greaseProjection.succeededTargetProne,
    greaseMismatchedAffectedTargetRejected:
      greaseProjection.mismatchedAffectedTargetRejected,
    greaseSlotExpended: greaseProjection.slotExpended,
    projectedIllumination,
    ordinarySightObscurement: battleSightObscurement(projectedIllumination),
    darkvisionSightObscurement: battleSightObscurement(projectedIllumination, {
      kind: "darkvision",
      rangeFeet: darkvisionWitnessRangeFeet,
      distanceFeet: dimLightRadiusFeet(lastResult),
    }),
    mismatchedWitnessIllumination,
    obscurementZoneCount: battleObscurementZones(state).length,
    casterConcentrating: casterConcentratingOnSelectedUnit(state, lastResult),
    magicActionAvailable: canSpendAction(state.currentTurnResources, "magic"),
    bonusActionAvailable: canSpendBonusAction(state.currentTurnResources),
    lastResult,
  };
}

function selectedLightEmitters(
  state: BattleState,
  lastResult: Level1SpatialWitnessSelectedIdentityProjection["lastResult"],
): readonly SpellLightEmitter[] {
  if (lastResult === "dancingLightsMovableDimLight") {
    return dancingLightEmitters(state);
  }
  if (lastResult === "faerieFireOutlineAdvantageInvisibleDimLight") {
    return faerieFireEmitters(state);
  }
  return [];
}

function dimLightRadiusFeet(
  lastResult: Level1SpatialWitnessSelectedIdentityProjection["lastResult"],
) {
  return lastResult === "faerieFireOutlineAdvantageInvisibleDimLight"
    ? faerieFireDimLightRadiusFeet
    : dancingLightsDimLightRadiusFeet;
}

function casterConcentratingOnSelectedUnit(
  state: BattleState,
  lastResult: Level1SpatialWitnessSelectedIdentityProjection["lastResult"],
): boolean {
  if (lastResult === "init") {
    return false;
  }
  if (
    lastResult === "featherFallReactionMitigationLanding" ||
    lastResult === "fogCloudAreaIdentityObscurementStrongWindCleanup" ||
    lastResult === "greaseCastGroundHazardSavingThrows"
  ) {
    return false;
  }
  const sourceSpellId =
    lastResult === "faerieFireOutlineAdvantageInvisibleDimLight"
      ? faerieFireUnitId
      : dancingLightsUnitId;
  return (
    state.combatants.get(casterId)?.concentration?.sourceSpellId ===
    sourceSpellId
  );
}

function dancingLightEmitters(
  state: BattleState,
): readonly DancingLightEmitter[] {
  return snapshotBattle(state).lightEmitters.filter(
    (emitter): emitter is DancingLightEmitter =>
      emitter.kind === "spellLightEmitter" &&
      emitter.sourceSpellId === dancingLightsUnitId &&
      emitter.sourceCombatantId === casterId &&
      emitter.attachment.kind === "dancingLight",
  );
}

function faerieFireEmitters(state: BattleState): readonly SpellLightEmitter[] {
  return snapshotBattle(state).lightEmitters.filter(
    (emitter): emitter is SpellLightEmitter =>
      emitter.kind === "spellLightEmitter" &&
      emitter.sourceSpellId === faerieFireUnitId &&
      emitter.sourceCombatantId === casterId,
  );
}

function matchingProjectionFacts(
  state: BattleState,
  lastResult: Level1SpatialWitnessSelectedIdentityProjection["lastResult"],
): readonly BattleLightEmitterProjectionFact[] {
  if (lastResult === "dancingLightsMovableDimLight") {
    return dancingLightsMatchingProjectionFacts(dancingLightEmitters(state));
  }
  if (lastResult === "faerieFireOutlineAdvantageInvisibleDimLight") {
    return [
      faerieFireCombatantProjectionFact(observerId),
      faerieFireObjectProjectionFact(faerieFireObjectId),
    ];
  }
  return [];
}

function mismatchedProjectionFacts(
  state: BattleState,
  lastResult: Level1SpatialWitnessSelectedIdentityProjection["lastResult"],
): readonly BattleLightEmitterProjectionFact[] {
  if (lastResult === "dancingLightsMovableDimLight") {
    return dancingLightsMismatchedProjectionFacts(dancingLightEmitters(state));
  }
  if (lastResult === "faerieFireOutlineAdvantageInvisibleDimLight") {
    return [
      faerieFireCombatantProjectionFact(
        combatantId("level1-faerie-fire-stale-combatant"),
      ),
      faerieFireObjectProjectionFact(
        battleObjectId("level1-faerie-fire-stale-object"),
      ),
    ];
  }
  return [];
}

function dancingLightsMatchingProjectionFacts(
  emitters: readonly DancingLightEmitter[],
): readonly BattleLightEmitterProjectionFact[] {
  const firstEmitter = emitters[0];
  return firstEmitter === undefined
    ? []
    : [
        projectionFactForEmitter(
          firstEmitter,
          firstEmitter.attachment.positionId,
        ),
      ];
}

function dancingLightsMismatchedProjectionFacts(
  emitters: readonly DancingLightEmitter[],
): readonly BattleLightEmitterProjectionFact[] {
  const firstEmitter = emitters[0];
  return firstEmitter === undefined
    ? []
    : [
        projectionFactForEmitter(
          firstEmitter,
          battleTablePositionId("level1-dancing-lights-stale"),
        ),
      ];
}

function faerieFireCombatantProjectionFact(
  combatantId: CombatantId,
): BattleLightEmitterProjectionFact {
  return {
    kind: "combatant",
    combatantId,
    distanceFeet: faerieFireDimLightRadiusFeet,
  };
}

function faerieFireObjectProjectionFact(
  objectId: BattleObjectId,
): BattleLightEmitterProjectionFact {
  return {
    kind: "object",
    objectId,
    distanceFeet: faerieFireDimLightRadiusFeet,
    opaqueCover: true,
  };
}

function projectionFactForEmitter(
  emitter: DancingLightEmitter,
  positionId: DancingLightAttachment["positionId"],
): BattleLightEmitterProjectionFact {
  return {
    kind: "dancingLight",
    lightId: emitter.attachment.lightId,
    positionId,
    form: emitter.attachment.form,
    distanceFeet: dancingLightsDimLightRadiusFeet,
  };
}

function faerieFireOutlinedCreatureCount(state: BattleState): number {
  return [...state.combatants.values()].reduce(
    (count, combatant) =>
      count +
      combatant.activeEffects.filter(
        (effect) =>
          effect.kind === "faerieFireOutline" &&
          effect.sourceSpellId === faerieFireUnitId &&
          effect.sourceCombatantId === casterId,
      ).length,
    0,
  );
}

function faerieFireOutlinedObjectCount(state: BattleState): number {
  return state.objectOutlines.filter(
    (outline) =>
      outline.kind === "faerieFireObjectOutline" &&
      outline.sourceSpellId === faerieFireUnitId &&
      outline.sourceCombatantId === casterId,
  ).length;
}

function faerieFireTargetInvisible(
  state: BattleState,
  lastResult: Level1SpatialWitnessSelectedIdentityProjection["lastResult"],
): boolean {
  if (lastResult !== "faerieFireOutlineAdvantageInvisibleDimLight") {
    return false;
  }
  const target = state.combatants.get(observerId);
  if (target === undefined) {
    throw new Error("Expected Faerie Fire observer combatant.");
  }
  return hasCondition(target.conditions, "invisible");
}

function faerieFireObjectInvisibleBenefitDenied(
  state: BattleState,
  lastResult: Level1SpatialWitnessSelectedIdentityProjection["lastResult"],
): boolean {
  if (lastResult !== "faerieFireOutlineAdvantageInvisibleDimLight") {
    return false;
  }
  return objectInvisibleBenefitDenied(state, faerieFireObjectId);
}

function featherFallCombatant(state: BattleState, id: CombatantId) {
  const combatant = state.combatants.get(id);
  if (combatant === undefined) {
    throw new Error(`Expected Feather Fall combatant ${id}.`);
  }
  return combatant;
}

function featherFallCaster(state: BattleState) {
  return featherFallCombatant(state, casterId);
}

function featherFallCasterSlotExpended(state: BattleState): boolean {
  const caster = featherFallCaster(state);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected Feather Fall caster to be a character.");
  }
  return (
    caster.origin.spellcasting?.spellSlots.some(
      (slot) => slot.spellLevel === 1 && slot.expended === 1,
    ) ?? false
  );
}

function featherFallMitigationTargetCount(state: BattleState): number {
  return [featherFallFallingAllyId, featherFallOtherFallingAllyId].filter(
    (targetId) =>
      activeFeatherFallDescentRateCapFeetPerRound(
        featherFallCombatant(state, targetId),
      ) === FEATHER_FALL_DESCENT_RATE_CAP_FEET_PER_ROUND,
  ).length;
}

function retainedIdentityCount(
  beforeMove: readonly DancingLightEmitter[],
  afterMove: readonly DancingLightEmitter[],
): number {
  const beforeLightIds = new Set(
    beforeMove.map((emitter) => emitter.attachment.lightId),
  );
  return afterMove.filter((emitter) =>
    beforeLightIds.has(emitter.attachment.lightId),
  ).length;
}

function normalizeLevel1SpatialWitnessSelectedIdentityQuintState(
  raw: unknown,
): Level1SpatialWitnessSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    lightEmitterCount: numberFromQuintInt(
      state["qLightEmitterCount"],
      "qLightEmitterCount",
    ),
    dimLightEmitterCount: numberFromQuintInt(
      state["qDimLightEmitterCount"],
      "qDimLightEmitterCount",
    ),
    retainedLightIdentityCount: numberFromQuintInt(
      state["qRetainedLightIdentityCount"],
      "qRetainedLightIdentityCount",
    ),
    faerieFireOutlinedCreatureCount: numberFromQuintInt(
      state["qFaerieFireOutlinedCreatureCount"],
      "qFaerieFireOutlinedCreatureCount",
    ),
    faerieFireOutlinedObjectCount: numberFromQuintInt(
      state["qFaerieFireOutlinedObjectCount"],
      "qFaerieFireOutlinedObjectCount",
    ),
    faerieFireCreatureAttackRollMode: mbtAttackRollMode(
      state["qFaerieFireCreatureAttackRollMode"],
    ),
    faerieFireInvisibleCreatureAttackRollMode: mbtAttackRollMode(
      state["qFaerieFireInvisibleCreatureAttackRollMode"],
    ),
    faerieFireObjectAttackRollMode: mbtAttackRollMode(
      state["qFaerieFireObjectAttackRollMode"],
    ),
    faerieFireTargetInvisible: booleanField(
      state,
      "qFaerieFireTargetInvisible",
    ),
    faerieFireObjectInvisibleBenefitDenied: booleanField(
      state,
      "qFaerieFireObjectInvisibleBenefitDenied",
    ),
    featherFallTriggerOffered: booleanField(
      state,
      "qFeatherFallTriggerOffered",
    ),
    featherFallUnwitnessedTriggerRejected: booleanField(
      state,
      "qFeatherFallUnwitnessedTriggerRejected",
    ),
    featherFallReactionSpent: booleanField(state, "qFeatherFallReactionSpent"),
    featherFallSlotExpended: booleanField(state, "qFeatherFallSlotExpended"),
    featherFallMitigatedTargetCountBeforeLanding: numberFromQuintInt(
      state["qFeatherFallMitigatedTargetCountBeforeLanding"],
      "qFeatherFallMitigatedTargetCountBeforeLanding",
    ),
    featherFallLandedTargetDescentRateCapFeetPerRound: numberFromQuintInt(
      state["qFeatherFallLandedTargetDescentRateCapFeetPerRound"],
      "qFeatherFallLandedTargetDescentRateCapFeetPerRound",
    ),
    featherFallLandingFallDamagePrevented: booleanField(
      state,
      "qFeatherFallLandingFallDamagePrevented",
    ),
    featherFallLandingFallingPronePrevented: booleanField(
      state,
      "qFeatherFallLandingFallingPronePrevented",
    ),
    featherFallLandedTargetMitigationCleared: booleanField(
      state,
      "qFeatherFallLandedTargetMitigationCleared",
    ),
    featherFallOtherTargetStillMitigated: booleanField(
      state,
      "qFeatherFallOtherTargetStillMitigated",
    ),
    fogCloudAreaIdentityRetained: booleanField(
      state,
      "qFogCloudAreaIdentityRetained",
    ),
    fogCloudHeavilyObscuredZoneCount: numberFromQuintInt(
      state["qFogCloudHeavilyObscuredZoneCount"],
      "qFogCloudHeavilyObscuredZoneCount",
    ),
    fogCloudRadiusFeet: numberFromQuintInt(
      state["qFogCloudRadiusFeet"],
      "qFogCloudRadiusFeet",
    ),
    fogCloudDurationTicks: numberFromQuintInt(
      state["qFogCloudDurationTicks"],
      "qFogCloudDurationTicks",
    ),
    fogCloudStrongWindCommandOffered: booleanField(
      state,
      "qFogCloudStrongWindCommandOffered",
    ),
    fogCloudCleanupClearedEffect: booleanField(
      state,
      "qFogCloudCleanupClearedEffect",
    ),
    fogCloudCleanupClearedZone: booleanField(
      state,
      "qFogCloudCleanupClearedZone",
    ),
    fogCloudCleanupClearedConcentration: booleanField(
      state,
      "qFogCloudCleanupClearedConcentration",
    ),
    fogCloudSlotExpended: booleanField(state, "qFogCloudSlotExpended"),
    greaseAreaIdentityRetained: booleanField(
      state,
      "qGreaseAreaIdentityRetained",
    ),
    greaseActiveHazardCount: numberFromQuintInt(
      state["qGreaseActiveHazardCount"],
      "qGreaseActiveHazardCount",
    ),
    greaseDurationTicks: numberFromQuintInt(
      state["qGreaseDurationTicks"],
      "qGreaseDurationTicks",
    ),
    greaseAffectedTargetOutcomeCount: numberFromQuintInt(
      state["qGreaseAffectedTargetOutcomeCount"],
      "qGreaseAffectedTargetOutcomeCount",
    ),
    greaseFailedTargetProne: booleanField(
      state,
      "qGreaseFailedTargetProne",
    ),
    greaseSucceededTargetProne: booleanField(
      state,
      "qGreaseSucceededTargetProne",
    ),
    greaseMismatchedAffectedTargetRejected: booleanField(
      state,
      "qGreaseMismatchedAffectedTargetRejected",
    ),
    greaseSlotExpended: booleanField(state, "qGreaseSlotExpended"),
    projectedIllumination: mbtIllumination(state["qProjectedIllumination"]),
    ordinarySightObscurement: mbtSightObscurement(
      state["qOrdinarySightObscurement"],
    ),
    darkvisionSightObscurement: mbtSightObscurement(
      state["qDarkvisionSightObscurement"],
    ),
    mismatchedWitnessIllumination: mbtIllumination(
      state["qMismatchedWitnessIllumination"],
    ),
    obscurementZoneCount: numberFromQuintInt(
      state["qObscurementZoneCount"],
      "qObscurementZoneCount",
    ),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    magicActionAvailable: booleanField(state, "qMagicActionAvailable"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    lastResult: mbtLastResult(state["qLastResult"]),
  };
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function mbtAttackRollMode(raw: unknown): ProjectedAttackRollMode {
  if (isProjectedAttackRollMode(raw)) {
    return raw;
  }
  throw new Error(`Unexpected attack roll mode ${String(raw)}.`);
}

function isProjectedAttackRollMode(
  raw: unknown,
): raw is ProjectedAttackRollMode {
  return ATTACK_ROLL_MODES.some((mode) => mode === raw);
}

function mbtIllumination(raw: unknown): BattleIllumination {
  if (raw === "brightLight" || raw === "dimLight" || raw === "darkness") {
    return raw;
  }
  throw new Error(`Unexpected illumination ${String(raw)}.`);
}

function mbtSightObscurement(raw: unknown): BattleSightObscurement {
  if (
    raw === "unobscured" ||
    raw === "lightlyObscured" ||
    raw === "heavilyObscured"
  ) {
    return raw;
  }
  throw new Error(`Unexpected sight obscurement ${String(raw)}.`);
}

function mbtLastResult(
  raw: unknown,
): Level1SpatialWitnessSelectedIdentityProjection["lastResult"] {
  if (
    raw === "init" ||
    raw === "dancingLightsMovableDimLight" ||
    raw === "faerieFireOutlineAdvantageInvisibleDimLight" ||
    raw === "featherFallReactionMitigationLanding" ||
    raw === "fogCloudAreaIdentityObscurementStrongWindCleanup" ||
    raw === "greaseCastGroundHazardSavingThrows"
  ) {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const level1SpatialWitnessSelectedIdentityStateCheck = stateCheck(
  normalizeLevel1SpatialWitnessSelectedIdentityQuintState,
  (
    spec: Level1SpatialWitnessSelectedIdentityProjection,
    impl: Level1SpatialWitnessSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
