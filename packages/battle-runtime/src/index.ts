import { Brand, Match } from "effect";
import { isNonEmptyReadonlyArray } from "effect/Array";
import * as Either from "effect/Either";
import {
  canSpendAction,
  resetTurnActionEconomy,
  spendAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import {
  createScoredInitiativeStack,
  currentActing,
  initiativeOrder,
} from "@dnd/shared-algebras/initiative-algebra";
import {
  abilityModifier,
  armorClassDelta,
  currentArmorClass,
  defaultArmorClassState,
  statBlockArmorClassState,
  zeroAbilityModifiers,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  applyCondition,
  EMPTY_CONDITION_STATE,
  hasCondition,
  isIncapacitated,
} from "@dnd/shared-algebras/conditions-algebra";
import {
  addDeathFailures,
  resetDeathSaveRuntimeState,
} from "@dnd/shared-algebras/death-saves-algebra";
import type {
  ActionEconomyState,
  RuntimeActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import type { InitiativeStack } from "@dnd/shared-algebras/initiative-algebra";
import type {
  ArmorClass,
  ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import type { ConditionState } from "@dnd/shared-algebras/conditions-algebra";
import type {
  DeathSaves,
  DeathSaveRuntimeState,
} from "@dnd/shared-algebras/death-saves-algebra";
import type {
  HoleId,
  HoleInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  holeId,
  holeInstanceKey,
  type AttackRollResult,
  type FilledHoleValue,
  type RolledDiceGroup,
  type RuntimeHole,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { validateRolledDiceForDiceExpr } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  CONDITIONS as ALL_CONDITIONS,
  Hp,
  Round,
  type Condition,
  type CreatureId,
  type Initiative,
  type Round as RoundType,
} from "@dnd/shared/types";
import type {
  Ability,
  SixAbilityScores,
  StatBlockRecord,
  StatBlockValue,
  UnitRecord,
  WeaponDamage,
  WeaponRecord,
} from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { CharacterSheet, UnitRef } from "@dnd/character-creation-runtime";

export type CombatantId = CreatureId & Brand.Brand<"CombatantId">;
const CombatantId = Brand.nominal<CombatantId>();
export const combatantId: (value: string) => CombatantId = CombatantId;

export type BattleId = string & Brand.Brand<"BattleId">;
const BattleId = Brand.nominal<BattleId>();
export const battleId: (value: string) => BattleId = BattleId;

export type CharacterId = string & Brand.Brand<"CharacterId">;
const CharacterId = Brand.nominal<CharacterId>();
export const characterId: (value: string) => CharacterId = CharacterId;

export type MonsterId = string & Brand.Brand<"MonsterId">;
const MonsterId = Brand.nominal<MonsterId>();
export const monsterId: (value: string) => MonsterId = MonsterId;

export type InitiativeScore = Initiative & Brand.Brand<"InitiativeScore">;
const InitiativeScore = Brand.nominal<InitiativeScore>();
export const initiativeScore: (value: number) => InitiativeScore =
  InitiativeScore;

export type ZeroHpLifecycle =
  | {
      readonly policy: "diesAtZeroHp";
    }
  | {
      readonly policy: "usesDeathSavingThrows";
      readonly deathSaves: DeathSaveRuntimeState;
    };
export type ZeroHpLifecyclePolicy = ZeroHpLifecycle["policy"];

export type CharacterLoadoutRef = CharacterSheet["equipment"]["loadout"];
export type BattleWeaponDamage = Extract<
  WeaponDamage,
  { readonly kind: "dice" }
>;

export type BattleAttackProfile = {
  readonly kind: "weapon";
  readonly weapon: WeaponRecord;
  readonly ability: Ability;
  readonly abilityModifier: number;
};

export type CharacterCombatantSeed = {
  readonly kind: "character";
  readonly characterId: CharacterId;
  readonly sheetUnitRefs: readonly UnitRef[];
  readonly armorClass: ArmorClassState;
  readonly currentHp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly zeroHpLifecyclePolicy: "usesDeathSavingThrows";
  readonly selectedLoadout: CharacterLoadoutRef;
  readonly attack: BattleAttackProfile | null;
};

export type CharacterSheetCombatantInput = {
  readonly combatantId: CombatantId;
  readonly characterId: CharacterId;
  readonly displayName: string;
  readonly sheet: CharacterSheet;
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
};

export type StatBlockCombatantInput = {
  readonly combatantId: CombatantId;
  readonly monsterId: MonsterId;
  readonly statBlock: StatBlockRecord;
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
};

export type MonsterCombatantSeed = {
  readonly kind: "monster";
  readonly monsterId: MonsterId;
  readonly statBlock: StatBlockRecord;
  readonly currentHp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly zeroHpLifecyclePolicy: "diesAtZeroHp";
};

export type CombatantSeedInput = {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: InitiativeScore;
  readonly seed: CharacterCombatantSeed | MonsterCombatantSeed;
};

export type BattleTurnResources = ActionEconomyState & {
  readonly actionResources: readonly RuntimeActionResource[];
  readonly currentHasBonusAction: boolean;
};

export type CombatantState = {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: InitiativeScore;
  readonly hp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly conditions: ConditionState;
  readonly armorClass: ArmorClassState;
  readonly zeroHpLifecycle: ZeroHpLifecycle;
  readonly source:
    | {
        readonly kind: "character";
        readonly characterId: CharacterId;
        readonly sheetUnitRefs: readonly UnitRef[];
        readonly selectedLoadout: CharacterLoadoutRef;
        readonly attack: BattleAttackProfile | null;
      }
    | {
        readonly kind: "monster";
        readonly monsterId: MonsterId;
        readonly statBlock: StatBlockRecord;
      };
};

export type BattleState = {
  readonly battleId: BattleId;
  readonly initiative: InitiativeStack<CombatantId>;
  readonly combatants: ReadonlyMap<CombatantId, CombatantState>;
  readonly currentTurnResources: BattleTurnResources;
};

export const BATTLE_CORE_ACTS = ["attack", "endTurn"] as const;
export type BattleCoreAct = (typeof BATTLE_CORE_ACTS)[number];

export type BattleSubject = {
  readonly tag: "coreAct";
  readonly actorId: CombatantId;
  readonly act: BattleCoreAct;
};

export type AvailableBattleAct = {
  readonly subject: BattleSubject;
  readonly label: string;
  readonly summary: string;
  readonly initialHoles: readonly BattleHole[];
};

export type BattleHoleId = HoleId;
export type BattleHoleInstanceKey = HoleInstanceKey;
export type BattleTargetChoiceHole = Extract<
  RuntimeHole,
  { readonly kind: "targetChoice" }
> & {
  readonly choices: readonly CombatantId[];
};
export type BattleAttackRollHole = Extract<
  RuntimeHole,
  { readonly kind: "attackRoll" }
>;
export type BattleDamageRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly attack: BattleAttackProfile;
};
export type BattleHole =
  | BattleTargetChoiceHole
  | BattleAttackRollHole
  | BattleDamageRollHole;
export type BattleFill = Extract<
  FilledHoleValue,
  { readonly kind: "targetChoice" | "attackRoll" | "rolledDice" }
>;

export type BattleResolutionInput = {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
};

export const BATTLE_INVALID_REASON_CODES = [
  "staleSubject",
  "wrongActor",
  "missingCombatant",
  "invalidFill",
  "unsupportedSubject",
  "unsupportedSurfaceShape",
] as const;
export type BattleInvalidReasonCode =
  (typeof BATTLE_INVALID_REASON_CODES)[number];

export type BattleResolutionResult =
  | {
      readonly tag: "resolved";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
    }
  | {
      readonly tag: "needsHoles";
      readonly subject: BattleSubject;
      readonly holes: readonly BattleHole[];
      readonly snapshot: BattleSnapshot;
    }
  | {
      readonly tag: "invalid";
      readonly reason: BattleInvalidReasonCode;
      readonly message: string;
      readonly snapshot: BattleSnapshot;
    };

export type BattleSnapshot = {
  readonly battleId: BattleId;
  readonly round: RoundType;
  readonly currentActorId: CombatantId;
  readonly turnOrder: readonly CombatantId[];
  readonly combatants: readonly CombatantSnapshot[];
  readonly acts: readonly AvailableBattleAct[];
  readonly currentTurnResources: BattleTurnResources;
};

export type CombatantSnapshot = {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly sourceKind: CombatantState["source"]["kind"];
  readonly hp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly armorClass: ArmorClass;
  readonly defeated: boolean;
  readonly zeroHpLifecycle: CombatantZeroHpLifecycleSnapshot;
  readonly conditions: readonly Condition[];
};

export type CombatantZeroHpLifecycleSnapshot =
  | {
      readonly policy: "diesAtZeroHp";
      readonly dead: boolean;
    }
  | {
      readonly policy: "usesDeathSavingThrows";
      readonly deathSaves: DeathSaves;
      readonly stable: boolean;
      readonly dead: boolean;
    };

const INITIAL_ROUND: RoundType = Round(1);
const INITIAL_TURN_RESOURCES = resetTurnActionEconomy({
  actionResources: [],
  currentHasBonusAction: false,
});
const ATTACK_TARGET_HOLE_ID = holeId("battle:attack:target");
const ATTACK_ROLL_HOLE_ID = holeId("battle:attack:roll");
const ATTACK_TARGET_HOLE_INSTANCE = holeInstanceKey("battle:attack:target");
const ATTACK_ROLL_HOLE_INSTANCE = holeInstanceKey("battle:attack:roll");

export function startBattle(input: {
  readonly battleId: BattleId;
  readonly combatants: readonly CombatantSeedInput[];
}): BattleState {
  if (input.combatants.length === 0) {
    throw new Error("startBattle requires at least one combatant.");
  }

  const combatants = new Map<CombatantId, CombatantState>();
  for (const combatant of input.combatants) {
    if (combatants.has(combatant.combatantId)) {
      throw new Error(`Duplicate combatant id: ${combatant.combatantId}`);
    }
    combatants.set(combatant.combatantId, combatantState(combatant));
  }

  const orderedEntries = [...input.combatants]
    .sort((left, right) => right.initiative - left.initiative)
    .map((combatant) => ({
      creature: combatant.combatantId,
      initiative: combatant.initiative,
    }));
  if (!isNonEmptyReadonlyArray(orderedEntries)) {
    throw new Error("startBattle requires at least one combatant.");
  }

  const initiative = createScoredInitiativeStack<CombatantId>(
    orderedEntries,
    INITIAL_ROUND,
  );
  if (Either.isLeft(initiative)) {
    throw new Error(initiative.left);
  }

  return {
    battleId: input.battleId,
    initiative: initiative.right,
    combatants,
    currentTurnResources: INITIAL_TURN_RESOURCES,
  };
}

export function startBattleFromCharacterSheetAndStatBlock(input: {
  readonly battleId: BattleId;
  readonly character: CharacterSheetCombatantInput;
  readonly monster: StatBlockCombatantInput;
  readonly unitLibrary: UnitCatalog;
}): BattleState {
  return startBattle({
    battleId: input.battleId,
    combatants: [
      combatantSeedFromCharacterSheet({
        ...input.character,
        unitLibrary: input.unitLibrary,
      }),
      combatantSeedFromStatBlock(input.monster),
    ],
  });
}

export function discoverBattleActs(
  state: BattleState,
): readonly AvailableBattleAct[] {
  const actorId = currentActorId(state);
  if (!state.combatants.has(actorId)) {
    return [];
  }

  const acts: AvailableBattleAct[] = [];
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "attack") &&
    supportedAttackProfile(state, actorId) != null &&
    attackTargetChoices(state, actorId).length > 0
  ) {
    acts.push({
      subject: { tag: "coreAct", actorId, act: "attack" },
      label: "Attack",
      summary: "Take the Attack action.",
      initialHoles: [attackTargetHole(state, actorId)],
    });
  }
  acts.push({
    subject: { tag: "coreAct", actorId, act: "endTurn" },
    label: "End Turn",
    summary: "End the current combatant's turn.",
    initialHoles: [],
  });

  return acts;
}

