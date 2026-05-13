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
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
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

export type CharacterBattleSpellSlotState = {
  readonly spellLevel: SpellSlotLevel;
  readonly count: ResourceCount;
  readonly expended: ResourceCount;
};

export type CharacterBattleSpellcastingInit = {
  readonly spellcastingAbilityModifier: number;
  readonly proficiencyBonus: ProficiencyBonus;
  readonly canCastSpells: boolean;
  readonly cantrips: readonly SpellRecord[];
  readonly preparedSpells: readonly SpellRecord[];
  readonly spellSlots: readonly CharacterBattleSpellSlotInit[];
  readonly spellSlotExpenditures?: readonly CharacterBattleSpellSlotExpenditureInit[];
};

export type CharacterBattleSpellcastingState = Omit<
  CharacterBattleSpellcastingInit,
  "spellcastingAbilityModifier" | "spellSlots" | "spellSlotExpenditures"
> & {
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly spellSlots: readonly CharacterBattleSpellSlotState[];
};

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

function characterBattleActivationResourceForUnit(
  unit: UnitRecord,
): CharacterBattleActivationResource | null {
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
  const reactionSupport = battleReactionRollOrDamageReductionSupportForUnit(unit);
  if (reactionSupport !== null && reactionSupport !== "unsupported") {
    return true;
  }
  const bardicInspirationSupport = battleBardicInspirationGrantSupportForUnit(
    unit,
  );
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
  input: CharacterBattleSpellcastingInit,
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

  return {
    spellcastingAbilityModifier: abilityModifier(
      input.spellcastingAbilityModifier,
    ),
    proficiencyBonus: input.proficiencyBonus,
    canCastSpells: input.canCastSpells,
    cantrips: input.cantrips,
    preparedSpells: input.preparedSpells,
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
