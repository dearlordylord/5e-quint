// KERNEL-COVERAGE: parity-witness BATTLE.COMMAND.OPTION_AND_NEXT_TURN
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-command-halt-grovel spell.invocation-command-drop-held-object spell.invocation-command-approach-route spell.invocation-command-flee-route

import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanValue,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintVariantMappedValue,
  run,
  stateCheck,
  type MbtWitnessLastResult,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  commandUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
  requireResultHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  commandApproachMovementFill,
  commandFleeMovementFill,
  savingThrowOutcomeFill,
  spellAct,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  difficultyClass,
  hasCondition,
  movementFeet,
} from "./battle-runtime-test-support.ts";
import {
  discoverBattleActs,
  endTurn,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
  type BattleActiveEffect,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

const commandOptionNextTurnReplayScenarios = [
  "failed-save-records-pending",
  "follow-grovel",
  "follow-drop",
  "halt-suppresses",
  "halt-end-turn-cleanup",
  "approach-continues",
  "approach-within-five-ends-turn",
  "approach-movement-rejected",
  "approach-no-movement-cleanup",
  "flee-full-movement-ends-turn",
  "flee-partial-movement-rejected",
  "flee-no-movement-cleanup",
  "flee-opportunity-attack-window",
  "flee-opportunity-attack-declined-continuation",
] as const;

const commandOptionNextTurnScenarioNames = [
  "init",
  ...commandOptionNextTurnReplayScenarios,
] as const;

type CommandOptionNextTurnScenario =
  (typeof commandOptionNextTurnScenarioNames)[number];
type CommandOptionNextTurnReplayScenario =
  (typeof commandOptionNextTurnReplayScenarios)[number];

const commandOptionNextTurnScenarioByQuintTag = {
  CommandOptionNextTurnInit: "init",
  CommandFailedSaveRecordsPending: "failed-save-records-pending",
  CommandFollowGrovel: "follow-grovel",
  CommandFollowDrop: "follow-drop",
  CommandHaltSuppresses: "halt-suppresses",
  CommandHaltEndTurnCleanup: "halt-end-turn-cleanup",
  CommandApproachContinues: "approach-continues",
  CommandApproachWithinFiveEndsTurn: "approach-within-five-ends-turn",
  CommandApproachMovementRejected: "approach-movement-rejected",
  CommandApproachNoMovementCleanup: "approach-no-movement-cleanup",
  CommandFleeFullMovementEndsTurn: "flee-full-movement-ends-turn",
  CommandFleePartialMovementRejected: "flee-partial-movement-rejected",
  CommandFleeNoMovementCleanup: "flee-no-movement-cleanup",
  CommandFleeOpportunityAttackWindow: "flee-opportunity-attack-window",
  CommandFleeOpportunityAttackDeclinedContinuation:
    "flee-opportunity-attack-declined-continuation",
} as const satisfies Readonly<Record<string, CommandOptionNextTurnScenario>>;

const pendingCommandOptions = [
  "none",
  "grovel",
  "halt",
  "drop",
  "approach",
  "flee",
] as const;
type PendingCommandOption = (typeof pendingCommandOptions)[number];

type CommandOptionNextTurnProjection = {
  readonly scenario: CommandOptionNextTurnScenario;
  readonly lastResult: MbtWitnessLastResult;
  readonly targetProne: boolean;
  readonly targetEffectCount: number;
  readonly actionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly movementSpentFeet: number;
  readonly currentActor: "Fighter" | "Goblin";
  readonly pendingCommandOption: PendingCommandOption;
  readonly droppedObjectCount: number;
  readonly reactionWindowOpen: boolean;
  readonly haltSuppressed: boolean;
};

type RuntimeCommandSubject = Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand" }
>;
type RuntimeCommandAct = ReturnType<typeof discoverBattleActs>[number] & {
  readonly subject: RuntimeCommandSubject;
};

const initialProjection: CommandOptionNextTurnProjection = {
  scenario: "init",
  lastResult: "init",
  targetProne: false,
  targetEffectCount: 0,
  actionAvailable: true,
  bonusActionAvailable: true,
  movementSpentFeet: 0,
  currentActor: "Fighter",
  pendingCommandOption: "none",
  droppedObjectCount: 0,
  reactionWindowOpen: false,
  haltSuppressed: false,
};

const driverSchema = {
  init: {},
  doFailedSaveRecordsPending: {},
  doFollowGrovel: {},
  doFollowDrop: {},
  doHaltSuppresses: {},
  doHaltEndTurnCleanup: {},
  doApproachContinues: {},
  doApproachWithinFiveEndsTurn: {},
  doApproachMovementRejected: {},
  doApproachNoMovementCleanup: {},
  doFleeFullMovementEndsTurn: {},
  doFleePartialMovementRejected: {},
  doFleeNoMovementCleanup: {},
  doFleeOpportunityAttackWindow: {},
  doFleeOpportunityAttackDeclinedContinuation: {},
  step: {},
} as const;

function createDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection;

    function reset(): void {
      projection = initialProjection;
    }

    function replay(scenario: CommandOptionNextTurnReplayScenario): void {
      projection = applyScenario(scenario);
    }

    function replayNext(): void {
      const currentIndex = commandOptionNextTurnScenarioNames.indexOf(
        projection.scenario,
      );
      const nextScenario = commandOptionNextTurnScenarioNames[currentIndex + 1];
      if (nextScenario !== undefined && nextScenario !== "init") {
        replay(nextScenario);
      }
    }

    return {
      init: reset,
      doFailedSaveRecordsPending: () => replay("failed-save-records-pending"),
      doFollowGrovel: () => replay("follow-grovel"),
      doFollowDrop: () => replay("follow-drop"),
      doHaltSuppresses: () => replay("halt-suppresses"),
      doHaltEndTurnCleanup: () => replay("halt-end-turn-cleanup"),
      doApproachContinues: () => replay("approach-continues"),
      doApproachWithinFiveEndsTurn: () =>
        replay("approach-within-five-ends-turn"),
      doApproachMovementRejected: () => replay("approach-movement-rejected"),
      doApproachNoMovementCleanup: () => replay("approach-no-movement-cleanup"),
      doFleeFullMovementEndsTurn: () => replay("flee-full-movement-ends-turn"),
      doFleePartialMovementRejected: () =>
        replay("flee-partial-movement-rejected"),
      doFleeNoMovementCleanup: () => replay("flee-no-movement-cleanup"),
      doFleeOpportunityAttackWindow: () =>
        replay("flee-opportunity-attack-window"),
      doFleeOpportunityAttackDeclinedContinuation: () =>
        replay("flee-opportunity-attack-declined-continuation"),
      step: replayNext,
      getState: () => projection,
    };
  });
}

