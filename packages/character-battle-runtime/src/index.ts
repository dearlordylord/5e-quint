// KERNEL-COVERAGE: runtime-owner SHEET.FEATURE_RESOURCES.TRANSITIONS CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION CHARACTER.BATTLE.HANDOFF.SETTLEMENT CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS
import {
  admitCompanionToBattle,
  combatantKnockedOutUnconscious,
  combatantHasActiveDruidWildShape,
  classFeatureSpellFreeCastProfileForResource,
  characterBattleResourceIsPointPool,
  characterBattleResourceMaxPoints,
  characterBattleResourceMaxUses,
  findFamiliarCompanionEntryForOwner,
  retainedStoredFormForPresentCompanion,
  KNOCKED_OUT_UNCONSCIOUS,
  parseSupportedUnitFeatureProfile,
  type BattleCompanionPlacement,
  type BattleCompanionState,
  type BattleCompanionStoredForm,
  type CompanionBattleEmbodiedAdmissionManifestation,
  type CompanionBattleAdmissionFormEligibility,
  type CompanionBattleStoredAdmissionManifestation,
  type BattleCreatureState,
  type BattleState,
  type CharacterZeroHpLifecycleInit,
  type CombatantId,
  type InitiativeScore,
} from "@dnd/battle-runtime";
import { characterBuildDruidWildShapeFacts } from "@dnd/character-creation-runtime";
import {
  CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS,
  characterSheetCurrentHp,
  characterSheetDruidWildShapeKnownForms,
  characterSheetCompanion,
  characterSheetHitPointMaximum,
  characterSheetPactSlots,
  characterSheetSpellSlotSourceState,
  characterSheetSpellSlots,
  characterSheetTempHp,
  createFreshCharacterSheet,
  isCharacterSheetPointPoolResourceUnitId,
  isCharacterSheetUseCountResourceUnitId,
  replaceCharacterSheetCompanion,
  replaceCharacterSheetSpellSlotSourceState,
  retainedCompanionProtocolFacts,
  type CharacterSheet,
  type CharacterSheetBookOfShadowsPresence,
  type CharacterSheetCompanion,
  type CharacterSheetCompanionCreatureTypeOverride,
  type CharacterSheetCompanionFormSelection,
  type CharacterSheetIssue,
  type CharacterSheetPositiveHpUnconscious,
  type CharacterSheetPointPoolResourceUnitId,
  type CharacterSheetRetainedCompanionHitPoints,
  type CharacterSheetRetainedCompanionManifestation,
  type CharacterSheetRetainedCompanionProtocol,
  type CharacterSheetRetainedCompanionResolvedFormProof,
  type CharacterSheetResourceExpenditure,
  type CharacterSheetSpellSlotSourceState,
  type CharacterSheetStableRecovery,
  type CharacterSheetUseCountResourceUnitId,
  type CharacterSheetZeroHpLifecycleInput,
} from "@dnd/character-sheet-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import {
  CONDITIONS,
  resourceCount,
  type Condition,
  type ResourceCount,
} from "@dnd/shared/types";
import {
  EMPTY_CONDITION_STATE,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { isSupportedClassFeatureSpellFreeCastResourceTag } from "@dnd/surface/surface/types";
import {
  findFamiliarFormEligibilityForSpell,
  PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS,
  type FindFamiliarFormEligibility,
} from "@dnd/surface/surface/find-familiar-forms";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";

import {
  battleCreatureInitFromCharacterBuild,
  type CharacterBuildCreatureInput,
} from "./battle-creature-init.ts";
import {
  battleCreatureInitIssue,
  type BattleCreatureInitIssue,
} from "./battle-character-build-projection.ts";

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.monk-uncanny-metabolism-initiative-recovery
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.font-of-magic-sorcery-points-to-spell-slot
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.metamagic-battle-resource-bridge
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.initiative-proficiency-and-swap
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.monk-focus-battle-options
export {
  battleCreatureInitFromCharacterBuild,
  characterBattleInitiativeScore,
  characterBattleResourceInitsFromBuild,
  startBattleFromCharacterBuildAndStatBlock,
  type CharacterBattleInitiativeProficiencyChoice,
  type CharacterBuildCreatureInput,
} from "./battle-creature-init.ts";
export {
  battleCreatureInitIssue,
  characterArmorClassState,
  characterAttackActionOption,
  characterBaseUnarmedStrikeActionOption,
  characterBattleLoadoutFromBuild,
  characterOffHandAttackActionOption,
  characterSpellcasting,
  getRequiredUnit,
  type BattleCreatureInitIssue,
} from "./battle-character-build-projection.ts";
export {
  characterBattleWeaponMasterySelections,
  characterUnitRefsWithBattleSupportProfiles,
  type BattleSupportProfileIssue,
} from "./battle-support-profiles.ts";

export type CharacterSheetBattleInitInput = Omit<
  CharacterBuildCreatureInput,
  | "build"
  | "characterId"
  | "hitPointMaximum"
  | "currentHp"
  | "tempHp"
  | "conditions"
  | "positiveHpUnconscious"
  | "zeroHpLifecycle"
  | "spellSlots"
  | "bookOfShadowsPresence"
  | "resourceExpenditures"
  | "druidWildShapeAvailableForms"
> & {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog: StatBlockCatalog;
};

export type CharacterSheetBattleHandoffIssue =
  | {
      readonly tag: "characterSheetBattleHandoffIssue";
      readonly message: string;
    }
  | CharacterSheetIssue;

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

export function characterSheetBattleInit(input: CharacterSheetBattleInitInput) {
  const { sheet, unitLibrary, statBlockCatalog, ...battleInput } = input;
  const stableRecoveryIssue = unsupportedStableRecoveryBattleBoundary(sheet);
  if (stableRecoveryIssue !== null) {
    return battleCreatureInitIssue(stableRecoveryIssue);
  }
  const druidWildShapeAvailableForms =
    battleDruidWildShapeAvailableFormsFromSheet({
      sheet,
      statBlockCatalog,
    });
  if (Either.isLeft(druidWildShapeAvailableForms)) {
    return Either.left(druidWildShapeAvailableForms.left);
  }
  return battleCreatureInitFromCharacterBuild({
    ...battleInput,
    unitLibrary,
    build: sheet.build,
    characterId: sheet.characterId,
    hitPointMaximum: characterSheetHitPointMaximum(sheet),
    currentHp: characterSheetCurrentHp(sheet),
    tempHp: characterSheetTempHp(sheet),
    ...withDefinedCharacterBattleSheetState(sheet),
    ...(druidWildShapeAvailableForms.right === undefined
      ? {}
      : { druidWildShapeAvailableForms: druidWildShapeAvailableForms.right }),
  });
}

export function applyBattleHandoffToCharacterSheet(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog?: StatBlockCatalog;
}): Either.Either<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  if (input.combatant.origin.kind !== "character") {
    return characterSheetBattleHandoffIssue(
      "Battle handoff combatant is not a character.",
    );
  }
  if (input.combatant.origin.characterId !== input.sheet.characterId) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff character identity does not match Character Sheet.",
    );
  }
  const hitPointMaximum = characterSheetHitPointMaximum(input.sheet);
  if (input.combatant.maxHp !== hitPointMaximum) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff maximum HP does not match Character Sheet.",
    );
  }
  if (input.combatant.hp > hitPointMaximum) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff current HP exceeds Character Sheet maximum HP.",
    );
  }
  if (combatantHasActiveDruidWildShape(input.combatant)) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff while Wild Shape is active is blocked; dismiss or resolve reversion before Character Sheet handoff.",
    );
  }

  const zeroHpLifecycle =
    input.combatant.hp === 0
      ? characterZeroHpLifecycleFromBattle(input)
      : undefined;
  if (zeroHpLifecycle !== undefined && Either.isLeft(zeroHpLifecycle)) {
    return Either.left(zeroHpLifecycle.left);
  }
  const knockedOut = combatantKnockedOutUnconscious(input.combatant);
  if (Either.isLeft(knockedOut)) {
    return characterSheetBattleHandoffIssue(knockedOut.left.message);
  }
  const pactSlots = characterSheetPactSlots(input.sheet);
  const resourceExpenditures = characterResourceExpendituresFromBattle(input);
  if (Either.isLeft(resourceExpenditures)) {
    return Either.left(resourceExpenditures.left);
  }
  const bookOfShadowsPresence = bookOfShadowsPresenceFromBattle(input);
  const druidWildShapeKnownForms = characterSheetDruidWildShapeKnownForms(
    input.sheet,
  );
  const spellSlotState = characterSheetSpellSlotSourceStateFromBattle(input);
  if (Either.isLeft(spellSlotState)) {
    return Either.left(spellSlotState.left);
  }

  const sheet = createFreshCharacterSheet({
    characterId: input.sheet.characterId,
    build: input.sheet.build,
    maximumHp: input.sheet.maximumHp,
    hitPointMaximumReduction: input.sheet.hitPointMaximumReduction,
    currentHp: input.combatant.hp,
    tempHp: input.combatant.tempHp,
    conditions: characterSheetConditionsFromBattle(input.combatant),
    unitLibrary: input.unitLibrary,
    ...(knockedOut.right === null
      ? {}
      : {
          positiveHpUnconscious:
            characterSheetPositiveHpUnconsciousFromBattle(),
        }),
    ...(input.combatant.hp === 0 && zeroHpLifecycle !== undefined
      ? { zeroHpLifecycle: zeroHpLifecycle.right }
      : {}),
    ...(pactSlots === undefined
      ? {}
      : { pactSlots: { expended: pactSlots.expended } }),
    ...(bookOfShadowsPresence === undefined ? {} : { bookOfShadowsPresence }),
    ...(druidWildShapeKnownForms === undefined
      ? {}
      : {
          druidWildShapeKnownFormStatBlockIds:
            druidWildShapeKnownForms.statBlockIds,
        }),
    spentHitDice: input.sheet.spentHitDice,
    restFeatureUses: input.sheet.restFeatureUses,
    resourceExpenditures: resourceExpenditures.right,
    companion: input.sheet.companion,
    ...(input.statBlockCatalog === undefined
      ? {}
      : { statBlockCatalog: input.statBlockCatalog }),
  });
  if (Either.isLeft(sheet)) return Either.left(sheet.left);
  return spellSlotState.right === undefined
    ? Either.right(sheet.right)
    : replaceCharacterSheetSpellSlotSourceState({
        sheet: sheet.right,
        unitLibrary: input.unitLibrary,
        spellSlotState: spellSlotState.right,
      });
}

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

