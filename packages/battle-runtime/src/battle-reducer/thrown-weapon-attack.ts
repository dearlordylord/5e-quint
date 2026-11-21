// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.THROWN_WEAPON_ATTACK
// SRD 5.2.1 "Thrown": a weapon with the Thrown property can be thrown to make a
// ranged attack, a Melee weapon included. The weapon leaves its owner's hand,
// so once the attack roll is accepted, hit or miss, it rests on the ground at
// the table-supplied landing position, where the owner can pick it up again.
// The thrown attack's facts and checks; thrown-weapon-release.ts puts the
// weapon on the ground and reports it. This module imports no reducer, so the
// target checks can use it without an import cycle.
import type { BattleTargetSpatialFact } from "../battle-state-execution.ts";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import type { CombatantId } from "../identity.ts";

export type ThrownWeaponLandingFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "thrownWeaponLanding" }
>;

/** A weapon attack that throws its weapon, with the procedure it lands for. */
export type ThrownWeaponAttack = Extract<
  SupportedAttackActionOption,
  { readonly kind: "weapon" }
> & {
  readonly procedureRef: ThrownWeaponLandingFact["procedureRef"];
};

/**
 * Whether a weapon attack throws its weapon: a Melee weapon's thrown option,
 * or a Ranged weapon whose range comes from Thrown rather than Ammunition,
 * such as the Dart.
 */
export function weaponAttackIsThrown(
  attack: SupportedAttackActionOption,
): boolean {
  if (attack.kind !== "weapon") return false;
  if (attack.weaponDelivery === "thrown") return true;
  const properties = attack.weapon.properties;
  return (
    attack.weapon.usage === "ranged" &&
    properties.some((property) => property.kind === "thrown") &&
    !properties.some((property) => property.kind === "ammunition")
  );
}

/** Whether an attack throws its weapon and names the procedure it lands for. */
export function isThrownWeaponAttack(
  attack: SupportedAttackActionOption,
): attack is ThrownWeaponAttack {
  return weaponAttackIsThrown(attack) && "procedureRef" in attack;
}

function thrownWeaponLandingFacts(
  facts: readonly BattleTargetSpatialFact[],
): readonly ThrownWeaponLandingFact[] {
  return facts.filter(
    (fact): fact is ThrownWeaponLandingFact =>
      fact.kind === "thrownWeaponLanding",
  );
}

/** The one landing fact scoped to a thrown attack, when the facts hold one. */
export function thrownWeaponLanding(
  attackerId: CombatantId,
  attack: ThrownWeaponAttack,
  facts: readonly BattleTargetSpatialFact[],
): ThrownWeaponLandingFact | undefined {
  const landings = thrownWeaponLandingFacts(facts);
  const landing = landings[0];
  return landings.length === 1 &&
    landing !== undefined &&
    landing.attackerId === attackerId &&
    landing.procedureRef === attack.procedureRef
    ? landing
    : undefined;
}

/**
 * A later fill for the same attack, such as a redirected target, keeps the
 * attack's landing position unless it states its own: the table placed the
 * landing for the throw, not for the first target.
 */
export function withThrownWeaponLandingFrom(
  attackFacts: readonly BattleTargetSpatialFact[],
  facts: readonly BattleTargetSpatialFact[],
): readonly BattleTargetSpatialFact[] {
  return thrownWeaponLandingFacts(facts).length > 0
    ? facts
    : [...facts, ...thrownWeaponLandingFacts(attackFacts)];
}

/**
 * A thrown attack's target facts need exactly one landing position, scoped to
 * its attacker and procedure; any other attack takes none.
 */
export function thrownWeaponLandingIssue(
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
  facts: readonly BattleTargetSpatialFact[],
): string | null {
  if (!isThrownWeaponAttack(attack)) {
    return thrownWeaponLandingFacts(facts).length === 0
      ? null
      : "Only a thrown weapon attack takes a thrown weapon landing fact.";
  }
  return thrownWeaponLanding(attackerId, attack, facts) === undefined
    ? "Thrown weapon attack target requires one thrown weapon landing fact scoped to the attacker and procedure."
    : null;
}
