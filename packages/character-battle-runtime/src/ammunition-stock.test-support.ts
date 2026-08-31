import {
  battleAmmunitionStock,
  type AuthoredStatBlockBattleInitInput,
  type BattleAmmunitionStock,
} from "@dnd/battle-runtime";
import type { AmmunitionKind } from "@dnd/shared/game-facts";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

export type { AuthoredStatBlockBattleInitInput } from "@dnd/battle-runtime";

export function authoredStatBlockBattleInit(
  input: Omit<
    AuthoredStatBlockBattleInitInput,
    "ammunitionStocks" | "conditions"
  >,
): AuthoredStatBlockBattleInitInput {
  return {
    ...input,
    ammunitionStocks: testAmmunitionStocksForStatBlock(input.statBlock),
    conditions: [],
  };
}

export function testAmmunitionStocksForStatBlock(
  statBlock: Pick<StatBlockRecord, "statBlock">,
): readonly BattleAmmunitionStock[] {
  const ammunitionKinds = new Set<AmmunitionKind>();
  const entries = [
    ...(statBlock.statBlock.actions ?? []),
    ...(statBlock.statBlock.legendaryActions?.entries ?? []),
  ];
  for (const entry of entries) {
    if (entry.kind !== "executable" || entry.procedure.kind !== "attack_roll") {
      continue;
    }
    const attack = entry.procedure;
    if (attack.attackType === "ranged" && attack.ammunition !== undefined) {
      ammunitionKinds.add(attack.ammunition);
    }
  }
  return [...ammunitionKinds].map((ammunition) =>
    battleAmmunitionStock(ammunition, 20),
  );
}
