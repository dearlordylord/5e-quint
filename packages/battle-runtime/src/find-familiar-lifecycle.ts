// UNIT-PROFILE-COVERAGE: runtime-owner spell.find-familiar-lifecycle
import { spendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { Hp, type PositiveInteger } from "@dnd/shared/types";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import type { SpellRecord, StatBlockRecord } from "@dnd/surface/surface/types";
import * as Either from "effect/Either";
import * as Option from "effect/Option";

import type {
  BattleDroppedObjectOutcome,
  BattleResolutionResult,
  BattleState,
  BattleStateInitIssue,
} from "./battle-reducer.ts";
import { effectiveCharacterBattlePreparedSpells } from "./character-battle-resources.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";
import { snapshotBattle } from "./battle-reducer/dispatcher.ts";
import {
  addBattleCombatant,
  createInitialInitiativeForCombatants,
  removeBattleCombatants,
} from "./battle-reducer/api-lifecycle.ts";
import { battleStateInitIssue } from "./battle-reducer/domain-helpers.ts";
import type {
  BattleTablePositionId,
  CombatantId,
  InitiativeScore,
} from "./identity.ts";
import { spellId } from "./identity.ts";
import { findPresentFamiliarById } from "./find-familiar-state.ts";
import type {
  FindFamiliarCreatureTypeOverride,
  FindFamiliarCreatureTypeOverrideChoice,
  FindFamiliarFormResolution,
  FindFamiliarFormEligibility,
  FindFamiliarFormSelection,
  PactOfTheChainFindFamiliarFormEligibility,
  PactOfTheChainFindFamiliarFormSelection,
} from "./find-familiar-forms.ts";
import {
  findFamiliarFormEligibilityForSpell,
  resolvePactOfTheChainFindFamiliarForm,
  resolveFindFamiliarForm,
  resolveFindFamiliarSelectedForm,
} from "./find-familiar-forms.ts";

const FIND_FAMILIAR_SOURCE_UNIT_ID =
  "find_familiar" as const satisfies SpellRecord["id"];
const FIND_FAMILIAR_SPELL_ID = spellId(FIND_FAMILIAR_SOURCE_UNIT_ID);

export type FindFamiliarPlacement =
  | {
      readonly kind: "unoccupiedSpaceWithinSpellRange";
      readonly positionId?: BattleTablePositionId;
    }
  | {
      readonly kind: "unoccupiedSpaceWithin30Feet";
      readonly positionId?: BattleTablePositionId;
    };

type FindFamiliarStoredForm =
  | {
      readonly formAccess: "findFamiliar";
      readonly formSelection: FindFamiliarFormSelection;
    }
  | {
      readonly formAccess: "pactOfTheChain";
      readonly formSelection: PactOfTheChainFindFamiliarFormSelection;
    };

type FindFamiliarHitPoints = {
  readonly currentHp: FindFamiliarCurrentHitPoints;
  readonly tempHp: Hp;
};
type FindFamiliarCurrentHitPoints = Hp & PositiveInteger;

export type FindFamiliarPresentState = FindFamiliarStoredForm & {
  readonly status: "present";
  readonly familiarId: CombatantId;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
  readonly placement: FindFamiliarPlacement;
};

export type FindFamiliarTemporarilyDismissedState = FindFamiliarStoredForm & {
  readonly status: "temporarilyDismissed";
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
  readonly hitPoints: FindFamiliarHitPoints;
};

export type FindFamiliarDisappearedAtZeroHitPointsState =
  FindFamiliarStoredForm & {
    readonly status: "disappearedAtZeroHitPoints";
    readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
  };

export type FindFamiliarAbsentState =
  | FindFamiliarTemporarilyDismissedState
  | FindFamiliarDisappearedAtZeroHitPointsState;

export type FindFamiliarState =
  | FindFamiliarPresentState
  | FindFamiliarAbsentState;

type FindFamiliarCombatantRemoval =
  | { readonly tag: "resolved"; readonly state: BattleState }
  | Extract<BattleResolutionResult, { readonly tag: "invalid" }>;

export type FindFamiliarSnapshot =
  | (FindFamiliarPresentState & {
      readonly ownerId: CombatantId;
      readonly initiative: InitiativeScore;
    })
  | (FindFamiliarAbsentState & { readonly ownerId: CombatantId });

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
  readonly catalog: StatBlockCatalog;
  readonly eligibility: FindFamiliarFormEligibility;
  readonly selection: FindFamiliarFormSelection;
  readonly creatureTypeOverrideChoiceId: FindFamiliarCreatureTypeOverrideChoice["optionId"];
  readonly familiarId: CombatantId;
  readonly initiative: InitiativeScore;
  readonly placement: Extract<
    FindFamiliarPlacement,
    { readonly kind: "unoccupiedSpaceWithinSpellRange" }
  >;
};

