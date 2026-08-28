// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-MULTIATTACK-001 RAW-STAT-BLOCK-LIMITED-USAGE-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.multiattack stat-block.resource-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.MULTIATTACK BATTLE.STAT_BLOCK.RESOURCE_LIFECYCLE
import { optionalProperty } from "./optional-property.ts";
import {
  PositiveInteger,
  resourceCount,
  type DieRollResult,
  type Integer as IntegerType,
  type NonNegativeInteger as NonNegativeIntegerType,
  type PositiveInteger as PositiveIntegerType,
  type ReadonlyNonEmptyArray,
  type ResourceCount,
} from "@dnd/shared/types";
import type { Ability, CreatureType } from "@dnd/shared/game-facts";
import { Brand } from "effect";
import * as Either from "effect/Either";
import * as Match from "effect/Match";
import type {
  ChallengeRating,
  CreatureLimitedUse,
  CreatureSense,
  CreatureImmunityList,
  CreatureSavingThrowModifier,
  CreatureSkillModifier,
  SixAbilityScores,
  StatBlockLiteralValue,
  StatBlockTextOnlyReason,
  CreatureResistanceList,
  CreatureVulnerabilityList,
  StatBlockId,
  StatBlockProcedureOrdinal,
  StatBlockProcedureResource,
  StatBlockProcedureResourceOrdinal,
} from "@dnd/surface/surface/types";
import type { Size } from "@dnd/shared/types";
import type {
  StatBlockAttackActionOption,
  StatBlockAttackSection,
  StatBlockTraitAttackRollMode,
  SupportedCreatureAttackRollMechanics,
  SupportedStaticDamageCreatureAttackRollMechanics,
} from "./battle-action-options.ts";
import type { SupportedStatBlockBonusActionStandardAction } from "./battle-reducer/battle-runtime-protocol.ts";
import {
  statBlockAttackDamageRequiresRoll,
  statBlockAttackDamageSupportsStaticNotation,
  supportedStatBlockAttackDamage,
} from "./statblock-attack-damage-support.ts";
import type {
  BattleResourcePoolExecutionRef,
  BattleStatBlockExecutionScopeRef,
  BattleStatBlockProcedureExecutionRef,
} from "./identity.ts";
import type { StatBlockActionProjectionSection } from "./stat-block-presentation-contract.ts";

export type BattleStatBlockExecutionSource = {
  readonly id: StatBlockId;
  readonly challengeRating: ChallengeRating;
  /** Parsed, source-free facts consumed by runtime admission. */
  readonly statBlock: BattleStatBlockRuntimeFacts;
  /** Ordered executable bindings produced by the authored projection. */
  readonly procedures: readonly BattleStatBlockRuntimeProcedure[];
  readonly resources: readonly BattleStatBlockRuntimeResource[];
  readonly legendaryActionUses?: PositiveIntegerType;
};

/**
 * Runtime Stat Block facts before the source boundary narrows optional use
 * counts into the execution brand. External callers may only supply the
 * unbranded numeric representation here.
 */
export type BattleStatBlockExecutionSourceInput = Omit<
  BattleStatBlockExecutionSource,
  "legendaryActionUses"
> & {
  readonly legendaryActionUses?: number;
};

export type StatBlockResourceGraphAdmissionFailure =
  | {
      readonly kind: "duplicateResourceOrdinal";
      readonly ordinal: StatBlockProcedureResourceOrdinal;
    }
  | {
      readonly kind: "missingResourceDeclaration";
      readonly ordinal: StatBlockProcedureResourceOrdinal;
    };

/**
 * A source whose procedure resource references have been closed over its
 * declarations. The source boundary owns this fact before execution
 * allocation can consume the resource graph.
 */
export type BattleStatBlockClosedResourceGraph<
  TSource extends Pick<
    BattleStatBlockExecutionSource,
    "procedures" | "resources"
  > = BattleStatBlockExecutionSource,
> = Omit<TSource, "resources"> & {
  readonly resources: readonly BattleStatBlockRuntimeResource[];
};

type StatBlockResourceDeclarationAnalysis = {
  readonly declaredOrdinals: ReadonlySet<StatBlockProcedureResourceOrdinal>;
  readonly duplicateIssues: readonly StatBlockResourceGraphAdmissionFailure[];
};

export function admitStatBlockResourceGraph<
  TSource extends Pick<
    BattleStatBlockExecutionSource,
    "procedures" | "resources"
  >,
