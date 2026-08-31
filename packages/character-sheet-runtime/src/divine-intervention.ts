// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.cleric-divine-intervention-session-invocation
import {
  characterBuildFeatureUnitIds,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import { resourceCount, type ResourceCount } from "@dnd/shared/types";
import {
  allCantripsFromClassSpellList,
  classSpellListPreparedSpellLevel,
} from "@dnd/surface/surface/unit-catalog-core";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Result, Option } from "effect";

import {
  projectCharacterSheetClassFeature,
  type CharacterSheetClassFeatureFacts,
} from "./character-feature-projection.ts";
import {
  projectCharacterSheetSpellSource,
  type CharacterSheetSpellSource,
} from "./character-spell-projection.ts";
import { characterSheetTopLevelSpellCastingTime } from "./spell-profile-shape.ts";
import { characterSheetResources } from "./resources.ts";
import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetDivineInterventionInvocation,
  type CharacterSheetDivineInterventionResult,
  type CharacterSheetIssue,
  type CharacterSheetResourceState,
  type CharacterSheetResourceExpenditure,
} from "./sheet-types.ts";

type DivineInterventionFeature = CharacterSheetClassFeatureFacts & {
  readonly unitId: UnitRecord["id"];
  readonly className: "cleric";
  readonly acquiredAtLevel: 10;
  readonly mechanics: {
    readonly family: "activation";
    readonly activationCost: {
      readonly kind: "standard_action";
      readonly action: "magic";
    };
    readonly resource: {
      readonly kind: "use_count";
      readonly cap: { readonly kind: "fixed"; readonly uses: 1 };
    };
    readonly resetCadence: { readonly kind: "long_rest" };
  };
};

