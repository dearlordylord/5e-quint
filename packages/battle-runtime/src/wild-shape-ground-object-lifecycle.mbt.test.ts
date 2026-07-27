import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it } from "vitest";

import {
  battleActDruidWildShapePresentation,
  battleActSpellPresentation,
} from "./battle-act-composition.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintField,
  quintStateRecord,
  quintVariantTag,
  quintVariantValue,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleId,
  battleObjectId,
  battleTablePositionId,
  characterSeed,
  combatantId,
  requireNeedsHoles,
  requireResolved,
  resolveBattleSubject,
  spellRecord,
  startBattleSessionRight,
  statBlockCatalog,
  testCharacterWeaponAttackForUnit,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import {
  activeDruidWildShapeEffect,
  applyBattleHeldWeaponPickup,
  discoverBattleActs,
  type BattleFill,
  type BattleRuntimeSession,
} from "./index.ts";

// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// RAW trace:
// - .references/srd-5.2.1/Classes/Druid.md#Level 2: Wild Shape, Objects:
//   equipment can fall in the space, merge into the form, or be worn.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shillelagh:
//   the spell requires a Club or Quarterstaff the caster is holding.
// - .references/srd-5.2.1/Playing-the-Game.md#Interacting with Things:
//   picking up an object is an object interaction.
// - .references/srd-5.2.1/Equipment.md#Getting Into and Out of Armor:
//   armor has explicit donning times; pickup cannot restore it as equipped.
//   The Armor table separately requires a Utilize action to don a Shield.
// - UBIQUITOUS_LANGUAGE.md: Character Sheet, Creature, and Action Lifecycle.

const CUSTODY = {
  held: "held",
  merged: "merged",
  ground: "ground",
} as const;
type Custody = (typeof CUSTODY)[keyof typeof CUSTODY];
type GroundObjectLifecycleProjection = {
  readonly custody: Custody;
  readonly groundSource: "none" | "druidWildShape";
  readonly formActive: boolean;
  readonly shillelaghAvailable: boolean;
  readonly wildShapeUsesRemaining: number;
};

type RuntimeState = {
  readonly battle: BattleRuntimeSession;
};

const druidId = combatantId("wild-shape-ground-object-mbt-druid");
const opponentId = combatantId("wild-shape-ground-object-mbt-opponent");
const quarterstaffObjectId = battleObjectId("main:weapon_quarterstaff");
const groundPositionId = battleTablePositionId(
  "wild-shape-ground-object-mbt-position",
);
const ridingHorseId = "stat_block_riding_horse";

const driverSchema = {
  init: {},
  doFallOnWildShape: {},
  doRevertFallen: {},
  doPickupFallenWeapon: {},
  doAssumeAgainWhileFallen: {},
  doRevertFallenAgain: {},
  doPickupFallenWeaponAgain: {},
  doMergeOnWildShape: {},
  doRevertMerged: {},
  doStutter: {},
  step: {},
} as const;

describe("Wild Shape ground-object lifecycle MBT parity", () => {
  it("distinguishes merged restoration from fallen pickup", () => {
    const mergedReversion = revertForm(
      assumeForm(initialRuntimeState(), "merges"),
    );
    expect(projectRuntimeState(mergedReversion)).toMatchObject({
      custody: CUSTODY.held,
      groundSource: "none",
      shillelaghAvailable: true,
    });

    const fallenReversion = revertForm(
      assumeForm(initialRuntimeState(), "falls"),
    );
    expect(projectRuntimeState(fallenReversion)).toMatchObject({
      custody: "ground",
      groundSource: "druidWildShape",
      shillelaghAvailable: false,
    });
    expect(
      projectRuntimeState(pickUpQuarterstaff(fallenReversion)),
    ).toMatchObject({
      custody: "held",
      groundSource: "none",
      shillelaghAvailable: true,
    });

    const activeAgain = assumeFormWhileQuarterstaffIsGrounded(fallenReversion);
    expect(projectRuntimeState(activeAgain)).toMatchObject({
      custody: "ground",
      formActive: true,
      shillelaghAvailable: false,
      wildShapeUsesRemaining: 2,
    });
  });

  it(
    "keeps fallen equipment unavailable across reversion until pickup while merged equipment restores",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-wild-shape-ground-object-lifecycle.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: groundObjectLifecycleStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doFallOnWildShape: () => {
        state = assumeForm(state, "falls");
      },
      doRevertFallen: () => {
        state = revertForm(state);
      },
      doPickupFallenWeapon: () => {
        state = pickUpQuarterstaff(state);
      },
      doAssumeAgainWhileFallen: () => {
        state = assumeFormWhileQuarterstaffIsGrounded(state);
      },
      doRevertFallenAgain: () => {
        state = revertForm(state);
      },
      doPickupFallenWeaponAgain: () => {
        state = pickUpQuarterstaff(state);
      },
      doMergeOnWildShape: () => {
        state = assumeForm(state, "merges");
      },
      doRevertMerged: () => {
        state = revertForm(state);
      },
      doStutter: () => {},
      step: () => {},
      getState: () => projectRuntimeState(state),
    };
  });
}

