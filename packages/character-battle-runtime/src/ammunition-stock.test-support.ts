import {
  battleAmmunitionStock,
  type BattleAmmunitionStock,
} from "@dnd/battle-runtime";
import type { AmmunitionKind } from "@dnd/shared/game-facts";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

export function testAmmunitionStocksForStatBlock(
  statBlock: Pick<StatBlockRecord, "statBlock">,
): readonly BattleAmmunitionStock[] {
  const attacks = [
    ...(statBlock.statBlock.actions?.attacks ?? []),
    ...(statBlock.statBlock.legendaryActions?.actions.attacks ?? []),
  ];
  const ammunitionKinds = new Set<AmmunitionKind>();
  for (const attack of attacks) {
    if (attack.attackType === "ranged" && attack.ammunition !== undefined) {
      ammunitionKinds.add(attack.ammunition);
    }
  }
  return [...ammunitionKinds].map((ammunition) =>
    battleAmmunitionStock(ammunition, 20),
  );
}
