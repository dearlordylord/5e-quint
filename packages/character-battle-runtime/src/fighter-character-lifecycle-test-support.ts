import {
  combatantId,
  discoverBattleActs,
  resolveBattleSubject,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "@dnd/battle-runtime";
import {
  characterBuildHitPoints,
  type CharacterBuild,
  type CharacterDraft,
} from "@dnd/character-creation-runtime";
import type { CharacterSheet } from "@dnd/character-sheet-runtime";
import { DieRollResult } from "@dnd/shared/types";
import { Either } from "effect";

import {
  barbarianBuildSheetDraftPlan,
  createLegalSourceCharacterDraft,
  createLegalSourceCharacterSheet,
  finalizeLegalSourceCharacterDraft,
  legalLoadoutChoice,
  legalUnitChoice,
  monsterBattleInput,
  srdStatBlock,
  startLegalSourceCharacterBattle,
  unitLibrary,
  type LegalSourceCharacterDraftPlan,
} from "./sdk-integration-test-support.ts";

export type LifecycleCharacterBattleCombatant = BattleCreatureState & {
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

export const fighterLifecycleUnitLibrary = unitLibrary;
export const fighterLifecycleCharacterCombatantId = combatantId(
  "combatant:fighter-lifecycle-character",
);
const fighterLifecycleSkeletonCombatantId = combatantId(
  "combatant:fighter-lifecycle-skeleton",
);
export const fighterLifecycleSheetMaximumHp = 12;
export const fighterLifecycleSettledHp = 8;

export const barbarianClassBreadthCharacterCombatantId = combatantId(
  "combatant:barbarian-class-breadth-character",
);
const barbarianClassBreadthSkeletonCombatantId = combatantId(
  "combatant:barbarian-class-breadth-skeleton",
);
export const barbarianClassBreadthSheetMaximumHp = 14;

export const fighterLifecycleDraftPlan = {
  label: "Fighter lifecycle",
  classUnitId: "class_fighter",
  level: 1,
  backgroundUnitId: "background_soldier",
  speciesUnitId: "species_orc",
  languageOptionIds: ["Dwarvish", "Goblin"],
  alignmentOptionId: "lawful_good",
  abilityScores: {
    str: 15,
    dex: 14,
    con: 13,
    int: 8,
    wis: 10,
    cha: 12,
  },
  sourcePreferences: [
    legalUnitChoice(
      "class_fighter",
      "class_skill_proficiency_choice",
      "perception",
      "survival",
    ),
    legalUnitChoice(
      "fighter_fighting_style",
      "class_feature_feat_choice",
      "defense",
    ),
    legalUnitChoice(
      "fighter_weapon_mastery",
      "weapon_mastery_options",
      "weapon_longsword",
      "weapon_spear",
      "weapon_flail",
    ),
    legalUnitChoice(
      "background_soldier",
      "background_ability_score_increase",
      "two_and_one:str:con",
    ),
    legalUnitChoice(
      "background_soldier",
      "background_tool_choice",
      "tool_dice_set",
    ),
    legalUnitChoice("class_fighter", "class_equipment_choice", "option_c"),
    legalUnitChoice(
      "background_soldier",
      "background_equipment_choice",
      "option_b",
    ),
    legalUnitChoice(
      "class_fighter",
      "equipment_purchase",
      "armor_chain_mail",
      "weapon_longsword",
      "equipment_shield",
    ),
    legalLoadoutChoice("armor_chain_mail", "armor", "worn"),
    legalLoadoutChoice("equipment_shield", "shield", "wielded"),
    legalLoadoutChoice("weapon_longsword", "weapon", "wielded_one_handed"),
  ],
} as const satisfies LegalSourceCharacterDraftPlan;

export function createFighterLifecycleDraft(): CharacterDraft {
  return createLegalSourceCharacterDraft({
    draftIdText: "draft:fighter-lifecycle",
  });
}

export function createBarbarianClassBreadthDraft(): CharacterDraft {
  return createLegalSourceCharacterDraft({
    draftIdText: "draft:barbarian-class-breadth",
  });
}

export function finalizeFighterLifecycleDraft(
  draft: CharacterDraft,
): CharacterBuild {
  return finalizeLegalSourceCharacterDraft({
    draft,
    plan: fighterLifecycleDraftPlan,
  }).build;
}

export function finalizeBarbarianClassBreadthDraft(
  draft: CharacterDraft,
): CharacterBuild {
  return finalizeLegalSourceCharacterDraft({
    draft,
    plan: barbarianBuildSheetDraftPlan,
  }).build;
}

export function createFighterLifecycleSheet(
  build: CharacterBuild,
): CharacterSheet {
  const maximumHp = fighterLifecycleBuildMaximumHp(build);
  if (maximumHp !== fighterLifecycleSheetMaximumHp) {
    throw new Error("Expected Fighter lifecycle build to have 12 HP.");
  }
  return createLegalSourceCharacterSheet({
    characterIdText: "character:fighter-lifecycle",
    build,
    hitPoints: { tag: "maximum" },
  });
}

export function createBarbarianClassBreadthSheet(
  build: CharacterBuild,
): CharacterSheet {
  const maximumHp = lifecycleBuildMaximumHp(build);
  if (maximumHp !== barbarianClassBreadthSheetMaximumHp) {
    throw new Error("Expected Barbarian class-breadth build to have 14 HP.");
  }
  return createLegalSourceCharacterSheet({
    characterIdText: "character:barbarian-class-breadth",
    build,
    hitPoints: { tag: "maximum" },
  });
}

export function startFighterLifecycleBattle(sheet: CharacterSheet): {
  readonly state: BattleState;
  readonly combatant: LifecycleCharacterBattleCombatant;
} {
  const state = startLegalSourceCharacterBattle({
    sheet,
    battle: {
      tag: "withBattle",
      battleIdText: "battle:fighter-lifecycle",
      combatantId: fighterLifecycleCharacterCombatantId,
      initiative: 10,
      monsters: [
        monsterBattleInput(
          fighterLifecycleSkeletonCombatantId,
          20,
          srdStatBlock("stat_block_skeleton"),
        ),
      ],
    },
  });
  const combatant = requireLifecycleCharacterCombatant(
    state.combatants.get(fighterLifecycleCharacterCombatantId),
  );
  return { state, combatant };
}

export function startBarbarianClassBreadthBattle(sheet: CharacterSheet): {
  readonly state: BattleState;
  readonly combatant: LifecycleCharacterBattleCombatant;
} {
  const state = startLegalSourceCharacterBattle({
    sheet,
    battle: {
      tag: "withBattle",
      battleIdText: "battle:barbarian-class-breadth",
      combatantId: barbarianClassBreadthCharacterCombatantId,
      initiative: 9,
      monsters: [
        monsterBattleInput(
          barbarianClassBreadthSkeletonCombatantId,
          20,
          srdStatBlock("stat_block_skeleton"),
        ),
      ],
    },
  });
  const combatant = requireLifecycleCharacterCombatant(
    state.combatants.get(barbarianClassBreadthCharacterCombatantId),
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
  return lifecycleBuildMaximumHp(build);
}

function lifecycleBuildMaximumHp(build: CharacterBuild): number {
  const hitPoints = requireRight(
    characterBuildHitPoints(build, fighterLifecycleUnitLibrary),
  );
  return Number(hitPoints.maximum);
}

export function requireLifecycleCharacterCombatant(
  combatant: BattleCreatureState | undefined,
): LifecycleCharacterBattleCombatant {
  if (!isLifecycleCharacterCombatant(combatant)) {
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

function isLifecycleCharacterCombatant(
  combatant: BattleCreatureState | undefined,
): combatant is LifecycleCharacterBattleCombatant {
  return combatant?.origin.kind === "character";
}
