// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH calm_emotions charm_person darkness enthrall gust_of_wind invisibility levitate see_invisibility spike_growth web
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH calm_emotions doDiscoverCalmEmotionsConditionImmunity
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH charm_person doDiscoverCharmPersonSaveGatedCondition
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH darkness doDiscoverDarknessPointOrigin
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH enthrall doDiscoverEnthrallPerceptionPenalty
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH gust_of_wind doDiscoverGustOfWindLine
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH invisibility doDiscoverInvisibilityDirectCondition
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH levitate doDiscoverLevitateCreature
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH see_invisibility doDiscoverSeeInvisibilityObserverSight
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH spike_growth doDiscoverSpikeGrowthMovementHazard
// UNIT-IDENTITY-MBT-REPLAY: B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH web doDiscoverWebRestraintHazard
import type { SpellRecord } from "@dnd/surface/surface/types";
import { expect } from "vitest";

import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import type { BattleState } from "./index.ts";
import {
  calmEmotionsUnitId,
  charmPersonUnitId,
  darknessUnitId,
  enthrallUnitId,
  gustOfWindUnitId,
  invisibilityUnitId,
  levitateUnitId,
  seeInvisibilityUnitId,
  spellCasterId,
  spikeGrowthUnitId,
  webUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { spellSlotInvocationRef } from "./unit-profile-admission-test-support.ts";

const level2ControlSpellUnitIds = [
  calmEmotionsUnitId,
  charmPersonUnitId,
  darknessUnitId,
  enthrallUnitId,
  gustOfWindUnitId,
  invisibilityUnitId,
  levitateUnitId,
  seeInvisibilityUnitId,
  spikeGrowthUnitId,
  webUnitId,
] as const;
type Level2ControlSpellUnitId = (typeof level2ControlSpellUnitIds)[number];
type Level2ControlSpellSelectedIdentityResult =
  | "init"
  | "calmEmotionsConditionImmunity"
  | "charmPersonSaveGatedCondition"
  | "darknessPointOrigin"
  | "enthrallPerceptionPenalty"
  | "gustOfWindLine"
  | "invisibilityDirectCondition"
  | "levitateCreature"
  | "seeInvisibilityObserverSight"
  | "spikeGrowthMovementHazard"
  | "webRestraintHazard";
type Level2ControlSpellSelectedIdentityProjection = {
  readonly lastResult: Level2ControlSpellSelectedIdentityResult;
};
type SelectedLevel2ControlSpellInvocation = {
  readonly spellId: Level2ControlSpellUnitId;
  readonly slotLevel: 1 | 2;
  readonly procedure: Parameters<typeof spellSlotInvocationRef>[2];
  readonly result: Exclude<Level2ControlSpellSelectedIdentityResult, "init">;
};

defineSelectedIdentityWitness({
  describeLabel: "Level 2 control spell selected identity MBT",
  taskId: "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-level2-control-spell-selected-identity.mbt.qnt",
  ),
  projectionSchema: { lastResult: "str" },
  initialProjection: expectedProjection("init"),
  units: [
    {
      unitId: calmEmotionsUnitId,
      procedures: [
        selectedSpellProcedure(
          "doDiscoverCalmEmotionsConditionImmunity",
          {
            spellId: calmEmotionsUnitId,
            slotLevel: 2,
            procedure: "saveGatedConditionImmunity",
            result: "calmEmotionsConditionImmunity",
          },
        ),
      ],
    },
    {
      unitId: charmPersonUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverCharmPersonSaveGatedCondition", {
          spellId: charmPersonUnitId,
          slotLevel: 2,
          procedure: "saveGatedCondition",
          result: "charmPersonSaveGatedCondition",
        }),
      ],
    },
    {
      unitId: darknessUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverDarknessPointOrigin", {
          spellId: darknessUnitId,
          slotLevel: 2,
          procedure: "magicalDarknessPointOrigin",
          result: "darknessPointOrigin",
        }),
      ],
    },
    {
      unitId: enthrallUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverEnthrallPerceptionPenalty", {
          spellId: enthrallUnitId,
          slotLevel: 2,
          procedure: "rollModifier",
          result: "enthrallPerceptionPenalty",
        }),
      ],
    },
    {
      unitId: gustOfWindUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverGustOfWindLine", {
          spellId: gustOfWindUnitId,
          slotLevel: 2,
          procedure: "gustOfWindLine",
          result: "gustOfWindLine",
        }),
      ],
    },
    {
      unitId: invisibilityUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverInvisibilityDirectCondition", {
          spellId: invisibilityUnitId,
          slotLevel: 2,
          procedure: "directCondition",
          result: "invisibilityDirectCondition",
        }),
      ],
    },
    {
      unitId: levitateUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverLevitateCreature", {
          spellId: levitateUnitId,
          slotLevel: 2,
          procedure: "levitatedCreature",
          result: "levitateCreature",
        }),
      ],
    },
    {
      unitId: seeInvisibilityUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverSeeInvisibilityObserverSight", {
          spellId: seeInvisibilityUnitId,
          slotLevel: 2,
          procedure: "seeInvisibleObserverSight",
          result: "seeInvisibilityObserverSight",
        }),
      ],
    },
    {
      unitId: spikeGrowthUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverSpikeGrowthMovementHazard", {
          spellId: spikeGrowthUnitId,
          slotLevel: 2,
          procedure: "spikeGrowthMovementHazard",
          result: "spikeGrowthMovementHazard",
        }),
      ],
    },
    {
      unitId: webUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverWebRestraintHazard", {
          spellId: webUnitId,
          slotLevel: 2,
          procedure: "webRestraintHazard",
          result: "webRestraintHazard",
        }),
      ],
    },
  ],
});

function selectedSpellProcedure(
  actionName: `do${string}`,
  input: SelectedLevel2ControlSpellInvocation,
) {
  return {
    actionName,
    projectionAfter: expectedProjection(input.result),
    discover: () => recordDiscoveredInvocation(input),
  };
}

function recordDiscoveredInvocation(
  input: SelectedLevel2ControlSpellInvocation,
): Level2ControlSpellSelectedIdentityProjection {
  const spell = selectedSpellRecord(input.spellId);
  const state = selectedSpellBattle(spell, input.slotLevel);
  const act = spellAct({
    state,
    spellId: input.spellId,
    slotLevel: input.slotLevel,
  });

  expect(act.subject).toEqual({
    tag: "actionSpell",
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
  lastResult: Level2ControlSpellSelectedIdentityResult,
): Level2ControlSpellSelectedIdentityProjection {
  return { lastResult };
}

function selectedSpellBattle(
  spell: SpellRecord,
  slotLevel: 1 | 2,
): BattleState {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: slotLevel, count: 1 }],
  });
}

function selectedSpellRecord(unitId: Level2ControlSpellUnitId): SpellRecord {
  if (!level2ControlSpellUnitIds.some((candidate) => candidate === unitId)) {
    throw new Error(`Expected selected level 2 control spell id ${unitId}.`);
  }
  return spellRecord(unitId);
}
