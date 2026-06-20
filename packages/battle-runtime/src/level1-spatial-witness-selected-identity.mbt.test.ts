// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt level1-spatial-witness dancing_lights faerie_fire feather_fall fog_cloud grease jump light produce_flame thunderwave
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness dancing_lights doDancingLightsMovableDimLight
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness faerie_fire doFaerieFireOutlineAdvantageInvisibleDimLight
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness feather_fall doFeatherFallReactionMitigationLanding
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness fog_cloud doFogCloudAreaIdentityObscurementStrongWindCleanup
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness grease doGreaseCastGroundHazardSavingThrows doGreaseMovementAndTurnTriggers
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness jump doJumpMovementReplacementLandingWitness
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness light doLightObjectEmitterProjectionReplacementCleanup
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness produce_flame doProduceFlameHeldLightProjectionHurlCleanup
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness thunderwave doThunderwaveSavePushObjectsBoom
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE
import { Either } from "effect";

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
  elapsedTimeTicks,
  elapsedTimeTicksFromHours,
  elapsedTimeTicksFromMinutes,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  DieRollResult,
  Hp,
  type MovementFeet,
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
  battleAreaId,
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
  openCreatureFallsInterruptWindow,
  resolveBattleInterrupt,
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
  type BattleAreaId,
  type BattleLightEmitterProjectionFact,
  type BattleObscurementZone,
  type BattleObjectId,
  type BattleResolutionResult,
  type BattleRolledDiceFill,
  type BattleSightObscurement,
  type BattleSpellAreaChoice,
  type BattleSpellAreaOriginAnchor,
  type BattleState,
  type BattleSubject,
  type BattleTargetSpatialFact,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";

type Level1SpatialWitnessSelectedIdentityProjection = {
  readonly lightEmitterCount: number;
  readonly dimLightEmitterCount: number;
  readonly retainedLightIdentityCount: number;
  readonly lightObjectAdmitted: boolean;
  readonly lightInvalidObjectRejectionCount: number;
  readonly lightDurationTicks: number;
  readonly lightBrightProjectionIllumination: BattleIllumination;
  readonly lightOpaqueCoverIllumination: BattleIllumination;
  readonly lightRecastReplacedPriorEmitter: boolean;
  readonly lightDurationCleanupClearedEmitter: boolean;
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
  readonly greaseDifficultTerrainMovementCostFeet: number;
  readonly greaseMovementSpentFeet: number;
  readonly greaseMismatchedMovementAreaRejected: boolean;
  readonly greaseEntrySaveOffered: boolean;
  readonly greaseEntryFailedTargetProne: boolean;
  readonly greaseEntryMismatchedTargetRejected: boolean;
  readonly greaseEndTurnSaveOffered: boolean;
  readonly greaseEndTurnFailedTargetProne: boolean;
  readonly greaseEndTurnAdvancedToCaster: boolean;
  readonly greaseEndTurnMismatchedTargetRejected: boolean;
  readonly greaseSlotExpended: boolean;
  readonly jumpTargetEffectInstalled: boolean;
  readonly jumpMovementSpentFeet: number;
  readonly jumpUsedMarkerSet: boolean;
  readonly jumpSameTurnUnavailable: boolean;
  readonly jumpNextTargetTurnAvailable: boolean;
  readonly jumpMissingLandingFactRejected: boolean;
  readonly jumpFailedLandingProne: boolean;
  readonly jumpSlotExpended: boolean;
  readonly produceFlameHeldLightInstalled: boolean;
  readonly produceFlameDurationTicks: number;
  readonly produceFlameBrightProjectionIllumination: BattleIllumination;
  readonly produceFlameHurlOffered: boolean;
  readonly produceFlameHurlTargetDamaged: boolean;
  readonly produceFlameHurlCleanupClearedEmitter: boolean;
  readonly produceFlameDurationCleanupClearedEmitter: boolean;
  readonly thunderwaveAffectedTargetOutcomeCount: number;
  readonly thunderwaveFailedPushedTargetDamaged: boolean;
  readonly thunderwaveFailedBlockedTargetDamaged: boolean;
  readonly thunderwaveSucceededTargetHalfDamaged: boolean;
  readonly thunderwavePushedCreatureDispositionCount: number;
  readonly thunderwaveBlockedCreatureDispositionCount: number;
  readonly thunderwavePushedObjectDispositionCount: number;
  readonly thunderwaveBlockedObjectDispositionCount: number;
  readonly thunderwaveAudibleBoomMatched: boolean;
  readonly thunderwaveMissingAreaFactsRejected: boolean;
  readonly thunderwaveMismatchedBoomRejected: boolean;
  readonly thunderwaveSlotExpended: boolean;
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
    | "greaseCastGroundHazardSavingThrows"
    | "greaseMovementAndTurnTriggers"
    | "jumpMovementReplacementLandingWitness"
    | "lightObjectEmitterProjectionReplacementCleanup"
    | "produceFlameHeldLightProjectionHurlCleanup"
    | "thunderwaveSavePushObjectsBoom";
};
type Level1SpatialWitnessSelectedIdentityAction =
  | "doDancingLightsMovableDimLight"
  | "doFaerieFireOutlineAdvantageInvisibleDimLight"
  | "doFeatherFallReactionMitigationLanding"
  | "doFogCloudAreaIdentityObscurementStrongWindCleanup"
  | "doGreaseCastGroundHazardSavingThrows"
  | "doGreaseMovementAndTurnTriggers"
  | "doJumpMovementReplacementLandingWitness"
  | "doLightObjectEmitterProjectionReplacementCleanup"
  | "doProduceFlameHeldLightProjectionHurlCleanup"
  | "doThunderwaveSavePushObjectsBoom";
type ProjectedAttackRollMode = AttackRollMode;
const dancingLightsUnitId = "dancing_lights";
const faerieFireUnitId = "faerie_fire";
const featherFallUnitId = "feather_fall";
const fogCloudUnitId = "fog_cloud";
const greaseUnitId = "grease";
const jumpUnitId = "jump";
const lightUnitId = "light";
const produceFlameUnitId = "produce_flame";
const thunderwaveUnitId = "thunderwave";
const starryWispUnitId = "starry_wisp";
const level1SpatialWitnessSelectedUnitIds = [
  dancingLightsUnitId,
  faerieFireUnitId,
  featherFallUnitId,
  fogCloudUnitId,
  greaseUnitId,
  jumpUnitId,
  lightUnitId,
  produceFlameUnitId,
  thunderwaveUnitId,
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
  readonly actions: readonly Level1SpatialWitnessSelectedIdentityAction[];
  readonly expected: Level1SpatialWitnessSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "level1-spatial-witness";
  readonly unitId: Level1SpatialWitnessSelectedUnitId;
  readonly actions: readonly Level1SpatialWitnessSelectedIdentityAction[];
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
type MovementAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "move" }
  >;
};
type GreaseGroundHazardSaveAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "greaseGroundHazardSave";
    }
  >;
};
type JumpMovementReplacementAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "jumpMovementReplacement";
    }
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
type ObjectLightAttachment = Extract<
  SpellLightEmitter["attachment"],
  { readonly kind: "object" }
>;
type ObjectLightEmitter = SpellLightEmitter & {
  readonly attachment: ObjectLightAttachment;
};
type DancingLightAttachment = Extract<
  SpellLightEmitter["attachment"],
  { readonly kind: "dancingLight" }
>;
type DancingLightEmitter = SpellLightEmitter & {
  readonly attachment: DancingLightAttachment;
};
type CombatantLightAttachment = Extract<
  SpellLightEmitter["attachment"],
  { readonly kind: "combatant" }
>;
type CombatantLightEmitter = SpellLightEmitter & {
  readonly attachment: CombatantLightAttachment;
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
  readonly difficultTerrainMovementCostFeet: number;
  readonly movementSpentFeet: number;
  readonly mismatchedMovementAreaRejected: boolean;
  readonly entrySaveOffered: boolean;
  readonly entryFailedTargetProne: boolean;
  readonly entryMismatchedTargetRejected: boolean;
  readonly endTurnSaveOffered: boolean;
  readonly endTurnFailedTargetProne: boolean;
  readonly endTurnAdvancedToCaster: boolean;
  readonly endTurnMismatchedTargetRejected: boolean;
  readonly slotExpended: boolean;
};
type GreaseSavingThrowOutcome = {
  readonly targetId: CombatantId;
  readonly succeeded: boolean;
};
type JumpMovementReplacementEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "jumpMovementReplacement" }
>;
type JumpProjection = {
  readonly targetEffectInstalled: boolean;
  readonly movementSpentFeet: number;
  readonly usedMarkerSet: boolean;
  readonly sameTurnUnavailable: boolean;
  readonly nextTargetTurnAvailable: boolean;
  readonly missingLandingFactRejected: boolean;
  readonly failedLandingProne: boolean;
  readonly slotExpended: boolean;
};
type ProduceFlameProjection = {
  readonly heldLightInstalled: boolean;
  readonly durationTicks: number;
  readonly brightProjectionIllumination: BattleIllumination;
  readonly hurlOffered: boolean;
  readonly hurlTargetDamaged: boolean;
  readonly hurlCleanupClearedEmitter: boolean;
  readonly durationCleanupClearedEmitter: boolean;
};
type ThunderwaveAreaChoice = Extract<
  BattleSpellAreaChoice,
  { readonly kind: "thunderwaveArea" }
>;
type ThunderwavePushDisposition =
  ThunderwaveAreaChoice["creaturePushes"][number]["disposition"];