export function resolveBattleSubject(
  input: BattleResolutionInput,
): BattleResolutionResult {
  if (input.subject.actorId !== currentActorId(input.state)) {
    return invalidResult(
      input.state,
      "wrongActor",
      "Subject actor is not the current actor.",
    );
  }

  if (!input.state.combatants.has(input.subject.actorId)) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Subject actor is not in this battle.",
    );
  }

  if (
    input.subject.act === "attack" &&
    !combatantCanTakeActions(input.state.combatants.get(input.subject.actorId))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }

  if (
    input.subject.act === "attack" &&
    !canSpendAction(input.state.currentTurnResources, "attack")
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }

  if (input.subject.act === "attack") {
    return resolveAttack(input);
  }

  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn does not accept battle fills.",
    );
  }

  return invalidResult(
    input.state,
    "unsupportedSubject",
    `${input.subject.act} resolution is not implemented in the battle runtime skeleton.`,
  );
}

export function endTurn(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const result = resolveBattleSubject({
    state: input.state,
    subject: { tag: "coreAct", actorId: input.actorId, act: "endTurn" },
    fills: [],
  });

  if (result.tag === "needsHoles") {
    throw new Error("endTurn unexpectedly requested holes.");
  }

  return result;
}

export function snapshotBattle(state: BattleState): BattleSnapshot {
  const turnOrder = [...initiativeOrder(state.initiative)];

  return {
    battleId: state.battleId,
    round: state.initiative.round,
    currentActorId: currentActorId(state),
    turnOrder,
    combatants: turnOrder.flatMap((id) => {
      const combatant = state.combatants.get(id);
      return combatant == null ? [] : [combatantSnapshot(combatant)];
    }),
    acts: discoverBattleActs(state),
    currentTurnResources: state.currentTurnResources,
  };
}

