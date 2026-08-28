// Runtime codecs for battle reducer public payloads.
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-missed-spell-attack-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-damage-dice-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-acid-arrow-attack-timing
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.brutal-strike
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_SEEKING_SPELL_ATTACK_REROLL BATTLE.FEATURE.METAMAGIC_EMPOWERED_DAMAGE_DICE_REROLL
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// This module owns Effect Schema values for battle state execution.

import { ATTACK_ROLL_MODES } from "@dnd/shared-algebras/runtime-hole-algebra";
import { ArmorClassSchema as BattleArmorClassSchema } from "@dnd/shared-algebras/armor-class-algebra";
import { RETAINED_COMPANION_PROTOCOL_TAGS } from "@dnd/shared-algebras/companion-protocol-algebra";
import {
  AmmunitionKindSchema,
  STANDARD_ACTION_KINDS,
  type StandardActionKind,
} from "@dnd/shared/game-facts";
import {
  CONDITIONS as ALL_CONDITIONS,
  COVER_TYPES,
  ResourceCount,
} from "@dnd/shared/types";
import { BattleCreatureDisplayNameSchema } from "../battle-creature-display-name.ts";
import type { Ability, DamageType, Skill } from "@dnd/surface/surface/types";
import {
  CreatureAttackRollMechanicsSchema,
  CreatureRechargeMinimumRollSchema,
  DiceExprSchema,
  UnitRecordSchema,
} from "@dnd/surface/surface/schema";
import {
  BattleActiveEffectExpirationSchema,
  SpellMarkedDamageRiderSchema,
  SpellWeaponDamageRiderSchema,
} from "../active-effect/codecs.ts";
import {
  BATTLE_CUNNING_STRIKE_OPTION_SELECTION_IDS,
  CUNNING_STRIKE_END_TURN_COVER_DEGREES,
  MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
} from "../unit-feature-support.ts";
import { Match, Schema } from "effect";
import { SpellExecutionFactsSchema } from "./spell-execution-facts.ts";
import {
  UnitFeatureProcedureExecutionSchema,
  UnitSupportProcedureExecutionSchema,
} from "./procedure-execution-codecs.ts";
import { SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS } from "./battle-runtime-protocol.ts";
import { characterAttackExecutionRefsMatchLayout } from "../attack-execution.ts";
import {
  BATTLE_INTERRUPT_TRIGGERS,
  BATTLE_READIED_SPELL_TRIGGERS,
} from "../battle-interrupt-triggers.ts";
import {
  WILD_SHAPE_EFFECTIVE_LOADOUT_WORN_KINDS,
  WILD_SHAPE_FORM_LIMB_OBJECT_HANDLING_WITNESSES,
  type WildShapeLoadoutObjectRef,
} from "./wild-shape-equipment.ts";
import {
  BATTLE_MOVEMENT_SPEED_KINDS,
  BattleSubjectSchema,
  battleSubjectBoundExecutionReferences,
  battleSubjectProcedureRefs,
  BattleAttackExecutionAbilitySchema,
  BattleAttackExecutionSelectionSchema,
  BattleReadyResponseSnapshotSchema,
  BattleReadyResponseSchema,
  BattleInterruptAttackExecutionSelectionSchema,
  BattleInterruptSubjectSchema,
  ReadyTriggerDescription,
  SpellInvocationRefSchema,
} from "../battle-subjects.ts";
import {
  BattleAreaId,
  BattleActiveEffectExecutionRef,
  BattleAttackExecutionScopeRef,
  BattleAttackProcedureExecutionRef,
  BattleCharacterExecutionScopeRef,
  BattleDancingLightId,
  BattleId,
  BattleLineDirectionId,
  BattleObjectId,
  BattleResourcePoolExecutionRef,
  BattleStatBlockExecutionScopeRef,
  BattleStatBlockProcedureExecutionRef,
  BattleProcedureExecutionRef,
  BattleReplayStackDepth,
  battleActiveEffectExecutionRefBelongsToScope,
  battleProcedureExecutionRefBelongsToScope,
  battleCharacterExecutionScopeRefBelongsToBattle,
  battleCharacterExecutionScopeRefBelongsToCombatant,
  battleAttackExecutionScopeRefBelongsToBattle,
  battleAttackExecutionScopeRefBelongsToCombatant,
  battleResourcePoolExecutionRefBelongsToScope,
  battleStatBlockExecutionScopeRefBelongsToBattle,
  battleStatBlockExecutionScopeRefBelongsToCombatant,
  battleStatBlockExecutionScopeRefIsWellFormed,
  BattleSpellEffectOccurrenceId,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";
import type { BattleExecutionScopeRef } from "../identity.ts";
import { creatureAttackRollMechanicsAreSupported } from "../statblock-action-support.ts";
import { ATTACK_DAMAGE_ABILITY_MODIFIER_CHOICE_SELECTIONS } from "./attack-damage-ability-modifier-choice.ts";
import { ATTACK_DAMAGE_DIE_FLOOR_CHOICE_SELECTIONS } from "./attack-damage-die-floor-choice.ts";
import {
  BATTLE_ANTIMAGIC_FIELD_ONGOING_SPELL_EFFECT_SOURCE_KINDS,
  BATTLE_ATTACK_RANGE_BANDS,
  BLUR_ATTACK_ROLL_BYPASS_SENSES,
  COMMAND_OPTIONS,
  MIRROR_IMAGE_DUPLICATE_COUNTS,
  MIRROR_IMAGE_DUPLICATE_DIE_SIZE,
  MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST,
  MIRROR_IMAGE_UNAFFECTED_SENSES,
  OPEN_HAND_TECHNIQUE_DECISION_CHOICES,
  SELF_TRANSFORMATION_MODE_KINDS,
  SLOW_ACTIVE_PENALTIES_SOMATIC_FAILURE_PERCENT,
  THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS,
} from "./domain-constants.ts";
import { BattleDamageRelationshipQuestionIdSchema } from "./damage-relationship-question-id.ts";
import {
  AbilityModifier,
  AbilitySchema,
  AttackBonus,
  BATTLE_SURFACE_SKILLS,
  BattleThunderwaveAudibleBoomSchema,
  DamageAmount,
  DamageDieSizeSchema,
  DamageTypeSchema,
  DcSourceSchema,
  DifficultyClass,
  MovementFeet,
  MechanicalSupportedAttackActionOptionSchema,
  SpellSlotLevel,
  SupportedAttackActionOptionSchema,
} from "./codec-building-blocks.ts";
import { BattleSpellEffectLevel } from "./spells-effective-level.ts";
import {
  BRUTAL_STRIKE_EFFECT_DECISION_CHOICES,
  TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES,
} from "../unit-feature-support.ts";
import {
  ATTACK_PRESENTATION_JOIN_ISSUE_REASONS,
  type BattleFill,
  type BattleHole,
} from "../battle-state-execution.ts";
const BattleCompanionResolvedStatBlockIdSchema = Schema.NonEmptyTrimmedString;
const BattleCompanionDurableIdSchema = Schema.NonEmptyTrimmedString;
const BattleCompanionIdentitySchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("battleOnly") }),
  Schema.Struct({
    tag: Schema.Literal("retainedBetweenBattles"),
    durableCompanionId: BattleCompanionDurableIdSchema,
  }),
);
const BattleCompanionProtocolSchema = Schema.Struct({
  tag: Schema.Literal(...RETAINED_COMPANION_PROTOCOL_TAGS),
});
const FindFamiliarCreatureTypeOverrideSchema = Schema.Literal(
  "celestial",
  "fey",
  "fiend",
);
const BattleCompanionPlacementSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("unoccupiedSpaceWithinSpellRange"),
    positionId: Schema.optionalWith(BattleTablePositionId, { exact: true }),
  }),
  Schema.Struct({
    kind: Schema.Literal("unoccupiedSpaceWithin30Feet"),
    positionId: Schema.optionalWith(BattleTablePositionId, { exact: true }),
  }),
);
type BattleCompanionPlacementEncoded = Schema.Schema.Encoded<
  typeof BattleCompanionPlacementSchema
>;
const HpSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
  Schema.brand("NonNegativeInteger"),
  Schema.brand("Hp"),
);
const PositiveHpSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
  Schema.brand("NonNegativeInteger"),
  Schema.brand("Hp"),
  Schema.brand("PositiveInteger"),
);
const InitiativeScoreSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.brand("Integer"),
  Schema.brand("Initiative"),
  Schema.brand("InitiativeScore"),
);
const BattleCompanionHitPointsSchema = Schema.Struct({
  currentHp: PositiveHpSchema,
  tempHp: HpSchema,
});

type WeaponDamageDiceRollChoiceSelection = "first" | "second";

type WeaponDamageDiceRollChoiceFillEncoded = {
  readonly procedureRef: string;
  readonly selection: WeaponDamageDiceRollChoiceSelection;
  readonly candidates: readonly [
    { readonly results: readonly [number, ...number[]] },
    { readonly results: readonly [number, ...number[]] },
  ];
};
type AttackDamageDieFloorChoiceFillEncoded = {
  readonly procedureRef: string;
  readonly selection: (typeof ATTACK_DAMAGE_DIE_FLOOR_CHOICE_SELECTIONS)[number];
};
type AttackDamageAbilityModifierChoiceFillEncoded = {
  readonly procedureRef: string;
  readonly selection: (typeof ATTACK_DAMAGE_ABILITY_MODIFIER_CHOICE_SELECTIONS)[number];
};
const AttackDamageDieFloorChoiceSelectionSchema = Schema.Literal(
  ...ATTACK_DAMAGE_DIE_FLOOR_CHOICE_SELECTIONS,
);
const AttackDamageAbilityModifierChoiceSelectionSchema = Schema.Literal(
  ...ATTACK_DAMAGE_ABILITY_MODIFIER_CHOICE_SELECTIONS,
);

const OngoingFeatureExpirationSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("startOfTurn"),
    combatantId: Schema.String,
  }),
  Schema.Struct({
    kind: Schema.Literal("endOfTurn"),
    combatantId: Schema.String,
    round: Schema.Number,
  }),
);
const EndOfTurnOngoingFeatureExpirationSchema = Schema.Struct({
  kind: Schema.Literal("endOfTurn"),
  combatantId: Schema.String,
  round: Schema.Number,
});

export const ActiveOngoingFeatureOccurrenceSnapshotSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("turnBoundary"),
    expiresAt: OngoingFeatureExpirationSchema,
    sourceProcedureRef: BattleProcedureExecutionRef,
    source: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    kind: Schema.Literal("roundExtended"),
    expiresAt: EndOfTurnOngoingFeatureExpirationSchema,
    maxExpiresAt: EndOfTurnOngoingFeatureExpirationSchema,
    sourceProcedureRef: BattleProcedureExecutionRef,
    source: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    kind: Schema.Literal("fixedDuration"),
    expiresAt: EndOfTurnOngoingFeatureExpirationSchema,
    sourceProcedureRef: BattleProcedureExecutionRef,
    source: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
);

const BattleHoleIdSchema = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("HoleId"),
);
const BattleHoleInstanceKeySchema = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("HoleInstanceKey"),
);

const BattleHoleBaseSchema = {
  holeInstanceKey: BattleHoleInstanceKeySchema,
  holeId: BattleHoleIdSchema,
  label: Schema.String,
  spell: Schema.optionalWith(Schema.Never, { exact: true }),
  unit: Schema.optionalWith(Schema.Never, { exact: true }),
} as const;

const BattleBrutalStrikeForcefulBlowMovementFactSchema = Schema.Struct({
  kind: Schema.Literal("brutalStrikeForcefulBlowStraightTowardTarget"),
  targetId: CombatantId,
});

const BattleMovementHoleCommonSchema = {
  ...BattleHoleBaseSchema,
  kind: Schema.Literal("movement"),
  label: Schema.String,
  actorId: CombatantId,
  movementBudgetFeet: MovementFeet,
  speedKinds: Schema.Array(
    Schema.Struct({
      kind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
      movementBudgetFeet: MovementFeet,
    }),
  ),
} as const;

// Effect Schema infers branded ids as their encoded string representation;
// these local schemas brand objectId before runtime use.
const WildShapeArmorLoadoutObjectRefSchema = Schema.Struct({
  kind: Schema.Literal("armor"),
  objectId: BattleObjectId,
});
const WildShapeShieldLoadoutObjectRefSchema = Schema.Struct({
  kind: Schema.Literal("shield"),
  objectId: BattleObjectId,
});
const WildShapeMainWeaponLoadoutObjectRefSchema = Schema.Struct({
  kind: Schema.Literal("mainWeapon"),
  objectId: BattleObjectId,
});
const WildShapeOffHandWeaponLoadoutObjectRefSchema = Schema.Struct({
  kind: Schema.Literal("offHandWeapon"),
  objectId: BattleObjectId,
});

const WildShapeLoadoutObjectRefSchemaByKind = {
  armor: WildShapeArmorLoadoutObjectRefSchema,
  shield: WildShapeShieldLoadoutObjectRefSchema,
  mainWeapon: WildShapeMainWeaponLoadoutObjectRefSchema,
  offHandWeapon: WildShapeOffHandWeaponLoadoutObjectRefSchema,
} as const satisfies Record<
  WildShapeLoadoutObjectRef["kind"],
  Schema.Schema.AnyNoContext
>;

const WildShapeLoadoutObjectRefSchema = Schema.Union(
  ...Object.values(WildShapeLoadoutObjectRefSchemaByKind),
);

const WildShapeWornLoadoutObjectRefSchema = Schema.Union(
  ...WILD_SHAPE_EFFECTIVE_LOADOUT_WORN_KINDS.map(
    (kind) => WildShapeLoadoutObjectRefSchemaByKind[kind],
  ),
);

const WildShapeFallInActorSpaceWitnessSchema = Schema.Struct({
  kind: Schema.Literal("actorSpace"),
  positionId: BattleTablePositionId,
});

const WildShapeEquipmentDispositionChoiceSchema = Schema.Union(
  Schema.Struct({
    item: WildShapeLoadoutObjectRefSchema,
    disposition: Schema.Literal("falls"),
    fallInActorSpace: WildShapeFallInActorSpaceWitnessSchema,
  }),
  Schema.Struct({
    item: WildShapeLoadoutObjectRefSchema,
    disposition: Schema.Literal("merges"),
  }),
  Schema.Struct({
    item: WildShapeWornLoadoutObjectRefSchema,
    disposition: Schema.Literal("worn"),
    practicality: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("practicalToWear"),
      }),
      Schema.Struct({
        kind: Schema.Literal("notPracticalToWear"),
        fallback: Schema.Union(
          Schema.Struct({
            disposition: Schema.Literal("falls"),
            fallInActorSpace: WildShapeFallInActorSpaceWitnessSchema,
          }),
          Schema.Struct({
            disposition: Schema.Literal("merges"),
          }),
        ),
      }),
    ),
  }),
);

type WildShapeEquipmentDispositionChoiceEncoded = Schema.Schema.Encoded<
  typeof WildShapeEquipmentDispositionChoiceSchema
>;

const WildShapeFormLimbObjectHandlingWitnessSchema = Schema.Struct({
  kind: Schema.Literal(...WILD_SHAPE_FORM_LIMB_OBJECT_HANDLING_WITNESSES),
});

const BattleDancingLightCastPlacementSchema = Schema.Struct({
  positionId: BattleTablePositionId,
  distanceFromCasterFeet: MovementFeet,
  nearestSiblingDistanceFeet: Schema.optionalWith(MovementFeet, {
    exact: true,
  }),
});
const BattleDancingLightRepositionPlacementSchema = Schema.Struct({
  positionId: BattleTablePositionId,
  distanceFromCasterFeet: MovementFeet,
  nearestSiblingDistanceFeet: Schema.optionalWith(MovementFeet, {
    exact: true,
  }),
  lightId: BattleDancingLightId,
  moveDistanceFeet: MovementFeet,
});
const BattleDancingLightsPlacementValueSchema = Schema.Union(
  Schema.Struct({
    mode: Schema.Literal("cast"),
    form: Schema.Literal("separateLights"),
    lights: Schema.Array(BattleDancingLightCastPlacementSchema),
  }),
  Schema.Struct({
    mode: Schema.Literal("cast"),
    form: Schema.Literal("combinedMediumForm"),
    light: BattleDancingLightCastPlacementSchema,
  }),
  Schema.Struct({
    mode: Schema.Literal("reposition"),
    form: Schema.Literal("separateLights"),
    lights: Schema.Array(BattleDancingLightRepositionPlacementSchema),
  }),
  Schema.Struct({
    mode: Schema.Literal("reposition"),
    form: Schema.Literal("combinedMediumForm"),
    light: BattleDancingLightRepositionPlacementSchema,
  }),
);

const BattleSleepNonSleeperFactSchema = Schema.Struct({
  kind: Schema.Literal("doesNotSleep"),
  targetId: CombatantId,
});
const BattleThunderwavePushDispositionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("pushed"),
    distanceFeet: MovementFeet,
    destinationId: BattleTablePositionId,
    provokesOpportunityAttacks: Schema.Literal(false),
  }),
  Schema.Struct({
    kind: Schema.Literal("blocked"),
    distanceFeet: MovementFeet,
    reason: Schema.Literal("blocked", "noLegalDestination"),
    provokesOpportunityAttacks: Schema.Literal(false),
  }),
);
const BattleGustOfWindLinePushDispositionSchema =
  BattleThunderwavePushDispositionSchema;

const BattleSpellAreaOriginAnchorSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("tableSelectedPoint"),
  }),
  Schema.Struct({
    kind: Schema.Literal("combatant"),
    combatantId: CombatantId,
  }),
);

const BattleSpellAreaChoiceBaseSchema = {
  originAnchorId: CombatantId,
  affectedTargetIds: Schema.Array(CombatantId),
} as const;

const BattleObjectDamageDispositionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("hitPoints"),
    hitPoints: HpSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("hitPointsWithDamageThreshold"),
    hitPoints: HpSchema,
    damageThreshold: DamageAmount,
  }),
  Schema.Struct({
    kind: Schema.Literal("tableResolved"),
  }),
);

const BattleSpellAreaChoiceSchema = Schema.Union(
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.optionalWith(Schema.Never, { exact: true }),
    areaId: Schema.optionalWith(Schema.Never, { exact: true }),
    sleepNonSleeperFacts: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.optionalWith(Schema.Never, { exact: true }),
    areaId: Schema.optionalWith(Schema.Never, { exact: true }),
    sleepNonSleeperFacts: Schema.NonEmptyArray(BattleSleepNonSleeperFactSchema),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("faerieFireArea"),
    affectedObjectIds: Schema.Array(BattleObjectId),
    areaId: Schema.optionalWith(Schema.Never, { exact: true }),
    sleepNonSleeperFacts: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("hypnoticPatternArea"),
    cubeSideFeet: Schema.Literal(30),
    affectedCreatureWitnesses: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        inCube: Schema.Literal(true),
        canSeePattern: Schema.Literal(true),
      }),
    ),
    areaId: Schema.optionalWith(Schema.Never, { exact: true }),
    sleepNonSleeperFacts: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("slowArea"),
    cubeSideFeet: Schema.Literal(40),
    affectedCreatureWitnesses: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        inCube: Schema.Literal(true),
        chosenByCaster: Schema.Literal(true),
      }),
    ),
    areaId: Schema.optionalWith(Schema.Never, { exact: true }),
    sleepNonSleeperFacts: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("greaseGroundArea"),
    areaId: BattleAreaId,
    sleepNonSleeperFacts: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("gustOfWindLineArea"),
    areaId: BattleAreaId,
    directionId: BattleLineDirectionId,
    creaturePushes: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        disposition: BattleGustOfWindLinePushDispositionSchema,
      }),
    ),
    sleepNonSleeperFacts: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("fireballArea"),
    objectIgnitionFacts: Schema.Array(
      Schema.Struct({
        objectId: BattleObjectId,
        disposition: Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("flammableUnattended"),
          }),
          Schema.Struct({
            kind: Schema.Literal("notFlammable"),
          }),
          Schema.Struct({
            kind: Schema.Literal("wornOrCarried"),
          }),
        ),
      }),
    ),
    areaId: Schema.optionalWith(Schema.Never, { exact: true }),
    sleepNonSleeperFacts: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("shatterArea"),
    nonmagicalUnattendedObjectDamageFacts: Schema.Array(
      Schema.Struct({
        objectId: BattleObjectId,
        disposition: BattleObjectDamageDispositionSchema,
      }),
    ),
    areaId: Schema.optionalWith(Schema.Never, { exact: true }),
    sleepNonSleeperFacts: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("thunderwaveArea"),
    creaturePushes: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        disposition: BattleThunderwavePushDispositionSchema,
      }),
    ),
    unsecuredObjectPushes: Schema.Array(
      Schema.Struct({
        objectId: BattleObjectId,
        disposition: BattleThunderwavePushDispositionSchema,
      }),
    ),
    audibleBoom: BattleThunderwaveAudibleBoomSchema,
    areaId: Schema.optionalWith(Schema.Never, { exact: true }),
    sleepNonSleeperFacts: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
);

const BattleObjectIgnitionDispositionSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("flammableUnattended") }),
  Schema.Struct({ kind: Schema.Literal("notFlammable") }),
  Schema.Struct({ kind: Schema.Literal("wornOrCarried") }),
);

const BattleAttackObjectTargetSpatialFactSchema = Schema.Struct({
  kind: Schema.Literal("attackObjectTarget"),
  actorId: CombatantId,
  objectId: BattleObjectId,
  range: Schema.Union(
    Schema.Struct({ kind: Schema.Literal("meleeReach") }),
    Schema.Struct({
      kind: Schema.Literal("rangedRange"),
      band: Schema.Literal(...BATTLE_ATTACK_RANGE_BANDS),
      enemyWithin5FeetCanSeeAttacker: Schema.Boolean,
    }),
  ),
  attackerCanSeeObject: Schema.Boolean,
  cover: Schema.Literal(...COVER_TYPES),
  armorClass: BattleArmorClassSchema,
  damageDisposition: BattleObjectDamageDispositionSchema,
});
type BattleAttackObjectTargetSpatialFactEncoded = Schema.Schema.Encoded<
  typeof BattleAttackObjectTargetSpatialFactSchema
>;

const BattleTargetSpatialFactSchema = Schema.Union(
  BattleAttackObjectTargetSpatialFactSchema,
  Schema.Struct({
    kind: Schema.Literal("retaliationDamagerWithinFiveFeet"),
    damagedId: CombatantId,
    damageSourceId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("cleaveSecondTargetWithin5FeetOfFirstTarget"),
    attackerId: CombatantId,
    firstTargetId: CombatantId,
    secondTargetId: CombatantId,
  }),
  Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("weaponMasteryPushDisposition"),
      attackerId: CombatantId,
      targetId: CombatantId,
      procedureRef: BattleAttackProcedureExecutionRef,
      attackAbility: BattleAttackExecutionAbilitySchema,
      attackDamageType: DamageTypeSchema,
      attackName: Schema.optionalWith(Schema.Never, { exact: true }),
      disposition: BattleThunderwavePushDispositionSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("weaponMasteryPushDisposition"),
      attackerId: CombatantId,
      targetId: CombatantId,
      procedureRef: BattleStatBlockProcedureExecutionRef,
      attackAbility: Schema.optionalWith(Schema.Never, { exact: true }),
      attackDamageType: Schema.optionalWith(Schema.Never, { exact: true }),
      attackName: Schema.optionalWith(Schema.Never, { exact: true }),
      disposition: BattleThunderwavePushDispositionSchema,
    }),
  ),
  Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("attackTargetDistance"),
      actorId: CombatantId,
      targetId: CombatantId,
      procedureRef: BattleAttackProcedureExecutionRef,
      attackAbility: BattleAttackExecutionAbilitySchema,
      attackDamageType: DamageTypeSchema,
      attackName: Schema.optionalWith(Schema.Never, { exact: true }),
      distanceFeet: MovementFeet,
    }),
    Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("attackTargetDistance"),
        actorId: CombatantId,
        targetId: CombatantId,
        procedureRef: BattleStatBlockProcedureExecutionRef,
        attackAbility: Schema.optionalWith(Schema.Never, { exact: true }),
        attackDamageType: Schema.optionalWith(Schema.Never, { exact: true }),
        attackName: Schema.optionalWith(Schema.Never, { exact: true }),
        statBlockDamageNotation: Schema.optionalWith(Schema.Never, {
          exact: true,
        }),
        distanceFeet: MovementFeet,
      }),
      Schema.Struct({
        kind: Schema.Literal("attackTargetDistance"),
        actorId: CombatantId,
        targetId: CombatantId,
        procedureRef: BattleStatBlockProcedureExecutionRef,
        attackAbility: Schema.optionalWith(Schema.Never, { exact: true }),
        attackDamageType: Schema.optionalWith(Schema.Never, { exact: true }),
        attackName: Schema.optionalWith(Schema.Never, { exact: true }),
        statBlockDamageNotation: Schema.Literal("static"),
        distanceFeet: MovementFeet,
      }),
    ),
  ),
  Schema.Struct({
    kind: Schema.Literal("attackAttackerCannotSeeTarget"),
    attackerId: CombatantId,
    targetId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("attackTargetCannotSeeAttacker"),
    attackerId: CombatantId,
    targetId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("attackAttackerPerceivesBlurredTargetWithSense"),
    attackerId: CombatantId,
    targetId: CombatantId,
    sense: Schema.Literal(...BLUR_ATTACK_ROLL_BYPASS_SENSES),
  }),
  Schema.Struct({
    kind: Schema.Literal("attackAttackerUnaffectedByMirrorImageWithSense"),
    attackerId: CombatantId,
    targetId: CombatantId,
    sense: Schema.Literal(...MIRROR_IMAGE_UNAFFECTED_SENSES),
  }),
  Schema.Struct({
    kind: Schema.Literal("spellTarget"),
    casterId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
  }),
  Schema.Struct({
    kind: Schema.Literal("unitFeatureVisibleTargetWithinRange"),
    actorId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("findFamiliarTouchSpellTarget"),
    ownerId: CombatantId,
    familiarId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellTargetKnownWilling"),
    casterId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
  }),
  Schema.Struct({
    kind: Schema.Literal("heightenedStepOfTheWindCarryEligible"),
    carrierId: CombatantId,
    carriedCreatureId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("spiritualWeaponTargetWithinForceReach"),
    casterId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    forcePositionId: BattleTablePositionId,
    reachFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("wardingBondPairedWornPlatinumRings"),
    casterId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
  }),
  Schema.Struct({
    kind: Schema.Literal("wardingBondCreaturesDistance"),
    casterId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    distanceFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellObjectTarget"),
    casterId: CombatantId,
    objectId: BattleObjectId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
    armorClass: BattleArmorClassSchema,
    damageDisposition: BattleObjectDamageDispositionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellObjectIgnition"),
    casterId: CombatantId,
    objectId: BattleObjectId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    disposition: BattleObjectIgnitionDispositionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellObjectTargetSight"),
    casterId: CombatantId,
    objectId: BattleObjectId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    attackerCanSeeObject: Schema.Boolean,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellObjectLightTarget"),
    casterId: CombatantId,
    objectId: BattleObjectId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    size: Schema.Literal(
      "tiny",
      "small",
      "medium",
      "large",
      "huge",
      "gargantuan",
    ),
    wornOrCarried: Schema.Union(
      Schema.Struct({ kind: Schema.Literal("nobody") }),
      Schema.Struct({ kind: Schema.Literal("caster") }),
      Schema.Struct({
        kind: Schema.Literal("someoneElse"),
        relation: Schema.Literal("worn", "carried"),
      }),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("spellDistantObjectLightTarget"),
    casterId: CombatantId,
    objectId: BattleObjectId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
    size: Schema.Literal(
      "tiny",
      "small",
      "medium",
      "large",
      "huge",
      "gargantuan",
    ),
    wornOrCarried: Schema.Union(
      Schema.Struct({ kind: Schema.Literal("nobody") }),
      Schema.Struct({ kind: Schema.Literal("caster") }),
      Schema.Struct({
        kind: Schema.Literal("someoneElse"),
        relation: Schema.Literal("worn", "carried"),
      }),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("spellTouchedObjectTarget"),
    casterId: CombatantId,
    objectId: BattleObjectId,
    sourceProcedureRef: BattleProcedureExecutionRef,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellDistantTouchedObjectTarget"),
    casterId: CombatantId,
    objectId: BattleObjectId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellManufacturedMetalObjectTarget"),
    casterId: CombatantId,
    objectId: BattleObjectId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
    casterCanSeeObject: Schema.Literal(true),
  }),
  Schema.Struct({
    kind: Schema.Literal("spellObjectPhysicalContact"),
    sourceCombatantId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    objectId: BattleObjectId,
    targetId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellObjectWithinSpellRange"),
    sourceCombatantId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    objectId: BattleObjectId,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellObjectHoldingOrWearing"),
    sourceCombatantId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    objectId: BattleObjectId,
    targetId: CombatantId,
    relation: Schema.Literal("holding", "wearing"),
  }),
  Schema.Struct({
    kind: Schema.Literal("spellLeapTargetWithinRange"),
    previousTargetId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellTargetsInPointOriginSphere"),
    casterId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    areaId: BattleAreaId,
    radiusFeet: MovementFeet,
    targetIds: Schema.Array(CombatantId),
  }),
  Schema.Struct({
    kind: Schema.Literal("helpAttackTargetWithin5Feet"),
    helperId: CombatantId,
    targetEnemyId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("meleeRedirectTargetWithin5Feet"),
    sourceId: CombatantId,
    targetId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("rangedRedirectTargetWithin60FeetWithoutTotalCover"),
    sourceId: CombatantId,
    targetId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("bardicInspirationTargetWithinRange"),
    bardId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("bardicInspirationTargetCanHear"),
    bardId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
  }),
  Schema.Struct({
    kind: Schema.Literal("reactionRollOrDamageReductionTargetWithinRange"),
    reactorId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("retaliationDamagerWithinFiveFeet"),
    damagedId: CombatantId,
    damageSourceId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("magicActionHealingPoolTargetWithinRange"),
    actorId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("magicActionAreaSaveDamageHealingTargetsInSphere"),
    actorId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    originWithinRangeFeet: MovementFeet,
    radiusFeet: MovementFeet,
    targetIds: Schema.Array(CombatantId),
  }),
  Schema.Struct({
    kind: Schema.Literal("reactionSpellDamagerVisibleWithinRange"),
    reactorId: CombatantId,
    damageSourceId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal(
      "enemyZeroHitPointTemporaryHitPointsBeneficiaryWithinRange",
    ),
    beneficiaryId: CombatantId,
    damageSourceId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("featherFallTriggerSelfOrVisibleCreatureWithinRange"),
    reactorId: CombatantId,
    fallingCreatureId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("featherFallTargetFallingWithinRange"),
    casterId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("levitatedTargetWithinSpellRange"),
    sourceCombatantId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    targetId: CombatantId,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("counterspellTriggerCasterVisibleWithinRange"),
    reactorId: CombatantId,
    casterId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("grappleTargetWithinReach"),
    grapplerId: CombatantId,
    targetId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("shoveTargetWithinReach"),
    shoverId: CombatantId,
    targetId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellRestraintEscapeActorWithinTargetReach"),
    actorId: CombatantId,
    targetId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("sleepShakeAwakeActorWithin5Feet"),
    actorId: CombatantId,
    targetId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("hypnoticPatternShakeAwakeActorWithin5Feet"),
    actorId: CombatantId,
    targetId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("attackerAllyWithin5FeetOfTarget"),
    attackerId: CombatantId,
    targetId: CombatantId,
    allyId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("hordeBreakerSecondTargetEligible"),
    attackerId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    originalTargetId: CombatantId,
    secondTargetId: CombatantId,
  }),
);
type BattleTargetSpatialFactEncoded = Schema.Schema.Encoded<
  typeof BattleTargetSpatialFactSchema
>;
const BattleTargetSpatialFactsSchema = Schema.Array(
  BattleTargetSpatialFactSchema,
);
const BattleDamageRelationshipQuestionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("targetDamagedByCasterOrAlly"),
    questionId: BattleDamageRelationshipQuestionIdSchema,
    targetId: CombatantId,
    effectSourceId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("enemyZeroHitPointTemporaryHitPoints"),
    questionId: BattleDamageRelationshipQuestionIdSchema,
    beneficiaryId: CombatantId,
    targetId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
  }),
);
const BattleDamageRelationshipDecisionsSchema = Schema.NonEmptyArray(
  Schema.Struct({
    questionId: BattleDamageRelationshipQuestionIdSchema,
    answer: Schema.Boolean,
  }),
);
const BattleAttackRollRelationshipFactSchema = Schema.Struct({
  kind: Schema.Literal("attackRollTargetIsEnemy"),
  attackerId: CombatantId,
  targetId: CombatantId,
  targetIsEnemy: Schema.Boolean,
});
const BattleSavingThrowRelationshipFactSchema = Schema.Struct({
  kind: Schema.Literal("savingThrowTargetIsEnemy"),
  actorId: CombatantId,
  targetId: CombatantId,
  targetIsEnemy: Schema.Boolean,
});
const BattleSpellTargetListRelationshipFactSchema = Schema.Struct({
  kind: Schema.Literal("spellTargetIsHostileToCaster"),
  casterId: CombatantId,
  targetId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
  targetIsHostileToCaster: Schema.Boolean,
});
const BattleTargetChoiceRelationshipFactSchema = Schema.Union(
  BattleAttackRollRelationshipFactSchema,
  BattleSavingThrowRelationshipFactSchema,
);
const BattleAttackRollRelationshipFactsSchema = Schema.NonEmptyArray(
  BattleAttackRollRelationshipFactSchema,
);
const BattleSavingThrowRelationshipFactsSchema = Schema.NonEmptyArray(
  BattleSavingThrowRelationshipFactSchema,
);
const BattleTargetChoiceRelationshipFactsSchema = Schema.NonEmptyArray(
  BattleTargetChoiceRelationshipFactSchema,
);
const BattleSpellTargetListRelationshipFactsSchema = Schema.NonEmptyArray(
  BattleSpellTargetListRelationshipFactSchema,
);
const BattleTargetChoiceRelationshipFactRequestSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("attackRollTargetIsEnemy"),
    attackerId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("savingThrowTargetIsEnemy"),
    actorId: CombatantId,
  }),
);
const BattleAttackRollRelationshipFactRequestSchema = Schema.Struct({
  kind: Schema.Literal("attackRollTargetIsEnemy"),
  attackerId: CombatantId,
  targetId: CombatantId,
});
const BattleSpellTargetListRelationshipFactRequestSchema = Schema.Struct({
  kind: Schema.Literal("spellTargetIsHostileToCaster"),
  casterId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
});
const BattleSavingThrowRelationshipFactRequestSchema = Schema.Struct({
  kind: Schema.Literal("savingThrowTargetIsEnemy"),
  actorId: CombatantId,
});

const BattleObjectDamageOutcomeFieldsSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("hitPoints"),
    objectId: BattleObjectId,
    components: Schema.NonEmptyArray(
      Schema.Struct({
        damageType: DamageTypeSchema,
        rolledDamage: DamageAmount,
      }),
    ),
    rolledDamage: DamageAmount,
    damageAfterImmunities: DamageAmount,
    damageThreshold: Schema.NullOr(DamageAmount),
    effectiveDamage: DamageAmount,
    priorHitPoints: HpSchema,
    nextHitPoints: HpSchema,
    destroyed: Schema.Boolean,
  }),
  Schema.Struct({
    kind: Schema.Literal("tableResolved"),
    objectId: BattleObjectId,
    components: Schema.NonEmptyArray(
      Schema.Struct({
        damageType: DamageTypeSchema,
        rolledDamage: DamageAmount,
      }),
    ),
    rolledDamage: DamageAmount,
  }),
);

export const BattleObjectDamageOutcomeSchema =
  BattleObjectDamageOutcomeFieldsSchema.pipe(
    Schema.filter(battleObjectDamageOutcomeIsConsistent, {
      message: () =>
        "Object damage components, totals, Hit Point transition, and destruction state must agree.",
    }),
  );

function battleObjectDamageOutcomeIsConsistent(
  outcome: typeof BattleObjectDamageOutcomeFieldsSchema.Type,
): boolean {
  const rolledDamage = outcome.components.reduce(
    (total, component) => total + Number(component.rolledDamage),
    0,
  );
  if (Number(outcome.rolledDamage) !== rolledDamage) return false;
  if (outcome.kind === "tableResolved") return true;
  const damageAfterImmunities = outcome.components.reduce(
    (total, component) =>
      component.damageType === "poison" || component.damageType === "psychic"
        ? total
        : total + Number(component.rolledDamage),
    0,
  );
  const effectiveDamage = Number(outcome.effectiveDamage);
  const thresholdBlocksDamage =
    outcome.damageThreshold !== null &&
    damageAfterImmunities < Number(outcome.damageThreshold);
  const expectedEffectiveDamage = thresholdBlocksDamage
    ? 0
    : damageAfterImmunities;
  const nextHitPoints = Math.max(
    0,
    Number(outcome.priorHitPoints) - effectiveDamage,
  );
  return (
    Number(outcome.damageAfterImmunities) === damageAfterImmunities &&
    effectiveDamage === expectedEffectiveDamage &&
    Number(outcome.nextHitPoints) === nextHitPoints &&
    outcome.destroyed === (nextHitPoints === 0)
  );
}

export const BattleObjectIgnitionOutcomeSchema = Schema.Struct({
  kind: Schema.Literal("startsBurning"),
  objectId: BattleObjectId,
  sourceCombatantId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
});

export const BattleDroppedObjectOutcomeSchema = Schema.Struct({
  kind: Schema.Literal("objectDropped"),
  actorId: CombatantId,
  objectId: BattleObjectId,
  source: Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("spell"),
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
    }),
    Schema.Struct({
      kind: Schema.Literal("companionDisappearance"),
      ownerId: CombatantId,
      companionId: CombatantId,
    }),
    Schema.Struct({
      kind: Schema.Literal("druidWildShape"),
      procedureRef: BattleProcedureExecutionRef,
      formExecutionRef: BattleStatBlockExecutionScopeRef,
    }),
  ),
});

export const BattleShovePushOutcomeSchema = Schema.Struct({
  targetId: CombatantId,
  disposition: Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("pushed"),
      distanceFeet: MovementFeet,
      destinationId: BattleTablePositionId,
      provokesOpportunityAttacks: Schema.Literal(false),
    }),
    Schema.Struct({
      kind: Schema.Literal("blocked"),
      distanceFeet: MovementFeet,
      reason: Schema.Literal("blocked", "noLegalDestination"),
      provokesOpportunityAttacks: Schema.Literal(false),
    }),
  ),
});

const BattleSavingThrowRollModeProjectionSchema = Schema.Struct({
  targetId: CombatantId,
  rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
});

const BattleSavingThrowFlatBonusProjectionSchema = Schema.Struct({
  targetId: CombatantId,
  sourceCombatantId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
  bonus: Schema.Number,
});

const BattleLightEmitterAttachmentSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("combatant"),
    combatantId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("object"),
    objectId: BattleObjectId,
  }),
  Schema.Struct({
    kind: Schema.Literal("dancingLight"),
    lightId: BattleDancingLightId,
    positionId: BattleTablePositionId,
    form: Schema.Literal("separateLights", "combinedMediumForm"),
  }),
);

const BattleOngoingSpellEffectRefSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("spellLightEmitter"),
    sourceEffectId: BattleSpellEffectOccurrenceId,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellActiveEffect"),
    activeEffectKind: Schema.Literal(
      "spellObjectContactDamage",
      "spiritualWeapon",
    ),
    effectRef: BattleActiveEffectExecutionRef,
  }),
  Schema.Struct({
    kind: Schema.Literal("antimagicFieldAura"),
    areaId: BattleAreaId,
    sourceCombatantId: CombatantId,
  }),
);
const BattleAntimagicFieldOngoingSpellEffectRefSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("spellLightEmitter"),
    sourceEffectId: BattleSpellEffectOccurrenceId,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellActiveEffect"),
    activeEffectKind: Schema.Literal(
      "spellObjectContactDamage",
      "spiritualWeapon",
    ),
    effectRef: BattleActiveEffectExecutionRef,
  }),
);

const BattleOngoingSpellTargetSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("combatant"),
    combatantId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("object"),
    objectId: BattleObjectId,
  }),
  Schema.Struct({
    kind: Schema.Literal("magicalEffect"),
    effect: BattleOngoingSpellEffectRefSchema,
  }),
);

const BattleOngoingSpellTargetWithinRangeFactSchema = Schema.Struct({
  kind: Schema.Literal("ongoingSpellTargetWithinRange"),
  casterId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
  target: BattleOngoingSpellTargetSchema,
  rangeFeet: MovementFeet,
});

const BattleExecutionSourceSchema = {
  sourceProcedureRef: BattleProcedureExecutionRef,
  sourceCombatantId: CombatantId,
} as const;

const BattleProcedureSourceSchema = {
  targetId: CombatantId,
  ...BattleExecutionSourceSchema,
} as const;

const SpellTurnDamageSchema = Schema.Struct({
  expr: DiceExprSchema,
  damageType: DamageTypeSchema,
});

const BattleSpellTurnStartDamageSourceSchema = Schema.Struct({
  ...BattleProcedureSourceSchema,
  trigger: Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("condition"),
      condition: Schema.Literal(...ALL_CONDITIONS),
    }),
    Schema.Struct({
      kind: Schema.Literal("saveToEnd"),
      ability: AbilitySchema,
      dc: DcSourceSchema,
    }),
  ),
  damage: SpellTurnDamageSchema,
});

const BattleSpellTurnEndDamageSourceSchema = Schema.Struct({
  ...BattleProcedureSourceSchema,
  damage: SpellTurnDamageSchema,
});

const SpellConditionRepeatSaveSchema = Schema.Struct({
  ability: AbilitySchema,
  dc: DcSourceSchema,
});

const EmptySpellAreaChoicesSchema = Schema.Tuple();

function exhaustiveBattleHoleSchema<
  Type extends BattleHole,
  Encoded,
  Requirements,
>(
  schema: Schema.Schema<Type, Encoded, Requirements> &
    ([BattleHole] extends [Type]
      ? unknown
      : { readonly missingBattleHoleVariants: Exclude<BattleHole, Type> }),
): Schema.Schema<Type, Encoded, Requirements> {
  return schema;
}

type BattleHoleFieldSchemas = Schema.Struct.Fields & {
  readonly label?: never;
};

function pairedBattleHoleNestedMember<
  const Fields extends Schema.Struct.Fields,
>(fields: Fields) {
  return {
    labeled: Schema.Struct({ ...fields, label: Schema.String }),
    mechanical: Schema.Struct(fields).annotations({
      parseOptions: { onExcessProperty: "error" },
    }),
  };
}

function pairedBattleHoleNestedMemberVariants<
  const LabeledFields extends Schema.Struct.Fields,
  const MechanicalFields extends Schema.Struct.Fields,
>(labeledFields: LabeledFields, mechanicalFields: MechanicalFields) {
  return {
    labeled: Schema.Struct(labeledFields),
    mechanical: Schema.Struct(mechanicalFields).annotations({
      parseOptions: { onExcessProperty: "error" },
    }),
  };
}

function pairedBattleHoleNestedArrayField<
  const Fields extends Schema.Struct.Fields,
>(fields: Fields) {
  const member = pairedBattleHoleNestedMember(fields);
  return {
    labeled: Schema.optionalWith(Schema.Array(member.labeled), {
      exact: true,
    }),
    mechanical: Schema.optionalWith(Schema.Array(member.mechanical), {
      exact: true,
    }),
  };
}

function mergeBattleHoleFieldPairs<
  const LeftLabeledFields extends Schema.Struct.Fields,
  const LeftMechanicalFields extends Schema.Struct.Fields,
  const RightLabeledFields extends Schema.Struct.Fields,
  const RightMechanicalFields extends Schema.Struct.Fields,
>(
  left: {
    readonly labeled: LeftLabeledFields;
    readonly mechanical: LeftMechanicalFields;
  },
  right: {
    readonly labeled: RightLabeledFields;
    readonly mechanical: RightMechanicalFields;
  },
): {
  readonly labeled: LeftLabeledFields & RightLabeledFields;
  readonly mechanical: LeftMechanicalFields & RightMechanicalFields;
} {
  return {
    labeled: { ...left.labeled, ...right.labeled },
    mechanical: { ...left.mechanical, ...right.mechanical },
  };
}

function pairedBattleHoleMember<const Fields extends BattleHoleFieldSchemas>(
  fields: Fields,
) {
  return pairedBattleHoleMemberVariants(fields, fields);
}

function pairedBattleHoleMemberVariants<
  const LabeledFields extends BattleHoleFieldSchemas,
  const MechanicalFields extends BattleHoleFieldSchemas,
>(labeledFields: LabeledFields, mechanicalFields: MechanicalFields) {
  return {
    labeled: Schema.Struct({ ...labeledFields, label: Schema.String }),
    mechanical: Schema.Struct(mechanicalFields).annotations({
      parseOptions: { onExcessProperty: "error" },
    }),
  };
}

function pairedBattleHoleMemberWithFields<
  const Fields extends BattleHoleFieldSchemas,
  const LabeledFields extends Schema.Struct.Fields,
  const MechanicalFields extends Schema.Struct.Fields,
>(
  fields: Fields,
  pairedFields: {
    readonly labeled: LabeledFields;
    readonly mechanical: MechanicalFields;
  },
) {
  return pairedBattleHoleMemberVariants(
    { ...fields, ...pairedFields.labeled },
    { ...fields, ...pairedFields.mechanical },
  );
}

function withoutBattleHoleLabel<
  const Fields extends Schema.Struct.Fields & {
    readonly label: Schema.Struct.Field;
  },
>(fields: Fields) {
  const { label, ...fieldsWithoutLabel } = fields;
  void label;
  return fieldsWithoutLabel;
}

const BattleHoleBaseFieldsSchema = withoutBattleHoleLabel(BattleHoleBaseSchema);
const BattleMovementHoleCommonFieldsSchema = withoutBattleHoleLabel(
  BattleMovementHoleCommonSchema,
);

const D20TestNaturalOneRerollHoleOptionsFields = (() => {
  const schemas = pairedBattleHoleNestedArrayField({
    effectKind: Schema.Literal("d20_test_natural_one_reroll"),
  });
  return {
    labeled: { d20TestNaturalOneRerolls: schemas.labeled },
    mechanical: { d20TestNaturalOneRerolls: schemas.mechanical },
  };
})();

const AttackRollFeatureActivationFields = (() => {
  const schemas = pairedBattleHoleNestedMemberVariants(
    {
      procedureRef: BattleProcedureExecutionRef,
      unitId: Schema.optionalWith(Schema.Never, { exact: true }),
      label: Schema.optionalWith(Schema.Never, { exact: true }),
      rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
    },
    {
      procedureRef: BattleProcedureExecutionRef,
      rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
    },
  );
  return {
    labeled: {
      ongoingFeatureActivations: Schema.optionalWith(
        Schema.Array(schemas.labeled),
        { exact: true },
      ),
    },
    mechanical: {
      ongoingFeatureActivations: Schema.optionalWith(
        Schema.Array(schemas.mechanical),
        { exact: true },
      ),
    },
  };
})();

const AttackRollMissToHitReplacementFields = (() => {
  const schemas = pairedBattleHoleNestedMemberVariants(
    {
      procedureRef: BattleProcedureExecutionRef,
      unitId: Schema.optionalWith(Schema.Never, { exact: true }),
      label: Schema.optionalWith(Schema.Never, { exact: true }),
    },
    { procedureRef: BattleProcedureExecutionRef },
  );
  return {
    labeled: {
      missToHitReplacements: Schema.optionalWith(
        Schema.Array(schemas.labeled),
        { exact: true },
      ),
    },
    mechanical: {
      missToHitReplacements: Schema.optionalWith(
        Schema.Array(schemas.mechanical),
        { exact: true },
      ),
    },
  };
})();

const AttackDamageAbilityModifierChoiceHoleFields = (() => {
  const schemas = pairedBattleHoleNestedMemberVariants(
    {
      procedureRefs: Schema.NonEmptyArray(BattleProcedureExecutionRef),
      unitIds: Schema.optionalWith(Schema.Never, { exact: true }),
      appliedDamageAbilityModifier: AbilityModifier,
      declinedDamageAbilityModifier: AbilityModifier,
    },
    {
      procedureRefs: Schema.NonEmptyArray(BattleProcedureExecutionRef),
      appliedDamageAbilityModifier: AbilityModifier,
      declinedDamageAbilityModifier: AbilityModifier,
    },
  );
  return {
    labeled: {
      attackDamageAbilityModifierChoice: Schema.optionalWith(schemas.labeled, {
        exact: true,
      }),
    },
    mechanical: {
      attackDamageAbilityModifierChoice: Schema.optionalWith(
        schemas.mechanical,
        { exact: true },
      ),
    },
  };
})();

const AttackDamageDispositionChoiceFields = (() => {
  const labeled = Schema.Struct({
    kind: Schema.Literal("zeroHitPointReplacement"),
    procedureRef: BattleProcedureExecutionRef,
    unitId: Schema.optionalWith(Schema.Never, { exact: true }),
  });
  const mechanical = Schema.Struct({
    kind: Schema.Literal("zeroHitPointReplacement"),
    procedureRef: BattleProcedureExecutionRef,
  }).annotations({ parseOptions: { onExcessProperty: "error" } });
  return {
    labeled: {
      choices: Schema.Array(
        Schema.Union(
          Schema.Struct({ kind: Schema.Literal("ordinaryDamage") }),
          Schema.Struct({ kind: Schema.Literal("knockOut") }),
          labeled,
        ),
      ),
    },
    mechanical: {
      choices: Schema.Array(
        Schema.Union(
          Schema.Struct({ kind: Schema.Literal("ordinaryDamage") }),
          Schema.Struct({ kind: Schema.Literal("knockOut") }),
          mechanical,
        ),
      ),
    },
  };
})();

const SpellAttackRerollHoleOptionsFields = (() => {
  const schemas = pairedBattleHoleNestedArrayField({
    effectKind: Schema.Literal("missed_spell_attack_reroll"),
    sorceryPointCost: ResourceCount,
  });
  return {
    labeled: { spellAttackRerolls: schemas.labeled },
    mechanical: { spellAttackRerolls: schemas.mechanical },
  };
})();

const SpellDamageRerollHoleOptionsFields = (() => {
  const schemas = pairedBattleHoleNestedArrayField({
    effectKind: Schema.Literal("damage_dice_reroll"),
    sorceryPointCost: ResourceCount,
    maximumSelectedDice: Schema.Number.pipe(Schema.int()),
  });
  return {
    labeled: { spellDamageRerolls: schemas.labeled },
    mechanical: { spellDamageRerolls: schemas.mechanical },
  };
})();

const BattleInterruptDecisionHolePayloadMember = pairedBattleHoleMember({
  ...BattleHoleBaseFieldsSchema,
  kind: Schema.Literal("interruptDecision"),
  trigger: Schema.Literal(...BATTLE_INTERRUPT_TRIGGERS),
  eligibleResponders: Schema.Array(CombatantId),
});

