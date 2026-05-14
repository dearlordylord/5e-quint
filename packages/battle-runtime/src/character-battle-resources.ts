import {
  AbilityModifier,
  ClassLevel,
  ResourceCount,
  SpellSlotLevel,
  abilityModifier,
  resourceCount,
  spellSlotLevel,
  type ProficiencyBonus,
} from "@dnd/shared/types";
import { zeroHitPointReplacementUnitProfile } from "@dnd/shared-algebras/zero-hit-point-replacement-algebra";
import type {
  ActivationResource,
  ClassName,
  EffectAtom,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { favoredEnemyHuntersMarkFreeCastGrantsForUnit } from "@dnd/surface/surface/types";
import {
  type CharacterBattleClassLevel,
  type CharacterBattleClassLevelInit,
} from "./character-class-level.ts";
import {
  battleBardicInspirationGrantSupportForUnit,
  battleReactionRollOrDamageReductionSupportForUnit,
  bonusActionDashTemporaryHitPointsProfileForUnit,
  requireCharacterClassLevel,
} from "./unit-feature-support.ts";

export type CharacterBattleResourceInit = {
  readonly unit: UnitRecord;
  readonly usesRemaining?: number;
  readonly capAbilityModifier?: AbilityModifier;
};

export type CharacterBattleFeatureInit = {
  readonly unit: UnitRecord;
};

type UseCountActivationResource = Extract<
  ActivationResource,
  { readonly kind: "use_count" }
>;
type SupportedUseCountActivationResource = UseCountActivationResource & {
  readonly cap: Extract<
    UseCountActivationResource["cap"],
    | { readonly kind: "fixed" }
    | { readonly kind: "proficiency_bonus" }
    | { readonly kind: "linear_per_level" }
    | { readonly kind: "threshold_tiers" }
    | { readonly kind: "ability_modifier" }
    | { readonly kind: "unlimited" }
  >;
};
type LimitedUseCountActivationResource = SupportedUseCountActivationResource & {
  readonly cap: Exclude<
    SupportedUseCountActivationResource["cap"],
    { readonly kind: "unlimited" }
  >;
};
type UnlimitedActivationResource = SupportedUseCountActivationResource & {
  readonly cap: { readonly kind: "unlimited" };
};
type CharacterBattleActivationResource =
  | LimitedUseCountActivationResource
  | UnlimitedActivationResource;
type SpellAccessGrant = Extract<
  EffectAtom,
  { readonly kind: "grant_spell_access" }
>;
const MAGE_ARMOR_SPELL_ID = "mage_armor" satisfies SpellRecord["id"];
const ARMOR_OF_SHADOWS_SPELL_NAME = "Mage Armor" satisfies SpellRecord["name"];
const ARMOR_OF_SHADOWS_SPELL_PROVENANCE_SECTION =
  "Spells/Descriptions-M-P#Mage Armor";
const FIND_FAMILIAR_SPELL_ID = "find_familiar" satisfies SpellRecord["id"];
const FIND_FAMILIAR_SPELL_NAME = "Find Familiar" satisfies SpellRecord["name"];
const FIND_FAMILIAR_SPELL_PROVENANCE_SECTION =
  "Spells/Descriptions-E-L#Find Familiar";
export const FIND_FAMILIAR_NAMED_FORM_REFS = [
  "bat",
  "cat",
  "frog",
  "hawk",
  "lizard",
  "octopus",
  "owl",
  "rat",
  "raven",
  "spider",
  "weasel",
] as const;
export const FIND_FAMILIAR_ADDITIONAL_FORM_ELIGIBILITY = {
  kind: "challengeRatingZeroBeast",
} as const;
export const PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS = [
  "imp",
  "pseudodragon",
  "quasit",
  "skeleton",
  "sphinx_of_wonder",
  "sprite",
  "venomous_snake",
] as const;
export type FindFamiliarNamedFormRef =
  (typeof FIND_FAMILIAR_NAMED_FORM_REFS)[number];
export type FindFamiliarAdditionalFormEligibility =
  typeof FIND_FAMILIAR_ADDITIONAL_FORM_ELIGIBILITY;
export type PactOfTheChainSpecialFormRef =
  (typeof PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS)[number];
export type PactOfTheChainFindFamiliarFormEligibility = {
  readonly namedNormalForms: typeof FIND_FAMILIAR_NAMED_FORM_REFS;
  readonly additionalNormalFormEligibility: FindFamiliarAdditionalFormEligibility;
  readonly specialForms: typeof PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS;
};
export type PactOfTheChainFindFamiliarInvocationMode = {
  readonly action: "magicAction";
  readonly resource: "noSpellSlot";
};
export const PACT_OF_THE_CHAIN_FIND_FAMILIAR_FORM_ELIGIBILITY = {
  namedNormalForms: FIND_FAMILIAR_NAMED_FORM_REFS,
  additionalNormalFormEligibility: FIND_FAMILIAR_ADDITIONAL_FORM_ELIGIBILITY,
  specialForms: PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS,
} as const satisfies PactOfTheChainFindFamiliarFormEligibility;
export const PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE = {
  action: "magicAction",
  resource: "noSpellSlot",
} as const satisfies PactOfTheChainFindFamiliarInvocationMode;
type ArmorOfShadowsMageArmorSpellRecord = SpellRecord & {
  readonly id: typeof MAGE_ARMOR_SPELL_ID;
  readonly name: typeof ARMOR_OF_SHADOWS_SPELL_NAME;
  readonly provenance: Extract<
    SpellRecord["provenance"],
    { readonly kind: "srd-5.2.1" }
  > & {
    readonly section: typeof ARMOR_OF_SHADOWS_SPELL_PROVENANCE_SECTION;
  };
};
type PactOfTheChainFindFamiliarSpellRecord = SpellRecord & {
  readonly id: typeof FIND_FAMILIAR_SPELL_ID;
  readonly name: typeof FIND_FAMILIAR_SPELL_NAME;
  readonly provenance: Extract<
    SpellRecord["provenance"],
    { readonly kind: "srd-5.2.1" }
  > & {
    readonly section: typeof FIND_FAMILIAR_SPELL_PROVENANCE_SECTION;
  };
};

type CharacterBattleResourceStateBase = {
  readonly unit: UnitRecord;
  readonly usedThisTurn: boolean;
};

export type CharacterBattleResourceState =
  | (CharacterBattleResourceStateBase & {
      readonly resource: LimitedUseCountActivationResource;
      readonly usesRemaining: ResourceCount;
    })
  | (CharacterBattleResourceStateBase & {
      readonly resource: UnlimitedActivationResource;
      readonly usesRemaining?: never;
    });

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

export type CharacterBattleInvocationSpellAccessInit = {
  readonly tag: "armorOfShadowsMageArmor" | "pactOfTheChainFindFamiliar";
  readonly spell: SpellRecord;
};
export type CharacterBattleInvocationSpellAccessState =
  | {
      readonly tag: "armorOfShadowsMageArmor";
      readonly spell: ArmorOfShadowsMageArmorSpellRecord;
    }
  | {
      readonly tag: "pactOfTheChainFindFamiliar";
      readonly spell: PactOfTheChainFindFamiliarSpellRecord;
      readonly invocationMode: typeof PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE;
      readonly eligibleForms: typeof PACT_OF_THE_CHAIN_FIND_FAMILIAR_FORM_ELIGIBILITY;
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
  "invocationSpellAccesses"
> & {
  readonly invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessState[];
};

export type CharacterBattleSpellSlotState = {
  readonly spellLevel: SpellSlotLevel;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

export type CharacterBattleSpellcastingInit = {
  readonly sourceClassName: ClassName;
  readonly spellcastingAbilityModifier: number;
  readonly proficiencyBonus: ProficiencyBonus;
  readonly canCastSpells: boolean;
  readonly cantrips: readonly SpellRecord[];
  readonly preparedSpells: readonly SpellRecord[];
  readonly featurePreparedSpells: readonly CharacterBattleFeaturePreparedSpellInit[];
  readonly invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessInit[];
  readonly spellSlots: readonly CharacterBattleSpellSlotInit[];
  readonly spellSlotExpenditures?: readonly CharacterBattleSpellSlotExpenditureInit[];
};

export type CharacterBattleSpellcastingState = Omit<
  CharacterBattleSpellcastingInit,
  | "spellcastingAbilityModifier"
  | "featurePreparedSpells"
  | "invocationSpellAccesses"
  | "spellSlots"
  | "spellSlotExpenditures"
> & {
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessState[];
  readonly spellSlots: readonly CharacterBattleSpellSlotState[];
};

export function characterBattleInvocationSpellAccessInitIssue(
  invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessInit[],
): string | null {
  const parsed = parseCharacterBattleInvocationSpellAccesses(
    invocationSpellAccesses,
  );
  return parsed.tag === "issue" ? parsed.message : null;
}

export function parseCharacterBattleInvocationSpellAccesses(
  invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessInit[],
): CharacterBattleInvocationSpellAccessParseResult {
  const parsed: CharacterBattleInvocationSpellAccessState[] = [];
  for (const access of invocationSpellAccesses) {
    if (access.tag === "armorOfShadowsMageArmor") {
      if (!isArmorOfShadowsMageArmorSpell(access.spell)) {
        return {
          tag: "issue",
          message: "Armor of Shadows Spell Access must grant Mage Armor.",
        };
      }
      parsed.push({
        tag: access.tag,
        spell: access.spell,
      });
      continue;
    }
    if (!isPactOfTheChainFindFamiliarSpell(access.spell)) {
      return {
        tag: "issue",
        message: "Pact of the Chain Spell Access must grant Find Familiar.",
      };
    }
    parsed.push({
      tag: access.tag,
      spell: access.spell,
      invocationMode: PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE,
      eligibleForms: PACT_OF_THE_CHAIN_FIND_FAMILIAR_FORM_ELIGIBILITY,
    });
  }
  return {
    tag: "parsed",
    invocationSpellAccesses: parsed,
  };
}

export function parseCharacterBattleClassLevels(
  classLevels: readonly CharacterBattleClassLevelInit[],
): readonly CharacterBattleClassLevel[] {
  const seenClassNames = new Set<ClassName>();
  return classLevels.map((classLevel) => {
    if (
      !Number.isInteger(classLevel.level) ||
      classLevel.level < 1 ||
      classLevel.level > 20
    ) {
      throw new Error("Character class levels must be integers from 1 to 20.");
    }
    if (seenClassNames.has(classLevel.className)) {
      throw new Error("Character class levels must not duplicate classes.");
    }
    seenClassNames.add(classLevel.className);
    return {
      className: classLevel.className,
      level: ClassLevel.make(classLevel.level),
    };
  });
}

export function characterResourceState(
  input: CharacterBattleResourceInit,
  classLevels: readonly CharacterBattleClassLevel[],
): CharacterBattleResourceState {
  const unitClassLevel =
    input.unit.kind === "class_feature"
      ? requireCharacterClassLevel(classLevels, input.unit.className)
      : undefined;
  const characterLevel = classLevels.reduce(
    (total, classLevel) => total + Number(classLevel.level),
    0,
  );
  const resource = characterBattleResourceForUnit(input.unit);
  const base = {
    unit: input.unit,
    usedThisTurn: false,
  };
  if (activationResourceIsUnlimited(resource)) {
    return { ...base, resource };
  }
  if (!activationResourceIsLimited(resource)) {
    throw new Error("Character battle resource has an unsupported cap shape.");
  }
  return {
    ...base,
    resource,
    usesRemaining:
      input.usesRemaining === undefined
        ? supportedUseCountCapForLevel(
            resource,
            unitClassLevel ?? characterLevel,
            input.capAbilityModifier,
          )
        : resourceCount(input.usesRemaining),
  };
}

export function characterBattleResourceInitIssue(
  input: CharacterBattleResourceInit,
): string | null {
  const resource = characterBattleActivationResourceForUnit(input.unit);
  if (resource === null) {
    return "Character battle resources must be supported limited-use Units.";
  }
  return resource?.kind === "use_count" &&
    resource.cap.kind === "ability_modifier" &&
    input.usesRemaining === undefined &&
    input.capAbilityModifier === undefined
    ? "Ability-modifier resource cap requires the projected ability modifier."
    : null;
}

export function characterBattleResourceForUnit(
  unit: UnitRecord,
): CharacterBattleActivationResource {
  const resource = characterBattleActivationResourceForUnit(unit);
  if (resource === null) {
    throw new Error(
      "Character battle resources must be supported limited-use Units.",
    );
  }
  return resource;
}

export function characterBattleResourceSupportedForUnit(
  unit: UnitRecord,
): boolean {
  return characterBattleActivationResourceForUnit(unit) !== null;
}

export function unitIsFavoredEnemyHuntersMarkFreeCastResource(
  unit: UnitRecord,
): boolean {
  return favoredEnemyHuntersMarkFreeCastResource(unit) !== null;
}

function characterBattleActivationResourceForUnit(
  unit: UnitRecord,
): CharacterBattleActivationResource | null {
  const freeCastResource = favoredEnemyHuntersMarkFreeCastResource(unit);
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
    bonusActionDashTemporaryHitPointsProfileForUnit(unit) !== null
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
    battleReactionRollOrDamageReductionSupportForUnit(unit) ===
      "attackDamageReductionZeroDamageRedirect"
  ) {
    return {
      kind: "use_count",
      cap: {
        kind: "linear_per_level",
        axis: "class",
        base: 0,
        perLevel: 1,
        startingAtLevel: 1,
      },
    };
  }
  if (
    unit.kind !== "class_feature" ||
    (unit.mechanics.family !== "activation" &&
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

function favoredEnemyHuntersMarkFreeCastResource(
  unit: UnitRecord,
): LimitedUseCountActivationResource | null {
  const grants = favoredEnemyHuntersMarkFreeCastGrantsForUnit(unit);
  const freeCastGrant = grants?.freeCastGrant;
  if (
    freeCastGrant === undefined ||
    freeCastGrant.count !== 2 ||
    freeCastGrant.resetCadence !== "long_rest"
  ) {
    return null;
  }
  return {
    kind: "use_count",
    cap: { kind: "fixed", uses: freeCastGrant.count },
  };
}

export function characterResourceIsFavoredEnemyFreeCast(
  resource: CharacterBattleResourceState,
): boolean {
  return favoredEnemyHuntersMarkFreeCastResource(resource.unit) !== null;
}

export function characterBattleResourceUsage(
  resource: CharacterBattleResourceState,
): "limited" | "unlimited" {
  return characterBattleResourceIsUnlimited(resource) ? "unlimited" : "limited";
}

export function characterBattleResourceIsUnlimited(
  resource: CharacterBattleResourceState,
): resource is CharacterBattleResourceStateBase & {
  readonly resource: UnlimitedActivationResource;
  readonly usesRemaining?: never;
} {
  return (
    resource.resource.kind === "use_count" &&
    resource.resource.cap.kind === "unlimited"
  );
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
  return (
    bardicInspirationSupport !== null &&
    bardicInspirationSupport !== "unsupported"
  );
}

export function resourceHasUsesRemaining(
  resource: CharacterBattleResourceState,
): boolean {
  return (
    characterBattleResourceIsUnlimited(resource) || resource.usesRemaining > 0
  );
}

export function spendCharacterResourceUse(
  resource: CharacterBattleResourceState,
): CharacterBattleResourceState {
  return characterBattleResourceIsUnlimited(resource)
    ? resource
    : {
        ...resource,
        usesRemaining: resourceCount(Number(resource.usesRemaining) - 1),
      };
}

export function characterSpellcastingState(
  input: CharacterBattleSpellcastingStateInit,
  classLevels: readonly CharacterBattleClassLevel[],
  spellAccessUnits: readonly (
    | CharacterBattleResourceInit
    | CharacterBattleFeatureInit
  )[],
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
    cantrips: input.cantrips,
    preparedSpells: preparedSpellsWithFeatureAccess(
      input.preparedSpells,
      input.featurePreparedSpells,
    ),
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

function isArmorOfShadowsMageArmorSpell(
  spell: SpellRecord,
): spell is ArmorOfShadowsMageArmorSpellRecord {
  return (
    spell.id === MAGE_ARMOR_SPELL_ID &&
    spell.name === ARMOR_OF_SHADOWS_SPELL_NAME &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === ARMOR_OF_SHADOWS_SPELL_PROVENANCE_SECTION
  );
}

function isPactOfTheChainFindFamiliarSpell(
  spell: SpellRecord,
): spell is PactOfTheChainFindFamiliarSpellRecord {
  return (
    spell.id === FIND_FAMILIAR_SPELL_ID &&
    spell.name === FIND_FAMILIAR_SPELL_NAME &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === FIND_FAMILIAR_SPELL_PROVENANCE_SECTION &&
    spell.mechanics.family === "spawned_creature" &&
    spell.mechanics.level === 1 &&
    spell.mechanics.castingTime.kind === "action" &&
    spell.mechanics.components.materialCostGp === 10 &&
    spell.mechanics.components.materialConsumed === true
  );
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
  const seenSpellIds = new Set<SpellRecord["id"]>();
  const allPrepared: SpellRecord[] = [];
  for (const spell of [
    ...preparedSpells,
    ...featurePreparedSpells.map((featureSpell) => featureSpell.spell),
  ]) {
    if (!seenSpellIds.has(spell.id)) {
      seenSpellIds.add(spell.id);
      allPrepared.push(spell);
    }
  }
  return allPrepared;
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

function supportedUseCountCapForLevel(
  resource: LimitedUseCountActivationResource,
  level: number,
  capAbilityModifier: AbilityModifier | undefined,
): ResourceCount {
  if (resource.cap.kind === "fixed") {
    return resourceCount(resource.cap.uses);
  }
  if (resource.cap.kind === "proficiency_bonus") {
    return resourceCount(Math.max(2, Math.floor((level - 1) / 4) + 2));
  }
  if (resource.cap.kind === "linear_per_level") {
    return resourceCount(
      resource.cap.base +
        Math.max(0, level - resource.cap.startingAtLevel + 1) *
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
