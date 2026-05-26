// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH aid barkskin blur continual_flame enhance_ability enlarge_reduce magic_weapon mirror_image pass_without_trace warding_bond
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH aid doDiscoverAidHitPointBuff
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH barkskin doDiscoverBarkskinArmorClassFloor
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH blur doDiscoverBlurAttackRollDefense
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH continual_flame doDiscoverContinualFlameObjectLight
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH enhance_ability doDiscoverEnhanceAbilityRollModifier
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH enlarge_reduce doDiscoverEnlargeReduceSizeIncrease
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH magic_weapon doDiscoverMagicWeaponEnhancement
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH mirror_image doDiscoverMirrorImageHitInterception
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH pass_without_trace doDiscoverPassWithoutTraceStealthModifier
// UNIT-IDENTITY-MBT-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH warding_bond doDiscoverWardingBondLinkedEffect
import * as path from "node:path";

import type { SpellRecord } from "@dnd/surface/surface/types";
import { expect } from "vitest";

import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import type { BattleState } from "./index.ts";
import {
  aidUnitId,
  barkskinUnitId,
  blurUnitId,
  continualFlameUnitId,
  enhanceAbilityUnitId,
  enlargeReduceUnitId,
  magicWeaponUnitId,
  mirrorImageUnitId,
  passWithoutTraceUnitId,
  spellCasterId,
  wardingBondUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { spellSlotInvocationRef } from "./unit-profile-admission-test-support.ts";

const level2ProtectionSpellUnitIds = [
  aidUnitId,
  barkskinUnitId,
  blurUnitId,
  continualFlameUnitId,
  enhanceAbilityUnitId,
  enlargeReduceUnitId,
  magicWeaponUnitId,
  mirrorImageUnitId,
  passWithoutTraceUnitId,
  wardingBondUnitId,
] as const;
type Level2ProtectionSpellUnitId =
  (typeof level2ProtectionSpellUnitIds)[number];
type Level2ProtectionSpellSelectedIdentityResult =
  | "init"
  | "aidHitPointBuff"
  | "barkskinArmorClassFloor"
  | "blurAttackRollDefense"
  | "continualFlameObjectLight"
  | "enhanceAbilityRollModifier"
  | "enlargeReduceSizeIncrease"
  | "magicWeaponEnhancement"
  | "mirrorImageHitInterception"
  | "passWithoutTraceStealthModifier"
  | "wardingBondLinkedEffect";
type Level2ProtectionSpellSelectedIdentityProjection = {
  readonly lastResult: Level2ProtectionSpellSelectedIdentityResult;
};
type SpellActionTag = "actionSpell" | "bonusActionSpell";
type SelectedLevel2ProtectionSpellInvocation = {
  readonly spellId: Level2ProtectionSpellUnitId;
  readonly actionTag: SpellActionTag;
  readonly procedure: Parameters<typeof spellSlotInvocationRef>[2];
  readonly result: Exclude<Level2ProtectionSpellSelectedIdentityResult, "init">;
};

defineSelectedIdentityWitness({
  describeLabel: "Level 2 protection spell selected identity MBT",
  taskId: "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH",
  specFile: path.resolve(
    import.meta.dirname,
    "../battle-runtime-level2-protection-spell-selected-identity.mbt.qnt",
  ),
  projectionSchema: { lastResult: "str" },
  initialProjection: expectedProjection("init"),
  units: [
    {
      unitId: aidUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverAidHitPointBuff", {
          spellId: aidUnitId,
          actionTag: "actionSpell",
          procedure: "scalarBuff",
          result: "aidHitPointBuff",
        }),
      ],
    },
    {
      unitId: barkskinUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverBarkskinArmorClassFloor", {
          spellId: barkskinUnitId,
          actionTag: "bonusActionSpell",
          procedure: "scalarBuff",
          result: "barkskinArmorClassFloor",
        }),
      ],
    },
    {
      unitId: blurUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverBlurAttackRollDefense", {
          spellId: blurUnitId,
          actionTag: "actionSpell",
          procedure: "blurAttackRollDefense",
          result: "blurAttackRollDefense",
        }),
      ],
    },
    {
      unitId: continualFlameUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverContinualFlameObjectLight", {
          spellId: continualFlameUnitId,
          actionTag: "actionSpell",
          procedure: "objectLight",
          result: "continualFlameObjectLight",
        }),
      ],
    },
    {
      unitId: enhanceAbilityUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverEnhanceAbilityRollModifier", {
          spellId: enhanceAbilityUnitId,
          actionTag: "actionSpell",
          procedure: "rollModifier",
          result: "enhanceAbilityRollModifier",
        }),
      ],
    },
    {
      unitId: enlargeReduceUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverEnlargeReduceSizeIncrease", {
          spellId: enlargeReduceUnitId,
          actionTag: "actionSpell",
          procedure: "creatureSizeIncrease",
          result: "enlargeReduceSizeIncrease",
        }),
      ],
    },
    {
      unitId: magicWeaponUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverMagicWeaponEnhancement", {
          spellId: magicWeaponUnitId,
          actionTag: "bonusActionSpell",
          procedure: "magicWeaponEnhancement",
          result: "magicWeaponEnhancement",
        }),
      ],
    },
    {
      unitId: mirrorImageUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverMirrorImageHitInterception", {
          spellId: mirrorImageUnitId,
          actionTag: "actionSpell",
          procedure: "mirrorImageHitInterception",
          result: "mirrorImageHitInterception",
        }),
      ],
    },
    {
      unitId: passWithoutTraceUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverPassWithoutTraceStealthModifier", {
          spellId: passWithoutTraceUnitId,
          actionTag: "actionSpell",
          procedure: "rollModifier",
          result: "passWithoutTraceStealthModifier",
        }),
      ],
    },
    {
      unitId: wardingBondUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverWardingBondLinkedEffect", {
          spellId: wardingBondUnitId,
          actionTag: "actionSpell",
          procedure: "wardingBond",
          result: "wardingBondLinkedEffect",
        }),
      ],
    },
  ],
});

