// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-MISTY-STEP misty_step
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-self-teleport
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SELF_TELEPORT_LIFECYCLE
import {
  battleActSpellSlotPresentation,
  battleActSpellPresentation,
} from "./battle-act-composition.ts";
import { describe, expect, test } from "vitest";
import { spellTeleportDestinationHole } from "./battle-reducer/spells-holes-fills.ts";
import {
  hideousLaughterUnitId,
  mistyStepUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import type { BonusActionSpellAct } from "./unit-profile-admission-catalog-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  maybeBonusSpellAct,
  teleportDestinationFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  attackExecutionSelectionForSubjectForTest,
  battleProcedureExecutionRefForTest,
  characterAttackSubjectForTest,
} from "./battle-runtime-test-support.ts";
import { characterSpellProcedure } from "./character-execution-admission.ts";
import {
  battleTablePositionId,
  combatantId,
  discoverBattleActs,
  hideousLaughterRepeatSavingThrowOutcomeHole,
  movementFeet,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  spellSlotInvocationRef,
  type BattleFill,
} from "./unit-profile-admission-test-support.ts";

describe("L12G-SPELL-MISTY-STEP deterministic Misty Step admission", () => {
  test("misty_step casts as a Bonus Action self-teleport spell with a table destination witness", () => {
    const spell = spellRecord(mistyStepUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const acts = discoverBattleActs(state).filter(
      (candidate): candidate is BonusActionSpellAct =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          mistyStepUnitId,
    );

    expect(
      acts.map((act) => battleActSpellPresentation(act)?.invocation),
    ).toEqual(
      expect.arrayContaining([
        spellSlotInvocationRef(mistyStepUnitId, 2, "selfTeleport"),
        spellSlotInvocationRef(mistyStepUnitId, 3, "selfTeleport"),
      ]),
    );
    const levelTwo = acts.find(
      (act) =>
        battleActSpellPresentation(act)?.invocation.tag === "spellSlot" &&
        Number(battleActSpellSlotPresentation(act)?.invocation.slotLevel) === 2,
    );
    expect(levelTwo).toBeDefined();
    if (levelTwo === undefined) {
      throw new Error("Expected level 2 Misty Step act.");
    }
    const destination = requireHole(
      levelTwo.initialHoles,
      "teleportDestination",
    );
    expect(destination).toMatchObject({
      actorId: spellCasterId,
      maxDistanceFeet: movementFeet(30),
      requiresTableSpatialFact: true,
    });
  });

  test("misty_step spends a Bonus Action and Spell Slot, emits teleport, and spends no Movement", () => {
    const spell = spellRecord(mistyStepUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = bonusSpellAct({ session: state, spellId: mistyStepUnitId });
    const destinationHole = requireHole(
      act.initialHoles,
      "teleportDestination",
    );
    const destinationFill = teleportDestinationFill({
      hole: destinationHole,
      destinationId: "misty-step-30-foot-destination",
      distanceFeet: 30,
    });
    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [destinationFill],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionAvailable: false,
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
        },
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            movement: expect.objectContaining({
              spentFeet: 0,
              remainingFeet: 30,
            }),
          }),
        ]),
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Misty Step to resolve.");
    }
    expect(resolved.teleports).toEqual([
      {
        kind: "selfTeleport",
        actorId: spellCasterId,
        sourceProcedureRef: expect.any(String),
        destination: {
          kind: "unoccupiedVisibleDestination",
          destinationId: battleTablePositionId(
            "misty-step-30-foot-destination",
          ),
          distanceFeet: movementFeet(30),
        },
        spendsMovement: false,
        provokesOpportunityAttacks: false,
        transportsWornAndCarriedEquipment: true,
      },
    ]);
  });

  test("misty_step requires an unoccupied visible destination within 30 feet and is not ordinary movement", () => {
    const spell = spellRecord(mistyStepUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = bonusSpellAct({ session: state, spellId: mistyStepUnitId });
    const destinationHole = requireHole(
      act.initialHoles,
      "teleportDestination",
    );

    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "needsHoles", holes: [destinationHole] });
    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          teleportDestinationFill({
            hole: destinationHole,
            distanceFeet: 35,
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          teleportDestinationFill({
            hole: destinationHole,
            distanceFeet: 0,
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const ordinaryMovement: Extract<BattleFill, { readonly kind: "movement" }> =
      {
        kind: "movement",
        holeId: destinationHole.holeId,
        value: {
          speedKind: "walk",
          movementCostFeet: movementFeet(30),
          provokedOpportunityAttacks: [
            {
              reactorId: spellTargetId,
              ...attackExecutionSelectionForSubjectForTest(
                characterAttackSubjectForTest(
                  state.state,
                  spellTargetId,
                  "Unarmed Strike",
                ),
              ),
            },
          ],
        },
      };
    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [ordinaryMovement],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("misty_step rejects stale non-teleport fills even with a valid destination", () => {
    const spell = spellRecord(mistyStepUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = bonusSpellAct({ session: state, spellId: mistyStepUnitId });
    const destinationHole = requireHole(
      act.initialHoles,
      "teleportDestination",
    );
    const staleRepeatSaveHole = hideousLaughterRepeatSavingThrowOutcomeHole(
      spellTargetId,
      {
        kind: "hideousLaughter",
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(hideousLaughterUnitId),
        ),
        sourceCombatantId: spellCasterId,
        conditionHadNonSpellProneSource: false,
        conditionHadNonSpellIncapacitatedSource: false,
        repeatSaveRollMode: null,
        save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
        },
      },
      "damage",
    );

    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          teleportDestinationFill({ hole: destinationHole }),
          savingThrowOutcomeFill(staleRepeatSaveHole, [
            { targetId: spellTargetId, succeeded: true },
          ]),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("misty_step rejects a stale teleport destination fact for a different caster", () => {
    const spell = spellRecord(mistyStepUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = bonusSpellAct({ session: state, spellId: mistyStepUnitId });
    const destinationHole = requireHole(
      act.initialHoles,
      "teleportDestination",
    );
    const destinationFill = teleportDestinationFill({ hole: destinationHole });
    const otherCasterId = combatantId("other-misty-step-caster");
    const caster = state.state.combatants.get(spellCasterId);
    const invocation =
      caster?.origin.kind === "character"
        ? characterSpellProcedure(
            caster.origin.execution,
            act.subject.procedureRef,
          )
        : undefined;
    if (invocation?.procedure !== "selfTeleport") {
      throw new Error("Expected an executable self-teleport procedure.");
    }
    const staleDestinationHole = spellTeleportDestinationHole(
      invocation,
      otherCasterId,
    );
    expect(staleDestinationHole.holeId).not.toEqual(destinationHole.holeId);
    const staleOtherCasterFill: Extract<
      BattleFill,
      { readonly kind: "teleportDestination" }
    > = teleportDestinationFill({ hole: staleDestinationHole });
    const wrongHoleIdFill: Extract<
      BattleFill,
      { readonly kind: "teleportDestination" }
    > = {
      ...destinationFill,
      holeId: staleDestinationHole.holeId,
    };

    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [staleOtherCasterFill],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [wrongHoleIdFill],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("misty_step is not admitted without a level 2 or higher Spell Slot", () => {
    const spell = spellRecord(mistyStepUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });

    expect(
      maybeBonusSpellAct({ session: state, spellId: mistyStepUnitId }),
    ).toBeUndefined();
  });
});
