// KERNEL-COVERAGE: runtime-owner SHEET.FEATURE_RESOURCES.TRANSITIONS
// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_ACCESS.FREE_CAST_LIFECYCLE
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-point-pool-resource
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-spell-free-cast-resource
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.metamagic-battle-resource-bridge
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.monk-uncanny-metabolism-initiative-recovery
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.sorcerous-restoration-sorcery-point-recovery
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.ranger-tireless
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  characterBuildFeatureUnitIds,
  characterBuildMonkUncannyMetabolismFacts,
  characterBuildMonksFocusFacts,
  characterBuildResources,
  classLevelForUnit,
  classLevelLinearValueAtClassLevel,
  computeTotalLevel,
  isClassLevelLinearPerLevel,
  isClassLevelThresholdTiers,
  progressionClassUnitIds,
  SORCERER_FONT_OF_MAGIC_UNIT_ID,
  thresholdTierValueAtClassLevel,
  type CharacterBuild,
  type CharacterBuildResource,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import { abilityScoreToMod } from "@dnd/shared-algebras/ability-score-algebra";
import {
  Hp,
  DieRollResult,
  characterLevel,
  difficultyClass,
  resourceCount,
  type ResourceCount,
} from "@dnd/shared/types";
import {
  type ChargePoolResource,
  type RestResetCadence,
  type SorcererSorcerousRestorationMechanics,
  type UnitRecord,
} from "@dnd/surface/surface/types";
import { Result, Match, Option } from "effect";

import { characterSheetProficiencyBonusForCharacterLevel } from "./ability-checks.ts";
import { recoverCharacterSheetHitPoints } from "./hit-points.ts";
import {
  SORCEROUS_RESTORATION_REST_FEATURE_TAG,
  UNCANNY_METABOLISM_REST_FEATURE_TAG,
  characterSheetIssue,
  getRequiredUnit,
  isCharacterSheetPointPoolResourceUnitId,
  isCharacterSheetUseCountResourceUnitId,
  type CharacterSheet,
  type CharacterSheetSpellAccessFreeCastKey,
  type CharacterSheetSpellAccessFreeCastResource,
  type CharacterSheetInput,
  type CharacterSheetIssue,
  type CharacterSheetLayOnHandsResource,
  type CharacterSheetMonkUncannyMetabolismInitiativeInput,
  type CharacterSheetMonkUncannyMetabolismUseState,
  type CharacterSheetMonksFocusSaveDc,
  type CharacterSheetPointPoolResource,
  type CharacterSheetPointPoolResourceUnitId,
  type CharacterSheetResourceExpenditure,
  type CharacterSheetResourceState,
  type CharacterSheetSorcerousRestorationInput,
  type CharacterSheetSorceryPointPoolResourceState,
  type CharacterSheetUseCountResource,
} from "./sheet-types.ts";
import { characterSheetSpellAccessesForBuild } from "./class-feature-spells.ts";

const byKind = Match.discriminator("kind");

type TirelessTemporaryHitPointsProfile = {
  readonly resource: Extract<
    CharacterSheetResourceState,
    { readonly tag: "useCountResource" }
  >;
  readonly ability: "wis";
  readonly dieSize: number;
};

export function characterSheetResources(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
): Result.Result<readonly CharacterSheetResourceState[], CharacterSheetIssue> {
  const resources: CharacterSheetResourceState[] = [];
  const layOnHandsResource = layOnHandsResourceForBuild(
    sheet.build,
    unitLibrary,
  );
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: Lay On Hands projection receives feature ids already admitted from this Unit catalog. */
  if (Result.isFailure(layOnHandsResource))
    return Result.fail(layOnHandsResource.failure);
  /* v8 ignore stop -- @preserve */
  if (layOnHandsResource.success !== null) {
    const count = characterSheetResourceCapacity({
      build: sheet.build,
      unitLibrary,
      resource: layOnHandsResource.success,
    });
    /* v8 ignore next -- @preserve -- An admitted Lay On Hands resource must have a build-derived capacity. */
    if (Result.isFailure(count)) return Result.fail(count.failure);
    resources.push({
      ...layOnHandsResource.success,
      tag: "layOnHandsHealingPool",
      count: count.success,
      expended:
        sheet.resourceExpenditures.find(
          (expenditure) => expenditure.tag === "layOnHandsHealingPool",
        )?.expended ?? resourceCount(0),
    });
  }

  const freeCastResources = spellAccessFreeCastResourcesForBuild(
    sheet.build,
    unitLibrary,
  );
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: feature ids admitted into the build must still resolve to their free-cast resource profiles. */
  if (Result.isFailure(freeCastResources)) {
    return Result.fail(freeCastResources.failure);
  }
  /* v8 ignore stop -- @preserve */
  for (const freeCastResource of freeCastResources.success) {
    resources.push({
      ...freeCastResource,
      expended:
        sheet.resourceExpenditures.find(
          (expenditure) =>
            expenditure.tag === "spellAccessFreeCast" &&
            expenditure.sourceUnitId === freeCastResource.sourceUnitId &&
            expenditure.spellId === freeCastResource.spellId,
        )?.expended ?? resourceCount(0),
    });
  }

  const useCountResources = classFeatureUseCountResourcesForBuild(
    sheet.build,
    unitLibrary,
  );
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: feature ids admitted into the build must still resolve to their use-count resource profiles. */
  if (Result.isFailure(useCountResources)) {
    return Result.fail(useCountResources.failure);
  }
  /* v8 ignore stop -- @preserve */
  for (const useCountResource of useCountResources.success) {
    const count = characterSheetResourceCapacity({
      build: sheet.build,
      unitLibrary,
      resource: useCountResource,
    });
    /* v8 ignore next -- @preserve -- An admitted use-count resource must have a build-derived capacity. */
    if (Result.isFailure(count)) return Result.fail(count.failure);
    resources.push({
      ...useCountResource,
      tag: "useCountResource",
      count: count.success,
      expended:
        sheet.resourceExpenditures.find(
          (expenditure) =>
            expenditure.tag === "useCountResource" &&
            expenditure.unitId === useCountResource.unitId,
        )?.expended ?? resourceCount(0),
    });
  }

  const pointPoolResources = classFeaturePointPoolResourcesForBuild(
    sheet.build,
    unitLibrary,
  );
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: feature ids admitted into the build must still resolve to their point-pool resource profiles. */
  if (Result.isFailure(pointPoolResources)) {
    return Result.fail(pointPoolResources.failure);
  }
  /* v8 ignore stop -- @preserve */
  for (const pointPoolResource of pointPoolResources.success) {
    const count = characterSheetResourceCapacity({
      build: sheet.build,
      unitLibrary,
      resource: pointPoolResource,
    });
    /* v8 ignore next -- @preserve -- An admitted point-pool resource must have a build-derived capacity. */
    if (Result.isFailure(count)) return Result.fail(count.failure);
    resources.push({
      ...pointPoolResource,
      tag: "pointPoolResource",
      count: count.success,
      expended:
        sheet.resourceExpenditures.find(
          (expenditure) =>
            expenditure.tag === "pointPoolResource" &&
            expenditure.unitId === pointPoolResource.unitId,
        )?.expended ?? resourceCount(0),
    });
  }

  return Result.succeed(resources);
}

