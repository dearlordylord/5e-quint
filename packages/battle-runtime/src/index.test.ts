import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  BattleFillSchema,
  BATTLE_READIED_SPELL_TRIGGERS,
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
  snapshotBattle,
  startBattle,
  type BattleFill,
  type BattleHole,
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
import {
  holeId,
  type AttackRollMode,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  DieRollResult,
  Hp,
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
          { combatantA: fighterId, combatantB: goblinId, feet: 5 },
          { combatantA: goblinId, combatantB: fighterId, feet: 10 },
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

    expect(acts.map((act) => act.subject)).toEqual([
      {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      { tag: "runtimeCommand", actorId: fighterId, command: "move" },
      { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
    ]);
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

    expect(acts.map((act) => act.subject)).toEqual([
      { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
    ]);
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
            destinationDistances: [{ combatantId: goblinId, feet: 40 }],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
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
    const staleSuppressionFill = movementFill(hole, {
      movementCostFeet: 5,
      destinationDistances: [{ combatantId: goblinId, feet: 10 }],
      provokesOpportunityAttacks: false,
    } as Extract<BattleFill, { readonly kind: "movement" }>["value"]);

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

    expect(acts.map((act) => act.subject)).toEqual([
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
    ]);
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
        { combatantA: goblinId, combatantB: fighterId, feet: 5 },
        { combatantA: goblinId, combatantB: distantFighterId, feet: 10 },
        { combatantA: goblinId, combatantB: longRangeFighterId, feet: 100 },
        { combatantA: fighterId, combatantB: distantFighterId, feet: 10 },
        { combatantA: fighterId, combatantB: longRangeFighterId, feet: 100 },
        {
          combatantA: distantFighterId,
          combatantB: longRangeFighterId,
          feet: 90,
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
        acts: [
          expect.objectContaining({
            subject: expect.objectContaining({ action: "attack" }),
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
        ],
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
      [
        {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        { tag: "runtimeCommand", actorId: fighterId, command: "move" },
        { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
      ],
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

  test("Wizard action-time spell acts spend slots for prepared level-1 spells but not cantrips", () => {
    const magicMissileState = wizardVsSkeletonBattle();
    expect(
      discoverBattleActs(magicMissileState).map((act) => act.subject),
    ).toEqual([
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
    ]);

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
                deltaFeet: -10,
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
            deltaFeet: -10,
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
    ).toEqual([
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
    ]);
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
                kind: "mageArmorBaseArmorClass",
                sourceSpellId: "mage_armor",
                sourceCombatantId: wizardId,
                base: 13,
                ability: "dex",
                duration: { kind: "hours", amount: 8 },
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
              kind: "mageArmorBaseArmorClass",
              sourceSpellId: "hold_person",
              sourceCombatantId: wizardId,
              base: 13,
              ability: "dex",
              duration: { kind: "hours", amount: 1 },
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
  });
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
  | "actionSpell"
  | "unitFeature"
  | "endTurn"
  | "move"
  | "releaseReadiedSpell"
  | "opportunityAttack" {
  if (subject.tag === "action") {
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
  expect(quintOutput).toContain("44 passing");
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
      },
      actionAvailable: ${input.actionAvailable},
      bonusActionAvailable: ${input.bonusActionAvailable},
      fighterReadiedSpellHeld: false,
      interruptStack: [],
      fighterGoblinDistance: 5,
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

function fighterVsGoblinBattle(): BattleState {
  return startBattle({
    battleId: battleId("battle-attack"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
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
  value: Extract<BattleFill, { readonly kind: "movement" }>["value"],
): Extract<BattleFill, { readonly kind: "movement" }> {
  if (hole.kind !== "movement") {
    throw new Error("Expected movement hole.");
  }
  return {
    kind: "movement",
    holeId: hole.holeId,
    value,
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
  readonly attack?: ReturnType<typeof testLongswordAttack> | null;
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId ?? fighterId,
    displayName: input.displayName ?? "Fighter",
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      characterId: characterId("fighter-character"),
      characterUnitRefs: [],
      classLevels: input.classLevels ?? [
        { className: "fighter", level: input.classLevel ?? 1 },
      ],
      armorClass: input.armorClass ?? defaultArmorClassState(),
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(12),
      tempHp: Hp(input.tempHp ?? 0),
      zeroHpLifecyclePolicy: "usesDeathSavingThrows",
      selectedLoadout: {
        weapon: { unitId: "weapon_longsword", grip: "one_handed" },
      },
      attack: input.attack === undefined ? testLongswordAttack() : input.attack,
      ...(input.resources === undefined ? {} : { resources: input.resources }),
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
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
    abilityModifier: 3,
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
    abilityModifier: 3,
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
      zeroHpLifecyclePolicy: "diesAtZeroHp",
    },
  };
}

function statBlockRecord(): StatBlockRecord {
  return statBlockCatalog.requireStatBlock("stat_block_goblin_warrior");
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
      zeroHpLifecyclePolicy: "diesAtZeroHp",
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
      zeroHpLifecyclePolicy: "diesAtZeroHp",
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
      : { combatantDistances: input.combatantDistances }),
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
