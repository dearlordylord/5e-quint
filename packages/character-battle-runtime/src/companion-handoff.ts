// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.SETTLEMENT CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS
import {
  admitCompanionToBattle,
  admitCompanionToBattleRuntime,
  findFamiliarCompanionEntryForOwner,
  retainedStoredFormForPresentCompanion,
  type BattleCompanionPlacement,
  type BattleCompanionState,
  type BattleCompanionStoredForm,
  type BattleAmmunitionStock,
  type CompanionBattleAdmissionFormEligibility,
  type CompanionBattleAdmissionInput,
  type CompanionBattleEmbodiedAdmissionManifestation,
  type CompanionBattleStoredAdmissionManifestation,
  type BattleState,
  type BattleRuntimeSession,
  type RetainedCompanionBattleSelection,
  type BattleTablePositionId,
  type CombatantId,
  type InitiativeScore,
} from "@dnd/battle-runtime";
import {
  characterSheetCompanion,
  replaceCharacterSheetCompanion,
  retainedCompanionProtocolFacts,
  type CharacterSheet,
  type CharacterSheetCompanion,
  type CharacterSheetCompanionFormSelection,
  type CharacterSheetRetainedCompanionHitPoints,
  type CharacterSheetRetainedCompanionManifestation,
  type CharacterSheetRetainedCompanionProtocol,
  type CharacterSheetRetainedCompanionResolvedFormProof,
} from "@dnd/character-sheet-runtime";
import {
  findFamiliarFormEligibilityForSpell,
  PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS,
  type FindFamiliarFormEligibility,
  type FindFamiliarFormSelection,
} from "@dnd/surface/surface/find-familiar-forms";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { StatBlockId } from "@dnd/shared/game-facts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { Either, Option } from "effect";
import { isNonEmptyReadonlyArray } from "effect/Array";

import {
  characterSheetBattleHandoffFactFromIssue,
  characterSheetBattleHandoffIssue,
  characterSheetBattleHandoffIssueValue,
  characterSheetBattleHandoffIssuesFromStateInit,
  type CharacterSheetBattleHandoffFact,
  type CharacterSheetBattleHandoffIssue,
} from "./battle-handoff-issue.ts";

export type CharacterSheetCompanionBattleAdmissionInput = {
  readonly sheet: CharacterSheet;
  readonly state: BattleState;
  readonly unitLibrary: UnitCatalog;
  readonly ownerCombatantId: CombatantId;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
  readonly companionCombatantId?: CombatantId;
  readonly initiative?: InitiativeScore;
  readonly placement?: Extract<
    BattleCompanionPlacement,
    { readonly kind: "unoccupiedSpaceWithinSpellRange" }
  >;
  readonly initialCombatantOrder: ReadonlyMap<CombatantId, number>;
  readonly statBlockCatalog: StatBlockCatalog;
};

export type CharacterSheetCompanionBattleRuntimeAdmissionInput = Omit<
  CharacterSheetCompanionBattleAdmissionInput,
  "state"
> & {
  readonly session: BattleRuntimeSession;
};

export type BattleCompanionRosterOwner = {
  /** Owner index in the canonical initial-combatant roster. */
  readonly index: number;
  readonly characterId: CharacterSheet["characterId"];
  readonly combatantId: CombatantId;
  readonly sheet: CharacterSheet;
};

export type BattleCompanionRosterRequest = {
  readonly ownerCharacterId: CharacterSheet["characterId"];
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
  readonly companionCombatantId?: CombatantId;
  readonly initiative?: InitiativeScore;
  readonly positionId?: BattleTablePositionId;
};

export type BattleCompanionRosterIssue =
  | {
      readonly kind: "duplicateCompanionOwnerSource";
      readonly reason: "duplicateOwnerSource";
      readonly ownerIndex: number;
      readonly firstOwnerIndex: number;
      readonly ownerCharacterId: CharacterSheet["characterId"];
    }
  | {
      readonly kind: "duplicateCompanionOwner";
      readonly reason: "duplicateOwner";
      readonly index: number;
      readonly ownerCharacterId: CharacterSheet["characterId"];
      readonly firstIndex: number;
    }
  | {
      readonly kind: "duplicateCompanionCombatantId";
      readonly reason: "duplicateCombatantId";
      readonly index: number;
      readonly companionCombatantId: CombatantId;
      readonly firstIndex: number;
    }
  | {
      readonly kind: "companionOwnerUnavailable";
      readonly reason: "ownerNotInRoster";
      readonly index: number;
      readonly ownerCharacterId: CharacterSheet["characterId"];
      readonly companionCombatantId?: CombatantId;
    }
  | ({
      readonly kind: "companionAdmission";
      readonly admissionReason: "admissionRejected";
      readonly issueTag: CharacterSheetBattleHandoffIssue["tag"];
      readonly index: number;
      readonly ownerCharacterId: CharacterSheet["characterId"];
      readonly companionCombatantId?: CombatantId;
      readonly message: string;
    } & CharacterSheetBattleHandoffFact);

type CharacterSheetBattleHandoffIssues =
  ReadonlyNonEmptyArray<CharacterSheetBattleHandoffIssue>;

