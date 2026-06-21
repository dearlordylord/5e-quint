import {
  battleCombatantSide,
  battleCreatureInitFromStatBlock,
  battleId,
  discoverBattleActs,
  initiativeScore,
  spellSlotInvocationRef,
  startBattle,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  type SpellSlotProcedure,
} from "@dnd/battle-runtime";
import {
  abilityScoreAssignment,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
  sorcererMetamagicOptionId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  characterSheetId,
  createFreshCharacterSheet,
  type CharacterSheet,
  type CharacterSheetResourceExpenditure,
} from "@dnd/character-sheet-runtime";
import { DieRollResult, Hp } from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { StatBlockRecord, UnitRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import { characterSheetBattleInit } from "./index.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("SDK integration test catalogs must build.");
}

export const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;

const partySide = battleCombatantSide("party");
const monsterSide = battleCombatantSide("monsters");

type CharacterCombatantState = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  >;
};

type SheetFixture = {
  readonly sheet: CharacterSheet;
  readonly combatantId: CombatantId;
  readonly initiative: number;
};

export function battleFromSheets(input: {
  readonly battleIdText: string;
  readonly characters: readonly SheetFixture[];
  readonly monsters: readonly Parameters<
    typeof battleCreatureInitFromStatBlock
  >[0][];
}): BattleState {
  const characterInits = input.characters.map((character) =>
    requireRight(
      characterSheetBattleInit({
        sheet: character.sheet,
        combatantId: character.combatantId,
        displayName: character.sheet.characterId,
        initiative: initiativeScore(character.initiative),
        side: partySide,
        unitLibrary,
        statBlockCatalog,
      }),
    ),
  );
  return requireRight(
    startBattle({
      battleId: battleId(input.battleIdText),
      combatants: [
        ...characterInits,
        ...input.monsters.map((monster) =>
          battleCreatureInitFromStatBlock(monster),
        ),
      ],
    }),
  );
}

export function characterSheet(input: {
  readonly characterIdText: string;
  readonly combatantId: CombatantId;
  readonly build: CharacterBuild;
  readonly initiative: number;
  readonly maximumHp: number;
  readonly resourceExpenditures?: readonly CharacterSheetResourceExpenditure[];
}): SheetFixture {
  return {
    combatantId: input.combatantId,
    initiative: input.initiative,
    sheet: requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId(input.characterIdText),
        build: input.build,
        maximumHp: Hp(input.maximumHp),
        hitPointMaximumReduction: Hp(0),
        currentHp: Hp(input.maximumHp),
        tempHp: Hp(0),
        conditions: [],
        unitLibrary,
        ...(input.resourceExpenditures === undefined
          ? {}
          : { resourceExpenditures: input.resourceExpenditures }),
      }),
    ),
  };
}

function levelFiveBaseBuild(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly abilityScores?: Parameters<typeof abilityScoreAssignment>[0];
  readonly equipment?: CharacterBuild["equipment"];
  readonly features?: CharacterBuild["features"];
  readonly spellcasting?: CharacterBuild["spellcasting"];
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(input.classUnitId),
      advancements: Array.from({ length: 4 }, () => ({
        classUnitId: classUnitId(input.classUnitId),
        hitPointRule: { tag: "fixedHigherLevelGain" as const },
      })),
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: requireRight(
      abilityScoreAssignment(
        input.abilityScores ?? {
          str: 16,
          dex: 14,
          con: 14,
          int: 10,
          wis: 10,
          cha: 10,
        },
      ),
    ),
    proficiencyChoices: [],
    features: input.features ?? [],
    ...(input.spellcasting === undefined
      ? {}
      : { spellcasting: input.spellcasting }),
    equipment: input.equipment ?? { owned: [], loadout: {} },
  };
}

export function levelFiveMartialBuild(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly weaponUnitId: UnitRecord["id"];
  readonly abilityScores?: Parameters<typeof abilityScoreAssignment>[0];
}): CharacterBuild {
  const weaponItemId = characterEquipmentItemId({
    slot: "main",
    unitId: requireRight(characterEquipmentItemUnitId(input.weaponUnitId)),
  });
  return levelFiveBaseBuild({
    classUnitId: input.classUnitId,
    ...(input.abilityScores === undefined
      ? {}
      : { abilityScores: input.abilityScores }),
    equipment: {
      owned: [{ itemId: weaponItemId, unitId: input.weaponUnitId }],
      loadout: {
        weapon: { itemId: weaponItemId, grip: "one_handed" },
      },
    },
  });
}

export function levelFiveWizardBuild(input: {
  readonly preparedSpells: readonly UnitRecord["id"][];
}): CharacterBuild {
  return levelFiveBaseBuild({
    classUnitId: "class_wizard",
    abilityScores: { str: 8, dex: 14, con: 14, int: 16, wis: 10, cha: 10 },
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_wizard",
          spellcastingAbility: "int",
          cantrips: [],
          spellbook: input.preparedSpells,
          preparedSpells: input.preparedSpells,
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 3 },
            { spellLevel: 3, count: 2 },
          ],
        },
      },
    },
  });
}

