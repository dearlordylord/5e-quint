// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt reaction-interruption shield hellish_rebuke
// UNIT-IDENTITY-MBT-REPLAY: reaction-interruption shield doResolveShieldReactionSpellHit
// UNIT-IDENTITY-MBT-REPLAY: reaction-interruption hellish_rebuke doResolveHellishRebukeFailedSavingThrow
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  DieRollResult,
  Hp,
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
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleReaction,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleReactionProcedureChoice,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";

const reactionSpellSelectedIdentityDriverSchema = {
  init: {},
  doResolveShieldReactionSpellHit: {},
  doResolveHellishRebukeFailedSavingThrow: {},
  step: {},
} as const;
type ReactionSpellSelectedIdentityDriverAction = Exclude<
  keyof typeof reactionSpellSelectedIdentityDriverSchema,
  "init" | "step"
>;

type ReactionSpellSelectedIdentityProjection = {
  readonly reactorHp: number;
  readonly triggerCreatureHp: number;
  readonly reactorArmorClass: number;
  readonly reactorReactionAvailable: boolean;
  readonly firstLevelSlotsExpended: number;
  readonly secondLevelSlotsExpended: number;
  readonly lastResult: "init" | "resolved";
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly ReactionSpellSelectedIdentityDriverAction[];
  readonly expected: ReactionSpellSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "reaction-interruption";
  readonly unitId: ReactionSpellUnitId;
  readonly actions: readonly ReactionSpellSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type ReactionSpellUnitId = "shield" | "hellish_rebuke";

type AttackAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
};

