// Runtime codecs for battle reducer public payloads.
// Extracted from ../battle-reducer.ts; this module owns Effect Schema values,
// while domain types remain exported by the reducer facade.

import { ATTACK_ROLL_MODES } from "@dnd/shared-algebras/runtime-hole-algebra";
import type { ArmorClass as BattleArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { STANDARD_ACTION_KINDS } from "@dnd/shared/game-facts";
import {
  CONDITIONS as ALL_CONDITIONS,
  AbilityModifier,
  ArmorClass as SharedArmorClass,
  AttackBonus,
  DamageAmount,
  DamageDieSizeSchema,
  DifficultyClass,
  MovementDeltaFeet,
  MovementFeet,
  SpellSlotLevel,
  type Hp,
} from "@dnd/shared/types";
import {
  AbilitySchema,
  DamageTypeSchema,
  DcSourceSchema,
} from "@dnd/surface/surface/schema";
import {
  SKILLS as SURFACE_SKILLS,
  type Ability,
  type DamageType,
  type Skill,
} from "@dnd/surface/surface/types";
import { Schema } from "effect";
import type { StatBlockPartSection } from "../battle-action-options.ts";
import {
  BATTLE_REACTION_TRIGGERS,
  BATTLE_READIED_SPELL_TRIGGERS,
} from "../battle-reaction-triggers.ts";
import type {
  ActiveOngoingFeatureOccurrenceSnapshotEncoded,
  BattleAttackRangeBand,
  BattleDroppedObjectOutcome,
  BattleFill,
  BattleObjectIgnitionOutcome,
  BattleShovePushOutcome,
  BattleSpellAreaChoice,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import {
  BATTLE_MOVEMENT_SPEED_KINDS,
  BattleSubjectSchema,
  BattleSubjectTextSchema,
  SpellInvocationRefSchema,
  type BattleMovementSpeedKind,
  type SpellInvocationRefEncoded,
} from "../battle-subjects.ts";
import {
  BattleCombatantSide,
  BattleId,
  BattleObjectId,
  BattleTablePositionId,
  CombatantId,
  SpellId,
} from "../identity.ts";
import {
  BATTLE_ATTACK_RANGE_BANDS,
  COMMAND_OPTIONS,
  ELDRITCH_BLAST_BEAM_COUNTS,
  SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS,
} from "./domain-constants.ts";

const BATTLE_SURFACE_SKILLS = SURFACE_SKILLS;
// Hp is a branded non-negative integer number. Effect Schema validates the
// runtime number shape here; the brand is erased at runtime, and Schema has no
// helper that preserves this repo's nominal brand through numeric filters.
const HpSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
) as unknown as Schema.Schema<Hp, number, never>;
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

const BattleHoleBaseSchema = {
  holeInstanceKey: Schema.NonEmptyTrimmedString,
  holeId: BattleHoleIdSchema,
  label: Schema.optionalWith(Schema.String, { exact: true }),
} as const;

const BattleRuntimeObjectSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Any,
});

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

const BattleThunderwaveAudibleBoomSchema = Schema.Struct({
  sound: Schema.Literal("thunderous boom"),
  audibleRadiusFeet: MovementFeet,
});

const SpellPostSaveAreaEffectSchema = Schema.Struct({
  kind: Schema.Literal("thunderwave"),
  creaturePush: Schema.Struct({
    distanceFeet: MovementFeet,
    originDirection: Schema.Literal("away_from_caster"),
  }),
  unsecuredObjectPush: Schema.Struct({
    distanceFeet: MovementFeet,
    originDirection: Schema.Literal("away_from_caster"),
    objectLocation: Schema.Literal("entirely_within_area"),
  }),
  audibleBoom: BattleThunderwaveAudibleBoomSchema,
});

const SpellFailedSavePostDamageRiderSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("nextAttackRollByTarget"),
    mode: Schema.Literal("disadvantage"),
    expiresAt: Schema.Literal("endOfTargetNextTurn"),
  }),
  Schema.Struct({
    kind: Schema.Literal("forcedReactionMovement"),
    direction: Schema.Literal("awayFromCaster"),
    route: Schema.Literal("safest"),
    distance: Schema.Literal("asFarAsPossible"),
    cost: Schema.Literal("targetReactionIfAvailable"),
  }),
);

const SpellPostDamageRiderSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("speedDelta"),
    deltaFeet: MovementDeltaFeet,
  }),
  Schema.Struct({
    kind: Schema.Literal("condition"),
    condition: Schema.Literal(...ALL_CONDITIONS),
    expiresAt: Schema.Literal("endOfCasterNextTurn"),
  }),
  Schema.Struct({
    kind: Schema.Literal("opportunityAttackDenied"),
    expiresAt: Schema.Literal("startOfTargetNextTurn"),
  }),
  Schema.Struct({
    kind: Schema.Literal("nextAttackRollAgainstTarget"),
    mode: Schema.Literal("advantage"),
    expiresAt: Schema.Literal("endOfCasterNextTurn"),
  }),
  Schema.Struct({
    kind: Schema.Literal("hitPointRegainPrevented"),
    expiresAt: Schema.Literal("endOfCasterNextTurn"),
  }),
  Schema.Struct({
    kind: Schema.Literal("invisibleBenefitDenied"),
    expiresAt: Schema.Literal("endOfCasterNextTurn"),
  }),
  Schema.Struct({
    kind: Schema.Literal("lightEmission"),
    emission: Schema.Struct({
      kind: Schema.Literal("dim"),
      radiusFeet: MovementFeet,
    }),
    expiresAt: Schema.Literal("endOfCasterNextTurn"),
  }),
);

const BattleSpellAreaChoiceBaseSchema = {
  originAnchorId: CombatantId,
  affectedTargetIds: Schema.Array(CombatantId),
} as const;

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
    sleepNonSleeperFacts: Schema.Array(BattleSleepNonSleeperFactSchema),
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
    kind: Schema.Literal("greaseGroundArea"),
    areaId: Schema.String,
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

const CharacterWeaponAttackActionOptionSchema = Schema.Struct({
  kind: Schema.Literal("weapon"),
  weapon: BattleRuntimeObjectSchema,
  ability: AbilitySchema,
  abilityModifier: AbilityModifier,
  attackBonus: Schema.optionalWith(AttackBonus, {
    exact: true,
  }),
  damageAbilityModifier: Schema.optionalWith(AbilityModifier, {
    exact: true,
  }),
  damageTypeChoices: Schema.optionalWith(
    Schema.NonEmptyArray(DamageTypeSchema).pipe(
      Schema.filter((choices) => choices.length >= 2, {
        message: () =>
          "Weapon attack damage type choices must contain at least two choices.",
      }),
    ),
    {
      exact: true,
    },
  ),
  alternateAbilityChoices: Schema.optionalWith(
    Schema.NonEmptyArray(
      Schema.Struct({
        ability: AbilitySchema,
        abilityModifier: AbilityModifier,
        attackBonus: AttackBonus,
        damageAbilityModifier: AbilityModifier,
      }),
    ),
    {
      exact: true,
    },
  ),
});

