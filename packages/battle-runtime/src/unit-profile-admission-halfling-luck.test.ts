// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-HALFLING-LUCK-RUNTIME species_halfling_luck
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-D20-TEST-ROLLED-DIE-REROLL-CHOICE species_halfling_luck
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-HALFLING-LUCK-RUNTIME species_halfling_luck
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-D20-TEST-ROLLED-DIE-REROLL-CHOICE species_halfling_luck
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-HALFLING-LUCK-RUNTIME species_halfling_luck doReplayHalflingLuckNaturalOneReroll
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-D20-TEST-ROLLED-DIE-REROLL-CHOICE species_halfling_luck doReplayHalflingLuckRawD20RerollChoice
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.d20-test-natural-one-reroll

import {
  DieRollResult,
  difficultyClass,
  movementFeet,
  resourceCount,
} from "@dnd/shared/types";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";
import {
  BattleFillSchema,
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleTrackedOngoingSpellLightEmitter,
} from "./battle-reducer.ts";
import {
  D20_TEST_NATURAL_ONE_REROLL_DIE_FACE_REQUIRED_MESSAGE,
  D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_REQUIRED_MESSAGE,
  D20_TEST_NATURAL_ONE_REROLL_SELECTED_DIE_MESSAGE,
  D20_TEST_NATURAL_ONE_REROLL_STACKING_MESSAGE,
  D20_TEST_NATURAL_ONE_REROLL_TRIGGER_MESSAGE,
  D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE,
  d20TestNaturalOneRerollRollDecisionRequired,
  effectiveD20TestNaturalOneRerollAbilityCheckValue,
  effectiveD20TestNaturalOneRerollSavingThrowOutcome,
} from "./battle-reducer/d20-test-natural-one-reroll.ts";
import { SEEKING_METAMAGIC_EFFECT_KIND } from "./battle-reducer/metamagic-support.ts";
import {
  abilityCheckFill,
  attackRollFill,
  characterSeed,
  concentrationSavingThrowFill,
  damageRollFillWithGroups,
  deathSavingThrowFill,
  endTurn,
  fighterId,
  findAct,
  goblinId,
  hidePrerequisites,
  interruptDecisionFill,
  magicSubject,
  movementFill,
  oppositionSide,
  reactionChoiceWithSubject,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  skeletonId,
  startBattleRight,
  statBlockCreatureInit,
  testDaggerAttack,
  testShortswordAttack,
  targetFill,
  wizardSpellcasting,
  wizardId,
  type BattleSubject,
} from "./battle-runtime-test-support.ts";
import {
  battleD20TestNaturalOneRerollSupportForUnit,
  battleId,
  battleObjectId,
  battleUnitRefWithSupportProfiles,
  D20_TEST_NATURAL_ONE_REROLL_SUPPORT_PROFILE,
  Either,
  parseSupportedUnitFeatureProfile,
  speciesHalflingLuckUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
  unitMechanicsVariant,
  viciousMockeryUnitId,
} from "./unit-profile-admission-test-support.ts";
import { dispelMagicUnitId } from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.ts";

const expectedRerollProfile = {
  optional: true,
  trigger: { kind: "d20TestRollIs", dieFace: 1 },
  reroll: { kind: "triggeringD20", use: "newRoll" },
} as const;

const expectedSupport = {
  kind: D20_TEST_NATURAL_ONE_REROLL_SUPPORT_PROFILE,
  reroll: expectedRerollProfile,
} as const;

type OngoingSpellTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "ongoingSpellTargetChoice" }
>;
type OngoingSpellTarget = OngoingSpellTargetChoiceFill["value"];
type OngoingSpellTargetWithinRangeFact =
  OngoingSpellTargetChoiceFill["spatialFacts"][number];

