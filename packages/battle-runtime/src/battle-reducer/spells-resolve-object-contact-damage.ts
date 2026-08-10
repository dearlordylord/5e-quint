// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-magical-effect-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION

import {
  nonEmptyArrayProperty,
  optionalProperty,
} from "../optional-property.ts";
import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import { Either } from "effect";
import { allocateBattleActiveEffectRefForCreature } from "../active-effect/execution-ref.ts";
import { characterExecutionWithObjectContactDamageRepeat } from "../character-execution-queries.ts";
import type { ObjectContactDamageRepeatSpellProcedureExecution } from "../character-execution.ts";
import {
  type ActionSpellBattleResolutionInput,
  type BattleAfterDamageEvent,
  type BattleActiveEffect,
  type BattleCreatureState,
  type BattleDroppedObjectOutcome,
  type BattleHoleId,
  type BattleObjectContactSavingThrowOutcomeHole,
  type BattleObjectContactTargetSpatialFact,
  type BattleObjectDropResolutionHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type BonusActionSpellBattleResolutionInput,
  type ObjectContactPenaltyActiveEffect,
  type SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import {
  maybeOpenInterruptWindow,
  openAfterDamageSequenceInterruptWindow,
} from "./interrupt-execution.ts";
import { spellReplayContinuation } from "./spell-reaction-continuation.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import {
  type BattleActiveEffectExecutionRef,
  type BattleObjectId,
  type BattleProcedureExecutionRef,
  type CombatantId,
} from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowHoles,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveHoles,
  fillsMatchingHoleIds,
} from "./damage-apply.ts";
import {
  battleDamageTargets,
  type BattleDamageTarget,
} from "./damage-target-projection.ts";
import { damageRelationshipDecisionFillCheck } from "./damage-relationship-decisions.ts";
import { deduplicateBattleHolesById } from "./hole-helpers.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";
import { spellCastInterruptFrame } from "./spell-cast-interrupt-frame.ts";
import {
  applyAvailableSourceDamageRollPenalty,
  damageAmountByTypeAfterTargetAdjustments,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";
import {
  applyPreparedSlotSpellDamage,
  savingThrowRollModeProjections,
  spellDamageByTypeForTarget,
  spellDamageHole,
  validateSpellDamageFill,
} from "./spells-damage-fills.ts";
import { spellInvocationEffectiveSpellLevel } from "./spells-effective-level.ts";
import { type SpellFillSet } from "./spells-resolve-fill-set.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";
import {
  spellManufacturedMetalObjectTargetFact,
  objectContactDamageSourceProcedureRef,
  spellObjectContactTargetsHole,
  spellObjectContactTargetsHoleId,
  spellObjectTargetHole,
} from "./spells-targeting.ts";
import {
  antimagicFieldOngoingSpellEffectRefForActiveEffect,
  ongoingSpellEffectSuppressedByAntimagicField,
} from "./antimagic-field-suppression.ts";
import {
  SPELL_MAGICAL_EFFECT_SOURCE,
  magicalEffectTargetsInterdictionMessage,
} from "./antimagic-field-magical-effect-interdiction.ts";
import { wardingBondSavingThrowFlatBonusProjectionsForTarget } from "./warding-bond.ts";

type ObjectContactDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "objectContactDamage" }
>;
type ObjectContactDamageRepeatInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "objectContactDamageRepeat" }
>;
type ObjectContactDamageAnyInvocation =
  | ObjectContactDamageInvocation
  | ObjectContactDamageRepeatInvocation;
type OkSpellFillSet = Extract<SpellFillSet, { readonly tag: "ok" }>;
type ObjectContactHoldingOrWearingRelation = Extract<
  BattleObjectContactTargetSpatialFact,
  { readonly kind: "spellObjectHoldingOrWearing" }
