import { Match } from "effect";
import {
  attackExecutionSelectionForOption,
  type BoundSupportedAttackActionOption,
} from "../battle-action-options.ts";
import { spendAmmunitionForAcceptedAttackPendingContinuation } from "../battle-ammunition.ts";
// Opportunity attack resolution owns the movement-triggered Reaction procedure.
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.cunning-strike
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.cunning-strike-option-grant

import { optionalProperty } from "../optional-property.ts";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { attackRollResultIsValid } from "@dnd/shared-algebras/attack-roll-algebra";
import {
  damageAmount as toDamageAmount,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import {
  attackDamageDispositionHole,
  attackDamageHole,
  damageDispositionFillValidation,
} from "./attack-damage-apply.ts";
import { attackFillSet } from "./attack-fill-set.ts";
import {
  attackRollHitsWithCriticalThreshold,
  attackRollIsCriticalHit,
  criticalThresholdForAttack,
  validateAttackDamageFill,
} from "./attack-resolution.ts";
import {
  attackRollHole,
  attackRollModeMatches,
  consumeHelpAttackForAttackRoll,
  ongoingFeatureEnemyRelationshipDecisionRequired,
  recordAttackRollOngoingFeatures,
  requiredAttackRollMode,
} from "./attack-roll.ts";
import { activeEffectArmorClass } from "./creature-state-execution.ts";
import {
  attackRollHoleWithD20TestNaturalOneRerollOption,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
  effectiveD20TestNaturalOneRerollAttackRoll,
} from "./d20-test-natural-one-reroll.ts";
import {
  applyAttackDamageAmount,
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
} from "./damage-apply.ts";
import { damageRelationshipDecisionFillCheck } from "./damage-relationship-decisions.ts";
import {
  activeMarkedDamageRiders,
  activeSpellWeaponDamageRiders,
  applyAvailableSpellDamageReduction,
  applyAvailableSourceDamageRollPenalty,
  attackDamageByTypeEntries,
  damageAmountByTypeEntriesToMap,
  damageAmountByTypeMapEntries,
  fixedAttackDamageAmount,
  fixedAttackDamageByTypeEntries,
  ongoingFeatureDamageModifier,
  prospectiveAttackDamageTypes,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";
import {
  attackDamageEventAfterPendingReductions,
  attackDamageEventAmountForTarget,
  attackDamageEventEntries,
  attackDamageEventWithEntries,
  attackDamageInterruptionFrame,
  attackFillsForAttackHitReplay,
} from "./attack-damage-events.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { revealHidden } from "./hole-helpers.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import {
  attackDamageRidersAfterCunningStrikeCost,
  cunningStrikeDamageContinuation,
  cunningStrikeDamageRollOptions,
  eligibleCunningStrikeContexts,
  resolveCunningStrikeAfterAttackDamage,
  selectedCunningStrikeContext,
  type CunningStrikeContext,
} from "./cunning-strike.ts";
import {
  attackHitTriggerKind,
  attackKindForDeflectRedirect,
  attackTargetDistanceFeet,
  meleeWeaponOrUnarmedStrikeOptionForReactor,
  opportunityAttackOptionForReactor,
} from "./movement-speed.ts";
import { attackTargetIsLegal } from "./attack-spatial.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import { invalidResult } from "./result-helpers.ts";
import { parseAttackRollRelationshipFacts } from "./roll-trigger-relationship-facts.ts";
import {
  eligibleAttackDamageRiders,
  frenzyDamageTypeDecision,
  eligibleAttackDamageDieFloorProcedureRefs,
  eligibleWeaponDamageDiceRollChoiceProcedureRefs,
  selectedAttackDamageRiders,
  selectedWeaponDamageDiceRollChoice,
} from "./statblock-attacks.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import type {
  AttackDamageRider,
  BattleAttackDamageEvent,
  BattleAttackRollResult,
  BattleCreatureState,
  BattleHoleId,
  BattleHiddenState,
  BattlePendingAttackDamageReduction,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleState,
  BattleTargetSpatialFact,
  WeaponDamageDiceRollChoiceFill,
} from "../battle-state-execution.ts";
import {
  ATTACK_ROLL_HOLE_ID,
  type AttackFillSet,
} from "./battle-runtime-protocol.ts";
import { spellAttackRerollUnsupportedIssue } from "./spell-reroll-issues.ts";
import { readiedAttackOption } from "./ready.ts";

const byReactionAttackDamagePathKind = Match.discriminator("kind");

type OpportunityAttackResolutionInput = BattleResolutionInputForSubject<
  Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "opportunityAttack"
        | "retaliationAttack"
        | "releaseReadiedAttack";
    }
  >
> & {
  readonly handledInterruptTrigger?: BattleInterruptTrigger;
  readonly pendingAttackDamageReductions?: ReadonlyNonEmptyArray<BattlePendingAttackDamageReduction>;
};

type ResolvedAttackFillSet = Extract<AttackFillSet, { readonly tag: "ok" }>;

type ReactionAttackDamagePath =
  | {
      readonly kind: "fixed";
      readonly damageByTypeBeforeTargetAdjustments: Extract<
        BattleAttackDamageEvent,
        { readonly kind: "aggregateDamage" }
      >["damageByTypeBeforeTargetAdjustments"];
    }
  | {
      readonly kind: "rolled";
      readonly damageRollByType: Extract<
        BattleAttackDamageEvent,
        { readonly kind: "rolledDamage" }
      >["damageRollByType"];
      readonly damageEventHoleId: BattleHoleId;
      readonly attackDamageRiders: readonly AttackDamageRider[];
      readonly weaponDamageDiceRollChoice: WeaponDamageDiceRollChoiceFill | null;
      readonly cunningStrike: CunningStrikeContext | null;
    };

type ReactionAttackCommandContext = {
  readonly input: OpportunityAttackResolutionInput;
  readonly commandLabel: string;
  readonly target: BattleCreatureState;
  readonly attack: BoundSupportedAttackActionOption;
  readonly fillSet: ResolvedAttackFillSet;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
};

