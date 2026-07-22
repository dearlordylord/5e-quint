import { Brand } from "effect";
import * as Either from "effect/Either";
import * as Option from "effect/Option";

import type {
  BattleStatBlockExecutionCatalog,
  BattleState,
} from "./battle-state-execution.ts";
import type { FindFamiliarCreatureTypeOverride } from "@dnd/shared/game-facts";
import {
  findCompanionEntryByOwner,
  type BattleCompanionStoredForm,
} from "./companion-state.ts";
import type { AdmittedFindFamiliarReappearance } from "./find-familiar-admission-state.ts";
import type { BattleStatBlockPresentationSource } from "./battle-runtime-context.ts";
import {
  familiarStatBlockWithCreatureTypeOverride,
  findFamiliarIdentityIssue,
} from "./find-familiar-lifecycle-execution.ts";
import type { CombatantId } from "./identity.ts";
import { admitBattleStatBlockCombatant } from "./stat-block-combatant-admission.ts";
import type { BattleStatBlockExecutionSource } from "./stat-block-execution-state.ts";
import {
  statBlockLanguagePresentation,
  statBlockProcedurePresentations,
} from "./stat-block-presentation.ts";

const AdmittedFindFamiliarReappearance =
  Brand.nominal<AdmittedFindFamiliarReappearance>();

export function admitFindFamiliarReappearance(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly catalog: BattleStatBlockExecutionCatalog;
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
  const statBlock = familiarStatBlockWithCreatureTypeOverride(
    resolvedForm.right,
  );
  const allocation = input.state.executionScopeCursors.get(
    familiar.reappearanceCombatantId,
  );
  const combatantAdmission = admitBattleStatBlockCombatant({
    battleId: input.state.battleId,
    combatantId: familiar.reappearanceCombatantId,
    statBlock,
    ...(allocation === undefined
      ? {}
      : { startingScopeOrdinal: allocation.nextScopeOrdinal }),
  });
  if (Either.isLeft(combatantAdmission)) {
    return issue(input.state, combatantAdmission.left.message);
  }
  return Either.right({
    mechanics: AdmittedFindFamiliarReappearance({
      ownerId: input.casterId,
      combatantAdmission: combatantAdmission.right,
    }),
    presentation: {
      displayName: statBlock.statBlock.displayName,
      languages: statBlockLanguagePresentation(statBlock),
      procedures: statBlockProcedurePresentations({
        statBlock,
        execution: combatantAdmission.right.origin.execution,
      }),
    },
  });
}

function resolveStoredFindFamiliarReappearanceForm(input: {
  readonly catalog: BattleStatBlockExecutionCatalog;
  readonly storedForm: BattleCompanionStoredForm;
  readonly creatureTypeOverride: FindFamiliarCreatureTypeOverride;
}): Either.Either<
  {
    readonly statBlock: BattleStatBlockExecutionSource;
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
