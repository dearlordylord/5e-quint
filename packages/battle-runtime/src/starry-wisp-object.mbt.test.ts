import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Match } from "effect";
import { describe, expect, it } from "vitest";

import {
  armorClass,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";

import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  attackRollFill,
  damageRollFillWithGroups,
  fighterId,
  partySide,
  skeletonCreatureInit,
  startBattleRight,
  unitLibrary,
} from "./battle-runtime-test-support.ts";
import {
  battleId,
  battleObjectId,
  cantripSpellInvocationRef,
  characterId,
  discoverBattleActs,
  initiativeScore,
  objectInvisibleBenefitDenied,
  resolveBattleSubject,
  snapshotBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleLightEmitter,
  type BattleLightEmitterAttachment,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";

// Production path: Starry Wisp is admitted through the spell support profile
// selected by `cantripSpellInvocationRef`; object target and spell attack holes
// are discovered with `discoverBattleActs` from `./index.ts`; target, attack
// roll, and damage fills are submitted through `resolveBattleSubject`; the
// resulting `BattleState` mutation, object damage, Dim Light emitter, and
// Invisible-benefit denial projection are observed through `snapshotBattle` and
// production projection entrypoints.

type StarryWispObjectMbtHole =
  | "TargetChoice"
  | "ObjectTargetChoice"
  | "AttackRoll"
  | "SpellDamageRoll";
type StarryWispObjectMbtLastResult =
  | "init"
  | "needsHoles"
  | "resolved"
  | "invalid";
type StarryWispObjectMbtLastInvalidReason =
  | ""
  | "invalidFill"
  | "staleSubject"
  | "wrongActor";
type ObjectDamageMbtProjection =
  | { readonly tag: "none" }
  | {
      readonly tag: "hitPoints";
      readonly rolledDamage: number;
      readonly effectiveDamage: number;
      readonly nextHitPoints: number;
      readonly destroyed: boolean;
    };
type LightEmissionMbtProjection =
  | {
      readonly kind: "dim";
      readonly radiusFeet: number;
    }
  | {
      readonly kind: "brightAndDim";
      readonly brightRadiusFeet: number;
      readonly dimAdditionalFeet: number;
    };
type LightEmitterExpirationMbtProjection =
  | {
      readonly kind: "startOfTurn";
      readonly combatantId: string;
    }
  | {
      readonly kind: "endOfTurn";
      readonly combatantId: string;
      readonly round: number;
    }
  | {
      readonly kind: "concentration";
      readonly combatantId: string;
    }
  | {
      readonly kind: "duration";
      readonly durationTicks: number;
    }
  | {
      readonly kind: "untilDispelled";
    };
type LightEmitterAttachmentMbtProjection =
  | {
      readonly kind: "combatant";
      readonly combatantId: string;
    }
  | {
      readonly kind: "object";
      readonly objectId: string;
    }
  | {
      readonly kind: "dancingLight";
      readonly lightId: string;
      readonly positionId: string;
      readonly form: string;
    };
type LightEmitterMbtProjection =
  | {
      readonly kind: "spellLightEmitter";
      readonly sourceSpellId: string;
      readonly sourceCombatantId: string;
      readonly attachment: LightEmitterAttachmentMbtProjection;
      readonly emission: LightEmissionMbtProjection;
      readonly opaqueCoverInteraction:
        | { readonly kind: "blocksEmission" }
        | { readonly kind: "doesNotBlockEmission" };
      readonly expiresAt: LightEmitterExpirationMbtProjection;
    }
  | {
      readonly kind: "objectInvisibleRevealLightEmitter";
      readonly sourceSpellId: string;
      readonly sourceCombatantId: string;
      readonly objectId: string;
      readonly emission: Extract<
        LightEmissionMbtProjection,
        { readonly kind: "dim" }
      >;
      readonly expiresAt: Extract<
        LightEmitterExpirationMbtProjection,
        { readonly kind: "endOfTurn" }
      >;
    };

type StarryWispObjectMbtProjection = {
  readonly actionAvailable: boolean;
  readonly holes: readonly StarryWispObjectMbtHole[];
  readonly objectDamage: ObjectDamageMbtProjection;
  readonly lightEmitters: readonly LightEmitterMbtProjection[];
  readonly objectInvisibleBenefitDenied: boolean;
  readonly lastResult: StarryWispObjectMbtLastResult;
  readonly lastInvalidReason: StarryWispObjectMbtLastInvalidReason;
};

const starryWispObjectId = battleObjectId("starry-wisp-object");

const starryWispObjectDriverSchema = {
  init: {},
  doFillObjectTarget: {},
  doRejectObjectWithoutFact: {},
  doFillObjectAttackRollMiss: {},
  doFillObjectAttackRollHit: {},
  doFillObjectDamageLow: {},
  doFillObjectDamageHigh: {},
  doRejectStaleAfterResolved: {},
  step: {},
} as const;

function createStarryWispObjectDriver() {
  return defineDriver(starryWispObjectDriverSchema, () => {
    let state = starryWispObjectBattle();
    const subject = starryWispSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverStarryWispHoles(state, subject);
    let objectDamage: ObjectDamageMbtProjection = { tag: "none" };
    let lastResult: StarryWispObjectMbtProjection["lastResult"] = "init";
    let lastInvalidReason: StarryWispObjectMbtProjection["lastInvalidReason"] =
      "";

    function reset(): void {
      state = starryWispObjectBattle();
      fills = [];
      holes = discoverStarryWispHoles(state, subject);
      objectDamage = { tag: "none" };
      lastResult = "init";
      lastInvalidReason = "";
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        objectDamage = projectObjectDamage(result.objectDamages?.[0]);
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = starryWispObjectMbtInvalidReason(result.reason);
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = fillsWithSpellCastReactionFacts(holes, nextFills);
      recordResult(resolveBattleSubject({ state, subject, fills }));
    }

    return {
      init: reset,
      doFillObjectTarget: () => {
        const objectTarget = requireStarryWispObjectHole(
          holes,
          "objectTargetChoice",
        );
        submit([starryWispObjectTargetFill(objectTarget)]);
      },
      doRejectObjectWithoutFact: () => {
        const objectTarget = requireStarryWispObjectHole(
          holes,
          "objectTargetChoice",
        );
        submit([
          starryWispObjectTargetFill(objectTarget, { spatialFacts: [] }),
        ]);
      },
      doFillObjectAttackRollMiss: () => {
        const attackRoll = requireStarryWispObjectHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 12, naturalD20: 7 }),
        ]);
      },
      doFillObjectAttackRollHit: () => {
        const attackRoll = requireStarryWispObjectHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ]);
      },
      doFillObjectDamageLow: () => {
        const damage = requireStarryWispObjectHole(holes, "rolledDice");
        submit([...fills, damageRollFillWithGroups(damage, [[2, 2]])]);
      },
      doFillObjectDamageHigh: () => {
        const damage = requireStarryWispObjectHole(holes, "rolledDice");
        submit([...fills, damageRollFillWithGroups(damage, [[3, 3]])]);
      },
      doRejectStaleAfterResolved: () => {
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      step: () => {},
      getState: () =>
        projectStarryWispObjectMbtState({
          state,
          holes,
          objectDamage,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

const starryWispObjectStateCheck = stateCheck(
  normalizeStarryWispObjectQuintState,
  (
    spec: StarryWispObjectMbtProjection,
    impl: StarryWispObjectMbtProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

describe("Starry Wisp object MBT parity", () => {
  it("replays Starry Wisp object target attack and object damage outcomes", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-starry-wisp-object.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createStarryWispObjectDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: focusedMbtMaxSteps(4),
      stateCheck: starryWispObjectStateCheck,
    });
  }, 120_000);
});

function normalizeStarryWispObjectQuintState(
  raw: unknown,
): StarryWispObjectMbtProjection {
  const state = quintStateRecord(raw);

  const lightEmitters = lightEmittersFromQuint(state["qLightEmitters"]);
  return {
    actionAvailable: booleanField(state, "qActionAvailable"),
    holes: quintHoleSet(state["qHoles"]).map(starryWispObjectHoleName).sort(),
    objectDamage: objectDamageFromQuint(state["qObjectDamage"]),
    lightEmitters,
    objectInvisibleBenefitDenied:
      objectInvisibleBenefitDeniedFromLightEmitters(lightEmitters),
    lastResult: starryWispObjectMbtLastResult(state["qLastResult"]),
    lastInvalidReason: starryWispObjectMbtLastInvalidReason(
      state["qLastInvalidReason"],
    ),
  };
}

function projectStarryWispObjectMbtState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly objectDamage: ObjectDamageMbtProjection;
  readonly lastResult: StarryWispObjectMbtProjection["lastResult"];
  readonly lastInvalidReason: StarryWispObjectMbtProjection["lastInvalidReason"];
}): StarryWispObjectMbtProjection {
  const snapshot = snapshotBattle(input.state);
  return {
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    holes: projectStarryWispObjectHoles(input.holes),
    objectDamage: input.objectDamage,
    lightEmitters: snapshot.lightEmitters
      .map(projectLightEmitter)
      .sort(compareJsonStable),
    objectInvisibleBenefitDenied: objectInvisibleBenefitDenied(
      input.state,
      starryWispObjectId,
    ),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function starryWispObjectBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-starry-wisp-object"),
    combatants: [
      starryWispCasterCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function starryWispCasterCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const unit = unitLibrary.requireUnit("starry_wisp");
  if (unit.kind !== "spell") {
    throw new Error("Expected Starry Wisp spell Unit.");
  }
  return {
    combatantId: fighterId,
    displayName: "Starry Wisp Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("starry-wisp-caster-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 5 }],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      spellcasting: {
        sourceClassName: "fighter",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [unit],
        preparedSpells: [],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    },
  };
}