const SupportedAttackActionOptionSchema = Schema.Union(
  CharacterWeaponAttackActionOptionSchema,
  Schema.Struct({
    kind: Schema.Literal("unarmedStrike"),
    effect: Schema.Struct({
      kind: Schema.Literal("damage"),
      damage: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("base"),
          damageType: Schema.Literal("bludgeoning"),
          flat: Schema.Literal(1),
        }),
        Schema.Struct({
          kind: Schema.Literal("authoredReplacement"),
          sourceUnitId: Schema.String,
          dice: Schema.Literal(1),
          dieSize: DamageDieSizeSchema,
          damageType: DamageTypeSchema,
        }),
      ),
    }),
    attackAbility: AbilitySchema,
    attackAbilityModifier: AbilityModifier,
    attackBonus: AttackBonus,
    damageAbilityModifier: AbilityModifier,
    damageBonus: Schema.optionalWith(Schema.Number, { exact: true }),
  }),
  Schema.Struct({
    kind: Schema.Literal("statBlockAttack"),
    attack: BattleRuntimeObjectSchema,
  }),
);

const PreparedSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("prepared"),
});

const ClassCantripSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("classCantrip"),
});

const ArmorOfShadowsSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("armorOfShadows"),
});

const SpellSlotInvocationResourceSchema = Schema.Struct({
  tag: Schema.Literal("spellSlot"),
  slotLevel: SpellSlotLevel,
});

const NoSpellInvocationResourceSchema = Schema.Struct({
  tag: Schema.Literal("none"),
});

const ClassFeatureFreeCastInvocationResourceSchema = Schema.Struct({
  tag: Schema.Literal("classFeatureFreeCast"),
  resourceUnitId: Schema.String,
});

const SingleCreatureOrObjectSpellTargetingSchema = Schema.Struct({
  kind: Schema.Literal("singleCreatureOrObject"),
});

const SpellAttackDamageTargetingSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("singleCombatant"),
  }),
  SingleCreatureOrObjectSpellTargetingSchema,
);

const SpellAttackDamagePayloadSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("fixedSpellAttackDamage"),
    expr: BattleRuntimeObjectSchema,
    damageType: DamageTypeSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("sorcerousBurstDamageTypeChoice"),
    expr: BattleRuntimeObjectSchema,
    damageTypeChoices: Schema.NonEmptyArray(DamageTypeSchema),
    maxDieAdditionalDiceLimit: Schema.Number.pipe(
      Schema.int(),
      Schema.greaterThanOrEqualTo(0),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("selectedSorcerousBurstDamage"),
    expr: BattleRuntimeObjectSchema,
    damageType: DamageTypeSchema,
    maxDieAdditionalDiceLimit: Schema.Number.pipe(
      Schema.int(),
      Schema.greaterThanOrEqualTo(0),
    ),
  }),
);

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

const BattleObjectIgnitionDispositionSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("flammableUnattended") }),
  Schema.Struct({ kind: Schema.Literal("notFlammable") }),
  Schema.Struct({ kind: Schema.Literal("wornOrCarried") }),
);

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
  sourceSpellId: SpellId,
}) as unknown as Schema.Schema<BattleObjectIgnitionOutcome>;

// Effect Schema encodes branded ids as plain strings at the JSON boundary; the
// decoder restores the domain brands before the value reaches runtime code.
export const BattleDroppedObjectOutcomeSchema = Schema.Struct({
  kind: Schema.Literal("heldObjectDropped"),
  actorId: CombatantId,
  objectId: BattleObjectId,
  sourceCombatantId: CombatantId,
  sourceSpellId: SpellId,
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

const SupportedHealingSpellInvocationSchema = Schema.Struct({
  access: PreparedSpellAccessSchema,
  resource: SpellSlotInvocationResourceSchema,
  procedure: Schema.Literal("directHitPointRestoration"),
  spell: BattleRuntimeObjectSchema,
  actionCost: Schema.Literal("magicAction", "bonusAction"),
  targeting: Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
    }),
    Schema.Struct({
      kind: Schema.Literal("pointOriginSphereTargetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Number,
      area: Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
    }),
  ),
  healing: Schema.Struct({
    expr: BattleRuntimeObjectSchema,
  }),
  rangeFeet: MovementFeet,
});

