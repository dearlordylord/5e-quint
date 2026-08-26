// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL
import { optionalProperty } from "./optional-property.ts";
import {
  NonNegativeInteger,
  PositiveInteger,
  abilityScoreToMod,
  resourceCount,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import { Brand, Match } from "effect";
import * as Either from "effect/Either";
import type { SupportedStatBlockBonusActionStandardAction } from "./battle-reducer/battle-runtime-protocol.ts";
import {
  type BattleStatBlockProcedureExecutionRef,
  type BattleId,
  BattleResourcePoolExecutionRef,
  BattleStatBlockExecutionScopeRef,
  battleStatBlockProcedureExecutionRef,
  battleResourcePoolExecutionRef,
  battleExecutionScopeOrdinal,
  battleStatBlockExecutionScopeRef,
  battleStatBlockExecutionScopeRefBelongsToBattle,
  battleStatBlockExecutionScopeRefBelongsToCombatant,
  type BattleExecutionScopeOrdinal,
  type CombatantId,
} from "./identity.ts";
import {
  admittedStatBlockExecutionState,
  type BattleStatBlockExecutionSource,
  type BattleStatBlockRuntimeProcedure,
  type BattleStatBlockRuntimeResource,
  type StatBlockExecutionState,
  type StatBlockExecutionAdmission,
  type StatBlockExecutionSnapshot,
  type StatBlockProcedureBinding,
  type StatBlockProcedureBindingSnapshot,
  type StatBlockResourcePoolState,
} from "./stat-block-execution-state.ts";
import type { StatBlockProcedureResourceOrdinal } from "@dnd/surface/surface/types";
export * from "./stat-block-execution-state.ts";

export type StatBlockExecutionRestoreIssue = {
  readonly tag: "invalidStatBlockExecutionSnapshot";
  readonly restorationIndex: NonNegativeInteger;
  readonly scopeRef: BattleStatBlockExecutionScopeRef;
  readonly reason:
    | "invalidResourceCount"
    | "procedureBindingsMismatch"
    | "resourcePoolsMismatch";
};

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
    | AdmittedUnarmedStrikeOccurrence
    | AdmittedMultiattackOccurrence
    | AdmittedBonusActionOccurrence,
    BattleStatBlockProcedureExecutionRef
  >;
};

export type AdmittedAttackOccurrence = {
  readonly kind: "attack";
  readonly procedureOrdinal: Extract<
    BattleStatBlockRuntimeProcedure,
    { readonly kind: "attack" }
  >["procedureOrdinal"];
  readonly section: Extract<
    BattleStatBlockRuntimeProcedure,
    { readonly kind: "attack" }
  >["section"];
  readonly attack: Extract<
    BattleStatBlockRuntimeProcedure,
    { readonly kind: "attack" }
  >["attack"];
  readonly traitAttackRollModes?: Extract<
    BattleStatBlockRuntimeProcedure,
    { readonly kind: "attack" }
  >["traitAttackRollModes"];
  readonly resourceRefs: readonly StatBlockProcedureResourceOrdinal[];
};

export type AdmittedUnarmedStrikeOccurrence = {
  readonly kind: "unarmedStrike";
  readonly attack: Extract<
    BattleStatBlockRuntimeProcedure,
    { readonly kind: "attack" }
  >["attack"];
};

export type AdmittedMultiattackOccurrence = {
  readonly kind: "multiattack";
  readonly procedureOrdinal: Extract<
    BattleStatBlockRuntimeProcedure,
    { readonly kind: "multiattack" }
  >["procedureOrdinal"];
  readonly resourceRefs: readonly StatBlockProcedureResourceOrdinal[];
  readonly dispatches: ReadonlyNonEmptyArray<{
    readonly attack: AdmittedAttackOccurrence;
    readonly procedureOrdinal: Extract<
      BattleStatBlockRuntimeProcedure,
      { readonly kind: "multiattack" }
    >["dispatches"][number]["procedureOrdinal"];
    readonly count: PositiveInteger;
  }>;
};

type AdmittedMultiattackDispatch =
  AdmittedMultiattackOccurrence["dispatches"][number];

