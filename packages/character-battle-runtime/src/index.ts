// KERNEL-COVERAGE: runtime-owner SHEET.FEATURE_RESOURCES.TRANSITIONS CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION CHARACTER.BATTLE.HANDOFF.SETTLEMENT CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS
import {
  admitCompanionToBattle,
  battleDruidWildCompanionSpellCastSupportForUnit,
  combatantKnockedOutUnconscious,
  combatantHasActiveDruidWildShape,
  classFeatureSpellFreeCastProfileForResource,
  characterBattleResourceIsPointPool,
  characterBattleResourceMaxPoints,
  characterBattleResourceMaxUses,
  effectiveCharacterBattlePreparedSpells,
  findFamiliarFormEligibilityForSpell,
  findFamiliarCompanionEntryForOwner,
  PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS,
  pactOfTheChainFindFamiliarFormEligibilityForSpell,
  resolveFindFamiliarForm,
  resolvePactOfTheChainFindFamiliarForm,
  retainedStoredFormForPresentCompanion,
  KNOCKED_OUT_UNCONSCIOUS,
  parseSupportedUnitFeatureProfile,
  type BattleCompanionPlacement,
  type BattleCompanionState,
  type BattleCompanionStateId,
  type BattleCompanionStoredForm,
  type CompanionBattleAdmissionFormEligibility,
  type BattleCreatureState,
  type BattleState,
  type CharacterZeroHpLifecycleInit,
  type CombatantId,
  type FindFamiliarCreatureTypeOverride,
  type FindFamiliarCreatureTypeOverrideChoice,
  type FindFamiliarFormEligibility,
  type FindFamiliarFormSelection,
  type InitiativeScore,
  type PactOfTheChainFindFamiliarFormEligibility,
  type PactOfTheChainFindFamiliarFormSelection,
} from "@dnd/battle-runtime";
import {
  characterBuildDruidWildShapeFacts,
  characterBuildFeatureUnitIds,
} from "@dnd/character-creation-runtime";
import {
  CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS,
  characterSheetCurrentHp,
  characterSheetDruidWildShapeKnownForms,
  characterSheetCompanion,
  characterSheetHitPointMaximum,
  characterSheetPactSlots,
  characterSheetResources,
  characterSheetSpellInvocation,
  characterSheetSpellSlotSourceState,
  characterSheetSpellSlots,
  characterSheetTempHp,
  createFreshCharacterSheet,
  isCharacterSheetPointPoolResourceUnitId,
  isCharacterSheetUseCountResourceUnitId,
  replaceCharacterSheetCompanion,
  replaceCharacterSheetSpellSlotSourceState,
  spendCharacterSheetSpellSlot,
  type CharacterSheet,
  type CharacterSheetAttackExceptionFamiliarLikeOneAtATimeProtocol,
  type CharacterSheetBookOfShadowsPresence,
  type CharacterSheetCompanion,
  type CharacterSheetCompanionCreatureTypeOverride,
  type CharacterSheetCompanionFormSelection,
  type CharacterSheetIssue,
  type CharacterSheetOrdinaryFamiliarLikeOneAtATimeProtocol,
  type CharacterSheetOwnerLongRestFamiliarLikeOneAtATimeProtocol,
  type CharacterSheetPositiveHpUnconscious,
  type CharacterSheetPointPoolResourceUnitId,
  type CharacterSheetRetainedCompanionHitPoints,
  type CharacterSheetRetainedCompanionId,
  type CharacterSheetRetainedCompanionManifestation,
  type CharacterSheetRetainedCompanionProtocol,
  type CharacterSheetRetainedCompanionResolvedFormProof,
  type CharacterSheetResourceExpenditure,
  type CharacterSheetResourceState,
  type CharacterSheetSpellSlotSourceState,
  type CharacterSheetStableRecovery,
  type CharacterSheetUseCountResourceUnitId,
  type CharacterSheetZeroHpLifecycleInput,
} from "@dnd/character-sheet-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import {
  CONDITIONS,
  resourceCount,
  Hp,
  type Condition,
  type Hp as HpType,
  type ResourceCount,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import {
  EMPTY_CONDITION_STATE,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { isSupportedClassFeatureSpellFreeCastResourceTag } from "@dnd/surface/surface/types";
import type {
  ClassFeatureRecord,
  SpellRecord,
  StatBlockRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";

import {
  battleCreatureInitFromCharacterBuild,
  type CharacterBuildCreatureInput,
} from "./battle-creature-init.ts";
import {
  battleCreatureInitIssue,
  characterSpellcasting,
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

export type CharacterSheetCompanionBattleAdmissionState =
  | { readonly tag: "notAdmitted" }
  | {
      readonly tag: "retainedOneAtATime";
      readonly companionId: CharacterSheetRetainedCompanionId;
    };

export type CharacterSheetRetainedCompanionCreationSource =
  | {
      readonly tag: "spellSlotSpellCast";
      readonly spellId: UnitRecord["id"];
      readonly spellLevel: SpellSlotLevel;
    }
  | {
      readonly tag: "ritualSpell";
      readonly spellId: UnitRecord["id"];
    }
  | {
      readonly tag: "invocationSpellAccess";
      readonly spellId: UnitRecord["id"];
    }
  | {
      readonly tag: "classFeatureSpellCast";
      readonly featureUnitId: UnitRecord["id"];
      readonly spend:
        | { readonly tag: "spellSlot"; readonly spellLevel: SpellSlotLevel }
        | {
            readonly tag: "useCountResource";
            readonly resourceUnitId: UnitRecord["id"];
          };
    };

export type CharacterSheetRetainedCompanionCreationInput = {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly companionId: CharacterSheetRetainedCompanionId;
  readonly source: CharacterSheetRetainedCompanionCreationSource;
  readonly selectedForm: CharacterSheetCompanionFormSelection;
  readonly creatureTypeOverrideChoiceId?: FindFamiliarCreatureTypeOverrideChoice["optionId"];
  readonly currentHp?: HpType;
  readonly tempHp?: HpType;
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

export function createRetainedFamiliarLikeCompanion(
  input: CharacterSheetRetainedCompanionCreationInput,
): Either.Either<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  if (input.companionId.length === 0) {
    return characterSheetBattleHandoffIssue(
      "Retained companion requires companion id.",
    );
  }
  const selectedForm = battleFormSelectionForSheetForm(input.selectedForm);
  if (Either.isLeft(selectedForm)) return Either.left(selectedForm.left);
  const source = retainedCompanionCreationSource(input);
  if (Either.isLeft(source)) return Either.left(source.left);
  const resolved = retainedCompanionResolvedForm({
    source: source.right,
    selectedForm: selectedForm.right,
    statBlockCatalog: input.statBlockCatalog,
    creatureTypeOverrideChoiceId: input.creatureTypeOverrideChoiceId,
  });
  if (Either.isLeft(resolved)) return Either.left(resolved.left);

  const hitPoints = retainedCompanionCreationHitPoints({
    statBlock: resolved.right.statBlock,
    currentHp: input.currentHp,
    tempHp: input.tempHp,
  });
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  const spentSheet = spendRetainedCompanionCreationSourceCost({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    source: source.right,
  });
  if (Either.isLeft(spentSheet)) return Either.left(spentSheet.left);

  return replaceCharacterSheetCompanion({
    sheet: spentSheet.right,
    companion: {
      tag: "retainedOneAtATime",
      companion: {
        companionId: input.companionId,
        protocol: source.right.protocol,
        manifestation: {
          tag: "embodiedOutsideBattle",
          selectedForm: input.selectedForm,
          creatureTypeOverride: resolved.right.creatureTypeOverride,
          resolvedStatBlockId: resolved.right.statBlock.id,
          hitPoints: hitPoints.right,
        },
      },
    },
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
    expiration: sheetCompanion.companion.protocol.expiration,
    catalog: input.statBlockCatalog,
    formEligibility: manifestation.right.formEligibility,
    initialCombatantOrder: input.initialCombatantOrder,
  };
  if (manifestation.right.manifestation.tag === "embodiedOutsideBattle") {
    const companionCombatantId = input.companionCombatantId;
    if (companionCombatantId === undefined) {
      return characterSheetBattleHandoffIssue(
        "Present companion admission requires a companion combatant id.",
      );
    }
    const admitted = admitCompanionToBattle({
      ...admissionBase,
      companionId: companionCombatantId,
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

export function applyBattleCompanionHandoffToCharacterSheet(input: {
  readonly sheet: CharacterSheet;
  readonly state: BattleState;
  readonly ownerCombatantId: CombatantId;
  readonly admission: CharacterSheetCompanionBattleAdmissionState;
}): Either.Either<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  const sheetCompanion = characterSheetCompanion(input.sheet);
  const battleEntry = findFamiliarCompanionEntryForOwner(
    input.state,
    input.ownerCombatantId,
  );
  if (battleEntry === null) {
    if (input.admission.tag === "notAdmitted") return Either.right(input.sheet);
    if (
      sheetCompanion.tag === "retainedOneAtATime" &&
      sheetCompanion.companion.companionId !== input.admission.companionId
    ) {
      return characterSheetBattleHandoffIssue(
        "Admitted companion identity does not match Character Sheet companion during removal handoff.",
      );
    }
    return replaceCharacterSheetCompanion({
      sheet: input.sheet,
      companion: { tag: "none" },
    });
  }
  if (battleEntry.companion.identity.tag === "battleOnly") {
    return input.admission.tag === "notAdmitted"
      ? Either.right(input.sheet)
      : characterSheetBattleHandoffIssue(
          "Admitted retained companion resolved to a battle-only companion during handoff.",
        );
  }
  if (sheetCompanion.tag === "none") {
    return characterSheetBattleHandoffIssue(
      "Battle companion handoff requires a retained Character Sheet companion slot.",
    );
  }
  const identityIssue = battleCompanionHandoffIdentityIssue({
    sheetCompanion: sheetCompanion.companion,
    battleCompanion: battleEntry.companion,
    admission: input.admission,
  });
  if (identityIssue !== null) {
    return characterSheetBattleHandoffIssue(identityIssue);
  }
  const manifestation = companionManifestationFromBattle({
    state: input.state,
    companionId: battleEntry.companionId,
    companion: battleEntry.companion,
  });
  if (Either.isLeft(manifestation)) return Either.left(manifestation.left);
  return replaceCharacterSheetCompanion({
    sheet: input.sheet,
    companion: {
      tag: "retainedOneAtATime",
      companion: {
        ...sheetCompanion.companion,
        manifestation: manifestation.right,
      },
    },
  });
}

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
  {
    readonly formEligibility: Parameters<
      typeof admitCompanionToBattle
    >[0]["formEligibility"];
    readonly manifestation: Parameters<
      typeof admitCompanionToBattle
    >[0]["manifestation"];
  },
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
    formEligibility: storedForm.right.formEligibility,
    manifestation: {
      tag: "disappearedAtZeroHitPoints",
      storedForm: storedForm.right.storedForm,
      creatureTypeOverride: manifestation.creatureTypeOverride,
    },
  });
}

type RetainedCompanionCreationSourceFacts =
  | {
      readonly tag: "ordinaryFamiliarLike";
      readonly eligibility: FindFamiliarFormEligibility;
      readonly protocol: CharacterSheetOrdinaryFamiliarLikeOneAtATimeProtocol;
      readonly spend:
        | { readonly tag: "none" }
        | { readonly tag: "spellSlot"; readonly spellLevel: SpellSlotLevel };
      readonly fixedCreatureTypeOverrideChoiceId?: never;
    }
  | {
      readonly tag: "pactFamiliarLike";
      readonly eligibility: PactOfTheChainFindFamiliarFormEligibility;
      readonly protocol: CharacterSheetAttackExceptionFamiliarLikeOneAtATimeProtocol;
      readonly spend: { readonly tag: "none" };
      readonly fixedCreatureTypeOverrideChoiceId?: never;
    }
  | {
      readonly tag: "ownerLongRestExpiringFamiliarLike";
      readonly eligibility: FindFamiliarFormEligibility;
      readonly protocol: CharacterSheetOwnerLongRestFamiliarLikeOneAtATimeProtocol;
      readonly fixedCreatureTypeOverrideChoiceId: FindFamiliarCreatureTypeOverrideChoice["optionId"];
      readonly spend: Extract<
        CharacterSheetRetainedCompanionCreationSource,
        { readonly tag: "classFeatureSpellCast" }
      >["spend"];
    };

function retainedCompanionCreationSource(
  input: CharacterSheetRetainedCompanionCreationInput,
): Either.Either<
  RetainedCompanionCreationSourceFacts,
  CharacterSheetBattleHandoffIssue
> {
  const source = input.source;
  if (source.tag === "spellSlotSpellCast") {
    const spellSlots = characterSheetSpellSlots(input.sheet);
    const spellcasting = characterSpellcasting({
      build: input.sheet.build,
      unitLibrary: input.unitLibrary,
      ...(spellSlots === undefined ? {} : { spellSlots }),
    });
    if (Either.isLeft(spellcasting)) {
      return characterSheetBattleHandoffIssue(spellcasting.left.message);
    }
    const spell = effectiveCharacterBattlePreparedSpells({
      preparedSpells: spellcasting.right.preparedSpells,
      bookOfShadowsSpellAccesses:
        spellcasting.right.bookOfShadowsSpellAccesses ?? [],
    }).find((candidate) => candidate.id === source.spellId);
    if (spell === undefined) {
      return characterSheetBattleHandoffIssue(
        "Retained companion spell-slot source requires the selected spell prepared or otherwise effective as prepared.",
      );
    }
    if (source.spellLevel < spell.mechanics.level) {
      return characterSheetBattleHandoffIssue(
        "Retained companion spell-slot source requires a slot at least as high as the selected spell level.",
      );
    }
    const eligibility = findFamiliarFormEligibilityForSpell(spell);
    return eligibility === null
      ? characterSheetBattleHandoffIssue(
          "Retained companion spell-slot source must provide familiar form eligibility.",
        )
      : Either.right({
          tag: "ordinaryFamiliarLike",
          eligibility,
          protocol: ordinaryFamiliarLikeProtocol(),
          spend: { tag: "spellSlot", spellLevel: source.spellLevel },
        });
  }
  if (source.tag === "ritualSpell") {
    const invocation = characterSheetSpellInvocation({
      sheet: input.sheet,
      unitLibrary: input.unitLibrary,
      spellId: source.spellId,
      invocation: { kind: "ritual" },
    });
    if (Either.isLeft(invocation)) return Either.left(invocation.left);
    const spell = requiredSpell(input.unitLibrary, invocation.right.spellId);
    if (Either.isLeft(spell)) return Either.left(spell.left);
    const eligibility = findFamiliarFormEligibilityForSpell(spell.right);
    return eligibility === null
      ? characterSheetBattleHandoffIssue(
          "Retained companion ritual source must provide familiar form eligibility.",
        )
      : Either.right({
          tag: "ordinaryFamiliarLike",
          eligibility,
          protocol: ordinaryFamiliarLikeProtocol(),
          spend: { tag: "none" },
        });
  }

  if (source.tag === "invocationSpellAccess") {
    const spellSlots = characterSheetSpellSlots(input.sheet);
    const spellcasting = characterSpellcasting({
      build: input.sheet.build,
      unitLibrary: input.unitLibrary,
      ...(spellSlots === undefined ? {} : { spellSlots }),
    });
    if (Either.isLeft(spellcasting)) {
      return characterSheetBattleHandoffIssue(spellcasting.left.message);
    }
    const access = spellcasting.right.invocationSpellAccesses.find(
      (candidate) =>
        candidate.tag === "pactOfTheChainFindFamiliar" &&
        candidate.spell.id === source.spellId,
    );
    if (access === undefined) {
      return characterSheetBattleHandoffIssue(
        "Retained companion invocation source must provide familiar form eligibility.",
      );
    }
    const eligibility = pactOfTheChainFindFamiliarFormEligibilityForSpell(
      access.spell,
    );
    return eligibility === null
      ? characterSheetBattleHandoffIssue(
          "Retained companion invocation source must provide familiar form catalog references.",
        )
      : Either.right({
          tag: "pactFamiliarLike",
          eligibility,
          protocol: pactFamiliarLikeProtocol(),
          spend: { tag: "none" },
        });
  }

  const feature = retainedCompanionSpellCastFeature({ ...input, source });
  if (Either.isLeft(feature)) return Either.left(feature.left);
  const spendIssue = retainedCompanionFeatureSpendIssue({
    feature: feature.right,
    spend: source.spend,
  });
  if (spendIssue !== null) return characterSheetBattleHandoffIssue(spendIssue);
  const spell = requiredSpell(
    input.unitLibrary,
    feature.right.mechanics.spellId,
  );
  if (Either.isLeft(spell)) return Either.left(spell.left);
  const eligibility = findFamiliarFormEligibilityForSpell(spell.right);
  return eligibility === null
    ? characterSheetBattleHandoffIssue(
        "Retained companion class-feature spell source must provide familiar form eligibility.",
      )
    : Either.right({
        tag: "ownerLongRestExpiringFamiliarLike",
        eligibility,
        protocol: ownerLongRestExpiringFamiliarLikeProtocol(),
        fixedCreatureTypeOverrideChoiceId:
          feature.right.mechanics.spellModeOverride.optionId,
        spend: source.spend,
      });
}

type RetainedCompanionSpellCastFeature = Extract<
  ClassFeatureRecord,
  { readonly kind: "class_feature" }
> & {
  readonly mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "druid_wild_companion_spell_cast" }
  >;
};

function retainedCompanionSpellCastFeature(
  input: CharacterSheetRetainedCompanionCreationInput & {
    readonly source: Extract<
      CharacterSheetRetainedCompanionCreationSource,
      { readonly tag: "classFeatureSpellCast" }
    >;
  },
): Either.Either<
  RetainedCompanionSpellCastFeature,
  CharacterSheetBattleHandoffIssue
> {
  if (
    !characterBuildFeatureUnitIds(
      input.sheet.build,
      input.unitLibrary,
    ).includes(input.source.featureUnitId)
  ) {
    return characterSheetBattleHandoffIssue(
      "Retained companion class-feature spell source requires the selected feature on the Character Sheet.",
    );
  }
  const unit = input.unitLibrary.getUnit(input.source.featureUnitId);
  if (Option.isNone(unit)) {
    return characterSheetBattleHandoffIssue(
      `Unknown retained companion feature Unit id: ${input.source.featureUnitId}`,
    );
  }
  const support = battleDruidWildCompanionSpellCastSupportForUnit(unit.value);
  if (support !== "druidWildCompanionSpellCast") {
    return characterSheetBattleHandoffIssue(
      "Retained companion class-feature spell source must match the supported familiar-like spell-cast profile.",
    );
  }
  if (!isRetainedCompanionSpellCastFeature(unit.value)) {
    return characterSheetBattleHandoffIssue(
      "Retained companion class-feature spell source is malformed.",
    );
  }
  return Either.right(unit.value);
}

function isRetainedCompanionSpellCastFeature(
  unit: UnitRecord,
): unit is RetainedCompanionSpellCastFeature {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "druid_wild_companion_spell_cast"
  );
}

function retainedCompanionFeatureSpendIssue(input: {
  readonly feature: RetainedCompanionSpellCastFeature;
  readonly spend: Extract<
    CharacterSheetRetainedCompanionCreationSource,
    { readonly tag: "classFeatureSpellCast" }
  >["spend"];
}): string | null {
  const matchingSpend = input.feature.mechanics.spendOptions.find((option) => {
    if (input.spend.tag === "spellSlot") return option.kind === "spell_slot";
    return (
      option.kind === "one_class_feature_use" &&
      option.resourceUnitId === input.spend.resourceUnitId
    );
  });
  return matchingSpend === undefined
    ? "Retained companion class-feature spend must match one of the feature spend options."
    : null;
}

function retainedCompanionResolvedForm(input: {
  readonly source: RetainedCompanionCreationSourceFacts;
  readonly selectedForm:
    | FindFamiliarFormSelection
    | PactOfTheChainFindFamiliarFormSelection;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly creatureTypeOverrideChoiceId:
    | FindFamiliarCreatureTypeOverrideChoice["optionId"]
    | undefined;
}): Either.Either<
  {
    readonly statBlock: StatBlockRecord;
    readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
  },
  CharacterSheetBattleHandoffIssue
> {
  const creatureTypeOverrideChoiceId =
    input.source.fixedCreatureTypeOverrideChoiceId ??
    input.creatureTypeOverrideChoiceId;
  if (creatureTypeOverrideChoiceId === undefined) {
    return characterSheetBattleHandoffIssue(
      "Retained companion creation requires a creature type mode choice.",
    );
  }
  const resolved =
    input.source.tag === "pactFamiliarLike"
      ? resolvePactOfTheChainFindFamiliarForm({
          catalog: input.statBlockCatalog,
          eligibility: input.source.eligibility,
          selection: input.selectedForm,
          creatureTypeOverrideChoiceId,
        })
      : input.selectedForm.tag === "pactOfTheChainSpecialForm"
        ? {
            tag: "issue" as const,
            message:
              "Retained companion source does not allow special familiar forms.",
          }
        : resolveFindFamiliarForm({
            catalog: input.statBlockCatalog,
            eligibility: input.source.eligibility,
            selection: input.selectedForm,
            creatureTypeOverrideChoiceId,
          });
  return resolved.tag === "issue"
    ? characterSheetBattleHandoffIssue(resolved.message)
    : Either.right(resolved.form);
}

function spendRetainedCompanionCreationSourceCost(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly source: RetainedCompanionCreationSourceFacts;
}): Either.Either<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  if (
    input.source.tag === "ordinaryFamiliarLike" &&
    input.source.spend.tag === "spellSlot"
  ) {
    const spent = spendCharacterSheetSpellSlot({
      sheet: input.sheet,
      spellLevel: input.source.spend.spellLevel,
      spellSlotSource: undefined,
    });
    return Either.isLeft(spent)
      ? characterSheetBattleHandoffIssue(spent.left.message)
      : Either.right(spent.right);
  }
  if (input.source.tag !== "ownerLongRestExpiringFamiliarLike") {
    return Either.right(input.sheet);
  }
  if (input.source.spend.tag === "spellSlot") {
    const spent = spendCharacterSheetSpellSlot({
      sheet: input.sheet,
      spellLevel: input.source.spend.spellLevel,
      spellSlotSource: undefined,
    });
    return Either.isLeft(spent)
      ? characterSheetBattleHandoffIssue(spent.left.message)
      : Either.right(spent.right);
  }
  return spendRetainedCompanionUseCountResource({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    resourceUnitId: input.source.spend.resourceUnitId,
  });
}

