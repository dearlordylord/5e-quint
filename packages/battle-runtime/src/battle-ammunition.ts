import { subjectContinuationPhaseFor } from "./battle-reducer/subject-continuation-phase.ts";
// KERNEL-COVERAGE: runtime-owner BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE
import { type HandUse, resourceCount } from "@dnd/shared/types";
import { Match } from "effect";

import {
  attackExecutionSelectionForOption,
  boundAttackExecutionSelectionMatchesOption,
  type BoundSupportedAttackActionOption,
  type SupportedAttackActionOption,
} from "./battle-action-options.ts";
import { combatantHandUses } from "./battle-reducer/creature-state-leaves.ts";
import { characterEffectiveLoadoutFromOrigin } from "./battle-reducer/character-effective-loadout.ts";
import type { CharacterBattleLoadoutRef } from "./character-creature-execution-facts.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import type {
  BattleAmmunitionKind,
  BattleAmmunitionStock,
  BattleCreatureState,
  BattleState,
} from "./battle-state-execution.ts";
import type { BattleObjectId, CombatantId } from "./identity.ts";

export function battleAmmunitionStock(
  ammunition: BattleAmmunitionKind,
  remaining: number,
): BattleAmmunitionStock {
  return { ammunition, remaining: resourceCount(remaining) };
}

export function ammunitionRequirementForAttack(
  attack: SupportedAttackActionOption,
): BattleAmmunitionKind | null {
  if (attack.kind === "unarmedStrike") return null;
  if (attack.kind === "statBlockAttack") {
    return attack.attack.ammunition ?? null;
  }
  return (
    attack.weapon.properties.find((property) => property.kind === "ammunition")
      ?.ammunition ?? null
  );
}

export function ammunitionStockIsAvailable(
  combatant: BattleCreatureState | undefined,
  ammunition: BattleAmmunitionKind,
): boolean {
  return (
    combatant?.ammunitionStocks.some(
      (stock) => stock.ammunition === ammunition && Number(stock.remaining) > 0,
    ) ?? false
  );
}

/**
 * Whether the attacker can fire the attack's ammunition: it carries matching
 * stock, and it can draw a piece. Drawing is part of the attack, and a
 * one-handed weapon needs a free hand to load (SRD "Ammunition").
 */
export function ammunitionForAttackIsReady(
  state: BattleState,
  combatant: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
): boolean {
  const ammunition = ammunitionRequirementForAttack(attack);
  return (
    ammunition === null ||
    (combatant !== undefined &&
      ammunitionStockIsAvailable(combatant, ammunition) &&
      ammunitionCanBeDrawn(state, combatant, attack))
  );
}

/**
 * A one-handed weapon needs a free loading hand; a Two-Handed weapon uses
 * the hands operating that same weapon. Stat Block hand occupancy is not
 * represented (ASSUMPTIONS.md A64).
 */
function ammunitionCanBeDrawn(
  state: BattleState,
  combatant: BattleCreatureState,
  attack: SupportedAttackActionOption,
): boolean {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, (weaponAttack) =>
      ammunitionWeaponHandsAreAvailable(state, combatant, weaponAttack),
    ),
    Match.whenOr(
      { kind: "unarmedStrike" },
      { kind: "statBlockAttack" },
      () => true,
    ),
    Match.exhaustive,
  );
}

function ammunitionWeaponHandsAreAvailable(
  state: BattleState,
  combatant: BattleCreatureState,
  attack: Extract<SupportedAttackActionOption, { readonly kind: "weapon" }>,
): boolean {
  if (combatant.origin.kind !== "character") return false;
  const loadout = characterEffectiveLoadoutFromOrigin(
    state,
    combatant.combatantId,
    combatant.origin,
  );
  const hands = combatantHandUses(state, combatant, state.grapples);
  const handUses: readonly [HandUse, HandUse] = [hands.left, hands.right];
  if (
    attack.weapon.properties.some((property) => property.kind === "two_handed")
  ) {
    return twoHandedAmmunitionWeaponIsHeld({
      weapon: loadout.weapon,
      weaponObjectId: attack.weaponObjectId,
      handUses,
    });
  }
  if (!handUses.includes("free")) return false;
  if (loadout.weapon?.itemId === attack.weaponObjectId) {
    return handUses.includes("mainWeapon");
  }
  return (
    loadout.offHandWeapon?.itemId === attack.weaponObjectId &&
    handUses.includes("offWeapon")
  );
}

