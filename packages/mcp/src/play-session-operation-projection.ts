import { Result, Match, Schema } from "effect";

import { battleToolNames } from "./battle-tool-input.ts";
import {
  CharacterSessionOperationOutputSchema,
  CreationDraftOutputSchema,
  CreationFinalizationSchema,
  FillCreationHolesOutputSchema,
  FinalizeCharacterOutputSchema,
} from "./character-tool-output.ts";
import { characterToolNames } from "./character-tool-input.ts";
import { diceToolNames } from "./dice-tool-input.ts";
import {
  BattlePresentationEnvelopeSchema,
  BattleLifecycleOutputSchema,
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
  StartBattleOutputSchema,
} from "./battle-tool-output.ts";
import { playSessionToolNames } from "./play-session-tool-contract.ts";
import type { PlaySessionOperationName } from "./play-session-tool-contract.ts";
import { PlaySessionIdSchema } from "./play-session.ts";

export type UnresolvedInputGroup = {
  readonly sourcePath: string;
  readonly inputs: readonly unknown[];
};

export type OperationProjectionIssue = {
  readonly tag: "operationProjectionDecodeIssue";
  readonly message: string;
};

const PlaySessionReadOperationResultSchema = Schema.Struct({
  tag: Schema.Literal("playSessionResumed"),
  playSessionId: PlaySessionIdSchema,
  battleEnvelope: Schema.Union([Schema.Null, BattlePresentationEnvelopeSchema]),
});

/**
 * Project only operation-owned executable inputs into the envelope.
 *
 * This is deliberately a bounded operation-name projection. Walking every
 * object property named `holes` would treat diagnostic/query route metadata as
 * an executable Battle or creation hole (for example, qRoute's
 * `projectionChoice`). Each branch decodes the operation's own output schema
 * before selecting the one or two contract-defined hole paths.
 */
export function unresolvedInputsFrom(
  operationName: PlaySessionOperationName,
  value: unknown,
): Result.Result<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  return Match.value(operationName).pipe(
    Match.when(characterToolNames.createCharacterDraft, () =>
      creationDraftUnresolvedInputs(value),
    ),
    Match.when(characterToolNames.discoverCreationHoles, () =>
      creationDraftUnresolvedInputs(value),
    ),
    Match.when(characterToolNames.fillCreationHoles, () =>
      creationFillUnresolvedInputs(value),
    ),
    Match.when(characterToolNames.finalizeCharacter, () =>
      finalizationUnresolvedInputs(value),
    ),
    Match.when(characterToolNames.applyCharacterSessionOperation, () =>
      characterSessionOperationUnresolvedInputs(value),
    ),
    Match.when(battleToolNames.startBattle, () =>
      startBattleUnresolvedInputs(value),
    ),
    Match.when(battleToolNames.battleLifecycle, () =>
      battleLifecycleUnresolvedInputs(value),
    ),
    Match.when(battleToolNames.readBattleState, () =>
      battleSessionUnresolvedInputs(value),
    ),
    Match.when(battleToolNames.discoverBattleActs, () =>
      battleSessionUnresolvedInputs(value),
    ),
    Match.when(battleToolNames.fillBattleHole, () =>
      battleResolutionUnresolvedInputs(value),
    ),
    Match.when(battleToolNames.resolveBattleAct, () =>
      battleResolutionUnresolvedInputs(value),
    ),
    Match.when(battleToolNames.endTurn, () =>
      battleResolutionUnresolvedInputs(value),
    ),
    Match.when(playSessionToolNames.read, () =>
      readPlaySessionUnresolvedInputs(value),
    ),
    Match.when(isNoHoleOperationName, () => Result.succeed([])),
    Match.exhaustive,
  );
}

export function unresolvedInputsFromBattleEnvelope(
  value: unknown,
  envelopePath = "$.envelope",
): Result.Result<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownResult(BattlePresentationEnvelopeSchema)(
    value,
  );
  if (Result.isFailure(decoded))
    return operationProjectionIssue(decoded.failure);
  return Result.succeed(
    battlePresentationUnresolvedInputsFrom(
      { envelope: decoded.success },
      envelopePath,
    ),
  );
}

function creationDraftUnresolvedInputs(
  value: unknown,
): Result.Result<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownResult(CreationDraftOutputSchema)(value);
  if (Result.isFailure(decoded))
    return operationProjectionIssue(decoded.failure);
  return Result.succeed([
    ...nonEmptyInputGroup("$.holes", decoded.success.holes),
    ...finalizationHoleGroup(decoded.success.finalization),
  ]);
}

function creationFillUnresolvedInputs(
  value: unknown,
): Result.Result<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownResult(FillCreationHolesOutputSchema)(
    value,
  );
  if (Result.isFailure(decoded))
    return operationProjectionIssue(decoded.failure);
  return Result.succeed([
    ...nonEmptyInputGroup("$.result.holes", decoded.success.result.holes),
    ...finalizationHoleGroup(
      decoded.success.result.finalization,
      "$.result.finalization.holes",
    ),
  ]);
}

function finalizationUnresolvedInputs(
  value: unknown,
): Result.Result<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownResult(FinalizeCharacterOutputSchema)(
    value,
  );
  if (Result.isFailure(decoded))
    return operationProjectionIssue(decoded.failure);
  return Result.succeed(finalizationHoleGroup(decoded.success.finalization));
}

