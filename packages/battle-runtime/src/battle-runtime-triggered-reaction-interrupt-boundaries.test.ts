import { describe, expect, test } from "vitest";

import type {
  AvailableBattleAct,
  BattleProcedureExecutionRef,
  BattleHole,
  BattleFill,
  BattleInterruptProcedureChoice,
  BattleSubject,
} from "./index.ts";
import { resolveBattleSubject as resolveBattleSubjectRuntime } from "./index.ts";
import {
  attackRollFill,
  battleId,
  characterSeed,
  combatantId,
  damageRollFillWithGroups,
  discoverBattleActs,
  endTurn,
  findHole,
  movementFeet,
  requireCharacterSpellProcedureRefForTest,
  requireHole,
  resolveBattleInterrupt,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  spellSlotInvocationRef,
  spellTargetAllocationFill,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  spellAct,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { statBlockWithCreatureType } from "./unit-profile-admission-creature-fixture.test-support.ts";

const spellCasterId = combatantId("triggered-reaction-spell-caster");
const reactionCasterId = combatantId("triggered-reaction-reaction-caster");
const attackerId = combatantId("triggered-reaction-attacker");

type AttackAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
};

describe("triggered Reaction spell interrupt boundaries", () => {
  test("does not reopen a spell-cast window when the caller handled that trigger", () => {
    const magicMissile = spellRecord("magic_missile");
    const counterspell = spellRecord("counterspell");
    const session = startBattleSessionRight({
      battleId: battleId("battle-triggered-reaction-spell-cast-guard"),
      combatants: [
        characterSeed({
          combatantId: spellCasterId,
          displayName: "Spell caster",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [magicMissile],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: reactionCasterId,
          displayName: "Counterspell reactor",
          initiative: 10,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [counterspell],
            spellSlots: [{ spellLevel: 3, count: 1 }],
          }),
        }),
      ],
    });
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      session,
      spellCasterId,
      spellSlotInvocationRef("magic_missile", 1, "repeatedDamageAllocation"),
    );
    const subject = findActionSpell(session, spellCasterId, procedureRef);
    const allocationHole = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [] }),
      "spellTargetAllocation",
    );
    const allocation = spellTargetAllocationFill(
      allocationHole,
      [{ targetId: reactionCasterId, count: 3 }],
      spellCasterId,
    );
    const handledInterruptTrigger: "spellCast" | undefined = "spellCast";
    const result = resolveBattleSubject({
      state: session.state,
      subject,
      ...(handledInterruptTrigger === undefined
        ? {}
        : { handledInterruptTrigger }),
      fills: [allocation],
    });
    if (result.tag === "invalid") {
      throw new Error(`handled spell cast invalid: ${result.message}`);
    }

    expect(result).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: null },
      holes: [{ kind: "rolledDice" }],
    });
  });

  test("skips relationship continuation when Hellish Rebuke damage is nullified by immunity", () => {
    const hellishRebuke = spellRecord("hellish_rebuke");
    const baseAttacker = statBlockWithCreatureType("humanoid");
    const fireImmuneAttacker = {
      ...baseAttacker,
      statBlock: {
        ...baseAttacker.statBlock,
        immunities: { damageTypes: ["fire"] as const },
      },
    };
    const session = startBattleSessionRight({
      battleId: battleId("battle-triggered-reaction-zero-damage"),
      combatants: [
        statBlockCreatureInit({
          combatantId: attackerId,
          statBlockName: "Fire-immune attacker",
          initiative: 20,
          statBlock: fireImmuneAttacker,
        }),
        characterSeed({
          combatantId: reactionCasterId,
          displayName: "Hellish Rebuke caster",
          initiative: 10,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [hellishRebuke],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
      ],
    });
    const attack = attackAgainstReactionCaster({
      session,
      attackerId,
      targetId: reactionCasterId,
      reactorId: reactionCasterId,
      spellId: "hellish_rebuke",
      slotLevel: 1,
      attackRoll: { total: 20, naturalD20: 15 },
    });
    const choice = requireReactionSpellChoice(attack.result, reactionCasterId);
    const save = findHole(choice.initialHoles, "savingThrowOutcome");
    const damage = findHole(choice.initialHoles, "rolledDice");
    const resolved = resolveBattleInterrupt({
      state: attack.result.state,
      fill: interruptDecisionFill(
        findHole(attack.result.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: reactionCasterId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: attackerId, succeeded: false },
              ]),
              damageRollFillWithGroups(damage, [[3, 3]]),
            ],
          },
        },
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected immune Hellish Rebuke to resolve.");
    }
    expect(
      resolved.snapshot.combatants.find(
        (combatant) => combatant.combatantId === attackerId,
      ),
    ).toMatchObject({ hp: 10 });
  });

  test("requests a damage relationship decision for a triggered Reaction spell", () => {
    const animalFriendship = spellRecord("animal_friendship");
    const hellishRebuke = spellRecord("hellish_rebuke");
    const beastStatBlock = statBlockWithCreatureType("beast");
    const casterAId = combatantId("triggered-reaction-relationship-source");
    const casterBId = combatantId("triggered-reaction-relationship-reactor");
    const beastId = combatantId("triggered-reaction-relationship-beast");
    const session = startBattleSessionRight({
      battleId: battleId("battle-triggered-reaction-relationship"),
      combatants: [
        characterSeed({
          combatantId: casterAId,
          displayName: "Animal Friendship caster",
          initiative: 30,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [animalFriendship],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: casterBId,
          displayName: "Hellish Rebuke reactor",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [hellishRebuke],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        statBlockCreatureInit({
          combatantId: beastId,
          statBlockName: "Charmed beast attacker",
          initiative: 10,
          statBlock: beastStatBlock,
        }),
      ],
    });
    const charmed = castSaveGatedConditionSpell({
      session,
      spellId: "animal_friendship",
      casterId: casterAId,
      targetId: beastId,
    });
    const casterBTurn = endTurn({ state: charmed.state, actorId: casterAId });
    if (casterBTurn.tag !== "resolved") {
      throw new Error("Expected Animal Friendship caster turn to end.");
    }
    const beastTurn = endTurn({ state: casterBTurn.state, actorId: casterBId });
    if (beastTurn.tag !== "resolved") {
      throw new Error("Expected Hellish Rebuke caster turn to end.");
    }
    const beastSession = battleRuntimeSessionForTest({
      ...session,
      state: beastTurn.state,
    });
    const attack = attackAgainstReactionCaster({
      session: beastSession,
      attackerId: beastId,
      targetId: casterBId,
      reactorId: casterBId,
      spellId: "hellish_rebuke",
      slotLevel: 1,
      attackRoll: { total: 20, naturalD20: 15 },
    });
    const choice = requireReactionSpellChoice(attack.result, casterBId);
    const save = findHole(choice.initialHoles, "savingThrowOutcome");
    const damage = findHole(choice.initialHoles, "rolledDice");
    const relationshipResult = resolveBattleInterrupt({
      state: attack.result.state,
      fill: interruptDecisionFill(
        findHole(attack.result.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: casterBId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: beastId, succeeded: false },
              ]),
              damageRollFillWithGroups(damage, [[3, 3]]),
            ],
          },
        },
      ),
    });

    expect(relationshipResult).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "damageRelationshipDecisions" }],
    });
    if (relationshipResult.tag !== "needsHoles") {
      throw new Error("Expected a damage relationship decision hole.");
    }
    const relationship = findHole(
      relationshipResult.holes,
      "damageRelationshipDecisions",
    );
    expect(relationship.questions).toEqual([
      expect.objectContaining({
        kind: "targetDamagedByCasterOrAlly",
        targetId: beastId,
        effectSourceId: casterAId,
      }),
    ]);
    const [firstQuestion, ...remainingQuestions] = relationship.questions;
    if (firstQuestion === undefined) {
      throw new Error("Expected a relationship question.");
    }
    const completed = resolveBattleSubjectRuntime({
      state: relationshipResult.state,
      subject: choice.subject,
      fills: [
        savingThrowOutcomeFill(save, [{ targetId: beastId, succeeded: false }]),
        damageRollFillWithGroups(damage, [[3, 3]]),
        {
          kind: "damageRelationshipDecisions",
          holeId: relationship.holeId,
          answers: [
            { questionId: firstQuestion.questionId, answer: false },
            ...remainingQuestions.map((question) => ({
              questionId: question.questionId,
              answer: false,
            })),
          ],
        },
      ],
    });
    expect(completed).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
  });
});