type BattleCompanionRosterDependentIssue = Exclude<
  BattleCompanionRosterIssue,
  { readonly kind: "companionAdmission" }
>;

export type BattleCompanionRosterComposition =
  | {
      readonly tag: "admitted";
      readonly session: BattleRuntimeSession;
    }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<BattleCompanionRosterIssue>;
    }
  | {
      readonly tag: "dependentUnavailable";
      readonly issues: readonly BattleCompanionRosterDependentIssue[];
    };

type BattleCompanionRosterIssueCollection = {
  readonly issues: BattleCompanionRosterIssue[];
  readonly dependentIssues: BattleCompanionRosterDependentIssue[];
};

type BattleCompanionRosterIndexes = {
  readonly owners: Map<
    CharacterSheet["characterId"],
    BattleCompanionRosterOwner
  >;
  readonly ownerIndexes: Map<CharacterSheet["characterId"], number>;
  readonly companionIndexes: Map<CombatantId, number>;
};

type BattleCompanionRosterRequestRegistration = {
  readonly owner: BattleCompanionRosterOwner | undefined;
  readonly duplicateOwner: boolean;
  readonly duplicateCompanionCombatant: boolean;
};

type BattleCompanionRosterRequestAdmission =
  | {
      readonly tag: "admitted";
      readonly session: BattleRuntimeSession;
    }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<
        Extract<
          BattleCompanionRosterIssue,
          { readonly kind: "companionAdmission" }
        >
      >;
    };

function appendBattleCompanionRosterIssue(
  collection: BattleCompanionRosterIssueCollection,
  issue: BattleCompanionRosterIssue,
): void {
  collection.issues.push(issue);
  if (issue.kind !== "companionAdmission") {
    collection.dependentIssues.push(issue);
  }
}

function indexBattleCompanionRosterOwners(input: {
  readonly owners: readonly BattleCompanionRosterOwner[];
}): {
  readonly indexes: BattleCompanionRosterIndexes;
  readonly issues: BattleCompanionRosterIssueCollection;
} {
  const owners = new Map<
    CharacterSheet["characterId"],
    BattleCompanionRosterOwner
  >();
  const issues: BattleCompanionRosterIssueCollection = {
    issues: [],
    dependentIssues: [],
  };
  for (const owner of input.owners) {
    const firstOwner = owners.get(owner.characterId);
    if (firstOwner === undefined) {
      owners.set(owner.characterId, owner);
      continue;
    }
    appendBattleCompanionRosterIssue(issues, {
      kind: "duplicateCompanionOwnerSource",
      reason: "duplicateOwnerSource",
      ownerIndex: owner.index,
      firstOwnerIndex: firstOwner.index,
      ownerCharacterId: owner.characterId,
    });
  }
  return {
    indexes: {
      owners,
      ownerIndexes: new Map(),
      companionIndexes: new Map(),
    },
    issues,
  };
}

function registerBattleCompanionRosterOwner(
  index: number,
  request: BattleCompanionRosterRequest,
  indexes: BattleCompanionRosterIndexes,
  issues: BattleCompanionRosterIssueCollection,
): boolean {
  const firstOwnerIndex = indexes.ownerIndexes.get(request.ownerCharacterId);
  if (firstOwnerIndex !== undefined) {
    appendBattleCompanionRosterIssue(issues, {
      kind: "duplicateCompanionOwner",
      reason: "duplicateOwner",
      index,
      ownerCharacterId: request.ownerCharacterId,
      firstIndex: firstOwnerIndex,
    });
    return true;
  }
  indexes.ownerIndexes.set(request.ownerCharacterId, index);
  return false;
}

function registerBattleCompanionRosterCombatant(
  index: number,
  request: BattleCompanionRosterRequest,
  indexes: BattleCompanionRosterIndexes,
  issues: BattleCompanionRosterIssueCollection,
): boolean {
  const companionCombatantId = request.companionCombatantId;
  if (companionCombatantId === undefined) return false;
  const firstCompanionIndex =
    indexes.companionIndexes.get(companionCombatantId);
  if (firstCompanionIndex !== undefined) {
    appendBattleCompanionRosterIssue(issues, {
      kind: "duplicateCompanionCombatantId",
      reason: "duplicateCombatantId",
      index,
      companionCombatantId,
      firstIndex: firstCompanionIndex,
    });
    return true;
  }
  indexes.companionIndexes.set(companionCombatantId, index);
  return false;
}

function registerBattleCompanionRosterRequest(input: {
  readonly index: number;
  readonly request: BattleCompanionRosterRequest;
  readonly indexes: BattleCompanionRosterIndexes;
  readonly issues: BattleCompanionRosterIssueCollection;
}): BattleCompanionRosterRequestRegistration {
  const duplicateOwner = registerBattleCompanionRosterOwner(
    input.index,
    input.request,
    input.indexes,
    input.issues,
  );
  const duplicateCompanionCombatant = registerBattleCompanionRosterCombatant(
    input.index,
    input.request,
    input.indexes,
    input.issues,
  );
  const owner = input.indexes.owners.get(input.request.ownerCharacterId);
  if (owner === undefined) {
    appendBattleCompanionRosterIssue(input.issues, {
      kind: "companionOwnerUnavailable",
      reason: "ownerNotInRoster",
      index: input.index,
      ownerCharacterId: input.request.ownerCharacterId,
      ...(input.request.companionCombatantId === undefined
        ? {}
        : { companionCombatantId: input.request.companionCombatantId }),
    });
  }
  return { owner, duplicateOwner, duplicateCompanionCombatant };
}