export type AdmittedBonusActionOccurrence = {
  readonly kind: "bonusActionOption";
  readonly procedureOrdinal: Extract<
    BattleStatBlockRuntimeProcedure,
    { readonly kind: "bonusActionOption" }
  >["procedureOrdinal"];
  readonly standardActions: ReadonlyNonEmptyArray<SupportedStatBlockBonusActionStandardAction>;
  readonly resourceRefs: readonly StatBlockProcedureResourceOrdinal[];
};

export type AdmittedStatBlockOccurrences = {
  readonly legendaryActionUses?: PositiveInteger;
  readonly attacks: readonly AdmittedAttackOccurrence[];
  readonly unarmedStrike: AdmittedUnarmedStrikeOccurrence;
  readonly multiattacks: readonly AdmittedMultiattackOccurrence[];
  readonly bonusActions: readonly AdmittedBonusActionOccurrence[];
  readonly resources: readonly BattleStatBlockRuntimeResource[];
};

type AdmittedStatBlock = {
  readonly occurrences: AdmittedStatBlockOccurrences;
};

export function statBlockExecutionAdmissionCohort<
  TStatBlock extends BattleStatBlockExecutionSource,
>(
  battleId: BattleId,
  combatantId: CombatantId,
  statBlocks: readonly [TStatBlock],
  startingScopeOrdinal: BattleExecutionScopeOrdinal,
): {
  readonly admissions: readonly [StatBlockExecutionAdmission<TStatBlock>];
  readonly nextScopeOrdinal: BattleExecutionScopeOrdinal;
};

export function statBlockExecutionAdmissionCohort<
  TStatBlock extends BattleStatBlockExecutionSource,
>(
  battleId: BattleId,
  combatantId: CombatantId,
  statBlocks: readonly TStatBlock[],
  startingScopeOrdinal: BattleExecutionScopeOrdinal,
): {
  readonly admissions: readonly StatBlockExecutionAdmission<TStatBlock>[];
  readonly nextScopeOrdinal: BattleExecutionScopeOrdinal;
};

export function statBlockExecutionAdmissionCohort<
  TStatBlock extends BattleStatBlockExecutionSource,
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

function admitStatBlock(
  statBlock: Pick<
    BattleStatBlockExecutionSource,
    | "challengeRating"
    | "statBlock"
    | "procedures"
    | "resources"
    | "legendaryActionUses"
  >,
): AdmittedStatBlock {
  const attacks: AdmittedAttackOccurrence[] = [];
  for (const procedure of statBlock.procedures) {
    if (procedure.kind !== "attack") continue;
    const { section, procedureOrdinal, attack, resourceRefs } = procedure;
    if (
      section === "legendaryActions" &&
      statBlock.legendaryActionUses === undefined
    ) {
      continue;
    }
    const occurrence: AdmittedAttackOccurrence = {
      kind: "attack",
      procedureOrdinal,
      section,
      attack,
      resourceRefs,
      ...optionalProperty(
        "traitAttackRollModes",
        procedure.traitAttackRollModes,
      ),
    };
    attacks.push(occurrence);
  }
  const actionAttacks = attacks.filter(({ section }) => section === "actions");
  const multiattacks: AdmittedMultiattackOccurrence[] = [];
  for (const multiattack of statBlock.procedures) {
    if (multiattack.kind !== "multiattack") continue;
    const dispatches = admittedMultiattackDispatches(
      multiattack,
      actionAttacks,
    );
    if (dispatches === null) continue;
    const occurrence: AdmittedMultiattackOccurrence = {
      kind: "multiattack",
      procedureOrdinal: multiattack.procedureOrdinal,
      resourceRefs: multiattack.resourceRefs,
      dispatches,
    };
    multiattacks.push(occurrence);
  }

  const bonusActions: AdmittedBonusActionOccurrence[] = [];
  for (const option of statBlock.procedures) {
    if (option.kind !== "bonusActionOption") continue;
    const occurrence: AdmittedBonusActionOccurrence = {
      kind: "bonusActionOption",
      procedureOrdinal: option.procedureOrdinal,
      standardActions: option.standardActions,
      resourceRefs: option.resourceRefs,
    };
    bonusActions.push(occurrence);
  }

  return {
    occurrences: {
      ...(statBlock.legendaryActionUses === undefined ||
      !attacks.some((attack) => attack.section === "legendaryActions")
        ? {}
        : {
            legendaryActionUses: PositiveInteger(statBlock.legendaryActionUses),
          }),
      attacks,
      unarmedStrike: admittedUnarmedStrike(statBlock),
      multiattacks,
      bonusActions,
      resources: statBlock.resources ?? [],
    },
  };
}