// Schema.Union preserves the runtime parser but infers a wider structural
// union for nested BattleRuntimeObjectSchema fields than the authored
// SupportedSpellInvocation variants. The variant discriminants below cover
// every SupportedSpellInvocation branch locally, and callers still decode
// through this schema at the boundary.
const SupportedSpellInvocationSchema: Schema.Schema<SupportedSpellInvocation> =
  Schema.Union(
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("heldLight"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      light: Schema.Struct({
        brightRadiusFeet: MovementFeet,
        dimAdditionalFeet: MovementFeet,
      }),
      expiresAt: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("objectLight"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("singleObject"),
      }),
      light: Schema.Struct({
        kind: Schema.Literal("brightAndDim"),
        brightRadiusFeet: MovementFeet,
        dimAdditionalFeet: MovementFeet,
      }),
      expiresAt: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("heldLightHurl"),
      spell: BattleRuntimeObjectSchema,
      targeting: SingleCreatureOrObjectSpellTargetingSchema,
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: DamageTypeSchema,
      }),
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("ranged_spell_attack"),
      attackBonus: AttackBonus,
    }),
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("makeStable"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellHostedWeaponAttack"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      componentWeapon: Schema.Struct({
        itemId: Schema.String,
        attack: CharacterWeaponAttackActionOptionSchema,
      }),
      spellcastingAbilityModifier: AbilityModifier,
      attackBonus: AttackBonus,
      damageTypeChoices: Schema.Array(DamageTypeSchema),
      bonusDamage: Schema.NullOr(
        Schema.Struct({
          expr: BattleRuntimeObjectSchema,
          damageType: DamageTypeSchema,
        }),
      ),
    }),
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellAttackBeamSequence"),
      spell: BattleRuntimeObjectSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("beamSequenceCreatureOrObject"),
        beamCount: Schema.Literal(...ELDRITCH_BLAST_BEAM_COUNTS),
      }),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: DamageTypeSchema,
      }),
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("ranged_spell_attack"),
      attackBonus: AttackBonus,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("attackBurstSaveDamage"),
      spell: BattleRuntimeObjectSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("singleCombatant"),
      }),
      attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
      attackBonus: AttackBonus,
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: DamageTypeSchema,
      }),
      burst: Schema.Struct({
        ability: AbilitySchema,
        dc: DcSourceSchema,
        targeting: Schema.Struct({
          kind: Schema.Literal("primaryTargetOriginEmanation"),
          radiusFeet: MovementFeet,
        }),
        damage: Schema.Struct({
          expr: BattleRuntimeObjectSchema,
          damageType: DamageTypeSchema,
        }),
        successDamage: Schema.Literal("none"),
      }),
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("repeatedDamageAllocation"),
      spell: BattleRuntimeObjectSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("repeatedEffectTargetAllocation"),
        repeatedEffectCount: Schema.Number,
      }),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: Schema.String,
      }),
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellAttackDamage"),
      spell: BattleRuntimeObjectSchema,
      targeting: SpellAttackDamageTargetingSchema,
      damage: SpellAttackDamagePayloadSchema,
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
      attackBonus: AttackBonus,
      postDamageRiders: Schema.Array(SpellPostDamageRiderSchema),
      objectHitEffect: Schema.Union(
        Schema.Struct({ kind: Schema.Literal("none") }),
        Schema.Struct({
          kind: Schema.Literal("igniteFlammableUnattended"),
        }),
      ),
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("spellAttackDamage"),
      spell: BattleRuntimeObjectSchema,
      targeting: SpellAttackDamageTargetingSchema,
      damage: SpellAttackDamagePayloadSchema,
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
      attackBonus: AttackBonus,
      postDamageRiders: Schema.Array(SpellPostDamageRiderSchema),
      objectHitEffect: Schema.Union(
        Schema.Struct({ kind: Schema.Literal("none") }),
        Schema.Struct({
          kind: Schema.Literal("igniteFlammableUnattended"),
        }),
      ),
    }),
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedDamage"),
      spell: BattleRuntimeObjectSchema,
      ability: Schema.String,
      dc: BattleRuntimeObjectSchema,
      targeting: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("singleCombatant"),
        }),
        Schema.Struct({
          kind: Schema.Literal("targetList"),
          minTargets: Schema.Literal(1),
          maxTargets: Schema.Number,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginSphere"),
          radiusFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCubeExcludingCaster"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCube"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("selfOriginCube"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("selfOriginCone"),
          lengthFeet: MovementFeet,
        }),
      ),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: Schema.String,
      }),
      successDamage: Schema.Literal("none", "half"),
      rangeFeet: MovementFeet,
      failedSavePostDamageRiders: Schema.Array(
        SpellFailedSavePostDamageRiderSchema,
      ),
      postSaveAreaEffect: Schema.optionalWith(SpellPostSaveAreaEffectSchema, {
        exact: true,
      }),
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("chainedSpellAttackDamage"),
      spell: BattleRuntimeObjectSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("singleCombatant"),
      }),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
      }),
      damageTypeChoices: Schema.Array(DamageTypeSchema),
      rangeFeet: MovementFeet,
      leapRangeFeet: MovementFeet,
      attackKind: Schema.Literal("melee_spell_attack", "ranged_spell_attack"),
      attackBonus: AttackBonus,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedDamage"),
      spell: BattleRuntimeObjectSchema,
      ability: Schema.String,
      dc: BattleRuntimeObjectSchema,
      targeting: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("singleCombatant"),
        }),
        Schema.Struct({
          kind: Schema.Literal("targetList"),
          minTargets: Schema.Literal(1),
          maxTargets: Schema.Number,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginSphere"),
          radiusFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCubeExcludingCaster"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCube"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("selfOriginCube"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("selfOriginCone"),
          lengthFeet: MovementFeet,
        }),
      ),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: Schema.String,
      }),
      successDamage: Schema.Literal("none", "half"),
      rangeFeet: MovementFeet,
      failedSavePostDamageRiders: Schema.Array(
        SpellFailedSavePostDamageRiderSchema,
      ),
      postSaveAreaEffect: Schema.optionalWith(SpellPostSaveAreaEffectSchema, {
        exact: true,
      }),
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedCondition"),
      spell: BattleRuntimeObjectSchema,
      ability: Schema.String,
      dc: BattleRuntimeObjectSchema,
      targeting: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("singleCombatant"),
        }),
        Schema.Struct({
          kind: Schema.Literal("targetList"),
          minTargets: Schema.Literal(1),
          maxTargets: Schema.Number,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginSphere"),
          radiusFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCubeExcludingCaster"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCube"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("selfOriginCone"),
          lengthFeet: MovementFeet,
        }),
      ),
      targetCreatureTypes: Schema.NullOr(Schema.Array(Schema.String)),
      effect: Schema.Struct({
        condition: Schema.Literal(...ALL_CONDITIONS),
        expiresAt: Schema.Union(
          Schema.Literal("endOfCasterNextTurn", "concentration"),
          Schema.Struct({
            kind: Schema.Literal("duration"),
            durationTicks: Schema.Number,
          }),
        ),
        escape: Schema.NullOr(
          Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("abilityCheck"),
              ability: Schema.Literal("str"),
              skill: Schema.Literal("athletics"),
              successEnds: Schema.Literal(
                ...SPELL_CONDITION_ABILITY_CHECK_SUCCESS_ENDS,
              ),
            }),
            Schema.Struct({
              kind: Schema.Literal("targetDamagedByCasterOrAlly"),
            }),
          ),
        ),
        turnStartDamage: Schema.NullOr(BattleRuntimeObjectSchema),
      }),
      saveRollModeRule: Schema.NullOr(
        Schema.Struct({
          kind: Schema.Literal("hostileTarget"),
          mode: Schema.Literal("advantage"),
        }),
      ),
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedAttackRollAdvantage"),
      spell: BattleRuntimeObjectSchema,
      ability: AbilitySchema,
      dc: DcSourceSchema,
      targeting: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("pointOriginCube"),
          sideFeet: MovementFeet,
        }),
      ),
      effect: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("sleepTargetAdmission"),
      spell: BattleRuntimeObjectSchema,
      ability: Schema.Literal("wis"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("hideousLaughter"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      ability: Schema.Literal("wis"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("greaseGroundHazard"),
      spell: BattleRuntimeObjectSchema,
      ability: Schema.Literal("dex"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginCube"),
        sideFeet: MovementFeet,
      }),
      durationTicks: Schema.Number,
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("fogCloudObscurement"),
      spell: BattleRuntimeObjectSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
      durationTicks: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("command"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      ability: Schema.Literal("wis"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("damageReduction"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      damageTypeChoices: Schema.Array(DamageTypeSchema),
      amount: Schema.Struct({
        dice: Schema.Literal(1),
        dieSize: Schema.Literal(4),
      }),
      expiresAt: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("scalarBuff"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction", "bonusAction"),
      targeting: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("self"),
        }),
        Schema.Struct({
          kind: Schema.Literal("targetList"),
          minTargets: Schema.Literal(1),
          maxTargets: Schema.Number,
        }),
      ),
      effect: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("temporaryHitPoints"),
          amount: Schema.Struct({
            expr: BattleRuntimeObjectSchema,
          }),
        }),
        Schema.Struct({
          kind: Schema.Literal("activeEffect"),
          activeEffect: BattleRuntimeObjectSchema,
        }),
      ),
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal(
        "conditionImmunityAndTurnStartTemporaryHitPoints",
      ),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      activeEffects: Schema.Tuple(
        BattleRuntimeObjectSchema,
        BattleRuntimeObjectSchema,
      ),
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: Schema.Union(
        PreparedSpellAccessSchema,
        ClassCantripSpellAccessSchema,
      ),
      resource: Schema.Union(
        SpellSlotInvocationResourceSchema,
        NoSpellInvocationResourceSchema,
      ),
      procedure: Schema.Literal("rollModifier"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      effect: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
      saveGate: Schema.NullOr(
        Schema.Struct({
          ability: AbilitySchema,
          dc: DcSourceSchema,
        }),
      ),
      skillChoices: Schema.NullOr(
        Schema.Array(Schema.Literal(...BATTLE_SURFACE_SKILLS)),
      ),
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("creatureTypeProtection"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      activeEffect: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("weaponDamageRider"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      activeEffect: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("afterHitDamage"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: DamageTypeSchema,
      }),
      conditionalBonusDamage: Schema.Struct({
        targetCreatureTypes: Schema.Array(Schema.String),
        expr: BattleRuntimeObjectSchema,
        damageType: DamageTypeSchema,
      }),
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("afterHitSaveGatedCondition"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      ability: AbilitySchema,
      dc: DcSourceSchema,
      targeting: Schema.Struct({ kind: Schema.Literal("singleCombatant") }),
      effect: Schema.Struct({
        condition: Schema.Literal(...ALL_CONDITIONS),
        expiresAt: Schema.Literal("concentration"),
        escape: Schema.Struct({
          kind: Schema.Literal("abilityCheck"),
          ability: Schema.Literal("str"),
          skill: Schema.Literal("athletics"),
          successEnds: Schema.Literal("spell"),
        }),
        turnStartDamage: BattleRuntimeObjectSchema,
      }),
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("afterHitTimedDamageAndSave"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      immediateDamage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: DamageTypeSchema,
      }),
      activeEffect: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: Schema.Union(
        SpellSlotInvocationResourceSchema,
        ClassFeatureFreeCastInvocationResourceSchema,
      ),
      procedure: Schema.Literal("markedDamageRider"),
      action: Schema.Literal("cast"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      targeting: Schema.Struct({ kind: Schema.Literal("singleCombatant") }),
      damage: BattleRuntimeObjectSchema,
      abilityChoices: Schema.Union(Schema.Array(AbilitySchema), Schema.Null),
      rangeFeet: MovementFeet,
      expiresAt: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("markedDamageRider"),
      action: Schema.Literal("transfer"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      targeting: Schema.Struct({ kind: Schema.Literal("singleCombatant") }),
      damage: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
      activeEffect: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("expeditiousRetreatDash"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      activeEffect: BattleRuntimeObjectSchema,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("jumpMovementReplacement"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
      }),
      activeEffect: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("featherFallMitigation"),
      spell: BattleRuntimeObjectSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(5),
      }),
      activeEffect: BattleRuntimeObjectSchema,
      rangeFeet: MovementFeet,
    }),
    Schema.Union(
      Schema.Struct({
        access: PreparedSpellAccessSchema,
        resource: SpellSlotInvocationResourceSchema,
        procedure: Schema.Literal("persistentArmorEffect"),
        spell: BattleRuntimeObjectSchema,
        rangeFeet: MovementFeet,
        activeEffect: BattleRuntimeObjectSchema,
      }),
      Schema.Struct({
        access: ArmorOfShadowsSpellAccessSchema,
        resource: NoSpellInvocationResourceSchema,
        procedure: Schema.Literal("persistentArmorEffect"),
        spell: BattleRuntimeObjectSchema,
        rangeFeet: MovementFeet,
        activeEffect: BattleRuntimeObjectSchema,
      }),
    ),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("shieldReaction"),
      spell: BattleRuntimeObjectSchema,
      armorClassBonus: Schema.Number,
      negatedSpellIds: Schema.Array(Schema.String),
    }),
    SupportedHealingSpellInvocationSchema,
  ) as unknown as Schema.Schema<SupportedSpellInvocation>;

