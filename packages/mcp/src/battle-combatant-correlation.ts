import { type BattleCreatureInit, type CombatantId } from "@dnd/battle-runtime";
import { type CharacterBattleEncounterParticipant } from "@dnd/character-battle-runtime";
import { Either, Match } from "effect";

import type {
  CharacterBattleRosterCombatant,
  StatBlockBattleRosterCombatant,
} from "./battle-roster-session-types.ts";
import type { ToolError } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

export type BattleCombatantCorrelationParticipant = Pick<
  CharacterBattleEncounterParticipant,
  "combatantId" | "origin"
>;

export type BattleCombatantCorrelationInitialization = Pick<
  BattleCreatureInit,
  "combatantId"
> & {
  readonly creatureInit: Pick<BattleCreatureInit["creatureInit"], "kind">;
};

type CharacterBattleCombatantCorrelationPair<
  Initialization extends BattleCombatantCorrelationInitialization,
> = {
  readonly participant: BattleCombatantCorrelationParticipant & {
    readonly origin: "characterSheet";
  };
  readonly initialization: Initialization & {
    readonly creatureInit: Extract<
      Initialization["creatureInit"],
      CharacterBattleRosterCombatant["creatureInit"]
    >;
  };
};

type StatBlockBattleCombatantCorrelationPair<
  Initialization extends BattleCombatantCorrelationInitialization,
> = {
  readonly participant: BattleCombatantCorrelationParticipant & {
    readonly origin: "statBlock";
  };
  readonly initialization: Initialization & {
    readonly creatureInit: Extract<
      Initialization["creatureInit"],
      StatBlockBattleRosterCombatant["creatureInit"]
    >;
  };
};

export type BattleCombatantCorrelationPair<
  Initialization extends BattleCombatantCorrelationInitialization,
> =
  | CharacterBattleCombatantCorrelationPair<Initialization>
  | StatBlockBattleCombatantCorrelationPair<Initialization>;

type CharacterBattleCombatantCorrelationInitialization<
  Initialization extends BattleCombatantCorrelationInitialization,
> = CharacterBattleCombatantCorrelationPair<Initialization>["initialization"];
type StatBlockBattleCombatantCorrelationInitialization<
  Initialization extends BattleCombatantCorrelationInitialization,
> = StatBlockBattleCombatantCorrelationPair<Initialization>["initialization"];

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

export function correlateBattleCombatantInitializations<
  const Initialization extends BattleCombatantCorrelationInitialization,
>(input: {
  readonly participants: readonly BattleCombatantCorrelationParticipant[];
  readonly creatureInits: readonly Initialization[];
}): Either.Either<
  readonly BattleCombatantCorrelationPair<Initialization>[],
  BattleCombatantCorrelationIssue
> {
  const participantByCombatantId = new Map<
    CombatantId,
    BattleCombatantCorrelationParticipant
  >();
  for (const participant of input.participants) {
    if (participantByCombatantId.has(participant.combatantId)) {
      return Either.left({
        tag: "duplicateParticipantCombatantId",
        combatantId: participant.combatantId,
      });
    }
    participantByCombatantId.set(participant.combatantId, participant);
  }

  const initializationByCombatantId = new Map<CombatantId, Initialization>();
  for (const creatureInit of input.creatureInits) {
    if (initializationByCombatantId.has(creatureInit.combatantId)) {
      return Either.left({
        tag: "duplicateInitializationCombatantId",
        combatantId: creatureInit.combatantId,
      });
    }
    initializationByCombatantId.set(creatureInit.combatantId, creatureInit);
  }

  for (const creatureInit of input.creatureInits) {
    if (!participantByCombatantId.has(creatureInit.combatantId)) {
      return Either.left({
        tag: "unexpectedInitializationCombatantId",
        combatantId: creatureInit.combatantId,
      });
    }
  }

  for (const participant of input.participants) {
    if (!initializationByCombatantId.has(participant.combatantId)) {
      return Either.left({
        tag: "missingInitializationCombatantId",
        combatantId: participant.combatantId,
      });
    }
  }

  // The MCP roster order is the caller's order; the owner output order is not
  // part of this join contract.
  const orderedPairs: BattleCombatantCorrelationPair<Initialization>[] = [];
  for (const participant of input.participants) {
    const creatureInit = requiredBattleCombatantInitialization(
      initializationByCombatantId,
      participant.combatantId,
    );
    const pair = Match.value(participant.origin).pipe(
      Match.when("characterSheet", () =>
        isCharacterBattleCombatantCorrelationInitialization(creatureInit)
          ? Either.right({
              participant:
                participant as CharacterBattleCombatantCorrelationPair<Initialization>["participant"],
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
              participant:
                participant as StatBlockBattleCombatantCorrelationPair<Initialization>["participant"],
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
    if (Either.isLeft(pair)) return Either.left(pair.left);
    orderedPairs.push(pair.right);
  }
  return Either.right(orderedPairs);
}

export function correlateSingleBattleCombatantInitialization<
  const Initialization extends BattleCombatantCorrelationInitialization,
>(input: {
  readonly participant: BattleCombatantCorrelationParticipant;
  readonly creatureInits: readonly Initialization[];
}): Either.Either<
  BattleCombatantCorrelationPair<Initialization>,
  BattleCombatantCorrelationIssue
> {
  const correlated = correlateBattleCombatantInitializations({
    participants: [input.participant],
    creatureInits: input.creatureInits,
  });
  if (Either.isLeft(correlated)) return Either.left(correlated.left);
  const pair = correlated.right[0];
  if (pair === undefined) {
    throw new Error(
      "Internal invariant: single-combatant correlation returned no pair.",
    );
  }
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
