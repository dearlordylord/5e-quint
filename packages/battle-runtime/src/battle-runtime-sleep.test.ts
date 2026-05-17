import {
  startBattleRight,
  requireElapsedHours,
  requireResolved,
  fighterAttackSubject,
  goblinAttackSubject,
  requireHole,
  findAct,
  sleepShakeAwakeSubject,
  sleepShakeAwakeTargetFill,
  battleAfterFailedSleepInitialSave,
  battleAfterGoblinFailedSleepRepeatSave,
  shakeAwakeGoblinFromSleep,
  targetFill,
  spellTargetAllocationFill,
  attackTargetFill,
  attackRollFill,
  savingThrowOutcomeFill,
  damageRollFill,
  damageRollFillWithGroups,
  characterSeed,
  statBlockCreatureInit,
  skeletonCreatureInit,
  wizardSpellcasting,
  spellRecord,
  magicSubject,
  expendedLevelOneSlots,
  partySide,
  oppositionSide,
  fighterId,
  goblinId,
  skeletonId,
  wizardId,
  applyBattleHitPointDamage,
  battleId,
  breakBattleConcentration,
  discoverBattleActs,
  endTurn,
  Hp,
  removeCondition,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./battle-runtime-test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Sleep", () => {
  test("Sleep failed initial saves apply pending Incapacitated and spend cast resources", () => {
    const state = startBattleRight({
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
    const subject = magicSubject("sleep");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Sleep point-origin Sphere Saving Throw outcomes",
      ability: "wis",
      spell: {
        procedure: "sleepTargetAdmission",
        targeting: { kind: "pointOriginSphere", radiusFeet: 5 },
        rangeFeet: 60,
      },
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
          sourceSpellId: "sleep",
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
    const base = startBattleRight({
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
          side: oppositionSide,
        }),
      ],
    });
    const goblin = base.combatants.get(goblinId)!;
    const state = {
      ...base,
      combatants: new Map(base.combatants).set(goblinId, {
        ...goblin,
        concentration: {
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect",
        },
        activeEffects: [
          {
            kind: "spellBaseArmorClass",
            sourceSpellId: "mage_armor",
            sourceCombatantId: goblinId,
            base: 13,
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
    const subject = magicSubject("sleep");
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
          sourceSpellId: "sleep",
          sourceCombatantId: wizardId,
        }),
      ],
    });
  });

  test("Sleep self-target failed initial save immediately ends its own Concentration", () => {
    const state = startBattleRight({
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
          side: oppositionSide,
        }),
      ],
    });
    const subject = magicSubject("sleep");
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
    const state = startBattleRight({
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
          side: oppositionSide,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
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
    const state = startBattleRight({
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
          side: oppositionSide,
        }),
        skeletonCreatureInit({ initiative: 8 }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
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
      label: "sleep repeat WIS save",
      ability: "wis",
      sleepRepeatSave: {
        targetId: goblinId,
        sourceSpellId: "sleep",
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
    const state = startBattleRight({
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
          side: oppositionSide,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
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
          sourceSpellId: "sleep",
          sourceCombatantId: wizardId,
          expiresAt: { kind: "concentration", combatantId: wizardId },
        }),
      ],
    });
  });

  test("Sleep concentration break removes escalated Unconscious effects", () => {
    const state = startBattleRight({
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
          side: oppositionSide,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
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
    const state = startBattleRight({
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
          side: oppositionSide,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
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
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect",
        },
        activeEffects: [
          ...goblin.activeEffects,
          {
            kind: "spellBaseArmorClass",
            sourceSpellId: "mage_armor",
            sourceCombatantId: goblinId,
            base: 13,
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
          sourceSpellId: "sleep",
          sourceCombatantId: wizardId,
        }),
      ],
    });
  });

  test("Sleep pending effect ends when the target takes damage from a non-caster", () => {
    const state = startBattleRight({
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
          side: partySide,
          currentHp: 20,
          maxHp: 20,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
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
    const subject = goblinAttackSubject("Scimitar");
    const target = requireHole(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
      "targetChoice",
    );
    const attack = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [attackTargetFill(target, goblinId, fighterId, "Scimitar")],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          attackTargetFill(target, goblinId, fighterId, "Scimitar"),
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
          attackTargetFill(target, goblinId, fighterId, "Scimitar"),
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
    const state = startBattleRight({
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
          side: oppositionSide,
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
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
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
    const subject = fighterAttackSubject();
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
    const state = startBattleRight({
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
          side: oppositionSide,
          currentHp: 20,
          maxHp: 20,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
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
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      invocation: spellSlotInvocationRef(
        "magic_missile",
        1,
        "repeatedDamageAllocation",
      ),
      mode: { tag: "cast" },
    };
    const targetAllocation = requireHole(
      resolveBattleSubject({ state: fighterTurn, subject, fills: [] }),
      "spellTargetAllocation",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
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
        subject,
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
    const state = startBattleRight({
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
          side: oppositionSide,
          currentHp: 20,
          maxHp: 20,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const sleeping = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
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
    const incapacitatedState = startBattleRight({
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
          side: oppositionSide,
          currentHp: 20,
          maxHp: 20,
          conditions: ["incapacitated"],
        }),
      ],
    });
    const incapacitatedSavingThrows = requireHole(
      resolveBattleSubject({
        state: incapacitatedState,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const sleptIncapacitated = requireResolved(
      resolveBattleSubject({
        state: incapacitatedState,
        subject: magicSubject("sleep"),
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

    const unconsciousState = startBattleRight({
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
          side: oppositionSide,
          currentHp: 20,
          maxHp: 20,
          conditions: ["unconscious"],
        }),
      ],
    });
    const unconsciousSavingThrows = requireHole(
      resolveBattleSubject({
        state: unconsciousState,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const sleptUnconscious = requireResolved(
      resolveBattleSubject({
        state: unconsciousState,
        subject: magicSubject("sleep"),
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
    const state = startBattleRight({
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
          side: oppositionSide,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
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

    expect(discoverBattleActs(shaken)).not.toEqual(
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
    const state = startBattleRight({
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
          side: oppositionSide,
          conditions: ["incapacitated"],
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
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
    const state = startBattleRight({
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
          side: oppositionSide,
          conditions: ["paralyzed"],
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
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
    const state = startBattleRight({
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
    const subject = magicSubject("sleep");
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
    const state = startBattleRight({
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
          side: oppositionSide,
        }),
      ],
    });
    const subject = magicSubject("sleep");
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
    expect(resolved.state.currentTurnResources.spellSlotExpendedThisTurn).toBe(
      true,
    );
  });

  test("Sleep rejects duplicate or unselected non-sleeper facts", () => {
    const state = startBattleRight({
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
          side: oppositionSide,
        }),
      ],
    });
    const subject = magicSubject("sleep");
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
    const state = startBattleRight({
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

    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "sleep",
            1,
            "sleepTargetAdmission",
          ),
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