const commandOptionNextTurnStateCheck = stateCheck(
  normalizeQuintState,
  compareState,
);

describe("Command option and next-turn MBT", () => {
  it(
    "projects failed-save pending effects and RAW option consequences",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-command-option-next-turn.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(
          commandOptionNextTurnReplayScenarios.length,
        ),
        stateCheck: commandOptionNextTurnStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function applyScenario(
  scenario: CommandOptionNextTurnReplayScenario,
): CommandOptionNextTurnProjection {
  const applicators = {
    "failed-save-records-pending": () =>
      commandCastScenario("grovel", scenario),
    "follow-grovel": commandGrovelScenario,
    "follow-drop": commandDropScenario,
    "halt-suppresses": commandHaltScenario,
    "halt-end-turn-cleanup": commandHaltEndTurnCleanupScenario,
    "approach-continues": commandApproachContinuesScenario,
    "approach-within-five-ends-turn": commandApproachWithinFiveScenario,
    "approach-movement-rejected": commandApproachMovementRejectedScenario,
    "approach-no-movement-cleanup": commandApproachNoMovementScenario,
    "flee-full-movement-ends-turn": commandFleeScenario,
    "flee-partial-movement-rejected": commandFleePartialRejectedScenario,
    "flee-no-movement-cleanup": commandFleeNoMovementScenario,
    "flee-opportunity-attack-window": commandFleeOpportunityAttackScenario,
    "flee-opportunity-attack-declined-continuation":
      commandFleeOpportunityAttackDeclinedScenario,
  } satisfies Record<
    CommandOptionNextTurnReplayScenario,
    () => CommandOptionNextTurnProjection
  >;
  return applicators[scenario]();
}

function commandCastScenario(
  option: CommandOptionFillValue,
  scenario: CommandOptionNextTurnReplayScenario,
): CommandOptionNextTurnProjection {
  const cast = castCommand(option);
  return projectState({
    state: cast.state,
    scenario,
    targetId: spellTargetId,
    result: cast,
  });
}

function commandGrovelScenario(): CommandOptionNextTurnProjection {
  const targetTurn = commandTargetTurn("grovel");
  const command = requireRuntimeCommand(targetTurn, "commandGrovel");
  const grovelled = requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: command.subject,
      fills: [],
    }),
  );
  return projectState({
    state: grovelled.state,
    scenario: "follow-grovel",
    targetId: spellTargetId,
    result: grovelled,
  });
}

