import { type BattleCreatureInit, type CombatantId } from "@dnd/battle-runtime";
import { type CharacterBattleEncounterParticipant } from "@dnd/character-battle-runtime";
import { Either, Match } from "effect";

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
}): Either.Either<readonly Initialization[], BattleCombatantCorrelationIssue> {
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
  const orderedInitializations: Initialization[] = [];
  for (const participant of input.participants) {
    const creatureInit = initializationByCombatantId.get(
      participant.combatantId,
    );
    if (creatureInit === undefined) {
      return Either.left({
        tag: "missingInitializationCombatantId",
        combatantId: participant.combatantId,
      });
    }
    if (
      !battleCombatantInitializationOriginMatches(participant, creatureInit)
    ) {
      return Either.left({
        tag: "initializationOriginMismatch",
        combatantId: participant.combatantId,
        expectedOrigin: participant.origin,
        actualOrigin: creatureInit.creatureInit.kind,
      });
    }
    orderedInitializations.push(creatureInit);
  }
  return Either.right(orderedInitializations);
}

function battleCombatantInitializationOriginMatches(
  participant: BattleCombatantCorrelationParticipant,
  creatureInit: BattleCombatantCorrelationInitialization,
): boolean {
  return Match.value(participant.origin).pipe(
    Match.when(
      "characterSheet",
      () => creatureInit.creatureInit.kind === "character",
    ),
    Match.when(
      "statBlock",
      () => creatureInit.creatureInit.kind === "statBlock",
    ),
    Match.exhaustive,
  );
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
