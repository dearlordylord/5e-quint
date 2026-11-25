// KERNEL-COVERAGE: parity-witness BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL
// Heroic Inspiration on every D20 Test the engine asks for: saving throws,
// Concentration saves, ability checks and Death Saving Throws (SRD 5.2.1
// Rules Glossary, "Heroic Inspiration"), alongside a natural-1 reroll on the
// same roll (ASSUMPTIONS.md A55).
import {
  HEROIC_INSPIRATION_AVAILABLE,
  NO_HEROIC_INSPIRATION,
  type HeroicInspiration,
} from "@dnd/shared/game-facts";
import { d20Roll, DieRollResult, difficultyClass } from "@dnd/shared/types";
import { combatantId } from "./identity.ts";
import * as Result from "effect/Result";
import { describe, expect, test } from "vitest";

import grantedAreaSaveDamageActionInput from "../../surface/content/dragons_breath.json";
import {
  abilityCheckFill,
  characterBattleFeatureInitForTest,
  characterSeed,
  deathSavingThrowFill,
  endTurn,
  fighterId,
  findHole,
  goblinId,
  hidePrerequisites,
  requireResolved,
  resolveBattleSubject,
  spellRecord as catalogSpellRecord,
  startBattleRight,
  startBattleSessionRight,
  statBlockCreatureInit,
  wizardSpellcasting,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  type BattleD20TestRoll,
  type BattleHole,
  type BattleRolledSavingThrowOutcome,
} from "./battle-state-execution.ts";
import { HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE } from "./battle-reducer/heroic-inspiration-reroll.ts";
import {
  endBattleRuntimeTurn,
  resolveBattleRuntimeSubject,
} from "./battle-session-execution.ts";
import { requireActorAdmittedSpellActForTest } from "./spell-effect-fixture.test-support.ts";
import {
  baneUnitId,
  dragonsBreathUnitId,
  viciousMockeryUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  bonusSpellAct,
  damageTypeChoiceFill,
  knownWillingSpellTargetListFill,
  savingThrowOutcomeFill,
  spellAct,
  spellTargetListFill,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleId,
  battleUnitRefWithSupportProfiles,
  decodeUnitRecordSync,
  discoverBattleActCandidates,
  speciesHalflingLuckUnitId,
  spellCasterId,
  spellSlotInvocationRef,
  spellTargetId,
  unitLibrary,
  type BattleFill,
  type BattleRuntimeSession,
  type CombatantId,
  type SpellRecord,
} from "./unit-profile-admission.test-support.ts";

describe("Heroic Inspiration on saving throws", () => {
  test("a target with Heroic Inspiration is asked again after its saving throw", () => {
    const { state, subject, targetSelection, savingThrow } = viciousMockerySave(
      HEROIC_INSPIRATION_AVAILABLE,
    );

    const asked = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        targetSelection,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false, naturalD20: 5 },
        ]),
      ],
    });

    expect(requireResultHole(asked, "savingThrowOutcome")).toMatchObject({
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });
  });

  test("a target without Heroic Inspiration is not offered the reroll", () => {
    const { state, subject, targetSelection, savingThrow } = viciousMockerySave(
      NO_HEROIC_INSPIRATION,
    );

    expect(savingThrow).not.toHaveProperty("heroicInspirationRerolls");
    expect(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetSelection,
          savingThrowOutcomeFill(savingThrow, [
            {
              targetId: spellTargetId,
              succeeded: false,
              naturalD20: 5,
              d20TestRerolls: [declineReroll()],
            },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE,
    });
  });

  test("a reroll that succeeds stands, and spends the target's Heroic Inspiration", () => {
    const { state, subject, targetSelection, savingThrow } = viciousMockerySave(
      HEROIC_INSPIRATION_AVAILABLE,
    );

    const saved = requireResolved(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetSelection,
          savingThrowOutcomeFill(savingThrow, [
            {
              targetId: spellTargetId,
              succeeded: false,
              naturalD20: 5,
              d20TestRerolls: [rerollOutcome({ succeeded: true, d20: 15 })],
            },
          ]),
        ],
      }),
    );

    expect(hp(saved.state, spellTargetId)).toBe(hp(state.state, spellTargetId));
    expect(saved.state.subjectResolutionPhase).toEqual({
      kind: "subjectSelection",
    });
    expect(heroicInspiration(saved.state, spellTargetId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );
  });

  test("declining keeps the failed save and the Heroic Inspiration", () => {
    const { state, subject, targetSelection, savingThrow } = viciousMockerySave(
      HEROIC_INSPIRATION_AVAILABLE,
    );

    const failed = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        targetSelection,
        savingThrowOutcomeFill(savingThrow, [
          {
            targetId: spellTargetId,
            succeeded: false,
            naturalD20: 5,
            d20TestRerolls: [declineReroll()],
          },
        ]),
      ],
    });

    requireResultHole(failed, "rolledDice");
    if (failed.tag !== "needsHoles") throw new Error("Expected damage hole.");
    expect(heroicInspiration(failed.state, spellTargetId)).toEqual(
      HEROIC_INSPIRATION_AVAILABLE,
    );
  });
});