export function characterSheetMonksFocusSaveDc(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
): Result.Result<
  CharacterSheetMonksFocusSaveDc | undefined,
  CharacterSheetIssue
> {
  const facts = characterBuildMonksFocusFacts({
    build: sheet.build,
    unitLibrary,
  });
  /* v8 ignore next -- @preserve -- Monk focus fact rejection is malformed build/catalog correlation. */
  if (Result.isFailure(facts))
    return characterSheetIssue(facts.failure.message);
  if (facts.success === undefined) return Result.succeed(undefined);

  return Result.succeed({
    unitId: facts.success.unitId,
    dc: difficultyClass(
      facts.success.saveDc.base +
        abilityScoreToMod(
          sheet.build.abilityScores[facts.success.saveDc.ability],
        ) +
        characterSheetProficiencyBonusForCharacterLevel(
          characterLevel(computeTotalLevel(sheet.build.progression)),
        ),
    ),
  });
}

export function characterSheetMonkUncannyMetabolismUseState(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
): Result.Result<
  CharacterSheetMonkUncannyMetabolismUseState | undefined,
  CharacterSheetIssue
> {
  const facts = characterBuildMonkUncannyMetabolismFacts({
    build: sheet.build,
    unitLibrary,
  });
  /* v8 ignore next -- @preserve -- Uncanny Metabolism fact rejection is malformed build/catalog correlation. */
  if (Result.isFailure(facts))
    return characterSheetIssue(facts.failure.message);
  if (facts.success === undefined) return Result.succeed(undefined);

  return Result.succeed({
    ...facts.success,
    usedSinceLongRest: sheet.restFeatureUses.some(
      (use) => use.tag === UNCANNY_METABOLISM_REST_FEATURE_TAG,
    ),
  });
}

export function useMonkUncannyMetabolismWhenRollingInitiative(
  input: CharacterSheetMonkUncannyMetabolismInitiativeInput,
): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const useState = characterSheetMonkUncannyMetabolismUseState(
    input.sheet,
    input.unitLibrary,
  );
  /* v8 ignore next -- @preserve -- Use-state rejection is malformed Uncanny Metabolism build/resource correlation. */
  if (Result.isFailure(useState)) return Result.fail(useState.failure);
  /* v8 ignore start -- @preserve -- Malformed action input: Uncanny Metabolism was requested by a build without the admitted feature. */
  if (useState.success === undefined) {
    return characterSheetIssue(
      "Uncanny Metabolism requires the Monk Uncanny Metabolism feature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (useState.success.usedSinceLongRest) {
    return characterSheetIssue(
      "Uncanny Metabolism cannot be used again until a Long Rest.",
    );
  }

  const roll = Number(input.martialArtsRoll);
  const dieSize = useState.success.healing.martialArtsDie.dieSize;
  if (roll < 1 || roll > dieSize) {
    return characterSheetIssue(
      `Uncanny Metabolism Martial Arts die roll must be within d${dieSize}.`,
    );
  }

  const healing = useState.success.healing.monkLevelBonus + roll;
  const healed = recoverCharacterSheetHitPoints({
    sheet: input.sheet,
    unitLibrary: input.unitLibrary,
    healing: Hp(healing),
    overflow: { tag: "capAtMaximum" },
    deadCharacterMessage:
      "Uncanny Metabolism cannot restore HP to a dead character.",
  });
  /* v8 ignore next -- @preserve -- Healing rejection is malformed Uncanny Metabolism HP-state input. */
  if (Result.isFailure(healed)) return Result.fail(healed.failure);

  return Result.succeed({
    ...healed.success,
    restFeatureUses: [
      ...healed.success.restFeatureUses,
      {
        tag: UNCANNY_METABOLISM_REST_FEATURE_TAG,
        usedSinceLongRest: true,
      },
    ],
    resourceExpenditures: replaceUseCountResourceExpenditure({
      expenditures: healed.success.resourceExpenditures,
      unitId: useState.success.focusRecovery.resourceUnitId,
      expended: resourceCount(0),
    }),
  });
}

export function useRangerTirelessTemporaryHitPoints(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly tirelessRoll: DieRollResult;
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Malformed Tireless input: Temporary Hit Points were requested for an unconscious character. */
  if (input.sheet.hitPoints.tag === "zero") {
    return characterSheetIssue(
      "Tireless Temporary Hit Points require a conscious character.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  /* v8 ignore next -- @preserve -- Tireless resource rejection is malformed build/resource correlation. */
  if (Result.isFailure(resources)) return Result.fail(resources.failure);
  const profile = tirelessTemporaryHitPointsProfile(
    resources.success,
    input.unitLibrary,
  );
  /* v8 ignore next -- @preserve -- Tireless profile rejection is unsupported authored feature data. */
  if (Result.isFailure(profile)) return Result.fail(profile.failure);
  /* v8 ignore start -- @preserve -- Malformed Tireless input: the build lacks the admitted Ranger Tireless feature. */
  if (profile.success === undefined) {
    return characterSheetIssue(
      "Tireless requires the Ranger Tireless feature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const { resource } = profile.success;
  /* v8 ignore start -- @preserve -- Malformed Tireless input: the feature has no remaining use to spend. */
  if (resource.expended + resourceCount(1) > resource.count) {
    return characterSheetIssue("Tireless has no remaining uses.");
  }
  /* v8 ignore stop -- @preserve */
  const roll = Number(input.tirelessRoll);
  if (roll < 1 || roll > profile.success.dieSize) {
    return characterSheetIssue(
      `Tireless roll must be within d${profile.success.dieSize}.`,
    );
  }
  const abilityModifier = abilityScoreToMod(
    input.sheet.build.abilityScores[profile.success.ability],
  );
  const grantedTemporaryHitPoints = Hp(Math.max(1, roll + abilityModifier));
  return Result.succeed({
    ...input.sheet,
    hitPoints: {
      ...input.sheet.hitPoints,
      tempHp:
        input.sheet.hitPoints.tempHp > grantedTemporaryHitPoints
          ? input.sheet.hitPoints.tempHp
          : grantedTemporaryHitPoints,
    },
    resourceExpenditures: replaceUseCountResourceExpenditure({
      expenditures: input.sheet.resourceExpenditures,
      unitId: resource.unitId,
      expended: resourceCount(resource.expended + resourceCount(1)),
    }),
  });
}

function tirelessTemporaryHitPointsProfile(
  resources: readonly CharacterSheetResourceState[],
  unitLibrary: UnitCatalog,
): Result.Result<
  TirelessTemporaryHitPointsProfile | undefined,
  CharacterSheetIssue
> {
  const matches: TirelessTemporaryHitPointsProfile[] = [];
  for (const resource of resources) {
    if (resource.tag !== "useCountResource") continue;
    const unit = getRequiredUnit(unitLibrary, resource.unitId);
    /* v8 ignore next -- @preserve -- An admitted Lay On Hands resource id must resolve in the same Unit catalog. */
    if (Result.isFailure(unit)) return Result.fail(unit.failure);
    /* v8 ignore start -- @preserve -- Nonmatching use-count resources are outside the exact Tireless temporary-HP feature profile, not alternate Tireless outcomes. */
    if (
      unit.success.kind !== "class_feature" ||
      unit.success.mechanics.family !== "activation"
    ) {
      continue;
    }
    /* v8 ignore stop -- @preserve */
    const mechanics = unit.success.mechanics;
    const [phase, ...extraPhases] = mechanics.phases;
    /* v8 ignore start -- @preserve -- Unsupported authored Tireless data: admission requires the exact action, Wisdom-capacity, Long-Rest, single-self-phase shell. */
    if (
      mechanics.activationCost.kind !== "standard_action" ||
      mechanics.activationCost.action !== "magic" ||
      mechanics.resource?.kind !== "use_count" ||
      mechanics.resource.cap.kind !== "ability_modifier" ||
      mechanics.resource.cap.ability !== "wis" ||
      mechanics.resource.cap.minimum !== 1 ||
      mechanics.resetCadence?.kind !== "long_rest" ||
      phase?.kind !== "direct" ||
      phase.attachment.kind !== "self" ||
      extraPhases.length > 0
    ) {
      continue;
    }
    /* v8 ignore stop -- @preserve */
    /* v8 ignore next -- @preserve -- Unsupported authored Tireless data: the admitted direct phase requires an explicit effect list. */
    const [effect, ...extraEffects] = phase.effects ?? [];
    /* v8 ignore start -- @preserve -- Unsupported authored Tireless data: admission requires one d8-plus-Wisdom temporary-HP effect and no extra effects. */
    if (
      effect?.kind !== "grant_temp_hp" ||
      effect.amount.kind !== "fixed" ||
      effect.amount.expr.dice !== 1 ||
      effect.amount.expr.dieSize !== 8 ||
      effect.amount.expr.abilityModifier !== "wis" ||
      extraEffects.length > 0
    ) {
      continue;
    }
    /* v8 ignore stop -- @preserve */
    matches.push({
      resource,
      ability: effect.amount.expr.abilityModifier,
      dieSize: effect.amount.expr.dieSize,
    });
  }
  /* v8 ignore start -- @preserve -- Malformed admitted build: more than one matching Tireless Temporary Hit Point profile survived support admission. */
  if (matches.length > 1) {
    return characterSheetIssue(
      "Tireless Temporary Hit Points requires one matching feature profile.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const [profile] = matches;
  return Result.succeed(profile);
}

export function resourceExpendituresFromInput(
  input: Pick<
    CharacterSheetInput,
    "build" | "resourceExpenditures" | "unitLibrary"
  >,
): Result.Result<
  readonly CharacterSheetResourceExpenditure[],
  CharacterSheetIssue
> {
  const expenditures = input.resourceExpenditures ?? [];
  const layOnHandsResource = layOnHandsResourceForBuild(
    input.build,
    input.unitLibrary,
  );
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: the retained Lay On Hands resource cannot be projected from its installed feature Unit. */
  if (Result.isFailure(layOnHandsResource)) {
    return Result.fail(layOnHandsResource.failure);
  }
  /* v8 ignore stop -- @preserve */
  const freeCastResources = spellAccessFreeCastResourcesForBuild(
    input.build,
    input.unitLibrary,
  );
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: a retained free-cast resource cannot be projected from its installed feature Unit. */
  if (Result.isFailure(freeCastResources)) {
    return Result.fail(freeCastResources.failure);
  }
  /* v8 ignore stop -- @preserve */
  const useCountResources = classFeatureUseCountResourcesForBuild(
    input.build,
    input.unitLibrary,
  );
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: a retained use-count resource cannot be projected from its installed feature Unit. */
  if (Result.isFailure(useCountResources)) {
    return Result.fail(useCountResources.failure);
  }
  /* v8 ignore stop -- @preserve */
  const pointPoolResources = classFeaturePointPoolResourcesForBuild(
    input.build,
    input.unitLibrary,
  );
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: a retained point-pool resource cannot be projected from its installed feature Unit. */
  if (Result.isFailure(pointPoolResources)) {
    return Result.fail(pointPoolResources.failure);
  }
  /* v8 ignore stop -- @preserve */
  const seen: CharacterSheetResourceExpenditure[] = [];
  const result: CharacterSheetResourceExpenditure[] = [];
  for (const expenditure of expenditures) {
    /* v8 ignore start -- @preserve -- Malformed stored sheet: resource expenditure state duplicates the same resource identity. */
    if (
      seen.some((existing) =>
        characterSheetResourceExpendituresMatch(existing, expenditure),
      )
    ) {
      return characterSheetIssue(
        "Character Sheet resource expenditure state must not duplicate.",
      );
    }
    /* v8 ignore stop -- @preserve */
    seen.push(expenditure);
    const count = characterSheetResourceExpenditureCapacity({
      build: input.build,
      unitLibrary: input.unitLibrary,
      layOnHandsResource: layOnHandsResource.success,
      freeCastResources: freeCastResources.success,
      useCountResources: useCountResources.success,
      pointPoolResources: pointPoolResources.success,
      expenditure,
    });
    /* v8 ignore next -- @preserve -- Malformed retained resource state: every expenditure must name a resource admitted from the same build and Unit catalog. */
    if (Result.isFailure(count)) return Result.fail(count.failure);
    if (
      !Number.isInteger(expenditure.expended) ||
      expenditure.expended < 0 ||
      expenditure.expended > count.success
    ) {
      return characterSheetIssue(
        "Character Sheet resource expenditure cannot exceed build resource capacity.",
      );
    }
    if (expenditure.expended > 0) {
      result.push(
        characterSheetResourceExpenditureWithExpended(
          expenditure,
          resourceCount(expenditure.expended),
        ),
      );
    }
  }
  return Result.succeed(result);
}

export function recoverShortRestUseCountResources(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: Short Rest recovery reuses the resource projection admitted for this sheet. */
  if (Result.isFailure(resources)) return Result.fail(resources.failure);
  let resourceExpenditures = [...input.sheet.resourceExpenditures];
  for (const resource of resources.success) {
    if (resource.tag !== "useCountResource") continue;
    const expended = shortRestUseCountExpendedAfterRecovery(resource);
    resourceExpenditures = replaceUseCountResourceExpenditure({
      expenditures: resourceExpenditures,
      unitId: resource.unitId,
      expended,
    });
  }
  return Result.succeed({ ...input.sheet, resourceExpenditures });
}

export function replacePointPoolResourceExpenditure(input: {
  readonly expenditures: readonly CharacterSheetResourceExpenditure[];
  readonly unitId: CharacterSheetPointPoolResourceUnitId;
  readonly expended: ResourceCount;
}): CharacterSheetResourceExpenditure[] {
  const next = input.expenditures.filter(
    (expenditure) =>
      expenditure.tag !== "pointPoolResource" ||
      expenditure.unitId !== input.unitId,
  );
  if (input.expended > resourceCount(0)) {
    next.push({
      tag: "pointPoolResource",
      unitId: input.unitId,
      expended: input.expended,
    });
  }
  return next;
}

type CharacterSheetClassFeatureRecord = Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
>;
type CharacterSheetSorcerousRestorationFeature =
  CharacterSheetClassFeatureRecord & {
    readonly className: "sorcerer";
    readonly mechanics: SorcererSorcerousRestorationMechanics;
  };
export type CharacterSheetSorcerousRestorationProfile = {
  readonly feature: CharacterSheetSorcerousRestorationFeature;
  readonly ownerClassLevel: number;
};

function characterSheetResourceExpenditureCapacity(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly layOnHandsResource: CharacterSheetLayOnHandsResource | null;
  readonly freeCastResources: readonly CharacterSheetSpellAccessFreeCastResource[];
  readonly useCountResources: readonly CharacterSheetUseCountResource[];
  readonly pointPoolResources: readonly CharacterSheetPointPoolResource[];
  readonly expenditure: CharacterSheetResourceExpenditure;
}): Result.Result<ResourceCount, CharacterSheetIssue> {
  if (input.expenditure.tag === "layOnHandsHealingPool") {
    /* v8 ignore start -- @preserve -- Malformed stored sheet: Lay On Hands expenditure exists without its admitted healing-pool resource. */
    if (input.layOnHandsResource === null) {
      return characterSheetIssue(
        "Lay On Hands healing pool expenditure requires the Paladin Lay On Hands feature.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return characterSheetResourceCapacity({
      build: input.build,
      unitLibrary: input.unitLibrary,
      resource: input.layOnHandsResource,
    });
  }
  if (input.expenditure.tag === "useCountResource") {
    const unitId = input.expenditure.unitId;
    const useCountResource = input.useCountResources.find(
      (resource) => resource.unitId === unitId,
    );
    /* v8 ignore start -- @preserve -- Malformed stored sheet: a use-count expenditure names no retained use-count resource. */
    if (useCountResource === undefined) {
      return characterSheetIssue(
        "Class feature use-count expenditure requires the matching class feature.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return characterSheetResourceCapacity({
      build: input.build,
      unitLibrary: input.unitLibrary,
      resource: useCountResource,
    });
  }
  if (input.expenditure.tag === "pointPoolResource") {
    const unitId = input.expenditure.unitId;
    const pointPoolResource = input.pointPoolResources.find(
      (resource) => resource.unitId === unitId,
    );
    /* v8 ignore start -- @preserve -- Malformed stored sheet: a point-pool expenditure names no retained point-pool resource. */
    if (pointPoolResource === undefined) {
      return characterSheetIssue(
        "Class feature point-pool expenditure requires the matching class feature.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return characterSheetResourceCapacity({
      build: input.build,
      unitLibrary: input.unitLibrary,
      resource: pointPoolResource,
    });
  }
  if (input.expenditure.tag !== "spellAccessFreeCast") {
    return characterSheetIssue(
      "Expected Character Sheet resource expenditure.",
    );
  }
  return characterSheetSpellAccessFreeCastExpenditureCapacity({
    freeCastResources: input.freeCastResources,
    expenditure: input.expenditure,
  });
}

function characterSheetSpellAccessFreeCastExpenditureCapacity(input: {
  readonly freeCastResources: readonly CharacterSheetSpellAccessFreeCastResource[];
  readonly expenditure: Extract<
    CharacterSheetResourceExpenditure,
    { readonly tag: "spellAccessFreeCast" }
  >;
}): Result.Result<ResourceCount, CharacterSheetIssue> {
  const freeCastResource = input.freeCastResources.find(
    (resource) =>
      resource.sourceUnitId === input.expenditure.sourceUnitId &&
      resource.spellId === input.expenditure.spellId,
  );
  /* v8 ignore start -- @preserve -- Malformed stored sheet: a free-cast expenditure tag names no retained class-feature resource. */
  if (freeCastResource === undefined) {
    return characterSheetIssue(
      "Spell Access free-cast expenditure requires matching Spell Access.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed(freeCastResource.count);
}

function characterSheetResourceExpenditureWithExpended(
  expenditure: CharacterSheetResourceExpenditure,
  expended: ResourceCount,
): CharacterSheetResourceExpenditure {
  if (expenditure.tag === "useCountResource") {
    return { tag: expenditure.tag, unitId: expenditure.unitId, expended };
  }
  if (expenditure.tag === "pointPoolResource") {
    return { tag: expenditure.tag, unitId: expenditure.unitId, expended };
  }
  if (expenditure.tag === "spellAccessFreeCast") {
    return {
      tag: expenditure.tag,
      sourceUnitId: expenditure.sourceUnitId,
      spellId: expenditure.spellId,
      expended,
    };
  }
  return { tag: expenditure.tag, expended };
}

/* v8 ignore start -- @preserve -- This equality helper is reached only while rejecting duplicate malformed resource-expenditure entries. */
function characterSheetResourceExpendituresMatch(
  first: CharacterSheetResourceExpenditure,
  second: CharacterSheetResourceExpenditure,
): boolean {
  if (first.tag !== second.tag) return false;
  if (first.tag === "useCountResource" && second.tag === "useCountResource") {
    return first.unitId === second.unitId;
  }
  if (first.tag === "pointPoolResource" && second.tag === "pointPoolResource") {
    return first.unitId === second.unitId;
  }
  if (
    first.tag === "spellAccessFreeCast" &&
    second.tag === "spellAccessFreeCast"
  ) {
    return characterSheetFreeCastExpendituresMatch(first, second);
  }
  return true;
}
/* v8 ignore stop -- @preserve */

function characterSheetFreeCastExpendituresMatch(
  first: Extract<
    CharacterSheetResourceExpenditure,
    { readonly tag: "spellAccessFreeCast" }
  >,
  second: Extract<
    CharacterSheetResourceExpenditure,
    { readonly tag: "spellAccessFreeCast" }
  >,
): boolean {
  return (
    first.sourceUnitId === second.sourceUnitId &&
    first.spellId === second.spellId
  );
}

function layOnHandsResourceForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<CharacterSheetLayOnHandsResource | null, CharacterSheetIssue> {
  for (const resource of characterBuildResources(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, resource.unitId);
    /* v8 ignore next -- @preserve -- An admitted use-count resource id must resolve in the same Unit catalog. */
    if (Result.isFailure(unit)) return Result.fail(unit.failure);
    const layOnHandsResource = layOnHandsHealingPoolResourceForUnit(
      unit.success,
    );
    if (layOnHandsResource !== null) {
      return Result.succeed({
        unitId: resource.unitId,
        resource: layOnHandsResource,
      });
    }
  }
  return Result.succeed(null);
}

function layOnHandsHealingPoolResourceForUnit(
  unit: UnitRecord,
): ChargePoolResource | null {
  if (unit.kind !== "class_feature" || unit.className !== "paladin") {
    return null;
  }
  const mechanics = unit.mechanics;
  /* v8 ignore start -- @preserve -- Unsupported authored Lay On Hands data: the admitted Paladin feature must retain its exact bonus-action Long-Rest charge-pool profile. */
  if (
    mechanics.family !== "activation" ||
    mechanics.activationCost?.kind !== "bonus_action" ||
    mechanics.resetCadence?.kind !== "long_rest" ||
    mechanics.resource?.kind !== "charge_pool" ||
    mechanics.resource.cap.kind !== "linear_per_level" ||
    mechanics.resource.cap.axis !== "class" ||
    mechanics.resource.cap.base !== 5 ||
    mechanics.resource.cap.perLevel !== 5 ||
    mechanics.resource.cap.startingAtLevel !== 1
  ) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Unsupported authored Lay On Hands data: V8 maps absent direct effects and a missing pool-driven heal to this expression, while admission requires both. */
  const healsFromSpentPool = mechanics.phases.some(
    (phase) =>
      phase.kind === "direct" &&
      (phase.effects?.some(
        (effect) =>
          effect.kind === "heal_hp" &&
          effect.amount.kind === "resource_spent" &&
          effect.target === "target_creature",
      ) ??
        false),
  );
  return healsFromSpentPool ? mechanics.resource : null;
  /* v8 ignore stop -- @preserve */
}

function spellAccessFreeCastResourcesForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<
  readonly CharacterSheetSpellAccessFreeCastResource[],
  CharacterSheetIssue
> {
  const resources: CharacterSheetSpellAccessFreeCastResource[] = [];
  for (const featureUnitId of characterBuildFeatureUnitIds(
    build,
    unitLibrary,
  )) {
    const unit = unitLibrary.getUnit(featureUnitId);
    /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: every feature id returned from this admitted build must resolve in the same catalog. */
    if (Option.isNone(unit)) continue;
    for (const resource of classFeatureSpellFreeCastResourcesForUnit(
      unit.value,
    )) {
      resources.push({ sourceUnitId: featureUnitId, ...resource });
    }
  }
  for (const access of characterSheetSpellAccessesForBuild({
    build,
    unitLibrary,
  })) {
    if (
      access.source === "magicInitiate" &&
      access.preparation === "alwaysPrepared"
    ) {
      resources.push({
        tag: "spellAccessFreeCast",
        sourceUnitId: access.sourceUnitId,
        spellId: access.spellId,
        count: resourceCount(1),
      });
    }
  }
  return Result.succeed(resources);
}

function classFeatureSpellFreeCastResourcesForUnit(
  unit: UnitRecord,
): readonly Pick<
  CharacterSheetSpellAccessFreeCastResource,
  "tag" | "spellId" | "count"
>[] {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    return [];
  }
  const preparedSpellIds = new Set(
    unit.mechanics.grants.flatMap((grant) =>
      grant.kind === "grant_spell_access" && grant.mode === "prepared"
        ? [grant.spellId]
        : [],
    ),
  );
  return unit.mechanics.grants.flatMap(
    (
      grant,
    ): readonly Pick<
      CharacterSheetSpellAccessFreeCastResource,
      "tag" | "spellId" | "count"
    >[] =>
      grant.kind === "grant_spell_free_casts" &&
      typeof grant.count === "number" &&
      grant.resetCadence === "long_rest" &&
      preparedSpellIds.has(grant.spellId)
        ? [
            {
              tag: "spellAccessFreeCast",
              spellId: authoredUnitId(grant.spellId),
              count: resourceCount(grant.count),
            },
          ]
        : [],
  );
}

export function spendCharacterSheetSpellAccessFreeCast(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly resource: CharacterSheetSpellAccessFreeCastKey;
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const resources = spellAccessFreeCastResourcesForBuild(
    input.sheet.build,
    input.unitLibrary,
  );
  if (Result.isFailure(resources)) return Result.fail(resources.failure);
  const resource = resources.success.find(
    (candidate) =>
      candidate.sourceUnitId === input.resource.sourceUnitId &&
      candidate.spellId === input.resource.spellId,
  );
  if (resource === undefined) {
    return characterSheetIssue(
      "Spell Access free cast requires matching Spell Access.",
    );
  }
  const existing = input.sheet.resourceExpenditures.find(
    (expenditure) =>
      expenditure.tag === "spellAccessFreeCast" &&
      expenditure.sourceUnitId === resource.sourceUnitId &&
      expenditure.spellId === resource.spellId,
  );
  const expended = existing?.expended ?? resourceCount(0);
  if (expended >= resource.count) {
    return characterSheetIssue("Spell Access free cast is exhausted.");
  }
  const resourceExpenditures = input.sheet.resourceExpenditures.filter(
    (expenditure) =>
      expenditure.tag !== "spellAccessFreeCast" ||
      expenditure.sourceUnitId !== resource.sourceUnitId ||
      expenditure.spellId !== resource.spellId,
  );
  resourceExpenditures.push({
    tag: "spellAccessFreeCast",
    sourceUnitId: resource.sourceUnitId,
    spellId: resource.spellId,
    expended: resourceCount(Number(expended) + 1),
  });
  return Result.succeed({ ...input.sheet, resourceExpenditures });
}

function classFeatureUseCountResourcesForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<
  readonly CharacterSheetUseCountResource[],
  CharacterSheetIssue
> {
  const resources: CharacterSheetUseCountResource[] = [];
  for (const resource of characterBuildResources(build, unitLibrary)) {
    if (!isCharacterSheetUseCountResourceUnitId(resource.unitId)) continue;
    const unit = getRequiredUnit(unitLibrary, resource.unitId);
    /* v8 ignore next -- @preserve -- An admitted point-pool resource id must resolve in the same Unit catalog. */
    if (Result.isFailure(unit)) return Result.fail(unit.failure);
    const resetCadence = restResetCadenceForUseCountResourceUnit(unit.success);
    /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: an admitted use-count resource lacks its installed rest-reset feature shape. */
    if (resource.resource.kind !== "use_count" || resetCadence === undefined) {
      return characterSheetIssue(
        "Class feature use-count resource requires an installed rest-reset class feature.",
      );
    }
    /* v8 ignore stop -- @preserve */
    resources.push({
      unitId: resource.unitId,
      resource: resource.resource,
      resetCadence,
    });
  }
  return Result.succeed(resources);
}

function classFeaturePointPoolResourcesForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<
  readonly CharacterSheetPointPoolResource[],
  CharacterSheetIssue
> {
  const resources: CharacterSheetPointPoolResource[] = [];
  for (const resource of characterBuildResources(build, unitLibrary)) {
    if (!isCharacterSheetPointPoolResourceUnitId(resource.unitId)) continue;
    const unit = getRequiredUnit(unitLibrary, resource.unitId);
    /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: every admitted point-pool resource id must resolve in the same Unit catalog. */
    if (Result.isFailure(unit)) return Result.fail(unit.failure);
    const resetCadence = restResetCadenceForClassFeatureResourceUnit(
      unit.success,
    );
    /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: an admitted point-pool resource lacks its installed Long-Rest reset feature shape. */
    if (
      resource.resource.kind !== "point_pool" ||
      resetCadence?.kind !== "long_rest"
    ) {
      return characterSheetIssue(
        "Class feature point-pool resource requires an installed Long Rest reset class feature.",
      );
    }
    /* v8 ignore stop -- @preserve */
    resources.push({
      unitId: resource.unitId,
      resource: resource.resource,
      resetCadence,
    });
  }
  return Result.succeed(resources);
}

export function recoverSorceryPointsWithSorcerousRestoration(
  input: CharacterSheetSorcerousRestorationInput,
): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const profile = sorcerousRestorationProfileForBuild(
    input.sheet.build,
    input.unitLibrary,
  );
  /* v8 ignore next -- @preserve -- Sorcerous Restoration profile rejection is malformed build/catalog correlation. */
  if (Result.isFailure(profile)) return Result.fail(profile.failure);
  if (
    input.sheet.restFeatureUses.some(
      (use) => use.tag === SORCEROUS_RESTORATION_REST_FEATURE_TAG,
    )
  ) {
    return characterSheetIssue(
      "Sorcerous Restoration cannot be used again until a Long Rest.",
    );
  }
  /* v8 ignore start -- @preserve -- Malformed Sorcerous Restoration input: requested recovery is zero. */
  if (input.recoverSorceryPoints < resourceCount(1)) {
    return characterSheetIssue(
      "Sorcerous Restoration must recover expended Sorcery Points.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  /* v8 ignore next -- @preserve -- Sorcery Point projection rejection is malformed build/resource correlation. */
  if (Result.isFailure(resources)) return Result.fail(resources.failure);
  const sorceryPointResourceUnitId =
    profile.success.feature.mechanics.resource.resourceUnitId;
  const sorceryPoints = resources.success.find(
    (resource): resource is CharacterSheetSorceryPointPoolResourceState =>
      resource.tag === "pointPoolResource" &&
      resource.unitId === sorceryPointResourceUnitId,
  );
  /* v8 ignore start -- @preserve -- Malformed build/resource correlation: Sorcerous Restoration lacks the admitted Sorcery Point pool. */
  if (sorceryPoints === undefined) {
    return characterSheetIssue(
      "Sorcerous Restoration requires the Font of Magic Sorcery Point pool.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed Sorcerous Restoration input: the pool has no expenditure or recovery exceeds current expenditure. */
  if (sorceryPoints.expended < resourceCount(1)) {
    return characterSheetIssue(
      "Sorcerous Restoration must recover expended Sorcery Points.",
    );
  }
  if (input.recoverSorceryPoints > sorceryPoints.expended) {
    return characterSheetIssue(
      "Sorcerous Restoration cannot recover more Sorcery Points than are expended.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const recoveryCap = sorcerousRestorationRecoveryCap(profile.success);
  if (input.recoverSorceryPoints > recoveryCap) {
    return characterSheetIssue(
      "Sorcerous Restoration cannot recover more than half Sorcerer level rounded down.",
    );
  }
  return Result.succeed({
    ...input.sheet,
    resourceExpenditures: replacePointPoolResourceExpenditure({
      expenditures: input.sheet.resourceExpenditures,
      unitId: authoredUnitId(sorceryPointResourceUnitId),
      expended: resourceCount(
        sorceryPoints.expended - input.recoverSorceryPoints,
      ),
    }),
    restFeatureUses: [
      ...input.sheet.restFeatureUses,
      {
        tag: SORCEROUS_RESTORATION_REST_FEATURE_TAG,
        usedSinceLongRest: true,
      },
    ],
  });
}

export function sorcerousRestorationProfileForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<
  CharacterSheetSorcerousRestorationProfile,
  CharacterSheetIssue
> {
  const profiles: CharacterSheetSorcerousRestorationProfile[] = [];
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, unitId);
    /* v8 ignore next -- @preserve -- A build-owned Sorcerous Restoration feature id must resolve in the same Unit catalog. */
    if (Result.isFailure(unit)) return Result.fail(unit.failure);
    if (!isSorcerousRestorationFeature(unit.success)) continue;
    const ownerClassLevel = classFeatureOwnerLevel(
      { build, unitLibrary },
      unit.success,
    );
    /* v8 ignore start -- @preserve -- Malformed admitted build: Sorcerous Restoration feature ownership requires its correlated Sorcerer class in progression. */
    if (Result.isFailure(ownerClassLevel))
      return Result.fail(ownerClassLevel.failure);
    /* v8 ignore stop -- @preserve */
    profiles.push({
      feature: unit.success,
      ownerClassLevel: ownerClassLevel.success,
    });
  }
  if (profiles.length === 0) {
    return characterSheetIssue(
      "Sorcerous Restoration requires the Sorcerer level 5 feature.",
    );
  }
  /* v8 ignore start -- @preserve -- Malformed admitted build: more than one Sorcerous Restoration feature survived support admission. */
  if (profiles.length > 1) {
    return characterSheetIssue(
      "Character Sheet supports only one Sorcerous Restoration feature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const profile = profiles[0];
  /* v8 ignore start -- @preserve -- The nonempty profile check above makes an absent first Sorcerous Restoration profile impossible. */
  if (profile === undefined) {
    return characterSheetIssue(
      "Sorcerous Restoration requires the Sorcerer level 5 feature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed(profile);
}

function isSorcerousRestorationFeature(
  unit: UnitRecord,
): unit is CharacterSheetSorcerousRestorationFeature {
  return (
    unit.kind === "class_feature" &&
    unit.className === "sorcerer" &&
    unit.mechanics.family === "sorcery_point_short_rest_recovery" &&
    unit.mechanics.recoveryTrigger === "short_rest" &&
    unit.mechanics.resource.kind === "point_pool" &&
    unit.mechanics.resource.resourceUnitId === SORCERER_FONT_OF_MAGIC_UNIT_ID &&
    unit.mechanics.recoveryCap.kind === "half_class_level_rounded_down" &&
    unit.mechanics.resetCadence.kind === "long_rest"
  );
}

function sorcerousRestorationRecoveryCap(
  profile: CharacterSheetSorcerousRestorationProfile,
): ResourceCount {
  return Match.value(profile.feature.mechanics.recoveryCap.kind).pipe(
    Match.when("half_class_level_rounded_down", () =>
      resourceCount(Math.floor(profile.ownerClassLevel / 2)),
    ),
    Match.exhaustive,
  );
}

function restResetCadenceForUseCountResourceUnit(
  unit: UnitRecord,
): RestResetCadence | undefined {
  return restResetCadenceForClassFeatureResourceUnit(unit);
}

function restResetCadenceForClassFeatureResourceUnit(
  unit: UnitRecord,
): RestResetCadence | undefined {
  /* v8 ignore next -- @preserve -- Unsupported authored resource data: this projector is called only for admitted class-feature resource Units. */
  if (unit.kind !== "class_feature") return undefined;
  const mechanics = unit.mechanics;
  /* v8 ignore start -- @preserve -- Malformed admitted resource Unit: its class-feature mechanics omit a reset cadence or carry a cadence outside the closed rest roster. */
  if (!("resetCadence" in mechanics) || mechanics.resetCadence === undefined) {
    return undefined;
  }
  return isRestResetCadence(mechanics.resetCadence)
    ? mechanics.resetCadence
    : undefined;
  /* v8 ignore stop -- @preserve */
}

function isRestResetCadence(
  resetCadence: RestResetCadence | { readonly kind: string },
): resetCadence is RestResetCadence {
  return (
    resetCadence.kind === "short_or_long_rest" ||
    resetCadence.kind === "long_rest" ||
    resetCadence.kind === "short_rest" ||
    resetCadence.kind === "partial_short_full_long"
  );
}

type CharacterSheetResourceCapacityInput = {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly resource: CharacterBuildResource;
};

function characterSheetResourceCapacity(
  input: CharacterSheetResourceCapacityInput,
): Result.Result<ResourceCount, CharacterSheetIssue> {
  const unit = getRequiredUnit(input.unitLibrary, input.resource.unitId);
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: every admitted build resource id must resolve in the same Unit catalog. */
  if (Result.isFailure(unit)) return Result.fail(unit.failure);
  const cap = input.resource.resource.cap;
  if (cap.kind === "fixed") return Result.succeed(resourceCount(cap.uses));
  if (cap.kind === "linear_per_level") {
    /* v8 ignore start -- @preserve -- Malformed admitted resource: class-level linear scaling uses the wrong axis or belongs to a non-feature Unit. */
    if (!isClassLevelLinearPerLevel(cap)) {
      return characterSheetIssue(
        "Character Sheet resource level scaling must use class level.",
      );
    }
    if (unit.success.kind !== "class_feature") {
      return characterSheetIssue(
        "Class-level resource scaling requires a class feature Unit.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const level = classFeatureOwnerLevel(input, unit.success);
    /* v8 ignore next -- @preserve -- Malformed admitted build: a class-scaled resource feature requires its owning class in progression. */
    if (Result.isFailure(level)) return Result.fail(level.failure);
    return Result.succeed(
      resourceCount(classLevelLinearValueAtClassLevel(cap, level.success)),
    );
  }
  if (cap.kind === "threshold_tiers") {
    /* v8 ignore start -- @preserve -- Malformed admitted resource: threshold scaling uses the wrong axis or belongs to a non-feature Unit. */
    if (!isClassLevelThresholdTiers(cap)) {
      return characterSheetIssue(
        "Character Sheet resource threshold scaling must use class level.",
      );
    }
    if (unit.success.kind !== "class_feature") {
      return characterSheetIssue(
        "Class-level resource threshold scaling requires a class feature Unit.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const level = classFeatureOwnerLevel(input, unit.success);
    /* v8 ignore next -- @preserve -- Malformed admitted build: a threshold-scaled resource feature requires its owning class in progression. */
    if (Result.isFailure(level)) return Result.fail(level.failure);
    return Result.succeed(
      resourceCount(thresholdTierValueAtClassLevel(cap, level.success)),
    );
  }
  if (cap.kind === "proficiency_bonus") {
    return Result.succeed(
      resourceCount(
        characterSheetProficiencyBonusForCharacterLevel(
          characterLevel(input.build.progression.advancements.length + 1),
        ),
      ),
    );
  }
  /* v8 ignore start -- @preserve -- Internal exhaustiveness invariant: V8 maps an unknown capacity-kind edge to this final conditional, but CharacterBuildResource kinds are closed and handled here. */
  if (cap.kind === "ability_modifier") {
    return Result.succeed(
      resourceCount(
        Math.max(
          cap.minimum ?? 0,
          abilityScoreToMod(input.build.abilityScores[cap.ability]),
        ),
      ),
    );
  }
  return characterSheetIssue(
    "Character Sheet resource capacity is not supported by this runtime.",
  );
  /* v8 ignore stop -- @preserve */
}

function classFeatureOwnerLevel(
  input: Pick<CharacterSheetResourceCapacityInput, "build" | "unitLibrary">,
  feature: CharacterSheetClassFeatureRecord,
): Result.Result<number, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Malformed admitted build: V8 maps the exhausted-scan edge to this loop, but an admitted class-feature resource's owning class must occur in progression. */
  for (const classId of progressionClassUnitIds(input.build.progression)) {
    const classUnit = getRequiredUnit(input.unitLibrary, classId);
    /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: every class id admitted into progression must resolve in the same Unit catalog. */
    if (Result.isFailure(classUnit)) return Result.fail(classUnit.failure);
    if (
      classUnit.success.kind === "class" &&
      classUnit.success.className === feature.className
    ) {
      return Result.succeed(
        classLevelForUnit(input.build.progression, classId),
      );
    }
  }
  return characterSheetIssue(
    "Class-feature resource requires the owning class in progression.",
  );
  /* v8 ignore stop -- @preserve */
}

function shortRestUseCountExpendedAfterRecovery(
  resource: Extract<
    CharacterSheetResourceState,
    { readonly tag: "useCountResource" }
  >,
): ResourceCount {
  return Match.value(resource.resetCadence).pipe(
    byKind("short_or_long_rest", () => resourceCount(0)),
    byKind("short_rest", () => resourceCount(0)),
    byKind("long_rest", () => resource.expended),
    byKind("partial_short_full_long", (cadence) =>
      resourceCount(Math.max(0, resource.expended - cadence.shortRestRefill)),
    ),
    Match.exhaustive,
  );
}

function replaceUseCountResourceExpenditure(input: {
  readonly expenditures: readonly CharacterSheetResourceExpenditure[];
  readonly unitId: UnitRecord["id"];
  readonly expended: ResourceCount;
}): CharacterSheetResourceExpenditure[] {
  const next = input.expenditures.filter(
    (expenditure) =>
      expenditure.tag !== "useCountResource" ||
      expenditure.unitId !== input.unitId,
  );
  if (input.expended > resourceCount(0)) {
    next.push({
      tag: "useCountResource",
      unitId: input.unitId,
      expended: input.expended,
    });
  }
  return next;
}
