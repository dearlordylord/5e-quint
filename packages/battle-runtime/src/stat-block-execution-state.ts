// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-MULTIATTACK-001 RAW-STAT-BLOCK-LIMITED-USAGE-001 RAW-STAT-BLOCK-SPELLCASTING-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties stat-block.multiattack stat-block.resource-lifecycle stat-block.spellcasting.procedure
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE BATTLE.SPELL.SLOW_MULTIATTACK_ATTACK_CAP BATTLE.STAT_BLOCK.MULTIATTACK BATTLE.STAT_BLOCK.RESOURCE_LIFECYCLE BATTLE.STAT_BLOCK.SPELLCASTING_PROCEDURE
import { optionalProperty } from "./optional-property.ts";
import {
  PositiveInteger,
  resourceCount,
  type D6RollResult,
  type Integer as IntegerType,
  type NonNegativeInteger as NonNegativeIntegerType,
  type PositiveInteger as PositiveIntegerType,
  type ReadonlyNonEmptyArray,
  type ResourceCount,
} from "@dnd/shared/types";
import type { Ability, CreatureType } from "@dnd/shared/game-facts";
import { Brand } from "effect";
import * as Result from "effect/Result";
import * as Match from "effect/Match";
import type {
  ChallengeRating,
  CreatureLimitedUse,
  CreatureRechargeMinimumRoll,
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
} from "./battle-action-options.ts";
import type { SupportedStatBlockBonusActionStandardAction } from "./battle-reducer/battle-runtime-protocol.ts";
import { selectedStatBlockAttackRollOptions } from "./statblock-attack-damage-support.ts";
import type { StatBlockActionProjectionSection } from "./stat-block-presentation-contract.ts";
import type {
  BattleResourcePoolExecutionRef,
  BattleStatBlockExecutionScopeRef,
  BattleStatBlockProcedureExecutionRef,
} from "./identity.ts";
import type { EffectOccurrenceSourceProcedure } from "./effect-occurrence-source-vocabulary.ts";

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
): Result.Result<
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
    return Result.fail([firstIssue, ...remainingIssues]);
  }
  const { resources: _resources, ...sourceWithoutResources } = source;
  return Result.succeed({ ...sourceWithoutResources, resources });
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
    for (const ordinal of runtimeProcedureResourceRefs(procedure)) {
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

function runtimeProcedureResourceRefs(
  procedure: BattleStatBlockRuntimeProcedure,
): readonly StatBlockProcedureResourceOrdinal[] {
  return procedure.kind === "spellcasting"
    ? [
        ...procedure.resourceRefs,
        ...procedure.groups.flatMap(({ resourceRefs }) => resourceRefs),
      ]
    : procedure.resourceRefs;
}

export type StatBlockLegendaryActionUsesParseFailure = "invalidPositiveInteger";

/**
 * The one numeric boundary for optional Legendary Action uses. `PositiveInteger`
 * owns the invariant; callers receive a typed failure instead of its throwing
 * constructor when untrusted runtime data is malformed.
 */
export function parseStatBlockLegendaryActionUses(
  value: number | undefined,
): Result.Result<
  PositiveIntegerType | undefined,
  StatBlockLegendaryActionUsesParseFailure
> {
  if (value === undefined) return Result.succeed(undefined);
  return Result.mapError(
    PositiveInteger.result(value),
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
): Result.Result<
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
    return Result.fail("invalidLiteral");
  }
  return Result.succeed({ kind: "literal", value: value.value });
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
): Result.Result<
  BattleStatBlockPositiveIntegerLiteral,
  StatBlockPositiveIntegerLiteralParseFailure
> {
  const literal = parseStatBlockLiteralValue(value);
  if (Result.isFailure(literal)) return Result.fail(literal.failure);
  const positiveInteger = PositiveInteger.result(literal.success.value);
  if (Result.isFailure(positiveInteger)) {
    return Result.fail("invalidPositiveInteger");
  }
  return Result.succeed({ kind: "literal", value: positiveInteger.success });
}

export type BattleStatBlockRuntimeResource = {
  readonly ordinal: StatBlockProcedureResourceOrdinal;
  readonly ownership: "shared" | "each";
  readonly limit:
    | { readonly kind: "daily"; readonly uses: PositiveIntegerType }
    | {
        readonly kind: "recharge";
        readonly minimumRoll: CreatureRechargeMinimumRoll;
      }
    | { readonly kind: "recharge_after_rest" };
};

