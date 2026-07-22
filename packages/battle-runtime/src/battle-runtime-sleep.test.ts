import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime-test-support.ts";
import { discoverBattleActCandidates } from "./index.ts";
import { describe, expect, test } from "vitest";
import {
  applyBattleHitPointDamage,
  armorClass,
  attackRollFill,
  attackTargetFill,
  battleAfterFailedSleepInitialSave,
  battleAfterGoblinFailedSleepRepeatSave,
  battleId,
  battleProcedureExecutionRefForTest,
  breakBattleConcentration,
  characterSeed,
  damageRollFill,
  damageRollFillWithGroups,
  endTurn,
  expendedLevelOneSlots,
  fighterAttackSubject,
  fighterId,
  findAct,
  goblinAttackSubject,
  goblinId,
  Hp,
  magicSubject,
  removeCondition,
  requireCharacterSpellProcedureRefForTest,
  requireElapsedHours,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  shakeAwakeGoblinFromSleep,
  skeletonCreatureInit,
  skeletonId,
  sleepShakeAwakeSubject,
  sleepShakeAwakeTargetFill,
  spellRecord,
  spellSlotInvocationRef,
  spellTargetAllocationFill,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";

describe("battle runtime: Sleep", () => {
  test("Sleep failed initial saves apply pending Incapacitated and spend cast resources", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-admission"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
        skeletonCreatureInit({ initiative: 8 }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Spell point-origin Sphere Saving Throw outcomes",
      ability: "wis",
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [goblinId, skeletonId],
              },
              outcomes: [{ targetId: goblinId, succeeded: false }],
            },
          },
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: [
          { combatantId: wizardId, concentrating: true },
          { combatantId: goblinId },
          { combatantId: skeletonId },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(result.state.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "sleepPendingRepeatSave",
          sourceProcedureRef: expect.any(String),
          sourceCombatantId: wizardId,
          save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
          repeatAt: { kind: "endOfTurn", combatantId: goblinId, round: 1 },
          expiresAt: { kind: "concentration", combatantId: wizardId },
        }),
      ],
    });
    expect(expendedLevelOneSlots(result, wizardId)).toBe(1);
  });

  test("Sleep failed initial save breaks affected target Concentration", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-admission-breaks-target-concentration"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
        }),
      ],
    });
    const base = session.state;
    const goblin = base.combatants.get(goblinId)!;
    const state = {
      ...base,
      combatants: new Map(base.combatants).set(goblinId, {
        ...goblin,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("mage_armor"),
          ),
          effectKind: "spellEffect",
        },
        activeEffects: [
          {
            kind: "spellBaseArmorClass",
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String("mage_armor"),
            ),
            sourceCombatantId: goblinId,
            base: armorClass(13),
            ability: "dex",
            expiresAt: {
              kind: "concentration",
              combatantId: goblinId,
              durationTicks: requireElapsedHours(8),
            },
            earlyEnds: [{ kind: "concentrationBroken" }],
          },
        ],
      }),
    } satisfies BattleState;
    const subject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(result.state.combatants.get(goblinId)).toMatchObject({
      concentration: null,
      conditions: expect.objectContaining({ directIncapacitated: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "sleepPendingRepeatSave",
          sourceProcedureRef: expect.any(String),
          sourceCombatantId: wizardId,
        }),
      ],
    });
  });

  test("Sleep self-target failed initial save immediately ends its own Concentration", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-self-target-breaks-concentration"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Observer",
          initiative: 10,
        }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [wizardId],
              },
              outcomes: [{ targetId: wizardId, succeeded: false }],
            },
          },
        ],
      }),
    );

    expect(result.state.combatants.get(wizardId)).toMatchObject({
      concentration: null,
      conditions: expect.not.objectContaining({ directIncapacitated: true }),
      activeEffects: [],
    });
    expect(expendedLevelOneSlots(result, wizardId)).toBe(1);
  });

  test("Sleep concentration break removes pending repeat saves before they can escalate", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-repeat-concentration-break"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
        }),
      ],
    });
    const state = session.state;
    const sleepSubject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: sleepSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: sleepSubject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;

    const broken = breakBattleConcentration(slept, wizardId);

    expect(broken.combatants.get(goblinId)).toMatchObject({
      conditions: expect.not.objectContaining({ directIncapacitated: true }),
      activeEffects: [],
    });
    const goblinTurn = requireResolved(
      endTurn({ state: broken, actorId: wizardId }),
    ).state;
    expect(endTurn({ state: goblinTurn, actorId: goblinId })).toMatchObject({
      tag: "resolved",
      state: {
        combatants: expect.any(Map),
      },
    });
  });

  test("Sleep repeat save is requested at the failed target's next end turn and success ends that target's effect", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-repeat-success"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
        }),
        skeletonCreatureInit({ initiative: 8 }),
      ],
    });
    const state = session.state;
    const sleepSubject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: sleepSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: sleepSubject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;

    const goblinTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    expect(goblinTurn.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: true }),
    });
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );
    expect(repeatSave).toMatchObject({
      label: "Repeat WIS save",
      ability: "wis",
      sleepRepeatSave: {
        targetId: goblinId,
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: wizardId,
        save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
      },
    });

    const repeated = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: true },
          ]),
        ],
      }),
    );

    expect(repeated.state.combatants.get(goblinId)).toMatchObject({
      conditions: expect.not.objectContaining({ directIncapacitated: true }),
      activeEffects: [],
    });
  });

  test("Sleep failed repeat save escalates pending Incapacitated to spell-owned Unconscious", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-repeat-failure"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
        }),
      ],
    });
    const state = session.state;
    const sleepSubject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: sleepSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: sleepSubject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );

    const repeated = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(repeated.state.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({
        unconscious: true,
        prone: true,
        directIncapacitated: false,
      }),
      activeEffects: [
        expect.objectContaining({
          kind: "sleepUnconscious",
          sourceProcedureRef: expect.any(String),
          sourceCombatantId: wizardId,
          expiresAt: { kind: "concentration", combatantId: wizardId },
        }),
      ],
    });
  });

  test("Sleep concentration break removes escalated Unconscious effects", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-unconscious-concentration-break"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
        }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );
    const repeated = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;

    const broken = breakBattleConcentration(repeated, wizardId);

    expect(broken.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({
        unconscious: false,
        prone: true,
      }),
      activeEffects: [],
    });
  });

  test("Sleep failed repeat save breaks affected target Concentration", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-repeat-failure-breaks-concentration"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
        }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurnBase = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const goblin = goblinTurnBase.combatants.get(goblinId)!;
    const goblinTurn = {
      ...goblinTurnBase,
      combatants: new Map(goblinTurnBase.combatants).set(goblinId, {
        ...goblin,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("mage_armor"),
          ),
          effectKind: "spellEffect",
        },
        activeEffects: [
          ...goblin.activeEffects,
          {
            kind: "spellBaseArmorClass",
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String("mage_armor"),
            ),
            sourceCombatantId: goblinId,
            base: armorClass(13),
            ability: "dex",
            expiresAt: {
              kind: "concentration",
              combatantId: goblinId,
              durationTicks: requireElapsedHours(8),
            },
            earlyEnds: [{ kind: "concentrationBroken" }],
          },
        ],
      }),
    } satisfies BattleState;
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );

    const repeated = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(repeated.state.combatants.get(goblinId)).toMatchObject({
      concentration: null,
      conditions: expect.objectContaining({ unconscious: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "sleepUnconscious",
          sourceProcedureRef: expect.any(String),
          sourceCombatantId: wizardId,
        }),
      ],
    });
  });

  test("Sleep pending effect ends when the target takes damage from a non-caster", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-pending-damage-cleanup"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ initiative: 15 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Target",
          initiative: 10,
          currentHp: 20,
          maxHp: 20,
        }),
      ],
    });
    const state = session.state;
    const sleepSubject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: sleepSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: sleepSubject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: fighterId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const subject = goblinAttackSubject(goblinTurn, "Scimitar");
    const target = requireHole(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
      "targetChoice",
    );
    const attack = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [attackTargetFill(target, goblinId, fighterId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          attackTargetFill(target, goblinId, fighterId),
          attackRollFill(attack, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const damaged = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          attackTargetFill(target, goblinId, fighterId),
          attackRollFill(attack, { total: 15, naturalD20: 10 }),
          damageRollFill(damage, 1),
        ],
      }),
    ).state;

    expect(damaged.combatants.get(fighterId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: false }),
      activeEffects: [],
    });
  });

  test("Sleep Unconscious ends on damage and leaves Prone", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-unconscious-damage-cleanup"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 15,
          currentHp: 20,
          maxHp: 20,
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Helper",
          initiative: 10,
        }),
      ],
    });
    const state = session.state;
    const sleepSubject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: sleepSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: sleepSubject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );
    const fighterTurn = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const subject = fighterAttackSubject(state);
    const target = requireHole(
      resolveBattleSubject({ state: fighterTurn, subject, fills: [] }),
      "targetChoice",
    );
    const attack = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [attackTargetFill(target, fighterId, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [
          attackTargetFill(target, fighterId, goblinId),
          attackRollFill(attack, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
          }),
        ],
      }),
      "rolledDice",
    );

    const damaged = requireResolved(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [
          attackTargetFill(target, fighterId, goblinId),
          attackRollFill(attack, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
          }),
          damageRollFill(damage, 1),
        ],
      }),
    ).state;

    expect(damaged.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({
        unconscious: false,
        prone: true,
      }),
      activeEffects: [],
    });
  });

  test("Sleep pending effect ends when the target takes spell damage", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-spell-damage-cleanup"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Magic Missile Caster",
          initiative: 15,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("magic_missile")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          currentHp: 20,
          maxHp: 20,
        }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const fighterTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const damageSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        fighterId,
        spellSlotInvocationRef("magic_missile", 1, "repeatedDamageAllocation"),
      ),
      mode: { tag: "cast" },
    };
    const targetAllocation = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject: damageSubject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject: damageSubject,
        fills: [
          spellTargetAllocationFill(
            targetAllocation,
            [{ targetId: goblinId, count: 3 }],
            fighterId,
          ),
        ],
      }),
      "rolledDice",
    );

    const damaged = requireResolved(
      resolveBattleSubject({
        state: fighterTurn,
        subject: damageSubject,
        fills: [
          spellTargetAllocationFill(
            targetAllocation,
            [{ targetId: goblinId, count: 3 }],
            fighterId,
          ),
          damageRollFillWithGroups(damage, [[1, 1, 1]]),
        ],
      }),
    ).state;

    expect(damaged.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: false }),
      activeEffects: [],
    });
  });

  test("Sleep damage cleanup ignores no-damage events and is idempotent", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-damage-cleanup-idempotent"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          currentHp: 20,
          maxHp: 20,
        }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const sleeping = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const sleepingTarget = sleeping.combatants.get(goblinId)!;

    const noDamage = applyBattleHitPointDamage({
      state: sleeping,
      target: sleepingTarget,
      damageAmount: 0,
      deathFailuresAtZeroHp: 1,
      damageSourceId: fighterId,
    });
    expect(noDamage.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: true }),
      activeEffects: [
        expect.objectContaining({ kind: "sleepPendingRepeatSave" }),
      ],
    });

    const damaged = applyBattleHitPointDamage({
      state: sleeping,
      target: sleepingTarget,
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: fighterId,
    });
    const damagedAgain = applyBattleHitPointDamage({
      state: damaged,
      target: damaged.combatants.get(goblinId)!,
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: fighterId,
    });

    expect(damagedAgain.combatants.get(goblinId)).toMatchObject({
      hp: Hp(18),
      conditions: expect.objectContaining({ directIncapacitated: false }),
      activeEffects: [],
    });
  });

  test("Sleep damage cleanup preserves unrelated Incapacitated and Unconscious sources", () => {
    const incapacitatedSession = startBattleSessionRight({
      battleId: battleId("battle-sleep-damage-cleanup-preserves-incapacitated"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          currentHp: 20,
          maxHp: 20,
          conditions: ["incapacitated"],
        }),
      ],
    });
    const incapacitatedState = incapacitatedSession.state;
    const incapacitatedSubject = findAct(
      incapacitatedSession,
      magicSubject("sleep"),
    ).subject;
    const incapacitatedSavingThrows = requireHole(
      resolveBattleSubject({
        state: incapacitatedState,
        subject: incapacitatedSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const sleptIncapacitated = requireResolved(
      resolveBattleSubject({
        state: incapacitatedState,
        subject: incapacitatedSubject,
        fills: [
          savingThrowOutcomeFill(incapacitatedSavingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const incapacitatedTarget = sleptIncapacitated.combatants.get(goblinId)!;
    const afterIncapacitatedDamage = applyBattleHitPointDamage({
      state: sleptIncapacitated,
      target: incapacitatedTarget,
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: fighterId,
    });

    expect(afterIncapacitatedDamage.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: true }),
      activeEffects: [],
    });

    const unconsciousSession = startBattleSessionRight({
      battleId: battleId("battle-sleep-damage-cleanup-preserves-unconscious"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          currentHp: 20,
          maxHp: 20,
          conditions: ["unconscious"],
        }),
      ],
    });
    const unconsciousState = unconsciousSession.state;
    const unconsciousSubject = findAct(
      unconsciousSession,
      magicSubject("sleep"),
    ).subject;
    const unconsciousSavingThrows = requireHole(
      resolveBattleSubject({
        state: unconsciousState,
        subject: unconsciousSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const sleptUnconscious = requireResolved(
      resolveBattleSubject({
        state: unconsciousState,
        subject: unconsciousSubject,
        fills: [
          savingThrowOutcomeFill(unconsciousSavingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: sleptUnconscious, actorId: wizardId }),
    ).state;
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );
    const repeated = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const unconsciousTarget = repeated.combatants.get(goblinId)!;
    const afterUnconsciousDamage = applyBattleHitPointDamage({
      state: repeated,
      target: unconsciousTarget,
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: fighterId,
    });

    expect(afterUnconsciousDamage.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ unconscious: true }),
      activeEffects: [],
    });
  });

  test("Sleep shake-awake spends an action and requires an adjacent target fact", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-shake-awake"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Helper",
          initiative: 15,
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
        }),
      ],
    });
    const state = session.state;
    const sleepSubject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: sleepSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: sleepSubject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const fighterTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const subject: Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "shakeAwakeFromSleep" }
    > = { tag: "action", actorId: fighterId, action: "shakeAwakeFromSleep" };
    const act = findAct(fighterTurn, subject);
    const target = act.initialHoles[0]!;

    expect(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [targetFill(target, goblinId, [])],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Sleep shake-awake target must be within 5 feet of the actor by table-supplied fact.",
    });

    const shaken = requireResolved(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [
          targetFill(target, goblinId, [
            {
              kind: "sleepShakeAwakeActorWithin5Feet",
              actorId: fighterId,
              targetId: goblinId,
            },
          ]),
        ],
      }),
    ).state;

    expect(shaken.currentTurnResources.actionResources).toHaveLength(0);
    expect(shaken.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: false }),
      activeEffects: [],
    });
  });

  test("Sleep shake-awake preserves unrelated Incapacitated and Unconscious sources", () => {
    const shakenIncapacitated = shakeAwakeGoblinFromSleep(
      battleAfterFailedSleepInitialSave({
        battle: "battle-sleep-shake-awake-preserves-incapacitated",
        targetConditions: ["incapacitated"],
      }),
    );

    expect(shakenIncapacitated.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: true }),
      activeEffects: [],
    });

    const shakenUnconscious = shakeAwakeGoblinFromSleep(
      battleAfterGoblinFailedSleepRepeatSave({
        battle: "battle-sleep-shake-awake-preserves-unconscious",
        helperInitiative: 5,
        targetConditions: ["unconscious"],
      }),
    );

    expect(shakenUnconscious.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ unconscious: true }),
      activeEffects: [],
    });
  });

  test("Sleep shake-awake cannot be repeated after the target is awake", () => {
    const fighterTurn = battleAfterFailedSleepInitialSave({
      battle: "battle-sleep-shake-awake-repeat",
    });
    const subject = sleepShakeAwakeSubject();
    const target = findAct(fighterTurn, subject).initialHoles[0]!;
    const fill = sleepShakeAwakeTargetFill(target);

    const shaken = requireResolved(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [fill],
      }),
    ).state;

    expect(discoverBattleActCandidates(shaken)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ subject })]),
    );
    expect(
      resolveBattleSubject({
        state: shaken,
        subject,
        fills: [fill],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Sleep shake-awake target must be within 5 feet of the actor by table-supplied fact.",
    });
  });

  test("Sleep repeat success preserves unrelated Incapacitated sources", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-repeat-preserve-incapacitated"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          conditions: ["incapacitated"],
        }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );

    const repeated = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: true },
          ]),
        ],
      }),
    );

    expect(repeated.state.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: true }),
      activeEffects: [],
    });
  });

  test("Sleep repeat success removes direct Sleep Incapacitated while preserving stronger conditions", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-repeat-preserve-paralyzed"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          conditions: ["paralyzed"],
        }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("sleep")).subject;
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );

    const repeated = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: true },
          ]),
        ],
      }),
    );

    const target = repeated.state.combatants.get(goblinId)!;
    expect(target).toMatchObject({
      conditions: expect.objectContaining({
        paralyzed: true,
        directIncapacitated: false,
      }),
      activeEffects: [],
    });
    expect(removeCondition(target.conditions, "paralyzed")).toMatchObject({
      directIncapacitated: false,
      paralyzed: false,
    });
  });

  test("Sleep rejects rolled outcomes for automatic-success targets", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-auto-success"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("sleep")).subject;

    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [skeletonId],
              },
              outcomes: [{ targetId: skeletonId, succeeded: true }],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Sleep targets that do not sleep or have Exhaustion Immunity automatically succeed and must not receive a rolled Saving Throw outcome.",
    });
  });

  test("Sleep non-sleeper facts automatically succeed without a save outcome", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-non-sleeper-auto-success"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
        }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("sleep")).subject;

    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [goblinId],
                sleepNonSleeperFacts: [
                  { kind: "doesNotSleep", targetId: goblinId },
                ],
              },
              outcomes: [{ targetId: goblinId, succeeded: true }],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Sleep targets that do not sleep or have Exhaustion Immunity automatically succeed and must not receive a rolled Saving Throw outcome.",
    });

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [goblinId],
                sleepNonSleeperFacts: [
                  { kind: "doesNotSleep", targetId: goblinId },
                ],
              },
              outcomes: [],
            },
          },
        ],
      }),
    );

    const target = resolved.state.combatants.get(goblinId)!;
    expect(target.conditions.directIncapacitated).toBe(false);
    expect(target.activeEffects).toEqual([]);
    expect(
      resolved.state.currentTurnResources.actionResources.some(
        (resource) => resource.source === "turn",
      ),
    ).toBe(false);
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(true);
  });

  test("Sleep rejects duplicate or unselected non-sleeper facts", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-non-sleeper-validation"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
        }),
      ],
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("sleep")).subject;

    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [goblinId],
                sleepNonSleeperFacts: [
                  { kind: "doesNotSleep", targetId: fighterId },
                ],
              },
              outcomes: [{ targetId: goblinId, succeeded: true }],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Sleep non-sleeper facts must match selected Sphere targets.",
    });

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [goblinId],
                sleepNonSleeperFacts: [
                  { kind: "doesNotSleep", targetId: goblinId },
                  { kind: "doesNotSleep", targetId: goblinId },
                ],
              },
              outcomes: [],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Sleep non-sleeper facts must not duplicate targets.",
    });
  });

  test("Sleep cannot be readied through direct reducer input", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sleep-ready-rejected"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const castSubject = findAct(session, magicSubject("sleep")).subject;
    if (castSubject.tag !== "actionSpell") {
      throw new Error("Expected Sleep action spell subject.");
    }
    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...castSubject,
          mode: { tag: "ready", trigger: "spellCast" },
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
      message: "This spell procedure cannot be readied by this runtime lane.",
    });
    expect(state.readiedSpells.has(wizardId)).toBe(false);
  });
});
