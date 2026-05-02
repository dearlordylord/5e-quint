import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  BATTLE_UNIT_SUPPORT_PROFILES,
  BattleFillSchema,
  BattleSubjectSchema,
  BATTLE_READIED_SPELL_TRIGGERS,
  addBattleCombatant,
  battleId,
  breakBattleConcentration,
  characterId,
  concentrationSavingThrowDc,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  resolveBattleSubject,
  resolveBattleReaction,
  resolveBattleConcentrationDamage,
  removeBattleCombatants,
  snapshotBattle,
  startBattle,
  type BattleFill,
  type BattleHole,
  type BattleHidePrerequisite,
  type BattleReadiedSpellTrigger,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  type BattleCreatureInit,
} from "./index.ts";
import {
  abilityModifier,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicksFromHours } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  holeId,
  type AttackRollMode,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  abilityModifier as battleAbilityModifier,
  difficultyClass,
  DieRollResult,
  Hp,
  movementDeltaFeet,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import magicMissileInput from "../../surface/content/magic_missile.json";
import mageArmorInput from "../../surface/content/mage_armor.json";
import rayOfFrostInput from "../../surface/content/ray_of_frost.json";
import acidSplashInput from "../../surface/content/acid_splash.json";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type {
  SpellRecord,
  StatBlockRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";

const packageRootPath = fileURLToPath(new URL("../", import.meta.url));
const battleRuntimeSpecPath = fileURLToPath(
  new URL("../battle-runtime.qnt", import.meta.url),
);
const fighterId = combatantId("fighter");
const goblinId = combatantId("goblin");
const skeletonId = combatantId("skeleton");
const wizardId = combatantId("wizard");
const secondWizardId = combatantId("second-wizard");
const secondSkeletonId = combatantId("second-skeleton");
const distantFighterId = combatantId("distant-fighter");
const longRangeFighterId = combatantId("long-range-fighter");
type BattleFillableHole = Pick<BattleHole, "kind" | "holeId">;
type DamageRollValue = Extract<
  BattleFill,
  { readonly kind: "rolledDice" }
>["value"];
const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

function requireElapsedHours(hours: number) {
  const parsed = elapsedTimeTicksFromHours(hours);
  if (Either.isLeft(parsed)) {
    throw new Error(`invalid test elapsed hours: ${hours}`);
  }
  return parsed.right;
}

if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Battle runtime test catalogs must build successfully.");
}

const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;
const testSpellRecords = new Map(
  [magicMissileInput, mageArmorInput, rayOfFrostInput, acidSplashInput]
    .map((input) => decodeUnitRecordSync(input))
    .flatMap((unit) => (unit.kind === "spell" ? [[unit.id, unit]] : [])),
);

