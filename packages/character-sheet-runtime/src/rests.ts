// KERNEL-COVERAGE: runtime-owner SHEET.HP_REST_HIT_DICE.TRANSITIONS
// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_ACCESS.FREE_CAST_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS
// KERNEL-COVERAGE: runtime-owner SHEET.WEAPON_MASTERY.RESELECTION SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.weapon-mastery-reselection character-sheet.weapon-mastery-class-level-reselection
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.pact-slot-recovery
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.short-rest-spell-slot-recovery
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-long-rest-use-state
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.rest-triggered-heroic-inspiration
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.sorcerous-restoration-sorcery-point-recovery
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.passive-defense-projection
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.ranger-tireless
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  characterBuildFeatureUnitIds,
  classLevelForUnit,
  progressionClassUnitIds,
  weaponMasteryChoiceProfileForFeature,
  weaponMasteryChoiceProfileForProgression,
  type CharacterBuild,
  type CharacterBuildFeature,
  type UnitCatalog,
} from "@dnd/character-creation-runtime/consumer-protocol";
import {
  Hp,
  resourceCount,
  type ReadonlyNonEmptyArray,
  type ResourceCount,
} from "@dnd/shared/types";
import {
  ELAPSED_TIME_TICKS_PER_HOUR,
  elapsedTimeTicks,
  type ElapsedTimeTicks,
} from "@dnd/shared/elapsed-time";
import type {
  RestTriggeredHeroicInspirationMechanics,
  UnitRecord,
} from "@dnd/surface/surface/types";
import {
  readClassCreationFacts,
  readSpeciesCreationFacts,
} from "@dnd/surface/surface/character-creation-readers";
import { Result, Match, Option } from "effect";

import {
  projectCharacterSheetClassFeature,
  projectCharacterSheetSpeciesTrait,
  type CharacterSheetClassFeatureFacts,
  type CharacterSheetSpeciesTraitFacts,
} from "./character-feature-projection.ts";
import { companionAfterLongRest } from "./companions.ts";
import {
  druidCircleLandAfterLongRest,
  druidWildShapeKnownFormsAfterLongRest,
} from "./druid-features.ts";
import {
  fiendishResilienceAfterLongRest,
  fiendishResilienceAfterShortRest,
} from "./passive-defenses.ts";
import {
  completeShortRestArcaneRecoveryBenefitsWithOwner,
  completeShortRestBenefits,
} from "./healing-rest-benefit.ts";
import {
  characterSheetCurrentHp,
  characterSheetHitPointMaximum,
  characterSheetHitPoints,
} from "./hit-points.ts";
import {
  CHARACTER_SHEET_LONG_REST_BASE_TICKS,
  CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
  CHARACTER_SHEET_SHORT_REST_TICKS,
  ARCANE_RECOVERY_REST_FEATURE_TAG,
  CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
  MAGICAL_CUNNING_REST_FEATURE_TAG,
  characterSheetIssue,
  characterSheetLongRestCompletionBrand,
  characterSheetLongRestStartBrand,
  characterSheetShortRestCompletionBrand,
  characterSheetShortRestStartBrand,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetExhaustionLevel,
  type CharacterSheetHeroicInspiration,
  type CharacterSheetIssue,
  type CharacterSheetArcaneRecoveryRestRouteResult,
  type CharacterSheetLongRestCalendarGate,
  type CharacterSheetLongRestCompletion,
  type CharacterSheetLongRestCompletionInput,
  type CharacterSheetLongRestInput,
  type CharacterSheetLongRestInterruption,
  type CharacterSheetLongRestInterruptionInput,
  type CharacterSheetLongRestInterruptionOutcome,
  type CharacterSheetLongRestStart,
  type CharacterSheetLongRestStartInput,
  type CharacterSheetLongRestStartTiming,
  type CharacterSheetMagicalCunningInput,
  type CharacterSheetPactSlotState,
  type CharacterSheetRouteEvent,
  type CharacterSheetShortRestCompletion,
  type CharacterSheetShortRestCompletionInput,
  type CharacterSheetShortRestInput,
  type CharacterSheetShortRestInterruptionInput,
  type CharacterSheetShortRestInterruptionOutcome,
  type CharacterSheetShortRestStart,
  type CharacterSheetShortRestStartInput,
  type CharacterSheetWeaponMasteryReselection,
  type CharacterSheetWeaponMasteryReselectionAcceptedRoute,
  type CharacterSheetWeaponMasteryReselectionRejectedRoute,
  type CharacterSheetWeaponMasteryReselectionRouteResult,
} from "./sheet-types.ts";
import {
  characterSheetPactSlots,
  isCharacterSheetWithSpellSlots,
} from "./spell-slots.ts";

type PactSlotRecoveryMechanics = Extract<
  CharacterSheetClassFeatureFacts["mechanics"],
  { readonly family: "pact_slot_recovery" }
>;
type CharacterSheetPactSlotRecoveryFeature = CharacterSheetClassFeatureFacts & {
  readonly mechanics: PactSlotRecoveryMechanics;
};
type CharacterSheetPactSlotRecoveryProfile = {
  readonly feature: CharacterSheetPactSlotRecoveryFeature;
  readonly classUnitId: UnitRecord["id"];
};
type CharacterSheetRestTriggeredHeroicInspirationFeature =
  CharacterSheetSpeciesTraitFacts & {
    readonly mechanics: RestTriggeredHeroicInspirationMechanics;
  };

