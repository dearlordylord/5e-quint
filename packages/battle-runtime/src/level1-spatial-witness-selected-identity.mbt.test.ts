// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt level1-spatial-witness dancing_lights
// UNIT-IDENTITY-MBT-REPLAY: level1-spatial-witness dancing_lights doDancingLightsMovableDimLight
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  canSpendAction,
  canSpendBonusAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  battleCombatantSide,
  battleId,
  battleIlluminationFromLightEmitters,
  battleObscurementZones,
  battleSightObscurement,
  battleTablePositionId,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleIllumination,
  type BattleLightEmitter,
  type BattleLightEmitterProjectionFact,
  type BattleSightObscurement,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

const level1SpatialWitnessSelectedIdentityDriverSchema = {
  init: {},
  doDancingLightsMovableDimLight: {},
  step: {},
} as const;
type Level1SpatialWitnessSelectedIdentityDriverAction = Exclude<
  keyof typeof level1SpatialWitnessSelectedIdentityDriverSchema,
  "init" | "step"
>;

type Level1SpatialWitnessSelectedIdentityProjection = {
  readonly lightEmitterCount: number;
  readonly dimLightEmitterCount: number;
  readonly retainedLightIdentityCount: number;
  readonly projectedIllumination: BattleIllumination;
  readonly ordinarySightObscurement: BattleSightObscurement;
  readonly darkvisionSightObscurement: BattleSightObscurement;
  readonly mismatchedWitnessIllumination: BattleIllumination;
  readonly obscurementZoneCount: number;
  readonly casterConcentrating: boolean;
  readonly magicActionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly lastResult: "init" | "dancingLightsMovableDimLight";
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly Level1SpatialWitnessSelectedIdentityDriverAction[];
  readonly expected: Level1SpatialWitnessSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "level1-spatial-witness";
  readonly unitId: "dancing_lights";
  readonly actions: readonly Level1SpatialWitnessSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type BonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionSpell" }
  >;
};
type SpellLightEmitter = Extract<
  BattleLightEmitter,
  { readonly kind: "spellLightEmitter" }
>;
type DancingLightAttachment = Extract<
  SpellLightEmitter["attachment"],
  { readonly kind: "dancingLight" }
>;
type DancingLightEmitter = SpellLightEmitter & {
  readonly attachment: DancingLightAttachment;
};

