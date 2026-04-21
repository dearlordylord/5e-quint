import type {
  CreatureId,
  CreatureRosterEntry,
  RuntimeUnitAccess,
} from "#/types.ts";

export const CORE_BATTLE_ACTIONS = ["attack", "endTurn"] as const;
export type CoreBattleAction = (typeof CORE_BATTLE_ACTIONS)[number];

export type BattleCombatant = {
  readonly id: CreatureId;
  readonly name: string;
  readonly sourceKind: CreatureRosterEntry["sourceKind"];
  readonly level: number;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly armorClass: number;
  readonly spellSaveDc: number | null;
  readonly spellcastingModifier: number | null;
  readonly units: ReadonlyArray<RuntimeUnitAccess>;
};

export type BattleInitiativeCount = {
  readonly actorId: CreatureId;
  readonly count: number;
};

export type BattleInitiativeTieResolution = {
  readonly actorIds: ReadonlyArray<CreatureId>;
};

export type BattleInit = {
  readonly initiativeCounts: ReadonlyArray<BattleInitiativeCount>;
  readonly tieResolutions: ReadonlyArray<BattleInitiativeTieResolution>;
};

export type AvailableBattleAction =
  | {
      readonly tag: "coreAction";
      readonly action: CoreBattleAction;
    }
  | {
      readonly tag: "unit";
      readonly unit: RuntimeUnitAccess;
    };

export type ChooseActionPrompt = {
  readonly tag: "chooseAction";
  readonly actorId: CreatureId;
  readonly options: ReadonlyArray<AvailableBattleAction>;
};

export type ChooseAttackTargetPrompt = {
  readonly tag: "chooseAttackTarget";
  readonly actorId: CreatureId;
  readonly availableTargetIds: ReadonlyArray<CreatureId>;
};

export type OpenBattlePrompt = ChooseAttackTargetPrompt;

export type OpenBattlePromptState =
  | {
      readonly tag: "chooseAttackTarget";
    };

export type AvailableBattlePrompt = ChooseActionPrompt | OpenBattlePrompt;

export type BattlePromptAnswer =
  | {
      readonly tag: "chooseAction";
      readonly choice: AvailableBattleAction;
    }
  | {
      readonly tag: "chooseAttackTarget";
      readonly targetId: CreatureId;
    };

export type ResolvedBattleAction =
  | {
      readonly tag: "endTurn";
      readonly actorId: CreatureId;
    }
  | {
      readonly tag: "attack";
      readonly actorId: CreatureId;
      readonly targetId: CreatureId;
    }
  | {
      readonly tag: "useUnit";
      readonly unit: RuntimeUnitAccess;
    };

export type BattleResolutionResult =
  | {
      readonly tag: "resolvedAction";
      readonly state: BattleState;
      readonly action: ResolvedBattleAction;
    }
  | {
      readonly tag: "openedPrompt";
      readonly state: BattleState;
      readonly prompt: OpenBattlePrompt;
    };

export type BattleState = {
  readonly combatants: ReadonlyArray<BattleCombatant>;
  readonly initiativeCounts: ReadonlyArray<BattleInitiativeCount>;
  readonly initiativeOrder: ReadonlyArray<CreatureId>;
  readonly round: number;
  readonly turnNumber: number;
  readonly turnActorId: CreatureId | null;
  readonly openPrompt: OpenBattlePromptState | null;
};