function companionRosterRequestCanBeAdmitted(
  registration: BattleCompanionRosterRequestRegistration,
): registration is BattleCompanionRosterRequestRegistration & {
  readonly owner: BattleCompanionRosterOwner;
} {
  if (registration.owner === undefined) return false;
  if (registration.duplicateOwner) return false;
  return !registration.duplicateCompanionCombatant;
}

function admitBattleCompanionRosterRequest(input: {
  readonly session: BattleRuntimeSession;
  readonly owner: BattleCompanionRosterOwner;
  readonly request: BattleCompanionRosterRequest;
  readonly unitLibrary: UnitCatalog;
  readonly initialCombatantOrder: ReadonlyMap<CombatantId, number>;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly index: number;
}): BattleCompanionRosterRequestAdmission {
  const admitted = admitCharacterSheetCompanionToBattleWithIssues({
    session: input.session,
    sheet: input.owner.sheet,
    unitLibrary: input.unitLibrary,
    ownerCombatantId: input.owner.combatantId,
    ammunitionStocks: input.request.ammunitionStocks,
    ...(input.request.companionCombatantId === undefined
      ? {}
      : { companionCombatantId: input.request.companionCombatantId }),
    ...(input.request.initiative === undefined
      ? {}
      : { initiative: input.request.initiative }),
    placement:
      input.request.positionId === undefined
        ? { kind: "unoccupiedSpaceWithinSpellRange" as const }
        : {
            kind: "unoccupiedSpaceWithinSpellRange" as const,
            positionId: input.request.positionId,
          },
    initialCombatantOrder: input.initialCombatantOrder,
    statBlockCatalog: input.statBlockCatalog,
  });
  if (Either.isRight(admitted)) {
    return { tag: "admitted", session: admitted.right };
  }
  const [firstIssue, ...restIssues] = admitted.left;
  const rosterIssue = (issue: CharacterSheetBattleHandoffIssue) => ({
    kind: "companionAdmission" as const,
    admissionReason: "admissionRejected" as const,
    issueTag: issue.tag,
    index: input.index,
    ownerCharacterId: input.request.ownerCharacterId,
    ...(input.request.companionCombatantId === undefined
      ? {}
      : { companionCombatantId: input.request.companionCombatantId }),
    ...characterSheetBattleHandoffFactFromIssue(issue),
    message: issue.message,
  });
  return {
    tag: "rejected",
    issues: [rosterIssue(firstIssue), ...restIssues.map(rosterIssue)],
  };
}

function admitBattleCompanionRosterRequests(input: {
  readonly session: BattleRuntimeSession | undefined;
  readonly indexes: BattleCompanionRosterIndexes;
  readonly issues: BattleCompanionRosterIssueCollection;
  readonly requests: readonly BattleCompanionRosterRequest[];
  readonly unitLibrary: UnitCatalog;
  readonly initialCombatantOrder: ReadonlyMap<CombatantId, number>;
  readonly statBlockCatalog: StatBlockCatalog;
}): BattleRuntimeSession | undefined {
  let session = input.session;
  for (const [index, request] of input.requests.entries()) {
    const registration = registerBattleCompanionRosterRequest({
      index,
      request,
      indexes: input.indexes,
      issues: input.issues,
    });
    if (!companionRosterRequestCanBeAdmitted(registration)) continue;
    if (session === undefined) continue;
    const admitted = admitBattleCompanionRosterRequest({
      session,
      owner: registration.owner,
      request,
      unitLibrary: input.unitLibrary,
      initialCombatantOrder: input.initialCombatantOrder,
      statBlockCatalog: input.statBlockCatalog,
      index,
    });
    if (admitted.tag === "rejected") {
      for (const issue of admitted.issues) {
        appendBattleCompanionRosterIssue(input.issues, issue);
      }
      continue;
    }
    session = admitted.session;
  }
  return session;
}

export function composeBattleCompanionRoster(input: {
  readonly session: BattleRuntimeSession | undefined;
  readonly owners: readonly BattleCompanionRosterOwner[];
  readonly requests: readonly BattleCompanionRosterRequest[];
  readonly unitLibrary: UnitCatalog;
  readonly initialCombatantOrder: ReadonlyMap<CombatantId, number>;
  readonly statBlockCatalog: StatBlockCatalog;
}): BattleCompanionRosterComposition {
  const indexed = indexBattleCompanionRosterOwners({ owners: input.owners });
  const session = admitBattleCompanionRosterRequests({
    session: input.session,
    indexes: indexed.indexes,
    issues: indexed.issues,
    requests: input.requests,
    unitLibrary: input.unitLibrary,
    initialCombatantOrder: input.initialCombatantOrder,
    statBlockCatalog: input.statBlockCatalog,
  });
  if (session === undefined) {
    return {
      tag: "dependentUnavailable",
      issues: indexed.issues.dependentIssues,
    };
  }
  if (!isNonEmptyReadonlyArray(indexed.issues.issues)) {
    return { tag: "admitted", session };
  }
  return { tag: "rejected", issues: indexed.issues.issues };
}

