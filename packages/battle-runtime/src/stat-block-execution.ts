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
import type {
  CreatureActions,
  CreatureLimitedUse,
  CreatureNamedActionOption,
  CreatureNamedAttackRoll,
  CreatureNamedMultiattack,
} from "@dnd/surface/surface/types";
import type { StatBlockAttackSection } from "./battle-action-options.ts";
import {
  SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS,
  type SupportedStatBlockBonusActionStandardAction,
} from "./battle-reducer/battle-runtime-protocol.ts";
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
  creatureNamedAttackRollIsSupported,
  supportedStatBlockTraitAttackRollModes,
} from "./statblock-action-execution-support.ts";

import {
  admittedStatBlockExecutionState,
  type BattleStatBlockExecutionSource,
  type StatBlockActionProjectionSection,
  type StatBlockActionProjectionShape,
  type StatBlockProjectionIssue,
  type StatBlockAttackProcedure,
  type StatBlockExecutionState,
  type StatBlockExecutionAdmission,
  type StatBlockExecutionSnapshot,
  type StatBlockProcedureBinding,
  type StatBlockProcedureBindingSnapshot,
  type StatBlockResourcePoolState,
} from "./stat-block-execution-state.ts";
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
  readonly source: CreatureNamedAttackRoll;
  readonly section: StatBlockAttackProcedure["section"];
  readonly attack: StatBlockAttackProcedure["attack"];
  readonly traitAttackRollModes?: StatBlockAttackProcedure["traitAttackRollModes"];
  readonly limitedUse?: CreatureLimitedUse;
};

export type AdmittedUnarmedStrikeOccurrence = {
  readonly kind: "unarmedStrike";
  readonly attack: StatBlockAttackProcedure["attack"];
};

export type AdmittedMultiattackOccurrence = {
  readonly kind: "multiattack";
  readonly source: CreatureNamedMultiattack;
  readonly dispatches: ReadonlyNonEmptyArray<{
    readonly attack: AdmittedAttackOccurrence;
    readonly count: PositiveInteger;
  }>;
};

type AdmittedMultiattackDispatch =
  AdmittedMultiattackOccurrence["dispatches"][number];

export type AdmittedBonusActionOccurrence = {
  readonly kind: "bonusActionOption";
  readonly source: CreatureNamedActionOption;
  readonly standardActions: ReadonlyNonEmptyArray<SupportedStatBlockBonusActionStandardAction>;
  readonly limitedUse?: CreatureLimitedUse;
};

export type AdmittedStatBlockOccurrences = {
  readonly legendaryActionUses?: PositiveInteger;
  readonly attacks: readonly AdmittedAttackOccurrence[];
  readonly unarmedStrike: AdmittedUnarmedStrikeOccurrence;
  readonly multiattacks: readonly AdmittedMultiattackOccurrence[];
  readonly bonusActions: readonly AdmittedBonusActionOccurrence[];
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
    "challengeRating" | "statBlock"
  >,
): AdmittedStatBlock {
  const attacks: AdmittedAttackOccurrence[] = [];
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
        name: _name,
        description: _description,
        limitedUse,
        ...attackMechanics
      } = attack;
      const occurrence: AdmittedAttackOccurrence = {
        kind: "attack",
        source: attack,
        section,
        attack: attackMechanics,
        ...optionalProperty("traitAttackRollModes", traitAttackRollModes),
        ...optionalProperty("limitedUse", limitedUse),
      };
      attacks.push(occurrence);
    }
  }
  const actionAttacks = attacks.filter(({ section }) => section === "actions");
  const multiattacks: AdmittedMultiattackOccurrence[] = [];
  for (const multiattack of statBlock.statBlock.actions?.multiattacks ?? []) {
    const dispatches = admittedMultiattackDispatches(
      multiattack,
      actionAttacks,
    );
    if (dispatches === null) continue;
    const occurrence: AdmittedMultiattackOccurrence = {
      kind: "multiattack",
      source: multiattack,
      dispatches,
    };
    multiattacks.push(occurrence);
  }

  const bonusActions: AdmittedBonusActionOccurrence[] = [];
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
    const admittedStandardActions: ReadonlyNonEmptyArray<SupportedStatBlockBonusActionStandardAction> =
      [standardActions[0], ...standardActions.slice(1)];
    const occurrence: AdmittedBonusActionOccurrence = {
      kind: "bonusActionOption",
      source: option,
      standardActions: admittedStandardActions,
      ...optionalProperty("limitedUse", option.limitedUse),
    };
    bonusActions.push(occurrence);
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
      unarmedStrike: admittedUnarmedStrike(statBlock),
      multiattacks,
      bonusActions,
    },
  };
}

