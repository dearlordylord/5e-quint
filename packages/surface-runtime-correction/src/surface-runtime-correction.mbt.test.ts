import { execSync } from "node:child_process";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  answerBattlePrompt,
  discoverAvailableBattlePrompt,
} from "#/battle-prompts.ts";
import { reduceBattleState } from "#/battle-reducer.ts";
import type {
  AvailableBattlePrompt,
  BattlePromptAnswer,
  BattleState,
  ResolvedBattleAction,
} from "#/index.ts";
import { projectPromptBattle } from "#/test-support.ts";
import { runtimeUnitAccessId } from "#/types.ts";

const FIREBALL_ACCESS_ID = runtimeUnitAccessId("characterSheet:wizard:fireball");
const CURE_WOUNDS_ACCESS_ID = runtimeUnitAccessId(
  "characterSheet:cleric:cure_wounds",
);
const ACTION_SURGE_ACCESS_ID = runtimeUnitAccessId(
  "characterSheet:fighter:fighter_action_surge_l2",
);

type PromptTag =
  | ""
  | "chooseAction"
  | "chooseAttackTarget"
  | "chooseSingleTargetUnit"
  | "chooseAreaEffect";

type OutcomeTag = "" | "resolvedAction" | "openedPrompt";

type NormalizedPrompt = {
  readonly tag: PromptTag;
  readonly actorId: string;
  readonly unitId: string;
  readonly options: ReadonlyArray<string>;
  readonly availableTargetIds: ReadonlyArray<string>;
  readonly targetingTag: string;
  readonly rangeFeet: number;
  readonly radiusFeet: number;
  readonly saveAbility: string;
  readonly saveDc: number;
  readonly effectTag: string;
  readonly damageType: string;
  readonly onSuccess: string;
};

type NormalizedResolvedAction = {
  readonly tag: string;
  readonly actorId: string;
  readonly unitId: string;
  readonly targetId: string;
  readonly damage: number;
  readonly amount: number;
  readonly targetResults: ReadonlyArray<string>;
};

type NormalizedOutcome = {
  readonly tag: OutcomeTag;
  readonly openedPromptTag: PromptTag;
  readonly resolvedAction: NormalizedResolvedAction;
};

type NormalizedState = {
  readonly battle: {
    readonly currentParticipant: {
      readonly initiativeCount: number;
      readonly projectionOrder: number;
      readonly combatant: {
        readonly id: string;
        readonly level: number;
        readonly currentHp: number;
        readonly maxHp: number;
        readonly spellSaveDc: number | null;
        readonly unitIds: ReadonlyArray<string>;
        readonly unitResourceStates: ReadonlyArray<{
          readonly unitId: string;
          readonly expendedUses: number;
          readonly usedThisTurn: boolean;
        }>;
      };
    };
    readonly waitingParticipants: ReadonlyArray<{
      readonly initiativeCount: number;
      readonly projectionOrder: number;
      readonly combatant: {
        readonly id: string;
        readonly level: number;
        readonly currentHp: number;
        readonly maxHp: number;
        readonly spellSaveDc: number | null;
        readonly unitIds: ReadonlyArray<string>;
        readonly unitResourceStates: ReadonlyArray<{
          readonly unitId: string;
          readonly expendedUses: number;
          readonly usedThisTurn: boolean;
        }>;
      };
    }>;
    readonly round: number;
    readonly turnNumber: number;
    readonly openPrompt: {
      readonly tag: PromptTag;
      readonly unitId: string;
    };
    readonly standardActionsRemaining: number;
    readonly nonMagicActionsRemaining: number;
  };
  readonly prompt: NormalizedPrompt;
  readonly outcome: NormalizedOutcome;
};

type ChooseActionAnswer = Extract<BattlePromptAnswer, { tag: "chooseAction" }>;

