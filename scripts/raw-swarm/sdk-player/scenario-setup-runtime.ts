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
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "../../../packages/surface/src/surface/stat-block-catalog.ts";
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

function setupContext():
  | { readonly tag: "ready"; readonly context: ScenarioSetupContext }
  | { readonly tag: "invalid"; readonly message: string } {
  const catalog = buildStatBlockCatalog({
    collections: [srdStatBlockCollection],
  });
  return Match.value(catalog).pipe(
    Match.when({ tag: "invalid" }, () => ({
      tag: "invalid" as const,
      message: "SRD Stat Block catalog is invalid.",
    })),
    Match.when({ tag: "ok" }, ({ catalog: validCatalog }) => ({
      tag: "ready" as const,
      context: {
        statBlocks: validCatalog.listStatBlocks(),
        sdk: {
          battleCreatureInitFromStatBlock,
          battleId,
          battleStateInitIssueMessage,
          combatantId,
          initiativeScore,
          startBattle,
          isLeft: Either.isLeft,
        },
      },
    })),
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
  const context = setupContext();
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
  if (outcome.kind === "ready") {
    return isBattleRuntimeSession(outcome.session)
      ? {
          tag: "ready",
          session: outcome.session,
          observation: outcome.observation,
        }
      : {
          tag: "invalid",
          message: "Scenario setup returned an invalid battle session.",
        };
  }
  if (outcome.kind === "obstructed") {
    return typeof outcome.obstruction === "string" &&
      outcome.obstruction.trim().length > 0
      ? {
          tag: "obstructed",
          obstruction: outcome.obstruction,
          observation: outcome.observation,
        }
      : {
          tag: "invalid",
          message: "Scenario setup obstruction is empty.",
        };
  }
  return {
    tag: "invalid",
    message: "Scenario setup returned an unknown outcome.",
  };
}

export async function evaluateScenarioSetup(
  setupPath: string,
): Promise<ScenarioSessionResult> {
  const context = setupContext();
  if (context.tag === "invalid") return context;
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
}
