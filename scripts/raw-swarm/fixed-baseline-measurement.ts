import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";

import { BattleFillSchema } from "../../packages/battle-runtime/src/battle-reducer/battle-codecs.ts";
import { statBlockRechargeRollFillMatchesHole } from "../../packages/battle-runtime/src/battle-reducer/turn-boundary-lifecycle.ts";
import type { BattleFill } from "../../packages/battle-runtime/src/battle-state-execution.ts";

import { canonicalJson, isJsonRecord, repoRoot } from "./transcript.ts";
import { effectRuntimeForPackageOwners } from "../package-effect-runtime.ts";
import type { JsonValue } from "./sdk-player/continuation-contract.ts";
import {
  projectPlayerActsFromEvidence,
  projectPlayerSubject,
  reprojectSdkTranscriptTurns,
  type PlayerActProjection,
  type PlayerHoleEvidenceSource,
  type PlayerHoleProjection,
  type PlayerCurrentTurnProjection,
} from "./sdk-player/player-turn-projection.ts";
import { readSdkAudit } from "./sdk-player/sdk-audit.ts";
import {
  parseSdkTranscript,
  type SdkCallRecord,
} from "./sdk-player/sdk-transcript.ts";

const { Result, Schema } = effectRuntimeForPackageOwners([
  "battle-runtime",
]).effect;

const FIXED_TRANSCRIPT_BYTES = 38_232_957;
const FIXED_TRANSCRIPT_SHA256 =
  "69f30fb4f34155aa95845c141f303e65c78743a4814a5623700950cc2d1a9bad";
const FIXED_OBSERVATION_BYTES = 3_137_666;
const FIXED_OBSERVATION_SHA256 =
  "26b7995f4bc93668071bb2a3588866b42f4f50a3816f1c8a3970cf7991cea6fb";
const FIXED_STEP_PAYLOAD_BYTES = 38_107_978;
const FIXED_TRANSCRIPT_PATH =
  "scripts/raw-swarm/out/orc-fighter-rogue-close-interception-sdk-player/evidence/sdk-calls.jsonl";
const FIXED_PROGRAM_BYTES = 80_592;
const FIXED_PROGRAM_SHA256 =
  "3934484bbb613d0ab56facb3dbd2dd726ec8667f8f4ae314c5b589862bc8e822";
const FIXED_FROZEN_PREFIX_BYTES = 553;
const FIXED_FROZEN_PREFIX_SHA256 =
  "0ed2cb3266f074509b1424a5e3f7f6da0ae0fa5b62e2f11797715a0a2e0a97d7";
const FIXED_FINAL_RESULT_BYTES = 1_504;
const FIXED_FINAL_RESULT_SHA256 =
  "e9a33376ca5207006a81d758329ae70613eff945f67a5054121b5e288ba56548";
const FIXED_CONCLUSION =
  "Wolf A, Wolf B, and Goblin Warrior A are each terminally dead at 0 Hit Points, while the synthetic glass calibration prism remains undamaged at 16 Hit Points. The Fighter remains alive at 6 Hit Points and the Rogue remains alive at 1 Hit Point. These concrete combatant and object facts satisfy the Table's stated play-conclusion condition.";

function fail(message: string): never {
  throw new Error(message);
}

type RetainedProgramSessionAudit = {
  readonly subjectResolutionPhaseReferences: number;
  readonly discardedFullObservationCopies: number;
  readonly unsupportedSessionReferences: readonly string[];
};

type FixedBaselineRetainedProgram = {
  readonly sha256: string;
  readonly bytes: number;
  readonly frozenPrefixSha256: string;
  readonly finalResultSha256: string;
  readonly subjectResolutionPhaseReferences: number;
  readonly discardedFullObservationCopies: 2;
  readonly unsupportedSessionReferences: readonly [];
  readonly entityResourceFacts: {
    readonly total: 10;
    readonly projectedChanges: 9;
    readonly retainedInitialFacts: 1;
  };
};

type FixedBaselineExecutionEvidencePaths = {
  readonly transcriptPath: string;
  readonly observationsPath: string;
  readonly programPath: string;
  readonly frozenPrefixPath: string;
  readonly finalResultPath: string;
};

