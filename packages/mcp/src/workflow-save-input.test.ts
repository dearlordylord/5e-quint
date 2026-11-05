import { describe, expect, it } from "vitest";
import { Result, Schema } from "effect";
import {
  ChatGptBattleHoleArgsSchema,
  chatGptBattleHoleInputSchema,
} from "./chatgpt/battle-execution-schema.ts";
import {
  createDraft2020JsonSchemaValidator,
  requireJsonSchema,
} from "../test-support/json-schema.ts";
import { workflowGuide } from "./workflow-guide.ts";

describe("documented Saving Throw input", () => {
  it("passes the advertised input schema and actual decoder with the example's natural roll", () => {
    const fill: unknown = JSON.parse(
      workflowGuide("chatgpt").acceptedInputs.savingThrowOutcomeFill,
    );
    const args = { fill };
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ChatGptBattleHoleArgsSchema)(args),
      ),
    ).toBe(true);
    const validate = createDraft2020JsonSchemaValidator().getValidator(
      requireJsonSchema(chatGptBattleHoleInputSchema(), "provide_battle_input"),
    );
    expect(validate(args).valid).toBe(true);
  });
});