const BattleHolePayloadMembers = [
  BattleInterruptDecisionHolePayloadMember,
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("readyDeclaration"),
    actorId: CombatantId,
    responseChoices: Schema.Array(BattleReadyResponseSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("helpAttackAllyDecision"),
    helperId: CombatantId,
    choices: Schema.Array(CombatantId),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("helpAttackEnemyDecision"),
    helperId: CombatantId,
    allyId: CombatantId,
    choices: Schema.Array(CombatantId),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("damageRelationshipDecisions"),
    damageEventHoleId: BattleHoleIdSchema,
    damageSourceId: CombatantId,
    questions: Schema.NonEmptyArray(BattleDamageRelationshipQuestionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("targetChoice"),
    choices: Schema.Array(CombatantId),
    procedureRef: Schema.optionalWith(BattleProcedureExecutionRef, {
      exact: true,
    }),
    requiresTableSpatialFact: Schema.optionalWith(Schema.Boolean, {
      exact: true,
    }),
    relationshipFactRequest: Schema.optionalWith(
      BattleTargetChoiceRelationshipFactRequestSchema,
      { exact: true },
    ),
    spellTargetSpatialFactRequest: Schema.optionalWith(
      Schema.Struct({
        casterId: CombatantId,
        sourceProcedureRef: BattleProcedureExecutionRef,
        rangeFeet: MovementFeet,
        visibility: Schema.Literal("requiresSight", "notSpecifiedByProcedure"),
        requiresKnownWillingTarget: Schema.optionalWith(Schema.Literal(true), {
          exact: true,
        }),
      }),
      { exact: true },
    ),
    attack: Schema.optionalWith(
      Schema.Struct({
        actorId: CombatantId,
        selection: BattleAttackExecutionSelectionSchema,
        targetConstraint: Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("meleeReach"),
            reachFeet: MovementFeet,
          }),
          Schema.Struct({
            kind: Schema.Literal("rangedRange"),
            normalFeet: MovementFeet,
            longFeet: MovementFeet,
          }),
        ),
        acceptsObjectTarget: Schema.optionalWith(Schema.Literal(true), {
          exact: true,
        }),
      }),
      { exact: true },
    ),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("targetSpatialFacts"),
    wardingBondSeparation: Schema.Struct({
      sourceCombatantId: CombatantId,
      targetId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      rangeFeet: MovementFeet,
    }),
    requiresTableSpatialFact: Schema.Literal(true),
    requiresKnownWillingTargets: Schema.optionalWith(Schema.Literal(true), {
      exact: true,
    }),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("targetSpatialFacts"),
    spellBeingCast: Schema.Struct({
      casterId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      castLevel: Schema.Number,
      components: Schema.Array(Schema.Literal("V", "S", "M")),
    }),
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("slowSomaticSpellFailureOutcome"),
    actorId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    failurePercent: Schema.Literal(
      SLOW_ACTIVE_PENALTIES_SOMATIC_FAILURE_PERCENT,
    ),
    activeEffectSources: Schema.Array(
      Schema.Struct({
        sourceProcedureRef: BattleProcedureExecutionRef,
        sourceCombatantId: CombatantId,
      }),
    ),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("objectTargetChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("wildShapeEquipmentDisposition"),
    actorId: CombatantId,
    formExecutionRef: BattleStatBlockExecutionScopeRef,
    candidates: Schema.Array(WildShapeLoadoutObjectRefSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("hitPointHealingDistribution"),
    requiresTableSpatialFact: Schema.Literal(true),
    healingPool: Schema.Struct({
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      unitId: Schema.optionalWith(Schema.Never, { exact: true }),
      rangeFeet: MovementFeet,
      poolHitPoints: HpSchema,
      perTargetCap: Schema.Literal("halfHitPointMaximum"),
    }),
    choices: Schema.Array(CombatantId),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("ongoingSpellTargetChoice"),
    requiresTableSpatialFact: Schema.Literal(true),
    casterId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
    choices: Schema.Array(BattleOngoingSpellTargetSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("objectContactTargets"),
    objectContact: Schema.Struct({
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      objectId: BattleObjectId,
      rangeFeet: MovementFeet,
      requiresObjectWithinRange: Schema.Boolean,
    }),
    choices: Schema.Array(CombatantId),
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    outcomeTargeting: Schema.Literal("targetList"),
    objectContactSave: Schema.Struct({
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      objectId: BattleObjectId,
      targetIds: Schema.Array(CombatantId),
    }),
    ability: Schema.Literal("con"),
    dc: Schema.Struct({ kind: Schema.Literal("caster_spell_save_dc") }),
    areaChoices: Schema.Tuple(),
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("objectDropResolution"),
    objectDrop: Schema.Struct({
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      objectId: BattleObjectId,
      targetIds: Schema.Array(CombatantId),
    }),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("heldObjectFacts"),
    actorId: CombatantId,
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("toolPossessionFacts"),
    actorId: CombatantId,
    toolIds: Schema.Tuple(Schema.Literal("poisoners_kit")),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("cunningStrikeEndTurnCoverFacts"),
    actorId: CombatantId,
    coverDegrees: Schema.Array(
      Schema.Literal(...CUNNING_STRIKE_END_TURN_COVER_DEGREES),
    ),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("findFamiliarConnection"),
    ownerId: CombatantId,
    companionId: CombatantId,
    rangeFeet: MovementFeet,
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("companionReappearancePlacement"),
    ownerId: CombatantId,
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("companionReappearanceInitiative"),
    ownerId: CombatantId,
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("magicWeaponTargetItem"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    requiresTableItemFact: Schema.Literal(true),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("damageTypeChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    choices: Schema.Array(DamageTypeSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("spellTargetAllocation"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    allocationCount: Schema.Number,
    choices: Schema.Array(CombatantId),
    requiresTableSpatialFact: Schema.Literal(true),
    spellTargetSpatialFactRequest: Schema.Struct({
      casterId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      rangeFeet: MovementFeet,
      visibility: Schema.Literal("requiresSight"),
    }),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("spellTargetList"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    procedure: Schema.optionalWith(Schema.Never, { exact: true }),
    minTargets: Schema.Literal(1),
    maxTargets: Schema.Number,
    spatialTargeting: Schema.Union(
      Schema.Struct({ kind: Schema.Literal("individualTargets") }),
      Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
    ),
    choices: Schema.Array(CombatantId),
    requiresTableSpatialFact: Schema.Literal(true),
    spellTargetSpatialFactRequest: Schema.optionalWith(
      Schema.Struct({
        casterId: CombatantId,
        sourceProcedureRef: BattleProcedureExecutionRef,
        rangeFeet: MovementFeet,
        visibility: Schema.Literal("notSpecifiedByProcedure"),
      }),
      { exact: true },
    ),
    requiresKnownWillingTargets: Schema.optionalWith(Schema.Literal(true), {
      exact: true,
    }),
    relationshipFactRequest: Schema.optionalWith(
      BattleSpellTargetListRelationshipFactRequestSchema,
      { exact: true },
    ),
  }),
  pairedBattleHoleMemberWithFields(
    {
      ...BattleHoleBaseFieldsSchema,
      kind: Schema.Literal("attackRoll"),
      attack: SupportedAttackActionOptionSchema,
      attackBonus: AttackBonus,
      rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
        exact: true,
      }),
      relationshipFactRequest: Schema.optionalWith(
        BattleAttackRollRelationshipFactRequestSchema,
        { exact: true },
      ),
    },
    mergeBattleHoleFieldPairs(
      mergeBattleHoleFieldPairs(
        {
          labeled: {},
          mechanical: { attack: MechanicalSupportedAttackActionOptionSchema },
        },
        AttackRollFeatureActivationFields,
      ),
      mergeBattleHoleFieldPairs(
        AttackRollMissToHitReplacementFields,
        D20TestNaturalOneRerollHoleOptionsFields,
      ),
    ),
  ),
  pairedBattleHoleMemberWithFields(
    {
      ...BattleHoleBaseFieldsSchema,
      kind: Schema.Literal("attackRoll"),
      attackBonus: AttackBonus,
      sourceProcedureRef: BattleProcedureExecutionRef,
      rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
        exact: true,
      }),
    },
    mergeBattleHoleFieldPairs(
      AttackRollMissToHitReplacementFields,
      mergeBattleHoleFieldPairs(
        SpellAttackRerollHoleOptionsFields,
        D20TestNaturalOneRerollHoleOptionsFields,
      ),
    ),
  ),
  pairedBattleHoleMemberWithFields(
    {
      ...BattleHoleBaseFieldsSchema,
      kind: Schema.Literal("rolledDice"),
      attack: SupportedAttackActionOptionSchema,
      critical: Schema.Boolean,
      attackDamageRiders: Schema.optionalWith(
        Schema.Array(
          Schema.Struct({
            attackerId: CombatantId,
            procedureRef: BattleProcedureExecutionRef,
            optional: Schema.Boolean,
            damage: Schema.Struct({
              dice: Schema.Number,
              dieSize: Schema.Number,
              damageType: DamageTypeSchema,
            }),
          }),
        ),
        { exact: true },
      ),
      spellWeaponDamageRiders: Schema.optionalWith(
        Schema.Array(SpellWeaponDamageRiderSchema),
        { exact: true },
      ),
      spellMarkedDamageRiders: Schema.optionalWith(
        Schema.Array(SpellMarkedDamageRiderSchema),
        { exact: true },
      ),
      cunningStrikeOptions: Schema.optionalWith(
        Schema.Array(
          Schema.Struct({
            procedureRef: BattleProcedureExecutionRef,
            optionId: Schema.Literal(
              ...BATTLE_CUNNING_STRIKE_OPTION_SELECTION_IDS,
            ),
            sourceDamageRiderProcedureRef: BattleProcedureExecutionRef,
            dieCost: Schema.Struct({
              dice: Schema.Literal(1),
              dieSize: Schema.Literal(6),
            }),
          }),
        ),
        { exact: true },
      ),
      weaponDamageDiceRollChoiceProcedureRefs: Schema.optionalWith(
        Schema.Array(BattleProcedureExecutionRef),
        { exact: true },
      ),
      attackDamageDieFloorChoiceProcedureRefs: Schema.optionalWith(
        Schema.NonEmptyArray(BattleProcedureExecutionRef),
        { exact: true },
      ),
    },
    mergeBattleHoleFieldPairs(
      {
        labeled: {},
        mechanical: { attack: MechanicalSupportedAttackActionOptionSchema },
      },
      AttackDamageAbilityModifierChoiceHoleFields,
    ),
  ),
  pairedBattleHoleMemberWithFields(
    {
      ...BattleHoleBaseFieldsSchema,
      kind: Schema.Literal("rolledDice"),
      critical: Schema.Boolean,
      sourceProcedureRef: BattleProcedureExecutionRef,
      spellMarkedDamageRiders: Schema.optionalWith(
        Schema.Array(SpellMarkedDamageRiderSchema),
        { exact: true },
      ),
    },
    SpellDamageRerollHoleOptionsFields,
  ),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("rolledDice"),
    dragonsBreath: Schema.Struct({
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      damageType: DamageTypeSchema,
      expr: DiceExprSchema,
    }),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("rolledDice"),
    glyphExplosiveRune: Schema.Struct({
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      sourceEffectId: BattleSpellEffectOccurrenceId,
      damage: Schema.Struct({
        expr: DiceExprSchema,
      }),
    }),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("rolledDice"),
    spellDamageReduction: Schema.Struct({
      sourceProcedureRef: BattleProcedureExecutionRef,
      sourceCombatantId: CombatantId,
      targetId: CombatantId,
      damageType: DamageTypeSchema,
      amount: Schema.Struct({
        dice: Schema.Literal(1),
        dieSize: Schema.Literal(4),
      }),
    }),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("rolledDice"),
    sourceDamageRollPenalty: Schema.Struct({
      sourceProcedureRef: BattleProcedureExecutionRef,
      sourceCombatantId: CombatantId,
      affectedCombatantId: CombatantId,
      damageRollHoleId: BattleHoleIdSchema,
      amount: Schema.Struct({
        dice: Schema.Literal(1),
        dieSize: Schema.Literal(8),
      }),
    }),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("rolledDice"),
    mirrorImageDuplicateRoll: Schema.Struct({
      targetId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      sourceCombatantId: CombatantId,
      remainingDuplicates: Schema.Literal(...MIRROR_IMAGE_DUPLICATE_COUNTS),
      dieSize: Schema.Literal(MIRROR_IMAGE_DUPLICATE_DIE_SIZE),
      successAtLeast: Schema.Literal(MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST),
    }),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("rolledDice"),
    spellTurnStartDamage: BattleSpellTurnStartDamageSourceSchema,
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("rolledDice"),
    spellTurnEndDamage: BattleSpellTurnEndDamageSourceSchema,
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("rolledDice"),
    movableZone: Schema.Struct({
      ...BattleProcedureSourceSchema,
      areaId: BattleAreaId,
      trigger: Schema.Literal(
        "endsTurnWithinFiveFeetOfSphere",
        "rammedBySphere",
      ),
      save: Schema.Struct({
        ability: Schema.Literal("dex"),
        dc: DcSourceSchema,
      }),
    }),
    critical: Schema.Literal(false),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("rolledDice"),
    spikeGrowthMovement: Schema.Struct({
      targetId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      sourceCombatantId: CombatantId,
      areaId: BattleAreaId,
      distanceFeet: MovementFeet,
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: Schema.Literal("piercing"),
      }),
    }),
    critical: Schema.Literal(false),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("rolledDice"),
    insectPlagueAreaHazard: Schema.Struct({
      ...BattleProcedureSourceSchema,
      areaId: BattleAreaId,
      trigger: Schema.Literal("appearsInArea", "entersArea", "endsTurnInArea"),
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: Schema.Literal("piercing"),
      }),
    }),
    critical: Schema.Literal(false),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("rolledDice"),
    cloudkillAreaHazard: Schema.Struct({
      ...BattleProcedureSourceSchema,
      areaId: BattleAreaId,
      trigger: Schema.Literal(
        "appearsInArea",
        "movesIntoSpace",
        "entersArea",
        "endsTurnInArea",
      ),
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: Schema.Literal("poison"),
      }),
    }),
    critical: Schema.Literal(false),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("rolledDice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("skillChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    choices: Schema.Array(Schema.Literal(...BATTLE_SURFACE_SKILLS)),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("abilityChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    choices: Schema.Array(AbilitySchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("targetAbilityChoices"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    choices: Schema.Array(AbilitySchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("conditionChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    choices: Schema.NonEmptyArray(Schema.Literal(...ALL_CONDITIONS)),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("thaumaturgyActiveOneMinuteEffectCount"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    maximumActiveOneMinuteEffects: Schema.Literal(
      THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS,
    ),
    requiresTableSpellEffectCount: Schema.Literal(true),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("commandOptionChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    choices: Schema.Array(Schema.Literal(...COMMAND_OPTIONS)),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("selfTransformationModeChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    choices: Schema.NonEmptyArray(
      Schema.Literal(...SELF_TRANSFORMATION_MODE_KINDS),
    ),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("dancingLightsPlacement"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    mode: Schema.Literal("cast", "reposition"),
    form: Schema.Literal("separateLights", "combinedMediumForm"),
    activeLightIds: Schema.Array(BattleDancingLightId),
    rangeFeet: MovementFeet,
    maxMoveFeet: MovementFeet,
    spacingFeet: MovementFeet,
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("spellAreaChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    area: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
      Schema.Struct({
        kind: Schema.Literal("pointOriginSphereDiameter"),
        diameterFeet: MovementFeet,
      }),
      Schema.Struct({
        kind: Schema.Literal("pointOriginCylinder"),
        radiusFeet: MovementFeet,
        heightFeet: MovementFeet,
      }),
      Schema.Struct({
        kind: Schema.Literal("pointOriginCube"),
        sideFeet: MovementFeet,
      }),
      Schema.Struct({
        kind: Schema.Literal("selfOriginEmanation"),
        radiusFeet: MovementFeet,
      }),
    ),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("teleportDestination"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    actorId: CombatantId,
    maxDistanceFeet: MovementFeet,
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("spiritualWeaponForcePosition"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    mode: Schema.Literal("cast", "reposition"),
    maxDistanceFeet: MovementFeet,
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    spellTurnStartSave: Schema.Struct({
      targetId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      sourceCombatantId: CombatantId,
      save: Schema.Struct({
        ability: AbilitySchema,
        dc: DcSourceSchema,
        successEnds: Schema.Literal("spell"),
      }),
    }),
    ability: AbilitySchema,
    dc: DcSourceSchema,
    areaChoices: Schema.Tuple(),
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    hideousLaughterRepeatSave: Schema.Struct({
      targetId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      sourceCombatantId: CombatantId,
      trigger: Schema.Literal("endTurn", "damage"),
      save: Schema.Struct({
        ability: Schema.Literal("wis"),
        dc: DcSourceSchema,
      }),
    }),
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    areaChoices: Schema.Tuple(),
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    sleepRepeatSave: Schema.Struct({
      targetId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      sourceCombatantId: CombatantId,
      save: Schema.Struct({
        ability: Schema.Literal("wis"),
        dc: DcSourceSchema,
      }),
    }),
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    areaChoices: Schema.Tuple(),
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    greaseGroundHazard: Schema.Struct({
      ...BattleProcedureSourceSchema,
      areaId: BattleAreaId,
      trigger: Schema.Literal("entersArea", "endsTurnInArea"),
      save: Schema.Struct({
        ability: Schema.Literal("dex"),
        dc: DcSourceSchema,
      }),
    }),
    ability: Schema.Literal("dex"),
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    webRestraint: Schema.Struct({
      ...BattleProcedureSourceSchema,
      areaId: BattleAreaId,
      trigger: Schema.Literal("entersArea", "startsTurnInArea"),
      save: Schema.Struct({
        ability: Schema.Literal("dex"),
        dc: DcSourceSchema,
      }),
    }),
    ability: Schema.Literal("dex"),
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    sleetStormAreaHazard: Schema.Struct({
      ...BattleProcedureSourceSchema,
      areaId: BattleAreaId,
      trigger: Schema.Literal("entersArea", "startsTurnInArea"),
      save: Schema.Struct({
        ability: Schema.Literal("dex"),
        dc: DcSourceSchema,
      }),
    }),
    ability: Schema.Literal("dex"),
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    insectPlagueAreaHazard: Schema.Struct({
      ...BattleProcedureSourceSchema,
      areaId: BattleAreaId,
      trigger: Schema.Literal("appearsInArea", "entersArea", "endsTurnInArea"),
      save: Schema.Struct({
        ability: Schema.Literal("con"),
        dc: DcSourceSchema,
      }),
    }),
    ability: Schema.Literal("con"),
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    cloudkillAreaHazard: Schema.Struct({
      ...BattleProcedureSourceSchema,
      areaId: BattleAreaId,
      trigger: Schema.Literal(
        "appearsInArea",
        "movesIntoSpace",
        "entersArea",
        "endsTurnInArea",
      ),
      save: Schema.Struct({
        ability: Schema.Literal("con"),
        dc: DcSourceSchema,
      }),
    }),
    ability: Schema.Literal("con"),
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    gustOfWindLine: Schema.Struct({
      ...BattleProcedureSourceSchema,
      areaId: BattleAreaId,
      directionId: BattleLineDirectionId,
      trigger: Schema.Literal("endsTurnInLine"),
      save: Schema.Struct({
        ability: Schema.Literal("str"),
        dc: DcSourceSchema,
      }),
      pushDistanceFeet: MovementFeet,
    }),
    ability: Schema.Literal("str"),
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("gustOfWindLineDirectionChoice"),
    sourceCombatantId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    areaId: BattleAreaId,
    directionId: BattleLineDirectionId,
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    spellConditionEndTurnSave: Schema.Struct({
      ...BattleProcedureSourceSchema,
      condition: Schema.Literal(...ALL_CONDITIONS),
      save: SpellConditionRepeatSaveSchema,
    }),
    ability: AbilitySchema,
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    spellConditionCountedEndTurnSave: Schema.Struct({
      ...BattleProcedureSourceSchema,
      condition: Schema.Literal(...ALL_CONDITIONS),
      save: SpellConditionRepeatSaveSchema,
      successes: Schema.Number,
      failures: Schema.Number,
      successThreshold: Schema.Number,
      failureThreshold: Schema.Number,
    }),
    ability: AbilitySchema,
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    unitFeatureConditionEndTurnSave: Schema.Struct({
      ...BattleProcedureSourceSchema,
      condition: Schema.Literal(...ALL_CONDITIONS),
      save: SpellConditionRepeatSaveSchema,
    }),
    ability: AbilitySchema,
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    slowActivePenaltiesEndTurnSave: Schema.Struct({
      ...BattleProcedureSourceSchema,
      save: Schema.Struct({
        ability: Schema.Literal("wis"),
        dc: DcSourceSchema,
      }),
    }),
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    abilityD20TestRollModeEndTurnSave: Schema.Struct({
      ...BattleProcedureSourceSchema,
      affectedAbility: AbilitySchema,
      save: SpellConditionRepeatSaveSchema,
    }),
    ability: AbilitySchema,
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    movableZone: Schema.Struct({
      ...BattleProcedureSourceSchema,
      areaId: BattleAreaId,
      trigger: Schema.Literal(
        "endsTurnWithinFiveFeetOfSphere",
        "rammedBySphere",
      ),
      save: Schema.Struct({
        ability: Schema.Literal("dex"),
        dc: DcSourceSchema,
      }),
    }),
    ability: Schema.Literal("dex"),
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
      }),
    ),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    movableZone: Schema.Struct({
      ...BattleProcedureSourceSchema,
      areaId: BattleAreaId,
      trigger: Schema.Literal(
        "appearsInArea",
        "areaMovesIntoSpace",
        "entersArea",
        "endsTurnInArea",
      ),
      save: Schema.Struct({
        ability: Schema.Literal("con"),
        dc: DcSourceSchema,
      }),
    }),
    ability: Schema.Literal("con"),
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
      }),
    ),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("movableZoneRamMovement"),
    movableZone: Schema.Struct({
      ...BattleProcedureSourceSchema,
      areaId: BattleAreaId,
      maxMoveFeet: MovementFeet,
    }),
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("movableZoneRepositionMovement"),
    movableZone: Schema.Struct({
      sourceProcedureRef: BattleProcedureExecutionRef,
      sourceCombatantId: CombatantId,
      areaId: BattleAreaId,
      maxMoveFeet: MovementFeet,
    }),
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    protectionRelevantEffectSave: Schema.Struct({
      ...BattleProcedureSourceSchema,
      relevantEffect: Schema.Literal("charmed", "frightened", "possession"),
      save: SpellConditionRepeatSaveSchema,
    }),
    ability: AbilitySchema,
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  pairedBattleHoleMemberWithFields(
    {
      ...BattleHoleBaseFieldsSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      dragonsBreath: Schema.Struct({
        sourceCombatantId: CombatantId,
        sourceProcedureRef: BattleProcedureExecutionRef,
        lengthFeet: Schema.Literal(15),
      }),
      ability: Schema.Literal("dex"),
      dc: DcSourceSchema,
      areaChoices: Schema.Array(BattleSpellAreaChoiceSchema),
      targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
      relationshipFactRequest: Schema.optionalWith(
        BattleSavingThrowRelationshipFactRequestSchema,
        { exact: true },
      ),
    },
    D20TestNaturalOneRerollHoleOptionsFields,
  ),
  pairedBattleHoleMemberWithFields(
    {
      ...BattleHoleBaseFieldsSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      glyphExplosiveRune: Schema.Struct({
        sourceCombatantId: CombatantId,
        sourceProcedureRef: BattleProcedureExecutionRef,
        sourceEffectId: BattleSpellEffectOccurrenceId,
        radiusFeet: Schema.Literal(20),
      }),
      ability: Schema.Literal("dex"),
      dc: DcSourceSchema,
      targetIds: Schema.Array(CombatantId),
      targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
    },
    D20TestNaturalOneRerollHoleOptionsFields,
  ),
  pairedBattleHoleMemberWithFields(
    {
      ...BattleHoleBaseFieldsSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      outcomeTargeting: Schema.Literal("singleTarget", "targetList", "area"),
      sourceProcedureRef: BattleProcedureExecutionRef,
      ability: AbilitySchema,
      dc: DcSourceSchema,
      areaChoices: Schema.Array(BattleSpellAreaChoiceSchema),
      targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
      relationshipFactRequest: Schema.optionalWith(
        BattleSavingThrowRelationshipFactRequestSchema,
        { exact: true },
      ),
    },
    D20TestNaturalOneRerollHoleOptionsFields,
  ),
  pairedBattleHoleMemberWithFields(
    {
      ...BattleHoleBaseFieldsSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      ability: AbilitySchema,
      dc: DcSourceSchema,
      targetIds: Schema.Array(CombatantId),
      targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
      relationshipFactRequest: Schema.optionalWith(
        BattleSavingThrowRelationshipFactRequestSchema,
        { exact: true },
      ),
    },
    D20TestNaturalOneRerollHoleOptionsFields,
  ),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("rolledDice"),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("unitFeatureDecision"),
    choices: Schema.Union(
      Schema.Tuple(Schema.Literal("use"), Schema.Literal("decline")),
      Schema.Tuple(Schema.Literal("attempt"), Schema.Literal("decline")),
      Schema.Tuple(
        Schema.Literal(BRUTAL_STRIKE_EFFECT_DECISION_CHOICES[0]),
        Schema.Literal(BRUTAL_STRIKE_EFFECT_DECISION_CHOICES[1]),
        Schema.Literal(BRUTAL_STRIKE_EFFECT_DECISION_CHOICES[2]),
      ),
      Schema.Tuple(
        Schema.Literal(TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES[0]),
        Schema.Literal(TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES[1]),
        Schema.Literal(TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES[2]),
        Schema.Literal(TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES[3]),
      ),
      Schema.Tuple(
        Schema.Literal(OPEN_HAND_TECHNIQUE_DECISION_CHOICES[0]),
        Schema.Literal(OPEN_HAND_TECHNIQUE_DECISION_CHOICES[1]),
        Schema.Literal(OPEN_HAND_TECHNIQUE_DECISION_CHOICES[2]),
        Schema.Literal(OPEN_HAND_TECHNIQUE_DECISION_CHOICES[3]),
      ),
    ),
  }),
  pairedBattleHoleMemberWithFields(
    {
      ...BattleHoleBaseFieldsSchema,
      kind: Schema.Literal("deathSavingThrow"),
      combatantId: CombatantId,
      rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
        exact: true,
      }),
    },
    D20TestNaturalOneRerollHoleOptionsFields,
  ),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("statBlockRechargeRoll"),
    combatantId: CombatantId,
    rechargeTargets: Schema.Array(BattleResourcePoolExecutionRef),
  }),
  pairedBattleHoleMemberWithFields(
    {
      ...BattleHoleBaseFieldsSchema,
      kind: Schema.Literal("concentrationSavingThrow"),
      combatantId: CombatantId,
      dc: DifficultyClass,
      damageAmount: DamageAmount,
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
      rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
        exact: true,
      }),
    },
    D20TestNaturalOneRerollHoleOptionsFields,
  ),
  pairedBattleHoleMember({
    ...BattleMovementHoleCommonFieldsSchema,
    brutalStrikeForcefulBlow: Schema.optionalWith(Schema.Never, {
      exact: true,
    }),
  }),
  pairedBattleHoleMember({
    ...BattleMovementHoleCommonFieldsSchema,
    brutalStrikeForcefulBlow: BattleBrutalStrikeForcefulBlowMovementFactSchema,
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("levitateAltitudeChange"),
    actorId: CombatantId,
    targetId: CombatantId,
    maxDistanceFeet: MovementFeet,
    directions: Schema.Array(Schema.Literal("up", "down")),
    requiresTargetWithinRangeFact: Schema.Literal(true),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("levitateInitialRise"),
    actorId: CombatantId,
    targetId: CombatantId,
    maxDistanceFeet: MovementFeet,
  }),
  pairedBattleHoleMemberWithFields(
    {
      ...BattleHoleBaseFieldsSchema,
      kind: Schema.Literal("abilityCheck"),
      ability: AbilitySchema,
      skill: Schema.Literal(...BATTLE_SURFACE_SKILLS),
      dc: DifficultyClass,
      rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
        exact: true,
      }),
    },
    D20TestNaturalOneRerollHoleOptionsFields,
  ),
  pairedBattleHoleMemberWithFields(
    {
      ...BattleHoleBaseFieldsSchema,
      kind: Schema.Literal("spellcastingAbilityCheck"),
      dc: DifficultyClass,
      rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
        exact: true,
      }),
      spellcastingAbilityCheck: Schema.Struct({
        casterId: CombatantId,
        sourceProcedureRef: BattleProcedureExecutionRef,
        target: BattleOngoingSpellTargetSchema,
        effect: BattleOngoingSpellEffectRefSchema,
        contestedSpellLevel: BattleSpellEffectLevel,
      }),
    },
    D20TestNaturalOneRerollHoleOptionsFields,
  ),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("grappleOutcome"),
    actorId: CombatantId,
    targetId: CombatantId,
    dc: DifficultyClass,
    relationshipFactRequest: Schema.optionalWith(
      BattleSavingThrowRelationshipFactRequestSchema,
      { exact: true },
    ),
    mode: Schema.Literal("grappleSave", "escapeCheck"),
    rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
      exact: true,
    }),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("shoveOutcome"),
    actorId: CombatantId,
    targetId: CombatantId,
    dc: DifficultyClass,
    relationshipFactRequest: Schema.optionalWith(
      BattleSavingThrowRelationshipFactRequestSchema,
      { exact: true },
    ),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("sanctuaryInterdictionOutcome"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    triggeringProcedureRef: BattleProcedureExecutionRef,
    sourceCombatantId: CombatantId,
    wardedCombatantId: CombatantId,
    triggeringCombatantId: CombatantId,
    triggeringTargetEventId: BattleHoleIdSchema,
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    choices: Schema.Array(CombatantId),
    replacementTargetKind: Schema.Literal("attackRoll"),
    relationshipFactRequest: Schema.optionalWith(
      Schema.Struct({
        kind: Schema.Literal("attackRollTargetIsEnemy"),
        attackerId: CombatantId,
      }),
      { exact: true },
    ),
  }),
  pairedBattleHoleMember({
    ...BattleHoleBaseFieldsSchema,
    kind: Schema.Literal("sanctuaryInterdictionOutcome"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    triggeringProcedureRef: BattleProcedureExecutionRef,
    sourceCombatantId: CombatantId,
    wardedCombatantId: CombatantId,
    triggeringCombatantId: CombatantId,
    triggeringTargetEventId: BattleHoleIdSchema,
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    choices: Schema.Array(CombatantId),
    replacementTargetKind: Schema.Literal("nonAttack"),
  }),
  pairedBattleHoleMemberWithFields(
    {
      ...BattleHoleBaseFieldsSchema,
      kind: Schema.Literal("attackDamageDisposition"),
      attackerId: CombatantId,
      targetId: CombatantId,
    },
    AttackDamageDispositionChoiceFields,
  ),
] as const;

const [
  BattleInterruptDecisionHolePayloadMemberFromTuple,
  FirstBattleHolePayloadMember,
  ...RemainingBattleHolePayloadMembers
] = BattleHolePayloadMembers;
const BattleHolePayloadUnionSchema = Schema.Union(
  BattleInterruptDecisionHolePayloadMemberFromTuple.labeled,
  FirstBattleHolePayloadMember.labeled,
  ...RemainingBattleHolePayloadMembers.map(({ labeled }) => labeled),
);

const BattleHolePayloadSchema = exhaustiveBattleHoleSchema(
  BattleHolePayloadUnionSchema,
);

export const BattleHoleSchema = BattleHolePayloadSchema.annotations({
  identifier: "BattleHole",
});

const [
  FirstBattleMechanicalOrdinaryHoleMember,
  ...RemainingBattleMechanicalOrdinaryHoleMembers
] = [
  FirstBattleHolePayloadMember,
  ...RemainingBattleHolePayloadMembers,
] as const;
export const BattleMechanicalOrdinaryHoleSchema = Schema.Union(
  FirstBattleMechanicalOrdinaryHoleMember.mechanical,
  ...RemainingBattleMechanicalOrdinaryHoleMembers.map(
    ({ mechanical }) => mechanical,
  ),
).annotations({ identifier: "BattleMechanicalOrdinaryHole" });
export const BattleMechanicalInterruptDecisionHoleSchema =
  BattleInterruptDecisionHolePayloadMemberFromTuple.mechanical.annotations({
    identifier: "BattleMechanicalInterruptDecisionHole",
  });
export const BattleMechanicalHoleSchema = Schema.Union(
  BattleMechanicalInterruptDecisionHoleSchema,
  BattleMechanicalOrdinaryHoleSchema,
).annotations({ identifier: "BattleMechanicalHole" });

const BattleDieRollResultSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThan(0),
  Schema.brand("PositiveInteger"),
  Schema.brand("DieRollResult"),
);

const BattleD20DieRollResultSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.between(1, 20),
  Schema.brand("PositiveInteger"),
  Schema.brand("DieRollResult"),
);

const BattleD20TestRolledD20sSchema = Schema.Struct({
  first: BattleD20DieRollResultSchema,
  second: BattleD20DieRollResultSchema,
  selected: Schema.Literal("first", "second"),
});

const BattleD20TestRollReplacementSchema = Schema.Struct({
  total: Schema.Number.pipe(Schema.int()),
  naturalD20: BattleD20DieRollResultSchema,
  rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
    exact: true,
  }),
});

const BattleD20TestRolledDieRollReplacementSchema = Schema.Struct({
  die: Schema.Literal("first", "second"),
  naturalD20: BattleD20DieRollResultSchema,
  result: BattleD20TestRollReplacementSchema,
});

const BattleD20TestNaturalOneRerollDecisionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("decline"),
    effectKind: Schema.Literal("d20_test_natural_one_reroll"),
  }),
  Schema.Struct({
    kind: Schema.Literal("reroll"),
    effectKind: Schema.Literal("d20_test_natural_one_reroll"),
    replacement: BattleD20TestRollReplacementSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("rerollRolledDie"),
    effectKind: Schema.Literal("d20_test_natural_one_reroll"),
    replacement: BattleD20TestRolledDieRollReplacementSchema,
  }),
);

const BattleD20TestRolledDieOutcomeReplacementSchema = Schema.Struct({
  die: Schema.Literal("first", "second"),
  naturalD20: BattleD20DieRollResultSchema,
  result: Schema.Struct({
    succeeded: Schema.Boolean,
    naturalD20: BattleD20DieRollResultSchema,
  }),
});

const BattleD20TestNaturalOneRerollOutcomeDecisionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("decline"),
    effectKind: Schema.Literal("d20_test_natural_one_reroll"),
  }),
  Schema.Struct({
    kind: Schema.Literal("reroll"),
    effectKind: Schema.Literal("d20_test_natural_one_reroll"),
    replacement: Schema.Struct({
      succeeded: Schema.Boolean,
      naturalD20: BattleD20DieRollResultSchema,
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("rerollRolledDie"),
    effectKind: Schema.Literal("d20_test_natural_one_reroll"),
    replacement: BattleD20TestRolledDieOutcomeReplacementSchema,
  }),
);

const BattleD20TestNaturalOneRerollDieDecisionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("decline"),
    effectKind: Schema.Literal("d20_test_natural_one_reroll"),
  }),
  Schema.Struct({
    kind: Schema.Literal("reroll"),
    effectKind: Schema.Literal("d20_test_natural_one_reroll"),
    replacement: BattleD20DieRollResultSchema,
  }),
);

const BattleD20TestRolledOutcomeFields = {
  succeeded: Schema.Boolean,
  naturalD20: Schema.optionalWith(BattleD20DieRollResultSchema, {
    exact: true,
  }),
  rolledD20s: Schema.optionalWith(BattleD20TestRolledD20sSchema, {
    exact: true,
  }),
  d20TestNaturalOneReroll: Schema.optionalWith(
    BattleD20TestNaturalOneRerollOutcomeDecisionSchema,
    { exact: true },
  ),
} as const;
const BattleD20TestWithoutRollOutcomeFields = {
  succeeded: Schema.Boolean,
  withoutRoll: Schema.Literal(true),
} as const;
const BattleConcentrationSavingThrowValueSchema = Schema.Union(
  Schema.Struct(BattleD20TestRolledOutcomeFields),
  Schema.Struct(BattleD20TestWithoutRollOutcomeFields),
);
const BattleSavingThrowOutcomeSchema = Schema.Union(
  Schema.Struct({
    targetId: CombatantId,
    ...BattleD20TestRolledOutcomeFields,
  }),
  Schema.Struct({
    targetId: CombatantId,
    ...BattleD20TestWithoutRollOutcomeFields,
  }),
);

const BattleAttackRollResultSchema = Schema.Struct({
  total: Schema.Number.pipe(Schema.int()),
  naturalD20: BattleD20DieRollResultSchema,
  rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
    exact: true,
  }),
  rolledD20s: Schema.optionalWith(BattleD20TestRolledD20sSchema, {
    exact: true,
  }),
  activatedOngoingFeatureProcedureRef: Schema.optionalWith(
    BattleProcedureExecutionRef,
    { exact: true },
  ),
  activatedOngoingFeatureUnitId: Schema.optionalWith(Schema.Never, {
    exact: true,
  }),
  missToHitReplacementProcedureRef: Schema.optionalWith(
    BattleProcedureExecutionRef,
    { exact: true },
  ),
  missToHitReplacementUnitId: Schema.optionalWith(Schema.Never, {
    exact: true,
  }),
  spellAttackReroll: Schema.optionalWith(
    Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("decline"),
        effectKind: Schema.Literal("missed_spell_attack_reroll"),
      }),
      Schema.Struct({
        kind: Schema.Literal("reroll"),
        effectKind: Schema.Literal("missed_spell_attack_reroll"),
        replacement: Schema.Struct({
          total: Schema.Number.pipe(Schema.int()),
          naturalD20: BattleD20DieRollResultSchema,
          rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
            exact: true,
          }),
        }),
      }),
    ),
    { exact: true },
  ),
  d20TestNaturalOneReroll: Schema.optionalWith(
    BattleD20TestNaturalOneRerollDecisionSchema,
    { exact: true },
  ),
});