describe("battle runtime", () => {
  test("battle ids must be non-empty trimmed strings", () => {
    expect(() => battleId("")).toThrow();
    expect(() => battleId("   ")).toThrow();
    expect(() => battleId(" battle-1 ")).toThrow();
    expect(battleId("battle-1")).toBe("battle-1");
  });

  test("initiative scores must be integers", () => {
    expect(() => initiativeScore(12.5)).toThrow();
  });

  test("startBattle creates sorted Initiative state and the MCP snapshot contract", () => {
    const state = startBattle({
      battleId: battleId("battle-1"),
      combatants: [
        characterSeed({ initiative: 12 }),
        statBlockCreatureInit({ initiative: 16, currentHp: 0 }),
      ],
    });

    expect(snapshotBattle(state)).toMatchObject({
      battleId: battleId("battle-1"),
      round: 1,
      currentActorId: goblinId,
      turnOrder: [goblinId, fighterId],
      combatants: [
        {
          combatantId: goblinId,
          displayName: "Goblin Warrior",
          originKind: "statBlock",
          hp: 0,
          maxHp: 10,
          tempHp: 0,
          armorClass: 15,
          defeated: true,
          zeroHpLifecycle: { policy: "diesAtZeroHp", dead: true },
          conditions: [],
        },
        {
          combatantId: fighterId,
          displayName: "Fighter",
          originKind: "character",
          hp: 12,
          maxHp: 12,
          tempHp: 0,
          armorClass: 10,
          defeated: false,
          zeroHpLifecycle: {
            policy: "usesDeathSavingThrows",
            deathSaves: { successes: 0, failures: 0 },
            stable: false,
            dead: false,
          },
          conditions: [],
        },
      ],
      acts: [
        {
          subject: {
            tag: "runtimeCommand",
            actorId: goblinId,
            command: "endTurn",
          },
          label: "End Turn",
          initialHoles: [],
        },
      ],
      currentTurnResources: {
        actionResources: [{ kind: "action", source: "turn" }],
        currentHasBonusAction: true,
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    });
  });

  test("startBattle preserves caller-supplied order among tied Initiative scores", () => {
    const state = startBattle({
      battleId: battleId("battle-tied-initiative"),
      combatants: [
        statBlockCreatureInit({ initiative: 12 }),
        characterSeed({ initiative: 12 }),
      ],
    });

    expect(snapshotBattle(state)).toMatchObject({
      currentActorId: goblinId,
      turnOrder: [goblinId, fighterId],
    });
  });

  test("startBattle rejects current HP above max HP", () => {
    expect(() =>
      startBattle({
        battleId: battleId("battle-overmax-hp"),
        combatants: [
          characterSeed({ initiative: 12, currentHp: 13 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow("Battle initialization current HP exceeds max HP.");

    expect(() =>
      startBattle({
        battleId: battleId("battle-statblock-overmax-hp"),
        combatants: [
          characterSeed({ initiative: 12 }),
          statBlockCreatureInit({ initiative: 10, currentHp: 11 }),
        ],
      }),
    ).toThrow("Battle initialization current HP exceeds max HP.");
  });

  test("startBattle rejects incomplete or duplicate explicit combatant distances", () => {
    const combatants = [
      characterSeed({ initiative: 12 }),
      statBlockCreatureInit({ initiative: 10 }),
    ];

    expect(() =>
      startBattle({
        battleId: battleId("battle-incomplete-distances"),
        combatants,
        combatantDistances: [],
      }),
    ).toThrow("Battle combatant distances must include every combatant pair.");

    expect(() =>
      startBattle({
        battleId: battleId("battle-duplicate-distances"),
        combatants,
        combatantDistances: [
          {
            combatantA: fighterId,
            combatantB: goblinId,
            feet: movementFeet(5),
          },
          {
            combatantA: goblinId,
            combatantB: fighterId,
            feet: movementFeet(10),
          },
        ],
      }),
    ).toThrow("Duplicate battle combatant distance pair.");
  });

  test("startBattle rejects fractional expended Spell Slots", () => {
    expect(() =>
      startBattle({
        battleId: battleId("battle-fractional-spell-slot"),
        combatants: [
          characterSeed({
            initiative: 12,
            spellcasting: {
              ...wizardSpellcasting(),
              spellSlotExpenditures: [{ spellLevel: 1, expended: 0.5 }],
            },
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow(
      "Spell Slot expenditure must be an integer between zero and count.",
    );
  });

  test("startBattle rejects invalid Spell Slot level and count", () => {
    expect(() =>
      startBattle({
        battleId: battleId("battle-fractional-spell-slot-count"),
        combatants: [
          characterSeed({
            initiative: 12,
            spellcasting: {
              ...wizardSpellcasting(),
              spellSlots: [{ spellLevel: 1, count: 1.5 }],
            },
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow(
      "Spell Slot level must be 1-9 and count must be a non-negative integer.",
    );

    expect(() =>
      startBattle({
        battleId: battleId("battle-invalid-spell-slot-level"),
        combatants: [
          characterSeed({
            initiative: 12,
            spellcasting: {
              ...wizardSpellcasting(),
              spellSlots: [{ spellLevel: 10, count: 1 }],
            },
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow(
      "Spell Slot level must be 1-9 and count must be a non-negative integer.",
    );
  });

  test("startBattle rejects duplicate Spell Slot levels", () => {
    expect(() =>
      startBattle({
        battleId: battleId("battle-duplicate-spell-slot-level"),
        combatants: [
          characterSeed({
            initiative: 12,
            spellcasting: {
              ...wizardSpellcasting(),
              spellSlots: [
                { spellLevel: 1, count: 2 },
                { spellLevel: 1, count: 1 },
              ],
            },
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow("Spell Slot levels must be unique.");
  });

  test("startBattle rejects class levels outside the character class-level domain", () => {
    for (const [battle, classLevel] of [
      ["battle-zero-class-level", 0],
      ["battle-fractional-class-level", 1.5],
      ["battle-above-class-level-cap", 21],
    ] as const) {
      expect(() =>
        startBattle({
          battleId: battleId(battle),
          combatants: [
            characterSeed({ initiative: 12, classLevel }),
            statBlockCreatureInit({ initiative: 10 }),
          ],
        }),
      ).toThrow("Character class levels must be integers from 1 to 20.");
    }
  });

  test("startBattle rejects duplicate character class levels", () => {
    expect(() =>
      startBattle({
        battleId: battleId("battle-duplicate-character-class-level"),
        combatants: [
          characterSeed({
            initiative: 12,
            classLevels: [
              { className: "fighter", level: 1 },
              { className: "fighter", level: 2 },
            ],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow("Character class levels must not duplicate classes.");
  });

  test("startBattle rejects class-feature resources without an owning class level", () => {
    expect(() =>
      startBattle({
        battleId: battleId("battle-second-wind-without-fighter-level"),
        combatants: [
          characterSeed({
            initiative: 12,
            classLevels: [],
            resources: [secondWindResource()],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow(
      "Character class feature resource requires a fighter class level.",
    );
  });

  test("discoverBattleActs exposes attack, movement, and endTurn for the current actor", () => {
    const acts = discoverBattleActs(
      startBattle({
        battleId: battleId("battle-1"),
        combatants: [
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    );

    expect(acts.map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        { tag: "action", actorId: fighterId, action: "grapple" },
        { tag: "runtimeCommand", actorId: fighterId, command: "move" },
        { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
      ]),
    );
    expect(acts[0]?.initialHoles).toMatchObject([
      {
        kind: "targetChoice",
        label: "Attack target",
        choices: [goblinId],
      },
    ]);
  });

  test("discoverBattleActs omits attack when there is no target", () => {
    const acts = discoverBattleActs(
      startBattle({
        battleId: battleId("battle-no-target"),
        combatants: [characterSeed({ initiative: 20 })],
      }),
    );

    expect(acts.map((act) => act.subject)).not.toContainEqual(
      expect.objectContaining({ tag: "action", action: "attack" }),
    );
    expect(acts.map((act) => act.subject)).toContainEqual({
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "endTurn",
    });
  });

  test("mid-battle roster mutation preserves Initiative and current turn state", () => {
    const state = fighterVsGoblinBattle();
    const added = addBattleCombatant({
      state,
      combatant: statBlockCreatureInit({
        combatantId: skeletonId,
        displayName: "Skeleton",
        initiative: 15,
      }),
      combatantDistances: [
        {
          combatantA: skeletonId,
          combatantB: fighterId,
          feet: movementFeet(10),
        },
        {
          combatantA: skeletonId,
          combatantB: goblinId,
          feet: movementFeet(15),
        },
      ],
    });

    expect(snapshotBattle(added)).toMatchObject({
      currentActorId: fighterId,
      turnOrder: [fighterId, skeletonId, goblinId],
    });

    const removedCurrent = removeBattleCombatants({
      state: added,
      combatantIds: [fighterId],
    });

    expect(snapshotBattle(removedCurrent)).toMatchObject({
      currentActorId: skeletonId,
      turnOrder: [skeletonId, goblinId],
    });
    expect(
      removedCurrent.combatantDistances.get(skeletonId)?.has(fighterId),
    ).toBe(false);
  });

  test("generic combat actions spend the Action and expose typed battle state", () => {
    const state = fighterVsGoblinBattle();

    const dashed = requireResolved(
      resolveBattleSubject({
        state,
        subject: { tag: "action", actorId: fighterId, action: "dash" },
        fills: [],
      }),
    );
    expect(dashed.snapshot.currentTurnResources.actionResources).toEqual([]);
    expect(dashed.snapshot.currentTurnResources.dashMovementBonusFeet).toBe(30);
    expect(dashed.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: fighterId,
        movement: expect.objectContaining({ remainingFeet: movementFeet(60) }),
      }),
    );

    const dodged = requireResolved(
      resolveBattleSubject({
        state,
        subject: { tag: "action", actorId: fighterId, action: "dodge" },
        fills: [],
      }),
    );
    expect(dodged.state.combatants.get(fighterId)?.dodging).toBe(true);

    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "ready",
          readyTrigger: "attackHit",
        },
        fills: [],
      }),
    );
    expect(readied.snapshot.readiedMovements).toEqual([
      expect.objectContaining({
        actorId: fighterId,
        trigger: "attackHit",
      }),
    ]);
  });

  test("Ready subjects require an explicit Reaction trigger", () => {
    const decoded = Schema.decodeUnknownEither(BattleSubjectSchema)({
      tag: "action",
      actorId: fighterId,
      action: "ready",
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("Disengage suppresses Opportunity Attacks for current-turn Movement", () => {
    const state = fighterVsGoblinBattle();
    const disengaged = requireResolved(
      resolveBattleSubject({
        state,
        subject: { tag: "action", actorId: fighterId, action: "disengage" },
        fills: [],
      }),
    ).state;
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state: disengaged, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state: disengaged,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            distanceMovedFeet: 10,
            destinationDistances: [{ combatantId: goblinId, feet: 30 }],
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved", snapshot: { pendingReaction: null } });
  });

  test("Ready holds executable Reaction movement until its trigger", () => {
    const state = fighterVsGoblinBattle();
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "ready",
          readyTrigger: "attackHit",
        },
        fills: [],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: readied, actorId: fighterId }),
    ).state;
    expect(discoverBattleActs(goblinTurn)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "runtimeCommand",
            command: "releaseReadiedMovement",
          }),
        }),
      ]),
    );
    const releaseSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "releaseReadiedMovement" as const,
      readiedMovementActorId: fighterId,
    };
    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject: releaseSubject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    const attackSubject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
      statBlockSection: "actions",
    };
    const target = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: attackSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: attackSubject,
        fills: [targetFill(target, fighterId)],
      }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state: goblinTurn,
      subject: attackSubject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(roll, { total: 20, naturalD20: 12 }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const readiedChoice =
      awaitingReaction.snapshot.pendingReaction?.frame.choices.find(
        (choice) =>
          choice.kind === "releaseReadiedMovement" &&
          choice.readiedMovementActorId === fighterId,
      );
    expect(awaitingReaction.snapshot.pendingReaction?.frame.choices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "releaseReadiedMovement",
          reactorId: fighterId,
          readiedMovementActorId: fighterId,
        }),
      ]),
    );
    if (readiedChoice === undefined) {
      throw new Error("Expected a readied movement Reaction choice.");
    }
    const readiedMovementHole = readiedChoice.initialHoles[0];
    if (readiedMovementHole === undefined) {
      throw new Error("Expected readied movement Reaction movement hole.");
    }
    const readiedMove = movementFill(readiedMovementHole, {
      movementCostFeet: 5,
      distanceMovedFeet: 5,
      destinationDistances: [{ combatantId: goblinId, feet: 0 }],
    });

    const decision = requireHole(awaitingReaction, "reactionDecision");
    const released = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(decision, {
        kind: "resolve",
        reactorId: fighterId,
        choice: {
          kind: "releaseReadiedMovement",
          readiedMovementActorId: fighterId,
          fills: [readiedMove],
        },
      }),
    });
    if (released.tag === "invalid") {
      throw new Error(
        `Expected readied movement release, got ${released.message}.`,
      );
    }

    expect(released.state.readiedMovements.has(fighterId)).toBe(false);
    expect(released.state.combatants.get(fighterId)).toMatchObject({
      reactionAvailable: false,
      movementSpentFeet: movementFeet(0),
    });
    expect(
      released.state.combatantDistances.get(fighterId)?.get(goblinId),
    ).toBe(movementFeet(0));
  });

  test("Help attack grants and consumes Advantage for the selected ally and target", () => {
    const state = startBattle({
      battleId: battleId("battle-help-attack"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 5,
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "helpAttack",
    };
    const ally = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(ally, wizardId)],
      }),
      "targetChoice",
    );
    const helped = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(ally, wizardId), targetFill(target, goblinId)],
      }),
    ).state;
    const wizardTurn = requireResolved(
      endTurn({
        state: requireResolved(endTurn({ state: helped, actorId: fighterId }))
          .state,
        actorId: goblinId,
      }),
    ).state;
    const attackSubject: BattleSubject = {
      tag: "action",
      actorId: wizardId,
      action: "attack",
      attackName: "Longsword",
    };
    const attackTarget = requireHole(
      resolveBattleSubject({
        state: wizardTurn,
        subject: attackSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: wizardTurn,
        subject: attackSubject,
        fills: [targetFill(attackTarget, goblinId)],
      }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({ rollMode: "advantage" });
    const missed = requireResolved(
      resolveBattleSubject({
        state: wizardTurn,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, goblinId),
          attackRollFill(attackRoll, {
            total: 1,
            naturalD20: 1,
            rollMode: "advantage",
          }),
        ],
      }),
    );
    expect(missed.snapshot.helpAttacks).toEqual([]);
  });

  test("Stand from Prone spends half Speed as Movement and clears Prone", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(fighterId)!;
    const proneState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...fighter,
        conditions: applyCondition(fighter.conditions, "prone"),
      }),
    };
    const stood = requireResolved(
      resolveBattleSubject({
        state: proneState,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "standFromProne",
        },
        fills: [],
      }),
    );

    expect(stood.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: fighterId,
        conditions: expect.not.arrayContaining(["prone"]),
        movement: expect.objectContaining({
          spentFeet: movementFeet(15),
          remainingFeet: movementFeet(15),
        }),
      }),
    );
  });

  test("discoverBattleActs omits attack when the current character is Unconscious at 0 HP", () => {
    const acts = discoverBattleActs(
      startBattle({
        battleId: battleId("battle-unconscious-actor"),
        combatants: [
          characterSeed({ initiative: 20, currentHp: 0 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    );

    expect(acts.map((act) => act.subject)).toEqual([
      { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
    ]);
  });

  test("movement replay spends Movement and updates combatant distances", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );

    expect(hole).toMatchObject({
      kind: "movement",
      movementBudgetFeet: 30,
    });

    const moved = resolveBattleSubject({
      state,
      subject,
      fills: [
        movementFill(hole, {
          movementCostFeet: 10,
          distanceMovedFeet: 10,
          destinationDistances: [{ combatantId: goblinId, feet: 4 }],
        }),
      ],
    });

    expect(moved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: fighterId,
            movement: {
              speedFeet: 30,
              spentFeet: 10,
              remainingFeet: 20,
            },
          }),
        ]),
      },
    });
    if (moved.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${moved.tag}.`);
    }
    expect(moved.state.combatantDistances.get(fighterId)?.get(goblinId)).toBe(
      4,
    );
    expect(moved.state.combatantDistances.get(goblinId)?.get(fighterId)).toBe(
      4,
    );
  });

  test("movement cost cannot exceed the derived remaining Movement budget", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 35,
            distanceMovedFeet: 35,
            destinationDistances: [{ combatantId: goblinId, feet: 40 }],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("battle state projects held hands and Grapple occupies a free hand", () => {
    const state = fighterVsGoblinBattle();
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: fighterId,
        hands: { left: "free", right: "mainWeapon" },
      }),
    );

    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "grapple",
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const outcome = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "grappleOutcome",
    );
    const grappled = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, goblinId),
          grappleOutcomeFill(outcome, false),
        ],
      }),
    );

    expect(grappled.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hands: { left: "grapple", right: "mainWeapon" },
          grappling: [
            expect.objectContaining({
              grapplerId: fighterId,
              targetId: goblinId,
              targetExemptFromDragCost: false,
            }),
          ],
        }),
        expect.objectContaining({
          combatantId: goblinId,
          conditions: expect.arrayContaining(["grappled"]),
          grappledBy: expect.objectContaining({ grapplerId: fighterId }),
          movement: expect.objectContaining({ speedFeet: 0 }),
        }),
      ]),
    );
  });

  test("release and Escape Grapple end the typed grapple link", () => {
    const state = fighterVsGoblinBattle();
    const grappled = fighterGrapplesGoblin(state);

    const released = requireResolved(
      resolveBattleSubject({
        state: grappled.state,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "releaseGrapple",
          targetId: goblinId,
        },
        fills: [],
      }),
    );
    expect(released.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hands: { left: "free", right: "mainWeapon" },
          grappling: [],
        }),
        expect.objectContaining({
          combatantId: goblinId,
          conditions: expect.not.arrayContaining(["grappled"]),
          grappledBy: null,
        }),
      ]),
    );

    const goblinTurn = requireResolved(
      endTurn({ state: grappled.state, actorId: fighterId }),
    ).state;
    expect(
      discoverBattleActs(goblinTurn).map((act) => act.subject),
    ).toContainEqual({
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "releaseGrapple",
      targetId: goblinId,
    });
    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "releaseGrapple",
          targetId: goblinId,
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "resolved" });

    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "escapeGrapple",
    };
    const escape = requireHole(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
      "grappleOutcome",
    );
    const escaped = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [grappleOutcomeFill(escape, true)],
      }),
    );
    expect(escaped.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: fighterId, grappling: [] }),
        expect.objectContaining({ combatantId: goblinId, grappledBy: null }),
      ]),
    );
  });

  test("grapple drag movement must pay the Grappled Movable extra cost", () => {
    const grappled = fighterGrapplesGoblin(fighterVsGoblinBattle());
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state: grappled.state, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state: grappled.state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 1,
            distanceMovedFeet: 1,
            destinationDistances: [{ combatantId: goblinId, feet: 4 }],
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    expect(
      resolveBattleSubject({
        state: grappled.state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 2,
            distanceMovedFeet: 1,
            destinationDistances: [{ combatantId: goblinId, feet: 4 }],
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });

    expect(
      resolveBattleSubject({
        state: grappled.state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 5,
            distanceMovedFeet: 5,
            destinationDistances: [{ combatantId: goblinId, feet: 5 }],
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    expect(
      resolveBattleSubject({
        state: grappled.state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            distanceMovedFeet: 5,
            destinationDistances: [{ combatantId: goblinId, feet: 5 }],
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("Grappled attack rolls have disadvantage against targets other than the grappler", () => {
    const state = startBattle({
      battleId: battleId("battle-grappled-attack-disadvantage"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Skeleton",
          initiative: 5,
        }),
      ],
    });
    const grappled = fighterGrapplesGoblin(state).state;
    const goblinTurn = requireResolved(
      endTurn({ state: grappled, actorId: fighterId }),
    ).state;
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
      statBlockSection: "actions",
    };
    const target = requireHole(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );

    expect(roll).toMatchObject({ rollMode: "disadvantage" });
    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            rollMode: "disadvantage",
          }),
        ],
      }),
    ).not.toMatchObject({ tag: "invalid" });

    const hiddenGoblinTurn: BattleState = {
      ...goblinTurn,
      combatants: new Map(goblinTurn.combatants).set(goblinId, {
        ...goblinTurn.combatants.get(goblinId)!,
        hidden: { discoveryDc: difficultyClass(16) },
      }),
    };
    const hiddenTarget = requireHole(
      resolveBattleSubject({ state: hiddenGoblinTurn, subject, fills: [] }),
      "targetChoice",
    );
    const hiddenRoll = requireHole(
      resolveBattleSubject({
        state: hiddenGoblinTurn,
        subject,
        fills: [targetFill(hiddenTarget, skeletonId)],
      }),
      "attackRoll",
    );

    expect(hiddenRoll).not.toHaveProperty("rollMode");
  });

  test("Dodge attack-roll Disadvantage requires seeing the attacker", () => {
    const state = fighterVsGoblinBattle();
    const dodged = requireResolved(
      resolveBattleSubject({
        state,
        subject: { tag: "action", actorId: fighterId, action: "dodge" },
        fills: [],
      }),
    ).state;
    const fighter = dodged.combatants.get(fighterId);
    if (fighter === undefined) {
      throw new Error("Expected Fighter combatant.");
    }
    const blindedDodger: BattleState = {
      ...dodged,
      combatants: new Map(dodged.combatants).set(fighterId, {
        ...fighter,
        conditions: applyCondition(fighter.conditions, "blinded"),
      }),
    };
    const goblinTurn = requireResolved(
      endTurn({ state: blindedDodger, actorId: fighterId }),
    ).state;
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
      statBlockSection: "actions",
    };
    const target = requireHole(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [targetFill(target, fighterId)],
      }),
      "attackRoll",
    );

    expect(roll).not.toHaveProperty("rollMode");
  });

  test("Grappled spell attack rolls have disadvantage against targets other than the grappler", () => {
    const state = startBattle({
      battleId: battleId("battle-grappled-spell-attack-disadvantage"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 10,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        skeletonCreatureInit({ initiative: 5 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "grapple",
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const outcome = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, wizardId)],
      }),
      "grappleOutcome",
    );
    const grappled = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, wizardId),
          grappleOutcomeFill(outcome, false),
        ],
      }),
    ).state;
    const wizardTurn = requireResolved(
      endTurn({ state: grappled, actorId: fighterId }),
    ).state;
    const spellSubject = magicSubject("ray_of_frost");
    const spellTarget = requireHole(
      resolveBattleSubject({
        state: wizardTurn,
        subject: spellSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: wizardTurn,
        subject: spellSubject,
        fills: [targetFill(spellTarget, skeletonId)],
      }),
      "attackRoll",
    );

    expect(roll).toMatchObject({ rollMode: "disadvantage" });
    expect(
      resolveBattleSubject({
        state: wizardTurn,
        subject: spellSubject,
        fills: [
          targetFill(spellTarget, skeletonId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("Hide stores discovery DC, grants Invisible while hidden, and Search can find the hidden creature", () => {
    const state = fighterVsGoblinBattle({
      hidePrerequisites: hidePrerequisites([
        [fighterId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
      ]),
    });
    const hideSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "hide",
    };
    const hide = findAct(state, hideSubject);
    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject: hideSubject,
        fills: [
          abilityCheckFill(findHole(hide.initialHoles, "abilityCheck"), 18),
        ],
      }),
    ).state;

    expect(snapshotBattle(hidden).combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hidden: { discoveryDc: difficultyClass(18) },
          conditions: expect.arrayContaining(["invisible"]),
        }),
      ]),
    );

    const goblinTurn = requireResolved(
      endTurn({ state: hidden, actorId: fighterId }),
    ).state;
    const searchSubject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "search",
    };
    const searchTarget = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: searchSubject,
        fills: [],
      }),
      "targetChoice",
    );
    expect(searchTarget).toMatchObject({ choices: [fighterId] });
    const searchCheck = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: searchSubject,
        fills: [targetFill(searchTarget, fighterId)],
      }),
      "abilityCheck",
    );
    expect(searchCheck).toMatchObject({
      kind: "abilityCheck",
      skill: "perception",
      dc: 18,
    });

    const found = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject: searchSubject,
        fills: [
          targetFill(searchTarget, fighterId),
          abilityCheckFill(searchCheck, 18),
        ],
      }),
    );
    expect(found.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hidden: null,
          conditions: expect.not.arrayContaining(["invisible"]),
        }),
      ]),
    );
  });

  test("Hide is unavailable without the RAW obscured/cover and sight prerequisite", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "hide",
    };

    expect(
      discoverBattleActs(state).map((act) => act.subject),
    ).not.toContainEqual(subject);
    expect(resolveBattleSubject({ state, subject, fills: [] })).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });
  });

  test("hidden attackers have Advantage and reveal when the attack roll is made", () => {
    const state = fighterVsGoblinBattle();
    const actor = state.combatants.get(fighterId)!;
    const hiddenState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...actor,
        hidden: { discoveryDc: difficultyClass(17) },
      }),
    };
    const target = attackInitialTargetHole(hiddenState);
    const roll = attackRollHoleAfterTarget(hiddenState, target);
    expect(roll).toMatchObject({ rollMode: "advantage" });

    const damageHoleResult = resolveBattleSubject({
      state: hiddenState,
      subject: fighterAttackSubject(),
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 20,
          naturalD20: 17,
          rollMode: "advantage",
        }),
      ],
    });
    expect(damageHoleResult).toMatchObject({
      tag: "needsHoles",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: fighterId, hidden: null }),
        ]),
      },
    });

    const missed = requireResolved(
      resolveBattleSubject({
        state: hiddenState,
        subject: fighterAttackSubject(),
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, {
            total: 1,
            naturalD20: 1,
            rollMode: "advantage",
          }),
        ],
      }),
    );
    expect(missed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: fighterId, hidden: null }),
      ]),
    );
  });

  test("hidden verbal spell attackers reveal through staged no-reaction spell-attack holes", () => {
    const state = wizardVsSkeletonBattle();
    const wizard = state.combatants.get(wizardId)!;
    const hiddenState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(wizardId, {
        ...wizard,
        hidden: { discoveryDc: difficultyClass(17) },
      }),
    };
    const subject = magicSubject("ray_of_frost");
    const targetHole = requireHole(
      resolveBattleSubject({ state: hiddenState, subject, fills: [] }),
      "targetChoice",
    );
    const attackHoleResult = resolveBattleSubject({
      state: hiddenState,
      subject,
      fills: [targetFill(targetHole, skeletonId)],
    });

    expect(attackHoleResult).toMatchObject({
      tag: "needsHoles",
      holes: [expect.not.objectContaining({ rollMode: "advantage" })],
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: wizardId, hidden: null }),
        ]),
      },
    });
    const attackHole = requireHole(attackHoleResult, "attackRoll");
    const damageHoleResult = resolveBattleSubject({
      state: hiddenState,
      subject,
      fills: [
        targetFill(targetHole, skeletonId),
        attackRollFill(attackHole, { total: 20, naturalD20: 17 }),
      ],
    });
    expect(damageHoleResult).toMatchObject({
      tag: "needsHoles",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: wizardId, hidden: null }),
        ]),
      },
    });
  });

  test("readied verbal spells reveal hidden casters when the spell is cast into readiness", () => {
    const state = wizardVsSkeletonBattle();
    const wizard = state.combatants.get(wizardId)!;
    const hiddenState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(wizardId, {
        ...wizard,
        hidden: { discoveryDc: difficultyClass(17) },
      }),
    };

    const readied = resolveBattleSubject({
      state: hiddenState,
      subject: {
        tag: "actionSpell",
        actorId: wizardId,
        spellId: "ray_of_frost",
        spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
        readyTrigger: "spellCast",
      },
      fills: [],
    });

    expect(readied).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: wizardId, hidden: null }),
        ]),
      },
    });
  });

  test("staged verbal spell damage keeps the caster revealed while requesting Concentration saves", () => {
    const state = wizardVsSkeletonBattle();
    const wizard = state.combatants.get(wizardId)!;
    const skeleton = state.combatants.get(skeletonId)!;
    const hiddenState: BattleState = {
      ...state,
      combatants: new Map(state.combatants)
        .set(wizardId, {
          ...wizard,
          hidden: { discoveryDc: difficultyClass(17) },
        })
        .set(skeletonId, {
          ...skeleton,
          concentration: {
            sourceSpellId: "mage_armor",
            effectKind: "spellEffect",
          },
        }),
    };
    const subject = magicSubject("magic_missile");
    const target = requireHole(
      resolveBattleSubject({ state: hiddenState, subject, fills: [] }),
      "targetChoice",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: hiddenState,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "rolledDice",
    );

    const concentration = resolveBattleSubject({
      state: hiddenState,
      subject,
      fills: [
        targetFill(target, skeletonId),
        damageRollFillWithGroups(damage, [[2, 2, 2]]),
      ],
    });

    expect(concentration).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "concentrationSavingThrow" }],
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: wizardId, hidden: null }),
        ]),
      },
    });
  });

  test("Rogue Cunning Action exposes Hide as a Bonus Action", () => {
    const state = startBattle({
      battleId: battleId("battle-rogue-cunning-action-hide"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "fighter", level: 1 }],
          characterUnitRefs: [
            {
              unitId: "class_rogue",
              supportProfiles: BATTLE_UNIT_SUPPORT_PROFILES,
            },
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
      hidePrerequisites: hidePrerequisites([
        [fighterId, { kind: "coverOutOfEnemyLineOfSight", cover: "total" }],
      ]),
    });
    const subject: BattleSubject = {
      tag: "bonusAction",
      actorId: fighterId,
      action: "hide",
    };
    const act = findAct(state, subject);

    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          abilityCheckFill(findHole(act.initialHoles, "abilityCheck"), 16),
        ],
      }),
    );
    expect(hidden.snapshot).toMatchObject({
      currentTurnResources: { currentHasBonusAction: false },
      combatants: expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hidden: { discoveryDc: difficultyClass(16) },
        }),
      ]),
    });
  });

  test("Off-Hand Attack requires a prior Attack action Light weapon attack and omits a positive damage modifier", () => {
    const state = startBattle({
      battleId: battleId("battle-off-hand"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
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
    const subject: BattleSubject = {
      tag: "bonusAction",
      actorId: fighterId,
      action: "offHandAttack",
      attackName: "Dagger",
    };

    expect(
      discoverBattleActs(state).map((act) => act.subject),
    ).not.toContainEqual(subject);
    expect(resolveBattleSubject({ state, subject, fills: [] })).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });

    const attackSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Shortsword",
    };
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(attackTarget, goblinId)],
      }),
      "attackRoll",
    );
    const afterQualifyingAttack = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, goblinId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;

    const target = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      label: "Dagger damage (1d4-piercing)",
    });
    expect(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
          damageRollFill(damage, 4),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentTurnResources: { currentHasBonusAction: false },
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 6 }),
        ]),
      },
    });
  });

  test("Off-Hand Attack distinguishes held weapon identity from weapon kind", () => {
    const state = startBattle({
      battleId: battleId("battle-off-hand-two-daggers"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testDaggerAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: "main:dagger-1",
              unitId: "weapon_dagger",
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: "off:dagger-2",
              unitId: "weapon_dagger",
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attackSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Dagger",
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const afterMainDagger = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;

    expect(
      discoverBattleActs(afterMainDagger).map((act) => act.subject),
    ).toContainEqual({
      tag: "bonusAction",
      actorId: fighterId,
      action: "offHandAttack",
      attackName: "Dagger",
    });
  });

  test("movement out of melee reach opens an Opportunity Attack window before distance changes", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        movementFill(hole, {
          movementCostFeet: 5,
          distanceMovedFeet: 5,
          destinationDistances: [{ combatantId: goblinId, feet: 10 }],
        }),
      ],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "opportunityAttack" }],
      snapshot: {
        pendingReaction: {
          frame: {
            choices: [
              {
                kind: "opportunityAttack",
                reactorId: goblinId,
                subject: {
                  command: "opportunityAttack",
                  reactorId: goblinId,
                  targetId: fighterId,
                  attackName: "Scimitar",
                },
              },
            ],
          },
        },
      },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    expect(
      awaitingReaction.state.combatantDistances.get(fighterId)?.get(goblinId),
    ).toBe(5);
  });

  test("stale movement fill data cannot suppress an Opportunity Attack", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const staleMovementValue = {
      movementCostFeet: 5,
      distanceMovedFeet: 5,
      destinationDistances: [{ combatantId: goblinId, feet: 10 }],
      provokesOpportunityAttacks: false,
    };
    const staleSuppressionFill = movementFill(hole, staleMovementValue);

    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [staleSuppressionFill],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "opportunityAttack" }],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    expect(
      awaitingReaction.state.combatantDistances.get(fighterId)?.get(goblinId),
    ).toBe(5);
  });

  test("declining an Opportunity Attack resumes the interrupted movement", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        movementFill(hole, {
          movementCostFeet: 5,
          distanceMovedFeet: 5,
          destinationDistances: [{ combatantId: goblinId, feet: 10 }],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }

    const declined = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        awaitingReaction.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: goblinId },
      ),
    });

    if (declined.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${declined.tag}.`);
    }
    expect(declined.snapshot.pendingReaction).toBeNull();
    expect(declined.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          movement: expect.objectContaining({
            spentFeet: 5,
            remainingFeet: 25,
          }),
        }),
        expect.objectContaining({
          combatantId: goblinId,
          reactionAvailable: true,
        }),
      ]),
    );
    expect(
      declined.state.combatantDistances.get(fighterId)?.get(goblinId),
    ).toBe(10);
  });

  test("resolving an Opportunity Attack spends reaction, applies damage, then resumes movement", () => {
    const state = fighterVsGoblinBattle();
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          distanceMovedFeet: 5,
          destinationDistances: [{ combatantId: goblinId, feet: 10 }],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = awaitingReaction.snapshot.pendingReaction!.frame.choices[0]!;
    const startedReaction = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        awaitingReaction.snapshot.pendingReaction!.decisionHole,
        {
          kind: "resolve",
          reactorId: goblinId,
          choice: {
            kind: "opportunityAttack",
            reactorId: goblinId,
            fills: [],
          },
        },
      ),
    });
    expect(startedReaction).toMatchObject({
      tag: "needsHoles",
      subject: choice.subject,
      holes: [{ kind: "attackRoll" }],
    });
    if (startedReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${startedReaction.tag}.`);
    }

    const attackRoll = findHole(startedReaction.holes, "attackRoll");
    const damage = requireHole(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
      }),
      "rolledDice",
    );
    const completed = resolveBattleSubject({
      state: startedReaction.state,
      subject: choice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 4),
      ],
    });

    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(completed.snapshot.pendingReaction).toBeNull();
    expect(completed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hp: 6,
          movement: expect.objectContaining({
            spentFeet: 5,
            remainingFeet: 25,
          }),
        }),
        expect.objectContaining({
          combatantId: goblinId,
          reactionAvailable: false,
        }),
      ]),
    );
    expect(
      completed.state.combatantDistances.get(fighterId)?.get(goblinId),
    ).toBe(10);
  });

  test("hidden opportunity attackers roll with Advantage and reveal after the attack roll", () => {
    const base = fighterVsGoblinBattle();
    const goblin = base.combatants.get(goblinId)!;
    const state: BattleState = {
      ...base,
      combatants: new Map(base.combatants).set(goblinId, {
        ...goblin,
        hidden: { discoveryDc: difficultyClass(16) },
      }),
    };
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          distanceMovedFeet: 5,
          destinationDistances: [{ combatantId: goblinId, feet: 10 }],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = awaitingReaction.snapshot.pendingReaction!.frame.choices[0]!;
    const startedReaction = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        awaitingReaction.snapshot.pendingReaction!.decisionHole,
        {
          kind: "resolve",
          reactorId: goblinId,
          choice: {
            kind: "opportunityAttack",
            reactorId: goblinId,
            fills: [],
          },
        },
      ),
    });
    if (startedReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${startedReaction.tag}.`);
    }
    const attackRoll = requireHole(startedReaction, "attackRoll");
    expect(attackRoll).toMatchObject({ rollMode: "advantage" });

    const missed = requireResolved(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [
          attackRollFill(attackRoll, {
            total: 1,
            naturalD20: 1,
            rollMode: "advantage",
          }),
        ],
      }),
    );
    expect(missed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: goblinId, hidden: null }),
      ]),
    );
  });

  test("attack resolution rejects an Unconscious current character at 0 HP", () => {
    const state = startBattle({
      battleId: battleId("battle-unconscious-actor-resolve"),
      combatants: [
        characterSeed({ initiative: 20, currentHp: 0 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: fighterId,
            hp: 0,
            zeroHpLifecycle: expect.objectContaining({
              policy: "usesDeathSavingThrows",
              dead: false,
            }),
            conditions: expect.arrayContaining([
              "incapacitated",
              "unconscious",
              "prone",
            ]),
          }),
        ]),
      },
    });
  });

  test("attack replay asks for a target before roll or damage", () => {
    const state = fighterVsGoblinBattle();
    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "targetChoice",
          label: "Attack target",
          choices: [goblinId],
        },
      ],
    });
  });

  test("attack replay asks for an attack roll after target selection", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = requireHole(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        fills: [],
      }),
      "targetChoice",
    );

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [targetFill(targetHole, goblinId)],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll", label: "Longsword attack roll" }],
    });
  });

  test("attack hit asks for Longsword damage dice before spending the action", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = requireHole(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        fills: [],
      }),
      "targetChoice",
    );
    const rollHole = requireHole(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        fills: [targetFill(targetHole, goblinId)],
      }),
      "attackRoll",
    );

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          label: "Longsword damage (1d8+3-slashing)",
          attack: {
            weapon: { id: "weapon_longsword" },
            ability: "str",
            abilityModifier: 3,
          },
        },
      ],
      snapshot: {
        currentTurnResources: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("attack hit procedures open a typed reaction window and resume after decline", () => {
    const state = fighterTurnWithReadiedRay("attackHit");
    const subject = fighterAttackSubject();
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const fills = [
      targetFill(targetHole, goblinId),
      attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
    ];
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }

    expect(awaitingReaction.snapshot.pendingReaction).toMatchObject({
      decisionHole: {
        kind: "reactionDecision",
        trigger: "attackHit",
        eligibleReactors: [wizardId],
      },
      stackDepth: 1,
    });
    expect(
      resolveBattleSubject({ state: awaitingReaction.state, subject, fills }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });

    const declined = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        awaitingReaction.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: wizardId },
      ),
    });

    expect(declined).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: {
        pendingReaction: null,
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: wizardId,
            reactionAvailable: true,
          }),
        ]),
      },
    });
  });

  test("resolved reactions execute the admitted readied-spell procedure before resuming attack replay", () => {
    const state = fighterTurnWithReadiedRay("attackHit");
    const subject = fighterAttackSubject();
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const fills = [
      targetFill(targetHole, goblinId),
      attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
    ];
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = awaitingReaction.snapshot.pendingReaction!.frame.choices[0]!;

    const resolved = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        awaitingReaction.snapshot.pendingReaction!.decisionHole,
        {
          kind: "resolve",
          reactorId: wizardId,
          choice: {
            kind: "releaseReadiedSpell",
            readiedSpellCasterId: wizardId,
            fills: [],
          },
        },
      ),
    });

    expect(resolved).toMatchObject({
      tag: "needsHoles",
      subject: choice.subject,
      holes: [{ kind: "targetChoice" }],
      snapshot: {
        pendingReaction: {
          frame: {
            activeReaction: {
              reactorId: wizardId,
            },
          },
        },
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: wizardId,
            reactionAvailable: false,
          }),
        ]),
      },
    });
    if (resolved.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${resolved.tag}.`);
    }
    const reactionTarget = findHole(resolved.holes, "targetChoice");
    const reactionAttack = requireHole(
      resolveBattleSubject({
        state: resolved.state,
        subject: choice.subject,
        fills: [targetFill(reactionTarget, goblinId)],
      }),
      "attackRoll",
    );
    const reactionDamage = requireHole(
      resolveBattleSubject({
        state: resolved.state,
        subject: choice.subject,
        fills: [
          targetFill(reactionTarget, goblinId),
          attackRollFill(reactionAttack, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const resumed = resolveBattleSubject({
      state: resolved.state,
      subject: choice.subject,
      fills: [
        targetFill(reactionTarget, goblinId),
        attackRollFill(reactionAttack, { total: 15, naturalD20: 10 }),
        damageRollFill(reactionDamage, 4),
      ],
    });

    expect(resumed).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: {
        pendingReaction: null,
        readiedSpells: [],
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: wizardId,
            reactionAvailable: false,
          }),
        ]),
      },
    });
  });

  test("nested reaction windows resume a released readied save spell before the interrupted attack", () => {
    const state = fighterTurnWithReadiedAcidAndSecondReadiedRay();
    const subject = fighterAttackSubject();
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const awaitingAttackReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
      ],
    });
    if (awaitingAttackReaction.tag !== "needsHoles") {
      throw new Error(
        `Expected attack reaction window, got ${awaitingAttackReaction.tag}.`,
      );
    }
    const releaseChoice =
      awaitingAttackReaction.snapshot.pendingReaction!.frame.choices[0]!;
    const released = resolveBattleReaction({
      state: awaitingAttackReaction.state,
      fill: reactionDecisionFill(
        awaitingAttackReaction.snapshot.pendingReaction!.decisionHole,
        {
          kind: "resolve",
          reactorId: wizardId,
          choice: {
            kind: "releaseReadiedSpell",
            readiedSpellCasterId: wizardId,
            fills: [],
          },
        },
      ),
    });
    if (released.tag !== "needsHoles") {
      throw new Error(`Expected released spell holes, got ${released.tag}.`);
    }
    const saveHole = findHole(released.holes, "savingThrowOutcome");
    if (saveHole.kind !== "savingThrowOutcome") {
      throw new Error("Expected Saving Throw outcome hole.");
    }
    const failedOutcomes = saveHole.areaChoices[0]!.affectedTargetIds.map(
      (targetId) => ({ targetId, succeeded: false }),
    );
    const nestedReaction = resolveBattleSubject({
      state: released.state,
      subject: releaseChoice.subject,
      fills: [savingThrowOutcomeFill(saveHole, failedOutcomes)],
    });

    expect(nestedReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "saveFailed" }],
      snapshot: {
        pendingReaction: {
          stackDepth: 2,
          frame: {
            trigger: "saveFailed",
            choices: [
              expect.objectContaining({ readiedSpellCasterId: secondWizardId }),
            ],
          },
        },
      },
    });
    if (nestedReaction.tag !== "needsHoles") {
      throw new Error(`Expected nested reaction, got ${nestedReaction.tag}.`);
    }

    const declinedNested = resolveBattleReaction({
      state: nestedReaction.state,
      fill: reactionDecisionFill(
        nestedReaction.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: secondWizardId },
      ),
    });

    expect(declinedNested).toMatchObject({
      tag: "needsHoles",
      subject: releaseChoice.subject,
      holes: [{ kind: "rolledDice" }],
      snapshot: {
        pendingReaction: {
          stackDepth: 1,
          frame: {
            activeReaction: { reactorId: wizardId },
          },
        },
      },
    });
    if (declinedNested.tag !== "needsHoles") {
      throw new Error(
        `Expected released spell damage hole, got ${declinedNested.tag}.`,
      );
    }

    const spellDamage = findHole(declinedNested.holes, "rolledDice");
    const afterSpellDamage = resolveBattleSubject({
      state: declinedNested.state,
      subject: releaseChoice.subject,
      fills: [
        savingThrowOutcomeFill(saveHole, failedOutcomes),
        damageRollFill(spellDamage, 4),
      ],
    });
    const resumedAttack =
      afterSpellDamage.tag === "needsHoles" &&
      afterSpellDamage.holes.every(
        (hole) => hole.kind === "concentrationSavingThrow",
      )
        ? resolveBattleSubject({
            state: declinedNested.state,
            subject: releaseChoice.subject,
            fills: [
              savingThrowOutcomeFill(saveHole, failedOutcomes),
              damageRollFill(spellDamage, 4),
              ...afterSpellDamage.holes.map((hole) =>
                concentrationSavingThrowFill(hole, true),
              ),
            ],
          })
        : afterSpellDamage;

    expect(resumedAttack).toMatchObject({
      tag: "needsHoles",
      subject,
      holes: [{ kind: "rolledDice" }],
      snapshot: {
        pendingReaction: null,
        readiedSpells: [{ casterId: secondWizardId }],
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: wizardId,
            reactionAvailable: false,
            concentration: null,
          }),
          expect.objectContaining({
            combatantId: secondWizardId,
            reactionAvailable: true,
          }),
        ]),
      },
    });
  });

  test("spell cast procedures open typed reaction windows", () => {
    const state = wizardTurnWithReadiedRay("spellCast");
    const subject = magicSubject("magic_missile");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, skeletonId)],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "spellCast" }],
      snapshot: {
        pendingReaction: {
          frame: { trigger: "spellCast" },
        },
      },
    });
  });

  test("save-failed and after-damage spell procedures open typed reaction windows", () => {
    const saveState = wizardTurnWithReadiedRay("saveFailed");
    const subject = magicSubject("acid_splash");
    const saveHole = requireHole(
      resolveBattleSubject({ state: saveState, subject, fills: [] }),
      "savingThrowOutcome",
    );
    if (saveHole.kind !== "savingThrowOutcome") {
      throw new Error("Expected Saving Throw outcome hole.");
    }
    const saveOutcomes = saveHole.areaChoices[0]!.affectedTargetIds.map(
      (targetId) => ({ targetId, succeeded: false }),
    );
    const failedSave = resolveBattleSubject({
      state: saveState,
      subject,
      fills: [savingThrowOutcomeFill(saveHole, saveOutcomes)],
    });
    expect(failedSave).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "saveFailed" }],
    });

    const damageState = wizardTurnWithReadiedRay("afterDamage");
    const damageSaveHole = requireHole(
      resolveBattleSubject({ state: damageState, subject, fills: [] }),
      "savingThrowOutcome",
    );
    if (damageSaveHole.kind !== "savingThrowOutcome") {
      throw new Error("Expected Saving Throw outcome hole.");
    }
    const damageOutcomes = damageSaveHole.areaChoices[0]!.affectedTargetIds.map(
      (targetId) => ({ targetId, succeeded: false }),
    );
    const damageHole = requireHole(
      resolveBattleSubject({
        state: damageState,
        subject,
        fills: [savingThrowOutcomeFill(damageSaveHole, damageOutcomes)],
      }),
      "rolledDice",
    );
    const maybeConcentration = resolveBattleSubject({
      state: damageState,
      subject,
      fills: [
        savingThrowOutcomeFill(damageSaveHole, damageOutcomes),
        damageRollFill(damageHole, 4),
      ],
    });
    const afterDamage =
      maybeConcentration.tag === "needsHoles" &&
      maybeConcentration.holes[0]?.kind === "concentrationSavingThrow"
        ? resolveBattleSubject({
            state: damageState,
            subject,
            fills: [
              savingThrowOutcomeFill(damageSaveHole, damageOutcomes),
              damageRollFill(damageHole, 4),
              concentrationSavingThrowFill(maybeConcentration.holes[0], true),
            ],
          })
        : maybeConcentration;
    expect(afterDamage).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "afterDamage" }],
    });
  });

  test("Dodge projects Advantage for Dexterity saving throw outcome holes", () => {
    const base = wizardVsSkeletonBattle();
    const skeleton = base.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected Skeleton combatant.");
    }
    const state: BattleState = {
      ...base,
      combatants: new Map(base.combatants).set(skeletonId, {
        ...skeleton,
        conditions: applyCondition(skeleton.conditions, "blinded"),
        dodging: true,
      }),
    };
    const saveHole = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("acid_splash"),
        fills: [],
      }),
      "savingThrowOutcome",
    );

    expect(saveHole).toMatchObject({
      ability: "dex",
      targetRollModes: [{ targetId: skeletonId, rollMode: "advantage" }],
    });
  });

  test("Ready stores the runtime-selected trigger without test-only state surgery", () => {
    for (const trigger of BATTLE_READIED_SPELL_TRIGGERS) {
      const state = wizardVsSkeletonBattle();
      const readied = resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "ray_of_frost",
          spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
          readyTrigger: trigger,
        },
        fills: [],
      });

      expect(readied).toMatchObject({ tag: "resolved" });
      if (readied.tag !== "resolved") {
        throw new Error(`Expected resolved Ready Spell, got ${readied.tag}.`);
      }
      expect(readied.state.readiedSpells.get(wizardId)?.trigger).toBe(trigger);
    }
  });

  test("Ready trigger selection is rejected for non-Ready spell subjects", () => {
    expect(
      resolveBattleSubject({
        state: wizardVsSkeletonBattle(),
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "ray_of_frost",
          spellActId: "cantripSpellAttack:ray_of_frost",
          readyTrigger: "afterDamage",
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
    });
  });

  test("Ready Spell rejects readied spell subjects without a selected trigger", () => {
    expect(
      resolveBattleSubject({
        state: wizardVsSkeletonBattle(),
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "ray_of_frost",
          spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
    });
  });

  test("after-damage reactions observe the post-damage battle state", () => {
    const state = fighterTurnWithReadiedRay("afterDamage");
    const subject = fighterAttackSubject();
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
      total: 15,
      naturalD20: 10,
    });
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "afterDamage" }],
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 3 }),
        ]),
        currentTurnResources: { actionResources: [] },
      },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }

    const choice = awaitingReaction.snapshot.pendingReaction!.frame.choices[0]!;
    const resolved = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        awaitingReaction.snapshot.pendingReaction!.decisionHole,
        {
          kind: "resolve",
          reactorId: wizardId,
          choice: {
            kind: "releaseReadiedSpell",
            readiedSpellCasterId: wizardId,
            fills: [],
          },
        },
      ),
    });

    expect(resolved).toMatchObject({
      tag: "needsHoles",
      subject: choice.subject,
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 3 }),
        ]),
      },
    });
  });

  test("reaction decision schema parses nested reaction procedure fills", () => {
    const decoded = Schema.decodeUnknownEither(BattleFillSchema)({
      kind: "reactionDecision",
      holeId: "battle:reaction:decision",
      value: {
        kind: "resolve",
        reactorId: "wizard",
        choice: {
          kind: "releaseReadiedSpell",
          readiedSpellCasterId: "wizard",
          fills: [
            {
              kind: "notARealFill",
              holeId: "battle:spell:target",
              value: "goblin",
            },
          ],
        },
      },
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("attack miss spends the action without asking for weapon damage", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 14, naturalD20: 9 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentTurnResources: {
          actionResources: [],
        },
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 10 },
        ],
      },
    });
  });

  test("natural 1 attack roll misses even when the total meets Armor Class", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 99, naturalD20: 1 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: { currentTurnResources: { actionResources: [] } },
    });
  });

  test("natural 20 attack roll hits even when the total is below Armor Class", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 20 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [
        { kind: "rolledDice", label: "Longsword damage (2d8+3-slashing)" },
      ],
      snapshot: {
        currentTurnResources: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("attack replay rejects invalid natural d20 attack-roll results", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 21 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      snapshot: {
        currentTurnResources: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("attack replay rejects damage fills on a miss", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 14, naturalD20: 9 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("attack replay rejects damage dice outside the selected weapon expression", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 99),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      snapshot: {
        currentTurnResources: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("attack replay rejects damage dice count that does not match the selected weapon", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFillWithGroups(damageHole, [[4], [5]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      snapshot: {
        currentTurnResources: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("critical hit requires doubled weapon damage dice", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
      total: 20,
      naturalD20: 20,
    });

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[4, 5]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 0, defeated: true },
        ],
      },
    });
  });

  test("attack rejects a non-current actor", () => {
    const state = fighterVsGoblinBattle();

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: goblinId,
        action: "attack",
        attackName: "Scimitar",
      },
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "wrongActor",
    });
  });

  test("filled attack hit spends the action and applies rolled weapon damage to HP", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentTurnResources: {
          actionResources: [],
        },
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 3, tempHp: 0, defeated: false },
        ],
      },
    });
  });

  test("attack damage removes Temporary Hit Points before HP", () => {
    const state = startBattle({
      battleId: battleId("battle-temp-hp"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10, tempHp: 5 }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 8, tempHp: 0, defeated: false },
        ],
      },
    });
  });

  test("attack damage clamps Stat Block creature HP at 0 and marks Goblin Warrior dead", () => {
    const state = startBattle({
      battleId: battleId("battle-stat-block-zero"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10, currentHp: 3 }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 8),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: goblinId,
            hp: 0,
            tempHp: 0,
            defeated: true,
            zeroHpLifecycle: { policy: "diesAtZeroHp", dead: true },
          },
        ],
      },
    });
  });

  test("character target at 0 HP enters the death-save lifecycle scaffold", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattle({
      battleId: battleId("battle-character-zero"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 3,
          attack: null,
        }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 8),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            defeated: true,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              stable: false,
              dead: false,
            },
            conditions: expect.arrayContaining(["unconscious", "prone"]),
          },
        ],
      },
    });
  });

  test("massive damage kills a character when remaining damage equals maximum HP", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattle({
      battleId: battleId("battle-character-massive-damage"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 3,
          attack: null,
        }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
      total: 20,
      naturalD20: 20,
    });

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[8, 8]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { failures: 3 },
              dead: true,
            },
          },
        ],
      },
    });
  });

  test("damage at 0 HP kills when damage equals maximum HP", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattle({
      battleId: battleId("battle-character-zero-massive-damage"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 0,
          attack: null,
        }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
      total: 20,
      naturalD20: 20,
    });

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[5, 5]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { failures: 3 },
              dead: true,
            },
          },
        ],
      },
    });
  });

  test("later critical attack damage at 0 HP projects a dead death-save lifecycle", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattle({
      battleId: battleId("battle-character-zero-damage"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 0,
          attack: null,
        }),
      ],
    });
    const firstDamageResult = criticalAttackDamageResult(
      state,
      targetCharacterId,
    );
    if (firstDamageResult.tag !== "resolved") {
      throw new Error(
        `Expected resolved first damage, got ${firstDamageResult.tag}.`,
      );
    }
    const secondDamageState = {
      ...firstDamageResult.state,
      currentTurnResources: {
        actionResources: [{ kind: "action", source: "turn" }],
        currentHasBonusAction: true,
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;

    const result = criticalAttackDamageResult(
      secondDamageState,
      targetCharacterId,
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            defeated: true,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 3 },
              stable: false,
              dead: true,
            },
          },
        ],
      },
    });
  });

  test("End Turn asks for a Death Saving Throw when the next actor starts at 0 HP", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattle({
      battleId: battleId("battle-character-start-turn-death-save"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 0,
          attack: null,
        }),
      ],
    });

    const result = endTurn({ state, actorId: fighterId });

    expect(result).toMatchObject({
      tag: "needsHoles",
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      },
      holes: [
        {
          kind: "deathSavingThrow",
          label: "Death Saving Throw",
          combatantId: targetCharacterId,
        },
      ],
    });
  });

  test("End Turn consumes a failed Death Saving Throw for the next actor", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattle({
      battleId: battleId("battle-character-start-turn-death-save-fail"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 0,
          attack: null,
        }),
      ],
    });
    const needsRoll = endTurn({ state, actorId: fighterId });
    const deathSaveHole = requireHole(needsRoll, "deathSavingThrow");

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      },
      fills: [deathSavingThrowFill(deathSaveHole, 5)],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: targetCharacterId,
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            conditions: expect.arrayContaining(["unconscious", "prone"]),
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 1 },
              stable: false,
              dead: false,
            },
          },
        ],
      },
    });
  });

  test("Death Saving Throw success three makes the next actor Stable", () => {
    const targetCharacterId = combatantId("target-character");
    const state = characterWithDeathSaveCounters({
      combatantId: targetCharacterId,
      successes: 2,
      failures: 1,
    });
    const needsRoll = endTurn({ state, actorId: fighterId });
    const deathSaveHole = requireHole(needsRoll, "deathSavingThrow");

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      },
      fills: [deathSavingThrowFill(deathSaveHole, 10)],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: targetCharacterId,
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            conditions: expect.arrayContaining(["unconscious", "prone"]),
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              stable: true,
              dead: false,
            },
          },
        ],
      },
    });
  });

  test("Death Saving Throw natural 20 restores 1 HP and ends Unconscious", () => {
    const targetCharacterId = combatantId("target-character");
    const state = characterWithDeathSaveCounters({
      combatantId: targetCharacterId,
      successes: 1,
      failures: 2,
    });
    const needsRoll = endTurn({ state, actorId: fighterId });
    const deathSaveHole = requireHole(needsRoll, "deathSavingThrow");

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      },
      fills: [deathSavingThrowFill(deathSaveHole, 20)],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: targetCharacterId,
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 1,
            conditions: ["prone"],
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              stable: false,
              dead: false,
            },
          },
        ],
      },
    });
  });

  test("snapshotBattle projects current acts from the supplied state", () => {
    const state = {
      ...startBattle({
        battleId: battleId("battle-1"),
        combatants: [
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: false,
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;

    expect(
      snapshotBattle(state).acts.map((act) => subjectName(act.subject)),
    ).toEqual(["move", "endTurn"]);
  });

  test("endTurn advances to the next Initiative actor and refreshes turn resources", () => {
    const state = {
      ...startBattle({
        battleId: battleId("battle-1"),
        combatants: [
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: false,
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;

    const result = endTurn({ state, actorId: fighterId });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: goblinId,
        round: 1,
        turnOrder: [fighterId, goblinId],
        currentTurnResources: {
          actionResources: [{ kind: "action", source: "turn" }],
          currentHasBonusAction: true,
        },
      },
    });
  });

  test("endTurn rejects a non-current actor", () => {
    const state = fighterVsGoblinBattle();

    const result = endTurn({ state, actorId: goblinId });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "wrongActor",
      snapshot: {
        currentActorId: fighterId,
        round: 1,
      },
    });
  });

  test("Goblin Warrior discovers authored Scimitar and Shortbow attacks", () => {
    const afterFighter = endTurn({
      state: fighterVsGoblinBattle(),
      actorId: fighterId,
    });
    if (afterFighter.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${afterFighter.tag}.`);
    }

    const acts = discoverBattleActs(afterFighter.state);

    expect(acts.map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Scimitar",
        },
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Shortbow",
        },
        { tag: "runtimeCommand", actorId: goblinId, command: "move" },
        { tag: "runtimeCommand", actorId: goblinId, command: "endTurn" },
      ]),
    );
  });

  test("Stat Block limited-use resources are initialized from authored monster controls", () => {
    const state = startBattle({
      battleId: battleId("battle-monster-resource-init"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({
          initiative: 10,
          statBlock: monsterResourceStatBlock(),
        }),
      ],
    });

    expect(state.combatants.get(goblinId)?.origin).toMatchObject({
      kind: "statBlock",
      resources: {
        legendaryActionUsesRemaining: 2,
        dailyUses: [
          {
            key: { section: "actions", name: "Dread Gaze" },
            usesRemaining: 1,
          },
        ],
        unavailableRechargeParts: [],
        unavailableRestRechargeParts: [],
      },
    });
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: goblinId,
        statBlockResources: {
          legendaryActions: { usesMax: 2, usesRemaining: 2 },
          limitedUses: expect.arrayContaining([
            {
              key: { section: "actions", name: "Cinder Breath" },
              kind: "recharge",
              minimumRoll: 5,
              available: true,
            },
            {
              key: { section: "actions", name: "Dread Gaze" },
              kind: "daily",
              usesMax: 1,
              usesRemaining: 1,
            },
          ]),
        },
      }),
    );
  });

  test("Stat Block Bonus Action and Reaction attacks do not enter the Attack action lane", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattle({
          battleId: battleId("battle-monster-unsupported-sections"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock:
                monsterResourceStatBlockWithUnsupportedAttackSections(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;

    expect(
      discoverBattleActs(goblinTurn).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          (act.subject.attackName === "Swift Bite" ||
            act.subject.attackName === "Counter Snap"),
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject: {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Swift Bite",
          statBlockSection: "bonusActions",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "unsupportedActOption" });
    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject: {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Counter Snap",
          statBlockSection: "reactions",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "unsupportedActOption" });
  });

  test("Recharge attacks spend availability and use a start-turn d6 roll to return", () => {
    const firstGoblinTurn = requireResolved(
      endTurn({
        state: startBattle({
          battleId: battleId("battle-monster-recharge"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterResourceStatBlock(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject = monsterAttackSubject("Cinder Breath");
    const targetHole = attackInitialTargetHole(firstGoblinTurn, subject);
    const rollHole = attackRollHoleAfterTarget(
      firstGoblinTurn,
      targetHole,
      subject,
      fighterId,
    );
    const damageHole = attackDamageHoleAfterHit(
      firstGoblinTurn,
      targetHole,
      rollHole,
      { total: 20, naturalD20: 12 },
      subject,
      fighterId,
    );
    const spent = requireResolved(
      resolveBattleSubject({
        state: firstGoblinTurn,
        subject,
        fills: [
          targetFill(targetHole, fighterId),
          attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
          damageRollFillWithGroups(damageHole, [[3]]),
        ],
      }),
    ).state;

    expect(
      discoverBattleActs(spent).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.attackName === "Cinder Breath",
      ),
    ).toBe(false);

    const fighterTurn = requireResolved(
      endTurn({ state: spent, actorId: goblinId }),
    ).state;
    const rechargeRequest = endTurn({ state: fighterTurn, actorId: fighterId });
    expect(rechargeRequest).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "statBlockRechargeRoll",
          rechargeTargets: [{ section: "actions", name: "Cinder Breath" }],
        },
      ],
    });
    if (rechargeRequest.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${rechargeRequest.tag}.`);
    }
    const recharged = requireResolved(
      resolveBattleSubject({
        state: fighterTurn,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "endTurn",
        },
        fills: [
          {
            kind: "statBlockRechargeRoll",
            holeId: rechargeRequest.holes[0].holeId,
            value: [
              {
                target: { section: "actions", name: "Cinder Breath" },
                roll: DieRollResult(5),
              },
            ],
          },
        ],
      }),
    ).state;

    expect(
      discoverBattleActs(recharged).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.attackName === "Cinder Breath",
      ),
    ).toBe(true);
  });

  test("Daily Stat Block attacks spend uses and are hidden when depleted", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattle({
          battleId: battleId("battle-monster-daily"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterResourceStatBlock(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject = monsterAttackSubject("Dread Gaze");
    const targetHole = attackInitialTargetHole(goblinTurn, subject);
    const rollHole = attackRollHoleAfterTarget(
      goblinTurn,
      targetHole,
      subject,
      fighterId,
    );
    const damageHole = attackDamageHoleAfterHit(
      goblinTurn,
      targetHole,
      rollHole,
      { total: 20, naturalD20: 12 },
      subject,
      fighterId,
    );
    const spent = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          targetFill(targetHole, fighterId),
          attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
          damageRollFillWithGroups(damageHole, [[3]]),
        ],
      }),
    ).state;

    expect(spent.combatants.get(goblinId)?.origin).toMatchObject({
      kind: "statBlock",
      resources: {
        dailyUses: [
          {
            key: { section: "actions", name: "Dread Gaze" },
            usesRemaining: 0,
          },
        ],
      },
    });
    expect(
      discoverBattleActs(spent).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.attackName === "Dread Gaze",
      ),
    ).toBe(false);
  });

  test("Recharge rolls are independent for each unavailable Stat Block part", () => {
    const state = startBattle({
      battleId: battleId("battle-monster-multi-recharge"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({
          initiative: 10,
          statBlock: monsterResourceStatBlockWithTwoRechargeActions(),
        }),
      ],
    });
    const goblin = state.combatants.get(goblinId);
    if (goblin?.origin.kind !== "statBlock") {
      throw new Error("Expected Stat Block goblin.");
    }
    const spentState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(goblinId, {
        ...goblin,
        origin: {
          ...goblin.origin,
          resources: {
            ...goblin.origin.resources,
            unavailableRechargeParts: [
              { section: "actions", name: "Cinder Breath" },
              { section: "actions", name: "Ash Cloud" },
            ],
          },
        },
      }),
    };

    const rechargeRequest = endTurn({ state: spentState, actorId: fighterId });
    expect(rechargeRequest).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "statBlockRechargeRoll",
          rechargeTargets: [
            { section: "actions", name: "Cinder Breath" },
            { section: "actions", name: "Ash Cloud" },
          ],
        },
      ],
    });
    if (rechargeRequest.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${rechargeRequest.tag}.`);
    }

    const recharged = requireResolved(
      resolveBattleSubject({
        state: spentState,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "endTurn",
        },
        fills: [
          {
            kind: "statBlockRechargeRoll",
            holeId: rechargeRequest.holes[0].holeId,
            value: [
              {
                target: { section: "actions", name: "Cinder Breath" },
                roll: DieRollResult(4),
              },
              {
                target: { section: "actions", name: "Ash Cloud" },
                roll: DieRollResult(6),
              },
            ],
          },
        ],
      }),
    ).state;

    const rechargedGoblin = recharged.combatants.get(goblinId);
    if (rechargedGoblin?.origin.kind !== "statBlock") {
      throw new Error("Expected recharged Stat Block goblin.");
    }
    expect(
      rechargedGoblin.origin.resources.unavailableRechargeParts,
    ).toContainEqual({ section: "actions", name: "Cinder Breath" });
    expect(
      rechargedGoblin.origin.resources.unavailableRechargeParts,
    ).not.toContainEqual({ section: "actions", name: "Ash Cloud" });
  });

  test("Legendary Action attacks are Stat Block acts after another creature's turn", () => {
    const state = requireResolved(
      endTurn({
        state: startBattle({
          battleId: battleId("battle-monster-legendary"),
          combatants: [
            characterSeed({ initiative: 20 }),
            characterSeed({
              combatantId: distantFighterId,
              displayName: "Distant Fighter",
              initiative: 15,
            }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterResourceStatBlock(),
            }),
          ],
          combatantDistances: [
            {
              combatantA: fighterId,
              combatantB: goblinId,
              feet: movementFeet(5),
            },
            {
              combatantA: distantFighterId,
              combatantB: goblinId,
              feet: movementFeet(5),
            },
            {
              combatantA: fighterId,
              combatantB: distantFighterId,
              feet: movementFeet(5),
            },
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const legendaryAct = discoverBattleActs(state).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Tail Swipe" &&
        act.subject.statBlockSection === "legendaryActions",
    );
    if (legendaryAct === undefined) {
      throw new Error("Expected Tail Swipe Legendary Action act.");
    }
    const subject = legendaryAct.subject as Extract<
      BattleSubject,
      { readonly tag: "action" }
    >;
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(
      state,
      targetHole,
      subject,
      fighterId,
    );
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 20, naturalD20: 12 },
      subject,
      fighterId,
    );
    const afterLegendary = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(targetHole, fighterId),
          attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
          damageRollFillWithGroups(damageHole, [[2]]),
        ],
      }),
    ).state;

    expect(afterLegendary.currentTurnResources).toEqual(
      state.currentTurnResources,
    );
    expect(afterLegendary.combatants.get(goblinId)?.origin).toMatchObject({
      kind: "statBlock",
      resources: { legendaryActionUsesRemaining: 1 },
    });
    expect(
      discoverBattleActs(afterLegendary).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.statBlockSection === "legendaryActions",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: afterLegendary,
        subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
  });

  test("Legendary Action window closes when the next actor proceeds", () => {
    const state = requireResolved(
      endTurn({
        state: startBattle({
          battleId: battleId("battle-monster-legendary-window-close"),
          combatants: [
            characterSeed({ initiative: 20 }),
            characterSeed({
              combatantId: distantFighterId,
              displayName: "Distant Fighter",
              initiative: 15,
            }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterResourceStatBlock(),
            }),
          ],
          combatantDistances: [
            {
              combatantA: fighterId,
              combatantB: goblinId,
              feet: movementFeet(5),
            },
            {
              combatantA: distantFighterId,
              combatantB: goblinId,
              feet: movementFeet(5),
            },
            {
              combatantA: fighterId,
              combatantB: distantFighterId,
              feet: movementFeet(5),
            },
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const distantSubject: BattleSubject = {
      tag: "action",
      actorId: distantFighterId,
      action: "attack",
      attackName: "Longsword",
    };
    const targetHole = attackInitialTargetHole(state, distantSubject);
    const rollHole = attackRollHoleAfterTarget(
      state,
      targetHole,
      distantSubject,
      goblinId,
    );
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 20, naturalD20: 12 },
      distantSubject,
      goblinId,
    );
    const afterDistantFighterActs = requireResolved(
      resolveBattleSubject({
        state,
        subject: distantSubject,
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
          damageRollFillWithGroups(damageHole, [[2]]),
        ],
      }),
    ).state;

    expect(
      discoverBattleActs(afterDistantFighterActs).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.statBlockSection === "legendaryActions",
      ),
    ).toBe(false);
  });

  test("Legendary Action attacks are not exposed before an eligible turn-end window", () => {
    const state = startBattle({
      battleId: battleId("battle-monster-legendary-negative-initial"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({
          initiative: 10,
          statBlock: monsterResourceStatBlock(),
        }),
      ],
    });

    expect(
      discoverBattleActs(state).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.statBlockSection === "legendaryActions",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: monsterAttackSubject("Tail Swipe", "legendaryActions"),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
  });

  test("Legendary Action attacks are not exposed on the monster's own current turn", () => {
    const ownTurn = requireResolved(
      endTurn({
        state: startBattle({
          battleId: battleId("battle-monster-legendary-negative-own-turn"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterResourceStatBlock(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;

    expect(
      discoverBattleActs(ownTurn).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.statBlockSection === "legendaryActions",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: ownTurn,
        subject: monsterAttackSubject("Tail Swipe", "legendaryActions"),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
  });

  test("Goblin Warrior Scimitar attack derives roll bonus and damage from the Stat Block", () => {
    const state = goblinTurnBattle();
    const subject = goblinAttackSubject("Scimitar");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const rollHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(targetHole, fighterId)],
      }),
      "attackRoll",
    );

    expect(rollHole).toMatchObject({
      kind: "attackRoll",
      label: "Scimitar attack roll",
      attackBonus: 4,
      attack: {
        kind: "statBlockAttack",
        attack: { name: "Scimitar" },
      },
    });

    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(targetHole, fighterId),
          attackRollFill(rollHole, { total: 14, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    expect(damageHole).toMatchObject({
      kind: "rolledDice",
      holeId: "battle:attack:damage-result:1d6+2-slashing",
      label: "Scimitar damage (1d6+2-slashing)",
      critical: false,
    });
  });

  test("Goblin Warrior target legality is derived from authored reach and range", () => {
    const state = startBattle({
      battleId: battleId("battle-goblin-target-legality"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({ initiative: 10 }),
        characterSeed({
          combatantId: distantFighterId,
          displayName: "Distant Fighter",
          initiative: 9,
        }),
        characterSeed({
          combatantId: longRangeFighterId,
          displayName: "Long Range Fighter",
          initiative: 8,
        }),
      ],
      combatantDistances: [
        { combatantA: goblinId, combatantB: fighterId, feet: movementFeet(5) },
        {
          combatantA: goblinId,
          combatantB: distantFighterId,
          feet: movementFeet(10),
        },
        {
          combatantA: goblinId,
          combatantB: longRangeFighterId,
          feet: movementFeet(100),
        },
        {
          combatantA: fighterId,
          combatantB: distantFighterId,
          feet: movementFeet(10),
        },
        {
          combatantA: fighterId,
          combatantB: longRangeFighterId,
          feet: movementFeet(100),
        },
        {
          combatantA: distantFighterId,
          combatantB: longRangeFighterId,
          feet: movementFeet(90),
        },
      ],
    });

    const scimitarTargetHole = requireHole(
      resolveBattleSubject({
        state,
        subject: goblinAttackSubject("Scimitar"),
        fills: [],
      }),
      "targetChoice",
    );
    const shortbowTargetHole = requireHole(
      resolveBattleSubject({
        state,
        subject: goblinAttackSubject("Shortbow"),
        fills: [],
      }),
      "targetChoice",
    );
    if (
      scimitarTargetHole.kind !== "targetChoice" ||
      shortbowTargetHole.kind !== "targetChoice"
    ) {
      throw new Error("Expected targetChoice holes.");
    }

    expect(scimitarTargetHole.choices).toEqual([fighterId]);
    expect(shortbowTargetHole.choices).toEqual([fighterId, distantFighterId]);

    expect(
      resolveBattleSubject({
        state,
        subject: goblinAttackSubject("Scimitar"),
        fills: [targetFill(scimitarTargetHole, distantFighterId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Attack target is outside the selected attack's supported target constraint.",
    });
    expect(
      resolveBattleSubject({
        state,
        subject: goblinAttackSubject("Shortbow"),
        fills: [targetFill(shortbowTargetHole, longRangeFighterId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Attack target is outside the selected attack's supported target constraint.",
    });
  });

  test("Goblin Warrior Shortbow attack keeps its authored identity separate from Scimitar", () => {
    const state = goblinTurnBattle();
    const shortbowSubject = goblinAttackSubject("Shortbow");
    const shortbowTargetHole = requireHole(
      resolveBattleSubject({ state, subject: shortbowSubject, fills: [] }),
      "targetChoice",
    );
    const shortbowRollHole = requireHole(
      resolveBattleSubject({
        state,
        subject: shortbowSubject,
        fills: [targetFill(shortbowTargetHole, fighterId)],
      }),
      "attackRoll",
    );
    const shortbowDamageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: shortbowSubject,
        fills: [
          targetFill(shortbowTargetHole, fighterId),
          attackRollFill(shortbowRollHole, { total: 14, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    expect(shortbowDamageHole).toMatchObject({
      holeId: "battle:attack:damage-result:1d6+2-piercing",
      label: "Shortbow damage (1d6+2-piercing)",
      attack: {
        kind: "statBlockAttack",
        attack: { name: "Shortbow" },
      },
    });

    const scimitarDamageHole = attackDamageHoleAfterHit(
      state,
      shortbowTargetHole,
      shortbowRollHole,
      { total: 14, naturalD20: 10 },
      goblinAttackSubject("Scimitar"),
      fighterId,
    );
    const confused = resolveBattleSubject({
      state,
      subject: shortbowSubject,
      fills: [
        targetFill(shortbowTargetHole, fighterId),
        attackRollFill(shortbowRollHole, { total: 14, naturalD20: 10 }),
        damageRollFill(scimitarDamageHole, 4),
      ],
    });

    expect(confused).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Attack damage must use the normal hit damage hole.",
    });
  });

  test("Goblin Warrior advantage rider is included when the attack roll had Advantage", () => {
    const state = goblinTurnBattle({ fighterHp: 12 });
    const subject = goblinAttackSubject("Scimitar");
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(
      state,
      targetHole,
      subject,
      fighterId,
    );
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 18, naturalD20: 14, rollMode: "advantage" },
      subject,
      fighterId,
    );

    expect(damageHole).toMatchObject({
      kind: "rolledDice",
      holeId: "battle:attack:damage-result:1d6+1d4+2-slashing",
      label: "Scimitar damage (1d6+1d4+2-slashing)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, fighterId),
        attackRollFill(rollHole, {
          total: 18,
          naturalD20: 14,
          rollMode: "advantage",
        }),
        damageRollFillWithGroups(damageHole, [[4], [3]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: fighterId, hp: 3 }),
        ]),
      },
    });
  });

  test("same-type Stat Block attack damage applies Resistance once after combining components", () => {
    const state = startBattle({
      battleId: battleId("battle-combined-resistance-damage"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        resistantSkeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = goblinAttackSubject("Scimitar");
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(
      state,
      targetHole,
      subject,
      skeletonId,
    );
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 18, naturalD20: 14, rollMode: "advantage" },
      subject,
      skeletonId,
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, skeletonId),
        attackRollFill(rollHole, {
          total: 18,
          naturalD20: 14,
          rollMode: "advantage",
        }),
        damageRollFillWithGroups(damageHole, [[1], [1]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: goblinId },
          { combatantId: skeletonId, hp: 11 },
        ],
      },
    });
  });

  test("Goblin Warrior attack resolves through HP mutation, action spend, and zero-HP policy", () => {
    const state = goblinTurnBattle({ fighterHp: 6 });
    const subject = goblinAttackSubject("Shortbow");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const rollHole = attackRollHoleAfterTarget(
      state,
      targetHole,
      subject,
      fighterId,
    );
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 14, naturalD20: 10 },
      subject,
      fighterId,
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, fighterId),
        attackRollFill(rollHole, { total: 14, naturalD20: 10 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: goblinId,
        currentTurnResources: { actionResources: [] },
        combatants: [
          {
            combatantId: fighterId,
            hp: 0,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              dead: false,
            },
            conditions: expect.arrayContaining(["unconscious", "prone"]),
          },
          { combatantId: goblinId, hp: 10 },
        ],
      },
    });
  });

  test("Skeleton Bludgeoning vulnerability and Poison immunity modify supported damage paths", () => {
    const state = startBattle({
      battleId: battleId("battle-skeleton-damage-modifiers"),
      combatants: [
        characterSeed({ initiative: 20, attack: testLightHammerAttack() }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const flailSubject = fighterAttackSubject("Flail");
    const targetHole = attackInitialTargetHole(state, flailSubject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, flailSubject);
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 14, naturalD20: 10 },
      flailSubject,
      skeletonId,
    );

    const bludgeoning = resolveBattleSubject({
      state,
      subject: flailSubject,
      fills: [
        targetFill(targetHole, skeletonId),
        attackRollFill(rollHole, { total: 14, naturalD20: 10 }),
        damageRollFill(damageHole, 2),
      ],
    });

    expect(bludgeoning).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: skeletonId, hp: 3 },
        ],
      },
    });

    const poisonState = startBattle({
      battleId: battleId("battle-skeleton-poison-immunity"),
      combatants: [
        characterSeed({ initiative: 20, attack: testPoisonWeaponAttack() }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const poisonSubject = fighterAttackSubject("Flail");
    const poisonTarget = attackInitialTargetHole(poisonState, poisonSubject);
    const poisonRoll = attackRollHoleAfterTarget(
      poisonState,
      poisonTarget,
      poisonSubject,
    );
    const poisonDamage = attackDamageHoleAfterHit(
      poisonState,
      poisonTarget,
      poisonRoll,
      { total: 14, naturalD20: 10 },
      poisonSubject,
      skeletonId,
    );
    const poison = resolveBattleSubject({
      state: poisonState,
      subject: poisonSubject,
      fills: [
        targetFill(poisonTarget, skeletonId),
        attackRollFill(poisonRoll, { total: 14, naturalD20: 10 }),
        damageRollFill(poisonDamage, 4),
      ],
    });

    expect(poison).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: skeletonId, hp: 13 },
        ],
      },
    });
  });

  test("Action Surge grants one additional non-Magic action and cannot be used twice in one turn", () => {
    const state = {
      ...startBattle({
        battleId: battleId("battle-action-surge"),
        combatants: [
          characterSeed({
            initiative: 20,
            resources: [actionSurgeResource()],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: true,
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;

    expect(discoverBattleActs(state).map((act) => act.subject)).toEqual([
      {
        tag: "unitFeature",
        actorId: fighterId,
        unitId: "fighter_action_surge",
      },
      { tag: "runtimeCommand", actorId: fighterId, command: "move" },
      { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
    ]);

    const surged = resolveBattleSubject({
      state,
      subject: {
        tag: "unitFeature",
        actorId: fighterId,
        unitId: "fighter_action_surge",
      },
      fills: [],
    });

    expect(surged).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentTurnResources: {
          actionResources: [
            {
              kind: "action",
              source: "unit",
              sourceOwnerId: fighterId,
              sourceUnitId: "fighter_action_surge",
              restriction: { kind: "exclude", actions: ["magic"] },
            },
          ],
        },
        acts: expect.arrayContaining([
          expect.objectContaining({
            subject: expect.objectContaining({ action: "attack" }),
          }),
          expect.objectContaining({
            subject: expect.objectContaining({ action: "grapple" }),
          }),
          expect.objectContaining({
            subject: {
              tag: "runtimeCommand",
              actorId: fighterId,
              command: "move",
            },
          }),
          expect.objectContaining({
            subject: {
              tag: "runtimeCommand",
              actorId: fighterId,
              command: "endTurn",
            },
          }),
        ]),
      },
    });

    if (surged.tag !== "resolved") {
      throw new Error(`Expected resolved Action Surge, got ${surged.tag}.`);
    }
    expect(
      surged.snapshot.acts.some((act) => act.subject.tag === "actionSpell"),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: surged.state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_action_surge",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const afterFighter = requireResolved(
      endTurn({ state: surged.state, actorId: fighterId }),
    );
    expect(afterFighter.state.combatants.get(fighterId)?.origin).toMatchObject({
      resources: [expect.objectContaining({ usedThisTurn: true })],
    });

    const afterGoblin = requireResolved(
      endTurn({ state: afterFighter.state, actorId: goblinId }),
    );
    expect(afterGoblin.state.combatants.get(fighterId)?.origin).toMatchObject({
      resources: [expect.objectContaining({ usedThisTurn: false })],
    });

    const defeatedActorState = {
      ...startBattle({
        battleId: battleId("battle-action-surge-defeated-actor"),
        combatants: [
          characterSeed({
            initiative: 20,
            currentHp: 0,
            resources: [actionSurgeResource()],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: true,
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;
    expect(
      resolveBattleSubject({
        state: defeatedActorState,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_action_surge",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Action Surge discovery and resolution share the supported Unit feature shape", () => {
    const state = {
      ...startBattle({
        battleId: battleId("battle-action-surge-unsupported-shape"),
        combatants: [
          characterSeed({
            initiative: 20,
            resources: [
              actionSurgeResource({
                unit: actionSurgeWithAdditionalDirectEffect(),
              }),
            ],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: true,
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;

    expect(discoverBattleActs(state).map((act) => act.subject)).toEqual([
      { tag: "runtimeCommand", actorId: fighterId, command: "move" },
      { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
    ]);
    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_action_surge",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Second Wind spends a Bonus Action and feature use to heal through the HP boundary", () => {
    const state = startBattle({
      battleId: battleId("battle-second-wind"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          currentHp: 4,
          resources: [secondWindResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const secondWindAct = discoverBattleActs(state).find(
      (act) =>
        act.subject.tag === "unitFeature" &&
        act.subject.unitId === "fighter_second_wind",
    );
    expect(secondWindAct).toMatchObject({
      subject: {
        tag: "unitFeature",
        actorId: fighterId,
        unitId: "fighter_second_wind",
      },
      label: "Second Wind",
      initialHoles: [
        { kind: "rolledDice", label: "Second Wind healing (1d10)" },
      ],
    });

    if (secondWindAct === undefined) {
      throw new Error("Expected Second Wind act.");
    }
    const result = resolveBattleSubject({
      state,
      subject: secondWindAct.subject,
      fills: [
        damageRollFill(findHole(secondWindAct.initialHoles, "rolledDice"), 8),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentTurnResources: {
          currentHasBonusAction: false,
        },
        combatants: [
          {
            combatantId: fighterId,
            hp: 12,
          },
          { combatantId: goblinId },
        ],
      },
    });
    if (result.tag !== "resolved") {
      throw new Error(`Expected resolved Second Wind, got ${result.tag}.`);
    }
    expect(result.state.combatants.get(fighterId)?.origin).toMatchObject({
      resources: [
        expect.objectContaining({
          unit: expect.objectContaining({ id: "fighter_second_wind" }),
          usesRemaining: 1,
        }),
      ],
    });
    expect(
      discoverBattleActs(result.state).some(
        (act) =>
          act.subject.tag === "unitFeature" &&
          act.subject.unitId === "fighter_second_wind",
      ),
    ).toBe(false);
  });

  test("Second Wind is rejected without action capacity, resource uses, or the supported Unit shape", () => {
    const noBonusActionState = {
      ...startBattle({
        battleId: battleId("battle-second-wind-no-bonus-action"),
        combatants: [
          characterSeed({
            initiative: 20,
            currentHp: 4,
            resources: [secondWindResource()],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [{ kind: "action", source: "turn" }],
        currentHasBonusAction: false,
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;
    expect(
      resolveBattleSubject({
        state: noBonusActionState,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_second_wind",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const depletedState = startBattle({
      battleId: battleId("battle-second-wind-depleted"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 4,
          resources: [secondWindResource({ usesRemaining: 0 })],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(discoverBattleActs(depletedState).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        { tag: "action", actorId: fighterId, action: "grapple" },
        { tag: "runtimeCommand", actorId: fighterId, command: "move" },
        { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
      ]),
    );

    const unsupportedState = startBattle({
      battleId: battleId("battle-second-wind-unsupported-shape"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 4,
          resources: [
            secondWindResource({
              unit: secondWindWithAdditionalDirectEffect(),
            }),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveBattleSubject({
        state: unsupportedState,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_second_wind",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const defeatedActorState = startBattle({
      battleId: battleId("battle-second-wind-defeated-actor"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 0,
          resources: [secondWindResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveBattleSubject({
        state: defeatedActorState,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_second_wind",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("old Core class riders remain explicitly support-gated until reusable procedure families exist", () => {
    const oldClassRiders = [
      ["barbarian_rage", "Rage"],
      ["barbarian_reckless_attack", "Reckless Attack"],
      ["rogue_sneak_attack", "Sneak Attack"],
      ["rogue_evasion", "Rogue Evasion"],
      ["monk_deflect_attacks", "Deflect Attacks"],
      ["rogue_uncanny_dodge", "Uncanny Dodge"],
      ["bard_cutting_words", "Cutting Words"],
    ] as const;
    const state = startBattle({
      battleId: battleId("battle-old-class-riders-support-gated"),
      combatants: [
        characterSeed({
          initiative: 20,
          resources: oldClassRiders.map(([unitId, name]) =>
            unsupportedClassRiderResource(unitId, name),
          ),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const discoveredUnitIds = discoverBattleActs(state).flatMap((act) =>
      act.subject.tag === "unitFeature" ? [act.subject.unitId] : [],
    );
    expect(discoveredUnitIds).toEqual([]);

    for (const [unitId] of oldClassRiders) {
      expect(
        resolveBattleSubject({
          state,
          subject: {
            tag: "unitFeature",
            actorId: fighterId,
            unitId,
          },
          fills: [],
        }),
      ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    }
  });

  test("Wizard action-time spell acts spend slots for prepared level-1 spells but not cantrips", () => {
    const magicMissileState = wizardVsSkeletonBattle();
    expect(
      discoverBattleActs(magicMissileState).map((act) => act.subject),
    ).toEqual(
      expect.arrayContaining([
        { tag: "action", actorId: wizardId, action: "grapple" },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "magic_missile",
          spellActId: "preparedSlotSpell:magic_missile:slot:1",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "magic_missile",
          spellActId: "readiedSpell:preparedSlotSpell:magic_missile:slot:1",
          readyTrigger: "attackHit",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "magic_missile",
          spellActId: "readiedSpell:preparedSlotSpell:magic_missile:slot:1",
          readyTrigger: "spellCast",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "magic_missile",
          spellActId: "readiedSpell:preparedSlotSpell:magic_missile:slot:1",
          readyTrigger: "saveFailed",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "magic_missile",
          spellActId: "readiedSpell:preparedSlotSpell:magic_missile:slot:1",
          readyTrigger: "afterDamage",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "ray_of_frost",
          spellActId: "cantripSpellAttack:ray_of_frost",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "ray_of_frost",
          spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
          readyTrigger: "attackHit",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "ray_of_frost",
          spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
          readyTrigger: "spellCast",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "ray_of_frost",
          spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
          readyTrigger: "saveFailed",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "ray_of_frost",
          spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
          readyTrigger: "afterDamage",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "acid_splash",
          spellActId: "cantripSaveGateDamage:acid_splash",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "acid_splash",
          spellActId: "readiedSpell:cantripSaveGateDamage:acid_splash",
          readyTrigger: "attackHit",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "acid_splash",
          spellActId: "readiedSpell:cantripSaveGateDamage:acid_splash",
          readyTrigger: "spellCast",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "acid_splash",
          spellActId: "readiedSpell:cantripSaveGateDamage:acid_splash",
          readyTrigger: "saveFailed",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "acid_splash",
          spellActId: "readiedSpell:cantripSaveGateDamage:acid_splash",
          readyTrigger: "afterDamage",
        },
        { tag: "runtimeCommand", actorId: wizardId, command: "move" },
        { tag: "runtimeCommand", actorId: wizardId, command: "endTurn" },
      ]),
    );

    const magicMissileTarget = requireHole(
      resolveBattleSubject({
        state: magicMissileState,
        subject: magicSubject("magic_missile"),
        fills: [],
      }),
      "targetChoice",
    );
    expect(magicMissileTarget).toMatchObject({
      label: "Magic Missile all-darts target",
      choices: [wizardId, skeletonId],
    });
    const magicMissileDamage = requireHole(
      resolveBattleSubject({
        state: magicMissileState,
        subject: magicSubject("magic_missile"),
        fills: [targetFill(magicMissileTarget, skeletonId)],
      }),
      "rolledDice",
    );
    expect(magicMissileDamage).toMatchObject({
      label: "Magic Missile damage (3d4+3-force)",
    });
    expect(
      resolveBattleSubject({
        state: magicMissileState,
        subject: magicSubject("magic_missile"),
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: holeId("battle:spell:saving-throw-outcome:magic_missile"),
            value: [{ targetId: skeletonId, succeeded: false }],
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const magicMissile = resolveBattleSubject({
      state: magicMissileState,
      subject: magicSubject("magic_missile"),
      fills: [
        targetFill(magicMissileTarget, skeletonId),
        damageRollFillWithGroups(magicMissileDamage, [[1, 1, 1]]),
      ],
    });
    expect(magicMissile).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 7 },
        ],
        currentTurnResources: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(requireResolved(magicMissile), wizardId)).toBe(
      1,
    );

    const rayState = wizardVsSkeletonBattle();
    const rayTarget = requireHole(
      resolveBattleSubject({
        state: rayState,
        subject: magicSubject("ray_of_frost"),
        fills: [],
      }),
      "targetChoice",
    );
    const rayRoll = requireHole(
      resolveBattleSubject({
        state: rayState,
        subject: magicSubject("ray_of_frost"),
        fills: [targetFill(rayTarget, skeletonId)],
      }),
      "attackRoll",
    );
    expect(rayRoll).toMatchObject({
      attackBonus: 5,
    });
    const rayDamage = requireHole(
      resolveBattleSubject({
        state: rayState,
        subject: magicSubject("ray_of_frost"),
        fills: [
          targetFill(rayTarget, skeletonId),
          attackRollFill(rayRoll, { total: 14, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const ray = resolveBattleSubject({
      state: rayState,
      subject: magicSubject("ray_of_frost"),
      fills: [
        targetFill(rayTarget, skeletonId),
        attackRollFill(rayRoll, { total: 14, naturalD20: 10 }),
        damageRollFill(rayDamage, 4),
      ],
    });

    expect(ray).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          {
            combatantId: skeletonId,
            hp: 9,
            activeEffects: [
              {
                kind: "speedDelta",
                sourceSpellId: "ray_of_frost",
                sourceCombatantId: wizardId,
                deltaFeet: movementDeltaFeet(-10),
                expiresAt: {
                  kind: "startOfTurn",
                  combatantId: wizardId,
                },
              },
            ],
          },
        ],
      },
    });
    expect(expendedLevelOneSlots(requireResolved(ray), wizardId)).toBe(0);

    const stackedRayState = {
      ...rayState,
      combatants: new Map(rayState.combatants).set(skeletonId, {
        ...rayState.combatants.get(skeletonId)!,
        activeEffects: [
          {
            kind: "speedDelta",
            sourceSpellId: "ray_of_frost",
            sourceCombatantId: combatantId("other-wizard"),
            deltaFeet: movementDeltaFeet(-10),
            expiresAt: {
              kind: "startOfTurn",
              combatantId: combatantId("other-wizard"),
            },
          },
        ],
      }),
    } satisfies BattleState;
    const refreshedRay = resolveBattleSubject({
      state: stackedRayState,
      subject: magicSubject("ray_of_frost"),
      fills: [
        targetFill(rayTarget, skeletonId),
        attackRollFill(rayRoll, { total: 14, naturalD20: 10 }),
        damageRollFill(rayDamage, 4),
      ],
    });
    expect(refreshedRay).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          {
            combatantId: skeletonId,
            activeEffects: [
              expect.objectContaining({
                sourceSpellId: "ray_of_frost",
                sourceCombatantId: wizardId,
              }),
            ],
          },
        ],
      },
    });

    const criticalRayState = wizardVsSkeletonBattle();
    const criticalRayTarget = requireHole(
      resolveBattleSubject({
        state: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [],
      }),
      "targetChoice",
    );
    const criticalRayRoll = requireHole(
      resolveBattleSubject({
        state: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [targetFill(criticalRayTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const criticalRayDamage = requireHole(
      resolveBattleSubject({
        state: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [
          targetFill(criticalRayTarget, skeletonId),
          attackRollFill(criticalRayRoll, { total: 20, naturalD20: 20 }),
        ],
      }),
      "rolledDice",
    );
    expect(criticalRayDamage).toMatchObject({
      label: "Ray of Frost damage (2d8-cold)",
      critical: true,
    });
    expect(
      resolveBattleSubject({
        state: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [
          targetFill(criticalRayTarget, skeletonId),
          attackRollFill(criticalRayRoll, { total: 20, naturalD20: 20 }),
          damageRollFill(criticalRayDamage, 4),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      resolveBattleSubject({
        state: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [
          targetFill(criticalRayTarget, skeletonId),
          attackRollFill(criticalRayRoll, { total: 20, naturalD20: 20 }),
          damageRollFillWithGroups(criticalRayDamage, [[4, 4]]),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 5 },
        ],
      },
    });

    const afterWizardTurn = endTurn({
      state: requireResolved(ray).state,
      actorId: wizardId,
    });
    if (afterWizardTurn.tag !== "resolved") {
      throw new Error(
        `Expected resolved Wizard End Turn, got ${afterWizardTurn.tag}.`,
      );
    }
    const afterSkeletonTurn = endTurn({
      state: afterWizardTurn.state,
      actorId: skeletonId,
    });
    expect(afterSkeletonTurn).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: wizardId,
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, activeEffects: [] },
        ],
      },
    });

    const rayMiss = resolveBattleSubject({
      state: rayState,
      subject: magicSubject("ray_of_frost"),
      fills: [
        targetFill(rayTarget, skeletonId),
        attackRollFill(rayRoll, { total: 1, naturalD20: 1 }),
      ],
    });
    expect(rayMiss).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentTurnResources: { actionResources: [] },
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 13 },
        ],
      },
    });
    expect(expendedLevelOneSlots(requireResolved(rayMiss), wizardId)).toBe(0);
  });

  test("Acid Splash support is gated to the authored 5-foot point-origin Sphere", () => {
    const unsupportedState = startBattle({
      battleId: battleId("battle-acid-splash-unsupported-area"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [acidSplashWithRadius(10)],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });

    expect(
      discoverBattleActs(unsupportedState).map((act) => act.subject),
    ).toEqual(
      expect.arrayContaining([
        { tag: "action", actorId: wizardId, action: "grapple" },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "magic_missile",
          spellActId: "preparedSlotSpell:magic_missile:slot:1",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "magic_missile",
          spellActId: "readiedSpell:preparedSlotSpell:magic_missile:slot:1",
          readyTrigger: "attackHit",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "magic_missile",
          spellActId: "readiedSpell:preparedSlotSpell:magic_missile:slot:1",
          readyTrigger: "spellCast",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "magic_missile",
          spellActId: "readiedSpell:preparedSlotSpell:magic_missile:slot:1",
          readyTrigger: "saveFailed",
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "magic_missile",
          spellActId: "readiedSpell:preparedSlotSpell:magic_missile:slot:1",
          readyTrigger: "afterDamage",
        },
        { tag: "runtimeCommand", actorId: wizardId, command: "move" },
        { tag: "runtimeCommand", actorId: wizardId, command: "endTurn" },
      ]),
    );
  });

  test("Mage Armor creates a persistent base AC spell effect with typed early end", () => {
    const unarmoredDex = {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...defaultArmorClassState().abilityModifiers,
        dex: abilityModifier(2),
      },
    };
    const state = startBattle({
      battleId: battleId("battle-mage-armor"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          armorClass: unarmoredDex,
          spellcasting: wizardSpellcasting({
            preparedSpells: [
              spellRecord("magic_missile"),
              spellRecord("mage_armor"),
            ],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });

    expect(discoverBattleActs(state).map((act) => act.subject)).toContainEqual({
      tag: "actionSpell",
      actorId: wizardId,
      spellId: "mage_armor",
      spellActId: "preparedPersistentSpell:mage_armor:slot:1",
    });

    const target = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("mage_armor"),
        fills: [],
      }),
      "targetChoice",
    );
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }
    expect(target.choices).toEqual([wizardId]);
    const result = resolveBattleSubject({
      state,
      subject: magicSubject("mage_armor"),
      fills: [targetFill(target, wizardId)],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          {
            combatantId: wizardId,
            armorClass: 15,
            activeEffects: [
              {
                kind: "spellBaseArmorClass",
                sourceSpellId: "mage_armor",
                sourceCombatantId: wizardId,
                base: 13,
                ability: "dex",
                durationTicks: requireElapsedHours(8),
                earlyEnds: [{ kind: "targetDonsArmor" }],
              },
            ],
          },
          { combatantId: skeletonId },
        ],
        currentTurnResources: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(requireResolved(result), wizardId)).toBe(1);
  });

  test("Mage Armor rejects armored targets before spending resources", () => {
    const armored = {
      ...defaultArmorClassState(),
      base: {
        kind: "armor" as const,
        category: "medium" as const,
        formula: { kind: "medium_dex_max_2" as const, base: 14 },
      },
    };
    const state = startBattle({
      battleId: battleId("battle-mage-armor-armored-target"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("mage_armor")],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Armored Fighter",
          initiative: 10,
          armorClass: armored,
          attack: null,
        }),
      ],
    });

    const target = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("mage_armor"),
        fills: [],
      }),
      "targetChoice",
    );
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }

    expect(target.choices).toEqual([wizardId]);
    expect(
      resolveBattleSubject({
        state,
        subject: magicSubject("mage_armor"),
        fills: [targetFill(target, fighterId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(state.combatants.get(wizardId)?.origin.kind).toBe("character");
  });

  test("breaking concentration clears concentration-owned spell effects", () => {
    const state = wizardVsSkeletonBattle();
    const wizard = state.combatants.get(wizardId)!;
    const skeleton = state.combatants.get(skeletonId)!;
    const concentrating = {
      ...state,
      combatants: new Map(state.combatants)
        .set(wizardId, {
          ...wizard,
          concentration: {
            sourceSpellId: "hold_person",
            effectKind: "spellEffect",
          },
        })
        .set(skeletonId, {
          ...skeleton,
          activeEffects: [
            {
              kind: "spellBaseArmorClass",
              sourceSpellId: "hold_person",
              sourceCombatantId: wizardId,
              base: 13,
              ability: "dex",
              durationTicks: requireElapsedHours(1),
              earlyEnds: [{ kind: "concentrationBroken" }],
            },
          ],
        }),
    } satisfies BattleState;

    const broken = breakBattleConcentration(concentrating, wizardId);

    expect(snapshotBattle(broken).combatants).toMatchObject([
      { combatantId: wizardId, concentration: null },
      { combatantId: skeletonId, activeEffects: [] },
    ]);
  });

  test("breaking ordinary concentration does not clear a non-owned readied spell entry", () => {
    const state = startBattle({
      battleId: battleId("battle-ordinary-concentration-preserves-readied"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "ray_of_frost",
          spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
          readyTrigger: "spellCast",
        },
        fills: [],
      }),
    ).state;
    const wizard = readied.combatants.get(wizardId)!;
    const concentrating = {
      ...readied,
      combatants: new Map(readied.combatants).set(wizardId, {
        ...wizard,
        concentration: {
          sourceSpellId: "hold_person",
          effectKind: "spellEffect",
        },
      }),
    } satisfies BattleState;

    const broken = breakBattleConcentration(concentrating, wizardId);

    expect(broken.combatants.get(wizardId)?.concentration).toBeNull();
    expect(broken.readiedSpells.has(wizardId)).toBe(true);
  });

  test("failed concentration damage save uses the same concentration lifecycle", () => {
    const state = wizardVsSkeletonBattle();
    const wizard = state.combatants.get(wizardId)!;
    const concentrating = {
      ...state,
      combatants: new Map(state.combatants).set(wizardId, {
        ...wizard,
        concentration: {
          sourceSpellId: "readied_acid_splash",
          effectKind: "readiedSpell",
        },
      }),
    } satisfies BattleState;

    expect(concentrationSavingThrowDc(24)).toBe(12);
    expect(concentrationSavingThrowDc(80)).toBe(30);
    expect(
      resolveBattleConcentrationDamage({
        state: concentrating,
        combatantId: wizardId,
        damageAmount: 24,
        savingThrowSucceeded: true,
      }).combatants.get(wizardId)?.concentration,
    ).toEqual({
      sourceSpellId: "readied_acid_splash",
      effectKind: "readiedSpell",
    });
    expect(
      resolveBattleConcentrationDamage({
        state: concentrating,
        combatantId: wizardId,
        damageAmount: 24,
        savingThrowSucceeded: false,
      }).combatants.get(wizardId)?.concentration,
    ).toBeNull();
  });

  test("attack damage requests and consumes a Concentration save for a readied spell", () => {
    const state = startBattle({
      battleId: battleId("battle-readied-concentration-damage"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const readySubject = {
      tag: "actionSpell" as const,
      actorId: wizardId,
      spellId: "ray_of_frost",
      spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
      readyTrigger: "spellCast" as const,
    };
    const readied = resolveBattleSubject({
      state,
      subject: readySubject,
      fills: [],
    });
    if (readied.tag !== "resolved") {
      throw new Error(`Expected resolved Ready Spell, got ${readied.tag}.`);
    }
    const goblinTurn = endTurn({ state: readied.state, actorId: wizardId });
    if (goblinTurn.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${goblinTurn.tag}.`);
    }
    const target = attackInitialTargetHole(
      goblinTurn.state,
      goblinAttackSubject("Scimitar"),
    );
    const roll = attackRollHoleAfterTarget(
      goblinTurn.state,
      target,
      goblinAttackSubject("Scimitar"),
      wizardId,
    );
    const damage = attackDamageHoleAfterHit(
      goblinTurn.state,
      target,
      roll,
      { total: 14, naturalD20: 10 },
      goblinAttackSubject("Scimitar"),
      wizardId,
    );
    const needsConcentration = resolveBattleSubject({
      state: goblinTurn.state,
      subject: goblinAttackSubject("Scimitar"),
      fills: [
        targetFill(target, wizardId),
        attackRollFill(roll, { total: 14, naturalD20: 10 }),
        damageRollFill(damage, 3),
      ],
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );

    expect(concentration).toMatchObject({
      kind: "concentrationSavingThrow",
      combatantId: wizardId,
      dc: 10,
      damageAmount: 5,
    });

    const failed = resolveBattleSubject({
      state: goblinTurn.state,
      subject: goblinAttackSubject("Scimitar"),
      fills: [
        targetFill(target, wizardId),
        attackRollFill(roll, { total: 14, naturalD20: 10 }),
        damageRollFill(damage, 3),
        concentrationSavingThrowFill(concentration, false),
      ],
    });

    expect(failed).toMatchObject({
      tag: "resolved",
      snapshot: {
        readiedSpells: [],
        combatants: [
          { combatantId: wizardId, hp: 7, concentration: null },
          { combatantId: goblinId },
        ],
      },
    });
  });

  test("readied spell release uses the held spell and ends Concentration", () => {
    const state = startBattle({
      battleId: battleId("battle-readied-release"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const readied = resolveBattleSubject({
      state,
      subject: {
        tag: "actionSpell",
        actorId: wizardId,
        spellId: "ray_of_frost",
        spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
        readyTrigger: "attackHit",
      },
      fills: [],
    });
    if (readied.tag !== "resolved") {
      throw new Error(`Expected resolved Ready Spell, got ${readied.tag}.`);
    }
    const goblinTurn = endTurn({ state: readied.state, actorId: wizardId });
    if (goblinTurn.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${goblinTurn.tag}.`);
    }
    const releaseSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "releaseReadiedSpell" as const,
      readiedSpellCasterId: wizardId,
    };
    const target = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const released = resolveBattleSubject({
      state: goblinTurn.state,
      subject: releaseSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });

    expect(released).toMatchObject({
      tag: "resolved",
      snapshot: {
        readiedSpells: [],
        combatants: [
          { combatantId: wizardId, concentration: null },
          {
            combatantId: goblinId,
            hp: 6,
            activeEffects: [{ kind: "speedDelta" }],
          },
        ],
      },
    });
  });

  test("readied spells are held per caster", () => {
    const state = startBattle({
      battleId: battleId("battle-readied-per-caster"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Second Wizard",
          initiative: 15,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const firstReadied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          spellId: "ray_of_frost",
          spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
          readyTrigger: "spellCast",
        },
        fills: [],
      }),
    ).state;
    const secondWizardTurn = requireResolved(
      endTurn({ state: firstReadied, actorId: wizardId }),
    ).state;
    const secondReadied = requireResolved(
      resolveBattleSubject({
        state: secondWizardTurn,
        subject: {
          tag: "actionSpell",
          actorId: secondWizardId,
          spellId: "acid_splash",
          spellActId: "readiedSpell:cantripSaveGateDamage:acid_splash",
          readyTrigger: "saveFailed",
        },
        fills: [],
      }),
    ).state;

    expect(snapshotBattle(secondReadied)).toMatchObject({
      readiedSpells: [{ casterId: wizardId }, { casterId: secondWizardId }],
      combatants: [
        {
          combatantId: wizardId,
          concentration: { effectKind: "readiedSpell" },
        },
        {
          combatantId: secondWizardId,
          concentration: { effectKind: "readiedSpell" },
        },
        { combatantId: goblinId },
      ],
    });
  });

  test("Acid Splash save-gate damage applies only to failed Saving Throws", () => {
    const state = wizardVsSkeletonBattle({
      extraCombatants: [
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          displayName: "Second Skeleton",
          initiative: 8,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        }),
      ],
      combatantDistances: [
        { combatantA: wizardId, combatantB: skeletonId, feet: 30 },
        {
          combatantA: wizardId,
          combatantB: secondSkeletonId,
          feet: 60,
        },
        {
          combatantA: skeletonId,
          combatantB: secondSkeletonId,
          feet: 5,
        },
      ],
    });
    const subject = magicSubject("acid_splash");
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Acid Splash point-origin Sphere Saving Throw outcomes",
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
      areaChoices: expect.arrayContaining([
        {
          originAnchorId: wizardId,
          affectedTargetIds: [wizardId],
        },
        {
          originAnchorId: skeletonId,
          affectedTargetIds: [skeletonId, secondSkeletonId],
        },
      ]),
    });
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: wizardId, succeeded: true },
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Save-gate spell Saving Throw outcomes must exactly match one legal point-origin Sphere area.",
    });
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: wizardId, succeeded: false },
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Save-gate spell Saving Throw outcomes must exactly match one legal point-origin Sphere area.",
    });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
            {
              targetId: secondSkeletonId,
              succeeded: true,
            },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Acid Splash damage (1d6-acid)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: skeletonId, succeeded: false },
          {
            targetId: secondSkeletonId,
            succeeded: true,
          },
        ]),
        damageRollFill(damage, 4),
      ],
    });
    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 9 },
          { combatantId: secondSkeletonId, hp: 13 },
        ],
        currentTurnResources: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(requireResolved(result), wizardId)).toBe(0);

    const allSucceeded = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: skeletonId, succeeded: true },
          {
            targetId: secondSkeletonId,
            succeeded: true,
          },
        ]),
      ],
    });
    expect(allSucceeded).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 13 },
          { combatantId: secondSkeletonId, hp: 13 },
        ],
        currentTurnResources: { actionResources: [] },
      },
    });
  });

  test("Acid Splash damage requests and consumes Concentration saves", () => {
    const baseState = wizardVsSkeletonBattle();
    const skeleton = baseState.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected Skeleton in battle.");
    }
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(skeletonId, {
        ...skeleton,
        concentration: {
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const subject = magicSubject("acid_splash");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: wizardId, succeeded: true },
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    const needsConcentration = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: wizardId, succeeded: true },
          { targetId: skeletonId, succeeded: false },
        ]),
        damageRollFill(damage, 4),
      ],
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );

    expect(concentration).toMatchObject({
      combatantId: skeletonId,
      dc: 10,
      damageAmount: 4,
    });
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: wizardId, succeeded: true },
            { targetId: skeletonId, succeeded: false },
          ]),
          damageRollFill(damage, 4),
          concentrationSavingThrowFill(concentration, false),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 9, concentration: null },
        ],
      },
    });
  });

  test("endTurn advances to a new round after the last actor acts", () => {
    const afterFighter = endTurn({
      state: fighterVsGoblinBattle(),
      actorId: fighterId,
    });
    if (afterFighter.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${afterFighter.tag}.`);
    }

    const afterGoblin = endTurn({
      state: afterFighter.state,
      actorId: goblinId,
    });

    expect(afterGoblin).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: fighterId,
        round: 2,
        turnOrder: [fighterId, goblinId],
        currentTurnResources: {
          actionResources: [{ kind: "action", source: "turn" }],
          currentHasBonusAction: true,
        },
      },
    });
  });

  test("endTurn rejects fills because it is a runtime command, not an Action hole protocol", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      },
      fills: [targetFill(targetHole, goblinId)],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      snapshot: {
        currentActorId: fighterId,
        round: 1,
      },
    });
  });

  test("canonical battle runtime QNT self-tests pass", () => {
    runCanonicalBattleRuntimeQntSelfTests();
  });

  test("canonical battle runtime QNT matches runtime fixture outcomes", () => {
    const miss = resolveAttackFixture({
      attackRoll: { total: 14, naturalD20: 9 },
    });
    const hit = resolveAttackFixture({
      attackRoll: { total: 15, naturalD20: 10 },
      damageRoll: 4,
    });
    const tempHp = resolveAttackFixture({
      targetTempHp: 5,
      attackRoll: { total: 15, naturalD20: 10 },
      damageRoll: 4,
    });
    const zeroHp = resolveAttackFixture({
      targetHp: 3,
      attackRoll: { total: 15, naturalD20: 10 },
      damageRoll: 8,
    });
    const characterDropToZero = resolveCharacterAttackFixture({
      targetHp: 3,
      attackRoll: { total: 15, naturalD20: 10 },
      damageRoll: 8,
    });
    const characterDamageAtZero = resolveCharacterAttackFixture({
      targetHp: 0,
      attackRoll: { total: 15, naturalD20: 10 },
      damageRoll: 4,
    });
    const characterCriticalDamageAtZero = resolveCharacterAttackFixture({
      targetHp: 0,
      attackRoll: { total: 20, naturalD20: 20 },
      damageRoll: 4,
    });
    const afterFighter = endTurn({
      state: fighterVsGoblinBattle(),
      actorId: fighterId,
    });
    if (afterFighter.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${afterFighter.tag}.`);
    }
    const afterGoblin = endTurn({
      state: afterFighter.state,
      actorId: goblinId,
    });
    if (afterGoblin.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${afterGoblin.tag}.`);
    }

    runGeneratedQuintParity(
      renderBattleRuntimeParityModule({
        miss: snapshotProjection(requireResolved(miss)),
        hit: snapshotProjection(requireResolved(hit)),
        tempHp: snapshotProjection(requireResolved(tempHp)),
        zeroHp: snapshotProjection(requireResolved(zeroHp)),
        characterDropToZero: characterProjection(
          requireResolved(characterDropToZero),
          targetCharacterId,
        ),
        characterDamageAtZero: characterProjection(
          requireResolved(characterDamageAtZero),
          targetCharacterId,
        ),
        characterCriticalDamageAtZero: characterProjection(
          requireResolved(characterCriticalDamageAtZero),
          targetCharacterId,
        ),
        afterFighterEndTurn: snapshotProjection(afterFighter),
        afterGoblinEndTurn: snapshotProjection(afterGoblin),
      }),
    );
  }, 10_000);
});

function resolveAttackFixture(input: {
  readonly targetHp?: number;
  readonly targetTempHp?: number;
  readonly attackRoll: { readonly total: number; readonly naturalD20: number };
  readonly damageRoll?: number;
}): ReturnType<typeof resolveBattleSubject> {
  const targetOverrides = {
    ...(input.targetHp === undefined ? {} : { currentHp: input.targetHp }),
    ...(input.targetTempHp === undefined ? {} : { tempHp: input.targetTempHp }),
  };
  const state = startBattle({
    battleId: battleId("battle-qnt-parity"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({
        initiative: 10,
        ...targetOverrides,
      }),
    ],
  });
  const targetHole = attackInitialTargetHole(state);
  const rollHole = attackRollHoleAfterTarget(state, targetHole);
  const fills: BattleFill[] = [
    targetFill(targetHole, goblinId),
    attackRollFill(rollHole, input.attackRoll),
  ];

  if (input.damageRoll !== undefined) {
    fills.push(
      damageRollFill(
        attackDamageHoleAfterHit(state, targetHole, rollHole),
        input.damageRoll,
      ),
    );
  }

  return resolveBattleSubject({
    state,
    subject: {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Longsword",
    },
    fills,
  });
}

const targetCharacterId = combatantId("target-character");

function resolveCharacterAttackFixture(input: {
  readonly targetHp: number;
  readonly attackRoll: { readonly total: number; readonly naturalD20: number };
  readonly damageRoll: number;
}): ReturnType<typeof resolveBattleSubject> {
  const state = startBattle({
    battleId: battleId("battle-character-parity"),
    combatants: [
      characterSeed({ initiative: 20 }),
      characterSeed({
        combatantId: targetCharacterId,
        displayName: "Target Fighter",
        initiative: 10,
        currentHp: input.targetHp,
        attack: null,
      }),
    ],
  });
  const targetHole = attackInitialTargetHole(state);
  const rollHole = attackRollHoleAfterTarget(state, targetHole);
  const damageHole = attackDamageHoleAfterHit(
    state,
    targetHole,
    rollHole,
    input.attackRoll,
  );

  return resolveBattleSubject({
    state,
    subject: {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Longsword",
    },
    fills: [
      targetFill(targetHole, targetCharacterId),
      attackRollFill(rollHole, input.attackRoll),
      input.attackRoll.naturalD20 === 20
        ? damageRollFillWithGroups(damageHole, [
            [input.damageRoll, input.damageRoll],
          ])
        : damageRollFill(damageHole, input.damageRoll),
    ],
  });
}

function requireResolved(
  result: ReturnType<typeof resolveBattleSubject>,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved battle result, got ${result.tag}.`);
  }

  return result;
}

