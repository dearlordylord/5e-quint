// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.find-familiar-lifecycle unit-feature.d20-test-natural-one-reroll
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84I5 find_familiar
import * as Either from "effect/Either";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  applyCondition,
  type ConditionState,
} from "@dnd/shared-algebras/conditions-algebra";
import { Hp, spellSlotLevel } from "@dnd/shared/types";
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
import {
  findFamiliarFormEligibilityForSpell,
  type FindFamiliarFormEligibility,
} from "@dnd/surface/surface/find-familiar-forms";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  admitCompanionToBattle,
  applyFindFamiliarZeroHitPointDisappearance,
  battleAvailableDruidWildShapeKnownForms,
  battleDruidWildShapeKnownFormSupportForUnit,
  battleCombatantSide,
  battleId,
  battleObjectId,
  battleUnitSupportProfilesForUnit,
  BattleSnapshotSchema,
  castFindFamiliar,
  castWildCompanion,
  characterId,
  combatantId,
  deliverTouchSpellThroughFindFamiliar,
  discoverBattleActs,
  DRUID_WILD_COMPANION_SPELL_CAST_SUPPORT_PROFILE,
  findFamiliarCompanionEntryForOwner,
  findFamiliarCompanionForOwner,
  findFamiliarCreatureTypeOverrideForOwner,
  findFamiliarTelepathicConnection,
  initiativeScore,
  permanentlyDismissFindFamiliar,
  reappearTemporarilyDismissedFindFamiliar,
  removeBattleCombatants,
  resolveBattleInterrupt,
  resolveBattleSubject,
  shareFindFamiliarSenses,
  snapshotBattle,
  startBattle,
  temporarilyDismissFindFamiliar,
  type BattleFill,
  type BattleHole,
  type BattleCreatureInit,
  type BattleState,
  type PactOfTheChainFamiliarAttackSubject,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  ATTACK_TARGET_HOLE_ID,
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
} from "./battle-reducer.ts";
import { battleCreatureStateWithoutKnockOut } from "./battle-reducer/creature-state.ts";
import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";
import { D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE } from "./battle-reducer/d20-test-natural-one-reroll.ts";

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
const druidWildShapeUnit = unitCatalog.requireUnit("druid_wild_shape");
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

function halflingLuckUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = halflingLuckUnit();
  const supportProfiles = battleUnitSupportProfilesForUnit({ unit });
  if (Either.isLeft(supportProfiles)) {
    throw new Error(supportProfiles.left.message);
  }
  return {
    unitId: unit.id,
    supportProfiles: supportProfiles.right,
  };
}

