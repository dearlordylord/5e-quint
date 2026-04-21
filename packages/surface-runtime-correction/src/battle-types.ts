import type {
  Ability,
  DamageTypeRef,
} from "@dnd/prototype-content-surface/surface/types";

import type {
  CreatureId,
  RuntimeUnitAccess,
} from "#/types.ts";
import type { BattleSourceRef } from "#/battle-source-ref.ts";

// This correction slice models only the minimal built-in battle verbs needed to
// prove the prompt lifecycle. Authored mechanics such as spells and class
// features flow through `unit` actions instead of widening this list toward the
// full core engine action surface.
export const CORE_BATTLE_ACTIONS = ["attack", "endTurn"] as const;
export type CoreBattleAction = (typeof CORE_BATTLE_ACTIONS)[number];
export type BattleUnitAccessId = RuntimeUnitAccess["accessId"];

export type BattleUnitResourceState = {
  readonly unitAccessId: BattleUnitAccessId;
  readonly expendedUses: number;
  readonly usedThisTurn: boolean;
};

// Reducer-owned battle-state record, projected from a roster creature plus its
// resolved owned units.
export type Combatant = {
  readonly id: CreatureId;
  readonly name: string;
  readonly battleSourceRef: BattleSourceRef;
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

export type BattleParticipant = {
  readonly combatant: Combatant;
  readonly initiativeCount: number;
  readonly projectionOrder: number;
};

// A prompt-visible turn option in this slice: either one built-in battle verb or
// one authored unit access chosen for use on the current turn.
export type AvailableTurnOption =
  | {
      readonly tag: "coreAction";
      readonly action: CoreBattleAction;
    }
  | {
      readonly tag: "unit";
      readonly unitAccessId: BattleUnitAccessId;
    };

export type ChooseActionPrompt = {
  readonly tag: "chooseAction";
  readonly actorId: CreatureId;
  readonly options: ReadonlyArray<AvailableTurnOption>;
};

// This prompt is specific to the built-in core `attack` verb in the correction
// slice. Surface-derived unit prompts use their own structural prompt shapes.
export type ChooseAttackTargetPrompt = {
  readonly tag: "chooseAttackTarget";
  readonly actorId: CreatureId;
  readonly availableTargetIds: ReadonlyArray<CreatureId>;
};

export type ChooseSingleTargetUnitPrompt = {
  readonly tag: "chooseSingleTargetUnit";
  readonly actorId: CreatureId;
  readonly unitAccessId: BattleUnitAccessId;
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
  readonly unitAccessId: BattleUnitAccessId;
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
      readonly unitAccessId: BattleUnitAccessId;
    }
  | {
      readonly tag: "chooseAreaEffect";
      readonly unitAccessId: BattleUnitAccessId;
    };

export type AvailableBattlePrompt = ChooseActionPrompt | OpenBattlePrompt;

// Complete table answer for the currently open prompt. Multi-step interactions
// are represented by returning `openedPrompt`, not by partial answers.
export type BattlePromptAnswer =
  | {
      readonly tag: "chooseAction";
      readonly choice: AvailableTurnOption;
    }
  | {
      readonly tag: "chooseAttackTarget";
      readonly targetId: CreatureId;
      readonly damage: number;
    }
  | {
      readonly tag: "chooseSingleTargetUnit";
      readonly targetId: CreatureId;
      readonly amount: number;
    }
  | {
      readonly tag: "chooseAreaEffect";
      readonly targetResults: ReadonlyArray<{
        readonly targetId: CreatureId;
        readonly saveOutcome: "success" | "failure";
      }>;
      readonly amount: number;
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
      readonly unitAccessId: BattleUnitAccessId;
      readonly targetId: CreatureId;
      readonly healing: number;
    }
  | {
      readonly tag: "areaSaveDamage";
      readonly actorId: CreatureId;
      readonly unitAccessId: BattleUnitAccessId;
      readonly targetResults: ReadonlyArray<{
        readonly targetId: CreatureId;
        readonly saveOutcome: "success" | "failure";
      }>;
      readonly damage: number;
    }
  | {
      readonly tag: "grantExtraAction";
      readonly actorId: CreatureId;
      readonly unitAccessId: BattleUnitAccessId;
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
  readonly currentParticipant: BattleParticipant;
  readonly waitingParticipants: ReadonlyArray<BattleParticipant>;
  readonly round: number;
  readonly turnNumber: number;
  // This slice models at most one unresolved prompt window at a time.
  readonly openPrompt: OpenBattlePromptState | null;
  readonly standardActionsRemaining: number;
  // Extra non-Magic actions granted by effects such as Action Surge.
  readonly nonMagicActionsRemaining: number;
};