>(
  source: TSource,
): Either.Either<
  BattleStatBlockClosedResourceGraph<TSource>,
  ReadonlyNonEmptyArray<StatBlockResourceGraphAdmissionFailure>
> {
  const resources = source.resources;
  const declarations = analyzeStatBlockResourceDeclarations(resources);
  const issues = [
    ...declarations.duplicateIssues,
    ...missingResourceDeclarationIssues(
      source.procedures,
      declarations.declaredOrdinals,
    ),
  ];
  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue !== undefined) {
    return Either.left([firstIssue, ...remainingIssues]);
  }
  const { resources: _resources, ...sourceWithoutResources } = source;
  return Either.right({ ...sourceWithoutResources, resources });
}

function analyzeStatBlockResourceDeclarations(
  resources: readonly BattleStatBlockRuntimeResource[],
): StatBlockResourceDeclarationAnalysis {
  const declaredOrdinals = new Set<StatBlockProcedureResourceOrdinal>();
  const duplicateOrdinals = new Set<StatBlockProcedureResourceOrdinal>();
  const duplicateIssues: StatBlockResourceGraphAdmissionFailure[] = [];
  for (const resource of resources) {
    if (!declaredOrdinals.has(resource.ordinal)) {
      declaredOrdinals.add(resource.ordinal);
      continue;
    }
    if (duplicateOrdinals.has(resource.ordinal)) continue;
    duplicateOrdinals.add(resource.ordinal);
    duplicateIssues.push({
      kind: "duplicateResourceOrdinal",
      ordinal: resource.ordinal,
    });
  }
  return { declaredOrdinals, duplicateIssues };
}

function missingResourceDeclarationIssues(
  procedures: readonly BattleStatBlockRuntimeProcedure[],
  declaredOrdinals: ReadonlySet<StatBlockProcedureResourceOrdinal>,
): readonly StatBlockResourceGraphAdmissionFailure[] {
  const missingOrdinals = new Set<StatBlockProcedureResourceOrdinal>();
  const missingIssues: StatBlockResourceGraphAdmissionFailure[] = [];
  for (const procedure of procedures) {
    for (const ordinal of procedure.resourceRefs) {
      if (declaredOrdinals.has(ordinal) || missingOrdinals.has(ordinal)) {
        continue;
      }
      missingOrdinals.add(ordinal);
      missingIssues.push({
        kind: "missingResourceDeclaration",
        ordinal,
      });
    }
  }
  return missingIssues;
}

export type StatBlockLegendaryActionUsesParseFailure = "invalidPositiveInteger";

/**
 * The one numeric boundary for optional Legendary Action uses. `PositiveInteger`
 * owns the invariant; callers receive a typed failure instead of its throwing
 * constructor when untrusted runtime data is malformed.
 */
export function parseStatBlockLegendaryActionUses(
  value: number | undefined,
): Either.Either<
  PositiveIntegerType | undefined,
  StatBlockLegendaryActionUsesParseFailure
> {
  if (value === undefined) return Either.right(undefined);
  return Either.mapLeft(
    PositiveInteger.either(value),
    () => "invalidPositiveInteger" as const,
  );
}

export type StatBlockLiteralValueParseFailure = "invalidLiteral";

/** A literal Stat Block value after resolving the authored value union. */
export type BattleStatBlockLiteralValue = Extract<
  StatBlockLiteralValue,
  { readonly kind: "literal" }
>;

/**
 * Parse a runtime-facing literal value without trusting an object-shaped
 * boundary supplied by a restore or test caller.
 */
export function parseStatBlockLiteralValue(
  value: StatBlockLiteralValue,
): Either.Either<
  BattleStatBlockLiteralValue,
  StatBlockLiteralValueParseFailure
> {
  if (
    typeof value !== "object" ||
    value === null ||
    !("kind" in value) ||
    value.kind !== "literal" ||
    !("value" in value) ||
    typeof value.value !== "number" ||
    !Number.isFinite(value.value)
  ) {
    return Either.left("invalidLiteral");
  }
  return Either.right({ kind: "literal", value: value.value });
}

export type BattleStatBlockPositiveIntegerLiteral = Omit<
  BattleStatBlockLiteralValue,
  "value"
> & {
  readonly value: PositiveIntegerType;
};

export type StatBlockPositiveIntegerLiteralParseFailure =
  | StatBlockLiteralValueParseFailure
  | "invalidPositiveInteger";