type ThunderwaveSavingThrowOutcome = {
  readonly targetId: CombatantId;
  readonly succeeded: boolean;
};
type ThunderwaveProjection = {
  readonly affectedTargetOutcomeCount: number;
  readonly failedPushedTargetDamaged: boolean;
  readonly failedBlockedTargetDamaged: boolean;
  readonly succeededTargetHalfDamaged: boolean;
  readonly pushedCreatureDispositionCount: number;
  readonly blockedCreatureDispositionCount: number;
  readonly pushedObjectDispositionCount: number;
  readonly blockedObjectDispositionCount: number;
  readonly audibleBoomMatched: boolean;
  readonly missingAreaFactsRejected: boolean;
  readonly mismatchedBoomRejected: boolean;
  readonly slotExpended: boolean;
};
type LightObjectTargetFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellObjectLightTarget" }
>;
type LightProjection = {
  readonly objectAdmitted: boolean;
  readonly invalidObjectRejectionCount: number;
  readonly durationTicks: number;
  readonly brightProjectionIllumination: BattleIllumination;
  readonly opaqueCoverIllumination: BattleIllumination;
  readonly recastReplacedPriorEmitter: boolean;
  readonly durationCleanupClearedEmitter: boolean;
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
const jumpTargetId = combatantId("level1-spatial-witness-jump-target");
const thunderwaveFailedPushedTargetId = combatantId(
  "level1-spatial-witness-thunderwave-failed-pushed-target",
);
const thunderwaveFailedBlockedTargetId = combatantId(
  "level1-spatial-witness-thunderwave-failed-blocked-target",
);
const thunderwaveSuccessfulTargetId = combatantId(
  "level1-spatial-witness-thunderwave-successful-target",
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
const fogCloudAreaId = battleAreaId("level1-fog-cloud-area");
const fogCloudLevelOneRadiusFeet = movementFeet(20);
const fogCloudOneHourDurationTicks = requireElapsedHours(1);
const greaseAreaId = battleAreaId("level1-grease-ground-area");
const staleGreaseAreaId = battleAreaId("level1-stale-grease-ground-area");
const greaseOneMinuteDurationTicks = requireElapsedMinutes(1);
const jumpOneMinuteDurationTicks = requireElapsedMinutes(1);
const lightOneHourDurationTicks = requireElapsedHours(1);
const lightExpiringDurationTicks = elapsedTimeTicks(1);
const produceFlameTenMinuteDurationTicks = requireElapsedMinutes(10);
const produceFlameExpiringDurationTicks = elapsedTimeTicks(1);
const greaseTotalMovementDistanceFeet = movementFeet(10);
const greaseDifficultTerrainDistanceFeet = movementFeet(5);
const greaseDifficultTerrainMovementCostFeet = movementFeet(
  Number(greaseTotalMovementDistanceFeet) +
    Number(greaseDifficultTerrainDistanceFeet),
);
const jumpMovementCostFeet = movementFeet(10);
const jumpMaxDistanceFeet = movementFeet(30);
const lightBrightRadiusFeet = movementFeet(20);
const lightDimAdditionalFeet = movementFeet(20);
const lightDimProjectionDistanceFeet = movementFeet(
  Number(lightBrightRadiusFeet) + Number(lightDimAdditionalFeet),
);
const produceFlameBrightRadiusFeet = movementFeet(20);
const produceFlameDimAdditionalFeet = movementFeet(20);
const produceFlameDimProjectionDistanceFeet = movementFeet(
  Number(produceFlameBrightRadiusFeet) + Number(produceFlameDimAdditionalFeet),
);
const thunderwavePushDistanceFeet = movementFeet(10);
const thunderwaveAudibleRadiusFeet = movementFeet(300);
const lightObjectId = battleObjectId("level1-light-object");
const lightRecastObjectId = battleObjectId("level1-light-recast-object");
const lightStaleObjectId = battleObjectId("level1-light-stale-object");
const lightExpiringObjectId = battleObjectId("level1-light-expiring-object");
const thunderwavePushedObjectId = battleObjectId(
  "level1-thunderwave-pushed-object",
);
const thunderwaveBlockedObjectId = battleObjectId(
  "level1-thunderwave-blocked-object",
);

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
    actions: [
      "doGreaseCastGroundHazardSavingThrows",
      "doGreaseMovementAndTurnTriggers",
    ],
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
      {
        name: "active-hazard-movement-entry-and-end-turn-trigger-witnesses",
        actions: ["doGreaseMovementAndTurnTriggers"],
        expected: expectedProjection({
          greaseAreaIdentityRetained: true,
          greaseActiveHazardCount: 1,
          greaseDurationTicks: Number(greaseOneMinuteDurationTicks),
          greaseAffectedTargetOutcomeCount: 2,
          greaseFailedTargetProne: true,
          greaseSucceededTargetProne: false,
          greaseMismatchedAffectedTargetRejected: true,
          greaseDifficultTerrainMovementCostFeet: Number(
            greaseDifficultTerrainMovementCostFeet,
          ),
          greaseMovementSpentFeet: Number(
            greaseDifficultTerrainMovementCostFeet,
          ),
          greaseMismatchedMovementAreaRejected: true,
          greaseEntrySaveOffered: true,
          greaseEntryFailedTargetProne: true,
          greaseEntryMismatchedTargetRejected: true,
          greaseEndTurnSaveOffered: true,
          greaseEndTurnFailedTargetProne: true,
          greaseEndTurnAdvancedToCaster: true,
          greaseEndTurnMismatchedTargetRejected: true,
          greaseSlotExpended: true,
          magicActionAvailable: true,
          bonusActionAvailable: true,
          lastResult: "greaseMovementAndTurnTriggers",
        }),
      },
    ],
  },
  {
    taskId: "level1-spatial-witness",
    unitId: "jump",
    actions: ["doJumpMovementReplacementLandingWitness"],
    sequences: [
      {
        name: "target-effect-once-per-turn-movement-spend-and-landing-witness",
        actions: ["doJumpMovementReplacementLandingWitness"],
        expected: expectedProjection({
          jumpTargetEffectInstalled: true,
          jumpMovementSpentFeet: Number(jumpMovementCostFeet),
          jumpUsedMarkerSet: true,
          jumpSameTurnUnavailable: true,
          jumpNextTargetTurnAvailable: true,
          jumpMissingLandingFactRejected: true,
          jumpFailedLandingProne: true,
          jumpSlotExpended: true,
          magicActionAvailable: true,
          bonusActionAvailable: true,
          lastResult: "jumpMovementReplacementLandingWitness",
        }),
      },
    ],
  },
  {
    taskId: "level1-spatial-witness",
    unitId: "light",
    actions: ["doLightObjectEmitterProjectionReplacementCleanup"],
    sequences: [
      {
        name: "object-admission-emitter-projection-recast-and-cleanup",
        actions: ["doLightObjectEmitterProjectionReplacementCleanup"],
        expected: expectedProjection({
          lightEmitterCount: 1,
          lightObjectAdmitted: true,
          lightInvalidObjectRejectionCount: 3,
          lightDurationTicks: Number(lightOneHourDurationTicks),
          lightBrightProjectionIllumination: "brightLight",
          lightOpaqueCoverIllumination: "darkness",
          lightRecastReplacedPriorEmitter: true,
          lightDurationCleanupClearedEmitter: true,
          projectedIllumination: "dimLight",
          ordinarySightObscurement: "lightlyObscured",
          darkvisionSightObscurement: "unobscured",
          magicActionAvailable: false,
          bonusActionAvailable: true,
          lastResult: "lightObjectEmitterProjectionReplacementCleanup",
        }),
      },
    ],
  },
  {
    taskId: "level1-spatial-witness",
    unitId: "produce_flame",
    actions: ["doProduceFlameHeldLightProjectionHurlCleanup"],
    sequences: [
      {
        name: "held-flame-emitter-projection-hurl-and-cleanup",
        actions: ["doProduceFlameHeldLightProjectionHurlCleanup"],
        expected: expectedProjection({
          lightEmitterCount: 1,
          produceFlameHeldLightInstalled: true,
          produceFlameDurationTicks: Number(produceFlameTenMinuteDurationTicks),
          produceFlameBrightProjectionIllumination: "brightLight",
          produceFlameHurlOffered: true,
          produceFlameHurlTargetDamaged: true,
          produceFlameHurlCleanupClearedEmitter: true,
          produceFlameDurationCleanupClearedEmitter: true,
          projectedIllumination: "dimLight",
          ordinarySightObscurement: "lightlyObscured",
          darkvisionSightObscurement: "unobscured",
          magicActionAvailable: true,
          bonusActionAvailable: false,
          lastResult: "produceFlameHeldLightProjectionHurlCleanup",
        }),
      },
    ],
  },
  {
    taskId: "level1-spatial-witness",
    unitId: "thunderwave",
    actions: ["doThunderwaveSavePushObjectsBoom"],
    sequences: [
      {
        name: "damage-save-push-dispositions-unsecured-objects-and-boom",
        actions: ["doThunderwaveSavePushObjectsBoom"],
        expected: expectedProjection({
          thunderwaveAffectedTargetOutcomeCount: 3,
          thunderwaveFailedPushedTargetDamaged: true,
          thunderwaveFailedBlockedTargetDamaged: true,
          thunderwaveSucceededTargetHalfDamaged: true,
          thunderwavePushedCreatureDispositionCount: 1,
          thunderwaveBlockedCreatureDispositionCount: 1,
          thunderwavePushedObjectDispositionCount: 1,
          thunderwaveBlockedObjectDispositionCount: 1,
          thunderwaveAudibleBoomMatched: true,
          thunderwaveMissingAreaFactsRejected: true,
          thunderwaveMismatchedBoomRejected: true,
          thunderwaveSlotExpended: true,
          magicActionAvailable: false,
          bonusActionAvailable: true,
          lastResult: "thunderwaveSavePushObjectsBoom",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const LEVEL1_SPATIAL_WITNESS_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  DancingLightsMovableDimLight: "dancingLightsMovableDimLight",
  FaerieFireOutlineAdvantageInvisibleDimLight: "faerieFireOutlineAdvantageInvisibleDimLight",
  FeatherFallReactionMitigationLanding: "featherFallReactionMitigationLanding",
  FogCloudAreaIdentityObscurementStrongWindCleanup: "fogCloudAreaIdentityObscurementStrongWindCleanup",
  GreaseCastGroundHazardSavingThrows: "greaseCastGroundHazardSavingThrows",
  GreaseMovementAndTurnTriggers: "greaseMovementAndTurnTriggers",
  JumpMovementReplacementLandingWitness: "jumpMovementReplacementLandingWitness",
  LightObjectEmitterProjectionReplacementCleanup: "lightObjectEmitterProjectionReplacementCleanup",
  ProduceFlameHeldLightProjectionHurlCleanup: "produceFlameHeldLightProjectionHurlCleanup",
  ThunderwaveSavePushObjectsBoom: "thunderwaveSavePushObjectsBoom",
} as const satisfies Readonly<Record<string, | "init"
    | "dancingLightsMovableDimLight"
    | "faerieFireOutlineAdvantageInvisibleDimLight"
    | "featherFallReactionMitigationLanding"
    | "fogCloudAreaIdentityObscurementStrongWindCleanup"
    | "greaseCastGroundHazardSavingThrows"
    | "greaseMovementAndTurnTriggers"
    | "jumpMovementReplacementLandingWitness"
    | "lightObjectEmitterProjectionReplacementCleanup"
    | "produceFlameHeldLightProjectionHurlCleanup"
    | "thunderwaveSavePushObjectsBoom">>;

defineSelectedIdentityWitness({
  describeLabel: "Level 1 spatial witness selected identity MBT",
  taskId: "level1-spatial-witness",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: LEVEL1_SPATIAL_WITNESS_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: {
    lightEmitterCount: "int",
    dimLightEmitterCount: "int",
    retainedLightIdentityCount: "int",
    lightObjectAdmitted: "bool",
    lightInvalidObjectRejectionCount: "int",
    lightDurationTicks: "int",
    lightBrightProjectionIllumination: "str",
    lightOpaqueCoverIllumination: "str",
    lightRecastReplacedPriorEmitter: "bool",
    lightDurationCleanupClearedEmitter: "bool",
    faerieFireOutlinedCreatureCount: "int",
    faerieFireOutlinedObjectCount: "int",
    faerieFireCreatureAttackRollMode: "str",
    faerieFireInvisibleCreatureAttackRollMode: "str",
    faerieFireObjectAttackRollMode: "str",
    faerieFireTargetInvisible: "bool",
    faerieFireObjectInvisibleBenefitDenied: "bool",
    featherFallTriggerOffered: "bool",
    featherFallUnwitnessedTriggerRejected: "bool",
    featherFallReactionSpent: "bool",
    featherFallSlotExpended: "bool",
    featherFallMitigatedTargetCountBeforeLanding: "int",
    featherFallLandedTargetDescentRateCapFeetPerRound: "int",
    featherFallLandingFallDamagePrevented: "bool",
    featherFallLandingFallingPronePrevented: "bool",
    featherFallLandedTargetMitigationCleared: "bool",
    featherFallOtherTargetStillMitigated: "bool",
    fogCloudAreaIdentityRetained: "bool",
    fogCloudHeavilyObscuredZoneCount: "int",
    fogCloudRadiusFeet: "int",
    fogCloudDurationTicks: "int",
    fogCloudStrongWindCommandOffered: "bool",
    fogCloudCleanupClearedEffect: "bool",
    fogCloudCleanupClearedZone: "bool",
    fogCloudCleanupClearedConcentration: "bool",
    fogCloudSlotExpended: "bool",
    greaseAreaIdentityRetained: "bool",
    greaseActiveHazardCount: "int",
    greaseDurationTicks: "int",
    greaseAffectedTargetOutcomeCount: "int",
    greaseFailedTargetProne: "bool",
    greaseSucceededTargetProne: "bool",
    greaseMismatchedAffectedTargetRejected: "bool",
    greaseDifficultTerrainMovementCostFeet: "int",
    greaseMovementSpentFeet: "int",
    greaseMismatchedMovementAreaRejected: "bool",
    greaseEntrySaveOffered: "bool",
    greaseEntryFailedTargetProne: "bool",
    greaseEntryMismatchedTargetRejected: "bool",
    greaseEndTurnSaveOffered: "bool",
    greaseEndTurnFailedTargetProne: "bool",
    greaseEndTurnAdvancedToCaster: "bool",
    greaseEndTurnMismatchedTargetRejected: "bool",
    greaseSlotExpended: "bool",
    jumpTargetEffectInstalled: "bool",
    jumpMovementSpentFeet: "int",
    jumpUsedMarkerSet: "bool",
    jumpSameTurnUnavailable: "bool",
    jumpNextTargetTurnAvailable: "bool",
    jumpMissingLandingFactRejected: "bool",
    jumpFailedLandingProne: "bool",
    jumpSlotExpended: "bool",
    produceFlameHeldLightInstalled: "bool",
    produceFlameDurationTicks: "int",
    produceFlameBrightProjectionIllumination: "str",
    produceFlameHurlOffered: "bool",
    produceFlameHurlTargetDamaged: "bool",
    produceFlameHurlCleanupClearedEmitter: "bool",
    produceFlameDurationCleanupClearedEmitter: "bool",
    thunderwaveAffectedTargetOutcomeCount: "int",
    thunderwaveFailedPushedTargetDamaged: "bool",
    thunderwaveFailedBlockedTargetDamaged: "bool",
    thunderwaveSucceededTargetHalfDamaged: "bool",
    thunderwavePushedCreatureDispositionCount: "int",
    thunderwaveBlockedCreatureDispositionCount: "int",
    thunderwavePushedObjectDispositionCount: "int",
    thunderwaveBlockedObjectDispositionCount: "int",
    thunderwaveAudibleBoomMatched: "bool",
    thunderwaveMissingAreaFactsRejected: "bool",
    thunderwaveMismatchedBoomRejected: "bool",
    thunderwaveSlotExpended: "bool",
    projectedIllumination: "str",
    ordinarySightObscurement: "str",
    darkvisionSightObscurement: "str",
    mismatchedWitnessIllumination: "str",
    obscurementZoneCount: "int",
    casterConcentrating: "bool",
    magicActionAvailable: "bool",
    bonusActionAvailable: "bool",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: selectedUnitIdentityReplays.map((replay) => ({
    unitId: replay.unitId,
    procedures: replay.sequences.map((sequence) => {
      const actionName = singleReplayAction(
        replay.unitId,
        sequence.name,
        sequence.actions,
      );
      return {
        actionName,
        projectionAfter: sequence.expected,
        discover: () => replayLevel1SpatialWitnessAction(actionName),
      };
    }),
  })),
});

function singleReplayAction(
  unitId: Level1SpatialWitnessSelectedUnitId,
  sequenceName: string,
  actions: readonly Level1SpatialWitnessSelectedIdentityAction[],
): Level1SpatialWitnessSelectedIdentityAction {
  if (actions.length !== 1 || actions[0] === undefined) {
    throw new Error(
      `Expected single Level 1 spatial witness selected identity replay action for ${unitId}:${sequenceName}.`,
    );
  }
  return actions[0];
}

function replayLevel1SpatialWitnessAction(
  actionName: Level1SpatialWitnessSelectedIdentityAction,
): Level1SpatialWitnessSelectedIdentityProjection {
  const runtime = createLevel1SpatialWitnessSelectedIdentityRuntime();
  runtime[actionName]();
  return runtime.getState();
}

function createLevel1SpatialWitnessSelectedIdentityRuntime() {
    let state = dancingLightsBattle();
    let retainedLightIdentityCount = 0;
    let faerieFireCreatureAttackRollMode: ProjectedAttackRollMode = "normal";
    let faerieFireInvisibleCreatureAttackRollMode: ProjectedAttackRollMode =
      "normal";
    let faerieFireObjectAttackRollMode: ProjectedAttackRollMode = "normal";
    let featherFallProjection = emptyFeatherFallProjection();
    let fogCloudProjection = emptyFogCloudProjection();
    let greaseProjection = emptyGreaseProjection();
    let jumpProjection = emptyJumpProjection();
    let lightProjection = emptyLightProjection();
    let produceFlameProjection = emptyProduceFlameProjection();
    let thunderwaveProjection = emptyThunderwaveProjection();
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
      jumpProjection = emptyJumpProjection();
      lightProjection = emptyLightProjection();
      produceFlameProjection = emptyProduceFlameProjection();
      thunderwaveProjection = emptyThunderwaveProjection();
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
          unwitnessedTrigger.snapshot.pendingInterrupt === null;
        const awaitingReaction = openFeatherFallWindow(state, [
          featherFallTriggerFact(),
        ]);
        const triggerOffered =
          awaitingReaction.tag === "needsHoles" &&
          awaitingReaction.snapshot.pendingInterrupt?.trigger ===
            "creatureFalls";
        if (awaitingReaction.tag !== "needsHoles") {
          throw new Error(
            "Expected Feather Fall falling-trigger Reaction window.",
          );
        }

        const choice = featherFallReactionChoice(awaitingReaction);
        const resolved = resolveBattleInterrupt({
          state: awaitingReaction.state,
          fill: interruptDecisionFill(
            requireHole(awaitingReaction.holes, "interruptDecision"),
            {
              kind: "resolve",
              responderId: casterId,
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
            greaseSavingThrowOutcomeFill(savingThrow, greaseAffectedTargetIds, [
              { targetId: greaseFailedTargetId, succeeded: false },
              { targetId: casterId, succeeded: true },
            ]),
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
          throw new Error(`Expected Grease cast to resolve, got ${cast.tag}.`);
        }

        greaseProjection = projectGreaseReplay(cast.state, {
          mismatchedAffectedTargetRejected,
          affectedTargetOutcomeCount: savingThrowOutcomes.length,
        });
        state = cast.state;
        lastResult = "greaseCastGroundHazardSavingThrows";
      },
      doGreaseMovementAndTurnTriggers: () => {
        state = greaseBattle();
        retainedLightIdentityCount = 0;
        const act = greaseAct(state);
        const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
        const savingThrowOutcomes = greaseCastSavingThrowOutcomes();
        const mismatched = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            greaseSavingThrowOutcomeFill(savingThrow, greaseAffectedTargetIds, [
              { targetId: greaseFailedTargetId, succeeded: false },
              { targetId: casterId, succeeded: true },
            ]),
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
          throw new Error(`Expected Grease cast to resolve, got ${cast.tag}.`);
        }

        const movementAct = greaseMovementAct(cast.state);
        const movement = requireHole(movementAct.initialHoles, "movement");
        const staleMovement = resolveBattleSubject({
          state: cast.state,
          subject: movementAct.subject,
          fills: [
            greaseMovementFill(movement, {
              areaId: staleGreaseAreaId,
              movementCostFeet: greaseDifficultTerrainMovementCostFeet,
            }),
          ],
        });
        const mismatchedMovementAreaRejected = staleMovement.tag === "invalid";
        const moved = resolveBattleSubject({
          state: cast.state,
          subject: movementAct.subject,
          fills: [
            greaseMovementFill(movement, {
              areaId: greaseAreaId,
              movementCostFeet: greaseDifficultTerrainMovementCostFeet,
            }),
          ],
        });
        if (moved.tag !== "resolved") {
          throw new Error(
            `Expected Grease Difficult Terrain movement to resolve, got ${moved.tag}.`,
          );
        }

        const entryAct = greaseGroundHazardSaveAct(
          moved.state,
          casterId,
          "entersArea",
        );
        const entrySave = requireHole(
          entryAct.initialHoles,
          "savingThrowOutcome",
        );
        const mismatchedEntry = resolveBattleSubject({
          state: moved.state,
          subject: entryAct.subject,
          fills: [
            greaseGroundHazardSavingThrowOutcomeFill(entrySave, {
              targetId: greaseSuccessfulTargetId,
              succeeded: true,
            }),
          ],
        });
        const entryMismatchedTargetRejected =
          mismatchedEntry.tag === "invalid" &&
          mismatchedEntry.message ===
            "Grease ground-hazard Saving Throw outcome must match the triggering target.";
        const entryFailed = resolveBattleSubject({
          state: moved.state,
          subject: entryAct.subject,
          fills: [
            greaseGroundHazardSavingThrowOutcomeFill(entrySave, {
              targetId: casterId,
              succeeded: false,
            }),
          ],
        });
        if (entryFailed.tag !== "resolved") {
          throw new Error(
            `Expected Grease entry Saving Throw to resolve, got ${entryFailed.tag}.`,
          );
        }

        const failedTargetTurn = resolveEndTurn(
          entryFailed.state,
          casterId,
          "Grease caster after entry",
        );
        const successfulTargetTurn = resolveEndTurn(
          failedTargetTurn,
          greaseFailedTargetId,
          "Grease failed target",
        );
        const endTurnAct = greaseGroundHazardSaveAct(
          successfulTargetTurn,
          greaseSuccessfulTargetId,
          "endsTurnInArea",
        );
        const endTurnSave = requireHole(
          endTurnAct.initialHoles,
          "savingThrowOutcome",
        );
        const mismatchedEndTurn = resolveBattleSubject({
          state: successfulTargetTurn,
          subject: endTurnAct.subject,
          fills: [
            greaseGroundHazardSavingThrowOutcomeFill(endTurnSave, {
              targetId: casterId,
              succeeded: true,
            }),
          ],
        });
        const endTurnMismatchedTargetRejected =
          mismatchedEndTurn.tag === "invalid" &&
          mismatchedEndTurn.message ===
            "Grease ground-hazard Saving Throw outcome must match the triggering target.";
        const endTurnFailed = resolveBattleSubject({
          state: successfulTargetTurn,
          subject: endTurnAct.subject,
          fills: [
            greaseGroundHazardSavingThrowOutcomeFill(endTurnSave, {
              targetId: greaseSuccessfulTargetId,
              succeeded: false,
            }),
          ],
        });
        if (endTurnFailed.tag !== "resolved") {
          throw new Error(
            `Expected Grease end-turn Saving Throw to resolve, got ${endTurnFailed.tag}.`,
          );
        }

        greaseProjection = projectGreaseMovementAndTurnTriggerReplay({
          castState: cast.state,
          movedState: moved.state,
          entryState: entryFailed.state,
          endTurnState: endTurnFailed.state,
          affectedTargetOutcomeCount: savingThrowOutcomes.length,
          mismatchedAffectedTargetRejected,
          mismatchedMovementAreaRejected,
          entrySaveOffered: true,
          entryMismatchedTargetRejected,
          endTurnSaveOffered: true,
          endTurnMismatchedTargetRejected,
        });
        state = endTurnFailed.state;
        lastResult = "greaseMovementAndTurnTriggers";
      },
      doJumpMovementReplacementLandingWitness: () => {
        state = jumpBattle();
        retainedLightIdentityCount = 0;
        const castAct = jumpCastAct(state);
        const targetList = requireHole(castAct.initialHoles, "spellTargetList");
        const cast = resolveBattleSubject({
          state,
          subject: castAct.subject,
          fills: [jumpTargetListFill(targetList, [jumpTargetId])],
        });
        if (cast.tag !== "resolved") {
          throw new Error(`Expected Jump cast to resolve, got ${cast.tag}.`);
        }

        const targetEffectInstalled = jumpTargetEffectInstalled(cast.state);
        const targetTurn = resolveEndTurn(cast.state, casterId, "Jump caster");
        const jumpAct = jumpMovementReplacementAct(targetTurn, jumpTargetId);
        const movement = requireHole(jumpAct.initialHoles, "movement");
        const missingLandingFact = resolveBattleSubject({
          state: targetTurn,
          subject: jumpAct.subject,
          fills: [ordinaryMovementFill(movement, jumpMovementCostFeet)],
        });
        const missingLandingFactRejected =
          missingLandingFact.tag === "invalid" &&
          missingLandingFact.message ===
            "Jump movement replacement requires caller-supplied jump distance and landing facts.";
        const jumped = resolveBattleSubject({
          state: targetTurn,
          subject: jumpAct.subject,
          fills: [
            jumpMovementReplacementFill(movement, {
              difficultTerrainAcrobatics: "notRequired",
            }),
          ],
        });
        if (jumped.tag !== "resolved") {
          throw new Error(
            `Expected Jump movement replacement to resolve, got ${jumped.tag}.`,
          );
        }

        const nextCasterTurn = resolveEndTurn(
          jumped.state,
          jumpTargetId,
          "Jump target",
        );
        const nextTargetTurn = resolveEndTurn(
          nextCasterTurn,
          casterId,
          "Jump caster after target",
        );
        const nextTargetTurnAvailable =
          maybeJumpMovementReplacementAct(nextTargetTurn, jumpTargetId) !==
          undefined;
        const nextJumpAct = jumpMovementReplacementAct(
          nextTargetTurn,
          jumpTargetId,
        );
        const nextMovement = requireHole(nextJumpAct.initialHoles, "movement");
        const failedLanding = resolveBattleSubject({
          state: nextTargetTurn,
          subject: nextJumpAct.subject,
          fills: [
            jumpMovementReplacementFill(nextMovement, {
              difficultTerrainAcrobatics: "failed",
            }),
          ],
        });
        if (failedLanding.tag !== "resolved") {
          throw new Error(
            `Expected Jump failed landing witness to resolve, got ${failedLanding.tag}.`,
          );
        }

        jumpProjection = {
          targetEffectInstalled,
          movementSpentFeet: Number(
            jumpCombatant(jumped.state, jumpTargetId).movementSpentFeet,
          ),
          usedMarkerSet:
            jumpMovementReplacementEffect(jumped.state, jumpTargetId)
              ?.usedThisTurn === true,
          sameTurnUnavailable:
            maybeJumpMovementReplacementAct(jumped.state, jumpTargetId) ===
            undefined,
          nextTargetTurnAvailable,
          missingLandingFactRejected,
          failedLandingProne: hasCondition(
            jumpCombatant(failedLanding.state, jumpTargetId).conditions,
            "prone",
          ),
          slotExpended: jumpCasterSlotExpended(cast.state),
        };
        state = failedLanding.state;
        lastResult = "jumpMovementReplacementLandingWitness";
      },
      doLightObjectEmitterProjectionReplacementCleanup: () => {
        state = lightBattle();
        retainedLightIdentityCount = 0;
        const act = lightAct(state);
        const targetHole = requireHole(act.initialHoles, "objectTargetChoice");
        const tooLarge = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            lightObjectTargetFill(targetHole, {
              objectId: lightObjectId,
              size: "huge",
            }),
          ],
        });
        const wornBySomeoneElse = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            lightObjectTargetFill(targetHole, {
              objectId: lightObjectId,
              wornOrCarried: { kind: "someoneElse", relation: "worn" },
            }),
          ],
        });
        const carriedBySomeoneElse = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            lightObjectTargetFill(targetHole, {
              objectId: lightObjectId,
              wornOrCarried: { kind: "someoneElse", relation: "carried" },
            }),
          ],
        });
        const admitted = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            lightObjectTargetFill(targetHole, {
              objectId: lightObjectId,
              size: "large",
              wornOrCarried: { kind: "caster" },
            }),
          ],
        });
        if (admitted.tag !== "resolved") {
          throw new Error(
            `Expected Light cast to resolve, got ${admitted.tag}.`,
          );
        }

        const initialEmitter = lightObjectEmitter(
          admitted.state,
          lightObjectId,
        );
        const nextObserverTurn = resolveEndTurn(
          admitted.state,
          casterId,
          "Light caster",
        );
        const nextCasterTurn = resolveEndTurn(
          nextObserverTurn,
          observerId,
          "Light observer",
        );
        const recastAct = lightAct(nextCasterTurn);
        const recast = resolveBattleSubject({
          state: nextCasterTurn,
          subject: recastAct.subject,
          fills: [
            lightObjectTargetFill(
              requireHole(recastAct.initialHoles, "objectTargetChoice"),
              {
                objectId: lightRecastObjectId,
                size: "large",
              },
            ),
          ],
        });
        if (recast.tag !== "resolved") {
          throw new Error(
            `Expected Light recast to resolve, got ${recast.tag}.`,
          );
        }

        const cleanupFirstTurn = resolveEndTurn(
          lightOneRoundRemainingBattle(),
          casterId,
          "Light expiring caster",
        );
        const cleanupSecondTurn = resolveEndTurn(
          cleanupFirstTurn,
          observerId,
          "Light expiring observer",
        );
        lightProjection = {
          objectAdmitted: lightObjectAdmissionMatches(initialEmitter),
          invalidObjectRejectionCount: [
            tooLarge,
            wornBySomeoneElse,
            carriedBySomeoneElse,
          ].filter(lightObjectTargetRejected).length,
          durationTicks: lightObjectDurationTicks(initialEmitter),
          brightProjectionIllumination: battleIlluminationFromLightEmitters(
            recast.snapshot.lightEmitters,
            [
              lightObjectProjectionFact(
                lightRecastObjectId,
                lightBrightRadiusFeet,
                false,
              ),
            ],
          ),
          opaqueCoverIllumination: battleIlluminationFromLightEmitters(
            recast.snapshot.lightEmitters,
            [
              lightObjectProjectionFact(
                lightRecastObjectId,
                lightBrightRadiusFeet,
                true,
              ),
            ],
          ),
          recastReplacedPriorEmitter:
            lightObjectEmitters(recast.state).length === 1 &&
            lightObjectEmitter(recast.state, lightRecastObjectId) !==
              undefined &&
            lightObjectEmitter(recast.state, lightObjectId) === undefined,
          durationCleanupClearedEmitter:
            lightObjectEmitter(cleanupSecondTurn, lightExpiringObjectId) ===
            undefined,
        };
        state = recast.state;
        lastResult = "lightObjectEmitterProjectionReplacementCleanup";
      },
      doProduceFlameHeldLightProjectionHurlCleanup: () => {
        state = produceFlameBattle();
        retainedLightIdentityCount = 0;
        const act = produceFlameHeldLightAct(state);
        const lit = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [],
        });
        if (lit.tag !== "resolved") {
          throw new Error(
            `Expected Produce Flame held light to resolve, got ${lit.tag}.`,
          );
        }

        const hurlAct = produceFlameHurlAct(lit.state);
        const hurlOffered = hurlAct.initialHoles.some(
          (hole) => hole.kind === "targetChoice",
        );
        const target = requireHole(hurlAct.initialHoles, "targetChoice");
        const targetFill = spellTargetFill(
          target,
          produceFlameUnitId,
          casterId,
          observerId,
        );
        const attack = requireResultHole(
          resolveBattleSubject({
            state: lit.state,
            subject: hurlAct.subject,
            fills: [targetFill],
          }),
          "attackRoll",
        );
        const damage = requireResultHole(
          resolveBattleSubject({
            state: lit.state,
            subject: hurlAct.subject,
            fills: [
              targetFill,
              attackRollFill(attack, { total: 18, naturalD20: 12 }),
            ],
          }),
          "rolledDice",
        );
        const hurled = resolveBattleSubject({
          state: lit.state,
          subject: hurlAct.subject,
          fills: [
            targetFill,
            attackRollFill(attack, { total: 18, naturalD20: 12 }),
            damageRollFillWithGroups(damage, [[5]]),
          ],
        });
        if (hurled.tag !== "resolved") {
          throw new Error(
            `Expected Produce Flame hurl to resolve, got ${hurled.tag}.`,
          );
        }

        const cleanupFirstTurn = resolveEndTurn(
          produceFlameOneRoundRemainingBattle(),
          casterId,
          "Produce Flame expiring caster",
        );
        const cleanupSecondTurn = resolveEndTurn(
          cleanupFirstTurn,
          observerId,
          "Produce Flame expiring observer",
        );
        produceFlameProjection = {
          heldLightInstalled: produceFlameHeldLightMatches(
            produceFlameHeldLightEffect(lit.state),
          ),
          durationTicks: produceFlameHeldLightDurationTicks(
            produceFlameHeldLightEffect(lit.state),
          ),
          brightProjectionIllumination: battleIlluminationFromLightEmitters(
            lit.snapshot.lightEmitters,
            [
              produceFlameProjectionFact(
                casterId,
                produceFlameBrightRadiusFeet,
              ),
            ],
          ),
          hurlOffered,
          hurlTargetDamaged:
            produceFlameCombatant(hurled.state, observerId).hp === Hp(7),
          hurlCleanupClearedEmitter:
            produceFlameHeldLightEffect(hurled.state) === undefined &&
            produceFlameHeldLightEmitters(hurled.state).length === 0,
          durationCleanupClearedEmitter:
            produceFlameHeldLightEffect(cleanupSecondTurn) === undefined &&
            produceFlameHeldLightEmitters(cleanupSecondTurn).length === 0,
        };
        state = lit.state;
        lastResult = "produceFlameHeldLightProjectionHurlCleanup";
      },
      doThunderwaveSavePushObjectsBoom: () => {
        state = thunderwaveBattle();
        retainedLightIdentityCount = 0;
        const act = thunderwaveAct(state);
        const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
        const outcomes = thunderwaveSavingThrowOutcomes();
        const acceptedArea = thunderwaveAreaChoice();

        const missingAreaFacts = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            {
              kind: "savingThrowOutcome",
              holeId: savingThrow.holeId,
              value: { outcomes },
            },
          ],
        });
        const missingAreaFactsRejected =
          missingAreaFacts.tag === "invalid" &&
          missingAreaFacts.message ===
            "Spell saving throw outcomes require area facts.";

        const mismatchedBoom = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            thunderwaveSavingThrowOutcomeFill(
              savingThrow,
              outcomes,
              thunderwaveAreaChoice({
                audibleBoom: {
                  sound: "thunderous boom",
                  audibleRadiusFeet: movementFeet(100),
                },
              }),
            ),
          ],
        });
        const mismatchedBoomRejected =
          mismatchedBoom.tag === "invalid" &&
          mismatchedBoom.message ===
            "Thunderwave audible-boom fact must match the spell's thunderous boom within 300 feet.";

        const damage = requireResultHole(
          resolveBattleSubject({
            state,
            subject: act.subject,
            fills: [
              thunderwaveSavingThrowOutcomeFill(
                savingThrow,
                outcomes,
                acceptedArea,
              ),
            ],
          }),
          "rolledDice",
        );
        const resolved = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            thunderwaveSavingThrowOutcomeFill(
              savingThrow,
              outcomes,
              acceptedArea,
            ),
            damageRollFillWithGroups(damage, [[4, 4]]),
          ],
        });
        if (resolved.tag !== "resolved") {
          throw new Error(
            `Expected Thunderwave to resolve, got ${resolved.tag}.`,
          );
        }

        thunderwaveProjection = projectThunderwaveReplay(resolved.state, {
          area: acceptedArea,
          affectedTargetOutcomeCount: outcomes.length,
          missingAreaFactsRejected,
          mismatchedBoomRejected,
        });
        state = resolved.state;
        lastResult = "thunderwaveSavePushObjectsBoom";
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
          jumpProjection,
          lightProjection,
          produceFlameProjection,
          thunderwaveProjection,
          lastResult,
        ),
    };
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
    lightObjectAdmitted: false,
    lightInvalidObjectRejectionCount: 0,
    lightDurationTicks: 0,
    lightBrightProjectionIllumination: "darkness",
    lightOpaqueCoverIllumination: "darkness",
    lightRecastReplacedPriorEmitter: false,
    lightDurationCleanupClearedEmitter: false,
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
    greaseDifficultTerrainMovementCostFeet: 0,
    greaseMovementSpentFeet: 0,
    greaseMismatchedMovementAreaRejected: false,
    greaseEntrySaveOffered: false,
    greaseEntryFailedTargetProne: false,
    greaseEntryMismatchedTargetRejected: false,
    greaseEndTurnSaveOffered: false,
    greaseEndTurnFailedTargetProne: false,
    greaseEndTurnAdvancedToCaster: false,
    greaseEndTurnMismatchedTargetRejected: false,
    greaseSlotExpended: false,
    jumpTargetEffectInstalled: false,
    jumpMovementSpentFeet: 0,
    jumpUsedMarkerSet: false,
    jumpSameTurnUnavailable: false,
    jumpNextTargetTurnAvailable: false,
    jumpMissingLandingFactRejected: false,
    jumpFailedLandingProne: false,
    jumpSlotExpended: false,
    produceFlameHeldLightInstalled: false,
    produceFlameDurationTicks: 0,
    produceFlameBrightProjectionIllumination: "darkness",
    produceFlameHurlOffered: false,
    produceFlameHurlTargetDamaged: false,
    produceFlameHurlCleanupClearedEmitter: false,
    produceFlameDurationCleanupClearedEmitter: false,
    thunderwaveAffectedTargetOutcomeCount: 0,
    thunderwaveFailedPushedTargetDamaged: false,
    thunderwaveFailedBlockedTargetDamaged: false,
    thunderwaveSucceededTargetHalfDamaged: false,
    thunderwavePushedCreatureDispositionCount: 0,
    thunderwaveBlockedCreatureDispositionCount: 0,
    thunderwavePushedObjectDispositionCount: 0,
    thunderwaveBlockedObjectDispositionCount: 0,
    thunderwaveAudibleBoomMatched: false,
    thunderwaveMissingAreaFactsRejected: false,
    thunderwaveMismatchedBoomRejected: false,
    thunderwaveSlotExpended: false,
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
    difficultTerrainMovementCostFeet: 0,
    movementSpentFeet: 0,
    mismatchedMovementAreaRejected: false,
    entrySaveOffered: false,
    entryFailedTargetProne: false,
    entryMismatchedTargetRejected: false,
    endTurnSaveOffered: false,
    endTurnFailedTargetProne: false,
    endTurnAdvancedToCaster: false,
    endTurnMismatchedTargetRejected: false,
    slotExpended: false,
  };
}

