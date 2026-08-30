import { describe, expect, test } from "vitest";
import { DieRollResult } from "@dnd/shared/types";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import type { BattleFill, BattleHole } from "./battle-state-execution.ts";
import type { BattleRuntimeSession } from "./battle-runtime.test-support.ts";
import {
  battleId,
  attackRollFill,
  cantripSpellInvocationRef,
  characterBattleFeatureInitForTest,
  characterSeed,
  combatantId,
  damageRollFillWithGroups,
  discoverBattleActs,
  endTurn,
  findAct,
  magicSubject,
  requireCharacterSpellProcedureRefForTest,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  spellRecord,
  statBlockCatalog,
  statBlockCreatureInit,
  startBattleSessionRight,
  supportedBattleUnitRef,
  targetFill,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { spellTargetListFillForTest } from "./spell-target-list.test-support.ts";
import { SPELL_CAST_REACTION_FACTS_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";

const primaryTargetId = combatantId(
  "ice-knife-attack-burst-boundaries-primary",
);
const replacementTargetId = combatantId(
  "ice-knife-attack-burst-boundaries-replacement",
);
const reactionResponderId = combatantId(
  "ice-knife-attack-burst-boundaries-responder",
);

describe("Ice Knife attack-burst boundaries", () => {
  test("offers the admitted natural-one reroll before Ice Knife damage", () => {
    const halflingLuck = unitLibrary.requireUnit("species_halfling_luck");
    const session = startBattleSessionRight({
      battleId: battleId("ice-knife-attack-burst-boundaries-reroll"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          characterUnitRefs: [supportedBattleUnitRef(halflingLuck)],
          unitFeatures: [characterBattleFeatureInitForTest(halflingLuck)],
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: primaryTargetId,
          displayName: "Primary Target",
          initiative: 10,
          currentHp: 30,
          maxHp: 30,
        }),
      ],
    });
    const subject = findAct(session, magicSubject("ice_knife")).subject;
    const target = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const attack = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [targetChoice],
      }),
      "attackRoll",
    );
    const rerollRequested = resolveBattleSubject({
      state: session.state,
      subject,
      fills: [
        targetChoice,
        attackRollFill(attack, { total: 5, naturalD20: 1 }),
      ],
    });

    expect(rerollRequested).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "attackRoll",
          d20TestNaturalOneRerolls: [
            expect.objectContaining({
              effectKind: "d20_test_natural_one_reroll",
            }),
          ],
        }),
      ],
    });
  });

  test("retargets through Sanctuary while preserving the side-channel fill", () => {
    const session = startBattleSessionRight({
      battleId: battleId("ice-knife-attack-burst-boundaries-sanctuary"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: primaryTargetId,
          displayName: "Warded Target",
          initiative: 10,
          currentHp: 30,
          maxHp: 30,
          classLevels: [{ className: "cleric", level: 1 }],
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [],
              preparedSpells: [spellRecord("sanctuary")],
              spellSlots: [{ spellLevel: 1, count: 1 }],
            }),
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "cleric",
              abilityModifier: 3,
            },
          },
        }),
        characterSeed({
          combatantId: replacementTargetId,
          displayName: "Replacement Target",
          initiative: 9,
          currentHp: 30,
          maxHp: 30,
        }),
      ],
    });
    const afterWizard = requireResolved(
      endTurn({ state: session.state, actorId: wizardId }),
    ).state;
    const wardedSession = battleRuntimeSessionForTest({
      ...session,
      state: afterWizard,
    });
    const sanctuaryAct = spellActForActor(
      wardedSession,
      primaryTargetId,
      "sanctuary",
    );
    const sanctuaryTarget = requireHole(
      resolveBattleSubject({
        state: afterWizard,
        subject: sanctuaryAct.subject,
        fills: [],
      }),
      "spellTargetList",
    );
    const sanctuaryCast = requireResolved(
      resolveBattleSubject({
        state: afterWizard,
        subject: sanctuaryAct.subject,
        fills: [
          spellTargetListFillForTest(
            sanctuaryTarget,
            primaryTargetId,
            primaryTargetId,
          ),
        ],
      }),
    ).state;
    const wizardTurn = requireResolved(
      endTurn({ state: sanctuaryCast, actorId: primaryTargetId }),
    ).state;
    const casterTurn = requireResolved(
      endTurn({ state: wizardTurn, actorId: replacementTargetId }),
    ).state;
    const stateSession = battleRuntimeSessionForTest({
      ...session,
      state: casterTurn,
    });
    const subject = findAct(stateSession, magicSubject("ice_knife")).subject;
    const state = casterTurn;
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const needsSanctuary = resolveBattleSubject({
      state,
      subject,
      fills: [targetChoice],
    });
    const sanctuary = requireHole(
      needsSanctuary,
      "targetingSaveInterdictionOutcome",
    );
    const replacementChoice = targetFill(target, replacementTargetId);
    const replacementSpatialFacts =
      replacementChoice.kind === "targetChoice"
        ? (replacementChoice.spatialFacts ?? [])
        : [];
    const reactionFacts = {
      kind: "targetSpatialFacts" as const,
      holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
      spatialFacts: [],
    } satisfies Extract<BattleFill, { readonly kind: "targetSpatialFacts" }>;
    const retargeted = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        reactionFacts,
        {
          kind: "targetingSaveInterdictionOutcome",
          holeId: sanctuary.holeId,
          value: {
            saveSucceeded: false,
            outcome: {
              kind: "newTarget",
              targetId: replacementTargetId,
              replacementTargetKind: "attackRoll",
              spatialFacts: replacementSpatialFacts,
            },
          },
        } satisfies Extract<
          BattleFill,
          { readonly kind: "targetingSaveInterdictionOutcome" }
        >,
      ],
    });

    expect(retargeted).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "attackRoll" })],
    });
  });

  test("asks for Mirror Image interception before the burst damage path", () => {
    const session = startBattleSessionRight({
      battleId: battleId("ice-knife-attack-burst-boundaries-mirror-image"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: primaryTargetId,
          displayName: "Mirrored Target",
          initiative: 10,
          classLevel: 3,
          currentHp: 30,
          maxHp: 30,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("mirror_image")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
      ],
    });
    const afterWizard = requireResolved(
      endTurn({ state: session.state, actorId: wizardId }),
    ).state;
    const mirroredSession = battleRuntimeSessionForTest({
      ...session,
      state: afterWizard,
    });
    const mirrorAct = spellActForActor(
      mirroredSession,
      primaryTargetId,
      "mirror_image",
    );
    const mirrorCast = requireResolved(
      resolveBattleSubject({
        state: afterWizard,
        subject: mirrorAct.subject,
        fills: [],
      }),
    ).state;
    const state = requireResolved(
      endTurn({ state: mirrorCast, actorId: primaryTargetId }),
    ).state;
    const casterSession = battleRuntimeSessionForTest({ ...session, state });
    const subject = findAct(casterSession, magicSubject("ice_knife")).subject;
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(targetHole, primaryTargetId);
    const attackHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = {
      kind: "attackRoll" as const,
      holeId: attackHole.holeId,
      value: { total: 25, naturalD20: DieRollResult(20) },
    } satisfies Extract<BattleFill, { readonly kind: "attackRoll" }>;
    const mirrorHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    expect(mirrorHole).toHaveProperty("duplicateHitInterceptionRoll");
    const redirected = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        attackRoll,
        damageRollFillWithGroups(mirrorHole, [[6, 6, 6]]),
      ],
    });
    expect(redirected).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "savingThrowOutcome" })],
    });
  });

  test("requests independent relationship decisions for attack and burst damage", () => {
    const session = startBattleSessionRight({
      battleId: battleId("ice-knife-attack-burst-boundaries-relationships"),
      combatants: [
        characterSeed({
          combatantId: replacementTargetId,
          displayName: "Condition Source",
          initiative: 30,
          attack: null,
          classLevels: [{ className: "druid", level: 1 }],
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [],
              preparedSpells: [spellRecord("animal_friendship")],
              spellSlots: [{ spellLevel: 1, count: 1 }],
            }),
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "druid",
              abilityModifier: 3,
            },
          },
        }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        statBlockCreatureInit({
          combatantId: primaryTargetId,
          displayName: "Charmed Wolf",
          initiative: 10,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_wolf"),
        }),
      ],
    });
    const friendshipAct = spellActForActor(
      session,
      replacementTargetId,
      "animal_friendship",
    );
    const friendshipTarget = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: friendshipAct.subject,
        fills: [],
      }),
      "spellTargetList",
    );
    const friendshipTargetFill = spellTargetListFillForTest(
      friendshipTarget,
      replacementTargetId,
      primaryTargetId,
    );
    const friendshipSave = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: friendshipAct.subject,
        fills: [friendshipTargetFill],
      }),
      "savingThrowOutcome",
    );
    const charmed = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: friendshipAct.subject,
        fills: [
          friendshipTargetFill,
          {
            kind: "savingThrowOutcome",
            holeId: friendshipSave.holeId,
            value: {
              outcomes: [{ targetId: primaryTargetId, succeeded: false }],
            },
          } satisfies Extract<
            BattleFill,
            { readonly kind: "savingThrowOutcome" }
          >,
        ],
      }),
    ).state;
    const state = requireResolved(
      endTurn({ state: charmed, actorId: replacementTargetId }),
    ).state;
    const casterSession = battleRuntimeSessionForTest({ ...session, state });
    const subject = findAct(casterSession, magicSubject("ice_knife")).subject;
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(targetHole, primaryTargetId);
    const attackHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attackHole, {
      total: 25,
      naturalD20: 20,
    });
    const attackDamageHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    const attackDamage = damageRollFillWithGroups(attackDamageHole, [[1, 1]]);
    const saveHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamage],
      }),
      "savingThrowOutcome",
    );
    const save = {
      kind: "savingThrowOutcome" as const,
      holeId: saveHole.holeId,
      value: {
        area: {
          originAnchorId: primaryTargetId,
          affectedTargetIds: [primaryTargetId],
        },
        outcomes: [{ targetId: primaryTargetId, succeeded: false }],
      },
    } satisfies Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>;
    const burstHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamage, save],
      }),
      "rolledDice",
    );
    const burstDamage = damageRollFillWithGroups(burstHole, [[1, 1]]);
    const beforeRelationships = [
      targetChoice,
      attackRoll,
      attackDamage,
      save,
      burstDamage,
    ];
    const attackRelationship = requireHole(
      resolveBattleSubject({ state, subject, fills: beforeRelationships }),
      "damageRelationshipDecisions",
    );
    expect(attackRelationship.damageEventHoleId).toBe(attackDamageHole.holeId);
    const attackRelationshipFill = relationshipFill(attackRelationship, false);
    const burstRelationship = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...beforeRelationships, attackRelationshipFill],
      }),
      "damageRelationshipDecisions",
    );
    expect(burstRelationship.damageEventHoleId).toBe(burstHole.holeId);
    expect(attackRelationship.questions.length).toBeGreaterThan(0);
    expect(burstRelationship.questions.length).toBeGreaterThan(0);
    expect(burstRelationship.holeId).not.toBe(attackRelationship.holeId);
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...beforeRelationships,
          attackRelationshipFill,
          relationshipFill(burstRelationship, true),
        ],
      }),
    );

    expect(resolved.tag).toBe("resolved");
  });

  test("opens the spell-cast reaction window before an Ice Knife attack roll", () => {
    const session = readyResponderSession("spellCast");
    const subject = findAct(session, magicSubject("ice_knife")).subject;
    const target = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [] }),
      "targetChoice",
    );
    const awaitingReaction = resolveBattleSubject({
      state: session.state,
      subject,
      fills: [targetFill(target, primaryTargetId)],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "spellCast" }],
    });
  });

  test("opens the attack-hit reaction window after a successful Ice Knife attack roll", () => {
    const session = readyResponderSession("attackHit");
    const subject = findAct(session, magicSubject("ice_knife")).subject;
    const target = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const attack = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [targetChoice],
      }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state: session.state,
      subject,
      fills: [
        targetChoice,
        attackRollFill(attack, { total: 25, naturalD20: 20 }),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "attackHit" }],
    });
  });

  test("opens the save-failed reaction window after a failed Ice Knife save", () => {
    const session = readyResponderSession("saveFailed");
    const subject = findAct(session, magicSubject("ice_knife")).subject;
    const target = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const attack = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [targetChoice],
      }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 25, naturalD20: 20 });
    const attackDamage = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    const attackDamageRoll = damageRollFillWithGroups(attackDamage, [[5, 5]]);
    const save = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll],
      }),
      "savingThrowOutcome",
    );
    const awaitingReaction = resolveBattleSubject({
      state: session.state,
      subject,
      fills: [
        targetChoice,
        attackRoll,
        attackDamageRoll,
        {
          kind: "savingThrowOutcome",
          holeId: save.holeId,
          value: {
            area: {
              originAnchorId: primaryTargetId,
              affectedTargetIds: [primaryTargetId],
            },
            outcomes: [{ targetId: primaryTargetId, succeeded: false }],
          },
        } satisfies Extract<
          BattleFill,
          { readonly kind: "savingThrowOutcome" }
        >,
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
    });
  });

  test("opens the after-damage reaction window after the Ice Knife burst", () => {
    const session = readyResponderSession("afterDamage");
    const subject = findAct(session, magicSubject("ice_knife")).subject;
    const target = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const attack = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [targetChoice],
      }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 25, naturalD20: 10 });
    const attackDamage = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    const attackDamageRoll = damageRollFillWithGroups(attackDamage, [[5]]);
    const save = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll],
      }),
      "savingThrowOutcome",
    );
    const saveFill = {
      kind: "savingThrowOutcome" as const,
      holeId: save.holeId,
      value: {
        area: {
          originAnchorId: primaryTargetId,
          affectedTargetIds: [primaryTargetId],
        },
        outcomes: [{ targetId: primaryTargetId, succeeded: false }],
      },
    } satisfies Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>;
    const burst = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll, saveFill],
      }),
      "rolledDice",
    );
    const awaitingReaction = resolveBattleSubject({
      state: session.state,
      subject,
      fills: [
        targetChoice,
        attackRoll,
        attackDamageRoll,
        saveFill,
        damageRollFillWithGroups(burst, [[4, 4]]),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
    });
  });
});

