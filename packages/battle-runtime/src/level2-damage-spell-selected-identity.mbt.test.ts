import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { resolveBattleSubject } from "./battle-runtime.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH acid_arrow dragons_breath flame_blade flaming_sphere heat_metal persistentAreaSaveDamage ray_of_enfeeblement scorching_ray shatter spiritual_weapon
// UNIT-IDENTITY-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH acid_arrow doDiscoverAcidArrowAttackTiming
// UNIT-IDENTITY-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH dragons_breath doDiscoverDragonsBreathInitial
// UNIT-IDENTITY-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH flame_blade doDiscoverFlameBladeHeldObject
// UNIT-IDENTITY-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH flaming_sphere doDiscoverFlamingSphereHazard
// UNIT-IDENTITY-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH heat_metal doDiscoverHeatMetalObjectContact
// UNIT-IDENTITY-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH persistentAreaSaveDamage doDiscoverMoonbeamMovableZone
// UNIT-IDENTITY-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH ray_of_enfeeblement doDiscoverRayOfEnfeeblementSaveGate
// UNIT-IDENTITY-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH scorching_ray doDiscoverScorchingRayAttackSequence
// UNIT-IDENTITY-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH shatter doDiscoverShatterSaveGatedDamage
// UNIT-IDENTITY-REPLAY: B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH spiritual_weapon doDiscoverSpiritualWeaponAttackProxy
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { describe, expect, it } from "vitest";

import grantedAreaSaveDamageActionInput from "../../surface/content/dragons_breath.json";
import rayOfEnfeeblementInput from "../../surface/content/ray_of_enfeeblement.json";
import {
  damageRollFillWithGroups,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import {
  battleReducerStartRouteEvent,
  endTurn,
  type BattleReducerRouteEvent,
  type BattleReducerRouteOwnerGroup,
  type BattleReducerRouteSubjectFamily,
  type BattleState,
  type BattleRuntimeSession,
} from "./index.ts";
import {
  acidArrowUnitId,
  dragonsBreathUnitId,
  flameBladeUnitId,
  flamingSphereUnitId,
  heatMetalUnitId,
  moonbeamUnitId,
  scorchingRayUnitId,
  shatterUnitId,
  spellCasterId,
  spellTargetId,
  spiritualWeaponUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  bonusSpellAct,
  flamingSphereAreaFill,
  flamingSphereEndTurnAct,
  moonbeamAreaFill,
  moonbeamEndTurnSaveAct,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { spellSlotInvocationRef } from "./unit-profile-admission.test-support.ts";

const rayOfEnfeeblementUnitId = "ray_of_enfeeblement";
type Level2DamageSpellUnitId =
  | typeof acidArrowUnitId
  | typeof dragonsBreathUnitId
  | typeof flameBladeUnitId
  | typeof flamingSphereUnitId
  | typeof heatMetalUnitId
  | typeof moonbeamUnitId
  | typeof rayOfEnfeeblementUnitId
  | typeof scorchingRayUnitId
  | typeof shatterUnitId
  | typeof spiritualWeaponUnitId;
type Level2DamageSpellSelectedIdentityResult =
  | "init"
  | "acidArrowAttackTiming"
  | "grantedAreaSaveDamageAction"
  | "flameBladeHeldObject"
  | "persistentAreaSaveDamageHazard"
  | "heatMetalObjectContact"
  | "persistentAreaSaveDamageMovableZone"
  | "rayOfEnfeeblementSaveGate"
  | "scorchingRayAttackSequence"
  | "shatterSaveGatedDamage"
  | "spatialMeleeSpellAttackProxy";
type Level2DamageSpellSelectedIdentityProjection = {
  readonly lastResult: Level2DamageSpellSelectedIdentityResult;
};
type SpellActionTag = "actionSpell" | "bonusActionSpell";
type SelectedLevel2DamageSpellInvocation = {
  readonly spellId: Level2DamageSpellUnitId;
  readonly actionTag: SpellActionTag;
  readonly slotLevel: 2;
  readonly procedure: Parameters<typeof spellSlotInvocationRef>[2];
  readonly result: Exclude<Level2DamageSpellSelectedIdentityResult, "init">;
};

const LEVEL2_DAMAGE_SPELL_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  AcidArrowAttackTiming: "acidArrowAttackTiming",
  DragonsBreathInitial: "grantedAreaSaveDamageAction",
  FlameBladeHeldObject: "flameBladeHeldObject",
  FlamingSphereHazard: "persistentAreaSaveDamageHazard",
  HeatMetalObjectContact: "heatMetalObjectContact",
  MoonbeamMovableZone: "persistentAreaSaveDamageMovableZone",
  RayOfEnfeeblementSaveGate: "rayOfEnfeeblementSaveGate",
  ScorchingRayAttackSequence: "scorchingRayAttackSequence",
  ShatterSaveGatedDamage: "shatterSaveGatedDamage",
  SpiritualWeaponAttackProxy: "spatialMeleeSpellAttackProxy",
} as const satisfies Readonly<
  Record<string, Level2DamageSpellSelectedIdentityResult>
>;

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Level 2 damage spell selected identity replay",
  taskId: "B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-level2-damage-spell-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: LEVEL2_DAMAGE_SPELL_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: { lastResult: "variant" },
  initialProjection: expectedProjection("init"),
  units: [
    {
      unitId: acidArrowUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverAcidArrowAttackTiming", {
          spellId: acidArrowUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "spellAttackDamage",
          result: "acidArrowAttackTiming",
        }),
      ],
    },
    {
      unitId: dragonsBreathUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverDragonsBreathInitial", {
          spellId: dragonsBreathUnitId,
          actionTag: "bonusActionSpell",
          slotLevel: 2,
          procedure: "grantedAreaSaveDamageAction",
          result: "grantedAreaSaveDamageAction",
        }),
      ],
    },
    {
      unitId: flameBladeUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverFlameBladeHeldObject", {
          spellId: flameBladeUnitId,
          actionTag: "bonusActionSpell",
          slotLevel: 2,
          procedure: "spellCreatedHeldObject",
          result: "flameBladeHeldObject",
        }),
      ],
    },
    {
      unitId: flamingSphereUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverFlamingSphereHazard", {
          spellId: flamingSphereUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "persistentAreaSaveDamage",
          result: "persistentAreaSaveDamageHazard",
        }),
      ],
    },
    {
      unitId: heatMetalUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverHeatMetalObjectContact", {
          spellId: heatMetalUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "objectContactDamage",
          result: "heatMetalObjectContact",
        }),
      ],
    },
    {
      unitId: moonbeamUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverMoonbeamMovableZone", {
          spellId: moonbeamUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "persistentAreaSaveDamage",
          result: "persistentAreaSaveDamageMovableZone",
        }),
      ],
    },
    {
      unitId: rayOfEnfeeblementUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverRayOfEnfeeblementSaveGate", {
          spellId: rayOfEnfeeblementUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "abilityD20TestRollModeSaveGate",
          result: "rayOfEnfeeblementSaveGate",
        }),
      ],
    },
    {
      unitId: scorchingRayUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverScorchingRayAttackSequence", {
          spellId: scorchingRayUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "spellAttackSequence",
          result: "scorchingRayAttackSequence",
        }),
      ],
    },
    {
      unitId: shatterUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverShatterSaveGatedDamage", {
          spellId: shatterUnitId,
          actionTag: "actionSpell",
          slotLevel: 2,
          procedure: "saveGatedDamage",
          result: "shatterSaveGatedDamage",
        }),
      ],
    },
    {
      unitId: spiritualWeaponUnitId,
      procedures: [
        selectedSpellProcedure("doDiscoverSpiritualWeaponAttackProxy", {
          spellId: spiritualWeaponUnitId,
          actionTag: "bonusActionSpell",
          slotLevel: 2,
          procedure: "spatialMeleeSpellAttackProxy",
          result: "spatialMeleeSpellAttackProxy",
        }),
      ],
    },
  ],
});