function spendRetainedCompanionUseCountResource(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly resourceUnitId: UnitRecord["id"];
}): Either.Either<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  if (Either.isLeft(resources)) return Either.left(resources.left);
  const resource = resources.right.find(
    (
      candidate,
    ): candidate is Extract<
      CharacterSheetResourceState,
      { readonly tag: "useCountResource" }
    > =>
      candidate.tag === "useCountResource" &&
      candidate.unitId === input.resourceUnitId,
  );
  if (resource === undefined) {
    return characterSheetBattleHandoffIssue(
      "Retained companion class-feature spend requires the selected use-count resource.",
    );
  }
  if (resource.expended >= resource.count) {
    return characterSheetBattleHandoffIssue(
      "Retained companion class-feature spend requires an unexpended use-count resource.",
    );
  }
  const nextExpenditures = input.sheet.resourceExpenditures.filter(
    (expenditure) =>
      expenditure.tag !== "useCountResource" ||
      expenditure.unitId !== input.resourceUnitId,
  );
  nextExpenditures.push({
    tag: "useCountResource",
    unitId: input.resourceUnitId,
    expended: resourceCount(resource.expended + 1),
  });
  return Either.right({
    ...input.sheet,
    resourceExpenditures: nextExpenditures,
  });
}

function retainedCompanionCreationHitPoints(input: {
  readonly statBlock: StatBlockRecord;
  readonly currentHp: HpType | undefined;
  readonly tempHp: HpType | undefined;
}): Either.Either<
  CharacterSheetRetainedCompanionHitPoints,
  CharacterSheetBattleHandoffIssue
