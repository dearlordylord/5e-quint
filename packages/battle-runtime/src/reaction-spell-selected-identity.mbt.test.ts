import {
  battleFrontierInterruptDecisionForState,
  battleProcedureExecutionRefForTest,
} from "./battle-runtime.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay reaction-interruption shield hellish_rebuke counterspell
// UNIT-IDENTITY-REPLAY: reaction-interruption shield doResolveShieldReactionSpellHit
// UNIT-IDENTITY-REPLAY: reaction-interruption hellish_rebuke doResolveHellishRebukeFailedSavingThrow
// UNIT-IDENTITY-REPLAY: reaction-interruption counterspell doResolveCounterspellMagicMissileCast
import { Result } from "effect";

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
import { expect, it } from "vitest";
import { resolveBattleSubject } from "./battle-runtime.test-support.ts";

import {
  battleReducerStartRouteEvent,
  battleId,
  characterId,
  combatantId,
  discoverBattleActCandidates,
  initiativeScore,
  resolveBattleInterrupt,
  snapshotBattle,
  startBattle,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type CharacterBattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleInterruptSubject,
  type BattleInterruptProcedureChoice,
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  decodeReducerRoute,
  defineDriver,
  focusedMbtMaxSteps,
  MBT_TEST_TIMEOUT_MS,
  mbtSpecPath,
  quintField,
  quintStateRecord,
  quintVariantMappedValue,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { battleInitializationIssueMessage } from "./battle-reducer/api-lifecycle.ts";

type ReactionSpellProjection = {
  readonly reactorHp: number;
  readonly triggerCreatureHp: number;
  readonly reactorArmorClass: number;
  readonly reactorReactionAvailable: boolean;
  readonly triggerCreatureFirstLevelSlotsExpended: number;
  readonly firstLevelSlotsExpended: number;
  readonly secondLevelSlotsExpended: number;
  readonly thirdLevelSlotsExpended: number;
  readonly lastResult: "init" | "resolved";
};
type NeedsHolesResult = Extract<
  BattleResolutionResult,
  { readonly tag: "needsHoles" }
>;
type StartedMagicMissile = NeedsHolesResult & {
  readonly targetAllocationFill: Extract<
    BattleFill,
    { readonly kind: "spellTargetAllocation" }
  >;
};

type ReactionSpellUnitId =
  | "shield"
  | "hellish_rebuke"
  | "spellCastInterruptionReaction";
type SrdSpellUnitId = ReactionSpellUnitId | "magic_missile";

type AttackAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
};

const reactorId = combatantId("reaction-spell-selected-identity-reactor");
const triggerCreatureId = combatantId(
  "reaction-spell-selected-identity-trigger-creature",
);
const spellCastInterruptionReactionUnitId = "spellCastInterruptionReaction";
const magicMissileUnitId = "magic_missile";
const spellCastInterruptionReactionSlotLevel = 3;
const magicMissileSlotLevel = 1;
const higherLevelMagicMissileSlotLevel = 4;
const magicMissileDartCount = 3;
const higherLevelMagicMissileDartCount = 6;

const reactionPayloadRouteReplayDriverSchema = {
  init: {},
  doRouteReactionArmorClassEffect: {},
  doRouteAfterDamageSaveDamage: {},
  doRouteSpellInterruptionEnded: {},
  doRouteSpellInterruptionResumed: {},
  step: {},
} as const;

type ReactionInterruptPayloadRouteSurface =
  | "fresh"
  | "reactionArmorClassEffect"
  | "afterDamageSaveDamage"
  | "spellInterruptionEnded"
  | "spellInterruptionResumed";
type ReplayableReactionInterruptPayloadRouteSurface = Exclude<
  ReactionInterruptPayloadRouteSurface,
  "fresh"
>;

type ReactionPayloadRouteProjection = {
  readonly surface: ReactionInterruptPayloadRouteSurface;
  readonly route: readonly ReducerRouteEvent[];
};

