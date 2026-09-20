import { battleResolutionHolesForTest } from "./battle-runtime.test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-cloudkill-area-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { Match, Option, Schema } from "effect";
import { Hp, Round } from "@dnd/shared/types";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import cloudkillInput from "../../surface/content/cloudkill.json";
import {
  battleAreaId,
  type BattleEffectExecutionRef,
  type BattleProcedureExecutionRef,
  type CombatantId,
} from "./identity.ts";
import type {
  BattleActiveEffect,
  BattleHole,
  BattlePersistentAreaSourceTurnTranslationHole,
  BattleStartTurnOccurrenceOrderHole,
  BattleState,
} from "./battle-state-execution.ts";
import type { BattleMechanicalHole } from "./battle-mechanical-frontier.ts";
import type { SpellProcedureExecution } from "./character-execution.ts";
import type { CharacterProcedureBinding } from "./character-execution-vocabulary.ts";
import type {
  PersistentAreaSaveConditionSpellProcedureExecution,
  SourceTurnTranslationPersistentAreaSaveDamageSpellProcedureExecution,
} from "./procedure-execution/spell-procedure-execution.ts";
import {
  BattleCheckpointFrontierEnvelopeSchema,
  BattleFillSchema,
  BattleHoleSchema,
} from "./battle-reducer/battle-codecs.ts";
import {
  battlePendingTransactionEnvelopeForSession,
  battlePendingTransactionView,
  settleBattleRuntimeTransaction,
  type BattleRuntimeTransactionResult,
} from "./battle-runtime-transaction.ts";
import {
  cloudkillAreaId,
  cloudkillUnitId,
  greaseAreaId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  cloudkillAreaFill,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";

import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  combatantId,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  resolveBattleInterrupt,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";
import {
  damageRollFillWithGroups,
  interruptDecisionFill,
  requireHole,
  requireResultHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { allocateBattleEffectExecutionRefForCreature } from "./effect-execution-ref.ts";
import { updateCombatantWithActiveEffectOccurrence } from "./battle-reducer/turn-boundary-lifecycle.ts";
import {
  attackRollFill,
  battleFrontierInterruptDecisionForState,
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
  concentrationSavingThrowFill,
  damageRollFill,
  reactionChoiceWithSubject,
  targetFill,
} from "./battle-runtime.test-support.ts";

type SourceTurnTranslationPersistentAreaSaveDamageEffect = Extract<
  BattleActiveEffect,
  {
    readonly kind: "persistentAreaSaveDamage";
    readonly lifecycle: "sourceTurnTranslation";
  }
>;
import {
  readyTargetRayOfFrost,
  spellBattleWithTargetRayOfFrost,
} from "./unit-profile-admission-spell-battle.test-support.ts";

const cloudkillSecondaryTargetId = combatantId("cloudkill-secondary-target");

type NeedsHolesResult = Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "needsHoles" }
>;

type NeedsHolesTransactionResult = Extract<
  BattleRuntimeTransactionResult,
  { readonly tag: "needsHoles" }
>;

function requireTransactionNeedsHoles(
  result: BattleRuntimeTransactionResult,
  context: string,
): NeedsHolesTransactionResult {
  if (result.tag !== "needsHoles") {
    throw new Error(
      `Expected ${context} to need holes, got ${result.tag}${
        result.tag === "invalid" ? `: ${result.resolution.message}` : ""
      }.`,
    );
  }
  return result;
}

function requireTransactionResolutionHole<
  Kind extends BattleMechanicalHole["kind"],
>(result: NeedsHolesTransactionResult, kind: Kind) {
  const frontier = result.resolution.envelope.frontier;
  const holes =
    frontier.kind === "interruptDecision"
      ? [frontier.decisionHole]
      : frontier.holes;
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: Kind }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} resolution hole in transaction result.`);
  }
  return hole;
}

function requireTransactionEnvelope(result: NeedsHolesTransactionResult) {
  const envelope = battlePendingTransactionEnvelopeForSession(
    result.transaction,
    result.resolution.session,
  );
  if (envelope.tag !== "valid") {
    throw new Error(
      `Expected a valid transaction envelope, got ${envelope.tag}.`,
    );
  }
  return envelope.envelope;
}

function transactionSubject(result: NeedsHolesTransactionResult) {
  const view = battlePendingTransactionView(result.transaction);
  if (Option.isNone(view)) {
    throw new Error("Expected an owned pending transaction.");
  }
  return view.value.subject;
}

function ordinaryReplaySubject(result: NeedsHolesResult) {
  if (result.frontier.kind !== "holes") {
    throw new Error("Expected an ordinary holes frontier.");
  }
  return result.frontier.replaySubject;
}

function withSecondCloudkillMovement(state: BattleState): BattleState {
  for (const [combatantId, combatant] of state.combatants) {
    const effect = combatant.activeEffects.find(
      (
        candidate,
      ): candidate is Extract<
        BattleActiveEffect,
        { readonly kind: "persistentAreaSaveDamage" }
      > => candidate.kind === "persistentAreaSaveDamage",
    );
    if (effect === undefined) continue;
    const allocation = allocateBattleEffectExecutionRefForCreature({
      owner: combatant,
    });
    if (allocation.owner.origin.kind !== "character") {
      throw new Error("Expected the Cloudkill source to be a character.");
    }
    const sourceBinding =
      allocation.owner.origin.execution.procedureBindings.find(
        (binding) => binding.procedureRef === effect.sourceProcedureRef,
      );
    if (sourceBinding?.procedure.kind !== "spellInvocation") {
      throw new Error("Expected the retained Cloudkill procedure binding.");
    }
    const sourceProcedureRef = battleProcedureExecutionRefForTest(
      "second-cloudkill-movement-occurrence",
    );
    return {
      ...state,
      combatants: new Map(state.combatants).set(combatantId, {
        ...allocation.owner,
        origin: {
          ...allocation.owner.origin,
          execution: {
            ...allocation.owner.origin.execution,
            procedureBindings: [
              ...allocation.owner.origin.execution.procedureBindings,
              { ...sourceBinding, procedureRef: sourceProcedureRef },
            ],
          },
        },
        activeEffects: [
          ...allocation.owner.activeEffects,
          {
            ...effect,
            effectRef: allocation.effectRef,
            sourceProcedureRef,
            areaId: battleAreaId("second-cloudkill-movement-area"),
          },
        ],
      }),
    };
  }
  throw new Error("Expected an active Cloudkill effect.");
}

function withCloudkillTranslationDistance(
  state: BattleState,
  distanceFeet: ReturnType<typeof movementFeet>,
): BattleState {
  const source = state.combatants.get(spellCasterId);
  if (source?.origin.kind !== "character") {
    throw new Error("Expected the Cloudkill source character.");
  }
  const effect = source.activeEffects.find(
    (
      candidate,
    ): candidate is SourceTurnTranslationPersistentAreaSaveDamageEffect =>
      candidate.kind === "persistentAreaSaveDamage" &&
      candidate.lifecycle === "sourceTurnTranslation",
  );
  if (effect === undefined) {
    throw new Error("Expected the active Cloudkill effect.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...source,
      origin: {
        ...source.origin,
        execution: {
          ...source.origin.execution,
          procedureBindings: source.origin.execution.procedureBindings.map(
            (binding): CharacterProcedureBinding => {
              if (
                binding.procedureRef !== effect.sourceProcedureRef ||
                binding.procedure.kind !== "spellInvocation" ||
                binding.procedure.execution.procedure !==
                  "persistentAreaSaveDamage" ||
                binding.procedure.execution.lifecycle.kind !==
                  "sourceTurnTranslation"
              ) {
                return binding;
              }
              const execution = binding.procedure
                .execution as SourceTurnTranslationPersistentAreaSaveDamageSpellProcedureExecution;
              return {
                procedureRef: binding.procedureRef,
                procedure: {
                  kind: "spellInvocation",
                  execution: {
                    ...execution,
                    lifecycle: {
                      ...execution.lifecycle,
                      distanceFeet,
                    },
                  },
                },
              };
            },
          ),
        },
      },
    }),
  };
}

type NonTranslatingPersistentAreaLifecycle =
  | "stationary"
  | "collisionReposition"
  | "directedReposition";

function withNonTranslatingCloudkillLifecycle(
  state: BattleState,
  lifecycle: NonTranslatingPersistentAreaLifecycle,
): BattleState {
  const source = state.combatants.get(spellCasterId);
  if (source?.origin.kind !== "character") {
    throw new Error("Expected the Cloudkill source character.");
  }
  const effect = source.activeEffects.find(
    (
      candidate,
    ): candidate is SourceTurnTranslationPersistentAreaSaveDamageEffect =>
      candidate.kind === "persistentAreaSaveDamage" &&
      candidate.lifecycle === "sourceTurnTranslation",
  );
  if (effect === undefined) {
    throw new Error("Expected the active Cloudkill effect.");
  }
  const binding = source.origin.execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === effect.sourceProcedureRef,
  );
  if (
    binding?.procedure.kind !== "spellInvocation" ||
    binding.procedure.execution.procedure !== "persistentAreaSaveDamage"
  ) {
    throw new Error("Expected the retained Cloudkill procedure binding.");
  }
  const retainedExecution = binding.procedure.execution;
  const syntheticLifecycle = Match.value(lifecycle).pipe(
    Match.when("stationary", () => ({ kind: "stationary" }) as const),
    Match.when(
      "collisionReposition",
      () =>
        ({
          kind: "casterActionReposition",
          actionCost: "bonusAction",
          movedAreaOperation: "saveDamage",
          collisionDisposition: "stopAndAffectAdjacent",
        }) as const,
    ),
    Match.when(
      "directedReposition",
      () =>
        ({
          kind: "casterActionReposition",
          actionCost: "magicAction",
          movedAreaOperation: "saveDamage",
          collisionDisposition: "ignoreObstacles",
        }) as const,
    ),
    Match.exhaustive,
  );
  const syntheticEffect = Match.value(lifecycle).pipe(
    Match.when(
      "stationary",
      () => ({ ...effect, lifecycle: "stationary" }) as const,
    ),
    Match.when("collisionReposition", () => {
      const {
        appearanceOccurrence: _appearanceOccurrence,
        savedThisTurn: _savedThisTurn,
        ...effectBase
      } = effect;
      return {
        ...effectBase,
        lifecycle: "collisionReposition",
      } as const;
    }),
    Match.when("directedReposition", () => {
      const { appearanceOccurrence: _appearanceOccurrence, ...effectBase } =
        effect;
      return {
        ...effectBase,
        lifecycle: "directedReposition",
        shapeShiftSuppressed: [],
      } as const;
    }),
    Match.exhaustive,
  ) as BattleActiveEffect;
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...source,
      activeEffects: source.activeEffects.map((candidate) =>
        candidate.effectRef === effect.effectRef ? syntheticEffect : candidate,
      ),
      origin: {
        ...source.origin,
        execution: {
          ...source.origin.execution,
          procedureBindings: source.origin.execution.procedureBindings.map(
            (candidate): CharacterProcedureBinding =>
              candidate.procedureRef === effect.sourceProcedureRef
                ? {
                    procedureRef: binding.procedureRef,
                    procedure: {
                      kind: "spellInvocation",
                      execution: {
                        ...retainedExecution,
                        lifecycle: syntheticLifecycle,
                      } as SpellProcedureExecution,
                    },
                  }
                : candidate,
          ),
        },
      },
    }),
  };
}

function withGreaseGroundHazard(state: BattleState): {
  readonly state: BattleState;
  readonly effectRef: BattleEffectExecutionRef;
} {
  const source = state.combatants.get(spellCasterId);
  if (source === undefined) {
    throw new Error("Expected the persistent-spell source.");
  }
  const cloudkill = source.activeEffects.find(
    (effect) => effect.kind === "persistentAreaSaveDamage",
  );
  if (cloudkill?.kind !== "persistentAreaSaveDamage") {
    throw new Error("Expected the bound persistent-spell source procedure.");
  }
  if (source.origin.kind !== "character") {
    throw new Error("Expected the persistent-spell source to be a character.");
  }
  const cloudkillBinding = source.origin.execution.procedureBindings.find(
    (binding) => binding.procedureRef === cloudkill.sourceProcedureRef,
  );
  if (
    cloudkillBinding?.procedure.kind !== "spellInvocation" ||
    cloudkillBinding.procedure.execution.procedure !==
      "persistentAreaSaveDamage"
  ) {
    throw new Error("Expected the retained Cloudkill procedure binding.");
  }
  const greaseProcedureRef = battleProcedureExecutionRefForTest(
    `cloudkill-grease-${source.nextEffectOrdinal}`,
  );
  const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
    state,
    occurrences: [
      {
        kind: "activeEffect",
        ownerId: source.combatantId,
        effect: {
          kind: "persistentAreaSaveCondition",
          sourceProcedureRef: greaseProcedureRef,
          sourceCombatantId: spellCasterId,
          areaId: greaseAreaId,
          heightenedSpellTargetDisadvantage: null,
          expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
        },
      },
    ],
  });
  const occurrence = allocated.occurrences[0];
  if (occurrence?.kind !== "activeEffect") {
    throw new Error("Expected the allocated Grease occurrence.");
  }
  const allocatedSource = allocated.state.combatants.get(spellCasterId);
  if (allocatedSource?.origin.kind !== "character") {
    throw new Error("Expected the allocated Grease source character.");
  }
  return {
    state: {
      ...allocated.state,
      combatants: new Map(allocated.state.combatants).set(spellCasterId, {
        ...allocatedSource,
        origin: {
          ...allocatedSource.origin,
          execution: {
            ...allocatedSource.origin.execution,
            procedureBindings: [
              ...allocatedSource.origin.execution.procedureBindings,
              {
                procedureRef: greaseProcedureRef,
                procedure: {
                  kind: "spellInvocation",
                  execution: {
                    spellRuleFacts:
                      cloudkillBinding.procedure.execution.spellRuleFacts,
                    ability: "dex",
                    access: cloudkillBinding.procedure.execution.access,
                    dc: cloudkillBinding.procedure.execution.dc,
                    durationTicks:
                      cloudkillBinding.procedure.execution.durationTicks,
                    procedure: "persistentAreaSaveCondition",
                    rangeFeet: cloudkillBinding.procedure.execution.rangeFeet,
                    resource: cloudkillBinding.procedure.execution.resource,
                    targeting: {
                      kind: "pointOriginGroundSquare",
                      sideFeet: movementFeet(10),
                    },
                  } satisfies PersistentAreaSaveConditionSpellProcedureExecution,
                },
              },
            ],
          },
        },
      }),
    },
    effectRef: occurrence.effect.effectRef,
  };
}

function withSourceStartTurnDamage(
  state: BattleState,
  sourceKeyOrProcedureRef:
    | string
    | {
        readonly sourceProcedureRef: BattleProcedureExecutionRef;
        readonly sourceCombatantId: CombatantId;
      } = "cloudkill-simultaneous-start-turn-order",
): BattleState {
  const source = state.combatants.get(spellCasterId);
  if (source === undefined) {
    throw new Error("Expected the Cloudkill source.");
  }
  const sourceProcedureRef =
    typeof sourceKeyOrProcedureRef === "string"
      ? battleProcedureExecutionRefForTest(sourceKeyOrProcedureRef)
      : sourceKeyOrProcedureRef.sourceProcedureRef;
  const sourceCombatantId =
    typeof sourceKeyOrProcedureRef === "string"
      ? spellTargetId
      : sourceKeyOrProcedureRef.sourceCombatantId;
  return battleStateWithAllocatedEffectForTest({
    state,
    ownerId: source.combatantId,
    effect: {
      kind: "spellTurnStartDamageAndSave",
      source: "turnBoundaryEffectLifecycle",
      sourceProcedureRef,
      sourceCombatantId,
      damage: { expr: { dice: 1, dieSize: 4 }, damageType: "fire" },
      save: {
        ability: "con",
        dc: { kind: "caster_spell_save_dc" },
        successEnds: "spell",
      },
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
    },
  });
}

function withSourceTurnStartTemporaryHitPoints(
  state: BattleState,
  input: {
    readonly sourceKey?: string;
    readonly amount?: number;
    readonly persistWithoutConcentration?: boolean;
    readonly concentrationCombatantId?: CombatantId;
  } = {},
): BattleState {
  const source = state.combatants.get(spellCasterId);
  if (source === undefined) {
    throw new Error("Expected the Cloudkill source.");
  }
  return battleStateWithAllocatedEffectForTest({
    state,
    ownerId: source.combatantId,
    effect: {
      kind: "turnStartTemporaryHitPoints",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        input.sourceKey ??
          "cloudkill-simultaneous-turn-start-temporary-hit-points",
      ),
      sourceCombatantId: spellTargetId,
      amount: input.amount ?? 3,
      expiresAt: input.persistWithoutConcentration
        ? { kind: "duration", durationTicks: elapsedTimeTicks(10) }
        : {
            kind: "concentration",
            combatantId: input.concentrationCombatantId ?? spellTargetId,
          },
    },
  });
}

function withCloudkillOwnedTurnStartTemporaryHitPoints(
  state: BattleState,
  amount: number,
): BattleState {
  const source = state.combatants.get(spellCasterId);
  const cloudkill = source?.activeEffects.find(
    (effect) => effect.kind === "persistentAreaSaveDamage",
  );
  if (source === undefined || cloudkill === undefined) {
    throw new Error("Expected the Cloudkill source effect.");
  }
  return battleStateWithAllocatedEffectForTest({
    state,
    ownerId: source.combatantId,
    effect: {
      kind: "turnStartTemporaryHitPoints",
      sourceProcedureRef: cloudkill.sourceProcedureRef,
      sourceCombatantId: spellCasterId,
      amount,
      expiresAt: { kind: "concentration", combatantId: spellCasterId },
    },
  });
}

function withCommandGrovel(
  state: BattleState,
  actorId: CombatantId,
): {
  readonly state: BattleState;
  readonly effectRef: Extract<
    BattleActiveEffect,
    { readonly kind: "compelledNextTurnBehavior" }
  >["effectRef"];
} {
  const target = state.combatants.get(actorId);
  if (target === undefined) {
    throw new Error("Expected the Command Grovel target.");
  }
  const effectRef = battleEffectExecutionRefForTest("cloudkill-command-grovel");
  const effect = {
    kind: "compelledNextTurnBehavior",
    effectRef,
    sourceCombatantId: spellCasterId,
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "cloudkill-command-grovel",
    ),
    option: "grovel",
    expiresAt: {
      kind: "endOfTurn",
      combatantId: actorId,
      round: state.initiative.round,
    },
  } as const satisfies BattleActiveEffect;
  return {
    effectRef,
    state: {
      ...state,
      combatants: new Map(state.combatants).set(actorId, {
        ...target,
        activeEffects: [...target.activeEffects, effect],
      }),
    },
  };
}

function withCommandDrop(
  state: BattleState,
  actorId: CombatantId,
): {
  readonly state: BattleState;
  readonly effectRef: Extract<
    BattleActiveEffect,
    { readonly kind: "compelledNextTurnBehavior" }
  >["effectRef"];
} {
  const target = state.combatants.get(actorId);
  if (target === undefined) {
    throw new Error("Expected the Command Drop target.");
  }
  const effectRef = battleEffectExecutionRefForTest("cloudkill-command-drop");
  const effect = {
    kind: "compelledNextTurnBehavior",
    effectRef,
    sourceCombatantId: spellCasterId,
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "cloudkill-command-drop",
    ),
    option: "drop",
    expiresAt: {
      kind: "endOfTurn",
      combatantId: actorId,
      round: state.initiative.round,
    },
  } as const satisfies BattleActiveEffect;
  return {
    effectRef,
    state: {
      ...state,
      combatants: new Map(state.combatants).set(actorId, {
        ...target,
        activeEffects: [...target.activeEffects, effect],
      }),
    },
  };
}

function persistentAreaSourceTurnTranslationFill(
  hole: BattlePersistentAreaSourceTurnTranslationHole,
  affectedCombatantIdsInResolutionOrder: readonly CombatantId[],
) {
  return {
    kind: "persistentAreaSourceTurnTranslation" as const,
    holeId: hole.holeId,
    value: {
      affectedCombatantIdsInResolutionOrder,
    },
  };
}

function startTurnOccurrenceOrderFill(
  hole: BattleStartTurnOccurrenceOrderHole,
  rank: (
    occurrence: BattleStartTurnOccurrenceOrderHole["occurrences"][number],
  ) => number,
) {
  const ordered = [...hole.occurrences].sort(
    (left, right) => rank(left) - rank(right),
  );
  const first = ordered[0];
  const second = ordered[1];
  if (first === undefined || second === undefined) {
    throw new Error("Expected at least two start-turn occurrences.");
  }
  return {
    kind: "startTurnOccurrenceOrder" as const,
    holeId: hole.holeId,
    value: {
      occurrenceIds: [
        first.occurrenceId,
        second.occurrenceId,
        ...ordered.slice(2).map(({ occurrenceId }) => occurrenceId),
      ] as const,
    },
  };
}

function castCloudkill(
  input: {
    readonly targetCanReadyRayOfFrost?: true;
    readonly targetHasLongsword?: true;
    readonly extraTargetIds?: readonly CombatantId[];
  } = {},
) {
  const spell = decodeUnitRecordSync(cloudkillInput);
  if (spell.kind !== "spell") {
    throw new Error("Expected the Cloudkill fixture to decode as a Spell.");
  }
  const session = input.targetCanReadyRayOfFrost
    ? spellBattleWithTargetRayOfFrost({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 5, count: 1 }],
        targetHp: 30,
        targetMaxHp: 30,
        ...(input.targetHasLongsword === true
          ? { targetAttack: zeroAbilityWeaponAttack("weapon_longsword") }
          : {}),
        ...(input.extraTargetIds === undefined
          ? {}
          : {
              extraTargetIds: input.extraTargetIds,
              extraTargetHp: 30,
              extraTargetMaxHp: 30,
            }),
      })
    : spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 5, count: 1 }],
        targetHp: 30,
        targetMaxHp: 30,
        ...(input.targetHasLongsword === true
          ? { targetAttack: zeroAbilityWeaponAttack("weapon_longsword") }
          : {}),
        ...(input.extraTargetIds === undefined
          ? {}
          : {
              extraTargetIds: input.extraTargetIds,
              extraTargetHp: 30,
              extraTargetMaxHp: 30,
            }),
      });
  const act = spellAct({
    session,
    spellId: cloudkillUnitId,
    slotLevel: 5,
  });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [cloudkillAreaFill(area)],
  });
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Cloudkill to resolve: ${JSON.stringify(cast)}`);
  }
  return { session, state: cast.state };
}

