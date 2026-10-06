import { battleFillInputSchemaForOperation } from "./battle-fill-input-schema.ts";
import { battleSubjectInputSchemaForCarriers } from "./battle-subject-input-schema.ts";
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
  > & { readonly fills: readonly [] };
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
        args.fill.value.choice.fills.length === 0),
    {
      message:
        "Select a Reaction with choice.fills: [], then answer its ordinary holes through answer_battle_hole.",
    },
  ),
);
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
        "answer_battle_hole supplies ordinary facts only; select Reactions through their named tools.",
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
): McpObjectInputSchema {
  const subjectCarriers = Object.entries(accounting.battleSubjects)
    .filter(([, exposure]) => chatGptToolsForExposure(exposure).includes(tool))
    .map(([key]) => key);
  const standardActions = Object.entries(accounting.statBlockBonusActions)
    .filter(([, exposure]) => chatGptToolsForExposure(exposure).includes(tool))
    .map(([key]) => key);
  const initialSchema =
    subjectCarriers.length === 0
      ? null
      : battleSubjectInputSchemaForCarriers(
          selectionSchema,
          subjectCarriers,
          standardActions,
        );
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
  return battleSelectionInputSchema(
    initialSchema,
    reactionSchema,
    tool === "report_creature_fall",
  );
}

function battleSelectionInputSchema(
  initialSchema: ReturnType<typeof battleSubjectInputSchemaForCarriers> | null,
  reactionSchema: ReturnType<typeof battleFillInputSchemaForOperation> | null,
  fallReport: boolean,
): McpObjectInputSchema {
  const schema = {
    ...selectionSchema,
    type: "object",
    properties: {
      ...(initialSchema === null
        ? {}
        : { subject: initialSchema.properties.subject }),
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
                    "subject",
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
                    subject: false,
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