const reactionPayloadRouteSurfaceByQuintTag = {
  FreshRouteSurface: "fresh",
  ReactionArmorClassEffectRouteSurface: "reactionArmorClassEffect",
  AfterDamageSaveDamageRouteSurface: "afterDamageSaveDamage",
  SpellInterruptionEndedRouteSurface: "spellInterruptionEnded",
  SpellInterruptionResumedRouteSurface: "spellInterruptionResumed",
} as const satisfies Readonly<
  Record<string, ReactionInterruptPayloadRouteSurface>
>;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Reaction spell selected identity Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Reaction spell selected identity replay",
  taskId: "reaction-interruption",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-reaction-spell-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: { lastResult: { Init: "init", Resolved: "resolved" } },
  projectionSchema: {
    reactorHp: "int",
    triggerCreatureHp: "int",
    reactorArmorClass: "int",
    reactorReactionAvailable: "bool",
    triggerCreatureFirstLevelSlotsExpended: "int",
    firstLevelSlotsExpended: "int",
    secondLevelSlotsExpended: "int",
    thirdLevelSlotsExpended: "int",
    lastResult: "variant",
  },
  initialProjection: projectReactionSpellState(
    reactionSpellBattle(srdSpellRecord("shield")),
    "init",
  ),
  units: [
    {
      unitId: "shield",
      procedures: [
        {
          actionName: "doResolveShieldReactionSpellHit",
          discover: () => resolveShieldReactionSpellHit(),
        },
      ],
    },
    {
      unitId: "hellish_rebuke",
      procedures: [
        {
          actionName: "doResolveHellishRebukeFailedSavingThrow",
          discover: () => resolveHellishRebukeFailedSavingThrow(),
        },
      ],
    },
    {
      unitId: "spellCastInterruptionReaction",
      procedures: [
        {
          actionName: "doResolveCounterspellMagicMissileCast",
          discover: () => resolveCounterspellMagicMissileCast(),
        },
      ],
    },
  ],
});

it(
  "compares reaction payload public reducer routes to copied qRoute",
  async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-reaction-interrupt-payload-taxonomy.route.mbt.qnt",
      ),
      init: "init",
      step: "doRouteReactionArmorClassEffect",
      driver: createReactionPayloadRouteReplayDriver(
        "reactionArmorClassEffect",
      ),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(1),
      stateCheck: reactionPayloadRouteStateCheck,
    });
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-reaction-interrupt-payload-taxonomy.route.mbt.qnt",
      ),
      init: "init",
      step: "doRouteAfterDamageSaveDamage",
      driver: createReactionPayloadRouteReplayDriver("afterDamageSaveDamage"),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(1),
      stateCheck: reactionPayloadRouteStateCheck,
    });
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-reaction-interrupt-payload-taxonomy.route.mbt.qnt",
      ),
      init: "init",
      step: "doRouteSpellInterruptionEnded",
      driver: createReactionPayloadRouteReplayDriver("spellInterruptionEnded"),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(1),
      stateCheck: reactionPayloadRouteStateCheck,
    });
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-reaction-interrupt-payload-taxonomy.route.mbt.qnt",
      ),
      init: "init",
      step: "doRouteSpellInterruptionResumed",
      driver: createReactionPayloadRouteReplayDriver(
        "spellInterruptionResumed",
      ),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(1),
      stateCheck: reactionPayloadRouteStateCheck,
    });
  },
  MBT_TEST_TIMEOUT_MS,
);

function resolveShieldReactionSpellHit(): ReactionSpellProjection {
  const state = reactionSpellBattle(srdSpellRecord("shield"));
  const awaitingReaction = resolveAttackRollOnly({
    state,
    attackRollTotal: 14,
    includeHellishRebukeTriggerFact: false,
  });
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Shield attack hit Reaction window.");
  }
  return projectResolvedReaction(resolveShieldReactionChoice(awaitingReaction));
}

function resolveShieldReactionSpellHitRoute(): readonly BattleReducerRouteEvent[] {
  const state = reactionSpellBattle(srdSpellRecord("shield"));
  const awaitingReaction = resolveAttackRollOnly({
    state,
    attackRollTotal: 14,
    includeHellishRebukeTriggerFact: false,
  });
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Shield attack hit Reaction window.");
  }
  const resolved = resolveShieldReactionChoice(awaitingReaction);
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Shield Reaction spell to resolve.");
  }
  return routeFromPublicReducerResults(
    "Shield Reaction spell",
    awaitingReaction,
    resolved,
  );
}