describe("L3-FOLLOWUP-HALFLING-LUCK-RUNTIME deterministic profile slice", () => {
  test("Halfling Luck admits the natural-1 D20 Test reroll profile", () => {
    const unit = unitLibrary.requireUnit(speciesHalflingLuckUnitId);

    expect(battleD20TestNaturalOneRerollSupportForUnit(unit)).toEqual(
      expectedSupport,
    );
    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: speciesHalflingLuckUnitId,
        supportProfiles: [expectedSupport],
      }),
    );
    expect(parseSupportedUnitFeatureProfile(unit, [])).toEqual({
      kind: "d20TestNaturalOneReroll",
      unit,
      reroll: expectedRerollProfile,
    });
  });

  test("D20 Test natural-1 reroll admission follows mechanics shape rather than Unit identity", () => {
    const unit = unitLibrary.requireUnit(speciesHalflingLuckUnitId);
    if (
      unit.kind !== "species_trait" ||
      unit.mechanics.family !== "d20_test_natural_one_reroll"
    ) {
      throw new Error("Expected Halfling Luck d20 reroll species trait.");
    }
    const syntheticUnit = unitMechanicsVariant(unit, {
      id: "synthetic_d20_test_natural_one_reroll_fixture",
      mechanics: unit.mechanics,
    });

    expect(battleD20TestNaturalOneRerollSupportForUnit(syntheticUnit)).toEqual(
      expectedSupport,
    );
    expect(parseSupportedUnitFeatureProfile(syntheticUnit, [])).toEqual({
      kind: "d20TestNaturalOneReroll",
      unit: syntheticUnit,
      reroll: expectedRerollProfile,
    });
  });

  test("Attack Rolls use the new d20 result after a selected natural-1 reroll", () => {
    const state = halflingLuckFighterBattle();
    const subject = attackSubject();
    const target = requireTypedHole(
      resolveAttack(state, subject, []),
      "targetChoice",
    );
    const targetSelection = targetFill(target, goblinId);
    const roll = requireTypedHole(
      resolveAttack(state, subject, [targetSelection]),
      "attackRoll",
    );

    const rerolledHit = resolveAttack(state, subject, [
      targetSelection,
      attackRollFill(roll, {
        total: 2,
        naturalD20: 1,
        d20TestNaturalOneReroll: rerollRoll({
          total: 15,
          naturalD20: 12,
        }),
      }),
    ]);

    expect(rerolledHit.tag).toBe("needsHoles");
    if (rerolledHit.tag !== "needsHoles") {
      throw new Error("Expected rerolled attack to request damage.");
    }
    expect(rerolledHit.holes).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "rolledDice" })]),
    );

    const replacementNaturalOne = requireResolved(
      resolveAttack(state, subject, [
        targetSelection,
        attackRollFill(roll, {
          total: 2,
          naturalD20: 1,
          d20TestNaturalOneReroll: rerollRoll({
            total: 30,
            naturalD20: 1,
          }),
        }),
      ]),
    );
    expect(
      Number(replacementNaturalOne.state.combatants.get(goblinId)?.hp),
    ).toBe(Number(state.combatants.get(goblinId)?.hp));

    const declined = requireResolved(
      resolveAttack(state, subject, [
        targetSelection,
        attackRollFill(roll, {
          total: 2,
          naturalD20: 1,
          d20TestNaturalOneReroll: declineRoll(),
        }),
      ]),
    );
    expect(Number(declined.state.combatants.get(goblinId)?.hp)).toBe(
      Number(state.combatants.get(goblinId)?.hp),
    );
  });

  test("Advantage and Disadvantage raw d20 rolls choose one natural-1 die for replacement", () => {
    const state = halflingLuckFighterBattle();
    const subject = attackSubject();
    const target = requireTypedHole(
      resolveAttack(state, subject, []),
      "targetChoice",
    );
    const targetSelection = targetFill(target, goblinId);
    const roll = requireTypedHole(
      resolveAttack(state, subject, [targetSelection]),
      "attackRoll",
    );

    const advantageUnselectedOne = {
      first: 1,
      second: 10,
      selected: "second" as const,
    };
    expectD20TestNaturalOneRerollHole(
      resolveAttack(state, subject, [
        targetSelection,
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
          rolledD20s: advantageUnselectedOne,
        }),
      ]),
      "attackRoll",
    );

    const advantageSelectedOneContradiction = resolveAttack(state, subject, [
      targetSelection,
      attackRollFill(roll, {
        total: 6,
        naturalD20: 1,
        rollMode: "advantage",
        rolledD20s: { first: 1, second: 10, selected: "first" },
      }),
    ]);
    expect(advantageSelectedOneContradiction).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_SELECTED_DIE_MESSAGE,
    });

    const advantageUnselectedReplacement = resolveAttack(state, subject, [
      targetSelection,
      attackRollFill(roll, {
        total: 15,
        naturalD20: 10,
        rollMode: "advantage",
        rolledD20s: advantageUnselectedOne,
        d20TestNaturalOneReroll: rerollRolledDieRoll({
          die: "first",
          naturalD20: 20,
          result: { total: 25, naturalD20: 20, rollMode: "advantage" },
        }),
      }),
    ]);
    expect(advantageUnselectedReplacement).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
    });

    const genericReplacementWithRawDice = resolveAttack(state, subject, [
      targetSelection,
      attackRollFill(roll, {
        total: 15,
        naturalD20: 10,
        rollMode: "advantage",
        rolledD20s: advantageUnselectedOne,
        d20TestNaturalOneReroll: rerollRoll({
          total: 25,
          naturalD20: 20,
        }),
      }),
    ]);
    expect(genericReplacementWithRawDice).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_DIE_SELECTION_REQUIRED_MESSAGE,
    });

    const advantageBothOnes = resolveAttack(state, subject, [
      targetSelection,
      attackRollFill(roll, {
        total: 6,
        naturalD20: 1,
        rollMode: "advantage",
        rolledD20s: { first: 1, second: 1, selected: "first" },
        d20TestNaturalOneReroll: rerollRolledDieRoll({
          die: "first",
          naturalD20: 12,
          result: { total: 17, naturalD20: 12, rollMode: "advantage" },
        }),
      }),
    ]);
    expect(advantageBothOnes).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
    });

    const advantageNeitherOne = resolveAttack(state, subject, [
      targetSelection,
      attackRollFill(roll, {
        total: 15,
        naturalD20: 10,
        rollMode: "advantage",
        rolledD20s: { first: 7, second: 10, selected: "second" },
      }),
    ]);
    expect(advantageNeitherOne).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
    });
    if (advantageNeitherOne.tag !== "needsHoles") {
      throw new Error("Expected advantage hit to ask for damage.");
    }
    expect(
      advantageNeitherOne.holes.some(
        (hole) =>
          hole.kind === "attackRoll" && "d20TestNaturalOneRerolls" in hole,
      ),
    ).toBe(false);

    const disadvantageSelectedOne = resolveAttack(state, subject, [
      targetSelection,
      attackRollFill(roll, {
        total: 6,
        naturalD20: 1,
        rollMode: "disadvantage",
        rolledD20s: { first: 1, second: 10, selected: "first" },
        d20TestNaturalOneReroll: rerollRolledDieRoll({
          die: "first",
          naturalD20: 12,
          result: { total: 15, naturalD20: 10, rollMode: "disadvantage" },
        }),
      }),
    ]);
    expect(disadvantageSelectedOne).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
    });

    const disadvantageUnselectedOneContradiction = resolveAttack(
      state,
      subject,
      [
        targetSelection,
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "disadvantage",
          rolledD20s: { first: 1, second: 10, selected: "second" },
        }),
      ],
    );
    expect(disadvantageUnselectedOneContradiction).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_SELECTED_DIE_MESSAGE,
    });

    const disadvantageBothOnesChooseUnselected = requireResolved(
      resolveAttack(state, subject, [
        targetSelection,
        attackRollFill(roll, {
          total: 6,
          naturalD20: 1,
          rollMode: "disadvantage",
          rolledD20s: { first: 1, second: 1, selected: "first" },
          d20TestNaturalOneReroll: rerollRolledDieRoll({
            die: "second",
            naturalD20: 12,
            result: { total: 6, naturalD20: 1, rollMode: "disadvantage" },
          }),
        }),
      ]),
    );
    expect(
      Number(
        disadvantageBothOnesChooseUnselected.state.combatants.get(goblinId)?.hp,
      ),
    ).toBe(Number(state.combatants.get(goblinId)?.hp));

    const disadvantageNeitherOne = requireResolved(
      resolveAttack(state, subject, [
        targetSelection,
        attackRollFill(roll, {
          total: 12,
          naturalD20: 7,
          rollMode: "disadvantage",
          rolledD20s: { first: 7, second: 10, selected: "first" },
        }),
      ]),
    );
    expect(
      Number(disadvantageNeitherOne.state.combatants.get(goblinId)?.hp),
    ).toBe(Number(state.combatants.get(goblinId)?.hp));
  });

  test("Raw d20 replacements project one Ability Check or Saving Throw result", () => {
    const abilityCheck = effectiveD20TestNaturalOneRerollAbilityCheckValue({
      total: 15,
      naturalD20: DieRollResult(10),
      rollMode: "advantage" as const,
      rolledD20s: rolledD20s({ first: 1, second: 10, selected: "second" }),
      d20TestNaturalOneReroll: rerollRolledDieRoll({
        die: "first",
        naturalD20: 20,
        result: { total: 25, naturalD20: 20, rollMode: "advantage" },
      }),
    });
    expect(abilityCheck).toMatchObject({
      total: 25,
      naturalD20: DieRollResult(20),
      rolledD20s: {
        first: DieRollResult(20),
        second: DieRollResult(10),
        selected: "first",
      },
    });

    const savingThrow = effectiveD20TestNaturalOneRerollSavingThrowOutcome({
      targetId: spellTargetId,
      succeeded: false,
      naturalD20: DieRollResult(1),
      rolledD20s: rolledD20s({ first: 1, second: 10, selected: "first" }),
      d20TestNaturalOneReroll: rerollRolledDieOutcome({
        die: "first",
        naturalD20: 12,
        result: { succeeded: true, naturalD20: 10 },
      }),
    });
    expect(savingThrow).toMatchObject({
      targetId: spellTargetId,
      succeeded: true,
      naturalD20: DieRollResult(10),
    });
  });

  test("Light-property bonus Attack Rolls use the new d20 result after a selected natural-1 reroll", () => {
    const { unit, unitRef } = halflingLuckSelection();
    const state = startBattleRight({
      battleId: battleId("halfling-luck-off-hand-attack"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
          characterUnitRefs: [unitRef],
          unitFeatures: [{ unit }],
          selectedLoadout: {
            weapon: {
              itemId: "main:weapon_shortsword",
              unitId: "weapon_shortsword",
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: "off:weapon_dagger",
              unitId: "weapon_dagger",
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const qualifyingAttack: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Shortsword",
    };
    const qualifyingTarget = requireTypedHole(
      resolveBattleSubject({ state, subject: qualifyingAttack, fills: [] }),
      "targetChoice",
    );
    const qualifyingRoll = requireTypedHole(
      resolveBattleSubject({
        state,
        subject: qualifyingAttack,
        fills: [targetFill(qualifyingTarget, goblinId)],
      }),
      "attackRoll",
    );
    const afterQualifyingAttack = requireResolved(
      resolveBattleSubject({
        state,
        subject: qualifyingAttack,
        fills: [
          targetFill(qualifyingTarget, goblinId),
          attackRollFill(qualifyingRoll, { total: 8, naturalD20: 2 }),
        ],
      }),
    ).state;
    const offHandAttack: BattleSubject = {
      tag: "bonusAction",
      actorId: fighterId,
      action: "offHandAttack",
      attackName: "Dagger",
    };
    const target = requireTypedHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject: offHandAttack,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireTypedHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject: offHandAttack,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );

    const rerolledHit = resolveBattleSubject({
      state: afterQualifyingAttack,
      subject: offHandAttack,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 2,
          naturalD20: 1,
          d20TestNaturalOneReroll: rerollRoll({
            total: 15,
            naturalD20: 12,
          }),
        }),
      ],
    });

    expect(rerolledHit.tag).toBe("needsHoles");
    if (rerolledHit.tag !== "needsHoles") {
      throw new Error("Expected rerolled off-hand attack to request damage.");
    }
    expect(rerolledHit.holes).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "rolledDice" })]),
    );
  });

  test("Opportunity Attack Rolls validate natural-1 reroll decisions against the reactor", () => {
    const { unit, unitRef } = halflingLuckSelection();
    const reactorLuckState = startBattleRight({
      battleId: battleId("halfling-luck-opportunity-reactor"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Synthetic Luck Reactor",
          initiative: 10,
          side: oppositionSide,
          attack: testShortswordAttack(),
          characterUnitRefs: [unitRef],
          unitFeatures: [{ unit }],
        }),
      ],
    });
    const reactorOpportunity = startOpportunityAttack(
      reactorLuckState,
      "Shortsword",
    );

    const rerolledHit = resolveBattleSubject({
      state: reactorOpportunity.state,
      subject: reactorOpportunity.subject,
      fills: [
        attackRollFill(reactorOpportunity.attackRoll, {
          total: 2,
          naturalD20: 1,
          d20TestNaturalOneReroll: rerollRoll({
            total: 15,
            naturalD20: 12,
          }),
        }),
      ],
    });
    expect(rerolledHit.tag).toBe("needsHoles");
    if (rerolledHit.tag !== "needsHoles") {
      throw new Error(
        "Expected rerolled Opportunity Attack to request damage.",
      );
    }
    expect(rerolledHit.holes).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "rolledDice" })]),
    );

    const declined = requireResolved(
      resolveBattleSubject({
        state: reactorOpportunity.state,
        subject: reactorOpportunity.subject,
        fills: [
          attackRollFill(reactorOpportunity.attackRoll, {
            total: 2,
            naturalD20: 1,
            d20TestNaturalOneReroll: declineRoll(),
          }),
        ],
      }),
    );
    expect(Number(declined.state.combatants.get(fighterId)?.hp)).toBe(
      Number(reactorLuckState.combatants.get(fighterId)?.hp),
    );

    const notNaturalOne = resolveBattleSubject({
      state: reactorOpportunity.state,
      subject: reactorOpportunity.subject,
      fills: [
        attackRollFill(reactorOpportunity.attackRoll, {
          total: 8,
          naturalD20: 2,
          d20TestNaturalOneReroll: rerollRoll({
            total: 15,
            naturalD20: 12,
          }),
        }),
      ],
    });
    expect(notNaturalOne).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_TRIGGER_MESSAGE,
    });

    const moverLuckState = startBattleRight({
      battleId: battleId("halfling-luck-opportunity-mover"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
          characterUnitRefs: [unitRef],
          unitFeatures: [{ unit }],
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Synthetic Non-Luck Reactor",
          initiative: 10,
          side: oppositionSide,
          attack: testShortswordAttack(),
        }),
      ],
    });
    const nonLuckReactorOpportunity = startOpportunityAttack(
      moverLuckState,
      "Shortsword",
    );
    const unavailable = resolveBattleSubject({
      state: nonLuckReactorOpportunity.state,
      subject: nonLuckReactorOpportunity.subject,
      fills: [
        attackRollFill(nonLuckReactorOpportunity.attackRoll, {
          total: 2,
          naturalD20: 1,
          d20TestNaturalOneReroll: rerollRoll({
            total: 15,
            naturalD20: 12,
          }),
        }),
      ],
    });
    expect(unavailable).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE,
    });
  });

  test("Ability Checks commit the replacement total after a selected natural-1 reroll", () => {
    const state = halflingLuckFighterBattle();
    const subject = {
      tag: "action",
      actorId: fighterId,
      action: "hide",
    } satisfies BattleSubject;
    const check = requireTypedHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "abilityCheck",
    );

    const decodedRawAbilityCheck = Schema.decodeUnknownSync(BattleFillSchema)({
      kind: "abilityCheck",
      holeId: check.holeId,
      value: {
        total: 15,
        naturalD20: 10,
        rolledD20s: { first: 1, second: 10, selected: "second" },
      },
    });
    expect(decodedRawAbilityCheck).toMatchObject({
      kind: "abilityCheck",
      value: {
        rolledD20s: { first: 1, second: 10, selected: "second" },
      },
    });
    const encodedRawAbilityCheck = Schema.encodeSync(BattleFillSchema)(
      decodedRawAbilityCheck,
    );
    expect(encodedRawAbilityCheck).toMatchObject({
      kind: "abilityCheck",
      value: {
        rolledD20s: { first: 1, second: 10, selected: "second" },
      },
    });
    if (decodedRawAbilityCheck.kind !== "abilityCheck") {
      throw new Error("expected an Ability Check fill after decoding");
    }
    expect(
      d20TestNaturalOneRerollRollDecisionRequired({
        actor: state.combatants.get(fighterId),
        originalNaturalD20: decodedRawAbilityCheck.value.naturalD20,
        rollMode: "advantage",
        rolledD20s: decodedRawAbilityCheck.value.rolledD20s,
        decision: decodedRawAbilityCheck.value.d20TestNaturalOneReroll,
      }),
    ).toBe(true);

    const missingNaturalD20 = resolveBattleSubject({
      state,
      subject,
      fills: [abilityCheckFill(check, { total: 18 })],
    });
    expect(missingNaturalD20).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_DIE_FACE_REQUIRED_MESSAGE,
    });

    expectD20TestNaturalOneRerollHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          abilityCheckFill(check, {
            total: 2,
            naturalD20: 1,
          }),
        ],
      }),
      "abilityCheck",
    );

    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          abilityCheckFill(check, {
            total: 2,
            naturalD20: 1,
            d20TestNaturalOneReroll: rerollRoll({
              total: 18,
              naturalD20: 14,
            }),
          }),
        ],
      }),
    ).state;

    expect(hidden.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(18),
    });
  });

  test("Spellcasting Ability Checks expose the post-roll natural-1 reroll choice", () => {
    const { unit, unitRef } = halflingLuckSelection();
    const objectId = battleObjectId("halfling-luck-dispel-object");
    const emitter = spellLightEmitter({
      objectId,
      sourceSpellId: "synthetic_blue_flame",
      sourceSpellLevel: 4,
    });
    const baseState = spellBattle({
      preparedSpells: [spellRecord(dispelMagicUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      casterUnitRefs: [unitRef],
      casterUnitFeatures: [{ unit }],
    });
    const state = { ...baseState, lightEmitters: [emitter] };
    const act = spellAct({
      state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const target = requireInitialHole(
      act.initialHoles,
      "ongoingSpellTargetChoice",
    );
    const targetSelection = ongoingSpellTargetFill(target, {
      kind: "object",
      objectId,
    });
    const check = requireTypedHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetSelection],
      }),
      "spellcastingAbilityCheck",
    );

    expectD20TestNaturalOneRerollHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetSelection,
          abilityCheckFill(check, {
            total: 2,
            naturalD20: 1,
          }),
        ],
      }),
      "spellcastingAbilityCheck",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetSelection,
          abilityCheckFill(check, {
            total: 2,
            naturalD20: 1,
            d20TestNaturalOneReroll: rerollRoll({
              total: 14,
              naturalD20: 14,
            }),
          }),
        ],
      }),
    );
    expect(resolved.state.lightEmitters).toEqual([]);
  });

  test("Saving Throws use the replacement success outcome after a selected natural-1 reroll", () => {
    const { unit, unitRef } = halflingLuckSelection();
    const spell = spellRecord(viciousMockeryUnitId);
    const state = spellBattle({
      cantrips: [spell],
      targetUnitRefs: [unitRef],
      targetUnitFeatures: [{ unit }],
    });
    const act = spellAct({ state, spellId: viciousMockeryUnitId });
    const target = requireInitialHole(act.initialHoles, "targetChoice");
    const targetSelection = spellTargetFill(
      target,
      viciousMockeryUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireTypedHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetSelection],
      }),
      "savingThrowOutcome",
    );

    const omittedRolledDie = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetSelection,
        savingThrowOutcomeFill(savingThrow, [
          {
            targetId: spellTargetId,
            succeeded: false,
          },
        ]),
      ],
    });
    expect(omittedRolledDie).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_DIE_FACE_REQUIRED_MESSAGE,
    });

    const noRollFailure = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetSelection,
        savingThrowOutcomeFill(savingThrow, [
          {
            targetId: spellTargetId,
            succeeded: false,
            withoutRoll: true,
          },
        ]),
      ],
    });
    expect(noRollFailure.tag).toBe("needsHoles");
    if (noRollFailure.tag !== "needsHoles") {
      throw new Error("Expected no-roll failed save to request damage.");
    }
    expect(noRollFailure.holes).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "rolledDice" })]),
    );

    const noRollSuccess = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetSelection,
          savingThrowOutcomeFill(savingThrow, [
            {
              targetId: spellTargetId,
              succeeded: true,
              withoutRoll: true,
            },
          ]),
        ],
      }),
    );
    expect(Number(noRollSuccess.state.combatants.get(spellTargetId)?.hp)).toBe(
      Number(state.combatants.get(spellTargetId)?.hp),
    );

    expectD20TestNaturalOneRerollHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetSelection,
          savingThrowOutcomeFill(savingThrow, [
            {
              targetId: spellTargetId,
              succeeded: false,
              naturalD20: 1,
            },
          ]),
        ],
      }),
      "savingThrowOutcome",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetSelection,
          savingThrowOutcomeFill(savingThrow, [
            {
              targetId: spellTargetId,
              succeeded: false,
              naturalD20: 1,
              d20TestNaturalOneReroll: rerollOutcome({
                succeeded: true,
                naturalD20: 10,
              }),
            },
          ]),
        ],
      }),
    );

    expect(Number(resolved.state.combatants.get(spellTargetId)?.hp)).toBe(
      Number(state.combatants.get(spellTargetId)?.hp),
    );
  });

  test("D20 Test natural-1 reroll decisions require the selected profile and a natural 1", () => {
    const state = halflingLuckFighterBattle();
    const subject = attackSubject();
    const target = requireTypedHole(
      resolveAttack(state, subject, []),
      "targetChoice",
    );
    const targetSelection = targetFill(target, goblinId);
    const roll = requireTypedHole(
      resolveAttack(state, subject, [targetSelection]),
      "attackRoll",
    );

    const notNaturalOne = resolveAttack(state, subject, [
      targetSelection,
      attackRollFill(roll, {
        total: 12,
        naturalD20: 2,
        d20TestNaturalOneReroll: rerollRoll({ total: 15, naturalD20: 12 }),
      }),
    ]);
    expect(notNaturalOne).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_TRIGGER_MESSAGE,
    });

    const missingDecision = resolveAttack(state, subject, [
      targetSelection,
      attackRollFill(roll, {
        total: 2,
        naturalD20: 1,
      }),
    ]);
    expect(missingDecision).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "attackRoll",
          d20TestNaturalOneRerolls: [
            expect.objectContaining({
              effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
            }),
          ],
        }),
      ],
    });

    const unselectedState = startBattleRight({
      battleId: battleId("halfling-luck-unselected"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const unselected = resolveAttack(unselectedState, subject, [
      targetSelection,
      attackRollFill(roll, {
        total: 2,
        naturalD20: 1,
        d20TestNaturalOneReroll: rerollRoll({ total: 15, naturalD20: 12 }),
      }),
    ]);
    expect(unselected).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE,
    });

    const unselectedContradictoryRawDice = resolveAttack(
      unselectedState,
      subject,
      [
        targetSelection,
        attackRollFill(roll, {
          total: 6,
          naturalD20: 1,
          rollMode: "advantage",
          rolledD20s: { first: 1, second: 10, selected: "first" },
        }),
      ],
    );
    expect(unselectedContradictoryRawDice).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_SELECTED_DIE_MESSAGE,
    });
  });

  test("Spell Attack Rolls consume a Luck replacement hit before Seeking Spell missed-attack rerolls", () => {
    const { unit, unitRef } = halflingLuckSelection();
    const rayOfFrost = spellRecord("ray_of_frost");
    const state = spellBattle({
      cantrips: [rayOfFrost],
      casterClassLevels: [{ className: "sorcerer", level: 5 }],
      casterUnitRefs: [unitRef],
      casterUnitFeatures: [{ unit }],
      casterResources: [
        {
          unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
          pointsRemaining: resourceCount(4),
        },
      ],
      casterMetamagic: {
        sorceryPointResourceUnitId: "sorcerer_font_of_magic",
        spellUseLimit: "one_per_spell_unless_option_allows_stacking",
        knownOptions: [seekingMetamagicOption()],
      },
    });
    const act = spellAct({ state, spellId: rayOfFrost.id });
    const target = requireInitialHole(act.initialHoles, "targetChoice");
    const targetSelection = spellTargetFill(
      target,
      rayOfFrost.id,
      spellCasterId,
      spellTargetId,
    );
    const attack = requireTypedHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetSelection],
      }),
      "attackRoll",
    );

    const awaitingLuck = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetSelection,
        attackRollFill(attack, {
          total: 4,
          naturalD20: 1,
        }),
      ],
    });
    const luckHole = requireTypedHole(awaitingLuck, "attackRoll");
    expect(luckHole).toMatchObject({
      d20TestNaturalOneRerolls: [
        expect.objectContaining({
          effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
        }),
      ],
    });
    expect(luckHole).not.toHaveProperty("spellAttackRerolls");

    const luckReplacementHit = attackRollFill(luckHole, {
      total: 18,
      naturalD20: 1,
      d20TestNaturalOneReroll: rerollRoll({
        total: 18,
        naturalD20: 13,
      }),
    });
    const afterLuck = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetSelection, luckReplacementHit],
    });
    expect(afterLuck).toMatchObject({ tag: "needsHoles" });
    expect(requireTypedHole(afterLuck, "rolledDice")).toMatchObject({
      kind: "rolledDice",
    });
    if (afterLuck.tag !== "needsHoles") {
      throw new Error("Expected Luck replacement hit to ask for damage.");
    }
    expect(
      afterLuck.holes.some(
        (hole) => hole.kind === "attackRoll" && "spellAttackRerolls" in hole,
      ),
    ).toBe(false);

    const stackedSeeking = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetSelection,
        attackRollFill(luckHole, {
          total: 4,
          naturalD20: 1,
          d20TestNaturalOneReroll: rerollRoll({
            total: 18,
            naturalD20: 13,
          }),
          spellAttackReroll: {
            kind: "reroll",
            effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
            replacement: {
              total: 18,
              naturalD20: DieRollResult(13),
            },
          },
        }),
      ],
    });
    expect(stackedSeeking).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_STACKING_MESSAGE,
    });
  });

  test("Concentration Saving Throws consume natural-1 reroll decisions", () => {
    const { unit, unitRef } = halflingLuckSelection();
    const base = startBattleRight({
      battleId: battleId("halfling-luck-concentration-save"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("eldritch_blast")],
            preparedSpells: [],
          }),
          characterUnitRefs: [unitRef],
          unitFeatures: [{ unit }],
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Concentrating Halfling",
          initiative: 10,
          side: oppositionSide,
          attack: null,
          characterUnitRefs: [unitRef],
          unitFeatures: [{ unit }],
        }),
      ],
    });
    const targetCombatant = base.combatants.get(skeletonId);
    if (targetCombatant === undefined) {
      throw new Error("Expected concentrating target.");
    }
    const state = {
      ...base,
      combatants: new Map(base.combatants).set(skeletonId, {
        ...targetCombatant,
        concentration: {
          sourceSpellId: "test_concentration",
          effectKind: "readiedSpell" as const,
        },
      }),
    };
    const subject = magicSubject("eldritch_blast");
    const target = requireInitialHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );
    const targetSelection = targetFill(target, skeletonId);
    const attack = requireTypedHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetSelection],
      }),
      "attackRoll",
    );
    const rerolledSpellAttack = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetSelection,
        attackRollFill(attack, {
          total: 2,
          naturalD20: 1,
          d20TestNaturalOneReroll: rerollRoll({
            total: 18,
            naturalD20: 12,
          }),
        }),
      ],
    });
    expect(rerolledSpellAttack.tag).toBe("needsHoles");
    if (rerolledSpellAttack.tag !== "needsHoles") {
      throw new Error("Expected rerolled spell attack to request damage.");
    }
    expect(rerolledSpellAttack.holes).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "rolledDice" })]),
    );
    const damage = requireTypedHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const concentration = requireTypedHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[4]]),
        ],
      }),
      "concentrationSavingThrow",
    );

    const omittedRolledDie = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetSelection,
        attackRollFill(attack, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[4]]),
        concentrationSavingThrowFill(concentration, {
          succeeded: false,
        }),
      ],
    });
    expect(omittedRolledDie).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_DIE_FACE_REQUIRED_MESSAGE,
    });

    const noRollFailure = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[4]]),
          concentrationSavingThrowFill(concentration, {
            succeeded: false,
            withoutRoll: true,
          }),
        ],
      }),
    );
    expect(noRollFailure.state.combatants.get(skeletonId)?.concentration).toBe(
      null,
    );

    const missingDecision = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetSelection,
        attackRollFill(attack, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[4]]),
        concentrationSavingThrowFill(concentration, {
          succeeded: false,
          naturalD20: 1,
        }),
      ],
    });
    expectD20TestNaturalOneRerollHole(
      missingDecision,
      "concentrationSavingThrow",
    );

    const maintained = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetSelection,
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[4]]),
          concentrationSavingThrowFill(concentration, {
            succeeded: false,
            naturalD20: 1,
            d20TestNaturalOneReroll: rerollOutcome({
              succeeded: true,
              naturalD20: 12,
            }),
          }),
        ],
      }),
    );
    expect(maintained.state.combatants.get(skeletonId)?.concentration).toEqual({
      sourceSpellId: "test_concentration",
      effectKind: "readiedSpell",
    });
  });

  test("Death Saving Throws require and consume natural-1 reroll decisions", () => {
    const { unit, unitRef } = halflingLuckSelection();
    const state = startBattleRight({
      battleId: battleId("halfling-luck-death-save"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: spellTargetId,
          displayName: "Dying Halfling",
          initiative: 10,
          currentHp: 0,
          attack: null,
          characterUnitRefs: [unitRef],
          unitFeatures: [{ unit }],
        }),
      ],
    });
    const needsRoll = endTurn({ state, actorId: fighterId });
    const deathSave = requireTypedHole(needsRoll, "deathSavingThrow");

    const missingDecision = endTurn({
      state,
      actorId: fighterId,
      fills: [deathSavingThrowFill(deathSave, 1)],
    });
    expectD20TestNaturalOneRerollHole(missingDecision, "deathSavingThrow");

    const restored = requireResolved(
      endTurn({
        state,
        actorId: fighterId,
        fills: [
          deathSavingThrowFill(deathSave, {
            roll: 1,
            d20TestNaturalOneReroll: rerollDie(20),
          }),
        ],
      }),
    );
    expect(Number(restored.state.combatants.get(spellTargetId)?.hp)).toBe(1);
  });
});

