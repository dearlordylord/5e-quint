import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog-contract";
import type { StatBlockId } from "@dnd/shared/game-facts";

/**
 * Authored Stat Block lookup admitted for Find Familiar reappearance and
 * presentation. Battle state stores only the projected execution facts.
 */
export type FindFamiliarStatBlockCatalog = {
  readonly getStatBlock: (
    statBlockId: StatBlockId,
  ) => ReturnType<StatBlockCatalog["getStatBlock"]>;
};