export function parseStatBlockPositiveIntegerLiteral(
  value: StatBlockLiteralValue,
): Either.Either<
  BattleStatBlockPositiveIntegerLiteral,
  StatBlockPositiveIntegerLiteralParseFailure
> {
  const literal = parseStatBlockLiteralValue(value);
  if (Either.isLeft(literal)) return Either.left(literal.left);
  const positiveInteger = PositiveInteger.either(literal.right.value);
  if (Either.isLeft(positiveInteger)) {
    return Either.left("invalidPositiveInteger");
  }
  return Either.right({ kind: "literal", value: positiveInteger.right });
}

export type BattleStatBlockRuntimeResource = {
  readonly ordinal: StatBlockProcedureResourceOrdinal;
  readonly ownership: "shared" | "each";
  readonly limit:
    | { readonly kind: "daily"; readonly uses: PositiveIntegerType }
    | {
        readonly kind: "recharge";
        readonly minimumRoll: StatBlockRechargeMinimumRoll;
      }
    | { readonly kind: "recharge_after_rest" };
};

export const STAT_BLOCK_RECHARGE_MINIMUM_ROLLS = [
  2, 3, 4, 5, 6,
] as const satisfies ReadonlyArray<number>;
export type StatBlockRechargeMinimumRoll =
  (typeof STAT_BLOCK_RECHARGE_MINIMUM_ROLLS)[number];

export type StatBlockRuntimeResourceParseFailure =
  | "invalidDailyUses"
  | "invalidRechargeMinimumRoll";

/**
 * Resolve one authored resource declaration into the source-free runtime
 * shape. The surface decoder owns structure; this boundary narrows the daily
 * and recharge numeric facts before execution receives them.
 */
export function parseStatBlockRuntimeResource(
  resource: StatBlockProcedureResource,
): Either.Either<
  BattleStatBlockRuntimeResource,
  StatBlockRuntimeResourceParseFailure
> {
  if (resource.limit.kind === "daily") {
    const uses = PositiveInteger.either(resource.limit.uses);
    if (Either.isLeft(uses)) {
      return Either.left("invalidDailyUses");
    }
    return Either.right({
      ordinal: resource.ordinal,
      ownership: resource.ownership,
      limit: { kind: "daily", uses: uses.right },
    });
  }
  if (resource.limit.kind === "recharge") {
    const minimumRoll = statBlockRechargeMinimumRoll(
      resource.limit.minimumRoll,
    );
    if (minimumRoll === null) {
      return Either.left("invalidRechargeMinimumRoll");
    }
    return Either.right({
      ordinal: resource.ordinal,
      ownership: resource.ownership,
      limit: {
        kind: "recharge",
        minimumRoll,
      },
    });
  }
  return Either.right({
    ordinal: resource.ordinal,
    ownership: resource.ownership,
    limit: { kind: "recharge_after_rest" },
  });
}

function statBlockRechargeMinimumRoll(
  value: number,
): StatBlockRechargeMinimumRoll | null {
  return (
    STAT_BLOCK_RECHARGE_MINIMUM_ROLLS.find(
      (minimumRoll): minimumRoll is StatBlockRechargeMinimumRoll =>
        minimumRoll === value,
    ) ?? null
  );
}

export type BattleStatBlockRuntimeMultiattackDispatch = {
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly count: PositiveIntegerType;
};

export type BattleStatBlockRuntimeFacts = {
  readonly size: Size;
  readonly creatureType: CreatureType;
  readonly ac: StatBlockLiteralValue;
  readonly hp: StatBlockLiteralValue;
  readonly speeds: readonly BattleStatBlockRuntimeSpeed[];
  readonly abilityScores: SixAbilityScores;
  readonly initiativeModifier: IntegerType;
  readonly initiativeScore: NonNegativeIntegerType;
  readonly passivePerception: NonNegativeIntegerType;
  readonly savingThrowModifiers?: readonly CreatureSavingThrowModifier[];
  readonly skillModifiers?: readonly CreatureSkillModifier[];
  readonly saveProficiencies?: readonly Ability[];
  readonly vulnerabilities?: CreatureVulnerabilityList;
  readonly resistances?: CreatureResistanceList;
  readonly immunities?: CreatureImmunityList;
  readonly senses?: readonly BattleStatBlockRuntimeSense[];
};

