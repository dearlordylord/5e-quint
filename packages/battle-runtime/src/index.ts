import { Brand } from "effect";
import { isNonEmptyReadonlyArray } from "effect/Array";
import * as Either from "effect/Either";
import {
  canSpendAction,
  resetTurnActionEconomy,
} from "@dnd/shared-algebras/action-economy-algebra";
import {
  createScoredInitiativeStack,
  currentActing,
  initiativeOrder,
} from "@dnd/shared-algebras/initiative-algebra";
import {
  currentArmorClass,
  statBlockArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  EMPTY_CONDITION_STATE,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
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
  HoleId,
  HoleInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  CONDITIONS as ALL_CONDITIONS,
  Round,
  type Condition,
  type CreatureId,
  type Hp,
  type Initiative,
  type Round as RoundType,
} from "@dnd/shared/types";
import type {
  StatBlockValue,
  StatBlockRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";

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

export type ZeroHpLifecyclePolicy = "diesAtZeroHp" | "usesDeathSavingThrows";

export type UnitRef = {
  readonly unitId: UnitRecord["id"];
};

export type CharacterLoadoutRef = {
  readonly armor?: UnitRecord["id"];
  readonly shield?: UnitRecord["id"];
  readonly weapon?: {
    readonly unitId: UnitRecord["id"];
    readonly grip: "one_handed";
  };
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
  readonly zeroHpLifecyclePolicy: ZeroHpLifecyclePolicy;
  readonly source:
    | {
        readonly kind: "character";
        readonly characterId: CharacterId;
        readonly sheetUnitRefs: readonly UnitRef[];
        readonly selectedLoadout: CharacterLoadoutRef;
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
export type BattleHole = never;
export type BattleFill = never;

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
  readonly zeroHpLifecyclePolicy: ZeroHpLifecyclePolicy;
  readonly conditions: readonly Condition[];
};

const INITIAL_ROUND: RoundType = Round(1);
const INITIAL_TURN_RESOURCES = resetTurnActionEconomy({
  actionResources: [],
  currentHasBonusAction: false,
});

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

export function discoverBattleActs(
  state: BattleState,
): readonly AvailableBattleAct[] {
  const actorId = currentActorId(state);
  if (!state.combatants.has(actorId)) {
    return [];
  }

  const acts: AvailableBattleAct[] = [];
  if (canSpendAction(state.currentTurnResources, "attack")) {
    acts.push({
      subject: { tag: "coreAct", actorId, act: "attack" },
      label: "Attack",
      summary: "Take the Attack action.",
      initialHoles: [],
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
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Phase 1 battle skeleton does not accept fills yet.",
    );
  }

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
    !canSpendAction(input.state.currentTurnResources, "attack")
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
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
    zeroHpLifecyclePolicy: input.seed.zeroHpLifecyclePolicy,
  };

  if (input.seed.kind === "character") {
    return {
      ...base,
      armorClass: input.seed.armorClass,
      source: {
        kind: "character",
        characterId: input.seed.characterId,
        sheetUnitRefs: input.seed.sheetUnitRefs,
        selectedLoadout: input.seed.selectedLoadout,
      },
    };
  }

  return {
    ...base,
    armorClass: statBlockArmorClassState(
      literalStatBlockNumber(input.seed.statBlock.statBlock.ac),
    ),
    source: {
      kind: "monster",
      monsterId: input.seed.monsterId,
      statBlock: input.seed.statBlock,
    },
  };
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
    zeroHpLifecyclePolicy: combatant.zeroHpLifecyclePolicy,
    conditions: activeConditions(combatant.conditions),
  };
}

function activeConditions(state: ConditionState): readonly Condition[] {
  return ALL_CONDITIONS.filter((condition) => hasCondition(state, condition));
}

function literalStatBlockNumber(value: StatBlockValue): number {
  if (value.kind !== "literal") {
    throw new Error(
      "Battle runtime skeleton requires literal Stat Block AC values.",
    );
  }
  return value.value;
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