>["relation"];
type ObjectContactTargetSelection = {
  readonly tag: "ok";
  readonly targetIds: readonly CombatantId[];
  readonly spatialFacts: readonly BattleObjectContactTargetSpatialFact[];
  readonly holdingOrWearingByTarget: ReadonlyMap<
    CombatantId,
    ObjectContactHoldingOrWearingRelation
  >;
};
export function resolveObjectContactDamageSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<ObjectContactDamageInvocation>;
  readonly fillSet: OkSpellFillSet;
}): BattleResolutionResult {
  const unrelatedFills = objectContactDamageUnrelatedFillsMessage(
    input.fillSet,
    { allowObjectTarget: true, allowSpellCastReactionFacts: true },
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (unrelatedFills !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.input.state, "invalidFill", unrelatedFills);
  }
  /* v8 ignore stop */
  if (input.fillSet.objectTarget === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellObjectTargetHole(input.invocation),
    ]);
  }
  const objectTarget = input.fillSet.objectTarget;
  const metalFact = spellManufacturedMetalObjectTargetFact(
    objectTarget.spatialFacts.filter(
      (
        fact,
      ): fact is Extract<
        (typeof objectTarget.spatialFacts)[number],
        { readonly kind: "spellManufacturedMetalObjectTarget" }
      > => fact.kind === "spellManufacturedMetalObjectTarget",
    ),
    input.actorId,
    objectTarget.objectId,
    input.invocation,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (metalFact === null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object-contact damage requires a visible manufactured metal object within spell range.",
    );
  }
  /* v8 ignore stop */
  const contactSelection = validateObjectContactTargets({
    state: input.input.state,
    actorId: input.actorId,
    objectId: objectTarget.objectId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    requiresObjectWithinRange: false,
  });
  if (contactSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      contactSelection.hole,
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (contactSelection.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      contactSelection.message,
    );
  }
  /* v8 ignore stop */

  const spellCastReactionWindow = maybeOpenInterruptWindow(
    input.input.state,
    spellCastInterruptFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: contactSelection.targetIds,
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: spellReplayContinuation(input.input),
    }),
    input.input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  if (
    contactSelection.targetIds.length > 0 &&
    input.fillSet.damageRoll !== undefined
  ) {
    const spentResources = spendSpellCastResources({
      state: input.input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.input.state,
    });
    if (spentResources.tag === "invalid") {
      return spentResources;
    }
    const stagedEffect = applyObjectContactDamageActiveEffect({
      state: spentResources.state,
      actorId: input.actorId,
      objectId: objectTarget.objectId,
      invocation: input.invocation,
    });
    const damageResolution = resolveObjectContactDamage({
      state: stagedEffect,
      needsHolesState: input.input.state,
      errorState: input.input.state,
      subject: input.input.subject,
      fillSet: input.fillSet,
      actorId: input.actorId,
      invocation: input.invocation,
      objectId: objectTarget.objectId,
      targetIds: contactSelection.targetIds,
      contactFacts: contactSelection.spatialFacts,
      holdingOrWearingByTarget: contactSelection.holdingOrWearingByTarget,
    });
    if (damageResolution.tag !== "resolved") {
      return damageResolution;
    }
    return finishObjectContactDamageResolution({
      state: damageResolution.state,
      subject: input.input.subject,
      events: damageResolution.events,
      droppedObjects: damageResolution.droppedObjects,
      ...optionalProperty(
        "handledInterruptTrigger",
        input.input.handledInterruptTrigger,
      ),
    });
  }

  const damageResolution = resolveObjectContactDamage({
    state: input.input.state,
    errorState: input.input.state,
    subject: input.input.subject,
    fillSet: input.fillSet,
    actorId: input.actorId,
    invocation: input.invocation,
    objectId: objectTarget.objectId,
    targetIds: contactSelection.targetIds,
    contactFacts: contactSelection.spatialFacts,
    holdingOrWearingByTarget: contactSelection.holdingOrWearingByTarget,
  });
  if (damageResolution.tag !== "resolved") {
    return damageResolution;
  }
  const spentResources = spendSpellCastResources({
    state: damageResolution.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (spentResources.tag === "invalid") {
    return spentResources;
  }
  const effected = applyObjectContactDamageActiveEffect({
    state: spentResources.state,
    actorId: input.actorId,
    objectId: objectTarget.objectId,
    invocation: input.invocation,
  });
  return finishObjectContactDamageResolution({
    state: effected,
    subject: input.input.subject,
    events: damageResolution.events,
    droppedObjects: damageResolution.droppedObjects,
    ...optionalProperty(
      "handledInterruptTrigger",
      input.input.handledInterruptTrigger,
    ),
  });
}

export function resolveObjectContactDamageRepeatSpellAct(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<ObjectContactDamageRepeatInvocation>;
  readonly fillSet: OkSpellFillSet;
}): BattleResolutionResult {
  const unrelatedFills = objectContactDamageUnrelatedFillsMessage(
    input.fillSet,
    { allowObjectTarget: false, allowSpellCastReactionFacts: false },
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (unrelatedFills !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.input.state, "invalidFill", unrelatedFills);
  }
  /* v8 ignore stop */
  if (
    ongoingSpellEffectSuppressedByAntimagicField(
      input.input.state,
      antimagicFieldOngoingSpellEffectRefForActiveEffect(
        input.invocation.activeEffect,
      ),
    )
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Object-contact damage is suppressed by Antimagic Field.",
    );
  }
  const contactSelection = validateObjectContactTargets({
    state: input.input.state,
    actorId: input.actorId,
    objectId: input.invocation.activeEffect.objectId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    requiresObjectWithinRange: true,
  });
  if (contactSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      contactSelection.hole,
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (contactSelection.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      contactSelection.message,
    );
  }
  /* v8 ignore stop */
  const actionState = battleStateAfterTargetActionEarlyEndForActor(
    input.input.state,
    input.actorId,
  );
  const damageResolution = resolveObjectContactDamage({
    state: actionState,
    errorState: input.input.state,
    subject: input.input.subject,
    fillSet: input.fillSet,
    actorId: input.actorId,
    invocation: input.invocation,
    objectId: input.invocation.activeEffect.objectId,
    targetIds: contactSelection.targetIds,
    contactFacts: contactSelection.spatialFacts,
    holdingOrWearingByTarget: contactSelection.holdingOrWearingByTarget,
  });
  if (damageResolution.tag !== "resolved") {
    return damageResolution;
  }
  const spent = spendActivationResource(
    damageResolution.state.currentTurnResources,
    { kind: "bonusAction" },
  );
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }
  return finishObjectContactDamageResolution({
    state: { ...damageResolution.state, currentTurnResources: spent.right },
    subject: input.input.subject,
    events: damageResolution.events,
    droppedObjects: damageResolution.droppedObjects,
    ...optionalProperty(
      "handledInterruptTrigger",
      input.input.handledInterruptTrigger,
    ),
  });
}

