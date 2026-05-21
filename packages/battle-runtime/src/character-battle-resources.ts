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
  ClassFeatureRecord,
  ClassName,
  EffectAtom,
  PointPoolResource,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import {
  supportedClassFeatureSpellFreeCastGrantsForUnit,
  type SupportedClassFeatureSpellFreeCastProfile,
} from "@dnd/surface/surface/types";
import {
  type CharacterBattleClassLevel,
  type CharacterBattleClassLevelInit,
} from "./character-class-level.ts";
import {
  battleBardicInspirationGrantSupportForUnit,
  battleMonkFocusBattleOptionsSupportForUnit,
  battleReactionRollOrDamageReductionSupportForUnit,
  bonusActionDashTemporaryHitPointsProfileForUnit,
  requireCharacterClassLevel,
} from "./unit-feature-support.ts";
import {
  pactOfTheChainFindFamiliarFormEligibilityForSpell,
  type PactOfTheChainFindFamiliarFormEligibility,
} from "./find-familiar-forms.ts";
import * as Either from "effect/Either";

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.metamagic-battle-resource-bridge

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

export type CharacterBattleFeatureInit = {
  readonly unit: UnitRecord;
};

type SorcererMetamagicMechanics = Extract<
  ClassFeatureRecord["mechanics"],
  { readonly family: "metamagic_options" }
>;
type SorcererMetamagicOption = SorcererMetamagicMechanics["options"][number];

export type CharacterBattleMetamagicOptionFact = {
  readonly effectKind: SorcererMetamagicOption["effectKind"];
  readonly stackingMode: SorcererMetamagicOption["stackingMode"];
  readonly sorceryPointCost: ResourceCount;
};
export type CharacterBattleMetamagicEffectKind =
  CharacterBattleMetamagicOptionFact["effectKind"];

export type CharacterBattleMetamagicState = {
  readonly sorceryPointResourceUnitId: UnitRecord["id"];
  readonly spellUseLimit: SorcererMetamagicMechanics["spellUseLimit"]["kind"];
  readonly knownOptions: readonly CharacterBattleMetamagicOptionFact[];
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
type SupportedPointPoolResource = PointPoolResource & {
  readonly cap: Extract<
    PointPoolResource["cap"],
    | { readonly kind: "fixed" }
    | { readonly kind: "proficiency_bonus" }
    | { readonly kind: "linear_per_level" }
    | { readonly kind: "threshold_tiers" }
  >;
};
type CharacterBattleResource =
  | CharacterBattleActivationResource
  | SupportedPointPoolResource;
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
export type PactOfTheChainFindFamiliarInvocationMode = {
  readonly action: "magicAction";
  readonly resource: "noSpellSlot";
};
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
};

export type CharacterBattleUseCountResourceStateBase =
  CharacterBattleResourceStateBase & {
    readonly usedThisTurn: boolean;
  };

export type CharacterBattleResourceState =
  | (CharacterBattleUseCountResourceStateBase & {
      readonly resource: LimitedUseCountActivationResource;
      readonly usesRemaining: ResourceCount;
    })
  | (CharacterBattleUseCountResourceStateBase & {
      readonly resource: UnlimitedActivationResource;
      readonly usesRemaining?: never;
    })
  | (CharacterBattleResourceStateBase & {
      readonly resource: SupportedPointPoolResource;
      readonly pointsRemaining: ResourceCount;
      readonly usesRemaining?: never;
      readonly usedThisTurn?: never;
    });

export type CharacterBattleUseCountResourceState = Extract<
  CharacterBattleResourceState,
  { readonly usedThisTurn: boolean }
>;

export type CharacterBattlePointPoolResourceState = Extract<
  CharacterBattleResourceState,
  { readonly pointsRemaining: ResourceCount }
>;

export type CharacterBattlePointPoolSpendIssue = {
  readonly tag: "characterBattlePointPoolSpendIssue";
  readonly message: string;
};

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
      readonly spell: ArmorOfShadowsMageArmorSpellRecord;
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
  | "featurePreparedSpells"
  | "spellbookRitualSpellAccesses"
  | "bookOfShadowsSpellAccesses"
  | "invocationSpellAccesses"
  | "spellSlots"
  | "spellSlotExpenditures"
> & {
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly spellbookRitualSpellAccesses: readonly CharacterBattleSpellbookRitualSpellAccessInit[];
  readonly bookOfShadowsSpellAccesses: readonly CharacterBattleBookOfShadowsSpellAccessInit[];
  readonly invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessState[];
  readonly spellSlots: readonly CharacterBattleSpellSlotState[];
};

export function effectiveCharacterBattleCantrips(
  spellcasting: Pick<
    CharacterBattleSpellcastingState,
    "bookOfShadowsSpellAccesses" | "cantrips"
  >,
): readonly SpellRecord[] {
  return distinctSpellsById([
    ...spellcasting.cantrips,
    ...bookOfShadowsOnPersonAccesses(spellcasting).flatMap(
      (access) => access.cantrips,
    ),
  ]);
}

export function effectiveCharacterBattlePreparedSpells(
  spellcasting: Pick<
    CharacterBattleSpellcastingState,
    "bookOfShadowsSpellAccesses" | "preparedSpells"
  >,
): readonly SpellRecord[] {
  return distinctSpellsById([
    ...spellcasting.preparedSpells,
    ...bookOfShadowsOnPersonAccesses(spellcasting).flatMap(
      (access) => access.ritualSpells,
    ),
  ]);
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
      !("ritual" in access.spell.mechanics.castingTime) ||
      access.spell.mechanics.castingTime.ritual !== true
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
    const eligibleForms = pactOfTheChainFindFamiliarFormEligibilityForSpell(
      access.spell,
    );
    if (eligibleForms === null) {
      return {
        tag: "issue",
        message:
          "Pact of the Chain Find Familiar access requires familiar form catalog references.",
      };
    }
    parsed.push({
      tag: access.tag,
      spell: access.spell,
      invocationMode: PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE,
      eligibleForms,
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
  const initIssue = characterBattleResourceInitIssue(input, classLevels);
  if (initIssue !== null) {
    throw new Error(initIssue);
  }
  const resource = characterBattleResourceForUnit(input.unit);
  const base = { unit: input.unit };
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
  readonly classLevels: readonly CharacterBattleClassLevel[];
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
  readonly classLevels: readonly CharacterBattleClassLevel[];
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
  classLevels: readonly CharacterBattleClassLevel[],
): number {
  const unitClassLevel =
    unit.kind === "class_feature"
      ? requireCharacterClassLevel(classLevels, unit.className)
      : undefined;
  const characterLevel = classLevels.reduce(
    (total, classLevel) => total + Number(classLevel.level),
    0,
  );
  return unitClassLevel ?? characterLevel;
}

export function characterBattleResourceInitIssue(
  input: CharacterBattleResourceInit,
  classLevels: readonly CharacterBattleClassLevel[],
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
  readonly metamagic: CharacterBattleMetamagicState | undefined;
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

export function characterBattleResourceForUnit(
  unit: UnitRecord,
): CharacterBattleResource {
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

export function unitIsFavoredEnemyHuntersMarkFreeCastResource(
  unit: UnitRecord,
): boolean {
  return (
    classFeatureSpellFreeCastProfileForUnit(unit)?.resourceTag ===
    "favoredEnemyHuntersMarkFreeCasts"
  );
}

export function unitIsSupportedClassFeatureSpellFreeCastResource(
  unit: UnitRecord,
): boolean {
  return classFeatureSpellFreeCastResource(unit) !== null;
}

function characterBattleResourceForUnitOrNull(
  unit: UnitRecord,
): CharacterBattleResource | null {
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
    unit.mechanics.family === "resource_pool" &&
    pointPoolResourceIsSupportedByBattle(unit.mechanics.resource)
  ) {
    return unit.mechanics.resource;
  }
  if (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "resource_container"
  ) {
    const support = battleMonkFocusBattleOptionsSupportForUnit(unit);
    return support !== null &&
      support !== "unsupported" &&
      activationResourceIsSupportedByBattleForUnit(
        unit,
        unit.mechanics.resource,
      )
      ? unit.mechanics.resource
      : null;
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

export function characterResourceIsFavoredEnemyFreeCast(
  resource: CharacterBattleResourceState,
): boolean {
  return (
    classFeatureSpellFreeCastProfileForResource(resource)?.resourceTag ===
    "favoredEnemyHuntersMarkFreeCasts"
  );
}

export function classFeatureSpellFreeCastProfileForResource(
  resource: CharacterBattleResourceState,
): SupportedClassFeatureSpellFreeCastProfile | null {
  if (!characterBattleResourceIsUseCount(resource)) {
    return null;
  }
  return classFeatureSpellFreeCastProfileForUnit(resource.unit);
}

export function characterResourceIsClassFeatureFreeCastForSpell(
  resource: CharacterBattleResourceState,
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

export function characterBattleResourceUsage(
  resource: CharacterBattleResourceState,
): "limited" | "unlimited" | "pointPool" {
  if (characterBattleResourceIsPointPool(resource)) {
    return "pointPool";
  }
  return characterBattleResourceIsUnlimited(resource) ? "unlimited" : "limited";
}

export function characterBattleResourceIsUnlimited(
  resource: CharacterBattleResourceState,
): resource is CharacterBattleUseCountResourceStateBase & {
  readonly resource: UnlimitedActivationResource;
  readonly usesRemaining?: never;
} {
  return (
    resource.resource.kind === "use_count" &&
    resource.resource.cap.kind === "unlimited"
  );
}

export function characterBattleResourceIsUseCount(
  resource: CharacterBattleResourceState,
): resource is CharacterBattleUseCountResourceState {
  return resource.resource.kind === "use_count";
}

export function characterBattleResourceIsPointPool(
  resource: CharacterBattleResourceState,
): resource is CharacterBattlePointPoolResourceState {
  return resource.resource.kind === "point_pool";
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
  return (
    bardicInspirationSupport !== null &&
    bardicInspirationSupport !== "unsupported"
  );
}

export function resourceHasUsesRemaining(
  resource: CharacterBattleResourceState,
): resource is CharacterBattleUseCountResourceState {
  if (!characterBattleResourceIsUseCount(resource)) {
    return false;
  }
  return (
    characterBattleResourceIsUnlimited(resource) || resource.usesRemaining > 0
  );
}

export function spendCharacterResourceUse(
  resource: CharacterBattleUseCountResourceState,
): CharacterBattleUseCountResourceState {
  return characterBattleResourceIsUnlimited(resource)
    ? resource
    : {
        ...resource,
        usesRemaining: resourceCount(Number(resource.usesRemaining) - 1),
      };
}

export function spendCharacterPointPoolResource(input: {
  readonly resource: CharacterBattleResourceState;
  readonly points: ResourceCount;
}): Either.Either<
  CharacterBattlePointPoolResourceState,
  CharacterBattlePointPoolSpendIssue
> {
  if (!characterBattleResourceIsPointPool(input.resource)) {
    return Either.left({
      tag: "characterBattlePointPoolSpendIssue",
      message: "Only point-pool character battle resources can spend points.",
    });
  }
  if (input.points <= 0) {
    return Either.left({
      tag: "characterBattlePointPoolSpendIssue",
      message: "Point-pool spending requires a positive point cost.",
    });
  }
  if (input.resource.pointsRemaining < input.points) {
    return Either.left({
      tag: "characterBattlePointPoolSpendIssue",
      message: "Point-pool resource has insufficient remaining points.",
    });
  }
  return Either.right({
    ...input.resource,
    pointsRemaining: resourceCount(
      Number(input.resource.pointsRemaining) - Number(input.points),
    ),
  });
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
  const components = spell.mechanics.components;

  return (
    spell.id === FIND_FAMILIAR_SPELL_ID &&
    spell.name === FIND_FAMILIAR_SPELL_NAME &&
    spell.provenance.kind === "srd-5.2.1" &&
    spell.provenance.section === FIND_FAMILIAR_SPELL_PROVENANCE_SECTION &&
    spell.mechanics.family === "spawned_creature" &&
    spell.mechanics.level === 1 &&
    spell.mechanics.castingTime.kind === "action" &&
    "materialCostGp" in components &&
    "materialConsumed" in components &&
    components.materialCostGp === 10 &&
    components.materialConsumed === true
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
    return resourceCount(Math.max(2, Math.floor((level - 1) / 4) + 2));
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
