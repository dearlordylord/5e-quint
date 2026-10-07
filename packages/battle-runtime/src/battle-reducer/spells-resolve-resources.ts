import {
  completeLongCastingSpellState,
  longCastingCompletionResource,
  statBlockLongCastingTime,
} from "./long-casting-lifecycle.ts";
import { Option } from "effect";
import { spendStatBlockSpellcastingPool } from "../stat-block-execution-state.ts";
import type { StatBlockSpellInvocationResource } from "../procedure-execution/spell-invocation-vocabulary.ts";
// Spell cast resource spending and concentration setup shared by spell
// resolution modules. Extracted from spells-resolve.ts to keep procedure
// resolver modules from depending on the monolithic spell dispatcher.
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL_ACCESS.MAGIC_INITIATE_CASTING
// UNIT-PROFILE-COVERAGE: runtime-owner battle.spell-access-magic-initiate-casting

import { spendSpellCastAction } from "./spellcasting-action-cost.ts";
import { Result } from "effect";
import type {
  BattleResolutionResult,
  BattleExecutableSpellInvocation,
  BattleSpellCastingTimeResource,
  BattleState,
  BattleTurnResources,
} from "../battle-state-execution.ts";
import type { RuntimeSpellProcedureExecution } from "../character-execution.ts";
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
  type CharacterBattleMetamagicOptionFact,
} from "../character-battle-resource-execution.ts";
import type {
  BattleResourcePoolExecutionRef,
  CombatantId,
} from "../identity.ts";
import { breakBattleConcentration } from "./damage-apply.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import {
  metamagicApplicationsIncludeQuickened,
  spendSpellMetamagicSorceryPoints,
} from "./metamagic.ts";
import { invalidResult } from "./result-helpers.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./targeting-save-interdiction.ts";
import { expendSpellSlot } from "./spell-effects.ts";
import {
  markInvocationLevelOnePlusSpellCastThisTurn,
  markQuickenedLevelOnePlusSpellCastThisTurn,
  markSpellSlotExpendedThisTurn,
} from "./spell-turn-resources.ts";
import { clearPendingAttackRollMissToHitReplacementSelection } from "./statblock-attacks.ts";

export type SpellCastResourceSpendResult =
  | { readonly tag: "resolved"; readonly state: BattleState }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }>;

function metamagicApplicationsOrEmpty(
  applications: readonly CharacterBattleMetamagicOptionFact[] | undefined,
): readonly CharacterBattleMetamagicOptionFact[] {
  return applications ?? [];
}

export function spendSpellCastMetamagicResources(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly applications: readonly CharacterBattleMetamagicOptionFact[];
}): Result.Result<BattleState, string> {
  const stateWithQuickenedCommitment = {
    ...input.state,
    currentTurnResources: markQuickenedLevelOnePlusSpellCastForApplications(
      input.state.currentTurnResources,
      input.actorId,
      input.applications,
    ),
  };
  return spendSpellMetamagicSorceryPoints({
    state: stateWithQuickenedCommitment,
    actorId: input.actorId,
    applications: input.applications,
  });
}

export function spellCastActionCost(input: {
  readonly invocation: RuntimeSpellProcedureExecution;
  readonly actionCostOverride?: "magicAction" | "bonusAction" | undefined;
}): "magicAction" | "bonusAction" {
  return (
    input.actionCostOverride ??
    ("actionCost" in input.invocation
      ? input.invocation.actionCost
      : "magicAction")
  );
}

export function spellCastingTimeResourceForSpellCast(input: {
  readonly invocation: RuntimeSpellProcedureExecution;
  readonly actionCostOverride?: "magicAction" | "bonusAction" | undefined;
}): BattleSpellCastingTimeResource {
  return { kind: spellCastActionCost(input) };
}

