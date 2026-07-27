import { canSpendBonusAction } from "@dnd/shared-algebras/action-economy-algebra";
import { Match } from "effect";
import * as Either from "effect/Either";
import { type BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import { type BattleSubject } from "../battle-subjects.ts";
import {
  characterSpellProcedure,
  type BattleSpellProcedureExecution,
} from "../character-execution-queries.ts";
import { CombatantId } from "../identity.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import {
  combatantCanTakeActions,
  combatantCanTakeReactions,
  isCharacterBattleCreatureState,
} from "./creature-state-execution.ts";
import { breakBattleConcentration } from "./damage-apply.ts";
import {
  meleeWeaponOrUnarmedStrikeSelectionsForReactor,
  opportunityAttackSelectionForReactor,
} from "./movement-speed.ts";
import { reactionRollOrDamageReductionChoices } from "./reaction-modifiers.ts";
import { triggeredReactionSpellChoices } from "./reaction-triggered-spells.ts";
import { invalidResult } from "./result-helpers.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";
import { combatantInsideActiveAntimagicFieldAura } from "./antimagic-field-action-interdiction.ts";
import { afterHitSaveGatedConditionSavingThrowOutcomeHole } from "./after-hit-save-gated-condition-hole.ts";
import { isAttackHitBonusActionSpellInvocation } from "./spell-interrupt-procedure-kinds.ts";
import {
  claimPendingSpellSlotUseThisTurn,
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
} from "./spell-turn-resources.ts";
import { activeOngoingFeaturesPreventSpellInvocation } from "./spells-invocation-guards.ts";
import {
  readiedMovementInitialHoles,
  readiedSpellInitialHoles,
} from "./readied-initial-holes.ts";
import { interruptDecisionHole, snapshotBattle } from "./battle-snapshot.ts";
export {
  battleSnapshotProjection,
  battleTurnSnapshot,
  currentInterruptCheckpoint,
  currentInterruptFrame,
  interruptDecisionHole,
  interruptTriggerLabel,
  pendingInterruptSnapshot,
  snapshotBattle,
  unofferedEligibleResponders,
} from "./battle-snapshot.ts";
import type {
  BattleAfterDamageEvent,
  BattleAttackDamageContinuationConcentrationFrame,
  BattleAttackDamageContinuationWithoutConcentration,
  BattleAttackHitTriggerKind,
  BattleDroppedObjectOutcome,
  BattleCreatureState,
  BattleInterruptedProcedure,
  BattleHole,
  BattleObjectDamageOutcome,
  BattleObjectIgnitionOutcome,
  BattleOpportunityAttackThreat,
  BattleInterruptCheckpoint,
  BattleInterruptCheckpointInput,
  BattleInterruptCheckpointFrame,
  BattleInterruptProcedureChoice,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";

export function openBattleInterruptWindow(input: {
  readonly state: BattleState;
  readonly frame: BattleInterruptCheckpoint;
}): BattleState {
  return {
    ...input.state,
    interruptStack: [
      ...input.state.interruptStack,
      interruptCheckpointFrame(input.frame),
    ],
  };
}

export function interruptCheckpointFrame(
  frame: BattleInterruptCheckpoint,
): BattleInterruptCheckpointFrame {
  return { kind: "interruptCheckpoint", frame };
}

export function spendReaction(
  state: BattleState,
  reactorId: CombatantId,
): BattleState {
  const reactor = state.combatants.get(reactorId);
  if (reactor === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      reactionAvailable: false,
    }),
  };
}

function stateForOpeningInterruptCheckpoint(
  state: BattleState,
  frame: BattleInterruptCheckpointInput,
): BattleState | null {
  const actionDeclaredState =
    frame.trigger === "spellCast" &&
    frame.castingResource.kind !== "alreadySpent"
      ? battleStateAfterTargetActionEarlyEndForActor(state, frame.casterId)
      : state;
  const castingState =
    frame.trigger === "spellCast" &&
    frame.concentrationCommitment.kind === "breakExisting"
      ? breakBattleConcentration(actionDeclaredState, frame.casterId)
      : actionDeclaredState;
  if (
    frame.trigger !== "spellCast" ||
    frame.spellSlotCommitment.kind === "none"
  ) {
    return castingState;
  }
  const combatantId = frame.casterId;
  if (
    castingState.currentTurnResources.spellSlotUsesThisTurn.some(
      (use) => use.kind === "pending" && use.combatantId === combatantId,
    )
  ) {
    return castingState;
  }
  const claimed = claimPendingSpellSlotUseThisTurn(
    castingState.currentTurnResources,
    combatantId,
  );
  return Either.isLeft(claimed)
    ? null
    : { ...castingState, currentTurnResources: claimed.right };
}

