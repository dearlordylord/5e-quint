// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY lesser_restoration protection_from_poison
// UNIT-IDENTITY-MBT-REPLAY: RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY lesser_restoration doResolveLesserRestorationChoice doResolveLesserRestorationConcentrationCleanup
// UNIT-IDENTITY-MBT-REPLAY: RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY protection_from_poison doResolveProtectionFromPoison
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import type { BattleActiveEffect } from "./index.ts";
import { resolveBattleSubject, snapshotBattle } from "./index.ts";
import {
  holdPersonDurationTicks,
  holdPersonUnitId,
  lesserRestorationUnitId,
  poisonSprayUnitId,
  protectionFromPoisonUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  spellAct,
  spellConditionChoiceFill,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  applyCondition,
  battleCreatureStateWithKnockOutPreservedConditions,
  elapsedTimeTicks,
  hasCondition,
  type BattleState,
} from "./unit-profile-admission-test-support.ts";

type ConditionRemovalProtectionSelectedIdentityProjection = {
  readonly targetParalyzed: boolean;
  readonly targetPoisoned: boolean;
  readonly targetEffectCount: number;
  readonly casterConcentrating: boolean;
  readonly targetHasPoisonResistance: boolean;
  readonly targetHasPoisonSaveAdvantage: boolean;
  readonly secondLevelSlotsExpended: number;
  readonly actionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly lastResult:
    | "init"
    | "lesserRestorationChoice"
    | "lesserRestorationConcentration"
    | "protectionFromPoison";
};

const CONDITION_REMOVAL_PROTECTION_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  LesserRestorationChoice: "lesserRestorationChoice",
  LesserRestorationConcentration: "lesserRestorationConcentration",
  ProtectionFromPoison: "protectionFromPoison",
} as const;

type DamageResistanceEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "damageResistance" }
>;
type ConditionSavingThrowRollModeEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "conditionSavingThrowRollMode" }
>;

