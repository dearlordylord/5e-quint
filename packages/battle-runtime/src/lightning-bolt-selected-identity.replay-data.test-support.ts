import { expect } from "vitest";

import {
  lightningBoltUnitId,
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
import type { SelectedIdentityReplayWitness } from "./selected-identity-witness.ts";

export const lightningBoltSelectedIdentityReplay = {
  describeLabel: "Lightning Bolt selected identity replay",
  taskId: "B24-LIGHTNING-BOLT-IDENTITY-WITNESS",
  initialProjection: { lastResult: "init" },
  units: [
      {
        unitId: lightningBoltUnitId,
        procedures: [
          {
            actionName: "doDiscoverLightningBoltSaveGatedDamage",
            projectionAfter: { lastResult: "lightningBoltSaveGatedDamage" },
            discover: () => {
              const spell = spellRecord(lightningBoltUnitId);
              const state = spellBattle({
                preparedSpells: [spell],
                spellSlots: [{ spellLevel: 3, count: 1 }],
              });
              const act = spellAct({
                state,
                spellId: lightningBoltUnitId,
                slotLevel: 3,
              });
              expect(act.subject).toEqual({
                tag: "actionSpell",
                actorId: spellCasterId,
                invocation: spellSlotInvocationRef(
                  lightningBoltUnitId,
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
                  label: "Lightning Bolt self-origin Line Saving Throw outcomes",
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
                  targeting: {
                    kind: "selfOriginLine",
                    lengthFeet: 100,
                    widthFeet: 5,
                  },
                  damage: {
                    expr: { dice: 8, dieSize: 6 },
                    damageType: "lightning",
                  },
                  successDamage: "half",
                  rangeFeet: 0,
                  failedSavePostDamageRiders: [],
                }),
              );
            },
          },
        ],
      },
    ],
} satisfies SelectedIdentityReplayWitness<Readonly<Record<string, unknown>>>;