function subjectName(
  subject: BattleSubject,
):
  | "attack"
  | "dash"
  | "disengage"
  | "dodge"
  | "helpAttack"
  | "hide"
  | "ready"
  | "search"
  | "grapple"
  | "escapeGrapple"
  | "offHandAttack"
  | "actionSpell"
  | "unitFeature"
  | "endTurn"
  | "move"
  | "standFromProne"
  | "releaseGrapple"
  | "releaseReadiedSpell"
  | "releaseReadiedMovement"
  | "opportunityAttack" {
  if (subject.tag === "action") {
    return subject.action;
  }
  if (subject.tag === "bonusAction") {
    return subject.action;
  }
  if (subject.tag === "actionSpell") {
    return "actionSpell";
  }
  if (subject.tag === "unitFeature") {
    return "unitFeature";
  }
  return subject.command;
}

type BattleRuntimeParityProjection = {
  readonly round: number;
  readonly currentActor: "Fighter" | "Goblin";
  readonly fighterHp: number;
  readonly fighterTempHp: number;
  readonly fighterUnconscious: boolean;
  readonly fighterDeathFailures: number;
  readonly goblinHp: number;
  readonly goblinTempHp: number;
  readonly goblinDead: boolean;
  readonly actionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly lastTurnActor: "NoTurnEnded" | "LastTurnFighter" | "LastTurnGoblin";
};

