import type {
  BattleExecutableSpellInvocation,
  ReadiedSpellInvocation,
  SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import type {
  RuntimeSpellProcedureExecution,
  SpellProcedureExecution,
  SpellProcedureExecutionByProcedure,
} from "../character-execution.ts";
import { spellInvocationIsSpellcasting } from "./spell-turn-resources.ts";
import { isTriggeredReactionSpellInvocation } from "./spell-interrupt-procedure-kinds.ts";
import { Match, Schema } from "effect";

export const SpellExecutionFactsSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("actionSpell"),
    familiarTouchDelivery: Schema.Boolean,
    readiedSpellCompatible: Schema.Boolean,
  }),
  Schema.Struct({
    kind: Schema.Literal("bonusActionSpell"),
    familiarTouchDelivery: Schema.Boolean,
  }),
  Schema.Struct({ kind: Schema.Literal("bonusActionDashSpell") }),
  Schema.Struct({ kind: Schema.Literal("triggeredReactionSpell") }),
  Schema.Struct({ kind: Schema.Literal("attackHitBonusActionSpell") }),
);
export type SpellExecutionFacts = typeof SpellExecutionFactsSchema.Type;

type ActionSpellProcedureResolutionExecutionFacts =
  | {
      readonly acceptsMetamagicApplications: true;
      readonly acceptsActionCostOverride: true;
      readonly quickenedActionCostRewrite?: true;
      readonly sharedSpellAttackDamageBody?: "profileDelegated";
    }
  | {
      readonly acceptsMetamagicApplications: true;
      readonly sharedSpellAttackDamageBody?: "profileDelegated";
    };

type ActionSpellExecutionClassFact =
  | "actionCast"
  | "actionCostCast"
  | "triggeredReactionOrActionCast";

type NonActionSpellExecutionClassFact =
  | "bonusActionCast"
  | "bonusActionDash"
  | "attackHitBonusAction";

type ActionSpellProcedureExecutionFacts = {
  readonly executionClass: ActionSpellExecutionClassFact;
  readonly resolution?: ActionSpellProcedureResolutionExecutionFacts;
};

type BonusActionSpellProcedureExecutionFacts = {
  readonly executionClass: "bonusActionCast";
  readonly resolution?: {
    readonly sharedSpellAttackDamageBody: "direct";
  };
};

type NonMagicActionSpellProcedureExecutionFacts =
  | BonusActionSpellProcedureExecutionFacts
  | {
      readonly executionClass: Exclude<
        NonActionSpellExecutionClassFact,
        "bonusActionCast"
      >;
      readonly resolution?: never;
    };

type SpellProcedureExecutionFacts =
  | ActionSpellProcedureExecutionFacts
  | NonMagicActionSpellProcedureExecutionFacts;

export type SpellProcedureExecutionsWithActionCost<
  P extends SupportedSpellInvocation["procedure"],
> = Extract<
  SpellProcedureExecutionByProcedure[P],
  { readonly actionCost: unknown }
>;

export type SpellProcedureExecutionsWithoutActionCost<
  P extends SupportedSpellInvocation["procedure"],
> = Exclude<
  SpellProcedureExecutionByProcedure[P],
  { readonly actionCost: unknown }
>;

type ActionCostOf<Execution> = Execution extends {
  readonly actionCost: infer ActionCost;
}
  ? ActionCost
  : never;

export type SpellProcedureActionCost<
  P extends SupportedSpellInvocation["procedure"],
> = ActionCostOf<SpellProcedureExecutionsWithActionCost<P>>;

type SpellProcedureExecutionFactsForProcedure<
  P extends SupportedSpellInvocation["procedure"],
> = [SpellProcedureExecutionsWithActionCost<P>] extends [never]
  ? SpellProcedureExecutionFacts
  : [
        Exclude<SpellProcedureActionCost<P>, "magicAction" | "bonusAction">,
      ] extends [never]
    ? [Extract<SpellProcedureActionCost<P>, "magicAction">] extends [never]
      ? [Extract<SpellProcedureActionCost<P>, "bonusAction">] extends [never]
        ? never
        : NonMagicActionSpellProcedureExecutionFacts
      : [Extract<SpellProcedureActionCost<P>, "bonusAction">] extends [never]
        ? ActionSpellProcedureExecutionFacts
        : ActionSpellProcedureExecutionFacts & {
            readonly executionClass: "actionCostCast";
          }
    : never;

