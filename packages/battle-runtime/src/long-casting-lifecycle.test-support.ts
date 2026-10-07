import { expect } from "vitest";
import type {
  BattleState,
  BattleResolutionResult,
} from "./battle-state-execution.ts";
import { resolveBattleSubject } from "./index.ts";
import { discoverBattleActCandidates } from "./battle-execution-composition.ts";
import { unitId, statBlockId } from "@dnd/shared/game-facts";
import { Option, Result, Schema } from "effect";
import { StatBlockProcedureResourceOrdinalSchema } from "@dnd/surface/surface/schema";
import { PositiveInteger } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord, StatBlockRecord } from "@dnd/surface/surface/types";
import {
  battleId,
  wizardSpellcasting,
  statBlockCreatureInit,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import { unitLibrary } from "./unit-profile-admission-catalog.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { combatantId } from "./identity.ts";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture.test-support.ts";
import { startBattle } from "./battle-reducer/api-lifecycle.ts";
import type { LongCastingTime } from "./battle-reducer/long-casting-progress.ts";

export const longCastingReactorId = combatantId(
  "synthetic-long-casting-reactor",
);

export const longCastingActorId = combatantId("synthetic-long-casting-actor");

/** A synthetic record exercises a duration facet absent from profiled shipped spells. */
export function longCastingBattle(
  time: LongCastingTime = { kind: "minutes", amount: 1, ritual: false },
  ownership?: "each" | "shared",
  counterspell = false,
  baseSpellId = "false_life",
) {
  const base = spellRecord(baseSpellId);
  if (
    base.mechanics.family !== "activation" &&
    base.mechanics.family !== "ongoing"
  )
    throw new Error("Expected scalar activation fixture.");
  const definition: SpellRecord = {
    ...base,
    id: unitId("synthetic_slow_vitality"),
    name: "Synthetic Slow Vitality",
    provenance: { kind: "synthetic-test", section: "long casting capability" },
    mechanics: { ...base.mechanics, castingTime: time },
  };
  const sibling: SpellRecord = {
    ...definition,
    id: unitId("synthetic_slow_vitality_sibling"),
    name: "Synthetic Slow Vitality Sibling",
  };
  const definitions = [definition, sibling];
  const unitCatalog: UnitCatalog = {
    getUnit: (id) =>
      Option.orElse(
        Option.fromUndefinedOr(definitions.find((record) => record.id === id)),
        () => unitLibrary.getUnit(id),
      ),
    listUnits: () => [...unitLibrary.listUnits(), ...definitions],
    requireUnit: (id) =>
      definitions.find((record) => record.id === id) ??
      unitLibrary.requireUnit(id),
  };
  const entry = syntheticSpellcastingProcedureEntry({
    unrestrictedSpellId: definition.id,
  });
  if (entry.procedure.kind !== "spellcasting")
    throw new Error("Expected synthetic spellcasting fixture.");
  const group = entry.procedure.groups[0];
  if (group?.kind !== "at_will")
    throw new Error("Expected synthetic at-will fixture.");
  const baseActor = statBlockRecord();
  const actor: StatBlockRecord = {
    ...baseActor,
    id: statBlockId("synthetic_long_casting_actor"),
    name: "Synthetic Long Casting Actor",
    provenance: {
      kind: "synthetic-test" as const,
      section: "long casting capability",
    },
    statBlock: {
      ...baseActor.statBlock,
      ...(ownership === undefined
        ? {}
        : {
            resources: [
              {
                ordinal: Schema.decodeSync(
                  StatBlockProcedureResourceOrdinalSchema,
                )(1),
                ownership,
                limit: { kind: "daily" as const, uses: PositiveInteger(2) },
              },
              {
                ordinal: Schema.decodeSync(
                  StatBlockProcedureResourceOrdinalSchema,
                )(2),
                ownership: "shared" as const,
                limit: { kind: "daily" as const, uses: PositiveInteger(2) },
              },
            ] as const,
          }),
      actions: [
        {
          ...entry,
          procedure: {
            ...entry.procedure,
            groups:
              ownership === undefined
                ? [{ ...group, spells: [{ spellId: definition.id }] }]
                : [
                    {
                      kind: "limited",
                      resourceRefs: {
                        kind: "some",
                        ordinals: [
                          Schema.decodeSync(
                            StatBlockProcedureResourceOrdinalSchema,
                          )(1),
                        ],
                      },
                      spells: [
                        { spellId: definition.id },
                        { spellId: sibling.id },
                      ],
                    },
                    {
                      kind: "limited",
                      resourceRefs: {
                        kind: "some",
                        ordinals: [
                          Schema.decodeSync(
                            StatBlockProcedureResourceOrdinalSchema,
                          )(2),
                        ],
                      },
                      spells: [{ spellId: sibling.id }],
                    },
                  ],
          },
        },
      ],
    },
  };
  const initialized = startBattle({
    battleId: battleId("synthetic-long-casting"),
    combatants: [
      {
        ...statBlockCreatureInit({
          combatantId: longCastingActorId,
          statBlock: actor,
          initiative: 20,
        }),
        unitCatalog,
      },
      ...(counterspell
        ? [
            characterCreature({
              combatantId: longCastingReactorId,
              displayName: "Synthetic Casting Reactor",
              initiative: 10,
              spellcasting: wizardSpellcasting({
                preparedSpells: [spellRecord("counterspell")],
                spellSlots: [{ spellLevel: 3, count: 1 }],
              }),
            }),
          ]
        : []),
    ],
  });
  if (Result.isFailure(initialized))
    throw new Error("Expected synthetic long-casting catalog admission.");
  return initialized.success;
}

export function resolved(result: BattleResolutionResult): BattleState {
  expect(result.tag).toBe("resolved");
  if (result.tag !== "resolved")
    throw new Error("Expected resolved long-casting action.");
  return result.state;
}
export function castingAction(state: BattleState) {
  const act = discoverBattleActCandidates(state).find(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      (act.subject.command === "startSpellCasting" ||
        act.subject.command === "continueSpellCasting"),
  );
  if (act === undefined) throw new Error("Expected long-casting Magic action.");
  return act;
}
export function advance(state: BattleState): BattleState {
  const act = castingAction(state);
  expect(act.initialHoles).toEqual([]);
  return resolved(
    resolveBattleSubject({ state, subject: act.subject, fills: [] }),
  );
}
