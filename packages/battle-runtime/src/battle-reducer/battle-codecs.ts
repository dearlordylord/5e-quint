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
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  CUNNING_STRIKE_END_TURN_COVER_DEGREES,
  DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE,
  MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
} from "../unit-feature-support.ts";
import { Match, Schema, Tuple } from "effect";
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
  ReadyTriggerDescription,
  SpellInvocationRefSchema,
} from "../battle-subjects.ts";
import {
  BattleAreaId,
  BattleActiveEffectExecutionRef,
  BattleActiveEffectExecutionOrdinal,
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
  BattleProcedureExecutionCursor,
  BattleExecutionScopeCursor,
  battleProcedureExecutionRefBelongsToScope,
  battleProcedureExecutionRefOrdinalIsBefore,
  battleActiveEffectExecutionRefOrdinalIsBefore,
  battleCharacterExecutionScopeRefBelongsToBattle,
  battleCharacterExecutionScopeRefBelongsToCombatant,
  battleCharacterExecutionScopeRefOrdinalIsBefore,
  battleAttackExecutionScopeRefBelongsToBattle,
  battleAttackExecutionScopeRefBelongsToCombatant,
  battleAttackExecutionScopeRefOrdinalIsBefore,
  battleResourcePoolExecutionRefBelongsToScope,
  battleStatBlockExecutionScopeRefBelongsToBattle,
  battleStatBlockExecutionScopeRefBelongsToCombatant,
  battleStatBlockExecutionScopeRefIsWellFormed,
  battleStatBlockExecutionScopeRefOrdinalIsBefore,
  BattleSpellEffectOccurrenceId,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";
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
  type BattleMovementFillValue,
} from "../battle-state-execution.ts";
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
const FindFamiliarCreatureTypeOverrideSchema = Schema.Literals([
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

const BattleDancingLightCastPlacementSchema = Schema.Struct({
  positionId: BattleTablePositionId,
  distanceFromCasterFeet: MovementFeet,
  nearestSiblingDistanceFeet: Schema.optionalKey(MovementFeet),
});
const BattleDancingLightRepositionPlacementSchema = Schema.Struct({
  positionId: BattleTablePositionId,
  distanceFromCasterFeet: MovementFeet,
  nearestSiblingDistanceFeet: Schema.optionalKey(MovementFeet),
  lightId: BattleDancingLightId,
  moveDistanceFeet: MovementFeet,
});
const BattleDancingLightsPlacementValueSchema = Schema.Union([
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
]);

const BattleSleepNonSleeperFactSchema = Schema.Struct({
  kind: Schema.Literal("doesNotSleep"),
  targetId: CombatantId,
});
const BattleThunderwavePushDispositionSchema = Schema.Union([
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
const BattleGustOfWindLinePushDispositionSchema =
  BattleThunderwavePushDispositionSchema;

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
    sleepNonSleeperFacts: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.optionalKey(Schema.Never),
    areaId: Schema.optionalKey(Schema.Never),
    sleepNonSleeperFacts: Schema.NonEmptyArray(BattleSleepNonSleeperFactSchema),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("faerieFireArea"),
    affectedObjectIds: Schema.Array(BattleObjectId),
    areaId: Schema.optionalKey(Schema.Never),
    sleepNonSleeperFacts: Schema.optionalKey(Schema.Never),
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
    areaId: Schema.optionalKey(Schema.Never),
    sleepNonSleeperFacts: Schema.optionalKey(Schema.Never),
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
    areaId: Schema.optionalKey(Schema.Never),
    sleepNonSleeperFacts: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("greaseGroundArea"),
    areaId: BattleAreaId,
    sleepNonSleeperFacts: Schema.optionalKey(Schema.Never),
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
    sleepNonSleeperFacts: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    ...BattleSpellAreaChoiceBaseSchema,
    kind: Schema.Literal("fireballArea"),
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
    sleepNonSleeperFacts: Schema.optionalKey(Schema.Never),
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
    areaId: Schema.optionalKey(Schema.Never),
    sleepNonSleeperFacts: Schema.optionalKey(Schema.Never),
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
    areaId: Schema.optionalKey(Schema.Never),
    sleepNonSleeperFacts: Schema.optionalKey(Schema.Never),
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
      disposition: BattleThunderwavePushDispositionSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("weaponMasteryPushDisposition"),
      attackerId: CombatantId,
      targetId: CombatantId,
      procedureRef: BattleStatBlockProcedureExecutionRef,
      attackAbility: Schema.optionalKey(Schema.Never),
      attackDamageType: Schema.optionalKey(Schema.Never),
      attackName: Schema.optionalKey(Schema.Never),
      disposition: BattleThunderwavePushDispositionSchema,
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
    kind: Schema.Literal("attackAttackerPerceivesBlurredTargetWithSense"),
    attackerId: CombatantId,
    targetId: CombatantId,
    sense: Schema.Literals(BLUR_ATTACK_ROLL_BYPASS_SENSES),
  }),
  Schema.Struct({
    kind: Schema.Literal("attackAttackerUnaffectedByMirrorImageWithSense"),
    attackerId: CombatantId,
    targetId: CombatantId,
    sense: Schema.Literals(MIRROR_IMAGE_UNAFFECTED_SENSES),
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
    kind: Schema.Literal("dancingLight"),
    lightId: BattleDancingLightId,
    positionId: BattleTablePositionId,
    form: Schema.Literals(["separateLights", "combinedMediumForm"]),
  }),
]);

const BattleOngoingSpellEffectRefSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("spellLightEmitter"),
    sourceEffectId: BattleSpellEffectOccurrenceId,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellActiveEffect"),
    activeEffectKind: Schema.Literals([
      "spellObjectContactDamage",
      "spiritualWeapon",
    ]),
    effectRef: BattleActiveEffectExecutionRef,
  }),
  Schema.Struct({
    kind: Schema.Literal("antimagicFieldAura"),
    areaId: BattleAreaId,
    sourceCombatantId: CombatantId,
  }),
]);
const BattleAntimagicFieldOngoingSpellEffectRefSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("spellLightEmitter"),
    sourceEffectId: BattleSpellEffectOccurrenceId,
  }),
  Schema.Struct({
    kind: Schema.Literal("spellActiveEffect"),
    activeEffectKind: Schema.Literals([
      "spellObjectContactDamage",
      "spiritualWeapon",
    ]),
    effectRef: BattleActiveEffectExecutionRef,
  }),
]);

