import {
  battleCombatantSide,
  battleCreatureInitFromStatBlock,
  battleId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  startBattle,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "@dnd/battle-runtime";
import {
  abilityScoreAssignment,
  characterBuildHitPoints,
  characterDraftId,
  creationChoiceOptionId,
  createCharacterDraft,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  loadoutEquipmentUnitId,
  loadoutSourceHoleIdText,
  parseCreationHoleId,
  unitChoiceKey,
  unitChoiceSourceHoleIdText,
  unitChoiceSourceUnitId,
  type AbilityScoreAssignment,
  type CharacterBuild,
  type CharacterDraft,
  type CreationFill,
  type LoadoutSlot,
} from "@dnd/character-creation-runtime";
import {
  characterSheetId,
  createFreshCharacterSheet,
  type CharacterSheet,
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
import { Either } from "effect";

import { characterSheetBattleInit } from "./index.ts";

export type FighterCharacterBattleCombatant = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  >;
};

type AttackBattleSubject = Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
>;
type BattleAct = ReturnType<typeof discoverBattleActs>[number];
type AttackBattleAct = BattleAct & { readonly subject: AttackBattleSubject };

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Fighter character lifecycle test catalogs must build.");
}

export const fighterLifecycleUnitLibrary = unitCatalogResult.catalog;
const fighterLifecycleStatBlockCatalog = statBlockCatalogResult.catalog;
const fighterLifecycleCharacterId = characterSheetId(
  "character:fighter-lifecycle",
);
export const fighterLifecycleCharacterCombatantId = combatantId(
  "combatant:fighter-lifecycle-character",
);
const fighterLifecycleSkeletonCombatantId = combatantId(
  "combatant:fighter-lifecycle-skeleton",
);
export const fighterLifecycleSheetMaximumHp = 12;
export const fighterLifecycleSettledHp = 8;

export function createFighterLifecycleDraft(): CharacterDraft {
  return createCharacterDraft({
    unitLibrary: fighterLifecycleUnitLibrary,
    draftId: characterDraftId("draft:fighter-lifecycle"),
  });
}

export function finalizeFighterLifecycleDraft(
  draft: CharacterDraft,
): CharacterBuild {
  const afterInitial = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft,
      unitLibrary: fighterLifecycleUnitLibrary,
      expectedRevision: draft.revision,
      fills: initialManifestFills(),
    }),
  );
  const afterChoices = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary: fighterLifecycleUnitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          unitChoiceHoleId("class_fighter", "class_skill_proficiency_choice"),
          "perception",
          "survival",
        ),
        choiceFill(
          unitChoiceHoleId(
            "fighter_fighting_style",
            "class_feature_feat_choice",
          ),
          "defense",
        ),
        choiceFill(
          unitChoiceHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
        ),
        choiceFill(
          unitChoiceHoleId(
            "background_soldier",
            "background_ability_score_increase",
          ),
          "two_and_one:str:con",
        ),
        choiceFill(
          unitChoiceHoleId("background_soldier", "background_tool_choice"),
          "tool_dice_set",
        ),
        choiceFill(
          unitChoiceHoleId("class_fighter", "class_equipment_choice"),
          "option_c",
        ),
        choiceFill(
          unitChoiceHoleId("background_soldier", "background_equipment_choice"),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary: fighterLifecycleUnitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        choiceFill(
          unitChoiceHoleId("class_fighter", "equipment_purchase"),
          "armor_chain_mail",
          "weapon_longsword",
          "equipment_shield",
        ),
      ],
    }),
  );
  const completeDraft = requireAcceptedCreationBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary: fighterLifecycleUnitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill(loadoutHoleId("armor_chain_mail", "armor"), "worn"),
        choiceFill(loadoutHoleId("equipment_shield", "shield"), "wielded"),
        choiceFill(
          loadoutHoleId("weapon_longsword", "weapon"),
          "wielded_one_handed",
        ),
      ],
    }),
  );
  const remainingHoles = discoverCreationHoles({
    draft: completeDraft,
    unitLibrary: fighterLifecycleUnitLibrary,
  });
  if (remainingHoles.length > 0) {
    throw new Error("Expected Fighter lifecycle draft to have no open holes.");
  }
  const finalization = finalizeCharacterDraft({
    draft: completeDraft,
    unitLibrary: fighterLifecycleUnitLibrary,
  });
  if (finalization.tag !== "ready") {
    throw new Error(`Expected ready Fighter build, received ${finalization.tag}.`);
  }
  return finalization.build;
}