function sourceTurnMovementBoundary() {
  const cast = castCloudkill();
  const targetTurn = endTurn({
    state: cast.state,
    actorId: spellCasterId,
  });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected the target turn to start.");
  }
  const movementFrontier = endTurn({
    state: targetTurn.state,
    actorId: spellTargetId,
  });
  if (movementFrontier.tag !== "needsHoles") {
    throw new Error("Expected the Cloudkill movement frontier.");
  }
  return {
    cast,
    boundaryState: targetTurn.state,
    movementHole: requireHole(
      battleResolutionHolesForTest(movementFrontier),
      "persistentAreaSourceTurnTranslation",
    ),
  };
}

function activeCloudkill(
  state: BattleState,
): SourceTurnTranslationPersistentAreaSaveDamageEffect {
  const effect = [...state.combatants.values()]
    .flatMap((combatant) => combatant.activeEffects)
    .find(
      (candidate) =>
        candidate.kind === "persistentAreaSaveDamage" &&
        candidate.lifecycle === "sourceTurnTranslation",
    );
  if (
    effect?.kind !== "persistentAreaSaveDamage" ||
    effect.lifecycle !== "sourceTurnTranslation"
  ) {
    throw new Error("Expected an active Cloudkill effect.");
  }
  return effect as SourceTurnTranslationPersistentAreaSaveDamageEffect;
}

function withOneTickDurationCohort(
  state: BattleState,
  sourceKey: string,
): BattleState {
  const source = state.combatants.get(spellCasterId);
  if (source === undefined) throw new Error("Expected the Cloudkill source.");
  const sourceProcedureRef = battleProcedureExecutionRefForTest(sourceKey);
  return battleStateWithAllocatedEffectOccurrencesForTest({
    state,
    occurrences: [
      {
        kind: "activeEffect",
        ownerId: source.combatantId,
        effect: {
          kind: "turnStartTemporaryHitPoints",
          sourceProcedureRef,
          sourceCombatantId: spellCasterId,
          amount: 1,
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(1),
          },
        },
      },
      {
        kind: "storedLightEmitter",
        ownerId: source.combatantId,
        emitter: {
          kind: "spellLightEmitter",
          sourceProcedureRef,
          sourceCombatantId: spellCasterId,
          attachment: { kind: "combatant", combatantId: spellCasterId },
          emission: { kind: "dim", radiusFeet: movementFeet(10) },
          opaqueCoverInteraction: { kind: "blocksEmission" },
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(1),
          },
        },
      },
    ],
  }).state;
}

function durationCohortEffectRefs(
  state: BattleState,
  sourceKey: string,
): readonly BattleEffectExecutionRef[] {
  const sourceProcedureRef = battleProcedureExecutionRefForTest(sourceKey);
  return [
    ...[...state.combatants.values()].flatMap((combatant) =>
      combatant.activeEffects.flatMap((effect) =>
        "sourceProcedureRef" in effect &&
        effect.sourceProcedureRef === sourceProcedureRef
          ? [effect.effectRef]
          : [],
      ),
    ),
    ...state.lightEmitters.flatMap((emitter) =>
      emitter.sourceProcedureRef === sourceProcedureRef
        ? [emitter.effectRef]
        : [],
    ),
  ];
}

function resolveInterruptedRoundWrapAfterCohortMutation(input: {
  readonly sourceKey: string;
  readonly checkpointState?: (state: BattleState) => BattleState;
  readonly mutateCheckpointState: (state: BattleState) => BattleState;
}): BattleState {
  const cast = castCloudkill({ targetCanReadyRayOfFrost: true });
  const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected the target turn to start.");
  }
  const readied = readyTargetRayOfFrost(
    battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
  );
  const boundaryState =
    input.checkpointState?.(readied.state) ??
    withOneTickDurationCohort(readied.state, input.sourceKey);
  const orderFrontier = endTurn({
    state: boundaryState,
    actorId: spellTargetId,
  });
  const orderFill = startTurnOccurrenceOrderFill(
    requireResultHole(orderFrontier, "startTurnOccurrenceOrder"),
    (occurrence) =>
      occurrence.kind === "persistentAreaSourceTurnTranslation" ? 0 : 1,
  );
  const movementFrontier = endTurn({
    state: boundaryState,
    actorId: spellTargetId,
    fills: [orderFill],
  });
  const movementFill = persistentAreaSourceTurnTranslationFill(
    requireResultHole(movementFrontier, "persistentAreaSourceTurnTranslation"),
    [spellTargetId],
  );
  const saveFrontier = endTurn({
    state: boundaryState,
    actorId: spellTargetId,
    fills: [orderFill, movementFill],
  });
  const saveFill = singleTargetSavingThrowOutcomeFill(
    requireResultHole(saveFrontier, "savingThrowOutcome"),
    spellTargetId,
    false,
  );
  const interrupted = endTurn({
    state: boundaryState,
    actorId: spellTargetId,
    fills: [orderFill, movementFill, saveFill],
  });
  const decisionHole = requireResultHole(interrupted, "interruptDecision");
  if (interrupted.tag !== "needsHoles") {
    throw new Error("Expected the movement save interrupt.");
  }
  const declined = resolveBattleInterrupt({
    state: input.mutateCheckpointState(interrupted.state),
    fill: interruptDecisionFill(decisionHole, {
      kind: "decline",
      responderId: spellTargetId,
    }),
  });
  const damageFill = damageRollFillWithGroups(
    requireResultHole(declined, "rolledDice"),
    [[1, 1, 1, 1, 1]],
  );
  if (declined.tag !== "needsHoles") {
    throw new Error("Expected movement damage.");
  }
  const concentrationFrontier = resolveBattleSubject({
    state: declined.state,
    subject: ordinaryReplaySubject(declined),
    fills: [orderFill, movementFill, saveFill, damageFill],
  });
  const concentrationFill = concentrationSavingThrowFill(
    requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
    true,
  );
  if (concentrationFrontier.tag !== "needsHoles") {
    throw new Error("Expected Concentration save after movement damage.");
  }
  const resolved = resolveBattleSubject({
    state: concentrationFrontier.state,
    subject: ordinaryReplaySubject(concentrationFrontier),
    fills: [orderFill, movementFill, saveFill, damageFill, concentrationFill],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected interrupted round wrap to resolve.");
  }
  return resolved.state;
}