const METAMAGIC_APPLICATION_RESOLUTION = {
  acceptsMetamagicApplications: true,
} as const;
const ACTION_COST_OVERRIDE_RESOLUTION = {
  ...METAMAGIC_APPLICATION_RESOLUTION,
  acceptsActionCostOverride: true,
} as const;
const QUICKENED_ACTION_COST_REWRITE_RESOLUTION = {
  ...ACTION_COST_OVERRIDE_RESOLUTION,
  quickenedActionCostRewrite: true,
} as const;
const PROFILE_DELEGATED_SPELL_ATTACK_DAMAGE_RESOLUTION = {
  sharedSpellAttackDamageBody: "profileDelegated",
} as const;
const SHARED_SPELL_ATTACK_ACTION_COST_OVERRIDE_RESOLUTION = {
  ...ACTION_COST_OVERRIDE_RESOLUTION,
  ...PROFILE_DELEGATED_SPELL_ATTACK_DAMAGE_RESOLUTION,
} as const;
const SHARED_SPELL_ATTACK_QUICKENED_ACTION_COST_REWRITE_RESOLUTION = {
  ...QUICKENED_ACTION_COST_REWRITE_RESOLUTION,
  ...PROFILE_DELEGATED_SPELL_ATTACK_DAMAGE_RESOLUTION,
} as const;
const DIRECT_SPELL_ATTACK_DAMAGE_RESOLUTION = {
  sharedSpellAttackDamageBody: "direct",
} as const;