function admittedUnarmedStrike(
  statBlock: Pick<
    BattleStatBlockExecutionSource,
    "challengeRating" | "statBlock"
  >,
): AdmittedUnarmedStrikeOccurrence {
  const strengthModifier = abilityScoreToMod(
    statBlock.statBlock.abilityScores.str,
  );
  const damage = Math.max(0, 1 + strengthModifier);
  const attack: AdmittedUnarmedStrikeOccurrence["attack"] = {
    attackAbility: "str",
    attackType: "melee",
    attackBonus: {
      kind: "literal",
      value:
        strengthModifier + statBlockProficiencyBonus(statBlock.challengeRating),
    },
    reachFeet: 5,
    onHit: [
      {
        kind: "damage",
        amount: {
          kind: "fixed",
          expr: { dice: 0, dieSize: 4, flat: damage },
          static: damage,
        },
        damageType: "bludgeoning",
      },
    ],
  };
  return {
    kind: "unarmedStrike",
    attack,
  };
}

function statBlockProficiencyBonus(
  challengeRating: BattleStatBlockExecutionSource["challengeRating"],
): number {
  if (challengeRating <= 4) return 2;
  if (challengeRating <= 8) return 3;
  if (challengeRating <= 12) return 4;
  if (challengeRating <= 16) return 5;
  if (challengeRating <= 20) return 6;
  if (challengeRating <= 24) return 7;
  if (challengeRating <= 28) return 8;
  return 9;
}

function admittedMultiattackDispatches(
  multiattack: Extract<
    BattleStatBlockRuntimeProcedure,
    { readonly kind: "multiattack" }
  >,
  actionAttacks: readonly AdmittedAttackOccurrence[],
): AdmittedMultiattackOccurrence["dispatches"] | null {
  const [firstDispatch, ...remainingDispatches] = multiattack.dispatches;
  const firstAdmittedDispatch = admittedMultiattackDispatch(
    firstDispatch,
    actionAttacks,
  );
  if (firstAdmittedDispatch === null) return null;
  const admittedDispatches: [
    AdmittedMultiattackDispatch,
    ...AdmittedMultiattackDispatch[],
  ] = [firstAdmittedDispatch];
  for (const dispatch of remainingDispatches) {
    const admittedDispatch = admittedMultiattackDispatch(
      dispatch,
      actionAttacks,
    );
    if (admittedDispatch === null) return null;
    admittedDispatches.push(admittedDispatch);
  }
  return admittedDispatches;
}

function admittedMultiattackDispatch(
  dispatch: Extract<
    BattleStatBlockRuntimeProcedure,
    { readonly kind: "multiattack" }
  >["dispatches"][number],
  actionAttacks: readonly AdmittedAttackOccurrence[],
): AdmittedMultiattackDispatch | null {
  if (!Number.isInteger(dispatch.count) || dispatch.count < 1) return null;
  const count = PositiveInteger(dispatch.count);
  const candidate = actionAttacks.find(
    (attack) => attack.procedureOrdinal === dispatch.procedureOrdinal,
  );
  if (candidate === undefined) return null;
  return {
    attack: candidate,
    procedureOrdinal: dispatch.procedureOrdinal,
    count,
  };
}