const BattleRolledDiceGroupSchema = Schema.Struct({
  results: Schema.Array(BattleDieRollResultSchema),
});
const BattleNonEmptyRolledDiceGroupSchema = Schema.Struct({
  results: Schema.NonEmptyArray(BattleDieRollResultSchema),
});

type BattleSpellAreaChoiceEncoded = {
  readonly originAnchorId: string;
  readonly affectedTargetIds: readonly string[];
} & (
  | {
      readonly kind?: never;
      readonly areaId?: never;
      readonly sleepNonSleeperFacts?: never;
    }
  | {
      readonly kind?: never;
      readonly areaId?: never;
      readonly sleepNonSleeperFacts: readonly [
        {
          readonly kind: "doesNotSleep";
          readonly targetId: string;
        },
        ...{
          readonly kind: "doesNotSleep";
          readonly targetId: string;
        }[],
      ];
    }
  | {
      readonly kind: "faerieFireArea";
      readonly affectedObjectIds: readonly string[];
      readonly areaId?: never;
      readonly sleepNonSleeperFacts?: never;
    }
  | {
      readonly kind: "hypnoticPatternArea";
      readonly cubeSideFeet: 30;
      readonly affectedCreatureWitnesses: readonly {
        readonly targetId: string;
        readonly inCube: true;
        readonly canSeePattern: true;
      }[];
      readonly areaId?: never;
      readonly sleepNonSleeperFacts?: never;
    }
  | {
      readonly kind: "slowArea";
      readonly cubeSideFeet: 40;
      readonly affectedCreatureWitnesses: readonly {
        readonly targetId: string;
        readonly inCube: true;
        readonly chosenByCaster: true;
      }[];
      readonly areaId?: never;
      readonly sleepNonSleeperFacts?: never;
    }
  | {
      readonly kind: "greaseGroundArea";
      readonly areaId: string;
      readonly sleepNonSleeperFacts?: never;
    }
  | {
      readonly kind: "gustOfWindLineArea";
      readonly areaId: string;
      readonly directionId: string;
      readonly creaturePushes: readonly {
        readonly targetId: string;
        readonly disposition:
          | {
              readonly kind: "pushed";
              readonly distanceFeet: number;
              readonly destinationId: string;
              readonly provokesOpportunityAttacks: false;
            }
          | {
              readonly kind: "blocked";
              readonly distanceFeet: number;
              readonly reason: "blocked" | "noLegalDestination";
              readonly provokesOpportunityAttacks: false;
            };
      }[];
      readonly sleepNonSleeperFacts?: never;
    }
  | {
      readonly kind: "fireballArea";
      readonly objectIgnitionFacts: readonly {
        readonly objectId: string;
        readonly disposition:
          | { readonly kind: "flammableUnattended" }
          | { readonly kind: "notFlammable" }
          | { readonly kind: "wornOrCarried" };
      }[];
      readonly areaId?: never;
      readonly sleepNonSleeperFacts?: never;
    }
  | {
      readonly kind: "shatterArea";
      readonly nonmagicalUnattendedObjectDamageFacts: readonly {
        readonly objectId: string;
        readonly disposition:
          | { readonly kind: "hitPoints"; readonly hitPoints: number }
          | {
              readonly kind: "hitPointsWithDamageThreshold";
              readonly hitPoints: number;
              readonly damageThreshold: number;
            }
          | { readonly kind: "tableResolved" };
      }[];
      readonly areaId?: never;
      readonly sleepNonSleeperFacts?: never;
    }
  | {
      readonly kind: "thunderwaveArea";
      readonly creaturePushes: readonly {
        readonly targetId: string;
        readonly disposition:
          | {
              readonly kind: "pushed";
              readonly distanceFeet: number;
              readonly destinationId: string;
              readonly provokesOpportunityAttacks: false;
            }
          | {
              readonly kind: "blocked";
              readonly distanceFeet: number;
              readonly reason: "blocked" | "noLegalDestination";
              readonly provokesOpportunityAttacks: false;
            };
      }[];
      readonly unsecuredObjectPushes: readonly {
        readonly objectId: string;
        readonly disposition:
          | {
              readonly kind: "pushed";
              readonly distanceFeet: number;
              readonly destinationId: string;
              readonly provokesOpportunityAttacks: false;
            }
          | {
              readonly kind: "blocked";
              readonly distanceFeet: number;
              readonly reason: "blocked" | "noLegalDestination";
              readonly provokesOpportunityAttacks: false;
            };
      }[];
      readonly audibleBoom: {
        readonly sound: "thunderous boom";
        readonly audibleRadiusFeet: number;
      };
      readonly areaId?: never;
      readonly sleepNonSleeperFacts?: never;
    }
);

type BattleD20TestRolledD20sEncoded = {
  readonly first: number;
  readonly second: number;
  readonly selected: "first" | "second";
};

type BattleD20TestNaturalOneRerollDecisionEncoded =
  | {
      readonly kind: "decline";
      readonly effectKind: "d20_test_natural_one_reroll";
    }
  | {
      readonly kind: "reroll";
      readonly effectKind: "d20_test_natural_one_reroll";
      readonly replacement: {
        readonly total: number;
        readonly naturalD20: number;
        readonly rollMode?: (typeof ATTACK_ROLL_MODES)[number];
      };
    }
  | {
      readonly kind: "rerollRolledDie";
      readonly effectKind: "d20_test_natural_one_reroll";
      readonly replacement: {
        readonly die: "first" | "second";
        readonly naturalD20: number;
        readonly result: {
          readonly total: number;
          readonly naturalD20: number;
          readonly rollMode?: (typeof ATTACK_ROLL_MODES)[number];
        };
      };
    };

type BattleD20TestNaturalOneRerollOutcomeDecisionEncoded =
  | {
      readonly kind: "decline";
      readonly effectKind: "d20_test_natural_one_reroll";
    }
  | {
      readonly kind: "reroll";
      readonly effectKind: "d20_test_natural_one_reroll";
      readonly replacement: {
        readonly succeeded: boolean;
        readonly naturalD20: number;
      };
    }
  | {
      readonly kind: "rerollRolledDie";
      readonly effectKind: "d20_test_natural_one_reroll";
      readonly replacement: {
        readonly die: "first" | "second";
        readonly naturalD20: number;
        readonly result: {
          readonly succeeded: boolean;
          readonly naturalD20: number;
        };
      };
    };

type BattleInterruptAttackExecutionSelectionEncoded =
  | {
      readonly procedureRef: string;
      readonly attackAbility: Ability | "spellcasting";
      readonly attackDamageType: DamageType;
      readonly attackName?: never;
    }
  | {
      readonly procedureRef: string;
      readonly attackAbility?: never;
      readonly attackDamageType?: never;
      readonly attackName?: never;
    };

type BattleDamageRelationshipDecisionEncoded = {
  readonly questionId: string;
  readonly answer: boolean;
};
type BattleProcedureRelationshipFactEncoded =
  | {
      readonly kind: "attackRollTargetIsEnemy";
      readonly attackerId: string;
      readonly targetId: string;
      readonly targetIsEnemy: boolean;
    }
  | {
      readonly kind: "savingThrowTargetIsEnemy";
      readonly actorId: string;
      readonly targetId: string;
      readonly targetIsEnemy: boolean;
    }
  | {
      readonly kind: "spellTargetIsHostileToCaster";
      readonly casterId: string;
      readonly targetId: string;
      readonly sourceProcedureRef: string;
      readonly targetIsHostileToCaster: boolean;
    };

type BattleProcedureRelationshipFactsEncoded<
  Fact extends BattleProcedureRelationshipFactEncoded,
> = readonly [Fact, ...Fact[]];
type BattleAttackRollRelationshipFactsEncoded =
  BattleProcedureRelationshipFactsEncoded<
    Extract<
      BattleProcedureRelationshipFactEncoded,
      { readonly kind: "attackRollTargetIsEnemy" }
    >
  >;
type BattleSavingThrowRelationshipFactsEncoded =
  BattleProcedureRelationshipFactsEncoded<
    Extract<
      BattleProcedureRelationshipFactEncoded,
      { readonly kind: "savingThrowTargetIsEnemy" }
    >
  >;
type BattleTargetChoiceRelationshipFactsEncoded =
  BattleProcedureRelationshipFactsEncoded<
    Exclude<
      BattleProcedureRelationshipFactEncoded,
      { readonly kind: "spellTargetIsHostileToCaster" }
    >
  >;
type BattleSpellTargetListRelationshipFactsEncoded =
  BattleProcedureRelationshipFactsEncoded<
    Extract<
      BattleProcedureRelationshipFactEncoded,
      { readonly kind: "spellTargetIsHostileToCaster" }
    >
  >;

type BattleMovementFillValueCommonEncoded = Schema.Schema.Encoded<
  typeof BattleMovementFillValueCommonSchema
>;

type BattleOrdinaryMovementFillValueEncoded =
  BattleMovementFillValueCommonEncoded & {
    readonly commandApproach?: {
      readonly kind: "commandApproachShortestDirectRouteTowardCaster";
      readonly movedWithinFiveFeetOfCaster: boolean;
    };
    readonly commandFlee?: {
      readonly kind: "commandFleeFastestAvailableRouteAwayFromCaster";
    };
    readonly jumpMovementReplacement?: {
      readonly kind: "jumpMovementReplacement";
      readonly distanceFeet: number;
      readonly landing:
        | {
            readonly kind: "legalLanding";
            readonly difficultTerrainAcrobatics: "notRequired";
          }
        | {
            readonly kind: "legalLanding";
            readonly difficultTerrainAcrobatics: "passed";
          }
        | {
            readonly kind: "legalLanding";
            readonly difficultTerrainAcrobatics: "failed";
          };
    };
    readonly levitatedMovement?: {
      readonly kind: "levitatedMovement";
      readonly sourceCombatantId: string;
      readonly sourceProcedureRef: string;
      readonly fixedObjectOrSurfaceWithinReach: true;
      readonly altitudeChange?: {
        readonly direction: "up" | "down";
        readonly distanceFeet: number;
      };
    };
    readonly brutalStrikeForcefulBlow?: never;
    readonly additionalSpeedSegments?: never;
  };
type BattleBrutalStrikeForcefulBlowMovementValueEncoded =
  BattleMovementFillValueCommonEncoded & {
    readonly commandApproach?: never;
    readonly commandFlee?: never;
    readonly jumpMovementReplacement?: never;
    readonly levitatedMovement?: never;
    readonly brutalStrikeForcefulBlow: {
      readonly kind: "brutalStrikeForcefulBlowStraightTowardTarget";
      readonly targetId: string;
    };
    readonly additionalSpeedSegments: readonly BattleMovementFillValueCommonEncoded[];
  };
type BattleMovementFillValueEncoded =
  | BattleOrdinaryMovementFillValueEncoded
  | BattleBrutalStrikeForcefulBlowMovementValueEncoded;

type BattleReadyResponseEncoded = Schema.Schema.Encoded<
  typeof BattleReadyResponseSchema
>;

type BattleFillEncoded =
  | {
      readonly kind: "readyDeclaration";
      readonly holeId: string;
      readonly value: {
        readonly trigger: string;
        readonly response: BattleReadyResponseEncoded;
      };
    }
  | {
      readonly kind: "helpAttackAllyDecision";
      readonly holeId: string;
      readonly allyId: string;
    }
  | {
      readonly kind: "helpAttackEnemyDecision";
      readonly holeId: string;
      readonly targetEnemyId: string;
      readonly targetWithinFiveFeetOfHelper: boolean;
    }
  | {
      readonly kind: "targetChoice";
      readonly holeId: string;
      readonly value: string;
      readonly spatialFacts?: readonly BattleTargetSpatialFactEncoded[];
      readonly relationshipFacts?: BattleTargetChoiceRelationshipFactsEncoded;
    }
  | {
      readonly kind: "damageRelationshipDecisions";
      readonly holeId: string;
      readonly answers: readonly [
        BattleDamageRelationshipDecisionEncoded,
        ...BattleDamageRelationshipDecisionEncoded[],
      ];
    }
  | {
      readonly kind: "targetSpatialFacts";
      readonly holeId: string;
      readonly spatialFacts: readonly BattleTargetSpatialFactEncoded[];
    }
  | {
      readonly kind: "slowSomaticSpellFailureOutcome";
      readonly holeId: string;
      readonly value: {
        readonly spellFailed: boolean;
      };
    }
  | {
      readonly kind: "objectTargetChoice";
      readonly holeId: string;
      readonly value: string;
      readonly spatialFacts: readonly (
        | BattleAttackObjectTargetSpatialFactEncoded
        | {
            readonly kind: "spellObjectTarget";
            readonly casterId: string;
            readonly objectId: string;
            readonly sourceProcedureRef: string;
            readonly rangeFeet: number;
            readonly armorClass: number;
            readonly damageDisposition:
              | { readonly kind: "hitPoints"; readonly hitPoints: number }
              | {
                  readonly kind: "hitPointsWithDamageThreshold";
                  readonly hitPoints: number;
                  readonly damageThreshold: number;
                }
              | { readonly kind: "tableResolved" };
          }
        | {
            readonly kind: "spellObjectIgnition";
            readonly casterId: string;
            readonly objectId: string;
            readonly sourceProcedureRef: string;
            readonly disposition:
              | { readonly kind: "flammableUnattended" }
              | { readonly kind: "notFlammable" }
              | { readonly kind: "wornOrCarried" };
          }
        | {
            readonly kind: "spellObjectTargetSight";
            readonly casterId: string;
            readonly objectId: string;
            readonly sourceProcedureRef: string;
            readonly attackerCanSeeObject: boolean;
          }
        | {
            readonly kind: "spellObjectLightTarget";
            readonly casterId: string;
            readonly objectId: string;
            readonly sourceProcedureRef: string;
            readonly size:
              | "tiny"
              | "small"
              | "medium"
              | "large"
              | "huge"
              | "gargantuan";
            readonly wornOrCarried:
              | { readonly kind: "nobody" }
              | { readonly kind: "caster" }
              | {
                  readonly kind: "someoneElse";
                  readonly relation: "worn" | "carried";
                };
          }
        | {
            readonly kind: "spellDistantObjectLightTarget";
            readonly casterId: string;
            readonly objectId: string;
            readonly sourceProcedureRef: string;
            readonly rangeFeet: number;
            readonly size:
              | "tiny"
              | "small"
              | "medium"
              | "large"
              | "huge"
              | "gargantuan";
            readonly wornOrCarried:
              | { readonly kind: "nobody" }
              | { readonly kind: "caster" }
              | {
                  readonly kind: "someoneElse";
                  readonly relation: "worn" | "carried";
                };
          }
        | {
            readonly kind: "spellTouchedObjectTarget";
            readonly casterId: string;
            readonly objectId: string;
            readonly sourceProcedureRef: string;
          }
        | {
            readonly kind: "spellDistantTouchedObjectTarget";
            readonly casterId: string;
            readonly objectId: string;
            readonly sourceProcedureRef: string;
            readonly rangeFeet: number;
          }
        | {
            readonly kind: "spellManufacturedMetalObjectTarget";
            readonly casterId: string;
            readonly objectId: string;
            readonly sourceProcedureRef: string;
            readonly rangeFeet: number;
            readonly casterCanSeeObject: true;
          }
      )[];
    }
  | {
      readonly kind: "wildShapeEquipmentDisposition";
      readonly holeId: string;
      readonly value: {
        readonly formLimbs: {
          readonly kind: "canHandleObjects" | "cannotHandleObjects";
        };
        readonly choices: readonly WildShapeEquipmentDispositionChoiceEncoded[];
      };
    }
  | {
      readonly kind: "ongoingSpellTargetChoice";
      readonly holeId: string;
      readonly value:
        | {
            readonly kind: "combatant";
            readonly combatantId: string;
          }
        | {
            readonly kind: "object";
            readonly objectId: string;
          }
        | {
            readonly kind: "magicalEffect";
            readonly effect:
              | {
                  readonly kind: "spellLightEmitter";
                  readonly sourceEffectId: string;
                }
              | {
                  readonly kind: "spellActiveEffect";
                  readonly activeEffectKind:
                    | "spellObjectContactDamage"
                    | "spiritualWeapon";
                  readonly effectRef: string;
                }
              | {
                  readonly kind: "antimagicFieldAura";
                  readonly areaId: string;
                  readonly sourceCombatantId: string;
                };
          };
      readonly spatialFacts: readonly {
        readonly kind: "ongoingSpellTargetWithinRange";
        readonly casterId: string;
        readonly sourceProcedureRef: string;
        readonly target:
          | {
              readonly kind: "combatant";
              readonly combatantId: string;
            }
          | {
              readonly kind: "object";
              readonly objectId: string;
            }
          | {
              readonly kind: "magicalEffect";
              readonly effect:
                | {
                    readonly kind: "spellLightEmitter";
                    readonly sourceEffectId: string;
                  }
                | {
                    readonly kind: "spellActiveEffect";
                    readonly activeEffectKind:
                      | "spellObjectContactDamage"
                      | "spiritualWeapon";
                    readonly effectRef: string;
                  }
                | {
                    readonly kind: "antimagicFieldAura";
                    readonly areaId: string;
                    readonly sourceCombatantId: string;
                  };
            };
        readonly rangeFeet: number;
      }[];
    }
  | {
      readonly kind: "objectContactTargets";
      readonly holeId: string;
      readonly value: {
        readonly targetIds: readonly string[];
      };
      readonly spatialFacts: readonly (
        | {
            readonly kind: "spellObjectPhysicalContact";
            readonly sourceCombatantId: string;
            readonly sourceProcedureRef: string;
            readonly objectId: string;
            readonly targetId: string;
          }
        | {
            readonly kind: "spellObjectWithinSpellRange";
            readonly sourceCombatantId: string;
            readonly sourceProcedureRef: string;
            readonly objectId: string;
            readonly rangeFeet: number;
          }
        | {
            readonly kind: "spellObjectHoldingOrWearing";
            readonly sourceCombatantId: string;
            readonly sourceProcedureRef: string;
            readonly objectId: string;
            readonly targetId: string;
            readonly relation: "holding" | "wearing";
          }
      )[];
    }
  | {
      readonly kind: "objectDropResolution";
      readonly holeId: string;
      readonly value: {
        readonly outcomes: readonly (
          | {
              readonly targetId: string;
              readonly capability: { readonly kind: "canDrop" };
              readonly result: { readonly kind: "dropped" };
            }
          | {
              readonly targetId: string;
              readonly capability: { readonly kind: "cannotDrop" };
              readonly result: { readonly kind: "notDropped" };
            }
        )[];
      };
    }
  | {
      readonly kind: "magicWeaponTargetItem";
      readonly holeId: string;
      readonly value: {
        readonly kind: "nonmagicalWeaponItem";
        readonly holderCombatantId: string;
        readonly itemId: string;
      };
    }
  | {
      readonly kind: "damageTypeChoice";
      readonly holeId: string;
      readonly value: DamageType;
    }
  | {
      readonly kind: "conditionChoice";
      readonly holeId: string;
      readonly value: (typeof ALL_CONDITIONS)[number];
    }
  | {
      readonly kind: "spellAreaChoice";
      readonly holeId: string;
      readonly value:
        | {
            readonly kind: "fogCloudArea";
            readonly areaId: string;
            readonly originAnchor:
              | { readonly kind: "tableSelectedPoint" }
              | { readonly kind: "combatant"; readonly combatantId: string };
          }
        | {
            readonly kind: "magicalDarknessArea";
            readonly areaId: string;
            readonly originAnchor:
              | { readonly kind: "tableSelectedPoint" }
              | { readonly kind: "combatant"; readonly combatantId: string };
            readonly spellCreatedLightOverlaps: readonly {
              readonly kind: "spellCreatedLightOverlapsArea";
              readonly sourceEffectId: string;
            }[];
          }
        | {
            readonly kind: "antimagicFieldSelfEmanation";
            readonly areaId: string;
            readonly auraMembership: {
              readonly kind: "antimagicFieldAuraMembership";
              readonly originIncluded: boolean;
              readonly nonOriginCombatantIds: readonly string[];
            };
            readonly affectedOngoingSpellEffects: readonly {
              readonly kind: "antimagicFieldAffectedOngoingSpellEffect";
              readonly effect:
                | {
                    readonly kind: "spellLightEmitter";
                    readonly sourceEffectId: string;
                  }
                | {
                    readonly kind: "spellActiveEffect";
                    readonly activeEffectKind:
                      | "spellObjectContactDamage"
                      | "spiritualWeapon";
                    readonly effectRef: string;
                  };
              readonly sourceKind: "ordinarySpell" | "artifact" | "deity";
            }[];
          }
        | {
            readonly kind: "webCubeArea";
            readonly areaId: string;
            readonly originAnchor:
              | { readonly kind: "tableSelectedPoint" }
              | { readonly kind: "combatant"; readonly combatantId: string };
          }
        | {
            readonly kind: "sleetStormCylinderArea";
            readonly areaId: string;
          }
        | {
            readonly kind: "insectPlagueSphereArea";
            readonly areaId: string;
          }
        | {
            readonly kind: "cloudkillSphereArea";
            readonly areaId: string;
          }
        | {
            readonly kind: "flamingSphereArea";
            readonly areaId: string;
            readonly originAnchor:
              | { readonly kind: "tableSelectedPoint" }
              | { readonly kind: "combatant"; readonly combatantId: string };
          }
        | {
            readonly kind: "spikeGrowthArea";
            readonly areaId: string;
            readonly originAnchor:
              | { readonly kind: "tableSelectedPoint" }
              | { readonly kind: "combatant"; readonly combatantId: string };
          }
        | {
            readonly kind: "moonbeamCylinderArea";
            readonly areaId: string;
            readonly originAnchor:
              | { readonly kind: "tableSelectedPoint" }
              | { readonly kind: "combatant"; readonly combatantId: string };
          }
        | {
            readonly kind: "gustOfWindLineArea";
            readonly areaId: string;
            readonly directionId: string;
          };
    }
  | {
      readonly kind: "gustOfWindLineDirectionChoice";
      readonly holeId: string;
      readonly value: {
        readonly directionId: string;
      };
    }
  | {
      readonly kind: "movableZoneRamMovement";
      readonly holeId: string;
      readonly value: {
        readonly moveFeet: number;
      };
    }
  | {
      readonly kind: "movableZoneRepositionMovement";
      readonly holeId: string;
      readonly value: {
        readonly moveFeet: number;
      };
    }
  | {
      readonly kind: "teleportDestination";
      readonly holeId: string;
      readonly value: {
        readonly kind: "unoccupiedVisibleDestination";
        readonly actorId: string;
        readonly sourceProcedureRef: string;
        readonly destinationId: string;
        readonly distanceFeet: number;
        readonly antimagicFieldTransit: readonly {
          readonly kind: "antimagicFieldTransit";
          readonly areaId: string;
          readonly sourceCombatantId: string;
          readonly originInsideAura: boolean;
          readonly destinationInsideAura: boolean;
        }[];
      };
    }
  | {
      readonly kind: "spiritualWeaponForcePosition";
      readonly holeId: string;
      readonly value:
        | {
            readonly mode: "cast";
            readonly positionId: string;
            readonly distanceFromCasterFeet: number;
          }
        | {
            readonly mode: "reposition";
            readonly positionId: string;
            readonly moveDistanceFeet: number;
          };
    }
  | {
      readonly kind: "spellTargetAllocation";
      readonly holeId: string;
      readonly value: {
        readonly allocations: readonly {
          readonly targetId: string;
          readonly count: number;
        }[];
      };
      readonly spatialFacts: readonly (
        | {
            readonly kind: "spellTarget";
            readonly casterId: string;
            readonly targetId: string;
            readonly sourceProcedureRef: string;
          }
        | {
            readonly kind: "reactionSpellDamagerVisibleWithinRange";
            readonly reactorId: string;
            readonly damageSourceId: string;
            readonly sourceProcedureRef: string;
            readonly rangeFeet: number;
          }
      )[];
    }
  | {
      readonly kind: "spellTargetList";
      readonly holeId: string;
      readonly value: {
        readonly targetIds: readonly string[];
      };
      readonly spatialFacts: readonly (
        | {
            readonly kind: "spellTarget";
            readonly casterId: string;
            readonly targetId: string;
            readonly sourceProcedureRef: string;
          }
        | {
            readonly kind: "spellTargetKnownWilling";
            readonly casterId: string;
            readonly targetId: string;
            readonly sourceProcedureRef: string;
          }
        | {
            readonly kind: "spellTargetsInPointOriginSphere";
            readonly casterId: string;
            readonly sourceProcedureRef: string;
            readonly areaId: string;
            readonly radiusFeet: number;
            readonly targetIds: readonly string[];
          }
        | {
            readonly kind: "featherFallTargetFallingWithinRange";
            readonly casterId: string;
            readonly targetId: string;
            readonly sourceProcedureRef: string;
            readonly rangeFeet: number;
          }
      )[];
      readonly relationshipFacts?: BattleSpellTargetListRelationshipFactsEncoded;
    }
  | {
      readonly kind: "attackRoll";
      readonly holeId: string;
      readonly value: {
        readonly total: number;
        readonly naturalD20: number;
        readonly rollMode?: (typeof ATTACK_ROLL_MODES)[number];
        readonly rolledD20s?: BattleD20TestRolledD20sEncoded;
        readonly activatedOngoingFeatureProcedureRef?: string;
        readonly missToHitReplacementProcedureRef?: string;
        readonly d20TestNaturalOneReroll?: BattleD20TestNaturalOneRerollDecisionEncoded;
      };
      readonly relationshipFacts?: BattleAttackRollRelationshipFactsEncoded;
    }
  | {
      readonly kind: "savingThrowOutcome";
      readonly holeId: string;
      readonly value:
        | {
            readonly area: BattleSpellAreaChoiceEncoded;
            readonly outcomes: readonly {
              readonly targetId: string;
              readonly succeeded: boolean;
              readonly naturalD20?: number;
              readonly rolledD20s?: BattleD20TestRolledD20sEncoded;
              readonly withoutRoll?: true;
              readonly d20TestNaturalOneReroll?: BattleD20TestNaturalOneRerollOutcomeDecisionEncoded;
            }[];
          }
        | {
            readonly area?: never;
            readonly outcomes: readonly {
              readonly targetId: string;
              readonly succeeded: boolean;
              readonly naturalD20?: number;
              readonly rolledD20s?: BattleD20TestRolledD20sEncoded;
              readonly withoutRoll?: true;
              readonly d20TestNaturalOneReroll?: BattleD20TestNaturalOneRerollOutcomeDecisionEncoded;
            }[];
          };
      readonly relationshipFacts?: BattleSavingThrowRelationshipFactsEncoded;
    }
  | {
      readonly kind: "skillChoice";
      readonly holeId: string;
      readonly value: Skill;
    }
  | {
      readonly kind: "abilityChoice";
      readonly holeId: string;
      readonly value: Ability;
    }
  | {
      readonly kind: "targetAbilityChoices";
      readonly holeId: string;
      readonly value: {
        readonly choices: readonly {
          readonly targetId: string;
          readonly ability: Ability;
        }[];
      };
    }
  | {
      readonly kind: "thaumaturgyActiveOneMinuteEffectCount";
      readonly holeId: string;
      readonly value: {
        readonly activeOneMinuteEffectCount: number;
      };
    }
  | {
      readonly kind: "commandOptionChoice";
      readonly holeId: string;
      readonly value: (typeof COMMAND_OPTIONS)[number];
    }
  | {
      readonly kind: "selfTransformationModeChoice";
      readonly holeId: string;
      readonly value: (typeof SELF_TRANSFORMATION_MODE_KINDS)[number];
    }
  | {
      readonly kind: "dancingLightsPlacement";
      readonly holeId: string;
      readonly value:
        | {
            readonly mode: "cast";
            readonly form: "separateLights";
            readonly lights: readonly {
              readonly positionId: string;
              readonly distanceFromCasterFeet: number;
              readonly nearestSiblingDistanceFeet?: number;
            }[];
          }
        | {
            readonly mode: "cast";
            readonly form: "combinedMediumForm";
            readonly light: {
              readonly positionId: string;
              readonly distanceFromCasterFeet: number;
              readonly nearestSiblingDistanceFeet?: number;
            };
          }
        | {
            readonly mode: "reposition";
            readonly form: "separateLights";
            readonly lights: readonly {
              readonly lightId: string;
              readonly positionId: string;
              readonly distanceFromCasterFeet: number;
              readonly moveDistanceFeet: number;
              readonly nearestSiblingDistanceFeet?: number;
            }[];
          }
        | {
            readonly mode: "reposition";
            readonly form: "combinedMediumForm";
            readonly light: {
              readonly lightId: string;
              readonly positionId: string;
              readonly distanceFromCasterFeet: number;
              readonly moveDistanceFeet: number;
              readonly nearestSiblingDistanceFeet?: number;
            };
          };
    }
  | {
      readonly kind: "unitFeatureDecision";
      readonly holeId: string;
      readonly value:
        | "use"
        | "attempt"
        | (typeof BRUTAL_STRIKE_EFFECT_DECISION_CHOICES)[number]
        | (typeof OPEN_HAND_TECHNIQUE_DECISION_CHOICES)[number]
        | (typeof TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES)[number];
    }
  | {
      readonly kind: "hitPointHealingDistribution";
      readonly holeId: string;
      readonly value: {
        readonly allocations: readonly {
          readonly targetId: string;
          readonly hitPoints: number;
        }[];
      };
      readonly spatialFacts: readonly BattleTargetSpatialFactEncoded[];
    }
  | {
      readonly kind: "heldObjectFacts";
      readonly holeId: string;
      readonly value: {
        readonly objectIds: readonly string[];
      };
    }
  | {
      readonly kind: "toolPossessionFacts";
      readonly holeId: string;
      readonly value: {
        readonly toolIdsOnPerson: readonly "poisoners_kit"[];
      };
    }
  | {
      readonly kind: "cunningStrikeEndTurnCoverFacts";
      readonly holeId: string;
      readonly value: {
        readonly cover: (typeof CUNNING_STRIKE_END_TURN_COVER_DEGREES)[number];
      };
    }
  | {
      readonly kind: "findFamiliarConnection";
      readonly holeId: string;
      readonly value: {
        readonly withinRange: true;
      };
    }
  | {
      readonly kind: "companionReappearancePlacement";
      readonly holeId: string;
      readonly value: BattleCompanionPlacementEncoded;
    }
  | {
      readonly kind: "companionReappearanceInitiative";
      readonly holeId: string;
      readonly value: number;
    }
  | {
      readonly kind: "rolledDice";
      readonly holeId: string;
      readonly selectedAttackDamageRiderProcedureRefs?: readonly string[];
      readonly cunningStrikeOption?: {
        readonly procedureRef: string;
        readonly optionId: (typeof BATTLE_CUNNING_STRIKE_OPTION_SELECTION_IDS)[number];
      };
      readonly weaponDamageDiceRollChoice?: WeaponDamageDiceRollChoiceFillEncoded;
      readonly attackDamageDieFloorChoice?: AttackDamageDieFloorChoiceFillEncoded;
      readonly attackDamageAbilityModifierChoice?: AttackDamageAbilityModifierChoiceFillEncoded;
      readonly value: readonly [
        {
          readonly results: readonly number[];
        },
        ...{
          readonly results: readonly number[];
        }[],
      ];
    }
  | {
      readonly kind: "rolledDice";
      readonly holeId: string;
      readonly spikeGrowthMovement: {
        readonly targetId: string;
        readonly sourceProcedureRef: string;
        readonly sourceCombatantId: string;
        readonly areaId: string;
        readonly distanceFeet: number;
        readonly damage: {
          readonly expr: {
            readonly dice: number;
            readonly dieSize: number;
            readonly flat?: number;
            readonly spellcastingMod?: true;
            readonly abilityModifier?: Ability;
          };
          readonly damageType: "piercing";
        };
      };
      readonly value: readonly [
        {
          readonly results: readonly number[];
        },
        ...{
          readonly results: readonly number[];
        }[],
      ];
    }
  | {
      readonly kind: "deathSavingThrow";
      readonly holeId: string;
      readonly value: number;
      readonly d20TestNaturalOneReroll?:
        | {
            readonly kind: "decline";
            readonly effectKind: "d20_test_natural_one_reroll";
          }
        | {
            readonly kind: "reroll";
            readonly effectKind: "d20_test_natural_one_reroll";
            readonly replacement: number;
          };
    }
  | {
      readonly kind: "statBlockRechargeRoll";
      readonly holeId: string;
      readonly value: readonly {
        readonly target: string;
        readonly roll: number;
      }[];
    }
  | {
      readonly kind: "concentrationSavingThrow";
      readonly holeId: string;
      readonly value: {
        readonly succeeded: boolean;
        readonly naturalD20?: number;
        readonly rolledD20s?: BattleD20TestRolledD20sEncoded;
        readonly withoutRoll?: true;
        readonly d20TestNaturalOneReroll?: BattleD20TestNaturalOneRerollOutcomeDecisionEncoded;
      };
    }
  | {
      readonly kind: "attackDamageDisposition";
      readonly holeId: string;
      readonly value:
        | { readonly kind: "ordinaryDamage" }
        | { readonly kind: "knockOut" }
        | {
            readonly kind: "zeroHitPointReplacement";
            readonly procedureRef: string;
            readonly unitId?: never;
          };
    }
  | {
      readonly kind: "sanctuaryInterdictionOutcome";
      readonly holeId: string;
      readonly value:
        | { readonly saveSucceeded: true }
        | {
            readonly saveSucceeded: false;
            readonly outcome:
              | { readonly kind: "loseAttackOrSpell" }
              | ({
                  readonly kind: "newTarget";
                  readonly targetId: string;
                  readonly spatialFacts: readonly BattleTargetSpatialFactEncoded[];
                } & (
                  | {
                      readonly replacementTargetKind: "attackRoll";
                      readonly relationshipFacts?: BattleAttackRollRelationshipFactsEncoded;
                    }
                  | { readonly replacementTargetKind: "nonAttack" }
                ));
          };
    }
  | {
      readonly kind: "interruptDecision";
      readonly holeId: string;
      readonly value:
        | {
            readonly kind: "decline";
            readonly responderId: string;
          }
        | {
            readonly kind: "resolve";
            readonly responderId: string;
            readonly choice:
              | {
                  readonly kind: "releaseReadiedSpell";
                  readonly procedureRef: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "releaseReadiedMovement";
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "releaseReadiedAction";
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "releaseReadiedAttack";
                  readonly targetId: string;
                  readonly procedureRef: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "castTriggeredReactionSpell";
                  readonly procedureRef: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "castAttackHitBonusActionSpell";
                  readonly procedureRef: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "opportunityAttack";
                  readonly selection: BattleInterruptAttackExecutionSelectionEncoded;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "retaliationAttack";
                  readonly selection: BattleInterruptAttackExecutionSelectionEncoded;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "reactionRollOrDamageReduction";
                  readonly procedureRef: string;
                  readonly modifierKind:
                    | "attackRollReduction"
                    | "abilityCheckReduction"
                    | "damageRollReduction"
                    | "attackDamageReduction"
                    | "fallDamageReduction";
                  readonly fills: readonly BattleFillEncoded[];
                };
          };
    }
  | {
      readonly kind: "movement";
      readonly holeId: string;
      readonly value: BattleMovementFillValueEncoded;
    }
  | {
      readonly kind: "levitateAltitudeChange";
      readonly holeId: string;
      readonly value: {
        readonly direction: "up" | "down";
        readonly distanceFeet: number;
      };
      readonly spatialFacts: readonly BattleTargetSpatialFactEncoded[];
    }
  | {
      readonly kind: "levitateInitialRise";
      readonly holeId: string;
      readonly value: {
        readonly distanceFeet: number;
      };
    }
  | {
      readonly kind: "abilityCheck";
      readonly holeId: string;
      readonly value: {
        readonly total: number;
        readonly naturalD20?: number;
        readonly rolledD20s?: BattleD20TestRolledD20sEncoded;
        readonly d20TestNaturalOneReroll?: BattleD20TestNaturalOneRerollDecisionEncoded;
      };
      readonly spatialFacts?: readonly {
        readonly kind: "spellRestraintEscapeActorWithinTargetReach";
        readonly actorId: string;
        readonly targetId: string;
      }[];
    }
  | {
      readonly kind: "grappleOutcome";
      readonly holeId: string;
      readonly value: {
        readonly succeeded: boolean;
      };
      readonly relationshipFacts?: BattleSavingThrowRelationshipFactsEncoded;
    }
  | {
      readonly kind: "shoveOutcome";
      readonly holeId: string;
      readonly value:
        | { readonly succeeded: true }
        | {
            readonly succeeded: false;
            readonly failedEffect:
              | { readonly kind: "prone" }
              | {
                  readonly kind: "pushAway";
                  readonly disposition:
                    | {
                        readonly kind: "pushed";
                        readonly distanceFeet: number;
                        readonly destinationId: string;
                        readonly provokesOpportunityAttacks: false;
                      }
                    | {
                        readonly kind: "blocked";
                        readonly distanceFeet: number;
                        readonly reason: "blocked" | "noLegalDestination";
                        readonly provokesOpportunityAttacks: false;
                      };
                };
          };
      readonly relationshipFacts?: BattleSavingThrowRelationshipFactsEncoded;
    };