const reactorId = combatantId("reaction-spell-selected-identity-reactor");
const triggerCreatureId = combatantId(
  "reaction-spell-selected-identity-trigger-creature",
);
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Reaction spell selected identity Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "reaction-interruption",
    unitId: "shield",
    actions: ["doResolveShieldReactionSpellHit"],
    sequences: [
      {
        name: "attack-hit-casts-shield",
        actions: ["doResolveShieldReactionSpellHit"],
        expected: expectedProjection({
          reactorArmorClass: 15,
          reactorReactionAvailable: false,
          firstLevelSlotsExpended: 1,
          lastResult: "resolved",
        }),
      },
    ],
  },
  {
    taskId: "reaction-interruption",
    unitId: "hellish_rebuke",
    actions: ["doResolveHellishRebukeFailedSavingThrow"],
    sequences: [
      {
        name: "after-damage-reaction-failed-saving-throw",
        actions: ["doResolveHellishRebukeFailedSavingThrow"],
        expected: expectedProjection({
          reactorHp: 11,
          triggerCreatureHp: 9,
          reactorReactionAvailable: false,
          secondLevelSlotsExpended: 1,
          lastResult: "resolved",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Reaction spell selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<ReactionSpellSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createReactionSpellSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Reaction spell selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Reaction spell selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Reaction spell selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-reaction-spell-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createReactionSpellSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: reactionSpellSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createReactionSpellSelectedIdentityDriver() {
  return defineDriver(reactionSpellSelectedIdentityDriverSchema, () => {
    let state = reactionSpellBattle(srdSpellRecord("shield"));
    let lastResult: ReactionSpellSelectedIdentityProjection["lastResult"] =
      "init";

    function reset(): void {
      state = reactionSpellBattle(srdSpellRecord("shield"));
      lastResult = "init";
    }

    function recordResolvedResult(
      result: ReturnType<typeof resolveBattleReaction>,
    ): void {
      if (result.tag !== "resolved") {
        throw new Error(
          `Expected Reaction spell to resolve, got ${result.tag}.`,
        );
      }
      state = result.state;
      lastResult = "resolved";
    }

    return {
      init: reset,
      doResolveShieldReactionSpellHit: () => {
        state = reactionSpellBattle(srdSpellRecord("shield"));
        const awaitingReaction = resolveAttackRollOnly({
          state,
          attackRollTotal: 14,
          includeHellishRebukeTriggerFact: false,
        });
        if (awaitingReaction.tag !== "needsHoles") {
          throw new Error("Expected Shield attack hit Reaction window.");
        }
        recordResolvedResult(resolveShieldReactionChoice(awaitingReaction));
      },
      doResolveHellishRebukeFailedSavingThrow: () => {
        state = reactionSpellBattle(srdSpellRecord("hellish_rebuke"));
        const awaitingReaction = resolveAttackRollOnly({
          state,
          attackRollTotal: 15,
          includeHellishRebukeTriggerFact: true,
        });
        if (awaitingReaction.tag !== "needsHoles") {
          throw new Error(
            "Expected Hellish Rebuke after-damage Reaction window.",
          );
        }
        const choice = requireHellishRebukeChoice(awaitingReaction);
        const save = requireHole(choice.initialHoles, "savingThrowOutcome");
        const damage = requireHole(choice.initialHoles, "rolledDice");
        recordResolvedResult(
          resolveBattleReaction({
            state: awaitingReaction.state,
            fill: reactionDecisionFill(
              requireHole(awaitingReaction.holes, "reactionDecision"),
              {
                kind: "resolve",
                reactorId,
                choice: {
                  kind: "castTriggeredReactionSpell",
                  invocation: choice.invocation,
                  fills: [
                    savingThrowOutcomeFill(save, [
                      { targetId: triggerCreatureId, succeeded: false },
                    ]),
                    damageRollFillWithGroups(damage, [[1, 1, 1]]),
                  ],
                },
              },
            ),
          }),
        );
      },
      step: () => {},
      getState: () =>
        projectReactionSpellSelectedIdentityState(state, lastResult),
    };
  });
}

function expectedProjection(
  overrides: Partial<ReactionSpellSelectedIdentityProjection> = {},
): ReactionSpellSelectedIdentityProjection {
  return {
    reactorHp: 12,
    triggerCreatureHp: 12,
    reactorArmorClass: 10,
    reactorReactionAvailable: true,
    firstLevelSlotsExpended: 0,
    secondLevelSlotsExpended: 0,
    lastResult: "init",
    ...overrides,
  };
}

function srdSpellRecord(unitId: ReactionSpellUnitId): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function reactionSpellBattle(spell: SpellRecord): BattleState {
  const result = startBattle({
    battleId: battleId(`reaction-spell-selected-identity-${spell.id}`),
    combatants: [
      reactionSpellCreature({
        combatantId: triggerCreatureId,
        displayName: "Reaction spell trigger creature",
        initiative: 20,
        side: oppositionSide,
      }),
      reactionSpellCreature({
        combatantId: reactorId,
        displayName: "Reaction spell caster",
        initiative: 10,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [spell],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [
            { spellLevel: 1, count: 2 },
            { spellLevel: 2, count: 1 },
          ],
        },
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function reactionSpellCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "wizard", level: 3 }],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
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

function resolveAttackRollOnly(input: {
  readonly state: BattleState;
  readonly attackRollTotal: number;
  readonly includeHellishRebukeTriggerFact: boolean;
}): ReturnType<typeof resolveBattleSubject> {
  const attackAct = discoverBattleActs(input.state).find(
    (act): act is AttackAct =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === triggerCreatureId &&
      act.subject.attackName === "Unarmed Strike",
  );
  if (attackAct === undefined) {
    throw new Error("Expected Unarmed Strike attack act.");
  }
  const target = requireHole(attackAct.initialHoles, "targetChoice");
  const targetFilled = attackTargetFill({
    hole: target,
    includeHellishRebukeTriggerFact: input.includeHellishRebukeTriggerFact,
  });
  const awaitingAttackRoll = resolveBattleSubject({
    state: input.state,
    subject: attackAct.subject,
    fills: [targetFilled],
  });
  if (awaitingAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected attack target to request an Attack Roll.");
  }
  const attackRoll = requireHole(awaitingAttackRoll.holes, "attackRoll");
  return resolveBattleSubject({
    state: input.state,
    subject: attackAct.subject,
    fills: [
      targetFilled,
      {
        kind: "attackRoll",
        holeId: attackRoll.holeId,
        value: { total: input.attackRollTotal, naturalD20: DieRollResult(13) },
      },
    ],
  });
}

function attackTargetFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "targetChoice" }>;
  readonly includeHellishRebukeTriggerFact: boolean;
}): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: input.hole.holeId,
    value: reactorId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: triggerCreatureId,
        targetId: reactorId,
        attackName: "Unarmed Strike",
      },
      ...(input.includeHellishRebukeTriggerFact
        ? [
            {
              kind: "reactionSpellDamagerVisibleWithinRange" as const,
              reactorId,
              damageSourceId: triggerCreatureId,
              spellId: "hellish_rebuke",
              rangeFeet: movementFeet(60),
            },
          ]
        : []),
    ],
  };
}

function resolveShieldReactionChoice(
  awaitingReaction: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >,
): ReturnType<typeof resolveBattleReaction> {
  const reactionChoice =
    awaitingReaction.snapshot.pendingReaction?.choices.find(
      (
        choice,
      ): choice is Extract<
        BattleReactionProcedureChoice,
        { readonly kind: "castTriggeredReactionSpell" }
      > =>
        choice.kind === "castTriggeredReactionSpell" &&
        choice.reactorId === reactorId &&
        choice.invocation.tag === "spellSlot" &&
        choice.invocation.spellId === "shield" &&
        choice.invocation.procedure === "shieldReaction",
    );
  if (reactionChoice === undefined) {
    throw new Error("Expected Shield Reaction spell choice.");
  }
  return resolveBattleReaction({
    state: awaitingReaction.state,
    fill: reactionDecisionFill(
      requireHole(awaitingReaction.holes, "reactionDecision"),
      {
        kind: "resolve",
        reactorId,
        choice: {
          kind: "castTriggeredReactionSpell",
          invocation: reactionChoice.invocation,
          fills: [],
        },
      },
    ),
  });
}

function requireHellishRebukeChoice(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >,
): Extract<
  BattleReactionProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
> {
  const choice = result.snapshot.pendingReaction?.choices.find(
    (
      candidate,
    ): candidate is Extract<
      BattleReactionProcedureChoice,
      { readonly kind: "castTriggeredReactionSpell" }
    > =>
      candidate.kind === "castTriggeredReactionSpell" &&
      candidate.reactorId === reactorId &&
      candidate.invocation.tag === "spellSlot" &&
      candidate.invocation.spellId === "hellish_rebuke" &&
      candidate.invocation.procedure === "saveGatedDamage" &&
      candidate.invocation.slotLevel === 2,
  );
  if (choice === undefined) {
    throw new Error("Expected Hellish Rebuke level 2 Reaction choice.");
  }
  return choice;
}

function reactionDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "reactionDecision" }>,
  value: Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "reactionDecision" }> {
  return { kind: "reactionDecision", holeId: hole.holeId, value };
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
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      rolledDiceGroup(firstGroup),
      ...restGroups.map((group) => rolledDiceGroup(group)),
    ],
  };
}

