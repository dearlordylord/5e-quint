import { Schema } from "effect";

import { CLASS_NAMES, type HitDiceRemaining } from "#/features/class-tables.ts";
import { METAMAGIC_OPTIONS } from "#/features/class-sorcerer.ts";
import type { DndContext } from "#/machine-types.ts";
import {
  PEERLESS_SKILL_PENDING_MODES,
  SNEAK_ATTACK_PENDING_MODES,
  SNEAK_ATTACK_PENDING_SOURCES,
} from "#/machine-types.ts";
import {
  CONDITIONS,
  DAMAGE_TYPES,
  EXPIRY_PHASES,
  INCAP_SOURCES,
  type ActiveEffect,
  type EffectTurnHook,
} from "#/types.ts";

const ConditionSchema = Schema.Literal(...CONDITIONS);
const DamageTypeSchema = Schema.Literal(...DAMAGE_TYPES);
const IncapSourceSchema = Schema.Literal(...INCAP_SOURCES);
const ExpiryPhaseSchema = Schema.Literal(...EXPIRY_PHASES);
const MetamagicOptionSchema = Schema.Literal(...METAMAGIC_OPTIONS);
const PeerlessSkillPendingModeSchema = Schema.Literal(
  ...PEERLESS_SKILL_PENDING_MODES,
);
const SneakAttackPendingModeSchema = Schema.Literal(
  ...SNEAK_ATTACK_PENDING_MODES,
);
const SneakAttackPendingSourceSchema = Schema.Literal(
  ...SNEAK_ATTACK_PENDING_SOURCES,
);

function compareByOrder<T extends string>(order: ReadonlyArray<T>) {
  const ranks = new Map(order.map((value, index) => [value, index]));
  return (left: T, right: T) =>
    (ranks.get(left) ?? Number.POSITIVE_INFINITY) -
    (ranks.get(right) ?? Number.POSITIVE_INFINITY);
}

const compareCondition = compareByOrder(CONDITIONS);
const compareDamageType = compareByOrder(DAMAGE_TYPES);
const compareIncapSource = compareByOrder(INCAP_SOURCES);
const compareMetamagicOption = compareByOrder(METAMAGIC_OPTIONS);

function sortReadonlyArray<T>(
  values: ReadonlyArray<T>,
  compare: (left: T, right: T) => number,
): ReadonlyArray<T> {
  return [...values].sort(compare);
}

function sortReadonlySet<T>(
  values: ReadonlySet<T>,
  compare: (left: T, right: T) => number,
): ReadonlyArray<T> {
  return [...values].sort(compare);
}

function canonicalizeHook(
  hook: EffectTurnHook | undefined,
): EffectTurnHook | undefined {
  if (hook == null) return undefined;
  return {
    ...hook,
    conditionsToRemove:
      hook.conditionsToRemove == null
        ? undefined
        : sortReadonlyArray(hook.conditionsToRemove, compareCondition),
  };
}

function canonicalizeEffect(effect: ActiveEffect): ActiveEffect {
  const compareQualified = (
    a: { readonly damageType: string },
    b: { readonly damageType: string },
  ) => a.damageType.localeCompare(b.damageType);
  return {
    ...effect,
    grantedConditions:
      effect.grantedConditions == null
        ? undefined
        : sortReadonlyArray(effect.grantedConditions, compareCondition),
    grantedResistances:
      effect.grantedResistances == null
        ? undefined
        : new Set(
            sortReadonlySet(effect.grantedResistances, compareDamageType),
          ),
    grantedVulnerabilities:
      effect.grantedVulnerabilities == null
        ? undefined
        : new Set(
            sortReadonlySet(effect.grantedVulnerabilities, compareDamageType),
          ),
    grantedImmunities:
      effect.grantedImmunities == null
        ? undefined
        : new Set(sortReadonlySet(effect.grantedImmunities, compareDamageType)),
    grantedQualifiedPhysicalResistances:
      effect.grantedQualifiedPhysicalResistances == null
        ? undefined
        : sortReadonlyArray(
            effect.grantedQualifiedPhysicalResistances.map((entry) => ({
              ...entry,
              bypassedBy: new Set(sortReadonlySet(entry.bypassedBy, (a, b) => a.localeCompare(b))),
            })),
            compareQualified,
          ),
    grantedQualifiedPhysicalVulnerabilities:
      effect.grantedQualifiedPhysicalVulnerabilities == null
        ? undefined
        : sortReadonlyArray(
            effect.grantedQualifiedPhysicalVulnerabilities.map((entry) => ({
              ...entry,
              bypassedBy: new Set(sortReadonlySet(entry.bypassedBy, (a, b) => a.localeCompare(b))),
            })),
            compareQualified,
          ),
    grantedQualifiedPhysicalImmunities:
      effect.grantedQualifiedPhysicalImmunities == null
        ? undefined
        : sortReadonlyArray(
            effect.grantedQualifiedPhysicalImmunities.map((entry) => ({
              ...entry,
              bypassedBy: new Set(sortReadonlySet(entry.bypassedBy, (a, b) => a.localeCompare(b))),
            })),
            compareQualified,
          ),
    startOfTurnHook: canonicalizeHook(effect.startOfTurnHook),
    endOfTurnHook: canonicalizeHook(effect.endOfTurnHook),
  };
}

