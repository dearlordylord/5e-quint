import { Brand } from "effect";
import * as Either from "effect/Either";
import * as Option from "effect/Option";

import type { BattleState } from "./battle-state-execution.ts";
import type { FindFamiliarStatBlockCatalog } from "./find-familiar-stat-block-catalog.ts";
import type { FindFamiliarCreatureTypeOverride } from "@dnd/shared/game-facts";
import {
  findCompanionEntryByOwner,
  type BattleCompanionStoredForm,
} from "./companion-state.ts";
import type { AdmittedFindFamiliarReappearance } from "./find-familiar-admission-state.ts";
import type { BattleStatBlockPresentationSource } from "./battle-runtime-context.ts";
import { findFamiliarIdentityIssue } from "./find-familiar-lifecycle-execution.ts";
import {
  battleExecutionScopeInitialOrNextOrdinal,
  type CombatantId,
} from "./identity.ts";
import { admitBattleStatBlockCombatant } from "./stat-block-combatant-admission.ts";
import type { BattleStatBlockExecutionSource } from "./stat-block-execution-state.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import {
  battleStatBlockProjectionFailureMessage,
  projectAuthoredStatBlockWithCreatureType,
} from "./stat-block-authored-projection.ts";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

const AdmittedFindFamiliarReappearance =
  Brand.nominal<AdmittedFindFamiliarReappearance>();

export function admitFindFamiliarReappearance(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly catalog: FindFamiliarStatBlockCatalog;
}): Either.Either<
  {
    readonly mechanics: AdmittedFindFamiliarReappearance;
    readonly presentation: BattleStatBlockPresentationSource;
  },
  {
    readonly tag: "findFamiliarReappearanceAdmissionIssue";
    readonly message: string;
  }
> {
  const entry = findCompanionEntryByOwner(
    input.state.companions,
    input.casterId,
  );
  if (
    entry === undefined ||
    entry.companion.status !== "temporarilyDismissed"
  ) {
    return issue(
      input.state,
      "Find Familiar can reappear only from temporary dismissal.",
    );
  }
  const familiar = entry.companion;
  const identityIssue = findFamiliarIdentityIssue(
    input.state,
    input.casterId,
    familiar.reappearanceCombatantId,
  );
  if (identityIssue !== null) return issue(input.state, identityIssue);
  const resolvedForm = resolveStoredFindFamiliarReappearanceForm({
    catalog: input.catalog,
    storedForm: familiar,
    creatureTypeOverride: familiar.creatureTypeOverride,
  });
  if (Either.isLeft(resolvedForm)) {
    return issue(input.state, resolvedForm.left);
  }
  const projected = projectAuthoredStatBlockWithCreatureType(
    resolvedForm.right.statBlock,
    resolvedForm.right.creatureTypeOverride,
  );
  if (Either.isLeft(projected)) {
    return issue(
      input.state,
      battleStatBlockProjectionFailureMessage(
        projected.left,
        "Find Familiar form projection failed",
      ),
    );
  }
  const statBlock: BattleStatBlockExecutionSource = projected.right.runtime;
  const allocation = input.state.executionScopeCursors.get(
    familiar.reappearanceCombatantId,
  );
  const combatantAdmission = admitBattleStatBlockCombatant({
    battleId: input.state.battleId,
    combatantId: familiar.reappearanceCombatantId,
    statBlock,
    startingScopeOrdinal: battleExecutionScopeInitialOrNextOrdinal(
      allocation?.nextScopeOrdinal,
    ),
  });
  if (Either.isLeft(combatantAdmission)) {
    return issue(
      input.state,
      battleStateInitIssueMessage(combatantAdmission.left),
    );
  }
  return Either.right({
    mechanics: AdmittedFindFamiliarReappearance({
      state: input.state,
      subject: {
        tag: "companionLifecycle",
        actorId: input.casterId,
        action: "reappear",
      },
      combatantAdmission: combatantAdmission.right,
    }),
    presentation: projected.right.presentation,
  });
}

function resolveStoredFindFamiliarReappearanceForm(input: {
  readonly catalog: FindFamiliarStatBlockCatalog;
  readonly storedForm: BattleCompanionStoredForm;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
}): Either.Either<
  {
    readonly statBlock: StatBlockRecord;
    readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
  },
  string
> {
  const statBlock = input.catalog.getStatBlock(
    input.storedForm.resolvedStatBlockId,
  );
  return Option.isNone(statBlock)
    ? Either.left(
        `Retained familiar form Stat Block is missing: ${input.storedForm.resolvedStatBlockId}.`,
      )
    : Either.right({
        statBlock: statBlock.value,
        creatureTypeOverride: input.creatureTypeOverride,
      });
}

function issue(
  _state: BattleState,
  message: string,
): Either.Either<
  never,
  {
    readonly tag: "findFamiliarReappearanceAdmissionIssue";
    readonly message: string;
  }
> {
  return Either.left({
    tag: "findFamiliarReappearanceAdmissionIssue",
    message,
  });
}