export function statBlockProjectionIssues(
  statBlock: Pick<
    BattleStatBlockExecutionSource,
    "challengeRating" | "statBlock"
  >,
): readonly StatBlockProjectionIssue[] {
  const admitted = admitStatBlock(statBlock).occurrences;
  const admittedAttacks = new Set(
    admitted.attacks.map((occurrence) => occurrence.source),
  );
  const admittedMultiattacks = new Set(
    admitted.multiattacks.map((occurrence) => occurrence.source),
  );
  const admittedBonusActions = new Set(
    admitted.bonusActions.map((occurrence) => occurrence.source),
  );
  const issues: StatBlockProjectionIssue[] = [];

  for (const trait of statBlock.statBlock.traits ?? []) {
    if (trait.effect === undefined) {
      issues.push({
        tag: "statBlockProjectionIssue",
        source: {
          kind: "trait",
          nonExecutableReason: "textOnlyTrait",
        },
      });
      continue;
    }
    if (supportedStatBlockTraitAttackRollModes([trait]) === undefined) {
      issues.push({
        tag: "statBlockProjectionIssue",
        source: {
          kind: "trait",
          nonExecutableReason: "unsupportedTraitEffect",
        },
      });
    }
  }

  appendActionProjectionIssues(
    issues,
    "actions",
    statBlock.statBlock.actions,
    admittedAttacks,
    admittedMultiattacks,
    new Set(),
  );
  appendActionProjectionIssues(
    issues,
    "bonusActions",
    statBlock.statBlock.bonusActions,
    admittedAttacks,
    new Set(),
    admittedBonusActions,
  );
  appendActionProjectionIssues(
    issues,
    "reactions",
    statBlock.statBlock.reactions,
    new Set(),
    new Set(),
    new Set(),
  );
  appendActionProjectionIssues(
    issues,
    "legendaryActions",
    statBlock.statBlock.legendaryActions?.actions,
    admittedAttacks,
    new Set(),
    new Set(),
  );
  return issues;
}

function appendActionProjectionIssues(
  issues: StatBlockProjectionIssue[],
  section: StatBlockActionProjectionSection,
  actions: CreatureActions | undefined,
  admittedAttacks: ReadonlySet<CreatureNamedAttackRoll>,
  admittedMultiattacks: ReadonlySet<CreatureNamedMultiattack>,
  admittedBonusActions: ReadonlySet<CreatureNamedActionOption>,
): void {
  if (actions === undefined) return;
  for (const attack of actions.attacks ?? []) {
    if (!admittedAttacks.has(attack)) {
      issues.push(actionProjectionIssue(section, "attack"));
    }
  }
  for (const multiattack of actions.multiattacks ?? []) {
    if (!admittedMultiattacks.has(multiattack)) {
      issues.push(actionProjectionIssue(section, "multiattack"));
    }
  }
  for (const save of actions.saves ?? []) {
    void save;
    issues.push(actionProjectionIssue(section, "save"));
  }
  for (const support of actions.supports ?? []) {
    void support;
    issues.push(actionProjectionIssue(section, "support"));
  }
  for (const actionOption of actions.actionOptions ?? []) {
    if (!admittedBonusActions.has(actionOption)) {
      issues.push(actionProjectionIssue(section, "actionOption"));
    }
  }
  for (const special of actions.specials ?? []) {
    void special;
    issues.push(actionProjectionIssue(section, "special"));
  }
}

