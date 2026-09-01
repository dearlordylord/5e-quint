// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
import {
  statBlockId as authoredStatBlockId,
  unitId as authoredUnitId,
} from "@dnd/shared/game-facts";
import {
  characterBuildFeatureUnitIds,
  eldritchInvocationId,
  type CharacterBuild,
  type UnitCatalog,
} from "../../character-creation-runtime/src/consumer-protocol.ts";
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
  spawnedCompanionFormEligibilityForSpell,
  isSpawnedCompanionCreatureTypeOverride,
  pactOfTheChainSpawnedCompanionFormEligibilityForSpell,
  resolveSpawnedCompanionForm,
  resolvePactOfTheChainSpawnedCompanionForm,
  type SpawnedCompanionCreatureTypeOverride,
  type SpawnedCompanionCreatureTypeOverrideChoice,
  type SpawnedCompanionFormEligibility,
  type SpawnedCompanionFormSelection,
  type PactOfTheChainSpawnedCompanionFormEligibility,
  type PactOfTheChainSpawnedCompanionFormSelection,
} from "@dnd/surface/surface/find-familiar-forms";
import type {
  ClassFeatureRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import type { StatBlockRecord } from "../../surface/src/surface/stat-block-types.ts";
import { Result, Option } from "effect";

import {
  projectCharacterSheetClassFeature,
  type CharacterSheetClassFeatureFacts,
} from "./character-feature-projection.ts";
import {
  projectCharacterSheetSpellSource,
  type CharacterSheetSpellSource,
} from "./character-spell-projection.ts";

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
      readonly eligibility: SpawnedCompanionFormEligibility;
      readonly protocol: CharacterSheetRetainedCompanionProtocol;
      readonly spend:
        | { readonly tag: "none" }
        | { readonly tag: "spellSlot"; readonly spellLevel: SpellSlotLevel };
      readonly fixedCreatureTypeOverrideChoiceId?: never;
    }
  | {
      readonly tag: "pactFamiliarLike";
      readonly eligibility: PactOfTheChainSpawnedCompanionFormEligibility;
      readonly protocol: CharacterSheetRetainedCompanionProtocol;
      readonly spend: { readonly tag: "none" };
      readonly fixedCreatureTypeOverrideChoiceId?: never;
    }
  | {
      readonly tag: "ownerLongRestExpiringFamiliarLike";
      readonly eligibility: SpawnedCompanionFormEligibility;
      readonly protocol: CharacterSheetRetainedCompanionProtocol;
      readonly fixedCreatureTypeOverrideChoiceId: SpawnedCompanionCreatureTypeOverrideChoice["optionId"];
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
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  return Result.succeed({ ...input.sheet, companion: input.companion });
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
): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const source = retainedCompanionCreationSource(input);
  if (Result.isFailure(source)) return Result.fail(source.failure);
  const resolved = retainedCompanionResolvedForm({
    source: source.success,
    selectedForm: input.selectedForm,
    statBlockCatalog: input.statBlockCatalog,
    creatureTypeOverrideChoiceId: input.creatureTypeOverrideChoiceId,
  });
  if (Result.isFailure(resolved)) return Result.fail(resolved.failure);

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
          statBlock: resolved.success.statBlock,
          manifestation: existing.companion.manifestation,
        })
      : retainedCompanionCreationHitPoints({
          statBlock: resolved.success.statBlock,
        });
  if (Result.isFailure(hitPoints)) return Result.fail(hitPoints.failure);
  const spentSheet = spendRetainedCompanionCreationSourceCost({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    source: source.success,
  });
  if (Result.isFailure(spentSheet)) return Result.fail(spentSheet.failure);

  return replaceCharacterSheetCompanion({
    sheet: spentSheet.success,
    companion: {
      tag: "retainedOneAtATime",
      companion: {
        companionId,
        protocol: source.success.protocol,
        manifestation: {
          tag: "embodiedOutsideBattle",
          selectedForm: input.selectedForm,
          creatureTypeOverride: resolved.success.creatureTypeOverride,
          resolvedStatBlockId: resolved.success.statBlock.id,
          hitPoints: hitPoints.success,
        },
      },
    },
  });
}

export function companionFromInput(
  companion: CharacterSheetCompanion,
): Result.Result<CharacterSheetCompanion, CharacterSheetIssue> {
  if (companion.tag === "none") {
    return Result.succeed({ tag: "none" });
  }
  const hitPointsIssue = retainedCompanionHitPointsIssue(
    companion.companion.manifestation,
  );
  if (hitPointsIssue !== null) return characterSheetIssue(hitPointsIssue);
  const protocolIssue = retainedCompanionProtocolIssue(companion.companion);
  if (protocolIssue !== null) return characterSheetIssue(protocolIssue);
  return Result.succeed(companion);
}

