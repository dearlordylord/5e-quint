// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH alter_self fly misty_step spider_climb
// UNIT-IDENTITY-MBT-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH alter_self doDiscoverAlterSelfTransformationMode
// UNIT-IDENTITY-MBT-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH fly doDiscoverFlySpeedGrant
// UNIT-IDENTITY-MBT-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH misty_step doDiscoverMistyStepSelfTeleport
// UNIT-IDENTITY-MBT-REPLAY: B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH spider_climb doDiscoverSpiderClimbSpeedGrant
import { expect } from "vitest";

import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  alterSelfUnitId,
  flyUnitId,
  mistyStepUnitId,
  spellCasterId,
  spiderClimbUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { spellSlotInvocationRef } from "./unit-profile-admission-test-support.ts";

type SpellActionTag = "actionSpell" | "bonusActionSpell";

function discoverInvocation(input: {
  readonly spellId: string;
  readonly actionTag: SpellActionTag;
  readonly slotLevel: 2 | 3;
  readonly procedure: Parameters<typeof spellSlotInvocationRef>[2];
}): void {
  const spell = spellRecord(input.spellId);
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: input.slotLevel, count: 1 }],
  });
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
}

defineSelectedIdentityWitness({
  describeLabel: "Level 2 mobility spell selected identity MBT",
  taskId: "B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-level2-mobility-spell-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioResult" },
  projectionSchema: { lastResult: "str" },
  initialProjection: { lastResult: "init" },
  units: [
    {
      unitId: alterSelfUnitId,
      procedures: [
        {
          actionName: "doDiscoverAlterSelfTransformationMode",
          projectionAfter: { lastResult: "alterSelfTransformationMode" },
          discover: () => {
            discoverInvocation({
              spellId: alterSelfUnitId,
              actionTag: "actionSpell",
              slotLevel: 2,
              procedure: "selfTransformationMode",
            });
          },
        },
      ],
    },
    {
      unitId: flyUnitId,
      procedures: [
        {
          actionName: "doDiscoverFlySpeedGrant",
          projectionAfter: { lastResult: "flySpeedGrant" },
          discover: () => {
            discoverInvocation({
              spellId: flyUnitId,
              actionTag: "actionSpell",
              slotLevel: 3,
              procedure: "scalarBuff",
            });
          },
        },
      ],
    },
    {
      unitId: mistyStepUnitId,
      procedures: [
        {
          actionName: "doDiscoverMistyStepSelfTeleport",
          projectionAfter: { lastResult: "mistyStepSelfTeleport" },
          discover: () => {
            discoverInvocation({
              spellId: mistyStepUnitId,
              actionTag: "bonusActionSpell",
              slotLevel: 2,
              procedure: "selfTeleport",
            });
          },
        },
      ],
    },
    {
      unitId: spiderClimbUnitId,
      procedures: [
        {
          actionName: "doDiscoverSpiderClimbSpeedGrant",
          projectionAfter: { lastResult: "spiderClimbSpeedGrant" },
          discover: () => {
            discoverInvocation({
              spellId: spiderClimbUnitId,
              actionTag: "actionSpell",
              slotLevel: 2,
              procedure: "scalarBuff",
            });
          },
        },
      ],
    },
  ],
});