function resolveHellishRebukeFailedSavingThrow(): ReactionSpellProjection {
  const state = reactionSpellBattle(srdSpellRecord("hellish_rebuke"));
  const awaitingReaction = resolveAttackRollOnly({
    state,
    attackRollTotal: 15,
    includeHellishRebukeTriggerFact: true,
  });
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
  }
  const choice = requireHellishRebukeChoice(awaitingReaction);
  const save = requireHole(choice.initialHoles, "savingThrowOutcome");
  const damage = requireHole(choice.initialHoles, "rolledDice");
  return projectResolvedReaction(
    resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: reactorId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: triggerCreatureId, succeeded: false },
              ]),
              damageRollFillWithGroups(damage, [[1, 1, 1]]),
            ],
          },
        },
      ),
    }),
  );
}

function resolveHellishRebukeFailedSavingThrowRoute(): readonly BattleReducerRouteEvent[] {
  const state = reactionSpellBattle(srdSpellRecord("hellish_rebuke"));
  const awaitingReaction = resolveAttackRollOnly({
    state,
    attackRollTotal: 15,
    includeHellishRebukeTriggerFact: true,
  });
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
  }
  const choice = requireHellishRebukeChoice(awaitingReaction);
  const save = requireHole(choice.initialHoles, "savingThrowOutcome");
  const damage = requireHole(choice.initialHoles, "rolledDice");
  const resolved = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      requireHole(awaitingReaction.holes, "interruptDecision"),
      {
        kind: "resolve",
        responderId: reactorId,
        choice: {
          kind: "castTriggeredReactionSpell",
          procedureRef: choice.subject.procedureRef,
          fills: [
            savingThrowOutcomeFill(save, [
              { targetId: triggerCreatureId, succeeded: false },
            ]),
            damageRollFillWithGroups(damage, [[1, 1, 1]]),
          ],
        },
      },
    ),
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Hellish Rebuke Reaction spell to resolve.");
  }
  return routeFromPublicReducerResults(
    "Hellish Rebuke Reaction spell",
    awaitingReaction,
    resolved,
  );
}

function resolveCounterspellMagicMissileCast(): ReactionSpellProjection {
  const state = spellCastInterruptionReactionBattle();
  const awaitingReaction = startMagicMissileWithCounterspell({ state });
  const choice = requireCounterspellChoice(awaitingReaction);
  return projectResolvedReaction(
    resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: reactorId,
          choice: {
            kind: "castTriggeredReactionSpell",
            procedureRef: choice.subject.procedureRef,
            fills: [],
          },
        },
      ),
    }),
  );
}

function resolveCounterspellHigherLevelMagicMissileEndedRoute(): readonly ReducerRouteEvent[] {
  const state = spellCastInterruptionReactionBattle({
    magicMissileSlotLevel: higherLevelMagicMissileSlotLevel,
  });
  const awaitingReaction = startMagicMissileWithCounterspell({
    state,
    slotLevel: higherLevelMagicMissileSlotLevel,
    dartCount: higherLevelMagicMissileDartCount,
  });
  const choice = requireCounterspellChoice(awaitingReaction);
  const save = requireHole(choice.initialHoles, "savingThrowOutcome");
  const resolved = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      requireHole(awaitingReaction.holes, "interruptDecision"),
      {
        kind: "resolve",
        responderId: reactorId,
        choice: {
          kind: "castTriggeredReactionSpell",
          procedureRef: choice.subject.procedureRef,
          fills: [
            savingThrowOutcomeFill(save, [
              { targetId: triggerCreatureId, succeeded: false },
            ]),
          ],
        },
      },
    ),
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Counterspell failed save to end the spell cast.");
  }
  return routeFromPublicReducerResults(
    "Counterspell ended spell",
    awaitingReaction,
    resolved,
  );
}

