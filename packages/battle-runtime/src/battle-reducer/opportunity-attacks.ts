import { Match } from "effect";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
// Opportunity attack resolution owns the movement-triggered Reaction procedure.
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
  meleeWeaponOrUnarmedStrikeOptionForReactor,
  opportunityAttackOptionForReactor,
} from "./movement-speed.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import { invalidResult } from "./result-helpers.ts";
import { parseAttackRollRelationshipFacts } from "./roll-trigger-relationship-facts.ts";
import {
  attackPotentialDamageTypes,
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
  BattlePendingAttackDamageReduction,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleState,
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
  const requiredRollMode = requiredAttackRollMode(
    input.state,
    subject.reactorId,
    subject.targetId,
    attack,
    fillSet.targetSpatialFacts,
  );
  if (fillSet.attackRoll == null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.damageRoll != null || fillSet.damageDispositionFilled) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        `${commandLabel} attack roll must be filled before damage.`,
      );
    }
    /* v8 ignore stop */
    return needsHolesResult(input.state, input.subject, [
      {
        ...attackRollHole(
          input.state.combatants.get(subject.reactorId),
          attack,
          requiredRollMode,
        ),
        ...(ongoingFeatureEnemyRelationshipDecisionRequired(
          input.state,
          subject.reactorId,
          "attackRollAgainstEnemy",
        )
          ? {
              relationshipFactRequest: {
                kind: "attackRollTargetIsEnemy" as const,
                attackerId: subject.reactorId,
                targetId: subject.targetId,
              },
            }
          : {}),
      },
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!attackRollResultIsValid(fillSet.attackRoll)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      `${commandLabel} attack roll result is outside the d20 attack-roll protocol.`,
    );
  }
  /* v8 ignore stop */
  const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
    fillSet.attackRoll,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spellAttackRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", spellAttackRerollIssue);
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      `${commandLabel} attack roll mode does not match the current attack-roll rule.`,
    );
  }
  /* v8 ignore stop */
  const reactor = input.state.combatants.get(subject.reactorId);
  if (
    d20TestNaturalOneRerollRollDecisionRequired({
      actor: reactor,
      originalNaturalD20: Number(fillSet.attackRoll.naturalD20),
      rollMode: fillSet.attackRoll.rollMode,
      rolledD20s: fillSet.attackRoll.rolledD20s,
      decision: fillSet.attackRoll.d20TestNaturalOneReroll,
    })
  ) {
    return needsHolesResult(input.state, input.subject, [
      attackRollHoleWithD20TestNaturalOneRerollOption({
        ...attackRollHole(reactor, attack, requiredRollMode),
        ...(ongoingFeatureEnemyRelationshipDecisionRequired(
          input.state,
          subject.reactorId,
          "attackRollAgainstEnemy",
        )
          ? {
              relationshipFactRequest: {
                kind: "attackRollTargetIsEnemy" as const,
                attackerId: subject.reactorId,
                targetId: subject.targetId,
              },
            }
          : {}),
      }),
    ]);
  }
  const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollRollIssue({
    actor: reactor,
    total: fillSet.attackRoll.total,
    originalNaturalD20: Number(fillSet.attackRoll.naturalD20),
    rollMode: fillSet.attackRoll.rollMode,
    rolledD20s: fillSet.attackRoll.rolledD20s,
    decision: fillSet.attackRoll.d20TestNaturalOneReroll,
    requiredRollMode,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (d20TestNaturalOneRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      d20TestNaturalOneRerollIssue,
    );
  }
  /* v8 ignore stop */
  const effectiveAttackRoll = effectiveD20TestNaturalOneRerollAttackRoll(
    fillSet.attackRoll,
  );
  const hiddenBeforeAttack =
    input.state.combatants.get(subject.reactorId)?.hidden ?? null;
  const attackRollRelationshipFacts = parseAttackRollRelationshipFacts(
    fillSet.attackRollRelationshipFacts,
    subject.reactorId,
    subject.targetId,
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      subject.reactorId,
      "attackRollAgainstEnemy",
    ),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (attackRollRelationshipFacts === null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      `${commandLabel} relationship facts must answer the attack-roll hole request.`,
    );
  }
  /* v8 ignore stop */
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
  const eligibleDamageRiders = hit
    ? eligibleAttackDamageRiders(
        attackRolledState,
        subject.reactorId,
        subject.targetId,
        attack,
        effectiveAttackRoll,
        [],
        frenzyDamageType,
      )
    : [];
  const eligibleDamageDiceChoiceUnitIds = hit
    ? eligibleWeaponDamageDiceRollChoiceProcedureRefs(
        attackRolledState,
        subject.reactorId,
        attack,
      )
    : [];
  const eligibleDamageDieFloorChoiceUnitIds = hit
    ? eligibleAttackDamageDieFloorProcedureRefs(
        attackRolledState,
        subject.reactorId,
        attack,
        attack.procedureRef,
      )
    : [];
  const spellWeaponDamageRiders = hit
    ? activeSpellWeaponDamageRiders(
        attackRolledState.combatants.get(subject.reactorId),
        attack,
      )
    : [];
  const spellMarkedDamageRiders = hit
    ? activeMarkedDamageRiders(
        attackRolledState.combatants.get(subject.reactorId),
        subject.targetId,
      )
    : [];
  const selectedDamageRiders =
    fillSet.damageRoll === undefined
      ? []
      : (selectedAttackDamageRiders(
          eligibleDamageRiders,
          fillSet.damageRoll.selectedAttackDamageRiderProcedureRefs,
        ) ?? []);
  const eligibleCunningStrikeDamageOptions = hit
    ? eligibleCunningStrikeContexts({
        state: attackRolledState,
        attackerId: subject.reactorId,
        targetId: subject.targetId,
        eligibleAttackDamageRiders: eligibleDamageRiders,
        hiddenBeforeAttack,
      })
    : [];
  const selectedCunningStrike = selectedCunningStrikeContext(
    eligibleCunningStrikeDamageOptions,
    fillSet.damageRoll?.cunningStrikeOption,
  );
  const selectedDamageRidersAfterCunningStrikeCost =
    attackDamageRidersAfterCunningStrikeCost(
      selectedDamageRiders,
      selectedCunningStrike,
    );
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
        damageTypes: attackPotentialDamageTypes(
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !hit &&
    (fillSet.damageRoll != null ||
      fillSet.damageDispositionFilled ||
      fillSet.sourceDamageRollPenaltyRolls.length > 0)
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      `${commandLabel} damage can only be filled after a hit.`,
    );
  }
  /* v8 ignore stop */
  if (!hit) {
    const relationshipIssue =
      fillSet.damageRelationshipDecisions.unexpectedFillForAbsentEvent(
        ATTACK_ROLL_HOLE_ID,
      );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (relationshipIssue !== null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", relationshipIssue);
    }
    /* v8 ignore stop */
    return {
      tag: "resolved",
      state: attackRolledState,
      snapshot: snapshotBattle(attackRolledState),
    };
  }
  const fixedDamageAmount =
    spellMarkedDamageRiders.length > 0 || spellWeaponDamageRiders.length > 0
      ? null
      : fixedAttackDamageAmount(
          attackRolledState,
          attackRolledState.combatants.get(subject.reactorId),
          target,
          attack,
          effectiveAttackRoll,
        );
  if (fixedDamageAmount !== null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.damageRoll != null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Fixed attack damage does not use a rolled damage fill.",
      );
    }
    /* v8 ignore stop */
    const fixedDamageByTypeBeforeTargetAdjustments =
      fixedAttackDamageByTypeEntries(
        attackRolledState,
        attackRolledState.combatants.get(subject.reactorId),
        attack,
        effectiveAttackRoll,
      );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fixedDamageByTypeBeforeTargetAdjustments === null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        `${commandLabel} fixed damage is no longer available.`,
      );
    }
    /* v8 ignore stop */
    return resolveReactionAttackDamageTransaction({
      resolutionInput: input,
      fillSet,
      preConsumptionState: attackRolledState,
      target,
      attack,
      effectiveAttackRoll,
      critical,
      pendingAttackDamageReductions,
      path: {
        kind: "fixed",
        damageByTypeBeforeTargetAdjustments:
          fixedDamageByTypeBeforeTargetAdjustments,
      },
    });
  }
  if (fillSet.damageRoll == null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop */
    return needsHolesResult(attackRolledState, input.subject, [
      attackDamageHole(
        attack,
        critical,
        effectiveAttackRoll,
        eligibleDamageRiders,
        spellWeaponDamageRiders,
        spellMarkedDamageRiders,
        ongoingFeatureDamageModifier(
          attackRolledState,
          attackRolledState.combatants.get(subject.reactorId),
          attack,
        ),
        eligibleDamageDiceChoiceUnitIds,
        eligibleDamageDieFloorChoiceUnitIds,
        cunningStrikeDamageRollOptions(eligibleCunningStrikeDamageOptions),
      ),
    ]);
  }
  const selectedDamageDiceChoice = selectedWeaponDamageDiceRollChoice(
    eligibleDamageDiceChoiceUnitIds,
    fillSet.damageRoll.weaponDamageDiceRollChoice,
  );
  const damageValidation = validateAttackDamageFill(
    fillSet.damageRoll,
    attack,
    critical,
    effectiveAttackRoll,
    eligibleDamageRiders,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
    ongoingFeatureDamageModifier(
      attackRolledState,
      attackRolledState.combatants.get(subject.reactorId),
      attack,
    ),
    eligibleDamageDiceChoiceUnitIds,
    eligibleDamageDieFloorChoiceUnitIds,
    eligibleCunningStrikeDamageOptions,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
  const damageSource = attackRolledState.combatants.get(subject.reactorId);
  const damageRollByType = attackDamageByTypeEntries(
    attackRolledState,
    damageSource,
    attack,
    attack.procedureRef,
    fillSet.damageRoll,
    critical,
    effectiveAttackRoll,
    selectedDamageRidersAfterCunningStrikeCost,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
  );
  const expectedSourcePenaltyHole =
    sourceDamageRollPenaltyRollHoleForDamageRoll(
      damageSource,
      damageAmountByTypeEntriesToMap(damageRollByType),
      fillSet.damageRoll.holeId,
    );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    damageSource,
    damageAmountByTypeEntriesToMap(damageRollByType),
    fillSet.damageRoll.holeId,
    sourceDamageRollPenaltyRollForDamageRoll(
      fillSet.sourceDamageRollPenaltyRolls,
      damageSource,
      damageAmountByTypeEntriesToMap(damageRollByType),
      fillSet.damageRoll.holeId,
    ),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sourcePenalty.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  if (sourcePenalty.tag === "needsHoles") {
    return needsHolesResult(attackRolledState, input.subject, [
      ...sourcePenalty.holes,
    ]);
  }
  return resolveReactionAttackDamageTransaction({
    resolutionInput: input,
    fillSet,
    preConsumptionState: attackRolledState,
    target,
    attack,
    effectiveAttackRoll,
    critical,
    pendingAttackDamageReductions,
    path: {
      kind: "rolled",
      damageRollByType: damageAmountByTypeMapEntries(
        sourcePenalty.damageByType,
      ),
      damageEventHoleId: fillSet.damageRoll.holeId,
      attackDamageRiders: selectedDamageRidersAfterCunningStrikeCost,
      weaponDamageDiceRollChoice: selectedDamageDiceChoice,
      cunningStrike: selectedCunningStrike,
    },
  });
}
function resolveReactionAttackDamageTransaction(input: {
  readonly resolutionInput: OpportunityAttackResolutionInput;
  readonly fillSet: ResolvedAttackFillSet;
  readonly preConsumptionState: BattleState;
  readonly target: BattleCreatureState;
  readonly attack: SupportedAttackActionOption;
  readonly effectiveAttackRoll: BattleAttackRollResult;
  readonly critical: boolean;
  readonly pendingAttackDamageReductions: readonly BattlePendingAttackDamageReduction[];
  readonly path: ReactionAttackDamagePath;
}): BattleResolutionResult {
  const {
    resolutionInput,
    fillSet,
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
    spatialFacts: fillSet.targetSpatialFacts,
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
        targetSpatialFacts: fillSet.targetSpatialFacts,
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
    spatialFacts: fillSet.targetSpatialFacts,
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
        facts: fillSet.targetSpatialFacts,
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