const DRIVER_SCHEMA = {
  srcInit: {},
  srcInitClericTurn: {},
  srcChooseEndTurn: {},
  srcChooseAttack: {},
  srcAnswerAttackTarget: {},
  srcChooseFireball: {},
  srcAnswerAreaEffect: {},
  srcChooseCureWounds: {},
  srcAnswerSingleTargetUnit: {},
  srcChooseActionSurge: {},
  srcStep: {},
} as const;

const SPEC_PATH = new URL("../../../surfaceRuntimeCorrectionMbt.qnt", import.meta.url)
  .pathname;

const ENV = (
  globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env ?? {};

function killZombieEvaluators(): void {
  try {
    execSync("pkill -9 -f quint_evaluator", { stdio: "ignore" });
  } catch {
    // No matching processes.
  }
  try {
    execSync("pkill -9 -f 'quint run .* --mbt'", { stdio: "ignore" });
  } catch {
    // No matching processes.
  }
}

let signalHandlersRegistered = false;

function registerEvaluatorCleanup(): void {
  if (signalHandlersRegistered) {
    return;
  }
  signalHandlersRegistered = true;

  const cleanup = () => {
    killZombieEvaluators();
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => {
    cleanup();
    process.exitCode = 130;
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exitCode = 143;
  });
}

function logMbtSeed(label: string, result: { seed: string }): void {
  console.log(`[${label}] seed: ${result.seed}`);
}

function envNumber(name: string, fallback: number): number {
  const raw = ENV[name];
  return raw === undefined ? fallback : Number(raw);
}

function variantToString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && value !== null) {
    if ("tag" in value) {
      return String((value as Record<string, unknown>).tag);
    }
    const keys = Object.keys(value);
    if (keys.length === 1) {
      return keys[0]!;
    }
  }
  return String(value);
}

function recordOf(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(`Expected object, got ${String(value)}`);
}

function arrayOf(value: unknown): ReadonlyArray<unknown> {
  return Array.isArray(value) ? value : [];
}

function bigintToNumber(value: unknown): number {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}

function variantValue(value: unknown): unknown {
  if (typeof value === "object" && value !== null && "value" in value) {
    return (value as Record<string, unknown>).value;
  }
  return undefined;
}

function normalizeSpellSaveDc(value: unknown): number | null {
  return variantToString(value) === "NoSpellSaveDc"
    ? null
    : bigintToNumber(variantValue(value));
}

function normalizeOpenPrompt(value: unknown): { tag: PromptTag; unitId: string } {
  const tag = variantToString(value);
  if (tag === "NoOpenPrompt") {
    return { tag: "", unitId: "" };
  }
  if (tag === "OPChooseAttackTarget") {
    return { tag: "chooseAttackTarget", unitId: "" };
  }
  return {
    tag:
      tag === "OPChooseSingleTargetUnit"
        ? "chooseSingleTargetUnit"
        : "chooseAreaEffect",
    unitId: String(variantValue(value) ?? ""),
  };
}

function normalizeResolvedAction(value: {
  tag?: string;
  actorId?: string;
  unitId?: string;
  targetId?: string;
  damage?: number;
  amount?: number;
  targetResults?: ReadonlyArray<string>;
} = {}): NormalizedResolvedAction {
  return {
    tag: value.tag ?? "",
    actorId: value.actorId ?? "",
    unitId: value.unitId ?? "",
    targetId: value.targetId ?? "",
    damage: value.damage ?? 0,
    amount: value.amount ?? 0,
    targetResults: value.targetResults ?? [],
  };
}

function unitIdForAccess(
  state: BattleState,
  unitAccessId: string,
): string {
  for (const combatant of [
    state.currentParticipant,
    ...state.waitingParticipants,
  ].map((participant) => participant.combatant)) {
    const unit = combatant.units.find((candidate) => candidate.accessId === unitAccessId);
    if (unit != null) {
      return unit.unit.id;
    }
  }
  return "";
}

