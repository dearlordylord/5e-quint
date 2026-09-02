export {
  battleId,
  battleObjectId,
  battleTablePositionId,
  combatantId,
  initiativeScore,
  isBattleAttackProcedureExecutionRef,
  isBattleProcedureExecutionRef,
  isBattleStatBlockProcedureExecutionRef,
  BattleId,
  BattleObjectId,
  BattleProcedureExecutionRef,
  BattleStatBlockProcedureExecutionRef,
  BattleTablePositionId,
  type CharacterId,
  CombatantId,
  type InitiativeScore,
} from "./identity.ts";
export {
  sameBattleSubject,
  type BattleMovementSpeedKind,
  type BattleReadyResponse,
  type BattleSubject,
} from "./battle-subjects.ts";
export {
  admitTableD20TestCircumstanceDecisions,
  battleD20TestCircumstanceRequests,
  battleHolesWithTableD20TestCircumstances,
  d20TestResolutionId,
  type BattleD20TestCircumstanceRequest,
  type D20TestResolutionId,
  type TableD20TestCircumstanceDecision,
  type TableD20TestCircumstanceSource,
} from "./d20-test-circumstance.ts";
export {
  battleRuntimeSessionFollows,
  isBattleRuntimeSession,
  type BattleRuntimeSession,
} from "./battle-runtime-context.ts";
export { battleAmmunitionStock } from "./battle-ammunition.ts";
export { scoreModifier } from "./battle-reducer/domain-helpers.ts";
export type {
  BattleInitializationIssueMessage,
  BattleStartInput,
  StartBattle,
} from "./battle-start-protocol.ts";
export {
  GRAPPLE_TARGET_REACH_FEET,
  HELP_ATTACK_TARGET_ADJACENCY_FEET,
  HIT_POINT_BUDGET_CONDITION_SHAKE_AWAKE_ADJACENCY_FEET,
  RANGED_ATTACK_ENEMY_PROXIMITY_FEET,
  SHOVE_TARGET_REACH_FEET,
} from "./battle-reducer/domain-constants.ts";
export { combatantEffectiveSize } from "./battle-reducer/druid-wild-shape.ts";
export {
  deriveOrdinaryMovementTableRouteFacts,
  type BattleOrdinaryMovementRouteOccupant,
} from "./battle-reducer/creature-space-table-route.ts";
export {
  opportunityAttackExecutionCandidates,
  opportunityAttackLeavesReach,
} from "./battle-reducer/movement-speed.ts";
export {
  opportunityAttackThreatEqual,
  opportunityAttackThreatIdentityEqual,
} from "./battle-reducer/opportunity-attack-equality.ts";
export { zeroHpLifecycleIsTerminal } from "./battle-reducer/creature-state-leaves.ts";
export { discoverBattleActs } from "./battle-act-composition.ts";
export {
  endBattleRuntimeTurn,
  resolveBattleRuntimeInterrupt,
  resolveBattleRuntimeSubject,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeTableD20TestResolutionResult,
} from "./battle-session-execution.ts";
export type {
  AttackTargetConstraint,
  AvailableBattleAct,
  BattleFill,
  BattleHole,
  BattleIllumination,
  BattleObjectDamageDisposition,
  BattleObjectDamageOutcome,
  BattleOpportunityAttackThreat,
  BattleCreatureSpaceTraversalMovementFact,
  BattleResolvedMovement,
  BattleTargetChoiceHole,
  BattleTargetSpatialFact,
  BattleStateInitIssue,
} from "./battle-state-execution.ts";
export type {
  AuthoredStatBlockBattleInitInput,
  BattleCreatureInit,
  CharacterBattleCreatureInit,
  CharacterBattleCreatureInitWeaponAttack,
  BattleUnitRef,
} from "./battle-init.ts";
export {
  battleAvailableDruidWildShapeKnownForms,
  characterBattleCreatureInitWeaponAttack,
  wildShapeKnownFormsIssueMessage,
} from "./battle-init.ts";
export {
  characterBattleResourceMaxPointsForExecutionFacts,
  characterBattleResourceMaxUsesForExecutionFacts,
  characterBattleResourceForUnit,
  characterBattleResourceSupportedForUnit,
  unitIsSupportedClassFeatureSpellFreeCastResource,
  type CharacterBattleBookOfShadowsPresence,
  type CharacterBattleBookOfShadowsSpellAccessInit,
  type CharacterBattleFeatureInit,
  type CharacterBattleFeaturePreparedSpellInit,
  type CharacterBattleInvocationSpellAccessInit,
  type CharacterBattleMetamagicInit,
  type CharacterBattleResourceInit,
  type CharacterBattleSpellAccessInit,
  type CharacterBattleSpellbookRitualSpellAccessInit,
  type CharacterBattleSpellListFact,
  type CharacterBattleSpellSlotState,
} from "./character-battle-resources.ts";
export {
  parseCharacterBattleClassLevels,
  type CharacterBattleClassLevelInit,
  type CharacterBattleClassLevels,
} from "./character-class-level.ts";
export type {
  CharacterBattleInvocationFeature,
  CharacterBattleLoadoutRef,
} from "./character-creature-execution-facts.ts";
export type {
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
  CharacterWeaponAttackDamageTypeChoices,
} from "./battle-action-options.ts";
export {
  INITIATIVE_PROFICIENCY_AND_SWAP_SUPPORT_PROFILE,
  battleUnitRefWithSupportProfiles,
  martialArtsAttackProjectionProfileForUnit,
  parseSupportedUnitFeatureProfile,
  passiveArmorClassBonusProfileForUnit,
  type BattleUnitSupportProfileSourceFacts,
} from "./unit-feature-support.ts";
export {
  admitCharacterWeaponExecutionWeapon,
  admitResolvedCharacterWeaponExecutionWeapon,
} from "./character-weapon-execution-admission.ts";
export { projectDruidWildShapeAtClassLevels } from "./procedure-admission/druid-wild-shape.ts";
export {
  admitResourceFeature,
  resourceFeatureExecutionFacts,
  type ResourceFeatureAdmission,
} from "./procedure-admission/resource-feature-admission.ts";
export { TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE } from "./unit-feature-execution-constants.ts";
export type { CharacterZeroHpLifecycleInit } from "./zero-hp-lifecycle.ts";
export type { BattleDruidWildShapeKnownForm } from "./druid-wild-shape-known-form-execution.ts";
export type { CharacterBattleResourceExecutionFacts } from "./character-battle-resource-execution.ts";
export type {
  StatBlockAttackDamageSelection,
  StatBlockDamageComponentNotation,
} from "./stat-block-attack-damage-selection.ts";