export type BattleStatBlockCombatantFacts = Omit<
  BattleStatBlockRuntimeFacts,
  "size" | "ac" | "hp"
> & {
  readonly size: Size;
  readonly ac: BattleStatBlockLiteralValue;
  readonly hp: BattleStatBlockPositiveIntegerLiteral;
};

export type BattleStatBlockRuntimeSpeed = {
  readonly kind: "walk" | "burrow" | "climb" | "fly" | "swim";
  readonly feet: StatBlockLiteralValue;
  readonly hover?: true;
};

export type BattleStatBlockRuntimeSense = {
  readonly kind: CreatureSense["kind"];
  readonly rangeFeet: PositiveIntegerType;
  readonly qualifier?: "unimpeded_by_magical_darkness";
};

export type BattleStatBlockRuntimeProcedure =
  | {
      readonly kind: "attack";
      readonly section: Extract<
        StatBlockAttackSection,
        "actions" | "legendaryActions"
      >;
      readonly procedureOrdinal: StatBlockProcedureOrdinal;
      readonly attack: SupportedCreatureAttackRollMechanics;
      readonly resourceRefs: readonly StatBlockProcedureResourceOrdinal[];
      readonly traitAttackRollModes?: ReadonlyNonEmptyArray<StatBlockTraitAttackRollMode>;
    }
  | {
      readonly kind: "multiattack";
      readonly section: "actions";
      readonly procedureOrdinal: StatBlockProcedureOrdinal;
      readonly dispatches: ReadonlyNonEmptyArray<BattleStatBlockRuntimeMultiattackDispatch>;
      readonly resourceRefs: readonly StatBlockProcedureResourceOrdinal[];
    }
  | {
      readonly kind: "bonusActionOption";
      readonly section: "bonusActions";
      readonly procedureOrdinal: StatBlockProcedureOrdinal;
      readonly standardActions: ReadonlyNonEmptyArray<SupportedStatBlockBonusActionStandardAction>;
      readonly resourceRefs: readonly StatBlockProcedureResourceOrdinal[];
    };

export type StatBlockActionProjectionShape =
  | "attack"
  | "multiattack"
  | "save"
  | "support"
  | "actionOption"
  | "special";

/**
 * A represented Stat Block shape that the generic battle projection leaves as
 * text-only. The issue carries no authored label or record identity; callers
 * at the presentation boundary may join those facts separately.
 */
export type StatBlockProjectionIssue =
  | {
      readonly tag: "statBlockProjectionIssue";
      readonly source: {
        readonly kind: "trait";
        readonly nonExecutableReason:
          | "textOnlyTrait"
          | "unsupportedTraitEffect";
      };
    }
  | {
      readonly tag: "statBlockProjectionIssue";
      readonly source: {
        readonly kind: "action";
        readonly section: StatBlockActionProjectionSection;
        readonly shape: StatBlockActionProjectionShape;
        readonly nonExecutableReason:
          | "unsupportedActionShape"
          | StatBlockTextOnlyReason;
      };
    };

export type StatBlockAttackProcedure = {
  readonly kind: "attack";
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly section: Extract<
    StatBlockAttackSection,
    "actions" | "legendaryActions"
  >;
  readonly attack: SupportedCreatureAttackRollMechanics;
  readonly traitAttackRollModes?: ReadonlyNonEmptyArray<StatBlockTraitAttackRollMode>;
};

/** Runtime-injected Unarmed Strike; it has no authored procedure ordinal. */
export type StatBlockUnarmedStrikeProcedure = {
  readonly kind: "unarmedStrike";
  readonly section: "actions";
  readonly attack: SupportedCreatureAttackRollMechanics;
};

export type StatBlockMultiattackProcedure = {
  readonly kind: "multiattack";
  readonly section: "actions";
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly dispatchProcedureRefs: ReadonlyNonEmptyArray<BattleStatBlockProcedureExecutionRef>;
};

export type StatBlockBonusActionOptionProcedure = {
  readonly kind: "bonusActionOption";
  readonly section: "bonusActions";
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly standardActions: ReadonlyNonEmptyArray<SupportedStatBlockBonusActionStandardAction>;
};

export type StatBlockProcedure =
  | StatBlockAttackProcedure
  | StatBlockUnarmedStrikeProcedure
  | StatBlockMultiattackProcedure
  | StatBlockBonusActionOptionProcedure;

export type StatBlockProcedureBindingFor<
  TProcedure extends StatBlockProcedure,
