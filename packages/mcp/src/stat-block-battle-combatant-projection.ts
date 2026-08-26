import {
  battleCreatureInitFromAuthoredStatBlock,
  battleStateInitIssueMessage,
  type BattleStatBlockProjectionFailure,
} from "@dnd/battle-runtime";
import { Either, Match, Option } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { StatBlockCombatantToolInput } from "./start-battle-tool-input.ts";
import { errorContent } from "./tool-content.ts";

export function projectStatBlockBattleCombatant(input: {
  readonly root: McpPlaySessionRoot;
  readonly combatant: StatBlockCombatantToolInput;
}) {
  const statBlock = input.root.statBlockCatalog.getStatBlock(
    input.combatant.statBlockId,
  );
  if (Option.isNone(statBlock)) {
    return Either.left(
      errorContent("Unknown Stat Block combatant.", {
        code: "UNKNOWN_STAT_BLOCK_COMBATANT",
        statBlockId: input.combatant.statBlockId,
      }),
    );
  }
  const creatureInit = battleCreatureInitFromAuthoredStatBlock({
    combatantId: input.combatant.combatantId,
    statBlock: statBlock.value,
    initiative: input.combatant.initiative,
    ammunitionStocks: input.combatant.ammunitionStocks,
    conditions: [],
    ...(input.combatant.currentHp === undefined
      ? {}
      : { currentHp: input.combatant.currentHp }),
    ...(input.combatant.tempHp === undefined
      ? {}
      : { tempHp: input.combatant.tempHp }),
  });
  if (Either.isLeft(creatureInit)) {
    return Either.left(
      Match.value(creatureInit.left).pipe(
        Match.when({ tag: "statBlockProjectionFailure" }, ({ failure }) =>
          statBlockProjectionFailureContent(
            input.combatant.statBlockId,
            failure,
          ),
        ),
        Match.when({ tag: "battleStateInitIssue" }, (issue) =>
          errorContent(battleStateInitIssueMessage(issue), {
            code: "STAT_BLOCK_BATTLE_INIT_INVALID",
          }),
        ),
        Match.exhaustive,
      ),
    );
  }
  if (creatureInit.right.creatureInit.kind !== "statBlock") {
    return Either.left(
      errorContent(
        "Stat Block battle initialization produced a character combatant.",
        { code: "STAT_BLOCK_BATTLE_INIT_INVALID" },
      ),
    );
  }
  return Either.right({
    tag: "encounterCombatant" as const,
    creatureInit: {
      ...creatureInit.right,
      creatureInit: creatureInit.right.creatureInit,
    },
  });
}

function statBlockProjectionFailureContent(
  statBlockId: string,
  failure: BattleStatBlockProjectionFailure,
) {
  return errorContent("Stat Block projection failed.", {
    code: "STAT_BLOCK_BATTLE_INIT_INVALID",
    statBlockId,
    reason: failure.reason,
    ...(failure.procedureOrdinal === undefined
      ? {}
      : { procedureOrdinal: failure.procedureOrdinal }),
    ...(failure.section === undefined ? {} : { section: failure.section }),
  });
}
