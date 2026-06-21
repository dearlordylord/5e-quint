// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-after-hit-damage spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save spell.invocation-after-hit-damage-illumination

import { describe, expect, it } from "vitest";

import type { BattleActiveEffect } from "./battle-reducer.ts";
import { breakBattleConcentration } from "./battle-reducer/damage-apply.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtPickSchemas,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintRecordField,
  quintStateRecord,
  quintVariantMappedValue,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  abilityCheckFill,
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  interruptDecisionFill,
  characterCreature,
  requireCombatant,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  divineSmiteUnitId,
  ensnaringStrikeUnitId,
  oppositionSide,
  partySide,
  searingSmiteUnitId,
  shiningSmiteUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { savingThrowOutcomeFill } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  paladinsSmiteResource,
  startBattleRight,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import {
  battleId,
  discoverBattleActs,
  endTurn,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";

const AFTER_HIT_SCENARIOS = [
  "divineSmiteSlot",
  "divineSmiteFreeCast",
  "ensnaringStrikeFailedSave",
  "ensnaringStrikeSuccessfulSave",
  "searingSmiteHit",
  "shiningSmiteHit",
  "done",
] as const;
type AfterHitScenario = (typeof AFTER_HIT_SCENARIOS)[number];

const AFTER_HIT_PHASES = [
  "fresh",
  "targetChoiceNeeded",
  "attackRollNeeded",
  "afterHitChoiceNeeded",
  "ensnaringSaveNeeded",
  "attackDamageNeeded",
  "afterDamage",
  "turnStartDamageNeeded",
  "turnStartDamageSaveNeeded",
  "escapeCheckNeeded",
  "cleaned",
] as const;
type AfterHitPhase = (typeof AFTER_HIT_PHASES)[number];

const AFTER_HIT_HOLES = [
  "TargetChoice",
  "AttackRoll",
  "InterruptDecision",
  "SaveOutcome",
  "AttackDamageRoll",
  "TurnStartDamageRoll",
  "TurnStartSaveOutcome",
  "EscapeAbilityCheck",
] as const;
type AfterHitHole = (typeof AFTER_HIT_HOLES)[number];

type AfterHitDamageRidersState = {
  readonly scenario: AfterHitScenario;
  readonly phase: AfterHitPhase;
  readonly targetHp: number;
  readonly bonusActionAvailable: boolean;
  readonly slotExpended: boolean;
  readonly freeCastUsesRemaining: number;
  readonly levelOnePlusCastCommitted: boolean;
  readonly concentrationActive: boolean;
  readonly targetRestrained: boolean;
  readonly searingBurning: boolean;
  readonly shiningIlluminated: boolean;
  readonly holes: readonly AfterHitHole[];
  readonly lastResult: "init" | "needsHoles" | "resolved" | "invalid";
};

type InterruptChoiceFill = Extract<
  Extract<
    Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
    { readonly kind: "resolve" }
  >["choice"],
  { readonly kind: "castAttackHitBonusActionSpell" }
>;

type PendingAfterHitChoice = {
  readonly invocation: InterruptChoiceFill["invocation"];
  readonly initialHoles: readonly BattleHole[];
};

type PendingInvocation =
  | { readonly tag: "none" }
  | {
      readonly tag: "targetChoice";
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
    }
  | {
      readonly tag: "attackRoll";
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
      readonly targetFill: Extract<
        BattleFill,
        { readonly kind: "targetChoice" }
      >;
    }
  | {
      readonly tag: "afterHitChoice";
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
      readonly targetFill: Extract<
        BattleFill,
        { readonly kind: "targetChoice" }
      >;
      readonly attackFill: Extract<BattleFill, { readonly kind: "attackRoll" }>;
      readonly interruptHole: Extract<
        BattleHole,
        { readonly kind: "interruptDecision" }
      >;
    }
  | {
      readonly tag: "ensnaringSave";
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
      readonly targetFill: Extract<
        BattleFill,
        { readonly kind: "targetChoice" }
      >;
      readonly attackFill: Extract<BattleFill, { readonly kind: "attackRoll" }>;
      readonly interruptHole: Extract<
        BattleHole,
        { readonly kind: "interruptDecision" }
      >;
      readonly choice: PendingAfterHitChoice;
    }
  | {
      readonly tag: "attackDamage";
      readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
      readonly targetFill: Extract<
        BattleFill,
        { readonly kind: "targetChoice" }
      >;
      readonly attackFill: Extract<BattleFill, { readonly kind: "attackRoll" }>;
      readonly riderDice: number;
    }
  | {
      readonly tag: "turnStartDamage";
      readonly sourceBattle: BattleState;
    }
  | {
      readonly tag: "turnStartDamageAndSave";
      readonly sourceBattle: BattleState;
    }
  | {
      readonly tag: "escapeCheck";
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "action"; readonly action: "escapeSpellRestraint" }
      >;
    };

