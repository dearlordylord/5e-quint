// Runtime codecs for battle reducer public payloads.
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
// Extracted from ../battle-reducer.ts; this module owns Effect Schema values,
// while domain types remain exported by the reducer facade.

import { ATTACK_ROLL_MODES } from "@dnd/shared-algebras/runtime-hole-algebra";
import type { ArmorClass as BattleArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { RETAINED_COMPANION_PROTOCOL_TAGS } from "@dnd/shared-algebras/companion-protocol-algebra";
import {
  STANDARD_ACTION_KINDS,
  type StandardActionKind,
} from "@dnd/shared/game-facts";
import {
  CONDITIONS as ALL_CONDITIONS,
  ArmorClass as SharedArmorClass,
  ResourceCount,
  type Hp,
} from "@dnd/shared/types";
import type {
  Ability,
  DamageType,
  Skill,
  StatBlockRecord,
} from "@dnd/surface/surface/types";
import {
  CreatureNamedAttackRollSchema,
  CreatureRechargeMinimumRollSchema,
  UnitRecordSchema,
} from "@dnd/surface/surface/schema";
import {
  BATTLE_UNIT_SUPPORT_PROFILES,
  BATTLE_CUNNING_STRIKE_OPTION_SELECTION_IDS,
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  CUNNING_STRIKE_END_TURN_COVER_DEGREES,
  DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE,
  MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
} from "../unit-feature-support.ts";
import { Schema } from "effect";
import { SpellExecutionFactsSchema } from "./spell-execution-facts.ts";
import { SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS } from "./battle-runtime-protocol.ts";
import { characterAttackExecutionRefsMatchLayout } from "../attack-execution.ts";
import {
  BATTLE_INTERRUPT_TRIGGERS,
  BATTLE_READIED_SPELL_TRIGGERS,
} from "../battle-interrupt-triggers.ts";
import {
  WILD_SHAPE_FORM_LIMB_OBJECT_HANDLING_WITNESSES,
  type WildShapeWornLoadoutObjectRef,
} from "./wild-shape-equipment.ts";
import {
  BATTLE_MOVEMENT_SPEED_KINDS,
  BattleSubjectSchema,
  BattleAttackExecutionAbilitySchema,
  BattleAttackExecutionSelectionSchema,
  BattleInterruptAttackExecutionSelectionSchema,
  SpellInvocationRefSchema,
  type BattleMovementSpeedKind,
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
  type InitiativeScore,
  SpellId,
} from "../identity.ts";
import type {
  BattleCompanionSnapshot,
  BattleCompanionPlacement,
  BattleCompanionDurableId,
  BattleCompanionProtocol,
} from "../companion-state.ts";
import type { StatBlockAttackProcedure } from "../stat-block-execution.ts";
import { creatureAttackRollMechanicsAreSupported } from "../statblock-action-support.ts";
import { ATTACK_DAMAGE_ABILITY_MODIFIER_CHOICE_SELECTIONS } from "./attack-damage-ability-modifier-choice.ts";
import { ATTACK_DAMAGE_DIE_FLOOR_CHOICE_SELECTIONS } from "./attack-damage-die-floor-choice.ts";
import type {
  FindFamiliarFormSelection,
  PactOfTheChainFindFamiliarFormSelection,
} from "@dnd/surface/surface/find-familiar-forms";
import { PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS } from "@dnd/surface/surface/find-familiar-forms";
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
  BattleRuntimeObjectSchema,
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
  BRUTAL_STRIKE_DECISION_CHOICES,
  TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES,
} from "../unit-feature-support.ts";
import type {
  ActiveOngoingFeatureOccurrenceSnapshotEncoded,
  BattleDroppedObjectOutcome,
  BattleFill,
  BattleObjectIgnitionOutcome,
  BattleShovePushOutcome,
  BattleSpellAreaChoice,
  BattleTargetSpatialFact,
  BattleHole,
  WildShapeEquipmentDispositionChoice,
  WildShapeLoadoutObjectRef,
} from "../battle-reducer.ts";
const FindFamiliarFormSelectionSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("normalNamedForm"),
    formId: Schema.NonEmptyTrimmedString,
  }),
  Schema.Struct({
    tag: Schema.Literal("challengeRatingZeroBeast"),
    statBlockId: Schema.NonEmptyTrimmedString,
  }),
  // Cast evidence is local to this union: the discriminants match
  // FindFamiliarFormSelection exactly, and the id aliases are runtime
  // non-empty strings whose provenance is checked when resolving the catalog.
  // Effect Schema infers plain strings here and cannot preserve those imported
  // content-id aliases through Schema.Union generics.
) as unknown as Schema.Schema<FindFamiliarFormSelection>;
const BattleCompanionResolvedStatBlockIdSchema =
  Schema.NonEmptyTrimmedString as unknown as Schema.Schema<
    StatBlockRecord["id"]
  >;
const BattleCompanionDurableIdSchema =
  Schema.NonEmptyTrimmedString as unknown as Schema.Schema<BattleCompanionDurableId>;
const BattleCompanionIdentitySchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("battleOnly") }),
  Schema.Struct({
    tag: Schema.Literal("retainedBetweenBattles"),
    durableCompanionId: BattleCompanionDurableIdSchema,
  }),
);
const BattleCompanionProtocolSchema = Schema.Struct({
  tag: Schema.Literal(...RETAINED_COMPANION_PROTOCOL_TAGS),
}) as unknown as Schema.Schema<BattleCompanionProtocol>;
const PactOfTheChainSpecialFormIdSchema = pactOfTheChainSpecialFormIdSchema();
const PactOfTheChainFindFamiliarFormSelectionSchema = Schema.Union(
  FindFamiliarFormSelectionSchema,
  Schema.Struct({
    tag: Schema.Literal("pactOfTheChainSpecialForm"),
    formId: PactOfTheChainSpecialFormIdSchema,
  }),
  // Cast evidence is local to this union: it widens the base Find Familiar
  // selection schema with the Pact-only special-form discriminant.
) as unknown as Schema.Schema<PactOfTheChainFindFamiliarFormSelection>;

function pactOfTheChainSpecialFormIdSchema() {
  const [first, ...rest] = PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS.map(
    (ref) => ref.formId,
  );
  return Schema.Literal(first, ...rest);
}
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
  // Cast evidence is local to this union: both placement variants and their
  // optional branded position ids are parsed here. Effect Schema keeps the
  // structure but does not infer the imported discriminated union type.
) as unknown as Schema.Schema<BattleCompanionPlacement>;
// Hp is a branded non-negative integer number. Effect Schema validates the
// runtime number shape here; the brand is erased at runtime, and Schema has no
// helper that preserves this repo's nominal brand through numeric filters.
const HpSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
) as unknown as Schema.Schema<Hp, number, never>;
const PositiveHpSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
) as unknown as Schema.Schema<Hp, number, never>;
const InitiativeScoreSchema = Schema.Number.pipe(
  Schema.int(),
) as unknown as Schema.Schema<InitiativeScore, number, never>;
const BattleCompanionHitPointsSchema = Schema.Struct({
  currentHp: PositiveHpSchema,
  tempHp: HpSchema,
});
// BattleArmorClass and shared ArmorClass are both runtime numbers validated by
// the shared schema. Their brands are compile-time-only, so this cast narrows
// the already-validated shared AC schema to the battle boundary's AC alias.
const BattleArmorClassSchema = SharedArmorClass as unknown as Schema.Schema<
  BattleArmorClass,
  number,
  never
>;

type WeaponDamageDiceRollChoiceSelection = "first" | "second";

