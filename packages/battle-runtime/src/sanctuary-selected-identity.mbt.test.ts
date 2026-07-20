import { resolveBattleSubject } from "./battle-runtime-test-support.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.SANCTUARY.TARGETING_INTERDICTION
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1H-SANCTUARY sanctuary
// UNIT-IDENTITY-REPLAY: L1H-SANCTUARY sanctuary doCastSanctuaryWardCreation doInterdictDirectAttackFailedSaveLoss doInterdictDirectSpellSuccessfulSavePassThrough doRetargetDirectAttackToLegalReplacement doRejectIllegalReplacementTarget doExcludeAreaEffectFromInterdiction doEndWardOnWardedAttackRoll doEndWardOnWardedSpellCast doEndWardOnWardedDamageDealt
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  DieRollResult,
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  battleId,
  battleReducerStartRouteEvent,
  characterId,
  combatantId,
  discoverBattleActCandidates,
  initiativeScore,
  startBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleCreatureInit,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleState,
  type BattleProcedureExecutionRef,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  decodeReducerRoute,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintField,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import {
  damageRollFillWithGroups,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  flamingSphereAreaFill,
  flamingSphereRamMovementFill,
  singleTargetSavingThrowOutcomeFill,
} from "./unit-profile-admission-spell-fill-support.ts";

type SanctuarySelectedIdentityLastResult =
  | "init"
  | "wardCreated"
  | "attackLost"
  | "spellSaveSucceeded"
  | "replacementAdmitted"
  | "replacementRejected"
  | "areaEffectExcluded"
  | "attackRollEndedWard"
  | "spellCastEndedWard"
  | "damageEndedWard";
type SanctuarySelectedIdentityProjection = {
  readonly wardPresent: boolean;
  readonly wardSourceIsSanctuary: boolean;
  readonly wisdomSaveRequested: boolean;
  readonly attackOrSpellLost: boolean;
  readonly successfulSavePassThrough: boolean;
  readonly legalReplacementPassThrough: boolean;
  readonly illegalReplacementRejected: boolean;
  readonly areaEffectBypassedInterdiction: boolean;
  readonly wardedHp: number;
  readonly lastResult: SanctuarySelectedIdentityLastResult;
};
type SanctuarySelectedIdentityAction =
  | "doCastSanctuaryWardCreation"
  | "doInterdictDirectAttackFailedSaveLoss"
  | "doInterdictDirectSpellSuccessfulSavePassThrough"
  | "doRetargetDirectAttackToLegalReplacement"
  | "doRejectIllegalReplacementTarget"
  | "doExcludeAreaEffectFromInterdiction"
  | "doEndWardOnWardedAttackRoll"
  | "doEndWardOnWardedSpellCast"
  | "doEndWardOnWardedDamageDealt";
const sanctuaryRouteSurfaceByTag = {
  FreshRouteSurface: "fresh",
  WardCreationRouteSurface: "wardCreation",
  DirectAttackFailedSaveLossRouteSurface: "directAttackFailedSaveLoss",
  DirectSpellSuccessfulSavePassThroughRouteSurface:
    "directSpellSuccessfulSavePassThrough",
  LegalReplacementTargetRouteSurface: "legalReplacementTarget",
  IllegalReplacementTargetRouteSurface: "illegalReplacementTarget",
  AreaEffectExcludedRouteSurface: "areaEffectExcluded",
  WardedAttackRollEarlyEndRouteSurface: "wardedAttackRollEarlyEnd",
  WardedSpellCastEarlyEndRouteSurface: "wardedSpellCastEarlyEnd",
  WardedDamageEarlyEndRouteSurface: "wardedDamageEarlyEnd",
} as const satisfies Readonly<Record<string, string>>;
type SanctuaryRouteSurface =
  (typeof sanctuaryRouteSurfaceByTag)[keyof typeof sanctuaryRouteSurfaceByTag];
type SanctuaryRouteProjection = {
  readonly surface: SanctuaryRouteSurface;
  readonly route: readonly ReducerRouteEvent[];
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly SanctuarySelectedIdentityAction[];
  readonly expected: SanctuarySelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1H-SANCTUARY";
  readonly unitId: typeof sanctuaryUnitId;
  readonly actions: readonly SanctuarySelectedIdentityAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type BonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionSpell" }
  >;
};
type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type AttackAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
};
type FlamingSphereRamAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "movableZoneRam" }
  >;
};
type NeedsHolesBattleResult = Extract<
  BattleResolutionResult,
  { readonly tag: "needsHoles" }
>;
type ResolvedBattleResult = Extract<
  BattleResolutionResult,
  { readonly tag: "resolved" }
>;
type SanctuaryWardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "sanctuaryWard" }
>;

const sanctuaryUnitId = "sanctuary";
const burningHandsUnitId = "burning_hands";
const fireBoltUnitId = "fire_bolt";
const flamingSphereUnitId = "flaming_sphere";
const longstriderUnitId = "longstrider";
type SanctuarySelectedIdentityActionSpellUnitId =
  | typeof burningHandsUnitId
  | typeof fireBoltUnitId
  | typeof flamingSphereUnitId
  | typeof longstriderUnitId;
type SanctuarySelectedIdentitySpellUnitId =
  | typeof sanctuaryUnitId
  | SanctuarySelectedIdentityActionSpellUnitId;
