// UNIT-IDENTITY-EVIDENCE: selected-identity-replay reaction-interruption shield hellish_rebuke counterspell
// UNIT-IDENTITY-REPLAY: reaction-interruption shield doResolveShieldReactionSpellHit
// UNIT-IDENTITY-REPLAY: reaction-interruption hellish_rebuke doResolveHellishRebukeFailedSavingThrow
// UNIT-IDENTITY-REPLAY: reaction-interruption counterspell doResolveCounterspellMagicMissileCast
import { Either } from "effect";

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
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  startBattle,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleInterruptProcedureChoice,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";

type ReactionSpellProjection = {
  readonly reactorHp: number;
  readonly triggerCreatureHp: number;
  readonly reactorArmorClass: number;
  readonly reactorReactionAvailable: boolean;
  readonly triggerCreatureFirstLevelSlotsExpended: number;
  readonly firstLevelSlotsExpended: number;
  readonly secondLevelSlotsExpended: number;
  readonly thirdLevelSlotsExpended: number;
  readonly lastResult: "init" | "resolved";
};

type ReactionSpellUnitId = "shield" | "hellish_rebuke" | "counterspell";
type SrdSpellUnitId = ReactionSpellUnitId | "magic_missile";

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
const counterspellUnitId = "counterspell";
const magicMissileUnitId = "magic_missile";
const counterspellSlotLevel = 3;
const magicMissileSlotLevel = 1;
const magicMissileDartCount = 3;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Reaction spell selected identity Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Reaction spell selected identity replay",
  taskId: "reaction-interruption",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-reaction-spell-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: { lastResult: { Init: "init", Resolved: "resolved" } },
  projectionSchema: {
    reactorHp: "int",
    triggerCreatureHp: "int",
    reactorArmorClass: "int",
    reactorReactionAvailable: "bool",
    triggerCreatureFirstLevelSlotsExpended: "int",
    firstLevelSlotsExpended: "int",
    secondLevelSlotsExpended: "int",
    thirdLevelSlotsExpended: "int",
    lastResult: "variant",
  },
  initialProjection: projectReactionSpellState(
    reactionSpellBattle(srdSpellRecord("shield")),
    "init",
  ),
  units: [
    {
      unitId: "shield",
      procedures: [
        {
          actionName: "doResolveShieldReactionSpellHit",
          projectionAfter: {
            reactorHp: 12,
            triggerCreatureHp: 12,
            reactorArmorClass: 15,
            reactorReactionAvailable: false,
            triggerCreatureFirstLevelSlotsExpended: 0,
            firstLevelSlotsExpended: 1,
            secondLevelSlotsExpended: 0,
            thirdLevelSlotsExpended: 0,
            lastResult: "resolved",
          },
          discover: () => resolveShieldReactionSpellHit(),
        },
      ],
    },
    {
      unitId: "hellish_rebuke",
      procedures: [
        {
          actionName: "doResolveHellishRebukeFailedSavingThrow",
          projectionAfter: {
            reactorHp: 11,
            triggerCreatureHp: 9,
            reactorArmorClass: 10,
            reactorReactionAvailable: false,
            triggerCreatureFirstLevelSlotsExpended: 0,
            firstLevelSlotsExpended: 0,
            secondLevelSlotsExpended: 1,
            thirdLevelSlotsExpended: 0,
            lastResult: "resolved",
          },
          discover: () => resolveHellishRebukeFailedSavingThrow(),
        },
      ],
    },
    {
      unitId: "counterspell",
      procedures: [
        {
          actionName: "doResolveCounterspellMagicMissileCast",
          projectionAfter: {
            reactorHp: 12,
            triggerCreatureHp: 12,
            reactorArmorClass: 10,
            reactorReactionAvailable: false,
            triggerCreatureFirstLevelSlotsExpended: 0,
            firstLevelSlotsExpended: 0,
            secondLevelSlotsExpended: 0,
            thirdLevelSlotsExpended: 1,
            lastResult: "resolved",
          },
          discover: () => resolveCounterspellMagicMissileCast(),
        },
      ],
    },
  ],
});

function resolveShieldReactionSpellHit(): ReactionSpellProjection {
  const state = reactionSpellBattle(srdSpellRecord("shield"));
  const awaitingReaction = resolveAttackRollOnly({
    state,
    attackRollTotal: 14,
    includeHellishRebukeTriggerFact: false,
  });
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Shield attack hit Reaction window.");
  }
  return projectResolvedReaction(resolveShieldReactionChoice(awaitingReaction));
}

function resolveHellishRebukeFailedSavingThrow(): ReactionSpellProjection {
  const state = reactionSpellBattle(srdSpellRecord("hellish_rebuke"));
  const awaitingReaction = resolveAttackRollOnly({
    state,
    attackRollTotal: 15,
    includeHellishRebukeTriggerFact: true,
  });
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
  }
  const choice = requireHellishRebukeChoice(awaitingReaction);
  const save = requireHole(choice.initialHoles, "savingThrowOutcome");
  const damage = requireHole(choice.initialHoles, "rolledDice");
  return projectResolvedReaction(
    resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: reactorId,
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
}

function resolveCounterspellMagicMissileCast(): ReactionSpellProjection {
  const state = counterspellBattle();
  const awaitingReaction = startMagicMissileWithCounterspell(state);
  const choice = requireCounterspellChoice(awaitingReaction);
  return projectResolvedReaction(
    resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: reactorId,
          choice: {
            kind: "castTriggeredReactionSpell",
            invocation: choice.invocation,
            fills: [],
          },
        },
      ),
    }),
  );
}

