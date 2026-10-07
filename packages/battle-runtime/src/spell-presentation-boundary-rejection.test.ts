import { expect, test } from "vitest";
import {
  battleSelectedSpellInvocationForProcedure,
  discoverBattleActs,
} from "./battle-act-composition.ts";
import {
  battleRuntimeContextForTest,
  battleRuntimeSessionForTest,
} from "./battle-runtime-session.test-support.ts";
import { resolveBattleSubject } from "./index.ts";
import { spellCasterId } from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  bonusSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";

test("omits initial and live spell acts when their retained presentation context is absent", () => {
  const session = spellBattle({
    preparedSpells: [spellRecord("flame_blade")],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const initial = bonusSpellAct({
    session,
    spellId: "flame_blade",
    slotLevel: 2,
  });
  const cast = resolveBattleSubject({
    state: session.state,
    subject: initial.subject,
    fills: [],
  });
  if (cast.tag !== "resolved") throw new Error("Expected held-object cast.");
  const active = battleRuntimeSessionForTest({ ...session, state: cast.state });
  const attack = spellAct({ session: active, spellId: "flame_blade" });
  expect(
    battleSelectedSpellInvocationForProcedure(
      active,
      spellCasterId,
      attack.subject.procedureRef,
    )?.procedure,
  ).toBe("spellCreatedHeldObjectAttack");
  const characterContext = active.context.characters.get(spellCasterId);
  if (characterContext === undefined)
    throw new Error("Expected admitted character presentation context.");
  const contexts = [
    battleRuntimeContextForTest(new Map(), active.context.statBlocks),
    battleRuntimeContextForTest(
      new Map([
        [spellCasterId, { ...characterContext, spellPresentationSources: [] }],
      ]),
      active.context.statBlocks,
    ),
  ];
  for (const context of contexts) {
    for (const [state, procedureRef] of [
      [session.state, initial.subject.procedureRef],
      [active.state, attack.subject.procedureRef],
    ] as const) {
      const missingPresentation = battleRuntimeSessionForTest({
        state,
        context,
      });
      expect(
        battleSelectedSpellInvocationForProcedure(
          missingPresentation,
          spellCasterId,
          procedureRef,
        ),
      ).toBeUndefined();
      expect(
        discoverBattleActs(missingPresentation).some(
          (act) => act.presentation.kind === "spell",
        ),
      ).toBe(false);
      expect(missingPresentation.state).toBe(state);
    }
  }
});
