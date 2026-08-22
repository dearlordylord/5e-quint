// Spell cast resource spending and concentration setup shared by spell
// resolution modules. Extracted from spells-resolve.ts to keep procedure
// resolver modules from depending on the monolithic spell dispatcher.
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL_ACCESS.MAGIC_INITIATE_CASTING
// UNIT-PROFILE-COVERAGE: runtime-owner battle.spell-access-magic-initiate-casting

import {
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { Either } from "effect";
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
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";
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
}): Either.Either<BattleState, string> {
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
  const actionCost = spellCastActionCost(input);
  const spent = spendSpellCastAction(
    spellCastState.currentTurnResources,
    actionCost,
  );
  if (Either.isLeft(spent)) {
    return invalidResult(input.errorState, "staleSubject", spent.left);
  }
  const shouldStartConcentration =
    input.startConcentration ?? spellRequiresConcentration(input.invocation);
  if (input.invocation.resource.tag === "none") {
    const afterPriorConcentration = spellRequiresConcentration(input.invocation)
      ? breakBattleConcentration(spellCastState, input.actorId)
      : spellCastState;
    const resourced = {
      ...afterPriorConcentration,
      currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
        markInvocationLevelOnePlusSpellCastThisTurn(
          spent.right,
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
  if (input.invocation.resource.tag === "spellAccessFreeCast") {
    const freeCast = spendSpellAccessFreeCastResource(
      spellCastState,
      input.actorId,
      input.invocation.resource.resourcePoolRef,
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
          spent.right,
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
    spent.right,
    input.actorId,
  );
  if (Either.isLeft(slotTurnResources)) {
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
    input.invocation.resource.slotLevel,
  );
  const resourced = {
    ...slotted,
    currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
      slotTurnResources.right,
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

function spendSpellCastAction(
  resources: BattleTurnResources,
  actionCost: "magicAction" | "bonusAction",
): Either.Either<BattleTurnResources, string> {
  const spent =
    actionCost === "bonusAction"
      ? spendActivationResource(resources, { kind: "bonusAction" })
      : spendAction(resources, "magic");
  return Either.isLeft(spent)
    ? Either.left(
        actionCost === "bonusAction"
          ? "Bonus Action spell is no longer available for the current actor."
          : "Magic action is no longer available for the current actor.",
      )
    : Either.right(spent.right);
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
  if (Either.isLeft(metamagicSpend)) {
    return invalidResult(input.errorState, "staleSubject", metamagicSpend.left);
  }
  const nextState = input.shouldStartConcentration
    ? startSpellEffectConcentration(
        metamagicSpend.right,
        input.actorId,
        input.invocation,
      )
    : metamagicSpend.right;
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
}): Either.Either<BattleState, string> {
  const actor = input.state.combatants.get(input.actorId);
  if (actor?.origin.kind !== "character") {
    return Either.left(
      "Spell Access free cast is no longer available for the interrupted spell.",
    );
  }
  const resource = actor.origin.resources.find(
    (candidate) =>
      candidate.resourcePoolRef === input.resourcePoolRef &&
      resourceHasUsesRemaining(candidate),
  );
  if (resource === undefined) {
    return Either.left(
      "Spell Access free cast is no longer available for the interrupted spell.",
    );
  }
  return Either.right({
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