export function admitCharacterSheetCompanionToBattle(
  input: CharacterSheetCompanionBattleAdmissionInput,
): Either.Either<BattleState, CharacterSheetBattleHandoffIssue>;
export function admitCharacterSheetCompanionToBattle(
  input: CharacterSheetCompanionBattleRuntimeAdmissionInput,
): Either.Either<BattleRuntimeSession, CharacterSheetBattleHandoffIssue>;
export function admitCharacterSheetCompanionToBattle(
  input:
    | CharacterSheetCompanionBattleAdmissionInput
    | CharacterSheetCompanionBattleRuntimeAdmissionInput,
): Either.Either<
  BattleState | BattleRuntimeSession,
  CharacterSheetBattleHandoffIssue
> {
  const admitted = admitCharacterSheetCompanionToBattleWithIssues(input);
  if (Either.isLeft(admitted)) {
    const [firstIssue] = admitted.left;
    return Either.left(firstIssue);
  }
  return Either.right(admitted.right);
}

function admitCharacterSheetCompanionToBattleWithIssues(
  input: CharacterSheetCompanionBattleAdmissionInput,
): Either.Either<BattleState, CharacterSheetBattleHandoffIssues>;
function admitCharacterSheetCompanionToBattleWithIssues(
  input: CharacterSheetCompanionBattleRuntimeAdmissionInput,
): Either.Either<BattleRuntimeSession, CharacterSheetBattleHandoffIssues>;
function admitCharacterSheetCompanionToBattleWithIssues(
  input:
    | CharacterSheetCompanionBattleAdmissionInput
    | CharacterSheetCompanionBattleRuntimeAdmissionInput,
): Either.Either<
  BattleState | BattleRuntimeSession,
  CharacterSheetBattleHandoffIssues
>;
function admitCharacterSheetCompanionToBattleWithIssues(
  input:
    | CharacterSheetCompanionBattleAdmissionInput
    | CharacterSheetCompanionBattleRuntimeAdmissionInput,
): Either.Either<
  BattleState | BattleRuntimeSession,
  CharacterSheetBattleHandoffIssues
> {
  const sheetCompanion = characterSheetCompanion(input.sheet);
  if (sheetCompanion.tag === "none") {
    const issue = characterSheetBattleHandoffIssueValue(
      { handoffReason: "retainedCompanionUnavailable" },
      "Character Sheet has no retained companion to admit.",
    );
    return Either.left([issue]);
  }
  const manifestation = companionAdmissionManifestation({
    companion: sheetCompanion.companion,
    unitLibrary: input.unitLibrary,
    statBlockCatalog: input.statBlockCatalog,
    ammunitionStocks: input.ammunitionStocks,
    ...(input.companionCombatantId === undefined
      ? {}
      : { companionCombatantId: input.companionCombatantId }),
    ...(input.initiative === undefined ? {} : { initiative: input.initiative }),
    ...(input.placement === undefined ? {} : { placement: input.placement }),
  });
  if (Either.isLeft(manifestation)) return Either.left([manifestation.left]);
  const admissionBase = {
    ownerId: input.ownerCombatantId,
    identity: {
      tag: "retainedBetweenBattles" as const,
      durableCompanionId: sheetCompanion.companion.companionId,
    },
    protocol: sheetCompanion.companion.protocol,
    catalog: input.statBlockCatalog,
    formEligibility: manifestation.right.formEligibility,
    initialCombatantOrder: input.initialCombatantOrder,
  };
  if (manifestation.right.tag === "embodiedOutsideBattle") {
    return admitProjectedCharacterSheetCompanion(input, {
      ...admissionBase,
      companionId: manifestation.right.companionId,
      manifestation: manifestation.right.manifestation,
    });
  }
  return admitProjectedCharacterSheetCompanion(input, {
    ...admissionBase,
    manifestation: manifestation.right.manifestation,
  });
}

type CompanionAdmissionWithoutState<Input> = Input extends unknown
  ? Omit<Input, "state">
  : never;

function admitProjectedCharacterSheetCompanion(
  input:
    | CharacterSheetCompanionBattleAdmissionInput
    | CharacterSheetCompanionBattleRuntimeAdmissionInput,
  admission: CompanionAdmissionWithoutState<CompanionBattleAdmissionInput>,
): Either.Either<
  BattleState | BattleRuntimeSession,
  CharacterSheetBattleHandoffIssues
> {
  if ("session" in input) {
    const admitted = admitCompanionToBattleRuntime({
      ...admission,
      session: input.session,
    });
    return Either.isLeft(admitted)
      ? Either.left(
          characterSheetBattleHandoffIssuesFromStateInit(admitted.left),
        )
      : Either.right(admitted.right);
  }
  const admitted = admitCompanionToBattle({
    ...admission,
    state: input.state,
  });
  return Either.isLeft(admitted)
    ? Either.left(characterSheetBattleHandoffIssuesFromStateInit(admitted.left))
    : Either.right(admitted.right);
}