type WeaponDamageDiceRollChoiceFillEncoded = {
  readonly unitId: string;
  readonly selection: WeaponDamageDiceRollChoiceSelection;
  readonly candidates: readonly [
    { readonly results: readonly [number, ...number[]] },
    { readonly results: readonly [number, ...number[]] },
  ];
};
type AttackDamageDieFloorChoiceFillEncoded = {
  readonly unitId: string;
  readonly selection: (typeof ATTACK_DAMAGE_DIE_FLOOR_CHOICE_SELECTIONS)[number];
};
type AttackDamageAbilityModifierChoiceFillEncoded = {
  readonly unitId: string;
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

const OngoingFeatureSourceSchema = Schema.Struct({
  kind: Schema.Literal("unit"),
  unitId: Schema.String,
});

export const ActiveOngoingFeatureOccurrenceSnapshotSchema: Schema.Schema<
  ActiveOngoingFeatureOccurrenceSnapshotEncoded,
  ActiveOngoingFeatureOccurrenceSnapshotEncoded,
  never
> = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("turnBoundary"),
    expiresAt: OngoingFeatureExpirationSchema,
    source: OngoingFeatureSourceSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("roundExtended"),
    expiresAt: EndOfTurnOngoingFeatureExpirationSchema,
    maxExpiresAt: EndOfTurnOngoingFeatureExpirationSchema,
    source: OngoingFeatureSourceSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("fixedDuration"),
    expiresAt: EndOfTurnOngoingFeatureExpirationSchema,
    source: OngoingFeatureSourceSchema,
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

const D20TestNaturalOneRerollHoleOptionsSchema = {
  d20TestNaturalOneRerolls: Schema.optionalWith(
    Schema.Array(
      Schema.Struct({
        effectKind: Schema.Literal("d20_test_natural_one_reroll"),
        label: Schema.String,
      }),
    ),
    { exact: true },
  ),
} as const;

// Effect Schema infers branded ids as their encoded string representation;
// these local schemas brand objectId before runtime use and leave unitId as
// the UnitRecord id string used by loadout references.
const WildShapeArmorLoadoutObjectRefSchema = Schema.Struct({
  kind: Schema.Literal("armor"),
  objectId: BattleObjectId,
  unitId: Schema.String,
});
const WildShapeShieldLoadoutObjectRefSchema = Schema.Struct({
  kind: Schema.Literal("shield"),
  objectId: BattleObjectId,
  unitId: Schema.String,
});
const WildShapeMainWeaponLoadoutObjectRefSchema = Schema.Struct({
  kind: Schema.Literal("mainWeapon"),
  objectId: BattleObjectId,
  unitId: Schema.String,
});
const WildShapeOffHandWeaponLoadoutObjectRefSchema = Schema.Struct({
  kind: Schema.Literal("offHandWeapon"),
  objectId: BattleObjectId,
  unitId: Schema.String,
});

const WildShapeWornLoadoutObjectRefSchema: Schema.Schema<WildShapeWornLoadoutObjectRef> =
  Schema.Union(
    WildShapeArmorLoadoutObjectRefSchema,
    WildShapeShieldLoadoutObjectRefSchema,
    WildShapeMainWeaponLoadoutObjectRefSchema,
    WildShapeOffHandWeaponLoadoutObjectRefSchema,
  ) as unknown as Schema.Schema<WildShapeWornLoadoutObjectRef>;

const WildShapeLoadoutObjectRefSchema: Schema.Schema<WildShapeLoadoutObjectRef> =
  Schema.Union(
    WildShapeArmorLoadoutObjectRefSchema,
    WildShapeShieldLoadoutObjectRefSchema,
    WildShapeMainWeaponLoadoutObjectRefSchema,
    WildShapeOffHandWeaponLoadoutObjectRefSchema,
  ) as unknown as Schema.Schema<WildShapeLoadoutObjectRef>;

const WildShapeEquipmentDispositionChoiceSchema: Schema.Schema<WildShapeEquipmentDispositionChoice> =
  // The union schema below mirrors the discriminated choice type. The cast is
  // only needed because Effect Schema cannot infer the nested branded refs
  // through this union precisely.
  Schema.Union(
    Schema.Struct({
      item: WildShapeLoadoutObjectRefSchema,
      disposition: Schema.Literal("falls", "merges"),
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
          fallback: Schema.Literal("falls", "merges"),
        }),
      ),
    }),
  ) as unknown as Schema.Schema<WildShapeEquipmentDispositionChoice>;

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
  // Effect Schema infers the exact-forbidden optional fields as broader
  // output than this tagged union; the branches above enumerate every
  // BattleSpellAreaChoice encoding shape, so the codec boundary is aligned.
) as unknown as Schema.Schema<
  BattleSpellAreaChoice,
  BattleSpellAreaChoiceEncoded,
  never
>;

const BattleObjectIgnitionDispositionSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("flammableUnattended") }),
  Schema.Struct({ kind: Schema.Literal("notFlammable") }),
  Schema.Struct({ kind: Schema.Literal("wornOrCarried") }),
);

const BattleTargetSpatialFactSchema = Schema.Union(
  Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("attackTargetInMeleeReach"),
      actorId: CombatantId,
      targetId: CombatantId,
      procedureRef: BattleAttackProcedureExecutionRef,
      attackAbility: BattleAttackExecutionAbilitySchema,
      attackDamageType: DamageTypeSchema,
      attackName: Schema.optionalWith(Schema.Never, { exact: true }),
    }),
    Schema.Struct({
      kind: Schema.Literal("attackTargetInMeleeReach"),
      actorId: CombatantId,
      targetId: CombatantId,
      procedureRef: BattleStatBlockProcedureExecutionRef,
      attackAbility: Schema.optionalWith(Schema.Never, { exact: true }),
      attackDamageType: Schema.optionalWith(Schema.Never, { exact: true }),
      attackName: Schema.optionalWith(Schema.Never, { exact: true }),
    }),
  ),
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
      kind: Schema.Literal("attackTargetInRangedRange"),
      actorId: CombatantId,
      targetId: CombatantId,
      procedureRef: BattleAttackProcedureExecutionRef,
      attackAbility: BattleAttackExecutionAbilitySchema,
      attackDamageType: DamageTypeSchema,
      attackName: Schema.optionalWith(Schema.Never, { exact: true }),
      rangeBand: Schema.Literal(...BATTLE_ATTACK_RANGE_BANDS),
    }),
    Schema.Struct({
      kind: Schema.Literal("attackTargetInRangedRange"),
      actorId: CombatantId,
      targetId: CombatantId,
      procedureRef: BattleStatBlockProcedureExecutionRef,
      attackAbility: Schema.optionalWith(Schema.Never, { exact: true }),
      attackDamageType: Schema.optionalWith(Schema.Never, { exact: true }),
      attackName: Schema.optionalWith(Schema.Never, { exact: true }),
      rangeBand: Schema.Literal(...BATTLE_ATTACK_RANGE_BANDS),
    }),
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
) as unknown as Schema.Schema<BattleTargetSpatialFact, unknown, never>;
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

export const BattleObjectDamageOutcomeSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("hitPoints"),
    objectId: BattleObjectId,
    damageType: DamageTypeSchema,
    rolledDamage: DamageAmount,
    effectiveDamage: DamageAmount,
    priorHitPoints: HpSchema,
    nextHitPoints: HpSchema,
    destroyed: Schema.Boolean,
  }),
  Schema.Struct({
    kind: Schema.Literal("tableResolved"),
    objectId: BattleObjectId,
    damageType: DamageTypeSchema,
    rolledDamage: DamageAmount,
  }),
);

