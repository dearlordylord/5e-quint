import type {
  BattleExecutableSpellInvocation,
  ReadiedSpellInvocation,
  SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import type {
  BattleSpellProcedureKey,
  BattleStoredSpellProcedureExecution,
  RuntimeSpellProcedureExecution,
  SpellProcedureExecution,
  SpellProcedureExecutionByProcedure,
} from "../character-execution.ts";
import type { SpellExecutionFacts } from "./spell-execution-facts-codec.ts";
export { SpellExecutionFactsSchema } from "./spell-execution-facts-codec.ts";
export type { SpellExecutionFacts } from "./spell-execution-facts-codec.ts";
import { spellInvocationIsSpellcasting } from "./spell-turn-resources.ts";
import { isTriggeredReactionSpellInvocation } from "./spell-interrupt-procedure-kinds.ts";
import { Match } from "effect";

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
  P extends BattleSpellProcedureKey,
> = Extract<
  SpellProcedureExecutionByProcedure[P],
  { readonly actionCost: unknown }
>;

export type SpellProcedureExecutionsWithoutActionCost<
  P extends BattleSpellProcedureKey,
> = Exclude<
  SpellProcedureExecutionByProcedure[P],
  { readonly actionCost: unknown }
>;

type ActionCostOf<Execution> = Execution extends {
  readonly actionCost: infer ActionCost;
}
  ? ActionCost
  : never;

export type SpellProcedureActionCost<P extends BattleSpellProcedureKey> =
  ActionCostOf<SpellProcedureExecutionsWithActionCost<P>>;

type SpellProcedureExecutionFactsForProcedure<
  P extends BattleSpellProcedureKey,
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
  magicSuppressionEmanation: { executionClass: "actionCast" },
  attackBurstSaveDamage: {
    executionClass: "actionCast",
    resolution: ACTION_COST_OVERRIDE_RESOLUTION,
  },
  perceptionGatedAttackRollDefense: { executionClass: "actionCast" },
  chainedSpellAttackDamage: {
    executionClass: "actionCast",
    resolution: ACTION_COST_OVERRIDE_RESOLUTION,
  },
  chosenDamageResistance: { executionClass: "actionCast" },
  persistentAreaSaveDamage: { executionClass: "actionCast" },
  compelledNextTurnBehavior: {
    executionClass: "actionCast",
    resolution: METAMAGIC_APPLICATION_RESOLUTION,
  },
  conditionImmunityAndTurnStartTemporaryHitPoints: {
    executionClass: "actionCast",
  },
  conditionRemovalProtection: { executionClass: "actionCast" },
  spellCastInterruptionReaction: {
    executionClass: "triggeredReactionOrActionCast",
  },
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
  movableLightManifestation: { executionClass: "actionCostCast" },
  directCondition: {
    executionClass: "actionCast",
    resolution: QUICKENED_ACTION_COST_REWRITE_RESOLUTION,
  },
  directConditionRemoval: { executionClass: "bonusActionCast" },
  directHitPointRestoration: {
    executionClass: "actionCostCast",
    resolution: QUICKENED_ACTION_COST_REWRITE_RESOLUTION,
  },
  grantedAreaSaveDamageAction: { executionClass: "bonusActionCast" },
  grantedAlternateActionCost: { executionClass: "bonusActionDash" },
  fallingCreatureMitigationReaction: {
    executionClass: "triggeredReactionOrActionCast",
  },
  persistentAreaTrait: { executionClass: "actionCast" },
  persistentAreaSaveCondition: {
    executionClass: "actionCast",
    resolution: METAMAGIC_APPLICATION_RESOLUTION,
  },
  directionalPersistentArea: {
    executionClass: "actionCast",
    resolution: METAMAGIC_APPLICATION_RESOLUTION,
  },
  compositeTargetBuffWithAftermath: { executionClass: "actionCast" },
  heldLight: { executionClass: "bonusActionCast" },
  heldLightHurl: {
    executionClass: "actionCast",
    resolution: SHARED_SPELL_ATTACK_ACTION_COST_OVERRIDE_RESOLUTION,
  },
  saveGatedConditionWithRepeat: {
    executionClass: "actionCast",
    resolution: METAMAGIC_APPLICATION_RESOLUTION,
  },
  saveGatedAreaControl: {
    executionClass: "actionCast",
    resolution: METAMAGIC_APPLICATION_RESOLUTION,
  },
  fixedCostMovementReplacement: { executionClass: "bonusActionCast" },
  controlledVerticalSuspension: { executionClass: "actionCast" },
  weaponAttackDamageEnhancement: { executionClass: "bonusActionCast" },
  magicalDarknessPointOrigin: { executionClass: "actionCast" },
  makeStable: { executionClass: "actionCast" },
  markedDamageRider: { executionClass: "bonusActionCast" },
  duplicateHitInterception: { executionClass: "actionCast" },
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
  targetingSaveInterdiction: { executionClass: "bonusActionCast" },
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
  triggeredArmorDefense: { executionClass: "triggeredReactionOrActionCast" },
  saveGatedTurnConstraintBundle: { executionClass: "actionCast" },
  persistentAreaSaveComposite: { executionClass: "actionCast" },
  stagedSaveCondition: {
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
  areaMovementDistanceDamage: { executionClass: "actionCast" },
  spatialMeleeSpellAttackProxy: {
    executionClass: "bonusActionCast",
    resolution: DIRECT_SPELL_ATTACK_DAMAGE_RESOLUTION,
  },
  temporaryAbilityCheckRollMode: { executionClass: "actionCast" },
  linkedDefenseResistanceDamageShare: { executionClass: "actionCast" },
  weaponAttackOverride: { executionClass: "bonusActionCast" },
  weaponDamageRider: { executionClass: "bonusActionCast" },
  persistentAreaSaveConditionEscape: { executionClass: "actionCast" },
} as const satisfies {
  readonly [P in BattleSpellProcedureKey]: SpellProcedureExecutionFactsForProcedure<P>;
};

export type SpellExecutionClass =
  (typeof SPELL_EXECUTION_FACTS_BY_PROCEDURE)[BattleSpellProcedureKey]["executionClass"];

export type SpellExecutionClassForProcedure<P extends BattleSpellProcedureKey> =
  (typeof SPELL_EXECUTION_FACTS_BY_PROCEDURE)[P]["executionClass"];

type SpellProcedureExecutionFactsByProcedure =
  typeof SPELL_EXECUTION_FACTS_BY_PROCEDURE;

export type SpellProcedureAcceptingMetamagicApplications = {
  [P in BattleSpellProcedureKey]: SpellProcedureExecutionFactsByProcedure[P] extends {
    readonly resolution: {
      readonly acceptsMetamagicApplications: true;
    };
  }
    ? P
    : never;
}[BattleSpellProcedureKey];

export type SpellProcedureAcceptingActionCostOverride = {
  [P in BattleSpellProcedureKey]: SpellProcedureExecutionFactsByProcedure[P] extends {
    readonly resolution: {
      readonly acceptsActionCostOverride: true;
    };
  }
    ? P
    : never;
}[BattleSpellProcedureKey];

export type SpellProcedureWithQuickenedActionCostRewrite = {
  [P in BattleSpellProcedureKey]: SpellProcedureExecutionFactsByProcedure[P] extends {
    readonly resolution: {
      readonly quickenedActionCostRewrite: true;
    };
  }
    ? P
    : never;
}[BattleSpellProcedureKey];

type SpellProcedureWithSharedSpellAttackDamageBody<
  Routing extends "profileDelegated" | "direct",
> = {
  [P in BattleSpellProcedureKey]: SpellProcedureExecutionFactsByProcedure[P] extends {
    readonly resolution: {
      readonly sharedSpellAttackDamageBody: Routing;
    };
  }
    ? P
    : never;
}[BattleSpellProcedureKey];

export type SpellProcedureWithProfileDelegatedSpellAttackDamageBody =
  SpellProcedureWithSharedSpellAttackDamageBody<"profileDelegated">;
export type SpellProcedureWithDirectSpellAttackDamageBody =
  SpellProcedureWithSharedSpellAttackDamageBody<"direct">;

export function spellProcedureAcceptsMetamagicApplications(
  procedure: BattleSpellProcedureKey,
): procedure is SpellProcedureAcceptingMetamagicApplications {
  const facts: SpellProcedureExecutionFacts =
    SPELL_EXECUTION_FACTS_BY_PROCEDURE[procedure];
  return (
    facts.resolution !== undefined &&
    "acceptsMetamagicApplications" in facts.resolution
  );
}

export function spellProcedureAcceptsActionCostOverride(
  procedure: BattleSpellProcedureKey,
): procedure is SpellProcedureAcceptingActionCostOverride {
  const facts: SpellProcedureExecutionFacts =
    SPELL_EXECUTION_FACTS_BY_PROCEDURE[procedure];
  return (
    facts.resolution !== undefined &&
    "acceptsActionCostOverride" in facts.resolution
  );
}

export function spellProcedureHasQuickenedActionCostRewrite(
  procedure: BattleSpellProcedureKey,
): procedure is SpellProcedureWithQuickenedActionCostRewrite {
  const facts: SpellProcedureExecutionFacts =
    SPELL_EXECUTION_FACTS_BY_PROCEDURE[procedure];
  return (
    facts.resolution !== undefined &&
    "quickenedActionCostRewrite" in facts.resolution
  );
}

export function spellProcedureSharedSpellAttackDamageBodyRouting(
  procedure: BattleSpellProcedureKey,
): "profileDelegated" | "direct" | undefined {
  const facts: SpellProcedureExecutionFacts =
    SPELL_EXECUTION_FACTS_BY_PROCEDURE[procedure];
  return facts.resolution !== undefined &&
    "sharedSpellAttackDamageBody" in facts.resolution
    ? facts.resolution.sharedSpellAttackDamageBody
    : undefined;
}

export function spellProcedureUsesProfileDelegatedSpellAttackDamageBody(
  procedure: BattleSpellProcedureKey,
): procedure is SpellProcedureWithProfileDelegatedSpellAttackDamageBody {
  return (
    spellProcedureSharedSpellAttackDamageBodyRouting(procedure) ===
    "profileDelegated"
  );
}

export function spellProcedureUsesDirectSpellAttackDamageBody(
  procedure: BattleSpellProcedureKey,
): procedure is SpellProcedureWithDirectSpellAttackDamageBody {
  return (
    spellProcedureSharedSpellAttackDamageBodyRouting(procedure) === "direct"
  );
}

export function spellExecutionClassForProcedure(
  procedure: BattleSpellProcedureKey,
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
export type ReadiedSpellRuntimeLaneInvocation = ReadiedSpellInvocation & {
  readonly procedure: (typeof READIED_SPELL_RUNTIME_LANE_PROCEDURES)[number];
};
const READIED_SPELL_RUNTIME_LANE_PROCEDURE_SET: ReadonlySet<
  SpellProcedureExecution["procedure"]
> = new Set(READIED_SPELL_RUNTIME_LANE_PROCEDURES);

export function spellInvocationHasReadiedSpellExecutionShape<
  Invocation extends
    | SupportedSpellInvocation
    | RuntimeSpellProcedureExecution
    | SpellProcedureExecution,
>(
  invocation: Invocation,
): invocation is Invocation &
  SpellProcedureExecution<ReadiedSpellRuntimeLaneInvocation> {
  if (!READIED_SPELL_RUNTIME_LANE_PROCEDURE_SET.has(invocation.procedure)) {
    return false;
  }
  if (invocation.procedure !== "spellAttackDamage") {
    return true;
  }
  return invocation.damage.kind !== "spellAttackDamageTypeChoice";
}

function executionClassForInvocation(invocation: {
  readonly procedure: BattleSpellProcedureKey;
}): SpellExecutionClass {
  return spellExecutionClassForProcedure(invocation.procedure);
}

export function spellSubjectTagForInvocation(
  invocation:
    | BattleStoredSpellProcedureExecution
    | RuntimeSpellProcedureExecution
    | BattleExecutableSpellInvocation,
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
  invocation:
    | BattleStoredSpellProcedureExecution
    | RuntimeSpellProcedureExecution
    | BattleExecutableSpellInvocation,
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