type CharacterSheetCompanionAdmissionProjection =
  | {
      readonly tag: "embodiedOutsideBattle";
      readonly companionId: CombatantId;
      readonly formEligibility: CompanionBattleAdmissionFormEligibility;
      readonly manifestation: CompanionBattleEmbodiedAdmissionManifestation;
    }
  | {
      readonly tag: "storedOutsideBattle";
      readonly formEligibility: CompanionBattleAdmissionFormEligibility;
      readonly manifestation: CompanionBattleStoredAdmissionManifestation;
    };

function companionAdmissionManifestation(input: {
  readonly companion: Extract<
    CharacterSheetCompanion,
    { readonly tag: "retainedOneAtATime" }
  >["companion"];
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly ammunitionStocks: readonly BattleAmmunitionStock[];
  readonly companionCombatantId?: CombatantId;
  readonly initiative?: InitiativeScore;
  readonly placement?: Extract<
    BattleCompanionPlacement,
    { readonly kind: "unoccupiedSpaceWithinSpellRange" }
  >;
}): Either.Either<
  CharacterSheetCompanionAdmissionProjection,
  CharacterSheetBattleHandoffIssue
> {
  const storedForm = battleStoredFormForSheetCompanion({
    companion: input.companion,
    unitLibrary: input.unitLibrary,
    statBlockCatalog: input.statBlockCatalog,
  });
  if (Either.isLeft(storedForm)) return Either.left(storedForm.left);
  const manifestation = input.companion.manifestation;
  if (manifestation.tag === "embodiedOutsideBattle") {
    if (
      input.companionCombatantId === undefined ||
      input.initiative === undefined ||
      input.placement === undefined
    ) {
      return characterSheetBattleHandoffIssue(
        {
          handoffReason: "companionAdmissionInput",
          requirement: "presentCombatantInitiativeAndPlacement",
        },
        "Present companion admission requires combatant id, Initiative, and placement.",
      );
    }
    return Either.right({
      tag: "embodiedOutsideBattle",
      companionId: input.companionCombatantId,
      formEligibility: storedForm.right.formEligibility,
      manifestation: {
        tag: "embodiedOutsideBattle",
        storedForm: storedForm.right.storedForm,
        creatureTypeOverride: manifestation.creatureTypeOverride,
        hitPoints: manifestation.hitPoints,
        ammunitionStocks: input.ammunitionStocks,
        initiative: input.initiative,
        placement: input.placement,
      },
    });
  }
  if (manifestation.tag === "temporarilyDismissed") {
    if (input.companionCombatantId === undefined) {
      return characterSheetBattleHandoffIssue(
        {
          handoffReason: "companionAdmissionInput",
          requirement: "dismissedReappearanceCombatant",
        },
        "Temporarily dismissed companion admission requires a reappearance combatant id.",
      );
    }
    return Either.right({
      tag: "storedOutsideBattle",
      formEligibility: storedForm.right.formEligibility,
      manifestation: {
        tag: "temporarilyDismissed",
        storedForm: storedForm.right.storedForm,
        creatureTypeOverride: manifestation.creatureTypeOverride,
        hitPoints: manifestation.hitPoints,
        ammunitionStocks: input.ammunitionStocks,
        reappearanceCombatantId: input.companionCombatantId,
      },
    });
  }
  return Either.right({
    tag: "storedOutsideBattle",
    formEligibility: storedForm.right.formEligibility,
    manifestation: {
      tag: "disappearedAtZeroHitPoints",
      storedForm: storedForm.right.storedForm,
      creatureTypeOverride: manifestation.creatureTypeOverride,
    },
  });
}

type BattleStoredFormForSheetCompanion = {
  readonly storedForm: CompanionBattleEmbodiedAdmissionManifestation["storedForm"];
  readonly formEligibility: CompanionBattleAdmissionFormEligibility;
};

function battleStoredFormForSheetCompanion(input: {
  readonly companion: Extract<
    CharacterSheetCompanion,
    { readonly tag: "retainedOneAtATime" }
  >["companion"];
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog: StatBlockCatalog;
}): Either.Either<
  BattleStoredFormForSheetCompanion,
  CharacterSheetBattleHandoffIssue