function validateObjectContactTargets(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
  readonly invocation: BattleExecutableSpellInvocation<ObjectContactDamageAnyInvocation>;
  readonly fillSet: OkSpellFillSet;
  readonly requiresObjectWithinRange: boolean;
}):
  | {
      readonly tag: "needsHoles";
      readonly hole: ReturnType<typeof spellObjectContactTargetsHole>;
    }
  | { readonly tag: "invalid"; readonly message: string }
  | ObjectContactTargetSelection {
  const hole = spellObjectContactTargetsHole({
    state: input.state,
    sourceCombatantId: input.actorId,
    objectId: input.objectId,
    invocation: input.invocation,
    requiresObjectWithinRange: input.requiresObjectWithinRange,
  });
  const fill = input.fillSet.objectContactTargets;
  if (fill === undefined) {
    return { tag: "needsHoles", hole };
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    fill.holeId !==
    spellObjectContactTargetsHoleId({
      procedure: input.invocation.procedure,
      objectId: input.objectId,
    })
  ) {
    return {
      tag: "invalid",
      message:
        "Object-contact target fill must use the selected spell object-contact hole.",
    };
  }
  /* v8 ignore stop */
  const targetIds = fill.targetIds;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetIds.length !== new Set(targetIds).size) {
    return {
      tag: "invalid",
      message: "Object-contact target fill must not repeat a combatant.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (targetIds.some((targetId) => !input.state.combatants.has(targetId))) {
    return {
      tag: "invalid",
      message: "Object-contact targets must be combatants in this battle.",
    };
  }
  /* v8 ignore stop */
  const antimagicInterdiction = magicalEffectTargetsInterdictionMessage({
    state: input.state,
    source: SPELL_MAGICAL_EFFECT_SOURCE,
    targetIds,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (antimagicInterdiction !== null) {
    return { tag: "invalid", message: antimagicInterdiction };
  }
  /* v8 ignore stop */
  const rangeFacts = fill.spatialFacts.filter(
    (
      fact,
    ): fact is Extract<
      BattleObjectContactTargetSpatialFact,
      { readonly kind: "spellObjectWithinSpellRange" }
    > => fact.kind === "spellObjectWithinSpellRange",
  );
  const matchingRangeFacts = rangeFacts.filter(
    (fact) =>
      fact.sourceCombatantId === input.actorId &&
      fact.sourceProcedureRef === hole.objectContact.sourceProcedureRef &&
      fact.objectId === input.objectId &&
      fact.rangeFeet ===
        (input.invocation.procedure === "objectContactDamageRepeat"
          ? input.invocation.activeEffect.rangeFeet
          : input.invocation.rangeFeet),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.requiresObjectWithinRange && matchingRangeFacts.length !== 1) {
    return {
      tag: "invalid",
      message:
        "Repeated object-contact damage requires exactly one matching object-within-range witness.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!input.requiresObjectWithinRange && rangeFacts.length > 0) {
    return {
      tag: "invalid",
      message:
        "Initial object-contact damage does not use an object-within-range repeat witness.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (rangeFacts.length !== matchingRangeFacts.length) {
    return {
      tag: "invalid",
      message:
        "Object-within-range witness must match the selected spell object.",
    };
  }
  /* v8 ignore stop */
  const contactFacts = fill.spatialFacts.filter(
    (
      fact,
    ): fact is Extract<
      BattleObjectContactTargetSpatialFact,
      { readonly kind: "spellObjectPhysicalContact" }
    > => fact.kind === "spellObjectPhysicalContact",
  );
  const selectedTargetIds = new Set(targetIds);
  const matchingContactFacts = contactFacts.filter(
    (fact) =>
      fact.sourceCombatantId === input.actorId &&
      fact.sourceProcedureRef === hole.objectContact.sourceProcedureRef &&
      fact.objectId === input.objectId &&
      selectedTargetIds.has(fact.targetId),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (matchingContactFacts.length !== contactFacts.length) {
    return {
      tag: "invalid",
      message: "Physical-contact witnesses must match selected targets.",
    };
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    targetIds.some(
      (targetId) =>
        !matchingContactFacts.some((fact) => fact.targetId === targetId),
    )
  ) {
    return {
      tag: "invalid",
      message:
        "Every object-contact target must have a matching physical-contact witness.",
    };
  }
  /* v8 ignore stop */
  const holdingOrWearingFacts = fill.spatialFacts.filter(
    (
      fact,
    ): fact is Extract<
      BattleObjectContactTargetSpatialFact,
      { readonly kind: "spellObjectHoldingOrWearing" }
    > => fact.kind === "spellObjectHoldingOrWearing",
  );
  const matchingHoldingOrWearingFacts = holdingOrWearingFacts.filter(
    (fact) =>
      fact.sourceCombatantId === input.actorId &&
      fact.sourceProcedureRef === hole.objectContact.sourceProcedureRef &&
      fact.objectId === input.objectId &&
      selectedTargetIds.has(fact.targetId),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (matchingHoldingOrWearingFacts.length !== holdingOrWearingFacts.length) {
    return {
      tag: "invalid",
      message:
        "Holding-or-wearing witnesses must match selected object-contact targets.",
    };
  }
  /* v8 ignore stop */
  const holdingOrWearingTargets = new Set(
    matchingHoldingOrWearingFacts.map((fact) => fact.targetId),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (holdingOrWearingTargets.size !== matchingHoldingOrWearingFacts.length) {
    return {
      tag: "invalid",
      message:
        "Object-contact target fill must not repeat a holding-or-wearing witness for the same combatant.",
    };
  }
  /* v8 ignore stop */
  const holdingOrWearingByTarget = new Map<
    CombatantId,
    ObjectContactHoldingOrWearingRelation
  >(
    matchingHoldingOrWearingFacts.map((fact) => [fact.targetId, fact.relation]),
  );
  return {
    tag: "ok",
    targetIds,
    spatialFacts: fill.spatialFacts,
    holdingOrWearingByTarget,
  };
}

function resolveObjectContactDamage(input: {
  readonly state: BattleState;
  readonly needsHolesState?: BattleState;
  readonly errorState: BattleState;
  readonly subject:
    | ActionSpellBattleResolutionInput["subject"]
    | BonusActionSpellBattleResolutionInput["subject"];
  readonly fillSet: OkSpellFillSet;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<ObjectContactDamageAnyInvocation>;
  readonly objectId: BattleObjectId;
  readonly targetIds: readonly CombatantId[];
  readonly contactFacts: readonly BattleObjectContactTargetSpatialFact[];
  readonly holdingOrWearingByTarget: ReadonlyMap<
    CombatantId,
    ObjectContactHoldingOrWearingRelation
  >;
}):
  | {
      readonly tag: "resolved";
      readonly state: BattleState;
      readonly events: readonly BattleAfterDamageEvent[];
      readonly droppedObjects: readonly BattleDroppedObjectOutcome[];
    }
  | Extract<
      BattleResolutionResult,
      { readonly tag: "needsHoles" | "invalid" }
    > {
  const needsHolesState = input.needsHolesState ?? input.state;
  if (input.targetIds.length === 0) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      input.fillSet.damageRoll !== undefined ||
      input.fillSet.concentrationSavingThrows.length > 0 ||
      input.fillSet.damageDispositions.length > 0 ||
      input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
      input.fillSet.objectContactSavingThrowOutcome !== undefined ||
      input.fillSet.objectDropResolution !== undefined ||
      input.fillSet.sourceDamageRollPenaltyRolls.length > 0
    ) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.errorState,
        "invalidFill",
        "Object-contact damage fills are not valid when no contact creatures are selected.",
      );
    }
    /* v8 ignore stop */
    return {
      tag: "resolved",
      state: input.state,
      events: [],
      droppedObjects: [],
    };
  }
  const damageRoll = input.fillSet.damageRoll;
  if (damageRoll === undefined) {
    return needsHolesResult(needsHolesState, input.subject, [
      spellDamageHole(input.invocation),
    ]);
  }
  const damageValidation = validateSpellDamageFill(
    damageRoll,
    input.invocation,
    false,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.errorState, "invalidFill", damageValidation);
  }
  /* v8 ignore stop */
  const sourceCombatant = input.state.combatants.get(input.actorId);
  const damageTargets = battleDamageTargets({
    state: input.state,
    targetIds: input.targetIds,
    damageForTarget: (target) =>
      spellDamageByTypeForTarget(target, input.invocation, damageRoll),
  });
  const expectedSourcePenaltyHoles = damageTargets.flatMap(
    ({ damage: damageByType }) => {
      const hole = sourceDamageRollPenaltyRollHoleForDamageRoll(
        sourceCombatant,
        damageByType,
        damageRoll.holeId,
      );
      return hole === null ? [] : [hole];
    },
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      input.fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHoles,
    ) !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.errorState,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  const resolvedDamageTargets: BattleDamageTarget<number>[] = [];
  const unresolvedSourcePenaltyHoles: Array<
    Parameters<typeof deduplicateBattleHolesById>[0][number]
  > = [];
  for (const damageTarget of damageTargets) {
    const check = applyAvailableSourceDamageRollPenalty(
      sourceCombatant,
      damageTarget.damage,
      damageRoll.holeId,
      sourceDamageRollPenaltyRollForDamageRoll(
        input.fillSet.sourceDamageRollPenaltyRolls,
        sourceCombatant,
        damageTarget.damage,
        damageRoll.holeId,
      ),
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (check.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.errorState,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop */
    if (check.tag === "needsHoles") {
      unresolvedSourcePenaltyHoles.push(...check.holes);
      continue;
    }
    resolvedDamageTargets.push({
      target: damageTarget.target,
      damage: damageAmountByTypeAfterTargetAdjustments(
        input.state,
        damageTarget.target,
        check.damageByType,
      ),
    });
  }
  const missingSourcePenaltyHoles = deduplicateBattleHolesById(
    unresolvedSourcePenaltyHoles,
  );
  if (missingSourcePenaltyHoles.length > 0) {
    return needsHolesResult(needsHolesState, input.subject, [
      ...missingSourcePenaltyHoles,
    ]);
  }
  const concentrationSaves = resolvedDamageTargets.flatMap(
    ({ target, damage }) =>
      damageLifecycleConcentrationSavingThrowHoles({
        state: input.state,
        target,
        damageAmount: damage,
      }),
  );
  const missingConcentrationSaves = concentrationSaves.filter(
    (concentrationSave) =>
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ) === undefined,
  );
  if (missingConcentrationSaves.length > 0) {
    return needsHolesResult(
      needsHolesState,
      input.subject,
      missingConcentrationSaves,
    );
  }
  const concentrationSaveIds = new Set<BattleHoleId>(
    concentrationSaves.map((hole) => hole.holeId),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.concentrationSavingThrows.some(
      (fill) => !concentrationSaveIds.has(fill.holeId),
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.errorState,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  /* v8 ignore stop */
  const damageDispositionHoles = resolvedDamageTargets.flatMap(
    ({ target, damage }) => {
      const hole = zeroHitPointReplacementDispositionHole({
        damageSourceId: input.actorId,
        target,
        damageAmount: damage,
      });
      return hole === null ? [] : [hole];
    },
  );
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: input.fillSet.damageDispositions,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.errorState,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop */
  const missingDamageDispositionHoles = damageDispositionHoles.filter(
    (hole) =>
      damageDispositionFillFor(input.fillSet.damageDispositions, hole) ===
      undefined,
  );
  if (missingDamageDispositionHoles.length > 0) {
    return needsHolesResult(needsHolesState, input.subject, [
      ...missingDamageDispositionHoles,
    ]);
  }
  const hideousLaughterSaveChecks = resolvedDamageTargets.map(
    ({ target, damage }) => {
      const holes = damageLifecycleHideousLaughterDamageRepeatSaveHoles({
        state: input.state,
        target,
        damageAmount: damage,
      });
      return damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
        state: input.state,
        target,
        damageAmount: damage,
        fills: fillsMatchingHoleIds(
          input.fillSet.hideousLaughterDamageRepeatSaves,
          holes,
        ),
      });
    },
  );
  const invalidHideousLaughterSaveCheck = hideousLaughterSaveChecks.find(
    (check) => check.tag === "invalid",
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidHideousLaughterSaveCheck?.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.errorState,
      "invalidFill",
      invalidHideousLaughterSaveCheck.message,
    );
  }
  /* v8 ignore stop */
  const missingHideousLaughterSaveHoles = hideousLaughterSaveChecks.flatMap(
    (check) => (check.tag === "needsHoles" ? [...check.holes] : []),
  );
  if (missingHideousLaughterSaveHoles.length > 0) {
    return needsHolesResult(needsHolesState, input.subject, [
      ...missingHideousLaughterSaveHoles,
    ]);
  }
  const hideousLaughterSaveHoleIds = new Set<BattleHoleId>(
    hideousLaughterSaveChecks.flatMap((check) =>
      check.tag === "invalid" ? [] : check.holes.map((hole) => hole.holeId),
    ),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.hideousLaughterDamageRepeatSaves.some(
      (fill) => !hideousLaughterSaveHoleIds.has(fill.holeId),
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.errorState,
      "invalidFill",
      "Hideous Laughter damage repeat save fill must match a requested damaged target.",
    );
  }
  /* v8 ignore stop */
  const damagedHoldingOrWearingTargets =
    objectContactDamagedHoldingOrWearingTargets({
      damageTargets: resolvedDamageTargets,
      holdingOrWearingByTarget: input.holdingOrWearingByTarget,
    });
  const objectContactSaveHole = objectContactSavingThrowOutcomeHole({
    state: input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    objectId: input.objectId,
    targets: damagedHoldingOrWearingTargets,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    objectContactSaveHole === null &&
    input.fillSet.objectContactSavingThrowOutcome !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.errorState,
      "invalidFill",
      "Object-contact saving throw outcome is only valid for a damaged creature holding or wearing the spell object.",
    );
  }
  /* v8 ignore stop */
  if (
    objectContactSaveHole !== null &&
    input.fillSet.objectContactSavingThrowOutcome === undefined
  ) {
    return needsHolesResult(needsHolesState, input.subject, [
      objectContactSaveHole,
    ]);
  }
  if (
    objectContactSaveHole !== null &&
    input.fillSet.objectContactSavingThrowOutcome !== undefined
  ) {
    const saveValidation = objectContactSavingThrowFillValidation({
      fill: input.fillSet.objectContactSavingThrowOutcome,
      hole: objectContactSaveHole,
    });
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (saveValidation !== null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.errorState, "invalidFill", saveValidation);
    }
    /* v8 ignore stop */
  }
  const failedSaveTargetIds =
    input.fillSet.objectContactSavingThrowOutcome === undefined
      ? []
      : input.fillSet.objectContactSavingThrowOutcome.value.outcomes
          .filter((outcome) => !outcome.succeeded)
          .map((outcome) => outcome.targetId);
  const objectDropHole =
    failedSaveTargetIds.length === 0
      ? null
      : objectDropResolutionHole({
          actorId: input.actorId,
          invocation: input.invocation,
          objectId: input.objectId,
          targetIds: failedSaveTargetIds,
        });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    objectDropHole === null &&
    input.fillSet.objectDropResolution !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.errorState,
      "invalidFill",
      "Object drop resolution is only valid for failed object-contact saving throws.",
    );
  }
  /* v8 ignore stop */
  if (
    objectDropHole !== null &&
    input.fillSet.objectDropResolution === undefined
  ) {
    return needsHolesResult(needsHolesState, input.subject, [objectDropHole]);
  }
  if (
    objectDropHole !== null &&
    input.fillSet.objectDropResolution !== undefined
  ) {
    const dropValidation = objectDropResolutionFillValidation({
      fill: input.fillSet.objectDropResolution,
      hole: objectDropHole,
    });
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (dropValidation !== null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.errorState, "invalidFill", dropValidation);
    }
    /* v8 ignore stop */
  }
  const droppedObjects =
    input.fillSet.objectDropResolution?.value.outcomes.flatMap(
      (outcome): readonly BattleDroppedObjectOutcome[] =>
        outcome.result.kind === "dropped"
          ? [
              {
                kind: "objectDropped",
                actorId: outcome.targetId,
                objectId: input.objectId,
                source: {
                  kind: "spell",
                  sourceCombatantId: input.actorId,
                  sourceProcedureRef: objectContactDamageSourceProcedureRef(
                    input.invocation,
                  ),
                },
              },
            ]
          : [],
    ) ?? [];
  const penaltyTargetIds =
    input.fillSet.objectDropResolution?.value.outcomes.flatMap(
      (outcome): readonly CombatantId[] =>
        outcome.result.kind === "notDropped" ? [outcome.targetId] : [],
    ) ?? [];
  const damageDispositionByTargetId = new Map(
    resolvedDamageTargets.map(({ target }) => [
      target.combatantId,
      damageDispositionForTarget(
        damageDispositionHoles,
        input.fillSet.damageDispositions,
        target.combatantId,
      ),
    ]),
  );
  const relationshipCheck = damageRelationshipDecisionFillCheck({
    state: input.state,
    damageEventHoleId: damageRoll.holeId,
    damageSourceId: input.actorId,
    targets: resolvedDamageTargets.flatMap(({ target, damage }) => {
      return damage > 0
        ? [
            {
              targetId: target.combatantId,
              damageAmount: toDamageAmount(damage),
              damageDisposition: damageDispositionByTargetId.get(
                target.combatantId,
              ),
            },
          ]
        : [];
    }),
    spatialFacts: input.fillSet.targetSpatialFacts,
    decisionsByRelationshipHole: input.fillSet.damageRelationshipDecisions,
  });
  if (relationshipCheck.tag === "needsHoles") {
    return needsHolesResult(
      input.state,
      input.subject,
      relationshipCheck.holes,
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.errorState,
      "invalidFill",
      relationshipCheck.message,
    );
  }
  /* v8 ignore stop */
  const damaged = resolvedDamageTargets.reduce((state, damageTarget) => {
    const targetId = damageTarget.target.combatantId;
    const damageAmount = damageTarget.damage;
    const target = state.combatants.get(targetId);
    /* v8 ignore start -- Validated target IDs are unique current members; an earlier damage application can remove only its own zero-HP familiar, never a distinct later target. */
    if (target === undefined) {
      return state;
    }
    /* v8 ignore stop */
    const concentrationSave = concentrationSavingThrowHole(
      target,
      damageAmount,
    );
    const concentrationLifecycleHoles =
      damageLifecycleConcentrationSavingThrowHoles({
        state,
        target,
        damageAmount,
      });
    const concentrationLifecycleFills = fillsMatchingHoleIds(
      input.fillSet.concentrationSavingThrows,
      concentrationLifecycleHoles,
    );
    const hideousLaughterLifecycleHoles =
      damageLifecycleHideousLaughterDamageRepeatSaveHoles({
        state,
        target,
        damageAmount,
      });
    const hideousLaughterLifecycleFills = fillsMatchingHoleIds(
      input.fillSet.hideousLaughterDamageRepeatSaves,
      hideousLaughterLifecycleHoles,
    );
    return applyPreparedSlotSpellDamage(state, targetId, damageAmount, {
      concentrationSavingThrow:
        concentrationSave === null
          ? undefined
          : concentrationSavingThrowFillFor(
              concentrationLifecycleFills,
              concentrationSave,
            ),
      wardingBondDamageShareConcentrationSavingThrows:
        concentrationLifecycleFills,
      damageDisposition: damageDispositionByTargetId.get(targetId),
      hideousLaughterDamageRepeatSaves: hideousLaughterLifecycleFills,
      damageSourceId: input.actorId,
      spatialFacts: input.fillSet.targetSpatialFacts,
      ...optionalProperty("relationshipDecisions", relationshipCheck.decisions),
    });
  }, input.state);
  const penalized = applyObjectContactPenalties({
    state: damaged,
    actorId: input.actorId,
    invocation: input.invocation,
    objectId: input.objectId,
    targetIds: penaltyTargetIds,
  });
  return {
    tag: "resolved",
    state: penalized,
    droppedObjects,
    events: resolvedDamageTargets.map(({ target, damage }) => ({
      damageSourceId: input.actorId,
      damagedId: target.combatantId,
      damageAmount: toDamageAmount(damage),
      reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
        facts: input.contactFacts,
        damagedId: target.combatantId,
        damageSourceId: input.actorId,
      }),
    })),
  };
}

