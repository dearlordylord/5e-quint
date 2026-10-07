import { statBlockId, unitId } from "@dnd/shared/game-facts";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Option, Result, Schema } from "effect";
import { expect, it } from "vitest";
import { StatBlockExecutionSnapshotSchema } from "./battle-reducer/battle-codecs.ts";
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

it("admits identical execution facts when authored catalog identities change", () => {
  const admitted = (suffix: string) => {
    const spell: SpellRecord = {
      ...spellRecord("magic_missile"),
      id: unitId(`synthetic_identity_spell_${suffix}`),
      name: `Synthetic Identity Spell ${suffix}`,
      provenance: {
        kind: "synthetic-test",
        section: `synthetic identity ${suffix}`,
      },
    };
    const unitCatalog: UnitCatalog = {
      getUnit: (id) =>
        id === spell.id ? Option.some(spell) : unitLibrary.getUnit(id),
      listUnits: () => [...unitLibrary.listUnits(), spell],
      requireUnit: (id) =>
        id === spell.id ? spell : unitLibrary.requireUnit(id),
    };
    const entry = syntheticSpellcastingProcedureEntry({
      unrestrictedSpellId: spell.id,
      name: `Synthetic Procedure ${suffix}`,
    });
    if (entry.procedure.kind !== "spellcasting")
      throw new Error("Expected spellcasting fixture");
    const group = entry.procedure.groups[0];
    if (group?.kind !== "at_will") throw new Error("Expected at-will fixture");
    const record = statBlockRecord();
    const actorId = combatantId("synthetic-identity-actor");
    const started = startBattle({
      battleId: battleId("synthetic-identity-battle"),
      combatants: [
        {
          ...statBlockCreatureInit({
            combatantId: actorId,
            initiative: 20,
            statBlock: {
              ...record,
              id: statBlockId(`synthetic_identity_actor_${suffix}`),
              name: `Synthetic Actor ${suffix}`,
              provenance: {
                kind: "synthetic-test",
                section: `synthetic actor ${suffix}`,
              },
              statBlock: {
                ...record.statBlock,
                actions: [
                  {
                    ...entry,
                    procedure: {
                      ...entry.procedure,
                      groups: [{ ...group, spells: [{ spellId: spell.id }] }],
                    },
                  },
                ],
              },
            },
          }),
          unitCatalog,
        },
      ],
    });
    if (Result.isFailure(started)) throw new Error("Expected admitted actor");
    const actor = started.success.state.combatants.get(actorId);
    if (actor?.origin.kind !== "statBlock")
      throw new Error("Expected Stat Block actor");
    const presentation = started.success.context.statBlocks.get(actorId);
    expect(presentation?.spellPresentationSources).toHaveLength(1);
    expect(presentation?.spellPresentationSources[0]?.invocation.spell.id).toBe(
      spell.id,
    );
    const encoded = Schema.encodeSync(StatBlockExecutionSnapshotSchema)(
      actor.origin.execution,
    );
    expect(JSON.stringify(encoded)).not.toContain(suffix);
    return encoded;
  };
  expect(admitted("first_identity")).toEqual(admitted("second_identity"));
});