type AfterHitRuntimeState = {
  readonly battle: BattleState;
  readonly scenario: AfterHitScenario;
  readonly phase: AfterHitPhase;
  readonly holes: readonly BattleHole[];
  readonly pending: PendingInvocation;
  readonly lastResult: "init" | "needsHoles" | "resolved";
};

const AFTER_HIT_SCENARIO_BY_TAG = {
  DivineSmiteSlot: "divineSmiteSlot",
  DivineSmiteFreeCast: "divineSmiteFreeCast",
  EnsnaringStrikeFailedSave: "ensnaringStrikeFailedSave",
  EnsnaringStrikeSuccessfulSave: "ensnaringStrikeSuccessfulSave",
  SearingSmiteHit: "searingSmiteHit",
  ShiningSmiteHit: "shiningSmiteHit",
  Done: "done",
} as const satisfies Readonly<Record<string, AfterHitScenario>>;

const AFTER_HIT_PHASE_BY_TAG = {
  Fresh: "fresh",
  TargetChoiceNeeded: "targetChoiceNeeded",
  AttackRollNeeded: "attackRollNeeded",
  AfterHitChoiceNeeded: "afterHitChoiceNeeded",
  EnsnaringSaveNeeded: "ensnaringSaveNeeded",
  AttackDamageNeeded: "attackDamageNeeded",
  AfterDamage: "afterDamage",
  TurnStartDamageNeeded: "turnStartDamageNeeded",
  TurnStartDamageSaveNeeded: "turnStartDamageSaveNeeded",
  EscapeCheckNeeded: "escapeCheckNeeded",
  Cleaned: "cleaned",
} as const satisfies Readonly<Record<string, AfterHitPhase>>;

const SPELL_FOR_SCENARIO = {
  divineSmiteSlot: divineSmiteUnitId,
  divineSmiteFreeCast: divineSmiteUnitId,
  ensnaringStrikeFailedSave: ensnaringStrikeUnitId,
  ensnaringStrikeSuccessfulSave: ensnaringStrikeUnitId,
  searingSmiteHit: searingSmiteUnitId,
  shiningSmiteHit: shiningSmiteUnitId,
} as const satisfies Readonly<
  Record<Exclude<AfterHitScenario, "done">, string>
>;

const SLOT_LEVEL_FOR_SCENARIO = {
  divineSmiteSlot: 1,
  divineSmiteFreeCast: 1,
  ensnaringStrikeFailedSave: 1,
  ensnaringStrikeSuccessfulSave: 1,
  searingSmiteHit: 3,
  shiningSmiteHit: 3,
} as const satisfies Readonly<
  Record<Exclude<AfterHitScenario, "done">, 1 | 2 | 3>
>;

const afterHitDriverSchema = {
  init: {},
  doDiscoverWeaponHit: {},
  doFillTargetChoice: {},
  doFillHitAttackRoll: {},
  doChooseDivineSmiteSlot: {},
  doChooseDivineSmiteFreeCast: {},
  doChooseEnsnaringStrike: {},
  doFillEnsnaringFailedSave: {},
  doFillEnsnaringSuccessfulSave: {},
  doChooseSearingSmite: {},
  doChooseShiningSmite: {},
  doFillDivineSmiteDamage: {
    weaponDiePip: mbtPickSchemas.int,
    smiteDiePip: mbtPickSchemas.int,
  },
  doFillEnsnaringWeaponDamage: {
    weaponDiePip: mbtPickSchemas.int,
  },
  doFillSearingSmiteDamage: {
    weaponDiePip: mbtPickSchemas.int,
    smiteDiePip: mbtPickSchemas.int,
  },
  doFillShiningSmiteDamage: {
    weaponDiePip: mbtPickSchemas.int,
    smiteDiePip: mbtPickSchemas.int,
  },
  doDiscoverEnsnaringStartTurnDamage: {},
  doFillEnsnaringStartTurnDamage: {
    damageDiePip: mbtPickSchemas.int,
  },
  doFillEnsnaringEscapeCheck: {},
  doDiscoverSearingStartTurnDamageAndSave: {},
  doFillSearingStartTurnDamageAndSave: {
    damageDiePip: mbtPickSchemas.int,
  },
  doBreakShiningConcentration: {},
  doStartDivineSmiteFreeCast: {},
  doStartEnsnaringFailedSave: {},
  doStartEnsnaringSuccessfulSave: {},
  doStartSearingSmite: {},
  doStartShiningSmite: {},
  doFinish: {},
  step: {},
} as const;
type AfterHitDriverAction = keyof typeof afterHitDriverSchema;

