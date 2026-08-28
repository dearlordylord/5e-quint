import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
} from "./battle-runtime.test-support.ts";
import { resolveBattleSubject } from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-ongoing-spell-ending
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay B21-DISPEL-MAGIC-IDENTITY-WITNESS dispel_magic
// UNIT-IDENTITY-REPLAY: B21-DISPEL-MAGIC-IDENTITY-WITNESS dispel_magic doEndObjectAttachedSpellLight doEndSelectedMagicalEffectActiveEffect doRejectOutOfRangeObjectTarget
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, Round } from "@dnd/shared/types";
import { expect } from "vitest";

import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  continualFlameUnitId,
  dispelMagicUnitId,
  heatMetalUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleObjectId,
  type BattleActiveEffect,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type BattleStoredLightEmitter,
  type BattleTrackedOngoingSpellLightEmitter,
} from "./index.ts";

type OngoingSpellTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "ongoingSpellTargetChoice" }
>;
type OngoingSpellTarget = OngoingSpellTargetChoiceFill["value"];
type OngoingSpellTargetWithinRangeFact =
  OngoingSpellTargetChoiceFill["spatialFacts"][number];

type DispelMagicLastResult =
  | "init"
  | "objectSpellLightEnded"
  | "selectedMagicalEffectEnded"
  | "outOfRangeObjectRejected";

const DISPEL_MAGIC_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  ObjectSpellLightEnded: "objectSpellLightEnded",
  SelectedMagicalEffectEnded: "selectedMagicalEffectEnded",
  OutOfRangeObjectRejected: "outOfRangeObjectRejected",
} as const;

type DispelMagicSelectedIdentityState = {
  readonly magicActionAvailable: boolean;
  readonly thirdLevelSlotCommitted: boolean;
  readonly spellLightEmitterCount: number;
  readonly selectedActiveEffectPresent: boolean;
  readonly retainedActiveEffectPresent: boolean;
  readonly lastResult: DispelMagicLastResult;
};
type DispelMagicRuntimeState = {
  readonly battle: BattleRuntimeSession;
  readonly lastResult: DispelMagicLastResult;
};
type BattleSpellEffectOccurrenceId = ReturnType<
  typeof battleSpellEffectOccurrenceId
>;

const selectedObjectId = battleObjectId("selected-dispel-magic-object");
const selectedActiveEffectId = battleSpellEffectOccurrenceId(
  `${spellCasterId}:${heatMetalUnitId}:${selectedObjectId}:selected`,
);
const retainedActiveEffectId = battleSpellEffectOccurrenceId(
  `${spellTargetId}:${heatMetalUnitId}:${selectedObjectId}:retained`,
);

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Dispel Magic selected identity replay",
  taskId: "B21-DISPEL-MAGIC-IDENTITY-WITNESS",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-dispel-magic-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: DISPEL_MAGIC_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  witnessInvalidScenarioReasons: {
    outOfRangeObjectRejected: "invalidFill",
  },
  projectionSchema: {
    magicActionAvailable: "bool",
    thirdLevelSlotCommitted: "bool",
    spellLightEmitterCount: "int",
    selectedActiveEffectPresent: "bool",
    retainedActiveEffectPresent: "bool",
    lastResult: "variant",
  },
  initialProjection: dispelMagicProjection(initialRuntimeState()),
  units: [
    {
      unitId: dispelMagicUnitId,
      procedures: [
        {
          actionName: "doEndObjectAttachedSpellLight",
          discover: () => dispelMagicProjection(endObjectAttachedSpellLight()),
        },
        {
          actionName: "doEndSelectedMagicalEffectActiveEffect",
          discover: () =>
            dispelMagicProjection(endSelectedMagicalEffectActiveEffect()),
        },
        {
          actionName: "doRejectOutOfRangeObjectTarget",
          discover: () => dispelMagicProjection(rejectOutOfRangeObjectTarget()),
        },
      ],
    },
  ],
});

function initialRuntimeState(): DispelMagicRuntimeState {
  return {
    battle: battleWithSpellLightAndActiveEffects(),
    lastResult: "init",
  };
}

function endObjectAttachedSpellLight(): DispelMagicRuntimeState {
  const battle = battleWithLightEmitters([
    objectSpellEmitter({
      objectId: selectedObjectId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(continualFlameUnitId),
      ),
      sourceSpellLevel: 2,
    }),
  ]);
  const act = spellAct({
    session: battle,
    spellId: dispelMagicUnitId,
    slotLevel: 3,
  });
  expect(battleActSpellPresentation(act)?.invocation).toMatchObject({
    spellId: dispelMagicUnitId,
    procedure: "ongoingSpellEnd",
  });
  const resolved = requireResolved(
    resolveBattleSubject({
      state: battle.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
          target: { kind: "object", objectId: selectedObjectId },
        }),
      ],
    }),
    "Expected selected Dispel Magic object target to resolve.",
  );
  return {
    battle: battleRuntimeSessionForTest({ ...battle, state: resolved.state }),
    lastResult: "objectSpellLightEnded",
  };
}