function baseUnarmedStrike(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["unarmedStrike"] {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
    },
    attackAbility: "str",
    attackAbilityModifier: abilityModifier(3),
    attackBonus: attackBonus(5),
    damageAbilityModifier: abilityModifier(3),
  };
}

function starryWispSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: cantripSpellInvocationRef("starry_wisp", "spellAttackDamage"),
    mode: { tag: "cast" },
  };
}

function discoverStarryWispHoles(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.invocation.spellId === subject.invocation.spellId,
  );
  if (act == null) {
    throw new Error("Expected Starry Wisp spell act.");
  }

  return act.initialHoles;
}

type ObjectTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "objectTargetChoice" }
>;

function starryWispObjectTargetFill(
  hole: BattleHole,
  input: {
    readonly spatialFacts?: ObjectTargetChoiceFill["spatialFacts"];
  } = {},
): ObjectTargetChoiceFill {
  if (hole.kind !== "objectTargetChoice") {
    throw new Error("Expected object target choice hole.");
  }

  return {
    kind: "objectTargetChoice",
    holeId: hole.holeId,
    value: starryWispObjectId,
    spatialFacts: input.spatialFacts ?? [
      {
        kind: "spellObjectTarget",
        casterId: fighterId,
        objectId: starryWispObjectId,
        spellId: "starry_wisp",
        rangeFeet: movementFeet(60),
        armorClass: armorClass(13),
        damageDisposition: {
          kind: "hitPoints",
          hitPoints: Hp(5),
        },
      },
    ],
  };
}