const SPELL_EXECUTION_FACTS_BY_PROCEDURE = {
  abilityD20TestRollModeSaveGate: { executionClass: "actionCast" },
  afterHitDamage: { executionClass: "attackHitBonusAction" },
  afterHitDamageAndIllumination: { executionClass: "attackHitBonusAction" },
  afterHitSaveGatedCondition: { executionClass: "attackHitBonusAction" },
  afterHitTimedDamageAndSave: { executionClass: "attackHitBonusAction" },
  antimagicFieldOngoingSpellSuppression: { executionClass: "actionCast" },
  attackBurstSaveDamage: {
    executionClass: "actionCast",
    resolution: ACTION_COST_OVERRIDE_RESOLUTION,
  },
  blurAttackRollDefense: { executionClass: "actionCast" },
  chainedSpellAttackDamage: {
    executionClass: "actionCast",
    resolution: ACTION_COST_OVERRIDE_RESOLUTION,
  },
  chosenDamageResistance: { executionClass: "actionCast" },
  cloudkillAreaHazard: { executionClass: "actionCast" },
  command: {
    executionClass: "actionCast",
    resolution: METAMAGIC_APPLICATION_RESOLUTION,
  },
  conditionImmunityAndTurnStartTemporaryHitPoints: {
    executionClass: "actionCast",
  },
  conditionRemovalProtection: { executionClass: "actionCast" },
  counterspell: { executionClass: "triggeredReactionOrActionCast" },
  creatureSizeDecrease: {
    executionClass: "actionCast",
    resolution: QUICKENED_ACTION_COST_REWRITE_RESOLUTION,
  },
  creatureSizeIncrease: {
    executionClass: "actionCast",
    resolution: QUICKENED_ACTION_COST_REWRITE_RESOLUTION,
  },
  creatureTypeProtection: { executionClass: "actionCast" },
  damageReduction: { executionClass: "actionCast" },
  dancingLightsCombinedCast: { executionClass: "actionCast" },
  dancingLightsReposition: { executionClass: "bonusActionCast" },
  dancingLightsSeparateCast: { executionClass: "actionCast" },
  directCondition: {
    executionClass: "actionCast",
    resolution: QUICKENED_ACTION_COST_REWRITE_RESOLUTION,
  },
  directConditionRemoval: { executionClass: "bonusActionCast" },
  directHitPointRestoration: {
    executionClass: "actionCostCast",
    resolution: QUICKENED_ACTION_COST_REWRITE_RESOLUTION,
  },
  dragonsBreathInitial: { executionClass: "bonusActionCast" },
  expeditiousRetreatDash: { executionClass: "bonusActionDash" },
  featherFallMitigation: {
    executionClass: "triggeredReactionOrActionCast",
  },
  flamingSphere: { executionClass: "actionCast" },
  fogCloudObscurement: { executionClass: "actionCast" },
  greaseGroundHazard: {
    executionClass: "actionCast",
    resolution: METAMAGIC_APPLICATION_RESOLUTION,
  },
  gustOfWindLine: {
    executionClass: "actionCast",
    resolution: METAMAGIC_APPLICATION_RESOLUTION,
  },
  hastePositive: { executionClass: "actionCast" },
  heldLight: { executionClass: "bonusActionCast" },
  heldLightHurl: {
    executionClass: "actionCast",
    resolution: SHARED_SPELL_ATTACK_ACTION_COST_OVERRIDE_RESOLUTION,
  },
  hideousLaughter: {
    executionClass: "actionCast",
    resolution: METAMAGIC_APPLICATION_RESOLUTION,
  },
  hypnoticPattern: {
    executionClass: "actionCast",
    resolution: METAMAGIC_APPLICATION_RESOLUTION,
  },
  insectPlagueAreaHazard: { executionClass: "actionCast" },
  jumpMovementReplacement: { executionClass: "bonusActionCast" },
  levitatedCreature: { executionClass: "actionCast" },
  magicWeaponEnhancement: { executionClass: "bonusActionCast" },
  magicalDarknessPointOrigin: { executionClass: "actionCast" },
  makeStable: { executionClass: "actionCast" },
  markedDamageRider: { executionClass: "bonusActionCast" },
  mirrorImageHitInterception: { executionClass: "actionCast" },
  moonbeam: { executionClass: "actionCast" },
  objectContactDamage: { executionClass: "actionCast" },
  objectContactDamageRepeat: { executionClass: "bonusActionCast" },
  objectLight: {
    executionClass: "actionCast",
    resolution: METAMAGIC_APPLICATION_RESOLUTION,
  },
  ongoingSpellEnd: { executionClass: "actionCast" },
  persistentArmorEffect: { executionClass: "actionCast" },
  repeatedDamageAllocation: { executionClass: "actionCast" },
  rollModifier: {
    executionClass: "actionCast",
    resolution: QUICKENED_ACTION_COST_REWRITE_RESOLUTION,
  },
  sanctuaryTargetingInterdiction: { executionClass: "bonusActionCast" },
  saveGatedAttackRollAdvantage: {
    executionClass: "actionCast",
    resolution: METAMAGIC_APPLICATION_RESOLUTION,
  },
  saveGatedCondition: {
    executionClass: "actionCast",
    resolution: QUICKENED_ACTION_COST_REWRITE_RESOLUTION,
  },
  saveGatedConditionImmunity: {
    executionClass: "actionCast",
    resolution: QUICKENED_ACTION_COST_REWRITE_RESOLUTION,
  },
  saveGatedDamage: {
    executionClass: "triggeredReactionOrActionCast",
    resolution: QUICKENED_ACTION_COST_REWRITE_RESOLUTION,
  },
  scalarBuff: {
    executionClass: "actionCostCast",
    resolution: QUICKENED_ACTION_COST_REWRITE_RESOLUTION,
  },
  seeInvisibleObserverSight: { executionClass: "actionCast" },
  selfTeleport: { executionClass: "bonusActionCast" },
  selfTransformationMode: { executionClass: "actionCast" },
  shieldReaction: { executionClass: "triggeredReactionOrActionCast" },
  sleepTargetAdmission: { executionClass: "actionCast" },
  sleetStormAreaHazard: { executionClass: "actionCast" },
  slowActivePenalties: {
    executionClass: "actionCast",
    resolution: METAMAGIC_APPLICATION_RESOLUTION,
  },
  spellAttackDamage: {
    executionClass: "actionCast",
    resolution: SHARED_SPELL_ATTACK_QUICKENED_ACTION_COST_REWRITE_RESOLUTION,
  },
  spellAttackSequence: {
    executionClass: "actionCast",
    resolution: QUICKENED_ACTION_COST_REWRITE_RESOLUTION,
  },
  spellCreatedHeldObject: { executionClass: "bonusActionCast" },
  spellCreatedHeldObjectAttack: {
    executionClass: "actionCast",
    resolution: SHARED_SPELL_ATTACK_ACTION_COST_OVERRIDE_RESOLUTION,
  },
  spellCreatedHeldObjectReEvoke: { executionClass: "bonusActionCast" },
  spellHostedWeaponAttack: { executionClass: "actionCast" },
  spikeGrowthMovementHazard: { executionClass: "actionCast" },
  spiritualWeaponAttackProxy: {
    executionClass: "bonusActionCast",
    resolution: DIRECT_SPELL_ATTACK_DAMAGE_RESOLUTION,
  },
  spiritualWeaponRepeatAttack: {
    executionClass: "bonusActionCast",
    resolution: DIRECT_SPELL_ATTACK_DAMAGE_RESOLUTION,
  },
  thaumaturgyBoomingVoice: { executionClass: "actionCast" },
  wardingBond: { executionClass: "actionCast" },
  weaponAttackOverride: { executionClass: "bonusActionCast" },
  weaponDamageRider: { executionClass: "bonusActionCast" },
  webRestraintHazard: { executionClass: "actionCast" },
} as const satisfies {
  readonly [P in SupportedSpellInvocation["procedure"]]: SpellProcedureExecutionFactsForProcedure<P>;
};

