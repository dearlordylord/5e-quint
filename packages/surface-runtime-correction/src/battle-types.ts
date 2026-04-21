import type { CreatureId, CreatureRosterEntry, RuntimeUnitAccess } from "#/types.ts";

export const CORE_BATTLE_ACTIONS = [
  "attack",
  "endTurn",
] as const;
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

export type AvailableActionOption =
  | {
      readonly tag: "coreAction";
      readonly action: CoreBattleAction;
    }
  | {
      readonly tag: "unit";
      readonly unit: RuntimeUnitAccess;
    };

export type PendingBattleAction =
  | {
      readonly tag: "useCoreAction";
      readonly action: CoreBattleAction;
    }
  | {
      readonly tag: "useUnit";
      readonly unit: RuntimeUnitAccess;
    };

export type PromptInputRequirement =
  | { readonly tag: "chooseTarget"; readonly count: "single" | "multiple" }
  | { readonly tag: "chooseSpellSlot"; readonly minimumLevel: number }
  | { readonly tag: "reportRoll"; readonly roll: "healing" | "damage" }
  | { readonly tag: "reportOutcomeTargets"; readonly outcome: "failedSave" };

export type AvailableBattlePrompt =
  | {
      readonly tag: "chooseAction";
      readonly actorId: CreatureId;
      readonly options: ReadonlyArray<AvailableActionOption>;
    }
  | {
      readonly tag: "fillActionInputs";
      readonly actorId: CreatureId;
      readonly action: PendingBattleAction;
      readonly requiredInputs: ReadonlyArray<PromptInputRequirement>;
    };

export type ResolvedPromptInput =
  | {
      readonly tag: "chosenTargets";
      readonly targetIds: ReadonlyArray<CreatureId>;
    }
  | {
      readonly tag: "chosenSpellSlot";
      readonly level: number;
    }
  | {
      readonly tag: "reportedRoll";
      readonly roll: "healing" | "damage";
      readonly total: number;
    }
  | {
      readonly tag: "reportedOutcomeTargets";
      readonly outcome: "failedSave";
      readonly targetIds: ReadonlyArray<CreatureId>;
    };

export type ResolvedBattleAction =
  | {
      readonly tag: "useCoreAction";
      readonly actorId: CreatureId;
      readonly action: CoreBattleAction;
    }
  | {
      readonly tag: "useUnit";
      readonly unit: RuntimeUnitAccess;
      readonly inputs: ReadonlyArray<ResolvedPromptInput>;
    };

export type BattleResolutionResult =
  | { readonly tag: "ready"; readonly action: ResolvedBattleAction }
  | { readonly tag: "needsPrompt"; readonly prompt: AvailableBattlePrompt };

export type BattleState = {
  readonly combatants: ReadonlyArray<BattleCombatant>;
};