function fillsWithSpellCastReactionFacts(
  holes: readonly BattleHole[],
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  const filledHoleIds = new Set(
    fills
      .filter((fill) => fill.kind === "targetSpatialFacts")
      .map((fill) => fill.holeId),
  );
  const spellCastReactionFactFills = holes.flatMap(
    (
      hole,
    ): readonly Extract<
      BattleFill,
      { readonly kind: "targetSpatialFacts" }
    >[] =>
      hole.kind === "targetSpatialFacts" && !filledHoleIds.has(hole.holeId)
        ? [
            {
              kind: "targetSpatialFacts",
              holeId: hole.holeId,
              spatialFacts: [],
            },
          ]
        : [],
  );
  return spellCastReactionFactFills.length === 0
    ? fills
    : [...fills, ...spellCastReactionFactFills];
}

function projectObjectDamage(
  damage: Extract<
    NonNullable<
      Extract<
        BattleResolutionResult,
        { readonly tag: "resolved" }
      >["objectDamages"]
    >,
    readonly unknown[]
  > extends readonly (infer ObjectDamage)[]
    ? ObjectDamage | undefined
    : undefined,
): ObjectDamageMbtProjection {
  if (damage === undefined) {
    return { tag: "none" };
  }
  if (damage.kind === "hitPoints") {
    return {
      tag: "hitPoints",
      rolledDamage: Number(damage.rolledDamage),
      effectiveDamage: Number(damage.effectiveDamage),
      nextHitPoints: Number(damage.nextHitPoints),
      destroyed: damage.destroyed,
    };
  }

  throw new Error("Starry Wisp object MBT expected hit point object damage.");
}