export type StatBlockRuntimeResourceParseFailure = "invalidDailyUses";

/**
 * Resolve one authored resource declaration into the source-free runtime
 * shape. The surface decoder owns structure; this boundary narrows the daily
 * and recharge numeric facts before execution receives them.
 */
export function parseStatBlockRuntimeResource(
  resource: StatBlockProcedureResource,
): Result.Result<
  BattleStatBlockRuntimeResource,
  StatBlockRuntimeResourceParseFailure
> {
  if (resource.limit.kind === "daily") {
    const uses = PositiveInteger.result(resource.limit.uses);
    if (Result.isFailure(uses)) {
      return Result.fail("invalidDailyUses");
    }
    return Result.succeed({
      ordinal: resource.ordinal,
      ownership: resource.ownership,
      limit: { kind: "daily", uses: uses.success },
    });
  }
  if (resource.limit.kind === "recharge") {
    return Result.succeed({
      ordinal: resource.ordinal,
      ownership: resource.ownership,
      limit: {
        kind: "recharge",
        minimumRoll: resource.limit.minimumRoll,
      },
    });
  }
  return Result.succeed({
    ordinal: resource.ordinal,
    ownership: resource.ownership,
    limit: { kind: "recharge_after_rest" },
  });
}

export type BattleStatBlockRuntimeMultiattackDispatch = {
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly count: PositiveIntegerType;
};

/**
 * A spell reference after the generic Stat Block procedure boundary has
 * removed authored identity and protected expression. Restricted references
 * remain a typed, non-executable child outcome; #428's semantic deltas are
 * intentionally not promoted into this runtime shape.
 *
 * This increment never selects a child invocation. The child owner will add a
 * canonical invocation reference at its own selection boundary; until then an
 * outcome kind is enough to preserve the procedure's admitted shape without
 * creating a positional or authored-identity dispatch key.
 */
export type StatBlockSpellcastingInvocationOutcome =
  | { readonly kind: "unrestricted" }
  | { readonly kind: "restricted" };

/**
 * Group facts retain only the execution-relevant group kind, child outcome
 * kinds, and resource ordinals. Spell ids, names, provenance, and authored
 * restriction prose remain at the Surface/presentation boundary. This owner
 * maps the complete group; it does not select a group or invocation.
 */
export type BattleStatBlockRuntimeSpellcastingGroup =
  | {
      readonly kind: "at_will";
      readonly resourceRefs: readonly [];
      readonly invocations: ReadonlyNonEmptyArray<StatBlockSpellcastingInvocationOutcome>;
    }
  | {
      readonly kind: "limited";
      readonly resourceRefs: ReadonlyNonEmptyArray<StatBlockProcedureResourceOrdinal>;
      readonly invocations: ReadonlyNonEmptyArray<StatBlockSpellcastingInvocationOutcome>;
    };

export type BattleStatBlockRuntimeSpellcastingComponents = {
  readonly v: boolean;
  readonly s: boolean;
  readonly m: "required" | "notRequired";
};

export type BattleStatBlockRuntimeSpellcastingProcedure = {
  readonly kind: "spellcasting";
  readonly section: "actions" | "bonusActions";
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly ability: Ability;
  readonly spellSaveDc?: PositiveIntegerType;
  readonly spellAttackBonus?: IntegerType;
  readonly components?: BattleStatBlockRuntimeSpellcastingComponents;
  readonly groups: ReadonlyNonEmptyArray<BattleStatBlockRuntimeSpellcastingGroup>;
  /** Stat Block spellcasting entries cannot own a top-level resource. */
  readonly resourceRefs: readonly [];
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
    }
  | BattleStatBlockRuntimeSpellcastingProcedure;

export type StatBlockActionProjectionShape =
  | "attack"
  | "multiattack"
  | "save"
  | "support"
  | "actionOption"
  | "spellcasting"
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

export type StatBlockSpellcastingGroup =
  | {
      readonly kind: "at_will";
      readonly resourcePoolRefs: readonly [];
      readonly invocations: ReadonlyNonEmptyArray<StatBlockSpellcastingInvocationOutcome>;
    }
  | {
      readonly kind: "limited";
      readonly resourcePoolRefs: ReadonlyNonEmptyArray<BattleResourcePoolExecutionRef>;
      readonly invocations: ReadonlyNonEmptyArray<StatBlockSpellcastingInvocationOutcome>;
    };

