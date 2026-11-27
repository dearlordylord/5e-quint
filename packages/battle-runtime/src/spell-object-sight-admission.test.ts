import { describe, expect, test } from "vitest";
import type { BattleFill } from "./battle-state-execution.ts";
import {
  battleObjectId,
  battleProcedureExecutionRefForTest,
  objectTargetFill,
  movementFeet,
  requireHole,
  resolveBattleSubject,
  snapshotBattle,
} from "./battle-runtime.test-support.ts";
import { requireHole as requireInitialHole } from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission.test-support.ts";

type SightFact = Extract<
  Extract<
    BattleFill,
    { readonly kind: "objectTargetChoice" }
  >["spatialFacts"][number],
  { readonly kind: "spellObjectTargetSight" }
>;

// Both routes use the table's directed answer, never object geometry.
describe.each(["fire_bolt", "eldritch_blast"] as const)(
  "%s object sight admission",
  (spellId) => {
    function scenario() {
      const session = spellBattle({ cantrips: [spellRecord(spellId)] });
      const act = spellAct({ session, spellId });
      const fill = objectTargetFill({
        hole: requireInitialHole(act.initialHoles, "objectTargetChoice"),
        casterId: spellCasterId,
        rangeFeet: movementFeet(120),
        distanceFeet: movementFeet(30),
      });
      const sight = fill.spatialFacts.find(
        (fact) => fact.kind === "spellObjectTargetSight",
      );
      if (sight === undefined) throw new Error("Expected fixture sight fact.");
      const otherFacts = [
        ...fill.spatialFacts.filter(
          (fact) => fact.kind !== "spellObjectTargetSight",
        ),
        ...(spellId === "fire_bolt"
          ? [
              {
                kind: "spellObjectIgnition" as const,
                casterId: spellCasterId,
                objectId: fill.value,
                sourceProcedureRef: sight.sourceProcedureRef,
                disposition: { kind: "notFlammable" as const },
              },
            ]
          : []),
      ];
      const resolve = (sights: readonly SightFact[]) =>
        resolveBattleSubject({
          state: session.state,
          subject: act.subject,
          fills: [{ ...fill, spatialFacts: [...otherFacts, ...sights] }],
        });
      return { session, sight, resolve };
    }

    test("one seen or unseen answer determines the roll instructions", () => {
      const { sight, resolve } = scenario();
      expect(
        requireHole(resolve([sight]), "attackRoll").rollMode,
      ).toBeUndefined();
      expect(
        requireHole(
          resolve([{ ...sight, attackerCanSeeObject: false }]),
          "attackRoll",
        ).rollMode,
      ).toBe("disadvantage");
    });

    test("missing, foreign and duplicate answers are refused without changing state", () => {
      const { session, sight, resolve } = scenario();
      const originalSnapshot = snapshotBattle(session.state);
      const unseen = { ...sight, attackerCanSeeObject: false };
      const invalidAnswers: readonly (readonly SightFact[])[] = [
        [],
        [{ ...sight, casterId: spellTargetId }],
        [{ ...sight, objectId: battleObjectId("foreign-object") }],
        [
          {
            ...sight,
            sourceProcedureRef:
              battleProcedureExecutionRefForTest("foreign-sight"),
          },
        ],
        [sight, unseen],
        [unseen, sight],
        [sight, sight],
      ];
      for (const answers of invalidAnswers) {
        const result = resolve(answers);
        expect(result).toMatchObject({ tag: "invalid", reason: "invalidFill" });
        expect(result.snapshot).toEqual(originalSnapshot);
      }
    });
  },
);