function findActionSpell(
  session: ReturnType<typeof battleRuntimeSessionForTest>,
  actorId: ReturnType<typeof combatantId>,
  procedureRef: BattleProcedureExecutionRef,
): Extract<BattleSubject, { readonly tag: "actionSpell" }> {
  const act = discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.mode.tag === "cast" &&
      String(candidate.subject.procedureRef) === procedureRef,
  );
  if (act === undefined || act.subject.tag !== "actionSpell") {
    throw new Error(`Expected action spell ${procedureRef}.`);
  }
  return act.subject;
}

function castSaveGatedConditionSpell(input: {
  readonly session: ReturnType<typeof battleRuntimeSessionForTest>;
  readonly spellId: string;
  readonly casterId: ReturnType<typeof combatantId>;
  readonly targetId: ReturnType<typeof combatantId>;
}): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const act = spellAct({
    session: input.session,
    spellId: input.spellId,
    slotLevel: 1,
  });
  const targetHole = requireHole(
    resolveBattleSubject({
      state: input.session.state,
      subject: act.subject,
      fills: [],
    }),
    "spellTargetList",
  );
  const target = spellTargetListFill(
    targetHole,
    input.casterId,
    input.spellId,
    [input.targetId],
  );
  const saveHole = requireHole(
    resolveBattleSubject({
      state: input.session.state,
      subject: act.subject,
      fills: [target],
    }),
    "savingThrowOutcome",
  );
  const result = resolveBattleSubject({
    state: input.session.state,
    subject: act.subject,
    fills: [
      target,
      savingThrowOutcomeFill(saveHole, [
        { targetId: input.targetId, succeeded: false },
      ]),
    ],
  });
  if (result.tag !== "resolved") {
    throw new Error(
      result.tag === "invalid"
        ? `Expected ${input.spellId} to resolve: ${result.message}`
        : `Expected ${input.spellId} to resolve, got ${result.tag}.`,
    );
  }
  return result;
}