export const BattleHoleSchema = Schema.Union(
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("targetChoice"),
    choices: Schema.Array(CombatantId),
    requiresTableSpatialFact: Schema.optionalWith(Schema.Boolean, {
      exact: true,
    }),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("objectTargetChoice"),
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("heldObjectFacts"),
    actorId: CombatantId,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("damageTypeChoice"),
    spell: SupportedSpellInvocationSchema,
    choices: Schema.Array(DamageTypeSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("spellTargetAllocation"),
    spell: SupportedSpellInvocationSchema,
    allocationCount: Schema.Number,
    choices: Schema.Array(CombatantId),
    requiresTableSpatialFact: Schema.Literal(true),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("spellTargetList"),
    spell: SupportedSpellInvocationSchema,
    minTargets: Schema.Literal(1),
    maxTargets: Schema.Number,
    choices: Schema.Array(CombatantId),
    requiresTableSpatialFact: Schema.Literal(true),
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
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("attackRoll"),
    spell: SupportedSpellInvocationSchema,
    attackBonus: AttackBonus,
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
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    attack: SupportedAttackActionOptionSchema,
    critical: Schema.Boolean,
    attackDamageRiders: Schema.optionalWith(
      Schema.Array(
        Schema.Struct({
          attackerId: Schema.String,
          unitId: Schema.String,
          label: Schema.String,
          damage: Schema.Struct({
            dice: Schema.Number,
            dieSize: Schema.Number,
            damageType: Schema.String,
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
    weaponDamageDiceRollChoiceUnitIds: Schema.optionalWith(
      Schema.Array(Schema.String),
      { exact: true },
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    spell: SupportedSpellInvocationSchema,
    critical: Schema.Boolean,
    spellMarkedDamageRiders: Schema.optionalWith(
      Schema.Array(BattleRuntimeObjectSchema),
      { exact: true },
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    spellDamageReduction: Schema.Struct({
      sourceSpellId: Schema.String,
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
    spellTurnStartDamage: BattleRuntimeObjectSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    spell: SupportedSpellInvocationSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("skillChoice"),
    label: Schema.String,
    spell: SupportedSpellInvocationSchema,
    choices: Schema.Array(Schema.Literal(...BATTLE_SURFACE_SKILLS)),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("abilityChoice"),
    label: Schema.String,
    spell: SupportedSpellInvocationSchema,
    choices: Schema.Array(AbilitySchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("commandOptionChoice"),
    label: Schema.String,
    spell: SupportedSpellInvocationSchema,
    choices: Schema.Array(Schema.Literal(...COMMAND_OPTIONS)),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("spellAreaChoice"),
    label: Schema.String,
    spell: SupportedSpellInvocationSchema,
    area: Schema.Struct({
      kind: Schema.Literal("pointOriginSphere"),
      radiusFeet: MovementFeet,
    }),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    spellTurnStartSave: BattleRuntimeObjectSchema,
    ability: AbilitySchema,
    dc: DcSourceSchema,
    areaChoices: Schema.Array(BattleRuntimeObjectSchema),
    targetRollModes: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
      }),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    hideousLaughterRepeatSave: BattleRuntimeObjectSchema,
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    areaChoices: Schema.Array(BattleRuntimeObjectSchema),
    targetRollModes: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
      }),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    sleepRepeatSave: BattleRuntimeObjectSchema,
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    areaChoices: Schema.Array(BattleRuntimeObjectSchema),
    targetRollModes: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
      }),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    greaseGroundHazard: BattleRuntimeObjectSchema,
    ability: Schema.Literal("dex"),
    dc: DcSourceSchema,
    areaChoices: Schema.Array(BattleRuntimeObjectSchema),
    targetRollModes: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
      }),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    spell: SupportedSpellInvocationSchema,
    ability: Schema.String,
    dc: BattleRuntimeObjectSchema,
    areaChoices: Schema.Array(BattleSpellAreaChoiceSchema),
    targetRollModes: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
      }),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    unitFeature: BattleRuntimeObjectSchema,
    ability: AbilitySchema,
    dc: DcSourceSchema,
    targetIds: Schema.Array(CombatantId),
    targetRollModes: Schema.Array(
      Schema.Struct({
        targetId: CombatantId,
        rollMode: Schema.Literal(...ATTACK_ROLL_MODES),
      }),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    unitFeature: BattleRuntimeObjectSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("unitFeatureDecision"),
    label: Schema.String,
    unitFeature: BattleRuntimeObjectSchema,
    choices: Schema.Tuple(Schema.Literal("use"), Schema.Literal("decline")),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("deathSavingThrow"),
    label: Schema.String,
    combatantId: CombatantId,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("statBlockRechargeRoll"),
    label: Schema.String,
    combatantId: CombatantId,
    rechargeTargets: Schema.Array(BattleRuntimeObjectSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("concentrationSavingThrow"),
    label: Schema.String,
    combatantId: CombatantId,
    dc: DifficultyClass,
    damageAmount: DamageAmount,
    rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
      exact: true,
    }),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("reactionDecision"),
    label: Schema.String,
    trigger: Schema.Literal(...BATTLE_REACTION_TRIGGERS),
    eligibleReactors: Schema.Array(CombatantId),
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
    kind: Schema.Literal("abilityCheck"),
    label: Schema.String,
    ability: AbilitySchema,
    skill: Schema.Literal("stealth", "perception", "athletics"),
    dc: DifficultyClass,
    rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
      exact: true,
    }),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("grappleOutcome"),
    label: Schema.String,
    actorId: CombatantId,
    targetId: CombatantId,
    dc: DifficultyClass,
    mode: Schema.Literal("grappleSave", "escapeCheck"),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("shoveOutcome"),
    label: Schema.String,
    actorId: CombatantId,
    targetId: CombatantId,
    dc: DifficultyClass,
  }),
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
);

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