function allocateStatBlockExecution(
  allocator: ExecutionReferenceAllocator,
  admitted: AdmittedStatBlockOccurrences,
): AllocatedStatBlockExecution {
  const procedureBindings: StatBlockProcedureBinding[] = [];
  const resourcePools: StatBlockResourcePoolState[] = [];
  const procedureRefs = new Map<
    | AdmittedAttackOccurrence
    | AdmittedUnarmedStrikeOccurrence
    | AdmittedMultiattackOccurrence
    | AdmittedBonusActionOccurrence,
    BattleStatBlockProcedureExecutionRef
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
    BattleStatBlockProcedureExecutionRef
  >();
  const sharedResourcePools = new Map<
    StatBlockProcedureResourceOrdinal,
    StatBlockResourcePoolState
  >();
  for (const occurrence of admitted.attacks) {
    const resourcePoolRefs = allocateProcedureResourcePools(
      allocator,
      admitted.resources,
      occurrence.resourceRefs,
      sharedResourcePools,
      resourcePools,
    );
    const procedureRef = allocateProcedureRef(allocator);
    procedureRefs.set(occurrence, procedureRef);
    attackProcedureRefs.set(occurrence, procedureRef);
    procedureBindings.push({
      procedureRef,
      procedure: {
        kind: "attack",
        procedureOrdinal: occurrence.procedureOrdinal,
        section: occurrence.section,
        attack: occurrence.attack,
        ...optionalProperty(
          "traitAttackRollModes",
          occurrence.traitAttackRollModes,
        ),
      },
      resourcePoolRefs: [
        ...resourcePoolRefs,
        ...(occurrence.section !== "legendaryActions" ||
        legendaryPool === undefined
          ? []
          : [legendaryPool.resourcePoolRef]),
      ],
    });
  }

  const unarmedStrikeProcedureRef = allocateProcedureRef(allocator);
  procedureRefs.set(admitted.unarmedStrike, unarmedStrikeProcedureRef);
  procedureBindings.push({
    procedureRef: unarmedStrikeProcedureRef,
    procedure: {
      kind: "unarmedStrike",
      section: "actions",
      attack: admitted.unarmedStrike.attack,
    },
    resourcePoolRefs: [],
  });

  for (const multiattack of admitted.multiattacks) {
    const dispatchProcedureRefs = flatMapNonEmpty(
      multiattack.dispatches,
      (dispatch) =>
        repeatedNonEmpty(
          requireAllocatedAttackRef(attackProcedureRefs, dispatch.attack),
          dispatch.count,
        ),
    );
    const procedureRef = allocateProcedureRef(allocator);
    procedureRefs.set(multiattack, procedureRef);
    const resourcePoolRefs = allocateProcedureResourcePools(
      allocator,
      admitted.resources,
      multiattack.resourceRefs,
      sharedResourcePools,
      resourcePools,
    );
    procedureBindings.push({
      procedureRef,
      procedure: {
        kind: "multiattack",
        section: "actions",
        procedureOrdinal: multiattack.procedureOrdinal,
        dispatchProcedureRefs,
      },
      resourcePoolRefs,
    });
  }

  for (const option of admitted.bonusActions) {
    const resourcePoolRefs = allocateProcedureResourcePools(
      allocator,
      admitted.resources,
      option.resourceRefs,
      sharedResourcePools,
      resourcePools,
    );
    const procedureRef = allocateProcedureRef(allocator);
    procedureRefs.set(option, procedureRef);
    procedureBindings.push({
      procedureRef,
      procedure: {
        kind: "bonusActionOption",
        section: "bonusActions",
        procedureOrdinal: option.procedureOrdinal,
        standardActions: option.standardActions,
      },
      resourcePoolRefs,
    });
  }

  return {
    execution: admittedStatBlockExecutionState({
      scopeRef: allocator.scopeRef,
      procedureBindings,
      resourcePools,
    }),
    procedureRefs,
  };
}

export type StatBlockPresentationAllocation = {
  readonly occurrences: AdmittedStatBlockOccurrences;
  readonly procedureRefs: AllocatedStatBlockExecution["procedureRefs"];
};

export function statBlockPresentationAllocation(
  admission: Pick<StatBlockExecutionAdmission, "statBlock" | "execution">,
): StatBlockPresentationAllocation {
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
      "Stat Block admission projection requires the paired execution graph.",
    );
  }
  return {
    occurrences: admitted.occurrences,
    procedureRefs: allocated.procedureRefs,
  };
}