function endSelectedMagicalEffectActiveEffect(): DispelMagicRuntimeState {
  const battle = battleWithActiveEffects([
    heatMetalObjectContactDamageEffect({
      objectId: selectedObjectId,
      sourceCombatantId: spellCasterId,
      effectId: selectedActiveEffectId,
    }),
    heatMetalObjectContactDamageEffect({
      objectId: selectedObjectId,
      sourceCombatantId: spellTargetId,
      effectId: retainedActiveEffectId,
    }),
  ]);
  const act = spellAct({
    session: battle,
    spellId: dispelMagicUnitId,
    slotLevel: 3,
  });
  expect(battleActSpellPresentation(act)?.invocation).toMatchObject({
    spellId: dispelMagicUnitId,
    procedure: "ongoingSpellEnd",
  });
  const resolved = requireResolved(
    resolveBattleSubject({
      state: battle.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
          target: {
            kind: "magicalEffect",
            effect: {
              kind: "spellActiveEffect",
              activeEffectKind: "spellObjectContactDamage",
              effectRef: battleEffectExecutionRefForTest(
                String(selectedActiveEffectId),
              ),
            },
          },
        }),
      ],
    }),
    "Expected selected Dispel Magic magical-effect target to resolve.",
  );
  return {
    battle: battleRuntimeSessionForTest({ ...battle, state: resolved.state }),
    lastResult: "selectedMagicalEffectEnded",
  };
}

function rejectOutOfRangeObjectTarget(): DispelMagicRuntimeState {
  const battle = battleWithLightEmitters([
    objectSpellEmitter({
      objectId: selectedObjectId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(continualFlameUnitId),
      ),
      sourceSpellLevel: 2,
    }),
  ]);
  const act = spellAct({
    session: battle,
    spellId: dispelMagicUnitId,
    slotLevel: 3,
  });
  expect(battleActSpellPresentation(act)?.invocation).toMatchObject({
    spellId: dispelMagicUnitId,
    procedure: "ongoingSpellEnd",
  });
  const target = { kind: "object" as const, objectId: selectedObjectId };
  const rejected = resolveBattleSubject({
    state: battle.state,
    subject: act.subject,
    fills: [
      ongoingSpellTargetFill({
        hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
        target,
        facts: [
          ongoingSpellTargetWithinRangeFact({
            target,
            rangeFeet: movementFeet(121),
          }),
        ],
      }),
    ],
  });
  expect(rejected).toMatchObject({
    tag: "invalid",
    reason: "invalidFill",
    message:
      "Ongoing spell target does not satisfy the selected spell's range.",
  });
  return { battle, lastResult: "outOfRangeObjectRejected" };
}

function battleWithLightEmitters(
  lightEmitters: readonly BattleStoredLightEmitter[],
): BattleRuntimeSession {
  const session = spellBattle({
    preparedSpells: [spellRecord(dispelMagicUnitId)],
    spellSlots: [{ spellLevel: 3, count: 1 }],
  });
  return battleRuntimeSessionForTest({
    ...session,
    state: { ...session.state, lightEmitters },
  });
}

function battleWithActiveEffects(
  activeEffects: readonly BattleActiveEffect[],
): BattleRuntimeSession {
  const battle = battleWithLightEmitters([]);
  const combatants = new Map(battle.state.combatants);
  const caster = combatants.get(spellCasterId);
  const target = combatants.get(spellTargetId);
  if (caster === undefined || target === undefined) {
    throw new Error("Expected Dispel Magic fixture combatants.");
  }
  combatants.set(spellCasterId, {
    ...caster,
    concentration: {
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(heatMetalUnitId),
      ),
      effectKind: "spellEffect",
    },
    activeEffects: [
      ...caster.activeEffects,
      ...activeEffects.filter(
        (effect) => effect.sourceCombatantId === spellCasterId,
      ),
    ],
  });
  combatants.set(spellTargetId, {
    ...target,
    concentration: {
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(heatMetalUnitId),
      ),
      effectKind: "spellEffect",
    },
    activeEffects: [
      ...target.activeEffects,
      ...activeEffects.filter(
        (effect) => effect.sourceCombatantId === spellTargetId,
      ),
    ],
  });
  return battleRuntimeSessionForTest({
    ...battle,
    state: { ...battle.state, combatants },
  });
}

function battleWithSpellLightAndActiveEffects(): BattleRuntimeSession {
  const battle = battleWithActiveEffects([
    heatMetalObjectContactDamageEffect({
      objectId: selectedObjectId,
      sourceCombatantId: spellCasterId,
      effectId: selectedActiveEffectId,
    }),
    heatMetalObjectContactDamageEffect({
      objectId: selectedObjectId,
      sourceCombatantId: spellTargetId,
      effectId: retainedActiveEffectId,
    }),
  ]);
  return battleRuntimeSessionForTest({
    ...battle,
    state: {
      ...battle.state,
      lightEmitters: [
        objectSpellEmitter({
          objectId: selectedObjectId,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(continualFlameUnitId),
          ),
          sourceSpellLevel: 2,
        }),
      ],
    },
  });
}