type CharacterZeroHpParityProjection = {
  readonly hp: number;
  readonly tempHp: number;
  readonly unconscious: boolean;
  readonly deathFailures: number;
};

function snapshotProjection(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "resolved" }
  >,
): BattleRuntimeParityProjection {
  const snapshot = result.snapshot;
  const fighter = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  const goblin = snapshot.combatants.find(
    (combatant) => combatant.combatantId === goblinId,
  );

  if (fighter == null || goblin == null) {
    throw new Error("Expected Fighter and Goblin combatants in snapshot.");
  }

  return {
    round: snapshot.round,
    currentActor: snapshot.currentActorId === fighterId ? "Fighter" : "Goblin",
    fighterHp: fighter.hp,
    fighterTempHp: fighter.tempHp,
    fighterUnconscious: fighter.conditions.includes("unconscious"),
    fighterDeathFailures:
      fighter.zeroHpLifecycle.policy === "usesDeathSavingThrows"
        ? fighter.zeroHpLifecycle.deathSaves.failures
        : 0,
    goblinHp: goblin.hp,
    goblinTempHp: goblin.tempHp,
    goblinDead:
      goblin.zeroHpLifecycle.policy === "diesAtZeroHp" &&
      goblin.zeroHpLifecycle.dead,
    actionAvailable: snapshot.currentTurnResources.actionResources.some(
      (resource) => resource.kind === "action",
    ),
    bonusActionAvailable: snapshot.currentTurnResources.currentHasBonusAction,
    lastTurnActor:
      result.state.legendaryActionWindow === null
        ? "NoTurnEnded"
        : result.state.legendaryActionWindow.afterTurnActorId === fighterId
          ? "LastTurnFighter"
          : "LastTurnGoblin",
  };
}