type ReactionAttackRollPreparation =
  | { readonly tag: "result"; readonly result: BattleResolutionResult }
  | {
      readonly tag: "ready";
      readonly effectiveAttackRoll: BattleAttackRollResult;
      readonly hiddenBeforeAttack: BattleHiddenState | null;
      readonly attackRollRelationshipFacts: Exclude<
        ReturnType<typeof parseAttackRollRelationshipFacts>,
        null
      >;
    };

export function resolveOpportunityAttackCommand(
  input: OpportunityAttackResolutionInput,
): BattleResolutionResult {
  const result = resolveReactionAttackCommand(input);
  if (
    input.subject.command !== "releaseReadiedAttack" ||
    result.tag !== "resolved"
  ) {
    return result;
  }
  const readiedResponses = new Map(result.state.readiedResponses);
  readiedResponses.delete(input.subject.reactorId);
  const state = { ...result.state, readiedResponses };
  return { ...result, state, snapshot: snapshotBattle(state) };
}

function reactionAttackRollHoleWithRelationshipFacts(input: {
  readonly state: BattleState;
  readonly reactorId: BattleCreatureState["combatantId"];
  readonly targetId: BattleCreatureState["combatantId"];
  readonly attack: BoundSupportedAttackActionOption;
  readonly reactor: BattleCreatureState | undefined;
  readonly requiredRollMode: ReturnType<typeof requiredAttackRollMode>;
}): ReturnType<typeof attackRollHole> {
  return {
    ...attackRollHole(input.reactor, input.attack, input.requiredRollMode),
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      input.reactorId,
      "attackRollAgainstEnemy",
    )
      ? {
          relationshipFactRequest: {
            kind: "attackRollTargetIsEnemy" as const,
            attackerId: input.reactorId,
            targetId: input.targetId,
          },
        }
      : {}),
  };
}

function reactionAttackMissingRollResult(
  input: ReactionAttackCommandContext,
  requiredRollMode: ReturnType<typeof requiredAttackRollMode>,
): BattleResolutionResult {
  if (
    input.fillSet.damageRoll != null ||
    input.fillSet.damageDispositionFilled
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      `${input.commandLabel} attack roll must be filled before damage.`,
    );
  }
  return needsHolesResult(input.input.state, input.input.subject, [
    reactionAttackRollHoleWithRelationshipFacts({
      state: input.input.state,
      reactorId: input.input.subject.reactorId,
      targetId: input.input.subject.targetId,
      attack: input.attack,
      reactor: input.input.state.combatants.get(input.input.subject.reactorId),
      requiredRollMode,
    }),
  ]);
}

function reactionAttackRollIssue(input: {
  readonly context: ReactionAttackCommandContext;
  readonly attackRoll: BattleAttackRollResult;
  readonly requiredRollMode: ReturnType<typeof requiredAttackRollMode>;
}): string | null {
  if (!attackRollResultIsValid(input.attackRoll)) {
    return `${input.context.commandLabel} attack roll result is outside the d20 attack-roll protocol.`;
  }
  const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
    input.attackRoll,
  );
  if (spellAttackRerollIssue !== null) return spellAttackRerollIssue;
  if (!attackRollModeMatches(input.attackRoll, input.requiredRollMode)) {
    return `${input.context.commandLabel} attack roll mode does not match the current attack-roll rule.`;
  }
  return null;
}

function reactionAttackRerollResult(input: {
  readonly context: ReactionAttackCommandContext;
  readonly attackRoll: BattleAttackRollResult;
  readonly reactor: BattleCreatureState | undefined;
  readonly requiredRollMode: ReturnType<typeof requiredAttackRollMode>;
}): BattleResolutionResult | null {
  if (
    d20TestNaturalOneRerollRollDecisionRequired({
      actor: input.reactor,
      originalNaturalD20: Number(input.attackRoll.naturalD20),
      rollMode: input.attackRoll.rollMode,
      rolledD20s: input.attackRoll.rolledD20s,
      decision: input.attackRoll.d20TestNaturalOneReroll,
    })
  ) {
    return needsHolesResult(
      input.context.input.state,
      input.context.input.subject,
      [
        attackRollHoleWithD20TestNaturalOneRerollOption(
          reactionAttackRollHoleWithRelationshipFacts({
            state: input.context.input.state,
            reactorId: input.context.input.subject.reactorId,
            targetId: input.context.input.subject.targetId,
            attack: input.context.attack,
            reactor: input.reactor,
            requiredRollMode: input.requiredRollMode,
          }),
        ),
      ],
    );
  }
  const rerollIssue = d20TestNaturalOneRerollRollIssue({
    actor: input.reactor,
    total: input.attackRoll.total,
    originalNaturalD20: Number(input.attackRoll.naturalD20),
    rollMode: input.attackRoll.rollMode,
    rolledD20s: input.attackRoll.rolledD20s,
    decision: input.attackRoll.d20TestNaturalOneReroll,
    requiredRollMode: input.requiredRollMode,
  });
  return rerollIssue === null
    ? null
    : invalidResult(input.context.input.state, "invalidFill", rerollIssue);
}