function canonicalizeHitDiceRemaining(
  hitDiceRemaining: HitDiceRemaining,
): HitDiceRemaining {
  return Object.fromEntries(
    CLASS_NAMES.map((className) => [className, hitDiceRemaining[className]]),
  ) as HitDiceRemaining;
}

function canonicalizeNumberRecord(
  values: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  return Object.fromEntries(
    Object.keys(values)
      .sort()
      .map((key) => [key, values[key]]),
  );
}

function canonicalizeBooleanRecord(
  values: Readonly<Record<string, boolean>>,
): Readonly<Record<string, boolean>> {
  return Object.fromEntries(
    Object.keys(values)
      .sort()
      .map((key) => [key, values[key]]),
  );
}

function canonicalizeClassStates(
  classStates: DndContext["classStates"],
): DndContext["classStates"] {
  const sorcerer = classStates.sorcerer;
  const warlock = classStates.warlock;
  return {
    ...classStates,
    sorcerer:
      sorcerer == null
        ? undefined
        : {
            ...sorcerer,
            knownMetamagicOptions: new Set(
              sortReadonlySet(
                sorcerer.knownMetamagicOptions,
                compareMetamagicOption,
              ),
            ),
            metamagicUsedThisCast: new Set(
              sortReadonlySet(
                sorcerer.metamagicUsedThisCast,
                compareMetamagicOption,
              ),
            ),
          },
    warlock:
      warlock == null
        ? undefined
        : {
            ...warlock,
            mysticArcanumUsed: new Set(
              [...warlock.mysticArcanumUsed].sort(
                (left, right) => left - right,
              ),
            ),
          },
  };
}

function canonicalizeContext(context: DndContext): DndContext {
  return {
    ...context,
    concentrationSpellId: context.concentrationSpellId,
    hitDiceRemaining: canonicalizeHitDiceRemaining(context.hitDiceRemaining),
    preparedSpells: new Set([...context.preparedSpells].sort()),
    activeEffects: context.activeEffects.map(canonicalizeEffect),
    incapacitatedSources: new Set(
      sortReadonlySet(context.incapacitatedSources, compareIncapSource),
    ),
    rechargeAvailable: canonicalizeBooleanRecord(context.rechargeAvailable),
    dailyUsesRemaining: canonicalizeNumberRecord(context.dailyUsesRemaining),
    dailyUsesMax: canonicalizeNumberRecord(context.dailyUsesMax),
    classStates: canonicalizeClassStates(context.classStates),
  };
}

const EffectTurnHookSchema = Schema.Struct({
  healAmount: Schema.optional(Schema.Number),
  tempHpAmount: Schema.optional(Schema.Number),
  damageAmount: Schema.optional(Schema.Number),
  damageType: Schema.optional(DamageTypeSchema),
  removeOnSaveSuccess: Schema.optional(Schema.Boolean),
  conditionsToRemove: Schema.optional(Schema.Array(ConditionSchema)),
  requiresConcentrationCheck: Schema.optional(Schema.Boolean),
});

