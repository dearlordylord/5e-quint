// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
import { spendAction } from "@dnd/shared-algebras/action-economy-algebra";
import {
  Hp,
  type PositiveInteger,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import type {
  SpellRecord,
  StatBlockRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import * as Either from "effect/Either";
import * as Option from "effect/Option";

import type {
  BattleDroppedObjectOutcome,
  BattleResolutionResult,
  BattleState,
  BattleStateInitIssue,
} from "./battle-reducer.ts";
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
} from "./character-battle-resources.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import { snapshotBattle } from "./battle-reducer/dispatcher.ts";
import {
  addBattleCombatant,
  createInitialInitiativeForCombatants,
  removeBattleCombatants,
} from "./battle-reducer/api-lifecycle.ts";
import { battleStateInitIssue } from "./battle-reducer/domain-helpers.ts";
import type { CombatantId, InitiativeScore } from "./identity.ts";
import { spellId } from "./identity.ts";
import { findPresentFamiliarById } from "./find-familiar-state.ts";
import {
  companionEntries,
  findCompanionByOwner,
  findCompanionEntryByOwner,
  setCompanion,
  type BattleCompanionAbsentState,
  type BattleCompanionDisappearedAtZeroHitPointsState,
  type BattleCompanionDurableId,
  type BattleCompanionExpiration,
  type BattleCompanionHitPoints,
  type BattleCompanionIdentity,
  type BattleCompanionPlacement,
  type BattleCompanionPresentState,
  type BattleCompanionSnapshot,
  type BattleCompanionSelectedForm,
  type BattleCompanionState,
  type BattleCompanionStoredForm,
  type BattleCompanionTemporarilyDismissedState,
} from "./companion-state.ts";
import type {
  FindFamiliarCreatureTypeOverride,
  FindFamiliarCreatureTypeOverrideChoice,
  FindFamiliarFormEligibility,
  FindFamiliarFormResolution,
  FindFamiliarFormSelection,
  PactOfTheChainFindFamiliarFormEligibility,
} from "./find-familiar-forms.ts";
import {
  findFamiliarFormEligibilityForSpell,
  resolveFindFamiliarForm,
} from "./find-familiar-forms.ts";
import { expendSpellSlot } from "./battle-reducer/spell-effects.ts";
import { markSpellSlotExpendedThisTurn } from "./battle-reducer/spell-turn-resources.ts";
import { DRUID_WILD_COMPANION_SPELL_CAST_SUPPORT_PROFILE } from "./unit-feature-support.ts";

// Required SRD source-record id: Spells/Descriptions-E-L.md:313 says the
// familiar leaves carried objects behind when it disappears; the dropped-object
// outcome carries the spell source for trace consumers.
const FIND_FAMILIAR_DROPPED_OBJECT_SOURCE_SPELL_ID = spellId(
  "find_familiar" satisfies SpellRecord["id"],
);

export type FindFamiliarPlacement = BattleCompanionPlacement;
type FindFamiliarStoredForm = BattleCompanionStoredForm;
type FindFamiliarSelectedForm = BattleCompanionSelectedForm;
type FindFamiliarHitPoints = BattleCompanionHitPoints;
type FindFamiliarCurrentHitPoints = Hp & PositiveInteger;

export type FindFamiliarPresentState = BattleCompanionPresentState;
export type FindFamiliarTemporarilyDismissedState =
  BattleCompanionTemporarilyDismissedState;
export type FindFamiliarDisappearedAtZeroHitPointsState =
  BattleCompanionDisappearedAtZeroHitPointsState;
export type FindFamiliarAbsentState = BattleCompanionAbsentState;
export type FindFamiliarState = BattleCompanionState;

type FindFamiliarCombatantRemoval =
  | { readonly tag: "resolved"; readonly state: BattleState }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }>;

export type FindFamiliarSnapshot = BattleCompanionSnapshot;

export type FindFamiliarOwnerInput = {
  readonly state: BattleState;
  readonly casterId: CombatantId;
};

export type FindFamiliarLifecycleInputBase = FindFamiliarOwnerInput & {
  readonly heldObjectIds?: readonly BattleDroppedObjectOutcome["objectId"][];
};

export type FindFamiliarCastInput = {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly familiarId: CombatantId;
  readonly catalog: StatBlockCatalog;
  readonly eligibility: FindFamiliarFormEligibility;
  readonly selection: FindFamiliarFormSelection;
  readonly creatureTypeOverrideChoiceId: FindFamiliarCreatureTypeOverrideChoice["optionId"];
  readonly initiative: InitiativeScore;
  readonly placement: Extract<
    FindFamiliarPlacement,
    { readonly kind: "unoccupiedSpaceWithinSpellRange" }
  >;
};

export type WildCompanionSpend =
  | { readonly kind: "spellSlot"; readonly spellLevel: SpellSlotLevel }
  | {
      readonly kind: "wildShapeUse";
      readonly resourceUnitId: "druid_wild_shape";
    };

export type WildCompanionCastInput = Omit<
  FindFamiliarCastInput,
  "creatureTypeOverrideChoiceId" | "eligibility"
> & {
  readonly findFamiliarSpell: SpellRecord;
  readonly spend: WildCompanionSpend;
};

export type CompanionLongRestDisappearanceTrigger =
  | { readonly tag: "ownerFinishedLongRest"; readonly ownerId: CombatantId }
  | { readonly tag: "allCompanionOwnersFinishedLongRest" };

