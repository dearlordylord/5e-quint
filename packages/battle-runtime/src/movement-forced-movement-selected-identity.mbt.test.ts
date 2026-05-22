// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt movement-forced-movement dissonant_whispers command expeditious_retreat ranger_roving barbarian_fast_movement
// UNIT-IDENTITY-MBT-REPLAY: movement-forced-movement dissonant_whispers doDissonantWhispersForcedReactionMovement
// UNIT-IDENTITY-MBT-REPLAY: movement-forced-movement command doCommandFleeTargetTurn
// UNIT-IDENTITY-MBT-REPLAY: movement-forced-movement expeditious_retreat doExpeditiousRetreatImmediateDash
// UNIT-IDENTITY-MBT-REPLAY: movement-forced-movement ranger_roving doRangerRovingClimbSwimMovement
// UNIT-IDENTITY-MBT-REPLAY: movement-forced-movement barbarian_fast_movement doBarbarianFastMovementDash
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  DieRollResult,
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  battleCombatantSide,
  battleId,
  battleUnitRefWithSupportProfiles,
  characterId,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRolledDiceFill,
  type BattleState,
  type BattleSubject,
  type BattleUnitRef,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";

const movementForcedMovementSelectedIdentityDriverSchema = {
  init: {},
  doDissonantWhispersForcedReactionMovement: {},
  doCommandFleeTargetTurn: {},
  doExpeditiousRetreatImmediateDash: {},
  doRangerRovingClimbSwimMovement: {},
  doBarbarianFastMovementDash: {},
  step: {},
} as const;
type MovementForcedMovementSelectedIdentityDriverAction = Exclude<
  keyof typeof movementForcedMovementSelectedIdentityDriverSchema,
  "init" | "step"
>;

const movementForcedMovementSpellIds = [
  "dissonant_whispers",
  "command",
  "expeditious_retreat",
] as const;
type MovementForcedMovementSpellId =
  (typeof movementForcedMovementSpellIds)[number];
const movementForcedMovementFeatureIds = [
  "ranger_roving",
  "barbarian_fast_movement",
] as const;
type MovementForcedMovementFeatureId =
  (typeof movementForcedMovementFeatureIds)[number];
type MovementForcedMovementUnitId =
  | MovementForcedMovementSpellId
  | MovementForcedMovementFeatureId;

type MovementForcedMovementSelectedIdentityProjection = {
  readonly casterSpeedFeet: number;
  readonly casterRemainingFeet: number;
  readonly casterDashBonusFeet: number;
  readonly casterBonusActionAvailable: boolean;
  readonly casterConcentrating: boolean;
  readonly spellSlotSpentThisTurn: boolean;
  readonly level1SlotsRemaining: number;
  readonly spellDashBonusActionEffectCount: number;
  readonly targetHp: number;
  readonly targetReactionAvailable: boolean;
  readonly dissonantMovementFillRequired: boolean;
  readonly targetMovementSpentFeet: number;
  readonly commandMovementFillRequired: boolean;
  readonly commandPendingEffectObserved: boolean;
  readonly commandPendingEffectCount: number;
  readonly climbSpeedFeet: number;
  readonly swimSpeedFeet: number;
  readonly lastResult:
    | "init"
    | "dissonantWhispers"
    | "commandFlee"
    | "expeditiousRetreat"
    | "rangerRoving"
    | "barbarianFastMovement";
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly MovementForcedMovementSelectedIdentityDriverAction[];
  readonly expected: MovementForcedMovementSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "movement-forced-movement";
  readonly unitId: MovementForcedMovementUnitId;
  readonly actions: readonly MovementForcedMovementSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type BonusActionDashSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionDashSpell" }
  >;
};
type RuntimeMoveAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "move" }
  >;
};
type RuntimeCommandFleeAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "commandFlee" }
  >;
};

