import { Schema } from "effect";
import { ATTACK_ROLL_MODES } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  CLASS_NAMES,
  CONDITIONS,
  CREATURE_TYPES,
} from "@dnd/shared/game-facts";
import { ClassLevel } from "@dnd/shared/types";
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import {
  AbilitySchema,
  ActionRestrictionSchema,
  WeaponUsageSchema,
} from "@dnd/surface/surface/schema";
import {
  BATTLE_CUNNING_STRIKE_OPTION_SELECTION_IDS,
  DRACONIC_ANCESTRY_DAMAGE_TYPES,
  DRACONIC_ANCESTRY_DAMAGE_TYPE_HOLE_ID,
} from "../unit-feature-execution-constants.ts";
import {
  BattleProcedureExecutionRef,
  BattleResourcePoolExecutionRef,
} from "../identity.ts";
import {
  DamageDieSizeSchema,
  DamageTypeSchema,
  MovementDeltaFeet,
  MovementFeet,
  SpellSlotLevel,
} from "./codec-building-blocks.ts";

export const LiteralUnitSupportProcedureExecutionSchema = Schema.Literal(
  "weaponOrUnarmedCriticalRange19",
  "attackDamageRider",
  "saveDamageReplacement",
  "reactionRollOrDamageReduction",
  "attackDamageReductionZeroDamageRedirect",
  "passiveArmorClassBonus",
  "weaponDamageDiceRollChoice",
  "attackDamageDieFloor",
  "martialArtsAttackProjection",
  "bardicInspirationGrant",
  "druidWildCompanionSpellCast",
  "weaponMasterySap",
  "weaponMasteryTopple",
  "weaponMasteryCleave",
  "weaponMasteryPush",
  "weaponMasterySlow",
  "zeroHitPointReplacement",
);

export const AlternateActionCostProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("alternateActionCost"),
  from: Schema.Struct({
    kind: Schema.Literal("standardAction"),
    actions: Schema.NonEmptyArray(Schema.Literal("dash", "disengage", "hide")),
  }),
  to: Schema.Struct({ kind: Schema.Literal("bonusAction") }),
});

export const PassiveRangedAttackRollBonusProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("passiveRangedAttackRollBonus"),
    attackRoll: Schema.Struct({
      bonus: Schema.Literal(2),
      weaponFilter: Schema.Struct({
        kind: Schema.Literal("weaponCategory"),
        category: Schema.Literal("ranged"),
      }),
    }),
  });

export const AttackRollMissToHitReplacementProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("attackRollMissToHitReplacement"),
    replacement: Schema.Struct({
      optional: Schema.Literal(true),
      trigger: Schema.Literal("missWithAttackRoll"),
      effect: Schema.Literal("replaceMissWithHit"),
      resetCadence: Schema.Literal("startOfNextTurn"),
    }),
  });

export const AttackActionAttackCountScalingProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("attackActionAttackCountScaling"),
    additionalAttacks: Schema.Literal(1, 2, 3),
  });

export const AttackActionAreaSaveDamageReplacementProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("attackActionAreaSaveDamageReplacement"),
    breath: Schema.Struct({
      activationCost: Schema.Struct({ kind: Schema.Literal("replaceAttack") }),
      resource: Schema.Struct({
        cap: Schema.Struct({ kind: Schema.Literal("proficiencyBonus") }),
        resetCadence: Schema.Literal("longRest"),
      }),
      area: Schema.Struct({
        origin: Schema.Struct({ kind: Schema.Literal("self") }),
        shapeChoice: Schema.Tuple(
          Schema.Struct({
            kind: Schema.Literal("cone"),
            lengthFeet: MovementFeet,
          }),
          Schema.Struct({
            kind: Schema.Literal("line"),
            lengthFeet: MovementFeet,
            widthFeet: MovementFeet,
          }),
        ),
      }),
      save: Schema.Struct({
        ability: Schema.Literal("dex"),
        dc: Schema.Struct({
          kind: Schema.Literal("innate"),
          base: Schema.Literal(8),
          ability: Schema.Literal("con"),
        }),
      }),
      damage: Schema.Struct({
        damageType: Schema.Struct({
          kind: Schema.Literal("draconicAncestry"),
          holeId: Schema.Literal(DRACONIC_ANCESTRY_DAMAGE_TYPE_HOLE_ID),
          value: Schema.Literal(...DRACONIC_ANCESTRY_DAMAGE_TYPES),
        }),
        amount: Schema.Struct({
          kind: Schema.Literal("characterLevelDice"),
          base: Schema.Struct({
            dice: Schema.Literal(1),
            dieSize: Schema.Literal(10),
          }),
          tiers: Schema.Tuple(
            Schema.Struct({
              atLevel: Schema.Literal(5),
              dice: Schema.Literal(2),
            }),
            Schema.Struct({
              atLevel: Schema.Literal(11),
              dice: Schema.Literal(3),
            }),
            Schema.Struct({
              atLevel: Schema.Literal(17),
              dice: Schema.Literal(4),
            }),
          ),
        }),
        onSuccess: Schema.Literal("halfDamage"),
      }),
    }),
  });

export const BonusActionDashTemporaryHitPointsProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("bonusActionDashTemporaryHitPoints"),
    dashTemporaryHitPoints: Schema.Struct({
      activationCost: Schema.Struct({
        kind: Schema.Literal("bonusAction"),
        action: Schema.Literal("dash"),
      }),
      temporaryHitPoints: Schema.Struct({
        amount: Schema.Struct({ kind: Schema.Literal("proficiencyBonus") }),
      }),
      resource: Schema.Struct({
        cap: Schema.Struct({ kind: Schema.Literal("proficiencyBonus") }),
        resetCadence: Schema.Literal("shortOrLongRest"),
      }),
    }),
  });

export const SpellSlotHealingModifierProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("spellSlotHealingModifier"),
  healingModifier: Schema.Struct({
    trigger: Schema.Struct({
      kind: Schema.Literal("casterSpellSlotRestoresHitPoints"),
      timing: Schema.Literal("turnSpellIsCast"),
    }),
    appliesTo: Schema.Literal("eachCreatureHealedBySpell"),
    bonus: Schema.Struct({
      kind: Schema.Literal("flatPlusSpellSlotLevel"),
      flat: Schema.Literal(2),
    }),
  }),
});

