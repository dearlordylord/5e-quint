import {
  AbilityModifier,
  NonNegativeInteger,
  ResourceCount,
  SpellSlotLevel,
  abilityModifier,
  characterLevel,
  proficiencyBonusForCharacterLevel,
  resourceCount,
  spellSlotLevel,
  type ProficiencyBonus,
} from "@dnd/shared/types";
import { zeroHitPointReplacementUnitProfile } from "@dnd/shared-algebras/zero-hit-point-replacement-algebra";
import type {
  ActivationResource,
  ClassFeatureRecord,
  ClassName,
  EffectAtom,
  PointPoolResource,
  SpellRecord,
  SpawnedCreatureMechanics,
  UnitRecord,
} from "@dnd/surface/surface/types";
import {
  spellHasTopLevelRitualTag,
  supportedClassFeatureSpellFreeCastGrantsForUnit,
  topLevelSpellCastingTime,
  type SupportedClassFeatureSpellFreeCastProfile,
} from "@dnd/surface/surface/types";
import {
  type CharacterBattleClassLevel,
  type CharacterBattleClassLevels,
  characterBattleLevel,
} from "./character-class-level.ts";
export {
  parseCharacterBattleClassLevels,
  type CharacterBattleClassLevelsIssue,
} from "./character-class-level.ts";
import {
  battleBardicInspirationGrantSupportForUnit,
  battleFailedSavingThrowRerollSupportForUnit,
  battleReactionRollOrDamageReductionSupportForUnit,
  bonusActionDashTemporaryHitPointsProfileForUnit,
  requireCharacterClassLevel,
  unitHasAttackActionAreaSaveDamageReplacementResourceShape,
  type SupportedUnitFeatureFacts,
} from "./unit-feature-support.ts";
import {
  pactOfTheChainFindFamiliarFormEligibilityForSpell,
  type PactOfTheChainFindFamiliarFormEligibility,
} from "@dnd/surface/surface/find-familiar-forms";
import {
  battleResourcePoolExecutionRef,
  type BattleCharacterExecutionScopeRef,
  type BattleResourcePoolExecutionRef,
} from "./identity.ts";
import {
  admitPersistentArmorEffectSpell,
  type PersistentArmorEffectAdmission,
} from "./procedure-admission/persistent-armor-effect-facts.ts";
import {
  type CharacterBattleActivationResource,
  type CharacterBattleMetamagicOptionFact,
  type CharacterBattleMetamagicState,
  type CharacterBattleResourceExecutionFacts,
  type CharacterBattleResourceState,
  type LimitedUseCountActivationResource,
  type SupportedPointPoolResource,
  type UnlimitedActivationResource,
} from "./character-battle-resource-execution.ts";
import type { BattleSpellAdmissionSource } from "./battle-state-execution.ts";
export {
  characterBattleResourceIsPointPool,
  characterBattleResourceIsUnlimited,
  characterBattleResourceIsUseCount,
  characterBattleResourceUsage,
  spendCharacterPointPoolResource,
  spendCharacterResourceUse,
  type CharacterBattlePointPoolSpendIssue,
  type CharacterBattlePointPoolResourceState,
  type CharacterBattleMetamagicEffectKind,
  type CharacterBattleMetamagicOptionFact,
  type CharacterBattleMetamagicState,
  type CharacterBattleResourceExecutionFacts,
  type CharacterBattleResourceState,
  type CharacterBattleUseCountResourceState,
  type CharacterBattleUseCountResourceStateBase,
} from "./character-battle-resource-execution.ts";

// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.attack-action-area-save-damage-replacement unit-feature.magic-action-healing-pool
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.metamagic-battle-resource-bridge unit-feature.failed-saving-throw-reroll unit-feature.paladin-sacred-weapon

export { SORCERER_METAMAGIC_EFFECT_KINDS as CHARACTER_BATTLE_METAMAGIC_EFFECT_KINDS } from "@dnd/surface/surface/schema";

export type CharacterBattleUseCountResourceInit = {
  readonly unit: UnitRecord;
  readonly usesRemaining?: number;
  readonly capAbilityModifier?: AbilityModifier;
  readonly pointsRemaining?: never;
};

export type CharacterBattlePointPoolResourceInit = {
  readonly unit: UnitRecord;
  readonly pointsRemaining?: number;
  readonly usesRemaining?: never;
  readonly capAbilityModifier?: never;
};

export type CharacterBattleResourceInit =
  | CharacterBattleUseCountResourceInit
  | CharacterBattlePointPoolResourceInit;

export type CharacterBattleFeatureInit = SupportedUnitFeatureFacts & {
  readonly unit: UnitRecord;
};

type SorcererMetamagicMechanics = Extract<
  ClassFeatureRecord["mechanics"],
  { readonly family: "metamagic_options" }
>;
export type CharacterBattleMetamagicInit = {
  readonly sorceryPointResourceUnitId: UnitRecord["id"];
  readonly spellUseLimit: SorcererMetamagicMechanics["spellUseLimit"]["kind"];
  readonly knownOptions: readonly CharacterBattleMetamagicOptionFact[];
};

type SpellAccessGrant = Extract<
  EffectAtom,
  { readonly kind: "grant_spell_access" }
>;
export type PactOfTheChainFindFamiliarInvocationMode = {
  readonly action: "magicAction";
  readonly resource: "noSpellSlot";
};
export const PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE = {
  action: "magicAction",
  resource: "noSpellSlot",
} as const satisfies PactOfTheChainFindFamiliarInvocationMode;
type FamiliarFormCatalog = Extract<
  SpawnedCreatureMechanics["creature"],
  { readonly kind: "familiar_form_catalog" }
>;
type PactOfTheChainFindFamiliarSpellRecord = SpellRecord & {
  readonly mechanics: SpawnedCreatureMechanics & {
    readonly creature: FamiliarFormCatalog;
  };
};
type PactOfTheChainFindFamiliarSpellProfile = {
  readonly spell: PactOfTheChainFindFamiliarSpellRecord;
  readonly eligibleForms: PactOfTheChainFindFamiliarFormEligibility;
};
type PactOfTheChainFindFamiliarSpellProfileParseResult =
  | {
      readonly tag: "parsed";
      readonly profile: PactOfTheChainFindFamiliarSpellProfile;
    }
  | { readonly tag: "missingFamiliarFormCatalog" }
  | { readonly tag: "unsupported" };

/**
 * Composition-owned authored provenance for a mechanical battle resource.
 * This value is deliberately not part of BattleState or its snapshots.
 */
export type CharacterBattleResourceOwnership = {
  readonly resourcePoolRef: BattleResourcePoolExecutionRef;
  readonly unit: UnitRecord;
};

export type CharacterBattleResourceAdmission = {
  readonly states: readonly CharacterBattleResourceState[];
  readonly ownership: readonly CharacterBattleResourceOwnership[];
};

export function admitCharacterBattleResources(
  inits: readonly CharacterBattleResourceInit[],
  classLevels: CharacterBattleClassLevels,
  scopeRef: BattleCharacterExecutionScopeRef,
): CharacterBattleResourceAdmission {
  const admitted = inits.map((init, ordinal) => {
    const resourcePoolRef = battleResourcePoolExecutionRef(
      scopeRef,
      NonNegativeInteger(ordinal),
    );
    return {
      state: characterResourceState(init, classLevels, resourcePoolRef),
      ownership: { resourcePoolRef, unit: init.unit },
    };
  });
  return {
    states: admitted.map(({ state }) => state),
    ownership: admitted.map(({ ownership }) => ownership),
  };
}

export type CharacterBattleSpellSlotInit = {
  readonly spellLevel: number;
  readonly count: number;
};

export type CharacterBattleSpellSlotExpenditureInit = {
  readonly spellLevel: number;
  readonly expended: number;
};

export type CharacterBattleFeaturePreparedSpellInit = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly spell: SpellRecord;
};

export type CharacterBattleSpellbookRitualSpellAccessInit = {
  readonly tag: "spellbookRitual";
  readonly spell: SpellRecord;
  readonly featureUnitId: UnitRecord["id"];
};

export type CharacterBattleInvocationSpellAccessInit = {
  readonly tag: "armorOfShadowsMageArmor" | "pactOfTheChainFindFamiliar";
  readonly spell: SpellRecord;
};

export type CharacterBattleBookOfShadowsSpellAccessInit = {
  readonly tag: "bookOfShadows";
  readonly bookPresence: CharacterBattleBookOfShadowsPresence;
  readonly cantrips: readonly [SpellRecord, SpellRecord, SpellRecord];
  readonly ritualSpells: readonly [SpellRecord, SpellRecord];
  readonly spellcastingFocus: "book_of_shadows";
};

export type CharacterBattleBookOfShadowsPresence =
  | { readonly tag: "onPerson" }
  | { readonly tag: "notOnPerson" };

export type CharacterBattleInvocationSpellAccessState =
  | {
      readonly tag: "armorOfShadowsMageArmor";
      readonly admission: PersistentArmorEffectAdmission;
    }
  | {
      readonly tag: "pactOfTheChainFindFamiliar";
      readonly spell: PactOfTheChainFindFamiliarSpellRecord;
      readonly invocationMode: typeof PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE;
      readonly eligibleForms: PactOfTheChainFindFamiliarFormEligibility;
    };

type CharacterBattleInvocationSpellAccessParseResult =
  | {
      readonly tag: "parsed";
      readonly invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessState[];
    }
  | {
      readonly tag: "issue";
      readonly message: string;
    };

export type CharacterBattleSpellcastingStateInit = Omit<
  CharacterBattleSpellcastingInit,
  | "bookOfShadowsSpellAccesses"
  | "invocationSpellAccesses"
  | "spellbookRitualSpellAccesses"
> & {
  readonly spellbookRitualSpellAccesses: readonly CharacterBattleSpellbookRitualSpellAccessInit[];
  readonly bookOfShadowsSpellAccesses: readonly CharacterBattleBookOfShadowsSpellAccessInit[];
  readonly invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessState[];
};

export type CharacterBattleSpellSlotState = {
  readonly spellLevel: SpellSlotLevel;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

export type CharacterBattleAdmittedSpell = {
  readonly spell: SpellRecord;
  readonly classFeatureFreeCastResourcePoolRefs: readonly BattleResourcePoolExecutionRef[];
};

export type CharacterBattleSpellcastingInit = {
  readonly sourceClassName: ClassName;
  readonly spellcastingAbilityModifier: number;
  readonly proficiencyBonus: ProficiencyBonus;
  readonly canCastSpells: boolean;
  readonly cantrips: readonly SpellRecord[];
  readonly preparedSpells: readonly SpellRecord[];
  readonly featurePreparedSpells: readonly CharacterBattleFeaturePreparedSpellInit[];
  readonly spellbookRitualSpellAccesses: readonly CharacterBattleSpellbookRitualSpellAccessInit[];
  readonly bookOfShadowsSpellAccesses?: readonly CharacterBattleBookOfShadowsSpellAccessInit[];
  readonly invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessInit[];
  readonly spellSlots: readonly CharacterBattleSpellSlotInit[];
  readonly spellSlotExpenditures?: readonly CharacterBattleSpellSlotExpenditureInit[];
};

export type CharacterBattleSpellcastingState = Omit<
  CharacterBattleSpellcastingInit,
  | "spellcastingAbilityModifier"
  | "cantrips"
  | "preparedSpells"
  | "featurePreparedSpells"
  | "spellbookRitualSpellAccesses"
  | "bookOfShadowsSpellAccesses"
  | "invocationSpellAccesses"
  | "spellSlots"
  | "spellSlotExpenditures"
> & {
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly cantrips: readonly CharacterBattleAdmittedSpell[];
  readonly preparedSpells: readonly CharacterBattleAdmittedSpell[];
  readonly spellbookRitualSpellAccesses: readonly CharacterBattleSpellbookRitualSpellAccessInit[];
  readonly bookOfShadowsSpellAccesses: readonly CharacterBattleBookOfShadowsSpellAccessInit[];
  readonly invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessState[];
  readonly spellSlots: readonly CharacterBattleSpellSlotState[];
};

export type CharacterBattleSpellcastingExecutionState = {
  readonly sourceClassName: ClassName;
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly proficiencyBonus: ProficiencyBonus;
  readonly canCastSpells: boolean;
  readonly spellSlots: readonly CharacterBattleSpellSlotState[];
  readonly pactOfTheChainFindFamiliarInvocationMode: PactOfTheChainFindFamiliarInvocationMode | null;
};

export function characterSpellcastingExecutionState(
  state: CharacterBattleSpellcastingState,
): CharacterBattleSpellcastingExecutionState {
  const hasPactOfTheChainFindFamiliar = state.invocationSpellAccesses.some(
    (access) => access.tag === "pactOfTheChainFindFamiliar",
  );
  return {
    sourceClassName: state.sourceClassName,
    spellcastingAbilityModifier: state.spellcastingAbilityModifier,
    proficiencyBonus: state.proficiencyBonus,
    canCastSpells: state.canCastSpells,
    spellSlots: state.spellSlots,
    pactOfTheChainFindFamiliarInvocationMode: hasPactOfTheChainFindFamiliar
      ? PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE
      : null,
  };
}

export function effectiveCharacterBattleCantrips(
  spellcasting: Pick<
    CharacterBattleSpellcastingState,
    "bookOfShadowsSpellAccesses" | "cantrips"
  >,
): readonly CharacterBattleAdmittedSpell[] {
  return distinctAdmittedSpellsById([
    ...spellcasting.cantrips,
    ...bookOfShadowsOnPersonAccesses(spellcasting).flatMap((access) =>
      access.cantrips.map((spell) => ({
        spell,
        classFeatureFreeCastResourcePoolRefs: [],
      })),
    ),
  ]);
}

export function effectiveCharacterBattlePreparedSpells(
  spellcasting: Pick<
    CharacterBattleSpellcastingState,
    "bookOfShadowsSpellAccesses" | "preparedSpells"
  >,
): readonly CharacterBattleAdmittedSpell[] {
  return distinctAdmittedSpellsById([
    ...spellcasting.preparedSpells,
    ...bookOfShadowsOnPersonAccesses(spellcasting).flatMap((access) =>
      access.ritualSpells.map((spell) => ({
        spell,
        classFeatureFreeCastResourcePoolRefs: [],
      })),
    ),
  ]);
}

function distinctAdmittedSpellsById(
  spells: readonly CharacterBattleAdmittedSpell[],
): readonly CharacterBattleAdmittedSpell[] {
  const seen = new Set<SpellRecord["id"]>();
  const result: CharacterBattleAdmittedSpell[] = [];
  for (const spell of spells) {
    if (seen.has(spell.spell.id)) continue;
    seen.add(spell.spell.id);
    result.push(spell);
  }
  return result;
}

export function admittedSpellToAdmissionSource(
  admitted: CharacterBattleAdmittedSpell,
): BattleSpellAdmissionSource {
  return {
    id: admitted.spell.id,
    name: admitted.spell.name,
    mechanics: admitted.spell.mechanics,
    classFeatureFreeCastResourcePoolRefs:
      admitted.classFeatureFreeCastResourcePoolRefs,
  };
}

export function spellRecordToAdmissionSource(
  spell: SpellRecord,
): BattleSpellAdmissionSource {
  return {
    id: spell.id,
    name: spell.name,
    mechanics: spell.mechanics,
    classFeatureFreeCastResourcePoolRefs: [],
  };
}

function bookOfShadowsOnPersonAccesses(
  spellcasting: Pick<
    CharacterBattleSpellcastingState,
    "bookOfShadowsSpellAccesses"
  >,
): readonly CharacterBattleBookOfShadowsSpellAccessInit[] {
  return spellcasting.bookOfShadowsSpellAccesses.filter(
    (access) => access.bookPresence.tag === "onPerson",
  );
}

export function characterBattleInvocationSpellAccessInitIssue(
  invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessInit[],
): string | null {
  const parsed = parseCharacterBattleInvocationSpellAccesses(
    invocationSpellAccesses,
  );
  return parsed.tag === "issue" ? parsed.message : null;
}

export function characterBattleSpellbookRitualSpellAccessInitIssue(
  spellbookRitualSpellAccesses: readonly CharacterBattleSpellbookRitualSpellAccessInit[],
): string | null {
  const spellIds = new Set<SpellRecord["id"]>();
  for (const access of spellbookRitualSpellAccesses) {
    if (access.tag !== "spellbookRitual") {
      return "Spellbook Ritual Spell Access must carry spellbook Ritual facts.";
    }
    if (
      access.spell.mechanics.level < 1 ||
      !spellHasTopLevelRitualTag(access.spell)
    ) {
      return "Spellbook Ritual Spell Access must reference ritual-tagged leveled Spell Definitions.";
    }
    if (spellIds.has(access.spell.id)) {
      return "Spellbook Ritual Spell Access spell ids must be unique.";
    }
    spellIds.add(access.spell.id);
  }
  return null;
}

export function parseCharacterBattleInvocationSpellAccesses(
  invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessInit[],
): CharacterBattleInvocationSpellAccessParseResult {
  const parsed: CharacterBattleInvocationSpellAccessState[] = [];
  for (const access of invocationSpellAccesses) {
    if (access.tag === "armorOfShadowsMageArmor") {
      const admission = admitPersistentArmorEffectSpell(access.spell);
      if (admission === null) {
        return {
          tag: "issue",
          message: "Armor of Shadows Spell Access must grant Mage Armor.",
        };
      }
      parsed.push({
        tag: access.tag,
        admission,
      });
      continue;
    }
    const profileResult = pactOfTheChainFindFamiliarSpellProfileForSpell(
      access.spell,
    );
    if (profileResult.tag === "missingFamiliarFormCatalog") {
      return {
        tag: "issue",
        message:
          "Pact of the Chain Find Familiar access requires familiar form catalog references.",
      };
    }
    if (profileResult.tag === "unsupported") {
      return {
        tag: "issue",
        message: "Pact of the Chain Spell Access must grant Find Familiar.",
      };
    }
    const profile = profileResult.profile;
    parsed.push({
      tag: access.tag,
      spell: profile.spell,
      invocationMode: PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE,
      eligibleForms: profile.eligibleForms,
    });
  }
  return {
    tag: "parsed",
    invocationSpellAccesses: parsed,
  };
}

export function characterResourceState(
  input: CharacterBattleResourceInit,
  classLevels: CharacterBattleClassLevels,
  resourcePoolRef: BattleResourcePoolExecutionRef,
): CharacterBattleResourceState {
  const initIssue = characterBattleResourceInitIssue(input, classLevels);
  if (initIssue !== null) {
    throw new Error(initIssue);
  }
  const resource = characterBattleResourceForUnit(input.unit);
  const base = { resourcePoolRef };
  if (resource.kind === "point_pool") {
    const defaultPointsRemaining = characterBattleResourceMaxPoints({
      unit: input.unit,
      classLevels,
    });
    if (defaultPointsRemaining === undefined) {
      throw new Error(
        "Point-pool character battle resource requires a finite cap.",
      );
    }
    return {
      ...base,
      resource,
      pointsRemaining:
        input.pointsRemaining === undefined
          ? defaultPointsRemaining
          : resourceCount(input.pointsRemaining),
    };
  }
  const useCountBase = {
    ...base,
    usedThisTurn: false,
  };
  if (activationResourceIsUnlimited(resource)) {
    return { ...useCountBase, resource };
  }
  if (!activationResourceIsLimited(resource)) {
    throw new Error("Character battle resource has an unsupported cap shape.");
  }
  if (input.usesRemaining !== undefined) {
    return {
      ...useCountBase,
      resource,
      usesRemaining: resourceCount(input.usesRemaining),
    };
  }
  const defaultUsesRemaining = characterBattleResourceMaxUses({
    unit: input.unit,
    classLevels,
    ...(input.capAbilityModifier === undefined
      ? {}
      : { capAbilityModifier: input.capAbilityModifier }),
  });
  if (defaultUsesRemaining === undefined) {
    throw new Error("Limited character battle resource requires a finite cap.");
  }
  return {
    ...useCountBase,
    resource,
    usesRemaining: defaultUsesRemaining,
  };
}

export function characterBattleResourceMaxUses(input: {
  readonly unit: UnitRecord;
  readonly classLevels: CharacterBattleClassLevels;
  readonly capAbilityModifier?: AbilityModifier;
}): ResourceCount | undefined {
  const resource = characterBattleResourceForUnit(input.unit);
  if (resource.kind === "point_pool") {
    return undefined;
  }
  if (activationResourceIsUnlimited(resource)) {
    return undefined;
  }
  if (!activationResourceIsLimited(resource)) {
    throw new Error("Character battle resource has an unsupported cap shape.");
  }
  return supportedResourceCapForLevel(
    resource,
    characterBattleResourceLevel(input.unit, input.classLevels),
    input.capAbilityModifier,
  );
}

export function characterBattleResourceMaxPoints(input: {
  readonly unit: UnitRecord;
  readonly classLevels: CharacterBattleClassLevels;
  readonly capAbilityModifier?: AbilityModifier;
}): ResourceCount | undefined {
  const resource = characterBattleResourceForUnit(input.unit);
  if (resource.kind !== "point_pool") {
    return undefined;
  }
  return supportedResourceCapForLevel(
    resource,
    characterBattleResourceLevel(input.unit, input.classLevels),
    input.capAbilityModifier,
  );
}

function characterBattleResourceLevel(
  unit: UnitRecord,
  classLevels: CharacterBattleClassLevels,
): number {
  const unitClassLevel =
    unit.kind === "class_feature"
      ? requireCharacterClassLevel(classLevels, unit.className)
      : undefined;
  return unitClassLevel ?? Number(characterBattleLevel(classLevels));
}

export function characterBattleResourceInitIssue(
  input: CharacterBattleResourceInit,
  classLevels: CharacterBattleClassLevels,
): string | null {
  const resource = characterBattleResourceForUnitOrNull(input.unit);
  if (resource === null) {
    return "Character battle resources must be supported resource Units.";
  }
  if (
    resource.kind === "point_pool" &&
    (input.usesRemaining !== undefined ||
      input.capAbilityModifier !== undefined)
  ) {
    return "Point-pool character battle resources must not carry use-count state.";
  }
  if (resource.kind !== "point_pool" && input.pointsRemaining !== undefined) {
    return "Use-count character battle resources must not carry point-pool state.";
  }
  if (resource.kind === "point_pool" && input.pointsRemaining !== undefined) {
    if (!Number.isInteger(input.pointsRemaining) || input.pointsRemaining < 0) {
      return "Point-pool character battle resource remaining points must be a nonnegative integer.";
    }
    const maxPoints = characterBattleResourceMaxPoints({
      unit: input.unit,
      classLevels,
    });
    if (maxPoints === undefined) {
      return "Point-pool character battle resource requires a finite cap.";
    }
    if (input.pointsRemaining > maxPoints) {
      return "Point-pool character battle resource remaining points must not exceed its maximum.";
    }
  }
  return resource.kind === "use_count" &&
    resource.cap.kind === "ability_modifier" &&
    input.usesRemaining === undefined &&
    input.capAbilityModifier === undefined
    ? "Ability-modifier resource cap requires the projected ability modifier."
    : null;
}

export function characterBattleMetamagicInitIssue(input: {
  readonly metamagic: CharacterBattleMetamagicInit | undefined;
  readonly resources: readonly CharacterBattleResourceInit[];
}): string | null {
  if (input.metamagic === undefined) {
    return null;
  }
  if (input.metamagic.knownOptions.length === 0) {
    return "Metamagic battle state requires at least one known option fact.";
  }
  const effectKinds = new Set<
    CharacterBattleMetamagicOptionFact["effectKind"]
  >();
  for (const option of input.metamagic.knownOptions) {
    if (effectKinds.has(option.effectKind)) {
      return "Metamagic battle option facts must not duplicate effect kinds.";
    }
    effectKinds.add(option.effectKind);
    if (
      !Number.isInteger(option.sorceryPointCost) ||
      option.sorceryPointCost <= 0
    ) {
      return "Metamagic battle option facts require positive Sorcery Point costs.";
    }
  }
  const sorceryPointResource = input.resources.find(
    (resource) =>
      resource.unit.id === input.metamagic?.sorceryPointResourceUnitId,
  );
  if (sorceryPointResource === undefined) {
    return "Metamagic battle state requires its shared Sorcery Point resource.";
  }
  const resource = characterBattleResourceForUnitOrNull(
    sorceryPointResource.unit,
  );
  return resource?.kind === "point_pool"
    ? null
    : "Metamagic battle state must reference a point-pool Sorcery Point resource.";
}

export function characterBattleMetamagicState(
  metamagic: CharacterBattleMetamagicInit | undefined,
  resources: readonly CharacterBattleResourceState[],
  ownership: readonly CharacterBattleResourceOwnership[],
): CharacterBattleMetamagicState | undefined {
  if (metamagic === undefined) return undefined;
  const owner = ownership.find(
    (candidate) => candidate.unit.id === metamagic.sorceryPointResourceUnitId,
  );
  const resource = resources.find(
    (candidate) => candidate.resourcePoolRef === owner?.resourcePoolRef,
  );
  return resource === undefined
    ? undefined
    : {
        sorceryPointResourcePoolRef: resource.resourcePoolRef,
        spellUseLimit: metamagic.spellUseLimit,
        knownOptions: metamagic.knownOptions,
      };
}

export function characterBattleResourceForUnit(
  unit: UnitRecord,
): CharacterBattleResourceExecutionFacts {
  const resource = characterBattleResourceForUnitOrNull(unit);
  if (resource === null) {
    throw new Error(
      "Character battle resources must be supported resource Units.",
    );
  }
  return resource;
}

export function characterBattleResourceSupportedForUnit(
  unit: UnitRecord,
): boolean {
  return characterBattleResourceForUnitOrNull(unit) !== null;
}

export function unitIsSupportedClassFeatureSpellFreeCastResource(
  unit: UnitRecord,
): boolean {
  return classFeatureSpellFreeCastResource(unit) !== null;
}

function characterBattleResourceForUnitOrNull(
  unit: UnitRecord,
): CharacterBattleResourceExecutionFacts | null {
  const freeCastResource = classFeatureSpellFreeCastResource(unit);
  if (freeCastResource !== null) {
    return freeCastResource;
  }
  const zeroHitPointReplacement = zeroHitPointReplacementUnitProfile(unit);
  if (zeroHitPointReplacement !== null) {
    return activationResourceIsSupportedByBattleForUnit(
      unit,
      zeroHitPointReplacement.resource,
    )
      ? zeroHitPointReplacement.resource
      : null;
  }
  if (
    unit.kind === "species_trait" &&
    unit.mechanics.family === "activation" &&
    (bonusActionDashTemporaryHitPointsProfileForUnit(unit) !== null ||
      unitHasAttackActionAreaSaveDamageReplacementResourceShape(unit))
  ) {
    const resource = unit.mechanics.resource;
    if (resource !== undefined) {
      return activationResourceIsSupportedByBattleForUnit(unit, resource)
        ? resource
        : null;
    }
  }
  if (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "resource_pool" &&
    pointPoolResourceIsSupportedByBattle(unit.mechanics.resource)
  ) {
    return unit.mechanics.resource;
  }
  if (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "resource_container"
  ) {
    return activationResourceIsSupportedByBattleForUnit(
      unit,
      unit.mechanics.resource,
    )
      ? unit.mechanics.resource
      : null;
  }
  if (
    unit.kind !== "class_feature" ||
    (unit.mechanics.family !== "activation" &&
      unit.mechanics.family !== "failed_saving_throw_reroll" &&
      unit.mechanics.family !== "reaction_roll_or_damage_reduction") ||
    !("resource" in unit.mechanics) ||
    unit.mechanics.resource === undefined
  ) {
    return null;
  }
  return activationResourceIsSupportedByBattleForUnit(
    unit,
    unit.mechanics.resource,
  )
    ? unit.mechanics.resource
    : null;
}

function classFeatureSpellFreeCastResource(
  unit: UnitRecord,
): LimitedUseCountActivationResource | null {
  const grants = supportedClassFeatureSpellFreeCastGrantsForUnit(unit);
  const freeCastGrant = grants?.freeCastGrant;
  if (freeCastGrant === undefined) {
    return null;
  }
  return {
    kind: "use_count",
    cap: { kind: "fixed", uses: freeCastGrant.count },
  };
}

export function classFeatureSpellFreeCastProfileForResource(
  resource: CharacterBattleResourceOwnership,
): SupportedClassFeatureSpellFreeCastProfile | null {
  return classFeatureSpellFreeCastProfileForUnit(resource.unit);
}

export function characterResourceIsClassFeatureFreeCastForSpell(
  resource: CharacterBattleResourceOwnership,
  spellId: SpellRecord["id"],
): boolean {
  return (
    classFeatureSpellFreeCastProfileForResource(resource)?.spellId === spellId
  );
}

function classFeatureSpellFreeCastProfileForUnit(
  unit: UnitRecord,
): SupportedClassFeatureSpellFreeCastProfile | null {
  return supportedClassFeatureSpellFreeCastGrantsForUnit(unit)?.profile ?? null;
}

function activationResourceIsUnlimited(
  resource: ActivationResource,
): resource is UnlimitedActivationResource {
  return resource.kind === "use_count" && resource.cap.kind === "unlimited";
}

function activationResourceIsLimited(
  resource: CharacterBattleActivationResource,
): resource is LimitedUseCountActivationResource {
  return !activationResourceIsUnlimited(resource);
}

function activationResourceIsSupportedByBattle(
  resource: ActivationResource,
): resource is CharacterBattleActivationResource {
  return (
    resource.kind === "use_count" &&
    (resource.cap.kind === "fixed" ||
      resource.cap.kind === "proficiency_bonus" ||
      resource.cap.kind === "linear_per_level" ||
      resource.cap.kind === "threshold_tiers" ||
      resource.cap.kind === "ability_modifier" ||
      resource.cap.kind === "unlimited")
  );
}

function activationResourceIsSupportedByBattleForUnit(
  unit: UnitRecord,
  resource: ActivationResource,
): resource is CharacterBattleActivationResource {
  if (!activationResourceIsSupportedByBattle(resource)) {
    return false;
  }
  return (
    resource.cap.kind !== "ability_modifier" ||
    unitHasSupportedAbilityModifierBattleResourceProfile(unit)
  );
}

function pointPoolResourceIsSupportedByBattle(
  resource: PointPoolResource,
): resource is SupportedPointPoolResource {
  return (
    resource.kind === "point_pool" &&
    (resource.cap.kind === "fixed" ||
      resource.cap.kind === "proficiency_bonus" ||
      resource.cap.kind === "linear_per_level" ||
      resource.cap.kind === "threshold_tiers")
  );
}

function unitHasSupportedAbilityModifierBattleResourceProfile(
  unit: UnitRecord,
): boolean {
  if (unit.kind !== "class_feature") {
    return false;
  }
  const reactionSupport =
    battleReactionRollOrDamageReductionSupportForUnit(unit);
  if (reactionSupport !== null && reactionSupport !== "unsupported") {
    return true;
  }
  const bardicInspirationSupport =
    battleBardicInspirationGrantSupportForUnit(unit);
  const failedSavingThrowRerollSupport =
    battleFailedSavingThrowRerollSupportForUnit(unit);
  return (
    (bardicInspirationSupport !== null &&
      bardicInspirationSupport !== "unsupported") ||
    (failedSavingThrowRerollSupport !== null &&
      failedSavingThrowRerollSupport !== "unsupported")
  );
}

function admittedSpellWithFreeCastRefs(
  spell: SpellRecord,
  resources: readonly CharacterBattleResourceState[],
  resourceOwnership: readonly CharacterBattleResourceOwnership[],
): CharacterBattleAdmittedSpell {
  return {
    spell,
    classFeatureFreeCastResourcePoolRefs: resourceOwnership.flatMap((owner) => {
      const resource = resources.find(
        (candidate) => candidate.resourcePoolRef === owner.resourcePoolRef,
      );
      return resource !== undefined &&
        characterResourceIsClassFeatureFreeCastForSpell(owner, spell.id)
        ? [resource.resourcePoolRef]
        : [];
    }),
  };
}

export function characterSpellcastingState(
  input: CharacterBattleSpellcastingStateInit,
  classLevels: readonly CharacterBattleClassLevel[],
  spellAccessUnits: readonly (
    | CharacterBattleResourceInit
    | CharacterBattleFeatureInit
  )[],
  resources: readonly CharacterBattleResourceState[],
  resourceOwnership: readonly CharacterBattleResourceOwnership[],
): CharacterBattleSpellcastingState {
  const spellSlotLevels = new Set<number>();
  for (const slot of input.spellSlots) {
    if (
      !Number.isInteger(slot.spellLevel) ||
      slot.spellLevel < 1 ||
      slot.spellLevel > 9 ||
      !Number.isInteger(slot.count) ||
      slot.count < 0
    ) {
      throw new Error(
        "Spell Slot level must be 1-9 and count must be a non-negative integer.",
      );
    }
    if (spellSlotLevels.has(slot.spellLevel)) {
      throw new Error("Spell Slot levels must be unique.");
    }
    spellSlotLevels.add(slot.spellLevel);
  }

  const spellSlotExpenditures =
    input.spellSlotExpenditures ??
    input.spellSlots.map((slot) => ({
      spellLevel: slot.spellLevel,
      expended: resourceCount(0),
    }));
  if (spellSlotExpenditures.length !== input.spellSlots.length) {
    throw new Error("Spell Slot expenditure state must match slot capacity.");
  }
  const expenditureLevels = new Set<number>();
  for (const expenditure of spellSlotExpenditures) {
    const capacity = input.spellSlots.find(
      (slot) => slot.spellLevel === expenditure.spellLevel,
    );
    if (
      capacity === undefined ||
      expenditureLevels.has(expenditure.spellLevel)
    ) {
      throw new Error("Spell Slot expenditure state must match slot capacity.");
    }
    expenditureLevels.add(expenditure.spellLevel);
    if (
      !Number.isInteger(expenditure.expended) ||
      expenditure.expended < 0 ||
      expenditure.expended > capacity.count
    ) {
      throw new Error(
        "Spell Slot expenditure must be an integer between zero and count.",
      );
    }
  }
  for (const featureSpell of input.featurePreparedSpells) {
    if (
      !spellAccessUnits.some((source) =>
        unitGrantsPreparedSpellAccess(
          source.unit,
          featureSpell.sourceUnitId,
          featureSpell.spell.id,
        ),
      )
    ) {
      throw new Error(
        "Feature-prepared spells must trace to a character Unit grant.",
      );
    }
  }
  return {
    sourceClassName: spellcastingSourceClassName(
      input.sourceClassName,
      classLevels,
    ),
    spellcastingAbilityModifier: abilityModifier(
      input.spellcastingAbilityModifier,
    ),
    proficiencyBonus: input.proficiencyBonus,
    canCastSpells: input.canCastSpells,
    cantrips: input.cantrips.map((spell) =>
      admittedSpellWithFreeCastRefs(spell, resources, resourceOwnership),
    ),
    preparedSpells: preparedSpellsWithFeatureAccess(
      input.preparedSpells,
      input.featurePreparedSpells,
    ).map((spell) =>
      admittedSpellWithFreeCastRefs(spell, resources, resourceOwnership),
    ),
    spellbookRitualSpellAccesses: input.spellbookRitualSpellAccesses,
    bookOfShadowsSpellAccesses: input.bookOfShadowsSpellAccesses ?? [],
    invocationSpellAccesses: input.invocationSpellAccesses,
    spellSlots: input.spellSlots.map((slot) => {
      const expenditure = spellSlotExpenditures.find(
        (candidate) => candidate.spellLevel === slot.spellLevel,
      );
      if (expenditure === undefined) {
        throw new Error(
          "Spell Slot expenditure state must match slot capacity.",
        );
      }
      return {
        spellLevel: spellSlotLevel(slot.spellLevel),
        count: resourceCount(slot.count),
        expended: resourceCount(expenditure.expended),
      };
    }),
  };
}

function pactOfTheChainFindFamiliarSpellProfileForSpell(
  spell: SpellRecord,
): PactOfTheChainFindFamiliarSpellProfileParseResult {
  const components = spell.mechanics.components;
  const castingTime = topLevelSpellCastingTime(spell.mechanics);

  if (spell.mechanics.family !== "spawned_creature") {
    return { tag: "unsupported" };
  }
  if (spell.mechanics.creature.kind !== "familiar_form_catalog") {
    return { tag: "missingFamiliarFormCatalog" };
  }
  if (
    spell.mechanics.level !== 1 ||
    castingTime?.kind !== "action" ||
    !("materialCostGp" in components) ||
    !("materialConsumed" in components) ||
    components.materialCostGp !== 10 ||
    components.materialConsumed !== true
  ) {
    return { tag: "unsupported" };
  }
  const eligibleForms =
    pactOfTheChainFindFamiliarFormEligibilityForSpell(spell);
  return eligibleForms === null
    ? { tag: "missingFamiliarFormCatalog" }
    : {
        tag: "parsed",
        profile: {
          spell: {
            ...spell,
            mechanics: {
              ...spell.mechanics,
              creature: spell.mechanics.creature,
            },
          },
          eligibleForms,
        },
      };
}

function unitGrantsPreparedSpellAccess(
  unit: UnitRecord,
  sourceUnitId: UnitRecord["id"],
  spellId: SpellRecord["id"],
): boolean {
  return (
    unit.id === sourceUnitId &&
    unit.kind === "class_feature" &&
    unit.mechanics.family === "passive" &&
    unit.mechanics.grants.some(
      (grant): grant is SpellAccessGrant =>
        grant.kind === "grant_spell_access" &&
        grant.mode === "prepared" &&
        grant.spellId === spellId,
    )
  );
}

function preparedSpellsWithFeatureAccess(
  preparedSpells: readonly SpellRecord[],
  featurePreparedSpells: readonly CharacterBattleFeaturePreparedSpellInit[],
): readonly SpellRecord[] {
  return distinctSpellsById([
    ...preparedSpells,
    ...featurePreparedSpells.map((featureSpell) => featureSpell.spell),
  ]);
}

function distinctSpellsById(
  spells: readonly SpellRecord[],
): readonly SpellRecord[] {
  const seenSpellIds = new Set<SpellRecord["id"]>();
  const distinct: SpellRecord[] = [];
  for (const spell of spells) {
    if (!seenSpellIds.has(spell.id)) {
      seenSpellIds.add(spell.id);
      distinct.push(spell);
    }
  }
  return distinct;
}

function spellcastingSourceClassName(
  sourceClassName: ClassName,
  classLevels: readonly CharacterBattleClassLevel[],
): ClassName {
  if (
    classLevels.some((classLevel) => classLevel.className === sourceClassName)
  ) {
    return sourceClassName;
  }
  throw new Error(
    "Battle spellcasting source class must match a character class level.",
  );
}

function supportedResourceCapForLevel(
  resource: LimitedUseCountActivationResource | SupportedPointPoolResource,
  level: number,
  capAbilityModifier: AbilityModifier | undefined,
): ResourceCount {
  if (resource.cap.kind === "fixed") {
    return resourceCount(resource.cap.uses);
  }
  if (resource.cap.kind === "proficiency_bonus") {
    return resourceCount(
      proficiencyBonusForCharacterLevel(characterLevel(level)),
    );
  }
  if (resource.cap.kind === "linear_per_level") {
    return resourceCount(
      resource.cap.base +
        Math.max(0, level - resource.cap.startingAtLevel) *
          resource.cap.perLevel,
    );
  }
  if (resource.cap.kind === "ability_modifier") {
    if (capAbilityModifier === undefined) {
      throw new Error(
        "Ability-modifier resource cap requires the projected ability modifier.",
      );
    }
    return resourceCount(
      Math.max(
        resource.cap.minimum === undefined ? 1 : resource.cap.minimum,
        1,
        Number(abilityModifier(capAbilityModifier)),
      ),
    );
  }

  return resourceCount(
    resource.cap.tiers.reduce(
      (cap, tier) => (level >= tier.atLevel ? tier.value : cap),
      resource.cap.base,
    ),
  );
}
