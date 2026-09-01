import type {
  battleAmmunitionStock,
  battleId,
  battleObjectId,
  combatantId,
  initiativeScore,
  AuthoredStatBlockBattleInitInput,
  BattleCreatureInit,
  BattleInitializationIssueMessage,
  StartBattle,
} from "@dnd/battle-runtime/consumer-protocol";
import type { CharacterSheetBattleInit } from "../../../packages/character-battle-runtime/src/battle-creature-init.ts";
import type { CharacterBattleRuntimeIssueMessage } from "../../../packages/character-battle-runtime/src/battle-character-build-projection.ts";
import type { UnitCatalog } from "@dnd/character-creation-runtime/consumer-protocol";
import type { FreshCharacterSheet } from "@dnd/character-sheet-runtime/consumer-protocol";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog-contract";
import type { StatBlockRecord } from "@dnd/surface/surface/stat-block-types";
import type { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import type { Hp, movementFeet } from "@dnd/shared/types";

import type { JsonValue } from "./continuation-contract.ts";
import type { ResultFailureRefinement } from "./result-failure-refinement.ts";
import type {
  createScenarioSession,
  scenarioDistanceFeet,
  scenarioTableSpatialFingerprint,
  scenarioSessionIssueMessage,
  scenarioSessionWithTableD20TestCircumstance,
  tableAuthoredSpatialDecision,
  ScenarioSession,
} from "./scenario-session.ts";

export type {
  ScenarioBattleObject,
  ScenarioBattlefield,
  ScenarioBarrierHeight,
  ScenarioEnvironment,
  ScenarioInitialRangedAttackEnemyRelationship,
  ScenarioMovementAllyRelationship,
  ScenarioOpportunityAttackEnemyRelationship,
  ScenarioPlacement,
  ScenarioDirection,
  ScenarioSpatialBoundary,
  ScenarioSpatialDecision,
  ScenarioSpatialDecisionId,
  ScenarioSpatialDecisionInput,
  ScenarioSpatialDecisionIssue,
  ScenarioSpatialDistanceFeetIssue,
  ScenarioNonMovementSpatialDecisionInput,
  ScenarioSpatialDecisionQuestion,
  ScenarioSpatialRelationAnswer,
  ScenarioSpatialSetupInput,
  ScenarioSpatialWitness,
  ScenarioSpatialWitnessSource,
  ScenarioTableSpatialDecision,
  ScenarioTableSpatialFingerprint,
  ScenarioTableSpatialPostMoveState,
  ScenarioTableSpatialPostMoveStateInput,
  ScenarioSession,
  ScenarioTokenId,
  ScenarioSessionFactIssue,
  ScenarioSessionIssue,
  ScenarioSessionUpdateIssue,
} from "./scenario-session.ts";
export type { BattleCreatureInit };

/**
 * Scenario setup consumes authored catalog records at the public SDK boundary.
 */
export type ScenarioAuthoredStatBlockBattleInitInput =
  AuthoredStatBlockBattleInitInput;

export type ScenarioSetupSdk = {
  readonly battleAmmunitionStock: typeof battleAmmunitionStock;
  readonly battleId: typeof battleId;
  readonly battleObjectId: typeof battleObjectId;
  readonly battleInitializationIssueMessage: BattleInitializationIssueMessage;
  readonly characterBattleRuntimeIssueMessage: CharacterBattleRuntimeIssueMessage;
  readonly characterSheetBattleInit: CharacterSheetBattleInit;
  readonly combatantId: typeof combatantId;
  readonly initiativeScore: typeof initiativeScore;
  readonly startBattle: StartBattle;
  readonly armorClass: typeof armorClass;
  readonly hp: typeof Hp;
  readonly movementFeet: typeof movementFeet;
  readonly createScenarioSession: typeof createScenarioSession;
  readonly scenarioDistanceFeet: typeof scenarioDistanceFeet;
  readonly scenarioTableSpatialFingerprint: typeof scenarioTableSpatialFingerprint;
  readonly scenarioSessionIssueMessage: typeof scenarioSessionIssueMessage;
  readonly tableAuthoredSpatialDecision: typeof tableAuthoredSpatialDecision;
  readonly scenarioSessionWithTableD20TestCircumstance: typeof scenarioSessionWithTableD20TestCircumstance;
  readonly isFailure: ResultFailureRefinement;
};

export type ScenarioSetupContext = {
  readonly sdk: ScenarioSetupSdk;
  readonly characterSheets: readonly FreshCharacterSheet[];
  readonly statBlockCatalog: StatBlockCatalog;
  readonly statBlocks: readonly StatBlockRecord[];
  readonly unitCatalog: UnitCatalog;
};

export type ScenarioSetupOutcome =
  | {
      readonly kind: "ready";
      readonly session: ScenarioSession;
      readonly observation: JsonValue;
    }
  | {
      readonly kind: "obstructed";
      readonly obstruction: string;
      readonly observation: JsonValue;
    };

export type ScenarioSetup = (
  context: ScenarioSetupContext,
) => ScenarioSetupOutcome | Promise<ScenarioSetupOutcome>;
