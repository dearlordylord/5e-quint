import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import rayOfEnfeeblementInput from "../../surface/content/ray_of_enfeeblement.json";
import { describe, expect, test } from "vitest";
import { Hp, classLevel, movementFeet } from "@dnd/shared/types";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import type { BattleFill, BattleHole } from "./battle-state-execution.ts";
import {
  Either,
  battleUnitRefWithSupportProfiles,
  spellCasterId,
  spellTargetId,
  speciesHalflingLuckUnitId,
  unitLibrary,
} from "./unit-profile-admission.test-support.ts";
import {
  attackRollFill,
  battleObjectId,
  characterBattleFeatureInitForTest,
  damageRollFillWithGroups,
  endTurn,
  objectTargetFill,
  requireHole as requireResultHole,
  requireResolved,
  resolveBattleSubject,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { requireHole as requireInitialHole } from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  eldritchBlastUnitId,
  fighterRemarkableAthleteUnitId,
  scorchingRayUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";

const rayOfEnfeeblementUnitId = "ray_of_enfeeblement";

describe("spell attack sequence object-target boundaries", () => {
  test("Halfling Luck requests a natural-one reroll for an object beam", () => {
    const unit = unitLibrary.requireUnit(speciesHalflingLuckUnitId);
    const unitRef = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: unit.id },
      unit,
    });
    expect(Either.isRight(unitRef)).toBe(true);
    if (Either.isLeft(unitRef)) {
      throw new Error(unitRef.left.message);
    }
    const session = spellBattle({
      cantrips: [spellRecord(eldritchBlastUnitId)],
      casterUnitRefs: [unitRef.right],
      casterUnitFeatures: [characterBattleFeatureInitForTest(unit)],
    });
    const act = spellAct({
      session,
      spellId: eldritchBlastUnitId,
    });
    const objectTarget = objectTargetFill({
      hole: requireInitialHole(act.initialHoles, "objectTargetChoice"),
      casterId: spellCasterId,
      objectId: battleObjectId("natural-one-object"),
      rangeFeet: movementFeet(120),
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [objectTarget],
      }),
      "attackRoll",
    );

    const awaitingReroll = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        objectTarget,
        attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
      ],
    });

    expect(awaitingReroll).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "attackRoll",
          d20TestNaturalOneRerolls: [
            expect.objectContaining({
              effectKind: "d20_test_natural_one_reroll",
            }),
          ],
        },
      ],
    });
  });

  test("Remarkable Athlete offers movement after a critical object beam", () => {
    const unit = unitLibrary.requireUnit(fighterRemarkableAthleteUnitId);
    const unitRef = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: unit.id },
      unit,
    });
    expect(Either.isRight(unitRef)).toBe(true);
    if (Either.isLeft(unitRef)) {
      throw new Error(unitRef.left.message);
    }
    const session = spellBattle({
      cantrips: [spellRecord(eldritchBlastUnitId)],
      casterClassLevels: [{ className: "fighter", level: classLevel(3) }],
      casterUnitRefs: [unitRef.right],
      casterUnitFeatures: [
        characterBattleFeatureInitForTest(unit, [
          { className: "fighter", level: classLevel(3) },
        ]),
      ],
    });
    const act = spellAct({
      session,
      spellId: eldritchBlastUnitId,
    });
    const objectTarget = objectTargetFill({
      hole: requireInitialHole(act.initialHoles, "objectTargetChoice"),
      casterId: spellCasterId,
      objectId: battleObjectId("remarkable-athlete-object"),
      rangeFeet: movementFeet(120),
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [objectTarget],
      }),
      "attackRoll",
    );

    const awaitingMovementDecision = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        objectTarget,
        attackRollFill(attackRoll, { total: 20, naturalD20: 20 }),
      ],
    });

    expect(awaitingMovementDecision).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "unitFeatureDecision",
          label: "Use Remarkable Athlete movement",
        },
      ],
    });
  });

  test("an object beam miss resolves without object damage", () => {
    const session = spellBattle({
      cantrips: [spellRecord(eldritchBlastUnitId)],
    });
    const act = spellAct({
      session,
      spellId: eldritchBlastUnitId,
    });
    const objectTarget = objectTargetFill({
      hole: requireInitialHole(act.initialHoles, "objectTargetChoice"),
      casterId: spellCasterId,
      objectId: battleObjectId("missed-object"),
      rangeFeet: movementFeet(120),
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [objectTarget],
      }),
      "attackRoll",
    );

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        objectTarget,
        attackRollFill(attackRoll, { total: 5, naturalD20: 5 }),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected object spell attack miss to resolve.");
    }
    expect(resolved.objectDamages).toBeUndefined();
  });

  test("Scorching Ray creature and object beams consume Ray of Enfeeblement penalty rolls", () => {
    const rayOfEnfeeblement = decodeUnitRecordSync(rayOfEnfeeblementInput);
    if (rayOfEnfeeblement.kind !== "spell") {
      throw new Error("Expected Ray of Enfeeblement spell Unit.");
    }
    const scorchingRay = spellRecord(scorchingRayUnitId);
    const baseSession = spellBattle({
      preparedSpells: [rayOfEnfeeblement],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: classLevel(3) }],
      targetPreparedSpells: [scorchingRay],
      targetSpellcasting: wizardSpellcasting({
        cantrips: [],
        preparedSpells: [scorchingRay],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      }),
    });
    const rayAct = spellAct({
      session: baseSession,
      spellId: rayOfEnfeeblementUnitId,
      slotLevel: 2,
    });
    const targetList = requireInitialHole(
      rayAct.initialHoles,
      "spellTargetList",
    );
    const targetChoice = spellTargetListFill(
      targetList,
      spellCasterId,
      rayOfEnfeeblementUnitId,
      [spellTargetId],
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: baseSession.state,
        subject: rayAct.subject,
        fills: [targetChoice],
      }),
      "savingThrowOutcome",
    );
    const cast = requireResolved(
      resolveBattleSubject({
        state: baseSession.state,
        subject: rayAct.subject,
        fills: [
          targetChoice,
          savingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
    );
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const targetSession = battleRuntimeSessionForTest({
      ...baseSession,
      state: targetTurn.state,
    });
    const scorchingRayAct = spellAct({
      session: targetSession,
      spellId: scorchingRayUnitId,
      slotLevel: 2,
    });
    const objectTargets = scorchingRayAct.initialHoles.filter(
      (
        hole,
      ): hole is Extract<BattleHole, { readonly kind: "objectTargetChoice" }> =>
        hole.kind === "objectTargetChoice",
    );
    expect(objectTargets).toHaveLength(3);
    const creatureTarget = requireInitialHole(
      scorchingRayAct.initialHoles,
      "targetChoice",
    );
    const targetFills: BattleFill[] = [
      spellTargetFill(
        creatureTarget,
        scorchingRayUnitId,
        spellTargetId,
        spellCasterId,
      ),
      ...objectTargets.slice(1).map((hole, index) =>
        objectTargetFill({
          hole,
          casterId: spellTargetId,
          objectId: battleObjectId(`penalized-object-${index + 1}`),
          rangeFeet: movementFeet(120),
          damageDisposition: { kind: "hitPoints", hitPoints: Hp(20) },
        }),
      ),
    ];
    const fills: BattleFill[] = [...targetFills];

    for (let index = 0; index < targetFills.length; index += 1) {
      const attackRoll = requireResultHole(
        resolveBattleSubject({
          state: targetTurn.state,
          subject: scorchingRayAct.subject,
          fills,
        }),
        "attackRoll",
      );
      fills.push(attackRollFill(attackRoll, { total: 18, naturalD20: 12 }));
      const damageRoll = requireResultHole(
        resolveBattleSubject({
          state: targetTurn.state,
          subject: scorchingRayAct.subject,
          fills,
        }),
        "rolledDice",
      );
      fills.push(damageRollFillWithGroups(damageRoll, [[3, 4]]));
      const penaltyRoll = requireResultHole(
        resolveBattleSubject({
          state: targetTurn.state,
          subject: scorchingRayAct.subject,
          fills,
        }),
        "rolledDice",
      );
      expect(penaltyRoll).toHaveProperty("sourceDamageRollPenalty");
      fills.push(
        damageRollFillWithGroups(penaltyRoll, [[index === 0 ? 7 : 1]]),
      );
    }

    const resolved = requireResolved(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: scorchingRayAct.subject,
        fills,
      }),
    );
    expect(resolved.objectDamages).toHaveLength(2);
    expect(resolved.state.combatants.get(spellCasterId)?.hp).toBe(Hp(12));
  });
});