function rolledDiceGroup(
  group: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [firstResult, ...restResults] = group;
  if (firstResult === undefined) {
    throw new Error("Expected at least one die roll result.");
  }
  return {
    results: [DieRollResult(firstResult), ...restResults.map(DieRollResult)],
  };
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

function projectReactionSpellSelectedIdentityState(
  state: BattleState,
  lastResult: ReactionSpellSelectedIdentityProjection["lastResult"],
): ReactionSpellSelectedIdentityProjection {
  const snapshot = snapshotBattle(state);
  const reactor = snapshot.combatants.find(
    (combatant) => combatant.combatantId === reactorId,
  );
  const triggerCreature = snapshot.combatants.find(
    (combatant) => combatant.combatantId === triggerCreatureId,
  );
  if (reactor === undefined || triggerCreature === undefined) {
    throw new Error("Expected Reaction spell selected identity combatants.");
  }
  return {
    reactorHp: reactor.hp,
    triggerCreatureHp: triggerCreature.hp,
    reactorArmorClass: reactor.armorClass,
    reactorReactionAvailable: reactor.reactionAvailable,
    firstLevelSlotsExpended: expendedSlotsForSpellLevel(state, reactorId, 1),
    secondLevelSlotsExpended: expendedSlotsForSpellLevel(state, reactorId, 2),
    lastResult,
  };
}

function expendedSlotsForSpellLevel(
  state: BattleState,
  combatantId: CombatantId,
  spellLevel: number,
): number {
  const combatant = state.combatants.get(combatantId);
  if (combatant?.origin.kind !== "character") {
    throw new Error("Expected Reaction spell caster character origin.");
  }
  return (
    combatant.origin.spellcasting?.spellSlots.find(
      (slot) => slot.spellLevel === spellLevel,
    )?.expended ?? 0
  );
}

function normalizeReactionSpellSelectedIdentityQuintState(
  raw: unknown,
): ReactionSpellSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    reactorHp: numberFromQuintInt(state["qReactorHp"], "qReactorHp"),
    triggerCreatureHp: numberFromQuintInt(
      state["qTriggerCreatureHp"],
      "qTriggerCreatureHp",
    ),
    reactorArmorClass: numberFromQuintInt(
      state["qReactorArmorClass"],
      "qReactorArmorClass",
    ),
    reactorReactionAvailable: booleanField(state, "qReactorReactionAvailable"),
    firstLevelSlotsExpended: numberFromQuintInt(
      state["qFirstLevelSlotsExpended"],
      "qFirstLevelSlotsExpended",
    ),
    secondLevelSlotsExpended: numberFromQuintInt(
      state["qSecondLevelSlotsExpended"],
      "qSecondLevelSlotsExpended",
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
): ReactionSpellSelectedIdentityProjection["lastResult"] {
  if (raw === "init" || raw === "resolved") {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const reactionSpellSelectedIdentityStateCheck = stateCheck(
  normalizeReactionSpellSelectedIdentityQuintState,
  (
    spec: ReactionSpellSelectedIdentityProjection,
    impl: ReactionSpellSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
