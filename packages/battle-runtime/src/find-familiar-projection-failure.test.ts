import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import { statBlockId } from "@dnd/shared/game-facts";
import type {
  StatBlockProcedureEntry,
  StatBlockRecord,
} from "@dnd/surface/surface/types";

import {
  battleId,
  combatantId,
  initiativeScore,
  startBattle,
} from "./index.ts";
import {
  authoredProcedureOrdinal,
  statBlockCreatureInit,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import { castResolvedFindFamiliar } from "./find-familiar-lifecycle.ts";

describe("Find Familiar projection failures", () => {
  test("preserves every accumulated unsupported procedure location", () => {
    const result = castInvalidFamiliar(unsupportedFamiliarStatBlock());

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Find Familiar form projection failed in actions procedure 1, actions procedure 3: the procedure binding is not supported by battle execution.",
    });
  });

  test("keeps scalar projection failures precise", () => {
    const result = castInvalidFamiliar(nonLiteralSizeFamiliarStatBlock());

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Find Familiar form projection failed: battle initialization requires a concrete Size.",
    });
  });
});

function castInvalidFamiliar(statBlock: StatBlockRecord) {
  const started = startBattle({
    battleId: battleId("find-familiar-projection-failure"),
    combatants: [
      statBlockCreatureInit({
        combatantId: combatantId("find-familiar-projection-caster"),
        initiative: 12,
      }),
    ],
  });
  if (Either.isLeft(started)) {
    throw new Error("Expected the Familiar projection test battle.");
  }

  return castResolvedFindFamiliar({
    state: started.right.state,
    casterId: combatantId("find-familiar-projection-caster"),
    familiarId: combatantId("find-familiar-projection-companion"),
    ammunitionStocks: [],
    resolvedForm: {
      statBlock,
      creatureTypeOverride: "fey",
    },
    initiative: initiativeScore(18),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    retainedTransition: "reject",
  });
}

function unsupportedFamiliarStatBlock(): StatBlockRecord {
  const source = statBlockRecord();
  const attack = source.statBlock.actions?.[0];
  if (attack === undefined || attack.kind !== "executable") {
    throw new Error("Expected a Goblin Warrior executable attack.");
  }
  const unsupportedAttack = {
    ...attack,
    procedure: {
      ...attack.procedure,
      multiattackCount: { kind: "literal" as const, value: 2 },
    },
  };
  const multiattack: Extract<
    StatBlockProcedureEntry,
    { readonly kind: "executable" }
  > = {
    kind: "executable",
    procedureOrdinal: authoredProcedureOrdinal(3),
    procedure: {
      kind: "multiattack",
      name: "Synthetic Familiar Routine",
      dispatches: [
        {
          procedureOrdinal: attack.procedureOrdinal,
          count: { kind: "literal", value: 1 },
        },
      ],
    },
    resourceRefs: { kind: "none" },
  };
  return {
    ...source,
    id: statBlockId("stat_block_synthetic_familiar_projection_failure"),
    name: "Synthetic Familiar Projection Failure",
    statBlock: {
      ...source.statBlock,
      actions: [unsupportedAttack, multiattack],
    },
  };
}

function nonLiteralSizeFamiliarStatBlock(): StatBlockRecord {
  const source = statBlockRecord();
  return {
    ...source,
    id: statBlockId("stat_block_synthetic_familiar_scalar_failure"),
    name: "Synthetic Familiar Scalar Projection Failure",
    statBlock: {
      ...source.statBlock,
      size: { kind: "alternatives", options: ["small", "medium"] },
    },
  };
}
