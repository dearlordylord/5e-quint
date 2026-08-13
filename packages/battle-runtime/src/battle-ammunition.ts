// KERNEL-COVERAGE: runtime-owner BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE
import { resourceCount } from "@dnd/shared/types";

import {
  attackExecutionSelectionForOption,
  boundAttackExecutionSelectionMatchesOption,
  type BoundSupportedAttackActionOption,
  type SupportedAttackActionOption,
} from "./battle-action-options.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import type {
  BattleAmmunitionKind,
  BattleAmmunitionStock,
  BattleCreatureState,
  BattleState,
} from "./battle-state-execution.ts";
import type { CombatantId } from "./identity.ts";

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

export function ammunitionForAttackIsAvailable(
  combatant: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
): boolean {
  const ammunition = ammunitionRequirementForAttack(attack);
  return (
    ammunition === null || ammunitionStockIsAvailable(combatant, ammunition)
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
  const alreadySpent =
    input.state.subjectResolutionPhase.kind === "subjectContinuation"
      ? input.state.subjectResolutionPhase.acceptedAttackAmmunitionSpend
      : undefined;
  if (
    alreadySpent?.actorId === input.actorId &&
    boundAttackExecutionSelectionMatchesOption(
      alreadySpent.attackSelection,
      input.attack,
    )
  ) {
    return {
      ...input.state,
      subjectResolutionPhase: { kind: "subjectSelection" },
    };
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
      kind: "subjectContinuation",
      subject: input.subject,
      acceptedAttackAmmunitionSpend: {
        actorId: input.actorId,
        attackSelection: attackExecutionSelectionForOption(input.attack),
      },
    },
  };
}