describe("Heroic Inspiration on a save several targets make", () => {
  test("each target decides for its own roll, and only one with Heroic Inspiration is asked", () => {
    const inspiredTargetId = combatantId("heroic-inspiration-second-target");
    const session = spellBattle({
      preparedSpells: [spellRecord(baneUnitId)],
      casterClassLevels: [{ className: "cleric", level: 1 }],
      extraTargetIds: [inspiredTargetId],
      extraTargetHeroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
    });
    const act = spellAct({ session, spellId: baneUnitId });
    const targets = spellTargetListFill(
      requireHole(act.initialHoles, "spellTargetList"),
      spellCasterId,
      baneUnitId,
      [spellTargetId, inspiredTargetId],
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targets],
      }),
      "savingThrowOutcome",
    );
    const saves = (
      inspired: Parameters<typeof savingThrowOutcomeFill>[1][number],
    ) =>
      savingThrowOutcomeFill(savingThrow, [
        { targetId: spellTargetId, succeeded: false, naturalD20: 5 },
        inspired,
      ]);

    expect(
      requireResultHole(
        resolveBattleSubject({
          state: session.state,
          subject: act.subject,
          fills: [
            targets,
            saves({
              targetId: inspiredTargetId,
              succeeded: false,
              naturalD20: 4,
            }),
          ],
        }),
        "savingThrowOutcome",
      ),
    ).toMatchObject({
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });
    expect(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          targets,
          savingThrowOutcomeFill(savingThrow, [
            {
              targetId: spellTargetId,
              succeeded: false,
              naturalD20: 5,
              d20TestRerolls: [declineReroll()],
            },
            {
              targetId: inspiredTargetId,
              succeeded: false,
              naturalD20: 4,
              d20TestRerolls: [declineReroll()],
            },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: HEROIC_INSPIRATION_REROLL_UNAVAILABLE_MESSAGE,
    });
    const resolved = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          targets,
          saves({
            targetId: inspiredTargetId,
            succeeded: false,
            naturalD20: 4,
            d20TestRerolls: [rerollOutcome({ succeeded: true, d20: 19 })],
          }),
        ],
      }),
    );

    expect(heroicInspiration(resolved.state, inspiredTargetId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects.length,
    ).toBeGreaterThan(
      requireCombatant(resolved.state, inspiredTargetId).activeEffects.length,
    );
  });
});

