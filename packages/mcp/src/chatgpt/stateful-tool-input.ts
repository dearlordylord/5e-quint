import type { Schema } from "effect";
import type { CharacterSheetIdSchema } from "@dnd/character-sheet-runtime";
import type { CHARACTER_SESSION_OPERATION_SCHEMAS } from "../character-session-operation-tool-input.ts";
import type { CHARACTER_SESSION_QUERY_SCHEMAS } from "../character-session-query-tool-input.ts";
import type { BATTLE_LIFECYCLE_OPERATION_SCHEMAS } from "../battle-lifecycle-tool-input.ts";
import type {
  ChatGptToolName,
  ChatGptToolSelection,
} from "./operation-tool-plan.ts";

type Mutations = typeof CHARACTER_SESSION_OPERATION_SCHEMAS;
type Queries = typeof CHARACTER_SESSION_QUERY_SCHEMAS;
type Lifecycle = typeof BATTLE_LIFECYCLE_OPERATION_SCHEMAS;
type CharacterInput = {
  readonly characterId: Schema.Schema.Type<typeof CharacterSheetIdSchema>;
};
type InputForSelection<Selection> = Selection extends {
  readonly family: "characterMutations";
  readonly operation: infer Operation extends keyof Mutations;
}
  ? CharacterInput & {
      readonly operation: Schema.Schema.Type<Mutations[Operation]>;
    }
  : Selection extends {
        readonly family: "characterQueries";
        readonly operation: infer Operation extends keyof Queries;
      }
    ? CharacterInput & {
        readonly query: Schema.Schema.Type<Queries[Operation]>;
      }
    : Selection extends {
          readonly family: "battleLifecycle";
          readonly operation: infer Operation extends keyof Lifecycle;
        }
      ? { readonly operation: Schema.Schema.Type<Lifecycle[Operation]> }
      : never;

/** The named plan and the decoded canonical operation must agree at compilation. */
export type ChatGptStatefulInput<Name extends ChatGptToolName> =
  InputForSelection<ChatGptToolSelection<Name>>;
