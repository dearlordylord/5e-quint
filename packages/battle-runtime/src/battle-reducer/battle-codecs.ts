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
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
// This module owns Effect Schema values for battle state execution.

import {
  ATTACK_ROLL_MODES,
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
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
import { EFFECT_OCCURRENCE_SOURCE_KINDS } from "../character-execution-vocabulary.ts";
import { BattleRoundSchema } from "../active-effect/round-codec.ts";
import { BATTLE_ACTIVE_EFFECT_KINDS } from "../active-effect/types.ts";
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
import { SpellExecutionFactsSchema } from "./spell-execution-facts-codec.ts";
import { battleActiveEffectOccurrenceSpatialClass } from "./creature-state-execution.ts";
import {
  UnitFeatureProcedureExecutionSchema,
  UnitSupportProcedureExecutionSchema,
} from "./procedure-execution-codecs.ts";
import { SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS } from "./battle-runtime-protocol.ts";
import {
  grantedAreaSaveDamageActionHoleKey,
  escapeSpellRestraintAbilityCheckHoleKey,
} from "./selected-effect-hole-key.ts";
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
  battleInterruptAttackExecutionSelectionWithFields,
  ReadyTriggerDescription,
  SpellInvocationRefSchema,
} from "../battle-subjects.ts";
import {
  BattleAreaId,
  BattleEffectExecutionRef,
  BattleEffectExecutionOrdinal,
  BattleAttackExecutionScopeRef,
  BattleAttackProcedureExecutionRef,
  BattleCharacterExecutionScopeRef,
  BattleMovableLightId,
  BattleId,
  BattleLineDirectionId,
  BattleObjectId,
  BattleResourcePoolExecutionRef,
  BattleStatBlockExecutionScopeRef,
  BattleStatBlockProcedureExecutionRef,
  BattleProcedureExecutionRef,
  BattleReplayStackDepth,
  battleProcedureExecutionRefBelongsToScope,
  battleEffectExecutionRefBelongsToScope,
  battleEffectExecutionRefOrdinalIsBefore,
  battleCharacterExecutionScopeRefBelongsToBattle,
  battleCharacterExecutionScopeRefBelongsToCombatant,
  battleAttackExecutionScopeRefBelongsToBattle,
  battleAttackExecutionScopeRefBelongsToCombatant,
  battleResourcePoolExecutionRefBelongsToScope,
  battleStatBlockExecutionScopeRefBelongsToBattle,
  battleStatBlockExecutionScopeRefBelongsToCombatant,
  battleStatBlockExecutionScopeRefIsWellFormed,
  BattleSpellEffectOccurrenceId,
  BattleStartTurnOccurrenceId,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";
import type { BattleExecutionScopeRef } from "../identity.ts";
import { creatureAttackRollMechanicsAreSupported } from "../statblock-action-support.ts";
import { ATTACK_DAMAGE_ABILITY_MODIFIER_CHOICE_SELECTIONS } from "./attack-damage-ability-modifier-choice.ts";
import { ATTACK_DAMAGE_DIE_FLOOR_CHOICE_SELECTIONS } from "./attack-damage-die-floor-choice.ts";
import {
  BATTLE_MAGIC_SUPPRESSION_ONGOING_SPELL_EFFECT_SOURCE_KINDS,
  BATTLE_ATTACK_RANGE_BANDS,
  PERCEPTION_GATED_ATTACK_ROLL_DEFENSE_BYPASS_SENSES,
  COMPELLED_BEHAVIOR_OPTIONS,
  DUPLICATE_HIT_INTERCEPTION_DUPLICATE_COUNTS,
  DUPLICATE_HIT_INTERCEPTION_DIE_SIZE,
  DUPLICATE_HIT_INTERCEPTION_SUCCESS_AT_LEAST,
  DUPLICATE_HIT_INTERCEPTION_UNAFFECTED_SENSES,
  OPEN_HAND_TECHNIQUE_DECISION_CHOICES,
  SELF_TRANSFORMATION_MODE_KINDS,
  SAVE_GATED_TURN_CONSTRAINT_SOMATIC_FAILURE_PERCENT,
  TEMPORARY_ABILITY_CHECK_ROLL_MODE_MAX_ACTIVE_EFFECTS,
} from "./domain-constants.ts";
import { BattleDamageRelationshipQuestionIdSchema } from "./damage-relationship-question-id.ts";
import {
  AbilityModifier,
  AbilitySchema,
  AttackBonus,
  BATTLE_SURFACE_SKILLS,
  BattleAudibleBoomSchema,
  DimIlluminationEmissionSchema,
  IlluminationEmissionSchema,
  EmitterOpaqueCoverInteractionSchema,
  DamageAmount,
  DamageDieSizeSchema,
  DamageTypeSchema,
  DcSourceSchema,
  DifficultyClass,
  MovementFeet,
  SpellSlotLevel,
  SupportedAttackActionOptionSchema,
} from "./codec-building-blocks.ts";
import { BattleSpellEffectLevel } from "./spells-effective-level.ts";
import {
  BRUTAL_STRIKE_EFFECT_DECISION_CHOICES,
  TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES,
} from "../unit-feature-support.ts";
import type {
  BattleFill,
  BattleHole,
  BattleMovementFillValue,
} from "../battle-state-execution.ts";
import {
  BATTLE_START_TURN_OCCURRENCE_KINDS,
  BATTLE_TEMPORARY_HIT_POINT_CHOICES,
} from "../battle-state-execution.ts";
import { ATTACK_PRESENTATION_JOIN_ISSUE_REASONS } from "../attack-presentation-contract.ts";
const NonEmptyTrimmedStringSchema = Schema.Trimmed.pipe(
  Schema.check(Schema.isNonEmpty()),
);
const BattleCompanionResolvedStatBlockIdSchema = NonEmptyTrimmedStringSchema;
const BattleCompanionDurableIdSchema = NonEmptyTrimmedStringSchema;
const BattleCompanionIdentitySchema = Schema.Union([
  Schema.Struct({ tag: Schema.Literal("battleOnly") }),
  Schema.Struct({
    tag: Schema.Literal("retainedBetweenBattles"),
    durableCompanionId: BattleCompanionDurableIdSchema,
  }),
]);
const BattleCompanionProtocolSchema = Schema.Struct({
  tag: Schema.Literals(RETAINED_COMPANION_PROTOCOL_TAGS),
});
const SpawnedCompanionCreatureTypeOverrideSchema = Schema.Literals([
  "celestial",
  "fey",
  "fiend",
]);
const BattleCompanionPlacementSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("unoccupiedSpaceWithinSpellRange"),
    positionId: Schema.optionalKey(BattleTablePositionId),
  }),
  Schema.Struct({
    kind: Schema.Literal("unoccupiedSpaceWithin30Feet"),
    positionId: Schema.optionalKey(BattleTablePositionId),
  }),
]);
type BattleCompanionPlacementEncoded = Schema.Codec.Encoded<
  typeof BattleCompanionPlacementSchema
>;
const HpSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThanOrEqualTo(0)),
  Schema.brand("NonNegativeInteger"),
  Schema.brand("Hp"),
);
const PositiveHpSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThanOrEqualTo(1)),
  Schema.brand("NonNegativeInteger"),
  Schema.brand("Hp"),
  Schema.brand("PositiveInteger"),
);
const InitiativeScoreSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
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
const AttackDamageDieFloorChoiceSelectionSchema = Schema.Literals(
  ATTACK_DAMAGE_DIE_FLOOR_CHOICE_SELECTIONS,
);
const AttackDamageAbilityModifierChoiceSelectionSchema = Schema.Literals(
  ATTACK_DAMAGE_ABILITY_MODIFIER_CHOICE_SELECTIONS,
);

const OngoingFeatureExpirationSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("startOfTurn"),
    combatantId: Schema.String,
  }),
  Schema.Struct({
    kind: Schema.Literal("endOfTurn"),
    combatantId: Schema.String,
    round: Schema.Number,
  }),
]);
const EndOfTurnOngoingFeatureExpirationSchema = Schema.Struct({
  kind: Schema.Literal("endOfTurn"),
  combatantId: Schema.String,
  round: Schema.Number,
});

export const ActiveOngoingFeatureOccurrenceSnapshotSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("turnBoundary"),
    expiresAt: OngoingFeatureExpirationSchema,
    sourceProcedureRef: BattleProcedureExecutionRef,
    source: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    kind: Schema.Literal("roundExtended"),
    expiresAt: EndOfTurnOngoingFeatureExpirationSchema,
    maxExpiresAt: EndOfTurnOngoingFeatureExpirationSchema,
    sourceProcedureRef: BattleProcedureExecutionRef,
    source: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    kind: Schema.Literal("fixedDuration"),
    expiresAt: EndOfTurnOngoingFeatureExpirationSchema,
    sourceProcedureRef: BattleProcedureExecutionRef,
    source: Schema.optionalKey(Schema.Never),
  }),
]);

const BattleHoleIdSchema = NonEmptyTrimmedStringSchema.pipe(
  Schema.brand("HoleId"),
);
const BattleHoleInstanceKeySchema = NonEmptyTrimmedStringSchema.pipe(
  Schema.brand("HoleInstanceKey"),
);

const BattleHoleBaseSchema = {
  holeInstanceKey: BattleHoleInstanceKeySchema,
  holeId: BattleHoleIdSchema,
  label: Schema.String,
  spell: Schema.optionalKey(Schema.Never),
  unit: Schema.optionalKey(Schema.Never),
} as const;
const BattleStartTurnOccurrenceOptionSchema = Schema.Struct({
  occurrenceId: BattleStartTurnOccurrenceId,
  kind: Schema.Literals(BATTLE_START_TURN_OCCURRENCE_KINDS),
  label: Schema.String,
});

const BattleAreaWindStrengthSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("strong") }),
  Schema.Struct({ kind: Schema.Literal("notStrong") }),
]);

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
      kind: Schema.Literals(BATTLE_MOVEMENT_SPEED_KINDS),
      movementBudgetFeet: MovementFeet,
    }),
  ),
} as const;

const D20TestNaturalOneRerollHoleOptionsSchema = {
  d20TestNaturalOneRerolls: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        effectKind: Schema.Literal("d20_test_natural_one_reroll"),
        label: Schema.String,
      }),
    ),
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
  Schema.Constraint
>;

const WildShapeLoadoutObjectRefSchema = Schema.Union([
  ...Object.values(WildShapeLoadoutObjectRefSchemaByKind),
]);

const WildShapeWornLoadoutObjectRefSchema = Schema.Union([
  ...WILD_SHAPE_EFFECTIVE_LOADOUT_WORN_KINDS.map(
    (kind) => WildShapeLoadoutObjectRefSchemaByKind[kind],
  ),
]);

const WildShapeFallInActorSpaceWitnessSchema = Schema.Struct({
  kind: Schema.Literal("actorSpace"),
  positionId: BattleTablePositionId,
});

const WildShapeEquipmentDispositionChoiceSchema = Schema.Union([
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
    practicality: Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("practicalToWear"),
      }),
      Schema.Struct({
        kind: Schema.Literal("notPracticalToWear"),
        fallback: Schema.Union([
          Schema.Struct({
            disposition: Schema.Literal("falls"),
            fallInActorSpace: WildShapeFallInActorSpaceWitnessSchema,
          }),
          Schema.Struct({
            disposition: Schema.Literal("merges"),
          }),
        ]),
      }),
    ]),
  }),
]);

type WildShapeEquipmentDispositionChoiceEncoded = Schema.Codec.Encoded<
  typeof WildShapeEquipmentDispositionChoiceSchema
>;

const WildShapeFormLimbObjectHandlingWitnessSchema = Schema.Struct({
  kind: Schema.Literals(WILD_SHAPE_FORM_LIMB_OBJECT_HANDLING_WITNESSES),
});

const BattleMovableLightCastPlacementSchema = Schema.Struct({
  positionId: BattleTablePositionId,
  distanceFromCasterFeet: MovementFeet,
  nearestSiblingDistanceFeet: Schema.optionalKey(MovementFeet),
});
const BattleMovableLightRepositionPlacementSchema = Schema.Struct({
  positionId: BattleTablePositionId,
  distanceFromCasterFeet: MovementFeet,
  nearestSiblingDistanceFeet: Schema.optionalKey(MovementFeet),
  lightId: BattleMovableLightId,
  moveDistanceFeet: MovementFeet,
});
const BattleMovableLightPlacementValueSchema = Schema.Union([
  Schema.Struct({
    mode: Schema.Literal("cast"),
    form: Schema.Literal("separateLights"),
    lights: Schema.Array(BattleMovableLightCastPlacementSchema),
  }),
  Schema.Struct({
    mode: Schema.Literal("cast"),
    form: Schema.Literal("combinedMediumForm"),
    light: BattleMovableLightCastPlacementSchema,
  }),
  Schema.Struct({
    mode: Schema.Literal("reposition"),
    form: Schema.Literal("separateLights"),
    lights: Schema.Array(BattleMovableLightRepositionPlacementSchema),
  }),
  Schema.Struct({
    mode: Schema.Literal("reposition"),
    form: Schema.Literal("combinedMediumForm"),
    light: BattleMovableLightRepositionPlacementSchema,
  }),
]);

const BattleStagedConditionAutomaticSuccessFactSchema = Schema.Struct({
  kind: Schema.Literal("doesNotSleep"),
  targetId: CombatantId,
});
const BattleImmediateAreaPushDispositionSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("pushed"),
    distanceFeet: MovementFeet,
    destinationId: BattleTablePositionId,
    provokesOpportunityAttacks: Schema.Literal(false),
  }),
  Schema.Struct({
    kind: Schema.Literal("blocked"),
    distanceFeet: MovementFeet,
    reason: Schema.Literals(["blocked", "noLegalDestination"]),
    provokesOpportunityAttacks: Schema.Literal(false),
  }),
]);
const BattleDirectionalPersistentAreaPushDispositionSchema =
  BattleImmediateAreaPushDispositionSchema;

const BattleSpellAreaOriginAnchorSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("tableSelectedPoint"),
  }),
  Schema.Struct({
    kind: Schema.Literal("combatant"),
    combatantId: CombatantId,
  }),
]);

const BattleSpellAreaChoiceBaseSchema = {
  originAnchorId: CombatantId,
  affectedTargetIds: Schema.Array(CombatantId),
} as const;

const BattleObjectDamageDispositionSchema = Schema.Union([
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
]);

const BattleSpellAreaChoiceSchema = Schema.Union([
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.optionalKey(Schema.Never),
    areaId: Schema.optionalKey(Schema.Never),
    stagedConditionAutomaticSuccessFacts: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.optionalKey(Schema.Never),
    areaId: Schema.optionalKey(Schema.Never),
    stagedConditionAutomaticSuccessFacts: Schema.NonEmptyArray(
      BattleStagedConditionAutomaticSuccessFactSchema,
    ),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("saveGatedTargetProjectionArea"),
    affectedObjectIds: Schema.Array(BattleObjectId),
    areaId: Schema.optionalKey(Schema.Never),
    stagedConditionAutomaticSuccessFacts: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("saveGatedAreaControlArea"),
    cubeSideFeet: Schema.Literal(30),
    affectedCreatureWitnesses: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        inCube: Schema.Literal(true),
        canSeePattern: Schema.Literal(true),
      }),
    ),
    areaId: Schema.optionalKey(Schema.Never),
    stagedConditionAutomaticSuccessFacts: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("saveGatedTurnConstraintBundleArea"),
    cubeSideFeet: Schema.Literal(40),
    affectedCreatureWitnesses: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        inCube: Schema.Literal(true),
        chosenByCaster: Schema.Literal(true),
      }),
    ),
    areaId: Schema.optionalKey(Schema.Never),
    stagedConditionAutomaticSuccessFacts: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("persistentAreaSaveConditionArea"),
    areaId: BattleAreaId,
    stagedConditionAutomaticSuccessFacts: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("directionalPersistentAreaArea"),
    areaId: BattleAreaId,
    directionId: BattleLineDirectionId,
    creaturePushes: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        disposition: BattleDirectionalPersistentAreaPushDispositionSchema,
      }),
    ),
    stagedConditionAutomaticSuccessFacts: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("pointOriginSphereSaveDamageArea"),
    objectIgnitionFacts: Schema.Array(
      Schema.Struct({
        objectId: BattleObjectId,
        disposition: Schema.Union([
          Schema.Struct({
            kind: Schema.Literal("flammableUnattended"),
          }),
          Schema.Struct({
            kind: Schema.Literal("notFlammable"),
          }),
          Schema.Struct({
            kind: Schema.Literal("wornOrCarried"),
          }),
        ]),
      }),
    ),
    areaId: Schema.optionalKey(Schema.Never),
    stagedConditionAutomaticSuccessFacts: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("pointOriginSphereObjectDamageArea"),
    nonmagicalUnattendedObjectDamageFacts: Schema.Array(
      Schema.Struct({
        objectId: BattleObjectId,
        disposition: BattleObjectDamageDispositionSchema,
      }),
    ),
    areaId: Schema.optionalKey(Schema.Never),
    stagedConditionAutomaticSuccessFacts: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("selfOriginCubePushArea"),
    creaturePushes: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        disposition: BattleImmediateAreaPushDispositionSchema,
      }),
    ),
    unsecuredObjectPushes: Schema.Array(
      Schema.Struct({
        objectId: BattleObjectId,
        disposition: BattleImmediateAreaPushDispositionSchema,
      }),
    ),
    audibleBoom: BattleAudibleBoomSchema,
    areaId: Schema.optionalKey(Schema.Never),
    stagedConditionAutomaticSuccessFacts: Schema.optionalKey(Schema.Never),
  }),
]);

const BattleObjectIgnitionDispositionSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("flammableUnattended") }),
  Schema.Struct({ kind: Schema.Literal("notFlammable") }),
  Schema.Struct({ kind: Schema.Literal("wornOrCarried") }),
]);

const BattleAttackObjectTargetSpatialFactSchema = Schema.Struct({
  kind: Schema.Literal("attackObjectTarget"),
  actorId: CombatantId,
  objectId: BattleObjectId,
  range: Schema.Union([
    Schema.Struct({ kind: Schema.Literal("meleeReach") }),
    Schema.Struct({
      kind: Schema.Literal("rangedRange"),
      band: Schema.Literals(BATTLE_ATTACK_RANGE_BANDS),
      enemyWithin5FeetCanSeeAttacker: Schema.Boolean,
    }),
  ]),
  attackerCanSeeObject: Schema.Boolean,
  cover: Schema.Literals(COVER_TYPES),
  armorClass: BattleArmorClassSchema,
  damageDisposition: BattleObjectDamageDispositionSchema,
});
type BattleAttackObjectTargetSpatialFactEncoded = Schema.Codec.Encoded<
  typeof BattleAttackObjectTargetSpatialFactSchema
>;

export const BattleFallingCreatureMitigationTriggerWithinRangeFactSchema =
  Schema.Struct({
    kind: Schema.Literal("fallingCreatureMitigationTriggerWithinRange"),
    reactorId: CombatantId,
    fallingCreatureId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
  });
const BattleTargetSpatialFactSchema = Schema.Union([
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
  Schema.Union([
    Schema.Struct({
      kind: Schema.Literal("weaponMasteryPushDisposition"),
      attackerId: CombatantId,
      targetId: CombatantId,
      procedureRef: BattleAttackProcedureExecutionRef,
      attackAbility: BattleAttackExecutionAbilitySchema,
      attackDamageType: DamageTypeSchema,
      attackName: Schema.optionalKey(Schema.Never),
      disposition: BattleImmediateAreaPushDispositionSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("weaponMasteryPushDisposition"),
      attackerId: CombatantId,
      targetId: CombatantId,
      procedureRef: BattleStatBlockProcedureExecutionRef,
      attackAbility: Schema.optionalKey(Schema.Never),
      attackDamageType: Schema.optionalKey(Schema.Never),
      attackName: Schema.optionalKey(Schema.Never),
      disposition: BattleImmediateAreaPushDispositionSchema,
    }),
  ]),
  Schema.Union([
    Schema.Struct({
      kind: Schema.Literal("attackTargetDistance"),
      actorId: CombatantId,
      targetId: CombatantId,
      procedureRef: BattleAttackProcedureExecutionRef,
      attackAbility: BattleAttackExecutionAbilitySchema,
      attackDamageType: DamageTypeSchema,
      attackName: Schema.optionalKey(Schema.Never),
      distanceFeet: MovementFeet,
    }),
    Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("attackTargetDistance"),
        actorId: CombatantId,
        targetId: CombatantId,
        procedureRef: BattleStatBlockProcedureExecutionRef,
        attackAbility: Schema.optionalKey(Schema.Never),
        attackDamageType: Schema.optionalKey(Schema.Never),
        attackName: Schema.optionalKey(Schema.Never),
        statBlockDamageNotation: Schema.optionalKey(Schema.Never),
        distanceFeet: MovementFeet,
      }),
      Schema.Struct({
        kind: Schema.Literal("attackTargetDistance"),
        actorId: CombatantId,
        targetId: CombatantId,
        procedureRef: BattleStatBlockProcedureExecutionRef,
        attackAbility: Schema.optionalKey(Schema.Never),
        attackDamageType: Schema.optionalKey(Schema.Never),
        attackName: Schema.optionalKey(Schema.Never),
        statBlockDamageNotation: Schema.Literal("static"),
        distanceFeet: MovementFeet,
      }),
    ]),
  ]),
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
    kind: Schema.Literal("attackerPerceivesObscuredTargetWithSense"),
    attackerId: CombatantId,
    targetId: CombatantId,
    sense: Schema.Literals(PERCEPTION_GATED_ATTACK_ROLL_DEFENSE_BYPASS_SENSES),
  }),
  Schema.Struct({
    kind: Schema.Literal(
      "attackerUnaffectedByDuplicateHitInterceptionWithSense",
    ),
    attackerId: CombatantId,
    targetId: CombatantId,
    sense: Schema.Literals(DUPLICATE_HIT_INTERCEPTION_UNAFFECTED_SENSES),
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
    kind: Schema.Literal("spawnedCompanionTouchSpellTarget"),
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
    kind: Schema.Literal("spatialMeleeSpellAttackProxyTargetWithinReach"),
    casterId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    forcePositionId: BattleTablePositionId,
    reachFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("linkedEffectPairedWornComponents"),
    casterId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
  }),
  Schema.Struct({
    kind: Schema.Literal("linkedEffectCreaturesDistance"),
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
    size: Schema.Literals([
      "tiny",
      "small",
      "medium",
      "large",
      "huge",
      "gargantuan",
    ]),
    wornOrCarried: Schema.Union([
      Schema.Struct({ kind: Schema.Literal("nobody") }),
      Schema.Struct({ kind: Schema.Literal("caster") }),
      Schema.Struct({
        kind: Schema.Literal("someoneElse"),
        relation: Schema.Literals(["worn", "carried"]),
      }),
    ]),
  }),
  Schema.Struct({
    kind: Schema.Literal("spellDistantObjectLightTarget"),
    casterId: CombatantId,
    objectId: BattleObjectId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
    size: Schema.Literals([
      "tiny",
      "small",
      "medium",
      "large",
      "huge",
      "gargantuan",
    ]),
    wornOrCarried: Schema.Union([
      Schema.Struct({ kind: Schema.Literal("nobody") }),
      Schema.Struct({ kind: Schema.Literal("caster") }),
      Schema.Struct({
        kind: Schema.Literal("someoneElse"),
        relation: Schema.Literals(["worn", "carried"]),
      }),
    ]),
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
    relation: Schema.Literals(["holding", "wearing"]),
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
  BattleFallingCreatureMitigationTriggerWithinRangeFactSchema,
  Schema.Struct({
    kind: Schema.Literal("fallingCreatureTargetWithinRange"),
    casterId: CombatantId,
    targetId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("controlledVerticalSuspensionTargetWithinRange"),
    effectRef: BattleEffectExecutionRef,
    sourceCombatantId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    targetId: CombatantId,
    rangeFeet: MovementFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal(
      "spellCastInterruptionTriggerCasterVisibleWithinRange",
    ),
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
    kind: Schema.Literal("stagedConditionShakeAwakeActorWithin5Feet"),
    actorId: CombatantId,
    targetId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("areaControlShakeAwakeActorWithin5Feet"),
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
]);
type BattleTargetSpatialFactEncoded = Schema.Codec.Encoded<
  typeof BattleTargetSpatialFactSchema
>;
const BattleTargetSpatialFactsSchema = Schema.Array(
  BattleTargetSpatialFactSchema,
);
const BattleDamageRelationshipQuestionSchema = Schema.Union([
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
]);
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
const BattleTargetChoiceRelationshipFactSchema = Schema.Union([
  BattleAttackRollRelationshipFactSchema,
  BattleSavingThrowRelationshipFactSchema,
]);
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
const BattleTargetChoiceRelationshipFactRequestSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("attackRollTargetIsEnemy"),
    attackerId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("savingThrowTargetIsEnemy"),
    actorId: CombatantId,
  }),
]);
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

