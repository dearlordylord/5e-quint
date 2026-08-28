import type { schemaJsonContent } from "./schema-codec.ts";
import type { errorContent } from "./tool-content.ts";

export type BattleToolResult =
  | ReturnType<typeof schemaJsonContent>
  | ReturnType<typeof errorContent>;