function projectLightEmitter(
  emitter: BattleLightEmitter,
): LightEmitterMbtProjection {
  return Match.value(emitter).pipe(
    Match.when({ kind: "spellLightEmitter" }, (spellEmitter) => ({
      kind: "spellLightEmitter" as const,
      sourceSpellId: spellEmitter.sourceSpellId,
      sourceCombatantId: spellEmitter.sourceCombatantId,
      attachment: projectLightEmitterAttachment(spellEmitter.attachment),
      emission: projectLightEmission(spellEmitter.emission),
      opaqueCoverInteraction: spellEmitter.opaqueCoverInteraction,
      expiresAt: projectLightEmitterExpiration(spellEmitter.expiresAt),
    })),
    Match.when(
      { kind: "objectInvisibleRevealLightEmitter" },
      (objectRevealEmitter) => ({
        kind: "objectInvisibleRevealLightEmitter" as const,
        sourceSpellId: objectRevealEmitter.sourceSpellId,
        sourceCombatantId: objectRevealEmitter.sourceCombatantId,
        objectId: objectRevealEmitter.objectId,
        emission: {
          kind: "dim" as const,
          radiusFeet: Number(objectRevealEmitter.emission.radiusFeet),
        },
        expiresAt: {
          kind: "endOfTurn" as const,
          combatantId: objectRevealEmitter.expiresAt.combatantId,
          round: Number(objectRevealEmitter.expiresAt.round),
        },
      }),
    ),
    Match.exhaustive,
  );
}

function projectLightEmitterAttachment(
  attachment: BattleLightEmitterAttachment,
): LightEmitterAttachmentMbtProjection {
  return Match.value(attachment).pipe(
    Match.when({ kind: "combatant" }, (combatant) => ({
      kind: "combatant" as const,
      combatantId: combatant.combatantId,
    })),
    Match.when({ kind: "object" }, (object) => ({
      kind: "object" as const,
      objectId: object.objectId,
    })),
    Match.when({ kind: "dancingLight" }, (light) => ({
      kind: "dancingLight" as const,
      lightId: light.lightId,
      positionId: light.positionId,
      form: light.form,
    })),
    Match.exhaustive,
  );
}

function projectLightEmission(
  emission: BattleLightEmitter["emission"],
): LightEmissionMbtProjection {
  return Match.value(emission).pipe(
    Match.when({ kind: "dim" }, (dim) => ({
      kind: "dim" as const,
      radiusFeet: Number(dim.radiusFeet),
    })),
    Match.when({ kind: "brightAndDim" }, (brightAndDim) => ({
      kind: "brightAndDim" as const,
      brightRadiusFeet: Number(brightAndDim.brightRadiusFeet),
      dimAdditionalFeet: Number(brightAndDim.dimAdditionalFeet),
    })),
    Match.exhaustive,
  );
}

function projectLightEmitterExpiration(
  expiration: BattleLightEmitter["expiresAt"],
): LightEmitterExpirationMbtProjection {
  return Match.value(expiration).pipe(
    Match.when({ kind: "startOfTurn" }, (startOfTurn) => ({
      kind: "startOfTurn" as const,
      combatantId: startOfTurn.combatantId,
    })),
    Match.when({ kind: "endOfTurn" }, (endOfTurn) => ({
      kind: "endOfTurn" as const,
      combatantId: endOfTurn.combatantId,
      round: Number(endOfTurn.round),
    })),
    Match.when({ kind: "concentration" }, (concentration) => ({
      kind: "concentration" as const,
      combatantId: concentration.combatantId,
    })),
    Match.when({ kind: "duration" }, (duration) => ({
      kind: "duration" as const,
      durationTicks: Number(duration.durationTicks),
    })),
    Match.when({ kind: "untilDispelled" }, () => ({
      kind: "untilDispelled" as const,
    })),
    Match.exhaustive,
  );
}

