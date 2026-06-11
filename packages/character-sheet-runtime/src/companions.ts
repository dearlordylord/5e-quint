// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
import {
  characterBuildFeatureUnitIds,
  eldritchInvocationId,
  type CharacterBuild,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import {
  Hp,
  resourceCount,
  type Hp as HpType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import {
  isAttackExceptionRetainedCompanionProtocol,
  isRetainedCompanionProtocolTag,
  ordinaryFamiliarLikeProtocol,
  ownerLongRestExpiringFamiliarLikeProtocol,
  pactFamiliarLikeProtocol,
} from "@dnd/shared-algebras/companion-protocol-algebra";
import {
  PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS,
  findFamiliarFormEligibilityForSpell,
  isFindFamiliarCreatureTypeOverride,
  pactOfTheChainFindFamiliarFormEligibilityForSpell,
  resolveFindFamiliarForm,
  resolvePactOfTheChainFindFamiliarForm,
  type FindFamiliarCreatureTypeOverride,
  type FindFamiliarCreatureTypeOverrideChoice,
  type FindFamiliarFormEligibility,
  type FindFamiliarFormSelection,
  type PactOfTheChainFindFamiliarFormEligibility,
  type PactOfTheChainFindFamiliarFormSelection,
} from "@dnd/surface/surface/find-familiar-forms";
import type {
  ClassFeatureRecord,
  SpellRecord,
  StatBlockRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Either, Option } from "effect";

import { characterSheetResources } from "./resources.ts";
import { characterSheetSpellInvocation } from "./spell-invocation.ts";
import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";
import {
  characterSheetIssue,
  parseCharacterSheetRetainedCompanionId,
  retainedCompanionProtocolFacts,
  type CharacterSheet,
  type CharacterSheetCompanion,
  type CharacterSheetCompanionCreatureTypeOverride,
  type CharacterSheetCompanionFormSelection,
  type CharacterSheetIssue,
  type CharacterSheetResourceState,
  type CharacterSheetRetainedCompanionCreationInput,
  type CharacterSheetRetainedCompanionCreationSource,
  type CharacterSheetRetainedCompanionCurrentHitPoints,
  type CharacterSheetRetainedCompanionHitPoints,
  type CharacterSheetRetainedCompanionManifestation,
  type CharacterSheetRetainedCompanionProtocol,
  type CharacterSheetRetainedCompanionState,
} from "./sheet-types.ts";
import { parseHp } from "./hit-points.ts";
import { isRecord, isSpellcastingBuild } from "./stored-sheet-parser.ts";

type RetainedCompanionCreationSourceFacts =
  | {
      readonly tag: "ordinaryFamiliarLike";
      readonly eligibility: FindFamiliarFormEligibility;
      readonly protocol: CharacterSheetRetainedCompanionProtocol;
      readonly spend:
        | { readonly tag: "none" }
        | { readonly tag: "spellSlot"; readonly spellLevel: SpellSlotLevel };
      readonly fixedCreatureTypeOverrideChoiceId?: never;
    }
  | {
      readonly tag: "pactFamiliarLike";
      readonly eligibility: PactOfTheChainFindFamiliarFormEligibility;
      readonly protocol: CharacterSheetRetainedCompanionProtocol;
      readonly spend: { readonly tag: "none" };
      readonly fixedCreatureTypeOverrideChoiceId?: never;
    }
  | {
      readonly tag: "ownerLongRestExpiringFamiliarLike";
      readonly eligibility: FindFamiliarFormEligibility;
      readonly protocol: CharacterSheetRetainedCompanionProtocol;
      readonly fixedCreatureTypeOverrideChoiceId: FindFamiliarCreatureTypeOverrideChoice["optionId"];
      readonly spend: Extract<
        CharacterSheetRetainedCompanionCreationSource,
        { readonly tag: "classFeatureSpellCast" }
      >["spend"];
    };

const PACT_OF_THE_CHAIN_INVOCATION_ID =
  eldritchInvocationId("pact_of_the_chain");
const PACT_OF_THE_CHAIN_SPELL_ID = "find_familiar";

export function characterSheetCompanion(
  sheet: CharacterSheet,
): CharacterSheetCompanion {
  return sheet.companion;
}

export function replaceCharacterSheetCompanion(input: {
  readonly sheet: CharacterSheet;
  readonly companion: CharacterSheetCompanion;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  return Either.right({ ...input.sheet, companion: input.companion });
}

export function companionAfterLongRest(
  companion: CharacterSheetCompanion,
): CharacterSheetCompanion {
  if (companion.tag === "none") return companion;
  // A46: the owner's Long Rest does not touch a surviving retained companion --
  // its Hit Points and Temporary Hit Points both persist. The only companion the
  // owner's rest removes is the Wild Companion (owner-long-rest) familiar, which
  // disappears when its owner finishes a Long Rest (SRD Druid Wild Companion).
  return retainedCompanionProtocolFacts(companion.companion.protocol).expiration
    .tag === "ownerFinishedLongRest"
    ? { tag: "none" }
    : companion;
}

export function createRetainedFamiliarLikeCompanion(
  input: CharacterSheetRetainedCompanionCreationInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const source = retainedCompanionCreationSource(input);
  if (Either.isLeft(source)) return Either.left(source.left);
  const resolved = retainedCompanionResolvedForm({
    source: source.right,
    selectedForm: input.selectedForm,
    statBlockCatalog: input.statBlockCatalog,
    creatureTypeOverrideChoiceId: input.creatureTypeOverrideChoiceId,
  });
  if (Either.isLeft(resolved)) return Either.left(resolved.left);

  const existing = characterSheetCompanion(input.sheet);
  if (
    existing.tag === "retainedOneAtATime" &&
    existing.companion.companionId !== input.companionId
  ) {
    return characterSheetIssue(
      "Retained companion recast cannot replace the durable identity of an occupied companion slot.",
    );
  }
  const companionId =
    existing.tag === "retainedOneAtATime"
      ? existing.companion.companionId
      : input.companionId;
  const hitPoints =
    existing.tag === "retainedOneAtATime"
      ? retainedCompanionRecastHitPoints({
          statBlock: resolved.right.statBlock,
          manifestation: existing.companion.manifestation,
        })
      : retainedCompanionCreationHitPoints({
          statBlock: resolved.right.statBlock,
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
        companionId,
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

export function companionFromInput(
  companion: CharacterSheetCompanion | undefined,
): Either.Either<CharacterSheetCompanion, CharacterSheetIssue> {
  if (companion === undefined || companion.tag === "none") {
    return Either.right({ tag: "none" });
  }
  if (companion.tag !== "retainedOneAtATime") {
    return characterSheetIssue("Character Sheet companion state is invalid.");
  }
  const hitPointsIssue = retainedCompanionHitPointsIssue(
    companion.companion.manifestation,
  );
  if (hitPointsIssue !== null) return characterSheetIssue(hitPointsIssue);
  const protocolIssue = retainedCompanionProtocolIssue(companion.companion);
  if (protocolIssue !== null) return characterSheetIssue(protocolIssue);
  return Either.right(companion);
}

export function parseStoredCharacterSheetCompanion(
  value: unknown,
): Either.Either<CharacterSheetCompanion, CharacterSheetIssue> {
  if (value === undefined || value === null)
    return Either.right({ tag: "none" });
  if (!isRecord(value)) {
    return characterSheetIssue("Expected Character Sheet companion state.");
  }
  if (value.tag === "none") return Either.right({ tag: "none" });
  if (value.tag !== "retainedOneAtATime" || !isRecord(value.companion)) {
    return characterSheetIssue("Expected Character Sheet companion state.");
  }
  const companion = value.companion;
  if (typeof companion.companionId !== "string") {
    return characterSheetIssue("Retained companion requires companion id.");
  }
  const companionId = parseCharacterSheetRetainedCompanionId(
    companion.companionId,
  );
  if (Either.isLeft(companionId)) return Either.left(companionId.left);
  const protocol = parseStoredRetainedCompanionProtocol(companion.protocol);
  if (Either.isLeft(protocol)) return Either.left(protocol.left);
  const manifestation = parseStoredRetainedCompanionManifestation(
    companion.manifestation,
  );
  if (Either.isLeft(manifestation)) return Either.left(manifestation.left);
  return Either.right({
    tag: "retainedOneAtATime",
    companion: {
      companionId: companionId.right,
      protocol: protocol.right,
      manifestation: manifestation.right,
    },
  });
}

function retainedCompanionHitPointsIssue(
  manifestation: CharacterSheetRetainedCompanionManifestation,
): string | null {
  if (manifestation.tag === "disappearedAtZeroHitPoints") {
    return null;
  }
  return manifestation.hitPoints.currentHp < Hp(1)
    ? "Retained companion current HP must be positive unless it disappeared at 0 HP."
    : null;
}

function retainedCompanionProtocolIssue(
  companion: CharacterSheetRetainedCompanionState,
): string | null {
  const selectedForm = companion.manifestation.selectedForm;
  // SRD Warlock.md Pact of the Chain grants special familiar forms and the
  // attack exception together; a stored special-form companion must retain
  // that protocol.
  if (
    selectedForm.tag === "pactOfTheChainSpecialForm" &&
    !isAttackExceptionRetainedCompanionProtocol(companion.protocol)
  ) {
    return "Retained companion special forms require the attack-exception protocol.";
  }
  return null;
}

function parseStoredRetainedCompanionProtocol(
  value: unknown,
): Either.Either<CharacterSheetRetainedCompanionProtocol, CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue("Expected retained companion protocol.");
  }
  if (!isRetainedCompanionProtocolTag(value.tag)) {
    return characterSheetIssue("Expected retained companion protocol tag.");
  }
  return Either.right({ tag: value.tag });
}

function parseStoredRetainedCompanionManifestation(
  value: unknown,
): Either.Either<
  CharacterSheetRetainedCompanionManifestation,
  CharacterSheetIssue
> {
  if (!isRecord(value)) {
    return characterSheetIssue("Expected retained companion manifestation.");
  }
  if (
    value.tag !== "embodiedOutsideBattle" &&
    value.tag !== "temporarilyDismissed" &&
    value.tag !== "disappearedAtZeroHitPoints"
  ) {
    return characterSheetIssue("Expected retained companion manifestation.");
  }
  const selectedForm = parseStoredRetainedCompanionFormSelection(
    value.selectedForm,
  );
  if (Either.isLeft(selectedForm)) return Either.left(selectedForm.left);
  if (
    !isCharacterSheetCompanionCreatureTypeOverride(value.creatureTypeOverride)
  ) {
    return characterSheetIssue(
      "Retained companion requires a creature type override.",
    );
  }
  if (typeof value.resolvedStatBlockId !== "string") {
    return characterSheetIssue(
      "Retained companion requires resolved Stat Block id.",
    );
  }
  const proof = {
    selectedForm: selectedForm.right,
    creatureTypeOverride: value.creatureTypeOverride,
    resolvedStatBlockId: value.resolvedStatBlockId,
  };
  if (value.tag === "disappearedAtZeroHitPoints") {
    return Either.right({ tag: "disappearedAtZeroHitPoints", ...proof });
  }
  const hitPoints = parseStoredRetainedCompanionHitPoints(value.hitPoints);
  return Either.isLeft(hitPoints)
    ? Either.left(hitPoints.left)
    : Either.right({ tag: value.tag, ...proof, hitPoints: hitPoints.right });
}

function parseStoredRetainedCompanionFormSelection(
  value: unknown,
): Either.Either<CharacterSheetCompanionFormSelection, CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue("Expected retained companion form selection.");
  }
  if (value.tag === "normalNamedForm") {
    return typeof value.formId === "string" && value.formId.length > 0
      ? Either.right({ tag: "normalNamedForm", formId: value.formId })
      : characterSheetIssue("Retained companion normal form requires form id.");
  }
  if (value.tag === "challengeRatingZeroBeast") {
    return typeof value.statBlockId === "string" && value.statBlockId.length > 0
      ? Either.right({
          tag: "challengeRatingZeroBeast",
          statBlockId: value.statBlockId,
        })
      : characterSheetIssue(
          "Retained companion Beast form requires Stat Block id.",
        );
  }
  if (value.tag === "pactOfTheChainSpecialForm") {
    const specialForm = PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS.find(
      (form) => form.formId === value.formId,
    );
    return specialForm === undefined
      ? characterSheetIssue("Retained companion special form requires form id.")
      : Either.right({
          tag: "pactOfTheChainSpecialForm",
          formId: specialForm.formId,
        });
  }
  return characterSheetIssue("Expected retained companion form selection.");
}

function parseStoredRetainedCompanionHitPoints(
  value: unknown,
): Either.Either<
  CharacterSheetRetainedCompanionHitPoints,
  CharacterSheetIssue
> {
  if (!isRecord(value)) {
    return characterSheetIssue("Expected retained companion hit points.");
  }
  const currentHp = parseHp(value.currentHp);
  if (Either.isLeft(currentHp)) return Either.left(currentHp.left);
  const positiveCurrentHp = retainedCompanionCurrentHitPoints(currentHp.right);
  if (Either.isLeft(positiveCurrentHp))
    return Either.left(positiveCurrentHp.left);
  const tempHp = parseHp(value.tempHp);
  return Either.isLeft(tempHp)
    ? Either.left(tempHp.left)
    : Either.right({
        currentHp: positiveCurrentHp.right,
        tempHp: tempHp.right,
      });
}

function retainedCompanionCreationSource(
  input: CharacterSheetRetainedCompanionCreationInput,
): Either.Either<RetainedCompanionCreationSourceFacts, CharacterSheetIssue> {
  const source = input.source;
  if (source.tag === "spellSlotSpellCast") {
    const spell = retainedCompanionPreparedSpell({
      sheet: input.sheet,
      unitLibrary: input.unitLibrary,
      spellId: source.spellId,
    });
    if (Either.isLeft(spell)) return Either.left(spell.left);
    if (source.spellLevel < spell.right.mechanics.level) {
      return characterSheetIssue(
        "Retained companion spell-slot source requires a slot at least as high as the selected spell level.",
      );
    }
    const eligibility = findFamiliarFormEligibilityForSpell(spell.right);
    return eligibility === null
      ? characterSheetIssue(
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
    const spell = requiredSpellRecord(
      input.unitLibrary,
      invocation.right.spellId,
    );
    if (Either.isLeft(spell)) return Either.left(spell.left);
    const eligibility = findFamiliarFormEligibilityForSpell(spell.right);
    return eligibility === null
      ? characterSheetIssue(
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
    const spell = retainedCompanionInvocationSpell({
      sheet: input.sheet,
      unitLibrary: input.unitLibrary,
      spellId: source.spellId,
    });
    if (Either.isLeft(spell)) return Either.left(spell.left);
    const eligibility = pactOfTheChainFindFamiliarFormEligibilityForSpell(
      spell.right,
    );
    return eligibility === null
      ? characterSheetIssue(
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
  if (spendIssue !== null) return characterSheetIssue(spendIssue);
  const spell = requiredSpellRecord(
    input.unitLibrary,
    feature.right.mechanics.spellId,
  );
  if (Either.isLeft(spell)) return Either.left(spell.left);
  const eligibility = findFamiliarFormEligibilityForSpell(spell.right);
  return eligibility === null
    ? characterSheetIssue(
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

function retainedCompanionPreparedSpell(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
}): Either.Either<SpellRecord, CharacterSheetIssue> {
  if (!isSpellcastingBuild(input.sheet.build)) {
    return characterSheetIssue(
      "Retained companion spell-slot source requires the selected spell prepared or otherwise effective as prepared.",
    );
  }
  const preparedSpellIds = input.sheet.build.spellcasting.sources.flatMap(
    (source) => [
      ...source.preparedSpells,
      ...(input.sheet.bookOfShadowsPresence?.tag === "onPerson"
        ? (source.bookOfShadows?.ritualSpells ?? [])
        : []),
    ],
  );
  if (!preparedSpellIds.some((spellId) => spellId === input.spellId)) {
    return characterSheetIssue(
      "Retained companion spell-slot source requires the selected spell prepared or otherwise effective as prepared.",
    );
  }
  return requiredSpellRecord(input.unitLibrary, input.spellId);
}

function retainedCompanionInvocationSpell(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
}): Either.Either<SpellRecord, CharacterSheetIssue> {
  if (
    input.spellId !== PACT_OF_THE_CHAIN_SPELL_ID ||
    !hasSelectedEldritchInvocation(
      input.sheet.build,
      PACT_OF_THE_CHAIN_INVOCATION_ID,
    )
  ) {
    return characterSheetIssue(
      "Retained companion invocation source must provide familiar form eligibility.",
    );
  }
  return requiredSpellRecord(input.unitLibrary, input.spellId);
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
): Either.Either<RetainedCompanionSpellCastFeature, CharacterSheetIssue> {
  if (
    !characterBuildFeatureUnitIds(
      input.sheet.build,
      input.unitLibrary,
    ).includes(input.source.featureUnitId)
  ) {
    return characterSheetIssue(
      "Retained companion class-feature spell source requires the selected feature on the Character Sheet.",
    );
  }
  const unit = input.unitLibrary.getUnit(input.source.featureUnitId);
  if (Option.isNone(unit)) {
    return characterSheetIssue(
      `Unknown retained companion feature Unit id: ${input.source.featureUnitId}`,
    );
  }
  if (!isSupportedRetainedCompanionSpellCastFeature(unit.value)) {
    return characterSheetIssue(
      "Retained companion class-feature spell source must match the supported familiar-like spell-cast profile.",
    );
  }
  return Either.right(unit.value);
}

function isSupportedRetainedCompanionSpellCastFeature(
  unit: UnitRecord,
): unit is RetainedCompanionSpellCastFeature {
  return (
    unit.kind === "class_feature" &&
    unit.className === "druid" &&
    unit.mechanics.family === "druid_wild_companion_spell_cast" &&
    unit.mechanics.spellId === "find_familiar" &&
    unit.mechanics.activationCost.kind === "standard_action" &&
    unit.mechanics.activationCost.action === "magic" &&
    unit.mechanics.componentOverride.material === "not_required" &&
    unit.mechanics.spellModeOverride.kind ===
      "fixed_creature_type_mode_option" &&
    unit.mechanics.spellModeOverride.optionId === "fey"
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
  readonly statBlockCatalog: CharacterSheetRetainedCompanionCreationInput["statBlockCatalog"];
  readonly creatureTypeOverrideChoiceId:
    | FindFamiliarCreatureTypeOverrideChoice["optionId"]
    | undefined;
}): Either.Either<
  {
    readonly statBlock: StatBlockRecord;
    readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
  },
  CharacterSheetIssue
> {
  const creatureTypeOverrideChoiceId =
    input.source.fixedCreatureTypeOverrideChoiceId ??
    input.creatureTypeOverrideChoiceId;
  if (creatureTypeOverrideChoiceId === undefined) {
    return characterSheetIssue(
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
    ? characterSheetIssue(resolved.message)
    : Either.right(resolved.form);
}

function spendRetainedCompanionCreationSourceCost(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly source: RetainedCompanionCreationSourceFacts;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (input.source.spend.tag === "spellSlot") {
    return spendCharacterSheetSpellSlot({
      sheet: input.sheet,
      spellLevel: input.source.spend.spellLevel,
      spellSlotSource: undefined,
    });
  }
  if (input.source.tag !== "ownerLongRestExpiringFamiliarLike") {
    return Either.right(input.sheet);
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
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
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
    return characterSheetIssue(
      "Retained companion class-feature spend requires the selected use-count resource.",
    );
  }
  if (resource.expended >= resource.count) {
    return characterSheetIssue(
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

function retainedCompanionRecastHitPoints(input: {
  readonly statBlock: StatBlockRecord;
  readonly manifestation: CharacterSheetRetainedCompanionManifestation;
}): Either.Either<
  CharacterSheetRetainedCompanionHitPoints,
  CharacterSheetIssue
> {
  if (input.manifestation.tag === "disappearedAtZeroHitPoints") {
    return retainedCompanionCreationHitPoints({
      statBlock: input.statBlock,
    });
  }
  const maxHp = statBlockLiteralHp(input.statBlock);
  if (maxHp === null) {
    return characterSheetIssue(
      "Retained companion recast requires literal Stat Block HP.",
    );
  }
  const clampedCurrentHp = Hp(
    Math.min(Number(input.manifestation.hitPoints.currentHp), Number(maxHp)),
  );
  if (clampedCurrentHp < Hp(1)) {
    return characterSheetIssue(
      "Retained companion recast current HP must be positive.",
    );
  }
  const carriedCurrentHp =
    clampedCurrentHp as unknown as CharacterSheetRetainedCompanionHitPoints["currentHp"];
  return Either.right({
    // Cast evidence: Hp proves non-negative integer HP, and the guard above
    // proves the retained companion positive-current-HP alias for the carried,
    // clamped value.
    currentHp: carriedCurrentHp,
    tempHp: input.manifestation.hitPoints.tempHp,
  });
}

function retainedCompanionCreationHitPoints(input: {
  readonly statBlock: StatBlockRecord;
}): Either.Either<
  CharacterSheetRetainedCompanionHitPoints,
  CharacterSheetIssue
> {
  const currentHp = statBlockLiteralHp(input.statBlock);
  if (currentHp === null) {
    // Future non-literal Stat Block HP support needs an explicit table-provided
    // rolled-HP witness instead of reviving caller-minted creation HP.
    return characterSheetIssue(
      "Retained companion creation requires literal Stat Block HP.",
    );
  }
  if (currentHp < Hp(1)) {
    return characterSheetIssue(
      "Retained companion current HP must be positive.",
    );
  }
  return Either.right({
    // Cast evidence: Hp proves non-negative integer HP, and the guard above
    // proves the retained companion positive-current-HP alias.
    currentHp:
      currentHp as CharacterSheetRetainedCompanionHitPoints["currentHp"],
    tempHp: Hp(0),
  });
}

function statBlockLiteralHp(statBlock: StatBlockRecord): HpType | null {
  return statBlock.statBlock.hp.kind === "literal"
    ? Hp(statBlock.statBlock.hp.value)
    : null;
}

function requiredSpellRecord(
  unitLibrary: UnitCatalog,
  spellId: UnitRecord["id"],
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = unitLibrary.getUnit(spellId);
  if (Option.isNone(unit)) {
    return characterSheetIssue(`Unknown Spell Unit id: ${spellId}`);
  }
  return unit.value.kind === "spell"
    ? Either.right(unit.value)
    : characterSheetIssue(
        "Retained companion source must reference a Spell record.",
      );
}

function hasSelectedEldritchInvocation(
  build: CharacterBuild,
  invocationId: ReturnType<typeof eldritchInvocationId>,
): boolean {
  return build.features.some(
    (feature) =>
      feature.kind === "selectedEldritchInvocation" &&
      feature.selection.invocationId === invocationId,
  );
}

function retainedCompanionCurrentHitPoints(
  hp: HpType,
): Either.Either<
  CharacterSheetRetainedCompanionCurrentHitPoints,
  CharacterSheetIssue
> {
  if (hp < Hp(1)) {
    return characterSheetIssue(
      "Retained companion current HP must be positive.",
    );
  }
  // Cast evidence: Hp proves a non-negative integer, and the branch above
  // proves the positive-integer part of retained companion current HP.
  return Either.right(hp as CharacterSheetRetainedCompanionCurrentHitPoints);
}

function isCharacterSheetCompanionCreatureTypeOverride(
  value: unknown,
): value is CharacterSheetCompanionCreatureTypeOverride {
  return isFindFamiliarCreatureTypeOverride(value);
}