const BattleObjectDamageOutcomeFieldsSchema = Schema.Union([
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
]);

export const BattleObjectDamageOutcomeSchema =
  BattleObjectDamageOutcomeFieldsSchema.pipe(
    Schema.check(
      Schema.makeFilter(battleObjectDamageOutcomeIsConsistent, {
        message:
          "Object damage components, totals, Hit Point transition, and destruction state must agree.",
      }),
    ),
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
  source: Schema.Union([
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
  ]),
});

export const BattleShovePushOutcomeSchema = Schema.Struct({
  targetId: CombatantId,
  disposition: Schema.Union([
    Schema.Struct({
      kind: Schema.Literal("pushed"),
      distanceFeet: MovementFeet,
      destinationId: BattleTablePositionId,
      provokesOpportunityAttacks: Schema.Literal(false),
    }),
    Schema.Struct({
      kind: Schema.Literal("blocked"),
      distanceFeet: MovementFeet,
      reason: Schema.Literals(["blocked", "noLegalDestination"]),
      provokesOpportunityAttacks: Schema.Literal(false),
    }),
  ]),
});

const BattleSavingThrowRollModeProjectionSchema = Schema.Struct({
  targetId: CombatantId,
  rollMode: Schema.Literals(ATTACK_ROLL_MODES),
});

const BattleSavingThrowFlatBonusProjectionSchema = Schema.Struct({
  targetId: CombatantId,
  sourceCombatantId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
  bonus: Schema.Number,
});

const BattleDamageOccurrenceSourceSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("untrackedDamage") }),
  Schema.Struct({
    kind: Schema.Literal("spellTurnEndDamage"),
    effectRef: BattleEffectExecutionRef,
  }),
]);

const BattleLightEmitterAttachmentSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("combatant"),
    combatantId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("object"),
    objectId: BattleObjectId,
  }),
  Schema.Struct({
    kind: Schema.Literal("movableLight"),
    lightId: BattleMovableLightId,
    positionId: BattleTablePositionId,
    form: Schema.Literals(["separateLights", "combinedMediumForm"]),
  }),
]);

const BattleOngoingSpellEffectRefSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("spellLightEmitter"),
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellActiveEffect"),
    activeEffectKind: Schema.Literals([
      "spellObjectContactDamage",
      "spatialMeleeSpellAttackProxy",
    ]),
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    kind: Schema.Literal("magicSuppressionEmanation"),
    effectRef: BattleEffectExecutionRef,
    areaId: BattleAreaId,
    sourceCombatantId: CombatantId,
  }),
]);
const BattleOngoingSpellOccurrenceRefSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("spellLightEmitter"),
    effectRef: BattleEffectExecutionRef,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellActiveEffect"),
    activeEffectKind: Schema.Literals([
      "spellObjectContactDamage",
      "spatialMeleeSpellAttackProxy",
    ]),
    effectRef: BattleEffectExecutionRef,
  }),
]);
const BattleMagicSuppressionOngoingSpellEffectRefSchema =
  BattleOngoingSpellOccurrenceRefSchema;

const BattleOngoingSpellCombatantTargetSchema = Schema.Struct({
  kind: Schema.Literal("combatant"),
  combatantId: CombatantId,
});
const BattleOngoingSpellObjectTargetSchema = Schema.Struct({
  kind: Schema.Literal("object"),
  objectId: BattleObjectId,
});
const BattleOngoingSpellMagicalEffectTargetSchema = Schema.Struct({
  kind: Schema.Literal("magicalEffect"),
  effect: BattleOngoingSpellEffectRefSchema,
});
const BattleOngoingSpellOccurrenceTargetSchema = Schema.Struct({
  kind: Schema.Literal("magicalEffect"),
  effect: BattleOngoingSpellOccurrenceRefSchema,
});
const BattleOngoingSpellTargetSchema = Schema.Union([
  BattleOngoingSpellCombatantTargetSchema,
  BattleOngoingSpellObjectTargetSchema,
  BattleOngoingSpellMagicalEffectTargetSchema,
]);

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
  effectRef: BattleEffectExecutionRef,
  trigger: Schema.Union([
    Schema.Struct({
      kind: Schema.Literal("condition"),
      condition: Schema.Literals(ALL_CONDITIONS),
    }),
    Schema.Struct({
      kind: Schema.Literal("saveToEnd"),
      ability: AbilitySchema,
      dc: DcSourceSchema,
    }),
  ]),
  damage: SpellTurnDamageSchema,
});

const BattleSpellTurnEndDamageSourceSchema = Schema.Struct({
  ...BattleProcedureSourceSchema,
  effectRef: BattleEffectExecutionRef,
  damage: SpellTurnDamageSchema,
});

const SpellConditionRepeatSaveSchema = Schema.Struct({
  ability: AbilitySchema,
  dc: DcSourceSchema,
});

const EmptySpellAreaChoicesSchema = Schema.Tuple([]);

function exhaustiveBattleHoleSchema<
  S extends Schema.Codec<BattleHole, unknown, unknown, unknown>,
>(
  schema: S &
    ([BattleHole] extends [S["Type"]]
      ? unknown
      : {
          readonly missingBattleHoleVariants: Exclude<BattleHole, S["Type"]>;
        }),
): S {
  return schema;
}

