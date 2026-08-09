// Shared object-target spell attack resolution for direct casts and readied releases.

import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import {
  type ActionSpellBattleResolutionInput,
  type BattleExecutableSpellInvocation,
  type BattleObjectDamageOutcome,
  type BattleObjectIgnitionOutcome,
  type BattleResolutionResult,
  type BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  nonEmptyArrayProperty,
  optionalProperty,
} from "../optional-property.ts";
import { attackRollIsCriticalHit } from "./attack-resolution.ts";
import {
  attackRollHoleWithD20TestNaturalOneRerollOption,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
  effectiveD20TestNaturalOneRerollAttackRoll,
} from "./d20-test-natural-one-reroll.ts";
import {
  objectTargetAttackNeedsSightFact,
  attackRollModeMatches,
  consumeSelfAttackRollEffects,
  requiredSpellObjectTargetAttackRollMode,
} from "./attack-roll.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { spellReplayContinuation } from "./spell-reaction-continuation.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import {
  spellCastInterruptFrame,
  spellCastMetamagicApplicationsInput,
} from "./spell-cast-interrupt-frame.ts";
import { invalidResult } from "./result-helpers.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import {
  spellAttackRerollUnsupportedIssue,
  spellDamageRerollUnsupportedIssue,
} from "./spell-reroll-issues.ts";
import {
  transmutedSpellDamageInvocation,
  type SpellMetamagicApplicationFact,
} from "./metamagic-support.ts";
import {
  spellCastingTimeResourceForSpellCast,
  spendSpellCastResources,
} from "./spells-resolve-resources.ts";
import {
  applyAvailableSourceDamageRollPenalty,
  sourceDamageRollPenaltyRollForDamageRoll,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";
import {
  applySpellLightEmitterEffects,
  spellObjectDamageByType,
  spellObjectDamageOutcomeFromDamageByType,
  spellObjectIgnitionFact,
  spellObjectTargetFact,
  spellObjectTargetSightFact,
  spellObjectAttackRollHole,
  spellDamageHole,
  validateSpellDamageFill,
  type RuntimeExecutableDamageSpellProcedure,
} from "./spells-holes-fills.ts";
import type { SpellFillSet } from "./spells-resolve-fill-set.ts";
import { endHeldLightSpellEffect } from "./spells-holes-fills.ts";

type SpellProcedureActionCostOverride = "magicAction" | "bonusAction";

type ObjectTargetSpellAttackInvocation =
  | Extract<
      BattleExecutableSpellInvocation,
      { readonly procedure: "heldLightHurl" }
    >
  | Extract<
      RuntimeExecutableDamageSpellProcedure,
      { readonly procedure: "spellAttackDamage" }
    >;

type ObjectTargetSpellAttackFillSet = Extract<
  SpellFillSet,
  { readonly tag: "ok" }
> & {
  readonly objectTarget: NonNullable<
    Extract<SpellFillSet, { readonly tag: "ok" }>["objectTarget"]
  >;
};

type ObjectTargetSpellAttackInput = {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: ObjectTargetSpellAttackInvocation;
  readonly fillSet: ObjectTargetSpellAttackFillSet;
};

type DirectCastObjectTargetInput = ObjectTargetSpellAttackInput & {
  readonly actionCostOverride?: SpellProcedureActionCostOverride;
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
};

type ReadiedObjectTargetInput = ObjectTargetSpellAttackInput;

type ObjectTargetSpellAttackCoreInput = ObjectTargetSpellAttackInput & {
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
};

type ObjectTargetSpellAttackCoreResult =
  | Exclude<BattleResolutionResult, { readonly tag: "resolved" }>
  | {
      readonly tag: "terminal";
      readonly state: BattleState;
      readonly objectDamages: readonly BattleObjectDamageOutcome[];
      readonly objectIgnitions: readonly BattleObjectIgnitionOutcome[];
    };

export function stateAfterResolvedHeldLightHurl(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
): BattleState {
  return invocation.procedure === "heldLightHurl"
    ? endHeldLightSpellEffect(state, actorId, invocation)
    : state;
}

export function resolveDirectCastObjectTarget(
  input: DirectCastObjectTargetInput,
): BattleResolutionResult {
  const spellCastReactionWindow = maybeOpenInterruptWindow(
    input.input.state,
    spellCastInterruptFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: spellCastingTimeResourceForSpellCast({
        invocation: input.invocation,
        ...optionalProperty("actionCostOverride", input.actionCostOverride),
      }),
      ...spellCastMetamagicApplicationsInput(input.metamagicApplications ?? []),
      continuation: spellReplayContinuation(input.input),
    }),
    input.input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }
  const coreResult = resolveObjectTargetSpellAttackCore(input);
  if (coreResult.tag !== "terminal") {
    return coreResult;
  }
  const resourced = spendSpellCastResources({
    state: coreResult.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...optionalProperty("actionCostOverride", input.actionCostOverride),
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
  if (resourced.tag !== "resolved") {
    return resourced;
  }
  return resolvedObjectTargetSpellAttackResult({
    ...coreResult,
    state: resourced.state,
  });
}

export function resolveReadiedSpellObjectTarget(
  input: ReadiedObjectTargetInput,
): BattleResolutionResult {
  const coreResult = resolveObjectTargetSpellAttackCore(input);
  if (coreResult.tag !== "terminal") {
    return coreResult;
  }
  return resolvedObjectTargetSpellAttackResult(coreResult);
}

function resolveObjectTargetSpellAttackCore(
  input: ObjectTargetSpellAttackCoreInput,
): ObjectTargetSpellAttackCoreResult {
  const objectFact = spellObjectTargetFact(
    input.fillSet.objectTarget.spatialFacts.filter(
      (
        fact,
      ): fact is Extract<
        (typeof input.fillSet.objectTarget.spatialFacts)[number],
        { readonly kind: "spellObjectTarget" }
      > => fact.kind === "spellObjectTarget",
    ),
    input.actorId,
    input.fillSet.objectTarget.objectId,
    input.invocation,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (objectFact === null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell object target must include a matching table-supplied range and object Armor Class fact.",
    );
  }
  /* v8 ignore stop */
  const damageInvocation = transmutedSpellDamageInvocation(
    input.invocation,
    input.metamagicApplications,
  );
  const sightFact = spellObjectTargetSightFact(
    input.fillSet.objectTarget.spatialFacts.filter(
      (
        fact,
      ): fact is Extract<
        (typeof input.fillSet.objectTarget.spatialFacts)[number],
        { readonly kind: "spellObjectTargetSight" }
      > => fact.kind === "spellObjectTargetSight",
    ),
    input.actorId,
    input.fillSet.objectTarget.objectId,
    input.invocation,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    sightFact === null &&
    objectTargetAttackNeedsSightFact(
      input.input.state,
      input.fillSet.objectTarget.objectId,
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell object target must include a matching table-supplied object sight fact.",
    );
  }
  /* v8 ignore stop */
  const ignitionFact =
    input.invocation.procedure === "spellAttackDamage" &&
    input.invocation.objectHitEffect.kind === "igniteFlammableUnattended"
      ? spellObjectIgnitionFact(
          input.fillSet.objectTarget.spatialFacts.filter(
            (
              fact,
            ): fact is Extract<
              (typeof input.fillSet.objectTarget.spatialFacts)[number],
              { readonly kind: "spellObjectIgnition" }
            > => fact.kind === "spellObjectIgnition",
          ),
          input.actorId,
          input.fillSet.objectTarget.objectId,
          input.invocation,
        )
      : null;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.invocation.procedure === "spellAttackDamage" &&
    input.invocation.objectHitEffect.kind === "igniteFlammableUnattended" &&
    ignitionFact === null
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell object target must include a matching table-supplied object ignition fact.",
    );
  }
  /* v8 ignore stop */

  const requiredRollMode = requiredSpellObjectTargetAttackRollMode(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.objectTarget.objectId,
    sightFact?.attackerCanSeeObject,
  );
  if (input.fillSet.attackRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellObjectAttackRollHole(input.invocation, requiredRollMode),
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!attackRollResultIsValid(input.fillSet.attackRoll)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  /* v8 ignore stop */
  const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
    input.fillSet.attackRoll,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spellAttackRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      spellAttackRerollIssue,
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!attackRollModeMatches(input.fillSet.attackRoll, requiredRollMode)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack roll mode does not match the current attack-roll rule.",
    );
  }
  /* v8 ignore stop */
  if (
    d20TestNaturalOneRerollRollDecisionRequired({
      actor: input.input.state.combatants.get(input.actorId),
      originalNaturalD20: Number(input.fillSet.attackRoll.naturalD20),
      rollMode: input.fillSet.attackRoll.rollMode,
      rolledD20s: input.fillSet.attackRoll.rolledD20s,
      decision: input.fillSet.attackRoll.d20TestNaturalOneReroll,
    })
  ) {
    return needsHolesResult(input.input.state, input.input.subject, [
      attackRollHoleWithD20TestNaturalOneRerollOption(
        spellObjectAttackRollHole(input.invocation, requiredRollMode),
      ),
    ]);
  }
  const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollRollIssue({
    actor: input.input.state.combatants.get(input.actorId),
    total: input.fillSet.attackRoll.total,
    originalNaturalD20: Number(input.fillSet.attackRoll.naturalD20),
    rollMode: input.fillSet.attackRoll.rollMode,
    rolledD20s: input.fillSet.attackRoll.rolledD20s,
    decision: input.fillSet.attackRoll.d20TestNaturalOneReroll,
    requiredRollMode,
    otherD20RerollPresent:
      input.fillSet.attackRoll.spellAttackReroll !== undefined,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (d20TestNaturalOneRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      d20TestNaturalOneRerollIssue,
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.attackRoll.activatedOngoingFeatureProcedureRef !==
      undefined ||
    input.fillSet.attackRoll.missToHitReplacementProcedureRef !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object-target spell attacks do not use combatant attack-roll feature selections.",
    );
  }
  /* v8 ignore stop */

  const effectiveAttackRoll = effectiveD20TestNaturalOneRerollAttackRoll(
    input.fillSet.attackRoll,
  );
  const hit = attackRollHits(effectiveAttackRoll, objectFact.armorClass);
  const critical = attackRollIsCriticalHit(effectiveAttackRoll);
  const attackRolledState = consumeSelfAttackRollEffects(
    {
      ...input.input.state,
      currentTurnResources: {
        ...input.input.state.currentTurnResources,
        attackRollMadeThisTurn: true,
      },
    },
    input.actorId,
  );
  const remarkableAthleteMovement = resolveRemarkableAthleteCriticalHitMovement(
    {
      state: attackRolledState,
      subject: input.input.subject,
      attackerId: input.actorId,
      scoredCriticalHit: hit && critical,
      fills: input.fillSet,
    },
  );
  if (remarkableAthleteMovement.tag === "result") {
    return remarkableAthleteMovement.result;
  }
  const postRemarkableAthleteMovementState = remarkableAthleteMovement.state;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !hit &&
    (input.fillSet.damageRoll != null ||
      input.fillSet.damageDispositions.length > 0 ||
      input.fillSet.sourceDamageRollPenaltyRolls.length > 0)
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell damage can only be filled after a hit.",
    );
  }
  /* v8 ignore stop */
  if (!hit) {
    return {
      tag: "terminal",
      state: stateAfterResolvedHeldLightHurl(
        postRemarkableAthleteMovementState,
        input.actorId,
        input.invocation,
      ),
      objectDamages: [],
      objectIgnitions: [],
    };
  }
  if (input.fillSet.damageRoll == null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (input.fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop */
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [spellDamageHole(damageInvocation, critical)],
    );
  }
  const damageValidation = validateSpellDamageFill(
    input.fillSet.damageRoll,
    damageInvocation,
    critical,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
  const spellDamageRerollIssue = spellDamageRerollUnsupportedIssue(
    input.fillSet.damageRoll,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spellDamageRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      spellDamageRerollIssue,
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.spellDamageReductionRolls.length > 0
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object-target spell damage does not use combatant damage, Concentration, or spell-reduction fills.",
    );
  }
  /* v8 ignore stop */
  const objectDamageByType = spellObjectDamageByType(
    damageInvocation,
    input.fillSet.damageRoll,
  );
  const objectDamageSource = postRemarkableAthleteMovementState.combatants.get(
    input.actorId,
  );
  const expectedSourcePenaltyHole =
    sourceDamageRollPenaltyRollHoleForDamageRoll(
      objectDamageSource,
      objectDamageByType,
      input.fillSet.damageRoll.holeId,
    );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      input.fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  const sourceDamageRollPenaltyRoll = sourceDamageRollPenaltyRollForDamageRoll(
    input.fillSet.sourceDamageRollPenaltyRolls,
    objectDamageSource,
    objectDamageByType,
    input.fillSet.damageRoll.holeId,
  );
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    objectDamageSource,
    objectDamageByType,
    input.fillSet.damageRoll.holeId,
    sourceDamageRollPenaltyRoll,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sourcePenalty.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  if (sourcePenalty.tag === "needsHoles") {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [...sourcePenalty.holes],
    );
  }

  const lit = applySpellLightEmitterEffects(
    postRemarkableAthleteMovementState,
    input.actorId,
    { kind: "object", objectId: input.fillSet.objectTarget.objectId },
    input.invocation,
  );
  const objectDamage = spellObjectDamageOutcomeFromDamageByType({
    objectId: input.fillSet.objectTarget.objectId,
    damageType: damageInvocation.damage.damageType,
    damageByType: sourcePenalty.damageByType,
    disposition: objectFact.damageDisposition,
  });
  const objectIgnitions =
    ignitionFact?.disposition.kind === "flammableUnattended"
      ? [
          {
            kind: "startsBurning" as const,
            objectId: input.fillSet.objectTarget.objectId,
            sourceCombatantId: input.actorId,
            sourceProcedureRef: input.invocation.sourceProcedureRef,
          },
        ]
      : [];

  return {
    tag: "terminal",
    state: stateAfterResolvedHeldLightHurl(
      lit,
      input.actorId,
      input.invocation,
    ),
    objectDamages: [objectDamage],
    objectIgnitions,
  };
}

function resolvedObjectTargetSpellAttackResult(input: {
  readonly state: BattleState;
  readonly objectDamages: readonly BattleObjectDamageOutcome[];
  readonly objectIgnitions: readonly BattleObjectIgnitionOutcome[];
}): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  return {
    tag: "resolved",
    state: input.state,
    snapshot: snapshotBattle(input.state),
    ...nonEmptyArrayProperty("objectDamages", input.objectDamages),
    ...nonEmptyArrayProperty("objectIgnitions", input.objectIgnitions),
  };
}