const REQUIRED_AFTER_HIT_ACTIONS = [
  "doFillDivineSmiteDamage",
  "doFillEnsnaringWeaponDamage",
  "doDiscoverEnsnaringStartTurnDamage",
  "doFillEnsnaringStartTurnDamage",
  "doFillEnsnaringEscapeCheck",
  "doFillSearingSmiteDamage",
  "doDiscoverSearingStartTurnDamageAndSave",
  "doFillSearingStartTurnDamageAndSave",
  "doChooseShiningSmite",
  "doFillShiningSmiteDamage",
  "doBreakShiningConcentration",
  "doFinish",
] as const satisfies ReadonlyArray<AfterHitDriverAction>;

function createAfterHitDamageRidersDriver(
  options: { readonly actionLog?: string[] } = {},
) {
  return defineDriver(afterHitDriverSchema, () => {
    let state = initialRuntimeState("divineSmiteSlot", "init");
    const transition = (
      action: AfterHitDriverAction,
      nextState: () => AfterHitRuntimeState,
    ): void => {
      state = nextState();
      if (action !== "step") {
        options.actionLog?.push(action);
      }
    };
    return {
      init: () => {
        state = initialRuntimeState("divineSmiteSlot", "init");
      },
      doDiscoverWeaponHit: () => {
        transition("doDiscoverWeaponHit", () => discoverWeaponHit(state));
      },
      doFillTargetChoice: () => {
        transition("doFillTargetChoice", () => fillTargetChoice(state));
      },
      doFillHitAttackRoll: () => {
        transition("doFillHitAttackRoll", () => fillHitAttackRoll(state));
      },
      doChooseDivineSmiteSlot: () => {
        transition("doChooseDivineSmiteSlot", () =>
          chooseAfterHitDamageSpell(state, divineSmiteUnitId, 2),
        );
      },
      doChooseDivineSmiteFreeCast: () => {
        transition("doChooseDivineSmiteFreeCast", () =>
          chooseAfterHitDamageSpell(state, divineSmiteUnitId, 2, {
            invocationTag: "classFeatureFreeCast",
          }),
        );
      },
      doChooseEnsnaringStrike: () => {
        transition("doChooseEnsnaringStrike", () =>
          chooseEnsnaringStrike(state),
        );
      },
      doFillEnsnaringFailedSave: () => {
        transition("doFillEnsnaringFailedSave", () =>
          fillEnsnaringSave(state, false),
        );
      },
      doFillEnsnaringSuccessfulSave: () => {
        transition("doFillEnsnaringSuccessfulSave", () =>
          fillEnsnaringSave(state, true),
        );
      },
      doChooseSearingSmite: () => {
        transition("doChooseSearingSmite", () =>
          chooseAfterHitDamageSpell(state, searingSmiteUnitId, 3),
        );
      },
      doChooseShiningSmite: () => {
        transition("doChooseShiningSmite", () =>
          chooseAfterHitDamageSpell(state, shiningSmiteUnitId, 3),
        );
      },
      doFillDivineSmiteDamage: (input: {
        readonly weaponDiePip: number;
        readonly smiteDiePip: number;
      }) => {
        transition("doFillDivineSmiteDamage", () =>
          fillAttackDamage(state, input.weaponDiePip, input.smiteDiePip),
        );
      },
      doFillEnsnaringWeaponDamage: (input: {
        readonly weaponDiePip: number;
      }) => {
        transition("doFillEnsnaringWeaponDamage", () =>
          fillAttackDamage(state, input.weaponDiePip),
        );
      },
      doFillSearingSmiteDamage: (input: {
        readonly weaponDiePip: number;
        readonly smiteDiePip: number;
      }) => {
        transition("doFillSearingSmiteDamage", () =>
          fillAttackDamage(state, input.weaponDiePip, input.smiteDiePip),
        );
      },
      doFillShiningSmiteDamage: (input: {
        readonly weaponDiePip: number;
        readonly smiteDiePip: number;
      }) => {
        transition("doFillShiningSmiteDamage", () =>
          fillAttackDamage(state, input.weaponDiePip, input.smiteDiePip),
        );
      },
      doDiscoverEnsnaringStartTurnDamage: () => {
        transition("doDiscoverEnsnaringStartTurnDamage", () =>
          discoverTurnStartDamage(state),
        );
      },
      doFillEnsnaringStartTurnDamage: (input: {
        readonly damageDiePip: number;
      }) => {
        transition("doFillEnsnaringStartTurnDamage", () =>
          fillEnsnaringStartTurnDamage(state, input.damageDiePip),
        );
      },
      doFillEnsnaringEscapeCheck: () => {
        transition("doFillEnsnaringEscapeCheck", () =>
          fillEnsnaringEscapeCheck(state),
        );
      },
      doDiscoverSearingStartTurnDamageAndSave: () => {
        transition("doDiscoverSearingStartTurnDamageAndSave", () =>
          discoverTurnStartDamageAndSave(state),
        );
      },
      doFillSearingStartTurnDamageAndSave: (input: {
        readonly damageDiePip: number;
      }) => {
        transition("doFillSearingStartTurnDamageAndSave", () =>
          fillSearingStartTurnDamageAndSave(state, input.damageDiePip),
        );
      },
      doBreakShiningConcentration: () => {
        transition("doBreakShiningConcentration", () =>
          breakConcentration(state),
        );
      },
      doStartDivineSmiteFreeCast: () => {
        transition("doStartDivineSmiteFreeCast", () =>
          initialRuntimeState("divineSmiteFreeCast"),
        );
      },
      doStartEnsnaringFailedSave: () => {
        transition("doStartEnsnaringFailedSave", () =>
          initialRuntimeState("ensnaringStrikeFailedSave"),
        );
      },
      doStartEnsnaringSuccessfulSave: () => {
        transition("doStartEnsnaringSuccessfulSave", () =>
          initialRuntimeState("ensnaringStrikeSuccessfulSave"),
        );
      },
      doStartSearingSmite: () => {
        transition("doStartSearingSmite", () =>
          initialRuntimeState("searingSmiteHit"),
        );
      },
      doStartShiningSmite: () => {
        transition("doStartShiningSmite", () =>
          initialRuntimeState("shiningSmiteHit"),
        );
      },
      doFinish: () => {
        transition("doFinish", () => ({
          ...state,
          scenario: "done",
          phase: "cleaned",
          lastResult: "resolved",
        }));
      },
      step: () => {},
      getState: () => afterHitProjection(state),
    };
  });
}