function objectDamageFromQuint(raw: unknown): ObjectDamageMbtProjection {
  const tag = quintVariantTag(raw);
  if (tag === "NoObjectDamage") {
    return { tag: "none" };
  }
  if (tag !== "SomeObjectDamage") {
    throw new Error(`Unknown Quint object damage option: ${tag}`);
  }

  const damage = quintVariantValue(raw, "SomeObjectDamage");
  if (quintVariantTag(damage) !== "ObjectHitPointDamage") {
    throw new Error("Expected Quint object hit point damage.");
  }
  const fields = quintVariantRecordValue(damage, "ObjectHitPointDamage");
  return {
    tag: "hitPoints",
    rolledDamage: numberFromQuintInt(fields["rolledDamage"], "rolledDamage"),
    effectiveDamage: numberFromQuintInt(
      fields["effectiveDamage"],
      "effectiveDamage",
    ),
    nextHitPoints: numberFromQuintInt(fields["nextHitPoints"], "nextHitPoints"),
    destroyed: booleanField(fields, "destroyed"),
  };
}

function lightEmittersFromQuint(
  raw: unknown,
): readonly LightEmitterMbtProjection[] {
  return quintSet(raw, "qLightEmitters")
    .map(lightEmitterFromQuint)
    .sort(compareJsonStable);
}

function lightEmitterFromQuint(raw: unknown): LightEmitterMbtProjection {
  const tag = quintVariantTag(raw);
  if (tag === "SpellLightEmitter") {
    const fields = quintVariantRecordValue(raw, "SpellLightEmitter");
    return {
      kind: "spellLightEmitter",
      sourceSpellId: spellIdFromQuint(fields["sourceSpell"], "sourceSpell"),
      sourceCombatantId: actorIdFromQuint(fields["source"], "source"),
      attachment: lightEmitterAttachmentFromQuint(fields["attachment"]),
      emission: lightEmissionFromQuint(fields["emission"]),
      opaqueCoverInteraction: lightEmitterOpaqueCoverInteractionFromQuint(
        fields["opaqueCoverInteraction"],
      ),
      expiresAt: lightEmitterExpirationFromQuint(fields["expiresAt"]),
    };
  }
  if (tag === "ObjectInvisibleRevealLightEmitter") {
    const fields = quintVariantRecordValue(
      raw,
      "ObjectInvisibleRevealLightEmitter",
    );
    return {
      kind: "objectInvisibleRevealLightEmitter",
      sourceSpellId: spellIdFromQuint(fields["sourceSpell"], "sourceSpell"),
      sourceCombatantId: actorIdFromQuint(fields["source"], "source"),
      objectId: objectIdFromQuint(fields["object"], "object"),
      emission: {
        kind: "dim",
        radiusFeet: numberFromQuintInt(
          fields["dimLightRadiusFeet"],
          "dimLightRadiusFeet",
        ),
      },
      expiresAt: {
        kind: "endOfTurn",
        combatantId: actorIdFromQuint(
          fields["expiresAtActor"],
          "expiresAtActor",
        ),
        round: numberFromQuintInt(fields["expiresAtRound"], "expiresAtRound"),
      },
    };
  }
  throw new Error(`Unknown Quint light emitter variant: ${tag}`);
}

function objectInvisibleBenefitDeniedFromLightEmitters(
  lightEmitters: readonly LightEmitterMbtProjection[],
): boolean {
  return lightEmitters.some(
    (emitter) =>
      emitter.kind === "objectInvisibleRevealLightEmitter" &&
      emitter.objectId === starryWispObjectId,
  );
}

function lightEmitterExpirationFromQuint(
  raw: unknown,
): LightEmitterExpirationMbtProjection {
  const tag = quintVariantTag(raw);
  if (tag === "EndOfTurnLightEmitterExpiration") {
    const fields = quintVariantRecordValue(
      raw,
      "EndOfTurnLightEmitterExpiration",
    );
    return {
      kind: "endOfTurn",
      combatantId: actorIdFromQuint(fields["actor"], "actor"),
      round: numberFromQuintInt(fields["round"], "round"),
    };
  }
  if (tag === "DurationLightEmitterExpiration") {
    const fields = quintVariantRecordValue(
      raw,
      "DurationLightEmitterExpiration",
    );
    return {
      kind: "duration",
      durationTicks: numberFromQuintInt(
        fields["durationTicks"],
        "durationTicks",
      ),
    };
  }
  if (tag === "ConcentrationLightEmitterExpiration") {
    const fields = quintVariantRecordValue(
      raw,
      "ConcentrationLightEmitterExpiration",
    );
    return {
      kind: "concentration",
      combatantId: actorIdFromQuint(fields["actor"], "actor"),
    };
  }
  if (tag === "UntilDispelledLightEmitterExpiration") {
    return { kind: "untilDispelled" };
  }

  throw new Error(`Unknown Quint light emitter expiration variant: ${tag}`);
}