describe("Heroic Inspiration on an area save, its damage and Concentration", () => {
  test("a rerolled exhale save halves the damage, and the Concentration save is not offered a spent reroll", () => {
    const exhale = exhaleSave({
      casterHeroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
    });
    const save = exhaleSaveFill(exhale.saveHole, {
      succeeded: false,
      d20TestRoll: single(8),
      d20TestRerolls: [rerollOutcome({ succeeded: true, d20: 16 })],
    });
    const needsDamage = resolveBattleSubject({
      state: exhale.state,
      subject: exhale.subject,
      fills: [save],
    });
    const damage = damageRollFillWithGroups(
      requireResultHole(needsDamage, "rolledDice"),
      [[3, 3, 3]],
    );
    const needsConcentration = resolveBattleSubject({
      state: exhale.state,
      subject: exhale.subject,
      fills: [save, damage],
    });
    const concentration = requireResultHole(
      needsConcentration,
      "concentrationSavingThrow",
    );

    expect(concentration).not.toHaveProperty("heroicInspirationRerolls");
    const resolved = requireResolved(
      resolveBattleSubject({
        state: exhale.state,
        subject: exhale.subject,
        fills: [
          save,
          damage,
          {
            kind: "concentrationSavingThrow",
            holeId: concentration.holeId,
            value: { succeeded: true, d20TestRoll: single(12) },
          },
        ],
      }),
    );
    expect(hp(resolved.state, spellCasterId)).toBe(
      hp(exhale.state, spellCasterId) - 4,
    );
    expect(heroicInspiration(resolved.state, spellCasterId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );
  });

  test("a Concentration save rerolled with Heroic Inspiration keeps Concentration", () => {
    const exhale = exhaleSave({
      casterHeroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
    });
    const save = exhaleSaveFill(exhale.saveHole, {
      succeeded: false,
      d20TestRoll: single(8),
      d20TestRerolls: [declineReroll()],
    });
    const needsDamage = resolveBattleSubject({
      state: exhale.state,
      subject: exhale.subject,
      fills: [save],
    });
    const damage = damageRollFillWithGroups(
      requireResultHole(needsDamage, "rolledDice"),
      [[3, 3, 3]],
    );
    const concentration = requireResultHole(
      resolveBattleSubject({
        state: exhale.state,
        subject: exhale.subject,
        fills: [save, damage],
      }),
      "concentrationSavingThrow",
    );
    const concentrationFill = (
      value: Extract<
        BattleFill,
        { readonly kind: "concentrationSavingThrow" }
      >["value"],
    ): BattleFill => ({
      kind: "concentrationSavingThrow",
      holeId: concentration.holeId,
      value,
    });

    expect(
      requireResultHole(
        resolveBattleSubject({
          state: exhale.state,
          subject: exhale.subject,
          fills: [
            save,
            damage,
            concentrationFill({ succeeded: false, d20TestRoll: single(4) }),
          ],
        }),
        "concentrationSavingThrow",
      ),
    ).toMatchObject({
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });
    const kept = requireResolved(
      resolveBattleSubject({
        state: exhale.state,
        subject: exhale.subject,
        fills: [
          save,
          damage,
          concentrationFill({
            succeeded: false,
            d20TestRoll: single(4),
            d20TestRerolls: [rerollOutcome({ succeeded: true, d20: 17 })],
          }),
        ],
      }),
    );
    expect(kept.state.subjectResolutionPhase).toEqual({
      kind: "subjectSelection",
    });
    expect(hp(kept.state, spellCasterId)).toBe(
      hp(exhale.state, spellCasterId) - 9,
    );
    expect(requireCombatant(kept.state, spellCasterId).concentration).not.toBe(
      null,
    );
    expect(heroicInspiration(kept.state, spellCasterId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );
  });

  test("an exhale save rerolled from a natural 1 halves the damage (the reroll stands)", () => {
    const unit = unitLibrary.requireUnit(speciesHalflingLuckUnitId);
    const unitRef = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: unit.id },
      unit,
    });
    if (Result.isFailure(unitRef)) throw new Error(unitRef.failure.message);
    const exhale = exhaleSave({
      casterUnitRefs: [unitRef.success],
      casterUnitFeatures: [characterBattleFeatureInitForTest(unit)],
    });
    const save = exhaleSaveFill(exhale.saveHole, {
      succeeded: false,
      d20TestRoll: single(1),
      d20TestRerolls: [
        {
          kind: "reroll",
          effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
          replacement: { succeeded: true, d20TestRoll: single(16) },
        },
      ],
    });
    const needsDamage = resolveBattleSubject({
      state: exhale.state,
      subject: exhale.subject,
      fills: [save],
    });
    const damage = damageRollFillWithGroups(
      requireResultHole(needsDamage, "rolledDice"),
      [[3, 3, 3]],
    );
    const concentration = requireResultHole(
      resolveBattleSubject({
        state: exhale.state,
        subject: exhale.subject,
        fills: [save, damage],
      }),
      "concentrationSavingThrow",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state: exhale.state,
        subject: exhale.subject,
        fills: [
          save,
          damage,
          {
            kind: "concentrationSavingThrow",
            holeId: concentration.holeId,
            value: { succeeded: true, d20TestRoll: single(12) },
          },
        ],
      }),
    );

    expect(hp(resolved.state, spellCasterId)).toBe(
      hp(exhale.state, spellCasterId) - 4,
    );
  });
});