const groundObjectLifecycleStateCheck = stateCheck(
  normalizeQuintState,
  (actual, expected) => {
    expect(actual).toEqual(expected);
    return true;
  },
);

function initialRuntimeState(): RuntimeState {
  return {
    battle: startBattleSessionRight({
      battleId: battleId("wild-shape-ground-object-lifecycle-mbt"),
      combatants: [
        characterSeed({
          combatantId: druidId,
          displayName: "Synthetic Druid",
          initiative: 20,
          classLevels: [{ className: "druid", level: 18 }],
          resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
          druidWildShapeAvailableForms: [
            statBlockCatalog.requireStatBlock(ridingHorseId),
          ],
          selectedLoadout: {
            weapon: {
              itemId: quarterstaffObjectId,
              unitId: parseSharedUnitId("weapon_quarterstaff"),
              grip: "one_handed",
            },
          },
          attack: testCharacterWeaponAttackForUnit(
            parseSharedUnitId("weapon_quarterstaff"),
          ),
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [spellRecord("shillelagh")],
            }),
            sourceClassName: "druid",
          },
        }),
        characterSeed({
          combatantId: opponentId,
          displayName: "Synthetic Opponent",
          initiative: 10,
        }),
      ],
    }),
  };
}

function assumeForm(
  state: RuntimeState,
  disposition: "falls" | "merges",
): RuntimeState {
  const battle = battleRuntimeSessionForTest({
    ...state.battle,
    state: {
      ...state.battle.state,
      currentTurnResources: {
        ...state.battle.state.currentTurnResources,
        currentHasBonusAction: true,
      },
    },
  });
  const act = discoverBattleActs(battle).find(
    (candidate) =>
      battleActDruidWildShapePresentation(candidate)?.formStatBlockId ===
      ridingHorseId,
  );
  if (act?.subject.tag !== "druidWildShape") {
    throw new Error("Expected Druid Wild Shape assume-form act.");
  }
  const needsDisposition = requireNeedsHoles(
    resolveBattleSubject({
      state: battle.state,
      subject: act.subject,
      fills: [],
    }),
  );
  const hole = needsDisposition.holes.find(
    (candidate) => candidate.kind === "wildShapeEquipmentDisposition",
  );
  if (hole === undefined) {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  const fill = {
    kind: "wildShapeEquipmentDisposition",
    holeId: hole.holeId,
    value: {
      formLimbs: { kind: "canHandleObjects" },
      choices: hole.candidates.map((item) =>
        disposition === "falls"
          ? {
              item,
              disposition,
              fallInActorSpace: {
                kind: "actorSpace" as const,
                positionId: groundPositionId,
              },
            }
          : { item, disposition },
      ),
    },
  } satisfies BattleFill;
  const resolved = requireResolved(
    resolveBattleSubject({
      state: battle.state,
      subject: act.subject,
      fills: [fill],
    }),
  );
  return {
    battle: battleRuntimeSessionForTest({
      ...battle,
      state: resolved.state,
    }),
  };
}

function revertForm(state: RuntimeState): RuntimeState {
  const battle = battleRuntimeSessionForTest({
    ...state.battle,
    state: {
      ...state.battle.state,
      currentTurnResources: {
        ...state.battle.state.currentTurnResources,
        currentHasBonusAction: true,
      },
    },
  });
  const act = discoverBattleActs(battle).find(
    (candidate) =>
      candidate.subject.tag === "druidWildShape" &&
      candidate.subject.action === "dismiss",
  );
  if (act?.subject.tag !== "druidWildShape") {
    throw new Error("Expected Druid Wild Shape dismissal act.");
  }
  const resolved = requireResolved(
    resolveBattleSubject({
      state: battle.state,
      subject: act.subject,
      fills: [],
    }),
  );
  return {
    battle: battleRuntimeSessionForTest({ ...battle, state: resolved.state }),
  };
}

function assumeFormWhileQuarterstaffIsGrounded(
  state: RuntimeState,
): RuntimeState {
  const battle = battleRuntimeSessionForTest({
    ...state.battle,
    state: {
      ...state.battle.state,
      currentTurnResources: {
        ...state.battle.state.currentTurnResources,
        currentHasBonusAction: true,
      },
    },
  });
  const act = discoverBattleActs(battle).find(
    (candidate) =>
      battleActDruidWildShapePresentation(candidate)?.formStatBlockId ===
      ridingHorseId,
  );
  if (act?.subject.tag !== "druidWildShape") {
    throw new Error("Expected second Druid Wild Shape assume-form act.");
  }
  const needsLimbWitness = resolveBattleSubject({
    state: battle.state,
    subject: act.subject,
    fills: [],
  });
  if (needsLimbWitness.tag !== "needsHoles") {
    throw new Error("Expected a second Wild Shape object-handling witness.");
  }
  const dispositionHole = needsLimbWitness.holes.find(
    (hole) => hole.kind === "wildShapeEquipmentDisposition",
  );
  if (dispositionHole === undefined) {
    throw new Error("Expected a second Wild Shape equipment disposition hole.");
  }
  expect(dispositionHole.candidates).toEqual([]);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: battle.state,
      subject: act.subject,
      fills: [
        {
          kind: "wildShapeEquipmentDisposition",
          holeId: dispositionHole.holeId,
          value: {
            formLimbs: { kind: "canHandleObjects" },
            choices: [],
          },
        },
      ],
    }),
  );
  return {
    battle: battleRuntimeSessionForTest({ ...battle, state: resolved.state }),
  };
}