function lightEmitterAttachmentFromQuint(
  raw: unknown,
): LightEmitterAttachmentMbtProjection {
  const tag = quintVariantTag(raw);
  if (tag === "CombatantLightEmitter") {
    const fields = quintVariantRecordValue(raw, "CombatantLightEmitter");
    return {
      kind: "combatant",
      combatantId: actorIdFromQuint(fields["actor"], "actor"),
    };
  }
  if (tag === "ObjectLightEmitter") {
    const fields = quintVariantRecordValue(raw, "ObjectLightEmitter");
    return {
      kind: "object",
      objectId: objectIdFromQuint(fields["object"], "object"),
    };
  }
  if (tag === "DancingLightEmitter") {
    const fields = quintVariantRecordValue(raw, "DancingLightEmitter");
    return {
      kind: "dancingLight",
      lightId: String(numberFromQuintInt(fields["light"], "light")),
      positionId: String(numberFromQuintInt(fields["position"], "position")),
      form: booleanFromQuint(fields["combined"], "combined")
        ? "combinedMediumForm"
        : "separateLights",
    };
  }

  throw new Error(`Unknown Quint light emitter attachment variant: ${tag}`);
}

function lightEmissionFromQuint(raw: unknown): LightEmissionMbtProjection {
  const tag = quintVariantTag(raw);
  if (tag === "DimLightEmission") {
    const fields = quintVariantRecordValue(raw, "DimLightEmission");
    return {
      kind: "dim",
      radiusFeet: numberFromQuintInt(fields["radiusFeet"], "radiusFeet"),
    };
  }
  if (tag === "BrightAndDimLightEmission") {
    const fields = quintVariantRecordValue(raw, "BrightAndDimLightEmission");
    return {
      kind: "brightAndDim",
      brightRadiusFeet: numberFromQuintInt(
        fields["brightRadiusFeet"],
        "brightRadiusFeet",
      ),
      dimAdditionalFeet: numberFromQuintInt(
        fields["dimAdditionalFeet"],
        "dimAdditionalFeet",
      ),
    };
  }

  throw new Error(`Unknown Quint light emission variant: ${tag}`);
}

function lightEmitterOpaqueCoverInteractionFromQuint(
  raw: unknown,
):
  | { readonly kind: "blocksEmission" }
  | { readonly kind: "doesNotBlockEmission" } {
  const tag = quintVariantTag(raw);
  if (tag === "LightEmitterBlocksOpaqueCover") {
    return { kind: "blocksEmission" };
  }
  if (tag === "LightEmitterDoesNotBlockOpaqueCover") {
    return { kind: "doesNotBlockEmission" };
  }

  throw new Error(
    `Unknown Quint light emitter opaque-cover interaction variant: ${tag}`,
  );
}

function actorIdFromQuint(raw: unknown, field: string): string {
  const tag = quintVariantTag(raw);
  if (tag === "Fighter") {
    return fighterId;
  }

  throw new Error(`Unknown Quint actor field ${field}: ${tag}`);
}

function spellIdFromQuint(raw: unknown, field: string): string {
  const tag = quintVariantTag(raw);
  if (tag === "StarryWisp") {
    return "starry_wisp";
  }

  throw new Error(`Unknown Quint spell field ${field}: ${tag}`);
}

function objectIdFromQuint(raw: unknown, field: string): string {
  const tag = quintVariantTag(raw);
  if (tag === "StarryWispObjectTarget") {
    return starryWispObjectId;
  }

  throw new Error(`Unknown Quint object field ${field}: ${tag}`);
}

function projectStarryWispObjectHoles(
  holes: readonly BattleHole[],
): readonly StarryWispObjectMbtHole[] {
  return holes.flatMap(projectStarryWispObjectHole).sort();
}