export function fixedBaselineExecutionEvidencePaths(
  transcriptInput: string,
): FixedBaselineExecutionEvidencePaths {
  const transcriptPath = resolve(repoRoot, transcriptInput);
  if (relative(repoRoot, transcriptPath) !== FIXED_TRANSCRIPT_PATH) {
    fail("Fixed baseline measurement requires the retained run-4 transcript.");
  }
  const evidenceDirectory = dirname(transcriptPath);
  return {
    transcriptPath,
    observationsPath: resolve(evidenceDirectory, "observations.jsonl"),
    programPath: resolve(evidenceDirectory, "program.ts"),
    frozenPrefixPath: resolve(evidenceDirectory, "frozen-prefix.json"),
    finalResultPath: resolve(evidenceDirectory, "final.json"),
  };
}

function exactArtifact(
  path: string,
  expectedBytes: number,
  expectedSha256: string,
  role: string,
): Buffer {
  const bytes = readFileSync(path);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength !== expectedBytes || sha256 !== expectedSha256) {
    fail(`Fixed baseline ${role} identity changed.`);
  }
  return bytes;
}

function validateFixedProgramArtifacts(
  paths: FixedBaselineExecutionEvidencePaths,
): {
  readonly program: string;
  readonly frozenPrefixSha256: string;
  readonly finalResultSha256: string;
} {
  const programBytes = exactArtifact(
    paths.programPath,
    FIXED_PROGRAM_BYTES,
    FIXED_PROGRAM_SHA256,
    "program",
  );
  const frozenPrefixBytes = exactArtifact(
    paths.frozenPrefixPath,
    FIXED_FROZEN_PREFIX_BYTES,
    FIXED_FROZEN_PREFIX_SHA256,
    "frozen continuation",
  );
  const finalResultBytes = exactArtifact(
    paths.finalResultPath,
    FIXED_FINAL_RESULT_BYTES,
    FIXED_FINAL_RESULT_SHA256,
    "final result",
  );
  const frozenPrefix: unknown = JSON.parse(frozenPrefixBytes.toString("utf8"));
  const finalResult: unknown = JSON.parse(finalResultBytes.toString("utf8"));
  if (
    !isJsonRecord(frozenPrefix) ||
    frozenPrefix.frozenByteLength !== FIXED_PROGRAM_BYTES ||
    frozenPrefix.frozenSha256 !== FIXED_PROGRAM_SHA256 ||
    frozenPrefix.continuationCount !== 88 ||
    !isJsonRecord(frozenPrefix.run) ||
    frozenPrefix.run.kind !== "playerConcluded" ||
    frozenPrefix.run.conclusion !== FIXED_CONCLUSION ||
    !isJsonRecord(finalResult) ||
    finalResult.continuation !== 88 ||
    finalResult.kind !== "playerConcluded" ||
    finalResult.conclusion !== FIXED_CONCLUSION
  ) {
    fail("Fixed baseline retained program artifacts disagree.");
  }
  return {
    program: programBytes.toString("utf8"),
    frozenPrefixSha256: FIXED_FROZEN_PREFIX_SHA256,
    finalResultSha256: FIXED_FINAL_RESULT_SHA256,
  };
}

function finalCombatantProjection(
  projections: readonly PlayerCurrentTurnProjection[],
  combatantId: string,
) {
  return projections
    .flatMap(({ changes }) =>
      changes.flatMap((change) =>
        change.kind === "combatant" &&
        change.id === combatantId &&
        change.change !== "removed"
          ? [change.after]
          : [],
      ),
    )
    .at(-1);
}

function resourceIdentity(
  ref: string,
): { readonly combatantId: string; readonly ordinal: number } | undefined {
  try {
    const resource: unknown = JSON.parse(ref);
    if (
      !isJsonRecord(resource) ||
      typeof resource.scopeRef !== "string" ||
      typeof resource.ordinal !== "number"
    )
      return undefined;
    const scope: unknown = JSON.parse(resource.scopeRef);
    return isJsonRecord(scope) && typeof scope.combatantId === "string"
      ? { combatantId: scope.combatantId, ordinal: resource.ordinal }
      : undefined;
  } catch {
    return undefined;
  }
}