export const EnemyZeroHitPointTemporaryHitPointsProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("enemyZeroHitPointTemporaryHitPoints"),
    className: Schema.Literal(...CLASS_NAMES),
    temporaryHitPoints: Schema.Struct({
      trigger: Schema.Struct({
        kind: Schema.Literal("enemyReducedToZeroHitPoints"),
        bySelf: Schema.Literal(true),
        byOtherWithinFeet: MovementFeet,
      }),
      amount: Schema.Struct({
        kind: Schema.Literal("abilityModifierPlusClassLevel"),
        ability: Schema.Literal("cha"),
        minimum: Schema.Literal(1),
      }),
    }),
  });

export const CreatureSpaceMovementPermissionProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("creatureSpaceMovementPermission"),
    permission: Schema.Struct({
      moveThrough: Schema.Struct({
        kind: Schema.Literal("occupiedCreatureSpace"),
        creatureSizeRelationToSelf: Schema.Literal("larger"),
      }),
      canStopInOccupiedSpace: Schema.Literal(false),
    }),
  });

export const HideActionObscurementPermissionProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("hideActionObscurementPermission"),
    permission: Schema.Struct({
      allowedObscurement: Schema.Struct({
        kind: Schema.Literal("obscuredOnlyByCreature"),
        creatureSizeRelationToSelf: Schema.Literal("atLeastOneSizeLarger"),
      }),
    }),
  });

export const RogueSteadyAimProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("rogueSteadyAim"),
  steadyAim: Schema.Struct({
    activationCost: Schema.Struct({ kind: Schema.Literal("bonusAction") }),
    precondition: Schema.Literal("noMovementThisTurn"),
    attackRoll: Schema.Struct({
      mode: Schema.Literal("advantage"),
      appliesTo: Schema.Literal("nextAttackRollCurrentTurn"),
    }),
    speed: Schema.Struct({
      kind: Schema.Literal("setToZero"),
      until: Schema.Literal("endOfCurrentTurn"),
    }),
  }),
});

export const PotentCantripProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("potentCantrip"),
  potentCantrip: Schema.Struct({
    trigger: Schema.Struct({
      kind: Schema.Literal("castCantripAtCreature"),
      cantripKind: Schema.Literal("damaging"),
    }),
    outcomes: Schema.Tuple(
      Schema.Literal("missWithAttackRoll"),
      Schema.Literal("targetSucceedsSavingThrow"),
    ),
    damage: Schema.Literal("halfCantripDamageIfAny"),
    additionalEffect: Schema.Literal("none"),
  }),
});

export const GrapplerProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("grappler"),
  grappler: Schema.Struct({
    punchAndGrab: Schema.Struct({
      trigger: Schema.Literal("attackActionUnarmedStrikeHitOnTurn"),
      options: Schema.Tuple(
        Schema.Literal("damage"),
        Schema.Literal("grapple"),
      ),
      usageLimit: Schema.Literal("oncePerTurn"),
    }),
    attackAdvantage: Schema.Struct({
      mode: Schema.Literal("advantage"),
      target: Schema.Literal("creatureGrappledByYou"),
    }),
    fastWrestler: Schema.Struct({
      movementCost: Schema.Literal("noExtraGrappleDragCost"),
      targetSize: Schema.Literal("yourSizeOrSmaller"),
    }),
  }),
});

export const RetaliationReactionAttackProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("retaliationReactionAttack"),
  retaliation: Schema.Struct({
    trigger: Schema.Struct({
      kind: Schema.Literal("takesDamageFromCreatureWithinFiveFeet"),
      rangeFeet: Schema.Literal(5),
    }),
    response: Schema.Struct({
      kind: Schema.Literal("oneMeleeWeaponOrUnarmedStrikeAgainstDamageSource"),
      actionCost: Schema.Literal("reaction"),
    }),
  }),
});

export const TacticalMasterReplacementProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("tacticalMasterReplacement"),
  replacementProperties: Schema.Tuple(
    Schema.Literal("push"),
    Schema.Literal("sap"),
    Schema.Literal("slow"),
  ),
});

export const LightExtraAttackDamageAbilityModifierProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("lightExtraAttackDamageAbilityModifier"),
    damageAbilityModifier: Schema.Struct({
      optional: Schema.Literal(true),
      trigger: Schema.Literal("lightPropertyExtraAttackDamageRoll"),
      attackWeapon: Schema.Struct({
        kind: Schema.Literal("weaponWithLightProperty"),
      }),
      modifierSource: Schema.Literal("attackAbilityModifier"),
      appliesWhen: Schema.Literal("notAlreadyAddingAbilityModifier"),
    }),
  });

export const InitiativeProficiencyAndSwapProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("initiativeProficiencyAndSwap"),
    initiative: Schema.Struct({
      initiativeRollBonus: Schema.Struct({
        amount: Schema.Struct({ kind: Schema.Literal("proficiencyBonus") }),
      }),
      swap: Schema.Struct({
        timing: Schema.Literal("immediatelyAfterInitiativeRoll"),
        ally: Schema.Literal("willingAllySameCombat"),
        prohibitedByCondition: Schema.Literal("incapacitated"),
      }),
    }),
  });

export const D20TestNaturalOneRerollProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("d20TestNaturalOneReroll"),
  reroll: Schema.Struct({
    optional: Schema.Literal(true),
    trigger: Schema.Struct({
      kind: Schema.Literal("d20TestRollIs"),
      dieFace: Schema.Literal(1),
    }),
    reroll: Schema.Struct({
      kind: Schema.Literal("triggeringD20"),
      use: Schema.Literal("newRoll"),
    }),
  }),
});

export const PassiveSavingThrowRollModeProcedureExecutionSchema = Schema.Struct(
  {
    kind: Schema.Literal("passiveSavingThrowRollMode"),
    savingThrow: Schema.Union(
      Schema.Struct({
        mode: Schema.Literal("advantage"),
        scope: Schema.Struct({
          kind: Schema.Literal("savingThrowAbility"),
          ability: Schema.Literal("dex"),
          suppressedByCondition: Schema.Literal("incapacitated"),
        }),
      }),
      Schema.Struct({
        mode: Schema.Literal("advantage"),
        scope: Schema.Struct({
          kind: Schema.Literal("condition"),
          condition: Schema.Literal("poisoned", "frightened"),
        }),
      }),
    ),
  },
);

export const PassiveAbilityCheckRollModeProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("passiveAbilityCheckRollMode"),
    abilityCheck: Schema.Struct({
      mode: Schema.Literal("advantage"),
      scope: Schema.Struct({
        kind: Schema.Literal("endingCondition"),
        condition: Schema.Literal("grappled"),
      }),
    }),
  });