function statBlockProcedureBindingSnapshots(
  execution: StatBlockExecutionState,
): readonly StatBlockProcedureBindingSnapshot[] {
  return execution.procedureBindings;
}

export type StatBlockExecutionRestoration<
  TStatBlock extends BattleStatBlockExecutionSource =
    BattleStatBlockExecutionSource,
> = {
  readonly statBlock: TStatBlock;
  readonly snapshot: StatBlockExecutionSnapshot;
};

export function restoreStatBlockExecutionAdmissions<
  TStatBlock extends BattleStatBlockExecutionSource,
>(
  battleId: BattleId,
  combatantId: CombatantId,
  restorations: readonly [StatBlockExecutionRestoration<TStatBlock>],
): Either.Either<
  readonly [StatBlockExecutionAdmission<TStatBlock>],
  ReadonlyNonEmptyArray<StatBlockExecutionRestoreIssue>
>;

export function restoreStatBlockExecutionAdmissions<
  TStatBlock extends BattleStatBlockExecutionSource,
>(
  battleId: BattleId,
  combatantId: CombatantId,
  restorations: readonly StatBlockExecutionRestoration<TStatBlock>[],
): Either.Either<
  readonly StatBlockExecutionAdmission<TStatBlock>[],
  ReadonlyNonEmptyArray<StatBlockExecutionRestoreIssue>
>;