const BattleMovementFillValueCommonSchemaFields = {
  speedKind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
  movementCostFeet: MovementFeet,
  provokedOpportunityAttacks: Schema.Array(
    Schema.extend(
      Schema.Struct({ reactorId: CombatantId, distanceFeet: MovementFeet }),
      BattleInterruptAttackExecutionSelectionSchema,
    ),
  ),
  acrobaticMovement: Schema.optionalWith(
    Schema.Struct({
      kind: Schema.Literal("acrobaticMovement"),
      paths: Schema.NonEmptyArray(
        Schema.Literal("alongVerticalSurface", "acrossLiquid"),
      ),
      withoutFallingDuringMovement: Schema.Literal(true),
    }),
    { exact: true },
  ),
  areaDifficultTerrain: Schema.optionalWith(
    Schema.Struct({
      kind: Schema.Literal("areaDifficultTerrain"),
      sources: Schema.Array(
        Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("greaseGroundHazard"),
            sourceCombatantId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            areaId: BattleAreaId,
          }),
          Schema.Struct({
            kind: Schema.Literal("webAreaHazard"),
            sourceCombatantId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            areaId: BattleAreaId,
          }),
          Schema.Struct({
            kind: Schema.Literal("sleetStormHazard"),
            sourceCombatantId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            areaId: BattleAreaId,
          }),
          Schema.Struct({
            kind: Schema.Literal("insectPlagueHazard"),
            sourceCombatantId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            areaId: BattleAreaId,
          }),
          Schema.Struct({
            kind: Schema.Literal("spikeGrowthHazard"),
            sourceCombatantId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            areaId: BattleAreaId,
            damageDistanceFeet: MovementFeet,
          }),
        ),
      ),
      totalDistanceFeet: MovementFeet,
      difficultTerrainDistanceFeet: MovementFeet,
    }),
    { exact: true },
  ),
  gustOfWindLineMovement: Schema.optionalWith(
    Schema.Struct({
      kind: Schema.Literal("gustOfWindLineMovement"),
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      areaId: BattleAreaId,
      directionId: BattleLineDirectionId,
      totalDistanceFeet: MovementFeet,
      closerDistanceFeet: MovementFeet,
    }),
    { exact: true },
  ),
  grappleDrag: Schema.optionalWith(
    Schema.Struct({
      kind: Schema.Literal("grappleDrag"),
      totalDistanceFeet: MovementFeet,
      targets: Schema.NonEmptyArray(
        Schema.Struct({
          targetId: CombatantId,
          distanceFeet: MovementFeet,
        }),
      ),
    }),
    { exact: true },
  ),
  creatureSpaceTraversal: Schema.optionalWith(
    Schema.Struct({
      kind: Schema.Literal("occupiedCreatureSpaceTraversal"),
      occupiedSpaces: Schema.NonEmptyArray(
        Schema.Struct({
          occupantId: CombatantId,
          positionId: BattleTablePositionId,
        }),
      ),
      destination: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("unoccupiedSpace"),
          positionId: BattleTablePositionId,
        }),
        Schema.Struct({
          kind: Schema.Literal("occupiedCreatureSpace"),
          occupantId: CombatantId,
          positionId: BattleTablePositionId,
        }),
      ),
    }),
    { exact: true },
  ),
} as const;
const BattleMovementFillValueCommonSchema = Schema.Struct(
  BattleMovementFillValueCommonSchemaFields,
);

const BattleOrdinaryMovementFillValueSchema = Schema.Struct({
  ...BattleMovementFillValueCommonSchemaFields,
  commandApproach: Schema.optionalWith(
    Schema.Struct({
      kind: Schema.Literal("commandApproachShortestDirectRouteTowardCaster"),
      movedWithinFiveFeetOfCaster: Schema.Boolean,
    }),
    { exact: true },
  ),
  commandFlee: Schema.optionalWith(
    Schema.Struct({
      kind: Schema.Literal("commandFleeFastestAvailableRouteAwayFromCaster"),
    }),
    { exact: true },
  ),
  jumpMovementReplacement: Schema.optionalWith(
    Schema.Struct({
      kind: Schema.Literal("jumpMovementReplacement"),
      distanceFeet: MovementFeet,
      landing: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("legalLanding"),
          difficultTerrainAcrobatics: Schema.Literal("notRequired"),
        }),
        Schema.Struct({
          kind: Schema.Literal("legalLanding"),
          difficultTerrainAcrobatics: Schema.Literal("passed"),
        }),
        Schema.Struct({
          kind: Schema.Literal("legalLanding"),
          difficultTerrainAcrobatics: Schema.Literal("failed"),
        }),
      ),
    }),
    { exact: true },
  ),
  levitatedMovement: Schema.optionalWith(
    Schema.Struct({
      kind: Schema.Literal("levitatedMovement"),
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      fixedObjectOrSurfaceWithinReach: Schema.Literal(true),
      altitudeChange: Schema.optionalWith(
        Schema.Struct({
          direction: Schema.Literal("up", "down"),
          distanceFeet: MovementFeet,
        }),
        { exact: true },
      ),
    }),
    { exact: true },
  ),
  brutalStrikeForcefulBlow: Schema.optionalWith(Schema.Never, {
    exact: true,
  }),
  additionalSpeedSegments: Schema.optionalWith(Schema.Never, {
    exact: true,
  }),
});

const BattleBrutalStrikeForcefulBlowMovementValueSchema = Schema.Struct({
  ...BattleMovementFillValueCommonSchemaFields,
  commandApproach: Schema.optionalWith(Schema.Never, { exact: true }),
  commandFlee: Schema.optionalWith(Schema.Never, { exact: true }),
  jumpMovementReplacement: Schema.optionalWith(Schema.Never, { exact: true }),
  levitatedMovement: Schema.optionalWith(Schema.Never, { exact: true }),
  brutalStrikeForcefulBlow: BattleBrutalStrikeForcefulBlowMovementFactSchema,
  additionalSpeedSegments: Schema.Array(BattleMovementFillValueCommonSchema),
});

const BattleMovementFillValueSchema = Schema.Union(
  BattleOrdinaryMovementFillValueSchema,
  BattleBrutalStrikeForcefulBlowMovementValueSchema,
);

export const BattleInterruptDecisionFillSchema = Schema.suspend(() =>
  Schema.Struct({
    kind: Schema.Literal("interruptDecision"),
    holeId: BattleHoleIdSchema,
    value: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("decline"),
        responderId: CombatantId,
      }),
      Schema.Struct({
        kind: Schema.Literal("resolve"),
        responderId: CombatantId,
        choice: Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("releaseReadiedSpell"),
            procedureRef: BattleProcedureExecutionRef,
            fills: Schema.Array(BattleFillSchema),
          }),
          Schema.Struct({
            kind: Schema.Literal("releaseReadiedMovement"),
            fills: Schema.Array(BattleFillSchema),
          }),
          Schema.Struct({
            kind: Schema.Literal("releaseReadiedAction"),
            fills: Schema.Array(BattleFillSchema),
          }),
          Schema.Struct({
            kind: Schema.Literal("releaseReadiedAttack"),
            targetId: CombatantId,
            procedureRef: Schema.Union(
              BattleAttackProcedureExecutionRef,
              BattleStatBlockProcedureExecutionRef,
            ),
            fills: Schema.Array(BattleFillSchema),
          }),
          Schema.Struct({
            kind: Schema.Literal("castTriggeredReactionSpell"),
            procedureRef: BattleProcedureExecutionRef,
            fills: Schema.Array(BattleFillSchema),
          }),
          Schema.Struct({
            kind: Schema.Literal("castAttackHitBonusActionSpell"),
            procedureRef: BattleProcedureExecutionRef,
            fills: Schema.Array(BattleFillSchema),
          }),
          Schema.Struct({
            kind: Schema.Literal("opportunityAttack"),
            selection: BattleInterruptAttackExecutionSelectionSchema,
            fills: Schema.Array(BattleFillSchema),
          }),
          Schema.Struct({
            kind: Schema.Literal("retaliationAttack"),
            selection: BattleInterruptAttackExecutionSelectionSchema,
            fills: Schema.Array(BattleFillSchema),
          }),
          Schema.Struct({
            kind: Schema.Literal("reactionRollOrDamageReduction"),
            procedureRef: BattleProcedureExecutionRef,
            modifierKind: Schema.Literal(
              "attackRollReduction",
              "abilityCheckReduction",
              "damageRollReduction",
              "attackDamageReduction",
              "fallDamageReduction",
            ),
            fills: Schema.Array(BattleFillSchema),
          }),
        ),
      }),
    ),
  }).annotations({
    identifier: "BattleInterruptDecisionFill",
    parseOptions: { onExcessProperty: "error" },
  }),
).annotations({ identifier: "BattleInterruptDecisionFill" });

export const BattleFillSchema: Schema.Schema<
  BattleFill,
  BattleFillEncoded,
  never