function objectContactDamagedHoldingOrWearingTargets(input: {
  readonly damageTargets: readonly BattleDamageTarget<number>[];
  readonly holdingOrWearingByTarget: ReadonlyMap<
    CombatantId,
    ObjectContactHoldingOrWearingRelation
  >;
}): readonly BattleCreatureState[] {
  return input.damageTargets.flatMap(({ target, damage }) => {
    const relation = input.holdingOrWearingByTarget.get(target.combatantId);
    if (relation === undefined) {
      return [];
    }
    return damage <= 0 ? [] : [target];
  });
}

function objectContactSavingThrowOutcomeHole(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<ObjectContactDamageAnyInvocation>;
  readonly objectId: BattleObjectId;
  readonly targets: readonly BattleCreatureState[];
}): BattleObjectContactSavingThrowOutcomeHole | null {
  if (input.targets.length === 0) {
    return null;
  }
  const key = objectContactSavingThrowOutcomeHoleKey({
    actorId: input.actorId,
    procedureRef: objectContactDamageSourceProcedureRef(input.invocation),
    objectId: input.objectId,
  });
  return {
    kind: "savingThrowOutcome",
    outcomeTargeting: "targetList",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `Spell holding or wearing Constitution save`,
    objectContactSave: {
      sourceCombatantId: input.actorId,
      sourceProcedureRef: objectContactDamageSourceProcedureRef(
        input.invocation,
      ),
      objectId: input.objectId,
      targetIds: input.targets.map((target) => target.combatantId),
    },
    ability: "con",
    dc: { kind: "caster_spell_save_dc" },
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(input.state, "con"),
    targetFlatBonuses: input.targets.flatMap(
      wardingBondSavingThrowFlatBonusProjectionsForTarget,
    ),
  };
}