export type CompanionBattleAdmissionManifestation =
  | {
      readonly tag: "embodiedOutsideBattle";
      readonly storedForm: BattleCompanionStoredForm;
      readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
      readonly hitPoints: BattleCompanionHitPoints;
      readonly initiative: InitiativeScore;
      readonly placement: Extract<
        FindFamiliarPlacement,
        { readonly kind: "unoccupiedSpaceWithinSpellRange" }
      >;
    }
  | {
      readonly tag: "temporarilyDismissed";
      readonly storedForm: BattleCompanionStoredForm;
      readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
      readonly hitPoints: BattleCompanionHitPoints;
      readonly reappearanceCombatantId: CombatantId;
    }
  | {
      readonly tag: "disappearedAtZeroHitPoints";
      readonly storedForm: BattleCompanionStoredForm;
      readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
    };

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
  readonly expiration: BattleCompanionExpiration;
  readonly catalog: StatBlockCatalog;
  readonly formEligibility: CompanionBattleAdmissionFormEligibility;
  readonly initialCombatantOrder: ReadonlyMap<CombatantId, number>;
};

export type CompanionBattleAdmissionInput =
  | (CompanionBattleAdmissionInputBase & {
      readonly companionId: CombatantId;
      readonly manifestation: Extract<
        CompanionBattleAdmissionManifestation,
        { readonly tag: "embodiedOutsideBattle" }
      >;
    })
  | (CompanionBattleAdmissionInputBase & {
      readonly manifestation: Exclude<
        CompanionBattleAdmissionManifestation,
        { readonly tag: "embodiedOutsideBattle" }
      >;
    });

export type FindFamiliarReappearanceInput = {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly catalog: StatBlockCatalog;
  readonly initiative: InitiativeScore;
  readonly placement: Extract<
    FindFamiliarPlacement,
    { readonly kind: "unoccupiedSpaceWithin30Feet" }
  >;
};

export function castFindFamiliar(
  input: FindFamiliarCastInput,
): BattleResolutionResult {
  if (!input.state.combatants.has(input.casterId)) {
    return invalidFindFamiliarResult(
      input.state,
      "missingCombatant",
      "Find Familiar caster is not in this battle.",
    );
  }
  const priorFamiliarEntry = findCompanionEntryByOwner(
    input.state.companions,
    input.casterId,
  );
  const priorFamiliar = priorFamiliarEntry?.companion;
  const priorPresentFamiliarId =
    priorFamiliarEntry?.companion.status === "present"
      ? priorFamiliarEntry.companion.combatantId
      : undefined;
  const familiarId = priorPresentFamiliarId ?? input.familiarId;
  const identityIssue = findFamiliarIdentityIssue(
    input.state,
    input.casterId,
    familiarId,
  );
  if (identityIssue !== null) {
    return invalidFindFamiliarResult(input.state, "invalidFill", identityIssue);
  }
  const resolvedForm = resolveFindFamiliarForm({
    catalog: input.catalog,
    eligibility: input.eligibility,
    selection: input.selection,
    creatureTypeOverrideChoiceId: input.creatureTypeOverrideChoiceId,
  });
  if (resolvedForm.tag === "issue") {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      resolvedForm.message,
    );
  }
  const nextFamiliar = findFamiliarPresentState({
    form: {
      formAccess: "findFamiliar",
      formSelection: input.selection,
    },
    combatantId: familiarId,
    identity: priorFamiliar?.identity ?? { tag: "battleOnly" },
    expiration: { tag: "none" },
    creatureTypeOverride: resolvedForm.form.creatureTypeOverride,
    placement: input.placement,
    ownerId: input.casterId,
  });
  const preservedHitPoints = hitPointsForFindFamiliarCast({
    state: input.state,
    priorFamiliarId: priorPresentFamiliarId,
    priorFamiliar,
    statBlock: resolvedForm.form.statBlock,
  });
  if (typeof preservedHitPoints === "string") {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      preservedHitPoints,
    );
  }
  const nextState = withFindFamiliarCombatant({
    state: input.state,
    casterId: input.casterId,
    familiarId,
    familiar: nextFamiliar,
    initiative: input.initiative,
    statBlock: familiarStatBlockWithCreatureTypeOverride(resolvedForm.form),
    ...(preservedHitPoints === null
      ? {}
      : {
          currentHp: preservedHitPoints.currentHp,
          tempHp: preservedHitPoints.tempHp,
        }),
  });
  return nextState.tag === "invalid"
    ? nextState
    : resolvedFindFamiliarResult(nextState.state, []);
}