const ActiveEffectSchema = Schema.Struct({
  spellId: Schema.String,
  turnsRemaining: Schema.Number,
  expiresAt: ExpiryPhaseSchema,
  casterId: Schema.String,
  expiryOwnerId: Schema.optional(Schema.String),
  grantedConditions: Schema.optional(Schema.Array(ConditionSchema)),
  startOfTurnHook: Schema.optional(EffectTurnHookSchema),
  endOfTurnHook: Schema.optional(EffectTurnHookSchema),
  grantedResistances: Schema.optional(Schema.ReadonlySet(DamageTypeSchema)),
  grantedVulnerabilities: Schema.optional(Schema.ReadonlySet(DamageTypeSchema)),
  grantedImmunities: Schema.optional(Schema.ReadonlySet(DamageTypeSchema)),
  grantedQualifiedPhysicalResistances: Schema.optional(Schema.Array(Schema.Struct({
    damageType: Schema.Literal("bludgeoning", "piercing", "slashing"),
    bypassedBy: Schema.ReadonlySet(
      Schema.Literal("adamantine", "magical", "silvered"),
    ),
  }))),
  grantedQualifiedPhysicalVulnerabilities: Schema.optional(Schema.Array(Schema.Struct({
    damageType: Schema.Literal("bludgeoning", "piercing", "slashing"),
    bypassedBy: Schema.ReadonlySet(
      Schema.Literal("adamantine", "magical", "silvered"),
    ),
  }))),
  grantedQualifiedPhysicalImmunities: Schema.optional(Schema.Array(Schema.Struct({
    damageType: Schema.Literal("bludgeoning", "piercing", "slashing"),
    bypassedBy: Schema.ReadonlySet(
      Schema.Literal("adamantine", "magical", "silvered"),
    ),
  }))),
  blocksOpportunityAttacks: Schema.optional(Schema.Boolean),
  speedDeltaFeet: Schema.optional(Schema.Number),
  consumeOnQualifiedHit: Schema.optional(
    Schema.Struct({
      trigger: Schema.Literal("nextWeaponHit", "nextMeleeWeaponHit"),
    }),
  ),
  reactivePayload: Schema.optional(
    Schema.Struct({
      trigger: Schema.Literal("meleeHitWithin5ft"),
      damageType: Schema.Literal("fire", "cold"),
    }),
  ),
});

const FighterClassStateSchema = Schema.Struct({
  level: Schema.Number,
  secondWindCharges: Schema.Number,
  secondWindMax: Schema.Number,
  actionSurgeCharges: Schema.Number,
  actionSurgeMax: Schema.Number,
  actionSurgeUsedThisTurn: Schema.Boolean,
  indomitableCharges: Schema.Number,
  indomitableMax: Schema.Number,
  heroicInspiration: Schema.Boolean,
});

const BarbarianClassStateSchema = Schema.Struct({
  level: Schema.Number,
  raging: Schema.Boolean,
  rageCharges: Schema.Number,
  rageMaxCharges: Schema.Number,
  rageTurnsRemaining: Schema.Number,
  attackedOrForcedSaveThisTurn: Schema.Boolean,
  rageExtendedWithBA: Schema.Boolean,
  recklessThisTurn: Schema.Boolean,
  frenzyUsedThisTurn: Schema.Boolean,
  intimidatingPresenceUsed: Schema.Boolean,
  relentlessRageTimesUsed: Schema.Number,
  brutalStrikeUsedThisTurn: Schema.Boolean,
});

const MonkClassStateSchema = Schema.Struct({
  level: Schema.Number,
  focusPoints: Schema.Number,
  focusMax: Schema.Number,
  uncannyMetabolismUsed: Schema.Boolean,
  stunningStrikeUsedThisTurn: Schema.Boolean,
  wholenessCharges: Schema.Number,
  wholenessMax: Schema.Number,
});

const PaladinClassStateSchema = Schema.Struct({
  level: Schema.Number,
  layOnHandsPool: Schema.Number,
  layOnHandsMax: Schema.Number,
  paladinChannelDivinityCharges: Schema.Number,
  paladinChannelDivinityMax: Schema.Number,
  smiteFreeUsed: Schema.Boolean,
});

const RogueClassStateSchema = Schema.Struct({
  level: Schema.Number,
  sneakAttackUsedThisTurn: Schema.Boolean,
  steadyAimUsedThisTurn: Schema.Boolean,
  cunningStrikeUsesThisTurn: Schema.Number,
});