type AttackHitBonusActionSpellInvocation = Extract<
  BattleSpellProcedureExecution,
  {
    readonly procedure:
      | "afterHitDamage"
      | "afterHitSaveGatedCondition"
      | "afterHitTimedDamageAndSave"
      | "afterHitDamageAndIllumination";
  }
>;

function afterHitSpellMatchesAttackTrigger(
  invocation: Pick<AttackHitBonusActionSpellInvocation, "procedure">,
  triggerKind: BattleAttackHitTriggerKind,
): boolean {
  if (
    invocation.procedure === "afterHitDamage" ||
    invocation.procedure === "afterHitTimedDamageAndSave" ||
    invocation.procedure === "afterHitDamageAndIllumination"
  ) {
    return triggerKind === "meleeWeapon" || triggerKind === "unarmedStrike";
  }
  return triggerKind === "meleeWeapon" || triggerKind === "rangedWeapon";
}

export function openAfterDamageSequenceInterruptWindow(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly events: readonly BattleAfterDamageEvent[];
  readonly objectDamages: readonly BattleObjectDamageOutcome[];
  readonly objectIgnitions: readonly BattleObjectIgnitionOutcome[];
  readonly droppedObjects: readonly BattleDroppedObjectOutcome[];
  readonly handledInterruptTrigger: BattleInterruptTrigger | undefined;
}): BattleResolutionResult {
  const [event, ...remainingEvents] = input.events;
  if (event === undefined) {
    return {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
      ...(input.objectDamages.length === 0
        ? {}
        : { objectDamages: input.objectDamages }),
      ...(input.objectIgnitions.length === 0
        ? {}
        : { objectIgnitions: input.objectIgnitions }),
      ...(input.droppedObjects.length === 0
        ? {}
        : { droppedObjects: input.droppedObjects }),
    };
  }
  const reactionWindow = maybeOpenInterruptWindow(
    input.state,
    {
      trigger: "afterDamage",
      damageSourceId: event.damageSourceId,
      damagedId: event.damagedId,
      damageAmount: event.damageAmount,
      reactionSpellTargetFacts: event.reactionSpellTargetFacts,
      continuation: {
        kind: "afterDamageSequence",
        subject: input.subject,
        events: remainingEvents,
        objectDamages: input.objectDamages,
        objectIgnitions: input.objectIgnitions,
        droppedObjects: input.droppedObjects,
      },
    },
    input.handledInterruptTrigger,
  );
  return (
    reactionWindow ??
    openAfterDamageSequenceInterruptWindow({
      ...input,
      events: remainingEvents,
    })
  );
}

export function attackDamageContinuationConcentrationFrame(
  continuation: BattleAttackDamageContinuationWithoutConcentration,
  handledInterruptTrigger: BattleInterruptTrigger,
): BattleAttackDamageContinuationConcentrationFrame {
  return {
    kind: "attackDamageContinuationConcentration",
    continuation,
    handledInterruptTrigger,
  };
}

export function interruptedProcedureSubject(
  procedure: BattleInterruptedProcedure,
): BattleSubject {
  return procedure.kind === "attackDamage"
    ? procedure.participant
    : procedure.subject;
}

export function interruptedProcedureSupportsAttackDamageChanges(
  procedure: BattleInterruptedProcedure,
): procedure is Extract<
  BattleInterruptedProcedure,
  {
    readonly kind: "replay";
    readonly glyphStoredSpellReleaseReplay?: never;
  }
> {
  return (
    procedure.kind === "replay" &&
    procedure.glyphStoredSpellReleaseReplay === undefined
  );
}

export type BattleOpenedInterruptWindowResult = Extract<
  BattleResolutionResult,
  { readonly tag: "needsHoles" }
