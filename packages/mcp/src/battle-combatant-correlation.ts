import { type BattleCreatureInit, type CombatantId } from "@dnd/battle-runtime";
import { Either, Match } from "effect";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

import type { ToolError } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

export type BattleCombatantCorrelationParticipant =
  | { readonly combatantId: CombatantId; readonly origin: "characterSheet" }
  | { readonly combatantId: CombatantId; readonly origin: "statBlock" };

export type BattleCombatantCorrelationInitialization = Pick<
  BattleCreatureInit,
  "combatantId"
> & {
  readonly creatureInit: Pick<BattleCreatureInit["creatureInit"], "kind">;
};

type CharacterBattleCombatantCorrelationPair<
  Initialization extends BattleCombatantCorrelationInitialization,
  Participant extends BattleCombatantCorrelationParticipant,
> = {
  readonly participant: Participant & {
    readonly origin: "characterSheet";
  };
  readonly initialization: Initialization & {
    readonly creatureInit: Extract<
      Initialization["creatureInit"],
      { readonly kind: "character" }
    >;
  };
};

type StatBlockBattleCombatantCorrelationPair<
  Initialization extends BattleCombatantCorrelationInitialization,
  Participant extends BattleCombatantCorrelationParticipant,
> = {
  readonly participant: Participant & {
    readonly origin: "statBlock";
  };
  readonly initialization: Initialization & {
    readonly creatureInit: Extract<
      Initialization["creatureInit"],
      { readonly kind: "statBlock" }
    >;
  };
};

export type BattleCombatantCorrelationPair<
  Initialization extends BattleCombatantCorrelationInitialization,
  Participant extends BattleCombatantCorrelationParticipant =
    BattleCombatantCorrelationParticipant,
> =
  | CharacterBattleCombatantCorrelationPair<Initialization, Participant>
  | StatBlockBattleCombatantCorrelationPair<Initialization, Participant>;

type CharacterBattleCombatantCorrelationInitialization<
  Initialization extends BattleCombatantCorrelationInitialization,
> = CharacterBattleCombatantCorrelationPair<
  Initialization,
  Extract<
    BattleCombatantCorrelationParticipant,
    { readonly origin: "characterSheet" }
  >
>["initialization"];
type StatBlockBattleCombatantCorrelationInitialization<
  Initialization extends BattleCombatantCorrelationInitialization,
> = StatBlockBattleCombatantCorrelationPair<
  Initialization,
  Extract<
    BattleCombatantCorrelationParticipant,
    { readonly origin: "statBlock" }
  >
>["initialization"];

function isCharacterBattleCombatantCorrelationInitialization<
  Initialization extends BattleCombatantCorrelationInitialization,
>(
  initialization: Initialization,
): initialization is CharacterBattleCombatantCorrelationInitialization<Initialization> {
  return initialization.creatureInit.kind === "character";
}

function isStatBlockBattleCombatantCorrelationInitialization<
  Initialization extends BattleCombatantCorrelationInitialization,
>(
  initialization: Initialization,
): initialization is StatBlockBattleCombatantCorrelationInitialization<Initialization> {
  return initialization.creatureInit.kind === "statBlock";
}

export type BattleCombatantCorrelationIssue =
  | {
      readonly tag: "duplicateParticipantCombatantId";
      readonly combatantId: CombatantId;
    }
  | {
      readonly tag: "duplicateInitializationCombatantId";
      readonly combatantId: CombatantId;
    }
  | {
      readonly tag: "unexpectedInitializationCombatantId";
      readonly combatantId: CombatantId;
    }
  | {
      readonly tag: "missingInitializationCombatantId";
      readonly combatantId: CombatantId;
    }
  | {
      readonly tag: "initializationOriginMismatch";
      readonly combatantId: CombatantId;
      readonly expectedOrigin: BattleCombatantCorrelationParticipant["origin"];
      readonly actualOrigin: BattleCreatureInit["creatureInit"]["kind"];
    };

function indexBattleCorrelationParticipants<
  const Participant extends BattleCombatantCorrelationParticipant,
>(
  participants: readonly Participant[],
): Either.Either<
  Map<CombatantId, Participant>,
  BattleCombatantCorrelationIssue
> {
  const byCombatantId = new Map<CombatantId, Participant>();
  for (const participant of participants) {
    if (byCombatantId.has(participant.combatantId)) {
      return Either.left({
        tag: "duplicateParticipantCombatantId",
        combatantId: participant.combatantId,
      });
    }
    byCombatantId.set(participant.combatantId, participant);
  }
  return Either.right(byCombatantId);
}

