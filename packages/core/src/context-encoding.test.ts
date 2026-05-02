import { Option } from "effect";
import { initiativeDurationRounds } from "@dnd/shared-algebras/elapsed-time-algebra";
import { describe, expect, it } from "vitest";
import { createActor } from "xstate";

import { creatureMachine } from "#/machine.ts";
import {
  classLevel,
  CreatureId,
  difficultyClass,
  spellId as mkSpellId,
} from "#/types.ts";

import { encodeDndContext, encodeDndSnapshot } from "./context-encoding.ts";

function preparedSpellIds(
  ...spells: ReadonlyArray<string>
): ReadonlySet<ReturnType<typeof mkSpellId>> {
  return new Set(spells.map(mkSpellId));
}

describe("context encoding", () => {
  it("encodes Option fields and canonicalizes set-derived arrays", () => {
    const actor = createActor(creatureMachine, {
      input: {
        maxHp: 30,
        sorcererLevel: classLevel(5),
        knownMetamagicOptions: ["subtle", "careful"],
        warlockLevel: classLevel(11),
      },
    });
    actor.start();
    const base = actor.getSnapshot().context;

    const encoded = encodeDndContext({
      ...base,
      concentrationSpellId: Option.some(mkSpellId("hold_person")),
      preparedSpells: preparedSpellIds("hold_person", "bless"),
      preparedSpellSaveDCs: new Map([
        [mkSpellId("hold_person"), difficultyClass(15)],
        [mkSpellId("bless"), difficultyClass(14)],
      ]),
      incapacitatedSources: new Set(["direct", "paralyzed"]),
      activeEffects: [
        {
          spellId: mkSpellId("bless"),
          roundsRemaining: initiativeDurationRounds(2),
          expiresAt: "end",
          casterId: CreatureId("caster-1"),
          grantedConditions: ["restrained", "blinded"],
          grantedResistances: new Set(["fire", "acid"]),
          grantedImmunities: new Set(["thunder", "cold"]),
          startOfTurnHook: {
            conditionsToRemove: ["poisoned", "blinded"],
          },
        },
      ],
      classStates: {
        ...base.classStates,
        sorcerer:
          base.classStates.sorcerer == null
            ? undefined
            : {
                ...base.classStates.sorcerer,
                knownMetamagicOptions: new Set(["subtle", "careful"]),
                metamagicUsedThisCast: new Set(["subtle", "careful"]),
              },
        warlock:
          base.classStates.warlock == null
            ? undefined
            : {
                ...base.classStates.warlock,
                mysticArcanumUsed: new Set([7, 6]),
              },
      },
    });

    expect(encoded.concentrationSpellId).toBe("hold_person");
    expect(encoded.preparedSpells).toEqual(["bless", "hold_person"]);
    expect(encoded.preparedSpellSaveDCs).toEqual({
      bless: difficultyClass(14),
      hold_person: difficultyClass(15),
    });
    expect(encoded.incapacitatedSources).toEqual(["paralyzed", "direct"]);
    expect(encoded.activeEffects[0]?.grantedConditions).toEqual([
      "blinded",
      "restrained",
    ]);
    expect(encoded.activeEffects[0]?.grantedResistances).toEqual([
      "acid",
      "fire",
    ]);
    expect(encoded.activeEffects[0]?.grantedImmunities).toEqual([
      "cold",
      "thunder",
    ]);
    expect(
      encoded.activeEffects[0]?.startOfTurnHook?.conditionsToRemove,
    ).toEqual(["blinded", "poisoned"]);
    expect(encoded.classStates.sorcerer?.knownMetamagicOptions).toEqual([
      "careful",
      "subtle",
    ]);
    expect(encoded.classStates.sorcerer?.metamagicUsedThisCast).toEqual([
      "careful",
      "subtle",
    ]);
    expect(encoded.classStates.warlock?.mysticArcanumUsed).toEqual([6, 7]);
  });

  it("sorts snapshot tags and encodes None as null", () => {
    const actor = createActor(creatureMachine, { input: { maxHp: 20 } });
    actor.start();

    const encoded = encodeDndSnapshot({
      value: actor.getSnapshot().value,
      tags: new Set(["zeta", "alpha"]),
      context: actor.getSnapshot().context,
    });

    expect(encoded.tags).toEqual(["alpha", "zeta"]);
    expect(encoded.context.concentrationSpellId).toBeNull();
  });

  it("produces the same encoded snapshot for equal set and record contents regardless of insertion order", () => {
    const actor = createActor(creatureMachine, { input: { maxHp: 20 } });
    actor.start();
    const base = actor.getSnapshot().context;

    const left = encodeDndSnapshot({
      value: actor.getSnapshot().value,
      tags: new Set(["beta", "alpha"]),
      context: {
        ...base,
        incapacitatedSources: new Set(["direct", "paralyzed"]),
        preparedSpellSaveDCs: new Map([
          [mkSpellId("hold_person"), difficultyClass(15)],
          [mkSpellId("bless"), difficultyClass(14)],
        ]),
        rechargeAvailable: { zeta: true, alpha: false },
        dailyUsesRemaining: { zeta: 1, alpha: 2 },
        dailyUsesMax: { zeta: 3, alpha: 4 },
      },
    });
    const right = encodeDndSnapshot({
      value: actor.getSnapshot().value,
      tags: new Set(["alpha", "beta"]),
      context: {
        ...base,
        incapacitatedSources: new Set(["paralyzed", "direct"]),
        preparedSpellSaveDCs: new Map([
          [mkSpellId("bless"), difficultyClass(14)],
          [mkSpellId("hold_person"), difficultyClass(15)],
        ]),
        rechargeAvailable: { alpha: false, zeta: true },
        dailyUsesRemaining: { alpha: 2, zeta: 1 },
        dailyUsesMax: { alpha: 4, zeta: 3 },
      },
    });

    expect(JSON.stringify(left)).toBe(JSON.stringify(right));
  });
});