// Settlement reads the battle companion outcome alone (no session-level
// admission copy). Permanent dismissal now leaves a dismissedForever tombstone,
// so the outcome is fully recoverable from BattleState.companions:
//   - no entry            -> the owner never had a battle companion; Sheet kept.
//   - battle-only entry   -> deferred to L13COMP-03; no Sheet slot to update.
//   - dismissedForever    -> the owner ended the companion in battle; clear slot.
//   - present/temporarily-dismissed/disappeared -> write the manifestation and
//     the battle protocol tag.
export function applyBattleCompanionHandoffToCharacterSheet(input: {
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

function characterSheetSpellSlotSourceStateFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
}): Either.Either<
  CharacterSheetSpellSlotSourceState | undefined,
  CharacterSheetBattleHandoffIssue
> {
  if (input.combatant.origin.kind !== "character") {
    return Either.right(undefined);
  }
  const battleSpellcasting = input.combatant.origin.spellcasting;
  if (battleSpellcasting === undefined) {
    return Either.right(undefined);
  }
  const sheetSpellSlots = characterSheetSpellSlots(input.sheet);
  const sheetSlotState = characterSheetSpellSlotSourceState(input.sheet);
  if (sheetSpellSlots === undefined || sheetSlotState === undefined) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff Spell Slot state requires Character Sheet Spell Slot state.",
    );
  }

  const battleLevels = new Set<number>();
  for (const battleSlot of battleSpellcasting.spellSlots) {
    if (battleLevels.has(battleSlot.spellLevel)) {
      return characterSheetBattleHandoffIssue(
        "Battle handoff Spell Slot state must not duplicate spell levels.",
      );
    }
    battleLevels.add(battleSlot.spellLevel);
    if (
      !Number.isInteger(battleSlot.expended) ||
      !Number.isInteger(battleSlot.count) ||
      battleSlot.expended < 0 ||
      battleSlot.count < 0 ||
      battleSlot.expended > battleSlot.count
    ) {
      return characterSheetBattleHandoffIssue(
        "Battle handoff Spell Slot state must have nonnegative count and expenditure.",
      );
    }
  }

  let ordinarySpellSlotExpenditures =
    sheetSlotState.ordinarySpellSlotExpenditures;
  let createdSpellSlots = sheetSlotState.createdSpellSlots;
  for (const sheetSlot of sheetSpellSlots) {
    const battleSlot = battleSpellcasting.spellSlots.find(
      (candidate) => candidate.spellLevel === sheetSlot.spellLevel,
    );
    if (battleSlot === undefined || battleSlot.count !== sheetSlot.count) {
      return characterSheetBattleHandoffIssue(
        "Battle handoff Spell Slot capacity must match Character Sheet Spell Slot capacity.",
      );
    }
    if (battleSlot.expended < sheetSlot.expended) {
      return characterSheetBattleHandoffIssue(
        "Battle handoff Spell Slot expenditure cannot be lower than the pre-battle Character Sheet expenditure.",
      );
    }
    const delta = resourceCount(battleSlot.expended - sheetSlot.expended);
    if (delta === 0) continue;

    const sourceSpend = spellSlotSourceSpendForBattleDelta({
      spellLevel: sheetSlot.spellLevel,
      delta,
      totalCount: sheetSlot.count,
      ordinarySpellSlotExpenditures,
      createdSpellSlots,
    });
    if (Either.isLeft(sourceSpend)) return Either.left(sourceSpend.left);
    ordinarySpellSlotExpenditures =
      sourceSpend.right.ordinarySpellSlotExpenditures;
    createdSpellSlots = sourceSpend.right.createdSpellSlots;
  }

  for (const battleSlot of battleSpellcasting.spellSlots) {
    if (
      !sheetSpellSlots.some(
        (sheetSlot) => sheetSlot.spellLevel === battleSlot.spellLevel,
      )
    ) {
      return characterSheetBattleHandoffIssue(
        "Battle handoff Spell Slot state must match Character Sheet Spell Slot levels.",
      );
    }
  }

  return Either.right({
    ordinarySpellSlotExpenditures,
    createdSpellSlots,
  });
}

