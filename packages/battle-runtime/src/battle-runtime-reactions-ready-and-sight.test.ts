import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { describe, expect, test } from "vitest";
import { damageAmount } from "@dnd/shared/types";
import type { BattleState } from "./battle-runtime.test-support.ts";
import type { BattleAfterDamageEvent } from "./battle-state-execution.ts";
import {
  applyCondition,
  attackDamageHoleAfterHit,
  attackExecutionSelectionForSubjectForTest,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  BATTLE_READIED_SPELL_TRIGGERS,
  BattleFillSchema,
  BattleSnapshotSchema,
  BattleSubjectSchema,
  cantripSpellInvocationRef,
  concentrationSavingThrowFill,
  damageRollFill,
  Either,
  fighterAttackSubject,
  fighterTurnWithReadiedAcidAndSecondReadiedRay,
  fighterTurnWithReadiedRay,
  findHole,
  goblinId,
  interruptDecisionFill,
  magicSubject,
  reactionChoiceWithSubject,
  requireCharacterSpellProcedureRefForTest,
  requireHole,
  resolveBattleInterrupt,
  resolveBattleSubject,
  sameBattleSubject,
  savingThrowOutcomeFill,
  Schema,
  secondWizardId,
  skeletonId,
  snapshotBattle,
  spellSlotInvocationRef,
  spellTargetAllocationFill,
  targetFill,
  testBattleCreatureStateWithConditions,
  wizardId,
  wizardTurnWithReadiedRay,
  wizardVsSkeletonBattle,
} from "./battle-runtime.test-support.ts";
import { openAfterDamageSequenceInterruptWindow } from "./battle-reducer/interrupt-execution.ts";

function readiedSpellAttackHitPending() {
  const state = fighterTurnWithReadiedRay("attackHit");
  const subject = fighterAttackSubject(state);
  const target = attackInitialTargetHole(state, subject);
  const roll = attackRollHoleAfterTarget(state, target, subject);
  const result = resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill(target, goblinId),
      attackRollFill(roll, { total: 15, naturalD20: 10 }),
    ],
  });
  if (
    result.tag !== "needsHoles" ||
    result.snapshot.pendingInterrupt === null
  ) {
    throw new Error("Expected a pending Readied Spell attack-hit interrupt.");
  }
  return result;
}