const casterId = combatantId("sanctuary-selected-identity-caster");
const wardedId = combatantId("sanctuary-selected-identity-warded");
const attackerId = combatantId("sanctuary-selected-identity-attacker");
const replacementId = combatantId("sanctuary-selected-identity-replacement");
const initialWardedHp = 12;
const damageDealtByWardedCreature = 1;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Sanctuary selected identity Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1H-SANCTUARY",
    unitId: "sanctuary",
    actions: [
      "doCastSanctuaryWardCreation",
      "doInterdictDirectAttackFailedSaveLoss",
      "doInterdictDirectSpellSuccessfulSavePassThrough",
      "doRetargetDirectAttackToLegalReplacement",
      "doRejectIllegalReplacementTarget",
      "doExcludeAreaEffectFromInterdiction",
      "doEndWardOnWardedAttackRoll",
      "doEndWardOnWardedSpellCast",
      "doEndWardOnWardedDamageDealt",
    ],
    sequences: [
      {
        name: "bonus-action-cast-creates-source-owned-ward",
        actions: ["doCastSanctuaryWardCreation"],
        expected: expectedProjection({
          wardPresent: true,
          wardSourceIsSanctuary: true,
          lastResult: "wardCreated",
        }),
      },
      {
        name: "failed-wisdom-save-loses-direct-attack",
        actions: ["doInterdictDirectAttackFailedSaveLoss"],
        expected: expectedProjection({
          wardPresent: true,
          wardSourceIsSanctuary: true,
          wisdomSaveRequested: true,
          attackOrSpellLost: true,
          lastResult: "attackLost",
        }),
      },
      {
        name: "successful-wisdom-save-passes-direct-spell-through",
        actions: ["doInterdictDirectSpellSuccessfulSavePassThrough"],
        expected: expectedProjection({
          wardPresent: true,
          wardSourceIsSanctuary: true,
          wisdomSaveRequested: true,
          successfulSavePassThrough: true,
          lastResult: "spellSaveSucceeded",
        }),
      },
      {
        name: "failed-save-retargets-direct-attack-to-legal-replacement",
        actions: ["doRetargetDirectAttackToLegalReplacement"],
        expected: expectedProjection({
          wardPresent: true,
          wardSourceIsSanctuary: true,
          wisdomSaveRequested: true,
          legalReplacementPassThrough: true,
          lastResult: "replacementAdmitted",
        }),
      },
      {
        name: "failed-save-rechecks-replacement-target-legality",
        actions: ["doRejectIllegalReplacementTarget"],
        expected: expectedProjection({
          wardPresent: true,
          wardSourceIsSanctuary: true,
          wisdomSaveRequested: true,
          illegalReplacementRejected: true,
          lastResult: "replacementRejected",
        }),
      },
      {
        name: "area-effect-spell-bypasses-sanctuary-interdiction",
        actions: ["doExcludeAreaEffectFromInterdiction"],
        expected: expectedProjection({
          wardPresent: true,
          wardSourceIsSanctuary: true,
          areaEffectBypassedInterdiction: true,
          lastResult: "areaEffectExcluded",
        }),
      },
      {
        name: "warded-attack-roll-ends-ward",
        actions: ["doEndWardOnWardedAttackRoll"],
        expected: expectedProjection({ lastResult: "attackRollEndedWard" }),
      },
      {
        name: "warded-spell-cast-ends-ward",
        actions: ["doEndWardOnWardedSpellCast"],
        expected: expectedProjection({ lastResult: "spellCastEndedWard" }),
      },
      {
        name: "warded-damage-source-ends-ward",
        actions: ["doEndWardOnWardedDamageDealt"],
        expected: expectedProjection({
          wardedHp: initialWardedHp - damageDealtByWardedCreature,
          lastResult: "damageEndedWard",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const sanctuaryDiscoveries = {
  doCastSanctuaryWardCreation: projectWardCreation,
  doInterdictDirectAttackFailedSaveLoss: projectDirectAttackLost,
  doInterdictDirectSpellSuccessfulSavePassThrough:
    projectDirectSpellSuccessfulSave,
  doRetargetDirectAttackToLegalReplacement: projectLegalReplacementTarget,
  doRejectIllegalReplacementTarget: projectIllegalReplacementTarget,
  doExcludeAreaEffectFromInterdiction: projectAreaEffectExclusion,
  doEndWardOnWardedAttackRoll: projectAttackRollEarlyEnd,
  doEndWardOnWardedSpellCast: projectSpellCastEarlyEnd,
  doEndWardOnWardedDamageDealt: projectDamageEarlyEnd,
} as const satisfies Record<
  SanctuarySelectedIdentityAction,
  () => SanctuarySelectedIdentityProjection
>;

const sanctuaryRouteDriverSchema = {
  init: {},
  doCastSanctuaryWardCreation: {},
  doInterdictDirectAttackFailedSaveLoss: {},
  doInterdictDirectSpellSuccessfulSavePassThrough: {},
  doRetargetDirectAttackToLegalReplacement: {},
  doRejectIllegalReplacementTarget: {},
  doExcludeAreaEffectFromInterdiction: {},
  doEndWardOnWardedAttackRoll: {},
  doEndWardOnWardedSpellCast: {},
  doEndWardOnWardedDamageDealt: {},
  step: {},
} as const;

const sanctuaryRouteStateCheck = stateCheck(
  normalizeSanctuaryRouteQuintState,
  (spec: SanctuaryRouteProjection, impl: SanctuaryRouteProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Sanctuary selected identity replay",
  taskId: "sanctuary-selected-identity",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-sanctuary-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      WardCreated: "wardCreated",
      AttackLost: "attackLost",
      SpellSaveSucceeded: "spellSaveSucceeded",
      ReplacementAdmitted: "replacementAdmitted",
      ReplacementRejected: "replacementRejected",
      AreaEffectExcluded: "areaEffectExcluded",
      AttackRollEndedWard: "attackRollEndedWard",
      SpellCastEndedWard: "spellCastEndedWard",
      DamageEndedWard: "damageEndedWard",
    },
  },
  projectionSchema: {
    wardPresent: "bool",
    wardSourceIsSanctuary: "bool",
    wisdomSaveRequested: "bool",
    attackOrSpellLost: "bool",
    successfulSavePassThrough: "bool",
    legalReplacementPassThrough: "bool",
    illegalReplacementRejected: "bool",
    areaEffectBypassedInterdiction: "bool",
    wardedHp: "int",
    lastResult: "variant",
  },
  initialProjection: projectInitialBattle(),
  units: selectedUnitIdentityReplays.map((replay) => ({
    unitId: replay.unitId,
    procedures: replay.sequences.map((sequence) => {
      const actionName = singleReplayAction(
        replay.unitId,
        sequence.name,
        sequence.actions,
      );
      return {
        actionName,
        discover: sanctuaryDiscoveries[actionName],
      };
    }),
  })),
});

describe("Sanctuary selected identity public reducer route replay", () => {
  it(
    "observes copied warded-target interdiction qRoute through public reducer entrypoints",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-sanctuary-selected-identity.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createSanctuaryRouteReplayDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: sanctuaryRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createSanctuaryRouteReplayDriver() {
  return defineDriver(sanctuaryRouteDriverSchema, () => {
    let projection = initialSanctuaryRouteProjection();
    return {
      init: () => {
        projection = initialSanctuaryRouteProjection();
      },
      doCastSanctuaryWardCreation: () => {
        projection = observeWardCreationRoute();
      },
      doInterdictDirectAttackFailedSaveLoss: () => {
        projection = observeDirectAttackLostRoute();
      },
      doInterdictDirectSpellSuccessfulSavePassThrough: () => {
        projection = observeDirectSpellSuccessfulSaveRoute();
      },
      doRetargetDirectAttackToLegalReplacement: () => {
        projection = observeLegalReplacementTargetRoute();
      },
      doRejectIllegalReplacementTarget: () => {
        projection = observeIllegalReplacementTargetRoute();
      },
      doExcludeAreaEffectFromInterdiction: () => {
        projection = observeAreaEffectExclusionRoute();
      },
      doEndWardOnWardedAttackRoll: () => {
        projection = observeAttackRollEarlyEndRoute();
      },
      doEndWardOnWardedSpellCast: () => {
        projection = observeSpellCastEarlyEndRoute();
      },
      doEndWardOnWardedDamageDealt: () => {
        projection = observeDamageEarlyEndRoute();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function initialSanctuaryRouteProjection(): SanctuaryRouteProjection {
  return {
    surface: "fresh",
    route: [battleReducerStartRouteEvent()],
  };
}

function observeWardCreationRoute(): SanctuaryRouteProjection {
  const state = battleWithSanctuary();
  const act = bonusActionSanctuaryAct(state);
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        sanctuaryTargetListFill(
          requireHole(act.initialHoles, "spellTargetList"),
          wardedId,
          act.subject.procedureRef,
        ),
      ],
    }),
  );
  return routeProjection("wardCreation", [
    battleReducerStartRouteEvent(),
    ...requirePublicRouteEvents(act.routeEvents, "Sanctuary discovery"),
    ...requirePublicRouteEvents(resolved.routeEvents, "Sanctuary resolution"),
  ]);
}

function observeDirectAttackLostRoute(): SanctuaryRouteProjection {
  const warded = advanceToAttacker(
    castSanctuary(battleWithSanctuary(), wardedId),
  );
  const attack = attackAct(warded, wardedId);
  const targetHole = requireHole(attack.initialHoles, "targetChoice");
  const targetFill = attackTargetFill(targetHole, wardedId);
  const needsSanctuary = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "Expected direct attack to request Sanctuary outcome.",
  );
  const lost = requireResolved(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(sanctuaryInterdictionHole(needsSanctuary), {
          saveSucceeded: false,
          outcome: { kind: "loseAttackOrSpell" },
        }),
      ],
    }),
  );
  return routeProjection("directAttackFailedSaveLoss", [
    battleReducerStartRouteEvent(),
    ...requirePublicRouteEvents(lost.routeEvents, "Sanctuary attack loss"),
  ]);
}

function observeDirectSpellSuccessfulSaveRoute(): SanctuaryRouteProjection {
  const warded = castSanctuary(battleWithSanctuary(), wardedId);
  const act = actionSpellAct(warded, fireBoltUnitId);
  const targetFill = spellTargetFill(
    requireHole(act.initialHoles, "targetChoice"),
    act.subject.procedureRef,
    casterId,
    wardedId,
  );
  const needsSanctuary = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [targetFill],
    }),
    "Expected direct spell to request Sanctuary outcome.",
  );
  const afterSave = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(sanctuaryInterdictionHole(needsSanctuary), {
          saveSucceeded: true,
        }),
      ],
    }),
    "Expected successful Sanctuary save to continue to the spell attack roll.",
  );
  return routeProjection("directSpellSuccessfulSavePassThrough", [
    battleReducerStartRouteEvent(),
    ...requirePublicRouteEvents(afterSave.routeEvents, "Sanctuary spell save"),
  ]);
}