const ClericClassStateSchema = Schema.Struct({
  level: Schema.Number,
  clericChannelDivinityCharges: Schema.Number,
  clericChannelDivinityMax: Schema.Number,
});

const DruidClassStateSchema = Schema.Struct({
  level: Schema.Number,
  wildShapeCharges: Schema.Number,
  wildShapeMax: Schema.Number,
  inWildShape: Schema.Boolean,
  wildResurgenceSlotUsedThisLR: Schema.Boolean,
});

const SorcererClassStateSchema = Schema.Struct({
  level: Schema.Number,
  sorceryPoints: Schema.Number,
  sorceryPointsMax: Schema.Number,
  sorcerousRestorationUsed: Schema.Boolean,
  innateSorceryActive: Schema.Boolean,
  innateSorceryCharges: Schema.Number,
  innateSorceryTurnsRemaining: Schema.Number,
  knownMetamagicOptions: Schema.ReadonlySet(MetamagicOptionSchema),
  metamagicUsedThisCast: Schema.ReadonlySet(MetamagicOptionSchema),
  apotheosisUsedThisTurn: Schema.Boolean,
});

const WarlockClassStateSchema = Schema.Struct({
  level: Schema.Number,
  mysticArcanumUsed: Schema.ReadonlySet(Schema.Number),
  magicalCunningUsed: Schema.Boolean,
  eldritchSmiteUsedThisTurn: Schema.Boolean,
});

const WizardClassStateSchema = Schema.Struct({
  level: Schema.Number,
  arcaneRecoveryUsed: Schema.Boolean,
  overchannelUsesThisLR: Schema.Number,
});

const RangerClassStateSchema = Schema.Struct({
  level: Schema.Number,
  huntersMarkFreeUses: Schema.Number,
  tirelessCharges: Schema.Number,
  tirelessMax: Schema.Number,
  naturesVeilCharges: Schema.Number,
  naturesVeilMax: Schema.Number,
});

const BardClassStateSchema = Schema.Struct({
  level: Schema.Number,
  bardicInspirationCharges: Schema.Number,
  bardicInspirationMax: Schema.Number,
});

const ClassStatesSchema = Schema.Struct({
  fighter: Schema.optional(FighterClassStateSchema),
  barbarian: Schema.optional(BarbarianClassStateSchema),
  monk: Schema.optional(MonkClassStateSchema),
  paladin: Schema.optional(PaladinClassStateSchema),
  rogue: Schema.optional(RogueClassStateSchema),
  cleric: Schema.optional(ClericClassStateSchema),
  druid: Schema.optional(DruidClassStateSchema),
  sorcerer: Schema.optional(SorcererClassStateSchema),
  warlock: Schema.optional(WarlockClassStateSchema),
  wizard: Schema.optional(WizardClassStateSchema),
  ranger: Schema.optional(RangerClassStateSchema),
  bard: Schema.optional(BardClassStateSchema),
});

const HitDiceRemainingSchema = Schema.Struct({
  barbarian: Schema.Number,
  bard: Schema.Number,
  cleric: Schema.Number,
  druid: Schema.Number,
  fighter: Schema.Number,
  monk: Schema.Number,
  paladin: Schema.Number,
  ranger: Schema.Number,
  rogue: Schema.Number,
  sorcerer: Schema.Number,
  warlock: Schema.Number,
  wizard: Schema.Number,
});

const DeathSavesSchema = Schema.Struct({
  successes: Schema.Number,
  failures: Schema.Number,
});

const PendingResolutionSchema = Schema.NullOr(
  Schema.Union(
    Schema.Struct({ kind: Schema.Literal("tacticalMind") }),
    Schema.Struct({ kind: Schema.Literal("indomitable") }),
    Schema.Struct({
      kind: Schema.Literal("overchannel"),
      spellName: Schema.String,
      slotLevel: Schema.Number,
    }),
    Schema.Struct({
      kind: Schema.Literal("sneakAttack"),
      mode: SneakAttackPendingModeSchema,
      source: SneakAttackPendingSourceSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("peerlessSkill"),
      mode: PeerlessSkillPendingModeSchema,
    }),
    Schema.Struct({ kind: Schema.Literal("relentlessRage") }),
  ),
);