describe("battle runtime: reactions, Ready, and sight facts", () => {
  test("action-time save-damage spells are not triggered-Reaction procedures", () => {
    const wizard =
      fighterTurnWithReadiedRay("attackHit").combatants.get(wizardId);
    if (wizard?.origin.kind !== "character") {
      throw new Error("Expected a Wizard character origin.");
    }
    const actionSaveSpell = wizard.origin.execution.procedureBindings.find(
      (binding) =>
        binding.procedure.kind === "spellInvocation" &&
        binding.procedure.execution.procedure === "saveGatedDamage",
    );
    if (
      actionSaveSpell?.procedure.kind !== "spellInvocation" ||
      actionSaveSpell.procedure.execution.procedure !== "saveGatedDamage"
    ) {
      throw new Error("Expected an action-time save-damage spell binding.");
    }

    expect(actionSaveSpell.procedure.execution.castingTime.kind).not.toBe(
      "reaction",
    );
  });

  test("attack hit procedures open a typed reaction window and resume after decline", () => {
    const state = fighterTurnWithReadiedRay("attackHit");
    const subject = fighterAttackSubject(state);
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const fills = [
      targetFill(targetHole, goblinId),
      attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
    ];
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }

    expect(awaitingReaction.snapshot.pendingInterrupt).toMatchObject({
      decisionHole: {
        kind: "interruptDecision",
        trigger: "attackHit",
        eligibleResponders: [wizardId],
      },
      stackDepth: 1,
    });
    expect(
      resolveBattleSubject({ state: awaitingReaction.state, subject, fills }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });

    const declined = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        { kind: "decline", responderId: wizardId },
      ),
    });

    expect(declined).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: {
        pendingInterrupt: null,
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: wizardId,
            reactionAvailable: true,
          }),
        ]),
      },
    });
  });

  test("resolved reactions execute the admitted readied-spell procedure before resuming attack replay", () => {
    const state = fighterTurnWithReadiedRay("attackHit");
    const subject = fighterAttackSubject(state);
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const fills = [
      targetFill(targetHole, goblinId),
      attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
    ];
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
    );
    if (
      choice.subject.tag !== "runtimeCommand" ||
      choice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected a readied-spell release subject.");
    }

    expect(
      resolveBattleInterrupt({
        state: awaitingReaction.state,
        fill: interruptDecisionFill(
          awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
          {
            kind: "resolve",
            responderId: wizardId,
            choice: {
              kind: "releaseReadiedSpell",
              readiedSpellCasterId: wizardId,
              procedureRef: subject.procedureRef,
              fills: [],
            },
          },
        ),
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        {
          kind: "resolve",
          responderId: wizardId,
          choice: {
            kind: "releaseReadiedSpell",
            readiedSpellCasterId: wizardId,
            procedureRef: choice.subject.procedureRef,
            fills: [],
          },
        },
      ),
    });

    expect(resolved).toMatchObject({
      tag: "needsHoles",
      subject: choice.subject,
      holes: [{ kind: "targetChoice" }],
      snapshot: {
        pendingInterrupt: { trigger: "attackHit" },
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: wizardId,
            reactionAvailable: false,
          }),
        ]),
      },
    });
    if (resolved.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${resolved.tag}.`);
    }
    const reactionTarget = findHole(resolved.holes, "targetChoice");
    const reactionAttack = requireHole(
      resolveBattleSubject({
        state: resolved.state,
        subject: choice.subject,
        fills: [targetFill(reactionTarget, goblinId)],
      }),
      "attackRoll",
    );
    const reactionDamage = requireHole(
      resolveBattleSubject({
        state: resolved.state,
        subject: choice.subject,
        fills: [
          targetFill(reactionTarget, goblinId),
          attackRollFill(reactionAttack, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const resumed = resolveBattleSubject({
      state: resolved.state,
      subject: choice.subject,
      fills: [
        targetFill(reactionTarget, goblinId),
        attackRollFill(reactionAttack, { total: 15, naturalD20: 10 }),
        damageRollFill(reactionDamage, 4),
      ],
    });

    expect(resumed).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: {
        pendingInterrupt: null,
        readiedResponses: { spells: [] },
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: wizardId,
            reactionAvailable: false,
          }),
        ]),
      },
    });
  });

  test("nested reaction windows resume a released readied save spell before the interrupted attack", () => {
    const state = fighterTurnWithReadiedAcidAndSecondReadiedRay();
    const subject = fighterAttackSubject(state);
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const awaitingAttackReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
      ],
    });
    if (awaitingAttackReaction.tag !== "needsHoles") {
      throw new Error(
        `Expected attack reaction window, got ${awaitingAttackReaction.tag}.`,
      );
    }
    const releaseChoice = reactionChoiceWithSubject(
      awaitingAttackReaction.snapshot.pendingInterrupt!.choices,
    );
    if (
      releaseChoice.subject.tag !== "runtimeCommand" ||
      releaseChoice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected a readied-spell release subject.");
    }
    const released = resolveBattleInterrupt({
      state: awaitingAttackReaction.state,
      fill: interruptDecisionFill(
        awaitingAttackReaction.snapshot.pendingInterrupt!.decisionHole,
        {
          kind: "resolve",
          responderId: wizardId,
          choice: {
            kind: "releaseReadiedSpell",
            readiedSpellCasterId: wizardId,
            procedureRef: releaseChoice.subject.procedureRef,
            fills: [],
          },
        },
      ),
    });
    if (released.tag !== "needsHoles") {
      throw new Error(`Expected released spell holes, got ${released.tag}.`);
    }
    const saveHole = findHole(released.holes, "savingThrowOutcome");
    if (saveHole.kind !== "savingThrowOutcome") {
      throw new Error("Expected Saving Throw outcome hole.");
    }
    const failedOutcomes = [...released.state.combatants.keys()]
      .filter((targetId) => targetId !== wizardId)
      .slice(0, 1)
      .map((targetId) => ({ targetId, succeeded: false }));
    const nestedReaction = resolveBattleSubject({
      state: released.state,
      subject: releaseChoice.subject,
      fills: [savingThrowOutcomeFill(saveHole, failedOutcomes)],
    });

    expect(nestedReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
      snapshot: {
        pendingInterrupt: {
          stackDepth: 2,
          trigger: "saveFailed",
          choices: [
            expect.objectContaining({ readiedSpellCasterId: secondWizardId }),
          ],
        },
      },
    });
    if (nestedReaction.tag !== "needsHoles") {
      throw new Error(`Expected nested reaction, got ${nestedReaction.tag}.`);
    }

    const declinedNested = resolveBattleInterrupt({
      state: nestedReaction.state,
      fill: interruptDecisionFill(
        nestedReaction.snapshot.pendingInterrupt!.decisionHole,
        { kind: "decline", responderId: secondWizardId },
      ),
    });

    expect(declinedNested).toMatchObject({
      tag: "needsHoles",
      subject: releaseChoice.subject,
      holes: [{ kind: "rolledDice" }],
      snapshot: {
        pendingInterrupt: {
          stackDepth: 1,
          trigger: "attackHit",
        },
      },
    });
    if (declinedNested.tag !== "needsHoles") {
      throw new Error(
        `Expected released spell damage hole, got ${declinedNested.tag}.`,
      );
    }

    const spellDamage = findHole(declinedNested.holes, "rolledDice");
    const afterSpellDamage = resolveBattleSubject({
      state: declinedNested.state,
      subject: releaseChoice.subject,
      fills: [
        savingThrowOutcomeFill(saveHole, failedOutcomes),
        damageRollFill(spellDamage, 4),
      ],
    });
    const resumedAttack =
      afterSpellDamage.tag === "needsHoles" &&
      afterSpellDamage.holes.every(
        (hole) => hole.kind === "concentrationSavingThrow",
      )
        ? resolveBattleSubject({
            state: declinedNested.state,
            subject: releaseChoice.subject,
            fills: [
              savingThrowOutcomeFill(saveHole, failedOutcomes),
              damageRollFill(spellDamage, 4),
              ...afterSpellDamage.holes.map((hole) =>
                concentrationSavingThrowFill(hole, true),
              ),
            ],
          })
        : afterSpellDamage;

    expect(resumedAttack).toMatchObject({
      tag: "needsHoles",
      subject,
      holes: [{ kind: "rolledDice" }],
      snapshot: {
        pendingInterrupt: null,
        readiedResponses: { spells: [{ casterId: secondWizardId }] },
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: wizardId,
            reactionAvailable: false,
            concentrating: false,
          }),
          expect.objectContaining({
            combatantId: secondWizardId,
            reactionAvailable: true,
          }),
        ]),
      },
    });
  });

  test("spell cast procedures open typed reaction windows", () => {
    const session = wizardTurnWithReadiedRay("spellCast");
    const subject = magicSubject("magic_missile");
    const target = requireHole(
      resolveBattleSubject({ session, subject, fills: [] }),
      "spellTargetAllocation",
    );
    const awaitingReaction = resolveBattleSubject({
      session,
      subject,
      fills: [
        spellTargetAllocationFill(target, [{ targetId: skeletonId, count: 3 }]),
      ],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "spellCast" }],
      snapshot: {
        pendingInterrupt: { trigger: "spellCast" },
      },
    });
  });

  test("save-failed and after-damage spell procedures open typed reaction windows", () => {
    const saveSession = wizardTurnWithReadiedRay("saveFailed");
    const subject = magicSubject("acid_splash");
    const saveHole = requireHole(
      resolveBattleSubject({ session: saveSession, subject, fills: [] }),
      "savingThrowOutcome",
    );
    if (saveHole.kind !== "savingThrowOutcome") {
      throw new Error("Expected Saving Throw outcome hole.");
    }
    const saveOutcomes = [{ targetId: skeletonId, succeeded: false }];
    const failedSave = resolveBattleSubject({
      session: saveSession,
      subject,
      fills: [savingThrowOutcomeFill(saveHole, saveOutcomes)],
    });
    expect(failedSave).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
    });

    const damageSession = wizardTurnWithReadiedRay("afterDamage");
    const damageSaveHole = requireHole(
      resolveBattleSubject({ session: damageSession, subject, fills: [] }),
      "savingThrowOutcome",
    );
    if (damageSaveHole.kind !== "savingThrowOutcome") {
      throw new Error("Expected Saving Throw outcome hole.");
    }
    const damageOutcomes = [{ targetId: skeletonId, succeeded: false }];
    const damageHole = requireHole(
      resolveBattleSubject({
        session: damageSession,
        subject,
        fills: [savingThrowOutcomeFill(damageSaveHole, damageOutcomes)],
      }),
      "rolledDice",
    );
    const maybeConcentration = resolveBattleSubject({
      session: damageSession,
      subject,
      fills: [
        savingThrowOutcomeFill(damageSaveHole, damageOutcomes),
        damageRollFill(damageHole, 4),
      ],
    });
    const afterDamage =
      maybeConcentration.tag === "needsHoles" &&
      maybeConcentration.holes[0]?.kind === "concentrationSavingThrow"
        ? resolveBattleSubject({
            session: damageSession,
            subject,
            fills: [
              savingThrowOutcomeFill(damageSaveHole, damageOutcomes),
              damageRollFill(damageHole, 4),
              concentrationSavingThrowFill(maybeConcentration.holes[0], true),
            ],
          })
        : maybeConcentration;
    expect(afterDamage).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
    });
  });

  test("Dodge projects Advantage for Dexterity saving throw outcome holes", () => {
    const base = wizardVsSkeletonBattle();
    const skeleton = base.state.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected Skeleton combatant.");
    }
    const state: BattleState = {
      ...base.state,
      combatants: new Map(base.state.combatants).set(skeletonId, {
        ...testBattleCreatureStateWithConditions(
          skeleton,
          applyCondition(skeleton.conditions, "blinded"),
        ),
        dodging: true,
      }),
    };
    const saveHole = requireHole(
      resolveBattleSubject({
        session: battleRuntimeSessionForTest({ state, context: base.context }),
        subject: magicSubject("acid_splash"),
        fills: [],
      }),
      "savingThrowOutcome",
    );

    expect(saveHole).toMatchObject({
      ability: "dex",
      targetRollModes: [{ targetId: skeletonId, rollMode: "advantage" }],
    });
  });

  test("Ready stores the runtime-selected trigger without test-only state surgery", () => {
    for (const trigger of BATTLE_READIED_SPELL_TRIGGERS) {
      const session = wizardVsSkeletonBattle();
      const readied = resolveBattleSubject({
        state: session.state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger },
        },
        fills: [],
      });

      expect(readied).toMatchObject({ tag: "resolved" });
      if (readied.tag !== "resolved") {
        throw new Error(`Expected resolved Ready Spell, got ${readied.tag}.`);
      }
      expect(readied.state.readiedSpells.get(wizardId)?.trigger).toBe(trigger);
    }
  });

  test("structured spell subjects reject Ready mode without a trigger", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSubjectSchema)({
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready" },
        }),
      ),
    ).toBe(true);
  });

  test("structured spell subjects keep cast mode separate from Ready mode", () => {
    const session = wizardVsSkeletonBattle();
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
    );
    expect(
      sameBattleSubject(
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef,
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef,
          mode: { tag: "ready", trigger: "spellCast" },
        },
      ),
    ).toBe(false);
  });

  test("structured spell subject equality uses the admitted procedure reference", () => {
    const session = wizardVsSkeletonBattle();
    const invocation = spellSlotInvocationRef(
      "magic_missile",
      1,
      "repeatedDamageAllocation",
    );
    if (invocation.tag !== "spellSlot") {
      throw new Error("Expected a Spell Slot invocation ref.");
    }
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      invocation,
    );

    expect(
      sameBattleSubject(
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef,
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef,
          mode: { tag: "cast" },
        },
      ),
    ).toBe(true);
  });

  test("after-damage reactions observe the post-damage battle state", () => {
    const state = fighterTurnWithReadiedRay("afterDamage");
    const subject = fighterAttackSubject(state);
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
      total: 15,
      naturalD20: 10,
    });
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 3 }),
        ]),
        turn: { actionResources: [] },
      },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }

    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
    );
    if (
      choice.subject.tag !== "runtimeCommand" ||
      choice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected a readied-spell release subject.");
    }
    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        {
          kind: "resolve",
          responderId: wizardId,
          choice: {
            kind: "releaseReadiedSpell",
            readiedSpellCasterId: wizardId,
            procedureRef: choice.subject.procedureRef,
            fills: [],
          },
        },
      ),
    });

    expect(resolved).toMatchObject({
      tag: "needsHoles",
      subject: choice.subject,
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 3 }),
        ]),
      },
    });
  });

  test("resumes each event in a multi-event after-damage sequence after decline", () => {
    const session = wizardTurnWithReadiedRay("afterDamage");
    const event = {
      damageSourceId: skeletonId,
      damagedId: wizardId,
      damageAmount: damageAmount(1),
      reactionSpellTargetFacts: [],
    } satisfies BattleAfterDamageEvent;
    const firstWindow = openAfterDamageSequenceInterruptWindow({
      state: session.state,
      subject: { tag: "action", actorId: wizardId, action: "dodge" },
      events: [event, event],
      objectDamages: [],
      objectIgnitions: [],
      droppedObjects: [],
      handledInterruptTrigger: undefined,
    });
    expect(firstWindow).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
    });
    if (firstWindow.tag !== "needsHoles") {
      throw new Error("Expected the first after-damage interrupt window.");
    }
    const firstDeclined = resolveBattleInterrupt({
      state: firstWindow.state,
      fill: interruptDecisionFill(
        findHole(firstWindow.holes, "interruptDecision"),
        { kind: "decline", responderId: wizardId },
      ),
    });
    expect(firstDeclined).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
    });
    if (firstDeclined.tag !== "needsHoles") {
      throw new Error("Expected the second after-damage interrupt window.");
    }
    const secondDeclined = resolveBattleInterrupt({
      state: firstDeclined.state,
      fill: interruptDecisionFill(
        findHole(firstDeclined.holes, "interruptDecision"),
        { kind: "decline", responderId: wizardId },
      ),
    });
    expect(secondDeclined).toMatchObject({
      tag: "resolved",
      snapshot: { pendingInterrupt: null },
    });
  });

  test("reaction decision schema parses nested reaction procedure fills", () => {
    const decoded = Schema.decodeUnknownEither(BattleFillSchema)({
      kind: "interruptDecision",
      holeId: "battle:interrupt:decision",
      value: {
        kind: "resolve",
        responderId: "wizard",
        choice: {
          kind: "releaseReadiedSpell",
          readiedSpellCasterId: "wizard",
          fills: [
            {
              kind: "notARealFill",
              holeId: "battle:spell:target",
              value: "goblin",
            },
          ],
        },
      },
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("snapshot codecs preserve the Readied Spell procedure binding", () => {
    const state = fighterTurnWithReadiedRay("attackHit");
    const readied = state.readiedSpells.get(wizardId);
    if (readied === undefined) {
      throw new Error("Expected the Wizard to hold a readied spell.");
    }

    const encoded = Schema.encodeSync(BattleSnapshotSchema)(
      snapshotBattle(state),
    );
    const decoded = Schema.decodeUnknownSync(BattleSnapshotSchema)(encoded);

    expect(decoded.readiedResponses.spells).toContainEqual(
      expect.objectContaining({
        casterId: wizardId,
        procedureRef: readied.procedureRef,
      }),
    );
  });

  test("snapshot decoding rejects unbound, wrong-kind, and mismatched Readied Spell owners", () => {
    const awaiting = readiedSpellAttackHitPending();
    const encoded = Schema.encodeSync(BattleSnapshotSchema)(awaiting.snapshot);
    if (encoded.pendingInterrupt === null) {
      throw new Error("Expected an encoded pending interrupt.");
    }
    const pendingInterrupt = encoded.pendingInterrupt;
    const releaseChoice = pendingInterrupt.choices.find(
      (choice) => choice.kind === "releaseReadiedSpell",
    );
    if (
      releaseChoice?.kind !== "releaseReadiedSpell" ||
      releaseChoice.subject.tag !== "runtimeCommand" ||
      releaseChoice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected an encoded Readied Spell release choice.");
    }
    const readiedSpellProcedureRef = releaseChoice.subject.procedureRef;
    const parsedRef: unknown = JSON.parse(releaseChoice.subject.procedureRef);
    if (
      typeof parsedRef !== "object" ||
      parsedRef === null ||
      !("scopeRef" in parsedRef)
    ) {
      throw new Error("Expected a canonical nested procedure reference.");
    }
    const unboundRef = JSON.stringify({
      scopeRef: parsedRef.scopeRef,
      kind: "procedure",
      ordinal: 999,
    });
    const wizard = encoded.combatants.find(
      (combatant) => combatant.combatantId === wizardId,
    );
    if (wizard?.origin.kind !== "character") {
      throw new Error("Expected the encoded Wizard character origin.");
    }
    const wrongKindRef =
      wizard.origin.attackExecution.unarmedStrikeProcedureRef;
    const differentSpellBinding =
      wizard.origin.execution.procedureBindings.find(
        (binding) =>
          binding.procedure.kind === "spellInvocation" &&
          binding.procedureRef !== readiedSpellProcedureRef,
      );
    if (differentSpellBinding === undefined) {
      throw new Error("Expected another encoded Wizard spell binding.");
    }
    const replaceReleaseChoice = (input: {
      readonly procedureRef: string;
      readonly reactorId?: string;
      readonly casterId?: string;
    }) => ({
      ...encoded,
      pendingInterrupt: {
        ...pendingInterrupt,
        choices: pendingInterrupt.choices.map((choice) =>
          choice.kind === "releaseReadiedSpell" &&
          choice.subject.tag === "runtimeCommand" &&
          choice.subject.command === "releaseReadiedSpell"
            ? {
                ...choice,
                reactorId: input.reactorId ?? choice.reactorId,
                readiedSpellCasterId:
                  input.casterId ?? choice.readiedSpellCasterId,
                subject: {
                  ...choice.subject,
                  readiedSpellCasterId:
                    input.casterId ?? choice.subject.readiedSpellCasterId,
                  procedureRef: input.procedureRef,
                },
              }
            : choice,
        ),
      },
    });
    const replaceReleaseAct = (procedureRef: string) => ({
      ...encoded,
      acts: encoded.acts.map((act) =>
        act.subject.tag === "runtimeCommand" &&
        act.subject.command === "releaseReadiedSpell"
          ? {
              ...act,
              subject: { ...act.subject, procedureRef },
            }
          : act,
      ),
    });
    const releaseTargetHole = releaseChoice.initialHoles.find(
      (hole) => hole.kind === "targetChoice" && hole.procedureRef !== undefined,
    );
    if (releaseTargetHole?.kind !== "targetChoice") {
      throw new Error(
        "Expected a reference-bearing Readied Spell target hole.",
      );
    }
    const releaseChoiceWithUnboundHole = {
      ...encoded,
      pendingInterrupt: {
        ...pendingInterrupt,
        choices: pendingInterrupt.choices.map((choice) =>
          choice !== releaseChoice
            ? choice
            : {
                ...choice,
                initialHoles: choice.initialHoles.map((hole) =>
                  hole !== releaseTargetHole
                    ? hole
                    : { ...hole, procedureRef: unboundRef },
                ),
              },
        ),
      },
    };
    const releaseChoiceWithMismatchedSourceHole = {
      ...encoded,
      pendingInterrupt: {
        ...pendingInterrupt,
        choices: pendingInterrupt.choices.map((choice) =>
          choice !== releaseChoice
            ? choice
            : {
                ...choice,
                initialHoles: choice.initialHoles.map((hole) =>
                  hole !== releaseTargetHole
                    ? hole
                    : {
                        kind: "spellTargetList" as const,
                        holeId: hole.holeId,
                        holeInstanceKey: hole.holeInstanceKey,
                        label: "Synthetic pending choice source witness",
                        sourceProcedureRef: differentSpellBinding.procedureRef,
                        minTargets: 1 as const,
                        maxTargets: 1,
                        spatialTargeting: {
                          kind: "individualTargets" as const,
                        },
                        choices: [goblinId],
                        requiresTableSpatialFact: true as const,
                      },
                ),
              },
        ),
      },
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(
          replaceReleaseChoice({ procedureRef: unboundRef }),
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)({
          ...encoded,
          readiedResponses: {
            ...encoded.readiedResponses,
            spells: encoded.readiedResponses.spells.map((readied) =>
              readied.casterId === wizardId
                ? {
                    ...readied,
                    procedureRef: differentSpellBinding.procedureRef,
                  }
                : readied,
            ),
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(
          replaceReleaseChoice({ procedureRef: wrongKindRef }),
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(
          replaceReleaseChoice({
            procedureRef: releaseChoice.subject.procedureRef,
            reactorId: goblinId,
          }),
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(
          replaceReleaseAct(unboundRef),
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(
          replaceReleaseAct(wrongKindRef),
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(
          replaceReleaseAct(differentSpellBinding.procedureRef),
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(
          releaseChoiceWithUnboundHole,
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(
          releaseChoiceWithMismatchedSourceHole,
        ),
      ),
    ).toBe(true);
  });

  test("retaliation decisions carry one exact attack execution selection", () => {
    const selection = attackExecutionSelectionForSubjectForTest(
      fighterAttackSubject(fighterTurnWithReadiedRay("attackHit"), "Longsword"),
    );
    const decision = {
      kind: "interruptDecision",
      holeId: "battle:interrupt:decision",
      value: {
        kind: "resolve",
        responderId: "synthetic-retaliator",
        choice: {
          kind: "retaliationAttack",
          reactorId: "synthetic-retaliator",
          selection,
          fills: [],
        },
      },
    };

    expect(
      Either.isRight(Schema.decodeUnknownEither(BattleFillSchema)(decision)),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          kind: "interruptDecision",
          holeId: "battle:interrupt:decision",
          value: {
            kind: "resolve",
            responderId: "synthetic-retaliator",
            choice: {
              kind: "retaliationAttack",
              reactorId: "synthetic-retaliator",
              attackName: "Synthetic Retaliation Strike",
              fills: [],
            },
          },
        }),
      ),
    ).toBe(true);
  });

  test("attack sight spatial facts parse through target-choice fills", () => {
    const decoded = Schema.decodeUnknownEither(BattleFillSchema)({
      kind: "targetChoice",
      holeId: "battle:attack:target",
      value: "goblin",
      spatialFacts: [
        {
          kind: "attackAttackerCannotSeeTarget",
          attackerId: "fighter",
          targetId: "goblin",
        },
        {
          kind: "attackTargetCannotSeeAttacker",
          attackerId: "fighter",
          targetId: "goblin",
        },
      ],
    });

    expect(Either.isRight(decoded)).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          kind: "targetChoice",
          holeId: "battle:attack:target",
          value: "goblin",
          spatialFacts: [
            {
              kind: "attackAttackerCanSeeTarget",
              attackerId: "fighter",
              targetId: "goblin",
              canSee: true,
            },
          ],
        }),
      ),
    ).toBe(true);
  });
});