function commandDropScenario(): CommandOptionNextTurnProjection {
  const targetTurn = commandTargetTurn("drop", {
    targetAttack: zeroAbilityWeaponAttack("weapon_longsword"),
  });
  const command = requireRuntimeCommand(targetTurn, "commandDrop");
  const dropped = requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: command.subject,
      fills: [],
    }),
  );
  return projectState({
    state: dropped.state,
    scenario: "follow-drop",
    targetId: spellTargetId,
    result: dropped,
    droppedObjectCount: dropped.droppedObjects?.length ?? 0,
  });
}

function commandHaltScenario(): CommandOptionNextTurnProjection {
  const targetTurn = commandTargetTurn("halt");
  return projectState({
    state: targetTurn,
    scenario: "halt-suppresses",
    targetId: spellTargetId,
    result: { tag: "resolved" },
  });
}

function commandHaltEndTurnCleanupScenario(): CommandOptionNextTurnProjection {
  const targetTurn = commandTargetTurn("halt");
  const ended = requireResolved(
    endTurn({ state: targetTurn, actorId: spellTargetId }),
  );
  return projectState({
    state: ended.state,
    scenario: "halt-end-turn-cleanup",
    targetId: spellTargetId,
    result: ended,
  });
}

function commandApproachContinuesScenario(): CommandOptionNextTurnProjection {
  const targetTurn = commandTargetTurn("approach");
  const command = requireRuntimeCommand(targetTurn, "commandApproach");
  const movement = requireHole(command.initialHoles, "movement");
  const approached = requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: command.subject,
      fills: [
        commandApproachMovementFill(movement, {
          movementCostFeet: 10,
          movedWithinFiveFeetOfCaster: false,
        }),
      ],
    }),
  );
  return projectState({
    state: approached.state,
    scenario: "approach-continues",
    targetId: spellTargetId,
    result: approached,
  });
}

function commandApproachWithinFiveScenario(): CommandOptionNextTurnProjection {
  const targetTurn = commandTargetTurn("approach");
  const command = requireRuntimeCommand(targetTurn, "commandApproach");
  const movement = requireHole(command.initialHoles, "movement");
  const approached = requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: command.subject,
      fills: [
        commandApproachMovementFill(movement, {
          movementCostFeet: 10,
          movedWithinFiveFeetOfCaster: true,
        }),
      ],
    }),
  );
  return projectState({
    state: approached.state,
    scenario: "approach-within-five-ends-turn",
    targetId: spellTargetId,
    result: approached,
  });
}