function resolveCounterspellHigherLevelMagicMissileResumedRoute(): readonly ReducerRouteEvent[] {
  const state = spellCastInterruptionReactionBattle({
    magicMissileSlotLevel: higherLevelMagicMissileSlotLevel,
  });
  const awaitingReaction = startMagicMissileWithCounterspell({
    state,
    slotLevel: higherLevelMagicMissileSlotLevel,
    dartCount: higherLevelMagicMissileDartCount,
  });
  const choice = requireCounterspellChoice(awaitingReaction);
  const save = requireHole(choice.initialHoles, "savingThrowOutcome");
  const resumed = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      requireHole(awaitingReaction.holes, "interruptDecision"),
      {
        kind: "resolve",
        responderId: reactorId,
        choice: {
          kind: "castTriggeredReactionSpell",
          procedureRef: choice.subject.procedureRef,
          fills: [
            savingThrowOutcomeFill(save, [
              { targetId: triggerCreatureId, succeeded: true },
            ]),
          ],
        },
      },
    ),
  });
  if (resumed.tag !== "needsHoles") {
    throw new Error("Expected Counterspell save success to resume spell cast.");
  }
  const damage = requireHole(resumed.holes, "rolledDice");
  const resolved = finishMagicMissile({
    state: resumed.state,
    subject: resumed.subject,
    targetAllocationFill: awaitingReaction.targetAllocationFill,
    damage,
    dartCount: higherLevelMagicMissileDartCount,
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected resumed Magic Missile to resolve.");
  }
  return routeFromPublicReducerResults(
    "Counterspell resumed spell",
    awaitingReaction,
    resumed,
    resolved,
  );
}

function routeFromPublicReducerResults(
  label: string,
  ...results: readonly BattleResolutionResult[]
): readonly BattleReducerRouteEvent[] {
  return [
    battleReducerStartRouteEvent(),
    ...results.flatMap((result) => requireRouteEvents(result, label)),
  ];
}

function requireRouteEvents(
  result: BattleResolutionResult,
  label: string,
): readonly BattleReducerRouteEvent[] {
  if (result.routeEvents === undefined || result.routeEvents.length === 0) {
    throw new Error(`Expected public route events for ${label}.`);
  }
  return result.routeEvents;
}

const reactionPayloadRouteBySurface = {
  reactionArmorClassEffect: resolveShieldReactionSpellHitRoute,
  afterDamageSaveDamage: resolveHellishRebukeFailedSavingThrowRoute,
  spellInterruptionEnded: resolveCounterspellHigherLevelMagicMissileEndedRoute,
  spellInterruptionResumed:
    resolveCounterspellHigherLevelMagicMissileResumedRoute,
} as const satisfies Record<
  ReplayableReactionInterruptPayloadRouteSurface,
  () => readonly ReducerRouteEvent[]
>;

function createReactionPayloadRouteReplayDriver(
  surface: ReplayableReactionInterruptPayloadRouteSurface,
) {
  return defineDriver<
    typeof reactionPayloadRouteReplayDriverSchema,
    ReactionPayloadRouteProjection
  >(reactionPayloadRouteReplayDriverSchema, () => {
    const routeProjection = (
      nextSurface: ReplayableReactionInterruptPayloadRouteSurface,
    ): ReactionPayloadRouteProjection => ({
      surface: nextSurface,
      route: reactionPayloadRouteBySurface[nextSurface](),
    });
    const recordSurface =
      (
        nextSurface: ReplayableReactionInterruptPayloadRouteSurface,
      ): (() => void) =>
      (): void => {
        projection = routeProjection(nextSurface);
      };
    const selectedProjection = (): ReactionPayloadRouteProjection =>
      routeProjection(surface);
    let projection: ReactionPayloadRouteProjection = selectedProjection();

    const reset = (): void => {
      projection = selectedProjection();
    };

    return {
      init: reset,
      doRouteReactionArmorClassEffect: recordSurface(
        "reactionArmorClassEffect",
      ),
      doRouteAfterDamageSaveDamage: recordSurface("afterDamageSaveDamage"),
      doRouteSpellInterruptionEnded: recordSurface("spellInterruptionEnded"),
      doRouteSpellInterruptionResumed: recordSurface(
        "spellInterruptionResumed",
      ),
      step: recordSurface(surface),
      getState: () => projection,
    };
  });
}

const reactionPayloadRouteStateCheck = stateCheck(
  normalizeReactionPayloadRouteQuintState,
  (
    spec: ReactionPayloadRouteProjection,
    impl: ReactionPayloadRouteProjection,
  ): boolean => {
    if (spec.surface === "fresh") {
      return true;
    }
    expect(impl).toEqual(spec);
    return true;
  },
);