export type FindFamiliarBattleAdmissionInput = {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly catalog: StatBlockCatalog;
  readonly selection: PactOfTheChainFindFamiliarFormSelection;
  readonly creatureTypeOverrideChoiceId: FindFamiliarCreatureTypeOverrideChoice["optionId"];
  readonly familiarId: CombatantId;
  readonly initiative: InitiativeScore;
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
  readonly initialCombatantOrder: ReadonlyMap<CombatantId, number>;
  readonly placement: Extract<
    FindFamiliarPlacement,
    { readonly kind: "unoccupiedSpaceWithinSpellRange" }
  >;
};

export type FindFamiliarReappearanceInput = {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly catalog: StatBlockCatalog;
  readonly eligibility:
    | FindFamiliarFormEligibility
    | PactOfTheChainFindFamiliarFormEligibility;
  readonly familiarId: CombatantId;
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
  const priorFamiliar = input.state.findFamiliars.get(input.casterId);
  const familiarId =
    priorFamiliar?.status === "present"
      ? priorFamiliar.familiarId
      : input.familiarId;
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
    storedForm: { formAccess: "findFamiliar", formSelection: input.selection },
    familiarId,
    creatureTypeOverride: resolvedForm.form.creatureTypeOverride,
    placement: input.placement,
  });
  const preservedHitPoints = hitPointsForFindFamiliarCast({
    state: input.state,
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

export function admitPresentFindFamiliarToBattle(
  input: FindFamiliarBattleAdmissionInput,
): Either.Either<BattleState, BattleStateInitIssue> {
  const eligibility = findFamiliarAdmissionEligibilityForOwner({
    state: input.state,
    casterId: input.casterId,
  });
  if (eligibility.tag === "issue") {
    return battleStateInitIssue(eligibility.message);
  }

  const admittedForm = resolveFindFamiliarAdmissionForm({
    catalog: input.catalog,
    eligibility,
    selection: input.selection,
    creatureTypeOverrideChoiceId: input.creatureTypeOverrideChoiceId,
  });
  if (admittedForm.tag === "issue") {
    return battleStateInitIssue(admittedForm.message);
  }
  const nextFamiliar = findFamiliarPresentState({
    storedForm: admittedForm.storedForm,
    familiarId: input.familiarId,
    creatureTypeOverride: admittedForm.form.creatureTypeOverride,
    placement: input.placement,
  });
  const nextState = withFindFamiliarCombatant({
    state: input.state,
    casterId: input.casterId,
    familiar: nextFamiliar,
    initiative: input.initiative,
    statBlock: familiarStatBlockWithCreatureTypeOverride(admittedForm.form),
    ...(input.currentHp === undefined ? {} : { currentHp: input.currentHp }),
    ...(input.tempHp === undefined ? {} : { tempHp: input.tempHp }),
  });
  if (nextState.tag === "invalid") {
    return battleStateInitIssue(nextState.message);
  }
  return withInitialInitiativeOrder(
    nextState.state,
    input.initialCombatantOrder,
  );
}

type FindFamiliarAdmissionEligibility =
  | {
      readonly tag: "resolved";
      readonly kind: "findFamiliar";
      readonly eligibility: FindFamiliarFormEligibility;
    }
  | {
      readonly tag: "resolved";
      readonly kind: "pactOfTheChain";
      readonly eligibility: PactOfTheChainFindFamiliarFormEligibility;
    }
  | {
      readonly tag: "issue";
      readonly message: string;
    };

type ResolvedFindFamiliarAdmissionEligibility = Extract<
  FindFamiliarAdmissionEligibility,
  { readonly tag: "resolved" }
>;
type ResolvedFindFamiliarForm = Extract<
  FindFamiliarFormResolution,
  { readonly tag: "resolved" }
>["form"];

function resolveFindFamiliarAdmissionForm(input: {
  readonly catalog: StatBlockCatalog;
  readonly eligibility: ResolvedFindFamiliarAdmissionEligibility;
  readonly selection: PactOfTheChainFindFamiliarFormSelection;
  readonly creatureTypeOverrideChoiceId: FindFamiliarCreatureTypeOverrideChoice["optionId"];
}):
  | {
      readonly tag: "resolved";
      readonly form: ResolvedFindFamiliarForm;
      readonly storedForm: FindFamiliarStoredForm;
    }
  | { readonly tag: "issue"; readonly message: string } {
  if (input.eligibility.kind === "pactOfTheChain") {
    const form = resolvePactOfTheChainFindFamiliarForm({
      catalog: input.catalog,
      eligibility: input.eligibility.eligibility,
      selection: input.selection,
      creatureTypeOverrideChoiceId: input.creatureTypeOverrideChoiceId,
    });
    return form.tag === "issue"
      ? form
      : {
          tag: "resolved",
          form: form.form,
          storedForm: {
            formAccess: "pactOfTheChain",
            formSelection: input.selection,
          },
        };
  }
  if (input.selection.tag === "pactOfTheChainSpecialForm") {
    return {
      tag: "issue",
      message:
        "Pact of the Chain familiar forms require Pact of the Chain Find Familiar access.",
    };
  }
  const form = resolveFindFamiliarForm({
    catalog: input.catalog,
    eligibility: input.eligibility.eligibility,
    selection: input.selection,
    creatureTypeOverrideChoiceId: input.creatureTypeOverrideChoiceId,
  });
  return form.tag === "issue"
    ? form
    : {
        tag: "resolved",
        form: form.form,
        storedForm: {
          formAccess: "findFamiliar",
          formSelection: input.selection,
        },
      };
}

function findFamiliarPresentState(input: {
  readonly storedForm: FindFamiliarStoredForm;
  readonly familiarId: CombatantId;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
  readonly placement: FindFamiliarPlacement;
}): FindFamiliarPresentState {
  return {
    ...storedFindFamiliarForm(input.storedForm),
    status: "present",
    familiarId: input.familiarId,
    creatureTypeOverride: input.creatureTypeOverride,
    placement: input.placement,
  };
}

function findFamiliarTemporarilyDismissedState(input: {
  readonly storedForm: FindFamiliarStoredForm;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
  readonly hitPoints: FindFamiliarHitPoints;
}): FindFamiliarTemporarilyDismissedState {
  return {
    ...storedFindFamiliarForm(input.storedForm),
    status: "temporarilyDismissed",
    creatureTypeOverride: input.creatureTypeOverride,
    hitPoints: input.hitPoints,
  };
}

function findFamiliarDisappearedAtZeroHitPointsState(input: {
  readonly storedForm: FindFamiliarStoredForm;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
}): FindFamiliarDisappearedAtZeroHitPointsState {
  return {
    ...storedFindFamiliarForm(input.storedForm),
    status: "disappearedAtZeroHitPoints",
    creatureTypeOverride: input.creatureTypeOverride,
  };
}

function storedFindFamiliarForm(
  storedForm: FindFamiliarStoredForm,
): FindFamiliarStoredForm {
  return storedForm.formAccess === "findFamiliar"
    ? {
        formAccess: "findFamiliar",
        formSelection: storedForm.formSelection,
      }
    : {
        formAccess: "pactOfTheChain",
        formSelection: storedForm.formSelection,
      };
}

function findFamiliarAdmissionEligibilityForOwner(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
}): FindFamiliarAdmissionEligibility {
  if (input.state.findFamiliars.has(input.casterId)) {
    return {
      tag: "issue",
      message:
        "Source-linked Find Familiar admission requires at most one familiar per source actor.",
    };
  }
  const owner = input.state.combatants.get(input.casterId);
  if (owner === undefined) {
    return {
      tag: "issue",
      message: "Find Familiar admission source actor is not in this battle.",
    };
  }
  if (owner.origin.kind !== "character" || owner.origin.spellcasting == null) {
    return {
      tag: "issue",
      message:
        "Find Familiar admission source actor must be a character with Find Familiar access.",
    };
  }
  const spellcasting = owner.origin.spellcasting;

  const pactAccess = spellcasting.invocationSpellAccesses.find(
    (access) => access.tag === "pactOfTheChainFindFamiliar",
  );
  if (pactAccess !== undefined) {
    return {
      tag: "resolved",
      kind: "pactOfTheChain",
      eligibility: pactAccess.eligibleForms,
    };
  }

  const findFamiliarSpell = effectiveCharacterBattlePreparedSpells(
    spellcasting,
  ).find((spell) => spell.id === FIND_FAMILIAR_SPELL_ID);
  if (findFamiliarSpell !== undefined) {
    const eligibility = findFamiliarFormEligibilityForSpell(findFamiliarSpell);
    if (eligibility === null) {
      return {
        tag: "issue",
        message:
          "Find Familiar admission requires familiar form catalog references.",
      };
    }
    return {
      tag: "resolved",
      kind: "findFamiliar",
      eligibility,
    };
  }

  const ritualAccess = spellcasting.spellbookRitualSpellAccesses.find(
    (access) => access.spell.id === FIND_FAMILIAR_SOURCE_UNIT_ID,
  );
  if (ritualAccess === undefined) {
    return {
      tag: "issue",
      message:
        "Find Familiar admission source actor does not have Find Familiar prepared, available through spellbook Ritual access, or selected through Pact of the Chain.",
    };
  }
  const eligibility = findFamiliarFormEligibilityForSpell(ritualAccess.spell);
  if (eligibility === null) {
    return {
      tag: "issue",
      message:
        "Find Familiar admission requires familiar form catalog references.",
    };
  }
  return {
    tag: "resolved",
    kind: "findFamiliar",
    eligibility,
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
  return Either.isLeft(initiative)
    ? Either.left(initiative.left)
    : Either.right({ ...state, initiative: initiative.right });
}

function hitPointsForFindFamiliarCast(input: {
  readonly state: BattleState;
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
      ? presentFindFamiliarHitPoints(input.state, input.priorFamiliar)
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
  familiar: FindFamiliarPresentState,
): FindFamiliarHitPoints | string {
  const combatant = state.combatants.get(familiar.familiarId);
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
  const familiar = input.state.findFamiliars.get(input.casterId);
  if (familiar === undefined) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar caster has no familiar to dismiss.",
    );
  }
  if (familiar.status !== "present") {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar can be temporarily dismissed only while present.",
    );
  }
  const spent = spendFindFamiliarMagicAction(
    input.state,
    input.casterId,
    "Find Familiar temporary dismissal",
  );
  if (spent.tag === "invalid") {
    return spent;
  }
  const hitPoints = presentFindFamiliarHitPoints(input.state, familiar);
  if (typeof hitPoints === "string") {
    return invalidFindFamiliarResult(input.state, "invalidFill", hitPoints);
  }
  const nextFamiliar = findFamiliarTemporarilyDismissedState({
    storedForm: familiar,
    creatureTypeOverride: familiar.creatureTypeOverride,
    hitPoints,
  });
  const nextState = withoutPresentFindFamiliarCombatant(
    withFindFamiliar(spent.state, input.casterId, nextFamiliar),
    familiar.familiarId,
  );
  if (nextState.tag === "invalid") {
    return nextState;
  }
  return resolvedFindFamiliarResult(
    nextState.state,
    droppedObjectsForFamiliarDisappearance({
      casterId: input.casterId,
      familiarId: familiar.familiarId,
      ...(input.heldObjectIds === undefined
        ? {}
        : { heldObjectIds: input.heldObjectIds }),
    }),
  );
}