export function castWildCompanion(
  input: WildCompanionCastInput,
): BattleResolutionResult {
  const eligibility = findFamiliarFormEligibilityForSpell(
    input.findFamiliarSpell,
  );
  if (eligibility === null) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Wild Companion requires Find Familiar form eligibility.",
    );
  }
  const owner = input.state.combatants.get(input.casterId);
  if (owner?.origin.kind !== "character") {
    return invalidFindFamiliarResult(
      input.state,
      "missingCombatant",
      "Wild Companion caster is not a character in this battle.",
    );
  }
  if (!characterHasWildCompanionFeature(owner.origin.characterUnitRefs)) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Wild Companion requires the Druid Wild Companion feature.",
    );
  }
  const spent = spendWildCompanionCost({
    state: input.state,
    casterId: input.casterId,
    spend: input.spend,
  });
  if (spent.tag === "invalid") {
    return spent;
  }
  const resolvedForm = resolveFindFamiliarForm({
    catalog: input.catalog,
    eligibility,
    selection: input.selection,
    creatureTypeOverrideChoiceId: "fey",
  });
  if (resolvedForm.tag === "issue") {
    return invalidFindFamiliarResult(
      spent.state,
      "invalidFill",
      resolvedForm.message,
    );
  }
  const priorFamiliarEntry = findCompanionEntryByOwner(
    spent.state.companions,
    input.casterId,
  );
  const priorFamiliar = priorFamiliarEntry?.companion;
  const priorPresentFamiliarId =
    priorFamiliarEntry?.companion.status === "present"
      ? priorFamiliarEntry.companion.combatantId
      : undefined;
  const familiarId = priorPresentFamiliarId ?? input.familiarId;
  const identityIssue = findFamiliarIdentityIssue(
    spent.state,
    input.casterId,
    familiarId,
  );
  if (identityIssue !== null) {
    return invalidFindFamiliarResult(spent.state, "invalidFill", identityIssue);
  }
  const nextFamiliar = findFamiliarPresentState({
    form: {
      formAccess: "findFamiliar",
      formSelection: input.selection,
    },
    combatantId: familiarId,
    identity: priorFamiliar?.identity ?? { tag: "battleOnly" },
    expiration: { tag: "ownerFinishedLongRest" },
    creatureTypeOverride: "fey",
    placement: input.placement,
    ownerId: input.casterId,
  });
  const preservedHitPoints = hitPointsForFindFamiliarCast({
    state: spent.state,
    priorFamiliarId: priorPresentFamiliarId,
    priorFamiliar,
    statBlock: resolvedForm.form.statBlock,
  });
  if (typeof preservedHitPoints === "string") {
    return invalidFindFamiliarResult(
      spent.state,
      "invalidFill",
      preservedHitPoints,
    );
  }
  const nextState = withFindFamiliarCombatant({
    state: spent.state,
    casterId: input.casterId,
    familiarId,
    familiar: nextFamiliar,
    initiative: input.initiative,
    statBlock: familiarStatBlockWithCreatureTypeOverride({
      statBlock: resolvedForm.form.statBlock,
      creatureTypeOverride: "fey",
    }),
    ...(preservedHitPoints === null
      ? {}
      : {
          currentHp: preservedHitPoints.currentHp,
          tempHp: preservedHitPoints.tempHp,
        }),
  });
  return nextState.tag === "invalid"
    ? nextState
    : resolvedFindFamiliarResult(nextState.state, []);
}

export function admitCompanionToBattle(
  input: CompanionBattleAdmissionInput,
): Either.Either<BattleState, BattleStateInitIssue> {
  if (!input.state.combatants.has(input.ownerId)) {
    return battleStateInitIssue(
      "Companion admission owner is not in this battle.",
    );
  }
  if (input.identity.durableCompanionId.length === 0) {
    return battleStateInitIssue("Companion admission requires durable id.");
  }
  if (
    findCompanionByOwner(input.state.companions, input.ownerId) !== undefined
  ) {
    return battleStateInitIssue(
      "Companion admission requires at most one retained companion per owner.",
    );
  }
  if (
    companionDurableIdentityInUse(
      input.state.companions,
      input.identity.durableCompanionId,
    )
  ) {
    return battleStateInitIssue(
      "Companion admission identity is already used by another companion.",
    );
  }
  if (!("companionId" in input)) {
    return admitAbsentCompanionToBattle({
      ...input,
    });
  }
  if (input.manifestation.tag !== "embodiedOutsideBattle") {
    return battleStateInitIssue(
      "Present companion admission requires embodied manifestation.",
    );
  }
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
  if (resolvedForm.tag === "issue") {
    return battleStateInitIssue(resolvedForm.message);
  }
  const nextCompanion = findFamiliarPresentState({
    form: input.manifestation.storedForm,
    combatantId: input.companionId,
    identity: input.identity,
    expiration: input.expiration,
    creatureTypeOverride: input.manifestation.creatureTypeOverride,
    placement: input.manifestation.placement,
    ownerId: input.ownerId,
  });
  const nextState = withFindFamiliarCombatant({
    state: input.state,
    casterId: input.ownerId,
    familiarId: input.companionId,
    familiar: nextCompanion,
    initiative: input.manifestation.initiative,
    statBlock: familiarStatBlockWithCreatureTypeOverride(resolvedForm.form),
    currentHp: input.manifestation.hitPoints.currentHp,
    tempHp: input.manifestation.hitPoints.tempHp,
  });
  if (nextState.tag === "invalid") {
    return battleStateInitIssue(nextState.message);
  }
  return withInitialInitiativeOrder(
    nextState.state,
    input.initialCombatantOrder,
  );
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
          storedForm: input.manifestation.storedForm,
          identity: input.identity,
          expiration: input.expiration,
          creatureTypeOverride: input.manifestation.creatureTypeOverride,
          hitPoints: input.manifestation.hitPoints,
          reappearanceCombatantId:
            input.manifestation.reappearanceCombatantId,
          ownerId: input.ownerId,
        })
      : findFamiliarDisappearedAtZeroHitPointsState({
          storedForm: input.manifestation.storedForm,
          identity: input.identity,
          expiration: input.expiration,
          creatureTypeOverride: input.manifestation.creatureTypeOverride,
          ownerId: input.ownerId,
        });
  if (companion.identity.tag !== "retainedBetweenBattles") {
    return battleStateInitIssue(
      "Retained companion admission requires retained identity.",
    );
  }
  return Either.right({
    ...input.state,
    companions: setCompanion(input.state.companions, companion),
  });
}