const BattleHolePayloadUnionSchema = Schema.Union([
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("readyDeclaration"),
    label: Schema.String,
    actorId: CombatantId,
    responseChoices: Schema.Array(BattleReadyResponseSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("helpAttackAllyDecision"),
    label: Schema.String,
    helperId: CombatantId,
    choices: Schema.Array(CombatantId),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("helpAttackEnemyDecision"),
    label: Schema.String,
    helperId: CombatantId,
    allyId: CombatantId,
    choices: Schema.Array(CombatantId),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("damageRelationshipDecisions"),
    label: Schema.String,
    damageEventHoleId: BattleHoleIdSchema,
    damageSourceId: CombatantId,
    questions: Schema.NonEmptyArray(BattleDamageRelationshipQuestionSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("targetChoice"),
    choices: Schema.Array(CombatantId),
    procedureRef: Schema.optionalKey(BattleProcedureExecutionRef),
    requiresTableSpatialFact: Schema.optionalKey(Schema.Boolean),
    relationshipFactRequest: Schema.optionalKey(
      BattleTargetChoiceRelationshipFactRequestSchema,
    ),
    spellTargetSpatialFactRequest: Schema.optionalKey(
      Schema.Struct({
        casterId: CombatantId,
        sourceProcedureRef: BattleProcedureExecutionRef,
        rangeFeet: MovementFeet,
        visibility: Schema.Literals([
          "requiresSight",
          "notSpecifiedByProcedure",
        ]),
        requiresKnownWillingTarget: Schema.optionalKey(Schema.Literal(true)),
      }),
    ),
    attack: Schema.optionalKey(
      Schema.Struct({
        actorId: CombatantId,
        selection: BattleAttackExecutionSelectionSchema,
        targetConstraint: Schema.Union([
          Schema.Struct({
            kind: Schema.Literal("meleeReach"),
            reachFeet: MovementFeet,
          }),
          Schema.Struct({
            kind: Schema.Literal("rangedRange"),
            normalFeet: MovementFeet,
            longFeet: MovementFeet,
          }),
        ]),
        acceptsObjectTarget: Schema.optionalKey(Schema.Literal(true)),
      }),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("targetSpatialFacts"),
    label: Schema.String,
    linkedEffectSeparation: Schema.Struct({
      sourceCombatantId: CombatantId,
      targetId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      rangeFeet: MovementFeet,
    }),
    requiresTableSpatialFact: Schema.Literal(true),
    requiresKnownWillingTargets: Schema.optionalKey(Schema.Literal(true)),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("targetSpatialFacts"),
    label: Schema.String,
    spellBeingCast: Schema.Struct({
      casterId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      castLevel: Schema.Number,
      components: Schema.Array(Schema.Literals(["V", "S", "M"])),
    }),
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("areaWindStrength"),
    areaId: BattleAreaId,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("turnConstraintSomaticSpellFailureOutcome"),
    actorId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    failurePercent: Schema.Literal(
      SAVE_GATED_TURN_CONSTRAINT_SOMATIC_FAILURE_PERCENT,
    ),
    activeEffectSources: Schema.Array(
      Schema.Struct({
        sourceProcedureRef: BattleProcedureExecutionRef,
        sourceCombatantId: CombatantId,
      }),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("objectTargetChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("wildShapeEquipmentDisposition"),
    actorId: CombatantId,
    formExecutionRef: BattleStatBlockExecutionScopeRef,
    candidates: Schema.Array(WildShapeLoadoutObjectRefSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("hitPointHealingDistribution"),
    label: Schema.String,
    requiresTableSpatialFact: Schema.Literal(true),
    healingPool: Schema.Struct({
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      unitId: Schema.optionalKey(Schema.Never),
      rangeFeet: MovementFeet,
      poolHitPoints: HpSchema,
      perTargetCap: Schema.Literal("halfHitPointMaximum"),
    }),
    choices: Schema.Array(CombatantId),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("ongoingSpellTargetChoice"),
    label: Schema.String,
    requiresTableSpatialFact: Schema.Literal(true),
    casterId: CombatantId,
    procedureRef: BattleProcedureExecutionRef,
    rangeFeet: MovementFeet,
    choices: Schema.Array(BattleOngoingSpellTargetSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
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
    areaChoices: Schema.Tuple([]),
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("objectDropResolution"),
    objectDrop: Schema.Struct({
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      objectId: BattleObjectId,
      targetIds: Schema.Array(CombatantId),
    }),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("heldObjectFacts"),
    actorId: CombatantId,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("toolPossessionFacts"),
    actorId: CombatantId,
    toolIds: Schema.Tuple([Schema.Literal("poisoners_kit")]),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("cunningStrikeEndTurnCoverFacts"),
    actorId: CombatantId,
    coverDegrees: Schema.Array(
      Schema.Literals(CUNNING_STRIKE_END_TURN_COVER_DEGREES),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("spawnedCompanionConnection"),
    ownerId: CombatantId,
    companionId: CombatantId,
    rangeFeet: MovementFeet,
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("companionReappearancePlacement"),
    ownerId: CombatantId,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("companionReappearanceInitiative"),
    ownerId: CombatantId,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("weaponAttackDamageEnhancementTargetItem"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    requiresTableItemFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("damageTypeChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    choices: Schema.Array(DamageTypeSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("spellTargetList"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    procedure: Schema.optionalKey(Schema.Never),
    minTargets: Schema.Literal(1),
    maxTargets: Schema.Number,
    spatialTargeting: Schema.Union([
      Schema.Struct({ kind: Schema.Literal("individualTargets") }),
      Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
    ]),
    choices: Schema.Array(CombatantId),
    requiresTableSpatialFact: Schema.Literal(true),
    spellTargetSpatialFactRequest: Schema.optionalKey(
      Schema.Struct({
        casterId: CombatantId,
        sourceProcedureRef: BattleProcedureExecutionRef,
        rangeFeet: MovementFeet,
        visibility: Schema.Literal("notSpecifiedByProcedure"),
      }),
    ),
    requiresKnownWillingTargets: Schema.optionalKey(Schema.Literal(true)),
    relationshipFactRequest: Schema.optionalKey(
      BattleSpellTargetListRelationshipFactRequestSchema,
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("attackRoll"),
    attack: SupportedAttackActionOptionSchema,
    attackBonus: AttackBonus,
    rollMode: Schema.optionalKey(Schema.Literals(ATTACK_ROLL_MODES)),
    ongoingFeatureActivations: Schema.optionalKey(
      Schema.Array(
        Schema.Struct({
          procedureRef: BattleProcedureExecutionRef,
          unitId: Schema.optionalKey(Schema.Never),
          label: Schema.optionalKey(Schema.Never),
          rollMode: Schema.Literals(ATTACK_ROLL_MODES),
        }),
      ),
    ),
    missToHitReplacements: Schema.optionalKey(
      Schema.Array(
        Schema.Struct({
          procedureRef: BattleProcedureExecutionRef,
          unitId: Schema.optionalKey(Schema.Never),
          label: Schema.optionalKey(Schema.Never),
        }),
      ),
    ),
    d20TestNaturalOneRerolls: Schema.optionalKey(
      Schema.Array(
        Schema.Struct({
          effectKind: Schema.Literal("d20_test_natural_one_reroll"),
          label: Schema.String,
        }),
      ),
    ),
    relationshipFactRequest: Schema.optionalKey(
      BattleAttackRollRelationshipFactRequestSchema,
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("attackRoll"),
    attackBonus: AttackBonus,
    sourceProcedureRef: BattleProcedureExecutionRef,
    rollMode: Schema.optionalKey(Schema.Literals(ATTACK_ROLL_MODES)),
    missToHitReplacements: Schema.optionalKey(
      Schema.Array(
        Schema.Struct({
          procedureRef: BattleProcedureExecutionRef,
          unitId: Schema.optionalKey(Schema.Never),
          label: Schema.optionalKey(Schema.Never),
        }),
      ),
    ),
    spellAttackRerolls: Schema.optionalKey(
      Schema.Array(
        Schema.Struct({
          effectKind: Schema.Literal("missed_spell_attack_reroll"),
          label: Schema.String,
          sorceryPointCost: ResourceCount,
        }),
      ),
    ),
    d20TestNaturalOneRerolls: Schema.optionalKey(
      Schema.Array(
        Schema.Struct({
          effectKind: Schema.Literal("d20_test_natural_one_reroll"),
          label: Schema.String,
        }),
      ),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    attack: SupportedAttackActionOptionSchema,
    critical: Schema.Boolean,
    attackDamageRiders: Schema.optionalKey(
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
    ),
    spellWeaponDamageRiders: Schema.optionalKey(
      Schema.Array(SpellWeaponDamageRiderSchema),
    ),
    spellMarkedDamageRiders: Schema.optionalKey(
      Schema.Array(SpellMarkedDamageRiderSchema),
    ),
    cunningStrikeOptions: Schema.optionalKey(
      Schema.Array(
        Schema.Struct({
          procedureRef: BattleProcedureExecutionRef,
          optionId: Schema.Literals(BATTLE_CUNNING_STRIKE_OPTION_SELECTION_IDS),
          sourceDamageRiderProcedureRef: BattleProcedureExecutionRef,
          dieCost: Schema.Struct({
            dice: Schema.Literal(1),
            dieSize: Schema.Literal(6),
          }),
        }),
      ),
    ),
    weaponDamageDiceRollChoiceProcedureRefs: Schema.optionalKey(
      Schema.Array(BattleProcedureExecutionRef),
    ),
    attackDamageDieFloorChoiceProcedureRefs: Schema.optionalKey(
      Schema.NonEmptyArray(BattleProcedureExecutionRef),
    ),
    attackDamageAbilityModifierChoice: Schema.optionalKey(
      Schema.Struct({
        procedureRefs: Schema.NonEmptyArray(BattleProcedureExecutionRef),
        unitIds: Schema.optionalKey(Schema.Never),
        appliedDamageAbilityModifier: AbilityModifier,
        declinedDamageAbilityModifier: AbilityModifier,
      }),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    critical: Schema.Boolean,
    sourceProcedureRef: BattleProcedureExecutionRef,
    spellMarkedDamageRiders: Schema.optionalKey(
      Schema.Array(SpellMarkedDamageRiderSchema),
    ),
    spellDamageRerolls: Schema.optionalKey(
      Schema.Array(
        Schema.Struct({
          effectKind: Schema.Literal("damage_dice_reroll"),
          label: Schema.String,
          sorceryPointCost: ResourceCount,
          maximumSelectedDice: Schema.Number.pipe(Schema.check(Schema.isInt())),
        }),
      ),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    grantedAreaSaveDamageAction: Schema.Struct({
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      damageType: DamageTypeSchema,
      expr: DiceExprSchema,
    }),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    glyphExplosiveRune: Schema.Struct({
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      effectRef: BattleEffectExecutionRef,
      damage: Schema.Struct({
        expr: DiceExprSchema,
      }),
    }),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    spellDamageReduction: Schema.Struct({
      effectRef: BattleEffectExecutionRef,
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    sourceDamageRollPenalty: Schema.Struct({
      effectRef: BattleEffectExecutionRef,
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    duplicateHitInterceptionRoll: Schema.Struct({
      targetId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      sourceCombatantId: CombatantId,
      remainingDuplicates: Schema.Literals(
        DUPLICATE_HIT_INTERCEPTION_DUPLICATE_COUNTS,
      ),
      dieSize: Schema.Literal(DUPLICATE_HIT_INTERCEPTION_DIE_SIZE),
      successAtLeast: Schema.Literal(
        DUPLICATE_HIT_INTERCEPTION_SUCCESS_AT_LEAST,
      ),
    }),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    spellTurnStartDamage: BattleSpellTurnStartDamageSourceSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    spellTurnEndDamage: BattleSpellTurnEndDamageSourceSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    movableZone: Schema.Struct({
      ...BattleProcedureSourceSchema,
      effectRef: BattleEffectExecutionRef,
      areaId: BattleAreaId,
      trigger: Schema.Literals([
        "endsTurnWithinFiveFeetOfSphere",
        "rammedBySphere",
      ]),
      save: Schema.Struct({
        ability: Schema.Literal("dex"),
        dc: DcSourceSchema,
      }),
    }),
    critical: Schema.Literal(false),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    areaMovementDistanceDamage: Schema.Struct({
      targetId: CombatantId,
      effectRef: BattleEffectExecutionRef,
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    persistentAreaSaveDamage: Schema.Struct({
      topology: Schema.Literal("stationary"),
      ...BattleProcedureSourceSchema,
      effectRef: BattleEffectExecutionRef,
      areaId: BattleAreaId,
      trigger: Schema.Literals([
        "appearsInArea",
        "entersArea",
        "endsTurnInArea",
      ]),
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: Schema.Literal("piercing"),
      }),
    }),
    critical: Schema.Literal(false),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    persistentAreaSaveDamage: Schema.Struct({
      topology: Schema.Literal("translating"),
      ...BattleProcedureSourceSchema,
      effectRef: BattleEffectExecutionRef,
      areaId: BattleAreaId,
      trigger: Schema.Literals([
        "appearsInArea",
        "movesIntoSpace",
        "entersArea",
        "endsTurnInArea",
      ]),
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: Schema.Literal("poison"),
      }),
    }),
    critical: Schema.Literal(false),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("skillChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
    choices: Schema.Array(Schema.Literals(BATTLE_SURFACE_SKILLS)),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("abilityChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
    choices: Schema.Array(AbilitySchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("targetAbilityChoices"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
    choices: Schema.Array(AbilitySchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("conditionChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
    choices: Schema.NonEmptyArray(Schema.Literals(ALL_CONDITIONS)),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("temporaryAbilityCheckRollModeActiveEffectCount"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
    maximumActiveOneMinuteEffects: Schema.Literal(
      TEMPORARY_ABILITY_CHECK_ROLL_MODE_MAX_ACTIVE_EFFECTS,
    ),
    requiresTableSpellEffectCount: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("compelledBehaviorOptionChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
    choices: Schema.Array(Schema.Literals(COMPELLED_BEHAVIOR_OPTIONS)),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("selfTransformationModeChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
    choices: Schema.NonEmptyArray(
      Schema.Literals(SELF_TRANSFORMATION_MODE_KINDS),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("movableLightPlacement"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
    mode: Schema.Literals(["cast", "reposition"]),
    form: Schema.Literals(["separateLights", "combinedMediumForm"]),
    activeLightIds: Schema.Array(BattleMovableLightId),
    rangeFeet: MovementFeet,
    maxMoveFeet: MovementFeet,
    spacingFeet: MovementFeet,
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("spellAreaChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
    area: Schema.Union([
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
        kind: Schema.Literal("pointOriginGroundSquare"),
        sideFeet: MovementFeet,
      }),
      Schema.Struct({
        kind: Schema.Literal("selfOriginEmanation"),
        radiusFeet: MovementFeet,
      }),
    ]),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("teleportDestination"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
    actorId: CombatantId,
    maxDistanceFeet: MovementFeet,
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("spatialMeleeSpellAttackProxyPosition"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
    mode: Schema.Literals(["cast", "reposition"]),
    maxDistanceFeet: MovementFeet,
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    spellTurnStartSave: Schema.Struct({
      targetId: CombatantId,
      effectRef: BattleEffectExecutionRef,
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
    areaChoices: Schema.Tuple([]),
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    damageOccurrence: BattleDamageOccurrenceSourceSchema,
    saveGatedConditionRepeatSave: Schema.Struct({
      targetId: CombatantId,
      effectRef: BattleEffectExecutionRef,
      sourceProcedureRef: BattleProcedureExecutionRef,
      sourceCombatantId: CombatantId,
      trigger: Schema.Literals(["endTurn", "damage"]),
      save: Schema.Struct({
        ability: Schema.Literal("wis"),
        dc: DcSourceSchema,
      }),
    }),
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    areaChoices: Schema.Tuple([]),
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    stagedConditionRepeatSave: Schema.Struct({
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
    areaChoices: Schema.Tuple([]),
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    persistentAreaSaveCondition: Schema.Struct({
      ...BattleProcedureSourceSchema,
      effectRef: BattleEffectExecutionRef,
      areaId: BattleAreaId,
      trigger: Schema.Literals(["entersArea", "endsTurnInArea"]),
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    persistentAreaSaveConditionEscape: Schema.Struct({
      ...BattleProcedureSourceSchema,
      effectRef: BattleEffectExecutionRef,
      areaId: BattleAreaId,
      trigger: Schema.Literals(["entersArea", "startsTurnInArea"]),
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    persistentAreaSaveComposite: Schema.Struct({
      ...BattleProcedureSourceSchema,
      effectRef: BattleEffectExecutionRef,
      areaId: BattleAreaId,
      trigger: Schema.Literals(["entersArea", "startsTurnInArea"]),
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    persistentAreaSaveDamage: Schema.Struct({
      topology: Schema.Literal("stationary"),
      ...BattleProcedureSourceSchema,
      effectRef: BattleEffectExecutionRef,
      areaId: BattleAreaId,
      trigger: Schema.Literals([
        "appearsInArea",
        "entersArea",
        "endsTurnInArea",
      ]),
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    persistentAreaSaveDamage: Schema.Struct({
      topology: Schema.Literal("translating"),
      ...BattleProcedureSourceSchema,
      effectRef: BattleEffectExecutionRef,
      areaId: BattleAreaId,
      trigger: Schema.Literals([
        "appearsInArea",
        "movesIntoSpace",
        "entersArea",
        "endsTurnInArea",
      ]),
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    directionalPersistentArea: Schema.Struct({
      ...BattleProcedureSourceSchema,
      effectRef: BattleEffectExecutionRef,
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("directionalPersistentAreaDirectionChoice"),
    label: Schema.String,
    sourceCombatantId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    effectRef: BattleEffectExecutionRef,
    areaId: BattleAreaId,
    directionId: BattleLineDirectionId,
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    spellConditionEndTurnSave: Schema.Struct({
      ...BattleProcedureSourceSchema,
      condition: Schema.Literals(ALL_CONDITIONS),
      save: SpellConditionRepeatSaveSchema,
    }),
    ability: AbilitySchema,
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    spellConditionCountedEndTurnSave: Schema.Struct({
      ...BattleProcedureSourceSchema,
      condition: Schema.Literals(ALL_CONDITIONS),
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    unitFeatureConditionEndTurnSave: Schema.Struct({
      ...BattleProcedureSourceSchema,
      condition: Schema.Literals(ALL_CONDITIONS),
      save: SpellConditionRepeatSaveSchema,
    }),
    ability: AbilitySchema,
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    turnConstraintEndTurnSave: Schema.Struct({
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    movableZone: Schema.Struct({
      ...BattleProcedureSourceSchema,
      effectRef: BattleEffectExecutionRef,
      areaId: BattleAreaId,
      trigger: Schema.Literals([
        "endsTurnWithinFiveFeetOfSphere",
        "rammedBySphere",
      ]),
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
        rollMode: Schema.Literals(ATTACK_ROLL_MODES),
      }),
    ),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    movableZone: Schema.Struct({
      ...BattleProcedureSourceSchema,
      effectRef: BattleEffectExecutionRef,
      areaId: BattleAreaId,
      trigger: Schema.Literals([
        "appearsInArea",
        "areaMovesIntoSpace",
        "entersArea",
        "endsTurnInArea",
      ]),
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
        rollMode: Schema.Literals(ATTACK_ROLL_MODES),
      }),
    ),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("movableZoneRamMovement"),
    label: Schema.String,
    movableZone: Schema.Struct({
      ...BattleProcedureSourceSchema,
      effectRef: BattleEffectExecutionRef,
      areaId: BattleAreaId,
      maxMoveFeet: MovementFeet,
    }),
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("movableZoneRepositionMovement"),
    label: Schema.String,
    movableZone: Schema.Struct({
      sourceProcedureRef: BattleProcedureExecutionRef,
      sourceCombatantId: CombatantId,
      effectRef: BattleEffectExecutionRef,
      areaId: BattleAreaId,
      maxMoveFeet: MovementFeet,
    }),
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("startTurnOccurrenceOrder"),
    actorId: CombatantId,
    occurrences: Schema.TupleWithRest(
      Schema.Tuple([
        BattleStartTurnOccurrenceOptionSchema,
        BattleStartTurnOccurrenceOptionSchema,
      ]),
      [BattleStartTurnOccurrenceOptionSchema],
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("temporaryHitPointChoice"),
    sourceCombatantId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    effectRef: BattleEffectExecutionRef,
    sourceTurn: Schema.Struct({
      actorId: CombatantId,
      round: BattleRoundSchema,
    }),
    occurrenceId: BattleStartTurnOccurrenceId,
    existingTemporaryHitPoints: HpSchema,
    grantedTemporaryHitPoints: HpSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("persistentAreaSourceTurnTranslation"),
    sourceCombatantId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
    effectRef: BattleEffectExecutionRef,
    areaId: BattleAreaId,
    distanceFeet: MovementFeet,
    directionRequirement: Schema.Literal("awayFromSource"),
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    protectionRelevantEffectSave: Schema.Struct({
      ...BattleProcedureSourceSchema,
      effectRef: BattleEffectExecutionRef,
      relevantEffect: Schema.Literals(["charmed", "frightened", "possession"]),
      save: SpellConditionRepeatSaveSchema,
    }),
    ability: AbilitySchema,
    dc: DcSourceSchema,
    areaChoices: EmptySpellAreaChoicesSchema,
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    grantedAreaSaveDamageAction: Schema.Struct({
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      lengthFeet: Schema.Literal(15),
    }),
    ability: Schema.Literal("dex"),
    dc: DcSourceSchema,
    areaChoices: Schema.Array(BattleSpellAreaChoiceSchema),
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
    relationshipFactRequest: Schema.optionalKey(
      BattleSavingThrowRelationshipFactRequestSchema,
    ),
    ...D20TestNaturalOneRerollHoleOptionsSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    glyphExplosiveRune: Schema.Struct({
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      effectRef: BattleEffectExecutionRef,
      radiusFeet: Schema.Literal(20),
    }),
    ability: Schema.Literal("dex"),
    dc: DcSourceSchema,
    targetIds: Schema.Array(CombatantId),
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
    ...D20TestNaturalOneRerollHoleOptionsSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    outcomeTargeting: Schema.Literals(["singleTarget", "targetList", "area"]),
    sourceProcedureRef: BattleProcedureExecutionRef,
    ability: AbilitySchema,
    dc: DcSourceSchema,
    areaChoices: Schema.Array(BattleSpellAreaChoiceSchema),
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
    relationshipFactRequest: Schema.optionalKey(
      BattleSavingThrowRelationshipFactRequestSchema,
    ),
    ...D20TestNaturalOneRerollHoleOptionsSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    ability: AbilitySchema,
    dc: DcSourceSchema,
    targetIds: Schema.Array(CombatantId),
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
    relationshipFactRequest: Schema.optionalKey(
      BattleSavingThrowRelationshipFactRequestSchema,
    ),
    ...D20TestNaturalOneRerollHoleOptionsSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("unitFeatureDecision"),
    label: Schema.String,
    choices: Schema.Union([
      Schema.Tuple([Schema.Literal("use"), Schema.Literal("decline")]),
      Schema.Tuple([Schema.Literal("attempt"), Schema.Literal("decline")]),
      Schema.Tuple([
        Schema.Literal(BRUTAL_STRIKE_EFFECT_DECISION_CHOICES[0]),
        Schema.Literal(BRUTAL_STRIKE_EFFECT_DECISION_CHOICES[1]),
        Schema.Literal(BRUTAL_STRIKE_EFFECT_DECISION_CHOICES[2]),
      ]),
      Schema.Tuple([
        Schema.Literal(TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES[0]),
        Schema.Literal(TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES[1]),
        Schema.Literal(TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES[2]),
        Schema.Literal(TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES[3]),
      ]),
      Schema.Tuple([
        Schema.Literal(OPEN_HAND_TECHNIQUE_DECISION_CHOICES[0]),
        Schema.Literal(OPEN_HAND_TECHNIQUE_DECISION_CHOICES[1]),
        Schema.Literal(OPEN_HAND_TECHNIQUE_DECISION_CHOICES[2]),
        Schema.Literal(OPEN_HAND_TECHNIQUE_DECISION_CHOICES[3]),
      ]),
    ]),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("deathSavingThrow"),
    label: Schema.String,
    combatantId: CombatantId,
    rollMode: Schema.optionalKey(Schema.Literals(ATTACK_ROLL_MODES)),
    ...D20TestNaturalOneRerollHoleOptionsSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("statBlockRechargeRoll"),
    label: Schema.String,
    combatantId: CombatantId,
    rechargeTargets: Schema.Array(BattleResourcePoolExecutionRef),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("concentrationSavingThrow"),
    label: Schema.String,
    damageOccurrence: BattleDamageOccurrenceSourceSchema,
    combatantId: CombatantId,
    dc: DifficultyClass,
    damageAmount: DamageAmount,
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
    rollMode: Schema.optionalKey(Schema.Literals(ATTACK_ROLL_MODES)),
    ...D20TestNaturalOneRerollHoleOptionsSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("interruptDecision"),
    label: Schema.String,
    trigger: Schema.Literals(BATTLE_INTERRUPT_TRIGGERS),
    eligibleResponders: Schema.Array(CombatantId),
  }),
  Schema.Struct({
    ...BattleMovementHoleCommonSchema,
    brutalStrikeForcefulBlow: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    ...BattleMovementHoleCommonSchema,
    brutalStrikeForcefulBlow: BattleBrutalStrikeForcefulBlowMovementFactSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("controlledVerticalSuspensionAltitudeChange"),
    effectRef: BattleEffectExecutionRef,
    label: Schema.String,
    actorId: CombatantId,
    targetId: CombatantId,
    maxDistanceFeet: MovementFeet,
    directions: Schema.Array(Schema.Literals(["up", "down"])),
    requiresTargetWithinRangeFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("controlledVerticalSuspensionInitialRise"),
    label: Schema.String,
    actorId: CombatantId,
    targetId: CombatantId,
    maxDistanceFeet: MovementFeet,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("abilityCheck"),
    label: Schema.String,
    ability: AbilitySchema,
    skill: Schema.Literals(BATTLE_SURFACE_SKILLS),
    dc: DifficultyClass,
    rollMode: Schema.optionalKey(Schema.Literals(ATTACK_ROLL_MODES)),
    ...D20TestNaturalOneRerollHoleOptionsSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("spellcastingAbilityCheck"),
    label: Schema.String,
    dc: DifficultyClass,
    rollMode: Schema.optionalKey(Schema.Literals(ATTACK_ROLL_MODES)),
    spellcastingAbilityCheck: Schema.Union([
      Schema.Struct({
        casterId: CombatantId,
        sourceProcedureRef: BattleProcedureExecutionRef,
        target: BattleOngoingSpellOccurrenceTargetSchema,
        checkedOccurrence: Schema.optionalKey(Schema.Never),
        contestedSpellLevel: BattleSpellEffectLevel,
      }),
      Schema.Struct({
        casterId: CombatantId,
        sourceProcedureRef: BattleProcedureExecutionRef,
        target: Schema.Union([
          BattleOngoingSpellCombatantTargetSchema,
          BattleOngoingSpellObjectTargetSchema,
        ]),
        checkedOccurrence: Schema.Struct({
          ownerId: CombatantId,
          effect: BattleOngoingSpellOccurrenceRefSchema,
          target: Schema.optionalKey(Schema.Never),
        }),
        contestedSpellLevel: BattleSpellEffectLevel,
      }),
    ]),
    ...D20TestNaturalOneRerollHoleOptionsSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("grappleOutcome"),
    label: Schema.String,
    actorId: CombatantId,
    targetId: CombatantId,
    dc: DifficultyClass,
    relationshipFactRequest: Schema.optionalKey(
      BattleSavingThrowRelationshipFactRequestSchema,
    ),
    mode: Schema.Literals(["grappleSave", "escapeCheck"]),
    rollMode: Schema.optionalKey(Schema.Literals(ATTACK_ROLL_MODES)),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("shoveOutcome"),
    label: Schema.String,
    actorId: CombatantId,
    targetId: CombatantId,
    dc: DifficultyClass,
    relationshipFactRequest: Schema.optionalKey(
      BattleSavingThrowRelationshipFactRequestSchema,
    ),
  }),
  Schema.Union([
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("targetingSaveInterdictionOutcome"),
      label: Schema.String,
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
      relationshipFactRequest: Schema.optionalKey(
        Schema.Struct({
          kind: Schema.Literal("attackRollTargetIsEnemy"),
          attackerId: CombatantId,
        }),
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("targetingSaveInterdictionOutcome"),
      label: Schema.String,
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
  ]),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("attackDamageDisposition"),
    label: Schema.String,
    damageOccurrence: BattleDamageOccurrenceSourceSchema,
    attackerId: CombatantId,
    targetId: CombatantId,
    choices: Schema.Array(
      Schema.Union([
        Schema.Struct({ kind: Schema.Literal("ordinaryDamage") }),
        Schema.Struct({ kind: Schema.Literal("knockOut") }),
        Schema.Struct({
          kind: Schema.Literal("zeroHitPointReplacement"),
          procedureRef: BattleProcedureExecutionRef,
          unitId: Schema.optionalKey(Schema.Never),
        }),
      ]),
    ),
  }),
]);

const BattleHolePayloadSchema = exhaustiveBattleHoleSchema(
  BattleHolePayloadUnionSchema,
);

export const BattleHoleSchema = BattleHolePayloadSchema.pipe(
  Schema.annotate({ identifier: "BattleHole" }),
);

const BattleDieRollResultSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThan(0)),
  Schema.brand("PositiveInteger"),
  Schema.brand("DieRollResult"),
);

const BattleD20DieRollResultSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isBetween({ minimum: 1, maximum: 20 })),
  Schema.brand("PositiveInteger"),
  Schema.brand("DieRollResult"),
);

const BattleD20TestRolledD20sSchema = Schema.Struct({
  first: BattleD20DieRollResultSchema,
  second: BattleD20DieRollResultSchema,
  selected: Schema.Literals(["first", "second"]),
});

const BattleD20TestRollReplacementSchema = Schema.Struct({
  total: Schema.Number.pipe(Schema.check(Schema.isInt())),
  naturalD20: BattleD20DieRollResultSchema,
  rollMode: Schema.optionalKey(Schema.Literals(ATTACK_ROLL_MODES)),
});

const BattleD20TestRolledDieRollReplacementSchema = Schema.Struct({
  die: Schema.Literals(["first", "second"]),
  naturalD20: BattleD20DieRollResultSchema,
  result: BattleD20TestRollReplacementSchema,
});

const BattleD20TestNaturalOneRerollDecisionSchema = Schema.Union([
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
]);

const BattleD20TestRolledDieOutcomeReplacementSchema = Schema.Struct({
  die: Schema.Literals(["first", "second"]),
  naturalD20: BattleD20DieRollResultSchema,
  result: Schema.Struct({
    succeeded: Schema.Boolean,
    naturalD20: BattleD20DieRollResultSchema,
  }),
});

const BattleD20TestNaturalOneRerollOutcomeDecisionSchema = Schema.Union([
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
]);

const BattleD20TestNaturalOneRerollDieDecisionSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("decline"),
    effectKind: Schema.Literal("d20_test_natural_one_reroll"),
  }),
  Schema.Struct({
    kind: Schema.Literal("reroll"),
    effectKind: Schema.Literal("d20_test_natural_one_reroll"),
    replacement: BattleD20DieRollResultSchema,
  }),
]);

const BattleD20TestRolledOutcomeFields = {
  succeeded: Schema.Boolean,
  naturalD20: Schema.optionalKey(BattleD20DieRollResultSchema),
  rolledD20s: Schema.optionalKey(BattleD20TestRolledD20sSchema),
  d20TestNaturalOneReroll: Schema.optionalKey(
    BattleD20TestNaturalOneRerollOutcomeDecisionSchema,
  ),
} as const;
const BattleD20TestWithoutRollOutcomeFields = {
  succeeded: Schema.Boolean,
  withoutRoll: Schema.Literal(true),
} as const;
const BattleConcentrationSavingThrowValueSchema = Schema.Union([
  Schema.Struct(BattleD20TestRolledOutcomeFields),
  Schema.Struct(BattleD20TestWithoutRollOutcomeFields),
]);
const BattleSavingThrowOutcomeSchema = Schema.Union([
  Schema.Struct({
    targetId: CombatantId,
    ...BattleD20TestRolledOutcomeFields,
  }),
  Schema.Struct({
    targetId: CombatantId,
    ...BattleD20TestWithoutRollOutcomeFields,
  }),
]);

const BattleAttackRollResultSchema = Schema.Struct({
  total: Schema.Number.pipe(Schema.check(Schema.isInt())),
  naturalD20: BattleD20DieRollResultSchema,
  rollMode: Schema.optionalKey(Schema.Literals(ATTACK_ROLL_MODES)),
  rolledD20s: Schema.optionalKey(BattleD20TestRolledD20sSchema),
  activatedOngoingFeatureProcedureRef: Schema.optionalKey(
    BattleProcedureExecutionRef,
  ),
  activatedOngoingFeatureUnitId: Schema.optionalKey(Schema.Never),
  missToHitReplacementProcedureRef: Schema.optionalKey(
    BattleProcedureExecutionRef,
  ),
  missToHitReplacementUnitId: Schema.optionalKey(Schema.Never),
  spellAttackReroll: Schema.optionalKey(
    Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("decline"),
        effectKind: Schema.Literal("missed_spell_attack_reroll"),
      }),
      Schema.Struct({
        kind: Schema.Literal("reroll"),
        effectKind: Schema.Literal("missed_spell_attack_reroll"),
        replacement: Schema.Struct({
          total: Schema.Number.pipe(Schema.check(Schema.isInt())),
          naturalD20: BattleD20DieRollResultSchema,
          rollMode: Schema.optionalKey(Schema.Literals(ATTACK_ROLL_MODES)),
        }),
      }),
    ]),
  ),
  d20TestNaturalOneReroll: Schema.optionalKey(
    BattleD20TestNaturalOneRerollDecisionSchema,
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
      readonly stagedConditionAutomaticSuccessFacts?: never;
    }
  | {
      readonly kind?: never;
      readonly areaId?: never;
      readonly stagedConditionAutomaticSuccessFacts: readonly [
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
      readonly kind: "saveGatedTargetProjectionArea";
      readonly affectedObjectIds: readonly string[];
      readonly areaId?: never;
      readonly stagedConditionAutomaticSuccessFacts?: never;
    }
  | {
      readonly kind: "saveGatedAreaControlArea";
      readonly cubeSideFeet: 30;
      readonly affectedCreatureWitnesses: readonly {
        readonly targetId: string;
        readonly inCube: true;
        readonly canSeePattern: true;
      }[];
      readonly areaId?: never;
      readonly stagedConditionAutomaticSuccessFacts?: never;
    }
  | {
      readonly kind: "saveGatedTurnConstraintBundleArea";
      readonly cubeSideFeet: 40;
      readonly affectedCreatureWitnesses: readonly {
        readonly targetId: string;
        readonly inCube: true;
        readonly chosenByCaster: true;
      }[];
      readonly areaId?: never;
      readonly stagedConditionAutomaticSuccessFacts?: never;
    }
  | {
      readonly kind: "persistentAreaSaveConditionArea";
      readonly areaId: string;
      readonly stagedConditionAutomaticSuccessFacts?: never;
    }
  | {
      readonly kind: "directionalPersistentAreaArea";
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
      readonly stagedConditionAutomaticSuccessFacts?: never;
    }
  | {
      readonly kind: "pointOriginSphereSaveDamageArea";
      readonly objectIgnitionFacts: readonly {
        readonly objectId: string;
        readonly disposition:
          | { readonly kind: "flammableUnattended" }
          | { readonly kind: "notFlammable" }
          | { readonly kind: "wornOrCarried" };
      }[];
      readonly areaId?: never;
      readonly stagedConditionAutomaticSuccessFacts?: never;
    }
  | {
      readonly kind: "pointOriginSphereObjectDamageArea";
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
      readonly stagedConditionAutomaticSuccessFacts?: never;
    }
  | {
      readonly kind: "selfOriginCubePushArea";
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
      readonly stagedConditionAutomaticSuccessFacts?: never;
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

type BattleMovementFillValueCommonEncoded = Schema.Codec.Encoded<
  typeof BattleMovementFillValueCommonSchema
>;

type BattleReadyResponseEncoded = Schema.Codec.Encoded<
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
      readonly kind: "areaWindStrength";
      readonly holeId: string;
      readonly value:
        | { readonly kind: "strong" }
        | { readonly kind: "notStrong" };
    }
  | {
      readonly kind: "turnConstraintSomaticSpellFailureOutcome";
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
                  readonly effectRef: string;
                }
              | {
                  readonly kind: "spellActiveEffect";
                  readonly activeEffectKind:
                    | "spellObjectContactDamage"
                    | "spatialMeleeSpellAttackProxy";
                  readonly effectRef: string;
                }
              | {
                  readonly kind: "magicSuppressionEmanation";
                  readonly effectRef: string;
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
                    readonly effectRef: string;
                  }
                | {
                    readonly kind: "spellActiveEffect";
                    readonly activeEffectKind:
                      | "spellObjectContactDamage"
                      | "spatialMeleeSpellAttackProxy";
                    readonly effectRef: string;
                  }
                | {
                    readonly kind: "magicSuppressionEmanation";
                    readonly effectRef: string;
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
      readonly kind: "weaponAttackDamageEnhancementTargetItem";
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
            readonly kind: "persistentAreaTraitArea";
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
              readonly effectRef: string;
            }[];
          }
        | {
            readonly kind: "magicSuppressionSelfEmanation";
            readonly areaId: string;
            readonly auraMembership: {
              readonly kind: "magicSuppressionEmanationMembership";
              readonly originIncluded: boolean;
              readonly nonOriginCombatantIds: readonly string[];
            };
            readonly affectedOngoingSpellEffects: readonly {
              readonly kind: "magicSuppressionAffectedOngoingSpellEffect";
              readonly effect:
                | {
                    readonly kind: "spellLightEmitter";
                    readonly effectRef: string;
                  }
                | {
                    readonly kind: "spellActiveEffect";
                    readonly activeEffectKind:
                      | "spellObjectContactDamage"
                      | "spatialMeleeSpellAttackProxy";
                    readonly effectRef: string;
                  };
              readonly sourceKind: "ordinarySpell" | "artifact" | "deity";
            }[];
          }
        | {
            readonly kind: "pointOriginCubeArea";
            readonly areaId: string;
            readonly originAnchor:
              | { readonly kind: "tableSelectedPoint" }
              | { readonly kind: "combatant"; readonly combatantId: string };
          }
        | {
            readonly kind: "unanchoredPointOriginCylinderArea";
            readonly areaId: string;
          }
        | {
            readonly kind: "unanchoredPointOriginSphereArea";
            readonly areaId: string;
          }
        | {
            readonly kind: "pointOriginSphereDiameterArea";
            readonly areaId: string;
            readonly originAnchor:
              | { readonly kind: "tableSelectedPoint" }
              | { readonly kind: "combatant"; readonly combatantId: string };
          }
        | {
            readonly kind: "anchoredPointOriginSphereArea";
            readonly areaId: string;
            readonly originAnchor:
              | { readonly kind: "tableSelectedPoint" }
              | { readonly kind: "combatant"; readonly combatantId: string };
          }
        | {
            readonly kind: "anchoredPointOriginCylinderArea";
            readonly areaId: string;
            readonly originAnchor:
              | { readonly kind: "tableSelectedPoint" }
              | { readonly kind: "combatant"; readonly combatantId: string };
          }
        | {
            readonly kind: "directionalPersistentAreaArea";
            readonly areaId: string;
            readonly directionId: string;
          };
    }
  | {
      readonly kind: "directionalPersistentAreaDirectionChoice";
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
      readonly kind: "startTurnOccurrenceOrder";
      readonly holeId: string;
      readonly value: {
        readonly occurrenceIds: readonly [string, string, ...string[]];
      };
    }
  | {
      readonly kind: "temporaryHitPointChoice";
      readonly holeId: string;
      readonly value: (typeof BATTLE_TEMPORARY_HIT_POINT_CHOICES)[number];
    }
  | {
      readonly kind: "persistentAreaSourceTurnTranslation";
      readonly holeId: string;
      readonly value: {
        readonly affectedCombatantIdsInResolutionOrder: readonly string[];
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
        readonly magicSuppressionTransit: readonly {
          readonly kind: "magicSuppressionTransit";
          readonly areaId: string;
          readonly sourceCombatantId: string;
          readonly originInsideAura: boolean;
          readonly destinationInsideAura: boolean;
        }[];
      };
    }
  | {
      readonly kind: "spatialMeleeSpellAttackProxyPosition";
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
            readonly kind: "fallingCreatureTargetWithinRange";
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
      readonly kind: "temporaryAbilityCheckRollModeActiveEffectCount";
      readonly holeId: string;
      readonly value: {
        readonly activeOneMinuteEffectCount: number;
      };
    }
  | {
      readonly kind: "compelledBehaviorOptionChoice";
      readonly holeId: string;
      readonly value: (typeof COMPELLED_BEHAVIOR_OPTIONS)[number];
    }
  | {
      readonly kind: "selfTransformationModeChoice";
      readonly holeId: string;
      readonly value: (typeof SELF_TRANSFORMATION_MODE_KINDS)[number];
    }
  | {
      readonly kind: "movableLightPlacement";
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
      readonly kind: "spawnedCompanionConnection";
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
      readonly areaMovementDistanceDamage: {
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
      readonly kind: "targetingSaveInterdictionOutcome";
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
                  readonly readiedSpellCasterId: string;
                  readonly procedureRef: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "releaseReadiedMovement";
                  readonly readiedMovementActorId: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "releaseReadiedAction";
                  readonly reactorId: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "releaseReadiedAttack";
                  readonly reactorId: string;
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
                  readonly reactorId: string;
                  readonly selection: BattleInterruptAttackExecutionSelectionEncoded;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "retaliationAttack";
                  readonly reactorId: string;
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
      readonly value: BattleMovementFillValueCommonEncoded & {
        readonly compelledApproach?: {
          readonly kind: "compelledApproachShortestDirectRouteTowardSource";
          readonly movedWithinFiveFeetOfSource: boolean;
        };
        readonly compelledFlee?: {
          readonly kind: "compelledFleeFastestAvailableRouteAwayFromSource";
        };
        readonly brutalStrikeForcefulBlow?: {
          readonly kind: "brutalStrikeForcefulBlowStraightTowardTarget";
          readonly targetId: string;
        };
        readonly additionalSpeedSegments?: readonly BattleMovementFillValueCommonEncoded[];
        readonly fixedCostMovementReplacement?: {
          readonly kind: "fixedCostMovementReplacement";
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
        readonly controlledVerticalSuspensionMovement?: {
          readonly kind: "controlledVerticalSuspensionMovement";
          readonly effectRef: string;
          readonly sourceCombatantId: string;
          readonly sourceProcedureRef: string;
          readonly fixedObjectOrSurfaceWithinReach: true;
          readonly altitudeChange?: {
            readonly direction: "up" | "down";
            readonly distanceFeet: number;
          };
        };
      };
    }
  | {
      readonly kind: "controlledVerticalSuspensionAltitudeChange";
      readonly holeId: string;
      readonly value: {
        readonly direction: "up" | "down";
        readonly distanceFeet: number;
      };
      readonly spatialFacts: readonly BattleTargetSpatialFactEncoded[];
    }
  | {
      readonly kind: "controlledVerticalSuspensionInitialRise";
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
  speedKind: Schema.Literals(BATTLE_MOVEMENT_SPEED_KINDS),
  movementCostFeet: MovementFeet,
  provokedOpportunityAttacks: Schema.Array(
    battleInterruptAttackExecutionSelectionWithFields({
      reactorId: CombatantId,
      distanceFeet: MovementFeet,
    }),
  ),
  acrobaticMovement: Schema.optionalKey(
    Schema.Struct({
      kind: Schema.Literal("acrobaticMovement"),
      paths: Schema.NonEmptyArray(
        Schema.Literals(["alongVerticalSurface", "acrossLiquid"]),
      ),
      withoutFallingDuringMovement: Schema.Literal(true),
    }),
  ),
  areaDifficultTerrain: Schema.optionalKey(
    Schema.Struct({
      kind: Schema.Literal("areaDifficultTerrain"),
      sources: Schema.Array(
        Schema.Union([
          Schema.Struct({
            kind: Schema.Literal("persistentAreaSaveCondition"),
            effectRef: BattleEffectExecutionRef,
            sourceCombatantId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            areaId: BattleAreaId,
          }),
          Schema.Struct({
            kind: Schema.Literal("persistentAreaSaveConditionEscape"),
            effectRef: BattleEffectExecutionRef,
            sourceCombatantId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            areaId: BattleAreaId,
          }),
          Schema.Struct({
            kind: Schema.Literal("persistentAreaSaveComposite"),
            effectRef: BattleEffectExecutionRef,
            sourceCombatantId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            areaId: BattleAreaId,
          }),
          Schema.Struct({
            kind: Schema.Literal("persistentAreaSaveDamage"),
            effectRef: BattleEffectExecutionRef,
            sourceCombatantId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            areaId: BattleAreaId,
          }),
          Schema.Struct({
            kind: Schema.Literal("areaMovementDistanceDamage"),
            effectRef: BattleEffectExecutionRef,
            sourceCombatantId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            areaId: BattleAreaId,
            damageDistanceFeet: MovementFeet,
          }),
        ]),
      ),
      totalDistanceFeet: MovementFeet,
      difficultTerrainDistanceFeet: MovementFeet,
    }),
  ),
  directionalPersistentAreaMovement: Schema.optionalKey(
    Schema.Struct({
      kind: Schema.Literal("directionalPersistentAreaMovement"),
      effectRef: BattleEffectExecutionRef,
      sourceCombatantId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      areaId: BattleAreaId,
      directionId: BattleLineDirectionId,
      totalDistanceFeet: MovementFeet,
      closerDistanceFeet: MovementFeet,
    }),
  ),
  grappleDrag: Schema.optionalKey(
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
  ),
  creatureSpaceTraversal: Schema.optionalKey(
    Schema.Struct({
      kind: Schema.Literal("occupiedCreatureSpaceTraversal"),
      occupiedSpaces: Schema.NonEmptyArray(
        Schema.Struct({
          occupantId: CombatantId,
          positionId: BattleTablePositionId,
        }),
      ),
      destination: Schema.Union([
        Schema.Struct({
          kind: Schema.Literal("unoccupiedSpace"),
          positionId: BattleTablePositionId,
        }),
        Schema.Struct({
          kind: Schema.Literal("occupiedCreatureSpace"),
          occupantId: CombatantId,
          positionId: BattleTablePositionId,
        }),
      ]),
    }),
  ),
} as const;
const BattleMovementFillValueCommonSchema = Schema.Struct(
  BattleMovementFillValueCommonSchemaFields,
);

export const BattleFillSchema: Schema.Codec<
  BattleFill,
  BattleFillEncoded,
  never
> = Schema.suspend(() =>
  Schema.Union([
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
      spatialFacts: Schema.optionalKey(BattleTargetSpatialFactsSchema),
      relationshipFacts: Schema.optionalKey(
        BattleTargetChoiceRelationshipFactsSchema,
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
      kind: Schema.Literal("areaWindStrength"),
      holeId: BattleHoleIdSchema,
      value: BattleAreaWindStrengthSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("turnConstraintSomaticSpellFailureOutcome"),
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
        Schema.Union([
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
            size: Schema.Literals([
              "tiny",
              "small",
              "medium",
              "large",
              "huge",
              "gargantuan",
            ]),
            wornOrCarried: Schema.Union([
              Schema.Struct({ kind: Schema.Literal("nobody") }),
              Schema.Struct({ kind: Schema.Literal("caster") }),
              Schema.Struct({
                kind: Schema.Literal("someoneElse"),
                relation: Schema.Literals(["worn", "carried"]),
              }),
            ]),
          }),
          Schema.Struct({
            kind: Schema.Literal("spellDistantObjectLightTarget"),
            casterId: CombatantId,
            objectId: BattleObjectId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            rangeFeet: MovementFeet,
            size: Schema.Literals([
              "tiny",
              "small",
              "medium",
              "large",
              "huge",
              "gargantuan",
            ]),
            wornOrCarried: Schema.Union([
              Schema.Struct({ kind: Schema.Literal("nobody") }),
              Schema.Struct({ kind: Schema.Literal("caster") }),
              Schema.Struct({
                kind: Schema.Literal("someoneElse"),
                relation: Schema.Literals(["worn", "carried"]),
              }),
            ]),
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
        ]),
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
        Schema.Union([
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
            relation: Schema.Literals(["holding", "wearing"]),
          }),
        ]),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("objectDropResolution"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        outcomes: Schema.Array(
          Schema.Union([
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
          ]),
        ),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("weaponAttackDamageEnhancementTargetItem"),
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
            count: Schema.Number.pipe(
              Schema.check(Schema.isInt()),
              Schema.check(Schema.isGreaterThan(0)),
            ),
          }),
        ),
      }),
      spatialFacts: Schema.Array(
        Schema.Union([
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
        ]),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("spellTargetList"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        targetIds: Schema.Array(CombatantId),
      }),
      spatialFacts: Schema.Array(
        Schema.Union([
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
            kind: Schema.Literal("fallingCreatureTargetWithinRange"),
            casterId: CombatantId,
            targetId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            rangeFeet: MovementFeet,
          }),
        ]),
      ),
      relationshipFacts: Schema.optionalKey(
        BattleSpellTargetListRelationshipFactsSchema,
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("attackRoll"),
      holeId: BattleHoleIdSchema,
      value: BattleAttackRollResultSchema,
      relationshipFacts: Schema.optionalKey(
        BattleAttackRollRelationshipFactsSchema,
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
      value: Schema.Literals(ALL_CONDITIONS),
    }),
    Schema.Struct({
      kind: Schema.Literal("spellAreaChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union([
        Schema.Struct({
          kind: Schema.Literal("persistentAreaTraitArea"),
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
              effectRef: BattleEffectExecutionRef,
            }),
          ),
        }),
        Schema.Struct({
          kind: Schema.Literal("magicSuppressionSelfEmanation"),
          areaId: BattleAreaId,
          auraMembership: Schema.Struct({
            kind: Schema.Literal("magicSuppressionEmanationMembership"),
            originIncluded: Schema.Boolean,
            nonOriginCombatantIds: Schema.Array(CombatantId),
          }),
          affectedOngoingSpellEffects: Schema.Array(
            Schema.Struct({
              kind: Schema.Literal(
                "magicSuppressionAffectedOngoingSpellEffect",
              ),
              effect: BattleMagicSuppressionOngoingSpellEffectRefSchema,
              sourceKind: Schema.Literals(
                BATTLE_MAGIC_SUPPRESSION_ONGOING_SPELL_EFFECT_SOURCE_KINDS,
              ),
            }),
          ),
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCubeArea"),
          areaId: BattleAreaId,
          originAnchor: BattleSpellAreaOriginAnchorSchema,
        }),
        Schema.Struct({
          kind: Schema.Literal("unanchoredPointOriginCylinderArea"),
          areaId: BattleAreaId,
        }),
        Schema.Struct({
          kind: Schema.Literal("unanchoredPointOriginSphereArea"),
          areaId: BattleAreaId,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginSphereDiameterArea"),
          areaId: BattleAreaId,
          originAnchor: BattleSpellAreaOriginAnchorSchema,
        }),
        Schema.Struct({
          kind: Schema.Literal("anchoredPointOriginSphereArea"),
          areaId: BattleAreaId,
          originAnchor: BattleSpellAreaOriginAnchorSchema,
        }),
        Schema.Struct({
          kind: Schema.Literal("anchoredPointOriginCylinderArea"),
          areaId: BattleAreaId,
          originAnchor: BattleSpellAreaOriginAnchorSchema,
        }),
        Schema.Struct({
          kind: Schema.Literal("directionalPersistentAreaArea"),
          areaId: BattleAreaId,
          directionId: BattleLineDirectionId,
        }),
      ]),
    }),
    Schema.Struct({
      kind: Schema.Literal("directionalPersistentAreaDirectionChoice"),
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
      kind: Schema.Literal("startTurnOccurrenceOrder"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        occurrenceIds: Schema.TupleWithRest(
          Schema.Tuple([
            BattleStartTurnOccurrenceId,
            BattleStartTurnOccurrenceId,
          ]),
          [BattleStartTurnOccurrenceId],
        ),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("temporaryHitPointChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literals(BATTLE_TEMPORARY_HIT_POINT_CHOICES),
    }),
    Schema.Struct({
      kind: Schema.Literal("persistentAreaSourceTurnTranslation"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        affectedCombatantIdsInResolutionOrder: Schema.Array(CombatantId),
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
        magicSuppressionTransit: Schema.Array(
          Schema.Struct({
            kind: Schema.Literal("magicSuppressionTransit"),
            areaId: BattleAreaId,
            sourceCombatantId: CombatantId,
            originInsideAura: Schema.Boolean,
            destinationInsideAura: Schema.Boolean,
          }),
        ),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("spatialMeleeSpellAttackProxyPosition"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union([
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
      ]),
    }),
    Schema.Struct({
      kind: Schema.Literal("savingThrowOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union([
        Schema.Struct({
          area: BattleSpellAreaChoiceSchema,
          outcomes: Schema.Array(BattleSavingThrowOutcomeSchema),
        }),
        Schema.Struct({
          area: Schema.optionalKey(Schema.Never),
          outcomes: Schema.Array(BattleSavingThrowOutcomeSchema),
          openHandTechniquePush: Schema.optionalKey(
            BattleShovePushOutcomeSchema,
          ),
        }),
      ]),
      spatialFacts: Schema.optionalKey(BattleTargetSpatialFactsSchema),
      relationshipFacts: Schema.optionalKey(
        BattleSavingThrowRelationshipFactsSchema,
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("skillChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literals(BATTLE_SURFACE_SKILLS),
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
      kind: Schema.Literal("temporaryAbilityCheckRollModeActiveEffectCount"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        activeOneMinuteEffectCount: Schema.Number.pipe(
          Schema.check(Schema.isInt()),
          Schema.check(Schema.isGreaterThanOrEqualTo(0)),
        ),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("compelledBehaviorOptionChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literals(COMPELLED_BEHAVIOR_OPTIONS),
    }),
    Schema.Struct({
      kind: Schema.Literal("selfTransformationModeChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literals(SELF_TRANSFORMATION_MODE_KINDS),
    }),
    Schema.Struct({
      kind: Schema.Literal("movableLightPlacement"),
      holeId: BattleHoleIdSchema,
      value: BattleMovableLightPlacementValueSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("unitFeatureDecision"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literals([
        "use",
        "attempt",
        ...BRUTAL_STRIKE_EFFECT_DECISION_CHOICES,
        ...OPEN_HAND_TECHNIQUE_DECISION_CHOICES,
        ...TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES,
      ]),
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
        cover: Schema.Literals(CUNNING_STRIKE_END_TURN_COVER_DEGREES),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("spawnedCompanionConnection"),
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
      selectedAttackDamageRiderProcedureRefs: Schema.optionalKey(
        Schema.Array(BattleProcedureExecutionRef),
      ),
      cunningStrikeOption: Schema.optionalKey(
        Schema.Struct({
          procedureRef: BattleProcedureExecutionRef,
          optionId: Schema.Literals(BATTLE_CUNNING_STRIKE_OPTION_SELECTION_IDS),
        }),
      ),
      weaponDamageDiceRollChoice: Schema.optionalKey(
        Schema.Struct({
          procedureRef: BattleProcedureExecutionRef,
          unitId: Schema.optionalKey(Schema.Never),
          selection: Schema.Literals(["first", "second"]),
          candidates: Schema.Tuple([
            BattleNonEmptyRolledDiceGroupSchema,
            BattleNonEmptyRolledDiceGroupSchema,
          ]),
        }),
      ),
      attackDamageDieFloorChoice: Schema.optionalKey(
        Schema.Struct({
          procedureRef: BattleProcedureExecutionRef,
          unitId: Schema.optionalKey(Schema.Never),
          selection: AttackDamageDieFloorChoiceSelectionSchema,
        }),
      ),
      attackDamageAbilityModifierChoice: Schema.optionalKey(
        Schema.Struct({
          procedureRef: BattleProcedureExecutionRef,
          unitId: Schema.optionalKey(Schema.Never),
          selection: AttackDamageAbilityModifierChoiceSelectionSchema,
        }),
      ),
      spellDamageReroll: Schema.optionalKey(
        Schema.Struct({
          kind: Schema.Literal("reroll"),
          effectKind: Schema.Literal("damage_dice_reroll"),
          dice: Schema.NonEmptyArray(
            Schema.Struct({
              dieRef: Schema.optionalKey(Schema.Never),
              original: BattleDieRollResultSchema,
              replacement: BattleDieRollResultSchema,
            }),
          ),
        }),
      ),
      value: Schema.NonEmptyArray(BattleRolledDiceGroupSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("deathSavingThrow"),
      holeId: BattleHoleIdSchema,
      value: BattleD20DieRollResultSchema,
      d20TestNaturalOneReroll: Schema.optionalKey(
        BattleD20TestNaturalOneRerollDieDecisionSchema,
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
      value: Schema.Union([
        Schema.Struct({ kind: Schema.Literal("ordinaryDamage") }),
        Schema.Struct({ kind: Schema.Literal("knockOut") }),
        Schema.Struct({
          kind: Schema.Literal("zeroHitPointReplacement"),
          procedureRef: BattleProcedureExecutionRef,
          unitId: Schema.optionalKey(Schema.Never),
        }),
      ]),
    }),
    Schema.Struct({
      kind: Schema.Literal("interruptDecision"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union([
        Schema.Struct({
          kind: Schema.Literal("decline"),
          responderId: CombatantId,
        }),
        Schema.Struct({
          kind: Schema.Literal("resolve"),
          responderId: CombatantId,
          choice: Schema.Union([
            Schema.Struct({
              kind: Schema.Literal("releaseReadiedSpell"),
              readiedSpellCasterId: CombatantId,
              procedureRef: BattleProcedureExecutionRef,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("releaseReadiedMovement"),
              readiedMovementActorId: CombatantId,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("releaseReadiedAction"),
              reactorId: CombatantId,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("releaseReadiedAttack"),
              reactorId: CombatantId,
              targetId: CombatantId,
              procedureRef: Schema.Union([
                BattleAttackProcedureExecutionRef,
                BattleStatBlockProcedureExecutionRef,
              ]),
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
              reactorId: CombatantId,
              selection: BattleInterruptAttackExecutionSelectionSchema,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("retaliationAttack"),
              reactorId: CombatantId,
              selection: BattleInterruptAttackExecutionSelectionSchema,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("reactionRollOrDamageReduction"),
              procedureRef: BattleProcedureExecutionRef,
              modifierKind: Schema.Literals([
                "attackRollReduction",
                "abilityCheckReduction",
                "damageRollReduction",
                "attackDamageReduction",
                "fallDamageReduction",
              ]),
              fills: Schema.Array(BattleFillSchema),
            }),
          ]),
        }),
      ]),
    }),
    Schema.Struct({
      kind: Schema.Literal("movement"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        ...BattleMovementFillValueCommonSchemaFields,
        compelledApproach: Schema.optionalKey(
          Schema.Struct({
            kind: Schema.Literal(
              "compelledApproachShortestDirectRouteTowardSource",
            ),
            movedWithinFiveFeetOfSource: Schema.Boolean,
          }),
        ),
        compelledFlee: Schema.optionalKey(
          Schema.Struct({
            kind: Schema.Literal(
              "compelledFleeFastestAvailableRouteAwayFromSource",
            ),
          }),
        ),
        brutalStrikeForcefulBlow: Schema.optionalKey(
          BattleBrutalStrikeForcefulBlowMovementFactSchema,
        ),
        additionalSpeedSegments: Schema.optionalKey(
          Schema.Array(BattleMovementFillValueCommonSchema),
        ),
        fixedCostMovementReplacement: Schema.optionalKey(
          Schema.Struct({
            kind: Schema.Literal("fixedCostMovementReplacement"),
            distanceFeet: MovementFeet,
            landing: Schema.Union([
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
            ]),
          }),
        ),
        controlledVerticalSuspensionMovement: Schema.optionalKey(
          Schema.Struct({
            kind: Schema.Literal("controlledVerticalSuspensionMovement"),
            effectRef: BattleEffectExecutionRef,
            sourceCombatantId: CombatantId,
            sourceProcedureRef: BattleProcedureExecutionRef,
            fixedObjectOrSurfaceWithinReach: Schema.Literal(true),
            altitudeChange: Schema.optionalKey(
              Schema.Struct({
                direction: Schema.Literals(["up", "down"]),
                distanceFeet: MovementFeet,
              }),
            ),
          }),
        ),
      }).pipe(
        Schema.refine(
          (value): value is BattleMovementFillValue =>
            value.brutalStrikeForcefulBlow === undefined
              ? value.additionalSpeedSegments === undefined
              : value.additionalSpeedSegments !== undefined &&
                value.fixedCostMovementReplacement === undefined &&
                value.controlledVerticalSuspensionMovement === undefined &&
                value.compelledApproach === undefined &&
                value.compelledFlee === undefined,
          {
            message:
              "Additional speed segments require Forceful Blow movement and cannot carry another movement-replacement or compelled-movement protocol.",
          },
        ),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("controlledVerticalSuspensionAltitudeChange"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        direction: Schema.Literals(["up", "down"]),
        distanceFeet: MovementFeet,
      }),
      spatialFacts: BattleTargetSpatialFactsSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("controlledVerticalSuspensionInitialRise"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        distanceFeet: MovementFeet,
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("abilityCheck"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        total: Schema.Number.pipe(Schema.check(Schema.isInt())),
        naturalD20: Schema.optionalKey(BattleD20DieRollResultSchema),
        rolledD20s: Schema.optionalKey(BattleD20TestRolledD20sSchema),
        d20TestNaturalOneReroll: Schema.optionalKey(
          BattleD20TestNaturalOneRerollDecisionSchema,
        ),
      }),
      spatialFacts: Schema.optionalKey(
        Schema.Array(
          Schema.Struct({
            kind: Schema.Literal("spellRestraintEscapeActorWithinTargetReach"),
            actorId: CombatantId,
            targetId: CombatantId,
          }),
        ),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("grappleOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        succeeded: Schema.Boolean,
      }),
      relationshipFacts: Schema.optionalKey(
        BattleSavingThrowRelationshipFactsSchema,
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("shoveOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union([
        Schema.Struct({
          succeeded: Schema.Literal(true),
        }),
        Schema.Struct({
          succeeded: Schema.Literal(false),
          failedEffect: Schema.Union([
            Schema.Struct({
              kind: Schema.Literal("prone"),
            }),
            Schema.Struct({
              kind: Schema.Literal("pushAway"),
              disposition: BattleImmediateAreaPushDispositionSchema,
            }),
          ]),
        }),
      ]),
      relationshipFacts: Schema.optionalKey(
        BattleSavingThrowRelationshipFactsSchema,
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("targetingSaveInterdictionOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union([
        Schema.Struct({
          saveSucceeded: Schema.Literal(true),
        }),
        Schema.Struct({
          saveSucceeded: Schema.Literal(false),
          outcome: Schema.Union([
            Schema.Struct({
              kind: Schema.Literal("loseAttackOrSpell"),
            }),
            Schema.Union([
              Schema.Struct({
                kind: Schema.Literal("newTarget"),
                targetId: CombatantId,
                spatialFacts: BattleTargetSpatialFactsSchema,
                replacementTargetKind: Schema.Literal("attackRoll"),
                relationshipFacts: Schema.optionalKey(
                  BattleAttackRollRelationshipFactsSchema,
                ),
              }),
              Schema.Struct({
                kind: Schema.Literal("newTarget"),
                targetId: CombatantId,
                spatialFacts: BattleTargetSpatialFactsSchema,
                replacementTargetKind: Schema.Literal("nonAttack"),
              }),
            ]),
          ]),
        }),
      ]),
    }),
  ]),
).pipe(Schema.annotate({ identifier: "BattleFill" }));

const BattleCreatureZeroHpLifecycleSnapshotSchema = Schema.Union([
  Schema.Struct({
    policy: Schema.Literal("diesAtZeroHp"),
    dead: Schema.Boolean,
  }),
  Schema.Struct({
    policy: Schema.Literal("usesDeathSavingThrows"),
    deathSaves: Schema.Struct({
      successes: Schema.Literals([0, 1, 2, 3]),
      failures: Schema.Literals([0, 1, 2, 3]),
    }),
    stable: Schema.Boolean,
    dead: Schema.Boolean,
  }),
]);

const ACTION_RESTRICTION_ACTIONS_WITHOUT_ATTACK_LIMIT = [
  "dash",
  "disengage",
  "hide",
  "utilize",
] as const satisfies ReadonlyArray<StandardActionKind>;

const BattleActionRestrictionSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("none") }),
  Schema.Struct({
    kind: Schema.Literal("exclude"),
    actions: Schema.NonEmptyArray(Schema.Literals(STANDARD_ACTION_KINDS)),
  }),
  Schema.Struct({
    kind: Schema.Literal("allow_only"),
    actions: Schema.NonEmptyArray(
      Schema.Union([
        Schema.Struct({
          action: Schema.Literal("attack"),
          attackLimit: Schema.Struct({
            kind: Schema.Literal("attack_count"),
            count: Schema.Literal(1),
          }),
        }),
        Schema.Struct({
          action: Schema.Literals(
            ACTION_RESTRICTION_ACTIONS_WITHOUT_ATTACK_LIMIT,
          ),
        }),
      ]),
    ),
  }),
]);

export const RuntimeActionResourceSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("turn"),
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("unit"),
    sourceOwnerId: Schema.String,
    sourceProcedureRef: BattleProcedureExecutionRef,
    sourceUnitId: Schema.optionalKey(Schema.Never),
    restriction: BattleActionRestrictionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("spellEffect"),
    sourceOwnerId: Schema.String,
    sourceEffectRef: BattleEffectExecutionRef,
    sourceProcedureRef: Schema.optionalKey(Schema.Never),
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
    sourceUnitId: Schema.optionalKey(Schema.Never),
    restriction: BattleActionRestrictionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("monkFocusFlurryOfBlows"),
    sourceOwnerId: Schema.String,
    sourceProcedureRef: BattleProcedureExecutionRef,
  }),
]);

const BattleTurnSnapshotSchema = Schema.Struct({
  actionResources: Schema.Array(RuntimeActionResourceSchema),
  bonusActionQuotaAvailable: Schema.Boolean,
  spellSlotUsesThisTurn: Schema.Array(
    Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("pending"),
        combatantId: CombatantId,
      }),
      Schema.Struct({
        kind: Schema.Literal("committed"),
        combatantId: CombatantId,
      }),
    ]),
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
      unitId: Schema.optionalKey(Schema.Never),
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
      unitId: Schema.optionalKey(Schema.Never),
    }),
  ),
  weaponMasteryCleaveAttackersUsedThisTurn: Schema.Array(CombatantId),
  huntersPreyHordeBreakerUsedThisTurn: Schema.Array(
    Schema.Struct({
      attackerId: CombatantId,
      procedureRef: BattleProcedureExecutionRef,
      unitId: Schema.optionalKey(Schema.Never),
    }),
  ),
  grapplerPunchAndGrabUsedThisTurn: Schema.Array(CombatantId),
  lightWeaponAttackMade: Schema.optionalKey(
    Schema.Struct({ weaponItemId: BattleObjectId }),
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

const BattleCharacterResourceSnapshotSchema = Schema.Union([
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
]);

const StatBlockResourcePoolStateSchema = Schema.Union([
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
]);

const StatBlockAttackProcedureSchema = Schema.Struct({
  kind: Schema.Literal("attack"),
  section: Schema.Literals(["actions", "legendaryActions"]),
  attack: CreatureAttackRollMechanicsSchema.pipe(
    Schema.refine(creatureAttackRollMechanicsAreSupported, {
      message: "Unsupported Stat Block attack procedure mechanics.",
    }),
  ),
  traitAttackRollModes: Schema.optionalKey(
    Schema.NonEmptyArray(
      Schema.Struct({
        mode: Schema.Literal("advantage"),
        predicate: Schema.Literal("nonIncapacitatedAllyWithin5FeetOfTarget"),
      }),
    ),
  ),
});

const StatBlockProcedureSchema = Schema.Union([
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
      Schema.Literals(SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("effectOccurrenceSource"),
    effectRef: BattleEffectExecutionRef,
    effectKind: Schema.Literals(EFFECT_OCCURRENCE_SOURCE_KINDS),
  }),
]);

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
  Schema.check(
    Schema.makeFilter(statBlockExecutionSnapshotGraphIsValid, {
      message: "Stat Block execution snapshot has an invalid reference graph.",
    }),
  ),
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
      const legendaryPoolOwnershipIsValid =
        binding.procedure.kind !== "attack" ||
        binding.procedure.section !== "legendaryActions" ||
        (legendaryPool !== undefined &&
          binding.resourcePoolRefs.includes(legendaryPool.resourcePoolRef));
      return (
        new Set(binding.resourcePoolRefs).size ===
          binding.resourcePoolRefs.length &&
        pools.length === binding.resourcePoolRefs.length &&
        statBlockProcedureResourcePoolShapeIsValid(binding.procedure, pools) &&
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

function statBlockProcedureResourcePoolShapeIsValid(
  procedure: Schema.Schema.Type<typeof StatBlockProcedureSchema>,
  pools: readonly Schema.Schema.Type<typeof StatBlockResourcePoolStateSchema>[],
): boolean {
  const legendaryPoolCount = pools.filter(
    (pool) => pool.kind === "legendaryActions",
  ).length;
  const limitedUsePoolCount = pools.length - legendaryPoolCount;
  const actionPoolShapeIsValid = () =>
    pools.length <= 1 && legendaryPoolCount === 0;
  return Match.value(procedure).pipe(
    Match.discriminatorsExhaustive("kind")({
      effectOccurrenceSource: () => pools.length === 0,
      multiattack: () => pools.length === 0,
      bonusActionOption: actionPoolShapeIsValid,
      attack: ({ section }) =>
        Match.value(section).pipe(
          Match.when("actions", actionPoolShapeIsValid),
          Match.when(
            "legendaryActions",
            () => legendaryPoolCount <= 1 && limitedUsePoolCount <= 1,
          ),
          Match.exhaustive,
        ),
    }),
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
    nextProcedureOrdinal: Schema.optionalKey(Schema.Never),
    procedureBindings: Schema.Array(
      Schema.Struct({
        procedureRef: BattleProcedureExecutionRef,
        procedure: Schema.Union([
          Schema.Struct({
            kind: Schema.Literal("unitFeature"),
            source: Schema.Union([
              Schema.Struct({ kind: Schema.Literal("intrinsic") }),
              Schema.Struct({
                kind: Schema.Literal("resourcePool"),
                resourcePoolRef: BattleResourcePoolExecutionRef,
              }),
            ]),
            execution: UnitFeatureProcedureExecutionSchema,
          }),
          Schema.Struct({
            kind: Schema.Literal("unitSupportProfile"),
            source: Schema.Union([
              Schema.Struct({ kind: Schema.Literal("intrinsic") }),
              Schema.Struct({
                kind: Schema.Literal("resourcePool"),
                resourcePoolRef: BattleResourcePoolExecutionRef,
              }),
            ]),
            execution: UnitSupportProcedureExecutionSchema,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellInvocation"),
            executionFacts: SpellExecutionFactsSchema,
          }),
          Schema.Struct({
            kind: Schema.Literal("unavailableSpellInvocation"),
          }),
          Schema.Struct({
            kind: Schema.Literal("effectOccurrenceSource"),
            effectRef: BattleEffectExecutionRef,
            effectKind: Schema.Literals(EFFECT_OCCURRENCE_SOURCE_KINDS),
          }),
        ]),
      }),
    ),
  }),
  attackExecution: Schema.Struct({
    scopeRef: BattleAttackExecutionScopeRef,
    attackProcedureRef: Schema.Union([
      BattleAttackProcedureExecutionRef,
      Schema.Null,
    ]),
    unarmedStrikeProcedureRef: BattleAttackProcedureExecutionRef,
    offHandAttackProcedureRef: Schema.Union([
      BattleAttackProcedureExecutionRef,
      Schema.Null,
    ]),
  }),
  resources: Schema.Array(BattleCharacterResourceSnapshotSchema),
  druidWildShapeAvailableForms: Schema.Array(
    Schema.Struct({
      statBlockId: Schema.String,
      execution: StatBlockExecutionSnapshotSchema,
    }),
  ),
  spellcasting: Schema.Union([
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
  ]),
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

const BattleActiveEffectOccurrenceLocationSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("nonSpatial") }),
  Schema.Struct({ kind: Schema.Literal("area"), areaId: BattleAreaId }),
  Schema.Struct({
    kind: Schema.Literal("line"),
    areaId: BattleAreaId,
    directionId: BattleLineDirectionId,
  }),
  Schema.Struct({ kind: Schema.Literal("object"), objectId: BattleObjectId }),
]);

const BattleCreatureSnapshotCommonFields = {
  combatantId: CombatantId,
  initiative: Schema.Number,
  hp: Schema.Number,
  maxHp: Schema.Number,
  tempHp: Schema.Number,
  nextEffectOrdinal: BattleEffectExecutionOrdinal,
  activeEffectOccurrences: Schema.Array(
    Schema.Struct({
      kind: Schema.Literal("activeEffect"),
      effectRef: BattleEffectExecutionRef,
      activeEffectKind: Schema.Literals(BATTLE_ACTIVE_EFFECT_KINDS),
      location: BattleActiveEffectOccurrenceLocationSchema,
    }),
  ),
  armorClass: Schema.Number,
  size: Schema.String,
  zeroHpLifecycle: BattleCreatureZeroHpLifecycleSnapshotSchema,
  conditions: Schema.Array(Schema.Literals(ALL_CONDITIONS)),
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
        kind: Schema.Literals(BATTLE_MOVEMENT_SPEED_KINDS),
        speedFeet: Schema.Number,
        remainingFeet: Schema.Number,
      }),
    ),
  }),
};

const BattleCreatureSnapshotInvariantShapeSchema = Schema.Struct({
  ...BattleCreatureSnapshotCommonFields,
  origin: Schema.Union([
    CharacterBattleCreatureOriginSnapshotSchema,
    StatBlockBattleCreatureOriginSnapshotSchema,
  ]),
});

type BattleCreatureSnapshotInvariantInput = Schema.Schema.Type<
  typeof BattleCreatureSnapshotInvariantShapeSchema
>;

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
    new Set(snapshot.activeEffectOccurrences.map(({ effectRef }) => effectRef))
      .size !== snapshot.activeEffectOccurrences.length
  ) {
    return false;
  }
  if (
    new Set(snapshot.ammunitionStocks.map((stock) => stock.ammunition)).size !==
    snapshot.ammunitionStocks.length
  ) {
    return false;
  }
  return snapshot.activeEffectOccurrences.every(
    (occurrence) =>
      serializedActiveEffectOccurrenceLocationMatchesKind(occurrence) &&
      battleEffectExecutionRefOrdinalIsBefore(
        occurrence.effectRef,
        snapshot.origin.execution.scopeRef,
        snapshot.nextEffectOrdinal,
      ),
  );
}

function serializedActiveEffectOccurrenceLocationMatchesKind(
  occurrence: BattleCreatureSnapshotInvariantInput["activeEffectOccurrences"][number],
): boolean {
  return Match.value(
    battleActiveEffectOccurrenceSpatialClass(occurrence.activeEffectKind),
  ).pipe(
    Match.when(
      "anchored",
      () =>
        occurrence.location.kind === "area" ||
        occurrence.location.kind === "object",
    ),
    Match.whenOr(
      "area",
      "line",
      "nonSpatial",
      "object",
      (spatialClass) => occurrence.location.kind === spatialClass,
    ),
    Match.exhaustive,
  );
}

const battleCreatureSnapshotInvariantAnnotations = {
  message:
    "Execution scopes, procedure refs, resource refs, and active-effect refs must be unique and owned by their combatant.",
};

const BattleCreatureSnapshotShapeSchema = Schema.Union([
  Schema.Struct({
    ...BattleCreatureSnapshotCommonFields,
    displayName: Schema.optionalKey(Schema.Never),
    origin: CharacterBattleCreatureOriginSnapshotSchema,
  }),
  Schema.Struct({
    ...BattleCreatureSnapshotCommonFields,
    displayName: Schema.optionalKey(Schema.Never),
    origin: StatBlockBattleCreatureOriginSnapshotSchema,
  }),
]);

const BattleCreatureSnapshotSchema = BattleCreatureSnapshotShapeSchema.pipe(
  Schema.check(
    Schema.makeFilter<unknown>(
      (snapshot) =>
        Schema.is(BattleCreatureSnapshotInvariantShapeSchema)(snapshot) &&
        battleCreatureSnapshotInvariantsHold(snapshot),
      battleCreatureSnapshotInvariantAnnotations,
    ),
  ),
);

const BattlePresentedCreatureSnapshotShapeSchema = Schema.Union([
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
]);

const BattlePresentedCreatureSnapshotSchema =
  BattlePresentedCreatureSnapshotShapeSchema.pipe(
    Schema.check(
      Schema.makeFilter<unknown>(
        (snapshot) =>
          Schema.is(BattleCreatureSnapshotInvariantShapeSchema)(snapshot) &&
          battleCreatureSnapshotInvariantsHold(snapshot),
        battleCreatureSnapshotInvariantAnnotations,
      ),
    ),
  );

export const BattleUnitSupportSourceSchema = Schema.Union([
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
        actions: Schema.Array(Schema.Literals(STANDARD_ACTION_KINDS)),
      }),
      to: Schema.Struct({ kind: Schema.Literal("bonus_action") }),
    }),
  }),
]);

export const BattleSpellPresentationSchema = Schema.Struct({
  kind: Schema.Literal("spell"),
  procedureRef: BattleProcedureExecutionRef,
  invocation: SpellInvocationRefSchema,
});

export const BattleActPresentationSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("intrinsic") }),
  Schema.Struct({
    kind: Schema.Literal("presentationIssue"),
    issue: Schema.Struct({
      tag: Schema.Literal("attackPresentationJoinIssue"),
      reason: Schema.Literals(ATTACK_PRESENTATION_JOIN_ISSUE_REASONS),
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("attack"),
    procedureRef: Schema.Union([
      BattleAttackProcedureExecutionRef,
      BattleStatBlockProcedureExecutionRef,
    ]),
    name: NonEmptyTrimmedStringSchema,
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
]);

const BattleReadiedSpellSnapshotSchema = Schema.Struct({
  casterId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  trigger: Schema.Literals(BATTLE_READIED_SPELL_TRIGGERS),
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

const BattleReactionModifierChoiceSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literals([
      "attackRollReduction",
      "abilityCheckReduction",
      "damageRollReduction",
    ]),
    procedureRef: BattleProcedureExecutionRef,
    label: Schema.optionalKey(Schema.Never),
    reduction: Schema.Struct({
      kind: Schema.Literal("rolled"),
      dice: Schema.Literal(1),
      flatModifier: Schema.Number,
      dieSize: Schema.Literals([6, 8, 10, 12]),
      spends: Schema.Struct({
        resourcePoolRef: BattleResourcePoolExecutionRef,
        resourceUnitId: Schema.optionalKey(Schema.Never),
        amount: Schema.Literal(1),
      }),
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("attackDamageReduction"),
    procedureRef: BattleProcedureExecutionRef,
    label: Schema.optionalKey(Schema.Never),
    reduction: Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("halfDamage"),
      }),
      Schema.Struct({
        kind: Schema.Literal("rolled"),
        flatModifier: Schema.Number,
        dieSize: Schema.Literal(10),
      }),
    ]),
    zeroDamageRedirect: Schema.optionalKey(
      Schema.Struct({
        spends: Schema.Struct({
          resourcePoolRef: BattleResourcePoolExecutionRef,
          resourceUnitId: Schema.optionalKey(Schema.Never),
          amount: Schema.Literal(1),
        }),
        saveAbility: Schema.Literal("dex"),
        saveDc: DifficultyClass,
        damageDice: Schema.Struct({
          dice: Schema.Literal(2),
          dieSize: DamageDieSizeSchema,
        }),
        damageAbilityModifier: AbilityModifier,
        attackKind: Schema.Literals(["melee", "ranged"]),
        targetGate: Schema.Struct({
          melee: Schema.Literal("visibleWithin5Feet"),
          ranged: Schema.Literal("visibleWithin60FeetWithoutTotalCover"),
        }),
        originalDamageType: DamageTypeSchema,
      }),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("fallDamageReduction"),
    procedureRef: BattleProcedureExecutionRef,
    label: Schema.optionalKey(Schema.Never),
    reduction: Schema.Struct({
      kind: Schema.Literal("flat"),
      amount: DamageAmount,
    }),
  }),
]);

const BattleInterruptProcedureChoiceWithSubjectPayloadSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("releaseReadiedSpell"),
    reactorId: CombatantId,
    subject: BattleSubjectSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
    readiedSpellCasterId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("releaseReadiedMovement"),
    reactorId: CombatantId,
    subject: BattleSubjectSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
    readiedMovementActorId: CombatantId,
  }),
  Schema.Struct({
    kind: Schema.Literal("releaseReadiedAction"),
    reactorId: CombatantId,
    subject: BattleSubjectSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("releaseReadiedAttack"),
    reactorId: CombatantId,
    subject: BattleSubjectSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("castTriggeredReactionSpell"),
    reactorId: CombatantId,
    subject: BattleSubjectSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("castAttackHitBonusActionSpell"),
    reactorId: CombatantId,
    subject: BattleSubjectSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("opportunityAttack"),
    reactorId: CombatantId,
    subject: BattleSubjectSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("retaliationAttack"),
    reactorId: CombatantId,
    subject: BattleSubjectSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
  }),
]);

export const BattleInterruptProcedureModifierChoiceSchema = Schema.Struct({
  kind: Schema.Literal("reactionRollOrDamageReduction"),
  reactorId: CombatantId,
  choice: BattleReactionModifierChoiceSchema,
  initialHoles: Schema.Array(BattleHoleSchema),
});

const battleInterruptProcedureChoiceInvariantAnnotations = {
  message:
    "Interrupt choices must own the matching reference-bearing runtime subject.",
};

function battleInterruptProcedureChoiceInvariantHolds(
  choice: typeof BattleInterruptProcedureChoiceWithSubjectPayloadSchema.Type,
): boolean {
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      releaseReadiedSpell: (value) =>
        value.subject.tag === "runtimeCommand" &&
        value.subject.command === "releaseReadiedSpell" &&
        value.reactorId === value.readiedSpellCasterId &&
        value.reactorId === value.subject.readiedSpellCasterId,
      releaseReadiedMovement: (value) =>
        value.subject.tag === "runtimeCommand" &&
        value.subject.command === "releaseReadiedMovement" &&
        value.reactorId === value.readiedMovementActorId &&
        value.reactorId === value.subject.readiedMovementActorId,
      releaseReadiedAction: (value) =>
        value.subject.tag === "runtimeCommand" &&
        value.subject.command === "releaseReadiedAction" &&
        value.reactorId === value.subject.reactorId,
      releaseReadiedAttack: (value) =>
        value.subject.tag === "runtimeCommand" &&
        value.subject.command === "releaseReadiedAttack" &&
        value.reactorId === value.subject.reactorId,
      castTriggeredReactionSpell: (value) =>
        value.subject.tag === "runtimeCommand" &&
        value.subject.command === "castTriggeredReactionSpell" &&
        value.reactorId === value.subject.reactorId,
      castAttackHitBonusActionSpell: (value) =>
        value.subject.tag === "runtimeCommand" &&
        value.subject.command === "castAttackHitBonusActionSpell" &&
        value.reactorId === value.subject.casterId,
      opportunityAttack: (value) =>
        value.subject.tag === "runtimeCommand" &&
        value.subject.command === "opportunityAttack" &&
        value.reactorId === value.subject.reactorId,
      retaliationAttack: (value) =>
        value.subject.tag === "runtimeCommand" &&
        value.subject.command === "retaliationAttack" &&
        value.reactorId === value.subject.reactorId,
    }),
  );
}