export function permanentlyDismissFindFamiliar(
  input: FindFamiliarOwnerInput,
): BattleResolutionResult {
  const familiar = input.state.findFamiliars.get(input.casterId);
  if (familiar === undefined) {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar caster has no familiar to dismiss forever.",
    );
  }
  const findFamiliars = new Map(input.state.findFamiliars);
  findFamiliars.delete(input.casterId);
  if (familiar.status !== "present") {
    return resolvedFindFamiliarResult({ ...input.state, findFamiliars }, []);
  }
  const nextState = withoutPresentFindFamiliarCombatant(
    { ...input.state, findFamiliars },
    familiar.familiarId,
  );
  return nextState.tag === "invalid"
    ? nextState
    : resolvedFindFamiliarResult(nextState.state, []);
}

export function reappearTemporarilyDismissedFindFamiliar(
  input: FindFamiliarReappearanceInput,
): BattleResolutionResult {
  const familiar = input.state.findFamiliars.get(input.casterId);
  if (familiar === undefined || familiar.status !== "temporarilyDismissed") {
    return invalidFindFamiliarResult(
      input.state,
      "invalidFill",
      "Find Familiar can reappear only from temporary dismissal.",
    );
  }
  const identityIssue = findFamiliarIdentityIssue(
    input.state,
    input.casterId,
    input.familiarId,
  );
  if (identityIssue !== null) {
    return invalidFindFamiliarResult(input.state, "invalidFill", identityIssue);
  }
  const nextFamiliar = findFamiliarPresentState({
    storedForm: familiar,
    familiarId: input.familiarId,
    creatureTypeOverride: familiar.creatureTypeOverride,
    placement: input.placement,
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
    eligibility: input.eligibility,
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
  readonly eligibility:
    | FindFamiliarFormEligibility
    | PactOfTheChainFindFamiliarFormEligibility;
  readonly storedForm: FindFamiliarStoredForm;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
}): FindFamiliarFormResolution {
  if (input.storedForm.formAccess === "findFamiliar") {
    return resolveFindFamiliarSelectedForm({
      catalog: input.catalog,
      eligibility: input.eligibility,
      selection: input.storedForm.formSelection,
      creatureTypeOverride: input.creatureTypeOverride,
    });
  }
  if (!("specialForms" in input.eligibility)) {
    return {
      tag: "issue",
      message:
        "Pact of the Chain familiar forms require Pact of the Chain Find Familiar access.",
    };
  }
  const selection = input.storedForm.formSelection;
  if (selection.tag !== "pactOfTheChainSpecialForm") {
    return resolveFindFamiliarSelectedForm({
      catalog: input.catalog,
      eligibility: input.eligibility,
      selection,
      creatureTypeOverride: input.creatureTypeOverride,
    });
  }
  const formRef = input.eligibility.specialForms.find(
    (candidate) => candidate.formId === selection.formId,
  );
  if (formRef === undefined) {
    return {
      tag: "issue",
      message: `Pact of the Chain familiar form is not eligible: ${selection.formId}.`,
    };
  }
  const statBlock = input.catalog.getStatBlock(formRef.statBlockId);
  return Option.isNone(statBlock)
    ? {
        tag: "issue",
        message: `Pact of the Chain familiar form Stat Block is missing: ${formRef.statBlockId}.`,
      }
    : {
        tag: "resolved",
        form: {
          statBlock: statBlock.value,
          creatureTypeOverride: input.creatureTypeOverride,
        },
      };
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
  const nextFamiliar = findFamiliarDisappearedAtZeroHitPointsState({
    storedForm: entry.familiar,
    creatureTypeOverride: entry.familiar.creatureTypeOverride,
  });
  const nextState = withoutPresentFindFamiliarCombatant(
    withFindFamiliar(input.state, entry.ownerId, nextFamiliar),
    entry.familiar.familiarId,
  );
  if (nextState.tag === "invalid") {
    return nextState;
  }
  return resolvedFindFamiliarResult(
    nextState.state,
    droppedObjectsForFamiliarDisappearance({
      casterId: entry.ownerId,
      familiarId: entry.familiar.familiarId,
      ...(input.heldObjectIds === undefined
        ? {}
        : { heldObjectIds: input.heldObjectIds }),
    }),
  );
}

function withFindFamiliarCombatant(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
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
    input.familiar.familiarId,
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
      combatantId: input.familiar.familiarId,
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
    state: withFindFamiliar(added.right, input.casterId, input.familiar),
  };
}