function relationshipFill(
  hole: Extract<BattleHole, { readonly kind: "damageRelationshipDecisions" }>,
  answer: boolean,
): Extract<BattleFill, { readonly kind: "damageRelationshipDecisions" }> {
  const [firstQuestion, ...remainingQuestions] = hole.questions;
  if (firstQuestion === undefined) {
    throw new Error("Expected a relationship decision question.");
  }
  return {
    kind: "damageRelationshipDecisions",
    holeId: hole.holeId,
    answers: [
      { questionId: firstQuestion.questionId, answer },
      ...remainingQuestions.map((question) => ({
        questionId: question.questionId,
        answer,
      })),
    ],
  };
}

function spellActForActor(
  session: BattleRuntimeSession,
  actorId: ReturnType<typeof combatantId>,
  spellId: string,
) {
  const act = discoverBattleActs(session).find((candidate) => {
    const subject = candidate.subject;
    if (
      (subject.tag !== "actionSpell" && subject.tag !== "bonusActionSpell") ||
      subject.actorId !== actorId
    ) {
      return false;
    }
    return (
      battleActSpellPresentation(candidate)?.invocation.spellId === spellId
    );
  });
  if (act === undefined) {
    throw new Error(`Expected ${spellId} act for ${String(actorId)}.`);
  }
  return act;
}