export const BattleInterruptProcedureChoiceWithSubjectSchema =
  BattleInterruptProcedureChoiceWithSubjectPayloadSchema.pipe(
    Schema.check(
      Schema.makeFilter(
        battleInterruptProcedureChoiceInvariantHolds,
        battleInterruptProcedureChoiceInvariantAnnotations,
      ),
    ),
  );

export const BattleInterruptProcedureChoiceSchema = Schema.Union([
  BattleInterruptProcedureChoiceWithSubjectSchema,
  BattleInterruptProcedureModifierChoiceSchema,
]);

const BattleLightEmitterEndOfTurnExpirationSchema = Schema.Struct({
  kind: Schema.Literal("endOfTurn"),
  combatantId: CombatantId,
  round: Schema.Number,
});

const BattleSpellLightEmitterMechanicalFields = {
  kind: Schema.Literal("spellLightEmitter"),
  sourceProcedureRef: BattleProcedureExecutionRef,
  sourceCombatantId: CombatantId,
  attachment: BattleLightEmitterAttachmentSchema,
  emission: IlluminationEmissionSchema,
  opaqueCoverInteraction: EmitterOpaqueCoverInteractionSchema,
  expiresAt: BattleActiveEffectExpirationSchema,
};

const BattleProjectedSpellLightEmitterFields = {
  ...BattleSpellLightEmitterMechanicalFields,
  effectRef: Schema.optionalKey(Schema.Never),
};