function normalizeReactionPayloadRouteQuintState(
  raw: unknown,
): ReactionPayloadRouteProjection {
  const state = quintStateRecord(raw);
  return {
    surface: quintVariantMappedValue(
      quintField(state, "qSurface"),
      "qSurface",
      reactionPayloadRouteSurfaceByQuintTag,
      "reaction payload route surface",
    ),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function projectResolvedReaction(
  result: ReturnType<typeof resolveBattleInterrupt>,
): ReactionSpellProjection {
  if (result.tag !== "resolved") {
    throw new Error(`Expected Reaction spell to resolve, got ${result.tag}.`);
  }
  return projectReactionSpellState(result.state, "resolved");
}

function srdSpellRecord(unitId: SrdSpellUnitId): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function reactionSpellBattle(spell: SpellRecord): BattleState {
  const result = startBattle({
    battleId: battleId(`reaction-spell-selected-identity-${spell.id}`),
    combatants: [
      reactionSpellCreature({
        combatantId: triggerCreatureId,
        displayName: "Reaction spell trigger creature",
        initiative: 20,
      }),
      reactionSpellCreature({
        combatantId: reactorId,
        displayName: "Reaction spell caster",
        initiative: 10,
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "wizard",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [spell],
          featurePreparedSpells: [],
          spellAccesses: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [
            { spellLevel: 1, count: 2 },
            { spellLevel: 2, count: 1 },
          ],
        },
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleInitializationIssueMessage(result.failure));
  }
  return result.success.state;
}

function spellCastInterruptionReactionBattle(
  input: {
    readonly magicMissileSlotLevel?: number | undefined;
  } = {},
): BattleState {
  const triggerSpellSlotLevel =
    input.magicMissileSlotLevel ?? magicMissileSlotLevel;
  const result = startBattle({
    battleId: battleId(
      "reaction-spell-selected-identity-spellCastInterruptionReaction",
    ),
    combatants: [
      reactionSpellCreature({
        combatantId: triggerCreatureId,
        displayName: "Reaction spell trigger creature",
        initiative: 20,
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "wizard",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [srdSpellRecord(magicMissileUnitId)],
          featurePreparedSpells: [],
          spellAccesses: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: triggerSpellSlotLevel, count: 1 }],
        },
      }),
      reactionSpellCreature({
        combatantId: reactorId,
        displayName: "Reaction spell caster",
        initiative: 10,
        classLevel: 5,
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "wizard",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [srdSpellRecord(spellCastInterruptionReactionUnitId)],
          featurePreparedSpells: [],
          spellAccesses: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [
            { spellLevel: spellCastInterruptionReactionSlotLevel, count: 1 },
          ],
        },
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleInitializationIssueMessage(result.failure));
  }
  return result.success.state;
}

function reactionSpellCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly classLevel?: number | undefined;
  readonly spellcasting?: Extract<
    CharacterBattleCreatureInit,
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      ammunitionStocks: [],
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "wizard", level: input.classLevel ?? 3 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
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

function startMagicMissileWithCounterspell(input: {
  readonly state: BattleState;
  readonly slotLevel?: number | undefined;
  readonly dartCount?: number | undefined;
}): StartedMagicMissile {
  const dartCount = input.dartCount ?? magicMissileDartCount;
  const subject = magicMissileSubject(input.state);
  const targetAllocationResult = resolveBattleSubject({
    state: input.state,
    subject,
    fills: [],
  });
  if (targetAllocationResult.tag !== "needsHoles") {
    throw new Error("Expected Magic Missile target allocation hole.");
  }
  const allocation = requireHole(
    targetAllocationResult.holes,
    "spellTargetAllocation",
  );
  const targetAllocationFill = magicMissileTargetAllocationFill({
    hole: allocation,
    dartCount,
  });
  const result = resolveBattleSubject({
    state: input.state,
    subject,
    fills: [
      targetAllocationFill,
      {
        kind: "targetSpatialFacts",
        holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
        spatialFacts: [
          {
            kind: "spellCastInterruptionTriggerCasterVisibleWithinRange",
            reactorId,
            casterId: triggerCreatureId,
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String(spellCastInterruptionReactionUnitId),
            ),
            rangeFeet: movementFeet(60),
          },
        ],
      },
    ],
  });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Counterspell Reaction window.");
  }
  return { ...result, targetAllocationFill };
}

function finishMagicMissile(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly targetAllocationFill: Extract<
    BattleFill,
    { readonly kind: "spellTargetAllocation" }
  >;
  readonly damage: Extract<BattleHole, { readonly kind: "rolledDice" }>;
  readonly dartCount: number;
}): ReturnType<typeof resolveBattleSubject> {
  return resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: [
      input.targetAllocationFill,
      damageRollFillWithGroups(input.damage, [
        Array.from({ length: input.dartCount }, () => 1),
      ]),
    ],
  });
}