function observeLegalReplacementTargetRoute(): SanctuaryRouteProjection {
  const warded = advanceToAttacker(
    castSanctuary(battleWithSanctuary(), wardedId),
  );
  const attack = attackAct(warded, wardedId);
  const targetHole = requireHole(attack.initialHoles, "targetChoice");
  const targetFill = attackTargetFill(targetHole, wardedId);
  const needsSanctuary = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "Expected original attack target to request Sanctuary outcome.",
  );
  const retargeted = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(sanctuaryInterdictionHole(needsSanctuary), {
          saveSucceeded: false,
          outcome: {
            kind: "newTarget",
            targetId: replacementId,
            spatialFacts: [attackTargetFact(targetHole, replacementId)],
            replacementTargetKind: "attackRoll",
          },
        }),
      ],
    }),
    "Expected legal Sanctuary replacement target to continue to attack roll.",
  );
  return routeProjection("legalReplacementTarget", [
    battleReducerStartRouteEvent(),
    ...requirePublicRouteEvents(
      retargeted.routeEvents,
      "Sanctuary legal replacement",
    ),
  ]);
}

function observeIllegalReplacementTargetRoute(): SanctuaryRouteProjection {
  const warded = advanceToAttacker(
    castSanctuary(battleWithSanctuary(), wardedId),
  );
  const attack = attackAct(warded, wardedId);
  const targetHole = requireHole(attack.initialHoles, "targetChoice");
  const targetFill = attackTargetFill(targetHole, wardedId);
  const needsSanctuary = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "Expected original attack target to request Sanctuary outcome.",
  );
  const rejected = resolveBattleSubject({
    state: warded,
    subject: attack.subject,
    fills: [
      targetFill,
      sanctuaryOutcomeFill(sanctuaryInterdictionHole(needsSanctuary), {
        saveSucceeded: false,
        outcome: {
          kind: "newTarget",
          targetId: attackerId,
          spatialFacts: [attackTargetFact(targetHole, attackerId)],
          replacementTargetKind: "attackRoll",
        },
      }),
    ],
  });
  if (rejected.tag !== "invalid") {
    throw new Error(
      `Expected illegal Sanctuary replacement target to be rejected, got ${rejected.tag}.`,
    );
  }
  return routeProjection("illegalReplacementTarget", [
    battleReducerStartRouteEvent(),
    ...requirePublicRouteEvents(
      rejected.routeEvents,
      "Sanctuary illegal replacement",
    ),
  ]);
}

