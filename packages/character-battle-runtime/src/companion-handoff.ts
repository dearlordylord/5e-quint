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
  type CombatantId,
  type InitiativeScore,
  battleStateInitIssueMessage,
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
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Option, Result } from "effect";

import {
  characterSheetBattleHandoffIssue,
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

export function admitCharacterSheetCompanionToBattle(
  input: CharacterSheetCompanionBattleAdmissionInput,
): Result.Result<BattleState, CharacterSheetBattleHandoffIssue>;
export function admitCharacterSheetCompanionToBattle(
  input: CharacterSheetCompanionBattleRuntimeAdmissionInput,
): Result.Result<BattleRuntimeSession, CharacterSheetBattleHandoffIssue>;
export function admitCharacterSheetCompanionToBattle(
  input:
    | CharacterSheetCompanionBattleAdmissionInput
    | CharacterSheetCompanionBattleRuntimeAdmissionInput,
): Result.Result<
  BattleState | BattleRuntimeSession,
  CharacterSheetBattleHandoffIssue
> {
  const sheetCompanion = characterSheetCompanion(input.sheet);
  if (sheetCompanion.tag === "none") {
    return characterSheetBattleHandoffIssue(
      "Character Sheet has no retained companion to admit.",
    );
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
  if (Result.isFailure(manifestation))
    return Result.fail(manifestation.failure);
  const admissionBase = {
    ownerId: input.ownerCombatantId,
    identity: {
      tag: "retainedBetweenBattles" as const,
      durableCompanionId: sheetCompanion.companion.companionId,
    },
    protocol: sheetCompanion.companion.protocol,
    catalog: input.statBlockCatalog,
    formEligibility: manifestation.success.formEligibility,
    initialCombatantOrder: input.initialCombatantOrder,
  };
  if (manifestation.success.tag === "embodiedOutsideBattle") {
    return admitProjectedCharacterSheetCompanion(input, {
      ...admissionBase,
      companionId: manifestation.success.companionId,
      manifestation: manifestation.success.manifestation,
    });
  }
  return admitProjectedCharacterSheetCompanion(input, {
    ...admissionBase,
    manifestation: manifestation.success.manifestation,
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
): Result.Result<
  BattleState | BattleRuntimeSession,
  CharacterSheetBattleHandoffIssue
> {
  if ("session" in input) {
    const admitted = admitCompanionToBattleRuntime({
      ...admission,
      session: input.session,
    });
    return Result.isFailure(admitted)
      ? characterSheetBattleHandoffIssue(
          battleStateInitIssueMessage(admitted.failure),
        )
      : Result.succeed(admitted.success);
  }
  const admitted = admitCompanionToBattle({
    ...admission,
    state: input.state,
  });
  return Result.isFailure(admitted)
    ? characterSheetBattleHandoffIssue(
        battleStateInitIssueMessage(admitted.failure),
      )
    : Result.succeed(admitted.success);
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
}): Result.Result<
  CharacterSheetCompanionAdmissionProjection,
  CharacterSheetBattleHandoffIssue
> {
  const storedForm = battleStoredFormForSheetCompanion({
    companion: input.companion,
    unitLibrary: input.unitLibrary,
    statBlockCatalog: input.statBlockCatalog,
  });
  if (Result.isFailure(storedForm)) return Result.fail(storedForm.failure);
  const manifestation = input.companion.manifestation;
  if (manifestation.tag === "embodiedOutsideBattle") {
    if (
      input.companionCombatantId === undefined ||
      input.initiative === undefined ||
      input.placement === undefined
    ) {
      return characterSheetBattleHandoffIssue(
        "Present companion admission requires combatant id, Initiative, and placement.",
      );
    }
    return Result.succeed({
      tag: "embodiedOutsideBattle",
      companionId: input.companionCombatantId,
      formEligibility: storedForm.success.formEligibility,
      manifestation: {
        tag: "embodiedOutsideBattle",
        storedForm: storedForm.success.storedForm,
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
        "Temporarily dismissed companion admission requires a reappearance combatant id.",
      );
    }
    return Result.succeed({
      tag: "storedOutsideBattle",
      formEligibility: storedForm.success.formEligibility,
      manifestation: {
        tag: "temporarilyDismissed",
        storedForm: storedForm.success.storedForm,
        creatureTypeOverride: manifestation.creatureTypeOverride,
        hitPoints: manifestation.hitPoints,
        ammunitionStocks: input.ammunitionStocks,
        reappearanceCombatantId: input.companionCombatantId,
      },
    });
  }
  return Result.succeed({
    tag: "storedOutsideBattle",
    formEligibility: storedForm.success.formEligibility,
    manifestation: {
      tag: "disappearedAtZeroHitPoints",
      storedForm: storedForm.success.storedForm,
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
}): Result.Result<
  BattleStoredFormForSheetCompanion,
  CharacterSheetBattleHandoffIssue
> {
  const proof = input.companion.manifestation;
  const formSelectionAccess = battleFormSelectionAccessForSheetCompanion({
    protocol: input.companion.protocol,
    selectedForm: proof.selectedForm,
  });
  if (Result.isFailure(formSelectionAccess)) {
    return Result.fail(formSelectionAccess.failure);
  }
  const proofIssue = retainedCompanionResolvedFormProofIssue({
    unitLibrary: input.unitLibrary,
    statBlockCatalog: input.statBlockCatalog,
    selectedForm: formSelectionAccess.success.selectedForm,
    resolvedStatBlockId: proof.resolvedStatBlockId,
  });
  if (proofIssue !== null) {
    return characterSheetBattleHandoffIssue(proofIssue);
  }
  const formEligibility = battleCompanionFormEligibilityForAccess({
    formAccess: formSelectionAccess.success.formAccess,
    unitLibrary: input.unitLibrary,
  });
  if (Result.isFailure(formEligibility))
    return Result.fail(formEligibility.failure);
  if (formSelectionAccess.success.formAccess === "findFamiliar") {
    return Result.succeed({
      formEligibility: formEligibility.success,
      storedForm: {
        formAccess: "findFamiliar",
        formSelection: formSelectionAccess.success.selectedForm,
        resolvedStatBlockId: proof.resolvedStatBlockId,
      },
    });
  }
  return Result.succeed({
    formEligibility: formEligibility.success,
    storedForm: {
      formAccess: "pactOfTheChain",
      formSelection: formSelectionAccess.success.selectedForm,
      resolvedStatBlockId: proof.resolvedStatBlockId,
    },
  });
}

function battleCompanionFormEligibilityForAccess(input: {
  readonly formAccess: BattleCompanionStoredForm["formAccess"];
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  CompanionBattleAdmissionFormEligibility,
  CharacterSheetBattleHandoffIssue
> {
  const eligibility = retainedFamiliarLikeFormEligibility(input.unitLibrary);
  if (Result.isFailure(eligibility)) return Result.fail(eligibility.failure);
  if (input.formAccess === "pactOfTheChain") {
    return Result.succeed({
      formAccess: "pactOfTheChain",
      eligibility: {
        ...eligibility.success,
        specialForms: PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS,
      },
    });
  }
  return Result.succeed({
    formAccess: input.formAccess,
    eligibility: eligibility.success,
  });
}

function retainedCompanionResolvedFormProofIssue(input: {
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog?: StatBlockCatalog;
  readonly selectedForm: CharacterSheetCompanionFormSelection;
  readonly resolvedStatBlockId: StatBlockRecord["id"];
}): string | null {
  if (input.selectedForm.tag === "challengeRatingZeroBeast") {
    if (input.selectedForm.statBlockId !== input.resolvedStatBlockId) {
      return "Retained companion Challenge Rating 0 Beast form proof does not match its resolved Stat Block id.";
    }
    if (input.statBlockCatalog === undefined) {
      return "Retained companion Challenge Rating 0 Beast form proof requires a Stat Block catalog.";
    }
    const statBlock = input.statBlockCatalog.getStatBlock(
      input.selectedForm.statBlockId,
    );
    if (Option.isNone(statBlock)) {
      return "Retained companion Challenge Rating 0 Beast form Stat Block is missing.";
    }
    return statBlock.value.statBlock.creatureType === "beast" &&
      statBlock.value.challengeRating === 0
      ? null
      : "Retained companion Challenge Rating 0 Beast form must resolve to a CR 0 Beast Stat Block.";
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
      : "Retained companion special form proof does not match its resolved Stat Block id.";
  }
  const selectedForm = input.selectedForm;
  const eligibility = retainedFamiliarLikeFormEligibility(input.unitLibrary);
  if (Result.isFailure(eligibility)) return eligibility.failure.message;
  return retainedFamiliarLikeNormalFormProofIssue({
    eligibility: eligibility.success,
    selectedForm,
    resolvedStatBlockId: input.resolvedStatBlockId,
  });
}

function retainedFamiliarLikeFormEligibility(
  unitLibrary: UnitCatalog,
): Result.Result<
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
      "Retained companion admission requires a familiar-like form catalog.",
    );
  }
  if (eligible.length > 1) {
    return characterSheetBattleHandoffIssue(
      "Retained companion admission requires exactly one familiar-like form catalog.",
    );
  }
  return Result.succeed(eligible[0]);
}

function retainedFamiliarLikeNormalFormProofIssue(input: {
  readonly eligibility: FindFamiliarFormEligibility;
  readonly selectedForm: Extract<
    CharacterSheetCompanionFormSelection,
    { readonly tag: "normalNamedForm" }
  >;
  readonly resolvedStatBlockId: StatBlockRecord["id"];
}): string | null {
  const normalForm = input.eligibility.normalForms.find(
    (form) => form.formId === input.selectedForm.formId,
  );
  if (normalForm === undefined) {
    return "Retained companion normal form is not eligible for the familiar-like form catalog.";
  }
  return normalForm.statBlockId === input.resolvedStatBlockId
    ? null
    : "Retained companion normal form proof does not match its resolved Stat Block id.";
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
}): Result.Result<BattleFormSelectionAccess, CharacterSheetBattleHandoffIssue> {
  const formAccess = retainedCompanionProtocolFacts(input.protocol).formCatalog;
  if (input.selectedForm.tag === "pactOfTheChainSpecialForm") {
    if (formAccess !== "pactOfTheChain") {
      return characterSheetBattleHandoffIssue(
        "Special retained companion forms require an attack-exception protocol.",
      );
    }
    return Result.succeed({
      formAccess: "pactOfTheChain",
      selectedForm: input.selectedForm,
    });
  }
  return Result.succeed({
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
}): Result.Result<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  const battleEntry = findFamiliarCompanionEntryForOwner(
    input.state,
    input.ownerCombatantId,
  );
  if (battleEntry === null) {
    return Result.succeed(input.sheet);
  }
  const battleCompanion = battleEntry.companion;
  if (battleCompanion.identity.tag !== "retainedBetweenBattles") {
    // Battle-created (battle-only) familiars have no durable Character Sheet
    // identity and do not settle as durable companions yet; that is deferred to
    // L13COMP-03. They own no Sheet slot, so the Sheet is unchanged.
    return Result.succeed(input.sheet);
  }
  const sheetCompanion = characterSheetCompanion(input.sheet);
  if (sheetCompanion.tag === "none") {
    return characterSheetBattleHandoffIssue(
      "Retained battle companion has no Character Sheet companion slot to settle into.",
    );
  }
  if (
    sheetCompanion.companion.companionId !==
    battleCompanion.identity.durableCompanionId
  ) {
    return characterSheetBattleHandoffIssue(
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
      "Retained battle companion has no battle-owned authored form selection.",
    );
  }
  if (
    input.retainedCompanionSelection.formAccess !== battleCompanion.formAccess
  ) {
    return characterSheetBattleHandoffIssue(
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
  if (Result.isFailure(manifestation))
    return Result.fail(manifestation.failure);
  return replaceCharacterSheetCompanion({
    sheet: input.sheet,
    companion: {
      tag: "retainedOneAtATime",
      companion: {
        companionId: sheetCompanion.companion.companionId,
        protocol: battleCompanion.protocol,
        manifestation: manifestation.success,
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
}): Result.Result<
  CharacterSheetRetainedCompanionManifestation,
  CharacterSheetBattleHandoffIssue
> {
  if (input.companion.status === "present") {
    const companionCombatantId = input.companion.combatantId;
    const combatant = input.state.combatants.get(companionCombatantId);
    if (combatant === undefined) {
      return characterSheetBattleHandoffIssue(
        "Present battle companion combatant is missing during handoff.",
      );
    }
    if (combatant.hp < 1) {
      return characterSheetBattleHandoffIssue(
        "Present battle companion must have positive HP during handoff.",
      );
    }
    const storedForm = retainedStoredFormForPresentCompanion({
      state: input.state,
      companionId: companionCombatantId,
      companion: input.companion,
    });
    if (typeof storedForm === "string") {
      return characterSheetBattleHandoffIssue(storedForm);
    }
    const proof = sheetCompanionResolvedFormProofForBattleCompanion(
      input,
      storedForm,
    );
    if (Result.isFailure(proof)) {
      return characterSheetBattleHandoffIssue(proof.failure.message);
    }
    return Result.succeed({
      tag: "embodiedOutsideBattle",
      ...proof.success,
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
  if (Result.isFailure(proof)) {
    return characterSheetBattleHandoffIssue(proof.failure.message);
  }
  if (input.companion.status === "temporarilyDismissed") {
    return Result.succeed({
      tag: "temporarilyDismissed",
      ...proof.success,
      hitPoints: input.companion.hitPoints,
    });
  }
  return Result.succeed({
    tag: "disappearedAtZeroHitPoints",
    ...proof.success,
  });
}

function sheetCompanionResolvedFormProofForBattleCompanion(
  input: Pick<
    Parameters<typeof companionManifestationFromBattle>[0],
    "companion" | "selectedForm" | "unitLibrary" | "statBlockCatalog"
  >,
  storedForm: BattleCompanionStoredForm,
): Result.Result<
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
      `Battle companion execution form cannot be joined to its retained authored selection: ${retainedSelectionIssue}`,
    );
  }
  return Result.succeed({
    selectedForm: input.selectedForm,
    creatureTypeOverride: input.companion.creatureTypeOverride,
    resolvedStatBlockId: storedForm.resolvedStatBlockId,
  });
}
