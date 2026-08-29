// Open Hand Technique Flurry of Blows hit riders.
// RAW-COVERAGE: runtime-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.open-hand-technique

import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { difficultyClass } from "@dnd/shared/types";
import { Match } from "effect";
import { allocateBattleEffectOccurrenceForCreature } from "../effect-execution-ref.ts";

import type {
  BattleFill,
  BattleCreatureState,
  BattleHole,
  BattleShovePushDisposition,
  BattleShovePushOutcome,
  BattleState,
  BattleUnitFeatureDecisionHole,
  BattleUnitFeatureSavingThrowOutcomeHole,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import type { MonkFocusFlurryOfBlowsStrikeSubject } from "../battle-subjects.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";
import {
  characterProcedureBinding,
  type UnitSupportProcedureExecution,
} from "../character-execution-queries.ts";

import {
  battleCreatureStateWithKnockOutPreservedConditions,
  isCharacterBattleCreatureState,
} from "./creature-state-execution.ts";
import { isMonkFocusFlurryOfBlowsActionResource } from "./monk-focus.ts";
import { combatantProficiencyBonus } from "./movement-speed.ts";
import { scoreModifier } from "./domain-helpers.ts";
import {
  OPEN_HAND_TECHNIQUE_DECISION_CHOICES,
  OPEN_HAND_TECHNIQUE_DECISION_HOLE_ID,
  OPEN_HAND_TECHNIQUE_DECISION_HOLE_INSTANCE,
  OPEN_HAND_TECHNIQUE_SAVE_HOLE_ID,
  OPEN_HAND_TECHNIQUE_SAVE_HOLE_INSTANCE,
  type OpenHandTechniqueDecisionChoice,
} from "./domain-constants.ts";
import {
  stateWithUnitFeatureSavingThrowRelationships,
  unitFeatureSingleTargetSavingThrowProjection,
} from "./unit-feature-saving-throw.ts";

type OpenHandTechniqueSavingThrowChoice = Extract<
  OpenHandTechniqueDecisionChoice,
  "pushAwayOnFailedSave" | "applyConditionOnFailedSave"
>;

type OpenHandTechniqueFlurryHit = {
  readonly actor: CharacterBattleCreatureState;
  readonly target: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly subject: MonkFocusFlurryOfBlowsStrikeSubject;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly execution: Extract<
    UnitSupportProcedureExecution,
    { readonly kind: "openHandTechnique" }
  >;
};

export type OpenHandTechniqueAfterHitResult =
  | {
      readonly tag: "ok";
      readonly state: BattleState;
      readonly shovePushes: readonly BattleShovePushOutcome[];
    }
  | { readonly tag: "needsHoles"; readonly holes: readonly BattleHole[] }
  | { readonly tag: "invalid"; readonly message: string };

function openHandTechniqueDecisionHole(): BattleUnitFeatureDecisionHole {
  return {
    kind: "unitFeatureDecision",
    holeId: OPEN_HAND_TECHNIQUE_DECISION_HOLE_ID,
    holeInstanceKey: OPEN_HAND_TECHNIQUE_DECISION_HOLE_INSTANCE,
    label: "Open Hand Technique",
    choices: OPEN_HAND_TECHNIQUE_DECISION_CHOICES,
  };
}

export function resolveOpenHandTechniqueAfterHit(input: {
  readonly state: BattleState;
  readonly subject: unknown;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly decision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  readonly savingThrow:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
}): OpenHandTechniqueAfterHitResult {
  const hit = openHandTechniqueFlurryHit(
    input.state,
    input.subject,
    input.actorId,
    input.targetId,
  );
  if (hit === null) {
    return input.decision === undefined && input.savingThrow === undefined
      ? { tag: "ok", state: input.state, shovePushes: [] }
      : {
          tag: "invalid",
          message:
            "Open Hand Technique is only valid for an eligible Flurry of Blows hit.",
        };
  }
  if (input.decision === undefined) {
    return { tag: "needsHoles", holes: [openHandTechniqueDecisionHole()] };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.decision.holeId !== OPEN_HAND_TECHNIQUE_DECISION_HOLE_ID) {
    return {
      tag: "invalid",
      message: "Open Hand Technique decision uses the wrong hole.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!isOpenHandTechniqueChoice(input.decision.value)) {
    return {
      tag: "invalid",
      message:
        "Open Hand Technique decision must choose a supported effect or decline.",
    };
  }
  /* v8 ignore stop -- @preserve */
  return Match.value(input.decision.value).pipe(
    Match.when("decline", () => {
      if (input.savingThrow !== undefined) {
        return {
          tag: "invalid" as const,
          message:
            "Open Hand Technique Saving Throw is not valid when the rider is declined.",
        };
      }
      return { tag: "ok" as const, state: input.state, shovePushes: [] };
    }),
    Match.when("denyOpportunityAttacks", () => {
      if (input.savingThrow !== undefined) {
        return {
          tag: "invalid" as const,
          message:
            "Open Hand Technique Opportunity Attack denial does not use a Saving Throw outcome.",
        };
      }
      return {
        tag: "ok" as const,
        state: applyOpenHandTechniqueOpportunityAttackDenial(input.state, hit),
        shovePushes: [],
      };
    }),
    Match.when("pushAwayOnFailedSave", () =>
      resolveOpenHandTechniqueSaveChoice(input, hit, "pushAwayOnFailedSave"),
    ),
    Match.when("applyConditionOnFailedSave", () =>
      resolveOpenHandTechniqueSaveChoice(
        input,
        hit,
        "applyConditionOnFailedSave",
      ),
    ),
    Match.exhaustive,
  );
}

function resolveOpenHandTechniqueSaveChoice(
  input: {
    readonly state: BattleState;
    readonly savingThrow:
      | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
      | undefined;
  },
  hit: OpenHandTechniqueFlurryHit,
  choice: OpenHandTechniqueSavingThrowChoice,
): OpenHandTechniqueAfterHitResult {
  if (input.savingThrow === undefined) {
    return {
      tag: "needsHoles",
      holes: [openHandTechniqueSavingThrowHole(input.state, hit, choice)],
    };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.savingThrow.holeId !== OPEN_HAND_TECHNIQUE_SAVE_HOLE_ID) {
    return {
      tag: "invalid",
      message: "Open Hand Technique Saving Throw uses the wrong hole.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const outcomes = input.savingThrow.value.outcomes;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (outcomes.length !== 1 || outcomes[0]?.targetId !== hit.targetId) {
    return {
      tag: "invalid",
      message:
        "Open Hand Technique Saving Throw must target the attacked creature.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const savingThrowState = stateWithUnitFeatureSavingThrowRelationships({
    relationshipRequestState: input.state,
    state: input.state,
    actorId: hit.actorId,
    targetId: hit.targetId,
    savingThrow: input.savingThrow,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowState === null) {
    return {
      tag: "invalid",
      message:
        "Open Hand Technique relationship facts must answer the saving-throw hole request.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const push = openHandTechniquePush(input.savingThrow);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (choice !== "pushAwayOnFailedSave" && push !== undefined) {
    return {
      tag: "invalid",
      message:
        "Open Hand Technique Push disposition is only valid for failed Push saves.",
    };
  }
  /* v8 ignore stop -- @preserve */
  if (outcomes[0].succeeded) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (push !== undefined) {
      return {
        tag: "invalid",
        message:
          "Open Hand Technique Push disposition is only valid after a failed save.",
      };
    }
    /* v8 ignore stop -- @preserve */
    return { tag: "ok", state: savingThrowState, shovePushes: [] };
  }
  return choice === "pushAwayOnFailedSave"
    ? applyOpenHandTechniquePushAway(savingThrowState, hit, push)
    : applyOpenHandTechniqueApplyProne(savingThrowState, hit);
}

function openHandTechniqueSavingThrowHole(
  state: BattleState,
  hit: OpenHandTechniqueFlurryHit,
  choice: OpenHandTechniqueSavingThrowChoice,
): BattleUnitFeatureSavingThrowOutcomeHole {
  const ability =
    choice === "pushAwayOnFailedSave"
      ? hit.execution.technique.effects.pushAwayOnFailedSave.save.ability
      : hit.execution.technique.effects.applyConditionOnFailedSave.save.ability;
  const actor = hit.actor;
  const wisdomModifier = scoreModifier(
    actor.origin.d20Statistics.abilityScores.wis,
  );
  return {
    kind: "savingThrowOutcome",
    holeId: OPEN_HAND_TECHNIQUE_SAVE_HOLE_ID,
    holeInstanceKey: OPEN_HAND_TECHNIQUE_SAVE_HOLE_INSTANCE,
    label: `Open Hand Technique ${choice === "pushAwayOnFailedSave" ? "Strength" : "Dexterity"} Saving Throw`,
    ...unitFeatureSingleTargetSavingThrowProjection({
      state,
      actorId: hit.actorId,
      targetId: hit.targetId,
      ability,
      dc: {
        kind: "fixed",
        dc: difficultyClass(
          hit.execution.technique.effectSaveDc.base +
            wisdomModifier +
            combatantProficiencyBonus(actor),
        ),
      },
    }),
  };
}

function applyOpenHandTechniqueOpportunityAttackDenial(
  state: BattleState,
  hit: OpenHandTechniqueFlurryHit,
): BattleState {
  const target = hit.target;
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner: target,
    effect: {
      kind: "opportunityAttackDenied",
      sourceProcedureRef: hit.procedureRef,
      sourceCombatantId: hit.actorId,
      expiresAt: { kind: "startOfTurn", combatantId: hit.targetId },
    },
  });
  return {
    ...state,
    combatants: new Map(state.combatants).set(hit.targetId, {
      ...allocation.owner,
      activeEffects: [
        ...allocation.owner.activeEffects.filter(
          (candidate) =>
            !(
              candidate.kind === "opportunityAttackDenied" &&
              "sourceProcedureRef" in candidate &&
              candidate.sourceProcedureRef === hit.procedureRef &&
              candidate.sourceCombatantId === hit.actorId
            ),
        ),
        allocation.effect,
      ],
    }),
  };
}

function applyOpenHandTechniquePushAway(
  state: BattleState,
  hit: OpenHandTechniqueFlurryHit,
  push: BattleShovePushOutcome | undefined,
): OpenHandTechniqueAfterHitResult {
  const distanceFeet =
    hit.execution.technique.effects.pushAwayOnFailedSave.distanceFeet;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (push === undefined) {
    return {
      tag: "invalid",
      message:
        "Open Hand Technique Push failed save requires caller-supplied push disposition.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (push.targetId !== hit.targetId) {
    return {
      tag: "invalid",
      message:
        "Open Hand Technique Push disposition must target the attacked creature.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const validation = validateOpenHandTechniquePushDisposition(
    push.disposition,
    distanceFeet,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation !== null) {
    return { tag: "invalid", message: validation };
  }
  /* v8 ignore stop -- @preserve */
  return { tag: "ok", state, shovePushes: [push] };
}

function applyOpenHandTechniqueApplyProne(
  state: BattleState,
  hit: OpenHandTechniqueFlurryHit,
): OpenHandTechniqueAfterHitResult {
  const target = hit.target;
  return {
    tag: "ok",
    state: {
      ...state,
      combatants: new Map(state.combatants).set(hit.targetId, {
        ...battleCreatureStateWithKnockOutPreservedConditions(
          target,
          applyCondition(
            target.conditions,
            hit.execution.technique.effects.applyConditionOnFailedSave
              .condition,
          ),
        ),
      }),
    },
    shovePushes: [],
  };
}

/* v8 ignore start -- @preserve -- Malformed Open Hand push disposition: the discovered forced-movement choice caps distance, forbids opportunity attacks, and requires a destination for an applied push. */
function validateOpenHandTechniquePushDisposition(
  disposition: BattleShovePushDisposition,
  maximumDistanceFeet: BattleShovePushDisposition["distanceFeet"],
): string | null {
  if (disposition.distanceFeet > maximumDistanceFeet) {
    return "Open Hand Technique Push disposition must not exceed the feature's 15-foot maximum.";
  }
  if (disposition.provokesOpportunityAttacks !== false) {
    return "Open Hand Technique Push disposition must not provoke Opportunity Attacks.";
  }
  if (disposition.kind === "pushed") {
    return disposition.destinationId.length === 0
      ? "Open Hand Technique Push destination must be caller-supplied."
      : null;
  }
  return null;
}
/* v8 ignore stop -- @preserve */

function openHandTechniqueFlurryHit(
  state: BattleState,
  subject: unknown,
  actorId: CombatantId,
  targetId: CombatantId,
): OpenHandTechniqueFlurryHit | null {
  if (!isMonkFocusFlurryOfBlowsStrikeSubject(subject)) return null;
  const actor = state.combatants.get(actorId);
  const target = state.combatants.get(targetId);
  if (!isCharacterBattleCreatureState(actor) || target === undefined) {
    return null;
  }
  if (
    !state.currentTurnResources.actionResources.some((resource) =>
      isMonkFocusFlurryOfBlowsActionResource(
        resource,
        actorId,
        subject.focusProcedureRef,
      ),
    )
  ) {
    return null;
  }
  const focusBinding = characterProcedureBinding(
    actor.origin.execution,
    subject.focusProcedureRef,
  );
  const focusProcedure = focusBinding?.procedure;
  if (
    focusProcedure?.kind !== "unitSupportProfile" ||
    typeof focusProcedure.execution !== "object" ||
    focusProcedure.execution.kind !== "monkFocusBattleOptions" ||
    focusProcedure.source.kind !== "resourcePool"
  ) {
    return null;
  }
  const focusResourcePoolRef = focusProcedure.source.resourcePoolRef;
  const binding = actor.origin.execution.procedureBindings.find((candidate) => {
    const candidateProcedure = candidate.procedure;
    return (
      (candidateProcedure.kind === "unitSupportProfile" ||
        candidateProcedure.kind === "unitFeature") &&
      typeof candidateProcedure.execution === "object" &&
      candidateProcedure.execution.kind === "openHandTechnique" &&
      candidateProcedure.execution.technique.trigger.resourcePoolRef ===
        focusResourcePoolRef
    );
  });
  const procedure = binding?.procedure;
  if (
    (procedure?.kind !== "unitSupportProfile" &&
      procedure?.kind !== "unitFeature") ||
    typeof procedure.execution !== "object" ||
    procedure.execution.kind !== "openHandTechnique" ||
    binding === undefined
  ) {
    return null;
  }
  return {
    actor,
    target,
    actorId,
    targetId,
    subject,
    procedureRef: binding.procedureRef,
    execution: procedure.execution,
  };
}

function openHandTechniquePush(
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
): BattleShovePushOutcome | undefined {
  return "openHandTechniquePush" in fill.value
    ? fill.value.openHandTechniquePush
    : undefined;
}

function isMonkFocusFlurryOfBlowsStrikeSubject(
  subject: unknown,
): subject is MonkFocusFlurryOfBlowsStrikeSubject {
  return (
    typeof subject === "object" &&
    subject !== null &&
    "tag" in subject &&
    subject.tag === "monkFocusFlurryOfBlowsStrike"
  );
}

function isOpenHandTechniqueChoice(
  value: Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>["value"],
): value is OpenHandTechniqueDecisionChoice {
  return OPEN_HAND_TECHNIQUE_DECISION_CHOICES.some(
    (choice) => choice === value,
  );
}