function findFamiliarPresentState(input: {
  readonly form: FindFamiliarSelectedForm;
  readonly combatantId: CombatantId;
  readonly identity: BattleCompanionIdentity;
  readonly expiration: BattleCompanionExpiration;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
  readonly placement: FindFamiliarPlacement;
  readonly ownerId: CombatantId;
}): FindFamiliarPresentState {
  return {
    ...selectedFindFamiliarForm(input.form),
    status: "present",
    combatantId: input.combatantId,
    ownerId: input.ownerId,
    identity: input.identity,
    expiration: input.expiration,
    creatureTypeOverride: input.creatureTypeOverride,
    placement: input.placement,
  };
}

function findFamiliarTemporarilyDismissedState(input: {
  readonly storedForm: FindFamiliarStoredForm;
  readonly identity: BattleCompanionIdentity;
  readonly expiration: BattleCompanionExpiration;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
  readonly hitPoints: FindFamiliarHitPoints;
  readonly reappearanceCombatantId: CombatantId;
  readonly ownerId: CombatantId;
}): FindFamiliarTemporarilyDismissedState {
  return {
    ...storedFindFamiliarForm(input.storedForm),
    status: "temporarilyDismissed",
    ownerId: input.ownerId,
    identity: input.identity,
    expiration: input.expiration,
    creatureTypeOverride: input.creatureTypeOverride,
    reappearanceCombatantId: input.reappearanceCombatantId,
    hitPoints: input.hitPoints,
  };
}

function findFamiliarDisappearedAtZeroHitPointsState(input: {
  readonly storedForm: FindFamiliarStoredForm;
  readonly identity: BattleCompanionIdentity;
  readonly expiration: BattleCompanionExpiration;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
  readonly ownerId: CombatantId;
}): FindFamiliarDisappearedAtZeroHitPointsState {
  return {
    ...storedFindFamiliarForm(input.storedForm),
    status: "disappearedAtZeroHitPoints",
    ownerId: input.ownerId,
    identity: input.identity,
    expiration: input.expiration,
    creatureTypeOverride: input.creatureTypeOverride,
  };
}

function storedFindFamiliarForm(
  storedForm: FindFamiliarStoredForm,
): FindFamiliarStoredForm {
  if (storedForm.formAccess === "findFamiliar") {
    return {
      formAccess: "findFamiliar",
      formSelection: storedForm.formSelection,
      resolvedStatBlockId: storedForm.resolvedStatBlockId,
    };
  }
  if (storedForm.formAccess === "pactOfTheChain") {
    return {
      formAccess: "pactOfTheChain",
      formSelection: storedForm.formSelection,
      resolvedStatBlockId: storedForm.resolvedStatBlockId,
    };
  }
  const _exhaustive: never = storedForm;
  return _exhaustive;
}

function selectedFindFamiliarForm(
  form: FindFamiliarSelectedForm,
): FindFamiliarSelectedForm {
  if (form.formAccess === "findFamiliar") {
    return {
      formAccess: "findFamiliar",
      formSelection: form.formSelection,
    };
  }
  if (form.formAccess === "pactOfTheChain") {
    return {
      formAccess: "pactOfTheChain",
      formSelection: form.formSelection,
    };
  }
  const _exhaustive: never = form;
  return _exhaustive;
}

export function retainedStoredFormForPresentCompanion(input: {
  readonly state: BattleState;
  readonly companionId: CombatantId;
  readonly companion: BattleCompanionPresentState;
}): BattleCompanionStoredForm | string {
  const combatant = input.state.combatants.get(input.companionId);
  if (combatant?.origin.kind !== "statBlock") {
    return "Present companion Stat Block combatant is missing.";
  }
  const resolvedStatBlockId = combatant.origin.statBlock.id;
  if (input.companion.formAccess === "findFamiliar") {
    return {
      formAccess: "findFamiliar",
      formSelection: input.companion.formSelection,
      resolvedStatBlockId,
    };
  }
  if (input.companion.formAccess === "pactOfTheChain") {
    return {
      formAccess: "pactOfTheChain",
      formSelection: input.companion.formSelection,
      resolvedStatBlockId,
    };
  }
  const _exhaustive: never = input.companion;
  return _exhaustive;
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
  return Either.isLeft(initiative)
    ? Either.left(initiative.left)
    : Either.right({ ...state, initiative: initiative.right });
}

function hitPointsForFindFamiliarCast(input: {
  readonly state: BattleState;
  readonly priorFamiliarId: CombatantId | undefined;
  readonly priorFamiliar: FindFamiliarState | undefined;
  readonly statBlock: StatBlockRecord;
}): FindFamiliarHitPoints | null | string {
  if (
    input.priorFamiliar === undefined ||
    input.priorFamiliar.status === "disappearedAtZeroHitPoints"
  ) {
    return null;
  }
  const hitPoints =
    input.priorFamiliar.status === "present"
      ? presentFindFamiliarHitPoints(input.state, input.priorFamiliarId)
      : input.priorFamiliar.hitPoints;
  if (typeof hitPoints === "string") {
    return hitPoints;
  }
  return hitPointsForAdoptedFamiliarForm({
    hitPoints,
    statBlock: input.statBlock,
  });
}