function combatantState(input: CombatantSeedInput): CombatantState {
  const base = {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: input.initiative,
    hp: input.seed.currentHp,
    maxHp: input.seed.maxHp,
    tempHp: input.seed.tempHp,
    conditions: EMPTY_CONDITION_STATE,
    zeroHpLifecycle: initialZeroHpLifecycle(input.seed.zeroHpLifecyclePolicy),
  };

  if (input.seed.kind === "character") {
    return applyInitialZeroHpLifecycle({
      ...base,
      armorClass: input.seed.armorClass,
      source: {
        kind: "character",
        characterId: input.seed.characterId,
        sheetUnitRefs: input.seed.sheetUnitRefs,
        selectedLoadout: input.seed.selectedLoadout,
        attack: input.seed.attack,
      },
    });
  }

  return applyInitialZeroHpLifecycle({
    ...base,
    armorClass: statBlockArmorClassState(
      literalStatBlockNumber(input.seed.statBlock.statBlock.ac),
    ),
    source: {
      kind: "monster",
      monsterId: input.seed.monsterId,
      statBlock: input.seed.statBlock,
    },
  });
}

function currentActorId(state: BattleState): CombatantId {
  return currentActing(state.initiative);
}

function combatantSnapshot(combatant: CombatantState): CombatantSnapshot {
  return {
    combatantId: combatant.combatantId,
    displayName: combatant.displayName,
    sourceKind: combatant.source.kind,
    hp: combatant.hp,
    maxHp: combatant.maxHp,
    tempHp: combatant.tempHp,
    armorClass: currentArmorClass(combatant.armorClass),
    defeated: combatant.hp === 0,
    zeroHpLifecycle: combatantZeroHpLifecycleSnapshot(combatant),
    conditions: activeConditions(combatant.conditions),
  };
}