const casterId = combatantId("movement-forced-movement-caster");
const targetId = combatantId("movement-forced-movement-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Movement and forced movement selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "movement-forced-movement",
    unitId: "dissonant_whispers",
    actions: ["doDissonantWhispersForcedReactionMovement"],
    sequences: [
      {
        name: "failed-save-damage-then-forced-reaction-movement",
        actions: ["doDissonantWhispersForcedReactionMovement"],
        expected: expectedProjection({
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          targetHp: 18,
          targetReactionAvailable: false,
          dissonantMovementFillRequired: true,
          lastResult: "dissonantWhispers",
        }),
      },
    ],
  },
  {
    taskId: "movement-forced-movement",
    unitId: "command",
    actions: ["doCommandFleeTargetTurn"],
    sequences: [
      {
        name: "failed-save-pending-effect-forces-target-turn-flee-route",
        actions: ["doCommandFleeTargetTurn"],
        expected: expectedProjection({
          level1SlotsRemaining: 1,
          targetMovementSpentFeet: 30,
          commandMovementFillRequired: true,
          commandPendingEffectObserved: true,
          lastResult: "commandFlee",
        }),
      },
    ],
  },
  {
    taskId: "movement-forced-movement",
    unitId: "expeditious_retreat",
    actions: ["doExpeditiousRetreatImmediateDash"],
    sequences: [
      {
        name: "bonus-action-cast-dashes-and-stores-dash-permission",
        actions: ["doExpeditiousRetreatImmediateDash"],
        expected: expectedProjection({
          casterRemainingFeet: 60,
          casterDashBonusFeet: 30,
          casterBonusActionAvailable: false,
          casterConcentrating: true,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          spellDashBonusActionEffectCount: 1,
          lastResult: "expeditiousRetreat",
        }),
      },
    ],
  },
  {
    taskId: "movement-forced-movement",
    unitId: "ranger_roving",
    actions: ["doRangerRovingClimbSwimMovement"],
    sequences: [
      {
        name: "effective-speed-grants-climb-and-swim-movement-budget",
        actions: ["doRangerRovingClimbSwimMovement"],
        expected: expectedProjection({
          casterSpeedFeet: 40,
          casterRemainingFeet: 0,
          level1SlotsRemaining: 0,
          climbSpeedFeet: 40,
          swimSpeedFeet: 40,
          lastResult: "rangerRoving",
        }),
      },
    ],
  },
  {
    taskId: "movement-forced-movement",
    unitId: "barbarian_fast_movement",
    actions: ["doBarbarianFastMovementDash"],
    sequences: [
      {
        name: "passive-speed-bonus-increases-dash-movement-budget",
        actions: ["doBarbarianFastMovementDash"],
        expected: expectedProjection({
          casterSpeedFeet: 40,
          casterRemainingFeet: 80,
          casterDashBonusFeet: 40,
          level1SlotsRemaining: 0,
          lastResult: "barbarianFastMovement",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Movement and forced movement selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<MovementForcedMovementSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createMovementForcedMovementSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing movement and forced movement selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Movement and forced movement selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays movement and forced movement selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-movement-forced-movement-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createMovementForcedMovementSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: movementForcedMovementSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createMovementForcedMovementSelectedIdentityDriver() {
  return defineDriver(
    movementForcedMovementSelectedIdentityDriverSchema,
    () => {
      let state = movementForcedMovementSpellBattle();
      let lastResult: MovementForcedMovementSelectedIdentityProjection["lastResult"] =
        "init";
      let dissonantMovementFillRequired = false;
      let commandMovementFillRequired = false;
      let commandPendingEffectObserved = false;

      function reset(): void {
        state = movementForcedMovementSpellBattle();
        lastResult = "init";
        dissonantMovementFillRequired = false;
        commandMovementFillRequired = false;
        commandPendingEffectObserved = false;
      }

      function recordResolvedResult(
        result: BattleResolutionResult,
        resultKind: Exclude<
          MovementForcedMovementSelectedIdentityProjection["lastResult"],
          "init"
        >,
      ): void {
        if (result.tag !== "resolved") {
          throw new Error(
            `Expected movement and forced movement action to resolve, got ${result.tag}: ${
              "reason" in result ? result.reason : "unknown"
            } ${"message" in result ? result.message : ""}`,
          );
        }
        state = result.state;
        lastResult = resultKind;
      }

      return {
        init: reset,
        doDissonantWhispersForcedReactionMovement: () => {
          state = movementForcedMovementSpellBattle({
            sourceClassName: "bard",
            preparedSpells: [spellRecord("dissonant_whispers")],
            targetHp: 30,
            targetMaxHp: 30,
          });
          const resolved = resolveDissonantWhispersForcedReactionMovement(
            state,
            () => {
              dissonantMovementFillRequired = true;
            },
          );
          recordResolvedResult(resolved, "dissonantWhispers");
        },
        doCommandFleeTargetTurn: () => {
          state = movementForcedMovementSpellBattle({
            sourceClassName: "cleric",
            preparedSpells: [spellRecord("command")],
          });
          const resolved = resolveCommandFleeTargetTurn(
            state,
            (castState) => {
              commandPendingEffectObserved =
                commandPendingEffectCount(castState) === 1;
            },
            () => {
              commandMovementFillRequired = true;
            },
          );
          recordResolvedResult(resolved, "commandFlee");
        },
        doExpeditiousRetreatImmediateDash: () => {
          state = movementForcedMovementSpellBattle({
            sourceClassName: "wizard",
            preparedSpells: [spellRecord("expeditious_retreat")],
          });
          recordResolvedResult(
            resolveExpeditiousRetreatImmediateDash(state),
            "expeditiousRetreat",
          );
        },
        doRangerRovingClimbSwimMovement: () => {
          state = rovingBattle();
          recordResolvedResult(
            resolveRovingClimbSwimMovement(state),
            "rangerRoving",
          );
        },
        doBarbarianFastMovementDash: () => {
          state = fastMovementBattle();
          recordResolvedResult(
            resolveBarbarianFastMovementDash(state),
            "barbarianFastMovement",
          );
        },
        step: () => {},
        getState: () =>
          projectMovementForcedMovementSelectedIdentityState(state, {
            lastResult,
            dissonantMovementFillRequired,
            commandMovementFillRequired,
            commandPendingEffectObserved,
          }),
      };
    },
  );
}

function expectedProjection(
  overrides: Partial<MovementForcedMovementSelectedIdentityProjection> = {},
): MovementForcedMovementSelectedIdentityProjection {
  return {
    casterSpeedFeet: 30,
    casterRemainingFeet: 30,
    casterDashBonusFeet: 0,
    casterBonusActionAvailable: true,
    casterConcentrating: false,
    spellSlotSpentThisTurn: false,
    level1SlotsRemaining: 2,
    spellDashBonusActionEffectCount: 0,
    targetHp: 12,
    targetReactionAvailable: true,
    dissonantMovementFillRequired: false,
    targetMovementSpentFeet: 0,
    commandMovementFillRequired: false,
    commandPendingEffectObserved: false,
    commandPendingEffectCount: 0,
    climbSpeedFeet: 0,
    swimSpeedFeet: 0,
    lastResult: "init",
    ...overrides,
  };
}

function resolveDissonantWhispersForcedReactionMovement(
  state: BattleState,
  onMovementFillRequired: () => void,
): BattleResolutionResult {
  const act = actionSpellAct(state, "dissonant_whispers");
  const target = requireHole(act.initialHoles, "targetChoice");
  const targetFill = spellTargetFill(target, "dissonant_whispers");
  const savingThrow = requireResultHole(
    resolveBattleSubject({ state, subject: act.subject, fills: [targetFill] }),
    "savingThrowOutcome",
  );
  const saveFill = savingThrowOutcomeFill(savingThrow, [
    { targetId, succeeded: false },
  ]);
  const damageRoll = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, saveFill],
    }),
    "rolledDice",
  );
  const damageFill = damageRollFillWithGroups(damageRoll, [[3, 4, 5]]);
  const movement = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, saveFill, damageFill],
    }),
    "movement",
  );
  onMovementFillRequired();

  return resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetFill,
      saveFill,
      damageFill,
      movementFill(movement, {
        movementCostFeet: 30,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
}

function resolveCommandFleeTargetTurn(
  state: BattleState,
  onCastResolved: (castState: BattleState) => void,
  onMovementFillRequired: () => void,
): BattleResolutionResult {
  const act = actionSpellAct(state, "command");
  const target = requireHole(act.initialHoles, "spellTargetList");
  const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
  const targetFill = spellTargetListFill(target, "command", [targetId]);
  const optionFill: Extract<
    BattleFill,
    { readonly kind: "commandOptionChoice" }
  > = {
    kind: "commandOptionChoice",
    holeId: commandOption.holeId,
    value: "flee",
  };
  const savingThrow = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    }),
    "savingThrowOutcome",
  );
  const cast = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetFill,
      optionFill,
      savingThrowOutcomeFill(savingThrow, [{ targetId, succeeded: false }]),
    ],
  });
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Command cast to resolve, got ${cast.tag}.`);
  }
  onCastResolved(cast.state);

  const targetTurn = endTurn({ state: cast.state, actorId: casterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error(
      `Expected Command caster End Turn to resolve, got ${targetTurn.tag}.`,
    );
  }
  const flee = commandFleeAct(targetTurn.state);
  const movement = requireHole(flee.initialHoles, "movement");
  onMovementFillRequired();
  return resolveBattleSubject({
    state: targetTurn.state,
    subject: flee.subject,
    fills: [
      commandFleeMovementFill(movement, {
        movementCostFeet: 30,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
}

function resolveExpeditiousRetreatImmediateDash(
  state: BattleState,
): BattleResolutionResult {
  const act = bonusActionDashSpellAct(state, "expeditious_retreat");
  return resolveBattleSubject({ state, subject: act.subject, fills: [] });
}

function resolveRovingClimbSwimMovement(
  state: BattleState,
): BattleResolutionResult {
  const climbAct = moveAct(state);
  const climbMovement = requireHole(climbAct.initialHoles, "movement");
  const climbed = resolveBattleSubject({
    state,
    subject: climbAct.subject,
    fills: [
      movementFill(climbMovement, {
        speedKind: "climb",
        movementCostFeet: 15,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
  if (climbed.tag !== "resolved") {
    throw new Error(`Expected Roving climb Movement, got ${climbed.tag}.`);
  }

  const swimAct = moveAct(climbed.state);
  const swimMovement = requireHole(swimAct.initialHoles, "movement");
  return resolveBattleSubject({
    state: climbed.state,
    subject: swimAct.subject,
    fills: [
      movementFill(swimMovement, {
        speedKind: "swim",
        movementCostFeet: 25,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
}

function resolveBarbarianFastMovementDash(
  state: BattleState,
): BattleResolutionResult {
  return resolveBattleSubject({
    state,
    subject: {
      tag: "action",
      actorId: casterId,
      action: "dash",
      speedKind: "walk",
    },
    fills: [],
  });
}

function movementForcedMovementSpellBattle(
  input: {
    readonly sourceClassName?: "bard" | "cleric" | "wizard";
    readonly preparedSpells?: readonly SpellRecord[];
    readonly spellSlots?: readonly {
      readonly spellLevel: 1;
      readonly count: number;
    }[];
    readonly targetHp?: number;
    readonly targetMaxHp?: number;
  } = {},
): BattleState {
  return movementForcedMovementBattle({
    caster: {
      spellcasting: {
        sourceClassName: input.sourceClassName ?? "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: input.preparedSpells ?? [],
        featurePreparedSpells: [],
        invocationSpellAccesses: [],
        spellbookRitualSpellAccesses: [],
        spellSlots: input.spellSlots ?? [{ spellLevel: 1, count: 2 }],
      },
      classLevels: [{ className: input.sourceClassName ?? "wizard", level: 1 }],
    },
    target: {
      ...(input.targetHp === undefined ? {} : { currentHp: input.targetHp }),
      ...(input.targetMaxHp === undefined ? {} : { maxHp: input.targetMaxHp }),
    },
  });
}

function fastMovementBattle(): BattleState {
  return movementForcedMovementBattle({
    battleName: "fast-movement",
    caster: {
      displayName: "Fast Barbarian",
      characterUnitRefs: [featureBattleUnitRef("barbarian_fast_movement")],
      classLevels: [{ className: "barbarian", level: 5 }],
    },
  });
}

function rovingBattle(): BattleState {
  return movementForcedMovementBattle({
    battleName: "roving",
    caster: {
      displayName: "Roving Ranger",
      characterUnitRefs: [featureBattleUnitRef("ranger_roving")],
      classLevels: [{ className: "ranger", level: 6 }],
    },
  });
}

function movementForcedMovementBattle(input: {
  readonly battleName?: string;
  readonly caster?: {
    readonly displayName?: string;
    readonly spellcasting?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["spellcasting"];
    readonly characterUnitRefs?: readonly BattleUnitRef[];
    readonly classLevels?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["classLevels"];
  };
  readonly target?: {
    readonly currentHp?: number;
    readonly maxHp?: number;
  };
}): BattleState {
  const result = startBattle({
    battleId: battleId(
      `movement-forced-movement-selected-identity-${
        input.battleName ?? "spell"
      }`,
    ),
    combatants: [
      movementForcedMovementCreature({
        combatantId: casterId,
        displayName: input.caster?.displayName ?? "Movement spellcaster",
        initiative: 20,
        side: partySide,
        characterUnitRefs: input.caster?.characterUnitRefs ?? [],
        ...(input.caster?.spellcasting === undefined
          ? {}
          : { spellcasting: input.caster.spellcasting }),
        ...(input.caster?.classLevels === undefined
          ? {}
          : { classLevels: input.caster.classLevels }),
      }),
      movementForcedMovementCreature({
        combatantId: targetId,
        displayName: "Movement target",
        initiative: 10,
        side: oppositionSide,
        ...(input.target?.currentHp === undefined
          ? {}
          : { currentHp: input.target.currentHp }),
        ...(input.target?.maxHp === undefined
          ? {}
          : { maxHp: input.target.maxHp }),
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function movementForcedMovementCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly characterUnitRefs?: readonly BattleUnitRef[];
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly currentHp?: number;
  readonly maxHp?: number;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: input.characterUnitRefs ?? [],
      classLevels: input.classLevels ?? [
        {
          className: input.spellcasting?.sourceClassName ?? "wizard",
          level: 1,
        },
      ],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(input.maxHp ?? 12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function spellRecord(spellId: MovementForcedMovementSpellId): SpellRecord {
  const unit = unitLibrary.requireUnit(spellId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${spellId} to be a Spell.`);
  }
  return unit;
}

