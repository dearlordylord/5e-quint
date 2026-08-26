// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import { optionalProperty } from "./optional-property.ts";
import {
  ordinaryFamiliarLikeProtocol,
  ownerLongRestExpiringFamiliarLikeProtocol,
} from "@dnd/shared-algebras/companion-protocol-algebra";
import { Hp, type SpellSlotLevel } from "@dnd/shared/types";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import * as Either from "effect/Either";
import * as Option from "effect/Option";
export {
  applyFindFamiliarZeroHitPointDisappearance,
  permanentlyDismissFindFamiliar,
  temporarilyDismissFindFamiliar,
  type FindFamiliarLifecycleInputBase,
  type FindFamiliarOwnerInput,
} from "./find-familiar-lifecycle-execution.ts";
export { retainedStoredFormForPresentCompanion } from "./companion-stored-form.ts";
import {
  familiarMaxHp,
  findFamiliarCurrentHitPoints,
  findFamiliarIdentityIssue,
  findFamiliarPresentState,
  findFamiliarTemporarilyDismissedState,
  invalidFindFamiliarResult,
  presentFindFamiliarHitPoints,
  reappearAdmittedTemporarilyDismissedFindFamiliar,
  resolvedFindFamiliarResult,
  spendFindFamiliarMagicAction,
  withFindFamiliarCombatant,
} from "./find-familiar-lifecycle-execution.ts";
import {
  projectAuthoredStatBlockWithCreatureType,
  type AuthoredStatBlockProjection,
} from "./stat-block-authored-projection.ts";
import { findFamiliarDisappearedAtZeroHitPointsState } from "./companion-state.ts";

import type {
  BattleAmmunitionStock,
  BattleCreatureState,
  BattleResolutionResult,
  BattleState,
  BattleStateInitIssue,
} from "./battle-state-execution.ts";
import type { BattleStatBlockExecutionSource } from "./stat-block-execution-state.ts";
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
} from "./character-battle-resource-execution.ts";
import {
  characterUnitProcedureBindings,
  type CharacterExecutionState,
} from "./character-execution-admission.ts";
import { findFamiliarCompanionLifecycleRouteEvents } from "./battle-reducer/companion-routes.ts";
import { createInitialInitiativeForCombatants } from "./battle-reducer/api-lifecycle.ts";
import {
  battleStateInitIssue,
  battleStateInitIssueMessage,
} from "./battle-reducer/domain-helpers.ts";
import { admitBattleStatBlockCombatant } from "./stat-block-combatant-admission.ts";
import { admitFindFamiliarReappearance } from "./find-familiar-admission.ts";
import type { FindFamiliarStatBlockCatalog } from "./find-familiar-stat-block-catalog.ts";

export type FindFamiliarReappearanceInput = {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly catalog: FindFamiliarStatBlockCatalog;
  readonly initiative: InitiativeScore;
  readonly placement: Extract<
    import("./companion-state.ts").BattleCompanionPlacement,
    { readonly kind: "unoccupiedSpaceWithin30Feet" }
  >;
};

export function reappearTemporarilyDismissedFindFamiliar(
  input: FindFamiliarReappearanceInput,
): BattleResolutionResult {
  const admission = admitFindFamiliarReappearance(input);
  /* v8 ignore start -- @preserve -- Reappearance admission owns malformed/stale input diagnostics; this lifecycle wrapper only preserves its typed issue as an invalid result. */
  return Either.isLeft(admission)
    ? invalidFindFamiliarResult(
        input.state,
        "invalidFill",
        admission.left.message,
      )
    : reappearAdmittedTemporarilyDismissedFindFamiliar({
        admission: admission.right.mechanics,
        initiative: input.initiative,
        placement: input.placement,
      });
  /* v8 ignore stop -- @preserve */
}
import type {
  BattleResourcePoolExecutionRef,
  CombatantId,
  InitiativeScore,
} from "./identity.ts";
import { battleExecutionScopeInitialOrNextOrdinal } from "./identity.ts";
import {
  companionEntries,
  findCompanionByOwner,
  findCompanionEntryByOwner,
  setCompanion,
  type BattleCompanionDurableId,
  type BattleCompanionAbsentState,
  type BattleCompanionDismissedForeverState,
  type BattleCompanionHitPoints,
  type BattleCompanionIdentity,
  type BattleCompanionPlacement,
  type BattleCompanionProtocol,
  type BattleCompanionPresentState,
  type BattleCompanionState,
  type BattleCompanionStoredForm,
} from "./companion-state.ts";
import type {
  FindFamiliarCreatureTypeOverride,
  FindFamiliarCreatureTypeOverrideChoice,
  FindFamiliarFormEligibility,
  FindFamiliarFormResolution,
  FindFamiliarResolvedForm,
  FindFamiliarFormSelection,
  PactOfTheChainFindFamiliarFormEligibility,
  PactOfTheChainFindFamiliarFormSelection,
} from "@dnd/surface/surface/find-familiar-forms";
import { resolveFindFamiliarForm } from "@dnd/surface/surface/find-familiar-forms";
import { expendSpellSlot } from "./battle-reducer/spell-effects.ts";
import { markSpellSlotExpendedThisTurn } from "./battle-reducer/spell-turn-resources.ts";
import { DRUID_WILD_COMPANION_SPELL_CAST_SUPPORT_PROFILE } from "./unit-feature-support.ts";