function halflingLuckFighterBattle() {
  const { unit, unitRef } = halflingLuckSelection();
  return startBattleRight({
    battleId: battleId("halfling-luck-d20-test"),
    combatants: [
      characterSeed({
        initiative: 20,
        characterUnitRefs: [unitRef],
        unitFeatures: [{ unit }],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
    hidePrerequisites: hidePrerequisites([
      [fighterId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
    ]),
  });
}

function halflingLuckSelection() {
  const unit = unitLibrary.requireUnit(speciesHalflingLuckUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(Either.isRight(unitRef)).toBe(true);
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return { unit, unitRef: unitRef.right };
}

function attackSubject(): Extract<BattleSubject, { readonly tag: "action" }> {
  return {
    tag: "action",
    actorId: fighterId,
    action: "attack",
    attackName: "Longsword",
  };
}

function resolveAttack(
  state: Parameters<typeof resolveBattleSubject>[0]["state"],
  subject: BattleSubject,
  fills: readonly BattleFill[],
): BattleResolutionResult {
  return resolveBattleSubject({ state, subject, fills });
}

function ongoingSpellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "ongoingSpellTargetChoice" }>,
  target: OngoingSpellTarget,
): OngoingSpellTargetChoiceFill {
  return {
    kind: "ongoingSpellTargetChoice",
    holeId: hole.holeId,
    value: target,
    spatialFacts: [ongoingSpellTargetWithinRangeFact(target)],
  };
}

function ongoingSpellTargetWithinRangeFact(
  target: OngoingSpellTarget,
): OngoingSpellTargetWithinRangeFact {
  return {
    kind: "ongoingSpellTargetWithinRange",
    casterId: spellCasterId,
    spellId: dispelMagicUnitId,
    target,
    rangeFeet: movementFeet(120),
  };
}

function spellLightEmitter(input: {
  readonly objectId: ReturnType<typeof battleObjectId>;
  readonly sourceSpellId: string;
  readonly sourceSpellLevel: number;
}): BattleTrackedOngoingSpellLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceSpellId: input.sourceSpellId,
    sourceCombatantId: spellTargetId,
    sourceEffectId: battleSpellEffectOccurrenceId(
      `${spellTargetId}:${input.sourceSpellId}:${input.objectId}:halfling-luck-test-effect`,
    ),
    sourceSpellLevel: testBattleSpellEffectLevel(input.sourceSpellLevel),
    attachment: { kind: "object", objectId: input.objectId },
    emission: {
      kind: "brightAndDim",
      brightRadiusFeet: movementFeet(20),
      dimAdditionalFeet: movementFeet(20),
    },
    opaqueCoverInteraction: { kind: "blocksEmission" },
    expiresAt: { kind: "untilDispelled" },
  };
}

function testBattleSpellEffectLevel(sourceSpellLevel: number) {
  const parsed = parseBattleSpellEffectLevel(sourceSpellLevel);
  if (parsed === null) {
    throw new Error("Expected test spell effect level to be in range.");
  }
  return parsed;
}

function requireTypedHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = requireHole(result, kind);
  if (hole.kind !== kind) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole as Extract<BattleHole, { readonly kind: K }>;
}

function requireInitialHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function expectD20TestNaturalOneRerollHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = requireTypedHole(result, kind);
  expect(hole).toMatchObject({
    d20TestNaturalOneRerolls: [
      expect.objectContaining({
        effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
      }),
    ],
  });
  return hole;
}

function startOpportunityAttack(
  state: Parameters<typeof resolveBattleSubject>[0]["state"],
  attackName: string,
) {
  const subject = {
    tag: "runtimeCommand",
    actorId: fighterId,
    command: "move",
  } satisfies BattleSubject;
  const movement = requireTypedHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "movement",
  );
  const awaitingReaction = resolveBattleSubject({
    state,
    subject,
    fills: [
      movementFill(movement, {
        movementCostFeet: 5,
        provokedOpportunityAttacks: [{ reactorId: goblinId, attackName }],
      }),
    ],
  });
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Opportunity Attack interrupt.");
  }
  const choice = reactionChoiceWithSubject(
    awaitingReaction.snapshot.pendingInterrupt!.choices,
  );
  const startedReaction = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
      {
        kind: "resolve",
        responderId: goblinId,
        choice: {
          kind: "opportunityAttack",
          reactorId: goblinId,
          fills: [],
        },
      },
    ),
  });
  if (startedReaction.tag !== "needsHoles") {
    throw new Error("Expected Opportunity Attack roll hole.");
  }
  return {
    state: startedReaction.state,
    subject: choice.subject,
    attackRoll: requireInitialHole(startedReaction.holes, "attackRoll"),
  };
}

