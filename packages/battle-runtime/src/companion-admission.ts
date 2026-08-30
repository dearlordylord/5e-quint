import { Brand, Result } from "effect";
import * as Option from "effect/Option";

import type {
  BattleStatBlockExecutionCatalog,
  BattleState,
} from "./battle-state-execution.ts";
import type { SpawnedCompanionCreatureTypeOverride } from "@dnd/shared/game-facts";
import {
  findCompanionEntryByOwner,
  type BattleCompanionStoredForm,
} from "./companion-state.ts";
import type { AdmittedSpawnedCompanionReappearance } from "./companion-admission-state.ts";
import type { BattleStatBlockPresentationSource } from "./battle-runtime-context.ts";
import {
  familiarStatBlockWithCreatureTypeOverride,
  spawnedCompanionIdentityIssue,
} from "./companion-lifecycle-execution.ts";
import {
  battleExecutionScopeInitialOrNextOrdinal,
  type CombatantId,
} from "./identity.ts";
import { admitBattleStatBlockCombatant } from "./stat-block-combatant-admission.ts";
import type { BattleStatBlockExecutionSource } from "./stat-block-execution-state.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

const AdmittedSpawnedCompanionReappearance =
  Brand.nominal<AdmittedSpawnedCompanionReappearance>();

export function admitSpawnedCompanionReappearance(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly catalog: BattleStatBlockExecutionCatalog;
}): Result.Result<
  {
    readonly mechanics: AdmittedSpawnedCompanionReappearance;
    readonly presentation: BattleStatBlockPresentationSource;
  },
  {
    readonly tag: "companionReappearanceAdmissionIssue";
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
      "spawned companion lifecycle can reappear only from temporary dismissal.",
    );
  }
  const familiar = entry.companion;
  const identityIssue = spawnedCompanionIdentityIssue(
    input.state,
    input.casterId,
    familiar.reappearanceCombatantId,
  );
  if (identityIssue !== null) return issue(input.state, identityIssue);
  const resolvedForm = resolveStoredSpawnedCompanionReappearanceForm({
    catalog: input.catalog,
    storedForm: familiar,
    creatureTypeOverride: familiar.creatureTypeOverride,
  });
  if (Result.isFailure(resolvedForm)) {
    return issue(input.state, resolvedForm.failure);
  }
  const statBlock = familiarStatBlockWithCreatureTypeOverride(
    resolvedForm.success,
  );
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
  if (Result.isFailure(combatantAdmission)) {
    return issue(
      input.state,
      battleStateInitIssueMessage(combatantAdmission.failure),
    );
  }
  return Result.succeed({
    mechanics: AdmittedSpawnedCompanionReappearance({
      state: input.state,
      subject: {
        tag: "companionLifecycle",
        actorId: input.casterId,
        action: "reappear",
      },
      combatantAdmission: combatantAdmission.success,
    }),
    presentation: {
      displayName: statBlock.statBlock.displayName,
      languages: statBlockLanguagePresentation(statBlock),
      procedures: statBlockProcedurePresentations({
        statBlock,
        execution: combatantAdmission.success.origin.execution,
      }),
    },
  });
}

function resolveStoredSpawnedCompanionReappearanceForm(input: {
  readonly catalog: BattleStatBlockExecutionCatalog;
  readonly storedForm: BattleCompanionStoredForm;
  readonly creatureTypeOverride: SpawnedCompanionCreatureTypeOverride;
}): Result.Result<
  {
    readonly statBlock: BattleStatBlockExecutionSource;
    readonly creatureTypeOverride: SpawnedCompanionCreatureTypeOverride;
  },
  string
> {
  const statBlock = input.catalog.getStatBlock(
    input.storedForm.resolvedStatBlockId,
  );
  return Option.isNone(statBlock)
    ? Result.fail(
        `Retained familiar form Stat Block is missing: ${input.storedForm.resolvedStatBlockId}.`,
      )
    : Result.succeed({
        statBlock: statBlock.value,
        creatureTypeOverride: input.creatureTypeOverride,
      });
}

function issue(
  _state: BattleState,
  message: string,
): Result.Result<
  never,
  {
    readonly tag: "companionReappearanceAdmissionIssue";
    readonly message: string;
  }
> {
  return Result.fail({
    tag: "companionReappearanceAdmissionIssue",
    message,
  });
}