const dancingLightsUnitId = "dancing_lights";
const casterId = combatantId("level1-spatial-witness-dancing-lights-caster");
const observerId = combatantId("level1-spatial-witness-dancing-lights-observer");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
const dancingLightsDimLightRadiusFeet = movementFeet(10);
const dancingLightsSiblingSpacingFeet = movementFeet(10);
const dancingLightsMoveDistanceFeet = movementFeet(10);
const darkvisionWitnessRangeFeet = movementFeet(60);

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Level 1 spatial witness selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "level1-spatial-witness",
    unitId: "dancing_lights",
    actions: ["doDancingLightsMovableDimLight"],
    sequences: [
      {
        name: "table-witnessed-lights-move-and-project-dim-light",
        actions: ["doDancingLightsMovableDimLight"],
        expected: expectedProjection({
          lightEmitterCount: 2,
          dimLightEmitterCount: 2,
          retainedLightIdentityCount: 2,
          projectedIllumination: "dimLight",
          ordinarySightObscurement: "lightlyObscured",
          darkvisionSightObscurement: "unobscured",
          casterConcentrating: true,
          magicActionAvailable: false,
          bonusActionAvailable: false,
          lastResult: "dancingLightsMovableDimLight",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Level 1 spatial witness selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<Level1SpatialWitnessSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createLevel1SpatialWitnessSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing level 1 spatial witness selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Level 1 spatial witness selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays level 1 spatial witness selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-level1-spatial-witness-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createLevel1SpatialWitnessSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: level1SpatialWitnessSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createLevel1SpatialWitnessSelectedIdentityDriver() {
  return defineDriver(
    level1SpatialWitnessSelectedIdentityDriverSchema,
    () => {
      let state = dancingLightsBattle();
      let retainedLightIdentityCount = 0;
      let lastResult: Level1SpatialWitnessSelectedIdentityProjection["lastResult"] =
        "init";

      function reset(): void {
        state = dancingLightsBattle();
        retainedLightIdentityCount = 0;
        lastResult = "init";
      }

      return {
        init: reset,
        doDancingLightsMovableDimLight: () => {
          state = dancingLightsBattle();
          const castAct = dancingLightsSeparateCastAct(state);
          const cast = resolveBattleSubject({
            state,
            subject: castAct.subject,
            fills: [
              separateCastPlacement(
                requireHole(castAct.initialHoles, "dancingLightsPlacement"),
              ),
            ],
          });
          if (cast.tag !== "resolved") {
            throw new Error(
              `Expected Dancing Lights cast to resolve, got ${cast.tag}.`,
            );
          }

          const beforeMoveEmitters = dancingLightEmitters(cast.state);
          const moveAct = dancingLightsRepositionAct(cast.state);
          const moved = resolveBattleSubject({
            state: cast.state,
            subject: moveAct.subject,
            fills: [
              separateRepositionPlacement(
                requireHole(moveAct.initialHoles, "dancingLightsPlacement"),
                beforeMoveEmitters,
              ),
            ],
          });
          if (moved.tag !== "resolved") {
            throw new Error(
              `Expected Dancing Lights reposition to resolve, got ${moved.tag}.`,
            );
          }

          const afterMoveEmitters = dancingLightEmitters(moved.state);
          retainedLightIdentityCount = retainedIdentityCount(
            beforeMoveEmitters,
            afterMoveEmitters,
          );
          state = moved.state;
          lastResult = "dancingLightsMovableDimLight";
        },
        step: () => {},
        getState: () =>
          projectLevel1SpatialWitnessSelectedIdentityState(
            state,
            retainedLightIdentityCount,
            lastResult,
          ),
      };
    },
  );
}

function expectedProjection(
  overrides: Partial<Level1SpatialWitnessSelectedIdentityProjection> = {},
): Level1SpatialWitnessSelectedIdentityProjection {
  return {
    lightEmitterCount: 0,
    dimLightEmitterCount: 0,
    retainedLightIdentityCount: 0,
    projectedIllumination: "darkness",
    ordinarySightObscurement: "heavilyObscured",
    darkvisionSightObscurement: "lightlyObscured",
    mismatchedWitnessIllumination: "darkness",
    obscurementZoneCount: 0,
    casterConcentrating: false,
    magicActionAvailable: true,
    bonusActionAvailable: true,
    lastResult: "init",
    ...overrides,
  };
}

function dancingLightsBattle(): BattleState {
  const spell = spellRecord(dancingLightsUnitId);
  const result = startBattle({
    battleId: battleId("level1-spatial-witness-selected-identity"),
    combatants: [
      spatialWitnessCreature({
        combatantId: casterId,
        displayName: "Dancing Lights caster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [spell],
          preparedSpells: [],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [],
        },
      }),
      spatialWitnessCreature({
        combatantId: observerId,
        displayName: "Spatial witness observer",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function spatialWitnessCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [
        {
          className: input.spellcasting?.sourceClassName ?? "wizard",
          level: 1,
        },
      ],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
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
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function spellRecord(spellUnitId: typeof dancingLightsUnitId): SpellRecord {
  const unit = unitLibrary.requireUnit(spellUnitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${spellUnitId} to be a Spell.`);
  }
  return unit;
}

function dancingLightsSeparateCastAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === dancingLightsUnitId &&
      candidate.subject.invocation.procedure === "dancingLightsSeparateCast",
  );
  if (act === undefined) {
    throw new Error("Expected Dancing Lights separate cast action.");
  }
  return act;
}

function dancingLightsRepositionAct(state: BattleState): BonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === dancingLightsUnitId &&
      candidate.subject.invocation.procedure === "dancingLightsReposition",
  );
  if (act === undefined) {
    throw new Error("Expected Dancing Lights reposition Bonus Action.");
  }
  return act;
}

function separateCastPlacement(
  hole: Extract<BattleHole, { readonly kind: "dancingLightsPlacement" }>,
): Extract<BattleFill, { readonly kind: "dancingLightsPlacement" }> {
  return {
    kind: "dancingLightsPlacement",
    holeId: hole.holeId,
    value: {
      mode: "cast",
      form: "separateLights",
      lights: [
        {
          positionId: battleTablePositionId("level1-dancing-lights-a"),
          distanceFromCasterFeet: movementFeet(30),
          nearestSiblingDistanceFeet: dancingLightsSiblingSpacingFeet,
        },
        {
          positionId: battleTablePositionId("level1-dancing-lights-b"),
          distanceFromCasterFeet: movementFeet(35),
          nearestSiblingDistanceFeet: dancingLightsSiblingSpacingFeet,
        },
      ],
    },
  };
}

function separateRepositionPlacement(
  hole: Extract<BattleHole, { readonly kind: "dancingLightsPlacement" }>,
  emitters: readonly DancingLightEmitter[],
): Extract<BattleFill, { readonly kind: "dancingLightsPlacement" }> {
  const [firstEmitter, secondEmitter] = emitters;
  if (firstEmitter === undefined || secondEmitter === undefined) {
    throw new Error("Expected two Dancing Lights emitters to reposition.");
  }
  return {
    kind: "dancingLightsPlacement",
    holeId: hole.holeId,
    value: {
      mode: "reposition",
      form: "separateLights",
      lights: [
        {
          lightId: firstEmitter.attachment.lightId,
          positionId: battleTablePositionId("level1-dancing-lights-a-moved"),
          distanceFromCasterFeet: movementFeet(40),
          moveDistanceFeet: dancingLightsMoveDistanceFeet,
          nearestSiblingDistanceFeet: dancingLightsSiblingSpacingFeet,
        },
        {
          lightId: secondEmitter.attachment.lightId,
          positionId: battleTablePositionId("level1-dancing-lights-b-moved"),
          distanceFromCasterFeet: movementFeet(45),
          moveDistanceFeet: dancingLightsMoveDistanceFeet,
          nearestSiblingDistanceFeet: dancingLightsSiblingSpacingFeet,
        },
      ],
    },
  };
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

function projectLevel1SpatialWitnessSelectedIdentityState(
  state: BattleState,
  retainedLightIdentityCount: number,
  lastResult: Level1SpatialWitnessSelectedIdentityProjection["lastResult"],
): Level1SpatialWitnessSelectedIdentityProjection {
  const snapshot = snapshotBattle(state);
  const emitters = dancingLightEmitters(state);
  const projectedIllumination = battleIlluminationFromLightEmitters(
    snapshot.lightEmitters,
    matchingProjectionFacts(emitters),
  );
  const mismatchedWitnessIllumination = battleIlluminationFromLightEmitters(
    snapshot.lightEmitters,
    mismatchedProjectionFacts(emitters),
  );
  return {
    lightEmitterCount: emitters.length,
    dimLightEmitterCount: emitters.filter(
      (emitter) =>
        emitter.emission.kind === "dim" &&
        emitter.emission.radiusFeet === dancingLightsDimLightRadiusFeet,
    ).length,
    retainedLightIdentityCount,
    projectedIllumination,
    ordinarySightObscurement: battleSightObscurement(projectedIllumination),
    darkvisionSightObscurement: battleSightObscurement(
      projectedIllumination,
      {
        kind: "darkvision",
        rangeFeet: darkvisionWitnessRangeFeet,
        distanceFeet: dancingLightsDimLightRadiusFeet,
      },
    ),
    mismatchedWitnessIllumination,
    obscurementZoneCount: battleObscurementZones(state).length,
    casterConcentrating:
      state.combatants.get(casterId)?.concentration?.sourceSpellId ===
      dancingLightsUnitId,
    magicActionAvailable: canSpendAction(state.currentTurnResources, "magic"),
    bonusActionAvailable: canSpendBonusAction(state.currentTurnResources),
    lastResult,
  };
}

function dancingLightEmitters(
  state: BattleState,
): readonly DancingLightEmitter[] {
  return snapshotBattle(state).lightEmitters.filter(
    (emitter): emitter is DancingLightEmitter =>
      emitter.kind === "spellLightEmitter" &&
      emitter.sourceSpellId === dancingLightsUnitId &&
      emitter.sourceCombatantId === casterId &&
      emitter.attachment.kind === "dancingLight",
  );
}

function matchingProjectionFacts(
  emitters: readonly DancingLightEmitter[],
): readonly BattleLightEmitterProjectionFact[] {
  const firstEmitter = emitters[0];
  return firstEmitter === undefined
    ? []
    : [
        projectionFactForEmitter(
          firstEmitter,
          firstEmitter.attachment.positionId,
        ),
      ];
}

function mismatchedProjectionFacts(
  emitters: readonly DancingLightEmitter[],
): readonly BattleLightEmitterProjectionFact[] {
  const firstEmitter = emitters[0];
  return firstEmitter === undefined
    ? []
    : [
        projectionFactForEmitter(
          firstEmitter,
          battleTablePositionId("level1-dancing-lights-stale"),
        ),
      ];
}

function projectionFactForEmitter(
  emitter: DancingLightEmitter,
  positionId: DancingLightAttachment["positionId"],
): BattleLightEmitterProjectionFact {
  return {
    kind: "dancingLight",
    lightId: emitter.attachment.lightId,
    positionId,
    form: emitter.attachment.form,
    distanceFeet: dancingLightsDimLightRadiusFeet,
  };
}

function retainedIdentityCount(
  beforeMove: readonly DancingLightEmitter[],
  afterMove: readonly DancingLightEmitter[],
): number {
  const beforeLightIds = new Set(
    beforeMove.map((emitter) => emitter.attachment.lightId),
  );
  return afterMove.filter((emitter) =>
    beforeLightIds.has(emitter.attachment.lightId),
  ).length;
}

function normalizeLevel1SpatialWitnessSelectedIdentityQuintState(
  raw: unknown,
): Level1SpatialWitnessSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    lightEmitterCount: numberFromQuintInt(
      state["qLightEmitterCount"],
      "qLightEmitterCount",
    ),
    dimLightEmitterCount: numberFromQuintInt(
      state["qDimLightEmitterCount"],
      "qDimLightEmitterCount",
    ),
    retainedLightIdentityCount: numberFromQuintInt(
      state["qRetainedLightIdentityCount"],
      "qRetainedLightIdentityCount",
    ),
    projectedIllumination: mbtIllumination(state["qProjectedIllumination"]),
    ordinarySightObscurement: mbtSightObscurement(
      state["qOrdinarySightObscurement"],
    ),
    darkvisionSightObscurement: mbtSightObscurement(
      state["qDarkvisionSightObscurement"],
    ),
    mismatchedWitnessIllumination: mbtIllumination(
      state["qMismatchedWitnessIllumination"],
    ),
    obscurementZoneCount: numberFromQuintInt(
      state["qObscurementZoneCount"],
      "qObscurementZoneCount",
    ),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    magicActionAvailable: booleanField(state, "qMagicActionAvailable"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    lastResult: mbtLastResult(state["qLastResult"]),
  };
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function mbtIllumination(raw: unknown): BattleIllumination {
  if (raw === "brightLight" || raw === "dimLight" || raw === "darkness") {
    return raw;
  }
  throw new Error(`Unexpected illumination ${String(raw)}.`);
}

function mbtSightObscurement(raw: unknown): BattleSightObscurement {
  if (
    raw === "unobscured" ||
    raw === "lightlyObscured" ||
    raw === "heavilyObscured"
  ) {
    return raw;
  }
  throw new Error(`Unexpected sight obscurement ${String(raw)}.`);
}

function mbtLastResult(
  raw: unknown,
): Level1SpatialWitnessSelectedIdentityProjection["lastResult"] {
  if (raw === "init" || raw === "dancingLightsMovableDimLight") {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const level1SpatialWitnessSelectedIdentityStateCheck = stateCheck(
  normalizeLevel1SpatialWitnessSelectedIdentityQuintState,
  (
    spec: Level1SpatialWitnessSelectedIdentityProjection,
    impl: Level1SpatialWitnessSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
