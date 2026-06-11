// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.SETTLEMENT CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS
import {
  admitCompanionToBattle,
  findFamiliarCompanionEntryForOwner,
  retainedStoredFormForPresentCompanion,
  type BattleCompanionPlacement,
  type BattleCompanionState,
  type BattleCompanionStoredForm,
  type CompanionBattleAdmissionFormEligibility,
  type CompanionBattleEmbodiedAdmissionManifestation,
  type CompanionBattleStoredAdmissionManifestation,
  type BattleState,
  type CombatantId,
  type InitiativeScore,
} from "@dnd/battle-runtime";
import {
  characterSheetCompanion,
  replaceCharacterSheetCompanion,
  retainedCompanionProtocolFacts,
  type CharacterSheet,
  type CharacterSheetCompanion,
  type CharacterSheetCompanionCreatureTypeOverride,
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
} from "@dnd/surface/surface/find-familiar-forms";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";

import {
  characterSheetBattleHandoffIssue,
  type CharacterSheetBattleHandoffIssue,
} from "./battle-handoff-issue.ts";

export type CharacterSheetCompanionBattleAdmissionInput = {
  readonly sheet: CharacterSheet;
  readonly state: BattleState;
  readonly unitLibrary: UnitCatalog;
  readonly ownerCombatantId: CombatantId;
  readonly companionCombatantId?: CombatantId;
  readonly initiative?: InitiativeScore;
  readonly placement?: Extract<
    BattleCompanionPlacement,
    { readonly kind: "unoccupiedSpaceWithinSpellRange" }
  >;
  readonly initialCombatantOrder: ReadonlyMap<CombatantId, number>;
  readonly statBlockCatalog: StatBlockCatalog;
};