function objectContactSavingThrowOutcomeHoleKey(input: {
  readonly actorId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly objectId: BattleObjectId;
}): string {
  return `battle:spell:object-contact-damage:holding-wearing-save:${input.actorId}:${input.procedureRef}:${input.objectId}`;
}

/* v8 ignore start -- Malformed object-contact save witness: discovery fixes the object save hole, excludes area facts, and names each holding-or-wearing target exactly once. */
function objectContactSavingThrowFillValidation(input: {
  readonly fill: Extract<
    OkSpellFillSet["objectContactSavingThrowOutcome"],
    object
  >;
  readonly hole: BattleObjectContactSavingThrowOutcomeHole;
}): string | null {
  if (input.fill.holeId !== input.hole.holeId) {
    return "Object-contact saving throw outcome must use the selected spell object save hole.";
  }
  if ("area" in input.fill.value) {
    return "Object-contact saving throw outcome must not include area facts.";
  }
  return exactOutcomeTargetsValidation({
    outcomes: input.fill.value.outcomes,
    targetIds: input.hole.objectContactSave.targetIds,
    message:
      "Object-contact saving throw outcomes must match damaged holding-or-wearing targets exactly once.",
  });
}
/* v8 ignore stop */

function objectDropResolutionHole(input: {
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<ObjectContactDamageAnyInvocation>;
  readonly objectId: BattleObjectId;
  readonly targetIds: readonly CombatantId[];
}): BattleObjectDropResolutionHole {
  const key = objectDropResolutionHoleKey({
    actorId: input.actorId,
    procedureRef: objectContactDamageSourceProcedureRef(input.invocation),
    objectId: input.objectId,
  });
  return {
    kind: "objectDropResolution",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: `Spell object drop resolution`,
    objectDrop: {
      sourceCombatantId: input.actorId,
      sourceProcedureRef: objectContactDamageSourceProcedureRef(
        input.invocation,
      ),
      objectId: input.objectId,
      targetIds: input.targetIds,
    },
  };
}