function magicMissileSubject(state: BattleState): BattleSubject {
  const act = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === triggerCreatureId,
  );
  if (act === undefined) {
    throw new Error("Expected bound Magic Missile action spell.");
  }
  return act.subject;
}

function magicMissileTargetAllocationFill(input: {
  readonly hole: Extract<
    BattleHole,
    { readonly kind: "spellTargetAllocation" }
  >;
  readonly dartCount: number;
}): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  return {
    kind: "spellTargetAllocation",
    holeId: input.hole.holeId,
    value: {
      allocations: [{ targetId: reactorId, count: input.dartCount }],
    },
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: triggerCreatureId,
        targetId: reactorId,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(magicMissileUnitId),
        ),
      },
    ],
  };
}

function resolveAttackRollOnly(input: {
  readonly state: BattleState;
  readonly attackRollTotal: number;
  readonly includeHellishRebukeTriggerFact: boolean;
}): ReturnType<typeof resolveBattleSubject> {
  const attackAct = discoverBattleActCandidates(input.state).find(
    (act): act is AttackAct =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === triggerCreatureId,
  );
  if (attackAct === undefined) {
    throw new Error("Expected Unarmed Strike attack act.");
  }
  const target = requireHole(attackAct.initialHoles, "targetChoice");
  const targetFilled = attackTargetFill({
    hole: target,
    includeHellishRebukeTriggerFact: input.includeHellishRebukeTriggerFact,
  });
  const awaitingAttackRoll = resolveBattleSubject({
    state: input.state,
    subject: attackAct.subject,
    fills: [targetFilled],
  });
  if (awaitingAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected attack target to request an Attack Roll.");
  }
  const attackRoll = requireHole(awaitingAttackRoll.holes, "attackRoll");
  return resolveBattleSubject({
    state: input.state,
    subject: attackAct.subject,
    fills: [
      targetFilled,
      {
        kind: "attackRoll",
        holeId: attackRoll.holeId,
        value: { total: input.attackRollTotal, naturalD20: DieRollResult(13) },
      },
    ],
  });
}

function attackTargetFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "targetChoice" }>;
  readonly includeHellishRebukeTriggerFact: boolean;
}): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (input.hole.attack === undefined) {
    throw new Error("Expected bound reaction-spell trigger attack selection.");
  }
  return {
    kind: "targetChoice",
    holeId: input.hole.holeId,
    value: reactorId,
    spatialFacts: [
      {
        kind: "attackTargetDistance",
        actorId: triggerCreatureId,
        targetId: reactorId,
        distanceFeet: movementFeet(5),
        ...input.hole.attack.selection,
      },
      ...(input.includeHellishRebukeTriggerFact
        ? [
            {
              kind: "reactionSpellDamagerVisibleWithinRange" as const,
              reactorId,
              damageSourceId: triggerCreatureId,
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                String("hellish_rebuke"),
              ),
              rangeFeet: movementFeet(60),
            },
          ]
        : []),
    ],
  };
}

type TriggeredReactionSpellChoice = Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "nestedProcedure" }
> & {
  readonly subject: Extract<
    BattleInterruptSubject,
    { readonly command: "castTriggeredReactionSpell" }
  >;
};

