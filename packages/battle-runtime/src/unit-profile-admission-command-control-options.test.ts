// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV50D2 command
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-command-drop-held-object spell.invocation-command-halt-grovel
import { describe, expect, test } from "vitest";
import {
  commandLegendaryActorId,
  commandUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  legendaryActionStatBlock,
  requireCombatant,
  requireHole,
  requireResultHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellActInvocation,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleObjectId,
  combatantId,
  discoverBattleActs,
  endTurn,
  movementFeet,
  resolveBattleSubject,
  spellId,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type {
  AvailableBattleAct,
  BattleFill,
  BattleSubject,
} from "./unit-profile-admission-test-support.ts";

describe("QMBT14 deterministic Command control option admission", () => {
  test("command is admitted as a target-list save spell with promoted option choices and slot-scaled targets", () => {
    const spell = spellRecord(commandUnitId);
    const secondTargetId = combatantId("unit-profile-command-target-2");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 2, count: 1 },
      ],
      extraTargetIds: [secondTargetId],
    });

    const levelOne = spellAct({
      state,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const levelTwo = spellAct({
      state,
      spellId: commandUnitId,
      slotLevel: 2,
    });

    expect(levelOne.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(commandUnitId, 1, "command"),
      mode: { tag: "cast" },
    });
    expect(requireHole(levelOne.initialHoles, "spellTargetList")).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 1,
        choices: expect.arrayContaining([spellTargetId, secondTargetId]),
      }),
    );
    expect(requireHole(levelTwo.initialHoles, "spellTargetList")).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 2,
      }),
    );
    expect(requireHole(levelTwo.initialHoles, "commandOptionChoice")).toEqual(
      expect.objectContaining({
        choices: ["grovel", "halt", "drop", "approach", "flee"],
      }),
    );
    expect(spellActInvocation(levelTwo)).toEqual(
      expect.objectContaining({
        procedure: "command",
        spell,
        actionCost: "magicAction",
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "wis",
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 2 },
        rangeFeet: 60,
      }),
    );
  });
  test("command Grovel records failed-save pending effects and resolves them on target turn", () => {
    const spell = spellRecord(commandUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOption.holeId,
      value: "grovel",
    };
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    });
    const savingThrow = requireResultHole(needsSave, "savingThrowOutcome");

    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(cast).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command cast to resolve.");
    }
    expect(requireCombatant(cast.state, spellTargetId).activeEffects).toEqual([
      expect.objectContaining({
        kind: "commandPending",
        option: "grovel",
        sourceSpellId: commandUnitId,
        sourceCombatantId: spellCasterId,
        expiresAt: {
          kind: "endOfTurn",
          combatantId: spellTargetId,
          round: 1,
        },
      }),
    ]);

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetActs = discoverBattleActs(targetTurn.state);
    expect(targetActs).toEqual([
      expect.objectContaining({
        subject: {
          tag: "runtimeCommand",
          actorId: spellTargetId,
          command: "commandGrovel",
          sourceCombatantId: spellCasterId,
          sourceSpellId: spellId(commandUnitId),
        },
        initialHoles: [],
      }),
    ]);
    const grovel = resolveBattleSubject({
      state: targetTurn.state,
      subject: targetActs[0]!.subject,
      fills: [],
    });
    expect(grovel).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: spellCasterId,
        combatants: [
          expect.anything(),
          expect.objectContaining({
            combatantId: spellTargetId,
            conditions: expect.arrayContaining(["prone"]),
          }),
        ],
      },
    });
    if (grovel.tag !== "resolved") {
      throw new Error("Expected Command Grovel to resolve.");
    }
    expect(requireCombatant(grovel.state, spellTargetId).activeEffects).toEqual(
      [],
    );
  });
  test("command Halt suppresses target turn Movement, Action, and Bonus Action until end turn", () => {
    const spell = spellRecord(commandUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      statBlockTargets: [
        {
          combatantId: commandLegendaryActorId,
          statBlock: legendaryActionStatBlock(),
          initiative: 5,
        },
      ],
    });
    const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOption.holeId,
      value: "halt",
    };
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    });
    const savingThrow = requireResultHole(needsSave, "savingThrowOutcome");

    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command Halt cast to resolve.");
    }
    expect(requireCombatant(cast.state, spellTargetId).activeEffects).toEqual([
      expect.objectContaining({
        kind: "commandPending",
        option: "halt",
        sourceSpellId: commandUnitId,
        sourceCombatantId: spellCasterId,
        expiresAt: {
          kind: "endOfTurn",
          combatantId: spellTargetId,
          round: 1,
        },
      }),
    ]);

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    expect(targetTurn.state.currentTurnResources.commandHalt).toEqual({
      kind: "commandHalt",
    });
    expect(targetTurn.state.currentTurnResources.actionResources).toEqual([]);
    expect(targetTurn.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(targetTurn.snapshot.turn.actionResources).toEqual([]);
    expect(targetTurn.snapshot.turn.bonusActionAvailable).toBe(false);
    const haltedTargetSnapshot = targetTurn.snapshot.combatants.find(
      (combatant) => combatant.combatantId === spellTargetId,
    );
    if (haltedTargetSnapshot === undefined) {
      throw new Error("Expected halted target snapshot.");
    }
    expect(haltedTargetSnapshot.movement.spentFeet).toBe(
      haltedTargetSnapshot.movement.speedFeet,
    );
    expect(haltedTargetSnapshot.movement.remainingFeet).toBe(movementFeet(0));
    expect(
      haltedTargetSnapshot.movement.speedKinds.every(
        (speedKind) => speedKind.remainingFeet === movementFeet(0),
      ),
    ).toBe(true);
    const haltedActs = discoverBattleActs(targetTurn.state);
    const legendaryAct = haltedActs.find(
      (
        candidate,
      ): candidate is AvailableBattleAct & {
        readonly subject: Extract<
          BattleSubject,
          { readonly tag: "action"; readonly action: "attack" }
        >;
      } =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.actorId === commandLegendaryActorId &&
        candidate.subject.statBlockSection === "legendaryActions",
    );
    if (legendaryAct === undefined) {
      throw new Error("Expected Command Halt to leave Legendary Actions open.");
    }
    expect(
      haltedActs.some(
        (candidate) =>
          candidate.subject.actorId === spellTargetId &&
          (candidate.subject.tag === "action" ||
            candidate.subject.tag === "actionSpell" ||
            candidate.subject.tag === "bonusAction" ||
            candidate.subject.tag === "bonusActionStandardAction" ||
            candidate.subject.tag === "bonusActionSpell" ||
            candidate.subject.tag === "bonusActionDashSpell" ||
            (candidate.subject.tag === "runtimeCommand" &&
              (candidate.subject.command === "move" ||
                candidate.subject.command === "standFromProne" ||
                candidate.subject.command === "jumpMovementReplacement"))),
      ),
    ).toBe(false);
    expect(haltedActs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: {
            tag: "runtimeCommand",
            actorId: spellTargetId,
            command: "endTurn",
          },
        }),
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "action",
            actorId: commandLegendaryActorId,
            statBlockSection: "legendaryActions",
          }),
        }),
      ]),
    );
    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: legendaryAct.subject,
        fills: [],
      }),
    ).not.toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: { tag: "action", actorId: spellTargetId, action: "dodge" },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: {
          tag: "bonusAction",
          actorId: spellTargetId,
          action: "offHandAttack",
          attackName: "Shortsword",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: {
          tag: "runtimeCommand",
          actorId: spellTargetId,
          command: "move",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const ended = endTurn({ state: targetTurn.state, actorId: spellTargetId });
    if (ended.tag !== "resolved") {
      throw new Error("Expected halted target End Turn to resolve.");
    }
    expect(requireCombatant(ended.state, spellTargetId).activeEffects).toEqual(
      [],
    );
    expect(ended.state.currentTurnResources.commandHalt).toBeNull();
  });
  test("command Drop consumes canonical character held-object facts, emits dropped-object outcomes, and ends turn", () => {
    const spell = spellRecord(commandUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      targetAttack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOption.holeId,
      value: "drop",
    };
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    });
    const savingThrow = requireResultHole(needsSave, "savingThrowOutcome");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command Drop cast to resolve.");
    }

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetBeforeDrop = requireCombatant(targetTurn.state, spellTargetId);
    const targetLoadoutBeforeDrop =
      targetBeforeDrop.origin.kind === "character"
        ? targetBeforeDrop.origin.selectedLoadout
        : null;
    const targetActs = discoverBattleActs(targetTurn.state);
    expect(targetActs).toEqual([
      expect.objectContaining({
        subject: {
          tag: "runtimeCommand",
          actorId: spellTargetId,
          command: "commandDrop",
          sourceCombatantId: spellCasterId,
          sourceSpellId: spellId(commandUnitId),
        },
        initialHoles: [],
      }),
    ]);

    const dropped = resolveBattleSubject({
      state: targetTurn.state,
      subject: targetActs[0]!.subject,
      fills: [],
    });
    expect(dropped).toMatchObject({
      tag: "resolved",
      droppedObjects: [
        {
          kind: "objectDropped",
          actorId: spellTargetId,
          objectId: battleObjectId("main:weapon_longsword"),
          source: {
            kind: "spell",
            sourceCombatantId: spellCasterId,
            sourceSpellId: spellId(commandUnitId),
          },
        },
      ],
      snapshot: { currentActorId: spellCasterId },
    });
    if (dropped.tag !== "resolved") {
      throw new Error("Expected Command Drop to resolve.");
    }
    expect(
      requireCombatant(dropped.state, spellTargetId).activeEffects,
    ).toEqual([]);
    const targetAfterDrop = requireCombatant(dropped.state, spellTargetId);
    expect(
      targetAfterDrop.origin.kind === "character"
        ? targetAfterDrop.origin.selectedLoadout
        : null,
    ).toEqual(targetLoadoutBeforeDrop);
  });
  test("command Drop requires table held-object facts when no canonical loadout facts exist", () => {
    const spell = spellRecord(commandUnitId);
    const statBlockTargetId = combatantId(
      "unit-profile-command-drop-statblock",
    );
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      statBlockTargets: [
        {
          combatantId: statBlockTargetId,
          statBlock: legendaryActionStatBlock(),
          initiative: 15,
        },
      ],
    });
    const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [statBlockTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOption.holeId,
      value: "drop",
    };
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    });
    const savingThrow = requireResultHole(needsSave, "savingThrowOutcome");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: statBlockTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command Drop cast to resolve.");
    }

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const dropAct = discoverBattleActs(targetTurn.state)[0];
    expect(dropAct).toEqual(
      expect.objectContaining({
        subject: expect.objectContaining({
          tag: "runtimeCommand",
          actorId: statBlockTargetId,
          command: "commandDrop",
        }),
        initialHoles: [expect.objectContaining({ kind: "heldObjectFacts" })],
      }),
    );
    if (
      dropAct === undefined ||
      dropAct.subject.tag !== "runtimeCommand" ||
      dropAct.subject.command !== "commandDrop"
    ) {
      throw new Error("Expected Command Drop act.");
    }
    const missingFacts = resolveBattleSubject({
      state: targetTurn.state,
      subject: dropAct.subject,
      fills: [],
    });
    expect(missingFacts).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "heldObjectFacts" })],
    });

    const heldObjectFacts = requireHole(
      dropAct.initialHoles,
      "heldObjectFacts",
    );
    const knownEmpty = resolveBattleSubject({
      state: targetTurn.state,
      subject: dropAct.subject,
      fills: [
        {
          kind: "heldObjectFacts",
          holeId: heldObjectFacts.holeId,
          value: { objectIds: [] },
        },
      ],
    });
    expect(knownEmpty).toMatchObject({
      tag: "resolved",
      droppedObjects: [],
      snapshot: { currentActorId: spellTargetId },
    });

    const knownHeld = resolveBattleSubject({
      state: targetTurn.state,
      subject: dropAct.subject,
      fills: [
        {
          kind: "heldObjectFacts",
          holeId: heldObjectFacts.holeId,
          value: {
            objectIds: [
              battleObjectId("statblock:main-hand"),
              battleObjectId("statblock:off-hand"),
            ],
          },
        },
      ],
    });
    expect(knownHeld).toMatchObject({
      tag: "resolved",
      droppedObjects: [
        expect.objectContaining({
          objectId: battleObjectId("statblock:main-hand"),
        }),
        expect.objectContaining({
          objectId: battleObjectId("statblock:off-hand"),
        }),
      ],
      snapshot: { currentActorId: spellTargetId },
    });
  });
  test("command Grovel save success spends the cast without pending effects", () => {
    const spell = spellRecord(commandUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOption.holeId,
      value: "grovel",
    };
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    });
    const savingThrow = requireResultHole(needsSave, "savingThrowOutcome");

    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });

    expect(cast).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command cast to resolve.");
    }
    expect(requireCombatant(cast.state, spellTargetId).activeEffects).toEqual(
      [],
    );
  });
  test("self-target command Grovel cannot resolve before the caster's next turn", () => {
    const spell = spellRecord(commandUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellCasterId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "commandOptionChoice" }
    > = {
      kind: "commandOptionChoice",
      holeId: commandOption.holeId,
      value: "grovel",
    };
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    });
    const savingThrow = requireResultHole(needsSave, "savingThrowOutcome");

    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellCasterId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected self-target Command cast to resolve.");
    }
    expect(requireCombatant(cast.state, spellCasterId).activeEffects).toEqual([
      expect.objectContaining({
        kind: "commandPending",
        option: "grovel",
        sourceSpellId: commandUnitId,
        sourceCombatantId: spellCasterId,
        expiresAt: {
          kind: "endOfTurn",
          combatantId: spellCasterId,
          round: 2,
        },
      }),
    ]);

    const prematureGrovel = resolveBattleSubject({
      state: cast.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "commandGrovel",
        sourceCombatantId: spellCasterId,
        sourceSpellId: spellId(commandUnitId),
      },
      fills: [],
    });
    expect(prematureGrovel).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const nextCasterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected target End Turn to resolve.");
    }
    const casterActs = discoverBattleActs(nextCasterTurn.state);
    const grovelAct = casterActs.find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "commandGrovel" &&
        candidate.subject.actorId === spellCasterId,
    );
    expect(grovelAct).toBeDefined();
    if (grovelAct === undefined) {
      throw new Error("Expected self-target Command Grovel act.");
    }

    const grovel = resolveBattleSubject({
      state: nextCasterTurn.state,
      subject: grovelAct.subject,
      fills: [],
    });
    expect(grovel).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: spellTargetId,
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            conditions: expect.arrayContaining(["prone"]),
          }),
          expect.anything(),
        ],
      },
    });
  });
});
