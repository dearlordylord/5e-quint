import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  BattleSnapshotSchema,
  snapshotBattle,
} from "./battle-state-execution.ts";
import { wizardVsSkeletonBattle } from "./battle-runtime-test-support.ts";

describe("character procedure execution identity", () => {
  test("decodes durable bindings independently of their serialized order", () => {
    const encoded = Schema.encodeSync(BattleSnapshotSchema)(
      snapshotBattle(wizardVsSkeletonBattle().state),
    );
    const wizard = encoded.combatants.find(
      (combatant) => combatant.origin.kind === "character",
    );
    if (wizard?.origin.kind !== "character") {
      throw new Error("Expected a serialized character combatant.");
    }
    const reordered = {
      ...encoded,
      combatants: encoded.combatants.map((combatant) =>
        combatant !== wizard || combatant.origin.kind !== "character"
          ? combatant
          : {
              ...combatant,
              origin: {
                ...combatant.origin,
                execution: {
                  ...combatant.origin.execution,
                  procedureBindings: [
                    ...combatant.origin.execution.procedureBindings,
                  ].reverse(),
                },
              },
            },
      ),
    };

    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)(reordered),
    ).not.toThrow();
  });
});