function observeAreaEffectExclusionRoute(): SanctuaryRouteProjection {
  const warded = advanceRoundToCaster(
    castSanctuary(battleWithSanctuary(), wardedId),
  );
  const act = actionSpellAct(warded, burningHandsUnitId);
  const needsDamage = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(
          requireHole(act.initialHoles, "savingThrowOutcome"),
          [{ targetId: wardedId, succeeded: false }],
        ),
      ],
    }),
    "Expected area-effect spell to continue to damage roll.",
  );
  return routeProjection("areaEffectExcluded", [
    battleReducerStartRouteEvent(),
    ...requirePublicRouteEvents(
      act.routeEvents,
      "Sanctuary area-effect discovery",
    ),
    ...requirePublicRouteEvents(
      needsDamage.routeEvents,
      "Sanctuary area-effect resolution",
    ),
  ]);
}

function observeAttackRollEarlyEndRoute(): SanctuaryRouteProjection {
  const selfWarded = advanceToAttacker(
    castSanctuary(battleWithSanctuary(), attackerId),
  );
  const attack = attackAct(selfWarded, wardedId);
  const targetFill = attackTargetFill(
    requireHole(attack.initialHoles, "targetChoice"),
    wardedId,
  );
  const needsAttackRoll = requireNeedsHoles(
    resolveBattleSubject({
      state: selfWarded,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "Expected warded attacker to reach attack roll.",
  );
  const afterAttackRoll = resolveBattleSubject({
    state: selfWarded,
    subject: attack.subject,
    fills: [
      targetFill,
      attackRollFill(requireHole(needsAttackRoll.holes, "attackRoll"), {
        total: 1,
        naturalD20: 1,
      }),
    ],
  });
  progressedState(afterAttackRoll);
  return routeProjection("wardedAttackRollEarlyEnd", [
    battleReducerStartRouteEvent(),
    ...requirePublicRouteEvents(
      afterAttackRoll.routeEvents,
      "Sanctuary Attack Roll early end",
    ),
  ]);
}

function observeSpellCastEarlyEndRoute(): SanctuaryRouteProjection {
  const selfWarded = advanceRoundToCaster(
    castSanctuary(battleWithSanctuary(), casterId),
  );
  const act = actionSpellAct(selfWarded, longstriderUnitId);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: selfWarded,
      subject: act.subject,
      fills: [
        spellTargetFill(
          requireHole(act.initialHoles, "targetChoice"),
          act.subject.procedureRef,
          casterId,
          casterId,
        ),
      ],
    }),
  );
  return routeProjection("wardedSpellCastEarlyEnd", [
    battleReducerStartRouteEvent(),
    ...requirePublicRouteEvents(
      resolved.routeEvents,
      "Sanctuary spell-cast early end",
    ),
  ]);
}

