// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.find-familiar-lifecycle
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84I5 find_familiar
import * as Either from "effect/Either";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  applyCondition,
  type ConditionState,
} from "@dnd/shared-algebras/conditions-algebra";
import { Hp } from "@dnd/shared/types";
import {
  abilityModifier,
  attackBonus,
  DieRollResult,
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
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  admitPresentFindFamiliarToBattle,
  applyFindFamiliarZeroHitPointDisappearance,
  battleCombatantSide,
  battleId,
  battleObjectId,
  BattleSnapshotSchema,
  castFindFamiliar,
  characterId,
  combatantId,
  deliverTouchSpellThroughFindFamiliar,
  discoverBattleActs,
  findFamiliarFormEligibilityForSpell,
  findFamiliarCreatureTypeOverrideForOwner,
  findFamiliarTelepathicConnection,
  initiativeScore,
  permanentlyDismissFindFamiliar,
  reappearTemporarilyDismissedFindFamiliar,
  removeBattleCombatants,
  resolveBattleReaction,
  resolveBattleSubject,
  shareFindFamiliarSenses,
  snapshotBattle,
  startBattle,
  temporarilyDismissFindFamiliar,
  type BattleFill,
  type BattleHole,
  type BattleCreatureInit,
  type BattleState,
  type FindFamiliarFormEligibility,
  type PactOfTheChainFamiliarAttackSubject,
} from "./index.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer.ts";
import { battleCreatureStateWithoutKnockOut } from "./battle-reducer/creature-state.ts";
import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";

const partySide = battleCombatantSide("party");
const enemySide = battleCombatantSide("enemy");
const casterId = combatantId("caster");
const familiarId = combatantId("caster-familiar");
const otherCombatantId = combatantId("other-combatant");
const enemyId = combatantId("enemy");
const replacementFamiliarId = combatantId("replacement-familiar");
const droppedObjectId = battleObjectId("familiar-pack");

const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (statBlockCatalogResult.tag !== "ok") {
  throw new Error("Expected SRD Stat Block catalog for tests.");
}
const statBlockCatalog = statBlockCatalogResult.catalog;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Expected SRD Unit catalog for tests.");
}
const unitCatalog = unitCatalogResult.catalog;
const findFamiliarSpell = requireSpellRecord("find_familiar");
const cureWoundsSpell = requireSpellRecord("cure_wounds");
const healingWordSpell = requireSpellRecord("healing_word");
const shieldSpell = requireSpellRecord("shield");
const familiarEligibility: FindFamiliarFormEligibility =
  requireFindFamiliarEligibility(
    findFamiliarFormEligibilityForSpell(findFamiliarSpell),
  );

function requireFindFamiliarEligibility(
  eligibility: FindFamiliarFormEligibility | null,
): FindFamiliarFormEligibility {
  if (eligibility === null) {
    throw new Error("Expected Find Familiar form eligibility.");
  }
  return eligibility;
}