function rerollRoll(input: {
  readonly total: number;
  readonly naturalD20: number;
}): NonNullable<
  Extract<
    BattleFill,
    { readonly kind: "attackRoll" }
  >["value"]["d20TestNaturalOneReroll"]
> {
  return {
    kind: "reroll",
    effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
    replacement: {
      total: input.total,
      naturalD20: DieRollResult(input.naturalD20),
    },
  };
}

function rerollRolledDieRoll(input: {
  readonly die: "first" | "second";
  readonly naturalD20: number;
  readonly result: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode: "advantage" | "disadvantage";
  };
}): NonNullable<
  Extract<
    BattleFill,
    { readonly kind: "attackRoll" }
  >["value"]["d20TestNaturalOneReroll"]
> {
  return {
    kind: "rerollRolledDie",
    effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
    replacement: {
      die: input.die,
      naturalD20: DieRollResult(input.naturalD20),
      result: {
        total: input.result.total,
        naturalD20: DieRollResult(input.result.naturalD20),
        rollMode: input.result.rollMode,
      },
    },
  };
}

function declineRoll(): NonNullable<
  Extract<
    BattleFill,
    { readonly kind: "attackRoll" }
  >["value"]["d20TestNaturalOneReroll"]
> {
  return {
    kind: "decline",
    effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  };
}