> = Schema.suspend(() =>
  Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("readyDeclaration"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        trigger: ReadyTriggerDescription,
        response: BattleReadyResponseSchema,
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("helpAttackAllyDecision"),
      holeId: BattleHoleIdSchema,
      allyId: CombatantId,
    }),
    Schema.Struct({
      kind: Schema.Literal("helpAttackEnemyDecision"),
      holeId: BattleHoleIdSchema,
      targetEnemyId: CombatantId,
      targetWithinFiveFeetOfHelper: Schema.Boolean,
    }),
    Schema.Struct({
      kind: Schema.Literal("targetChoice"),
      holeId: BattleHoleIdSchema,
      value: CombatantId,
      spatialFacts: Schema.optionalWith(BattleTargetSpatialFactsSchema, {
        exact: true,
      }),
      relationshipFacts: Schema.optionalWith(
        BattleTargetChoiceRelationshipFactsSchema,
        { exact: true },
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("damageRelationshipDecisions"),
      holeId: BattleHoleIdSchema,
      answers: BattleDamageRelationshipDecisionsSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("targetSpatialFacts"),
      holeId: BattleHoleIdSchema,
      spatialFacts: BattleTargetSpatialFactsSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("slowSomaticSpellFailureOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        spellFailed: Schema.Boolean,
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("hitPointHealingDistribution"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        allocations: Schema.Array(
          Schema.Struct({
            targetId: CombatantId,
            hitPoints: HpSchema,
          }),
        ),
      }),
      spatialFacts: BattleTargetSpatialFactsSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("objectTargetChoice"),
      holeId: BattleHoleIdSchema,
      value: BattleObjectId,
      spatialFacts: Schema.Array(
        Schema.Union(
          BattleAttackObjectTargetSpatialFactSchema,
          Schema.Struct({
            kind: Schema.Literal("spellObjectTarget"),
            casterId: CombatantId,
            objectId: BattleObjectId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            rangeFeet: MovementFeet,
            armorClass: BattleArmorClassSchema,
            damageDisposition: BattleObjectDamageDispositionSchema,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellObjectIgnition"),
            casterId: CombatantId,
            objectId: BattleObjectId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            disposition: BattleObjectIgnitionDispositionSchema,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellObjectTargetSight"),
            casterId: CombatantId,
            objectId: BattleObjectId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            attackerCanSeeObject: Schema.Boolean,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellObjectLightTarget"),
            casterId: CombatantId,
            objectId: BattleObjectId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            size: Schema.Literal(
              "tiny",
              "small",
              "medium",
              "large",
              "huge",
              "gargantuan",
            ),
            wornOrCarried: Schema.Union(
              Schema.Struct({ kind: Schema.Literal("nobody") }),
              Schema.Struct({ kind: Schema.Literal("caster") }),
              Schema.Struct({
                kind: Schema.Literal("someoneElse"),
                relation: Schema.Literal("worn", "carried"),
              }),
            ),
          }),
          Schema.Struct({
            kind: Schema.Literal("spellDistantObjectLightTarget"),
            casterId: CombatantId,
            objectId: BattleObjectId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            rangeFeet: MovementFeet,
            size: Schema.Literal(
              "tiny",
              "small",
              "medium",
              "large",
              "huge",
              "gargantuan",
            ),
            wornOrCarried: Schema.Union(
              Schema.Struct({ kind: Schema.Literal("nobody") }),
              Schema.Struct({ kind: Schema.Literal("caster") }),
              Schema.Struct({
                kind: Schema.Literal("someoneElse"),
                relation: Schema.Literal("worn", "carried"),
              }),
            ),
          }),
          Schema.Struct({
            kind: Schema.Literal("spellTouchedObjectTarget"),
            casterId: CombatantId,
            objectId: BattleObjectId,
            sourceProcedureRef: BattleProcedureExecutionRef,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellDistantTouchedObjectTarget"),
            casterId: CombatantId,
            objectId: BattleObjectId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            rangeFeet: MovementFeet,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellManufacturedMetalObjectTarget"),
            casterId: CombatantId,
            objectId: BattleObjectId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            rangeFeet: MovementFeet,
            casterCanSeeObject: Schema.Literal(true),
          }),
        ),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("wildShapeEquipmentDisposition"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        formLimbs: WildShapeFormLimbObjectHandlingWitnessSchema,
        choices: Schema.Array(WildShapeEquipmentDispositionChoiceSchema),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("ongoingSpellTargetChoice"),
      holeId: BattleHoleIdSchema,
      value: BattleOngoingSpellTargetSchema,
      spatialFacts: Schema.Array(BattleOngoingSpellTargetWithinRangeFactSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("objectContactTargets"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        targetIds: Schema.Array(CombatantId),
      }),
      spatialFacts: Schema.Array(
        Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("spellObjectPhysicalContact"),
            sourceCombatantId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            objectId: BattleObjectId,
            targetId: CombatantId,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellObjectWithinSpellRange"),
            sourceCombatantId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            objectId: BattleObjectId,
            rangeFeet: MovementFeet,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellObjectHoldingOrWearing"),
            sourceCombatantId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            objectId: BattleObjectId,
            targetId: CombatantId,
            relation: Schema.Literal("holding", "wearing"),
          }),
        ),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("objectDropResolution"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        outcomes: Schema.Array(
          Schema.Union(
            Schema.Struct({
              targetId: CombatantId,
              capability: Schema.Struct({
                kind: Schema.Literal("canDrop"),
              }),
              result: Schema.Struct({
                kind: Schema.Literal("dropped"),
              }),
            }),
            Schema.Struct({
              targetId: CombatantId,
              capability: Schema.Struct({
                kind: Schema.Literal("cannotDrop"),
              }),
              result: Schema.Struct({
                kind: Schema.Literal("notDropped"),
              }),
            }),
          ),
        ),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("magicWeaponTargetItem"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        kind: Schema.Literal("nonmagicalWeaponItem"),
        holderCombatantId: CombatantId,
        itemId: BattleObjectId,
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("spellTargetAllocation"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        allocations: Schema.Array(
          Schema.Struct({
            targetId: CombatantId,
            count: Schema.Number.pipe(Schema.int(), Schema.greaterThan(0)),
          }),
        ),
      }),
      spatialFacts: Schema.Array(
        Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("spellTarget"),
            casterId: CombatantId,
            targetId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
          }),
          Schema.Struct({
            kind: Schema.Literal("reactionSpellDamagerVisibleWithinRange"),
            reactorId: CombatantId,
            damageSourceId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            rangeFeet: MovementFeet,
          }),
        ),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("spellTargetList"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        targetIds: Schema.Array(CombatantId),
      }),
      spatialFacts: Schema.Array(
        Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("spellTarget"),
            casterId: CombatantId,
            targetId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellTargetKnownWilling"),
            casterId: CombatantId,
            targetId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellTargetsInPointOriginSphere"),
            casterId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            areaId: BattleAreaId,
            radiusFeet: MovementFeet,
            targetIds: Schema.Array(CombatantId),
          }),
          Schema.Struct({
            kind: Schema.Literal("featherFallTargetFallingWithinRange"),
            casterId: CombatantId,
            targetId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            rangeFeet: MovementFeet,
          }),
        ),
      ),
      relationshipFacts: Schema.optionalWith(
        BattleSpellTargetListRelationshipFactsSchema,
        { exact: true },
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("attackRoll"),
      holeId: BattleHoleIdSchema,
      value: BattleAttackRollResultSchema,
      relationshipFacts: Schema.optionalWith(
        BattleAttackRollRelationshipFactsSchema,
        { exact: true },
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("damageTypeChoice"),
      holeId: BattleHoleIdSchema,
      value: DamageTypeSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("conditionChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literal(...ALL_CONDITIONS),
    }),
    Schema.Struct({
      kind: Schema.Literal("spellAreaChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("fogCloudArea"),
          areaId: BattleAreaId,
          originAnchor: BattleSpellAreaOriginAnchorSchema,
        }),
        Schema.Struct({
          kind: Schema.Literal("magicalDarknessArea"),
          areaId: BattleAreaId,
          originAnchor: BattleSpellAreaOriginAnchorSchema,
          spellCreatedLightOverlaps: Schema.Array(
            Schema.Struct({
              kind: Schema.Literal("spellCreatedLightOverlapsArea"),
              sourceEffectId: BattleSpellEffectOccurrenceId,
            }),
          ),
        }),
        Schema.Struct({
          kind: Schema.Literal("antimagicFieldSelfEmanation"),
          areaId: BattleAreaId,
          auraMembership: Schema.Struct({
            kind: Schema.Literal("antimagicFieldAuraMembership"),
            originIncluded: Schema.Boolean,
            nonOriginCombatantIds: Schema.Array(CombatantId),
          }),
          affectedOngoingSpellEffects: Schema.Array(
            Schema.Struct({
              kind: Schema.Literal("antimagicFieldAffectedOngoingSpellEffect"),
              effect: BattleAntimagicFieldOngoingSpellEffectRefSchema,
              sourceKind: Schema.Literal(
                ...BATTLE_ANTIMAGIC_FIELD_ONGOING_SPELL_EFFECT_SOURCE_KINDS,
              ),
            }),
          ),
        }),
        Schema.Struct({
          kind: Schema.Literal("webCubeArea"),
          areaId: BattleAreaId,
          originAnchor: BattleSpellAreaOriginAnchorSchema,
        }),
        Schema.Struct({
          kind: Schema.Literal("sleetStormCylinderArea"),
          areaId: BattleAreaId,
        }),
        Schema.Struct({
          kind: Schema.Literal("insectPlagueSphereArea"),
          areaId: BattleAreaId,
        }),
        Schema.Struct({
          kind: Schema.Literal("cloudkillSphereArea"),
          areaId: BattleAreaId,
        }),
        Schema.Struct({
          kind: Schema.Literal("flamingSphereArea"),
          areaId: BattleAreaId,
          originAnchor: BattleSpellAreaOriginAnchorSchema,
        }),
        Schema.Struct({
          kind: Schema.Literal("spikeGrowthArea"),
          areaId: BattleAreaId,
          originAnchor: BattleSpellAreaOriginAnchorSchema,
        }),
        Schema.Struct({
          kind: Schema.Literal("moonbeamCylinderArea"),
          areaId: BattleAreaId,
          originAnchor: BattleSpellAreaOriginAnchorSchema,
        }),
        Schema.Struct({
          kind: Schema.Literal("gustOfWindLineArea"),
          areaId: BattleAreaId,
          directionId: BattleLineDirectionId,
        }),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("gustOfWindLineDirectionChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        directionId: BattleLineDirectionId,
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("movableZoneRamMovement"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        moveFeet: MovementFeet,
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("movableZoneRepositionMovement"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        moveFeet: MovementFeet,
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("teleportDestination"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        kind: Schema.Literal("unoccupiedVisibleDestination"),
        actorId: CombatantId,
        sourceProcedureRef: BattleProcedureExecutionRef,
        destinationId: BattleTablePositionId,
        distanceFeet: MovementFeet,
        antimagicFieldTransit: Schema.Array(
          Schema.Struct({
            kind: Schema.Literal("antimagicFieldTransit"),
            areaId: BattleAreaId,
            sourceCombatantId: CombatantId,
            originInsideAura: Schema.Boolean,
            destinationInsideAura: Schema.Boolean,
          }),
        ),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("spiritualWeaponForcePosition"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union(
        Schema.Struct({
          mode: Schema.Literal("cast"),
          positionId: BattleTablePositionId,
          distanceFromCasterFeet: MovementFeet,
        }),
        Schema.Struct({
          mode: Schema.Literal("reposition"),
          positionId: BattleTablePositionId,
          moveDistanceFeet: MovementFeet,
        }),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("savingThrowOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union(
        Schema.Struct({
          area: BattleSpellAreaChoiceSchema,
          outcomes: Schema.Array(BattleSavingThrowOutcomeSchema),
        }),
        Schema.Struct({
          area: Schema.optionalWith(Schema.Never, { exact: true }),
          outcomes: Schema.Array(BattleSavingThrowOutcomeSchema),
          openHandTechniquePush: Schema.optionalWith(
            BattleShovePushOutcomeSchema,
            { exact: true },
          ),
        }),
      ),
      spatialFacts: Schema.optionalWith(BattleTargetSpatialFactsSchema, {
        exact: true,
      }),
      relationshipFacts: Schema.optionalWith(
        BattleSavingThrowRelationshipFactsSchema,
        { exact: true },
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("skillChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literal(...BATTLE_SURFACE_SKILLS),
    }),
    Schema.Struct({
      kind: Schema.Literal("abilityChoice"),
      holeId: BattleHoleIdSchema,
      value: AbilitySchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("targetAbilityChoices"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        choices: Schema.Array(
          Schema.Struct({
            targetId: CombatantId,
            ability: AbilitySchema,
          }),
        ),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("thaumaturgyActiveOneMinuteEffectCount"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        activeOneMinuteEffectCount: Schema.Number.pipe(
          Schema.int(),
          Schema.greaterThanOrEqualTo(0),
        ),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("commandOptionChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literal(...COMMAND_OPTIONS),
    }),
    Schema.Struct({
      kind: Schema.Literal("selfTransformationModeChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literal(...SELF_TRANSFORMATION_MODE_KINDS),
    }),
    Schema.Struct({
      kind: Schema.Literal("dancingLightsPlacement"),
      holeId: BattleHoleIdSchema,
      value: BattleDancingLightsPlacementValueSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("unitFeatureDecision"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literal(
        "use",
        "attempt",
        ...BRUTAL_STRIKE_EFFECT_DECISION_CHOICES,
        ...OPEN_HAND_TECHNIQUE_DECISION_CHOICES,
        ...TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES,
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("heldObjectFacts"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        objectIds: Schema.Array(BattleObjectId),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("toolPossessionFacts"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        toolIdsOnPerson: Schema.Array(Schema.Literal("poisoners_kit")),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("cunningStrikeEndTurnCoverFacts"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        cover: Schema.Literal(...CUNNING_STRIKE_END_TURN_COVER_DEGREES),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("findFamiliarConnection"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        withinRange: Schema.Literal(true),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("companionReappearancePlacement"),
      holeId: BattleHoleIdSchema,
      value: BattleCompanionPlacementSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("companionReappearanceInitiative"),
      holeId: BattleHoleIdSchema,
      value: InitiativeScoreSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("rolledDice"),
      holeId: BattleHoleIdSchema,
      selectedAttackDamageRiderProcedureRefs: Schema.optionalWith(
        Schema.Array(BattleProcedureExecutionRef),
        { exact: true },
      ),
      cunningStrikeOption: Schema.optionalWith(
        Schema.Struct({
          procedureRef: BattleProcedureExecutionRef,
          optionId: Schema.Literal(
            ...BATTLE_CUNNING_STRIKE_OPTION_SELECTION_IDS,
          ),
        }),
        { exact: true },
      ),
      weaponDamageDiceRollChoice: Schema.optionalWith(
        Schema.Struct({
          procedureRef: BattleProcedureExecutionRef,
          unitId: Schema.optionalWith(Schema.Never, { exact: true }),
          selection: Schema.Literal("first", "second"),
          candidates: Schema.Tuple(
            BattleNonEmptyRolledDiceGroupSchema,
            BattleNonEmptyRolledDiceGroupSchema,
          ),
        }),
        { exact: true },
      ),
      attackDamageDieFloorChoice: Schema.optionalWith(
        Schema.Struct({
          procedureRef: BattleProcedureExecutionRef,
          unitId: Schema.optionalWith(Schema.Never, { exact: true }),
          selection: AttackDamageDieFloorChoiceSelectionSchema,
        }),
        { exact: true },
      ),
      attackDamageAbilityModifierChoice: Schema.optionalWith(
        Schema.Struct({
          procedureRef: BattleProcedureExecutionRef,
          unitId: Schema.optionalWith(Schema.Never, { exact: true }),
          selection: AttackDamageAbilityModifierChoiceSelectionSchema,
        }),
        { exact: true },
      ),
      spellDamageReroll: Schema.optionalWith(
        Schema.Struct({
          kind: Schema.Literal("reroll"),
          effectKind: Schema.Literal("damage_dice_reroll"),
          dice: Schema.NonEmptyArray(
            Schema.Struct({
              dieRef: Schema.optionalWith(Schema.Never, { exact: true }),
              original: BattleDieRollResultSchema,
              replacement: BattleDieRollResultSchema,
            }),
          ),
        }),
        { exact: true },
      ),
      value: Schema.NonEmptyArray(BattleRolledDiceGroupSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("deathSavingThrow"),
      holeId: BattleHoleIdSchema,
      value: BattleD20DieRollResultSchema,
      d20TestNaturalOneReroll: Schema.optionalWith(
        BattleD20TestNaturalOneRerollDieDecisionSchema,
        { exact: true },
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("statBlockRechargeRoll"),
      holeId: BattleHoleIdSchema,
      value: Schema.Array(
        Schema.Struct({
          target: BattleResourcePoolExecutionRef,
          roll: BattleDieRollResultSchema,
        }),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("concentrationSavingThrow"),
      holeId: BattleHoleIdSchema,
      value: BattleConcentrationSavingThrowValueSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("attackDamageDisposition"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union(
        Schema.Struct({ kind: Schema.Literal("ordinaryDamage") }),
        Schema.Struct({ kind: Schema.Literal("knockOut") }),
        Schema.Struct({
          kind: Schema.Literal("zeroHitPointReplacement"),
          procedureRef: BattleProcedureExecutionRef,
          unitId: Schema.optionalWith(Schema.Never, { exact: true }),
        }),
      ),
    }),
    BattleInterruptDecisionFillSchema,
    Schema.Struct({
      kind: Schema.Literal("movement"),
      holeId: BattleHoleIdSchema,
      value: BattleMovementFillValueSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("levitateAltitudeChange"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        direction: Schema.Literal("up", "down"),
        distanceFeet: MovementFeet,
      }),
      spatialFacts: BattleTargetSpatialFactsSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("levitateInitialRise"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        distanceFeet: MovementFeet,
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("abilityCheck"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        total: Schema.Number.pipe(Schema.int()),
        naturalD20: Schema.optionalWith(BattleD20DieRollResultSchema, {
          exact: true,
        }),
        rolledD20s: Schema.optionalWith(BattleD20TestRolledD20sSchema, {
          exact: true,
        }),
        d20TestNaturalOneReroll: Schema.optionalWith(
          BattleD20TestNaturalOneRerollDecisionSchema,
          { exact: true },
        ),
      }),
      spatialFacts: Schema.optionalWith(
        Schema.Array(
          Schema.Struct({
            kind: Schema.Literal("spellRestraintEscapeActorWithinTargetReach"),
            actorId: CombatantId,
            targetId: CombatantId,
          }),
        ),
        { exact: true },
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("grappleOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        succeeded: Schema.Boolean,
      }),
      relationshipFacts: Schema.optionalWith(
        BattleSavingThrowRelationshipFactsSchema,
        { exact: true },
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("shoveOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union(
        Schema.Struct({
          succeeded: Schema.Literal(true),
        }),
        Schema.Struct({
          succeeded: Schema.Literal(false),
          failedEffect: Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("prone"),
            }),
            Schema.Struct({
              kind: Schema.Literal("pushAway"),
              disposition: BattleThunderwavePushDispositionSchema,
            }),
          ),
        }),
      ),
      relationshipFacts: Schema.optionalWith(
        BattleSavingThrowRelationshipFactsSchema,
        { exact: true },
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("sanctuaryInterdictionOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union(
        Schema.Struct({
          saveSucceeded: Schema.Literal(true),
        }),
        Schema.Struct({
          saveSucceeded: Schema.Literal(false),
          outcome: Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("loseAttackOrSpell"),
            }),
            Schema.Union(
              Schema.Struct({
                kind: Schema.Literal("newTarget"),
                targetId: CombatantId,
                spatialFacts: BattleTargetSpatialFactsSchema,
                replacementTargetKind: Schema.Literal("attackRoll"),
                relationshipFacts: Schema.optionalWith(
                  BattleAttackRollRelationshipFactsSchema,
                  { exact: true },
                ),
              }),
              Schema.Struct({
                kind: Schema.Literal("newTarget"),
                targetId: CombatantId,
                spatialFacts: BattleTargetSpatialFactsSchema,
                replacementTargetKind: Schema.Literal("nonAttack"),
              }),
            ),
          ),
        }),
      ),
    }),
  ),
).annotations({ identifier: "BattleFill" });

const BattleCreatureZeroHpLifecycleSnapshotSchema = Schema.Union(
  Schema.Struct({
    policy: Schema.Literal("diesAtZeroHp"),
    dead: Schema.Boolean,
  }),
  Schema.Struct({
    policy: Schema.Literal("usesDeathSavingThrows"),
    deathSaves: Schema.Struct({
      successes: Schema.Literal(0, 1, 2, 3),
      failures: Schema.Literal(0, 1, 2, 3),
    }),
    stable: Schema.Boolean,
    dead: Schema.Boolean,
  }),
);

const ACTION_RESTRICTION_ACTIONS_WITHOUT_ATTACK_LIMIT = [
  "dash",
  "disengage",
  "hide",
  "utilize",
] as const satisfies ReadonlyArray<StandardActionKind>;

const BattleActionRestrictionSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("none") }),
  Schema.Struct({
    kind: Schema.Literal("exclude"),
    actions: Schema.NonEmptyArray(Schema.Literal(...STANDARD_ACTION_KINDS)),
  }),
  Schema.Struct({
    kind: Schema.Literal("allow_only"),
    actions: Schema.NonEmptyArray(
      Schema.Union(
        Schema.Struct({
          action: Schema.Literal("attack"),
          attackLimit: Schema.Struct({
            kind: Schema.Literal("attack_count"),
            count: Schema.Literal(1),
          }),
        }),
        Schema.Struct({
          action: Schema.Literal(
            ...ACTION_RESTRICTION_ACTIONS_WITHOUT_ATTACK_LIMIT,
          ),
        }),
      ),
    ),
  }),
);

export const RuntimeActionResourceSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("turn"),
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("unit"),
    sourceOwnerId: Schema.String,
    sourceProcedureRef: BattleProcedureExecutionRef,
    sourceUnitId: Schema.optionalWith(Schema.Never, { exact: true }),
    restriction: BattleActionRestrictionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("spellEffect"),
    sourceOwnerId: Schema.String,
    sourceEffectRef: BattleActiveEffectExecutionRef,
    sourceProcedureRef: Schema.optionalWith(Schema.Never, { exact: true }),
    restriction: BattleActionRestrictionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("statBlockMultiattack"),
    sourceOwnerId: Schema.String,
    attackProcedureRef: BattleStatBlockProcedureExecutionRef,
    restriction: BattleActionRestrictionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("classFeatureExtraAttack"),
    sourceOwnerId: Schema.String,
    sourceProcedureRef: BattleProcedureExecutionRef,
    sourceUnitId: Schema.optionalWith(Schema.Never, { exact: true }),
    restriction: BattleActionRestrictionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("monkFocusFlurryOfBlows"),
    sourceOwnerId: Schema.String,
    sourceProcedureRef: BattleProcedureExecutionRef,
  }),
);

const BattleTurnSnapshotSchema = Schema.Struct({
  actionResources: Schema.Array(RuntimeActionResourceSchema),
  bonusActionQuotaAvailable: Schema.Boolean,
  spellSlotUsesThisTurn: Schema.Array(
    Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("pending"),
        combatantId: CombatantId,
      }),
      Schema.Struct({
        kind: Schema.Literal("committed"),
        combatantId: CombatantId,
      }),
    ),
  ),
  levelOnePlusSpellCastsThisTurn: Schema.Array(CombatantId),
  quickenedLevelOnePlusSpellCastsThisTurn: Schema.Array(CombatantId),
  attackRollMadeThisTurn: Schema.Boolean,
  brutalStrikeChosenThisTurn: Schema.Boolean,
  attackDamageRidersUsedThisTurn: Schema.Array(
    Schema.Struct({
      attackerId: CombatantId,
      procedureRef: BattleProcedureExecutionRef,
    }),
  ),
  stunningStrikesUsedThisTurn: Schema.Array(
    Schema.Struct({
      attackerId: CombatantId,
      procedureRef: BattleProcedureExecutionRef,
      unitId: Schema.optionalWith(Schema.Never, { exact: true }),
    }),
  ),
  recklessAttackWhileRagingUsedThisTurn: Schema.Array(
    Schema.Struct({
      attackerId: CombatantId,
      recklessAttackSourceKey: Schema.String,
      rageSourceKey: Schema.String,
    }),
  ),
  weaponDamageDiceRollChoicesUsedThisTurn: Schema.Array(
    Schema.Struct({
      attackerId: CombatantId,
      procedureRef: BattleProcedureExecutionRef,
      unitId: Schema.optionalWith(Schema.Never, { exact: true }),
    }),
  ),
  weaponMasteryCleaveAttackersUsedThisTurn: Schema.Array(CombatantId),
  huntersPreyHordeBreakerUsedThisTurn: Schema.Array(
    Schema.Struct({
      attackerId: CombatantId,
      procedureRef: BattleProcedureExecutionRef,
      unitId: Schema.optionalWith(Schema.Never, { exact: true }),
    }),
  ),
  grapplerPunchAndGrabUsedThisTurn: Schema.Array(CombatantId),
  lightWeaponAttackMade: Schema.optionalWith(
    Schema.Struct({ weaponItemId: BattleObjectId }),
    { exact: true },
  ),
  jumpDistanceMultiplier: Schema.NullOr(
    Schema.Struct({ multiplier: Schema.Literal(2) }),
  ),
  heightenedStepOfTheWindCarriedCreatures: Schema.Array(
    Schema.Struct({
      carrierId: CombatantId,
      carriedCreatureId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      movementDoesNotProvokeOpportunityAttacks: Schema.Literal(true),
      expires: Schema.Literal("endOfCarrierTurn"),
    }),
  ),
  dashMovementBonusFeet: Schema.Number,
  disengaged: Schema.Boolean,
});

const BattleCharacterResourceSnapshotSchema = Schema.Union(
  Schema.Struct({
    resourcePoolRef: BattleResourcePoolExecutionRef,
    usage: Schema.Literal("unlimited"),
    usedThisTurn: Schema.Boolean,
  }),
  Schema.Struct({
    resourcePoolRef: BattleResourcePoolExecutionRef,
    usage: Schema.Literal("limited"),
    usesRemaining: Schema.Number,
    usedThisTurn: Schema.Boolean,
  }),
  Schema.Struct({
    resourcePoolRef: BattleResourcePoolExecutionRef,
    usage: Schema.Literal("pointPool"),
    pointsRemaining: Schema.Number,
  }),
);

const StatBlockResourcePoolStateSchema = Schema.Union(
  Schema.Struct({
    resourcePoolRef: BattleResourcePoolExecutionRef,
    kind: Schema.Literal("daily"),
    usesMax: ResourceCount,
    usesRemaining: ResourceCount,
  }),
  Schema.Struct({
    resourcePoolRef: BattleResourcePoolExecutionRef,
    kind: Schema.Literal("recharge"),
    minimumRoll: CreatureRechargeMinimumRollSchema,
    available: Schema.Boolean,
  }),
  Schema.Struct({
    resourcePoolRef: BattleResourcePoolExecutionRef,
    kind: Schema.Literal("recharge_after_rest"),
    available: Schema.Boolean,
  }),
  Schema.Struct({
    resourcePoolRef: BattleResourcePoolExecutionRef,
    kind: Schema.Literal("legendaryActions"),
    usesMax: ResourceCount,
    usesRemaining: ResourceCount,
  }),
);

const StatBlockAttackProcedureSchema = Schema.Struct({
  kind: Schema.Literal("attack"),
  section: Schema.Literal("actions", "legendaryActions"),
  attack: CreatureAttackRollMechanicsSchema.pipe(
    Schema.filter(creatureAttackRollMechanicsAreSupported, {
      message: () => "Unsupported Stat Block attack procedure mechanics.",
    }),
  ),
  traitAttackRollModes: Schema.optionalWith(
    Schema.NonEmptyArray(
      Schema.Struct({
        mode: Schema.Literal("advantage"),
        predicate: Schema.Literal("nonIncapacitatedAllyWithin5FeetOfTarget"),
      }),
    ),
    { exact: true },
  ),
});

const StatBlockProcedureSchema = Schema.Union(
  StatBlockAttackProcedureSchema,
  Schema.Struct({
    kind: Schema.Literal("multiattack"),
    dispatchProcedureRefs: Schema.NonEmptyArray(
      BattleStatBlockProcedureExecutionRef,
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("bonusActionOption"),
    standardActions: Schema.NonEmptyArray(
      Schema.Literal(...SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS),
    ),
  }),
);

const StatBlockProcedureBindingSnapshotSchema = Schema.Struct({
  procedureRef: BattleStatBlockProcedureExecutionRef,
  procedure: StatBlockProcedureSchema,
  resourcePoolRefs: Schema.Array(BattleResourcePoolExecutionRef),
});

export const StatBlockExecutionSnapshotSchema = Schema.Struct({
  scopeRef: BattleStatBlockExecutionScopeRef,
  procedureBindings: Schema.Array(StatBlockProcedureBindingSnapshotSchema),
  resourcePools: Schema.Array(StatBlockResourcePoolStateSchema),
}).pipe(
  Schema.filter(statBlockExecutionSnapshotGraphIsValid, {
    message: () =>
      "Stat Block execution snapshot has an invalid reference graph.",
  }),
);

function statBlockExecutionSnapshotGraphIsValid(snapshot: {
  readonly scopeRef: BattleStatBlockExecutionScopeRef;
  readonly procedureBindings: readonly Schema.Schema.Type<
    typeof StatBlockProcedureBindingSnapshotSchema
  >[];
  readonly resourcePools: readonly Schema.Schema.Type<
    typeof StatBlockResourcePoolStateSchema
  >[];
}): boolean {
  const procedureRefs = snapshot.procedureBindings.map(
    (binding) => binding.procedureRef,
  );

  const actionAttackRefs = new Set(
    snapshot.procedureBindings.flatMap((binding) =>
      binding.procedure.kind === "attack" &&
      binding.procedure.section === "actions"
        ? [binding.procedureRef]
        : [],
    ),
  );
  const resourcePoolRefs = snapshot.resourcePools.map(
    (pool) => pool.resourcePoolRef,
  );
  const resourcePoolRefSet = new Set(resourcePoolRefs);
  const resourcePoolsByRef = new Map(
    snapshot.resourcePools.map((pool) => [pool.resourcePoolRef, pool]),
  );
  const limitedUseActionAttackRefs = new Set(
    snapshot.procedureBindings.flatMap((binding) =>
      binding.procedure.kind === "attack" &&
      binding.procedure.section === "actions" &&
      binding.resourcePoolRefs.some(
        (resourcePoolRef) =>
          resourcePoolsByRef.get(resourcePoolRef)?.kind !== "legendaryActions",
      )
        ? [binding.procedureRef]
        : [],
    ),
  );
  const bindingCountByPoolRef = new Map<
    BattleResourcePoolExecutionRef,
    number
  >();
  for (const binding of snapshot.procedureBindings) {
    for (const resourcePoolRef of binding.resourcePoolRefs) {
      bindingCountByPoolRef.set(
        resourcePoolRef,
        (bindingCountByPoolRef.get(resourcePoolRef) ?? 0) + 1,
      );
    }
  }
  const legendaryBindings = snapshot.procedureBindings.filter(
    (binding) =>
      binding.procedure.kind === "attack" &&
      binding.procedure.section === "legendaryActions",
  );
  const legendaryPools = snapshot.resourcePools.filter(
    (pool) => pool.kind === "legendaryActions",
  );
  const legendaryPool = legendaryPools[0];
  return (
    battleStatBlockExecutionScopeRefIsWellFormed(snapshot.scopeRef) &&
    procedureRefs.every((ref) =>
      battleProcedureExecutionRefBelongsToScope(ref, snapshot.scopeRef),
    ) &&
    resourcePoolRefs.every((ref) =>
      battleResourcePoolExecutionRefBelongsToScope(ref, snapshot.scopeRef),
    ) &&
    new Set(procedureRefs).size === procedureRefs.length &&
    resourcePoolRefSet.size === resourcePoolRefs.length &&
    snapshot.resourcePools.every(
      (pool) =>
        ((pool.kind !== "daily" && pool.kind !== "legendaryActions") ||
          (Number(pool.usesMax) >= 1 &&
            Number(pool.usesRemaining) >= 0 &&
            Number(pool.usesRemaining) <= Number(pool.usesMax))) &&
        (pool.kind === "legendaryActions" ||
          bindingCountByPoolRef.get(pool.resourcePoolRef) === 1),
    ) &&
    snapshot.procedureBindings.every((binding) => {
      const pools = binding.resourcePoolRefs.flatMap((ref) => {
        const pool = resourcePoolsByRef.get(ref);
        return pool === undefined ? [] : [pool];
      });
      const legendaryPoolCount = pools.filter(
        (pool) => pool.kind === "legendaryActions",
      ).length;
      const limitedUsePoolCount = pools.length - legendaryPoolCount;
      const procedurePoolShapeIsValid =
        binding.procedure.kind === "multiattack"
          ? pools.length === 0
          : binding.procedure.kind === "bonusActionOption" ||
              (binding.procedure.kind === "attack" &&
                binding.procedure.section === "actions")
            ? pools.length <= 1 && legendaryPoolCount === 0
            : legendaryPoolCount <= 1 && limitedUsePoolCount <= 1;
      const legendaryPoolOwnershipIsValid =
        binding.procedure.kind !== "attack" ||
        binding.procedure.section !== "legendaryActions" ||
        (legendaryPool !== undefined &&
          binding.resourcePoolRefs.includes(legendaryPool.resourcePoolRef));
      return (
        new Set(binding.resourcePoolRefs).size ===
          binding.resourcePoolRefs.length &&
        pools.length === binding.resourcePoolRefs.length &&
        procedurePoolShapeIsValid &&
        legendaryPoolOwnershipIsValid &&
        (binding.procedure.kind !== "multiattack" ||
          (binding.procedure.dispatchProcedureRefs.length > 0 &&
            binding.procedure.dispatchProcedureRefs.every((ref) =>
              actionAttackRefs.has(ref),
            ) &&
            multiattackDispatchesRespectLimitedUse(
              binding.procedure.dispatchProcedureRefs,
              limitedUseActionAttackRefs,
            ))) &&
        (binding.procedure.kind !== "bonusActionOption" ||
          binding.procedure.standardActions.length > 0)
      );
    }) &&
    (legendaryBindings.length === 0
      ? legendaryPools.length === 0
      : legendaryPools.length === 1)
  );
}

function multiattackDispatchesRespectLimitedUse(
  dispatchProcedureRefs: readonly BattleStatBlockProcedureExecutionRef[],
  limitedUseActionAttackRefs: ReadonlySet<BattleStatBlockProcedureExecutionRef>,
): boolean {
  const seenLimitedUseRefs = new Set<BattleStatBlockProcedureExecutionRef>();
  for (const procedureRef of dispatchProcedureRefs) {
    if (!limitedUseActionAttackRefs.has(procedureRef)) continue;
    if (seenLimitedUseRefs.has(procedureRef)) return false;
    seenLimitedUseRefs.add(procedureRef);
  }
  return true;
}

const CharacterBattleCreatureOriginSnapshotSchema = Schema.Struct({
  kind: Schema.Literal("character"),
  characterId: Schema.String,
  execution: Schema.Struct({
    scopeRef: BattleCharacterExecutionScopeRef,
    // Procedure allocation is runtime state, never part of a durable
    // checkpoint. The exact optional field rejects legacy cursor payloads
    // instead of silently accepting a second snapshot shape.
    nextProcedureOrdinal: Schema.optionalWith(Schema.Never, { exact: true }),
    procedureBindings: Schema.Array(
      Schema.Struct({
        procedureRef: BattleProcedureExecutionRef,
        procedure: Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("unitFeature"),
            source: Schema.Union(
              Schema.Struct({ kind: Schema.Literal("intrinsic") }),
              Schema.Struct({
                kind: Schema.Literal("resourcePool"),
                resourcePoolRef: BattleResourcePoolExecutionRef,
              }),
            ),
            execution: UnitFeatureProcedureExecutionSchema,
          }),
          Schema.Struct({
            kind: Schema.Literal("unitSupportProfile"),
            source: Schema.Union(
              Schema.Struct({ kind: Schema.Literal("intrinsic") }),
              Schema.Struct({
                kind: Schema.Literal("resourcePool"),
                resourcePoolRef: BattleResourcePoolExecutionRef,
              }),
            ),
            execution: UnitSupportProcedureExecutionSchema,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellInvocation"),
            executionFacts: SpellExecutionFactsSchema,
          }),
          Schema.Struct({
            kind: Schema.Literal("unavailableSpellInvocation"),
          }),
        ),
      }),
    ),
  }),
  attackExecution: Schema.Struct({
    scopeRef: BattleAttackExecutionScopeRef,
    attackProcedureRef: Schema.Union(
      BattleAttackProcedureExecutionRef,
      Schema.Null,
    ),
    unarmedStrikeProcedureRef: BattleAttackProcedureExecutionRef,
    offHandAttackProcedureRef: Schema.Union(
      BattleAttackProcedureExecutionRef,
      Schema.Null,
    ),
  }),
  resources: Schema.Array(BattleCharacterResourceSnapshotSchema),
  druidWildShapeAvailableForms: Schema.Array(
    Schema.Struct({
      statBlockId: Schema.String,
      execution: StatBlockExecutionSnapshotSchema,
    }),
  ),
  spellcasting: Schema.Union(
    Schema.Struct({
      spellSlots: Schema.Array(
        Schema.Struct({
          spellLevel: SpellSlotLevel,
          count: Schema.Number,
          expended: Schema.Number,
        }),
      ),
    }),
    Schema.Null,
  ),
});

const BattleAmmunitionStocksSchema = Schema.Array(
  Schema.Struct({
    ammunition: AmmunitionKindSchema,
    remaining: ResourceCount,
  }),
);

const StatBlockBattleCreatureOriginSnapshotSchema = Schema.Struct({
  kind: Schema.Literal("statBlock"),
  statBlockId: Schema.String,
  execution: StatBlockExecutionSnapshotSchema,
});

const BattleCreatureSnapshotCommonFields = {
  combatantId: CombatantId,
  initiative: Schema.Number,
  hp: Schema.Number,
  maxHp: Schema.Number,
  tempHp: Schema.Number,
  // Active-effect allocation is runtime state, never part of a durable
  // checkpoint. The exact optional field rejects legacy cursor payloads.
  nextActiveEffectOrdinal: Schema.optionalWith(Schema.Never, { exact: true }),
  activeEffectRefs: Schema.Array(BattleActiveEffectExecutionRef),
  armorClass: Schema.Number,
  size: Schema.String,
  zeroHpLifecycle: BattleCreatureZeroHpLifecycleSnapshotSchema,
  conditions: Schema.Array(Schema.Literal(...ALL_CONDITIONS)),
  concentrating: Schema.Boolean,
  dodging: Schema.Boolean,
  reactionAvailable: Schema.Boolean,
  ammunitionStocks: BattleAmmunitionStocksSchema,
  movement: Schema.Struct({
    speedFeet: Schema.Number,
    spentFeet: Schema.Number,
    remainingFeet: Schema.Number,
    speedKinds: Schema.Array(
      Schema.Struct({
        kind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
        speedFeet: Schema.Number,
        remainingFeet: Schema.Number,
      }),
    ),
  }),
};

type BattleCreatureSnapshotInvariantShapeSchema = Schema.Struct<
  typeof BattleCreatureSnapshotCommonFields & {
    origin: Schema.Union<
      [
        typeof CharacterBattleCreatureOriginSnapshotSchema,
        typeof StatBlockBattleCreatureOriginSnapshotSchema,
      ]
    >;
  }
>;

type BattleCreatureSnapshotInvariantInput =
  Schema.Schema.Type<BattleCreatureSnapshotInvariantShapeSchema>;

function battleCreatureSnapshotInvariantsHold(
  snapshot: BattleCreatureSnapshotInvariantInput,
): boolean {
  if (!battleCreatureSnapshotCommonInvariantsHold(snapshot)) return false;
  if (snapshot.origin.kind === "statBlock") {
    return battleStatBlockExecutionScopeRefBelongsToCombatant(
      snapshot.origin.execution.scopeRef,
      snapshot.combatantId,
    );
  }
  const characterOrigin = snapshot.origin;
  const attackProcedureRefs = [
    characterOrigin.attackExecution.attackProcedureRef,
    characterOrigin.attackExecution.unarmedStrikeProcedureRef,
    characterOrigin.attackExecution.offHandAttackProcedureRef,
  ].filter((reference) => reference !== null);
  return (
    battleCharacterExecutionScopeRefBelongsToCombatant(
      characterOrigin.execution.scopeRef,
      snapshot.combatantId,
    ) &&
    characterOrigin.execution.procedureBindings.every((binding) =>
      battleProcedureExecutionRefBelongsToScope(
        binding.procedureRef,
        characterOrigin.execution.scopeRef,
      ),
    ) &&
    new Set(
      characterOrigin.execution.procedureBindings.map(
        (binding) => binding.procedureRef,
      ),
    ).size === characterOrigin.execution.procedureBindings.length &&
    characterOrigin.execution.procedureBindings.every((binding) => {
      const procedure = binding.procedure;
      if (
        procedure.kind !== "unitFeature" &&
        procedure.kind !== "unitSupportProfile"
      ) {
        return true;
      }
      const source = procedure.source;
      return (
        source.kind === "intrinsic" ||
        characterOrigin.resources.some(
          (resource) => resource.resourcePoolRef === source.resourcePoolRef,
        )
      );
    }) &&
    characterOrigin.resources.every((resource) =>
      battleResourcePoolExecutionRefBelongsToScope(
        resource.resourcePoolRef,
        characterOrigin.execution.scopeRef,
      ),
    ) &&
    new Set(
      characterOrigin.resources.map((resource) => resource.resourcePoolRef),
    ).size === characterOrigin.resources.length &&
    battleAttackExecutionScopeRefBelongsToCombatant(
      characterOrigin.attackExecution.scopeRef,
      snapshot.combatantId,
    ) &&
    characterAttackExecutionRefsMatchLayout(
      characterOrigin.attackExecution.scopeRef,
      characterOrigin.attackExecution,
    ) &&
    new Set(attackProcedureRefs).size === attackProcedureRefs.length &&
    characterOrigin.druidWildShapeAvailableForms.every((form) =>
      battleStatBlockExecutionScopeRefBelongsToCombatant(
        form.execution.scopeRef,
        snapshot.combatantId,
      ),
    ) &&
    new Set(
      characterOrigin.druidWildShapeAvailableForms.map(
        (form) => form.execution.scopeRef,
      ),
    ).size === characterOrigin.druidWildShapeAvailableForms.length
  );
}

function battleCreatureSnapshotCommonInvariantsHold(
  snapshot: BattleCreatureSnapshotInvariantInput,
): boolean {
  if (
    new Set(snapshot.activeEffectRefs).size !== snapshot.activeEffectRefs.length
  ) {
    return false;
  }
  if (
    new Set(snapshot.ammunitionStocks.map((stock) => stock.ammunition)).size !==
    snapshot.ammunitionStocks.length
  ) {
    return false;
  }
  return snapshot.activeEffectRefs.every((effectRef) =>
    battleActiveEffectExecutionRefBelongsToScope(
      effectRef,
      snapshot.origin.execution.scopeRef,
    ),
  );
}

const battleCreatureSnapshotInvariantAnnotations = {
  message: () =>
    "Execution scopes, procedure refs, resource refs, and active-effect refs must be unique and owned by their combatant.",
};

const BattleCreatureSnapshotSchema = Schema.Union(
  Schema.Struct({
    ...BattleCreatureSnapshotCommonFields,
    displayName: Schema.optionalWith(Schema.Never, { exact: true }),
    origin: CharacterBattleCreatureOriginSnapshotSchema,
  }),
  Schema.Struct({
    ...BattleCreatureSnapshotCommonFields,
    displayName: Schema.optionalWith(Schema.Never, { exact: true }),
    origin: StatBlockBattleCreatureOriginSnapshotSchema,
  }),
).pipe(
  Schema.filter(
    battleCreatureSnapshotInvariantsHold,
    battleCreatureSnapshotInvariantAnnotations,
  ),
);

const BattlePresentedCreatureSnapshotSchema = Schema.Union(
  Schema.Struct({
    ...BattleCreatureSnapshotCommonFields,
    displayName: BattleCreatureDisplayNameSchema,
    origin: CharacterBattleCreatureOriginSnapshotSchema,
  }),
  Schema.Struct({
    ...BattleCreatureSnapshotCommonFields,
    displayName: BattleCreatureDisplayNameSchema,
    origin: StatBlockBattleCreatureOriginSnapshotSchema,
  }),
).pipe(
  Schema.filter(
    battleCreatureSnapshotInvariantsHold,
    battleCreatureSnapshotInvariantAnnotations,
  ),
);

export const BattleUnitSupportSourceSchema = Schema.Union(
  UnitRecordSchema,
  Schema.Struct({
    id: Schema.String,
    syntheticLabel: Schema.String,
    provenance: Schema.Struct({
      kind: Schema.Literal("classic-2024-mechanics-source-lane"),
    }),
    kind: Schema.Literal("class_feature"),
    mechanics: Schema.Struct({
      family: Schema.Literal("alternate_action_cost"),
      from: Schema.Struct({
        kind: Schema.Literal("standard_action"),
        actions: Schema.Array(Schema.Literal(...STANDARD_ACTION_KINDS)),
      }),
      to: Schema.Struct({ kind: Schema.Literal("bonus_action") }),
    }),
  }),
);

export const BattleSpellPresentationSchema = Schema.Struct({
  kind: Schema.Literal("spell"),
  procedureRef: BattleProcedureExecutionRef,
  invocation: SpellInvocationRefSchema,
});

export const BattleActPresentationSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("intrinsic") }),
  Schema.Struct({
    kind: Schema.Literal("presentationIssue"),
    issue: Schema.Struct({
      tag: Schema.Literal("attackPresentationJoinIssue"),
      reason: Schema.Literal(...ATTACK_PRESENTATION_JOIN_ISSUE_REASONS),
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("attack"),
    procedureRef: Schema.Union(
      BattleAttackProcedureExecutionRef,
      BattleStatBlockProcedureExecutionRef,
    ),
    name: Schema.NonEmptyTrimmedString,
  }),
  BattleSpellPresentationSchema,
  Schema.Struct({
    kind: Schema.Literal("unit"),
    procedureRef: BattleProcedureExecutionRef,
    unitId: Schema.String,
  }),
  Schema.Struct({
    kind: Schema.Literal("druidWildShapeForm"),
    procedureRef: BattleProcedureExecutionRef,
    formExecutionRef: BattleStatBlockExecutionScopeRef,
    unitId: Schema.String,
    formStatBlockId: Schema.String,
  }),
);

const BattleReadiedSpellSnapshotSchema = Schema.Struct({
  casterId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  trigger: Schema.Literal(...BATTLE_READIED_SPELL_TRIGGERS),
  expiresAt: OngoingFeatureExpirationSchema,
});

const BattleReadiedResponseSnapshotSchema = Schema.Struct({
  actorId: CombatantId,
  trigger: ReadyTriggerDescription,
  response: BattleReadyResponseSnapshotSchema,
  expiresAt: OngoingFeatureExpirationSchema,
});

const BattleHelpAttackSnapshotSchema = Schema.Struct({
  helperId: CombatantId,
  allyId: CombatantId,
  targetEnemyId: CombatantId,
  expiresAt: OngoingFeatureExpirationSchema,
});

const BattleReactionModifierChoiceSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal(
      "attackRollReduction",
      "abilityCheckReduction",
      "damageRollReduction",
    ),
    procedureRef: BattleProcedureExecutionRef,
    reduction: Schema.Struct({
      kind: Schema.Literal("rolled"),
      dice: Schema.Literal(1),
      flatModifier: Schema.Number,
      dieSize: Schema.Literal(6, 8, 10, 12),
      spends: Schema.Struct({
        resourcePoolRef: BattleResourcePoolExecutionRef,
        amount: Schema.Literal(1),
      }),
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("attackDamageReduction"),
    procedureRef: BattleProcedureExecutionRef,
    reduction: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("halfDamage"),
      }),
      Schema.Struct({
        kind: Schema.Literal("rolled"),
        flatModifier: Schema.Number,
        dieSize: Schema.Literal(10),
      }),
    ),
    zeroDamageRedirect: Schema.optionalWith(
      Schema.Struct({
        spends: Schema.Struct({
          resourcePoolRef: BattleResourcePoolExecutionRef,
          amount: Schema.Literal(1),
        }),
        saveAbility: Schema.Literal("dex"),
        saveDc: DifficultyClass,
        damageDice: Schema.Struct({
          dice: Schema.Literal(2),
          dieSize: DamageDieSizeSchema,
        }),
        damageAbilityModifier: AbilityModifier,
        attackKind: Schema.Literal("melee", "ranged"),
        targetGate: Schema.Struct({
          melee: Schema.Literal("visibleWithin5Feet"),
          ranged: Schema.Literal("visibleWithin60FeetWithoutTotalCover"),
        }),
        originalDamageType: DamageTypeSchema,
      }),
      { exact: true },
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("fallDamageReduction"),
    procedureRef: BattleProcedureExecutionRef,
    reduction: Schema.Struct({
      kind: Schema.Literal("flat"),
      amount: DamageAmount,
    }),
  }),
);