function presentFindFamiliarHitPoints(
  state: BattleState,
  familiarId: CombatantId | undefined,
): FindFamiliarHitPoints | string {
  if (familiarId === undefined) {
    return "Present Find Familiar combatant identity is missing.";
  }
  const combatant = state.combatants.get(familiarId);
  if (combatant === undefined) {
    return "Present Find Familiar combatant is missing.";
  }
  const currentHp = findFamiliarCurrentHitPoints(combatant.hp);
  return typeof currentHp === "string"
    ? currentHp
    : {
        currentHp,
        tempHp: combatant.tempHp,
      };
}

function hitPointsForAdoptedFamiliarForm(input: {
  readonly hitPoints: FindFamiliarHitPoints;
  readonly statBlock: StatBlockRecord;
}): FindFamiliarHitPoints | string {
  const maxHp = familiarMaxHp(input.statBlock);
  if (typeof maxHp === "string") {
    return maxHp;
  }
  const currentHp = findFamiliarCurrentHitPoints(
    Hp(Math.min(Number(input.hitPoints.currentHp), Number(maxHp))),
  );
  return typeof currentHp === "string"
    ? currentHp
    : {
        currentHp,
        tempHp: input.hitPoints.tempHp,
      };
}

function findFamiliarCurrentHitPoints(
  currentHp: Hp,
): FindFamiliarCurrentHitPoints | string {
  if (currentHp < Hp(1)) {
    return "Present Find Familiar current HP must be above 0.";
  }
  // Cast evidence: Hp already proves non-negative integer HP, and the guard
  // above proves the positive part of this lifecycle-specific alias.
  return currentHp as FindFamiliarCurrentHitPoints;
}

export function temporarilyDismissFindFamiliar(
  input: FindFamiliarLifecycleInputBase,
): BattleResolutionResult {
  const familiarEntry = findCompanionEntryByOwner(
    input.state.companions,
    input.casterId,
  );
  if (familiarEntry === undefined) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar caster has no familiar to dismiss.",
    );
  }
  const familiar = familiarEntry.companion;
  if (familiar.status !== "present") {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar can be temporarily dismissed only while present.",
    );
  }
  const familiarId = familiar.combatantId;
  const spent = spendFindFamiliarMagicAction(
    input.state,
    input.casterId,
    "Find Familiar temporary dismissal",
  );
  if (spent.tag === "invalid") {
    return spent;
  }
  const hitPoints = presentFindFamiliarHitPoints(
    input.state,
    familiarId,
  );
  if (typeof hitPoints === "string") {
    return invalidFindFamiliarResult(input.state, "invalidFill", hitPoints);
  }
  const retainedForm = retainedStoredFormForPresentCompanion({
    state: input.state,
    companionId: familiarId,
    companion: familiar,
  });
  if (typeof retainedForm === "string") {
    return invalidFindFamiliarResult(input.state, "invalidFill", retainedForm);
  }
  const nextFamiliar = findFamiliarTemporarilyDismissedState({
    storedForm: retainedForm,
    identity: familiar.identity,
    expiration: familiar.expiration,
    creatureTypeOverride: familiar.creatureTypeOverride,
    hitPoints,
    reappearanceCombatantId: familiarId,
    ownerId: input.casterId,
  });
  const nextState = withoutPresentFindFamiliarCombatant(
    withFindFamiliar(spent.state, nextFamiliar),
    familiarId,
  );
  if (nextState.tag === "invalid") {
    return nextState;
  }
  return resolvedFindFamiliarResult(
    nextState.state,
    droppedObjectsForFamiliarDisappearance({
      casterId: input.casterId,
      familiarId,
      ...(input.heldObjectIds === undefined
        ? {}
        : { heldObjectIds: input.heldObjectIds }),
    }),
  );
}

export function permanentlyDismissFindFamiliar(
  input: FindFamiliarOwnerInput,
): BattleResolutionResult {
  const familiarEntry = findCompanionEntryByOwner(
    input.state.companions,
    input.casterId,
  );
  if (familiarEntry === undefined) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar caster has no familiar to dismiss forever.",
    );
  }
  const familiar = familiarEntry.companion;
  const spent = spendFindFamiliarMagicAction(
    input.state,
    input.casterId,
    "Find Familiar permanent dismissal",
  );
  if (spent.tag === "invalid") {
    return spent;
  }
  const companions = new Map(
    [...spent.state.companions].filter(
      ([, companion]) => companion.ownerId !== input.casterId,
    ),
  );
  if (familiar.status !== "present") {
    return resolvedFindFamiliarResult({ ...spent.state, companions }, []);
  }
  const familiarId = familiar.combatantId;
  const nextState = withoutPresentFindFamiliarCombatant(
    { ...spent.state, companions },
    familiarId,
  );
  return nextState.tag === "invalid"
    ? nextState
    : resolvedFindFamiliarResult(nextState.state, []);
}