function seekingMetamagicOption() {
  return {
    effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
    stackingMode: "can_combine_with_different_metamagic" as const,
    sorceryPointCost: resourceCount(1),
  } as const;
}

function rerollOutcome(input: {
  readonly succeeded: boolean;
  readonly naturalD20: number;
}): NonNullable<
  Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >["value"]["outcomes"][number]["d20TestNaturalOneReroll"]
> {
  return {
    kind: "reroll",
    effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
    replacement: {
      succeeded: input.succeeded,
      naturalD20: DieRollResult(input.naturalD20),
    },
  };
}

function rerollRolledDieOutcome(input: {
  readonly die: "first" | "second";
  readonly naturalD20: number;
  readonly result: {
    readonly succeeded: boolean;
    readonly naturalD20: number;
  };
}): NonNullable<
  Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >["value"]["outcomes"][number]["d20TestNaturalOneReroll"]
> {
  return {
    kind: "rerollRolledDie",
    effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
    replacement: {
      die: input.die,
      naturalD20: DieRollResult(input.naturalD20),
      result: {
        succeeded: input.result.succeeded,
        naturalD20: DieRollResult(input.result.naturalD20),
      },
    },
  };
}

function rolledD20s(input: {
  readonly first: number;
  readonly second: number;
  readonly selected: "first" | "second";
}): NonNullable<
  Extract<BattleFill, { readonly kind: "attackRoll" }>["value"]["rolledD20s"]
