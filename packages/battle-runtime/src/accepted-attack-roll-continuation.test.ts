// RAW: .references/srd-5.2.1/Playing-the-Game.md:582-588 — modifiers precede
//     the attack roll and its on-hit effects.
// RAW: .references/srd-5.2.1/Animals.md:2611 — Wolf Bite applies Prone
//     to a Medium or smaller target on a hit.
// RAW: .references/srd-5.2.1/Rules-Glossary.md:802-810 — an attack against a
//     Prone creature has Advantage within 5 feet.

import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { statBlockId } from "@dnd/shared/game-facts";
import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import { describe, expect, test } from "vitest";

import {
  attackInitialTargetHole,
  attackRollFill,
  attackTargetFill,
  battleId,
  characterAttackSubjectForTest,
  characterSeed,
  damageRollFill,
  findHole,
  startBattleSessionRight,
  snapshotBattle,
  statBlockAttackSubjectForTest,
  statBlockCatalog,
  statBlockCreatureInit,
  testLongswordAttack,
} from "./battle-runtime.test-support.ts";
import { combatantId } from "./identity.ts";
import {
  endBattleRuntimeTurn,
  resolveBattleRuntimeSubject,
} from "./battle-session-execution.ts";

const wolfAttackerId = combatantId("issue336-wolf-attacker");
const targetId = combatantId("issue336-target");
const laterAttackerId = combatantId("issue336-later-attacker");

