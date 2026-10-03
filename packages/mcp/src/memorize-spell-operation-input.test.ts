import { Result, Schema } from "effect";
import { expect, test } from "vitest";
import { ApplyCharacterSessionOperationArgsSchema } from "./character-session-operation-tool-input.ts";
const replacement = {
  spellcastingSourceUnitId: "class_wizard",
  removedSpellUnitId: "magic_missile",
  addedSpellUnitId: "shield",
};
const operation = {
  kind: "completeShortRest",
  restedTicks: 600,
  preparedSpellReplacement: replacement,
};
const decode = Schema.decodeUnknownResult(
  ApplyCharacterSessionOperationArgsSchema,
  { onExcessProperty: "error" },
);
test("Short Rest operation admits one Spellbook replacement and rejects multiple or forged shape", () => {
  const args = { characterId: "character:memorize-schema", operation };
  expect(Result.isSuccess(decode(args))).toBe(true);
  expect(
    Result.isFailure(
      decode({
        ...args,
        operation: {
          ...operation,
          preparedSpellReplacement: [replacement, replacement],
        },
      }),
    ),
  ).toBe(true);
  expect(
    Result.isFailure(
      decode({
        ...args,
        operation: {
          ...operation,
          preparedSpellReplacement: {
            ...replacement,
            featureUnitId: "forged_feature",
          },
        },
      }),
    ),
  ).toBe(true);
  expect(
    Result.isFailure(
      decode({
        ...args,
        operation: {
          ...operation,
          preparedSpellReplacement: {
            ...replacement,
            addedSpellUnitId: ["shield", "sleep"],
          },
        },
      }),
    ),
  ).toBe(true);
});