describe("Level 2 damage spell public reducer route replay", () => {
  it("observes selected concentration hazard qRoute through public reducer entrypoints", () => {
    expect(replayFlamingSphereHazardRoute()).toEqual(
      expectedFlamingSphereHazardRoute(),
    );
    expect(replayMoonbeamHazardRoute()).toEqual(expectedMoonbeamHazardRoute());
  });

  it("observes concentration hazard exact-damage qRoute through public reducer entrypoints", () => {
    expect(replayFlamingSphereExactDamageRoute()).toEqual(
      expectedFlamingSphereExactDamageRoute(),
    );
    expect(replayMoonbeamExactDamageRoute()).toEqual(
      expectedMoonbeamExactDamageRoute(),
    );
  });
});

type RouteDiscoverEvent = Extract<
  BattleReducerRouteEvent,
  { readonly kind: "discoverBattleActs" }
>;
type RouteResolveEvent = Extract<
  BattleReducerRouteEvent,
  { readonly kind: "resolveBattleSubject" }
>;
type RouteHoles = RouteDiscoverEvent["holes"];
type HazardCastReplay = {
  readonly route: readonly BattleReducerRouteEvent[];
  readonly state: BattleState;
  readonly session: BattleRuntimeSession;
};

function replayFlamingSphereHazardRoute(): readonly BattleReducerRouteEvent[] {
  return flamingSphereHazardCastReplay().route;
}

function replayMoonbeamHazardRoute(): readonly BattleReducerRouteEvent[] {
  return moonbeamHazardCastReplay().route;
}