function emptyJumpProjection(): JumpProjection {
  return {
    targetEffectInstalled: false,
    movementSpentFeet: 0,
    usedMarkerSet: false,
    sameTurnUnavailable: false,
    nextTargetTurnAvailable: false,
    missingLandingFactRejected: false,
    failedLandingProne: false,
    slotExpended: false,
  };
}

function emptyLightProjection(): LightProjection {
  return {
    objectAdmitted: false,
    invalidObjectRejectionCount: 0,
    durationTicks: 0,
    brightProjectionIllumination: "darkness",
    opaqueCoverIllumination: "darkness",
    recastReplacedPriorEmitter: false,
    durationCleanupClearedEmitter: false,
  };
}

function emptyProduceFlameProjection(): ProduceFlameProjection {
  return {
    heldLightInstalled: false,
    durationTicks: 0,
    brightProjectionIllumination: "darkness",
    hurlOffered: false,
    hurlTargetDamaged: false,
    hurlCleanupClearedEmitter: false,
    durationCleanupClearedEmitter: false,
  };
}

function emptyThunderwaveProjection(): ThunderwaveProjection {
  return {
    affectedTargetOutcomeCount: 0,
    failedPushedTargetDamaged: false,
    failedBlockedTargetDamaged: false,
    succeededTargetHalfDamaged: false,
    pushedCreatureDispositionCount: 0,
    blockedCreatureDispositionCount: 0,
    pushedObjectDispositionCount: 0,
    blockedObjectDispositionCount: 0,
    audibleBoomMatched: false,
    missingAreaFactsRejected: false,
    mismatchedBoomRejected: false,
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

function jumpBattle(): BattleState {
  const jump = spellRecord(jumpUnitId);
  const result = startBattle({
    battleId: battleId("level1-spatial-witness-selected-identity"),
    combatants: [
      spatialWitnessCreature({
        combatantId: casterId,
        displayName: "Jump caster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: "druid",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [jump],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      spatialWitnessCreature({
        combatantId: jumpTargetId,
        displayName: "Jump willing target",
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

function lightBattle(): BattleState {
  const light = spellRecord(lightUnitId);
  const result = startBattle({
    battleId: battleId("level1-spatial-witness-selected-identity"),
    combatants: [
      spatialWitnessCreature({
        combatantId: casterId,
        displayName: "Light caster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [light],
          preparedSpells: [],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [],
        },
      }),
      spatialWitnessCreature({
        combatantId: observerId,
        displayName: "Light observer",
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

function lightOneRoundRemainingBattle(): BattleState {
  return {
    ...lightBattle(),
    lightEmitters: [
      lightObjectSpellEmitter({
        objectId: lightExpiringObjectId,
        durationTicks: lightExpiringDurationTicks,
      }),
    ],
  };
}

function produceFlameBattle(): BattleState {
  const produceFlame = spellRecord(produceFlameUnitId);
  const result = startBattle({
    battleId: battleId("level1-spatial-witness-selected-identity"),
    combatants: [
      spatialWitnessCreature({
        combatantId: casterId,
        displayName: "Produce Flame caster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: "druid",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [produceFlame],
          preparedSpells: [],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [],
        },
      }),
      spatialWitnessCreature({
        combatantId: observerId,
        displayName: "Produce Flame target",
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

function produceFlameOneRoundRemainingBattle(): BattleState {
  const battle = produceFlameBattle();
  const caster = produceFlameCombatant(battle, casterId);
  return {
    ...battle,
    combatants: new Map(battle.combatants).set(casterId, {
      ...caster,
      activeEffects: [
        ...caster.activeEffects,
        produceFlameHeldLightEffectValue(produceFlameExpiringDurationTicks),
      ],
    }),
  };
}

function thunderwaveBattle(): BattleState {
  const thunderwave = spellRecord(thunderwaveUnitId);
  const result = startBattle({
    battleId: battleId("level1-spatial-witness-selected-identity"),
    combatants: [
      spatialWitnessCreature({
        combatantId: casterId,
        displayName: "Thunderwave caster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: "druid",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [thunderwave],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      spatialWitnessCreature({
        combatantId: thunderwaveFailedPushedTargetId,
        displayName: "Thunderwave failed pushed target",
        initiative: 15,
        side: oppositionSide,
      }),
      spatialWitnessCreature({
        combatantId: thunderwaveFailedBlockedTargetId,
        displayName: "Thunderwave failed blocked target",
        initiative: 10,
        side: oppositionSide,
      }),
      spatialWitnessCreature({
        combatantId: thunderwaveSuccessfulTargetId,
        displayName: "Thunderwave successful target",
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
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
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

function greaseMovementAct(state: BattleState): MovementAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is MovementAct =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "move" &&
      candidate.subject.actorId === casterId,
  );
  if (act === undefined) {
    throw new Error("Expected Grease caster Movement command.");
  }
  return act;
}

function greaseGroundHazardSaveAct(
  state: BattleState,
  actorId: CombatantId,
  trigger: GreaseGroundHazardSaveAct["subject"]["trigger"],
): GreaseGroundHazardSaveAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is GreaseGroundHazardSaveAct =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "greaseGroundHazardSave" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.sourceCombatantId === casterId &&
      candidate.subject.sourceSpellId === greaseUnitId &&
      candidate.subject.areaId === greaseAreaId &&
      candidate.subject.trigger === trigger,
  );
  if (act === undefined) {
    throw new Error(`Expected Grease ground-hazard ${trigger} save command.`);
  }
  return act;
}

function jumpCastAct(state: BattleState): BonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === jumpUnitId &&
      candidate.subject.invocation.procedure === "jumpMovementReplacement",
  );
  if (act === undefined) {
    throw new Error("Expected Jump movement replacement Bonus Action spell.");
  }
  return act;
}

function lightAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === lightUnitId &&
      candidate.subject.invocation.procedure === "objectLight",
  );
  if (act === undefined) {
    throw new Error("Expected Light object-emitter action.");
  }
  return act;
}

function produceFlameHeldLightAct(state: BattleState): BonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === produceFlameUnitId &&
      candidate.subject.invocation.procedure === "heldLight",
  );
  if (act === undefined) {
    throw new Error("Expected Produce Flame held-light Bonus Action spell.");
  }
  return act;
}

function produceFlameHurlAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === produceFlameUnitId &&
      candidate.subject.invocation.procedure === "heldLightHurl",
  );
  if (act === undefined) {
    throw new Error("Expected Produce Flame hurl Magic Action spell.");
  }
  return act;
}

function thunderwaveAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === thunderwaveUnitId &&
      candidate.subject.invocation.procedure === "saveGatedDamage",
  );
  if (act === undefined) {
    throw new Error("Expected Thunderwave save-gated damage action.");
  }
  return act;
}

function jumpMovementReplacementAct(
  state: BattleState,
  actorId: CombatantId,
): JumpMovementReplacementAct {
  const act = maybeJumpMovementReplacementAct(state, actorId);
  if (act === undefined) {
    throw new Error("Expected Jump movement replacement command.");
  }
  return act;
}

function maybeJumpMovementReplacementAct(
  state: BattleState,
  actorId: CombatantId,
): JumpMovementReplacementAct | undefined {
  return discoverBattleActs(state).find(
    (candidate): candidate is JumpMovementReplacementAct =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "jumpMovementReplacement" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.sourceCombatantId === casterId &&
      candidate.subject.sourceSpellId === jumpUnitId,
  );
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

function thunderwaveSavingThrowOutcomes(): readonly ThunderwaveSavingThrowOutcome[] {
  return [
    { targetId: thunderwaveFailedPushedTargetId, succeeded: false },
    { targetId: thunderwaveFailedBlockedTargetId, succeeded: false },
    { targetId: thunderwaveSuccessfulTargetId, succeeded: true },
  ];
}

function thunderwaveSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly ThunderwaveSavingThrowOutcome[],
  area: ThunderwaveAreaChoice,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { area, outcomes },
  };
}

function thunderwaveAreaChoice(
  input: {
    readonly audibleBoom?: ThunderwaveAreaChoice["audibleBoom"];
  } = {},
): ThunderwaveAreaChoice {
  return {
    kind: "thunderwaveArea",
    originAnchorId: casterId,
    affectedTargetIds: thunderwaveSavingThrowOutcomes().map(
      (outcome) => outcome.targetId,
    ),
    creaturePushes: [
      {
        targetId: thunderwaveFailedPushedTargetId,
        disposition: thunderwavePushedDisposition(
          "level1-thunderwave-creature-destination",
        ),
      },
      {
        targetId: thunderwaveFailedBlockedTargetId,
        disposition: thunderwaveBlockedDisposition("blocked"),
      },
    ],
    unsecuredObjectPushes: [
      {
        objectId: thunderwavePushedObjectId,
        disposition: thunderwavePushedDisposition(
          "level1-thunderwave-object-destination",
        ),
      },
      {
        objectId: thunderwaveBlockedObjectId,
        disposition: thunderwaveBlockedDisposition("noLegalDestination"),
      },
    ],
    audibleBoom: {
      sound: "thunderous boom",
      audibleRadiusFeet: thunderwaveAudibleRadiusFeet,
    },
    ...(input.audibleBoom === undefined
      ? {}
      : { audibleBoom: input.audibleBoom }),
  };
}

function thunderwavePushedDisposition(
  destinationId: string,
): ThunderwavePushDisposition {
  return {
    kind: "pushed",
    distanceFeet: thunderwavePushDistanceFeet,
    destinationId: battleTablePositionId(destinationId),
    provokesOpportunityAttacks: false,
  };
}

function thunderwaveBlockedDisposition(
  reason: Extract<
    ThunderwavePushDisposition,
    { readonly kind: "blocked" }
  >["reason"],
): ThunderwavePushDisposition {
  return {
    kind: "blocked",
    distanceFeet: thunderwavePushDistanceFeet,
    reason,
    provokesOpportunityAttacks: false,
  };
}

function greaseMovementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  input: {
    readonly areaId: BattleAreaId;
    readonly movementCostFeet: MovementFeet;
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: input.movementCostFeet,
      provokedOpportunityAttacks: [],
      areaDifficultTerrain: {
        kind: "areaDifficultTerrain",
        sources: [
          {
            kind: "greaseGroundHazard",
            sourceCombatantId: casterId,
            sourceSpellId: spellRecord(greaseUnitId).id,
            areaId: input.areaId,
          },
        ],
        totalDistanceFeet: greaseTotalMovementDistanceFeet,
        difficultTerrainDistanceFeet: greaseDifficultTerrainDistanceFeet,
      },
    },
  };
}

function jumpTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.flatMap((targetId) => [
      {
        kind: "spellTarget" as const,
        casterId,
        targetId,
        spellId: jumpUnitId,
      },
      {
        kind: "spellTargetKnownWilling" as const,
        casterId,
        targetId,
        spellId: jumpUnitId,
      },
    ]),
  };
}

function ordinaryMovementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  movementCostFeet: MovementFeet,
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet,
      provokedOpportunityAttacks: [],
    },
  };
}

function jumpMovementReplacementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  input: {
    readonly difficultTerrainAcrobatics: NonNullable<
      Extract<
        BattleFill,
        { readonly kind: "movement" }
      >["value"]["jumpMovementReplacement"]
    >["landing"]["difficultTerrainAcrobatics"];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: jumpMovementCostFeet,
      provokedOpportunityAttacks: [],
      jumpMovementReplacement: {
        kind: "jumpMovementReplacement",
        distanceFeet: jumpMaxDistanceFeet,
        landing: {
          kind: "legalLanding",
          difficultTerrainAcrobatics: input.difficultTerrainAcrobatics,
        },
      },
    },
  };
}