> {
  return {
    first: DieRollResult(input.first),
    second: DieRollResult(input.second),
    selected: input.selected,
  };
}

function rerollDie(
  replacement: number,
): NonNullable<
  Extract<
    BattleFill,
    { readonly kind: "deathSavingThrow" }
  >["d20TestNaturalOneReroll"]
> {
  return {
    kind: "reroll",
    effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
    replacement: DieRollResult(replacement),
  };
}

defineSelectedIdentityReplayWitness({
  describeLabel: "L3-FOLLOWUP-HALFLING-LUCK-RUNTIME selected identity replay",
  taskId: "L3-FOLLOWUP-HALFLING-LUCK-RUNTIME",
  initialProjection: {
    unitId: speciesHalflingLuckUnitId,
    procedure: "initial",
    outcome: "pending",
  },
  units: [
    {
      unitId: speciesHalflingLuckUnitId,
      procedures: [
        {
          actionName: "doReplayHalflingLuckNaturalOneReroll",
          projectionAfter: {
            unitId: speciesHalflingLuckUnitId,
            procedure: "d20TestNaturalOneReroll",
            outcome: "damageRequested",
          },
          discover: replayHalflingLuckNaturalOneReroll,
        },
        {
          actionName: "doReplayHalflingLuckRawD20RerollChoice",
          projectionAfter: {
            unitId: speciesHalflingLuckUnitId,
            procedure: "rawD20RerollChoice",
            outcome: "damageRequested",
          },
          discover: replayHalflingLuckRawD20RerollChoice,
        },
      ],
    },
  ],
});