function projectResolvedReaction(
  result: ReturnType<typeof resolveBattleInterrupt>,
): ReactionSpellProjection {
  if (result.tag !== "resolved") {
    throw new Error(`Expected Reaction spell to resolve, got ${result.tag}.`);
  }
  return projectReactionSpellState(result.state, "resolved");
}

function srdSpellRecord(unitId: SrdSpellUnitId): SpellRecord {
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

function counterspellBattle(): BattleState {
  const result = startBattle({
    battleId: battleId("reaction-spell-selected-identity-counterspell"),
    combatants: [
      reactionSpellCreature({
        combatantId: triggerCreatureId,
        displayName: "Reaction spell trigger creature",
        initiative: 20,
        side: oppositionSide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [srdSpellRecord(magicMissileUnitId)],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      reactionSpellCreature({
        combatantId: reactorId,
        displayName: "Reaction spell caster",
        initiative: 10,
        side: partySide,
        classLevel: 5,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [srdSpellRecord(counterspellUnitId)],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: counterspellSlotLevel, count: 1 }],
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
  readonly classLevel?: number | undefined;
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
      classLevels: [{ className: "wizard", level: input.classLevel ?? 3 }],
      knownLanguages: ["Common"],
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

function startMagicMissileWithCounterspell(
  state: BattleState,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "needsHoles" }
> {
  const subject: BattleSubject = {
    tag: "actionSpell",
    actorId: triggerCreatureId,
    invocation: spellSlotInvocationRef(
      magicMissileUnitId,
      magicMissileSlotLevel,
      "repeatedDamageAllocation",
    ),
    mode: { tag: "cast" },
  };
  const targetAllocationResult = resolveBattleSubject({
    state,
    subject,
    fills: [],
  });
  if (targetAllocationResult.tag !== "needsHoles") {
    throw new Error("Expected Magic Missile target allocation hole.");
  }
  const allocation = requireHole(
    targetAllocationResult.holes,
    "spellTargetAllocation",
  );
  const result = resolveBattleSubject({
    state,
    subject,
    fills: [
      {
        kind: "spellTargetAllocation",
        holeId: allocation.holeId,
        value: {
          allocations: [{ targetId: reactorId, count: magicMissileDartCount }],
        },
        spatialFacts: [
          {
            kind: "spellTarget",
            casterId: triggerCreatureId,
            targetId: reactorId,
            spellId: magicMissileUnitId,
          },
        ],
      },
      {
        kind: "targetSpatialFacts",
        holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
        spatialFacts: [
          {
            kind: "counterspellTriggerCasterVisibleWithinRange",
            reactorId,
            casterId: triggerCreatureId,
            spellId: counterspellUnitId,
            rangeFeet: movementFeet(60),
          },
        ],
      },
    ],
  });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Counterspell Reaction window.");
  }
  return result;
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
): ReturnType<typeof resolveBattleInterrupt> {
  const reactionChoice =
    awaitingReaction.snapshot.pendingInterrupt?.choices.find(
      (
        choice,
      ): choice is Extract<
        BattleInterruptProcedureChoice,
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
  return resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      requireHole(awaitingReaction.holes, "interruptDecision"),
      {
        kind: "resolve",
        responderId: reactorId,
        choice: {
          kind: "castTriggeredReactionSpell",
          invocation: reactionChoice.invocation,
          fills: [],
        },
      },
    ),
  });
}

function requireCounterspellChoice(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >,
): Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
> {
  const choice = result.snapshot.pendingInterrupt?.choices.find(
    (
      candidate,
    ): candidate is Extract<
      BattleInterruptProcedureChoice,
      { readonly kind: "castTriggeredReactionSpell" }
    > =>
      candidate.kind === "castTriggeredReactionSpell" &&
      candidate.reactorId === reactorId &&
      candidate.invocation.tag === "spellSlot" &&
      candidate.invocation.spellId === counterspellUnitId &&
      candidate.invocation.procedure === "counterspell" &&
      Number(candidate.invocation.slotLevel) === counterspellSlotLevel,
  );
  if (choice === undefined) {
    throw new Error("Expected Counterspell level 3 Reaction choice.");
  }
  return choice;
}

function requireHellishRebukeChoice(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >,
): Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
> {
  const choice = result.snapshot.pendingInterrupt?.choices.find(
    (
      candidate,
    ): candidate is Extract<
      BattleInterruptProcedureChoice,
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

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
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

function projectReactionSpellState(
  state: BattleState,
  lastResult: ReactionSpellProjection["lastResult"],
): ReactionSpellProjection {
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
    triggerCreatureFirstLevelSlotsExpended: expendedSlotsForSpellLevel(
      state,
      triggerCreatureId,
      1,
    ),
    firstLevelSlotsExpended: expendedSlotsForSpellLevel(state, reactorId, 1),
    secondLevelSlotsExpended: expendedSlotsForSpellLevel(state, reactorId, 2),
    thirdLevelSlotsExpended: expendedSlotsForSpellLevel(state, reactorId, 3),
    lastResult,
  };
}

function expendedSlotsForSpellLevel(
  state: BattleState,
  candidateId: CombatantId,
  spellLevel: number,
): number {
  const combatant = state.combatants.get(candidateId);
  if (combatant?.origin.kind !== "character") {
    throw new Error("Expected Reaction spell caster character origin.");
  }
  return (
    combatant.origin.spellcasting?.spellSlots.find(
      (slot) => slot.spellLevel === spellLevel,
    )?.expended ?? 0
  );
}