export function parseStoredCharacterSheetCompanion(
  value: unknown,
): Result.Result<CharacterSheetCompanion, CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue("Expected Character Sheet companion state.");
  }
  if (value.tag === "none") return Result.succeed({ tag: "none" });
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
  if (Result.isFailure(companionId)) return Result.fail(companionId.failure);
  const protocol = parseStoredRetainedCompanionProtocol(companion.protocol);
  if (Result.isFailure(protocol)) return Result.fail(protocol.failure);
  const manifestation = parseStoredRetainedCompanionManifestation(
    companion.manifestation,
  );
  if (Result.isFailure(manifestation))
    return Result.fail(manifestation.failure);
  return Result.succeed({
    tag: "retainedOneAtATime",
    companion: {
      companionId: companionId.success,
      protocol: protocol.success,
      manifestation: manifestation.success,
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
): Result.Result<CharacterSheetRetainedCompanionProtocol, CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue("Expected retained companion protocol.");
  }
  if (!isRetainedCompanionProtocolTag(value.tag)) {
    return characterSheetIssue("Expected retained companion protocol tag.");
  }
  return Result.succeed({ tag: value.tag });
}

function parseStoredRetainedCompanionManifestation(
  value: unknown,
): Result.Result<
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
  if (Result.isFailure(selectedForm)) return Result.fail(selectedForm.failure);
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
    selectedForm: selectedForm.success,
    creatureTypeOverride: value.creatureTypeOverride,
    resolvedStatBlockId: authoredStatBlockId(value.resolvedStatBlockId),
  };
  if (value.tag === "disappearedAtZeroHitPoints") {
    return Result.succeed({ tag: "disappearedAtZeroHitPoints", ...proof });
  }
  const hitPoints = parseStoredRetainedCompanionHitPoints(value.hitPoints);
  return Result.isFailure(hitPoints)
    ? Result.fail(hitPoints.failure)
    : Result.succeed({
        tag: value.tag,
        ...proof,
        hitPoints: hitPoints.success,
      });
}