export const PassiveDamageResistanceProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("passiveDamageResistance"),
  resistance: Schema.Struct({
    damageType: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("draconicAncestry"),
        holeId: Schema.Literal(
          "species_dragonborn_draconic_ancestry_damage_type",
        ),
        value: DamageTypeSchema,
      }),
      Schema.Struct({ kind: Schema.Literal("fixed"), value: DamageTypeSchema }),
    ),
  }),
});

const PassiveSpeedBonusFactsSchema = Schema.Struct({
  deltaFeet: MovementDeltaFeet,
  condition: Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("notWearingArmor"),
      categories: Schema.Tuple(Schema.Literal("heavy")),
    }),
    Schema.Struct({ kind: Schema.Literal("unarmoredUnshielded") }),
  ),
});

export const PassiveSpeedBonusProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("passiveSpeedBonus"),
  ...PassiveSpeedBonusFactsSchema.fields,
});

const PassiveSpeedKindGrantsFactsSchema = Schema.Struct({
  speed: Schema.optionalWith(PassiveSpeedBonusFactsSchema, { exact: true }),
  grants: Schema.NonEmptyArray(
    Schema.Struct({
      speedKind: Schema.Literal("climb", "swim"),
      feet: Schema.Struct({ kind: Schema.Literal("walkSpeed") }),
    }),
  ),
});

export const PassiveSpeedKindGrantsProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("passiveSpeedKindGrants"),
  ...PassiveSpeedKindGrantsFactsSchema.fields,
});

export const AcrobaticMovementProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("acrobaticMovement"),
  acrobaticMovement: Schema.Struct({
    condition: Schema.Struct({ kind: Schema.Literal("unarmoredUnshielded") }),
    timing: Schema.Literal("onYourTurn"),
    paths: Schema.Tuple(
      Schema.Struct({
        kind: Schema.Literal("verticalSurface"),
        path: Schema.Literal("alongVerticalSurface"),
        withoutFallingDuringMovement: Schema.Literal(true),
      }),
      Schema.Struct({
        kind: Schema.Literal("liquid"),
        path: Schema.Literal("acrossLiquid"),
        withoutFallingDuringMovement: Schema.Literal(true),
      }),
    ),
  }),
});

export const MonkFocusBattleOptionsProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("monkFocusBattleOptions"),
  effectSaveDc: Schema.Struct({
    kind: Schema.Literal("classFeatureAbilitySaveDc"),
    base: Schema.Literal(8),
    ability: Schema.Literal("wis"),
  }),
  flurryOfBlows: Schema.Struct({
    focusPointCost: Schema.Literal(1),
    strikeCount: Schema.Literal(2),
    displayName: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  patientDefense: Schema.Struct({
    freeAction: Schema.Literal("disengage"),
    focusPointCost: Schema.Literal(1),
    focusActions: Schema.Tuple(
      Schema.Literal("disengage"),
      Schema.Literal("dodge"),
    ),
    displayName: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
  stepOfTheWind: Schema.Struct({
    freeAction: Schema.Literal("dash"),
    focusPointCost: Schema.Literal(1),
    focusActions: Schema.Tuple(
      Schema.Literal("disengage"),
      Schema.Literal("dash"),
    ),
    jumpDistanceMultiplier: Schema.Struct({ multiplier: Schema.Literal(2) }),
    displayName: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
});

export const DruidWildShapeKnownFormProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("druidWildShapeKnownForm"),
  classLevel: ClassLevel,
  knownFormRoster: Schema.Struct({
    creatureType: Schema.Literal(...CREATURE_TYPES),
    count: Schema.Number,
    maxChallengeRating: Schema.Number,
    flySpeed: Schema.Literal("allowed", "forbidden"),
  }),
});

const BonusActionDelegatedStandardActionsFactsSchema = Schema.Struct({
  activationCost: Schema.Struct({ kind: Schema.Literal("bonusAction") }),
  sleightOfHand: Schema.Struct({
    abilityCheck: Schema.Struct({
      ability: Schema.Literal("dex"),
      skill: Schema.Literal("sleight_of_hand"),
    }),
    operations: Schema.Tuple(
      Schema.Literal("pick_lock_with_thieves_tools"),
      Schema.Literal("disarm_trap_with_thieves_tools"),
      Schema.Literal("pick_pocket"),
    ),
  }),
  objectUse: Schema.Struct({
    actions: Schema.Tuple(
      Schema.Struct({ action: Schema.Literal("utilize") }),
      Schema.Struct({
        action: Schema.Literal("magic"),
        restrictedTo: Schema.Literal("magicItemRequiresMagicAction"),
      }),
    ),
  }),
});

export const BonusActionDelegatedStandardActionsProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("bonusActionDelegatedStandardActions"),
    ...BonusActionDelegatedStandardActionsFactsSchema.fields,
  });

export const RemarkableAthleteProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("remarkableAthlete"),
  remarkableAthlete: Schema.Struct({
    initiative: Schema.Struct({
      kind: Schema.Literal("rollAdvantage"),
      roll: Schema.Literal("initiative"),
    }),
    abilityCheck: Schema.Struct({
      kind: Schema.Literal("rollAdvantage"),
      ability: Schema.Literal("str"),
      skill: Schema.Literal("athletics"),
    }),
    criticalHitMovement: Schema.Struct({
      trigger: Schema.Literal("scoreCriticalHit"),
      timing: Schema.Literal("immediatelyAfterTrigger"),
      distance: Schema.Struct({ kind: Schema.Literal("halfSpeed") }),
      opportunityAttacks: Schema.Literal("doesNotProvoke"),
    }),
  }),
});

export const HuntersPreyProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("huntersPrey"),
  huntersPrey: Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("woundedTargetWeaponDamage"),
      trigger: Schema.Literal("hitCreatureWithWeapon"),
      targetPredicate: Schema.Literal("missingAnyHitPoints"),
      usageLimit: Schema.Literal("oncePerTurn"),
      damage: Schema.Struct({
        kind: Schema.Literal("addAttackDamageDice"),
        dice: Schema.Struct({
          dice: Schema.Literal(1),
          dieSize: Schema.Literal(8),
        }),
        damageType: Schema.Literal("sameAsAttack"),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("nearbyDifferentTargetSameWeaponAttack"),
      trigger: Schema.Literal("makeWeaponAttack"),
      usageLimit: Schema.Literal("oncePerTurn"),
      extraAttack: Schema.Struct({
        weapon: Schema.Literal("sameWeapon"),
        target: Schema.Struct({
          kind: Schema.Literal("differentCreatureNearOriginalTarget"),
          withinFeetOfOriginalTarget: MovementFeet,
          withinWeaponRange: Schema.Literal(true),
          notAttackedThisTurn: Schema.Literal(true),
        }),
      }),
    }),
  ),
});