const BattleOngoingSpellTargetSchema = Schema.Union([
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
    wardingBondSeparation: Schema.Struct({
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
    kind: Schema.Literal("findFamiliarConnection"),
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
    kind: Schema.Literal("magicWeaponTargetItem"),
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
    dragonsBreath: Schema.Struct({
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
      sourceEffectId: BattleSpellEffectOccurrenceId,
      damage: Schema.Struct({
        expr: DiceExprSchema,
      }),
    }),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    mirrorImageDuplicateRoll: Schema.Struct({
      targetId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      sourceCombatantId: CombatantId,
      remainingDuplicates: Schema.Literals(MIRROR_IMAGE_DUPLICATE_COUNTS),
      dieSize: Schema.Literal(MIRROR_IMAGE_DUPLICATE_DIE_SIZE),
      successAtLeast: Schema.Literal(MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST),
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    insectPlagueAreaHazard: Schema.Struct({
      ...BattleProcedureSourceSchema,
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
    cloudkillAreaHazard: Schema.Struct({
      ...BattleProcedureSourceSchema,
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
    kind: Schema.Literal("thaumaturgyActiveOneMinuteEffectCount"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
    maximumActiveOneMinuteEffects: Schema.Literal(
      THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS,
    ),
    requiresTableSpellEffectCount: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("commandOptionChoice"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
    choices: Schema.Array(Schema.Literals(COMMAND_OPTIONS)),
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
    kind: Schema.Literal("dancingLightsPlacement"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
    mode: Schema.Literals(["cast", "reposition"]),
    form: Schema.Literals(["separateLights", "combinedMediumForm"]),
    activeLightIds: Schema.Array(BattleDancingLightId),
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
    kind: Schema.Literal("spiritualWeaponForcePosition"),
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
    hideousLaughterRepeatSave: Schema.Struct({
      targetId: CombatantId,
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
    areaChoices: Schema.Tuple([]),
    targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
    targetFlatBonuses: Schema.Array(BattleSavingThrowFlatBonusProjectionSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    greaseGroundHazard: Schema.Struct({
      ...BattleProcedureSourceSchema,
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
    webRestraint: Schema.Struct({
      ...BattleProcedureSourceSchema,
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
    sleetStormAreaHazard: Schema.Struct({
      ...BattleProcedureSourceSchema,
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
    insectPlagueAreaHazard: Schema.Struct({
      ...BattleProcedureSourceSchema,
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
    cloudkillAreaHazard: Schema.Struct({
      ...BattleProcedureSourceSchema,
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
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("gustOfWindLineDirectionChoice"),
    label: Schema.String,
    sourceCombatantId: CombatantId,
    sourceProcedureRef: BattleProcedureExecutionRef,
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
      areaId: BattleAreaId,
      maxMoveFeet: MovementFeet,
    }),
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    protectionRelevantEffectSave: Schema.Struct({
      ...BattleProcedureSourceSchema,
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
    dragonsBreath: Schema.Struct({
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
      sourceEffectId: BattleSpellEffectOccurrenceId,
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
    kind: Schema.Literal("levitateAltitudeChange"),
    label: Schema.String,
    actorId: CombatantId,
    targetId: CombatantId,
    maxDistanceFeet: MovementFeet,
    directions: Schema.Array(Schema.Literals(["up", "down"])),
    requiresTargetWithinRangeFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("levitateInitialRise"),
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
    spellcastingAbilityCheck: Schema.Struct({
      casterId: CombatantId,
      sourceProcedureRef: BattleProcedureExecutionRef,
      target: BattleOngoingSpellTargetSchema,
      effect: BattleOngoingSpellEffectRefSchema,
      contestedSpellLevel: BattleSpellEffectLevel,
    }),
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
      kind: Schema.Literal("sanctuaryInterdictionOutcome"),
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
      kind: Schema.Literal("sanctuaryInterdictionOutcome"),
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
        readonly commandApproach?: {
          readonly kind: "commandApproachShortestDirectRouteTowardCaster";
          readonly movedWithinFiveFeetOfCaster: boolean;
        };
        readonly commandFlee?: {
          readonly kind: "commandFleeFastestAvailableRouteAwayFromCaster";
        };
        readonly brutalStrikeForcefulBlow?: {
          readonly kind: "brutalStrikeForcefulBlowStraightTowardTarget";
          readonly targetId: string;
        };
        readonly additionalSpeedSegments?: readonly BattleMovementFillValueCommonEncoded[];
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
      };
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
  speedKind: Schema.Literals(BATTLE_MOVEMENT_SPEED_KINDS),
  movementCostFeet: MovementFeet,
  provokedOpportunityAttacks: Schema.Array(
    Schema.Union([
      BattleInterruptAttackExecutionSelectionSchema.members[0].pipe(
        Schema.fieldsAssign({
          reactorId: CombatantId,
          distanceFeet: MovementFeet,
        }),
      ),
      BattleInterruptAttackExecutionSelectionSchema.members[1].mapMembers(
        Tuple.map(
          Schema.fieldsAssign({
            reactorId: CombatantId,
            distanceFeet: MovementFeet,
          }),
        ),
      ),
    ]),
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
        ]),
      ),
      totalDistanceFeet: MovementFeet,
      difficultTerrainDistanceFeet: MovementFeet,
    }),
  ),
  gustOfWindLineMovement: Schema.optionalKey(
    Schema.Struct({
      kind: Schema.Literal("gustOfWindLineMovement"),
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
            kind: Schema.Literal("featherFallTargetFallingWithinRange"),
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
              sourceKind: Schema.Literals(
                BATTLE_ANTIMAGIC_FIELD_ONGOING_SPELL_EFFECT_SOURCE_KINDS,
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
      ]),
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
      kind: Schema.Literal("thaumaturgyActiveOneMinuteEffectCount"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        activeOneMinuteEffectCount: Schema.Number.pipe(
          Schema.check(Schema.isInt()),
          Schema.check(Schema.isGreaterThanOrEqualTo(0)),
        ),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("commandOptionChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literals(COMMAND_OPTIONS),
    }),
    Schema.Struct({
      kind: Schema.Literal("selfTransformationModeChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literals(SELF_TRANSFORMATION_MODE_KINDS),
    }),
    Schema.Struct({
      kind: Schema.Literal("dancingLightsPlacement"),
      holeId: BattleHoleIdSchema,
      value: BattleDancingLightsPlacementValueSchema,
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
        commandApproach: Schema.optionalKey(
          Schema.Struct({
            kind: Schema.Literal(
              "commandApproachShortestDirectRouteTowardCaster",
            ),
            movedWithinFiveFeetOfCaster: Schema.Boolean,
          }),
        ),
        commandFlee: Schema.optionalKey(
          Schema.Struct({
            kind: Schema.Literal(
              "commandFleeFastestAvailableRouteAwayFromCaster",
            ),
          }),
        ),
        brutalStrikeForcefulBlow: Schema.optionalKey(
          BattleBrutalStrikeForcefulBlowMovementFactSchema,
        ),
        additionalSpeedSegments: Schema.optionalKey(
          Schema.Array(BattleMovementFillValueCommonSchema),
        ),
        jumpMovementReplacement: Schema.optionalKey(
          Schema.Struct({
            kind: Schema.Literal("jumpMovementReplacement"),
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
        levitatedMovement: Schema.optionalKey(
          Schema.Struct({
            kind: Schema.Literal("levitatedMovement"),
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
                value.jumpMovementReplacement === undefined &&
                value.levitatedMovement === undefined &&
                value.commandApproach === undefined &&
                value.commandFlee === undefined,
          {
            message:
              "Additional speed segments require Forceful Blow movement, which cannot carry a jump, levitation, or command movement protocol.",
          },
        ),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("levitateAltitudeChange"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        direction: Schema.Literals(["up", "down"]),
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
              disposition: BattleThunderwavePushDispositionSchema,
            }),
          ]),
        }),
      ]),
      relationshipFacts: Schema.optionalKey(
        BattleSavingThrowRelationshipFactsSchema,
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("sanctuaryInterdictionOutcome"),
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
    sourceEffectRef: BattleActiveEffectExecutionRef,
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
  bonusActionAvailable: Schema.Boolean,
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
    nextProcedureOrdinal: BattleProcedureExecutionCursor,
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

const BattleCreatureSnapshotCommonFields = {
  combatantId: CombatantId,
  initiative: Schema.Number,
  hp: Schema.Number,
  maxHp: Schema.Number,
  tempHp: Schema.Number,
  nextActiveEffectOrdinal: BattleActiveEffectExecutionOrdinal,
  activeEffectRefs: Schema.Array(BattleActiveEffectExecutionRef),
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
      battleProcedureExecutionRefOrdinalIsBefore(
        binding.procedureRef,
        characterOrigin.execution.scopeRef,
        characterOrigin.execution.nextProcedureOrdinal,
      ),
    ) &&
    characterOrigin.execution.procedureBindings.length ===
      characterOrigin.execution.nextProcedureOrdinal &&
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
    battleActiveEffectExecutionRefOrdinalIsBefore(
      effectRef,
      snapshot.origin.execution.scopeRef,
      snapshot.nextActiveEffectOrdinal,
    ),
  );
}

const battleCreatureSnapshotInvariantAnnotations = {
  message:
    "Execution scopes, procedure refs, resource refs, and active-effect refs must be unique and owned by their combatant.",
};

const BattleCreatureSnapshotShapeSchema = Schema.Union([
  Schema.Struct({
    ...BattleCreatureSnapshotCommonFields,
    displayName: Schema.String,
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

const BattleActExecutionCandidateSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  initialHoles: Schema.Array(BattleHoleSchema),
});

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

export const BattleInterruptProcedureChoiceSchema = Schema.Union([
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
  Schema.Struct({
    kind: Schema.Literal("reactionRollOrDamageReduction"),
    reactorId: CombatantId,
    choice: BattleReactionModifierChoiceSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
  }),
]).pipe(
  Schema.check(
    Schema.makeFilter(
      (choice) =>
        Match.value(choice).pipe(
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
            reactionRollOrDamageReduction: () => true,
          }),
        ),
      {
        message:
          "Interrupt choices must own the matching reference-bearing runtime subject.",
      },
    ),
  ),
);

const BattlePendingReactionSnapshotSchema = Schema.Struct({
  trigger: Schema.Literals(BATTLE_INTERRUPT_TRIGGERS),
  decisionHole: BattleHoleSchema,
  choices: Schema.Array(BattleInterruptProcedureChoiceSchema),
  stackDepth: Schema.Number,
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
  emission: Schema.Union([
    BattleDimLightEmissionSchema,
    Schema.Struct({
      kind: Schema.Literal("brightAndDim"),
      brightRadiusFeet: MovementFeet,
      dimAdditionalFeet: MovementFeet,
    }),
  ]),
  opaqueCoverInteraction: Schema.Union([
    Schema.Struct({ kind: Schema.Literal("blocksEmission") }),
    Schema.Struct({ kind: Schema.Literal("doesNotBlockEmission") }),
  ]),
  expiresAt: BattleActiveEffectExpirationSchema,
};

const BattleLightEmitterSchema = Schema.Union([
  Schema.Struct({
    ...BattleSpellLightEmitterFields,
    sourceEffectId: BattleSpellEffectOccurrenceId,
    sourceSpellLevel: BattleSpellEffectLevel,
  }),
  Schema.Struct({
    ...BattleSpellLightEmitterFields,
    sourceEffectId: Schema.optionalKey(Schema.Never),
    sourceSpellLevel: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    kind: Schema.Literal("unitFeatureLightEmitter"),
    sourceProcedureRef: BattleProcedureExecutionRef,
    sourceCombatantId: CombatantId,
    attachment: BattleLightEmitterAttachmentSchema,
    emission: Schema.Union([
      BattleDimLightEmissionSchema,
      Schema.Struct({
        kind: Schema.Literal("brightAndDim"),
        brightRadiusFeet: MovementFeet,
        dimAdditionalFeet: MovementFeet,
      }),
    ]),
    opaqueCoverInteraction: Schema.Union([
      Schema.Struct({ kind: Schema.Literal("blocksEmission") }),
      Schema.Struct({ kind: Schema.Literal("doesNotBlockEmission") }),
    ]),
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
]);

type EncodedBattleCreatureSnapshot = BattleCreatureSnapshotInvariantInput;
type EncodedBattleInterruptChoice =
  typeof BattleInterruptProcedureChoiceSchema.Type;
type EncodedBattleReadiedSpellSnapshot =
  typeof BattleReadiedSpellSnapshotSchema.Type;
type EncodedBattleReadiedResponseSnapshot =
  typeof BattleReadiedResponseSnapshotSchema.Type;
type EncodedBattleActExecutionCandidate =
  typeof BattleActExecutionCandidateSchema.Type;
type EncodedBattleSubject = typeof BattleSubjectSchema.Type;
type EncodedBattleHole = typeof BattleHolePayloadUnionSchema.Type;

type SerializedExecutionReferenceOwnership =
  | {
      readonly ref: BattleProcedureExecutionRef;
      readonly ownerId: CombatantId | undefined;
      readonly subjectProcedure: true;
    }
  | {
      readonly ref: string;
      readonly ownerId: CombatantId | undefined;
      readonly subjectProcedure: false;
    };

function serializedExecutionReference(
  ref: string,
  ownerId: CombatantId | undefined,
): Extract<SerializedExecutionReferenceOwnership, { subjectProcedure: false }> {
  return { ref, ownerId, subjectProcedure: false };
}

function serializedSubjectProcedureReference(
  ref: BattleProcedureExecutionRef,
  ownerId: CombatantId | undefined,
): Extract<SerializedExecutionReferenceOwnership, { subjectProcedure: true }> {
  const subjectProcedure = true;
  return { ref, ownerId, subjectProcedure };
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
            bound,
          ),
          ...(value.alternateAbilityChoices ?? []).flatMap(
            (choice) =>
              choice.attackDamageAbilityModifierChoice?.procedureRefs.map(
                bound,
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
    return Match.value(value).pipe(
      Match.when({ sourceProcedureRef: Match.any }, (hole) => [
        source(hole.sourceProcedureRef),
        ...bonuses,
      ]),
      Match.whenOr(
        { objectContactSave: Match.any },
        { spellTurnStartSave: Match.any },
        { hideousLaughterRepeatSave: Match.any },
        { sleepRepeatSave: Match.any },
        { spellConditionEndTurnSave: Match.any },
        { spellConditionCountedEndTurnSave: Match.any },
        { unitFeatureConditionEndTurnSave: Match.any },
        { slowActivePenaltiesEndTurnSave: Match.any },
        { abilityD20TestRollModeEndTurnSave: Match.any },
        { protectionRelevantEffectSave: Match.any },
        (hole) =>
          Match.value(hole).pipe(
            Match.when({ objectContactSave: Match.any }, (matched) =>
              procedureSource(matched.objectContactSave),
            ),
            Match.when({ spellTurnStartSave: Match.any }, (matched) =>
              procedureSource(matched.spellTurnStartSave),
            ),
            Match.when({ hideousLaughterRepeatSave: Match.any }, (matched) =>
              procedureSource(matched.hideousLaughterRepeatSave),
            ),
            Match.when({ sleepRepeatSave: Match.any }, (matched) =>
              procedureSource(matched.sleepRepeatSave),
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
            Match.when(
              { slowActivePenaltiesEndTurnSave: Match.any },
              (matched) =>
                procedureSource(matched.slowActivePenaltiesEndTurnSave),
            ),
            Match.when(
              { abilityD20TestRollModeEndTurnSave: Match.any },
              (matched) =>
                procedureSource(matched.abilityD20TestRollModeEndTurnSave),
            ),
            Match.when({ protectionRelevantEffectSave: Match.any }, (matched) =>
              procedureSource(matched.protectionRelevantEffectSave),
            ),
            Match.exhaustive,
          ),
      ),
      Match.whenOr(
        { greaseGroundHazard: Match.any },
        { webRestraint: Match.any },
        { sleetStormAreaHazard: Match.any },
        { insectPlagueAreaHazard: Match.any },
        { cloudkillAreaHazard: Match.any },
        { gustOfWindLine: Match.any },
        { movableZone: Match.any },
        { dragonsBreath: Match.any },
        { glyphExplosiveRune: Match.any },
        (hole) =>
          Match.value(hole).pipe(
            Match.when({ greaseGroundHazard: Match.any }, (matched) =>
              procedureSource(matched.greaseGroundHazard),
            ),
            Match.when({ webRestraint: Match.any }, (matched) =>
              procedureSource(matched.webRestraint),
            ),
            Match.when({ sleetStormAreaHazard: Match.any }, (matched) =>
              procedureSource(matched.sleetStormAreaHazard),
            ),
            Match.when({ insectPlagueAreaHazard: Match.any }, (matched) =>
              procedureSource(matched.insectPlagueAreaHazard),
            ),
            Match.when({ cloudkillAreaHazard: Match.any }, (matched) =>
              procedureSource(matched.cloudkillAreaHazard),
            ),
            Match.when({ gustOfWindLine: Match.any }, (matched) =>
              procedureSource(matched.gustOfWindLine),
            ),
            Match.when({ movableZone: Match.any }, (matched) =>
              procedureSource(matched.movableZone),
            ),
            Match.when({ dragonsBreath: Match.any }, (matched) =>
              procedureSource(matched.dragonsBreath),
            ),
            Match.when({ glyphExplosiveRune: Match.any }, (matched) =>
              procedureSource(matched.glyphExplosiveRune),
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
    return Match.value(value).pipe(
      Match.when({ sourceProcedureRef: Match.any }, (hole) => [
        source(hole.sourceProcedureRef),
        ...Match.value(hole).pipe(
          Match.when({ spellMarkedDamageRiders: Match.any }, (spellDamage) =>
            (spellDamage.spellMarkedDamageRiders ?? []).map((rider) =>
              owned(rider.sourceProcedureRef, rider.sourceCombatantId),
            ),
          ),
          Match.orElse(() => []),
        ),
      ]),
      Match.when({ dragonsBreath: Match.any }, (hole) =>
        procedureSource(hole.dragonsBreath),
      ),
      Match.when({ glyphExplosiveRune: Match.any }, (hole) =>
        procedureSource(hole.glyphExplosiveRune),
      ),
      Match.when({ spellDamageReduction: Match.any }, (hole) =>
        procedureSource(hole.spellDamageReduction),
      ),
      Match.when({ sourceDamageRollPenalty: Match.any }, (hole) =>
        procedureSource(hole.sourceDamageRollPenalty),
      ),
      Match.when({ mirrorImageDuplicateRoll: Match.any }, (hole) =>
        procedureSource(hole.mirrorImageDuplicateRoll),
      ),
      Match.when({ spellTurnStartDamage: Match.any }, (hole) =>
        procedureSource(hole.spellTurnStartDamage),
      ),
      Match.when({ spellTurnEndDamage: Match.any }, (hole) =>
        procedureSource(hole.spellTurnEndDamage),
      ),
      Match.when({ movableZone: Match.any }, (hole) =>
        procedureSource(hole.movableZone),
      ),
      Match.when({ spikeGrowthMovement: Match.any }, (hole) =>
        procedureSource(hole.spikeGrowthMovement),
      ),
      Match.when({ insectPlagueAreaHazard: Match.any }, (hole) =>
        procedureSource(hole.insectPlagueAreaHazard),
      ),
      Match.when({ cloudkillAreaHazard: Match.any }, (hole) =>
        procedureSource(hole.cloudkillAreaHazard),
      ),
      Match.when({ attack: Match.any }, (hole) => [
        ...attackOptionReferences(hole.attack),
        ...(hole.attackDamageRiders ?? []).map((rider) =>
          owned(rider.procedureRef, rider.attackerId),
        ),
        ...(hole.spellWeaponDamageRiders ?? []).map((rider) =>
          owned(rider.sourceProcedureRef, rider.sourceCombatantId),
        ),
        ...(hole.spellMarkedDamageRiders ?? []).map((rider) =>
          owned(rider.sourceProcedureRef, rider.sourceCombatantId),
        ),
        ...(hole.cunningStrikeOptions ?? []).flatMap((option) => [
          bound(option.procedureRef),
          bound(option.sourceDamageRiderProcedureRef),
        ]),
        ...(hole.weaponDamageDiceRollChoiceProcedureRefs ?? []).map(bound),
        ...(hole.attackDamageDieFloorChoiceProcedureRefs ?? []).map(bound),
        ...(hole.attackDamageAbilityModifierChoice?.procedureRefs ?? []).map(
          bound,
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
          Match.when({ wardingBondSeparation: Match.any }, (hole) => [
            source(
              hole.wardingBondSeparation.sourceProcedureRef,
              hole.wardingBondSeparation.sourceCombatantId,
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
      slowSomaticSpellFailureOutcome: (value) => [
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
          choice.kind === "magicalEffect" &&
          choice.effect.kind === "spellActiveEffect"
            ? [bound(choice.effect.effectRef)]
            : [],
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
      magicWeaponTargetItem: (value) => [source(value.sourceProcedureRef)],
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
      thaumaturgyActiveOneMinuteEffectCount: (value) => [
        source(value.sourceProcedureRef),
      ],
      commandOptionChoice: (value) => [source(value.sourceProcedureRef)],
      selfTransformationModeChoice: (value) => [
        source(value.sourceProcedureRef),
      ],
      dancingLightsPlacement: (value) => [source(value.sourceProcedureRef)],
      spellAreaChoice: (value) => [source(value.sourceProcedureRef)],
      teleportDestination: (value) => [
        source(value.sourceProcedureRef, value.actorId),
      ],
      spiritualWeaponForcePosition: (value) => [
        source(value.sourceProcedureRef),
      ],
      savingThrowOutcome: savingThrowReferences,
      gustOfWindLineDirectionChoice: (value) => [
        source(value.sourceProcedureRef, value.sourceCombatantId),
      ],
      movableZoneRepositionMovement: (value) => [
        source(
          value.movableZone.sourceProcedureRef,
          value.movableZone.sourceCombatantId,
        ),
      ],
      statBlockRechargeRoll: (value) =>
        value.rechargeTargets.map((ref) => owned(ref, value.combatantId)),
      spellcastingAbilityCheck: (value) => [
        source(
          value.spellcastingAbilityCheck.sourceProcedureRef,
          value.spellcastingAbilityCheck.casterId,
        ),
        ...(value.spellcastingAbilityCheck.effect.kind === "spellActiveEffect"
          ? [bound(value.spellcastingAbilityCheck.effect.effectRef)]
          : []),
      ],
      sanctuaryInterdictionOutcome: (value) => [
        owned(value.sourceProcedureRef, value.sourceCombatantId),
        source(value.triggeringProcedureRef, value.triggeringCombatantId),
      ],
      abilityCheck: noSerializedExecutionReferences,
      attackDamageDisposition: (value) =>
        value.choices.flatMap((choice) =>
          choice.kind === "zeroHitPointReplacement"
            ? [owned(choice.procedureRef, value.targetId)]
            : [],
        ),
      companionReappearanceInitiative: noSerializedExecutionReferences,
      companionReappearancePlacement: noSerializedExecutionReferences,
      concentrationSavingThrow: (value) =>
        value.targetFlatBonuses.map((bonus) =>
          owned(bonus.sourceProcedureRef, bonus.sourceCombatantId),
        ),
      cunningStrikeEndTurnCoverFacts: noSerializedExecutionReferences,
      deathSavingThrow: noSerializedExecutionReferences,
      findFamiliarConnection: noSerializedExecutionReferences,
      grappleOutcome: noSerializedExecutionReferences,
      interruptDecision: noSerializedExecutionReferences,
      levitateAltitudeChange: noSerializedExecutionReferences,
      levitateInitialRise: noSerializedExecutionReferences,
      movement: noSerializedExecutionReferences,
      movableZoneRamMovement: (value) => [
        source(
          value.movableZone.sourceProcedureRef,
          value.movableZone.sourceCombatantId,
        ),
      ],
      shoveOutcome: noSerializedExecutionReferences,
      toolPossessionFacts: noSerializedExecutionReferences,
      unitFeatureDecision: noSerializedExecutionReferences,
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

function serializedSpellProcedureRefIsBound(
  combatants: readonly EncodedBattleCreatureSnapshot[],
  combatantId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
): boolean {
  const kind = characterProcedureBindingKind(
    combatants,
    combatantId,
    procedureRef,
  );
  return kind === "spellInvocation" || kind === "unavailableSpellInvocation";
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

function serializedImmediateSpellChoiceIsBound(
  combatants: readonly EncodedBattleCreatureSnapshot[],
  choice: Extract<
    EncodedBattleInterruptChoice,
    {
      readonly kind:
        | "castTriggeredReactionSpell"
        | "castAttackHitBonusActionSpell";
    }
  >,
): boolean {
  if (
    choice.subject.tag !== "runtimeCommand" ||
    (choice.subject.command !== "castTriggeredReactionSpell" &&
      choice.subject.command !== "castAttackHitBonusActionSpell")
  )
    return false;
  const binding = characterProcedureBinding(
    combatants,
    choice.reactorId,
    choice.subject.procedureRef,
  );
  if (binding?.procedure.kind !== "spellInvocation") return false;
  return (
    binding.procedure.executionFacts.kind ===
    (choice.kind === "castTriggeredReactionSpell"
      ? "triggeredReactionSpell"
      : "attackHitBonusActionSpell")
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
    return (
      combatant.origin.attackExecution.attackProcedureRef === procedureRef ||
      combatant.origin.attackExecution.unarmedStrikeProcedureRef ===
        procedureRef ||
      combatant.origin.attackExecution.offHandAttackProcedureRef ===
        procedureRef
    );
  }
  return combatant.origin.execution.procedureBindings.some(
    (binding) =>
      binding.procedureRef === procedureRef &&
      binding.procedure.kind === "attack",
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
  if (emitter.kind === "spellLightEmitter") {
    return (
      characterProcedureBindingKind(
        combatants,
        emitter.sourceCombatantId,
        emitter.sourceProcedureRef,
      ) === "spellInvocation"
    );
  }
  if (emitter.kind === "unitFeatureLightEmitter") {
    return (
      characterProcedureBindingKind(
        combatants,
        emitter.sourceCombatantId,
        emitter.sourceProcedureRef,
      ) === "unitFeature"
    );
  }
  return (
    characterProcedureBindingKind(
      combatants,
      emitter.sourceCombatantId,
      emitter.sourceProcedureRef,
    ) === "spellInvocation"
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
      !expectedProcedureRefs.has(reference.ref)
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

function serializedInterruptChoiceProcedureRefs(
  choice: EncodedBattleInterruptChoice,
): ReadonlySet<BattleProcedureExecutionRef> {
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      releaseReadiedSpell: (value) =>
        new Set(battleSubjectProcedureRefs(value.subject)),
      releaseReadiedMovement: (value) =>
        new Set(battleSubjectProcedureRefs(value.subject)),
      releaseReadiedAction: (value) =>
        new Set(battleSubjectProcedureRefs(value.subject)),
      releaseReadiedAttack: (value) =>
        new Set(battleSubjectProcedureRefs(value.subject)),
      castTriggeredReactionSpell: (value) =>
        new Set(battleSubjectProcedureRefs(value.subject)),
      castAttackHitBonusActionSpell: (value) =>
        new Set(battleSubjectProcedureRefs(value.subject)),
      opportunityAttack: (value) =>
        new Set(battleSubjectProcedureRefs(value.subject)),
      retaliationAttack: (value) =>
        new Set(battleSubjectProcedureRefs(value.subject)),
      reactionRollOrDamageReduction: (value) =>
        new Set([value.choice.procedureRef]),
    }),
  );
}

function serializedInterruptChoiceOwnsBoundSubjectReferences(
  choice: EncodedBattleInterruptChoice,
  combatants: readonly EncodedBattleCreatureSnapshot[],
): boolean {
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      releaseReadiedSpell: (value) =>
        serializedBattleSubjectOwnsBoundExecutionReferences(
          value.subject,
          combatants,
        ),
      releaseReadiedMovement: (value) =>
        serializedBattleSubjectOwnsBoundExecutionReferences(
          value.subject,
          combatants,
        ),
      releaseReadiedAction: (value) =>
        serializedBattleSubjectOwnsBoundExecutionReferences(
          value.subject,
          combatants,
        ),
      releaseReadiedAttack: (value) =>
        serializedBattleSubjectOwnsBoundExecutionReferences(
          value.subject,
          combatants,
        ),
      castTriggeredReactionSpell: (value) =>
        serializedBattleSubjectOwnsBoundExecutionReferences(
          value.subject,
          combatants,
        ),
      castAttackHitBonusActionSpell: (value) =>
        serializedBattleSubjectOwnsBoundExecutionReferences(
          value.subject,
          combatants,
        ),
      opportunityAttack: (value) =>
        serializedBattleSubjectOwnsBoundExecutionReferences(
          value.subject,
          combatants,
        ),
      retaliationAttack: (value) =>
        serializedBattleSubjectOwnsBoundExecutionReferences(
          value.subject,
          combatants,
        ),
      reactionRollOrDamageReduction: () => true,
    }),
  );
}

function serializedBattleSubjectProcedureRefs(
  subject: EncodedBattleSubject,
): ReadonlySet<BattleProcedureExecutionRef> {
  return new Set(battleSubjectProcedureRefs(subject));
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

function serializedStatBlockProcedureKind(
  combatants: readonly EncodedBattleCreatureSnapshot[],
  combatantId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
): "attack" | "multiattack" | "bonusActionOption" | undefined {
  const combatant = combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  if (combatant?.origin.kind !== "statBlock") return undefined;
  return combatant.origin.execution.procedureBindings.find(
    (binding) => binding.procedureRef === procedureRef,
  )?.procedure.kind;
}

function serializedBattleActOwnsBoundProcedure(
  act: EncodedBattleActExecutionCandidate,
  combatants: readonly EncodedBattleCreatureSnapshot[],
  readiedSpells: readonly EncodedBattleReadiedSpellSnapshot[],
): boolean {
  const subject = act.subject;
  if (!("procedureRef" in subject)) return true;
  const procedureRef = subject.procedureRef;
  if (procedureRef === undefined) return false;
  if (subject.tag === "pactOfTheChainFamiliarAttack") {
    return serializedAttackProcedureRefIsBound(
      combatants,
      subject.familiarId,
      procedureRef,
    );
  }
  if (subject.tag === "action" && subject.action === "attack") {
    const owner = combatants.find(
      (combatant) => combatant.combatantId === subject.actorId,
    );
    return owner?.origin.kind === "character"
      ? owner.origin.attackExecution.attackProcedureRef === procedureRef ||
          owner.origin.attackExecution.unarmedStrikeProcedureRef ===
            procedureRef
      : serializedAttackProcedureRefIsBound(
          combatants,
          subject.actorId,
          procedureRef,
        );
  }
  if (subject.tag === "monkFocusFlurryOfBlowsStrike") {
    const owner = combatants.find(
      (combatant) => combatant.combatantId === subject.actorId,
    );
    const focusBinding = characterProcedureBinding(
      combatants,
      subject.actorId,
      subject.focusProcedureRef,
    );
    return (
      owner?.origin.kind === "character" &&
      owner.origin.attackExecution.unarmedStrikeProcedureRef === procedureRef &&
      focusBinding?.procedure.kind === "unitSupportProfile" &&
      serializedUnitProcedureExecutionKind(focusBinding.procedure) ===
        MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE
    );
  }
  if (
    (subject.tag === "bonusAction" && subject.action === "offHandAttack") ||
    (subject.tag === "bonusAction" &&
      subject.action === "martialArtsUnarmedStrike")
  ) {
    const owner = combatants.find(
      (combatant) => combatant.combatantId === subject.actorId,
    );
    if (owner?.origin.kind !== "character") return false;
    return subject.action === "offHandAttack"
      ? owner.origin.attackExecution.offHandAttackProcedureRef === procedureRef
      : owner.origin.attackExecution.unarmedStrikeProcedureRef === procedureRef;
  }
  if (subject.tag === "action" && subject.action === "multiattack") {
    return (
      serializedStatBlockProcedureKind(
        combatants,
        subject.actorId,
        procedureRef,
      ) === "multiattack"
    );
  }
  if (
    subject.tag === "bonusAction" &&
    subject.action === "statBlockActionOption"
  ) {
    return (
      serializedStatBlockProcedureKind(
        combatants,
        subject.actorId,
        procedureRef,
      ) === "bonusActionOption"
    );
  }
  if (
    subject.tag === "actionSpell" ||
    subject.tag === "bonusActionSpell" ||
    subject.tag === "bonusActionDashSpell" ||
    subject.tag === "findFamiliarTouchSpell"
  ) {
    const binding = characterProcedureBinding(
      combatants,
      subject.actorId,
      procedureRef,
    );
    if (binding?.procedure.kind !== "spellInvocation") return false;
    const spellProcedure = binding.procedure;
    if (subject.tag === "findFamiliarTouchSpell") {
      return (
        "familiarTouchDelivery" in spellProcedure.executionFacts &&
        spellProcedure.executionFacts.familiarTouchDelivery &&
        spellProcedure.executionFacts.kind ===
          (subject.spellAction === "action"
            ? "actionSpell"
            : "bonusActionSpell")
      );
    }
    if (subject.tag === "bonusActionDashSpell") {
      return spellProcedure.executionFacts.kind === "bonusActionDashSpell";
    }
    if (subject.tag === "bonusActionSpell") {
      return (
        spellProcedure.executionFacts.kind === "bonusActionSpell" ||
        (spellProcedure.executionFacts.kind === "actionSpell" &&
          (subject.metamagic ?? []).some(
            (option) =>
              option.effectKind ===
              "action_casting_time_to_bonus_action_with_spell_turn_limit",
          ))
      );
    }
    return (
      spellProcedure.executionFacts.kind === subject.tag &&
      (subject.mode.tag !== "ready" ||
        (spellProcedure.executionFacts.kind === "actionSpell" &&
          spellProcedure.executionFacts.readiedSpellCompatible))
    );
  }
  if (
    subject.tag === "unitFeature" ||
    subject.tag === "unitFeatureHeldWeaponActivation" ||
    subject.tag === "druidWildShape" ||
    subject.tag === "monkFocusOption"
  ) {
    const binding = characterProcedureBinding(
      combatants,
      subject.actorId,
      procedureRef,
    );
    if (subject.tag === "druidWildShape") {
      return (
        binding?.procedure.kind === "unitFeature" &&
        serializedUnitProcedureExecutionKind(binding.procedure) ===
          DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE
      );
    }
    if (subject.tag === "monkFocusOption") {
      return (
        binding?.procedure.kind === "unitSupportProfile" &&
        serializedUnitProcedureExecutionKind(binding.procedure) ===
          MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE
      );
    }
    return binding?.procedure.kind === "unitFeature";
  }
  if (subject.tag === "bonusActionStandardAction") {
    const binding = characterProcedureBinding(
      combatants,
      subject.actorId,
      procedureRef,
    );
    if (binding === undefined) return false;
    return Match.value(binding.procedure).pipe(
      Match.discriminatorsExhaustive("kind")({
        spellInvocation: (procedure) =>
          procedure.executionFacts.kind === "bonusActionDashSpell",
        /* v8 ignore next -- @preserve -- Malformed snapshot defense: an explicitly unavailable Spell Invocation can never own an executable Bonus Action standard-action subject. */
        unavailableSpellInvocation: () => false,
        unitFeature: (procedure) => {
          const executionKind = procedure.execution.kind;
          return (
            executionKind ===
            BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE
          );
        },
        unitSupportProfile: (procedure) => {
          const executionKind = serializedUnitProcedureExecutionKind(procedure);
          return (
            executionKind === "alternateActionCost" ||
            executionKind ===
              BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE
          );
        },
      }),
    );
  }
  if (
    subject.tag === "runtimeCommand" &&
    subject.command === "releaseReadiedSpell"
  ) {
    return readiedSpells.some(
      (readied) =>
        readied.casterId === subject.readiedSpellCasterId &&
        readied.procedureRef === procedureRef,
    );
  }
  return false;
}

function serializedBattleSubjectOwnsBoundExecutionReferences(
  subject: EncodedBattleActExecutionCandidate["subject"],
  combatants: readonly EncodedBattleCreatureSnapshot[],
): boolean {
  return battleSubjectBoundExecutionReferences(subject).every((reference) => {
    return Match.value(reference).pipe(
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
    );
  });
}

function pendingInterruptChoiceOwnsBoundProcedure(input: {
  readonly choice: EncodedBattleInterruptChoice;
  readonly combatants: readonly EncodedBattleCreatureSnapshot[];
  readonly readiedSpells: readonly EncodedBattleReadiedSpellSnapshot[];
  readonly readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[];
}): boolean {
  const { choice } = input;
  if (choice.kind === "releaseReadiedMovement") {
    return pendingReadiedMovementChoiceOwnsBoundResponse(
      choice,
      input.readiedResponses,
    );
  }
  if (choice.kind === "releaseReadiedAction") {
    return pendingReadiedActionChoiceOwnsBoundResponse(
      choice,
      input.readiedResponses,
    );
  }
  if (choice.kind === "reactionRollOrDamageReduction") {
    return serializedReactionModifierProcedureRefIsBound(
      input.combatants,
      choice.reactorId,
      choice.choice.procedureRef,
    );
  }
  if (choice.kind === "releaseReadiedSpell") {
    return pendingReadiedSpellChoiceOwnsBoundResponse(
      choice,
      input.combatants,
      input.readiedSpells,
    );
  }
  if (
    choice.kind === "castTriggeredReactionSpell" ||
    choice.kind === "castAttackHitBonusActionSpell"
  ) {
    return pendingImmediateSpellChoiceOwnsBoundProcedure(
      choice,
      input.combatants,
    );
  }
  return pendingAttackChoiceOwnsBoundProcedure(
    choice,
    input.combatants,
    input.readiedResponses,
  );
}

function pendingReadiedMovementChoiceOwnsBoundResponse(
  choice: Extract<
    EncodedBattleInterruptChoice,
    { readonly kind: "releaseReadiedMovement" }
  >,
  readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[],
): boolean {
  return readiedResponses.some(
    (readied) =>
      readied.actorId === choice.reactorId &&
      readied.actorId === choice.readiedMovementActorId &&
      readied.response.kind === "movement",
  );
}

function pendingReadiedActionChoiceOwnsBoundResponse(
  choice: Extract<
    EncodedBattleInterruptChoice,
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

function pendingReadiedSpellChoiceOwnsBoundResponse(
  choice: Extract<
    EncodedBattleInterruptChoice,
    { readonly kind: "releaseReadiedSpell" }
  >,
  combatants: readonly EncodedBattleCreatureSnapshot[],
  readiedSpells: readonly EncodedBattleReadiedSpellSnapshot[],
): boolean {
  if (
    choice.subject.tag !== "runtimeCommand" ||
    choice.subject.command !== "releaseReadiedSpell"
  ) {
    return false;
  }
  const procedureRef = choice.subject.procedureRef;
  return (
    serializedSpellProcedureRefIsBound(
      combatants,
      choice.reactorId,
      procedureRef,
    ) &&
    readiedSpells.some(
      (readied) =>
        readied.casterId === choice.reactorId &&
        readied.procedureRef === procedureRef,
    )
  );
}

function pendingImmediateSpellChoiceOwnsBoundProcedure(
  choice: Extract<
    EncodedBattleInterruptChoice,
    | { readonly kind: "castTriggeredReactionSpell" }
    | { readonly kind: "castAttackHitBonusActionSpell" }
  >,
  combatants: readonly EncodedBattleCreatureSnapshot[],
): boolean {
  if (
    choice.subject.tag !== "runtimeCommand" ||
    (choice.subject.command !== "castTriggeredReactionSpell" &&
      choice.subject.command !== "castAttackHitBonusActionSpell")
  ) {
    return false;
  }
  return serializedImmediateSpellChoiceIsBound(combatants, choice);
}

function pendingAttackChoiceOwnsBoundProcedure(
  choice: Exclude<
    EncodedBattleInterruptChoice,
    | { readonly kind: "releaseReadiedMovement" }
    | { readonly kind: "releaseReadiedAction" }
    | { readonly kind: "reactionRollOrDamageReduction" }
    | { readonly kind: "releaseReadiedSpell" }
    | { readonly kind: "castTriggeredReactionSpell" }
    | { readonly kind: "castAttackHitBonusActionSpell" }
  >,
  combatants: readonly EncodedBattleCreatureSnapshot[],
  readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[],
): boolean {
  if (
    choice.subject.tag !== "runtimeCommand" ||
    (choice.subject.command !== "opportunityAttack" &&
      choice.subject.command !== "retaliationAttack" &&
      choice.subject.command !== "releaseReadiedAttack")
  ) {
    return false;
  }
  if (choice.kind === "releaseReadiedAttack") {
    return pendingReadiedAttackChoiceOwnsBoundProcedure(
      choice,
      combatants,
      readiedResponses,
    );
  }
  return serializedAttackProcedureRefIsBound(
    combatants,
    choice.reactorId,
    choice.subject.procedureRef,
  );
}

function pendingReadiedAttackChoiceOwnsBoundProcedure(
  choice: Extract<
    EncodedBattleInterruptChoice,
    { readonly kind: "releaseReadiedAttack" }
  >,
  combatants: readonly EncodedBattleCreatureSnapshot[],
  readiedResponses: readonly EncodedBattleReadiedResponseSnapshot[],
): boolean {
  const attackSubject = choice.subject;
  if (
    attackSubject.tag !== "runtimeCommand" ||
    attackSubject.command !== "releaseReadiedAttack" ||
    !("procedureRef" in attackSubject) ||
    !("targetId" in attackSubject)
  ) {
    return false;
  }
  const subjectProcedureRef = attackSubject.procedureRef;
  const subjectTargetId = attackSubject.targetId;
  return (
    combatants.some((combatant) => combatant.combatantId === subjectTargetId) &&
    readiedResponses.some(
      (readied) =>
        readied.actorId === choice.reactorId &&
        readied.response.kind === "attack" &&
        readied.response.procedureRef === subjectProcedureRef,
    )
  );
}

const BattleRetiredExecutionScopeOwnershipSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("statBlock"),
    statBlockScopeRef: BattleStatBlockExecutionScopeRef,
  }),
  Schema.Struct({
    kind: Schema.Literal("character"),
    characterScopeRef: BattleCharacterExecutionScopeRef,
    attackScopeRef: BattleAttackExecutionScopeRef,
    formScopeRefs: Schema.Array(BattleStatBlockExecutionScopeRef),
  }),
]);

function retiredExecutionScopeOwnershipRefs(
  ownership: typeof BattleRetiredExecutionScopeOwnershipSchema.Type,
) {
  return Match.value(ownership).pipe(
    Match.discriminatorsExhaustive("kind")({
      statBlock: ({ statBlockScopeRef }) => [statBlockScopeRef],
      character: ({ characterScopeRef, attackScopeRef, formScopeRefs }) => [
        characterScopeRef,
        attackScopeRef,
        ...formScopeRefs,
      ],
    }),
  );
}

function retiredExecutionScopeOwnershipIsValid(input: {
  readonly ownership: typeof BattleRetiredExecutionScopeOwnershipSchema.Type;
  readonly combatantId: CombatantId;
  readonly battleId: BattleId;
  readonly nextScopeOrdinal: BattleExecutionScopeCursor;
}): boolean {
  return Match.value(input.ownership).pipe(
    Match.discriminatorsExhaustive("kind")({
      statBlock: ({ statBlockScopeRef }) =>
        battleStatBlockExecutionScopeRefBelongsToCombatant(
          statBlockScopeRef,
          input.combatantId,
        ) &&
        battleStatBlockExecutionScopeRefBelongsToBattle(
          statBlockScopeRef,
          input.battleId,
        ) &&
        battleStatBlockExecutionScopeRefOrdinalIsBefore(
          statBlockScopeRef,
          input.nextScopeOrdinal,
        ),
      character: ({ characterScopeRef, attackScopeRef, formScopeRefs }) =>
        battleCharacterExecutionScopeRefBelongsToCombatant(
          characterScopeRef,
          input.combatantId,
        ) &&
        battleCharacterExecutionScopeRefBelongsToBattle(
          characterScopeRef,
          input.battleId,
        ) &&
        battleCharacterExecutionScopeRefOrdinalIsBefore(
          characterScopeRef,
          input.nextScopeOrdinal,
        ) &&
        battleAttackExecutionScopeRefBelongsToCombatant(
          attackScopeRef,
          input.combatantId,
        ) &&
        battleAttackExecutionScopeRefBelongsToBattle(
          attackScopeRef,
          input.battleId,
        ) &&
        battleAttackExecutionScopeRefOrdinalIsBefore(
          attackScopeRef,
          input.nextScopeOrdinal,
        ) &&
        formScopeRefs.every(
          (formScopeRef) =>
            battleStatBlockExecutionScopeRefBelongsToCombatant(
              formScopeRef,
              input.combatantId,
            ) &&
            battleStatBlockExecutionScopeRefBelongsToBattle(
              formScopeRef,
              input.battleId,
            ) &&
            battleStatBlockExecutionScopeRefOrdinalIsBefore(
              formScopeRef,
              input.nextScopeOrdinal,
            ),
        ),
    }),
  );
}

const BattleSnapshotCommonFields = {
  battleId: BattleId,
  executionScopeCursors: Schema.Array(
    Schema.Struct({
      combatantId: CombatantId,
      nextScopeOrdinal: BattleExecutionScopeCursor,
    }),
  ),
  retiredExecutionScopeAllocations: Schema.Array(
    Schema.Struct({
      combatantId: CombatantId,
      nextScopeOrdinal: BattleExecutionScopeCursor,
      ownership: BattleRetiredExecutionScopeOwnershipSchema,
    }),
  ),
  round: Schema.Number,
  currentActorId: CombatantId,
  turnOrder: Schema.Array(CombatantId),
  companions: Schema.Array(BattleCompanionSnapshotSchema),
  lightEmitters: Schema.Array(BattleLightEmitterSchema),
  obscurementZones: Schema.Array(BattleObscurementZoneSchema),
  acts: Schema.Array(BattleActExecutionCandidateSchema),
  turn: BattleTurnSnapshotSchema,
  readiedResponses: Schema.Struct({
    spells: Schema.Array(BattleReadiedSpellSnapshotSchema),
    actionsOrMovements: Schema.Array(BattleReadiedResponseSnapshotSchema),
  }),
  helpAttackMarkers: Schema.Array(BattleHelpAttackSnapshotSchema),
  pendingInterrupt: Schema.Union([
    BattlePendingReactionSnapshotSchema,
    Schema.Null,
  ]),
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
  const executionScopes = snapshot.combatants.flatMap((combatant) =>
    (combatant.origin.kind === "statBlock"
      ? [combatant.origin.execution.scopeRef]
      : [
          combatant.origin.execution.scopeRef,
          combatant.origin.attackExecution.scopeRef,
          ...combatant.origin.druidWildShapeAvailableForms.map(
            (form) => form.execution.scopeRef,
          ),
        ]
    ).map((scopeRef) => ({
      combatantId: combatant.combatantId,
      scopeRef,
    })),
  );
  const executionScopeRefs = executionScopes.map(
    (executionScope) => executionScope.scopeRef,
  );
  const retiredExecutionScopeRefs =
    snapshot.retiredExecutionScopeAllocations.flatMap((allocation) =>
      retiredExecutionScopeOwnershipRefs(allocation.ownership),
    );
  const cursorByCombatant = new Map(
    snapshot.executionScopeCursors.map((cursor) => [
      cursor.combatantId,
      cursor.nextScopeOrdinal,
    ]),
  );
  const retiredAllocationByCombatant = new Map(
    snapshot.retiredExecutionScopeAllocations.map((allocation) => [
      allocation.combatantId,
      allocation,
    ]),
  );
  const liveCombatantIds = new Set(
    snapshot.combatants.map((combatant) => combatant.combatantId),
  );
  const boundExecutionRefs = new Set(
    snapshot.combatants.flatMap(
      serializedCombatantAuthoritativeExecutionReferences,
    ),
  );
  return (
    battleSnapshotLiveCombatantIdsAreUnique(snapshot, liveCombatantIds) &&
    new Set([...executionScopeRefs, ...retiredExecutionScopeRefs]).size ===
      executionScopeRefs.length + retiredExecutionScopeRefs.length &&
    cursorByCombatant.size === snapshot.executionScopeCursors.length &&
    cursorByCombatant.size === liveCombatantIds.size &&
    retiredAllocationByCombatant.size ===
      snapshot.retiredExecutionScopeAllocations.length &&
    snapshot.retiredExecutionScopeAllocations.every(
      (allocation) =>
        !liveCombatantIds.has(allocation.combatantId) &&
        retiredExecutionScopeOwnershipIsValid({
          ownership: allocation.ownership,
          combatantId: allocation.combatantId,
          battleId: snapshot.battleId,
          nextScopeOrdinal: allocation.nextScopeOrdinal,
        }),
    ) &&
    snapshot.acts.every(
      (act) =>
        serializedBattleSubjectOwnsBoundExecutionReferences(
          act.subject,
          snapshot.combatants,
        ) &&
        serializedBattleActOwnsBoundProcedure(
          act,
          snapshot.combatants,
          snapshot.readiedResponses.spells,
        ) &&
        serializedBattleHolesOwnBoundExecutionReferences({
          holes: act.initialHoles,
          combatants: snapshot.combatants,
          boundExecutionRefs,
          expectedProcedureRefs: serializedBattleSubjectProcedureRefs(
            act.subject,
          ),
        }),
    ) &&
    snapshot.readiedResponses.spells.every((readied) =>
      serializedReadiedSpellOwnsInvocation(snapshot.combatants, readied),
    ) &&
    snapshot.readiedResponses.actionsOrMovements.every((readied) =>
      serializedReadiedResponseIsBound(snapshot.combatants, readied),
    ) &&
    battleSnapshotPendingInterruptIsValid(snapshot, boundExecutionRefs) &&
    snapshot.lightEmitters.every((emitter) =>
      serializedLightEmitterOwnsSource(emitter, snapshot.combatants),
    ) &&
    snapshot.obscurementZones.every((zone) =>
      serializedObscurementZoneOwnsSource(zone, snapshot.combatants),
    ) &&
    executionScopes.every((executionScope) => {
      const cursor = cursorByCombatant.get(executionScope.combatantId);
      return Schema.is(BattleAttackExecutionScopeRef)(executionScope.scopeRef)
        ? battleAttackExecutionScopeRefOrdinalIsBefore(
            executionScope.scopeRef,
            cursor,
          ) &&
            battleAttackExecutionScopeRefBelongsToBattle(
              executionScope.scopeRef,
              snapshot.battleId,
            )
        : Schema.is(BattleCharacterExecutionScopeRef)(executionScope.scopeRef)
          ? battleCharacterExecutionScopeRefOrdinalIsBefore(
              executionScope.scopeRef,
              cursor,
            ) &&
            battleCharacterExecutionScopeRefBelongsToBattle(
              executionScope.scopeRef,
              snapshot.battleId,
            )
          : battleStatBlockExecutionScopeRefOrdinalIsBefore(
              executionScope.scopeRef,
              cursor,
            ) &&
            battleStatBlockExecutionScopeRefBelongsToBattle(
              executionScope.scopeRef,
              snapshot.battleId,
            );
    })
  );
}

function battleSnapshotLiveCombatantIdsAreUnique(
  snapshot: BattleSnapshotInvariantInput,
  liveCombatantIds: ReadonlySet<CombatantId>,
): boolean {
  return liveCombatantIds.size === snapshot.combatants.length;
}

function battleSnapshotPendingInterruptIsValid(
  snapshot: BattleSnapshotInvariantInput,
  boundExecutionRefs: ReadonlySet<string>,
): boolean {
  const pendingInterrupt = snapshot.pendingInterrupt;
  if (pendingInterrupt === null) return true;
  return (
    pendingInterrupt.choices.every((choice) =>
      serializedInterruptChoiceOwnsBoundSubjectReferences(
        choice,
        snapshot.combatants,
      ),
    ) &&
    serializedBattleHoleOwnsBoundExecutionReferences({
      hole: pendingInterrupt.decisionHole,
      combatants: snapshot.combatants,
      boundExecutionRefs,
      expectedProcedureRefs: undefined,
    }) &&
    pendingInterrupt.choices.every(
      (choice) =>
        pendingInterruptChoiceOwnsBoundProcedure({
          choice,
          combatants: snapshot.combatants,
          readiedSpells: snapshot.readiedResponses.spells,
          readiedResponses: snapshot.readiedResponses.actionsOrMovements,
        }) &&
        serializedBattleHolesOwnBoundExecutionReferences({
          holes: choice.initialHoles,
          combatants: snapshot.combatants,
          boundExecutionRefs,
          expectedProcedureRefs: serializedInterruptChoiceProcedureRefs(choice),
        }),
    )
  );
}

const battleSnapshotInvariantAnnotations = {
  message:
    "Battle combatants, execution scopes, and scope cursors must be unique, battle-owned, and monotonic.",
};

export const BattlePresentedSnapshotSchema = Schema.Struct({
  ...BattleSnapshotCommonFields,
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
// KERNEL-COVERAGE: runtime-owner BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE
