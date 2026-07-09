// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.restoration-death-spell-session
import type { UnitCatalog } from "@dnd/character-creation-runtime";
import { Hp, spellSlotLevel, type SpellSlotLevel } from "@dnd/shared/types";
import type {
  ActivationPhase,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  characterSheetCurrentHp,
  characterSheetHitPoints,
} from "./hit-points.ts";
import {
  characterSheetIssue,
  getRequiredUnit,
  type CharacterSheet,
  type CharacterSheetCondition,
  type CharacterSheetFontOfMagicSpellSlotSource,
  type CharacterSheetIssue,
} from "./sheet-types.ts";
import { spendCharacterSheetSpellSlot } from "./spell-slots.ts";

export const CHARACTER_SHEET_RESTORATION_DEATH_SPELL_SESSION_PROFILE_ID =
  "character-sheet.restoration-death-spell-session" as const;

const GREATER_RESTORATION_CONDITIONS = [
  "charmed",
  "petrified",
] as const satisfies ReadonlyArray<CharacterSheetCondition>;
const REINCARNATE_DEFERRED_MECHANICS = [
  "reincarnate_species_replacement_owner",
  "reincarnate_current_hit_points_owner",
  "dead_glossary_exhaustion_and_attunement_return_cleanup",
] as const;

export type CharacterSheetRestorationDeathMaterialComponentSpend = {
  readonly tag: "consumedMaterialComponent";
  readonly costGp: number;
  readonly consumed: true;
};

export type CharacterSheetCompletedTouchSpellCasting = {
  readonly tag: "completedTouchSpellCasting";
  readonly targetWithinTouch: true;
  readonly materialComponent: CharacterSheetRestorationDeathMaterialComponentSpend;
};

export type CharacterSheetGreaterRestorationCondition =
  (typeof GREATER_RESTORATION_CONDITIONS)[number];

export type CharacterSheetGreaterRestorationEffect = {
  readonly tag: "condition";
  readonly condition: CharacterSheetGreaterRestorationCondition;
};

export type CharacterSheetGreaterRestorationInput = {
  readonly caster: CharacterSheet;
  readonly target: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
  readonly castLevel?: SpellSlotLevel;
  readonly spellSlotSource?: CharacterSheetFontOfMagicSpellSlotSource;
  readonly casting: CharacterSheetCompletedTouchSpellCasting;
  readonly effect: CharacterSheetGreaterRestorationEffect;
};

export type CharacterSheetRaiseDeadEligibility = {
  readonly deadForDays: number;
  readonly wasUndeadWhenDied: boolean;
  readonly hasIntegralBodyParts: boolean;
  readonly spiritConsent: "accepted" | "refused";
};

export type CharacterSheetReincarnateTargetRemains =
  | "deadHumanoid"
  | "pieceOfDeadHumanoid";

export type CharacterSheetReincarnateEligibility = {
  readonly deadForDays: number;
  readonly targetRemains: CharacterSheetReincarnateTargetRemains;
  readonly soulConsent: "accepted" | "refused";
};

export type CharacterSheetRaiseDeadInput = {
  readonly caster: CharacterSheet;
  readonly target: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
  readonly castLevel?: SpellSlotLevel;
  readonly spellSlotSource?: CharacterSheetFontOfMagicSpellSlotSource;
  readonly casting: CharacterSheetCompletedTouchSpellCasting;
  readonly eligibility: CharacterSheetRaiseDeadEligibility;
};

export type CharacterSheetReincarnateInput = {
  readonly caster: CharacterSheet;
  readonly target: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
  readonly castLevel?: SpellSlotLevel;
  readonly spellSlotSource?: CharacterSheetFontOfMagicSpellSlotSource;
  readonly casting: CharacterSheetCompletedTouchSpellCasting;
  readonly eligibility: CharacterSheetReincarnateEligibility;
};

export type CharacterSheetRestorationDeathSpellResult = {
  readonly caster: CharacterSheet;
  readonly target: CharacterSheet;
  readonly spellId: UnitRecord["id"];
  readonly castLevel: SpellSlotLevel;
  readonly deferredMechanics: readonly string[];
};

export type CharacterSheetReincarnateSpeciesReplacementContract = {
  readonly tag: "tableSessionSpeciesReplacement";
  readonly previousSpeciesUnitId: UnitRecord["id"];
  readonly speciesDetermination: "roll1d10OrGmPlayableSpeciesChoice";
  readonly speciesChoicesOwner: "table-session";
  readonly characterBuildSpeciesReplacementOwner: "deferred-character-creation-runtime";
  readonly previousSpeciesTraits: "lost";
  readonly newSpeciesTraits: "gained";
};

export type CharacterSheetReincarnateHitPointContract = {
  readonly tag: "tableSessionRevivalHitPoints";
  readonly currentHitPointOwner: "table-session";
  readonly characterSheetHitPointMutation: "deferred";
  readonly reason: "srdReincarnateDoesNotStateCurrentHitPoints";
};

export type CharacterSheetReincarnateResult = {
  readonly caster: CharacterSheet;
  readonly target: CharacterSheet;
  readonly spellId: UnitRecord["id"];
  readonly castLevel: SpellSlotLevel;
  readonly targetRemains: CharacterSheetReincarnateTargetRemains;
  readonly speciesReplacement: CharacterSheetReincarnateSpeciesReplacementContract;
  readonly hitPoints: CharacterSheetReincarnateHitPointContract;
  readonly deferredMechanics: typeof REINCARNATE_DEFERRED_MECHANICS;
};

type DirectActivationPhase = Extract<
  ActivationPhase,
  { readonly kind: "direct" }
>;
type RemoveConditionEffect = {
  readonly kind: "remove_condition";
  readonly condition: unknown;
};
type ReviveDeadCreatureEffect = {
  readonly kind: "revive_dead_creature";
  readonly deathWindow: {
    readonly unit: "minute" | "day";
    readonly amount: number;
  };
  readonly hitPoints: number;
  readonly spiritConsent: "can_refuse";
  readonly excludedDeathCauses: readonly ["old_age"];
  readonly missingBodyParts: "not_restored";
  readonly returningOngoingEffects: {
    readonly conditions: "preserve_if_duration_ongoing";
    readonly magicalContagions: "preserve_if_duration_ongoing";
    readonly curses: "preserve_if_duration_ongoing";
    readonly exhaustion: {
      readonly kind: "reduce_by";
      readonly amount: number;
    };
    readonly attunement: "ends";
  };
};
type GreaterRestorationProfile = {
  readonly spell: SpellRecord;
  readonly minimumCastLevel: SpellSlotLevel;
  readonly materialCostGp: number;
  readonly conditions: readonly CharacterSheetGreaterRestorationCondition[];
};
type RaiseDeadProfile = {
  readonly spell: SpellRecord;
  readonly minimumCastLevel: SpellSlotLevel;
  readonly materialCostGp: number;
  readonly revive: ReviveDeadCreatureEffect;
};
type ReincarnateProfile = {
  readonly spell: SpellRecord;
  readonly minimumCastLevel: SpellSlotLevel;
  readonly materialCostGp: number;
  readonly deathWindowDays: number;
};

const REINCARNATE_DEATH_WINDOW_DAYS = 10;

export function castGreaterRestorationOnSheet(
  input: CharacterSheetGreaterRestorationInput,
): Either.Either<
  CharacterSheetRestorationDeathSpellResult,
  CharacterSheetIssue
> {
  const profile = greaterRestorationProfileForSpell(input);
  if (Either.isLeft(profile)) return Either.left(profile.left);
  const castLevel = input.castLevel ?? profile.right.minimumCastLevel;
  const prepared = prepareRestorationDeathCasting({
    caster: input.caster,
    castLevel,
    minimumCastLevel: profile.right.minimumCastLevel,
    spellSlotSource: input.spellSlotSource,
    casting: input.casting,
    materialCostGp: profile.right.materialCostGp,
  });
  if (Either.isLeft(prepared)) return Either.left(prepared.left);

  if (!profile.right.conditions.includes(input.effect.condition)) {
    return characterSheetIssue(
      "Greater Restoration condition removal requires a condition supported by the Spell Definition.",
    );
  }
  const sourceIsTarget = input.caster.characterId === input.target.characterId;
  const targetBase = sourceIsTarget ? prepared.right : input.target;
  if (
    !targetBase.conditions.some(
      (condition) => condition === input.effect.condition,
    )
  ) {
    return characterSheetIssue(
      "Greater Restoration condition removal requires the selected condition on the target.",
    );
  }
  const restored = {
    ...targetBase,
    conditions: targetBase.conditions.filter(
      (condition) => condition !== input.effect.condition,
    ),
  };
  return Either.right({
    caster: sourceIsTarget ? restored : prepared.right,
    target: restored,
    spellId: profile.right.spell.id,
    castLevel,
    deferredMechanics: [],
  });
}

export function castRaiseDeadOnSheet(
  input: CharacterSheetRaiseDeadInput,
): Either.Either<
  CharacterSheetRestorationDeathSpellResult,
  CharacterSheetIssue
> {
  const profile = raiseDeadProfileForSpell(input);
  if (Either.isLeft(profile)) return Either.left(profile.left);
  const castLevel = input.castLevel ?? profile.right.minimumCastLevel;
  const prepared = prepareRestorationDeathCasting({
    caster: input.caster,
    castLevel,
    minimumCastLevel: profile.right.minimumCastLevel,
    spellSlotSource: input.spellSlotSource,
    casting: input.casting,
    materialCostGp: profile.right.materialCostGp,
  });
  if (Either.isLeft(prepared)) return Either.left(prepared.left);

  const eligibilityIssue = raiseDeadEligibilityIssue({
    eligibility: input.eligibility,
    revive: profile.right.revive,
  });
  if (eligibilityIssue !== null) return characterSheetIssue(eligibilityIssue);
  if (
    input.target.hitPoints.tag !== "zero" ||
    input.target.hitPoints.lifecycle.tag !== "dead"
  ) {
    return characterSheetIssue("Raise Dead requires a dead target.");
  }
  const hitPoints = characterSheetHitPoints({
    currentHp: Hp(profile.right.revive.hitPoints),
    tempHp: input.target.hitPoints.tempHp,
  });
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  return Either.right({
    caster: prepared.right,
    target: {
      ...input.target,
      hitPoints: hitPoints.right,
      conditions: input.target.conditions.filter(
        (condition) => condition !== "poisoned",
      ),
    },
    spellId: profile.right.spell.id,
    castLevel,
    deferredMechanics: [
      "raise_dead_d20_test_penalty",
      "dead_glossary_exhaustion_and_attunement_return_cleanup",
    ],
  });
}

export function castReincarnateOnSheet(
  input: CharacterSheetReincarnateInput,
): Either.Either<CharacterSheetReincarnateResult, CharacterSheetIssue> {
  const profile = reincarnateProfileForSpell(input);
  if (Either.isLeft(profile)) return Either.left(profile.left);
  if (!hasPreparedSpellAccess(input.caster, profile.right.spell.id)) {
    return characterSheetIssue(
      "Reincarnate requires prepared class Spell Access.",
    );
  }
  const castLevel = input.castLevel ?? profile.right.minimumCastLevel;
  const prepared = prepareRestorationDeathCasting({
    caster: input.caster,
    castLevel,
    minimumCastLevel: profile.right.minimumCastLevel,
    spellSlotSource: input.spellSlotSource,
    casting: input.casting,
    materialCostGp: profile.right.materialCostGp,
  });
  if (Either.isLeft(prepared)) return Either.left(prepared.left);

  const eligibilityIssue = reincarnateEligibilityIssue({
    eligibility: input.eligibility,
    deathWindowDays: profile.right.deathWindowDays,
  });
  if (eligibilityIssue !== null) return characterSheetIssue(eligibilityIssue);
  if (
    input.target.hitPoints.tag !== "zero" ||
    input.target.hitPoints.lifecycle.tag !== "dead"
  ) {
    return characterSheetIssue("Reincarnate requires a dead target.");
  }

  return Either.right({
    caster: prepared.right,
    target: input.target,
    spellId: profile.right.spell.id,
    castLevel,
    targetRemains: input.eligibility.targetRemains,
    speciesReplacement: {
      tag: "tableSessionSpeciesReplacement",
      previousSpeciesUnitId: input.target.build.species,
      speciesDetermination: "roll1d10OrGmPlayableSpeciesChoice",
      speciesChoicesOwner: "table-session",
      characterBuildSpeciesReplacementOwner:
        "deferred-character-creation-runtime",
      previousSpeciesTraits: "lost",
      newSpeciesTraits: "gained",
    },
    hitPoints: {
      tag: "tableSessionRevivalHitPoints",
      currentHitPointOwner: "table-session",
      characterSheetHitPointMutation: "deferred",
      reason: "srdReincarnateDoesNotStateCurrentHitPoints",
    },
    deferredMechanics: REINCARNATE_DEFERRED_MECHANICS,
  });
}

function prepareRestorationDeathCasting(input: {
  readonly caster: CharacterSheet;
  readonly castLevel: SpellSlotLevel;
  readonly minimumCastLevel: SpellSlotLevel;
  readonly spellSlotSource:
    | CharacterSheetFontOfMagicSpellSlotSource
    | undefined;
  readonly casting: CharacterSheetCompletedTouchSpellCasting;
  readonly materialCostGp: number;
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (characterSheetCurrentHp(input.caster) < Hp(1)) {
    return characterSheetIssue(
      "Restoration/death spell casting requires a living caster.",
    );
  }
  if (input.castLevel < input.minimumCastLevel) {
    return characterSheetIssue(
      "Restoration/death spell casting requires a spell slot at the spell's level or higher.",
    );
  }
  const materialIssue = materialComponentIssue({
    component: input.casting.materialComponent,
    requiredCostGp: input.materialCostGp,
  });
  if (materialIssue !== null) return characterSheetIssue(materialIssue);
  return spendCharacterSheetSpellSlot({
    sheet: input.caster,
    spellLevel: input.castLevel,
    spellSlotSource: input.spellSlotSource,
  });
}

function materialComponentIssue(input: {
  readonly component: CharacterSheetRestorationDeathMaterialComponentSpend;
  readonly requiredCostGp: number;
}): string | null {
  if (input.component.tag !== "consumedMaterialComponent") {
    return "Restoration/death spell casting requires a consumed material component.";
  }
  if (
    !Number.isInteger(input.component.costGp) ||
    input.component.costGp < input.requiredCostGp
  ) {
    return "Restoration/death spell casting requires the minimum consumed material component value.";
  }
  return null;
}

function greaterRestorationProfileForSpell(input: {
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
}): Either.Either<GreaterRestorationProfile, CharacterSheetIssue> {
  const spell = spellRecord(input.unitLibrary, input.spellId);
  if (Either.isLeft(spell)) return Either.left(spell.left);
  const shell = activationTouchMaterialShell(spell.right);
  if (Either.isLeft(shell)) return Either.left(shell.left);
  const phase = singleDirectCreaturePhase(spell.right);
  if (Either.isLeft(phase)) return Either.left(phase.left);
  const effects: readonly unknown[] = phase.right.effects ?? [];
  const conditionEffect = effects.find(isRemoveConditionEffect);
  const conditions =
    conditionEffect === undefined
      ? []
      : supportedGreaterRestorationConditions(conditionEffect);
  if (conditions.length === 0) {
    return characterSheetIssue(
      "Greater Restoration requires a direct remove-condition Spell Definition profile.",
    );
  }
  return Either.right({
    spell: spell.right,
    minimumCastLevel: spellSlotLevel(spell.right.mechanics.level),
    materialCostGp: shell.right.materialCostGp,
    conditions,
  });
}

function raiseDeadProfileForSpell(input: {
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
}): Either.Either<RaiseDeadProfile, CharacterSheetIssue> {
  const spell = spellRecord(input.unitLibrary, input.spellId);
  if (Either.isLeft(spell)) return Either.left(spell.left);
  const shell = activationTouchMaterialShell(spell.right);
  if (Either.isLeft(shell)) return Either.left(shell.left);
  const phase = singleDirectDeadCreaturePhase(spell.right);
  if (Either.isLeft(phase)) return Either.left(phase.left);
  const effects: readonly unknown[] = phase.right.effects ?? [];
  const revive = effects.find(isReviveDeadCreatureEffect);
  if (
    revive === undefined ||
    revive.deathWindow.unit !== "day" ||
    revive.hitPoints !== 1 ||
    revive.spiritConsent !== "can_refuse" ||
    revive.missingBodyParts !== "not_restored"
  ) {
    return characterSheetIssue(
      "Raise Dead requires a direct dead-creature revival Spell Definition profile.",
    );
  }
  return Either.right({
    spell: spell.right,
    minimumCastLevel: spellSlotLevel(spell.right.mechanics.level),
    materialCostGp: shell.right.materialCostGp,
    revive,
  });
}

function reincarnateProfileForSpell(input: {
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
}): Either.Either<ReincarnateProfile, CharacterSheetIssue> {
  const spell = spellRecord(input.unitLibrary, input.spellId);
  if (Either.isLeft(spell)) return Either.left(spell.left);
  const shell = activationTouchMaterialShell(spell.right);
  if (Either.isLeft(shell)) return Either.left(shell.left);
  const phase = singleDirectDeadHumanoidPhase(spell.right);
  if (Either.isLeft(phase)) return Either.left(phase.left);
  const effects: readonly unknown[] = phase.right.effects ?? [];
  if (
    effects.length !== 1 ||
    !isRecord(effects[0]) ||
    effects[0]["kind"] !== "none"
  ) {
    return characterSheetIssue(
      "Reincarnate requires a direct dead-Humanoid target profile with deferred species replacement.",
    );
  }
  return Either.right({
    spell: spell.right,
    minimumCastLevel: spellSlotLevel(spell.right.mechanics.level),
    materialCostGp: shell.right.materialCostGp,
    deathWindowDays: REINCARNATE_DEATH_WINDOW_DAYS,
  });
}

function spellRecord(
  unitLibrary: UnitCatalog,
  spellId: UnitRecord["id"],
): Either.Either<SpellRecord, CharacterSheetIssue> {
  const unit = getRequiredUnit(unitLibrary, spellId);
  if (Either.isLeft(unit)) return Either.left(unit.left);
  return unit.right.kind === "spell"
    ? Either.right(unit.right)
    : characterSheetIssue(
        "Restoration/death spell casting requires a Spell record.",
      );
}

function activationTouchMaterialShell(
  spell: SpellRecord,
): Either.Either<{ readonly materialCostGp: number }, CharacterSheetIssue> {
  const components: unknown = spell.mechanics.components;
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level < 1 ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    !isRecord(components) ||
    components["materialConsumed"] !== true ||
    typeof components["materialCostGp"] !== "number"
  ) {
    return characterSheetIssue(
      "Restoration/death spell casting requires a leveled instantaneous touch Spell Definition with a consumed material component.",
    );
  }
  return Either.right({
    materialCostGp: components["materialCostGp"],
  });
}

function singleDirectCreaturePhase(
  spell: SpellRecord,
): Either.Either<DirectActivationPhase, CharacterSheetIssue> {
  const phase =
    spell.mechanics.family === "activation" &&
    spell.mechanics.phases.length === 1
      ? spell.mechanics.phases[0]
      : undefined;
  if (phase === undefined || phase.kind !== "direct") {
    return characterSheetIssue(
      "Restoration/death spell casting requires one direct phase.",
    );
  }
  const selection =
    phase.attachment.kind === "hole" && phase.attachment.value.kind === "target"
      ? phase.attachment.value.selection
      : undefined;
  const rawSelection: unknown = selection;
  const targetKinds =
    isRecord(rawSelection) && Array.isArray(rawSelection["targetKinds"])
      ? rawSelection["targetKinds"]
      : undefined;
  if (
    selection === undefined ||
    selection.mode !== "one" ||
    targetKinds?.length !== 1 ||
    targetKinds[0] !== "creature"
  ) {
    return characterSheetIssue(
      "Restoration/death spell casting requires one creature target.",
    );
  }
  return Either.right(phase);
}

function singleDirectDeadCreaturePhase(
  spell: SpellRecord,
): Either.Either<DirectActivationPhase, CharacterSheetIssue> {
  const phase = singleDirectCreaturePhase(spell);
  if (Either.isLeft(phase)) return Either.left(phase.left);
  const selection =
    phase.right.attachment.kind === "hole" &&
    phase.right.attachment.value.kind === "target"
      ? phase.right.attachment.value.selection
      : undefined;
  const rawSelection: unknown = selection;
  const stateFilter =
    isRecord(rawSelection) && Array.isArray(rawSelection["stateFilter"])
      ? rawSelection["stateFilter"]
      : undefined;
  return stateFilter?.length === 1 && stateFilter[0] === "dead"
    ? Either.right(phase.right)
    : characterSheetIssue(
        "Raise Dead requires a direct dead-creature target profile.",
      );
}

function singleDirectDeadHumanoidPhase(
  spell: SpellRecord,
): Either.Either<DirectActivationPhase, CharacterSheetIssue> {
  const phase = singleDirectCreaturePhase(spell);
  if (Either.isLeft(phase)) return Either.left(phase.left);
  const selection =
    phase.right.attachment.kind === "hole" &&
    phase.right.attachment.value.kind === "target"
      ? phase.right.attachment.value.selection
      : undefined;
  const rawSelection: unknown = selection;
  const stateFilter =
    isRecord(rawSelection) && Array.isArray(rawSelection["stateFilter"])
      ? rawSelection["stateFilter"]
      : undefined;
  const typeFilter =
    isRecord(rawSelection) && Array.isArray(rawSelection["typeFilter"])
      ? rawSelection["typeFilter"]
      : undefined;
  return stateFilter?.length === 1 &&
    stateFilter[0] === "dead" &&
    typeFilter?.length === 1 &&
    typeFilter[0] === "humanoid"
    ? Either.right(phase.right)
    : characterSheetIssue(
        "Reincarnate requires a direct dead-Humanoid target profile.",
      );
}

function isRemoveConditionEffect(
  effect: unknown,
): effect is RemoveConditionEffect {
  return (
    isRecord(effect) &&
    effect["kind"] === "remove_condition" &&
    "condition" in effect
  );
}

function isReviveDeadCreatureEffect(
  effect: unknown,
): effect is ReviveDeadCreatureEffect {
  return (
    isRecord(effect) &&
    effect["kind"] === "revive_dead_creature" &&
    isRecord(effect["deathWindow"]) &&
    typeof effect["hitPoints"] === "number" &&
    effect["spiritConsent"] === "can_refuse" &&
    effect["missingBodyParts"] === "not_restored" &&
    Array.isArray(effect["excludedDeathCauses"]) &&
    isRecord(effect["returningOngoingEffects"])
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function supportedGreaterRestorationConditions(
  effect: RemoveConditionEffect,
): readonly CharacterSheetGreaterRestorationCondition[] {
  const condition = effect.condition;
  const choices =
    isRecord(condition) &&
    condition["kind"] === "choose" &&
    Array.isArray(condition["from"])
      ? condition["from"]
      : Array.isArray(condition)
        ? condition
        : [condition];
  return GREATER_RESTORATION_CONDITIONS.filter((supported) =>
    choices.some((choice: unknown) => choice === supported),
  );
}

function raiseDeadEligibilityIssue(input: {
  readonly eligibility: CharacterSheetRaiseDeadEligibility;
  readonly revive: ReviveDeadCreatureEffect;
}): string | null {
  if (
    !Number.isInteger(input.eligibility.deadForDays) ||
    input.eligibility.deadForDays < 0 ||
    input.eligibility.deadForDays > input.revive.deathWindow.amount
  ) {
    return "Raise Dead requires a target dead no longer than the Spell Definition allows.";
  }
  if (input.eligibility.wasUndeadWhenDied) {
    return "Raise Dead cannot revive a creature that was Undead when it died.";
  }
  if (!input.eligibility.hasIntegralBodyParts) {
    return "Raise Dead fails when the target lacks body parts integral for survival.";
  }
  if (input.eligibility.spiritConsent !== "accepted") {
    return "Raise Dead requires the spirit to accept revival.";
  }
  return null;
}

function reincarnateEligibilityIssue(input: {
  readonly eligibility: CharacterSheetReincarnateEligibility;
  readonly deathWindowDays: number;
}): string | null {
  if (
    !Number.isInteger(input.eligibility.deadForDays) ||
    input.eligibility.deadForDays < 0 ||
    input.eligibility.deadForDays > input.deathWindowDays
  ) {
    return "Reincarnate requires a target dead no longer than the supported death window.";
  }
  if (
    input.eligibility.targetRemains !== "deadHumanoid" &&
    input.eligibility.targetRemains !== "pieceOfDeadHumanoid"
  ) {
    return "Reincarnate requires a dead Humanoid or a piece of one.";
  }
  if (input.eligibility.soulConsent !== "accepted") {
    return "Reincarnate requires the soul to accept revival.";
  }
  return null;
}

function hasPreparedSpellAccess(
  sheet: CharacterSheet,
  spellId: UnitRecord["id"],
): boolean {
  return (
    sheet.build.spellcasting?.sources.some((source) =>
      source.preparedSpells.some(
        (preparedSpellId) => preparedSpellId === spellId,
      ),
    ) ?? false
  );
}