function initialZeroHpLifecycle(
  policy: ZeroHpLifecyclePolicy,
): ZeroHpLifecycle {
  return Match.value(policy).pipe(
    Match.when("diesAtZeroHp", () => ({
      policy: "diesAtZeroHp" as const,
    })),
    Match.when("usesDeathSavingThrows", () => ({
      policy: "usesDeathSavingThrows" as const,
      deathSaves: resetDeathSaveRuntimeState(),
    })),
    Match.exhaustive,
  );
}

function combatantZeroHpLifecycleSnapshot(
  combatant: CombatantState,
): CombatantZeroHpLifecycleSnapshot {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, (lifecycle) => ({
      policy: lifecycle.policy,
      dead: combatant.hp === 0,
    })),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      policy: lifecycle.policy,
      deathSaves: lifecycle.deathSaves.deathSaves,
      stable: lifecycle.deathSaves.stable,
      dead: lifecycle.deathSaves.dead,
    })),
    Match.exhaustive,
  );
}

function combatantCanTakeActions(
  combatant: CombatantState | undefined,
): combatant is CombatantState {
  return combatant != null && !isIncapacitated(combatant.conditions);
}

function activeConditions(state: ConditionState): readonly Condition[] {
  return ALL_CONDITIONS.filter((condition) => hasCondition(state, condition));
}