> {
  const proof = input.companion.manifestation;
  const formSelectionAccess = battleFormSelectionAccessForSheetCompanion({
    protocol: input.companion.protocol,
    selectedForm: proof.selectedForm,
  });
  if (Either.isLeft(formSelectionAccess)) {
    return Either.left(formSelectionAccess.left);
  }
  const proofIssue = retainedCompanionResolvedFormProofIssue({
    unitLibrary: input.unitLibrary,
    statBlockCatalog: input.statBlockCatalog,
    selectedForm: formSelectionAccess.right.selectedForm,
    resolvedStatBlockId: proof.resolvedStatBlockId,
  });
  if (proofIssue !== null) {
    return characterSheetBattleHandoffIssue(
      proofIssue.fact,
      proofIssue.message,
    );
  }
  const formEligibility = battleCompanionFormEligibilityForAccess({
    formAccess: formSelectionAccess.right.formAccess,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(formEligibility)) return Either.left(formEligibility.left);
  if (formSelectionAccess.right.formAccess === "findFamiliar") {
    return Either.right({
      formEligibility: formEligibility.right,
      storedForm: {
        formAccess: "findFamiliar",
        formSelection: formSelectionAccess.right.selectedForm,
        resolvedStatBlockId: proof.resolvedStatBlockId,
      },
    });
  }
  return Either.right({
    formEligibility: formEligibility.right,
    storedForm: {
      formAccess: "pactOfTheChain",
      formSelection: formSelectionAccess.right.selectedForm,
      resolvedStatBlockId: proof.resolvedStatBlockId,
    },
  });
}

function battleCompanionFormEligibilityForAccess(input: {
  readonly formAccess: BattleCompanionStoredForm["formAccess"];
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CompanionBattleAdmissionFormEligibility,
  CharacterSheetBattleHandoffIssue
> {
  const eligibility = retainedFamiliarLikeFormEligibility(input.unitLibrary);
  if (Either.isLeft(eligibility)) return Either.left(eligibility.left);
  if (input.formAccess === "pactOfTheChain") {
    return Either.right({
      formAccess: "pactOfTheChain",
      eligibility: {
        ...eligibility.right,
        specialForms: PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS,
      },
    });
  }
  return Either.right({
    formAccess: input.formAccess,
    eligibility: eligibility.right,
  });
}

function retainedCompanionResolvedFormProofIssue(input: {
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog?: StatBlockCatalog;
  readonly selectedForm: CharacterSheetCompanionFormSelection;
  readonly resolvedStatBlockId: StatBlockId;
}): {
  readonly fact: Extract<
    CharacterSheetBattleHandoffFact,
    { readonly handoffReason: "companionFormProof" }
  >;
  readonly message: string;
} | null {
  if (input.selectedForm.tag === "challengeRatingZeroBeast") {
    if (input.selectedForm.statBlockId !== input.resolvedStatBlockId) {
      return {
        fact: {
          handoffReason: "companionFormProof",
          check: "challengeRatingZeroBeastSelectionMismatch",
          statBlockId: input.selectedForm.statBlockId,
          resolvedStatBlockId: input.resolvedStatBlockId,
        },
        message:
          "Retained companion Challenge Rating 0 Beast form proof does not match its resolved Stat Block id.",
      };
    }
    if (input.statBlockCatalog === undefined) {
      return {
        fact: {
          handoffReason: "companionFormProof",
          check: "challengeRatingZeroBeastCatalogMissing",
          statBlockId: input.selectedForm.statBlockId,
          resolvedStatBlockId: input.resolvedStatBlockId,
        },
        message:
          "Retained companion Challenge Rating 0 Beast form proof requires a Stat Block catalog.",
      };
    }
    const statBlock = input.statBlockCatalog.getStatBlock(
      input.selectedForm.statBlockId,
    );
    if (Option.isNone(statBlock)) {
      return {
        fact: {
          handoffReason: "companionFormProof",
          check: "challengeRatingZeroBeastStatBlockMissing",
          statBlockId: input.selectedForm.statBlockId,
          resolvedStatBlockId: input.resolvedStatBlockId,
        },
        message:
          "Retained companion Challenge Rating 0 Beast form Stat Block is missing.",
      };
    }
    return statBlock.value.statBlock.creatureType === "beast" &&
      statBlock.value.challengeRating === 0
      ? null
      : {
          fact: {
            handoffReason: "companionFormProof",
            check: "challengeRatingZeroBeastFactsMismatch",
            statBlockId: input.selectedForm.statBlockId,
            resolvedStatBlockId: input.resolvedStatBlockId,
          },
          message:
            "Retained companion Challenge Rating 0 Beast form must resolve to a CR 0 Beast Stat Block.",
        };
  }
  if (input.selectedForm.tag === "pactOfTheChainSpecialForm") {
    const selectedForm = input.selectedForm;
    const specialForm = PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS.find(
      (form) => form.formId === selectedForm.formId,
    )!;
    // formId's literal type is derived from this exact tuple, so membership is
    // established at compile time for this already-parsed selection.
    return specialForm.statBlockId === input.resolvedStatBlockId
      ? null
      : {
          fact: {
            handoffReason: "companionFormProof",
            check: "specialFormSelectionMismatch",
            formId: selectedForm.formId,
            resolvedStatBlockId: input.resolvedStatBlockId,
          },
          message:
            "Retained companion special form proof does not match its resolved Stat Block id.",
        };
  }
  const selectedForm = input.selectedForm;
  const eligibility = retainedFamiliarLikeFormEligibility(input.unitLibrary);
  if (Either.isLeft(eligibility)) {
    return {
      fact: {
        handoffReason: "companionFormProof",
        check: "normalFormNotEligible",
        formId: selectedForm.formId,
        resolvedStatBlockId: input.resolvedStatBlockId,
      },
      message: eligibility.left.message,
    };
  }
  return retainedFamiliarLikeNormalFormProofIssue({
    eligibility: eligibility.right,
    selectedForm,
    resolvedStatBlockId: input.resolvedStatBlockId,
  });
}

function retainedFamiliarLikeFormEligibility(
  unitLibrary: UnitCatalog,
): Either.Either<
  FindFamiliarFormEligibility,
  CharacterSheetBattleHandoffIssue
> {
  const eligible = unitLibrary
    .listUnits()
    .flatMap((unit) =>
      unit.kind === "spell"
        ? [findFamiliarFormEligibilityForSpell(unit)].filter(
            (eligibility): eligibility is FindFamiliarFormEligibility =>
              eligibility !== null,
          )
        : [],
    );
  if (eligible.length === 0) {
    return characterSheetBattleHandoffIssue(
      { handoffReason: "companionFormCatalog", cardinality: "none" },
      "Retained companion admission requires a familiar-like form catalog.",
    );
  }
  if (eligible.length > 1) {
    return characterSheetBattleHandoffIssue(
      { handoffReason: "companionFormCatalog", cardinality: "multiple" },
      "Retained companion admission requires exactly one familiar-like form catalog.",
    );
  }
  return Either.right(eligible[0]);
}

function retainedFamiliarLikeNormalFormProofIssue(input: {
  readonly eligibility: FindFamiliarFormEligibility;
  readonly selectedForm: Extract<
    CharacterSheetCompanionFormSelection,
    { readonly tag: "normalNamedForm" }
  >;
  readonly resolvedStatBlockId: StatBlockId;
}): {
  readonly fact: Extract<
    CharacterSheetBattleHandoffFact,
    { readonly handoffReason: "companionFormProof" }
  >;
  readonly message: string;
} | null {
  const normalForm = input.eligibility.normalForms.find(
    (form) => form.formId === input.selectedForm.formId,
  );
  if (normalForm === undefined) {
    return {
      fact: {
        handoffReason: "companionFormProof",
        check: "normalFormNotEligible",
        formId: input.selectedForm.formId,
        resolvedStatBlockId: input.resolvedStatBlockId,
      },
      message:
        "Retained companion normal form is not eligible for the familiar-like form catalog.",
    };
  }
  return normalForm.statBlockId === input.resolvedStatBlockId
    ? null
    : {
        fact: {
          handoffReason: "companionFormProof",
          check: "normalFormSelectionMismatch",
          formId: input.selectedForm.formId,
          resolvedStatBlockId: input.resolvedStatBlockId,
        },
        message:
          "Retained companion normal form proof does not match its resolved Stat Block id.",
      };
}

type BattleFormSelectionAccess =
  | {
      readonly formAccess: "findFamiliar";
      readonly selectedForm: FindFamiliarFormSelection;
    }
  | {
      readonly formAccess: "pactOfTheChain";
      readonly selectedForm: CharacterSheetCompanionFormSelection;
    };

function battleFormSelectionAccessForSheetCompanion(input: {
  readonly protocol: CharacterSheetRetainedCompanionProtocol;
  readonly selectedForm: CharacterSheetCompanionFormSelection;
}): Either.Either<BattleFormSelectionAccess, CharacterSheetBattleHandoffIssue> {
  const formAccess = retainedCompanionProtocolFacts(input.protocol).formCatalog;
  if (input.selectedForm.tag === "pactOfTheChainSpecialForm") {
    if (formAccess !== "pactOfTheChain") {
      return characterSheetBattleHandoffIssue(
        {
          handoffReason: "companionFormProtocol",
          check: "specialFormRequiresPactProtocol",
        },
        "Special retained companion forms require an attack-exception protocol.",
      );
    }
    return Either.right({
      formAccess: "pactOfTheChain",
      selectedForm: input.selectedForm,
    });
  }
  return Either.right({
    formAccess,
    selectedForm: input.selectedForm,
  });
}

export function settleCompanionFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly state: BattleState;
  readonly ownerCombatantId: CombatantId;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog?: StatBlockCatalog;
  readonly retainedCompanionSelection?: RetainedCompanionBattleSelection;
}): Either.Either<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  const battleEntry = findFamiliarCompanionEntryForOwner(
    input.state,
    input.ownerCombatantId,
  );
  if (battleEntry === null) {
    return Either.right(input.sheet);
  }
  const battleCompanion = battleEntry.companion;
  if (battleCompanion.identity.tag !== "retainedBetweenBattles") {
    // Battle-created (battle-only) familiars have no durable Character Sheet
    // identity and do not settle as durable companions yet; that is deferred to
    // L13COMP-03. They own no Sheet slot, so the Sheet is unchanged.
    return Either.right(input.sheet);
  }
  const sheetCompanion = characterSheetCompanion(input.sheet);
  if (sheetCompanion.tag === "none") {
    return characterSheetBattleHandoffIssue(
      {
        handoffReason: "validation",
        check: "companionSheetSlotMissing",
      },
      "Retained battle companion has no Character Sheet companion slot to settle into.",
    );
  }
  if (
    sheetCompanion.companion.companionId !==
    battleCompanion.identity.durableCompanionId
  ) {
    return characterSheetBattleHandoffIssue(
      {
        handoffReason: "validation",
        check: "companionIdentityMismatch",
      },
      "Battle companion durable identity does not match Character Sheet companion.",
    );
  }
  if (battleCompanion.status === "dismissedForever") {
    return replaceCharacterSheetCompanion({
      sheet: input.sheet,
      companion: { tag: "none" },
    });
  }
  if (input.retainedCompanionSelection === undefined) {
    return characterSheetBattleHandoffIssue(
      {
        handoffReason: "validation",
        check: "retainedFormSelectionMissing",
      },
      "Retained battle companion has no battle-owned authored form selection.",
    );
  }
  if (
    input.retainedCompanionSelection.formAccess !== battleCompanion.formAccess
  ) {
    return characterSheetBattleHandoffIssue(
      {
        handoffReason: "validation",
        check: "retainedFormAccessMismatch",
      },
      "Retained battle companion form access does not match its battle-owned authored selection.",
    );
  }
  const manifestation = companionManifestationFromBattle({
    state: input.state,
    companion: battleCompanion,
    selectedForm: input.retainedCompanionSelection.selectedForm,
    unitLibrary: input.unitLibrary,
    ...(input.statBlockCatalog === undefined
      ? {}
      : { statBlockCatalog: input.statBlockCatalog }),
  });
  if (Either.isLeft(manifestation)) return Either.left(manifestation.left);
  return replaceCharacterSheetCompanion({
    sheet: input.sheet,
    companion: {
      tag: "retainedOneAtATime",
      companion: {
        companionId: sheetCompanion.companion.companionId,
        protocol: battleCompanion.protocol,
        manifestation: manifestation.right,
      },
    },
  });
}