function prepareReactionAttackRoll(
  input: ReactionAttackCommandContext,
): ReactionAttackRollPreparation {
  const requiredRollMode = requiredAttackRollMode(
    input.input.state,
    input.input.subject.reactorId,
    input.input.subject.targetId,
    input.attack,
    input.targetSpatialFacts,
  );
  const attackRoll = input.fillSet.attackRoll;
  if (attackRoll == null) {
    return {
      tag: "result",
      result: reactionAttackMissingRollResult(input, requiredRollMode),
    };
  }
  const rollIssue = reactionAttackRollIssue({
    context: input,
    attackRoll,
    requiredRollMode,
  });
  if (rollIssue !== null) {
    return {
      tag: "result",
      result: invalidResult(input.input.state, "invalidFill", rollIssue),
    };
  }
  const reactor = input.input.state.combatants.get(
    input.input.subject.reactorId,
  );
  const rerollResult = reactionAttackRerollResult({
    context: input,
    attackRoll,
    reactor,
    requiredRollMode,
  });
  if (rerollResult !== null) {
    return { tag: "result", result: rerollResult };
  }
  const attackRollRelationshipFacts = parseAttackRollRelationshipFacts(
    input.fillSet.attackRollRelationshipFacts,
    input.input.subject.reactorId,
    input.input.subject.targetId,
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.input.state,
      input.input.subject.reactorId,
      "attackRollAgainstEnemy",
    ),
  );
  if (attackRollRelationshipFacts === null) {
    return {
      tag: "result",
      result: invalidResult(
        input.input.state,
        "invalidFill",
        `${input.commandLabel} relationship facts must answer the attack-roll hole request.`,
      ),
    };
  }
  return {
    tag: "ready",
    effectiveAttackRoll: effectiveD20TestNaturalOneRerollAttackRoll(attackRoll),
    hiddenBeforeAttack:
      input.input.state.combatants.get(input.input.subject.reactorId)?.hidden ??
      null,
    attackRollRelationshipFacts,
  };
}

function resolveReactionAttackCommand(
  input: OpportunityAttackResolutionInput,
): BattleResolutionResult {
  const pendingAttackDamageReductions =
    input.pendingAttackDamageReductions ?? [];
  const subject = input.subject;
  const commandLabel = Match.value(subject.command).pipe(
    Match.when("retaliationAttack", () => "Retaliation" as const),
    Match.when("opportunityAttack", () => "Opportunity Attack" as const),
    Match.when("releaseReadiedAttack", () => "Readied" as const),
    Match.exhaustive,
  );
  const target = input.state.combatants.get(subject.targetId);
  const attack = Match.value(subject).pipe(
    Match.when({ command: "retaliationAttack" }, (reaction) =>
      meleeWeaponOrUnarmedStrikeOptionForReactor(
        input.state,
        reaction.reactorId,
        reaction.targetId,
        reaction,
      ),
    ),
    Match.when({ command: "opportunityAttack" }, (reaction) =>
      opportunityAttackOptionForReactor(
        input.state,
        reaction.reactorId,
        reaction.targetId,
        reaction,
      ),
    ),
    Match.when({ command: "releaseReadiedAttack" }, (reaction) =>
      readiedAttackOption(
        input.state,
        reaction.reactorId,
        reaction.targetId,
        reaction.procedureRef,
      ),
    ),
    Match.exhaustive,
  );
  if (target === undefined || attack === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      `${commandLabel} attack is no longer available.`,
    );
  }
  const fillSet = attackFillSet(
    input.fills,
    subject.reactorId,
    input.state,
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      subject.reactorId,
      "attackRollAgainstEnemy",
    ),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.targetId !== undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      `${commandLabel} target is fixed by the reaction trigger.`,
    );
  }
  /* v8 ignore stop */
  const targetSpatialFacts = reactionAttackTargetSpatialFacts({
    state: input.state,
    commandLabel,
    subject,
    attack,
    fillSet,
  });
  if (targetSpatialFacts.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      targetSpatialFacts.message,
    );
  }
  const context: ReactionAttackCommandContext = {
    input,
    commandLabel,
    target,
    attack,
    fillSet,
    targetSpatialFacts: targetSpatialFacts.facts,
  };
  const rollPreparation = prepareReactionAttackRoll(context);
  if (rollPreparation.tag === "result") return rollPreparation.result;
  return resolveReactionAttackAfterRoll({
    context,
    pendingAttackDamageReductions,
    rollPreparation,
  });
}

function reactionAttackTargetSpatialFacts(input: {
  readonly state: BattleState;
  readonly commandLabel: string;
  readonly subject: OpportunityAttackResolutionInput["subject"];
  readonly attack: BoundSupportedAttackActionOption;
  readonly fillSet: ResolvedAttackFillSet;
}):
  | { readonly tag: "ok"; readonly facts: readonly BattleTargetSpatialFact[] }
  | { readonly tag: "invalid"; readonly message: string } {
  const suppliedDistanceFeet = attackTargetDistanceFeet(
    input.fillSet.targetSpatialFacts,
    input.subject.reactorId,
    input.subject.targetId,
    input.attack,
  );
  if (
    input.subject.command === "opportunityAttack" &&
    suppliedDistanceFeet !== null &&
    Number(suppliedDistanceFeet) !== Number(input.subject.distanceFeet)
  ) {
    return {
      tag: "invalid",
      message:
        "Opportunity Attack target distance must match the reach-leaving trigger distance.",
    };
  }
  const distanceFact = reactionAttackDistanceFact({
    subject: input.subject,
    attack: input.attack,
  });
  const facts =
    suppliedDistanceFeet !== null
      ? input.fillSet.targetSpatialFacts
      : distanceFact === undefined
        ? undefined
        : [...input.fillSet.targetSpatialFacts, distanceFact];
  if (facts === undefined) {
    return {
      tag: "invalid",
      message:
        "Fixed-target reaction attacks require an exact attack target distance fact.",
    };
  }
  if (
    !attackTargetIsLegal(
      input.state,
      input.subject.reactorId,
      input.subject.targetId,
      input.attack,
      facts,
    )
  ) {
    return {
      tag: "invalid",
      message: `${input.commandLabel} target distance is outside the selected attack's legal range.`,
    };
  }
  return {
    tag: "ok",
    facts,
  };
}

function reactionAttackDistanceFact(input: {
  readonly subject: OpportunityAttackResolutionInput["subject"];
  readonly attack: BoundSupportedAttackActionOption;
}):
  | Extract<BattleTargetSpatialFact, { readonly kind: "attackTargetDistance" }>
  | undefined {
  return Match.value(input.subject).pipe(
    Match.when({ command: "opportunityAttack" }, (subject) => ({
      kind: "attackTargetDistance" as const,
      actorId: subject.reactorId,
      targetId: subject.targetId,
      ...attackExecutionSelectionForOption(input.attack),
      distanceFeet: subject.distanceFeet,
    })),
    Match.when({ command: "retaliationAttack" }, () => undefined),
    Match.when({ command: "releaseReadiedAttack" }, () => undefined),
    Match.exhaustive,
  );
}