const afterHitStateCheck = stateCheck(
  normalizeAfterHitQuintState,
  compareAfterHitStates,
);

describe("After-hit damage riders MBT parity", () => {
  it(
    "matches after-hit activation, spend, timed payloads, escape checks, and cleanup",
    async () => {
      const actionLog: string[] = [];
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-after-hit-damage-riders.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createAfterHitDamageRidersDriver({ actionLog }),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(60),
        stateCheck: afterHitStateCheck,
      });
      for (const action of REQUIRED_AFTER_HIT_ACTIONS) {
        expect(actionLog).toContain(action);
      }
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(
  scenario: Exclude<AfterHitScenario, "done">,
  lastResult: "init" | "resolved" = "resolved",
): AfterHitRuntimeState {
  return {
    battle:
      scenario === "divineSmiteFreeCast"
        ? paladinFreeCastBattle()
        : spellBattle({
            preparedSpells: [spellRecord(SPELL_FOR_SCENARIO[scenario])],
            spellSlots: [
              {
                spellLevel: SLOT_LEVEL_FOR_SCENARIO[scenario],
                count: 1,
              },
            ],
            attack: zeroAbilityWeaponAttack("weapon_longsword"),
            targetHp: 30,
            targetMaxHp: 30,
          }),
    scenario,
    phase: "fresh",
    holes: [],
    pending: { tag: "none" },
    lastResult,
  };
}

function paladinFreeCastBattle(): BattleState {
  const resource = paladinsSmiteResource();
  return startBattleRight({
    battleId: battleId("after-hit-damage-riders-paladin-free-cast"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Paladin",
        initiative: 20,
        side: partySide,
        classLevels: [{ className: "paladin", level: 2 }],
        resources: [resource],
        attack: zeroAbilityWeaponAttack("weapon_longsword"),
        spellcasting: {
          ...wizardSpellcasting({
            cantrips: [],
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
          sourceClassName: "paladin",
          featurePreparedSpells: [
            {
              sourceUnitId: resource.unit.id,
              spell: spellRecord(divineSmiteUnitId),
            },
          ],
        },
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        currentHp: 30,
        maxHp: 30,
      }),
    ],
  });
}

function discoverWeaponHit(state: AfterHitRuntimeState): AfterHitRuntimeState {
  const subject = weaponAttackSubject("Longsword");
  const targetHole = requireResultHole(
    resolveBattleSubject({ state: state.battle, subject, fills: [] }),
    "targetChoice",
  );
  return {
    ...state,
    phase: "targetChoiceNeeded",
    holes: [targetHole],
    pending: { tag: "targetChoice", subject },
    lastResult: "needsHoles",
  };
}

function fillTargetChoice(state: AfterHitRuntimeState): AfterHitRuntimeState {
  if (state.pending.tag !== "targetChoice") {
    throw new Error("Expected pending after-hit target choice.");
  }
  const targetFill = attackTargetFill(
    requireHole(state.holes, "targetChoice"),
    spellCasterId,
    spellTargetId,
    "Longsword",
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pending.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  return {
    ...state,
    phase: "attackRollNeeded",
    holes: [attackRoll],
    pending: {
      tag: "attackRoll",
      subject: state.pending.subject,
      targetFill,
    },
    lastResult: "needsHoles",
  };
}

function fillHitAttackRoll(state: AfterHitRuntimeState): AfterHitRuntimeState {
  if (state.pending.tag !== "attackRoll") {
    throw new Error("Expected pending after-hit attack roll.");
  }
  const attackFill = attackRollFill(requireHole(state.holes, "attackRoll"), {
    total: 15,
    naturalD20: 10,
  });
  const awaitingInterrupt = requireNeedsHoles(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pending.subject,
      fills: [state.pending.targetFill, attackFill],
    }),
    "Expected after-hit attack roll to open an interrupt window.",
  );
  const interruptHole = requireHole(
    awaitingInterrupt.holes,
    "interruptDecision",
  );
  return {
    ...state,
    battle: awaitingInterrupt.state,
    phase: "afterHitChoiceNeeded",
    holes: [interruptHole],
    pending: {
      tag: "afterHitChoice",
      subject: state.pending.subject,
      targetFill: state.pending.targetFill,
      attackFill,
      interruptHole,
    },
    lastResult: "needsHoles",
  };
}

function chooseAfterHitDamageSpell(
  state: AfterHitRuntimeState,
  spellId: string,
  riderDice: number,
  options: { readonly invocationTag?: string } = {},
): AfterHitRuntimeState {
  if (state.pending.tag !== "afterHitChoice") {
    throw new Error("Expected pending after-hit choice.");
  }
  const choice = requireAfterHitChoice(state.battle, spellId, options);
  const afterChoice = requireNeedsHoles(
    resolveBattleInterrupt({
      state: state.battle,
      fill: interruptDecisionFill(state.pending.interruptHole, {
        kind: "resolve",
        responderId: spellCasterId,
        choice: {
          kind: "castAttackHitBonusActionSpell",
          invocation: choice.invocation,
          fills: [],
        },
      }),
    }),
    `Expected ${spellId} after-hit choice to request attack damage.`,
  );
  const damageHole = requireHole(afterChoice.holes, "rolledDice");
  return {
    ...state,
    battle: afterChoice.state,
    phase: "attackDamageNeeded",
    holes: [damageHole],
    pending: {
      tag: "attackDamage",
      subject: state.pending.subject,
      targetFill: state.pending.targetFill,
      attackFill: state.pending.attackFill,
      riderDice,
    },
    lastResult: "needsHoles",
  };
}

function chooseEnsnaringStrike(
  state: AfterHitRuntimeState,
): AfterHitRuntimeState {
  if (state.pending.tag !== "afterHitChoice") {
    throw new Error("Expected pending Ensnaring Strike choice.");
  }
  const choice = requireAfterHitChoice(state.battle, ensnaringStrikeUnitId);
  const saveHole = requireHole(choice.initialHoles, "savingThrowOutcome");
  return {
    ...state,
    phase: "ensnaringSaveNeeded",
    holes: [saveHole],
    pending: {
      tag: "ensnaringSave",
      subject: state.pending.subject,
      targetFill: state.pending.targetFill,
      attackFill: state.pending.attackFill,
      interruptHole: state.pending.interruptHole,
      choice,
    },
    lastResult: "needsHoles",
  };
}

function fillEnsnaringSave(
  state: AfterHitRuntimeState,
  succeeded: boolean,
): AfterHitRuntimeState {
  if (state.pending.tag !== "ensnaringSave") {
    throw new Error("Expected pending Ensnaring Strike saving throw.");
  }
  const saveFill = savingThrowOutcomeFill(
    requireHole(state.holes, "savingThrowOutcome"),
    [{ targetId: spellTargetId, succeeded }],
  );
  const afterChoice = requireNeedsHoles(
    resolveBattleInterrupt({
      state: state.battle,
      fill: interruptDecisionFill(state.pending.interruptHole, {
        kind: "resolve",
        responderId: spellCasterId,
        choice: {
          kind: "castAttackHitBonusActionSpell",
          invocation: state.pending.choice.invocation,
          fills: [saveFill],
        },
      }),
    }),
    "Expected Ensnaring Strike to request host attack damage.",
  );
  const damageHole = requireHole(afterChoice.holes, "rolledDice");
  return {
    ...state,
    battle: afterChoice.state,
    phase: "attackDamageNeeded",
    holes: [damageHole],
    pending: {
      tag: "attackDamage",
      subject: state.pending.subject,
      targetFill: state.pending.targetFill,
      attackFill: state.pending.attackFill,
      riderDice: 0,
    },
    lastResult: "needsHoles",
  };
}

function fillAttackDamage(
  state: AfterHitRuntimeState,
  weaponDiePip: number,
  riderDiePip?: number,
): AfterHitRuntimeState {
  if (state.pending.tag !== "attackDamage") {
    throw new Error("Expected pending after-hit attack damage.");
  }
  const damage = requireHole(state.holes, "rolledDice");
  const groups =
    state.pending.riderDice === 0
      ? [[weaponDiePip]]
      : [
          [weaponDiePip],
          Array.from({ length: state.pending.riderDice }, () =>
            requireRiderDiePip(riderDiePip),
          ),
        ];
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pending.subject,
      fills: [
        state.pending.targetFill,
        state.pending.attackFill,
        damageRollFillWithGroups(damage, groups),
      ],
    }),
    "Expected after-hit host attack to resolve.",
  );
  return {
    ...state,
    battle: resolved.state,
    phase: "afterDamage",
    holes: [],
    pending: { tag: "none" },
    lastResult: "resolved",
  };
}

