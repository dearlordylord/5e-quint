import type { StatBlockRecord } from "@dnd/surface/surface/stat-block-types";
import { Result } from "effect";
import { describe, expect, it } from "vitest";
import { startBattle } from "./battle-reducer/api-lifecycle.ts";
import { discoverBattleActCandidates } from "./battle-execution-composition.ts";
import { resolveBattleSubject } from "./index.ts";
import {
  battleId,
  statBlockCreatureInit,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import { combatantId } from "./identity.ts";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";
import {
  damageRollFillWithGroups,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";

describe("profiled Stat Block spell execution", () => {
  it("resolves a catalog-admitted self buff through production discovery and payment", () => {
    const actorId = combatantId("synthetic-profiled-spellcaster");
    const base = statBlockRecord();
    const entry = syntheticSpellcastingProcedureEntry({
      unrestrictedSpellId: "false_life",
    });
    if (entry.procedure.kind !== "spellcasting")
      throw new Error("Expected Spellcasting fixture.");
    const group = entry.procedure.groups[0];
    if (group?.kind !== "at_will") throw new Error("Expected at-will fixture.");
    const record: StatBlockRecord = {
      ...base,
      statBlock: {
        ...base.statBlock,
        actions: [
          {
            ...entry,
            procedure: {
              ...entry.procedure,
              groups: [{ ...group, spells: [{ spellId: "false_life" }] }],
            },
          },
        ],
      },
    };
    const started = startBattle({
      battleId: battleId("synthetic-profiled-spellcasting"),
      combatants: [
        statBlockCreatureInit({
          combatantId: actorId,
          statBlock: record,
          initiative: 20,
        }),
      ],
    });
    if (Result.isFailure(started))
      throw new Error("Expected admitted Stat Block caster.");
    const state = started.success.state;
    expect(state.combatants.get(actorId)?.origin.kind).toBe("statBlock");
    const cast = discoverBattleActCandidates(state).find(
      (candidate) => candidate.subject.tag === "actionSpell",
    );
    if (cast === undefined)
      throw new Error("Expected discovered Stat Block spell.");
    const roll = requireHole(cast.initialHoles, "rolledDice");
    const outcome = resolveBattleSubject({
      state,
      subject: cast.subject,
      fills: [damageRollFillWithGroups(roll, [[3, 4]])],
    });
    expect(outcome.tag).toBe("resolved");
    if (outcome.tag !== "resolved") return;
    expect(outcome.state.combatants.get(actorId)?.tempHp).toBe(11);
    expect(outcome.state.currentTurnResources.actionTakenThisTurn).toBe(true);
    expect(outcome.state.combatants.get(actorId)?.origin.kind).toBe(
      "statBlock",
    );
  });
});
