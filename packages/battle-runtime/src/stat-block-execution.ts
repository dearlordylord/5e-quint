import {
  NonNegativeInteger,
  PositiveInteger,
  resourceCount,
  type DieRollResult,
  type ReadonlyNonEmptyArray,
  type ResourceCount,
} from "@dnd/shared/types";
import { Brand } from "effect";
import * as Either from "effect/Either";
import type {
  CreatureLimitedUse,
  CreatureNamedAttackRoll,
  CreatureNamedMultiattack,
  StatBlockRecord,
} from "@dnd/surface/surface/types";
import type {
  StatBlockAttackActionOption,
  StatBlockAttackSection,
  SupportedCreatureAttackRollMechanics,
  SupportedStaticDamageCreatureAttackRollMechanics,
} from "./battle-action-options.ts";
import {
  SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS,
  type SupportedStatBlockBonusActionStandardAction,
} from "./battle-reducer/battle-runtime-protocol.ts";
import {
  statBlockAttackDamageSupportsStaticNotation,
  supportedStatBlockAttackDamage,
} from "./statblock-attack-damage-support.ts";
import {
  BattleProcedureExecutionRef,
  type BattleId,
  BattleResourcePoolExecutionRef,
  BattleStatBlockExecutionScopeRef,
  battleProcedureExecutionRef,
  battleResourcePoolExecutionRef,
  battleExecutionScopeOrdinal,
  battleStatBlockExecutionScopeRef,
  battleStatBlockExecutionScopeRefBelongsToBattle,
  battleStatBlockExecutionScopeRefBelongsToCombatant,
  type BattleExecutionScopeOrdinal,
  type CombatantId,
} from "./identity.ts";
import {
  creatureNamedAttackRollIsSupported,
  supportedStatBlockTraitAttackRollModes,
} from "./statblock-action-support.ts";

export type StatBlockAttackProcedure = {
  readonly kind: "attack";
  readonly section: Extract<
    StatBlockAttackSection,
    "actions" | "legendaryActions"
  >;
  readonly attack: SupportedCreatureAttackRollMechanics;
  readonly traitAttackRollModes?: StatBlockAttackActionOption["traitAttackRollModes"];
};

export type StatBlockMultiattackProcedure = {
  readonly kind: "multiattack";
  readonly dispatchProcedureRefs: ReadonlyNonEmptyArray<BattleProcedureExecutionRef>;
};

export type StatBlockBonusActionOptionProcedure = {
  readonly kind: "bonusActionOption";
  readonly standardActions: ReadonlyNonEmptyArray<SupportedStatBlockBonusActionStandardAction>;
};

export type StatBlockProcedureBindingFor<
  TProcedure extends StatBlockProcedure,
> = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly resourcePoolRefs: readonly BattleResourcePoolExecutionRef[];
  readonly procedure: TProcedure;
};

export type StatBlockProcedure =
  | StatBlockAttackProcedure
  | StatBlockMultiattackProcedure
  | StatBlockBonusActionOptionProcedure;

export type StatBlockProcedureBinding =
  StatBlockProcedureBindingFor<StatBlockProcedure>;

export type StatBlockProcedureBindingSnapshot = StatBlockProcedureBinding;