function breakConcentration(state: AfterHitRuntimeState): AfterHitRuntimeState {
  return {
    ...state,
    battle: breakBattleConcentration(state.battle, spellCasterId),
    phase: "cleaned",
    holes: [],
    pending: { tag: "none" },
    lastResult: "resolved",
  };
}

function discoverTurnStartDamage(
  state: AfterHitRuntimeState,
): AfterHitRuntimeState {
  const awaitingTurnStartDamage = requireNeedsHoles(
    endTurn({
      state: state.battle,
      actorId: spellCasterId,
    }),
    "Expected after-hit timed damage to request turn-start damage.",
  );
  const damageHole = requireHole(awaitingTurnStartDamage.holes, "rolledDice");
  return {
    ...state,
    battle: awaitingTurnStartDamage.state,
    phase: "turnStartDamageNeeded",
    holes: [damageHole],
    pending: {
      tag: "turnStartDamage",
      sourceBattle: state.battle,
    },
    lastResult: "needsHoles",
  };
}

function fillEnsnaringStartTurnDamage(
  state: AfterHitRuntimeState,
  damageDiePip: number,
): AfterHitRuntimeState {
  if (state.pending.tag !== "turnStartDamage") {
    throw new Error("Expected pending Ensnaring Strike turn-start damage.");
  }
  const targetTurn = requireResolved(
    endTurn({
      state: state.pending.sourceBattle,
      actorId: spellCasterId,
      fills: [
        damageRollFillWithGroups(requireHole(state.holes, "rolledDice"), [
          [damageDiePip],
        ]),
      ],
    }),
    "Expected Ensnaring Strike turn-start damage to resolve.",
  );
  const escapeAct = requireSpellRestraintEscapeAct(targetTurn.state);
  const escapeCheck = requireHole(escapeAct.initialHoles, "abilityCheck");
  return {
    ...state,
    battle: targetTurn.state,
    phase: "escapeCheckNeeded",
    holes: [escapeCheck],
    pending: {
      tag: "escapeCheck",
      subject: escapeAct.subject,
    },
    lastResult: "needsHoles",
  };
}

