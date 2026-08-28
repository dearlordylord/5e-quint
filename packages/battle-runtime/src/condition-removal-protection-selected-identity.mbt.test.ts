import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleStateWithAllocatedEffectOccurrencesForTest } from "./battle-runtime.test-support.ts";
import { resolveBattleSubject } from "./battle-runtime.test-support.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY lesser_restoration protection_from_poison
// UNIT-IDENTITY-REPLAY: RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY lesser_restoration doResolveLesserRestorationChoice doResolveLesserRestorationConcentrationCleanup
// UNIT-IDENTITY-REPLAY: RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY protection_from_poison doResolveProtectionFromPoison
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";
import type {
  BattleActiveEffect,
  BattleProcedureExecutionRef,
} from "./index.ts";
import { snapshotBattle } from "./index.ts";
import {
  holdPersonDurationTicks,
  holdPersonUnitId,
  lesserRestorationUnitId,
  protectionFromPoisonUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  bonusSpellAct,
  spellAct,
  spellConditionChoiceFill,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  applyCondition,
  battleCreatureStateWithKnockOutPreservedConditions,
  elapsedTimeTicks,
  hasCondition,
  type BattleState,
} from "./unit-profile-admission.test-support.ts";
import {
  battleProcedureExecutionCursor,
  battleProcedureExecutionRef,
} from "./identity.ts";
import type { UnitFeatureProcedureExecution } from "./character-execution-admission.ts";
import { NonNegativeInteger, difficultyClass } from "@dnd/shared/types";

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

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Condition removal and protection selected identity replay",
  taskId: "RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-condition-removal-protection-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult:
      CONDITION_REMOVAL_PROTECTION_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
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
          discover: () =>
            projectConditionRemovalProtectionSelectedIdentityState(
              resolveLesserRestorationChoiceBattle(),
              "lesserRestorationChoice",
            ),
        },
        {
          actionName: "doResolveLesserRestorationConcentrationCleanup",
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
          discover: () => {
            const resolved = resolveProtectionFromPoisonBattle();
            return projectConditionRemovalProtectionSelectedIdentityState(
              resolved.state,
              "protectionFromPoison",
              resolved.protectionProcedureRef,
            );
          },
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
  const session = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 2 }],
  });
  // This choice-removal scenario starts at an explicitly low-level active
  // condition boundary. It does not claim admitted spell-cast history for the
  // conditions that Lesser Restoration is asked to distinguish.
  const syntheticParalysis = stateWithLowLevelSyntheticProcedureForTest(
    session.state,
    spellCasterId,
  );
  const syntheticPoison = stateWithLowLevelSyntheticProcedureForTest(
    syntheticParalysis.state,
    spellCasterId,
  );
  const paralyzedEffect = {
    kind: "spellConditionEndTurnSave" as const,
    sourceProcedureRef: syntheticParalysis.procedureRef,
    sourceCombatantId: spellCasterId,
    condition: "paralyzed" as const,
    conditionHadNonSpellSource: false,
    heightenedSpellTargetDisadvantage: null,
    save: {
      ability: "wis" as const,
      dc: { kind: "fixed" as const, dc: difficultyClass(11) },
    },
    expiresAt: {
      kind: "duration" as const,
      durationTicks: elapsedTimeTicks(10),
    },
  };
  const poisonedEffect = {
    kind: "spellCondition" as const,
    sourceProcedureRef: syntheticPoison.procedureRef,
    sourceCombatantId: spellCasterId,
    condition: "poisoned" as const,
    conditionHadNonSpellSource: false,
    escape: null,
    turnStartDamage: null,
    expiresAt: {
      kind: "duration" as const,
      durationTicks: elapsedTimeTicks(10),
    },
  };
  const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
    state: syntheticPoison.state,
    occurrences: [
      {
        kind: "activeEffect",
        ownerId: spellTargetId,
        effect: paralyzedEffect,
      },
      {
        kind: "activeEffect",
        ownerId: spellTargetId,
        effect: poisonedEffect,
      },
    ],
  });
  const target = requireCombatant(allocated.state, spellTargetId);
  const state: BattleState = {
    ...allocated.state,
    combatants: new Map(allocated.state.combatants).set(
      spellTargetId,
      battleCreatureStateWithKnockOutPreservedConditions(
        {
          ...target,
        },
        applyCondition(
          applyCondition(target.conditions, "paralyzed"),
          "poisoned",
        ),
      ),
    ),
  };
  const act = bonusSpellAct({
    session: battleRuntimeSessionForTest({ ...session, state }),
    spellId: lesserRestorationUnitId,
  });
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
  const session = spellBattle({
    preparedSpells: [spell, spellRecord(holdPersonUnitId)],
    spellSlots: [{ spellLevel: 2, count: 2 }],
  });
  const baseState = session.state;
  const holdPersonProcedureRef = spellAct({
    session,
    spellId: holdPersonUnitId,
    slotLevel: 2,
  }).subject.procedureRef;
  const paralyzedEffect = {
    kind: "spellConditionEndTurnSave" as const,
    sourceProcedureRef: holdPersonProcedureRef,
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
  const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
    state: baseState,
    occurrences: [
      {
        kind: "activeEffect",
        ownerId: spellTargetId,
        effect: paralyzedEffect,
      },
    ],
  });
  const caster = requireCombatant(allocated.state, spellCasterId);
  const target = requireCombatant(allocated.state, spellTargetId);
  const state: BattleState = {
    ...allocated.state,
    combatants: new Map(allocated.state.combatants)
      .set(spellCasterId, {
        ...caster,
        concentration: {
          sourceProcedureRef: holdPersonProcedureRef,
          effectKind: "spellEffect" as const,
        },
      })
      .set(
        spellTargetId,
        battleCreatureStateWithKnockOutPreservedConditions(
          {
            ...target,
          },
          applyCondition(target.conditions, "paralyzed"),
        ),
      ),
  };
  const act = bonusSpellAct({
    session: battleRuntimeSessionForTest({ ...session, state }),
    spellId: lesserRestorationUnitId,
  });
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

