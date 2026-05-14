import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.bardic-inspiration-failed-d20-test unit-feature.innate-sorcery-activation unit-feature.martial-arts-attack-projection unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave spell.invocation-beam-sequence spell.invocation-condition-save spell.invocation-grease-ground-hazard spell.invocation-marked-damage-rider spell.invocation-sleep-repeat-save-lifecycle spell.invocation-sleep-target-admission spell.invocation-weapon-damage-rider
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV72B bard_bardic_inspiration
import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  battleBonusActionStandardActionSupportForUnit,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
  BattleFillSchema,
  BattleHoleSchema,
  BattleSnapshotSchema,
  battleCombatantSide,
  BattleSubjectSchema,
  BATTLE_READIED_SPELL_TRIGGERS,
  addBattleCombatant,
  battleReactionRollOrDamageReductionSupportForUnit,
  battleUnitSupportProfilesForUnit,
  battleId,
  battleObjectId,
  armorOfShadowsSpellInvocationRef,
  cantripSpellInvocationRef,
  classFeatureFreeCastSpellInvocationRef,
  breakBattleConcentration,
  characterBattleResourceUsage,
  characterBattleResourceSupportedForUnit,
  characterId,
  concentrationSavingThrowDc,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  KNOCKED_OUT_UNCONSCIOUS,
  resolveBattleSubject,
  resolveBardicInspirationFailedD20Test,
  resolveBattleReaction,
  resolveBattleConcentrationDamage,
  removeBattleCombatants,
  sameBattleSubject,
  snapshotBattle,
  spellSaveDcForCaster,
  spellSlotInvocationRef,
  startBattle,
  resolveFailedAbilityCheckResourceBoost,
  resolveSuccessfulAbilityCheckReactionReduction,
  type BattleFill,
  type BattleHole,
  type BattleHidePrerequisite,
  type BattleReactionFrame,
  type BattleReadiedSpellTrigger,
  type BattleState,
  type BattleSubject,
  type BattleCreatureState,
  type CombatantId,
  type BattleCreatureInit,
  type BattleUnitRef,
  type ActiveOngoingFeatureOccurrence,
  type OngoingFeatureSourceKey,
} from "./index.ts";
import { characterBattleResourceIsUnlimited } from "./character-battle-resources.ts";
import { supportedSpellInvocationMatchesRef } from "./battle-reducer/spells-invocation-ref.ts";
import { supportedSpellActs } from "./battle-reducer/spells-profiles.ts";
import { spellFillSet } from "./battle-reducer/spells-resolve-fill-set.ts";
import { resolveMarkedDamageRiderSpellAct } from "./battle-reducer/spells-resolve-release.ts";
import weaponQuarterstaffInput from "../../surface/content/weapon_quarterstaff.json";
import weaponLongbowInput from "../../surface/content/weapon_longbow.json";
import {
  abilityModifier,
  armorClass,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import type { ConditionState } from "@dnd/shared-algebras/conditions-algebra";
import {
  applyCondition,
  hasCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import {
  elapsedTimeTicks,
  elapsedTimeTicksFromHours,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { tickDurationEffects } from "./battle-reducer/turn-end-movement.ts";
import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";
import { combatantCanSee } from "./battle-reducer/creature-state-leaves.ts";
import { applyWeaponMasterySapOnHit } from "./battle-reducer/attack-roll.ts";
import {
  holeId,
  holeInstanceKey,
  type AttackRollMode,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  attackBonus,
  abilityModifier as battleAbilityModifier,
  damageAmount,
  difficultyClass,
  DieRollResult,
  Hp,
  movementDeltaFeet,
  movementFeet,
  proficiencyBonus,
  resourceCount,
  type Condition,
} from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { isEffectAtom } from "@dnd/surface/surface/types";
import magicMissileInput from "../../surface/content/magic_missile.json";
import mageArmorInput from "../../surface/content/mage_armor.json";
import rayOfFrostInput from "../../surface/content/ray_of_frost.json";
import acidSplashInput from "../../surface/content/acid_splash.json";
import chillTouchInput from "../../surface/content/chill_touch.json";
import eldritchBlastInput from "../../surface/content/eldritch_blast.json";
import poisonSprayInput from "../../surface/content/poison_spray.json";
import sacredFlameInput from "../../surface/content/sacred_flame.json";
import inflictWoundsInput from "../../surface/content/inflict_wounds.json";
import shockingGraspInput from "../../surface/content/shocking_grasp.json";
import guidingBoltInput from "../../surface/content/guiding_bolt.json";
import rayOfSicknessInput from "../../surface/content/ray_of_sickness.json";
import starryWispInput from "../../surface/content/starry_wisp.json";
import viciousMockeryInput from "../../surface/content/vicious_mockery.json";
import burningHandsInput from "../../surface/content/burning_hands.json";
import colorSprayInput from "../../surface/content/color_spray.json";
import iceKnifeInput from "../../surface/content/ice_knife.json";
import greaseInput from "../../surface/content/grease.json";
import huntersMarkInput from "../../surface/content/hunters_mark.json";
import healingWordInput from "../../surface/content/healing_word.json";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type {
  AreaDirectEffectAtom,
  EffectAtom,
  SpellRecord,
  StatBlockRecord,
  UnitRecord,
  WeaponRecord,
} from "@dnd/surface/surface/types";

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

const ROGUE_CUNNING_ACTION_SUPPORT_PROFILE = {
  kind: "alternateActionCost",
  from: {
    kind: "standardAction",
    actions: ["dash", "disengage", "hide"],
  },
  to: { kind: "bonusAction" },
} as const;

function testBattleCreatureStateWithConditions(
  combatant: BattleState["combatants"] extends ReadonlyMap<
    CombatantId,
    infer Creature
  >
    ? Creature
    : never,
  conditions: ConditionState,
) {
  if (combatant.positiveHpUnconscious !== null) {
    throw new Error("Test fixture must not rewrite Knocked Out conditions.");
  }
  return { ...combatant, conditions, positiveHpUnconscious: null };
}

function addBattleCombatantRight(
  input: Parameters<typeof addBattleCombatant>[0],
): BattleState {
  const result = addBattleCombatant(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function removeBattleCombatantsRight(
  input: Parameters<typeof removeBattleCombatants>[0],
): BattleState {
  const result = removeBattleCombatants(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
const battleRuntimeSpecPath = fileURLToPath(
  new URL("../battle-runtime.qnt", import.meta.url),
);
const canonicalBattleRuntimeQntSelfTestTimeoutMs = 60_000;
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
type TestCharacterWeaponAttack = Extract<
  NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["attack"]
  >,
  { readonly kind: "weapon" }
>;
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
  [
    magicMissileInput,
    mageArmorInput,
    rayOfFrostInput,
    acidSplashInput,
    chillTouchInput,
    eldritchBlastInput,
    poisonSprayInput,
    sacredFlameInput,
    inflictWoundsInput,
    shockingGraspInput,
    guidingBoltInput,
    rayOfSicknessInput,
    starryWispInput,
    viciousMockeryInput,
    burningHandsInput,
    colorSprayInput,
    iceKnifeInput,
    greaseInput,
    huntersMarkInput,
    healingWordInput,
  ]
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
    const state = startBattleRight({
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
          hp: 0,
          maxHp: 10,
          tempHp: 0,
          armorClass: 15,
          zeroHpLifecycle: { policy: "diesAtZeroHp", dead: true },
          conditions: [],
        },
        {
          combatantId: fighterId,
          displayName: "Fighter",
          hp: 12,
          maxHp: 12,
          tempHp: 0,
          armorClass: 10,
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
      turn: {
        actionResources: [{ kind: "action", source: "turn" }],
        bonusActionAvailable: true,
        spellSlotExpendedThisTurn: false,
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    });

    expect(
      Schema.encodeSync(BattleSnapshotSchema)(snapshotBattle(state)),
    ).toMatchObject({
      battleId: "battle-1",
      combatants: [
        {
          combatantId: "goblin",
          movement: { speedFeet: 30, spentFeet: 0, remainingFeet: 30 },
        },
        {
          combatantId: "fighter",
        },
      ],
      readiedResponses: { spells: [], movements: [] },
      helpAttackMarkers: [],
      pendingReaction: null,
    });
  });

  test("startBattle preserves caller-supplied order among tied Initiative scores", () => {
    const state = startBattleRight({
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
      startBattleRight({
        battleId: battleId("battle-overmax-hp"),
        combatants: [
          characterSeed({ initiative: 12, currentHp: 13 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow("Battle initialization current HP exceeds max HP.");

    expect(() =>
      startBattleRight({
        battleId: battleId("battle-statblock-overmax-hp"),
        combatants: [
          characterSeed({ initiative: 12 }),
          statBlockCreatureInit({ initiative: 10, currentHp: 11 }),
        ],
      }),
    ).toThrow("Battle initialization current HP exceeds max HP.");
  });

  test("startBattle rejects fractional expended Spell Slots", () => {
    expect(() =>
      startBattleRight({
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
      startBattleRight({
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
      startBattleRight({
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
      startBattleRight({
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
        startBattleRight({
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
      startBattleRight({
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
      startBattleRight({
        battleId: battleId("battle-second-wind-without-fighter-level"),
        combatants: [
          characterSeed({
            initiative: 12,
            classLevels: [],
            resources: [resource()],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow(
      "Character class feature resource requires a fighter class level.",
    );
  });

  test("startBattle returns typed issue when an ability-modifier resource lacks its projected modifier", () => {
    const result = startBattle({
      battleId: battleId("battle-bardic-resource-missing-ability-modifier"),
      combatants: [
        characterSeed({
          initiative: 12,
          classLevels: [{ className: "bard", level: 1 }],
          resources: [{ unit: bardicInspirationUnit() }],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toEqual({
      tag: "battleStateInitIssue",
      message:
        "Ability-modifier resource cap requires the projected ability modifier.",
    });
  });

  test("discoverBattleActs exposes attack, movement, and endTurn for the current actor", () => {
    const acts = discoverBattleActs(
      startBattleRight({
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
        { tag: "action", actorId: fighterId, action: "shove" },
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
      startBattleRight({
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
    const added = addBattleCombatantRight({
      state,
      combatant: statBlockCreatureInit({
        combatantId: skeletonId,
        displayName: "Skeleton",
        initiative: 15,
      }),
    });

    expect(snapshotBattle(added)).toMatchObject({
      currentActorId: fighterId,
      turnOrder: [fighterId, skeletonId, goblinId],
    });

    const removedCurrent = removeBattleCombatantsRight({
      state: added,
      combatantIds: [fighterId],
    });

    expect(snapshotBattle(removedCurrent)).toMatchObject({
      currentActorId: skeletonId,
      turnOrder: [skeletonId, goblinId],
    });
  });

  test("generic combat actions spend the Action and expose typed battle state", () => {
    const state = fighterVsGoblinBattle();

    const dashed = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "dash",
          speedKind: "walk",
        },
        fills: [],
      }),
    );
    expect(dashed.snapshot.turn.actionResources).toEqual([]);
    expect(dashed.snapshot.turn.dashMovementBonusFeet).toBe(30);
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
    expect(readied.snapshot.readiedResponses.movements).toEqual([
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
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved", snapshot: { pendingReaction: null } });
  });

  test("Grease Difficult Terrain facts add extra Movement cost without storing geometry", () => {
    const areaId = "test-grease-area";
    const greased = castGreaseGroundHazardForMovementTest(areaId);
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: wizardId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state: greased, subject, fills: [] }),
      "movement",
    );
    const greaseGroundDifficultTerrain = {
      kind: "greaseGroundDifficultTerrain" as const,
      sourceCombatantId: wizardId,
      sourceSpellId: spellRecord("grease").id,
      areaId,
      totalDistanceFeet: movementFeet(10),
      greaseDistanceFeet: movementFeet(5),
    };

    expect(
      resolveBattleSubject({
        state: greased,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            greaseGroundDifficultTerrain,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Grease Difficult Terrain movement must spend total distance plus 1 extra foot for every foot moved through the area.",
    });

    const moved = requireResolved(
      resolveBattleSubject({
        state: greased,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 15,
            provokedOpportunityAttacks: [],
            greaseGroundDifficultTerrain,
          }),
        ],
      }),
    ).state;

    expect(moved.combatants.get(wizardId)).toMatchObject({
      movementSpentFeet: movementFeet(15),
    });
    const effect = moved.combatants
      .get(wizardId)
      ?.activeEffects.find(
        (candidate) => candidate.kind === "greaseGroundHazard",
      );
    expect(effect).toMatchObject({ kind: "greaseGroundHazard", areaId });
    expect(effect).not.toHaveProperty("originAnchorId");
    expect(effect).not.toHaveProperty("affectedTargetIds");
    expect(effect).not.toHaveProperty("shape");
  });

  test("Grease Difficult Terrain movement facts expire with the Grease ground hazard", () => {
    const areaId = "test-expiring-grease-area";
    const greased = castGreaseGroundHazardForMovementTest(areaId);
    let expired = greased;
    for (let i = 0; i < 20; i += 1) {
      expired = requireResolved(
        endTurn({
          state: expired,
          actorId: snapshotBattle(expired).currentActorId,
        }),
      ).state;
    }

    expect(
      expired.combatants
        .get(wizardId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "greaseGroundHazard" && effect.areaId === areaId,
        ),
    ).toBe(false);

    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: wizardId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state: expired, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state: expired,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
            greaseGroundDifficultTerrain: {
              kind: "greaseGroundDifficultTerrain",
              sourceCombatantId: wizardId,
              sourceSpellId: spellRecord("grease").id,
              areaId,
              totalDistanceFeet: movementFeet(10),
              greaseDistanceFeet: movementFeet(5),
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Grease Difficult Terrain movement fact does not match an active Grease ground hazard.",
    });
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
      awaitingReaction.snapshot.pendingReaction?.choices.find(
        (choice) =>
          choice.kind === "releaseReadiedMovement" &&
          choice.readiedMovementActorId === fighterId,
      );
    expect(awaitingReaction.snapshot.pendingReaction?.choices).toEqual(
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
      provokedOpportunityAttacks: [],
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
      movementSpentFeet: movementFeet(5),
    });
  });

  test("Help attack grants and consumes Advantage for the selected ally and target", () => {
    const state = startBattleRight({
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
    expect(missed.snapshot.helpAttackMarkers).toEqual([]);
  });

  test("Stand from Prone spends half Speed as Movement and clears Prone", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(fighterId)!;
    const proneState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          fighter,
          applyCondition(fighter.conditions, "prone"),
        ),
      ),
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
      startBattleRight({
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

  test("movement replay spends Movement from caller-provided movement cost", () => {
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
          provokedOpportunityAttacks: [],
        }),
      ],
    });

    expect(moved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: fighterId,
            movement: expect.objectContaining({
              speedFeet: 30,
              spentFeet: 10,
              remainingFeet: 20,
            }),
          }),
        ]),
      },
    });
    if (moved.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${moved.tag}.`);
    }
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
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("movement discovery stays available when only a special Speed has remaining budget", () => {
    const climberId = combatantId("unequal-speed-climber");
    const base = statBlockRecord();
    const state = startBattleRight({
      battleId: battleId("battle-unequal-special-speed"),
      combatants: [
        statBlockCreatureInit({
          combatantId: climberId,
          displayName: "Unequal Speed Climber",
          initiative: 20,
          statBlock: {
            ...base,
            id: "stat_block_unequal_speed_climber",
            name: "Unequal Speed Climber",
            statBlock: {
              ...base.statBlock,
              displayName: "Unequal Speed Climber",
              speeds: [
                { kind: "walk", feet: { kind: "literal", value: 30 } },
                { kind: "climb", feet: { kind: "literal", value: 40 } },
              ],
            },
          },
        }),
        characterSeed({ combatantId: fighterId, initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: climberId,
      command: "move",
    };
    const initialMoveHole = findHole(
      findAct(state, subject).initialHoles,
      "movement",
    );
    const walked = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(initialMoveHole, {
            speedKind: "walk",
            movementCostFeet: 30,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).state;

    const remainingMoveHole = findHole(
      findAct(walked, subject).initialHoles,
      "movement",
    );
    expect(remainingMoveHole).toMatchObject({
      speedKinds: [
        { kind: "walk", movementBudgetFeet: 0 },
        { kind: "climb", movementBudgetFeet: 10 },
      ],
    });
    expect(
      resolveBattleSubject({
        state: walked,
        subject,
        fills: [
          movementFill(remainingMoveHole, {
            speedKind: "climb",
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("battle state projects typed Grapple links", () => {
    const state = fighterVsGoblinBattle();

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
        expect.objectContaining({ combatantId: fighterId }),
        expect.objectContaining({
          combatantId: goblinId,
          conditions: expect.arrayContaining(["grappled"]),
          movement: expect.objectContaining({ speedFeet: 0 }),
        }),
      ]),
    );
    expect(grappled.state.grapples).toEqual([
      expect.objectContaining({
        grapplerId: fighterId,
        targetId: goblinId,
        targetExemptFromDragCost: false,
      }),
    ]);
  });

  test("Shove resolves the Unarmed Strike save and prone failure effect", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "shove",
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
      "shoveOutcome",
    );
    const shoved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, goblinId),
          shoveOutcomeFill(outcome, {
            succeeded: false,
            failedEffect: { kind: "prone" },
          }),
        ],
      }),
    );

    expect(outcome).toMatchObject({ dc: 13 });
    expect(shoved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: goblinId,
          conditions: expect.arrayContaining(["prone"]),
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
        expect.objectContaining({ combatantId: fighterId }),
        expect.objectContaining({
          combatantId: goblinId,
          conditions: expect.not.arrayContaining(["grappled"]),
        }),
      ]),
    );
    expect(released.state.grapples).toEqual([]);

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
        expect.objectContaining({ combatantId: fighterId }),
        expect.objectContaining({
          combatantId: goblinId,
          conditions: expect.not.arrayContaining(["grappled"]),
        }),
      ]),
    );
    expect(escaped.state.grapples).toEqual([]);
  });

  test("grapple drag movement accepts table-supplied Movement cost", () => {
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
            provokedOpportunityAttacks: [],
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
            movementCostFeet: 2,
            provokedOpportunityAttacks: [],
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
            provokedOpportunityAttacks: [],
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
            movementCostFeet: 10,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("Grappled attack rolls have disadvantage against targets other than the grappler", () => {
    const state = startBattleRight({
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
      combatants: new Map(dodged.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          fighter,
          applyCondition(fighter.conditions, "blinded"),
        ),
      ),
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
    const state = startBattleRight({
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
          conditions: expect.arrayContaining(["invisible"]),
        }),
      ]),
    );
    expect(hidden.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(18),
    });

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
          conditions: expect.not.arrayContaining(["invisible"]),
        }),
      ]),
    );
    expect(found.state.combatants.get(fighterId)?.hidden).toBeNull();
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
    });
    if (damageHoleResult.tag !== "needsHoles") {
      throw new Error("Expected hidden attack damage holes.");
    }
    expect(damageHoleResult.state.combatants.get(fighterId)?.hidden).toBeNull();

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
        expect.objectContaining({ combatantId: fighterId }),
      ]),
    );
    expect(missed.state.combatants.get(fighterId)?.hidden).toBeNull();
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
    });
    if (attackHoleResult.tag !== "needsHoles") {
      throw new Error("Expected hidden spell attack holes.");
    }
    expect(attackHoleResult.state.combatants.get(wizardId)?.hidden).toBeNull();
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
    });
    if (damageHoleResult.tag !== "needsHoles") {
      throw new Error("Expected hidden spell damage holes.");
    }
    expect(damageHoleResult.state.combatants.get(wizardId)?.hidden).toBeNull();
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
        invocation: cantripSpellInvocationRef(
          "ray_of_frost",
          "spellAttackDamage",
        ),
        mode: { tag: "ready", trigger: "spellCast" },
      },
      fills: [],
    });

    expect(readied).toMatchObject({
      tag: "resolved",
    });
    if (readied.tag !== "resolved") {
      throw new Error("Expected readied hidden spell to resolve.");
    }
    expect(readied.state.combatants.get(wizardId)?.hidden).toBeNull();
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
      "spellTargetAllocation",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: hiddenState,
        subject,
        fills: [
          spellTargetAllocationFill(target, [
            { targetId: skeletonId, count: 3 },
          ]),
        ],
      }),
      "rolledDice",
    );

    const concentration = resolveBattleSubject({
      state: hiddenState,
      subject,
      fills: [
        spellTargetAllocationFill(target, [{ targetId: skeletonId, count: 3 }]),
        damageRollFillWithGroups(damage, [[2, 2, 2]]),
      ],
    });

    expect(concentration).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "concentrationSavingThrow" }],
    });
    if (concentration.tag !== "needsHoles") {
      throw new Error("Expected hidden caster concentration holes.");
    }
    expect(concentration.state.combatants.get(wizardId)?.hidden).toBeNull();
  });

  test("Rogue Cunning Action exposes Dash, Disengage, and Hide as Bonus Actions", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rogue-cunning-action-hide"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "fighter", level: 1 }],
          characterUnitRefs: [
            {
              unitId: "rogue_cunning_action",
              supportProfiles: [ROGUE_CUNNING_ACTION_SUPPORT_PROFILE],
            },
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
      hidePrerequisites: hidePrerequisites([
        [fighterId, { kind: "coverOutOfEnemyLineOfSight", cover: "total" }],
      ]),
    });
    const dashSubject: BattleSubject = {
      tag: "bonusActionStandardAction",
      actorId: fighterId,
      sourceUnitId: "rogue_cunning_action",
      action: "dash",
      speedKind: "walk",
    };
    const disengageSubject: BattleSubject = {
      tag: "bonusActionStandardAction",
      actorId: fighterId,
      sourceUnitId: "rogue_cunning_action",
      action: "disengage",
    };
    const hideSubject: BattleSubject = {
      tag: "bonusActionStandardAction",
      actorId: fighterId,
      sourceUnitId: "rogue_cunning_action",
      action: "hide",
    };
    expect(findAct(state, dashSubject).summary).toBe("Dash as a Bonus Action.");
    expect(findAct(state, disengageSubject).summary).toBe(
      "Disengage as a Bonus Action.",
    );
    const hideAct = findAct(state, hideSubject);

    const dashed = requireResolved(
      resolveBattleSubject({ state, subject: dashSubject, fills: [] }),
    );
    expect(dashed.snapshot.turn).toMatchObject({
      bonusActionAvailable: false,
      actionResources: [{ kind: "action", source: "turn" }],
      dashMovementBonusFeet: 30,
    });

    const disengaged = requireResolved(
      resolveBattleSubject({ state, subject: disengageSubject, fills: [] }),
    );
    expect(disengaged.snapshot.turn).toMatchObject({
      bonusActionAvailable: false,
      actionResources: [{ kind: "action", source: "turn" }],
      disengaged: true,
    });
    expect(
      resolveBattleSubject({
        state,
        subject: {
          ...dashSubject,
          sourceUnitId: "class_rogue",
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });
    const noHidePrerequisiteState = startBattleRight({
      battleId: battleId("battle-rogue-cunning-action-no-hide-prerequisite"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "fighter", level: 1 }],
          characterUnitRefs: [
            {
              unitId: "rogue_cunning_action",
              supportProfiles: [ROGUE_CUNNING_ACTION_SUPPORT_PROFILE],
            },
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(findAct(noHidePrerequisiteState, dashSubject).summary).toBe(
      "Dash as a Bonus Action.",
    );
    expect(findAct(noHidePrerequisiteState, disengageSubject).summary).toBe(
      "Disengage as a Bonus Action.",
    );
    expect(
      discoverBattleActs(noHidePrerequisiteState).some(
        (act) => JSON.stringify(act.subject) === JSON.stringify(hideSubject),
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: noHidePrerequisiteState,
        subject: hideSubject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });

    const hidden = requireResolved(
      resolveBattleSubject({
        state,
        subject: hideSubject,
        fills: [
          abilityCheckFill(findHole(hideAct.initialHoles, "abilityCheck"), 16),
        ],
      }),
    );
    expect(hidden.snapshot).toMatchObject({
      turn: { bonusActionAvailable: false },
      combatants: expect.arrayContaining([
        expect.objectContaining({ combatantId: fighterId }),
      ]),
    });
    expect(hidden.state.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(16),
    });
  });

  test("Rogue Cunning Action support comes from alternate action cost mechanics", () => {
    const unit = unitLibrary.requireUnit("rogue_cunning_action");

    expect(battleBonusActionStandardActionSupportForUnit(unit)).toEqual(
      ROGUE_CUNNING_ACTION_SUPPORT_PROFILE,
    );
    expect(battleUnitSupportProfilesForUnit({ unit })).toEqual(
      Either.right([ROGUE_CUNNING_ACTION_SUPPORT_PROFILE]),
    );
  });

  test("Light Property Bonus Action Attack requires a prior Attack action Light weapon attack and omits a positive damage modifier", () => {
    const state = startBattleRight({
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
        turn: { bonusActionAvailable: false },
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 6 }),
        ]),
      },
    });
  });

  test("Light Property Bonus Action Attack opens hit-triggered Reaction replay and spends the Bonus Action", () => {
    const rogueTargetId = combatantId("rogue-target");
    const state = startBattleRight({
      battleId: battleId("battle-off-hand-hit-reaction"),
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
        statBlockCreatureInit({ initiative: 15 }),
        characterSeed({
          combatantId: rogueTargetId,
          displayName: "Rogue Target",
          initiative: 10,
          side: oppositionSide,
          classLevels: [{ className: "rogue", level: 5 }],
          attack: null,
          unitFeatures: [{ unit: uncannyDodgeUnit() }],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
      ],
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
    const subject: BattleSubject = {
      tag: "bonusAction",
      actorId: fighterId,
      action: "offHandAttack",
      attackName: "Dagger",
    };
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
        fills: [targetFill(target, rogueTargetId)],
      }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state: afterQualifyingAttack,
      subject,
      fills: [
        targetFill(target, rogueTargetId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Light Property Bonus Action Attack hit Reaction window.",
      );
    }
    expect(awaitingReaction).toMatchObject({
      holes: [{ kind: "reactionDecision", trigger: "attackHit" }],
    });

    const afterReaction = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        findHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: rogueTargetId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: "rogue_uncanny_dodge",
            modifierKind: "attackDamageReduction",
            fills: [],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Light Property Bonus Action Attack damage roll after Reaction.",
      );
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const completed = resolveBattleSubject({
      state: afterReaction.state,
      subject,
      fills: [
        targetFill(target, rogueTargetId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });

    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(completed.snapshot.turn.bonusActionAvailable).toBe(false);
    expect(completed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: rogueTargetId,
          hp: 10,
          reactionAvailable: false,
        }),
      ]),
    );
  });

  test("admitted authored critical-range support makes a natural 19 Light Property Bonus Action Attack critical", () => {
    const state = startBattleRight({
      battleId: battleId("battle-off-hand-critical-range"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: criticalRange19UnitRefs(),
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
    const subject: BattleSubject = {
      tag: "bonusAction",
      actorId: fighterId,
      action: "offHandAttack",
      attackName: "Dagger",
    };
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
          attackRollFill(roll, { total: 1, naturalD20: 19 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      critical: true,
      label: "Dagger damage (2d4-piercing)",
    });
    expect(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 1, naturalD20: 19 }),
          damageRollFillWithGroups(damage, [[2, 3]]),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 5 }),
        ]),
      },
    });
  });

  test("Light Property Bonus Action Attack distinguishes held weapon identity from weapon kind", () => {
    const state = startBattleRight({
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

  test("table-provided reach-exit movement facts open an Opportunity Attack window", () => {
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
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "opportunityAttack" }],
      snapshot: {
        pendingReaction: {
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
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
  });

  test("attack target facts are scoped to the selected attack option and range band", () => {
    const state = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject = goblinAttackSubject("Shortbow");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, fighterId, [
            {
              kind: "attackTargetInMeleeReach",
              actorId: goblinId,
              targetId: fighterId,
              attackName: "Scimitar",
            },
          ]),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, fighterId, [
            {
              kind: "attackTargetInRangedRange",
              actorId: goblinId,
              targetId: fighterId,
              attackName: "Shortbow",
              rangeBand: "normal",
            },
          ]),
        ],
      }),
    ).toMatchObject({ tag: "needsHoles", holes: [{ kind: "attackRoll" }] });
  });

  test("long-range attack target facts are legal and require Disadvantage", () => {
    const state = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject = goblinAttackSubject("Shortbow");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const longRangeTargetFill = targetFill(target, fighterId, [
      {
        kind: "attackTargetInRangedRange",
        actorId: goblinId,
        targetId: fighterId,
        attackName: "Shortbow",
        rangeBand: "long",
      },
    ]);

    const afterTarget = resolveBattleSubject({
      state,
      subject,
      fills: [longRangeTargetFill],
    });

    expect(afterTarget).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll", rollMode: "disadvantage" }],
    });
    const attackRoll = requireHole(afterTarget, "attackRoll");
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          longRangeTargetFill,
          attackRollFill(attackRoll, {
            total: 16,
            naturalD20: 14,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Attack roll mode does not match the current attack-roll rule.",
    });
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          longRangeTargetFill,
          attackRollFill(attackRoll, {
            total: 16,
            naturalD20: 14,
            rollMode: "disadvantage",
          }),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
    });
  });

  test("contradictory range bands for the same attack target are rejected", () => {
    const state = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject = goblinAttackSubject("Shortbow");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const normalRangeFact = {
      kind: "attackTargetInRangedRange" as const,
      actorId: goblinId,
      targetId: fighterId,
      attackName: "Shortbow",
      rangeBand: "normal" as const,
    };
    const longRangeFact = {
      ...normalRangeFact,
      rangeBand: "long" as const,
    };

    for (const spatialFacts of [
      [normalRangeFact, longRangeFact],
      [longRangeFact, normalRangeFact],
    ] as const) {
      expect(
        resolveBattleSubject({
          state,
          subject,
          fills: [targetFill(target, fighterId, spatialFacts)],
        }),
      ).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
        message:
          "Attack target range facts must contain at most one range band for each actor, target, and attack.",
      });
    }
  });

  test("long-range Disadvantage cancels with an Advantage source", () => {
    const goblinTurn = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const goblin = goblinTurn.combatants.get(goblinId);
    if (goblin === undefined) {
      throw new Error("Expected Goblin combatant.");
    }
    const hiddenGoblinTurn: BattleState = {
      ...goblinTurn,
      combatants: new Map(goblinTurn.combatants).set(goblinId, {
        ...goblin,
        hidden: { discoveryDc: difficultyClass(16) },
      }),
    };
    const subject = goblinAttackSubject("Shortbow");
    const target = requireHole(
      resolveBattleSubject({ state: hiddenGoblinTurn, subject, fills: [] }),
      "targetChoice",
    );
    const longRangeTargetFill = targetFill(target, fighterId, [
      {
        kind: "attackTargetInRangedRange",
        actorId: goblinId,
        targetId: fighterId,
        attackName: "Shortbow",
        rangeBand: "long",
      },
    ]);

    const afterTarget = resolveBattleSubject({
      state: hiddenGoblinTurn,
      subject,
      fills: [longRangeTargetFill],
    });

    const attackRoll = requireHole(afterTarget, "attackRoll");
    expect(attackRoll).not.toHaveProperty("rollMode");
    expect(
      resolveBattleSubject({
        state: hiddenGoblinTurn,
        subject,
        fills: [
          longRangeTargetFill,
          attackRollFill(attackRoll, {
            total: 16,
            naturalD20: 14,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
    });
  });

  test("Opportunity Attack movement facts must name a qualifying melee option", () => {
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
            movementCostFeet: 5,
            provokedOpportunityAttacks: [
              { reactorId: goblinId, attackName: "Shortbow" },
            ],
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
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
      provokedOpportunityAttacks: [
        { reactorId: goblinId, attackName: "Scimitar" },
      ],
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
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
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
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingReaction!.choices,
    );
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
  });

  test("Opportunity Attack opens attack-damage Reaction windows before movement resumes", () => {
    const cuttingWordsDamageOnly = cuttingWordsDamageOnlyUnit();
    const state = startBattleRight({
      battleId: battleId("battle-opportunity-attack-damage-reaction"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "bard", level: 3 }],
          resources: [cuttingWordsResource({ unit: cuttingWordsDamageOnly })],
          unitFeatures: [cuttingWordsDamageOnly].map((unit) => ({ unit })),
          characterUnitRefs: [
            reactionModifierUnitRef(cuttingWordsDamageOnly.id),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
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
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingReaction!.choices,
    );
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
    const attackRoll = findHole(startedReaction.holes, "attackRoll");
    const damage = requireHole(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
      }),
      "rolledDice",
    );

    const awaitingDamageReaction = resolveBattleSubject({
      state: startedReaction.state,
      subject: choice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 6),
      ],
    });
    if (awaitingDamageReaction.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack damage Reaction window.");
    }
    expect(awaitingDamageReaction).toMatchObject({
      holes: [{ kind: "reactionDecision", trigger: "attackDamage" }],
    });

    const damageChoice = reactionModifierChoice(
      awaitingDamageReaction.snapshot.pendingReaction!.choices,
      cuttingWordsDamageOnly.id,
      "damageRollReduction",
    );
    const completed = resolveBattleReaction({
      state: awaitingDamageReaction.state,
      fill: reactionDecisionFill(
        findHole(awaitingDamageReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: cuttingWordsDamageOnly.id,
            modifierKind: "damageRollReduction",
            fills: [
              {
                kind: "rolledDice",
                holeId: damageChoice.initialHoles[0]!.holeId,
                value: [rolledDiceGroup([3])],
              },
            ],
          },
        },
      ),
    });

    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(completed.snapshot.pendingReaction).toBeNull();
    expect(completed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hp: 7,
          reactionAvailable: false,
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
  });

  test("Opportunity Attack attack-hit damage reductions apply before movement resumes", () => {
    const state = startBattleRight({
      battleId: battleId("battle-opportunity-attack-hit-reduction"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 5 }],
          unitFeatures: [{ unit: uncannyDodgeUnit() }],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingOpportunityAttack = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });
    if (awaitingOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack Reaction window.");
    }
    const opportunityAttackChoice = reactionChoiceWithSubject(
      awaitingOpportunityAttack.snapshot.pendingReaction!.choices,
    );
    const startedOpportunityAttack = resolveBattleReaction({
      state: awaitingOpportunityAttack.state,
      fill: reactionDecisionFill(
        findHole(awaitingOpportunityAttack.holes, "reactionDecision"),
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
    if (startedOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack roll hole.");
    }
    const attackRoll = findHole(startedOpportunityAttack.holes, "attackRoll");
    const awaitingHitReaction = resolveBattleSubject({
      state: startedOpportunityAttack.state,
      subject: opportunityAttackChoice.subject,
      fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
    });
    if (awaitingHitReaction.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack hit Reaction window.");
    }
    const afterUncannyDodge = resolveBattleReaction({
      state: awaitingHitReaction.state,
      fill: reactionDecisionFill(
        findHole(awaitingHitReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: "rogue_uncanny_dodge",
            modifierKind: "attackDamageReduction",
            fills: [],
          },
        },
      ),
    });
    if (afterUncannyDodge.tag !== "needsHoles") {
      throw new Error(
        "Expected Opportunity Attack damage roll after Uncanny Dodge.",
      );
    }
    const damage = requireHole(afterUncannyDodge, "rolledDice");
    const completed = resolveBattleSubject({
      state: afterUncannyDodge.state,
      subject: opportunityAttackChoice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 6),
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
          hp: 8,
          reactionAvailable: false,
          movement: expect.objectContaining({ spentFeet: 5 }),
        }),
        expect.objectContaining({
          combatantId: goblinId,
          reactionAvailable: false,
        }),
      ]),
    );
  });

  test("Opportunity Attack attack-hit damage reductions narrow Knock Out disposition eligibility", () => {
    const state = startBattleRight({
      battleId: battleId("battle-opportunity-attack-hit-reduction-ko-gate"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 5,
          classLevels: [{ className: "rogue", level: 5 }],
          unitFeatures: [{ unit: uncannyDodgeUnit() }],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingOpportunityAttack = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });
    if (awaitingOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack Reaction window.");
    }
    const opportunityAttackChoice = reactionChoiceWithSubject(
      awaitingOpportunityAttack.snapshot.pendingReaction!.choices,
    );
    const startedOpportunityAttack = resolveBattleReaction({
      state: awaitingOpportunityAttack.state,
      fill: reactionDecisionFill(
        findHole(awaitingOpportunityAttack.holes, "reactionDecision"),
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
    if (startedOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack roll hole.");
    }
    const attackRoll = findHole(startedOpportunityAttack.holes, "attackRoll");
    const awaitingHitReaction = resolveBattleSubject({
      state: startedOpportunityAttack.state,
      subject: opportunityAttackChoice.subject,
      fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
    });
    if (awaitingHitReaction.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack hit Reaction window.");
    }
    const afterUncannyDodge = resolveBattleReaction({
      state: awaitingHitReaction.state,
      fill: reactionDecisionFill(
        findHole(awaitingHitReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: "rogue_uncanny_dodge",
            modifierKind: "attackDamageReduction",
            fills: [],
          },
        },
      ),
    });
    if (afterUncannyDodge.tag !== "needsHoles") {
      throw new Error(
        "Expected Opportunity Attack damage roll after Uncanny Dodge.",
      );
    }
    const damage = requireHole(afterUncannyDodge, "rolledDice");
    const completed = resolveBattleSubject({
      state: afterUncannyDodge.state,
      subject: opportunityAttackChoice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 6),
      ],
    });

    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(completed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hp: 1,
          reactionAvailable: false,
          conditions: [],
        }),
      ]),
    );
  });

  test("Opportunity Attack exposes Knock Out as an attack damage disposition", () => {
    const state = startBattleRight({
      battleId: battleId("battle-opportunity-attack-knock-out"),
      combatants: [
        characterSeed({ initiative: 20, currentHp: 3 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
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
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingReaction!.choices,
    );
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

    const attackRoll = findHole(startedReaction.holes, "attackRoll");
    const damage = requireHole(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
      }),
      "rolledDice",
    );
    const disposition = requireHole(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [
          attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
          damageRollFill(damage, 1),
        ],
      }),
      "attackDamageDisposition",
    );

    expect(disposition).toMatchObject({
      kind: "attackDamageDisposition",
      attackerId: goblinId,
      targetId: fighterId,
      choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
    });

    const completed = resolveBattleSubject({
      state: startedReaction.state,
      subject: choice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 1),
        attackDamageDispositionFill(disposition, { kind: "knockOut" }),
      ],
    });

    expect(completed).toMatchObject({
      tag: "resolved",
      snapshot: {
        pendingReaction: null,
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: fighterId,
            hp: 1,
            conditions: expect.arrayContaining(["unconscious", "prone"]),
          }),
          expect.objectContaining({
            combatantId: goblinId,
            reactionAvailable: false,
          }),
        ]),
      },
    });
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
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingReaction!.choices,
    );
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
        expect.objectContaining({ combatantId: goblinId }),
      ]),
    );
    expect(missed.state.combatants.get(goblinId)?.hidden).toBeNull();
  });

  test("attack resolution rejects an Unconscious current character at 0 HP", () => {
    const state = startBattleRight({
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
    const subject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Longsword",
    } as const satisfies Extract<BattleSubject, { readonly tag: "action" }>;
    const targetHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "targetChoice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(
          targetHole,
          subject.actorId,
          goblinId,
          subject.attackName,
        ),
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll", label: "Longsword attack roll" }],
    });

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "targetChoice",
            holeId: targetHole.holeId,
            value: goblinId,
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
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
        turn: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("Weapon Mastery Sap applies next attack Disadvantage on a selected Sap weapon hit", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: masterySapUnitRefs(),
      weaponMasteries: longswordWeaponMasterySelections(),
    });
    const subject = fighterAttackSubject();
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 15, naturalD20: 10 },
      subject,
    );

    const hit = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
          damageRollFill(damageHole, 1),
        ],
      }),
    );

    expect(hit.state.combatants.get(goblinId)?.activeEffects).toContainEqual({
      kind: "nextAttackRollBySelf",
      sourceUnitId: "mastery_sap",
      sourceCombatantId: fighterId,
      mode: "disadvantage",
      expiresAt: { kind: "startOfTurn", combatantId: fighterId },
    });

    const goblinTurn = requireResolved(
      endTurn({ state: hit.state, actorId: fighterId }),
    ).state;
    const goblinSubject = goblinAttackSubject("Scimitar");
    const goblinTarget = attackInitialTargetHole(goblinTurn, goblinSubject);
    const goblinRoll = attackRollHoleAfterTarget(
      goblinTurn,
      goblinTarget,
      goblinSubject,
      fighterId,
    );

    expect(goblinRoll).toMatchObject({
      kind: "attackRoll",
      rollMode: "disadvantage",
    });

    const missed = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject: goblinSubject,
        fills: [
          targetFill(goblinTarget, fighterId),
          attackRollFill(goblinRoll, {
            total: 1,
            naturalD20: 1,
            rollMode: "disadvantage",
          }),
        ],
      }),
    );

    expect(
      missed.state.combatants.get(goblinId)?.activeEffects,
    ).not.toContainEqual(
      expect.objectContaining({ sourceUnitId: "mastery_sap" }),
    );
  });

  test("Weapon Mastery Sap expires at the start of the attacker's next turn without a target attack", () => {
    const hit = resolveLongswordHit(
      fighterVsGoblinBattle({
        characterUnitRefs: masterySapUnitRefs(),
        weaponMasteries: longswordWeaponMasterySelections(),
      }),
    );

    expect(hit.state.combatants.get(goblinId)?.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "nextAttackRollBySelf",
        sourceUnitId: "mastery_sap",
      }),
    );

    const goblinTurn = requireResolved(
      endTurn({ state: hit.state, actorId: fighterId }),
    ).state;
    const fighterNextTurn = requireResolved(
      endTurn({ state: goblinTurn, actorId: goblinId }),
    ).state;

    expect(
      fighterNextTurn.combatants.get(goblinId)?.activeEffects,
    ).not.toContainEqual(
      expect.objectContaining({ sourceUnitId: "mastery_sap" }),
    );
  });

  test("Weapon Mastery Sap is gated by hit, selected mastery ownership, and Sap weapon property", () => {
    const subject = fighterAttackSubject();
    const hitWithoutSelection = resolveLongswordHit(
      fighterVsGoblinBattle({ characterUnitRefs: masterySapUnitRefs() }),
      subject,
    );
    const missedWithSelection = resolveLongswordMiss(
      fighterVsGoblinBattle({
        characterUnitRefs: masterySapUnitRefs(),
        weaponMasteries: longswordWeaponMasterySelections(),
      }),
      subject,
    );
    const hitWithSelectionButNoSapSupport = resolveLongswordHit(
      fighterVsGoblinBattle({
        weaponMasteries: longswordWeaponMasterySelections(),
      }),
      subject,
    );
    const selectedNonSapWeaponState = fighterVsGoblinBattle({
      characterUnitRefs: masterySapUnitRefs(),
      weaponMasteries: [
        {
          weaponUnitId: "weapon_shortsword",
        },
      ],
    });
    const selectedNonSapWeapon = applyWeaponMasterySapOnHit(
      selectedNonSapWeaponState,
      fighterId,
      goblinId,
      testShortswordAttack(),
    );

    for (const result of [
      hitWithoutSelection,
      missedWithSelection,
      hitWithSelectionButNoSapSupport,
    ]) {
      expect(result.state.combatants.get(goblinId)?.activeEffects).toEqual([]);
    }
    expect(
      selectedNonSapWeapon.combatants.get(goblinId)?.activeEffects,
    ).toEqual([]);
  });

  test("Weapon Mastery Topple opens an optional Constitution save on a selected Topple weapon hit", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: masteryToppleUnitRefs(),
      weaponMasteries: quarterstaffWeaponMasterySelections(),
      attack: testQuarterstaffAttack(),
    });
    const subject = fighterAttackSubject("Quarterstaff");
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "savingThrowOutcome",
          label: "Topple Constitution saving throw",
          unitFeature: { unitId: "mastery_topple", label: "Topple" },
          ability: "con",
          dc: { kind: "fixed", dc: difficultyClass(13) },
          targetIds: [goblinId],
          targetRollModes: [],
        },
      ],
    });
  });

  test("Weapon Mastery Topple applies Prone on failed save and does nothing on success or decline", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: masteryToppleUnitRefs(),
      weaponMasteries: quarterstaffWeaponMasterySelections(),
      attack: testQuarterstaffAttack(),
    });
    const subject = fighterAttackSubject("Quarterstaff");
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const hitFills = [
      targetFill(targetHole, goblinId),
      attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
    ];
    const saveHole = requireHole(
      resolveBattleSubject({ state, subject, fills: hitFills }),
      "savingThrowOutcome",
    );

    const failedSave = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...hitFills,
        savingThrowOutcomeFill(saveHole, [
          { targetId: goblinId, succeeded: false },
        ]),
      ],
    });
    const failedDamageHole = requireHole(failedSave, "rolledDice");
    expect(failedSave).toMatchObject({
      tag: "needsHoles",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: goblinId,
            conditions: expect.arrayContaining(["prone"]),
          }),
        ]),
      },
    });
    const resolvedFailure = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...hitFills,
          savingThrowOutcomeFill(saveHole, [
            { targetId: goblinId, succeeded: false },
          ]),
          damageRollFill(failedDamageHole, 1),
        ],
      }),
    );
    const resolvedFailureTarget =
      resolvedFailure.state.combatants.get(goblinId);
    if (resolvedFailureTarget === undefined) {
      throw new Error("Expected Goblin after Topple resolution.");
    }
    expect(
      hasCondition(resolvedFailureTarget.conditions, "prone"),
    ).toBe(true);

    for (const toppleFill of [
      savingThrowOutcomeFill(saveHole, [{ targetId: goblinId, succeeded: true }]),
      savingThrowOutcomeFill(saveHole, []),
    ]) {
      const noOp = resolveBattleSubject({
        state,
        subject,
        fills: [...hitFills, toppleFill],
      });
      expect(noOp).toMatchObject({
        tag: "needsHoles",
        snapshot: {
          combatants: expect.arrayContaining([
            expect.objectContaining({
              combatantId: goblinId,
              conditions: expect.not.arrayContaining(["prone"]),
            }),
          ]),
        },
      });
    }
  });

  test("Weapon Mastery Topple is gated by hit, selected mastery ownership, Topple weapon property, and support profile", () => {
    const subject = fighterAttackSubject("Quarterstaff");
    const eligibleState = fighterVsGoblinBattle({
      characterUnitRefs: masteryToppleUnitRefs(),
      weaponMasteries: quarterstaffWeaponMasterySelections(),
      attack: testQuarterstaffAttack(),
    });
    const targetHole = attackInitialTargetHole(eligibleState, subject);
    const rollHole = attackRollHoleAfterTarget(
      eligibleState,
      targetHole,
      subject,
    );
    const saveHole = requireHole(
      resolveBattleSubject({
        state: eligibleState,
        subject,
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "savingThrowOutcome",
    );
    const toppleSaveFill = savingThrowOutcomeFill(saveHole, [
      { targetId: goblinId, succeeded: false },
    ]);

    const missesWithSelection = resolveBattleSubject({
      state: eligibleState,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 1 }),
        toppleSaveFill,
      ],
    });
    const noSelection = resolveBattleSubject({
      state: fighterVsGoblinBattle({
        characterUnitRefs: masteryToppleUnitRefs(),
        attack: testQuarterstaffAttack(),
      }),
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        toppleSaveFill,
      ],
    });
    const noSupport = resolveBattleSubject({
      state: fighterVsGoblinBattle({
        weaponMasteries: quarterstaffWeaponMasterySelections(),
        attack: testQuarterstaffAttack(),
      }),
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        toppleSaveFill,
      ],
    });
    const nonToppleWeapon = resolveBattleSubject({
      state: fighterVsGoblinBattle({
        characterUnitRefs: masteryToppleUnitRefs(),
        weaponMasteries: longswordWeaponMasterySelections(),
      }),
      subject: fighterAttackSubject(),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        toppleSaveFill,
      ],
    });

    for (const result of [
      missesWithSelection,
      noSelection,
      noSupport,
      nonToppleWeapon,
    ]) {
      expect(result).toMatchObject({
        tag: "invalid",
        message:
          "Weapon Mastery Topple Saving Throw is only valid for an eligible Topple weapon hit.",
      });
    }
  });

  test("Weapon Mastery Cleave optionally attacks a caller-eligible second target with same weapon damage and no positive ability modifier", () => {
    const state = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject("Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    expect(decision).toMatchObject({
      label: "Use Cleave",
      unitFeature: { unitId: "mastery_cleave", label: "Cleave" },
      choices: ["use", "decline"],
    });

    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const cleaveFacts = [
      attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ];
    const targetFillValue = targetFill(target, skeletonId, cleaveFacts);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );
    expect(cleaveRoll).toMatchObject({
      label: "Cleave attack roll",
      attack: expect.objectContaining({
        kind: "weapon",
        weapon: expect.objectContaining({ id: "weapon_greataxe" }),
        damageAbilityModifier: battleAbilityModifier(0),
      }),
    });

    const cleaveDamageRequest = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFillValue,
        attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
      ],
    });
    if (cleaveDamageRequest.tag !== "needsHoles") {
      throw new Error(
        `Expected Cleave damage request, got ${cleaveDamageRequest.tag}.`,
      );
    }
    const cleaveDamage = requireHole(cleaveDamageRequest, "rolledDice");
    expect(
      cleaveDamageRequest.state.currentTurnResources
        .weaponMasteryCleaveAttackersUsedThisTurn,
    ).toEqual([]);
    expect(cleaveDamage).toMatchObject({
      label: "Cleave damage (1d12-slashing)",
    });

    const resolvedResult = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFillValue,
        attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(cleaveDamage, 4),
      ],
    });
    if (resolvedResult.tag === "invalid") {
      throw new Error(resolvedResult.message);
    }
    expect(resolvedResult).toMatchObject({ tag: "resolved" });
    const resolved = requireResolved(resolvedResult);

    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(6));
    expect(
      resolved.state.currentTurnResources
        .weaponMasteryCleaveAttackersUsedThisTurn,
    ).toEqual([fighterId]);
  });

  test("Weapon Mastery Cleave preserves a negative ability modifier on second-hit damage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-negative-modifier"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(battleAbilityModifier(-1)),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject("Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 4),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(target, skeletonId, [
      attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );
    const cleaveDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
          damageRollFill(cleaveDamage, 4),
        ],
      }),
    );

    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(7));
  });

  test("Weapon Mastery Cleave second-hit damage requests Concentration before applying damage", () => {
    const baseState = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-concentration"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Concentrating Second Target",
          initiative: 9,
        }),
      ],
    });
    const skeleton = baseState.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected Skeleton combatant.");
    }
    const state: BattleState = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(skeletonId, {
        ...skeleton,
        concentration: {
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const subject = fighterAttackSubject("Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(target, skeletonId, [
      attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );
    const cleaveDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const concentration = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
          damageRollFill(cleaveDamage, 4),
        ],
      }),
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({
      combatantId: skeletonId,
      damageAmount: 4,
      dc: concentrationSavingThrowDc(4),
    });

    const resolvedResult = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFillValue,
        attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(cleaveDamage, 4),
        concentrationSavingThrowFill(concentration, true),
      ],
    });
    if (resolvedResult.tag === "invalid") {
      throw new Error(resolvedResult.message);
    }
    const resolved = requireResolved(resolvedResult);
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(6));
  });

  test("Weapon Mastery Cleave rejects unused Concentration fills during extra-attack damage replay", () => {
    const state = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-stale-concentration"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject("Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(target, skeletonId, [
      attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );
    const cleaveDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const staleConcentration = {
      kind: "concentrationSavingThrow" as const,
      holeId: holeId("test:stale-cleave-concentration"),
      value: { succeeded: true },
    };
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
          damageRollFill(cleaveDamage, 4),
          staleConcentration,
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    });
  });

  test("Weapon Mastery Cleave opens primary after-damage reactions before the extra attack", () => {
    const wizardReady = requireResolved(
      resolveBattleSubject({
        state: startBattleRight({
          battleId: battleId("battle-weapon-mastery-cleave-after-damage-order"),
          combatants: [
            characterSeed({
              combatantId: wizardId,
              displayName: "Wizard",
              initiative: 30,
              attack: null,
              spellcasting: wizardSpellcasting(),
            }),
            characterSeed({
              initiative: 20,
              characterUnitRefs: masteryCleaveUnitRefs(),
              weaponMasteries: greataxeWeaponMasterySelections(),
              attack: testGreataxeAttack(),
            }),
            statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
            statBlockCreatureInit({
              combatantId: skeletonId,
              displayName: "Second Target",
              initiative: 9,
            }),
          ],
        }),
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        fills: [],
      }),
    );
    const state = requireResolved(
      endTurn({ state: wizardReady.state, actorId: wizardId }),
    ).state;
    const subject = fighterAttackSubject("Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const awaitingPrimaryAfterDamage = resolveBattleSubject({
      state,
      subject,
      fills: primaryFills,
    });

    expect(awaitingPrimaryAfterDamage).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "afterDamage" }],
      snapshot: {
        pendingReaction: { trigger: "afterDamage" },
      },
    });
    if (awaitingPrimaryAfterDamage.tag !== "needsHoles") {
      throw new Error(
        `Expected primary after-damage reaction, got ${awaitingPrimaryAfterDamage.tag}.`,
      );
    }
    expect(awaitingPrimaryAfterDamage.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: goblinId, hp: Hp(6) }),
        expect.objectContaining({ combatantId: skeletonId, hp: Hp(10) }),
      ]),
    );

    const afterDecline = resolveBattleReaction({
      state: awaitingPrimaryAfterDamage.state,
      fill: reactionDecisionFill(
        awaitingPrimaryAfterDamage.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: wizardId },
      ),
    });
    expect(afterDecline).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "unitFeatureDecision" }],
    });
  });

  test("Weapon Mastery Cleave opens attack-hit reactions for the extra attack before damage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-attack-hit-window"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Uncanny Second Target",
          initiative: 9,
          side: oppositionSide,
          attack: null,
          classLevels: [{ className: "rogue", level: 5 }],
          unitFeatures: [{ unit: uncannyDodgeUnit() }],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
      ],
    });
    const subject = fighterAttackSubject("Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const decision = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: primaryFills,
      }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(target, skeletonId, [
      attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );

    const awaitingCleaveAttackHit = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFillValue,
        attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
      ],
    });

    expect(awaitingCleaveAttackHit).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "attackHit" }],
      snapshot: {
        pendingReaction: { trigger: "attackHit" },
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: skeletonId, hp: Hp(12) }),
        ]),
      },
    });
    if (awaitingCleaveAttackHit.tag !== "needsHoles") {
      throw new Error(
        `Expected Cleave attack-hit reaction, got ${awaitingCleaveAttackHit.tag}.`,
      );
    }

    const afterCleaveHitDecline = resolveBattleReaction({
      state: awaitingCleaveAttackHit.state,
      fill: reactionDecisionFill(
        awaitingCleaveAttackHit.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: skeletonId },
      ),
    });
    expect(afterCleaveHitDecline).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
    });
  });

  test("Weapon Mastery Cleave offers melee zero-hit-point disposition for the extra attack", () => {
    const state = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-knock-out"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject("Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(target, skeletonId, [
      attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );
    const cleaveDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const disposition = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
          damageRollFill(cleaveDamage, 10),
        ],
      }),
      "attackDamageDisposition",
    );

    expect(disposition).toMatchObject({
      attackerId: fighterId,
      targetId: skeletonId,
      choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFillValue,
        attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(cleaveDamage, 10),
        attackDamageDispositionFill(disposition, { kind: "knockOut" }),
      ],
    });
    if (result.tag === "invalid") {
      throw new Error(result.message);
    }
    const resolved = requireResolved(result);
    expect(resolved.state.combatants.get(skeletonId)).toMatchObject({
      hp: Hp(1),
      conditions: expect.objectContaining({
        unconscious: true,
        prone: true,
      }),
    });
  });

  test("Weapon Mastery Cleave keeps primary and extra-attack zero-hit-point dispositions independent", () => {
    const state = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-two-dispositions"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject("Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryDamageFills = [
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 10),
    ];
    const primaryDisposition = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryDamageFills }),
      "attackDamageDisposition",
    );
    expect(primaryDisposition).toMatchObject({
      attackerId: fighterId,
      targetId: goblinId,
      choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
    });
    const primaryFills = [
      ...primaryDamageFills,
      attackDamageDispositionFill(primaryDisposition, { kind: "knockOut" }),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(target, skeletonId, [
      attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );
    const cleaveDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const cleaveDisposition = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
          damageRollFill(cleaveDamage, 10),
        ],
      }),
      "attackDamageDisposition",
    );

    expect(cleaveDisposition).toMatchObject({
      attackerId: fighterId,
      targetId: skeletonId,
      choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
    });
    expect(cleaveDisposition.holeId).not.toBe(primaryDisposition.holeId);

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
          damageRollFill(cleaveDamage, 10),
          attackDamageDispositionFill(cleaveDisposition, { kind: "knockOut" }),
        ],
      }),
    );
    expect(resolved.state.combatants.get(goblinId)).toMatchObject({
      hp: Hp(1),
      conditions: expect.objectContaining({
        unconscious: true,
        prone: true,
      }),
    });
    expect(resolved.state.combatants.get(skeletonId)).toMatchObject({
      hp: Hp(1),
      conditions: expect.objectContaining({
        unconscious: true,
        prone: true,
      }),
    });
  });

  test("Weapon Mastery Cleave rejects ineligible second-target facts and unsupported use", () => {
    const subject = fighterAttackSubject("Greataxe");
    const eligibleState = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-rejection"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const primaryTarget = attackInitialTargetHole(eligibleState, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      eligibleState,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      eligibleState,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const decision = requireHole(
      resolveBattleSubject({
        state: eligibleState,
        subject,
        fills: primaryFills,
      }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state: eligibleState,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const ineligibleTarget = resolveBattleSubject({
      state: eligibleState,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFill(target, skeletonId, [
          attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
        ]),
      ],
    });
    expect(ineligibleTarget).toMatchObject({
      tag: "invalid",
      message:
        "Weapon Mastery Cleave second target must be within 5 feet of the first target and within the attacker's reach.",
    });
    const sameAsPrimaryTarget = resolveBattleSubject({
      state: eligibleState,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFill(target, goblinId, [
          attackTargetSpatialFact(fighterId, goblinId, "Greataxe"),
          {
            kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
            attackerId: fighterId,
            firstTargetId: goblinId,
            secondTargetId: goblinId,
          },
        ]),
      ],
    });
    expect(sameAsPrimaryTarget).toMatchObject({
      tag: "invalid",
      message:
        "Weapon Mastery Cleave second target must be within 5 feet of the first target and within the attacker's reach.",
    });

    const noSelection = resolveBattleSubject({
      state: startBattleRight({
        battleId: battleId("battle-weapon-mastery-cleave-no-selection"),
        combatants: [
          characterSeed({
            initiative: 20,
            characterUnitRefs: masteryCleaveUnitRefs(),
            attack: testGreataxeAttack(),
          }),
          statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        ],
      }),
      subject,
      fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
    });
    expect(noSelection).toMatchObject({
      tag: "invalid",
      message:
        "Weapon Mastery Cleave is only valid for an eligible Cleave weapon hit.",
    });
    const noCleaveSupport = resolveBattleSubject({
      state: startBattleRight({
        battleId: battleId("battle-weapon-mastery-cleave-no-support"),
        combatants: [
          characterSeed({
            initiative: 20,
            weaponMasteries: greataxeWeaponMasterySelections(),
            attack: testGreataxeAttack(),
          }),
          statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        ],
      }),
      subject,
      fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
    });
    expect(noCleaveSupport).toMatchObject({
      tag: "invalid",
      message:
        "Weapon Mastery Cleave is only valid for an eligible Cleave weapon hit.",
    });

    const rangedCleaveState = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-ranged-gate"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: longbowWeaponMasterySelections(),
          attack: testRangedCleaveLongbowAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const rangedSubject = fighterAttackSubject("Longbow");
    const rangedTarget = attackInitialTargetHole(
      rangedCleaveState,
      rangedSubject,
    );
    const rangedRoll = attackRollHoleAfterTarget(
      rangedCleaveState,
      rangedTarget,
      rangedSubject,
      goblinId,
    );
    const rangedDamage = attackDamageHoleAfterHit(
      rangedCleaveState,
      rangedTarget,
      rangedRoll,
      { total: 15, naturalD20: 10 },
      rangedSubject,
      goblinId,
    );
    const rangedAttack = resolveBattleSubject({
      state: rangedCleaveState,
      subject: rangedSubject,
      fills: [
        attackTargetFill(rangedTarget, fighterId, goblinId, "Longbow"),
        attackRollFill(rangedRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(rangedDamage, 4),
      ],
    });
    expect(rangedAttack).toMatchObject({ tag: "resolved" });

    const alreadyUsed = resolveBattleSubject({
      state: {
        ...eligibleState,
        currentTurnResources: {
          ...eligibleState.currentTurnResources,
          weaponMasteryCleaveAttackersUsedThisTurn: [fighterId],
        },
      },
      subject,
      fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
    });
    expect(alreadyUsed).toMatchObject({
      tag: "invalid",
      message:
        "Weapon Mastery Cleave is only valid for an eligible Cleave weapon hit.",
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
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingReaction!.choices,
    );

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
        pendingReaction: { trigger: "attackHit" },
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
        readiedResponses: { spells: [] },
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
    const releaseChoice = reactionChoiceWithSubject(
      awaitingAttackReaction.snapshot.pendingReaction!.choices,
    );
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
    const failedOutcomes = [...released.state.combatants.keys()]
      .filter((targetId) => targetId !== wizardId)
      .slice(0, 1)
      .map((targetId) => ({ targetId, succeeded: false }));
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
          trigger: "saveFailed",
          choices: [
            expect.objectContaining({ readiedSpellCasterId: secondWizardId }),
          ],
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
          trigger: "attackHit",
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
        readiedResponses: { spells: [{ casterId: secondWizardId }] },
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: wizardId,
            reactionAvailable: false,
            concentrating: false,
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
      "spellTargetAllocation",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        spellTargetAllocationFill(target, [{ targetId: skeletonId, count: 3 }]),
      ],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "spellCast" }],
      snapshot: {
        pendingReaction: { trigger: "spellCast" },
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
    const saveOutcomes = [{ targetId: skeletonId, succeeded: false }];
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
    const damageOutcomes = [{ targetId: skeletonId, succeeded: false }];
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
        ...testBattleCreatureStateWithConditions(
          skeleton,
          applyCondition(skeleton.conditions, "blinded"),
        ),
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
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger },
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

  test("structured spell subjects reject Ready mode without a trigger", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSubjectSchema)({
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready" },
        }),
      ),
    ).toBe(true);
  });

  test("structured spell subjects keep cast mode separate from Ready mode", () => {
    expect(
      sameBattleSubject(
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
      ),
    ).toBe(false);
  });

  test("structured spell subject equality ignores object insertion order", () => {
    const invocation = spellSlotInvocationRef(
      "magic_missile",
      1,
      "repeatedDamageAllocation",
    );
    if (invocation.tag !== "spellSlot") {
      throw new Error("Expected a Spell Slot invocation ref.");
    }

    expect(
      sameBattleSubject(
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation,
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: {
            procedure: invocation.procedure,
            slotLevel: invocation.slotLevel,
            spellId: invocation.spellId,
            tag: invocation.tag,
          },
          mode: { tag: "cast" },
        },
      ),
    ).toBe(true);
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
        turn: { actionResources: [] },
      },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }

    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingReaction!.choices,
    );
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
        turn: {
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
      snapshot: { turn: { actionResources: [] } },
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
        turn: {
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
        turn: {
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
        turn: {
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
        turn: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("critical hit requires doubled weapon damage dice", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 20, naturalD20: 20 },
      fighterAttackSubject(),
      goblinId,
    );
    const dispositionHole = attackDamageDispositionHoleAfterFills(
      state,
      fighterAttackSubject(),
      [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[4, 5]]),
      ],
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
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[4, 5]]),
        attackDamageDispositionFill(dispositionHole, {
          kind: "ordinaryDamage",
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 0 },
        ],
      },
    });
  });

  test("admitted authored critical-range support makes a natural 19 weapon attack critical", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: criticalRange19UnitRefs(),
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
      total: 1,
      naturalD20: 19,
    });

    expect(damageHole).toMatchObject({
      critical: true,
      label: "Longsword damage (2d8+3-slashing)",
    });
    const dispositionHole = attackDamageDispositionHoleAfterFills(
      state,
      fighterAttackSubject(),
      [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 19 }),
        damageRollFillWithGroups(damageHole, [[4, 5]]),
      ],
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
        attackRollFill(rollHole, { total: 1, naturalD20: 19 }),
        damageRollFillWithGroups(damageHole, [[4, 5]]),
        attackDamageDispositionFill(dispositionHole, {
          kind: "ordinaryDamage",
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 0 },
        ],
      },
    });
  });

  test("admitted authored critical-range support makes a natural 19 Unarmed Strike critical", () => {
    const state = startBattleRight({
      battleId: battleId("battle-unarmed-critical-range"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: criticalRange19UnitRefs(),
          attack: null,
          unarmedStrike: testUnarmedStrikeDamageAttack(),
          selectedLoadout: {},
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Unarmed Strike",
    };
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 19 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 6 },
        ],
      },
    });
  });

  test("dice-based Unarmed Strike profiles request damage dice fills", () => {
    const state = startBattleRight({
      battleId: battleId("battle-unarmed-dice-profile"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: null,
          unarmedStrike: testUnarmedStrikeDieAttack(),
          selectedLoadout: {},
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Unarmed Strike",
    };
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 15, naturalD20: 10 },
      subject,
    );

    expect(damageHole).toMatchObject({
      critical: false,
      label: "Unarmed Strike damage (1d4+3-bludgeoning)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
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
          { combatantId: goblinId, hp: 3 },
        ],
      },
    });
  });

  test("critical hits double dice-based Unarmed Strike profile dice", () => {
    const state = startBattleRight({
      battleId: battleId("battle-unarmed-dice-critical"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: null,
          unarmedStrike: testUnarmedStrikeDieAttack(),
          selectedLoadout: {},
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Unarmed Strike",
    };
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 20, naturalD20: 20 },
      subject,
    );

    expect(damageHole).toMatchObject({
      critical: true,
      label: "Unarmed Strike damage (2d4+3-bludgeoning)",
    });
    const dispositionHole = attackDamageDispositionHoleAfterFills(
      state,
      subject,
      [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[4, 4]]),
      ],
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[4, 4]]),
        attackDamageDispositionFill(dispositionHole, {
          kind: "ordinaryDamage",
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 0 },
        ],
      },
    });
  });

  test("Martial Arts grants an eligible Bonus Action Unarmed Strike without an Attack-action prerequisite", () => {
    const state = startBattleRight({
      battleId: battleId("battle-martial-arts-bonus-unarmed-strike"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 20,
          classLevels: [{ className: "monk", level: 1 }],
          attack: null,
          unarmedStrike: testUnarmedStrikeDieAttack(),
          selectedLoadout: {},
          characterUnitRefs: [
            supportedBattleUnitRef(
              unitLibrary.requireUnit("monk_martial_arts"),
            ),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const act = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "bonusAction" &&
        candidate.subject.action === "martialArtsUnarmedStrike",
    );
    if (act === undefined) {
      throw new Error("Expected Martial Arts Bonus Unarmed Strike act.");
    }
    const targetHole = findHole(act.initialHoles, "targetChoice");
    const needsRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill(targetHole, goblinId)],
    });
    const rollHole = requireHole(needsRoll, "attackRoll");
    const needsDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
      ],
    });
    const damageHole = requireHole(needsDamage, "rolledDice");

    const result = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: { bonusActionAvailable: false },
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 3 },
        ],
      },
    });
  });

  test("Martial Arts Bonus Action Unarmed Strike direct resolution requires an available Bonus Action", () => {
    const eligibleState = startBattleRight({
      battleId: battleId("battle-martial-arts-bonus-unarmed-strike-stale"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 20,
          classLevels: [{ className: "monk", level: 1 }],
          attack: null,
          unarmedStrike: testUnarmedStrikeDieAttack(),
          selectedLoadout: {},
          characterUnitRefs: [
            supportedBattleUnitRef(
              unitLibrary.requireUnit("monk_martial_arts"),
            ),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = {
      ...eligibleState,
      currentTurnResources: {
        ...eligibleState.currentTurnResources,
        currentHasBonusAction: false,
      },
    } satisfies BattleState;

    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "bonusAction",
          actorId: fighterId,
          action: "martialArtsUnarmedStrike",
          attackName: "Unarmed Strike",
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Bonus Action is no longer available for the current actor.",
    });
  });

  test("Martial Arts Bonus Action Unarmed Strike rejects armor, shield, and non-Monk-weapon loadouts", () => {
    const rejectedLoadouts = [
      {
        name: "armor",
        armorClass: heavyArmorClassState(),
        selectedLoadout: {
          armor: "equipment_chain_mail",
          weapon: {
            itemId: "main:weapon_dagger",
            unitId: "weapon_dagger",
            grip: "one_handed" as const,
          },
        },
        attack: testDaggerAttack(),
      },
      {
        name: "shield",
        selectedLoadout: { shield: "equipment_shield" },
        armorClass: {
          ...defaultArmorClassState(),
          leftHandUse: "shield" as const,
        },
        attack: null,
      },
      {
        name: "non-monk weapon",
        armorClass: undefined,
        selectedLoadout: {
          weapon: {
            itemId: "main:weapon_longsword",
            unitId: "weapon_longsword",
            grip: "one_handed" as const,
          },
        },
        attack: testLongswordAttack(),
      },
    ] as const;

    for (const loadout of rejectedLoadouts) {
      const state = startBattleRight({
        battleId: battleId(`battle-martial-arts-reject-${loadout.name}`),
        combatants: [
          characterSeed({
            combatantId: fighterId,
            displayName: "Monk",
            initiative: 20,
            classLevels: [{ className: "monk", level: 1 }],
            attack: loadout.attack,
            selectedLoadout: loadout.selectedLoadout,
            ...(loadout.armorClass === undefined
              ? {}
              : { armorClass: loadout.armorClass }),
            characterUnitRefs: [
              supportedBattleUnitRef(
                unitLibrary.requireUnit("monk_martial_arts"),
              ),
            ],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      });

      expect(
        discoverBattleActs(state).some(
          (candidate) =>
            candidate.subject.tag === "bonusAction" &&
            candidate.subject.action === "martialArtsUnarmedStrike",
        ),
      ).toBe(false);
      expect(
        resolveBattleSubject({
          state,
          subject: {
            tag: "bonusAction",
            actorId: fighterId,
            action: "martialArtsUnarmedStrike",
            attackName: "Unarmed Strike",
          },
          fills: [],
        }),
      ).toMatchObject({ tag: "invalid", reason: "unsupportedActOption" });
    }
  });

  test("natural 19 weapon attacks are ordinary hits without the admitted critical-range hook", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
      total: 19,
      naturalD20: 19,
    });

    expect(damageHole).toMatchObject({
      critical: false,
      label: "Longsword damage (1d8+3-slashing)",
    });
  });

  test("natural 1 still misses with admitted critical-range support", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: criticalRange19UnitRefs(),
    });
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
      snapshot: { turn: { actionResources: [] } },
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
        turn: {
          actionResources: [],
        },
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 3, tempHp: 0 },
        ],
      },
    });
  });

  test("attack damage removes Temporary Hit Points before HP", () => {
    const state = startBattleRight({
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
          { combatantId: goblinId, hp: 8, tempHp: 0 },
        ],
      },
    });
  });

  test("attack damage clamps Stat Block creature HP at 0 and marks Goblin Warrior dead", () => {
    const state = startBattleRight({
      battleId: battleId("battle-stat-block-zero"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10, currentHp: 3 }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);
    const dispositionHole = attackDamageDispositionHoleAfterDamage(
      state,
      targetHole,
      rollHole,
      damageHole,
      goblinId,
      8,
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
        damageRollFill(damageHole, 8),
        attackDamageDispositionFill(dispositionHole, {
          kind: "ordinaryDamage",
        }),
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
            zeroHpLifecycle: { policy: "diesAtZeroHp", dead: true },
          },
        ],
      },
    });
  });

  test("character target at 0 HP enters the death-save lifecycle scaffold", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattleRight({
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
    const dispositionHole = attackDamageDispositionHoleAfterDamage(
      state,
      targetHole,
      rollHole,
      damageHole,
      targetCharacterId,
      8,
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
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 8),
        attackDamageDispositionFill(dispositionHole, {
          kind: "ordinaryDamage",
        }),
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

  test("melee Knock Out leaves a Character target at 1 HP and Unconscious", () => {
    const targetCharacterId = combatantId("knocked-out-character");
    const state = startBattleRight({
      battleId: battleId("battle-character-knock-out"),
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
    const dispositionHole = attackDamageDispositionHoleAfterDamage(
      state,
      targetHole,
      rollHole,
      damageHole,
      targetCharacterId,
      8,
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
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 8),
        attackDamageDispositionFill(dispositionHole, { kind: "knockOut" }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 1,
            conditions: expect.arrayContaining(["unconscious", "prone"]),
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

  test("healing a Knocked Out positive-HP creature ends Unconscious recovery", () => {
    const state = startBattleRight({
      battleId: battleId("battle-healing-knock-out-recovery"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Healer",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          initiative: 10,
          currentHp: 1,
          conditions: ["unconscious"],
          positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
        }),
      ],
    });
    const healingWordAct = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "healing_word",
    );
    if (healingWordAct === undefined) {
      throw new Error("Expected Healing Word bonus action spell act.");
    }
    const healingWordTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: healingWordAct.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const healingWordRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, fighterId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: fighterId,
              spellId: "healing_word",
            },
          ]),
        ],
      }),
      "rolledDice",
    );

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, fighterId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: fighterId,
              spellId: "healing_word",
            },
          ]),
          damageRollFillWithGroups(healingWordRoll, [[1, 1]]),
        ],
      }),
    );

    expect(result.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hp: 6,
          conditions: ["prone"],
        }),
      ]),
    );
  });

  test("positive-HP Unconscious without Knock Out state projects ordinary Unconscious", () => {
    const state = startBattleRight({
      battleId: battleId("battle-positive-unconscious-no-recovery"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Sleeping Wizard",
          initiative: 10,
          conditions: ["unconscious"],
        }),
      ],
    });

    expect(snapshotBattle(state).combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: wizardId,
          hp: 12,
          conditions: expect.arrayContaining(["unconscious", "prone"]),
        }),
      ]),
    );
  });

  test("rejects authored Knocked Out state unless positive-HP Unconscious is present", () => {
    expect(
      startBattle({
        battleId: battleId(
          "battle-invalid-authored-knocked-out-without-unconscious",
        ),
        combatants: [
          characterSeed({ initiative: 20 }),
          characterSeed({
            combatantId: wizardId,
            displayName: "Recovered Wizard",
            initiative: 10,
            currentHp: 1,
            conditions: ["prone"],
            positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
          }),
        ],
      }),
    ).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message:
          "Knocked Out Unconscious initialization requires the Unconscious condition.",
      }),
    );

    for (const currentHp of [0, 6]) {
      expect(
        startBattle({
          battleId: battleId(
            `battle-invalid-authored-knocked-out-hp-${currentHp}`,
          ),
          combatants: [
            characterSeed({ initiative: 20 }),
            characterSeed({
              combatantId: secondWizardId,
              displayName: "Wrong HP Wizard",
              initiative: 5,
              currentHp,
              conditions: ["unconscious"],
              positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
            }),
          ],
        }),
      ).toEqual(
        Either.left({
          tag: "battleStateInitIssue",
          message:
            "Knocked Out Unconscious initialization requires exactly 1 current HP.",
        }),
      );
    }
  });

  test("melee Knock Out leaves a Stat Block target at 1 HP and Unconscious", () => {
    const state = startBattleRight({
      battleId: battleId("battle-stat-block-knock-out"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10, currentHp: 3 }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);
    const dispositionHole = attackDamageDispositionHoleAfterDamage(
      state,
      targetHole,
      rollHole,
      damageHole,
      goblinId,
      8,
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
        damageRollFill(damageHole, 8),
        attackDamageDispositionFill(dispositionHole, { kind: "knockOut" }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: goblinId,
            hp: 1,
            conditions: expect.arrayContaining(["unconscious", "prone"]),
            zeroHpLifecycle: { policy: "diesAtZeroHp", dead: false },
          },
        ],
      },
    });
  });

  test("ranged attacks cannot carry Knock Out", () => {
    const state = goblinTurnBattle({ fighterHp: 3 });
    const subject = goblinAttackSubject("Shortbow");
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

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, fighterId),
        attackRollFill(rollHole, { total: 14, naturalD20: 10 }),
        damageRollFill(damageHole, 6),
        {
          kind: "attackDamageDisposition",
          holeId: holeId("battle:attack:damage-disposition"),
          value: { kind: "knockOut" },
        },
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Knock Out can only be chosen for melee attack damage.",
    });
  });

  test("melee Knock Out is exposed as an attack damage disposition hole", () => {
    const targetCharacterId = combatantId("knock-out-hole-character");
    const state = startBattleRight({
      battleId: battleId("battle-character-knock-out-hole"),
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
      tag: "needsHoles",
      holes: [
        {
          kind: "attackDamageDisposition",
          holeId: "battle:attack:damage-disposition",
          attackerId: fighterId,
          targetId: targetCharacterId,
          choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
        },
      ],
    });
  });

  test("melee Knock Out can replace massive-damage instant death", () => {
    const targetCharacterId = combatantId("massive-knock-out-character");
    const state = startBattleRight({
      battleId: battleId("battle-massive-knock-out"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: targetCharacterId,
          displayName: "Target Fighter",
          initiative: 10,
          currentHp: 3,
          maxHp: 8,
          attack: null,
        }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);
    const dispositionHole = attackDamageDispositionHoleAfterDamage(
      state,
      targetHole,
      rollHole,
      damageHole,
      targetCharacterId,
      8,
    );

    const withoutDisposition = resolveBattleSubject({
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
    expect(withoutDisposition).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "attackDamageDisposition",
          choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
        },
      ],
    });

    const ordinaryDisposition = resolveBattleSubject({
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
        attackDamageDispositionFill(dispositionHole, {
          kind: "ordinaryDamage",
        }),
      ],
    });
    expect(ordinaryDisposition).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 0,
            zeroHpLifecycle: expect.objectContaining({ dead: true }),
          },
        ],
      },
    });

    const knockOutDisposition = resolveBattleSubject({
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
        attackDamageDispositionFill(dispositionHole, { kind: "knockOut" }),
      ],
    });
    expect(knockOutDisposition).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: targetCharacterId,
            hp: 1,
            conditions: expect.arrayContaining(["unconscious"]),
            zeroHpLifecycle: expect.objectContaining({ dead: false }),
          },
        ],
      },
    });
  });

  test("massive damage kills a character when remaining damage equals maximum HP", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattleRight({
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
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 20, naturalD20: 20 },
      fighterAttackSubject(),
      targetCharacterId,
    );
    const dispositionHole = attackDamageDispositionHoleAfterFills(
      state,
      fighterAttackSubject(),
      [
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[8, 8]]),
      ],
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
        targetFill(targetHole, targetCharacterId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[8, 8]]),
        attackDamageDispositionFill(dispositionHole, {
          kind: "ordinaryDamage",
        }),
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
    const state = startBattleRight({
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

  test("admitted authored critical-range natural 19 damage at 0 HP causes two death-save failures", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattleRight({
      battleId: battleId("battle-character-zero-critical-range"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: criticalRange19UnitRefs(),
        }),
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
      total: 1,
      naturalD20: 19,
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
        attackRollFill(rollHole, { total: 1, naturalD20: 19 }),
        damageRollFillWithGroups(damageHole, [[1, 1]]),
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
              deathSaves: { successes: 0, failures: 2 },
              dead: false,
            },
          },
        ],
      },
    });
  });

  test("later critical attack damage at 0 HP projects a dead death-save lifecycle", () => {
    const targetCharacterId = combatantId("target-character");
    const state = startBattleRight({
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
        commandHalt: null,
        spellSlotExpendedThisTurn: false,
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
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
    const state = startBattleRight({
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
    const state = startBattleRight({
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
      ...startBattleRight({
        battleId: battleId("battle-1"),
        combatants: [
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: false,
        commandHalt: null,
        spellSlotExpendedThisTurn: false,
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
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
      ...startBattleRight({
        battleId: battleId("battle-1"),
        combatants: [
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: false,
        commandHalt: null,
        spellSlotExpendedThisTurn: false,
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
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
        turn: {
          actionResources: [{ kind: "action", source: "turn" }],
          bonusActionAvailable: true,
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

  test("Goblin Warrior discovers Nimble Escape as Stat Block Bonus Action options", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: fighterVsGoblinBattle({
          hidePrerequisites: hidePrerequisites([
            [goblinId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
          ]),
        }),
        actorId: fighterId,
      }),
    ).state;

    expect(discoverBattleActs(goblinTurn).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "bonusAction",
          actorId: goblinId,
          action: "statBlockActionOption",
          optionName: "Nimble Escape",
          standardAction: "disengage",
        },
        {
          tag: "bonusAction",
          actorId: goblinId,
          action: "statBlockActionOption",
          optionName: "Nimble Escape",
          standardAction: "hide",
        },
      ]),
    );
  });

  test("Goblin Warrior Nimble Escape spends Bonus Action for Disengage", () => {
    const goblinTurn = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject: BattleSubject = {
      tag: "bonusAction",
      actorId: goblinId,
      action: "statBlockActionOption",
      optionName: "Nimble Escape",
      standardAction: "disengage",
    };

    const result = requireResolved(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
    ).state;

    expect(result.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(result.currentTurnResources.disengaged).toBe(true);
  });

  test("Goblin Warrior Nimble Escape spends Bonus Action for Hide", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: fighterVsGoblinBattle({
          hidePrerequisites: hidePrerequisites([
            [goblinId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
          ]),
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject: BattleSubject = {
      tag: "bonusAction",
      actorId: goblinId,
      action: "statBlockActionOption",
      optionName: "Nimble Escape",
      standardAction: "hide",
    };
    const act = findAct(goblinTurn, subject);

    const result = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          abilityCheckFill(findHole(act.initialHoles, "abilityCheck"), 17),
        ],
      }),
    ).state;

    expect(result.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(snapshotBattle(result).combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: goblinId,
          conditions: expect.arrayContaining(["invisible"]),
        }),
      ]),
    );
    expect(result.combatants.get(goblinId)?.hidden).toEqual({
      discoveryDc: difficultyClass(17),
    });
  });

  test("Stat Block Multiattack spends the Attack action and grants named dispatch attacks", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-multiattack"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterMultiattackStatBlock(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "multiattack",
      multiattackName: "Multiattack",
    };

    expect(
      discoverBattleActs(goblinTurn).map((act) => act.subject),
    ).toContainEqual(subject);
    const multiattackState = requireResolved(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
    ).state;

    expect(multiattackState.currentTurnResources.actionResources).toEqual([
      {
        kind: "action",
        source: "statBlockMultiattack",
        sourceOwnerId: goblinId,
        attackPart: { section: "actions", name: "Scimitar" },
        restriction: {
          kind: "exclude",
          actions: expect.arrayContaining(["dash", "magic", "utilize"]),
        },
      },
      {
        kind: "action",
        source: "statBlockMultiattack",
        sourceOwnerId: goblinId,
        attackPart: { section: "actions", name: "Shortbow" },
        restriction: {
          kind: "exclude",
          actions: expect.arrayContaining(["dash", "magic", "utilize"]),
        },
      },
    ]);
    const continuationActs = discoverBattleActs(multiattackState);
    const continuationSubjects = continuationActs.map((act) => act.subject);
    expect(continuationSubjects).toEqual([
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
    expect(continuationSubjects).not.toContainEqual(subject);
    expect(continuationActs.map((act) => act.label)).toEqual([
      "Attack",
      "Attack",
      "Move",
      "End Turn",
    ]);
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({
        state: multiattackState,
        subject: moveSubject,
        fills: [],
      }),
      "movement",
    );
    const afterMove = requireResolved(
      resolveBattleSubject({
        state: multiattackState,
        subject: moveSubject,
        fills: [
          movementFill(moveHole, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).state;
    expect(afterMove.currentTurnResources.actionResources).toEqual(
      multiattackState.currentTurnResources.actionResources,
    );
    expect(afterMove.combatants.get(goblinId)?.movementSpentFeet).toBe(
      movementFeet(5),
    );
    expect(
      resolveBattleSubject({
        state: multiattackState,
        subject: {
          tag: "action",
          actorId: goblinId,
          action: "disengage",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(
      resolveBattleSubject({
        state: multiattackState,
        subject: {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Dagger",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const shortbowSubject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Shortbow",
    };
    const shortbow = findAct(multiattackState, shortbowSubject);
    const targetChoice = attackTargetFill(
      findHole(shortbow.initialHoles, "targetChoice"),
      goblinId,
      fighterId,
      "Shortbow",
    );
    const targeted = requireNeedsHoles(
      resolveBattleSubject({
        state: multiattackState,
        subject: shortbowSubject,
        fills: [targetChoice],
      }),
    );
    const afterDispatch = requireResolved(
      resolveBattleSubject({
        state: multiattackState,
        subject: shortbowSubject,
        fills: [
          targetChoice,
          attackRollFill(findHole(targeted.holes, "attackRoll"), {
            total: 1,
            naturalD20: 1,
          }),
        ],
      }),
    ).state;

    expect(afterDispatch.currentTurnResources.actionResources).toEqual([
      expect.objectContaining({
        source: "statBlockMultiattack",
        attackPart: { section: "actions", name: "Scimitar" },
      }),
    ]);
    expect(discoverBattleActs(afterDispatch).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Scimitar",
        },
      ]),
    );
    expect(
      discoverBattleActs(afterDispatch).map((act) => act.subject),
    ).not.toContainEqual(shortbowSubject);
    expect(
      resolveBattleSubject({
        state: afterDispatch,
        subject: shortbowSubject,
        fills: [targetChoice],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Stat Block Multiattack remains gated when a dispatch has no positive literal count", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-multiattack-zero-count"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterMultiattackStatBlock({
                scimitarCount: 0,
              }),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "multiattack",
      multiattackName: "Multiattack",
    };

    expect(
      discoverBattleActs(goblinTurn).map((act) => act.subject),
    ).not.toContainEqual(subject);
    expect(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });
  });

  test("Stat Block Multiattack dispatch resources do not authorize Escape Grapple", () => {
    const grappled = fighterGrapplesGoblin(
      startBattleRight({
        battleId: battleId("battle-monster-multiattack-grapple-gate"),
        combatants: [
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({
            initiative: 10,
            statBlock: monsterMultiattackStatBlock(),
          }),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: grappled, actorId: fighterId }),
    ).state;
    const escapeSubject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "escapeGrapple",
    };
    const escape = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: escapeSubject,
        fills: [],
      }),
      "grappleOutcome",
    );
    const multiattackState = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject: {
          tag: "action",
          actorId: goblinId,
          action: "multiattack",
          multiattackName: "Multiattack",
        },
        fills: [],
      }),
    ).state;

    expect(
      discoverBattleActs(multiattackState).map((act) => act.subject),
    ).not.toContainEqual(escapeSubject);
    expect(
      resolveBattleSubject({
        state: multiattackState,
        subject: escapeSubject,
        fills: [grappleOutcomeFill(escape, true)],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Stat Block Multiattack remains gated when dispatch names are ambiguous", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-multiattack-duplicate-name"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterMultiattackStatBlock({
                duplicateScimitarAttack: true,
              }),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "multiattack",
      multiattackName: "Multiattack",
    };

    expect(
      discoverBattleActs(goblinTurn).map((act) => act.subject),
    ).not.toContainEqual(subject);
    expect(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });
  });

  test("Stat Block limited-use resources are initialized from authored monster controls", () => {
    const state = startBattleRight({
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
        origin: {
          kind: "statBlock",
          statBlockId: "stat_block_resource_test_monster",
          resources: {
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
        },
      }),
    );
  });

  test("Stat Block Bonus Action and Reaction attacks do not enter the Attack action lane", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
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
        state: startBattleRight({
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
        state: startBattleRight({
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
    const state = startBattleRight({
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
        state: startBattleRight({
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
      { readonly tag: "action"; readonly action: "attack" }
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
        state: startBattleRight({
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
          attackTargetFill(
            targetHole,
            distantSubject.actorId,
            goblinId,
            distantSubject.attackName,
          ),
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
    const state = startBattleRight({
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
        state: startBattleRight({
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

  test("Goblin Warrior target holes expose caller-selected table targets", () => {
    const state = startBattleRight({
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

    expect(scimitarTargetHole.choices).toEqual([
      fighterId,
      distantFighterId,
      longRangeFighterId,
    ]);
    expect(shortbowTargetHole.choices).toEqual([
      fighterId,
      distantFighterId,
      longRangeFighterId,
    ]);
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
    const subject: Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "attack" }
    > = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
      statBlockSection: "actions",
    };
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
    const state = startBattleRight({
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
        turn: { actionResources: [] },
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
    const state = startBattleRight({
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

    const poisonState = startBattleRight({
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
      ...startBattleRight({
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
        commandHalt: null,
        spellSlotExpendedThisTurn: false,
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
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
        turn: {
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

    const zeroHpActorState = {
      ...startBattleRight({
        battleId: battleId("battle-action-surge-atZeroHitPoints-actor"),
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
        commandHalt: null,
        spellSlotExpendedThisTurn: false,
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;
    expect(
      resolveBattleSubject({
        state: zeroHpActorState,
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
      ...startBattleRight({
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
        commandHalt: null,
        spellSlotExpendedThisTurn: false,
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
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
    const state = startBattleRight({
      battleId: battleId("battle-second-wind"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          currentHp: 4,
          resources: [resource()],
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
        turn: {
          bonusActionAvailable: false,
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
      ...startBattleRight({
        battleId: battleId("battle-second-wind-no-bonus-action"),
        combatants: [
          characterSeed({
            initiative: 20,
            currentHp: 4,
            resources: [resource()],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [{ kind: "action", source: "turn" }],
        currentHasBonusAction: false,
        commandHalt: null,
        spellSlotExpendedThisTurn: false,
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
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

    const depletedState = startBattleRight({
      battleId: battleId("battle-second-wind-depleted"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 4,
          resources: [resource({ usesRemaining: 0 })],
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

    const unsupportedState = startBattleRight({
      battleId: battleId("battle-second-wind-unsupported-shape"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 4,
          resources: [
            resource({
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

    const zeroHpActorState = startBattleRight({
      battleId: battleId("battle-second-wind-atZeroHitPoints-actor"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 0,
          resources: [resource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveBattleSubject({
        state: zeroHpActorState,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_second_wind",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Rage enters a reusable ongoing feature and applies damage and Resistance riders", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-ongoing-feature"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "barbarian_rage",
    };
    expect(discoverBattleActs(state).map((act) => act.subject)).toEqual(
      expect.arrayContaining([rageSubject]),
    );

    const raging = resolveBattleSubject({
      state,
      subject: rageSubject,
      fills: [],
    });
    expect(raging).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: expect.objectContaining({
          bonusActionAvailable: false,
        }),
      },
    });
    if (raging.tag !== "resolved") throw new Error("Expected resolved Rage.");
    expect([
      ...raging.state.combatants.get(fighterId)!
        .activeOngoingFeatureOccurrences,
    ]).toEqual(
      expect.arrayContaining([
        ["barbarian_rage", expect.objectContaining({ kind: "roundExtended" })],
      ]),
    );

    const attackSubject = fighterAttackSubject();
    const target = attackInitialTargetHole(raging.state, attackSubject);
    const roll = attackRollHoleAfterTarget(raging.state, target, attackSubject);
    const damage = attackDamageHoleAfterHit(
      raging.state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      attackSubject,
    );
    const hit = resolveBattleSubject({
      state: raging.state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });
    expect(hit).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 1 }),
        ]),
      },
    });

    const goblinTurn = requireResolved(
      endTurn({ state: raging.state, actorId: fighterId }),
    ).state;
    const scimitar = goblinAttackSubject("Scimitar");
    const barbarianTarget = attackInitialTargetHole(goblinTurn, scimitar);
    const goblinRoll = attackRollHoleAfterTarget(
      goblinTurn,
      barbarianTarget,
      scimitar,
      fighterId,
    );
    const goblinDamage = attackDamageHoleAfterHit(
      goblinTurn,
      barbarianTarget,
      goblinRoll,
      { total: 15, naturalD20: 10 },
      scimitar,
      fighterId,
    );
    const resisted = resolveBattleSubject({
      state: goblinTurn,
      subject: scimitar,
      fills: [
        targetFill(barbarianTarget, fighterId),
        attackRollFill(goblinRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(goblinDamage, 4),
      ],
    });
    expect(resisted).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: fighterId, hp: 9 }),
        ]),
      },
    });
  });

  test("Rage breaks Concentration and prevents spellcasting", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-spellcasting-restriction"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 1 },
            { className: "wizard", level: 1 },
          ],
          resources: [rageResource()],
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const concentratingActor = state.combatants.get(fighterId);
    if (concentratingActor === undefined) {
      throw new Error("Expected barbarian caster.");
    }
    const concentratingState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...concentratingActor,
        concentration: {
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "barbarian_rage",
    };
    const raging = requireResolved(
      resolveBattleSubject({
        state: concentratingState,
        subject: rageSubject,
        fills: [],
      }),
    );
    expect(raging.state.combatants.get(fighterId)?.concentration).toBeNull();
    expect(
      discoverBattleActs(raging.state).map((act) => act.subject),
    ).not.toEqual(
      expect.arrayContaining([
        {
          tag: "actionSpell",
          actorId: fighterId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "cast" },
        },
      ]),
    );
    expect(
      resolveBattleSubject({
        state: raging.state,
        subject: {
          tag: "actionSpell",
          actorId: fighterId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "cast" },
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Rage breaking Concentration dissipates a held readied spell", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-readied-spell-cleanup"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 1 },
            { className: "wizard", level: 1 },
          ],
          resources: [rageResource()],
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
          actorId: fighterId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        fills: [],
      }),
    );
    expect(readied.state.readiedSpells.has(fighterId)).toBe(true);
    const raging = requireResolved(
      resolveBattleSubject({
        state: readied.state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "barbarian_rage",
        },
        fills: [],
      }),
    );
    expect(raging.state.combatants.get(fighterId)?.concentration).toBeNull();
    expect(raging.state.readiedSpells.has(fighterId)).toBe(false);
  });

  test("Reckless Attack is unavailable after any earlier attack roll that turn", () => {
    const state = startBattleRight({
      battleId: battleId("battle-reckless-after-spell-attack"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 2 },
            { className: "fighter", level: 2 },
            { className: "wizard", level: 1 },
          ],
          unitFeatures: [recklessAttackFeature()],
          resources: [actionSurgeResource()],
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const spellSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    };
    const spellAct = discoverBattleActs(state).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.actorId === fighterId &&
        act.subject.invocation.spellId === "ray_of_frost" &&
        act.subject.invocation.procedure === "spellAttackDamage",
    );
    const target = spellAct?.initialHoles[0];
    if (target?.kind !== "targetChoice") {
      throw new Error("Expected Ray of Frost target hole.");
    }
    const afterTarget = resolveBattleSubject({
      state,
      subject: spellSubject,
      fills: [targetFill(target, goblinId)],
    });
    if (afterTarget.tag !== "needsHoles") {
      throw new Error("Expected Ray of Frost attack-roll hole.");
    }
    const roll = afterTarget.holes[0];
    if (roll?.kind !== "attackRoll") {
      throw new Error("Expected Ray of Frost attack-roll hole.");
    }
    const missed = requireResolved(
      resolveBattleSubject({
        state,
        subject: spellSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 1, naturalD20: 1 }),
        ],
      }),
    );
    expect(missed.state.currentTurnResources.attackRollMadeThisTurn).toBe(true);
    const surged = requireResolved(
      resolveBattleSubject({
        state: missed.state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_action_surge",
        },
        fills: [],
      }),
    );
    const attackSubject = fighterAttackSubject();
    const attackTarget = attackInitialTargetHole(surged.state, attackSubject);
    const attackRoll = attackRollHoleAfterTarget(
      surged.state,
      attackTarget,
      attackSubject,
    );
    if (attackRoll.kind !== "attackRoll") {
      throw new Error("Expected weapon attack-roll hole.");
    }
    if (!("attack" in attackRoll)) {
      throw new Error("Expected weapon attack-roll hole.");
    }
    expect(attackRoll.ongoingFeatureActivations).toBeUndefined();
  });

  test("Rage Damage scales by Barbarian level", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-damage-scaling"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 9 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const raging = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "barbarian_rage",
        },
        fills: [],
      }),
    );
    const attackSubject = fighterAttackSubject();
    const target = attackInitialTargetHole(raging.state, attackSubject);
    const roll = attackRollHoleAfterTarget(raging.state, target, attackSubject);
    const damage = attackDamageHoleAfterHit(
      raging.state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      attackSubject,
    );
    const disposition = attackDamageDispositionHoleAfterFills(
      raging.state,
      attackSubject,
      [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    );
    const hit = requireResolved(
      resolveBattleSubject({
        state: raging.state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
          damageRollFill(damage, 4),
          attackDamageDispositionFill(disposition, {
            kind: "ordinaryDamage",
          }),
        ],
      }),
    );
    expect(hit.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: goblinId, hp: 0 }),
      ]),
    );
  });

  test("Tactical Mind spends Second Wind only when a failed ability check becomes successful", () => {
    const tacticalMindUnit = unitLibrary.requireUnit("fighter_tactical_mind");
    const state = startBattleRight({
      battleId: battleId("battle-tactical-mind-converted-success"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          resources: [resource({ usesRemaining: 2 })],
          unitFeatures: [{ unit: tacticalMindUnit }],
          characterUnitRefs: [supportedBattleUnitRef(tacticalMindUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const converted = resolveFailedAbilityCheckResourceBoost({
      state,
      unitId: tacticalMindUnit.id,
      abilityCheck: {
        actorId: fighterId,
        ability: "int",
        skillOrToolLabel: "Investigation",
        originalTotal: 13,
        dc: difficultyClass(15),
      },
      boostRoll: 3,
    });

    expect(converted).toMatchObject({
      tag: "resolved",
      abilityCheckBoost: {
        boostedTotal: 16,
        boostedSucceeded: true,
      },
      snapshot: {
        turn: {
          bonusActionAvailable: true,
        },
      },
    });
    if (converted.tag !== "resolved") {
      throw new Error(`Expected resolved Tactical Mind, got ${converted.tag}.`);
    }
    expect(converted.state.combatants.get(fighterId)?.origin).toMatchObject({
      resources: [
        expect.objectContaining({
          unit: expect.objectContaining({ id: "fighter_second_wind" }),
          usesRemaining: 1,
        }),
      ],
    });

    const stillFailed = resolveFailedAbilityCheckResourceBoost({
      state,
      unitId: tacticalMindUnit.id,
      abilityCheck: {
        actorId: fighterId,
        ability: "wis",
        originalTotal: 10,
        dc: difficultyClass(15),
      },
      boostRoll: 4,
    });

    expect(stillFailed).toMatchObject({
      tag: "resolved",
      abilityCheckBoost: {
        boostedTotal: 14,
        boostedSucceeded: false,
      },
    });
    if (stillFailed.tag !== "resolved") {
      throw new Error(
        `Expected resolved Tactical Mind, got ${stillFailed.tag}.`,
      );
    }
    expect(stillFailed.state.combatants.get(fighterId)?.origin).toMatchObject({
      resources: [
        expect.objectContaining({
          unit: expect.objectContaining({ id: "fighter_second_wind" }),
          usesRemaining: 2,
        }),
      ],
    });
  });

  test("Tactical Mind rejects successful checks, depleted Second Wind, and unsupported Unit projection", () => {
    const tacticalMindUnit = unitLibrary.requireUnit("fighter_tactical_mind");
    const baseState = startBattleRight({
      battleId: battleId("battle-tactical-mind-invalid"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          resources: [resource({ usesRemaining: 1 })],
          unitFeatures: [{ unit: tacticalMindUnit }],
          characterUnitRefs: [supportedBattleUnitRef(tacticalMindUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveFailedAbilityCheckResourceBoost({
        state: baseState,
        unitId: tacticalMindUnit.id,
        abilityCheck: {
          actorId: fighterId,
          ability: "str",
          originalTotal: 15,
          dc: difficultyClass(15),
        },
        boostRoll: 1,
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const depletedState = startBattleRight({
      battleId: battleId("battle-tactical-mind-depleted"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          resources: [resource({ usesRemaining: 0 })],
          unitFeatures: [{ unit: tacticalMindUnit }],
          characterUnitRefs: [supportedBattleUnitRef(tacticalMindUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveFailedAbilityCheckResourceBoost({
        state: depletedState,
        unitId: tacticalMindUnit.id,
        abilityCheck: {
          actorId: fighterId,
          ability: "dex",
          originalTotal: 14,
          dc: difficultyClass(15),
        },
        boostRoll: 1,
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const unsupportedState = startBattleRight({
      battleId: battleId("battle-tactical-mind-unsupported"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          resources: [resource({ usesRemaining: 1 })],
          unitFeatures: [{ unit: tacticalMindUnit }],
          characterUnitRefs: [],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveFailedAbilityCheckResourceBoost({
        state: unsupportedState,
        unitId: tacticalMindUnit.id,
        abilityCheck: {
          actorId: fighterId,
          ability: "cha",
          originalTotal: 14,
          dc: difficultyClass(15),
        },
        boostRoll: 1,
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Rage is unavailable in Heavy armor", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-heavy-armor-gated"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
          armorClass: heavyArmorClassState(),
          selectedLoadout: {
            armor: "armor_chain_mail",
            weapon: {
              itemId: "main:weapon_longsword",
              unitId: "weapon_longsword",
              grip: "one_handed",
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(discoverBattleActs(state).map((act) => act.subject)).not.toEqual(
      expect.arrayContaining([
        { tag: "unitFeature", actorId: fighterId, unitId: "barbarian_rage" },
      ]),
    );
  });

  test("Rage extension spends a Bonus Action without spending another use", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-bonus-action-extension"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource({ usesRemaining: 2 })],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "barbarian_rage",
    };
    const raging = requireResolved(
      resolveBattleSubject({ state, subject: rageSubject, fills: [] }),
    );
    const nextRound = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({ state: raging.state, actorId: fighterId }),
        ).state,
        actorId: goblinId,
      }),
    ).state;
    expect(discoverBattleActs(nextRound).map((act) => act.subject)).toEqual(
      expect.arrayContaining([rageSubject]),
    );
    const extended = requireResolved(
      resolveBattleSubject({
        state: nextRound,
        subject: rageSubject,
        fills: [],
      }),
    );
    const barbarian = extended.state.combatants.get(fighterId);
    expect(barbarian?.origin.kind).toBe("character");
    if (barbarian?.origin.kind !== "character") {
      throw new Error("Expected barbarian character.");
    }
    const rageState = barbarian.origin.resources[0];
    if (
      rageState === undefined ||
      characterBattleResourceUsage(rageState) !== "limited" ||
      !("usesRemaining" in rageState)
    ) {
      throw new Error("Expected limited Rage resource.");
    }
    expect(Number(rageState.usesRemaining)).toBe(1);
    expect(extended.snapshot.turn.bonusActionAvailable).toBe(false);
  });

  test("Rage extends when Grapple forces an enemy saving throw", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-grapple-saving-throw-extension"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const raging = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "barbarian_rage",
        },
        fills: [],
      }),
    );
    const nextFighterTurn = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({ state: raging.state, actorId: fighterId }),
        ).state,
        actorId: goblinId,
      }),
    ).state;
    const grappleSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "grapple",
    };
    const grappleAct = discoverBattleActs(nextFighterTurn).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.actorId === fighterId &&
        act.subject.action === "grapple",
    );
    if (grappleAct === undefined) {
      throw new Error("Expected Grapple act.");
    }
    const target = findHole(grappleAct.initialHoles, "targetChoice");
    const afterTarget = resolveBattleSubject({
      state: nextFighterTurn,
      subject: grappleSubject,
      fills: [targetFill(target, goblinId)],
    });
    if (afterTarget.tag !== "needsHoles") {
      throw new Error("Expected Grapple outcome hole.");
    }
    const outcome = findHole(afterTarget.holes, "grappleOutcome");
    const grappled = requireResolved(
      resolveBattleSubject({
        state: nextFighterTurn,
        subject: grappleSubject,
        fills: [
          targetFill(target, goblinId),
          grappleOutcomeFill(outcome, false),
        ],
      }),
    );
    const barbarian = grappled.state.combatants.get(fighterId);
    expect(
      [...(barbarian?.activeOngoingFeatureOccurrences.values() ?? [])][0]
        ?.expiresAt,
    ).toEqual({
      kind: "endOfTurn",
      combatantId: fighterId,
      round: 3,
    });
  });

  test("Incapacitated combatants cannot activate or extend Rage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-incapacitated-action-gate"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const barbarian = state.combatants.get(fighterId);
    if (barbarian === undefined) {
      throw new Error("Expected barbarian combatant.");
    }
    const incapacitatedState = {
      ...state,
      combatants: new Map(state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          barbarian,
          applyCondition(barbarian.conditions, "incapacitated"),
        ),
      ),
    };
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "barbarian_rage",
    };
    expect(
      discoverBattleActs(incapacitatedState).map((act) => act.subject),
    ).not.toEqual(expect.arrayContaining([rageSubject]));
    expect(
      resolveBattleSubject({
        state: incapacitatedState,
        subject: rageSubject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Persistent Rage uses ten-minute duration and Unconscious early end", () => {
    const state = startBattleRight({
      battleId: battleId("battle-persistent-rage"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 15 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const raging = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "barbarian_rage",
        },
        fills: [],
      }),
    );
    const snapshotBarbarian = raging.state.combatants.get(fighterId);
    expect(
      [
        ...(snapshotBarbarian?.activeOngoingFeatureOccurrences.values() ?? []),
      ][0]?.expiresAt,
    ).toEqual({
      kind: "endOfTurn",
      combatantId: fighterId,
      round: 101,
    });
    const barbarian = raging.state.combatants.get(fighterId);
    if (barbarian === undefined) {
      throw new Error("Expected barbarian combatant.");
    }
    const incapacitated = {
      ...raging.state,
      combatants: new Map(raging.state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          barbarian,
          applyCondition(barbarian.conditions, "incapacitated"),
        ),
      ),
    };
    const stillRaging = requireResolved(
      endTurn({ state: incapacitated, actorId: fighterId }),
    );
    expect(
      stillRaging.state.combatants.get(fighterId)
        ?.activeOngoingFeatureOccurrences.size,
    ).toBe(1);
    const unconscious = {
      ...raging.state,
      combatants: new Map(raging.state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          barbarian,
          applyCondition(barbarian.conditions, "unconscious"),
        ),
      ),
    };
    const ended = requireResolved(
      endTurn({ state: unconscious, actorId: fighterId }),
    );
    expect(
      ended.state.combatants.get(fighterId)?.activeOngoingFeatureOccurrences
        .size,
    ).toBe(0);
  });

  test("Innate Sorcery activation spends a Bonus Action and one Long Rest use for one minute", () => {
    const state = startBattleRight({
      battleId: battleId("battle-innate-sorcery"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "sorcerer", level: 1 }],
          resources: [innateSorceryResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "sorcerer_innate_sorcery",
    };

    expect(discoverBattleActs(state).map((act) => act.subject)).toEqual(
      expect.arrayContaining([subject]),
    );

    const result = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );
    const sorcerer = result.state.combatants.get(fighterId);
    const resource =
      sorcerer?.origin.kind === "character"
        ? sorcerer.origin.resources[0]
        : undefined;

    expect(result.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(resource).toMatchObject({ usesRemaining: resourceCount(1) });
    expect(sorcerer?.activeOngoingFeatureOccurrences).toEqual(
      new Map([
        [
          "sorcerer_innate_sorcery",
          {
            kind: "fixedDuration",
            expiresAt: {
              kind: "endOfTurn",
              combatantId: fighterId,
              round: 11,
            },
          },
        ],
      ]),
    );
  });

  test("Innate Sorcery rejects exhausted uses and non-Sorcerer ownership", () => {
    const subject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "sorcerer_innate_sorcery",
    };
    const exhausted = startBattleRight({
      battleId: battleId("battle-innate-sorcery-exhausted"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "sorcerer", level: 1 }],
          resources: [innateSorceryResource({ usesRemaining: 0 })],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(discoverBattleActs(exhausted).map((act) => act.subject)).not.toEqual(
      expect.arrayContaining([subject]),
    );
    expect(
      resolveBattleSubject({ state: exhausted, subject, fills: [] }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(() =>
      startBattle({
        battleId: battleId("battle-innate-sorcery-non-sorcerer"),
        combatants: [
          characterSeed({
            initiative: 20,
            resources: [innateSorceryResource()],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow(
      "Character class feature resource requires a sorcerer class level.",
    );
  });

  test("Innate Sorcery expires after its one-minute active duration", () => {
    const state = startBattleRight({
      battleId: battleId("battle-innate-sorcery-expiry"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "sorcerer", level: 1 }],
          resources: [innateSorceryResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "sorcerer_innate_sorcery",
    };
    let current = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    ).state;

    for (let round = 1; round <= 10; round += 1) {
      current = requireResolved(
        endTurn({ state: current, actorId: fighterId }),
      ).state;
      current = requireResolved(
        endTurn({ state: current, actorId: goblinId }),
      ).state;
    }
    current = requireResolved(
      endTurn({ state: current, actorId: fighterId }),
    ).state;

    expect(
      current.combatants.get(fighterId)?.activeOngoingFeatureOccurrences,
    ).toEqual(new Map());
  });

  test("Innate Sorcery projects +1 DC and spell attack Advantage for Sorcerer spells while active", () => {
    const state = startBattleRight({
      battleId: battleId("battle-innate-sorcery-spell-projection"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "sorcerer", level: 1 }],
          resources: [innateSorceryResource()],
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [
                spellRecord("acid_splash"),
                spellRecord("ray_of_frost"),
              ],
              preparedSpells: [],
            }),
            sourceClassName: "sorcerer",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const activated = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "sorcerer_innate_sorcery",
        },
        fills: [],
      }),
    ).state;

    expect(spellSaveDcForCaster(activated, fighterId)).toBe(14);

    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state: activated, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: activated,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );

    expect(attackRoll).toMatchObject({ rollMode: "advantage" });
  });

  test("Innate Sorcery does not project onto non-Sorcerer spell sources and stops after expiration", () => {
    const state = startBattleRight({
      battleId: battleId("battle-innate-sorcery-spell-source-gate"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "sorcerer", level: 1 },
            { className: "wizard", level: 1 },
          ],
          resources: [innateSorceryResource()],
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [spellRecord("ray_of_frost")],
              preparedSpells: [],
            }),
            sourceClassName: "wizard",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const activated = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "sorcerer_innate_sorcery",
        },
        fills: [],
      }),
    ).state;

    expect(spellSaveDcForCaster(activated, fighterId)).toBe(13);

    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state: activated, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: activated,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );

    expect(attackRoll).not.toHaveProperty("rollMode");

    let expired = activated;
    for (let round = 1; round <= 10; round += 1) {
      expired = requireResolved(
        endTurn({ state: expired, actorId: fighterId }),
      ).state;
      expired = requireResolved(
        endTurn({ state: expired, actorId: goblinId }),
      ).state;
    }
    expired = requireResolved(
      endTurn({ state: expired, actorId: fighterId }),
    ).state;

    expect(spellSaveDcForCaster(expired, fighterId)).toBe(13);
  });

  test("Rage early-end conditions remove the ongoing feature instead of hiding it", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-early-end-removal"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "barbarian_rage",
    };
    const raging = requireResolved(
      resolveBattleSubject({ state, subject: rageSubject, fills: [] }),
    );
    const barbarian = raging.state.combatants.get(fighterId);
    if (barbarian === undefined) {
      throw new Error("Expected barbarian combatant.");
    }
    const incapacitated = {
      ...raging.state,
      combatants: new Map(raging.state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          barbarian,
          applyCondition(barbarian.conditions, "incapacitated"),
        ),
      ),
    };
    const ended = requireResolved(
      endTurn({ state: incapacitated, actorId: fighterId }),
    );
    expect(
      ended.state.combatants.get(fighterId)?.activeOngoingFeatureOccurrences
        .size,
    ).toBe(0);
  });

  test("Reckless Attack ongoing feature grants reciprocal Advantage until the actor's next turn", () => {
    const state = startBattleRight({
      battleId: battleId("battle-reckless-ongoing-feature"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 2 }],
          unitFeatures: [recklessAttackFeature()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(discoverBattleActs(state).map((act) => act.subject)).not.toEqual(
      expect.arrayContaining([
        {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "barbarian_reckless_attack",
        },
      ]),
    );

    const attackSubject = fighterAttackSubject();
    const target = attackInitialTargetHole(state, attackSubject);
    const roll = attackRollHoleAfterTarget(state, target, attackSubject);
    expect(roll).toMatchObject({
      ongoingFeatureActivations: [
        expect.objectContaining({
          unitId: "barbarian_reckless_attack",
          rollMode: "advantage",
        }),
      ],
    });
    const reckless = resolveBattleSubject({
      state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
          activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
        }),
      ],
    });
    if (reckless.tag !== "needsHoles") {
      throw new Error("Expected Reckless attack to reach damage roll.");
    }
    expect([
      ...reckless.state.combatants.get(fighterId)!
        .activeOngoingFeatureOccurrences,
    ]).toEqual(
      expect.arrayContaining([
        [
          "barbarian_reckless_attack",
          expect.objectContaining({ kind: "turnBoundary" }),
        ],
      ]),
    );
    const damage = findHole(reckless.holes, "rolledDice");
    expect(
      resolveBattleSubject({
        state: reckless.state,
        subject: attackSubject,
        fills: [
          attackTargetFill(
            target,
            attackSubject.actorId,
            goblinId,
            attackSubject.attackName,
          ),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
            activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
          }),
          damageRollFill(damage, 4),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });

    const goblinTurn = requireResolved(
      endTurn({ state: reckless.state, actorId: fighterId }),
    ).state;
    const scimitar = goblinAttackSubject("Scimitar");
    const barbarianTarget = attackInitialTargetHole(goblinTurn, scimitar);
    const incomingRoll = attackRollHoleAfterTarget(
      goblinTurn,
      barbarianTarget,
      scimitar,
      fighterId,
    );
    expect(incomingRoll).toMatchObject({ rollMode: "advantage" });

    const barbarianTurn = requireResolved(
      endTurn({ state: goblinTurn, actorId: goblinId }),
    ).state;
    expect(
      barbarianTurn.combatants.get(fighterId)?.activeOngoingFeatureOccurrences,
    ).toEqual(new Map());
  });

  test("Reckless Attack cannot be declared before the first attack roll", () => {
    const state = startBattleRight({
      battleId: battleId("battle-reckless-not-predeclared"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 2 }],
          unitFeatures: [recklessAttackFeature()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "barbarian_reckless_attack",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Reckless Attack activation preserves straight rolls when modifiers already cancel", () => {
    const state = startBattleRight({
      battleId: battleId("battle-reckless-cancelled-modifiers"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 2 }],
          unitFeatures: [recklessAttackFeature()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);
    if (fighter === undefined || goblin === undefined) {
      throw new Error("Expected combatants.");
    }
    const contestedState: BattleState = {
      ...state,
      combatants: new Map(state.combatants)
        .set(fighterId, {
          ...fighter,
          hidden: { discoveryDc: difficultyClass(16) },
        })
        .set(goblinId, {
          ...goblin,
          hidden: { discoveryDc: difficultyClass(16) },
        }),
    };
    const attackSubject = fighterAttackSubject();
    const target = attackInitialTargetHole(contestedState, attackSubject);
    const roll = attackRollHoleAfterTarget(
      contestedState,
      target,
      attackSubject,
    );
    if (roll.kind !== "attackRoll") {
      throw new Error("Expected attack-roll hole.");
    }
    expect(roll.rollMode).toBeUndefined();
    const reckless = resolveBattleSubject({
      state: contestedState,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
        }),
      ],
    });
    if (reckless.tag !== "needsHoles") {
      throw new Error("Expected Reckless attack to reach damage roll.");
    }
    const damage = findHole(reckless.holes, "rolledDice");
    expect(
      resolveBattleSubject({
        state: reckless.state,
        subject: attackSubject,
        fills: [
          attackTargetFill(
            target,
            attackSubject.actorId,
            goblinId,
            attackSubject.attackName,
          ),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
          }),
          damageRollFill(damage, 4),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("Reckless Attack replay stays valid after an attack-hit Reaction window", () => {
    const baseState = startBattleRight({
      battleId: battleId("battle-reckless-reaction-replay"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 2 }],
          unitFeatures: [recklessAttackFeature()],
        }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 10,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 5 }),
      ],
    });
    const state = {
      ...baseState,
      readiedMovements: new Map([
        [
          wizardId,
          {
            trigger: "attackHit" as const,
            expiresAt: { kind: "startOfTurn" as const, combatantId: wizardId },
          },
        ],
      ]),
    } satisfies BattleState;
    const attackSubject = fighterAttackSubject();
    const target = attackInitialTargetHole(state, attackSubject);
    const roll = attackRollHoleAfterTarget(state, target, attackSubject);
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
          activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected attack-hit Reaction window.");
    }

    const decision = findHole(awaitingReaction.holes, "reactionDecision");
    const resumed = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(decision, {
        kind: "decline",
        reactorId: wizardId,
      }),
    });

    expect(resumed).toMatchObject({ tag: "needsHoles" });
    if (resumed.tag !== "needsHoles") {
      throw new Error("Expected resumed Reckless attack to need damage.");
    }
    expect(findHole(resumed.holes, "rolledDice")).toBeDefined();
  });

  test("Sneak Attack is exposed as an optional attack damage rider on eligible hits", () => {
    const visibleState = startBattleRight({
      battleId: battleId("battle-sneak-attack-rider"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const rogue = visibleState.combatants.get(fighterId);
    if (rogue === undefined) {
      throw new Error("Expected Sneak Attack rogue combatant.");
    }
    const state: BattleState = {
      ...visibleState,
      combatants: new Map(visibleState.combatants).set(fighterId, {
        ...rogue,
        hidden: { discoveryDc: difficultyClass(16) },
      }),
    };
    const attackSubject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, attackSubject);
    const roll = attackRollHoleAfterTarget(state, target, attackSubject);
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 15, naturalD20: 10, rollMode: "advantage" },
      attackSubject,
    );
    expect(damage).toMatchObject({
      kind: "rolledDice",
      attackDamageRiders: [
        {
          attackerId: fighterId,
          unitId: "rogue_sneak_attack",
          label: "Sneak Attack",
          damage: { dice: 1, dieSize: 6, damageType: "piercing" },
        },
      ],
    });
    const disposition = attackDamageDispositionHoleAfterFills(
      state,
      attackSubject,
      [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
        }),
        damageRollFillWithGroups(damage, [[4], [6]], ["rogue_sneak_attack"]),
      ],
    );

    const hit = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
          }),
          damageRollFillWithGroups(damage, [[4], [6]], ["rogue_sneak_attack"]),
          attackDamageDispositionFill(disposition, {
            kind: "ordinaryDamage",
          }),
        ],
      }),
    );
    expect(hit.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: goblinId, hp: 0 }),
      ]),
    );
    expect(
      hit.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([{ attackerId: fighterId, unitId: "rogue_sneak_attack" }]);
  });

  test("Sneak Attack accepts caller-supplied Advantage as attack-roll Advantage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-caller-advantage"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attackSubject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, attackSubject);
    const roll = attackRollHoleAfterTarget(state, target, attackSubject);
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 15, naturalD20: 10, rollMode: "advantage" },
      attackSubject,
    );

    expect(damage).toMatchObject({
      attackDamageRiders: [
        expect.objectContaining({ unitId: "rogue_sneak_attack" }),
      ],
    });
  });

  test("Sneak Attack is inactive before its acquired class level", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-before-acquired-level"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature({ acquiredAtLevel: 2 })],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attackSubject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, attackSubject);
    const roll = attackRollHoleAfterTarget(state, target, attackSubject);
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 15, naturalD20: 10, rollMode: "advantage" },
      attackSubject,
    );

    expect(damage).not.toHaveProperty("attackDamageRiders");
  });

  test("Sneak Attack rider is gated by weapon, roll context, and once-per-turn usage", () => {
    const allyId = combatantId("ally");
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-rider-gates"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testLongswordAttack(),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Ally",
          initiative: 10,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 5 }),
      ],
    });
    const longswordSubject = fighterAttackSubject("Longsword");
    const target = attackInitialTargetHole(state, longswordSubject);
    const roll = attackRollHoleAfterTarget(state, target, longswordSubject);
    const longswordDamage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      longswordSubject,
    );
    expect(longswordDamage).not.toHaveProperty("attackDamageRiders");

    const rogue = state.combatants.get(fighterId);
    if (rogue?.origin.kind !== "character") {
      throw new Error("Expected rogue character.");
    }
    const finesseState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...rogue,
        origin: {
          ...rogue.origin,
          attack: testDaggerAttack(),
        },
      }),
      currentTurnResources: {
        ...state.currentTurnResources,
        attackDamageRidersUsedThisTurn: [
          { attackerId: fighterId, unitId: "rogue_sneak_attack" },
        ],
      },
    } satisfies BattleState;
    const daggerSubject = fighterAttackSubject("Dagger");
    const daggerTarget = attackInitialTargetHole(finesseState, daggerSubject);
    const daggerRoll = attackRollHoleAfterTarget(
      finesseState,
      daggerTarget,
      daggerSubject,
    );
    const usedDamage = attackDamageHoleAfterHit(
      finesseState,
      daggerTarget,
      daggerRoll,
      { total: 15, naturalD20: 10 },
      daggerSubject,
    );
    expect(usedDamage).not.toHaveProperty("attackDamageRiders");
  });

  test("Sneak Attack can use the ally-within-5ft eligibility branch", () => {
    const allyId = combatantId("sneak-ally");
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-ally-within-5ft"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Ally",
          initiative: 10,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 5 }),
      ],
    });
    const subject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, subject);
    const roll = attackRollHoleAfterTarget(state, target, subject, goblinId);
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );

    expect(damage).toMatchObject({
      attackDamageRiders: [
        expect.objectContaining({ unitId: "rogue_sneak_attack" }),
      ],
    });
  });

  test("Sneak Attack ally-within-5ft branch uses resolved roll mode after Advantage and Disadvantage cancel", () => {
    const allyId = combatantId("sneak-cancel-ally");
    const base = startBattleRight({
      battleId: battleId("battle-sneak-attack-canceled-roll-mode"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Ally",
          initiative: 10,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 5 }),
      ],
    });
    const rogue = base.combatants.get(fighterId);
    const targetCombatant = base.combatants.get(goblinId);
    if (rogue === undefined || targetCombatant === undefined) {
      throw new Error("Expected Sneak Attack test combatants.");
    }
    const state: BattleState = {
      ...base,
      combatants: new Map(base.combatants)
        .set(fighterId, {
          ...rogue,
          hidden: { discoveryDc: difficultyClass(16) },
        })
        .set(goblinId, {
          ...targetCombatant,
          hidden: { discoveryDc: difficultyClass(17) },
        }),
    };
    const subject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, subject);
    const roll = attackRollHoleAfterTarget(state, target, subject, goblinId);
    expect(roll).not.toHaveProperty("rollMode");
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );

    expect(damage).toMatchObject({
      attackDamageRiders: [
        expect.objectContaining({ unitId: "rogue_sneak_attack" }),
      ],
    });
  });

  test("Sneak Attack rejects uneligible selected rider ids", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-invalid-selected-rider"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, subject);
    const roll = attackRollHoleAfterTarget(state, target, subject);
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 15, naturalD20: 10, rollMode: "advantage" },
      subject,
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(
            target,
            subject.actorId,
            goblinId,
            subject.attackName,
          ),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
          }),
          damageRollFillWithGroups(
            damage,
            [[4], [6]],
            ["rogue_sneak_attack_typo"],
          ),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("Sneak Attack damage dice are doubled on critical hits", () => {
    const allyId = combatantId("critical-ally");
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-critical"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Critical Ally",
          initiative: 10,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, subject);
    const roll = attackRollHoleAfterTarget(state, target, subject);
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 20, naturalD20: 20 },
      subject,
    );

    const hit = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(
            target,
            subject.actorId,
            goblinId,
            subject.attackName,
            [
              {
                kind: "sneakAttackAllyWithin5FeetOfTarget",
                attackerId: subject.actorId,
                targetId: goblinId,
                allyId,
              },
            ],
          ),
          attackRollFill(roll, {
            total: 20,
            naturalD20: 20,
          }),
          damageRollFillWithGroups(
            damage,
            [
              [1, 1],
              [2, 2],
            ],
            ["rogue_sneak_attack"],
          ),
        ],
      }),
    );

    expect(hit.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: goblinId, hp: 1 }),
      ]),
    );
  });

  test("Sneak Attack once-per-turn usage is scoped to the attacking creature", () => {
    const secondRogueId = combatantId("second-rogue");
    const allyId = combatantId("second-rogue-ally");
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-two-rogues"),
      combatants: [
        characterSeed({
          combatantId: secondRogueId,
          displayName: "Second Rogue",
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Second Rogue Ally",
          initiative: 10,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const secondRogueSubject = {
      tag: "action",
      actorId: secondRogueId,
      action: "attack",
      attackName: "Dagger",
    } as const satisfies Extract<BattleSubject, { readonly tag: "action" }>;
    const usedByDifferentRogue = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        attackDamageRidersUsedThisTurn: [
          { attackerId: fighterId, unitId: "rogue_sneak_attack" },
        ],
      },
    } satisfies BattleState;
    const target = attackInitialTargetHole(
      usedByDifferentRogue,
      secondRogueSubject,
    );
    const roll = attackRollHoleAfterTarget(
      usedByDifferentRogue,
      target,
      secondRogueSubject,
      goblinId,
    );
    const damage = attackDamageHoleAfterHit(
      usedByDifferentRogue,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      secondRogueSubject,
      goblinId,
    );

    expect(damage).toMatchObject({
      attackDamageRiders: [
        expect.objectContaining({
          attackerId: secondRogueId,
          unitId: "rogue_sneak_attack",
        }),
      ],
    });
  });

  test("class riders without admitted support profiles remain gated", () => {
    const oldClassRiders = [
      ["rogue_evasion", "Rogue Evasion"],
      ["rogue_uncanny_dodge", "Uncanny Dodge"],
      ["bard_cutting_words", "Cutting Words"],
    ] as const;
    const state = startBattleRight({
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

  test("full SRD Cutting Words is admitted with ability-check reactions supported", () => {
    expect(
      battleReactionRollOrDamageReductionSupportForUnit(
        unitLibrary.requireUnit("bard_cutting_words"),
      ),
    ).toBe("reactionRollOrDamageReduction");
  });

  test("Deflect Attacks redirect support comes from authored mechanics", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");

    expect(battleReactionRollOrDamageReductionSupportForUnit(unit)).toBe(
      "attackDamageReductionZeroDamageRedirect",
    );
    expect(battleUnitSupportProfilesForUnit({ unit })).toEqual(
      Either.right([
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
      ]),
    );
  });

  test("Deflect Attacks asks for redirect facts after reducing attack damage to 0", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const state = startBattleRight({
      battleId: battleId("battle-deflect-attacks-redirect-holes"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        resistantSkeletonCreatureInit({ initiative: 15 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 10,
          classLevels: [{ className: "monk", level: 3 }],
          attack: null,
          resources: [monkDeflectAttacksFocusResource()],
          unitFeatures: [{ unit }],
          characterUnitRefs: [
            reactionModifierUnitRefWithProfile(
              unit.id,
              ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
            ),
          ],
        }),
      ],
    });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks Reaction window.");
    }
    const choice = reactionModifierChoice(
      setup.result.snapshot.pendingReaction!.choices,
      unit.id,
      "attackDamageReduction",
    );
    const afterReaction = resolveBattleReaction({
      state: setup.result.state,
      fill: reactionDecisionFill(
        findHole(setup.result.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: unit.id,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 10)],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected attack damage roll.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const awaitingRedirect = resolveBattleSubject({
      state: afterReaction.state,
      subject: setup.subject,
      fills: [...setup.prefixFills, damageRollFill(damage, 6)],
    });

    expect(awaitingRedirect).toMatchObject({
      tag: "needsHoles",
      holes: [
        { kind: "targetChoice", label: "Deflect Attacks redirect target" },
        {
          kind: "savingThrowOutcome",
          label: "Deflect Attacks Dexterity saving throw",
        },
        { kind: "rolledDice", label: "Deflect Attacks redirected damage" },
      ],
    });
  });

  test("Deflect Attacks does not redirect when Resistance alone lowers reduced damage to 0", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const rage = barbarianRageUnit();
    const state = startBattleRight({
      battleId: battleId("battle-deflect-attacks-redirect-pre-resistance"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Raging Monk",
          initiative: 20,
          classLevels: [
            { className: "monk", level: 3 },
            { className: "barbarian", level: 1 },
          ],
          attack: null,
          resources: [monkDeflectAttacksFocusResource(), rageResource()],
          unitFeatures: [{ unit }, { unit: rage }],
          characterUnitRefs: [
            reactionModifierUnitRefWithProfile(
              unit.id,
              ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
            ),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
        resistantSkeletonCreatureInit({ initiative: 5 }),
      ],
    });
    const raging = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "barbarian_rage",
        },
        fills: [],
      }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: raging.state, actorId: fighterId }),
    ).state;
    const setup = goblinScimitarHitReactionSetup(goblinTurn);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks Reaction window.");
    }
    const choice = reactionModifierChoice(
      setup.result.snapshot.pendingReaction!.choices,
      unit.id,
      "attackDamageReduction",
    );
    const afterReaction = resolveBattleReaction({
      state: setup.result.state,
      fill: reactionDecisionFill(
        findHole(setup.result.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: unit.id,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 4)],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected attack damage roll.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const resolved = resolveBattleSubject({
      state: afterReaction.state,
      subject: setup.subject,
      fills: [...setup.prefixFills, damageRollFill(damage, 6)],
    });

    if (resolved.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${resolved.tag}.`);
    }
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(12));
    const monk = resolved.state.combatants.get(fighterId);
    if (monk?.origin.kind !== "character") {
      throw new Error("Expected character Monk.");
    }
    expect(
      monk.origin.resources.find(
        (resource) => resource.unit.id === "monk_deflect_attacks",
      )?.usesRemaining,
    ).toBe(3);
  });

  test("Deflect Attacks spends a Focus Point and deals same-type redirected damage on a failed save", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const state = startBattleRight({
      battleId: battleId("battle-deflect-attacks-redirect-damage"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        resistantSkeletonCreatureInit({ initiative: 15 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 10,
          classLevels: [{ className: "monk", level: 3 }],
          attack: null,
          resources: [monkDeflectAttacksFocusResource()],
          unitFeatures: [{ unit }],
          characterUnitRefs: [
            reactionModifierUnitRefWithProfile(
              unit.id,
              ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
            ),
          ],
        }),
      ],
    });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks Reaction window.");
    }
    const choice = reactionModifierChoice(
      setup.result.snapshot.pendingReaction!.choices,
      unit.id,
      "attackDamageReduction",
    );
    const afterReaction = resolveBattleReaction({
      state: setup.result.state,
      fill: reactionDecisionFill(
        findHole(setup.result.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: unit.id,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 10)],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected attack damage roll.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const awaitingRedirect = resolveBattleSubject({
      state: afterReaction.state,
      subject: setup.subject,
      fills: [...setup.prefixFills, damageRollFill(damage, 6)],
    });
    if (awaitingRedirect.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks redirect holes.");
    }
    const redirectTarget = findHole(awaitingRedirect.holes, "targetChoice");
    const redirectSave = findHole(awaitingRedirect.holes, "savingThrowOutcome");
    const redirectDamage = findHole(awaitingRedirect.holes, "rolledDice");
    const redirectSaveFill = savingThrowOutcomeFill(redirectSave, [
      { targetId: skeletonId, succeeded: false },
    ]);
    expect("area" in redirectSaveFill.value).toBe(false);
    const resolved = resolveBattleSubject({
      state: awaitingRedirect.state,
      subject: setup.subject,
      fills: [
        ...setup.prefixFills,
        damageRollFill(damage, 6),
        targetFill(redirectTarget, skeletonId, [
          {
            kind: "meleeRedirectTargetWithin5Feet",
            sourceId: fighterId,
            targetId: skeletonId,
          },
        ]),
        redirectSaveFill,
        damageRollFillWithGroups(redirectDamage, [[5, 5]]),
      ],
    });

    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(12));
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(8));
    const monk = resolved.state.combatants.get(fighterId);
    if (monk?.origin.kind !== "character") {
      throw new Error("Expected character Monk.");
    }
    expect(monk.origin.resources[0]?.usesRemaining).toBe(2);
  });

  test("Deflect Attacks rejects redirected damage dice outside the Martial Arts die", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const state = startBattleRight({
      battleId: battleId("battle-deflect-attacks-redirect-damage-invalid"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        resistantSkeletonCreatureInit({ initiative: 15 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 10,
          classLevels: [{ className: "monk", level: 3 }],
          attack: null,
          resources: [monkDeflectAttacksFocusResource()],
          unitFeatures: [{ unit }],
          characterUnitRefs: [
            reactionModifierUnitRefWithProfile(
              unit.id,
              ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
            ),
          ],
        }),
      ],
    });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks Reaction window.");
    }
    const choice = reactionModifierChoice(
      setup.result.snapshot.pendingReaction!.choices,
      unit.id,
      "attackDamageReduction",
    );
    const afterReaction = resolveBattleReaction({
      state: setup.result.state,
      fill: reactionDecisionFill(
        findHole(setup.result.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: unit.id,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 10)],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected attack damage roll.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const awaitingRedirect = resolveBattleSubject({
      state: afterReaction.state,
      subject: setup.subject,
      fills: [...setup.prefixFills, damageRollFill(damage, 6)],
    });
    if (awaitingRedirect.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks redirect holes.");
    }
    const rejected = resolveBattleSubject({
      state: awaitingRedirect.state,
      subject: setup.subject,
      fills: [
        ...setup.prefixFills,
        damageRollFill(damage, 6),
        targetFill(
          findHole(awaitingRedirect.holes, "targetChoice"),
          skeletonId,
          [
            {
              kind: "meleeRedirectTargetWithin5Feet",
              sourceId: fighterId,
              targetId: skeletonId,
            },
          ],
        ),
        savingThrowOutcomeFill(
          findHole(awaitingRedirect.holes, "savingThrowOutcome"),
          [{ targetId: skeletonId, succeeded: false }],
        ),
        damageRollFillWithGroups(
          findHole(awaitingRedirect.holes, "rolledDice"),
          [[99, 99]],
        ),
      ],
    });

    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Attack damage reduction redirect damage must match its projected dice.",
    });
  });

  test("Deflect Attacks successful redirected save spends Focus and applies no redirected damage", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const state = startBattleRight({
      battleId: battleId("battle-deflect-attacks-redirect-save-success"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        resistantSkeletonCreatureInit({ initiative: 15 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 10,
          classLevels: [{ className: "monk", level: 3 }],
          attack: null,
          resources: [monkDeflectAttacksFocusResource()],
          unitFeatures: [{ unit }],
          characterUnitRefs: [
            reactionModifierUnitRefWithProfile(
              unit.id,
              ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
            ),
          ],
        }),
      ],
    });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks Reaction window.");
    }
    const choice = reactionModifierChoice(
      setup.result.snapshot.pendingReaction!.choices,
      unit.id,
      "attackDamageReduction",
    );
    const afterReaction = resolveBattleReaction({
      state: setup.result.state,
      fill: reactionDecisionFill(
        findHole(setup.result.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: unit.id,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 10)],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected attack damage roll.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const awaitingRedirect = resolveBattleSubject({
      state: afterReaction.state,
      subject: setup.subject,
      fills: [...setup.prefixFills, damageRollFill(damage, 6)],
    });
    if (awaitingRedirect.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks redirect holes.");
    }
    const resolved = resolveBattleSubject({
      state: awaitingRedirect.state,
      subject: setup.subject,
      fills: [
        ...setup.prefixFills,
        damageRollFill(damage, 6),
        targetFill(
          findHole(awaitingRedirect.holes, "targetChoice"),
          skeletonId,
          [
            {
              kind: "meleeRedirectTargetWithin5Feet",
              sourceId: fighterId,
              targetId: skeletonId,
            },
          ],
        ),
        savingThrowOutcomeFill(
          findHole(awaitingRedirect.holes, "savingThrowOutcome"),
          [{ targetId: skeletonId, succeeded: true }],
        ),
        damageRollFillWithGroups(
          findHole(awaitingRedirect.holes, "rolledDice"),
          [[5, 5]],
        ),
      ],
    });

    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(12));
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(
      state.combatants.get(skeletonId)?.hp,
    );
    const monk = resolved.state.combatants.get(fighterId);
    if (monk?.origin.kind !== "character") {
      throw new Error("Expected character Monk.");
    }
    expect(monk.origin.resources[0]?.usesRemaining).toBe(2);
  });

  test("Deflect Attacks rejects redirect targets without the required attack-kind spatial fact", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const state = startBattleRight({
      battleId: battleId("battle-deflect-attacks-redirect-target-invalid"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 10,
          classLevels: [{ className: "monk", level: 3 }],
          attack: null,
          resources: [monkDeflectAttacksFocusResource()],
          unitFeatures: [{ unit }],
          characterUnitRefs: [
            reactionModifierUnitRefWithProfile(
              unit.id,
              ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
            ),
          ],
        }),
      ],
    });
    const subject = goblinAttackSubject("Shortbow");
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(
      state,
      target,
      subject,
      fighterId,
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks Reaction window.");
    }
    const choice = reactionModifierChoice(
      awaitingReaction.snapshot.pendingReaction!.choices,
      unit.id,
      "attackDamageReduction",
    );
    const afterReaction = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        findHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: unit.id,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 10)],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected shortbow damage roll.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const awaitingRedirect = resolveBattleSubject({
      state: afterReaction.state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
        damageRollFill(damage, 6),
      ],
    });
    if (awaitingRedirect.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks redirect holes.");
    }
    const rejected = resolveBattleSubject({
      state: awaitingRedirect.state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
        damageRollFill(damage, 6),
        targetFill(findHole(awaitingRedirect.holes, "targetChoice"), goblinId, [
          {
            kind: "meleeRedirectTargetWithin5Feet",
            sourceId: fighterId,
            targetId: goblinId,
          },
        ]),
        savingThrowOutcomeFill(
          findHole(awaitingRedirect.holes, "savingThrowOutcome"),
          [{ targetId: goblinId, succeeded: false }],
        ),
        damageRollFillWithGroups(
          findHole(awaitingRedirect.holes, "rolledDice"),
          [[5, 5]],
        ),
      ],
    });

    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Attack damage reduction redirect target is not eligible.",
    });
  });

  test("Cutting Words attack-roll reduction can turn a hit into a miss and ignores stale damage fills", () => {
    const cuttingWordsAttackOnly = cuttingWordsAttackOnlyUnit();
    const state = startBattleRight({
      battleId: battleId("battle-cutting-words-attack-roll"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 10,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [cuttingWordsResource({ unit: cuttingWordsAttackOnly })],
          unitFeatures: [{ unit: cuttingWordsAttackOnly }],
          characterUnitRefs: [
            reactionModifierUnitRef(cuttingWordsAttackOnly.id),
          ],
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, fighterId)],
      }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(attackRoll, { total: 12, naturalD20: 10 }),
        {
          kind: "rolledDice",
          holeId: holeId("battle:attack:damage-result:1d6+2-slashing"),
          value: [rolledDiceGroup([6])],
        },
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Cutting Words attack-hit Reaction window.");
    }
    const choice = reactionModifierChoice(
      awaitingReaction.snapshot.pendingReaction!.choices,
      cuttingWordsAttackOnly.id,
      "attackRollReduction",
    );
    const resolved = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        findHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: cuttingWordsAttackOnly.id,
            modifierKind: "attackRollReduction",
            fills: [
              {
                kind: "rolledDice",
                holeId: choice.initialHoles[0]!.holeId,
                value: [rolledDiceGroup([3])],
              },
            ],
          },
        },
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        combatants: expect.any(Map),
      },
    });
    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(12));
    const bard = resolved.state.combatants.get(fighterId);
    if (bard?.origin.kind !== "character") {
      throw new Error("Expected character Bard.");
    }
    expect(bard.origin.resources[0]?.usesRemaining).toBe(0);
  });

  test("Cutting Words damage-roll reduction applies before target damage adjustments", () => {
    const cuttingWordsDamageOnly = cuttingWordsDamageOnlyUnit();
    const state = startBattleRight({
      battleId: battleId("battle-cutting-words-damage-roll"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        resistantSkeletonCreatureInit({ initiative: 10 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 5,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [cuttingWordsResource({ unit: cuttingWordsDamageOnly })],
          characterUnitRefs: [
            reactionModifierUnitRef(cuttingWordsDamageOnly.id),
          ],
        }),
      ],
    });
    const subject = goblinAttackSubject("Scimitar");
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(
      state,
      target,
      subject,
      skeletonId,
    );
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      attackRoll,
      { total: 20, naturalD20: 15 },
      subject,
      skeletonId,
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, skeletonId),
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
        damageRollFill(damage, 6),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Cutting Words damage Reaction window.");
    }
    const choice = reactionModifierChoice(
      awaitingReaction.snapshot.pendingReaction!.choices,
      cuttingWordsDamageOnly.id,
      "damageRollReduction",
    );
    const resolved = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        findHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: cuttingWordsDamageOnly.id,
            modifierKind: "damageRollReduction",
            fills: [
              {
                kind: "rolledDice",
                holeId: choice.initialHoles[0]!.holeId,
                value: [rolledDiceGroup([3])],
              },
            ],
          },
        },
      ),
    });

    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(11));
  });

  test("Cutting Words ability-check reduction can turn a success into a failure", () => {
    const cuttingWords = cuttingWordsUnit();
    const state = startBattleRight({
      battleId: battleId("battle-cutting-words-ability-check-converted"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 10,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [cuttingWordsResource({ unit: cuttingWords })],
          unitFeatures: [{ unit: cuttingWords }],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });

    const resolved = resolveSuccessfulAbilityCheckReactionReduction({
      state,
      reactorId: fighterId,
      unitId: cuttingWords.id,
      abilityCheck: {
        actorId: goblinId,
        ability: "str",
        originalTotal: 15,
        dc: difficultyClass(14),
        targetSpatialFacts: [
          {
            kind: "reactionRollOrDamageReductionTargetWithinRange",
            reactorId: fighterId,
            targetId: goblinId,
            unitId: cuttingWords.id,
            rangeFeet: movementFeet(60),
          },
        ],
      },
      reductionRoll: 3,
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      abilityCheckReduction: {
        reducedTotal: 12,
        reducedSucceeded: false,
      },
    });
    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    const bard = resolved.state.combatants.get(fighterId);
    if (bard?.origin.kind !== "character") {
      throw new Error("Expected character Bard.");
    }
    expect(bard.reactionAvailable).toBe(false);
    expect(bard.origin.resources[0]?.usesRemaining).toBe(0);
  });

  test("Cutting Words ability-check reduction can leave a success successful", () => {
    const cuttingWords = cuttingWordsUnit();
    const state = startBattleRight({
      battleId: battleId("battle-cutting-words-ability-check-still-success"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 10,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [cuttingWordsResource({ unit: cuttingWords })],
          unitFeatures: [{ unit: cuttingWords }],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });

    const resolved = resolveSuccessfulAbilityCheckReactionReduction({
      state,
      reactorId: fighterId,
      unitId: cuttingWords.id,
      abilityCheck: {
        actorId: goblinId,
        ability: "dex",
        skillOrToolLabel: "Stealth",
        originalTotal: 19,
        dc: difficultyClass(14),
        targetSpatialFacts: [
          {
            kind: "reactionRollOrDamageReductionTargetWithinRange",
            reactorId: fighterId,
            targetId: goblinId,
            unitId: cuttingWords.id,
            rangeFeet: movementFeet(60),
          },
        ],
      },
      reductionRoll: 3,
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      abilityCheckReduction: {
        reducedTotal: 16,
        reducedSucceeded: true,
      },
    });
    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    const bard = resolved.state.combatants.get(fighterId);
    if (bard?.origin.kind !== "character") {
      throw new Error("Expected character Bard.");
    }
    expect(bard.reactionAvailable).toBe(false);
    expect(bard.origin.resources[0]?.usesRemaining).toBe(0);
  });

  test("Cutting Words ability-check reduction rejects pre-reduction failures and missing range facts", () => {
    const cuttingWords = cuttingWordsUnit();
    const state = startBattleRight({
      battleId: battleId("battle-cutting-words-ability-check-rejected"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 10,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [cuttingWordsResource({ unit: cuttingWords })],
          unitFeatures: [{ unit: cuttingWords }],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });

    expect(
      resolveSuccessfulAbilityCheckReactionReduction({
        state,
        reactorId: fighterId,
        unitId: cuttingWords.id,
        abilityCheck: {
          actorId: goblinId,
          ability: "str",
          originalTotal: 13,
          dc: difficultyClass(14),
          targetSpatialFacts: [
            {
              kind: "reactionRollOrDamageReductionTargetWithinRange",
              reactorId: fighterId,
              targetId: goblinId,
              unitId: cuttingWords.id,
              rangeFeet: movementFeet(60),
            },
          ],
        },
        reductionRoll: 3,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Cutting Words requires an already-successful ability check.",
    });

    expect(
      resolveSuccessfulAbilityCheckReactionReduction({
        state,
        reactorId: fighterId,
        unitId: cuttingWords.id,
        abilityCheck: {
          actorId: goblinId,
          ability: "str",
          originalTotal: 15,
          dc: difficultyClass(14),
          targetSpatialFacts: [],
        },
        reductionRoll: 3,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Cutting Words requires the creature to be within range.",
    });
  });

  test("Cutting Words ability-check reduction requires Bardic Inspiration uses", () => {
    const cuttingWords = cuttingWordsUnit();
    const abilityCheck = {
      actorId: goblinId,
      ability: "str" as const,
      originalTotal: 15,
      dc: difficultyClass(14),
      targetSpatialFacts: [
        {
          kind: "reactionRollOrDamageReductionTargetWithinRange" as const,
          reactorId: fighterId,
          targetId: goblinId,
          unitId: cuttingWords.id,
          rangeFeet: movementFeet(60),
        },
      ],
    };
    const stateWithoutResource = startBattleRight({
      battleId: battleId("battle-cutting-words-ability-check-no-resource"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 10,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [],
          unitFeatures: [{ unit: cuttingWords }],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });

    expect(
      resolveSuccessfulAbilityCheckReactionReduction({
        state: stateWithoutResource,
        reactorId: fighterId,
        unitId: cuttingWords.id,
        abilityCheck,
        reductionRoll: 3,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Ability-check Reaction reduction is no longer available.",
    });

    const stateWithoutUses = startBattleRight({
      battleId: battleId("battle-cutting-words-ability-check-zero-resource"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 10,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [
            cuttingWordsResource({ unit: cuttingWords, usesRemaining: 0 }),
          ],
          unitFeatures: [{ unit: cuttingWords }],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });

    expect(
      resolveSuccessfulAbilityCheckReactionReduction({
        state: stateWithoutUses,
        reactorId: fighterId,
        unitId: cuttingWords.id,
        abilityCheck,
        reductionRoll: 3,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Ability-check Reaction reduction is no longer available.",
    });
  });

  test("Bardic Inspiration grants one one-hour d6 die and spends Bonus Action and Charisma-derived use", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({ charismaModifier: 3 });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [bardicInspirationTargetFill(target, goblinId)],
      }),
    );

    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(
      resolved.state.combatants.get(fighterId)?.origin.kind === "character"
        ? resolved.state.combatants.get(fighterId)?.origin.resources
        : [],
    ).toEqual([
      expect.objectContaining({
        unit: expect.objectContaining({ id: bardicInspiration.id }),
        usesRemaining: resourceCount(2),
      }),
    ]);
    expect(resolved.state.combatants.get(goblinId)?.activeEffects).toEqual([
      {
        kind: "bardicInspirationDie",
        sourceUnitId: bardicInspiration.id,
        sourceCombatantId: fighterId,
        dieSize: 6,
        expiresAt: {
          kind: "duration",
          durationTicks: requireElapsedHours(1),
        },
      },
    ]);
  });

  test("Bardic Inspiration use count observes Charisma modifier minimum", () => {
    const highCharisma = bardicInspirationBattle({ charismaModifier: 4 });
    const lowCharisma = bardicInspirationBattle({ charismaModifier: -1 });

    expect(characterResourceUses(highCharisma, fighterId)).toEqual([
      resourceCount(4),
    ]);
    expect(characterResourceUses(lowCharisma, fighterId)).toEqual([
      resourceCount(1),
    ]);
  });

  test("ability-modifier battle resources require a supported battle profile", () => {
    expect(
      characterBattleResourceSupportedForUnit(bardicInspirationUnit()),
    ).toBe(true);
    expect(characterBattleResourceSupportedForUnit(cuttingWordsUnit())).toBe(
      true,
    );
    expect(
      characterBattleResourceSupportedForUnit(
        unsupportedAbilityModifierActivationUnit(),
      ),
    ).toBe(false);
  });

  test("Bardic Inspiration rejects missing range facts before spending resources", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({ charismaModifier: 3 });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, goblinId, [])],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Bardic Inspiration target must be within 60 feet.",
    });
    expect(characterResourceUses(state, fighterId)).toEqual([resourceCount(3)]);
  });

  test("Bardic Inspiration accepts hearing when the target cannot see the Bard", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({
      charismaModifier: 1,
      bardHidden: true,
    });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );

    expect(
      requireResolved(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            bardicInspirationTargetFill(target, goblinId, {
              canHear: true,
            }),
          ],
        }),
      ).state.combatants.get(goblinId)?.activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "bardicInspirationDie",
        sourceUnitId: bardicInspiration.id,
      }),
    ]);
  });

  test("Bardic Inspiration rejects a Blinded target without a hearing fact", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({
      charismaModifier: 1,
      targetConditions: ["blinded"],
    });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [bardicInspirationTargetFill(target, goblinId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Bardic Inspiration target must be able to see or hear the Bard.",
    });
  });

  test("Bardic Inspiration accepts Blinded hearing but rejects Deafened hearing", () => {
    const bardicInspiration = bardicInspirationUnit();
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const blinded = bardicInspirationBattle({
      charismaModifier: 1,
      targetConditions: ["blinded"],
    });
    const blindedTarget = findHole(
      findAct(blinded, subject).initialHoles,
      "targetChoice",
    );

    expect(
      requireResolved(
        resolveBattleSubject({
          state: blinded,
          subject,
          fills: [
            bardicInspirationTargetFill(blindedTarget, goblinId, {
              canHear: true,
            }),
          ],
        }),
      ).state.combatants.get(goblinId)?.activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "bardicInspirationDie",
        sourceUnitId: bardicInspiration.id,
      }),
    ]);

    const blindedAndDeafened = bardicInspirationBattle({
      charismaModifier: 1,
      targetConditions: ["blinded", "deafened"],
    });
    const blindedAndDeafenedTarget = findHole(
      findAct(blindedAndDeafened, subject).initialHoles,
      "targetChoice",
    );

    expect(
      resolveBattleSubject({
        state: blindedAndDeafened,
        subject,
        fills: [
          bardicInspirationTargetFill(blindedAndDeafenedTarget, goblinId, {
            canHear: true,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Bardic Inspiration target must be able to see or hear the Bard.",
    });
  });

  test("Bardic Inspiration rejects an Unconscious target even with a hearing fact", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({
      charismaModifier: 1,
      targetConditions: ["unconscious"],
    });
    const subject = bardicInspirationSubject(bardicInspiration.id);

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          bardicInspirationTargetFill(
            bardicInspirationStaleTargetHole(),
            goblinId,
            {
              canHear: true,
            },
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Bardic Inspiration target must be able to see or hear the Bard.",
    });
  });

  test("Bardic Inspiration discovery omits Unconscious targets", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({
      charismaModifier: 1,
      targetConditions: ["unconscious"],
    });
    const subject = bardicInspirationSubject(bardicInspiration.id);

    expect(
      discoverBattleActs(state).some((act) =>
        sameBattleSubject(act.subject, subject),
      ),
    ).toBe(false);
  });

  test("Bardic Inspiration rejects targets that can neither see nor hear the Bard", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({
      charismaModifier: 1,
      bardHidden: true,
    });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [bardicInspirationTargetFill(target, goblinId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Bardic Inspiration target must be able to see or hear the Bard.",
    });
  });

  test("Bardic Inspiration rejects a second die on the same target", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({ charismaModifier: 3 });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );
    const granted = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [bardicInspirationTargetFill(target, goblinId)],
      }),
    ).state;

    expect(
      resolveBattleSubject({
        state: {
          ...granted,
          currentTurnResources: {
            ...granted.currentTurnResources,
            currentHasBonusAction: true,
          },
        },
        subject,
        fills: [bardicInspirationTargetFill(target, goblinId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Bardic Inspiration target already has a Bardic Inspiration die.",
    });
  });

  test("Bardic Inspiration discovery omits targets already holding a die", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({ charismaModifier: 3 });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );
    const granted = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [bardicInspirationTargetFill(target, goblinId)],
      }),
    ).state;

    expect(
      discoverBattleActs({
        ...granted,
        currentTurnResources: {
          ...granted.currentTurnResources,
          currentHasBonusAction: true,
        },
      }).some((act) => sameBattleSubject(act.subject, subject)),
    ).toBe(false);
  });

  test("Bardic Inspiration failed D20 Test use can turn attack roll, saving throw, and ability check failures into success", () => {
    const attackRollState = grantBardicInspirationToGoblin();
    const attackRoll = requireBardicInspirationD20TestResolved(
      resolveBardicInspirationFailedD20Test({
        state: attackRollState,
        d20Test: {
          kind: "attackRoll",
          actorId: goblinId,
          attackRoll: { total: 14, naturalD20: DieRollResult(10) },
          armorClass: armorClass(15),
        },
        bardicInspirationRoll: 2,
      }),
    );

    expect(attackRoll.bardicInspirationD20Test).toEqual({
      boostedTotal: 16,
      boostedSucceeded: true,
    });
    expect(combatantHasBardicInspirationDie(attackRoll.state, goblinId)).toBe(
      false,
    );

    const savingThrow = requireBardicInspirationD20TestResolved(
      resolveBardicInspirationFailedD20Test({
        state: grantBardicInspirationToGoblin(),
        d20Test: {
          kind: "savingThrow",
          actorId: goblinId,
          ability: "wis",
          originalTotal: 12,
          dc: difficultyClass(15),
        },
        bardicInspirationRoll: 3,
      }),
    );

    expect(savingThrow.bardicInspirationD20Test).toEqual({
      boostedTotal: 15,
      boostedSucceeded: true,
    });
    expect(combatantHasBardicInspirationDie(savingThrow.state, goblinId)).toBe(
      false,
    );

    const abilityCheck = requireBardicInspirationD20TestResolved(
      resolveBardicInspirationFailedD20Test({
        state: grantBardicInspirationToGoblin(),
        d20Test: {
          kind: "abilityCheck",
          actorId: goblinId,
          ability: "dex",
          skillOrToolLabel: "Stealth",
          originalTotal: 13,
          dc: difficultyClass(15),
        },
        bardicInspirationRoll: 2,
      }),
    );

    expect(abilityCheck.bardicInspirationD20Test).toEqual({
      boostedTotal: 15,
      boostedSucceeded: true,
    });
    expect(combatantHasBardicInspirationDie(abilityCheck.state, goblinId)).toBe(
      false,
    );
  });

  test("Bardic Inspiration failed D20 Test use expends the die even when the boosted result still fails", () => {
    const result = requireBardicInspirationD20TestResolved(
      resolveBardicInspirationFailedD20Test({
        state: grantBardicInspirationToGoblin(),
        d20Test: {
          kind: "savingThrow",
          actorId: goblinId,
          ability: "con",
          originalTotal: 9,
          dc: difficultyClass(15),
        },
        bardicInspirationRoll: 4,
      }),
    );

    expect(result.bardicInspirationD20Test).toEqual({
      boostedTotal: 13,
      boostedSucceeded: false,
    });
    expect(combatantHasBardicInspirationDie(result.state, goblinId)).toBe(
      false,
    );
  });

  test("Bardic Inspiration failed D20 Test use rejects successes, invalid die rolls, and double spend", () => {
    const state = grantBardicInspirationToGoblin();

    expect(
      resolveBardicInspirationFailedD20Test({
        state,
        d20Test: {
          kind: "abilityCheck",
          actorId: goblinId,
          ability: "str",
          originalTotal: 15,
          dc: difficultyClass(15),
        },
        bardicInspirationRoll: 1,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Bardic Inspiration requires an already-failed D20 Test.",
    });
    expect(combatantHasBardicInspirationDie(state, goblinId)).toBe(true);

    expect(
      resolveBardicInspirationFailedD20Test({
        state,
        d20Test: {
          kind: "savingThrow",
          actorId: goblinId,
          ability: "dex",
          originalTotal: 12,
          dc: difficultyClass(15),
        },
        bardicInspirationRoll: 7,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Bardic Inspiration roll must be a 1d6 result.",
    });
    expect(combatantHasBardicInspirationDie(state, goblinId)).toBe(true);

    const spent = requireBardicInspirationD20TestResolved(
      resolveBardicInspirationFailedD20Test({
        state,
        d20Test: {
          kind: "attackRoll",
          actorId: goblinId,
          attackRoll: { total: 12, naturalD20: DieRollResult(10) },
          armorClass: armorClass(15),
        },
        bardicInspirationRoll: 1,
      }),
    );

    expect(
      resolveBardicInspirationFailedD20Test({
        state: spent.state,
        d20Test: {
          kind: "attackRoll",
          actorId: goblinId,
          attackRoll: { total: 12, naturalD20: DieRollResult(10) },
          armorClass: armorClass(15),
        },
        bardicInspirationRoll: 1,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Bardic Inspiration is no longer available for the D20 Test actor.",
    });
  });

  test("Uncanny Dodge is chosen when the attack hits and halves later attack damage", () => {
    const state = goblinAttacksReactionModifierCharacter({
      unit: uncannyDodgeUnit(),
      className: "rogue",
      level: 5,
      unitId: "rogue_uncanny_dodge",
    });
    const resolved = resolveGoblinScimitarHitReduction({
      state,
      unitId: "rogue_uncanny_dodge",
      damageRoll: 6,
    });

    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(8));
    expect(resolved.state.combatants.get(fighterId)?.reactionAvailable).toBe(
      false,
    );
  });

  test("pending hit-triggered damage reductions block unrelated subjects until damage is filled", () => {
    const state = goblinAttacksReactionModifierCharacter({
      unit: uncannyDodgeUnit(),
      className: "rogue",
      level: 5,
      unitId: "rogue_uncanny_dodge",
    });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected attack-hit Reaction window.");
    }
    const afterReaction = resolveBattleReaction({
      state: setup.result.state,
      fill: reactionDecisionFill(
        findHole(setup.result.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: "rogue_uncanny_dodge",
            modifierKind: "attackDamageReduction",
            fills: [],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected pending damage roll.");
    }

    const blocked = resolveBattleSubject({
      state: afterReaction.state,
      subject: {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "endTurn",
      },
      fills: [],
    });

    expect(blocked).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Uncanny Dodge can reduce visible ranged attack damage beyond 5 feet", () => {
    const state = startBattleRight({
      battleId: battleId("battle-uncanny-dodge-ranged"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Rogue",
          initiative: 10,
          classLevels: [{ className: "rogue", level: 5 }],
          attack: null,
          unitFeatures: [{ unit: uncannyDodgeUnit() }],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
      ],
    });
    const subject = goblinAttackSubject("Shortbow");
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(
      state,
      target,
      subject,
      fighterId,
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected attack-hit Reaction window.");
    }

    expect(awaitingReaction.snapshot.pendingReaction!.choices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "reactionRollOrDamageReduction",
          choice: expect.objectContaining({
            kind: "attackDamageReduction",
            unitId: "rogue_uncanny_dodge",
          }),
        }),
      ]),
    );
  });

  test("Incapacitated combatants cannot use reaction roll or damage reductions", () => {
    const base = goblinAttacksReactionModifierCharacter({
      unit: uncannyDodgeUnit(),
      className: "rogue",
      level: 5,
      unitId: "rogue_uncanny_dodge",
    });
    const fighter = base.combatants.get(fighterId)!;
    const state = {
      ...base,
      combatants: new Map(base.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          fighter,
          applyCondition(fighter.conditions, "incapacitated"),
        ),
      ),
    } satisfies BattleState;
    const setup = goblinScimitarHitReactionSetup(state);

    expect(setup.result).toMatchObject({ tag: "needsHoles" });
    expect(setup.result.snapshot.pendingReaction).toBeNull();
  });

  test("Bardic Inspiration reduction rolls must be one valid class die", () => {
    const cuttingWordsAttackOnly = cuttingWordsAttackOnlyUnit();
    const state = goblinAttacksReactionModifierCharacter({
      unit: cuttingWordsAttackOnly,
      className: "bard",
      level: 3,
      unitId: cuttingWordsAttackOnly.id,
      resources: [cuttingWordsResource({ unit: cuttingWordsAttackOnly })],
    });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected Cutting Words attack-hit Reaction window.");
    }
    const choice = reactionModifierChoice(
      setup.result.snapshot.pendingReaction!.choices,
      cuttingWordsAttackOnly.id,
      "attackRollReduction",
    );

    const resolved = resolveBattleReaction({
      state: setup.result.state,
      fill: reactionDecisionFill(
        findHole(setup.result.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: cuttingWordsAttackOnly.id,
            modifierKind: "attackRollReduction",
            fills: [
              {
                kind: "rolledDice",
                holeId: choice.initialHoles[0]!.holeId,
                value: [rolledDiceGroup([7])],
              },
            ],
          },
        },
      ),
    });

    expect(resolved).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Reaction modifier roll must provide one valid reduction die result.",
    });
  });

  test("hit and damage reduction reactions use their separate RAW windows", () => {
    const cuttingWordsDamageOnly = cuttingWordsDamageOnlyUnit();
    const state = startBattleRight({
      battleId: battleId("battle-single-scalar-damage-modifier-choice"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Rogue Bard",
          initiative: 10,
          classLevels: [
            { className: "rogue", level: 5 },
            { className: "bard", level: 3 },
          ],
          attack: null,
          resources: [cuttingWordsResource({ unit: cuttingWordsDamageOnly })],
          unitFeatures: [uncannyDodgeUnit(), cuttingWordsDamageOnly].map(
            (unit) => ({ unit }),
          ),
          characterUnitRefs: [
            reactionModifierUnitRef("rogue_uncanny_dodge"),
            reactionModifierUnitRef(cuttingWordsDamageOnly.id),
          ],
        }),
      ],
    });
    const hitReaction = goblinScimitarHitReactionSetup(state);
    if (hitReaction.result.tag !== "needsHoles") {
      throw new Error("Expected attack-hit Reaction window.");
    }

    const hitModifierChoices =
      hitReaction.result.snapshot.pendingReaction!.choices.filter(
        (choice) => choice.kind === "reactionRollOrDamageReduction",
      );
    expect(hitModifierChoices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "reactionRollOrDamageReduction",
          choice: expect.objectContaining({ kind: "attackDamageReduction" }),
        }),
      ]),
    );
    expect(hitModifierChoices).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "reactionRollOrDamageReduction",
          choice: expect.objectContaining({ kind: "damageRollReduction" }),
        }),
      ]),
    );
    const beforeDamage = resolveBattleReaction({
      state: hitReaction.result.state,
      fill: reactionDecisionFill(
        findHole(hitReaction.result.holes, "reactionDecision"),
        { kind: "decline", reactorId: fighterId },
      ),
    });
    if (beforeDamage.tag !== "needsHoles") {
      throw new Error("Expected damage roll after declining hit reaction.");
    }
    const damage = requireHole(beforeDamage, "rolledDice");
    const awaitingDamageReaction = resolveBattleSubject({
      state: beforeDamage.state,
      subject: hitReaction.subject,
      fills: [
        ...hitReaction.prefixFills,
        {
          kind: "rolledDice",
          holeId: damage.holeId,
          value: [rolledDiceGroup([6])],
        },
      ],
    });
    if (awaitingDamageReaction.tag !== "needsHoles") {
      throw new Error("Expected attack-damage Reaction window.");
    }
    const damageModifierChoices =
      awaitingDamageReaction.snapshot.pendingReaction!.choices.filter(
        (choice) => choice.kind === "reactionRollOrDamageReduction",
      );
    expect(damageModifierChoices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "reactionRollOrDamageReduction",
          choice: expect.objectContaining({ kind: "damageRollReduction" }),
        }),
      ]),
    );
  });

  test("attack damage scalar reductions apply proportionally to mixed damage entries", () => {
    const state = goblinAttacksReactionModifierCharacter({
      unit: uncannyDodgeUnit(),
      className: "rogue",
      level: 5,
      unitId: "rogue_uncanny_dodge",
    });
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
    };
    const frame: BattleReactionFrame = {
      trigger: "attackDamage",
      eligibleReactors: [fighterId],
      offeredReactors: [],
      choices: [
        {
          kind: "reactionRollOrDamageReduction",
          reactorId: fighterId,
          choice: {
            kind: "damageRollReduction",
            unitId: "test_cutting_words",
            label: "Cutting Words",
            reduction: {
              kind: "rolled",
              dice: 1,
              flatModifier: 0,
              dieSize: 6,
              spends: { resourceUnitId: "test_cutting_words", amount: 1 },
            },
          },
          initialHoles: [
            {
              kind: "rolledDice",
              holeId: holeId("battle:reaction:modifier-roll"),
              holeInstanceKey: holeInstanceKey("battle:reaction:modifier-roll"),
              label: "Cutting Words reduction roll",
              unitFeature: {
                unitId: "test_cutting_words",
                label: "Cutting Words",
                modifierKind: "damageRollReduction",
              },
            },
          ],
        },
      ],
      continuation: {
        kind: "attackDamage",
        subject,
        attackerId: goblinId,
        targetId: fighterId,
        damageEvent: {
          kind: "rolledDamage",
          damageRollByType: [
            { damageType: "slashing", amount: 5 },
            { damageType: "poison", amount: 4 },
          ],
        },
        fills: [],
        deathFailuresAtZeroHp: 1,
        damageDisposition: { kind: "ordinaryDamage" },
        attackDamageRiders: [],
      },
    };

    const pendingState = {
      ...state,
      interruptStack: [{ kind: "reaction", frame }],
    } satisfies BattleState;
    const decision = snapshotBattle(pendingState).pendingReaction?.decisionHole;
    if (decision === undefined) {
      throw new Error("Expected pending Reaction decision.");
    }
    const resolved = resolveBattleReaction({
      state: pendingState,
      fill: reactionDecisionFill(decision, {
        kind: "resolve",
        reactorId: fighterId,
        choice: {
          kind: "reactionRollOrDamageReduction",
          unitId: "test_cutting_words",
          modifierKind: "damageRollReduction",
          fills: [
            {
              kind: "rolledDice",
              holeId: holeId("battle:reaction:modifier-roll"),
              value: [rolledDiceGroup([3])] as const,
            },
          ],
        },
      }),
    });

    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(6));
  });

  test("attack-damage reduction rejects impossible stat-block reactor choices", () => {
    const state = startBattleRight({
      battleId: battleId("battle-attack-damage-reduction-before-vulnerability"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        skeletonCreatureInit({ initiative: 10 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 5,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
        }),
      ],
    });
    const subject: Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "attack" }
    > = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
      statBlockSection: "actions",
    };
    const frame: BattleReactionFrame = {
      trigger: "attackDamage",
      eligibleReactors: [skeletonId, fighterId],
      offeredReactors: [],
      choices: [
        {
          kind: "reactionRollOrDamageReduction",
          reactorId: skeletonId,
          choice: {
            kind: "attackDamageReduction",
            unitId: "test_uncanny_dodge",
            label: "Uncanny Dodge",
            reduction: { kind: "halfDamage" },
          },
          initialHoles: [],
        },
        {
          kind: "reactionRollOrDamageReduction",
          reactorId: fighterId,
          choice: {
            kind: "damageRollReduction",
            unitId: "test_cutting_words",
            label: "Cutting Words",
            reduction: {
              kind: "rolled",
              dice: 1,
              flatModifier: 0,
              dieSize: 6,
              spends: { resourceUnitId: "test_cutting_words", amount: 1 },
            },
          },
          initialHoles: [],
        },
      ],
      continuation: {
        kind: "attackDamage",
        subject,
        attackerId: goblinId,
        targetId: skeletonId,
        damageEvent: {
          kind: "rolledDamage",
          damageRollByType: [{ damageType: "bludgeoning", amount: 5 }],
        },
        fills: [],
        deathFailuresAtZeroHp: 1,
        damageDisposition: { kind: "ordinaryDamage" },
        attackDamageRiders: [],
      },
    };
    const pendingState = {
      ...state,
      interruptStack: [{ kind: "reaction", frame }],
    } satisfies BattleState;
    const decision = snapshotBattle(pendingState).pendingReaction?.decisionHole;
    if (decision === undefined) {
      throw new Error("Expected pending Reaction decision.");
    }

    const resolved = resolveBattleReaction({
      state: pendingState,
      fill: reactionDecisionFill(decision, {
        kind: "resolve",
        reactorId: skeletonId,
        choice: {
          kind: "reactionRollOrDamageReduction",
          unitId: "test_uncanny_dodge",
          modifierKind: "attackDamageReduction",
          fills: [],
        },
      }),
    });

    expect(resolved).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Attack damage reductions must be chosen when the attack roll hits.",
    });
  });

  test("reaction-modified attack damage requests Concentration after the final damage amount", () => {
    const base = goblinAttacksReactionModifierCharacter({
      unit: uncannyDodgeUnit(),
      className: "rogue",
      level: 5,
      unitId: "rogue_uncanny_dodge",
    });
    const fighter = base.combatants.get(fighterId)!;
    const state = {
      ...base,
      combatants: new Map(base.combatants).set(fighterId, {
        ...fighter,
        concentration: {
          sourceSpellId: "readied_acid_splash",
          effectKind: "readiedSpell",
        },
      }),
    } satisfies BattleState;
    const afterReaction = resolveGoblinScimitarHitReduction({
      state,
      unitId: "rogue_uncanny_dodge",
      damageRoll: 6,
    });
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
    };
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected post-reaction Concentration save.");
    }
    expect(afterReaction.snapshot.pendingReaction).toBeNull();
    const concentration = findHole(
      afterReaction.holes,
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({ damageAmount: 4, dc: 10 });

    const resolved = resolveBattleSubject({
      state: afterReaction.state,
      subject,
      fills: [concentrationSavingThrowFill(concentration, false)],
    });

    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(8));
    expect(resolved.state.combatants.get(fighterId)?.concentration).toBeNull();
  });

  test("pending attack-damage Concentration save blocks unrelated subjects", () => {
    const base = goblinAttacksReactionModifierCharacter({
      unit: uncannyDodgeUnit(),
      className: "rogue",
      level: 5,
      unitId: "rogue_uncanny_dodge",
    });
    const fighter = base.combatants.get(fighterId)!;
    const state = {
      ...base,
      combatants: new Map(base.combatants).set(fighterId, {
        ...fighter,
        concentration: {
          sourceSpellId: "readied_acid_splash",
          effectKind: "readiedSpell",
        },
      }),
    } satisfies BattleState;
    const afterReaction = resolveGoblinScimitarHitReduction({
      state,
      unitId: "rogue_uncanny_dodge",
      damageRoll: 6,
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected post-reaction Concentration save.");
    }

    const blocked = resolveBattleSubject({
      state: afterReaction.state,
      subject: {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "endTurn",
      },
      fills: [],
    });

    expect(blocked).toMatchObject({ tag: "invalid", reason: "staleSubject" });
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
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "acid_splash",
            "saveGatedDamage",
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "acid_splash",
            "saveGatedDamage",
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "acid_splash",
            "saveGatedDamage",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "acid_splash",
            "saveGatedDamage",
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "acid_splash",
            "saveGatedDamage",
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
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
      "spellTargetAllocation",
    );
    expect(magicMissileTarget).toMatchObject({
      label: "Magic Missile target allocation",
      allocationCount: 3,
      choices: [wizardId, skeletonId],
    });
    expect(
      resolveBattleSubject({
        state: magicMissileState,
        subject: magicSubject("magic_missile"),
        fills: [
          spellTargetAllocationFill(magicMissileTarget, [
            { targetId: wizardId, count: 0 },
            { targetId: skeletonId, count: 3 },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell target allocation entries must assign a positive integer count.",
    });
    const magicMissileDamage = requireHole(
      resolveBattleSubject({
        state: magicMissileState,
        subject: magicSubject("magic_missile"),
        fills: [
          spellTargetAllocationFill(magicMissileTarget, [
            { targetId: skeletonId, count: 3 },
          ]),
        ],
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
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [skeletonId],
              },
              outcomes: [{ targetId: skeletonId, succeeded: false }],
            },
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const magicMissile = resolveBattleSubject({
      state: magicMissileState,
      subject: magicSubject("magic_missile"),
      fills: [
        spellTargetAllocationFill(magicMissileTarget, [
          { targetId: skeletonId, count: 3 },
        ]),
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
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(requireResolved(magicMissile), wizardId)).toBe(
      1,
    );

    const healingWordState = startBattleRight({
      battleId: battleId("battle-healing-word-bonus-action"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Healer",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          initiative: 10,
          currentHp: 4,
        }),
      ],
    });
    const healingWordAct = discoverBattleActs(healingWordState).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "healing_word",
    );
    expect(healingWordAct).toMatchObject({
      subject: {
        tag: "bonusActionSpell",
        actorId: wizardId,
        invocation: spellSlotInvocationRef(
          "healing_word",
          1,
          "directHitPointRestoration",
        ),
        mode: { tag: "cast" },
      },
      initialHoles: [{ kind: "targetChoice" }],
    });
    if (healingWordAct === undefined) {
      throw new Error("Expected Healing Word Bonus Action spell act.");
    }
    const healingWordTarget = findHole(
      healingWordAct.initialHoles,
      "targetChoice",
    );
    const healingWordRoll = requireHole(
      resolveBattleSubject({
        state: healingWordState,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, fighterId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: fighterId,
              spellId: "healing_word",
            },
          ]),
        ],
      }),
      "rolledDice",
    );
    const healingWord = requireResolved(
      resolveBattleSubject({
        state: healingWordState,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, fighterId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: fighterId,
              spellId: "healing_word",
            },
          ]),
          damageRollFillWithGroups(healingWordRoll, [[4, 3]]),
        ],
      }),
    );
    expect(healingWord.snapshot.turn.bonusActionAvailable).toBe(false);
    expect(healingWord.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: fighterId, hp: 12 }),
      ]),
    );
    expect(expendedLevelOneSlots(healingWord, wizardId)).toBe(1);
    expect(
      resolveBattleSubject({
        state: healingWordState,
        subject: {
          tag: "bonusActionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "cast" },
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });

    const slotTurnState = startBattleRight({
      battleId: battleId("battle-one-slot-spell-per-turn"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Healer",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [
              spellRecord("magic_missile"),
              spellRecord("healing_word"),
            ],
          }),
        }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          initiative: 10,
          currentHp: 10,
        }),
      ],
    });
    const slotTurnMissileTarget = requireHole(
      resolveBattleSubject({
        state: slotTurnState,
        subject: magicSubject("magic_missile"),
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const slotTurnMissileDamage = requireHole(
      resolveBattleSubject({
        state: slotTurnState,
        subject: magicSubject("magic_missile"),
        fills: [
          spellTargetAllocationFill(slotTurnMissileTarget, [
            { targetId: skeletonId, count: 3 },
          ]),
        ],
      }),
      "rolledDice",
    );
    const afterSlotSpell = requireResolved(
      resolveBattleSubject({
        state: slotTurnState,
        subject: magicSubject("magic_missile"),
        fills: [
          spellTargetAllocationFill(slotTurnMissileTarget, [
            { targetId: skeletonId, count: 3 },
          ]),
          damageRollFillWithGroups(slotTurnMissileDamage, [[1, 1, 1]]),
        ],
      }),
    ).state;
    expect(afterSlotSpell.currentTurnResources).toMatchObject({
      currentHasBonusAction: true,
      commandHalt: null,
      spellSlotExpendedThisTurn: true,
    });
    expect(
      discoverBattleActs(afterSlotSpell).map((act) => act.subject),
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tag: "bonusActionSpell",
          spellId: "healing_word",
        }),
      ]),
    );
    expect(
      resolveBattleSubject({
        state: afterSlotSpell,
        subject: {
          tag: "bonusActionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "healing_word",
            1,
            "directHitPointRestoration",
          ),
          mode: { tag: "cast" },
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "This turn has already expended a Spell Slot.",
    });

    const healingWordReactionState =
      fighterTurnWithReadiedRayAndHealer("spellCast");
    const healingWordReactionAct = discoverBattleActs(
      healingWordReactionState,
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "healing_word",
    );
    if (healingWordReactionAct === undefined) {
      throw new Error("Expected Healing Word Bonus Action spell act.");
    }
    const reactionTarget = findHole(
      healingWordReactionAct.initialHoles,
      "targetChoice",
    );
    const reactionTargetFill = targetFill(reactionTarget, fighterId, [
      {
        kind: "spellTarget",
        casterId: fighterId,
        targetId: fighterId,
        spellId: "healing_word",
      },
    ]);
    const awaitingSpellCastReaction = resolveBattleSubject({
      state: healingWordReactionState,
      subject: healingWordReactionAct.subject,
      fills: [reactionTargetFill],
    });
    expect(awaitingSpellCastReaction).toMatchObject({
      tag: "needsHoles",
      subject: healingWordReactionAct.subject,
      holes: [{ kind: "reactionDecision", trigger: "spellCast" }],
      snapshot: {
        pendingReaction: {
          trigger: "spellCast",
        },
      },
    });
    if (awaitingSpellCastReaction.tag !== "needsHoles") {
      throw new Error(
        `Expected needsHoles, got ${awaitingSpellCastReaction.tag}.`,
      );
    }
    const afterDecline = resolveBattleReaction({
      state: awaitingSpellCastReaction.state,
      fill: reactionDecisionFill(
        awaitingSpellCastReaction.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: wizardId },
      ),
    });
    expect(afterDecline).toMatchObject({
      tag: "needsHoles",
      subject: healingWordReactionAct.subject,
      holes: [{ kind: "rolledDice", label: "Healing Word healing (2d4+3)" }],
      snapshot: { pendingReaction: null },
    });

    const levelTwoState = startBattleRight({
      battleId: battleId("battle-magic-missile-split-targets"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            spellSlots: [
              { spellLevel: 1, count: 2 },
              { spellLevel: 2, count: 1 },
            ],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Fighter",
          initiative: 15,
          attack: null,
          currentHp: 20,
          maxHp: 20,
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    expect(discoverBattleActs(levelTwoState).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            2,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "cast" },
        },
      ]),
    );
    const levelTwoSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef(
        "magic_missile",
        2,
        "repeatedDamageAllocation",
      ),
      mode: { tag: "cast" },
    };
    const levelTwoTargets = requireHole(
      resolveBattleSubject({
        state: levelTwoState,
        subject: levelTwoSubject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    expect(levelTwoTargets).toMatchObject({ allocationCount: 4 });
    const levelTwoDamage = requireHole(
      resolveBattleSubject({
        state: levelTwoState,
        subject: levelTwoSubject,
        fills: [
          spellTargetAllocationFill(levelTwoTargets, [
            { targetId: skeletonId, count: 3 },
            { targetId: fighterId, count: 1 },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(levelTwoDamage).toMatchObject({
      label: "Magic Missile damage (4d4+4-force)",
    });
    const splitMagicMissile = resolveBattleSubject({
      state: levelTwoState,
      subject: levelTwoSubject,
      fills: [
        spellTargetAllocationFill(levelTwoTargets, [
          { targetId: skeletonId, count: 3 },
          { targetId: fighterId, count: 1 },
        ]),
        damageRollFillWithGroups(levelTwoDamage, [[1, 1, 1], [4]]),
      ],
    });
    expect(splitMagicMissile).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: fighterId, hp: 15 },
          { combatantId: skeletonId, hp: 7 },
        ],
      },
    });

    const secondWizardReady = requireResolved(
      resolveBattleSubject({
        state: startBattleRight({
          battleId: battleId("battle-second-wizard-ready-after-damage"),
          combatants: [
            characterSeed({
              combatantId: secondWizardId,
              displayName: "Second Wizard",
              initiative: 20,
              attack: null,
              spellcasting: wizardSpellcasting(),
            }),
            skeletonCreatureInit({ initiative: 10 }),
          ],
        }),
        subject: {
          tag: "actionSpell",
          actorId: secondWizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        fills: [],
      }),
    ).state;
    const readiedRay = secondWizardReady.readiedSpells.get(secondWizardId);
    const concentratingSecondWizard =
      secondWizardReady.combatants.get(secondWizardId);
    if (readiedRay === undefined || concentratingSecondWizard === undefined) {
      throw new Error("Expected Second Wizard to hold a Readied Spell.");
    }
    const afterDamageSequenceState = {
      ...levelTwoState,
      combatants: new Map(levelTwoState.combatants).set(
        secondWizardId,
        concentratingSecondWizard,
      ),
      readiedSpells: new Map([[secondWizardId, readiedRay]]),
    } satisfies BattleState;
    const splitWithAfterDamageReaction = resolveBattleSubject({
      state: afterDamageSequenceState,
      subject: levelTwoSubject,
      fills: [
        spellTargetAllocationFill(levelTwoTargets, [
          { targetId: skeletonId, count: 3 },
          { targetId: fighterId, count: 1 },
        ]),
        damageRollFillWithGroups(levelTwoDamage, [[1, 1, 1], [4]]),
      ],
    });
    expect(splitWithAfterDamageReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "afterDamage" }],
      snapshot: {
        pendingReaction: {
          trigger: "afterDamage",
        },
      },
    });
    if (splitWithAfterDamageReaction.tag !== "needsHoles") {
      throw new Error("Expected first after-damage reaction window.");
    }
    const secondAfterDamageReaction = resolveBattleReaction({
      state: splitWithAfterDamageReaction.state,
      fill: reactionDecisionFill(
        splitWithAfterDamageReaction.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: secondWizardId },
      ),
    });
    expect(secondAfterDamageReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "afterDamage" }],
      snapshot: {
        pendingReaction: {
          trigger: "afterDamage",
        },
      },
    });

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
          },
        ],
      },
    });
    expect(requireResolved(ray).state.combatants.get(skeletonId)).toMatchObject(
      {
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
    );
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
        combatants: [{ combatantId: wizardId }, { combatantId: skeletonId }],
      },
    });
    expect(
      requireResolved(refreshedRay).state.combatants.get(skeletonId),
    ).toMatchObject({
      activeEffects: [
        expect.objectContaining({
          sourceSpellId: "ray_of_frost",
          sourceCombatantId: wizardId,
        }),
      ],
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
        combatants: [{ combatantId: wizardId }, { combatantId: skeletonId }],
      },
    });
    if (afterSkeletonTurn.tag !== "resolved") {
      throw new Error("Expected Ray of Frost cleanup turn to resolve.");
    }
    expect(
      afterSkeletonTurn.state.combatants.get(skeletonId)?.activeEffects,
    ).toEqual([]);

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
        turn: { actionResources: [] },
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 13 },
        ],
      },
    });
    expect(expendedLevelOneSlots(requireResolved(rayMiss), wizardId)).toBe(0);
  });

  test("prepared spell-slot damage can use spell attack or save-gated invocation refs", () => {
    const state = startBattleRight({
      battleId: battleId("battle-prepared-damage-invocation-refs"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [slotAttackDamageSpell(), slotSaveDamageSpell()],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });

    expect(discoverBattleActs(state).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "slot_attack_damage",
            1,
            "spellAttackDamage",
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "slot_save_damage",
            1,
            "saveGatedDamage",
          ),
          mode: { tag: "cast" },
        },
      ]),
    );

    const attackSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef(
        "slot_attack_damage",
        1,
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    };
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "slot_attack_damage",
            },
          ]),
        ],
      }),
      "attackRoll",
    );
    const attackDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "slot_attack_damage",
            },
          ]),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(attackDamage).toMatchObject({
      label: "Slot Attack Damage damage (2d8-cold)",
    });
    const afterAttackSpell = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "slot_attack_damage",
            },
          ]),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(attackDamage, [[4, 4]]),
        ],
      }),
    );
    expect(expendedLevelOneSlots(afterAttackSpell, wizardId)).toBe(1);
    expect(
      afterAttackSpell.state.combatants.get(skeletonId)?.activeEffects,
    ).toHaveLength(0);

    const saveSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef(
        "slot_save_damage",
        1,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    };
    const saveOutcome = requireHole(
      resolveBattleSubject({ state, subject: saveSubject, fills: [] }),
      "savingThrowOutcome",
    );
    const saveDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: saveSubject,
        fills: [
          savingThrowOutcomeFill(saveOutcome, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(saveDamage).toMatchObject({
      label: "Slot Save Damage damage (2d6-acid)",
    });
    const afterSaveSpell = requireResolved(
      resolveBattleSubject({
        state,
        subject: saveSubject,
        fills: [
          savingThrowOutcomeFill(saveOutcome, [
            { targetId: skeletonId, succeeded: false },
          ]),
          damageRollFillWithGroups(saveDamage, [[3, 3]]),
        ],
      }),
    );
    expect(expendedLevelOneSlots(afterSaveSpell, wizardId)).toBe(1);
  });

  test("spell attack riders use SRD-specific expiration anchors", () => {
    const state = startBattleRight({
      battleId: battleId("battle-spell-rider-anchors"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("shocking_grasp")],
            preparedSpells: [
              spellRecord("guiding_bolt"),
              spellRecord("ray_of_sickness"),
            ],
            spellSlots: [{ spellLevel: 1, count: 3 }],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Fighter",
          initiative: 15,
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });

    const sickTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("ray_of_sickness"),
        fills: [],
      }),
      "targetChoice",
    );
    const sickRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("ray_of_sickness"),
        fills: [targetFill(sickTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const sickDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(sickTarget, skeletonId),
          attackRollFill(sickRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const sick = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(sickTarget, skeletonId),
          attackRollFill(sickRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(sickDamage, [[1, 1]]),
        ],
      }),
    );
    expect(sick.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ poisoned: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "spellCondition",
          condition: "poisoned",
          expiresAt: {
            kind: "endOfTurn",
            combatantId: wizardId,
            round: 2,
          },
        }),
      ],
    });
    const afterWizard = endTurn({ state: sick.state, actorId: wizardId });
    const afterFighter =
      afterWizard.tag === "resolved"
        ? endTurn({ state: afterWizard.state, actorId: fighterId })
        : afterWizard;
    const afterSkeleton =
      afterFighter.tag === "resolved"
        ? endTurn({ state: afterFighter.state, actorId: skeletonId })
        : afterFighter;
    const afterNextWizard =
      afterSkeleton.tag === "resolved"
        ? endTurn({ state: afterSkeleton.state, actorId: wizardId })
        : afterSkeleton;
    expect(afterNextWizard).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: fighterId },
          {
            combatantId: skeletonId,
            conditions: expect.not.arrayContaining(["poisoned"]),
          },
        ],
      },
    });

    const graspTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("shocking_grasp"),
        fills: [],
      }),
      "targetChoice",
    );
    const graspRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("shocking_grasp"),
        fills: [targetFill(graspTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const graspDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("shocking_grasp"),
        fills: [
          targetFill(graspTarget, skeletonId),
          attackRollFill(graspRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const grasp = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("shocking_grasp"),
        fills: [
          targetFill(graspTarget, skeletonId),
          attackRollFill(graspRoll, { total: 18, naturalD20: 12 }),
          damageRollFill(graspDamage, 1),
        ],
      }),
    );
    expect(
      grasp.state.combatants.get(skeletonId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "opportunityAttackDenied",
        expiresAt: { kind: "startOfTurn", combatantId: skeletonId },
      }),
    );
    const fighterTurn = requireResolved(
      endTurn({ state: grasp.state, actorId: wizardId }),
    ).state;
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const move = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject: moveSubject,
        fills: [],
      }),
      "movement",
    );
    expect(
      resolveBattleSubject({
        state: fighterTurn,
        subject: moveSubject,
        fills: [
          movementFill(move, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [
              { reactorId: skeletonId, attackName: "Longsword" },
            ],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: { pendingReaction: null },
    });
  });

  test("spell condition riders preserve unrelated pre-existing conditions", () => {
    const poisoned = startBattleRight({
      battleId: battleId("battle-spell-condition-rider-source"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("ray_of_sickness")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          conditions: ["poisoned"],
        }),
      ],
    });
    const target = requireHole(
      resolveBattleSubject({
        state: poisoned,
        subject: magicSubject("ray_of_sickness"),
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: poisoned,
        subject: magicSubject("ray_of_sickness"),
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: poisoned,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(roll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state: poisoned,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(roll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[1, 1]]),
        ],
      }),
    );
    const skeletonTurn = requireResolved(
      endTurn({ state: resolved.state, actorId: wizardId }),
    ).state;
    const nextWizard = endTurn({ state: skeletonTurn, actorId: skeletonId });
    if (nextWizard.tag !== "resolved") {
      throw new Error("Expected turn sequence to resolve.");
    }
    const refreshRoll = requireHole(
      resolveBattleSubject({
        state: nextWizard.state,
        subject: magicSubject("ray_of_sickness"),
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const refreshDamage = requireHole(
      resolveBattleSubject({
        state: nextWizard.state,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(refreshRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const refreshed = requireResolved(
      resolveBattleSubject({
        state: nextWizard.state,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(refreshRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(refreshDamage, [[1, 1]]),
        ],
      }),
    );
    const nextSkeletonAfterRefresh = requireResolved(
      endTurn({ state: refreshed.state, actorId: wizardId }),
    ).state;
    const nextWizardAfterRefresh = requireResolved(
      endTurn({ state: nextSkeletonAfterRefresh, actorId: skeletonId }),
    ).state;
    const expired = endTurn({
      state: nextWizardAfterRefresh,
      actorId: wizardId,
    });
    expect(expired).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          {
            combatantId: skeletonId,
            conditions: expect.arrayContaining(["poisoned"]),
          },
        ],
      },
    });
  });

  test("overlapping spell condition riders preserve a pre-existing non-spell condition source", () => {
    const poisoned = startBattleRight({
      battleId: battleId("battle-spell-condition-rider-overlap-source"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("ray_of_sickness")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Second Wizard",
          initiative: 15,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("ray_of_sickness")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          conditions: ["poisoned"],
        }),
      ],
    });

    const castRayOfSickness = (state: BattleState, actorId: CombatantId) => {
      const spatialFacts = [
        {
          kind: "spellTarget" as const,
          casterId: actorId,
          targetId: skeletonId,
          spellId: "ray_of_sickness",
        },
      ];
      const subject: BattleSubject = {
        tag: "actionSpell",
        actorId,
        invocation: spellSlotInvocationRef(
          "ray_of_sickness",
          1,
          "spellAttackDamage",
        ),
        mode: { tag: "cast" },
      };
      const target = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      );
      const roll = requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [targetFill(target, skeletonId, spatialFacts)],
        }),
        "attackRoll",
      );
      const damage = requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetFill(target, skeletonId, spatialFacts),
            attackRollFill(roll, { total: 18, naturalD20: 12 }),
          ],
        }),
        "rolledDice",
      );
      return requireResolved(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetFill(target, skeletonId, spatialFacts),
            attackRollFill(roll, { total: 18, naturalD20: 12 }),
            damageRollFillWithGroups(damage, [[1, 1]]),
          ],
        }),
      ).state;
    };

    const firstSpell = castRayOfSickness(poisoned, wizardId);
    const secondWizardTurn = requireResolved(
      endTurn({ state: firstSpell, actorId: wizardId }),
    ).state;
    const secondSpell = castRayOfSickness(secondWizardTurn, secondWizardId);
    const skeletonTurn = requireResolved(
      endTurn({ state: secondSpell, actorId: secondWizardId }),
    ).state;
    const nextWizardTurn = requireResolved(
      endTurn({ state: skeletonTurn, actorId: skeletonId }),
    ).state;
    const firstSpellExpired = requireResolved(
      endTurn({ state: nextWizardTurn, actorId: wizardId }),
    ).state;
    expect(firstSpellExpired.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ poisoned: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "spellCondition",
          sourceCombatantId: secondWizardId,
          condition: "poisoned",
        }),
      ],
    });

    const allSpellSourcesExpired = endTurn({
      state: firstSpellExpired,
      actorId: secondWizardId,
    });
    expect(allSpellSourcesExpired).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: secondWizardId },
          {
            combatantId: skeletonId,
            conditions: expect.arrayContaining(["poisoned"]),
          },
        ],
      },
    });
    expect(
      requireResolved(allSpellSourcesExpired).state.combatants.get(skeletonId)
        ?.activeEffects,
    ).not.toContainEqual(
      expect.objectContaining({
        kind: "spellCondition",
        condition: "poisoned",
      }),
    );
  });

  test("one-shot spell attack-roll riders affect only matching attack rolls", () => {
    const state = startBattleRight({
      battleId: battleId("battle-spell-one-shot-riders"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("vicious_mockery")],
            preparedSpells: [spellRecord("guiding_bolt")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Fighter",
          initiative: 15,
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });
    const guidingTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("guiding_bolt"),
        fills: [],
      }),
      "targetChoice",
    );
    const guidingRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("guiding_bolt"),
        fills: [targetFill(guidingTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const guidingDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("guiding_bolt"),
        fills: [
          targetFill(guidingTarget, skeletonId),
          attackRollFill(guidingRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const guided = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("guiding_bolt"),
        fills: [
          targetFill(guidingTarget, skeletonId),
          attackRollFill(guidingRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(guidingDamage, [[1, 1, 1, 1]]),
        ],
      }),
    );
    const fighterTurn = endTurn({ state: guided.state, actorId: wizardId });
    if (fighterTurn.tag !== "resolved") {
      throw new Error("Expected Fighter turn after Guiding Bolt.");
    }
    const fighterAttack: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Longsword",
    };
    const fighterTarget = requireHole(
      resolveBattleSubject({
        state: fighterTurn.state,
        subject: fighterAttack,
        fills: [],
      }),
      "targetChoice",
    );
    const fighterRoll = requireHole(
      resolveBattleSubject({
        state: fighterTurn.state,
        subject: fighterAttack,
        fills: [attackTargetFill(fighterTarget, fighterId, skeletonId)],
      }),
      "attackRoll",
    );
    expect(fighterRoll).toMatchObject({ rollMode: "advantage" });
    const consumed = resolveBattleSubject({
      state: fighterTurn.state,
      subject: fighterAttack,
      fills: [
        attackTargetFill(fighterTarget, fighterId, skeletonId),
        attackRollFill(fighterRoll, {
          total: 8,
          naturalD20: 4,
          rollMode: "advantage",
        }),
      ],
    });
    expect(consumed).toMatchObject({ tag: "resolved" });
    expect(
      requireResolved(consumed).state.combatants.get(skeletonId)?.activeEffects,
    ).toEqual([]);

    const mockeryTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("vicious_mockery"),
        fills: [],
      }),
      "targetChoice",
    );
    const save = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("vicious_mockery"),
        fills: [targetFill(mockeryTarget, skeletonId)],
      }),
      "savingThrowOutcome",
    );
    const mockeryDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("vicious_mockery"),
        fills: [
          targetFill(mockeryTarget, skeletonId),
          savingThrowOutcomeFill(save, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    const mocked = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("vicious_mockery"),
        fills: [
          targetFill(mockeryTarget, skeletonId),
          savingThrowOutcomeFill(save, [
            { targetId: skeletonId, succeeded: false },
          ]),
          damageRollFill(mockeryDamage, 1),
        ],
      }),
    );
    const afterWizard = endTurn({ state: mocked.state, actorId: wizardId });
    const afterFighter =
      afterWizard.tag === "resolved"
        ? endTurn({ state: afterWizard.state, actorId: fighterId })
        : afterWizard;
    if (afterFighter.tag !== "resolved") {
      throw new Error("Expected Skeleton turn after Vicious Mockery.");
    }
    const skeletonAttack: BattleSubject = {
      tag: "action",
      actorId: skeletonId,
      action: "attack",
      attackName: "Longsword",
    };
    const skeletonTarget = requireHole(
      resolveBattleSubject({
        state: afterFighter.state,
        subject: skeletonAttack,
        fills: [],
      }),
      "targetChoice",
    );
    const skeletonRoll = requireHole(
      resolveBattleSubject({
        state: afterFighter.state,
        subject: skeletonAttack,
        fills: [
          attackTargetFill(skeletonTarget, skeletonId, wizardId, "Longsword"),
        ],
      }),
      "attackRoll",
    );
    expect(skeletonRoll).toMatchObject({ rollMode: "disadvantage" });
  });

  test("readied spell attack misses consume next-attack spell riders", () => {
    const state = startBattleRight({
      battleId: battleId("battle-readied-spell-miss-consumes-rider"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Cleric",
          initiative: 30,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("guiding_bolt")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("ray_of_frost")],
          }),
        }),
        statBlockCreatureInit({
          combatantId: goblinId,
          initiative: 10,
        }),
      ],
    });
    const guidingSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      invocation: spellSlotInvocationRef(
        "guiding_bolt",
        1,
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject: guidingSubject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject: guidingSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject: guidingSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const guided = requireResolved(
      resolveBattleSubject({
        state,
        subject: guidingSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[1, 1, 1, 1]]),
        ],
      }),
    ).state;
    const wizardTurn = requireResolved(
      endTurn({ state: guided, actorId: fighterId }),
    ).state;
    const readied = requireResolved(
      resolveBattleSubject({
        state: wizardTurn,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        fills: [],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: readied, actorId: wizardId }),
    ).state;
    const releaseSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "releaseReadiedSpell",
      readiedSpellCasterId: wizardId,
    };
    const releaseTarget = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: releaseSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const releaseRoll = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: releaseSubject,
        fills: [targetFill(releaseTarget, goblinId)],
      }),
      "attackRoll",
    );
    expect(releaseRoll).toMatchObject({ rollMode: "advantage" });
    const missed = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject: releaseSubject,
        fills: [
          targetFill(releaseTarget, goblinId),
          attackRollFill(releaseRoll, {
            total: 1,
            naturalD20: 1,
            rollMode: "advantage",
          }),
        ],
      }),
    );

    expect(missed.state.combatants.get(goblinId)?.activeEffects).toEqual([]);
  });

  test("spell damage invocation holes reject contradictory access and resource pairs", () => {
    const spell = slotAttackDamageSpell();
    const baseHole = {
      kind: "rolledDice",
      holeId: holeId("battle:test:invalid-spell-damage"),
      holeInstanceKey: holeInstanceKey("battle:test:invalid-spell-damage"),
      label: "Invalid spell damage",
      critical: false,
      spell: {
        procedure: "spellAttackDamage",
        spell,
        targeting: { kind: "singleCombatant" },
        damage: { expr: { dice: 1, dieSize: 8 }, damageType: "cold" },
        rangeFeet: movementFeet(60),
        attackKind: "ranged_spell_attack",
        attackBonus: attackBonus(5),
        postDamageRiders: [],
      },
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "classCantrip" },
            resource: { tag: "spellSlot", slotLevel: 1 },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "prepared" },
            resource: { tag: "none" },
          },
        }),
      ),
    ).toBe(true);
  });

  test("persistent armor invocation holes reject contradictory Armor of Shadows resource pairs", () => {
    const baseHole = {
      kind: "spellTargetList",
      holeId: holeId("battle:test:invalid-persistent-armor"),
      holeInstanceKey: holeInstanceKey("battle:test:invalid-persistent-armor"),
      label: "Invalid persistent armor target",
      minTargets: 1,
      maxTargets: 1,
      choices: [fighterId],
      requiresTableSpatialFact: true,
      spell: {
        procedure: "persistentArmorEffect",
        spell: { id: "mage_armor" },
        rangeFeet: movementFeet(0),
        activeEffect: { tag: "mageArmor" },
      },
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "prepared" },
            resource: { tag: "none" },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "armorOfShadows" },
            resource: { tag: "spellSlot", slotLevel: 1 },
          },
        }),
      ),
    ).toBe(true);
  });

  test("spell saving throw outcome codec preserves target roll modes", () => {
    const hole = {
      kind: "savingThrowOutcome",
      holeId: holeId("battle:test:charm-person-save"),
      holeInstanceKey: holeInstanceKey("battle:test:charm-person-save"),
      label: "Charm Person Saving Throw outcomes",
      spell: {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: 1 },
        procedure: "saveGatedCondition",
        spell: { id: "charm_person" },
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
        targetCreatureTypes: ["humanoid"],
        effect: {
          condition: "charmed",
          expiresAt: {
            kind: "duration",
            durationTicks: { amount: 600 },
          },
          escape: { kind: "targetDamagedByCasterOrAlly" },
          turnStartDamage: null,
        },
        saveRollModeRule: { kind: "hostileTarget", mode: "advantage" },
        rangeFeet: movementFeet(30),
      },
      ability: "wis",
      dc: { kind: "caster_spell_save_dc" },
      areaChoices: [],
      targetRollModes: [{ targetId: goblinId, rollMode: "advantage" }],
    };

    const decoded = Schema.decodeUnknownEither(BattleHoleSchema)(hole);

    if (Either.isLeft(decoded)) {
      throw new Error(String(decoded.left));
    }
    expect(decoded.right).toMatchObject({
      kind: "savingThrowOutcome",
      targetRollModes: [{ targetId: goblinId, rollMode: "advantage" }],
    });
  });

  test("spell saving throw outcome codec rejects incomplete Grease area facts", () => {
    const invalidGreaseArea = {
      originAnchorId: wizardId,
      affectedTargetIds: [goblinId],
      kind: "greaseGroundArea",
    };
    const greaseInvocation = {
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: 1 },
      procedure: "greaseGroundHazard",
      spell: { id: "grease" },
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
      targeting: { kind: "pointOriginCube", sideFeet: movementFeet(10) },
      durationTicks: { amount: 10 },
      rangeFeet: movementFeet(60),
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          kind: "savingThrowOutcome",
          holeId: holeId("battle:test:invalid-grease-area-hole"),
          holeInstanceKey: holeInstanceKey(
            "battle:test:invalid-grease-area-hole",
          ),
          label: "Invalid Grease area facts",
          spell: greaseInvocation,
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          areaChoices: [invalidGreaseArea],
          targetRollModes: [],
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          kind: "savingThrowOutcome",
          holeId: "battle:test:invalid-grease-area-fill",
          value: {
            area: invalidGreaseArea,
            outcomes: [{ targetId: goblinId, succeeded: false }],
          },
        }),
      ),
    ).toBe(true);
  });

  test("spell-hosted weapon invocation holes reject non-weapon component attacks", () => {
    const baseHole = {
      kind: "attackRoll",
      holeId: holeId("battle:test:invalid-true-strike-component"),
      holeInstanceKey: holeInstanceKey(
        "battle:test:invalid-true-strike-component",
      ),
      label: "Invalid True Strike component attack",
      attackBonus: attackBonus(3),
      spell: {
        access: { tag: "classCantrip" },
        resource: { tag: "none" },
        procedure: "spellHostedWeaponAttack",
        spell: { id: "true_strike" },
        actionCost: "magicAction",
        componentWeapon: {
          itemId: "main:unarmed",
          attack: {
            kind: "unarmedStrike",
            effect: {
              kind: "damage",
              damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
            },
            attackAbility: "str",
            attackAbilityModifier: 0,
            attackBonus: 2,
            damageAbilityModifier: 0,
          },
        },
        spellcastingAbilityModifier: 3,
        damageTypeChoices: ["radiant", "bludgeoning"],
        bonusDamage: {
          expr: { dice: 1, dieSize: 6 },
          damageType: "radiant",
        },
      },
    };

    expect(
      Either.isLeft(Schema.decodeUnknownEither(BattleHoleSchema)(baseHole)),
    ).toBe(true);
  });

  test("prepared spell-slot damage supports only slot-axis linear scaling", () => {
    const state = startBattleRight({
      battleId: battleId("battle-prepared-damage-axis"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [
              slotAttackDamageSpell({ axis: "slot" }),
              slotAttackDamageSpell({
                id: "character_axis_attack_damage",
                name: "Character Axis Attack Damage",
                axis: "character",
              }),
            ],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const spellAttackSubjects = discoverBattleActs(state)
      .flatMap((act) =>
        act.subject.tag === "actionSpell" ||
        act.subject.tag === "bonusActionSpell"
          ? [act.subject.invocation]
          : [],
      )
      .filter(
        (invocation) =>
          invocation.procedure === "spellAttackDamage" &&
          invocation.tag === "spellSlot",
      )
      .map((invocation) => invocation.spellId);

    expect(spellAttackSubjects).toContain("slot_attack_damage");
    expect(spellAttackSubjects).not.toContain("character_axis_attack_damage");
  });

  test("cantrip damage uses character-tier scaling from the authored source", () => {
    const state = startBattleRight({
      battleId: battleId("battle-cantrip-scaling"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("ray_of_frost")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "ray_of_frost",
            },
          ]),
        ],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "ray_of_frost",
            },
          ]),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      label: "Ray of Frost damage (2d8-cold)",
    });
  });

  test("prepared spell-slot damage discovery summaries name Spell Slot casting", () => {
    const state = startBattleRight({
      battleId: battleId("battle-prepared-damage-summaries"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [slotAttackDamageSpell(), slotSaveDamageSpell()],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const acts = discoverBattleActs(state);

    expect(
      acts.find(
        (act) =>
          act.subject.tag === "actionSpell" &&
          act.subject.invocation.tag === "spellSlot" &&
          act.subject.invocation.spellId === "slot_attack_damage" &&
          act.subject.invocation.procedure === "spellAttackDamage",
      )?.summary,
    ).toBe("Cast Slot Attack Damage using a level 1 Spell Slot.");
    expect(
      acts.find(
        (act) =>
          act.subject.tag === "actionSpell" &&
          act.subject.invocation.tag === "spellSlot" &&
          act.subject.invocation.spellId === "slot_save_damage" &&
          act.subject.invocation.procedure === "saveGatedDamage",
      )?.summary,
    ).toBe(
      "Cast Slot Save Damage using a level 1 Spell Slot. Table-supplied affected targets make DEX Saving Throws.",
    );
  });

  test("Acid Splash support is gated to the authored 5-foot point-origin Sphere", () => {
    const unsupportedState = startBattleRight({
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
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
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
    const state = startBattleRight({
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
      invocation: spellSlotInvocationRef(
        "mage_armor",
        1,
        "persistentArmorEffect",
      ),
      mode: { tag: "cast" },
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
          },
          { combatantId: skeletonId },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(
      requireResolved(result).state.combatants.get(wizardId),
    ).toMatchObject({
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
    const state = startBattleRight({
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

  test("Armor of Shadows casts self-only Mage Armor without expending a Spell Slot", () => {
    const unarmoredDex = {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...defaultArmorClassState().abilityModifiers,
        dex: abilityModifier(2),
      },
    };
    const state = startBattleRight({
      battleId: battleId("battle-armor-of-shadows"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          armorClass: unarmoredDex,
          spellcasting: wizardSpellcasting({
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
            invocationSpellAccesses: [
              {
                tag: "armorOfShadowsMageArmor",
                spell: spellRecord("mage_armor"),
              },
            ],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = {
      tag: "actionSpell" as const,
      actorId: wizardId,
      invocation: armorOfShadowsSpellInvocationRef("mage_armor"),
      mode: { tag: "cast" as const },
    };
    const act = findAct(state, subject);
    const target = findHole(act.initialHoles, "targetChoice");
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }

    expect(act.summary).toBe("Cast Mage Armor using Armor of Shadows.");
    expect(target.choices).toEqual([wizardId]);
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, wizardId)],
      }),
    );
    const warlock = result.state.combatants.get(wizardId);

    expect(
      result.snapshot.combatants.find(
        (combatant) => combatant.combatantId === wizardId,
      ),
    ).toMatchObject({ armorClass: 15 });
    expect(result.snapshot.turn).toMatchObject({
      actionResources: [],
      spellSlotExpendedThisTurn: false,
    });
    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(warlock.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 0 },
    ]);
    expect(warlock.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellBaseArmorClass",
        sourceSpellId: "mage_armor",
        sourceCombatantId: wizardId,
        earlyEnds: [{ kind: "targetDonsArmor" }],
      }),
    ]);

    const recastState = {
      ...result.state,
      currentTurnResources: state.currentTurnResources,
    };
    const recast = requireResolved(
      resolveBattleSubject({
        state: recastState,
        subject,
        fills: [targetFill(target, wizardId)],
      }),
    );

    expect(
      recast.state.combatants
        .get(wizardId)
        ?.activeEffects.filter(
          (effect) =>
            effect.kind === "spellBaseArmorClass" &&
            effect.sourceSpellId === "mage_armor",
        ),
    ).toHaveLength(1);
  });

  test("Armor of Shadows Spell Access rejects non-Mage-Armor spell records", () => {
    const mageArmorWithWrongRuntimeId = {
      ...spellRecord("mage_armor"),
      id: "misidentified_mage_armor",
    };

    expect(
      startBattle({
        battleId: battleId("battle-armor-of-shadows-invalid-spell-access"),
        combatants: [
          characterSeed({
            combatantId: wizardId,
            displayName: "Warlock",
            initiative: 20,
            attack: null,
            spellcasting: wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
              invocationSpellAccesses: [
                {
                  tag: "armorOfShadowsMageArmor",
                  spell: mageArmorWithWrongRuntimeId,
                },
              ],
            }),
          }),
        ],
      }),
    ).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message: "Armor of Shadows Spell Access must grant Mage Armor.",
      }),
    );
  });

  test("Armor of Shadows rejects armored self before spending resources", () => {
    const armored = {
      ...defaultArmorClassState(),
      base: {
        kind: "armor" as const,
        category: "medium" as const,
        formula: { kind: "medium_dex_max_2" as const, base: 14 },
      },
    };
    const state = startBattleRight({
      battleId: battleId("battle-armor-of-shadows-armored-self"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Armored Warlock",
          initiative: 20,
          attack: null,
          armorClass: armored,
          spellcasting: wizardSpellcasting({
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
            invocationSpellAccesses: [
              {
                tag: "armorOfShadowsMageArmor",
                spell: spellRecord("mage_armor"),
              },
            ],
          }),
        }),
      ],
    });
    const subject = {
      tag: "actionSpell" as const,
      actorId: wizardId,
      invocation: armorOfShadowsSpellInvocationRef("mage_armor"),
      mode: { tag: "cast" as const },
    };
    expect(
      discoverBattleActs(state).some((candidate) =>
        sameBattleSubject(candidate.subject, subject),
      ),
    ).toBe(false);
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }

    expect(target.choices).toEqual([]);
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, wizardId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    const warlock = state.combatants.get(wizardId);
    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(warlock.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 0 },
    ]);
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
      { combatantId: wizardId, concentrating: false },
      { combatantId: skeletonId },
    ]);
    expect(broken.combatants.get(skeletonId)?.activeEffects).toEqual([]);
  });

  test("breaking ordinary concentration does not clear a non-owned readied spell entry", () => {
    const state = startBattleRight({
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
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
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
    const state = startBattleRight({
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
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "ready" as const, trigger: "spellCast" as const },
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
        readiedResponses: { spells: [] },
        combatants: [
          { combatantId: wizardId, hp: 7, concentrating: false },
          { combatantId: goblinId },
        ],
      },
    });
  });

  test("Eldritch Mind gives Advantage only to damage-triggered Concentration saves", () => {
    const state = startBattleRight({
      battleId: battleId("battle-eldritch-mind-concentration-save"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          invocationFeatures: [{ tag: "eldritchMind" }],
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell" as const,
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready" as const, trigger: "spellCast" as const },
        },
        fills: [],
      }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: readied.state, actorId: wizardId }),
    );
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
    const concentration = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: goblinAttackSubject("Scimitar"),
        fills: [
          targetFill(target, wizardId),
          attackRollFill(roll, { total: 14, naturalD20: 10 }),
          damageRollFill(damage, 3),
        ],
      }),
      "concentrationSavingThrow",
    );

    expect(concentration).toMatchObject({
      combatantId: wizardId,
      dc: 10,
      damageAmount: 5,
      rollMode: "advantage",
    });

    const maintained = requireResolved(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: goblinAttackSubject("Scimitar"),
        fills: [
          targetFill(target, wizardId),
          attackRollFill(roll, { total: 14, naturalD20: 10 }),
          damageRollFill(damage, 3),
          concentrationSavingThrowFill(concentration, true),
        ],
      }),
    );

    expect(maintained.state.combatants.get(wizardId)?.concentration).toEqual({
      sourceSpellId: "ray_of_frost",
      effectKind: "readiedSpell",
    });
  });

  test("Eldritch Mind does not affect ordinary Constitution spell saves", () => {
    const state = startBattleRight({
      battleId: battleId("battle-eldritch-mind-ordinary-con-save"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          invocationFeatures: [{ tag: "eldritchMind" }],
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("inflict_wounds")],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const target = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("inflict_wounds"),
        fills: [],
      }),
      "targetChoice",
    );
    const savingThrow = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("inflict_wounds"),
        fills: [targetFill(target, goblinId)],
      }),
      "savingThrowOutcome",
    );

    expect(savingThrow).toMatchObject({
      ability: "con",
      targetRollModes: [],
    });
  });

  test("attack damage disposition replay accepts the following Concentration save", () => {
    const state = startBattleRight({
      battleId: battleId("battle-knock-out-concentration-damage"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          currentHp: 3,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const readySubject = {
      tag: "actionSpell" as const,
      actorId: wizardId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "ready" as const, trigger: "spellCast" as const },
    };
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: readySubject,
        fills: [],
      }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: readied.state, actorId: wizardId }),
    );
    const subject = goblinAttackSubject("Scimitar");
    const target = attackInitialTargetHole(goblinTurn.state, subject);
    const roll = attackRollHoleAfterTarget(
      goblinTurn.state,
      target,
      subject,
      wizardId,
    );
    const damage = attackDamageHoleAfterHit(
      goblinTurn.state,
      target,
      roll,
      { total: 14, naturalD20: 10 },
      subject,
      wizardId,
    );
    const disposition = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject,
        fills: [
          targetFill(target, wizardId),
          attackRollFill(roll, { total: 14, naturalD20: 10 }),
          damageRollFill(damage, 3),
        ],
      }),
      "attackDamageDisposition",
    );
    const needsConcentration = resolveBattleSubject({
      state: goblinTurn.state,
      subject,
      fills: [
        targetFill(target, wizardId),
        attackRollFill(roll, { total: 14, naturalD20: 10 }),
        damageRollFill(damage, 3),
        attackDamageDispositionFill(disposition, { kind: "knockOut" }),
      ],
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );

    const completed = resolveBattleSubject({
      state: goblinTurn.state,
      subject,
      fills: [
        targetFill(target, wizardId),
        attackRollFill(roll, { total: 14, naturalD20: 10 }),
        damageRollFill(damage, 3),
        attackDamageDispositionFill(disposition, { kind: "knockOut" }),
        concentrationSavingThrowFill(concentration, true),
      ],
    });

    expect(completed).toMatchObject({
      tag: "resolved",
      snapshot: {
        readiedResponses: { spells: [] },
        combatants: [
          {
            combatantId: wizardId,
            hp: 1,
            concentrating: false,
            conditions: expect.arrayContaining(["unconscious", "prone"]),
          },
          { combatantId: goblinId },
        ],
      },
    });
  });

  test("readied spell release uses the held spell and ends Concentration", () => {
    const state = startBattleRight({
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
        invocation: cantripSpellInvocationRef(
          "ray_of_frost",
          "spellAttackDamage",
        ),
        mode: { tag: "ready", trigger: "attackHit" },
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
        readiedResponses: { spells: [] },
        combatants: [
          { combatantId: wizardId, concentrating: false },
          {
            combatantId: goblinId,
            hp: 6,
          },
        ],
      },
    });
    expect(
      requireResolved(released).state.combatants.get(goblinId),
    ).toMatchObject({
      activeEffects: [{ kind: "speedDelta" }],
    });
  });

  test("readied prepared slot spell releases without spending another Spell Slot", () => {
    const state = startBattleRight({
      battleId: battleId("battle-readied-slot-spell-release"),
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
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        fills: [],
      }),
    );
    expect(expendedLevelOneSlots(readied, wizardId)).toBe(1);
    const goblinTurn = requireResolved(
      endTurn({ state: readied.state, actorId: wizardId }),
    );
    const releaseSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "releaseReadiedSpell" as const,
      readiedSpellCasterId: wizardId,
    };
    const releaseAct = discoverBattleActs(goblinTurn.state).find(
      (act) =>
        act.subject.tag === "runtimeCommand" &&
        act.subject.command === "releaseReadiedSpell" &&
        act.subject.readiedSpellCasterId === wizardId,
    );
    expect(releaseAct?.initialHoles).toMatchObject([
      {
        kind: "spellTargetAllocation",
        label: "Magic Missile target allocation",
        allocationCount: 3,
      },
    ]);
    const target = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [
          spellTargetAllocationFill(target, [{ targetId: goblinId, count: 3 }]),
        ],
      }),
      "rolledDice",
    );
    const released = requireResolved(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [
          spellTargetAllocationFill(target, [{ targetId: goblinId, count: 3 }]),
          damageRollFillWithGroups(damage, [[1, 1, 1]]),
        ],
      }),
    );

    expect(expendedLevelOneSlots(released, wizardId)).toBe(1);
  });

  test("readied spells are held per caster", () => {
    const state = startBattleRight({
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
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
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
          invocation: cantripSpellInvocationRef(
            "acid_splash",
            "saveGatedDamage",
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        fills: [],
      }),
    ).state;

    expect(snapshotBattle(secondReadied)).toMatchObject({
      readiedResponses: {
        spells: [{ casterId: wizardId }, { casterId: secondWizardId }],
      },
      combatants: [
        {
          combatantId: wizardId,
          concentrating: true,
        },
        {
          combatantId: secondWizardId,
          concentrating: true,
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
      areaChoices: [],
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
        turn: { actionResources: [] },
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
        turn: { actionResources: [] },
      },
    });
  });

  test("Poison Spray uses creature target spell attack damage and cantrip scaling", () => {
    const state = startBattleRight({
      battleId: battleId("battle-poison-spray"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("poison_spray")],
            preparedSpells: [],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Target",
          initiative: 10,
          attack: null,
        }),
      ],
    });
    const subject = magicSubject("poison_spray");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, fighterId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, fighterId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Poison Spray damage (2d12-poison)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[5, 6]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 1 },
        ],
        turn: { actionResources: [] },
      },
    });
  });

  test("Chill Touch uses melee spell attack damage and prevents Hit Point regain on hit", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({
      label: "Chill Touch spell attack roll",
      attackBonus: 5,
    });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Chill Touch damage (2d10-necrotic)",
      spell: expect.objectContaining({
        attackKind: "melee_spell_attack",
        postDamageRiders: [
          {
            kind: "hitPointRegainPrevented",
            expiresAt: "endOfCasterNextTurn",
          },
        ],
      }),
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[5, 6]]),
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 2 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(
      result.state.combatants.get(skeletonId)?.activeEffects,
    ).toContainEqual({
      kind: "hitPointRegainPrevented",
      sourceSpellId: "chill_touch",
      sourceCombatantId: wizardId,
      expiresAt: {
        kind: "endOfTurn",
        combatantId: wizardId,
        round: 2,
      },
    });

    const healingWordAct = discoverBattleActs(result.state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "healing_word",
    );
    if (healingWordAct === undefined) {
      throw new Error("Expected Healing Word bonus action spell act.");
    }
    const healingWordTarget = requireHole(
      resolveBattleSubject({
        state: result.state,
        subject: healingWordAct.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const healingWordRoll = requireHole(
      resolveBattleSubject({
        state: result.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "healing_word",
            },
          ]),
        ],
      }),
      "rolledDice",
    );
    const blockedHealing = requireResolved(
      resolveBattleSubject({
        state: result.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "healing_word",
            },
          ]),
          damageRollFillWithGroups(healingWordRoll, [[4, 4]]),
        ],
      }),
    );

    expect(blockedHealing.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: skeletonId, hp: 2 }),
      ]),
    );

    const skeletonTurn = requireResolved(
      endTurn({ state: result.state, actorId: wizardId }),
    );
    const wizardNextTurn = requireResolved(
      endTurn({ state: skeletonTurn.state, actorId: skeletonId }),
    );
    const afterWizardNextTurn = requireResolved(
      endTurn({ state: wizardNextTurn.state, actorId: wizardId }),
    );
    expect(
      afterWizardNextTurn.state.combatants
        .get(skeletonId)
        ?.activeEffects.some(
          (effect) => effect.kind === "hitPointRegainPrevented",
        ),
    ).toBe(false);
    expect(expendedLevelOneSlots(result, wizardId)).toBe(0);
  });

  test("Chill Touch miss applies no Hit Point regain prevention rider", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch-miss"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    );

    expect(result.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: skeletonId, hp: 13 }),
      ]),
    );
    expect(result.state.combatants.get(skeletonId)?.activeEffects).toEqual([]);
  });

  test("Chill Touch expired rider allows later Hit Point regain", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch-heal-after-expiry"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const hit = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[5, 6]]),
        ],
      }),
    );
    const skeletonTurn = requireResolved(
      endTurn({ state: hit.state, actorId: wizardId }),
    );
    const wizardNextTurn = requireResolved(
      endTurn({ state: skeletonTurn.state, actorId: skeletonId }),
    );
    const expired = requireResolved(
      endTurn({ state: wizardNextTurn.state, actorId: wizardId }),
    );
    const wizardThirdTurn = requireResolved(
      endTurn({ state: expired.state, actorId: skeletonId }),
    );
    const healingWordAct = discoverBattleActs(wizardThirdTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "healing_word",
    );
    if (healingWordAct === undefined) {
      throw new Error("Expected Healing Word bonus action spell act.");
    }
    const healingWordTarget = requireHole(
      resolveBattleSubject({
        state: wizardThirdTurn.state,
        subject: healingWordAct.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const healingWordRoll = requireHole(
      resolveBattleSubject({
        state: wizardThirdTurn.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "healing_word",
            },
          ]),
        ],
      }),
      "rolledDice",
    );
    const healed = requireResolved(
      resolveBattleSubject({
        state: wizardThirdTurn.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "healing_word",
            },
          ]),
          damageRollFillWithGroups(healingWordRoll, [[4, 4]]),
        ],
      }),
    );

    expect(healed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: skeletonId, hp: 13 }),
      ]),
    );
  });

  test("Chill Touch old damage path still spends no Spell Slot", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch-slot"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[5, 6]]),
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 2 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(result, wizardId)).toBe(0);
  });

  test("Starry Wisp applies a shared Dim Light emitter to a hit creature until the caster's next turn ends", () => {
    const state = startBattleRight({
      battleId: battleId("battle-starry-wisp-creature"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("starry_wisp");
    const act = findAct(state, subject);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: expect.arrayContaining([skeletonId]),
      }),
      expect.objectContaining({ kind: "objectTargetChoice" }),
    ]);

    const target = findHole(act.initialHoles, "targetChoice");
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Starry Wisp damage (2d8-radiant)",
      spell: expect.objectContaining({
        targeting: { kind: "singleCreatureOrObject" },
        attackKind: "ranged_spell_attack",
        damage: {
          expr: { dice: 2, dieSize: 8 },
          damageType: "radiant",
        },
        postDamageRiders: [
          {
            kind: "lightEmission",
            emission: { kind: "dim", radiusFeet: 10 },
            expiresAt: "endOfCasterNextTurn",
          },
          {
            kind: "invisibleBenefitDenied",
            expiresAt: "endOfCasterNextTurn",
          },
        ],
      }),
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, skeletonId),
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[5, 6]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        lightEmitters: [
          {
            sourceSpellId: "starry_wisp",
            sourceCombatantId: wizardId,
            attachment: { kind: "combatant", combatantId: skeletonId },
            emission: { kind: "dim", radiusFeet: movementFeet(10) },
            expiresAt: {
              kind: "endOfTurn",
              combatantId: wizardId,
              round: 2,
            },
          },
        ],
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 2 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect("objectDamages" in requireResolved(result)).toBe(false);
    expect(expendedLevelOneSlots(requireResolved(result), wizardId)).toBe(0);

    const afterWizardTurn = requireResolved(
      endTurn({
        state: requireResolved(result).state,
        actorId: wizardId,
      }),
    );
    expect(afterWizardTurn.state.lightEmitters).toHaveLength(1);

    const afterSkeletonTurn = requireResolved(
      endTurn({
        state: afterWizardTurn.state,
        actorId: skeletonId,
      }),
    );
    expect(afterSkeletonTurn.state.lightEmitters).toHaveLength(1);

    const afterWizardNextTurn = requireResolved(
      endTurn({
        state: afterSkeletonTurn.state,
        actorId: wizardId,
      }),
    );
    expect(afterWizardNextTurn.state.lightEmitters).toEqual([]);
  });

  test("Starry Wisp hit denies Invisible benefit without removing the condition until the caster's next turn ends", () => {
    const allyId = combatantId("starry-wisp-ally");
    const state = startBattleRight({
      battleId: battleId("battle-starry-wisp-invisible-denial"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Ally",
          initiative: 15,
        }),
        skeletonCreatureInit({
          initiative: 10,
        }),
      ],
    });
    const skeleton = state.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected Starry Wisp target combatant.");
    }
    const invisibleState = {
      ...state,
      combatants: new Map(state.combatants).set(
        skeletonId,
        testBattleCreatureStateWithConditions(
          skeleton,
          applyCondition(skeleton.conditions, "invisible"),
        ),
      ),
    };
    const subject = magicSubject("starry_wisp");
    const target = findHole(
      findAct(invisibleState, subject).initialHoles,
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: invisibleState,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    expect(combatantCanSee(invisibleState, allyId, skeletonId)).toBe(false);
    const damage = requireHole(
      resolveBattleSubject({
        state: invisibleState,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const hit = requireResolved(
      resolveBattleSubject({
        state: invisibleState,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[1, 1]]),
        ],
      }),
    );
    const hitTarget = hit.state.combatants.get(skeletonId);
    if (hitTarget === undefined) {
      throw new Error("Expected Starry Wisp hit target combatant.");
    }
    expect(hitTarget?.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "invisibleBenefitDenied",
          sourceSpellId: "starry_wisp",
          sourceCombatantId: wizardId,
          expiresAt: {
            kind: "endOfTurn",
            combatantId: wizardId,
            round: 2,
          },
        }),
      ]),
    );
    expect(hasCondition(hitTarget.conditions, "invisible")).toBe(true);
    expect(combatantCanSee(hit.state, allyId, skeletonId)).toBe(true);

    const allyTurn = requireResolved(
      endTurn({ state: hit.state, actorId: wizardId }),
    );
    const allyAttack: BattleSubject = {
      tag: "action",
      actorId: allyId,
      action: "attack",
      attackName: "Longsword",
    };
    const allyTarget = requireHole(
      resolveBattleSubject({
        state: allyTurn.state,
        subject: allyAttack,
        fills: [],
      }),
      "targetChoice",
    );
    const allyAttackRoll = requireHole(
      resolveBattleSubject({
        state: allyTurn.state,
        subject: allyAttack,
        fills: [attackTargetFill(allyTarget, allyId, skeletonId)],
      }),
      "attackRoll",
    );
    expect(allyAttackRoll).not.toHaveProperty("rollMode");

    const skeletonTurn = requireResolved(
      endTurn({ state: allyTurn.state, actorId: allyId }),
    );
    const wizardNextTurn = requireResolved(
      endTurn({ state: skeletonTurn.state, actorId: skeletonId }),
    );
    const expired = requireResolved(
      endTurn({ state: wizardNextTurn.state, actorId: wizardId }),
    );
    const expiredTarget = expired.state.combatants.get(skeletonId);
    if (expiredTarget === undefined) {
      throw new Error("Expected expired Starry Wisp target combatant.");
    }
    expect(expiredTarget?.activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "invisibleBenefitDenied" }),
      ]),
    );
    expect(hasCondition(expiredTarget.conditions, "invisible")).toBe(true);
    expect(combatantCanSee(expired.state, allyId, skeletonId)).toBe(false);
  });

  test("Eldritch Blast resolves independent creature and object beams for one Magic action", () => {
    const objectId = battleObjectId("eldritch-training-crystal");
    const state = startBattleRight({
      battleId: battleId("battle-eldritch-blast-beams"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("eldritch_blast")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("eldritch_blast");
    const act = findAct(state, subject);
    const targetHoles = act.initialHoles.filter(
      (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
        hole.kind === "targetChoice",
    );
    const objectTargetHoles = act.initialHoles.filter(
      (
        hole,
      ): hole is Extract<BattleHole, { readonly kind: "objectTargetChoice" }> =>
        hole.kind === "objectTargetChoice",
    );
    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: wizardId,
      invocation: cantripSpellInvocationRef(
        "eldritch_blast",
        "spellAttackBeamSequence",
      ),
      mode: { tag: "cast" },
    });
    expect(targetHoles).toHaveLength(2);
    expect(objectTargetHoles).toHaveLength(2);
    expect(act.initialHoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Eldritch Blast beam 1 target" }),
        expect.objectContaining({
          label: "Eldritch Blast beam 1 object target",
        }),
        expect.objectContaining({ label: "Eldritch Blast beam 2 target" }),
        expect.objectContaining({
          label: "Eldritch Blast beam 2 object target",
        }),
      ]),
    );

    const beamOneTarget = targetFill(targetHoles[0]!, skeletonId);
    const beamTwoTarget = objectTargetFill({
      hole: objectTargetHoles[1]!,
      objectId,
      spellId: "eldritch_blast",
      rangeFeet: movementFeet(120),
      armorClass: armorClass(13),
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(5) },
    });
    const firstAttackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [beamOneTarget, beamTwoTarget],
      }),
      "attackRoll",
    );
    expect(firstAttackRoll).toMatchObject({
      label: "Eldritch Blast beam 1 spell attack roll",
      spell: expect.objectContaining({
        targeting: { kind: "beamSequenceCreatureOrObject", beamCount: 2 },
        damage: {
          expr: { dice: 1, dieSize: 10 },
          damageType: "force",
        },
        rangeFeet: 120,
        attackKind: "ranged_spell_attack",
      }),
    });
    const firstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(firstDamage).toMatchObject({
      label: "Eldritch Blast beam 1 damage (1d10-force)",
    });
    const secondAttackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
        ],
      }),
      "attackRoll",
    );
    expect(secondAttackRoll).toMatchObject({
      label: "Eldritch Blast beam 2 spell attack roll",
    });
    const secondDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
          attackRollFill(secondAttackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(secondDamage).toMatchObject({
      label: "Eldritch Blast beam 2 damage (1d10-force)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        beamOneTarget,
        beamTwoTarget,
        attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(firstDamage, [[6]]),
        attackRollFill(secondAttackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(secondDamage, [[4]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          damageType: "force",
          rolledDamage: damageAmount(4),
          effectiveDamage: damageAmount(4),
          priorHitPoints: Hp(5),
          nextHitPoints: Hp(1),
          destroyed: false,
        },
      ],
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 7 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(requireResolved(result), wizardId)).toBe(0);
  });

  test("Eldritch Blast beams can target the same creature and miss independently", () => {
    const state = startBattleRight({
      battleId: battleId("battle-eldritch-blast-same-target-miss"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("eldritch_blast")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("eldritch_blast");
    const targetHoles = findAct(state, subject).initialHoles.filter(
      (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
        hole.kind === "targetChoice",
    );
    const beamOneTarget = targetFill(targetHoles[0]!, skeletonId);
    const beamTwoTarget = targetFill(targetHoles[1]!, skeletonId);
    const firstAttackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [beamOneTarget, beamTwoTarget],
      }),
      "attackRoll",
    );
    const firstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const secondAttackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
        ],
      }),
      "attackRoll",
    );
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        beamOneTarget,
        beamTwoTarget,
        attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(firstDamage, [[6]]),
        attackRollFill(secondAttackRoll, { total: 1, naturalD20: 1 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 7 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect("objectDamages" in requireResolved(result)).toBe(false);
  });

  test("Eldritch Blast same-target hits use independent damage lifecycle holes", () => {
    const baseState = startBattleRight({
      battleId: battleId("battle-eldritch-blast-same-target-lifecycle"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("eldritch_blast")],
            preparedSpells: [],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Concentrating Target",
          initiative: 10,
          side: oppositionSide,
          attack: null,
        }),
      ],
    });
    const target = baseState.combatants.get(skeletonId)!;
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(skeletonId, {
        ...target,
        concentration: {
          sourceSpellId: "test_concentration",
          effectKind: "readiedSpell",
        },
        activeEffects: [
          ...target.activeEffects,
          {
            kind: "spellDamageReduction" as const,
            sourceSpellId: "resistance",
            sourceCombatantId: wizardId,
            damageType: "force" as const,
            amount: { dice: 1 as const, dieSize: 4 as const },
            usedThisTurn: false,
            expiresAt: {
              kind: "concentration" as const,
              combatantId: wizardId,
            },
          },
        ],
      }),
    } satisfies BattleState;
    const subject = magicSubject("eldritch_blast");
    const targetHoles = findAct(state, subject).initialHoles.filter(
      (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
        hole.kind === "targetChoice",
    );
    const beamOneTarget = targetFill(targetHoles[0]!, skeletonId);
    const beamTwoTarget = targetFill(targetHoles[1]!, skeletonId);
    const firstAttack = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [beamOneTarget, beamTwoTarget],
      }),
      "attackRoll",
    );
    const firstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttack, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const firstReduction = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
        ],
      }),
      "rolledDice",
    );
    expect(firstReduction).toMatchObject({
      label: "Eldritch Blast beam 1 damage reduction",
    });
    const firstConcentration = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
          damageRollFillWithGroups(firstReduction, [[2]]),
        ],
      }),
      "concentrationSavingThrow",
    );
    const secondAttack = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
          damageRollFillWithGroups(firstReduction, [[2]]),
          concentrationSavingThrowFill(firstConcentration, true),
        ],
      }),
      "attackRoll",
    );
    const secondDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
          damageRollFillWithGroups(firstReduction, [[2]]),
          concentrationSavingThrowFill(firstConcentration, true),
          attackRollFill(secondAttack, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const secondConcentration = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
          damageRollFillWithGroups(firstReduction, [[2]]),
          concentrationSavingThrowFill(firstConcentration, true),
          attackRollFill(secondAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(secondDamage, [[4]]),
        ],
      }),
      "concentrationSavingThrow",
    );
    expect(secondConcentration.holeId).not.toBe(firstConcentration.holeId);

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
          damageRollFillWithGroups(firstReduction, [[2]]),
          concentrationSavingThrowFill(firstConcentration, true),
          attackRollFill(secondAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(secondDamage, [[4]]),
          concentrationSavingThrowFill(secondConcentration, true),
        ],
      }),
    );
    const damagedTarget = result.state.combatants.get(skeletonId);
    expect(damagedTarget).toMatchObject({
      hp: Hp(4),
      concentration: {
        sourceSpellId: "test_concentration",
        effectKind: "readiedSpell",
      },
    });
    expect(
      damagedTarget?.activeEffects.find(
        (effect) => effect.kind === "spellDamageReduction",
      ),
    ).toMatchObject({ usedThisTurn: true });
  });

  test("Eldritch Blast beam count scales at levels 1, 5, 11, and 17", () => {
    const cases = [
      [1, 1],
      [5, 2],
      [11, 3],
      [17, 4],
    ] as const;

    for (const [classLevel, beamCount] of cases) {
      const state = startBattleRight({
        battleId: battleId(`battle-eldritch-blast-level-${classLevel}`),
        combatants: [
          characterSeed({
            combatantId: wizardId,
            displayName: "Warlock",
            initiative: 20,
            attack: null,
            classLevel,
            spellcasting: wizardSpellcasting({
              cantrips: [spellRecord("eldritch_blast")],
              preparedSpells: [],
            }),
          }),
          skeletonCreatureInit({ initiative: 10 }),
        ],
      });
      const holes = findAct(state, magicSubject("eldritch_blast")).initialHoles;
      expect(holes.filter((hole) => hole.kind === "targetChoice")).toHaveLength(
        beamCount,
      );
      expect(
        holes.filter((hole) => hole.kind === "objectTargetChoice"),
      ).toHaveLength(beamCount);
    }
  });

  test("Eldritch Blast creature beams use Concentration, spell reduction, and zero-HP damage lifecycle holes", () => {
    const concentrationState = startBattleRight({
      battleId: battleId("battle-eldritch-blast-concentration"),
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
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Concentrating Target",
          initiative: 10,
          side: oppositionSide,
          attack: null,
        }),
      ],
    });
    const concentratingTarget = concentrationState.combatants.get(skeletonId)!;
    const state = {
      ...concentrationState,
      combatants: new Map(concentrationState.combatants).set(skeletonId, {
        ...concentratingTarget,
        concentration: {
          sourceSpellId: "test_concentration",
          effectKind: "readiedSpell",
        },
      }),
    } satisfies BattleState;
    const subject = magicSubject("eldritch_blast");
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );
    const attack = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const concentration = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[4]]),
        ],
      }),
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({ combatantId: skeletonId, dc: 10 });
    const failedConcentration = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[4]]),
          concentrationSavingThrowFill(concentration, false),
        ],
      }),
    );
    expect(failedConcentration.state.combatants.get(skeletonId)).toMatchObject({
      hp: Hp(8),
      concentration: null,
    });

    const reductionTarget = state.combatants.get(skeletonId)!;
    const reductionState = {
      ...state,
      combatants: new Map(state.combatants).set(skeletonId, {
        ...reductionTarget,
        concentration: null,
        activeEffects: [
          ...reductionTarget.activeEffects,
          {
            kind: "spellDamageReduction" as const,
            sourceSpellId: "resistance",
            sourceCombatantId: wizardId,
            damageType: "force" as const,
            amount: { dice: 1 as const, dieSize: 4 as const },
            usedThisTurn: false,
            expiresAt: {
              kind: "concentration" as const,
              combatantId: wizardId,
            },
          },
        ],
      }),
    } satisfies BattleState;
    const reduction = requireHole(
      resolveBattleSubject({
        state: reductionState,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[4]]),
        ],
      }),
      "rolledDice",
    );
    expect(reduction).toMatchObject({
      label: "Eldritch Blast beam 1 damage reduction",
    });
    const reduced = requireResolved(
      resolveBattleSubject({
        state: reductionState,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[4]]),
          damageRollFillWithGroups(reduction, [[3]]),
        ],
      }),
    );
    expect(reduced.state.combatants.get(skeletonId)?.hp).toBe(Hp(11));

    const relentlessEndurance = unitLibrary.requireUnit(
      "orc_relentless_endurance",
    );
    const zeroHpState = startBattleRight({
      battleId: battleId("battle-eldritch-blast-zero-hp"),
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
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Fragile Target",
          initiative: 10,
          side: oppositionSide,
          attack: null,
          currentHp: 4,
          maxHp: 12,
          resources: [{ unit: relentlessEndurance }],
          characterUnitRefs: [
            {
              unitId: "orc_relentless_endurance",
              supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
            },
          ],
        }),
      ],
    });
    const zeroTarget = findHole(
      findAct(zeroHpState, subject).initialHoles,
      "targetChoice",
    );
    const zeroAttack = requireHole(
      resolveBattleSubject({
        state: zeroHpState,
        subject,
        fills: [targetFill(zeroTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const zeroDamage = requireHole(
      resolveBattleSubject({
        state: zeroHpState,
        subject,
        fills: [
          targetFill(zeroTarget, skeletonId),
          attackRollFill(zeroAttack, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const disposition = requireHole(
      resolveBattleSubject({
        state: zeroHpState,
        subject,
        fills: [
          targetFill(zeroTarget, skeletonId),
          attackRollFill(zeroAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(zeroDamage, [[4]]),
        ],
      }),
      "attackDamageDisposition",
    );
    expect(disposition).toMatchObject({
      targetId: skeletonId,
      choices: expect.arrayContaining([
        { kind: "ordinaryDamage" },
        { kind: "zeroHitPointReplacement", unitId: "orc_relentless_endurance" },
      ]),
    });
  });

  test("Eldritch Blast beams open attack-hit and after-damage reaction windows", () => {
    const subject = magicSubject("eldritch_blast");
    const warlockTurnWithReadiedRay = (
      trigger: BattleReadiedSpellTrigger,
    ): BattleState => {
      const readied = resolveBattleSubject({
        state: startBattleRight({
          battleId: battleId(`battle-eldritch-blast-readied-${trigger}`),
          combatants: [
            characterSeed({
              combatantId: secondWizardId,
              displayName: "Second Wizard",
              initiative: 30,
              attack: null,
              spellcasting: wizardSpellcasting(),
            }),
            characterSeed({
              combatantId: wizardId,
              displayName: "Warlock",
              initiative: 20,
              attack: null,
              spellcasting: wizardSpellcasting({
                cantrips: [spellRecord("eldritch_blast")],
                preparedSpells: [],
              }),
            }),
            skeletonCreatureInit({ initiative: 10 }),
          ],
        }),
        subject: {
          tag: "actionSpell",
          actorId: secondWizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger },
        },
        fills: [],
      });
      if (readied.tag !== "resolved") {
        throw new Error(`Expected resolved Ready Spell, got ${readied.tag}.`);
      }
      const next = endTurn({ state: readied.state, actorId: secondWizardId });
      if (next.tag !== "resolved") {
        throw new Error(`Expected resolved End Turn, got ${next.tag}.`);
      }
      return next.state;
    };
    const attackHitState = warlockTurnWithReadiedRay("attackHit");
    const attackHitTarget = findHole(
      findAct(attackHitState, subject).initialHoles,
      "targetChoice",
    );
    const attackHitRoll = requireHole(
      resolveBattleSubject({
        state: attackHitState,
        subject,
        fills: [targetFill(attackHitTarget, skeletonId)],
      }),
      "attackRoll",
    );
    expect(
      resolveBattleSubject({
        state: attackHitState,
        subject,
        fills: [
          targetFill(attackHitTarget, skeletonId),
          attackRollFill(attackHitRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "attackHit" }],
    });

    const afterDamageState = warlockTurnWithReadiedRay("afterDamage");
    const afterDamageTarget = findHole(
      findAct(afterDamageState, subject).initialHoles,
      "targetChoice",
    );
    const afterDamageRoll = requireHole(
      resolveBattleSubject({
        state: afterDamageState,
        subject,
        fills: [targetFill(afterDamageTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const afterDamageRollFill = attackRollFill(afterDamageRoll, {
      total: 18,
      naturalD20: 12,
    });
    const afterDamageDamage = requireHole(
      resolveBattleSubject({
        state: afterDamageState,
        subject,
        fills: [targetFill(afterDamageTarget, skeletonId), afterDamageRollFill],
      }),
      "rolledDice",
    );
    expect(
      resolveBattleSubject({
        state: afterDamageState,
        subject,
        fills: [
          targetFill(afterDamageTarget, skeletonId),
          afterDamageRollFill,
          damageRollFillWithGroups(afterDamageDamage, [[4]]),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "afterDamage" }],
    });
  });

  test("Starry Wisp object targeting requires a matching caller-supplied object fact", () => {
    const state = startBattleRight({
      battleId: battleId("battle-starry-wisp-object-fact"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("starry_wisp");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        objectTargetFill({
          hole: objectTarget,
          spellId: "starry_wisp",
          rangeFeet: movementFeet(30),
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell object target must include a matching table-supplied range and object Armor Class fact.",
    });
  });

  test("Starry Wisp object target miss spends the Magic action without object damage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-starry-wisp-object-miss"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("starry_wisp");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      spellId: "starry_wisp",
      armorClass: armorClass(13),
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 12, naturalD20: 7 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect("objectDamages" in requireResolved(result)).toBe(false);
    expect(requireResolved(result).state.lightEmitters).toEqual([]);
  });

  test("Starry Wisp object attack rolls enforce attacker-wide disadvantage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-starry-wisp-object-poisoned"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          conditions: ["poisoned"],
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("starry_wisp");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      spellId: "starry_wisp",
      armorClass: armorClass(13),
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({ rollMode: "disadvantage" });
    expect(attackRoll).not.toHaveProperty("missToHitReplacements");

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFillForObject,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell attack roll mode does not match the current attack-roll rule.",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, {
          total: 12,
          naturalD20: 7,
          rollMode: "disadvantage",
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect("objectDamages" in requireResolved(result)).toBe(false);
  });

  test("Starry Wisp applies object hit point and damage-threshold disposition on a hit", () => {
    const state = startBattleRight({
      battleId: battleId("battle-starry-wisp-object-hit"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("starry_wisp");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const objectId = battleObjectId("training-crystal");
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      objectId,
      spellId: "starry_wisp",
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(5) },
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFillForObject,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[3, 3]]),
      ],
    });
    expect(result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          damageType: "radiant",
          rolledDamage: damageAmount(6),
          effectiveDamage: damageAmount(6),
          priorHitPoints: Hp(5),
          nextHitPoints: Hp(0),
          destroyed: true,
        },
      ],
      snapshot: {
        lightEmitters: [
          {
            sourceSpellId: "starry_wisp",
            sourceCombatantId: wizardId,
            attachment: { kind: "object", objectId },
            emission: { kind: "dim", radiusFeet: movementFeet(10) },
          },
        ],
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });

    const thresholdObjectId = battleObjectId("reinforced-training-crystal");
    const thresholdTargetFill = objectTargetFill({
      hole: objectTarget,
      objectId: thresholdObjectId,
      spellId: "starry_wisp",
      damageDisposition: {
        kind: "hitPointsWithDamageThreshold",
        hitPoints: Hp(10),
        damageThreshold: damageAmount(10),
      },
    });
    const thresholdDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          thresholdTargetFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const thresholdResult = resolveBattleSubject({
      state,
      subject,
      fills: [
        thresholdTargetFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(thresholdDamage, [[3, 3]]),
      ],
    });

    expect(thresholdResult).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId: thresholdObjectId,
          rolledDamage: damageAmount(6),
          effectiveDamage: damageAmount(0),
          priorHitPoints: Hp(10),
          nextHitPoints: Hp(10),
          destroyed: false,
        },
      ],
    });
  });

  test("Sacred Flame uses a creature target before Dexterity Saving Throw damage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sacred-flame"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Cleric",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("sacred_flame")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("sacred_flame");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Sacred Flame Saving Throw outcome",
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
    });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Sacred Flame damage (1d8-radiant)",
    });
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, skeletonId),
        savingThrowOutcomeFill(savingThrows, [
          { targetId: skeletonId, succeeded: false },
        ]),
        damageRollFill(damage, 7),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 6 },
        ],
        turn: { actionResources: [] },
      },
    });

    const success = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, skeletonId),
        savingThrowOutcomeFill(savingThrows, [
          { targetId: skeletonId, succeeded: true },
        ]),
      ],
    });
    expect(success).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 13 },
        ],
      },
    });
  });

  test("Inflict Wounds spends a slot and applies half damage on a successful Constitution save", () => {
    const state = startBattleRight({
      battleId: battleId("battle-inflict-wounds"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Cleric",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("inflict_wounds")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef(
        "inflict_wounds",
        2,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "savingThrowOutcome",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: true },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Inflict Wounds damage (3d10-necrotic)",
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: true },
          ]),
          damageRollFillWithGroups(damage, [[5, 5, 5]]),
        ],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 6 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(result, wizardId)).toBe(0);
    const caster = result.state.combatants.get(wizardId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected character spellcaster.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 2, count: 1, expended: 1 },
    ]);
  });

  test("Burning Hands uses self-origin Cone outcomes, Fire damage, slot scaling, and slot spend", () => {
    const state = startBattleRight({
      battleId: battleId("battle-burning-hands"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("burning_hands")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          displayName: "Second Skeleton",
          initiative: 8,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef("burning_hands", 2, "saveGatedDamage"),
      mode: { tag: "cast" },
    };
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Burning Hands self-origin Cone Saving Throw outcomes",
      ability: "dex",
      spell: {
        targeting: { kind: "selfOriginCone", lengthFeet: 15 },
        damage: { expr: { dice: 4, dieSize: 6 }, damageType: "fire" },
        successDamage: "half",
        rangeFeet: 0,
      },
    });
    const saveFill = savingThrowOutcomeFill(savingThrows, [
      { targetId: skeletonId, succeeded: false },
      { targetId: secondSkeletonId, succeeded: true },
    ]);
    if (!("area" in saveFill.value)) {
      throw new Error("Expected area Saving Throw fill.");
    }
    expect(saveFill.value.area).toEqual({
      originAnchorId: wizardId,
      affectedTargetIds: [skeletonId, secondSkeletonId],
    });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Burning Hands damage (4d6-fire)",
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [saveFill, damageRollFillWithGroups(damage, [[3, 3, 3, 3]])],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 1 },
          { combatantId: secondSkeletonId, hp: 7 },
        ],
        turn: { actionResources: [] },
      },
    });
    const caster = result.state.combatants.get(wizardId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected character spellcaster.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 2, count: 1, expended: 1 },
    ]);
  });

  test("Burning Hands rejects self-origin Cone outcomes anchored to another combatant", () => {
    const state = startBattleRight({
      battleId: battleId("battle-burning-hands-invalid-origin"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("burning_hands")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("burning_hands");
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
                originAnchorId: skeletonId,
                affectedTargetIds: [skeletonId],
              },
              outcomes: [{ targetId: skeletonId, succeeded: false }],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Self-origin Cone save-gate spell area must originate from the caster.",
    });
  });

  test("Burning Hands can resolve with an empty table-supplied Cone membership", () => {
    const state = startBattleRight({
      battleId: battleId("battle-burning-hands-empty-cone"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("burning_hands")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("burning_hands");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [savingThrowOutcomeFill(savingThrows, [])],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    const caster = result.state.combatants.get(wizardId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected character spellcaster.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 1 },
    ]);
  });

  test("Ice Knife resolves critical attack damage and mandatory primary-target burst", () => {
    const primaryTargetId = combatantId("ice-knife-primary");
    const baseState = startBattleRight({
      battleId: battleId("battle-ice-knife"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: primaryTargetId,
          displayName: "Primary Target",
          initiative: 10,
          side: oppositionSide,
          currentHp: 30,
          maxHp: 30,
        }),
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          displayName: "Nearby Skeleton",
          initiative: 8,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        }),
      ],
    });
    const primaryTarget = baseState.combatants.get(primaryTargetId);
    if (primaryTarget === undefined) {
      throw new Error("Expected primary target.");
    }
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(primaryTargetId, {
        ...primaryTarget,
        concentration: {
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef(
        "ice_knife",
        2,
        "attackBurstSaveDamage",
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 25, naturalD20: 20 });
    const attackDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    expect(attackDamage).toMatchObject({
      label: "Ice Knife damage (2d10-piercing)",
    });
    const attackDamageRoll = damageRollFillWithGroups(attackDamage, [[5, 5]]);
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll],
      }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Ice Knife primary-target-origin Emanation Saving Throw outcomes",
      ability: "dex",
      spell: {
        burst: {
          targeting: { kind: "primaryTargetOriginEmanation", radiusFeet: 5 },
          damage: { expr: { dice: 3, dieSize: 6 }, damageType: "cold" },
        },
      },
    });
    const saveFill: Extract<
      BattleFill,
      { readonly kind: "savingThrowOutcome" }
    > = {
      kind: "savingThrowOutcome",
      holeId: savingThrows.holeId,
      value: {
        area: {
          originAnchorId: primaryTargetId,
          affectedTargetIds: [primaryTargetId, secondSkeletonId],
        },
        outcomes: [
          { targetId: primaryTargetId, succeeded: false },
          { targetId: secondSkeletonId, succeeded: true },
        ],
      },
    };
    const burstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll, saveFill],
      }),
      "rolledDice",
    );
    expect(burstDamage).toMatchObject({
      label: "Ice Knife burst damage (3d6-cold)",
    });

    const burstDamageRoll = damageRollFillWithGroups(burstDamage, [[2, 2, 2]]);
    const concentration = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          saveFill,
          burstDamageRoll,
        ],
      }),
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({
      combatantId: primaryTargetId,
      dc: 10,
      damageAmount: 16,
    });
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          saveFill,
          burstDamageRoll,
          concentrationSavingThrowFill(concentration, false),
        ],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: primaryTargetId, hp: 14, concentrating: false },
          { combatantId: secondSkeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    const caster = result.state.combatants.get(wizardId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected character spellcaster.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 2, count: 1, expended: 1 },
    ]);
  });

  test("Ice Knife attack damage requests zero-HP replacement disposition before the burst save", () => {
    const primaryTargetId = combatantId("ice-knife-attack-relentless-primary");
    const relentlessEndurance = unitLibrary.requireUnit(
      "orc_relentless_endurance",
    );
    const state = startBattleRight({
      battleId: battleId("battle-ice-knife-attack-relentless"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: primaryTargetId,
          displayName: "Relentless Primary",
          initiative: 10,
          side: oppositionSide,
          currentHp: 3,
          maxHp: 12,
          resources: [{ unit: relentlessEndurance }],
          characterUnitRefs: [
            {
              unitId: "orc_relentless_endurance",
              supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
            },
          ],
        }),
      ],
    });
    const subject = magicSubject("ice_knife");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 20, naturalD20: 12 });
    const attackDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    const attackDamageRoll = damageRollFillWithGroups(attackDamage, [[4]]);
    const disposition = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll],
      }),
      "attackDamageDisposition",
    );
    expect(disposition).toMatchObject({
      label: "Ice Knife attack damage disposition",
      targetId: primaryTargetId,
      choices: expect.arrayContaining([
        {
          kind: "zeroHitPointReplacement",
          unitId: "orc_relentless_endurance",
        },
      ]),
    });

    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          attackDamageDispositionFill(disposition, {
            kind: "zeroHitPointReplacement",
            unitId: "orc_relentless_endurance",
          }),
        ],
      }),
      "savingThrowOutcome",
    );
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          attackDamageDispositionFill(disposition, {
            kind: "zeroHitPointReplacement",
            unitId: "orc_relentless_endurance",
          }),
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: primaryTargetId,
                affectedTargetIds: [primaryTargetId],
              },
              outcomes: [{ targetId: primaryTargetId, succeeded: true }],
            },
          },
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: primaryTargetId,
            hp: 1,
            conditions: expect.not.arrayContaining(["unconscious"]),
          }),
        ]),
      },
    });
  });

  test("Ice Knife burst damage requests a separate zero-HP replacement disposition for the primary target", () => {
    const primaryTargetId = combatantId("ice-knife-burst-relentless-primary");
    const relentlessEndurance = unitLibrary.requireUnit(
      "orc_relentless_endurance",
    );
    const state = startBattleRight({
      battleId: battleId("battle-ice-knife-burst-relentless"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: primaryTargetId,
          displayName: "Relentless Primary",
          initiative: 10,
          side: oppositionSide,
          currentHp: 5,
          maxHp: 12,
          resources: [{ unit: relentlessEndurance }],
          characterUnitRefs: [
            {
              unitId: "orc_relentless_endurance",
              supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
            },
          ],
        }),
      ],
    });
    const subject = magicSubject("ice_knife");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 20, naturalD20: 12 });
    const attackDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    const attackDamageRoll = damageRollFillWithGroups(attackDamage, [[4]]);
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll],
      }),
      "savingThrowOutcome",
    );
    const saveFill: Extract<
      BattleFill,
      { readonly kind: "savingThrowOutcome" }
    > = {
      kind: "savingThrowOutcome",
      holeId: savingThrows.holeId,
      value: {
        area: {
          originAnchorId: primaryTargetId,
          affectedTargetIds: [primaryTargetId],
        },
        outcomes: [{ targetId: primaryTargetId, succeeded: false }],
      },
    };
    const burstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll, saveFill],
      }),
      "rolledDice",
    );
    const burstDamageRoll = damageRollFillWithGroups(burstDamage, [[1, 1]]);
    const disposition = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          saveFill,
          burstDamageRoll,
        ],
      }),
      "attackDamageDisposition",
    );
    expect(disposition).toMatchObject({
      label: "Ice Knife burst damage disposition",
      targetId: primaryTargetId,
      choices: expect.arrayContaining([
        {
          kind: "zeroHitPointReplacement",
          unitId: "orc_relentless_endurance",
        },
      ]),
    });
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          saveFill,
          burstDamageRoll,
          attackDamageDispositionFill(disposition, {
            kind: "zeroHitPointReplacement",
            unitId: "orc_relentless_endurance",
          }),
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: primaryTargetId,
            hp: 1,
            conditions: expect.not.arrayContaining(["unconscious"]),
          }),
        ]),
      },
    });
  });

  test("Ice Knife miss still requires a primary-target-anchored burst save", () => {
    const state = startBattleRight({
      battleId: battleId("battle-ice-knife-miss"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("ice_knife");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, skeletonId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 1, naturalD20: 1 });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "savingThrowOutcome",
    );
    const invalidAttackDamage = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        attackRoll,
        {
          kind: "rolledDice",
          holeId: savingThrows.holeId,
          value: rolledDiceGroups([[1]]),
        },
      ],
    });
    expect(invalidAttackDamage).toMatchObject({
      tag: "invalid",
      message: "Ice Knife damage must use an Ice Knife damage hole.",
    });
    const missingPrimary = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        attackRoll,
        {
          kind: "savingThrowOutcome",
          holeId: savingThrows.holeId,
          value: {
            area: {
              originAnchorId: skeletonId,
              affectedTargetIds: [],
            },
            outcomes: [],
          },
        },
      ],
    });
    expect(missingPrimary).toMatchObject({
      tag: "invalid",
      message: "Ice Knife burst area must include the primary target.",
    });
  });

  test("Ice Knife burst damage requests Concentration follow-up for damaged burst targets", () => {
    const baseState = startBattleRight({
      battleId: battleId("battle-ice-knife-concentration"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Concentrating Target",
          initiative: 8,
          side: oppositionSide,
          currentHp: 20,
          maxHp: 20,
        }),
      ],
    });
    const concentrating = baseState.combatants.get(secondWizardId);
    if (concentrating === undefined) {
      throw new Error("Expected concentrating target.");
    }
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(secondWizardId, {
        ...concentrating,
        concentration: {
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const subject = magicSubject("ice_knife");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, skeletonId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 1, naturalD20: 1 });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "savingThrowOutcome",
    );
    const saveFill: Extract<
      BattleFill,
      { readonly kind: "savingThrowOutcome" }
    > = {
      kind: "savingThrowOutcome",
      holeId: savingThrows.holeId,
      value: {
        area: {
          originAnchorId: skeletonId,
          affectedTargetIds: [skeletonId, secondWizardId],
        },
        outcomes: [
          { targetId: skeletonId, succeeded: true },
          { targetId: secondWizardId, succeeded: false },
        ],
      },
    };
    const burstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, saveFill],
      }),
      "rolledDice",
    );
    const needsConcentration = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        attackRoll,
        saveFill,
        damageRollFillWithGroups(burstDamage, [[3, 3]]),
      ],
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({
      combatantId: secondWizardId,
      dc: 10,
      damageAmount: 6,
    });
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          saveFill,
          damageRollFillWithGroups(burstDamage, [[3, 3]]),
          concentrationSavingThrowFill(concentration, false),
        ],
      }),
    );
    expect(result).toMatchObject({
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 13 },
          { combatantId: secondWizardId, hp: 14, concentrating: false },
        ],
      },
    });
  });

  test("Color Spray applies spell-owned Blinded to failed self-origin Cone saves", () => {
    const state = startBattleRight({
      battleId: battleId("battle-color-spray"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("color_spray")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          displayName: "Second Skeleton",
          initiative: 8,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        }),
      ],
    });
    const subject = magicSubject("color_spray");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Color Spray self-origin Cone Saving Throw outcomes",
      ability: "con",
      spell: {
        targeting: { kind: "selfOriginCone", lengthFeet: 15 },
        effect: { condition: "blinded", expiresAt: "endOfCasterNextTurn" },
        rangeFeet: 0,
      },
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
            { targetId: secondSkeletonId, succeeded: true },
          ]),
        ],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          {
            combatantId: skeletonId,
            hp: 13,
            conditions: expect.arrayContaining(["blinded"]),
          },
          {
            combatantId: secondSkeletonId,
            hp: 13,
            conditions: expect.not.arrayContaining(["blinded"]),
          },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(
      result.state.combatants.get(skeletonId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellCondition",
        sourceSpellId: "color_spray",
        sourceCombatantId: wizardId,
        condition: "blinded",
        expiresAt: { kind: "endOfTurn", combatantId: wizardId, round: 2 },
      }),
    );
    expect(expendedLevelOneSlots(result, wizardId)).toBe(1);
  });

  test("Color Spray expiration does not erase unrelated Blinded sources", () => {
    const state = startBattleRight({
      battleId: battleId("battle-color-spray-source-preservation"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("color_spray")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          conditions: ["blinded"],
        }),
      ],
    });
    const subject = magicSubject("color_spray");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const sprayed = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    );

    const skeletonTurn = requireResolved(
      endTurn({ state: sprayed.state, actorId: wizardId }),
    ).state;
    const nextWizardTurn = requireResolved(
      endTurn({ state: skeletonTurn, actorId: skeletonId }),
    ).state;
    const expired = requireResolved(
      endTurn({ state: nextWizardTurn, actorId: wizardId }),
    );

    expect(expired.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ blinded: true }),
      activeEffects: [],
    });
  });

  test("Entangle applies concentration-owned Restrained to failed point-origin Cube saves", () => {
    const state = startBattleRight({
      battleId: battleId("battle-entangle"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Druid",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          displayName: "Second Skeleton",
          initiative: 8,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        }),
      ],
    });
    const subject = magicSubject("entangle");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Entangle point-origin Cube Saving Throw outcomes",
      ability: "str",
      spell: {
        targeting: { kind: "pointOriginCubeExcludingCaster", sideFeet: 20 },
        effect: { condition: "restrained", expiresAt: "concentration" },
        rangeFeet: 90,
      },
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
            { targetId: secondSkeletonId, succeeded: true },
          ]),
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: [
          { combatantId: wizardId, concentrating: true },
          {
            combatantId: skeletonId,
            conditions: expect.arrayContaining(["restrained"]),
          },
          {
            combatantId: secondSkeletonId,
            conditions: expect.not.arrayContaining(["restrained"]),
          },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(
      result.state.combatants.get(skeletonId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellCondition",
        sourceSpellId: "entangle",
        sourceCombatantId: wizardId,
        condition: "restrained",
        expiresAt: { kind: "concentration", combatantId: wizardId },
      }),
    );
    expect(expendedLevelOneSlots(result, wizardId)).toBe(1);

    const casterIncluded = resolveBattleSubject({
      state,
      subject,
      fills: [
        {
          kind: "savingThrowOutcome",
          holeId: savingThrows.holeId,
          value: {
            area: {
              originAnchorId: wizardId,
              affectedTargetIds: [wizardId, skeletonId],
            },
            outcomes: [
              { targetId: wizardId, succeeded: false },
              { targetId: skeletonId, succeeded: false },
            ],
          },
        },
      ],
    });
    expect(casterIncluded).toMatchObject({
      tag: "invalid",
      message: "Entangle area affected targets must exclude the caster.",
    });
  });

  test("Entangle Restrained ends on Concentration break or Strength Athletics escape", () => {
    const state = startBattleRight({
      battleId: battleId("battle-entangle-cleanup"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Druid",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("entangle"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const entangled = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("entangle"),
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    ).state;

    const broken = breakBattleConcentration(entangled, wizardId);
    expect(broken.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.not.objectContaining({ restrained: true }),
      activeEffects: [],
    });

    const skeletonTurn = requireResolved(
      endTurn({ state: entangled, actorId: wizardId }),
    ).state;
    const escapeAct = discoverBattleActs(skeletonTurn).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint",
    );
    expect(escapeAct).toMatchObject({
      label: "Escape entangle",
      initialHoles: [
        expect.objectContaining({
          kind: "abilityCheck",
          ability: "str",
          skill: "athletics",
          dc: 13,
        }),
      ],
    });
    if (
      escapeAct?.subject.tag !== "action" ||
      escapeAct.subject.action !== "escapeSpellRestraint"
    ) {
      throw new Error("Expected Entangle escape action.");
    }
    const failed = requireResolved(
      resolveBattleSubject({
        state: skeletonTurn,
        subject: escapeAct.subject,
        fills: [abilityCheckFill(escapeAct.initialHoles[0]!, 12)],
      }),
    );
    expect(failed.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: true }),
    });

    const escaped = requireResolved(
      resolveBattleSubject({
        state: skeletonTurn,
        subject: escapeAct.subject,
        fills: [abilityCheckFill(escapeAct.initialHoles[0]!, 13)],
      }),
    );
    expect(escaped.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.not.objectContaining({ restrained: true }),
      activeEffects: [],
    });
    expect(escaped.state.combatants.get(wizardId)?.concentration).toEqual({
      sourceSpellId: "entangle",
      effectKind: "spellEffect",
    });
  });

  test("Entangle escape actions identify the restraining caster", () => {
    const secondDruidEntangle: BattleSubject = {
      tag: "actionSpell",
      actorId: secondWizardId,
      invocation: spellSlotInvocationRef("entangle", 1, "saveGatedCondition"),
      mode: { tag: "cast" },
    };
    const state = startBattleRight({
      battleId: battleId("battle-entangle-two-casters"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Druid",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Second Druid",
          initiative: 15,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const firstSavingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("entangle"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const firstEntangled = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("entangle"),
        fills: [
          savingThrowOutcomeFill(firstSavingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const secondDruidTurn = requireResolved(
      endTurn({ state: firstEntangled, actorId: wizardId }),
    ).state;
    const secondSavingThrows = requireHole(
      resolveBattleSubject({
        state: secondDruidTurn,
        subject: secondDruidEntangle,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const twiceEntangled = requireResolved(
      resolveBattleSubject({
        state: secondDruidTurn,
        subject: secondDruidEntangle,
        fills: [
          savingThrowOutcomeFill(secondSavingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const skeletonTurn = requireResolved(
      endTurn({ state: twiceEntangled, actorId: secondWizardId }),
    ).state;
    const escapeActs = discoverBattleActs(skeletonTurn).filter(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint",
    );

    expect(escapeActs.map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceCombatantId: wizardId }),
        expect.objectContaining({ sourceCombatantId: secondWizardId }),
      ]),
    );
    const secondDruidEscape = escapeActs.find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint" &&
        act.subject.sourceCombatantId === secondWizardId,
    );
    if (
      secondDruidEscape?.subject.tag !== "action" ||
      secondDruidEscape.subject.action !== "escapeSpellRestraint"
    ) {
      throw new Error("Expected second Druid Entangle escape action.");
    }

    const escapedSecondDruidRestraint = requireResolved(
      resolveBattleSubject({
        state: skeletonTurn,
        subject: secondDruidEscape.subject,
        fills: [abilityCheckFill(secondDruidEscape.initialHoles[0]!, 13)],
      }),
    ).state;

    expect(
      escapedSecondDruidRestraint.combatants
        .get(skeletonId)
        ?.activeEffects.map((effect) =>
          effect.kind === "spellCondition" ? effect.sourceCombatantId : null,
        ),
    ).toEqual([wizardId]);
    expect(
      escapedSecondDruidRestraint.combatants.get(skeletonId),
    ).toMatchObject({
      conditions: expect.objectContaining({ restrained: true }),
    });
  });

  test("Entangle recast preserves the newly applied same-spell restraint", () => {
    const state = startBattleRight({
      battleId: battleId("battle-entangle-recast"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Druid",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const firstSavingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("entangle"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const firstEntangled = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("entangle"),
        fills: [
          savingThrowOutcomeFill(firstSavingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const nextDruidTurn = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({ state: firstEntangled, actorId: wizardId }),
        ).state,
        actorId: skeletonId,
      }),
    ).state;
    const secondSavingThrows = requireHole(
      resolveBattleSubject({
        state: nextDruidTurn,
        subject: magicSubject("entangle"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const recast = requireResolved(
      resolveBattleSubject({
        state: nextDruidTurn,
        subject: magicSubject("entangle"),
        fills: [
          savingThrowOutcomeFill(secondSavingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(recast.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: true }),
    });
    expect(
      recast.state.combatants
        .get(skeletonId)
        ?.activeEffects.filter(
          (effect) =>
            effect.kind === "spellCondition" &&
            effect.sourceSpellId === "entangle" &&
            effect.sourceCombatantId === wizardId,
        ),
    ).toHaveLength(1);
    expect(expendedLevelOneSlots(recast, wizardId)).toBe(2);
  });

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
            durationTicks: requireElapsedHours(8),
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
            durationTicks: requireElapsedHours(8),
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

  test("Sleep rejects rolled outcomes for Exhaustion-immune targets and unsupported non-sleeper facts", () => {
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
        "Sleep targets with Exhaustion Immunity automatically succeed and must not receive a rolled Saving Throw outcome.",
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
                affectedTargetIds: [skeletonId],
                sleepNonSleeperFacts: [
                  { kind: "doesNotSleep", targetId: skeletonId },
                ],
              },
              outcomes: [],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Sleep non-sleeper automatic-success facts are not supported yet.",
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

  test("save-damage replacement riders reduce failed half-damage saves", () => {
    const state = wizardVsRogueBattle({ evasion: true });
    const subject = magicSubject("dex_half_cantrip");
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
            { targetId: fighterId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: fighterId, succeeded: false },
        ]),
        damageRollFill(damage, 6),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 9 },
        ],
      },
    });
  });

  test("save-damage replacement riders replace successful half-damage saves with no damage", () => {
    const state = wizardVsRogueBattle({ evasion: true });
    const subject = magicSubject("dex_half_cantrip");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: fighterId, succeeded: true },
        ]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 12 },
        ],
      },
    });
  });

  test("half-damage save gates still damage targets without replacement riders", () => {
    const state = wizardVsRogueBattle({ evasion: false });
    const subject = magicSubject("dex_half_cantrip");
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
            { targetId: fighterId, succeeded: true },
          ]),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: fighterId, succeeded: true },
        ]),
        damageRollFill(damage, 6),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 9 },
        ],
      },
    });
  });

  test("save-damage replacement riders require admitted Unit support", () => {
    const state = wizardVsRogueBattle({
      evasion: true,
      saveDamageReplacementSupport: false,
    });
    const subject = magicSubject("dex_half_cantrip");
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
            { targetId: fighterId, succeeded: true },
          ]),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: fighterId, succeeded: true },
        ]),
        damageRollFill(damage, 6),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 9 },
        ],
      },
    });
  });

  test("save-damage replacement riders ignore non-Dexterity save mechanics", () => {
    const state = wizardVsRogueBattle({
      evasion: true,
      evasionAbility: "con",
    });
    const subject = magicSubject("dex_half_cantrip");
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
            { targetId: fighterId, succeeded: true },
          ]),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: fighterId, succeeded: true },
        ]),
        damageRollFill(damage, 6),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 9 },
        ],
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
          { combatantId: skeletonId, hp: 9, concentrating: false },
        ],
      },
    });
  });

  test("Hunter's Mark adds Force damage to attack-roll hits against the mark and transfers after the mark drops", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-mark"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 1 },
            { className: "fighter", level: 1 },
          ],
          resources: [rageResource()],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [
                spellRecord("hunters_mark"),
                spellRecord("magic_missile"),
              ],
            }),
            sourceClassName: "fighter",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
        skeletonCreatureInit({ initiative: 5 }),
      ],
    });
    const markAct = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "hunters_mark",
    );
    if (markAct === undefined) {
      throw new Error("Expected Hunter's Mark Bonus Action spell act.");
    }
    const markTarget = findHole(markAct.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject: markAct.subject,
        fills: [
          targetFill(markTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );

    expect(marked.state.combatants.get(fighterId)?.concentration).toEqual({
      sourceSpellId: "hunters_mark",
      effectKind: "spellEffect",
    });
    expect(marked.state.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: goblinId,
        transferAvailable: false,
      }),
    ]);

    const magicMissileReady = requireResolved(
      endTurn({ state: marked.state, actorId: fighterId }),
    ).state;
    const magicMissileAfterGoblin = requireResolved(
      endTurn({ state: magicMissileReady, actorId: goblinId }),
    ).state;
    const magicMissileTurn = requireResolved(
      endTurn({ state: magicMissileAfterGoblin, actorId: skeletonId }),
    ).state;
    const magicMissileSubject = {
      tag: "actionSpell" as const,
      actorId: fighterId,
      invocation: spellSlotInvocationRef(
        "magic_missile",
        1,
        "repeatedDamageAllocation",
      ),
      mode: { tag: "cast" as const },
    };
    const magicMissileTargetAllocation = requireHole(
      resolveBattleSubject({
        state: magicMissileTurn,
        subject: magicMissileSubject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const magicMissileAllocationFill: BattleFill = {
      kind: "spellTargetAllocation",
      holeId: magicMissileTargetAllocation.holeId,
      value: { allocations: [{ targetId: goblinId, count: 3 }] },
      spatialFacts: [
        {
          kind: "spellTarget",
          casterId: fighterId,
          targetId: goblinId,
          spellId: "magic_missile",
        },
      ],
    };
    const magicMissileDamage = requireHole(
      resolveBattleSubject({
        state: magicMissileTurn,
        subject: magicMissileSubject,
        fills: [magicMissileAllocationFill],
      }),
      "rolledDice",
    );
    const magicMissileDropped = requireResolved(
      resolveBattleSubject({
        state: magicMissileTurn,
        subject: magicMissileSubject,
        fills: [
          magicMissileAllocationFill,
          damageRollFillWithGroups(magicMissileDamage, [[3, 3, 3]]),
        ],
      }),
    );
    expect(magicMissileDropped.state.combatants.get(goblinId)?.hp).toBe(0);
    expect(
      magicMissileDropped.state.combatants.get(fighterId)?.activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: goblinId,
        transferAvailable: true,
      }),
    ]);

    const spellSubject = {
      tag: "actionSpell" as const,
      actorId: fighterId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" as const },
    };
    const spellAct = findAct(marked.state, spellSubject);
    const spellTarget = findHole(spellAct.initialHoles, "targetChoice");
    const spellAttack = requireHole(
      resolveBattleSubject({
        state: marked.state,
        subject: spellSubject,
        fills: [
          targetFill(spellTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "ray_of_frost",
            },
          ]),
        ],
      }),
      "attackRoll",
    );
    const spellDamage = requireHole(
      resolveBattleSubject({
        state: marked.state,
        subject: spellSubject,
        fills: [
          targetFill(spellTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "ray_of_frost",
            },
          ]),
          attackRollFill(spellAttack, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    expect(spellDamage).toMatchObject({
      label: "Ray of Frost damage (1d8-cold+1d6-force)",
      spellMarkedDamageRiders: [
        expect.objectContaining({ targetCombatantId: goblinId }),
      ],
    });

    const target = attackInitialTargetHole(marked.state);
    const roll = attackRollHoleAfterTarget(
      marked.state,
      target,
      undefined,
      goblinId,
    );
    const damage = attackDamageHoleAfterHit(
      marked.state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      undefined,
      goblinId,
    );

    expect(damage).toMatchObject({
      label: "Longsword damage (1d8+1d6+3-slashing)",
      spellMarkedDamageRiders: [
        expect.objectContaining({ targetCombatantId: goblinId }),
      ],
    });

    const nicked = requireResolved(
      resolveBattleSubject({
        state: marked.state,
        subject: fighterAttackSubject(),
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
          damageRollFillWithGroups(damage, [[1], [1]]),
        ],
      }),
    );
    expect(nicked.state.combatants.get(goblinId)?.hp).toBe(Hp(5));

    const attackFills = [
      targetFill(target, goblinId),
      attackRollFill(roll, { total: 15, naturalD20: 10 }),
      damageRollFillWithGroups(damage, [[4], [6]]),
    ];
    const disposition = requireHole(
      resolveBattleSubject({
        state: marked.state,
        subject: fighterAttackSubject(),
        fills: attackFills,
      }),
      "attackDamageDisposition",
    );
    const dropped = requireResolved(
      resolveBattleSubject({
        state: marked.state,
        subject: fighterAttackSubject(),
        fills: [
          ...attackFills,
          attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
        ],
      }),
    );
    expect(dropped.state.combatants.get(goblinId)?.hp).toBe(0);
    expect(dropped.state.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: goblinId,
        transferAvailable: true,
      }),
    ]);

    const afterFighterTurn = requireResolved(
      endTurn({ state: dropped.state, actorId: fighterId }),
    ).state;
    const afterGoblinTurn = requireResolved(
      endTurn({ state: afterFighterTurn, actorId: goblinId }),
    ).state;
    const nextFighterTurn = requireResolved(
      endTurn({ state: afterGoblinTurn, actorId: skeletonId }),
    ).state;
    const transferAct = discoverBattleActs(nextFighterTurn).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.tag === "spellEffect" &&
        candidate.subject.invocation.spellId === "hunters_mark",
    );
    if (transferAct === undefined) {
      throw new Error("Expected Hunter's Mark transfer act.");
    }
    const transferTarget = findHole(transferAct.initialHoles, "targetChoice");
    if (transferTarget.kind !== "targetChoice") {
      throw new Error("Expected Hunter's Mark target choice.");
    }
    expect(transferTarget.choices).not.toContain(goblinId);
    expect(
      resolveBattleSubject({
        state: nextFighterTurn,
        subject: transferAct.subject,
        fills: [
          targetFill(transferTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const restrictedActor = nextFighterTurn.combatants.get(fighterId);
    if (restrictedActor === undefined) {
      throw new Error("Expected Hunter's Mark caster.");
    }
    const spellcastingRestrictedOccurrence: ActiveOngoingFeatureOccurrence = {
      kind: "fixedDuration",
      expiresAt: {
        kind: "endOfTurn",
        combatantId: fighterId,
        round: nextFighterTurn.initiative.round,
      },
    };
    const restrictedHiddenTransferState: BattleState = {
      ...nextFighterTurn,
      combatants: new Map(nextFighterTurn.combatants).set(fighterId, {
        ...restrictedActor,
        hidden: { discoveryDc: difficultyClass(17) },
        activeOngoingFeatureOccurrences: new Map([
          ...restrictedActor.activeOngoingFeatureOccurrences,
          [
            "barbarian_rage" as OngoingFeatureSourceKey,
            spellcastingRestrictedOccurrence,
          ],
        ]),
      }),
    };
    const restrictedTransferAct = discoverBattleActs(
      restrictedHiddenTransferState,
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.tag === "spellEffect" &&
        candidate.subject.invocation.spellId === "hunters_mark",
    );
    if (restrictedTransferAct === undefined) {
      throw new Error(
        "Expected Hunter's Mark transfer act through spellcasting restriction.",
      );
    }
    const restrictedTransferTarget = findHole(
      restrictedTransferAct.initialHoles,
      "targetChoice",
    );
    const restrictedTransferred = requireResolved(
      resolveBattleSubject({
        state: restrictedHiddenTransferState,
        subject: restrictedTransferAct.subject,
        fills: [
          targetFill(restrictedTransferTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: skeletonId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );
    expect(
      restrictedTransferred.state.combatants.get(fighterId)?.hidden,
    ).toEqual({ discoveryDc: difficultyClass(17) });

    const transferred = requireResolved(
      resolveBattleSubject({
        state: nextFighterTurn,
        subject: transferAct.subject,
        fills: [
          targetFill(transferTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: skeletonId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );

    expect(transferred.state.combatants.get(fighterId)?.concentration).toEqual({
      sourceSpellId: "hunters_mark",
      effectKind: "spellEffect",
    });
    expect(transferred.state.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: skeletonId,
        transferAvailable: false,
      }),
    ]);
  });

  test("breaking Hunter's Mark concentration clears the marked target rider", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-mark-concentration"),
      combatants: [
        characterSeed({
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("hunters_mark")],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const markAct = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "hunters_mark",
    );
    if (markAct === undefined) {
      throw new Error("Expected Hunter's Mark Bonus Action spell act.");
    }
    const markTarget = findHole(markAct.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject: markAct.subject,
        fills: [
          targetFill(markTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );

    const broken = breakBattleConcentration(marked.state, fighterId);

    expect(broken.combatants.get(fighterId)?.concentration).toBeNull();
    expect(broken.combatants.get(fighterId)?.activeEffects).toEqual([]);
  });

  test("Hunter's Mark projects slot-scaled Concentration maximum duration", () => {
    const expectedTicksBySlot = [
      [1, 600],
      [2, 600],
      [3, 4_800],
      [4, 4_800],
      [5, 14_400],
    ] as const;

    for (const [slotLevel, expectedTicks] of expectedTicksBySlot) {
      const state = startBattleRight({
        battleId: battleId(`battle-hunters-mark-slot-${slotLevel}`),
        combatants: [
          characterSeed({
            initiative: 20,
            spellcasting: wizardSpellcasting({
              preparedSpells: [spellRecord("hunters_mark")],
              spellSlots: [{ spellLevel: slotLevel, count: 1 }],
            }),
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      });
      const subject = {
        tag: "bonusActionSpell" as const,
        actorId: fighterId,
        invocation: spellSlotInvocationRef(
          "hunters_mark",
          slotLevel,
          "markedDamageRider",
        ),
        mode: { tag: "cast" as const },
      };
      const act = findAct(state, subject);
      const markTarget = findHole(act.initialHoles, "targetChoice");
      const marked = requireResolved(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetFill(markTarget, goblinId, [
              {
                kind: "spellTarget",
                casterId: fighterId,
                targetId: goblinId,
                spellId: "hunters_mark",
              },
            ]),
          ],
        }),
      );

      expect(marked.state.combatants.get(fighterId)?.activeEffects).toEqual([
        expect.objectContaining({
          kind: "spellMarkedDamageRider",
          targetCombatantId: goblinId,
          expiresAt: {
            kind: "concentration",
            combatantId: fighterId,
            durationTicks: expectedTicks,
          },
        }),
      ]);
    }
  });

  test("Favored Enemy casts Hunter's Mark without expending a Spell Slot", () => {
    const favoredEnemy = rangerFavoredEnemyResource();
    const state = startBattleRight({
      battleId: battleId("battle-favored-enemy-hunters-mark"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "ranger", level: 1 }],
          resources: [favoredEnemy],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
            }),
            featurePreparedSpells: [
              {
                sourceUnitId: favoredEnemy.unit.id,
                spell: spellRecord("hunters_mark"),
              },
            ],
            sourceClassName: "ranger",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = {
      tag: "bonusActionSpell" as const,
      actorId: fighterId,
      invocation: classFeatureFreeCastSpellInvocationRef(
        "hunters_mark",
        "ranger_favored_enemy",
        "markedDamageRider",
      ),
      mode: { tag: "cast" as const },
    };
    const act = findAct(state, subject);
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(markTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );
    const ranger = marked.state.combatants.get(fighterId);

    expect(ranger?.origin.kind).toBe("character");
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    expect(ranger.origin.resources[0]?.usesRemaining).toBe(resourceCount(1));
    expect(ranger.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 0 },
    ]);
    expect(marked.state.currentTurnResources.spellSlotExpendedThisTurn).toBe(
      false,
    );
    expect(ranger.concentration).toEqual({
      sourceSpellId: "hunters_mark",
      effectKind: "spellEffect",
    });
    expect(ranger.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: goblinId,
        expiresAt: {
          kind: "concentration",
          combatantId: fighterId,
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    ]);
  });

  test("stale Favored Enemy Hunter's Mark free-cast resolution preserves turn resources and Concentration", () => {
    const favoredEnemy = rangerFavoredEnemyResource();
    const state = startBattleRight({
      battleId: battleId("battle-favored-enemy-stale-hunters-mark"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "ranger", level: 1 }],
          resources: [favoredEnemy],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
            }),
            featurePreparedSpells: [
              {
                sourceUnitId: favoredEnemy.unit.id,
                spell: spellRecord("hunters_mark"),
              },
            ],
            sourceClassName: "ranger",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = {
      tag: "bonusActionSpell" as const,
      actorId: fighterId,
      invocation: classFeatureFreeCastSpellInvocationRef(
        "hunters_mark",
        "ranger_favored_enemy",
        "markedDamageRider",
      ),
      mode: { tag: "cast" as const },
    };
    const act = findAct(state, subject);
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const ranger = state.combatants.get(fighterId);
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    const invocation = supportedSpellActs(ranger).find(
      (candidate) =>
        candidate.procedure === "markedDamageRider" &&
        supportedSpellInvocationMatchesRef(candidate, subject.invocation),
    );
    if (
      invocation === undefined ||
      invocation.procedure !== "markedDamageRider" ||
      invocation.resource.tag !== "classFeatureFreeCast"
    ) {
      throw new Error("Expected Favored Enemy Hunter's Mark invocation.");
    }
    const existingConcentration = {
      sourceSpellId: "existing_concentration",
      effectKind: "spellEffect",
    } as const;
    const [favoredEnemyResource] = ranger.origin.resources;
    if (
      favoredEnemyResource === undefined ||
      characterBattleResourceIsUnlimited(favoredEnemyResource)
    ) {
      throw new Error("Expected Favored Enemy to be a limited resource.");
    }
    const staleState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...ranger,
        concentration: existingConcentration,
        origin: {
          ...ranger.origin,
          resources: [
            { ...favoredEnemyResource, usesRemaining: resourceCount(0) },
            ...ranger.origin.resources.slice(1),
          ],
        },
      }),
    };
    const staleSnapshot = snapshotBattle(staleState);
    const fills = [
      targetFill(markTarget, goblinId, [
        {
          kind: "spellTarget",
          casterId: fighterId,
          targetId: goblinId,
          spellId: "hunters_mark",
        },
      ]),
    ];
    const fillSet = spellFillSet(fills, invocation);
    if (fillSet.tag === "invalid") {
      throw new Error(fillSet.message);
    }

    const result = resolveMarkedDamageRiderSpellAct({
      input: {
        state: staleState,
        subject,
        fills,
      },
      actorId: fighterId,
      invocation,
      fillSet,
    });

    expect(result).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(result.snapshot).toEqual(staleSnapshot);
    expect(staleState.currentTurnResources.currentHasBonusAction).toBe(true);
    expect(staleState.combatants.get(fighterId)?.concentration).toEqual(
      existingConcentration,
    );
  });

  test("Favored Enemy initializes at its level-1 Long Rest use cap", () => {
    const state = startBattleRight({
      battleId: battleId("battle-favored-enemy-long-rest-cap"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "ranger", level: 17 }],
          resources: [rangerFavoredEnemyResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const ranger = state.combatants.get(fighterId);

    expect(ranger?.origin.kind).toBe("character");
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    expect(ranger.origin.resources[0]?.usesRemaining).toBe(resourceCount(2));
  });

  test("Favored Enemy free-cast support requires Hunter's Mark grant identity", () => {
    const favoredEnemy = unitLibrary.requireUnit("ranger_favored_enemy");
    if (
      favoredEnemy.kind !== "class_feature" ||
      favoredEnemy.mechanics.family !== "passive"
    ) {
      throw new Error("Expected Ranger Favored Enemy passive class feature.");
    }
    const mismatchedFreeCast = {
      ...favoredEnemy,
      mechanics: {
        ...favoredEnemy.mechanics,
        grants: favoredEnemy.mechanics.grants.map((grant) =>
          grant.kind === "grant_spell_free_casts"
            ? { ...grant, spellId: "magic_missile" }
            : grant,
        ),
      },
    };

    expect(characterBattleResourceSupportedForUnit(mismatchedFreeCast)).toBe(
      false,
    );
  });

  test("Favored Enemy falls back to normal Hunter's Mark Spell Slot casting when free casts are exhausted", () => {
    const favoredEnemy = rangerFavoredEnemyResource({ usesRemaining: 0 });
    const state = startBattleRight({
      battleId: battleId("battle-favored-enemy-hunters-mark-slot-fallback"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "ranger", level: 1 }],
          resources: [favoredEnemy],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
            }),
            featurePreparedSpells: [
              {
                sourceUnitId: favoredEnemy.unit.id,
                spell: spellRecord("hunters_mark"),
              },
            ],
            sourceClassName: "ranger",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    expect(
      discoverBattleActs(state).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          candidate.subject.invocation.tag === "classFeatureFreeCast" &&
          candidate.subject.invocation.spellId === "hunters_mark",
      ),
    ).toBe(false);

    const subject = {
      tag: "bonusActionSpell" as const,
      actorId: fighterId,
      invocation: spellSlotInvocationRef(
        "hunters_mark",
        1,
        "markedDamageRider",
      ),
      mode: { tag: "cast" as const },
    };
    const act = findAct(state, subject);
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(markTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );
    const ranger = marked.state.combatants.get(fighterId);

    expect(ranger?.origin.kind).toBe("character");
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    expect(ranger.origin.resources[0]?.usesRemaining).toBe(resourceCount(0));
    expect(ranger.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 1 },
    ]);
    expect(marked.state.currentTurnResources.spellSlotExpendedThisTurn).toBe(
      true,
    );
  });

  test("Hunter's Mark maximum duration expiry clears Concentration and preserves damage behavior before expiry", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-mark-duration-expiry"),
      combatants: [
        characterSeed({
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("hunters_mark")],
            spellSlots: [{ spellLevel: 3, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = {
      tag: "bonusActionSpell" as const,
      actorId: fighterId,
      invocation: spellSlotInvocationRef(
        "hunters_mark",
        3,
        "markedDamageRider",
      ),
      mode: { tag: "cast" as const },
    };
    const act = findAct(state, subject);
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(markTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );
    const caster = marked.state.combatants.get(fighterId);
    const rider = caster?.activeEffects.find(
      (effect) => effect.kind === "spellMarkedDamageRider",
    );
    if (caster === undefined || rider === undefined) {
      throw new Error("Expected active Hunter's Mark rider.");
    }
    if (rider.expiresAt.kind !== "concentration") {
      throw new Error("Expected Hunter's Mark to be Concentration-owned.");
    }
    const nearlyExpired: BattleState = {
      ...marked.state,
      combatants: new Map(marked.state.combatants).set(fighterId, {
        ...caster,
        activeEffects: [
          {
            ...rider,
            expiresAt: {
              kind: "concentration",
              combatantId: rider.expiresAt.combatantId,
              durationTicks: elapsedTimeTicks(1),
            },
          },
        ],
      }),
    };

    const target = attackInitialTargetHole(nearlyExpired);
    const roll = attackRollHoleAfterTarget(
      nearlyExpired,
      target,
      undefined,
      goblinId,
    );
    const damage = attackDamageHoleAfterHit(
      nearlyExpired,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      undefined,
      goblinId,
    );
    expect(damage).toMatchObject({
      label: "Longsword damage (1d8+1d6+3-slashing)",
      spellMarkedDamageRiders: [
        expect.objectContaining({ targetCombatantId: goblinId }),
      ],
    });

    const expiredCombatants = tickDurationEffects(nearlyExpired.combatants);
    expect(expiredCombatants.get(fighterId)?.concentration).toBeNull();
    expect(expiredCombatants.get(fighterId)?.activeEffects).toEqual([]);
  });

  test("Hunter's Mark invocation holes reject contradictory cast and transfer shapes", () => {
    const spell = spellRecord("hunters_mark");
    const baseSpell = {
      access: { tag: "prepared" },
      procedure: "markedDamageRider",
      spell,
      actionCost: "bonusAction",
      targeting: { kind: "singleCombatant" },
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "force" },
      rangeFeet: movementFeet(90),
    };
    const baseHole = {
      kind: "rolledDice",
      holeId: holeId("battle:test:invalid-hunters-mark-invocation"),
      holeInstanceKey: holeInstanceKey(
        "battle:test:invalid-hunters-mark-invocation",
      ),
      label: "Invalid Hunter's Mark invocation",
      critical: false,
      spellMarkedDamageRiders: [],
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseSpell,
            action: "cast",
            resource: { tag: "none" },
            expiresAt: { kind: "concentration" },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseSpell,
            action: "transfer",
            resource: { tag: "spellSlot", slotLevel: 1 },
            activeEffect: {
              kind: "spellMarkedDamageRider",
              sourceCombatantId: fighterId,
              sourceSpellId: "hunters_mark",
              targetCombatantId: goblinId,
              transferAvailable: true,
              damage: { expr: { dice: 1, dieSize: 6 }, damageType: "force" },
              expiresAt: { kind: "concentration" },
            },
          },
        }),
      ),
    ).toBe(true);
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
        turn: {
          actionResources: [{ kind: "action", source: "turn" }],
          bonusActionAvailable: true,
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

  test(
    "canonical battle runtime QNT self-tests pass",
    () => {
      runCanonicalBattleRuntimeQntSelfTests();
    },
    canonicalBattleRuntimeQntSelfTestTimeoutMs,
  );
});

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

function requireBardicInspirationD20TestResolved(
  result: ReturnType<typeof resolveBardicInspirationFailedD20Test>,
): Extract<
  ReturnType<typeof resolveBardicInspirationFailedD20Test>,
  { readonly tag: "resolved" }
> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved battle result, got ${result.tag}.`);
  }

  return result;
}

function requireNeedsHoles(
  result: ReturnType<typeof resolveBattleSubject>,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "needsHoles" }
> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles battle result, got ${result.tag}.`);
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
  | "multiattack"
  | "ready"
  | "search"
  | "grapple"
  | "shove"
  | "escapeGrapple"
  | "escapeSpellRestraint"
  | "shakeAwakeFromSleep"
  | "offHandAttack"
  | "martialArtsUnarmedStrike"
  | "statBlockActionOption"
  | "actionSpell"
  | "bonusActionSpell"
  | "bonusActionDashSpell"
  | "unitFeature"
  | "endTurn"
  | "move"
  | "standFromProne"
  | "releaseGrapple"
  | "releaseReadiedSpell"
  | "releaseReadiedMovement"
  | "castTriggeredReactionSpell"
  | "castAttackHitBonusActionSpell"
  | "opportunityAttack"
  | "greaseGroundHazardSave"
  | "jumpMovementReplacement"
  | "commandGrovel"
  | "commandDrop"
  | "commandApproach"
  | "commandFlee"
  | "creatureFalls" {
  if (subject.tag === "action") {
    return subject.action;
  }
  if (subject.tag === "bonusAction") {
    return subject.action;
  }
  if (subject.tag === "bonusActionStandardAction") {
    return subject.action;
  }
  if (subject.tag === "actionSpell") {
    return "actionSpell";
  }
  if (subject.tag === "bonusActionSpell") {
    return "bonusActionSpell";
  }
  if (subject.tag === "bonusActionDashSpell") {
    return "bonusActionDashSpell";
  }
  if (subject.tag === "unitFeature") {
    return "unitFeature";
  }
  return subject.command;
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
  expect(quintOutput).toContain("passing");
}

function hidePrerequisites(
  entries: readonly (readonly [CombatantId, BattleHidePrerequisite])[],
): ReadonlyMap<CombatantId, BattleHidePrerequisite> {
  return new Map(entries);
}

function fighterVsGoblinBattle(input?: {
  readonly hidePrerequisites?: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly weaponMasteries?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["weaponMasteries"];
  readonly attack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle-attack"),
    combatants: [
      characterSeed({
        initiative: 20,
        ...(input?.characterUnitRefs === undefined
          ? {}
          : { characterUnitRefs: input.characterUnitRefs }),
        ...(input?.weaponMasteries === undefined
          ? {}
          : { weaponMasteries: input.weaponMasteries }),
        ...(input?.attack === undefined ? {} : { attack: input.attack }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
    ...(input?.hidePrerequisites === undefined
      ? {}
      : { hidePrerequisites: input.hidePrerequisites }),
  });
}

function criticalRange19UnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unitId: "fighter_improved_critical",
      supportProfiles: [WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE],
    },
  ];
}

function sneakAttackUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unitId: "rogue_sneak_attack",
      supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
    },
  ];
}

function masterySapUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unitId: "mastery_sap",
      supportProfiles: [WEAPON_MASTERY_SAP_SUPPORT_PROFILE],
    },
  ];
}

function masteryToppleUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unitId: "mastery_topple",
      supportProfiles: [WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE],
    },
  ];
}

function masteryCleaveUnitRefs(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"] {
  return [
    {
      unitId: "mastery_cleave",
      supportProfiles: [WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE],
    },
  ];
}

function longswordWeaponMasterySelections(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["weaponMasteries"] {
  return [
    {
      weaponUnitId: "weapon_longsword",
    },
  ];
}

function greataxeWeaponMasterySelections(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["weaponMasteries"] {
  return [
    {
      weaponUnitId: "weapon_greataxe",
    },
  ];
}

function longbowWeaponMasterySelections(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["weaponMasteries"] {
  return [
    {
      weaponUnitId: "weapon_longbow",
    },
  ];
}

function quarterstaffWeaponMasterySelections(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["weaponMasteries"] {
  return [
    {
      weaponUnitId: "weapon_quarterstaff",
    },
  ];
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
    state: startBattleRight({
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
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "ready", trigger },
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

function fighterTurnWithReadiedRayAndHealer(
  trigger: BattleReadiedSpellTrigger,
): BattleState {
  const wizardReady = resolveBattleSubject({
    state: startBattleRight({
      battleId: battleId(`battle-readied-${trigger}-healing-word`),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 30,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        characterSeed({
          initiative: 20,
          currentHp: 4,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    }),
    subject: {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "ready", trigger },
    },
    fills: [],
  });
  if (wizardReady.tag !== "resolved") {
    throw new Error(`Expected resolved Ready Spell, got ${wizardReady.tag}.`);
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
      state: startBattleRight({
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
        invocation: cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
        mode: { tag: "ready", trigger: "attackHit" },
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
        invocation: cantripSpellInvocationRef(
          "ray_of_frost",
          "spellAttackDamage",
        ),
        mode: { tag: "ready", trigger: "saveFailed" },
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
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "ready", trigger },
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
    state: startBattleRight({
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
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId: fighterId,
    action: "attack",
    attackName,
  };
}

function goblinAttackSubject(
  attackName: "Scimitar" | "Shortbow",
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
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
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
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
    { readonly tag: "action"; readonly action: "attack" }
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
    { readonly tag: "action"; readonly action: "attack" }
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
        attackTargetFill(
          targetHole,
          subject.actorId,
          targetId,
          subject.attackName,
        ),
      ],
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
    { readonly tag: "action"; readonly action: "attack" }
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
        attackTargetFill(
          targetHole,
          subject.actorId,
          targetId,
          subject.attackName,
        ),
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

function resolveLongswordHit(
  state: BattleState,
  subject: ReturnType<typeof fighterAttackSubject> = fighterAttackSubject(),
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  return resolveWeaponHit(state, subject);
}

function resolveWeaponHit(
  state: BattleState,
  subject: ReturnType<typeof fighterAttackSubject>,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const targetHole = attackInitialTargetHole(state, subject);
  const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
  const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
    total: 15,
    naturalD20: 10,
  });
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 1),
      ],
    }),
  );
}

function resolveLongswordMiss(
  state: BattleState,
  subject: ReturnType<typeof fighterAttackSubject> = fighterAttackSubject(),
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const targetHole = attackInitialTargetHole(state, subject);
  const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 1 }),
      ],
    }),
  );
}

function characterWithDeathSaveCounters(input: {
  readonly combatantId: CombatantId;
  readonly successes: 0 | 1 | 2;
  readonly failures: 0 | 1 | 2;
}): BattleState {
  const state = startBattleRight({
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

type SleepShakeAwakeSubject = Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "shakeAwakeFromSleep" }
>;

function sleepShakeAwakeSubject(): SleepShakeAwakeSubject {
  return { tag: "action", actorId: fighterId, action: "shakeAwakeFromSleep" };
}

function sleepShakeAwakeTargetFill(hole: BattleHole): BattleFill {
  return targetFill(hole, goblinId, [
    {
      kind: "sleepShakeAwakeActorWithin5Feet",
      actorId: fighterId,
      targetId: goblinId,
    },
  ]);
}

function battleAfterFailedSleepInitialSave(input: {
  readonly battle: string;
  readonly helperInitiative?: number;
  readonly targetConditions?: Parameters<typeof characterSeed>[0]["conditions"];
}): BattleState {
  const state = startBattleRight({
    battleId: battleId(input.battle),
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
        initiative: input.helperInitiative ?? 15,
      }),
      characterSeed({
        combatantId: goblinId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        ...(input.targetConditions === undefined
          ? {}
          : { conditions: input.targetConditions }),
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
  return requireResolved(endTurn({ state: slept, actorId: wizardId })).state;
}

function battleAfterGoblinFailedSleepRepeatSave(input: {
  readonly battle: string;
  readonly helperInitiative: number;
  readonly targetConditions?: Parameters<typeof characterSeed>[0]["conditions"];
}): BattleState {
  const goblinTurn = battleAfterFailedSleepInitialSave(input);
  const repeatSave = requireHole(
    endTurn({ state: goblinTurn, actorId: goblinId }),
    "savingThrowOutcome",
  );
  return requireResolved(
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
}

function shakeAwakeGoblinFromSleep(state: BattleState): BattleState {
  const subject = sleepShakeAwakeSubject();
  const target = findAct(state, subject).initialHoles[0]!;
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [sleepShakeAwakeTargetFill(target)],
    }),
  ).state;
}

function targetFill(
  hole: BattleHole,
  targetId: CombatantId,
  spatialFacts?: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"],
): BattleFill {
  if (hole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  const defaultSpatialFacts =
    hole.requiresTableSpatialFact === true
      ? [
          ...defaultAttackTargetSpatialFacts(targetId),
          ...[wizardId, fighterId].map((casterId) => ({
            kind: "spellTarget" as const,
            casterId,
            targetId,
            spellId: spellIdFromTargetHoleLabel(hole.label),
          })),
          {
            kind: "helpAttackTargetWithin5Feet" as const,
            helperId: fighterId,
            targetEnemyId: targetId,
          },
          {
            kind: "grappleTargetWithinReach" as const,
            grapplerId: fighterId,
            targetId,
          },
          {
            kind: "shoveTargetWithinReach" as const,
            shoverId: fighterId,
            targetId,
          },
          ...[
            combatantId("ally"),
            combatantId("sneak-ally"),
            combatantId("sneak-cancel-ally"),
            combatantId("second-rogue-ally"),
          ].map((allyId) => ({
            kind: "sneakAttackAllyWithin5FeetOfTarget" as const,
            attackerId: targetId === goblinId ? fighterId : goblinId,
            targetId,
            allyId,
          })),
          {
            kind: "sneakAttackAllyWithin5FeetOfTarget" as const,
            attackerId: combatantId("second-rogue"),
            targetId,
            allyId: combatantId("second-rogue-ally"),
          },
        ]
      : [];
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    ...((spatialFacts ?? defaultSpatialFacts).length === 0
      ? {}
      : { spatialFacts: spatialFacts ?? defaultSpatialFacts }),
  };
}

type ObjectTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "objectTargetChoice" }
>;
type SpellObjectTargetFact = Extract<
  ObjectTargetChoiceFill["spatialFacts"][number],
  { readonly kind: "spellObjectTarget" }
>;

function objectTargetFill(input: {
  readonly hole: BattleHole;
  readonly objectId?: ObjectTargetChoiceFill["value"];
  readonly casterId?: CombatantId;
  readonly spellId: string;
  readonly rangeFeet?: SpellObjectTargetFact["rangeFeet"];
  readonly armorClass?: SpellObjectTargetFact["armorClass"];
  readonly damageDisposition?: SpellObjectTargetFact["damageDisposition"];
  readonly spatialFacts?: ObjectTargetChoiceFill["spatialFacts"];
}): ObjectTargetChoiceFill {
  if (input.hole.kind !== "objectTargetChoice") {
    throw new Error("Expected objectTargetChoice hole.");
  }
  const objectId = input.objectId ?? battleObjectId("training-object");
  return {
    kind: "objectTargetChoice",
    holeId: input.hole.holeId,
    value: objectId,
    spatialFacts: input.spatialFacts ?? [
      {
        kind: "spellObjectTarget",
        casterId: input.casterId ?? wizardId,
        objectId,
        spellId: input.spellId,
        rangeFeet: input.rangeFeet ?? movementFeet(60),
        armorClass: input.armorClass ?? armorClass(13),
        damageDisposition: input.damageDisposition ?? {
          kind: "hitPoints",
          hitPoints: Hp(5),
        },
      },
    ],
  };
}

function spellTargetAllocationFill(
  hole: BattleHole,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly count: number;
  }[],
  casterId: CombatantId = wizardId,
): BattleFill {
  if (hole.kind !== "spellTargetAllocation") {
    throw new Error("Expected spellTargetAllocation hole.");
  }
  return {
    kind: "spellTargetAllocation",
    holeId: hole.holeId,
    value: { allocations },
    spatialFacts: allocations.map((allocation) => ({
      kind: "spellTarget",
      casterId,
      targetId: allocation.targetId,
      spellId: hole.spell.spell.id,
    })),
  };
}

function attackTargetFill(
  hole: BattleHole,
  actorId: CombatantId,
  targetId: CombatantId,
  attackName = defaultAttackNameForActor(actorId),
  extraFacts: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"] = [],
): BattleFill {
  return targetFill(hole, targetId, [
    attackTargetSpatialFact(actorId, targetId, attackName),
    ...commonSneakAttackSpatialFacts(actorId, targetId),
    ...(extraFacts ?? []),
  ]);
}

function attackTargetSpatialFact(
  actorId: CombatantId,
  targetId: CombatantId,
  attackName: string,
): NonNullable<
  Extract<BattleFill, { readonly kind: "targetChoice" }>["spatialFacts"]
>[number] {
  return attackName === "Shortbow" || attackName === "Longbow"
    ? {
        kind: "attackTargetInRangedRange" as const,
        actorId,
        targetId,
        attackName,
        rangeBand: "normal" as const,
      }
    : {
        kind: "attackTargetInMeleeReach" as const,
        actorId,
        targetId,
        attackName,
      };
}

function defaultAttackNameForActor(actorId: CombatantId): string {
  if (actorId === goblinId) return "Scimitar";
  if (actorId === skeletonId) return "Shortsword";
  return "Longsword";
}

function defaultAttackTargetSpatialFacts(
  targetId: CombatantId,
): readonly NonNullable<
  Extract<BattleFill, { readonly kind: "targetChoice" }>["spatialFacts"]
>[number][] {
  return [
    attackTargetSpatialFact(fighterId, targetId, "Longsword"),
    attackTargetSpatialFact(fighterId, targetId, "Dagger"),
    attackTargetSpatialFact(fighterId, targetId, "Shortsword"),
    attackTargetSpatialFact(fighterId, targetId, "Flail"),
    attackTargetSpatialFact(fighterId, targetId, "Quarterstaff"),
    attackTargetSpatialFact(fighterId, targetId, "Unarmed Strike"),
    attackTargetSpatialFact(wizardId, targetId, "Longsword"),
    attackTargetSpatialFact(goblinId, targetId, "Scimitar"),
    attackTargetSpatialFact(goblinId, targetId, "Shortbow"),
    attackTargetSpatialFact(goblinId, targetId, "Cinder Breath"),
    attackTargetSpatialFact(goblinId, targetId, "Dread Gaze"),
    attackTargetSpatialFact(goblinId, targetId, "Tail Swipe"),
    attackTargetSpatialFact(skeletonId, targetId, "Shortsword"),
    attackTargetSpatialFact(combatantId("second-rogue"), targetId, "Longsword"),
  ];
}

function commonSneakAttackSpatialFacts(
  attackerId: CombatantId,
  targetId: CombatantId,
): readonly NonNullable<
  Extract<BattleFill, { readonly kind: "targetChoice" }>["spatialFacts"]
>[number][] {
  return [
    combatantId("ally"),
    combatantId("sneak-ally"),
    combatantId("sneak-cancel-ally"),
    combatantId("second-rogue-ally"),
  ].map((allyId) => ({
    kind: "sneakAttackAllyWithin5FeetOfTarget" as const,
    attackerId,
    targetId,
    allyId,
  }));
}

function spellIdFromTargetHoleLabel(label: string | undefined): string {
  if (label?.startsWith("Magic Missile") === true) return "magic_missile";
  if (label?.startsWith("Ray of Frost") === true) return "ray_of_frost";
  if (label?.startsWith("Mage Armor") === true) return "mage_armor";
  if (label?.startsWith("Poison Spray") === true) return "poison_spray";
  if (label?.startsWith("Chill Touch") === true) return "chill_touch";
  if (label?.startsWith("Eldritch Blast") === true) return "eldritch_blast";
  if (label?.startsWith("Starry Wisp") === true) return "starry_wisp";
  if (label?.startsWith("Sacred Flame") === true) return "sacred_flame";
  if (label?.startsWith("Inflict Wounds") === true) return "inflict_wounds";
  if (label?.startsWith("Shocking Grasp") === true) return "shocking_grasp";
  if (label?.startsWith("Guiding Bolt") === true) return "guiding_bolt";
  if (label?.startsWith("Ray of Sickness") === true) return "ray_of_sickness";
  if (label?.startsWith("Vicious Mockery") === true) return "vicious_mockery";
  if (label?.startsWith("Ice Knife") === true) return "ice_knife";
  return "";
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
    readonly activatedOngoingFeatureUnitId?: string;
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
      ...(value.activatedOngoingFeatureUnitId === undefined
        ? {}
        : {
            activatedOngoingFeatureUnitId: value.activatedOngoingFeatureUnitId,
          }),
    },
  };
}

function unitFeatureDecisionFill(
  hole: BattleHole,
  value: Extract<
    BattleFill,
    { readonly kind: "unitFeatureDecision" }
  >["value"],
): BattleFill {
  if (hole.kind !== "unitFeatureDecision") {
    throw new Error("Expected unitFeatureDecision hole.");
  }
  return {
    kind: "unitFeatureDecision",
    holeId: hole.holeId,
    value,
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
    readonly speedKind?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["speedKind"];
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: readonly {
      readonly reactorId: CombatantId;
      readonly attackName: string;
    }[];
    readonly greaseGroundDifficultTerrain?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["greaseGroundDifficultTerrain"];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  if (hole.kind !== "movement") {
    throw new Error("Expected movement hole.");
  }
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: value.speedKind ?? "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
      ...(value.greaseGroundDifficultTerrain === undefined
        ? {}
        : { greaseGroundDifficultTerrain: value.greaseGroundDifficultTerrain }),
    },
  };
}

function castGreaseGroundHazardForMovementTest(areaId: string): BattleState {
  const state = startBattleRight({
    battleId: battleId(`battle-grease-movement-${areaId}`),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord("grease")],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const subject: BattleSubject = {
    tag: "actionSpell",
    actorId: wizardId,
    invocation: spellSlotInvocationRef("grease", 1, "greaseGroundHazard"),
    mode: { tag: "cast" },
  };
  const save = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "savingThrowOutcome",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [greaseGroundAreaSavingThrowFill(save, areaId)],
    }),
  ).state;
}

function greaseGroundAreaSavingThrowFill(
  hole: BattleHole,
  areaId: string,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  if (hole.kind !== "savingThrowOutcome") {
    throw new Error("Expected savingThrowOutcome hole.");
  }
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "greaseGroundArea",
        originAnchorId: wizardId,
        affectedTargetIds: [],
        areaId,
      },
      outcomes: [],
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

function shoveOutcomeFill(
  hole: BattleHole,
  value: Extract<BattleFill, { readonly kind: "shoveOutcome" }>["value"],
): Extract<BattleFill, { readonly kind: "shoveOutcome" }> {
  if (hole.kind !== "shoveOutcome") {
    throw new Error("Expected shoveOutcome hole.");
  }
  return {
    kind: "shoveOutcome",
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
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  if (hole.kind !== "savingThrowOutcome") {
    throw new Error("Expected savingThrowOutcome hole.");
  }
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value:
      "spell" in hole && hole.spell.targeting.kind !== "singleCombatant"
        ? {
            area: {
              originAnchorId: wizardId,
              affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
            },
            outcomes,
          }
        : { outcomes },
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
  selectedAttackDamageRiderUnitIds?: readonly string[],
): BattleFill {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    ...(selectedAttackDamageRiderUnitIds === undefined
      ? {}
      : { selectedAttackDamageRiderUnitIds }),
    value: rolledDiceGroups(groups),
  };
}

function attackDamageDispositionHoleAfterDamage(
  state: BattleState,
  targetHole: BattleHole,
  rollHole: BattleHole,
  damageHole: BattleHole,
  targetId: CombatantId,
  damage: number,
): BattleHole {
  return attackDamageDispositionHoleAfterFills(state, fighterAttackSubject(), [
    targetFill(targetHole, targetId),
    attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
    damageRollFill(damageHole, damage),
  ]);
}

function attackDamageDispositionHoleAfterFills(
  state: BattleState,
  subject: BattleSubject,
  fills: readonly BattleFill[],
): BattleHole {
  return requireHole(
    resolveBattleSubject({ state, subject, fills }),
    "attackDamageDisposition",
  );
}

function attackDamageDispositionFill(
  hole: BattleHole,
  value: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >["value"],
): Extract<BattleFill, { readonly kind: "attackDamageDisposition" }> {
  if (hole.kind !== "attackDamageDisposition") {
    throw new Error("Expected attackDamageDisposition hole.");
  }
  return {
    kind: "attackDamageDisposition",
    holeId: hole.holeId,
    value,
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
  readonly side?: typeof partySide | typeof oppositionSide;
  readonly classLevel?: number;
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly currentHp?: number;
  readonly maxHp?: number;
  readonly tempHp?: number;
  readonly conditions?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["conditions"];
  readonly positiveHpUnconscious?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["positiveHpUnconscious"];
  readonly armorClass?: ReturnType<typeof defaultArmorClassState>;
  readonly selectedLoadout?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["selectedLoadout"];
  readonly weaponMasteries?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["weaponMasteries"];
  readonly attack?:
    | Extract<
        BattleCreatureInit["creatureInit"],
        { readonly kind: "character" }
      >["attack"]
    | null;
  readonly unarmedStrike?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unarmedStrike"];
  readonly offHandAttack?: TestCharacterWeaponAttack;
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly unitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
  readonly invocationFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["invocationFeatures"];
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
            itemId: `main:${attack.weapon.id}`,
            unitId: attack.weapon.id,
            grip: "one_handed" as const,
          },
        });
  const classLevels = input.classLevels ?? [
    {
      className: input.spellcasting?.sourceClassName ?? "fighter",
      level: input.classLevel ?? 1,
    },
  ];
  return {
    combatantId: input.combatantId ?? fighterId,
    displayName: input.displayName ?? "Fighter",
    initiative: initiativeScore(input.initiative),
    side: input.side ?? partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("fighter-character"),
      characterUnitRefs: input.characterUnitRefs ?? [],
      classLevels,
      armorClass:
        input.armorClass ?? armorClassStateForLoadout(selectedLoadout),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(input.maxHp ?? 12),
      tempHp: Hp(input.tempHp ?? 0),
      ...(input.conditions === undefined
        ? {}
        : { conditions: input.conditions }),
      ...(input.positiveHpUnconscious === undefined
        ? {}
        : { positiveHpUnconscious: input.positiveHpUnconscious }),
      selectedLoadout,
      ...(input.weaponMasteries === undefined
        ? {}
        : { weaponMasteries: input.weaponMasteries }),
      attack,
      unarmedStrike: input.unarmedStrike ?? testUnarmedStrikeDamageAttack(),
      ...(input.offHandAttack === undefined
        ? {}
        : { offHandAttack: input.offHandAttack }),
      ...(input.unitFeatures === undefined
        ? {}
        : { unitFeatures: input.unitFeatures }),
      ...(input.invocationFeatures === undefined
        ? {}
        : { invocationFeatures: input.invocationFeatures }),
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

function heavyArmorClassState(): ReturnType<typeof defaultArmorClassState> {
  return {
    ...defaultArmorClassState(),
    base: {
      kind: "armor",
      category: "heavy",
      formula: { kind: "heavy_fixed", ac: 16 },
    },
    armorTraining: new Set(["heavy"]),
    rightHandUse: "mainWeapon",
  };
}

function testLongswordAttack(): TestCharacterWeaponAttack {
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

function testUnarmedStrikeDamageAttack(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["unarmedStrike"] {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
    },
    attackAbility: "str",
    attackAbilityModifier: battleAbilityModifier(3),
    attackBonus: attackBonus(5),
    damageAbilityModifier: battleAbilityModifier(3),
  };
}

function testUnarmedStrikeDieAttack(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["unarmedStrike"] {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: {
        kind: "authoredReplacement",
        sourceUnitId: "test_unarmed_die_profile",
        dice: 1,
        dieSize: 4,
        damageType: "bludgeoning",
      },
    },
    attackAbility: "str",
    attackAbilityModifier: battleAbilityModifier(3),
    attackBonus: attackBonus(5),
    damageAbilityModifier: battleAbilityModifier(3),
  };
}

function testDaggerAttack(): TestCharacterWeaponAttack {
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

function testShortswordAttack(): TestCharacterWeaponAttack {
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

function testQuarterstaffAttack(): TestCharacterWeaponAttack {
  const weapon = decodeUnitRecordSync(weaponQuarterstaffInput);
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Quarterstaff weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: battleAbilityModifier(3),
  };
}

function testGreataxeAttack(
  ability = battleAbilityModifier(3),
): TestCharacterWeaponAttack {
  const weapon = unitLibrary.requireUnit("weapon_greataxe");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Greataxe weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: ability,
  };
}

function testRangedCleaveLongbowAttack(): TestCharacterWeaponAttack {
  const weapon = decodeUnitRecordSync(weaponLongbowInput);
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Longbow weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon: {
      ...weapon,
      mastery: "cleave",
    } satisfies WeaponRecord,
    ability: "dex",
    abilityModifier: battleAbilityModifier(3),
  };
}

function testLightHammerAttack(): TestCharacterWeaponAttack {
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

function testPoisonWeaponAttack(): TestCharacterWeaponAttack {
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
    side: oppositionSide,
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

function monsterMultiattackStatBlock(input?: {
  readonly scimitarCount?: number;
  readonly shortbowCount?: number;
  readonly duplicateScimitarAttack?: boolean;
}): StatBlockRecord {
  const base = statBlockRecord();
  const scimitar = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Scimitar",
  );
  const shortbow = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Shortbow",
  );
  if (scimitar === undefined || shortbow === undefined) {
    throw new Error("Expected Goblin Warrior attack fixtures.");
  }
  return {
    ...base,
    id: "stat_block_multiattack_test_monster",
    statBlock: {
      ...base.statBlock,
      displayName: "Multiattack Test Monster",
      actions: {
        ...base.statBlock.actions,
        multiattacks: [
          {
            name: "Multiattack",
            dispatches: [
              {
                name: "Scimitar",
                count: { kind: "literal", value: input?.scimitarCount ?? 2 },
              },
              {
                name: "Shortbow",
                count: { kind: "literal", value: input?.shortbowCount ?? 1 },
              },
            ],
          },
        ],
        attacks:
          input?.duplicateScimitarAttack === true
            ? [scimitar, { ...shortbow, name: "Scimitar" }]
            : [scimitar, shortbow],
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
    side: oppositionSide,
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
    side: oppositionSide,
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
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

function resource(input?: {
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
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

function supportedBattleUnitRef(unit: UnitRecord): BattleUnitRef {
  const profiles = battleUnitSupportProfilesForUnit({ unit });
  if (Either.isLeft(profiles)) {
    throw new Error(profiles.left.message);
  }
  return {
    unitId: unit.id,
    supportProfiles: profiles.right,
  };
}

function rageResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = barbarianRageUnit();
  if (
    unit.mechanics.family !== "activation" ||
    !("resource" in unit.mechanics)
  ) {
    throw new Error("Expected Rage resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

function innateSorceryResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = unitLibrary.requireUnit("sorcerer_innate_sorcery");
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "activation" ||
    !("resource" in unit.mechanics)
  ) {
    throw new Error("Expected Innate Sorcery resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

function rangerFavoredEnemyResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  const unit = unitLibrary.requireUnit("ranger_favored_enemy");
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "ranger" ||
    unit.mechanics.family !== "passive"
  ) {
    throw new Error("Expected Favored Enemy resource Unit.");
  }
  return {
    unit,
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

function recklessAttackFeature(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"]
>[number] {
  return { unit: barbarianRecklessAttackUnit() };
}

function sneakAttackFeature(input?: {
  readonly acquiredAtLevel?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"]
>[number] {
  return { unit: rogueSneakAttackUnit(input) };
}

function evasionFeature(input?: {
  readonly ability?: "dex" | "con";
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"]
>[number] {
  return { unit: rogueEvasionUnit(input) };
}

function reactionModifierUnitRef(
  unitId: string,
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"]
>[number] {
  return {
    unitId,
    supportProfiles: [REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE],
  };
}

function reactionModifierUnitRefWithProfile(
  unitId: string,
  profile:
    | typeof REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE
    | typeof ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"]
>[number] {
  return {
    unitId,
    supportProfiles: [profile],
  };
}

function monkDeflectAttacksFocusResource(input?: {
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  return {
    unit: unitLibrary.requireUnit("monk_deflect_attacks"),
    ...(input?.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

function cuttingWordsResource(input?: {
  readonly unit?: Extract<UnitRecord, { readonly kind: "class_feature" }>;
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  return {
    unit: input?.unit ?? cuttingWordsUnit(),
    usesRemaining: input?.usesRemaining ?? 1,
  };
}

function bardicInspirationUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = unitLibrary.requireUnit("bard_bardic_inspiration");
  if (unit.kind !== "class_feature") {
    throw new Error("Expected Bardic Inspiration class feature Unit.");
  }
  return unit;
}

function bardicInspirationSubject(unitId: string): BattleSubject {
  return { tag: "unitFeature", actorId: fighterId, unitId };
}

function bardicInspirationResource(input: {
  readonly charismaModifier: number;
  readonly usesRemaining?: number;
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"]
>[number] {
  return {
    unit: bardicInspirationUnit(),
    capAbilityModifier: battleAbilityModifier(input.charismaModifier),
    ...(input.usesRemaining === undefined
      ? {}
      : { usesRemaining: input.usesRemaining }),
  };
}

function bardicInspirationBattle(input: {
  readonly charismaModifier: number;
  readonly bardHidden?: boolean;
  readonly targetConditions?: readonly Condition[];
}): BattleState {
  const state = startBattleRight({
    battleId: battleId("battle-bardic-inspiration-grant"),
    combatants: [
      characterSeed({
        combatantId: fighterId,
        displayName: "Bard",
        initiative: 20,
        classLevels: [{ className: "bard", level: 1 }],
        attack: null,
        resources: [
          bardicInspirationResource({
            charismaModifier: input.charismaModifier,
          }),
        ],
        characterUnitRefs: [
          {
            unitId: bardicInspirationUnit().id,
            supportProfiles: [BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE],
          },
        ],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  let combatants: Map<CombatantId, BattleCreatureState> = new Map(
    state.combatants,
  );
  if (input.targetConditions !== undefined) {
    const target = combatants.get(goblinId);
    if (target === undefined) {
      throw new Error("Expected Bardic Inspiration target fixture.");
    }
    if (target.positiveHpUnconscious !== null) {
      throw new Error("Expected conscious Bardic Inspiration target fixture.");
    }
    combatants = combatants.set(goblinId, {
      ...target,
      conditions: input.targetConditions.reduce(
        (conditions, condition) => applyCondition(conditions, condition),
        target.conditions,
      ),
    });
  }
  if (input.bardHidden === true) {
    const bard = combatants.get(fighterId);
    if (bard === undefined) {
      throw new Error("Expected Bard fixture.");
    }
    combatants = combatants.set(fighterId, {
      ...bard,
      hidden: { discoveryDc: difficultyClass(16) },
    });
  }
  return { ...state, combatants };
}

function bardicInspirationTargetFill(
  hole: BattleHole,
  targetId: CombatantId,
  input?: { readonly canHear?: boolean },
): BattleFill {
  return targetFill(hole, targetId, [
    {
      kind: "bardicInspirationTargetWithinRange",
      bardId: fighterId,
      targetId,
      unitId: bardicInspirationUnit().id,
      rangeFeet: movementFeet(60),
    },
    ...(input?.canHear === true
      ? [
          {
            kind: "bardicInspirationTargetCanHear" as const,
            bardId: fighterId,
            targetId,
            unitId: bardicInspirationUnit().id,
          },
        ]
      : []),
  ]);
}

function grantBardicInspirationToGoblin(): BattleState {
  const bardicInspiration = bardicInspirationUnit();
  const state = bardicInspirationBattle({ charismaModifier: 3 });
  const subject = bardicInspirationSubject(bardicInspiration.id);
  const target = findHole(findAct(state, subject).initialHoles, "targetChoice");
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [bardicInspirationTargetFill(target, goblinId)],
    }),
  ).state;
}

function combatantHasBardicInspirationDie(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  return (
    state.combatants
      .get(actorId)
      ?.activeEffects.some(
        (effect) => effect.kind === "bardicInspirationDie",
      ) ?? false
  );
}

function bardicInspirationStaleTargetHole(): BattleHole {
  const unit = bardicInspirationUnit();
  const protocolId = `battle:unit-feature:${unit.id}:target`;
  return {
    kind: "targetChoice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: `${unit.name} target`,
    requiresTableSpatialFact: true,
    choices: [goblinId],
  };
}

function characterResourceUses(
  state: BattleState,
  actorId: CombatantId,
): readonly unknown[] {
  const actor = state.combatants.get(actorId);
  return actor?.origin.kind === "character"
    ? actor.origin.resources.map((resource) =>
        "usesRemaining" in resource ? resource.usesRemaining : undefined,
      )
    : [];
}

function goblinAttacksReactionModifierCharacter(input: {
  readonly unit: Extract<UnitRecord, { readonly kind: "class_feature" }>;
  readonly className: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"][number]["className"];
  readonly level: number;
  readonly unitId: string;
  readonly armorClass?: ReturnType<typeof defaultArmorClassState>;
  readonly resources?: NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["resources"]
  >;
}): BattleState {
  return startBattleRight({
    battleId: battleId(`battle-${input.unitId}`),
    combatants: [
      statBlockCreatureInit({ initiative: 20 }),
      characterSeed({
        combatantId: fighterId,
        displayName: input.unit.name,
        initiative: 10,
        classLevels: [{ className: input.className, level: input.level }],
        attack: null,
        ...(input.armorClass === undefined
          ? {}
          : { armorClass: input.armorClass }),
        ...(input.resources === undefined
          ? {}
          : { resources: input.resources }),
        unitFeatures: [{ unit: input.unit }],
        characterUnitRefs: [reactionModifierUnitRef(input.unitId)],
      }),
    ],
  });
}

function goblinScimitarHitReactionSetup(state: BattleState): {
  readonly subject: BattleSubject;
  readonly prefixFills: readonly BattleFill[];
  readonly result: ReturnType<typeof resolveBattleSubject>;
} {
  const subject: BattleSubject = {
    tag: "action",
    actorId: goblinId,
    action: "attack",
    attackName: "Scimitar",
  };
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, fighterId)],
    }),
    "attackRoll",
  );
  const prefixFills = [
    targetFill(target, fighterId),
    attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
  ];
  const result = resolveBattleSubject({ state, subject, fills: prefixFills });
  return { subject, prefixFills, result };
}

function resolveGoblinScimitarHitReduction(input: {
  readonly state: BattleState;
  readonly unitId: string;
  readonly reductionRoll?: number;
  readonly damageRoll: number;
}): ReturnType<typeof resolveBattleSubject> {
  const setup = goblinScimitarHitReactionSetup(input.state);
  if (setup.result.tag !== "needsHoles") {
    throw new Error("Expected attack-hit Reaction window.");
  }
  const choice = reactionModifierChoice(
    setup.result.snapshot.pendingReaction!.choices,
    input.unitId,
    "attackDamageReduction",
  );
  const fills =
    input.reductionRoll === undefined
      ? []
      : [
          {
            kind: "rolledDice" as const,
            holeId: choice.initialHoles[0]!.holeId,
            value: [rolledDiceGroup([input.reductionRoll])] as const,
          },
        ];
  const afterReaction = resolveBattleReaction({
    state: setup.result.state,
    fill: reactionDecisionFill(
      findHole(setup.result.holes, "reactionDecision"),
      {
        kind: "resolve",
        reactorId: fighterId,
        choice: {
          kind: "reactionRollOrDamageReduction",
          unitId: input.unitId,
          modifierKind: "attackDamageReduction",
          fills,
        },
      },
    ),
  });
  if (afterReaction.tag !== "needsHoles") {
    throw new Error("Expected damage roll after hit reduction.");
  }
  const damage = requireHole(afterReaction, "rolledDice");
  const result = resolveBattleSubject({
    state: afterReaction.state,
    subject: setup.subject,
    fills: [
      ...setup.prefixFills,
      {
        kind: "rolledDice",
        holeId: damage.holeId,
        value: [rolledDiceGroup([input.damageRoll])] as const,
      },
    ],
  });
  if (result.tag !== "needsHoles") {
    return result;
  }
  if (
    result.snapshot.pendingReaction === null &&
    !result.holes.some((hole) => hole.kind === "concentrationSavingThrow")
  ) {
    throw new Error("Expected attack-damage Reaction or Concentration window.");
  }
  return result;
}

function reactionModifierChoice(
  choices: ReadonlyArray<
    NonNullable<
      ReturnType<typeof snapshotBattle>["pendingReaction"]
    >["choices"][number]
  >,
  unitId: string,
  modifierKind:
    | "attackRollReduction"
    | "damageRollReduction"
    | "attackDamageReduction",
) {
  const choice = choices.find(
    (candidate) =>
      candidate.kind === "reactionRollOrDamageReduction" &&
      candidate.choice.unitId === unitId &&
      candidate.choice.kind === modifierKind,
  );
  if (choice?.kind !== "reactionRollOrDamageReduction") {
    throw new Error(
      `Expected ${unitId} ${modifierKind} reaction choice among ${JSON.stringify(
        choices.map((candidate) =>
          candidate.kind === "reactionRollOrDamageReduction"
            ? {
                kind: candidate.kind,
                unitId: candidate.choice.unitId,
                modifierKind: candidate.choice.kind,
              }
            : { kind: candidate.kind },
        ),
      )}.`,
    );
  }
  return choice;
}

function reactionModifierReductionRollFill(
  choice: ReturnType<typeof reactionModifierChoice>,
  roll: number,
): BattleFill {
  const hole = choice.initialHoles[0];
  if (hole?.kind !== "rolledDice") {
    throw new Error("Expected Reaction modifier roll hole.");
  }
  return damageRollFill(hole, roll);
}

function reactionChoiceWithSubject(
  choices: ReadonlyArray<
    NonNullable<
      ReturnType<typeof snapshotBattle>["pendingReaction"]
    >["choices"][number]
  >,
) {
  const choice = choices[0];
  if (choice === undefined || !("subject" in choice)) {
    throw new Error("Expected subject-backed reaction choice.");
  }
  return choice;
}

function rogueSneakAttackUnit(input?: {
  readonly acquiredAtLevel?: number;
}): Extract<UnitRecord, { readonly kind: "class_feature" }> {
  return {
    id: "rogue_sneak_attack",
    kind: "class_feature",
    name: "Sneak Attack",
    className: "rogue",
    acquiredAtLevel: input?.acquiredAtLevel ?? 1,
    description:
      "Once per turn, deal extra damage to one creature hit with an eligible attack roll.",
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Rogue#Sneak Attack",
    },
    mechanics: {
      family: "on_hit_trigger",
      trigger: {
        kind: "hit_with_attack_roll",
        weaponFilter: "finesse_or_ranged",
        eligibility:
          "advantage_or_non_incapacitated_ally_within_5ft_of_target_without_disadvantage",
      },
      optional: true,
      usageLimit: { kind: "once_per_turn" },
      effect: {
        kind: "add_attack_damage_dice",
        dice: {
          kind: "class_level_table",
          dieSize: 6,
          dice: [
            { atLevel: 1, count: 1 },
            { atLevel: 3, count: 2 },
            { atLevel: 5, count: 3 },
            { atLevel: 7, count: 4 },
            { atLevel: 9, count: 5 },
            { atLevel: 11, count: 6 },
            { atLevel: 13, count: 7 },
            { atLevel: 15, count: 8 },
            { atLevel: 17, count: 9 },
            { atLevel: 19, count: 10 },
          ],
        },
        damageType: "same_as_attack",
      },
    },
  };
}

function rogueEvasionUnit(input?: {
  readonly ability?: "dex" | "con";
}): Extract<UnitRecord, { readonly kind: "class_feature" }> {
  return {
    id: "rogue_evasion",
    kind: "class_feature",
    name: "Evasion",
    className: "rogue",
    acquiredAtLevel: 7,
    description:
      "When a Dexterity Saving Throw would allow half damage, take no damage on success and half damage on failure.",
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Rogue#Evasion",
    },
    mechanics: {
      family: "save_damage_replacement",
      trigger: {
        kind: "saving_throw_damage",
        ability: input?.ability ?? "dex",
        successDamage: "half_damage",
      },
      replacement: { onSuccess: "no_damage", onFail: "half_damage" },
      suppressedBy: [{ kind: "condition", condition: "incapacitated" }],
    },
  };
}

function uncannyDodgeUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: "rogue_uncanny_dodge",
    kind: "class_feature",
    name: "Uncanny Dodge",
    className: "rogue",
    acquiredAtLevel: 5,
    description:
      "Take a Reaction to halve damage from an attack roll that hits you.",
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Rogue#Uncanny Dodge",
    },
    mechanics: {
      family: "reaction_roll_or_damage_reduction",
      modifiers: [
        {
          kind: "attack_damage_reduction",
          trigger: {
            kind: "hit_by_attack_roll",
            requiresVisibleAttacker: true,
          },
          reduction: { kind: "half_damage", rounding: "down" },
        },
      ],
    },
  };
}

function cuttingWordsUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: "bard_cutting_words",
    kind: "class_feature",
    name: "Cutting Words",
    className: "bard",
    acquiredAtLevel: 3,
    description:
      "Take a Reaction and expend Bardic Inspiration to reduce an attack roll or damage roll.",
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Bard#Cutting Words",
    },
    mechanics: {
      family: "reaction_roll_or_damage_reduction",
      resource: {
        kind: "use_count",
        cap: { kind: "ability_modifier", ability: "cha" },
      },
      resetCadence: { kind: "long_rest" },
      modifiers: [
        {
          kind: "attack_roll_reduction",
          trigger: {
            kind: "creature_succeeds_attack_roll",
            rangeFeet: 60,
            requiresVisibleCreature: true,
          },
          reduction: { kind: "bardic_inspiration_die" },
        },
        {
          kind: "damage_roll_reduction",
          trigger: {
            kind: "creature_makes_damage_roll",
            rangeFeet: 60,
            requiresVisibleCreature: true,
          },
          reduction: { kind: "bardic_inspiration_die" },
        },
        {
          kind: "ability_check_reduction",
          trigger: {
            kind: "creature_succeeds_ability_check",
            rangeFeet: 60,
            requiresVisibleCreature: true,
          },
          reduction: { kind: "bardic_inspiration_die" },
        },
      ],
    },
  };
}

function cuttingWordsDamageOnlyUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = cuttingWordsUnit();
  if (unit.mechanics.family !== "reaction_roll_or_damage_reduction") {
    throw new Error("Expected Cutting Words reaction modifier mechanics.");
  }
  const damageRollModifier = unit.mechanics.modifiers.find(
    (modifier) => modifier.kind === "damage_roll_reduction",
  );
  if (damageRollModifier === undefined) {
    throw new Error("Expected Cutting Words damage-roll modifier.");
  }
  return {
    ...unit,
    id: "bard_cutting_words_damage_test",
    provenance: {
      kind: "xphb",
      section: "structured-input-only",
    },
    mechanics: {
      ...unit.mechanics,
      modifiers: [damageRollModifier],
    },
  };
}

function cuttingWordsAttackOnlyUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = cuttingWordsUnit();
  if (unit.mechanics.family !== "reaction_roll_or_damage_reduction") {
    throw new Error("Expected Cutting Words reaction modifier mechanics.");
  }
  const attackRollModifier = unit.mechanics.modifiers.find(
    (modifier) => modifier.kind === "attack_roll_reduction",
  );
  if (attackRollModifier === undefined) {
    throw new Error("Expected Cutting Words attack-roll modifier.");
  }
  return {
    ...unit,
    id: "bard_cutting_words_attack_test",
    provenance: {
      kind: "xphb",
      section: "structured-input-only",
    },
    mechanics: {
      ...unit.mechanics,
      modifiers: [attackRollModifier],
    },
  };
}

function unsupportedAbilityModifierActivationUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: "ranger_tireless_test",
    kind: "class_feature",
    name: "Tireless Test",
    className: "ranger",
    acquiredAtLevel: 10,
    description:
      "Unsupported ability-modifier activation resource fixture for admission.",
    provenance: {
      kind: "xphb",
      section: "structured-input-only",
    },
    mechanics: {
      family: "activation",
      activationCost: { kind: "standard_action", action: "magic" },
      resource: {
        kind: "use_count",
        cap: { kind: "ability_modifier", ability: "wis" },
      },
      resetCadence: { kind: "long_rest" },
      phases: [
        {
          kind: "direct",
          attachment: { kind: "self" },
          effects: [
            {
              kind: "grant_temp_hp",
              amount: {
                kind: "fixed",
                expr: {
                  dice: 1,
                  dieSize: 8,
                  abilityModifier: "wis",
                },
              },
            },
          ],
        },
      ],
    },
  };
}

function barbarianRageUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: "barbarian_rage",
    kind: "class_feature",
    name: "Rage",
    className: "barbarian",
    acquiredAtLevel: 1,
    description:
      "Enter a Rage as a Bonus Action, gaining Bludgeoning, Piercing, and Slashing Resistance and bonus damage for Strength weapon or Unarmed Strike attacks.",
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Barbarian#Rage",
    },
    mechanics: {
      family: "activation",
      activationCost: { kind: "bonus_action" },
      ongoingFeature: {
        activationTiming: "activation_cost",
        lifecycle: {
          kind: "round_extended",
          initialExpiration: "end_of_next_turn",
          earlyEndConditions: ["incapacitated"],
          earlyEndArmorCategories: ["heavy"],
          extensionTriggers: [
            "attack_roll_against_enemy",
            "bonus_action",
            "enemy_saving_throw",
          ],
          maximumDuration: { unit: "minute", amount: 10 },
        },
        concentrationEffect: "break_and_prevent",
        actionRestrictions: ["spellcasting"],
        levelOverrides: [
          {
            atClassLevel: 15,
            lifecycle: {
              kind: "fixed_duration",
              duration: { unit: "minute", amount: 10 },
              earlyEndConditions: ["unconscious"],
              earlyEndArmorCategories: ["heavy"],
            },
          },
        ],
      },
      resource: {
        kind: "use_count",
        cap: {
          kind: "threshold_tiers",
          axis: "class",
          base: 2,
          tiers: [
            { atLevel: 3, value: 3 },
            { atLevel: 6, value: 4 },
            { atLevel: 12, value: 5 },
            { atLevel: 17, value: 6 },
          ],
        },
      },
      resetCadence: { kind: "partial_short_full_long", shortRestRefill: 1 },
      phases: [
        {
          kind: "direct",
          attachment: { kind: "self" },
          effects: [
            { kind: "grant_resistance", damageType: "bludgeoning" },
            { kind: "grant_resistance", damageType: "piercing" },
            { kind: "grant_resistance", damageType: "slashing" },
            {
              kind: "modify_damage_numeric",
              delta: {
                kind: "threshold_tiers",
                axis: "class",
                base: 2,
                tiers: [
                  { atLevel: 9, value: 3 },
                  { atLevel: 16, value: 4 },
                ],
                sign: "+",
              },
              abilityFilter: ["str"],
            },
          ],
        },
      ],
    },
  };
}

function barbarianRecklessAttackUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  return {
    id: "barbarian_reckless_attack",
    kind: "class_feature",
    name: "Reckless Attack",
    className: "barbarian",
    acquiredAtLevel: 2,
    description:
      "Attack recklessly to gain Advantage on Strength attack rolls while attacks against you also have Advantage.",
    provenance: {
      kind: "srd-5.2.1",
      section: "Classes/Barbarian#Reckless Attack",
    },
    mechanics: {
      family: "activation",
      activationCost: { kind: "free" },
      ongoingFeature: {
        activationTiming: "first_attack_roll",
        lifecycle: {
          kind: "turn_boundary",
          initialExpiration: "start_of_next_turn",
          earlyEndConditions: [],
          earlyEndArmorCategories: [],
        },
        actionRestrictions: [],
      },
      usageLimit: { kind: "once_per_turn" },
      phases: [
        {
          kind: "direct",
          attachment: { kind: "self" },
          effects: [
            {
              kind: "modify_roll_advantage",
              mode: "advantage",
              affects: "self_roll",
              on: ["attack_roll"],
              abilityFilter: ["str"],
            },
            {
              kind: "modify_roll_advantage",
              mode: "advantage",
              affects: "rolls_against_self",
              on: ["attack_roll"],
            },
          ],
        },
      ],
    },
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
          effects: duplicateRuntimeDirectEffects(phase.effects, "Action Surge"),
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
          effects: duplicateRuntimeDirectEffects(phase.effects, "Second Wind"),
        },
      ],
    },
  };
}

function duplicateRuntimeDirectEffects(
  effects: readonly AreaDirectEffectAtom[],
  unitName: string,
): readonly [EffectAtom, ...EffectAtom[]] {
  const runtimeEffects = effects.flatMap((effect): readonly EffectAtom[] =>
    isEffectAtom(effect) ? [effect] : [],
  );
  const duplicatedEffect = runtimeEffects.at(0);
  if (
    runtimeEffects.length !== effects.length ||
    duplicatedEffect === undefined
  ) {
    throw new Error(`Expected ${unitName} direct EffectAtom phase.`);
  }
  return [duplicatedEffect, ...runtimeEffects];
}

function wizardVsSkeletonBattle(input?: {
  readonly extraCombatants?: readonly BattleCreatureInit[];
}): BattleState {
  return startBattleRight({
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
  });
}

function wizardVsRogueBattle(input: {
  readonly evasion: boolean;
  readonly saveDamageReplacementSupport?: boolean;
  readonly evasionAbility?: "dex" | "con";
}): BattleState {
  const supportEvasion =
    input.evasion && input.saveDamageReplacementSupport !== false;
  return startBattleRight({
    battleId: battleId("battle-wizard-rogue"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        spellcasting: wizardSpellcasting({
          cantrips: [dexHalfDamageCantrip()],
          preparedSpells: [],
        }),
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: input.evasion ? "Evasive Rogue" : "Rogue",
        initiative: 10,
        classLevels: [{ className: "rogue", level: 7 }],
        attack: null,
        unitFeatures: input.evasion
          ? [
              input.evasionAbility === undefined
                ? evasionFeature()
                : evasionFeature({ ability: input.evasionAbility }),
            ]
          : [],
        characterUnitRefs: supportEvasion
          ? [
              {
                unitId: "rogue_evasion",
                supportProfiles: [SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE],
              },
            ]
          : [],
      }),
    ],
  });
}

function wizardSpellcasting(input?: {
  readonly cantrips?: readonly SpellRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 2 | 3 | 4 | 5;
    readonly count: number;
  }[];
  readonly invocationSpellAccesses?: NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["spellcasting"]
  >["invocationSpellAccesses"];
}): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"]
> {
  return {
    sourceClassName: "wizard",
    spellcastingAbilityModifier: 3,
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    cantrips: input?.cantrips ?? [
      spellRecord("ray_of_frost"),
      spellRecord("acid_splash"),
    ],
    preparedSpells: input?.preparedSpells ?? [spellRecord("magic_missile")],
    featurePreparedSpells: [],
    invocationSpellAccesses: input?.invocationSpellAccesses ?? [],
    spellSlots: input?.spellSlots ?? [{ spellLevel: 1, count: 2 }],
  };
}

function dexHalfDamageCantrip(): SpellRecord {
  const spell = spellRecord("acid_splash");
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected Acid Splash activation spell.");
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    throw new Error("Expected Acid Splash save-gate phase.");
  }
  return {
    ...spell,
    id: "dex_half_cantrip",
    name: "Dex Half Cantrip",
    mechanics: {
      ...spell.mechanics,
      phases: [
        {
          ...phase,
          onSuccess: { kind: "half_damage" },
        },
      ],
    },
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

function slotAttackDamageSpell(input?: {
  readonly id?: string;
  readonly name?: string;
  readonly axis?: "character" | "slot";
}): SpellRecord {
  const spell = spellRecord("ray_of_frost");
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected Ray of Frost activation spell.");
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "attack_roll") {
    throw new Error("Expected Ray of Frost spell attack phase.");
  }
  const damageEffect = phase.onHit[0];
  if (damageEffect?.kind !== "damage") {
    throw new Error("Expected Ray of Frost damage effect.");
  }
  return {
    ...spell,
    id: input?.id ?? "slot_attack_damage",
    name: input?.name ?? "Slot Attack Damage",
    mechanics: {
      ...spell.mechanics,
      level: 1,
      phases: [
        {
          ...phase,
          onHit: [
            {
              ...damageEffect,
              amount: {
                kind: "linear_per_level",
                axis: input?.axis ?? "slot",
                startingAtLevel: 1,
                base: { dice: 2, dieSize: 8 },
                perLevel: { dice: 1 },
              },
            },
          ],
        },
      ],
    },
  };
}

function slotSaveDamageSpell(): SpellRecord {
  const spell = spellRecord("acid_splash");
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected Acid Splash activation spell.");
  }
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "save_gate" || phase.onFail.kind !== "damage") {
    throw new Error("Expected Acid Splash save-gate damage phase.");
  }
  return {
    ...spell,
    id: "slot_save_damage",
    name: "Slot Save Damage",
    mechanics: {
      ...spell.mechanics,
      level: 1,
      phases: [
        {
          ...phase,
          onFail: {
            ...phase.onFail,
            amount: {
              kind: "linear_per_level",
              axis: "slot",
              startingAtLevel: 1,
              base: { dice: 2, dieSize: 6 },
              perLevel: { dice: 1 },
            },
          },
        },
      ],
    },
  };
}

function spellRecord(
  spellId:
    | "magic_missile"
    | "mage_armor"
    | "ray_of_frost"
    | "acid_splash"
    | "chill_touch"
    | "eldritch_blast"
    | "poison_spray"
    | "sacred_flame"
    | "inflict_wounds"
    | "shocking_grasp"
    | "guiding_bolt"
    | "ray_of_sickness"
    | "starry_wisp"
    | "vicious_mockery"
    | "burning_hands"
    | "color_spray"
    | "ice_knife"
    | "grease"
    | "entangle"
    | "sleep"
    | "hunters_mark"
    | "healing_word",
) {
  const unit =
    spellId === "entangle" || spellId === "sleep"
      ? unitLibrary.requireUnit(spellId)
      : testSpellRecords.get(spellId);
  if (unit === undefined) {
    throw new Error(`Expected ${spellId} spell Unit.`);
  }
  if (unit.kind !== "spell") {
    throw new Error(`Expected ${spellId} to be a spell Unit.`);
  }
  return unit satisfies SpellRecord;
}

function magicSubject(
  spellId:
    | "magic_missile"
    | "mage_armor"
    | "ray_of_frost"
    | "acid_splash"
    | "chill_touch"
    | "eldritch_blast"
    | "poison_spray"
    | "sacred_flame"
    | "inflict_wounds"
    | "shocking_grasp"
    | "guiding_bolt"
    | "ray_of_sickness"
    | "starry_wisp"
    | "vicious_mockery"
    | "burning_hands"
    | "color_spray"
    | "ice_knife"
    | "entangle"
    | "sleep"
    | "dex_half_cantrip",
): BattleSubject {
  return {
    tag: "actionSpell",
    actorId: wizardId,
    invocation:
      spellId === "magic_missile"
        ? spellSlotInvocationRef(spellId, 1, "repeatedDamageAllocation")
        : spellId === "mage_armor"
          ? spellSlotInvocationRef(spellId, 1, "persistentArmorEffect")
          : spellId === "inflict_wounds" || spellId === "burning_hands"
            ? spellSlotInvocationRef(spellId, 1, "saveGatedDamage")
            : spellId === "color_spray" || spellId === "entangle"
              ? spellSlotInvocationRef(spellId, 1, "saveGatedCondition")
              : spellId === "sleep"
                ? spellSlotInvocationRef(spellId, 1, "sleepTargetAdmission")
                : spellId === "ice_knife"
                  ? spellSlotInvocationRef(spellId, 1, "attackBurstSaveDamage")
                  : spellId === "vicious_mockery"
                    ? cantripSpellInvocationRef(spellId, "saveGatedDamage")
                    : spellId === "guiding_bolt" ||
                        spellId === "ray_of_sickness"
                      ? spellSlotInvocationRef(spellId, 1, "spellAttackDamage")
                      : spellId === "eldritch_blast"
                        ? cantripSpellInvocationRef(
                            spellId,
                            "spellAttackBeamSequence",
                          )
                        : spellId === "ray_of_frost" ||
                            spellId === "poison_spray" ||
                            spellId === "chill_touch" ||
                            spellId === "shocking_grasp" ||
                            spellId === "starry_wisp"
                          ? cantripSpellInvocationRef(
                              spellId,
                              "spellAttackDamage",
                            )
                          : cantripSpellInvocationRef(
                              spellId,
                              "saveGatedDamage",
                            ),
    mode: { tag: "cast" },
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