describe("Heroic Inspiration on ability checks", () => {
  test("a rerolled check commits the new total and spends Heroic Inspiration", () => {
    const { state, subject, check } = hideCheck({
      heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
    });

    expect(
      requireResultHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [abilityCheckFill(check, { total: 7, naturalD20: 3 })],
        }),
        "abilityCheck",
      ),
    ).toMatchObject({
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });
    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          abilityCheckFill(check, {
            total: 7,
            naturalD20: 3,
            d20TestRerolls: [rerollRoll({ total: 18, d20: 14 })],
          }),
        ],
      }),
    ).state;

    expect(hidden.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(18),
    });
    expect(hidden.subjectResolutionPhase).toEqual({ kind: "subjectSelection" });
    expect(heroicInspiration(hidden, fighterId)).toEqual(NO_HEROIC_INSPIRATION);
  });

  test("Halfling Luck then Heroic Inspiration reroll the same check in turn", () => {
    const unit = unitLibrary.requireUnit(speciesHalflingLuckUnitId);
    const unitRef = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: unit.id },
      unit,
    });
    if (Result.isFailure(unitRef)) throw new Error(unitRef.failure.message);
    const { state, subject, check } = hideCheck({
      heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
      characterUnitRefs: [unitRef.success],
      unitFeatures: [characterBattleFeatureInitForTest(unit)],
    });
    const naturalOne = {
      kind: "reroll",
      effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
      replacement: { total: 6, d20TestRoll: single(2) },
    } as const;

    const asked = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          abilityCheckFill(check, {
            total: 5,
            naturalD20: 1,
            d20TestRerolls: [naturalOne],
          }),
        ],
      }),
      "abilityCheck",
    );
    expect(asked).toMatchObject({
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });
    expect(asked).not.toHaveProperty("d20TestNaturalOneRerolls");
    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          abilityCheckFill(check, {
            total: 5,
            naturalD20: 1,
            d20TestRerolls: [naturalOne, rerollRoll({ total: 18, d20: 14 })],
          }),
        ],
      }),
    ).state;

    expect(hidden.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(18),
    });
    expect(hidden.subjectResolutionPhase).toEqual({ kind: "subjectSelection" });
    expect(heroicInspiration(hidden, fighterId)).toEqual(NO_HEROIC_INSPIRATION);
  });
});

describe("Heroic Inspiration on Death Saving Throws", () => {
  test("a rerolled 20 regains a Hit Point and spends Heroic Inspiration", () => {
    const state = startBattleRight({
      battleId: battleId("heroic-inspiration-death-save"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: spellTargetId,
          displayName: "Dying Hero",
          initiative: 10,
          currentHp: 0,
          attack: null,
          heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
        }),
      ],
    });
    const deathSave = requireResultHole(
      endTurn({ state, actorId: fighterId }),
      "deathSavingThrow",
    );

    expect(
      requireResultHole(
        endTurn({
          state,
          actorId: fighterId,
          fills: [deathSavingThrowFill(deathSave, 6)],
        }),
        "deathSavingThrow",
      ),
    ).toMatchObject({
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });
    const declined = requireResolved(
      endTurn({
        state,
        actorId: fighterId,
        fills: [
          deathSavingThrowFill(deathSave, {
            roll: 6,
            d20TestRerolls: [declineReroll()],
          }),
        ],
      }),
    );
    expect(hp(declined.state, spellTargetId)).toBe(0);
    expect(heroicInspiration(declined.state, spellTargetId)).toEqual(
      HEROIC_INSPIRATION_AVAILABLE,
    );
    const revived = requireResolved(
      endTurn({
        state,
        actorId: fighterId,
        fills: [
          deathSavingThrowFill(deathSave, {
            roll: 6,
            d20TestRerolls: [
              {
                kind: "reroll",
                effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
                replacement: d20Roll(20),
              },
            ],
          }),
        ],
      }),
    );
    expect(hp(revived.state, spellTargetId)).toBe(1);
    expect(heroicInspiration(revived.state, spellTargetId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );
  });
});