export type StatBlockResourcePoolState =
  | {
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      readonly kind: "daily";
      readonly usesMax: ResourceCount;
      readonly usesRemaining: ResourceCount;
    }
  | {
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      readonly kind: "recharge";
      readonly minimumRoll: Extract<
        CreatureLimitedUse,
        { readonly kind: "recharge" }
      >["minimumRoll"];
      readonly available: boolean;
    }
  | {
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      readonly kind: "recharge_after_rest";
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

export type StatBlockExecutionRestoreIssue = {
  readonly tag: "invalidStatBlockExecutionSnapshot";
  readonly restorationIndex: NonNegativeInteger;
  readonly scopeRef: BattleStatBlockExecutionScopeRef;
  readonly reason:
    | "invalidResourceCount"
    | "procedureBindingsMismatch"
    | "resourcePoolsMismatch";
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

export type StatBlockExecutionAdmission<
  TStatBlock extends StatBlockRecord = StatBlockRecord,
> = {
  readonly statBlock: TStatBlock;
  readonly execution: StatBlockExecutionState;
} & Brand.Brand<"StatBlockExecutionAdmission">;

type ExecutionReferenceAllocator = {
  readonly scopeRef: BattleStatBlockExecutionScopeRef;
  procedureOrdinal: NonNegativeInteger;
  resourcePoolOrdinal: NonNegativeInteger;
};

type ExecutionScopeAllocator = {
  readonly battleId: BattleId;
  readonly combatantId: CombatantId;
  scopeOrdinal: BattleExecutionScopeOrdinal;
};

type AllocatedStatBlockExecution = {
  readonly execution: StatBlockExecutionState;
  readonly procedureRefs: ReadonlyMap<
    | AdmittedAttackOccurrence
    | AdmittedMultiattackOccurrence
    | AdmittedBonusActionOccurrence,
    BattleProcedureExecutionRef
  >;
};

type StatBlockProcedurePresentation =
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly kind: "attack";
      readonly name: string;
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly kind: "multiattack";
      readonly label: string;
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly kind: "bonusActionOption";
      readonly label: string;
    };

type AdmittedAttackOccurrence = {
  readonly kind: "attack";
  readonly section: StatBlockAttackProcedure["section"];
  readonly attack: StatBlockAttackProcedure["attack"];
  readonly traitAttackRollModes?: StatBlockAttackProcedure["traitAttackRollModes"];
  readonly limitedUse?: CreatureLimitedUse;
};

type AdmittedMultiattackOccurrence = {
  readonly kind: "multiattack";
  readonly dispatches: ReadonlyNonEmptyArray<{
    readonly attack: AdmittedAttackOccurrence;
    readonly count: PositiveInteger;
  }>;
};

type AdmittedBonusActionOccurrence = {
  readonly kind: "bonusActionOption";
  readonly standardActions: ReadonlyNonEmptyArray<SupportedStatBlockBonusActionStandardAction>;
  readonly limitedUse?: CreatureLimitedUse;
};

type AdmittedStatBlockOccurrences = {
  readonly legendaryActionUses?: PositiveInteger;
  readonly attacks: readonly AdmittedAttackOccurrence[];
  readonly multiattacks: readonly AdmittedMultiattackOccurrence[];
  readonly bonusActions: readonly AdmittedBonusActionOccurrence[];
};

type StatBlockPresentationOccurrence =
  | {
      readonly occurrence: AdmittedAttackOccurrence;
      readonly kind: "attack";
      readonly name: string;
    }
  | {
      readonly occurrence: AdmittedMultiattackOccurrence;
      readonly kind: "multiattack";
      readonly label: string;
    }
  | {
      readonly occurrence: AdmittedBonusActionOccurrence;
      readonly kind: "bonusActionOption";
      readonly label: string;
    };

type AdmittedStatBlock = {
  readonly occurrences: AdmittedStatBlockOccurrences;
  readonly presentationOccurrences: readonly StatBlockPresentationOccurrence[];
};

export function statBlockExecutionAdmissionCohort<
  TStatBlock extends StatBlockRecord,
>(
  battleId: BattleId,
  combatantId: CombatantId,
  statBlocks: readonly TStatBlock[],
  startingScopeOrdinal: BattleExecutionScopeOrdinal,
): {
  readonly admissions: readonly StatBlockExecutionAdmission<TStatBlock>[];
  readonly nextScopeOrdinal: BattleExecutionScopeOrdinal;
} {
  const scopeAllocator: ExecutionScopeAllocator = {
    battleId,
    combatantId,
    scopeOrdinal: startingScopeOrdinal,
  };
  const admissions = statBlocks.map((statBlock) => {
    const scopeRef = allocateExecutionScopeRef(scopeAllocator);
    const admitted = admitStatBlock(statBlock);
    const allocated = allocateStatBlockExecution(
      executionReferenceAllocator(scopeRef),
      admitted.occurrences,
    );
    return Brand.nominal<StatBlockExecutionAdmission<TStatBlock>>()({
      statBlock,
      execution: allocated.execution,
    });
  });
  return { admissions, nextScopeOrdinal: scopeAllocator.scopeOrdinal };
}

function admitStatBlock(statBlock: StatBlockRecord): AdmittedStatBlock {
  const attacks: AdmittedAttackOccurrence[] = [];
  const attackPresentations: Extract<
    StatBlockPresentationOccurrence,
    { readonly kind: "attack" }
  >[] = [];
  const traitAttackRollModes = supportedStatBlockTraitAttackRollModes(
    statBlock.statBlock.traits,
  );
  for (const [section, sectionAttacks] of statBlockAttackSections(statBlock)) {
    if (
      section === "legendaryActions" &&
      statBlock.statBlock.legendaryActions?.uses === undefined
    ) {
      continue;
    }
    for (const attack of sectionAttacks) {
      if (!creatureNamedAttackRollIsSupported(attack)) continue;
      const {
        name,
        description: _description,
        limitedUse,
        ...attackMechanics
      } = attack;
      const occurrence: AdmittedAttackOccurrence = {
        kind: "attack",
        section,
        attack: attackMechanics,
        ...(traitAttackRollModes === undefined ? {} : { traitAttackRollModes }),
        ...(limitedUse === undefined ? {} : { limitedUse }),
      };
      attacks.push(occurrence);
      attackPresentations.push({ occurrence, kind: "attack", name });
    }
  }

  const actionAttackPresentations = attackPresentations.filter(
    ({ occurrence }) => occurrence.section === "actions",
  );
  const multiattacks: AdmittedMultiattackOccurrence[] = [];
  const multiattackPresentations: StatBlockPresentationOccurrence[] = [];
  for (const multiattack of statBlock.statBlock.actions?.multiattacks ?? []) {
    const dispatches = admittedMultiattackDispatches(
      multiattack,
      actionAttackPresentations,
    );
    if (dispatches === null) continue;
    const occurrence: AdmittedMultiattackOccurrence = {
      kind: "multiattack",
      dispatches,
    };
    multiattacks.push(occurrence);
    multiattackPresentations.push({
      occurrence,
      kind: "multiattack",
      label: multiattack.name,
    });
  }

  const bonusActions: AdmittedBonusActionOccurrence[] = [];
  const bonusActionPresentations: StatBlockPresentationOccurrence[] = [];
  for (const option of statBlock.statBlock.bonusActions?.actionOptions ?? []) {
    const standardActions = option.options.filter(
      (
        standardAction,
      ): standardAction is SupportedStatBlockBonusActionStandardAction =>
        SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS.some(
          (supported) => supported === standardAction,
        ),
    );
    if (
      standardActions.length === 0 ||
      standardActions.length !== option.options.length
    ) {
      continue;
    }
    const admittedStandardActions = nonEmpty(standardActions);
    if (admittedStandardActions === null) continue;
    const occurrence: AdmittedBonusActionOccurrence = {
      kind: "bonusActionOption",
      standardActions: admittedStandardActions,
      ...(option.limitedUse === undefined
        ? {}
        : { limitedUse: option.limitedUse }),
    };
    bonusActions.push(occurrence);
    bonusActionPresentations.push({
      occurrence,
      kind: "bonusActionOption",
      label: option.name,
    });
  }

  return {
    occurrences: {
      ...(statBlock.statBlock.legendaryActions?.uses === undefined ||
      !attacks.some((attack) => attack.section === "legendaryActions")
        ? {}
        : {
            legendaryActionUses: PositiveInteger(
              statBlock.statBlock.legendaryActions.uses,
            ),
          }),
      attacks,
      multiattacks,
      bonusActions,
    },
    presentationOccurrences: [
      ...attackPresentations,
      ...multiattackPresentations,
      ...bonusActionPresentations,
    ],
  };
}

function admittedMultiattackDispatches(
  multiattack: CreatureNamedMultiattack,
  actionAttacks: readonly Extract<
    StatBlockPresentationOccurrence,
    { readonly kind: "attack" }
  >[],
): AdmittedMultiattackOccurrence["dispatches"] | null {
  if (multiattack.dispatches.length === 0) return null;
  const admittedDispatches: {
    readonly attack: AdmittedAttackOccurrence;
    readonly count: PositiveInteger;
  }[] = [];
  const limitedUseDispatchCountByAttack = new Map<
    AdmittedAttackOccurrence,
    number
  >();
  for (const dispatch of multiattack.dispatches) {
    if (
      dispatch.count.kind !== "literal" ||
      dispatch.count.value < 1 ||
      !Number.isInteger(dispatch.count.value)
    ) {
      return null;
    }
    const candidates = actionAttacks.filter(
      (attack) => attack.name === dispatch.name,
    );
    const [candidate] = candidates;
    if (candidate === undefined || candidates.length !== 1) return null;
    if (candidate.occurrence.limitedUse !== undefined) {
      const totalDispatchCount =
        (limitedUseDispatchCountByAttack.get(candidate.occurrence) ?? 0) +
        dispatch.count.value;
      if (totalDispatchCount > 1) return null;
      limitedUseDispatchCountByAttack.set(
        candidate.occurrence,
        totalDispatchCount,
      );
    }
    admittedDispatches.push({
      attack: candidate.occurrence,
      count: PositiveInteger(dispatch.count.value),
    });
  }
  return nonEmpty(admittedDispatches);
}

function allocateStatBlockExecution(
  allocator: ExecutionReferenceAllocator,
  admitted: AdmittedStatBlockOccurrences,
): AllocatedStatBlockExecution {
  const procedureBindings: StatBlockProcedureBinding[] = [];
  const resourcePools: StatBlockResourcePoolState[] = [];
  const procedureRefs = new Map<
    | AdmittedAttackOccurrence
    | AdmittedMultiattackOccurrence
    | AdmittedBonusActionOccurrence,
    BattleProcedureExecutionRef
  >();
  const legendaryUses = admitted.legendaryActionUses;
  const legendaryPool =
    legendaryUses === undefined
      ? undefined
      : ({
          resourcePoolRef: allocateResourcePoolRef(allocator),
          kind: "legendaryActions",
          usesMax: resourceCount(legendaryUses),
          usesRemaining: resourceCount(legendaryUses),
        } satisfies Extract<
          StatBlockResourcePoolState,
          { readonly kind: "legendaryActions" }
        >);
  if (legendaryPool !== undefined) resourcePools.push(legendaryPool);

  const attackProcedureRefs = new Map<
    AdmittedAttackOccurrence,
    BattleProcedureExecutionRef
  >();
  for (const occurrence of admitted.attacks) {
    const limitedUsePool = statBlockLimitedUsePool(
      allocator,
      occurrence.limitedUse,
    );
    if (limitedUsePool !== null) resourcePools.push(limitedUsePool);
    const procedureRef = allocateProcedureRef(allocator);
    procedureRefs.set(occurrence, procedureRef);
    attackProcedureRefs.set(occurrence, procedureRef);
    procedureBindings.push({
      procedureRef,
      procedure: {
        kind: "attack",
        section: occurrence.section,
        attack: occurrence.attack,
        ...(occurrence.traitAttackRollModes === undefined
          ? {}
          : { traitAttackRollModes: occurrence.traitAttackRollModes }),
      },
      resourcePoolRefs: [
        ...(limitedUsePool === null ? [] : [limitedUsePool.resourcePoolRef]),
        ...(occurrence.section !== "legendaryActions" ||
        legendaryPool === undefined
          ? []
          : [legendaryPool.resourcePoolRef]),
      ],
    });
  }

  for (const multiattack of admitted.multiattacks) {
    const dispatchProcedureRefs = nonEmpty(
      multiattack.dispatches.flatMap((dispatch) =>
        Array.from({ length: dispatch.count }, () =>
          requireAllocatedAttackRef(attackProcedureRefs, dispatch.attack),
        ),
      ),
    );
    if (dispatchProcedureRefs === null) {
      throw new Error(
        "An admitted Multiattack always dispatches at least one procedure.",
      );
    }
    const procedureRef = allocateProcedureRef(allocator);
    procedureRefs.set(multiattack, procedureRef);
    procedureBindings.push({
      procedureRef,
      procedure: { kind: "multiattack", dispatchProcedureRefs },
      resourcePoolRefs: [],
    });
  }

  for (const option of admitted.bonusActions) {
    const limitedUsePool = statBlockLimitedUsePool(
      allocator,
      option.limitedUse,
    );
    if (limitedUsePool !== null) resourcePools.push(limitedUsePool);
    const procedureRef = allocateProcedureRef(allocator);
    procedureRefs.set(option, procedureRef);
    procedureBindings.push({
      procedureRef,
      procedure: {
        kind: "bonusActionOption",
        standardActions: option.standardActions,
      },
      resourcePoolRefs:
        limitedUsePool === null ? [] : [limitedUsePool.resourcePoolRef],
    });
  }

  return {
    execution: AdmittedStatBlockExecutionState({
      scopeRef: allocator.scopeRef,
      procedureBindings,
      resourcePools,
    }),
    procedureRefs,
  };
}

function statBlockPresentationsForAllocation(
  admitted: AdmittedStatBlock,
  allocated: AllocatedStatBlockExecution,
): readonly StatBlockProcedurePresentation[] {
  return admitted.presentationOccurrences.map((presentation) => {
    const procedureRef = allocated.procedureRefs.get(presentation.occurrence);
    if (procedureRef === undefined) {
      throw new Error(
        "Every admitted presentation occurrence must have an allocated ref.",
      );
    }
    return presentation.kind === "attack"
      ? {
          procedureRef,
          kind: presentation.kind,
          name: presentation.name,
        }
      : {
          procedureRef,
          kind: presentation.kind,
          label: presentation.label,
        };
  });
}

export function statBlockAttackActionOptions(
  admission: StatBlockExecutionAdmission,
): readonly StatBlockAttackActionOption[] {
  return admission.execution.procedureBindings.flatMap((binding) => {
    if (binding.procedure.kind !== "attack") return [];
    const attack = binding.procedure.attack;
    const base = {
      kind: "statBlockAttack" as const,
      procedureRef: binding.procedureRef,
      attack,
      ...(binding.procedure.traitAttackRollModes === undefined
        ? {}
        : { traitAttackRollModes: binding.procedure.traitAttackRollModes }),
    };
    return [
      { ...base, damageNotation: "rolled" as const },
      ...(statBlockAttackSupportsStaticDamageNotation(attack)
        ? [
            {
              ...base,
              attack,
              damageNotation: "static" as const,
            },
          ]
        : []),
    ];
  });
}

export function statBlockProcedurePresentations(
  admission: StatBlockExecutionAdmission,
): readonly StatBlockProcedurePresentation[] {
  const admitted = admitStatBlock(admission.statBlock);
  const allocated = allocateStatBlockExecution(
    executionReferenceAllocator(admission.execution.scopeRef),
    admitted.occurrences,
  );
  if (
    !procedureBindingSnapshotsEqual(
      statBlockProcedureBindingSnapshots(allocated.execution),
      statBlockProcedureBindingSnapshots(admission.execution),
    )
  ) {
    throw new Error(
      "Presentation projection requires the paired admitted execution graph.",
    );
  }
  return statBlockPresentationsForAllocation(admitted, allocated);
}

function statBlockAttackSupportsStaticDamageNotation(
  attack: SupportedCreatureAttackRollMechanics,
): attack is SupportedStaticDamageCreatureAttackRollMechanics {
  return statBlockAttackDamageSupportsStaticNotation(
    supportedStatBlockAttackDamage(attack),
  );
}

function requireAllocatedAttackRef(
  refs: ReadonlyMap<AdmittedAttackOccurrence, BattleProcedureExecutionRef>,
  attack: AdmittedAttackOccurrence,
): BattleProcedureExecutionRef {
  const procedureRef = refs.get(attack);
  if (procedureRef === undefined) {
    throw new Error("Every admitted multiattack dispatch must be allocated.");
  }
  return procedureRef;
}

export function statBlockProcedureResourcesAvailable(
  execution: StatBlockExecutionState,
  procedureRef: BattleProcedureExecutionRef,
): boolean {
  const binding = statBlockProcedureBinding(execution, procedureRef);
  return (
    binding !== undefined &&
    binding.resourcePoolRefs.every((resourcePoolRef) => {
      const pool = statBlockResourcePool(execution, resourcePoolRef);
      return pool !== undefined && resourcePoolAvailable(pool);
    })
  );
}

export function spendStatBlockProcedureResources(
  execution: StatBlockExecutionState,
  procedureRef: BattleProcedureExecutionRef,
): StatBlockExecutionState {
  const binding = statBlockProcedureBinding(execution, procedureRef);
  if (
    binding === undefined ||
    !statBlockProcedureResourcesAvailable(execution, procedureRef)
  ) {
    return execution;
  }
  const ownedPoolRefs = new Set(binding.resourcePoolRefs);
  return AdmittedStatBlockExecutionState({
    ...execution,
    resourcePools: execution.resourcePools.map((pool) =>
      ownedPoolRefs.has(pool.resourcePoolRef) ? spendResourcePool(pool) : pool,
    ),
  });
}

export function refreshStatBlockStartTurnExecution(
  execution: StatBlockExecutionState,
): StatBlockExecutionState {
  return AdmittedStatBlockExecutionState({
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
  return AdmittedStatBlockExecutionState({
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

function resourcePoolAvailable(pool: StatBlockResourcePoolState): boolean {
  return pool.kind === "daily" || pool.kind === "legendaryActions"
    ? pool.usesRemaining > 0
    : pool.available;
}

function spendResourcePool(
  pool: StatBlockResourcePoolState,
): StatBlockResourcePoolState {
  if (pool.kind === "daily" || pool.kind === "legendaryActions") {
    return {
      ...pool,
      usesRemaining: resourceCount(Number(pool.usesRemaining) - 1),
    };
  }
  return { ...pool, available: false };
}

export function statBlockProcedureBinding(
  execution: StatBlockExecutionState,
  procedureRef: BattleProcedureExecutionRef,
): StatBlockProcedureBinding | undefined {
  return execution.procedureBindings.find(
    (binding) => binding.procedureRef === procedureRef,
  );
}

function statBlockProcedureBindingSnapshots(
  execution: StatBlockExecutionState,
): readonly StatBlockProcedureBindingSnapshot[] {
  return execution.procedureBindings;
}

export function statBlockExecutionSnapshot(
  execution: StatBlockExecutionState,
): StatBlockExecutionSnapshot {
  return {
    scopeRef: execution.scopeRef,
    procedureBindings: statBlockProcedureBindingSnapshots(execution),
    resourcePools: execution.resourcePools,
  };
}

export type StatBlockExecutionRestoration<
  TStatBlock extends StatBlockRecord = StatBlockRecord,
> = {
  readonly statBlock: TStatBlock;
  readonly snapshot: StatBlockExecutionSnapshot;
};

export function restoreStatBlockExecutionAdmissions<
  TStatBlock extends StatBlockRecord,
>(
  battleId: BattleId,
  combatantId: CombatantId,
  restorations: readonly StatBlockExecutionRestoration<TStatBlock>[],
): Either.Either<
  readonly StatBlockExecutionAdmission<TStatBlock>[],
  ReadonlyNonEmptyArray<StatBlockExecutionRestoreIssue>
> {
  const restored: StatBlockExecutionAdmission<TStatBlock>[] = [];
  const issues: StatBlockExecutionRestoreIssue[] = [];
  const restoredScopeRefs = new Set<BattleStatBlockExecutionScopeRef>();
  for (const [restorationIndex, restoration] of restorations.entries()) {
    const snapshot = restoration.snapshot;
    if (snapshot.resourcePools.some(resourcePoolStateIsOutOfBounds)) {
      issues.push(
        statBlockExecutionRestoreIssue(
          restorationIndex,
          snapshot.scopeRef,
          "invalidResourceCount",
        ),
      );
      continue;
    }
    if (
      restoredScopeRefs.has(snapshot.scopeRef) ||
      !battleStatBlockExecutionScopeRefBelongsToBattle(
        snapshot.scopeRef,
        battleId,
      ) ||
      !battleStatBlockExecutionScopeRefBelongsToCombatant(
        snapshot.scopeRef,
        combatantId,
      )
    ) {
      issues.push(
        statBlockExecutionRestoreIssue(
          restorationIndex,
          snapshot.scopeRef,
          "procedureBindingsMismatch",
        ),
      );
      continue;
    }
    restoredScopeRefs.add(snapshot.scopeRef);
    const admitted = admitStatBlock(restoration.statBlock);
    const allocated = allocateStatBlockExecution(
      executionReferenceAllocator(snapshot.scopeRef),
      admitted.occurrences,
    );
    const expected = Brand.nominal<StatBlockExecutionAdmission<TStatBlock>>()({
      statBlock: restoration.statBlock,
      execution: allocated.execution,
    });
    if (
      !procedureBindingSnapshotsEqual(
        snapshot.procedureBindings,
        statBlockProcedureBindingSnapshots(expected.execution),
      )
    ) {
      issues.push(
        statBlockExecutionRestoreIssue(
          restorationIndex,
          snapshot.scopeRef,
          "procedureBindingsMismatch",
        ),
      );
      continue;
    }
    if (
      !resourcePoolStructuresEqual(
        snapshot.resourcePools,
        expected.execution.resourcePools,
      )
    ) {
      issues.push(
        statBlockExecutionRestoreIssue(
          restorationIndex,
          snapshot.scopeRef,
          "resourcePoolsMismatch",
        ),
      );
      continue;
    }
    restored.push(
      Brand.nominal<StatBlockExecutionAdmission<TStatBlock>>()({
        statBlock: restoration.statBlock,
        execution: AdmittedStatBlockExecutionState({
          scopeRef: snapshot.scopeRef,
          procedureBindings: expected.execution.procedureBindings,
          resourcePools: restoredResourcePoolsInExecutionOrder(
            snapshot.resourcePools,
            expected.execution.resourcePools,
          ),
        }),
      }),
    );
  }
  const firstIssue = issues[0];
  if (firstIssue !== undefined) {
    return Either.left([firstIssue, ...issues.slice(1)]);
  }
  return Either.right(restored);
}

function statBlockExecutionRestoreIssue(
  restorationIndex: number,
  scopeRef: BattleStatBlockExecutionScopeRef,
  reason: StatBlockExecutionRestoreIssue["reason"],
): StatBlockExecutionRestoreIssue {
  return {
    tag: "invalidStatBlockExecutionSnapshot",
    restorationIndex: NonNegativeInteger(restorationIndex),
    scopeRef,
    reason,
  };
}

export function restoreStatBlockExecutionAdmission<
  TStatBlock extends StatBlockRecord,
>(
  battleId: BattleId,
  combatantId: CombatantId,
  statBlock: TStatBlock,
  snapshot: StatBlockExecutionSnapshot,
): Either.Either<
  StatBlockExecutionAdmission<TStatBlock>,
  StatBlockExecutionRestoreIssue
> {
  const restored = restoreStatBlockExecutionAdmissions(battleId, combatantId, [
    { statBlock, snapshot },
  ]);
  if (Either.isLeft(restored)) return Either.left(restored.left[0]);
  const admission = restored.right[0];
  if (admission === undefined) {
    throw new Error("A successful single restoration produces one admission.");
  }
  return Either.right(admission);
}

function resourcePoolStateIsOutOfBounds(
  pool: StatBlockResourcePoolState,
): boolean {
  return (
    (pool.kind === "daily" || pool.kind === "legendaryActions") &&
    (Number(pool.usesMax) < 1 ||
      Number(pool.usesRemaining) < 0 ||
      Number(pool.usesRemaining) > Number(pool.usesMax))
  );
}

function procedureBindingSnapshotsEqual(
  actual: readonly StatBlockProcedureBindingSnapshot[],
  expected: readonly StatBlockProcedureBindingSnapshot[],
): boolean {
  const expectedByRef = new Map(
    expected.map((binding) => [binding.procedureRef, binding]),
  );
  return (
    actual.length === expected.length &&
    new Set(actual.map((binding) => binding.procedureRef)).size ===
      actual.length &&
    actual.every((binding) => {
      const expectedBinding = expectedByRef.get(binding.procedureRef);
      if (
        expectedBinding === undefined ||
        binding.procedureRef !== expectedBinding.procedureRef ||
        binding.procedure.kind !== expectedBinding.procedure.kind ||
        !sameMembers(binding.resourcePoolRefs, expectedBinding.resourcePoolRefs)
      ) {
        return false;
      }
      return persistedValuesEqual(binding.procedure, expectedBinding.procedure);
    })
  );
}

function restoredResourcePoolsInExecutionOrder(
  snapshotPools: readonly StatBlockResourcePoolState[],
  executionPools: readonly StatBlockResourcePoolState[],
): readonly StatBlockResourcePoolState[] {
  const snapshotPoolByRef = new Map(
    snapshotPools.map((pool) => [pool.resourcePoolRef, pool]),
  );
  return executionPools.map((executionPool) => {
    const snapshotPool = snapshotPoolByRef.get(executionPool.resourcePoolRef);
    if (snapshotPool === undefined) {
      throw new Error(
        "Validated execution resources must contain every expected pool.",
      );
    }
    return snapshotPool;
  });
}

function persistedValuesEqual(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) return true;
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      Array.isArray(expected) &&
      actual.length === expected.length &&
      actual.every((value, index) =>
        persistedValuesEqual(value, expected[index]),
      )
    );
  }
  if (
    actual === null ||
    expected === null ||
    typeof actual !== "object" ||
    typeof expected !== "object"
  ) {
    return false;
  }
  // Cast evidence: both values passed the non-null object guards above and are
  // used only for own string-key traversal.
  const actualRecord = actual as Readonly<Record<string, unknown>>;
  const expectedRecord = expected as Readonly<Record<string, unknown>>;
  const actualKeys = Object.keys(actualRecord);
  const expectedKeys = Object.keys(expectedRecord);
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every(
      (key) =>
        Object.hasOwn(expectedRecord, key) &&
        persistedValuesEqual(actualRecord[key], expectedRecord[key]),
    )
  );
}

function nonEmpty<T>(values: readonly T[]): ReadonlyNonEmptyArray<T> | null {
  const [first, ...rest] = values;
  return first === undefined ? null : [first, ...rest];
}

function resourcePoolStructuresEqual(
  actual: readonly StatBlockResourcePoolState[],
  expected: readonly StatBlockResourcePoolState[],
): boolean {
  const expectedByRef = new Map(
    expected.map((pool) => [pool.resourcePoolRef, pool]),
  );
  return (
    actual.length === expected.length &&
    new Set(actual.map((pool) => pool.resourcePoolRef)).size ===
      actual.length &&
    actual.every((pool) => {
      const expectedPool = expectedByRef.get(pool.resourcePoolRef);
      if (
        expectedPool === undefined ||
        pool.resourcePoolRef !== expectedPool.resourcePoolRef ||
        pool.kind !== expectedPool.kind
      ) {
        return false;
      }
      if (
        (pool.kind === "daily" || pool.kind === "legendaryActions") &&
        (expectedPool.kind === "daily" ||
          expectedPool.kind === "legendaryActions")
      ) {
        return pool.usesMax === expectedPool.usesMax;
      }
      return pool.kind !== "recharge" || expectedPool.kind !== "recharge"
        ? true
        : pool.minimumRoll === expectedPool.minimumRoll;
    })
  );
}

function sameMembers<T>(actual: readonly T[], expected: readonly T[]): boolean {
  return (
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    new Set(expected).size === expected.length &&
    actual.every((value) => expected.includes(value))
  );
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

function statBlockAttackSections(
  statBlock: StatBlockRecord,
): readonly [StatBlockAttackSection, readonly CreatureNamedAttackRoll[]][] {
  return [
    ["actions", statBlock.statBlock.actions?.attacks ?? []],
    [
      "legendaryActions",
      statBlock.statBlock.legendaryActions?.actions.attacks ?? [],
    ],
  ];
}

function statBlockLimitedUsePool(
  allocator: ExecutionReferenceAllocator,
  limitedUse: CreatureLimitedUse | undefined,
): StatBlockResourcePoolState | null {
  if (limitedUse === undefined) return null;
  const resourcePoolRef = allocateResourcePoolRef(allocator);
  if (limitedUse.kind === "daily") {
    const uses = resourceCount(limitedUse.uses);
    return {
      resourcePoolRef,
      kind: "daily",
      usesMax: uses,
      usesRemaining: uses,
    };
  }
  if (limitedUse.kind === "recharge") {
    return {
      resourcePoolRef,
      kind: "recharge",
      minimumRoll: limitedUse.minimumRoll,
      available: true,
    };
  }
  return {
    resourcePoolRef,
    kind: "recharge_after_rest",
    available: true,
  };
}

function allocateProcedureRef(
  allocator: ExecutionReferenceAllocator,
): BattleProcedureExecutionRef {
  const ordinal = allocator.procedureOrdinal;
  allocator.procedureOrdinal = NonNegativeInteger(ordinal + 1);
  return battleProcedureExecutionRef(allocator.scopeRef, ordinal);
}

function allocateResourcePoolRef(
  allocator: ExecutionReferenceAllocator,
): BattleResourcePoolExecutionRef {
  const ordinal = allocator.resourcePoolOrdinal;
  allocator.resourcePoolOrdinal = NonNegativeInteger(ordinal + 1);
  return battleResourcePoolExecutionRef(allocator.scopeRef, ordinal);
}

function allocateExecutionScopeRef(
  allocator: ExecutionScopeAllocator,
): BattleStatBlockExecutionScopeRef {
  const ordinal = allocator.scopeOrdinal;
  allocator.scopeOrdinal = battleExecutionScopeOrdinal(ordinal + 1);
  return battleStatBlockExecutionScopeRef(
    allocator.battleId,
    allocator.combatantId,
    ordinal,
  );
}

function executionReferenceAllocator(
  scopeRef: BattleStatBlockExecutionScopeRef,
): ExecutionReferenceAllocator {
  return {
    scopeRef,
    procedureOrdinal: NonNegativeInteger(0),
    resourcePoolOrdinal: NonNegativeInteger(0),
  };
}
