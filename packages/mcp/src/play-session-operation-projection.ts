import { Either, Match, Schema } from "effect";

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
  BattleLifecycleOutputSchema,
  BattleResolutionOutputSchema,
  BattleSessionOutputSchema,
  StartBattleOutputSchema,
} from "./battle-tool-output.ts";
import { playSessionToolNames } from "./play-session-tool-contract.ts";
import type { PlaySessionOperationName } from "./play-session-tool-contract.ts";

export type UnresolvedInputGroup = {
  readonly sourcePath: string;
  readonly inputs: readonly unknown[];
};

export type OperationProjectionIssue = {
  readonly tag: "operationProjectionDecodeIssue";
  readonly message: string;
};

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
): Either.Either<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
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
    Match.when(isNoHoleOperationName, () => Either.right([])),
    Match.exhaustive,
  );
}

function creationDraftUnresolvedInputs(
  value: unknown,
): Either.Either<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownEither(CreationDraftOutputSchema)(value);
  if (Either.isLeft(decoded)) return operationProjectionIssue(decoded.left);
  return Either.right([
    ...nonEmptyInputGroup("$.holes", decoded.right.holes),
    ...finalizationHoleGroup(decoded.right.finalization),
  ]);
}

function creationFillUnresolvedInputs(
  value: unknown,
): Either.Either<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownEither(FillCreationHolesOutputSchema)(
    value,
  );
  if (Either.isLeft(decoded)) return operationProjectionIssue(decoded.left);
  return Either.right([
    ...nonEmptyInputGroup("$.result.holes", decoded.right.result.holes),
    ...finalizationHoleGroup(
      decoded.right.result.finalization,
      "$.result.finalization.holes",
    ),
  ]);
}

function finalizationUnresolvedInputs(
  value: unknown,
): Either.Either<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownEither(FinalizeCharacterOutputSchema)(
    value,
  );
  if (Either.isLeft(decoded)) return operationProjectionIssue(decoded.left);
  return Either.right(finalizationHoleGroup(decoded.right.finalization));
}

function characterSessionOperationUnresolvedInputs(
  value: unknown,
): Either.Either<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownEither(
    CharacterSessionOperationOutputSchema,
  )(value);
  if (Either.isLeft(decoded)) return operationProjectionIssue(decoded.left);
  if (!("result" in decoded.right) || decoded.right.result === undefined) {
    return Either.right([]);
  }
  return Either.right(
    decoded.right.result.tag === "needsHoles"
      ? nonEmptyInputGroup("$.result.holes", decoded.right.result.holes)
      : [],
  );
}

function startBattleUnresolvedInputs(
  value: unknown,
): Either.Either<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownEither(StartBattleOutputSchema)(value);
  if (Either.isLeft(decoded)) return operationProjectionIssue(decoded.left);
  return Either.right(battlePresentationUnresolvedInputsFrom(decoded.right));
}

function battleLifecycleUnresolvedInputs(
  value: unknown,
): Either.Either<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownEither(BattleLifecycleOutputSchema)(
    value,
  );
  if (Either.isLeft(decoded)) return operationProjectionIssue(decoded.left);
  return Either.right(battlePresentationUnresolvedInputsFrom(decoded.right));
}

function battleSessionUnresolvedInputs(
  value: unknown,
): Either.Either<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownEither(BattleSessionOutputSchema)(value);
  if (Either.isLeft(decoded)) return operationProjectionIssue(decoded.left);
  const pending = decoded.right.session.transientBattleFills;
  if (pending !== null) {
    return Either.right(
      nonEmptyInputGroup("$.session.transientBattleFills.holes", pending.holes),
    );
  }
  return Either.right(battlePresentationUnresolvedInputsFrom(decoded.right));
}

function battlePresentationUnresolvedInputsFrom(value: {
  readonly availableActs: readonly {
    readonly initialHoles: readonly unknown[];
  }[];
}): readonly UnresolvedInputGroup[] {
  return value.availableActs.flatMap((act, index) =>
    nonEmptyInputGroup(
      `$.availableActs[${index}].initialHoles`,
      act.initialHoles,
    ),
  );
}

function battleResolutionUnresolvedInputs(
  value: unknown,
): Either.Either<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const decoded = Schema.decodeUnknownEither(BattleResolutionOutputSchema)(
    value,
  );
  if (Either.isLeft(decoded)) return operationProjectionIssue(decoded.left);
  return Either.right(
    Match.value(decoded.right.result).pipe(
      Match.when({ tag: "needsHoles" }, (needsHoles) =>
        nonEmptyInputGroup("$.result.holes", needsHoles.holes),
      ),
      Match.when({ tag: "resolved" }, () =>
        battlePresentationUnresolvedInputsFrom(decoded.right),
      ),
      Match.when({ tag: "invalid" }, () =>
        battlePresentationUnresolvedInputsFrom(decoded.right),
      ),
      Match.exhaustive,
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
}): Either.Either<never, OperationProjectionIssue> {
  return Either.left({
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
  | typeof playSessionToolNames.read
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
  playSessionToolNames.read,
  playSessionToolNames.save,
  playSessionToolNames.listSaved,
  playSessionToolNames.deleteSaved,
] as const satisfies readonly NoHoleOperationName[];

function isNoHoleOperationName(
  operationName: PlaySessionOperationName,
): operationName is NoHoleOperationName {
  return NO_HOLE_OPERATION_NAMES.some((name) => name === operationName);
}