> {
  const currentHp = input.currentHp ?? statBlockLiteralHp(input.statBlock);
  if (currentHp === null) {
    return characterSheetBattleHandoffIssue(
      "Retained companion creation requires literal Stat Block HP or caller-provided current HP.",
    );
  }
  if (currentHp < Hp(1)) {
    return characterSheetBattleHandoffIssue(
      "Retained companion current HP must be positive.",
    );
  }
  return Either.right({
    // Cast evidence: Hp proves non-negative integer HP, and the guard above
    // proves the retained companion positive-current-HP alias.
    currentHp:
      currentHp as CharacterSheetRetainedCompanionHitPoints["currentHp"],
    tempHp: input.tempHp ?? Hp(0),
  });
}

function statBlockLiteralHp(statBlock: StatBlockRecord): HpType | null {
  return statBlock.statBlock.hp.kind === "literal"
    ? Hp(statBlock.statBlock.hp.value)
    : null;
}

function requiredSpell(
  unitLibrary: UnitCatalog,
  spellId: UnitRecord["id"],
): Either.Either<SpellRecord, CharacterSheetBattleHandoffIssue> {
  const unit = unitLibrary.getUnit(spellId);
  if (Option.isNone(unit)) {
    return characterSheetBattleHandoffIssue(
      `Unknown Spell Unit id: ${spellId}`,
    );
  }
  return unit.value.kind === "spell"
    ? Either.right(unit.value)
    : characterSheetBattleHandoffIssue(
        "Retained companion source must reference a Spell record.",
      );
}

