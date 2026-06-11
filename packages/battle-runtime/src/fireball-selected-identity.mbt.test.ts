// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B23-FIREBALL-IDENTITY-WITNESS fireball
// UNIT-IDENTITY-MBT-REPLAY: B23-FIREBALL-IDENTITY-WITNESS fireball doDiscoverFireballSaveGatedDamage
import { expect } from "vitest";

import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  fireballUnitId,
  spellCasterId,
} from "./unit-profile-admission-catalog-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { spellSlotInvocationRef } from "./unit-profile-admission-test-support.ts";

defineSelectedIdentityWitness({
  describeLabel: "Fireball selected identity MBT",
  taskId: "B23-FIREBALL-IDENTITY-WITNESS",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-fireball-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioResult" },
  projectionSchema: { lastResult: "str" },
  initialProjection: { lastResult: "init" },
  units: [
    {
      unitId: fireballUnitId,
      procedures: [
        {
          actionName: "doDiscoverFireballSaveGatedDamage",
          projectionAfter: { lastResult: "fireballSaveGatedDamage" },
          discover: () => {
            const spell = spellRecord(fireballUnitId);
            const state = spellBattle({
              preparedSpells: [spell],
              spellSlots: [{ spellLevel: 3, count: 1 }],
            });
            const act = spellAct({
              state,
              spellId: fireballUnitId,
              slotLevel: 3,
            });
            expect(act.subject).toEqual({
              tag: "actionSpell",
              actorId: spellCasterId,
              invocation: spellSlotInvocationRef(
                fireballUnitId,
                3,
                "saveGatedDamage",
              ),
              mode: { tag: "cast" },
            });
            const savingThrow = requireHole(
              act.initialHoles,
              "savingThrowOutcome",
            );
            expect(savingThrow).toEqual(
              expect.objectContaining({
                label: "Fireball point-origin Sphere Saving Throw outcomes",
                ability: "dex",
                dc: { kind: "caster_spell_save_dc" },
              }),
            );
            expect(spellHoleInvocation([savingThrow])).toEqual(
              expect.objectContaining({
                procedure: "saveGatedDamage",
                spell,
                resource: { tag: "spellSlot", slotLevel: 3 },
                ability: "dex",
                targeting: { kind: "pointOriginSphere", radiusFeet: 20 },
                damage: {
                  expr: { dice: 8, dieSize: 6 },
                  damageType: "fire",
                },
                successDamage: "half",
                rangeFeet: 150,
                postSaveAreaEffect: { kind: "fireballObjectIgnition" },
              }),
            );
          },
        },
      ],
    },
  ],
});