function indexBattleCorrelationInitializations<
  const Initialization extends BattleCombatantCorrelationInitialization,
>(
  creatureInits: readonly Initialization[],
): Either.Either<
  Map<CombatantId, Initialization>,
  BattleCombatantCorrelationIssue
> {
  const byCombatantId = new Map<CombatantId, Initialization>();
  for (const creatureInit of creatureInits) {
    if (byCombatantId.has(creatureInit.combatantId)) {
      return Either.left({
        tag: "duplicateInitializationCombatantId",
        combatantId: creatureInit.combatantId,
      });
    }
    byCombatantId.set(creatureInit.combatantId, creatureInit);
  }
  return Either.right(byCombatantId);
}

function validateBattleCorrelationInitializationIds<
  const Initialization extends BattleCombatantCorrelationInitialization,
  const Participant extends BattleCombatantCorrelationParticipant,
>(input: {
  readonly participants: readonly Participant[];
  readonly creatureInits: readonly Initialization[];
  readonly participantByCombatantId: ReadonlyMap<CombatantId, Participant>;
  readonly initializationByCombatantId: ReadonlyMap<
    CombatantId,
    Initialization
  >;
}): Either.Either<void, BattleCombatantCorrelationIssue> {
  for (const creatureInit of input.creatureInits) {
    if (!input.participantByCombatantId.has(creatureInit.combatantId)) {
      return Either.left({
        tag: "unexpectedInitializationCombatantId",
        combatantId: creatureInit.combatantId,
      });
    }
  }
  for (const participant of input.participants) {
    if (!input.initializationByCombatantId.has(participant.combatantId)) {
      return Either.left({
        tag: "missingInitializationCombatantId",
        combatantId: participant.combatantId,
      });
    }
  }
  return Either.right(undefined);
}

function correlateBattleCombatantPair<
  const Initialization extends BattleCombatantCorrelationInitialization,
  const Participant extends BattleCombatantCorrelationParticipant,
>(
  participant: Participant,
  creatureInit: Initialization,
): Either.Either<
  BattleCombatantCorrelationPair<Initialization, Participant>,
  BattleCombatantCorrelationIssue
> {
  return Match.value(participant.origin).pipe(
    Match.when("characterSheet", () =>
      isCharacterBattleCombatantCorrelationInitialization(creatureInit)
        ? Either.right({
            participant: {
              ...participant,
              origin: "characterSheet" as const,
            },
            initialization: creatureInit,
          })
        : Either.left({
            tag: "initializationOriginMismatch" as const,
            combatantId: participant.combatantId,
            expectedOrigin: participant.origin,
            actualOrigin: creatureInit.creatureInit.kind,
          }),
    ),
    Match.when("statBlock", () =>
      isStatBlockBattleCombatantCorrelationInitialization(creatureInit)
        ? Either.right({
            participant: { ...participant, origin: "statBlock" as const },
            initialization: creatureInit,
          })
        : Either.left({
            tag: "initializationOriginMismatch" as const,
            combatantId: participant.combatantId,
            expectedOrigin: participant.origin,
            actualOrigin: creatureInit.creatureInit.kind,
          }),
    ),
    Match.exhaustive,
  );
}

function correlateBattleCombatantsInInputOrder<
  const Initialization extends BattleCombatantCorrelationInitialization,
  const Participant extends BattleCombatantCorrelationParticipant,
>(input: {
  readonly participants: ReadonlyNonEmptyArray<Participant>;
  readonly initializationByCombatantId: ReadonlyMap<
    CombatantId,
    Initialization
  >;
}): Either.Either<
  ReadonlyNonEmptyArray<
    BattleCombatantCorrelationPair<Initialization, Participant>
  >,
  BattleCombatantCorrelationIssue
> {
  const orderedPairs: Array<
    BattleCombatantCorrelationPair<Initialization, Participant>
  > = [];
  for (const participant of input.participants) {
    const pair = correlateBattleCombatantPair(
      participant,
      requiredBattleCombatantInitialization(
        input.initializationByCombatantId,
        participant.combatantId,
      ),
    );
    if (Either.isLeft(pair)) return Either.left(pair.left);
    orderedPairs.push(pair.right);
  }
  const [firstPair, ...restPairs] = orderedPairs;
  if (firstPair === undefined) {
    throw new Error(
      "Internal invariant: non-empty participant correlation returned no pair.",
    );
  }
  return Either.right([firstPair, ...restPairs]);
}

export function correlateBattleCombatantInitializations<
  const Initialization extends BattleCombatantCorrelationInitialization,
  const Participant extends BattleCombatantCorrelationParticipant,
