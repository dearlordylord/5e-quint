// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL
import type {
  CreatureActions,
  CreatureNamedAttackRoll,
  CreatureTrait,
  StatBlockRecord,
} from "@dnd/surface/surface/types";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { StatBlockTraitAttackRollMode } from "./battle-action-options.ts";
import type { BattleDruidWildShapeKnownFormSupportProfile } from "./unit-feature-support.ts";
import { statBlockIsWildShapeKnownFormEligible } from "./druid-wild-shape-form-eligibility.ts";
import { supportedStatBlockAttackDamage } from "./statblock-attack-damage-support.ts";

export const WILD_SHAPE_FORM_ACTION_SURFACE_CATEGORIES = [
  "simpleLiteralAttackSingleDamage",
  "multiDamageComponentsOnHit",
  "attackHitRider",
  "traitDerivedConditionalAttackRollAdvantage",
  "nonAttackOrSpecialActionSection",
  "tableOrProseOnlyTrait",
] as const;

export type WildShapeFormActionSurfaceCategory =
  (typeof WILD_SHAPE_FORM_ACTION_SURFACE_CATEGORIES)[number];

export type WildShapeFormActionSurfaceInventoryEntry = {
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
    creatureNamedAttackTargetIsSupported(attack)
  );
}

function creatureNamedAttackDamageIsSupported(
  attack: CreatureNamedAttackRoll,
): boolean {
  return supportedStatBlockAttackDamage(attack) !== null;
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
  })).filter((entry) => entry.exampleStatBlockIds.length > 0);
}

function wildShapeFormActionSurfaceCategories(
  form: StatBlockRecord,
): readonly WildShapeFormActionSurfaceCategory[] {
  const categories = new Set<WildShapeFormActionSurfaceCategory>();
  if (
    form.statBlock.bonusActions !== undefined ||
    form.statBlock.reactions !== undefined ||
    form.statBlock.legendaryActions !== undefined
  ) {
    categories.add("nonAttackOrSpecialActionSection");
  }
  const actions = [
    form.statBlock.actions,
    form.statBlock.bonusActions,
    form.statBlock.reactions,
    form.statBlock.legendaryActions?.actions,
  ];

  for (const actionSection of actions) {
    if (actionSection === undefined) continue;
    if (hasNonAttackOrSpecialActionSection(actionSection)) {
      categories.add("nonAttackOrSpecialActionSection");
    }
    for (const attack of actionSection.attacks ?? []) {
      const fixedDamage = fixedDamageEffects(attack);
      if (fixedDamage.length === 1) {
        categories.add("simpleLiteralAttackSingleDamage");
      }
      if (fixedDamage.length > 1) {
        categories.add("multiDamageComponentsOnHit");
      }
      if (attack.description !== undefined || nonDamageEffects(attack) > 0) {
        categories.add("attackHitRider");
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

function hasNonAttackOrSpecialActionSection(actions: CreatureActions): boolean {
  return (
    actions.multiattacks !== undefined ||
    actions.saves !== undefined ||
    actions.supports !== undefined ||
    actions.actionOptions !== undefined ||
    actions.specials !== undefined
  );
}

function fixedDamageEffects(attack: CreatureNamedAttackRoll) {
  return attack.onHit.filter(
    (effect) => effect.kind === "damage" && effect.amount.kind === "fixed",
  );
}

function nonDamageEffects(attack: CreatureNamedAttackRoll): number {
  return attack.onHit.filter((effect) => effect.kind !== "damage").length;
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