type DivineInterventionResource = {
  readonly unitId: UnitRecord["id"];
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

export function castDivineIntervention(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
}): Result.Result<CharacterSheetDivineInterventionResult, CharacterSheetIssue> {
  const feature = divineInterventionFeatureForSheet(input);
  /* v8 ignore next -- @preserve -- Unsupported invocation input: this operation is admitted only for a retained Divine Intervention feature profile. */
  if (Result.isFailure(feature)) return Result.fail(feature.failure);

  const resource = divineInterventionResource({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    featureUnitId: feature.success.unitId,
  });
  /* v8 ignore next -- @preserve -- Malformed retained support state: Divine Intervention admission correlates its feature with one projected use-count resource. */
  if (Result.isFailure(resource)) return Result.fail(resource.failure);
  if (resource.success.expended >= resource.success.count) {
    return characterSheetIssue(
      "Divine Intervention cannot be used again until a Long Rest.",
    );
  }

  const spell = getRequiredUnit(input.unitLibrary, input.spellId);
  /* v8 ignore next -- @preserve -- Malformed selection/catalog correlation: the selected Divine Intervention spell id comes from this admitted Unit catalog. */
  if (Result.isFailure(spell)) return Result.fail(spell.failure);
  /* v8 ignore start -- @preserve -- A spell id selected from Divine Intervention's admitted catalog must resolve to a Spell Unit. */
  const spellSource = projectCharacterSheetSpellSource(spell.success);
  if (Option.isNone(spellSource)) {
    return characterSheetIssue("Divine Intervention requires a Spell record.");
  }
  /* v8 ignore stop -- @preserve */

  const invocation = divineInterventionInvocationFromSpell({
    spell: spellSource.value,
    featureUnitId: feature.success.unitId,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore next -- @preserve -- Unsupported authored data: Divine Intervention selection narrows to the supported Cleric spell invocation profile before projection. */
  if (Result.isFailure(invocation)) return Result.fail(invocation.failure);

  return Result.succeed({
    sheet: {
      ...input.sheet,
      resourceExpenditures: replaceDivineInterventionExpenditure({
        expenditures: input.sheet.resourceExpenditures,
        unitId: feature.success.unitId,
        expended: resourceCount(resource.success.expended + 1),
      }),
    },
    invocation: invocation.success,
  });
}

function divineInterventionFeatureForSheet(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<DivineInterventionFeature, CharacterSheetIssue> {
  for (const featureUnitId of characterBuildFeatureUnitIds(
    input.sheet.build,
    input.unitLibrary,
  )) {
    const unit = input.unitLibrary.getUnit(featureUnitId);
    if (Option.isNone(unit)) continue;
    const projection = projectCharacterSheetClassFeature(unit.value);
    if (
      Option.isSome(projection) &&
      isDivineInterventionFeature(projection.value)
    ) {
      return Result.succeed({
        unitId: unit.value.id,
        ...projection.value,
      });
    }
  }
  return characterSheetIssue(
    "Divine Intervention requires the Cleric Divine Intervention feature.",
  );
}

function divineInterventionResource(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly featureUnitId: UnitRecord["id"];
}): Result.Result<DivineInterventionResource, CharacterSheetIssue> {
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: resource projection can fail only when retained admitted Units no longer resolve. */
  if (Result.isFailure(resources)) return Result.fail(resources.failure);
  const resource = resources.success.find(
    (
      candidate,
    ): candidate is Extract<
      CharacterSheetResourceState,
      { readonly tag: "useCountResource" }
    > =>
      candidate.tag === "useCountResource" &&
      candidate.unitId === input.featureUnitId,
  );
  /* v8 ignore start -- @preserve -- Divine Intervention feature ownership and its Long Rest use-count resource are correlated by resource projection. */
  if (resource === undefined) {
    return characterSheetIssue(
      "Divine Intervention requires the supported Long Rest use-count resource.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
    unitId: resource.unitId,
    count: resource.count,
    expended: resource.expended,
  });
}

function divineInterventionInvocationFromSpell(input: {
  readonly spell: CharacterSheetSpellSource;
  readonly featureUnitId: UnitRecord["id"];
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  CharacterSheetDivineInterventionInvocation,
  CharacterSheetIssue
> {
  if (
    !isClericSpellAtSupportedDivineInterventionLevel(
      input.spell,
      input.unitLibrary,
    )
  ) {
    return characterSheetIssue(
      "Divine Intervention requires a Cleric spell of level 5 or lower.",
    );
  }
  const castingTime = characterSheetTopLevelSpellCastingTime(
    input.spell.mechanics,
  );
  if (castingTime?.kind !== "action") {
    return characterSheetIssue(
      "Divine Intervention session handoff supports action-time Cleric spells.",
    );
  }
  return Result.succeed({
    tag: "divineIntervention",
    spellId: input.spell.unitId,
    spellLevel: input.spell.mechanics.level,
    featureUnitId: input.featureUnitId,
    spellList: "cleric",
    activationAction: "magic",
    spellSlotCost: { kind: "none" },
    materialComponentRequirement: {
      kind: "not_required_by_feature",
      suppressesSpellMaterialComponents: true,
    },
    preparationRequirement: "not_required",
    requiredSpellAccess: "class_spell_list",
    castingTime: { kind: "action" },
  });
}

function isClericSpellAtSupportedDivineInterventionLevel(
  spell: CharacterSheetSpellSource,
  unitLibrary: UnitCatalog,
): boolean {
  /* v8 ignore start -- @preserve -- Spells above level 5 are outside Divine Intervention's narrowed selectable spell contract. */
  if (spell.mechanics.level > 5) {
    return false;
  }
  /* v8 ignore stop -- @preserve */
  if (spell.mechanics.level === 0) {
    return allCantripsFromClassSpellList({
      className: "cleric",
      spellIds: [spell.unitId],
      unitLibrary,
    });
  }
  return (
    classSpellListPreparedSpellLevel({
      className: "cleric",
      spellId: spell.unitId,
      unitLibrary,
    }) === spell.mechanics.level
  );
}

function isDivineInterventionFeature(
  facts: CharacterSheetClassFeatureFacts,
): facts is Omit<DivineInterventionFeature, "unitId"> {
  if (facts.className !== "cleric" || facts.acquiredAtLevel !== 10) {
    return false;
  }
  const mechanics = facts.mechanics;
  return (
    mechanics.family === "activation" &&
    "activationCost" in mechanics &&
    mechanics.activationCost.kind === "standard_action" &&
    mechanics.activationCost.action === "magic" &&
    "resource" in mechanics &&
    mechanics.resource?.kind === "use_count" &&
    mechanics.resource.cap.kind === "fixed" &&
    mechanics.resource.cap.uses === 1 &&
    "resetCadence" in mechanics &&
    mechanics.resetCadence?.kind === "long_rest"
  );
}

function replaceDivineInterventionExpenditure(input: {
  readonly expenditures: readonly CharacterSheetResourceExpenditure[];
  readonly unitId: UnitRecord["id"];
  readonly expended: ResourceCount;
}): CharacterSheetResourceExpenditure[] {
  const next = input.expenditures.filter(
    (expenditure) =>
      expenditure.tag !== "useCountResource" ||
      expenditure.unitId !== input.unitId,
  );
  /* v8 ignore start -- @preserve -- Internal workflow invariant: Divine Intervention calls this helper only after incrementing its positive use-count expenditure by one. */
  if (input.expended > resourceCount(0)) {
    next.push({
      tag: "useCountResource",
      unitId: input.unitId,
      expended: input.expended,
    });
  }
  /* v8 ignore stop -- @preserve */
  return next;
}