function retainedInitialPrismHitPoints(session: JsonValue): number | undefined {
  if (!isJsonRecord(session)) return undefined;
  const battlefield = session.battlefield;
  if (!isJsonRecord(battlefield) || !Array.isArray(battlefield.objects))
    return undefined;
  const prism = battlefield.objects.find(
    (candidate) =>
      isJsonRecord(candidate) && candidate.objectId === "calibration-prism",
  );
  if (!isJsonRecord(prism) || !isJsonRecord(prism.damageDisposition))
    return undefined;
  return typeof prism.damageDisposition.hitPoints === "number"
    ? prism.damageDisposition.hitPoints
    : undefined;
}

export function fixedBaselineEntityResourceFactAudit(input: {
  readonly initialSession: JsonValue;
  readonly projections: readonly PlayerCurrentTurnProjection[];
}): FixedBaselineRetainedProgram["entityResourceFacts"] {
  const expectedHitPoints = [
    ["wolf-a", 0, true],
    ["wolf-b", 0, true],
    ["goblin-warrior-a", 0, true],
    ["close-interception-fighter", 6, false],
    ["close-interception-rogue", 1, false],
  ] as const;
  for (const [combatantId, hitPoints, terminal] of expectedHitPoints) {
    const combatant = finalCombatantProjection(input.projections, combatantId);
    const projectedTerminal =
      combatant?.zeroHitPointLifecycle.policy === "diesAtZeroHp"
        ? combatant.hitPoints.current === 0
        : combatant?.zeroHitPointLifecycle.dead;
    if (
      combatant?.hitPoints.current !== hitPoints ||
      projectedTerminal !== terminal
    ) {
      fail(
        `Fixed baseline projection omits the final ${combatantId} life-state fact.`,
      );
    }
  }
  const expectedResources = [
    ["close-interception-fighter", 0],
    ["close-interception-fighter", 3],
    ["close-interception-rogue", 0],
    ["close-interception-rogue", 2],
  ] as const;
  for (const [combatantId, ordinal] of expectedResources) {
    const combatant = finalCombatantProjection(input.projections, combatantId);
    const resource = combatant?.resources.find(({ ref }) => {
      const identity = resourceIdentity(ref);
      return (
        identity?.combatantId === combatantId && identity.ordinal === ordinal
      );
    });
    if (
      resource === undefined ||
      !("usage" in resource) ||
      resource.usage !== "limited" ||
      resource.usesRemaining !== 0
    ) {
      fail(
        `Fixed baseline projection omits the expended ${combatantId} resource ${ordinal}.`,
      );
    }
  }
  if (retainedInitialPrismHitPoints(input.initialSession) !== 16) {
    fail("Fixed baseline initial evidence omits the calibration prism state.");
  }
  return { total: 10, projectedChanges: 9, retainedInitialFacts: 1 };
}