function observeDamageEarlyEndRoute(): SanctuaryRouteProjection {
  const afterDamage = resolveWardedFlamingSphereRamDamage(
    wardedFlamingSphereRamState(),
  );
  if (sanctuaryWard(afterDamage.state, attackerId) !== undefined) {
    throw new Error(
      "Expected damage dealt by warded creature to end Sanctuary.",
    );
  }
  return routeProjection("wardedDamageEarlyEnd", [
    battleReducerStartRouteEvent(),
    ...requirePublicRouteEvents(
      afterDamage.routeEvents,
      "Sanctuary damage early end",
    ),
  ]);
}

function routeProjection(
  surface: SanctuaryRouteSurface,
  route: readonly BattleReducerRouteEvent[],
): SanctuaryRouteProjection {
  return { surface, route };
}

function requirePublicRouteEvents(
  routeEvents: readonly BattleReducerRouteEvent[] | undefined,
  label: string,
): readonly BattleReducerRouteEvent[] {
  if (routeEvents === undefined || routeEvents.length === 0) {
    throw new Error(`Expected public reducer route events for ${label}.`);
  }
  return routeEvents;
}

function normalizeSanctuaryRouteQuintState(
  raw: unknown,
): SanctuaryRouteProjection {
  const state = quintStateRecord(raw);
  const tag = quintVariantTag(quintField(state, "qSurface"));
  if (!isSanctuaryRouteSurfaceTag(tag)) {
    throw new Error(`Unknown Sanctuary route surface ${tag}.`);
  }
  const surface = sanctuaryRouteSurfaceByTag[tag];
  return {
    surface,
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function isSanctuaryRouteSurfaceTag(
  tag: string,
): tag is keyof typeof sanctuaryRouteSurfaceByTag {
  return tag in sanctuaryRouteSurfaceByTag;
}

function singleReplayAction(
  unitId: typeof sanctuaryUnitId,
  sequenceName: string,
  actions: readonly SanctuarySelectedIdentityAction[],
): SanctuarySelectedIdentityAction {
  if (actions.length !== 1 || actions[0] === undefined) {
    throw new Error(
      `Expected single Sanctuary selected identity replay action for ${unitId}:${sequenceName}.`,
    );
  }
  return actions[0];
}

function expectedProjection(
  overrides: Partial<SanctuarySelectedIdentityProjection> = {},
): SanctuarySelectedIdentityProjection {
  return {
    wardPresent: false,
    wardSourceIsSanctuary: false,
    wisdomSaveRequested: false,
    attackOrSpellLost: false,
    successfulSavePassThrough: false,
    legalReplacementPassThrough: false,
    illegalReplacementRejected: false,
    areaEffectBypassedInterdiction: false,
    wardedHp: initialWardedHp,
    lastResult: "init",
    ...overrides,
  };
}

function projectInitialBattle(): SanctuarySelectedIdentityProjection {
  return projectBattleState({
    state: battleWithSanctuary(),
    wardedCombatantId: wardedId,
    lastResult: "init",
  });
}

function projectWardCreation(): SanctuarySelectedIdentityProjection {
  const state = castSanctuary(battleWithSanctuary(), wardedId);
  return projectBattleState({
    state,
    wardedCombatantId: wardedId,
    lastResult: "wardCreated",
  });
}

function projectDirectAttackLost(): SanctuarySelectedIdentityProjection {
  const warded = advanceToAttacker(
    castSanctuary(battleWithSanctuary(), wardedId),
  );
  const attack = attackAct(warded, wardedId);
  const targetHole = requireHole(attack.initialHoles, "targetChoice");
  const targetFill = attackTargetFill(targetHole, wardedId);
  const needsSanctuary = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "Expected direct attack to request Sanctuary outcome.",
  );
  const sanctuaryHole = sanctuaryInterdictionHole(needsSanctuary);
  const lost = requireResolved(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(sanctuaryHole, {
          saveSucceeded: false,
          outcome: { kind: "loseAttackOrSpell" },
        }),
      ],
    }),
  );

  return projectBattleState({
    state: lost.state,
    wardedCombatantId: wardedId,
    lastResult: "attackLost",
    overrides: { wisdomSaveRequested: true, attackOrSpellLost: true },
  });
}

function projectDirectSpellSuccessfulSave(): SanctuarySelectedIdentityProjection {
  const warded = castSanctuary(battleWithSanctuary(), wardedId);
  const act = actionSpellAct(warded, fireBoltUnitId);
  const targetFill = spellTargetFill(
    requireHole(act.initialHoles, "targetChoice"),
    act.subject.procedureRef,
    casterId,
    wardedId,
  );
  const needsSanctuary = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [targetFill],
    }),
    "Expected direct spell to request Sanctuary outcome.",
  );
  const afterSave = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(sanctuaryInterdictionHole(needsSanctuary), {
          saveSucceeded: true,
        }),
      ],
    }),
    "Expected successful Sanctuary save to continue to the spell attack roll.",
  );
  requireHole(afterSave.holes, "attackRoll");

  return projectBattleState({
    state: afterSave.state,
    wardedCombatantId: wardedId,
    lastResult: "spellSaveSucceeded",
    overrides: {
      wisdomSaveRequested: true,
      successfulSavePassThrough: true,
    },
  });
}