function characterProjection(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "resolved" }
  >,
  combatantId: CombatantId,
): CharacterZeroHpParityProjection {
  const combatant = result.snapshot.combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );

  if (combatant == null) {
    throw new Error(`Expected ${combatantId} combatant in snapshot.`);
  }

  return {
    hp: combatant.hp,
    tempHp: combatant.tempHp,
    unconscious: combatant.conditions.includes("unconscious"),
    deathFailures:
      combatant.zeroHpLifecycle.policy === "usesDeathSavingThrows"
        ? combatant.zeroHpLifecycle.deathSaves.failures
        : 0,
  };
}

function runCanonicalBattleRuntimeQntSelfTests(): void {
  const quintOutput = execFileSync(
    "pnpm",
    [
      "exec",
      "quint",
      "test",
      "--backend",
      "typescript",
      battleRuntimeSpecPath,
      "--match",
      "test_",
    ],
    { encoding: "utf8" },
  );
  expect(quintOutput).toContain("58 passing");
}

function runGeneratedQuintParity(moduleBody: string): void {
  const tempDir = fs.mkdtempSync(
    path.join(
      packageRootPath,
      `.tmp-battle-runtime-parity-${os.userInfo().username}-`,
    ),
  );
  const tempFile = path.join(tempDir, "battle-runtime-parity.qnt");

  try {
    fs.writeFileSync(tempFile, moduleBody);
    const quintOutput = execFileSync(
      "pnpm",
      [
        "exec",
        "quint",
        "test",
        "--backend",
        "typescript",
        tempFile,
        "--match",
        "parity_",
      ],
      { encoding: "utf8" },
    );
    expect(quintOutput).toContain("9 passing");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function renderBattleRuntimeParityModule(input: {
  readonly miss: BattleRuntimeParityProjection;
  readonly hit: BattleRuntimeParityProjection;
  readonly tempHp: BattleRuntimeParityProjection;
  readonly zeroHp: BattleRuntimeParityProjection;
  readonly characterDropToZero: CharacterZeroHpParityProjection;
  readonly characterDamageAtZero: CharacterZeroHpParityProjection;
  readonly characterCriticalDamageAtZero: CharacterZeroHpParityProjection;
  readonly afterFighterEndTurn: BattleRuntimeParityProjection;
  readonly afterGoblinEndTurn: BattleRuntimeParityProjection;
}): string {
  return `module battleRuntimeParity {
  import battleRuntime.* from "../battle-runtime"

  run parity_miss_matches_runtime = {
    assert(resolveAttack(initialState, 14, 9, 0, true) == ${renderQntStateProjection(input.miss)})
  }

  run parity_hit_damage_matches_runtime = {
    assert(resolveAttack(initialState, 15, 10, 4, true) == ${renderQntStateProjection(input.hit)})
  }

  run parity_temporary_hp_matches_runtime = {
    assert(resolveAttack(withGoblinHp(initialState, 10, 5), 15, 10, 4, true) == ${renderQntStateProjection(input.tempHp)})
  }

  run parity_zero_hp_policy_matches_runtime = {
    assert(resolveAttack(withGoblinHp(initialState, 3, 0), 15, 10, 8, true) == ${renderQntStateProjection(input.zeroHp)})
  }

  run parity_character_drop_to_zero_policy_matches_runtime = {
    assert(applyDamage(withFighterHp(initialState, 3, 0).fighter, 11, 1, true) == ${renderQntCharacterProjection(input.characterDropToZero)})
  }

  run parity_character_damage_at_zero_policy_matches_runtime = {
    assert(applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 1, true) == ${renderQntCharacterProjection(input.characterDamageAtZero)})
  }

  run parity_character_critical_damage_at_zero_policy_matches_runtime = {
    assert(applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 2, true) == ${renderQntCharacterProjection(input.characterCriticalDamageAtZero)})
  }

  run parity_fighter_end_turn_matches_runtime = {
    assert(endTurn(initialState) == ${renderQntStateProjection(input.afterFighterEndTurn)})
  }

  run parity_round_wrap_end_turn_matches_runtime = {
    assert(endTurn(endTurn(initialState)) == ${renderQntStateProjection(input.afterGoblinEndTurn)})
  }
}
`;
}

function renderQntCharacterProjection(
  input: CharacterZeroHpParityProjection,
): string {
  return `{
      hp: ${input.hp},
      maxHp: 12,
      tempHp: ${input.tempHp},
      ac: 10,
      dexMod: 0,
      activeEffects: Set(),
      concentrating: false,
      unconscious: ${input.unconscious},
      stable: false,
      deathSuccesses: 0,
      deathFailures: ${input.deathFailures},
      lifecycle: UsesDeathSavingThrows,
      reactionAvailable: true,
      speed: 30,
      movementSpent: 0,
      hidden: NotHidden,
      dodging: false,
      prone: false,
      creatureSize: Medium,
      leftHandUse: HFree,
      rightHandUse: HMainWeapon,
    }`;
}

function renderQntStateProjection(
  input: BattleRuntimeParityProjection,
): string {
  return `{
      initiative: {
        round: ${input.round},
        alreadyActed: ${renderQntAlreadyActed(input)},
        stillToAct: ${renderQntStillToAct(input)},
      },
      fighter: {
        hp: ${input.fighterHp},
        maxHp: 12,
        tempHp: ${input.fighterTempHp},
        ac: 10,
        dexMod: 0,
        activeEffects: Set(),
        concentrating: false,
        unconscious: ${input.fighterUnconscious},
        stable: false,
        deathSuccesses: 0,
        deathFailures: ${input.fighterDeathFailures},
        lifecycle: UsesDeathSavingThrows,
        reactionAvailable: true,
        speed: 30,
        movementSpent: 0,
        hidden: NotHidden,
        dodging: false,
        prone: false,
        creatureSize: Medium,
        leftHandUse: HFree,
        rightHandUse: HMainWeapon,
      },
      goblin: {
        hp: ${input.goblinHp},
        maxHp: 10,
        tempHp: ${input.goblinTempHp},
        ac: 15,
        dexMod: 2,
        activeEffects: Set(),
        concentrating: false,
        unconscious: false,
        stable: false,
        deathSuccesses: 0,
        deathFailures: 0,
        lifecycle: DiesAtZeroHp,
        reactionAvailable: true,
        speed: 30,
        movementSpent: 0,
        hidden: NotHidden,
        dodging: false,
        prone: false,
        creatureSize: Small,
        leftHandUse: HFree,
        rightHandUse: HFree,
      },
      actionAvailable: ${input.actionAvailable},
      bonusActionAvailable: ${input.bonusActionAvailable},
      dashMovementBonus: 0,
      disengaged: false,
      lightWeaponAttackMade: ${input.actionAvailable ? "false" : "true"},
      fighterReadiedSpellHeld: false,
      fighterReadiedMovementHeld: false,
      fighterHelpAttackGoblinForGoblin: false,
      grapple: NoGrapple,
      interruptStack: [],
      fighterGoblinDistance: 5,
      fighterHidePrerequisite: false,
      goblinRechargeAvailable: true,
      goblinLegendaryUsesRemaining: 2,
      lastTurnActor: ${input.lastTurnActor},
      legendaryActionWindowConsumed: false,
    }`;
}

function renderQntAlreadyActed(input: BattleRuntimeParityProjection): string {
  if (input.currentActor === "Goblin") {
    return "[Fighter]";
  }

  return "[]";
}

function renderQntStillToAct(input: BattleRuntimeParityProjection): string {
  if (input.currentActor === "Goblin") {
    return "[Goblin]";
  }

  return "[Fighter, Goblin]";
}

function hidePrerequisites(
  entries: readonly (readonly [CombatantId, BattleHidePrerequisite])[],
): ReadonlyMap<CombatantId, BattleHidePrerequisite> {
  return new Map(entries);
}

function fighterVsGoblinBattle(input?: {
  readonly hidePrerequisites?: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
}): BattleState {
  return startBattle({
    battleId: battleId("battle-attack"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
    ...(input?.hidePrerequisites === undefined
      ? {}
      : { hidePrerequisites: input.hidePrerequisites }),
  });
}

function fighterGrapplesGoblin(
  state: BattleState,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const subject: BattleSubject = {
    tag: "action",
    actorId: fighterId,
    action: "grapple",
  };
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const outcome = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, goblinId)],
    }),
    "grappleOutcome",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, goblinId), grappleOutcomeFill(outcome, false)],
    }),
  );
}

