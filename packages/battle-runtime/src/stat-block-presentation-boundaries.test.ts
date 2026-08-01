import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import { emptyBattleRuntimeContext } from "./battle-runtime-context.ts";
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
import { statBlockAttackActionOptions } from "./stat-block-execution.ts";
import {
  attackActionOptionPresentationName,
  battleCreaturePresentationDisplayName,
  statBlockLanguagePresentation,
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
  test("projects every Stat Block language source shape", () => {
    const source = statBlockRecord();
    const { languages: _languages, ...withoutLanguages } = source.statBlock;

    expect(
      statBlockLanguagePresentation({
        ...source,
        statBlock: withoutLanguages,
      }),
    ).toEqual({ kind: "absentStatBlockLanguages" });
    expect(
      statBlockLanguagePresentation({
        ...source,
        statBlock: { ...source.statBlock, languages: "caster_languages" },
      }),
    ).toEqual({ kind: "casterLanguagesReference" });
    expect(
      statBlockLanguagePresentation({
        ...source,
        statBlock: { ...source.statBlock, languages: ["Common"] },
      }),
    ).toEqual({
      kind: "authoredStatBlockLanguageEntries",
      entries: ["Common"],
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

  test("distinguishes missing Stat Block admission from a missing procedure presentation", () => {
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
      new Map([[goblinId, { ...source, procedures: [] }]]),
    );
    expect(
      attackActionOptionPresentationName(
        session.state,
        contextWithoutProcedures,
        goblinId,
        attack,
      ),
    ).toEqual(
      Either.left({
        tag: "attackPresentationJoinIssue",
        reason: "statBlockPresentationMissing",
      }),
    );
  });

  test("reports a missing authored weapon source separately from character context", () => {
    const session = presentationSession();
    const actor = session.state.combatants.get(fighterId);
    if (actor?.origin.kind !== "character" || actor.origin.attack === null) {
      throw new Error("Expected Fighter weapon attack.");
    }
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
        actor.origin.attack,
      ),
    ).toEqual(
      Either.left({
        tag: "attackPresentationJoinIssue",
        reason: "weaponPresentationMissing",
      }),
    );
    expect(fighterAttackSubject(session.state)).toBeDefined();
  });
});