function ordinaryFamiliarLikeProtocol(): CharacterSheetOrdinaryFamiliarLikeOneAtATimeProtocol {
  return {
    tag: "ordinaryFamiliarLikeOneAtATime",
    initiative: "own",
    attack: { tag: "cannotAttack" },
    dismissal: { tag: "temporaryDismissalAndReappearance" },
    expiration: { tag: "none" },
  };
}

function pactFamiliarLikeProtocol(): CharacterSheetAttackExceptionFamiliarLikeOneAtATimeProtocol {
  return {
    tag: "attackExceptionFamiliarLikeOneAtATime",
    initiative: "own",
    attack: { tag: "ownerForgoesAttackForReactionAttack" },
    dismissal: { tag: "temporaryDismissalAndReappearance" },
    expiration: { tag: "none" },
  };
}

function ownerLongRestExpiringFamiliarLikeProtocol(): CharacterSheetOwnerLongRestFamiliarLikeOneAtATimeProtocol {
  return {
    tag: "ownerLongRestFamiliarLikeOneAtATime",
    initiative: "own",
    attack: { tag: "cannotAttack" },
    dismissal: { tag: "temporaryDismissalAndReappearance" },
    expiration: { tag: "ownerFinishedLongRest" },
  };
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
  const formSelection = battleFormSelectionForSheetForm(proof.selectedForm);
  if (Either.isLeft(formSelection)) return Either.left(formSelection.left);
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
    selectedForm: proof.selectedForm,
    resolvedStatBlockId: proof.resolvedStatBlockId,
  });
  if (Either.isLeft(formEligibility)) return Either.left(formEligibility.left);
  if (formAccess.right === "findFamiliar") {
    if (formSelection.right.tag === "pactOfTheChainSpecialForm") {
      return characterSheetBattleHandoffIssue(
        "Find Familiar retained companion access cannot use special companion forms.",
      );
    }
    return Either.right({
      formEligibility: formEligibility.right,
      storedForm: {
        formAccess: "findFamiliar",
        formSelection: formSelection.right,
        resolvedStatBlockId: proof.resolvedStatBlockId,
      },
    });
  }
  if (formAccess.right === "druidWildCompanion") {
    if (formSelection.right.tag === "pactOfTheChainSpecialForm") {
      return characterSheetBattleHandoffIssue(
        "Wild Companion retained companion access cannot use special companion forms.",
      );
    }
    return Either.right({
      formEligibility: formEligibility.right,
      storedForm: {
        formAccess: "druidWildCompanion",
        formSelection: formSelection.right,
        resolvedStatBlockId: proof.resolvedStatBlockId,
      },
    });
  }
  return Either.right({
    formEligibility: formEligibility.right,
    storedForm: {
      formAccess: "pactOfTheChain",
      formSelection: formSelection.right,
      resolvedStatBlockId: proof.resolvedStatBlockId,
    },
  });
}