export function createFighterLifecycleSheet(
  build: CharacterBuild,
): CharacterSheet {
  const maximumHp = fighterLifecycleBuildMaximumHp(build);
  if (maximumHp !== fighterLifecycleSheetMaximumHp) {
    throw new Error("Expected Fighter lifecycle build to have 12 HP.");
  }
  return requireRight(
    createFreshCharacterSheet({
      characterId: fighterLifecycleCharacterId,
      build,
      currentHp: Hp(maximumHp),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary: fighterLifecycleUnitLibrary,
    }),
  );
}

export function startFighterLifecycleBattle(sheet: CharacterSheet): {
  readonly state: BattleState;
  readonly combatant: FighterCharacterBattleCombatant;
} {
  const characterInit = requireRight(
    characterSheetBattleInit({
      sheet,
      unitLibrary: fighterLifecycleUnitLibrary,
      statBlockCatalog: fighterLifecycleStatBlockCatalog,
      combatantId: fighterLifecycleCharacterCombatantId,
      displayName: "Fighter Lifecycle",
      initiative: initiativeScore(10),
      side: battleCombatantSide("party"),
    }),
  );
  const state = requireRight(
    startBattle({
      battleId: battleId("battle:fighter-lifecycle"),
      combatants: [
        characterInit,
        battleCreatureInitFromStatBlock({
          combatantId: fighterLifecycleSkeletonCombatantId,
          statBlock:
            fighterLifecycleStatBlockCatalog.requireStatBlock(
              "stat_block_skeleton",
            ),
          initiative: initiativeScore(20),
          side: battleCombatantSide("monsters"),
        }),
      ],
    }),
  );
  const combatant = requireFighterCharacterCombatant(
    state.combatants.get(fighterLifecycleCharacterCombatantId),
  );
  return { state, combatant };
}

export function resolveFighterLifecycleSkeletonShortswordAttack(
  state: BattleState,
): BattleState {
  const act = requireSkeletonShortswordAct(state);
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const targetFillValue = targetChoiceFill(target, act.subject);
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFillValue],
    }),
    "attackRoll",
  );
  const attackRollFillValue = attackRollFill(attackRoll, {
    total: 20,
    naturalD20: 15,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFillValue, attackRollFillValue],
    }),
    "rolledDice",
  );
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetFillValue,
      attackRollFillValue,
      rolledDiceFill(damage, [[1]]),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(
      `Expected resolved Skeleton Shortsword attack, got ${resolved.tag}.`,
    );
  }
  return resolved.state;
}

export function fighterLifecycleBuildMaximumHp(build: CharacterBuild): number {
  const hitPoints = requireRight(
    characterBuildHitPoints(build, fighterLifecycleUnitLibrary),
  );
  return Number(hitPoints.maximum);
}

export function requireFighterCharacterCombatant(
  combatant: BattleCreatureState | undefined,
): FighterCharacterBattleCombatant {
  if (!isFighterCharacterCombatant(combatant)) {
    throw new Error("Expected character-origin battle combatant.");
  }
  return combatant;
}

export function battleStateWithCombatant(
  state: BattleState,
  combatant: BattleCreatureState,
): BattleState {
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatant.combatantId, combatant),
  };
}

export function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}