> = {
  readonly procedureRef: BattleStatBlockProcedureExecutionRef;
  readonly resourcePoolRefs: readonly BattleResourcePoolExecutionRef[];
  readonly procedure: TProcedure;
};

export type StatBlockProcedureBinding =
  StatBlockProcedureBindingFor<StatBlockProcedure>;
export type StatBlockProcedureBindingSnapshot = StatBlockProcedureBinding;

export type StatBlockResourcePoolState =
  | {
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      readonly kind: "daily";
      readonly ownership: "shared" | "each";
      readonly usesMax: ResourceCount;
      readonly usesRemaining: ResourceCount;
    }
  | {
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      readonly kind: "recharge";
      readonly ownership: "shared" | "each";
      readonly minimumRoll: Extract<
        CreatureLimitedUse,
        { readonly kind: "recharge" }
      >["minimumRoll"];
      readonly available: boolean;
    }
  | {
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      readonly kind: "recharge_after_rest";
      readonly ownership: "shared" | "each";
      readonly available: boolean;
    }
  | {
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      readonly kind: "legendaryActions";
      readonly usesMax: ResourceCount;
      readonly usesRemaining: ResourceCount;
    };

export type StatBlockExecutionSnapshot = {
  readonly scopeRef: BattleStatBlockExecutionScopeRef;
  readonly procedureBindings: readonly StatBlockProcedureBindingSnapshot[];
  readonly resourcePools: readonly StatBlockResourcePoolState[];
};

type StatBlockExecutionStateData = {
  readonly scopeRef: BattleStatBlockExecutionScopeRef;
  readonly procedureBindings: readonly StatBlockProcedureBinding[];
  readonly resourcePools: readonly StatBlockResourcePoolState[];
};
export type StatBlockExecutionState = StatBlockExecutionStateData &
  Brand.Brand<"AdmittedStatBlockExecutionState">;

const AdmittedStatBlockExecutionState =
  Brand.nominal<StatBlockExecutionState>();

export function admittedStatBlockExecutionState(
  data: StatBlockExecutionStateData,
): StatBlockExecutionState {
  return AdmittedStatBlockExecutionState(data);
}

export type StatBlockExecutionAdmission<
  TStatBlock extends BattleStatBlockExecutionSource =
    BattleStatBlockExecutionSource,
> = {
  readonly statBlock: TStatBlock;
  readonly execution: StatBlockExecutionState;
} & Brand.Brand<"StatBlockExecutionAdmission">;

export function statBlockAttackActionOptions(
  execution: StatBlockExecutionState,
): readonly StatBlockAttackActionOption[] {
  return execution.procedureBindings.flatMap((binding) => {
    if (
      binding.procedure.kind !== "attack" &&
      binding.procedure.kind !== "unarmedStrike"
    ) {
      return [];
    }
    const attack = binding.procedure.attack;
    const damage = supportedStatBlockAttackDamage(attack);
    const traitAttackRollModes =
      binding.procedure.kind === "attack"
        ? binding.procedure.traitAttackRollModes
        : undefined;
    const base = {
      kind: "statBlockAttack" as const,
      procedureRef: binding.procedureRef,
      attack,
      ...optionalProperty("traitAttackRollModes", traitAttackRollModes),
    };
    return [
      ...(statBlockAttackDamageRequiresRoll(damage)
        ? [{ ...base, damageNotation: "rolled" as const }]
        : []),
      ...(statBlockAttackSupportsStaticDamageNotation(attack)
        ? [{ ...base, attack, damageNotation: "static" as const }]
        : []),
    ];
  });
}

function statBlockAttackSupportsStaticDamageNotation(
  attack: SupportedCreatureAttackRollMechanics,
): attack is SupportedStaticDamageCreatureAttackRollMechanics {
  return statBlockAttackDamageSupportsStaticNotation(
    supportedStatBlockAttackDamage(attack),
  );
}

export function statBlockProcedureBinding(
  execution: StatBlockExecutionState,
  procedureRef: BattleStatBlockProcedureExecutionRef,
): StatBlockProcedureBinding | undefined {
  return execution.procedureBindings.find(
    (binding) => binding.procedureRef === procedureRef,
  );
}

export function statBlockExecutionSnapshot(
  execution: StatBlockExecutionState,
): StatBlockExecutionSnapshot {
  return {
    scopeRef: execution.scopeRef,
    procedureBindings: execution.procedureBindings,
    resourcePools: execution.resourcePools,
  };
}

