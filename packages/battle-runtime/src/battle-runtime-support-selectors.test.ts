import { describe, expect, test } from "vitest";

import {
  battleSubjectSelection,
  cantripSpellInvocationRef,
  characterSpellProcedureRefMatchesSpellForTest,
  goblinAttackSubject,
  goblinTurnBattle,
  requireCharacterSpellProcedureRefForTest,
  sleepShakeAwakeSubject,
  wizardId,
  wizardVsSkeletonBattle,
} from "./battle-runtime.test-support.ts";

describe("battle runtime support selectors", () => {
  test("project replay subjects and match spell procedures", () => {
    const goblinState = goblinTurnBattle();
    const attack = goblinAttackSubject(goblinState, "Scimitar");
    expect("procedureRef" in attack).toBe(true);
    const { procedureRef: _procedureRef, ...expectedSelection } = attack;
    const attackSelection = battleSubjectSelection(attack);

    expect(attackSelection).toEqual(expectedSelection);

    const sleepSubject = sleepShakeAwakeSubject();
    expect(battleSubjectSelection(sleepSubject)).toEqual(sleepSubject);

    const session = wizardVsSkeletonBattle();
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
    );

    expect(
      characterSpellProcedureRefMatchesSpellForTest(
        session,
        wizardId,
        procedureRef,
        "ray_of_frost",
      ),
    ).toBe(true);
    expect(
      characterSpellProcedureRefMatchesSpellForTest(
        session,
        wizardId,
        procedureRef,
        "acid_splash",
      ),
    ).toBe(false);
  });
});
