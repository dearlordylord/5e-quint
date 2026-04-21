import type {
  Ability,
  DamageTypeRef,
} from "@dnd/prototype-content-surface/surface/types";

import type {
  CreatureId,
  CreatureRosterEntry,
  RuntimeUnitAccess,
} from "#/types.ts";

export const CORE_BATTLE_ACTIONS = ["attack", "endTurn"] as const;
export type CoreBattleAction = (typeof CORE_BATTLE_ACTIONS)[number];
export type BattleUnitId = RuntimeUnitAccess["unit"]["id"];

export type BattleUnitResourceState = {
  readonly unitId: BattleUnitId;
  readonly expendedUses: number;
  readonly usedThisTurn: boolean;
};

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
  readonly unitResourceStates: ReadonlyArray<BattleUnitResourceState>;
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
      readonly unitId: BattleUnitId;
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
  readonly damageLabel: "attack_damage";
};

export type ChooseSingleTargetUnitPrompt = {
  readonly tag: "chooseSingleTargetUnit";
  readonly actorId: CreatureId;
  readonly unitId: BattleUnitId;
  readonly targeting: {
    readonly tag: "touchCreature";
  };
  readonly effect: {
    readonly tag: "healHp";
  };
};

export type ChooseAreaEffectPrompt = {
  readonly tag: "chooseAreaEffect";
  readonly actorId: CreatureId;
  readonly unitId: BattleUnitId;
  readonly targeting: {
    readonly tag: "pointWithinRangeSphere";
    readonly rangeFeet: number;
    readonly radiusFeet: number;
  };
  readonly save: {
    readonly ability: Ability;
    readonly dc: number;
  };
  readonly effect: {
    readonly tag: "damage";
    readonly damageType: DamageTypeRef;
    readonly onSuccess: "half";
  };
};

export type OpenBattlePrompt =
  | ChooseAttackTargetPrompt
  | ChooseSingleTargetUnitPrompt
  | ChooseAreaEffectPrompt;

export type OpenBattlePromptState =
  | {
      readonly tag: "chooseAttackTarget";
    }
  | {
      readonly tag: "chooseSingleTargetUnit";
      readonly unitId: BattleUnitId;
    }
  | {
      readonly tag: "chooseAreaEffect";
      readonly unitId: BattleUnitId;
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
      readonly damage: number;
    }
  | {
      readonly tag: "chooseSingleTargetUnit";
      readonly targetId: CreatureId;
      readonly total: number;
    }
  | {
      readonly tag: "chooseAreaEffect";
      readonly targetResults: ReadonlyArray<{
        readonly targetId: CreatureId;
        readonly saveOutcome: "success" | "failure";
      }>;
      readonly total: number;
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
      readonly damage: number;
    }
  | {
      readonly tag: "singleTargetHeal";
      readonly actorId: CreatureId;
      readonly unitId: BattleUnitId;
      readonly targetId: CreatureId;
      readonly total: number;
    }
  | {
      readonly tag: "areaSaveDamage";
      readonly actorId: CreatureId;
      readonly unitId: BattleUnitId;
      readonly targetResults: ReadonlyArray<{
        readonly targetId: CreatureId;
        readonly saveOutcome: "success" | "failure";
      }>;
      readonly total: number;
    }
  | {
      readonly tag: "grantExtraAction";
      readonly actorId: CreatureId;
      readonly unitId: BattleUnitId;
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
  readonly standardActionsRemaining: number;
  readonly restrictedActionsRemaining: number;
};
