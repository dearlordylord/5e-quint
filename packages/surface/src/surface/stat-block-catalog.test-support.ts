import { Option } from "effect";

import type { StatBlockId } from "./stat-block-catalog.ts";
import type { StatBlockRecord } from "./types.ts";

/**
 * Test-only assertion for a stat block id established by a fixture or static
 * scenario. Runtime callers must use the catalog's Option-returning lookup.
 */
export function assertStatBlockForTest<T extends StatBlockRecord>(
  catalog: {
    readonly getStatBlock: (id: StatBlockId) => Option.Option<T>;
  },
  id: StatBlockId,
): T {
  const statBlock = catalog.getStatBlock(id);
  if (Option.isNone(statBlock)) {
    throw new Error(`Expected Stat Block fixture to be installed: ${id}`);
  }
  return statBlock.value;
}