const BattleStoredSpellLightEmitterFields = {
  ...BattleSpellLightEmitterMechanicalFields,
  effectRef: BattleEffectExecutionRef,
};

const BattleProjectedSpellLightEmitterSchema = Schema.Union([
  Schema.Struct({
    ...BattleProjectedSpellLightEmitterFields,
    sourceEffectId: BattleSpellEffectOccurrenceId,
    sourceSpellLevel: BattleSpellEffectLevel,
  }),
  Schema.Struct({
    ...BattleProjectedSpellLightEmitterFields,
    sourceEffectId: Schema.optionalKey(Schema.Never),
    sourceSpellLevel: Schema.optionalKey(Schema.Never),
  }),
]);

const BattleStoredSpellLightEmitterSchema = Schema.Union([
  Schema.Struct({
    ...BattleStoredSpellLightEmitterFields,
    sourceEffectId: BattleSpellEffectOccurrenceId,
    sourceSpellLevel: BattleSpellEffectLevel,
  }),
  Schema.Struct({
    ...BattleStoredSpellLightEmitterFields,
    sourceEffectId: Schema.optionalKey(Schema.Never),
    sourceSpellLevel: Schema.optionalKey(Schema.Never),
  }),
]);

const BattleProjectedObjectInvisibleRevealLightEmitterSchema = Schema.Struct({
  effectRef: Schema.optionalKey(Schema.Never),
  kind: Schema.Literal("objectInvisibleRevealLightEmitter"),
  sourceProcedureRef: BattleProcedureExecutionRef,
  sourceCombatantId: CombatantId,
  objectId: BattleObjectId,
  emission: DimIlluminationEmissionSchema,
  expiresAt: BattleLightEmitterEndOfTurnExpirationSchema,
});

const BattleStoredObjectInvisibleRevealLightEmitterSchema = Schema.Struct({
  effectRef: BattleEffectExecutionRef,
  kind: Schema.Literal("objectInvisibleRevealLightEmitter"),
  sourceProcedureRef: BattleProcedureExecutionRef,
  sourceCombatantId: CombatantId,
  objectId: BattleObjectId,
  emission: DimIlluminationEmissionSchema,
  expiresAt: BattleLightEmitterEndOfTurnExpirationSchema,
});

const BattleStoredLightEmitterSchema = Schema.Union([
  BattleStoredSpellLightEmitterSchema,
  BattleStoredObjectInvisibleRevealLightEmitterSchema,
]);

const BattleLightEmitterSchema = Schema.Union([
  BattleProjectedSpellLightEmitterSchema,
  Schema.Struct({
    effectRef: Schema.optionalKey(Schema.Never),
    kind: Schema.Literal("unitFeatureLightEmitter"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    sourceCombatantId: CombatantId,
    attachment: BattleLightEmitterAttachmentSchema,
    emission: IlluminationEmissionSchema,
    opaqueCoverInteraction: EmitterOpaqueCoverInteractionSchema,
    expiresAt: BattleActiveEffectExpirationSchema,
  }),
  BattleProjectedObjectInvisibleRevealLightEmitterSchema,
]);

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
const BattleConcentrationOrDurationExpirationSchema = Schema.Union([
  BattleConcentrationWithDurationExpirationSchema,
  BattleDurationExpirationSchema,
]);

const BattleObscurementZoneSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("spellObscurementZone"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    sourceCombatantId: CombatantId,
    obscurement: Schema.Literals(["lightlyObscured", "heavilyObscured"]),
    area: Schema.Union([
      BattlePointOriginSphereAreaSchema,
      BattlePointOriginCylinderAreaSchema,
      Schema.Struct({
        kind: Schema.Literal("pointOriginCube"),
        areaId: BattleAreaId,
        sideFeet: MovementFeet,
      }),
    ]),
    expiresAt: BattleConcentrationOrDurationExpirationSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellMagicalDarknessZone"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    sourceCombatantId: CombatantId,
    area: BattlePointOriginSphereAreaSchema,
    expiresAt: BattleConcentrationOrDurationExpirationSchema,
  }),
]);

