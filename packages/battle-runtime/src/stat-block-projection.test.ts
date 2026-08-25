// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.ATTACK_CONTROL
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import { statBlockId } from "@dnd/shared/game-facts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

import {
  battleAmmunitionStock,
  battleCreatureInitFromStatBlock,
  battleId,
  combatantId,
  discoverBattleActsWithStatBlockProjectionIssues,
  initiativeScore,
  statBlockProjectionIssues,
  statBlockProjectionIssuesForActor,
  startBattle,
  type StatBlockProjectionIssue,
} from "./index.ts";
import { statBlockRecord } from "./battle-runtime.test-support.ts";

function initializedStatBlock(source: ReturnType<typeof statBlockRecord>) {
  const initialized = battleCreatureInitFromStatBlock({
    combatantId: combatantId("stat-block-projection-actor"),
    statBlock: source,
    initiative: initiativeScore(10),
    ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
    conditions: [],
  });
  if (Either.isLeft(initialized)) {
    throw new Error(`Expected Stat Block initialization: ${initialized.left}`);
  }
  return initialized.right;
}

function startedStatBlock(source: ReturnType<typeof statBlockRecord>) {
  const started = startBattle({
    battleId: battleId("stat-block-projection"),
    combatants: [initializedStatBlock(source)],
  });
  if (Either.isLeft(started)) {
    throw new Error(`Expected Stat Block battle start: ${started.left}`);
  }
  return started.right;
}

function mechanicalActs(session: ReturnType<typeof startedStatBlock>) {
  return discoverBattleActsWithStatBlockProjectionIssues(session).acts.map(
    ({ subject, initialHoles }) => ({ subject, initialHoles }),
  );
}

function mechanicalProjection(session: ReturnType<typeof startedStatBlock>) {
  const actor = session.state.combatants.get(
    combatantId("stat-block-projection-actor"),
  );
  if (actor === undefined || actor.origin.kind !== "statBlock") {
    throw new Error("Expected a Stat Block projection actor.");
  }
  return {
    maxHp: actor.maxHp,
    armorClass: actor.armorClass,
    size: actor.size,
    mechanics: actor.origin.mechanics,
    execution: actor.origin.execution,
  };
}

function firstProjectionIssue(
  issues: ReadonlyNonEmptyArray<StatBlockProjectionIssue>,
): StatBlockProjectionIssue {
  return issues[0];
}

describe("generic Stat Block projection", () => {
  test("renamed equivalent mechanics project to the same creature facts and Acts", () => {
    const source = statBlockRecord();
    const renamed = {
      ...source,
      id: statBlockId("synthetic-stat-block-projection"),
      name: "Synthetic Projection Shape",
      statBlock: {
        ...source.statBlock,
        displayName: "Synthetic Projection Shape",
      },
    };

    const originalSession = startedStatBlock(source);
    const renamedSession = startedStatBlock(renamed);

    expect(mechanicalProjection(originalSession)).toEqual(
      mechanicalProjection(renamedSession),
    );
    expect(mechanicalActs(originalSession)).toEqual(
      mechanicalActs(renamedSession),
    );
    expect(
      discoverBattleActsWithStatBlockProjectionIssues(originalSession)
        .statBlockProjectionIssues,
    ).toEqual([]);
    expect(
      discoverBattleActsWithStatBlockProjectionIssues(renamedSession)
        .statBlockProjectionIssues,
    ).toEqual([]);
  });

  test("does not admit a reused action attack in another action section", () => {
    const source = statBlockRecord();
    const actionAttack = source.statBlock.actions?.attacks?.[0];
    if (actionAttack === undefined) {
      throw new Error("Expected a fixture action attack.");
    }
    const reusedAcrossSections = {
      ...source,
      id: statBlockId("synthetic-reused-action-attack"),
      statBlock: {
        ...source.statBlock,
        bonusActions: {
          attacks: [actionAttack] as const,
        },
      },
    };

    expect(statBlockProjectionIssues(reusedAcrossSections)).toContainEqual({
      tag: "statBlockProjectionIssue",
      source: {
        kind: "action",
        section: "bonusActions",
        shape: "attack",
        nonExecutableReason: "unsupportedActionShape",
      },
    });
  });

  test("reports every represented unsupported trait and action shape as a typed issue", () => {
    const source = statBlockRecord();
    const attack = source.statBlock.actions?.attacks?.[0];
    if (attack === undefined) throw new Error("Expected a fixture attack.");
    const unsupported = {
      ...source,
      statBlock: {
        ...source.statBlock,
        traits: [
          {
            name: "Text Trait",
            description: "A text-only synthetic trait.",
          },
          {
            name: "Linked Trait",
            description: "A synthetic trait with an unsupported effect.",
            effect: { kind: "caster_heal_link" as const, rangeFeet: 30 },
          },
        ] as const,
        actions: {
          attacks: [
            { ...attack, description: "A prose-only attack." },
          ] as const,
        },
      },
    };

    expect(statBlockProjectionIssues(unsupported)).toEqual([
      {
        tag: "statBlockProjectionIssue",
        source: { kind: "trait", nonExecutableReason: "textOnlyTrait" },
      },
      {
        tag: "statBlockProjectionIssue",
        source: {
          kind: "trait",
          nonExecutableReason: "unsupportedTraitEffect",
        },
      },
      {
        tag: "statBlockProjectionIssue",
        source: {
          kind: "action",
          section: "actions",
          shape: "attack",
          nonExecutableReason: "unsupportedActionShape",
        },
      },
    ]);

    const session = startedStatBlock(unsupported);
    const actorId = combatantId("stat-block-projection-actor");
    const discovery = discoverBattleActsWithStatBlockProjectionIssues(session);
    for (const group of discovery.statBlockProjectionIssues) {
      expect(firstProjectionIssue(group.issues).tag).toBe(
        "statBlockProjectionIssue",
      );
    }
    expect(
      statBlockProjectionIssuesForActor(
        session.state,
        session.context,
        actorId,
      ),
    ).toEqual(statBlockProjectionIssues(unsupported));
    expect(discovery.statBlockProjectionIssues).toEqual([
      { combatantId: actorId, issues: statBlockProjectionIssues(unsupported) },
    ]);
  });
});