function resolveShieldReactionChoice(
  awaitingReaction: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >,
): ReturnType<typeof resolveBattleInterrupt> {
  const reactionChoice = battleFrontierInterruptDecisionForState(
    awaitingReaction.state,
  )?.choices.find((choice): choice is TriggeredReactionSpellChoice => {
    if (
      choice.kind !== "nestedProcedure" ||
      choice.subject.command !== "castTriggeredReactionSpell" ||
      choice.subject.reactorId !== reactorId
    )
      return false;
    return true;
  });
  if (reactionChoice === undefined) {
    throw new Error("Expected Shield Reaction spell choice.");
  }
  return resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      requireHole(awaitingReaction.holes, "interruptDecision"),
      {
        kind: "resolve",
        responderId: reactorId,
        choice: {
          kind: "castTriggeredReactionSpell",
          procedureRef: reactionChoice.subject.procedureRef,
          fills: [],
        },
      },
    ),
  });
}

function requireCounterspellChoice(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >,
): TriggeredReactionSpellChoice {
  const choice = battleFrontierInterruptDecisionForState(
    result.state,
  )?.choices.find((candidate): candidate is TriggeredReactionSpellChoice => {
    if (
      candidate.kind !== "nestedProcedure" ||
      candidate.subject.command !== "castTriggeredReactionSpell" ||
      candidate.subject.reactorId !== reactorId
    )
      return false;
    return true;
  });
  if (choice === undefined) {
    throw new Error("Expected Counterspell level 3 Reaction choice.");
  }
  return choice;
}

function requireHellishRebukeChoice(
  result: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >,
): TriggeredReactionSpellChoice {
  const choice = battleFrontierInterruptDecisionForState(
    result.state,
  )?.choices.find((candidate): candidate is TriggeredReactionSpellChoice => {
    if (
      candidate.kind !== "nestedProcedure" ||
      candidate.subject.command !== "castTriggeredReactionSpell" ||
      candidate.subject.reactorId !== reactorId
    )
      return false;
    return true;
  });
  if (choice === undefined) {
    throw new Error("Expected Hellish Rebuke level 2 Reaction choice.");
  }
  return choice;
}

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
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
    value: { outcomes },
  };
}

function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      rolledDiceGroup(firstGroup),
      ...restGroups.map((group) => rolledDiceGroup(group)),
    ],
  };
}

function rolledDiceGroup(
  group: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [firstResult, ...restResults] = group;
  if (firstResult === undefined) {
    throw new Error("Expected at least one die roll result.");
  }
  return {
    results: [DieRollResult(firstResult), ...restResults.map(DieRollResult)],
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

function projectReactionSpellState(
  state: BattleState,
  lastResult: ReactionSpellProjection["lastResult"],
): ReactionSpellProjection {
  const snapshot = snapshotBattle(state);
  const reactor = snapshot.combatants.find(
    (combatant) => combatant.combatantId === reactorId,
  );
  const triggerCreature = snapshot.combatants.find(
    (combatant) => combatant.combatantId === triggerCreatureId,
  );
  if (reactor === undefined || triggerCreature === undefined) {
    throw new Error("Expected Reaction spell selected identity combatants.");
  }
  return {
    reactorHp: reactor.hp,
    triggerCreatureHp: triggerCreature.hp,
    reactorArmorClass: reactor.armorClass,
    reactorReactionAvailable: reactor.reactionAvailable,
    triggerCreatureFirstLevelSlotsExpended: expendedSlotsForSpellLevel(
      state,
      triggerCreatureId,
      1,
    ),
    firstLevelSlotsExpended: expendedSlotsForSpellLevel(state, reactorId, 1),
    secondLevelSlotsExpended: expendedSlotsForSpellLevel(state, reactorId, 2),
    thirdLevelSlotsExpended: expendedSlotsForSpellLevel(state, reactorId, 3),
    lastResult,
  };
}

function expendedSlotsForSpellLevel(
  state: BattleState,
  candidateId: CombatantId,
  spellLevel: number,
): number {
  const combatant = state.combatants.get(candidateId);
  if (combatant?.origin.kind !== "character") {
    throw new Error("Expected Reaction spell caster character origin.");
  }
  return (
    combatant.origin.spellcasting?.spellSlots.find(
      (slot) => slot.spellLevel === spellLevel,
    )?.expended ?? 0
  );
}