export type StatBlockSpellcastingProcedure = {
  readonly kind: "spellcasting";
  readonly section: "actions" | "bonusActions";
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly ability: Ability;
  readonly spellSaveDc?: PositiveIntegerType;
  readonly spellAttackBonus?: IntegerType;
  readonly components?: BattleStatBlockRuntimeSpellcastingComponents;
  readonly groups: ReadonlyNonEmptyArray<StatBlockSpellcastingGroup>;
};

export type StatBlockSpellcastingActionCost = "magicAction" | "bonusAction";

/**
 * Project an admitted Stat Block spellcasting procedure into the battle
 * action-economy vocabulary. The procedure shape has already narrowed the
 * section to Actions or Bonus Actions; unsupported action sections cannot
 * reach this owner.
 */
export function statBlockSpellcastingActionCost(
  procedure: Pick<StatBlockSpellcastingProcedure, "kind" | "section">,
): StatBlockSpellcastingActionCost {
  return Match.value(procedure.section).pipe(
    Match.when("actions", () => "magicAction" as const),
    Match.when("bonusActions", () => "bonusAction" as const),
    Match.exhaustive,
  );
}

export type StatBlockProcedure =
  | StatBlockAttackProcedure
  | StatBlockUnarmedStrikeProcedure
  | StatBlockMultiattackProcedure
  | StatBlockBonusActionOptionProcedure
  | StatBlockSpellcastingProcedure
  | EffectOccurrenceSourceProcedure;

/**
 * Spellcasting and effect-occurrence source procedures have no procedure-owned
 * resource pools. Spellcasting group invocation selection owns its resource
 * references; effect-occurrence sources only restore an existing effect. This
 * conditional is deliberately distributive so those branches cannot carry a
 * top-level resource reference.
 */
export type StatBlockProcedureBindingFor<
  TProcedure extends StatBlockProcedure,
> = TProcedure extends
  | StatBlockSpellcastingProcedure
  | EffectOccurrenceSourceProcedure
  ? {
      readonly procedureRef: BattleStatBlockProcedureExecutionRef;
      readonly resourcePoolRefs: readonly [];
      readonly procedure: TProcedure;
    }
  : {
      readonly procedureRef: BattleStatBlockProcedureExecutionRef;
      readonly resourcePoolRefs: readonly BattleResourcePoolExecutionRef[];
      readonly procedure: TProcedure;
    };

export type StatBlockProcedureBinding =
  StatBlockProcedureBindingFor<StatBlockProcedure>;

type StatBlockAggregateSpellcastingBinding = Extract<
  StatBlockProcedureBinding,
  { readonly procedure: { readonly kind: "spellcasting" } }
>;
type StatBlockSpellcastingBindingTopLevelResourceInvariantHolds =
  StatBlockAggregateSpellcastingBinding["resourcePoolRefs"] extends readonly []
    ? true
    : false;
type AssertStatBlockProcedureBindingInvariant<Condition extends true> =
  Condition;
export type StatBlockSpellcastingBindingTopLevelResourceInvariant =
  AssertStatBlockProcedureBindingInvariant<StatBlockSpellcastingBindingTopLevelResourceInvariantHolds>;

export type StatBlockNonSpellProcedureBinding = StatBlockProcedureBindingFor<
  Exclude<StatBlockProcedure, StatBlockSpellcastingProcedure>
>;

export function isNonSpellStatBlockProcedureBinding(
  binding: StatBlockProcedureBinding,
): binding is StatBlockNonSpellProcedureBinding {
  return binding.procedure.kind !== "spellcasting";
}
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
    const traitAttackRollModes =
      binding.procedure.kind === "attack"
        ? binding.procedure.traitAttackRollModes
        : undefined;
    return selectedStatBlockAttackRollOptions(attack).map(
      (selectedAttack): StatBlockAttackActionOption => ({
        kind: "statBlockAttack",
        procedureRef: binding.procedureRef,
        attack: selectedAttack,
        ...optionalProperty("traitAttackRollModes", traitAttackRollModes),
      }),
    );
  });
}

export function statBlockProcedureBinding(
  execution: Pick<StatBlockExecutionSnapshot, "procedureBindings">,
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
    readonly roll: D6RollResult;
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