export const BrutalStrikeProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("brutalStrike"),
  brutalStrike: Schema.Struct({
    trigger: Schema.Struct({
      kind: Schema.Literal("recklessAttackStrengthAttackHit"),
      advantageForgone: Schema.Literal(true),
      attackMustNotHaveDisadvantage: Schema.Literal(true),
    }),
    damage: Schema.Struct({
      dice: Schema.Literal(1),
      dieSize: Schema.Literal(10),
      damageType: Schema.Literal("sameAsAttack"),
    }),
    options: Schema.Tuple(
      Schema.Struct({
        id: Schema.Literal("forceful_blow"),
        pushFeet: MovementFeet,
        selfMovement: Schema.Struct({
          kind: Schema.Literal("moveTowardTarget"),
          distance: Schema.Literal("halfSpeed"),
          opportunityAttacks: Schema.Literal("doesNotProvoke"),
        }),
      }),
      Schema.Struct({
        id: Schema.Literal("hamstring_blow"),
        deltaFeet: MovementDeltaFeet,
        stacking: Schema.Literal("mostRecentOnly"),
        expires: Schema.Literal("startOfYourNextTurn"),
      }),
    ),
  }),
});

export const SpellInvocationResourceExecutionSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("none") }),
  Schema.Struct({
    tag: Schema.Literal("spellSlot"),
    slotLevel: SpellSlotLevel,
  }),
  Schema.Struct({
    tag: Schema.Literal("classFeatureFreeCast"),
    resourcePoolRef: BattleResourcePoolExecutionRef,
    resourceUnitId: Schema.optionalWith(Schema.Never, { exact: true }),
  }),
);

const MechanicalResourceSpendSchema = Schema.Struct({
  resourcePoolRef: BattleResourcePoolExecutionRef,
  resourceUnitId: Schema.optionalWith(Schema.Never, { exact: true }),
});

const MechanicalSingleResourceSpendSchema = Schema.Struct({
  resourcePoolRef: BattleResourcePoolExecutionRef,
  amount: Schema.Literal(1),
  resourceUnitId: Schema.optionalWith(Schema.Never, { exact: true }),
});

export const ExtraActionGrantProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("extraActionGrant"),
  restriction: ActionRestrictionSchema,
});

export const SelfBonusActionHealingProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("selfBonusActionHealing"),
  dice: Schema.Number,
  dieSize: Schema.Number,
  flatBase: Schema.Number,
  flatPerLevel: Schema.Number,
  startingAtLevel: Schema.Number,
  className: Schema.Literal(...CLASS_NAMES),
  classLevel: ClassLevel,
});

const OngoingFeatureLifecycleProcedureExecutionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("turnBoundary"),
    initialExpiration: Schema.Literal("startOfNextTurn", "endOfNextTurn"),
    earlyEndConditions: Schema.Array(Schema.Literal(...CONDITIONS)),
    earlyEndArmorCategories: Schema.Union(
      Schema.Tuple(),
      Schema.Tuple(Schema.Literal("heavy")),
    ),
    extensionTriggers: Schema.Tuple(),
  }),
  Schema.Struct({
    kind: Schema.Literal("roundExtended"),
    initialExpiration: Schema.Literal("endOfNextTurn"),
    maximumDurationRounds: Schema.Number,
    earlyEndConditions: Schema.Array(Schema.Literal(...CONDITIONS)),
    earlyEndArmorCategories: Schema.Union(
      Schema.Tuple(),
      Schema.Tuple(Schema.Literal("heavy")),
    ),
    extensionTriggers: Schema.NonEmptyArray(
      Schema.Literal(
        "attackRollAgainstEnemy",
        "bonusAction",
        "enemySavingThrow",
      ),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("fixedDuration"),
    maximumDurationRounds: Schema.Number,
    earlyEndConditions: Schema.Array(Schema.Literal(...CONDITIONS)),
    earlyEndArmorCategories: Schema.Union(
      Schema.Tuple(),
      Schema.Tuple(Schema.Literal("heavy")),
    ),
    extensionTriggers: Schema.Tuple(),
  }),
);

const OngoingFeatureRollModifierProcedureExecutionSchema = Schema.Struct({
  mode: Schema.Literal(...ATTACK_ROLL_MODES),
  affects: Schema.Literal("selfRoll", "rollsAgainstSelf"),
  on: Schema.Literal("attackRoll"),
  abilityFilter: Schema.optionalWith(Schema.Array(AbilitySchema), {
    exact: true,
  }),
});

const OngoingFeatureSpellModifierProcedureExecutionSchema = Schema.Struct({
  sourceClassName: Schema.Literal(...CLASS_NAMES),
  saveDcBonus: Schema.Number,
  attackRollMode: Schema.Literal(...ATTACK_ROLL_MODES),
});

const OngoingFeatureDamageModifierProcedureExecutionSchema = Schema.Struct({
  amount: Schema.Number,
  abilityFilter: Schema.optionalWith(Schema.Array(AbilitySchema), {
    exact: true,
  }),
  weaponUsageFilter: Schema.optionalWith(WeaponUsageSchema, { exact: true }),
});

export const OngoingFeatureProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("ongoingFeature"),
  activationTrigger: Schema.Literal("bonusAction", "firstAttackRoll"),
  spendsUse: Schema.Boolean,
  lifecycle: OngoingFeatureLifecycleProcedureExecutionSchema,
  concentrationEffect: Schema.optionalWith(Schema.Literal("breakAndPrevent"), {
    exact: true,
  }),
  actionRestrictions: Schema.Array(Schema.Literal("spellcasting")),
  rollModifiers: Schema.Array(
    OngoingFeatureRollModifierProcedureExecutionSchema,
  ),
  spellModifiers: Schema.Array(
    OngoingFeatureSpellModifierProcedureExecutionSchema,
  ),
  damageModifiers: Schema.Array(
    OngoingFeatureDamageModifierProcedureExecutionSchema,
  ),
  resistances: Schema.Array(DamageTypeSchema),
});

export const AttackDamageRiderProcedureExecutionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("attackDamageRider"),
    optional: Schema.Literal(true),
    usageLimit: Schema.Literal("oncePerTurn"),
    trigger: Schema.Literal("finesseOrRangedAttackWithAdvantageOrAlly"),
    eligibility: Schema.Literal(
      "advantageOrNonIncapacitatedAllyWithin5ftOfTargetWithoutDisadvantage",
    ),
    classLevel: ClassLevel,
    dice: Schema.Struct({
      kind: Schema.Literal("classLevelTable"),
      dieSize: Schema.Number,
      diceByLevel: Schema.Array(
        Schema.Struct({ atLevel: Schema.Number, count: Schema.Number }),
      ),
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("attackDamageRider"),
    optional: Schema.Literal(false),
    usageLimit: Schema.Literal("oncePerTurn"),
    trigger: Schema.Literal("rageActiveRecklessStrengthBasedAttackFirstHit"),
    classLevel: ClassLevel,
    dice: Schema.Struct({
      kind: Schema.Literal("rageDamageBonus"),
      dieSize: Schema.Literal(6),
    }),
  }),
);

export const SaveDamageReplacementProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("saveDamageReplacement"),
  ability: Schema.Literal("dex"),
  requiredSuccessDamage: Schema.Literal("half"),
  onSuccess: Schema.Literal("none"),
  onFail: Schema.Literal("half"),
  suppressedByCondition: Schema.Literal("incapacitated"),
});

const ResourceDieReductionProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("resourceDie"),
  dice: Schema.Literal(1),
  dieSize: Schema.Literal(6, 8, 10, 12),
  flatModifier: Schema.Literal(0),
  spends: MechanicalSingleResourceSpendSchema,
});

const AttackDamageReductionZeroDamageRedirectProcedureExecutionSchema =
  Schema.Struct({
    spends: MechanicalSingleResourceSpendSchema,
    save: Schema.Struct({
      ability: Schema.Literal("dex"),
      dc: Schema.Struct({
        kind: Schema.Literal("abilityPlusProficiency"),
        base: Schema.Literal(8),
        ability: Schema.Literal("wis"),
      }),
    }),
    damage: Schema.Struct({
      dice: Schema.Struct({
        dice: Schema.Literal(2),
        dieSize: DamageDieSizeSchema,
      }),
      ability: Schema.Literal("dex"),
      damageType: Schema.Literal("sameTypeDealtByAttack"),
    }),
    targetGate: Schema.Struct({
      melee: Schema.Literal("visibleWithin5Feet"),
      ranged: Schema.Literal("visibleWithin60FeetWithoutTotalCover"),
    }),
  });

const AttackDamageReductionProcedureExecutionFields = {
  kind: Schema.Literal("attackDamageReduction"),
  requiresVisibleAttacker: Schema.optionalWith(Schema.Literal(true), {
    exact: true,
  }),
  damageIncludes: Schema.optionalWith(Schema.Array(DamageTypeSchema), {
    exact: true,
  }),
  reduction: Schema.Union(
    Schema.Struct({ kind: Schema.Literal("halfDamage") }),
    Schema.Struct({
      kind: Schema.Literal("dicePlusAbilityModifierPlusClassLevel"),
      dieSize: Schema.Literal(10),
      ability: Schema.Literal("dex"),
    }),
  ),
} as const;

const ReactionRollOrDamageReductionModifierProcedureExecutionSchema =
  Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("attackRollReduction"),
      rangeFeet: MovementFeet,
      requiresVisibleCreature: Schema.Literal(true),
      reduction: ResourceDieReductionProcedureExecutionSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("abilityCheckReduction"),
      rangeFeet: MovementFeet,
      requiresVisibleCreature: Schema.Literal(true),
      reduction: ResourceDieReductionProcedureExecutionSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("attackDamageRollReduction"),
      rangeFeet: MovementFeet,
      requiresVisibleCreature: Schema.Literal(true),
      reduction: ResourceDieReductionProcedureExecutionSchema,
    }),
    Schema.Struct(AttackDamageReductionProcedureExecutionFields),
    Schema.Struct({
      ...AttackDamageReductionProcedureExecutionFields,
      zeroDamageRedirect:
        AttackDamageReductionZeroDamageRedirectProcedureExecutionSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("fallDamageReduction"),
      reduction: Schema.Struct({
        kind: Schema.Literal("classLevelMultiplier"),
        multiplier: Schema.Literal(5),
      }),
    }),
  );

export const ReactionRollOrDamageReductionProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("reactionRollOrDamageReduction"),
    classLevel: ClassLevel,
    modifiers: Schema.Array(
      ReactionRollOrDamageReductionModifierProcedureExecutionSchema,
    ),
  });

export const PassiveArmorClassBonusProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("passiveArmorClassBonus"),
  armorClass: Schema.Struct({
    bonus: Schema.Literal(1),
    condition: Schema.Struct({
      kind: Schema.Literal("wearingArmor"),
      categories: Schema.Tuple(
        Schema.Literal("light"),
        Schema.Literal("medium"),
        Schema.Literal("heavy"),
      ),
    }),
  }),
});

export const UnitFeaturePassiveSpeedBonusProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("passiveSpeedBonus"),
    speed: PassiveSpeedBonusFactsSchema,
  });

export const UnitFeaturePassiveSpeedKindGrantsProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("passiveSpeedKindGrants"),
    speedKindGrants: PassiveSpeedKindGrantsFactsSchema,
  });

export const WeaponDamageDiceRollChoiceProcedureExecutionSchema = Schema.Struct(
  {
    kind: Schema.Literal("weaponDamageDiceRollChoice"),
    damageDiceChoice: Schema.Struct({
      optional: Schema.Literal(true),
      trigger: Schema.Literal("weaponHit"),
      usageLimit: Schema.Literal("oncePerTurn"),
      diceScope: Schema.Literal("weaponDamageDice"),
      choose: Schema.Literal("eitherRoll"),
    }),
  },
);

export const AttackDamageDieFloorProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("attackDamageDieFloor"),
  damageDieFloor: Schema.Struct({
    optional: Schema.Literal(true),
    trigger: Schema.Literal("attackDamageRoll"),
    attackWeapon: Schema.Struct({
      kind: Schema.Literal("meleeWeaponHeldWithTwoHands"),
      propertyGate: Schema.Literal("twoHandedOrVersatile"),
    }),
    dieScope: Schema.Literal("attackDamageDice"),
    minimumResult: Schema.Literal(3),
  }),
});

export const MartialArtsAttackProjectionProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("martialArtsAttackProjection"),
    classLevel: ClassLevel,
    martialArts: Schema.Struct({
      condition: Schema.Struct({
        kind: Schema.Literal("unarmoredUnshieldedOnlyMonkWeapons"),
      }),
      bonusActionAttack: Schema.Struct({
        kind: Schema.Literal("unarmedStrike"),
      }),
      damageReplacement: Schema.Struct({
        scope: Schema.Literal("unarmedOrMonkWeapon"),
        dice: Schema.Literal(1),
        dieSize: Schema.Literal(6, 8, 10, 12),
      }),
      abilitySubstitution: Schema.Struct({
        use: Schema.Literal("dex"),
        replaces: Schema.Literal("str"),
        on: Schema.Tuple(
          Schema.Literal("attackRoll"),
          Schema.Literal("damageRoll"),
          Schema.Literal("unarmedStrikeSaveDc"),
        ),
      }),
    }),
  });

export const BardicInspirationGrantProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("bardicInspirationGrant"),
  rangeFeet: MovementFeet,
  dieSize: DamageDieSizeSchema,
  durationTicks: ElapsedTimeTicksSchema,
  spends: MechanicalSingleResourceSpendSchema,
});

export const ZeroHitPointReplacementProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("zeroHitPointReplacement"),
  optional: Schema.Literal(true),
  trigger: Schema.Literal("reducedToZeroHitPointsNotKilledOutright"),
  replacementHp: Schema.Literal(1),
  resetCadence: Schema.Literal("longRest"),
});

export const UnitFeatureBonusActionDelegatedStandardActionsProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("bonusActionDelegatedStandardActions"),
    actionEconomy: BonusActionDelegatedStandardActionsProcedureExecutionSchema,
  });

export const FailedAbilityCheckResourceBoostProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("failedAbilityCheckResourceBoost"),
    abilityCheck: Schema.Struct({
      trigger: Schema.Literal("failedAbilityCheck"),
      bonus: Schema.Struct({
        dice: Schema.Literal(1),
        dieSize: Schema.Literal(10),
      }),
      spends: MechanicalResourceSpendSchema,
      refundSpendOnStillFailed: Schema.Literal(true),
    }),
  });

export const FailedSavingThrowRerollProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("failedSavingThrowReroll"),
  savingThrow: Schema.Struct({
    trigger: Schema.Literal("failedSavingThrow"),
    reroll: Schema.Struct({
      use: Schema.Literal("newRoll"),
      bonus: Schema.Struct({
        kind: Schema.Literal("classLevel"),
        className: Schema.Literal("fighter"),
      }),
    }),
    spends: MechanicalSingleResourceSpendSchema,
    resetCadence: Schema.Literal("longRest"),
  }),
});

export const MagicActionHealingPoolProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("magicActionHealingPool"),
  className: Schema.Literal(...CLASS_NAMES),
  healingPool: Schema.Struct({
    activationCost: Schema.Struct({
      kind: Schema.Literal("standardAction"),
      action: Schema.Literal("magic"),
    }),
    spends: MechanicalSingleResourceSpendSchema,
    rangeFeet: MovementFeet,
    targetSelection: Schema.Struct({
      mode: Schema.Literal("anyNumber"),
      targetKinds: Schema.Tuple(Schema.Literal("creature")),
      stateFilter: Schema.Tuple(Schema.Literal("bloodied")),
      includesSelf: Schema.Literal(true),
    }),
    pool: Schema.Struct({
      kind: Schema.Literal("classLevelMultiplier"),
      multiplier: Schema.Literal(5),
    }),
    perTargetCap: Schema.Literal("halfHitPointMaximum"),
  }),
});

const FixedD6AmountProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("fixed"),
  expr: Schema.Struct({
    dice: Schema.Literal(2, 3, 4),
    dieSize: Schema.Literal(6),
  }),
});

export const MagicActionAreaSaveDamageHealingProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("magicActionAreaSaveDamageHealing"),
    damageHealing: Schema.Struct({
      activationCost: Schema.Struct({
        kind: Schema.Literal("standardAction"),
        action: Schema.Literal("magic"),
      }),
      spends: MechanicalSingleResourceSpendSchema,
      area: Schema.Struct({
        origin: Schema.Struct({
          kind: Schema.Literal("pointWithinRange"),
          rangeFeet: MovementFeet,
        }),
        shape: Schema.Struct({
          kind: Schema.Literal("sphere"),
          radiusFeet: MovementFeet,
        }),
      }),
      save: Schema.Struct({
        ability: Schema.Literal("con"),
        dc: Schema.Literal("classSpellcastingSpellSaveDc"),
      }),
      damage: Schema.Struct({
        targetSelection: Schema.Literal("creaturesOfYourChoiceInArea"),
        amount: FixedD6AmountProcedureExecutionSchema,
        damageType: Schema.Literal("necrotic"),
        onSuccess: Schema.Literal("halfDamage"),
      }),
      healing: Schema.Struct({
        targetSelection: Schema.Literal("oneCreatureOfYourChoiceInArea"),
        amount: FixedD6AmountProcedureExecutionSchema,
      }),
    }),
  });

export const MagicActionSaveGatedConditionProcedureExecutionSchema =
  Schema.Struct({
    kind: Schema.Literal("magicActionSaveGatedCondition"),
    condition: Schema.Struct({
      activationCost: Schema.Struct({
        kind: Schema.Literal("standardAction"),
        action: Schema.Literal("magic"),
      }),
      spends: MechanicalSingleResourceSpendSchema,
      targetSelection: Schema.Struct({
        kind: Schema.Literal("visibleCreaturesWithinRange"),
        rangeFeet: MovementFeet,
        count: Schema.Struct({
          kind: Schema.Literal("abilityModifier"),
          ability: Schema.Literal("cha"),
          minimum: Schema.Literal(1),
        }),
      }),
      save: Schema.Struct({
        ability: Schema.Literal("wis"),
        dc: Schema.Literal("classSpellcastingSpellSaveDc"),
      }),
      onFail: Schema.Struct({
        condition: Schema.Literal("frightened"),
        durationTicks: ElapsedTimeTicksSchema,
        earlyEnd: Schema.Literal("targetTakesAnyDamage"),
        turnRestriction: Schema.Literal("moveActionOrBonusAction"),
      }),
    }),
  });

