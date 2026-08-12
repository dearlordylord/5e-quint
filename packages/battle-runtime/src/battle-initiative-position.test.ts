import {
  createInitiativeStack,
  nextInitiative,
} from "@dnd/shared-algebras/initiative-algebra";
import { Round } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import { battleInitiativePosition } from "./battle-initiative-position.ts";
import { combatantId, initiativeScore } from "./identity.ts";

const goblinId = combatantId("goblin");
const skeletonId = combatantId("skeleton");

describe("battle initiative position", () => {
  // RAW: .references/srd-5.2.1/Playing-the-Game.md, "The Order of
  // Combat" — each participant takes a turn during a round.
  test("reports the round reached and active turn", () => {
    const firstRound = createInitiativeStack(
      [
        { creature: goblinId, initiative: initiativeScore(15) },
        { creature: skeletonId, initiative: initiativeScore(10) },
      ],
      Round(1),
    );
    const skeletonTurn = nextInitiative(firstRound);
    const secondRound = nextInitiative(skeletonTurn);

    expect(battleInitiativePosition({ initiative: firstRound })).toEqual({
      roundReached: 1,
      activeTurnActorId: goblinId,
    });
    expect(battleInitiativePosition({ initiative: skeletonTurn })).toEqual({
      roundReached: 1,
      activeTurnActorId: skeletonId,
    });
    expect(battleInitiativePosition({ initiative: secondRound })).toEqual({
      roundReached: 2,
      activeTurnActorId: goblinId,
    });
  });
});
