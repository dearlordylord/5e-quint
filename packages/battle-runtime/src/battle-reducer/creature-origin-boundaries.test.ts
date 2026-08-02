import { describe, expect, test } from "vitest";

import {
  battleProcedureExecutionRefForTest,
  fighterVsGoblinBattle,
  goblinId,
} from "../battle-runtime.test-support.ts";
import { ongoingFeatureProfileForSourceKey } from "./creature-state-queries.ts";
import { supportedSpellActs } from "./supported-spell-acts.ts";
import { spellAdmissionContextFor } from "./spell-procedure-profiles/admission-context.ts";

describe("creature-origin execution boundaries", () => {
  test("rejects character-only projections for a Stat Block combatant", () => {
    const state = fighterVsGoblinBattle();
    const goblin = state.combatants.get(goblinId);
    if (goblin?.origin.kind !== "statBlock") {
      throw new Error("Expected the admitted Goblin Stat Block combatant.");
    }

    expect(
      ongoingFeatureProfileForSourceKey(
        goblin,
        battleProcedureExecutionRefForTest("synthetic-ongoing-feature"),
      ),
    ).toBeNull();
    expect(supportedSpellActs(state, goblin)).toEqual([]);
    expect(spellAdmissionContextFor(goblin, state)).toBeNull();
  });
});
