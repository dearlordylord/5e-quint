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
  const instructions = [
    "Requires an active battle in the selected Play Session. Use only a matching option returned by discover_battle_acts or the current battle response.",
    ...(initialSchema === null
      ? []
      : ["To start the offered action or event, copy its subject; omit fill."]),
    ...(reactionSchema === null
      ? []
      : tool === "decline_reaction"
        ? [
            'To decline an offered Reaction, copy its readyCalls entry for the chosen eligible responder. Supply its interruptDecision fill with value: { kind: "decline", responderId }; omit subject. A decline has no choice or choice.fills.',
          ]
        : [
            "For an offered Reaction, supply an interruptDecision fill for the current request and selected choice; omit subject. A reactionRollOrDamageReduction choice includes its one requested rolledDice fill from the canonical frontier choice.initialHoles, or [] when no roll is requested. Other interrupt choices require choice.fills: []; answer their later ordinary holes through provide_battle_input.",
          ]),
    ...(reactionSchema === null
      ? []
      : [
          "readyCalls contains only choices executable without new table facts. Copy the selected entry arguments and add only the selected playSessionId. Omitted choices remain available through the frontier and their requested initialHoles. After rejected or stale arguments, read_battle_state and choose from its current frontier; do not automatically retry or decline.",
        ]),
    "Returns the updated saved battle or a request for the next choice, target fact, dice result, or Reaction. Supply requested facts with provide_battle_input; complete the pending action before starting another.",
  ];
  return {
    ...battleSelectionInputSchema(
      initialSchema,
      reactionSchema,
      tool === "report_creature_fall",
    ),
    description: instructions.join(" "),
  };
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
