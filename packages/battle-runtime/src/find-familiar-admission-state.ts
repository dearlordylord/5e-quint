import type { Brand } from "effect";

import type { BattleSubject } from "./battle-subjects.ts";
import type { BattleState } from "./battle-state-execution.ts";
import type { AdmittedBattleStatBlockCombatant } from "./stat-block-combatant-execution-state.ts";

/** Session-admitted mechanics for one retained familiar reappearance. */
export type FindFamiliarReappearanceSubject = Omit<
  Extract<BattleSubject, { readonly tag: "companionLifecycle" }>,
  "action"
> & { readonly action: "reappear" };

export type AdmittedFindFamiliarReappearance = {
  readonly state: BattleState;
  readonly subject: FindFamiliarReappearanceSubject;
  readonly combatantAdmission: AdmittedBattleStatBlockCombatant;
} & Brand.Brand<"AdmittedFindFamiliarReappearance">;
