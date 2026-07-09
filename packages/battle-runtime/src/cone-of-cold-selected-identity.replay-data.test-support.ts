import { expect } from "vitest";

import {
  coneOfColdUnitId,
  flameStrikeUnitId,
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

export const coneOfColdSelectedIdentityReplay = {
  describeLabel: "Cone of Cold selected identity replay",
  taskId: "L19E-01-L5-AREA-SAVE-DAMAGE",
  initialProjection: { lastResult: "init" },
  units: [
    {
      unitId: coneOfColdUnitId,
      procedures: [
        {
          actionName: "doDiscoverConeOfColdSaveGatedDamage",
          projectionAfter: { lastResult: "coneOfColdSaveGatedDamage" },
          discover: () => {
            const spell = spellRecord(coneOfColdUnitId);
            const state = spellBattle({
              preparedSpells: [spell],
              spellSlots: [{ spellLevel: 5, count: 1 }],
            });
            const act = spellAct({
              state,
              spellId: coneOfColdUnitId,
              slotLevel: 5,
            });
            expect(act.subject).toEqual({
              tag: "actionSpell",
              actorId: spellCasterId,
              invocation: spellSlotInvocationRef(
                coneOfColdUnitId,
                5,
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
                label: "Cone of Cold self-origin Cone Saving Throw outcomes",
                ability: "con",
                dc: { kind: "caster_spell_save_dc" },
              }),
            );
            expect(spellHoleInvocation([savingThrow])).toEqual(
              expect.objectContaining({
                procedure: "saveGatedDamage",
                spell,
                resource: { tag: "spellSlot", slotLevel: 5 },
                ability: "con",
                targeting: { kind: "selfOriginCone", lengthFeet: 60 },
                damage: {
                  expr: { dice: 8, dieSize: 8 },
                  damageType: "cold",
                },
                successDamage: "half",
                rangeFeet: 0,
              }),
            );
            return { lastResult: "coneOfColdSaveGatedDamage" };
          },
        },
      ],
    },
    {
      unitId: flameStrikeUnitId,
      procedures: [
        {
          actionName: "doDiscoverFlameStrikeSaveGatedDamage",
          projectionAfter: { lastResult: "flameStrikeSaveGatedDamage" },
          discover: () => {
            const spell = spellRecord(flameStrikeUnitId);
            const state = spellBattle({
              preparedSpells: [spell],
              spellSlots: [{ spellLevel: 5, count: 1 }],
            });
            const act = spellAct({
              state,
              spellId: flameStrikeUnitId,
              slotLevel: 5,
            });
            expect(act.subject).toEqual({
              tag: "actionSpell",
              actorId: spellCasterId,
              invocation: spellSlotInvocationRef(
                flameStrikeUnitId,
                5,
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
                label: "Flame Strike point-origin Cylinder Saving Throw outcomes",
                ability: "dex",
                dc: { kind: "caster_spell_save_dc" },
              }),
            );
            expect(spellHoleInvocation([savingThrow])).toEqual(
              expect.objectContaining({
                procedure: "saveGatedDamage",
                spell,
                resource: { tag: "spellSlot", slotLevel: 5 },
                ability: "dex",
                targeting: {
                  kind: "pointOriginCylinder",
                  radiusFeet: 10,
                  heightFeet: 40,
                },
                damage: {
                  expr: { dice: 5, dieSize: 6 },
                  damageType: "fire",
                },
                additionalDamageComponents: [
                  {
                    expr: { dice: 5, dieSize: 6 },
                    damageType: "radiant",
                  },
                ],
                successDamage: "half",
                rangeFeet: 60,
              }),
            );
            return { lastResult: "flameStrikeSaveGatedDamage" };
          },
        },
      ],
    },
  ],
} satisfies SelectedIdentityReplayWitness<Readonly<Record<string, unknown>>>;