function projectStarryWispObjectHole(
  hole: BattleHole,
): readonly StarryWispObjectMbtHole[] {
  if (hole.kind === "targetSpatialFacts") {
    return [];
  }
  if (hole.kind === "targetChoice") {
    return ["TargetChoice"];
  }
  if (hole.kind === "objectTargetChoice") {
    return ["ObjectTargetChoice"];
  }
  if (hole.kind === "attackRoll") {
    return ["AttackRoll"];
  }
  if (hole.kind === "rolledDice") {
    return ["SpellDamageRoll"];
  }

  throw new Error(
    `Starry Wisp object MBT does not model ${hole.kind} holes.`,
  );
}

function requireStarryWispObjectHole<
  Kind extends BattleHole["kind"],
>(holes: readonly BattleHole[], kind: Kind): Extract<BattleHole, { kind: Kind }> {
  const hole = holes.find((candidate): candidate is Extract<
    BattleHole,
    { kind: Kind }
  > => candidate.kind === kind);
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }

  return hole;
}

function starryWispObjectHoleName(
  raw: unknown,
): StarryWispObjectMbtHole {
  const tag = quintVariantTag(raw);
  if (
    tag === "TargetChoice" ||
    tag === "ObjectTargetChoice" ||
    tag === "AttackRoll" ||
    tag === "SpellDamageRoll"
  ) {
    return tag;
  }

  throw new Error(`Unknown Quint Starry Wisp object hole variant: ${tag}`);
}

function starryWispObjectMbtLastResult(
  raw: unknown,
): StarryWispObjectMbtLastResult {
  if (
    raw === "init" ||
    raw === "needsHoles" ||
    raw === "resolved" ||
    raw === "invalid"
  ) {
    return raw;
  }

  throw new Error(`Unknown Quint last result: ${String(raw)}.`);
}

function starryWispObjectMbtLastInvalidReason(
  raw: unknown,
): StarryWispObjectMbtLastInvalidReason {
  if (
    raw === "" ||
    raw === "invalidFill" ||
    raw === "staleSubject" ||
    raw === "wrongActor"
  ) {
    return raw;
  }

  throw new Error(`Unknown Quint last invalid reason: ${String(raw)}.`);
}

function starryWispObjectMbtInvalidReason(
  reason: Extract<
    BattleResolutionResult,
    { readonly tag: "invalid" }
  >["reason"],
): StarryWispObjectMbtLastInvalidReason {
  if (
    reason === "invalidFill" ||
    reason === "staleSubject" ||
    reason === "wrongActor"
  ) {
    return reason;
  }

  throw new Error(`Unexpected Starry Wisp object invalid reason: ${reason}`);
}

function focusedMbtMaxSteps(domainMaxSteps: number): number {
  const requestedSteps = Number(process.env["MBT_STEPS"] ?? domainMaxSteps);
  return Math.min(requestedSteps, domainMaxSteps);
}

function compareJsonStable(left: unknown, right: unknown): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint state to be an object.");
  }

  return raw;
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "bigint") {
    return Number(raw);
  }

  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  return booleanFromQuint(state[field], field);
}

function booleanFromQuint(value: unknown, field: string): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  throw new Error(`Expected Quint boolean field ${field}.`);
}

function quintHoleSet(raw: unknown): readonly unknown[] {
  return quintSet(raw, "qHoles");
}

function quintSet(raw: unknown, field: string): readonly unknown[] {
  if (raw instanceof Set) {
    return [...raw];
  }

  throw new Error(`Expected Quint ${field} field to be a Set.`);
}

function quintVariantTag(raw: unknown): string {
  if (!isRecord(raw) || typeof raw["tag"] !== "string") {
    throw new Error("Expected Quint variant with tag.");
  }
  return raw["tag"];
}

function quintVariantValue(raw: unknown, tag: string): unknown {
  if (!isRecord(raw) || raw["tag"] !== tag || !("value" in raw)) {
    throw new Error(`Expected Quint ${tag} variant value.`);
  }
  return raw["value"];
}

function quintVariantRecordValue(
  raw: unknown,
  tag: string,
): Readonly<Record<string, unknown>> {
  const value = quintVariantValue(raw, tag);
  if (!isRecord(value)) {
    throw new Error(`Expected Quint ${tag} record value.`);
  }
  return value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}