function objectSpellEmitter(input: {
  readonly objectId: ReturnType<typeof battleObjectId>;
  readonly sourceProcedureRef: ReturnType<
    typeof battleProcedureExecutionRefForTest
  >;
  readonly sourceSpellLevel: number;
}): BattleTrackedOngoingSpellLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(input.sourceProcedureRef),
    ),
    sourceCombatantId: spellTargetId,
    sourceEffectId: battleSpellEffectOccurrenceId(
      `${spellTargetId}:${input.sourceProcedureRef}:${input.objectId}:selected`,
    ),
    sourceSpellLevel: testBattleSpellEffectLevel(input.sourceSpellLevel),
    attachment: { kind: "object", objectId: input.objectId },
    emission: {
      kind: "brightAndDim",
      brightRadiusFeet: movementFeet(20),
      dimAdditionalFeet: movementFeet(20),
    },
    opaqueCoverInteraction: { kind: "blocksEmission" },
    expiresAt: { kind: "untilDispelled" },
  };
}

function heatMetalObjectContactDamageEffect(input: {
  readonly objectId: ReturnType<typeof battleObjectId>;
  readonly sourceCombatantId: typeof spellCasterId | typeof spellTargetId;
  readonly effectId: ReturnType<typeof battleSpellEffectOccurrenceId>;
}): Extract<BattleActiveEffect, { readonly kind: "spellObjectContactDamage" }> {
  return {
    kind: "spellObjectContactDamage",
    effectRef: battleEffectExecutionRefForTest(String(input.effectId)),
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(heatMetalUnitId),
    ),
    sourceCombatantId: input.sourceCombatantId,
    sourceSpellLevel: testBattleSpellEffectLevel(2),
    objectId: input.objectId,
    rangeFeet: movementFeet(60),
    damage: {
      expr: { dice: 2, dieSize: 8 },
      damageType: "fire",
    },
    startedOn: { actorId: input.sourceCombatantId, round: Round(1) },
    expiresAt: {
      kind: "concentration",
      combatantId: input.sourceCombatantId,
      durationTicks: elapsedTimeTicks(10),
    },
  };
}

function dispelMagicProjection(
  state: DispelMagicRuntimeState,
): DispelMagicSelectedIdentityState {
  return {
    magicActionAvailable: canSpendAction(
      state.battle.state.currentTurnResources,
      "magic",
    ),
    thirdLevelSlotCommitted:
      state.battle.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed" && use.combatantId === spellCasterId,
      ),
    spellLightEmitterCount: state.battle.state.lightEmitters.filter(
      (emitter) => emitter.kind === "spellLightEmitter",
    ).length,
    selectedActiveEffectPresent: hasActiveEffect(
      state.battle.state,
      selectedActiveEffectId,
    ),
    retainedActiveEffectPresent: hasActiveEffect(
      state.battle.state,
      retainedActiveEffectId,
    ),
    lastResult: state.lastResult,
  };
}

function hasActiveEffect(
  state: BattleState,
  effectId: BattleSpellEffectOccurrenceId,
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        effect.kind === "spellObjectContactDamage" &&
        effect.effectRef === battleEffectExecutionRefForTest(String(effectId)),
    ),
  );
}

function ongoingSpellTargetFill(input: {
  readonly hole: Extract<
    BattleHole,
    { readonly kind: "ongoingSpellTargetChoice" }
  >;
  readonly target: OngoingSpellTarget;
  readonly facts?: readonly OngoingSpellTargetWithinRangeFact[];
}): OngoingSpellTargetChoiceFill {
  return {
    kind: "ongoingSpellTargetChoice",
    holeId: input.hole.holeId,
    value: input.target,
    spatialFacts: input.facts ?? [
      ongoingSpellTargetWithinRangeFact({ target: input.target }),
    ],
  };
}

function ongoingSpellTargetWithinRangeFact(input: {
  readonly target: OngoingSpellTarget;
  readonly rangeFeet?: ReturnType<typeof movementFeet>;
}): OngoingSpellTargetWithinRangeFact {
  return {
    kind: "ongoingSpellTargetWithinRange",
    casterId: spellCasterId,
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(dispelMagicUnitId),
    ),
    target: input.target,
    rangeFeet: input.rangeFeet ?? movementFeet(120),
  };
}

function testBattleSpellEffectLevel(sourceSpellLevel: number) {
  const parsed = parseBattleSpellEffectLevel(sourceSpellLevel);
  if (parsed === null) {
    throw new Error("Expected test spell effect level to be in range.");
  }
  return parsed;
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