function objectDropResolutionHoleKey(input: {
  readonly actorId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly objectId: BattleObjectId;
}): string {
  return `battle:spell:object-contact-damage:drop-resolution:${input.actorId}:${input.procedureRef}:${input.objectId}`;
}

function objectDropResolutionFillValidation(input: {
  readonly fill: Extract<OkSpellFillSet["objectDropResolution"], object>;
  readonly hole: BattleObjectDropResolutionHole;
}): string | null {
  if (input.fill.holeId !== input.hole.holeId) {
    return "Object drop resolution must use the selected spell object drop hole.";
  }
  return exactOutcomeTargetsValidation({
    outcomes: input.fill.value.outcomes,
    targetIds: input.hole.objectDrop.targetIds,
    message:
      "Object drop resolution outcomes must match failed object-contact saves exactly once.",
  });
}

/* v8 ignore start -- Malformed outcome target set: callers supply targets from their discovered typed holes, so duplicate, missing, and unrelated target ids are forged raw fills. */
function exactOutcomeTargetsValidation(input: {
  readonly outcomes: readonly { readonly targetId: CombatantId }[];
  readonly targetIds: readonly CombatantId[];
  readonly message: string;
}): string | null {
  const outcomeTargetIds = input.outcomes.map((outcome) => outcome.targetId);
  if (outcomeTargetIds.length !== new Set(outcomeTargetIds).size) {
    return input.message;
  }
  const targetIds = new Set(input.targetIds);
  if (
    outcomeTargetIds.length !== targetIds.size ||
    outcomeTargetIds.some((targetId) => !targetIds.has(targetId))
  ) {
    return input.message;
  }
  return null;
}
/* v8 ignore stop */