function fighterTurnWithReadiedRay(
  trigger: BattleReadiedSpellTrigger,
): BattleState {
  const wizardReady = resolveBattleSubject({
    state: startBattle({
      battleId: battleId(`battle-readied-${trigger}`),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 30,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    }),
    subject: {
      tag: "actionSpell",
      actorId: wizardId,
      spellId: "ray_of_frost",
      spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
      readyTrigger: trigger,
    },
    fills: [],
  });
  if (wizardReady.tag !== "resolved") {
    throw new Error(`Expected resolved Ready Spell, got ${wizardReady.tag}.`);
  }
  if (wizardReady.state.readiedSpells.get(wizardId) === undefined) {
    throw new Error("Expected Wizard to hold a readied spell.");
  }
  const fighterTurn = endTurn({ state: wizardReady.state, actorId: wizardId });
  if (fighterTurn.tag !== "resolved") {
    throw new Error(`Expected resolved End Turn, got ${fighterTurn.tag}.`);
  }
  return fighterTurn.state;
}

function fighterTurnWithReadiedAcidAndSecondReadiedRay(): BattleState {
  const firstReady = requireResolved(
    resolveBattleSubject({
      state: startBattle({
        battleId: battleId("battle-nested-readied-reactions"),
        combatants: [
          characterSeed({
            combatantId: wizardId,
            displayName: "Wizard",
            initiative: 40,
            attack: null,
            spellcasting: wizardSpellcasting(),
          }),
          characterSeed({
            combatantId: secondWizardId,
            displayName: "Second Wizard",
            initiative: 30,
            attack: null,
            spellcasting: wizardSpellcasting(),
          }),
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      subject: {
        tag: "actionSpell",
        actorId: wizardId,
        spellId: "acid_splash",
        spellActId: "readiedSpell:cantripSaveGateDamage:acid_splash",
        readyTrigger: "attackHit",
      },
      fills: [],
    }),
  ).state;
  const secondWizardTurn = requireResolved(
    endTurn({ state: firstReady, actorId: wizardId }),
  ).state;
  const secondReady = requireResolved(
    resolveBattleSubject({
      state: secondWizardTurn,
      subject: {
        tag: "actionSpell",
        actorId: secondWizardId,
        spellId: "ray_of_frost",
        spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
        readyTrigger: "saveFailed",
      },
      fills: [],
    }),
  ).state;
  return requireResolved(
    endTurn({ state: secondReady, actorId: secondWizardId }),
  ).state;
}

function wizardTurnWithReadiedRay(
  trigger: BattleReadiedSpellTrigger,
): BattleState {
  const base = wizardVsSkeletonBattle();
  const wizardReady = resolveBattleSubject({
    state: base,
    subject: {
      tag: "actionSpell",
      actorId: wizardId,
      spellId: "ray_of_frost",
      spellActId: "readiedSpell:cantripSpellAttack:ray_of_frost",
      readyTrigger: trigger,
    },
    fills: [],
  });
  if (wizardReady.tag !== "resolved") {
    throw new Error(`Expected resolved Ready Spell, got ${wizardReady.tag}.`);
  }
  const readied = wizardReady.state.readiedSpells.get(wizardId);
  const concentratingWizard = wizardReady.state.combatants.get(wizardId);
  if (readied === undefined || concentratingWizard === undefined) {
    throw new Error("Expected Wizard to hold a readied spell.");
  }
  return {
    ...base,
    combatants: new Map(base.combatants).set(wizardId, concentratingWizard),
    readiedSpells: new Map([[wizardId, readied]]),
  };
}

function goblinTurnBattle(
  input: { readonly fighterHp?: number } = {},
): BattleState {
  const afterFighter = endTurn({
    state: startBattle({
      battleId: battleId("battle-goblin-attack"),
      combatants: [
        characterSeed({
          initiative: 20,
          ...(input.fighterHp === undefined
            ? {}
            : { currentHp: input.fighterHp }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    }),
    actorId: fighterId,
  });
  if (afterFighter.tag !== "resolved") {
    throw new Error(`Expected resolved End Turn, got ${afterFighter.tag}.`);
  }

  return afterFighter.state;
}

function fighterAttackSubject(
  attackName: string = "Longsword",
): Extract<BattleSubject, { readonly tag: "action" }> {
  return {
    tag: "action",
    actorId: fighterId,
    action: "attack",
    attackName,
  };
}

function goblinAttackSubject(
  attackName: "Scimitar" | "Shortbow",
): Extract<BattleSubject, { readonly tag: "action" }> {
  return {
    tag: "action",
    actorId: goblinId,
    action: "attack",
    attackName,
  };
}

function monsterAttackSubject(
  attackName: "Cinder Breath" | "Dread Gaze" | "Tail Swipe",
  statBlockSection: "actions" | "legendaryActions" = "actions",
): Extract<BattleSubject, { readonly tag: "action" }> {
  return {
    tag: "action",
    actorId: goblinId,
    action: "attack",
    attackName,
    ...(statBlockSection === "actions" ? {} : { statBlockSection }),
  };
}

function attackInitialTargetHole(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action" }
  > = fighterAttackSubject(),
): BattleHole {
  return requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [],
    }),
    "targetChoice",
  );
}

function attackRollHoleAfterTarget(
  state: BattleState,
  targetHole: BattleHole,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action" }
  > = fighterAttackSubject(),
  targetId: CombatantId = targetHole.kind === "targetChoice"
    ? (targetHole.choices[0] ?? goblinId)
    : goblinId,
): BattleHole {
  if (targetHole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  return requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(targetHole, targetId)],
    }),
    "attackRoll",
  );
}

function attackDamageHoleAfterHit(
  state: BattleState,
  targetHole: BattleHole,
  rollHole: BattleHole,
  attackRoll: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: AttackRollMode;
  } = {
    total: 15,
    naturalD20: 10,
  },
  subject: Extract<
    BattleSubject,
    { readonly tag: "action" }
  > = fighterAttackSubject(),
  targetId: CombatantId = targetHole.kind === "targetChoice"
    ? (targetHole.choices[0] ?? goblinId)
    : goblinId,
): BattleHole {
  if (targetHole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  return requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, targetId),
        attackRollFill(rollHole, attackRoll),
      ],
    }),
    "rolledDice",
  );
}

