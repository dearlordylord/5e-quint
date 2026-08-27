import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { describe, expect, test } from "vitest";

import {
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  battleId,
  cantripSpellInvocationRef,
  characterSeed,
  damageRollFill,
  fighterId,
  fighterAttackSubject,
  findHole,
  goblinId,
  interruptDecisionFill,
  requireCharacterSpellProcedureRefForTest,
  startBattleSessionRight,
  snapshotBattle,
  statBlockCreatureInit,
  targetFill,
  wizardId,
  wizardSpellcasting,
  secondWizardId,
} from "./battle-runtime.test-support.ts";
import {
  endBattleRuntimeTurn,
  resolveBattleRuntimeInterrupt,
  resolveBattleRuntimeSubject,
} from "./battle-session-execution.ts";

describe("battle runtime ordinary continuation replay", () => {
  test("keeps the durable checkpoint and stable frontier across a rejected fill", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-ordinary-replay-checkpoint"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = fighterAttackSubject(session.state);
    const committedSnapshot = snapshotBattle(session.state);

    const initial = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [],
    });
    expect(initial.tag).toBe("needsHoles");
    if (initial.tag !== "needsHoles") return;
    expect(initial.session).toBe(session);
    expect(initial.envelope.checkpoint).toEqual(committedSnapshot);
    expect(initial.envelope.frontier.kind).toBe("holes");
    if (initial.envelope.frontier.kind !== "holes") return;
    expect(initial.envelope.frontier.continuation).toEqual({
      kind: "ordinaryReplay",
    });

    const target = attackInitialTargetHole(session.state, subject);
    const selectedTarget = targetFill(target, goblinId);
    const afterTarget = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [selectedTarget],
    });
    expect(afterTarget.tag).toBe("needsHoles");
    if (afterTarget.tag !== "needsHoles") return;
    expect(afterTarget.session).toBe(session);
    expect(afterTarget.envelope.checkpoint).toEqual(committedSnapshot);
    expect(afterTarget.envelope.frontier.kind).toBe("holes");
    if (afterTarget.envelope.frontier.kind !== "holes") return;
    expect(afterTarget.envelope.frontier.continuation).toEqual({
      kind: "ordinaryReplay",
    });
    expect(afterTarget.envelope.frontier.holes).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "attackRoll" })]),
    );

    const attackRoll = findHole(
      afterTarget.envelope.frontier.holes,
      "attackRoll",
    );
    const invalid = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [
        selectedTarget,
        {
          ...attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          holeId: holeId("battle:ordinary-replay-stale-hole"),
        },
      ],
    });
    expect(invalid).toMatchObject({
      tag: "invalid",
      session,
      envelope: { checkpoint: committedSnapshot },
    });

    const retry = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [selectedTarget],
    });
    expect(retry).toMatchObject({
      tag: "needsHoles",
      session,
      envelope: {
        checkpoint: committedSnapshot,
        frontier: { kind: "holes", holes: afterTarget.envelope.frontier.holes },
      },
    });
    if (invalid.tag !== "invalid" || retry.tag !== "needsHoles") return;
    expect(invalid.envelope).toEqual(retry.envelope);

    const acceptedAttackRoll = attackRollFill(attackRoll, {
      total: 18,
      naturalD20: 12,
    });
    const afterAttackRoll = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [selectedTarget, acceptedAttackRoll],
    });
    expect(afterAttackRoll.tag).toBe("needsHoles");
    if (afterAttackRoll.tag !== "needsHoles") return;
    expect(afterAttackRoll.session).toBe(session);
    expect(afterAttackRoll.envelope.checkpoint).toEqual(committedSnapshot);
    expect(afterAttackRoll.envelope.frontier.kind).toBe("holes");
    if (afterAttackRoll.envelope.frontier.kind !== "holes") return;

    const damage = findHole(
      afterAttackRoll.envelope.frontier.holes,
      "rolledDice",
    );
    const resolved = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [selectedTarget, acceptedAttackRoll, damageRollFill(damage, 5)],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      envelope: {
        checkpoint: expect.anything(),
        frontier: { kind: "acts" },
      },
    });
  });

  test("keeps the next interrupt responder in a resolved envelope", () => {
    const initialSession = startBattleSessionRight({
      battleId: battleId("battle-multi-responder-frontier"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 40,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Second Wizard",
          initiative: 30,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        characterSeed({ combatantId: fighterId, initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const wizardReady = resolveBattleRuntimeSubject({
      session: initialSession,
      subject: {
        tag: "actionSpell",
        actorId: wizardId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          initialSession,
          wizardId,
          cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
        ),
        mode: { tag: "ready", trigger: "attackHit" },
      },
      fills: [],
    });
    expect(wizardReady.tag).toBe("resolved");
    if (wizardReady.tag !== "resolved") return;
    const secondWizardTurn = endBattleRuntimeTurn({
      session: wizardReady.session,
      actorId: wizardId,
    });
    expect(secondWizardTurn.tag).toBe("resolved");
    if (secondWizardTurn.tag !== "resolved") return;
    const secondWizardReady = resolveBattleRuntimeSubject({
      session: secondWizardTurn.session,
      subject: {
        tag: "actionSpell",
        actorId: secondWizardId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          secondWizardTurn.session,
          secondWizardId,
          cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
        ),
        mode: { tag: "ready", trigger: "attackHit" },
      },
      fills: [],
    });
    expect(secondWizardReady.tag).toBe("resolved");
    if (secondWizardReady.tag !== "resolved") return;
    const fighterTurn = endBattleRuntimeTurn({
      session: secondWizardReady.session,
      actorId: secondWizardId,
    });
    expect(fighterTurn.tag).toBe("resolved");
    if (fighterTurn.tag !== "resolved") return;

    const subject = fighterAttackSubject(fighterTurn.session.state);
    const target = attackInitialTargetHole(fighterTurn.session.state, subject);
    const targetSelection = targetFill(target, goblinId);
    const attackRoll = attackRollHoleAfterTarget(
      fighterTurn.session.state,
      target,
      subject,
      goblinId,
    );
    const awaitingInterrupt = resolveBattleRuntimeSubject({
      session: fighterTurn.session,
      subject,
      fills: [
        targetSelection,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
      ],
    });
    expect(awaitingInterrupt.tag).toBe("needsHoles");
    if (awaitingInterrupt.tag !== "needsHoles") return;
    expect(awaitingInterrupt.envelope.frontier.kind).toBe("interruptDecision");
    if (awaitingInterrupt.envelope.frontier.kind !== "interruptDecision") {
      return;
    }
    expect(
      awaitingInterrupt.envelope.frontier.decisionHole.eligibleResponders,
    ).toEqual(expect.arrayContaining([wizardId, secondWizardId]));
    const firstResponder =
      awaitingInterrupt.envelope.frontier.decisionHole.eligibleResponders[0];
    if (firstResponder === undefined) return;
    const nextResponder =
      awaitingInterrupt.envelope.frontier.decisionHole.eligibleResponders.find(
        (responderId) => responderId !== firstResponder,
      );
    if (nextResponder === undefined) return;

    const afterDecline = resolveBattleRuntimeInterrupt({
      session: awaitingInterrupt.session,
      fill: interruptDecisionFill(
        awaitingInterrupt.envelope.frontier.decisionHole,
        { kind: "decline", responderId: firstResponder },
      ),
    });
    expect(afterDecline.tag).toBe("resolved");
    if (afterDecline.tag !== "resolved") return;
    expect(afterDecline.envelope.frontier.kind).toBe("interruptDecision");
    if (afterDecline.envelope.frontier.kind !== "interruptDecision") return;
    expect(
      afterDecline.envelope.frontier.decisionHole.eligibleResponders,
    ).toEqual([nextResponder]);
    expect(afterDecline.envelope.checkpoint).toEqual(
      snapshotBattle(afterDecline.session.state),
    );
    expect(afterDecline).not.toHaveProperty("snapshot");
    expect(afterDecline).not.toHaveProperty("holes");
    expect(afterDecline).not.toHaveProperty("checkpointBoundary");
    expect(Object.keys(afterDecline.envelope).sort()).toEqual([
      "checkpoint",
      "frontier",
    ]);
  });
});
