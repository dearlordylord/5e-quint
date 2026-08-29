import { describe, expect, test } from "vitest";
import guidanceInput from "../../surface/content/guidance.json";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { wizardSpellcasting } from "./battle-runtime.test-support.ts";
import type { BattleFill } from "./index.ts";
import {
  attackRollFill,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  savingThrowOutcomeFill,
  skillChoiceFill,
  spellAct,
  spellManufacturedMetalObjectTargetFill,
  spellTargetFill,
  spellTargetListFill,
  spellTouchedObjectTargetFill,
  spatialMeleeSpellAttackProxyPositionFill,
  spatialMeleeSpellAttackProxyTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  antimagicFieldUnitId,
  baneUnitId,
  blessUnitId,
  continualFlameUnitId,
  cureWoundsUnitId,
  falseLifeUnitId,
  guidanceUnitId,
  heatMetalUnitId,
  massCureWoundsUnitId,
  spellCasterId,
  spellTargetId,
  spiritualWeaponUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  battleAreaId,
  battleObjectId,
  battleTablePositionId,
  combatantId,
  discoverBattleActs,
  endTurn,
  movementFeet,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";

// RAW traces for the focused targeting rules:
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Targets
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Antimagic-Field
// - .references/srd-5.2.1/Spells/Descriptions-M-P.md#Mass-Cure-Wounds
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Spiritual-Weapon

describe("spell target-selection public boundaries", () => {
  test("self-targeting False Life rejects a canonical creature-target fill from another spell", () => {
    const falseLifeSession = spellBattle({
      preparedSpells: [spellRecord(falseLifeUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 1 }],
    });
    const cureWoundsSession = spellBattle({
      preparedSpells: [spellRecord(cureWoundsUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      casterClassLevels: [{ className: "cleric", level: 1 }],
    });
    const falseLife = spellAct({
      session: falseLifeSession,
      spellId: falseLifeUnitId,
    });
    const cureWounds = spellAct({
      session: cureWoundsSession,
      spellId: cureWoundsUnitId,
    });
    const cureWoundsTarget = requireHole(
      cureWounds.initialHoles,
      "targetChoice",
    );

    expect(
      resolveBattleSubject({
        state: falseLifeSession.state,
        subject: falseLife.subject,
        fills: [
          spellTargetFill(
            cureWoundsTarget,
            cureWoundsUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Self-targeting scalar buff spells do not accept target fills.",
    });
  });

  test("Bless rejects duplicate targets and a canonical skill choice owned by Guidance", () => {
    const session = spellBattle({
      cantrips: [spellRecord(guidanceUnitId)],
      preparedSpells: [spellRecord(blessUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      casterClassLevels: [{ className: "cleric", level: 1 }],
    });
    const bless = spellAct({ session, spellId: blessUnitId });
    const blessTargets = requireHole(bless.initialHoles, "spellTargetList");
    const guidance = spellAct({ session, spellId: guidanceUnitId });
    const guidanceSkill = requireHole(guidance.initialHoles, "skillChoice");

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: bless.subject,
        fills: [
          spellTargetListFill(blessTargets, spellCasterId, blessUnitId, [
            spellTargetId,
            spellTargetId,
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Spell target list must not repeat a target.",
    });

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: bless.subject,
        fills: [
          spellTargetListFill(blessTargets, spellCasterId, blessUnitId, [
            spellTargetId,
          ]),
          skillChoiceFill(guidanceSkill, "stealth"),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "This roll modifier spell does not choose a skill.",
    });
  });

  test("a synthetic restricted skill choice rejects a different public skill value", () => {
    const syntheticGuidance = decodeSpellRecordForTest({
      ...structuredClone(guidanceInput),
      id: "synthetic_target_selection_skill_focus",
      name: "Synthetic Skill Focus",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic-target-selection-skill-focus",
      },
      mechanics: {
        ...guidanceInput.mechanics,
        operations: guidanceInput.mechanics.operations.map((operation) => ({
          ...operation,
          effect: {
            ...operation.effect,
            skillFilter: { kind: "choice", options: ["athletics"] },
          },
        })),
      },
    });
    const session = spellBattle({
      cantrips: [syntheticGuidance],
      spellSlots: [],
      casterClassLevels: [{ className: "cleric", level: 1 }],
    });
    const act = spellAct({ session, spellId: syntheticGuidance.id });
    const target = requireHole(act.initialHoles, "targetChoice");
    const skill = requireHole(act.initialHoles, "skillChoice");

    expect(skill.choices).toEqual(["athletics"]);
    expect(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            target,
            syntheticGuidance.id,
            spellCasterId,
            spellCasterId,
          ),
          skillChoiceFill(skill, "stealth"),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Roll modifier spell skill choice is not legal for this spell.",
    });
  });

  test("Bane reopens target selection when a replay retains only its later save fill", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(baneUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      casterClassLevels: [{ className: "cleric", level: 1 }],
    });
    const bane = spellAct({ session, spellId: baneUnitId });
    const targets = requireHole(bane.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(targets, spellCasterId, baneUnitId, [
      spellTargetId,
    ]);
    const save = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: bane.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: bane.subject,
        fills: [
          savingThrowOutcomeFill(save, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "spellTargetList" })],
    });
  });

  test("Mass Cure Wounds requires exact, distinct battle members in one Sphere", () => {
    const secondTargetId = combatantId("target-selection-area-second");
    const absentTargetId = combatantId("target-selection-area-absent");
    const session = spellBattle({
      preparedSpells: [spellRecord(massCureWoundsUnitId)],
      spellSlots: [{ spellLevel: 5, count: 1 }],
      casterClassLevels: [{ className: "cleric", level: 9 }],
      extraTargetIds: [secondTargetId],
    });
    const massCureWounds = spellAct({
      session,
      spellId: massCureWoundsUnitId,
    });
    const targetList = requireHole(
      massCureWounds.initialHoles,
      "spellTargetList",
    );
    const selectedTargets = [spellTargetId, secondTargetId] as const;
    const exactFill = spellTargetListFill(
      targetList,
      spellCasterId,
      massCureWoundsUnitId,
      selectedTargets,
    );
    const areaFact = exactFill.spatialFacts[0];
    if (areaFact?.kind !== "spellTargetsInPointOriginSphere") {
      throw new Error("Expected Mass Cure Wounds point-origin Sphere fact.");
    }

    for (const mismatchedAreaTargetIds of [
      [spellTargetId],
      [spellTargetId, spellTargetId],
    ] as const) {
      expect(
        resolveBattleSubject({
          state: session.state,
          subject: massCureWounds.subject,
          fills: [
            {
              ...exactFill,
              spatialFacts: [
                { ...areaFact, targetIds: mismatchedAreaTargetIds },
              ],
            },
          ],
        }),
      ).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
        message:
          "Area healing targets must share one selected point-origin Sphere.",
      });
    }

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: massCureWounds.subject,
        fills: [
          spellTargetListFill(targetList, spellCasterId, massCureWoundsUnitId, [
            spellTargetId,
            absentTargetId,
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell targets must be combatants within the selected spell's supported range.",
    });
  });

  test("object-target spells reject spatial facts for a different object", () => {
    const session = spellBattle({
      preparedSpells: [
        spellRecord(continualFlameUnitId),
        spellRecord(heatMetalUnitId),
      ],
      spellSlots: [{ spellLevel: 2, count: 2 }],
      casterClassLevels: [{ className: "druid", level: 3 }],
    });
    const selectedObjectId = battleObjectId("target-selection-object");
    const unrelatedObjectId = battleObjectId(
      "target-selection-unrelated-object",
    );

    const continualFlame = spellAct({
      session,
      spellId: continualFlameUnitId,
    });
    const continualFlameTarget = requireHole(
      continualFlame.initialHoles,
      "objectTargetChoice",
    );
    const touchedObjectFill = spellTouchedObjectTargetFill({
      hole: continualFlameTarget,
      objectId: selectedObjectId,
      spellId: continualFlameUnitId,
      casterId: spellCasterId,
    });
    const touchedObjectFact = touchedObjectFill.spatialFacts?.[0];
    if (touchedObjectFact?.kind !== "spellTouchedObjectTarget") {
      throw new Error("Expected Continual Flame touched-object fact.");
    }
    expect(
      resolveBattleSubject({
        state: session.state,
        subject: continualFlame.subject,
        fills: [
          {
            ...touchedObjectFill,
            spatialFacts: [
              { ...touchedObjectFact, objectId: unrelatedObjectId },
            ],
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Object light target does not satisfy the selected spell's object targeting requirements.",
    });

    const heatMetal = spellAct({ session, spellId: heatMetalUnitId });
    const heatMetalTarget = requireHole(
      heatMetal.initialHoles,
      "objectTargetChoice",
    );
    const manufacturedObjectFill = spellManufacturedMetalObjectTargetFill({
      hole: heatMetalTarget,
      objectId: selectedObjectId,
      spellId: heatMetalUnitId,
      casterId: spellCasterId,
    });
    const manufacturedObjectFact = manufacturedObjectFill.spatialFacts?.[0];
    if (manufacturedObjectFact?.kind !== "spellManufacturedMetalObjectTarget") {
      throw new Error("Expected Heat Metal manufactured-object fact.");
    }
    expect(
      resolveBattleSubject({
        state: session.state,
        subject: heatMetal.subject,
        fills: [
          {
            ...manufacturedObjectFill,
            spatialFacts: [
              { ...manufacturedObjectFact, objectId: unrelatedObjectId },
            ],
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Object-contact damage requires a visible manufactured metal object within spell range.",
    });
  });

  test("Bless cannot target a creature inside a publicly established Antimagic Field", () => {
    const insideAuraId = combatantId("target-selection-antimagic-inside");
    const session = spellBattle({
      preparedSpells: [spellRecord(antimagicFieldUnitId)],
      spellSlots: [{ spellLevel: 8, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 15 }],
      targetClassLevels: [{ className: "cleric", level: 1 }],
      targetSpellcasting: {
        ...wizardSpellcasting({
          cantrips: [],
          preparedSpells: [spellRecord(blessUnitId)],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "cleric",
          abilityModifier: 3,
        },
      },
      extraTargetIds: [insideAuraId],
    });
    const antimagicField = spellAct({
      session,
      spellId: antimagicFieldUnitId,
      slotLevel: 8,
    });
    const area = requireHole(antimagicField.initialHoles, "spellAreaChoice");
    const field = resolveBattleSubject({
      state: session.state,
      subject: antimagicField.subject,
      fills: [
        {
          kind: "spellAreaChoice",
          holeId: area.holeId,
          value: {
            kind: "magicSuppressionSelfEmanation",
            areaId: battleAreaId("target-selection-antimagic-field"),
            auraMembership: {
              kind: "magicSuppressionEmanationMembership",
              originIncluded: true,
              nonOriginCombatantIds: [insideAuraId],
            },
            affectedOngoingSpellEffects: [],
          },
        },
      ],
    });
    if (field.tag !== "resolved") {
      throw new Error("Expected Antimagic Field to resolve.");
    }
    const targetTurn = endTurn({
      state: field.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the Cleric's turn after Antimagic Field.");
    }
    const targetSession = battleRuntimeSessionForTest({
      ...session,
      state: targetTurn.state,
    });
    const bless = spellAct({ session: targetSession, spellId: blessUnitId });
    const targetList = requireHole(bless.initialHoles, "spellTargetList");

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: bless.subject,
        fills: [
          spellTargetListFill(targetList, spellTargetId, blessUnitId, [
            insideAuraId,
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Magical effects can't target or otherwise affect things inside an Antimagic Field aura.",
    });
  });

  test("Spiritual Weapon distinguishes cast placement from later repositioning", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(spiritualWeaponUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "cleric", level: 3 }],
    });
    const cast = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          spiritualWeaponUnitId &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
          "spatialMeleeSpellAttackProxy",
    );
    if (cast === undefined) {
      throw new Error("Expected Spiritual Weapon cast.");
    }
    const castForce = requireHole(
      cast.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const initialPositionId = battleTablePositionId(
      "target-selection-spiritual-weapon-initial",
    );
    const castForceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: castForce,
      positionId: initialPositionId,
    });
    const wrongCastMode = {
      ...castForceFill,
      value: {
        mode: "reposition",
        positionId: initialPositionId,
        moveDistanceFeet: movementFeet(0),
      },
    } satisfies Extract<
      BattleFill,
      { readonly kind: "spatialMeleeSpellAttackProxyPosition" }
    >;

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: cast.subject,
        fills: [wrongCastMode],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "spatial melee spell-attack proxy cast requires a cast force-position fill.",
    });

    const castTarget = requireHole(cast.initialHoles, "targetChoice");
    const castTargetFill = spatialMeleeSpellAttackProxyTargetFill(
      castTarget,
      spiritualWeaponUnitId,
      spellCasterId,
      spellTargetId,
      initialPositionId,
    );
    const castAttack = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: cast.subject,
        fills: [castForceFill, castTargetFill],
      }),
      "attackRoll",
    );
    const castResolved = resolveBattleSubject({
      state: session.state,
      subject: cast.subject,
      fills: [
        castForceFill,
        castTargetFill,
        attackRollFill(castAttack, { total: 3, naturalD20: 2 }),
      ],
    });
    if (castResolved.tag !== "resolved") {
      throw new Error("Expected Spiritual Weapon miss to resolve.");
    }
    const targetTurn = endTurn({
      state: castResolved.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn after Spiritual Weapon cast.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected caster turn for Spiritual Weapon repeat.");
    }
    const repeatSession = battleRuntimeSessionForTest({
      ...session,
      state: casterTurn.state,
    });
    const repeat = discoverBattleActs(repeatSession).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          spiritualWeaponUnitId &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
          "spatialMeleeSpellAttackProxy",
    );
    if (repeat === undefined) {
      throw new Error("Expected Spiritual Weapon repeat attack.");
    }
    const repeatForce = requireHole(
      repeat.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const movedPositionId = battleTablePositionId(
      "target-selection-spiritual-weapon-moved",
    );
    const repeatForceFill = spatialMeleeSpellAttackProxyPositionFill({
      hole: repeatForce,
      positionId: movedPositionId,
    });
    const wrongRepeatMode = {
      ...repeatForceFill,
      value: {
        mode: "cast",
        positionId: movedPositionId,
        distanceFromCasterFeet: movementFeet(0),
      },
    } satisfies Extract<
      BattleFill,
      { readonly kind: "spatialMeleeSpellAttackProxyPosition" }
    >;

    expect(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: repeat.subject,
        fills: [wrongRepeatMode],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "spatial melee spell-attack proxy repeat attack requires a reposition fill.",
    });
  });
});
