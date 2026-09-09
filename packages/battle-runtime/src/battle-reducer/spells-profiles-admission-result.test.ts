import { Result } from "effect";
import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import { spellMechanicsHeaderPath } from "@dnd/surface/surface/spell-mechanics-path";

import { wizardSpellcasting } from "../battle-runtime.test-support.ts";
import { battleId, combatantId } from "../identity.ts";
import { characterCreature } from "../unit-profile-admission-creature-fixture.test-support.ts";
import { spellCasterId } from "../unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "../unit-profile-admission-spell-battle.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "../unit-profile-admission-spell-record.test-support.ts";
import {
  addBattleRuntimeCombatant,
  battleInitializationIssueLeaves,
  startBattle,
} from "./api-lifecycle.ts";
import { admittedSpellActs } from "./spells-profiles.ts";

const rejectedSpellCasterId = combatantId("bad-caster");

function malformedRestorationSpells() {
  return ["cure_wounds", "healing_word"].map((spellId) => {
    const spell = spellRecord(spellId);
    return decodeSpellRecordForTest({
      ...spell,
      mechanics: { ...spell.mechanics, school: "evocation" },
    });
  });
}

function expectRestorationProcedureIssues(
  result:
    | ReturnType<typeof startBattle>
    | ReturnType<typeof addBattleRuntimeCombatant>,
) {
  expect(Result.isFailure(result)).toBe(true);
  if (Result.isSuccess(result)) return;

  expect(
    battleInitializationIssueLeaves(result.failure).map((leaf) => {
      if (leaf.tag !== "battleAdmissionInitIssue") {
        throw new Error("Expected a battle-admission initialization issue.");
      }
      const { tag: _tag, ownerPath: _ownerPath, ...facts } = leaf;
      return facts;
    }),
  ).toEqual([
    {
      kind: "characterSpellProcedureInvalid",
      combatantId: rejectedSpellCasterId,
      issueIndex: 0,
      cause: {
        tag: "spellProcedureAdmissionIssue",
        procedure: "directHitPointRestoration",
        failedFact: "school",
        mechanicsPath: spellMechanicsHeaderPath("school"),
        message:
          "Unsupported directHitPointRestoration mechanics fact: school.",
      },
    },
    {
      kind: "characterSpellProcedureInvalid",
      combatantId: rejectedSpellCasterId,
      issueIndex: 1,
      cause: {
        tag: "spellProcedureAdmissionIssue",
        procedure: "directHitPointRestoration",
        failedFact: "school",
        mechanicsPath: spellMechanicsHeaderPath("school"),
        message:
          "Unsupported directHitPointRestoration mechanics fact: school.",
      },
    },
  ]);
}

describe("character spell procedure admission result", () => {
  test("admits spellbook-only ritual mechanics without an ordinary cast", () => {
    const session = spellBattle({
      preparedSpells: [],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const actor = session.state.combatants.get(spellCasterId);
    const spellcasting =
      session.context.characters.get(
        spellCasterId,
      )?.spellcastingPresentationSource;
    if (actor === undefined || spellcasting === undefined) {
      throw new Error("Expected test spellcaster and presentation source.");
    }

    const result = admittedSpellActs(actor, session.state, {
      ...spellcasting,
      spellbookRitualSpellAccesses: [
        {
          tag: "spellbookRitual",
          spell: spellRecord("find_familiar"),
          featureUnitId: unitId("synthetic_ritual_access"),
        },
      ],
    });

    expect(result.tag).toBe("admitted");
    if (result.tag === "admitted") {
      expect(result.invocations).toEqual([]);
      expect(result.staticMechanics.map(({ procedure }) => procedure)).toEqual([
        "spawnedCompanionLifecycle",
      ]);
    }
  });

  test("accumulates typed issues from every rejected prepared spell", () => {
    const session = spellBattle({ preparedSpells: [] });
    const actor = session.state.combatants.get(spellCasterId);
    const characterContext = session.context.characters.get(spellCasterId);
    if (actor === undefined || characterContext === undefined) {
      throw new Error("Expected test spellcaster and runtime context.");
    }
    const spellcasting = characterContext.spellcastingPresentationSource;
    if (
      spellcasting === undefined ||
      spellcasting.spellcastingSource.tag !== "classSpellcasting"
    ) {
      throw new Error("Expected class spellcasting source.");
    }
    const castingSource = spellcasting.spellcastingSource;
    const malformedSpells = malformedRestorationSpells();
    const result = admittedSpellActs(actor, session.state, {
      ...spellcasting,
      preparedSpells: malformedSpells.map((spell) => ({
        spell,
        castingSource,
        spellAccessFreeCastResourcePoolRefs: [],
      })),
    });

    expect(result.tag).toBe("rejected");
    if (result.tag === "rejected") {
      expect(result.issues).toHaveLength(2);
      expect(
        result.issues.map(({ procedure, failedFact }) => ({
          procedure,
          failedFact,
        })),
      ).toEqual([
        { procedure: "directHitPointRestoration", failedFact: "school" },
        { procedure: "directHitPointRestoration", failedFact: "school" },
      ]);
    }
  });

  test("preserves every typed issue through battle start", () => {
    expectRestorationProcedureIssues(
      startBattle({
        battleId: battleId("reject-spell"),
        combatants: [
          characterCreature({
            combatantId: rejectedSpellCasterId,
            displayName: "Rejected spellcaster",
            initiative: 20,
            spellcasting: wizardSpellcasting({
              cantrips: [],
              preparedSpells: malformedRestorationSpells(),
            }),
          }),
        ],
      }),
    );
  });

  test("preserves every typed issue when adding a runtime combatant", () => {
    const session = spellBattle({ preparedSpells: [] });
    expectRestorationProcedureIssues(
      addBattleRuntimeCombatant({
        session,
        combatant: characterCreature({
          combatantId: rejectedSpellCasterId,
          displayName: "Rejected spellcaster",
          initiative: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: malformedRestorationSpells(),
          }),
        }),
      }),
    );
  });
});