function battleCompanionFormEligibilityForAccess(input: {
  readonly formAccess: BattleCompanionStoredForm["formAccess"];
  readonly unitLibrary: UnitCatalog;
  readonly selectedForm: CharacterSheetCompanionFormSelection;
  readonly resolvedStatBlockId: StatBlockRecord["id"];
}): Either.Either<
  CompanionBattleAdmissionFormEligibility,
  CharacterSheetBattleHandoffIssue
> {
  const eligibility = retainedFamiliarLikeFormEligibility({
    unitLibrary: input.unitLibrary,
    selectedForm: input.selectedForm,
    resolvedStatBlockId: input.resolvedStatBlockId,
  });
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
  if (input.selectedForm.tag === "specialForm") {
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
  const eligibility = retainedFamiliarLikeFormEligibility({
    unitLibrary: input.unitLibrary,
    selectedForm: input.selectedForm,
    resolvedStatBlockId: input.resolvedStatBlockId,
  });
  if (Either.isLeft(eligibility)) return eligibility.left.message;
  const normalForm = eligibility.right.normalForms.find(
    (form) => form.formId === selectedForm.formId,
  );
  if (normalForm === undefined) {
    return "Retained companion normal form is not eligible for the familiar-like form catalog.";
  }
  return normalForm.statBlockId === input.resolvedStatBlockId
    ? null
    : "Retained companion normal form proof does not match its resolved Stat Block id.";
}

function retainedFamiliarLikeFormEligibility(input: {
  readonly unitLibrary: UnitCatalog;
  readonly selectedForm: CharacterSheetCompanionFormSelection;
  readonly resolvedStatBlockId: StatBlockRecord["id"];
}): Either.Either<
  FindFamiliarFormEligibility,
  CharacterSheetBattleHandoffIssue
> {
  const eligible = input.unitLibrary
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
  const eligibility = eligible.find((candidate) =>
    retainedFamiliarLikeEligibilityMatchesStoredForm({
      eligibility: candidate,
      selectedForm: input.selectedForm,
      resolvedStatBlockId: input.resolvedStatBlockId,
    }),
  );
  return eligibility === undefined
    ? characterSheetBattleHandoffIssue(
        "Retained companion admission requires a familiar-like form catalog matching the retained form.",
      )
    : Either.right(eligibility);
}

function retainedFamiliarLikeEligibilityMatchesStoredForm(input: {
  readonly eligibility: FindFamiliarFormEligibility;
  readonly selectedForm: CharacterSheetCompanionFormSelection;
  readonly resolvedStatBlockId: StatBlockRecord["id"];
}): boolean {
  const selectedForm = input.selectedForm;
  if (selectedForm.tag !== "normalNamedForm") return true;
  return input.eligibility.normalForms.some(
    (form) =>
      form.formId === selectedForm.formId &&
      form.statBlockId === input.resolvedStatBlockId,
  );
}

function battleFormSelectionForSheetForm(
  selectedForm: CharacterSheetCompanionFormSelection,
): Either.Either<
  FindFamiliarFormSelection | PactOfTheChainFindFamiliarFormSelection,
  CharacterSheetBattleHandoffIssue
> {
  if (selectedForm.tag === "specialForm") {
    const specialForm = PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS.find(
      (form) => form.formId === selectedForm.formId,
    );
    if (specialForm === undefined) {
      return characterSheetBattleHandoffIssue(
        "Unknown retained companion special form.",
      );
    }
    return Either.right({
      tag: "pactOfTheChainSpecialForm",
      formId: specialForm.formId,
    });
  }
  return Either.right(selectedForm);
}

function battleCompanionHandoffIdentityIssue(input: {
  readonly sheetCompanion: Extract<
    CharacterSheetCompanion,
    { readonly tag: "retainedOneAtATime" }
  >["companion"];
  readonly battleCompanion: BattleCompanionState;
  readonly admission: CharacterSheetCompanionBattleAdmissionState;
}): string | null {
  if (input.battleCompanion.identity.tag !== "retainedBetweenBattles") {
    return input.admission.tag === "notAdmitted"
      ? "Battle-only companion cannot settle into a retained Character Sheet companion."
      : "Admitted retained companion lost its durable battle identity.";
  }
  if (input.admission.tag === "notAdmitted") {
    return "Retained battle companion was not admitted for this session.";
  }
  if (
    input.sheetCompanion.companionId !==
    input.battleCompanion.identity.durableCompanionId
  ) {
    return "Battle companion durable identity does not match Character Sheet companion.";
  }
  if (
    input.admission.companionId !==
    input.battleCompanion.identity.durableCompanionId
  ) {
    return "Battle companion durable identity does not match the admitted companion.";
  }
  return null;
}

function battleFormAccessForSheetCompanion(input: {
  readonly protocol: CharacterSheetRetainedCompanionProtocol;
  readonly selectedForm: CharacterSheetCompanionFormSelection;
}): Either.Either<
  BattleCompanionStoredForm["formAccess"],
  CharacterSheetBattleHandoffIssue
> {
  if (input.selectedForm.tag === "specialForm") {
    if (!isAttackExceptionFamiliarLikeProtocol(input.protocol)) {
      return characterSheetBattleHandoffIssue(
        "Special retained companion forms require an attack-exception protocol.",
      );
    }
    return Either.right("pactOfTheChain");
  }
  if (isAttackExceptionFamiliarLikeProtocol(input.protocol)) {
    return Either.right("pactOfTheChain");
  }
  if (isOwnerLongRestFamiliarLikeProtocol(input.protocol)) {
    return Either.right("druidWildCompanion");
  }
  return Either.right("findFamiliar");
}

function isAttackExceptionFamiliarLikeProtocol(
  protocol: CharacterSheetRetainedCompanionProtocol,
): protocol is CharacterSheetAttackExceptionFamiliarLikeOneAtATimeProtocol {
  return protocol.tag === "attackExceptionFamiliarLikeOneAtATime";
}

function isOwnerLongRestFamiliarLikeProtocol(
  protocol: CharacterSheetRetainedCompanionProtocol,
): protocol is CharacterSheetOwnerLongRestFamiliarLikeOneAtATimeProtocol {
  return protocol.tag === "ownerLongRestFamiliarLikeOneAtATime";
}

function companionManifestationFromBattle(input: {
  readonly state: BattleState;
  readonly companionId: BattleCompanionStateId;
  readonly companion: BattleCompanionState;
}): Either.Either<
  CharacterSheetRetainedCompanionManifestation,
  CharacterSheetBattleHandoffIssue
> {
  if (input.companion.status === "present") {
    // Cast evidence: present companion entries are keyed by active battle
    // combatant id; absent retained companions are the branch that may use a
    // durable companion state id instead.
    const companionCombatantId = input.companionId as CombatantId;
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
    selectedForm: sheetCompanionSelectedFormFromBattle(input.storedForm),
    creatureTypeOverride: input.creatureTypeOverride,
    resolvedStatBlockId: input.storedForm.resolvedStatBlockId,
  };
}

function sheetCompanionSelectedFormFromBattle(
  storedForm: BattleCompanionStoredForm,
): CharacterSheetCompanionFormSelection {
  if (storedForm.formSelection.tag === "pactOfTheChainSpecialForm") {
    return {
      tag: "specialForm",
      formId: storedForm.formSelection.formId,
    };
  }
  return storedForm.formSelection;
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