function featureBattleUnitRef(
  unitId: MovementForcedMovementFeatureId,
): BattleUnitRef {
  const unit = unitLibrary.requireUnit(unitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function actionSpellAct(
  state: BattleState,
  spellId: Extract<
    MovementForcedMovementSpellId,
    "command" | "dissonant_whispers"
  >,
): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === spellId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} action Spell act.`);
  }
  return act;
}

function bonusActionDashSpellAct(
  state: BattleState,
  spellId: Extract<MovementForcedMovementSpellId, "expeditious_retreat">,
): BonusActionDashSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is BonusActionDashSpellAct =>
      candidate.subject.tag === "bonusActionDashSpell" &&
      candidate.subject.invocation.spellId === spellId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} Bonus Action Dash spell act.`);
  }
  return act;
}

function moveAct(state: BattleState): RuntimeMoveAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is RuntimeMoveAct =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.actorId === casterId &&
      candidate.subject.command === "move",
  );
  if (act === undefined) {
    throw new Error("Expected runtime Movement command.");
  }
  return act;
}

function commandFleeAct(state: BattleState): RuntimeCommandFleeAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is RuntimeCommandFleeAct =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.actorId === targetId &&
      candidate.subject.command === "commandFlee" &&
      candidate.subject.sourceSpellId === "command",
  );
  if (act === undefined) {
    throw new Error("Expected Command Flee runtime command.");
  }
  return act;
}

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles result, got ${result.tag}.`);
  }
  return requireHole(result.holes, kind);
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: Extract<MovementForcedMovementSpellId, "dissonant_whispers">,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        spellId,
      },
    ],
  };
}

function spellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  spellId: Extract<MovementForcedMovementSpellId, "command">,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget" as const,
      casterId,
      targetId,
      spellId,
    })),
  };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
  };
}

function damageRollFillWithGroups(
  hole: Pick<BattleHole, "kind" | "holeId">,
  groups: readonly (readonly number[])[],
): BattleRolledDiceFill {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: rolledDiceGroups(groups),
  };
}

function rolledDiceGroups(
  groups: readonly (readonly number[])[],
): BattleRolledDiceFill["value"] {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

function rolledDiceGroup(
  group: readonly number[],
): BattleRolledDiceFill["value"][number] {
  const [firstRoll, ...restRolls] = group;
  if (firstRoll === undefined) {
    throw new Error("Expected at least one die result.");
  }
  return {
    results: [DieRollResult(firstRoll), ...restRolls.map(DieRollResult)],
  };
}

function movementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly speedKind?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["speedKind"];
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: readonly {
      readonly reactorId: CombatantId;
      readonly attackName: string;
    }[];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: value.speedKind ?? "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
    },
  };
}

function commandFleeMovementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: readonly {
      readonly reactorId: CombatantId;
      readonly attackName: string;
    }[];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
      commandFlee: {
        kind: "commandFleeFastestAvailableRouteAwayFromCaster",
      },
    },
  };
}

function commandPendingEffectCount(state: BattleState): number {
  return (
    state.combatants.get(targetId)?.activeEffects.filter(
      (
        effect,
      ): effect is BattleActiveEffect & {
        readonly kind: "commandPending";
      } =>
        effect.kind === "commandPending" &&
        effect.sourceSpellId === "command" &&
        effect.sourceCombatantId === casterId,
    ).length ?? 0
  );
}

function spellDashBonusActionEffectCount(state: BattleState): number {
  return (
    state.combatants.get(casterId)?.activeEffects.filter(
      (
        effect,
      ): effect is BattleActiveEffect & {
        readonly kind: "spellDashBonusAction";
      } =>
        effect.kind === "spellDashBonusAction" &&
        effect.sourceSpellId === "expeditious_retreat" &&
        effect.sourceCombatantId === casterId,
    ).length ?? 0
  );
}

function projectMovementForcedMovementSelectedIdentityState(
  state: BattleState,
  flags: {
    readonly lastResult: MovementForcedMovementSelectedIdentityProjection["lastResult"];
    readonly dissonantMovementFillRequired: boolean;
    readonly commandMovementFillRequired: boolean;
    readonly commandPendingEffectObserved: boolean;
  },
): MovementForcedMovementSelectedIdentityProjection {
  const snapshot = snapshotBattle(state);
  const caster = snapshot.combatants.find(
    (combatant) => combatant.combatantId === casterId,
  );
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === targetId,
  );
  if (caster === undefined || target === undefined) {
    throw new Error("Expected movement selected identity combatants.");
  }
  const targetState = state.combatants.get(targetId);
  const casterState = state.combatants.get(casterId);
  if (targetState === undefined || casterState === undefined) {
    throw new Error("Expected movement selected identity state combatants.");
  }
  return {
    casterSpeedFeet: caster.movement.speedFeet,
    casterRemainingFeet: caster.movement.remainingFeet,
    casterDashBonusFeet: snapshot.turn.dashMovementBonusFeet,
    casterBonusActionAvailable: snapshot.turn.bonusActionAvailable,
    casterConcentrating: casterState.concentration !== null,
    spellSlotSpentThisTurn:
      state.currentTurnResources.spellSlotUsesThisTurn.some((use) => use.kind === "committed"),
    level1SlotsRemaining: level1SlotsRemaining(state, casterId),
    spellDashBonusActionEffectCount: spellDashBonusActionEffectCount(state),
    targetHp: target.hp,
    targetReactionAvailable: targetState.reactionAvailable,
    dissonantMovementFillRequired: flags.dissonantMovementFillRequired,
    targetMovementSpentFeet: Number(targetState.movementSpentFeet),
    commandMovementFillRequired: flags.commandMovementFillRequired,
    commandPendingEffectObserved: flags.commandPendingEffectObserved,
    commandPendingEffectCount: commandPendingEffectCount(state),
    climbSpeedFeet: speedKindFeet(caster, "climb"),
    swimSpeedFeet: speedKindFeet(caster, "swim"),
    lastResult: flags.lastResult,
  };
}

function speedKindFeet(
  combatant: ReturnType<typeof snapshotBattle>["combatants"][number],
  kind: Extract<
    Extract<BattleFill, { readonly kind: "movement" }>["value"]["speedKind"],
    "climb" | "swim"
  >,
): number {
  return (
    combatant.movement.speedKinds.find((speedKind) => speedKind.kind === kind)
      ?.speedFeet ?? 0
  );
}

function level1SlotsRemaining(
  state: BattleState,
  actorId: CombatantId,
): number {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return 0;
  const slot = actor.origin.spellcasting?.spellSlots.find(
    (candidate) => Number(candidate.spellLevel) === 1,
  );
  return slot === undefined ? 0 : Number(slot.count) - Number(slot.expended);
}

function normalizeMovementForcedMovementSelectedIdentityQuintState(
  raw: unknown,
): MovementForcedMovementSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    casterSpeedFeet: numberFromQuintInt(
      state["qCasterSpeedFeet"],
      "qCasterSpeedFeet",
    ),
    casterRemainingFeet: numberFromQuintInt(
      state["qCasterRemainingFeet"],
      "qCasterRemainingFeet",
    ),
    casterDashBonusFeet: numberFromQuintInt(
      state["qCasterDashBonusFeet"],
      "qCasterDashBonusFeet",
    ),
    casterBonusActionAvailable: booleanField(
      state,
      "qCasterBonusActionAvailable",
    ),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    spellSlotSpentThisTurn: booleanField(state, "qSpellSlotSpentThisTurn"),
    level1SlotsRemaining: numberFromQuintInt(
      state["qLevel1SlotsRemaining"],
      "qLevel1SlotsRemaining",
    ),
    spellDashBonusActionEffectCount: numberFromQuintInt(
      state["qSpellDashBonusActionEffectCount"],
      "qSpellDashBonusActionEffectCount",
    ),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    targetReactionAvailable: booleanField(state, "qTargetReactionAvailable"),
    dissonantMovementFillRequired: booleanField(
      state,
      "qDissonantMovementFillRequired",
    ),
    targetMovementSpentFeet: numberFromQuintInt(
      state["qTargetMovementSpentFeet"],
      "qTargetMovementSpentFeet",
    ),
    commandMovementFillRequired: booleanField(
      state,
      "qCommandMovementFillRequired",
    ),
    commandPendingEffectObserved: booleanField(
      state,
      "qCommandPendingEffectObserved",
    ),
    commandPendingEffectCount: numberFromQuintInt(
      state["qCommandPendingEffectCount"],
      "qCommandPendingEffectCount",
    ),
    climbSpeedFeet: numberFromQuintInt(
      state["qClimbSpeedFeet"],
      "qClimbSpeedFeet",
    ),
    swimSpeedFeet: numberFromQuintInt(
      state["qSwimSpeedFeet"],
      "qSwimSpeedFeet",
    ),
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
): MovementForcedMovementSelectedIdentityProjection["lastResult"] {
  if (
    raw === "init" ||
    raw === "dissonantWhispers" ||
    raw === "commandFlee" ||
    raw === "expeditiousRetreat" ||
    raw === "rangerRoving" ||
    raw === "barbarianFastMovement"
  ) {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const movementForcedMovementSelectedIdentityStateCheck = stateCheck(
  normalizeMovementForcedMovementSelectedIdentityQuintState,
  (
    spec: MovementForcedMovementSelectedIdentityProjection,
    impl: MovementForcedMovementSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
