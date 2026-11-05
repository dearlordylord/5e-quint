import { Schema } from "effect";
import { expect, test } from "vitest";
import {
  ChatGptBattleGuidanceSchema,
  INITIAL_INITIATIVE_GUIDANCE_TOOLS,
} from "./battle-guidance-schema.ts";
import { chatGptNextOperations } from "./navigation.ts";

const operations = [
  "discover_battle_acts",
  "read_battle_state",
  "end_battle",
] as const;
const guidance = Schema.decodeUnknownSync(ChatGptBattleGuidanceSchema);

test("pending Battle guidance excludes unrelated navigation and preserves cancellation", () => {
  expect(
    chatGptNextOperations(
      operations,
      guidance({
        kind: "ordinaryContinuation",
        subject: { tag: "action", action: "dodge", actorId: "synthetic-actor" },
        inputs: [],
        movementInputs: [],
        routing: { kind: "available", tools: ["provide_battle_input"] },
        cancellation: {
          kind: "available",
          tool: "cancel_battle_action",
          arguments: { expectedSelectionId: "battle-action-selection:1" },
        },
      }),
    ),
  ).toEqual([
    "provide_battle_input",
    "cancel_battle_action",
    "read_battle_state",
  ]);
});

test("Reaction guidance retains the current choices and decline operation", () => {
  expect(
    chatGptNextOperations(
      operations,
      guidance({
        kind: "reactionDecision",
        declineTool: "decline_reaction",
        readyCalls: [],
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
      }),
    ),
  ).toEqual(["decline_reaction", "move", "read_battle_state"]);
});

test("no Battle and selectable Acts retain general navigation", () => {
  expect(
    chatGptNextOperations(["create_character_draft"], { kind: "noBattle" }),
  ).toEqual(["create_character_draft"]);
  const acts = chatGptNextOperations(operations, { kind: "acts", acts: [] });
  expect(acts).toContain("end_battle");
  expect(acts).toContain("read_battle_state");
});

test("initial Initiative retains its canonical setup tools", () => {
  expect(
    chatGptNextOperations([], {
      kind: "initialInitiativeSetup",
      tools: INITIAL_INITIATIVE_GUIDANCE_TOOLS,
    }),
  ).toEqual(INITIAL_INITIATIVE_GUIDANCE_TOOLS);
});