function spellSlotSourceSpendForBattleDelta(input: {
  readonly spellLevel: number;
  readonly delta: ResourceCount;
  readonly totalCount: ResourceCount;
  readonly ordinarySpellSlotExpenditures: CharacterSheetSpellSlotSourceState["ordinarySpellSlotExpenditures"];
  readonly createdSpellSlots: CharacterSheetSpellSlotSourceState["createdSpellSlots"];
}): Either.Either<
  CharacterSheetSpellSlotSourceState,
  CharacterSheetBattleHandoffIssue
> {
  const ordinaryExpenditure = input.ordinarySpellSlotExpenditures.find(
    (slot) => slot.spellLevel === input.spellLevel,
  );
  const createdSlot = input.createdSpellSlots.find(
    (slot) => slot.spellLevel === input.spellLevel,
  );
  const createdCount = createdSlot?.count ?? resourceCount(0);
  const ordinaryCount = resourceCount(input.totalCount - createdCount);
  const ordinaryExpended = ordinaryExpenditure?.expended ?? resourceCount(0);
  const createdExpended = createdSlot?.expended ?? resourceCount(0);
  const ordinaryAvailable = ordinaryCount - ordinaryExpended;
  const createdAvailable = createdCount - createdExpended;
  if (input.delta > ordinaryAvailable + createdAvailable) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff Spell Slot expenditure exceeds available Character Sheet Spell Slots.",
    );
  }

  const minimumCreatedSpend = Math.max(0, input.delta - ordinaryAvailable);
  const maximumCreatedSpend = Math.min(input.delta, createdAvailable);
  if (minimumCreatedSpend !== maximumCreatedSpend) {
    return characterSheetBattleHandoffIssue(
      `Battle handoff Spell Slot expenditure is source-ambiguous for level ${input.spellLevel}.`,
    );
  }
  const createdSpend = resourceCount(minimumCreatedSpend);
  const ordinarySpend = resourceCount(input.delta - createdSpend);
  return Either.right({
    ordinarySpellSlotExpenditures:
      ordinarySpend === 0
        ? input.ordinarySpellSlotExpenditures
        : input.ordinarySpellSlotExpenditures.map((slot) =>
            slot.spellLevel === input.spellLevel
              ? {
                  ...slot,
                  expended: resourceCount(slot.expended + ordinarySpend),
                }
              : slot,
          ),
    createdSpellSlots:
      createdSpend === 0
        ? input.createdSpellSlots
        : input.createdSpellSlots.map((slot) =>
            slot.spellLevel === input.spellLevel
              ? {
                  ...slot,
                  expended: resourceCount(slot.expended + createdSpend),
                }
              : slot,
          ),
  });
}

function characterResourceExpendituresFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  readonly CharacterSheetResourceExpenditure[],
  CharacterSheetBattleHandoffIssue
> {
  if (input.combatant.origin.kind !== "character") {
    return Either.right(input.sheet.resourceExpenditures);
  }
  const origin = input.combatant.origin;
  const wildShapeUnitId = characterSheetDruidWildShapeResourceUnitId(input);
  if (Either.isLeft(wildShapeUnitId)) {
    return Either.left(wildShapeUnitId.left);
  }
  const battleResources = origin.resources;
  const battleUseCountResourceUnitIds =
    new Set<CharacterSheetUseCountResourceUnitId>();
  const battlePointPoolResourceUnitIds =
    new Set<CharacterSheetPointPoolResourceUnitId>();
  for (const resource of battleResources) {
    const unitId =
      characterSheetUseCountResourceUnitIdForBattleResource(resource);
    if (unitId !== null) battleUseCountResourceUnitIds.add(unitId);
    const pointPoolUnitId =
      characterSheetPointPoolResourceUnitIdForBattleResource(resource);
    if (
      pointPoolUnitId !== null &&
      characterBattleResourceIsPointPool(resource)
    ) {
      battlePointPoolResourceUnitIds.add(pointPoolUnitId);
    }
  }
  if (wildShapeUnitId.right !== undefined) {
    battleUseCountResourceUnitIds.add(wildShapeUnitId.right);
  }
  const nextExpenditures = input.sheet.resourceExpenditures.filter(
    (expenditure) =>
      !isSupportedClassFeatureSpellFreeCastResourceTag(expenditure.tag) &&
      (expenditure.tag !== "useCountResource" ||
        !isCharacterSheetUseCountResourceUnitId(expenditure.unitId) ||
        !battleUseCountResourceUnitIds.has(expenditure.unitId)) &&
      (expenditure.tag !== "pointPoolResource" ||
        !isCharacterSheetPointPoolResourceUnitId(expenditure.unitId) ||
        !battlePointPoolResourceUnitIds.has(expenditure.unitId)),
  );
  const nextFreeCastExpenditures: CharacterSheetResourceExpenditure[] = [];
  const nextUseCountExpenditures: CharacterSheetResourceExpenditure[] = [];
  const nextPointPoolExpenditures: CharacterSheetResourceExpenditure[] = [];
  const druidWildShapeExpenditure =
    druidWildShapeResourceExpenditureFromBattle(input);
  if (Either.isLeft(druidWildShapeExpenditure)) {
    return Either.left(druidWildShapeExpenditure.left);
  }
  for (const resource of battleResources) {
    const pointPoolUnitId =
      characterSheetPointPoolResourceUnitIdForBattleResource(resource);
    if (
      pointPoolUnitId !== null &&
      characterBattleResourceIsPointPool(resource)
    ) {
      const maxPoints = characterBattleResourceMaxPoints({
        unit: resource.unit,
        classLevels: input.combatant.origin.classLevels,
      });
      if (maxPoints === undefined) {
        return characterSheetBattleHandoffIssue(
          "Class feature point-pool resources must carry finite remaining points during battle handoff.",
        );
      }
      const expended = Number(maxPoints) - Number(resource.pointsRemaining);
      if (expended < 0) {
        return characterSheetBattleHandoffIssue(
          "Class feature point-pool remaining points exceed the battle resource cap during battle handoff.",
        );
      }
      if (expended > 0) {
        nextPointPoolExpenditures.push({
          tag: "pointPoolResource",
          unitId: pointPoolUnitId,
          expended: resourceCount(expended),
        });
      }
      continue;
    }
    const profile = classFeatureSpellFreeCastProfileForResource(resource);
    if (profile !== null && !characterBattleResourceIsPointPool(resource)) {
      if (resource.resource.cap.kind !== "fixed") {
        return characterSheetBattleHandoffIssue(
          "Class feature spell free casts must use a fixed battle resource cap during battle handoff.",
        );
      }
      if (resource.usesRemaining === undefined) {
        return characterSheetBattleHandoffIssue(
          "Class feature spell free casts must carry remaining uses during battle handoff.",
        );
      }
      const expended = resource.resource.cap.uses - resource.usesRemaining;
      if (expended < 0) {
        return characterSheetBattleHandoffIssue(
          "Class feature spell free-cast remaining uses exceed the battle resource cap during battle handoff.",
        );
      }
      if (expended > 0) {
        nextFreeCastExpenditures.push({
          tag: profile.resourceTag,
          expended: resourceCount(expended),
        });
      }
      continue;
    }
    if (
      parseSupportedUnitFeatureProfile(resource.unit, origin.classLevels)
        ?.kind === "druidWildShapeKnownForm"
    ) {
      continue;
    }
    const useCountUnitId =
      characterSheetUseCountResourceUnitIdForBattleResource(resource);
    if (
      useCountUnitId !== null &&
      !characterBattleResourceIsPointPool(resource)
    ) {
      const maxUses = characterBattleResourceMaxUses({
        unit: resource.unit,
        classLevels: input.combatant.origin.classLevels,
      });
      if (maxUses === undefined || resource.usesRemaining === undefined) {
        return characterSheetBattleHandoffIssue(
          "Class feature use-count resources must carry finite remaining uses during battle handoff.",
        );
      }
      const expended = Number(maxUses) - Number(resource.usesRemaining);
      if (expended < 0) {
        return characterSheetBattleHandoffIssue(
          "Class feature use-count remaining uses exceed the battle resource cap during battle handoff.",
        );
      }
      if (expended > 0) {
        nextUseCountExpenditures.push({
          tag: "useCountResource",
          unitId: useCountUnitId,
          expended: resourceCount(expended),
        });
      }
    }
  }
  return Either.right([
    ...nextExpenditures,
    ...nextFreeCastExpenditures,
    ...nextUseCountExpenditures,
    ...nextPointPoolExpenditures,
    ...(druidWildShapeExpenditure.right === undefined
      ? []
      : [druidWildShapeExpenditure.right]),
  ]);
}