describe("Heroic Inspiration on a repeat save at the end of a turn", () => {
  test("a held target rerolls its end-of-turn save and the condition ends", () => {
    const baseSession = startBattleSessionRight({
      battleId: battleId("heroic-inspiration-end-turn-save"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: null,
          classLevels: [{ className: "wizard", level: 3 }],
          spellcasting: wizardSpellcasting({
            preparedSpells: [catalogSpellRecord("hold_person")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Held Hero",
          initiative: 10,
          attack: null,
          heroicInspiration: HEROIC_INSPIRATION_AVAILABLE,
        }),
      ],
    });
    const holdAct = requireActorAdmittedSpellActForTest({
      session: baseSession,
      actorId: fighterId,
      subjectTag: "actionSpell",
      invocationRef: spellSlotInvocationRef(
        "hold_person",
        2,
        "saveGatedCondition",
      ),
    });
    const holdTargetFill = spellTargetListFill(
      findHole(holdAct.initialHoles, "spellTargetList"),
      fighterId,
      "hold_person",
      [goblinId],
    );
    const awaitingSave = resolveBattleRuntimeSubject({
      session: baseSession,
      subject: holdAct.subject,
      fills: [holdTargetFill],
    });
    if (
      awaitingSave.tag !== "needsHoles" ||
      awaitingSave.envelope.frontier.kind !== "holes"
    ) {
      throw new Error("Expected Hold Person's initial save.");
    }
    const held = resolveBattleRuntimeSubject({
      session: baseSession,
      subject: holdAct.subject,
      fills: [
        holdTargetFill,
        savingThrowOutcomeFill(
          findHole(awaitingSave.envelope.frontier.holes, "savingThrowOutcome"),
          [{ targetId: goblinId, succeeded: false, withoutRoll: true }],
        ),
      ],
    });
    if (held.tag !== "resolved") throw new Error("Expected Hold Person.");
    const targetTurn = endBattleRuntimeTurn({
      session: held.session,
      actorId: fighterId,
    });
    if (targetTurn.tag !== "resolved") throw new Error("Expected a turn.");
    const firstRepeat = endBattleRuntimeTurn({
      session: targetTurn.session,
      actorId: goblinId,
    });
    if (
      firstRepeat.tag !== "needsHoles" ||
      firstRepeat.envelope.frontier.kind !== "holes"
    ) {
      throw new Error("Expected Hold Person's repeat save.");
    }
    const repeatSave = findHole(
      firstRepeat.envelope.frontier.holes,
      "savingThrowOutcome",
    );
    const repeatFill = (
      outcome: Omit<
        Parameters<typeof savingThrowOutcomeFill>[1][number],
        "targetId"
      >,
    ) =>
      savingThrowOutcomeFill(repeatSave, [
        { targetId: goblinId, ...outcome } as Parameters<
          typeof savingThrowOutcomeFill
        >[1][number],
      ]);

    const asked = endBattleRuntimeTurn({
      session: targetTurn.session,
      actorId: goblinId,
      fills: [repeatFill({ succeeded: false, naturalD20: 6 })],
    });
    if (
      asked.tag !== "needsHoles" ||
      asked.envelope.frontier.kind !== "holes"
    ) {
      throw new Error("Expected the repeat save to be asked again.");
    }
    expect(
      findHole(asked.envelope.frontier.holes, "savingThrowOutcome"),
    ).toMatchObject({
      heroicInspirationRerolls: [
        { effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND },
      ],
    });
    const freed = endBattleRuntimeTurn({
      session: targetTurn.session,
      actorId: goblinId,
      fills: [
        repeatFill({
          succeeded: false,
          naturalD20: 6,
          d20TestRerolls: [rerollOutcome({ succeeded: true, d20: 18 })],
        }),
      ],
    });
    if (freed.tag !== "resolved") {
      throw new Error(`Expected the repeat save to resolve, got ${freed.tag}.`);
    }
    expect(
      requireCombatant(targetTurn.session.state, goblinId).conditions,
    ).toMatchObject({ paralyzed: true });
    expect(
      requireCombatant(freed.session.state, goblinId).conditions,
    ).not.toMatchObject({ paralyzed: true });
    expect(heroicInspiration(freed.session.state, goblinId)).toEqual(
      NO_HEROIC_INSPIRATION,
    );
    expect(freed.session.state.subjectResolutionPhase).toEqual({
      kind: "subjectSelection",
    });
  });
});

function viciousMockerySave(targetHeroicInspiration: HeroicInspiration) {
  const state = spellBattle({
    cantrips: [spellRecord(viciousMockeryUnitId)],
    targetHeroicInspiration,
  });
  const act = spellAct({ session: state, spellId: viciousMockeryUnitId });
  const targetSelection = spellTargetFill(
    requireHole(act.initialHoles, "targetChoice"),
    viciousMockeryUnitId,
    spellCasterId,
    spellTargetId,
  );
  const savingThrow = requireResultHole(
    resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [targetSelection],
    }),
    "savingThrowOutcome",
  );
  return { state, subject: act.subject, targetSelection, savingThrow };
}