export function statBlockProcedureResourcesAvailable(
  execution: StatBlockExecutionState,
  procedureRef: BattleStatBlockProcedureExecutionRef,
): boolean {
  const binding = statBlockProcedureBinding(execution, procedureRef);
  return binding !== undefined
    ? statBlockResourcePoolUsesAvailable(
        execution,
        resourcePoolUsesForRefs(binding.resourcePoolRefs),
      )
    : false;
}

export type StatBlockMultiattackDispatchResourceDemand =
  | {
      readonly kind: "allListedDispatches";
      readonly procedureRefs: ReadonlyNonEmptyArray<BattleStatBlockProcedureExecutionRef>;
    }
  | {
      readonly kind: "oneListedDispatch";
      readonly procedureRefs: ReadonlyNonEmptyArray<BattleStatBlockProcedureExecutionRef>;
    };

/**
 * An unrestricted Multiattack must be able to pay every listed dispatch
 * occurrence. A one-dispatch cap instead requires the activation resources and
 * at least one individually payable listed dispatch, leaving the choice to the
 * resolving actor.
 */
export function statBlockMultiattackResourcesAvailable(
  execution: StatBlockExecutionState,
  binding: StatBlockProcedureBindingFor<StatBlockMultiattackProcedure>,
  demand: StatBlockMultiattackDispatchResourceDemand,
): boolean {
  const requiredUsesByPool = resourcePoolUsesForRefs(binding.resourcePoolRefs);
  return Match.value(demand).pipe(
    Match.when({ kind: "oneListedDispatch" }, ({ procedureRefs }) =>
      procedureRefs.some((procedureRef) => {
        const dispatchBinding = statBlockProcedureBinding(
          execution,
          procedureRef,
        );
        if (dispatchBinding === undefined) return false;
        const selectedUsesByPool = new Map(requiredUsesByPool);
        for (const resourcePoolRef of dispatchBinding.resourcePoolRefs) {
          selectedUsesByPool.set(
            resourcePoolRef,
            (selectedUsesByPool.get(resourcePoolRef) ?? 0) + 1,
          );
        }
        return statBlockResourcePoolUsesAvailable(
          execution,
          selectedUsesByPool,
        );
      }),
    ),
    Match.when({ kind: "allListedDispatches" }, ({ procedureRefs }) => {
      for (const procedureRef of procedureRefs) {
        const dispatchBinding = statBlockProcedureBinding(
          execution,
          procedureRef,
        );
        if (dispatchBinding === undefined) return false;
        for (const resourcePoolRef of dispatchBinding.resourcePoolRefs) {
          requiredUsesByPool.set(
            resourcePoolRef,
            (requiredUsesByPool.get(resourcePoolRef) ?? 0) + 1,
          );
        }
      }
      return statBlockResourcePoolUsesAvailable(execution, requiredUsesByPool);
    }),
    Match.exhaustive,
  );
}

/**
 * Multiattack activation spends only the Multiattack binding's resource
 * declaration. Every granted dispatch remains pending and spends its own
 * procedure resources when that attack is actually resolved.
 */
export function spendStatBlockMultiattackActivationResources(
  execution: StatBlockExecutionState,
  binding: StatBlockProcedureBindingFor<StatBlockMultiattackProcedure>,
): StatBlockExecutionState {
  return spendStatBlockResourcePoolUses(execution, binding.resourcePoolRefs);
}

export function spendStatBlockProcedureResources(
  execution: StatBlockExecutionState,
  procedureRef: BattleStatBlockProcedureExecutionRef,
): StatBlockExecutionState {
  const binding = statBlockProcedureBinding(execution, procedureRef);
  return binding === undefined
    ? execution
    : spendStatBlockResourcePoolUses(execution, binding.resourcePoolRefs);
}

export function refreshStatBlockStartTurnExecution(
  execution: StatBlockExecutionState,
): StatBlockExecutionState {
  return admittedStatBlockExecutionState({
    ...execution,
    resourcePools: execution.resourcePools.map((pool) =>
      pool.kind === "legendaryActions"
        ? { ...pool, usesRemaining: pool.usesMax }
        : pool,
    ),
  });
}