export type SpellExecutionClass =
  (typeof SPELL_EXECUTION_FACTS_BY_PROCEDURE)[SupportedSpellInvocation["procedure"]]["executionClass"];

export type SpellExecutionClassForProcedure<
  P extends SupportedSpellInvocation["procedure"],
> = (typeof SPELL_EXECUTION_FACTS_BY_PROCEDURE)[P]["executionClass"];

type SpellProcedureExecutionFactsByProcedure =
  typeof SPELL_EXECUTION_FACTS_BY_PROCEDURE;

export type SpellProcedureAcceptingMetamagicApplications = {
  [P in SupportedSpellInvocation["procedure"]]: SpellProcedureExecutionFactsByProcedure[P] extends {
    readonly resolution: {
      readonly acceptsMetamagicApplications: true;
    };
  }
    ? P
    : never;
}[SupportedSpellInvocation["procedure"]];

export type SpellProcedureAcceptingActionCostOverride = {
  [P in SupportedSpellInvocation["procedure"]]: SpellProcedureExecutionFactsByProcedure[P] extends {
    readonly resolution: {
      readonly acceptsActionCostOverride: true;
    };
  }
    ? P
    : never;
}[SupportedSpellInvocation["procedure"]];

export type SpellProcedureWithQuickenedActionCostRewrite = {
  [P in SupportedSpellInvocation["procedure"]]: SpellProcedureExecutionFactsByProcedure[P] extends {
    readonly resolution: {
      readonly quickenedActionCostRewrite: true;
    };
  }
    ? P
    : never;
}[SupportedSpellInvocation["procedure"]];

export type SpellProcedureWithProfileDelegatedSpellAttackDamageBody = {
  [P in SupportedSpellInvocation["procedure"]]: SpellProcedureExecutionFactsByProcedure[P] extends {
    readonly resolution: {
      readonly sharedSpellAttackDamageBody: "profileDelegated";
    };
  }
    ? P
    : never;
}[SupportedSpellInvocation["procedure"]];

export function spellProcedureAcceptsMetamagicApplications(
  procedure: SupportedSpellInvocation["procedure"],
): procedure is SpellProcedureAcceptingMetamagicApplications {
  const facts: SpellProcedureExecutionFacts =
    SPELL_EXECUTION_FACTS_BY_PROCEDURE[procedure];
  return (
    facts.resolution !== undefined &&
    "acceptsMetamagicApplications" in facts.resolution
  );
}

export function spellProcedureAcceptsActionCostOverride(
  procedure: SupportedSpellInvocation["procedure"],
): procedure is SpellProcedureAcceptingActionCostOverride {
  const facts: SpellProcedureExecutionFacts =
    SPELL_EXECUTION_FACTS_BY_PROCEDURE[procedure];
  return (
    facts.resolution !== undefined &&
    "acceptsActionCostOverride" in facts.resolution
  );
}

export function spellProcedureHasQuickenedActionCostRewrite(
  procedure: SupportedSpellInvocation["procedure"],
): procedure is SpellProcedureWithQuickenedActionCostRewrite {
  const facts: SpellProcedureExecutionFacts =
    SPELL_EXECUTION_FACTS_BY_PROCEDURE[procedure];
  return (
    facts.resolution !== undefined &&
    "quickenedActionCostRewrite" in facts.resolution
  );
}