const BattleCompanionSnapshotSchema = Schema.Union([
  Schema.Struct({
    status: Schema.Literal("present"),
    ownerId: CombatantId,
    companionId: CombatantId,
    identity: BattleCompanionIdentitySchema,
    protocol: BattleCompanionProtocolSchema,
    formAccess: Schema.Literal("spawnedCompanion"),
    resolvedStatBlockId: BattleCompanionResolvedStatBlockIdSchema,
    creatureTypeOverride: SpawnedCompanionCreatureTypeOverrideSchema,
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
    creatureTypeOverride: SpawnedCompanionCreatureTypeOverrideSchema,
    initiative: Schema.Number,
    placement: BattleCompanionPlacementSchema,
  }),
  Schema.Struct({
    status: Schema.Literal("temporarilyDismissed"),
    ownerId: CombatantId,
    identity: BattleCompanionIdentitySchema,
    protocol: BattleCompanionProtocolSchema,
    reappearanceCombatantId: CombatantId,
    formAccess: Schema.Literal("spawnedCompanion"),
    resolvedStatBlockId: BattleCompanionResolvedStatBlockIdSchema,
    creatureTypeOverride: SpawnedCompanionCreatureTypeOverrideSchema,
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
    creatureTypeOverride: SpawnedCompanionCreatureTypeOverrideSchema,
    hitPoints: BattleCompanionHitPointsSchema,
    ammunitionStocks: BattleAmmunitionStocksSchema,
    reactionAvailable: Schema.Boolean,
  }),
  Schema.Struct({
    status: Schema.Literal("disappearedAtZeroHitPoints"),
    ownerId: CombatantId,
    identity: BattleCompanionIdentitySchema,
    protocol: BattleCompanionProtocolSchema,
    formAccess: Schema.Literal("spawnedCompanion"),
    resolvedStatBlockId: BattleCompanionResolvedStatBlockIdSchema,
    creatureTypeOverride: SpawnedCompanionCreatureTypeOverrideSchema,
    reactionAvailable: Schema.Boolean,
  }),
  Schema.Struct({
    status: Schema.Literal("disappearedAtZeroHitPoints"),
    ownerId: CombatantId,
    identity: BattleCompanionIdentitySchema,
    protocol: BattleCompanionProtocolSchema,
    formAccess: Schema.Literal("pactOfTheChain"),
    resolvedStatBlockId: BattleCompanionResolvedStatBlockIdSchema,
    creatureTypeOverride: SpawnedCompanionCreatureTypeOverrideSchema,
    reactionAvailable: Schema.Boolean,
  }),
]);

type EncodedBattleCreatureSnapshot = BattleCreatureSnapshotInvariantInput;
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
type EncodedBattleStoredLightEmitter =
  typeof BattleStoredLightEmitterSchema.Type;
type SerializedActiveEffectKind =
  EncodedBattleCreatureSnapshot["activeEffectOccurrences"][number]["activeEffectKind"];
type SerializedActiveEffectLocationExpectation =
  | { readonly kind: "identityOnly" }
  | { readonly kind: "nonSpatial" }
  | { readonly kind: "area"; readonly areaId: BattleAreaId }
  | {
      readonly kind: "line";
      readonly areaId: BattleAreaId;
      readonly directionId: BattleLineDirectionId;
    }
  | { readonly kind: "object"; readonly objectId: BattleObjectId };
type SerializedEffectOccurrenceExpectation =
  | {
      readonly kind: "activeEffect";
      readonly activeEffectKinds: readonly [
        SerializedActiveEffectKind,
        ...SerializedActiveEffectKind[],
      ];
      readonly location: SerializedActiveEffectLocationExpectation;
    }
  | { readonly kind: "storedLightEmitter" };
type EncodedBattleActDiscoveryCandidate =
  typeof BattleActDiscoveryCandidateSchema.Type;
type EncodedBattleInterruptProcedureChoice =
  typeof BattleInterruptProcedureChoiceSchema.Type;

type SerializedExecutionReferenceOwnership =
  | {
      readonly kind: "subjectProcedure";
      readonly ref: BattleProcedureExecutionRef;
      readonly ownerId: CombatantId | undefined;
    }
  | {
      readonly kind: "execution";
      readonly ref: string;
      readonly ownerId: CombatantId | undefined;
    }
  | {
      readonly kind: "effectOccurrence";
      readonly ref: BattleEffectExecutionRef;
      readonly ownerId: CombatantId | undefined;
      readonly expectation: SerializedEffectOccurrenceExpectation;
    };

function serializedExecutionReference(
  ref: string,
  ownerId: CombatantId | undefined,
): Extract<SerializedExecutionReferenceOwnership, { kind: "execution" }> {
  return { kind: "execution", ref, ownerId };
}

function serializedEffectOccurrenceReference(
  ref: BattleEffectExecutionRef,
  expectation: SerializedEffectOccurrenceExpectation,
  ownerId: CombatantId | undefined,
): SerializedExecutionReferenceOwnership {
  return {
    kind: "effectOccurrence",
    ref,
    ownerId,
    expectation,
  };
}

function serializedOngoingSpellOccurrenceExpectation(
  effect: Schema.Schema.Type<typeof BattleOngoingSpellOccurrenceRefSchema>,
): SerializedEffectOccurrenceExpectation {
  return Match.value(effect).pipe(
    Match.discriminatorsExhaustive("kind")({
      spellActiveEffect: ({ activeEffectKind }) => ({
        kind: "activeEffect" as const,
        activeEffectKinds: [activeEffectKind] as const,
        location: { kind: "identityOnly" as const },
      }),
      spellLightEmitter: () => ({ kind: "storedLightEmitter" as const }),
    }),
  );
}

function serializedSubjectProcedureReference(
  ref: BattleProcedureExecutionRef,
  ownerId: CombatantId | undefined,
): Extract<
  SerializedExecutionReferenceOwnership,
  { kind: "subjectProcedure" }
> {
  return { kind: "subjectProcedure", ref, ownerId };
}

const noSerializedExecutionReferences =
  (): readonly SerializedExecutionReferenceOwnership[] => [];

