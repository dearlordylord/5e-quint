import {
  projectAuthoredStatBlock,
  type BattleStatBlockExecutionSource,
} from "@dnd/battle-runtime";
import type { StatBlockId } from "@dnd/shared/game-facts";
import type { SrdStatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import { Option, Result } from "effect";

export type McpBattleStatBlockExecutionCatalog = {
  readonly getStatBlock: (
    statBlockId: StatBlockId,
  ) => Option.Option<BattleStatBlockExecutionSource>;
};

/**
 * Project authored catalog records once at the MCP composition boundary.
 * Battle execution receives only its runtime projection; authored records
 * remain available separately for content, selection, and admission flows.
 */
export function battleStatBlockExecutionCatalog(
  authoredCatalog: SrdStatBlockCatalog,
): McpBattleStatBlockExecutionCatalog {
  const projections = new Map<
    StatBlockId,
    Option.Option<BattleStatBlockExecutionSource>
  >();

  return {
    getStatBlock: (statBlockId) => {
      const cached = projections.get(statBlockId);
      if (cached !== undefined) return cached;

      const authored = authoredCatalog.getStatBlock(statBlockId);
      const projected = Option.flatMap(authored, (record) => {
        const projection = projectAuthoredStatBlock(record);
        return Result.isSuccess(projection)
          ? Option.some(projection.success.runtime)
          : Option.none();
      });
      projections.set(statBlockId, projected);
      return projected;
    },
  };
}
