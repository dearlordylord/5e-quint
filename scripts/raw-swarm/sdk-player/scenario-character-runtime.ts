import { pathToFileURL } from "node:url";
import {
  abilityScoreAssignment,
  characterCreationIssueMessage,
  characterDraftId,
  creationChoiceOptionId,
  creationHoleId,
  createCharacterDraft,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
} from "../../../packages/character-creation-runtime/src/index.ts";
import {
  characterSheetConstructionIssuesSummary,
  characterSheetId,
  createFreshCharacterSheet,
  parseFreshCharacterSheet,
  type FreshCharacterSheet,
} from "../../../packages/character-sheet-runtime/src/index.ts";
import { Hp } from "../../../packages/shared/src/types.ts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "../../../packages/surface/src/surface/unit-catalog.ts";
import { Either, Match } from "effect";

import type { JsonValue } from "./continuation-contract.ts";
import { isJsonValue } from "./json-value.ts";
import type { ScenarioCharacterContext } from "./scenario-character-contract.ts";

type ScenarioCharacterResult =
  | {
      readonly tag: "ready";
      readonly characterSheets: readonly FreshCharacterSheet[];
      readonly observation: JsonValue;
    }
  | {
      readonly tag: "obstructed";
      readonly obstruction: string;
      readonly observation: JsonValue;
    }
  | { readonly tag: "invalid"; readonly message: string };

type CharacterContextResult =
  | { readonly tag: "ready"; readonly context: ScenarioCharacterContext }
  | { readonly tag: "invalid"; readonly message: string };

function characterContext(): CharacterContextResult {
  return Match.value(
    buildUnitCatalog({ collections: [srdUnitCollection] }),
  ).pipe(
    Match.when({ tag: "invalid" }, () => ({
      tag: "invalid" as const,
      message: "SRD Unit catalog is invalid.",
    })),
    Match.when({ tag: "ok" }, ({ catalog }) => ({
      tag: "ready" as const,
      context: {
        unitCatalog: catalog,
        sdk: {
          abilityScoreAssignment,
          characterCreationIssueMessage,
          characterDraftId,
          characterSheetConstructionIssuesSummary,
          characterSheetId,
          createCharacterDraft,
          createFreshCharacterSheet,
          creationChoiceOptionId,
          creationHoleId,
          discoverCreationHoles,
          fillCreationHoles,
          finalizeCharacterDraft,
          hp: Hp,
          isLeft: Either.isLeft,
        },
      },
    })),
    Match.exhaustive,
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function parsedCharacterSheets(
  value: unknown,
  context: ScenarioCharacterContext,
): Either.Either<readonly FreshCharacterSheet[], string> {
  if (!Array.isArray(value)) {
    return Either.left("Scenario characters must return Character Sheets.");
  }
  const parsed: FreshCharacterSheet[] = [];
  const issues: string[] = [];
  for (const [index, candidate] of value.entries()) {
    const sheet = parseFreshCharacterSheet(candidate, context.unitCatalog);
    if (Either.isLeft(sheet)) {
      issues.push(`Character Sheet ${String(index + 1)} is invalid.`);
      continue;
    }
    parsed.push(sheet.right);
  }
  const ids = parsed.map(({ characterId }) => characterId);
  if (new Set(ids).size !== ids.length) {
    issues.push("Scenario characters returned duplicate Character Sheet ids.");
  }
  return issues.length === 0
    ? Either.right(parsed)
    : Either.left(issues.join(" "));
}

function validateOutcome(
  outcome: unknown,
  context: ScenarioCharacterContext,
): ScenarioCharacterResult {
  if (!isRecord(outcome)) {
    return {
      tag: "invalid",
      message: "Scenario characters must return an outcome.",
    };
  }
  const observation = outcome.observation;
  if (!isJsonValue(observation)) {
    return {
      tag: "invalid",
      message: "Scenario character observation must be JSON data.",
    };
  }
  return Match.value(outcome.kind).pipe(
    Match.when("ready", () => {
      const sheets = parsedCharacterSheets(outcome.characterSheets, context);
      return Either.isRight(sheets)
        ? {
            tag: "ready" as const,
            characterSheets: sheets.right,
            observation,
          }
        : { tag: "invalid" as const, message: sheets.left };
    }),
    Match.when("obstructed", () =>
      typeof outcome.obstruction === "string" &&
      outcome.obstruction.trim().length > 0
        ? {
            tag: "obstructed" as const,
            obstruction: outcome.obstruction,
            observation,
          }
        : {
            tag: "invalid" as const,
            message: "Scenario character obstruction is empty.",
          },
    ),
    Match.orElse(() => ({
      tag: "invalid" as const,
      message: "Scenario characters returned an unknown outcome.",
    })),
  );
}

export async function evaluateScenarioCharacters(
  charactersPath: string,
): Promise<ScenarioCharacterResult> {
  const context = characterContext();
  if (context.tag === "invalid") return context;
  try {
    const imported: unknown = await import(
      `${pathToFileURL(charactersPath).href}?characters=${String(Date.now())}`
    );
    if (
      !isRecord(imported) ||
      typeof imported.composeScenarioCharacters !== "function"
    ) {
      return {
        tag: "invalid",
        message: "Scenario characters must export composeScenarioCharacters.",
      };
    }
    return validateOutcome(
      await Reflect.apply(imported.composeScenarioCharacters, undefined, [
        context.context,
      ]),
      context.context,
    );
  } catch (error) {
    return {
      tag: "invalid",
      message: `Scenario character evaluation failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