function selectedSpellProcedure(
  actionName: `do${string}`,
  input: SelectedLevel2ProtectionSpellInvocation,
) {
  return {
    actionName,
    projectionAfter: expectedProjection(input.result),
    discover: () => recordDiscoveredInvocation(input),
  };
}

function recordDiscoveredInvocation(
  input: SelectedLevel2ProtectionSpellInvocation,
): Level2ProtectionSpellSelectedIdentityProjection {
  const spell = selectedSpellRecord(input.spellId);
  const state = selectedSpellBattle(spell);
  const act =
    input.actionTag === "bonusActionSpell"
      ? bonusSpellAct({
          state,
          spellId: input.spellId,
          slotLevel: 2,
        })
      : spellAct({
          state,
          spellId: input.spellId,
          slotLevel: 2,
        });

  expect(act.subject).toEqual({
    tag: input.actionTag,
    actorId: spellCasterId,
    invocation: spellSlotInvocationRef(input.spellId, 2, input.procedure),
    mode: { tag: "cast" },
  });
  return expectedProjection(input.result);
}

function expectedProjection(
  lastResult: Level2ProtectionSpellSelectedIdentityResult,
): Level2ProtectionSpellSelectedIdentityProjection {
  return { lastResult };
}

function selectedSpellBattle(spell: SpellRecord): BattleState {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
}

function selectedSpellRecord(unitId: Level2ProtectionSpellUnitId): SpellRecord {
  if (!level2ProtectionSpellUnitIds.some((candidate) => candidate === unitId)) {
    throw new Error(
      `Expected selected level 2 protection spell id ${unitId}.`,
    );
  }
  return spellRecord(unitId);
}
