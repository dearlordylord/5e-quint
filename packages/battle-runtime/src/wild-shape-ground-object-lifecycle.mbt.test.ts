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
const LIFECYCLE_OBJECT_KIND = {
  weapon: "weapon",
  armor: "armor",
  shield: "shield",
} as const;
type Custody = (typeof CUSTODY)[keyof typeof CUSTODY];
type LifecycleObjectKind =
  (typeof LIFECYCLE_OBJECT_KIND)[keyof typeof LIFECYCLE_OBJECT_KIND];
type GroundObjectLifecycleProjection = {
  readonly custody: Custody;
  readonly objectKind: LifecycleObjectKind;
  readonly groundSource: "none" | "druidWildShape";
  readonly formActive: boolean;
  readonly shillelaghAvailable: boolean;
  readonly wildShapeUsesRemaining: number;
};

type RuntimeState = {
  readonly battle: BattleRuntimeSession;
  readonly lifecycleObject:
    | {
        readonly kind: "weapon";
        readonly objectId: typeof quarterstaffObjectId;
      }
    | { readonly kind: "armor"; readonly objectId: typeof chainMailObjectId }
    | { readonly kind: "shield"; readonly objectId: typeof shieldObjectId };
};

const druidId = combatantId("wild-shape-ground-object-mbt-druid");
const opponentId = combatantId("wild-shape-ground-object-mbt-opponent");
const quarterstaffObjectId = battleObjectId("main:weapon_quarterstaff");
const chainMailObjectId = battleObjectId("armor:equipment_chain_mail");
const shieldObjectId = battleObjectId("shield:equipment_shield");
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
  doFallArmorAndRevert: {},
  doRejectArmorHeldWeaponPickup: {},
  doFallShieldAndRevert: {},
  doRejectShieldHeldWeaponPickup: {},
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

    const armorReversion = revertForm(
      assumeForm(initialRuntimeState("armor"), "falls"),
    );
    expect(
      projectRuntimeState(rejectNonWeaponHeldWeaponPickup(armorReversion)),
    ).toMatchObject({
      custody: "ground",
      formActive: false,
      shillelaghAvailable: false,
    });

    const shieldReversion = revertForm(
      assumeForm(initialRuntimeState("shield"), "falls"),
    );
    expect(
      projectRuntimeState(rejectNonWeaponHeldWeaponPickup(shieldReversion)),
    ).toMatchObject({
      custody: "ground",
      objectKind: "shield",
      formActive: false,
      shillelaghAvailable: false,
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
      doFallArmorAndRevert: () => {
        state = revertForm(assumeForm(initialRuntimeState("armor"), "falls"));
      },
      doRejectArmorHeldWeaponPickup: () => {
        state = rejectNonWeaponHeldWeaponPickup(state);
      },
      doFallShieldAndRevert: () => {
        state = revertForm(assumeForm(initialRuntimeState("shield"), "falls"));
      },
      doRejectShieldHeldWeaponPickup: () => {
        state = rejectNonWeaponHeldWeaponPickup(state);
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

function initialRuntimeState(
  loadoutKind: LifecycleObjectKind = "weapon",
): RuntimeState {
  const lifecycleObject = {
    weapon: { kind: "weapon", objectId: quarterstaffObjectId },
    armor: { kind: "armor", objectId: chainMailObjectId },
    shield: { kind: "shield", objectId: shieldObjectId },
  } as const satisfies Readonly<
    Record<LifecycleObjectKind, RuntimeState["lifecycleObject"]>
  >;
  return {
    lifecycleObject: lifecycleObject[loadoutKind],
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
          selectedLoadout:
            loadoutKind === "weapon"
              ? {
                  weapon: {
                    itemId: quarterstaffObjectId,
                    unitId: parseSharedUnitId("weapon_quarterstaff"),
                    grip: "one_handed",
                  },
                }
              : loadoutKind === "armor"
                ? {
                    armor: {
                      itemId: chainMailObjectId,
                      unitId: parseSharedUnitId("equipment_chain_mail"),
                    },
                  }
                : {
                    shield: {
                      itemId: shieldObjectId,
                      unitId: parseSharedUnitId("equipment_shield"),
                    },
                  },
          ...(loadoutKind === "weapon"
            ? {
                attack: testCharacterWeaponAttackForUnit(
                  parseSharedUnitId("weapon_quarterstaff"),
                ),
              }
            : {}),
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
    lifecycleObject: state.lifecycleObject,
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
    lifecycleObject: state.lifecycleObject,
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
    lifecycleObject: state.lifecycleObject,
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
    lifecycleObject: state.lifecycleObject,
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: result.state,
    }),
  };
}

function rejectNonWeaponHeldWeaponPickup(state: RuntimeState): RuntimeState {
  if (state.lifecycleObject.kind === "weapon") {
    throw new Error("Expected an armor or Shield lifecycle object.");
  }
  const result = applyBattleHeldWeaponPickup(state.battle.state, {
    interaction: {
      actorId: druidId,
      objectId: state.lifecycleObject.objectId,
      actorSpace: {
        kind: "actorSpace",
        positionId: groundPositionId,
      },
    },
    loadoutSlot: "mainWeapon",
  });
  expect(result).toMatchObject({
    tag: "invalid",
    reason: "selectedLoadoutMismatch",
  });
  return state;
}

function projectRuntimeState(
  state: RuntimeState,
): GroundObjectLifecycleProjection {
  const druid = state.battle.state.combatants.get(druidId);
  if (druid?.origin.kind !== "character") {
    throw new Error("Expected Druid character combatant.");
  }
  const selectedObjectId = state.lifecycleObject.objectId;
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
    objectKind: state.lifecycleObject.kind,
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
  const objectKind = decodeLifecycleObjectKind(
    quintField(payload, "objectKind"),
  );
  const uses = decodeWildShapeUses(quintField(payload, "uses"));

  if (lifecycleTag === "EffectiveLoadout") {
    return {
      custody: "held",
      objectKind,
      groundSource: "none",
      formActive: false,
      shillelaghAvailable: objectKind === "weapon",
      wildShapeUsesRemaining: uses,
    };
  }
  if (lifecycleTag === "MergedForm") {
    return {
      custody: CUSTODY.merged,
      objectKind,
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
      objectKind,
      groundSource: "druidWildShape",
      formActive,
      shillelaghAvailable: false,
      wildShapeUsesRemaining: uses,
    };
  }
  throw new Error(`Unexpected Quint lifecycle ${lifecycleTag}.`);
}

function decodeLifecycleObjectKind(raw: unknown): LifecycleObjectKind {
  const tag = quintVariantTag(raw, "objectKind");
  const valueByTag = {
    Weapon: LIFECYCLE_OBJECT_KIND.weapon,
    Armor: LIFECYCLE_OBJECT_KIND.armor,
    Shield: LIFECYCLE_OBJECT_KIND.shield,
  } as const satisfies Readonly<Record<string, LifecycleObjectKind>>;
  const value = valueByTag[tag as keyof typeof valueByTag];
  if (value === undefined) {
    throw new Error(`Unexpected Quint lifecycle object kind ${tag}.`);
  }
  return value;
}

function decodeWildShapeUses(raw: unknown): number {
  const tag = quintVariantTag(raw, "uses");
  const valueByTag = {
    FourUses: 4,
    ThreeUses: 3,
    TwoUses: 2,
  } as const;
  const value = valueByTag[tag as keyof typeof valueByTag];
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