> & {
  readonly holes: readonly [BattleHole, ...BattleHole[]];
};

export type BattleInterruptWindowProgress =
  | {
      readonly tag: "checkpointPreparationFailed";
      readonly result: Extract<
        BattleResolutionResult,
        { readonly tag: "invalid" }
      >;
    }
  | { readonly tag: "interruptionsCleared" }
  | {
      readonly tag: "windowOpened";
      readonly result: BattleOpenedInterruptWindowResult;
    };

export function interruptWindowProgress(
  state: BattleState,
  frame: BattleInterruptCheckpointInput,
  handledInterruptTrigger: BattleInterruptTrigger | undefined,
): BattleInterruptWindowProgress {
  if (frame.trigger === handledInterruptTrigger) {
    return { tag: "interruptionsCleared" };
  }
  const checkpointState = stateForOpeningInterruptCheckpoint(state, frame);
  if (checkpointState === null) {
    return {
      tag: "checkpointPreparationFailed",
      result: invalidResult(
        state,
        "staleSubject",
        "The interrupt checkpoint could not reserve its pending spell resource.",
      ),
    };
  }
  const choices = nonEmptyInterruptChoices(
    interruptChoices(checkpointState, frame),
  );
  return choices === null
    ? { tag: "interruptionsCleared" }
    : {
        tag: "windowOpened",
        result: openPreparedInterruptWindowWithChoices(
          checkpointState,
          frame,
          choices,
        ),
      };
}

