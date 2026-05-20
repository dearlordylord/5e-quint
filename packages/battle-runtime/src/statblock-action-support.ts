// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
import type {
  CreatureActions,
  CreatureNamedAttackRoll,
  StatBlockRecord,
} from "@dnd/surface/surface/types";

export function statBlockActionSurfaceIsSupported(
  statBlock: StatBlockRecord["statBlock"],
): boolean {
  return (
    creatureActionSectionIsSupported(statBlock.actions) &&
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
  const baseDamage = attack.onHit.flatMap((effect) =>
    effect.kind === "damage" &&
    effect.amount.kind === "fixed" &&
    typeof effect.damageType === "string"
      ? [{ damageType: effect.damageType }]
      : [],
  );
  const advantageBonus = attack.onHit.flatMap((effect) =>
    effect.kind === "conditional_bonus_damage" &&
    effect.when.kind === "attack_roll_had_advantage" &&
    effect.amount.kind === "fixed" &&
    typeof effect.damageType === "string"
      ? [{ damageType: effect.damageType }]
      : [],
  );
  if (
    baseDamage.length !== 1 ||
    baseDamage.length + advantageBonus.length !== attack.onHit.length ||
    advantageBonus.length > 1
  ) {
    return false;
  }
  const [base] = baseDamage;
  const [bonus] = advantageBonus;
  return (
    base !== undefined &&
    (bonus === undefined || bonus.damageType === base.damageType)
  );
}

function creatureNamedAttackTargetIsSupported(
  attack: CreatureNamedAttackRoll,
): boolean {
  return (
    (attack.attackType === "melee" && attack.reachFeet !== undefined) ||
    (attack.attackType === "ranged" && attack.rangeFeet !== undefined)
  );
}