function lightObjectTargetFill(
  hole: Extract<BattleHole, { readonly kind: "objectTargetChoice" }>,
  input: {
    readonly objectId: BattleObjectId;
    readonly size?: LightObjectTargetFact["size"];
    readonly wornOrCarried?: LightObjectTargetFact["wornOrCarried"];
  },
): Extract<BattleFill, { readonly kind: "objectTargetChoice" }> {
  return {
    kind: "objectTargetChoice",
    holeId: hole.holeId,
    value: input.objectId,
    spatialFacts: [
      {
        kind: "spellObjectLightTarget",
        casterId,
        objectId: input.objectId,
        spellId: lightUnitId,
        size: input.size ?? "medium",
        wornOrCarried: input.wornOrCarried ?? { kind: "nobody" },
      },
    ],
  };
}

function lightObjectProjectionFact(
  objectId: BattleObjectId,
  distanceFeet: MovementFeet,
  opaqueCover: boolean,
): BattleLightEmitterProjectionFact {
  return {
    kind: "object",
    objectId,
    distanceFeet,
    opaqueCover,
  };
}

function greaseGroundHazardSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcome: GreaseSavingThrowOutcome,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes: [outcome] },
  };
}

function openFeatherFallWindow(
  state: BattleState,
  reactionSpellTargetFacts: readonly BattleTargetSpatialFact[],
): BattleResolutionResult {
  return openCreatureFallsInterruptWindow({
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
  const choice = result.snapshot.pendingInterrupt?.choices.find(
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
  originAnchor: BattleSpellAreaOriginAnchor = { kind: "tableSelectedPoint" },
): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: hole.holeId,
    value: { kind: "fogCloudArea", areaId: fogCloudAreaId, originAnchor },
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

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: Level1SpatialWitnessCatalogSpellId,
  sourceCombatantId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: sourceCombatantId,
        targetId,
        spellId,
      },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: { readonly total: number; readonly naturalD20: number },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function damageRollFillWithGroups(
  hole: Pick<BattleHole, "kind" | "holeId">,
  groups: readonly (readonly number[])[],
): BattleRolledDiceFill {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: rolledDiceGroups(groups),
  };
}

function rolledDiceGroups(
  groups: readonly (readonly number[])[],
): BattleRolledDiceFill["value"] {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

function rolledDiceGroup(
  group: readonly number[],
): BattleRolledDiceFill["value"][number] {
  const [firstRoll, ...restRolls] = group;
  if (firstRoll === undefined) {
    throw new Error("Expected at least one die result.");
  }
  return {
    results: [DieRollResult(firstRoll), ...restRolls.map(DieRollResult)],
  };
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
  const activeZoneArea =
    activeZone?.area.kind === "pointOriginSphere" ? activeZone.area : undefined;
  const radiusMatches =
    activeEffect?.radiusFeet === fogCloudLevelOneRadiusFeet &&
    activeZoneArea?.radiusFeet === fogCloudLevelOneRadiusFeet;
  return {
    areaIdentityRetained:
      activeEffect?.areaId === fogCloudAreaId &&
      activeZoneArea?.areaId === fogCloudAreaId,
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
    activeEffect.expiresAt.kind !== "concentration" ||
    activeZone.expiresAt.kind !== "concentration" ||
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
    mismatchedAffectedTargetRejected: input.mismatchedAffectedTargetRejected,
    difficultTerrainMovementCostFeet: 0,
    movementSpentFeet: 0,
    mismatchedMovementAreaRejected: false,
    entrySaveOffered: false,
    entryFailedTargetProne: false,
    entryMismatchedTargetRejected: false,
    endTurnSaveOffered: false,
    endTurnFailedTargetProne: false,
    endTurnAdvancedToCaster: false,
    endTurnMismatchedTargetRejected: false,
    slotExpended: greaseCasterSlotExpended(activeState),
  };
}

function projectGreaseMovementAndTurnTriggerReplay(input: {
  readonly castState: BattleState;
  readonly movedState: BattleState;
  readonly entryState: BattleState;
  readonly endTurnState: BattleState;
  readonly affectedTargetOutcomeCount: number;
  readonly mismatchedAffectedTargetRejected: boolean;
  readonly mismatchedMovementAreaRejected: boolean;
  readonly entrySaveOffered: boolean;
  readonly entryMismatchedTargetRejected: boolean;
  readonly endTurnSaveOffered: boolean;
  readonly endTurnMismatchedTargetRejected: boolean;
}): GreaseProjection {
  const castProjection = projectGreaseReplay(input.castState, {
    affectedTargetOutcomeCount: input.affectedTargetOutcomeCount,
    mismatchedAffectedTargetRejected: input.mismatchedAffectedTargetRejected,
  });
  const movementSpentFeet = greaseCombatant(
    input.movedState,
    casterId,
  ).movementSpentFeet;
  return {
    ...castProjection,
    difficultTerrainMovementCostFeet: Number(
      greaseDifficultTerrainMovementCostFeet,
    ),
    movementSpentFeet: Number(movementSpentFeet),
    mismatchedMovementAreaRejected: input.mismatchedMovementAreaRejected,
    entrySaveOffered: input.entrySaveOffered,
    entryFailedTargetProne: greaseTargetProne(input.entryState, casterId),
    entryMismatchedTargetRejected: input.entryMismatchedTargetRejected,
    endTurnSaveOffered: input.endTurnSaveOffered,
    endTurnFailedTargetProne: greaseTargetProne(
      input.endTurnState,
      greaseSuccessfulTargetId,
    ),
    endTurnAdvancedToCaster:
      snapshotBattle(input.endTurnState).currentActorId === casterId,
    endTurnMismatchedTargetRejected: input.endTurnMismatchedTargetRejected,
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

function projectThunderwaveReplay(
  resolvedState: BattleState,
  input: {
    readonly area: ThunderwaveAreaChoice;
    readonly affectedTargetOutcomeCount: number;
    readonly missingAreaFactsRejected: boolean;
    readonly mismatchedBoomRejected: boolean;
  },
): ThunderwaveProjection {
  return {
    affectedTargetOutcomeCount: input.affectedTargetOutcomeCount,
    failedPushedTargetDamaged:
      thunderwaveCombatant(resolvedState, thunderwaveFailedPushedTargetId)
        .hp === Hp(4),
    failedBlockedTargetDamaged:
      thunderwaveCombatant(resolvedState, thunderwaveFailedBlockedTargetId)
        .hp === Hp(4),
    succeededTargetHalfDamaged:
      thunderwaveCombatant(resolvedState, thunderwaveSuccessfulTargetId).hp ===
      Hp(8),
    pushedCreatureDispositionCount: input.area.creaturePushes.filter(
      (push) => push.disposition.kind === "pushed",
    ).length,
    blockedCreatureDispositionCount: input.area.creaturePushes.filter(
      (push) => push.disposition.kind === "blocked",
    ).length,
    pushedObjectDispositionCount: input.area.unsecuredObjectPushes.filter(
      (push) => push.disposition.kind === "pushed",
    ).length,
    blockedObjectDispositionCount: input.area.unsecuredObjectPushes.filter(
      (push) => push.disposition.kind === "blocked",
    ).length,
    audibleBoomMatched:
      input.area.audibleBoom.sound === "thunderous boom" &&
      input.area.audibleBoom.audibleRadiusFeet === thunderwaveAudibleRadiusFeet,
    missingAreaFactsRejected: input.missingAreaFactsRejected,
    mismatchedBoomRejected: input.mismatchedBoomRejected,
    slotExpended: thunderwaveCasterSlotExpended(resolvedState),
  };
}

function thunderwaveCasterSlotExpended(state: BattleState): boolean {
  const caster = thunderwaveCombatant(state, casterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected Thunderwave caster to be a character.");
  }
  return (
    caster.origin.spellcasting?.spellSlots.some(
      (slot) => slot.spellLevel === 1 && slot.expended === 1,
    ) ?? false
  );
}

function thunderwaveCombatant(state: BattleState, id: CombatantId) {
  const combatant = state.combatants.get(id);
  if (combatant === undefined) {
    throw new Error(`Expected Thunderwave combatant ${id}.`);
  }
  return combatant;
}

function jumpMovementReplacementEffect(
  state: BattleState,
  id: CombatantId,
): JumpMovementReplacementEffect | undefined {
  return jumpCombatant(state, id).activeEffects.find(
    (effect): effect is JumpMovementReplacementEffect =>
      effect.kind === "jumpMovementReplacement" &&
      effect.sourceSpellId === jumpUnitId &&
      effect.sourceCombatantId === casterId,
  );
}

function jumpTargetEffectInstalled(state: BattleState): boolean {
  const effect = jumpMovementReplacementEffect(state, jumpTargetId);
  return (
    effect !== undefined &&
    effect.movementCostFeet === jumpMovementCostFeet &&
    effect.maxJumpDistanceFeet === jumpMaxDistanceFeet &&
    effect.expiresAt.durationTicks === jumpOneMinuteDurationTicks &&
    effect.usedThisTurn === false
  );
}

function jumpCasterSlotExpended(state: BattleState): boolean {
  const caster = jumpCombatant(state, casterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected Jump caster to be a character.");
  }
  return (
    caster.origin.spellcasting?.spellSlots.some(
      (slot) => slot.spellLevel === 1 && slot.expended === 1,
    ) ?? false
  );
}

function jumpCombatant(state: BattleState, id: CombatantId) {
  const combatant = state.combatants.get(id);
  if (combatant === undefined) {
    throw new Error(`Expected Jump combatant ${id}.`);
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
  jumpProjection: JumpProjection,
  lightProjection: LightProjection,
  produceFlameProjection: ProduceFlameProjection,
  thunderwaveProjection: ThunderwaveProjection,
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
    lightObjectAdmitted: lightProjection.objectAdmitted,
    lightInvalidObjectRejectionCount:
      lightProjection.invalidObjectRejectionCount,
    lightDurationTicks: lightProjection.durationTicks,
    lightBrightProjectionIllumination:
      lightProjection.brightProjectionIllumination,
    lightOpaqueCoverIllumination: lightProjection.opaqueCoverIllumination,
    lightRecastReplacedPriorEmitter: lightProjection.recastReplacedPriorEmitter,
    lightDurationCleanupClearedEmitter:
      lightProjection.durationCleanupClearedEmitter,
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
    greaseDifficultTerrainMovementCostFeet:
      greaseProjection.difficultTerrainMovementCostFeet,
    greaseMovementSpentFeet: greaseProjection.movementSpentFeet,
    greaseMismatchedMovementAreaRejected:
      greaseProjection.mismatchedMovementAreaRejected,
    greaseEntrySaveOffered: greaseProjection.entrySaveOffered,
    greaseEntryFailedTargetProne: greaseProjection.entryFailedTargetProne,
    greaseEntryMismatchedTargetRejected:
      greaseProjection.entryMismatchedTargetRejected,
    greaseEndTurnSaveOffered: greaseProjection.endTurnSaveOffered,
    greaseEndTurnFailedTargetProne: greaseProjection.endTurnFailedTargetProne,
    greaseEndTurnAdvancedToCaster: greaseProjection.endTurnAdvancedToCaster,
    greaseEndTurnMismatchedTargetRejected:
      greaseProjection.endTurnMismatchedTargetRejected,
    greaseSlotExpended: greaseProjection.slotExpended,
    jumpTargetEffectInstalled: jumpProjection.targetEffectInstalled,
    jumpMovementSpentFeet: jumpProjection.movementSpentFeet,
    jumpUsedMarkerSet: jumpProjection.usedMarkerSet,
    jumpSameTurnUnavailable: jumpProjection.sameTurnUnavailable,
    jumpNextTargetTurnAvailable: jumpProjection.nextTargetTurnAvailable,
    jumpMissingLandingFactRejected: jumpProjection.missingLandingFactRejected,
    jumpFailedLandingProne: jumpProjection.failedLandingProne,
    jumpSlotExpended: jumpProjection.slotExpended,
    produceFlameHeldLightInstalled: produceFlameProjection.heldLightInstalled,
    produceFlameDurationTicks: produceFlameProjection.durationTicks,
    produceFlameBrightProjectionIllumination:
      produceFlameProjection.brightProjectionIllumination,
    produceFlameHurlOffered: produceFlameProjection.hurlOffered,
    produceFlameHurlTargetDamaged: produceFlameProjection.hurlTargetDamaged,
    produceFlameHurlCleanupClearedEmitter:
      produceFlameProjection.hurlCleanupClearedEmitter,
    produceFlameDurationCleanupClearedEmitter:
      produceFlameProjection.durationCleanupClearedEmitter,
    thunderwaveAffectedTargetOutcomeCount:
      thunderwaveProjection.affectedTargetOutcomeCount,
    thunderwaveFailedPushedTargetDamaged:
      thunderwaveProjection.failedPushedTargetDamaged,
    thunderwaveFailedBlockedTargetDamaged:
      thunderwaveProjection.failedBlockedTargetDamaged,
    thunderwaveSucceededTargetHalfDamaged:
      thunderwaveProjection.succeededTargetHalfDamaged,
    thunderwavePushedCreatureDispositionCount:
      thunderwaveProjection.pushedCreatureDispositionCount,
    thunderwaveBlockedCreatureDispositionCount:
      thunderwaveProjection.blockedCreatureDispositionCount,
    thunderwavePushedObjectDispositionCount:
      thunderwaveProjection.pushedObjectDispositionCount,
    thunderwaveBlockedObjectDispositionCount:
      thunderwaveProjection.blockedObjectDispositionCount,
    thunderwaveAudibleBoomMatched: thunderwaveProjection.audibleBoomMatched,
    thunderwaveMissingAreaFactsRejected:
      thunderwaveProjection.missingAreaFactsRejected,
    thunderwaveMismatchedBoomRejected:
      thunderwaveProjection.mismatchedBoomRejected,
    thunderwaveSlotExpended: thunderwaveProjection.slotExpended,
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
  if (lastResult === "lightObjectEmitterProjectionReplacementCleanup") {
    return lightObjectEmitters(state);
  }
  if (lastResult === "produceFlameHeldLightProjectionHurlCleanup") {
    return produceFlameHeldLightEmitters(state);
  }
  return [];
}

function dimLightRadiusFeet(
  lastResult: Level1SpatialWitnessSelectedIdentityProjection["lastResult"],
) {
  if (lastResult === "lightObjectEmitterProjectionReplacementCleanup") {
    return lightDimProjectionDistanceFeet;
  }
  if (lastResult === "produceFlameHeldLightProjectionHurlCleanup") {
    return produceFlameDimProjectionDistanceFeet;
  }
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
    lastResult === "greaseCastGroundHazardSavingThrows" ||
    lastResult === "greaseMovementAndTurnTriggers" ||
    lastResult === "jumpMovementReplacementLandingWitness" ||
    lastResult === "lightObjectEmitterProjectionReplacementCleanup" ||
    lastResult === "produceFlameHeldLightProjectionHurlCleanup" ||
    lastResult === "thunderwaveSavePushObjectsBoom"
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

function lightObjectEmitters(
  state: BattleState,
): readonly ObjectLightEmitter[] {
  return snapshotBattle(state).lightEmitters.filter(
    (emitter): emitter is ObjectLightEmitter =>
      emitter.kind === "spellLightEmitter" &&
      emitter.sourceSpellId === lightUnitId &&
      emitter.sourceCombatantId === casterId &&
      emitter.attachment.kind === "object",
  );
}

function produceFlameHeldLightEmitters(
  state: BattleState,
): readonly CombatantLightEmitter[] {
  return snapshotBattle(state).lightEmitters.filter(
    (emitter): emitter is CombatantLightEmitter =>
      emitter.kind === "spellLightEmitter" &&
      emitter.sourceSpellId === produceFlameUnitId &&
      emitter.sourceCombatantId === casterId &&
      emitter.attachment.kind === "combatant" &&
      emitter.attachment.combatantId === casterId,
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
  if (lastResult === "lightObjectEmitterProjectionReplacementCleanup") {
    return [
      lightObjectProjectionFact(
        lightRecastObjectId,
        lightDimProjectionDistanceFeet,
        false,
      ),
    ];
  }
  if (lastResult === "produceFlameHeldLightProjectionHurlCleanup") {
    return [
      produceFlameProjectionFact(
        casterId,
        produceFlameDimProjectionDistanceFeet,
      ),
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
  if (lastResult === "lightObjectEmitterProjectionReplacementCleanup") {
    return [
      lightObjectProjectionFact(
        lightStaleObjectId,
        lightDimProjectionDistanceFeet,
        false,
      ),
    ];
  }
  if (lastResult === "produceFlameHeldLightProjectionHurlCleanup") {
    return [
      produceFlameProjectionFact(
        combatantId("level1-produce-flame-stale-combatant"),
        produceFlameDimProjectionDistanceFeet,
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

function produceFlameProjectionFact(
  combatantId: CombatantId,
  distanceFeet: MovementFeet,
): BattleLightEmitterProjectionFact {
  return {
    kind: "combatant",
    combatantId,
    distanceFeet,
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

function lightObjectEmitter(
  state: BattleState,
  objectId: BattleObjectId,
): ObjectLightEmitter | undefined {
  return lightObjectEmitters(state).find(
    (emitter) => emitter.attachment.objectId === objectId,
  );
}

function lightObjectAdmissionMatches(
  emitter: ObjectLightEmitter | undefined,
): boolean {
  return (
    emitter !== undefined &&
    emitter.attachment.objectId === lightObjectId &&
    emitter.emission.kind === "brightAndDim" &&
    emitter.emission.brightRadiusFeet === lightBrightRadiusFeet &&
    emitter.emission.dimAdditionalFeet === lightDimAdditionalFeet &&
    emitter.opaqueCoverInteraction.kind === "blocksEmission" &&
    lightObjectDurationTicks(emitter) === Number(lightOneHourDurationTicks)
  );
}

function lightObjectDurationTicks(
  emitter: ObjectLightEmitter | undefined,
): number {
  return emitter?.expiresAt.kind === "duration" &&
    emitter.expiresAt.durationTicks === lightOneHourDurationTicks
    ? Number(emitter.expiresAt.durationTicks)
    : 0;
}

function lightObjectTargetRejected(result: BattleResolutionResult): boolean {
  return result.tag === "invalid" && result.reason === "invalidFill";
}

function lightObjectSpellEmitter(input: {
  readonly objectId: BattleObjectId;
  readonly durationTicks: ElapsedTimeTicks;
}): ObjectLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceSpellId: lightUnitId,
    sourceCombatantId: casterId,
    attachment: {
      kind: "object",
      objectId: input.objectId,
    },
    emission: {
      kind: "brightAndDim",
      brightRadiusFeet: lightBrightRadiusFeet,
      dimAdditionalFeet: lightDimAdditionalFeet,
    },
    opaqueCoverInteraction: { kind: "blocksEmission" },
    expiresAt: {
      kind: "duration",
      durationTicks: input.durationTicks,
    },
  };
}

function produceFlameHeldLightEffect(
  state: BattleState,
): Extract<BattleActiveEffect, { readonly kind: "heldLight" }> | undefined {
  return produceFlameCombatant(state, casterId).activeEffects.find(
    (
      effect,
    ): effect is Extract<BattleActiveEffect, { readonly kind: "heldLight" }> =>
      effect.kind === "heldLight" &&
      effect.sourceSpellId === produceFlameUnitId &&
      effect.sourceCombatantId === casterId,
  );
}

function produceFlameHeldLightMatches(
  effect:
    | Extract<BattleActiveEffect, { readonly kind: "heldLight" }>
    | undefined,
): boolean {
  return (
    effect !== undefined &&
    effect.brightRadiusFeet === produceFlameBrightRadiusFeet &&
    effect.dimAdditionalFeet === produceFlameDimAdditionalFeet &&
    produceFlameHeldLightDurationTicks(effect) ===
      Number(produceFlameTenMinuteDurationTicks)
  );
}

function produceFlameHeldLightDurationTicks(
  effect:
    | Extract<BattleActiveEffect, { readonly kind: "heldLight" }>
    | undefined,
): number {
  return effect?.expiresAt.kind === "duration" &&
    effect.expiresAt.durationTicks === produceFlameTenMinuteDurationTicks
    ? Number(effect.expiresAt.durationTicks)
    : 0;
}

function produceFlameHeldLightEffectValue(
  durationTicks: ElapsedTimeTicks,
): Extract<BattleActiveEffect, { readonly kind: "heldLight" }> {
  return {
    kind: "heldLight",
    sourceSpellId: produceFlameUnitId,
    sourceCombatantId: casterId,
    brightRadiusFeet: produceFlameBrightRadiusFeet,
    dimAdditionalFeet: produceFlameDimAdditionalFeet,
    expiresAt: {
      kind: "duration",
      durationTicks,
    },
  };
}

function produceFlameCombatant(state: BattleState, id: CombatantId) {
  const combatant = state.combatants.get(id);
  if (combatant === undefined) {
    throw new Error(`Expected Produce Flame combatant ${id}.`);
  }
  return combatant;
}