export function maybeOpenInterruptWindow(
  state: BattleState,
  frame: BattleInterruptCheckpointInput,
  handledInterruptTrigger: BattleInterruptTrigger | undefined,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> | null {
  const progress = interruptWindowProgress(
    state,
    frame,
    handledInterruptTrigger,
  );
  return progress.tag === "windowOpened" ? progress.result : null;
}

function nonEmptyInterruptChoices(
  choices: readonly BattleInterruptProcedureChoice[],
):
  | readonly [
      BattleInterruptProcedureChoice,
      ...BattleInterruptProcedureChoice[],
    ]
  | null {
  const first = choices[0];
  return first === undefined ? null : [first, ...choices.slice(1)];
}

function openPreparedInterruptWindowWithChoices(
  checkpointState: BattleState,
  frame: BattleInterruptCheckpointInput,
  choices: readonly [
    BattleInterruptProcedureChoice,
    ...BattleInterruptProcedureChoice[],
  ],
): BattleOpenedInterruptWindowResult {
  const eligibleResponders = [
    ...new Set(choices.map((choice) => choice.reactorId)),
  ];
  const frameCommon = {
    eligibleResponders,
    offeredResponders: [],
    choices,
  } satisfies Pick<
    BattleInterruptCheckpoint,
    "eligibleResponders" | "offeredResponders" | "choices"
  >;
  const nextFrame: BattleInterruptCheckpoint = Match.value(frame).pipe(
    Match.when({ trigger: "attackHit" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "attackDamage" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "spellCast" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "saveFailed" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "afterDamage" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "creatureFalls" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "opportunityAttack" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.exhaustive,
  );
  const nextState = openBattleInterruptWindow({
    state: checkpointState,
    frame: nextFrame,
  });
  const decisionHole = interruptDecisionHole(nextFrame);
  return {
    tag: "needsHoles",
    state: nextState,
    subject: interruptedProcedureSubject(frame.continuation),
    holes: [decisionHole],
    snapshot: snapshotBattle(nextState),
  };
}

export function readiedSpellReactionChoices(
  state: BattleState,
  trigger: BattleInterruptTrigger,
): readonly BattleInterruptProcedureChoice[] {
  const readiedChoices = [...state.readiedSpells].flatMap(
    ([casterId, readiedSpell]) => {
      const reactor = state.combatants.get(casterId);
      if (
        readiedSpell.trigger !== trigger ||
        reactor === undefined ||
        !combatantCanTakeReactions(reactor)
      ) {
        return [];
      }
      return [
        {
          kind: "releaseReadiedSpell" as const,
          reactorId: casterId,
          readiedSpellCasterId: casterId,
          initialHoles: readiedSpellInitialHoles(state, casterId, readiedSpell),
          subject: {
            tag: "runtimeCommand" as const,
            actorId: currentActorId(state),
            command: "releaseReadiedSpell" as const,
            readiedSpellCasterId: casterId,
            procedureRef: readiedSpell.procedureRef,
          },
        },
      ];
    },
  );
  return readiedChoices;
}

export function readiedMovementReactionChoices(
  state: BattleState,
  trigger: BattleInterruptTrigger,
): readonly BattleInterruptProcedureChoice[] {
  return [...state.readiedMovements].flatMap(
    ([readiedMovementActorId, readiedMovement]) => {
      const reactor = state.combatants.get(readiedMovementActorId);
      const initialHoles = readiedMovementInitialHoles(
        state,
        readiedMovementActorId,
      );
      if (
        readiedMovement.trigger !== trigger ||
        reactor === undefined ||
        !combatantCanTakeReactions(reactor) ||
        initialHoles.length === 0
      ) {
        return [];
      }
      return [
        {
          kind: "releaseReadiedMovement" as const,
          reactorId: readiedMovementActorId,
          readiedMovementActorId,
          initialHoles,
          subject: {
            tag: "runtimeCommand" as const,
            actorId: currentActorId(state),
            command: "releaseReadiedMovement" as const,
            readiedMovementActorId,
          },
        },
      ];
    },
  );
}

export function interruptChoices(
  state: BattleState,
  frame: BattleInterruptCheckpointInput,
): readonly BattleInterruptProcedureChoice[] {
  const readiedChoices = [
    ...readiedSpellReactionChoices(state, frame.trigger),
    ...readiedMovementReactionChoices(state, frame.trigger),
  ];
  const attackHitBonusActionSpellChoices =
    attackHitBonusActionSpellReactionChoices(state, frame);
  const triggeredSpellChoices = triggeredReactionSpellChoices(state, frame);
  const modifierChoices = reactionRollOrDamageReductionChoices(state, frame);
  const retaliationChoices = retaliationReactionAttackChoices(state, frame);
  return frame.trigger === "opportunityAttack"
    ? [
        ...readiedChoices,
        ...triggeredSpellChoices,
        ...modifierChoices,
        ...opportunityAttackReactionChoices(
          state,
          frame.moverId,
          frame.threats,
        ),
      ]
    : [
        ...readiedChoices,
        ...attackHitBonusActionSpellChoices,
        ...triggeredSpellChoices,
        ...retaliationChoices,
        ...modifierChoices,
      ];
}

export function attackHitBonusActionSpellReactionChoices(
  state: BattleState,
  frame: BattleInterruptCheckpointInput,
): readonly BattleInterruptProcedureChoice[] {
  if (
    frame.trigger !== "attackHit" ||
    interruptedProcedureSubject(frame.continuation).tag === "bonusAction" ||
    frame.attackerId !== currentActorId(state)
  ) {
    return [];
  }
  const actor = state.combatants.get(frame.attackerId);
  const target =
    frame.trigger === "attackHit"
      ? state.combatants.get(frame.targetId)
      : undefined;
  if (
    actor?.origin.kind !== "character" ||
    target === undefined ||
    !combatantCanTakeActions(actor) ||
    !canSpendBonusAction(state.currentTurnResources) ||
    combatantInsideActiveAntimagicFieldAura(state, frame.attackerId)
  ) {
    return [];
  }
  return executableSpellProceduresForActor(state, actor).flatMap(
    (invocation): readonly BattleInterruptProcedureChoice[] => {
      if (
        !isAttackHitBonusActionSpellInvocation(invocation) ||
        ((invocation.procedure === "afterHitDamage" ||
          invocation.procedure === "afterHitTimedDamageAndSave" ||
          invocation.procedure === "afterHitDamageAndIllumination") &&
          !interruptedProcedureSupportsAttackDamageChanges(
            frame.continuation,
          )) ||
        !afterHitSpellMatchesAttackTrigger(
          invocation,
          frame.attackHitTriggerKind,
        ) ||
        !spellHasAvailableSpend(actor, invocation) ||
        !spellActTurnResourceAvailable(
          state.currentTurnResources,
          frame.attackerId,
          invocation,
        )
      ) {
        return [];
      }
      if (!isCharacterBattleCreatureState(actor)) return [];
      const procedureRef = invocation.sourceProcedureRef;
      const initialHoles =
        invocation.procedure === "afterHitSaveGatedCondition"
          ? [
              afterHitSaveGatedConditionSavingThrowOutcomeHole(
                state,
                frame.attackerId,
                target,
                invocation,
              ),
            ]
          : [];
      return [
        {
          kind: "castAttackHitBonusActionSpell" as const,
          reactorId: frame.attackerId,
          initialHoles,
          subject: {
            tag: "runtimeCommand" as const,
            actorId: currentActorId(state),
            command: "castAttackHitBonusActionSpell" as const,
            casterId: frame.attackerId,
            procedureRef,
          },
        },
      ];
    },
  );
}

function executableSpellProceduresForActor(
  state: BattleState,
  actor: BattleCreatureState,
): readonly BattleSpellProcedureExecution[] {
  if (!isCharacterBattleCreatureState(actor)) return [];
  return actor.origin.execution.procedureBindings.flatMap((binding) => {
    if (binding.procedure.kind !== "spellInvocation") return [];
    const invocation = characterSpellProcedure(
      actor.origin.execution,
      binding.procedureRef,
      actor,
    );
    return invocation === undefined ||
      activeOngoingFeaturesPreventSpellInvocation(state, actor, invocation)
      ? []
      : [invocation];
  });
}

export function opportunityAttackReactionChoices(
  state: BattleState,
  moverId: CombatantId,
  threats: readonly BattleOpportunityAttackThreat[],
): readonly BattleInterruptProcedureChoice[] {
  return threats.flatMap((threat) => {
    const reactorId = threat.reactorId;
    const reactor = state.combatants.get(reactorId);
    if (reactor === undefined) {
      return [];
    }
    const selection = opportunityAttackSelectionForReactor(
      state,
      reactorId,
      moverId,
      threat,
    );
    if (selection === undefined) return [];
    return [
      {
        kind: "opportunityAttack" as const,
        reactorId,
        initialHoles: [],
        subject: {
          tag: "runtimeCommand" as const,
          actorId: currentActorId(state),
          command: "opportunityAttack" as const,
          reactorId,
          targetId: moverId,
          ...selection,
        },
      },
    ];
  });
}

export function retaliationReactionAttackChoices(
  state: BattleState,
  frame: BattleInterruptCheckpointInput,
): readonly BattleInterruptProcedureChoice[] {
  if (
    frame.trigger !== "afterDamage" ||
    Number(frame.damageAmount) <= 0 ||
    frame.damageSourceId === frame.damagedId
  ) {
    return [];
  }
  const reactorId = frame.damagedId;
  const reactor = state.combatants.get(reactorId);
  if (
    reactor?.origin.kind !== "character" ||
    !combatantCanTakeReactions(reactor) ||
    !retaliationDamageSourceWithinFiveFeet(frame, reactorId)
  ) {
    return [];
  }
  if (
    !reactor.origin.execution.procedureBindings.some((binding) => {
      const procedure = binding.procedure;
      return (
        (procedure.kind === "unitFeature" ||
          procedure.kind === "unitSupportProfile") &&
        typeof procedure.execution === "object" &&
        procedure.execution.kind === "retaliationReactionAttack"
      );
    })
  ) {
    return [];
  }
  return meleeWeaponOrUnarmedStrikeSelectionsForReactor(
    state,
    reactorId,
    frame.damageSourceId,
  ).map((selection) => ({
    kind: "retaliationAttack" as const,
    reactorId,
    initialHoles: [],
    subject: {
      tag: "runtimeCommand" as const,
      actorId: currentActorId(state),
      command: "retaliationAttack" as const,
      reactorId,
      targetId: frame.damageSourceId,
      ...selection,
    },
  }));
}

function retaliationDamageSourceWithinFiveFeet(
  frame: Extract<
    BattleInterruptCheckpointInput,
    { readonly trigger: "afterDamage" }
  >,
  reactorId: CombatantId,
): boolean {
  return frame.reactionSpellTargetFacts.some(
    (fact) =>
      fact.kind === "retaliationDamagerWithinFiveFeet" &&
      fact.damagedId === reactorId &&
      fact.damageSourceId === frame.damageSourceId,
  );
}