type BattleInterruptProcedureChoiceFields = Schema.Struct.Fields & {
  readonly initialHoles?: never;
};

function pairedBattleInterruptProcedureChoiceMember<
  const Fields extends BattleInterruptProcedureChoiceFields,
>(fields: Fields) {
  return {
    labeled: Schema.Struct({
      ...fields,
      initialHoles: Schema.Array(BattleHoleSchema),
    }),
    mechanical: Schema.Struct({
      ...fields,
      initialHoles: Schema.Array(BattleMechanicalHoleSchema),
    }),
  };
}

const BattleInterruptProcedureChoiceMembers = [
  pairedBattleInterruptProcedureChoiceMember({
    kind: Schema.Literal("nestedProcedure"),
    subject: BattleInterruptSubjectSchema,
  }),
  pairedBattleInterruptProcedureChoiceMember({
    kind: Schema.Literal("reactionModifier"),
    responderId: CombatantId,
    modifier: BattleReactionModifierChoiceSchema,
  }),
] as const;
const [
  FirstBattleInterruptProcedureChoiceMember,
  ...RemainingBattleInterruptProcedureChoiceMembers
] = BattleInterruptProcedureChoiceMembers;
const BattleInterruptProcedureChoiceUnfilteredSchema = Schema.Union(
  FirstBattleInterruptProcedureChoiceMember.labeled,
  ...RemainingBattleInterruptProcedureChoiceMembers.map(
    ({ labeled }) => labeled,
  ),
);

const MechanicalBattleInterruptChoiceMembers =
  RemainingBattleInterruptProcedureChoiceMembers.map(
    ({ mechanical }) => mechanical,
  );
const BattleMechanicalInterruptProcedureChoiceUnfilteredSchema = Schema.Union(
  FirstBattleInterruptProcedureChoiceMember.mechanical,
  ...MechanicalBattleInterruptChoiceMembers,
);
export const BattleInterruptProcedureChoiceSchema =
  BattleInterruptProcedureChoiceUnfilteredSchema.annotations({
    parseOptions: { onExcessProperty: "error" },
  });
export const BattleMechanicalInterruptProcedureChoiceSchema =
  BattleMechanicalInterruptProcedureChoiceUnfilteredSchema.annotations({
    parseOptions: { onExcessProperty: "error" },
  });

export const BattleInterruptProcedureChoiceWithSubjectSchema =
  FirstBattleInterruptProcedureChoiceMember.labeled.annotations({
    parseOptions: { onExcessProperty: "error" },
  });
export const BattleInterruptProcedureModifierChoiceSchema =
  RemainingBattleInterruptProcedureChoiceMembers[0].labeled.annotations({
    parseOptions: { onExcessProperty: "error" },
  });

const BattleDimLightEmissionSchema = Schema.Struct({
  kind: Schema.Literal("dim"),
  radiusFeet: MovementFeet,
});

const BattleLightEmitterEndOfTurnExpirationSchema = Schema.Struct({
  kind: Schema.Literal("endOfTurn"),
  combatantId: CombatantId,
  round: Schema.Number,
});

const BattleSpellLightEmitterFields = {
  kind: Schema.Literal("spellLightEmitter"),
  sourceProcedureRef: BattleProcedureExecutionRef,
  sourceCombatantId: CombatantId,
  attachment: BattleLightEmitterAttachmentSchema,
  emission: Schema.Union(
    BattleDimLightEmissionSchema,
    Schema.Struct({
      kind: Schema.Literal("brightAndDim"),
      brightRadiusFeet: MovementFeet,
      dimAdditionalFeet: MovementFeet,
    }),
  ),
  opaqueCoverInteraction: Schema.Union(
    Schema.Struct({ kind: Schema.Literal("blocksEmission") }),
    Schema.Struct({ kind: Schema.Literal("doesNotBlockEmission") }),
  ),
  expiresAt: BattleActiveEffectExpirationSchema,
};

const BattleLightEmitterSchema = Schema.Union(
  Schema.Struct({
    ...BattleSpellLightEmitterFields,
    sourceEffectId: BattleSpellEffectOccurrenceId,
    sourceSpellLevel: BattleSpellEffectLevel,
  }),
  Schema.Struct({
    ...BattleSpellLightEmitterFields,
    sourceEffectId: Schema.optionalWith(Schema.Never, { exact: true }),
    sourceSpellLevel: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  Schema.Struct({
    kind: Schema.Literal("unitFeatureLightEmitter"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    sourceCombatantId: CombatantId,
    attachment: BattleLightEmitterAttachmentSchema,
    emission: Schema.Union(
      BattleDimLightEmissionSchema,
      Schema.Struct({
        kind: Schema.Literal("brightAndDim"),
        brightRadiusFeet: MovementFeet,
        dimAdditionalFeet: MovementFeet,
      }),
    ),
    opaqueCoverInteraction: Schema.Union(
      Schema.Struct({ kind: Schema.Literal("blocksEmission") }),
      Schema.Struct({ kind: Schema.Literal("doesNotBlockEmission") }),
    ),
    expiresAt: BattleActiveEffectExpirationSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("objectInvisibleRevealLightEmitter"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    sourceCombatantId: CombatantId,
    objectId: BattleObjectId,
    emission: BattleDimLightEmissionSchema,
    expiresAt: BattleLightEmitterEndOfTurnExpirationSchema,
  }),
);

const BattlePointOriginSphereAreaSchema = Schema.Struct({
  kind: Schema.Literal("pointOriginSphere"),
  areaId: BattleAreaId,
  radiusFeet: MovementFeet,
});

const BattlePointOriginCylinderAreaSchema = Schema.Struct({
  kind: Schema.Literal("pointOriginCylinder"),
  areaId: BattleAreaId,
  radiusFeet: MovementFeet,
  heightFeet: MovementFeet,
});

const BattleConcentrationWithDurationExpirationSchema = Schema.Struct({
  kind: Schema.Literal("concentration"),
  combatantId: CombatantId,
  durationTicks: Schema.Number,
});
const BattleDurationExpirationSchema = Schema.Struct({
  kind: Schema.Literal("duration"),
  durationTicks: Schema.Number,
});
const BattleConcentrationOrDurationExpirationSchema = Schema.Union(
  BattleConcentrationWithDurationExpirationSchema,
  BattleDurationExpirationSchema,
);

const BattleObscurementZoneSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("spellObscurementZone"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    sourceCombatantId: CombatantId,
    obscurement: Schema.Literal("lightlyObscured", "heavilyObscured"),
    area: Schema.Union(
      BattlePointOriginSphereAreaSchema,
      BattlePointOriginCylinderAreaSchema,
      Schema.Struct({
        kind: Schema.Literal("pointOriginCube"),
        areaId: BattleAreaId,
        sideFeet: MovementFeet,
      }),
    ),
    expiresAt: BattleConcentrationOrDurationExpirationSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellMagicalDarknessZone"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    sourceCombatantId: CombatantId,
    area: BattlePointOriginSphereAreaSchema,
    expiresAt: BattleConcentrationOrDurationExpirationSchema,
  }),
);

const BattleCompanionSnapshotSchema = Schema.Union(
  Schema.Struct({
    status: Schema.Literal("present"),
    ownerId: CombatantId,
    companionId: CombatantId,
    identity: BattleCompanionIdentitySchema,
    protocol: BattleCompanionProtocolSchema,
    formAccess: Schema.Literal("findFamiliar"),
    resolvedStatBlockId: BattleCompanionResolvedStatBlockIdSchema,
    creatureTypeOverride: FindFamiliarCreatureTypeOverrideSchema,
    initiative: Schema.Number,
    placement: BattleCompanionPlacementSchema,
  }),
  Schema.Struct({
    status: Schema.Literal("present"),
    ownerId: CombatantId,
    companionId: CombatantId,
    identity: BattleCompanionIdentitySchema,
    protocol: BattleCompanionProtocolSchema,
    formAccess: Schema.Literal("pactOfTheChain"),
    resolvedStatBlockId: BattleCompanionResolvedStatBlockIdSchema,
    creatureTypeOverride: FindFamiliarCreatureTypeOverrideSchema,
    initiative: Schema.Number,
    placement: BattleCompanionPlacementSchema,
  }),
  Schema.Struct({
    status: Schema.Literal("temporarilyDismissed"),
    ownerId: CombatantId,
    identity: BattleCompanionIdentitySchema,
    protocol: BattleCompanionProtocolSchema,
    reappearanceCombatantId: CombatantId,
    formAccess: Schema.Literal("findFamiliar"),
    resolvedStatBlockId: BattleCompanionResolvedStatBlockIdSchema,
    creatureTypeOverride: FindFamiliarCreatureTypeOverrideSchema,
    hitPoints: BattleCompanionHitPointsSchema,
    ammunitionStocks: BattleAmmunitionStocksSchema,
    reactionAvailable: Schema.Boolean,
  }),
  Schema.Struct({
    status: Schema.Literal("temporarilyDismissed"),
    ownerId: CombatantId,
    identity: BattleCompanionIdentitySchema,
    protocol: BattleCompanionProtocolSchema,
    reappearanceCombatantId: CombatantId,
    formAccess: Schema.Literal("pactOfTheChain"),
    resolvedStatBlockId: BattleCompanionResolvedStatBlockIdSchema,
    creatureTypeOverride: FindFamiliarCreatureTypeOverrideSchema,
    hitPoints: BattleCompanionHitPointsSchema,
    ammunitionStocks: BattleAmmunitionStocksSchema,
    reactionAvailable: Schema.Boolean,
  }),
  Schema.Struct({
    status: Schema.Literal("disappearedAtZeroHitPoints"),
    ownerId: CombatantId,
    identity: BattleCompanionIdentitySchema,
    protocol: BattleCompanionProtocolSchema,
    formAccess: Schema.Literal("findFamiliar"),
    resolvedStatBlockId: BattleCompanionResolvedStatBlockIdSchema,
    creatureTypeOverride: FindFamiliarCreatureTypeOverrideSchema,
    reactionAvailable: Schema.Boolean,
  }),
  Schema.Struct({
    status: Schema.Literal("disappearedAtZeroHitPoints"),
    ownerId: CombatantId,
    identity: BattleCompanionIdentitySchema,
    protocol: BattleCompanionProtocolSchema,
    formAccess: Schema.Literal("pactOfTheChain"),
    resolvedStatBlockId: BattleCompanionResolvedStatBlockIdSchema,
    creatureTypeOverride: FindFamiliarCreatureTypeOverrideSchema,
    reactionAvailable: Schema.Boolean,
  }),
);

type EncodedBattleCreatureSnapshot = BattleCreatureSnapshotInvariantInput;
type EncodedBattleInterruptChoice =
  typeof BattleInterruptProcedureChoiceSchema.Type;
type EncodedNestedInterruptChoice = Extract<
  EncodedBattleInterruptChoice,
  { readonly kind: "nestedProcedure" }
>;
type EncodedBattleReadiedSpellSnapshot =
  typeof BattleReadiedSpellSnapshotSchema.Type;
type EncodedBattleReadiedResponseSnapshot =
  typeof BattleReadiedResponseSnapshotSchema.Type;
type EncodedBattleSubject = typeof BattleSubjectSchema.Type;
type EncodedRuntimeCommandBattleSubject = Extract<
  EncodedBattleSubject,
  { readonly tag: "runtimeCommand" }
>;
type EncodedBattleHole = typeof BattleHolePayloadUnionSchema.Type;
type EncodedBattleActDiscoveryCandidate =
  typeof BattleActDiscoveryCandidateSchema.Type;
type EncodedBattleInterruptProcedureChoice =
  typeof BattleInterruptProcedureChoiceSchema.Type;

type SerializedExecutionReferenceOwnership = {
  readonly ref: string;
  readonly ownerId: CombatantId | undefined;
  readonly subjectProcedure: boolean;
};

type SerializedRuntimeCommandReferencePolicy =
  | {
      readonly kind: "opportunityAttackProcedureOwned";
      readonly ownerId: CombatantId;
      readonly targetId: CombatantId;
      readonly procedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "retaliationAttackProcedureOwned";
      readonly ownerId: CombatantId;
      readonly targetId: CombatantId;
      readonly procedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "combatantOwned";
      readonly ownerId: CombatantId;
    }
  | {
      readonly kind: "spellInvocationOwned";
      readonly ownerId: CombatantId;
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly executionFactsKind:
        | "attackHitBonusActionSpell"
        | "triggeredReactionSpell";
    }
  | {
      readonly kind: "readiedAttackOwned";
      readonly ownerId: CombatantId;
      readonly targetId: CombatantId;
      readonly procedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "readiedSpellOwned";
      readonly ownerId: CombatantId;
      readonly procedureRef: BattleProcedureExecutionRef;
    };

function serializedRuntimeCommandReferencePolicy(
  subject: EncodedRuntimeCommandBattleSubject,
): SerializedRuntimeCommandReferencePolicy {
  const combatantOwned = (
    ownerId: CombatantId,
  ): SerializedRuntimeCommandReferencePolicy => ({
    kind: "combatantOwned",
    ownerId,
  });
  const actorOwned = (
    command: EncodedRuntimeCommandBattleSubject,
  ): SerializedRuntimeCommandReferencePolicy => combatantOwned(command.actorId);
  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("command")({
      castAttackHitBonusActionSpell: (
        command,
      ): SerializedRuntimeCommandReferencePolicy => ({
        kind: "spellInvocationOwned",
        ownerId: command.casterId,
        procedureRef: command.procedureRef,
        executionFactsKind: "attackHitBonusActionSpell",
      }),
      castTriggeredReactionSpell: (
        command,
      ): SerializedRuntimeCommandReferencePolicy => ({
        kind: "spellInvocationOwned",
        ownerId: command.reactorId,
        procedureRef: command.procedureRef,
        executionFactsKind: "triggeredReactionSpell",
      }),
      cloudkillAreaHazardSave: actorOwned,
      commandApproach: actorOwned,
      commandDrop: actorOwned,
      commandFlee: actorOwned,
      commandGrovel: actorOwned,
      creatureFalls: actorOwned,
      creatureTypeProtectionConditionAttempt: actorOwned,
      creatureTypeProtectionPossessionAttempt: actorOwned,
      disperseCloudkill: actorOwned,
      disperseFogCloud: actorOwned,
      dragonsBreathExhale: actorOwned,
      endConcentration: actorOwned,
      endTurn: actorOwned,
      greaseGroundHazardSave: actorOwned,
      gustOfWindLineDirectionChange: actorOwned,
      gustOfWindLineSave: actorOwned,
      insectPlagueAreaHazardSave: actorOwned,
      jumpMovementReplacement: actorOwned,
      levitateAltitudeControl: actorOwned,
      moonbeamCylinderExit: actorOwned,
      movableZoneRam: actorOwned,
      movableZoneReposition: actorOwned,
      movableZoneSave: actorOwned,
      move: actorOwned,
      opportunityAttack: (
        command,
      ): SerializedRuntimeCommandReferencePolicy => ({
        kind: "opportunityAttackProcedureOwned",
        ownerId: command.reactorId,
        targetId: command.targetId,
        procedureRef: command.procedureRef,
      }),
      protectionRelevantEffectSave: actorOwned,
      releaseGrapple: actorOwned,
      releaseReadiedAction: actorOwned,
      releaseReadiedAttack: (
        command,
      ): SerializedRuntimeCommandReferencePolicy => ({
        kind: "readiedAttackOwned",
        ownerId: command.reactorId,
        targetId: command.targetId,
        procedureRef: command.procedureRef,
      }),
      releaseReadiedMovement: actorOwned,
      releaseReadiedSpell: (
        command,
      ): SerializedRuntimeCommandReferencePolicy => ({
        kind: "readiedSpellOwned",
        ownerId: command.readiedSpellCasterId,
        procedureRef: command.procedureRef,
      }),
      releaseSpellCreatedHeldObject: actorOwned,
      replaceSelfTransformationMode: actorOwned,
      reportReadyTrigger: actorOwned,
      retaliationAttack: (
        command,
      ): SerializedRuntimeCommandReferencePolicy => ({
        kind: "retaliationAttackProcedureOwned",
        ownerId: command.reactorId,
        targetId: command.targetId,
        procedureRef: command.procedureRef,
      }),
      sleetStormAreaHazardSave: actorOwned,
      standFromProne: actorOwned,
      wardingBondSeparation: actorOwned,
      webAreaRemoved: actorOwned,
      webRestrainedNoLongerInArea: actorOwned,
      webRestraintSave: actorOwned,
    }),
  );
}

function serializedStatBlockAuthoritativeExecutionReferences(
  execution: Schema.Schema.Type<typeof StatBlockExecutionSnapshotSchema>,
): readonly string[] {
  return [
    execution.scopeRef,
    ...execution.procedureBindings.map((binding) => binding.procedureRef),
    ...execution.resourcePools.map((pool) => pool.resourcePoolRef),
  ];
}

function serializedCombatantAuthoritativeExecutionReferences(
  combatant: EncodedBattleCreatureSnapshot,
): readonly string[] {
  const activeEffectRefs = combatant.activeEffectRefs;
  if (combatant.origin.kind === "statBlock") {
    return [
      ...activeEffectRefs,
      ...serializedStatBlockAuthoritativeExecutionReferences(
        combatant.origin.execution,
      ),
    ];
  }
  const origin = combatant.origin;
  return [
    ...activeEffectRefs,
    origin.execution.scopeRef,
    ...origin.execution.procedureBindings.map(
      (binding) => binding.procedureRef,
    ),
    ...origin.resources.map((resource) => resource.resourcePoolRef),
    origin.attackExecution.scopeRef,
    ...(origin.attackExecution.attackProcedureRef === null
      ? []
      : [origin.attackExecution.attackProcedureRef]),
    origin.attackExecution.unarmedStrikeProcedureRef,
    ...(origin.attackExecution.offHandAttackProcedureRef === null
      ? []
      : [origin.attackExecution.offHandAttackProcedureRef]),
    ...origin.druidWildShapeAvailableForms.flatMap((form) =>
      serializedStatBlockAuthoritativeExecutionReferences(form.execution),
    ),
  ];
}
function characterProcedureBindingKind(
  combatants: readonly EncodedBattleCreatureSnapshot[],
  combatantId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
):
  | "unitFeature"
  | "unitSupportProfile"
  | "spellInvocation"
  | "unavailableSpellInvocation"
  | undefined {
  return characterProcedureBinding(combatants, combatantId, procedureRef)
    ?.procedure.kind;
}

function characterProcedureBinding(
  combatants: readonly EncodedBattleCreatureSnapshot[],
  combatantId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
) {
  const combatant = combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  if (combatant?.origin.kind !== "character") return undefined;
  return combatant.origin.execution.procedureBindings.find(
    (binding) => binding.procedureRef === procedureRef,
  );
}

function serializedUnitProcedureExecutionKind(procedure: {
  readonly execution: string | { readonly kind: string };
}): string {
  return typeof procedure.execution === "string"
    ? procedure.execution
    : procedure.execution.kind;
}

function serializedReactionModifierProcedureRefIsBound(
  combatants: readonly EncodedBattleCreatureSnapshot[],
  combatantId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
): boolean {
  const binding = characterProcedureBinding(
    combatants,
    combatantId,
    procedureRef,
  );
  return (
    (binding?.procedure.kind === "unitFeature" ||
      binding?.procedure.kind === "unitSupportProfile") &&
    serializedUnitProcedureExecutionKind(binding.procedure) ===
      REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE
  );
}

function serializedReadiedSpellOwnsInvocation(
  combatants: readonly EncodedBattleCreatureSnapshot[],
  readied: EncodedBattleReadiedSpellSnapshot,
): boolean {
  const binding = characterProcedureBinding(
    combatants,
    readied.casterId,
    readied.procedureRef,
  );
  if (binding?.procedure.kind !== "spellInvocation") return false;
  return (
    binding.procedure.executionFacts.kind === "actionSpell" &&
    binding.procedure.executionFacts.readiedSpellCompatible
  );
}

function serializedAttackProcedureRefIsBound(
  combatants: readonly EncodedBattleCreatureSnapshot[],
  combatantId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
): boolean {
  const combatant = combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  if (combatant === undefined) return false;
  if (combatant.origin.kind === "character") {
    return serializedCharacterAttackProcedureRefIsBound(
      combatant,
      procedureRef,
    );
  }
  return combatant.origin.execution.procedureBindings.some(
    (binding) =>
      binding.procedureRef === procedureRef &&
      binding.procedure.kind === "attack",
  );
}

function serializedCharacterAttackProcedureRefIsBound(
  combatant: EncodedBattleCreatureSnapshot | undefined,
  procedureRef: BattleProcedureExecutionRef,
): boolean {
  if (combatant?.origin.kind !== "character") return false;
  const attackExecution = combatant.origin.attackExecution;
  return (
    attackExecution.attackProcedureRef === procedureRef ||
    attackExecution.unarmedStrikeProcedureRef === procedureRef ||
    attackExecution.offHandAttackProcedureRef === procedureRef
  );
}

function serializedOpportunityAttackProcedureRefIsBound(
  combatants: readonly EncodedBattleCreatureSnapshot[],
  combatantId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
): boolean {
  if (
    serializedAttackProcedureRefIsBound(combatants, combatantId, procedureRef)
  ) {
    return true;
  }
  const combatant = combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  if (combatant?.origin.kind !== "character") return false;
  return combatant.origin.druidWildShapeAvailableForms.some((form) =>
    form.execution.procedureBindings.some(
      (binding) =>
        binding.procedureRef === procedureRef &&
        binding.procedure.kind === "attack",
    ),
  );
}

function serializedReadiedResponseIsBound(
  combatants: readonly EncodedBattleCreatureSnapshot[],
  readied: EncodedBattleReadiedResponseSnapshot,
): boolean {
  if (
    !combatants.some((combatant) => combatant.combatantId === readied.actorId)
  ) {
    return false;
  }
  return Match.value(readied.response).pipe(
    Match.discriminatorsExhaustive("kind")({
      movement: () => true,
      attack: (response) =>
        serializedAttackProcedureRefIsBound(
          combatants,
          readied.actorId,
          response.procedureRef,
        ),
      action: (response) =>
        response.subject.actorId === readied.actorId &&
        serializedBattleSubjectOwnsBoundExecutionReferences(
          response.subject,
          combatants,
        ),
    }),
  );
}

function serializedLightEmitterOwnsSource(
  emitter: Schema.Schema.Type<typeof BattleLightEmitterSchema>,
  combatants: readonly EncodedBattleCreatureSnapshot[],
): boolean {
  return Match.value(emitter).pipe(
    Match.discriminatorsExhaustive("kind")({
      spellLightEmitter: (source) =>
        characterProcedureBindingKind(
          combatants,
          source.sourceCombatantId,
          source.sourceProcedureRef,
        ) === "spellInvocation",
      unitFeatureLightEmitter: (source) =>
        characterProcedureBindingKind(
          combatants,
          source.sourceCombatantId,
          source.sourceProcedureRef,
        ) === "unitFeature",
      objectInvisibleRevealLightEmitter: (source) =>
        characterProcedureBindingKind(
          combatants,
          source.sourceCombatantId,
          source.sourceProcedureRef,
        ) === "spellInvocation",
    }),
  );
}

function serializedObscurementZoneOwnsSource(
  zone: Schema.Schema.Type<typeof BattleObscurementZoneSchema>,
  combatants: readonly EncodedBattleCreatureSnapshot[],
): boolean {
  return Match.value(zone).pipe(
    Match.discriminatorsExhaustive("kind")({
      spellObscurementZone: (source) =>
        characterProcedureBindingKind(
          combatants,
          source.sourceCombatantId,
          source.sourceProcedureRef,
        ) === "spellInvocation",
      spellMagicalDarknessZone: (source) =>
        characterProcedureBindingKind(
          combatants,
          source.sourceCombatantId,
          source.sourceProcedureRef,
        ) === "spellInvocation",
    }),
  );
}

function serializedBattleHoleOwnsBoundExecutionReferences(input: {
  readonly hole: EncodedBattleHole;
  readonly combatants: readonly EncodedBattleCreatureSnapshot[];
  readonly boundExecutionRefs: ReadonlySet<string>;
  readonly expectedProcedureRefs:
    | ReadonlySet<BattleProcedureExecutionRef>
    | undefined;
}): boolean {
  const { hole, combatants, boundExecutionRefs, expectedProcedureRefs } = input;
  return serializedBattleHoleExecutionReferences(hole).every((reference) => {
    if (!boundExecutionRefs.has(reference.ref)) return false;
    if (
      reference.subjectProcedure &&
      expectedProcedureRefs !== undefined &&
      expectedProcedureRefs.size > 0 &&
      !expectedProcedureRefs.has(reference.ref as BattleProcedureExecutionRef)
    ) {
      return false;
    }
    if (reference.ownerId === undefined) return true;
    const owner = combatants.find(
      (combatant) => combatant.combatantId === reference.ownerId,
    );
    return (
      owner !== undefined &&
      serializedCombatantAuthoritativeExecutionReferences(owner).includes(
        reference.ref,
      )
    );
  });
}

function serializedBattleHolesOwnBoundExecutionReferences(input: {
  readonly holes: readonly EncodedBattleHole[];
  readonly combatants: readonly EncodedBattleCreatureSnapshot[];
  readonly boundExecutionRefs: ReadonlySet<string>;
  readonly expectedProcedureRefs:
    | ReadonlySet<BattleProcedureExecutionRef>
    | undefined;
}): boolean {
  return input.holes.every((hole) =>
    serializedBattleHoleOwnsBoundExecutionReferences({
      hole,
      combatants: input.combatants,
      boundExecutionRefs: input.boundExecutionRefs,
      expectedProcedureRefs: input.expectedProcedureRefs,
    }),
  );
}

function serializedBattleSubjectOwnsBoundExecutionReferences(
  subject: EncodedBattleSubject,
  combatants: readonly EncodedBattleCreatureSnapshot[],
): boolean {
  return battleSubjectBoundExecutionReferences(subject).every((reference) =>
    Match.value(reference).pipe(
      Match.discriminatorsExhaustive("kind")({
        activeEffect: ({ ownerId, effectRef }) =>
          combatants
            .find((combatant) => combatant.combatantId === ownerId)
            ?.activeEffectRefs.includes(effectRef) === true,
        statBlockScope: ({ ownerId, scopeRef }) => {
          const combatant = combatants.find(
            (candidate) => candidate.combatantId === ownerId,
          );
          return (
            combatant?.origin.kind === "character" &&
            combatant.origin.druidWildShapeAvailableForms.some(
              (form) => form.execution.scopeRef === scopeRef,
            )
          );
        },
      }),
    ),
  );
}

function serializedBattleSubjectOwnsBoundProcedure(
  subject: EncodedBattleSubject,
  combatants: readonly EncodedBattleCreatureSnapshot[],
  readiedSpells: readonly EncodedBattleReadiedSpellSnapshot[],
  readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[],
): boolean {
  const procedureRefs = battleSubjectProcedureRefs(subject);
  if (procedureRefs.length === 0) return true;
  const actorOwnsProcedureRefs = (ownedSubject: {
    readonly actorId: CombatantId;
  }): boolean =>
    serializedProcedureRefsBelongToCombatant(
      ownedSubject.actorId,
      procedureRefs,
      combatants,
    );

  return Match.value(subject).pipe(
    Match.discriminatorsExhaustive("tag")({
      action: actorOwnsProcedureRefs,
      actionSpell: actorOwnsProcedureRefs,
      bonusAction: actorOwnsProcedureRefs,
      bonusActionDashSpell: actorOwnsProcedureRefs,
      bonusActionSpell: actorOwnsProcedureRefs,
      bonusActionStandardAction: actorOwnsProcedureRefs,
      companionLifecycle: actorOwnsProcedureRefs,
      druidWildShape: actorOwnsProcedureRefs,
      findFamiliarSharedSenses: actorOwnsProcedureRefs,
      findFamiliarTouchSpell: actorOwnsProcedureRefs,
      monkFocusFlurryOfBlowsStrike: (strike) =>
        serializedMonkFocusStrikeOwnsBoundProcedures(strike, combatants),
      monkFocusOption: actorOwnsProcedureRefs,
      pactOfTheChainFamiliarAttack: (attack) =>
        serializedProcedureRefsBelongToCombatant(
          attack.familiarId,
          procedureRefs,
          combatants,
        ),
      runtimeCommand: (command) =>
        serializedRuntimeCommandOwnsBoundProcedure({
          command,
          procedureRefs,
          combatants,
          readiedSpells,
          readiedResponses,
        }),
      unitFeature: actorOwnsProcedureRefs,
      unitFeatureHeldWeaponActivation: actorOwnsProcedureRefs,
    }),
  );
}

function serializedRuntimeCommandOwnsBoundProcedure(input: {
  readonly command: EncodedRuntimeCommandBattleSubject;
  readonly procedureRefs: readonly BattleProcedureExecutionRef[];
  readonly combatants: readonly EncodedBattleCreatureSnapshot[];
  readonly readiedSpells: readonly EncodedBattleReadiedSpellSnapshot[];
  readonly readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[];
}): boolean {
  const {
    command,
    procedureRefs,
    combatants,
    readiedSpells,
    readiedResponses,
  } = input;
  const policy = serializedRuntimeCommandReferencePolicy(command);
  return Match.value(policy).pipe(
    Match.discriminatorsExhaustive("kind")({
      combatantOwned: ({ ownerId }) =>
        serializedProcedureRefsBelongToCombatant(
          ownerId,
          procedureRefs,
          combatants,
        ),
      readiedAttackOwned: ({ ownerId, procedureRef }) =>
        readiedResponses.some(
          (readied) =>
            readied.actorId === ownerId &&
            readied.response.kind === "attack" &&
            readied.response.procedureRef === procedureRef,
        ),
      readiedSpellOwned: ({ ownerId, procedureRef }) =>
        readiedSpells.some(
          (readied) =>
            readied.casterId === ownerId &&
            readied.procedureRef === procedureRef,
        ),
      opportunityAttackProcedureOwned: ({ ownerId, procedureRef }) =>
        serializedOpportunityAttackProcedureRefIsBound(
          combatants,
          ownerId,
          procedureRef,
        ),
      retaliationAttackProcedureOwned: ({ ownerId, procedureRef }) =>
        serializedCharacterAttackProcedureRefIsBound(
          combatants.find((combatant) => combatant.combatantId === ownerId),
          procedureRef,
        ),
      spellInvocationOwned: ({ ownerId, procedureRef, executionFactsKind }) => {
        const binding = characterProcedureBinding(
          combatants,
          ownerId,
          procedureRef,
        );
        return (
          binding?.procedure.kind === "spellInvocation" &&
          binding.procedure.executionFacts.kind === executionFactsKind
        );
      },
    }),
  );
}

function serializedMonkFocusStrikeOwnsBoundProcedures(
  subject: Extract<
    EncodedBattleSubject,
    { readonly tag: "monkFocusFlurryOfBlowsStrike" }
  >,
  combatants: readonly EncodedBattleCreatureSnapshot[],
): boolean {
  const owner = combatants.find(
    (combatant) => combatant.combatantId === subject.actorId,
  );
  if (owner?.origin.kind !== "character") return false;
  const focusBinding = owner.origin.execution.procedureBindings.find(
    (binding) => binding.procedureRef === subject.focusProcedureRef,
  );
  return (
    owner.origin.attackExecution.unarmedStrikeProcedureRef ===
      subject.procedureRef &&
    focusBinding !== undefined &&
    focusBinding.procedure.kind === "unitSupportProfile" &&
    (typeof focusBinding.procedure.execution === "string"
      ? focusBinding.procedure.execution
      : focusBinding.procedure.execution.kind) ===
      MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE
  );
}

function serializedProcedureRefsBelongToCombatant(
  ownerId: CombatantId,
  procedureRefs: readonly BattleProcedureExecutionRef[],
  combatants: readonly EncodedBattleCreatureSnapshot[],
): boolean {
  const owner = combatants.find(
    (combatant) => combatant.combatantId === ownerId,
  );
  return (
    owner !== undefined &&
    procedureRefs.every((procedureRef) =>
      serializedCombatantAuthoritativeExecutionReferences(owner).includes(
        procedureRef,
      ),
    )
  );
}

const SERIALIZED_EXECUTION_REFERENCE_FIELD_NAMES = new Set([
  "procedureRef",
  "procedureRefs",
  "effectRef",
  "resourcePoolRef",
  "resourcePoolRefs",
  "rechargeTargets",
  "formExecutionRef",
]);

function serializedExecutionReferenceFieldName(key: string): boolean {
  return (
    SERIALIZED_EXECUTION_REFERENCE_FIELD_NAMES.has(key) ||
    key.endsWith("ProcedureRef") ||
    key.endsWith("ProcedureRefs") ||
    key.endsWith("EffectRef")
  );
}

function serializedExecutionReferenceOwnerId(
  fields: object,
  referenceKey: string,
): CombatantId | undefined {
  const ownerKeys = referenceKey.startsWith("source")
    ? ["sourceCombatantId", "sourceOwnerId"]
    : referenceKey.startsWith("triggering")
      ? ["triggeringCombatantId"]
      : referenceKey === "formExecutionRef"
        ? ["actorId", "combatantId", "ownerId"]
        : [
            "actorId",
            "casterId",
            "attackerId",
            "combatantId",
            "ownerId",
            "beneficiaryId",
          ];
  const entries = Object.entries(fields);
  for (const key of ownerKeys) {
    const ownerEntry = entries.find(([fieldName]) => fieldName === key);
    if (ownerEntry !== undefined && Schema.is(CombatantId)(ownerEntry[1])) {
      return ownerEntry[1];
    }
  }
  return undefined;
}

function serializedExecutionReferenceIsSubjectProcedure(
  depth: number,
  key: string,
  ownerId: CombatantId | undefined,
): boolean {
  return (
    depth === 0 &&
    (key === "procedureRef" ||
      (key === "sourceProcedureRef" && ownerId === undefined))
  );
}

function appendSerializedExecutionReferences(input: {
  readonly references: SerializedExecutionReferenceOwnership[];
  readonly fields: object;
  readonly key: string;
  readonly field: unknown;
  readonly depth: number;
}): void {
  const { references, fields, key, field, depth } = input;
  if (!serializedExecutionReferenceFieldName(key)) return;
  if (
    key === "effectRef" &&
    "kind" in fields &&
    fields.kind === "spellMarkedDamageRider"
  ) {
    return;
  }
  const ownerId = serializedExecutionReferenceOwnerId(fields, key);
  const values = Array.isArray(field) ? field : [field];
  for (const reference of values) {
    if (typeof reference !== "string") continue;
    references.push({
      ref: reference,
      ownerId,
      subjectProcedure: serializedExecutionReferenceIsSubjectProcedure(
        depth,
        key,
        ownerId,
      ),
    });
  }
}

function visitSerializedExecutionReferences(
  value: unknown,
  depth: number,
  references: SerializedExecutionReferenceOwnership[],
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      visitSerializedExecutionReferences(item, depth + 1, references);
    }
    return;
  }
  if (value === null || typeof value !== "object") return;
  const fields = value;
  for (const [key, field] of Object.entries(fields)) {
    appendSerializedExecutionReferences({
      references,
      fields,
      key,
      field,
      depth,
    });
    visitSerializedExecutionReferences(field, depth + 1, references);
  }
}