const BattleAttackRollResultSchema = Schema.Struct({
  total: Schema.Number.pipe(Schema.int()),
  naturalD20: BattleD20DieRollResultSchema,
  rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
    exact: true,
  }),
  activatedOngoingFeatureUnitId: Schema.optionalWith(Schema.String, {
    exact: true,
  }),
  missToHitReplacementUnitId: Schema.optionalWith(Schema.String, {
    exact: true,
  }),
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
      readonly sleepNonSleeperFacts: readonly {
        readonly kind: "doesNotSleep";
        readonly targetId: string;
      }[];
    }
  | {
      readonly kind: "faerieFireArea";
      readonly affectedObjectIds: readonly string[];
      readonly areaId?: never;
      readonly sleepNonSleeperFacts?: never;
    }
  | {
      readonly kind: "greaseGroundArea";
      readonly areaId: string;
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

type BattleFillEncoded =
  | {
      readonly kind: "targetChoice";
      readonly holeId: string;
      readonly value: string;
      readonly spatialFacts?: readonly (
        | {
            readonly kind: "attackTargetInMeleeReach";
            readonly actorId: string;
            readonly targetId: string;
            readonly attackName: string;
          }
        | {
            readonly kind: "cleaveSecondTargetWithin5FeetOfFirstTarget";
            readonly attackerId: string;
            readonly firstTargetId: string;
            readonly secondTargetId: string;
          }
        | {
            readonly kind: "attackTargetInRangedRange";
            readonly actorId: string;
            readonly targetId: string;
            readonly attackName: string;
            readonly rangeBand: BattleAttackRangeBand;
          }
        | {
            readonly kind: "spellTarget";
            readonly casterId: string;
            readonly targetId: string;
            readonly spellId: string;
          }
        | {
            readonly kind: "spellTargetKnownWilling";
            readonly casterId: string;
            readonly targetId: string;
            readonly spellId: string;
          }
        | {
            readonly kind: "spellObjectTarget";
            readonly casterId: string;
            readonly objectId: string;
            readonly spellId: string;
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
            readonly spellId: string;
            readonly disposition:
              | { readonly kind: "flammableUnattended" }
              | { readonly kind: "notFlammable" }
              | { readonly kind: "wornOrCarried" };
          }
        | {
            readonly kind: "spellObjectTargetSight";
            readonly casterId: string;
            readonly objectId: string;
            readonly spellId: string;
            readonly attackerCanSeeObject: boolean;
          }
        | {
            readonly kind: "spellObjectLightTarget";
            readonly casterId: string;
            readonly objectId: string;
            readonly spellId: string;
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
            readonly kind: "spellLeapTargetWithinRange";
            readonly previousTargetId: string;
            readonly targetId: string;
            readonly spellId: string;
            readonly rangeFeet: number;
          }
        | {
            readonly kind: "spellTargetsInPointOriginSphere";
            readonly casterId: string;
            readonly spellId: string;
            readonly areaId: string;
            readonly radiusFeet: number;
            readonly targetIds: readonly string[];
          }
        | {
            readonly kind: "helpAttackTargetWithin5Feet";
            readonly helperId: string;
            readonly targetEnemyId: string;
          }
        | {
            readonly kind: "meleeRedirectTargetWithin5Feet";
            readonly sourceId: string;
            readonly targetId: string;
          }
        | {
            readonly kind: "rangedRedirectTargetWithin60FeetWithoutTotalCover";
            readonly sourceId: string;
            readonly targetId: string;
          }
        | {
            readonly kind: "bardicInspirationTargetWithinRange";
            readonly bardId: string;
            readonly targetId: string;
            readonly unitId: string;
            readonly rangeFeet: number;
          }
        | {
            readonly kind: "bardicInspirationTargetCanHear";
            readonly bardId: string;
            readonly targetId: string;
            readonly unitId: string;
          }
        | {
            readonly kind: "reactionRollOrDamageReductionTargetWithinRange";
            readonly reactorId: string;
            readonly targetId: string;
            readonly unitId: string;
            readonly rangeFeet: number;
          }
        | {
            readonly kind: "reactionSpellDamagerVisibleWithinRange";
            readonly reactorId: string;
            readonly damageSourceId: string;
            readonly spellId: string;
            readonly rangeFeet: number;
          }
        | {
            readonly kind: "featherFallTriggerSelfOrVisibleCreatureWithinRange";
            readonly reactorId: string;
            readonly fallingCreatureId: string;
            readonly spellId: string;
            readonly rangeFeet: number;
          }
        | {
            readonly kind: "featherFallTargetFallingWithinRange";
            readonly casterId: string;
            readonly targetId: string;
            readonly spellId: string;
            readonly rangeFeet: number;
          }
        | {
            readonly kind: "grappleTargetWithinReach";
            readonly grapplerId: string;
            readonly targetId: string;
          }
        | {
            readonly kind: "shoveTargetWithinReach";
            readonly shoverId: string;
            readonly targetId: string;
          }
        | {
            readonly kind: "spellRestraintEscapeActorWithinTargetReach";
            readonly actorId: string;
            readonly targetId: string;
          }
        | {
            readonly kind: "sleepShakeAwakeActorWithin5Feet";
            readonly actorId: string;
            readonly targetId: string;
          }
        | {
            readonly kind: "sneakAttackAllyWithin5FeetOfTarget";
            readonly attackerId: string;
            readonly targetId: string;
            readonly allyId: string;
          }
      )[];
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
            readonly spellId: string;
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
            readonly spellId: string;
            readonly disposition:
              | { readonly kind: "flammableUnattended" }
              | { readonly kind: "notFlammable" }
              | { readonly kind: "wornOrCarried" };
          }
        | {
            readonly kind: "spellObjectTargetSight";
            readonly casterId: string;
            readonly objectId: string;
            readonly spellId: string;
            readonly attackerCanSeeObject: boolean;
          }
        | {
            readonly kind: "spellObjectLightTarget";
            readonly casterId: string;
            readonly objectId: string;
            readonly spellId: string;
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
      )[];
    }
  | {
      readonly kind: "damageTypeChoice";
      readonly holeId: string;
      readonly value: DamageType;
    }
  | {
      readonly kind: "spellAreaChoice";
      readonly holeId: string;
      readonly value: {
        readonly kind: "fogCloudArea";
        readonly areaId: string;
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
            readonly spellId: string;
          }
        | {
            readonly kind: "reactionSpellDamagerVisibleWithinRange";
            readonly reactorId: string;
            readonly damageSourceId: string;
            readonly spellId: string;
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
            readonly spellId: string;
          }
        | {
            readonly kind: "spellTargetKnownWilling";
            readonly casterId: string;
            readonly targetId: string;
            readonly spellId: string;
          }
        | {
            readonly kind: "spellTargetsInPointOriginSphere";
            readonly casterId: string;
            readonly spellId: string;
            readonly areaId: string;
            readonly radiusFeet: number;
            readonly targetIds: readonly string[];
          }
        | {
            readonly kind: "featherFallTargetFallingWithinRange";
            readonly casterId: string;
            readonly targetId: string;
            readonly spellId: string;
            readonly rangeFeet: number;
          }
      )[];
    }
  | {
      readonly kind: "attackRoll";
      readonly holeId: string;
      readonly value: {
        readonly total: number;
        readonly naturalD20: number;
        readonly rollMode?: (typeof ATTACK_ROLL_MODES)[number];
        readonly activatedOngoingFeatureUnitId?: string;
      };
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
            }[];
          }
        | {
            readonly area?: never;
            readonly outcomes: readonly {
              readonly targetId: string;
              readonly succeeded: boolean;
            }[];
          };
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
      readonly kind: "commandOptionChoice";
      readonly holeId: string;
      readonly value: (typeof COMMAND_OPTIONS)[number];
    }
  | {
      readonly kind: "unitFeatureDecision";
      readonly holeId: string;
      readonly value: "use" | "decline";
    }
  | {
      readonly kind: "heldObjectFacts";
      readonly holeId: string;
      readonly value: {
        readonly objectIds: readonly string[];
      };
    }
  | {
      readonly kind: "rolledDice";
      readonly holeId: string;
      readonly selectedAttackDamageRiderUnitIds?: readonly string[];
      readonly weaponDamageDiceRollChoice?: WeaponDamageDiceRollChoiceFillEncoded;
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
    }
  | {
      readonly kind: "statBlockRechargeRoll";
      readonly holeId: string;
      readonly value: readonly {
        readonly target: {
          readonly section: StatBlockPartSection;
          readonly name: string;
        };
        readonly roll: number;
      }[];
    }
  | {
      readonly kind: "concentrationSavingThrow";
      readonly holeId: string;
      readonly value: {
        readonly succeeded: boolean;
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
      readonly kind: "reactionDecision";
      readonly holeId: string;
      readonly value:
        | {
            readonly kind: "decline";
            readonly reactorId: string;
          }
        | {
            readonly kind: "resolve";
            readonly reactorId: string;
            readonly choice:
              | {
                  readonly kind: "releaseReadiedSpell";
                  readonly readiedSpellCasterId: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "releaseReadiedMovement";
                  readonly readiedMovementActorId: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "castTriggeredReactionSpell";
                  readonly invocation: SpellInvocationRefEncoded;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "castAttackHitBonusActionSpell";
                  readonly invocation: SpellInvocationRefEncoded;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "opportunityAttack";
                  readonly reactorId: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "reactionRollOrDamageReduction";
                  readonly unitId: string;
                  readonly modifierKind:
                    | "attackRollReduction"
                    | "abilityCheckReduction"
                    | "damageRollReduction"
                    | "attackDamageReduction";
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
        readonly provokedOpportunityAttacks: readonly {
          readonly reactorId: string;
          readonly attackName: string;
        }[];
        readonly greaseGroundDifficultTerrain?: {
          readonly kind: "greaseGroundDifficultTerrain";
          readonly sourceCombatantId: string;
          readonly sourceSpellId: string;
          readonly areaId: string;
          readonly totalDistanceFeet: number;
          readonly greaseDistanceFeet: number;
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
      };
    }
  | {
      readonly kind: "abilityCheck";
      readonly holeId: string;
      readonly value: {
        readonly total: number;
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
    };

export const BattleFillSchema: Schema.Schema<
  BattleFill,
  BattleFillEncoded,
  never
> = Schema.suspend(() =>
  Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("targetChoice"),
      holeId: BattleHoleIdSchema,
      value: CombatantId,
      spatialFacts: Schema.optionalWith(
        Schema.Array(
          Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("attackTargetInMeleeReach"),
              actorId: CombatantId,
              targetId: CombatantId,
              attackName: Schema.String,
            }),
            Schema.Struct({
              kind: Schema.Literal(
                "cleaveSecondTargetWithin5FeetOfFirstTarget",
              ),
              attackerId: CombatantId,
              firstTargetId: CombatantId,
              secondTargetId: CombatantId,
            }),
            Schema.Struct({
              kind: Schema.Literal("attackTargetInRangedRange"),
              actorId: CombatantId,
              targetId: CombatantId,
              attackName: Schema.String,
              rangeBand: Schema.Literal(...BATTLE_ATTACK_RANGE_BANDS),
            }),
            Schema.Struct({
              kind: Schema.Literal("spellTarget"),
              casterId: CombatantId,
              targetId: CombatantId,
              spellId: Schema.String,
            }),
            Schema.Struct({
              kind: Schema.Literal("spellTargetKnownWilling"),
              casterId: CombatantId,
              targetId: CombatantId,
              spellId: Schema.String,
            }),
            Schema.Struct({
              kind: Schema.Literal("spellObjectTarget"),
              casterId: CombatantId,
              objectId: BattleObjectId,
              spellId: Schema.String,
              rangeFeet: MovementFeet,
              armorClass: BattleArmorClassSchema,
              damageDisposition: BattleObjectDamageDispositionSchema,
            }),
            Schema.Struct({
              kind: Schema.Literal("spellObjectIgnition"),
              casterId: CombatantId,
              objectId: BattleObjectId,
              spellId: Schema.String,
              disposition: BattleObjectIgnitionDispositionSchema,
            }),
            Schema.Struct({
              kind: Schema.Literal("spellObjectTargetSight"),
              casterId: CombatantId,
              objectId: BattleObjectId,
              spellId: Schema.String,
              attackerCanSeeObject: Schema.Boolean,
            }),
            Schema.Struct({
              kind: Schema.Literal("spellObjectLightTarget"),
              casterId: CombatantId,
              objectId: BattleObjectId,
              spellId: Schema.String,
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
              kind: Schema.Literal("spellLeapTargetWithinRange"),
              previousTargetId: CombatantId,
              targetId: CombatantId,
              spellId: Schema.String,
              rangeFeet: MovementFeet,
            }),
            Schema.Struct({
              kind: Schema.Literal("spellTargetsInPointOriginSphere"),
              casterId: CombatantId,
              spellId: Schema.String,
              areaId: Schema.String,
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
              kind: Schema.Literal(
                "rangedRedirectTargetWithin60FeetWithoutTotalCover",
              ),
              sourceId: CombatantId,
              targetId: CombatantId,
            }),
            Schema.Struct({
              kind: Schema.Literal("bardicInspirationTargetWithinRange"),
              bardId: CombatantId,
              targetId: CombatantId,
              unitId: Schema.String,
              rangeFeet: MovementFeet,
            }),
            Schema.Struct({
              kind: Schema.Literal("bardicInspirationTargetCanHear"),
              bardId: CombatantId,
              targetId: CombatantId,
              unitId: Schema.String,
            }),
            Schema.Struct({
              kind: Schema.Literal(
                "reactionRollOrDamageReductionTargetWithinRange",
              ),
              reactorId: CombatantId,
              targetId: CombatantId,
              unitId: Schema.String,
              rangeFeet: MovementFeet,
            }),
            Schema.Struct({
              kind: Schema.Literal("reactionSpellDamagerVisibleWithinRange"),
              reactorId: CombatantId,
              damageSourceId: CombatantId,
              spellId: Schema.String,
              rangeFeet: MovementFeet,
            }),
            Schema.Struct({
              kind: Schema.Literal(
                "featherFallTriggerSelfOrVisibleCreatureWithinRange",
              ),
              reactorId: CombatantId,
              fallingCreatureId: CombatantId,
              spellId: Schema.String,
              rangeFeet: MovementFeet,
            }),
            Schema.Struct({
              kind: Schema.Literal("featherFallTargetFallingWithinRange"),
              casterId: CombatantId,
              targetId: CombatantId,
              spellId: Schema.String,
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
              kind: Schema.Literal(
                "spellRestraintEscapeActorWithinTargetReach",
              ),
              actorId: CombatantId,
              targetId: CombatantId,
            }),
            Schema.Struct({
              kind: Schema.Literal("sleepShakeAwakeActorWithin5Feet"),
              actorId: CombatantId,
              targetId: CombatantId,
            }),
            Schema.Struct({
              kind: Schema.Literal("sneakAttackAllyWithin5FeetOfTarget"),
              attackerId: CombatantId,
              targetId: CombatantId,
              allyId: CombatantId,
            }),
          ),
        ),
        { exact: true },
      ),
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
            spellId: Schema.String,
            rangeFeet: MovementFeet,
            armorClass: BattleArmorClassSchema,
            damageDisposition: BattleObjectDamageDispositionSchema,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellObjectIgnition"),
            casterId: CombatantId,
            objectId: BattleObjectId,
            spellId: Schema.String,
            disposition: BattleObjectIgnitionDispositionSchema,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellObjectTargetSight"),
            casterId: CombatantId,
            objectId: BattleObjectId,
            spellId: Schema.String,
            attackerCanSeeObject: Schema.Boolean,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellObjectLightTarget"),
            casterId: CombatantId,
            objectId: BattleObjectId,
            spellId: Schema.String,
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
        ),
      ),
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
            spellId: Schema.String,
          }),
          Schema.Struct({
            kind: Schema.Literal("reactionSpellDamagerVisibleWithinRange"),
            reactorId: CombatantId,
            damageSourceId: CombatantId,
            spellId: Schema.String,
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
            spellId: Schema.String,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellTargetKnownWilling"),
            casterId: CombatantId,
            targetId: CombatantId,
            spellId: Schema.String,
          }),
          Schema.Struct({
            kind: Schema.Literal("spellTargetsInPointOriginSphere"),
            casterId: CombatantId,
            spellId: Schema.String,
            areaId: Schema.String,
            radiusFeet: MovementFeet,
            targetIds: Schema.Array(CombatantId),
          }),
          Schema.Struct({
            kind: Schema.Literal("featherFallTargetFallingWithinRange"),
            casterId: CombatantId,
            targetId: CombatantId,
            spellId: Schema.String,
            rangeFeet: MovementFeet,
          }),
        ),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("attackRoll"),
      holeId: BattleHoleIdSchema,
      value: BattleAttackRollResultSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("damageTypeChoice"),
      holeId: BattleHoleIdSchema,
      value: DamageTypeSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("spellAreaChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        kind: Schema.Literal("fogCloudArea"),
        areaId: Schema.String,
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("savingThrowOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union(
        Schema.Struct({
          area: BattleSpellAreaChoiceSchema,
          outcomes: Schema.Array(
            Schema.Struct({
              targetId: CombatantId,
              succeeded: Schema.Boolean,
            }),
          ),
        }),
        Schema.Struct({
          area: Schema.optionalWith(Schema.Never, { exact: true }),
          outcomes: Schema.Array(
            Schema.Struct({
              targetId: CombatantId,
              succeeded: Schema.Boolean,
            }),
          ),
        }),
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
      kind: Schema.Literal("commandOptionChoice"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literal(...COMMAND_OPTIONS),
    }),
    Schema.Struct({
      kind: Schema.Literal("unitFeatureDecision"),
      holeId: BattleHoleIdSchema,
      value: Schema.Literal("use", "decline"),
    }),
    Schema.Struct({
      kind: Schema.Literal("heldObjectFacts"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        objectIds: Schema.Array(BattleObjectId),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("rolledDice"),
      holeId: BattleHoleIdSchema,
      selectedAttackDamageRiderUnitIds: Schema.optionalWith(
        Schema.Array(Schema.String),
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
      value: Schema.NonEmptyArray(BattleRolledDiceGroupSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("deathSavingThrow"),
      holeId: BattleHoleIdSchema,
      value: BattleD20DieRollResultSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("statBlockRechargeRoll"),
      holeId: BattleHoleIdSchema,
      value: Schema.Array(
        Schema.Struct({
          target: Schema.Struct({
            section: Schema.Literal(
              "actions",
              "bonusActions",
              "reactions",
              "legendaryActions",
            ),
            name: Schema.String,
          }),
          roll: BattleDieRollResultSchema,
        }),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("concentrationSavingThrow"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        succeeded: Schema.Boolean,
      }),
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
      kind: Schema.Literal("reactionDecision"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("decline"),
          reactorId: CombatantId,
        }),
        Schema.Struct({
          kind: Schema.Literal("resolve"),
          reactorId: CombatantId,
          choice: Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("releaseReadiedSpell"),
              readiedSpellCasterId: CombatantId,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("releaseReadiedMovement"),
              readiedMovementActorId: CombatantId,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("castTriggeredReactionSpell"),
              invocation: SpellInvocationRefSchema,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("castAttackHitBonusActionSpell"),
              invocation: SpellInvocationRefSchema,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("opportunityAttack"),
              reactorId: CombatantId,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("reactionRollOrDamageReduction"),
              unitId: BattleSubjectTextSchema,
              modifierKind: Schema.Literal(
                "attackRollReduction",
                "abilityCheckReduction",
                "damageRollReduction",
                "attackDamageReduction",
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
          Schema.Struct({
            reactorId: CombatantId,
            attackName: Schema.String,
          }),
        ),
        greaseGroundDifficultTerrain: Schema.optionalWith(
          Schema.Struct({
            kind: Schema.Literal("greaseGroundDifficultTerrain"),
            sourceCombatantId: CombatantId,
            sourceSpellId: Schema.String,
            areaId: Schema.String,
            totalDistanceFeet: MovementFeet,
            greaseDistanceFeet: MovementFeet,
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
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("abilityCheck"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        total: Schema.Number.pipe(Schema.int()),
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

const BattleActionRestrictionSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("none") }),
  Schema.Struct({
    kind: Schema.Literal("exclude"),
    actions: Schema.NonEmptyArray(Schema.Literal(...STANDARD_ACTION_KINDS)),
  }),
);

const RuntimeActionResourceSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("turn"),
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("unit"),
    sourceOwnerId: Schema.String,
    sourceUnitId: Schema.String,
    restriction: BattleActionRestrictionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("statBlockMultiattack"),
    sourceOwnerId: Schema.String,
    attackPart: Schema.Struct({
      section: Schema.Literal("actions"),
      name: Schema.String,
    }),
    restriction: BattleActionRestrictionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("action"),
    source: Schema.Literal("classFeatureExtraAttack"),
    sourceOwnerId: Schema.String,
    sourceUnitId: Schema.String,
    restriction: BattleActionRestrictionSchema,
  }),
);

const BattleTurnSnapshotSchema = Schema.Struct({
  actionResources: Schema.Array(RuntimeActionResourceSchema),
  bonusActionAvailable: Schema.Boolean,
  spellSlotExpendedThisTurn: Schema.Boolean,
  attackRollMadeThisTurn: Schema.Boolean,
  attackDamageRidersUsedThisTurn: Schema.Array(
    Schema.Struct({
      attackerId: CombatantId,
      unitId: Schema.String,
    }),
  ),
  weaponDamageDiceRollChoicesUsedThisTurn: Schema.Array(
    Schema.Struct({
      attackerId: CombatantId,
      unitId: Schema.String,
    }),
  ),
  weaponMasteryCleaveAttackersUsedThisTurn: Schema.Array(CombatantId),
  lightWeaponAttackMade: Schema.optionalWith(
    Schema.Struct({ weaponItemId: Schema.String }),
    { exact: true },
  ),
  dashMovementBonusFeet: Schema.Number,
  disengaged: Schema.Boolean,
});

const BattleCharacterResourceSnapshotSchema = Schema.Union(
  Schema.Struct({
    unitId: Schema.String,
    usage: Schema.Literal("unlimited"),
    usedThisTurn: Schema.Boolean,
  }),
  Schema.Struct({
    unitId: Schema.String,
    usage: Schema.Literal("limited"),
    usesRemaining: Schema.Number,
    usedThisTurn: Schema.Boolean,
  }),
);

const StatBlockPartKeySchema = Schema.Struct({
  section: Schema.Literal(
    "actions",
    "bonusActions",
    "reactions",
    "legendaryActions",
  ),
  name: Schema.String,
});

const StatBlockLimitedUseSnapshotSchema = Schema.Union(
  Schema.Struct({
    key: StatBlockPartKeySchema,
    kind: Schema.Literal("daily"),
    usesMax: Schema.Number,
    usesRemaining: Schema.Number,
  }),
  Schema.Struct({
    key: StatBlockPartKeySchema,
    kind: Schema.Literal("recharge"),
    minimumRoll: Schema.Number,
    available: Schema.Boolean,
  }),
  Schema.Struct({
    key: StatBlockPartKeySchema,
    kind: Schema.Literal("recharge_after_rest"),
    available: Schema.Boolean,
  }),
);

const StatBlockResourceSnapshotSchema = Schema.Struct({
  legendaryActions: Schema.Union(
    Schema.Struct({
      usesMax: Schema.Number,
      usesRemaining: Schema.Number,
    }),
    Schema.Null,
  ),
  limitedUses: Schema.Array(StatBlockLimitedUseSnapshotSchema),
});

const BattleCreatureOriginSnapshotSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("character"),
    characterId: Schema.String,
    resources: Schema.Array(BattleCharacterResourceSnapshotSchema),
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
    resources: StatBlockResourceSnapshotSchema,
  }),
);

const BattleCreatureSnapshotSchema = Schema.Struct({
  combatantId: CombatantId,
  displayName: Schema.String,
  initiative: Schema.Number,
  side: BattleCombatantSide,
  origin: BattleCreatureOriginSnapshotSchema,
  hp: Schema.Number,
  maxHp: Schema.Number,
  tempHp: Schema.Number,
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
});

const AvailableBattleActSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  label: Schema.String,
  summary: Schema.String,
  initialHoles: Schema.Array(BattleHoleSchema),
});

