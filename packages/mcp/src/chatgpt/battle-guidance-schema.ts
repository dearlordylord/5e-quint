import { BattleActKeySchema } from "./battle-act-selection.ts";
import {
  BattleHoleIdSchema,
  BattleSubjectSchema,
  BattleInterruptProcedureChoiceSchema,
} from "@dnd/battle-runtime";
import { Schema } from "effect";
import { ReadyBattleInterruptCallSchema } from "./battle-interrupt-call-guidance.ts";
import { CHATGPT_TOOL_NAMES } from "./protocol-operation.ts";
import type { ChatGptToolName } from "./tool-catalog.ts";
import { BattleActionCancellationGuidanceSchema } from "../battle-action-cancellation-guidance.ts";
import { BattleInputGuidanceSchema } from "./battle-input-guidance.ts";

export const INITIAL_INITIATIVE_GUIDANCE_TOOLS = [
  "apply_initiative_swap",
  "finalize_initial_initiative_setup",
  "read_battle_state",
] as const satisfies readonly ChatGptToolName[];

// Navigation selects a canonical choice; the Battle frontier owns its initial holes.
export const ChatGptReactionSelectionSchema =
  BattleInterruptProcedureChoiceSchema.mapMembers((members) =>
    members.map((member) =>
      member.mapFields(
        ({ initialHoles: _initialHoles, ...selection }) => selection,
      ),
    ),
  );

const RoutingSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("available"),
    tools: Schema.Array(Schema.Literals(CHATGPT_TOOL_NAMES)),
  }),
  Schema.Struct({
    kind: Schema.Literal("unavailable"),
    issue: Schema.Struct({
      content: Schema.Tuple([
        Schema.Struct({ type: Schema.Literal("text"), text: Schema.String }),
      ]),
      isError: Schema.Literal(true),
    }),
  }),
]);

export const ChatGptBattleGuidanceSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("noBattle") }),
  Schema.Struct({
    kind: Schema.Literal("initialInitiativeSetup"),
    tools: Schema.Tuple([
      Schema.Literal(INITIAL_INITIATIVE_GUIDANCE_TOOLS[0]),
      Schema.Literal(INITIAL_INITIATIVE_GUIDANCE_TOOLS[1]),
      Schema.Literal(INITIAL_INITIATIVE_GUIDANCE_TOOLS[2]),
    ]),
  }),
  Schema.Struct({
    kind: Schema.Literal("acts"),
    acts: Schema.Array(
      Schema.Union([
        Schema.Struct({
          kind: Schema.Literal("ready"),
          label: Schema.String,
          summary: Schema.String,
          readyCalls: Schema.NonEmptyArray(
            Schema.Struct({
              tool: Schema.Literals(CHATGPT_TOOL_NAMES),
              arguments: Schema.Struct({ actKey: BattleActKeySchema }),
            }),
          ),
        }),
        Schema.Struct({
          kind: Schema.Literal("tableFactsRequired"),
          label: Schema.String,
          summary: Schema.String,
          arguments: Schema.Struct({ actKey: BattleActKeySchema }),
          routing: RoutingSchema.members[0],
          requiredArguments: Schema.Tuple([
            Schema.Literal("reactionSpellTargetFacts"),
          ]),
        }),
        Schema.Struct({
          kind: Schema.Literal("unavailable"),
          label: Schema.String,
          summary: Schema.String,
          subject: BattleSubjectSchema,
          issue: RoutingSchema.members[1].fields.issue,
        }),
      ]),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("ordinaryContinuation"),
    inputs: Schema.Array(BattleInputGuidanceSchema),
    movementInputs: Schema.Array(
      Schema.Struct({
        example: Schema.Struct({
          kind: Schema.Literal("movement"),
          holeId: BattleHoleIdSchema,
          value: Schema.Struct({
            speedKind: Schema.Literal("walk"),
            movementCostFeet: Schema.Literal(5),
            provokedOpportunityAttacks: Schema.Tuple([]),
          }),
        }),
        instructions: Schema.Array(Schema.String),
      }),
    ),
    cancellation: BattleActionCancellationGuidanceSchema,
    subject: BattleSubjectSchema,
    routing: RoutingSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("reactionDecision"),
    declineTool: Schema.Literal("decline_reaction"),
    readyCalls: Schema.Array(ReadyBattleInterruptCallSchema),
    choices: Schema.Array(
      Schema.Struct({
        selection: ChatGptReactionSelectionSchema,
        routing: RoutingSchema,
      }),
    ),
  }),
]);
export type ChatGptBattleGuidance = Schema.Schema.Type<
  typeof ChatGptBattleGuidanceSchema
>;