function projectLegalReplacementTarget(): SanctuarySelectedIdentityProjection {
  const warded = advanceToAttacker(
    castSanctuary(battleWithSanctuary(), wardedId),
  );
  const attack = attackAct(warded, wardedId);
  const targetHole = requireHole(attack.initialHoles, "targetChoice");
  const targetFill = attackTargetFill(targetHole, wardedId);
  const needsSanctuary = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "Expected original attack target to request Sanctuary outcome.",
  );
  const retargeted = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(sanctuaryInterdictionHole(needsSanctuary), {
          saveSucceeded: false,
          outcome: {
            kind: "newTarget",
            targetId: replacementId,
            spatialFacts: [attackTargetFact(targetHole, replacementId)],
            replacementTargetKind: "attackRoll",
          },
        }),
      ],
    }),
    "Expected legal Sanctuary replacement target to continue to attack roll.",
  );
  requireHole(retargeted.holes, "attackRoll");

  return projectBattleState({
    state: retargeted.state,
    wardedCombatantId: wardedId,
    lastResult: "replacementAdmitted",
    overrides: {
      wisdomSaveRequested: true,
      legalReplacementPassThrough: true,
    },
  });
}

function projectIllegalReplacementTarget(): SanctuarySelectedIdentityProjection {
  const warded = advanceToAttacker(
    castSanctuary(battleWithSanctuary(), wardedId),
  );
  const attack = attackAct(warded, wardedId);
  const targetHole = requireHole(attack.initialHoles, "targetChoice");
  const targetFill = attackTargetFill(targetHole, wardedId);
  const needsSanctuary = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "Expected original attack target to request Sanctuary outcome.",
  );
  const rejected = resolveBattleSubject({
    state: warded,
    subject: attack.subject,
    fills: [
      targetFill,
      sanctuaryOutcomeFill(sanctuaryInterdictionHole(needsSanctuary), {
        saveSucceeded: false,
        outcome: {
          kind: "newTarget",
          targetId: attackerId,
          spatialFacts: [attackTargetFact(targetHole, attackerId)],
          replacementTargetKind: "attackRoll",
        },
      }),
    ],
  });
  if (rejected.tag !== "invalid") {
    throw new Error(
      `Expected illegal Sanctuary replacement target to be rejected, got ${rejected.tag}.`,
    );
  }

  return projectBattleState({
    state: warded,
    wardedCombatantId: wardedId,
    lastResult: "replacementRejected",
    overrides: {
      wisdomSaveRequested: true,
      illegalReplacementRejected: true,
    },
  });
}

function projectAreaEffectExclusion(): SanctuarySelectedIdentityProjection {
  const warded = advanceRoundToCaster(
    castSanctuary(battleWithSanctuary(), wardedId),
  );
  const act = actionSpellAct(warded, burningHandsUnitId);
  const needsDamage = requireNeedsHoles(
    resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(
          requireHole(act.initialHoles, "savingThrowOutcome"),
          [{ targetId: wardedId, succeeded: false }],
        ),
      ],
    }),
    "Expected area-effect spell to continue to damage roll.",
  );
  requireHole(needsDamage.holes, "rolledDice");
  if (hasHole(needsDamage.holes, "sanctuaryInterdictionOutcome")) {
    throw new Error("Area-effect spell must not request Sanctuary outcome.");
  }

  return projectBattleState({
    state: needsDamage.state,
    wardedCombatantId: wardedId,
    lastResult: "areaEffectExcluded",
    overrides: { areaEffectBypassedInterdiction: true },
  });
}

function projectAttackRollEarlyEnd(): SanctuarySelectedIdentityProjection {
  const selfWarded = advanceToAttacker(
    castSanctuary(battleWithSanctuary(), attackerId),
  );
  const attack = attackAct(selfWarded, wardedId);
  const targetFill = attackTargetFill(
    requireHole(attack.initialHoles, "targetChoice"),
    wardedId,
  );
  const needsAttackRoll = requireNeedsHoles(
    resolveBattleSubject({
      state: selfWarded,
      subject: attack.subject,
      fills: [targetFill],
    }),
    "Expected warded attacker to reach attack roll.",
  );
  const afterAttackRoll = progressedState(
    resolveBattleSubject({
      state: selfWarded,
      subject: attack.subject,
      fills: [
        targetFill,
        attackRollFill(requireHole(needsAttackRoll.holes, "attackRoll"), {
          total: 1,
          naturalD20: 1,
        }),
      ],
    }),
  );

  return projectBattleState({
    state: afterAttackRoll,
    wardedCombatantId: attackerId,
    lastResult: "attackRollEndedWard",
  });
}

function projectSpellCastEarlyEnd(): SanctuarySelectedIdentityProjection {
  const selfWarded = advanceRoundToCaster(
    castSanctuary(battleWithSanctuary(), casterId),
  );
  const act = actionSpellAct(selfWarded, longstriderUnitId);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: selfWarded,
      subject: act.subject,
      fills: [
        spellTargetFill(
          requireHole(act.initialHoles, "targetChoice"),
          act.subject.procedureRef,
          casterId,
          casterId,
        ),
      ],
    }),
  );

  return projectBattleState({
    state: resolved.state,
    wardedCombatantId: casterId,
    lastResult: "spellCastEndedWard",
  });
}