export const OpenHandTechniqueProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("openHandTechnique"),
  technique: Schema.Struct({
    trigger: Schema.Struct({
      kind: Schema.Literal("hitWithAttackGrantedBy"),
      resourcePoolRef: BattleResourcePoolExecutionRef,
      optionId: Schema.Literal("flurry_of_blows"),
    }),
    optional: Schema.Literal(true),
    effectSaveDc: Schema.Struct({
      kind: Schema.Literal("classFeatureAbilitySaveDc"),
      base: Schema.Literal(8),
      ability: Schema.Literal("wis"),
    }),
    effects: Schema.Struct({
      denyOpportunityAttacks: Schema.Struct({
        kind: Schema.Literal("denyOpportunityAttacks"),
        expires: Schema.Literal("startOfTargetNextTurn"),
      }),
      pushAwayOnFailedSave: Schema.Struct({
        kind: Schema.Literal("pushAwayOnFailedSave"),
        save: Schema.Struct({ ability: Schema.Literal("str") }),
        distanceFeet: MovementFeet,
      }),
      applyConditionOnFailedSave: Schema.Struct({
        kind: Schema.Literal("applyConditionOnFailedSave"),
        save: Schema.Struct({ ability: Schema.Literal("dex") }),
        condition: Schema.Literal("prone"),
      }),
    }),
  }),
});

export const StunningStrikeProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("stunningStrike"),
  stunningStrike: Schema.Struct({
    trigger: Schema.Struct({
      kind: Schema.Literal("hitCreatureWithMonkWeaponOrUnarmedStrike"),
      usageLimit: Schema.Literal("oncePerTurn"),
    }),
    optional: Schema.Literal(true),
    spends: MechanicalSingleResourceSpendSchema,
    savingThrow: Schema.Struct({ ability: Schema.Literal("con") }),
    onFail: Schema.Struct({
      kind: Schema.Literal("applyCondition"),
      condition: Schema.Literal("stunned"),
      expires: Schema.Literal("startOfSourceNextTurn"),
    }),
    onSuccess: Schema.Struct({
      speed: Schema.Struct({
        kind: Schema.Literal("halve"),
        expires: Schema.Literal("startOfSourceNextTurn"),
      }),
      attackRoll: Schema.Struct({
        mode: Schema.Literal("advantage"),
        appliesTo: Schema.Literal(
          "nextAttackRollAgainstTargetBeforeExpiration",
        ),
      }),
    }),
  }),
});

const CunningStrikeCostSchema = Schema.Struct({
  kind: Schema.Literal("sneakAttackDamageDice"),
  dice: Schema.Literal(1),
  dieSize: Schema.Literal(6),
});

const CunningStrikeEffectSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("equipmentGatedConditionSave"),
    requires: Schema.Struct({
      kind: Schema.Literal("equipmentOnPerson"),
      equipment: Schema.Struct({
        kind: Schema.Literal("tool"),
        toolId: Schema.Literal("poisoners_kit"),
      }),
    }),
    save: Schema.Struct({ ability: Schema.Literal("con") }),
    onFail: Schema.Struct({
      kind: Schema.Literal("applyCondition"),
      condition: Schema.Literal("poisoned"),
      durationTicks: ElapsedTimeTicksSchema,
      repeatSave: Schema.Struct({
        cadence: Schema.Literal("endOfTargetTurn"),
        onSuccess: Schema.Literal("endCondition"),
      }),
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("sizeGatedConditionSave"),
    target: Schema.Struct({ maxSize: Schema.Literal("large") }),
    save: Schema.Struct({ ability: Schema.Literal("dex") }),
    onFail: Schema.Struct({
      kind: Schema.Literal("applyCondition"),
      condition: Schema.Literal("prone"),
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("postDamageMovement"),
    movement: Schema.Struct({
      timing: Schema.Literal("immediatelyAfterAttack"),
      distance: Schema.Struct({ kind: Schema.Literal("halfSpeed") }),
      opportunityAttacks: Schema.Literal("doesNotProvoke"),
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("hideInvisibleEndSuppression"),
    prerequisite: Schema.Struct({
      kind: Schema.Literal("hideActionInvisibleCondition"),
    }),
    conditionSource: Schema.Literal("hideAction"),
    ifTurnEndsBehindCover: Schema.Tuple(
      Schema.Literal("threeQuarters", "total"),
      Schema.Literal("threeQuarters", "total"),
    ),
  }),
);

const CunningStrikeOptionSchema = Schema.Struct({
  selectionId: Schema.Literal(...BATTLE_CUNNING_STRIKE_OPTION_SELECTION_IDS),
  cost: CunningStrikeCostSchema,
  effect: CunningStrikeEffectSchema,
});

export const CunningStrikeProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("cunningStrike"),
  cunningStrike: Schema.Struct({
    trigger: Schema.Struct({
      kind: Schema.Literal("dealSneakAttackDamage"),
      damageRiderProcedureRef: BattleProcedureExecutionRef,
      sourceUnitId: Schema.optionalWith(Schema.Never, { exact: true }),
    }),
    choice: Schema.Struct({
      kind: Schema.Literal("chooseOne"),
      maxOptions: Schema.Literal(1),
    }),
    effectSaveDc: Schema.Struct({
      kind: Schema.Literal("classFeatureAbilitySaveDc"),
      base: Schema.Literal(8),
      ability: Schema.Literal("dex"),
    }),
    options: Schema.Array(CunningStrikeOptionSchema),
  }),
});

export const CunningStrikeOptionGrantProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("cunningStrikeOptionGrant"),
  optionGrant: Schema.Struct({
    sourceProcedureRef: BattleProcedureExecutionRef,
    sourceUnitId: Schema.optionalWith(Schema.Never, { exact: true }),
    option: CunningStrikeOptionSchema,
  }),
});

export const PaladinSacredWeaponProcedureExecutionSchema = Schema.Struct({
  kind: Schema.Literal("paladinSacredWeapon"),
  sacredWeapon: Schema.Struct({
    activationCost: Schema.Struct({
      kind: Schema.Literal("standardAction"),
      action: Schema.Literal("attack"),
    }),
    spends: MechanicalSingleResourceSpendSchema,
    target: Schema.Literal("heldMeleeWeapon"),
    duration: Schema.Struct({
      amount: Schema.Literal(10),
      unit: Schema.Literal("minute"),
      endsOn: Schema.Tuple(
        Schema.Literal("useFeatureAgain"),
        Schema.Literal("dismissNoAction"),
        Schema.Literal("notCarryingWeapon"),
      ),
    }),
    attackRollBonus: Schema.Struct({
      kind: Schema.Literal("abilityModifier"),
      ability: Schema.Literal("cha"),
      minimum: Schema.Literal(1),
      appliesTo: Schema.Literal("imbuedWeaponAttackRolls"),
    }),
    hitDamageTypeChoice: Schema.Tuple(
      Schema.Literal("normal"),
      Schema.Literal("radiant"),
    ),
    light: Schema.Struct({
      brightRadiusFeet: MovementFeet,
      dimAdditionalFeet: MovementFeet,
    }),
  }),
});