export function levelFiveSorcererBuild(): CharacterBuild {
  return levelFiveBaseBuild({
    classUnitId: "class_sorcerer",
    abilityScores: { str: 8, dex: 14, con: 14, int: 10, wis: 10, cha: 16 },
    features: [
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: "sorcerer_metamagic",
        optionId: requireRight(
          sorcererMetamagicOptionId("sorcerer_empowered_spell"),
        ),
      },
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: "sorcerer_metamagic",
        optionId: requireRight(
          sorcererMetamagicOptionId("sorcerer_heightened_spell"),
        ),
      },
    ],
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_sorcerer",
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 3 },
            { spellLevel: 3, count: 2 },
          ],
        },
      },
    },
  });
}

export function monsterBattleInput(
  id: CombatantId,
  initiative: number,
  statBlock: StatBlockRecord,
  input: { readonly tempHp?: number } = {},
): Parameters<typeof battleCreatureInitFromStatBlock>[0] {
  return {
    combatantId: id,
    statBlock,
    initiative: initiativeScore(initiative),
    side: monsterSide,
    ...(input.tempHp === undefined ? {} : { tempHp: Hp(input.tempHp) }),
  };
}

export function srdStatBlock(id: StatBlockRecord["id"]): StatBlockRecord {
  return statBlockCatalog.requireStatBlock(id);
}

export function attackSubject(
  state: BattleState,
  actorId: CombatantId,
  attackName: string,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.attackName === attackName,
  );
  if (
    act === undefined ||
    act.subject.tag !== "action" ||
    act.subject.action !== "attack"
  ) {
    throw new Error(`Expected ${attackName} Attack action.`);
  }
  return act.subject;
}

export function spellSlotActForProcedure(
  state: BattleState,
  spellId: string,
  slotLevel: number,
  procedure: SpellSlotProcedure,
) {
  const expectedInvocation = spellSlotInvocationRef(
    spellId,
    slotLevel,
    procedure,
  );
  if (expectedInvocation.tag !== "spellSlot") {
    throw new Error(`Expected ${spellId} spell-slot invocation.`);
  }
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      candidate.subject.invocation.spellId === expectedInvocation.spellId &&
      candidate.subject.invocation.slotLevel === expectedInvocation.slotLevel &&
      candidate.subject.invocation.procedure === expectedInvocation.procedure,
  );
  if (act === undefined || act.subject.tag !== "actionSpell") {
    throw new Error(`Expected ${spellId} spell action.`);
  }
  return act;
}

export function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  actorId: CombatantId,
  targetId: CombatantId,
  attackName: string,
  extraSpatialFacts: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"] = [],
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId,
        targetId,
        attackName,
      },
      ...extraSpatialFacts,
    ],
  };
}

export function knownWillingSpellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: string,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        spellId,
      },
      {
        kind: "spellTargetKnownWilling",
        casterId,
        targetId,
        spellId,
      },
    ],
  };
}

export function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: "advantage" | "disadvantage" | "normal";
  },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
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

export function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
  input: {
    readonly selectedAttackDamageRiderUnitIds?: readonly string[];
    readonly cunningStrikeOption?: Extract<
      BattleFill,
      { readonly kind: "rolledDice" }
    >["cunningStrikeOption"];
  } = {},
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      rolledDiceGroup(firstGroup),
      ...restGroups.map((group) => rolledDiceGroup(group)),
    ],
    ...(input.selectedAttackDamageRiderUnitIds === undefined
      ? {}
      : {
          selectedAttackDamageRiderUnitIds:
            input.selectedAttackDamageRiderUnitIds,
        }),
    ...(input.cunningStrikeOption === undefined
      ? {}
      : { cunningStrikeOption: input.cunningStrikeOption }),
  };
}

export function unitFeatureDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "unitFeatureDecision" }>,
  value: Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "unitFeatureDecision" }> {
  return { kind: "unitFeatureDecision", holeId: hole.holeId, value };
}

export function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
  };
}

export function requireHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${kind} hole.`);
  }
  return requireHoleFromList(result.holes, kind);
}

export function requireHoleFromList<K extends BattleHole["kind"]>(
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

export function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved battle result, got ${result.tag}.`);
  }
  return result;
}

export function requireCombatant(
  state: BattleState,
  combatantIdValue: CombatantId,
): BattleCreatureState {
  const combatant = state.combatants.get(combatantIdValue);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantIdValue}.`);
  }
  return combatant;
}

export function requireCharacterCombatant(
  state: BattleState,
  combatantIdValue: CombatantId,
): CharacterCombatantState {
  const combatant = requireCombatant(state, combatantIdValue);
  if (!isCharacterCombatant(combatant)) {
    throw new Error(`Expected character combatant ${combatantIdValue}.`);
  }
  return combatant;
}

export function characterResources(combatant: CharacterCombatantState) {
  return combatant.origin.resources;
}

export function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}

function rolledDiceGroup(
  group: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [first, ...rest] = group;
  if (first === undefined) {
    throw new Error("Expected at least one die result.");
  }
  return {
    results: [DieRollResult(first), ...rest.map((die) => DieRollResult(die))],
  };
}

function isCharacterCombatant(
  combatant: BattleCreatureState,
): combatant is CharacterCombatantState {
  return combatant.origin.kind === "character";
}