export function reappearTemporarilyDismissedFindFamiliar(
  input: FindFamiliarReappearanceInput,
): BattleResolutionResult {
  const familiarEntry = findCompanionEntryByOwner(
    input.state.companions,
    input.casterId,
  );
  if (
    familiarEntry === undefined ||
    familiarEntry.companion.status !== "temporarilyDismissed"
  ) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar can reappear only from temporary dismissal.",
    );
  }
  const familiar = familiarEntry.companion;
  const identityIssue = findFamiliarIdentityIssue(
    input.state,
    input.casterId,
    familiar.reappearanceCombatantId,
  );
  if (identityIssue !== null) {
    return invalidFindFamiliarResult(input.state, "invalidFill", identityIssue);
  }
  const nextFamiliar = findFamiliarPresentState({
    form: familiar,
    combatantId: familiar.reappearanceCombatantId,
    identity: familiar.identity,
    expiration: familiar.expiration,
    creatureTypeOverride: familiar.creatureTypeOverride,
    placement: input.placement,
    ownerId: input.casterId,
  });
  const spent = spendFindFamiliarMagicAction(
    input.state,
    input.casterId,
    "Find Familiar reappearance",
  );
  if (spent.tag === "invalid") {
    return spent;
  }
  const resolvedForm = resolveStoredFindFamiliarForm({
    catalog: input.catalog,
    storedForm: familiar,
    creatureTypeOverride: familiar.creatureTypeOverride,
  });
  if (resolvedForm.tag === "issue") {
    return invalidFindFamiliarResult(
      spent.state,
      "invalidFill",
      resolvedForm.message,
    );
  }
  const nextState = withFindFamiliarCombatant({
    state: spent.state,
    casterId: input.casterId,
    familiarId: familiar.reappearanceCombatantId,
    familiar: nextFamiliar,
    initiative: input.initiative,
    statBlock: familiarStatBlockWithCreatureTypeOverride(resolvedForm.form),
    currentHp: familiar.hitPoints.currentHp,
    tempHp: familiar.hitPoints.tempHp,
  });
  return nextState.tag === "invalid"
    ? nextState
    : resolvedFindFamiliarResult(nextState.state, []);
}

function resolveStoredFindFamiliarForm(input: {
  readonly catalog: StatBlockCatalog;
  readonly formEligibility?: CompanionBattleAdmissionFormEligibility;
  readonly storedForm: FindFamiliarStoredForm;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
}): FindFamiliarFormResolution {
  if (input.formEligibility !== undefined) {
    const resolvedStatBlockIdIssue = storedFormResolvedStatBlockIdIssue({
      catalog: input.catalog,
      storedForm: input.storedForm,
      formEligibility: input.formEligibility,
    });
    if (resolvedStatBlockIdIssue !== null) {
      return {
        tag: "issue",
        message: resolvedStatBlockIdIssue,
      };
    }
  }
  const statBlock = input.catalog.getStatBlock(
    input.storedForm.resolvedStatBlockId,
  );
  return Option.isNone(statBlock)
    ? {
        tag: "issue",
        message: `Retained familiar form Stat Block is missing: ${input.storedForm.resolvedStatBlockId}.`,
      }
    : {
        tag: "resolved",
        form: {
          statBlock: statBlock.value,
          creatureTypeOverride: input.creatureTypeOverride,
        },
      };
}

function storedFormResolvedStatBlockIdIssue(input: {
  readonly catalog: StatBlockCatalog;
  readonly storedForm: FindFamiliarStoredForm;
  readonly formEligibility: CompanionBattleAdmissionFormEligibility;
}): string | null {
  if (input.storedForm.formAccess !== input.formEligibility.formAccess) {
    return "Retained familiar form proof access does not match admission eligibility.";
  }
  const expected = selectedStoredFormStatBlockId(input);
  if (typeof expected !== "string") return expected.message;
  return expected === input.storedForm.resolvedStatBlockId
    ? null
    : `Retained familiar form proof resolved Stat Block mismatch: ${input.storedForm.resolvedStatBlockId}.`;
}

function selectedStoredFormStatBlockId(input: {
  readonly catalog: StatBlockCatalog;
  readonly storedForm: FindFamiliarStoredForm;
  readonly formEligibility: CompanionBattleAdmissionFormEligibility;
}): StatBlockRecord["id"] | { readonly message: string } {
  const selection = input.storedForm.formSelection;
  if (selection.tag === "challengeRatingZeroBeast") {
    const statBlock = input.catalog.getStatBlock(selection.statBlockId);
    if (Option.isNone(statBlock)) {
      return {
        message: `Retained familiar Challenge Rating 0 Beast form Stat Block is missing: ${selection.statBlockId}.`,
      };
    }
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
    if (input.formEligibility.formAccess !== "pactOfTheChain") {
      return {
        message:
          "Retained familiar Pact of the Chain special form requires Pact of the Chain eligibility.",
      };
    }
    const specialForm = input.formEligibility.eligibility.specialForms.find(
      (candidate) => candidate.formId === selection.formId,
    );
    return specialForm === undefined
      ? {
          message: `Retained familiar Pact of the Chain special form is unknown: ${selection.formId}.`,
        }
      : specialForm.statBlockId;
  }
  const normalForm = input.formEligibility.eligibility.normalForms.find(
    (candidate) => candidate.formId === selection.formId,
  );
  return normalForm === undefined
    ? {
        message: `Retained familiar normal form is not eligible: ${selection.formId}.`,
      }
    : normalForm.statBlockId;
}