function literalStatBlockNumber(value: StatBlockValue): number {
  if (value.kind !== "literal") {
    throw new Error(
      "Battle runtime initialization requires literal Stat Block numeric values.",
    );
  }
  return value.value;
}

function combatantSeedFromCharacterSheet(
  input: CharacterSheetCombatantInput & {
    readonly unitLibrary: UnitCatalog;
  },
): CombatantSeedInput {
  const maxHp = Hp(input.sheet.hitPoints.maximum);
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScoreFromDexterity(input.sheet.abilityScores.final),
    seed: {
      kind: "character",
      characterId: input.characterId,
      sheetUnitRefs: input.sheet.unitRefs,
      armorClass: characterArmorClassState(input.sheet, input.unitLibrary),
      currentHp: input.currentHp ?? maxHp,
      maxHp,
      tempHp: input.tempHp ?? Hp(0),
      zeroHpLifecyclePolicy: "usesDeathSavingThrows",
      selectedLoadout: input.sheet.equipment.loadout,
      attack: characterAttackProfile(input.sheet, input.unitLibrary),
    },
  };
}

function combatantSeedFromStatBlock(
  input: StatBlockCombatantInput,
): CombatantSeedInput {
  const maxHp = Hp(literalStatBlockNumber(input.statBlock.statBlock.hp));
  return {
    combatantId: input.combatantId,
    displayName: input.statBlock.statBlock.displayName,
    initiative: statBlockInitiativeScore(input.statBlock),
    seed: {
      kind: "monster",
      monsterId: input.monsterId,
      statBlock: input.statBlock,
      currentHp: input.currentHp ?? maxHp,
      maxHp,
      tempHp: input.tempHp ?? Hp(0),
      zeroHpLifecyclePolicy: "diesAtZeroHp",
    },
  };
}

function characterArmorClassState(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
): ArmorClassState {
  const loadout = sheet.equipment.loadout;
  const defaultState = defaultArmorClassState();
  const armor = loadout.armor
    ? unitLibrary.requireUnit(loadout.armor)
    : undefined;
  const shield = loadout.shield
    ? unitLibrary.requireUnit(loadout.shield)
    : undefined;

  return {
    ...defaultState,
    abilityModifiers: abilityModifiers(sheet.abilityScores.final),
    base:
      armor?.kind === "armor"
        ? { kind: "armor", formula: armor.acFormula, category: armor.category }
        : defaultState.base,
    bonuses: [
      ...(shield?.kind === "shield"
        ? [
            {
              kind: "shield" as const,
              bonus: armorClassDelta(shield.armorClassProjection.bonus),
              handUse: shield.armorClassProjection.handUse,
              trainingRequired: shield.armorClassProjection.trainingRequired,
              sourceUnitId: shield.id,
            },
          ]
        : []),
      ...sheet.unitRefs.flatMap((ref) =>
        armorDefenseBonus(unitLibrary.requireUnit(ref.unitId)),
      ),
    ],
    armorTraining: new Set(sheet.proficiencies.armorTraining),
    leftHandUse: shield?.kind === "shield" ? "shield" : "free",
    rightHandUse: loadout.weapon == null ? "free" : "mainWeapon",
  };
}

