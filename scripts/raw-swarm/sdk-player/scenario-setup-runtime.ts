import { createHash } from "node:crypto";
import {
  battleAmmunitionStock,
  battleId,
  battleObjectId,
  battleInitializationIssueMessage,
  combatantId,
  initiativeScore,
  startBattle,
} from "../../../packages/battle-runtime/src/index.ts";
import {
  characterBattleRuntimeIssueMessage,
  characterSheetBattleInit,
} from "../../../packages/character-battle-runtime/src/index.ts";
import type { FreshCharacterSheet } from "../../../packages/character-sheet-runtime/src/index.ts";
import { armorClass } from "../../../packages/shared-algebras/src/armor-class-algebra.ts";
import { Hp, movementFeet } from "../../../packages/shared/src/types.ts";
import { srdStatBlockCatalog } from "../../../packages/surface/src/surface/stat-block-catalog.ts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "../../../packages/surface/src/surface/unit-catalog.ts";
import { Result, Match } from "effect";

import { canonicalJson } from "../transcript.ts";
import {
  authoredSourceModuleUrl,
  authoredSourceIssuesMessage,
  readAuthoredSource,
  type AdmittedAuthoredSource,
} from "./authored-source-admission.ts";
import type { JsonValue } from "./continuation-contract.ts";
import type { ScenarioSetupContext } from "./scenario-setup-contract.ts";
import { isJsonValue, jsonValue } from "./json-value.ts";
import {
  createScenarioSession,
  scenarioSessionWithTableD20TestCircumstance,
  scenarioDistanceFeet,
  isScenarioSession,
  scenarioTableSpatialFingerprint,
  scenarioSessionIssueMessage,
  tableAuthoredSpatialDecision,
  type ScenarioSession,
} from "./scenario-session.ts";

type ScenarioSessionResult =
  | {
      readonly tag: "ready";
      readonly session: ScenarioSession;
      readonly observation: JsonValue;
    }
  | {
      readonly tag: "obstructed";
      readonly obstruction: string;
      readonly observation: JsonValue;
    }
  | { readonly tag: "invalid"; readonly message: string };

const scenarioSetupEvaluationCache = new Map<
  string,
  Promise<ScenarioSessionResult>
>();

function scenarioSetupEvaluationIdentity(
  setupSource: AdmittedAuthoredSource<"scenarioSetup">,
  characterSheets: readonly FreshCharacterSheet[],
): string {
  const sourceSha256 = createHash("sha256")
    .update(setupSource.source)
    .digest("hex");
  const characterSheetsSha256 = createHash("sha256")
    .update(canonicalJson(jsonValue(characterSheets)))
    .digest("hex");
  return `${setupSource.sourcePath}\u0000${sourceSha256}\u0000${characterSheetsSha256}`;
}

function setupContext(
  characterSheets: readonly FreshCharacterSheet[],
):
  | { readonly tag: "ready"; readonly context: ScenarioSetupContext }
  | { readonly tag: "invalid"; readonly message: string } {
  const units = buildUnitCatalog({ collections: [srdUnitCollection] });
  return Match.value(units).pipe(
    Match.when({ tag: "invalid" }, () => ({
      tag: "invalid" as const,
      message: "SRD Unit catalog is invalid.",
    })),
    Match.when({ tag: "ok" }, ({ catalog: unitCatalog }) => ({
      tag: "ready" as const,
      context: {
        characterSheets,
        statBlockCatalog: srdStatBlockCatalog,
        statBlocks: srdStatBlockCatalog.listStatBlocks(),
        unitCatalog,
        sdk: {
          battleAmmunitionStock,
          battleId,
          battleObjectId,
          battleInitializationIssueMessage,
          characterBattleRuntimeIssueMessage,
          characterSheetBattleInit,
          combatantId,
          initiativeScore,
          startBattle,
          armorClass,
          hp: Hp,
          movementFeet,
          createScenarioSession,
          scenarioSessionWithTableD20TestCircumstance,
          scenarioDistanceFeet,
          scenarioTableSpatialFingerprint,
          scenarioSessionIssueMessage,
          tableAuthoredSpatialDecision,
          isFailure: Result.isFailure,
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
      isScenarioSession(outcome.session)
        ? {
            tag: "ready" as const,
            session: outcome.session,
            observation,
          }
        : {
            tag: "invalid" as const,
            message: "Scenario setup returned an invalid scenario session.",
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

async function evaluateScenarioSetupUncached(
  setupSource: AdmittedAuthoredSource<"scenarioSetup">,
  characterSheets: readonly FreshCharacterSheet[],
): Promise<ScenarioSessionResult> {
  const context = setupContext(characterSheets);
  if (context.tag === "invalid") return context;
  try {
    const imported: unknown = await import(
      authoredSourceModuleUrl(setupSource)
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

export function evaluateAdmittedScenarioSetup(
  setupSource: AdmittedAuthoredSource<"scenarioSetup">,
  characterSheets: readonly FreshCharacterSheet[],
): Promise<ScenarioSessionResult> {
  try {
    const identity = scenarioSetupEvaluationIdentity(
      setupSource,
      characterSheets,
    );
    const cached = scenarioSetupEvaluationCache.get(identity);
    if (cached !== undefined) return cached;
    // A supervisor evaluates one frozen setup dependency graph. The direct
    // source and canonical Character Sheets are its complete mutable inputs.
    const evaluation = evaluateScenarioSetupUncached(
      setupSource,
      characterSheets,
    );
    scenarioSetupEvaluationCache.set(identity, evaluation);
    return evaluation;
  } catch (error) {
    return Promise.resolve({
      tag: "invalid",
      message: `Scenario setup evaluation failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
}

export function evaluateScenarioSetup(
  setupPath: string,
  characterSheets: readonly FreshCharacterSheet[],
): Promise<ScenarioSessionResult> {
  const setupSource = readAuthoredSource({
    role: "scenarioSetup",
    sourcePath: setupPath,
  });
  return setupSource.tag === "rejected"
    ? Promise.resolve({
        tag: "invalid",
        message: authoredSourceIssuesMessage(setupSource.issues),
      })
    : evaluateAdmittedScenarioSetup(setupSource, characterSheets);
}