function halflingLuckUnitFeature(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"]
>[number] {
  return { unit: halflingLuckUnit() };
}

function halflingLuckUnit() {
  return unitCatalog.requireUnit("species_halfling_luck");
}

const firstTypeOverride = familiarEligibility.creatureTypeOverrideChoices[0];
if (firstTypeOverride === undefined) {
  throw new Error("Expected Find Familiar creature type override choices.");
}

function druidWildShapeKnownForms() {
  const profile =
    battleDruidWildShapeKnownFormSupportForUnit(druidWildShapeUnit);
  if (profile === null || profile === "unsupported") {
    throw new Error("Expected Druid Wild Shape known-form support profile.");
  }
  const forms = battleAvailableDruidWildShapeKnownForms({
    profile,
    forms: [
      statBlockCatalog.requireStatBlock("stat_block_rat"),
      statBlockCatalog.requireStatBlock("stat_block_riding_horse"),
      statBlockCatalog.requireStatBlock("stat_block_lizard"),
      statBlockCatalog.requireStatBlock("stat_block_cat"),
    ],
  });
  if (Either.isLeft(forms)) {
    throw new Error(forms.left.message);
  }
  return forms.right;
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
  input: {
    readonly targetHasShield?: boolean;
    readonly ownerCharacterUnitRefs?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["characterUnitRefs"];
    readonly ownerCharacterUnitFeatures?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["unitFeatures"];
  } = {},
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
        ...(input.ownerCharacterUnitRefs === undefined
          ? {}
          : { characterUnitRefs: input.ownerCharacterUnitRefs }),
        ...(input.ownerCharacterUnitFeatures === undefined
          ? {}
          : { unitFeatures: input.ownerCharacterUnitFeatures }),
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

function startWildCompanionDruidFixtureBattle(input: {
  readonly includeWildCompanionFeature?: boolean;
  readonly spellSlots?: readonly {
    readonly spellLevel: number;
    readonly count: number;
  }[];
  readonly wildShapeUsesRemaining?: number;
}): BattleState {
  const result = startBattle({
    battleId: battleId("wild-companion-test"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Druid",
        initiative: 12,
        side: partySide,
        className: "druid",
        classLevel: 2,
        spellcasting: {
          sourceClassName: "druid",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: input.spellSlots ?? [],
        },
        characterUnitRefs: [
          { unitId: "druid_wild_shape", supportProfiles: [] },
          ...(input.includeWildCompanionFeature === false
            ? []
            : [
                {
                  unitId: "druid_wild_companion",
                  supportProfiles: [
                    DRUID_WILD_COMPANION_SPELL_CAST_SUPPORT_PROFILE,
                  ] as const,
                },
              ]),
        ],
        resources:
          input.wildShapeUsesRemaining === undefined
            ? []
            : [
                {
                  unit: druidWildShapeUnit,
                  usesRemaining: input.wildShapeUsesRemaining,
                },
              ],
        ...(input.wildShapeUsesRemaining === undefined
          ? {}
          : { druidWildShapeKnownForms: druidWildShapeKnownForms() }),
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

function startFindFamiliarSpellcasterFixtureBattle(): BattleState {
  const result = startBattle({
    battleId: battleId("find-familiar-generic-lifecycle-test"),
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
          spellSlots: [],
        },
        characterUnitRefs: [
          { unitId: "wizard_ritual_adept", supportProfiles: [] },
        ],
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
  const familiarEntry = findFamiliarCompanionEntryForOwner(state, casterId);
  if (familiarEntry?.companion.status !== "present") {
    throw new Error("Expected present familiar.");
  }
  const familiarCombatantId = familiarEntry.companion.combatantId;
  const combatant = state.combatants.get(familiarCombatantId);
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
      familiarCombatantId,
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
  readonly className?: "wizard" | "warlock" | "druid";
  readonly classLevel?: number;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly druidWildShapeKnownForms?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["druidWildShapeAvailableForms"];
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
      classLevels: [
        {
          className: input.className ?? "wizard",
          level: input.classLevel ?? 1,
        },
      ],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
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
      ...(input.resources === undefined ? {} : { resources: input.resources }),
      ...(input.druidWildShapeKnownForms === undefined
        ? {}
        : { druidWildShapeAvailableForms: input.druidWildShapeKnownForms }),
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

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
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

function findFamiliarConnectionFill(
  hole: Extract<BattleHole, { readonly kind: "findFamiliarConnection" }>,
): Extract<BattleFill, { readonly kind: "findFamiliarConnection" }> {
  return {
    kind: "findFamiliarConnection",
    holeId: hole.holeId,
    value: { withinRange: true },
  };
}

function heldObjectFactsFill(
  hole: Extract<BattleHole, { readonly kind: "heldObjectFacts" }>,
  objectIds: readonly (typeof droppedObjectId)[] = [],
): Extract<BattleFill, { readonly kind: "heldObjectFacts" }> {
  return {
    kind: "heldObjectFacts",
    holeId: hole.holeId,
    value: { objectIds },
  };
}

function companionReappearancePlacementFill(
  hole: Extract<
    BattleHole,
    { readonly kind: "companionReappearancePlacement" }
  >,
): Extract<BattleFill, { readonly kind: "companionReappearancePlacement" }> {
  return {
    kind: "companionReappearancePlacement",
    holeId: hole.holeId,
    value: { kind: "unoccupiedSpaceWithin30Feet" },
  };
}

function companionReappearanceInitiativeFill(
  hole: Extract<
    BattleHole,
    { readonly kind: "companionReappearanceInitiative" }
  >,
): Extract<BattleFill, { readonly kind: "companionReappearanceInitiative" }> {
  return {
    kind: "companionReappearanceInitiative",
    holeId: hole.holeId,
    value: initiativeScore(14),
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
    const familiar = findFamiliarCompanionForOwner(result.state, casterId);
    expect(familiar).toMatchObject({
      status: "present",
      ownerId: casterId,
      formAccess: "findFamiliar",
      creatureTypeOverride: firstTypeOverride.creatureType,
      formSelection: { tag: "normalNamedForm", formId: "cat" },
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
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
    expect(result.snapshot.companions).toMatchObject([
      {
        ownerId: casterId,
      },
    ]);
  });

  test("generic companion admission rejects an absent durable companion id collision", () => {
    const otherOwnerId = combatantId("other-owner");
    const initial = startBattle({
      battleId: battleId("companion-admission-absent-id-collision"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
          side: partySide,
        }),
        characterCreature({
          combatantId: otherOwnerId,
          displayName: "Other Wizard",
          initiative: 11,
          side: partySide,
        }),
      ],
    });
    expect(Either.isRight(initial)).toBe(true);
    if (Either.isLeft(initial)) return;

    const firstAdmission = admitCompanionToBattle({
      state: initial.right,
      ownerId: casterId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:first",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "findFamiliar",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "temporarilyDismissed",
        storedForm: {
          formAccess: "findFamiliar",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          resolvedStatBlockId: "stat_block_cat",
        },
        creatureTypeOverride: "fey",
        reappearanceCombatantId: familiarId,
        hitPoints: {
          // Cast evidence: Hp(1) is a positive HP literal for this boundary
          // test fixture.
          currentHp: Hp(1) as Parameters<
            typeof admitCompanionToBattle
          >[0]["manifestation"] extends { readonly hitPoints: infer H }
            ? H extends { readonly currentHp: infer C }
              ? C
              : never
            : never,
          tempHp: Hp(0),
        },
      },
      initialCombatantOrder: initialCombatantOrder(casterId, otherOwnerId),
    });
    expect(Either.isRight(firstAdmission)).toBe(true);
    if (Either.isLeft(firstAdmission)) return;

    const collision = admitCompanionToBattle({
      state: firstAdmission.right,
      ownerId: otherOwnerId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:first",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "findFamiliar",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "disappearedAtZeroHitPoints",
        storedForm: {
          formAccess: "findFamiliar",
          formSelection: { tag: "normalNamedForm", formId: "owl" },
          resolvedStatBlockId: "stat_block_owl",
        },
        creatureTypeOverride: "fey",
      },
      initialCombatantOrder: initialCombatantOrder(casterId, otherOwnerId),
    });

    expect(Either.isLeft(collision)).toBe(true);
    if (Either.isRight(collision)) return;
    expect(collision.left.message).toBe(
      "Companion admission identity is already used by another companion.",
    );
    expect(firstAdmission.right.companions.get(casterId)).toMatchObject({
      ownerId: casterId,
      status: "temporarilyDismissed",
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:first",
      },
    });
  });

  test("generic companion admission rejects empty durable companion ids", () => {
    const initial = startBattle({
      battleId: battleId("companion-admission-empty-durable-id"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
          side: partySide,
        }),
      ],
    });
    expect(Either.isRight(initial)).toBe(true);
    if (Either.isLeft(initial)) return;

    const admitted = admitCompanionToBattle({
      state: initial.right,
      ownerId: casterId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "findFamiliar",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "disappearedAtZeroHitPoints",
        storedForm: {
          formAccess: "findFamiliar",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          resolvedStatBlockId: "stat_block_cat",
        },
        creatureTypeOverride: "fey",
      },
      initialCombatantOrder: initialCombatantOrder(casterId),
    });

    expect(Either.isLeft(admitted)).toBe(true);
    if (Either.isRight(admitted)) return;
    expect(admitted.left.message).toBe(
      "Companion admission requires durable id.",
    );
  });

  test("generic companion admission rejects mismatched retained form proof", () => {
    const initial = startBattle({
      battleId: battleId("companion-admission-form-proof-mismatch"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
          side: partySide,
        }),
      ],
    });
    expect(Either.isRight(initial)).toBe(true);
    if (Either.isLeft(initial)) return;

    const admitted = admitCompanionToBattle({
      state: initial.right,
      ownerId: casterId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:mismatched-proof",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "findFamiliar",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "disappearedAtZeroHitPoints",
        storedForm: {
          formAccess: "findFamiliar",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          resolvedStatBlockId: "stat_block_owl",
        },
        creatureTypeOverride: "fey",
      },
      initialCombatantOrder: initialCombatantOrder(casterId),
    });

    expect(Either.isLeft(admitted)).toBe(true);
    if (Either.isRight(admitted)) return;
    expect(admitted.left.message).toBe(
      "Retained familiar form proof resolved Stat Block mismatch: stat_block_owl.",
    );
  });

  test("generic companion admission rejects forged Challenge Rating 0 Beast proof", () => {
    const initial = startBattle({
      battleId: battleId("companion-admission-forged-cr0-beast"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
          side: partySide,
        }),
      ],
    });
    expect(Either.isRight(initial)).toBe(true);
    if (Either.isLeft(initial)) return;

    const admitted = admitCompanionToBattle({
      state: initial.right,
      ownerId: casterId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:forged-cr0-beast",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "findFamiliar",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "disappearedAtZeroHitPoints",
        storedForm: {
          formAccess: "findFamiliar",
          formSelection: {
            tag: "challengeRatingZeroBeast",
            statBlockId: "stat_block_goblin_warrior",
          },
          resolvedStatBlockId: "stat_block_goblin_warrior",
        },
        creatureTypeOverride: "fey",
      },
      initialCombatantOrder: initialCombatantOrder(casterId),
    });

    expect(Either.isLeft(admitted)).toBe(true);
    if (Either.isRight(admitted)) return;
    expect(admitted.left.message).toBe(
      "Retained familiar Challenge Rating 0 Beast form must resolve to a CR 0 Beast Stat Block: stat_block_goblin_warrior.",
    );
  });

  test("casts Wild Companion through Find Familiar with fixed Fey type and a spell slot spend", () => {
    const cast = castWildCompanion({
      state: startWildCompanionDruidFixtureBattle({
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      casterId,
      catalog: statBlockCatalog,
      findFamiliarSpell,
      selection: { tag: "normalNamedForm", formId: "cat" },
      spend: { kind: "spellSlot", spellLevel: spellSlotLevel(1) },
      familiarId,
      initiative: initiativeScore(18),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    expect(findFamiliarCompanionForOwner(cast.state, casterId)).toMatchObject({
      status: "present",
      ownerId: casterId,
      formAccess: "findFamiliar",
      formSelection: { tag: "normalNamedForm", formId: "cat" },
      creatureTypeOverride: "fey",
    });
    const companionCombatant = cast.state.combatants.get(familiarId);
    expect(
      companionCombatant?.origin.kind === "statBlock"
        ? companionCombatant.origin.statBlock.statBlock.creatureType
        : null,
    ).toBe("fey");
    const druid = cast.state.combatants.get(casterId);
    expect(
      druid?.origin.kind === "character"
        ? druid.origin.spellcasting?.spellSlots
        : [],
    ).toEqual([{ spellLevel: 1, count: 1, expended: 1 }]);
  });

  test("casts Wild Companion by spending a Wild Shape use instead of a spell slot", () => {
    const cast = castWildCompanion({
      state: startWildCompanionDruidFixtureBattle({
        wildShapeUsesRemaining: 2,
      }),
      casterId,
      catalog: statBlockCatalog,
      findFamiliarSpell,
      selection: { tag: "normalNamedForm", formId: "owl" },
      spend: { kind: "wildShapeUse", resourceUnitId: "druid_wild_shape" },
      familiarId,
      initiative: initiativeScore(18),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const druid = cast.state.combatants.get(casterId);
    expect(
      druid?.origin.kind === "character"
        ? druid.origin.resources.find(
            (resource) => resource.unit.id === "druid_wild_shape",
          )
        : undefined,
    ).toMatchObject({ usesRemaining: 1 });
    expect(findFamiliarCompanionForOwner(cast.state, casterId)).toMatchObject({
      formAccess: "findFamiliar",
      creatureTypeOverride: "fey",
    });
  });

  test("reappears a temporarily dismissed Wild Companion without Find Familiar spell access", () => {
    const cast = castWildCompanion({
      state: startWildCompanionDruidFixtureBattle({
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      casterId,
      catalog: statBlockCatalog,
      findFamiliarSpell,
      selection: { tag: "normalNamedForm", formId: "cat" },
      spend: { kind: "spellSlot", spellLevel: spellSlotLevel(1) },
      familiarId,
      initiative: initiativeScore(18),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const dismissed = temporarilyDismissFindFamiliar({
      state: withFreshMagicAction(cast.state),
      casterId,
    });
    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;

    const reappearanceReadyState = withFreshMagicAction(dismissed.state);
    const reappearanceAct = discoverBattleActs(reappearanceReadyState).find(
      (act) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "reappear",
    );
    expect(reappearanceAct?.subject.tag).toBe("companionLifecycle");
    if (reappearanceAct?.subject.tag !== "companionLifecycle") return;

    const reappeared = resolveBattleSubject({
      state: reappearanceReadyState,
      subject: reappearanceAct.subject,
      fills: [
        companionReappearancePlacementFill(
          requireHole(
            reappearanceAct.initialHoles,
            "companionReappearancePlacement",
          ),
        ),
        companionReappearanceInitiativeFill(
          requireHole(
            reappearanceAct.initialHoles,
            "companionReappearanceInitiative",
          ),
        ),
      ],
      statBlockCatalog,
    });
    expect(reappeared.tag).toBe("resolved");
    if (reappeared.tag !== "resolved") return;
    expect(
      findFamiliarCompanionForOwner(reappeared.state, casterId),
    ).toMatchObject({
      status: "present",
      formAccess: "findFamiliar",
      creatureTypeOverride: "fey",
    });
    expect(reappeared.state.combatants.get(familiarId)?.initiative).toBe(
      initiativeScore(14),
    );
  });

  test("rejects Wild Companion without Wild Companion feature access", () => {
    const cast = castWildCompanion({
      state: startWildCompanionDruidFixtureBattle({
        includeWildCompanionFeature: false,
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      casterId,
      catalog: statBlockCatalog,
      findFamiliarSpell,
      selection: { tag: "normalNamedForm", formId: "cat" },
      spend: { kind: "spellSlot", spellLevel: spellSlotLevel(1) },
      familiarId,
      initiative: initiativeScore(18),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });

    expect(cast).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Wild Companion requires the Druid Wild Companion feature.",
    });
  });

  test("keeps one familiar per caster and atomically replaces form on recast", () => {
    const first = castCatFamiliar(startFixtureBattle());
    expect(first.tag).toBe("resolved");
    if (first.tag !== "resolved") return;

    const second = castRatFamiliar(first.state);

    expect(second.tag).toBe("resolved");
    if (second.tag !== "resolved") return;
    expect(second.state.companions).toHaveLength(1);
    expect(second.state.combatants.has(familiarId)).toBe(true);
    expect(second.state.combatants.has(replacementFamiliarId)).toBe(false);
    expect(findFamiliarCompanionForOwner(second.state, casterId)).toMatchObject(
      {
        status: "present",
        formAccess: "findFamiliar",
        formSelection: { tag: "normalNamedForm", formId: "rat" },
      },
    );
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
    expect(casterCollision.snapshot.companions).toEqual([]);

    const otherCollision = castCatFamiliar(
      startFixtureBattle({ extraCombatantId: otherCombatantId }),
      otherCombatantId,
    );

    expect(otherCollision.tag).toBe("invalid");
    if (otherCollision.tag !== "invalid") return;
    expect(otherCollision.reason).toBe("invalidFill");
    expect(otherCollision.snapshot.companions).toEqual([]);
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
    expect(
      findFamiliarCompanionForOwner(dismissed.state, casterId),
    ).toMatchObject({
      status: "temporarilyDismissed",
      hitPoints: { currentHp: Hp(1), tempHp: Hp(3) },
    });
    expect(dismissed.state.currentTurnResources.actionResources).toEqual([]);
    expect(dismissed.droppedObjects).toEqual([
      {
        kind: "objectDropped",
        actorId: familiarId,
        objectId: droppedObjectId,
        source: {
          kind: "spell",
          sourceCombatantId: casterId,
          sourceSpellId: "find_familiar",
        },
      },
    ]);

    const blockedReappearance = reappearTemporarilyDismissedFindFamiliar({
      state: dismissed.state,
      casterId,
      catalog: statBlockCatalog,
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
    expect(
      findFamiliarCompanionForOwner(reappeared.state, casterId),
    ).toMatchObject({
      status: "present",
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });
  });

  test("rejects retained temporary dismissal with an ordinary reappearance combatant identity", () => {
    const initial = startBattle({
      battleId: battleId("companion-admission-ordinary-reappearance-id"),
      combatants: [
        characterCreature({
          combatantId: casterId,
          displayName: "Wizard",
          initiative: 12,
          side: partySide,
        }),
        characterCreature({
          combatantId: otherCombatantId,
          displayName: "Other Combatant",
          initiative: 10,
          side: partySide,
        }),
      ],
    });
    expect(Either.isRight(initial)).toBe(true);
    if (Either.isLeft(initial)) return;

    const admitted = admitCompanionToBattle({
      state: initial.right,
      ownerId: casterId,
      identity: {
        tag: "retainedBetweenBattles",
        durableCompanionId: "durable:ordinary-reappearance-id",
      },
      protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
      catalog: statBlockCatalog,
      formEligibility: {
        formAccess: "findFamiliar",
        eligibility: familiarEligibility,
      },
      manifestation: {
        tag: "temporarilyDismissed",
        storedForm: {
          formAccess: "findFamiliar",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          resolvedStatBlockId: "stat_block_cat",
        },
        creatureTypeOverride: firstTypeOverride.creatureType,
        reappearanceCombatantId: otherCombatantId,
        hitPoints: {
          currentHp: Hp(1) as Parameters<
            typeof admitCompanionToBattle
          >[0]["manifestation"] extends { readonly hitPoints: infer H }
            ? H extends { readonly currentHp: infer C }
              ? C
              : never
            : never,
          tempHp: Hp(0),
        },
      },
      initialCombatantOrder: initialCombatantOrder(casterId, otherCombatantId),
    });

    expect(Either.isLeft(admitted)).toBe(true);
    if (Either.isRight(admitted)) return;
    expect(admitted.left.message).toBe(
      "Find Familiar familiar identity must not identify an ordinary combatant.",
    );
  });

  test("permanent dismissal tombstones the familiar and removes its combatant", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const dismissed = permanentlyDismissFindFamiliar({
      state: withFreshMagicAction(cast.state),
      casterId,
    });

    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    // The record is retained as a dismissedForever tombstone (not deleted) so
    // settlement can clear the owner's durable slot; the combatant is removed
    // and the tombstone is excluded from the snapshot.
    expect(
      findFamiliarCompanionForOwner(dismissed.state, casterId),
    ).toMatchObject({ status: "dismissedForever" });
    expect(dismissed.state.combatants.has(familiarId)).toBe(false);
    expect(dismissed.snapshot.companions).toEqual([]);
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
    expect(
      findFamiliarCompanionForOwner(disappeared.state, casterId),
    ).toMatchObject({
      status: "disappearedAtZeroHitPoints",
    });
    expect(disappeared.droppedObjects).toHaveLength(1);

    const recast = castRatFamiliar(disappeared.state);
    expect(recast.tag).toBe("resolved");
    if (recast.tag !== "resolved") return;
    expect(findFamiliarCompanionForOwner(recast.state, casterId)).toMatchObject(
      {
        status: "present",
      },
    );
    const recastEntry = findFamiliarCompanionEntryForOwner(
      recast.state,
      casterId,
    );
    expect(
      recastEntry?.companion.status === "present"
        ? recastEntry.companion.combatantId
        : undefined,
    ).toBe(replacementFamiliarId);
    expect(recast.state.combatants.has(familiarId)).toBe(false);
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

    const casterTurn = resolveBattleSubject({
      state: readiedAgain.state,
      subject: {
        tag: "runtimeCommand",
        actorId: familiarId,
        command: "endTurn",
      },
      fills: [],
    });
    expect(casterTurn.tag).toBe("resolved");
    if (casterTurn.tag !== "resolved") return;

    const dismissed = permanentlyDismissFindFamiliar({
      state: casterTurn.state,
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
    expect(
      findFamiliarCompanionForOwner(ownerRemoved.right, casterId),
    ).toBeNull();
    expect(snapshotBattle(ownerRemoved.right).companions).toEqual([]);

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
    expect(
      findFamiliarCompanionForOwner(familiarRemoved.right, casterId),
    ).toBeNull();
    expect(snapshotBattle(familiarRemoved.right).companions).toEqual([]);
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
    expect(findFamiliarCompanionForOwner(damaged, casterId)).toMatchObject({
      status: "disappearedAtZeroHitPoints",
      formAccess: "findFamiliar",
      formSelection: { tag: "normalNamedForm", formId: "cat" },
      creatureTypeOverride: firstTypeOverride.creatureType,
    });
    const damagedSnapshot = snapshotBattle(damaged);
    expect(damagedSnapshot.companions).toEqual([
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
      source: {
        kind: "companionSharedSenses",
        ownerId: casterId,
      },
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
          kind: "findFamiliarTouchSpellTarget" as const,
          ownerId: casterId,
          familiarId,
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
    expect(
      delivered.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(true);
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
          kind: "findFamiliarTouchSpellTarget",
          ownerId: casterId,
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
    expect(
      cast.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(false);
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
    expect(
      cast.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(false);
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
    expect(
      withoutReaction.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(false);
  });

  test("discovers and resolves present familiar lifecycle subjects through generic battle acts", () => {
    const cast = castCatFamiliar(startFindFamiliarSpellcasterFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const acts = discoverBattleActs(cast.state);
    const temporaryDismiss = acts.find(
      (act) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "temporarilyDismiss",
    );
    const permanentDismiss = acts.find(
      (act) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "permanentlyDismiss",
    );
    const shareSenses = acts.find(
      (act) => act.subject.tag === "findFamiliarSharedSenses",
    );
    expect(temporaryDismiss?.subject.tag).toBe("companionLifecycle");
    expect(permanentDismiss?.subject.tag).toBe("companionLifecycle");
    expect(shareSenses?.subject.tag).toBe("findFamiliarSharedSenses");
    if (
      temporaryDismiss?.subject.tag !== "companionLifecycle" ||
      permanentDismiss?.subject.tag !== "companionLifecycle" ||
      shareSenses?.subject.tag !== "findFamiliarSharedSenses"
    ) {
      return;
    }

    const shared = resolveBattleSubject({
      state: cast.state,
      subject: shareSenses.subject,
      fills: [
        findFamiliarConnectionFill(
          requireHole(shareSenses.initialHoles, "findFamiliarConnection"),
        ),
      ],
    });
    expect(shared.tag).toBe("resolved");
    if (shared.tag !== "resolved") return;
    expect(shared.state.currentTurnResources.currentHasBonusAction).toBe(false);

    const dismissed = resolveBattleSubject({
      state: cast.state,
      subject: temporaryDismiss.subject,
      fills: [
        heldObjectFactsFill(
          requireHole(temporaryDismiss.initialHoles, "heldObjectFacts"),
          [droppedObjectId],
        ),
      ],
    });
    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    expect(
      findFamiliarCompanionForOwner(dismissed.state, casterId),
    ).toMatchObject({
      status: "temporarilyDismissed",
    });
    expect(dismissed.state.combatants.has(familiarId)).toBe(false);
    expect(dismissed.droppedObjects).toEqual([
      expect.objectContaining({
        actorId: familiarId,
        objectId: droppedObjectId,
      }),
    ]);
    expect(
      discoverBattleActs(dismissed.state).some(
        (act) =>
          act.subject.tag === "companionLifecycle" &&
          act.subject.action === "reappear",
      ),
    ).toBe(false);
    const reappearanceReadyState = withFreshMagicAction(dismissed.state);
    const reappearanceAct = discoverBattleActs(reappearanceReadyState).find(
      (act) =>
        act.subject.tag === "companionLifecycle" &&
        act.subject.action === "reappear",
    );
    expect(reappearanceAct?.subject.tag).toBe("companionLifecycle");
    if (reappearanceAct?.subject.tag !== "companionLifecycle") return;
    const reappeared = resolveBattleSubject({
      state: reappearanceReadyState,
      subject: reappearanceAct.subject,
      fills: [
        companionReappearancePlacementFill(
          requireHole(
            reappearanceAct.initialHoles,
            "companionReappearancePlacement",
          ),
        ),
        companionReappearanceInitiativeFill(
          requireHole(
            reappearanceAct.initialHoles,
            "companionReappearanceInitiative",
          ),
        ),
      ],
      statBlockCatalog,
    });
    expect(reappeared.tag).toBe("resolved");
    if (reappeared.tag !== "resolved") return;
    expect(
      findFamiliarCompanionForOwner(reappeared.state, casterId),
    ).toMatchObject({
      status: "present",
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });
    expect(reappeared.state.combatants.get(familiarId)?.initiative).toBe(
      initiativeScore(14),
    );

    const permanentlyDismissed = resolveBattleSubject({
      state: cast.state,
      subject: permanentDismiss.subject,
      fills: [],
    });
    expect(permanentlyDismissed.tag).toBe("resolved");
    if (permanentlyDismissed.tag !== "resolved") return;
    expect(
      findFamiliarCompanionForOwner(permanentlyDismissed.state, casterId),
    ).toMatchObject({ status: "dismissedForever" });
    expect(permanentlyDismissed.state.combatants.has(familiarId)).toBe(false);
    expect(
      permanentlyDismissed.state.currentTurnResources.actionResources,
    ).toEqual([]);
    expect(permanentlyDismissed.droppedObjects).toBeUndefined();
  });

  test("discovers touch spell delivery as a generic companion act and preserves wrapper continuations", () => {
    const cast = castCatFamiliar(startSpellcasterFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const acts = discoverBattleActs(cast.state);
    expect(
      acts.some(
        (act) =>
          act.subject.tag === "findFamiliarTouchSpell" &&
          act.subject.invocation.spellId === "healing_word",
      ),
    ).toBe(false);
    const delivery = acts.find(
      (act) =>
        act.subject.tag === "findFamiliarTouchSpell" &&
        act.subject.invocation.spellId === "cure_wounds",
    );
    expect(delivery?.subject.tag).toBe("findFamiliarTouchSpell");
    if (delivery?.subject.tag !== "findFamiliarTouchSpell") return;

    const targetHole = requireHole(delivery.initialHoles, "targetChoice");
    const connection = findFamiliarConnectionFill(
      requireHole(delivery.initialHoles, "findFamiliarConnection"),
    );
    const connectionOnly = resolveBattleSubject({
      state: cast.state,
      subject: delivery.subject,
      fills: [connection],
    });
    expect(connectionOnly.tag).toBe("needsHoles");
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);
    if (connectionOnly.tag !== "needsHoles") return;
    expect(
      connectionOnly.holes.some((hole) => hole.kind === "targetChoice"),
    ).toBe(true);
    const casterOnlyTargetFill: Extract<
      BattleFill,
      { readonly kind: "targetChoice" }
    > = {
      kind: "targetChoice",
      holeId: targetHole.holeId,
      value: enemyId,
      spatialFacts: [
        {
          kind: "spellTarget",
          casterId,
          targetId: enemyId,
          spellId: "cure_wounds",
        },
      ],
    };
    const targetOnly = resolveBattleSubject({
      state: cast.state,
      subject: delivery.subject,
      fills: [casterOnlyTargetFill],
    });
    expect(targetOnly.tag).toBe("needsHoles");
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);
    if (targetOnly.tag !== "needsHoles") return;
    expect(
      targetOnly.holes.some((hole) => hole.kind === "findFamiliarConnection"),
    ).toBe(true);
    const missingFamiliarTargetFact = resolveBattleSubject({
      state: cast.state,
      subject: delivery.subject,
      fills: [connection, casterOnlyTargetFill],
    });
    expect(missingFamiliarTargetFact).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    const targetFill: Extract<BattleFill, { readonly kind: "targetChoice" }> = {
      kind: "targetChoice",
      holeId: targetHole.holeId,
      value: enemyId,
      spatialFacts: [
        {
          kind: "findFamiliarTouchSpellTarget",
          ownerId: casterId,
          familiarId,
          targetId: enemyId,
          spellId: "cure_wounds",
        },
      ],
    };
    const awaitingHealingRoll = resolveBattleSubject({
      state: cast.state,
      subject: delivery.subject,
      fills: [connection, targetFill],
    });
    expect(awaitingHealingRoll.tag).toBe("needsHoles");
    if (awaitingHealingRoll.tag !== "needsHoles") return;
    expect(awaitingHealingRoll.subject).toEqual(delivery.subject);
    expect(cast.state.combatants.get(familiarId)?.reactionAvailable).toBe(true);

    const delivered = resolveBattleSubject({
      state: cast.state,
      subject: delivery.subject,
      fills: [
        connection,
        targetFill,
        {
          kind: "rolledDice",
          holeId: requireHole(awaitingHealingRoll.holes, "rolledDice").holeId,
          value: [{ results: [DieRollResult(4), DieRollResult(4)] }],
        },
      ],
    });
    expect(delivered.tag).toBe("resolved");
    if (delivered.tag !== "resolved") return;
    expect(delivered.state.combatants.get(familiarId)?.reactionAvailable).toBe(
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

  test("Pact of the Chain familiar attack does not inherit owner natural-1 reroll support", () => {
    const cast = castCatFamiliarAfterCasterTurn(
      startPactWarlockFixtureBattle({
        ownerCharacterUnitRefs: [halflingLuckUnitRef()],
        ownerCharacterUnitFeatures: [halflingLuckUnitFeature()],
      }),
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
    const attackRoll = requireHole(awaitingAttackRoll.holes, "attackRoll");

    const naturalOneWithoutDecision = resolveBattleSubject({
      state: cast.state,
      subject,
      fills: [
        target,
        attackRollFill(attackRoll, { total: 5, naturalD20: 1 }),
      ],
    });
    expect(naturalOneWithoutDecision).toMatchObject({ tag: "resolved" });

    const attemptedOwnerReroll = resolveBattleSubject({
      state: cast.state,
      subject,
      fills: [
        target,
        {
          kind: "attackRoll",
          holeId: attackRoll.holeId,
          value: {
            total: 5,
            naturalD20: DieRollResult(1),
            d20TestNaturalOneReroll: {
              kind: "reroll",
              effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
              replacement: {
                total: 18,
                naturalD20: DieRollResult(15),
              },
            },
          },
        },
      ],
    });
    expect(attemptedOwnerReroll).toMatchObject({
      tag: "invalid",
      message: D20_TEST_NATURAL_ONE_REROLL_UNAVAILABLE_MESSAGE,
    });
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
      snapshot: { pendingInterrupt: { trigger: "attackHit" } },
    });
    if (awaitingReaction.tag !== "needsHoles") return;
    const shieldChoice =
      awaitingReaction.snapshot.pendingInterrupt?.choices.find(
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

    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: enemyId,
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
      snapshot: { pendingInterrupt: null },
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
      snapshot: { pendingInterrupt: { trigger: "attackHit" } },
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
    expect(encoded.companions).toEqual([
      {
        status: "present",
        ownerId: casterId,
        companionId: familiarId,
        identity: { tag: "battleOnly" },
        protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
        formAccess: "findFamiliar",
        formSelection: { tag: "normalNamedForm", formId: "cat" },
        resolvedStatBlockId: "stat_block_cat",
        creatureTypeOverride: firstTypeOverride.creatureType,
        initiative: 18,
        placement: { kind: "unoccupiedSpaceWithinSpellRange" },
      },
    ]);

    const decoded = Schema.decodeUnknownEither(BattleSnapshotSchema)(encoded);
    expect(Either.isRight(decoded)).toBe(true);
    const invalid = Schema.decodeUnknownEither(BattleSnapshotSchema)({
      ...encoded,
      companions: [{ status: "present" }],
    });
    expect(Either.isLeft(invalid)).toBe(true);
    const invalidPactSpecialWithoutPactAccess = Schema.decodeUnknownEither(
      BattleSnapshotSchema,
    )({
      ...encoded,
      companions: [
        {
          ...encoded.companions[0],
          formSelection: { tag: "pactOfTheChainSpecialForm", formId: "imp" },
        },
      ],
    });
    expect(Either.isLeft(invalidPactSpecialWithoutPactAccess)).toBe(true);
    const invalidPactSpecialFormId = Schema.decodeUnknownEither(
      BattleSnapshotSchema,
    )({
      ...encoded,
      companions: [
        {
          ...encoded.companions[0],
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
      companions: [
        {
          status: "temporarilyDismissed",
          companionId: familiarId,
          ownerId: casterId,
          identity: { tag: "battleOnly" },
          protocol: { tag: "ordinaryFamiliarLikeOneAtATime" },
          reappearanceCombatantId: familiarId,
          formAccess: "findFamiliar",
          formSelection: { tag: "normalNamedForm", formId: "cat" },
          creatureTypeOverride: firstTypeOverride.creatureType,
          hitPoints: { currentHp: 0, tempHp: 0 },
        },
      ],
    });
    expect(Either.isLeft(dismissedAtZeroHp)).toBe(true);
  });

  test("snapshot projects familiar owner and companion identity from companion state", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const familiarEntry = findFamiliarCompanionEntryForOwner(
      cast.state,
      casterId,
    );
    expect(familiarEntry).not.toBeNull();
    if (familiarEntry === null) return;
    if (familiarEntry.companion.status !== "present") {
      throw new Error("Expected present familiar after cast.");
    }

    expect(snapshotBattle(cast.state).companions).toMatchObject([
      { ownerId: casterId, companionId: familiarEntry.companion.combatantId },
    ]);
  });
});
