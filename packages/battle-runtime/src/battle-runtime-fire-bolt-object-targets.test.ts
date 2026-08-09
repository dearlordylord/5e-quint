import { describe, expect, test } from "vitest";
import {
  armorClass,
  attackRollFill,
  battleId,
  battleObjectId,
  battleProcedureExecutionRefForSpellHoleForTest,
  characterSeed,
  damageAmount,
  damageRollFillWithGroups,
  discoverBattleActCandidates,
  endTurn,
  findAct,
  findHole,
  Hp,
  magicSubject,
  movementFeet,
  objectTargetFill,
  requireHole,
  requireResolved,
  requireCharacterSpellProcedureRefForTest,
  resolveBattleSubject,
  skeletonCreatureInit,
  skeletonId,
  cantripSpellInvocationRef,
  spellRecord,
  startBattleSessionRight,
  wizardId,
  wizardSpellcasting,
  targetFill,
} from "./battle-runtime.test-support.ts";
import { resolveReadiedFireBoltObjectScenario } from "./readied-object-spell.test-support.ts";

describe("battle runtime: Fire Bolt object targets", () => {
  test("a readied Fire Bolt exposes both creature and object target holes on release", () => {
    const { skeletonTurn } = resolveReadiedFireBoltObjectScenario({
      battleIdValue: battleId("battle-readied-fire-bolt-object-targets"),
    });
    const release = discoverBattleActCandidates(skeletonTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "releaseReadiedSpell" &&
        candidate.subject.readiedSpellCasterId === wizardId,
    );

    expect(release?.initialHoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "targetChoice" }),
        expect.objectContaining({ kind: "objectTargetChoice" }),
      ]),
    );
  });

  test("a readied Fire Bolt releases against an object without a second cast spend", () => {
    const scenario = resolveReadiedFireBoltObjectScenario({
      battleIdValue: battleId("battle-readied-fire-bolt-object-release"),
    });
    const {
      awaitingRelease,
      completed,
      objectId,
      objectTarget,
      releaseStart,
      releaseSubject,
      resumedAttack,
    } = scenario;
    expect(awaitingRelease).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "attackHit" } },
    });
    expect(releaseStart).toMatchObject({
      tag: "needsHoles",
      holes: expect.arrayContaining([
        expect.objectContaining({ kind: "targetChoice" }),
        expect.objectContaining({ kind: "objectTargetChoice" }),
      ]),
    });
    const creatureHole = findHole(releaseStart.holes, "targetChoice");
    expect(
      resolveBattleSubject({
        state: releaseStart.state,
        subject: releaseSubject,
        fills: [objectTarget, targetFill(creatureHole, skeletonId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Readied spell target must choose either one combatant or one object, not both.",
    });

    expect(resumedAttack).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
      snapshot: {
        pendingInterrupt: null,
        readiedResponses: { spells: [] },
      },
    });
    expect(completed).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          rolledDamage: damageAmount(9),
          effectiveDamage: damageAmount(9),
          destroyed: true,
        },
      ],
      objectIgnitions: [
        {
          kind: "startsBurning",
          objectId,
          sourceCombatantId: wizardId,
        },
      ],
    });
    expect(
      completed.objectDamages?.filter(
        (outcome) => outcome.objectId === objectId,
      ),
    ).toHaveLength(1);
    expect(
      completed.objectIgnitions?.filter(
        (outcome) => outcome.objectId === objectId,
      ),
    ).toHaveLength(1);
    expect(
      resumedAttack.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toEqual([]);
  });

  test("a readied single-target save spell exposes its target-selection hole on release", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-readied-single-target-save"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Cleric",
          initiative: 20,
          attack: null,
          classLevels: [{ className: "cleric", level: 1 }],
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [spellRecord("sacred_flame")],
              preparedSpells: [],
            }),
            sourceClassName: "cleric",
          },
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      cantripSpellInvocationRef("sacred_flame", "saveGatedDamage"),
    );
    const ready = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef,
          mode: { tag: "ready", trigger: "attackHit" },
        },
        fills: [],
      }),
    );
    const nextTurn = requireResolved(
      endTurn({ state: ready.state, actorId: wizardId }),
    );
    const release = discoverBattleActCandidates(nextTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "releaseReadiedSpell" &&
        candidate.subject.readiedSpellCasterId === wizardId,
    );

    expect(release?.initialHoles).toEqual([
      expect.objectContaining({ kind: "targetChoice" }),
    ]);
  });

  test("Fire Bolt object target requires ignition facts before resolving the object attack", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-fire-bolt-object-missing-ignition"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("fire_bolt")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = findAct(state, magicSubject("fire_bolt")).subject;
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );

    const result = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        objectTargetFill({
          hole: objectTarget,
          rangeFeet: movementFeet(120),
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell object target must include a matching table-supplied object ignition fact.",
    });
  });

  test("Fire Bolt applies cantrip-scaled Fire damage and ignites unattended flammable object hits", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-fire-bolt-object-hit"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("fire_bolt")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = findAct(state, magicSubject("fire_bolt")).subject;
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const objectId = battleObjectId("dry-training-dummy");
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      objectId,
      rangeFeet: movementFeet(120),
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(8) },
      spatialFacts: [
        {
          kind: "spellObjectTarget",
          casterId: wizardId,
          objectId,
          sourceProcedureRef:
            battleProcedureExecutionRefForSpellHoleForTest(objectTarget),
          rangeFeet: movementFeet(120),
          armorClass: armorClass(13),
          damageDisposition: { kind: "hitPoints", hitPoints: Hp(8) },
        },
        {
          kind: "spellObjectIgnition",
          casterId: wizardId,
          objectId,
          sourceProcedureRef:
            battleProcedureExecutionRefForSpellHoleForTest(objectTarget),
          disposition: { kind: "flammableUnattended" },
        },
      ],
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFillForObject,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      label: "Spell damage (2d10-fire)",
    });

    const result = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[4, 5]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          damageType: "fire",
          rolledDamage: damageAmount(9),
          effectiveDamage: damageAmount(9),
          priorHitPoints: Hp(8),
          nextHitPoints: Hp(0),
          destroyed: true,
        },
      ],
      objectIgnitions: [
        {
          kind: "startsBurning",
          objectId,
          sourceCombatantId: wizardId,
          sourceProcedureRef: expect.any(String),
        },
      ],
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
  });

  test("Fire Bolt object miss and non-igniting object hit do not emit object ignition outcomes", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-fire-bolt-object-no-ignition"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("fire_bolt")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = findAct(state, magicSubject("fire_bolt")).subject;
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const objectId = battleObjectId("training-object");
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      objectId,
      rangeFeet: movementFeet(120),
      damageDisposition: { kind: "tableResolved" },
      spatialFacts: [
        {
          kind: "spellObjectTarget",
          casterId: wizardId,
          objectId,
          sourceProcedureRef:
            battleProcedureExecutionRefForSpellHoleForTest(objectTarget),
          rangeFeet: movementFeet(120),
          armorClass: armorClass(13),
          damageDisposition: { kind: "tableResolved" },
        },
        {
          kind: "spellObjectIgnition",
          casterId: wizardId,
          objectId,
          sourceProcedureRef:
            battleProcedureExecutionRefForSpellHoleForTest(objectTarget),
          disposition: { kind: "wornOrCarried" },
        },
      ],
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );

    const miss = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 12, naturalD20: 7 }),
      ],
    });

    expect(miss).toMatchObject({ tag: "resolved" });
    expect("objectDamages" in requireResolved(miss)).toBe(false);
    expect("objectIgnitions" in requireResolved(miss)).toBe(false);

    const damage = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFillForObject,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const hit = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[6]]),
      ],
    });

    expect(hit).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "tableResolved",
          damageType: "fire",
          rolledDamage: damageAmount(6),
        },
      ],
    });
    expect("objectIgnitions" in requireResolved(hit)).toBe(false);
  });
});