// Effect Schema encodes branded ids as plain strings at the JSON boundary; the
// decoder restores the domain brands before the value reaches runtime code.
export const BattleObjectIgnitionOutcomeSchema = Schema.Struct({
  kind: Schema.Literal("startsBurning"),
  objectId: BattleObjectId,
  sourceCombatantId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
}) as unknown as Schema.Schema<BattleObjectIgnitionOutcome>;

// Effect Schema encodes branded ids as plain strings at the JSON boundary; the
// decoder restores the domain brands before the value reaches runtime code.
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
      kind: Schema.Literal("druidWildShape"),
      procedureRef: BattleProcedureExecutionRef,
      formExecutionRef: BattleStatBlockExecutionScopeRef,
    }),
  ),
}) as unknown as Schema.Schema<BattleDroppedObjectOutcome>;

// Effect Schema encodes branded ids as plain strings at the JSON boundary; the
// decoder restores the domain brands before the value reaches runtime code.
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
}) as unknown as Schema.Schema<BattleShovePushOutcome>;

const BattleSavingThrowRollModeProjectionSchema = Schema.Struct({
  targetId: CombatantId,
  rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
});

const BattleSavingThrowFlatBonusProjectionSchema = Schema.Struct({
  targetId: CombatantId,
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

const BattleProcedureSourceSchema = {
  targetId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
  sourceCombatantId: CombatantId,
} as const;

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

const BattleHolePayloadSchema = exhaustiveBattleHoleSchema(
  Schema.Union(
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
          requiresKnownWillingTarget: Schema.optionalWith(
            Schema.Literal(true),
            {
              exact: true,
            },
          ),
        }),
        { exact: true },
      ),
      attack: Schema.optionalWith(
        Schema.Struct({
          actorId: CombatantId,
          selection: BattleAttackExecutionSelectionSchema,
          targetConstraint: Schema.Literal("meleeReach", "rangedRange"),
        }),
        { exact: true },
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
      requiresKnownWillingTargets: Schema.optionalWith(Schema.Literal(true), {
        exact: true,
      }),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("targetSpatialFacts"),
      label: Schema.String,
      spellBeingCast: Schema.Struct({
        casterId: CombatantId,
        spellId: SpellId,
        castLevel: Schema.Number,
        components: Schema.Array(Schema.Literal("V", "S", "M")),
      }),
      requiresTableSpatialFact: Schema.Literal(true),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("slowSomaticSpellFailureOutcome"),
      actorId: CombatantId,
      spellId: SpellId,
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
        unitId: Schema.String,
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
      spellId: Schema.String,
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
      areaChoices: Schema.Tuple(),
      targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
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
      toolIds: Schema.Tuple(Schema.Literal("poisoners_kit")),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("cunningStrikeEndTurnCoverFacts"),
      actorId: CombatantId,
      coverDegrees: Schema.Array(
        Schema.Literal(...CUNNING_STRIKE_END_TURN_COVER_DEGREES),
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
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("spellTargetList"),
      sourceProcedureRef: BattleProcedureExecutionRef,
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
      requiresKnownWillingTargets: Schema.optionalWith(Schema.Literal(true), {
        exact: true,
      }),
      relationshipFactRequest: Schema.optionalWith(
        BattleSpellTargetListRelationshipFactRequestSchema,
        { exact: true },
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("attackRoll"),
      rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
        exact: true,
      }),
      creatureAttack: Schema.Struct({
        actorId: CombatantId,
        targetId: CombatantId,
      }),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("attackRoll"),
      attack: SupportedAttackActionOptionSchema,
      attackBonus: AttackBonus,
      rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
        exact: true,
      }),
      ongoingFeatureActivations: Schema.optionalWith(
        Schema.Array(
          Schema.Struct({
            unitId: Schema.String,
            label: Schema.String,
            rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
          }),
        ),
        { exact: true },
      ),
      missToHitReplacements: Schema.optionalWith(
        Schema.Array(
          Schema.Struct({
            unitId: Schema.String,
            label: Schema.String,
          }),
        ),
        { exact: true },
      ),
      d20TestNaturalOneRerolls: Schema.optionalWith(
        Schema.Array(
          Schema.Struct({
            effectKind: Schema.Literal("d20_test_natural_one_reroll"),
            label: Schema.String,
          }),
        ),
        { exact: true },
      ),
      relationshipFactRequest: Schema.optionalWith(
        BattleAttackRollRelationshipFactRequestSchema,
        { exact: true },
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("attackRoll"),
      attackBonus: AttackBonus,
      sourceProcedureRef: BattleProcedureExecutionRef,
      rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
        exact: true,
      }),
      missToHitReplacements: Schema.optionalWith(
        Schema.Array(
          Schema.Struct({
            unitId: Schema.String,
            label: Schema.String,
          }),
        ),
        { exact: true },
      ),
      spellAttackRerolls: Schema.optionalWith(
        Schema.Array(
          Schema.Struct({
            effectKind: Schema.Literal("missed_spell_attack_reroll"),
            label: Schema.String,
            sorceryPointCost: ResourceCount,
          }),
        ),
        { exact: true },
      ),
      d20TestNaturalOneRerolls: Schema.optionalWith(
        Schema.Array(
          Schema.Struct({
            effectKind: Schema.Literal("d20_test_natural_one_reroll"),
            label: Schema.String,
          }),
        ),
        { exact: true },
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("rolledDice"),
      creatureAttack: Schema.Struct({
        actorId: CombatantId,
        targetId: CombatantId,
      }),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("rolledDice"),
      attack: SupportedAttackActionOptionSchema,
      critical: Schema.Boolean,
      attackDamageRiders: Schema.optionalWith(
        Schema.Array(
          Schema.Struct({
            attackerId: CombatantId,
            unitId: Schema.String,
            label: Schema.String,
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
        Schema.Array(BattleRuntimeObjectSchema),
        { exact: true },
      ),
      spellMarkedDamageRiders: Schema.optionalWith(
        Schema.Array(BattleRuntimeObjectSchema),
        { exact: true },
      ),
      cunningStrikeOptions: Schema.optionalWith(
        Schema.Array(BattleRuntimeObjectSchema),
        { exact: true },
      ),
      weaponDamageDiceRollChoiceUnitIds: Schema.optionalWith(
        Schema.Array(Schema.String),
        { exact: true },
      ),
      attackDamageDieFloorChoiceUnitIds: Schema.optionalWith(
        Schema.NonEmptyArray(Schema.String),
        { exact: true },
      ),
      attackDamageAbilityModifierChoice: Schema.optionalWith(
        Schema.Struct({
          unitIds: Schema.NonEmptyArray(Schema.String),
          appliedDamageAbilityModifier: AbilityModifier,
          declinedDamageAbilityModifier: AbilityModifier,
        }),
        { exact: true },
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("rolledDice"),
      critical: Schema.Boolean,
      spellMarkedDamageRiders: Schema.optionalWith(
        Schema.Array(BattleRuntimeObjectSchema),
        { exact: true },
      ),
      spellDamageRerolls: Schema.optionalWith(
        Schema.Array(
          Schema.Struct({
            effectKind: Schema.Literal("damage_dice_reroll"),
            label: Schema.String,
            sorceryPointCost: ResourceCount,
            maximumSelectedDice: Schema.Number.pipe(Schema.int()),
          }),
        ),
        { exact: true },
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("rolledDice"),
      dragonsBreath: Schema.Struct({
        sourceCombatantId: CombatantId,
        sourceProcedureRef: BattleProcedureExecutionRef,
        damageType: DamageTypeSchema,
        expr: BattleRuntimeObjectSchema,
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
          expr: BattleRuntimeObjectSchema,
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
        remainingDuplicates: Schema.Literal(...MIRROR_IMAGE_DUPLICATE_COUNTS),
        dieSize: Schema.Literal(MIRROR_IMAGE_DUPLICATE_DIE_SIZE),
        successAtLeast: Schema.Literal(MIRROR_IMAGE_DUPLICATE_SUCCESS_AT_LEAST),
      }),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("rolledDice"),
      spellTurnStartDamage: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("rolledDice"),
      spellTurnEndDamage: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
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
          expr: BattleRuntimeObjectSchema,
          damageType: Schema.Literal("piercing"),
        }),
      }),
      critical: Schema.Literal(false),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("rolledDice"),
      insectPlagueAreaHazard: BattleRuntimeObjectSchema,
      critical: Schema.Literal(false),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("rolledDice"),
      cloudkillAreaHazard: BattleRuntimeObjectSchema,
      critical: Schema.Literal(false),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("rolledDice"),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("skillChoice"),
      sourceProcedureRef: BattleProcedureExecutionRef,
      label: Schema.String,
      choices: Schema.Array(Schema.Literal(...BATTLE_SURFACE_SKILLS)),
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
      choices: Schema.NonEmptyArray(Schema.Literal(...ALL_CONDITIONS)),
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
      choices: Schema.Array(Schema.Literal(...COMMAND_OPTIONS)),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("selfTransformationModeChoice"),
      sourceProcedureRef: BattleProcedureExecutionRef,
      label: Schema.String,
      choices: Schema.NonEmptyArray(
        Schema.Literal(...SELF_TRANSFORMATION_MODE_KINDS),
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("dancingLightsPlacement"),
      sourceProcedureRef: BattleProcedureExecutionRef,
      label: Schema.String,
      mode: Schema.Literal("cast", "reposition"),
      form: Schema.Literal("separateLights", "combinedMediumForm"),
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
      mode: Schema.Literal("cast", "reposition"),
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
      areaChoices: Schema.Tuple(),
      targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      label: Schema.String,
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
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
      areaChoices: Schema.Tuple(),
      targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      label: Schema.String,
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      label: Schema.String,
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      label: Schema.String,
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      label: Schema.String,
      insectPlagueAreaHazard: Schema.Struct({
        ...BattleProcedureSourceSchema,
        areaId: BattleAreaId,
        trigger: Schema.Literal(
          "appearsInArea",
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      label: Schema.String,
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
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
        condition: Schema.Literal(...ALL_CONDITIONS),
        save: SpellConditionRepeatSaveSchema,
      }),
      ability: AbilitySchema,
      dc: DcSourceSchema,
      areaChoices: EmptySpellAreaChoicesSchema,
      targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      label: Schema.String,
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      label: Schema.String,
      unitFeatureConditionEndTurnSave: Schema.Struct({
        ...BattleProcedureSourceSchema,
        condition: Schema.Literal(...ALL_CONDITIONS),
        save: SpellConditionRepeatSaveSchema,
      }),
      ability: AbilitySchema,
      dc: DcSourceSchema,
      areaChoices: EmptySpellAreaChoicesSchema,
      targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      label: Schema.String,
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      label: Schema.String,
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
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
        relevantEffect: Schema.Literal("charmed", "frightened", "possession"),
        save: SpellConditionRepeatSaveSchema,
      }),
      ability: AbilitySchema,
      dc: DcSourceSchema,
      areaChoices: EmptySpellAreaChoicesSchema,
      targetRollModes: Schema.Array(BattleSavingThrowRollModeProjectionSchema),
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
      relationshipFactRequest: Schema.optionalWith(
        BattleSavingThrowRelationshipFactRequestSchema,
        { exact: true },
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
      ...D20TestNaturalOneRerollHoleOptionsSchema,
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("savingThrowOutcome"),
      label: Schema.String,
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
      relationshipFactRequest: Schema.optionalWith(
        BattleSavingThrowRelationshipFactRequestSchema,
        { exact: true },
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
      choices: Schema.Union(
        Schema.Tuple(Schema.Literal("use"), Schema.Literal("decline")),
        Schema.Tuple(Schema.Literal("attempt"), Schema.Literal("decline")),
        Schema.Tuple(
          Schema.Literal(BRUTAL_STRIKE_DECISION_CHOICES[0]),
          Schema.Literal(BRUTAL_STRIKE_DECISION_CHOICES[1]),
          Schema.Literal(BRUTAL_STRIKE_DECISION_CHOICES[2]),
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
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("deathSavingThrow"),
      label: Schema.String,
      combatantId: CombatantId,
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
      targetFlatBonuses: Schema.Array(
        BattleSavingThrowFlatBonusProjectionSchema,
      ),
      rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
        exact: true,
      }),
      ...D20TestNaturalOneRerollHoleOptionsSchema,
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("interruptDecision"),
      label: Schema.String,
      trigger: Schema.Literal(...BATTLE_INTERRUPT_TRIGGERS),
      eligibleResponders: Schema.Array(CombatantId),
    }),
    Schema.Struct({
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
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("levitateAltitudeChange"),
      label: Schema.String,
      actorId: CombatantId,
      targetId: CombatantId,
      maxDistanceFeet: MovementFeet,
      directions: Schema.Array(Schema.Literal("up", "down")),
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
      skill: Schema.Literal(...BATTLE_SURFACE_SKILLS),
      dc: DifficultyClass,
      rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
        exact: true,
      }),
      ...D20TestNaturalOneRerollHoleOptionsSchema,
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("spellcastingAbilityCheck"),
      label: Schema.String,
      dc: DifficultyClass,
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
      relationshipFactRequest: Schema.optionalWith(
        BattleSavingThrowRelationshipFactRequestSchema,
        { exact: true },
      ),
      mode: Schema.Literal("grappleSave", "escapeCheck"),
      rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
        exact: true,
      }),
    }),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("shoveOutcome"),
      label: Schema.String,
      actorId: CombatantId,
      targetId: CombatantId,
      dc: DifficultyClass,
      relationshipFactRequest: Schema.optionalWith(
        BattleSavingThrowRelationshipFactRequestSchema,
        { exact: true },
      ),
    }),
    Schema.Union(
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
        relationshipFactRequest: Schema.optionalWith(
          Schema.Struct({
            kind: Schema.Literal("attackRollTargetIsEnemy"),
            attackerId: CombatantId,
          }),
          { exact: true },
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
    ),
    Schema.Struct({
      ...BattleHoleBaseSchema,
      kind: Schema.Literal("attackDamageDisposition"),
      label: Schema.String,
      attackerId: CombatantId,
      targetId: CombatantId,
      choices: Schema.Array(
        Schema.Union(
          Schema.Struct({ kind: Schema.Literal("ordinaryDamage") }),
          Schema.Struct({ kind: Schema.Literal("knockOut") }),
          Schema.Struct({
            kind: Schema.Literal("zeroHitPointReplacement"),
            unitId: Schema.String,
          }),
        ),
      ),
    }),
  ),
);