export type FindFamiliarCastInput = {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly familiarId: CombatantId;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
  readonly catalog: StatBlockCatalog;
  readonly eligibility: FindFamiliarFormEligibility;
  readonly selection: FindFamiliarFormSelection;
  readonly creatureTypeOverrideChoiceId: FindFamiliarCreatureTypeOverrideChoice["optionId"];
  readonly initiative: InitiativeScore;
  readonly placement: Extract<
    BattleCompanionPlacement,
    { readonly kind: "unoccupiedSpaceWithinSpellRange" }
  >;
};

export type WildCompanionSpend =
  | { readonly kind: "spellSlot"; readonly spellLevel: SpellSlotLevel }
  | {
      readonly kind: "wildShapeUse";
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
    };

export type WildCompanionCastInput = {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly familiarId: CombatantId;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
  readonly catalog: StatBlockCatalog;
  readonly eligibility: FindFamiliarFormEligibility;
  readonly selection: FindFamiliarFormSelection;
  readonly initiative: InitiativeScore;
  readonly placement: Extract<
    BattleCompanionPlacement,
    { readonly kind: "unoccupiedSpaceWithinSpellRange" }
  >;
  readonly spend: WildCompanionSpend;
};

type FindFamiliarCastPrior =
  | { readonly tag: "none" }
  | {
      readonly tag: "present";
      readonly familiar: BattleCompanionPresentState;
    }
  | {
      readonly tag: "absent";
      readonly familiar: BattleCompanionAbsentState;
    }
  | {
      readonly tag: "dismissedForever";
      readonly familiar: BattleCompanionDismissedForeverState;
    };

type FindFamiliarCastReactionIssue = {
  readonly tag: "missingLiveCombatant";
  readonly message: "Present Find Familiar combatant is missing.";
};

function findFamiliarPresentCombatant(input: {
  readonly state: BattleState;
  readonly familiarId: CombatantId;
}): Either.Either<BattleCreatureState, FindFamiliarCastReactionIssue> {
  const combatant = input.state.combatants.get(input.familiarId);
  return combatant === undefined
    ? Either.left({
        tag: "missingLiveCombatant",
        message: "Present Find Familiar combatant is missing.",
      })
    : Either.right(combatant);
}

function findFamiliarCastPrior(
  familiar: BattleCompanionState | undefined,
): FindFamiliarCastPrior {
  if (familiar === undefined) return { tag: "none" };
  if (familiar.status === "present") {
    return { tag: "present", familiar };
  }
  if (familiar.status === "dismissedForever") {
    return { tag: "dismissedForever", familiar };
  }
  return { tag: "absent", familiar };
}

type CompanionBattleAdmissionStoredForm =
  | {
      readonly formAccess: "findFamiliar";
      readonly formSelection: FindFamiliarFormSelection;
      readonly resolvedStatBlockId: StatBlockRecord["id"];
    }
  | {
      readonly formAccess: "pactOfTheChain";
      readonly formSelection: PactOfTheChainFindFamiliarFormSelection;
      readonly resolvedStatBlockId: StatBlockRecord["id"];
    };

export type CompanionBattleAdmissionManifestation =
  | {
      readonly tag: "embodiedOutsideBattle";
      readonly storedForm: CompanionBattleAdmissionStoredForm;
      readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
      readonly hitPoints: BattleCompanionHitPoints;
      readonly ammunitionStocks: readonly BattleAmmunitionStock[];
      readonly initiative: InitiativeScore;
      readonly placement: Extract<
        BattleCompanionPlacement,
        { readonly kind: "unoccupiedSpaceWithinSpellRange" }
      >;
    }
  | {
      readonly tag: "temporarilyDismissed";
      readonly storedForm: CompanionBattleAdmissionStoredForm;
      readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
      readonly hitPoints: BattleCompanionHitPoints;
      readonly ammunitionStocks: readonly BattleAmmunitionStock[];
      readonly reappearanceCombatantId: CombatantId;
    }
  | {
      readonly tag: "disappearedAtZeroHitPoints";
      readonly storedForm: CompanionBattleAdmissionStoredForm;
      readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
    };

export type CompanionBattleEmbodiedAdmissionManifestation = Extract<
  CompanionBattleAdmissionManifestation,
  { readonly tag: "embodiedOutsideBattle" }
>;

export type CompanionBattleStoredAdmissionManifestation = Exclude<
  CompanionBattleAdmissionManifestation,
  { readonly tag: "embodiedOutsideBattle" }
>;

export type CompanionBattleAdmissionFormEligibility =
  | {
      readonly formAccess: "findFamiliar";
      readonly eligibility: FindFamiliarFormEligibility;
    }
  | {
      readonly formAccess: "pactOfTheChain";
      readonly eligibility: PactOfTheChainFindFamiliarFormEligibility;
    };

type CompanionBattleAdmissionInputBase = {
  readonly state: BattleState;
  readonly ownerId: CombatantId;
  readonly identity: Extract<
    BattleCompanionIdentity,
    { readonly tag: "retainedBetweenBattles" }
  >;
  readonly protocol: BattleCompanionProtocol;
  readonly catalog: StatBlockCatalog;
  readonly formEligibility: CompanionBattleAdmissionFormEligibility;
  readonly initialCombatantOrder: ReadonlyMap<CombatantId, number>;
};