function requireSpellRecord(unitId: string): SpellRecord {
  const unit = unitCatalog.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected ${unitId} spell record.`);
  }
  return unit;
}
const firstTypeOverride = familiarEligibility.creatureTypeOverrideChoices[0];
if (firstTypeOverride === undefined) {
  throw new Error("Expected Find Familiar creature type override choices.");
}

function startFixtureBattle(
  input: {
    readonly extraCombatantId?: typeof otherCombatantId;
    readonly includeEnemy?: boolean;
  } = {},
): BattleState {
  const skeleton = statBlockCatalog.requireStatBlock("stat_block_skeleton");
  const maxHp = literalHp(skeleton);
  const result = startBattle({
    battleId: battleId("find-familiar-lifecycle-test"),
    combatants: [
      {
        combatantId: casterId,
        displayName: "Caster",
        initiative: initiativeScore(12),
        side: partySide,
        creatureInit: {
          kind: "statBlock",
          statBlock: skeleton,
          currentHp: maxHp,
          maxHp,
          tempHp: Hp(0),
        },
      },
      ...(input.includeEnemy === true
        ? [
            {
              combatantId: enemyId,
              displayName: "Enemy",
              initiative: initiativeScore(10),
              side: enemySide,
              creatureInit: {
                kind: "statBlock" as const,
                statBlock: skeleton,
                currentHp: maxHp,
                maxHp,
                tempHp: Hp(0),
              },
            },
          ]
        : []),
      ...(input.extraCombatantId === undefined
        ? []
        : [
            {
              combatantId: input.extraCombatantId,
              displayName: "Other Combatant",
              initiative: initiativeScore(10),
              side: partySide,
              creatureInit: {
                kind: "statBlock" as const,
                statBlock: skeleton,
                currentHp: maxHp,
                maxHp,
                tempHp: Hp(0),
              },
            },
          ]),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function startSpellcasterFixtureBattle(): BattleState {
  const result = startBattle({
    battleId: battleId("find-familiar-telepathy-test"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Caster",
        initiative: 12,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [cureWoundsSpell, healingWordSpell],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      characterCreature({
        combatantId: enemyId,
        displayName: "Target",
        initiative: 10,
        side: enemySide,
        currentHp: 1,
        maxHp: 12,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function startPactWarlockFixtureBattle(
  input: { readonly targetHasShield?: boolean } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("find-familiar-pact-chain-test"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Pact Warlock",
        initiative: 12,
        side: partySide,
        className: "warlock",
        spellcasting: {
          sourceClassName: "warlock",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [
            {
              tag: "pactOfTheChainFindFamiliar",
              spell: findFamiliarSpell,
            },
          ],
          spellSlots: [],
        },
      }),
      characterCreature({
        combatantId: enemyId,
        displayName: "Target",
        initiative: 10,
        side: enemySide,
        currentHp: 12,
        maxHp: 12,
        ...(input.targetHasShield === true
          ? {
              spellcasting: {
                sourceClassName: "wizard",
                spellcastingAbilityModifier: abilityModifier(3),
                proficiencyBonus: proficiencyBonus(2),
                canCastSpells: true,
                cantrips: [],
                preparedSpells: [shieldSpell],
                featurePreparedSpells: [],
                spellbookRitualSpellAccesses: [],
                invocationSpellAccesses: [],
                spellSlots: [{ spellLevel: 1, count: 1 }],
              },
            }
          : {}),
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function startWrongOwnerPactFixtureBattle(): BattleState {
  const result = startBattle({
    battleId: battleId("find-familiar-pact-chain-wrong-owner-test"),
    combatants: [
      characterCreature({
        combatantId: otherCombatantId,
        displayName: "Other Pact Warlock",
        initiative: 14,
        side: partySide,
        className: "warlock",
        spellcasting: {
          sourceClassName: "warlock",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [
            {
              tag: "pactOfTheChainFindFamiliar",
              spell: findFamiliarSpell,
            },
          ],
          spellSlots: [],
        },
      }),
      characterCreature({
        combatantId: casterId,
        displayName: "Caster",
        initiative: 12,
        side: partySide,
      }),
      characterCreature({
        combatantId: enemyId,
        displayName: "Target",
        initiative: 10,
        side: enemySide,
        currentHp: 12,
        maxHp: 12,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function castCatFamiliar(state: BattleState, id = familiarId) {
  return castFindFamiliar({
    state,
    casterId,
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: {
      tag: "normalNamedForm",
      formId: "cat",
    },
    creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    familiarId: id,
    initiative: initiativeScore(18),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function castCatFamiliarAfterCasterTurn(state: BattleState) {
  return castFindFamiliar({
    state,
    casterId,
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: {
      tag: "normalNamedForm",
      formId: "cat",
    },
    creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    familiarId,
    initiative: initiativeScore(11),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function castRatFamiliar(state: BattleState) {
  return castFindFamiliar({
    state,
    casterId,
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: {
      tag: "normalNamedForm",
      formId: "rat",
    },
    creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    familiarId: replacementFamiliarId,
    initiative: initiativeScore(15),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function literalHp(statBlock: StatBlockRecord): Hp {
  const hp = statBlock.statBlock.hp;
  if (hp.kind !== "literal") {
    throw new Error("Test Stat Block must use literal HP.");
  }
  return Hp(hp.value);
}

function withFreshMagicAction(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: [{ kind: "action", source: "turn" }],
    },
  };
}

function withFamiliarHitPoints(
  state: BattleState,
  currentHp: Hp,
  tempHp: Hp,
): BattleState {
  if (Number(currentHp) <= 0) {
    throw new Error("Test fixture must keep a present familiar above 0 HP.");
  }
  const familiar = state.findFamiliars.get(casterId);
  if (familiar?.status !== "present") {
    throw new Error("Expected present familiar.");
  }
  const combatant = state.combatants.get(familiar.familiarId);
  if (combatant === undefined) {
    throw new Error("Expected familiar combatant.");
  }
  if (combatant.positiveHpUnconscious !== null) {
    throw new Error("Test fixture must not rewrite Knocked Out HP.");
  }
  const nextCombatant = {
    ...battleCreatureStateWithoutKnockOut(
      combatant,
      currentHp,
      combatant.conditions,
    ),
    tempHp,
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      familiar.familiarId,
      nextCombatant,
    ),
  };
}

function initialCombatantOrder(
  ...ids: readonly (
    | typeof casterId
    | typeof familiarId
    | typeof replacementFamiliarId
  )[]
): ReadonlyMap<
  typeof casterId | typeof familiarId | typeof replacementFamiliarId,
  number
> {
  return new Map(ids.map((id, index) => [id, index]));
}

function characterCreature(input: {
  readonly combatantId:
    | typeof casterId
    | typeof enemyId
    | typeof otherCombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof enemySide;
  readonly className?: "wizard" | "warlock";
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly currentHp?: number;
  readonly maxHp?: number;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: input.characterUnitRefs ?? [],
      classLevels: [{ className: input.className ?? "wizard", level: 1 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(input.maxHp ?? 12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function requireHole<K extends BattleHole["kind"]>(
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

function testBattleCreatureStateWithConditions(
  combatant: BattleState["combatants"] extends ReadonlyMap<
    typeof familiarId,
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

function familiarAttackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: enemyId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: familiarId,
        targetId: enemyId,
        attackName: "Scratch",
      },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: { readonly total: number; readonly naturalD20: number },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function reactionDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "reactionDecision" }>,
  value: Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "reactionDecision" }> {
  return { kind: "reactionDecision", holeId: hole.holeId, value };
}

function damageRollFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  faces: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const results = faces.map(DieRollResult);
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      {
        // SRD familiar-form attacks such as Cat Scratch are authored as
        // fixed 0d1+1 damage. The runtime still asks for the rolledDice hole
        // for the fixed expression, but the shared fill type currently brands
        // rolled dice groups as non-empty. There is no parser/generic helper
        // for this zero-dice authored shape, so the test narrows exactly this
        // empty dice group at the call boundary.
        results: results as unknown as Extract<
          BattleFill,
          { readonly kind: "rolledDice" }
        >["value"][number]["results"],
      },
    ],
  };
}

function pactScratchFilledAttackFills(
  state: BattleState,
): readonly BattleFill[] {
  const subject = pactScratchSubject();
  const awaitingTarget = resolveBattleSubject({
    state,
    subject,
    fills: [],
  });
  if (awaitingTarget.tag !== "needsHoles") {
    throw new Error("Expected Pact familiar attack target hole.");
  }
  const target = familiarAttackTargetFill(
    requireHole(awaitingTarget.holes, "targetChoice"),
  );
  const awaitingAttackRoll = resolveBattleSubject({
    state,
    subject,
    fills: [target],
  });
  if (awaitingAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected Pact familiar attack roll hole.");
  }
  const attackRoll = attackRollFill(
    requireHole(awaitingAttackRoll.holes, "attackRoll"),
    {
      naturalD20: 19,
      total: 23,
    },
  );
  const awaitingDamage = resolveBattleSubject({
    state,
    subject,
    fills: [target, attackRoll],
  });
  if (awaitingDamage.tag !== "needsHoles") {
    throw new Error("Expected Pact familiar damage roll hole.");
  }
  return [
    target,
    attackRoll,
    damageRollFill(requireHole(awaitingDamage.holes, "rolledDice"), []),
  ];
}

function pactScratchSubject(
  actorId = casterId,
  subjectFamiliarId = familiarId,
): PactOfTheChainFamiliarAttackSubject {
  return {
    tag: "pactOfTheChainFamiliarAttack",
    actorId,
    familiarId: subjectFamiliarId,
    attackName: "Scratch",
  };
}

describe("Find Familiar lifecycle", () => {
  test("casts a familiar as owner-linked companion combatant state", () => {
    const initial = startFixtureBattle();
    const result = castCatFamiliar(initial);

    expect(result.tag).toBe("resolved");
    if (result.tag !== "resolved") return;
    const familiar = result.state.findFamiliars.get(casterId);
    expect(familiar).toMatchObject({
      status: "present",
      familiarId,
      formAccess: "findFamiliar",
      creatureTypeOverride: firstTypeOverride.creatureType,
      formSelection: { tag: "normalNamedForm", formId: "cat" },
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
    expect(familiar).not.toHaveProperty("ownerId");
    expect(familiar).not.toHaveProperty("resolvedForm");
    expect(result.state.combatants.get(familiarId)).toMatchObject({
      combatantId: familiarId,
      displayName: "Cat",
      initiative: initiativeScore(18),
      side: partySide,
      reactionAvailable: true,
      origin: {
        kind: "statBlock",
        statBlock: expect.objectContaining({
          statBlock: expect.objectContaining({
            creatureType: firstTypeOverride.creatureType,
          }),
        }),
      },
    });
    expect(result.snapshot.turnOrder).toEqual([familiarId, casterId]);
    expect(
      findFamiliarCreatureTypeOverrideForOwner(result.state, casterId),
    ).toBe(firstTypeOverride.creatureType);
    expect(result.snapshot.findFamiliars).toMatchObject([
      {
        ownerId: casterId,
        familiarId,
      },
    ]);
  });

  test("admits a present familiar during battle start from caster spell access", () => {
    const initial = startBattle({
      battleId: battleId("find-familiar-admission-test"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
          side: partySide,
          spellcasting: {
            sourceClassName: "wizard",
            spellcastingAbilityModifier: abilityModifier(3),
            proficiencyBonus: proficiencyBonus(2),
            canCastSpells: true,
            cantrips: [],
            preparedSpells: [findFamiliarSpell],
            featurePreparedSpells: [],
            spellbookRitualSpellAccesses: [],
            invocationSpellAccesses: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          },
        }),
      ],
    });
    expect(Either.isRight(initial)).toBe(true);
    if (Either.isLeft(initial)) return;

    const admitted = admitPresentFindFamiliarToBattle({
      state: initial.right,
      casterId,
      catalog: statBlockCatalog,
      selection: { tag: "normalNamedForm", formId: "owl" },
      creatureTypeOverrideChoiceId: "fey",
      familiarId,
      initiative: initiativeScore(18),
      initialCombatantOrder: initialCombatantOrder(casterId, familiarId),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(Either.isRight(admitted)).toBe(true);
    if (Either.isLeft(admitted)) return;
    expect(admitted.right.findFamiliars.get(casterId)).toMatchObject({
      status: "present",
      familiarId,
      formAccess: "findFamiliar",
      formSelection: { tag: "normalNamedForm", formId: "owl" },
      creatureTypeOverride: "fey",
    });
    expect(admitted.right.combatants.get(familiarId)).toMatchObject({
      displayName: "Owl",
      initiative: initiativeScore(18),
      side: partySide,
    });
  });

  test("preserves battle-start familiar hit points supplied by caller", () => {
    const initial = startBattle({
      battleId: battleId("find-familiar-admission-hp-test"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
          side: partySide,
          spellcasting: {
            sourceClassName: "wizard",
            spellcastingAbilityModifier: abilityModifier(3),
            proficiencyBonus: proficiencyBonus(2),
            canCastSpells: true,
            cantrips: [],
            preparedSpells: [findFamiliarSpell],
            featurePreparedSpells: [],
            spellbookRitualSpellAccesses: [],
            invocationSpellAccesses: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          },
        }),
      ],
    });
    expect(Either.isRight(initial)).toBe(true);
    if (Either.isLeft(initial)) return;

    const admitted = admitPresentFindFamiliarToBattle({
      state: initial.right,
      casterId,
      catalog: statBlockCatalog,
      selection: { tag: "normalNamedForm", formId: "cat" },
      creatureTypeOverrideChoiceId: "fey",
      familiarId,
      initiative: initiativeScore(18),
      currentHp: Hp(1),
      tempHp: Hp(3),
      initialCombatantOrder: initialCombatantOrder(casterId, familiarId),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(Either.isRight(admitted)).toBe(true);
    if (Either.isLeft(admitted)) return;
    expect(admitted.right.combatants.get(familiarId)).toMatchObject({
      displayName: "Cat",
      hp: Hp(1),
      tempHp: Hp(3),
    });
  });

  test("admits a present familiar during battle start from spellbook Ritual access", () => {
    const initial = startBattle({
      battleId: battleId("find-familiar-spellbook-ritual-admission-test"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
          side: partySide,
          spellcasting: {
            sourceClassName: "wizard",
            spellcastingAbilityModifier: abilityModifier(3),
            proficiencyBonus: proficiencyBonus(2),
            canCastSpells: true,
            cantrips: [],
            preparedSpells: [],
            featurePreparedSpells: [],
            spellbookRitualSpellAccesses: [
              {
                tag: "spellbookRitual",
                spell: findFamiliarSpell,
                featureUnitId: "wizard_ritual_adept",
              },
            ],
            invocationSpellAccesses: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          },
          characterUnitRefs: [
            { unitId: "wizard_ritual_adept", supportProfiles: [] },
          ],
        }),
      ],
    });
    expect(Either.isRight(initial)).toBe(true);
    if (Either.isLeft(initial)) return;

    const admitted = admitPresentFindFamiliarToBattle({
      state: initial.right,
      casterId,
      catalog: statBlockCatalog,
      selection: { tag: "normalNamedForm", formId: "owl" },
      creatureTypeOverrideChoiceId: "fey",
      familiarId,
      initiative: initiativeScore(18),
      initialCombatantOrder: initialCombatantOrder(casterId, familiarId),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(Either.isRight(admitted)).toBe(true);
    if (Either.isLeft(admitted)) return;
    expect(admitted.right.findFamiliars.get(casterId)).toMatchObject({
      status: "present",
      familiarId,
      formAccess: "findFamiliar",
      formSelection: { tag: "normalNamedForm", formId: "owl" },
    });
  });

  test("rejects forged spellbook Ritual admission when projected access is absent", () => {
    const initial = startBattle({
      battleId: battleId("find-familiar-spellbook-ritual-proof-test"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
          side: partySide,
          spellcasting: {
            sourceClassName: "wizard",
            spellcastingAbilityModifier: abilityModifier(3),
            proficiencyBonus: proficiencyBonus(2),
            canCastSpells: true,
            cantrips: [],
            preparedSpells: [],
            featurePreparedSpells: [],
            spellbookRitualSpellAccesses: [],
            invocationSpellAccesses: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          },
        }),
      ],
    });
    expect(Either.isRight(initial)).toBe(true);
    if (Either.isLeft(initial)) return;

    const admitted = admitPresentFindFamiliarToBattle({
      state: initial.right,
      casterId,
      catalog: statBlockCatalog,
      selection: { tag: "normalNamedForm", formId: "owl" },
      creatureTypeOverrideChoiceId: "fey",
      familiarId,
      initiative: initiativeScore(18),
      initialCombatantOrder: initialCombatantOrder(casterId, familiarId),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(admitted).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message:
          "Find Familiar admission source actor does not have Find Familiar prepared, available through spellbook Ritual access, or selected through Pact of the Chain.",
      }),
    );
  });

  test("preserves caller initiative tie order for battle-start admission", () => {
    const initial = startBattle({
      battleId: battleId("find-familiar-admission-tie-order-test"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 18,
          side: partySide,
          spellcasting: {
            sourceClassName: "wizard",
            spellcastingAbilityModifier: abilityModifier(3),
            proficiencyBonus: proficiencyBonus(2),
            canCastSpells: true,
            cantrips: [],
            preparedSpells: [findFamiliarSpell],
            featurePreparedSpells: [],
            spellbookRitualSpellAccesses: [],
            invocationSpellAccesses: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          },
        }),
      ],
    });
    expect(Either.isRight(initial)).toBe(true);
    if (Either.isLeft(initial)) return;

    const admitted = admitPresentFindFamiliarToBattle({
      state: initial.right,
      casterId,
      catalog: statBlockCatalog,
      selection: { tag: "normalNamedForm", formId: "owl" },
      creatureTypeOverrideChoiceId: "fey",
      familiarId,
      initiative: initiativeScore(18),
      initialCombatantOrder: initialCombatantOrder(familiarId, casterId),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(Either.isRight(admitted)).toBe(true);
    if (Either.isLeft(admitted)) return;
    expect(snapshotBattle(admitted.right).turnOrder).toEqual([
      familiarId,
      casterId,
    ]);
  });

  test("rejects source-linked familiar admission without Find Familiar access", () => {
    const initial = startFixtureBattle();
    const admitted = admitPresentFindFamiliarToBattle({
      state: initial,
      casterId,
      catalog: statBlockCatalog,
      selection: { tag: "normalNamedForm", formId: "owl" },
      creatureTypeOverrideChoiceId: "fey",
      familiarId,
      initiative: initiativeScore(18),
      initialCombatantOrder: initialCombatantOrder(casterId, familiarId),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(admitted).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message:
          "Find Familiar admission source actor must be a character with Find Familiar access.",
      }),
    );
  });

  test("rejects present familiar admission at 0 HP", () => {
    const initial = startBattle({
      battleId: battleId("find-familiar-zero-hp-admission-test"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
          side: partySide,
          spellcasting: {
            sourceClassName: "wizard",
            spellcastingAbilityModifier: abilityModifier(3),
            proficiencyBonus: proficiencyBonus(2),
            canCastSpells: true,
            cantrips: [],
            preparedSpells: [findFamiliarSpell],
            featurePreparedSpells: [],
            spellbookRitualSpellAccesses: [],
            invocationSpellAccesses: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          },
        }),
      ],
    });
    expect(Either.isRight(initial)).toBe(true);
    if (Either.isLeft(initial)) return;

    const admitted = admitPresentFindFamiliarToBattle({
      state: initial.right,
      casterId,
      catalog: statBlockCatalog,
      selection: { tag: "normalNamedForm", formId: "owl" },
      creatureTypeOverrideChoiceId: "fey",
      familiarId,
      initiative: initiativeScore(18),
      currentHp: Hp(0),
      initialCombatantOrder: initialCombatantOrder(casterId, familiarId),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(admitted).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message: "Present Find Familiar admission requires current HP above 0.",
      }),
    );
  });

  test("rejects present familiar admission above familiar maximum HP", () => {
    const initial = startBattle({
      battleId: battleId("find-familiar-overmax-hp-admission-test"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
          side: partySide,
          spellcasting: {
            sourceClassName: "wizard",
            spellcastingAbilityModifier: abilityModifier(3),
            proficiencyBonus: proficiencyBonus(2),
            canCastSpells: true,
            cantrips: [],
            preparedSpells: [findFamiliarSpell],
            featurePreparedSpells: [],
            spellbookRitualSpellAccesses: [],
            invocationSpellAccesses: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          },
        }),
      ],
    });
    expect(Either.isRight(initial)).toBe(true);
    if (Either.isLeft(initial)) return;

    const admitted = admitPresentFindFamiliarToBattle({
      state: initial.right,
      casterId,
      catalog: statBlockCatalog,
      selection: { tag: "normalNamedForm", formId: "owl" },
      creatureTypeOverrideChoiceId: "fey",
      familiarId,
      initiative: initiativeScore(18),
      currentHp: Hp(2),
      initialCombatantOrder: initialCombatantOrder(casterId, familiarId),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(admitted).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message:
          "Present Find Familiar admission current HP must not exceed maximum HP.",
      }),
    );
  });

  test("rejects incomplete battle-start combatant order maps", () => {
    const initial = startBattle({
      battleId: battleId("find-familiar-incomplete-order-admission-test"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
          side: partySide,
          spellcasting: {
            sourceClassName: "wizard",
            spellcastingAbilityModifier: abilityModifier(3),
            proficiencyBonus: proficiencyBonus(2),
            canCastSpells: true,
            cantrips: [],
            preparedSpells: [findFamiliarSpell],
            featurePreparedSpells: [],
            spellbookRitualSpellAccesses: [],
            invocationSpellAccesses: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          },
        }),
      ],
    });
    expect(Either.isRight(initial)).toBe(true);
    if (Either.isLeft(initial)) return;

    const admitted = admitPresentFindFamiliarToBattle({
      state: initial.right,
      casterId,
      catalog: statBlockCatalog,
      selection: { tag: "normalNamedForm", formId: "owl" },
      creatureTypeOverrideChoiceId: "fey",
      familiarId,
      initiative: initiativeScore(18),
      initialCombatantOrder: new Map([[casterId, 0]]),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(admitted).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message: "Initial combatant order must include every combatant.",
      }),
    );
  });

  test("rejects duplicate source-linked familiar admission for one caster", () => {
    const initial = startBattle({
      battleId: battleId("find-familiar-duplicate-admission-test"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
          side: partySide,
          spellcasting: {
            sourceClassName: "wizard",
            spellcastingAbilityModifier: abilityModifier(3),
            proficiencyBonus: proficiencyBonus(2),
            canCastSpells: true,
            cantrips: [],
            preparedSpells: [findFamiliarSpell],
            featurePreparedSpells: [],
            spellbookRitualSpellAccesses: [],
            invocationSpellAccesses: [],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          },
        }),
      ],
    });
    expect(Either.isRight(initial)).toBe(true);
    if (Either.isLeft(initial)) return;

    const first = admitPresentFindFamiliarToBattle({
      state: initial.right,
      casterId,
      catalog: statBlockCatalog,
      selection: { tag: "normalNamedForm", formId: "owl" },
      creatureTypeOverrideChoiceId: "fey",
      familiarId,
      initiative: initiativeScore(18),
      initialCombatantOrder: initialCombatantOrder(casterId, familiarId),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
    expect(Either.isRight(first)).toBe(true);
    if (Either.isLeft(first)) return;

    const second = admitPresentFindFamiliarToBattle({
      state: first.right,
      casterId,
      catalog: statBlockCatalog,
      selection: { tag: "normalNamedForm", formId: "cat" },
      creatureTypeOverrideChoiceId: "fey",
      familiarId: replacementFamiliarId,
      initiative: initiativeScore(17),
      initialCombatantOrder: initialCombatantOrder(
        casterId,
        replacementFamiliarId,
      ),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(second).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message:
          "Source-linked Find Familiar admission requires at most one familiar per source actor.",
      }),
    );
    expect(first.right.combatants.has(familiarId)).toBe(true);
    expect(first.right.combatants.has(replacementFamiliarId)).toBe(false);
  });

  test("keeps one familiar per caster and atomically replaces form on recast", () => {
    const first = castCatFamiliar(startFixtureBattle());
    expect(first.tag).toBe("resolved");
    if (first.tag !== "resolved") return;

    const second = castRatFamiliar(first.state);

    expect(second.tag).toBe("resolved");
    if (second.tag !== "resolved") return;
    expect(second.state.findFamiliars).toHaveLength(1);
    expect(second.state.combatants.has(familiarId)).toBe(true);
    expect(second.state.combatants.has(replacementFamiliarId)).toBe(false);
    expect(second.state.findFamiliars.get(casterId)).toMatchObject({
      status: "present",
      familiarId,
      formAccess: "findFamiliar",
      formSelection: { tag: "normalNamedForm", formId: "rat" },
    });
    expect(second.state.combatants.get(familiarId)?.displayName).toBe("Rat");
  });

  test("preserves familiar hit points when recasting to adopt a new form", () => {
    const first = castCatFamiliar(startFixtureBattle());
    expect(first.tag).toBe("resolved");
    if (first.tag !== "resolved") return;
    const wounded = withFamiliarHitPoints(first.state, Hp(1), Hp(3));

    const second = castRatFamiliar(wounded);

    expect(second.tag).toBe("resolved");
    if (second.tag !== "resolved") return;
    expect(second.state.combatants.get(familiarId)).toMatchObject({
      displayName: "Rat",
      hp: Hp(1),
      tempHp: Hp(3),
    });
  });

  test("rejects familiar identities that collide with ordinary combatants", () => {
    const casterCollision = castCatFamiliar(startFixtureBattle(), casterId);

    expect(casterCollision.tag).toBe("invalid");
    if (casterCollision.tag !== "invalid") return;
    expect(casterCollision.reason).toBe("invalidFill");
    expect(casterCollision.snapshot.findFamiliars).toEqual([]);

    const otherCollision = castCatFamiliar(
      startFixtureBattle({ extraCombatantId: otherCombatantId }),
      otherCombatantId,
    );

    expect(otherCollision.tag).toBe("invalid");
    if (otherCollision.tag !== "invalid") return;
    expect(otherCollision.reason).toBe("invalidFill");
    expect(otherCollision.snapshot.findFamiliars).toEqual([]);
  });

  test("temporarily dismisses and reappears by Magic-action boundary", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const wounded = withFamiliarHitPoints(cast.state, Hp(1), Hp(3));

    const dismissed = temporarilyDismissFindFamiliar({
      state: wounded,
      casterId,
      heldObjectIds: [droppedObjectId],
    });

    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    expect(dismissed.state.combatants.has(familiarId)).toBe(false);
    expect(dismissed.snapshot.turnOrder).toEqual([casterId]);
    expect(dismissed.state.findFamiliars.get(casterId)).toMatchObject({
      status: "temporarilyDismissed",
      hitPoints: { currentHp: Hp(1), tempHp: Hp(3) },
    });
    expect(dismissed.state.currentTurnResources.actionResources).toEqual([]);
    expect(dismissed.droppedObjects).toEqual([
      {
        kind: "heldObjectDropped",
        actorId: familiarId,
        objectId: droppedObjectId,
        sourceCombatantId: casterId,
        sourceSpellId: "find_familiar",
      },
    ]);

    const blockedReappearance = reappearTemporarilyDismissedFindFamiliar({
      state: dismissed.state,
      casterId,
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      familiarId,
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });
    expect(blockedReappearance.tag).toBe("invalid");
    if (blockedReappearance.tag !== "invalid") return;
    expect(blockedReappearance.reason).toBe("staleSubject");

    const reappeared = reappearTemporarilyDismissedFindFamiliar({
      state: withFreshMagicAction(dismissed.state),
      casterId,
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      familiarId,
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });
    expect(reappeared.tag).toBe("resolved");
    if (reappeared.tag !== "resolved") return;
    expect(reappeared.state.currentTurnResources.actionResources).toEqual([]);
    expect(reappeared.state.combatants.get(familiarId)?.initiative).toBe(
      initiativeScore(14),
    );
    expect(reappeared.state.combatants.get(familiarId)).toMatchObject({
      hp: Hp(1),
      tempHp: Hp(3),
    });
    expect(reappeared.state.findFamiliars.get(casterId)).toMatchObject({
      status: "present",
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });
  });

  test("rejects reappearance with an ordinary combatant identity", () => {
    const cast = castCatFamiliar(
      startFixtureBattle({ extraCombatantId: otherCombatantId }),
    );
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const dismissed = temporarilyDismissFindFamiliar({
      state: cast.state,
      casterId,
    });
    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    const dismissedFamiliar = dismissed.state.findFamiliars.get(casterId);
    if (dismissedFamiliar?.status !== "temporarilyDismissed") {
      throw new Error("Expected temporarily dismissed familiar.");
    }

    const reappeared = reappearTemporarilyDismissedFindFamiliar({
      state: withFreshMagicAction(dismissed.state),
      casterId,
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      familiarId: otherCombatantId,
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });

    expect(reappeared.tag).toBe("invalid");
    if (reappeared.tag !== "invalid") return;
    expect(reappeared.reason).toBe("invalidFill");
    expect(reappeared.snapshot.findFamiliars).toEqual([
      {
        status: "temporarilyDismissed",
        ownerId: casterId,
        formAccess: "findFamiliar",
        formSelection: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverride: firstTypeOverride.creatureType,
        hitPoints: dismissedFamiliar.hitPoints,
      },
    ]);
  });

  test("permanent dismissal removes the active familiar record", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const dismissed = permanentlyDismissFindFamiliar({
      state: cast.state,
      casterId,
    });

    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    expect(dismissed.state.findFamiliars.has(casterId)).toBe(false);
    expect(dismissed.state.combatants.has(familiarId)).toBe(false);
    expect(dismissed.snapshot.turnOrder).toEqual([casterId]);
    expect(dismissed.droppedObjects).toBeUndefined();
  });

  test("0 HP disappearance records absence and leaves recast state", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const disappeared = applyFindFamiliarZeroHitPointDisappearance({
      state: cast.state,
      familiarId,
      heldObjectIds: [droppedObjectId],
    });

    expect(disappeared.tag).toBe("resolved");
    if (disappeared.tag !== "resolved") return;
    expect(disappeared.state.combatants.has(familiarId)).toBe(false);
    expect(disappeared.snapshot.turnOrder).toEqual([casterId]);
    expect(disappeared.state.findFamiliars.get(casterId)).toMatchObject({
      status: "disappearedAtZeroHitPoints",
    });
    expect(disappeared.droppedObjects).toHaveLength(1);

    const recast = castRatFamiliar(disappeared.state);
    expect(recast.tag).toBe("resolved");
    if (recast.tag !== "resolved") return;
    expect(recast.state.findFamiliars.get(casterId)).toMatchObject({
      status: "present",
      familiarId: replacementFamiliarId,
    });
    expect(recast.state.combatants.has(replacementFamiliarId)).toBe(true);
  });

  test("owns its turn and resources while rejecting ordinary attacks", () => {
    const initial = startFixtureBattle({ includeEnemy: true });
    const cast = castFindFamiliar({
      state: initial,
      casterId,
      catalog: statBlockCatalog,
      eligibility: familiarEligibility,
      selection: {
        tag: "normalNamedForm",
        formId: "cat",
      },
      creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
      familiarId,
      initiative: initiativeScore(11),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    expect(cast.snapshot.currentActorId).toBe(casterId);

    const familiarTurn = resolveBattleSubject({
      state: cast.state,
      subject: { tag: "runtimeCommand", actorId: casterId, command: "endTurn" },
      fills: [],
    });
    expect(familiarTurn.tag).toBe("resolved");
    if (familiarTurn.tag !== "resolved") return;
    expect(familiarTurn.snapshot.currentActorId).toBe(familiarId);
    expect(familiarTurn.snapshot.turn.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
    expect(cast.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: familiarId,
          reactionAvailable: true,
        }),
        expect.objectContaining({
          combatantId: casterId,
          reactionAvailable: true,
        }),
      ]),
    );
    const acts = discoverBattleActs(familiarTurn.state);
    expect(acts.map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: "action", action: "dash" }),
        expect.objectContaining({ tag: "action", action: "dodge" }),
        expect.objectContaining({ tag: "runtimeCommand", command: "endTurn" }),
      ]),
    );
    expect(
      acts.some(
        (act) =>
          act.subject.tag === "action" && act.subject.action === "attack",
      ),
    ).toBe(false);

    const attack = resolveBattleSubject({
      state: familiarTurn.state,
      subject: {
        tag: "action",
        actorId: familiarId,
        action: "attack",
        attackName: "Claws",
        statBlockSection: "actions",
      },
      fills: [],
    });
    expect(attack.tag).toBe("invalid");
    if (attack.tag !== "invalid") return;
    expect(attack.message).toBe("Find Familiar familiars can't attack.");
    expect(attack.snapshot.turn.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);

    const dashSubject = acts.find(
      (act) => act.subject.tag === "action" && act.subject.action === "dash",
    )?.subject;
    expect(dashSubject).toBeDefined();
    if (dashSubject === undefined) return;

    const dash = resolveBattleSubject({
      state: familiarTurn.state,
      subject: dashSubject,
      fills: [],
    });
    expect(dash.tag).toBe("resolved");
    if (dash.tag !== "resolved") return;
    expect(dash.snapshot.currentActorId).toBe(familiarId);
    expect(dash.snapshot.turn.actionResources).toEqual([]);
    expect(
      dash.snapshot.combatants.find(
        (combatant) => combatant.combatantId === casterId,
      )?.reactionAvailable,
    ).toBe(true);
  });

  test("cleans familiar-owned readied state when the familiar leaves battle", () => {
    const cast = castCatFamiliarAfterCasterTurn(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const familiarTurn = resolveBattleSubject({
      state: cast.state,
      subject: { tag: "runtimeCommand", actorId: casterId, command: "endTurn" },
      fills: [],
    });
    expect(familiarTurn.tag).toBe("resolved");
    if (familiarTurn.tag !== "resolved") return;

    const readied = resolveBattleSubject({
      state: familiarTurn.state,
      subject: {
        tag: "action",
        actorId: familiarId,
        action: "ready",
        readyTrigger: "attackHit",
      },
      fills: [],
    });
    expect(readied.tag).toBe("resolved");
    if (readied.tag !== "resolved") return;
    expect(readied.state.readiedMovements.has(familiarId)).toBe(true);

    const disappeared = applyFindFamiliarZeroHitPointDisappearance({
      state: readied.state,
      familiarId,
    });
    expect(disappeared.tag).toBe("resolved");
    if (disappeared.tag !== "resolved") return;
    expect(disappeared.state.combatants.has(familiarId)).toBe(false);
    expect(disappeared.state.readiedMovements.has(familiarId)).toBe(false);
    expect(disappeared.snapshot.readiedResponses.movements).toEqual([]);

    const recast = castCatFamiliarAfterCasterTurn(disappeared.state);
    expect(recast.tag).toBe("resolved");
    if (recast.tag !== "resolved") return;
    const secondFamiliarTurn = resolveBattleSubject({
      state: recast.state,
      subject: { tag: "runtimeCommand", actorId: casterId, command: "endTurn" },
      fills: [],
    });
    expect(secondFamiliarTurn.tag).toBe("resolved");
    if (secondFamiliarTurn.tag !== "resolved") return;
    const readiedAgain = resolveBattleSubject({
      state: secondFamiliarTurn.state,
      subject: {
        tag: "action",
        actorId: familiarId,
        action: "ready",
        readyTrigger: "attackHit",
      },
      fills: [],
    });
    expect(readiedAgain.tag).toBe("resolved");
    if (readiedAgain.tag !== "resolved") return;
    expect(readiedAgain.state.readiedMovements.has(familiarId)).toBe(true);

    const dismissed = permanentlyDismissFindFamiliar({
      state: readiedAgain.state,
      casterId,
    });
    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    expect(dismissed.state.combatants.has(familiarId)).toBe(false);
    expect(dismissed.state.readiedMovements.has(familiarId)).toBe(false);
    expect(dismissed.snapshot.readiedResponses.movements).toEqual([]);
  });

  test("generic combatant removal keeps owner and familiar state together", () => {
    const cast = castCatFamiliar(startFixtureBattle({ includeEnemy: true }));
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const ownerRemoved = removeBattleCombatants({
      state: cast.state,
      combatantIds: [casterId],
    });
    expect(Either.isRight(ownerRemoved)).toBe(true);
    if (Either.isLeft(ownerRemoved)) return;
    expect(ownerRemoved.right.combatants.has(casterId)).toBe(false);
    expect(ownerRemoved.right.combatants.has(familiarId)).toBe(false);
    expect(ownerRemoved.right.findFamiliars.has(casterId)).toBe(false);
    expect(snapshotBattle(ownerRemoved.right).findFamiliars).toEqual([]);

    const recast = castCatFamiliar(startFixtureBattle({ includeEnemy: true }));
    expect(recast.tag).toBe("resolved");
    if (recast.tag !== "resolved") return;
    const familiarRemoved = removeBattleCombatants({
      state: recast.state,
      combatantIds: [familiarId],
    });
    expect(Either.isRight(familiarRemoved)).toBe(true);
    if (Either.isLeft(familiarRemoved)) return;
    expect(familiarRemoved.right.combatants.has(casterId)).toBe(true);
    expect(familiarRemoved.right.combatants.has(familiarId)).toBe(false);
    expect(familiarRemoved.right.findFamiliars.has(casterId)).toBe(false);
    expect(snapshotBattle(familiarRemoved.right).findFamiliars).toEqual([]);
  });

  test("ordinary damage to 0 HP makes a present familiar disappear", () => {
    const cast = castCatFamiliar(startFixtureBattle({ includeEnemy: true }));
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const familiar = cast.state.combatants.get(familiarId);
    expect(familiar).toBeDefined();
    if (familiar === undefined) return;

    const damaged = applyBattleHitPointDamage({
      state: cast.state,
      target: familiar,
      damageAmount: Number(familiar.hp),
      deathFailuresAtZeroHp: 1,
    });

    expect(damaged.combatants.has(familiarId)).toBe(false);
    expect(damaged.findFamiliars.get(casterId)).toMatchObject({
      status: "disappearedAtZeroHitPoints",
      formAccess: "findFamiliar",
      formSelection: { tag: "normalNamedForm", formId: "cat" },
      creatureTypeOverride: firstTypeOverride.creatureType,
    });
    const damagedSnapshot = snapshotBattle(damaged);
    expect(damagedSnapshot.findFamiliars).toEqual([
      expect.objectContaining({
        ownerId: casterId,
        status: "disappearedAtZeroHitPoints",
      }),
    ]);
    expect(damagedSnapshot.turnOrder).not.toContain(familiarId);
  });

  test("projects 100-foot telepathy without a shared-language requirement", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    expect(
      findFamiliarTelepathicConnection(cast.state, {
        kind: "findFamiliarWithin100FeetOfOwner",
        ownerId: casterId,
        familiarId,
      }),
    ).toEqual({
      ownerId: casterId,
      familiarId,
      rangeFeet: 100,
      sharedLanguageRequired: false,
    });
    expect(
      findFamiliarTelepathicConnection(cast.state, {
        kind: "findFamiliarWithin100FeetOfOwner",
        ownerId: casterId,
        familiarId: otherCombatantId,
      }),
    ).toBeNull();
  });

  test("shares familiar senses as a Bonus Action until caster's next turn", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const shared = shareFindFamiliarSenses({
      state: cast.state,
      casterId,
      fact: {
        kind: "findFamiliarWithin100FeetOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });

    expect(shared.tag).toBe("resolved");
    if (shared.tag !== "resolved") return;
    expect(shared.state.currentTurnResources.currentHasBonusAction).toBe(false);
    const caster = shared.state.combatants.get(casterId);
    const effect = caster?.activeEffects.find(
      (candidate) => candidate.kind === "findFamiliarSharedSenses",
    );
    expect(effect).toMatchObject({
      sourceSpellId: "find_familiar",
      sourceCombatantId: casterId,
      familiarId,
      canSeeThroughFamiliar: true,
      canHearThroughFamiliar: true,
      expiresAt: { kind: "startOfTurn", combatantId: casterId },
    });
    const familiar = cast.state.combatants.get(familiarId);
    expect(effect?.familiarSenses).toEqual(
      familiar?.origin.kind === "statBlock"
        ? familiar.origin.statBlock.statBlock.senses
        : [],
    );

    const blocked = shareFindFamiliarSenses({
      state: shared.state,
      casterId,
      fact: {
        kind: "findFamiliarWithin100FeetOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });
    expect(blocked.tag).toBe("invalid");
    if (blocked.tag !== "invalid") return;
    expect(blocked.reason).toBe("staleSubject");
  });

  test("delivers Touch spells through a present familiar and atomically spends its Reaction", () => {
    const cast = castCatFamiliar(startSpellcasterFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const cureWoundsAct = discoverBattleActs(cast.state).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.invocation.spellId === "cure_wounds",
    );
    expect(cureWoundsAct?.subject.tag).toBe("actionSpell");
    if (cureWoundsAct?.subject.tag !== "actionSpell") return;
    const targetFill = {
      kind: "targetChoice" as const,
      holeId: ATTACK_TARGET_HOLE_ID,
      value: enemyId,
      spatialFacts: [
        {
          kind: "spellTarget" as const,
          casterId,
          targetId: enemyId,
          spellId: "cure_wounds",
        },
      ],
    };
    const awaitingHealingRoll = deliverTouchSpellThroughFindFamiliar({
      state: cast.state,
      subject: cureWoundsAct.subject,
      fills: [targetFill],
      fact: {
        kind: "findFamiliarWithin100FeetOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });
    expect(awaitingHealingRoll.tag).toBe("needsHoles");
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);
    if (awaitingHealingRoll.tag !== "needsHoles") return;

    const delivered = deliverTouchSpellThroughFindFamiliar({
      state: cast.state,
      subject: cureWoundsAct.subject,
      fills: [
        targetFill,
        {
          kind: "rolledDice",
          holeId: awaitingHealingRoll.holes[0]?.holeId ?? ATTACK_TARGET_HOLE_ID,
          value: [{ results: [DieRollResult(4), DieRollResult(4)] }],
        },
      ],
      fact: {
        kind: "findFamiliarWithin100FeetOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });

    expect(delivered.tag).toBe("resolved");
    if (delivered.tag !== "resolved") return;
    expect(delivered.state.combatants.get(familiarId)?.reactionAvailable).toBe(
      false,
    );
    expect(Number(delivered.state.combatants.get(enemyId)?.hp)).toBe(12);
    expect(delivered.state.currentTurnResources.spellSlotUsesThisTurn.some((use) => use.kind === "committed")).toBe(
      true,
    );
  });

  test("ordinary spell resolution rejects forged familiar-delivery spatial facts", () => {
    const cast = castCatFamiliar(startSpellcasterFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const cureWoundsAct = discoverBattleActs(cast.state).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.invocation.spellId === "cure_wounds",
    );
    expect(cureWoundsAct?.subject.tag).toBe("actionSpell");
    if (cureWoundsAct?.subject.tag !== "actionSpell") return;

    const forgedFamiliarDeliveryFill = {
      kind: "targetChoice",
      holeId: ATTACK_TARGET_HOLE_ID,
      value: enemyId,
      spatialFacts: [
        {
          kind: "familiarDeliveredTouchSpellTarget",
          casterId,
          familiarId,
          targetId: enemyId,
          spellId: "cure_wounds",
        },
      ],
    } as unknown as Parameters<typeof resolveBattleSubject>[0]["fills"][number];

    const bypass = resolveBattleSubject({
      state: cast.state,
      subject: cureWoundsAct.subject,
      fills: [forgedFamiliarDeliveryFill],
    });

    expect(bypass.tag).toBe("invalid");
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);
    expect(cast.state.currentTurnResources.spellSlotUsesThisTurn.some((use) => use.kind === "committed")).toBe(
      false,
    );
  });

  test("rejects non-Touch delivery and unavailable familiar Reactions before casting", () => {
    const cast = castCatFamiliar(startSpellcasterFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const healingWordAct = discoverBattleActs(cast.state).find(
      (act) =>
        act.subject.tag === "bonusActionSpell" &&
        act.subject.invocation.spellId === "healing_word",
    );
    expect(healingWordAct?.subject.tag).toBe("bonusActionSpell");
    if (healingWordAct?.subject.tag !== "bonusActionSpell") return;

    const nonTouch = deliverTouchSpellThroughFindFamiliar({
      state: cast.state,
      subject: healingWordAct.subject,
      fills: [],
      fact: {
        kind: "findFamiliarWithin100FeetOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });
    expect(nonTouch.tag).toBe("invalid");
    expect(cast.state.currentTurnResources.spellSlotUsesThisTurn.some((use) => use.kind === "committed")).toBe(
      false,
    );
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);

    const cureWoundsAct = discoverBattleActs(cast.state).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.invocation.spellId === "cure_wounds",
    );
    expect(cureWoundsAct?.subject.tag).toBe("actionSpell");
    if (cureWoundsAct?.subject.tag !== "actionSpell") return;
    const withoutReaction = {
      ...cast.state,
      combatants: new Map(cast.state.combatants).set(familiarId, {
        ...cast.state.combatants.get(familiarId)!,
        reactionAvailable: false,
      }),
    };
    const blocked = deliverTouchSpellThroughFindFamiliar({
      state: withoutReaction,
      subject: cureWoundsAct.subject,
      fills: [],
      fact: {
        kind: "findFamiliarWithin100FeetOfOwner",
        ownerId: casterId,
        familiarId,
      },
    });
    expect(blocked.tag).toBe("invalid");
    expect(withoutReaction.currentTurnResources.spellSlotUsesThisTurn.some((use) => use.kind === "committed")).toBe(
      false,
    );
  });

  test("Pact of the Chain forgoes one owner Attack-action attack for a familiar Reaction attack", () => {
    const cast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle(),
    );
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    expect(cast.state.currentTurnResources.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);
    expect(discoverBattleActs(cast.state)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: pactScratchSubject(),
          initialHoles: [expect.objectContaining({ kind: "targetChoice" })],
        }),
      ]),
    );

    const resolved = resolveBattleSubject({
      state: cast.state,
      subject: pactScratchSubject(),
      fills: pactScratchFilledAttackFills(cast.state),
    });
    expect(resolved.tag).toBe("resolved");
    if (resolved.tag !== "resolved") return;
    expect(resolved.state.currentTurnResources.actionResources).toEqual([]);
    expect(resolved.state.combatants.get(familiarId)?.reactionAvailable).toBe(
      false,
    );
    expect(Number(resolved.state.combatants.get(enemyId)?.hp)).toBe(11);
  });

  test("Pact of the Chain familiar attack resumes through attack-hit reactions with Pact spending", () => {
    const cast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle({ targetHasShield: true }),
    );
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const subject = pactScratchSubject();
    const awaitingTarget = resolveBattleSubject({
      state: cast.state,
      subject,
      fills: [],
    });
    expect(awaitingTarget.tag).toBe("needsHoles");
    if (awaitingTarget.tag !== "needsHoles") return;
    const target = familiarAttackTargetFill(
      requireHole(awaitingTarget.holes, "targetChoice"),
    );
    const awaitingAttackRoll = resolveBattleSubject({
      state: cast.state,
      subject,
      fills: [target],
    });
    expect(awaitingAttackRoll.tag).toBe("needsHoles");
    if (awaitingAttackRoll.tag !== "needsHoles") return;
    const attackRoll = attackRollFill(
      requireHole(awaitingAttackRoll.holes, "attackRoll"),
      { naturalD20: 10, total: 14 },
    );

    const awaitingReaction = resolveBattleSubject({
      state: cast.state,
      subject,
      fills: [target, attackRoll],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: { trigger: "attackHit" } },
    });
    if (awaitingReaction.tag !== "needsHoles") return;
    const shieldChoice =
      awaitingReaction.snapshot.pendingReaction?.choices.find(
        (choice) => choice.kind === "castTriggeredReactionSpell",
      );
    expect(shieldChoice).toMatchObject({
      kind: "castTriggeredReactionSpell",
      reactorId: enemyId,
    });
    if (
      shieldChoice === undefined ||
      shieldChoice.kind !== "castTriggeredReactionSpell"
    ) {
      throw new Error("Expected Shield Reaction choice.");
    }

    const resolved = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        requireHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: enemyId,
          choice: {
            kind: "castTriggeredReactionSpell",
            invocation: shieldChoice.invocation,
            fills: [],
          },
        },
      ),
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingReaction: null },
    });
    if (resolved.tag !== "resolved") return;
    expect(resolved.state.currentTurnResources.actionResources).toEqual([]);
    expect(resolved.state.combatants.get(familiarId)?.reactionAvailable).toBe(
      false,
    );
    expect(resolved.state.combatants.get(enemyId)?.reactionAvailable).toBe(
      false,
    );
    expect(Number(resolved.state.combatants.get(enemyId)?.hp)).toBe(12);
  });

  test("Pact of the Chain familiar attack rejects missing owner Attack-action attacks without spending the familiar Reaction", () => {
    const cast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle(),
    );
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const withoutOwnerAttack = {
      ...cast.state,
      currentTurnResources: {
        ...cast.state.currentTurnResources,
        actionResources: [],
      },
    };

    const blocked = resolveBattleSubject({
      state: withoutOwnerAttack,
      subject: pactScratchSubject(),
      fills: pactScratchFilledAttackFills(cast.state),
    });

    expect(blocked.tag).toBe("invalid");
    if (blocked.tag !== "invalid") return;
    expect(blocked.reason).toBe("staleSubject");
    expect(
      withoutOwnerAttack.combatants.get(familiarId)?.reactionAvailable,
    ).toBe(true);
  });

  test("Pact of the Chain familiar attack uses dispatcher action eligibility and interrupt gates", () => {
    const cast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle(),
    );
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const owner = cast.state.combatants.get(casterId);
    if (owner === undefined) {
      throw new Error("Expected Pact owner combatant.");
    }
    const unableToAct = applyBattleHitPointDamage({
      state: cast.state,
      target: owner,
      damageAmount: Number(owner.hp),
      deathFailuresAtZeroHp: 1,
    });

    const blockedByActionEligibility = resolveBattleSubject({
      state: unableToAct,
      subject: pactScratchSubject(),
      fills: [],
    });
    expect(blockedByActionEligibility).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });

    const shieldCast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle({ targetHasShield: true }),
    );
    expect(shieldCast.tag).toBe("resolved");
    if (shieldCast.tag !== "resolved") return;
    const subject = pactScratchSubject();
    const awaitingTarget = resolveBattleSubject({
      state: shieldCast.state,
      subject,
      fills: [],
    });
    if (awaitingTarget.tag !== "needsHoles") {
      throw new Error("Expected Pact attack target hole.");
    }
    const target = familiarAttackTargetFill(
      requireHole(awaitingTarget.holes, "targetChoice"),
    );
    const awaitingAttackRoll = resolveBattleSubject({
      state: shieldCast.state,
      subject,
      fills: [target],
    });
    if (awaitingAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected Pact attack roll hole.");
    }
    const pendingInterrupt = resolveBattleSubject({
      state: shieldCast.state,
      subject,
      fills: [
        target,
        attackRollFill(requireHole(awaitingAttackRoll.holes, "attackRoll"), {
          naturalD20: 10,
          total: 14,
        }),
      ],
    });
    expect(pendingInterrupt).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: { trigger: "attackHit" } },
    });
    if (pendingInterrupt.tag !== "needsHoles") return;
    const blockedByInterrupt = resolveBattleSubject({
      state: pendingInterrupt.state,
      subject: pactScratchSubject(),
      fills: [],
    });
    expect(blockedByInterrupt).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    expect(
      pendingInterrupt.state.combatants.get(familiarId)?.reactionAvailable,
    ).toBe(true);
  });

  test("Pact of the Chain familiar attack rejects non-Pact owners and unavailable familiar Reactions", () => {
    const nonPactCast = castCatFamiliarAfterCasterTurn(
      startFixtureBattle({ includeEnemy: true }),
    );
    expect(nonPactCast.tag).toBe("resolved");
    if (nonPactCast.tag !== "resolved") return;

    const nonPactAttack = resolveBattleSubject({
      state: nonPactCast.state,
      subject: pactScratchSubject(),
      fills: [],
    });
    expect(nonPactAttack.tag).toBe("invalid");
    if (nonPactAttack.tag !== "invalid") return;
    expect(nonPactAttack.reason).toBe("unsupportedActOption");
    expect(
      nonPactCast.state.combatants.get(familiarId)?.reactionAvailable,
    ).toBe(true);

    const pactCast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle(),
    );
    expect(pactCast.tag).toBe("resolved");
    if (pactCast.tag !== "resolved") return;
    const withoutReaction = {
      ...pactCast.state,
      combatants: new Map(pactCast.state.combatants).set(familiarId, {
        ...pactCast.state.combatants.get(familiarId)!,
        reactionAvailable: false,
      }),
    };
    const blocked = resolveBattleSubject({
      state: withoutReaction,
      subject: pactScratchSubject(),
      fills: [],
    });
    expect(blocked.tag).toBe("invalid");
    if (blocked.tag !== "invalid") return;
    expect(blocked.reason).toBe("staleSubject");
    expect(withoutReaction.currentTurnResources.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
  });

  test("Pact of the Chain familiar attack rejects and hides familiars that cannot take Reactions", () => {
    const pactCast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle(),
    );
    expect(pactCast.tag).toBe("resolved");
    if (pactCast.tag !== "resolved") return;
    const familiar = pactCast.state.combatants.get(familiarId);
    if (familiar === undefined) {
      throw new Error("Expected present familiar combatant.");
    }
    const unableToReact = {
      ...pactCast.state,
      combatants: new Map(pactCast.state.combatants).set(familiarId, {
        ...testBattleCreatureStateWithConditions(
          familiar,
          applyCondition(familiar.conditions, "incapacitated"),
        ),
        reactionAvailable: true,
      }),
    };

    expect(
      discoverBattleActs(unableToReact).some(
        (act) => act.subject.tag === "pactOfTheChainFamiliarAttack",
      ),
    ).toBe(false);

    const blocked = resolveBattleSubject({
      state: unableToReact,
      subject: pactScratchSubject(),
      fills: [],
    });
    expect(blocked).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(unableToReact.currentTurnResources.actionResources).toEqual([
      { kind: "action", source: "turn" },
    ]);
    expect(unableToReact.combatants.get(familiarId)?.reactionAvailable).toBe(
      true,
    );
  });

  test("Pact of the Chain familiar attack rejects familiars owned by another present caster", () => {
    const cast = castCatFamiliarAfterCasterTurn(
      startWrongOwnerPactFixtureBattle(),
    );
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const wrongOwner = resolveBattleSubject({
      state: cast.state,
      subject: pactScratchSubject(otherCombatantId),
      fills: [],
    });

    expect(wrongOwner.tag).toBe("invalid");
    if (wrongOwner.tag !== "invalid") return;
    expect(wrongOwner.reason).toBe("unsupportedActOption");
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);
  });

  test("snapshot schema encodes and rejects invalid familiar snapshots", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const encoded = Schema.encodeSync(BattleSnapshotSchema)(cast.snapshot);
    expect(encoded.findFamiliars).toEqual([
      {
        status: "present",
        ownerId: casterId,
        familiarId,
        formAccess: "findFamiliar",
        formSelection: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverride: firstTypeOverride.creatureType,
        initiative: 18,
        placement: { kind: "unoccupiedSpaceWithinSpellRange" },
      },
    ]);

    const decoded = Schema.decodeUnknownEither(BattleSnapshotSchema)(encoded);
    expect(Either.isRight(decoded)).toBe(true);
    const invalid = Schema.decodeUnknownEither(BattleSnapshotSchema)({
      ...encoded,
      findFamiliars: [{ status: "present" }],
    });
    expect(Either.isLeft(invalid)).toBe(true);
    const invalidPactSpecialWithoutPactAccess = Schema.decodeUnknownEither(
      BattleSnapshotSchema,
    )({
      ...encoded,
      findFamiliars: [
        {
          ...encoded.findFamiliars[0],
          formSelection: { tag: "pactOfTheChainSpecialForm", formId: "imp" },
        },
      ],
    });
    expect(Either.isLeft(invalidPactSpecialWithoutPactAccess)).toBe(true);
    const invalidPactSpecialFormId = Schema.decodeUnknownEither(
      BattleSnapshotSchema,
    )({
      ...encoded,
      findFamiliars: [
        {
          ...encoded.findFamiliars[0],
          formAccess: "pactOfTheChain",
          formSelection: {
            tag: "pactOfTheChainSpecialForm",
            formId: "not-a-form",
          },
        },
      ],
    });
    expect(Either.isLeft(invalidPactSpecialFormId)).toBe(true);
    const dismissedAtZeroHp = Schema.decodeUnknownEither(BattleSnapshotSchema)({
      ...encoded,
      findFamiliars: [
        {
          status: "temporarilyDismissed",
          ownerId: casterId,
          formAccess: "findFamiliar",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          creatureTypeOverride: firstTypeOverride.creatureType,
          hitPoints: { currentHp: 0, tempHp: 0 },
        },
      ],
    });
    expect(Either.isLeft(dismissedAtZeroHp)).toBe(true);
  });

  test("snapshot derives familiar owner from the state map key", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const familiar = cast.state.findFamiliars.get(casterId);
    expect(familiar).toBeDefined();
    if (familiar === undefined) return;
    const familiarWithContradictoryOwner = {
      ...familiar,
      ownerId: otherCombatantId,
    };

    const malformedState = {
      ...cast.state,
      findFamiliars: new Map([[casterId, familiarWithContradictoryOwner]]),
    };

    expect(snapshotBattle(malformedState).findFamiliars).toMatchObject([
      { ownerId: casterId },
    ]);
  });
});