export const BattleHoleSchema = BattleHolePayloadSchema.pipe(
  Schema.filter((hole) => !("spell" in hole) && !("unit" in hole), {
    message: () =>
      "Battle holes must contain execution facts, not authored spell or unit payloads.",
  }),
).annotations({ identifier: "BattleHole" });

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
  activatedOngoingFeatureUnitId: Schema.optionalWith(Schema.String, {
    exact: true,
  }),
  missToHitReplacementUnitId: Schema.optionalWith(Schema.String, {
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

type BattleFillEncoded =
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
      readonly spatialFacts?: readonly unknown[];
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
      readonly spatialFacts: readonly unknown[];
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
        readonly choices: readonly WildShapeEquipmentDispositionChoice[];
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
        readonly activatedOngoingFeatureUnitId?: string;
        readonly missToHitReplacementUnitId?: string;
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
        | (typeof BRUTAL_STRIKE_DECISION_CHOICES)[number]
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
      readonly spatialFacts: readonly unknown[];
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
      readonly value: BattleCompanionPlacement;
    }
  | {
      readonly kind: "companionReappearanceInitiative";
      readonly holeId: string;
      readonly value: number;
    }
  | {
      readonly kind: "creatureAttackZeroDamage";
      readonly holeId: string;
      readonly creatureAttack: {
        readonly actorId: string;
        readonly targetId: string;
      };
    }
  | {
      readonly kind: "rolledDice";
      readonly holeId: string;
      readonly selectedAttackDamageRiderUnitIds?: readonly string[];
      readonly cunningStrikeOption?: {
        readonly unitId: string;
        readonly optionId: (typeof BATTLE_CUNNING_STRIKE_OPTION_SELECTION_IDS)[number];
      };
      readonly weaponDamageDiceRollChoice?: WeaponDamageDiceRollChoiceFillEncoded;
      readonly attackDamageDieFloorChoice?: AttackDamageDieFloorChoiceFillEncoded;
      readonly attackDamageAbilityModifierChoice?: AttackDamageAbilityModifierChoiceFillEncoded;
      readonly value: readonly [
        {
          readonly results: readonly [number, ...number[]];
        },
        ...{
          readonly results: readonly [number, ...number[]];
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
          readonly expr: typeof BattleRuntimeObjectSchema;
          readonly damageType: "piercing";
        };
      };
      readonly value: readonly [
        {
          readonly results: readonly [number, ...number[]];
        },
        ...{
          readonly results: readonly [number, ...number[]];
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
            readonly unitId: string;
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
                  readonly spatialFacts: readonly unknown[];
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
      readonly value: {
        readonly speedKind: BattleMovementSpeedKind;
        readonly movementCostFeet: number;
        readonly provokedOpportunityAttacks: readonly ({
          readonly reactorId: string;
        } & BattleInterruptAttackExecutionSelectionEncoded)[];
        readonly acrobaticMovement?: {
          readonly kind: "acrobaticMovement";
          readonly paths: readonly [
            "alongVerticalSurface" | "acrossLiquid",
            ...("alongVerticalSurface" | "acrossLiquid")[],
          ];
          readonly withoutFallingDuringMovement: true;
        };
        readonly areaDifficultTerrain?: {
          readonly kind: "areaDifficultTerrain";
          readonly sources: readonly (
            | {
                readonly kind: "greaseGroundHazard";
                readonly sourceCombatantId: string;
                readonly sourceProcedureRef: string;
                readonly areaId: string;
              }
            | {
                readonly kind: "webAreaHazard";
                readonly sourceCombatantId: string;
                readonly sourceProcedureRef: string;
                readonly areaId: string;
              }
            | {
                readonly kind: "sleetStormHazard";
                readonly sourceCombatantId: string;
                readonly sourceProcedureRef: string;
                readonly areaId: string;
              }
            | {
                readonly kind: "insectPlagueHazard";
                readonly sourceCombatantId: string;
                readonly sourceProcedureRef: string;
                readonly areaId: string;
              }
            | {
                readonly kind: "spikeGrowthHazard";
                readonly sourceCombatantId: string;
                readonly sourceProcedureRef: string;
                readonly areaId: string;
                readonly damageDistanceFeet: number;
              }
          )[];
          readonly totalDistanceFeet: number;
          readonly difficultTerrainDistanceFeet: number;
        };
        readonly gustOfWindLineMovement?: {
          readonly kind: "gustOfWindLineMovement";
          readonly sourceCombatantId: string;
          readonly sourceProcedureRef: string;
          readonly areaId: string;
          readonly directionId: string;
          readonly totalDistanceFeet: number;
          readonly closerDistanceFeet: number;
        };
        readonly grappleDrag?: {
          readonly kind: "grappleDrag";
          readonly totalDistanceFeet: number;
          readonly targets: readonly {
            readonly targetId: string;
            readonly distanceFeet: number;
          }[];
        };
        readonly creatureSpaceTraversal?: {
          readonly kind: "occupiedCreatureSpaceTraversal";
          readonly occupiedSpaces: readonly {
            readonly occupantId: string;
            readonly positionId: string;
          }[];
          readonly destination:
            | {
                readonly kind: "unoccupiedSpace";
                readonly positionId: string;
              }
            | {
                readonly kind: "occupiedCreatureSpace";
                readonly occupantId: string;
                readonly positionId: string;
              };
        };
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
      };
    }
  | {
      readonly kind: "levitateAltitudeChange";
      readonly holeId: string;
      readonly value: {
        readonly direction: "up" | "down";
        readonly distanceFeet: number;
      };
      readonly spatialFacts: readonly unknown[];
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

export const BattleFillSchema: Schema.Schema<
  BattleFill,
  BattleFillEncoded,
  never
> = Schema.suspend(() =>
  Schema.Union(
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
        itemId: Schema.NonEmptyTrimmedString,
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
        ...BRUTAL_STRIKE_DECISION_CHOICES,
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
      kind: Schema.Literal("creatureAttackZeroDamage"),
      holeId: BattleHoleIdSchema,
      creatureAttack: Schema.Struct({
        actorId: CombatantId,
        targetId: CombatantId,
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("rolledDice"),
      holeId: BattleHoleIdSchema,
      selectedAttackDamageRiderUnitIds: Schema.optionalWith(
        Schema.Array(Schema.String),
        { exact: true },
      ),
      cunningStrikeOption: Schema.optionalWith(
        Schema.Struct({
          unitId: Schema.String,
          optionId: Schema.Literal(
            ...BATTLE_CUNNING_STRIKE_OPTION_SELECTION_IDS,
          ),
        }),
        { exact: true },
      ),
      weaponDamageDiceRollChoice: Schema.optionalWith(
        Schema.Struct({
          unitId: Schema.String,
          selection: Schema.Literal("first", "second"),
          candidates: Schema.Tuple(
            BattleRolledDiceGroupSchema,
            BattleRolledDiceGroupSchema,
          ),
        }),
        { exact: true },
      ),
      attackDamageDieFloorChoice: Schema.optionalWith(
        Schema.Struct({
          unitId: Schema.String,
          selection: AttackDamageDieFloorChoiceSelectionSchema,
        }),
        { exact: true },
      ),
      attackDamageAbilityModifierChoice: Schema.optionalWith(
        Schema.Struct({
          unitId: Schema.String,
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
          unitId: Schema.String,
        }),
      ),
    }),
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
    }),
    Schema.Struct({
      kind: Schema.Literal("movement"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        speedKind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
        movementCostFeet: MovementFeet,
        provokedOpportunityAttacks: Schema.Array(
          Schema.extend(
            Schema.Struct({ reactorId: CombatantId }),
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
            targets: Schema.Array(
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
            occupiedSpaces: Schema.Array(
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
        commandApproach: Schema.optionalWith(
          Schema.Struct({
            kind: Schema.Literal(
              "commandApproachShortestDirectRouteTowardCaster",
            ),
            movedWithinFiveFeetOfCaster: Schema.Boolean,
          }),
          { exact: true },
        ),
        commandFlee: Schema.optionalWith(
          Schema.Struct({
            kind: Schema.Literal(
              "commandFleeFastestAvailableRouteAwayFromCaster",
            ),
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
      }),
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
  bonusActionAvailable: Schema.Boolean,
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
  attackDamageRidersUsedThisTurn: Schema.Array(
    Schema.Struct({
      attackerId: CombatantId,
      unitId: Schema.String,
    }),
  ),
  stunningStrikesUsedThisTurn: Schema.Array(
    Schema.Struct({
      attackerId: CombatantId,
      unitId: Schema.String,
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
      unitId: Schema.String,
    }),
  ),
  weaponMasteryCleaveAttackersUsedThisTurn: Schema.Array(CombatantId),
  huntersPreyHordeBreakerUsedThisTurn: Schema.Array(
    Schema.Struct({
      attackerId: CombatantId,
      unitId: Schema.String,
    }),
  ),
  grapplerPunchAndGrabUsedThisTurn: Schema.Array(CombatantId),
  lightWeaponAttackMade: Schema.optionalWith(
    Schema.Struct({ weaponItemId: Schema.String }),
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

// Cast evidence: the attack mechanics pass the executable support refinement at
// this persistence boundary; the remaining fields are encoded exhaustively.
const StatBlockAttackProcedureSchema = Schema.Struct({
  kind: Schema.Literal("attack"),
  section: Schema.Literal("actions", "legendaryActions"),
  attack: CreatureNamedAttackRollSchema.pipe(
    Schema.omit("name", "description", "limitedUse"),
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
}) as unknown as Schema.Schema<StatBlockAttackProcedure>;

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

const BattleCreatureOriginSnapshotSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("character"),
    characterId: Schema.String,
    execution: Schema.Struct({
      scopeRef: BattleCharacterExecutionScopeRef,
      nextProcedureOrdinal: BattleProcedureExecutionCursor,
      procedureBindings: Schema.Array(
        Schema.Struct({
          procedureRef: BattleProcedureExecutionRef,
          procedure: Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("unitFeature"),
              supportKind: Schema.Literal(
                ...BATTLE_UNIT_SUPPORT_PROFILES,
                "extraActionGrant",
                "selfBonusActionHealing",
                "ongoingFeature",
              ),
            }),
            Schema.Struct({
              kind: Schema.Literal("unitSupportProfile"),
              supportKind: Schema.Literal(...BATTLE_UNIT_SUPPORT_PROFILES),
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
  }),
  Schema.Struct({
    kind: Schema.Literal("statBlock"),
    statBlockId: Schema.String,
    execution: StatBlockExecutionSnapshotSchema,
  }),
);

const BattleCreatureSnapshotSchema = Schema.Struct({
  combatantId: CombatantId,
  displayName: Schema.String,
  initiative: Schema.Number,
  origin: BattleCreatureOriginSnapshotSchema,
  hp: Schema.Number,
  maxHp: Schema.Number,
  tempHp: Schema.Number,
  nextActiveEffectOrdinal: BattleActiveEffectExecutionOrdinal,
  activeEffectRefs: Schema.Array(BattleActiveEffectExecutionRef),
  armorClass: Schema.Number,
  size: Schema.String,
  zeroHpLifecycle: BattleCreatureZeroHpLifecycleSnapshotSchema,
  conditions: Schema.Array(Schema.Literal(...ALL_CONDITIONS)),
  concentrating: Schema.Boolean,
  dodging: Schema.Boolean,
  reactionAvailable: Schema.Boolean,
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
}).pipe(
  Schema.filter(
    (snapshot) => {
      if (
        new Set(snapshot.activeEffectRefs).size !==
        snapshot.activeEffectRefs.length
      ) {
        return false;
      }
      if (
        !snapshot.activeEffectRefs.every((effectRef) =>
          battleActiveEffectExecutionRefOrdinalIsBefore(
            effectRef,
            snapshot.origin.execution.scopeRef,
            snapshot.nextActiveEffectOrdinal,
          ),
        )
      ) {
        return false;
      }
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
    },
    {
      message: () =>
        "Execution scopes, procedure refs, resource refs, and active-effect refs must be unique and owned by their combatant.",
    },
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

export const BattleActPresentationSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("intrinsic") }),
  Schema.Struct({ kind: Schema.Literal("attack"), name: Schema.String }),
  Schema.Struct({
    kind: Schema.Literal("spell"),
    procedureRef: BattleProcedureExecutionRef,
    invocation: SpellInvocationRefSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("unit"),
    procedureRef: BattleProcedureExecutionRef,
    unitId: Schema.String,
  }),
  Schema.Struct({
    kind: Schema.Literal("druidWildShapeForm"),
    procedureRef: BattleProcedureExecutionRef,
    unitId: Schema.String,
    formStatBlockId: Schema.String,
  }),
);

const BattleActExecutionCandidateSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  initialHoles: Schema.Array(BattleHoleSchema),
});

const BattleReadiedSpellSnapshotSchema = Schema.Struct({
  casterId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
  trigger: Schema.Literal(...BATTLE_READIED_SPELL_TRIGGERS),
  expiresAt: OngoingFeatureExpirationSchema,
});

const BattleReadiedMovementSnapshotSchema = Schema.Struct({
  actorId: CombatantId,
  trigger: Schema.Literal(...BATTLE_INTERRUPT_TRIGGERS),
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
    label: Schema.String,
    reduction: Schema.Struct({
      kind: Schema.Literal("rolled"),
      dice: Schema.Literal(1),
      flatModifier: Schema.Number,
      dieSize: Schema.Literal(6, 8, 10, 12),
      spends: Schema.Struct({
        resourceUnitId: Schema.String,
        amount: Schema.Literal(1),
      }),
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("attackDamageReduction"),
    procedureRef: BattleProcedureExecutionRef,
    label: Schema.String,
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
          resourceUnitId: Schema.String,
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
    label: Schema.String,
    reduction: Schema.Struct({
      kind: Schema.Literal("flat"),
      amount: DamageAmount,
    }),
  }),
);

const BattleInterruptProcedureChoiceSchema = Schema.Union(
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
).pipe(
  Schema.filter(
    (choice) => {
      if (choice.kind === "reactionRollOrDamageReduction") return true;
      if (choice.subject.tag !== "runtimeCommand") return false;
      if (choice.kind === "releaseReadiedSpell") {
        return (
          choice.subject.command === "releaseReadiedSpell" &&
          choice.reactorId === choice.readiedSpellCasterId &&
          choice.reactorId === choice.subject.readiedSpellCasterId
        );
      }
      if (choice.kind === "releaseReadiedMovement") {
        return (
          choice.subject.command === "releaseReadiedMovement" &&
          choice.reactorId === choice.readiedMovementActorId &&
          choice.reactorId === choice.subject.readiedMovementActorId
        );
      }
      if (choice.kind === "castTriggeredReactionSpell") {
        return (
          choice.subject.command === "castTriggeredReactionSpell" &&
          choice.reactorId === choice.subject.reactorId
        );
      }
      if (choice.kind === "castAttackHitBonusActionSpell") {
        return (
          choice.subject.command === "castAttackHitBonusActionSpell" &&
          choice.reactorId === choice.subject.casterId
        );
      }
      if (choice.kind === "opportunityAttack") {
        return (
          choice.subject.command === "opportunityAttack" &&
          choice.reactorId === choice.subject.reactorId
        );
      }
      return (
        choice.subject.command === "retaliationAttack" &&
        choice.reactorId === choice.subject.reactorId
      );
    },
    {
      message: () =>
        "Interrupt choices must own the matching reference-bearing runtime subject.",
    },
  ),
);

const BattlePendingReactionSnapshotSchema = Schema.Struct({
  trigger: Schema.Literal(...BATTLE_INTERRUPT_TRIGGERS),
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
  expiresAt: BattleRuntimeObjectSchema,
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
    expiresAt: BattleRuntimeObjectSchema,
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
    formSelection: FindFamiliarFormSelectionSchema,
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
    formSelection: PactOfTheChainFindFamiliarFormSelectionSchema,
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
    formSelection: FindFamiliarFormSelectionSchema,
    resolvedStatBlockId: BattleCompanionResolvedStatBlockIdSchema,
    creatureTypeOverride: FindFamiliarCreatureTypeOverrideSchema,
    hitPoints: BattleCompanionHitPointsSchema,
  }),
  Schema.Struct({
    status: Schema.Literal("temporarilyDismissed"),
    ownerId: CombatantId,
    identity: BattleCompanionIdentitySchema,
    protocol: BattleCompanionProtocolSchema,
    reappearanceCombatantId: CombatantId,
    formAccess: Schema.Literal("pactOfTheChain"),
    formSelection: PactOfTheChainFindFamiliarFormSelectionSchema,
    resolvedStatBlockId: BattleCompanionResolvedStatBlockIdSchema,
    creatureTypeOverride: FindFamiliarCreatureTypeOverrideSchema,
    hitPoints: BattleCompanionHitPointsSchema,
  }),
  Schema.Struct({
    status: Schema.Literal("disappearedAtZeroHitPoints"),
    ownerId: CombatantId,
    identity: BattleCompanionIdentitySchema,
    protocol: BattleCompanionProtocolSchema,
    formAccess: Schema.Literal("findFamiliar"),
    formSelection: FindFamiliarFormSelectionSchema,
    resolvedStatBlockId: BattleCompanionResolvedStatBlockIdSchema,
    creatureTypeOverride: FindFamiliarCreatureTypeOverrideSchema,
  }),
  Schema.Struct({
    status: Schema.Literal("disappearedAtZeroHitPoints"),
    ownerId: CombatantId,
    identity: BattleCompanionIdentitySchema,
    protocol: BattleCompanionProtocolSchema,
    formAccess: Schema.Literal("pactOfTheChain"),
    formSelection: PactOfTheChainFindFamiliarFormSelectionSchema,
    resolvedStatBlockId: BattleCompanionResolvedStatBlockIdSchema,
    creatureTypeOverride: FindFamiliarCreatureTypeOverrideSchema,
  }),
  // Cast evidence is local to this union: every snapshot variant is assembled
  // from the exact field schemas above, including branded combatant ids and
  // the familiar form/placement schemas. Effect Schema cannot infer the
  // exported BattleCompanionSnapshot alias after composing those nested schemas.
) as unknown as Schema.Schema<BattleCompanionSnapshot>;

type EncodedBattleCreatureSnapshot = typeof BattleCreatureSnapshotSchema.Type;
type EncodedBattleInterruptChoice =
  typeof BattleInterruptProcedureChoiceSchema.Type;
type EncodedBattleReadiedSpellSnapshot =
  typeof BattleReadiedSpellSnapshotSchema.Type;
type EncodedBattleActExecutionCandidate =
  typeof BattleActExecutionCandidateSchema.Type;
type EncodedBattleHole = typeof BattleHoleSchema.Type;

function isBattleExecutionReference(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (Schema.is(BattleProcedureExecutionRef)(value) ||
      Schema.is(BattleResourcePoolExecutionRef)(value) ||
      Schema.is(BattleActiveEffectExecutionRef)(value) ||
      Schema.is(BattleAttackExecutionScopeRef)(value) ||
      Schema.is(BattleCharacterExecutionScopeRef)(value) ||
      Schema.is(BattleStatBlockExecutionScopeRef)(value))
  );
}

function executionReferenceFieldName(fieldName: string): boolean {
  return /Ref(?:s)?$/.test(fieldName);
}

function battleExecutionReferencesIn(
  value: unknown,
  fieldName?: string,
): readonly string[] {
  if (
    fieldName !== undefined &&
    executionReferenceFieldName(fieldName) &&
    isBattleExecutionReference(value)
  )
    return [value];
  if (Array.isArray(value)) {
    return value.flatMap((entry) =>
      battleExecutionReferencesIn(entry, fieldName),
    );
  }
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, entry]) =>
    battleExecutionReferencesIn(entry, key),
  );
}

function authoritativeExecutionReferenceFieldName(fieldName: string): boolean {
  return (
    fieldName === "effectRef" ||
    fieldName === "activeEffectRefs" ||
    fieldName === "formExecutionRef" ||
    fieldName === "procedureRef" ||
    fieldName === "resourcePoolRef" ||
    fieldName === "resourcePoolRefs" ||
    fieldName === "scopeRef" ||
    (/ProcedureRef$/.test(fieldName) && !fieldName.startsWith("source"))
  );
}

function authoritativeBattleExecutionReferencesIn(
  value: unknown,
  fieldName?: string,
): readonly string[] {
  if (
    fieldName !== undefined &&
    authoritativeExecutionReferenceFieldName(fieldName) &&
    isBattleExecutionReference(value)
  )
    return [value];
  if (Array.isArray(value)) {
    return value.flatMap((entry) =>
      authoritativeBattleExecutionReferencesIn(entry, fieldName),
    );
  }
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, entry]) =>
    authoritativeBattleExecutionReferencesIn(entry, key),
  );
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
    binding.procedure.supportKind ===
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

function serializedProcedureRefIsBoundForCombatant(
  combatants: readonly EncodedBattleCreatureSnapshot[],
  combatantId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
): boolean {
  const combatant = combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  if (combatant === undefined) return false;
  return combatant.origin.kind === "character"
    ? characterProcedureBinding(combatants, combatantId, procedureRef) !==
        undefined ||
        serializedAttackProcedureRefIsBound(
          combatants,
          combatantId,
          procedureRef,
        )
    : combatant.origin.execution.procedureBindings.some(
        (binding) => binding.procedureRef === procedureRef,
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
  if (
    !battleExecutionReferencesIn(hole).every((ref) =>
      boundExecutionRefs.has(ref),
    )
  ) {
    return false;
  }
  if (
    !serializedSourceProcedureRefsAreOwned({
      value: hole,
      combatants,
      expectedProcedureRefs,
    })
  ) {
    return false;
  }
  if (hole.kind === "targetChoice" && hole.attack !== undefined) {
    return serializedAttackProcedureRefIsBound(
      combatants,
      hole.attack.actorId,
      hole.attack.selection.procedureRef,
    );
  }
  if (hole.kind === "ongoingSpellTargetChoice") {
    return serializedSpellProcedureRefIsBound(
      combatants,
      hole.casterId,
      hole.procedureRef,
    );
  }
  return true;
}

function serializedSourceProcedureRefsAreOwned(input: {
  readonly value: unknown;
  readonly combatants: readonly EncodedBattleCreatureSnapshot[];
  readonly expectedProcedureRefs:
    | ReadonlySet<BattleProcedureExecutionRef>
    | undefined;
}): boolean {
  const { value, combatants, expectedProcedureRefs } = input;
  if (Array.isArray(value)) {
    return value.every((entry) =>
      serializedSourceProcedureRefsAreOwned({
        value: entry,
        combatants,
        expectedProcedureRefs,
      }),
    );
  }
  if (value === null || typeof value !== "object") return true;
  const record = value as Readonly<Record<string, unknown>>;
  if (Schema.is(BattleProcedureExecutionRef)(record.sourceProcedureRef)) {
    if (
      expectedProcedureRefs !== undefined &&
      expectedProcedureRefs.size > 0 &&
      !expectedProcedureRefs.has(record.sourceProcedureRef)
    ) {
      return false;
    }
    const ownerId = serializedProcedureSourceOwnerId(record);
    if (
      ownerId !== undefined &&
      !serializedProcedureRefIsBoundForCombatant(
        combatants,
        ownerId,
        record.sourceProcedureRef,
      )
    ) {
      return false;
    }
  }
  return Object.values(record).every((entry) =>
    serializedSourceProcedureRefsAreOwned({
      value: entry,
      combatants,
      expectedProcedureRefs,
    }),
  );
}

function serializedProcedureSourceOwnerId(
  record: Readonly<Record<string, unknown>>,
): CombatantId | undefined {
  for (const fieldName of [
    "sourceCombatantId",
    "reactorId",
    "bardId",
    "ownerId",
    "actorId",
    "casterId",
    "beneficiaryId",
  ] as const) {
    const value = record[fieldName];
    if (Schema.is(CombatantId)(value)) return value;
  }
  return undefined;
}

function serializedProcedureRefsIn(
  value: unknown,
): ReadonlySet<BattleProcedureExecutionRef> {
  return new Set(
    battleExecutionReferencesIn(value).filter((ref) =>
      Schema.is(BattleProcedureExecutionRef)(ref),
    ),
  );
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
  if (
    (subject.tag === "bonusAction" && subject.action === "offHandAttack") ||
    (subject.tag === "bonusAction" &&
      subject.action === "martialArtsUnarmedStrike") ||
    subject.tag === "monkFocusFlurryOfBlowsStrike"
  ) {
    const owner = combatants.find(
      (combatant) => combatant.combatantId === subject.actorId,
    );
    if (owner?.origin.kind !== "character") return false;
    return subject.tag === "bonusAction" && subject.action === "offHandAttack"
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
        binding?.procedure.kind === "unitSupportProfile" &&
        binding.procedure.supportKind ===
          DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE
      );
    }
    if (subject.tag === "monkFocusOption") {
      return (
        binding?.procedure.kind === "unitSupportProfile" &&
        binding.procedure.supportKind ===
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
    return binding?.procedure.kind === "spellInvocation"
      ? binding.procedure.executionFacts.kind === "bonusActionDashSpell"
      : binding?.procedure.kind === "unitSupportProfile" &&
          (binding.procedure.supportKind === "alternateActionCost" ||
            binding.procedure.supportKind ===
              BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE ||
            binding.procedure.supportKind ===
              BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE);
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

function pendingInterruptChoiceOwnsBoundProcedure(input: {
  readonly choice: EncodedBattleInterruptChoice;
  readonly combatants: readonly EncodedBattleCreatureSnapshot[];
  readonly readiedSpells: readonly EncodedBattleReadiedSpellSnapshot[];
}): boolean {
  const { choice, combatants, readiedSpells } = input;
  if (choice.kind === "releaseReadiedMovement") return true;
  if (choice.kind === "reactionRollOrDamageReduction") {
    return serializedReactionModifierProcedureRefIsBound(
      combatants,
      choice.reactorId,
      choice.choice.procedureRef,
    );
  }
  if (choice.kind === "releaseReadiedSpell") {
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
  if (
    choice.kind === "castTriggeredReactionSpell" ||
    choice.kind === "castAttackHitBonusActionSpell"
  ) {
    if (
      choice.subject.tag !== "runtimeCommand" ||
      (choice.subject.command !== "castTriggeredReactionSpell" &&
        choice.subject.command !== "castAttackHitBonusActionSpell")
    ) {
      return false;
    }
    return serializedImmediateSpellChoiceIsBound(combatants, choice);
  }
  if (
    choice.subject.tag !== "runtimeCommand" ||
    (choice.subject.command !== "opportunityAttack" &&
      choice.subject.command !== "retaliationAttack")
  ) {
    return false;
  }
  return serializedAttackProcedureRefIsBound(
    combatants,
    choice.reactorId,
    choice.subject.procedureRef,
  );
}

export const BattleSnapshotSchema = Schema.Struct({
  battleId: BattleId,
  executionScopeCursors: Schema.Array(
    Schema.Struct({
      combatantId: CombatantId,
      nextScopeOrdinal: BattleExecutionScopeCursor,
    }),
  ),
  round: Schema.Number,
  currentActorId: CombatantId,
  turnOrder: Schema.Array(CombatantId),
  combatants: Schema.Array(BattleCreatureSnapshotSchema),
  companions: Schema.Array(BattleCompanionSnapshotSchema),
  lightEmitters: Schema.Array(BattleLightEmitterSchema),
  obscurementZones: Schema.Array(BattleObscurementZoneSchema),
  acts: Schema.Array(BattleActExecutionCandidateSchema),
  turn: BattleTurnSnapshotSchema,
  readiedResponses: Schema.Struct({
    spells: Schema.Array(BattleReadiedSpellSnapshotSchema),
    movements: Schema.Array(BattleReadiedMovementSnapshotSchema),
  }),
  helpAttackMarkers: Schema.Array(BattleHelpAttackSnapshotSchema),
  pendingInterrupt: Schema.Union(
    BattlePendingReactionSnapshotSchema,
    Schema.Null,
  ),
})
  .pipe(
    Schema.filter(
      (snapshot) => {
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
        const cursorByCombatant = new Map(
          snapshot.executionScopeCursors.map((cursor) => [
            cursor.combatantId,
            cursor.nextScopeOrdinal,
          ]),
        );
        const liveCombatantIds = new Set(
          snapshot.combatants.map((combatant) => combatant.combatantId),
        );
        const boundExecutionRefs = new Set(
          authoritativeBattleExecutionReferencesIn(snapshot.combatants),
        );
        return (
          liveCombatantIds.size === snapshot.combatants.length &&
          new Set(executionScopeRefs).size === executionScopeRefs.length &&
          cursorByCombatant.size === snapshot.executionScopeCursors.length &&
          snapshot.acts.every(
            (act) =>
              serializedBattleActOwnsBoundProcedure(
                act,
                snapshot.combatants,
                snapshot.readiedResponses.spells,
              ) &&
              serializedBattleHolesOwnBoundExecutionReferences({
                holes: act.initialHoles,
                combatants: snapshot.combatants,
                boundExecutionRefs,
                expectedProcedureRefs: serializedProcedureRefsIn(act.subject),
              }),
          ) &&
          snapshot.readiedResponses.spells.every((readied) =>
            serializedReadiedSpellOwnsInvocation(snapshot.combatants, readied),
          ) &&
          (snapshot.pendingInterrupt === null ||
            (serializedBattleHoleOwnsBoundExecutionReferences({
              hole: snapshot.pendingInterrupt.decisionHole,
              combatants: snapshot.combatants,
              boundExecutionRefs,
              expectedProcedureRefs: undefined,
            }) &&
              snapshot.pendingInterrupt.choices.every(
                (choice) =>
                  pendingInterruptChoiceOwnsBoundProcedure({
                    choice,
                    combatants: snapshot.combatants,
                    readiedSpells: snapshot.readiedResponses.spells,
                  }) &&
                  serializedBattleHolesOwnBoundExecutionReferences({
                    holes: choice.initialHoles,
                    combatants: snapshot.combatants,
                    boundExecutionRefs,
                    expectedProcedureRefs: serializedProcedureRefsIn(choice),
                  }),
              ))) &&
          executionScopes.every((executionScope) => {
            const cursor = cursorByCombatant.get(executionScope.combatantId);
            return Schema.is(BattleAttackExecutionScopeRef)(
              executionScope.scopeRef,
            )
              ? battleAttackExecutionScopeRefOrdinalIsBefore(
                  executionScope.scopeRef,
                  cursor,
                ) &&
                  battleAttackExecutionScopeRefBelongsToBattle(
                    executionScope.scopeRef,
                    snapshot.battleId,
                  )
              : Schema.is(BattleCharacterExecutionScopeRef)(
                    executionScope.scopeRef,
                  )
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
      },
      {
        message: () =>
          "Battle combatants, execution scopes, and scope cursors must be unique, battle-owned, and monotonic.",
      },
    ),
  )
  .annotations({ identifier: "BattleSnapshot" });