function fillEnsnaringEscapeCheck(
  state: AfterHitRuntimeState,
): AfterHitRuntimeState {
  if (state.pending.tag !== "escapeCheck") {
    throw new Error("Expected pending Ensnaring Strike escape check.");
  }
  const escaped = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: state.pending.subject,
      fills: [abilityCheckFill(requireHole(state.holes, "abilityCheck"), 13)],
    }),
    "Expected Ensnaring Strike escape check to resolve.",
  );
  return {
    ...state,
    battle: escaped.state,
    phase: "cleaned",
    holes: [],
    pending: { tag: "none" },
    lastResult: "resolved",
  };
}

function discoverTurnStartDamageAndSave(
  state: AfterHitRuntimeState,
): AfterHitRuntimeState {
  const awaitingTurnStart = requireNeedsHoles(
    endTurn({
      state: state.battle,
      actorId: spellCasterId,
    }),
    "Expected Searing Smite to request turn-start damage and save.",
  );
  const damageHole = requireHole(awaitingTurnStart.holes, "rolledDice");
  const saveHole = requireHole(awaitingTurnStart.holes, "savingThrowOutcome");
  return {
    ...state,
    battle: awaitingTurnStart.state,
    phase: "turnStartDamageSaveNeeded",
    holes: [damageHole, saveHole],
    pending: {
      tag: "turnStartDamageAndSave",
      sourceBattle: state.battle,
    },
    lastResult: "needsHoles",
  };
}