function readyResponderSession(
  trigger: "spellCast" | "attackHit" | "saveFailed" | "afterDamage",
) {
  const base = startBattleSessionRight({
    battleId: battleId(`ice-knife-attack-burst-boundaries-reaction-${trigger}`),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 30,
        attack: null,
        spellcasting: wizardSpellcasting({
          cantrips: [],
          preparedSpells: [spellRecord("ice_knife")],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      characterSeed({
        combatantId: reactionResponderId,
        displayName: "Reaction Responder",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          cantrips: [spellRecord("ray_of_frost")],
          preparedSpells: [],
          spellSlots: [],
        }),
      }),
      characterSeed({
        combatantId: primaryTargetId,
        displayName: "Primary Target",
        initiative: 10,
        currentHp: 30,
        maxHp: 30,
      }),
    ],
  });
  const responderTurn = requireResolved(
    endTurn({ state: base.state, actorId: wizardId }),
  ).state;
  const responderSession = battleRuntimeSessionForTest({
    ...base,
    state: responderTurn,
  });
  const ready = requireResolved(
    resolveBattleSubject({
      state: responderTurn,
      subject: {
        tag: "actionSpell",
        actorId: reactionResponderId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          responderSession,
          reactionResponderId,
          cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
        ),
        mode: { tag: "ready", trigger },
      },
      fills: [],
    }),
  ).state;
  const targetTurn = requireResolved(
    endTurn({ state: ready, actorId: reactionResponderId }),
  ).state;
  const casterTurn = requireResolved(
    endTurn({ state: targetTurn, actorId: primaryTargetId }),
  ).state;
  return battleRuntimeSessionForTest({ ...base, state: casterTurn });
}
