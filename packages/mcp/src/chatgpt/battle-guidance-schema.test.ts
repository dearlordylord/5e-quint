import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../../test-support/json-schema.ts";
import { mcpOutputJsonSchema } from "../schema-codec.ts";
import { errorContent } from "../tool-content.ts";
import { productionBattleConsumerSeam } from "../../test-support/cross-boundary-battle.ts";
import {
  ChatGptBattleGuidanceSchema,
  INITIAL_INITIATIVE_GUIDANCE_TOOLS,
} from "./battle-guidance-schema.ts";

const subject = {
  tag: "action",
  action: "dodge",
  actorId: "synthetic-actor",
} as const;
const routing = { kind: "available", tools: ["dodge"] } as const;

describe("ChatGPT Battle guidance contract", () => {
  it("preserves phase, subject and routing constraints in its published schema", () => {
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(
        mcpOutputJsonSchema(ChatGptBattleGuidanceSchema),
        "Battle guidance",
      ),
    );
    for (const value of [
      { kind: "noBattle" },
      {
        kind: "initialInitiativeSetup",
        tools: INITIAL_INITIATIVE_GUIDANCE_TOOLS,
      },
      { kind: "acts", acts: [{ subject, routing }] },
      { kind: "ordinaryContinuation", subject, routing },
      {
        kind: "ordinaryContinuation",
        subject,
        routing: {
          kind: "unavailable",
          issue: errorContent("Synthetic unavailable operation", {
            code: "SYNTHETIC_UNAVAILABLE",
          }),
        },
      },
      {
        kind: "reactionDecision",
        declineTool: "decline_reaction",
        choices: [],
      },
      {
        kind: "reactionDecision",
        declineTool: "decline_reaction",
        choices: [
          {
            selection: {
              kind: "nestedProcedure",
              subject: {
                tag: "runtimeCommand",
                command: "releaseReadiedMovement",
                actorId: "synthetic-actor",
                readiedMovementActorId: "synthetic-reactor",
              },
            },
            routing: { kind: "available", tools: ["move"] },
          },
        ],
      },
    ]) {
      expect(
        Result.isSuccess(
          Schema.decodeUnknownResult(ChatGptBattleGuidanceSchema, {
            onExcessProperty: "error",
          })(value),
        ),
        JSON.stringify(value),
      ).toBe(true);
      expect(validate(value).valid).toBe(true);
    }
    for (const value of [
      { kind: "noBattle", acts: [] },
      {
        kind: "initialInitiativeSetup",
        tools: [...INITIAL_INITIATIVE_GUIDANCE_TOOLS].reverse(),
      },
      {
        kind: "initialInitiativeSetup",
        tools: INITIAL_INITIATIVE_GUIDANCE_TOOLS.slice(0, 2),
      },
      {
        kind: "acts",
        acts: [
          {
            subject,
            routing: { kind: "available", tools: ["resolve_battle_act"] },
          },
        ],
      },
      {
        kind: "ordinaryContinuation",
        subject: { ...subject, action: "synthetic-unsupported" },
        routing,
      },
      {
        kind: "ordinaryContinuation",
        subject,
        routing: { ...routing, issue: errorContent("Unexpected issue") },
      },
      { kind: "reactionDecision", declineTool: "attack", choices: [] },
      {
        kind: "reactionDecision",
        declineTool: "decline_reaction",
        choices: [{ selection: { kind: "synthetic-choice" }, routing }],
      },
      {
        kind: "reactionDecision",
        declineTool: "decline_reaction",
        choices: [
          {
            selection: {
              kind: "nestedProcedure",
              subject: {
                tag: "runtimeCommand",
                command: "releaseReadiedMovement",
                actorId: "synthetic-actor",
                readiedMovementActorId: "synthetic-reactor",
              },
              initialHoles: [],
            },
            routing: { kind: "available", tools: ["move"] },
          },
        ],
      },
    ]) {
      expect(
        Result.isSuccess(
          Schema.decodeUnknownResult(ChatGptBattleGuidanceSchema, {
            onExcessProperty: "error",
          })(value),
        ),
        JSON.stringify(value),
      ).toBe(false);
      expect(validate(value).valid).toBe(false);
    }
  });

  it("keeps complete Reaction choices in the protocol frontier and agrees with their navigation selections", async () => {
    const cases = await productionBattleConsumerSeam("chatgpt");
    const reaction = cases.find((entry) => entry.kind === "interruptDecision");
    if (!reaction || reaction.envelope.frontier.kind !== "interruptDecision")
      throw new Error("The protocol scenario must expose a Reaction frontier.");
    const guidance = Schema.decodeUnknownSync(
      Schema.Struct({
        structuredContent: Schema.Struct({
          chatGptBattleOperations: ChatGptBattleGuidanceSchema,
        }),
      }),
    )(reaction.toolResult).structuredContent.chatGptBattleOperations;
    expect(guidance.kind).toBe("reactionDecision");
    if (guidance.kind !== "reactionDecision")
      throw new Error("Expected Reaction navigation.");
    expect(guidance.choices.map((entry) => entry.selection)).toEqual(
      reaction.envelope.frontier.choices.map(
        ({ choice: { initialHoles: _initialHoles, ...selection } }) =>
          selection,
      ),
    );
    expect(reaction.envelope.frontier.choices).toEqual(
      reaction.runtimeEnvelope.frontier.kind === "interruptDecision"
        ? reaction.runtimeEnvelope.frontier.choices
        : [],
    );
    for (const choice of reaction.envelope.frontier.choices)
      expect(Array.isArray(choice.choice.initialHoles)).toBe(true);
  });
});