export function unavailableStatBlockRechargePoolRefs(
  execution: StatBlockExecutionState,
): readonly BattleResourcePoolExecutionRef[] {
  return execution.resourcePools.flatMap((pool) =>
    pool.kind === "recharge" && !pool.available ? [pool.resourcePoolRef] : [],
  );
}

export function applyStatBlockRechargeRolls(
  execution: StatBlockExecutionState,
  rolls: readonly {
    readonly target: BattleResourcePoolExecutionRef;
    readonly roll: DieRollResult;
  }[],
): StatBlockExecutionState {
  const rollsByTarget = new Map(rolls.map((roll) => [roll.target, roll.roll]));
  return admittedStatBlockExecutionState({
    ...execution,
    resourcePools: execution.resourcePools.map((pool) => {
      if (pool.kind !== "recharge" || pool.available) return pool;
      const roll = rollsByTarget.get(pool.resourcePoolRef);
      return roll !== undefined && roll >= pool.minimumRoll
        ? { ...pool, available: true }
        : pool;
    }),
  });
}

function statBlockResourcePool(
  execution: StatBlockExecutionState,
  resourcePoolRef: BattleResourcePoolExecutionRef,
): StatBlockResourcePoolState | undefined {
  return execution.resourcePools.find(
    (pool) => pool.resourcePoolRef === resourcePoolRef,
  );
}

function resourcePoolAvailableUses(pool: StatBlockResourcePoolState): number {
  return pool.kind === "daily" || pool.kind === "legendaryActions"
    ? Number(pool.usesRemaining)
    : pool.available
      ? 1
      : 0;
}

function resourcePoolUsesForRefs(
  resourcePoolRefs: readonly BattleResourcePoolExecutionRef[],
): Map<BattleResourcePoolExecutionRef, number> {
  const requiredUsesByPool = new Map<BattleResourcePoolExecutionRef, number>();
  for (const resourcePoolRef of resourcePoolRefs) {
    requiredUsesByPool.set(
      resourcePoolRef,
      (requiredUsesByPool.get(resourcePoolRef) ?? 0) + 1,
    );
  }
  return requiredUsesByPool;
}

function statBlockResourcePoolUsesAvailable(
  execution: StatBlockExecutionState,
  requiredUsesByPool: ReadonlyMap<BattleResourcePoolExecutionRef, number>,
): boolean {
  return [...requiredUsesByPool].every(([resourcePoolRef, requiredUses]) => {
    const pool = statBlockResourcePool(execution, resourcePoolRef);
    return (
      pool !== undefined && resourcePoolAvailableUses(pool) >= requiredUses
    );
  });
}

function spendStatBlockResourcePoolUses(
  execution: StatBlockExecutionState,
  resourcePoolRefs: readonly BattleResourcePoolExecutionRef[],
): StatBlockExecutionState {
  const requiredUsesByPool = resourcePoolUsesForRefs(resourcePoolRefs);
  if (!statBlockResourcePoolUsesAvailable(execution, requiredUsesByPool)) {
    return execution;
  }
  return admittedStatBlockExecutionState({
    ...execution,
    resourcePools: execution.resourcePools.map((pool) => {
      const requiredUses = requiredUsesByPool.get(pool.resourcePoolRef);
      return requiredUses === undefined
        ? pool
        : spendResourcePool(pool, requiredUses);
    }),
  });
}

function spendResourcePool(
  pool: StatBlockResourcePoolState,
  requiredUses: number,
): StatBlockResourcePoolState {
  if (pool.kind === "daily" || pool.kind === "legendaryActions") {
    return {
      ...pool,
      usesRemaining: resourceCount(Number(pool.usesRemaining) - requiredUses),
    };
  }
  return { ...pool, available: false };
}

export function statBlockMultiattackBindings(
  execution: StatBlockExecutionState,
): readonly StatBlockProcedureBindingFor<StatBlockMultiattackProcedure>[] {
  return execution.procedureBindings.filter(
    (
      binding,
    ): binding is StatBlockProcedureBindingFor<StatBlockMultiattackProcedure> =>
      binding.procedure.kind === "multiattack",
  );
}

export function statBlockBonusActionOptionBindings(
  execution: StatBlockExecutionState,
): readonly StatBlockProcedureBindingFor<StatBlockBonusActionOptionProcedure>[] {
  return execution.procedureBindings.filter(
    (
      binding,
    ): binding is StatBlockProcedureBindingFor<StatBlockBonusActionOptionProcedure> =>
      binding.procedure.kind === "bonusActionOption",
  );
}