function withoutPresentFindFamiliarCombatant(
  state: BattleState,
  familiarId: CombatantId,
): FindFamiliarCombatantRemoval {
  if (!state.combatants.has(familiarId)) {
    return { tag: "resolved", state };
  }
  const removed = removeBattleCombatants({
    state,
    combatantIds: [familiarId],
  });
  return Either.isLeft(removed)
    ? invalidFindFamiliarResult(state, "invalidFill", removed.left.message)
    : { tag: "resolved", state: removed.right };
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
  casterId: CombatantId,
  familiar: FindFamiliarState,
): BattleState {
  return {
    ...state,
    findFamiliars: new Map(state.findFamiliars).set(casterId, familiar),
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

function droppedObjectsForFamiliarDisappearance(input: {
  readonly casterId: CombatantId;
  readonly familiarId: CombatantId;
  readonly heldObjectIds?: readonly BattleDroppedObjectOutcome["objectId"][];
}): readonly BattleDroppedObjectOutcome[] {
  const objectIds = input.heldObjectIds ?? [];
  return objectIds.map((objectId) => ({
    kind: "heldObjectDropped",
    actorId: input.familiarId,
    objectId,
    sourceCombatantId: input.casterId,
    sourceSpellId: FIND_FAMILIAR_SPELL_ID,
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
