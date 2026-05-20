// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage

import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import { Either } from "effect";
import {
  maybeOpenReactionWindow,
  openAfterDamageSequenceReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleAfterDamageEvent,
  type BattleHoleId,
  type BattleObjectContactTargetSpatialFact,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { BattleReactionTrigger } from "../battle-reaction-triggers.ts";
import {
  battleSpellEffectOccurrenceId,
  type BattleObjectId,
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
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./sanctuary-targeting-interdiction.ts";
import { spellCastReactionFrame } from "./spell-cast-reaction-frame.ts";
import {
  applyPreparedSlotSpellDamage,
  spellDamageAmountForTarget,
  spellDamageHole,
  validateSpellDamageFill,
} from "./spells-damage-fills.ts";
import { type SpellFillSet } from "./spells-resolve-fill-set.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";
import {
  spellManufacturedMetalObjectTargetFact,
  spellObjectContactTargetsHole,
  spellObjectContactTargetsHoleId,
  spellObjectTargetHole,
} from "./spells-targeting.ts";

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

export function resolveObjectContactDamageSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: ObjectContactDamageInvocation;
  readonly fillSet: OkSpellFillSet;
}): BattleResolutionResult {
  const unrelatedFills = objectContactDamageUnrelatedFillsMessage(
    input.fillSet,
    { allowObjectTarget: true, allowSpellCastReactionFacts: true },
  );
  if (unrelatedFills !== null) {
    return invalidResult(input.input.state, "invalidFill", unrelatedFills);
  }
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
  if (metalFact === null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object-contact damage requires a visible manufactured metal object within spell range.",
    );
  }
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
  if (contactSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      contactSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: contactSelection.targetIds,
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
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
      targetIds: contactSelection.targetIds,
      contactFacts: contactSelection.spatialFacts,
    });
    if (damageResolution.tag !== "resolved") {
      return damageResolution;
    }
    return finishObjectContactDamageResolution({
      state: damageResolution.state,
      subject: input.input.subject,
      events: damageResolution.events,
      suppressedReactionTrigger: input.input.suppressedReactionTrigger,
    });
  }

  const damageResolution = resolveObjectContactDamage({
    state: input.input.state,
    errorState: input.input.state,
    subject: input.input.subject,
    fillSet: input.fillSet,
    actorId: input.actorId,
    invocation: input.invocation,
    targetIds: contactSelection.targetIds,
    contactFacts: contactSelection.spatialFacts,
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
    suppressedReactionTrigger: input.input.suppressedReactionTrigger,
  });
}

export function resolveObjectContactDamageRepeatSpellAct(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: ObjectContactDamageRepeatInvocation;
  readonly fillSet: OkSpellFillSet;
}): BattleResolutionResult {
  const unrelatedFills = objectContactDamageUnrelatedFillsMessage(
    input.fillSet,
    { allowObjectTarget: false, allowSpellCastReactionFacts: false },
  );
  if (unrelatedFills !== null) {
    return invalidResult(input.input.state, "invalidFill", unrelatedFills);
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
  if (contactSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      contactSelection.message,
    );
  }
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
    targetIds: contactSelection.targetIds,
    contactFacts: contactSelection.spatialFacts,
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
    suppressedReactionTrigger: input.input.suppressedReactionTrigger,
  });
}