function projectDamageEarlyEnd(): SanctuarySelectedIdentityProjection {
  const afterDamage = resolveWardedFlamingSphereRamDamage(
    wardedFlamingSphereRamState(),
  );

  return projectBattleState({
    state: afterDamage.state,
    wardedCombatantId: attackerId,
    lastResult: "damageEndedWard",
  });
}

function projectBattleState(input: {
  readonly state: BattleState;
  readonly wardedCombatantId: CombatantId;
  readonly lastResult: SanctuarySelectedIdentityLastResult;
  readonly overrides?: Partial<SanctuarySelectedIdentityProjection>;
}): SanctuarySelectedIdentityProjection {
  const ward = sanctuaryWard(input.state, input.wardedCombatantId);
  return expectedProjection({
    wardPresent: ward !== undefined,
    wardSourceIsSanctuary:
      ward !== undefined &&
      ward.sourceCombatantId === casterId &&
      ward.save.ability === "wis",
    wardedHp: Number(combatant(input.state, wardedId).hp),
    lastResult: input.lastResult,
    ...input.overrides,
  });
}

function srdSpellRecord(
  unitId: SanctuarySelectedIdentitySpellUnitId,
): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function battleWithSanctuary(): BattleState {
  const result = startBattle({
    battleId: battleId("sanctuary-selected-identity"),
    combatants: [
      characterCreature(casterId, "Caster", 20, {
        sourceClassName: "cleric",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [srdSpellRecord(fireBoltUnitId)],
        preparedSpells: [
          srdSpellRecord(sanctuaryUnitId),
          srdSpellRecord(burningHandsUnitId),
          srdSpellRecord(longstriderUnitId),
        ],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 2 }],
      }),
      characterCreature(wardedId, "Warded", 15),
      characterCreature(attackerId, "Attacker", 10, {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [srdSpellRecord(flamingSphereUnitId)],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      }),
      characterCreature(replacementId, "Replacement", 9),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right.state;
}

function characterCreature(
  combatantIdValue: CombatantId,
  displayName: string,
  initiative: number,
  spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"],
): BattleCreatureInit {
  const className = spellcasting?.sourceClassName ?? "cleric";
  const highestSpellSlotLevel =
    spellcasting?.spellSlots.reduce(
      (highest, slot) => Math.max(highest, slot.spellLevel),
      0,
    ) ?? 0;
  return {
    combatantId: combatantIdValue,
    displayName,
    initiative: initiativeScore(initiative),
    creatureInit: {
      kind: "character",
      characterId: characterId(`${combatantIdValue}-character`),
      characterUnitRefs: [],
      classLevels: [{ className, level: highestSpellSlotLevel >= 2 ? 3 : 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(initialWardedHp),
      maxHp: Hp(initialWardedHp),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(spellcasting === undefined ? {} : { spellcasting }),
    },
  };
}

function castSanctuary(state: BattleState, targetId: CombatantId): BattleState {
  const act = bonusActionSanctuaryAct(state);
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        sanctuaryTargetListFill(
          requireHole(act.initialHoles, "spellTargetList"),
          targetId,
          act.subject.procedureRef,
        ),
      ],
    }),
  );
  return resolved.state;
}

function bonusActionSanctuaryAct(state: BattleState): BonusActionSpellAct {
  const act = discoverBattleActCandidates(state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell",
  );
  if (act === undefined) {
    throw new Error("Expected Sanctuary Bonus Action spell act.");
  }
  return act;
}

function actionSpellAct(
  state: BattleState,
  spellId: SanctuarySelectedIdentityActionSpellUnitId,
): ActionSpellAct {
  const act = discoverBattleActCandidates(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell",
  );
  if (act === undefined) {
    throw new Error(`Expected action spell act for ${spellId}.`);
  }
  return act;
}

function attackAct(state: BattleState, targetId: CombatantId): AttackAct {
  const act = discoverBattleActCandidates(state).find(
    (candidate): candidate is AttackAct =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      requireHole(candidate.initialHoles, "targetChoice").choices.includes(
        targetId,
      ),
  );
  if (act === undefined) {
    throw new Error("Expected Attack act.");
  }
  return act;
}

function wardedFlamingSphereRamState(): BattleState {
  const afterFlamingSphere = castFlamingSphereAsAttacker(
    advanceToAttacker(battleWithSanctuary()),
  );
  const nextCasterTurn = advanceFromAttackerToCaster(afterFlamingSphere);
  return advanceToAttacker(castSanctuary(nextCasterTurn, attackerId));
}

function castFlamingSphereAsAttacker(state: BattleState): BattleState {
  const act = actionSpellAct(state, flamingSphereUnitId);
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        flamingSphereAreaFill(requireHole(act.initialHoles, "spellAreaChoice")),
      ],
    }),
  );
  return resolved.state;
}