describe("accepted attack roll ordinary continuation", () => {
  test("retains a normal hit through damage and exposes Prone advantage to a later attack", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-accepted-attack-roll-continuation"),
      combatants: [
        statBlockCreatureInit({
          combatantId: wolfAttackerId,
          initiative: 30,
          statBlock: assertStatBlockForTest(
            statBlockCatalog,
            statBlockId("stat_block_wolf"),
          ),
        }),
        characterSeed({
          combatantId: targetId,
          displayName: "Target",
          currentHp: 30,
          maxHp: 30,
          initiative: 20,
          attack: null,
        }),
        characterSeed({
          combatantId: laterAttackerId,
          displayName: "Later Attacker",
          initiative: 10,
          attack: testLongswordAttack(),
        }),
      ],
    });
    const wolfSubject = statBlockAttackSubjectForTest(
      session.state,
      wolfAttackerId,
      "Bite",
      "actions",
    );

    const initial = resolveBattleRuntimeSubject({
      session,
      subject: wolfSubject,
      fills: [],
    });
    expect(initial.tag).toBe("needsHoles");
    if (initial.tag !== "needsHoles") return;
    expect(initial.session).toBe(session);
    expect(initial.envelope.frontier.kind).toBe("holes");
    if (initial.envelope.frontier.kind !== "holes") return;

    const target = attackTargetFill(
      findHole(initial.envelope.frontier.holes, "targetChoice"),
      wolfAttackerId,
      targetId,
    );
    const afterTarget = resolveBattleRuntimeSubject({
      session: session,
      subject: wolfSubject,
      fills: [target],
    });
    expect(afterTarget.tag).toBe("needsHoles");
    if (afterTarget.tag !== "needsHoles") return;
    expect(afterTarget.session).toBe(session);
    expect(afterTarget.envelope.frontier.kind).toBe("holes");
    if (afterTarget.envelope.frontier.kind !== "holes") return;

    const attackRollHole = findHole(
      afterTarget.envelope.frontier.holes,
      "attackRoll",
    );
    expect(attackRollHole.rollMode ?? "normal").toBe("normal");
    const acceptedNormalRoll = attackRollFill(attackRollHole, {
      total: 19,
      naturalD20: 15,
      rollMode: "normal",
    });
    const afterAttackRoll = resolveBattleRuntimeSubject({
      session: session,
      subject: wolfSubject,
      fills: [target, acceptedNormalRoll],
    });
    expect(afterAttackRoll.tag).toBe("needsHoles");
    if (afterAttackRoll.tag !== "needsHoles") return;
    expect(afterAttackRoll.session).toBe(session);
    expect(afterAttackRoll.envelope.checkpoint).toEqual(
      snapshotBattle(session.state),
    );
    expect(afterAttackRoll.envelope.frontier.kind).toBe("holes");
    if (afterAttackRoll.envelope.frontier.kind !== "holes") return;

    const damage = findHole(
      afterAttackRoll.envelope.frontier.holes,
      "rolledDice",
    );
    const rejectedDamage = resolveBattleRuntimeSubject({
      session: afterAttackRoll.session,
      subject: wolfSubject,
      // A d6 cannot yield 7. Rejection must preserve the accepted roll prefix.
      fills: [target, acceptedNormalRoll, damageRollFill(damage, 7)],
    });
    expect(rejectedDamage.tag).toBe("invalid");
    if (rejectedDamage.tag !== "invalid") return;
    expect(rejectedDamage.session).toBe(session);
    expect(rejectedDamage.envelope).toEqual(afterAttackRoll.envelope);

    const damageRetry = resolveBattleRuntimeSubject({
      session: rejectedDamage.session,
      subject: wolfSubject,
      fills: [target, acceptedNormalRoll],
    });
    expect(damageRetry.tag).toBe("needsHoles");
    if (damageRetry.tag !== "needsHoles") return;
    expect(damageRetry.session).toBe(session);
    expect(damageRetry.envelope.frontier.kind).toBe("holes");
    if (damageRetry.envelope.frontier.kind !== "holes") return;
    expect(findHole(damageRetry.envelope.frontier.holes, "rolledDice")).toEqual(
      damage,
    );
    const resolvedAttack = resolveBattleRuntimeSubject({
      session: damageRetry.session,
      subject: wolfSubject,
      fills: [target, acceptedNormalRoll, damageRollFill(damage, 4)],
    });
    expect(resolvedAttack.tag).toBe("resolved");
    if (resolvedAttack.tag !== "resolved") return;
    const resolvedTarget =
      resolvedAttack.session.state.combatants.get(targetId);
    expect(resolvedTarget).toBeDefined();
    if (resolvedTarget === undefined) return;
    expect(hasCondition(resolvedTarget.conditions, "prone")).toBe(true);
    expect(resolvedTarget.hp).toBe(24);

    const afterWolfTurn = endBattleRuntimeTurn({
      session: resolvedAttack.session,
      actorId: wolfAttackerId,
    });
    expect(afterWolfTurn.tag).toBe("resolved");
    if (afterWolfTurn.tag !== "resolved") return;
    const afterTargetTurn = endBattleRuntimeTurn({
      session: afterWolfTurn.session,
      actorId: targetId,
    });
    expect(afterTargetTurn.tag).toBe("resolved");
    if (afterTargetTurn.tag !== "resolved") return;

    const laterSubject = characterAttackSubjectForTest(
      afterTargetTurn.session.state,
      laterAttackerId,
      "Longsword",
    );
    const laterTarget = attackInitialTargetHole(
      afterTargetTurn.session.state,
      laterSubject,
    );
    const laterTargetFill = attackTargetFill(
      laterTarget,
      laterAttackerId,
      targetId,
    );
    const laterAttack = resolveBattleRuntimeSubject({
      session: afterTargetTurn.session,
      subject: laterSubject,
      fills: [laterTargetFill],
    });
    expect(laterAttack.tag).toBe("needsHoles");
    if (laterAttack.tag !== "needsHoles") return;
    expect(laterAttack.envelope.frontier.kind).toBe("holes");
    if (laterAttack.envelope.frontier.kind !== "holes") return;
    const laterAttackRoll = findHole(
      laterAttack.envelope.frontier.holes,
      "attackRoll",
    );
    expect(laterAttackRoll).toMatchObject({ rollMode: "advantage" });
  });
});
