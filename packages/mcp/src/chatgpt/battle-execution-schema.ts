import {
  battleFillInputSchemaForOperation,
  battleFillKindInputSchema,
} from "./battle-fill-input-schema.ts";
import { BattleActKeySchema } from "./battle-act-selection.ts";
import {
  BattleSubjectSchema,
  BattleFillSchema,
  BattleFallingCreatureMitigationTriggerFactSchema,
  type BattleFill,
  type BattleInterruptDecision,
} from "@dnd/battle-runtime";
import { Schema } from "effect";
import { chatGptToolsForExposure } from "./exposure-tools.ts";
import { shareToolSchemaDefinitions } from "../json-schema-sharing.ts";
import {
  mcpObjectJsonSchema,
  omitUnreferencedDefinitions,
  type McpObjectInputSchema,
  type McpOutputSchema,
} from "../schema-codec.ts";
import type { ChatGptExposureAccounting } from "./operation-exposure.ts";
import {
  CHATGPT_OPERATION_EXPOSURE,
  type ChatGptToolName,
} from "./operation-tool-plan.ts";

const InitialBattleArgsSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  reactionSpellTargetFacts: Schema.optionalKey(
    Schema.Array(BattleFallingCreatureMitigationTriggerFactSchema),
  ),
}).annotate({ parseOptions: { onExcessProperty: "error" } });
type CreatureFallSubject = Extract<
  typeof BattleSubjectSchema.Type,
  { readonly tag: "runtimeCommand"; readonly command: "creatureFalls" }
>;
type InitialBattleArgs =
  | {
      readonly subject: Exclude<
        typeof BattleSubjectSchema.Type,
        CreatureFallSubject
      >;
      readonly reactionSpellTargetFacts?: never;
    }
  | {
      readonly subject: CreatureFallSubject;
      readonly reactionSpellTargetFacts: NonNullable<
        (typeof InitialBattleArgsSchema.Type)["reactionSpellTargetFacts"]
      >;
    };
type InterruptResolution = Extract<
  BattleInterruptDecision,
  { readonly kind: "resolve" }
>;
type InterruptChoice = InterruptResolution["choice"];
type ReactionSelectionChoice = {
  [Kind in InterruptChoice["kind"]]: Omit<
    Extract<InterruptChoice, { readonly kind: Kind }>,
    "fills"
  > & {
    readonly fills: Kind extends "reactionRollOrDamageReduction"
      ?
          | readonly []
          | readonly [Extract<BattleFill, { readonly kind: "rolledDice" }>]
      : readonly [];
  };
}[InterruptChoice["kind"]];
type ReactionSelectionFill = Omit<
  Extract<BattleFill, { readonly kind: "interruptDecision" }>,
  "value"
> & {
  readonly value:
    | Extract<BattleInterruptDecision, { readonly kind: "decline" }>
    | (Omit<InterruptResolution, "choice"> & {
        readonly choice: ReactionSelectionChoice;
      });
};
const InitialSelectionSchema = InitialBattleArgsSchema.pipe(
  Schema.refine(
    (args): args is InitialBattleArgs =>
      args.subject.tag === "runtimeCommand" &&
      args.subject.command === "creatureFalls"
        ? args.reactionSpellTargetFacts !== undefined
        : args.reactionSpellTargetFacts === undefined,
    {
      message:
        "Supply reactionSpellTargetFacts on the initial creature-fall report; omit it on other operations.",
    },
  ),
);
const BattleFillArgsSchema = Schema.Struct({ fill: BattleFillSchema }).annotate(
  { parseOptions: { onExcessProperty: "error" } },
);
const ReactionSelectionArgsSchema = BattleFillArgsSchema.pipe(
  Schema.refine(
    (args): args is { readonly fill: ReactionSelectionFill } =>
      args.fill.kind === "interruptDecision" &&
      (args.fill.value.kind === "decline" ||
        (args.fill.value.choice.kind === "reactionRollOrDamageReduction"
          ? args.fill.value.choice.fills.length <= 1 &&
            args.fill.value.choice.fills.every(
              (fill) => fill.kind === "rolledDice",
            )
          : args.fill.value.choice.fills.length === 0)),
    {
      message:
        "For a Reaction modifier, include its requested reduction roll in choice.fills, or [] when no roll is requested. Select other Reactions with choice.fills: [], then answer their ordinary holes through provide_battle_input.",
    },
  ),
);
export const ChatGptBattlePublicInitialArgsSchema = Schema.Struct({
  actKey: BattleActKeySchema,
  reactionSpellTargetFacts: Schema.optionalKey(
    Schema.Array(BattleFallingCreatureMitigationTriggerFactSchema),
  ),
}).annotate({ parseOptions: { onExcessProperty: "error" } });
export const ChatGptBattlePublicArgsSchema = Schema.Union([
  ChatGptBattlePublicInitialArgsSchema,
  ReactionSelectionArgsSchema,
]);

export const ChatGptBattleExecutionArgsSchema = Schema.Union([
  InitialSelectionSchema,
  ReactionSelectionArgsSchema,
]);
export type ChatGptBattleExecutionArgs =
  typeof ChatGptBattleExecutionArgsSchema.Type;
export const ChatGptBattleHoleArgsSchema = BattleFillArgsSchema.pipe(
  Schema.refine(
    (
      args,
    ): args is {
      readonly fill: Exclude<
        BattleFill,
        { readonly kind: "interruptDecision" }
      >;
    } => args.fill.kind !== "interruptDecision",
    {
      message:
        "provide_battle_input supplies ordinary facts only; select Reactions through their named tools.",
    },
  ),
);