describe("Cloudkill source-turn movement", () => {
  test("ticks only the duration cohort present before a direct round-wrap boundary", () => {
    const cast = castCloudkill();
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const boundaryState = withOneTickDurationCohort(
      targetTurn.state,
      "direct-round-wrap-duration-cohort",
    );
    const orderFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
    });
    const orderFill = startTurnOccurrenceOrderFill(
      requireResultHole(orderFrontier, "startTurnOccurrenceOrder"),
      (occurrence) =>
        occurrence.kind === "persistentAreaSourceTurnTranslation" ? 0 : 1,
    );
    const movementFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill],
    });
    const movementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        movementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [],
    );
    const resolved = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, movementFill],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") return;
    expect(
      resolved.state.combatants
        .get(spellCasterId)
        ?.activeEffects.some(
          (effect) =>
            "sourceProcedureRef" in effect &&
            effect.sourceProcedureRef ===
              battleProcedureExecutionRefForTest(
                "direct-round-wrap-duration-cohort",
              ),
        ),
    ).toBe(false);
    expect(resolved.state.lightEmitters).toEqual([]);
  });

  test("does not age duration state first observed after an interrupted round-wrap occurrence", () => {
    const cast = castCloudkill({ targetCanReadyRayOfFrost: true });
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const movementFrontier = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    const movementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        movementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [spellTargetId],
    );
    const saveFrontier = endTurn({
      state: readied.state,
      actorId: spellTargetId,
      fills: [movementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      spellTargetId,
      false,
    );
    const interrupted = endTurn({
      state: readied.state,
      actorId: spellTargetId,
      fills: [movementFill, saveFill],
    });
    const decisionHole = requireResultHole(interrupted, "interruptDecision");
    if (interrupted.tag !== "needsHoles") {
      throw new Error("Expected the movement save interrupt.");
    }
    const postInterruptState = withOneTickDurationCohort(
      interrupted.state,
      "post-interrupt-round-wrap-duration-state",
    );
    const declined = resolveBattleInterrupt({
      state: postInterruptState,
      fill: interruptDecisionFill(decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    const damageFill = damageRollFillWithGroups(
      requireResultHole(declined, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    if (declined.tag !== "needsHoles") {
      throw new Error("Expected movement damage.");
    }
    const concentrationFrontier = resolveBattleSubject({
      state: declined.state,
      subject: ordinaryReplaySubject(declined),
      fills: [movementFill, saveFill, damageFill],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error("Expected Concentration save after movement damage.");
    }
    const resolved = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: ordinaryReplaySubject(concentrationFrontier),
      fills: [movementFill, saveFill, damageFill, concentrationFill],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") return;
    expect(
      resolved.state.combatants
        .get(spellCasterId)
        ?.activeEffects.find(
          (effect) =>
            "sourceProcedureRef" in effect &&
            effect.sourceProcedureRef ===
              battleProcedureExecutionRefForTest(
                "post-interrupt-round-wrap-duration-state",
              ),
        )?.expiresAt,
    ).toEqual({ kind: "duration", durationTicks: elapsedTimeTicks(1) });
    expect(resolved.state.lightEmitters).toEqual([
      expect.objectContaining({
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "post-interrupt-round-wrap-duration-state",
        ),
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(1),
        },
      }),
    ]);
  });

  test("does not age fresh same-shape duration occurrences that replace the checkpoint cohort", () => {
    const sourceKey = "replaced-round-wrap-duration-cohort";
    let checkpointRefs: readonly BattleEffectExecutionRef[] = [];
    let replacementRefs: readonly BattleEffectExecutionRef[] = [];
    const resolved = resolveInterruptedRoundWrapAfterCohortMutation({
      sourceKey,
      mutateCheckpointState: (state) => {
        checkpointRefs = durationCohortEffectRefs(state, sourceKey);
        const sourceProcedureRef =
          battleProcedureExecutionRefForTest(sourceKey);
        const combatants = new Map(
          [...state.combatants].map(([combatantId, combatant]) => [
            combatantId,
            {
              ...combatant,
              activeEffects: combatant.activeEffects.filter(
                (effect) =>
                  !("sourceProcedureRef" in effect) ||
                  effect.sourceProcedureRef !== sourceProcedureRef,
              ),
            },
          ]),
        );
        const replacement = withOneTickDurationCohort(
          {
            ...state,
            combatants,
            lightEmitters: state.lightEmitters.filter(
              (emitter) => emitter.sourceProcedureRef !== sourceProcedureRef,
            ),
          },
          sourceKey,
        );
        replacementRefs = durationCohortEffectRefs(replacement, sourceKey);
        return replacement;
      },
    });

    expect(checkpointRefs).toHaveLength(2);
    expect(replacementRefs).toHaveLength(2);
    expect(replacementRefs).not.toEqual(checkpointRefs);
    expect(durationCohortEffectRefs(resolved, sourceKey)).toEqual(
      replacementRefs,
    );
    expect(resolved.combatants.get(spellCasterId)?.tempHp).toBe(Hp(0));
  });

  test("does not execute a fresh same-shape damage-and-save occurrence in a removed checkpoint slot", () => {
    const sourceKey = "replaced-round-wrap-damage-save-occurrence";
    let checkpointRef: BattleEffectExecutionRef | undefined;
    let replacementRef: BattleEffectExecutionRef | undefined;
    let checkpointHp: Hp | undefined;
    const resolved = resolveInterruptedRoundWrapAfterCohortMutation({
      sourceKey,
      checkpointState: (state) => {
        checkpointHp = state.combatants.get(spellCasterId)?.hp;
        return withSourceStartTurnDamage(state, sourceKey);
      },
      mutateCheckpointState: (state) => {
        const sourceProcedureRef =
          battleProcedureExecutionRefForTest(sourceKey);
        const source = state.combatants.get(spellCasterId);
        if (source === undefined) {
          throw new Error("Expected the damage-and-save occurrence owner.");
        }
        const checkpointEffect = source.activeEffects.find(
          (effect) =>
            effect.kind === "spellTurnStartDamageAndSave" &&
            effect.sourceProcedureRef === sourceProcedureRef,
        );
        if (checkpointEffect?.kind !== "spellTurnStartDamageAndSave") {
          throw new Error("Expected checkpoint damage-and-save occurrence.");
        }
        checkpointRef = checkpointEffect.effectRef;
        const replacement = withSourceStartTurnDamage(
          {
            ...state,
            combatants: new Map(state.combatants).set(spellCasterId, {
              ...source,
              activeEffects: source.activeEffects.filter(
                (effect) => effect.effectRef !== checkpointEffect.effectRef,
              ),
            }),
          },
          sourceKey,
        );
        replacementRef = replacement.combatants
          .get(spellCasterId)
          ?.activeEffects.find(
            (effect) =>
              effect.kind === "spellTurnStartDamageAndSave" &&
              effect.sourceProcedureRef === sourceProcedureRef,
          )?.effectRef;
        return replacement;
      },
    });

    expect(checkpointRef).toBeDefined();
    expect(replacementRef).toBeDefined();
    expect(replacementRef).not.toBe(checkpointRef);
    expect(resolved.combatants.get(spellCasterId)?.hp).toBe(checkpointHp);
    expect(
      resolved.combatants
        .get(spellCasterId)
        ?.activeEffects.some((effect) => effect.effectRef === replacementRef),
    ).toBe(true);
  });

  test("ages duration occurrences whose checkpoint identity survives state mutation", () => {
    const sourceKey = "mutated-round-wrap-duration-cohort";
    let checkpointRefs: readonly BattleEffectExecutionRef[] = [];
    const resolved = resolveInterruptedRoundWrapAfterCohortMutation({
      sourceKey,
      mutateCheckpointState: (state) => {
        checkpointRefs = durationCohortEffectRefs(state, sourceKey);
        const sourceProcedureRef =
          battleProcedureExecutionRefForTest(sourceKey);
        return {
          ...state,
          combatants: new Map(
            [...state.combatants].map(([combatantId, combatant]) => [
              combatantId,
              {
                ...combatant,
                activeEffects: combatant.activeEffects.map((effect) =>
                  effect.kind === "turnStartTemporaryHitPoints" &&
                  effect.sourceProcedureRef === sourceProcedureRef &&
                  effect.expiresAt.kind === "duration"
                    ? {
                        ...effect,
                        expiresAt: {
                          ...effect.expiresAt,
                          durationTicks: elapsedTimeTicks(2),
                        },
                      }
                    : effect,
                ),
              },
            ]),
          ),
          lightEmitters: state.lightEmitters.map((emitter) =>
            emitter.kind === "spellLightEmitter" &&
            emitter.sourceProcedureRef === sourceProcedureRef &&
            emitter.expiresAt.kind === "duration"
              ? {
                  ...emitter,
                  expiresAt: {
                    ...emitter.expiresAt,
                    durationTicks: elapsedTimeTicks(2),
                  },
                }
              : emitter,
          ),
        };
      },
    });

    expect(checkpointRefs).toHaveLength(2);
    expect(durationCohortEffectRefs(resolved, sourceKey)).toEqual(
      checkpointRefs,
    );
    expect(
      [...resolved.combatants.values()]
        .flatMap((combatant) => combatant.activeEffects)
        .find((effect) => effect.effectRef === checkpointRefs[0])?.expiresAt,
    ).toEqual({ kind: "duration", durationTicks: elapsedTimeTicks(1) });
    expect(
      resolved.lightEmitters.find(
        (emitter) => emitter.effectRef === checkpointRefs[1],
      )?.expiresAt,
    ).toEqual({ kind: "duration", durationTicks: elapsedTimeTicks(1) });
    expect(resolved.combatants.get(spellCasterId)?.tempHp).toBe(Hp(1));
  });

  test("lets the turn owner order simultaneous source-start damage and Cloudkill movement", () => {
    function resolveOrdering(
      choice: "persistentAreaSourceTurnTranslation" | "startTurnEffects",
    ) {
      const cast = castCloudkill();
      const targetTurn = endTurn({
        state: withSourceStartTurnDamage(cast.state),
        actorId: spellCasterId,
      });
      if (targetTurn.tag !== "resolved") {
        throw new Error("Expected the target turn to start.");
      }
      const orderFrontier = endTurn({
        state: targetTurn.state,
        actorId: spellTargetId,
      });
      expect(orderFrontier).toMatchObject({
        tag: "needsHoles",
        frontier: {
          kind: "holes",
          holes: [
            {
              kind: "startTurnOccurrenceOrder",
              actorId: spellCasterId,
              occurrences: [
                expect.objectContaining({
                  kind: "spellTurnStartDamageAndSave",
                }),
                expect.objectContaining({
                  kind: "persistentAreaSourceTurnTranslation",
                }),
              ],
            },
          ],
        },
      });
      const orderFill = startTurnOccurrenceOrderFill(
        requireResultHole(orderFrontier, "startTurnOccurrenceOrder"),
        (occurrence) =>
          occurrence.kind === "persistentAreaSourceTurnTranslation"
            ? choice === "persistentAreaSourceTurnTranslation"
              ? 0
              : 1
            : choice === "persistentAreaSourceTurnTranslation"
              ? 1
              : 0,
      );
      const orderHole = requireResultHole(
        orderFrontier,
        "startTurnOccurrenceOrder",
      );
      const firstOccurrence = orderHole.occurrences[0];
      expect(
        endTurn({
          state: targetTurn.state,
          actorId: spellTargetId,
          fills: [
            {
              kind: "startTurnOccurrenceOrder",
              holeId: orderHole.holeId,
              value: {
                occurrenceIds: [
                  firstOccurrence.occurrenceId,
                  firstOccurrence.occurrenceId,
                ],
              },
            },
          ],
        }),
      ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
      expect(
        Schema.decodeUnknownSync(BattleHoleSchema)(
          Schema.encodeSync(BattleHoleSchema)(orderHole),
        ),
      ).toEqual(orderHole);
      expect(
        Schema.decodeUnknownSync(BattleFillSchema)(
          Schema.encodeSync(BattleFillSchema)(orderFill),
        ),
      ).toEqual(orderFill);
      if (choice === "persistentAreaSourceTurnTranslation") {
        return { state: targetTurn.state, fills: [orderFill] };
      }
      const startEffectFrontier = endTurn({
        state: targetTurn.state,
        actorId: spellTargetId,
        fills: [orderFill],
      });
      const startDamageFill = damageRollFillWithGroups(
        requireResultHole(startEffectFrontier, "rolledDice"),
        [[4]],
      );
      const concentrationFrontier = endTurn({
        state: targetTurn.state,
        actorId: spellTargetId,
        fills: [orderFill, startDamageFill],
      });
      const concentrationFill = concentrationSavingThrowFill(
        requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
        false,
      );
      const startSaveFrontier = endTurn({
        state: targetTurn.state,
        actorId: spellTargetId,
        fills: [orderFill, startDamageFill, concentrationFill],
      });
      const startSaveFill = singleTargetSavingThrowOutcomeFill(
        requireResultHole(startSaveFrontier, "savingThrowOutcome"),
        spellCasterId,
        false,
      );
      return {
        state: targetTurn.state,
        fills: [orderFill, startDamageFill, concentrationFill, startSaveFill],
      };
    }

    const startEffectsFirst = resolveOrdering("startTurnEffects");
    const startEffectsFirstResult = endTurn({
      state: startEffectsFirst.state,
      actorId: spellTargetId,
      fills: startEffectsFirst.fills,
    });
    expect(startEffectsFirstResult).toMatchObject({ tag: "resolved" });
    if (startEffectsFirstResult.tag !== "resolved") return;
    expect(
      [...startEffectsFirstResult.state.combatants.values()].some((combatant) =>
        combatant.activeEffects.some(
          (effect) => effect.kind === "persistentAreaSaveDamage",
        ),
      ),
    ).toBe(false);
    expect(
      startEffectsFirstResult.state.combatants.get(spellTargetId)?.hp,
    ).toBe(30);

    const movementFirst = resolveOrdering(
      "persistentAreaSourceTurnTranslation",
    );
    const movementFrontier = endTurn({
      state: movementFirst.state,
      actorId: spellTargetId,
      fills: movementFirst.fills,
    });
    const movementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        movementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [spellTargetId],
    );
    const cloudkillSaveFrontier = endTurn({
      state: movementFirst.state,
      actorId: spellTargetId,
      fills: [...movementFirst.fills, movementFill],
    });
    const cloudkillSaveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(cloudkillSaveFrontier, "savingThrowOutcome"),
      spellTargetId,
      true,
    );
    const cloudkillDamageFrontier = endTurn({
      state: movementFirst.state,
      actorId: spellTargetId,
      fills: [...movementFirst.fills, movementFill, cloudkillSaveFill],
    });
    const cloudkillDamageFill = damageRollFillWithGroups(
      requireResultHole(cloudkillDamageFrontier, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    const sourceDamageFrontier = endTurn({
      state: movementFirst.state,
      actorId: spellTargetId,
      fills: [
        ...movementFirst.fills,
        movementFill,
        cloudkillSaveFill,
        cloudkillDamageFill,
      ],
    });
    const sourceDamageFill = damageRollFillWithGroups(
      requireResultHole(sourceDamageFrontier, "rolledDice"),
      [[4]],
    );
    const sourceConcentrationFrontier = endTurn({
      state: movementFirst.state,
      actorId: spellTargetId,
      fills: [
        ...movementFirst.fills,
        movementFill,
        cloudkillSaveFill,
        cloudkillDamageFill,
        sourceDamageFill,
      ],
    });
    const sourceConcentrationFill = concentrationSavingThrowFill(
      requireResultHole(
        sourceConcentrationFrontier,
        "concentrationSavingThrow",
      ),
      false,
    );
    const sourceSaveFrontier = endTurn({
      state: movementFirst.state,
      actorId: spellTargetId,
      fills: [
        ...movementFirst.fills,
        movementFill,
        cloudkillSaveFill,
        cloudkillDamageFill,
        sourceDamageFill,
        sourceConcentrationFill,
      ],
    });
    const sourceSaveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(sourceSaveFrontier, "savingThrowOutcome"),
      spellCasterId,
      false,
    );
    const movementFirstResult = endTurn({
      state: movementFirst.state,
      actorId: spellTargetId,
      fills: [
        ...movementFirst.fills,
        movementFill,
        cloudkillSaveFill,
        cloudkillDamageFill,
        sourceDamageFill,
        sourceConcentrationFill,
        sourceSaveFill,
      ],
    });
    expect(movementFirstResult).toMatchObject({ tag: "resolved" });
    if (movementFirstResult.tag !== "resolved") return;
    expect(movementFirstResult.state.combatants.get(spellTargetId)?.hp).toBe(
      28,
    );
    expect(
      [...movementFirstResult.state.combatants.values()].some((combatant) =>
        combatant.activeEffects.some(
          (effect) => effect.kind === "persistentAreaSaveDamage",
        ),
      ),
    ).toBe(false);
  });

  test("orders each start-turn Temporary Hit Point grant against Cloudkill movement", () => {
    function resolveOrdering(
      choice: "persistentAreaSourceTurnTranslation" | "startTurnEffects",
    ) {
      const cast = castCloudkill();
      const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
      if (targetTurn.tag !== "resolved") {
        throw new Error("Expected the target turn to start.");
      }
      const boundaryState = withSourceTurnStartTemporaryHitPoints(
        targetTurn.state,
      );
      const orderFrontier = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
      });
      const orderFill = startTurnOccurrenceOrderFill(
        requireResultHole(orderFrontier, "startTurnOccurrenceOrder"),
        (occurrence) =>
          occurrence.kind === "persistentAreaSourceTurnTranslation"
            ? choice === "persistentAreaSourceTurnTranslation"
              ? 0
              : 1
            : choice === "persistentAreaSourceTurnTranslation"
              ? 1
              : 0,
      );
      const movementFrontier = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [orderFill],
      });
      const movementFill = persistentAreaSourceTurnTranslationFill(
        requireResultHole(
          movementFrontier,
          "persistentAreaSourceTurnTranslation",
        ),
        [spellCasterId],
      );
      const saveFrontier = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [orderFill, movementFill],
      });
      const saveFill = singleTargetSavingThrowOutcomeFill(
        requireResultHole(saveFrontier, "savingThrowOutcome"),
        spellCasterId,
        true,
      );
      const damageFrontier = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [orderFill, movementFill, saveFill],
      });
      const damageFill = damageRollFillWithGroups(
        requireResultHole(damageFrontier, "rolledDice"),
        [[1, 1, 1, 1, 1]],
      );
      const concentrationFrontier = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [orderFill, movementFill, saveFill, damageFill],
      });
      const concentrationFill = concentrationSavingThrowFill(
        requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
        true,
      );
      const result = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [
          orderFill,
          movementFill,
          saveFill,
          damageFill,
          concentrationFill,
        ],
      });
      if (result.tag !== "resolved") {
        throw new Error("Expected ordered start-turn occurrences to resolve.");
      }
      return result.state.combatants.get(spellCasterId);
    }

    expect(resolveOrdering("startTurnEffects")).toMatchObject({
      hp: 12,
      tempHp: 1,
    });
    expect(
      resolveOrdering("persistentAreaSourceTurnTranslation"),
    ).toMatchObject({
      hp: 10,
      tempHp: 3,
    });
  });

  test("lets the recipient keep or replace an existing Temporary Hit Point pool", () => {
    function choose(value: "keepExisting" | "replaceWithGranted") {
      const cast = castCloudkill();
      const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
      if (targetTurn.tag !== "resolved") {
        throw new Error("Expected the target turn to start.");
      }
      const source = targetTurn.state.combatants.get(spellCasterId);
      if (source === undefined)
        throw new Error("Expected the Cloudkill source.");
      const withExistingPool = {
        ...targetTurn.state,
        combatants: new Map(targetTurn.state.combatants).set(spellCasterId, {
          ...source,
          tempHp: Hp(10),
        }),
      };
      const boundaryState = withSourceTurnStartTemporaryHitPoints(
        withExistingPool,
        { sourceKey: "cloudkill-lower-thp-choice", amount: 5 },
      );
      const orderFrontier = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
      });
      const orderFill = startTurnOccurrenceOrderFill(
        requireResultHole(orderFrontier, "startTurnOccurrenceOrder"),
        (occurrence) =>
          occurrence.kind === "turnStartTemporaryHitPoints" ? 0 : 1,
      );
      const choiceFrontier = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [orderFill],
      });
      const choiceHole = requireResultHole(
        choiceFrontier,
        "temporaryHitPointChoice",
      );
      expect(choiceHole).toMatchObject({
        sourceTurn: { actorId: spellCasterId },
        existingTemporaryHitPoints: 10,
        grantedTemporaryHitPoints: 5,
      });
      expect(
        Schema.decodeUnknownSync(BattleHoleSchema)(
          Schema.encodeSync(BattleHoleSchema)(choiceHole),
        ),
      ).toEqual(choiceHole);
      const movementFrontier = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [
          orderFill,
          { kind: "temporaryHitPointChoice", holeId: choiceHole.holeId, value },
        ],
      });
      expect(movementFrontier).toMatchObject({
        tag: "needsHoles",
        frontier: {
          kind: "holes",
          holes: [{ kind: "persistentAreaSourceTurnTranslation" }],
        },
      });
      if (movementFrontier.tag !== "needsHoles") {
        throw new Error(
          "Expected Cloudkill movement after the Temporary Hit Point choice.",
        );
      }
      const completed = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [
          orderFill,
          { kind: "temporaryHitPointChoice", holeId: choiceHole.holeId, value },
          persistentAreaSourceTurnTranslationFill(
            requireResultHole(
              movementFrontier,
              "persistentAreaSourceTurnTranslation",
            ),
            [],
          ),
        ],
      });
      if (completed.tag !== "resolved") {
        throw new Error("Expected the empty Cloudkill movement to finish.");
      }
      return completed.state.combatants.get(spellCasterId)?.tempHp;
    }

    expect(choose("keepExisting")).toBe(10);
    expect(choose("replaceWithGranted")).toBe(5);
  });

  test("executes reverse-storage Temporary Hit Point grants around movement", () => {
    const cast = castCloudkill();
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const withFirstGrant = withSourceTurnStartTemporaryHitPoints(
      targetTurn.state,
      { sourceKey: "cloudkill-before-movement-thp", amount: 2 },
    );
    const boundaryState = withSourceTurnStartTemporaryHitPoints(
      withFirstGrant,
      { sourceKey: "cloudkill-after-movement-thp", amount: 4 },
    );
    const orderFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
    });
    const orderHole = requireResultHole(
      orderFrontier,
      "startTurnOccurrenceOrder",
    );
    const temporaryHitPointOccurrences = orderHole.occurrences.filter(
      (occurrence) => occurrence.kind === "turnStartTemporaryHitPoints",
    );
    const movementOccurrence = orderHole.occurrences.find(
      (occurrence) => occurrence.kind === "persistentAreaSourceTurnTranslation",
    );
    const firstGrant = temporaryHitPointOccurrences[0];
    const secondGrant = temporaryHitPointOccurrences[1];
    if (
      firstGrant === undefined ||
      movementOccurrence === undefined ||
      secondGrant === undefined
    ) {
      throw new Error("Expected two Temporary Hit Point grants and movement.");
    }
    const orderFill = {
      kind: "startTurnOccurrenceOrder" as const,
      holeId: orderHole.holeId,
      value: {
        occurrenceIds: [
          secondGrant.occurrenceId,
          movementOccurrence.occurrenceId,
          firstGrant.occurrenceId,
        ] as const,
      },
    };
    const movementFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill],
    });
    const movementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        movementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [spellCasterId],
    );
    const saveFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, movementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      spellCasterId,
      true,
    );
    const damageFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, movementFill, saveFill],
    });
    const damageFill = damageRollFillWithGroups(
      requireResultHole(damageFrontier, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    const concentrationFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, movementFill, saveFill, damageFill],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    const choiceFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, movementFill, saveFill, damageFill, concentrationFill],
    });
    const choiceHole = requireResultHole(
      choiceFrontier,
      "temporaryHitPointChoice",
    );
    const result = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [
        orderFill,
        movementFill,
        saveFill,
        damageFill,
        concentrationFill,
        {
          kind: "temporaryHitPointChoice",
          holeId: choiceHole.holeId,
          value: "keepExisting",
        },
      ],
    });

    expect(result).toMatchObject({ tag: "resolved" });
    if (result.tag !== "resolved") return;
    expect(result.state.combatants.get(spellCasterId)).toMatchObject({
      hp: 12,
      tempHp: 2,
    });
  });

  test("offers chosen Cloudkill movement before an exact start-turn damage occurrence", () => {
    const cast = castCloudkill();
    const targetTurn = endTurn({
      state: withSourceStartTurnDamage(cast.state),
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const sourceHpBeforeBoundary =
      targetTurn.state.combatants.get(spellCasterId)?.hp;
    if (sourceHpBeforeBoundary === undefined) {
      throw new Error("Expected the Cloudkill source.");
    }
    const orderFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    const orderFill = startTurnOccurrenceOrderFill(
      requireResultHole(orderFrontier, "startTurnOccurrenceOrder"),
      (occurrence) =>
        occurrence.kind === "persistentAreaSourceTurnTranslation" ? 0 : 1,
    );

    const movementFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill],
    });
    expect(movementFrontier).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [{ kind: "persistentAreaSourceTurnTranslation" }],
      },
    });
    const movementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        movementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [],
    );
    const damageFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill, movementFill],
    });
    expect(damageFrontier).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [{ kind: "rolledDice" }],
      },
    });
    const damageFill = damageRollFillWithGroups(
      requireResultHole(damageFrontier, "rolledDice"),
      [[3]],
    );
    const concentrationFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill, movementFill, damageFill],
    });
    expect(concentrationFrontier).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [{ kind: "concentrationSavingThrow" }],
      },
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    const saveFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill, movementFill, damageFill, concentrationFill],
    });
    expect(saveFrontier).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [{ kind: "savingThrowOutcome" }],
      },
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      spellCasterId,
      false,
    );
    const result = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill, movementFill, damageFill, concentrationFill, saveFill],
    });
    expect(result).toMatchObject({ tag: "resolved" });
    if (result.tag !== "resolved") return;
    expect(result.state.combatants.get(spellCasterId)?.hp).toBe(
      sourceHpBeforeBoundary - 3,
    );
  });

  test("preserves reverse storage order across a damage-movement-damage permutation", () => {
    const cast = castCloudkill();
    const withFirstDamage = withSourceStartTurnDamage(
      cast.state,
      "cloudkill-before-movement-damage",
    );
    const targetTurn = endTurn({
      state: withSourceStartTurnDamage(
        withFirstDamage,
        "cloudkill-after-movement-damage",
      ),
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const orderFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    const orderHole = requireResultHole(
      orderFrontier,
      "startTurnOccurrenceOrder",
    );
    const damageOccurrences = orderHole.occurrences.filter(
      (occurrence) => occurrence.kind === "spellTurnStartDamageAndSave",
    );
    const movementOccurrence = orderHole.occurrences.find(
      (occurrence) => occurrence.kind === "persistentAreaSourceTurnTranslation",
    );
    const firstDamage = damageOccurrences[0];
    const secondDamage = damageOccurrences[1];
    if (
      firstDamage === undefined ||
      movementOccurrence === undefined ||
      secondDamage === undefined
    ) {
      throw new Error("Expected two damage occurrences and movement.");
    }
    const orderFill = {
      kind: "startTurnOccurrenceOrder" as const,
      holeId: orderHole.holeId,
      value: {
        occurrenceIds: [
          secondDamage.occurrenceId,
          movementOccurrence.occurrenceId,
          firstDamage.occurrenceId,
        ] as const,
      },
    };

    const firstDamageFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill],
    });
    expect(firstDamageFrontier).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [
          {
            kind: "rolledDice",
            spellTurnStartDamage: {
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                "cloudkill-after-movement-damage",
              ),
            },
          },
        ],
      },
    });
    const firstDamageHole = requireResultHole(
      firstDamageFrontier,
      "rolledDice",
    );
    const firstDamageFill = Schema.decodeUnknownSync(BattleFillSchema)(
      Schema.encodeSync(BattleFillSchema)(
        damageRollFillWithGroups(firstDamageHole, [[2]]),
      ),
    );
    const firstConcentrationFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill, firstDamageFill],
    });
    const firstConcentrationHole = requireResultHole(
      firstConcentrationFrontier,
      "concentrationSavingThrow",
    );
    const firstConcentrationFill = Schema.decodeUnknownSync(BattleFillSchema)(
      Schema.encodeSync(BattleFillSchema)(
        concentrationSavingThrowFill(firstConcentrationHole, true),
      ),
    );
    const firstSaveFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill, firstDamageFill, firstConcentrationFill],
    });
    const firstSaveHole = requireResultHole(
      firstSaveFrontier,
      "savingThrowOutcome",
    );
    const firstSaveFill = Schema.decodeUnknownSync(BattleFillSchema)(
      Schema.encodeSync(BattleFillSchema)(
        singleTargetSavingThrowOutcomeFill(firstSaveHole, spellCasterId, false),
      ),
    );
    const firstOccurrenceFills = [
      orderFill,
      firstDamageFill,
      firstConcentrationFill,
      firstSaveFill,
    ];
    const movementFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: firstOccurrenceFills,
    });
    expect(movementFrontier).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [{ kind: "persistentAreaSourceTurnTranslation" }],
      },
    });
    const movementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        movementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [],
    );
    const secondDamageFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [...firstOccurrenceFills, movementFill],
    });
    expect(secondDamageFrontier).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [
          {
            kind: "rolledDice",
            spellTurnStartDamage: {
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                "cloudkill-before-movement-damage",
              ),
            },
          },
        ],
      },
    });
    const secondDamageHole = requireResultHole(
      secondDamageFrontier,
      "rolledDice",
    );
    expect(secondDamageHole.holeId).not.toBe(firstDamageHole.holeId);
    const secondDamageFill = damageRollFillWithGroups(secondDamageHole, [[3]]);
    const secondConcentrationFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [...firstOccurrenceFills, movementFill, secondDamageFill],
    });
    const secondConcentrationHole = requireResultHole(
      secondConcentrationFrontier,
      "concentrationSavingThrow",
    );
    expect(secondConcentrationHole.holeId).not.toBe(
      firstConcentrationHole.holeId,
    );
    const secondConcentrationFill = concentrationSavingThrowFill(
      secondConcentrationHole,
      true,
    );
    const secondSaveFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [
        ...firstOccurrenceFills,
        movementFill,
        secondDamageFill,
        secondConcentrationFill,
      ],
    });
    const secondSaveHole = requireResultHole(
      secondSaveFrontier,
      "savingThrowOutcome",
    );
    expect(secondSaveHole.holeId).not.toBe(firstSaveHole.holeId);
    const secondSaveFill = singleTargetSavingThrowOutcomeFill(
      secondSaveHole,
      spellCasterId,
      false,
    );
    const sourceHpBeforeBoundary =
      targetTurn.state.combatants.get(spellCasterId)?.hp;
    if (sourceHpBeforeBoundary === undefined) {
      throw new Error("Expected the Cloudkill source.");
    }
    const result = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [
        ...firstOccurrenceFills,
        movementFill,
        secondDamageFill,
        secondConcentrationFill,
        secondSaveFill,
      ],
    });
    expect(result).toMatchObject({ tag: "resolved" });
    if (result.tag !== "resolved") return;
    expect(result.state.combatants.get(spellCasterId)?.hp).toBe(
      sourceHpBeforeBoundary - 5,
    );
  });

  test("resolves two Cloudkill movement occurrences one complete frontier at a time", () => {
    const cast = castCloudkill();
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const boundaryState = withSecondCloudkillMovement(targetTurn.state);
    const orderFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
    });
    const orderHole = requireResultHole(
      orderFrontier,
      "startTurnOccurrenceOrder",
    );
    const movementOccurrences = orderHole.occurrences.filter(
      (occurrence) => occurrence.kind === "persistentAreaSourceTurnTranslation",
    );
    const firstOccurrence = movementOccurrences[0];
    const secondOccurrence = movementOccurrences[1];
    if (firstOccurrence === undefined || secondOccurrence === undefined) {
      throw new Error("Expected two Cloudkill movement occurrences.");
    }
    const orderFill = {
      kind: "startTurnOccurrenceOrder" as const,
      holeId: orderHole.holeId,
      value: {
        occurrenceIds: [
          firstOccurrence.occurrenceId,
          secondOccurrence.occurrenceId,
        ] as const,
      },
    };
    const firstMovementFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill],
    });
    const firstMovementHole = requireResultHole(
      firstMovementFrontier,
      "persistentAreaSourceTurnTranslation",
    );
    const firstMovementFill = persistentAreaSourceTurnTranslationFill(
      firstMovementHole,
      [],
    );
    const secondMovementFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, firstMovementFill],
    });
    const secondMovementHole = requireResultHole(
      secondMovementFrontier,
      "persistentAreaSourceTurnTranslation",
    );

    expect(secondMovementHole.holeId).not.toBe(firstMovementHole.holeId);
    expect(
      endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [
          orderFill,
          firstMovementFill,
          persistentAreaSourceTurnTranslationFill(secondMovementHole, []),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("applies an exact Temporary Hit Point occurrence between two movements", () => {
    const cast = castCloudkill();
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const withTemporaryHitPoints = withSourceTurnStartTemporaryHitPoints(
      targetTurn.state,
      { sourceKey: "cloudkill-between-movements-thp", amount: 4 },
    );
    const boundaryState = withSecondCloudkillMovement(withTemporaryHitPoints);
    const sourceHpBeforeBoundary =
      boundaryState.combatants.get(spellCasterId)?.hp;
    if (sourceHpBeforeBoundary === undefined) {
      throw new Error("Expected the Cloudkill source.");
    }
    const orderFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
    });
    const orderHole = requireResultHole(
      orderFrontier,
      "startTurnOccurrenceOrder",
    );
    const movements = orderHole.occurrences.filter(
      (occurrence) => occurrence.kind === "persistentAreaSourceTurnTranslation",
    );
    const temporaryHitPoints = orderHole.occurrences.find(
      (occurrence) => occurrence.kind === "turnStartTemporaryHitPoints",
    );
    const firstMovement = movements[0];
    const secondMovement = movements[1];
    if (
      firstMovement === undefined ||
      temporaryHitPoints === undefined ||
      secondMovement === undefined
    ) {
      throw new Error("Expected movement, Temporary Hit Points, movement.");
    }
    const orderFill = {
      kind: "startTurnOccurrenceOrder" as const,
      holeId: orderHole.holeId,
      value: {
        occurrenceIds: [
          firstMovement.occurrenceId,
          temporaryHitPoints.occurrenceId,
          secondMovement.occurrenceId,
        ] as const,
      },
    };
    const firstMovementFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill],
    });
    const firstMovementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        firstMovementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [],
    );
    const secondMovementFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, firstMovementFill],
    });
    const secondMovementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        secondMovementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [spellCasterId],
    );
    const saveFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, firstMovementFill, secondMovementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      spellCasterId,
      true,
    );
    const damageFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, firstMovementFill, secondMovementFill, saveFill],
    });
    const damageFill = damageRollFillWithGroups(
      requireResultHole(damageFrontier, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    const concentrationFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [
        orderFill,
        firstMovementFill,
        secondMovementFill,
        saveFill,
        damageFill,
      ],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    const result = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [
        orderFill,
        firstMovementFill,
        secondMovementFill,
        saveFill,
        damageFill,
        concentrationFill,
      ],
    });

    expect(result).toMatchObject({ tag: "resolved" });
    if (result.tag !== "resolved") return;
    expect(result.state.combatants.get(spellCasterId)).toMatchObject({
      hp: sourceHpBeforeBoundary,
      tempHp: 2,
    });
  });

  test("opens the fixed-distance movement frontier only at the source's start-turn boundary", () => {
    const cast = castCloudkill().state;

    const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;

    const sourceTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(sourceTurn).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [
          {
            kind: "persistentAreaSourceTurnTranslation",
            sourceCombatantId: spellCasterId,
            areaId: cloudkillAreaId,
            distanceFeet: movementFeet(10),
            directionRequirement: "awayFromSource",
            requiresTableSpatialFact: true,
          },
        ],
      },
    });
  });

  test("reads the movement distance from the retained source procedure", () => {
    const cast = withCloudkillTranslationDistance(
      castCloudkill().state,
      movementFeet(35),
    );
    const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }

    expect(
      endTurn({ state: targetTurn.state, actorId: spellTargetId }),
    ).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [
          {
            kind: "persistentAreaSourceTurnTranslation",
            distanceFeet: movementFeet(35),
            directionRequirement: "awayFromSource",
          },
        ],
      },
    });
  });

  test.each<NonTranslatingPersistentAreaLifecycle>([
    "stationary",
    "collisionReposition",
    "directedReposition",
  ])(
    "does not schedule source-turn translation for a same-source %s persistent area",
    (lifecycle) => {
      const cast = withNonTranslatingCloudkillLifecycle(
        castCloudkill().state,
        lifecycle,
      );
      const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
      if (targetTurn.tag !== "resolved") {
        throw new Error("Expected the target turn to start.");
      }

      expect(
        endTurn({ state: targetTurn.state, actorId: spellTargetId }),
      ).toMatchObject({ tag: "resolved" });
    },
  );

  test("advances exactly one turn after the table supplies movement facts", () => {
    const cast = castCloudkill().state;
    const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const movementFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (movementFrontier.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill movement frontier.");
    }
    const movementHole = requireHole(
      battleResolutionHolesForTest(movementFrontier),
      "persistentAreaSourceTurnTranslation",
    );

    const sourceTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [persistentAreaSourceTurnTranslationFill(movementHole, [])],
    });

    expect(sourceTurn).toMatchObject({
      tag: "resolved",
      snapshot: {
        round: 2,
      },
    });
    if (sourceTurn.tag !== "resolved") return;
    expect(sourceTurn.state.initiative.stillToAct[0]?.creature).toBe(
      spellCasterId,
    );
  });

  test("keeps turn advancement suspended while movement-affected creatures resolve their saves", () => {
    const cast = castCloudkill().state;
    const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const movementFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (movementFrontier.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill movement frontier.");
    }
    const movementHole = requireHole(
      battleResolutionHolesForTest(movementFrontier),
      "persistentAreaSourceTurnTranslation",
    );

    const saveFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [
        persistentAreaSourceTurnTranslationFill(movementHole, [spellTargetId]),
      ],
    });

    expect(saveFrontier).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [
          {
            kind: "savingThrowOutcome",
            persistentAreaSaveDamage: {
              targetId: spellTargetId,
              sourceCombatantId: spellCasterId,
              areaId: cloudkillAreaId,
              trigger: "movesIntoSpace",
            },
          },
        ],
      },
    });
    if (saveFrontier.tag !== "needsHoles") return;
    expect(saveFrontier.state.initiative.stillToAct[0]?.creature).toBe(
      spellTargetId,
    );
  });

  test("applies movement-triggered save damage before advancing exactly once", () => {
    const { boundaryState, movementHole } = sourceTurnMovementBoundary();
    const movementFill = persistentAreaSourceTurnTranslationFill(movementHole, [
      spellTargetId,
    ]);
    expect(movementFill.value).not.toHaveProperty("distanceFeet");

    const saveFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [movementFill],
    });
    if (saveFrontier.tag !== "needsHoles") {
      throw new Error("Expected the movement-triggered save frontier.");
    }
    const saveHole = requireHole(
      battleResolutionHolesForTest(saveFrontier),
      "savingThrowOutcome",
    );
    const saveFill = singleTargetSavingThrowOutcomeFill(
      saveHole,
      spellTargetId,
      true,
    );
    const damageFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [movementFill, saveFill],
    });
    if (damageFrontier.tag !== "needsHoles") {
      throw new Error("Expected the movement-triggered damage frontier.");
    }
    const damageHole = requireHole(
      battleResolutionHolesForTest(damageFrontier),
      "rolledDice",
    );
    const resolved = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [
        movementFill,
        saveFill,
        damageRollFillWithGroups(damageHole, [[1, 1, 1, 1, 1]]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { round: 2, currentActorId: spellCasterId },
    });
    if (resolved.tag !== "resolved") return;
    expect(resolved.state.combatants.get(spellTargetId)?.hp).toBe(28);
    expect(activeCloudkill(resolved.state).savedThisTurn).toEqual([
      spellTargetId,
    ]);
  });

  test("rejects duplicate, wrong-phase, and stale movement fills", () => {
    const { cast, boundaryState, movementHole } = sourceTurnMovementBoundary();
    const movementFill = persistentAreaSourceTurnTranslationFill(
      movementHole,
      [],
    );

    expect(
      endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [movementFill, movementFill],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      endTurn({
        state: cast.state,
        actorId: spellCasterId,
        fills: [movementFill],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const firstSourceTurn = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [movementFill],
    });
    if (firstSourceTurn.tag !== "resolved") {
      throw new Error("Expected the first source turn to start.");
    }
    const nextTargetTurn = endTurn({
      state: firstSourceTurn.state,
      actorId: spellCasterId,
    });
    if (nextTargetTurn.tag !== "resolved") {
      throw new Error("Expected the next target turn to start.");
    }
    expect(
      endTurn({
        state: nextTargetTurn.state,
        actorId: spellTargetId,
        fills: [movementFill],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("requires a fresh movement exactly once on every later source turn", () => {
    const { boundaryState, movementHole } = sourceTurnMovementBoundary();
    const firstSourceTurn = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [persistentAreaSourceTurnTranslationFill(movementHole, [])],
    });
    if (firstSourceTurn.tag !== "resolved") {
      throw new Error("Expected the first source turn to start.");
    }
    const nextTargetTurn = endTurn({
      state: firstSourceTurn.state,
      actorId: spellCasterId,
    });
    if (nextTargetTurn.tag !== "resolved") {
      throw new Error("Expected the next target turn to start.");
    }
    const nextMovement = endTurn({
      state: nextTargetTurn.state,
      actorId: spellTargetId,
    });

    expect(nextMovement).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [
          {
            kind: "persistentAreaSourceTurnTranslation",
            distanceFeet: movementFeet(10),
          },
        ],
      },
    });
    if (nextMovement.tag !== "needsHoles") return;
    expect(
      requireHole(
        battleResolutionHolesForTest(nextMovement),
        "persistentAreaSourceTurnTranslation",
      ).holeId,
    ).not.toBe(movementHole.holeId);
  });

  test("does not accept a prior-round movement consequence fill", () => {
    const { boundaryState, movementHole } = sourceTurnMovementBoundary();
    const firstMovementFill = persistentAreaSourceTurnTranslationFill(
      movementHole,
      [spellTargetId],
    );
    const firstSaveFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [firstMovementFill],
    });
    const firstSaveHole = requireResultHole(
      firstSaveFrontier,
      "savingThrowOutcome",
    );
    const firstSaveFill = singleTargetSavingThrowOutcomeFill(
      firstSaveHole,
      spellTargetId,
      true,
    );
    const firstDamageFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [firstMovementFill, firstSaveFill],
    });
    const firstDamageFill = damageRollFillWithGroups(
      requireResultHole(firstDamageFrontier, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    const firstSourceTurn = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [firstMovementFill, firstSaveFill, firstDamageFill],
    });
    if (firstSourceTurn.tag !== "resolved") {
      throw new Error("Expected the first source turn to start.");
    }
    const nextTargetTurn = endTurn({
      state: firstSourceTurn.state,
      actorId: spellCasterId,
    });
    if (nextTargetTurn.tag !== "resolved") {
      throw new Error("Expected the next target turn to start.");
    }
    const nextMovementFrontier = endTurn({
      state: nextTargetTurn.state,
      actorId: spellTargetId,
    });
    const nextMovementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        nextMovementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [spellTargetId],
    );
    const nextSaveFrontier = endTurn({
      state: nextTargetTurn.state,
      actorId: spellTargetId,
      fills: [nextMovementFill],
    });
    const nextSaveHole = requireResultHole(
      nextSaveFrontier,
      "savingThrowOutcome",
    );

    expect(nextSaveHole.holeId).not.toBe(firstSaveHole.holeId);
    expect(
      endTurn({
        state: nextTargetTurn.state,
        actorId: spellTargetId,
        fills: [nextMovementFill, firstSaveFill],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [{ kind: "savingThrowOutcome" }],
      },
    });
  });

  test("replays an interrupted movement save without advancing or reopening it", () => {
    const cast = castCloudkill({ targetCanReadyRayOfFrost: true });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({
        ...cast.session,
        state: targetTurn.state,
      }),
    );
    const movementFrontier = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (movementFrontier.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill movement frontier.");
    }
    const movementFill = persistentAreaSourceTurnTranslationFill(
      requireHole(
        battleResolutionHolesForTest(movementFrontier),
        "persistentAreaSourceTurnTranslation",
      ),
      [spellTargetId],
    );
    const saveFrontier = endTurn({
      state: readied.state,
      actorId: spellTargetId,
      fills: [movementFill],
    });
    if (saveFrontier.tag !== "needsHoles") {
      throw new Error("Expected the movement-triggered save frontier.");
    }
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireHole(
        battleResolutionHolesForTest(saveFrontier),
        "savingThrowOutcome",
      ),
      spellTargetId,
      false,
    );
    const interrupted = endTurn({
      state: readied.state,
      actorId: spellTargetId,
      fills: [movementFill, saveFill],
    });

    expect(interrupted).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "interruptDecision",
        decisionHole: { kind: "interruptDecision", trigger: "saveFailed" },
      },
      snapshot: {
        currentActorId: spellCasterId,
      },
    });
    if (interrupted.tag !== "needsHoles") return;
    expect("pendingInterrupt" in interrupted.snapshot).toBe(false);
    const pendingInterrupt = battleFrontierInterruptDecisionForState(
      interrupted.state,
    );
    if (pendingInterrupt === null) {
      throw new Error("Expected the failed-save interrupt checkpoint.");
    }
    const declined = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pendingInterrupt.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    expect(declined).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [{ kind: "rolledDice" }],
      },
      snapshot: {
        currentActorId: spellCasterId,
      },
    });
    if (declined.tag !== "needsHoles") return;
    const damageHole = requireHole(
      battleResolutionHolesForTest(declined),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damageHole, [[1, 1, 1, 1, 1]]);
    const concentrationFrontier = resolveBattleSubject({
      state: declined.state,
      subject: ordinaryReplaySubject(declined),
      fills: [movementFill, saveFill, damageFill],
    });
    expect(concentrationFrontier).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [{ kind: "concentrationSavingThrow" }],
      },
      snapshot: {
        currentActorId: spellCasterId,
      },
    });
    if (concentrationFrontier.tag !== "needsHoles") return;
    const concentrationHole = requireHole(
      battleResolutionHolesForTest(concentrationFrontier),
      "concentrationSavingThrow",
    );
    const resumed = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: ordinaryReplaySubject(concentrationFrontier),
      fills: [
        movementFill,
        saveFill,
        damageFill,
        concentrationSavingThrowFill(concentrationHole, true),
      ].map((fill) =>
        Schema.decodeUnknownSync(BattleFillSchema)(
          Schema.encodeSync(BattleFillSchema)(fill),
        ),
      ),
    });

    expect(resumed).toMatchObject({
      tag: "resolved",
      snapshot: {
        round: 2,
        currentActorId: spellCasterId,
      },
    });
  });

  test("resumes movement one through Temporary Hit Points to movement two in the retained order", () => {
    const cast = castCloudkill({ targetCanReadyRayOfFrost: true });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const boundaryState = withSecondCloudkillMovement(
      withSourceTurnStartTemporaryHitPoints(readied.state, {
        sourceKey: "cloudkill-interrupted-between-movements-thp",
        amount: 4,
        persistWithoutConcentration: true,
      }),
    );
    const orderFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
    });
    const orderHole = requireResultHole(
      orderFrontier,
      "startTurnOccurrenceOrder",
    );
    const movements = orderHole.occurrences.filter(
      (occurrence) => occurrence.kind === "persistentAreaSourceTurnTranslation",
    );
    const temporaryHitPoints = orderHole.occurrences.find(
      (occurrence) => occurrence.kind === "turnStartTemporaryHitPoints",
    );
    const firstMovement = movements[0];
    const secondMovement = movements[1];
    if (
      firstMovement === undefined ||
      temporaryHitPoints === undefined ||
      secondMovement === undefined
    ) {
      throw new Error("Expected movement, Temporary Hit Points, movement.");
    }
    const orderFill = {
      kind: "startTurnOccurrenceOrder" as const,
      holeId: orderHole.holeId,
      value: {
        occurrenceIds: [
          firstMovement.occurrenceId,
          temporaryHitPoints.occurrenceId,
          secondMovement.occurrenceId,
        ] as const,
      },
    };
    const firstMovementFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill],
    });
    const firstMovementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        firstMovementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [spellTargetId],
    );
    const saveFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, firstMovementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      spellTargetId,
      false,
    );
    const interrupted = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, firstMovementFill, saveFill],
    });
    if (interrupted.tag !== "needsHoles") {
      throw new Error("Expected the first movement failed-save interrupt.");
    }
    const pending = battleFrontierInterruptDecisionForState(interrupted.state);
    if (pending === null) {
      throw new Error("Expected a pending failed-save interrupt.");
    }
    const declined = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    const damageFill = damageRollFillWithGroups(
      requireResultHole(declined, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    if (declined.tag !== "needsHoles") {
      throw new Error("Expected movement damage after declining.");
    }
    const concentrationFrontier = resolveBattleSubject({
      state: declined.state,
      subject: ordinaryReplaySubject(declined),
      fills: [firstMovementFill, saveFill, damageFill],
    });
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error("Expected movement Concentration frontier.");
    }
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    if (concentrationFill.kind !== "concentrationSavingThrow") {
      throw new Error("Expected a Concentration Saving Throw fill.");
    }
    const duplicateConcentration = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: ordinaryReplaySubject(declined),
      fills: [
        orderFill,
        firstMovementFill,
        saveFill,
        damageFill,
        concentrationFill,
        {
          ...concentrationFill,
          value: { ...concentrationFill.value, succeeded: false },
        },
      ],
    });
    expect(duplicateConcentration).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    const stateWithoutRetainedOrder = {
      ...concentrationFrontier.state,
      interruptStack: concentrationFrontier.state.interruptStack.map((entry) =>
        entry.kind === "replayContinuation" &&
        entry.continuation.kind === "replay"
          ? {
              ...entry,
              continuation: {
                ...entry.continuation,
                fills: entry.continuation.fills.filter(
                  (fill) => fill.kind !== "startTurnOccurrenceOrder",
                ),
              },
            }
          : entry,
      ),
    };
    const missingRetainedOrder = resolveBattleSubject({
      state: stateWithoutRetainedOrder,
      subject: ordinaryReplaySubject(declined),
      fills: [firstMovementFill, saveFill, damageFill, concentrationFill],
    });
    expect(missingRetainedOrder).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    const stateWithAlteredOrder = {
      ...concentrationFrontier.state,
      interruptStack: concentrationFrontier.state.interruptStack.map((entry) =>
        entry.kind === "replayContinuation" &&
        entry.continuation.kind === "replay"
          ? {
              ...entry,
              continuation: {
                ...entry.continuation,
                fills: entry.continuation.fills.map((fill) =>
                  fill.kind === "startTurnOccurrenceOrder"
                    ? {
                        ...fill,
                        value: {
                          occurrenceIds: [
                            fill.value.occurrenceIds[1],
                            fill.value.occurrenceIds[0],
                            ...fill.value.occurrenceIds.slice(2),
                          ] as const,
                        },
                      }
                    : fill,
                ),
              },
            }
          : entry,
      ),
    };
    const alteredRetainedOrder = endTurn({
      state: stateWithAlteredOrder,
      actorId: spellTargetId,
      fills: [firstMovementFill, saveFill, damageFill, concentrationFill],
    });
    expect(alteredRetainedOrder).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    const secondMovementFrontier = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: ordinaryReplaySubject(concentrationFrontier),
      fills: [
        orderFill,
        firstMovementFill,
        saveFill,
        damageFill,
        concentrationFill,
      ],
    });

    expect(secondMovementFrontier).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [{ kind: "persistentAreaSourceTurnTranslation" }],
      },
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            tempHp: 4,
          }),
        ]),
      },
    });
    const secondMovementHole = requireResultHole(
      secondMovementFrontier,
      "persistentAreaSourceTurnTranslation",
    );
    expect(secondMovementHole.holeId).not.toBe(firstMovementFill.holeId);
  });

  test("offers the chosen movement occurrence before another source start-turn effect", () => {
    const cast = castCloudkill();
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const boundaryState = withSourceTurnStartTemporaryHitPoints(
      targetTurn.state,
      {
        sourceKey: "cloudkill-movement-before-start-turn-effect",
        amount: 3,
        persistWithoutConcentration: true,
      },
    );
    const orderFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
    });
    const orderFill = startTurnOccurrenceOrderFill(
      requireResultHole(orderFrontier, "startTurnOccurrenceOrder"),
      (occurrence) =>
        occurrence.kind === "persistentAreaSourceTurnTranslation" ? 0 : 1,
    );

    const movementFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill],
    });

    expect(movementFrontier).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [{ kind: "persistentAreaSourceTurnTranslation" }],
      },
    });
    const completed = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [
        orderFill,
        persistentAreaSourceTurnTranslationFill(
          requireResultHole(
            movementFrontier,
            "persistentAreaSourceTurnTranslation",
          ),
          [],
        ),
      ],
    });
    if (completed.tag !== "resolved") {
      throw new Error("Expected the ordered start-turn occurrences to finish.");
    }
    expect(completed.state.combatants.get(spellCasterId)?.tempHp).toBe(3);
  });

  test("opens independent failed-save windows for two movement-affected targets", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const secondaryTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the secondary target's turn to start.");
    }
    const movementFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
    });
    const movementHole = requireResultHole(
      movementFrontier,
      "persistentAreaSourceTurnTranslation",
    );
    const movementFill = persistentAreaSourceTurnTranslationFill(movementHole, [
      cloudkillSecondaryTargetId,
      spellCasterId,
    ]);
    const firstSaveFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill],
    });
    const firstSaveHole = requireResultHole(
      firstSaveFrontier,
      "savingThrowOutcome",
    );
    expect(firstSaveHole).toMatchObject({
      persistentAreaSaveDamage: { targetId: cloudkillSecondaryTargetId },
    });
    const firstSaveFill = singleTargetSavingThrowOutcomeFill(
      firstSaveHole,
      cloudkillSecondaryTargetId,
      false,
    );
    const firstInterrupted = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill, firstSaveFill],
    });
    const firstDecision = requireResultHole(
      firstInterrupted,
      "interruptDecision",
    );
    if (firstInterrupted.tag !== "needsHoles") {
      throw new Error("Expected the first failed-save window.");
    }
    const firstDeclined = resolveBattleInterrupt({
      state: firstInterrupted.state,
      fill: interruptDecisionFill(firstDecision, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    const firstDamageHole = requireResultHole(firstDeclined, "rolledDice");
    const firstDamageFill = damageRollFillWithGroups(firstDamageHole, [
      [1, 1, 1, 1, 1],
    ]);
    if (firstDeclined.tag !== "needsHoles") {
      throw new Error("Expected the first target's damage frontier.");
    }
    const secondSaveFrontier = resolveBattleSubject({
      state: firstDeclined.state,
      subject: ordinaryReplaySubject(firstDeclined),
      fills: [movementFill, firstSaveFill, firstDamageFill],
    });
    const secondSaveHole = requireResultHole(
      secondSaveFrontier,
      "savingThrowOutcome",
    );
    const secondSaveFill = singleTargetSavingThrowOutcomeFill(
      secondSaveHole,
      spellCasterId,
      false,
    );
    if (secondSaveFrontier.tag !== "needsHoles") {
      throw new Error("Expected the second target's save frontier.");
    }
    const secondInterrupted = resolveBattleSubject({
      state: secondSaveFrontier.state,
      subject: ordinaryReplaySubject(secondSaveFrontier),
      fills: [movementFill, firstSaveFill, firstDamageFill, secondSaveFill],
    });

    expect(secondInterrupted).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "interruptDecision",
        decisionHole: { kind: "interruptDecision", trigger: "saveFailed" },
      },
    });
    if (secondInterrupted.tag !== "needsHoles") {
      throw new Error("Expected the second failed-save interrupt frontier.");
    }
    expect("pendingInterrupt" in secondInterrupted.snapshot).toBe(false);
    expect(
      battleFrontierInterruptDecisionForState(secondInterrupted.state),
    ).toMatchObject({
      trigger: "saveFailed",
      choices: [
        expect.objectContaining({
          kind: "nestedProcedure",
          subject: expect.objectContaining({
            command: "releaseReadiedSpell",
            readiedSpellCasterId: spellTargetId,
          }),
        }),
      ],
    });
  });

  test("cancels remaining movement targets when source damage ends Cloudkill Concentration", () => {
    const cast = castCloudkill({
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the first target's turn to start.");
    }
    const secondaryTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the second target's turn to start.");
    }
    const sourceHpBeforeMovement =
      secondaryTurn.state.combatants.get(spellCasterId)?.hp;
    if (sourceHpBeforeMovement === undefined) {
      throw new Error("Expected the Cloudkill source.");
    }
    const movementFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
    });
    const movementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        movementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [spellCasterId, cloudkillSecondaryTargetId],
    );
    const sourceSaveFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill],
    });
    const sourceSaveHole = requireResultHole(
      sourceSaveFrontier,
      "savingThrowOutcome",
    );
    expect(sourceSaveHole).toMatchObject({
      persistentAreaSaveDamage: { targetId: spellCasterId },
    });
    const sourceSaveFill = singleTargetSavingThrowOutcomeFill(
      sourceSaveHole,
      spellCasterId,
      true,
    );
    const sourceDamageFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill, sourceSaveFill],
    });
    const sourceDamageFill = damageRollFillWithGroups(
      requireResultHole(sourceDamageFrontier, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    const concentrationFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill, sourceSaveFill, sourceDamageFill],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      false,
    );
    const resolved = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [
        movementFill,
        sourceSaveFill,
        sourceDamageFill,
        concentrationFill,
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { round: 2, currentActorId: spellCasterId },
    });
    if (resolved.tag !== "resolved") return;
    expect(resolved.state.combatants.get(spellCasterId)?.hp).toBe(
      sourceHpBeforeMovement - 2,
    );
    expect(resolved.state.combatants.get(cloudkillSecondaryTargetId)?.hp).toBe(
      30,
    );
    expect(
      [...resolved.state.combatants.values()].some((combatant) =>
        combatant.activeEffects.some(
          (effect) => effect.kind === "persistentAreaSaveDamage",
        ),
      ),
    ).toBe(false);
  });

  test("later movement saves use the prefix state after an earlier target loses its readied spell", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the first affected target's turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const secondaryTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the second affected target's turn to start.");
    }
    const movementFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
    });
    const movementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        movementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [spellTargetId, cloudkillSecondaryTargetId],
    );
    const firstSaveFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill],
    });
    const firstSaveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(firstSaveFrontier, "savingThrowOutcome"),
      spellTargetId,
      false,
    );
    const firstInterrupted = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill, firstSaveFill],
    });
    const firstDecision = requireResultHole(
      firstInterrupted,
      "interruptDecision",
    );
    if (firstInterrupted.tag !== "needsHoles") {
      throw new Error(
        "Expected the first affected target's failed-save window.",
      );
    }
    const firstDeclined = resolveBattleInterrupt({
      state: firstInterrupted.state,
      fill: interruptDecisionFill(firstDecision, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    const firstDamageFill = damageRollFillWithGroups(
      requireResultHole(firstDeclined, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    if (firstDeclined.tag !== "needsHoles") {
      throw new Error("Expected the first affected target's damage frontier.");
    }
    const concentrationFrontier = resolveBattleSubject({
      state: firstDeclined.state,
      subject: ordinaryReplaySubject(firstDeclined),
      fills: [movementFill, firstSaveFill, firstDamageFill],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      false,
    );
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error(
        "Expected the first affected target's Concentration save.",
      );
    }
    const secondSaveFrontier = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: ordinaryReplaySubject(concentrationFrontier),
      fills: [movementFill, firstSaveFill, firstDamageFill, concentrationFill],
    });
    if (secondSaveFrontier.tag !== "needsHoles") {
      throw new Error("Expected the second affected target's save frontier.");
    }
    expect(secondSaveFrontier.state.readiedSpells.has(spellTargetId)).toBe(
      false,
    );
    const secondSaveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(secondSaveFrontier, "savingThrowOutcome"),
      cloudkillSecondaryTargetId,
      false,
    );
    const secondDamageFrontier = resolveBattleSubject({
      state: secondSaveFrontier.state,
      subject: ordinaryReplaySubject(secondSaveFrontier),
      fills: [
        movementFill,
        firstSaveFill,
        firstDamageFill,
        concentrationFill,
        secondSaveFill,
      ],
    });

    expect(secondDamageFrontier).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [{ kind: "rolledDice" }],
      },
    });
    if (secondDamageFrontier.tag !== "needsHoles") {
      throw new Error("Expected the second movement damage frontier.");
    }
    expect(
      battleFrontierInterruptDecisionForState(secondDamageFrontier.state),
    ).toBeNull();
  });

  test("preserves and resolves movement interrupt replay through delegated Command End Turn", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const secondaryTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the secondary target's turn to start.");
    }
    const commanded = withCommandGrovel(
      secondaryTurn.state,
      cloudkillSecondaryTargetId,
    );
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: cloudkillSecondaryTargetId,
      command: "executeCompelledGrovel" as const,
      effectRef: commanded.effectRef,
    };
    const movementFrontier = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [],
    });
    const movementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        movementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [cloudkillSecondaryTargetId],
    );
    const saveFrontier = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [movementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      cloudkillSecondaryTargetId,
      false,
    );
    const interrupted = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [movementFill, saveFill],
    });

    expect(interrupted).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "interruptDecision",
        decisionHole: { kind: "interruptDecision", trigger: "saveFailed" },
      },
      state: {
        interruptStack: [
          {
            kind: "interruptCheckpoint",
            frame: {
              trigger: "saveFailed",
              continuation: {
                kind: "replay",
                subject,
                parentPosition: {
                  kind: "startTurnOccurrenceSequence",
                  endingActorId: cloudkillSecondaryTargetId,
                  child: {
                    kind: "persistentAreaTranslationSaveDamageSequence",
                    targetId: cloudkillSecondaryTargetId,
                  },
                },
              },
            },
          },
        ],
      },
    });
    if (interrupted.tag !== "needsHoles") {
      throw new Error("Expected delegated movement interrupt.");
    }
    const replayCheckpoint = interrupted.state.interruptStack.find(
      (entry) => entry.kind === "interruptCheckpoint",
    );
    if (
      replayCheckpoint?.kind !== "interruptCheckpoint" ||
      replayCheckpoint.frame.continuation.kind !== "replay" ||
      replayCheckpoint.frame.continuation.parentPosition === undefined
    ) {
      throw new Error("Expected the Cloudkill replay checkpoint.");
    }
    expect(
      replayCheckpoint.frame.continuation.parentPosition.child,
    ).not.toHaveProperty("movementHoleId");
    expect(
      replayCheckpoint.frame.continuation.parentPosition.child,
    ).not.toHaveProperty("saveHoleId");
    const pending = battleFrontierInterruptDecisionForState(interrupted.state);
    if (pending === null) {
      throw new Error("Expected delegated pending interrupt.");
    }
    const declined = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    expect(declined).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [{ kind: "rolledDice" }],
      },
      state: {
        interruptStack: [
          {
            kind: "replayContinuation",
            continuation: {
              kind: "replay",
              subject,
              parentPosition: {
                kind: "startTurnOccurrenceSequence",
                endingActorId: cloudkillSecondaryTargetId,
                child: {
                  kind: "persistentAreaTranslationSaveDamageSequence",
                  targetId: cloudkillSecondaryTargetId,
                },
              },
            },
          },
        ],
      },
    });
    if (declined.tag !== "needsHoles") {
      throw new Error("Expected delegated movement damage frontier.");
    }
    const damageFill = damageRollFillWithGroups(
      requireResultHole(declined, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    const resumed = resolveBattleSubject({
      state: declined.state,
      subject: ordinaryReplaySubject(declined),
      fills: [movementFill, saveFill, damageFill],
    });

    expect(resumed).toMatchObject({
      tag: "resolved",
      snapshot: {
        round: 2,
        currentActorId: spellCasterId,
      },
    });
  });

  test("preserves Command Drop outcomes through interrupted Cloudkill movement replay", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      targetHasLongsword: true,
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const commanded = withCommandDrop(readied.state, spellTargetId);
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "executeCompelledDrop" as const,
      effectRef: commanded.effectRef,
    };
    const movementFrontier = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [],
    });
    const movementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        movementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [spellTargetId],
    );
    const saveFrontier = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [movementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      spellTargetId,
      false,
    );
    const interrupted = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [movementFill, saveFill],
    });
    if (interrupted.tag !== "needsHoles") {
      throw new Error("Expected Command Drop movement interruption.");
    }
    expect(interrupted.state.interruptStack).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "interruptCheckpoint",
          frame: expect.objectContaining({
            continuation: expect.objectContaining({
              objectOutcomes: expect.objectContaining({
                droppedObjects: [
                  expect.objectContaining({
                    actorId: spellTargetId,
                  }),
                ],
              }),
            }),
          }),
        }),
      ]),
    );
    const pending = battleFrontierInterruptDecisionForState(interrupted.state);
    if (pending === null) {
      throw new Error("Expected the movement failed-save interrupt.");
    }
    const declined = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    const damageFill = damageRollFillWithGroups(
      requireResultHole(declined, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    if (declined.tag !== "needsHoles") {
      throw new Error("Expected Command Drop movement damage frontier.");
    }
    const concentrationFrontier = resolveBattleSubject({
      state: declined.state,
      subject: ordinaryReplaySubject(declined),
      fills: [movementFill, saveFill, damageFill],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error("Expected Command Drop movement Concentration frontier.");
    }
    const resumed = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: ordinaryReplaySubject(concentrationFrontier),
      fills: [movementFill, saveFill, damageFill, concentrationFill],
    });

    expect(resumed).toMatchObject({
      tag: "resolved",
      droppedObjects: [
        expect.objectContaining({
          kind: "objectDropped",
          actorId: spellTargetId,
        }),
      ],
      snapshot: {
        round: 2,
        currentActorId: spellCasterId,
      },
    });
    if (resumed.tag !== "resolved") return;
    expect(resumed.droppedObjects).toHaveLength(1);
  });

  test("preserves a known-empty Command Drop outcome through interrupted movement replay", () => {
    const cast = castCloudkill({ targetCanReadyRayOfFrost: true });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const commanded = withCommandDrop(readied.state, spellTargetId);
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "executeCompelledDrop" as const,
      effectRef: commanded.effectRef,
    };
    const movementFrontier = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [],
    });
    const movementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        movementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [spellTargetId],
    );
    const saveFrontier = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [movementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      spellTargetId,
      false,
    );
    const interrupted = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [movementFill, saveFill],
    });
    expect(interrupted).toMatchObject({
      tag: "needsHoles",
      state: {
        interruptStack: expect.arrayContaining([
          expect.objectContaining({
            kind: "interruptCheckpoint",
            frame: expect.objectContaining({
              continuation: expect.objectContaining({
                objectOutcomes: { droppedObjects: [] },
              }),
            }),
          }),
        ]),
      },
    });
    if (interrupted.tag !== "needsHoles") {
      throw new Error("Expected Command Drop movement interruption.");
    }
    const pending = battleFrontierInterruptDecisionForState(interrupted.state);
    if (pending === null) {
      throw new Error("Expected the movement failed-save interrupt.");
    }
    const declined = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    const damageFill = damageRollFillWithGroups(
      requireResultHole(declined, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    if (declined.tag !== "needsHoles") {
      throw new Error("Expected Command Drop movement damage frontier.");
    }
    const concentrationFrontier = resolveBattleSubject({
      state: declined.state,
      subject: ordinaryReplaySubject(declined),
      fills: [movementFill, saveFill, damageFill],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error("Expected Command Drop movement Concentration frontier.");
    }
    const resumedWithEmptyDrop = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: ordinaryReplaySubject(concentrationFrontier),
      fills: [movementFill, saveFill, damageFill, concentrationFill],
    });

    expect(resumedWithEmptyDrop).toMatchObject({
      tag: "resolved",
      droppedObjects: [],
      snapshot: {
        round: 2,
        currentActorId: spellCasterId,
      },
    });
  });

  test("resolves Grease before advancing End Turn into Cloudkill movement", () => {
    const cast = castCloudkill({ targetCanReadyRayOfFrost: true });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const grease = withGreaseGroundHazard(targetTurn.state);
    const overlappingGrease = withGreaseGroundHazard(grease.state);
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({
        ...cast.session,
        state: overlappingGrease.state,
      }),
    );
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "persistentAreaSaveConditionSave" as const,
      areaId: greaseAreaId,
      effectRef: grease.effectRef,
      trigger: "endsTurnInArea" as const,
    };
    const greaseOwner = overlappingGrease.state.combatants.get(spellCasterId);
    const selectedGrease = greaseOwner?.activeEffects.find(
      (effect) => effect.effectRef === grease.effectRef,
    );
    if (greaseOwner === undefined || selectedGrease === undefined) {
      throw new Error("Expected the selected overlapping Grease occurrence.");
    }
    const removedSelected = updateCombatantWithActiveEffectOccurrence(
      overlappingGrease.state.combatants,
      spellCasterId,
      selectedGrease,
      (owner) => ({
        ...owner,
        activeEffects: owner.activeEffects.filter(
          (effect) => effect.effectRef !== grease.effectRef,
        ),
      }),
    );
    expect(removedSelected.tag).toBe("updated");
    expect(
      resolveBattleSubject({
        state: {
          ...overlappingGrease.state,
          combatants: removedSelected.combatants,
        },
        subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    const combinedFrontier = resolveBattleSubject({
      state: readied.state,
      subject,
      fills: [],
    });
    if (combinedFrontier.tag !== "needsHoles") {
      throw new Error("Expected the combined Grease and Cloudkill frontier.");
    }
    const greaseSaveHole = battleResolutionHolesForTest(combinedFrontier).find(
      (hole) =>
        hole.kind === "savingThrowOutcome" &&
        "persistentAreaSaveCondition" in hole,
    );
    if (greaseSaveHole?.kind !== "savingThrowOutcome") {
      throw new Error("Expected the Grease end-turn save frontier.");
    }
    expect(greaseSaveHole.persistentAreaSaveCondition?.effectRef).toBe(
      grease.effectRef,
    );
    expect(battleResolutionHolesForTest(combinedFrontier)).toEqual([
      greaseSaveHole,
    ]);
    const greaseSaveFill = singleTargetSavingThrowOutcomeFill(
      greaseSaveHole,
      spellTargetId,
      false,
    );
    const greaseInterrupted = resolveBattleSubject({
      state: readied.state,
      subject,
      fills: [greaseSaveFill],
    });
    expect(greaseInterrupted).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "interruptDecision",
        decisionHole: { kind: "interruptDecision", trigger: "saveFailed" },
      },
      snapshot: {
        currentActorId: spellTargetId,
      },
    });
    if (greaseInterrupted.tag !== "needsHoles") {
      throw new Error("Expected the Grease failed-save window.");
    }
    const greaseDecision = requireHole(
      battleResolutionHolesForTest(greaseInterrupted),
      "interruptDecision",
    );
    const persistentAreaSourceTurnTranslationFrontier = resolveBattleInterrupt({
      state: greaseInterrupted.state,
      fill: interruptDecisionFill(greaseDecision, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    expect(persistentAreaSourceTurnTranslationFrontier).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [{ kind: "persistentAreaSourceTurnTranslation" }],
      },
      snapshot: {
        round: 1,
        currentActorId: spellTargetId,
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            conditions: expect.arrayContaining(["prone"]),
          }),
        ]),
      },
    });
    if (persistentAreaSourceTurnTranslationFrontier.tag !== "needsHoles") {
      throw new Error("Expected Cloudkill movement after Grease resolved.");
    }
    const movementHole = requireHole(
      battleResolutionHolesForTest(persistentAreaSourceTurnTranslationFrontier),
      "persistentAreaSourceTurnTranslation",
    );
    const movementFill = persistentAreaSourceTurnTranslationFill(movementHole, [
      spellTargetId,
    ]);
    const cloudkillSaveFrontier = resolveBattleSubject({
      state: persistentAreaSourceTurnTranslationFrontier.state,
      subject: ordinaryReplaySubject(
        persistentAreaSourceTurnTranslationFrontier,
      ),
      fills: [movementFill],
    });
    if (cloudkillSaveFrontier.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill movement save frontier.");
    }
    const cloudkillSaveHole = battleResolutionHolesForTest(
      cloudkillSaveFrontier,
    ).find(
      (hole) =>
        hole.kind === "savingThrowOutcome" &&
        "persistentAreaSaveDamage" in hole,
    );
    if (cloudkillSaveHole?.kind !== "savingThrowOutcome") {
      throw new Error("Expected the Cloudkill movement save hole.");
    }
    const cloudkillSaveFill = singleTargetSavingThrowOutcomeFill(
      cloudkillSaveHole,
      spellTargetId,
      false,
    );
    const cloudkillInterrupted = resolveBattleSubject({
      state: cloudkillSaveFrontier.state,
      subject: ordinaryReplaySubject(cloudkillSaveFrontier),
      fills: [movementFill, cloudkillSaveFill],
    });
    expect(cloudkillInterrupted).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "interruptDecision",
        decisionHole: { kind: "interruptDecision", trigger: "saveFailed" },
      },
      snapshot: {
        currentActorId: spellCasterId,
      },
    });
  });

  test("cancels remaining movement damage and advances once when an accepted reaction ends source Concentration", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const secondaryTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the secondary target's turn to start.");
    }
    const sourceHpBeforeReaction =
      secondaryTurn.state.combatants.get(spellCasterId)?.hp;
    if (sourceHpBeforeReaction === undefined) {
      throw new Error("Expected the Cloudkill source.");
    }
    const movementFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
    });
    const movementFill = persistentAreaSourceTurnTranslationFill(
      requireResultHole(
        movementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [cloudkillSecondaryTargetId],
    );
    const saveFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      cloudkillSecondaryTargetId,
      false,
    );
    const interrupted = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill, saveFill],
    });
    if (interrupted.tag !== "needsHoles") {
      throw new Error("Expected the failed-save reaction window.");
    }
    const pending = battleFrontierInterruptDecisionForState(interrupted.state);
    if (pending === null) {
      throw new Error("Expected a pending failed-save interrupt.");
    }
    const choice = reactionChoiceWithSubject(pending.choices);
    if (
      choice.kind !== "nestedProcedure" ||
      choice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected the readied Ray of Frost choice.");
    }
    const released = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "resolve",
        responderId: spellTargetId,
        choice: {
          kind: "releaseReadiedSpell",
          procedureRef: choice.subject.procedureRef,
          fills: [],
        },
      }),
    });
    const reactionTargetHole = requireResultHole(released, "targetChoice");
    if (released.tag !== "needsHoles") {
      throw new Error("Expected the readied spell target frontier.");
    }
    const reactionTargetFill = targetFill(reactionTargetHole, spellCasterId);
    const attackFrontier = resolveBattleSubject({
      state: released.state,
      subject: ordinaryReplaySubject(released),
      fills: [reactionTargetFill],
    });
    const attackHole = requireResultHole(attackFrontier, "attackRoll");
    const attackFill = attackRollFill(attackHole, {
      total: 20,
      naturalD20: 15,
    });
    const damageFrontier = resolveBattleSubject({
      state: released.state,
      subject: ordinaryReplaySubject(released),
      fills: [reactionTargetFill, attackFill],
    });
    const damageHole = requireResultHole(damageFrontier, "rolledDice");
    const damageFill = damageRollFill(damageHole, 4);
    const concentrationFrontier = resolveBattleSubject({
      state: released.state,
      subject: ordinaryReplaySubject(released),
      fills: [reactionTargetFill, attackFill, damageFill],
    });
    const concentrationHole = requireResultHole(
      concentrationFrontier,
      "concentrationSavingThrow",
    );
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error("Expected the source Concentration save frontier.");
    }
    const resumed = resolveBattleSubject({
      state: released.state,
      subject: ordinaryReplaySubject(released),
      fills: [
        reactionTargetFill,
        attackFill,
        damageFill,
        concentrationSavingThrowFill(concentrationHole, false),
      ],
    });

    expect(resumed).toMatchObject({
      tag: "resolved",
      snapshot: {
        round: 2,
        currentActorId: spellCasterId,
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            concentrating: false,
          }),
        ]),
      },
    });
    if (resumed.tag !== "resolved") return;
    expect(
      [...resumed.state.combatants.values()].flatMap(
        (combatant) => combatant.activeEffects,
      ),
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "persistentAreaSaveDamage" }),
      ]),
    );
    expect(resumed.state.combatants.get(spellCasterId)?.hp).toBe(
      sourceHpBeforeReaction - 4,
    );
  });

  test("applies deferred source-start effects once when a movement reaction ends Cloudkill", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const cloudkillSourceProcedureRef = activeCloudkill(
      cast.state,
    ).sourceProcedureRef;
    const targetTurn = endTurn({
      state: withCloudkillOwnedTurnStartTemporaryHitPoints(
        withSourceStartTurnDamage(cast.state, {
          sourceProcedureRef: cloudkillSourceProcedureRef,
          sourceCombatantId: spellCasterId,
        }),
        6,
      ),
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const secondaryTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the secondary target's turn to start.");
    }
    const sourceHpBeforeStartTurn =
      secondaryTurn.state.combatants.get(spellCasterId)?.hp;
    if (sourceHpBeforeStartTurn === undefined) {
      throw new Error("Expected the Cloudkill source.");
    }

    const endTurnSubject = {
      tag: "runtimeCommand" as const,
      actorId: cloudkillSecondaryTargetId,
      command: "endTurn" as const,
    };
    const sourceTurn = { actorId: spellCasterId, round: Round(2) };
    const initial = requireTransactionNeedsHoles(
      settleBattleRuntimeTransaction({
        session: battleRuntimeSessionForTest({
          ...readied,
          state: secondaryTurn.state,
        }),
        transaction: null,
        operation: {
          kind: "ordinarySubject",
          subject: endTurnSubject,
          fills: [],
        },
      }),
      "secondary target End Turn",
    );
    if (initial.frontier.kind !== "ordinaryHoles") {
      throw new Error("Expected the initial End Turn ordinary frontier.");
    }
    const orderPendingProcedure = {
      kind: "turnBoundary" as const,
      endingActorId: cloudkillSecondaryTargetId,
      sourceTurn,
      request: { kind: "startTurnOccurrenceOrder" as const },
    };
    expect(initial.frontier.pendingProcedure).toEqual(orderPendingProcedure);
    const initialEnvelope = requireTransactionEnvelope(initial);
    if (initialEnvelope.frontier.kind !== "holes") {
      throw new Error("Expected an ordinary checkpoint envelope.");
    }
    expect(initialEnvelope.frontier.replaySubject).toEqual(endTurnSubject);
    expect(initialEnvelope.frontier.pendingProcedure).toEqual(
      orderPendingProcedure,
    );
    expect(initialEnvelope.frontier.continuation).toEqual({
      kind: "ordinaryReplay",
    });

    const orderHole = requireTransactionResolutionHole(
      initial,
      "startTurnOccurrenceOrder",
    );
    expect(orderHole.actorId).toBe(spellCasterId);
    const translationOccurrence = orderHole.occurrences.find(
      (occurrence) => occurrence.kind === "persistentAreaSourceTurnTranslation",
    );
    if (translationOccurrence === undefined) {
      throw new Error("Expected the Cloudkill translation occurrence.");
    }
    const orderFill = startTurnOccurrenceOrderFill(orderHole, (occurrence) =>
      occurrence.kind === "persistentAreaSourceTurnTranslation" ? 0 : 1,
    );
    expect(orderFill.value.occurrenceIds[0]).toBe(
      translationOccurrence.occurrenceId,
    );
    const laterOccurrence = orderHole.occurrences.find(
      (occurrence) => occurrence.kind === "spellTurnStartDamageAndSave",
    );
    if (laterOccurrence === undefined) {
      throw new Error("Expected the selected later start-turn occurrence.");
    }
    expect(orderFill.value.occurrenceIds).toContain(
      laterOccurrence.occurrenceId,
    );

    const movementFrontier = requireTransactionNeedsHoles(
      settleBattleRuntimeTransaction({
        session: initial.resolution.session,
        transaction: initial.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: endTurnSubject,
          fills: [orderFill],
        },
      }),
      "Cloudkill occurrence order",
    );
    if (movementFrontier.frontier.kind !== "ordinaryHoles") {
      throw new Error("Expected the Cloudkill movement ordinary frontier.");
    }
    const translationPendingProcedure = {
      kind: "turnBoundary" as const,
      endingActorId: cloudkillSecondaryTargetId,
      sourceTurn,
      request: {
        kind: "startTurnOccurrence" as const,
        occurrence: {
          kind: translationOccurrence.kind,
          occurrenceId: translationOccurrence.occurrenceId,
        },
      },
    };
    expect(movementFrontier.frontier.pendingProcedure).toEqual(
      translationPendingProcedure,
    );
    const movementEnvelope = requireTransactionEnvelope(movementFrontier);
    if (movementEnvelope.frontier.kind !== "holes") {
      throw new Error("Expected an ordinary movement checkpoint envelope.");
    }
    expect(movementEnvelope.frontier.pendingProcedure).toEqual(
      translationPendingProcedure,
    );
    const movementFill = persistentAreaSourceTurnTranslationFill(
      requireTransactionResolutionHole(
        movementFrontier,
        "persistentAreaSourceTurnTranslation",
      ),
      [cloudkillSecondaryTargetId],
    );

    const saveFrontier = requireTransactionNeedsHoles(
      settleBattleRuntimeTransaction({
        session: movementFrontier.resolution.session,
        transaction: movementFrontier.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: endTurnSubject,
          fills: [movementFill],
        },
      }),
      "Cloudkill movement translation",
    );
    if (saveFrontier.frontier.kind !== "ordinaryHoles") {
      throw new Error("Expected the Cloudkill save ordinary frontier.");
    }
    expect(saveFrontier.frontier.pendingProcedure).toEqual(
      translationPendingProcedure,
    );
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireTransactionResolutionHole(saveFrontier, "savingThrowOutcome"),
      cloudkillSecondaryTargetId,
      false,
    );

    const interrupted = requireTransactionNeedsHoles(
      settleBattleRuntimeTransaction({
        session: saveFrontier.resolution.session,
        transaction: saveFrontier.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: endTurnSubject,
          fills: [saveFill],
        },
      }),
      "Cloudkill failed-save reaction window",
    );
    if (interrupted.frontier.kind !== "interruptDecision") {
      throw new Error("Expected the failed-save reaction window.");
    }
    expect(interrupted.frontier).not.toHaveProperty("pendingProcedure");
    const interruptedEnvelope = requireTransactionEnvelope(interrupted);
    if (interruptedEnvelope.frontier.kind !== "interruptDecision") {
      throw new Error("Expected an interrupt checkpoint envelope.");
    }
    expect(interruptedEnvelope.frontier).not.toHaveProperty("pendingProcedure");
    const checkpoint =
      interrupted.resolution.session.state.interruptStack.at(-1);
    if (
      checkpoint?.kind !== "interruptCheckpoint" ||
      checkpoint.frame.trigger !== "saveFailed" ||
      checkpoint.frame.continuation.kind !== "replay" ||
      checkpoint.frame.continuation.parentPosition === undefined
    ) {
      throw new Error(
        "Expected the failed-save checkpoint to retain its start-turn parent.",
      );
    }
    expect(checkpoint.frame.continuation.parentPosition.sourceTurn).toEqual(
      sourceTurn,
    );
    expect(checkpoint.frame.continuation.parentPosition.endingActorId).toBe(
      cloudkillSecondaryTargetId,
    );

    const choice = interrupted.frontier.choices[0];
    if (choice === undefined || !("subject" in choice)) {
      throw new Error("Expected a subject-backed reaction choice.");
    }
    if (
      choice.kind !== "nestedProcedure" ||
      choice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected the readied Ray of Frost choice.");
    }
    const released = requireTransactionNeedsHoles(
      settleBattleRuntimeTransaction({
        session: interrupted.resolution.session,
        transaction: interrupted.transaction,
        operation: {
          kind: "interruptDecision",
          fill: interruptDecisionFill(
            requireTransactionResolutionHole(interrupted, "interruptDecision"),
            {
              kind: "resolve",
              responderId: spellTargetId,
              choice: {
                kind: "releaseReadiedSpell",
                procedureRef: choice.subject.procedureRef,
                fills: [],
              },
            },
          ),
        },
      }),
      "readied Ray of Frost release",
    );
    if (released.frontier.kind !== "ordinaryHoles") {
      throw new Error("Expected the readied spell ordinary frontier.");
    }
    expect(released.frontier.pendingProcedure).toEqual({
      kind: "subjectResolution",
    });
    const releasedEnvelope = requireTransactionEnvelope(released);
    if (releasedEnvelope.frontier.kind !== "holes") {
      throw new Error("Expected the readied spell checkpoint envelope.");
    }
    expect(releasedEnvelope.frontier.pendingProcedure).toEqual({
      kind: "subjectResolution",
    });
    const releasedSubject = transactionSubject(released);
    const reactionTargetFill = targetFill(
      requireTransactionResolutionHole(released, "targetChoice"),
      spellCasterId,
    );
    const attackFrontier = requireTransactionNeedsHoles(
      settleBattleRuntimeTransaction({
        session: released.resolution.session,
        transaction: released.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: releasedSubject,
          fills: [reactionTargetFill],
        },
      }),
      "readied spell target",
    );
    const attackFill = attackRollFill(
      requireTransactionResolutionHole(attackFrontier, "attackRoll"),
      { total: 20, naturalD20: 15 },
    );
    const damageFrontier = requireTransactionNeedsHoles(
      settleBattleRuntimeTransaction({
        session: attackFrontier.resolution.session,
        transaction: attackFrontier.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: releasedSubject,
          fills: [attackFill],
        },
      }),
      "readied spell attack roll",
    );
    const damageFill = damageRollFill(
      requireTransactionResolutionHole(damageFrontier, "rolledDice"),
      4,
    );
    const concentrationFrontier = requireTransactionNeedsHoles(
      settleBattleRuntimeTransaction({
        session: damageFrontier.resolution.session,
        transaction: damageFrontier.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: releasedSubject,
          fills: [damageFill],
        },
      }),
      "readied spell damage roll",
    );
    const reactionConcentrationFill = concentrationSavingThrowFill(
      requireTransactionResolutionHole(
        concentrationFrontier,
        "concentrationSavingThrow",
      ),
      false,
    );
    const resumed = requireTransactionNeedsHoles(
      settleBattleRuntimeTransaction({
        session: concentrationFrontier.resolution.session,
        transaction: concentrationFrontier.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: releasedSubject,
          fills: [reactionConcentrationFill],
        },
      }),
      "Cloudkill start-turn replay after reaction",
    );
    if (resumed.frontier.kind !== "ordinaryHoles") {
      throw new Error("Expected the resumed start-turn ordinary frontier.");
    }
    const resumedPendingProcedure = {
      kind: "turnBoundary" as const,
      endingActorId: cloudkillSecondaryTargetId,
      sourceTurn,
      request: {
        kind: "startTurnOccurrence" as const,
        occurrence: {
          kind: laterOccurrence.kind,
          occurrenceId: laterOccurrence.occurrenceId,
        },
      },
    };
    expect(resumed.frontier.pendingProcedure).toEqual(resumedPendingProcedure);
    const resumedProcedure = resumed.frontier.pendingProcedure;
    if (resumedProcedure.kind !== "turnBoundary") {
      throw new Error("Expected the resumed turn-boundary procedure.");
    }
    expect(resumedProcedure.request).not.toEqual(
      translationPendingProcedure.request,
    );
    const resumedEnvelope = requireTransactionEnvelope(resumed);
    if (resumedEnvelope.frontier.kind !== "holes") {
      throw new Error("Expected the resumed checkpoint envelope.");
    }
    expect(resumedEnvelope.frontier.pendingProcedure).toEqual(
      resumedPendingProcedure,
    );
    const resumedEnvelopeProcedure = resumedEnvelope.frontier.pendingProcedure;
    if (resumedEnvelopeProcedure.kind !== "turnBoundary") {
      throw new Error("Expected the resumed envelope turn-boundary procedure.");
    }
    expect(resumedEnvelopeProcedure.request).not.toEqual(
      translationPendingProcedure.request,
    );
    expect(resumedEnvelope.frontier.holes).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "rolledDice" })]),
    );
    expect(
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)(
        Schema.encodeSync(BattleCheckpointFrontierEnvelopeSchema)(
          resumedEnvelope,
        ),
      ),
    ).toEqual(resumedEnvelope);
    const startDamageFill = damageRollFillWithGroups(
      requireTransactionResolutionHole(resumed, "rolledDice"),
      [[3]],
    );
    const resumedSubject = transactionSubject(resumed);
    const startSaveFrontier = requireTransactionNeedsHoles(
      settleBattleRuntimeTransaction({
        session: resumed.resolution.session,
        transaction: resumed.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: resumedSubject,
          fills: [startDamageFill],
        },
      }),
      "Cloudkill deferred source damage roll",
    );
    if (startSaveFrontier.frontier.kind !== "ordinaryHoles") {
      throw new Error("Expected the deferred source save ordinary frontier.");
    }
    expect(startSaveFrontier.frontier.pendingProcedure).toEqual(
      resumedPendingProcedure,
    );
    const startSaveFill = singleTargetSavingThrowOutcomeFill(
      requireTransactionResolutionHole(startSaveFrontier, "savingThrowOutcome"),
      spellCasterId,
      false,
    );
    const completed = settleBattleRuntimeTransaction({
      session: startSaveFrontier.resolution.session,
      transaction: startSaveFrontier.transaction,
      operation: {
        kind: "ordinarySubject",
        subject: resumedSubject,
        fills: [startSaveFill],
      },
    });
    expect(completed.tag).toBe("settled");
    if (completed.tag !== "settled") return;
    expect(completed.resolution.envelope.checkpoint).toMatchObject({
      round: 2,
      currentActorId: spellCasterId,
    });
    expect(
      completed.resolution.session.state.combatants.get(spellCasterId)?.hp,
    ).toBe(sourceHpBeforeStartTurn - 7);
    expect(
      completed.resolution.session.state.combatants.get(spellCasterId)?.tempHp,
    ).toBe(0);
    expect(
      completed.resolution.session.state.combatants.get(spellTargetId)
        ?.reactionAvailable,
    ).toBe(false);
    expect(
      completed.resolution.session.state.readiedResponses.has(spellTargetId),
    ).toBe(false);
    expect(
      [...completed.resolution.session.state.combatants.values()].flatMap(
        (combatant) => combatant.activeEffects,
      ),
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "persistentAreaSaveDamage" }),
      ]),
    );
  });

  test("rejects the former anytime movement-save command", () => {
    const { state } = castCloudkill();
    const cloudkill = [...state.combatants.values()]
      .flatMap(({ activeEffects }) => activeEffects)
      .find((effect) => effect.kind === "persistentAreaSaveDamage");
    if (cloudkill === undefined) throw new Error("Expected Cloudkill.");

    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "runtimeCommand",
          actorId: spellCasterId,
          command: "persistentAreaSaveDamageSave",
          areaMembershipTrigger: {
            kind: "areaMovesIntoSpace",
            areaId: cloudkillAreaId,
            effectRef: cloudkill.effectRef,
          },
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Source-turn translating area movement saves resolve only through the source's start-turn boundary.",
    });
  });

  test("movement holes and generated table facts round-trip through the battle codecs", () => {
    const { movementHole } = sourceTurnMovementBoundary();
    expect(
      Schema.decodeUnknownSync(BattleHoleSchema)(
        Schema.encodeSync(BattleHoleSchema)(movementHole),
      ),
    ).toEqual(movementHole);

    fc.assert(
      fc.property(
        fc.record({
          affectedCombatantIdsInResolutionOrder: fc.shuffledSubarray([
            spellCasterId,
            spellTargetId,
          ]),
        }),
        ({ affectedCombatantIdsInResolutionOrder }) => {
          const fill = {
            kind: "persistentAreaSourceTurnTranslation" as const,
            holeId: movementHole.holeId,
            value: {
              affectedCombatantIdsInResolutionOrder,
            },
          };
          expect(
            Schema.decodeUnknownSync(BattleFillSchema)(
              Schema.encodeSync(BattleFillSchema)(fill),
            ),
          ).toEqual(fill);
        },
      ),
      { numRuns: 32, seed: 0x381c10d },
    );
  });
});