function characterSessionOperationUnresolvedInputs(
  value: unknown,
): Result.Result<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownResult(
    CharacterSessionOperationOutputSchema,
  )(value);
  if (Result.isFailure(decoded))
    return operationProjectionIssue(decoded.failure);
  if (!("result" in decoded.success) || decoded.success.result === undefined) {
    return Result.succeed([]);
  }
  return Result.succeed(
    decoded.success.result.tag === "needsHoles"
      ? nonEmptyInputGroup("$.result.holes", decoded.success.result.holes)
      : [],
  );
}

function startBattleUnresolvedInputs(
  value: unknown,
): Result.Result<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownResult(StartBattleOutputSchema)(value);
  if (Result.isFailure(decoded))
    return operationProjectionIssue(decoded.failure);
  return Result.succeed(
    battlePresentationUnresolvedInputsFrom(decoded.success),
  );
}

function battleLifecycleUnresolvedInputs(
  value: unknown,
): Result.Result<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownResult(BattleLifecycleOutputSchema)(
    value,
  );
  if (Result.isFailure(decoded))
    return operationProjectionIssue(decoded.failure);
  return Result.succeed(
    battlePresentationUnresolvedInputsFrom(decoded.success),
  );
}

function battleSessionUnresolvedInputs(
  value: unknown,
): Result.Result<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownResult(BattleSessionOutputSchema)(value);
  if (Result.isFailure(decoded))
    return operationProjectionIssue(decoded.failure);
  return Result.succeed(
    battlePresentationUnresolvedInputsFrom(decoded.success),
  );
}

function battlePresentationUnresolvedInputsFrom(
  value: {
    readonly envelope: {
      readonly frontier:
        | {
            readonly kind: "acts";
            readonly acts: readonly {
              readonly initialHoles: readonly unknown[];
            }[];
          }
        | {
            readonly kind: "holes";
            readonly holes: readonly unknown[];
          }
        | {
            readonly kind: "interruptDecision";
            readonly decisionHole: unknown;
          };
    } | null;
  },
  envelopePath = "$.envelope",
): readonly UnresolvedInputGroup[] {
  if (value.envelope === null) return [];
  const frontier = value.envelope.frontier;
  if (frontier.kind === "acts") {
    return frontier.acts.flatMap((act, index) =>
      nonEmptyInputGroup(
        `${envelopePath}.frontier.acts[${index}].initialHoles`,
        act.initialHoles,
      ),
    );
  }
  if (frontier.kind === "holes") {
    return nonEmptyInputGroup(`${envelopePath}.frontier.holes`, frontier.holes);
  }
  return [
    {
      sourcePath: `${envelopePath}.frontier.decisionHole`,
      inputs: [frontier.decisionHole],
    },
  ];
}

function battleResolutionUnresolvedInputs(
  value: unknown,
): Result.Result<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownResult(BattleResolutionOutputSchema)(
    value,
  );
  if (Result.isFailure(decoded))
    return operationProjectionIssue(decoded.failure);
  return Result.succeed(
    battlePresentationUnresolvedInputsFrom(decoded.success),
  );
}

function readPlaySessionUnresolvedInputs(
  value: unknown,
): Result.Result<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownResult(
    PlaySessionReadOperationResultSchema,
  )(value);
  if (Result.isFailure(decoded))
    return operationProjectionIssue(decoded.failure);
  return Result.succeed(
    decoded.success.battleEnvelope === null
      ? []
      : battlePresentationUnresolvedInputsFrom(
          {
            envelope: decoded.success.battleEnvelope,
          },
          "$.battleEnvelope",
        ),
  );
}

function finalizationHoleGroup(
  finalization: Schema.Schema.Type<typeof CreationFinalizationSchema>,
  sourcePath = "$.finalization.holes",
): readonly UnresolvedInputGroup[] {
  return finalization.tag === "incomplete"
    ? nonEmptyInputGroup(sourcePath, finalization.holes)
    : [];
}

function nonEmptyInputGroup(
  sourcePath: string,
  inputs: readonly unknown[],
): readonly UnresolvedInputGroup[] {
  return inputs.length === 0 ? [] : [{ sourcePath, inputs }];
}

function operationProjectionIssue(error: {
  readonly message: string;
}): Result.Result<never, OperationProjectionIssue> {
  return Result.fail({
    tag: "operationProjectionDecodeIssue",
    message: error.message,
  });
}

type NoHoleOperationName =
  | typeof battleToolNames.selectStatBlock
  | typeof battleToolNames.endBattle
  | typeof characterToolNames.listCharacters
  | typeof characterToolNames.inspectCharacterSession
  | typeof characterToolNames.queryCharacterSession
  | typeof diceToolNames.rollDice
  | typeof playSessionToolNames.create
  | typeof playSessionToolNames.save
  | typeof playSessionToolNames.listSaved
  | typeof playSessionToolNames.deleteSaved;

const NO_HOLE_OPERATION_NAMES = [
  battleToolNames.selectStatBlock,
  battleToolNames.endBattle,
  characterToolNames.listCharacters,
  characterToolNames.inspectCharacterSession,
  characterToolNames.queryCharacterSession,
  diceToolNames.rollDice,
  playSessionToolNames.create,
  playSessionToolNames.save,
  playSessionToolNames.listSaved,
  playSessionToolNames.deleteSaved,
] as const satisfies readonly NoHoleOperationName[];

function isNoHoleOperationName(
  operationName: PlaySessionOperationName,
): operationName is NoHoleOperationName {
  return NO_HOLE_OPERATION_NAMES.some((name) => name === operationName);
}
