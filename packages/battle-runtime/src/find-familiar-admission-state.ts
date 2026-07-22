import type { Brand } from "effect";

import type { CombatantId } from "./identity.ts";
import type { AdmittedBattleStatBlockCombatant } from "./stat-block-combatant-execution-state.ts";

/** Session-admitted mechanics for one retained familiar reappearance. */
export type AdmittedFindFamiliarReappearance = {
  readonly ownerId: CombatantId;
  readonly combatantAdmission: AdmittedBattleStatBlockCombatant;
} & Brand.Brand<"AdmittedFindFamiliarReappearance">;