function actionProjectionIssue(
  section: StatBlockActionProjectionSection,
  shape: StatBlockActionProjectionShape,
): StatBlockProjectionIssue {
  return {
    tag: "statBlockProjectionIssue",
    source: {
      kind: "action",
      section,
      shape,
      nonExecutableReason: "unsupportedActionShape",
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
  const attack: StatBlockAttackProcedure["attack"] = {
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
  multiattack: CreatureNamedMultiattack,
  actionAttacks: readonly AdmittedAttackOccurrence[],
): AdmittedMultiattackOccurrence["dispatches"] | null {
  const [firstDispatch, ...remainingDispatches] = multiattack.dispatches;
  const limitedUseDispatchCountByAttack = new Map<
    AdmittedAttackOccurrence,
    number
  >();
  const firstAdmittedDispatch = admittedMultiattackDispatch(
    firstDispatch,
    actionAttacks,
    limitedUseDispatchCountByAttack,
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
      limitedUseDispatchCountByAttack,
    );
    if (admittedDispatch === null) return null;
    admittedDispatches.push(admittedDispatch);
  }
  return admittedDispatches;
}

function admittedMultiattackDispatch(
  dispatch: CreatureNamedMultiattack["dispatches"][number],
  actionAttacks: readonly AdmittedAttackOccurrence[],
  limitedUseDispatchCountByAttack: Map<AdmittedAttackOccurrence, number>,
): AdmittedMultiattackDispatch | null {
  const count = validMultiattackDispatchCount(dispatch);
  if (count === null) return null;
  const candidates = actionAttacks.filter(
    (attack) => attack.source.name === dispatch.name,
  );
  const [candidate] = candidates;
  if (candidate === undefined || candidates.length !== 1) return null;
  if (
    !recordAdmittedLimitedUseDispatch(
      candidate,
      count,
      limitedUseDispatchCountByAttack,
    )
  )
    return null;
  return {
    attack: candidate,
    count: PositiveInteger(count),
  };
}

function validMultiattackDispatchCount(
  dispatch: CreatureNamedMultiattack["dispatches"][number],
): number | null {
  if (
    dispatch.count.kind !== "literal" ||
    dispatch.count.value < 1 ||
    !Number.isInteger(dispatch.count.value)
  ) {
    return null;
  }
  return dispatch.count.value;
}

function recordAdmittedLimitedUseDispatch(
  candidate: AdmittedAttackOccurrence,
  count: number,
  limitedUseDispatchCountByAttack: Map<AdmittedAttackOccurrence, number>,
): boolean {
  if (candidate.limitedUse === undefined) return true;
  const totalDispatchCount =
    (limitedUseDispatchCountByAttack.get(candidate) ?? 0) + count;
  if (totalDispatchCount > 1) return false;
  limitedUseDispatchCountByAttack.set(candidate, totalDispatchCount);
  return true;
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
        ...optionalProperty(
          "traitAttackRollModes",
          occurrence.traitAttackRollModes,
        ),
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

  const unarmedStrikeProcedureRef = allocateProcedureRef(allocator);
  procedureRefs.set(admitted.unarmedStrike, unarmedStrikeProcedureRef);
  procedureBindings.push({
    procedureRef: unarmedStrikeProcedureRef,
    procedure: {
      kind: "attack",
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
        expected.kind === "daily" && pool.usesMax === expected.usesMax,
      recharge: (pool) =>
        expected.kind === "recharge" &&
        pool.minimumRoll === expected.minimumRoll,
      recharge_after_rest: () => expected.kind === "recharge_after_rest",
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

function statBlockAttackSections(
  statBlock: Pick<BattleStatBlockExecutionSource, "statBlock">,
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
