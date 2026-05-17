import {
  requireHole,
  savingThrowOutcomeFill,
  damageRollFill,
  wizardVsRogueBattle,
  magicSubject,
  fighterId,
  wizardId,
  resolveBattleSubject,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: save-damage replacements", () => {
  test("save-damage replacement riders reduce failed half-damage saves", () => {
    const state = wizardVsRogueBattle({ evasion: true });
    const subject = magicSubject("dex_half_cantrip");
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
    const subject = magicSubject("dex_half_cantrip");
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
    const subject = magicSubject("dex_half_cantrip");
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

  test("save-damage replacement riders require admitted Unit support", () => {
    const state = wizardVsRogueBattle({
      evasion: true,
      saveDamageReplacementSupport: false,
    });
    const subject = magicSubject("dex_half_cantrip");
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

  test("save-damage replacement riders ignore non-Dexterity save mechanics", () => {
    const state = wizardVsRogueBattle({
      evasion: true,
      evasionAbility: "con",
    });
    const subject = magicSubject("dex_half_cantrip");
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
});