function characterSheetPointPoolResourceUnitIdForBattleResource(
  resource: NonNullable<
    Extract<
      BattleCreatureState["origin"],
      { readonly kind: "character" }
    >["resources"]
  >[number],
): CharacterSheetPointPoolResourceUnitId | null {
  return characterBattleResourceIsPointPool(resource) &&
    isCharacterSheetPointPoolResourceUnitId(resource.unit.id)
    ? resource.unit.id
    : null;
}

function characterSheetUseCountResourceUnitIdForBattleResource(
  resource: NonNullable<
    Extract<
      BattleCreatureState["origin"],
      { readonly kind: "character" }
    >["resources"]
  >[number],
): CharacterSheetUseCountResourceUnitId | null {
  return resource.resource.kind === "use_count" &&
    isCharacterSheetUseCountResourceUnitId(resource.unit.id)
    ? resource.unit.id
    : null;
}

function characterSheetDruidWildShapeResourceUnitId(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterSheetUseCountResourceUnitId | undefined,
  CharacterSheetBattleHandoffIssue
> {
  const facts = characterBuildDruidWildShapeFacts({
    build: input.sheet.build,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(facts)) {
    return characterSheetBattleHandoffIssue(facts.left.message);
  }
  const unitId = facts.right?.unitId;
  if (unitId === undefined) {
    return Either.right(undefined);
  }
  if (!isCharacterSheetUseCountResourceUnitId(unitId)) {
    return characterSheetBattleHandoffIssue(
      "Druid Wild Shape must use a Character Sheet use-count resource during battle handoff.",
    );
  }
  return Either.right(unitId);
}

function battleDruidWildShapeAvailableFormsFromSheet(input: {
  readonly sheet: CharacterSheet;
  readonly statBlockCatalog: StatBlockCatalog;
}): Either.Either<
  readonly StatBlockRecord[] | undefined,
  BattleCreatureInitIssue
> {
  const knownForms = characterSheetDruidWildShapeKnownForms(input.sheet);
  if (knownForms === undefined) return Either.right(undefined);
  const forms: StatBlockRecord[] = [];
  for (const statBlockId of knownForms.statBlockIds) {
    const statBlock = input.statBlockCatalog.getStatBlock(statBlockId);
    if (Option.isSome(statBlock)) {
      forms.push(statBlock.value);
    }
  }
  return Either.right(forms);
}

function druidWildShapeResourceExpenditureFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterSheetResourceExpenditure | undefined,
  CharacterSheetBattleHandoffIssue
> {
  if (input.combatant.origin.kind !== "character") {
    return Either.right(undefined);
  }
  const origin = input.combatant.origin;
  const resources = origin.resources.filter(
    (candidate) =>
      parseSupportedUnitFeatureProfile(candidate.unit, origin.classLevels)
        ?.kind === "druidWildShapeKnownForm",
  );
  if (resources.length > 1) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff supports exactly one Druid Wild Shape resource.",
    );
  }
  const resource = resources[0];
  if (resource === undefined) {
    return Either.right(undefined);
  }
  const facts = characterBuildDruidWildShapeFacts({
    build: input.sheet.build,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(facts)) {
    return characterSheetBattleHandoffIssue(facts.left.message);
  }
  if (facts.right === undefined) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff Druid Wild Shape resource requires the Druid Wild Shape feature.",
    );
  }
  if (!("usesRemaining" in resource)) {
    return characterSheetBattleHandoffIssue(
      "Druid Wild Shape must carry remaining uses during battle handoff.",
    );
  }
  const expended =
    Number(facts.right.useCount.maximum) - Number(resource.usesRemaining);
  if (expended < 0) {
    return characterSheetBattleHandoffIssue(
      "Druid Wild Shape remaining uses exceed the character resource cap during battle handoff.",
    );
  }
  return Either.right(
    expended === 0
      ? undefined
      : {
          tag: "useCountResource",
          unitId: resource.unit.id,
          expended: resourceCount(expended),
        },
  );
}