export function spendSpellCastResources(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly errorState: BattleState;
  readonly startConcentration?: boolean;
  readonly skipTargetActionSpellCastEarlyEnd?: boolean;
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const metamagicApplications = metamagicApplicationsOrEmpty(
    input.metamagicApplications,
  );
  const spellCastState =
    input.skipTargetActionSpellCastEarlyEnd === true
      ? input.state
      : battleStateAfterTargetActionEarlyEndForActor(
          input.state,
          input.actorId,
        );
  const completionResource = longCastingCompletionResource(
    input.state,
    input.actorId,
    input.invocation,
  );
  if (
    Option.isSome(statBlockLongCastingTime(input.invocation)) &&
    Option.isNone(completionResource)
  )
    return invalidResult(
      input.errorState,
      "staleSubject",
      "The Stat Block spell has not completed its required casting time.",
    );
  const actionCost = spellCastActionCost(input);
  const spent = Option.isSome(completionResource)
    ? Result.succeed(spellCastState.currentTurnResources)
    : spendSpellCastAction(spellCastState.currentTurnResources, actionCost);
  if (Result.isFailure(spent)) {
    return invalidResult(input.errorState, "staleSubject", spent.failure);
  }
  const shouldStartConcentration =
    input.startConcentration ?? spellRequiresConcentration(input.invocation);
  const resource = input.invocation.resource;
  if (
    resource.tag === "statBlockAtWill" ||
    resource.tag === "statBlockLimited"
  ) {
    const paid = spendStatBlockSpellInvocationResource(
      spellCastState,
      input.actorId,
      resource,
      input.errorState,
    );
    if (paid.tag === "invalid") return paid;
    const afterPriorConcentration = spellRequiresConcentration(input.invocation)
      ? breakBattleConcentration(paid.state, input.actorId)
      : paid.state;
    return finishSpellCastResourceSpend({
      state: {
        ...afterPriorConcentration,
        currentTurnResources: markInvocationLevelOnePlusSpellCastThisTurn(
          spent.success,
          input.actorId,
          input.invocation,
        ),
      },
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.errorState,
      applications: metamagicApplications,
      shouldStartConcentration,
    });
  }
  if (resource.tag === "none") {
    const afterPriorConcentration = spellRequiresConcentration(input.invocation)
      ? breakBattleConcentration(spellCastState, input.actorId)
      : spellCastState;
    const resourced = {
      ...afterPriorConcentration,
      currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
        markInvocationLevelOnePlusSpellCastThisTurn(
          spent.success,
          input.actorId,
          input.invocation,
        ),
        input.actorId,
      ),
    };
    return finishSpellCastResourceSpend({
      state: resourced,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.errorState,
      applications: metamagicApplications,
      shouldStartConcentration,
    });
  }
  if (resource.tag === "spellAccessFreeCast") {
    const freeCast = spendSpellAccessFreeCastResource(
      spellCastState,
      input.actorId,
      resource.resourcePoolRef,
      input.invocation,
      input.errorState,
    );
    if (freeCast.tag === "invalid") return freeCast;
    const afterPriorConcentration = spellRequiresConcentration(input.invocation)
      ? breakBattleConcentration(freeCast.state, input.actorId)
      : freeCast.state;
    const resourced = {
      ...afterPriorConcentration,
      currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
        markInvocationLevelOnePlusSpellCastThisTurn(
          spent.success,
          input.actorId,
          input.invocation,
        ),
        input.actorId,
      ),
    };
    return finishSpellCastResourceSpend({
      state: resourced,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.errorState,
      applications: metamagicApplications,
      shouldStartConcentration,
    });
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(
    spent.success,
    input.actorId,
  );
  if (Result.isFailure(slotTurnResources)) {
    return invalidResult(
      input.errorState,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const afterPriorConcentration = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(spellCastState, input.actorId)
    : spellCastState;
  const slotted = expendSpellSlot(
    afterPriorConcentration,
    input.actorId,
    resource.slotLevel,
  );
  const resourced = {
    ...slotted,
    currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
      slotTurnResources.success,
      input.actorId,
    ),
  };
  return finishSpellCastResourceSpend({
    state: resourced,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.errorState,
    applications: metamagicApplications,
    shouldStartConcentration,
  });
}