function twoHandedAmmunitionWeaponIsHeld(input: {
  readonly weapon: CharacterBattleLoadoutRef["weapon"];
  readonly weaponObjectId: BattleObjectId;
  readonly handUses: readonly [HandUse, HandUse];
}): boolean {
  return (
    input.weapon?.itemId === input.weaponObjectId &&
    input.weapon.grip === "two_handed" &&
    input.handUses.includes("mainWeapon") &&
    input.handUses.every((hand) => ["mainWeapon", "free"].includes(hand))
  );
}

export function ammunitionStockIssues(
  stocks: readonly BattleAmmunitionStock[],
): string[] {
  const seen = new Set<BattleAmmunitionKind>();
  const issues: string[] = [];
  for (const stock of stocks) {
    if (seen.has(stock.ammunition)) {
      issues.push(
        `Duplicate ammunition stock for ammunition kind: ${stock.ammunition}`,
      );
    }
    seen.add(stock.ammunition);
  }
  return issues;
}

export function requiredAmmunitionKinds(
  attacks: readonly (
    | { readonly attackType: "melee" }
    | {
        readonly attackType: "ranged";
        readonly ammunition?: BattleAmmunitionKind;
      }
  )[],
): readonly BattleAmmunitionKind[] {
  return [
    ...new Set(
      attacks.flatMap((attack) =>
        attack.attackType === "melee" || attack.ammunition === undefined
          ? []
          : [attack.ammunition],
      ),
    ),
  ];
}

export function missingRequiredAmmunitionKinds(
  attacks: readonly (
    | { readonly attackType: "melee" }
    | {
        readonly attackType: "ranged";
        readonly ammunition?: BattleAmmunitionKind;
      }
  )[],
  stocks: readonly BattleAmmunitionStock[],
): readonly BattleAmmunitionKind[] {
  return requiredAmmunitionKinds(attacks).filter(
    (ammunition) => !stocks.some((stock) => stock.ammunition === ammunition),
  );
}

export function spendAmmunitionForAcceptedAttack(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly attack: BoundSupportedAttackActionOption;
}): BattleState {
  const phase = input.state.subjectResolutionPhase;
  const alreadySpent =
    phase.kind === "subjectContinuation"
      ? phase.acceptedAttackAmmunitionSpend
      : undefined;
  if (
    phase.kind === "subjectContinuation" &&
    alreadySpent?.actorId === input.actorId &&
    boundAttackExecutionSelectionMatchesOption(
      alreadySpent.attackSelection,
      input.attack,
    )
  ) {
    const { acceptedAttackAmmunitionSpend: _consumed, ...remainingPhase } =
      phase;
    return { ...input.state, subjectResolutionPhase: remainingPhase };
  }
  const ammunition = ammunitionRequirementForAttack(input.attack);
  if (ammunition === null) return input.state;
  const actor = input.state.combatants.get(input.actorId);
  if (!ammunitionStockIsAvailable(actor, ammunition) || actor === undefined) {
    return input.state;
  }
  return {
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.actorId, {
      ...actor,
      ammunitionStocks: actor.ammunitionStocks.map((stock) =>
        stock.ammunition === ammunition
          ? {
              ...stock,
              remaining: resourceCount(Number(stock.remaining) - 1),
            }
          : stock,
      ),
    }),
  };
}

export function spendAmmunitionForAcceptedAttackPendingContinuation(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly attack: BoundSupportedAttackActionOption;
  readonly subject: BattleSubject;
}): BattleState {
  const ammunition = ammunitionRequirementForAttack(input.attack);
  if (ammunition === null) return input.state;
  const spent = spendAmmunitionForAcceptedAttack(input);
  if (spent === input.state) return input.state;
  return {
    ...spent,
    subjectResolutionPhase: {
      ...subjectContinuationPhaseFor(spent, input.subject),
      acceptedAttackAmmunitionSpend: {
        actorId: input.actorId,
        attackSelection: attackExecutionSelectionForOption(input.attack),
      },
    },
  };
}