export function spellProcedureSharedSpellAttackDamageBodyRouting(
  procedure: SupportedSpellInvocation["procedure"],
): "profileDelegated" | "direct" | undefined {
  const facts: SpellProcedureExecutionFacts =
    SPELL_EXECUTION_FACTS_BY_PROCEDURE[procedure];
  return facts.resolution !== undefined &&
    "sharedSpellAttackDamageBody" in facts.resolution
    ? facts.resolution.sharedSpellAttackDamageBody
    : undefined;
}

export function spellExecutionClassForProcedure(
  procedure: SupportedSpellInvocation["procedure"],
): SpellExecutionClass {
  return SPELL_EXECUTION_FACTS_BY_PROCEDURE[procedure].executionClass;
}

// ReadiedSpellInvocation is the wider mechanical release-shape union. This
// list is the single admission boundary for procedures whose reducers are
// implemented by the runtime's Readied Spell lane.
const READIED_SPELL_RUNTIME_LANE_PROCEDURES = [
  "chainedSpellAttackDamage",
  "repeatedDamageAllocation",
  "saveGatedDamage",
  "spellAttackDamage",
] as const satisfies ReadonlyArray<ReadiedSpellInvocation["procedure"]>;
const READIED_SPELL_RUNTIME_LANE_PROCEDURE_SET: ReadonlySet<
  SpellProcedureExecution["procedure"]
> = new Set(READIED_SPELL_RUNTIME_LANE_PROCEDURES);

export function spellInvocationHasReadiedSpellExecutionShape(
  invocation:
    | SupportedSpellInvocation
    | RuntimeSpellProcedureExecution
    | SpellProcedureExecution,
): boolean {
  if (!READIED_SPELL_RUNTIME_LANE_PROCEDURE_SET.has(invocation.procedure)) {
    return false;
  }
  if (invocation.procedure !== "spellAttackDamage") {
    return true;
  }
  return invocation.damage.kind !== "sorcerousBurstDamageTypeChoice";
}

function executionClassForInvocation(
  invocation: Pick<SupportedSpellInvocation, "procedure">,
): SpellExecutionClass {
  return spellExecutionClassForProcedure(invocation.procedure);
}

export function spellSubjectTagForInvocation(
  invocation: SpellProcedureExecution | BattleExecutableSpellInvocation,
): "actionSpell" | "bonusActionSpell" {
  if ("actionCost" in invocation) {
    return Match.value(invocation.actionCost).pipe(
      Match.when("magicAction", () => "actionSpell" as const),
      Match.when("bonusAction", () => "bonusActionSpell" as const),
      Match.exhaustive,
    );
  }
  return Match.value(executionClassForInvocation(invocation)).pipe(
    Match.when("actionCast", () => "actionSpell" as const),
    Match.when("actionCostCast", () => "actionSpell" as const),
    Match.when("bonusActionCast", () => "bonusActionSpell" as const),
    Match.when("bonusActionDash", () => "actionSpell" as const),
    Match.when("triggeredReactionOrActionCast", () => "actionSpell" as const),
    Match.when("attackHitBonusAction", () => "bonusActionSpell" as const),
    Match.exhaustive,
  );
}

export function spellExecutionFacts(
  invocation: SpellProcedureExecution | BattleExecutableSpellInvocation,
): SpellExecutionFacts {
  const executionClass = executionClassForInvocation(invocation);
  if (
    executionClass === "triggeredReactionOrActionCast" &&
    isTriggeredReactionSpellInvocation(invocation)
  ) {
    return { kind: "triggeredReactionSpell" };
  }
  if (executionClass === "attackHitBonusAction") {
    return { kind: "attackHitBonusActionSpell" };
  }
  if (executionClass === "bonusActionDash") {
    return { kind: "bonusActionDashSpell" };
  }
  const kind = spellSubjectTagForInvocation(invocation);
  const familiarTouchDelivery =
    spellInvocationIsSpellcasting(invocation) &&
    "spellRuleFacts" in invocation &&
    invocation.spellRuleFacts.range.kind === "touch";
  return kind === "actionSpell"
    ? {
        kind,
        familiarTouchDelivery,
        readiedSpellCompatible:
          spellInvocationHasReadiedSpellExecutionShape(invocation),
      }
    : { kind, familiarTouchDelivery };
}