function pickUpQuarterstaff(state: RuntimeState): RuntimeState {
  const result = applyBattleHeldWeaponPickup(state.battle.state, {
    interaction: {
      actorId: druidId,
      objectId: quarterstaffObjectId,
      actorSpace: {
        kind: "actorSpace",
        positionId: groundPositionId,
      },
    },
    loadoutSlot: "mainWeapon",
  });
  if (result.tag !== "applied") {
    throw new Error(result.message);
  }
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: result.state,
    }),
  };
}

function projectRuntimeState(
  state: RuntimeState,
): GroundObjectLifecycleProjection {
  const druid = state.battle.state.combatants.get(druidId);
  if (druid?.origin.kind !== "character") {
    throw new Error("Expected Druid character combatant.");
  }
  const selectedObjectId = druid.origin.selectedLoadout.weapon?.itemId;
  if (selectedObjectId === undefined) {
    throw new Error("Expected selected lifecycle weapon.");
  }
  const groundObject = state.battle.state.groundObjects
    .get(druidId)
    ?.get(selectedObjectId);
  const disposition = activeDruidWildShapeEffect(druid)?.equipmentDisposition;
  const custody =
    groundObject !== undefined
      ? "ground"
      : disposition?.some(
            (entry) =>
              entry.item.objectId === selectedObjectId &&
              entry.disposition === "merges",
          )
        ? "merged"
        : "held";
  const eligibilitySession = battleRuntimeSessionForTest({
    ...state.battle,
    state: {
      ...state.battle.state,
      currentTurnResources: {
        ...state.battle.state.currentTurnResources,
        currentHasBonusAction: true,
      },
    },
  });
  return {
    custody,
    groundSource:
      groundObject?.source.kind === "druidWildShape"
        ? "druidWildShape"
        : "none",
    formActive: activeDruidWildShapeEffect(druid) !== null,
    shillelaghAvailable: discoverBattleActs(eligibilitySession).some(
      (act) =>
        battleActSpellPresentation(act)?.invocation.spellId === "shillelagh",
    ),
    wildShapeUsesRemaining: druidWildShapeUsesRemaining(state.battle),
  };
}

function normalizeQuintState(raw: unknown): GroundObjectLifecycleProjection {
  const qState = quintField(quintStateRecord(raw), "qState");
  const lifecycleTag = quintVariantTag(qState, "qState");
  const payload = quintStateRecord(
    quintVariantValue(qState, lifecycleTag, "qState"),
  );
  const uses = decodeWildShapeUses(quintField(payload, "uses"));

  if (lifecycleTag === "EffectiveLoadout") {
    return {
      custody: "held",
      groundSource: "none",
      formActive: false,
      shillelaghAvailable: true,
      wildShapeUsesRemaining: uses,
    };
  }
  if (lifecycleTag === "MergedForm") {
    return {
      custody: CUSTODY.merged,
      groundSource: "none",
      formActive: true,
      shillelaghAvailable: false,
      wildShapeUsesRemaining: uses,
    };
  }
  if (lifecycleTag === "Grounded") {
    const formActive = quintField(payload, "formActive");
    if (typeof formActive !== "boolean") {
      throw new Error("Expected Quint grounded formActive boolean.");
    }
    return {
      custody: CUSTODY.ground,
      groundSource: "druidWildShape",
      formActive,
      shillelaghAvailable: false,
      wildShapeUsesRemaining: uses,
    };
  }
  throw new Error(`Unexpected Quint lifecycle ${lifecycleTag}.`);
}

function decodeWildShapeUses(raw: unknown): number {
  const tag = quintVariantTag(raw, "uses");
  const valueByTag: Readonly<Record<string, number>> = {
    FourUses: 4,
    ThreeUses: 3,
    TwoUses: 2,
  };
  const value = valueByTag[tag];
  if (value === undefined) {
    throw new Error(`Unexpected Quint Wild Shape uses ${tag}.`);
  }
  return value;
}

function druidWildShapeUsesRemaining(session: BattleRuntimeSession): number {
  const resourcePoolRef = session.context.characters
    .get(druidId)
    ?.resourceOwnership.find(
      (ownership) => ownership.unit.id === "druid_wild_shape",
    )?.resourcePoolRef;
  const druid = session.state.combatants.get(druidId);
  if (druid?.origin.kind !== "character") {
    throw new Error("Expected Druid character combatant.");
  }
  const resource = druid.origin.resources.find(
    (candidate) => candidate.resourcePoolRef === resourcePoolRef,
  );
  if (resource === undefined || !("usesRemaining" in resource)) {
    throw new Error("Expected Druid Wild Shape resource.");
  }
  return Number(resource.usesRemaining);
}