export type CompanionBattleAdmissionInput =
  | (CompanionBattleAdmissionInputBase & {
      readonly companionId: CombatantId;
      readonly manifestation: CompanionBattleEmbodiedAdmissionManifestation;
    })
  | (CompanionBattleAdmissionInputBase & {
      readonly manifestation: CompanionBattleStoredAdmissionManifestation;
    });

export function castFindFamiliar(
  input: FindFamiliarCastInput,
): BattleResolutionResult {
  const resolvedForm = resolveFindFamiliarForm({
    catalog: input.catalog,
    eligibility: input.eligibility,
    selection: input.selection,
    creatureTypeOverrideChoiceId: input.creatureTypeOverrideChoiceId,
  });
  /* v8 ignore start -- @preserve -- Malformed authored selection: the Surface form resolver owns unknown form and creature-type choice diagnostics. */
  if (resolvedForm.tag === "issue") {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      resolvedForm.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  return castResolvedFindFamiliar({
    state: input.state,
    casterId: input.casterId,
    familiarId: input.familiarId,
    resolvedForm: resolvedForm.form,
    initiative: input.initiative,
    placement: input.placement,
    ammunitionStocks: input.ammunitionStocks,
    retainedTransition: "reject",
  });
}

export type ResolvedFindFamiliarCastInput = Omit<
  FindFamiliarCastInput,
  "catalog" | "eligibility" | "selection" | "creatureTypeOverrideChoiceId"
> & {
  readonly resolvedForm: FindFamiliarResolvedForm;
  readonly retainedTransition: "reject" | "sessionOwned";
};

function retainedFindFamiliarCastIssue(input: {
  readonly prior: FindFamiliarCastPrior;
  readonly retainedTransition: ResolvedFindFamiliarCastInput["retainedTransition"];
}): string | undefined {
  if (
    input.prior.tag !== "none" &&
    input.prior.familiar.identity.tag === "retainedBetweenBattles" &&
    input.retainedTransition !== "sessionOwned"
  ) {
    return "Retained Find Familiar recast requires the session-owned authored selection transition.";
  }
  return undefined;
}

export function castResolvedFindFamiliar(
  input: ResolvedFindFamiliarCastInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Stale direct call: discovered Find Familiar acts retain a caster already present in the same battle state. */
  if (!input.state.combatants.has(input.casterId)) {
    return invalidFindFamiliarResult(
      input.state,
      "missingCombatant",
      "Find Familiar caster is not in this battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const prior = findFamiliarCastPrior(
    findCompanionEntryByOwner(input.state.companions, input.casterId)
      ?.companion,
  );
  const retainedCastIssue = retainedFindFamiliarCastIssue({
    prior,
    retainedTransition: input.retainedTransition,
  });
  if (retainedCastIssue !== undefined) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      retainedCastIssue,
    );
  }
  const familiarId =
    prior.tag === "present" ? prior.familiar.combatantId : input.familiarId;
  const identityIssue = findFamiliarIdentityIssue(
    input.state,
    input.casterId,
    familiarId,
  );
  if (identityIssue !== null) {
    return invalidFindFamiliarResult(input.state, "invalidFill", identityIssue);
  }
  const resolvedForm = input.resolvedForm;
  const projected = projectFamiliarStatBlock(resolvedForm);
  if (Either.isLeft(projected)) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      projected.left,
    );
  }
  const nextFamiliar = findFamiliarPresentState({
    form: {
      formAccess: "findFamiliar",
    },
    combatantId: familiarId,
    identity:
      prior.tag === "none" ? { tag: "battleOnly" } : prior.familiar.identity,
    protocol: ordinaryFamiliarLikeProtocol(),
    creatureTypeOverride: resolvedForm.creatureTypeOverride,
    placement: input.placement,
    ownerId: input.casterId,
  });
  const preservedHitPoints = hitPointsForFindFamiliarCast({
    state: input.state,
    prior,
    statBlock: projected.right.runtime,
  });
  /* v8 ignore start -- @preserve -- Corrupt retained state: admitted present/dismissed companions carry positive HP and a resolvable literal familiar maximum. */
  if (typeof preservedHitPoints === "string") {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      preservedHitPoints,
    );
  }
  /* v8 ignore stop -- @preserve */
  const reactionAvailable = reactionAvailableForFindFamiliarCast({
    state: input.state,
    prior,
  });
  /* v8 ignore start -- @preserve -- A stale present companion can retain identity after its live combatant is missing. */
  if (Either.isLeft(reactionAvailable)) {
    return invalidFindFamiliarResult(
      input.state,
      "missingCombatant",
      reactionAvailable.left.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = withAdmittedFindFamiliarCombatant({
    state: input.state,
    casterId: input.casterId,
    familiarId,
    familiar: nextFamiliar,
    initiative: input.initiative,
    statBlock: projected.right.runtime,
    ammunitionStocks: input.ammunitionStocks,
    reactionAvailable: reactionAvailable.right,
    ...(preservedHitPoints === null
      ? {}
      : {
          currentHp: preservedHitPoints.currentHp,
          tempHp: preservedHitPoints.tempHp,
        }),
  });
  /* v8 ignore start -- @preserve -- The resolved catalog form and collision-checked combatant identity satisfy Stat Block admission; failures remain a defensive typed propagation. */
  if (nextState.tag === "invalid") {
    return nextState;
  }
  /* v8 ignore stop -- @preserve */
  return resolvedFindFamiliarResult(
    nextState.state,
    [],
    findFamiliarCompanionLifecycleRouteEvents(),
  );
}

type WildCompanionCasterAdmissionIssue = {
  readonly reason: "missingCombatant" | "invalidFill";
  readonly message: string;
};

function wildCompanionCasterAdmissionIssue(
  owner: BattleCreatureState | undefined,
): WildCompanionCasterAdmissionIssue | undefined {
  /* v8 ignore start -- @preserve -- Stale direct call: Wild Companion discovery is available only for an admitted character caster. */
  if (owner?.origin.kind !== "character") {
    return {
      reason: "missingCombatant",
      message: "Wild Companion caster is not a character in this battle.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- The admitted character must carry the Druid Wild Companion feature before its resource can be spent. */
  if (!characterHasWildCompanionFeature(owner.origin.execution)) {
    return {
      reason: "invalidFill",
      message: "Wild Companion requires the Druid Wild Companion feature.",
    };
  }
  /* v8 ignore stop -- @preserve */
  return undefined;
}

export function castWildCompanion(
  input: WildCompanionCastInput,
): BattleResolutionResult {
  const owner = input.state.combatants.get(input.casterId);
  const ownerIssue = wildCompanionCasterAdmissionIssue(owner);
  if (ownerIssue !== undefined) {
    return invalidFindFamiliarResult(
      input.state,
      ownerIssue.reason,
      ownerIssue.message,
    );
  }
  const spent = spendWildCompanionCost({
    state: input.state,
    casterId: input.casterId,
    spend: input.spend,
  });
  /* v8 ignore start -- @preserve -- Stale subject diagnostics are owned by the cost boundary; this cast workflow only preserves its typed invalid result. */
  if (spent.tag === "invalid") {
    return spent;
  }
  /* v8 ignore stop -- @preserve */
  const resolvedForm = resolveFindFamiliarForm({
    catalog: input.catalog,
    eligibility: input.eligibility,
    selection: input.selection,
    creatureTypeOverrideChoiceId: "fey",
  });
  /* v8 ignore start -- @preserve -- Malformed authored selection: the Surface form resolver owns unknown Wild Companion form diagnostics. */
  if (resolvedForm.tag === "issue") {
    return invalidFindFamiliarResult(
      spent.state,
      "invalidFill",
      resolvedForm.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const projected = projectFamiliarStatBlock({
    statBlock: resolvedForm.form.statBlock,
    creatureTypeOverride: "fey",
  });
  if (Either.isLeft(projected)) {
    return invalidFindFamiliarResult(
      spent.state,
      "invalidFill",
      projected.left,
    );
  }
  const prior = findFamiliarCastPrior(
    findCompanionEntryByOwner(spent.state.companions, input.casterId)
      ?.companion,
  );
  const familiarId =
    prior.tag === "present" ? prior.familiar.combatantId : input.familiarId;
  const identityIssue = findFamiliarIdentityIssue(
    spent.state,
    input.casterId,
    familiarId,
  );
  /* v8 ignore start -- @preserve -- Stale direct call: discovery and retained-companion ownership prevent choosing an ordinary combatant identity for the familiar. */
  if (identityIssue !== null) {
    return invalidFindFamiliarResult(spent.state, "invalidFill", identityIssue);
  }
  /* v8 ignore stop -- @preserve */
  const nextFamiliar = findFamiliarPresentState({
    form: {
      formAccess: "findFamiliar",
    },
    combatantId: familiarId,
    identity:
      prior.tag === "none" ? { tag: "battleOnly" } : prior.familiar.identity,
    protocol: ownerLongRestExpiringFamiliarLikeProtocol(),
    creatureTypeOverride: "fey",
    placement: input.placement,
    ownerId: input.casterId,
  });
  const preservedHitPoints = hitPointsForFindFamiliarCast({
    state: spent.state,
    prior,
    statBlock: projected.right.runtime,
  });
  /* v8 ignore start -- @preserve -- Corrupt retained state: admitted Wild Companions carry positive HP and a resolvable literal familiar maximum. */
  if (typeof preservedHitPoints === "string") {
    return invalidFindFamiliarResult(
      spent.state,
      "invalidFill",
      preservedHitPoints,
    );
  }
  /* v8 ignore stop -- @preserve */
  const reactionAvailable = reactionAvailableForFindFamiliarCast({
    state: spent.state,
    prior,
  });
  /* v8 ignore start -- @preserve -- A stale present companion can retain identity after its live combatant is missing. */
  if (Either.isLeft(reactionAvailable)) {
    return invalidFindFamiliarResult(
      spent.state,
      "missingCombatant",
      reactionAvailable.left.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextState = withAdmittedFindFamiliarCombatant({
    state: spent.state,
    casterId: input.casterId,
    familiarId,
    familiar: nextFamiliar,
    initiative: input.initiative,
    statBlock: projected.right.runtime,
    ammunitionStocks: input.ammunitionStocks,
    reactionAvailable: reactionAvailable.right,
    ...(preservedHitPoints === null
      ? {}
      : {
          currentHp: preservedHitPoints.currentHp,
          tempHp: preservedHitPoints.tempHp,
        }),
  });
  /* v8 ignore start -- @preserve -- The resolved catalog form and collision-checked combatant identity satisfy Stat Block admission; failures remain a defensive typed propagation. */
  if (nextState.tag === "invalid") {
    return nextState;
  }
  /* v8 ignore stop -- @preserve */
  return resolvedFindFamiliarResult(nextState.state, []);
}

function companionAdmissionInitialIssue(
  input: CompanionBattleAdmissionInput,
): string | undefined {
  /* v8 ignore start -- @preserve -- Malformed handoff: character-battle admission supplies an owner from the battle roster it just created. */
  if (!input.state.combatants.has(input.ownerId)) {
    return "Companion admission owner is not in this battle.";
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Durable identity is authored at the retained-companion boundary and cannot be empty. */
  if (input.identity.durableCompanionId.length === 0) {
    return "Companion admission requires durable id.";
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- The one-at-a-time retained companion boundary cannot admit a second companion for the same owner. */
  if (
    findCompanionByOwner(input.state.companions, input.ownerId) !== undefined
  ) {
    return "Companion admission requires at most one retained companion per owner.";
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- A retained durable identity cannot be reused by another companion. */
  if (
    companionDurableIdentityInUse(
      input.state.companions,
      input.identity.durableCompanionId,
    )
  ) {
    return "Companion admission identity is already used by another companion.";
  }
  /* v8 ignore stop -- @preserve */
  return undefined;
}

export function admitCompanionToBattle(
  input: CompanionBattleAdmissionInput,
): Either.Either<BattleState, BattleStateInitIssue> {
  const initialIssue = companionAdmissionInitialIssue(input);
  if (initialIssue !== undefined) {
    return battleStateInitIssue(initialIssue);
  }
  if (!("companionId" in input)) {
    return admitAbsentCompanionToBattle({
      ...input,
    });
  }
  /* v8 ignore start -- @preserve -- Type-level invariant: the companionId branch of CompanionBattleAdmissionInput requires an embodied manifestation. */
  if (input.manifestation.tag !== "embodiedOutsideBattle") {
    return battleStateInitIssue(
      "Present companion admission requires embodied manifestation.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const identityIssue = findFamiliarIdentityIssue(
    input.state,
    input.ownerId,
    input.companionId,
  );
  if (identityIssue !== null) return battleStateInitIssue(identityIssue);

  const resolvedForm = resolveStoredFindFamiliarForm({
    catalog: input.catalog,
    formEligibility: input.formEligibility,
    storedForm: input.manifestation.storedForm,
    creatureTypeOverride: input.manifestation.creatureTypeOverride,
  });
  /* v8 ignore start -- @preserve -- Malformed handoff: retained companion authoring resolves and stores form proof against this same eligibility and catalog. */
  if (resolvedForm.tag === "issue") {
    return battleStateInitIssue(resolvedForm.message);
  }
  /* v8 ignore stop -- @preserve */
  const projected = projectFamiliarStatBlock(resolvedForm.form);
  if (Either.isLeft(projected)) {
    return battleStateInitIssue(projected.left);
  }
  const nextCompanion = findFamiliarPresentState({
    form: { formAccess: input.manifestation.storedForm.formAccess },
    combatantId: input.companionId,
    identity: input.identity,
    protocol: input.protocol,
    creatureTypeOverride: input.manifestation.creatureTypeOverride,
    placement: input.manifestation.placement,
    ownerId: input.ownerId,
  });
  const nextState = withAdmittedFindFamiliarCombatant({
    state: input.state,
    casterId: input.ownerId,
    familiarId: input.companionId,
    familiar: nextCompanion,
    initiative: input.manifestation.initiative,
    statBlock: projected.right.runtime,
    ammunitionStocks: input.manifestation.ammunitionStocks,
    currentHp: input.manifestation.hitPoints.currentHp,
    tempHp: input.manifestation.hitPoints.tempHp,
    reactionAvailable: true,
  });
  /* v8 ignore start -- @preserve -- The resolved stored form and collision-checked companion identity satisfy Stat Block admission; failures remain a defensive typed propagation. */
  if (nextState.tag === "invalid") {
    return battleStateInitIssue(nextState.message);
  }
  /* v8 ignore stop -- @preserve */
  return withInitialInitiativeOrder(
    nextState.state,
    input.initialCombatantOrder,
  );
}

function withAdmittedFindFamiliarCombatant(
  input: Omit<
    Parameters<typeof withFindFamiliarCombatant>[0],
    "displayName" | "combatantAdmission"
  > & {
    readonly statBlock: import("./stat-block-execution-state.ts").BattleStatBlockExecutionSource;
  },
): ReturnType<typeof withFindFamiliarCombatant> {
  const allocation = input.state.executionScopeCursors.get(input.familiarId);
  const combatantAdmission = admitBattleStatBlockCombatant({
    battleId: input.state.battleId,
    combatantId: input.familiarId,
    statBlock: input.statBlock,
    startingScopeOrdinal: battleExecutionScopeInitialOrNextOrdinal(
      allocation?.nextScopeOrdinal,
    ),
  });
  /* v8 ignore start -- @preserve -- The stored form was resolved from the catalog immediately above; only a forged execution source can fail Stat Block combatant admission here. */
  if (Either.isLeft(combatantAdmission)) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      battleStateInitIssueMessage(combatantAdmission.left),
    );
  }
  /* v8 ignore stop -- @preserve */
  return withFindFamiliarCombatant({
    state: input.state,
    casterId: input.casterId,
    familiarId: input.familiarId,
    familiar: input.familiar,
    initiative: input.initiative,
    combatantAdmission: combatantAdmission.right,
    ammunitionStocks: input.ammunitionStocks,
    reactionAvailable: input.reactionAvailable,
    ...optionalProperty("currentHp", input.currentHp),
    ...optionalProperty("tempHp", input.tempHp),
  });
}

function companionDurableIdentityInUse(
  companions: BattleState["companions"],
  durableCompanionId: BattleCompanionDurableId,
): boolean {
  return companionEntries(companions).some(
    (entry) =>
      entry.companion.identity.tag === "retainedBetweenBattles" &&
      entry.companion.identity.durableCompanionId === durableCompanionId,
  );
}

function admitAbsentCompanionToBattle(
  input: CompanionBattleAdmissionInputBase & {
    readonly manifestation: Exclude<
      CompanionBattleAdmissionManifestation,
      { readonly tag: "embodiedOutsideBattle" }
    >;
  },
): Either.Either<BattleState, BattleStateInitIssue> {
  const resolvedForm = resolveStoredFindFamiliarForm({
    catalog: input.catalog,
    formEligibility: input.formEligibility,
    storedForm: input.manifestation.storedForm,
    creatureTypeOverride: input.manifestation.creatureTypeOverride,
  });
  if (resolvedForm.tag === "issue") {
    return battleStateInitIssue(resolvedForm.message);
  }
  if (input.manifestation.tag === "temporarilyDismissed") {
    const identityIssue = findFamiliarIdentityIssue(
      input.state,
      input.ownerId,
      input.manifestation.reappearanceCombatantId,
    );
    if (identityIssue !== null) return battleStateInitIssue(identityIssue);
  }
  const companion =
    input.manifestation.tag === "temporarilyDismissed"
      ? findFamiliarTemporarilyDismissedState({
          storedForm: executionStoredForm(input.manifestation.storedForm),
          identity: input.identity,
          protocol: input.protocol,
          creatureTypeOverride: input.manifestation.creatureTypeOverride,
          hitPoints: input.manifestation.hitPoints,
          ammunitionStocks: input.manifestation.ammunitionStocks,
          reactionAvailable: true,
          reappearanceCombatantId: input.manifestation.reappearanceCombatantId,
          ownerId: input.ownerId,
        })
      : findFamiliarDisappearedAtZeroHitPointsState({
          storedForm: executionStoredForm(input.manifestation.storedForm),
          identity: input.identity,
          protocol: input.protocol,
          creatureTypeOverride: input.manifestation.creatureTypeOverride,
          ownerId: input.ownerId,
          reactionAvailable: true,
        });
  /* v8 ignore start -- @preserve -- Type-level invariant: both absent-companion constructors above receive the retained identity required by this admission input. */
  if (companion.identity.tag !== "retainedBetweenBattles") {
    return battleStateInitIssue(
      "Retained companion admission requires retained identity.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Either.right({
    ...input.state,
    companions: setCompanion(input.state.companions, companion),
  });
}

function executionStoredForm(
  storedForm: CompanionBattleAdmissionStoredForm,
): BattleCompanionStoredForm {
  return storedForm.formAccess === "findFamiliar"
    ? {
        formAccess: "findFamiliar",
        resolvedStatBlockId: storedForm.resolvedStatBlockId,
      }
    : {
        formAccess: "pactOfTheChain",
        resolvedStatBlockId: storedForm.resolvedStatBlockId,
      };
}

function withInitialInitiativeOrder(
  state: BattleState,
  initialCombatantOrder: ReadonlyMap<CombatantId, number>,
): Either.Either<BattleState, BattleStateInitIssue> {
  const initiative = createInitialInitiativeForCombatants({
    combatants: [...state.combatants.values()],
    initialCombatantOrder,
    emptyRosterMessage: "Find Familiar admission requires combatants.",
  });
  /* v8 ignore start -- @preserve -- Malformed handoff: the character-battle boundary supplies one unique initial-order entry for every admitted combatant. */
  if (Either.isLeft(initiative)) {
    return Either.left(initiative.left);
  }
  /* v8 ignore stop -- @preserve */
  return Either.right({ ...state, initiative: initiative.right });
}

function hitPointsForFindFamiliarCast(input: {
  readonly state: BattleState;
  readonly prior: FindFamiliarCastPrior;
  readonly statBlock: BattleStatBlockExecutionSource;
}): BattleCompanionHitPoints | null | string {
  if (input.prior.tag === "none" || input.prior.tag === "dismissedForever") {
    return null;
  }
  const hitPoints =
    input.prior.tag === "present"
      ? presentFindFamiliarHitPoints(
          input.state,
          input.prior.familiar.combatantId,
        )
      : input.prior.familiar.status === "temporarilyDismissed"
        ? input.prior.familiar.hitPoints
        : null;
  if (hitPoints === null) return null;
  /* v8 ignore start -- @preserve -- Corrupt retained state: a present companion admitted by this lifecycle always has its referenced Stat Block combatant and positive HP state. */
  if (typeof hitPoints === "string") {
    return hitPoints;
  }
  /* v8 ignore stop -- @preserve */
  return hitPointsForAdoptedFamiliarForm({
    hitPoints,
    statBlock: input.statBlock,
  });
}

function reactionAvailableForFindFamiliarCast(input: {
  readonly state: BattleState;
  readonly prior: FindFamiliarCastPrior;
}): Either.Either<boolean, FindFamiliarCastReactionIssue> {
  if (input.prior.tag === "none" || input.prior.tag === "dismissedForever") {
    return Either.right(true);
  }
  if (input.prior.tag === "absent") {
    return Either.right(input.prior.familiar.reactionAvailable);
  }
  const combatant = findFamiliarPresentCombatant({
    state: input.state,
    familiarId: input.prior.familiar.combatantId,
  });
  return Either.isLeft(combatant)
    ? Either.left(combatant.left)
    : Either.right(combatant.right.reactionAvailable);
}

function hitPointsForAdoptedFamiliarForm(input: {
  readonly hitPoints: BattleCompanionHitPoints;
  readonly statBlock: BattleStatBlockExecutionSource;
}): BattleCompanionHitPoints | string {
  const maxHp = familiarMaxHp(input.statBlock);
  /* v8 ignore start -- @preserve -- Eligible familiar forms are admitted from the supported catalog, whose execution projection has literal positive maximum HP. */
  if (typeof maxHp === "string") {
    return maxHp;
  }
  /* v8 ignore stop -- @preserve */
  const currentHp = findFamiliarCurrentHitPoints(
    Hp(Math.min(Number(input.hitPoints.currentHp), Number(maxHp))),
  );
  /* v8 ignore start -- @preserve -- Both retained current HP and the supported familiar maximum are positive, so their minimum remains positive. */
  if (typeof currentHp === "string") {
    return currentHp;
  }
  /* v8 ignore stop -- @preserve */
  return {
    currentHp,
    tempHp: input.hitPoints.tempHp,
  };
}

function projectFamiliarStatBlock(
  form: FindFamiliarResolvedForm,
): Either.Either<AuthoredStatBlockProjection, string> {
  const projected = projectAuthoredStatBlockWithCreatureType(
    form.statBlock,
    form.creatureTypeOverride,
  );
  return Either.isLeft(projected)
    ? Either.left(
        `Find Familiar form projection failed: ${projected.left.reason}.`,
      )
    : Either.right(projected.right);
}

function resolveStoredFindFamiliarForm(input: {
  readonly catalog: StatBlockCatalog;
  readonly formEligibility?: CompanionBattleAdmissionFormEligibility;
  readonly storedForm: CompanionBattleAdmissionStoredForm;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
}): FindFamiliarFormResolution {
  if (input.formEligibility !== undefined) {
    const issue = storedFormResolvedStatBlockIdIssue({
      catalog: input.catalog,
      storedForm: input.storedForm,
      formEligibility: input.formEligibility,
    });
    if (issue !== null) {
      return { tag: "issue", message: issue };
    }
  }
  const statBlock = input.catalog.getStatBlock(
    input.storedForm.resolvedStatBlockId,
  );
  /* v8 ignore start -- @preserve -- Malformed handoff: retained selections are created only after their resolved Stat Block id is found in this catalog. */
  if (Option.isNone(statBlock)) {
    return {
      tag: "issue",
      message: `Retained familiar form Stat Block is missing: ${input.storedForm.resolvedStatBlockId}.`,
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "resolved",
    form: {
      statBlock: statBlock.value,
      creatureTypeOverride: input.creatureTypeOverride,
    },
  };
}

function storedFormResolvedStatBlockIdIssue(input: {
  readonly catalog: StatBlockCatalog;
  readonly storedForm: CompanionBattleAdmissionStoredForm;
  readonly formEligibility: CompanionBattleAdmissionFormEligibility;
}): string | null {
  /* v8 ignore start -- @preserve -- Malformed handoff: stored-form and eligibility variants are constructed together from one authored companion selection. */
  if (input.storedForm.formAccess !== input.formEligibility.formAccess) {
    return "Retained familiar form proof access does not match admission eligibility.";
  }
  /* v8 ignore stop -- @preserve */
  const expected = selectedStoredFormStatBlockId(input);
  if (typeof expected !== "string") return expected.message;
  return expected === input.storedForm.resolvedStatBlockId
    ? null
    : `Retained familiar form proof resolved Stat Block mismatch: ${input.storedForm.resolvedStatBlockId}.`;
}

function selectedStoredFormStatBlockId(input: {
  readonly catalog: StatBlockCatalog;
  readonly storedForm: CompanionBattleAdmissionStoredForm;
  readonly formEligibility: CompanionBattleAdmissionFormEligibility;
}): StatBlockRecord["id"] | { readonly message: string } {
  const selection = input.storedForm.formSelection;
  if (selection.tag === "challengeRatingZeroBeast") {
    const statBlock = input.catalog.getStatBlock(selection.statBlockId);
    /* v8 ignore start -- @preserve -- Malformed authored selection: a retained CR 0 Beast selection is created only after its Stat Block id resolves in the owning catalog. */
    if (Option.isNone(statBlock)) {
      return {
        message: `Retained familiar Challenge Rating 0 Beast form Stat Block is missing: ${selection.statBlockId}.`,
      };
    }
    /* v8 ignore stop -- @preserve */
    if (
      statBlock.value.statBlock.creatureType !== "beast" ||
      statBlock.value.challengeRating !== 0
    ) {
      return {
        message: `Retained familiar Challenge Rating 0 Beast form must resolve to a CR 0 Beast Stat Block: ${selection.statBlockId}.`,
      };
    }
    return selection.statBlockId;
  }
  if (selection.tag === "pactOfTheChainSpecialForm") {
    /* v8 ignore start -- @preserve -- Malformed handoff: the discriminated stored-form variant and its eligibility variant are constructed together at the authored companion boundary. */
    if (input.formEligibility.formAccess !== "pactOfTheChain") {
      return {
        message:
          "Retained familiar Pact of the Chain special form requires Pact of the Chain eligibility.",
      };
    }
    /* v8 ignore stop -- @preserve */
    const specialForm = input.formEligibility.eligibility.specialForms.find(
      (candidate) => candidate.formId === selection.formId,
    );
    /* v8 ignore start -- @preserve -- Malformed authored selection: stored Pact special-form ids originate from this eligibility list. */
    if (specialForm === undefined) {
      return {
        message: `Retained familiar Pact of the Chain special form is unknown: ${selection.formId}.`,
      };
    }
    /* v8 ignore stop -- @preserve */
    return specialForm.statBlockId;
  }
  const normalForm = input.formEligibility.eligibility.normalForms.find(
    (candidate) => candidate.formId === selection.formId,
  );
  /* v8 ignore start -- @preserve -- Malformed authored selection: stored normal-form ids originate from this eligibility list. */
  if (normalForm === undefined) {
    return {
      message: `Retained familiar normal form is not eligible: ${selection.formId}.`,
    };
  }
  /* v8 ignore stop -- @preserve */
  return normalForm.statBlockId;
}

function spendWildCompanionCost(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly spend: WildCompanionSpend;
}):
  | { readonly tag: "resolved"; readonly state: BattleState }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  const spentAction = spendFindFamiliarMagicAction(
    input.state,
    input.casterId,
    "Wild Companion",
  );
  /* v8 ignore start -- @preserve -- Stale subject: Wild Companion discovery requires the caster's Magic action to remain available until resolution. */
  if (spentAction.tag === "invalid") {
    return spentAction;
  }
  /* v8 ignore stop -- @preserve */
  const actor = spentAction.state.combatants.get(input.casterId);
  /* v8 ignore start -- @preserve -- Internal sequencing invariant: spendFindFamiliarMagicAction just resolved for the admitted character caster supplied by Wild Companion discovery. */
  if (actor?.origin.kind !== "character") {
    return invalidFindFamiliarResult(
      input.state,
      "missingCombatant",
      "Wild Companion requires a character caster.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spend = input.spend;
  if (spend.kind === "spellSlot") {
    const slot = actor.origin.spellcasting?.spellSlots.find(
      (candidate) =>
        candidate.spellLevel === spend.spellLevel &&
        candidate.count > candidate.expended,
    );
    /* v8 ignore start -- @preserve -- Stale subject: Wild Companion discovery offers the Spell Slot spend only while that exact slot remains available. */
    if (slot === undefined) {
      return invalidFindFamiliarResult(
        input.state,
        "staleSubject",
        "Wild Companion requires the selected Spell Slot to be available.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const markedSpellSlotUse = markSpellSlotExpendedThisTurn(
      spentAction.state.currentTurnResources,
      input.casterId,
    );
    /* v8 ignore start -- @preserve -- Stale subject: the once-per-turn Spell Slot marker is part of the same discovery gate as the Wild Companion spend option. */
    if (Either.isLeft(markedSpellSlotUse)) {
      return invalidFindFamiliarResult(
        input.state,
        "staleSubject",
        "Wild Companion cannot expend more than one Spell Slot on the same turn.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const stateWithMarkedSpellSlotUse = {
      ...spentAction.state,
      currentTurnResources: markedSpellSlotUse.right,
    };
    return {
      tag: "resolved",
      state: expendSpellSlot(
        stateWithMarkedSpellSlotUse,
        input.casterId,
        spend.spellLevel,
      ),
    };
  }
  const resource = actor.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === spend.resourcePoolRef,
  );
  /* v8 ignore start -- @preserve -- Stale subject: Wild Companion discovery offers a Wild Shape spend only for its owned resource pool while a use remains. */
  if (resource === undefined || !resourceHasUsesRemaining(resource)) {
    return invalidFindFamiliarResult(
      input.state,
      "staleSubject",
      "Wild Companion requires an available Wild Shape use.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const nextActor = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.resourcePoolRef === spend.resourcePoolRef
          ? spendCharacterResourceUse(resource)
          : candidate,
      ),
    },
  };
  return {
    tag: "resolved",
    state: {
      ...spentAction.state,
      combatants: new Map(spentAction.state.combatants).set(
        input.casterId,
        nextActor,
      ),
    },
  };
}

function characterHasWildCompanionFeature(
  execution: CharacterExecutionState,
): boolean {
  return characterUnitProcedureBindings(execution).some(
    ({ procedure }) =>
      procedure.kind === "unitSupportProfile" &&
      procedure.execution === DRUID_WILD_COMPANION_SPELL_CAST_SUPPORT_PROFILE,
  );
}
