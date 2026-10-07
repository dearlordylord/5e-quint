import type { StatBlockSpellcastingExecutableProcedureEntry } from "@dnd/surface/surface/stat-block-types";
import { unitId } from "@dnd/shared/game-facts";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Option, Result } from "effect";
import { expect, it } from "vitest";
import { startBattle } from "./battle-reducer/api-lifecycle.ts";
import {
  battleId,
  statBlockCreatureInit,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import { combatantId } from "./identity.ts";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";
import { unitLibrary } from "./unit-profile-admission-catalog.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";

it("admits owned damage and rejects the same damage with an unowned death aftermath", () => {
  const base = spellRecord("finger_of_death");
  if (base.mechanics.family !== "activation")
    throw new Error("Expected activation source witness.");
  const { deathAftermath, ...damageOnly } = base.mechanics;
  if (deathAftermath === undefined)
    throw new Error("Expected retained source death aftermath.");
  const definitions: readonly SpellRecord[] = [
    {
      ...base,
      id: unitId("synthetic_damage_only"),
      name: "Synthetic Damage Only",
      provenance: { kind: "synthetic-test", section: "compound admission" },
      mechanics: damageOnly,
    },
    {
      ...base,
      id: unitId("synthetic_damage_and_aftermath"),
      name: "Synthetic Damage And Aftermath",
      provenance: { kind: "synthetic-test", section: "compound admission" },
    },
  ];
  for (const definition of definitions) {
    const catalog: UnitCatalog = {
      getUnit: (id) =>
        id === definition.id
          ? Option.some(definition)
          : unitLibrary.getUnit(id),
      listUnits: () => [...unitLibrary.listUnits(), definition],
      requireUnit: (id) =>
        id === definition.id ? definition : unitLibrary.requireUnit(id),
    };
    const entry = syntheticSpellcastingProcedureEntry({
      unrestrictedSpellId: definition.id,
    });
    if (entry.procedure.kind !== "spellcasting")
      throw new Error("Expected Spellcasting fixture.");
    const group = entry.procedure.groups[0];
    if (group?.kind !== "at_will") throw new Error("Expected at-will fixture.");
    const selected: StatBlockSpellcastingExecutableProcedureEntry = {
      ...entry,
      procedure: {
        ...entry.procedure,
        groups: [{ ...group, spells: [{ spellId: definition.id }] }],
      },
    };
    const baseActor = statBlockRecord();
    const actorId = combatantId("synthetic-compound-caster");
    const started = startBattle({
      battleId: battleId("compound-mechanics-admission"),
      combatants: [
        statBlockCreatureInit({
          combatantId: actorId,
          initiative: 20,
          unitCatalog: catalog,
          statBlock: {
            ...baseActor,
            statBlock: { ...baseActor.statBlock, actions: [selected] },
          },
        }),
      ],
    });
    if (Result.isFailure(started))
      throw new Error("Expected admitted parent actor.");
    const actor = started.success.state.combatants.get(actorId);
    if (actor?.origin.kind !== "statBlock")
      throw new Error("Expected Stat Block actor.");
    const binding = actor.origin.execution.procedureBindings.find(
      (candidate) => candidate.procedure.kind === "spellcasting",
    );
    if (binding?.procedure.kind !== "spellcasting")
      throw new Error("Expected canonical spellcasting binding.");
    const dispatch = binding.procedure.groups[0].invocations[0].dispatch;
    if ("deathAftermath" in definition.mechanics)
      expect(dispatch).toEqual({
        kind: "unsupported",
        reason: "unsupportedDeathAftermath",
      });
    else expect(dispatch.kind).toBe("executable");
  }
});