function attackAgainstReactionCaster(input: {
  readonly session: ReturnType<typeof battleRuntimeSessionForTest>;
  readonly attackerId: ReturnType<typeof combatantId>;
  readonly targetId: ReturnType<typeof combatantId>;
  readonly reactorId: ReturnType<typeof combatantId>;
  readonly spellId: string;
  readonly slotLevel: 1 | 2 | 3;
  readonly attackRoll: Parameters<typeof attackRollFill>[1];
}): {
  readonly result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
} {
  const spellProcedureRef = requireCharacterSpellProcedureRefForTest(
    input.session,
    input.reactorId,
    spellSlotInvocationRef(input.spellId, input.slotLevel, "saveGatedDamage"),
  );
  const act = discoverBattleActs(input.session).find(
    (candidate): candidate is AttackAct =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.actorId === input.attackerId,
  );
  if (act === undefined) {
    throw new Error("Expected attacker action.");
  }
  const targetHole = findHole(act.initialHoles, "targetChoice");
  const baseTarget = targetFill(targetHole, input.targetId);
  if (baseTarget.kind !== "targetChoice") {
    throw new Error("Expected target-choice fill.");
  }
  const target = {
    ...baseTarget,
    spatialFacts: [
      ...(baseTarget.spatialFacts ?? []),
      {
        kind: "reactionSpellDamagerVisibleWithinRange" as const,
        reactorId: input.reactorId,
        damageSourceId: input.attackerId,
        sourceProcedureRef: spellProcedureRef,
        rangeFeet: movementFeet(60),
      },
    ],
  } satisfies Extract<BattleFill, { readonly kind: "targetChoice" }>;
  const attackRollHole = requireHole(
    resolveBattleSubject({
      state: input.session.state,
      subject: act.subject,
      fills: [target],
    }),
    "attackRoll",
  );
  const attackRoll = attackRollFill(attackRollHole, input.attackRoll);
  const attackResult = resolveBattleSubject({
    state: input.session.state,
    subject: act.subject,
    fills: [target, attackRoll],
  });
  const result =
    attackResult.tag === "needsHoles" &&
    attackResult.snapshot.pendingInterrupt === null &&
    attackResult.holes.some((hole) => hole.kind === "rolledDice")
      ? resolveBattleSubject({
          state: attackResult.state,
          subject: act.subject,
          fills: [
            target,
            attackRoll,
            damageRollFillWithGroups(
              findHole(attackResult.holes, "rolledDice"),
              [[1]],
            ),
          ],
        })
      : attackResult;
  if (result.tag !== "needsHoles") {
    throw new Error(
      result.tag === "invalid"
        ? `Expected reaction window: ${result.message}`
        : `Expected reaction window, got ${result.tag}.`,
    );
  }
  return { result, subject: act.subject };
}

function requireReactionSpellChoice(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >,
  reactorId: ReturnType<typeof combatantId>,
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
      candidate.reactorId === reactorId,
  );
  if (choice === undefined) {
    throw new Error("Expected triggered Reaction spell choice.");
  }
  return choice;
}

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
}