function exhaleSave(
  caster: Pick<
    Parameters<typeof spellBattle>[0],
    "casterHeroicInspiration" | "casterUnitRefs" | "casterUnitFeatures"
  >,
) {
  const session = spellBattle({
    preparedSpells: [grantedAreaSaveDamageActionSpell()],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    ...caster,
  });
  const ended = endTurn({
    state: castDragonsBreath(session),
    actorId: spellCasterId,
  });
  if (ended.tag !== "resolved") {
    throw new Error("Expected caster End Turn to resolve.");
  }
  const exhaleAct = discoverBattleActCandidates(ended.state).find(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      act.subject.command === "grantedAreaSaveDamageAction",
  );
  if (exhaleAct === undefined) {
    throw new Error("Expected Dragon's Breath exhale action.");
  }
  return {
    state: ended.state,
    subject: exhaleAct.subject,
    saveHole: requireHole(exhaleAct.initialHoles, "savingThrowOutcome"),
  };
}

function castDragonsBreath(session: BattleRuntimeSession): BattleState {
  const act = bonusSpellAct({
    session,
    spellId: dragonsBreathUnitId,
    slotLevel: 2,
  });
  return requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetListFill(
          requireHole(act.initialHoles, "spellTargetList"),
          spellCasterId,
          dragonsBreathUnitId,
          [spellTargetId],
        ),
        damageTypeChoiceFill(
          requireHole(act.initialHoles, "damageTypeChoice"),
          "lightning",
        ),
      ],
    }),
  ).state;
}

function grantedAreaSaveDamageActionSpell(): SpellRecord {
  const unit = decodeUnitRecordSync(grantedAreaSaveDamageActionInput);
  if (unit.kind !== "spell") {
    throw new Error("Expected Dragon's Breath fixture to decode as a spell.");
  }
  return unit;
}

function exhaleSaveFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcome: Omit<BattleRolledSavingThrowOutcome, "targetId">,
): BattleFill {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId: spellTargetId,
        affectedTargetIds: [spellCasterId],
      },
      outcomes: [{ targetId: spellCasterId, ...outcome }],
    },
  };
}

function hideCheck(
  fighter: Pick<
    Parameters<typeof characterSeed>[0],
    "heroicInspiration" | "characterUnitRefs" | "unitFeatures"
  >,
) {
  const state = startBattleRight({
    battleId: battleId("heroic-inspiration-ability-check"),
    combatants: [
      characterSeed({ initiative: 20, ...fighter }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
    hidePrerequisites: hidePrerequisites([
      [fighterId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
    ]),
  });
  const subject = {
    tag: "action",
    actorId: fighterId,
    action: "hide",
  } satisfies BattleSubject;
  const check = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "abilityCheck",
  );
  return { state, subject, check };
}

function single(
  d20: number,
): Extract<BattleD20TestRoll, { readonly tag: "single" }> {
  return { tag: "single", naturalD20: DieRollResult(d20) };
}

function rerollOutcome(input: {
  readonly succeeded: boolean;
  readonly d20: number;
}) {
  return {
    kind: "reroll",
    effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
    replacement: { succeeded: input.succeeded, d20TestRoll: single(input.d20) },
  } as const;
}

function rerollRoll(input: { readonly total: number; readonly d20: number }) {
  return {
    kind: "reroll",
    effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
    replacement: { total: input.total, d20TestRoll: single(input.d20) },
  } as const;
}

function declineReroll() {
  return {
    kind: "decline",
    effectKind: HEROIC_INSPIRATION_REROLL_EFFECT_KIND,
  } as const;
}

function hp(state: BattleState, id: CombatantId): number {
  return Number(state.combatants.get(id)?.hp);
}

function heroicInspiration(
  state: BattleState,
  id: CombatantId,
): HeroicInspiration | undefined {
  const creature = state.combatants.get(id);
  return creature?.origin.kind === "character"
    ? creature.origin.heroicInspiration
    : undefined;
}