export function restoreStatBlockExecutionAdmissions<
  TStatBlock extends BattleStatBlockExecutionSource,
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
    const restoredResourcePools = restoredResourcePoolsInExecutionOrder(
      snapshot.resourcePools,
      expected.execution.resourcePools,
    );
    if (restoredResourcePools === null) {
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
        execution: admittedStatBlockExecutionState({
          scopeRef: snapshot.scopeRef,
          procedureBindings: expected.execution.procedureBindings,
          resourcePools: restoredResourcePools,
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
  TStatBlock extends BattleStatBlockExecutionSource,
>(
  battleId: BattleId,
  combatantId: CombatantId,
  statBlock: TStatBlock,
  snapshot: StatBlockExecutionSnapshot,
): Either.Either<
  StatBlockExecutionAdmission<TStatBlock>,
  StatBlockExecutionRestoreIssue
> {
  const restoration: readonly [StatBlockExecutionRestoration<TStatBlock>] = [
    { statBlock, snapshot },
  ];
  const restored = restoreStatBlockExecutionAdmissions(
    battleId,
    combatantId,
    restoration,
  );
  if (Either.isLeft(restored)) return Either.left(restored.left[0]);
  return Either.right(restored.right[0]);
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

function requireAllocatedAttackRef(
  refs: ReadonlyMap<
    AdmittedAttackOccurrence,
    BattleStatBlockProcedureExecutionRef
  >,
  attack: AdmittedAttackOccurrence,
): BattleStatBlockProcedureExecutionRef {
  const procedureRef = refs.get(attack);
  if (procedureRef === undefined) {
    throw new Error("Every admitted multiattack dispatch must be allocated.");
  }
  return procedureRef;
}

function restoredResourcePoolsInExecutionOrder(
  snapshotPools: readonly StatBlockResourcePoolState[],
  executionPools: readonly StatBlockResourcePoolState[],
): readonly StatBlockResourcePoolState[] | null {
  if (
    snapshotPools.length !== executionPools.length ||
    new Set(snapshotPools.map((pool) => pool.resourcePoolRef)).size !==
      snapshotPools.length
  ) {
    return null;
  }
  const snapshotPoolByRef = new Map(
    snapshotPools.map((pool) => [pool.resourcePoolRef, pool]),
  );
  const restored: StatBlockResourcePoolState[] = [];
  for (const executionPool of executionPools) {
    const snapshotPool = snapshotPoolByRef.get(executionPool.resourcePoolRef);
    if (
      snapshotPool === undefined ||
      !resourcePoolStructuresMatch(snapshotPool, executionPool)
    ) {
      return null;
    }
    restored.push(snapshotPool);
  }
  return restored;
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

function flatMapNonEmpty<T, U>(
  values: ReadonlyNonEmptyArray<T>,
  project: (value: T) => ReadonlyNonEmptyArray<U>,
): ReadonlyNonEmptyArray<U> {
  const [first, ...rest] = values;
  return [...project(first), ...rest.flatMap(project)];
}

function repeatedNonEmpty<T>(
  value: T,
  count: PositiveInteger,
): ReadonlyNonEmptyArray<T> {
  return [value, ...Array.from({ length: count - 1 }, () => value)];
}

function resourcePoolStructuresMatch(
  actual: StatBlockResourcePoolState,
  expected: StatBlockResourcePoolState,
): boolean {
  if (actual.resourcePoolRef !== expected.resourcePoolRef) return false;
  return Match.value(actual).pipe(
    Match.discriminatorsExhaustive("kind")({
      daily: (pool) =>
        expected.kind === "daily" &&
        pool.ownership === expected.ownership &&
        pool.usesMax === expected.usesMax,
      recharge: (pool) =>
        expected.kind === "recharge" &&
        pool.ownership === expected.ownership &&
        pool.minimumRoll === expected.minimumRoll,
      recharge_after_rest: (pool) =>
        expected.kind === "recharge_after_rest" &&
        pool.ownership === expected.ownership,
      legendaryActions: (pool) =>
        expected.kind === "legendaryActions" &&
        pool.usesMax === expected.usesMax,
    }),
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

function allocateProcedureResourcePools(
  allocator: ExecutionReferenceAllocator,
  resources: readonly BattleStatBlockRuntimeResource[],
  resourceRefs: readonly StatBlockProcedureResourceOrdinal[],
  sharedResourcePools: Map<
    StatBlockProcedureResourceOrdinal,
    StatBlockResourcePoolState
  >,
  resourcePools: StatBlockResourcePoolState[],
): readonly BattleResourcePoolExecutionRef[] {
  const refs: BattleResourcePoolExecutionRef[] = [];
  for (const resourceOrdinal of new Set(resourceRefs)) {
    const declaration = resources.find(
      (resource) => resource.ordinal === resourceOrdinal,
    );
    if (declaration === undefined) continue;
    if (declaration.ownership === "shared") {
      const existing = sharedResourcePools.get(resourceOrdinal);
      if (existing !== undefined) {
        refs.push(existing.resourcePoolRef);
        continue;
      }
    }
    const pool = resourcePoolFromDeclaration(allocator, declaration);
    resourcePools.push(pool);
    if (declaration.ownership === "shared") {
      sharedResourcePools.set(resourceOrdinal, pool);
    }
    refs.push(pool.resourcePoolRef);
  }
  return refs;
}

function resourcePoolFromDeclaration(
  allocator: ExecutionReferenceAllocator,
  declaration: BattleStatBlockRuntimeResource,
): StatBlockResourcePoolState {
  const resourcePoolRef = allocateResourcePoolRef(allocator);
  if (declaration.limit.kind === "daily") {
    const uses = resourceCount(declaration.limit.uses);
    return {
      resourcePoolRef,
      kind: "daily",
      ownership: declaration.ownership,
      usesMax: uses,
      usesRemaining: uses,
    };
  }
  if (declaration.limit.kind === "recharge") {
    return {
      resourcePoolRef,
      kind: "recharge",
      ownership: declaration.ownership,
      minimumRoll: declaration.limit.minimumRoll,
      available: true,
    };
  }
  return {
    resourcePoolRef,
    kind: "recharge_after_rest",
    ownership: declaration.ownership,
    available: true,
  };
}

function allocateProcedureRef(
  allocator: ExecutionReferenceAllocator,
): BattleStatBlockProcedureExecutionRef {
  const ordinal = allocator.procedureOrdinal;
  allocator.procedureOrdinal = NonNegativeInteger(ordinal + 1);
  return battleStatBlockProcedureExecutionRef(allocator.scopeRef, ordinal);
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