function applyObjectContactPenalties(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<ObjectContactDamageAnyInvocation>;
  readonly objectId: BattleObjectId;
  readonly targetIds: readonly CombatantId[];
}): BattleState {
  if (input.targetIds.length === 0) {
    return input.state;
  }
  const sourceEffectRef =
    input.invocation.procedure === "objectContactDamageRepeat"
      ? input.invocation.activeEffect.effectRef
      : input.state.combatants
          .get(input.actorId)
          ?.activeEffects.find(
            (
              effect,
            ): effect is Extract<
              BattleActiveEffect,
              { readonly kind: "spellObjectContactDamage" }
            > =>
              effect.kind === "spellObjectContactDamage" &&
              effect.sourceProcedureRef === input.invocation.sourceProcedureRef,
          )?.effectRef;
  if (sourceEffectRef === undefined) {
    return input.state;
  }
  if (
    !objectContactDamageEffectIsActive({
      state: input.state,
      actorId: input.actorId,
      effectRef: sourceEffectRef,
    })
  ) {
    return input.state;
  }
  let combatants = input.state.combatants;
  for (const targetId of input.targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const effect: ObjectContactPenaltyActiveEffect = {
      kind: "selfAttackRollAndAbilityCheckRollMode",
      sourceEffectRef,
      sourceProcedureRef: objectContactDamageSourceProcedureRef(
        input.invocation,
      ),
      sourceCombatantId: input.actorId,
      mode: "disadvantage",
      expiresAt: {
        kind: "startOfTurn",
        combatantId: input.actorId,
      },
    };
    combatants = new Map(combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter(
          (candidate) =>
            !(
              candidate.kind === "selfAttackRollAndAbilityCheckRollMode" &&
              candidate.sourceEffectRef === effect.sourceEffectRef
            ),
        ),
        effect,
      ],
    });
  }
  return { ...input.state, combatants };
}