function fillSearingStartTurnDamageAndSave(
  state: AfterHitRuntimeState,
  damageDiePip: number,
): AfterHitRuntimeState {
  if (state.pending.tag !== "turnStartDamageAndSave") {
    throw new Error("Expected pending Searing Smite turn-start damage/save.");
  }
  const targetTurn = requireResolved(
    endTurn({
      state: state.pending.sourceBattle,
      actorId: spellCasterId,
      fills: [
        damageRollFillWithGroups(requireHole(state.holes, "rolledDice"), [
          Array.from({ length: 3 }, () => damageDiePip),
        ]),
        savingThrowOutcomeFill(requireHole(state.holes, "savingThrowOutcome"), [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    }),
    "Expected Searing Smite turn-start damage/save to resolve.",
  );
  return {
    ...state,
    battle: targetTurn.state,
    phase: "cleaned",
    holes: [],
    pending: { tag: "none" },
    lastResult: "resolved",
  };
}

function afterHitProjection(
  state: AfterHitRuntimeState,
): AfterHitDamageRidersState {
  const target = requireCombatant(state.battle, spellTargetId);
  const caster = requireCombatant(state.battle, spellCasterId);
  return {
    scenario: state.scenario,
    phase: state.phase,
    targetHp: Number(target.hp),
    bonusActionAvailable:
      state.battle.currentTurnResources.currentHasBonusAction,
    slotExpended: casterSlotExpended(state.battle),
    freeCastUsesRemaining: paladinsSmiteUsesRemaining(state.battle),
    levelOnePlusCastCommitted:
      state.battle.currentTurnResources.levelOnePlusSpellCastsThisTurn.includes(
        spellCasterId,
      ),
    concentrationActive: caster.concentration !== null,
    targetRestrained: target.conditions.restrained === true,
    searingBurning: hasActiveEffect(
      target.activeEffects,
      "spellTurnStartDamageAndSave",
      searingSmiteUnitId,
    ),
    shiningIlluminated: hasActiveEffect(
      target.activeEffects,
      "shiningSmiteIllumination",
      shiningSmiteUnitId,
    ),
    holes: battleHolesToAfterHitHoles(state.holes, state.pending),
    lastResult: state.lastResult,
  };
}

function casterSlotExpended(state: BattleState): boolean {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected after-hit caster to be a character.");
  }
  return (
    caster.origin.spellcasting?.spellSlots.some(
      (slot) => Number(slot.expended) > 0,
    ) ?? false
  );
}

function paladinsSmiteUsesRemaining(state: BattleState): number {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected after-hit caster to be a character.");
  }
  const resource = caster.origin.resources.find(
    (candidate) => candidate.unit.id === "paladin_paladins_smite",
  );
  return resource === undefined ? 0 : Number(resource.usesRemaining ?? 0);
}

function hasActiveEffect(
  effects: readonly BattleActiveEffect[],
  kind: BattleActiveEffect["kind"],
  sourceSpellId: string,
): boolean {
  return effects.some(
    (effect) =>
      effect.kind === kind &&
      "sourceSpellId" in effect &&
      effect.sourceSpellId === sourceSpellId,
  );
}

function battleHolesToAfterHitHoles(
  holes: readonly BattleHole[],
  pending: PendingInvocation,
): readonly AfterHitHole[] {
  return holes.map((hole) => {
    if (hole.kind === "targetChoice") return "TargetChoice";
    if (hole.kind === "attackRoll") return "AttackRoll";
    if (hole.kind === "interruptDecision") return "InterruptDecision";
    if (
      hole.kind === "savingThrowOutcome" &&
      pending.tag === "turnStartDamageAndSave"
    ) {
      return "TurnStartSaveOutcome";
    }
    if (hole.kind === "savingThrowOutcome") return "SaveOutcome";
    if (hole.kind === "rolledDice" && pending.tag === "attackDamage") {
      return "AttackDamageRoll";
    }
    if (
      hole.kind === "rolledDice" &&
      (pending.tag === "turnStartDamage" ||
        pending.tag === "turnStartDamageAndSave")
    ) {
      return "TurnStartDamageRoll";
    }
    if (hole.kind === "abilityCheck" && pending.tag === "escapeCheck") {
      return "EscapeAbilityCheck";
    }
    throw new Error(`Unexpected after-hit damage rider hole ${hole.kind}.`);
  });
}

function normalizeAfterHitQuintState(raw: unknown): AfterHitDamageRidersState {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: afterHitHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "After-hit damage riders",
    scenarioOutcome: protocol.lastResult,
    protocol,
    initScenarioResult: "init",
  });
  return {
    scenario: quintVariantMappedValue(
      state["qScenario"],
      "qScenario",
      AFTER_HIT_SCENARIO_BY_TAG,
      "after-hit scenario",
    ),
    phase: quintVariantMappedValue(
      state["qPhase"],
      "qPhase",
      AFTER_HIT_PHASE_BY_TAG,
      "after-hit phase",
    ),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    slotExpended: booleanField(state, "qSlotExpended"),
    freeCastUsesRemaining: numberFromQuintInt(
      state["qFreeCastUsesRemaining"],
      "qFreeCastUsesRemaining",
    ),
    levelOnePlusCastCommitted: booleanField(
      state,
      "qLevelOnePlusCastCommitted",
    ),
    concentrationActive: booleanField(state, "qConcentrationActive"),
    targetRestrained: booleanField(state, "qTargetRestrained"),
    searingBurning: booleanField(state, "qSearingBurning"),
    shiningIlluminated: booleanField(state, "qShiningIlluminated"),
    holes: protocol.holes,
    lastResult: protocol.lastResult,
  };
}