function companionManifestationFromBattle(input: {
  readonly state: BattleState;
  readonly companion: Exclude<
    BattleCompanionState,
    { readonly status: "dismissedForever" }
  >;
  readonly selectedForm: CharacterSheetCompanionFormSelection;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog?: StatBlockCatalog;
}): Either.Either<
  CharacterSheetRetainedCompanionManifestation,
  CharacterSheetBattleHandoffIssue
> {
  if (input.companion.status === "present") {
    const companionCombatantId = input.companion.combatantId;
    const combatant = input.state.combatants.get(companionCombatantId);
    if (combatant === undefined) {
      return characterSheetBattleHandoffIssue(
        {
          handoffReason: "validation",
          check: "companionCombatantMissing",
        },
        "Present battle companion combatant is missing during handoff.",
      );
    }
    if (combatant.hp < 1) {
      return characterSheetBattleHandoffIssue(
        {
          handoffReason: "validation",
          check: "companionHpNonPositive",
        },
        "Present battle companion must have positive HP during handoff.",
      );
    }
    const storedForm = retainedStoredFormForPresentCompanion({
      state: input.state,
      companionId: companionCombatantId,
      companion: input.companion,
    });
    if (typeof storedForm === "string") {
      return characterSheetBattleHandoffIssue(
        {
          handoffReason: "companionStoredForm",
          check: "presentStatBlockMissing",
          storedCompanionCombatantId: companionCombatantId,
        },
        storedForm,
      );
    }
    const proof = sheetCompanionResolvedFormProofForBattleCompanion(
      input,
      storedForm,
    );
    if (Either.isLeft(proof)) {
      return characterSheetBattleHandoffIssue(
        characterSheetBattleHandoffFactFromIssue(proof.left),
        proof.left.message,
      );
    }
    return Either.right({
      tag: "embodiedOutsideBattle",
      ...proof.right,
      hitPoints: {
        // Cast evidence: the present-companion branch already rejects 0 HP;
        // combatant HP is the same Hp brand used by retained companion HP.
        currentHp:
          combatant.hp as CharacterSheetRetainedCompanionHitPoints["currentHp"],
        tempHp: combatant.tempHp,
      },
    });
  }
  const proof = sheetCompanionResolvedFormProofForBattleCompanion(
    input,
    input.companion,
  );
  if (Either.isLeft(proof)) {
    return characterSheetBattleHandoffIssue(
      characterSheetBattleHandoffFactFromIssue(proof.left),
      proof.left.message,
    );
  }
  if (input.companion.status === "temporarilyDismissed") {
    return Either.right({
      tag: "temporarilyDismissed",
      ...proof.right,
      hitPoints: input.companion.hitPoints,
    });
  }
  return Either.right({
    tag: "disappearedAtZeroHitPoints",
    ...proof.right,
  });
}

function sheetCompanionResolvedFormProofForBattleCompanion(
  input: Pick<
    Parameters<typeof companionManifestationFromBattle>[0],
    "companion" | "selectedForm" | "unitLibrary" | "statBlockCatalog"
  >,
  storedForm: BattleCompanionStoredForm,
): Either.Either<
  CharacterSheetRetainedCompanionResolvedFormProof,
  CharacterSheetBattleHandoffIssue
> {
  const retainedSelectionIssue = retainedCompanionResolvedFormProofIssue({
    unitLibrary: input.unitLibrary,
    ...(input.statBlockCatalog === undefined
      ? {}
      : { statBlockCatalog: input.statBlockCatalog }),
    selectedForm: input.selectedForm,
    resolvedStatBlockId: storedForm.resolvedStatBlockId,
  });
  if (retainedSelectionIssue !== null) {
    return characterSheetBattleHandoffIssue(
      retainedSelectionIssue.fact,
      `Battle companion execution form cannot be joined to its retained authored selection: ${retainedSelectionIssue.message}`,
    );
  }
  return Either.right({
    selectedForm: input.selectedForm,
    creatureTypeOverride: input.companion.creatureTypeOverride,
    resolvedStatBlockId: storedForm.resolvedStatBlockId,
  });
}
