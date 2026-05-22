// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY lesser_restoration protection_from_poison
// UNIT-IDENTITY-MBT-REPLAY: RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY lesser_restoration doResolveLesserRestorationChoice doResolveLesserRestorationConcentrationCleanup
// UNIT-IDENTITY-MBT-REPLAY: RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY protection_from_poison doResolveProtectionFromPoison
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

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

const conditionRemovalProtectionSelectedIdentityDriverSchema = {
  init: {},
  doResolveLesserRestorationChoice: {},
  doResolveLesserRestorationConcentrationCleanup: {},
  doResolveProtectionFromPoison: {},
  step: {},
} as const;
type ConditionRemovalProtectionSelectedIdentityDriverAction = Exclude<
  keyof typeof conditionRemovalProtectionSelectedIdentityDriverSchema,
  "init" | "step"
>;

const conditionRemovalProtectionUnitIds = [
  "lesser_restoration",
  "protection_from_poison",
] as const;
type ConditionRemovalProtectionUnitId =
  (typeof conditionRemovalProtectionUnitIds)[number];

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
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions:
    readonly ConditionRemovalProtectionSelectedIdentityDriverAction[];
  readonly expected: ConditionRemovalProtectionSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY";
  readonly unitId: ConditionRemovalProtectionUnitId;
  readonly actions:
    readonly ConditionRemovalProtectionSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type DamageResistanceEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "damageResistance" }
>;
type ConditionSavingThrowRollModeEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "conditionSavingThrowRollMode" }
>;

const selectedUnitIdentityReplays = [
  {
    taskId: "RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY",
    unitId: "lesser_restoration",
    actions: [
      "doResolveLesserRestorationChoice",
      "doResolveLesserRestorationConcentrationCleanup",
    ],
    sequences: [
      {
        name: "chosen-condition-removal-preserves-unchosen-poisoned-source",
        actions: ["doResolveLesserRestorationChoice"],
        expected: expectedProjection({
          targetPoisoned: true,
          targetEffectCount: 1,
          secondLevelSlotsExpended: 1,
          bonusActionAvailable: false,
          lastResult: "lesserRestorationChoice",
        }),
      },
      {
        name: "removing-last-concentration-condition-clears-caster-lock",
        actions: ["doResolveLesserRestorationConcentrationCleanup"],
        expected: expectedProjection({
          secondLevelSlotsExpended: 1,
          bonusActionAvailable: false,
          lastResult: "lesserRestorationConcentration",
        }),
      },
    ],
  },
  {
    taskId: "RKBC-SPELL-DIRECT-CONDITION-REMOVAL-PARITY",
    unitId: "protection_from_poison",
    actions: ["doResolveProtectionFromPoison"],
    sequences: [
      {
        name: "poisoned-removal-plus-poison-protection-effects",
        actions: ["doResolveProtectionFromPoison"],
        expected: expectedProjection({
          targetEffectCount: 2,
          targetHasPoisonResistance: true,
          targetHasPoisonSaveAdvantage: true,
          secondLevelSlotsExpended: 1,
          actionAvailable: false,
          lastResult: "protectionFromPoison",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Condition removal and protection selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<ConditionRemovalProtectionSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver =
          createConditionRemovalProtectionSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing condition removal/protection driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Condition removal/protection selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-condition-removal-protection-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createConditionRemovalProtectionSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: conditionRemovalProtectionSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createConditionRemovalProtectionSelectedIdentityDriver() {
  return defineDriver(
    conditionRemovalProtectionSelectedIdentityDriverSchema,
    () => {
      let state = spellBattle({ spellSlots: [] });
      let lastResult: ConditionRemovalProtectionSelectedIdentityProjection["lastResult"] =
        "init";

      function reset(): void {
        state = spellBattle({ spellSlots: [] });
        lastResult = "init";
      }

      function recordResolvedResult(
        nextState: BattleState,
        result: ConditionRemovalProtectionSelectedIdentityProjection["lastResult"],
      ): void {
        state = nextState;
        lastResult = result;
      }

      return {
        init: reset,
        doResolveLesserRestorationChoice: () => {
          const resolved = resolveLesserRestorationChoiceBattle();
          recordResolvedResult(resolved, "lesserRestorationChoice");
        },
        doResolveLesserRestorationConcentrationCleanup: () => {
          const resolved =
            resolveLesserRestorationConcentrationCleanupBattle();
          recordResolvedResult(resolved, "lesserRestorationConcentration");
        },
        doResolveProtectionFromPoison: () => {
          const resolved = resolveProtectionFromPoisonBattle();
          recordResolvedResult(resolved, "protectionFromPoison");
        },
        step: () => {},
        getState: () =>
          projectConditionRemovalProtectionSelectedIdentityState(
            state,
            lastResult,
          ),
      };
    },
  );
}

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
    throw new Error("Expected condition removal/protection caster to be a character.");
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

function normalizeConditionRemovalProtectionSelectedIdentityQuintState(
  raw: unknown,
): ConditionRemovalProtectionSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    targetParalyzed: booleanField(state, "qTargetParalyzed"),
    targetPoisoned: booleanField(state, "qTargetPoisoned"),
    targetEffectCount: numberFromQuintInt(
      state["qTargetEffectCount"],
      "qTargetEffectCount",
    ),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    targetHasPoisonResistance: booleanField(
      state,
      "qTargetHasPoisonResistance",
    ),
    targetHasPoisonSaveAdvantage: booleanField(
      state,
      "qTargetHasPoisonSaveAdvantage",
    ),
    secondLevelSlotsExpended: numberFromQuintInt(
      state["qSecondLevelSlotsExpended"],
      "qSecondLevelSlotsExpended",
    ),
    actionAvailable: booleanField(state, "qActionAvailable"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    lastResult: mbtLastResult(state["qLastResult"]),
  };
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function mbtLastResult(
  raw: unknown,
): ConditionRemovalProtectionSelectedIdentityProjection["lastResult"] {
  if (
    raw === "init" ||
    raw === "lesserRestorationChoice" ||
    raw === "lesserRestorationConcentration" ||
    raw === "protectionFromPoison"
  ) {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const conditionRemovalProtectionSelectedIdentityStateCheck = stateCheck(
  normalizeConditionRemovalProtectionSelectedIdentityQuintState,
  (
    spec: ConditionRemovalProtectionSelectedIdentityProjection,
    impl: ConditionRemovalProtectionSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