function characterSheetInitialConditions(
  sheet: CharacterSheet,
): CharacterBuildCreatureInput["conditions"] {
  return [
    ...sheet.conditions,
    ...(sheet.hitPoints.tag === "knockedOut" ? (["unconscious"] as const) : []),
  ];
}

function characterSheetConditionsFromBattle(
  combatant: BattleCreatureState,
): CharacterSheet["conditions"] {
  const conditions = combatant.conditions ?? EMPTY_CONDITION_STATE;
  return CONDITIONS.filter(
    (condition): condition is Exclude<Condition, "unconscious"> =>
      condition !== "unconscious" && hasCondition(conditions, condition),
  );
}

function withDefinedCharacterBattleSheetState(
  sheet: CharacterSheet,
): Partial<
  Pick<
    CharacterBuildCreatureInput,
    | "conditions"
    | "positiveHpUnconscious"
    | "zeroHpLifecycle"
    | "spellSlots"
    | "bookOfShadowsPresence"
    | "resourceExpenditures"
  >
> {
  const conditions = characterSheetInitialConditions(sheet);
  const positiveHpUnconscious = characterSheetPositiveHpUnconscious(sheet);
  const zeroHpLifecycle = characterSheetZeroHpLifecycle(sheet);
  const spellSlots = characterSheetSpellSlots(sheet);
  return {
    ...(conditions === undefined ? {} : { conditions }),
    ...(positiveHpUnconscious === undefined ? {} : { positiveHpUnconscious }),
    ...(zeroHpLifecycle === undefined ? {} : { zeroHpLifecycle }),
    ...(spellSlots === undefined ? {} : { spellSlots }),
    ...(sheet.bookOfShadowsPresence === undefined
      ? {}
      : { bookOfShadowsPresence: sheet.bookOfShadowsPresence }),
    resourceExpenditures: sheet.resourceExpenditures,
  };
}

function bookOfShadowsPresenceFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
}): CharacterSheetBookOfShadowsPresence | undefined {
  if (input.combatant.origin.kind !== "character") {
    return input.sheet.bookOfShadowsPresence;
  }
  return (
    input.combatant.origin.spellcasting?.bookOfShadowsSpellAccesses[0]
      ?.bookPresence ?? input.sheet.bookOfShadowsPresence
  );
}

function characterSheetPositiveHpUnconscious(
  sheet: CharacterSheet,
): CharacterBuildCreatureInput["positiveHpUnconscious"] {
  return sheet.hitPoints.tag === "knockedOut"
    ? KNOCKED_OUT_UNCONSCIOUS
    : undefined;
}

function characterSheetPositiveHpUnconsciousFromBattle(): CharacterSheetPositiveHpUnconscious {
  return CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS;
}

function characterSheetZeroHpLifecycle(
  sheet: CharacterSheet,
): CharacterZeroHpLifecycleInit | undefined {
  if (sheet.hitPoints.tag !== "zero") return undefined;
  const lifecycle = sheet.hitPoints.lifecycle;
  if (lifecycle.tag === "stable") {
    return {
      policy: "usesDeathSavingThrows",
      deathSaves: {
        deathSaves: { successes: 0, failures: 0 },
        stable: true,
        dead: false,
        hpRegained: false,
      },
    };
  }
  if (lifecycle.tag === "dead") {
    return {
      policy: "usesDeathSavingThrows",
      deathSaves: {
        deathSaves: lifecycle.deathSaves,
        stable: false,
        dead: true,
        hpRegained: false,
      },
    };
  }
  return {
    policy: "usesDeathSavingThrows",
    deathSaves: {
      deathSaves: lifecycle.deathSaves,
      stable: false,
      dead: false,
      hpRegained: false,
    },
  };
}

function characterZeroHpLifecycleFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
}): Either.Either<
  CharacterSheetZeroHpLifecycleInput,
  CharacterSheetBattleHandoffIssue
> {
  if (input.combatant.zeroHpLifecycle.policy !== "usesDeathSavingThrows") {
    return characterSheetBattleHandoffIssue(
      "Battle character has unsupported zero-HP lifecycle.",
    );
  }
  const lifecycle = input.combatant.zeroHpLifecycle.deathSaves;
  if (lifecycle.dead) {
    return Either.right({ tag: "dead", deathSaves: lifecycle.deathSaves });
  }
  if (lifecycle.stable) {
    const stableRecoveryIssue = unsupportedStableRecoveryBattleBoundary(
      input.sheet,
    );
    if (stableRecoveryIssue !== null) {
      return characterSheetBattleHandoffIssue(stableRecoveryIssue);
    }
    return Either.right({
      tag: "stable",
      recovery: {
        kind: "regains1HpAfter1d4Hours",
        elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
      },
    });
  }
  return Either.right({ tag: "unstable", deathSaves: lifecycle.deathSaves });
}

function characterSheetBattleHandoffIssue(
  message: string,
): Either.Either<never, CharacterSheetBattleHandoffIssue> {
  return Either.left({
    tag: "characterSheetBattleHandoffIssue",
    message,
  });
}

function unsupportedStableRecoveryBattleBoundary(
  sheet: CharacterSheet,
): string | null {
  if (
    sheet.hitPoints.tag !== "zero" ||
    sheet.hitPoints.lifecycle.tag !== "stable"
  ) {
    return null;
  }
  return freshStableRecovery(sheet.hitPoints.lifecycle.recovery)
    ? null
    : "Battle handoff cannot preserve in-progress Stable recovery timers.";
}

function freshStableRecovery(recovery: CharacterSheetStableRecovery): boolean {
  return (
    recovery.kind === "regains1HpAfter1d4Hours" &&
    Number(recovery.elapsedBeforeRecoveryRoll) === 0
  );
}