export function applyFindFamiliarZeroHitPointDisappearance(input: {
  readonly state: BattleState;
  readonly familiarId: CombatantId;
  readonly heldObjectIds?: readonly BattleDroppedObjectOutcome["objectId"][];
}): BattleResolutionResult {
  const entry = findPresentFamiliarById(input.state, input.familiarId);
  if (entry === null) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Familiar identity is not a present Find Familiar familiar.",
    );
  }
  const retainedForm = retainedStoredFormForPresentCompanion({
    state: input.state,
    companionId: input.familiarId,
    companion: entry.familiar,
  });
  if (typeof retainedForm === "string") {
    return invalidFindFamiliarResult(input.state, "invalidFill", retainedForm);
  }
  const nextFamiliar = findFamiliarDisappearedAtZeroHitPointsState({
    storedForm: retainedForm,
    identity: entry.familiar.identity,
    expiration: entry.familiar.expiration,
    creatureTypeOverride: entry.familiar.creatureTypeOverride,
    ownerId: entry.ownerId,
  });
  const nextState = withoutPresentFindFamiliarCombatant(
    withFindFamiliar(input.state, nextFamiliar),
    input.familiarId,
  );
  if (nextState.tag === "invalid") {
    return nextState;
  }
  return resolvedFindFamiliarResult(
    nextState.state,
    droppedObjectsForFamiliarDisappearance({
      casterId: entry.ownerId,
      familiarId: input.familiarId,
      ...(input.heldObjectIds === undefined
        ? {}
        : { heldObjectIds: input.heldObjectIds }),
    }),
  );
}

export function applyCompanionLongRestDisappearance(input: {
  readonly state: BattleState;
  readonly trigger: CompanionLongRestDisappearanceTrigger;
}): BattleResolutionResult {
  const companionsToRemove = companionEntries(input.state.companions).filter(
    (entry) =>
      companionDisappearsAtLongRest(entry.companion) &&
      (input.trigger.tag === "allCompanionOwnersFinishedLongRest" ||
        entry.companion.ownerId === input.trigger.ownerId),
  );
  if (companionsToRemove.length === 0) {
    return resolvedFindFamiliarResult(input.state, []);
  }
  const absentOwnerIds = companionsToRemove.flatMap((entry) =>
    entry.companion.status === "present" ? [] : [entry.ownerId],
  );
  const stateWithoutAbsentCompanions =
    absentOwnerIds.length === 0
      ? input.state
      : {
          ...input.state,
          companions: new Map(
            [...input.state.companions].filter(
              ([ownerId]) => !absentOwnerIds.includes(ownerId),
            ),
          ),
        };
  const presentCompanionIds: CombatantId[] = [];
  for (const entry of companionsToRemove) {
    if (entry.companion.status === "present") {
      presentCompanionIds.push(entry.companion.combatantId);
    }
  }
  if (presentCompanionIds.length === 0) {
    return resolvedFindFamiliarResult(stateWithoutAbsentCompanions, []);
  }
  const removed = removeBattleCombatants({
    state: stateWithoutAbsentCompanions,
    combatantIds: presentCompanionIds,
  });
  return Either.isLeft(removed)
    ? invalidFindFamiliarResult(
        stateWithoutAbsentCompanions,
        "invalidFill",
        removed.left.message,
      )
    : resolvedFindFamiliarResult(removed.right, []);
}

function companionDisappearsAtLongRest(
  companion: BattleCompanionState,
): boolean {
  return companion.expiration.tag === "ownerFinishedLongRest";
}

function withFindFamiliarCombatant(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly familiarId: CombatantId;
  readonly familiar: FindFamiliarPresentState;
  readonly initiative: InitiativeScore;
  readonly statBlock: StatBlockRecord;
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
}):
  | { readonly tag: "resolved"; readonly state: BattleState }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  const owner = input.state.combatants.get(input.casterId);
  if (owner === undefined) {
    return invalidFindFamiliarResult(
      input.state,
      "missingCombatant",
      "Find Familiar caster is not in this battle.",
    );
  }
  const priorWithoutFamiliar = withoutPresentFindFamiliarCombatant(
    input.state,
    input.familiarId,
  );
  if (priorWithoutFamiliar.tag === "invalid") {
    return priorWithoutFamiliar;
  }
  const maxHp = familiarMaxHp(input.statBlock);
  if (typeof maxHp === "string") {
    return invalidFindFamiliarResult(input.state, "invalidFill", maxHp);
  }
  if (maxHp < Hp(1)) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Present Find Familiar requires maximum HP above 0.",
    );
  }
  if (input.currentHp !== undefined && input.currentHp < Hp(1)) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Present Find Familiar admission requires current HP above 0.",
    );
  }
  if (input.currentHp !== undefined && input.currentHp > maxHp) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Present Find Familiar admission current HP must not exceed maximum HP.",
    );
  }
  const added = addBattleCombatant({
    state: priorWithoutFamiliar.state,
    combatant: {
      combatantId: input.familiarId,
      displayName: input.statBlock.statBlock.displayName,
      initiative: input.initiative,
      side: owner.side,
      creatureInit: {
        kind: "statBlock",
        statBlock: input.statBlock,
        currentHp: input.currentHp ?? maxHp,
        maxHp,
        tempHp: input.tempHp ?? Hp(0),
      },
    },
  });
  if (Either.isLeft(added)) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      added.left.message,
    );
  }
  return {
    tag: "resolved",
    state: withFindFamiliar(added.right, input.familiar),
  };
}

function withoutPresentFindFamiliarCombatant(
  state: BattleState,
  familiarId: CombatantId,
): FindFamiliarCombatantRemoval {
  if (!state.combatants.has(familiarId)) {
    return { tag: "resolved", state };
  }
  // Preserve the companion entry the caller already transitioned (dismissed or
  // removed): removing the familiar combatant must not disturb the owner-keyed
  // companions map.
  const companions = state.companions;
  const removed = removeBattleCombatants({
    state,
    combatantIds: [familiarId],
  });
  return Either.isLeft(removed)
    ? invalidFindFamiliarResult(state, "invalidFill", removed.left.message)
    : { tag: "resolved", state: { ...removed.right, companions } };
}