function initialManifestFills(): readonly CreationFill[] {
  return [
    choiceFill(
      "cc:draft:draft.progression.initial",
      "13:class_fighter:level_1:maximum_hit_die",
    ),
    choiceFill("cc:draft:draft.background", "background_soldier"),
    choiceFill("cc:draft:draft.species", "species_orc"),
    {
      kind: "abilityScores",
      holeId: draftHoleId("cc:draft:draft.abilityScoreGeneration"),
      method: "standardArray",
      value: abilityScores({
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    },
    choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
    choiceFill("cc:draft:draft.alignment", "lawful_good"),
  ];
}

function requireSkeletonShortswordAct(state: BattleState): AttackBattleAct {
  const act = discoverBattleActs(state).find(isSkeletonShortswordAttackAct);
  if (act === undefined) {
    throw new Error("Expected Skeleton Shortsword attack act.");
  }
  return act;
}

function isSkeletonShortswordAttackAct(act: BattleAct): act is AttackBattleAct {
  return (
    act.subject.tag === "action" &&
    act.subject.action === "attack" &&
    act.subject.actorId === fighterLifecycleSkeletonCombatantId &&
    act.subject.attackName === "Shortsword"
  );
}

function targetChoiceFill(
  hole: BattleHole,
  subject: AttackBattleSubject,
): BattleFill {
  if (hole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  if (!hole.choices.includes(fighterLifecycleCharacterCombatantId)) {
    throw new Error("Expected Fighter lifecycle character target choice.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: fighterLifecycleCharacterCombatantId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: subject.actorId,
        targetId: fighterLifecycleCharacterCombatantId,
        attackName: subject.attackName,
      },
    ],
  };
}

function attackRollFill(
  hole: BattleHole,
  value: { readonly total: number; readonly naturalD20: number },
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
    },
  };
}

function rolledDiceFill(
  hole: BattleHole,
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
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"] {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

function rolledDiceGroup(
  group: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
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

function abilityScores(
  scores: Parameters<typeof abilityScoreAssignment>[0],
): AbilityScoreAssignment {
  return requireRight(abilityScoreAssignment(scores));
}

function choiceFill(
  holeId: string,
  ...optionIds: readonly string[]
): CreationFill {
  return {
    kind: "choice",
    holeId: draftHoleId(holeId),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function draftHoleId(
  holeId: string,
): NonNullable<ReturnType<typeof parseCreationHoleId>> {
  const parsed = parseCreationHoleId(holeId);
  if (parsed === null) {
    throw new Error(`Expected supported creation hole id: ${holeId}`);
  }
  return parsed;
}

function unitChoiceHoleId(unitId: string, choiceKey: string): string {
  return unitChoiceSourceHoleIdText({
    tag: "unitChoice",
    unitId: requireRight(unitChoiceSourceUnitId(unitId)),
    choiceKey: requireRight(unitChoiceKey(choiceKey)),
  });
}

function loadoutHoleId(equipmentUnitId: string, slot: LoadoutSlot): string {
  return loadoutSourceHoleIdText({
    tag: "loadout",
    equipmentUnitId: requireRight(loadoutEquipmentUnitId(equipmentUnitId)),
    slot,
  });
}

function requireAcceptedCreationBatch(
  result: ReturnType<typeof fillCreationHoles>,
): CharacterDraft {
  if (result.tag !== "accepted") {
    throw new Error(
      `Expected accepted character-creation fill batch, received ${JSON.stringify(result.issues)}`,
    );
  }
  return result.draft;
}

function requireHoleFromList<K extends BattleHole["kind"]>(
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

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(
      `Expected needsHoles, got ${result.tag}${
        result.tag === "invalid" ? `: ${result.message}` : ""
      }.`,
    );
  }
  return requireHoleFromList(result.holes, kind);
}

function isFighterCharacterCombatant(
  combatant: BattleCreatureState | undefined,
): combatant is FighterCharacterBattleCombatant {
  return combatant?.origin.kind === "character";
}