function serializedBattleHoleExecutionReferences(
  hole: EncodedBattleHole,
): readonly SerializedExecutionReferenceOwnership[] {
  const source = (
    ref: BattleProcedureExecutionRef,
    ownerId?: CombatantId,
  ): SerializedExecutionReferenceOwnership =>
    serializedSubjectProcedureReference(ref, ownerId);
  const owned = (
    ref: string,
    ownerId: CombatantId,
  ): SerializedExecutionReferenceOwnership =>
    serializedExecutionReference(ref, ownerId);
  const bound = (ref: string): SerializedExecutionReferenceOwnership =>
    serializedExecutionReference(ref, undefined);
  const boundOccurrence = (
    ref: BattleEffectExecutionRef,
    expectation: SerializedEffectOccurrenceExpectation,
    ownerId?: CombatantId,
  ): SerializedExecutionReferenceOwnership =>
    serializedEffectOccurrenceReference(ref, expectation, ownerId);
  const activeEffect = (
    activeEffectKind: SerializedActiveEffectKind,
    location: SerializedActiveEffectLocationExpectation = {
      kind: "identityOnly",
    },
  ): SerializedEffectOccurrenceExpectation => ({
    kind: "activeEffect",
    activeEffectKinds: [activeEffectKind],
    location,
  });
  const damageOccurrenceReferences = (
    occurrence: Schema.Schema.Type<typeof BattleDamageOccurrenceSourceSchema>,
    ownerId: CombatantId,
  ): readonly SerializedExecutionReferenceOwnership[] =>
    Match.value(occurrence).pipe(
      Match.discriminatorsExhaustive("kind")({
        untrackedDamage: () => [],
        spellTurnEndDamage: ({ effectRef }) => [
          boundOccurrence(
            effectRef,
            activeEffect("spellTurnEndDamage"),
            ownerId,
          ),
        ],
      }),
    );
  const attackOptionReferences = (
    attack: Extract<
      EncodedBattleHole,
      { readonly kind: "attackRoll" | "rolledDice"; readonly attack: unknown }
    >["attack"],
  ): readonly SerializedExecutionReferenceOwnership[] =>
    Match.value(attack).pipe(
      Match.discriminatorsExhaustive("kind")({
        weapon: (value) => [
          ...(value.attackDamageAbilityModifierChoice?.procedureRefs ?? []).map(
            (ref) => bound(ref),
          ),
          ...(value.alternateAbilityChoices ?? []).flatMap(
            (choice) =>
              choice.attackDamageAbilityModifierChoice?.procedureRefs.map(
                (ref) => bound(ref),
              ) ?? [],
          ),
        ],
        unarmedStrike: (value) =>
          value.effect.damage.kind === "procedureReplacement"
            ? [bound(value.effect.damage.sourceProcedureRef)]
            : [],
        statBlockAttack: (value) => [source(value.procedureRef)],
      }),
    );
  const savingThrowReferences = (
    value: Extract<EncodedBattleHole, { readonly kind: "savingThrowOutcome" }>,
  ): readonly SerializedExecutionReferenceOwnership[] => {
    const bonuses = value.targetFlatBonuses.map((bonus) =>
      owned(bonus.sourceProcedureRef, bonus.sourceCombatantId),
    );
    const procedureSource = (owner: {
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly sourceCombatantId: CombatantId;
    }): readonly SerializedExecutionReferenceOwnership[] => [
      source(owner.sourceProcedureRef, owner.sourceCombatantId),
      ...bonuses,
    ];
    const occurrenceSource = (
      owner: {
        readonly sourceProcedureRef: BattleProcedureExecutionRef;
        readonly sourceCombatantId: CombatantId;
        readonly effectRef: BattleEffectExecutionRef;
      },
      ownerId: CombatantId,
      expectation: SerializedEffectOccurrenceExpectation,
    ): readonly SerializedExecutionReferenceOwnership[] => [
      source(owner.sourceProcedureRef, owner.sourceCombatantId),
      boundOccurrence(owner.effectRef, expectation, ownerId),
      ...bonuses,
    ];
    return Match.value(value).pipe(
      Match.when({ sourceProcedureRef: Match.any }, (hole) => [
        source(hole.sourceProcedureRef),
        ...bonuses,
      ]),
      Match.whenOr(
        { objectContactSave: Match.any },
        { spellTurnStartSave: Match.any },
        { saveGatedConditionRepeatSave: Match.any },
        { stagedConditionRepeatSave: Match.any },
        { spellConditionEndTurnSave: Match.any },
        { spellConditionCountedEndTurnSave: Match.any },
        { unitFeatureConditionEndTurnSave: Match.any },
        { turnConstraintEndTurnSave: Match.any },
        { abilityD20TestRollModeEndTurnSave: Match.any },
        { protectionRelevantEffectSave: Match.any },
        (hole) =>
          Match.value(hole).pipe(
            Match.when({ objectContactSave: Match.any }, (matched) =>
              procedureSource(matched.objectContactSave),
            ),
            Match.when({ spellTurnStartSave: Match.any }, (matched) =>
              occurrenceSource(
                matched.spellTurnStartSave,
                matched.spellTurnStartSave.targetId,
                activeEffect("spellTurnStartDamageAndSave"),
              ),
            ),
            Match.when(
              { saveGatedConditionRepeatSave: Match.any },
              (matched) => [
                ...occurrenceSource(
                  matched.saveGatedConditionRepeatSave,
                  matched.saveGatedConditionRepeatSave.targetId,
                  activeEffect("saveGatedConditionWithRepeat"),
                ),
                ...damageOccurrenceReferences(
                  matched.damageOccurrence,
                  matched.saveGatedConditionRepeatSave.targetId,
                ),
              ],
            ),
            Match.when({ stagedConditionRepeatSave: Match.any }, (matched) =>
              procedureSource(matched.stagedConditionRepeatSave),
            ),
            Match.when({ spellConditionEndTurnSave: Match.any }, (matched) =>
              procedureSource(matched.spellConditionEndTurnSave),
            ),
            Match.when(
              { spellConditionCountedEndTurnSave: Match.any },
              (matched) =>
                procedureSource(matched.spellConditionCountedEndTurnSave),
            ),
            Match.when(
              { unitFeatureConditionEndTurnSave: Match.any },
              (matched) =>
                procedureSource(matched.unitFeatureConditionEndTurnSave),
            ),
            Match.when({ turnConstraintEndTurnSave: Match.any }, (matched) =>
              procedureSource(matched.turnConstraintEndTurnSave),
            ),
            Match.when(
              { abilityD20TestRollModeEndTurnSave: Match.any },
              (matched) =>
                procedureSource(matched.abilityD20TestRollModeEndTurnSave),
            ),
            Match.when({ protectionRelevantEffectSave: Match.any }, (matched) =>
              occurrenceSource(
                matched.protectionRelevantEffectSave,
                matched.protectionRelevantEffectSave.targetId,
                matched.protectionRelevantEffectSave.relevantEffect ===
                  "possession"
                  ? activeEffect("possession")
                  : activeEffect("spellConditionRepeatSave"),
              ),
            ),
            Match.exhaustive,
          ),
      ),
      Match.whenOr(
        { persistentAreaSaveCondition: Match.any },
        { persistentAreaSaveConditionEscape: Match.any },
        { persistentAreaSaveComposite: Match.any },
        { persistentAreaSaveDamage: Match.any },
        { directionalPersistentArea: Match.any },
        { movableZone: Match.any },
        { grantedAreaSaveDamageAction: Match.any },
        { glyphExplosiveRune: Match.any },
        (hole) =>
          Match.value(hole).pipe(
            Match.when({ persistentAreaSaveCondition: Match.any }, (matched) =>
              occurrenceSource(
                matched.persistentAreaSaveCondition,
                matched.persistentAreaSaveCondition.sourceCombatantId,
                activeEffect("persistentAreaSaveCondition", {
                  kind: "area",
                  areaId: matched.persistentAreaSaveCondition.areaId,
                }),
              ),
            ),
            Match.when(
              { persistentAreaSaveConditionEscape: Match.any },
              (matched) =>
                occurrenceSource(
                  matched.persistentAreaSaveConditionEscape,
                  matched.persistentAreaSaveConditionEscape.sourceCombatantId,
                  activeEffect("persistentAreaSaveConditionEscape", {
                    kind: "area",
                    areaId: matched.persistentAreaSaveConditionEscape.areaId,
                  }),
                ),
            ),
            Match.when({ persistentAreaSaveComposite: Match.any }, (matched) =>
              occurrenceSource(
                matched.persistentAreaSaveComposite,
                matched.persistentAreaSaveComposite.sourceCombatantId,
                activeEffect("persistentAreaSaveComposite", {
                  kind: "area",
                  areaId: matched.persistentAreaSaveComposite.areaId,
                }),
              ),
            ),
            Match.when({ persistentAreaSaveDamage: Match.any }, (matched) =>
              occurrenceSource(
                matched.persistentAreaSaveDamage,
                matched.persistentAreaSaveDamage.sourceCombatantId,
                activeEffect("persistentAreaSaveDamage", {
                  kind: "area",
                  areaId: matched.persistentAreaSaveDamage.areaId,
                }),
              ),
            ),
            Match.when({ directionalPersistentArea: Match.any }, (matched) =>
              occurrenceSource(
                matched.directionalPersistentArea,
                matched.directionalPersistentArea.sourceCombatantId,
                activeEffect("directionalPersistentArea", {
                  kind: "line",
                  areaId: matched.directionalPersistentArea.areaId,
                  directionId: matched.directionalPersistentArea.directionId,
                }),
              ),
            ),
            Match.when({ movableZone: Match.any }, (matched) =>
              occurrenceSource(
                matched.movableZone,
                matched.movableZone.sourceCombatantId,
                matched.movableZone.trigger ===
                  "endsTurnWithinFiveFeetOfSphere" ||
                  matched.movableZone.trigger === "rammedBySphere"
                  ? activeEffect("persistentAreaSaveDamage", {
                      kind: "area",
                      areaId: matched.movableZone.areaId,
                    })
                  : activeEffect("persistentAreaSaveDamage", {
                      kind: "area",
                      areaId: matched.movableZone.areaId,
                    }),
              ),
            ),
            Match.when({ grantedAreaSaveDamageAction: Match.any }, (matched) =>
              procedureSource(matched.grantedAreaSaveDamageAction),
            ),
            Match.when({ glyphExplosiveRune: Match.any }, (matched) =>
              occurrenceSource(
                matched.glyphExplosiveRune,
                matched.glyphExplosiveRune.sourceCombatantId,
                activeEffect("glyphDurableOccurrence"),
              ),
            ),
            Match.exhaustive,
          ),
      ),
      Match.when({ targetIds: Match.any }, () => bonuses),
      Match.exhaustive,
    );
  };
  const rolledDiceReferences = (
    value: Extract<EncodedBattleHole, { readonly kind: "rolledDice" }>,
  ): readonly SerializedExecutionReferenceOwnership[] => {
    const procedureSource = (owner: {
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
      readonly sourceCombatantId: CombatantId;
    }): readonly SerializedExecutionReferenceOwnership[] => [
      source(owner.sourceProcedureRef, owner.sourceCombatantId),
    ];
    const activeOccurrenceSource = (
      owner: {
        readonly targetId: CombatantId;
        readonly sourceProcedureRef: BattleProcedureExecutionRef;
        readonly sourceCombatantId: CombatantId;
        readonly effectRef: BattleEffectExecutionRef;
      },
      expectation: SerializedEffectOccurrenceExpectation,
    ): readonly SerializedExecutionReferenceOwnership[] => [
      source(owner.sourceProcedureRef, owner.sourceCombatantId),
      boundOccurrence(owner.effectRef, expectation, owner.targetId),
    ];
    const spellDamageRiderReferences = (
      riders:
        | readonly {
            readonly sourceProcedureRef: BattleProcedureExecutionRef;
            readonly sourceCombatantId: CombatantId;
            readonly effectRef: BattleEffectExecutionRef;
          }[]
        | undefined,
      activeEffectKind: Extract<
        SerializedActiveEffectKind,
        "spellMarkedDamageRider" | "spellWeaponDamageRider"
      >,
    ): readonly SerializedExecutionReferenceOwnership[] =>
      (riders ?? []).flatMap((rider) => [
        owned(rider.sourceProcedureRef, rider.sourceCombatantId),
        boundOccurrence(
          rider.effectRef,
          activeEffect(activeEffectKind),
          rider.sourceCombatantId,
        ),
      ]);
    return Match.value(value).pipe(
      Match.when({ sourceProcedureRef: Match.any }, (hole) => [
        source(hole.sourceProcedureRef),
        ...Match.value(hole).pipe(
          Match.when({ spellMarkedDamageRiders: Match.any }, (spellDamage) =>
            spellDamageRiderReferences(
              spellDamage.spellMarkedDamageRiders,
              "spellMarkedDamageRider",
            ),
          ),
          Match.orElse(() => []),
        ),
      ]),
      Match.when({ grantedAreaSaveDamageAction: Match.any }, (hole) =>
        procedureSource(hole.grantedAreaSaveDamageAction),
      ),
      Match.when({ glyphExplosiveRune: Match.any }, (hole) =>
        activeOccurrenceSource(
          {
            ...hole.glyphExplosiveRune,
            targetId: hole.glyphExplosiveRune.sourceCombatantId,
          },
          activeEffect("glyphDurableOccurrence"),
        ),
      ),
      Match.when({ spellDamageReduction: Match.any }, (hole) => [
        ...procedureSource(hole.spellDamageReduction),
        boundOccurrence(
          hole.spellDamageReduction.effectRef,
          activeEffect("spellDamageReduction"),
          hole.spellDamageReduction.targetId,
        ),
      ]),
      Match.when({ sourceDamageRollPenalty: Match.any }, (hole) => [
        ...procedureSource(hole.sourceDamageRollPenalty),
        boundOccurrence(
          hole.sourceDamageRollPenalty.effectRef,
          activeEffect("sourceDamageRollPenalty"),
          hole.sourceDamageRollPenalty.affectedCombatantId,
        ),
      ]),
      Match.when({ duplicateHitInterceptionRoll: Match.any }, (hole) =>
        procedureSource(hole.duplicateHitInterceptionRoll),
      ),
      Match.when({ spellTurnStartDamage: Match.any }, (hole) =>
        activeOccurrenceSource(
          hole.spellTurnStartDamage,
          activeEffect("spellTurnStartDamageAndSave"),
        ),
      ),
      Match.when({ spellTurnEndDamage: Match.any }, (hole) =>
        activeOccurrenceSource(
          hole.spellTurnEndDamage,
          activeEffect("spellTurnEndDamage"),
        ),
      ),
      Match.when({ movableZone: Match.any }, (hole) => [
        ...procedureSource(hole.movableZone),
        boundOccurrence(
          hole.movableZone.effectRef,
          hole.movableZone.trigger === "endsTurnWithinFiveFeetOfSphere" ||
            hole.movableZone.trigger === "rammedBySphere"
            ? activeEffect("persistentAreaSaveDamage", {
                kind: "area",
                areaId: hole.movableZone.areaId,
              })
            : activeEffect("persistentAreaSaveDamage", {
                kind: "area",
                areaId: hole.movableZone.areaId,
              }),
          hole.movableZone.sourceCombatantId,
        ),
      ]),
      Match.when({ areaMovementDistanceDamage: Match.any }, (hole) => [
        ...procedureSource(hole.areaMovementDistanceDamage),
        boundOccurrence(
          hole.areaMovementDistanceDamage.effectRef,
          activeEffect("areaMovementDistanceDamage", {
            kind: "area",
            areaId: hole.areaMovementDistanceDamage.areaId,
          }),
          hole.areaMovementDistanceDamage.sourceCombatantId,
        ),
      ]),
      Match.when({ persistentAreaSaveDamage: Match.any }, (hole) => [
        ...procedureSource(hole.persistentAreaSaveDamage),
        boundOccurrence(
          hole.persistentAreaSaveDamage.effectRef,
          activeEffect("persistentAreaSaveDamage", {
            kind: "area",
            areaId: hole.persistentAreaSaveDamage.areaId,
          }),
          hole.persistentAreaSaveDamage.sourceCombatantId,
        ),
      ]),
      Match.when({ attack: Match.any }, (hole) => [
        ...attackOptionReferences(hole.attack),
        ...(hole.attackDamageRiders ?? []).map((rider) =>
          owned(rider.procedureRef, rider.attackerId),
        ),
        ...spellDamageRiderReferences(
          hole.spellWeaponDamageRiders,
          "spellWeaponDamageRider",
        ),
        ...spellDamageRiderReferences(
          hole.spellMarkedDamageRiders,
          "spellMarkedDamageRider",
        ),
        ...(hole.cunningStrikeOptions ?? []).flatMap((option) => [
          bound(option.procedureRef),
          bound(option.sourceDamageRiderProcedureRef),
        ]),
        ...(hole.weaponDamageDiceRollChoiceProcedureRefs ?? []).map((ref) =>
          bound(ref),
        ),
        ...(hole.attackDamageDieFloorChoiceProcedureRefs ?? []).map((ref) =>
          bound(ref),
        ),
        ...(hole.attackDamageAbilityModifierChoice?.procedureRefs ?? []).map(
          (ref) => bound(ref),
        ),
      ]),
      Match.when({ kind: "rolledDice" }, () => []),
      Match.exhaustive,
    );
  };

  return Match.value(hole).pipe(
    Match.discriminatorsExhaustive("kind")({
      readyDeclaration: (value) =>
        value.responseChoices.flatMap((response) =>
          response.kind === "attack"
            ? [owned(response.selection.procedureRef, value.actorId)]
            : [],
        ),
      helpAttackAllyDecision: noSerializedExecutionReferences,
      helpAttackEnemyDecision: noSerializedExecutionReferences,
      areaWindStrength: noSerializedExecutionReferences,
      damageRelationshipDecisions: (value) =>
        value.questions.flatMap((question) =>
          question.kind === "enemyZeroHitPointTemporaryHitPoints"
            ? [owned(question.procedureRef, question.beneficiaryId)]
            : [],
        ),
      targetChoice: (value) => [
        ...(value.procedureRef === undefined
          ? []
          : [source(value.procedureRef)]),
        ...(value.spellTargetSpatialFactRequest === undefined
          ? []
          : [
              source(
                value.spellTargetSpatialFactRequest.sourceProcedureRef,
                value.spellTargetSpatialFactRequest.casterId,
              ),
            ]),
        ...(value.attack === undefined
          ? []
          : [owned(value.attack.selection.procedureRef, value.attack.actorId)]),
      ],
      targetSpatialFacts: (value) =>
        Match.value(value).pipe(
          Match.when({ linkedEffectSeparation: Match.any }, (hole) => [
            source(
              hole.linkedEffectSeparation.sourceProcedureRef,
              hole.linkedEffectSeparation.sourceCombatantId,
            ),
          ]),
          Match.when({ spellBeingCast: Match.any }, (hole) => [
            source(
              hole.spellBeingCast.sourceProcedureRef,
              hole.spellBeingCast.casterId,
            ),
          ]),
          Match.exhaustive,
        ),
      turnConstraintSomaticSpellFailureOutcome: (value) => [
        source(value.sourceProcedureRef, value.actorId),
        ...value.activeEffectSources.map((effect) =>
          owned(effect.sourceProcedureRef, effect.sourceCombatantId),
        ),
      ],
      objectTargetChoice: (value) => [source(value.sourceProcedureRef)],
      wildShapeEquipmentDisposition: (value) => [
        owned(value.formExecutionRef, value.actorId),
      ],
      hitPointHealingDistribution: (value) => [
        source(
          value.healingPool.sourceProcedureRef,
          value.healingPool.sourceCombatantId,
        ),
      ],
      ongoingSpellTargetChoice: (value) => [
        owned(value.procedureRef, value.casterId),
        ...value.choices.flatMap((choice) =>
          Match.value(choice).pipe(
            Match.discriminatorsExhaustive("kind")({
              combatant: () => [],
              object: () => [],
              magicalEffect: ({ effect }) =>
                Match.value(effect).pipe(
                  Match.discriminatorsExhaustive("kind")({
                    magicSuppressionEmanation: (occurrence) => [
                      boundOccurrence(
                        occurrence.effectRef,
                        activeEffect("magicSuppressionEmanation", {
                          kind: "area",
                          areaId: occurrence.areaId,
                        }),
                        occurrence.sourceCombatantId,
                      ),
                    ],
                    spellActiveEffect: (occurrence) => [
                      boundOccurrence(
                        occurrence.effectRef,
                        serializedOngoingSpellOccurrenceExpectation(occurrence),
                      ),
                    ],
                    spellLightEmitter: (occurrence) => [
                      boundOccurrence(
                        occurrence.effectRef,
                        serializedOngoingSpellOccurrenceExpectation(occurrence),
                      ),
                    ],
                  }),
                ),
            }),
          ),
        ),
      ],
      objectContactTargets: (value) => [
        source(
          value.objectContact.sourceProcedureRef,
          value.objectContact.sourceCombatantId,
        ),
      ],
      objectDropResolution: (value) => [
        source(
          value.objectDrop.sourceProcedureRef,
          value.objectDrop.sourceCombatantId,
        ),
      ],
      heldObjectFacts: noSerializedExecutionReferences,
      weaponAttackDamageEnhancementTargetItem: (value) => [
        source(value.sourceProcedureRef),
      ],
      damageTypeChoice: (value) => [source(value.sourceProcedureRef)],
      spellTargetAllocation: (value) => [source(value.sourceProcedureRef)],
      spellTargetList: (value) => [source(value.sourceProcedureRef)],
      attackRoll: (value) =>
        Match.value(value).pipe(
          Match.when({ sourceProcedureRef: Match.any }, (hole) => [
            source(hole.sourceProcedureRef),
            ...(hole.missToHitReplacements ?? []).map((replacement) =>
              bound(replacement.procedureRef),
            ),
          ]),
          Match.when({ attack: Match.any }, (hole) => [
            ...attackOptionReferences(hole.attack),
            ...(hole.ongoingFeatureActivations ?? []).map((activation) =>
              bound(activation.procedureRef),
            ),
            ...(hole.missToHitReplacements ?? []).map((replacement) =>
              bound(replacement.procedureRef),
            ),
          ]),
          Match.exhaustive,
        ),
      rolledDice: rolledDiceReferences,
      skillChoice: (value) => [source(value.sourceProcedureRef)],
      abilityChoice: (value) => [source(value.sourceProcedureRef)],
      targetAbilityChoices: (value) => [source(value.sourceProcedureRef)],
      conditionChoice: (value) => [source(value.sourceProcedureRef)],
      temporaryAbilityCheckRollModeActiveEffectCount: (value) => [
        source(value.sourceProcedureRef),
      ],
      compelledBehaviorOptionChoice: (value) => [
        source(value.sourceProcedureRef),
      ],
      selfTransformationModeChoice: (value) => [
        source(value.sourceProcedureRef),
      ],
      movableLightPlacement: (value) => [source(value.sourceProcedureRef)],
      spellAreaChoice: (value) => [source(value.sourceProcedureRef)],
      teleportDestination: (value) => [
        source(value.sourceProcedureRef, value.actorId),
      ],
      spatialMeleeSpellAttackProxyPosition: (value) => [
        source(value.sourceProcedureRef),
      ],
      savingThrowOutcome: savingThrowReferences,
      directionalPersistentAreaDirectionChoice: (value) => [
        source(value.sourceProcedureRef, value.sourceCombatantId),
        boundOccurrence(
          value.effectRef,
          activeEffect("directionalPersistentArea", {
            kind: "line",
            areaId: value.areaId,
            directionId: value.directionId,
          }),
          value.sourceCombatantId,
        ),
      ],
      movableZoneRepositionMovement: (value) => [
        source(
          value.movableZone.sourceProcedureRef,
          value.movableZone.sourceCombatantId,
        ),
        boundOccurrence(
          value.movableZone.effectRef,
          activeEffect("persistentAreaSaveDamage", {
            kind: "area",
            areaId: value.movableZone.areaId,
          }),
          value.movableZone.sourceCombatantId,
        ),
      ],
      persistentAreaSourceTurnTranslation: (value) => [
        source(value.sourceProcedureRef, value.sourceCombatantId),
        boundOccurrence(
          value.effectRef,
          activeEffect("persistentAreaSaveDamage", {
            kind: "area",
            areaId: value.areaId,
          }),
          value.sourceCombatantId,
        ),
      ],
      startTurnOccurrenceOrder: () => [],
      temporaryHitPointChoice: (value) => [
        source(value.sourceProcedureRef, value.sourceCombatantId),
        boundOccurrence(
          value.effectRef,
          activeEffect("turnStartTemporaryHitPoints"),
          value.sourceTurn.actorId,
        ),
      ],
      statBlockRechargeRoll: (value) =>
        value.rechargeTargets.map((ref) => owned(ref, value.combatantId)),
      spellcastingAbilityCheck: (value) => {
        const check = value.spellcastingAbilityCheck;
        return [
          source(check.sourceProcedureRef, check.casterId),
          ...Match.value(check).pipe(
            Match.when({ target: { kind: "magicalEffect" } }, (magical) => [
              boundOccurrence(
                magical.target.effect.effectRef,
                serializedOngoingSpellOccurrenceExpectation(
                  magical.target.effect,
                ),
              ),
            ]),
            Match.orElse((aggregate) => [
              boundOccurrence(
                aggregate.checkedOccurrence.effect.effectRef,
                serializedOngoingSpellOccurrenceExpectation(
                  aggregate.checkedOccurrence.effect,
                ),
                aggregate.checkedOccurrence.ownerId,
              ),
            ]),
          ),
        ];
      },
      targetingSaveInterdictionOutcome: (value) => [
        owned(value.sourceProcedureRef, value.sourceCombatantId),
        source(value.triggeringProcedureRef, value.triggeringCombatantId),
      ],
      abilityCheck: noSerializedExecutionReferences,
      attackDamageDisposition: (value) => [
        ...damageOccurrenceReferences(value.damageOccurrence, value.targetId),
        ...value.choices.flatMap((choice) =>
          choice.kind === "zeroHitPointReplacement"
            ? [owned(choice.procedureRef, value.targetId)]
            : [],
        ),
      ],
      companionReappearanceInitiative: noSerializedExecutionReferences,
      companionReappearancePlacement: noSerializedExecutionReferences,
      concentrationSavingThrow: (value) => [
        ...damageOccurrenceReferences(
          value.damageOccurrence,
          value.combatantId,
        ),
        ...value.targetFlatBonuses.map((bonus) =>
          owned(bonus.sourceProcedureRef, bonus.sourceCombatantId),
        ),
      ],
      cunningStrikeEndTurnCoverFacts: noSerializedExecutionReferences,
      deathSavingThrow: noSerializedExecutionReferences,
      spawnedCompanionConnection: noSerializedExecutionReferences,
      grappleOutcome: noSerializedExecutionReferences,
      interruptDecision: noSerializedExecutionReferences,
      controlledVerticalSuspensionAltitudeChange: (value) => [
        boundOccurrence(
          value.effectRef,
          activeEffect("controlledVerticalSuspension"),
          value.targetId,
        ),
      ],
      controlledVerticalSuspensionInitialRise: noSerializedExecutionReferences,
      movement: noSerializedExecutionReferences,
      movableZoneRamMovement: (value) => [
        source(
          value.movableZone.sourceProcedureRef,
          value.movableZone.sourceCombatantId,
        ),
        boundOccurrence(
          value.movableZone.effectRef,
          activeEffect("persistentAreaSaveDamage", {
            kind: "area",
            areaId: value.movableZone.areaId,
          }),
          value.movableZone.sourceCombatantId,
        ),
      ],
      shoveOutcome: noSerializedExecutionReferences,
      toolPossessionFacts: noSerializedExecutionReferences,
      unitFeatureDecision: noSerializedExecutionReferences,
    }),
  );
}

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
      executeCompelledApproach: actorOwned,
      executeCompelledDrop: actorOwned,
      executeCompelledFlee: actorOwned,
      executeCompelledGrovel: actorOwned,
      creatureFalls: actorOwned,
      creatureTypeProtectionConditionAttempt: actorOwned,
      creatureTypeProtectionPossessionAttempt: actorOwned,
      endPersistentAreaSaveDamageForEnvironment: actorOwned,
      endPersistentAreaTraitForEnvironment: actorOwned,
      grantedAreaSaveDamageAction: actorOwned,
      endConcentration: actorOwned,
      endTurn: actorOwned,
      persistentAreaSaveConditionSave: actorOwned,
      directionalPersistentAreaDirectionChange: actorOwned,
      directionalPersistentAreaSave: actorOwned,
      persistentAreaSaveDamageSave: actorOwned,
      fixedCostMovementReplacement: actorOwned,
      controlledVerticalSuspensionAltitudeControl: actorOwned,
      persistentAreaSaveDamageExit: actorOwned,
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
      persistentAreaSaveCompositeSave: actorOwned,
      standFromProne: actorOwned,
      linkedDefenseResistanceDamageShareSeparation: actorOwned,
      endPersistentAreaSaveConditionEscapeForAreaRemoval: actorOwned,
      endPersistentAreaSaveConditionEscapeForDeparture: actorOwned,
      persistentAreaSaveConditionEscapeSave: actorOwned,
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
  const effectOccurrenceRefs = combatant.activeEffectOccurrences.map(
    ({ effectRef }) => effectRef,
  );
  if (combatant.origin.kind === "statBlock") {
    return [
      ...effectOccurrenceRefs,
      ...serializedStatBlockAuthoritativeExecutionReferences(
        combatant.origin.execution,
      ),
    ];
  }
  const origin = combatant.origin;
  return [
    ...effectOccurrenceRefs,
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
  | "effectOccurrenceSource"
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

type SerializedLightEmitterSource =
  | {
      readonly kind: "spellLightEmitter";
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "unitFeatureLightEmitter";
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    }
  | {
      readonly kind: "objectInvisibleRevealLightEmitter";
      readonly sourceCombatantId: CombatantId;
      readonly sourceProcedureRef: BattleProcedureExecutionRef;
    };

function serializedLightEmitterSource(
  emitter: SerializedLightEmitterSource,
): SerializedLightEmitterSource {
  return {
    kind: emitter.kind,
    sourceCombatantId: emitter.sourceCombatantId,
    sourceProcedureRef: emitter.sourceProcedureRef,
  };
}

function serializedLightEmitterOwnsSource(
  emitter: SerializedLightEmitterSource,
  combatants: readonly EncodedBattleCreatureSnapshot[],
): boolean {
  return Match.value(serializedLightEmitterSource(emitter)).pipe(
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

function serializedSpellcastingAbilityCheckTargetMatchesOccurrence(
  hole: EncodedBattleHole,
  combatants: readonly EncodedBattleCreatureSnapshot[],
  storedLightEmitters: readonly EncodedBattleStoredLightEmitter[],
): boolean {
  if (
    hole.kind !== "spellcastingAbilityCheck" ||
    hole.spellcastingAbilityCheck.target.kind === "magicalEffect"
  ) {
    return true;
  }
  const { target, checkedOccurrence } = hole.spellcastingAbilityCheck;
  if (checkedOccurrence === undefined) return false;
  const owner = combatants.find(
    (combatant) => combatant.combatantId === checkedOccurrence.ownerId,
  );
  if (owner === undefined) return false;
  return Match.value(checkedOccurrence.effect).pipe(
    Match.discriminatorsExhaustive("kind")({
      spellLightEmitter: ({ effectRef }) =>
        storedLightEmitters.some(
          (emitter) =>
            emitter.kind === "spellLightEmitter" &&
            emitter.effectRef === effectRef &&
            battleEffectExecutionRefBelongsToScope(
              emitter.effectRef,
              owner.origin.execution.scopeRef,
            ) &&
            Match.value(target).pipe(
              Match.discriminatorsExhaustive("kind")({
                combatant: ({ combatantId }) =>
                  emitter.attachment.kind === "combatant" &&
                  emitter.attachment.combatantId === combatantId,
                object: ({ objectId }) =>
                  emitter.attachment.kind === "object" &&
                  emitter.attachment.objectId === objectId,
              }),
            ),
        ),
      spellActiveEffect: ({ effectRef, activeEffectKind }) =>
        target.kind === "object" &&
        activeEffectKind === "spellObjectContactDamage" &&
        owner.activeEffectOccurrences.some(
          (occurrence) =>
            occurrence.kind === "activeEffect" &&
            occurrence.effectRef === effectRef &&
            occurrence.activeEffectKind === activeEffectKind &&
            occurrence.location.kind === "object" &&
            occurrence.location.objectId === target.objectId,
        ),
    }),
  );
}

function serializedActiveEffectLocationMatchesExpectation(
  actual: Schema.Schema.Type<typeof BattleActiveEffectOccurrenceLocationSchema>,
  expected: SerializedActiveEffectLocationExpectation,
): boolean {
  return Match.value(expected).pipe(
    Match.discriminatorsExhaustive("kind")({
      identityOnly: () => true,
      nonSpatial: () => actual.kind === "nonSpatial",
      area: ({ areaId }) => actual.kind === "area" && actual.areaId === areaId,
      line: ({ areaId, directionId }) =>
        actual.kind === "line" &&
        actual.areaId === areaId &&
        actual.directionId === directionId,
      object: ({ objectId }) =>
        actual.kind === "object" && actual.objectId === objectId,
    }),
  );
}

function serializedActiveEffectMatchesExpectation(
  occurrence: EncodedBattleCreatureSnapshot["activeEffectOccurrences"][number],
  reference: Extract<
    SerializedExecutionReferenceOwnership,
    { readonly kind: "effectOccurrence" }
  >,
  expectation: Extract<
    SerializedEffectOccurrenceExpectation,
    { readonly kind: "activeEffect" }
  >,
): boolean {
  return (
    occurrence.effectRef === reference.ref &&
    expectation.activeEffectKinds.some(
      (activeEffectKind) => activeEffectKind === occurrence.activeEffectKind,
    ) &&
    serializedActiveEffectLocationMatchesExpectation(
      occurrence.location,
      expectation.location,
    )
  );
}

function serializedEffectOccurrenceReferenceIsOwned(
  reference: Extract<
    SerializedExecutionReferenceOwnership,
    { readonly kind: "effectOccurrence" }
  >,
  combatants: readonly EncodedBattleCreatureSnapshot[],
  storedLightEmitters: readonly EncodedBattleStoredLightEmitter[],
): boolean {
  const eligibleOwners =
    reference.ownerId === undefined
      ? combatants
      : combatants.filter(
          (combatant) => combatant.combatantId === reference.ownerId,
        );
  return Match.value(reference.expectation).pipe(
    Match.discriminatorsExhaustive("kind")({
      activeEffect: (expectation) =>
        eligibleOwners.some((combatant) =>
          combatant.activeEffectOccurrences.some((occurrence) =>
            serializedActiveEffectMatchesExpectation(
              occurrence,
              reference,
              expectation,
            ),
          ),
        ),
      storedLightEmitter: () =>
        eligibleOwners.some((combatant) =>
          storedLightEmitters.some(
            (emitter) =>
              emitter.effectRef === reference.ref &&
              battleEffectExecutionRefBelongsToScope(
                emitter.effectRef,
                combatant.origin.execution.scopeRef,
              ),
          ),
        ),
    }),
  );
}

function serializedSubjectProcedureReferenceIsExpected(
  reference: SerializedExecutionReferenceOwnership,
  expectedProcedureRefs: ReadonlySet<BattleProcedureExecutionRef> | undefined,
): boolean {
  return (
    reference.kind !== "subjectProcedure" ||
    expectedProcedureRefs === undefined ||
    expectedProcedureRefs.size === 0 ||
    expectedProcedureRefs.has(reference.ref)
  );
}

function serializedBattleHoleOwnsBoundExecutionReferences(input: {
  readonly hole: EncodedBattleHole;
  readonly combatants: readonly EncodedBattleCreatureSnapshot[];
  readonly storedLightEmitters: readonly EncodedBattleStoredLightEmitter[];
  readonly boundExecutionRefs: ReadonlySet<string>;
  readonly expectedProcedureRefs:
    | ReadonlySet<BattleProcedureExecutionRef>
    | undefined;
}): boolean {
  const {
    hole,
    combatants,
    storedLightEmitters,
    boundExecutionRefs,
    expectedProcedureRefs,
  } = input;
  if (
    !serializedSpellcastingAbilityCheckTargetMatchesOccurrence(
      hole,
      combatants,
      storedLightEmitters,
    )
  ) {
    return false;
  }
  return serializedBattleHoleExecutionReferences(hole).every((reference) => {
    if (!boundExecutionRefs.has(reference.ref)) return false;
    if (reference.kind === "effectOccurrence") {
      return serializedEffectOccurrenceReferenceIsOwned(
        reference,
        combatants,
        storedLightEmitters,
      );
    }
    if (
      !serializedSubjectProcedureReferenceIsExpected(
        reference,
        expectedProcedureRefs,
      )
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
  readonly storedLightEmitters: readonly EncodedBattleStoredLightEmitter[];
  readonly boundExecutionRefs: ReadonlySet<string>;
  readonly expectedProcedureRefs:
    | ReadonlySet<BattleProcedureExecutionRef>
    | undefined;
}): boolean {
  return input.holes.every((hole) =>
    serializedBattleHoleOwnsBoundExecutionReferences({
      hole,
      combatants: input.combatants,
      storedLightEmitters: input.storedLightEmitters,
      boundExecutionRefs: input.boundExecutionRefs,
      expectedProcedureRefs: input.expectedProcedureRefs,
    }),
  );
}

function serializedProtectionRelevantEffectHolesMatchSubject(
  subject: EncodedBattleSubject,
  holes: readonly EncodedBattleHole[],
): boolean {
  if (
    subject.tag !== "runtimeCommand" ||
    subject.command !== "protectionRelevantEffectSave"
  ) {
    return true;
  }
  return holes.every(
    (hole) =>
      hole.kind !== "savingThrowOutcome" ||
      !("protectionRelevantEffectSave" in hole) ||
      hole.protectionRelevantEffectSave.relevantEffect ===
        subject.relevantEffect,
  );
}

function serializedSubjectHolesMatchSelectedOccurrence(
  subject: EncodedBattleSubject,
  holes: readonly EncodedBattleHole[],
): boolean {
  if (!serializedProtectionRelevantEffectHolesMatchSubject(subject, holes)) {
    return false;
  }
  const selectedOccurrenceRefs = battleSubjectBoundExecutionReferences(
    subject,
  ).flatMap((reference) =>
    reference.kind === "activeEffectOccurrence" ||
    reference.kind === "activeEffect"
      ? [reference.effectRef]
      : [],
  );
  if (selectedOccurrenceRefs.length === 0) return true;
  const holeOccurrenceRefs = holes.flatMap((hole) =>
    serializedBattleHoleExecutionReferences(hole).flatMap((reference) =>
      reference.kind === "effectOccurrence" ? [reference.ref] : [],
    ),
  );
  const matches =
    selectedOccurrenceRefs.length === 1 &&
    (holeOccurrenceRefs.length > 0
      ? holeOccurrenceRefs.every(
          (effectRef) => effectRef === selectedOccurrenceRefs[0],
        )
      : holes.length === 0
        ? selectedOccurrenceSubjectRequiresNoOccurrenceHole(subject)
        : selectedOccurrenceSubjectAllowsReferenceFreeHoles(subject, holes));
  return matches;
}

function selectedOccurrenceSubjectAllowsReferenceFreeHoles(
  subject: EncodedBattleSubject,
  holes: readonly EncodedBattleHole[],
): boolean {
  return Match.value(subject).pipe(
    Match.when({ tag: "action", action: "escapeSpellRestraint" }, (escape) => {
      const key = escapeSpellRestraintAbilityCheckHoleKey(escape.effectRef);
      return (
        holes.length === 1 &&
        holes[0]?.kind === "abilityCheck" &&
        holes[0].holeId === holeId(key) &&
        holes[0].holeInstanceKey === holeInstanceKey(key)
      );
    }),
    Match.when(
      { tag: "runtimeCommand", command: "grantedAreaSaveDamageAction" },
      (exhale) => {
        const selectedHole = holes[0];
        if (
          holes.length !== 1 ||
          selectedHole === undefined ||
          !("grantedAreaSaveDamageAction" in selectedHole)
        ) {
          return false;
        }
        const suffix = Match.value(selectedHole).pipe(
          Match.when(
            { kind: "savingThrowOutcome" },
            () => "saving-throw-outcome",
          ),
          Match.when(
            { kind: "rolledDice" },
            (rolled) =>
              `damage-result:${rolled.grantedAreaSaveDamageAction.expr.dice}d${rolled.grantedAreaSaveDamageAction.expr.dieSize}`,
          ),
          Match.orElse(() => undefined),
        );
        if (suffix === undefined) return false;
        const key = grantedAreaSaveDamageActionHoleKey(
          exhale.effectRef,
          suffix,
        );
        return (
          selectedHole.holeId === holeId(key) &&
          selectedHole.holeInstanceKey === holeInstanceKey(key)
        );
      },
    ),
    Match.when(
      {
        tag: "runtimeCommand",
        command: "endPersistentAreaSaveDamageForEnvironment",
      },
      () => holes.length === 1 && holes[0]?.kind === "areaWindStrength",
    ),
    Match.orElse(() => false),
  );
}

function selectedOccurrenceSubjectRequiresNoOccurrenceHole(
  subject: EncodedBattleSubject,
): boolean {
  return Match.value(subject).pipe(
    Match.when(
      { tag: "bonusActionStandardAction" },
      (value) => value.sourceEffectRef !== undefined,
    ),
    Match.when({ tag: "runtimeCommand" }, (value) =>
      Match.value(value.command).pipe(
        Match.when(
          "endPersistentAreaSaveConditionEscapeForDeparture",
          () => true,
        ),
        Match.when(
          "endPersistentAreaSaveConditionEscapeForAreaRemoval",
          () => true,
        ),
        Match.when("persistentAreaSaveDamageExit", () => true),
        Match.when("linkedDefenseResistanceDamageShareSeparation", () => true),
        Match.orElse(() => false),
      ),
    ),
    Match.orElse(() => false),
  );
}

function serializedBattleSubjectOwnsBoundExecutionReferences(
  subject: EncodedBattleSubject,
  combatants: readonly EncodedBattleCreatureSnapshot[],
): boolean {
  return battleSubjectBoundExecutionReferences(subject).every((reference) => {
    return Match.value(reference).pipe(
      Match.discriminatorsExhaustive("kind")({
        activeEffect: ({ ownerId, effectRef }) =>
          combatants
            .find((combatant) => combatant.combatantId === ownerId)
            ?.activeEffectOccurrences.some(
              (occurrence) =>
                occurrence.kind === "activeEffect" &&
                occurrence.effectRef === effectRef &&
                serializedBattleSubjectMatchesActiveEffectOccurrence(
                  subject,
                  occurrence,
                ),
            ) === true,
        activeEffectOccurrence: ({ effectRef }) =>
          combatants.some((combatant) =>
            combatant.activeEffectOccurrences.some(
              (occurrence) =>
                occurrence.kind === "activeEffect" &&
                occurrence.effectRef === effectRef &&
                serializedBattleSubjectMatchesActiveEffectOccurrence(
                  subject,
                  occurrence,
                ),
            ),
          ),
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
    );
  });
}

function serializedBattleSubjectMatchesActiveEffectOccurrence(
  subject: EncodedBattleSubject,
  occurrence: EncodedBattleCreatureSnapshot["activeEffectOccurrences"][number],
): boolean {
  if (subject.tag !== "runtimeCommand") return true;
  return Match.value(subject).pipe(
    Match.when({ command: "persistentAreaSaveConditionSave" }, ({ areaId }) =>
      serializedActiveEffectMatchesSubjectLocation(
        occurrence,
        "persistentAreaSaveCondition",
        { kind: "area", areaId },
      ),
    ),
    Match.when(
      { command: "persistentAreaSaveConditionEscapeSave" },
      ({ areaId }) =>
        serializedActiveEffectMatchesSubjectLocation(
          occurrence,
          "persistentAreaSaveConditionEscape",
          { kind: "area", areaId },
        ),
    ),
    Match.when(
      { command: "persistentAreaSaveCompositeSave" },
      ({ areaMembershipTrigger }) =>
        serializedActiveEffectMatchesSubjectLocation(
          occurrence,
          "persistentAreaSaveComposite",
          { kind: "area", areaId: areaMembershipTrigger.areaId },
        ),
    ),
    Match.when(
      { command: "persistentAreaSaveDamageSave" },
      ({ areaMembershipTrigger }) =>
        serializedActiveEffectMatchesSubjectLocation(
          occurrence,
          "persistentAreaSaveDamage",
          { kind: "area", areaId: areaMembershipTrigger.areaId },
        ),
    ),
    Match.whenOr(
      { command: "directionalPersistentAreaSave" },
      { command: "directionalPersistentAreaDirectionChange" },
      ({ areaId, directionId }) =>
        serializedActiveEffectMatchesSubjectLocation(
          occurrence,
          "directionalPersistentArea",
          { kind: "line", areaId, directionId },
        ),
    ),
    Match.when({ command: "movableZoneSave" }, ({ areaId }) =>
      serializedActiveEffectMatchesSubjectLocation(
        occurrence,
        "persistentAreaSaveDamage",
        { kind: "area", areaId },
      ),
    ),
    Match.when({ command: "persistentAreaSaveDamageExit" }, ({ areaId }) =>
      serializedActiveEffectMatchesSubjectLocation(
        occurrence,
        "persistentAreaSaveDamage",
        { kind: "area", areaId },
      ),
    ),
    Match.when(
      { command: "movableZoneReposition" },
      ({ areaId }) =>
        occurrence.activeEffectKind === "persistentAreaSaveDamage" &&
        serializedActiveEffectLocationMatchesExpectation(occurrence.location, {
          kind: "area",
          areaId,
        }),
    ),
    Match.when({ command: "movableZoneRam" }, ({ areaId }) =>
      serializedActiveEffectMatchesSubjectLocation(
        occurrence,
        "persistentAreaSaveDamage",
        { kind: "area", areaId },
      ),
    ),
    Match.when({ command: "fixedCostMovementReplacement" }, () =>
      serializedActiveEffectMatchesSubjectLocation(
        occurrence,
        "fixedCostMovementReplacement",
        { kind: "nonSpatial" },
      ),
    ),
    Match.when({ command: "controlledVerticalSuspensionAltitudeControl" }, () =>
      serializedActiveEffectMatchesSubjectLocation(
        occurrence,
        "controlledVerticalSuspension",
        { kind: "nonSpatial" },
      ),
    ),
    Match.orElse(() => true),
  );
}

function serializedActiveEffectMatchesSubjectLocation(
  occurrence: EncodedBattleCreatureSnapshot["activeEffectOccurrences"][number],
  activeEffectKind: SerializedActiveEffectKind,
  location: SerializedActiveEffectLocationExpectation,
): boolean {
  return (
    occurrence.activeEffectKind === activeEffectKind &&
    serializedActiveEffectLocationMatchesExpectation(
      occurrence.location,
      location,
    )
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
      spawnedCompanionSharedSenses: actorOwnsProcedureRefs,
      spawnedCompanionTouchSpellProxy: actorOwnsProcedureRefs,
      monkFocusFlurryOfBlowsStrike: (strike) =>
        serializedMonkFocusStrikeOwnsBoundProcedures(strike, combatants),
      monkFocusOption: actorOwnsProcedureRefs,
      companionAttack: (attack) =>
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

function serializedInterruptChoiceOwnsBoundProcedure(input: {
  readonly choice: EncodedBattleInterruptProcedureChoice;
  readonly combatants: readonly EncodedBattleCreatureSnapshot[];
  readonly readiedSpells: readonly EncodedBattleReadiedSpellSnapshot[];
  readonly readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[];
}): boolean {
  const { choice, combatants, readiedSpells, readiedResponses } = input;
  const subjectChoiceOwnsBoundProcedure = (
    subjectChoice: EncodedBattleSubjectInterruptProcedureChoice,
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
      castAttackHitBonusActionSpell: subjectChoiceOwnsBoundProcedure,
      castTriggeredReactionSpell: subjectChoiceOwnsBoundProcedure,
      opportunityAttack: subjectChoiceOwnsBoundProcedure,
      reactionRollOrDamageReduction: (reaction) =>
        serializedReactionReductionChoiceOwnsBoundProcedure(
          reaction,
          combatants,
        ),
      releaseReadiedAction: subjectChoiceOwnsBoundProcedure,
      releaseReadiedAttack: subjectChoiceOwnsBoundProcedure,
      releaseReadiedMovement: subjectChoiceOwnsBoundProcedure,
      releaseReadiedSpell: subjectChoiceOwnsBoundProcedure,
      retaliationAttack: subjectChoiceOwnsBoundProcedure,
    }),
  );
}

function serializedReactionReductionChoiceOwnsBoundProcedure(
  choice: Extract<
    EncodedBattleInterruptProcedureChoice,
    { readonly kind: "reactionRollOrDamageReduction" }
  >,
  combatants: readonly EncodedBattleCreatureSnapshot[],
): boolean {
  const reactor = combatants.find(
    (combatant) => combatant.combatantId === choice.reactorId,
  );
  if (reactor?.origin.kind !== "character") return false;
  const binding = reactor.origin.execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === choice.choice.procedureRef,
  );
  return (
    binding !== undefined &&
    (binding.procedure.kind === "unitFeature" ||
      binding.procedure.kind === "unitSupportProfile") &&
    (typeof binding.procedure.execution === "string"
      ? binding.procedure.execution
      : binding.procedure.execution.kind) ===
      REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE
  );
}

type EncodedBattleSubjectInterruptProcedureChoice = Exclude<
  EncodedBattleInterruptProcedureChoice,
  { readonly kind: "reactionRollOrDamageReduction" }
>;

function serializedReadiedInterruptChoiceOwnsResponse(
  choice: EncodedBattleSubjectInterruptProcedureChoice,
  readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[],
): boolean {
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      castAttackHitBonusActionSpell: () => true,
      castTriggeredReactionSpell: () => true,
      opportunityAttack: () => true,
      releaseReadiedAction: (release) =>
        serializedReadiedActionChoiceOwnsResponse(release, readiedResponses),
      releaseReadiedAttack: () => true,
      releaseReadiedMovement: (release) =>
        serializedReadiedMovementChoiceOwnsResponse(release, readiedResponses),
      releaseReadiedSpell: () => true,
      retaliationAttack: () => true,
    }),
  );
}

function serializedReadiedMovementChoiceOwnsResponse(
  choice: Extract<
    EncodedBattleInterruptProcedureChoice,
    { readonly kind: "releaseReadiedMovement" }
  >,
  readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[],
): boolean {
  return readiedResponses.some(
    (readied) =>
      readied.actorId === choice.readiedMovementActorId &&
      readied.response.kind === "movement",
  );
}

function serializedReadiedActionChoiceOwnsResponse(
  choice: Extract<
    EncodedBattleInterruptProcedureChoice,
    { readonly kind: "releaseReadiedAction" }
  >,
  readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[],
): boolean {
  return (
    choice.subject.tag === "runtimeCommand" &&
    choice.subject.command === "releaseReadiedAction" &&
    choice.subject.reactorId === choice.reactorId &&
    readiedResponses.some(
      (readied) =>
        readied.actorId === choice.reactorId &&
        readied.response.kind === "action",
    )
  );
}

const BattleSnapshotCommonFields = {
  battleId: BattleId,
  round: Schema.Number,
  currentActorId: CombatantId,
  turnOrder: Schema.Array(CombatantId),
  companions: Schema.Array(BattleCompanionSnapshotSchema),
  storedLightEmitters: Schema.Array(BattleStoredLightEmitterSchema),
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
  executionScopeCursors: Schema.optionalKey(Schema.Never),
  retiredExecutionScopeAllocations: Schema.optionalKey(Schema.Never),
  acts: Schema.optionalKey(Schema.Never),
  pendingInterrupt: Schema.optionalKey(Schema.Never),
};

const BattleSnapshotInvariantShapeSchema = Schema.Struct({
  ...BattleSnapshotCommonFields,
  combatants: Schema.Array(BattleCreatureSnapshotInvariantShapeSchema),
});

type BattleSnapshotInvariantInput = Schema.Schema.Type<
  typeof BattleSnapshotInvariantShapeSchema
>;

function battleSnapshotInvariantsHold(
  snapshot: BattleSnapshotInvariantInput,
): boolean {
  const liveCombatantIds = new Set(
    snapshot.combatants.map((combatant) => combatant.combatantId),
  );
  return (
    battleSnapshotLiveCombatantIdsAreUnique(snapshot, liveCombatantIds) &&
    serializedBattleExecutionIdentityGraphIsValid(snapshot) &&
    snapshot.readiedResponses.spells.every((readied) =>
      serializedReadiedSpellOwnsInvocation(snapshot.combatants, readied),
    ) &&
    snapshot.readiedResponses.actionsOrMovements.every((readied) =>
      serializedReadiedResponseIsBound(snapshot.combatants, readied),
    ) &&
    snapshot.storedLightEmitters.every((emitter) => {
      const owners = snapshot.combatants.filter((combatant) =>
        battleEffectExecutionRefBelongsToScope(
          emitter.effectRef,
          combatant.origin.execution.scopeRef,
        ),
      );
      return (
        owners.length === 1 &&
        battleEffectExecutionRefOrdinalIsBefore(
          emitter.effectRef,
          owners[0]!.origin.execution.scopeRef,
          owners[0]!.nextEffectOrdinal,
        ) &&
        serializedLightEmitterOwnsSource(emitter, snapshot.combatants)
      );
    }) &&
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

function serializedBattleExecutionIdentityGraphIsValid(
  snapshot: BattleSnapshotInvariantInput,
): boolean {
  const executionScopeRefs = snapshot.combatants.flatMap(
    battleSnapshotExecutionScopeRefs,
  );
  const effectOccurrenceRefs = [
    ...snapshot.combatants.flatMap((combatant) =>
      combatant.activeEffectOccurrences.map(({ effectRef }) => effectRef),
    ),
    ...snapshot.storedLightEmitters.map(({ effectRef }) => effectRef),
  ];
  return (
    new Set(effectOccurrenceRefs).size === effectOccurrenceRefs.length &&
    serializedEffectOccurrenceSourceBindingsMatch(snapshot.combatants) &&
    new Set(executionScopeRefs).size === executionScopeRefs.length
  );
}

function serializedEffectOccurrenceSourceBindingsMatch(
  combatants: readonly EncodedBattleCreatureSnapshot[],
): boolean {
  const activeEffectKindByRef = new Map(
    combatants.flatMap((combatant) =>
      combatant.activeEffectOccurrences.map(
        (occurrence) =>
          [occurrence.effectRef, occurrence.activeEffectKind] as const,
      ),
    ),
  );
  const sourceBindings = combatants.flatMap((combatant) => {
    const procedureBindings =
      combatant.origin.kind === "statBlock"
        ? combatant.origin.execution.procedureBindings
        : [
            ...combatant.origin.execution.procedureBindings,
            ...combatant.origin.druidWildShapeAvailableForms.flatMap(
              (form) => form.execution.procedureBindings,
            ),
          ];
    return procedureBindings.flatMap((binding) =>
      binding.procedure.kind === "effectOccurrenceSource"
        ? [binding.procedure]
        : [],
    );
  });
  return (
    new Set(sourceBindings.map((binding) => binding.effectRef)).size ===
      sourceBindings.length &&
    sourceBindings.every((binding) => {
      const activeEffectKind = activeEffectKindByRef.get(binding.effectRef);
      return (
        activeEffectKind === undefined ||
        activeEffectKind === binding.effectKind
      );
    })
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
  message:
    "Battle combatants, execution scopes, and scope cursors must be unique, battle-owned, and monotonic.",
};

export const BattlePresentedSnapshotSchema = Schema.Struct({
  ...BattleSnapshotCommonFields,
  ...BattleSnapshotExcludedFields,
  combatants: Schema.Array(BattlePresentedCreatureSnapshotSchema),
}).pipe(
  Schema.check(
    Schema.makeFilter(
      (snapshot) =>
        Schema.is(BattleSnapshotInvariantShapeSchema)(snapshot) &&
        battleSnapshotInvariantsHold(snapshot),
      battleSnapshotInvariantAnnotations,
    ),
  ),
  Schema.annotate({ identifier: "BattlePresentedSnapshot" }),
);

export const BattleSnapshotSchema = Schema.Struct({
  ...BattleSnapshotCommonFields,
  ...BattleSnapshotExcludedFields,
  combatants: Schema.Array(BattleCreatureSnapshotSchema),
}).pipe(
  Schema.check(
    Schema.makeFilter(
      (snapshot) =>
        Schema.is(BattleSnapshotInvariantShapeSchema)(snapshot) &&
        battleSnapshotInvariantsHold(snapshot),
      battleSnapshotInvariantAnnotations,
    ),
  ),
  Schema.annotate({ identifier: "BattleSnapshot" }),
);

export const BattleActDiscoveryCandidateSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  initialHoles: Schema.Array(BattleHoleSchema),
});

function battleActExecutionCandidateInvariantHolds(
  act: EncodedBattleActDiscoveryCandidate,
): boolean {
  const subject = act.subject;
  if (
    subject.tag !== "runtimeCommand" ||
    subject.command !== "controlledVerticalSuspensionAltitudeControl"
  ) {
    return true;
  }
  const altitudeHole = act.initialHoles[0];
  return (
    act.initialHoles.length === 1 &&
    altitudeHole?.kind === "controlledVerticalSuspensionAltitudeChange" &&
    altitudeHole.effectRef === subject.effectRef &&
    altitudeHole.actorId === subject.actorId &&
    altitudeHole.targetId === subject.targetId
  );
}

const BattleInterruptDecisionHoleSchema = Schema.Struct({
  holeInstanceKey: BattleHoleInstanceKeySchema,
  holeId: BattleHoleIdSchema,
  kind: Schema.Literal("interruptDecision"),
  label: Schema.String,
  trigger: Schema.Literals(BATTLE_INTERRUPT_TRIGGERS),
  eligibleResponders: Schema.Array(CombatantId),
});

export const BattleInterruptDecisionFrontierSchema = Schema.Struct({
  kind: Schema.Literal("interruptDecision"),
  trigger: Schema.Literals(BATTLE_INTERRUPT_TRIGGERS),
  decisionHole: BattleInterruptDecisionHoleSchema,
  choices: Schema.NonEmptyArray(BattleInterruptProcedureChoiceSchema),
  stackDepth: BattleReplayStackDepth,
});

export const BattleCheckpointFrontierHolesSchema = Schema.Struct({
  kind: Schema.Literal("holes"),
  subject: BattleSubjectSchema,
  holes: Schema.NonEmptyArray(BattleHoleSchema),
  continuation: Schema.Union([
    Schema.Struct({ kind: Schema.Literal("ordinaryReplay") }),
    Schema.Struct({ kind: Schema.Literal("runtimeOwnedInterrupt") }),
  ]),
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
  const runtimeCommandSubject = (
    subjectChoice: EncodedBattleSubjectInterruptProcedureChoice,
  ): EncodedRuntimeCommandBattleSubject | undefined =>
    subjectChoice.subject.tag === "runtimeCommand"
      ? subjectChoice.subject
      : undefined;
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      castAttackHitBonusActionSpell: runtimeCommandSubject,
      castTriggeredReactionSpell: runtimeCommandSubject,
      opportunityAttack: runtimeCommandSubject,
      reactionRollOrDamageReduction: () => undefined,
      releaseReadiedAction: runtimeCommandSubject,
      releaseReadiedAttack: runtimeCommandSubject,
      releaseReadiedMovement: runtimeCommandSubject,
      releaseReadiedSpell: runtimeCommandSubject,
      retaliationAttack: runtimeCommandSubject,
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
      castAttackHitBonusActionSpell: () => trigger === "attackHit",
      castTriggeredReactionSpell: () =>
        trigger === "attackHit" ||
        trigger === "spellCast" ||
        trigger === "afterDamage" ||
        trigger === "creatureFalls",
      opportunityAttack: () => trigger === "opportunityAttack",
      reactionRollOrDamageReduction: ({ choice: modifier }) =>
        Match.value(modifier.kind).pipe(
          Match.when("abilityCheckReduction", () => false),
          Match.when("attackDamageReduction", () => trigger === "attackHit"),
          Match.when("attackRollReduction", () => trigger === "attackHit"),
          Match.when("damageRollReduction", () => trigger === "attackDamage"),
          Match.when("fallDamageReduction", () => trigger === "creatureFalls"),
          Match.exhaustive,
        ),
      releaseReadiedAction: () => trigger === "reportedReadyTrigger",
      releaseReadiedAttack: () => trigger === "reportedReadyTrigger",
      releaseReadiedMovement: () => trigger === "reportedReadyTrigger",
      releaseReadiedSpell: (release) =>
        serializedReadiedSpellChoiceMatchesTrigger(
          release,
          trigger,
          readiedSpells,
        ),
      retaliationAttack: () => trigger === "afterDamage",
    }),
  );
}

function serializedReadiedSpellChoiceMatchesTrigger(
  choice: Extract<
    EncodedBattleInterruptProcedureChoice,
    { readonly kind: "releaseReadiedSpell" }
  >,
  trigger: (typeof BATTLE_INTERRUPT_TRIGGERS)[number],
  readiedSpells: readonly EncodedBattleReadiedSpellSnapshot[],
): boolean {
  const subject = choice.subject;
  if (
    subject.tag !== "runtimeCommand" ||
    subject.command !== "releaseReadiedSpell"
  ) {
    return false;
  }
  return readiedSpells.some(
    (readied) =>
      readied.casterId === choice.readiedSpellCasterId &&
      readied.procedureRef === subject.procedureRef &&
      readied.trigger === trigger,
  );
}

function serializedInterruptChoiceExpectedProcedureRefs(
  choice: EncodedBattleInterruptProcedureChoice,
): ReadonlySet<BattleProcedureExecutionRef> {
  const subjectProcedureRefs = (
    subjectChoice: EncodedBattleSubjectInterruptProcedureChoice,
  ): ReadonlySet<BattleProcedureExecutionRef> =>
    new Set(battleSubjectProcedureRefs(subjectChoice.subject));
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      castAttackHitBonusActionSpell: subjectProcedureRefs,
      castTriggeredReactionSpell: subjectProcedureRefs,
      opportunityAttack: subjectProcedureRefs,
      reactionRollOrDamageReduction: (reaction) =>
        new Set([reaction.choice.procedureRef]),
      releaseReadiedAction: subjectProcedureRefs,
      releaseReadiedAttack: subjectProcedureRefs,
      releaseReadiedMovement: subjectProcedureRefs,
      releaseReadiedSpell: subjectProcedureRefs,
      retaliationAttack: subjectProcedureRefs,
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
  readonly subjectHolesMatchSelectedOccurrence: (
    subject: EncodedBattleSubject,
    holes: readonly EncodedBattleHole[],
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
    (subject === undefined ||
      input.subjectHolesMatchSelectedOccurrence(
        subject,
        choice.initialHoles,
      )) &&
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
  const boundExecutionRefs = new Set([
    ...checkpoint.combatants.flatMap(
      serializedCombatantAuthoritativeExecutionReferences,
    ),
    ...checkpoint.storedLightEmitters.map((emitter) => emitter.effectRef),
  ]);
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
      storedLightEmitters: checkpoint.storedLightEmitters,
      boundExecutionRefs,
      expectedProcedureRefs,
    });

  return Match.value(frontier).pipe(
    Match.discriminatorsExhaustive("kind")({
      acts: (value) =>
        value.acts.every(
          (act) =>
            subjectIsBound(act.subject) &&
            battleActExecutionCandidateInvariantHolds(act) &&
            serializedSubjectHolesMatchSelectedOccurrence(
              act.subject,
              act.initialHoles,
            ) &&
            holesAreBound(
              act.initialHoles,
              new Set(battleSubjectProcedureRefs(act.subject)),
            ),
        ),
      holes: (value) =>
        subjectIsBound(value.subject) &&
        serializedSubjectHolesMatchSelectedOccurrence(
          value.subject,
          value.holes,
        ) &&
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
            subjectHolesMatchSelectedOccurrence:
              serializedSubjectHolesMatchSelectedOccurrence,
          }),
        ),
    }),
  );
}

export const BattleCheckpointFrontierEnvelopeSchema = Schema.Struct({
  checkpoint: BattleSnapshotSchema,
  frontier: Schema.Union([
    Schema.Struct({
      kind: Schema.Literal("acts"),
      acts: Schema.Array(BattleActDiscoveryCandidateSchema),
    }),
    BattleCheckpointFrontierHolesSchema,
    BattleInterruptDecisionFrontierSchema,
  ]),
}).pipe(
  Schema.check(
    Schema.makeFilter(battleCheckpointFrontierInvariantsHold, {
      message:
        "Battle checkpoint frontier references must be bound to the checkpoint and its subjects.",
    }),
  ),
  Schema.annotate({ identifier: "BattleCheckpointFrontierEnvelope" }),
);
// KERNEL-COVERAGE: runtime-owner BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE
