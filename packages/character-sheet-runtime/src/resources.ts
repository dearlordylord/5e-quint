// KERNEL-COVERAGE: runtime-owner SHEET.FEATURE_RESOURCES.TRANSITIONS
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-point-pool-resource
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.metamagic-battle-resource-bridge
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.monk-uncanny-metabolism-initiative-recovery
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.sorcerous-restoration-sorcery-point-recovery
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
  characterLevel,
  difficultyClass,
  resourceCount,
  type ResourceCount,
} from "@dnd/shared/types";
import {
  supportedClassFeatureSpellFreeCastGrantsForUnit,
  type ChargePoolResource,
  type RestResetCadence,
  type SorcererSorcerousRestorationMechanics,
  type UnitRecord,
} from "@dnd/surface/surface/types";
import { Either, Match, Option } from "effect";

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
  type CharacterSheetClassFeatureSpellFreeCastResource,
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

const byKind = Match.discriminator("kind");

export function characterSheetResources(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
): Either.Either<readonly CharacterSheetResourceState[], CharacterSheetIssue> {
  const resources: CharacterSheetResourceState[] = [];
  const layOnHandsResource = layOnHandsResourceForBuild(
    sheet.build,
    unitLibrary,
  );
  if (Either.isLeft(layOnHandsResource))
    return Either.left(layOnHandsResource.left);
  if (layOnHandsResource.right !== null) {
    const count = characterSheetResourceCapacity({
      build: sheet.build,
      unitLibrary,
      resource: layOnHandsResource.right,
    });
    if (Either.isLeft(count)) return Either.left(count.left);
    resources.push({
      ...layOnHandsResource.right,
      tag: "layOnHandsHealingPool",
      count: count.right,
      expended:
        sheet.resourceExpenditures.find(
          (expenditure) => expenditure.tag === "layOnHandsHealingPool",
        )?.expended ?? resourceCount(0),
    });
  }

  const freeCastResources = classFeatureSpellFreeCastResourcesForBuild(
    sheet.build,
    unitLibrary,
  );
  if (Either.isLeft(freeCastResources)) {
    return Either.left(freeCastResources.left);
  }
  for (const freeCastResource of freeCastResources.right) {
    resources.push({
      ...freeCastResource,
      expended:
        sheet.resourceExpenditures.find(
          (expenditure) => expenditure.tag === freeCastResource.tag,
        )?.expended ?? resourceCount(0),
    });
  }

  const useCountResources = classFeatureUseCountResourcesForBuild(
    sheet.build,
    unitLibrary,
  );
  if (Either.isLeft(useCountResources)) {
    return Either.left(useCountResources.left);
  }
  for (const useCountResource of useCountResources.right) {
    const count = characterSheetResourceCapacity({
      build: sheet.build,
      unitLibrary,
      resource: useCountResource,
    });
    if (Either.isLeft(count)) return Either.left(count.left);
    resources.push({
      ...useCountResource,
      tag: "useCountResource",
      count: count.right,
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
  if (Either.isLeft(pointPoolResources)) {
    return Either.left(pointPoolResources.left);
  }
  for (const pointPoolResource of pointPoolResources.right) {
    const count = characterSheetResourceCapacity({
      build: sheet.build,
      unitLibrary,
      resource: pointPoolResource,
    });
    if (Either.isLeft(count)) return Either.left(count.left);
    resources.push({
      ...pointPoolResource,
      tag: "pointPoolResource",
      count: count.right,
      expended:
        sheet.resourceExpenditures.find(
          (expenditure) =>
            expenditure.tag === "pointPoolResource" &&
            expenditure.unitId === pointPoolResource.unitId,
        )?.expended ?? resourceCount(0),
    });
  }

  return Either.right(resources);
}

export function characterSheetMonksFocusSaveDc(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
): Either.Either<
  CharacterSheetMonksFocusSaveDc | undefined,
  CharacterSheetIssue
> {
  const facts = characterBuildMonksFocusFacts({
    build: sheet.build,
    unitLibrary,
  });
  if (Either.isLeft(facts)) return characterSheetIssue(facts.left.message);
  if (facts.right === undefined) return Either.right(undefined);

  return Either.right({
    unitId: facts.right.unitId,
    dc: difficultyClass(
      facts.right.saveDc.base +
        abilityScoreToMod(
          sheet.build.abilityScores[facts.right.saveDc.ability],
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
): Either.Either<
  CharacterSheetMonkUncannyMetabolismUseState | undefined,
  CharacterSheetIssue
> {
  const facts = characterBuildMonkUncannyMetabolismFacts({
    build: sheet.build,
    unitLibrary,
  });
  if (Either.isLeft(facts)) return characterSheetIssue(facts.left.message);
  if (facts.right === undefined) return Either.right(undefined);

  return Either.right({
    ...facts.right,
    usedSinceLongRest: sheet.restFeatureUses.some(
      (use) => use.tag === UNCANNY_METABOLISM_REST_FEATURE_TAG,
    ),
  });
}

export function useMonkUncannyMetabolismWhenRollingInitiative(
  input: CharacterSheetMonkUncannyMetabolismInitiativeInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const useState = characterSheetMonkUncannyMetabolismUseState(
    input.sheet,
    input.unitLibrary,
  );
  if (Either.isLeft(useState)) return Either.left(useState.left);
  if (useState.right === undefined) {
    return characterSheetIssue(
      "Uncanny Metabolism requires the Monk Uncanny Metabolism feature.",
    );
  }
  if (useState.right.usedSinceLongRest) {
    return characterSheetIssue(
      "Uncanny Metabolism cannot be used again until a Long Rest.",
    );
  }

  const roll = Number(input.martialArtsRoll);
  const dieSize = useState.right.healing.martialArtsDie.dieSize;
  if (roll < 1 || roll > dieSize) {
    return characterSheetIssue(
      `Uncanny Metabolism Martial Arts die roll must be within d${dieSize}.`,
    );
  }

  const healing = useState.right.healing.monkLevelBonus + roll;
  const healed = recoverCharacterSheetHitPoints({
    sheet: input.sheet,
    healing: Hp(healing),
    overflow: { tag: "capAtMaximum" },
    deadCharacterMessage:
      "Uncanny Metabolism cannot restore HP to a dead character.",
  });
  if (Either.isLeft(healed)) return Either.left(healed.left);

  return Either.right({
    ...healed.right,
    restFeatureUses: [
      ...healed.right.restFeatureUses,
      {
        tag: UNCANNY_METABOLISM_REST_FEATURE_TAG,
        usedSinceLongRest: true,
      },
    ],
    resourceExpenditures: replaceUseCountResourceExpenditure({
      expenditures: healed.right.resourceExpenditures,
      unitId: useState.right.focusRecovery.resourceUnitId,
      expended: resourceCount(0),
    }),
  });
}

export function resourceExpendituresFromInput(
  input: Pick<
    CharacterSheetInput,
    "build" | "resourceExpenditures" | "unitLibrary"
  >,
): Either.Either<
  readonly CharacterSheetResourceExpenditure[],
  CharacterSheetIssue
> {
  const expenditures = input.resourceExpenditures ?? [];
  const layOnHandsResource = layOnHandsResourceForBuild(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(layOnHandsResource)) {
    return Either.left(layOnHandsResource.left);
  }
  const freeCastResources = classFeatureSpellFreeCastResourcesForBuild(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(freeCastResources)) {
    return Either.left(freeCastResources.left);
  }
  const useCountResources = classFeatureUseCountResourcesForBuild(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(useCountResources)) {
    return Either.left(useCountResources.left);
  }
  const pointPoolResources = classFeaturePointPoolResourcesForBuild(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(pointPoolResources)) {
    return Either.left(pointPoolResources.left);
  }
  const seen: CharacterSheetResourceExpenditure[] = [];
  const result: CharacterSheetResourceExpenditure[] = [];
  for (const expenditure of expenditures) {
    if (
      seen.some((existing) =>
        characterSheetResourceExpendituresMatch(existing, expenditure),
      )
    ) {
      return characterSheetIssue(
        "Character Sheet resource expenditure state must not duplicate.",
      );
    }
    seen.push(expenditure);
    const count = characterSheetResourceExpenditureCapacity({
      build: input.build,
      unitLibrary: input.unitLibrary,
      layOnHandsResource: layOnHandsResource.right,
      freeCastResources: freeCastResources.right,
      useCountResources: useCountResources.right,
      pointPoolResources: pointPoolResources.right,
      expenditure,
    });
    if (Either.isLeft(count)) return Either.left(count.left);
    if (
      !Number.isInteger(expenditure.expended) ||
      expenditure.expended < 0 ||
      expenditure.expended > count.right
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
  return Either.right(result);
}

export function recoverShortRestUseCountResources(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  if (Either.isLeft(resources)) return Either.left(resources.left);
  let resourceExpenditures = [...input.sheet.resourceExpenditures];
  for (const resource of resources.right) {
    if (resource.tag !== "useCountResource") continue;
    const expended = shortRestUseCountExpendedAfterRecovery(resource);
    resourceExpenditures = replaceUseCountResourceExpenditure({
      expenditures: resourceExpenditures,
      unitId: resource.unitId,
      expended,
    });
  }
  return Either.right({ ...input.sheet, resourceExpenditures });
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
  readonly freeCastResources: readonly CharacterSheetClassFeatureSpellFreeCastResource[];
  readonly useCountResources: readonly CharacterSheetUseCountResource[];
  readonly pointPoolResources: readonly CharacterSheetPointPoolResource[];
  readonly expenditure: CharacterSheetResourceExpenditure;
}): Either.Either<ResourceCount, CharacterSheetIssue> {
  if (input.expenditure.tag === "layOnHandsHealingPool") {
    if (input.layOnHandsResource === null) {
      return characterSheetIssue(
        "Lay On Hands healing pool expenditure requires the Paladin Lay On Hands feature.",
      );
    }
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
    if (useCountResource === undefined) {
      return characterSheetIssue(
        "Class feature use-count expenditure requires the matching class feature.",
      );
    }
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
    if (pointPoolResource === undefined) {
      return characterSheetIssue(
        "Class feature point-pool expenditure requires the matching class feature.",
      );
    }
    return characterSheetResourceCapacity({
      build: input.build,
      unitLibrary: input.unitLibrary,
      resource: pointPoolResource,
    });
  }
  const freeCastResource = input.freeCastResources.find(
    (resource) => resource.tag === input.expenditure.tag,
  );
  if (freeCastResource === undefined) {
    return characterSheetIssue(
      "Class feature spell free-cast expenditure requires the matching class feature.",
    );
  }
  return Either.right(freeCastResource.count);
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
  return { tag: expenditure.tag, expended };
}

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
  return true;
}

function layOnHandsResourceForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterSheetLayOnHandsResource | null, CharacterSheetIssue> {
  for (const resource of characterBuildResources(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, resource.unitId);
    if (Either.isLeft(unit)) return Either.left(unit.left);
    const layOnHandsResource = layOnHandsHealingPoolResourceForUnit(unit.right);
    if (layOnHandsResource !== null) {
      return Either.right({
        unitId: resource.unitId,
        resource: layOnHandsResource,
      });
    }
  }
  return Either.right(null);
}

function layOnHandsHealingPoolResourceForUnit(
  unit: UnitRecord,
): ChargePoolResource | null {
  if (unit.kind !== "class_feature" || unit.className !== "paladin") {
    return null;
  }
  const mechanics = unit.mechanics;
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
}

function classFeatureSpellFreeCastResourcesForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly CharacterSheetClassFeatureSpellFreeCastResource[],
  CharacterSheetIssue
> {
  const resources: CharacterSheetClassFeatureSpellFreeCastResource[] = [];
  for (const featureUnitId of characterBuildFeatureUnitIds(
    build,
    unitLibrary,
  )) {
    const unit = unitLibrary.getUnit(featureUnitId);
    if (Option.isNone(unit)) continue;
    const resource = classFeatureSpellFreeCastResourceForUnit(unit.value);
    if (resource !== null) {
      resources.push({ unitId: featureUnitId, ...resource });
    }
  }
  return Either.right(resources);
}

function classFeatureSpellFreeCastResourceForUnit(
  unit: UnitRecord,
): Pick<
  CharacterSheetClassFeatureSpellFreeCastResource,
  "tag" | "count"
> | null {
  const grants = supportedClassFeatureSpellFreeCastGrantsForUnit(unit);
  if (grants === null) {
    return null;
  }
  return {
    tag: grants.profile.resourceTag,
    count: resourceCount(grants.freeCastGrant.count),
  };
}

function classFeatureUseCountResourcesForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly CharacterSheetUseCountResource[],
  CharacterSheetIssue
> {
  const resources: CharacterSheetUseCountResource[] = [];
  for (const resource of characterBuildResources(build, unitLibrary)) {
    if (!isCharacterSheetUseCountResourceUnitId(resource.unitId)) continue;
    const unit = getRequiredUnit(unitLibrary, resource.unitId);
    if (Either.isLeft(unit)) return Either.left(unit.left);
    const resetCadence = restResetCadenceForUseCountResourceUnit(unit.right);
    if (resource.resource.kind !== "use_count" || resetCadence === undefined) {
      return characterSheetIssue(
        "Class feature use-count resource requires an installed rest-reset class feature.",
      );
    }
    resources.push({
      unitId: resource.unitId,
      resource: resource.resource,
      resetCadence,
    });
  }
  return Either.right(resources);
}

function classFeaturePointPoolResourcesForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly CharacterSheetPointPoolResource[],
  CharacterSheetIssue
> {
  const resources: CharacterSheetPointPoolResource[] = [];
  for (const resource of characterBuildResources(build, unitLibrary)) {
    if (!isCharacterSheetPointPoolResourceUnitId(resource.unitId)) continue;
    const unit = getRequiredUnit(unitLibrary, resource.unitId);
    if (Either.isLeft(unit)) return Either.left(unit.left);
    const resetCadence = restResetCadenceForClassFeatureResourceUnit(
      unit.right,
    );
    if (
      resource.resource.kind !== "point_pool" ||
      resetCadence?.kind !== "long_rest"
    ) {
      return characterSheetIssue(
        "Class feature point-pool resource requires an installed Long Rest reset class feature.",
      );
    }
    resources.push({
      unitId: resource.unitId,
      resource: resource.resource,
      resetCadence,
    });
  }
  return Either.right(resources);
}

export function recoverSorceryPointsWithSorcerousRestoration(
  input: CharacterSheetSorcerousRestorationInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const profile = sorcerousRestorationProfileForBuild(
    input.sheet.build,
    input.unitLibrary,
  );
  if (Either.isLeft(profile)) return Either.left(profile.left);
  if (
    input.sheet.restFeatureUses.some(
      (use) => use.tag === SORCEROUS_RESTORATION_REST_FEATURE_TAG,
    )
  ) {
    return characterSheetIssue(
      "Sorcerous Restoration cannot be used again until a Long Rest.",
    );
  }
  if (input.recoverSorceryPoints < resourceCount(1)) {
    return characterSheetIssue(
      "Sorcerous Restoration must recover expended Sorcery Points.",
    );
  }
  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  if (Either.isLeft(resources)) return Either.left(resources.left);
  const sorceryPointResourceUnitId =
    profile.right.feature.mechanics.resource.resourceUnitId;
  const sorceryPoints = resources.right.find(
    (resource): resource is CharacterSheetSorceryPointPoolResourceState =>
      resource.tag === "pointPoolResource" &&
      resource.unitId === sorceryPointResourceUnitId,
  );
  if (sorceryPoints === undefined) {
    return characterSheetIssue(
      "Sorcerous Restoration requires the Font of Magic Sorcery Point pool.",
    );
  }
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
  const recoveryCap = sorcerousRestorationRecoveryCap(profile.right);
  if (input.recoverSorceryPoints > recoveryCap) {
    return characterSheetIssue(
      "Sorcerous Restoration cannot recover more than half Sorcerer level rounded down.",
    );
  }
  return Either.right({
    ...input.sheet,
    resourceExpenditures: replacePointPoolResourceExpenditure({
      expenditures: input.sheet.resourceExpenditures,
      unitId: sorceryPointResourceUnitId,
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
): Either.Either<CharacterSheetSorcerousRestorationProfile, CharacterSheetIssue> {
  const profiles: CharacterSheetSorcerousRestorationProfile[] = [];
  for (const unitId of characterBuildFeatureUnitIds(build, unitLibrary)) {
    const unit = getRequiredUnit(unitLibrary, unitId);
    if (Either.isLeft(unit)) return Either.left(unit.left);
    if (!isSorcerousRestorationFeature(unit.right)) continue;
    const ownerClassLevel = classFeatureOwnerLevel(
      { build, unitLibrary },
      unit.right,
    );
    if (Either.isLeft(ownerClassLevel)) return Either.left(ownerClassLevel.left);
    profiles.push({
      feature: unit.right,
      ownerClassLevel: ownerClassLevel.right,
    });
  }
  if (profiles.length === 0) {
    return characterSheetIssue(
      "Sorcerous Restoration requires the Sorcerer level 5 feature.",
    );
  }
  if (profiles.length > 1) {
    return characterSheetIssue(
      "Character Sheet supports only one Sorcerous Restoration feature.",
    );
  }
  const profile = profiles[0];
  if (profile === undefined) {
    return characterSheetIssue(
      "Sorcerous Restoration requires the Sorcerer level 5 feature.",
    );
  }
  return Either.right(profile);
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
  if (unit.kind !== "class_feature") return undefined;
  const mechanics = unit.mechanics;
  if (!("resetCadence" in mechanics) || mechanics.resetCadence === undefined) {
    return undefined;
  }
  return isRestResetCadence(mechanics.resetCadence)
    ? mechanics.resetCadence
    : undefined;
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
): Either.Either<ResourceCount, CharacterSheetIssue> {
  const unit = getRequiredUnit(input.unitLibrary, input.resource.unitId);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  const cap = input.resource.resource.cap;
  if (cap.kind === "fixed") return Either.right(resourceCount(cap.uses));
  if (cap.kind === "linear_per_level") {
    if (!isClassLevelLinearPerLevel(cap)) {
      return characterSheetIssue(
        "Character Sheet resource level scaling must use class level.",
      );
    }
    if (unit.right.kind !== "class_feature") {
      return characterSheetIssue(
        "Class-level resource scaling requires a class feature Unit.",
      );
    }
    const level = classFeatureOwnerLevel(input, unit.right);
    if (Either.isLeft(level)) return Either.left(level.left);
    return Either.right(
      resourceCount(classLevelLinearValueAtClassLevel(cap, level.right)),
    );
  }
  if (cap.kind === "threshold_tiers") {
    if (!isClassLevelThresholdTiers(cap)) {
      return characterSheetIssue(
        "Character Sheet resource threshold scaling must use class level.",
      );
    }
    if (unit.right.kind !== "class_feature") {
      return characterSheetIssue(
        "Class-level resource threshold scaling requires a class feature Unit.",
      );
    }
    const level = classFeatureOwnerLevel(input, unit.right);
    if (Either.isLeft(level)) return Either.left(level.left);
    return Either.right(
      resourceCount(thresholdTierValueAtClassLevel(cap, level.right)),
    );
  }
  if (cap.kind === "proficiency_bonus") {
    return Either.right(
      resourceCount(
        characterSheetProficiencyBonusForCharacterLevel(
          characterLevel(input.build.progression.advancements.length + 1),
        ),
      ),
    );
  }
  return characterSheetIssue(
    "Character Sheet resource capacity is not supported by this runtime.",
  );
}

function classFeatureOwnerLevel(
  input: Pick<CharacterSheetResourceCapacityInput, "build" | "unitLibrary">,
  feature: CharacterSheetClassFeatureRecord,
): Either.Either<number, CharacterSheetIssue> {
  for (const classId of progressionClassUnitIds(input.build.progression)) {
    const classUnit = getRequiredUnit(input.unitLibrary, classId);
    if (Either.isLeft(classUnit)) return Either.left(classUnit.left);
    if (
      classUnit.right.kind === "class" &&
      classUnit.right.className === feature.className
    ) {
      return Either.right(classLevelForUnit(input.build.progression, classId));
    }
  }
  return characterSheetIssue(
    "Class-feature resource requires the owning class in progression.",
  );
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
