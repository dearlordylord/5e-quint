import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  characterWeaponPresentationSource,
  emptyBattleRuntimeContext,
} from "./battle-runtime-context.ts";
import { battleRuntimeContextForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleId,
  characterSeed,
  fighterAttackSubject,
  fighterId,
  goblinAttackSubject,
  goblinId,
  startBattleSessionRight,
  statBlockCreatureInit,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import { projectAuthoredStatBlock } from "./stat-block-authored-projection.ts";
import { statBlockAttackActionOptions } from "./stat-block-execution.ts";
import { attackExecutionDamageType } from "./battle-action-options.ts";
import {
  attackActionOptionPresentationName,
  battleCreaturePresentationDisplayName,
  statBlockProcedurePresentationsForActor,
} from "./stat-block-presentation.ts";

function presentationSession() {
  return startBattleSessionRight({
    battleId: battleId("stat-block-presentation-boundaries"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

describe("battle presentation joins", () => {
  test("projects authored Stat Block communication into presentation context", () => {
    const source = statBlockRecord();
    const projected = Either.getOrThrow(projectAuthoredStatBlock(source));

    expect(projected.presentation).toMatchObject({
      displayName: source.name,
      communication: source.statBlock.communication,
    });
  });

  test("returns null when durable combatants have no matching presentation owner", () => {
    const session = presentationSession();

    expect(
      battleCreaturePresentationDisplayName(
        session.state,
        emptyBattleRuntimeContext(),
        goblinId,
      ),
    ).toBeNull();
    expect(
      battleCreaturePresentationDisplayName(
        session.state,
        session.context,
        fighterId,
      ),
    ).toBe("Fighter");
    expect(
      statBlockProcedurePresentationsForActor(
        session.state,
        emptyBattleRuntimeContext(),
        goblinId,
      ),
    ).toBeNull();
    expect(
      statBlockProcedurePresentationsForActor(
        session.state,
        session.context,
        fighterId,
      ),
    ).toBeNull();
  });

  test("uses a fallback label when a procedure presentation is absent", () => {
    const session = presentationSession();
    const subject = goblinAttackSubject(session.state, "Scimitar");
    const actor = session.state.combatants.get(goblinId);
    if (actor?.origin.kind !== "statBlock") {
      throw new Error("Expected Goblin Stat Block actor.");
    }
    const attack = statBlockAttackActionOptions(actor.origin.execution).find(
      (candidate) => candidate.procedureRef === subject.procedureRef,
    );
    if (attack === undefined) {
      throw new Error("Expected Goblin attack execution.");
    }
    expect(attackExecutionDamageType(attack)).toBeUndefined();

    expect(
      attackActionOptionPresentationName(
        session.state,
        emptyBattleRuntimeContext(),
        goblinId,
        attack,
      ),
    ).toEqual(
      Either.left({
        tag: "attackPresentationJoinIssue",
        reason: "statBlockAdmissionMissing",
      }),
    );

    const source = session.context.statBlocks.get(goblinId);
    if (source === undefined) {
      throw new Error("Expected Goblin presentation source.");
    }
    const contextWithoutProcedures = battleRuntimeContextForTest(
      session.context.characters,
      new Map([[goblinId, { ...source, orderedProcedures: [] }]]),
    );
    expect(
      attackActionOptionPresentationName(
        session.state,
        contextWithoutProcedures,
        goblinId,
        attack,
      ),
    ).toEqual(Either.right("Unsupported Stat Block procedure"));
  });

  test("reports a missing authored weapon source separately from character context", () => {
    const session = presentationSession();
    const actor = session.state.combatants.get(fighterId);
    if (actor?.origin.kind !== "character" || actor.origin.attack === null) {
      throw new Error("Expected Fighter weapon attack.");
    }
    const attack = actor.origin.attack;
    const source = session.context.characters.get(fighterId);
    if (source === undefined) {
      throw new Error("Expected Fighter presentation source.");
    }
    const contextWithoutWeapon = battleRuntimeContextForTest(
      new Map([[fighterId, { ...source, unitPresentationSources: [] }]]),
      session.context.statBlocks,
    );

    expect(
      attackActionOptionPresentationName(
        session.state,
        contextWithoutWeapon,
        fighterId,
        attack,
      ),
    ).toEqual(
      Either.left({
        tag: "attackPresentationJoinIssue",
        reason: "weaponPresentationMissing",
      }),
    );
    const weaponSource = source.unitPresentationSources.find(
      ({ unit }) => unit.id === attack.weapon.weaponUnitId,
    );
    if (weaponSource === undefined) {
      throw new Error("Expected Fighter weapon presentation source.");
    }
    expect(
      characterWeaponPresentationSource(
        {
          ...source,
          unitPresentationSources: [weaponSource, weaponSource],
        },
        attack.weapon.weaponUnitId,
      ),
    ).toEqual(
      Either.left({
        tag: "characterWeaponPresentationSourceIssue",
        reason: "ambiguous",
        weaponUnitId: attack.weapon.weaponUnitId,
      }),
    );
    expect(fighterAttackSubject(session.state)).toBeDefined();
  });
});