function compareAfterHitStates(
  spec: AfterHitDamageRidersState,
  impl: AfterHitDamageRidersState,
): boolean {
  try {
    expect(impl).toEqual(spec);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${error.message}\nspec=${JSON.stringify(spec)}\nimpl=${JSON.stringify(impl)}`,
      );
    }
    throw error;
  }
  return true;
}

function requireAfterHitChoice(
  state: BattleState,
  spellId: string,
  options: { readonly invocationTag?: string } = {},
): PendingAfterHitChoice {
  const choice = snapshotBattle(state).pendingInterrupt?.choices.find(
    (candidate) =>
      candidate.kind === "castAttackHitBonusActionSpell" &&
      candidate.invocation.spellId === spellId &&
      (options.invocationTag === undefined ||
        candidate.invocation.tag === options.invocationTag),
  );
  if (choice === undefined || choice.kind !== "castAttackHitBonusActionSpell") {
    throw new Error(`Expected ${spellId} after-hit spell choice.`);
  }
  return {
    invocation: choice.invocation,
    initialHoles: choice.initialHoles,
  };
}

function requireSpellRestraintEscapeAct(state: BattleState): ReturnType<
  typeof discoverBattleActs
>[number] & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "escapeSpellRestraint" }
  >;
} {
  const act = discoverBattleActs(state).find(
    (
      candidate,
    ): candidate is ReturnType<typeof discoverBattleActs>[number] & {
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "action"; readonly action: "escapeSpellRestraint" }
      >;
    } =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "escapeSpellRestraint" &&
      candidate.subject.actorId === spellTargetId &&
      candidate.subject.targetId === spellTargetId,
  );
  if (act === undefined) {
    throw new Error("Expected Ensnaring Strike escape action.");
  }
  return act;
}

function requireNeedsHoles(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error(message);
  }
  return result;
}

function requireResolved(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error(message);
  }
  return result;
}

function requireRiderDiePip(riderDiePip: number | undefined): number {
  if (riderDiePip === undefined) {
    throw new Error("Expected after-hit rider die pip.");
  }
  return riderDiePip;
}

function afterHitHole(raw: unknown): AfterHitHole {
  const tag = quintVariantTag(raw, "AfterHitHole");
  if (isAfterHitHole(tag)) {
    return tag;
  }
  throw new Error(`Unknown after-hit hole ${tag}.`);
}

function isAfterHitHole(tag: string): tag is AfterHitHole {
  return AFTER_HIT_HOLES.some((hole) => hole === tag);
}