function commandApproachMovementRejectedScenario(): CommandOptionNextTurnProjection {
  const targetTurn = commandTargetTurn("approach");
  const command = requireRuntimeCommand(targetTurn, "commandApproach");
  const movement = requireHole(command.initialHoles, "movement");
  const rejected = resolveBattleSubject({
    state: targetTurn,
    subject: command.subject,
    fills: [
      commandApproachMovementFill(movement, {
        movementCostFeet: 35,
        movedWithinFiveFeetOfCaster: false,
      }),
    ],
  });
  if (rejected.tag !== "invalid" || rejected.reason !== "invalidFill") {
    throw new Error(
      "Expected over-budget Command Approach movement to be rejected.",
    );
  }
  return projectState({
    state: targetTurn,
    scenario: "approach-movement-rejected",
    targetId: spellTargetId,
    result: rejected,
  });
}

function commandApproachNoMovementScenario(): CommandOptionNextTurnProjection {
  const targetTurn = grappledByCaster(commandTargetTurn("approach"));
  const command = requireRuntimeCommand(targetTurn, "commandApproach");
  const approached = requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: command.subject,
      fills: [],
    }),
  );
  return projectState({
    state: approached.state,
    scenario: "approach-no-movement-cleanup",
    targetId: spellTargetId,
    result: approached,
  });
}

function commandFleeScenario(): CommandOptionNextTurnProjection {
  const targetTurn = commandTargetTurn("flee");
  const command = requireRuntimeCommand(targetTurn, "commandFlee");
  const movement = requireHole(command.initialHoles, "movement");
  const fled = requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: command.subject,
      fills: [
        commandFleeMovementFill(movement, {
          movementCostFeet: 30,
          provokedOpportunityAttacks: [],
        }),
      ],
    }),
  );
  return projectState({
    state: fled.state,
    scenario: "flee-full-movement-ends-turn",
    targetId: spellTargetId,
    result: fled,
  });
}