function flamingSphereHazardCastReplay(): HazardCastReplay {
  const route: BattleReducerRouteEvent[] = [startRoute()];
  const state = selectedSpellBattle(spellRecord(flamingSphereUnitId));
  const act = spellAct({
    session: state,
    spellId: flamingSphereUnitId,
    slotLevel: 2,
  });
  route.push(...routeEventsOfSubject(act, "Flaming Sphere discovery"));
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state: state.state,
    subject: act.subject,
    fills: [flamingSphereAreaFill(area)],
  });
  route.push(...routeEventsOfSubject(cast, "Flaming Sphere cast"));
  if (cast.tag !== "resolved") {
    throw new Error(
      `Expected Flaming Sphere cast to resolve, got ${cast.tag}.`,
    );
  }
  return { route, state: cast.state, session: state };
}

function moonbeamHazardCastReplay(): HazardCastReplay {
  const route: BattleReducerRouteEvent[] = [startRoute()];
  const state = selectedSpellBattle(spellRecord(moonbeamUnitId));
  const act = spellAct({
    session: state,
    spellId: moonbeamUnitId,
    slotLevel: 2,
  });
  route.push(...routeEventsOfSubject(act, "Moonbeam discovery"));
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state: state.state,
    subject: act.subject,
    fills: [moonbeamAreaFill(area)],
  });
  route.push(...routeEventsOfSubject(cast, "Moonbeam cast"));
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Moonbeam cast to resolve, got ${cast.tag}.`);
  }
  return { route, state: cast.state, session: state };
}

function replayFlamingSphereExactDamageRoute(): readonly BattleReducerRouteEvent[] {
  const replay = flamingSphereHazardCastReplay();
  const route = [...replay.route];
  const targetTurn = endTurn({ state: replay.state, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Flaming Sphere caster end turn to resolve.");
  }
  const saveAct = flamingSphereEndTurnAct(
    battleRuntimeSessionForTest({
      ...replay.session,
      state: targetTurn.state,
    }),
  );
  route.push(...routeEventsOfSubject(saveAct, "Flaming Sphere save discovery"));
  const save = requireHole(saveAct.initialHoles, "savingThrowOutcome");
  const succeededSave = singleTargetSavingThrowOutcomeFill(
    save,
    spellTargetId,
    true,
  );
  const needsDamage = resolveBattleSubject({
    state: targetTurn.state,
    subject: saveAct.subject,
    fills: [succeededSave],
  });
  route.push(...routeEventsOfSubject(needsDamage, "Flaming Sphere save"));
  const damage = requireResultHole(needsDamage, "rolledDice");
  const damaged = resolveBattleSubject({
    state: targetTurn.state,
    subject: saveAct.subject,
    fills: [succeededSave, damageRollFillWithGroups(damage, [[3, 3]])],
  });
  route.push(...routeEventsOfSubject(damaged, "Flaming Sphere damage"));
  return route;
}

function replayMoonbeamExactDamageRoute(): readonly BattleReducerRouteEvent[] {
  const replay = moonbeamHazardCastReplay();
  const route = [...replay.route];
  const targetTurn = endTurn({ state: replay.state, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Moonbeam caster end turn to resolve.");
  }
  const saveAct = moonbeamEndTurnSaveAct(
    battleRuntimeSessionForTest({
      ...replay.session,
      state: targetTurn.state,
    }),
  );
  route.push(...routeEventsOfSubject(saveAct, "Moonbeam save discovery"));
  const save = requireHole(saveAct.initialHoles, "savingThrowOutcome");
  const succeededSave = singleTargetSavingThrowOutcomeFill(
    save,
    spellTargetId,
    true,
  );
  const needsDamage = resolveBattleSubject({
    state: targetTurn.state,
    subject: saveAct.subject,
    fills: [succeededSave],
  });
  route.push(...routeEventsOfSubject(needsDamage, "Moonbeam save"));
  const damage = requireResultHole(needsDamage, "rolledDice");
  const damaged = resolveBattleSubject({
    state: targetTurn.state,
    subject: saveAct.subject,
    fills: [succeededSave, damageRollFillWithGroups(damage, [[5, 6]])],
  });
  route.push(...routeEventsOfSubject(damaged, "Moonbeam damage"));
  return route;
}

function expectedFlamingSphereHazardRoute(): readonly BattleReducerRouteEvent[] {
  return [
    startRoute(),
    spatialDiscover(["targetChoice"], "battleSpellSlotAndActionEconomy"),
    spatialResolve("targetChoice", [], "battleAreaShape"),
    spatialResolveWithoutFill("battleActiveEffect"),
    spatialResolveWithoutFill("battleConcentration"),
    spatialResolveWithoutFill("battleAreaHazard"),
    spatialResolveWithoutFill("battleCreatureSpaceMovement"),
  ];
}

function expectedMoonbeamHazardRoute(): readonly BattleReducerRouteEvent[] {
  return [
    startRoute(),
    spatialDiscover(["targetChoice"], "battleSpellSlotAndActionEconomy"),
    spatialResolve("targetChoice", [], "battleAreaShape"),
    spatialResolveWithoutFill("battleActiveEffect"),
    spatialResolveWithoutFill("battleConcentration"),
    spatialResolveWithoutFill("battleLightProjection"),
    spatialResolveWithoutFill("battleAreaHazard"),
    spatialResolveWithoutFill("battleCreatureSpaceMovement"),
  ];
}

function expectedFlamingSphereExactDamageRoute(): readonly BattleReducerRouteEvent[] {
  return [
    ...expectedFlamingSphereHazardRoute(),
    ...hazardSavingThrowDamageRoute(),
  ];
}

function expectedMoonbeamExactDamageRoute(): readonly BattleReducerRouteEvent[] {
  return [...expectedMoonbeamHazardRoute(), ...hazardSavingThrowDamageRoute()];
}

function hazardSavingThrowDamageRoute(): readonly BattleReducerRouteEvent[] {
  return [
    spatialDiscover(["savingThrowOutcome"], "battleAreaHazard"),
    spatialResolve(
      "savingThrowOutcome",
      ["rolledDice"],
      "battleSavingThrowOutcome",
    ),
    spatialResolve("rolledDice", [], "battleHitPoint"),
  ];
}

function startRoute(): BattleReducerRouteEvent {
  return battleReducerStartRouteEvent();
}

function spatialDiscover(
  holes: RouteHoles,
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "discoverBattleActs",
    subject: "spatialEffect",
    holes,
    owner,
  };
}

function spatialResolve(
  fill: RouteResolveEvent["fill"],
  holes: RouteHoles,
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubject",
    subject: "spatialEffect",
    fill,
    holes,
    owner,
  };
}

function spatialResolveWithoutFill(
  owner: BattleReducerRouteOwnerGroup,
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: "spatialEffect",
    holes: [],
    owner,
  };
}

function routeEventsOfSubject(
  source: { readonly routeEvents?: readonly BattleReducerRouteEvent[] },
  label: string,
  subject: BattleReducerRouteSubjectFamily = "spatialEffect",
): readonly BattleReducerRouteEvent[] {
  const events = (source.routeEvents ?? []).filter(
    (
      event,
    ): event is Exclude<BattleReducerRouteEvent, { kind: "startBattle" }> =>
      event.kind !== "startBattle" && event.subject === subject,
  );
  if (events.length === 0) {
    throw new Error(
      `Expected ${subject} public reducer route events for ${label}.`,
    );
  }
  return events;
}

function selectedSpellProcedure(
  actionName: `do${string}`,
  input: SelectedLevel2DamageSpellInvocation,
) {
  return {
    actionName,
    discover: () => recordDiscoveredInvocation(input),
  };
}

function recordDiscoveredInvocation(
  input: SelectedLevel2DamageSpellInvocation,
): Level2DamageSpellSelectedIdentityProjection {
  const spell = selectedSpellRecord(input.spellId);
  const state = selectedSpellBattle(spell);
  const act =
    input.actionTag === "bonusActionSpell"
      ? bonusSpellAct({
          session: state,
          spellId: input.spellId,
          slotLevel: input.slotLevel,
        })
      : spellAct({
          session: state,
          spellId: input.spellId,
          slotLevel: input.slotLevel,
        });

  expect({
    ...act.subject,
    invocation: battleActSpellPresentation(act)?.invocation,
  }).toMatchObject({
    tag: input.actionTag,
    actorId: spellCasterId,
    invocation: spellSlotInvocationRef(
      input.spellId,
      input.slotLevel,
      input.procedure,
    ),
    mode: { tag: "cast" },
  });
  return expectedProjection(input.result);
}

function expectedProjection(
  lastResult: Level2DamageSpellSelectedIdentityResult,
): Level2DamageSpellSelectedIdentityProjection {
  return { lastResult };
}

function selectedSpellBattle(spell: SpellRecord): BattleRuntimeSession {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
}

function selectedSpellRecord(unitId: Level2DamageSpellUnitId): SpellRecord {
  if (unitId === dragonsBreathUnitId) {
    return decodedSpellRecord(grantedAreaSaveDamageActionInput, unitId);
  }
  if (unitId === rayOfEnfeeblementUnitId) {
    return decodedSpellRecord(rayOfEnfeeblementInput, unitId);
  }
  return spellRecord(unitId);
}

function decodedSpellRecord(
  input: unknown,
  unitId: Level2DamageSpellUnitId,
): SpellRecord {
  const unit = decodeUnitRecordSync(input);
  if (unit.kind !== "spell" || unit.id !== unitId) {
    throw new Error(`Expected ${unitId} spell record.`);
  }
  return unit;
}