export const DndContextEncodedSchema = Schema.Struct({
  selfId: Schema.optional(Schema.String),
  hp: Schema.Number,
  maxHp: Schema.Number,
  maxHpReduction: Schema.Number,
  conMod: Schema.Number,
  tempHp: Schema.Number,
  deathSaves: DeathSavesSchema,
  stable: Schema.Boolean,
  dead: Schema.Boolean,
  inCombat: Schema.Boolean,
  exhaustion: Schema.Number,
  blinded: Schema.Boolean,
  charmed: Schema.Boolean,
  deafened: Schema.Boolean,
  frightened: Schema.Boolean,
  grappled: Schema.Boolean,
  grappling: Schema.Boolean,
  grappledTargetTwoSizesSmaller: Schema.Boolean,
  invisible: Schema.Boolean,
  paralyzed: Schema.Boolean,
  petrified: Schema.Boolean,
  poisoned: Schema.Boolean,
  prone: Schema.Boolean,
  restrained: Schema.Boolean,
  stunned: Schema.Boolean,
  unconscious: Schema.Boolean,
  incapacitatedSources: Schema.ReadonlySet(IncapSourceSchema),
  baseWalkSpeed: Schema.Number,
  movementRemaining: Schema.Number,
  effectiveSpeed: Schema.Number,
  actionsRemaining: Schema.Number,
  attackActionUsed: Schema.Boolean,
  bonusActionUsed: Schema.Boolean,
  reactionAvailable: Schema.Boolean,
  freeInteractionUsed: Schema.Boolean,
  extraAttacksRemaining: Schema.Number,
  disengaged: Schema.Boolean,
  dodging: Schema.Boolean,
  readiedAction: Schema.Boolean,
  bonusActionSpellCast: Schema.Boolean,
  nonCantripActionSpellCast: Schema.Boolean,
  bonusMovementRemaining: Schema.Number,
  bonusMovementOAFree: Schema.Boolean,
  actionSurgeActionPending: Schema.Boolean,
  slotExpendedThisTurn: Schema.Boolean,
  slotsMax: Schema.Array(Schema.Number),
  slotsCurrent: Schema.Array(Schema.Number),
  pactSlotsMax: Schema.Number,
  pactSlotsCurrent: Schema.Number,
  pactSlotLevel: Schema.Number,
  concentrationSpellId: Schema.OptionFromNullOr(Schema.String),
  hitDiceRemaining: HitDiceRemainingSchema,
  preparedSpells: Schema.ReadonlySet(Schema.String),
  wearingArmorWithoutTraining: Schema.Boolean,
  activeEffects: Schema.Array(ActiveEffectSchema),
  pendingResolution: PendingResolutionSchema,
  creatureKind: Schema.Literal("PC", "Monster"),
  legendaryActionsMax: Schema.Number,
  legendaryResistancesMax: Schema.Number,
  legendaryActionsRemaining: Schema.Number,
  legendaryResistancesRemaining: Schema.Number,
  rechargeAvailable: Schema.Record({
    key: Schema.String,
    value: Schema.Boolean,
  }),
  dailyUsesRemaining: Schema.Record({
    key: Schema.String,
    value: Schema.Number,
  }),
  dailyUsesMax: Schema.Record({ key: Schema.String, value: Schema.Number }),
  classStates: ClassStatesSchema,
});

export type DndContextEncoded = Schema.Schema.Encoded<
  typeof DndContextEncodedSchema
>;

export function encodeDndContext(context: DndContext): DndContextEncoded {
  return Schema.encodeSync(DndContextEncodedSchema)(
    canonicalizeContext(context),
  );
}

export interface DndSnapshotEncoded {
  readonly value: unknown;
  readonly tags: ReadonlyArray<string>;
  readonly context: DndContextEncoded;
}

export function encodeDndSnapshot(snapshot: {
  readonly value: unknown;
  readonly tags: ReadonlySet<string>;
  readonly context: DndContext;
}): DndSnapshotEncoded {
  return {
    value: snapshot.value,
    tags: [...snapshot.tags].sort(),
    context: encodeDndContext(snapshot.context),
  };
}