>(input: {
  readonly participants: ReadonlyNonEmptyArray<Participant>;
  readonly creatureInits: ReadonlyNonEmptyArray<Initialization>;
}): Either.Either<
  ReadonlyNonEmptyArray<
    BattleCombatantCorrelationPair<Initialization, Participant>
  >,
  BattleCombatantCorrelationIssue
> {
  const participants = indexBattleCorrelationParticipants(input.participants);
  if (Either.isLeft(participants)) return Either.left(participants.left);
  const initializations = indexBattleCorrelationInitializations(
    input.creatureInits,
  );
  if (Either.isLeft(initializations)) return Either.left(initializations.left);
  const validIds = validateBattleCorrelationInitializationIds({
    participants: input.participants,
    creatureInits: input.creatureInits,
    participantByCombatantId: participants.right,
    initializationByCombatantId: initializations.right,
  });
  if (Either.isLeft(validIds)) return Either.left(validIds.left);
  return correlateBattleCombatantsInInputOrder({
    participants: input.participants,
    initializationByCombatantId: initializations.right,
  });
}

export function correlateSingleBattleCombatantInitialization<
  const Initialization extends BattleCombatantCorrelationInitialization,
  const Participant extends BattleCombatantCorrelationParticipant,
>(input: {
  readonly participant: Participant;
  readonly creatureInits: ReadonlyNonEmptyArray<Initialization>;
}): Either.Either<
  BattleCombatantCorrelationPair<Initialization, Participant>,
  BattleCombatantCorrelationIssue
> {
  const correlated = correlateBattleCombatantInitializations({
    participants: [input.participant],
    creatureInits: input.creatureInits,
  });
  if (Either.isLeft(correlated)) return Either.left(correlated.left);
  const [pair] = correlated.right;
  return Either.right(pair);
}

function requiredBattleCombatantInitialization<
  Initialization extends BattleCombatantCorrelationInitialization,
>(
  initializationByCombatantId: ReadonlyMap<CombatantId, Initialization>,
  combatantId: CombatantId,
): Initialization {
  const creatureInit = initializationByCombatantId.get(combatantId);
  if (creatureInit === undefined) {
    throw new Error(
      `Internal invariant: validated combatant initialization is absent for ${combatantId}.`,
    );
  }
  return creatureInit;
}

const BATTLE_COMBATANT_PROJECTION_CORRELATION_FAILED =
  "BATTLE_COMBATANT_PROJECTION_CORRELATION_FAILED" as const;

export function battleCombatantCorrelationIssueContent(
  issue: BattleCombatantCorrelationIssue,
): ToolError {
  return Match.value(issue).pipe(
    Match.when({ tag: "duplicateParticipantCombatantId" }, (matched) =>
      errorContent(
        "Battle combatant projection received duplicate participant ids.",
        {
          code: BATTLE_COMBATANT_PROJECTION_CORRELATION_FAILED,
          reason: matched.tag,
          combatantId: matched.combatantId,
        },
      ),
    ),
    Match.when({ tag: "duplicateInitializationCombatantId" }, (matched) =>
      errorContent(
        "Battle combatant projection returned duplicate initialization ids.",
        {
          code: BATTLE_COMBATANT_PROJECTION_CORRELATION_FAILED,
          reason: matched.tag,
          combatantId: matched.combatantId,
        },
      ),
    ),
    Match.when({ tag: "unexpectedInitializationCombatantId" }, (matched) =>
      errorContent(
        "Battle combatant projection returned an unexpected initialization id.",
        {
          code: BATTLE_COMBATANT_PROJECTION_CORRELATION_FAILED,
          reason: matched.tag,
          combatantId: matched.combatantId,
        },
      ),
    ),
    Match.when({ tag: "missingInitializationCombatantId" }, (matched) =>
      errorContent(
        "Battle combatant projection omitted an initialization id.",
        {
          code: BATTLE_COMBATANT_PROJECTION_CORRELATION_FAILED,
          reason: matched.tag,
          combatantId: matched.combatantId,
        },
      ),
    ),
    Match.when({ tag: "initializationOriginMismatch" }, (matched) =>
      errorContent(
        "Battle combatant projection initialization origin did not match participant origin.",
        {
          code: BATTLE_COMBATANT_PROJECTION_CORRELATION_FAILED,
          reason: matched.tag,
          combatantId: matched.combatantId,
          expectedOrigin: matched.expectedOrigin,
          actualOrigin: matched.actualOrigin,
        },
      ),
    ),
    Match.exhaustive,
  );
}