export const UnitSupportProcedureExecutionSchema = Schema.Union(
  LiteralUnitSupportProcedureExecutionSchema,
  AlternateActionCostProcedureExecutionSchema,
  PassiveRangedAttackRollBonusProcedureExecutionSchema,
  AttackRollMissToHitReplacementProcedureExecutionSchema,
  AttackActionAttackCountScalingProcedureExecutionSchema,
  AttackActionAreaSaveDamageReplacementProcedureExecutionSchema,
  BonusActionDashTemporaryHitPointsProcedureExecutionSchema,
  SpellSlotHealingModifierProcedureExecutionSchema,
  EnemyZeroHitPointTemporaryHitPointsProcedureExecutionSchema,
  CreatureSpaceMovementPermissionProcedureExecutionSchema,
  HideActionObscurementPermissionProcedureExecutionSchema,
  RogueSteadyAimProcedureExecutionSchema,
  PotentCantripProcedureExecutionSchema,
  GrapplerProcedureExecutionSchema,
  RetaliationReactionAttackProcedureExecutionSchema,
  TacticalMasterReplacementProcedureExecutionSchema,
  LightExtraAttackDamageAbilityModifierProcedureExecutionSchema,
  InitiativeProficiencyAndSwapProcedureExecutionSchema,
  D20TestNaturalOneRerollProcedureExecutionSchema,
  PassiveSavingThrowRollModeProcedureExecutionSchema,
  PassiveAbilityCheckRollModeProcedureExecutionSchema,
  PassiveDamageResistanceProcedureExecutionSchema,
  PassiveSpeedBonusProcedureExecutionSchema,
  PassiveSpeedKindGrantsProcedureExecutionSchema,
  AcrobaticMovementProcedureExecutionSchema,
  MonkFocusBattleOptionsProcedureExecutionSchema,
  DruidWildShapeKnownFormProcedureExecutionSchema,
  BonusActionDelegatedStandardActionsProcedureExecutionSchema,
  RemarkableAthleteProcedureExecutionSchema,
  HuntersPreyProcedureExecutionSchema,
  BrutalStrikeProcedureExecutionSchema,
  FailedAbilityCheckResourceBoostProcedureExecutionSchema,
  FailedSavingThrowRerollProcedureExecutionSchema,
  MagicActionHealingPoolProcedureExecutionSchema,
  MagicActionAreaSaveDamageHealingProcedureExecutionSchema,
  MagicActionSaveGatedConditionProcedureExecutionSchema,
  OpenHandTechniqueProcedureExecutionSchema,
  StunningStrikeProcedureExecutionSchema,
  CunningStrikeProcedureExecutionSchema,
  CunningStrikeOptionGrantProcedureExecutionSchema,
  PaladinSacredWeaponProcedureExecutionSchema,
);

export const UnitFeatureProcedureExecutionSchema = Schema.Union(
  ExtraActionGrantProcedureExecutionSchema,
  SelfBonusActionHealingProcedureExecutionSchema,
  OngoingFeatureProcedureExecutionSchema,
  AttackDamageRiderProcedureExecutionSchema,
  SaveDamageReplacementProcedureExecutionSchema,
  ReactionRollOrDamageReductionProcedureExecutionSchema,
  PassiveArmorClassBonusProcedureExecutionSchema,
  PassiveRangedAttackRollBonusProcedureExecutionSchema,
  InitiativeProficiencyAndSwapProcedureExecutionSchema,
  AttackRollMissToHitReplacementProcedureExecutionSchema,
  AttackActionAreaSaveDamageReplacementProcedureExecutionSchema,
  D20TestNaturalOneRerollProcedureExecutionSchema,
  PassiveSavingThrowRollModeProcedureExecutionSchema,
  PassiveAbilityCheckRollModeProcedureExecutionSchema,
  UnitFeaturePassiveSpeedBonusProcedureExecutionSchema,
  UnitFeaturePassiveSpeedKindGrantsProcedureExecutionSchema,
  AcrobaticMovementProcedureExecutionSchema,
  CreatureSpaceMovementPermissionProcedureExecutionSchema,
  HideActionObscurementPermissionProcedureExecutionSchema,
  WeaponDamageDiceRollChoiceProcedureExecutionSchema,
  AttackDamageDieFloorProcedureExecutionSchema,
  LightExtraAttackDamageAbilityModifierProcedureExecutionSchema,
  MartialArtsAttackProjectionProcedureExecutionSchema,
  BardicInspirationGrantProcedureExecutionSchema,
  DruidWildShapeKnownFormProcedureExecutionSchema,
  AttackActionAttackCountScalingProcedureExecutionSchema,
  ZeroHitPointReplacementProcedureExecutionSchema,
  BonusActionDashTemporaryHitPointsProcedureExecutionSchema,
  FailedAbilityCheckResourceBoostProcedureExecutionSchema,
  FailedSavingThrowRerollProcedureExecutionSchema,
  SpellSlotHealingModifierProcedureExecutionSchema,
  MagicActionHealingPoolProcedureExecutionSchema,
  MagicActionAreaSaveDamageHealingProcedureExecutionSchema,
  MagicActionSaveGatedConditionProcedureExecutionSchema,
  EnemyZeroHitPointTemporaryHitPointsProcedureExecutionSchema,
  UnitFeatureBonusActionDelegatedStandardActionsProcedureExecutionSchema,
  RemarkableAthleteProcedureExecutionSchema,
  OpenHandTechniqueProcedureExecutionSchema,
  StunningStrikeProcedureExecutionSchema,
  PaladinSacredWeaponProcedureExecutionSchema,
  RogueSteadyAimProcedureExecutionSchema,
  PotentCantripProcedureExecutionSchema,
  GrapplerProcedureExecutionSchema,
  RetaliationReactionAttackProcedureExecutionSchema,
);