const BattleReadiedSpellSnapshotSchema = Schema.Struct({
  casterId: CombatantId,
  invocation: SupportedSpellInvocationSchema,
  trigger: Schema.Literal(...BATTLE_READIED_SPELL_TRIGGERS),
  expiresAt: OngoingFeatureExpirationSchema,
});

const BattleReadiedMovementSnapshotSchema = Schema.Struct({
  actorId: CombatantId,
  trigger: Schema.Literal(...BATTLE_REACTION_TRIGGERS),
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
    unitId: Schema.String,
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
    unitId: Schema.String,
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
);

const BattleReactionProcedureChoiceSchema = Schema.Union(
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
    invocation: SpellInvocationRefSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("castAttackHitBonusActionSpell"),
    reactorId: CombatantId,
    subject: BattleSubjectSchema,
    initialHoles: Schema.Array(BattleHoleSchema),
    invocation: SpellInvocationRefSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("opportunityAttack"),
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
);

const BattlePendingReactionSnapshotSchema = Schema.Struct({
  trigger: Schema.Literal(...BATTLE_REACTION_TRIGGERS),
  decisionHole: BattleHoleSchema,
  choices: Schema.Array(BattleReactionProcedureChoiceSchema),
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

const BattleLightEmitterSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("spellLightEmitter"),
    sourceSpellId: Schema.String,
    sourceCombatantId: CombatantId,
    attachment: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("combatant"),
        combatantId: CombatantId,
      }),
      Schema.Struct({
        kind: Schema.Literal("object"),
        objectId: BattleObjectId,
      }),
    ),
    emission: Schema.Union(
      BattleDimLightEmissionSchema,
      Schema.Struct({
        kind: Schema.Literal("brightAndDim"),
        brightRadiusFeet: MovementFeet,
        dimAdditionalFeet: MovementFeet,
      }),
    ),
    expiresAt: BattleRuntimeObjectSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("objectInvisibleRevealLightEmitter"),
    sourceSpellId: Schema.String,
    sourceCombatantId: CombatantId,
    objectId: BattleObjectId,
    emission: BattleDimLightEmissionSchema,
    expiresAt: BattleLightEmitterEndOfTurnExpirationSchema,
  }),
);

export const BattleSnapshotSchema = Schema.Struct({
  battleId: BattleId,
  round: Schema.Number,
  currentActorId: CombatantId,
  turnOrder: Schema.Array(CombatantId),
  combatants: Schema.Array(BattleCreatureSnapshotSchema),
  lightEmitters: Schema.Array(BattleLightEmitterSchema),
  acts: Schema.Array(AvailableBattleActSchema),
  turn: BattleTurnSnapshotSchema,
  readiedResponses: Schema.Struct({
    spells: Schema.Array(BattleReadiedSpellSnapshotSchema),
    movements: Schema.Array(BattleReadiedMovementSnapshotSchema),
  }),
  helpAttackMarkers: Schema.Array(BattleHelpAttackSnapshotSchema),
  pendingReaction: Schema.Union(
    BattlePendingReactionSnapshotSchema,
    Schema.Null,
  ),
});