function commandFleePartialRejectedScenario(): CommandOptionNextTurnProjection {
  const targetTurn = commandTargetTurn("flee");
  const command = requireRuntimeCommand(targetTurn, "commandFlee");
  const movement = requireHole(command.initialHoles, "movement");
  const rejected = resolveBattleSubject({
    state: targetTurn,
    subject: command.subject,
    fills: [
      commandFleeMovementFill(movement, {
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
  if (rejected.tag !== "invalid" || rejected.reason !== "invalidFill") {
    throw new Error("Expected partial Command Flee movement to be rejected.");
  }
  return projectState({
    state: targetTurn,
    scenario: "flee-partial-movement-rejected",
    targetId: spellTargetId,
    result: rejected,
  });
}

function commandFleeNoMovementScenario(): CommandOptionNextTurnProjection {
  const targetTurn = grappledByCaster(commandTargetTurn("flee"));
  const command = requireRuntimeCommand(targetTurn, "commandFlee");
  const fled = requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: command.subject,
      fills: [],
    }),
  );
  return projectState({
    state: fled.state,
    scenario: "flee-no-movement-cleanup",
    targetId: spellTargetId,
    result: fled,
  });
}

function commandFleeOpportunityAttackScenario(): CommandOptionNextTurnProjection {
  const fled = commandFleeOpportunityAttackWindow();
  return projectState({
    state: fled.state,
    scenario: "flee-opportunity-attack-window",
    targetId: spellTargetId,
    result: fled,
  });
}

function commandFleeOpportunityAttackDeclinedScenario(): CommandOptionNextTurnProjection {
  const fled = commandFleeOpportunityAttackWindow();
  const reaction = requireResultHole(fled, "interruptDecision");
  const declined = requireResolved(
    resolveBattleInterrupt({
      state: fled.state,
      fill: interruptDecisionFill(reaction, {
        kind: "decline",
        responderId: spellCasterId,
      }),
    }),
  );
  return projectState({
    state: declined.state,
    scenario: "flee-opportunity-attack-declined-continuation",
    targetId: spellTargetId,
    result: declined,
  });
}

function commandFleeOpportunityAttackWindow(): Extract<
  BattleResolutionResult,
  { readonly tag: "needsHoles" }
> {
  const targetTurn = commandTargetTurn("flee");
  const command = requireRuntimeCommand(targetTurn, "commandFlee");
  const movement = requireHole(command.initialHoles, "movement");
  const fled = resolveBattleSubject({
    state: targetTurn,
    subject: command.subject,
    fills: [
      commandFleeMovementFill(movement, {
        movementCostFeet: 30,
        provokedOpportunityAttacks: [
          { reactorId: spellCasterId, attackName: "Unarmed Strike" },
        ],
      }),
    ],
  });
  const reaction = requireResultHole(fled, "interruptDecision");
  if (reaction.trigger !== "opportunityAttack" || fled.tag !== "needsHoles") {
    throw new Error("Expected Command Flee to open an opportunity attack.");
  }
  return fled;
}

type CommandOptionFillValue = Extract<
  BattleFill,
  { readonly kind: "commandOptionChoice" }
>["value"];

function commandTargetTurn(
  option: CommandOptionFillValue,
  battleInput: Partial<Parameters<typeof spellBattle>[0]> = {},
): BattleState {
  const cast = castCommand(option, battleInput);
  return requireResolved(endTurn({ state: cast.state, actorId: spellCasterId }))
    .state;
}

function castCommand(
  option: CommandOptionFillValue,
  battleInput: Partial<Parameters<typeof spellBattle>[0]> = {},
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const state = spellBattle({
    ...battleInput,
    preparedSpells: [spellRecord(commandUnitId)],
    spellSlots: [{ spellLevel: 1, count: 1 }],
  });
  const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
  const target = requireHole(act.initialHoles, "spellTargetList");
  const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
  const targetSelection = spellTargetListFill(
    target,
    spellCasterId,
    commandUnitId,
    [spellTargetId],
  );
  const optionSelection: Extract<
    BattleFill,
    { readonly kind: "commandOptionChoice" }
  > = {
    kind: "commandOptionChoice",
    holeId: commandOption.holeId,
    value: option,
  };
  const savingThrow = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetSelection, optionSelection],
    }),
    "savingThrowOutcome",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetSelection,
        optionSelection,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    }),
  );
}

function grappledByCaster(state: BattleState): BattleState {
  return {
    ...state,
    grapples: [
      {
        grapplerId: spellCasterId,
        targetId: spellTargetId,
        escapeDc: difficultyClass(12),
        reachFeet: movementFeet(5),
        hand: "left",
      },
    ],
  };
}

function requireRuntimeCommand(
  state: BattleState,
  command: RuntimeCommandSubject["command"],
): RuntimeCommandAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is RuntimeCommandAct =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === command,
  );
  if (act === undefined) {
    throw new Error(`Expected runtime command ${command}.`);
  }
  return act;
}

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
}

function projectState(input: {
  readonly state: BattleState;
  readonly scenario: CommandOptionNextTurnReplayScenario;
  readonly targetId: CombatantId;
  readonly result: Pick<BattleResolutionResult, "tag">;
  readonly droppedObjectCount?: number;
}): CommandOptionNextTurnProjection {
  const target = requireCombatant(input.state, input.targetId);
  const snapshot = snapshotBattle(input.state);
  const targetSnapshot = snapshot.combatants.find(
    (combatant) => combatant.combatantId === input.targetId,
  );
  if (targetSnapshot === undefined) {
    throw new Error(`Expected target snapshot ${input.targetId}.`);
  }
  return {
    scenario: input.scenario,
    lastResult: lastResult(input.result),
    targetProne: hasCondition(target.conditions, "prone"),
    targetEffectCount: target.activeEffects.length,
    actionAvailable: snapshot.turn.actionResources.length > 0,
    bonusActionAvailable: snapshot.turn.bonusActionAvailable,
    movementSpentFeet: Number(targetSnapshot.movement.spentFeet),
    currentActor: actorName(snapshot.currentActorId),
    pendingCommandOption: pendingCommandOption(target.activeEffects),
    droppedObjectCount: input.droppedObjectCount ?? 0,
    reactionWindowOpen: input.state.interruptStack.length > 0,
    haltSuppressed: input.state.currentTurnResources.commandHalt !== null,
  };
}

