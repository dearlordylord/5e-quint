import { describe, expect, test } from "vitest";
import type { SpellRecord } from "@dnd/surface/surface/types";

import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { spellId } from "./identity.ts";
import { discoverBattleActs } from "./index.ts";
import {
  cloudkillUnitId,
  insectPlagueUnitId,
  sleetStormUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";

const persistentAreaProfiles = [
  {
    procedure: "stationary persistent-area save damage",
    unitId: insectPlagueUnitId,
    slotLevel: 5,
  },
  {
    procedure: "translating persistent-area save damage",
    unitId: cloudkillUnitId,
    slotLevel: 5,
  },
  {
    procedure: "persistent-area save composite",
    unitId: sleetStormUnitId,
    slotLevel: 3,
  },
] as const;

function withEveryOncePerTurnLimitGroup(
  spell: SpellRecord,
  limitGroup: string,
): SpellRecord {
  if (spell.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected persistent-area ongoing-effect mechanics.");
  }
  const initialPhase = spell.mechanics.initialPhase;

  return decodeSpellRecordForTest({
    ...spell,
    mechanics: {
      ...spell.mechanics,
      ...(initialPhase === undefined
        ? {}
        : {
            initialPhase:
              initialPhase.kind === "save_gate" &&
              initialPhase.usageLimit?.kind === "once_per_turn"
                ? {
                    ...initialPhase,
                    usageLimit: { ...initialPhase.usageLimit, limitGroup },
                  }
                : initialPhase,
          }),
      operations: spell.mechanics.operations.map((operation) =>
        operation.usageLimit?.kind === "once_per_turn"
          ? {
              ...operation,
              usageLimit: { ...operation.usageLimit, limitGroup },
            }
          : operation,
      ),
    },
  });
}

function isAdmitted(spell: SpellRecord, slotLevel: 3 | 5): boolean {
  const session = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: slotLevel, count: 1 }],
  });

  return discoverBattleActs(session).some(
    (act) =>
      act.subject.tag === "actionSpell" &&
      battleActSpellPresentation(act)?.invocation.spellId === spellId(spell.id),
  );
}

describe.each(persistentAreaProfiles)(
  "$procedure once-per-turn limit-group admission",
  ({ unitId, slotLevel }) => {
    test("admits one shared nonempty group", () => {
      expect(
        isAdmitted(
          withEveryOncePerTurnLimitGroup(
            spellRecord(unitId),
            "synthetic_shared_save_per_turn",
          ),
          slotLevel,
        ),
      ).toBe(true);
    });

    test("rejects an empty shared group", () => {
      expect(
        isAdmitted(
          withEveryOncePerTurnLimitGroup(spellRecord(unitId), ""),
          slotLevel,
        ),
      ).toBe(false);
    });
  },
);