function resolveWardedFlamingSphereRamDamage(
  state: BattleState,
): ResolvedBattleResult {
  const act = flamingSphereRamAct(state, wardedId);
  const movementFill = flamingSphereRamMovementFill(
    requireHole(act.initialHoles, "movableZoneRamMovement"),
  );
  const saveFill = singleTargetSavingThrowOutcomeFill(
    requireHole(act.initialHoles, "savingThrowOutcome"),
    wardedId,
    true,
  );
  const needsDamage = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [movementFill, saveFill],
  });
  const damage = requireResultHole(needsDamage, "rolledDice");
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        movementFill,
        saveFill,
        damageRollFillWithGroups(damage, [[1, 1]]),
      ],
    }),
  );
}

function flamingSphereRamAct(
  state: BattleState,
  targetId: CombatantId,
): FlamingSphereRamAct {
  const act = discoverBattleActCandidates(state).find(
    (candidate): candidate is FlamingSphereRamAct =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "movableZoneRam" &&
      candidate.subject.targetId === targetId,
  );
  if (act === undefined) {
    throw new Error("Expected Flaming Sphere ram act.");
  }
  return act;
}

function advanceToAttacker(state: BattleState): BattleState {
  return endTurnFor(endTurnFor(state, casterId), wardedId);
}

function advanceFromAttackerToCaster(state: BattleState): BattleState {
  return endTurnFor(endTurnFor(state, attackerId), replacementId);
}

function advanceRoundToCaster(state: BattleState): BattleState {
  return endTurnFor(
    endTurnFor(endTurnFor(endTurnFor(state, casterId), wardedId), attackerId),
    replacementId,
  );
}

function endTurnFor(state: BattleState, actorId: CombatantId): BattleState {
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
      fills: [],
    }),
  );
  return resolved.state;
}

function sanctuaryTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  targetId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds: [targetId] },
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        sourceProcedureRef,
      },
    ],
  };
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    ...(hole.relationshipFactRequest?.kind === "attackRollTargetIsEnemy"
      ? {
          relationshipFacts: [
            {
              kind: "attackRollTargetIsEnemy" as const,
              attackerId: hole.relationshipFactRequest.attackerId,
              targetId,
              targetIsEnemy: true,
            },
          ],
        }
      : {}),
    spatialFacts: [attackTargetFact(hole, targetId)],
  };
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  sourceProcedureRef: BattleProcedureExecutionRef,
  casterIdValue: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    ...(hole.relationshipFactRequest?.kind === "attackRollTargetIsEnemy"
      ? {
          relationshipFacts: [
            {
              kind: "attackRollTargetIsEnemy" as const,
              attackerId: hole.relationshipFactRequest.attackerId,
              targetId,
              targetIsEnemy: true,
            },
          ],
        }
      : {}),
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: casterIdValue,
        targetId,
        sourceProcedureRef,
      },
    ],
  };
}

function attackTargetFact(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: CombatantId,
) {
  if (hole.attack === undefined) {
    throw new Error("Expected bound Sanctuary attack selection.");
  }
  return {
    kind: "attackTargetInMeleeReach" as const,
    actorId: attackerId,
    targetId,
    ...hole.attack.selection,
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: { readonly total: number; readonly naturalD20: number },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: { total: value.total, naturalD20: DieRollResult(value.naturalD20) },
  };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId: casterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
      },
      outcomes,
    },
  };
}

function sanctuaryOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "sanctuaryInterdictionOutcome" }>,
  value: Extract<
    BattleFill,
    { readonly kind: "sanctuaryInterdictionOutcome" }
  >["value"],
): Extract<BattleFill, { readonly kind: "sanctuaryInterdictionOutcome" }> {
  return { kind: "sanctuaryInterdictionOutcome", holeId: hole.holeId, value };
}

function sanctuaryInterdictionHole(
  result: NeedsHolesBattleResult,
): Extract<BattleHole, { readonly kind: "sanctuaryInterdictionOutcome" }> {
  const hole = requireHole(result.holes, "sanctuaryInterdictionOutcome");
  if (hole.ability !== "wis") {
    throw new Error(`Expected Sanctuary Wisdom save, got ${hole.ability}.`);
  }
  return hole;
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function hasHole(holes: readonly BattleHole[], kind: BattleHole["kind"]) {
  return holes.some((hole) => hole.kind === kind);
}

function requireNeedsHoles(
  result: BattleResolutionResult,
  message: string,
): NeedsHolesBattleResult {
  if (result.tag !== "needsHoles") {
    throw new Error(`${message} Got ${result.tag}.`);
  }
  return result;
}

function requireResolved(result: BattleResolutionResult): ResolvedBattleResult {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved result, got ${result.tag}.`);
  }
  return result;
}

function progressedState(result: BattleResolutionResult): BattleState {
  if (result.tag === "needsHoles" || result.tag === "resolved") {
    return result.state;
  }
  throw new Error(`Expected resolution to progress, got ${result.tag}.`);
}

function combatant(
  state: BattleState,
  combatantIdValue: CombatantId,
): BattleCreatureState {
  const found = state.combatants.get(combatantIdValue);
  if (found === undefined) {
    throw new Error(`Expected combatant ${combatantIdValue}.`);
  }
  return found;
}

function sanctuaryWard(
  state: BattleState,
  combatantIdValue: CombatantId,
): SanctuaryWardEffect | undefined {
  return combatant(state, combatantIdValue).activeEffects.find(
    (effect): effect is SanctuaryWardEffect => effect.kind === "sanctuaryWard",
  );
}