function resolveProtectionFromPoisonBattle(): {
  readonly state: BattleState;
  readonly protectionProcedureRef: BattleProcedureExecutionRef;
} {
  const spell = spellRecord(protectionFromPoisonUnitId);
  const session = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  // The existing poison is a deliberately low-level condition-removal input;
  // Protection from Poison itself is still admitted and resolved below.
  const syntheticPoison = stateWithLowLevelSyntheticProcedureForTest(
    session.state,
    spellCasterId,
  );
  const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
    state: syntheticPoison.state,
    occurrences: [
      {
        kind: "activeEffect",
        ownerId: spellTargetId,
        effect: {
          kind: "spellCondition" as const,
          sourceProcedureRef: syntheticPoison.procedureRef,
          sourceCombatantId: spellCasterId,
          condition: "poisoned" as const,
          conditionHadNonSpellSource: true,
          escape: null,
          turnStartDamage: null,
          expiresAt: {
            kind: "duration" as const,
            durationTicks: elapsedTimeTicks(10),
          },
        },
      },
    ],
  });
  const target = requireCombatant(allocated.state, spellTargetId);
  const state: BattleState = {
    ...allocated.state,
    combatants: new Map(allocated.state.combatants).set(
      spellTargetId,
      battleCreatureStateWithKnockOutPreservedConditions(
        {
          ...target,
        },
        applyCondition(target.conditions, "poisoned"),
      ),
    ),
  };
  const act = spellAct({
    session: battleRuntimeSessionForTest({ ...session, state }),
    spellId: protectionFromPoisonUnitId,
    slotLevel: 2,
  });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const protectionProcedureRef = act.subject.procedureRef;
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
  return { state: resolved.state, protectionProcedureRef };
}

function projectConditionRemovalProtectionSelectedIdentityState(
  state: BattleState,
  lastResult: ConditionRemovalProtectionSelectedIdentityProjection["lastResult"],
  protectionProcedureRef?: BattleProcedureExecutionRef,
): ConditionRemovalProtectionSelectedIdentityProjection {
  const target = requireCombatant(state, spellTargetId);
  const caster = requireCombatant(state, spellCasterId);
  const snapshot = snapshotBattle(state);
  const poisonResistance = target.activeEffects.find(
    (effect) =>
      isProtectionFromPoisonResistance(effect) &&
      effect.sourceProcedureRef === protectionProcedureRef,
  );
  const poisonSaveAdvantage = target.activeEffects.find(
    (effect) =>
      isProtectionFromPoisonSaveAdvantage(effect) &&
      effect.sourceProcedureRef === protectionProcedureRef,
  );
  return {
    targetParalyzed: hasCondition(target.conditions, "paralyzed"),
    targetPoisoned: hasCondition(target.conditions, "poisoned"),
    targetEffectCount: target.activeEffects.length,
    casterConcentrating: caster.concentration !== null,
    targetHasPoisonResistance:
      protectionProcedureRef !== undefined && poisonResistance !== undefined,
    targetHasPoisonSaveAdvantage:
      protectionProcedureRef !== undefined && poisonSaveAdvantage !== undefined,
    secondLevelSlotsExpended: secondLevelSlotsExpended(caster),
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    bonusActionAvailable: snapshot.turn.bonusActionAvailable,
    lastResult,
  };
}

function stateWithLowLevelSyntheticProcedureForTest(
  state: BattleState,
  sourceCombatantId: typeof spellCasterId,
): {
  readonly state: BattleState;
  readonly procedureRef: BattleProcedureExecutionRef;
} {
  const source = requireCombatant(state, sourceCombatantId);
  if (source.origin.kind !== "character") {
    throw new Error("Expected a character source for the synthetic boundary.");
  }
  const ordinal = Number(source.origin.execution.nextProcedureOrdinal);
  const procedureRef = battleProcedureExecutionRef(
    source.origin.execution.scopeRef,
    NonNegativeInteger(ordinal),
  );
  return {
    procedureRef,
    state: {
      ...state,
      combatants: new Map(state.combatants).set(sourceCombatantId, {
        ...source,
        origin: {
          ...source.origin,
          execution: {
            ...source.origin.execution,
            nextProcedureOrdinal: battleProcedureExecutionCursor(ordinal + 1),
            procedureBindings: [
              ...source.origin.execution.procedureBindings,
              {
                procedureRef,
                procedure: {
                  kind: "unitFeature",
                  source: { kind: "intrinsic" },
                  execution: lowLevelSyntheticProcedureExecution(),
                },
              },
            ],
          },
        },
      }),
    },
  };
}

function lowLevelSyntheticProcedureExecution(): UnitFeatureProcedureExecution {
  return {
    kind: "passiveArmorClassBonus",
    armorClass: {
      bonus: 1,
      condition: {
        kind: "wearingArmor",
        categories: ["light", "medium", "heavy"],
      },
    },
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
  return effect.kind === "damageResistance" && effect.damageType === "poison";
}

function isProtectionFromPoisonSaveAdvantage(
  effect: BattleActiveEffect,
): effect is ConditionSavingThrowRollModeEffect {
  return (
    effect.kind === "conditionSavingThrowRollMode" &&
    effect.condition === "poisoned" &&
    effect.mode === "advantage"
  );
}