export function admitCharacterSheetCompanionToBattle(
  input: CharacterSheetCompanionBattleAdmissionInput,
): Either.Either<BattleState, CharacterSheetBattleHandoffIssue> {
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
    ...(input.companionCombatantId === undefined
      ? {}
      : { companionCombatantId: input.companionCombatantId }),
    ...(input.initiative === undefined ? {} : { initiative: input.initiative }),
    ...(input.placement === undefined ? {} : { placement: input.placement }),
  });
  if (Either.isLeft(manifestation)) return Either.left(manifestation.left);
  const admissionBase = {
    state: input.state,
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
    const admitted = admitCompanionToBattle({
      ...admissionBase,
      companionId: manifestation.right.companionId,
      manifestation: manifestation.right.manifestation,
    });
    return Either.isLeft(admitted)
      ? characterSheetBattleHandoffIssue(admitted.left.message)
      : Either.right(admitted.right);
  }
  const admitted = admitCompanionToBattle({
    ...admissionBase,
    manifestation: manifestation.right.manifestation,
  });
  return Either.isLeft(admitted)
    ? characterSheetBattleHandoffIssue(admitted.left.message)
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
    return Either.right({
      tag: "storedOutsideBattle",
      formEligibility: storedForm.right.formEligibility,
      manifestation: {
        tag: "temporarilyDismissed",
        storedForm: storedForm.right.storedForm,
        creatureTypeOverride: manifestation.creatureTypeOverride,
        hitPoints: manifestation.hitPoints,
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
  readonly storedForm: BattleCompanionStoredForm;
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
  const formAccess = battleFormAccessForSheetCompanion({
    protocol: input.companion.protocol,
    selectedForm: proof.selectedForm,
  });
  if (Either.isLeft(formAccess)) return Either.left(formAccess.left);
  const proofIssue = retainedCompanionResolvedFormProofIssue({
    unitLibrary: input.unitLibrary,
    statBlockCatalog: input.statBlockCatalog,
    selectedForm: proof.selectedForm,
    resolvedStatBlockId: proof.resolvedStatBlockId,
  });
  if (proofIssue !== null) {
    return characterSheetBattleHandoffIssue(proofIssue);
  }
  const formEligibility = battleCompanionFormEligibilityForAccess({
    formAccess: formAccess.right,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(formEligibility)) return Either.left(formEligibility.left);
  if (formAccess.right === "findFamiliar") {
    if (proof.selectedForm.tag === "pactOfTheChainSpecialForm") {
      return characterSheetBattleHandoffIssue(
        "Find Familiar retained companion access cannot use special companion forms.",
      );
    }
    return Either.right({
      formEligibility: formEligibility.right,
      storedForm: {
        formAccess: "findFamiliar",
        formSelection: proof.selectedForm,
        resolvedStatBlockId: proof.resolvedStatBlockId,
      },
    });
  }
  return Either.right({
    formEligibility: formEligibility.right,
    storedForm: {
      formAccess: "pactOfTheChain",
      formSelection: proof.selectedForm,
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
  readonly statBlockCatalog: StatBlockCatalog;
  readonly selectedForm: CharacterSheetCompanionFormSelection;
  readonly resolvedStatBlockId: StatBlockRecord["id"];
}): string | null {
  if (input.selectedForm.tag === "challengeRatingZeroBeast") {
    if (input.selectedForm.statBlockId !== input.resolvedStatBlockId) {
      return "Retained companion Challenge Rating 0 Beast form proof does not match its resolved Stat Block id.";
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
    );
    if (specialForm === undefined) {
      return "Unknown retained companion special form.";
    }
    return specialForm.statBlockId === input.resolvedStatBlockId
      ? null
      : "Retained companion special form proof does not match its resolved Stat Block id.";
  }
  const selectedForm = input.selectedForm;
  const eligibility = retainedFamiliarLikeFormEligibility(input.unitLibrary);
  if (Either.isLeft(eligibility)) return eligibility.left.message;
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
      "Retained companion admission requires a familiar-like form catalog.",
    );
  }
  if (eligible.length > 1) {
    return characterSheetBattleHandoffIssue(
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

function battleFormAccessForSheetCompanion(input: {
  readonly protocol: CharacterSheetRetainedCompanionProtocol;
  readonly selectedForm: CharacterSheetCompanionFormSelection;
}): Either.Either<
  BattleCompanionStoredForm["formAccess"],
  CharacterSheetBattleHandoffIssue
> {
  const formAccess = retainedCompanionProtocolFacts(input.protocol).formCatalog;
  if (input.selectedForm.tag === "pactOfTheChainSpecialForm") {
    if (formAccess !== "pactOfTheChain") {
      return characterSheetBattleHandoffIssue(
        "Special retained companion forms require an attack-exception protocol.",
      );
    }
    return Either.right("pactOfTheChain");
  }
  return Either.right(formAccess);
}

export function settleCompanionFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly state: BattleState;
  readonly ownerCombatantId: CombatantId;
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
  const manifestation = companionManifestationFromBattle({
    state: input.state,
    companion: battleCompanion,
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
}): Either.Either<
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
    const proof = sheetCompanionResolvedFormProofFromBattle({
      storedForm,
      creatureTypeOverride: input.companion.creatureTypeOverride,
    });
    return Either.right({
      tag: "embodiedOutsideBattle",
      ...proof,
      hitPoints: {
        // Cast evidence: the present-companion branch already rejects 0 HP;
        // combatant HP is the same Hp brand used by retained companion HP.
        currentHp:
          combatant.hp as CharacterSheetRetainedCompanionHitPoints["currentHp"],
        tempHp: combatant.tempHp,
      },
    });
  }
  const proof = sheetCompanionResolvedFormProofFromBattle({
    storedForm: input.companion,
    creatureTypeOverride: input.companion.creatureTypeOverride,
  });
  if (input.companion.status === "temporarilyDismissed") {
    return Either.right({
      tag: "temporarilyDismissed",
      ...proof,
      hitPoints: input.companion.hitPoints,
    });
  }
  return Either.right({
    tag: "disappearedAtZeroHitPoints",
    ...proof,
  });
}

function sheetCompanionResolvedFormProofFromBattle(input: {
  readonly storedForm: BattleCompanionStoredForm;
  readonly creatureTypeOverride: CharacterSheetCompanionCreatureTypeOverride;
}): CharacterSheetRetainedCompanionResolvedFormProof {
  return {
    selectedForm: input.storedForm.formSelection,
    creatureTypeOverride: input.creatureTypeOverride,
    resolvedStatBlockId: input.storedForm.resolvedStatBlockId,
  };
}
