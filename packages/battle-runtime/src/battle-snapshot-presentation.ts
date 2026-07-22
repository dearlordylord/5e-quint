import * as Either from "effect/Either";
import { Schema } from "effect";
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
): Either.Either<BattlePresentedSnapshot, BattleSnapshotPresentationIssues> {
  const snapshot = snapshotBattle(session.state);
  return Either.map(
    traverseValidation(snapshot.combatants, (combatant) =>
      presentedCombatant(session, combatant),
    ),
    (combatants) => ({ ...snapshot, combatants }),
  );
}

function presentedCombatant(
  session: BattleRuntimeSession,
  combatant: BattleCreatureSnapshot,
): Either.Either<
  BattlePresentedCreatureSnapshot,
  BattleSnapshotPresentationIssue
> {
  const displayName = battleCreaturePresentationDisplayName(
    session.state,
    session.context,
    combatant.combatantId,
  );
  if (displayName === null) {
    return Either.left({
      tag: "battleSnapshotPresentationIssue",
      reason: "missingStatBlockPresentation",
      combatantId: combatant.combatantId,
    });
  }
  return Schema.is(BattleCreatureDisplayNameSchema)(displayName)
    ? Either.right({ ...combatant, displayName })
    : Either.left({
        tag: "battleSnapshotPresentationIssue",
        reason: "invalidDisplayName",
        combatantId: combatant.combatantId,
      });
}
