import {
  battleAmmunitionStock,
  battleCreatureInitFromAuthoredStatBlock as parseBattleCreatureInitFromAuthoredStatBlock,
  projectAuthoredStatBlockBattleInitInput,
  type AuthoredStatBlockBattleInitInput,
  type BattleAmmunitionStock,
  type StatBlockBattleInitInput,
} from "@dnd/battle-runtime";
import type { AmmunitionKind } from "@dnd/shared/game-facts";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

export type { AuthoredStatBlockBattleInitInput } from "@dnd/battle-runtime";

export function authoredStatBlockBattleInput(
  input: AuthoredStatBlockBattleInitInput,
): StatBlockBattleInitInput {
  const projected = Either.getOrThrow(
    projectAuthoredStatBlockBattleInitInput(input),
  );
  return projected;
}

export function battleCreatureInitFromAuthoredStatBlock(
  input: Omit<
    AuthoredStatBlockBattleInitInput,
    "ammunitionStocks" | "conditions"
  >,
) {
  return Either.getOrThrow(
    parseBattleCreatureInitFromAuthoredStatBlock({
      ...input,
      ammunitionStocks: testAmmunitionStocksForStatBlock(input.statBlock),
      conditions: [],
    }),
  );
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
