// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH dragons_breath flame_blade flaming_sphere heat_metal moonbeam ray_of_enfeeblement scorching_ray shatter spiritual_weapon
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH dragons_breath doDiscoverDragonsBreathInitial
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH flame_blade doDiscoverFlameBladeHeldObject
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH flaming_sphere doDiscoverFlamingSphereHazard
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH heat_metal doDiscoverHeatMetalObjectContact
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH moonbeam doDiscoverMoonbeamMovableZone
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH ray_of_enfeeblement doDiscoverRayOfEnfeeblementSaveGate
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH scorching_ray doDiscoverScorchingRayAttackSequence
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH shatter doDiscoverShatterSaveGatedDamage
// UNIT-IDENTITY-MBT-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH spiritual_weapon doDiscoverSpiritualWeaponAttackProxy
import * as path from "node:path";

import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { expect } from "vitest";

import dragonsBreathInput from "../../surface/content/dragons_breath.json";
import rayOfEnfeeblementInput from "../../surface/content/ray_of_enfeeblement.json";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import type { BattleState } from "./index.ts";
import {
  dragonsBreathUnitId,
  flameBladeUnitId,
  flamingSphereUnitId,
  heatMetalUnitId,
  moonbeamUnitId,
  scorchingRayUnitId,
  shatterUnitId,
  spellCasterId,
  spiritualWeaponUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { spellSlotInvocationRef } from "./unit-profile-admission-test-support.ts";

const rayOfEnfeeblementUnitId = "ray_of_enfeeblement";
const level2DamageSpellUnitIds = [
  dragonsBreathUnitId,
  flameBladeUnitId,
  flamingSphereUnitId,
  heatMetalUnitId,
  moonbeamUnitId,
  rayOfEnfeeblementUnitId,
  scorchingRayUnitId,
  shatterUnitId,
  spiritualWeaponUnitId,
] as const;
type Level2DamageSpellUnitId = (typeof level2DamageSpellUnitIds)[number];
type Level2DamageSpellSelectedIdentityResult =
  | "init"
  | "dragonsBreathInitial"
  | "flameBladeHeldObject"
  | "flamingSphereHazard"
  | "heatMetalObjectContact"
  | "moonbeamMovableZone"
  | "rayOfEnfeeblementSaveGate"
  | "scorchingRayAttackSequence"
  | "shatterSaveGatedDamage"
  | "spiritualWeaponAttackProxy";
type Level2DamageSpellSelectedIdentityProjection = {
  readonly lastResult: Level2DamageSpellSelectedIdentityResult;
};
type SpellActionTag = "actionSpell" | "bonusActionSpell";
type SelectedLevel2DamageSpellInvocation = {
  readonly spellId: Level2DamageSpellUnitId;
  readonly actionTag: SpellActionTag;
  readonly slotLevel: 2;
  readonly procedure: Parameters<typeof spellSlotInvocationRef>[2];
  readonly result: Exclude<Level2DamageSpellSelectedIdentityResult, "init">;
};

defineSelectedIdentityWitness({
  describeLabel: "Level 2 damage spell selected identity MBT",
  taskId: "B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH",
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-level2-damage-spell-selected-identity.mbt.qnt",
  ),
  projectionSchema: { lastResult: "str" },
  initialProjection: expectedProjection("init"),
  units: [
    {
      unitId: dragonsBreathUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverDragonsBreathInitial", {
          spellId: dragonsBreathUnitId,
          actionTag: "bonusActionSpell",
          slotLevel: 2,
          procedure: "dragonsBreathInitial",
          result: "dragonsBreathInitial",
        }),
      ],
    },
    {
      unitId: flameBladeUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverFlameBladeHeldObject", {
          spellId: flameBladeUnitId,
          actionTag: "bonusActionSpell",
          slotLevel: 2,
          procedure: "spellCreatedHeldObject",
          result: "flameBladeHeldObject",
        }),
      ],
    },
    {
      unitId: flamingSphereUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverFlamingSphereHazard", {
          spellId: flamingSphereUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "flamingSphere",
          result: "flamingSphereHazard",
        }),
      ],
    },
    {
      unitId: heatMetalUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverHeatMetalObjectContact", {
          spellId: heatMetalUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "objectContactDamage",
          result: "heatMetalObjectContact",
        }),
      ],
    },
    {
      unitId: moonbeamUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverMoonbeamMovableZone", {
          spellId: moonbeamUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "moonbeam",
          result: "moonbeamMovableZone",
        }),
      ],
    },
    {
      unitId: rayOfEnfeeblementUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverRayOfEnfeeblementSaveGate", {
          spellId: rayOfEnfeeblementUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "abilityD20TestRollModeSaveGate",
          result: "rayOfEnfeeblementSaveGate",
        }),
      ],
    },
    {
      unitId: scorchingRayUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverScorchingRayAttackSequence", {
          spellId: scorchingRayUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "spellAttackSequence",
          result: "scorchingRayAttackSequence",
        }),
      ],
    },
    {
      unitId: shatterUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverShatterSaveGatedDamage", {
          spellId: shatterUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "saveGatedDamage",
          result: "shatterSaveGatedDamage",
        }),
      ],
    },
    {
      unitId: spiritualWeaponUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverSpiritualWeaponAttackProxy", {
          spellId: spiritualWeaponUnitId,
          actionTag: "bonusActionSpell",
          slotLevel: 2,
          procedure: "spiritualWeaponAttackProxy",
          result: "spiritualWeaponAttackProxy",
        }),
      ],
    },
  ],
});

function selectedSpellProcedure(
  actionName: `do${string}`,
  input: SelectedLevel2DamageSpellInvocation,
) {
  return {
    actionName,
    projectionAfter: expectedProjection(input.result),
    discover: () => recordDiscoveredInvocation(input),
  };
}

function recordDiscoveredInvocation(
  input: SelectedLevel2DamageSpellInvocation,
): Level2DamageSpellSelectedIdentityProjection {
  const spell = selectedSpellRecord(input.spellId);
  const state = selectedSpellBattle(spell);
  const act =
    input.actionTag === "bonusActionSpell"
      ? bonusSpellAct({
          state,
          spellId: input.spellId,
          slotLevel: input.slotLevel,
        })
      : spellAct({
          state,
          spellId: input.spellId,
          slotLevel: input.slotLevel,
        });

  expect(act.subject).toEqual({
    tag: input.actionTag,
    actorId: spellCasterId,
    invocation: spellSlotInvocationRef(
      input.spellId,
      input.slotLevel,
      input.procedure,
    ),
    mode: { tag: "cast" },
  });
  return expectedProjection(input.result);
}

function expectedProjection(
  lastResult: Level2DamageSpellSelectedIdentityResult,
): Level2DamageSpellSelectedIdentityProjection {
  return { lastResult };
}

function selectedSpellBattle(spell: SpellRecord): BattleState {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
}

function selectedSpellRecord(unitId: Level2DamageSpellUnitId): SpellRecord {
  if (unitId === dragonsBreathUnitId) {
    return decodedSpellRecord(dragonsBreathInput, unitId);
  }
  if (unitId === rayOfEnfeeblementUnitId) {
    return decodedSpellRecord(rayOfEnfeeblementInput, unitId);
  }
  return spellRecord(unitId);
}

function decodedSpellRecord(
  input: unknown,
  unitId: Level2DamageSpellUnitId,
): SpellRecord {
  const unit = decodeUnitRecordSync(input);
  if (unit.kind !== "spell" || unit.id !== unitId) {
    throw new Error(`Expected ${unitId} spell record.`);
  }
  return unit;
}
