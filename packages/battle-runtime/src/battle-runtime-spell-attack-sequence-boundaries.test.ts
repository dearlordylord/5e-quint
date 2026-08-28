import { describe, expect, test } from "vitest";
import { classLevel, DieRollResult } from "@dnd/shared/types";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import type { BattleFill } from "./battle-state-execution.ts";
import { D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND } from "./battle-state-execution.ts";
import {
  battleUnitRefWithSupportProfiles,
  endTurn,
  Either,
  speciesHalflingLuckUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission.test-support.ts";
import {
  battleId,
  attackRollFill,
  barbarianRageUnit,
  cantripSpellInvocationRef,
  characterBattleFeatureInitForTest,
  characterSpellInvocationForProcedureRefForTest,
  combatantId,
  damageRollFillWithGroups,
  findHole,
  requireCharacterSpellProcedureRefForTest,
  requireCharacterUnitProcedureRefForTest,
  requireHole,
  rageResource,
  resolveBattleSubject,
  supportedBattleUnitRef,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  animalFriendshipUnitId,
  eldritchBlastUnitId,
  rayOfFrostUnitId,
  scorchingRayUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  characterCreature,
  statBlockCreature,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { startBattle } from "./index.ts";
import {
  spellAttackSequencePartTargetHole,
  spellTargetHole,
} from "./battle-reducer/spells-targeting.ts";

const friendshipSourceId = combatantId(
  "spell-attack-boundary-friendship-source",
);
const friendshipAttackerId = combatantId("spell-attack-boundary-blast-caster");
const friendshipBeastId = combatantId("spell-attack-boundary-beast");

function rerollRoll(input: {
  readonly total: number;
  readonly naturalD20: number;
}) {
  return {
    kind: "reroll" as const,
    effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
    replacement: {
      total: input.total,
      naturalD20: DieRollResult(input.naturalD20),
    },
  } satisfies NonNullable<
    Extract<
      BattleFill,
      { readonly kind: "attackRoll" }
    >["value"]["d20TestNaturalOneReroll"]
  >;
}

function preparedFriendshipSession() {
  const friendship = spellRecord(animalFriendshipUnitId);
  const blast = spellRecord(eldritchBlastUnitId);
  const started = startBattle({
    battleId: battleId("spell-attack-boundary-relationships"),
    combatants: [
      characterCreature({
        combatantId: friendshipSourceId,
        displayName: "Charm Source",
        initiative: 20,
        spellcasting: wizardSpellcasting({
          cantrips: [],
          preparedSpells: [friendship],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      characterCreature({
        combatantId: friendshipAttackerId,
        displayName: "Spell Attacker",
        initiative: 15,
        spellcasting: wizardSpellcasting({
          cantrips: [blast],
          preparedSpells: [],
        }),
      }),
      statBlockCreature({
        combatantId: friendshipBeastId,
        statBlock: statBlockWithCreatureType("beast"),
        initiative: 10,
      }),
    ],
  });
  expect(Either.isRight(started)).toBe(true);
  if (Either.isLeft(started)) {
    throw new Error("Expected the relationship boundary battle to start.");
  }
  return battleRuntimeSessionForTest({
    state: started.right.state,
    context: started.right.context,
  });
}

describe("battle runtime: spell attack sequence public boundaries", () => {
  test("a held spell opens a spell-cast interrupt while another spell is readied", () => {
    const ray = spellRecord(rayOfFrostUnitId);
    const session = spellBattle({
      cantrips: [ray],
      targetSpellcasting: wizardSpellcasting({
        cantrips: [ray],
        preparedSpells: [],
      }),
    });
    const held = resolveBattleSubject({
      state: session.state,
      subject: {
        tag: "actionSpell",
        actorId: spellCasterId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          session,
          spellCasterId,
          cantripSpellInvocationRef(rayOfFrostUnitId, "spellAttackDamage"),
        ),
        mode: { tag: "ready", trigger: "spellCast" },
      },
      fills: [],
    });
    expect(held).toMatchObject({ tag: "resolved" });
    if (held.tag !== "resolved") return;
    const targetTurn = endTurn({
      state: held.state,
      actorId: spellCasterId,
    });
    expect(targetTurn).toMatchObject({ tag: "resolved" });
    if (targetTurn.tag !== "resolved") return;

    const awaitingHeldSpell = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "actionSpell",
        actorId: spellTargetId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          session,
          spellTargetId,
          cantripSpellInvocationRef(rayOfFrostUnitId, "spellAttackDamage"),
        ),
        mode: { tag: "ready", trigger: "attackHit" },
      },
      fills: [],
    });

    expect(awaitingHeldSpell).toMatchObject({
      tag: "needsHoles",
    });
  });

  test("opens the spell-cast Ready interrupt window before attack-roll holes", () => {
    const blast = spellRecord(eldritchBlastUnitId);
    const session = spellBattle({
      cantrips: [blast],
      targetSpellcasting: wizardSpellcasting({
        cantrips: [spellRecord(rayOfFrostUnitId)],
        preparedSpells: [],
      }),
    });
    const targetTurn = endTurn({
      state: session.state,
      actorId: spellCasterId,
    });
    expect(targetTurn).toMatchObject({ tag: "resolved" });
    if (targetTurn.tag !== "resolved") return;
    const readied = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "actionSpell",
        actorId: spellTargetId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          session,
          spellTargetId,
          cantripSpellInvocationRef(rayOfFrostUnitId, "spellAttackDamage"),
        ),
        mode: { tag: "ready", trigger: "spellCast" },
      },
      fills: [],
    });
    expect(readied).toMatchObject({ tag: "resolved" });
    if (readied.tag !== "resolved") return;
    const casterTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    expect(casterTurn).toMatchObject({ tag: "resolved" });
    if (casterTurn.tag !== "resolved") return;
    const readySession = battleRuntimeSessionForTest({
      ...session,
      state: casterTurn.state,
    });
    const act = spellAct({
      session: readySession,
      spellId: eldritchBlastUnitId,
    });
    const targetHole = findHole(act.initialHoles, "targetChoice");
    const awaiting = resolveBattleSubject({
      state: readySession.state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          eldritchBlastUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(awaiting).toMatchObject({
      tag: "needsHoles",
    });
  });

  test("Halfling Luck requests a D20 Test reroll during a creature spell attack", () => {
    const unit = unitLibrary.requireUnit(speciesHalflingLuckUnitId);
    const unitRef = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: unit.id },
      unit,
    });
    expect(Either.isRight(unitRef)).toBe(true);
    if (Either.isLeft(unitRef)) throw new Error(unitRef.left.message);
    const session = spellBattle({
      cantrips: [spellRecord(eldritchBlastUnitId)],
      casterUnitRefs: [unitRef.right],
      casterUnitFeatures: [characterBattleFeatureInitForTest(unit)],
    });
    const act = spellAct({ session, spellId: eldritchBlastUnitId });
    const targetHole = findHole(act.initialHoles, "targetChoice");
    const target = spellTargetFill(
      targetHole,
      eldritchBlastUnitId,
      spellCasterId,
      spellTargetId,
    );
    const attack = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [target],
      }),
      "attackRoll",
    );
    const awaitingLuck = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [target, attackRollFill(attack, { total: 1, naturalD20: 1 })],
    });
    expect(awaitingLuck).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "attackRoll",
          d20TestNaturalOneRerolls: [
            expect.objectContaining({
              effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
            }),
          ],
        },
      ],
    });
    if (awaitingLuck.tag !== "needsHoles") return;
    const rerollHole = requireHole(awaitingLuck, "attackRoll");
    const rerolled = resolveBattleSubject({
      state: awaitingLuck.state,
      subject: act.subject,
      fills: [
        target,
        attackRollFill(rerollHole, {
          total: 18,
          naturalD20: 1,
          d20TestNaturalOneReroll: rerollRoll({ total: 18, naturalD20: 13 }),
        }),
      ],
    });
    expect(rerolled).toMatchObject({ tag: "needsHoles" });
    expect(requireHole(rerolled, "rolledDice")).toMatchObject({
      kind: "rolledDice",
    });
  });

  test("Rage asks spell attack target holes for the enemy relationship fact", () => {
    const rage = barbarianRageUnit();
    const session = spellBattle({
      preparedSpells: [spellRecord(scorchingRayUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterSpellcastingSourceClassName: "wizard",
      casterClassLevels: [
        { className: "barbarian", level: 1 },
        { className: "wizard", level: 3 },
      ],
      casterResources: [rageResource()],
      casterUnitRefs: [supportedBattleUnitRef(rage)],
      casterUnitFeatures: [
        characterBattleFeatureInitForTest(rage, [
          { className: "barbarian", level: classLevel(1) },
          { className: "wizard", level: classLevel(3) },
        ]),
      ],
    });
    const scorchingRay = spellAct({
      session,
      spellId: scorchingRayUnitId,
      slotLevel: 2,
    });
    const scorchingRayInvocation =
      characterSpellInvocationForProcedureRefForTest(
        session,
        spellCasterId,
        scorchingRay.subject.procedureRef,
      );
    if (scorchingRayInvocation.procedure !== "spellAttackSequence") {
      throw new Error("Expected Scorching Ray attack sequence invocation.");
    }

    const raging = resolveBattleSubject({
      state: session.state,
      subject: {
        tag: "unitFeature",
        actorId: spellCasterId,
        procedureRef: requireCharacterUnitProcedureRefForTest(
          session,
          spellCasterId,
          "barbarian_rage",
        ),
      },
      fills: [],
    });
    if (raging.tag !== "resolved") {
      throw new Error("Expected Rage activation to resolve.");
    }

    expect(
      spellTargetHole(raging.state, spellCasterId, scorchingRayInvocation),
    ).toMatchObject({
      relationshipFactRequest: {
        kind: "attackRollTargetIsEnemy",
        attackerId: spellCasterId,
      },
    });
    expect(
      spellAttackSequencePartTargetHole(
        raging.state,
        spellCasterId,
        scorchingRayInvocation,
        0,
      ),
    ).toMatchObject({
      relationshipFactRequest: {
        kind: "attackRollTargetIsEnemy",
        attackerId: spellCasterId,
      },
    });
  });

  test("Animal Friendship asks for a relationship decision after creature spell damage", () => {
    const session = preparedFriendshipSession();
    const friendship = spellAct({
      session,
      spellId: animalFriendshipUnitId,
    });
    const targetList = findHole(friendship.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(
      targetList,
      friendshipSourceId,
      animalFriendshipUnitId,
      [friendshipBeastId],
    );
    const save = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: friendship.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const charmed = resolveBattleSubject({
      state: session.state,
      subject: friendship.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(save, [
          { targetId: friendshipBeastId, succeeded: false },
        ]),
      ],
    });
    expect(charmed).toMatchObject({ tag: "resolved" });
    if (charmed.tag !== "resolved") return;
    const targetTurn = endTurn({
      state: charmed.state,
      actorId: friendshipSourceId,
    });
    expect(targetTurn).toMatchObject({ tag: "resolved" });
    if (targetTurn.tag !== "resolved") return;
    const blastSession = battleRuntimeSessionForTest({
      ...session,
      state: targetTurn.state,
    });
    const blast = spellAct({
      session: blastSession,
      spellId: eldritchBlastUnitId,
    });
    const blastTargetHole = findHole(blast.initialHoles, "targetChoice");
    const blastTarget = spellTargetFill(
      blastTargetHole,
      eldritchBlastUnitId,
      friendshipAttackerId,
      friendshipBeastId,
    );
    const attack = requireHole(
      resolveBattleSubject({
        state: blastSession.state,
        subject: blast.subject,
        fills: [blastTarget],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: blastSession.state,
        subject: blast.subject,
        fills: [
          blastTarget,
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const relationshipResult = resolveBattleSubject({
      state: blastSession.state,
      subject: blast.subject,
      fills: [
        blastTarget,
        attackRollFill(attack, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[4]]),
      ],
    });
    const relationship = requireHole(
      relationshipResult,
      "damageRelationshipDecisions",
    );
    expect(relationship.questions).toEqual([
      expect.objectContaining({
        kind: "targetDamagedByCasterOrAlly",
        targetId: friendshipBeastId,
      }),
    ]);
    const [relationshipQuestion, ...remainingRelationshipQuestions] =
      relationship.questions;
    if (relationshipQuestion === undefined) {
      throw new Error("Expected an Animal Friendship relationship question.");
    }
    const resolved = resolveBattleSubject({
      state: blastSession.state,
      subject: blast.subject,
      fills: [
        blastTarget,
        attackRollFill(attack, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[4]]),
        {
          kind: "damageRelationshipDecisions",
          holeId: relationship.holeId,
          answers: [
            { questionId: relationshipQuestion.questionId, answer: false },
            ...remainingRelationshipQuestions.map((question) => ({
              questionId: question.questionId,
              answer: false,
            })),
          ],
        },
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag === "resolved") {
      expect(
        resolved.state.combatants.get(friendshipBeastId)?.activeEffects,
      ).toHaveLength(1);
    }
  });
});