function normalizeActionChoiceFromRaw(value: unknown): string {
  const tag = variantToString(value);
  if (tag === "ATOCoreActionAttack") {
    return "core:attack";
  }
  if (tag === "ATOCoreActionEndTurn") {
    return "core:endTurn";
  }
  return `unit:${String(variantValue(value) ?? "")}`;
}

function normalizeTargetResultFromRaw(value: unknown): string {
  const record = recordOf(value);
  return `${String(record["targetId"] ?? "")}:${variantToString(record["saveOutcome"]) === "SaveSuccess" ? "success" : "failure"}`;
}

function normalizeModelState(raw: unknown): NormalizedState {
  const state = recordOf(raw);
  const battle = recordOf(state["srcBattle"]);
  const normalizeParticipant = (entry: unknown) => {
    const participant = recordOf(entry);
    const combatant = recordOf(participant["combatant"]);
    return {
      initiativeCount: bigintToNumber(participant["initiativeCount"]),
      projectionOrder: bigintToNumber(participant["projectionOrder"]),
      combatant: {
        id: String(combatant["id"] ?? ""),
        level: bigintToNumber(combatant["level"]),
        currentHp: bigintToNumber(combatant["currentHp"]),
        maxHp: bigintToNumber(combatant["maxHp"]),
        spellSaveDc: normalizeSpellSaveDc(combatant["spellSaveDc"]),
        unitIds: arrayOf(combatant["units"]).map((unit) =>
          String(recordOf(unit)["unitId"] ?? ""),
        ),
        unitResourceStates: arrayOf(combatant["unitResourceStates"]).map(
          (resourceState) => {
            const parsed = recordOf(resourceState);
            return {
              unitId: String(parsed["unitId"] ?? ""),
              expendedUses: bigintToNumber(parsed["expendedUses"]),
              usedThisTurn: Boolean(parsed["usedThisTurn"]),
            };
          },
        ),
      },
    };
  };
  return {
    battle: {
      currentParticipant: normalizeParticipant(battle["currentParticipant"]),
      waitingParticipants: arrayOf(battle["waitingParticipants"]).map(
        normalizeParticipant,
      ),
      round: bigintToNumber(battle["round"]),
      turnNumber: bigintToNumber(battle["turnNumber"]),
      openPrompt: normalizeOpenPrompt(battle["openPrompt"]),
      standardActionsRemaining: bigintToNumber(
        battle["standardActionsRemaining"],
      ),
      nonMagicActionsRemaining: bigintToNumber(
        battle["nonMagicActionsRemaining"],
      ),
    },
    prompt: {
      tag: String(state["srcPromptTag"] ?? "") as PromptTag,
      actorId: String(state["srcPromptActorId"] ?? ""),
      unitId: String(state["srcPromptUnitId"] ?? ""),
      options: arrayOf(state["srcPromptOptions"]).map(
        normalizeActionChoiceFromRaw,
      ),
      availableTargetIds: arrayOf(state["srcPromptAvailableTargetIds"]).map(
        String,
      ),
      targetingTag: String(state["srcPromptTargetingTag"] ?? ""),
      rangeFeet: bigintToNumber(state["srcPromptRangeFeet"]),
      radiusFeet: bigintToNumber(state["srcPromptRadiusFeet"]),
      saveAbility: String(state["srcPromptSaveAbility"] ?? ""),
      saveDc: bigintToNumber(state["srcPromptSaveDc"]),
      effectTag: String(state["srcPromptEffectTag"] ?? ""),
      damageType: String(state["srcPromptDamageType"] ?? ""),
      onSuccess: String(state["srcPromptOnSuccess"] ?? ""),
    },
    outcome: {
      tag: String(state["srcLastOutcomeTag"] ?? "") as OutcomeTag,
      openedPromptTag: String(state["srcLastOpenedPromptTag"] ?? "") as PromptTag,
      resolvedAction: normalizeResolvedAction({
        tag: String(state["srcLastResolvedActionTag"] ?? ""),
        actorId: String(state["srcLastResolvedActorId"] ?? ""),
        unitId: String(state["srcLastResolvedUnitId"] ?? ""),
        targetId: String(state["srcLastResolvedTargetId"] ?? ""),
        damage: bigintToNumber(state["srcLastResolvedDamage"]),
        amount: bigintToNumber(state["srcLastResolvedTotal"]),
        targetResults: arrayOf(state["srcLastResolvedTargetResults"]).map(
          normalizeTargetResultFromRaw,
        ),
      }),
    },
  };
}

