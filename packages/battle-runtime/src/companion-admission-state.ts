import type { Brand } from "effect";

import type { BattleSubject } from "./battle-subjects.ts";
import type { BattleState } from "./battle-state-execution.ts";
import type { AdmittedBattleStatBlockCombatant } from "./stat-block-combatant-execution-state.ts";
import type { SpawnedCompanionLifecycleExecutionFacts } from "./procedure-execution/spell-procedure-execution.ts";

/** Session-admitted mechanics for one retained familiar reappearance. */
export type CompanionReappearanceSubject = Omit<
  Extract<BattleSubject, { readonly tag: "companionLifecycle" }>,
  "action"
> & { readonly action: "reappear" };

export type AdmittedSpawnedCompanionReappearance = {
  readonly state: BattleState;
  readonly subject: CompanionReappearanceSubject;
  readonly combatantAdmission: AdmittedBattleStatBlockCombatant;
  readonly execution: SpawnedCompanionLifecycleExecutionFacts;
} & Brand.Brand<"AdmittedSpawnedCompanionReappearance">;