function resolveReactionAttackAfterRoll(afterRollInput: {
  readonly context: ReactionAttackCommandContext;
  readonly pendingAttackDamageReductions: readonly BattlePendingAttackDamageReduction[];
  readonly rollPreparation: Extract<
    ReactionAttackRollPreparation,
    { readonly tag: "ready" }
  >;
}): BattleResolutionResult {
  const {
    input: resolutionInput,
    target,
    attack,
    fillSet,
  } = afterRollInput.context;
  const { subject } = resolutionInput;
  const {
    effectiveAttackRoll,
    hiddenBeforeAttack,
    attackRollRelationshipFacts,
  } = afterRollInput.rollPreparation;
  const { pendingAttackDamageReductions } = afterRollInput;
  const input = resolutionInput;
  let attackRolledState = consumeHelpAttackForAttackRoll(
    recordAttackRollOngoingFeatures(
      revealHidden(input.state, subject.reactorId),
      subject.reactorId,
      subject.targetId,
      null,
      attackRollRelationshipFacts,
    ),
    subject.reactorId,
    subject.targetId,
  );
  attackRolledState = spendAmmunitionForAcceptedAttackPendingContinuation({
    state: attackRolledState,
    actorId: subject.reactorId,
    attack,
    subject: input.subject,
  });
  const criticalThreshold = criticalThresholdForAttack(
    input.state.combatants.get(subject.reactorId),
    attack,
  );
  const hit = attackRollHitsWithCriticalThreshold(
    effectiveAttackRoll,
    currentArmorClass(activeEffectArmorClass(input.state, target)),
    criticalThreshold,
  );
  const critical = attackRollIsCriticalHit(
    effectiveAttackRoll,
    criticalThreshold,
  );
  const frenzyDamageType = frenzyDamageTypeDecision({
    state: attackRolledState,
    attackerId: subject.reactorId,
    attack,
    hitWithAttackRoll: hit,
    selectedDamageType: fillSet.frenzyDamageTypeChoice?.value,
  });
  if (frenzyDamageType.tag === "decisionRequired") {
    return needsHolesResult(attackRolledState, input.subject, [
      frenzyDamageType.hole,
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (frenzyDamageType.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", frenzyDamageType.message);
  }
  /* v8 ignore stop */
  const hitFacts = reactionAttackHitFacts({
    state: attackRolledState,
    subject,
    attack,
    fillSet,
    effectiveAttackRoll,
    hit,
    hiddenBeforeAttack,
    frenzyDamageType,
  });
  const {
    eligibleDamageRiders,
    eligibleDamageDiceChoiceUnitIds,
    eligibleDamageDieFloorChoiceUnitIds,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
    eligibleCunningStrikeDamageOptions,
    selectedCunningStrike,
    selectedDamageRidersAfterCunningStrikeCost,
  } = hitFacts;
  if (hit && input.handledInterruptTrigger !== "attackHit") {
    const reactionWindow = maybeOpenInterruptWindow(
      attackRolledState,
      {
        trigger: "attackHit",
        attackerId: subject.reactorId,
        targetId: subject.targetId,
        attackRoll: effectiveAttackRoll,
        attackKind: attackKindForDeflectRedirect(attack),
        attackHitTriggerKind: attackHitTriggerKind(attack),
        damageTypes: prospectiveAttackDamageTypes(
          attackRolledState,
          attackRolledState.combatants.get(subject.reactorId),
          attack,
          critical,
          effectiveAttackRoll,
          eligibleDamageRiders,
          spellWeaponDamageRiders,
          spellMarkedDamageRiders,
        ),
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: attackFillsForAttackHitReplay(input.fills),
        },
      },
      input.handledInterruptTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }
  const remarkableAthleteMovement = resolveRemarkableAthleteCriticalHitMovement(
    {
      state: attackRolledState,
      subject: input.subject,
      attackerId: subject.reactorId,
      scoredCriticalHit: critical,
      fills: fillSet,
    },
  );
  if (remarkableAthleteMovement.tag === "result") {
    return remarkableAthleteMovement.result;
  }
  attackRolledState = remarkableAthleteMovement.state;
  return resolveReactionAttackDamagePath({
    context: afterRollInput.context,
    pendingAttackDamageReductions,
    attackRolledState,
    target,
    attack,
    fillSet,
    effectiveAttackRoll,
    critical,
    hit,
    eligibleDamageRiders,
    eligibleDamageDiceChoiceUnitIds,
    eligibleDamageDieFloorChoiceUnitIds,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
    eligibleCunningStrikeDamageOptions,
    selectedCunningStrike,
    selectedDamageRidersAfterCunningStrikeCost,
  });
}

type ReactionAttackHitFacts = {
  readonly eligibleDamageRiders: readonly AttackDamageRider[];
  readonly eligibleDamageDiceChoiceUnitIds: ReturnType<
    typeof eligibleWeaponDamageDiceRollChoiceProcedureRefs
  >;
  readonly eligibleDamageDieFloorChoiceUnitIds: ReturnType<
    typeof eligibleAttackDamageDieFloorProcedureRefs
  >;
  readonly spellWeaponDamageRiders: ReturnType<
    typeof activeSpellWeaponDamageRiders
  >;
  readonly spellMarkedDamageRiders: ReturnType<typeof activeMarkedDamageRiders>;
  readonly eligibleCunningStrikeDamageOptions: ReturnType<
    typeof eligibleCunningStrikeContexts
  >;
  readonly selectedCunningStrike: CunningStrikeContext | null;
  readonly selectedDamageRidersAfterCunningStrikeCost: readonly AttackDamageRider[];
};

type ReactionAttackHitRiderFacts = Pick<
  ReactionAttackHitFacts,
  "eligibleDamageRiders" | "spellWeaponDamageRiders" | "spellMarkedDamageRiders"
>;

function reactionAttackHitRiderFacts(input: {
  readonly state: BattleState;
  readonly subject: OpportunityAttackResolutionInput["subject"];
  readonly attack: BoundSupportedAttackActionOption;
  readonly effectiveAttackRoll: BattleAttackRollResult;
  readonly hit: boolean;
  readonly frenzyDamageType: Exclude<
    ReturnType<typeof frenzyDamageTypeDecision>,
    { readonly tag: "decisionRequired" | "invalid" }
  >;
}): ReactionAttackHitRiderFacts {
  return {
    eligibleDamageRiders: input.hit
      ? eligibleAttackDamageRiders(
          input.state,
          input.subject.reactorId,
          input.subject.targetId,
          input.attack,
          input.effectiveAttackRoll,
          [],
          input.frenzyDamageType,
        )
      : [],
    spellWeaponDamageRiders: input.hit
      ? activeSpellWeaponDamageRiders(
          input.state.combatants.get(input.subject.reactorId),
          input.attack,
        )
      : [],
    spellMarkedDamageRiders: input.hit
      ? activeMarkedDamageRiders(
          input.state.combatants.get(input.subject.reactorId),
          input.subject.targetId,
        )
      : [],
  };
}

function reactionAttackHitFacts(input: {
  readonly state: BattleState;
  readonly subject: OpportunityAttackResolutionInput["subject"];
  readonly attack: BoundSupportedAttackActionOption;
  readonly fillSet: ResolvedAttackFillSet;
  readonly effectiveAttackRoll: BattleAttackRollResult;
  readonly hit: boolean;
  readonly hiddenBeforeAttack: BattleHiddenState | null;
  readonly frenzyDamageType: Exclude<
    ReturnType<typeof frenzyDamageTypeDecision>,
    { readonly tag: "decisionRequired" | "invalid" }
  >;
}): ReactionAttackHitFacts {
  const riderFacts = reactionAttackHitRiderFacts(input);
  const {
    eligibleDamageRiders,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
  } = riderFacts;
  const selectedDamageRiders =
    input.fillSet.damageRoll === undefined
      ? []
      : (selectedAttackDamageRiders(
          eligibleDamageRiders,
          input.fillSet.damageRoll.selectedAttackDamageRiderProcedureRefs,
        ) ?? []);
  const eligibleDamageDiceChoiceUnitIds = input.hit
    ? eligibleWeaponDamageDiceRollChoiceProcedureRefs(
        input.state,
        input.subject.reactorId,
        input.attack,
      )
    : [];
  const eligibleDamageDieFloorChoiceUnitIds = input.hit
    ? eligibleAttackDamageDieFloorProcedureRefs(
        input.state,
        input.subject.reactorId,
        input.attack,
        input.attack.procedureRef,
      )
    : [];
  const eligibleCunningStrikeDamageOptions = input.hit
    ? eligibleCunningStrikeContexts({
        state: input.state,
        attackerId: input.subject.reactorId,
        targetId: input.subject.targetId,
        eligibleAttackDamageRiders: eligibleDamageRiders,
        hiddenBeforeAttack: input.hiddenBeforeAttack,
      })
    : [];
  const selectedCunningStrike = selectedCunningStrikeContext(
    eligibleCunningStrikeDamageOptions,
    input.fillSet.damageRoll?.cunningStrikeOption,
  );
  return {
    eligibleDamageRiders,
    eligibleDamageDiceChoiceUnitIds,
    eligibleDamageDieFloorChoiceUnitIds,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
    eligibleCunningStrikeDamageOptions,
    selectedCunningStrike,
    selectedDamageRidersAfterCunningStrikeCost:
      attackDamageRidersAfterCunningStrikeCost(
        selectedDamageRiders,
        selectedCunningStrike,
      ),
  };
}

type ReactionAttackDamagePathInput = {
  readonly context: ReactionAttackCommandContext;
  readonly pendingAttackDamageReductions: readonly BattlePendingAttackDamageReduction[];
  readonly attackRolledState: BattleState;
  readonly target: BattleCreatureState;
  readonly attack: BoundSupportedAttackActionOption;
  readonly fillSet: ResolvedAttackFillSet;
  readonly effectiveAttackRoll: BattleAttackRollResult;
  readonly critical: boolean;
  readonly hit: boolean;
  readonly eligibleDamageRiders: readonly AttackDamageRider[];
  readonly eligibleDamageDiceChoiceUnitIds: ReturnType<
    typeof eligibleWeaponDamageDiceRollChoiceProcedureRefs
  >;
  readonly eligibleDamageDieFloorChoiceUnitIds: ReturnType<
    typeof eligibleAttackDamageDieFloorProcedureRefs
  >;
  readonly spellWeaponDamageRiders: ReturnType<
    typeof activeSpellWeaponDamageRiders
  >;
  readonly spellMarkedDamageRiders: ReturnType<typeof activeMarkedDamageRiders>;
  readonly eligibleCunningStrikeDamageOptions: ReturnType<
    typeof eligibleCunningStrikeContexts
  >;
  readonly selectedCunningStrike: CunningStrikeContext | null;
  readonly selectedDamageRidersAfterCunningStrikeCost: readonly AttackDamageRider[];
};

function resolveReactionAttackDamagePath(
  input: ReactionAttackDamagePathInput,
): BattleResolutionResult {
  if (!input.hit) return resolveReactionAttackMiss(input);
  const fixedDamageAmount =
    input.spellMarkedDamageRiders.length > 0 ||
    input.spellWeaponDamageRiders.length > 0
      ? null
      : fixedAttackDamageAmount(
          input.attackRolledState,
          input.attackRolledState.combatants.get(
            input.context.input.subject.reactorId,
          ),
          input.target,
          input.attack,
          input.effectiveAttackRoll,
        );
  if (fixedDamageAmount !== null) {
    return resolveReactionAttackFixedDamage(input);
  }
  const damageRoll = input.fillSet.damageRoll;
  if (damageRoll === undefined)
    return resolveReactionAttackMissingDamage(input);
  return resolveReactionAttackRolledDamage({ ...input, damageRoll });
}

function resolveReactionAttackMiss(
  input: ReactionAttackDamagePathInput,
): BattleResolutionResult {
  const { context, attackRolledState } = input;
  const { input: resolutionInput, fillSet } = context;
  if (
    fillSet.damageRoll != null ||
    fillSet.damageDispositionFilled ||
    fillSet.sourceDamageRollPenaltyRolls.length > 0
  ) {
    return invalidResult(
      resolutionInput.state,
      "invalidFill",
      `${context.commandLabel} damage can only be filled after a hit.`,
    );
  }
  const relationshipIssue =
    fillSet.damageRelationshipDecisions.unexpectedFillForAbsentEvent(
      ATTACK_ROLL_HOLE_ID,
    );
  if (relationshipIssue !== null) {
    return invalidResult(
      resolutionInput.state,
      "invalidFill",
      relationshipIssue,
    );
  }
  return {
    tag: "resolved",
    state: attackRolledState,
    snapshot: snapshotBattle(attackRolledState),
  };
}

function resolveReactionAttackFixedDamage(
  input: ReactionAttackDamagePathInput,
): BattleResolutionResult {
  const { context, attackRolledState } = input;
  const { input: resolutionInput, fillSet } = context;
  if (fillSet.damageRoll != null) {
    return invalidResult(
      resolutionInput.state,
      "invalidFill",
      "Fixed attack damage does not use a rolled damage fill.",
    );
  }
  const fixedDamageByTypeBeforeTargetAdjustments =
    fixedAttackDamageByTypeEntries(
      attackRolledState,
      attackRolledState.combatants.get(context.input.subject.reactorId),
      input.attack,
      input.effectiveAttackRoll,
    );
  if (fixedDamageByTypeBeforeTargetAdjustments === null) {
    return invalidResult(
      resolutionInput.state,
      "invalidFill",
      `${context.commandLabel} fixed damage is no longer available.`,
    );
  }
  return resolveReactionAttackDamageTransaction({
    resolutionInput,
    fillSet,
    targetSpatialFacts: context.targetSpatialFacts,
    preConsumptionState: attackRolledState,
    target: input.target,
    attack: input.attack,
    effectiveAttackRoll: input.effectiveAttackRoll,
    critical: input.critical,
    pendingAttackDamageReductions: input.pendingAttackDamageReductions,
    path: {
      kind: "fixed",
      damageByTypeBeforeTargetAdjustments:
        fixedDamageByTypeBeforeTargetAdjustments,
    },
  });
}

function resolveReactionAttackMissingDamage(
  input: ReactionAttackDamagePathInput,
): BattleResolutionResult {
  const { context, attackRolledState } = input;
  const { input: resolutionInput, fillSet } = context;
  if (fillSet.sourceDamageRollPenaltyRolls.length > 0) {
    return invalidResult(
      resolutionInput.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  return needsHolesResult(attackRolledState, resolutionInput.subject, [
    attackDamageHole(
      input.attack,
      input.critical,
      input.effectiveAttackRoll,
      input.eligibleDamageRiders,
      input.spellWeaponDamageRiders,
      input.spellMarkedDamageRiders,
      ongoingFeatureDamageModifier(
        attackRolledState,
        attackRolledState.combatants.get(context.input.subject.reactorId),
        input.attack,
      ),
      input.eligibleDamageDiceChoiceUnitIds,
      input.eligibleDamageDieFloorChoiceUnitIds,
      cunningStrikeDamageRollOptions(input.eligibleCunningStrikeDamageOptions),
    ),
  ]);
}

type ReactionAttackDamageRoll = NonNullable<
  ResolvedAttackFillSet["damageRoll"]
>;

function resolveReactionAttackRolledDamage(
  input: ReactionAttackDamagePathInput & {
    readonly damageRoll: ReactionAttackDamageRoll;
  },
): BattleResolutionResult {
  const { context, attackRolledState } = input;
  const { input: resolutionInput, fillSet } = context;
  const selectedDamageDiceChoice = selectedWeaponDamageDiceRollChoice(
    input.eligibleDamageDiceChoiceUnitIds,
    input.damageRoll.weaponDamageDiceRollChoice,
  );
  const damageValidation = validateAttackDamageFill(
    input.damageRoll,
    input.attack,
    input.critical,
    input.effectiveAttackRoll,
    input.eligibleDamageRiders,
    input.spellWeaponDamageRiders,
    input.spellMarkedDamageRiders,
    ongoingFeatureDamageModifier(
      attackRolledState,
      attackRolledState.combatants.get(context.input.subject.reactorId),
      input.attack,
    ),
    input.eligibleDamageDiceChoiceUnitIds,
    input.eligibleDamageDieFloorChoiceUnitIds,
    input.eligibleCunningStrikeDamageOptions,
  );
  if (damageValidation !== null) {
    return invalidResult(
      resolutionInput.state,
      "invalidFill",
      damageValidation,
    );
  }
  const damageSource = attackRolledState.combatants.get(
    context.input.subject.reactorId,
  );
  const damageRollByType = attackDamageByTypeEntries(
    attackRolledState,
    damageSource,
    input.attack,
    input.attack.procedureRef,
    input.damageRoll,
    input.critical,
    input.effectiveAttackRoll,
    input.selectedDamageRidersAfterCunningStrikeCost,
    input.spellWeaponDamageRiders,
    input.spellMarkedDamageRiders,
  );
  const expectedSourcePenaltyHole =
    sourceDamageRollPenaltyRollHoleForDamageRoll(
      damageSource,
      damageAmountByTypeEntriesToMap(damageRollByType),
      input.damageRoll.holeId,
    );
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    return invalidResult(
      resolutionInput.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    damageSource,
    damageAmountByTypeEntriesToMap(damageRollByType),
    input.damageRoll.holeId,
    sourceDamageRollPenaltyRollForDamageRoll(
      fillSet.sourceDamageRollPenaltyRolls,
      damageSource,
      damageAmountByTypeEntriesToMap(damageRollByType),
      input.damageRoll.holeId,
    ),
  );
  if (sourcePenalty.tag === "invalid") {
    return invalidResult(
      resolutionInput.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  if (sourcePenalty.tag === "needsHoles") {
    return needsHolesResult(attackRolledState, resolutionInput.subject, [
      ...sourcePenalty.holes,
    ]);
  }
  return resolveReactionAttackDamageTransaction({
    resolutionInput,
    fillSet,
    targetSpatialFacts: context.targetSpatialFacts,
    preConsumptionState: attackRolledState,
    target: input.target,
    attack: input.attack,
    effectiveAttackRoll: input.effectiveAttackRoll,
    critical: input.critical,
    pendingAttackDamageReductions: input.pendingAttackDamageReductions,
    path: {
      kind: "rolled",
      damageRollByType: damageAmountByTypeMapEntries(
        sourcePenalty.damageByType,
      ),
      damageEventHoleId: input.damageRoll.holeId,
      attackDamageRiders: input.selectedDamageRidersAfterCunningStrikeCost,
      weaponDamageDiceRollChoice: selectedDamageDiceChoice,
      cunningStrike: input.selectedCunningStrike,
    },
  });
}

function resolveReactionAttackDamageTransaction(input: {
  readonly resolutionInput: OpportunityAttackResolutionInput;
  readonly fillSet: ResolvedAttackFillSet;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
  readonly preConsumptionState: BattleState;
  readonly target: BattleCreatureState;
  readonly attack: BoundSupportedAttackActionOption;
  readonly effectiveAttackRoll: BattleAttackRollResult;
  readonly critical: boolean;
  readonly pendingAttackDamageReductions: readonly BattlePendingAttackDamageReduction[];
  readonly path: ReactionAttackDamagePath;
}): BattleResolutionResult {
  const {
    resolutionInput,
    fillSet,
    targetSpatialFacts,
    preConsumptionState,
    target,
    attack,
    effectiveAttackRoll,
    critical,
    pendingAttackDamageReductions,
    path,
  } = input;
  const subject = resolutionInput.subject;

  const damageEvent: BattleAttackDamageEvent = Match.value(path).pipe(
    byReactionAttackDamagePathKind("fixed", (fixed) => ({
      kind: "aggregateDamage" as const,
      damageByTypeBeforeTargetAdjustments:
        fixed.damageByTypeBeforeTargetAdjustments,
    })),
    byReactionAttackDamagePathKind("rolled", (rolled) => ({
      kind: "rolledDamage" as const,
      damageRollByType: rolled.damageRollByType,
    })),
    Match.exhaustive,
  );
  const reducedDamageEvent = attackDamageEventAfterPendingReductions(
    damageEvent,
    pendingAttackDamageReductions,
  );
  const spellReduction = applyAvailableSpellDamageReduction(
    target,
    damageAmountByTypeEntriesToMap(
      attackDamageEventEntries(reducedDamageEvent),
    ),
    fillSet.spellDamageReductionRoll,
  );

  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spellReduction.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      resolutionInput.state,
      "invalidFill",
      "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
    );
  }
  /* v8 ignore stop */

  if (spellReduction.tag === "needsHoles") {
    return needsHolesResult(
      preConsumptionState,
      resolutionInput.subject,
      spellReduction.holes,
    );
  }

  const reducedDamageEventAfterSpellReduction = attackDamageEventWithEntries(
    reducedDamageEvent,
    damageAmountByTypeMapEntries(spellReduction.damageByType),
  );
  const spellReducedState = {
    ...preConsumptionState,
    combatants: new Map(preConsumptionState.combatants).set(
      target.combatantId,
      spellReduction.target,
    ),
  };
  const reducedDamageAmount = attackDamageEventAmountForTarget(
    spellReducedState,
    spellReduction.target,
    reducedDamageEventAfterSpellReduction,
  );

  const damageDispositionHole = attackDamageDispositionHole({
    attack,
    attackerId: subject.reactorId,
    target: spellReduction.target,
    damageAmount: reducedDamageAmount,
  });
  const damageDispositionValidation = damageDispositionFillValidation({
    hole: damageDispositionHole,
    filled: fillSet.damageDispositionFilled,
    value: fillSet.damageDisposition,
  });

  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      resolutionInput.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop */

  if (damageDispositionHole !== null && !fillSet.damageDispositionFilled) {
    return needsHolesResult(preConsumptionState, resolutionInput.subject, [
      damageDispositionHole,
    ]);
  }

  const damageEventHoleId = Match.value(path).pipe(
    byReactionAttackDamagePathKind("fixed", () => ATTACK_ROLL_HOLE_ID),
    byReactionAttackDamagePathKind(
      "rolled",
      (rolled) => rolled.damageEventHoleId,
    ),
    Match.exhaustive,
  );
  const relationshipCheck = damageRelationshipDecisionFillCheck({
    state: spellReducedState,
    damageEventHoleId,
    damageSourceId: subject.reactorId,
    targets:
      Number(reducedDamageAmount) <= 0
        ? []
        : [
            {
              targetId: subject.targetId,
              damageAmount: toDamageAmount(Number(reducedDamageAmount)),
              damageDisposition: fillSet.damageDisposition,
            },
          ],
    spatialFacts: targetSpatialFacts,
    decisionsByRelationshipHole: fillSet.damageRelationshipDecisions,
  });

  if (relationshipCheck.tag === "needsHoles") {
    return needsHolesResult(
      preConsumptionState,
      resolutionInput.subject,
      relationshipCheck.holes,
    );
  }

  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      resolutionInput.state,
      "invalidFill",
      relationshipCheck.message,
    );
  }
  /* v8 ignore stop */

  const sharedContinuationFacts = {
    kind: "damageOnly" as const,
    concentrationSavingThrows: fillSet.concentrationSavingThrows,
    damageDisposition: fillSet.damageDisposition,
    ...optionalProperty("relationshipDecisions", relationshipCheck.decisions),
  };
  const attackDamageContinuation = Match.value(path).pipe(
    byReactionAttackDamagePathKind("fixed", () => ({
      ...sharedContinuationFacts,
      attackDamageRiders: [],
    })),
    byReactionAttackDamagePathKind("rolled", (rolled) => ({
      ...sharedContinuationFacts,
      attackDamageRiders: rolled.attackDamageRiders,
      ...(rolled.weaponDamageDiceRollChoice === null
        ? {}
        : { weaponDamageDiceRollChoice: rolled.weaponDamageDiceRollChoice }),
      ...optionalProperty(
        "cunningStrike",
        cunningStrikeDamageContinuation(rolled.cunningStrike),
      ),
    })),
    Match.exhaustive,
  );

  const attackDamageReactionWindow = maybeOpenInterruptWindow(
    spellReducedState,
    {
      trigger: "attackDamage",
      continuation: attackDamageInterruptionFrame({
        participant: resolutionInput.subject,
        targetId: subject.targetId,
        targetSpatialFacts,
        attackResult: effectiveAttackRoll,
        damageInput: reducedDamageEventAfterSpellReduction,
        critical,
        continuation: attackDamageContinuation,
      }),
    },
    resolutionInput.handledInterruptTrigger,
  );
  if (attackDamageReactionWindow !== null) {
    return attackDamageReactionWindow;
  }

  const concentrationSave = concentrationSavingThrowHole(
    spellReduction.target,
    reducedDamageAmount,
  );
  const primaryConcentrationSavingThrow =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          fillSet.concentrationSavingThrows,
          concentrationSave,
        );
  const concentrationSaveCheck =
    damageLifecycleConcentrationSavingThrowFillCheck({
      state: spellReducedState,
      target: spellReduction.target,
      damageAmount: reducedDamageAmount,
      fills: fillSet.concentrationSavingThrows,
    });

  if (concentrationSaveCheck.tag === "needsHoles") {
    return needsHolesResult(
      preConsumptionState,
      resolutionInput.subject,
      concentrationSaveCheck.holes,
    );
  }

  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationSaveCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      resolutionInput.state,
      "invalidFill",
      concentrationSaveCheck.message,
    );
  }
  /* v8 ignore stop */

  const hideousLaughterSaveCheck =
    damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
      state: spellReducedState,
      target: spellReduction.target,
      damageAmount: reducedDamageAmount,
      fills: fillSet.hideousLaughterDamageRepeatSaves,
    });

  if (hideousLaughterSaveCheck.tag === "needsHoles") {
    return needsHolesResult(
      preConsumptionState,
      resolutionInput.subject,
      hideousLaughterSaveCheck.holes,
    );
  }

  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (hideousLaughterSaveCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      resolutionInput.state,
      "invalidFill",
      hideousLaughterSaveCheck.message,
    );
  }
  /* v8 ignore stop */

  const pathDamageApplication = Match.value(path).pipe(
    byReactionAttackDamagePathKind("fixed", () => ({
      attackDamageRiders: [] as const,
    })),
    byReactionAttackDamagePathKind("rolled", (rolled) => ({
      attackDamageRiders: rolled.attackDamageRiders,
      ...(rolled.weaponDamageDiceRollChoice === null
        ? {}
        : { weaponDamageDiceRollChoice: rolled.weaponDamageDiceRollChoice }),
    })),
    Match.exhaustive,
  );
  const damagedState = applyAttackDamageAmount({
    state: spellReducedState,
    attackerId: subject.reactorId,
    targetId: subject.targetId,
    damageAmount: reducedDamageAmount,
    deathFailuresAtZeroHp: critical ? 2 : 1,
    damageDisposition: fillSet.damageDisposition,
    ...pathDamageApplication,
    concentrationSavingThrow: primaryConcentrationSavingThrow,
    hideousLaughterDamageRepeatSaves: fillSet.hideousLaughterDamageRepeatSaves,
    wardingBondDamageShareConcentrationSavingThrows:
      fillSet.concentrationSavingThrows,
    spatialFacts: targetSpatialFacts,
    relationshipDecisions: relationshipCheck.decisions,
  });

  const afterDamagePath = Match.value(path).pipe(
    byReactionAttackDamagePathKind("fixed", () => ({
      tag: "ok" as const,
      state: damagedState,
    })),
    byReactionAttackDamagePathKind("rolled", (rolled) =>
      resolveCunningStrikeAfterAttackDamage({
        state: damagedState,
        selected: rolled.cunningStrike,
        savingThrow: fillSet.cunningStrikeSavingThrow,
        movement: fillSet.cunningStrikeMovement,
        toolPossession: fillSet.cunningStrikeToolPossession,
        endTurnCover: fillSet.cunningStrikeEndTurnCover,
      }),
    ),
    Match.exhaustive,
  );

  if (afterDamagePath.tag === "needsHoles") {
    return needsHolesResult(
      preConsumptionState,
      resolutionInput.subject,
      afterDamagePath.holes,
    );
  }

  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (afterDamagePath.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      resolutionInput.state,
      "invalidFill",
      afterDamagePath.message,
    );
  }
  /* v8 ignore stop */

  const afterDamageReactionWindow = maybeOpenInterruptWindow(
    afterDamagePath.state,
    {
      trigger: "afterDamage",
      damageSourceId: subject.reactorId,
      damagedId: subject.targetId,
      damageAmount: reducedDamageAmount,
      reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
        facts: targetSpatialFacts,
        damagedId: subject.targetId,
        damageSourceId: subject.reactorId,
      }),
      continuation: {
        kind: "resolved",
        subject: resolutionInput.subject,
      },
    },
    resolutionInput.handledInterruptTrigger,
  );
  if (afterDamageReactionWindow !== null) {
    return afterDamageReactionWindow;
  }

  return {
    tag: "resolved",
    state: afterDamagePath.state,
    snapshot: snapshotBattle(afterDamagePath.state),
  };
}