function emptyPrompt(): NormalizedPrompt {
  return {
    tag: "",
    actorId: "",
    unitId: "",
    options: [],
    availableTargetIds: [],
    targetingTag: "",
    rangeFeet: 0,
    radiusFeet: 0,
    saveAbility: "",
    saveDc: 0,
    effectTag: "",
    damageType: "",
    onSuccess: "",
  };
}

function normalizePrompt(
  state: BattleState,
  prompt: AvailableBattlePrompt | null,
): NormalizedPrompt {
  if (prompt === null) {
    return emptyPrompt();
  }

  if (prompt.tag === "chooseAction") {
    return {
      ...emptyPrompt(),
      tag: prompt.tag,
      actorId: prompt.actorId,
      options: prompt.options.map((choice) =>
        choice.tag === "coreAction"
          ? `core:${choice.action}`
          : `unit:${unitIdForAccess(state, choice.unitAccessId)}`,
      ),
    };
  }

  if (prompt.tag === "chooseAttackTarget") {
    return {
      ...emptyPrompt(),
      tag: prompt.tag,
      actorId: prompt.actorId,
      availableTargetIds: [...prompt.availableTargetIds],
    };
  }

  if (prompt.tag === "chooseSingleTargetUnit") {
    return {
      ...emptyPrompt(),
      tag: prompt.tag,
      actorId: prompt.actorId,
      unitId: unitIdForAccess(state, prompt.unitAccessId),
      targetingTag: prompt.targeting.tag,
      effectTag: prompt.effect.tag,
    };
  }

  return {
    ...emptyPrompt(),
    tag: prompt.tag,
    actorId: prompt.actorId,
    unitId: unitIdForAccess(state, prompt.unitAccessId),
    targetingTag: prompt.targeting.tag,
    rangeFeet: prompt.targeting.rangeFeet,
    radiusFeet: prompt.targeting.radiusFeet,
    saveAbility: prompt.save.ability,
    saveDc: prompt.save.dc,
    effectTag: prompt.effect.tag,
    damageType: String(prompt.effect.damageType),
    onSuccess: prompt.effect.onSuccess,
  };
}

function normalizeTargetResult(result: {
  readonly targetId: string;
  readonly saveOutcome: "success" | "failure";
}): string {
  return `${result.targetId}:${result.saveOutcome}`;
}

function normalizeResolvedActionPayload(
  state: BattleState,
  action: ResolvedBattleAction,
): NormalizedResolvedAction {
  if (action.tag === "endTurn") {
    return normalizeResolvedAction({
      tag: action.tag,
      actorId: action.actorId,
    });
  }
  if (action.tag === "attack") {
    return normalizeResolvedAction({
      tag: action.tag,
      actorId: action.actorId,
      targetId: action.targetId,
      damage: action.damage,
    });
  }
  if (action.tag === "singleTargetHeal") {
    return normalizeResolvedAction({
      tag: action.tag,
      actorId: action.actorId,
      unitId: unitIdForAccess(state, action.unitAccessId),
      targetId: action.targetId,
      amount: action.healing,
    });
  }
  if (action.tag === "areaSaveDamage") {
    return normalizeResolvedAction({
      tag: action.tag,
      actorId: action.actorId,
      unitId: unitIdForAccess(state, action.unitAccessId),
      amount: action.damage,
      targetResults: action.targetResults.map(normalizeTargetResult),
    });
  }
  return normalizeResolvedAction({
    tag: action.tag,
    actorId: action.actorId,
    unitId: unitIdForAccess(state, action.unitAccessId),
  });
}

