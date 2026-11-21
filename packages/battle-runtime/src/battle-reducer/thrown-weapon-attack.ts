// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.THROWN_WEAPON_ATTACK
// SRD 5.2.1 "Thrown": a weapon with the Thrown property can be thrown to make a
// ranged attack, a Melee weapon included. The weapon leaves its owner's hand,
// so once the attack roll is accepted, hit or miss, it rests on the ground at
// the table-supplied landing position, where the owner can pick it up again.
import type {
  BattleDroppedObjectSource,
  BattleResolutionResult,
  BattleState,
  BattleTargetSpatialFact,
  BattleTerminalResolutionResult,
} from "../battle-state-execution.ts";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import type { CombatantId } from "../identity.ts";
import { battleStateWithGroundObjects } from "./battle-object-lifecycle.ts";
import { snapshotBattle } from "./battle-snapshot.ts";

type ThrownWeaponLandingFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "thrownWeaponLanding" }
>;

type ThrownWeaponAttack = Extract<
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

function isThrownWeaponAttack(
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

function thrownWeaponLanding(
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

/**
 * Puts a thrown weapon on the ground at its landing position after its attack
 * roll was accepted; withThrownWeaponDroppedOutcome reports it. Any other
 * attack, or one prevented before its roll, keeps its weapon in hand.
 */
export function withThrownWeaponReleased(input: {
  readonly result: BattleTerminalResolutionResult;
  readonly attackerId: CombatantId;
  readonly attack: SupportedAttackActionOption;
  readonly facts: readonly BattleTargetSpatialFact[];
}): BattleTerminalResolutionResult {
  const { result, attack } = input;
  if (result.tag !== "resolved" || !isThrownWeaponAttack(attack)) {
    return result;
  }
  const landing = thrownWeaponLanding(input.attackerId, attack, input.facts);
  /* v8 ignore start -- @preserve -- The target fill was refused without one scoped landing fact. */
  if (landing === undefined) {
    return result;
  }
  /* v8 ignore stop -- @preserve */
  const source = {
    kind: "thrownWeaponAttack",
    procedureRef: attack.procedureRef,
  } as const;
  const placed = battleStateWithGroundObjects(result.state, [
    {
      actorId: input.attackerId,
      objectId: attack.weaponObjectId,
      positionId: landing.positionId,
      source,
    },
  ]);
  /* v8 ignore start -- @preserve -- A held weapon can't already be on the ground: the attack option needs it in hand. */
  if (placed.tag === "conflict") {
    return result;
  }
  /* v8 ignore stop -- @preserve */
  return {
    ...result,
    state: placed.state,
    snapshot: snapshotBattle(placed.state),
  };
}

/**
 * Reports a weapon this attack threw as a dropped object on the attack's
 * resolved result, however the attack's resolution carried its state.
 */
export function withThrownWeaponDroppedOutcome(input: {
  readonly stateBefore: BattleState;
  readonly result: BattleResolutionResult;
  readonly attackerId: CombatantId;
  readonly attack: SupportedAttackActionOption;
}): BattleResolutionResult {
  const { result, attack } = input;
  if (result.tag !== "resolved" || !isThrownWeaponAttack(attack)) {
    return result;
  }
  const landed = newlyThrownWeaponOnGround(
    input.stateBefore,
    result.state,
    input.attackerId,
    attack,
  );
  if (landed === undefined) return result;
  return {
    ...result,
    droppedObjects: [
      ...(result.droppedObjects ?? []),
      {
        kind: "objectDropped",
        actorId: input.attackerId,
        objectId: attack.weaponObjectId,
        source: landed,
      },
    ],
  };
}

function newlyThrownWeaponOnGround(
  stateBefore: BattleState,
  state: BattleState,
  attackerId: CombatantId,
  attack: ThrownWeaponAttack,
):
  | Extract<BattleDroppedObjectSource, { readonly kind: "thrownWeaponAttack" }>
  | undefined {
  const source = state.groundObjects
    .get(attackerId)
    ?.get(attack.weaponObjectId)?.source;
  return source?.kind === "thrownWeaponAttack" &&
    stateBefore.groundObjects.get(attackerId)?.has(attack.weaponObjectId) !==
      true
    ? source
    : undefined;
}