function familiarStatBlockWithCreatureTypeOverride(input: {
  readonly statBlock: StatBlockRecord;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
}): StatBlockRecord {
  return {
    ...input.statBlock,
    statBlock: {
      ...input.statBlock.statBlock,
      creatureType: input.creatureTypeOverride,
    },
  };
}

function familiarMaxHp(statBlock: StatBlockRecord): Hp | string {
  const hp = statBlock.statBlock.hp;
  if (hp.kind !== "literal") {
    return "Find Familiar form Stat Block must use literal HP.";
  }
  return Hp(hp.value);
}

function withFindFamiliar(
  state: BattleState,
  familiar: FindFamiliarState,
): BattleState {
  return {
    ...state,
    companions: setCompanion(state.companions, familiar),
  };
}

function findFamiliarIdentityIssue(
  state: BattleState,
  casterId: CombatantId,
  familiarId: CombatantId,
): string | null {
  if (familiarId === casterId) {
    return "Find Familiar familiar identity must be distinct from its caster.";
  }
  const existing = findPresentFamiliarById(state, familiarId);
  if (existing !== null && existing.ownerId !== casterId) {
    return "Find Familiar familiar identity is already owned by another caster.";
  }
  if (state.combatants.has(familiarId) && existing === null) {
    return "Find Familiar familiar identity must not identify an ordinary combatant.";
  }
  return null;
}

function spendFindFamiliarMagicAction(
  state: BattleState,
  casterId: CombatantId,
  actionLabel: string,
):
  | { readonly tag: "resolved"; readonly state: BattleState }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  if (currentActorId(state) !== casterId) {
    return invalidFindFamiliarResult(
      state,
      "staleSubject",
      `${actionLabel} is available only on the caster's turn.`,
    );
  }
  const spent = spendAction(state.currentTurnResources, "magic");
  return Either.isLeft(spent)
    ? invalidFindFamiliarResult(
        state,
        "staleSubject",
        `${actionLabel} requires an available Magic action.`,
      )
    : {
        tag: "resolved",
        state: {
          ...state,
          currentTurnResources: spent.right,
        },
      };
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
  if (spentAction.tag === "invalid") {
    return spentAction;
  }
  const actor = spentAction.state.combatants.get(input.casterId);
  if (actor?.origin.kind !== "character") {
    return invalidFindFamiliarResult(
      input.state,
      "missingCombatant",
      "Wild Companion requires a character caster.",
    );
  }
  const spend = input.spend;
  if (spend.kind === "spellSlot") {
    const slot = actor.origin.spellcasting?.spellSlots.find(
      (candidate) =>
        candidate.spellLevel === spend.spellLevel &&
        candidate.count > candidate.expended,
    );
    if (slot === undefined) {
      return invalidFindFamiliarResult(
        input.state,
        "staleSubject",
        "Wild Companion requires the selected Spell Slot to be available.",
      );
    }
    const markedSpellSlotUse = markSpellSlotExpendedThisTurn(
      spentAction.state.currentTurnResources,
      input.casterId,
    );
    if (Either.isLeft(markedSpellSlotUse)) {
      return invalidFindFamiliarResult(
        input.state,
        "staleSubject",
        "Wild Companion cannot expend more than one Spell Slot on the same turn.",
      );
    }
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
    (candidate) => candidate.unit.id === spend.resourceUnitId,
  );
  if (resource === undefined || !resourceHasUsesRemaining(resource)) {
    return invalidFindFamiliarResult(
      input.state,
      "staleSubject",
      "Wild Companion requires an available Wild Shape use.",
    );
  }
  const nextActor = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.unit.id === spend.resourceUnitId
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
  characterUnitRefs: readonly {
    readonly unitId: UnitRecord["id"];
    readonly supportProfiles: readonly unknown[];
  }[],
): boolean {
  return characterUnitRefs.some((unitRef) =>
    unitRef.supportProfiles.some(
      (profile) => profile === DRUID_WILD_COMPANION_SPELL_CAST_SUPPORT_PROFILE,
    ),
  );
}

function droppedObjectsForFamiliarDisappearance(input: {
  readonly casterId: CombatantId;
  readonly familiarId: CombatantId;
  readonly heldObjectIds?: readonly BattleDroppedObjectOutcome["objectId"][];
}): readonly BattleDroppedObjectOutcome[] {
  const objectIds = input.heldObjectIds ?? [];
  return objectIds.map((objectId) => ({
    kind: "objectDropped",
    actorId: input.familiarId,
    objectId,
    source: {
      kind: "spell",
      sourceCombatantId: input.casterId,
      sourceSpellId: FIND_FAMILIAR_DROPPED_OBJECT_SOURCE_SPELL_ID,
    },
  }));
}

function resolvedFindFamiliarResult(
  state: BattleState,
  droppedObjects: readonly BattleDroppedObjectOutcome[],
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  return {
    tag: "resolved",
    state,
    snapshot: snapshotBattle(state),
    ...(droppedObjects.length === 0 ? {} : { droppedObjects }),
  };
}

function invalidFindFamiliarResult(
  state: BattleState,
  reason: Extract<
    BattleResolutionResult,
    { readonly tag: "invalid" }
  >["reason"],
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  return {
    tag: "invalid",
    reason,
    message,
    snapshot: snapshotBattle(state),
  };
}