function normalizeTsBattle(state: BattleState): NormalizedState["battle"] {
  const normalizeParticipant = (participant: BattleState["currentParticipant"]) => ({
    initiativeCount: participant.initiativeCount,
    projectionOrder: participant.projectionOrder,
    combatant: {
      id: participant.combatant.id,
      level: participant.combatant.level,
      currentHp: participant.combatant.currentHp,
      maxHp: participant.combatant.maxHp,
      spellSaveDc: participant.combatant.spellSaveDc,
      unitIds: participant.combatant.units.map((unit) => unit.unit.id),
      unitResourceStates: participant.combatant.unitResourceStates.map(
        (resourceState) => ({
          unitId: unitIdForAccess(state, resourceState.unitAccessId),
          expendedUses: resourceState.expendedUses,
          usedThisTurn: resourceState.usedThisTurn,
        }),
      ),
    },
  });
  return {
    currentParticipant: normalizeParticipant(state.currentParticipant),
    waitingParticipants: state.waitingParticipants.map(normalizeParticipant),
    round: state.round,
    turnNumber: state.turnNumber,
    openPrompt:
      state.openPrompt === null
        ? { tag: "", unitId: "" }
        : {
            tag: state.openPrompt.tag,
            unitId:
              "unitAccessId" in state.openPrompt
                ? unitIdForAccess(state, state.openPrompt.unitAccessId)
                : "",
          },
    standardActionsRemaining: state.standardActionsRemaining,
    nonMagicActionsRemaining: state.nonMagicActionsRemaining,
  };
}

function chooseAction(choice: ChooseActionAnswer["choice"]): ChooseActionAnswer {
  return { tag: "chooseAction", choice };
}

function emptyOutcome(): NormalizedOutcome {
  return {
    tag: "",
    openedPromptTag: "",
    resolvedAction: normalizeResolvedAction(),
  };
}

function applyAnswer(
  state: BattleState,
  answer: BattlePromptAnswer,
): { battle: BattleState; outcome: NormalizedOutcome } {
  const resolution = answerBattlePrompt(state, answer);
  if (Either.isLeft(resolution)) {
    throw resolution.left;
  }

  if (resolution.right.tag === "openedPrompt") {
    return {
      battle: resolution.right.state,
      outcome: {
        tag: "openedPrompt",
        openedPromptTag: resolution.right.prompt.tag,
        resolvedAction: normalizeResolvedAction(),
      },
    };
  }

  const reduced = reduceBattleState(
    resolution.right.state,
    resolution.right.action,
  );
  if (Either.isLeft(reduced)) {
    throw reduced.left;
  }

  return {
    battle: reduced.right,
    outcome: {
      tag: "resolvedAction",
      openedPromptTag: "",
      resolvedAction: normalizeResolvedActionPayload(
        resolution.right.state,
        resolution.right.action,
      ),
    },
  };
}

