// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL
import type {
  Condition,
  CreatureActions,
  CreatureNamedAttackRoll,
  CreatureTrait,
  StatBlockRecord,
} from "@dnd/surface/surface/types";
import { CONDITIONS } from "@dnd/surface/surface/types";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { StatBlockTraitAttackRollMode } from "./battle-action-options.ts";
import type { BattleDruidWildShapeKnownFormSupportProfile } from "./unit-feature-support.ts";
import { statBlockIsWildShapeKnownFormEligible } from "./druid-wild-shape-form-eligibility.ts";
import { supportedStatBlockAttackDamage } from "./statblock-attack-damage-support.ts";
import {
  supportedStatBlockAttackHitConditionRiderEffect,
  supportedStatBlockAttackHitConditionRiders,
} from "./statblock-attack-hit-condition-support.ts";

const WILD_SHAPE_FORM_EXECUTABLE_ACTION_SURFACE_CATEGORIES = [
  "simpleLiteralAttackSingleDamage",
  "multiDamageComponentsOnHit",
  "traitDerivedConditionalAttackRollAdvantage",
  "attackHitTargetSizeConditionRider",
] as const;

const WILD_SHAPE_FORM_CLOSED_ATTACK_HIT_RIDER_CATEGORIES = [
  "attackHitConditionRider",
  "attackHitForcedMovementRider",
  "attackHitOtherRider",
] as const;

const WILD_SHAPE_FORM_ATTACK_HIT_RIDER_CATEGORIES = [
  "attackHitTargetSizeConditionRider",
  ...WILD_SHAPE_FORM_CLOSED_ATTACK_HIT_RIDER_CATEGORIES,
] as const;

const WILD_SHAPE_FORM_ACTION_SECTION_CATEGORIES = [
  "statBlockActionMultiattack",
  "statBlockActionSaveGate",
  "statBlockActionSupport",
  "statBlockActionOption",
  "statBlockSpecialAction",
  "statBlockBonusActionSection",
  "statBlockReactionSection",
  "statBlockLegendaryActionSection",
] as const;

const WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_CATEGORIES = [
  ...WILD_SHAPE_FORM_CLOSED_ATTACK_HIT_RIDER_CATEGORIES,
  ...WILD_SHAPE_FORM_ACTION_SECTION_CATEGORIES,
  "tableOrProseOnlyTrait",
] as const;

export const WILD_SHAPE_FORM_ACTION_SURFACE_CATEGORIES = [
  ...WILD_SHAPE_FORM_EXECUTABLE_ACTION_SURFACE_CATEGORIES,
  ...WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_CATEGORIES,
] as const;

type WildShapeFormExecutableActionSurfaceCategory =
  (typeof WILD_SHAPE_FORM_EXECUTABLE_ACTION_SURFACE_CATEGORIES)[number];
type WildShapeFormAttackHitRiderCategory =
  (typeof WILD_SHAPE_FORM_ATTACK_HIT_RIDER_CATEGORIES)[number];
type WildShapeFormActionSectionCategory =
  (typeof WILD_SHAPE_FORM_ACTION_SECTION_CATEGORIES)[number];
type WildShapeFormClosedActionSurfaceCategory =
  (typeof WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_CATEGORIES)[number];
export type WildShapeFormActionSurfaceCategory =
  (typeof WILD_SHAPE_FORM_ACTION_SURFACE_CATEGORIES)[number];

type WildShapeFormClosedSurfaceBoundary = {
  readonly owner: string;
  readonly reason: string;
};

export type WildShapeFormActionSurfaceInventoryEntry =
  | {
      readonly category: WildShapeFormExecutableActionSurfaceCategory;
      readonly exampleStatBlockIds: readonly StatBlockRecord["id"][];
    }
  | {
      readonly category: WildShapeFormClosedActionSurfaceCategory;
      readonly exampleStatBlockIds: readonly StatBlockRecord["id"][];
      readonly closedBoundary: WildShapeFormClosedSurfaceBoundary;
    };

const WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_CATEGORY_SET: ReadonlySet<WildShapeFormActionSurfaceCategory> =
  new Set(WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_CATEGORIES);

const WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_BOUNDARIES = {
  attackHitConditionRider: {
    owner:
      "battle-runtime generic Stat Block attack-hit condition rider owner",
    reason:
      "Attack-hit condition rider shapes outside the typed target Size Prone payload remain closed so the host attack cannot drop required condition-specific facts or over-apply the condition.",
  },
  attackHitForcedMovementRider: {
    owner:
      "battle-runtime generic Stat Block attack-hit forced-movement rider owner",
    reason:
      "Attack-hit forced movement must carry a typed movement payload and target-position owner before Wild Shape admits the host attack.",
  },
  attackHitOtherRider: {
    owner: "battle-runtime generic Stat Block attack-hit rider owner",
    reason:
      "Attack-hit prose with no parsed destination needs a typed payload or table owner before Wild Shape admits the host attack.",
  },
  statBlockActionMultiattack: {
    owner: "battle-runtime generic Stat Block Multiattack control owner",
    reason:
      "Surface actions.multiattacks entries need a Wild Shape selected-form admission witness that consumes the generic Multiattack control owner before the form admits them.",
  },
  statBlockActionSaveGate: {
    owner: "battle-runtime generic Stat Block save-gated action procedure owner",
    reason:
      "Surface actions.saves entries carry saving throw, recipient, and effect facts that need a generic save-gated Stat Block procedure owner before Wild Shape admits them.",
  },
  statBlockActionSupport: {
    owner: "battle-runtime generic Stat Block support-action procedure owner",
    reason:
      "Surface actions.supports entries carry self or ally effect facts that need a generic support-action procedure owner before Wild Shape admits them.",
  },
  statBlockActionOption: {
    owner: "battle-runtime generic Stat Block action-option procedure owner",
    reason:
      "Surface actionOptions delegate to Standard Action procedures; Wild Shape admission needs focused evidence for each delegated action kind, and this task does not promote generic Utilize or object-use execution.",
  },
  statBlockSpecialAction: {
    owner: "battle-runtime typed Stat Block special-action payload or table owner",
    reason:
      "Surface specials carry prose descriptions and need typed effect payloads or an explicit table owner before Wild Shape admits them.",
  },
  statBlockBonusActionSection: {
    owner:
      "battle-runtime Stat Block Bonus Action lifecycle and delegated procedure owners",
    reason:
      "Surface bonusActions spend a separate Bonus Action resource, and each contained action shape still needs its generic procedure owner before Wild Shape admits it.",
  },
  statBlockReactionSection: {
    owner: "battle-runtime Stat Block Reaction trigger and procedure owners",
    reason:
      "Surface reactions require trigger facts plus Reaction resource handling before Wild Shape admits the section or its contained procedure.",
  },
  statBlockLegendaryActionSection: {
    owner: "battle-runtime Stat Block Legendary Action lifecycle owner",
    reason:
      "Surface legendaryActions use Stat Block-only round resources and need a generic lifecycle owner before any Wild Shape form admits them.",
  },
  tableOrProseOnlyTrait: {
    owner: "battle-runtime table/caller witness owners",
    reason:
      "Traits with table, spatial, exploration, or non-attack effects remain closed until a generic owner consumes their facts.",
  },
} as const satisfies Record<
  WildShapeFormClosedActionSurfaceCategory,
  WildShapeFormClosedSurfaceBoundary
>;

type WildShapeFormActionSurfaceInventoryEntryInput = {
  readonly category: WildShapeFormActionSurfaceCategory;
  readonly exampleStatBlockIds: readonly StatBlockRecord["id"][];
};

export function statBlockActionSurfaceIsSupported(
  statBlock: StatBlockRecord["statBlock"],
): boolean {
  return (
    creatureActionSectionIsSupported(statBlock.actions) &&
    creatureTraitsAreSupported(statBlock.traits) &&
    statBlock.bonusActions === undefined &&
    statBlock.reactions === undefined &&
    statBlock.legendaryActions === undefined
  );
}

export function creatureActionSectionIsSupported(
  actions: CreatureActions | undefined,
): boolean {
  return (
    actions === undefined ||
    (actions.multiattacks === undefined &&
      actions.saves === undefined &&
      actions.supports === undefined &&
      actions.actionOptions === undefined &&
      actions.specials === undefined &&
      (actions.attacks ?? []).every(creatureNamedAttackRollIsSupported))
  );
}

export function creatureNamedAttackRollIsSupported(
  attack: CreatureNamedAttackRoll,
): boolean {
  return (
    attack.multiattackCount === undefined &&
    attack.description === undefined &&
    attack.attackBonus.kind === "literal" &&
    creatureNamedAttackDamageIsSupported(attack) &&
    creatureNamedAttackHitConditionRidersAreSupported(attack) &&
    creatureNamedAttackTargetIsSupported(attack)
  );
}

function creatureNamedAttackDamageIsSupported(
  attack: CreatureNamedAttackRoll,
): boolean {
  return supportedStatBlockAttackDamage(attack) !== null;
}

function creatureNamedAttackHitConditionRidersAreSupported(
  attack: CreatureNamedAttackRoll,
): boolean {
  return supportedStatBlockAttackHitConditionRiders(attack) !== null;
}

function creatureNamedAttackTargetIsSupported(
  attack: CreatureNamedAttackRoll,
): boolean {
  return (
    (attack.attackType === "melee" && attack.reachFeet !== undefined) ||
    (attack.attackType === "ranged" && attack.rangeFeet !== undefined)
  );
}

export function wildShapeFormActionSurfaceInventory(input: {
  readonly forms: readonly StatBlockRecord[];
  readonly profile: BattleDruidWildShapeKnownFormSupportProfile;
}): readonly WildShapeFormActionSurfaceInventoryEntry[] {
  const eligibleForms = input.forms.filter((form) =>
    statBlockIsWildShapeKnownFormEligible({ form, profile: input.profile }),
  );
  return WILD_SHAPE_FORM_ACTION_SURFACE_CATEGORIES.map((category) => ({
    category,
    exampleStatBlockIds: eligibleForms.flatMap((form) =>
      wildShapeFormActionSurfaceCategories(form).includes(category)
        ? [form.id]
        : [],
    ),
  }))
    .filter((entry) => entry.exampleStatBlockIds.length > 0)
    .map(wildShapeFormActionSurfaceInventoryEntry);
}

function wildShapeFormActionSurfaceInventoryEntry(
  entry: WildShapeFormActionSurfaceInventoryEntryInput,
): WildShapeFormActionSurfaceInventoryEntry {
  const { category, exampleStatBlockIds } = entry;
  if (wildShapeFormActionSurfaceCategoryIsClosed(category)) {
    return {
      category,
      exampleStatBlockIds,
      closedBoundary:
        WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_BOUNDARIES[category],
    };
  }
  return {
    category,
    exampleStatBlockIds,
  };
}

function wildShapeFormActionSurfaceCategoryIsClosed(
  category: WildShapeFormActionSurfaceCategory,
): category is WildShapeFormClosedActionSurfaceCategory {
  return WILD_SHAPE_FORM_CLOSED_ACTION_SURFACE_CATEGORY_SET.has(category);
}

function wildShapeFormActionSurfaceCategories(
  form: StatBlockRecord,
): readonly WildShapeFormActionSurfaceCategory[] {
  const categories = new Set<WildShapeFormActionSurfaceCategory>();
  if (form.statBlock.bonusActions !== undefined) {
    categories.add("statBlockBonusActionSection");
  }
  if (form.statBlock.reactions !== undefined) {
    categories.add("statBlockReactionSection");
  }
  if (form.statBlock.legendaryActions !== undefined) {
    categories.add("statBlockLegendaryActionSection");
  }
  const actions = [
    form.statBlock.actions,
    form.statBlock.bonusActions,
    form.statBlock.reactions,
    form.statBlock.legendaryActions?.actions,
  ];

  for (const actionSection of actions) {
    if (actionSection === undefined) continue;
    for (const category of creatureActionSectionSurfaceCategories(
      actionSection,
    )) {
      categories.add(category);
    }
    for (const attack of actionSection.attacks ?? []) {
      const fixedDamage = fixedDamageEffects(attack);
      if (fixedDamage.length === 1) {
        categories.add("simpleLiteralAttackSingleDamage");
      }
      if (fixedDamage.length > 1) {
        categories.add("multiDamageComponentsOnHit");
      }
      for (const category of attackHitRiderCategories(attack)) {
        categories.add(category);
      }
    }
  }

  for (const trait of form.statBlock.traits ?? []) {
    if (statBlockTraitAttackRollMode(trait) !== null) {
      categories.add("traitDerivedConditionalAttackRollAdvantage");
    } else if (trait.effect === undefined) {
      categories.add(
        mentionsAttackRollAdvantage(trait.description)
          ? "traitDerivedConditionalAttackRollAdvantage"
          : "tableOrProseOnlyTrait",
      );
    }
  }

  return WILD_SHAPE_FORM_ACTION_SURFACE_CATEGORIES.filter((category) =>
    categories.has(category),
  );
}

function creatureActionSectionSurfaceCategories(
  actions: CreatureActions,
): readonly WildShapeFormActionSectionCategory[] {
  const categories = new Set<WildShapeFormActionSectionCategory>();
  if (actions.multiattacks !== undefined) {
    categories.add("statBlockActionMultiattack");
  }
  if (actions.saves !== undefined) {
    categories.add("statBlockActionSaveGate");
  }
  if (actions.supports !== undefined) {
    categories.add("statBlockActionSupport");
  }
  if (actions.actionOptions !== undefined) {
    categories.add("statBlockActionOption");
  }
  if (actions.specials !== undefined) {
    categories.add("statBlockSpecialAction");
  }
  return WILD_SHAPE_FORM_ACTION_SECTION_CATEGORIES.filter((category) =>
    categories.has(category),
  );
}

function fixedDamageEffects(attack: CreatureNamedAttackRoll) {
  return attack.onHit.filter(
    (effect) => effect.kind === "damage" && effect.amount.kind === "fixed",
  );
}

function attackHitRiderCategories(
  attack: CreatureNamedAttackRoll,
): readonly WildShapeFormAttackHitRiderCategory[] {
  const categories = new Set<WildShapeFormAttackHitRiderCategory>();
  for (const effect of attack.onHit) {
    const category = attackHitEffectRiderCategory(effect);
    if (category !== null) {
      categories.add(category);
    }
  }
  if (attack.description !== undefined) {
    for (const category of attackHitDescriptionRiderCategories(
      attack.description,
    )) {
      categories.add(category);
    }
  }
  return WILD_SHAPE_FORM_ATTACK_HIT_RIDER_CATEGORIES.filter((category) =>
    categories.has(category),
  );
}

function attackHitEffectRiderCategory(
  effect: CreatureNamedAttackRoll["onHit"][number],
): WildShapeFormAttackHitRiderCategory | null {
  if (effect.kind === "damage" || effect.kind === "conditional_bonus_damage") {
    return null;
  }
  if (
    supportedStatBlockAttackHitConditionRiderEffect(effect) !== null
  ) {
    return "attackHitTargetSizeConditionRider";
  }
  if (
    effect.kind === "apply_condition_if_target_size_at_most" ||
    effect.kind === "apply_condition" ||
    effect.kind === "apply_condition_while_in_area_or_until_escape" ||
    effect.kind === "suppress_condition_self_end"
  ) {
    return "attackHitConditionRider";
  }
  if (
    effect.kind === "force_move" ||
    effect.kind === "forced_reaction_movement" ||
    effect.kind === "jump_movement_replacement"
  ) {
    return "attackHitForcedMovementRider";
  }
  return "attackHitOtherRider";
}

function attackHitDescriptionRiderCategories(
  description: string,
): readonly WildShapeFormAttackHitRiderCategory[] {
  const categories = new Set<WildShapeFormAttackHitRiderCategory>();
  const lowerDescription = description.toLowerCase();
  if (
    CONDITIONS.some((condition) =>
      mentionsCondition(lowerDescription, condition),
    )
  ) {
    categories.add("attackHitConditionRider");
  }
  if (mentionsForcedMovement(lowerDescription)) {
    categories.add("attackHitForcedMovementRider");
  }
  if (categories.size === 0) {
    categories.add("attackHitOtherRider");
  }
  return WILD_SHAPE_FORM_ATTACK_HIT_RIDER_CATEGORIES.filter((category) =>
    categories.has(category),
  );
}

function mentionsCondition(
  lowerDescription: string,
  condition: Condition,
): boolean {
  return lowerDescription.includes(`${condition} condition`);
}

function mentionsForcedMovement(lowerDescription: string): boolean {
  const mentionsDistance =
    lowerDescription.includes(" feet") || lowerDescription.includes(" ft.");
  return (
    mentionsDistance &&
    (lowerDescription.includes("push") ||
      lowerDescription.includes("pull") ||
      lowerDescription.includes("move") ||
      lowerDescription.includes("moved"))
  );
}

function mentionsAttackRollAdvantage(description: string): boolean {
  const lowerDescription = description.toLowerCase();
  return (
    lowerDescription.includes("advantage") &&
    lowerDescription.includes("attack roll")
  );
}

function creatureTraitsAreSupported(
  traits: StatBlockRecord["statBlock"]["traits"],
): boolean {
  return (
    traits === undefined ||
    traits.every(
      (trait) =>
        statBlockTraitAttackRollMode(trait) !== null ||
        !mentionsAttackRollAdvantage(trait.description),
    )
  );
}

export function supportedStatBlockTraitAttackRollModes(
  traits: StatBlockRecord["statBlock"]["traits"],
): ReadonlyNonEmptyArray<StatBlockTraitAttackRollMode> | undefined {
  const modes = (traits ?? []).flatMap((trait) => {
    const mode = statBlockTraitAttackRollMode(trait);
    return mode === null ? [] : [mode];
  });
  const [firstMode, ...restModes] = modes;
  return firstMode === undefined ? undefined : [firstMode, ...restModes];
}

function statBlockTraitAttackRollMode(
  trait: CreatureTrait,
): StatBlockTraitAttackRollMode | null {
  return trait.effect?.kind ===
    "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target"
    ? {
        mode: "advantage",
        predicate: "nonIncapacitatedAllyWithin5FeetOfTarget",
      }
    : null;
}