function criticalAttackDamageResult(
  state: BattleState,
  targetId: CombatantId,
): ReturnType<typeof resolveBattleSubject> {
  const targetHole = attackInitialTargetHole(state);
  const rollHole = attackRollHoleAfterTarget(state, targetHole);
  const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
    total: 20,
    naturalD20: 20,
  });

  return resolveBattleSubject({
    state,
    subject: {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Longsword",
    },
    fills: [
      targetFill(targetHole, targetId),
      attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
      damageRollFillWithGroups(damageHole, [[4, 4]]),
    ],
  });
}

function characterWithDeathSaveCounters(input: {
  readonly combatantId: CombatantId;
  readonly successes: 0 | 1 | 2;
  readonly failures: 0 | 1 | 2;
}): BattleState {
  const state = startBattle({
    battleId: battleId("battle-character-start-turn-death-save-counters"),
    combatants: [
      characterSeed({ initiative: 20 }),
      characterSeed({
        combatantId: input.combatantId,
        displayName: "Target Fighter",
        initiative: 10,
        currentHp: 0,
        attack: null,
      }),
    ],
  });
  const combatant = state.combatants.get(input.combatantId);
  if (
    combatant === undefined ||
    combatant.zeroHpLifecycle.policy !== "usesDeathSavingThrows"
  ) {
    throw new Error("Expected target character with death-save lifecycle.");
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(input.combatantId, {
      ...combatant,
      zeroHpLifecycle: {
        ...combatant.zeroHpLifecycle,
        deathSaves: {
          deathSaves: {
            successes: input.successes,
            failures: input.failures,
          },
          stable: false,
          dead: false,
          hpRegained: false,
        },
      },
    }),
  };
}

