import { describe, expect, it } from "vitest";
import { Result } from "effect";
import { statBlockId, unitId } from "@dnd/shared/game-facts";
import { startBattle } from "./battle-reducer/api-lifecycle.ts";
import {
  battleId,
  statBlockCreatureInit,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import { combatantId } from "./identity.ts";
import { unitLibrary } from "./unit-profile-admission-catalog.test-support.ts";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";

describe("Stat Block reaction spell child ownership", () => {
  it.each(["counterspell", "shield", "feather_fall"] as const)(
    "retains %s as unsupported without a triggered Reaction execution owner",
    (spellId) => {
      const record = statBlockRecord();
      const entry = syntheticSpellcastingProcedureEntry();
      if (entry.procedure.kind !== "spellcasting")
        throw new Error("Expected Spellcasting fixture.");
      const atWill = entry.procedure.groups.find(
        (group) => group.kind === "at_will",
      );
      if (atWill?.kind !== "at_will")
        throw new Error("Expected at-will Spellcasting fixture group.");
      const actorId = combatantId("synthetic-reaction-spell-caster");
      const admitted = startBattle({
        battleId: battleId("synthetic-reaction-child-owner"),
        combatants: [
          {
            ...statBlockCreatureInit({
              combatantId: actorId,
              initiative: 20,
              statBlock: {
                ...record,
                id: statBlockId("synthetic_reaction_spell_caster"),
                name: "Synthetic Reaction Spell Caster",
                provenance: {
                  kind: "synthetic-test",
                  section: "reaction child ownership",
                },
                statBlock: {
                  ...record.statBlock,
                  actions: [
                    {
                      ...entry,
                      procedure: {
                        ...entry.procedure,
                        groups: [
                          { ...atWill, spells: [{ spellId: unitId(spellId) }] },
                        ],
                      },
                    },
                  ],
                },
              },
            }),
            unitCatalog: unitLibrary,
          },
        ],
      });
      if (Result.isFailure(admitted))
        throw new Error("Expected parent actor admission.");
      const actor = admitted.success.state.combatants.get(actorId);
      if (actor?.origin.kind !== "statBlock")
        throw new Error("Expected Stat Block caster.");
      const binding = actor.origin.execution.procedureBindings.find(
        (candidate) => candidate.procedure.kind === "spellcasting",
      );
      if (binding?.procedure.kind !== "spellcasting")
        throw new Error("Expected canonical Spellcasting binding.");
      expect(binding.procedure.groups[0].invocations[0].dispatch).toEqual({
        kind: "unsupported",
        reason: "missingChildProcedureOwner",
      });
    },
  );
});