function parseStoredRetainedCompanionFormSelection(
  value: unknown,
): Result.Result<CharacterSheetCompanionFormSelection, CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue("Expected retained companion form selection.");
  }
  if (value.tag === "normalNamedForm") {
    return typeof value.formId === "string" && value.formId.length > 0
      ? Result.succeed({ tag: "normalNamedForm", formId: value.formId })
      : characterSheetIssue("Retained companion normal form requires form id.");
  }
  if (value.tag === "challengeRatingZeroBeast") {
    return typeof value.statBlockId === "string" && value.statBlockId.length > 0
      ? Result.succeed({
          tag: "challengeRatingZeroBeast",
          statBlockId: authoredStatBlockId(value.statBlockId),
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
      : Result.succeed({
          tag: "pactOfTheChainSpecialForm",
          formId: specialForm.formId,
        });
  }
  return characterSheetIssue("Expected retained companion form selection.");
}

function parseStoredRetainedCompanionHitPoints(
  value: unknown,
): Result.Result<
  CharacterSheetRetainedCompanionHitPoints,
  CharacterSheetIssue
> {
  if (!isRecord(value)) {
    return characterSheetIssue("Expected retained companion hit points.");
  }
  const currentHp = parseHp(value.currentHp);
  /* v8 ignore next -- @preserve -- Malformed stored companion state: current HP must parse as a nonnegative HP value at this raw boundary. */
  if (Result.isFailure(currentHp)) return Result.fail(currentHp.failure);
  const positiveCurrentHp =
    parseCharacterSheetRetainedCompanionCurrentHitPoints(currentHp.success);
  /* v8 ignore start -- @preserve -- Malformed stored companion state: retained companions require positive current HP. */
  if (Result.isFailure(positiveCurrentHp))
    return Result.fail(positiveCurrentHp.failure);
  /* v8 ignore stop -- @preserve */
  const tempHp = parseHp(value.tempHp);
  /* v8 ignore next -- @preserve -- Malformed stored companion state: temporary HP must parse as a nonnegative HP value at this raw boundary. */
  return Result.isFailure(tempHp)
    ? Result.fail(tempHp.failure)
    : Result.succeed({
        currentHp: positiveCurrentHp.success,
        tempHp: tempHp.success,
      });
}

function retainedCompanionCreationSource(
  input: CharacterSheetRetainedCompanionCreationInput,
): Result.Result<RetainedCompanionCreationSourceFacts, CharacterSheetIssue> {
  const source = input.source;
  if (source.tag === "spellSlotSpellCast") {
    const spell = retainedCompanionPreparedSpell({
      sheet: input.sheet,
      unitLibrary: input.unitLibrary,
      spellId: source.spellId,
    });
    if (Result.isFailure(spell)) return Result.fail(spell.failure);
    if (source.spellLevel < spell.success.mechanics.level) {
      return characterSheetIssue(
        "Retained companion spell-slot source requires a slot at least as high as the selected spell level.",
      );
    }
    const eligibility = spawnedCompanionFormEligibilityForSpell(spell.success);
    return eligibility === null
      ? characterSheetIssue(
          "Retained companion spell-slot source must provide familiar form eligibility.",
        )
      : Result.succeed({
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
    /* v8 ignore next -- @preserve -- Malformed retained companion request: a ritual source must pass the spell-access invocation boundary that admitted it. */
    if (Result.isFailure(invocation)) return Result.fail(invocation.failure);
    const spell = requiredSpellSource(
      input.unitLibrary,
      invocation.success.spellId,
    );
    /* v8 ignore next -- @preserve -- Malformed support catalog: the admitted retained-companion ritual spell id must resolve to its Spell Unit. */
    if (Result.isFailure(spell)) return Result.fail(spell.failure);
    const eligibility = spawnedCompanionFormEligibilityForSpell(spell.success);
    return eligibility === null
      ? characterSheetIssue(
          "Retained companion ritual source must provide familiar form eligibility.",
        )
      : Result.succeed({
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
    if (Result.isFailure(spell)) return Result.fail(spell.failure);
    const eligibility = pactOfTheChainSpawnedCompanionFormEligibilityForSpell(
      spell.success,
    );
    return eligibility === null
      ? characterSheetIssue(
          "Retained companion invocation source must provide familiar form catalog references.",
        )
      : Result.succeed({
          tag: "pactFamiliarLike",
          eligibility,
          protocol: pactFamiliarLikeProtocol(),
          spend: { tag: "none" },
        });
  }

  const feature = retainedCompanionSpellCastFeature({ ...input, source });
  if (Result.isFailure(feature)) return Result.fail(feature.failure);
  const spendIssue = retainedCompanionFeatureSpendIssue({
    feature: feature.success,
    spend: source.spend,
  });
  if (spendIssue !== null) return characterSheetIssue(spendIssue);
  const spell = requiredSpellSource(
    input.unitLibrary,
    authoredUnitId(feature.success.mechanics.spellId),
  );
  /* v8 ignore next -- @preserve -- Malformed support catalog: the admitted retained-companion feature spell id must resolve to its Spell Unit. */
  if (Result.isFailure(spell)) return Result.fail(spell.failure);
  const eligibility = spawnedCompanionFormEligibilityForSpell(spell.success);
  return eligibility === null
    ? characterSheetIssue(
        "Retained companion class-feature spell source must provide familiar form eligibility.",
      )
    : Result.succeed({
        tag: "ownerLongRestExpiringFamiliarLike",
        eligibility,
        protocol: ownerLongRestExpiringFamiliarLikeProtocol(),
        fixedCreatureTypeOverrideChoiceId:
          feature.success.mechanics.spellModeOverride.optionId,
        spend: source.spend,
      });
}

function retainedCompanionPreparedSpell(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
}): Result.Result<CharacterSheetSpellSource, CharacterSheetIssue> {
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
  return requiredSpellSource(input.unitLibrary, input.spellId);
}

function retainedCompanionInvocationSpell(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
}): Result.Result<CharacterSheetSpellSource, CharacterSheetIssue> {
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
  return requiredSpellSource(input.unitLibrary, input.spellId);
}

type RetainedCompanionSpellCastFeature = CharacterSheetClassFeatureFacts & {
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
): Result.Result<RetainedCompanionSpellCastFeature, CharacterSheetIssue> {
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
  const projection = projectCharacterSheetClassFeature(unit.value);
  if (
    Option.isNone(projection) ||
    !isSupportedRetainedCompanionSpellCastFeature(projection.value)
  ) {
    return characterSheetIssue(
      "Retained companion class-feature spell source must match the supported familiar-like spell-cast profile.",
    );
  }
  return Result.succeed(projection.value);
}

function isSupportedRetainedCompanionSpellCastFeature(
  facts: CharacterSheetClassFeatureFacts,
): facts is RetainedCompanionSpellCastFeature {
  return (
    facts.className === "druid" &&
    facts.mechanics.family === "druid_wild_companion_spell_cast" &&
    facts.mechanics.spellId === "find_familiar" &&
    facts.mechanics.activationCost.kind === "standard_action" &&
    facts.mechanics.activationCost.action === "magic" &&
    facts.mechanics.componentOverride.material === "not_required" &&
    facts.mechanics.spellModeOverride.kind ===
      "fixed_creature_type_mode_option" &&
    facts.mechanics.spellModeOverride.optionId === "fey"
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
    | SpawnedCompanionFormSelection
    | PactOfTheChainSpawnedCompanionFormSelection;
  readonly statBlockCatalog: CharacterSheetRetainedCompanionCreationInput["statBlockCatalog"];
  readonly creatureTypeOverrideChoiceId:
    | SpawnedCompanionCreatureTypeOverrideChoice["optionId"]
    | undefined;
}): Result.Result<
  {
    readonly statBlock: StatBlockRecord;
    readonly creatureTypeOverride: SpawnedCompanionCreatureTypeOverride;
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
      ? resolvePactOfTheChainSpawnedCompanionForm({
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
        : resolveSpawnedCompanionForm({
            catalog: input.statBlockCatalog,
            eligibility: input.source.eligibility,
            selection: input.selectedForm,
            creatureTypeOverrideChoiceId,
          });
  return resolved.tag === "issue"
    ? characterSheetIssue(resolved.message)
    : Result.succeed(resolved.form);
}

function spendRetainedCompanionCreationSourceCost(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly source: RetainedCompanionCreationSourceFacts;
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  if (input.source.spend.tag === "spellSlot") {
    return spendCharacterSheetSpellSlot({
      sheet: input.sheet,
      spellLevel: input.source.spend.spellLevel,
      spellSlotSource: undefined,
    });
  }
  if (input.source.tag !== "ownerLongRestExpiringFamiliarLike") {
    return Result.succeed(input.sheet);
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
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: retained-companion spending reuses the resource projection admitted for this sheet. */
  if (Result.isFailure(resources)) return Result.fail(resources.failure);
  const resource = resources.success.find(
    (
      candidate,
    ): candidate is Extract<
      CharacterSheetResourceState,
      { readonly tag: "useCountResource" }
    > =>
      candidate.tag === "useCountResource" &&
      candidate.unitId === input.resourceUnitId,
  );
  /* v8 ignore start -- @preserve -- Malformed retained companion request: a use-count spend must name the admitted resource selected with its feature source. */
  if (resource === undefined) {
    return characterSheetIssue(
      "Retained companion class-feature spend requires the selected use-count resource.",
    );
  }
  /* v8 ignore stop -- @preserve */
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
  return Result.succeed({
    ...input.sheet,
    resourceExpenditures: nextExpenditures,
  });
}

function retainedCompanionRecastHitPoints(input: {
  readonly statBlock: StatBlockRecord;
  readonly manifestation: CharacterSheetRetainedCompanionManifestation;
}): Result.Result<
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
  const carriedCurrentHp =
    parseCharacterSheetRetainedCompanionCurrentHitPoints(clampedCurrentHp);
  if (Result.isFailure(carriedCurrentHp)) {
    return Result.fail(carriedCurrentHp.failure);
  }
  return Result.succeed({
    currentHp: carriedCurrentHp.success,
    tempHp: input.manifestation.hitPoints.tempHp,
  });
}

function retainedCompanionCreationHitPoints(input: {
  readonly statBlock: StatBlockRecord;
}): Result.Result<
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
  return Result.succeed({
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

function requiredSpellSource(
  unitLibrary: UnitCatalog,
  spellId: UnitRecord["id"],
): Result.Result<CharacterSheetSpellSource, CharacterSheetIssue> {
  const unit = unitLibrary.getUnit(spellId);
  if (Option.isNone(unit)) {
    return characterSheetIssue(`Unknown Spell Unit id: ${spellId}`);
  }
  const spell = projectCharacterSheetSpellSource(unit.value);
  return Option.isSome(spell)
    ? Result.succeed(spell.value)
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

export function parseCharacterSheetRetainedCompanionCurrentHitPoints(
  hp: HpType,
): Result.Result<
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
  return Result.succeed(hp as CharacterSheetRetainedCompanionCurrentHitPoints);
}

function isCharacterSheetCompanionCreatureTypeOverride(
  value: unknown,
): value is CharacterSheetCompanionCreatureTypeOverride {
  return isSpawnedCompanionCreatureTypeOverride(value);
}