function armorDefenseBonus(unit: UnitRecord): ArmorClassState["bonuses"] {
  if (unit.kind !== "feat" || unit.mechanics.family !== "passive") {
    return [];
  }

  if (
    unit.mechanics.condition?.kind !== "wearing_armor" ||
    unit.mechanics.grants.length !== 1
  ) {
    return [];
  }

  const grant = unit.mechanics.grants[0];
  if (grant?.kind !== "modify_ac" || grant.delta.kind !== "fixed_dice") {
    return [];
  }
  const fixedDelta = grant.delta;

  return [
    {
      kind: "wearing_armor",
      bonus: armorClassDelta(
        Match.value(fixedDelta.sign).pipe(
          Match.when("+", () => fixedDelta.dice * fixedDelta.dieSize),
          Match.when("-", () => -(fixedDelta.dice * fixedDelta.dieSize)),
          Match.exhaustive,
        ),
      ),
      categories: unit.mechanics.condition.categories,
      sourceUnitId: unit.id,
    },
  ];
}

function abilityModifiers(
  scores: SixAbilityScores,
): ArmorClassState["abilityModifiers"] {
  return {
    ...zeroAbilityModifiers(),
    str: abilityModifier(scoreModifier(scores.str)),
    dex: abilityModifier(scoreModifier(scores.dex)),
    con: abilityModifier(scoreModifier(scores.con)),
    int: abilityModifier(scoreModifier(scores.int)),
    wis: abilityModifier(scoreModifier(scores.wis)),
    cha: abilityModifier(scoreModifier(scores.cha)),
  };
}

function scoreModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function initiativeScoreFromDexterity(
  scores: SixAbilityScores,
): InitiativeScore {
  return initiativeScore(10 + scoreModifier(scores.dex));
}

function statBlockInitiativeScore(statBlock: StatBlockRecord): InitiativeScore {
  return initiativeScore(
    10 +
      (statBlock.statBlock.initiativeModifier ??
        scoreModifier(statBlock.statBlock.abilityScores.dex)),
  );
}

function resolveAttack(input: BattleResolutionInput): BattleResolutionResult {
  const attack = supportedAttackProfile(input.state, input.subject.actorId);
  if (attack == null) {
    return invalidResult(
      input.state,
      "unsupportedSurfaceShape",
      "Attack resolution requires a supported weapon attack profile.",
    );
  }

  const fillSet = attackFillSet(input.fills, attack);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }

  if (fillSet.targetId == null) {
    if (fillSet.attackRoll != null || fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack target must be filled before attack roll or damage.",
      );
    }
    return needsHolesResult(input.state, input.subject, [
      attackTargetHole(input.state, input.subject.actorId),
    ]);
  }

  const target = input.state.combatants.get(fillSet.targetId);
  if (target == null || target.combatantId === input.subject.actorId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack target must be another combatant in this battle.",
    );
  }

  if (fillSet.attackRoll == null) {
    if (fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack roll must be filled before attack damage.",
      );
    }
    return needsHolesResult(input.state, input.subject, [attackRollHole()]);
  }

  if (!attackRollResultIsValid(fillSet.attackRoll)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll result is outside the d20 attack-roll protocol.",
    );
  }

  const hit = attackRollHits(
    fillSet.attackRoll,
    currentArmorClass(target.armorClass),
  );
  if (hit && fillSet.damageRoll == null) {
    return needsHolesResult(input.state, input.subject, [
      attackDamageHole(attack),
    ]);
  }
  if (!hit && fillSet.damageRoll != null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack damage can only be filled after a hit.",
    );
  }

  return spendAttackAction(
    hit
      ? applyAttackDamage(input.state, target.combatantId, attack, fillSet)
      : input.state,
  );
}

type AttackFillSet =
  | {
      readonly tag: "ok";
      readonly targetId: CombatantId | undefined;
      readonly attackRoll: AttackRollResult | undefined;
      readonly damageRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };

function attackFillSet(
  fills: readonly BattleFill[],
  attack: BattleAttackProfile,
): AttackFillSet {
  let targetId: CombatantId | undefined;
  let attackRoll: AttackRollResult | undefined;
  let damageRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  const damageHoleId = attackDamageHoleId(attack);

  for (const fill of fills) {
    if (fill.kind === "targetChoice" && fill.holeId === ATTACK_TARGET_HOLE_ID) {
      if (targetId !== undefined) {
        return { tag: "invalid", message: "Attack target was filled twice." };
      }
      targetId = combatantId(fill.value);
      continue;
    }

    if (fill.kind === "attackRoll" && fill.holeId === ATTACK_ROLL_HOLE_ID) {
      if (attackRoll !== undefined) {
        return { tag: "invalid", message: "Attack roll was filled twice." };
      }
      attackRoll = fill.value;
      continue;
    }

    if (fill.kind === "rolledDice" && fill.holeId === damageHoleId) {
      if (damageRoll !== undefined) {
        return { tag: "invalid", message: "Attack damage was filled twice." };
      }
      const damageValidation = validateRolledDiceForWeaponAttack(
        fill.value,
        attack,
      );
      if (damageValidation !== null) {
        return { tag: "invalid", message: damageValidation };
      }
      damageRoll = fill;
      continue;
    }

    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Attack replay holes.`,
    };
  }

  return { tag: "ok", targetId, attackRoll, damageRoll };
}

function validateRolledDiceForWeaponAttack(
  groups: ReadonlyArray<RolledDiceGroup>,
  attack: BattleAttackProfile,
): string | null {
  const damage = selectedWeaponDamage(attack.weapon);
  const validation = validateRolledDiceForDiceExpr(groups, {
    dice: damage.dice,
    dieSize: damage.dieSize,
  });
  if (validation !== null) {
    return validation.reason;
  }

  return null;
}

function spendAttackAction(
  state: BattleState,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const spent = spendAction(state.currentTurnResources, "attack");
  if (Either.isLeft(spent)) {
    return invalidResult(
      state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }

  const nextState = { ...state, currentTurnResources: spent.right };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function applyAttackDamage(
  state: BattleState,
  targetId: CombatantId,
  attack: BattleAttackProfile,
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
): BattleState {
  if (fillSet.damageRoll == null) {
    return state;
  }

  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(
      targetId,
      applyHpDamage(
        target,
        weaponAttackDamageAmount(attack, fillSet.damageRoll),
        {
          deathFailuresAtZeroHp:
            Number(fillSet.attackRoll?.naturalD20) === 20 ? 2 : 1,
        },
      ),
    ),
  };
}

type BattleDamageContext = {
  readonly deathFailuresAtZeroHp: 1 | 2;
};

function applyHpDamage(
  combatant: CombatantState,
  damageAmount: number,
  context: BattleDamageContext,
): CombatantState {
  const effectiveDamage = Math.max(0, Math.floor(damageAmount));
  if (effectiveDamage <= 0 || zeroHpLifecycleIsTerminal(combatant)) {
    return combatant;
  }

  const currentTempHp = Number(combatant.tempHp);
  const currentHp = Number(combatant.hp);
  const tempHpAbsorbed = Math.min(currentTempHp, effectiveDamage);
  const hpDamage = effectiveDamage - tempHpAbsorbed;
  const nextHp = Hp(Math.max(0, currentHp - hpDamage));
  const damaged = {
    ...combatant,
    hp: nextHp,
    tempHp: Hp(currentTempHp - tempHpAbsorbed),
  };

  if (currentHp <= 0) {
    return applyDamageAtZeroHp(damaged, context);
  }

  if (Number(nextHp) > 0) {
    return damaged;
  }

  return applyDropToZeroHpLifecycle(damaged);
}

function applyInitialZeroHpLifecycle(
  combatant: CombatantState,
): CombatantState {
  if (Number(combatant.hp) > 0) {
    return combatant;
  }

  return applyDropToZeroHpLifecycle(combatant);
}

function applyDropToZeroHpLifecycle(combatant: CombatantState): CombatantState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => combatant),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...combatant,
      conditions: applyCondition(combatant.conditions, "unconscious"),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: resetDeathSaveRuntimeState(),
      },
    })),
    Match.exhaustive,
  );
}

function applyDamageAtZeroHp(
  combatant: CombatantState,
  context: BattleDamageContext,
): CombatantState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => combatant),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...combatant,
      conditions: applyCondition(combatant.conditions, "unconscious"),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: addDeathFailures(
          lifecycle.deathSaves,
          context.deathFailuresAtZeroHp,
        ),
      },
    })),
    Match.exhaustive,
  );
}

function zeroHpLifecycleIsTerminal(combatant: CombatantState): boolean {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => combatant.hp === 0),
    Match.when(
      { policy: "usesDeathSavingThrows" },
      (lifecycle) => lifecycle.deathSaves.dead,
    ),
    Match.exhaustive,
  );
}

function weaponAttackDamageAmount(
  attack: BattleAttackProfile,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  return (
    damageRoll.value.reduce(
      (total, group) =>
        total +
        group.results.reduce(
          (groupTotal, dieResult) => groupTotal + Number(dieResult),
          0,
        ),
      0,
    ) + attack.abilityModifier
  );
}

function needsHolesResult(
  state: BattleState,
  subject: BattleSubject,
  holes: readonly BattleHole[],
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  return {
    tag: "needsHoles",
    subject,
    holes,
    snapshot: snapshotBattle(state),
  };
}

function attackTargetHole(
  state: BattleState,
  actorId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: ATTACK_TARGET_HOLE_ID,
    holeInstanceKey: ATTACK_TARGET_HOLE_INSTANCE,
    label: "Attack target",
    choices: attackTargetChoices(state, actorId),
  };
}

function attackTargetChoices(
  state: BattleState,
  actorId: CombatantId,
): readonly CombatantId[] {
  return [...state.combatants.keys()].filter((id) => id !== actorId);
}

function attackRollHole(): BattleAttackRollHole {
  return {
    kind: "attackRoll",
    holeId: ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: ATTACK_ROLL_HOLE_INSTANCE,
    label: "Attack roll",
  };
}

function attackDamageHole(attack: BattleAttackProfile): BattleDamageRollHole {
  const expression = weaponAttackDamageExpression(attack);
  return {
    kind: "rolledDice",
    holeId: attackDamageHoleId(attack),
    holeInstanceKey: holeInstanceKey(
      `battle:attack:damage-result:${expression}`,
    ),
    label: `${attack.weapon.name} damage (${expression})`,
    attack,
  };
}

function attackDamageHoleId(attack: BattleAttackProfile): BattleHoleId {
  return holeId(
    `battle:attack:damage-result:${weaponAttackDamageExpression(attack)}`,
  );
}

function supportedAttackProfile(
  state: BattleState,
  actorId: CombatantId,
): BattleAttackProfile | undefined {
  const actor = state.combatants.get(actorId);
  if (actor?.source.kind !== "character") {
    return undefined;
  }

  return actor.source.attack ?? undefined;
}

function characterAttackProfile(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
): BattleAttackProfile | null {
  const selectedWeapon = sheet.equipment.loadout.weapon;
  if (selectedWeapon == null) {
    return null;
  }

  const unit = unitLibrary.requireUnit(selectedWeapon.unitId);
  if (unit.kind !== "weapon") {
    return null;
  }

  if (unit.damage.kind !== "dice") {
    return null;
  }

  return {
    kind: "weapon",
    weapon: unit,
    ability: "str",
    abilityModifier: scoreModifier(sheet.abilityScores.final.str),
  };
}

function selectedWeaponDamage(weapon: WeaponRecord): BattleWeaponDamage {
  if (weapon.damage.kind !== "dice") {
    throw new Error("Battle Attack requires dice weapon damage.");
  }

  return weapon.damage;
}

function weaponAttackDamageExpression(attack: BattleAttackProfile): string {
  const damage = selectedWeaponDamage(attack.weapon);
  const modifier = signedModifier(attack.abilityModifier);

  return `${damage.dice}d${damage.dieSize}${modifier}-${damage.damageType}`;
}

function signedModifier(modifier: number): string {
  if (modifier === 0) {
    return "";
  }

  return modifier > 0 ? `+${modifier}` : `${modifier}`;
}

function invalidResult(
  state: BattleState,
  reason: BattleInvalidReasonCode,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  return {
    tag: "invalid",
    reason,
    message,
    snapshot: snapshotBattle(state),
  };
}