function objectContactDamageEffectIsActive(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly effectRef: BattleActiveEffectExecutionRef;
}): boolean {
  const actor = input.state.combatants.get(input.actorId);
  return (
    actor?.activeEffects.some(
      (effect) =>
        effect.kind === "spellObjectContactDamage" &&
        effect.effectRef === input.effectRef,
    ) ?? false
  );
}

function applyObjectContactDamageActiveEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
  readonly invocation: BattleExecutableSpellInvocation<ObjectContactDamageInvocation>;
}): BattleState {
  const actor = input.state.combatants.get(input.actorId);
  /* v8 ignore start -- Admitted object-contact spell invocations retain a character actor across resource and effect state transitions. */
  if (actor === undefined) {
    return input.state;
  }
  /* v8 ignore stop */
  const allocation = allocateBattleActiveEffectRefForCreature({
    owner: actor,
  });
  const effect = {
    kind: "spellObjectContactDamage" as const,
    effectRef: allocation.effectRef,
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    sourceCombatantId: input.actorId,
    sourceSpellLevel: spellInvocationEffectiveSpellLevel(input.invocation),
    objectId: input.objectId,
    rangeFeet: input.invocation.rangeFeet,
    damage: input.invocation.damage,
    startedOn: {
      actorId: input.actorId,
      round: input.state.initiative.round,
    },
    expiresAt: {
      kind: "concentration" as const,
      combatantId: input.actorId,
      durationTicks: input.invocation.durationTicks,
    },
  } satisfies Extract<
    BattleActiveEffect,
    { readonly kind: "spellObjectContactDamage" }
  >;
  const owner = allocation.owner;
  if (owner.origin.kind !== "character") return input.state;
  const repeatExecution = {
    procedure: "objectContactDamageRepeat" as const,
    activeEffectRef: effect.effectRef,
    activeEffectSourceProcedureRef: effect.sourceProcedureRef,
  } satisfies ObjectContactDamageRepeatSpellProcedureExecution;
  return {
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.actorId, {
      ...owner,
      activeEffects: [
        ...actor.activeEffects.filter(
          (candidate) =>
            !(
              candidate.kind === "spellObjectContactDamage" &&
              candidate.sourceProcedureRef === effect.sourceProcedureRef
            ),
        ),
        effect,
      ],
      origin: {
        ...owner.origin,
        execution: characterExecutionWithObjectContactDamageRepeat(
          owner.origin.execution,
          repeatExecution,
        ),
      },
    }),
  };
}

function finishObjectContactDamageResolution(input: {
  readonly state: BattleState;
  readonly subject:
    | ActionSpellBattleResolutionInput["subject"]
    | BonusActionSpellBattleResolutionInput["subject"];
  readonly events: readonly BattleAfterDamageEvent[];
  readonly droppedObjects: readonly BattleDroppedObjectOutcome[];
  readonly handledInterruptTrigger?: BattleInterruptTrigger;
}): BattleResolutionResult {
  if (input.events.length > 0) {
    const afterDamageReactionWindow = openAfterDamageSequenceInterruptWindow({
      state: input.state,
      subject: input.subject,
      events: input.events,
      objectDamages: [],
      objectIgnitions: [],
      droppedObjects: input.droppedObjects,
      handledInterruptTrigger: input.handledInterruptTrigger,
    });
    if (afterDamageReactionWindow.tag === "needsHoles") {
      return afterDamageReactionWindow;
    }
  }
  return {
    tag: "resolved",
    state: input.state,
    snapshot: snapshotBattle(input.state),
    ...nonEmptyArrayProperty("droppedObjects", input.droppedObjects),
  };
}

function objectContactDamageUnrelatedFillsMessage(
  fillSet: OkSpellFillSet,
  options: {
    readonly allowObjectTarget: boolean;
    readonly allowSpellCastReactionFacts: boolean;
  },
): string | null {
  if (
    fillSet.targetId !== undefined ||
    (!options.allowObjectTarget && fillSet.objectTarget !== undefined) ||
    fillSet.targetSpatialFacts.length > 0 ||
    fillSet.targetAllocation !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.attackSequencePartFills.some(
      (attackSequencePartFill) =>
        attackSequencePartFill.target !== undefined ||
        attackSequencePartFill.attackRoll !== undefined ||
        attackSequencePartFill.mirrorImageDuplicateRoll !== undefined ||
        attackSequencePartFill.damageRoll !== undefined,
    ) ||
    fillSet.attackRoll !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.skillChoice !== undefined ||
    fillSet.targetAbilityChoices !== undefined ||
    fillSet.abilityChoice !== undefined ||
    fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    fillSet.commandOptionChoice !== undefined ||
    fillSet.selfTransformationModeChoice !== undefined ||
    fillSet.conditionChoice !== undefined ||
    fillSet.areaChoice !== undefined ||
    fillSet.teleportDestination !== undefined ||
    fillSet.dancingLightsPlacement !== undefined ||
    fillSet.damageTypeChoice !== undefined ||
    (!options.allowSpellCastReactionFacts &&
      fillSet.reactionSpellTargetFacts.length > 0) ||
    fillSet.mirrorImageDuplicateRoll !== undefined ||
    fillSet.movement !== undefined ||
    fillSet.spellDamageReductionRolls.length > 0 ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined
  ) {
    return options.allowObjectTarget
      ? "Object-contact damage uses only object target, contact target, damage, and damage lifecycle fills."
      : "Repeated object-contact damage uses only contact target, damage, and damage lifecycle fills.";
  }
  return null;
}