function validateObjectContactTargets(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
  readonly invocation: ObjectContactDamageAnyInvocation;
  readonly fillSet: OkSpellFillSet;
  readonly requiresObjectWithinRange: boolean;
}):
  | { readonly tag: "needsHoles"; readonly hole: ReturnType<typeof spellObjectContactTargetsHole> }
  | { readonly tag: "invalid"; readonly message: string }
  | {
      readonly tag: "ok";
      readonly targetIds: readonly CombatantId[];
      readonly spatialFacts: readonly BattleObjectContactTargetSpatialFact[];
    } {
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
  if (
    fill.holeId !==
    spellObjectContactTargetsHoleId({
      spellId: input.invocation.spell.id,
      objectId: input.objectId,
    })
  ) {
    return {
      tag: "invalid",
      message:
        "Object-contact target fill must use the selected spell object-contact hole.",
    };
  }
  const targetIds = fill.targetIds;
  if (targetIds.length !== new Set(targetIds).size) {
    return {
      tag: "invalid",
      message: "Object-contact target fill must not repeat a combatant.",
    };
  }
  if (targetIds.some((targetId) => !input.state.combatants.has(targetId))) {
    return {
      tag: "invalid",
      message: "Object-contact targets must be combatants in this battle.",
    };
  }
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
      fact.sourceSpellId === input.invocation.spell.id &&
      fact.objectId === input.objectId &&
      fact.rangeFeet === input.invocation.rangeFeet,
  );
  if (
    input.requiresObjectWithinRange &&
    matchingRangeFacts.length !== 1
  ) {
    return {
      tag: "invalid",
      message:
        "Repeated object-contact damage requires exactly one matching object-within-range witness.",
    };
  }
  if (!input.requiresObjectWithinRange && rangeFacts.length > 0) {
    return {
      tag: "invalid",
      message:
        "Initial object-contact damage does not use an object-within-range repeat witness.",
    };
  }
  if (rangeFacts.length !== matchingRangeFacts.length) {
    return {
      tag: "invalid",
      message:
        "Object-within-range witness must match the selected spell object.",
    };
  }
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
      fact.sourceSpellId === input.invocation.spell.id &&
      fact.objectId === input.objectId &&
      selectedTargetIds.has(fact.targetId),
  );
  if (matchingContactFacts.length !== contactFacts.length) {
    return {
      tag: "invalid",
      message: "Physical-contact witnesses must match selected targets.",
    };
  }
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
  return {
    tag: "ok",
    targetIds,
    spatialFacts: fill.spatialFacts,
  };
}

function resolveObjectContactDamage(input: {
  readonly state: BattleState;
  readonly needsHolesState?: BattleState;
  readonly errorState: BattleState;
  readonly subject: ActionSpellBattleResolutionInput["subject"] | BonusActionSpellBattleResolutionInput["subject"];
  readonly fillSet: OkSpellFillSet;
  readonly actorId: CombatantId;
  readonly invocation: ObjectContactDamageAnyInvocation;
  readonly targetIds: readonly CombatantId[];
  readonly contactFacts: readonly BattleObjectContactTargetSpatialFact[];
}):
  | {
      readonly tag: "resolved";
      readonly state: BattleState;
      readonly events: readonly BattleAfterDamageEvent[];
    }
  | Extract<BattleResolutionResult, { readonly tag: "needsHoles" | "invalid" }> {
  const needsHolesState = input.needsHolesState ?? input.state;
  if (input.targetIds.length === 0) {
    if (
      input.fillSet.damageRoll !== undefined ||
      input.fillSet.concentrationSavingThrows.length > 0 ||
      input.fillSet.damageDispositions.length > 0 ||
      input.fillSet.hideousLaughterDamageRepeatSaves.length > 0
    ) {
      return invalidResult(
        input.errorState,
        "invalidFill",
        "Object-contact damage fills are not valid when no contact creatures are selected.",
      );
    }
    return { tag: "resolved", state: input.state, events: [] };
  }
  if (input.fillSet.damageRoll === undefined) {
    return needsHolesResult(needsHolesState, input.subject, [
      spellDamageHole(input.invocation),
    ]);
  }
  const damageValidation = validateSpellDamageFill(
    input.fillSet.damageRoll,
    input.invocation,
    false,
  );
  if (damageValidation !== null) {
    return invalidResult(input.errorState, "invalidFill", damageValidation);
  }
  const concentrationSaves = input.targetIds.flatMap((targetId) => {
    const target = input.state.combatants.get(targetId);
    if (target === undefined || input.fillSet.damageRoll === undefined) {
      return [];
    }
    return damageLifecycleConcentrationSavingThrowHoles({
      state: input.state,
      target,
      damageAmount: spellDamageAmountForTarget(
        target,
        input.invocation,
        input.fillSet.damageRoll,
      ),
    });
  });
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
  if (
    input.fillSet.concentrationSavingThrows.some(
      (fill) => !concentrationSaveIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.errorState,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  const damageDispositionHoles = input.targetIds.flatMap((targetId) => {
    const target = input.state.combatants.get(targetId);
    if (target === undefined || input.fillSet.damageRoll === undefined) {
      return [];
    }
    const hole = zeroHitPointReplacementDispositionHole({
      damageSourceId: input.actorId,
      target,
      damageAmount: spellDamageAmountForTarget(
        target,
        input.invocation,
        input.fillSet.damageRoll,
      ),
    });
    return hole === null ? [] : [hole];
  });
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: input.fillSet.damageDispositions,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.errorState,
      "invalidFill",
      damageDispositionValidation,
    );
  }
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
  const hideousLaughterSaveChecks = input.targetIds.map((targetId) => {
    const target = input.state.combatants.get(targetId);
    if (target === undefined || input.fillSet.damageRoll === undefined) {
      return { tag: "ok" as const, holes: [] };
    }
    const damageAmount = spellDamageAmountForTarget(
      target,
      input.invocation,
      input.fillSet.damageRoll,
    );
    const holes = damageLifecycleHideousLaughterDamageRepeatSaveHoles({
      state: input.state,
      target,
      damageAmount,
    });
    return damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
      state: input.state,
      target,
      damageAmount,
      fills: fillsMatchingHoleIds(
        input.fillSet.hideousLaughterDamageRepeatSaves,
        holes,
      ),
    });
  });
  const invalidHideousLaughterSaveCheck = hideousLaughterSaveChecks.find(
    (check) => check.tag === "invalid",
  );
  if (invalidHideousLaughterSaveCheck?.tag === "invalid") {
    return invalidResult(
      input.errorState,
      "invalidFill",
      invalidHideousLaughterSaveCheck.message,
    );
  }
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
  if (
    input.fillSet.hideousLaughterDamageRepeatSaves.some(
      (fill) => !hideousLaughterSaveHoleIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.errorState,
      "invalidFill",
      "Hideous Laughter damage repeat save fill must match a requested damaged target.",
    );
  }
  const damaged = input.targetIds.reduce((state, targetId) => {
    const target = state.combatants.get(targetId);
    if (target === undefined || input.fillSet.damageRoll === undefined) {
      return state;
    }
    const damageAmount = spellDamageAmountForTarget(
      target,
      input.invocation,
      input.fillSet.damageRoll,
    );
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
      damageDisposition: damageDispositionForTarget(
        damageDispositionHoles,
        input.fillSet.damageDispositions,
        targetId,
      ),
      hideousLaughterDamageRepeatSaves: hideousLaughterLifecycleFills,
      damageSourceId: input.actorId,
    });
  }, input.state);
  return {
    tag: "resolved",
    state: damaged,
    events: input.targetIds.flatMap((targetId): readonly BattleAfterDamageEvent[] => {
      const target = input.state.combatants.get(targetId);
      if (target === undefined || input.fillSet.damageRoll === undefined) {
        return [];
      }
      const damageAmount = spellDamageAmountForTarget(
        target,
        input.invocation,
        input.fillSet.damageRoll,
      );
      return [
        {
          damageSourceId: input.actorId,
          damagedId: targetId,
          damageAmount: toDamageAmount(damageAmount),
          reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
            facts: input.contactFacts,
            damagedId: targetId,
            damageSourceId: input.actorId,
          }),
        },
      ];
    }),
  };
}

function applyObjectContactDamageActiveEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
  readonly invocation: ObjectContactDamageInvocation;
}): BattleState {
  const actor = input.state.combatants.get(input.actorId);
  if (actor === undefined) {
    return input.state;
  }
  const effect = {
    kind: "spellObjectContactDamage" as const,
    effectId: battleSpellEffectOccurrenceId(
      `${input.actorId}:${input.invocation.spell.id}:${input.objectId}`,
    ),
    sourceSpellId: input.invocation.spell.id,
    sourceCombatantId: input.actorId,
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
  };
  return {
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.actorId, {
      ...actor,
      activeEffects: [
        ...actor.activeEffects.filter(
          (candidate) =>
            !(
              candidate.kind === "spellObjectContactDamage" &&
              candidate.effectId === effect.effectId
            ),
        ),
        effect,
      ],
    }),
  };
}

function finishObjectContactDamageResolution(input: {
  readonly state: BattleState;
  readonly subject: ActionSpellBattleResolutionInput["subject"] | BonusActionSpellBattleResolutionInput["subject"];
  readonly events: readonly BattleAfterDamageEvent[];
  readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
}): BattleResolutionResult {
  if (input.events.length > 0) {
    const afterDamageReactionWindow = openAfterDamageSequenceReactionWindow({
      state: input.state,
      subject: input.subject,
      events: input.events,
      objectDamages: [],
      objectIgnitions: [],
      suppressedReactionTrigger: input.suppressedReactionTrigger,
    });
    if (afterDamageReactionWindow.tag === "needsHoles") {
      return afterDamageReactionWindow;
    }
  }
  return {
    tag: "resolved",
    state: input.state,
    snapshot: snapshotBattle(input.state),
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
