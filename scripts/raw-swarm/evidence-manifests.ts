import { Schema } from "effect";

import {
  EvidenceSetIdSchema,
  ExecutionIdSchema,
  ScenarioCampaignIdSchema,
  PlannedScenarioIdSchema,
  ScenarioIdSchema,
} from "./raw-swarm-identities.ts";
import { GitShaSchema, StartedAtSchema } from "./transcript.ts";

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));

export const ScenarioCampaignManifestSchema = Schema.Struct({
  type: Schema.Literal("raw-swarm-scenario-campaign"),
  schemaVersion: Schema.Literal(1),
  campaignId: ScenarioCampaignIdSchema,
  plannedScenarioId: PlannedScenarioIdSchema,
  evidenceSetId: EvidenceSetIdSchema,
  gitSha: GitShaSchema,
  startedAt: StartedAtSchema,
  configSha256: HashSchema,
});

export type ScenarioCampaignManifest = Schema.Schema.Type<
  typeof ScenarioCampaignManifestSchema
>;

export const ExecutionStartRecordSchema = Schema.Struct({
  type: Schema.Literal("raw-swarm-execution-start"),
  schemaVersion: Schema.Literal(1),
  executionId: ExecutionIdSchema,
  evidenceSetId: EvidenceSetIdSchema,
  scenarioId: ScenarioIdSchema,
  gitSha: GitShaSchema,
  startedAt: StartedAtSchema,
});

export const FindingsManifestSchema = Schema.Union(
  ScenarioCampaignManifestSchema,
  ExecutionStartRecordSchema,
);

export type FindingsManifest = Schema.Schema.Type<
  typeof FindingsManifestSchema
>;