defineSelectedIdentityWitness({
  describeLabel: "Condition removal and protection selected identity MBT",
  taskId: "RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-condition-removal-protection-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: { lastResult: CONDITION_REMOVAL_PROTECTION_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG },
  projectionSchema: {
    targetParalyzed: "bool",
    targetPoisoned: "bool",
    targetEffectCount: "int",
    casterConcentrating: "bool",
    targetHasPoisonResistance: "bool",
    targetHasPoisonSaveAdvantage: "bool",
    secondLevelSlotsExpended: "int",
    actionAvailable: "bool",
    bonusActionAvailable: "bool",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: lesserRestorationUnitId,
      procedures: [
        {
          actionName: "doResolveLesserRestorationChoice",
          projectionAfter: expectedProjection({
            targetPoisoned: true,
            targetEffectCount: 1,
            secondLevelSlotsExpended: 1,
            bonusActionAvailable: false,
            lastResult: "lesserRestorationChoice",
          }),
          discover: () =>
            projectConditionRemovalProtectionSelectedIdentityState(
              resolveLesserRestorationChoiceBattle(),
              "lesserRestorationChoice",
            ),
        },
        {
          actionName: "doResolveLesserRestorationConcentrationCleanup",
          projectionAfter: expectedProjection({
            secondLevelSlotsExpended: 1,
            bonusActionAvailable: false,
            lastResult: "lesserRestorationConcentration",
          }),
          discover: () =>
            projectConditionRemovalProtectionSelectedIdentityState(
              resolveLesserRestorationConcentrationCleanupBattle(),
              "lesserRestorationConcentration",
            ),
        },
      ],
    },
    {
      unitId: protectionFromPoisonUnitId,
      procedures: [
        {
          actionName: "doResolveProtectionFromPoison",
          projectionAfter: expectedProjection({
            targetEffectCount: 2,
            targetHasPoisonResistance: true,
            targetHasPoisonSaveAdvantage: true,
            secondLevelSlotsExpended: 1,
            actionAvailable: false,
            lastResult: "protectionFromPoison",
          }),
          discover: () =>
            projectConditionRemovalProtectionSelectedIdentityState(
              resolveProtectionFromPoisonBattle(),
              "protectionFromPoison",
            ),
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<ConditionRemovalProtectionSelectedIdentityProjection> = {},
): ConditionRemovalProtectionSelectedIdentityProjection {
  return {
    targetParalyzed: false,
    targetPoisoned: false,
    targetEffectCount: 0,
    casterConcentrating: false,
    targetHasPoisonResistance: false,
    targetHasPoisonSaveAdvantage: false,
    secondLevelSlotsExpended: 0,
    actionAvailable: true,
    bonusActionAvailable: true,
    lastResult: "init",
    ...overrides,
  };
}

function resolveLesserRestorationChoiceBattle(): BattleState {
  const spell = spellRecord(lesserRestorationUnitId);
  const baseState = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const target = requireCombatant(baseState, spellTargetId);
  const paralyzedEffect = {
    kind: "spellConditionEndTurnSave" as const,
    sourceSpellId: holdPersonUnitId,
    sourceCombatantId: spellCasterId,
    condition: "paralyzed" as const,
    conditionHadNonSpellSource: false,
    heightenedSpellTargetDisadvantage: null,
    save: {
      ability: "wis" as const,
      dc: { kind: "caster_spell_save_dc" as const },
    },
    expiresAt: {
      kind: "duration" as const,
      durationTicks: elapsedTimeTicks(10),
    },
  };
  const poisonedEffect = {
    kind: "spellConditionEndTurnSave" as const,
    sourceSpellId: "synthetic_poison_spell",
    sourceCombatantId: spellCasterId,
    condition: "poisoned" as const,
    conditionHadNonSpellSource: false,
    heightenedSpellTargetDisadvantage: null,
    save: {
      ability: "con" as const,
      dc: { kind: "caster_spell_save_dc" as const },
    },
    expiresAt: {
      kind: "duration" as const,
      durationTicks: elapsedTimeTicks(10),
    },
  };
  const state: BattleState = {
    ...baseState,
    combatants: new Map(baseState.combatants).set(
      spellTargetId,
      battleCreatureStateWithKnockOutPreservedConditions(
        {
          ...target,
          activeEffects: [
            ...target.activeEffects,
            paralyzedEffect,
            poisonedEffect,
          ],
        },
        applyCondition(
          applyCondition(target.conditions, "paralyzed"),
          "poisoned",
        ),
      ),
    ),
  };
  const act = bonusSpellAct({ state, spellId: lesserRestorationUnitId });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const conditionHole = requireHole(act.initialHoles, "conditionChoice");
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellTargetFill(
        targetHole,
        lesserRestorationUnitId,
        spellCasterId,
        spellTargetId,
      ),
      spellConditionChoiceFill(conditionHole, "paralyzed"),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(
      `Expected Lesser Restoration choice battle to resolve, got ${resolved.tag}.`,
    );
  }
  return resolved.state;
}

function resolveLesserRestorationConcentrationCleanupBattle(): BattleState {
  const spell = spellRecord(lesserRestorationUnitId);
  const baseState = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const caster = requireCombatant(baseState, spellCasterId);
  const target = requireCombatant(baseState, spellTargetId);
  const paralyzedEffect = {
    kind: "spellConditionEndTurnSave" as const,
    sourceSpellId: holdPersonUnitId,
    sourceCombatantId: spellCasterId,
    condition: "paralyzed" as const,
    conditionHadNonSpellSource: false,
    heightenedSpellTargetDisadvantage: null,
    save: {
      ability: "wis" as const,
      dc: { kind: "caster_spell_save_dc" as const },
    },
    expiresAt: {
      kind: "concentration" as const,
      combatantId: spellCasterId,
      durationTicks: holdPersonDurationTicks,
    },
  };
  const state: BattleState = {
    ...baseState,
    combatants: new Map(baseState.combatants)
      .set(spellCasterId, {
        ...caster,
        concentration: {
          sourceSpellId: holdPersonUnitId,
          effectKind: "spellEffect" as const,
        },
      })
      .set(
        spellTargetId,
        battleCreatureStateWithKnockOutPreservedConditions(
          {
            ...target,
            activeEffects: [...target.activeEffects, paralyzedEffect],
          },
          applyCondition(target.conditions, "paralyzed"),
        ),
      ),
  };
  const act = bonusSpellAct({ state, spellId: lesserRestorationUnitId });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const conditionHole = requireHole(act.initialHoles, "conditionChoice");
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellTargetFill(
        targetHole,
        lesserRestorationUnitId,
        spellCasterId,
        spellTargetId,
      ),
      spellConditionChoiceFill(conditionHole, "paralyzed"),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(
      `Expected Lesser Restoration concentration cleanup to resolve, got ${resolved.tag}.`,
    );
  }
  return resolved.state;
}

function resolveProtectionFromPoisonBattle(): BattleState {
  const spell = spellRecord(protectionFromPoisonUnitId);
  const baseState = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const target = requireCombatant(baseState, spellTargetId);
  const state: BattleState = {
    ...baseState,
    combatants: new Map(baseState.combatants).set(
      spellTargetId,
      battleCreatureStateWithKnockOutPreservedConditions(
        {
          ...target,
          activeEffects: [
            ...target.activeEffects,
            {
              kind: "spellCondition" as const,
              sourceSpellId: poisonSprayUnitId,
              sourceCombatantId: spellCasterId,
              condition: "poisoned" as const,
              conditionHadNonSpellSource: true,
              escape: null,
              turnStartDamage: null,
              expiresAt: {
                kind: "duration" as const,
                durationTicks: elapsedTimeTicks(600),
              },
            },
          ],
        },
        applyCondition(target.conditions, "poisoned"),
      ),
    ),
  };
  const act = spellAct({
    state,
    spellId: protectionFromPoisonUnitId,
    slotLevel: 2,
  });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellTargetFill(
        targetHole,
        protectionFromPoisonUnitId,
        spellCasterId,
        spellTargetId,
      ),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(
      `Expected Protection from Poison battle to resolve, got ${resolved.tag}.`,
    );
  }
  return resolved.state;
}

function projectConditionRemovalProtectionSelectedIdentityState(
  state: BattleState,
  lastResult: ConditionRemovalProtectionSelectedIdentityProjection["lastResult"],
): ConditionRemovalProtectionSelectedIdentityProjection {
  const target = requireCombatant(state, spellTargetId);
  const caster = requireCombatant(state, spellCasterId);
  const snapshot = snapshotBattle(state);
  return {
    targetParalyzed: hasCondition(target.conditions, "paralyzed"),
    targetPoisoned: hasCondition(target.conditions, "poisoned"),
    targetEffectCount: target.activeEffects.length,
    casterConcentrating: caster.concentration !== null,
    targetHasPoisonResistance: target.activeEffects.some(
      isProtectionFromPoisonResistance,
    ),
    targetHasPoisonSaveAdvantage: target.activeEffects.some(
      isProtectionFromPoisonSaveAdvantage,
    ),
    secondLevelSlotsExpended: secondLevelSlotsExpended(caster),
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    bonusActionAvailable: snapshot.turn.bonusActionAvailable,
    lastResult,
  };
}

function secondLevelSlotsExpended(
  caster: ReturnType<typeof requireCombatant>,
): number {
  if (caster.origin.kind !== "character") {
    throw new Error(
      "Expected condition removal/protection caster to be a character.",
    );
  }
  return Number(
    caster.origin.spellcasting?.spellSlots.find(
      (slot) => Number(slot.spellLevel) === 2,
    )?.expended ?? 0,
  );
}

function isProtectionFromPoisonResistance(
  effect: BattleActiveEffect,
): effect is DamageResistanceEffect {
  return (
    effect.kind === "damageResistance" &&
    effect.sourceSpellId === protectionFromPoisonUnitId &&
    effect.damageType === "poison"
  );
}

function isProtectionFromPoisonSaveAdvantage(
  effect: BattleActiveEffect,
): effect is ConditionSavingThrowRollModeEffect {
  return (
    effect.kind === "conditionSavingThrowRollMode" &&
    effect.sourceSpellId === protectionFromPoisonUnitId &&
    effect.condition === "poisoned" &&
    effect.mode === "advantage"
  );
}
