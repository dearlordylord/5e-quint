import {
  requireHole,
  savingThrowOutcomeFill,
  damageRollFill,
  discoverBattleActCandidates,
  wizardVsRogueBattle,
  type BattleState,
  type BattleSubject,
  fighterId,
  wizardId,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: save-damage replacements", () => {
  test("save-damage replacement riders reduce failed half-damage saves", () => {
    const state = wizardVsRogueBattle({ evasion: true });
    const subject = dexHalfDamageSubject(state);
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: fighterId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: fighterId, succeeded: false },
        ]),
        damageRollFill(damage, 6),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 9 },
        ],
      },
    });
  });

  test("save-damage replacement riders replace successful half-damage saves with no damage", () => {
    const state = wizardVsRogueBattle({ evasion: true });
    const subject = dexHalfDamageSubject(state);
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: fighterId, succeeded: true },
        ]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 12 },
        ],
      },
    });
  });

  test("half-damage save gates still damage targets without replacement riders", () => {
    const state = wizardVsRogueBattle({ evasion: false });
    const subject = dexHalfDamageSubject(state);
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: fighterId, succeeded: true },
          ]),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: fighterId, succeeded: true },
        ]),
        damageRollFill(damage, 6),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 9 },
        ],
      },
    });
  });

  test("selected Evasion execution facts do not require a duplicate support-profile projection", () => {
    const state = wizardVsRogueBattle({
      evasion: true,
      saveDamageReplacementSupport: false,
    });
    const subject = dexHalfDamageSubject(state);
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: fighterId, succeeded: true },
        ]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 12 },
        ],
      },
    });
  });

  test("rejects non-Dexterity Evasion mechanics at typed feature projection", () => {
    expect(() =>
      wizardVsRogueBattle({
        evasion: true,
        evasionAbility: "con",
      }),
    ).toThrow("Expected a supported battle feature fixture: rogue_evasion.");
  });
});

function dexHalfDamageSubject(state: BattleState): BattleSubject {
  const subject = discoverBattleActCandidates(state).find(
    (candidate) => candidate.subject.tag === "actionSpell",
  )?.subject;
  if (subject === undefined) {
    throw new Error("Expected Dexterity half-damage cantrip act.");
  }
  return subject;
}