function lastResult(
  result: Pick<BattleResolutionResult, "tag">,
): MbtWitnessLastResult {
  if (result.tag === "needsHoles") return "needsHoles";
  if (result.tag === "invalid") return "invalid";
  return "resolved";
}

function actorName(
  actorId: CombatantId,
): CommandOptionNextTurnProjection["currentActor"] {
  if (actorId === spellCasterId) return "Fighter";
  if (actorId === spellTargetId) return "Goblin";
  throw new Error(`Unexpected actor id ${actorId}.`);
}

function pendingCommandOption(
  effects: readonly BattleActiveEffect[],
): PendingCommandOption {
  const effect = effects.find(
    (candidate) => candidate.kind === "commandPending",
  );
  return effect?.kind === "commandPending" ? effect.option : "none";
}

function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved result, got ${result.tag}.`);
  }
  return result;
}

function normalizeQuintState(raw: unknown): CommandOptionNextTurnProjection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Command option state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  const protocol = decodeWitnessProtocolState({
    state,
    noInvalidReason: "none",
    protocolField: "qProtocol",
    decodeHole: commandOptionNextTurnProtocolHole,
  });
  return {
    scenario: quintVariantMappedValue(
      state["qScenario"],
      "qScenario",
      commandOptionNextTurnScenarioByQuintTag,
      "Command option next-turn scenario",
    ),
    lastResult: protocol.lastResult,
    targetProne: booleanValue(state["qTargetProne"], "qTargetProne"),
    targetEffectCount: numberFromQuintInt(
      state["qTargetEffectCount"],
      "qTargetEffectCount",
    ),
    actionAvailable: booleanValue(
      state["qActionAvailable"],
      "qActionAvailable",
    ),
    bonusActionAvailable: booleanValue(
      state["qBonusActionAvailable"],
      "qBonusActionAvailable",
    ),
    movementSpentFeet: numberFromQuintInt(
      state["qMovementSpentFeet"],
      "qMovementSpentFeet",
    ),
    currentActor: currentActorField(state["qCurrentActor"]),
    pendingCommandOption: pendingCommandOptionField(
      state["qPendingCommandOption"],
    ),
    droppedObjectCount: numberFromQuintInt(
      state["qDroppedObjectCount"],
      "qDroppedObjectCount",
    ),
    reactionWindowOpen: booleanValue(
      state["qReactionWindowOpen"],
      "qReactionWindowOpen",
    ),
    haltSuppressed: booleanValue(state["qHaltSuppressed"], "qHaltSuppressed"),
  };
}

function compareState(
  runtime: CommandOptionNextTurnProjection,
  quint: CommandOptionNextTurnProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }
  return true;
}

function currentActorField(
  raw: unknown,
): CommandOptionNextTurnProjection["currentActor"] {
  if (raw === "Fighter" || raw === "Goblin") return raw;
  throw new Error(`Unknown current actor ${String(raw)}.`);
}

function pendingCommandOptionField(raw: unknown): PendingCommandOption {
  if (typeof raw === "string" && isPendingCommandOption(raw)) {
    return raw;
  }
  throw new Error(`Unknown pending Command option ${String(raw)}.`);
}

function isPendingCommandOption(raw: string): raw is PendingCommandOption {
  return pendingCommandOptions.some((option) => option === raw);
}

function commandOptionNextTurnProtocolHole(raw: unknown): string {
  if (typeof raw === "string") return raw;
  throw new Error(`Unknown Command option protocol hole ${String(raw)}.`);
}