function requireHole(
  result: ReturnType<typeof resolveBattleSubject>,
  kind: BattleHole["kind"],
): BattleHole {
  if (result.tag !== "needsHoles") {
    throw new Error(
      `Expected needsHoles, got ${result.tag}${
        result.tag === "invalid" ? `: ${result.message}` : ""
      }.`,
    );
  }
  const hole = result.holes.find((candidate) => candidate.kind === kind);
  if (hole == null) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function findHole(
  holes: readonly BattleHole[],
  kind: BattleHole["kind"],
): BattleHole {
  const hole = holes.find((candidate) => candidate.kind === kind);
  if (hole == null) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function findAct(
  state: BattleState,
  subject: BattleSubject,
): ReturnType<typeof discoverBattleActs>[number] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      JSON.stringify(candidate.subject) === JSON.stringify(subject),
  );
  if (act === undefined) {
    throw new Error(`Expected discovered act ${JSON.stringify(subject)}.`);
  }
  return act;
}

function targetFill(hole: BattleHole, targetId: CombatantId): BattleFill {
  if (hole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
  };
}

function abilityCheckFill(hole: BattleHole, total: number): BattleFill {
  if (hole.kind !== "abilityCheck") {
    throw new Error("Expected abilityCheck hole.");
  }
  return {
    kind: "abilityCheck",
    holeId: hole.holeId,
    value: { total },
  };
}

function attackRollFill(
  hole: BattleHole,
  value: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: AttackRollMode;
  },
): BattleFill {
  if (hole.kind !== "attackRoll") {
    throw new Error("Expected attackRoll hole.");
  }
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
      ...(value.rollMode === undefined ? {} : { rollMode: value.rollMode }),
    },
  };
}

function deathSavingThrowFill(hole: BattleHole, roll: number): BattleFill {
  if (hole.kind !== "deathSavingThrow") {
    throw new Error("Expected deathSavingThrow hole.");
  }
  return {
    kind: "deathSavingThrow",
    holeId: hole.holeId,
    value: DieRollResult(roll),
  };
}

function concentrationSavingThrowFill(
  hole: BattleHole,
  succeeded: boolean,
): BattleFill {
  if (hole.kind !== "concentrationSavingThrow") {
    throw new Error("Expected concentrationSavingThrow hole.");
  }
  return {
    kind: "concentrationSavingThrow",
    holeId: hole.holeId,
    value: { succeeded },
  };
}

function reactionDecisionFill(
  hole: BattleHole,
  value: Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "reactionDecision" }> {
  if (hole.kind !== "reactionDecision") {
    throw new Error("Expected reactionDecision hole.");
  }
  return {
    kind: "reactionDecision",
    holeId: hole.holeId,
    value,
  };
}

function movementFill(
  hole: BattleHole,
  value: {
    readonly movementCostFeet: number;
    readonly distanceMovedFeet: number;
    readonly destinationDistances: readonly {
      readonly combatantId: CombatantId;
      readonly feet: number;
    }[];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  if (hole.kind !== "movement") {
    throw new Error("Expected movement hole.");
  }
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      movementCostFeet: movementFeet(value.movementCostFeet),
      distanceMovedFeet: movementFeet(value.distanceMovedFeet),
      destinationDistances: value.destinationDistances.map((distance) => ({
        combatantId: distance.combatantId,
        feet: movementFeet(distance.feet),
      })),
    },
  };
}

function grappleOutcomeFill(
  hole: BattleHole,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "grappleOutcome" }> {
  if (hole.kind !== "grappleOutcome") {
    throw new Error("Expected grappleOutcome hole.");
  }
  return {
    kind: "grappleOutcome",
    holeId: hole.holeId,
    value: { succeeded },
  };
}

function savingThrowOutcomeFill(
  hole: BattleHole,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): BattleFill {
  if (hole.kind !== "savingThrowOutcome") {
    throw new Error("Expected savingThrowOutcome hole.");
  }
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: outcomes,
  };
}

function damageRollFill(
  hole: BattleFillableHole,
  dieResult: number,
): BattleFill {
  return damageRollFillWithGroups(hole, [[dieResult]]);
}

function damageRollFillWithGroups(
  hole: BattleFillableHole,
  groups: readonly (readonly number[])[],
): BattleFill {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: rolledDiceGroups(groups),
  };
}

function rolledDiceGroups(
  groups: readonly (readonly number[])[],
): DamageRollValue {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }

  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

function rolledDiceGroup(group: readonly number[]): DamageRollValue[number] {
  const [first, ...rest] = group;
  if (first === undefined) {
    throw new Error("Expected at least one die result.");
  }

  return {
    results: [
      DieRollResult(first),
      ...rest.map((dieResult) => DieRollResult(dieResult)),
    ],
  };
}

function characterSeed(input: {
  readonly combatantId?: CombatantId;
  readonly displayName?: string;
  readonly initiative: number;
  readonly classLevel?: number;
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly currentHp?: number;
  readonly tempHp?: number;
  readonly armorClass?: ReturnType<typeof defaultArmorClassState>;
  readonly selectedLoadout?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["selectedLoadout"];
  readonly attack?: ReturnType<typeof testLongswordAttack> | null;
  readonly offHandAttack?: NonNullable<ReturnType<typeof testLongswordAttack>>;
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  const attack =
    input.attack === undefined ? testLongswordAttack() : input.attack;
  const selectedLoadout =
    input.selectedLoadout ??
    (attack === null
      ? {}
      : {
          weapon: {
            itemId: "main:weapon_longsword",
            unitId: "weapon_longsword",
            grip: "one_handed" as const,
          },
        });
  return {
    combatantId: input.combatantId ?? fighterId,
    displayName: input.displayName ?? "Fighter",
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      characterId: characterId("fighter-character"),
      characterUnitRefs: input.characterUnitRefs ?? [],
      classLevels: input.classLevels ?? [
        { className: "fighter", level: input.classLevel ?? 1 },
      ],
      armorClass:
        input.armorClass ?? armorClassStateForLoadout(selectedLoadout),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(12),
      tempHp: Hp(input.tempHp ?? 0),
      selectedLoadout,
      attack,
      ...(input.offHandAttack === undefined
        ? {}
        : { offHandAttack: input.offHandAttack }),
      ...(input.resources === undefined ? {} : { resources: input.resources }),
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function armorClassStateForLoadout(
  loadout: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["selectedLoadout"],
): ReturnType<typeof defaultArmorClassState> {
  return {
    ...defaultArmorClassState(),
    leftHandUse:
      loadout.shield === undefined
        ? loadout.offHandWeapon === undefined
          ? "free"
          : "offWeapon"
        : "shield",
    rightHandUse: loadout.weapon === undefined ? "free" : "mainWeapon",
  };
}

function testLongswordAttack(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["attack"] {
  const weapon = unitLibrary.requireUnit("weapon_longsword");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Longsword weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

function testDaggerAttack(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = unitLibrary.requireUnit("weapon_dagger");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Dagger weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

function testShortswordAttack(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = unitLibrary.requireUnit("weapon_shortsword");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Shortsword weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

function testLightHammerAttack(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = unitLibrary.requireUnit("weapon_flail");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Flail weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

function testPoisonWeaponAttack(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const base = testLightHammerAttack();
  return {
    ...base,
    weapon: {
      ...base.weapon,
      damage: { ...base.weapon.damage, damageType: "poison" },
    },
  };
}

function statBlockCreatureInit(input: {
  readonly combatantId?: CombatantId;
  readonly displayName?: string;
  readonly statBlock?: StatBlockRecord;
  readonly initiative: number;
  readonly currentHp?: number;
  readonly tempHp?: number;
}): BattleCreatureInit {
  const statBlock = input.statBlock ?? statBlockRecord();
  if (statBlock.statBlock.hp.kind !== "literal") {
    throw new Error(
      "Battle runtime test Stat Block fixture must use literal HP.",
    );
  }
  const maxHp = statBlock.statBlock.hp.value;
  return {
    combatantId: input.combatantId ?? goblinId,
    displayName: input.displayName ?? statBlock.statBlock.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "statBlock",
      statBlock,
      currentHp: Hp(input.currentHp ?? maxHp),
      maxHp: Hp(maxHp),
      tempHp: Hp(input.tempHp ?? 0),
    },
  };
}

function statBlockRecord(): StatBlockRecord {
  return statBlockCatalog.requireStatBlock("stat_block_goblin_warrior");
}

function monsterResourceStatBlock(): StatBlockRecord {
  const base = statBlockRecord();
  const scimitar = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Scimitar",
  );
  if (scimitar === undefined) {
    throw new Error("Expected Goblin Warrior Scimitar fixture.");
  }
  return {
    ...base,
    id: "stat_block_resource_test_monster",
    name: "Resource Test Monster",
    statBlock: {
      ...base.statBlock,
      displayName: "Resource Test Monster",
      actions: {
        attacks: [
          {
            ...scimitar,
            name: "Cinder Breath",
            limitedUse: { kind: "recharge", minimumRoll: 5 },
          },
          {
            ...scimitar,
            name: "Dread Gaze",
            limitedUse: { kind: "daily", uses: 1 },
          },
        ],
      },
      legendaryActions: {
        uses: 2,
        actions: {
          attacks: [
            {
              ...scimitar,
              name: "Tail Swipe",
            },
          ],
        },
      },
    },
  };
}

function monsterResourceStatBlockWithUnsupportedAttackSections(): StatBlockRecord {
  const base = monsterResourceStatBlock();
  const cinderBreath = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Cinder Breath",
  );
  if (cinderBreath === undefined) {
    throw new Error("Expected Cinder Breath fixture.");
  }
  return {
    ...base,
    id: "stat_block_unsupported_attack_sections_test_monster",
    statBlock: {
      ...base.statBlock,
      bonusActions: {
        attacks: [
          {
            ...cinderBreath,
            name: "Swift Bite",
          },
        ],
      },
      reactions: {
        attacks: [
          {
            ...cinderBreath,
            name: "Counter Snap",
          },
        ],
      },
    },
  };
}

function monsterResourceStatBlockWithTwoRechargeActions(): StatBlockRecord {
  const base = monsterResourceStatBlock();
  const cinderBreath = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Cinder Breath",
  );
  if (cinderBreath === undefined) {
    throw new Error("Expected Cinder Breath fixture.");
  }
  return {
    ...base,
    id: "stat_block_two_recharge_test_monster",
    statBlock: {
      ...base.statBlock,
      actions: {
        ...base.statBlock.actions,
        attacks: [
          ...(base.statBlock.actions?.attacks ?? []),
          {
            ...cinderBreath,
            name: "Ash Cloud",
            limitedUse: { kind: "recharge", minimumRoll: 6 },
          },
        ],
      },
    },
  };
}

function skeletonCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: skeletonId,
    displayName: "Skeleton",
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "statBlock",
      statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
      currentHp: Hp(13),
      maxHp: Hp(13),
      tempHp: Hp(0),
    },
  };
}

function resistantSkeletonCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const skeleton = statBlockCatalog.requireStatBlock("stat_block_skeleton");
  const {
    vulnerabilities: _vulnerabilities,
    immunities: _immunities,
    ...statBlockWithoutDamageModifiers
  } = skeleton.statBlock;
  return {
    combatantId: skeletonId,
    displayName: "Slashing Resistant Skeleton",
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "statBlock",
      statBlock: {
        id: "stat_block_slashing_resistant_skeleton",
        kind: "statBlock",
        name: "Slashing Resistant Skeleton",
        provenance: {
          kind: "xphb",
          section: "battle-runtime test fixture",
        },
        statBlock: {
          ...statBlockWithoutDamageModifiers,
          displayName: "Slashing Resistant Skeleton",
          resistances: { kind: "fixed", damageTypes: ["slashing"] },
        },
      },
      currentHp: Hp(13),
      maxHp: Hp(13),
      tempHp: Hp(0),
    },
  };
}

function actionSurgeResource(input?: {
  readonly unit?: UnitRecord;
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = input?.unit ?? unitLibrary.requireUnit("fighter_action_surge");
  if (unit.kind !== "class_feature" || !("resource" in unit.mechanics)) {
    throw new Error("Expected Action Surge resource Unit.");
  }
  return {
    unit,
    resource: unit.mechanics.resource,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

function secondWindResource(input?: {
  readonly unit?: UnitRecord;
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = input?.unit ?? unitLibrary.requireUnit("fighter_second_wind");
  if (unit.kind !== "class_feature" || !("resource" in unit.mechanics)) {
    throw new Error("Expected Second Wind resource Unit.");
  }
  return {
    unit,
    resource: unit.mechanics.resource,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

function unsupportedClassRiderResource(
  unitId: string,
  name: string,
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = actionSurgeWithAdditionalDirectEffect();
  if (unit.kind !== "class_feature" || !("resource" in unit.mechanics)) {
    throw new Error("Expected class feature resource Unit.");
  }
  return {
    unit: { ...unit, id: unitId, name },
    resource: unit.mechanics.resource,
  };
}

function actionSurgeWithAdditionalDirectEffect(): UnitRecord {
  const unit = unitLibrary.requireUnit("fighter_action_surge");
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "activation") {
    throw new Error("Expected Action Surge activation Unit.");
  }
  const phase = unit.mechanics.phases[0];
  if (phase?.kind !== "direct" || phase.effects === undefined) {
    throw new Error("Expected Action Surge direct phase.");
  }
  return {
    ...unit,
    mechanics: {
      ...unit.mechanics,
      phases: [
        {
          ...phase,
          effects: [...phase.effects, phase.effects[0]],
        },
      ],
    },
  };
}

function secondWindWithAdditionalDirectEffect(): UnitRecord {
  const unit = unitLibrary.requireUnit("fighter_second_wind");
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "activation") {
    throw new Error("Expected Second Wind activation Unit.");
  }
  const phase = unit.mechanics.phases[0];
  if (phase?.kind !== "direct" || phase.effects === undefined) {
    throw new Error("Expected Second Wind direct phase.");
  }
  return {
    ...unit,
    mechanics: {
      ...unit.mechanics,
      phases: [
        {
          ...phase,
          effects: [...phase.effects, phase.effects[0]],
        },
      ],
    },
  };
}

function wizardVsSkeletonBattle(input?: {
  readonly extraCombatants?: readonly BattleCreatureInit[];
  readonly combatantDistances?: readonly {
    readonly combatantA: CombatantId;
    readonly combatantB: CombatantId;
    readonly feet: number;
  }[];
}): BattleState {
  return startBattle({
    battleId: battleId("battle-wizard-skeleton"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting(),
      }),
      skeletonCreatureInit({ initiative: 10 }),
      ...(input?.extraCombatants ?? []),
    ],
    ...(input?.combatantDistances === undefined
      ? {}
      : {
          combatantDistances: input.combatantDistances.map((distance) => ({
            combatantA: distance.combatantA,
            combatantB: distance.combatantB,
            feet: movementFeet(distance.feet),
          })),
        }),
  });
}

function wizardSpellcasting(input?: {
  readonly cantrips?: readonly SpellRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"]
> {
  return {
    spellcastingAbilityModifier: 3,
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    cantrips: input?.cantrips ?? [
      spellRecord("ray_of_frost"),
      spellRecord("acid_splash"),
    ],
    preparedSpells: input?.preparedSpells ?? [spellRecord("magic_missile")],
    spellSlots: [{ spellLevel: 1, count: 2 }],
  };
}

function acidSplashWithRadius(radiusFeet: number): SpellRecord {
  const spell = spellRecord("acid_splash");
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected Acid Splash activation spell.");
  }
  const phase = spell.mechanics.phases[0];
  if (
    phase?.kind !== "save_gate" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area" ||
    phase.attachment.value.shape.kind !== "sphere"
  ) {
    throw new Error("Expected Acid Splash point-origin Sphere phase.");
  }
  return {
    ...spell,
    mechanics: {
      ...spell.mechanics,
      phases: [
        {
          ...phase,
          attachment: {
            ...phase.attachment,
            value: {
              ...phase.attachment.value,
              shape: {
                ...phase.attachment.value.shape,
                radiusFeet,
              },
            },
          },
        },
      ],
    },
  };
}

function spellRecord(
  spellId: "magic_missile" | "mage_armor" | "ray_of_frost" | "acid_splash",
) {
  const unit = testSpellRecords.get(spellId);
  if (unit === undefined) {
    throw new Error(`Expected ${spellId} spell Unit.`);
  }
  return unit satisfies SpellRecord;
}

function magicSubject(
  spellId: "magic_missile" | "mage_armor" | "ray_of_frost" | "acid_splash",
): BattleSubject {
  return {
    tag: "actionSpell",
    actorId: wizardId,
    spellId,
  };
}

function expendedLevelOneSlots(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "resolved" }
  >,
  actorId: CombatantId,
): number {
  const actor = result.state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected character spellcaster.");
  }
  return (
    actor.origin.spellcasting?.spellSlots.find((slot) => slot.spellLevel === 1)
      ?.expended ?? 0
  );
}
