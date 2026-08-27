import { Result, Schema } from "effect";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import type {
  BattleCreatureSnapshot,
  BattlePresentedCreatureSnapshot,
  BattlePresentedSnapshot,
  BattleSnapshotPresentationIssue,
  BattleSnapshotPresentationIssues,
} from "./battle-state-execution.ts";
import type { BattleRuntimeSession } from "./battle-runtime-context.ts";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
import { battleCreaturePresentationDisplayName } from "./stat-block-presentation.ts";
import { BattleCreatureDisplayNameSchema } from "./battle-creature-display-name.ts";

export function battlePresentedSnapshot(
  session: BattleRuntimeSession,
): Result.Result<BattlePresentedSnapshot, BattleSnapshotPresentationIssues> {
  return presentBattleSnapshot(session, snapshotBattle(session.state));
}

export function presentBattleSnapshot(
  session: BattleRuntimeSession,
  snapshot: import("./battle-state-execution.ts").BattleSnapshot,
): Result.Result<BattlePresentedSnapshot, BattleSnapshotPresentationIssues> {
  return Result.map(
    traverseValidation(snapshot.combatants, (combatant) =>
      presentedCombatant(session, combatant),
    ),
    (combatants) => ({ ...snapshot, combatants }),
  );
}

function presentedCombatant(
  session: BattleRuntimeSession,
  combatant: BattleCreatureSnapshot,
): Result.Result<
  BattlePresentedCreatureSnapshot,
  BattleSnapshotPresentationIssue
> {
  const displayName = battleCreaturePresentationDisplayName(
    session.state,
    session.context,
    combatant.combatantId,
  );
  if (displayName === null) {
    return Result.fail({
      tag: "battleSnapshotPresentationIssue",
      reason: "missingStatBlockPresentation",
      combatantId: combatant.combatantId,
    });
  }
  return Schema.is(BattleCreatureDisplayNameSchema)(displayName)
    ? Result.succeed({ ...combatant, displayName })
    : Result.fail({
        tag: "battleSnapshotPresentationIssue",
        reason: "invalidDisplayName",
        combatantId: combatant.combatantId,
      });
}
