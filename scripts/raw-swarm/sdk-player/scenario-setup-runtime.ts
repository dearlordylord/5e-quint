import { pathToFileURL } from "node:url";
import {
  battleCreatureInitFromStatBlock,
  battleId,
  battleStateInitIssueMessage,
  combatantId,
  initiativeScore,
  isBattleRuntimeSession,
  startBattle,
  type BattleRuntimeSession,
} from "../../../packages/battle-runtime/src/index.ts";
import {
  characterBattleRuntimeIssueMessage,
  characterSheetBattleInit,
} from "../../../packages/character-battle-runtime/src/index.ts";
import type { FreshCharacterSheet } from "../../../packages/character-sheet-runtime/src/index.ts";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "../../../packages/surface/src/surface/stat-block-catalog.ts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "../../../packages/surface/src/surface/unit-catalog.ts";
import { Either, Match } from "effect";

import type { JsonValue } from "./continuation-contract.ts";
import type { ScenarioSetupContext } from "./scenario-setup-contract.ts";
import { isJsonValue } from "./json-value.ts";

type ScenarioSessionResult =
  | {
      readonly tag: "ready";
      readonly session: BattleRuntimeSession;
      readonly observation: JsonValue;
    }
  | {
      readonly tag: "obstructed";
      readonly obstruction: string;
      readonly observation: JsonValue;
    }
  | { readonly tag: "invalid"; readonly message: string };

function setupContext(
  characterSheets: readonly FreshCharacterSheet[],
):
  | { readonly tag: "ready"; readonly context: ScenarioSetupContext }
  | { readonly tag: "invalid"; readonly message: string } {
  const statBlocks = buildStatBlockCatalog({
    collections: [srdStatBlockCollection],
  });
  const units = buildUnitCatalog({ collections: [srdUnitCollection] });
  return Match.value(units).pipe(
    Match.when({ tag: "invalid" }, () => ({
      tag: "invalid" as const,
      message: "SRD Unit catalog is invalid.",
    })),
    Match.when({ tag: "ok" }, ({ catalog: unitCatalog }) =>
      Match.value(statBlocks).pipe(
        Match.when({ tag: "invalid" }, () => ({
          tag: "invalid" as const,
          message: "SRD Stat Block catalog is invalid.",
        })),
        Match.when({ tag: "ok" }, ({ catalog: validCatalog }) => ({
          tag: "ready" as const,
          context: {
            characterSheets,
            statBlockCatalog: validCatalog,
            statBlocks: validCatalog.listStatBlocks(),
            unitCatalog,
            sdk: {
              battleCreatureInitFromStatBlock,
              battleId,
              battleStateInitIssueMessage,
              characterBattleRuntimeIssueMessage,
              characterSheetBattleInit,
              combatantId,
              initiativeScore,
              startBattle,
              isLeft: Either.isLeft,
            },
          },
        })),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

export function scenarioSetupStatBlocks():
  | {
      readonly tag: "ready";
      readonly statBlocks: readonly {
        readonly id: string;
        readonly name: string;
      }[];
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const context = setupContext([]);
  return Match.value(context).pipe(
    Match.when({ tag: "invalid" }, (invalid) => invalid),
    Match.when({ tag: "ready" }, ({ context: readyContext }) => ({
      tag: "ready" as const,
      statBlocks: readyContext.statBlocks.map(({ id, name }) => ({ id, name })),
    })),
    Match.exhaustive,
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function validateOutcome(outcome: unknown): ScenarioSessionResult {
  if (!isRecord(outcome) || !isJsonValue(outcome.observation)) {
    return {
      tag: "invalid",
      message: "Scenario setup observation must be JSON data.",
    };
  }
  const observation = outcome.observation;
  return Match.value(outcome.kind).pipe(
    Match.when("ready", () =>
      isBattleRuntimeSession(outcome.session)
        ? {
            tag: "ready" as const,
            session: outcome.session,
            observation,
          }
        : {
            tag: "invalid" as const,
            message: "Scenario setup returned an invalid battle session.",
          },
    ),
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
            message: "Scenario setup obstruction is empty.",
          },
    ),
    Match.orElse(() => ({
      tag: "invalid" as const,
      message: "Scenario setup returned an unknown outcome.",
    })),
  );
}

export async function evaluateScenarioSetup(
  setupPath: string,
  characterSheets: readonly FreshCharacterSheet[],
): Promise<ScenarioSessionResult> {
  const context = setupContext(characterSheets);
  if (context.tag === "invalid") return context;
  try {
    const imported: unknown = await import(
      `${pathToFileURL(setupPath).href}?setup=${String(Date.now())}`
    );
    if (!isRecord(imported) || typeof imported.setupScenario !== "function") {
      return {
        tag: "invalid",
        message: "Scenario setup must export setupScenario.",
      };
    }
    return validateOutcome(
      await Reflect.apply(imported.setupScenario, undefined, [context.context]),
    );
  } catch (error) {
    return {
      tag: "invalid",
      message: `Scenario setup evaluation failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