// Build both named branches against one definition namespace before pruning.
const selectionSchema: McpObjectInputSchema = {
  ...shareToolSchemaDefinitions(
    mcpObjectJsonSchema(
      Schema.Struct({
        subject: Schema.optionalKey(BattleSubjectSchema),
        fill: Schema.optionalKey(BattleFillSchema),
        reactionSpellTargetFacts: Schema.optionalKey(
          Schema.Array(BattleFallingCreatureMitigationTriggerFactSchema),
        ),
      }),
    ),
  ),
  type: "object",
} as const;
function isGeneratedRecord(value: unknown): value is McpOutputSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function generatedRecord(value: unknown): McpOutputSchema {
  if (!isGeneratedRecord(value))
    throw new Error(
      "Generated Battle schema must declare a field or definition map.",
    );
  return value;
}
const accounting: ChatGptExposureAccounting = CHATGPT_OPERATION_EXPOSURE;
export function chatGptBattleExecutionInputSchema(
  tool: ChatGptToolName,
): McpObjectInputSchema & { readonly description: string } {
  const subjectCarriers = Object.entries(accounting.battleSubjects)
    .filter(([, exposure]) => chatGptToolsForExposure(exposure).includes(tool))
    .map(([key]) => key);
  const initialSchema =
    subjectCarriers.length === 0
      ? null
      : mcpObjectJsonSchema(Schema.Struct({ actKey: BattleActKeySchema }));
  const reactionChoices = Object.entries(accounting.interruptSelections)
    .filter(([, exposure]) => chatGptToolsForExposure(exposure).includes(tool))
    .map(([key]) => key);
  const modifierKinds = Object.entries(accounting.reactionModifiers)
    .filter(([, exposure]) => chatGptToolsForExposure(exposure).includes(tool))
    .map(([key]) => key);
  const reactionSchema =
    reactionChoices.length === 0 && tool !== "decline_reaction"
      ? null
      : battleFillInputSchemaForOperation(selectionSchema, {
          ordinaryAllowed: false,
          reactionChoices,
          modifierKinds,
          declineAllowed: tool === "decline_reaction",
        });
  const invocation =
    initialSchema === null
      ? "Accepts the current Reaction's interruptDecision fill."
      : reactionSchema === null
        ? "Accepts a current Act's actKey."
        : "Accepts a current Act's actKey or Reaction's interruptDecision fill.";
  return {
    ...battleSelectionInputSchema(
      initialSchema,
      reactionSchema,
      tool === "report_creature_fall",
    ),
    description: `${invocation} Copy returned readyCalls arguments when present; otherwise use the current choice or tableFactsRequired arguments and requested facts. Add playSessionId; supply later facts through provide_battle_input.`,
  };
}

function battleSelectionInputSchema(
  initialSchema: McpObjectInputSchema | null,
  reactionSchema: ReturnType<typeof battleFillInputSchemaForOperation> | null,
  fallReport: boolean,
): McpObjectInputSchema {
  const schema = {
    ...selectionSchema,
    type: "object",
    properties: {
      ...(initialSchema === null
        ? {}
        : { actKey: generatedRecord(initialSchema.properties).actKey }),
      ...(fallReport
        ? {
            reactionSpellTargetFacts: generatedRecord(
              selectionSchema.properties,
            ).reactionSpellTargetFacts,
          }
        : {}),
      ...(reactionSchema === null
        ? {}
        : { fill: generatedRecord(reactionSchema.properties).fill }),
    },
    required: [],
    allOf: [
      {
        anyOf: [
          ...(initialSchema === null
            ? []
            : [
                {
                  required: [
                    "actKey",
                    ...(fallReport ? ["reactionSpellTargetFacts"] : []),
                  ],
                  properties: { fill: false },
                },
              ]),
          ...(reactionSchema === null
            ? []
            : [
                {
                  required: ["fill"],
                  properties: {
                    actKey: false,
                    reactionSpellTargetFacts: false,
                  },
                },
              ]),
        ],
      },
    ],
    $defs: {
      ...generatedRecord(selectionSchema.$defs),
      ...(reactionSchema === null ? {} : generatedRecord(reactionSchema.$defs)),
    },
  } as const;
  return omitUnreferencedDefinitions({
    ...shareToolSchemaDefinitions(omitUnreferencedDefinitions(schema)),
    type: "object",
  });
}

export function chatGptRequestedBattleInputSchema(): McpObjectInputSchema {
  return {
    type: "object",
    properties: {
      fill: {
        type: "object",
        description:
          "Construct the complete fill object from the fillSchema returned for the current pending Battle input. Copy its kind and holeId, then supply its requested fields. The engine validates typed fields against the pending request; this envelope does not admit arbitrary Battle facts.",
        properties: {
          kind: battleFillKindInputSchema(chatGptBattleHoleInputSchema()),
          holeId: { type: "string" },
        },
        required: ["kind", "holeId"],
        additionalProperties: true,
      },
    },
    required: ["fill"],
    additionalProperties: false,
  };
}

export function chatGptBattleHoleInputSchema(): McpObjectInputSchema {
  return omitUnreferencedDefinitions(
    battleFillInputSchemaForOperation(
      {
        ...shareToolSchemaDefinitions(
          mcpObjectJsonSchema(ChatGptBattleHoleArgsSchema),
        ),
        type: "object",
      },
      {
        ordinaryAllowed: true,
        reactionChoices: [],
        modifierKinds: [],
        declineAllowed: false,
      },
    ),
  );
}