export function retainedProgramSessionAudit(
  program: string,
): RetainedProgramSessionAudit {
  const source = ts.createSourceFile(
    "retained-program.ts",
    program,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let phaseReferences = 0;
  let discardedCopies = 0;
  const unsupported: string[] = [];
  const propertyName = (node: ts.PropertyAssignment): string | undefined =>
    ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)
      ? node.name.text
      : undefined;
  const insideObservation = (node: ts.Node): boolean => {
    let cursor: ts.Node | undefined = node.parent;
    while (cursor !== undefined) {
      if (
        ts.isPropertyAssignment(cursor) &&
        propertyName(cursor) === "observation"
      )
        return true;
      cursor = cursor.parent;
    }
    return false;
  };
  const isContextSession = (node: ts.Node): boolean =>
    ts.isPropertyAccessExpression(node) &&
    node.name.text === "session" &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "context";
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node) &&
      !(
        ts.isPropertyAccessExpression(node.parent) &&
        node.parent.expression === node
      )
    ) {
      const text = node.getText(source);
      const containsContextSession = (() => {
        let cursor: ts.Expression = node;
        while (ts.isPropertyAccessExpression(cursor)) {
          if (isContextSession(cursor)) return true;
          cursor = cursor.expression;
        }
        return false;
      })();
      if (containsContextSession) {
        if (text === "context.session") {
          // The continuation protocol supplies the canonical session to SDK calls;
          // this is transport, not a model-visible tactical fact.
        } else if (
          text === "context.session.battle.state.subjectResolutionPhase"
        )
          phaseReferences += 1;
        else if (
          insideObservation(node) &&
          (text === "context.session.battle" ||
            text === "context.session.battlefield")
        )
          discardedCopies += 1;
        else unsupported.push(text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return {
    subjectResolutionPhaseReferences: phaseReferences,
    discardedFullObservationCopies: discardedCopies,
    unsupportedSessionReferences: [...new Set(unsupported)].sort(),
  };
}

function callsByContinuation(
  calls: readonly SdkCallRecord[],
): ReadonlyMap<number, readonly SdkCallRecord[]> {
  return calls.reduce((groups, call) => {
    groups.set(call.continuation, [
      ...(groups.get(call.continuation) ?? []),
      call,
    ]);
    return groups;
  }, new Map<number, readonly SdkCallRecord[]>());
}

type ProjectedHoleKey = `${string}\u0000${string}`;

function holeKey(
  hole: Pick<PlayerHoleProjection, "kind" | "holeId">,
): ProjectedHoleKey {
  return `${hole.kind}\u0000${hole.holeId}`;
}

function occurrenceCounts(
  values: readonly ProjectedHoleKey[],
): ReadonlyMap<ProjectedHoleKey, number> {
  return values.reduce((counts, value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map<ProjectedHoleKey, number>());
}

function fillKeys(
  input: Pick<BattleFill, "kind" | "holeId">,
): ProjectedHoleKey {
  return `${input.kind}\u0000${input.holeId}`;
}

function projectedChoiceKeys(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (!isJsonRecord(value)) return [];
  const keys: string[] = [];
  if (typeof value.kind === "string") keys.push(`kind:${value.kind}`);
  if (typeof value.targetId === "string") keys.push(value.targetId);
  if (Array.isArray(value.targetIds)) {
    for (const targetId of value.targetIds)
      if (typeof targetId === "string") keys.push(targetId);
  }
  if (Array.isArray(value.allocations)) {
    for (const allocation of value.allocations) {
      if (isJsonRecord(allocation) && typeof allocation.targetId === "string")
        keys.push(allocation.targetId);
    }
  }
  return keys;
}

function validateFillChoices(
  fills: readonly BattleFill[],
  holes: readonly PlayerHoleProjection[],
  continuation: number,
): void {
  for (const fill of fills) {
    const matchingHole = holes.find((hole) => holeKey(hole) === fillKeys(fill));
    if (
      matchingHole === undefined ||
      !("choices" in matchingHole) ||
      matchingHole.choices.length === 0
    )
      continue;
    const allowedChoices = matchingHole.choices.flatMap(projectedChoiceKeys);
    const suppliedChoices =
      "value" in fill ? projectedChoiceKeys(fill.value) : [];
    if (
      suppliedChoices.length === 0 ||
      suppliedChoices.some((choice) => !allowedChoices.includes(choice))
    ) {
      fail(
        `Continuation ${continuation} supplied a value outside the projected choices for ${matchingHole.kind}/${matchingHole.holeId}.`,
      );
    }
  }
}

function validateRequiredHoleFills(
  fills: readonly Readonly<Record<string, unknown>>[],
  holes: readonly PlayerHoleProjection[],
  continuation: number,
  holeEvidenceSource: PlayerHoleEvidenceSource,
): void {
  const decodedFills: BattleFill[] = [];
  for (const fill of fills) {
    const decoded = Schema.decodeUnknownResult(BattleFillSchema, {
      onExcessProperty:
        holeEvidenceSource.kind === "recordedCurrentRuntime"
          ? "error"
          : "ignore",
    })(fill);
    if (Result.isFailure(decoded)) {
      fail(`Continuation ${continuation} supplied a malformed hole fill.`);
    }
    decodedFills.push(decoded.success);
  }
  const projectedKeys = holes.map(holeKey);
  const suppliedKeys = decodedFills.map(fillKeys);
  const projectedOccurrences = occurrenceCounts(projectedKeys);
  const suppliedOccurrences = occurrenceCounts(suppliedKeys);
  if (
    new Set(holes.map(({ holeInstanceKey }) => holeInstanceKey)).size !==
    holes.length
  ) {
    fail(
      `Continuation ${continuation} contains duplicate projected hole occurrences.`,
    );
  }
  if (
    [...projectedOccurrences].some(
      ([key, count]) => (suppliedOccurrences.get(key) ?? 0) < count,
    )
  ) {
    fail(
      `Continuation ${continuation} omitted a required hole family used by the next continuation.`,
    );
  }
  for (const hole of holes) {
    if (hole.kind !== "statBlockRechargeRoll") continue;
    const matchingFills = decodedFills.filter(
      (fill) =>
        fill.kind === "statBlockRechargeRoll" && fill.holeId === hole.holeId,
    );
    if (
      matchingFills.length !== 1 ||
      matchingFills[0]?.kind !== "statBlockRechargeRoll" ||
      !statBlockRechargeRollFillMatchesHole(matchingFills[0].value, hole)
    ) {
      fail(
        `Continuation ${continuation} supplied recharge rolls outside the projected targets.`,
      );
    }
  }
  validateFillChoices(decodedFills, holes, continuation);
}

function inputRecord(
  call: SdkCallRecord,
): Readonly<Record<string, unknown>> | undefined {
  return isJsonRecord(call.input) ? call.input : undefined;
}

function subjectCalls(calls: readonly SdkCallRecord[]): readonly {
  readonly call: SdkCallRecord;
  readonly input: Readonly<Record<string, unknown>>;
}[] {
  return calls.flatMap((call) => {
    const input = inputRecord(call);
    return input?.subject === undefined ? [] : [{ call, input }];
  });
}

function discoveryActs(
  calls: readonly SdkCallRecord[],
  holeEvidenceSource: PlayerHoleEvidenceSource,
): readonly PlayerActProjection[] | undefined {
  const discoveries = calls.flatMap(
    (
      call,
    ): readonly Extract<SdkCallRecord, { readonly outcome: "returned" }>[] =>
      call.operation === "discoverBattleActs" && call.outcome === "returned"
        ? [call]
        : [],
  );
  if (discoveries.length === 0) return undefined;
  const last = discoveries[discoveries.length - 1];
  if (last === undefined) return undefined;
  const projected = projectPlayerActsFromEvidence(
    last.result,
    holeEvidenceSource,
  );
  if (projected === undefined)
    fail(`Continuation ${last.continuation} has malformed discovered acts.`);
  return projected;
}

function matchingAct(
  acts: readonly PlayerActProjection[],
  subject: ReturnType<typeof projectPlayerSubject>,
  continuation: number,
): PlayerActProjection {
  if (subject === undefined)
    fail(`Continuation ${continuation} has malformed subject input.`);
  const matches = acts.filter(
    ({ subject: candidate }) =>
      canonicalJson(candidate) === canonicalJson(subject),
  );
  const match = matches[0];
  if (match === undefined)
    fail(
      `Continuation ${continuation} omitted the act used by the retained program.`,
    );
  return match;
}

function validateSubjectCall(
  source: PlayerCurrentTurnProjection,
  next: {
    readonly call: SdkCallRecord;
    readonly input: Readonly<Record<string, unknown>>;
  },
  acts: readonly PlayerActProjection[] | undefined,
  holeEvidenceSource: PlayerHoleEvidenceSource,
): void {
  const projectedSubject = projectPlayerSubject(next.input.subject);
  if (projectedSubject === undefined)
    fail(`Continuation ${next.call.continuation} has malformed subject input.`);
  const act =
    source.frontier.kind === "acts"
      ? matchingAct(
          source.frontier.acts,
          projectedSubject,
          next.call.continuation,
        )
      : acts === undefined
        ? undefined
        : matchingAct(acts, projectedSubject, next.call.continuation);
  if (source.frontier.kind === "holes") {
    if (
      canonicalJson(source.frontier.subject) !== canonicalJson(projectedSubject)
    )
      fail(
        `Continuation ${source.continuation} omitted the subject used by the next continuation.`,
      );
    if (next.call.operation !== "resolveBattleRuntimeSubject") return;
    if (!Array.isArray(next.input.fills))
      fail(
        `Continuation ${next.call.continuation} has malformed subject fills.`,
      );
    const fills = next.input.fills.flatMap((fill) =>
      isJsonRecord(fill) ? [fill] : [],
    );
    if (fills.length !== next.input.fills.length)
      fail(
        `Continuation ${next.call.continuation} has malformed subject fills.`,
      );
    validateRequiredHoleFills(
      fills,
      source.frontier.holes.map(({ hole }) => hole),
      source.continuation,
      holeEvidenceSource,
    );
    return;
  }
  if (next.call.operation !== "resolveBattleRuntimeSubject") return;
  if (act === undefined) return;
  if (!Array.isArray(next.input.fills))
    fail(`Continuation ${next.call.continuation} has malformed subject fills.`);
  const fills = next.input.fills.flatMap((fill) =>
    isJsonRecord(fill) ? [fill] : [],
  );
  if (fills.length !== next.input.fills.length)
    fail(`Continuation ${next.call.continuation} has malformed subject fills.`);
  validateRequiredHoleFills(
    fills,
    act.holes.map(({ hole }) => hole),
    next.call.continuation,
    holeEvidenceSource,
  );
}

export function directFrontierUseChecks(input: {
  readonly calls: readonly SdkCallRecord[];
  readonly projections: readonly PlayerCurrentTurnProjection[];
  readonly holeEvidenceSource: PlayerHoleEvidenceSource;
}): number {
  const groups = callsByContinuation(input.calls);
  const maxContinuation = Math.max(
    ...input.projections.map(({ continuation }) => continuation),
  );
  let checked = 0;
  for (const projection of input.projections) {
    const nextCalls = groups.get(projection.continuation + 1);
    if (nextCalls === undefined) {
      if (projection.continuation !== maxContinuation)
        fail(
          `Retained continuation ${projection.continuation + 1} is absent from the fixed baseline.`,
        );
      continue;
    }
    const nextSubjects = subjectCalls(nextCalls);
    const nextActs = discoveryActs(nextCalls, input.holeEvidenceSource);
    if (projection.frontier.kind === "acts" && nextActs !== undefined) {
      if (canonicalJson(projection.frontier.acts) !== canonicalJson(nextActs))
        fail(
          `Continuation ${projection.continuation} omitted an act or hole surfaced to the next continuation.`,
        );
    }
    if (nextSubjects.length === 0) continue;
    const frontierActsForSubjects =
      projection.frontier.kind === "acts"
        ? projection.frontier.acts
        : undefined;
    for (const next of nextSubjects)
      validateSubjectCall(
        projection,
        next,
        frontierActsForSubjects,
        input.holeEvidenceSource,
      );
    checked += 1;
  }
  if (checked === 0)
    fail("Fixed baseline projection did not prove any direct frontier reuse.");
  return checked;
}

export type FixedBaselineMeasurement = {
  readonly schemaVersion: 1;
  readonly transcript: {
    readonly bytes: number;
    readonly sha256: string;
    readonly calls: number;
    readonly continuations: number;
  };
  readonly reviewerAudit: {
    readonly bytes: number;
    readonly ratioOfTranscript: number;
    readonly maximumRatio: 0.1;
  };
  readonly playerProjection: {
    readonly bytes: number;
    readonly baselineObservationBytes: number;
    readonly reductionFactor: number;
    readonly requiredReductionFactor: 5;
    readonly largestTurnBytes: number;
    readonly directlyReusedFrontiersChecked: number;
    readonly retainedProgram: FixedBaselineRetainedProgram;
  };
  readonly sqlite: {
    readonly baselineStepPayloadBytes: number;
    readonly indexedCallPayloadBytes: number;
    readonly ratioOfBaseline: number;
    readonly maximumRatio: 0.1;
  };
  readonly replayCache: {
    readonly cumulativeReplayMilliseconds: number;
    readonly prefixCount: number;
    readonly cumulativeThresholdMilliseconds: 60_000;
    readonly reachesCumulativeThreshold: boolean;
    readonly nonModelSupervisorShare: {
      readonly tag: "unavailable";
      readonly reason: string;
    };
    readonly decision: "awaiting-controlled-supervisor-share";
  };
};

function fixedBaselineRetainedProgramAudit(
  audit: RetainedProgramSessionAudit,
): Pick<
  FixedBaselineRetainedProgram,
  | "subjectResolutionPhaseReferences"
  | "discardedFullObservationCopies"
  | "unsupportedSessionReferences"
> {
  if (
    audit.subjectResolutionPhaseReferences === 0 ||
    audit.discardedFullObservationCopies !== 2 ||
    audit.unsupportedSessionReferences.length > 0
  ) {
    fail(
      "Fixed baseline program cites a session fact outside the bounded projection audit.",
    );
  }
  return {
    subjectResolutionPhaseReferences: audit.subjectResolutionPhaseReferences,
    discardedFullObservationCopies: 2,
    unsupportedSessionReferences: [],
  };
}

type FixedReplayCacheEvidence = {
  readonly schemaVersion: 1;
  readonly transcriptSha256: string;
  readonly prefixCount: 88;
  readonly cumulativeReplayMilliseconds: number;
  readonly reachesCumulativeThreshold: boolean;
};

function isFixedReplayCacheEvidence(
  value: unknown,
): value is FixedReplayCacheEvidence {
  return (
    isJsonRecord(value) &&
    value.schemaVersion === 1 &&
    value.transcriptSha256 === FIXED_TRANSCRIPT_SHA256 &&
    value.prefixCount === 88 &&
    typeof value.cumulativeReplayMilliseconds === "number" &&
    typeof value.reachesCumulativeThreshold === "boolean"
  );
}

export function measureFixedBaseline(input: {
  readonly transcriptPath: string;
  readonly auditPath: string;
  readonly indexPath: string;
  readonly replayCacheMeasurementPath: string;
}): FixedBaselineMeasurement {
  const executionEvidencePaths = fixedBaselineExecutionEvidencePaths(
    input.transcriptPath,
  );
  const transcriptPath = executionEvidencePaths.transcriptPath;
  exactArtifact(
    executionEvidencePaths.observationsPath,
    FIXED_OBSERVATION_BYTES,
    FIXED_OBSERVATION_SHA256,
    "player observations",
  );
  const auditPath = resolve(repoRoot, input.auditPath);
  const index = new DatabaseSync(resolve(repoRoot, input.indexPath), {
    readOnly: true,
  });
  const indexedCallPayloadBytes = (() => {
    try {
      const row = index
        .prepare(
          `SELECT SUM(
             length(operation) + length(outcome) +
             length(COALESCE(inputSessionSha256, '')) +
             length(COALESCE(outputSessionSha256, '')) +
             length(COALESCE(resultSha256, '')) +
             length(COALESCE(rejection, '')) +
             length(COALESCE(reviewFacts, ''))
           ) AS byteLength
           FROM calls
           JOIN runs ON runs.id = calls.runId
           WHERE runs.transcriptSha256 = ?`,
        )
        .get(FIXED_TRANSCRIPT_SHA256);
      if (
        typeof row !== "object" ||
        row === null ||
        typeof row.byteLength !== "number"
      ) {
        return fail("Fixed baseline run is absent from the artifact index.");
      }
      return row.byteLength;
    } finally {
      index.close();
    }
  })();
  const indexedPayloadRatio =
    indexedCallPayloadBytes / FIXED_STEP_PAYLOAD_BYTES;
  if (indexedPayloadRatio > 0.1) fail("Fixed baseline call index exceeds 10%.");
  const replayCacheEvidence: unknown = JSON.parse(
    readFileSync(resolve(repoRoot, input.replayCacheMeasurementPath), "utf8"),
  );
  if (!isFixedReplayCacheEvidence(replayCacheEvidence))
    fail("Fixed baseline replay-cache measurement is invalid.");
  if (
    replayCacheEvidence.cumulativeReplayMilliseconds < 0 ||
    replayCacheEvidence.reachesCumulativeThreshold !==
      replayCacheEvidence.cumulativeReplayMilliseconds >= 60_000
  )
    fail("Fixed baseline replay-cache measurement is invalid.");
  const programArtifacts = validateFixedProgramArtifacts(
    executionEvidencePaths,
  );
  const program = programArtifacts.program;
  const programAudit = retainedProgramSessionAudit(program);
  const retainedProgramAudit = fixedBaselineRetainedProgramAudit(programAudit);
  const transcriptBytes = exactArtifact(
    transcriptPath,
    FIXED_TRANSCRIPT_BYTES,
    FIXED_TRANSCRIPT_SHA256,
    "transcript",
  );
  const parsed = parseSdkTranscript(
    transcriptBytes
      .toString("utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line): unknown => JSON.parse(line)),
  );
  if (parsed.tag === "invalid") fail(parsed.message);
  if (
    parsed.value.header.characterOutcome !== "ready" ||
    parsed.value.header.setupOutcome !== "ready" ||
    parsed.value.header.gitSha !== "7dd52785b947159092ed2cdd7895e5b428000ee4"
  ) {
    fail("Fixed baseline transcript header is invalid.");
  }
  const audit = readSdkAudit(auditPath);
  if (audit.tag === "invalid") fail(audit.message);
  if (audit.audit.header.transcriptSha256 !== FIXED_TRANSCRIPT_SHA256) {
    fail("Fixed baseline transcript SHA-256 changed.");
  }
  const projected = reprojectSdkTranscriptTurns({
    calls: parsed.value.calls,
    holeEvidenceSource: { kind: "archivedWithoutProjectionEvidence" },
  });
  if (projected.tag === "invalid") fail(projected.message);
  const auditBytes = statSync(auditPath).size;
  const auditRatio = auditBytes / FIXED_TRANSCRIPT_BYTES;
  if (auditRatio > 0.1) fail("Fixed baseline reviewer audit exceeds 10%.");
  const reductionFactor = FIXED_OBSERVATION_BYTES / projected.encodedByteLength;
  if (reductionFactor < 5)
    fail("Fixed baseline player projection is less than 5x smaller.");
  const directlyReusedFrontiersChecked = directFrontierUseChecks({
    calls: parsed.value.calls,
    projections: projected.projections,
    holeEvidenceSource: { kind: "archivedWithoutProjectionEvidence" },
  });
  const entityResourceFacts = fixedBaselineEntityResourceFactAudit({
    initialSession: parsed.value.header.initialSession,
    projections: projected.projections,
  });
  return {
    schemaVersion: 1,
    transcript: {
      bytes: FIXED_TRANSCRIPT_BYTES,
      sha256: FIXED_TRANSCRIPT_SHA256,
      calls: parsed.value.calls.length,
      continuations: new Set(
        parsed.value.calls.map(({ continuation }) => continuation),
      ).size,
    },
    reviewerAudit: {
      bytes: auditBytes,
      ratioOfTranscript: auditRatio,
      maximumRatio: 0.1,
    },
    playerProjection: {
      bytes: projected.encodedByteLength,
      baselineObservationBytes: FIXED_OBSERVATION_BYTES,
      reductionFactor,
      requiredReductionFactor: 5,
      largestTurnBytes: Math.max(
        ...projected.projections.map((projection) =>
          Buffer.byteLength(JSON.stringify(projection)),
        ),
      ),
      directlyReusedFrontiersChecked,
      retainedProgram: {
        sha256: FIXED_PROGRAM_SHA256,
        bytes: FIXED_PROGRAM_BYTES,
        frozenPrefixSha256: programArtifacts.frozenPrefixSha256,
        finalResultSha256: programArtifacts.finalResultSha256,
        entityResourceFacts,
        ...retainedProgramAudit,
      },
    },
    sqlite: {
      baselineStepPayloadBytes: FIXED_STEP_PAYLOAD_BYTES,
      indexedCallPayloadBytes,
      ratioOfBaseline: indexedPayloadRatio,
      maximumRatio: 0.1,
    },
    replayCache: {
      cumulativeReplayMilliseconds:
        replayCacheEvidence.cumulativeReplayMilliseconds,
      prefixCount: replayCacheEvidence.prefixCount,
      cumulativeThresholdMilliseconds: 60_000,
      reachesCumulativeThreshold:
        replayCacheEvidence.reachesCumulativeThreshold,
      nonModelSupervisorShare: {
        tag: "unavailable",
        reason:
          "The retained baseline predates supervisor phase timings; the controlled run supplies the required non-model share.",
      },
      decision: "awaiting-controlled-supervisor-share",
    },
  };
}

function main(args: readonly string[]): void {
  const [
    transcriptPath,
    auditPath,
    indexPath,
    replayCacheMeasurementPath,
    outputPath,
    ...unexpected
  ] = args;
  if (
    transcriptPath === undefined ||
    auditPath === undefined ||
    indexPath === undefined ||
    replayCacheMeasurementPath === undefined ||
    outputPath === undefined ||
    unexpected.length > 0
  ) {
    fail(
      "Usage: fixed-baseline-measurement.ts <transcript.jsonl> <audit.jsonl> <index.sqlite> <replay-cache-measurement.json> <measurement.json>",
    );
  }
  const measurement = measureFixedBaseline({
    transcriptPath,
    auditPath,
    indexPath,
    replayCacheMeasurementPath,
  });
  writeFileSync(
    resolve(repoRoot, outputPath),
    `${JSON.stringify(measurement, null, 2)}\n`,
    {
      flag: "wx",
    },
  );
  console.log(JSON.stringify(measurement));
}

if (process.argv[1]?.endsWith("fixed-baseline-measurement.ts")) {
  main(process.argv.slice(2));
}
