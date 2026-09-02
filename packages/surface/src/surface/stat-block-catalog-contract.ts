import type * as Option from "effect/Option";

import type { StatBlockRecord } from "./stat-block-types.ts";

export type StatBlockId = StatBlockRecord["id"];

export type StatBlockCatalog = {
  readonly getStatBlock: (id: StatBlockId) => Option.Option<StatBlockRecord>;
  readonly listStatBlocks: () => readonly StatBlockRecord[];
};