function finishSpellCastResourceSpend(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly errorState: BattleState;
  readonly applications: readonly CharacterBattleMetamagicOptionFact[];
  readonly shouldStartConcentration: boolean;
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const metamagicSpend = spendSpellCastMetamagicResources(input);
  if (Result.isFailure(metamagicSpend)) {
    return invalidResult(
      input.errorState,
      "staleSubject",
      metamagicSpend.failure,
    );
  }
  const castingCompletedState = completeLongCastingSpellState(
    metamagicSpend.success,
    input.actorId,
    input.invocation,
  );
  const nextState = input.shouldStartConcentration
    ? startSpellEffectConcentration(
        castingCompletedState,
        input.actorId,
        input.invocation,
      )
    : castingCompletedState;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function markQuickenedLevelOnePlusSpellCastForApplications(
  resources: BattleTurnResources,
  actorId: CombatantId,
  applications: readonly CharacterBattleMetamagicOptionFact[],
): BattleTurnResources {
  return metamagicApplicationsIncludeQuickened(applications)
    ? markQuickenedLevelOnePlusSpellCastThisTurn(resources, actorId)
    : resources;
}

export function spendSpellAccessFreeCastResource(
  state: BattleState,
  actorId: CombatantId,
  resourcePoolRef: BattleResourcePoolExecutionRef,
  invocation: RuntimeSpellProcedureExecution,
  errorState: BattleState,
): SpellCastResourceSpendResult {
  const spellCastState = battleStateAfterTargetActionEarlyEndForActor(
    state,
    actorId,
  );
  const actor = spellCastState.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return invalidResult(
      errorState,
      "staleSubject",
      "Spell Access free cast is no longer available for the current actor.",
    );
  }
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.resourcePoolRef === resourcePoolRef &&
      resourceHasUsesRemaining(candidate),
  );
  if (resource === undefined) {
    return invalidResult(
      errorState,
      "staleSubject",
      "Spell Access free cast is no longer available for the current actor.",
    );
  }
  return {
    tag: "resolved",
    state: {
      ...spellCastState,
      combatants: new Map(spellCastState.combatants).set(actorId, {
        ...actor,
        origin: {
          ...actor.origin,
          resources: actor.origin.resources.map((candidate) =>
            candidate.resourcePoolRef === resourcePoolRef &&
            resourceHasUsesRemaining(candidate)
              ? spendCharacterResourceUse(candidate)
              : candidate,
          ),
        },
      }),
      currentTurnResources: markInvocationLevelOnePlusSpellCastThisTurn(
        spellCastState.currentTurnResources,
        actorId,
        invocation,
      ),
    },
  };
}

export function commitSpellAccessFreeCastResourceUse(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly resourcePoolRef: BattleResourcePoolExecutionRef;
}): Result.Result<BattleState, string> {
  const actor = input.state.combatants.get(input.actorId);
  if (actor?.origin.kind !== "character") {
    return Result.fail(
      "Spell Access free cast is no longer available for the interrupted spell.",
    );
  }
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.resourcePoolRef === input.resourcePoolRef &&
      resourceHasUsesRemaining(candidate),
  );
  if (resource === undefined) {
    return Result.fail(
      "Spell Access free cast is no longer available for the interrupted spell.",
    );
  }
  return Result.succeed({
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.actorId, {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((candidate) =>
          candidate.resourcePoolRef === input.resourcePoolRef &&
          resourceHasUsesRemaining(candidate)
            ? spendCharacterResourceUse(candidate)
            : candidate,
        ),
      },
    }),
  });
}

export function spellRequiresConcentration(
  invocation: RuntimeSpellProcedureExecution,
): boolean {
  return invocation.spellRuleFacts.duration.kind === "concentration";
}

export function startSpellEffectConcentration(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      concentration: {
        sourceProcedureRef: invocation.sourceProcedureRef,
        effectKind: "spellEffect",
      },
    }),
  };
}

export function spendStatBlockSpellInvocationResource(
  state: BattleState,
  actorId: CombatantId,
  resource: StatBlockSpellInvocationResource,
  errorState: BattleState,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "statBlock")
    return invalidResult(
      errorState,
      "staleSubject",
      "Stat Block spell caster is unavailable.",
    );
  if (resource.tag === "statBlockAtWill")
    return { tag: "resolved", state, snapshot: snapshotBattle(state) };
  const spent = spendStatBlockSpellcastingPool(
    actor.origin.execution,
    resource.resourcePoolRef,
  );
  if (Result.isFailure(spent))
    return invalidResult(
      errorState,
      "staleSubject",
      "Stat Block spell invocation resource is unavailable.",
    );
  const nextState = {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      origin: { ...actor.origin, execution: spent.success },
    }),
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}
