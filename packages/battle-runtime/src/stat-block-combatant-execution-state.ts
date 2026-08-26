import type { ArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { Hp, type Size } from "@dnd/shared/types";
import type {
  DamageType,
  StatBlockId,
  SixAbilityScores,
  CreatureSavingThrowModifier,
  CreatureSkillModifier,
} from "@dnd/surface/surface/types";
import type { SurfaceCondition } from "@dnd/shared/game-facts";
import type { Brand } from "effect";

import type {
  BattleExecutionScopeCursor,
  BattleExecutionScopeOrdinal,
  BattleId,
  CombatantId,
} from "./identity.ts";
import type { StatBlockExecutionState } from "./stat-block-execution-state.ts";
import type {
  BattleStatBlockRuntimeSense,
  BattleStatBlockRuntimeSpeed,
} from "./stat-block-execution-state.ts";

/** Authored-free mechanical facts queried after a Stat Block combatant commits. */
export type BattleStatBlockCombatantMechanics = {
  readonly creatureType: import("@dnd/shared/game-facts").CreatureType;
  readonly speeds: readonly BattleStatBlockRuntimeSpeed[];
  readonly abilityScores: SixAbilityScores;
  readonly savingThrowModifiers: readonly CreatureSavingThrowModifier[];
  readonly skillModifiers: readonly CreatureSkillModifier[];
  readonly vulnerabilities: readonly DamageType[];
  readonly resistances: readonly DamageType[];
  readonly immunities: {
    readonly damageTypes: readonly DamageType[];
    readonly conditions: readonly SurfaceCondition[];
  };
  readonly specialSenses: readonly BattleStatBlockRuntimeSense[];
  readonly initiativeModifier: number;
  readonly initiativeScore: number;
  readonly passivePerception: number;
};

/** Durable Stat Block battle projection retained after admission is consumed. */
export type StatBlockBattleOrigin = {
  // Authored identity retained for companion settlement and snapshot catalog
  // reference. Mechanics are taken from `mechanics`; the reducer never dispatches
  // on `statBlockId`.
  readonly statBlockId: StatBlockId;
  readonly mechanics: BattleStatBlockCombatantMechanics;
  readonly execution: StatBlockExecutionState;
};

export type BattleStatBlockCombatantInitialization = {
  readonly armorClass: ArmorClass;
  readonly maxHp: Hp;
  readonly size: Size;
};

/**
 * Admission-owned transition capability for one Stat Block combatant. It is
 * bound to a battle, combatant, execution scope, and cursor transition and
 * contains no authored presentation source.
 */
export type AdmittedBattleStatBlockCombatant = {
  readonly battleId: BattleId;
  readonly combatantId: CombatantId;
  readonly origin: StatBlockBattleOrigin;
  readonly initialization: BattleStatBlockCombatantInitialization;
  readonly cursorTransition: {
    readonly from: BattleExecutionScopeOrdinal;
    readonly to: BattleExecutionScopeCursor;
  };
} & Brand.Brand<"AdmittedBattleStatBlockCombatant">;

export function admittedBattleStatBlockCombatantMaxHp(
  admission: AdmittedBattleStatBlockCombatant,
): Hp {
  return admission.initialization.maxHp;
}
