import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { requireCharacterSpellProcedureRefForTest } from "./battle-runtime.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH aid barkskin blur continual_flame enhance_ability enlarge_reduce magic_weapon mirror_image pass_without_trace warding_bond
// UNIT-IDENTITY-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH aid doDiscoverAidHitPointBuff
// UNIT-IDENTITY-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH barkskin doDiscoverBarkskinArmorClassFloor
// UNIT-IDENTITY-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH blur doDiscoverBlurAttackRollDefense
// UNIT-IDENTITY-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH continual_flame doDiscoverContinualFlameObjectLight
// UNIT-IDENTITY-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH enhance_ability doDiscoverEnhanceAbilityRollModifier doResolveEnhanceAbilityHigherSlotPerTarget
// UNIT-IDENTITY-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH enlarge_reduce doDiscoverEnlargeReduceSizeIncrease
// UNIT-IDENTITY-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH magic_weapon doDiscoverMagicWeaponEnhancement
// UNIT-IDENTITY-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH mirror_image doDiscoverMirrorImageHitInterception
// UNIT-IDENTITY-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH pass_without_trace doDiscoverPassWithoutTraceStealthModifier
// UNIT-IDENTITY-REPLAY: B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH warding_bond doDiscoverWardingBondLinkedEffect
import type { SpellRecord } from "@dnd/surface/surface/types";
import { expect } from "vitest";

import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import type { BattleRuntimeSession } from "./index.ts";
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
  spellTargetId,
  wardingBondUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  spellAct,
  spellTargetListFill,
  targetAbilityChoicesFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  combatantId,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";

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
  | "enhanceAbilityHigherSlotPerTarget"
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
const enhanceAbilitySecondTargetId = combatantId(
  "level2-protection-selected-enhance-ability-second-target",
);

const LEVEL2_PROTECTION_SPELL_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  AidHitPointBuff: "aidHitPointBuff",
  BarkskinArmorClassFloor: "barkskinArmorClassFloor",
  BlurAttackRollDefense: "blurAttackRollDefense",
  ContinualFlameObjectLight: "continualFlameObjectLight",
  EnhanceAbilityRollModifier: "enhanceAbilityRollModifier",
  EnhanceAbilityHigherSlotPerTarget: "enhanceAbilityHigherSlotPerTarget",
  EnlargeReduceSizeIncrease: "enlargeReduceSizeIncrease",
  MagicWeaponEnhancement: "magicWeaponEnhancement",
  MirrorImageHitInterception: "mirrorImageHitInterception",
  PassWithoutTraceStealthModifier: "passWithoutTraceStealthModifier",
  WardingBondLinkedEffect: "wardingBondLinkedEffect",
} as const satisfies Readonly<
  Record<string, Level2ProtectionSpellSelectedIdentityResult>
>;

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Level 2 protection spell selected identity replay",
  taskId: "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-level2-protection-spell-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult:
      LEVEL2_PROTECTION_SPELL_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: { lastResult: "variant" },
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
        {
          actionName: "doResolveEnhanceAbilityHigherSlotPerTarget",
          discover: resolveEnhanceAbilityHigherSlotPerTarget,
        },
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
          session: state,
          spellId: input.spellId,
          slotLevel: 2,
        })
      : spellAct({
          session: state,
          spellId: input.spellId,
          slotLevel: 2,
        });

  expect({
    ...act.subject,
    invocation: battleActSpellPresentation(act)?.invocation,
  }).toMatchObject({
    tag: input.actionTag,
    actorId: spellCasterId,
    invocation: spellSlotInvocationRef(input.spellId, 2, input.procedure),
    mode: { tag: "cast" },
  });
  return expectedProjection(input.result);
}

function resolveEnhanceAbilityHigherSlotPerTarget(): Level2ProtectionSpellSelectedIdentityProjection {
  const spell = selectedSpellRecord(enhanceAbilityUnitId);
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 3, count: 1 }],
    extraTargetIds: [enhanceAbilitySecondTargetId],
  });
  const act = spellAct({
    session: state,
    spellId: enhanceAbilityUnitId,
    slotLevel: 3,
  });
  expect({
    ...act.subject,
    invocation: battleActSpellPresentation(act)?.invocation,
  }).toMatchObject({
    tag: "actionSpell",
    actorId: spellCasterId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      state,
      spellCasterId,
      spellSlotInvocationRef(enhanceAbilityUnitId, 3, "rollModifier"),
    ),
    mode: { tag: "cast" },
  });
  const targetList = requireHole(act.initialHoles, "spellTargetList");
  const abilityByTarget = requireHole(act.initialHoles, "targetAbilityChoices");
  const result = resolveBattleSubject({
    state: state.state,
    subject: act.subject,
    fills: [
      spellTargetListFill(targetList, spellCasterId, enhanceAbilityUnitId, [
        spellTargetId,
        enhanceAbilitySecondTargetId,
      ]),
      targetAbilityChoicesFill(abilityByTarget, [
        { targetId: spellTargetId, ability: "dex" },
        { targetId: enhanceAbilitySecondTargetId, ability: "wis" },
      ]),
    ],
  });
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error("Expected Enhance Ability higher-slot replay to resolve.");
  }
  expect(
    requireCombatant(result.state, spellTargetId).activeEffects,
  ).toContainEqual(
    expect.objectContaining({
      kind: "abilityCheckRollMode",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(enhanceAbilityUnitId),
      ),
      ability: "dex",
    }),
  );
  expect(
    requireCombatant(result.state, enhanceAbilitySecondTargetId).activeEffects,
  ).toContainEqual(
    expect.objectContaining({
      kind: "abilityCheckRollMode",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(enhanceAbilityUnitId),
      ),
      ability: "wis",
    }),
  );
  const caster = requireCombatant(result.state, spellCasterId);
  expect(caster.origin.kind).toBe("character");
  if (caster.origin.kind !== "character") {
    throw new Error(
      "Expected selected Enhance Ability caster to be a character.",
    );
  }
  expect(caster.origin.spellcasting?.spellSlots).toEqual([
    { spellLevel: 3, count: 1, expended: 1 },
  ]);
  return expectedProjection("enhanceAbilityHigherSlotPerTarget");
}

function expectedProjection(
  lastResult: Level2ProtectionSpellSelectedIdentityResult,
): Level2ProtectionSpellSelectedIdentityProjection {
  return { lastResult };
}

function selectedSpellBattle(spell: SpellRecord): BattleRuntimeSession {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
}

function selectedSpellRecord(unitId: Level2ProtectionSpellUnitId): SpellRecord {
  if (!level2ProtectionSpellUnitIds.some((candidate) => candidate === unitId)) {
    throw new Error(`Expected selected level 2 protection spell id ${unitId}.`);
  }
  return spellRecord(unitId);
}
