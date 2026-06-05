import {
  testBattleCreatureStateWithConditions,
  fighterTurnWithReadiedRay,
  fighterTurnWithReadiedAcidAndSecondReadiedRay,
  wizardTurnWithReadiedRay,
  fighterAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  attackDamageHoleAfterHit,
  requireHole,
  findHole,
  targetFill,
  spellTargetAllocationFill,
  attackRollFill,
  concentrationSavingThrowFill,
  interruptDecisionFill,
  savingThrowOutcomeFill,
  damageRollFill,
  reactionChoiceWithSubject,
  wizardVsSkeletonBattle,
  magicSubject,
  goblinId,
  skeletonId,
  wizardId,
  secondWizardId,
  applyCondition,
  BATTLE_READIED_SPELL_TRIGGERS,
  BattleFillSchema,
  BattleSubjectSchema,
  cantripSpellInvocationRef,
  Either,
  resolveBattleInterrupt,
  resolveBattleSubject,
  sameBattleSubject,
  Schema,
  spellSlotInvocationRef,
} from "./battle-runtime-test-support.ts";
import type { BattleState } from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: reactions, Ready, and sight facts", () => {
  test("attack hit procedures open a typed reaction window and resume after decline", () => {
    const state = fighterTurnWithReadiedRay("attackHit");
    const subject = fighterAttackSubject();
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
    const subject = fighterAttackSubject();
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
    const subject = fighterAttackSubject();
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
    const state = wizardTurnWithReadiedRay("spellCast");
    const subject = magicSubject("magic_missile");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "spellTargetAllocation",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
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
    const saveState = wizardTurnWithReadiedRay("saveFailed");
    const subject = magicSubject("acid_splash");
    const saveHole = requireHole(
      resolveBattleSubject({ state: saveState, subject, fills: [] }),
      "savingThrowOutcome",
    );
    if (saveHole.kind !== "savingThrowOutcome") {
      throw new Error("Expected Saving Throw outcome hole.");
    }
    const saveOutcomes = [{ targetId: skeletonId, succeeded: false }];
    const failedSave = resolveBattleSubject({
      state: saveState,
      subject,
      fills: [savingThrowOutcomeFill(saveHole, saveOutcomes)],
    });
    expect(failedSave).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
    });

    const damageState = wizardTurnWithReadiedRay("afterDamage");
    const damageSaveHole = requireHole(
      resolveBattleSubject({ state: damageState, subject, fills: [] }),
      "savingThrowOutcome",
    );
    if (damageSaveHole.kind !== "savingThrowOutcome") {
      throw new Error("Expected Saving Throw outcome hole.");
    }
    const damageOutcomes = [{ targetId: skeletonId, succeeded: false }];
    const damageHole = requireHole(
      resolveBattleSubject({
        state: damageState,
        subject,
        fills: [savingThrowOutcomeFill(damageSaveHole, damageOutcomes)],
      }),
      "rolledDice",
    );
    const maybeConcentration = resolveBattleSubject({
      state: damageState,
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
            state: damageState,
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
    const skeleton = base.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected Skeleton combatant.");
    }
    const state: BattleState = {
      ...base,
      combatants: new Map(base.combatants).set(skeletonId, {
        ...testBattleCreatureStateWithConditions(
          skeleton,
          applyCondition(skeleton.conditions, "blinded"),
        ),
        dodging: true,
      }),
    };
    const saveHole = requireHole(
      resolveBattleSubject({
        state,
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
      const state = wizardVsSkeletonBattle();
      const readied = resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
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
    expect(
      sameBattleSubject(
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
      ),
    ).toBe(false);
  });

  test("structured spell subject equality ignores object insertion order", () => {
    const invocation = spellSlotInvocationRef(
      "magic_missile",
      1,
      "repeatedDamageAllocation",
    );
    if (invocation.tag !== "spellSlot") {
      throw new Error("Expected a Spell Slot invocation ref.");
    }

    expect(
      sameBattleSubject(
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation,
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: {
            procedure: invocation.procedure,
            slotLevel: invocation.slotLevel,
            spellId: invocation.spellId,
            tag: invocation.tag,
          },
          mode: { tag: "cast" },
        },
      ),
    ).toBe(true);
  });

  test("after-damage reactions observe the post-damage battle state", () => {
    const state = fighterTurnWithReadiedRay("afterDamage");
    const subject = fighterAttackSubject();
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