const RANGER_TIRELESS_UNIT_ID = "ranger_tireless" as const;

export function startShortRest(
  input: CharacterSheetShortRestStartInput,
): Result.Result<CharacterSheetShortRestStart, CharacterSheetIssue> {
  if (characterSheetCurrentHp(input.sheet) < Hp(1)) {
    return characterSheetIssue(
      "Short Rest requires the Character Sheet to have at least 1 HP.",
    );
  }
  return Result.succeed({
    tag: "shortRestStarted",
    sheet: input.sheet,
    requiredRestTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
    [characterSheetShortRestStartBrand]: true,
  });
}

export function finishShortRest(
  input: CharacterSheetShortRestCompletionInput,
): Result.Result<CharacterSheetShortRestCompletion, CharacterSheetIssue> {
  if (Number(input.restedTicks) < Number(input.rest.requiredRestTicks)) {
    return characterSheetIssue(
      "Short Rest requires 1 hour before benefits can be received.",
    );
  }
  return Result.succeed({
    tag: "shortRestCompleted",
    startedRest: input.rest,
    restedTicks: input.restedTicks,
    [characterSheetShortRestCompletionBrand]: true,
  });
}

export function interruptShortRest(
  input: CharacterSheetShortRestInterruptionInput,
): CharacterSheetShortRestInterruptionOutcome {
  return {
    tag: "shortRestInterruptedNoBenefit",
    sheet: input.rest.sheet,
    interruption: input.interruption,
  };
}

export function completeShortRest(
  input: CharacterSheetShortRestInput,
): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const sheet = completeShortRestBenefits({
    sheet: input.completion.startedRest.sheet,
    unitLibrary: input.unitLibrary,
    hpGate: "requiresShortRestStartHp",
    spendHitDice: input.spendHitDice,
    arcaneRecovery: input.arcaneRecovery,
    sorcerousRestoration: input.sorcerousRestoration,
  });
  if (Result.isFailure(sheet)) return Result.fail(sheet.failure);
  const fiendishResilience = fiendishResilienceAfterShortRest({ input });
  if (Result.isFailure(fiendishResilience)) {
    return Result.fail(fiendishResilience.failure);
  }
  return Result.succeed({
    ...sheet.success,
    exhaustionLevel: shortRestExhaustionLevelAfterTireless({
      sheet: sheet.success,
      unitLibrary: input.unitLibrary,
    }),
    ...(fiendishResilience.success === undefined
      ? {}
      : { fiendishResilience: fiendishResilience.success }),
  });
}

export function completeShortRestArcaneRecoveryWithRoute(
  input: CharacterSheetShortRestInput & {
    readonly arcaneRecovery: NonNullable<
      CharacterSheetShortRestInput["arcaneRecovery"]
    >;
  },
): CharacterSheetArcaneRecoveryRestRouteResult {
  const result = completeShortRestArcaneRecoveryBenefitsWithOwner({
    sheet: input.completion.startedRest.sheet,
    unitLibrary: input.unitLibrary,
    hpGate: "requiresShortRestStartHp",
    spendHitDice: input.spendHitDice,
    arcaneRecovery: input.arcaneRecovery,
    sorcerousRestoration: input.sorcerousRestoration,
  });
  if (result.tag === "accepted") {
    return {
      tag: "accepted",
      route: "arcaneRecovery",
      sheet: result.sheet,
      qRoute: [completeArcaneRecoverySpellSlotRestRouteEvent()],
    };
  }
  /* v8 ignore start -- @preserve -- Malformed Short Rest route input failed before an Arcane Recovery route owner could be established. */
  if (result.owner === undefined) {
    return {
      tag: "rejected",
      route: "none",
      issue: result.issue,
      qRoute: [],
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "rejected",
    route: "arcaneRecovery",
    issue: result.issue,
    qRoute: [rejectArcaneRecoveryRouteEvent(result.owner)],
  };
}

function shortRestExhaustionLevelAfterTireless(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): CharacterSheetExhaustionLevel {
  return characterBuildFeatureUnitIds(
    input.sheet.build,
    input.unitLibrary,
  ).includes(authoredUnitId(RANGER_TIRELESS_UNIT_ID))
    ? decreaseExhaustionLevel(input.sheet.exhaustionLevel)
    : input.sheet.exhaustionLevel;
}

function decreaseExhaustionLevel(
  exhaustionLevel: CharacterSheetExhaustionLevel,
): CharacterSheetExhaustionLevel {
  return Math.max(0, exhaustionLevel - 1) as CharacterSheetExhaustionLevel;
}

export function characterSheetLongRestCalendarGate(
  timing: CharacterSheetLongRestStartTiming,
): CharacterSheetLongRestCalendarGate {
  if (timing.tag === "noPriorLongRest") {
    return {
      tag: "canStart",
      requiredWaitTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
    };
  }
  const remainingTicks =
    Number(CHARACTER_SHEET_LONG_REST_WAIT_TICKS) - Number(timing.elapsedTicks);
  if (remainingTicks <= 0) {
    return {
      tag: "canStart",
      requiredWaitTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
    };
  }
  return {
    tag: "mustWait",
    requiredWaitTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
    remainingTicks: elapsedTimeTicks(remainingTicks),
  };
}

export function startLongRest(
  input: CharacterSheetLongRestStartInput,
): Result.Result<CharacterSheetLongRestStart, CharacterSheetIssue> {
  if (characterSheetCurrentHp(input.sheet) < Hp(1)) {
    return characterSheetIssue(
      "Long Rest requires the Character Sheet to have at least 1 HP.",
    );
  }
  const calendarGate = characterSheetLongRestCalendarGate(input.timing);
  if (calendarGate.tag === "mustWait") {
    return characterSheetIssue(
      "Long Rest requires waiting 16 hours after finishing the previous Long Rest.",
    );
  }
  return Result.succeed({
    tag: "longRestStarted",
    sheet: input.sheet,
    requiredRestTicks: CHARACTER_SHEET_LONG_REST_BASE_TICKS,
    nextLongRestStartWaitTicks: CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
    [characterSheetLongRestStartBrand]: true,
  });
}

export function finishLongRest(
  input: CharacterSheetLongRestCompletionInput,
): Result.Result<CharacterSheetLongRestCompletion, CharacterSheetIssue> {
  if (Number(input.restedTicks) < Number(input.rest.requiredRestTicks)) {
    return characterSheetIssue(
      "Long Rest requires the full required duration before benefits can be received.",
    );
  }
  return Result.succeed({
    tag: "longRestCompleted",
    startedRest: input.rest,
    restedTicks: input.restedTicks,
    [characterSheetLongRestCompletionBrand]: true,
  });
}

export function completeLongRest(
  input: CharacterSheetLongRestInput,
): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const sheet = input.completion.startedRest.sheet;
  /* v8 ignore start -- @preserve -- Malformed Long Rest input: a rest cannot complete while the character has zero HP. */
  if (characterSheetCurrentHp(sheet) < Hp(1)) {
    return characterSheetIssue(
      "Long Rest requires the Character Sheet to have at least 1 HP.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const companion = companionAfterLongRest(sheet.companion);
  const heroicInspiration = heroicInspirationAfterLongRest({
    sheet,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore start -- @preserve -- Malformed sheet/catalog correlation: Long Rest reprojects Heroic Inspiration only from class units admitted when the build was created. */
  if (Result.isFailure(heroicInspiration)) {
    return Result.fail(heroicInspiration.failure);
  }
  /* v8 ignore stop -- @preserve */
  if (isCharacterSheetWithSpellSlots(sheet)) {
    const build = characterSheetLongRestBuild(input, sheet.build);
    /* v8 ignore next -- @preserve -- Malformed Long Rest input: weapon-mastery reselections are parsed against this admitted build before completion. */
    if (Result.isFailure(build)) return Result.fail(build.failure);
    const hitPoints = characterSheetLongRestHitPoints({
      build: build.success,
      unitLibrary: input.unitLibrary,
    });
    /* v8 ignore next -- @preserve -- Malformed sheet/catalog correlation: an admitted build and its unit catalog must still yield a hit-point maximum. */
    if (Result.isFailure(hitPoints)) return Result.fail(hitPoints.failure);
    const druidWildShapeKnownForms = druidWildShapeKnownFormsAfterLongRest({
      input,
      build: build.success,
    });
    /* v8 ignore start -- @preserve -- Malformed sheet/catalog correlation: retained Druid state cannot be reprojected from its admitted spellcasting build. */
    if (Result.isFailure(druidWildShapeKnownForms)) {
      return Result.fail(druidWildShapeKnownForms.failure);
    }
    /* v8 ignore stop -- @preserve */
    const druidCircleLand = druidCircleLandAfterLongRest({
      input,
      build: build.success,
    });
    /* v8 ignore start -- @preserve -- Malformed sheet/catalog correlation: retained Circle of the Land state cannot be reprojected from its admitted spellcasting build. */
    if (Result.isFailure(druidCircleLand)) {
      return Result.fail(druidCircleLand.failure);
    }
    /* v8 ignore stop -- @preserve */
    const fiendishResilience = fiendishResilienceAfterLongRest({ input });
    /* v8 ignore start -- @preserve -- Malformed sheet/catalog correlation: retained Fiendish Resilience cannot be reprojected from its admitted build. */
    if (Result.isFailure(fiendishResilience)) {
      return Result.fail(fiendishResilience.failure);
    }
    /* v8 ignore stop -- @preserve */
    return Result.succeed({
      ...sheet,
      build: build.success,
      hitPointMaximumReduction: Hp(0),
      exhaustionLevel: decreaseExhaustionLevel(sheet.exhaustionLevel),
      hitPoints: hitPoints.success,
      spentHitDice: [],
      restFeatureUses: [],
      resourceExpenditures: [],
      heroicInspiration: heroicInspiration.success,
      companion,
      ...(druidWildShapeKnownForms.success === undefined
        ? {}
        : { druidWildShapeKnownForms: druidWildShapeKnownForms.success }),
      ...(druidCircleLand.success === undefined
        ? {}
        : { druidCircleLand: druidCircleLand.success }),
      ...(fiendishResilience.success === undefined
        ? {}
        : { fiendishResilience: fiendishResilience.success }),
      spellSlotExpenditures: [],
      createdSpellSlots: [],
      pactSlotExpenditure: undefined,
    });
  }
  const build = characterSheetLongRestBuild(input, sheet.build);
  /* v8 ignore next -- @preserve -- Malformed Long Rest input: weapon-mastery reselections are parsed against this admitted build before completion. */
  if (Result.isFailure(build)) return Result.fail(build.failure);
  const hitPoints = characterSheetLongRestHitPoints({
    build: build.success,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore next -- @preserve -- Malformed sheet/catalog correlation: an admitted build and its unit catalog must still yield a hit-point maximum. */
  if (Result.isFailure(hitPoints)) return Result.fail(hitPoints.failure);
  const druidWildShapeKnownForms = druidWildShapeKnownFormsAfterLongRest({
    input,
    build: build.success,
  });
  /* v8 ignore start -- @preserve -- Malformed sheet/catalog correlation: retained Druid state cannot be reprojected from its admitted non-spellcasting build. */
  if (Result.isFailure(druidWildShapeKnownForms)) {
    return Result.fail(druidWildShapeKnownForms.failure);
  }
  /* v8 ignore stop -- @preserve */
  const druidCircleLand = druidCircleLandAfterLongRest({
    input,
    build: build.success,
  });
  /* v8 ignore start -- @preserve -- Malformed sheet/catalog correlation: retained Circle of the Land state cannot be reprojected from its admitted non-spellcasting build. */
  if (Result.isFailure(druidCircleLand)) {
    return Result.fail(druidCircleLand.failure);
  }
  /* v8 ignore stop -- @preserve */
  const fiendishResilience = fiendishResilienceAfterLongRest({ input });
  /* v8 ignore start -- @preserve -- Malformed sheet/catalog correlation: retained Fiendish Resilience cannot be reprojected from its admitted non-spellcasting build. */
  if (Result.isFailure(fiendishResilience)) {
    return Result.fail(fiendishResilience.failure);
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
    ...sheet,
    build: build.success,
    hitPointMaximumReduction: Hp(0),
    exhaustionLevel: decreaseExhaustionLevel(sheet.exhaustionLevel),
    hitPoints: hitPoints.success,
    spentHitDice: [],
    restFeatureUses: [],
    resourceExpenditures: [],
    heroicInspiration: heroicInspiration.success,
    companion,
    ...(druidWildShapeKnownForms.success === undefined
      ? {}
      : { druidWildShapeKnownForms: druidWildShapeKnownForms.success }),
    ...(druidCircleLand.success === undefined
      ? {}
      : { druidCircleLand: druidCircleLand.success }),
    ...(fiendishResilience.success === undefined
      ? {}
      : { fiendishResilience: fiendishResilience.success }),
  });
}

export function completeLongRestArcaneRecoveryResetWithRoute(
  input: CharacterSheetLongRestInput,
): CharacterSheetArcaneRecoveryRestRouteResult {
  const sheet = input.completion.startedRest.sheet;
  const resetsArcaneRecovery =
    isCharacterSheetWithSpellSlots(sheet) &&
    sheet.restFeatureUses.some(
      (use) => use.tag === ARCANE_RECOVERY_REST_FEATURE_TAG,
    );
  const result = completeLongRest(input);
  if (Result.isSuccess(result)) {
    if (!resetsArcaneRecovery) {
      return {
        tag: "accepted",
        route: "none",
        sheet: result.success,
        qRoute: [],
      };
    }
    return {
      tag: "accepted",
      route: "arcaneRecovery",
      sheet: result.success,
      qRoute: [completeArcaneRecoverySpellSlotRestRouteEvent()],
    };
  }
  return {
    tag: "rejected",
    route: "none",
    issue: result.failure,
    qRoute: [],
  };
}

export function completeLongRestWeaponMasteryReselectionWithRoute(
  input: CharacterSheetLongRestInput & {
    readonly weaponMasteryReselections: NonNullable<
      CharacterSheetLongRestInput["weaponMasteryReselections"]
    >;
  },
): CharacterSheetWeaponMasteryReselectionRouteResult {
  const sheet = input.completion.startedRest.sheet;
  const reselectionBuild = characterSheetLongRestBuild(input, sheet.build);
  if (Result.isFailure(reselectionBuild)) {
    return {
      tag: "rejected",
      route: "weaponMastery",
      issue: reselectionBuild.failure,
      qRoute: rejectedWeaponMasteryReselectionRoute(),
    };
  }
  const result = completeLongRest(input);
  if (Result.isSuccess(result)) {
    return {
      tag: "accepted",
      route: "weaponMastery",
      sheet: result.success,
      qRoute: acceptedWeaponMasteryReselectionRoute(),
    };
  }
  return {
    tag: "rejected",
    route: "none",
    issue: result.failure,
    qRoute: [],
  };
}

function characterSheetLongRestHitPoints(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<CharacterSheet["hitPoints"], CharacterSheetIssue> {
  const hitPointMaximum = characterSheetHitPointMaximum({
    sheet: {
      build: input.build,
      hitPointMaximumReduction: Hp(0),
    },
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore next -- @preserve -- Malformed sheet/catalog correlation: an admitted build and its unit catalog must still yield a hit-point maximum. */
  if (Result.isFailure(hitPointMaximum))
    return Result.fail(hitPointMaximum.failure);
  return characterSheetHitPoints({
    currentHp: hitPointMaximum.success,
    tempHp: Hp(0),
  });
}

function heroicInspirationAfterLongRest(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<CharacterSheetHeroicInspiration, CharacterSheetIssue> {
  const grantsHeroicInspiration =
    characterSheetHasLongRestHeroicInspirationGrant(input);
  if (Result.isFailure(grantsHeroicInspiration)) {
    return Result.fail(grantsHeroicInspiration.failure);
  }
  return Result.succeed(
    grantsHeroicInspiration.success
      ? CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE
      : input.sheet.heroicInspiration,
  );
}

function characterSheetHasLongRestHeroicInspirationGrant(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<boolean, CharacterSheetIssue> {
  const species = getRequiredUnit(input.unitLibrary, input.sheet.build.species);
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: the retained species is missing or has unreadable creation facts. */
  if (Result.isFailure(species)) {
    return Result.fail(species.failure);
  }
  const speciesFacts = readSpeciesCreationFacts(species.success);
  if (speciesFacts.tag !== "readable") {
    return Result.succeed(false);
  }
  /* v8 ignore stop -- @preserve */
  for (const traitUnitId of Object.values(speciesFacts.value.traits)) {
    const trait = getRequiredUnit(
      input.unitLibrary,
      authoredUnitId(traitUnitId),
    );
    if (Result.isFailure(trait)) {
      return Result.fail(trait.failure);
    }
    const projection = projectCharacterSheetSpeciesTrait(trait.success);
    if (
      Option.isSome(projection) &&
      isLongRestHeroicInspirationFeature(projection.value)
    ) {
      return Result.succeed(true);
    }
  }
  return Result.succeed(false);
}

function isLongRestHeroicInspirationFeature(
  facts: CharacterSheetSpeciesTraitFacts,
): facts is CharacterSheetRestTriggeredHeroicInspirationFeature {
  return (
    facts.mechanics.family === "rest_triggered_heroic_inspiration" &&
    facts.mechanics.trigger.kind === "finish_rest" &&
    facts.mechanics.trigger.rest === "long" &&
    facts.mechanics.grant.kind === "heroic_inspiration"
  );
}

function completeArcaneRecoverySpellSlotRestRouteEvent(): CharacterSheetRouteEvent {
  return {
    kind: "completeCharacterSheetRest",
    subject: "spellResource",
    fill: "recoverySelection",
    holes: [],
    owner: "spellSlot",
  };
}

function acceptedWeaponMasteryReselectionRoute(): CharacterSheetWeaponMasteryReselectionAcceptedRoute {
  return [
    {
      kind: "retainCharacterSheetSelectedReferences",
      subject: "selectedReferenceProjection",
      owner: "selectedReference",
    },
    {
      kind: "completeCharacterSheetRest",
      subject: "selectedReferenceProjection",
      fill: "projectionSelection",
      holes: [],
      owner: "selectedReference",
    },
  ];
}

function rejectedWeaponMasteryReselectionRoute(): CharacterSheetWeaponMasteryReselectionRejectedRoute {
  return [
    {
      kind: "resolveCharacterSheetSubject",
      subject: "selectedReferenceProjection",
      fill: "projectionSelection",
      holes: ["projectionChoice"],
      owner: "selectedReference",
    },
  ];
}

function rejectArcaneRecoveryRouteEvent(
  owner: "featureResource" | "pactSlot" | "spellSlot",
): CharacterSheetRouteEvent {
  return {
    kind: "resolveCharacterSheetSubject",
    subject: owner === "featureResource" ? "featureResource" : "spellResource",
    fill: "recoverySelection",
    holes: ["recoveryChoice"],
    owner,
  };
}

export function interruptLongRest(
  input: CharacterSheetLongRestInterruptionInput,
): Result.Result<
  CharacterSheetLongRestInterruptionOutcome,
  CharacterSheetIssue
> {
  const physicalExertionIssue = longRestPhysicalExertionInterruptionIssue(
    input.interruption,
  );
  if (physicalExertionIssue !== null) {
    return characterSheetIssue(physicalExertionIssue);
  }
  if (
    Number(input.timing.cumulativeRestedTicks) >=
    Number(input.rest.requiredRestTicks)
  ) {
    return characterSheetIssue(
      "Long Rest interruption requires rested time before the required Long Rest duration.",
    );
  }
  const requiredLongRestTicks = elapsedTimeTicks(
    Number(input.rest.requiredRestTicks) + ELAPSED_TIME_TICKS_PER_HOUR,
  );
  const resumedRest = characterSheetLongRestAfterInterruption({
    rest: input.rest,
    sheet: input.rest.sheet,
    requiredRestTicks: requiredLongRestTicks,
  });
  if (
    Number(input.timing.elapsedSincePreviousInterruptionTicks) <
    Number(CHARACTER_SHEET_SHORT_REST_TICKS)
  ) {
    if (
      input.spendHitDice !== undefined ||
      input.arcaneRecovery !== undefined ||
      input.sorcerousRestoration !== undefined
    ) {
      return characterSheetIssue(
        "Interrupted Long Rest before 1 hour cannot receive Short Rest benefit inputs.",
      );
    }
    return Result.succeed({
      tag: "longRestInterruptedNoBenefit",
      rest: resumedRest,
      interruption: input.interruption,
      requiredLongRestTicks,
    });
  }
  const shortRest = completeShortRestBenefits({
    sheet: input.rest.sheet,
    unitLibrary: input.unitLibrary,
    hpGate: "requiresShortRestStartHp",
    spendHitDice: input.spendHitDice,
    arcaneRecovery: input.arcaneRecovery,
    sorcerousRestoration: input.sorcerousRestoration,
  });
  /* v8 ignore next -- @preserve -- Malformed interruption benefit input: Short Rest options are parsed against the retained sheet before the interrupted Long Rest resumes. */
  if (Result.isFailure(shortRest)) return Result.fail(shortRest.failure);
  const resumedRestWithBenefits = characterSheetLongRestAfterInterruption({
    rest: input.rest,
    sheet: shortRest.success,
    requiredRestTicks: requiredLongRestTicks,
  });
  return Result.succeed({
    tag: "longRestInterruptedWithShortRestBenefits",
    rest: resumedRestWithBenefits,
    interruption: input.interruption,
    requiredLongRestTicks,
  });
}

function longRestPhysicalExertionInterruptionIssue(
  interruption: CharacterSheetLongRestInterruption,
): string | null {
  if (typeof interruption === "string") return null;
  return Number(interruption.durationTicks) <
    Number(CHARACTER_SHEET_SHORT_REST_TICKS)
    ? "Long Rest physical exertion interruption requires at least 1 hour."
    : null;
}

function characterSheetLongRestAfterInterruption(input: {
  readonly rest: CharacterSheetLongRestStart;
  readonly sheet: CharacterSheet;
  readonly requiredRestTicks: ElapsedTimeTicks;
}): CharacterSheetLongRestStart {
  return {
    tag: "longRestStarted",
    sheet: input.sheet,
    requiredRestTicks: input.requiredRestTicks,
    nextLongRestStartWaitTicks: input.rest.nextLongRestStartWaitTicks,
    [characterSheetLongRestStartBrand]: true,
  };
}

export function completeMagicalCunningRite(
  input: CharacterSheetMagicalCunningInput,
): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const pactSlots = characterSheetPactSlots(input.sheet);
  /* v8 ignore start -- @preserve -- Malformed Magical Cunning input: the sheet lacks Pact Slot state. */
  if (pactSlots === undefined) {
    return characterSheetIssue("Magical Cunning requires Pact Slot state.");
  }
  if (!isCharacterSheetWithSpellSlots(input.sheet)) {
    return characterSheetIssue("Magical Cunning requires Pact Slot state.");
  }
  /* v8 ignore stop -- @preserve */
  const profile = pactSlotRecoveryProfileForBuild(
    input.sheet.build,
    input.unitLibrary,
  );
  if (Result.isFailure(profile)) return Result.fail(profile.failure);
  if (
    input.sheet.restFeatureUses.some(
      (use) => use.tag === MAGICAL_CUNNING_REST_FEATURE_TAG,
    )
  ) {
    return characterSheetIssue(
      "Magical Cunning cannot be used again until a Long Rest.",
    );
  }
  /* v8 ignore start -- @preserve -- Malformed Magical Cunning input: no Pact Slot is expended. */
  if (pactSlots.expended < resourceCount(1)) {
    return characterSheetIssue(
      "Magical Cunning must recover expended Pact Slots.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const recovered = magicalCunningRecoveredPactSlots({
    pactSlots,
    profile: profile.success,
  });
  const expendedAfterRecovery = resourceCount(
    Math.max(0, pactSlots.expended - recovered),
  );
  return Result.succeed({
    ...input.sheet,
    pactSlotExpenditure:
      expendedAfterRecovery === resourceCount(0)
        ? undefined
        : { expended: expendedAfterRecovery },
    restFeatureUses: [
      ...input.sheet.restFeatureUses,
      {
        tag: MAGICAL_CUNNING_REST_FEATURE_TAG,
        usedSinceLongRest: true,
      },
    ],
  });
}

export function magicalCunningRecoveredPactSlots(input: {
  readonly pactSlots: CharacterSheetPactSlotState;
  readonly profile: CharacterSheetPactSlotRecoveryProfile;
}): ResourceCount {
  return Match.value(input.profile.feature.mechanics.recoveryCap.kind).pipe(
    Match.when("half_maximum_rounded_up", () =>
      resourceCount(Math.ceil(input.pactSlots.count / 2)),
    ),
    Match.exhaustive,
  );
}

export function pactSlotRecoveryProfileForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<CharacterSheetPactSlotRecoveryProfile, CharacterSheetIssue> {
  const profiles: CharacterSheetPactSlotRecoveryProfile[] = [];
  for (const classUnitId of progressionClassUnitIds(build.progression)) {
    const unit = getRequiredUnit(unitLibrary, classUnitId);
    /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: every class id in an admitted progression must resolve in its retained unit catalog. */
    if (Result.isFailure(unit)) return Result.fail(unit.failure);
    const facts = readClassCreationFacts(unit.success);
    /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: every Unit admitted as a progression class must expose readable class-creation facts. */
    if (facts.tag !== "readable") continue;
    /* v8 ignore stop -- @preserve */
    const classLevel = classLevelForUnit(build.progression, classUnitId);
    for (const grant of facts.value.featureGrants) {
      if (grant.level > classLevel) continue;
      const feature = unitLibrary.getUnit(grant.unitId);
      const projection = Option.isSome(feature)
        ? projectCharacterSheetClassFeature(feature.value)
        : Option.none();
      if (
        isPactSlotRecoveryFeatureOption(projection) &&
        unit.success.kind === "class" &&
        unit.success.className === projection.value.className
      ) {
        profiles.push({ feature: projection.value, classUnitId });
      }
    }
  }
  if (profiles.length === 0) {
    return characterSheetIssue(
      "Magical Cunning requires the Warlock Magical Cunning feature.",
    );
  }
  /* v8 ignore start -- @preserve -- Malformed admitted build: multiple Pact Slot recovery profiles survived support admission. */
  if (profiles.length > 1) {
    return characterSheetIssue(
      "Character Sheet supports only one Pact Slot recovery feature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const profile = profiles[0];
  /* v8 ignore start -- @preserve -- The nonempty profile check above makes an absent first Pact Slot recovery profile impossible. */
  if (profile === undefined) {
    return characterSheetIssue(
      "Magical Cunning requires the Warlock Magical Cunning feature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed(profile);
}

function isPactSlotRecoveryFeature(
  facts: CharacterSheetClassFeatureFacts,
): facts is CharacterSheetPactSlotRecoveryFeature {
  return (
    facts.mechanics.family === "pact_slot_recovery" &&
    facts.mechanics.activationCost.kind === "one_minute_rite" &&
    facts.mechanics.resource.kind === "pact_slots" &&
    facts.mechanics.resource.source === "class_record_pact_magic" &&
    facts.mechanics.requiresExpendedSlots === true &&
    facts.mechanics.recoveryCap.kind === "half_maximum_rounded_up" &&
    facts.mechanics.resetCadence.kind === "long_rest"
  );
}

function isPactSlotRecoveryFeatureOption(
  feature: Option.Option<CharacterSheetClassFeatureFacts>,
): feature is Option.Some<CharacterSheetPactSlotRecoveryFeature> {
  return Option.isSome(feature) && isPactSlotRecoveryFeature(feature.value);
}

function characterSheetLongRestBuild<TBuild extends CharacterBuild>(
  input: CharacterSheetLongRestInput,
  build: TBuild,
): Result.Result<TBuild, CharacterSheetIssue> {
  if (input.weaponMasteryReselections === undefined) {
    return Result.succeed(build);
  }
  return characterBuildWithWeaponMasteryReselections({
    build,
    unitLibrary: input.unitLibrary,
    reselections: input.weaponMasteryReselections,
  });
}

function characterBuildWithWeaponMasteryReselections<
  TBuild extends CharacterBuild,
>(input: {
  readonly build: TBuild;
  readonly unitLibrary: UnitCatalog;
  readonly reselections: ReadonlyNonEmptyArray<CharacterSheetWeaponMasteryReselection>;
}): Result.Result<TBuild, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- The ReadonlyNonEmptyArray reselection type makes an empty batch an internal malformed-call invariant. */
  if (input.reselections.length === 0) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection input must be nonempty.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const ownedFeatureUnitIds = new Set(
    characterBuildFeatureUnitIds(input.build, input.unitLibrary),
  );
  const reselectedWeaponUnitIdsByFeature = new Map<
    UnitRecord["id"],
    readonly UnitRecord["id"][]
  >();

  for (const reselection of input.reselections) {
    /* v8 ignore start -- @preserve -- Malformed Weapon Mastery reselection: the batch duplicates a feature source or names an unowned feature. */
    if (reselectedWeaponUnitIdsByFeature.has(reselection.featureUnitId)) {
      return characterSheetIssue(
        "Weapon Mastery Long Rest reselection must not duplicate feature sources.",
      );
    }
    if (!ownedFeatureUnitIds.has(reselection.featureUnitId)) {
      return characterSheetIssue(
        "Weapon Mastery Long Rest reselection requires the Character Build to own the feature.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const selectedWeaponUnitIds = selectedWeaponMasteryUnitIdsForLongRest({
      build: input.build,
      unitLibrary: input.unitLibrary,
      reselection,
    });
    if (Result.isFailure(selectedWeaponUnitIds)) {
      return Result.fail(selectedWeaponUnitIds.failure);
    }
    reselectedWeaponUnitIdsByFeature.set(
      reselection.featureUnitId,
      selectedWeaponUnitIds.success,
    );
  }

  return Result.succeed({
    ...input.build,
    features: characterBuildFeaturesWithWeaponMasteryReselections(
      input.build.features,
      reselectedWeaponUnitIdsByFeature,
    ),
  });
}

function selectedWeaponMasteryUnitIdsForLongRest(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly reselection: CharacterSheetWeaponMasteryReselection;
}): Result.Result<readonly UnitRecord["id"][], CharacterSheetIssue> {
  const profile = weaponMasteryChoiceProfileForFeature({
    featureUnitId: input.reselection.featureUnitId,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore start -- @preserve -- Malformed Weapon Mastery reselection: feature profile ownership or Long-Rest support disagrees with the admitted build. */
  if (profile === undefined) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection requires a Weapon Mastery class-feature Unit.",
    );
  }
  const levelProfile = weaponMasteryChoiceProfileForProgression(
    profile,
    input.build.progression,
  );
  if (Option.isNone(levelProfile)) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection requires the Character Build to own the feature class.",
    );
  }
  if (profile.longRestChangeCount < 1) {
    return characterSheetIssue(
      "Weapon Mastery class-feature Unit does not support Long Rest reselection.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const currentWeaponUnitIds = selectedWeaponMasteryUnitIds(
    input.build,
    input.reselection.featureUnitId,
  );
  /* v8 ignore start -- @preserve -- Malformed retained build: current Weapon Mastery selections violate the admitted feature cardinality or uniqueness. */
  if (
    currentWeaponUnitIds.length !== levelProfile.value.choiceCount ||
    new Set(currentWeaponUnitIds).size !== currentWeaponUnitIds.length
  ) {
    return characterSheetIssue(
      "Existing Weapon Mastery selections must match the feature choice count.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const selectedWeaponUnitIds = input.reselection.selectedWeaponUnitIds;
  /* v8 ignore start -- @preserve -- Malformed Weapon Mastery reselection: selected weapons violate admitted cardinality, uniqueness, or eligibility. */
  if (selectedWeaponUnitIds.length !== levelProfile.value.choiceCount) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection must match the feature choice count.",
    );
  }
  if (new Set(selectedWeaponUnitIds).size !== selectedWeaponUnitIds.length) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection must not duplicate weapon choices.",
    );
  }

  const eligibleWeaponUnitIds = new Set(
    levelProfile.value.eligibleWeapons.map((weapon) => weapon.id),
  );
  if (
    selectedWeaponUnitIds.some((unitId) => !eligibleWeaponUnitIds.has(unitId))
  ) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection must choose eligible proficient weapons.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const currentWeaponUnitIdSet = new Set(currentWeaponUnitIds);
  const changedChoiceCount = selectedWeaponUnitIds.filter(
    (unitId) => !currentWeaponUnitIdSet.has(unitId),
  ).length;
  if (changedChoiceCount > profile.longRestChangeCount) {
    return characterSheetIssue(
      "Weapon Mastery Long Rest reselection changes too many weapon choices.",
    );
  }

  return Result.succeed([...selectedWeaponUnitIds]);
}

function selectedWeaponMasteryUnitIds(
  build: CharacterBuild,
  featureUnitId: UnitRecord["id"],
): readonly UnitRecord["id"][] {
  return build.features.flatMap((feature) =>
    feature.kind === "selectedClassChoice" &&
    feature.selectedFromUnitId === featureUnitId
      ? [feature.unitId]
      : [],
  );
}

function characterBuildFeaturesWithWeaponMasteryReselections(
  features: readonly CharacterBuildFeature[],
  selectedWeaponUnitIdsByFeature: ReadonlyMap<
    UnitRecord["id"],
    readonly UnitRecord["id"][]
  >,
): readonly CharacterBuildFeature[] {
  const insertedFeatureUnitIds = new Set<UnitRecord["id"]>();
  const nextFeatures: CharacterBuildFeature[] = [];

  for (const feature of features) {
    const selectedWeaponUnitIds =
      feature.kind === "selectedClassChoice"
        ? selectedWeaponUnitIdsByFeature.get(feature.selectedFromUnitId)
        : undefined;
    if (selectedWeaponUnitIds === undefined) {
      nextFeatures.push(feature);
      continue;
    }

    if (!insertedFeatureUnitIds.has(feature.selectedFromUnitId)) {
      nextFeatures.push(
        ...selectedWeaponUnitIds.map((unitId) => ({
          kind: "selectedClassChoice" as const,
          unitId,
          selectedFromUnitId: feature.selectedFromUnitId,
        })),
      );
      insertedFeatureUnitIds.add(feature.selectedFromUnitId);
    }
  }

  /* v8 ignore start -- @preserve -- Internal workflow invariant: reselection validation proves every map key already has at least one retained selectedClassChoice entry, so this defensive insertion fallback is not reached. */
  for (const [
    featureUnitId,
    selectedWeaponUnitIds,
  ] of selectedWeaponUnitIdsByFeature) {
    if (insertedFeatureUnitIds.has(featureUnitId)) continue;
    nextFeatures.push(
      ...selectedWeaponUnitIds.map((unitId) => ({
        kind: "selectedClassChoice" as const,
        unitId,
        selectedFromUnitId: featureUnitId,
      })),
    );
  }
  /* v8 ignore stop -- @preserve */

  return nextFeatures;
}
