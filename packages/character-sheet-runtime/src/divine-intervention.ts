// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.cleric-divine-intervention-session-invocation
import {
  characterBuildFeatureUnitIds,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import { resourceCount, type ResourceCount } from "@dnd/shared/types";
import {
  allCantripsFromClassSpellList,
  classSpellListPreparedSpellLevel,
} from "@dnd/surface/surface/unit-catalog";
import {
  topLevelSpellCastingTime,
  type SpellRecord,
  type UnitRecord,
} from "@dnd/surface/surface/types";
import { Either, Option } from "effect";

import { characterSheetResources } from "./resources.ts";
import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetDivineInterventionInvocation,
  type CharacterSheetDivineInterventionResult,
  type CharacterSheetIssue,
  type CharacterSheetResourceExpenditure,
} from "./sheet-types.ts";

type DivineInterventionFeature = Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> & {
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
}): Either.Either<CharacterSheetDivineInterventionResult, CharacterSheetIssue> {
  const feature = divineInterventionFeatureForSheet(input);
  /* v8 ignore next -- Unsupported invocation input: this operation is admitted only for a retained Divine Intervention feature profile. */
  if (Either.isLeft(feature)) return Either.left(feature.left);

  const resource = divineInterventionResource({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    featureUnitId: feature.right.id,
  });
  /* v8 ignore next -- Malformed retained support state: Divine Intervention admission correlates its feature with one projected use-count resource. */
  if (Either.isLeft(resource)) return Either.left(resource.left);
  if (resource.right.expended >= resource.right.count) {
    return characterSheetIssue(
      "Divine Intervention cannot be used again until a Long Rest.",
    );
  }

  const spell = getRequiredUnit(input.unitLibrary, input.spellId);
  /* v8 ignore next -- Malformed selection/catalog correlation: the selected Divine Intervention spell id comes from this admitted Unit catalog. */
  if (Either.isLeft(spell)) return Either.left(spell.left);
  /* v8 ignore start -- A spell id selected from Divine Intervention's admitted catalog must resolve to a Spell Unit. */
  if (spell.right.kind !== "spell") {
    return characterSheetIssue("Divine Intervention requires a Spell record.");
  }
  /* v8 ignore stop */

  const invocation = divineInterventionInvocationFromSpell({
    spell: spell.right,
    featureUnitId: feature.right.id,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore next -- Unsupported authored data: Divine Intervention selection narrows to the supported Cleric spell invocation profile before projection. */
  if (Either.isLeft(invocation)) return Either.left(invocation.left);

  return Either.right({
    sheet: {
      ...input.sheet,
      resourceExpenditures: replaceDivineInterventionExpenditure({
        expenditures: input.sheet.resourceExpenditures,
        unitId: feature.right.id,
        expended: resourceCount(resource.right.expended + 1),
      }),
    },
    invocation: invocation.right,
  });
}

function divineInterventionFeatureForSheet(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<DivineInterventionFeature, CharacterSheetIssue> {
  for (const featureUnitId of characterBuildFeatureUnitIds(
    input.sheet.build,
    input.unitLibrary,
  )) {
    const unit = input.unitLibrary.getUnit(featureUnitId);
    if (Option.isSome(unit) && isDivineInterventionFeature(unit.value)) {
      return Either.right(unit.value);
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
}): Either.Either<DivineInterventionResource, CharacterSheetIssue> {
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  /* v8 ignore next -- Malformed build/catalog correlation: resource projection can fail only when retained admitted Units no longer resolve. */
  if (Either.isLeft(resources)) return Either.left(resources.left);
  const resource = resources.right.find(
    (candidate) =>
      candidate.tag === "useCountResource" &&
      candidate.unitId === input.featureUnitId,
  );
  /* v8 ignore start -- Divine Intervention feature ownership and its Long Rest use-count resource are correlated by resource projection. */
  if (resource === undefined) {
    return characterSheetIssue(
      "Divine Intervention requires the supported Long Rest use-count resource.",
    );
  }
  /* v8 ignore stop */
  return Either.right({
    unitId: resource.unitId,
    count: resource.count,
    expended: resource.expended,
  });
}

function divineInterventionInvocationFromSpell(input: {
  readonly spell: SpellRecord;
  readonly featureUnitId: UnitRecord["id"];
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
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
  const castingTime = topLevelSpellCastingTime(input.spell.mechanics);
  if (castingTime?.kind !== "action") {
    return characterSheetIssue(
      "Divine Intervention session handoff supports action-time Cleric spells.",
    );
  }
  return Either.right({
    tag: "divineIntervention",
    spellId: input.spell.id,
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
  spell: SpellRecord,
  unitLibrary: UnitCatalog,
): boolean {
  /* v8 ignore start -- Spells above level 5 are outside Divine Intervention's narrowed selectable spell contract. */
  if (spell.mechanics.level > 5) {
    return false;
  }
  /* v8 ignore stop */
  if (spell.mechanics.level === 0) {
    return allCantripsFromClassSpellList({
      className: "cleric",
      spellIds: [spell.id],
      unitLibrary,
    });
  }
  return (
    classSpellListPreparedSpellLevel({
      className: "cleric",
      spellId: spell.id,
      unitLibrary,
    }) === spell.mechanics.level
  );
}

function isDivineInterventionFeature(
  unit: UnitRecord,
): unit is DivineInterventionFeature {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "cleric" ||
    unit.acquiredAtLevel !== 10
  ) {
    return false;
  }
  const mechanics = unit.mechanics;
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
  /* v8 ignore start -- Internal workflow invariant: Divine Intervention calls this helper only after incrementing its positive use-count expenditure by one. */
  if (input.expended > resourceCount(0)) {
    next.push({
      tag: "useCountResource",
      unitId: input.unitId,
      expended: input.expended,
    });
  }
  /* v8 ignore stop */
  return next;
}