function serializedBattleHoleExecutionReferences(
  hole: object,
): readonly SerializedExecutionReferenceOwnership[] {
  const references: SerializedExecutionReferenceOwnership[] = [];
  visitSerializedExecutionReferences(hole, 0, references);
  return references;
}

function serializedInterruptChoiceOwnsBoundProcedure(input: {
  readonly choice: EncodedBattleInterruptProcedureChoice;
  readonly combatants: readonly EncodedBattleCreatureSnapshot[];
  readonly readiedSpells: readonly EncodedBattleReadiedSpellSnapshot[];
  readonly readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[];
}): boolean {
  const { choice, combatants, readiedSpells, readiedResponses } = input;
  const subjectChoiceOwnsBoundProcedure = (
    subjectChoice: Extract<
      EncodedBattleInterruptProcedureChoice,
      { readonly kind: "nestedProcedure" }
    >,
  ): boolean =>
    serializedBattleSubjectOwnsBoundProcedure(
      subjectChoice.subject,
      combatants,
      readiedSpells,
      readiedResponses,
    ) &&
    serializedReadiedInterruptChoiceOwnsResponse(
      subjectChoice,
      readiedResponses,
    );
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      nestedProcedure: subjectChoiceOwnsBoundProcedure,
      reactionModifier: (reaction) =>
        serializedReactionModifierProcedureRefIsBound(
          combatants,
          reaction.responderId,
          reaction.modifier.procedureRef,
        ),
    }),
  );
}

function serializedReadiedInterruptChoiceOwnsResponse(
  choice: EncodedBattleSubjectInterruptProcedureChoice,
  readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[],
): boolean {
  return Match.value(choice.subject).pipe(
    Match.discriminatorsExhaustive("command")({
      releaseReadiedSpell: () => true,
      releaseReadiedMovement: () =>
        pendingReadiedMovementChoiceOwnsBoundResponse(choice, readiedResponses),
      releaseReadiedAction: () =>
        pendingReadiedActionChoiceOwnsBoundResponse(choice, readiedResponses),
      releaseReadiedAttack: () => true,
      castTriggeredReactionSpell: () => true,
      castAttackHitBonusActionSpell: () => true,
      opportunityAttack: () => true,
      retaliationAttack: () => true,
    }),
  );
}

type EncodedBattleSubjectInterruptProcedureChoice = Extract<
  EncodedBattleInterruptProcedureChoice,
  { readonly kind: "nestedProcedure" }
>;

function pendingReadiedMovementChoiceOwnsBoundResponse(
  choice: EncodedNestedInterruptChoice,
  readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[],
): boolean {
  if (
    choice.subject.tag !== "runtimeCommand" ||
    choice.subject.command !== "releaseReadiedMovement"
  ) {
    return false;
  }
  const subject = choice.subject;
  return readiedResponses.some(
    (readied) =>
      readied.actorId === subject.readiedMovementActorId &&
      readied.response.kind === "movement",
  );
}

function pendingReadiedActionChoiceOwnsBoundResponse(
  choice: EncodedNestedInterruptChoice,
  readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[],
): boolean {
  if (
    choice.subject.tag !== "runtimeCommand" ||
    choice.subject.command !== "releaseReadiedAction"
  ) {
    return false;
  }
  const subject = choice.subject;
  return readiedResponses.some(
    (readied) =>
      readied.actorId === subject.reactorId &&
      readied.response.kind === "action",
  );
}

const BattleSnapshotCommonFields = {
  battleId: BattleId,
  round: Schema.Number,
  currentActorId: CombatantId,
  turnOrder: Schema.Array(CombatantId),
  companions: Schema.Array(BattleCompanionSnapshotSchema),
  lightEmitters: Schema.Array(BattleLightEmitterSchema),
  obscurementZones: Schema.Array(BattleObscurementZoneSchema),
  turn: BattleTurnSnapshotSchema,
  readiedResponses: Schema.Struct({
    spells: Schema.Array(BattleReadiedSpellSnapshotSchema),
    actionsOrMovements: Schema.Array(BattleReadiedResponseSnapshotSchema),
  }),
  helpAttackMarkers: Schema.Array(BattleHelpAttackSnapshotSchema),
};

const BattleSnapshotExcludedFields = {
  // Execution allocation, replay, and continuation frontier state are owned
  // by the runtime/continuation envelopes, not by the durable checkpoint.
  executionScopeCursors: Schema.optionalWith(Schema.Never, { exact: true }),
  retiredExecutionScopeAllocations: Schema.optionalWith(Schema.Never, {
    exact: true,
  }),
  acts: Schema.optionalWith(Schema.Never, { exact: true }),
  pendingInterrupt: Schema.optionalWith(Schema.Never, { exact: true }),
};

type BattleSnapshotInvariantShapeSchema = Schema.Struct<
  typeof BattleSnapshotCommonFields & {
    combatants: Schema.Array$<BattleCreatureSnapshotInvariantShapeSchema>;
  }
>;

type BattleSnapshotInvariantInput =
  Schema.Schema.Type<BattleSnapshotInvariantShapeSchema>;

function battleSnapshotInvariantsHold(
  snapshot: BattleSnapshotInvariantInput,
): boolean {
  const liveCombatantIds = new Set(
    snapshot.combatants.map((combatant) => combatant.combatantId),
  );
  const executionScopeRefs = snapshot.combatants.flatMap(
    battleSnapshotExecutionScopeRefs,
  );
  return (
    battleSnapshotLiveCombatantIdsAreUnique(snapshot, liveCombatantIds) &&
    new Set(executionScopeRefs).size === executionScopeRefs.length &&
    snapshot.readiedResponses.spells.every((readied) =>
      serializedReadiedSpellOwnsInvocation(snapshot.combatants, readied),
    ) &&
    snapshot.readiedResponses.actionsOrMovements.every((readied) =>
      serializedReadiedResponseIsBound(snapshot.combatants, readied),
    ) &&
    snapshot.lightEmitters.every((emitter) =>
      serializedLightEmitterOwnsSource(emitter, snapshot.combatants),
    ) &&
    snapshot.obscurementZones.every((zone) =>
      serializedObscurementZoneOwnsSource(zone, snapshot.combatants),
    ) &&
    snapshot.combatants.every((combatant) =>
      battleSnapshotExecutionScopesBelongToBattle(snapshot.battleId, combatant),
    )
  );
}

function battleSnapshotExecutionScopeRefs(
  combatant: EncodedBattleCreatureSnapshot,
): readonly BattleExecutionScopeRef[] {
  return combatant.origin.kind === "statBlock"
    ? [combatant.origin.execution.scopeRef]
    : [
        combatant.origin.execution.scopeRef,
        combatant.origin.attackExecution.scopeRef,
        ...combatant.origin.druidWildShapeAvailableForms.map(
          (form) => form.execution.scopeRef,
        ),
      ];
}

function battleSnapshotLiveCombatantIdsAreUnique(
  snapshot: BattleSnapshotInvariantInput,
  liveCombatantIds: ReadonlySet<CombatantId>,
): boolean {
  return liveCombatantIds.size === snapshot.combatants.length;
}

function battleSnapshotExecutionScopesBelongToBattle(
  battleId: BattleId,
  combatant: EncodedBattleCreatureSnapshot,
): boolean {
  if (combatant.origin.kind === "statBlock") {
    return battleStatBlockExecutionScopeRefBelongsToBattle(
      combatant.origin.execution.scopeRef,
      battleId,
    );
  }
  return (
    battleCharacterExecutionScopeRefBelongsToBattle(
      combatant.origin.execution.scopeRef,
      battleId,
    ) &&
    battleAttackExecutionScopeRefBelongsToBattle(
      combatant.origin.attackExecution.scopeRef,
      battleId,
    ) &&
    combatant.origin.druidWildShapeAvailableForms.every((form) =>
      battleStatBlockExecutionScopeRefBelongsToBattle(
        form.execution.scopeRef,
        battleId,
      ),
    )
  );
}

const battleSnapshotInvariantAnnotations = {
  message: () =>
    "Battle combatants and execution scopes must be unique and battle-owned.",
};

export const BattlePresentedSnapshotSchema = Schema.Struct({
  ...BattleSnapshotCommonFields,
  ...BattleSnapshotExcludedFields,
  combatants: Schema.Array(BattlePresentedCreatureSnapshotSchema),
})
  .pipe(
    Schema.filter(
      battleSnapshotInvariantsHold,
      battleSnapshotInvariantAnnotations,
    ),
  )
  .annotations({ identifier: "BattlePresentedSnapshot" });

export const BattleSnapshotSchema = Schema.Struct({
  ...BattleSnapshotCommonFields,
  ...BattleSnapshotExcludedFields,
  combatants: Schema.Array(BattleCreatureSnapshotSchema),
})
  .pipe(
    Schema.filter(
      battleSnapshotInvariantsHold,
      battleSnapshotInvariantAnnotations,
    ),
  )
  .annotations({ identifier: "BattleSnapshot" });

export const BattleActDiscoveryCandidateSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  initialHoles: Schema.Array(BattleHoleSchema),
});

const BattleInterruptDecisionHoleSchema = Schema.Struct({
  holeInstanceKey: BattleHoleInstanceKeySchema,
  holeId: BattleHoleIdSchema,
  kind: Schema.Literal("interruptDecision"),
  label: Schema.String,
  trigger: Schema.Literal(...BATTLE_INTERRUPT_TRIGGERS),
  eligibleResponders: Schema.Array(CombatantId),
});

export const BattleInterruptDecisionFrontierSchema = Schema.Struct({
  kind: Schema.Literal("interruptDecision"),
  trigger: Schema.Literal(...BATTLE_INTERRUPT_TRIGGERS),
  decisionHole: BattleInterruptDecisionHoleSchema,
  choices: Schema.NonEmptyArray(BattleInterruptProcedureChoiceSchema),
  stackDepth: BattleReplayStackDepth,
});

export const BattleCheckpointFrontierHolesSchema = Schema.Struct({
  kind: Schema.Literal("holes"),
  subject: BattleSubjectSchema,
  holes: Schema.NonEmptyArray(BattleHoleSchema),
  continuation: Schema.Union(
    Schema.Struct({ kind: Schema.Literal("ordinaryReplay") }),
    Schema.Struct({ kind: Schema.Literal("runtimeOwnedInterrupt") }),
  ),
});

type EncodedBattleCheckpointFrontier =
  | {
      readonly kind: "acts";
      readonly acts: readonly EncodedBattleActDiscoveryCandidate[];
    }
  | Schema.Schema.Type<typeof BattleCheckpointFrontierHolesSchema>
  | Schema.Schema.Type<typeof BattleInterruptDecisionFrontierSchema>;

type EncodedBattleCheckpointFrontierEnvelope = {
  readonly checkpoint: Schema.Schema.Type<typeof BattleSnapshotSchema>;
  readonly frontier: EncodedBattleCheckpointFrontier;
};

function serializedInterruptChoiceSubject(
  choice: EncodedBattleInterruptProcedureChoice,
): EncodedRuntimeCommandBattleSubject | undefined {
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      nestedProcedure: ({ subject }) =>
        subject.tag === "runtimeCommand" ? subject : undefined,
      reactionModifier: () => undefined,
    }),
  );
}

function serializedInterruptChoiceTargetIsLive(
  subject: EncodedRuntimeCommandBattleSubject | undefined,
  combatants: readonly EncodedBattleCreatureSnapshot[],
): boolean {
  if (subject === undefined) return true;
  return serializedRuntimeCommandTargetIsLive(subject, combatants);
}

function serializedRuntimeCommandTargetIsLive(
  command: EncodedRuntimeCommandBattleSubject,
  combatants: readonly EncodedBattleCreatureSnapshot[],
): boolean {
  const targetIsLive = (targetId: CombatantId): boolean =>
    combatants.some((combatant) => combatant.combatantId === targetId);
  return Match.value(serializedRuntimeCommandReferencePolicy(command)).pipe(
    Match.discriminatorsExhaustive("kind")({
      combatantOwned: () => true,
      opportunityAttackProcedureOwned: ({ targetId }) => targetIsLive(targetId),
      readiedAttackOwned: ({ targetId }) => targetIsLive(targetId),
      readiedSpellOwned: () => true,
      retaliationAttackProcedureOwned: ({ targetId }) => targetIsLive(targetId),
      spellInvocationOwned: () => true,
    }),
  );
}

function serializedInterruptChoiceMatchesTrigger(
  choice: EncodedBattleInterruptProcedureChoice,
  trigger: (typeof BATTLE_INTERRUPT_TRIGGERS)[number],
  readiedSpells: readonly EncodedBattleReadiedSpellSnapshot[],
): boolean {
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      nestedProcedure: ({ subject }) =>
        Match.value(subject).pipe(
          Match.discriminatorsExhaustive("command")({
            releaseReadiedSpell: (release) =>
              readiedSpells.some(
                (readied) =>
                  readied.casterId === release.readiedSpellCasterId &&
                  readied.procedureRef === release.procedureRef &&
                  readied.trigger === trigger,
              ),
            releaseReadiedMovement: () => trigger === "reportedReadyTrigger",
            releaseReadiedAction: () => trigger === "reportedReadyTrigger",
            releaseReadiedAttack: () => trigger === "reportedReadyTrigger",
            castTriggeredReactionSpell: () =>
              trigger === "attackHit" ||
              trigger === "spellCast" ||
              trigger === "afterDamage" ||
              trigger === "creatureFalls",
            castAttackHitBonusActionSpell: () => trigger === "attackHit",
            opportunityAttack: () => trigger === "opportunityAttack",
            retaliationAttack: () => trigger === "afterDamage",
          }),
        ),
      reactionModifier: ({ modifier }) =>
        Match.value(modifier.kind).pipe(
          Match.when("abilityCheckReduction", () => false),
          Match.when("attackDamageReduction", () => trigger === "attackHit"),
          Match.when("attackRollReduction", () => trigger === "attackHit"),
          Match.when("damageRollReduction", () => trigger === "attackDamage"),
          Match.when("fallDamageReduction", () => trigger === "creatureFalls"),
          Match.exhaustive,
        ),
    }),
  );
}

function serializedInterruptChoiceExpectedProcedureRefs(
  choice: EncodedBattleInterruptProcedureChoice,
): ReadonlySet<BattleProcedureExecutionRef> {
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      nestedProcedure: ({ subject }) =>
        new Set(battleSubjectProcedureRefs(subject)),
      reactionModifier: ({ modifier }) => new Set([modifier.procedureRef]),
    }),
  );
}

function serializedInterruptChoiceInvariantsHold(input: {
  readonly choice: EncodedBattleInterruptProcedureChoice;
  readonly trigger: (typeof BATTLE_INTERRUPT_TRIGGERS)[number];
  readonly combatants: readonly EncodedBattleCreatureSnapshot[];
  readonly readiedSpells: readonly EncodedBattleReadiedSpellSnapshot[];
  readonly readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[];
  readonly subjectIsBound: (subject: EncodedBattleSubject) => boolean;
  readonly holesAreBound: (
    holes: readonly EncodedBattleHole[],
    expectedProcedureRefs: ReadonlySet<BattleProcedureExecutionRef>,
  ) => boolean;
}): boolean {
  const { choice, combatants, readiedSpells, readiedResponses, trigger } =
    input;
  const subject = serializedInterruptChoiceSubject(choice);
  const subjectIsBound = subject === undefined || input.subjectIsBound(subject);
  return (
    serializedInterruptChoiceMatchesTrigger(choice, trigger, readiedSpells) &&
    serializedInterruptChoiceTargetIsLive(subject, combatants) &&
    subjectIsBound &&
    serializedInterruptChoiceOwnsBoundProcedure({
      choice,
      combatants,
      readiedSpells,
      readiedResponses,
    }) &&
    input.holesAreBound(
      choice.initialHoles,
      serializedInterruptChoiceExpectedProcedureRefs(choice),
    )
  );
}

function battleCheckpointFrontierInvariantsHold(
  envelope: EncodedBattleCheckpointFrontierEnvelope,
): boolean {
  const { checkpoint, frontier } = envelope;
  const boundExecutionRefs = new Set(
    checkpoint.combatants.flatMap(
      serializedCombatantAuthoritativeExecutionReferences,
    ),
  );
  const readiedSpells = checkpoint.readiedResponses.spells;
  const readiedResponses = checkpoint.readiedResponses.actionsOrMovements;
  const subjectIsBound = (subject: EncodedBattleSubject): boolean =>
    serializedBattleSubjectOwnsBoundExecutionReferences(
      subject,
      checkpoint.combatants,
    ) &&
    serializedBattleSubjectOwnsBoundProcedure(
      subject,
      checkpoint.combatants,
      readiedSpells,
      readiedResponses,
    );
  const holesAreBound = (
    holes: readonly EncodedBattleHole[],
    expectedProcedureRefs: ReadonlySet<BattleProcedureExecutionRef>,
  ): boolean =>
    serializedBattleHolesOwnBoundExecutionReferences({
      holes,
      combatants: checkpoint.combatants,
      boundExecutionRefs,
      expectedProcedureRefs,
    });

  return Match.value(frontier).pipe(
    Match.discriminatorsExhaustive("kind")({
      acts: (value) =>
        value.acts.every(
          (act) =>
            subjectIsBound(act.subject) &&
            holesAreBound(
              act.initialHoles,
              new Set(battleSubjectProcedureRefs(act.subject)),
            ),
        ),
      holes: (value) =>
        subjectIsBound(value.subject) &&
        holesAreBound(
          value.holes,
          new Set(battleSubjectProcedureRefs(value.subject)),
        ),
      interruptDecision: (value) =>
        value.trigger === value.decisionHole.trigger &&
        value.choices.every((choice) =>
          serializedInterruptChoiceInvariantsHold({
            choice,
            trigger: value.trigger,
            combatants: checkpoint.combatants,
            readiedSpells,
            readiedResponses,
            subjectIsBound,
            holesAreBound,
          }),
        ),
    }),
  );
}

export const BattleCheckpointFrontierEnvelopeSchema = Schema.Struct({
  checkpoint: BattleSnapshotSchema,
  frontier: Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("acts"),
      acts: Schema.Array(BattleActDiscoveryCandidateSchema),
    }),
    BattleCheckpointFrontierHolesSchema,
    BattleInterruptDecisionFrontierSchema,
  ),
})
  .pipe(
    Schema.filter(battleCheckpointFrontierInvariantsHold, {
      message: () =>
        "Battle checkpoint frontier references must be bound to the checkpoint and its subjects.",
    }),
  )
  .annotations({ identifier: "BattleCheckpointFrontierEnvelope" });
// KERNEL-COVERAGE: runtime-owner BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE
