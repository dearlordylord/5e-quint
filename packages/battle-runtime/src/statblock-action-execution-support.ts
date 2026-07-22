import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  CreatureActions,
  CreatureNamedAttackRoll,
  CreatureTrait,
  StatBlockMechanics,
} from "@dnd/surface/surface/types";
import type {
  StatBlockTraitAttackRollMode,
  SupportedCreatureAttackRollMechanics,
} from "./battle-action-options.ts";
import { creatureAttackRollMechanicsAreSupported } from "./statblock-attack-execution-mechanics.ts";
export { creatureAttackRollMechanicsAreSupported } from "./statblock-attack-execution-mechanics.ts";

export function statBlockActionSurfaceIsSupported(
  statBlock: StatBlockMechanics,
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
): attack is CreatureNamedAttackRoll & SupportedCreatureAttackRollMechanics {
  return (
    attack.description === undefined &&
    creatureAttackRollMechanicsAreSupported(attack)
  );
}

function creatureTraitsAreSupported(
  traits: StatBlockMechanics["traits"],
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

function mentionsAttackRollAdvantage(description: string): boolean {
  const lowerDescription = description.toLowerCase();
  return (
    lowerDescription.includes("advantage") &&
    lowerDescription.includes("attack roll")
  );
}

export function supportedStatBlockTraitAttackRollModes(
  traits: StatBlockMechanics["traits"],
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
