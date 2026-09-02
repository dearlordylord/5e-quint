// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
import type { BattleCreatureInit } from "@dnd/battle-runtime/consumer-protocol";
import type { CharacterBuildProjectionIssue } from "@dnd/character-creation-runtime/consumer-protocol";
import {
  characterSheetCurrentHp,
  characterSheetDruidWildShapeKnownForms,
  characterSheetHitPointMaximumProjectionWithIssues,
  characterSheetPactSlots,
  characterSheetSpellSlots,
  characterSheetTempHp,
  type CharacterSheet,
  type CharacterSheetHitPointMaximumProjectionIssue,
  type CharacterSheetSpellSlotState,
  type CharacterSheetStableRecovery,
} from "@dnd/character-sheet-runtime/battle-init-protocol";
import { type ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { StatBlockRecord } from "@dnd/surface/surface/stat-block-types";
import { Option, Result } from "effect";

import {
  battleCreatureInitFromCharacterBuild,
  type CharacterBuildCreatureInput,
  type CharacterBattleCreatureInitResult,
  type CharacterSheetBattleInit,
  type CharacterSheetBattleInitInput,
} from "./battle-creature-init.ts";
import {
  battleCreatureInitIssue,
  battleCreatureInitIssuesFromCharacterBuildProjection,
  characterBattleInitIssueFactFields,
  type BattleCreatureInitIssue,
} from "./battle-character-build-projection.ts";
import {
  enterBattleRuntimeRoute,
  projectCharacterSheetToBattleRoute,
  recordCharacterBattleHandoffFactsRoute,
  rejectCharacterBattleHandoffRoute,
  type CharacterBattleRouteEvent,
} from "./character-battle-route.ts";
import { characterBattleOriginFeatSelectedReferenceProjection } from "./origin-feat-selected-reference-projection.ts";

export type CharacterBattleInitProjection = {
  readonly init: Extract<
    BattleCreatureInit,
    { readonly creatureInit: { readonly kind: "character" } }
  >;
  readonly routeEvents: readonly CharacterBattleRouteEvent[];
};

export type CharacterBattleInitProjectionIssue = BattleCreatureInitIssue & {
  readonly routeEvents: readonly CharacterBattleRouteEvent[];
};

export function characterBattleInitProjectionFromInit(
  init: CharacterBattleCreatureInitResult,
  routeEvents: readonly CharacterBattleRouteEvent[],
): Result.Result<
  CharacterBattleInitProjection,
  CharacterBattleInitProjectionIssue
> {
  return Result.succeed({ init, routeEvents });
}

export function characterBattleInitIssueWithoutRouteEvents(
  issue: CharacterBattleInitProjectionIssue,
): BattleCreatureInitIssue {
  const { routeEvents: _routeEvents, ...routeFreeIssue } = issue;
  return routeFreeIssue;
}

export const characterSheetBattleInit: CharacterSheetBattleInit = (input) => {
  const projection = characterSheetBattleInitWithRoute(input);
  return Result.isFailure(projection)
    ? Result.fail(
        characterBattleInitIssueWithoutRouteEvents(projection.failure),
      )
    : Result.succeed(projection.success.init);
};

export function characterSheetBattleInitWithRoute(
  input: CharacterSheetBattleInitInput,
): Result.Result<
  CharacterBattleInitProjection,
  CharacterBattleInitProjectionIssue
> {
  const { sheet, unitLibrary, statBlockCatalog, ...battleInput } = input;
  const stableRecoveryIssue = unsupportedStableRecoveryBattleBoundary(sheet);
  if (stableRecoveryIssue !== null) {
    return Result.fail({
      tag: "battleCreatureInitIssue",
      message: stableRecoveryIssue,
      ...characterBattleInitIssueFactFields({
        kind: "characterBuildProjection",
        phase: "derivedState",
      }),
      routeEvents: rejectStableRecoveryBattleInitRoute(),
    });
  }
  if (hasMixedSpellAndPactSlotState(sheet)) {
    return Result.fail({
      tag: "battleCreatureInitIssue",
      message: mixedSpellAndPactSlotStateMessage,
      ...characterBattleInitIssueFactFields({
        kind: "characterBuildProjection",
        phase: "spellcasting",
      }),
      routeEvents: rejectMixedSpellAndPactSlotBattleInitRoute(),
    });
  }
  const selectedReference =
    characterBattleOriginFeatSelectedReferenceProjection({
      build: sheet.build,
      unitLibrary,
    });
  if (Result.isFailure(selectedReference)) {
    return Result.fail({
      ...selectedReference.failure,
      routeEvents: rejectCharacterBattleInitProjectionRoute(),
    });
  }
  const druidWildShapeAvailableForms =
    battleDruidWildShapeAvailableFormsFromSheet({
      sheet,
      statBlockCatalog,
    });
  const hitPointMaximum = characterSheetHitPointMaximumProjectionWithIssues({
    sheet,
    unitLibrary,
  });
  if (Result.isFailure(hitPointMaximum)) {
    const issue = characterBattleHitPointMaximumIssue(hitPointMaximum.failure);
    return Result.fail({
      ...issue,
      routeEvents: rejectBuildHitPointBattleInitRoute(),
    });
  }
  const init = battleCreatureInitFromCharacterBuild({
    ...battleInput,
    unitLibrary,
    build: sheet.build,
    characterId: sheet.characterId,
    hitPointMaximum: hitPointMaximum.success.effectiveHitPointMaximum,
    currentHp: characterSheetCurrentHp(sheet),
    tempHp: characterSheetTempHp(sheet),
    ...withDefinedCharacterBattleSheetState(sheet),
    ...(druidWildShapeAvailableForms === undefined
      ? {}
      : { druidWildShapeAvailableForms }),
  });
  if (Result.isFailure(init)) {
    return Result.fail({
      ...init.failure,
      routeEvents: rejectCharacterBattleInitProjectionRoute(),
    });
  }
  return characterBattleInitProjectionFromInit(
    init.success,
    acceptedCharacterSheetBattleInitRoute({ sheet }),
  );
}

function characterBattleHitPointMaximumIssue(
  issue: CharacterSheetHitPointMaximumProjectionIssue,
): BattleCreatureInitIssue {
  if (isCharacterBuildProjectionIssues(issue)) {
    return Result.merge(
      battleCreatureInitIssuesFromCharacterBuildProjection(issue, "hitPoints"),
    );
  }
  return Result.merge(
    battleCreatureInitIssue(issue.message, {
      kind: "characterBuildProjection",
      phase: "hitPoints",
    }),
  );
}

function isCharacterBuildProjectionIssues(
  issue: CharacterSheetHitPointMaximumProjectionIssue,
): issue is ReadonlyNonEmptyArray<CharacterBuildProjectionIssue> {
  return Array.isArray(issue);
}

function acceptedCharacterSheetBattleInitRoute(input: {
  readonly sheet: CharacterSheet;
}): readonly CharacterBattleRouteEvent[] {
  const baseRoute = hasPurePactSlotState(input.sheet)
    ? [
        projectCharacterSheetToBattleRoute({
          subject: "handoffResourceProjection",
          owner: "characterBattleResourceProjection",
        }),
        recordCharacterBattleHandoffFactsRoute({
          subject: "handoffResourceProjection",
          facts: ["sourceExactPactSlotDelta"],
          owner: "characterBattleResourceProjection",
        }),
        enterBattleRuntimeRoute({
          subject: "handoffResourceProjection",
          owner: "characterBattleInitProjection",
        }),
      ]
    : [
        projectCharacterSheetToBattleRoute({
          subject: "sheetToBattleInit",
          owner: "characterBattleSheet",
        }),
        projectCharacterSheetToBattleRoute({
          subject: "sheetToBattleInit",
          owner: "characterBattleBuildProjection",
        }),
        recordCharacterBattleHandoffFactsRoute({
          subject: "sheetToBattleInit",
          facts: ["buildHitPointMaximumInput"],
          owner: "characterBattleBuildProjection",
        }),
        enterBattleRuntimeRoute({
          subject: "sheetToBattleInit",
          owner: "characterBattleInitProjection",
        }),
      ];
  return [...baseRoute, ...selectedReferenceBattleInitRouteEvents()];
}

function selectedReferenceBattleInitRouteEvents(): readonly CharacterBattleRouteEvent[] {
  return [
    projectCharacterSheetToBattleRoute({
      subject: "handoffSelectedReference",
      owner: "characterBattleBuildProjection",
    }),
    recordCharacterBattleHandoffFactsRoute({
      subject: "handoffSelectedReference",
      facts: ["selectedReferenceRetention"],
      owner: "characterBattleBuildProjection",
    }),
    projectCharacterSheetToBattleRoute({
      subject: "handoffSelectedReference",
      owner: "characterBattleInitProjection",
    }),
    enterBattleRuntimeRoute({
      subject: "handoffSelectedReference",
      owner: "characterBattleRuntime",
    }),
  ];
}

function rejectMixedSpellAndPactSlotBattleInitRoute(): readonly CharacterBattleRouteEvent[] {
  return [
    rejectCharacterBattleHandoffRoute({
      subject: "handoffResourceProjection",
      fill: "resourceDelta",
      holes: ["spellResourceProjection"],
      owner: "characterBattleResourceProjection",
    }),
  ];
}

export function rejectBuildHitPointBattleInitRoute(): readonly CharacterBattleRouteEvent[] {
  return [
    rejectCharacterBattleHandoffRoute({
      subject: "sheetToBattleInit",
      fill: "sheetProjection",
      holes: ["hitPointProjection"],
      owner: "characterBattleBuildProjection",
    }),
  ];
}

function rejectStableRecoveryBattleInitRoute(): readonly CharacterBattleRouteEvent[] {
  return [
    rejectCharacterBattleHandoffRoute({
      subject: "sheetToBattleInit",
      fill: "sheetProjection",
      holes: ["settlementConflict"],
      owner: "characterBattleInitProjection",
    }),
  ];
}

export function rejectCharacterBattleInitProjectionRoute(): readonly CharacterBattleRouteEvent[] {
  return [
    rejectCharacterBattleHandoffRoute({
      subject: "sheetToBattleInit",
      fill: "sheetProjection",
      holes: ["settlementConflict"],
      owner: "characterBattleInitProjection",
    }),
  ];
}

function battleDruidWildShapeAvailableFormsFromSheet(input: {
  readonly sheet: CharacterSheet;
  readonly statBlockCatalog: CharacterSheetBattleInitInput["statBlockCatalog"];
}): readonly StatBlockRecord[] | undefined {
  const knownForms = characterSheetDruidWildShapeKnownForms(input.sheet);
  if (knownForms === undefined) return undefined;
  const forms: StatBlockRecord[] = [];
  for (const statBlockId of knownForms.statBlockIds) {
    const statBlock = input.statBlockCatalog.getStatBlock(statBlockId);
    if (Option.isSome(statBlock)) {
      forms.push(statBlock.value);
    }
  }
  return forms;
}

function characterSheetInitialConditions(
  sheet: CharacterSheet,
): NonNullable<CharacterBuildCreatureInput["conditions"]> {
  return [
    ...sheet.conditions,
    ...(sheet.hitPoints.tag === "knockedOut" ? (["unconscious"] as const) : []),
  ];
}

function withDefinedCharacterBattleSheetState(
  sheet: CharacterSheet,
): Pick<CharacterBuildCreatureInput, "resourceExpenditures"> &
  Partial<
    Pick<
      CharacterBuildCreatureInput,
      | "conditions"
      | "positiveHpUnconscious"
      | "zeroHpLifecycle"
      | "spellSlots"
      | "bookOfShadowsPresence"
    >
  > {
  const conditions = characterSheetInitialConditions(sheet);
  const positiveHpUnconscious = characterSheetPositiveHpUnconscious(sheet);
  const zeroHpLifecycle = characterSheetZeroHpLifecycle(sheet);
  const spellSlots = characterSheetBattleSpellSlots(sheet);
  return {
    conditions,
    ...(positiveHpUnconscious === undefined ? {} : { positiveHpUnconscious }),
    ...(zeroHpLifecycle === undefined ? {} : { zeroHpLifecycle }),
    ...(spellSlots === undefined ? {} : { spellSlots }),
    ...(sheet.bookOfShadowsPresence === undefined
      ? {}
      : { bookOfShadowsPresence: sheet.bookOfShadowsPresence }),
    resourceExpenditures: sheet.resourceExpenditures,
  };
}

function characterSheetBattleSpellSlots(
  sheet: CharacterSheet,
): readonly CharacterSheetSpellSlotState[] | undefined {
  const spellSlots = characterSheetSpellSlots(sheet);
  const pactSlots = characterSheetPactSlots(sheet);
  if (
    pactSlots !== undefined &&
    (spellSlots === undefined || spellSlots.length === 0)
  ) {
    return [
      {
        spellLevel: pactSlots.slotLevel,
        count: pactSlots.count,
        expended: pactSlots.expended,
      },
    ];
  }
  return spellSlots;
}

export const mixedSpellAndPactSlotStateMessage =
  "Battle handoff cannot project mixed Spell Slot and Pact Slot state without source-distinct battle slots.";

export function hasMixedSpellAndPactSlotState(sheet: CharacterSheet): boolean {
  const spellSlots = characterSheetSpellSlots(sheet);
  return (
    characterSheetPactSlots(sheet) !== undefined &&
    spellSlots !== undefined &&
    spellSlots.length > 0
  );
}

function hasPurePactSlotState(sheet: CharacterSheet): boolean {
  const spellSlots = characterSheetSpellSlots(sheet);
  return (
    characterSheetPactSlots(sheet) !== undefined &&
    (spellSlots === undefined || spellSlots.length === 0)
  );
}

function characterSheetPositiveHpUnconscious(
  sheet: CharacterSheet,
): CharacterBuildCreatureInput["positiveHpUnconscious"] {
  return sheet.hitPoints.tag === "knockedOut"
    ? { tag: "knockedOut" }
    : undefined;
}

function characterSheetZeroHpLifecycle(
  sheet: CharacterSheet,
): CharacterBuildCreatureInput["zeroHpLifecycle"] {
  if (sheet.hitPoints.tag !== "zero") return undefined;
  const lifecycle = sheet.hitPoints.lifecycle;
  if (lifecycle.tag === "stable") {
    return {
      policy: "usesDeathSavingThrows",
      deathSaves: {
        deathSaves: { successes: 0, failures: 0 },
        stable: true,
        dead: false,
        hpRegained: false,
      },
    };
  }
  if (lifecycle.tag === "dead") {
    return {
      policy: "usesDeathSavingThrows",
      deathSaves: {
        deathSaves: lifecycle.deathSaves,
        stable: false,
        dead: true,
        hpRegained: false,
      },
    };
  }
  return {
    policy: "usesDeathSavingThrows",
    deathSaves: {
      deathSaves: lifecycle.deathSaves,
      stable: false,
      dead: false,
      hpRegained: false,
    },
  };
}

export function unsupportedStableRecoveryBattleBoundary(
  sheet: CharacterSheet,
): string | null {
  if (
    sheet.hitPoints.tag !== "zero" ||
    sheet.hitPoints.lifecycle.tag !== "stable"
  ) {
    return null;
  }
  return freshStableRecovery(sheet.hitPoints.lifecycle.recovery)
    ? null
    : "Battle handoff cannot preserve in-progress Stable recovery timers.";
}

function freshStableRecovery(recovery: CharacterSheetStableRecovery): boolean {
  return (
    recovery.kind === "regains1HpAfter1d4Hours" &&
    Number(recovery.elapsedBeforeRecoveryRoll) === 0
  );
}