function replayHalflingLuckNaturalOneReroll(): {
  readonly unitId: typeof speciesHalflingLuckUnitId;
  readonly procedure: "d20TestNaturalOneReroll";
  readonly outcome: "damageRequested";
} {
  const state = halflingLuckFighterBattle();
  const subject = attackSubject();
  const target = requireTypedHole(
    resolveAttack(state, subject, []),
    "targetChoice",
  );
  const targetSelection = targetFill(target, goblinId);
  const roll = requireTypedHole(
    resolveAttack(state, subject, [targetSelection]),
    "attackRoll",
  );
  const result = resolveAttack(state, subject, [
    targetSelection,
    attackRollFill(roll, {
      total: 2,
      naturalD20: 1,
      d20TestNaturalOneReroll: rerollRoll({
        total: 15,
        naturalD20: 12,
      }),
    }),
  ]);
  if (
    result.tag !== "needsHoles" ||
    !result.holes.some((hole) => hole.kind === "rolledDice")
  ) {
    throw new Error("Expected selected Halfling Luck reroll replay.");
  }
  return {
    unitId: speciesHalflingLuckUnitId,
    procedure: "d20TestNaturalOneReroll",
    outcome: "damageRequested",
  };
}

function replayHalflingLuckRawD20RerollChoice(): {
  readonly unitId: typeof speciesHalflingLuckUnitId;
  readonly procedure: "rawD20RerollChoice";
  readonly outcome: "damageRequested";
} {
  const state = halflingLuckFighterBattle();
  const subject = attackSubject();
  const target = requireTypedHole(
    resolveAttack(state, subject, []),
    "targetChoice",
  );
  const targetSelection = targetFill(target, goblinId);
  const roll = requireTypedHole(
    resolveAttack(state, subject, [targetSelection]),
    "attackRoll",
  );
  const result = resolveAttack(state, subject, [
    targetSelection,
    attackRollFill(roll, {
      total: 15,
      naturalD20: 10,
      rollMode: "advantage",
      rolledD20s: rolledD20s({ first: 1, second: 10, selected: "second" }),
      d20TestNaturalOneReroll: rerollRolledDieRoll({
        die: "first",
        naturalD20: 20,
        result: {
          total: 25,
          naturalD20: 20,
          rollMode: "advantage",
        },
      }),
    }),
  ]);
  if (
    result.tag !== "needsHoles" ||
    !result.holes.some((hole) => hole.kind === "rolledDice")
  ) {
    throw new Error("Expected selected Halfling Luck raw d20 replay.");
  }
  return {
    unitId: speciesHalflingLuckUnitId,
    procedure: "rawD20RerollChoice",
    outcome: "damageRequested",
  };
}