function createSurfaceRuntimeCorrectionDriver() {
  return defineDriver(DRIVER_SCHEMA, () => {
    let battle = projectPromptBattle();
    let outcome = emptyOutcome();

    function reset() {
      battle = projectPromptBattle();
      outcome = emptyOutcome();
    }

    function resetToClericTurn() {
      reset();
      battle = applyAnswer(
        battle,
        chooseAction({ tag: "coreAction", action: "endTurn" }),
      ).battle;
      battle = applyAnswer(
        battle,
        chooseAction({ tag: "coreAction", action: "endTurn" }),
      ).battle;
      outcome = emptyOutcome();
    }

    function step(answer: BattlePromptAnswer) {
      const next = applyAnswer(battle, answer);
      battle = next.battle;
      outcome = next.outcome;
    }

    return {
      srcInit: () => {
        reset();
      },
      srcInitClericTurn: () => {
        resetToClericTurn();
      },
      srcChooseEndTurn: () => {
        step(chooseAction({ tag: "coreAction", action: "endTurn" }));
      },
      srcChooseAttack: () => {
        step(chooseAction({ tag: "coreAction", action: "attack" }));
      },
      srcAnswerAttackTarget: () => {
        step({
          tag: "chooseAttackTarget",
          targetId: "ogre",
          damage: 7,
        });
      },
      srcChooseFireball: () => {
        step(chooseAction({ tag: "unit", unitAccessId: FIREBALL_ACCESS_ID }));
      },
      srcAnswerAreaEffect: () => {
        step({
          tag: "chooseAreaEffect",
          targetResults: [
            { targetId: "fighter", saveOutcome: "failure" },
            { targetId: "cleric", saveOutcome: "success" },
            { targetId: "ogre", saveOutcome: "failure" },
          ],
          amount: 10,
        });
      },
      srcChooseCureWounds: () => {
        step(chooseAction({ tag: "unit", unitAccessId: CURE_WOUNDS_ACCESS_ID }));
      },
      srcAnswerSingleTargetUnit: () => {
        step({
          tag: "chooseSingleTargetUnit",
          targetId: "fighter",
          amount: 8,
        });
      },
      srcChooseActionSurge: () => {
        step(chooseAction({ tag: "unit", unitAccessId: ACTION_SURGE_ACCESS_ID }));
      },
      srcStep: () => {},
      getState: (): NormalizedState => ({
        battle: normalizeTsBattle(battle),
        prompt: normalizePrompt(
          battle,
          discoverAvailableBattlePrompt(battle),
        ),
        outcome,
      }),
      config: () => ({ statePath: [] }),
    };
  });
}

function statesMatch(spec: NormalizedState, impl: NormalizedState): boolean {
  expect(impl.battle).toEqual(spec.battle);
  expect(impl.prompt).toEqual(spec.prompt);
  expect(impl.outcome).toEqual(spec.outcome);
  return true;
}

const mbtStateCheck = stateCheck(normalizeModelState, statesMatch);

describe("surface runtime correction MBT", () => {
  beforeAll(() => {
    killZombieEvaluators();
    registerEvaluatorCleanup();
  });
  afterAll(() => {
    killZombieEvaluators();
  });

  const mbtBackend = (ENV["MBT_BACKEND"] ?? "typescript") as
    | "typescript"
    | "rust";

  it("replays opening-turn correction-slice traces against the Quint slice", async () => {
    const result = await run({
      spec: SPEC_PATH,
      init: "srcInit",
      step: "srcStep",
      driver: createSurfaceRuntimeCorrectionDriver(),
      backend: mbtBackend,
      nTraces: envNumber("MBT_TRACES", 1),
      maxSteps: envNumber("MBT_STEPS", 4),
      maxSamples: envNumber("MBT_MAX_SAMPLES", 1),
      stateCheck: mbtStateCheck,
    });
    logMbtSeed("surface runtime correction MBT", result);
  }, 120_000);

  it("replays the later cleric follow-up prompt slice against the Quint slice", async () => {
    const result = await run({
      spec: SPEC_PATH,
      init: "srcInitClericTurn",
      step: "srcStep",
      driver: createSurfaceRuntimeCorrectionDriver(),
      backend: mbtBackend,
      nTraces: envNumber("MBT_TRACES", 1),
      maxSteps: envNumber("MBT_CLERIC_STEPS", 2),
      maxSamples: envNumber("MBT_MAX_SAMPLES", 1),
      stateCheck: mbtStateCheck,
    });
    logMbtSeed("surface runtime correction cleric MBT", result);
  }, 120_000);
});
