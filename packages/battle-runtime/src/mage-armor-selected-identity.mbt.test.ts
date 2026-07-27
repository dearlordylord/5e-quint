import { resolveBattleSubject } from "./battle-runtime-test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1H-MAGE-ARMOR mage_armor
// UNIT-IDENTITY-REPLAY: L1H-MAGE-ARMOR mage_armor doDiscoverMageArmorUnarmoredSelfTarget doRejectMageArmorArmoredTarget doResolveMageArmorBaseArmorClassProjection doExpireMageArmorDuration
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  abilityModifier as armorAbilityModifier,
  currentArmorClass,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
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

import { activeEffectArmorClass } from "./battle-reducer/creature-state.ts";
import { tickDurationEffects } from "./battle-reducer/turn-end-movement.ts";
import {
  mbtSpecPath,
  spellBaseArmorClassEffectRouteProjection,
} from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import {
  battleId,
  battleReducerStartRouteEvent,
  characterId,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleCreatureInit,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type BattleProcedureExecutionRef,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

type MageArmorSelectedIdentityLastResult =
  | "init"
  | "discovered"
  | "armoredRejected"
  | "resolved"
  | "durationExpired";
type MageArmorSelectedIdentityProjection = {
  readonly selfTargetAdmitted: boolean;
  readonly armoredTargetRejected: boolean;
  readonly mageArmorEffectPresent: boolean;
  readonly storedArmorBaseStillUnarmored: boolean;
  readonly projectedBaseIsMageArmor: boolean;
  readonly armorClass: number;
  readonly mageArmorDurationTicks: number;
  readonly level1SlotsExpended: number;
  readonly actionAvailable: boolean;
  readonly lastResult: MageArmorSelectedIdentityLastResult;
};

type ArmorClassState = ReturnType<typeof defaultArmorClassState>;
type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type ResolvedBattleResult = Extract<
  BattleResolutionResult,
  { readonly tag: "resolved" }
>;
type MageArmorDurationEffect = Extract<
  BattleActiveEffect,
  {
    readonly kind: "spellBaseArmorClass";
    readonly expiresAt: { readonly kind: "duration" };
  }
>;

const mageArmorUnitId = "mage_armor";
const defaultUnarmoredBaseArmorClass = 10;
const mageArmorBaseArmorClass = 13;
const mageArmorDexModifier = 2;
const initialArmorClass = defaultUnarmoredBaseArmorClass + mageArmorDexModifier;
const casterId = combatantId("mage-armor-selected-identity-caster");
const armoredTargetId = combatantId(
  "mage-armor-selected-identity-armored-target",
);

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Mage Armor selected identity Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const MAGE_ARMOR_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  Discovered: "discovered",
  ArmoredRejected: "armoredRejected",
  Resolved: "resolved",
  DurationExpired: "durationExpired",
} as const satisfies Readonly<
  Record<string, MageArmorSelectedIdentityLastResult>
>;

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Mage Armor selected identity replay",
  taskId: "L1H-MAGE-ARMOR",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-mage-armor-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: MAGE_ARMOR_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: {
    selfTargetAdmitted: "bool",
    armoredTargetRejected: "bool",
    mageArmorEffectPresent: "bool",
    storedArmorBaseStillUnarmored: "bool",
    projectedBaseIsMageArmor: "bool",
    armorClass: "int",
    mageArmorDurationTicks: "int",
    level1SlotsExpended: "int",
    actionAvailable: "bool",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: mageArmorUnitId,
      procedures: [
        {
          actionName: "doDiscoverMageArmorUnarmoredSelfTarget",
          discover: () => projectInitialBattle("discovered"),
        },
        {
          actionName: "doRejectMageArmorArmoredTarget",
          discover: projectArmoredTargetRejection,
        },
        {
          actionName: "doResolveMageArmorBaseArmorClassProjection",
          discover: () =>
            projectResolvedBattle(resolveMageArmorSelf(), "resolved"),
        },
        {
          actionName: "doExpireMageArmorDuration",
          discover: projectExpiredDurationBattle,
        },
      ],
    },
  ],
});

describe("Mage Armor selected identity public reducer route replay", () => {
  it("observes spell base Armor Class qRoute through public reducer entrypoints", () => {
    const projectionRoute = replayMageArmorBaseArmorClassProjectionRoute();
    const admissionRoute = spellBaseArmorClassEffectRouteProjection(
      "doRouteUnarmoredTargetAdmission",
    );
    expect(projectionRoute.slice(0, admissionRoute.length)).toEqual(
      admissionRoute,
    );
    expect(replayMageArmorArmoredTargetRejectionRoute()).toEqual(
      spellBaseArmorClassEffectRouteProjection("doRouteArmoredTargetRejection"),
    );
    expect(projectionRoute).toEqual(
      spellBaseArmorClassEffectRouteProjection(
        "doRouteBaseArmorClassProjection",
      ),
    );
    expect(replayMageArmorDurationExpiryRoute()).toEqual(
      spellBaseArmorClassEffectRouteProjection("doRouteDurationExpiry"),
    );
  });
});

function replayMageArmorBaseArmorClassProjectionRoute(): readonly BattleReducerRouteEvent[] {
  const session = mageArmorBattle();
  const state = session.state;
  const act = mageArmorAct(session);
  const target = targetChoiceHole(act.initialHoles);
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [spellTargetChoiceFill(target, casterId, act.subject.procedureRef)],
  });
  requireResolved(result);
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOfSubject(act, "Mage Armor discovery"),
    ...routeEventsOfSubject(result, "Mage Armor resolution"),
  ];
}

function replayMageArmorArmoredTargetRejectionRoute(): readonly BattleReducerRouteEvent[] {
  const session = mageArmorBattle({ includeArmoredTarget: true });
  const state = session.state;
  const act = mageArmorAct(session);
  const target = targetChoiceHole(act.initialHoles);
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellTargetChoiceFill(target, armoredTargetId, act.subject.procedureRef),
    ],
  });
  if (result.tag !== "invalid" || result.reason !== "invalidFill") {
    throw new Error(
      `Expected Mage Armor armored target rejection, got ${result.tag}.`,
    );
  }
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOfSubject(act, "Mage Armor armored target discovery"),
    ...routeEventsOfSubject(result, "Mage Armor armored target rejection"),
  ];
}

function replayMageArmorDurationExpiryRoute(): readonly BattleReducerRouteEvent[] {
  const nearlyExpired = mageArmorNearlyExpiredState(resolveMageArmorSelf());
  const expired = endTurn({ state: nearlyExpired, actorId: casterId });
  if (expired.tag !== "resolved") {
    throw new Error(`Expected Mage Armor duration expiry, got ${expired.tag}.`);
  }
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOfSubject(expired, "Mage Armor duration expiry"),
  ];
}

function routeEventsOfSubject(
  source: { readonly routeEvents?: readonly BattleReducerRouteEvent[] },
  label: string,
): readonly BattleReducerRouteEvent[] {
  const events = (source.routeEvents ?? []).filter(
    (
      event,
    ): event is Exclude<BattleReducerRouteEvent, { kind: "startBattle" }> =>
      event.kind !== "startBattle" &&
      event.subject === "spellBaseArmorClassEffect",
  );
  if (events.length === 0) {
    throw new Error(
      `Expected spellBaseArmorClassEffect public reducer route events for ${label}.`,
    );
  }
  return events;
}

function expectedProjection(
  overrides: Partial<MageArmorSelectedIdentityProjection> = {},
): MageArmorSelectedIdentityProjection {
  return {
    selfTargetAdmitted: true,
    armoredTargetRejected: false,
    mageArmorEffectPresent: false,
    storedArmorBaseStillUnarmored: true,
    projectedBaseIsMageArmor: false,
    armorClass: initialArmorClass,
    mageArmorDurationTicks: 0,
    level1SlotsExpended: 0,
    actionAvailable: true,
    lastResult: "init",
    ...overrides,
  };
}

function projectInitialBattle(
  lastResult: Extract<
    MageArmorSelectedIdentityLastResult,
    "init" | "discovered"
  >,
): MageArmorSelectedIdentityProjection {
  const session = mageArmorBattle();
  const state = session.state;
  return {
    ...projectBattleState(state),
    selfTargetAdmitted: selfTargetAdmitted(session),
    armoredTargetRejected: false,
    lastResult,
  };
}

function projectArmoredTargetRejection(): MageArmorSelectedIdentityProjection {
  const session = mageArmorBattle({ includeArmoredTarget: true });
  const state = session.state;
  const act = mageArmorAct(session);
  const target = targetChoiceHole(act.initialHoles);
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellTargetChoiceFill(target, armoredTargetId, act.subject.procedureRef),
    ],
  });
  return {
    ...projectBattleState(state),
    selfTargetAdmitted: target.choices.includes(casterId),
    armoredTargetRejected:
      result.tag === "invalid" && result.reason === "invalidFill",
    lastResult: "armoredRejected",
  };
}

function projectResolvedBattle(
  result: ResolvedBattleResult,
  lastResult: Extract<MageArmorSelectedIdentityLastResult, "resolved">,
): MageArmorSelectedIdentityProjection {
  return {
    ...projectBattleState(result.state),
    selfTargetAdmitted: true,
    armoredTargetRejected: false,
    lastResult,
  };
}

function projectExpiredDurationBattle(): MageArmorSelectedIdentityProjection {
  const nearlyExpired = mageArmorNearlyExpiredState(resolveMageArmorSelf());
  const expired = {
    ...nearlyExpired,
    combatants: tickDurationEffects(nearlyExpired.combatants).value,
  };
  return {
    ...projectBattleState(expired),
    selfTargetAdmitted: true,
    armoredTargetRejected: false,
    lastResult: "durationExpired",
  };
}

function projectBattleState(
  state: BattleState,
): Omit<
  MageArmorSelectedIdentityProjection,
  "selfTargetAdmitted" | "armoredTargetRejected" | "lastResult"
> {
  const caster = requireCombatant(state, casterId);
  const mageArmorEffect = caster.activeEffects.find(
    (effect) =>
      effect.kind === "spellBaseArmorClass" &&
      effect.sourceCombatantId === casterId,
  );
  const projectedArmorClass = activeEffectArmorClass(state, caster);
  return {
    mageArmorEffectPresent: mageArmorEffect !== undefined,
    storedArmorBaseStillUnarmored: storedArmorBaseStillUnarmored(caster),
    projectedBaseIsMageArmor: projectedBaseIsMageArmor(projectedArmorClass),
    armorClass: Number(currentArmorClass(projectedArmorClass)),
    mageArmorDurationTicks:
      mageArmorEffect?.expiresAt.kind === "duration"
        ? Number(mageArmorEffect.expiresAt.durationTicks)
        : 0,
    level1SlotsExpended: level1SlotsExpended(state, casterId),
    actionAvailable: snapshotBattle(state).turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
  };
}

function resolveMageArmorSelf(): ResolvedBattleResult {
  const session = mageArmorBattle();
  const state = session.state;
  const act = mageArmorAct(session);
  const target = targetChoiceHole(act.initialHoles);
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetChoiceFill(target, casterId, act.subject.procedureRef),
      ],
    }),
  );
}

function mageArmorNearlyExpiredState(
  result: ResolvedBattleResult,
): BattleState {
  const caster = requireCombatant(result.state, casterId);
  const activeEffects: BattleActiveEffect[] = caster.activeEffects.map(
    (effect) =>
      isMageArmorDurationEffect(effect) && effect.sourceCombatantId === casterId
        ? {
            ...effect,
            expiresAt: {
              kind: "duration" as const,
              durationTicks: elapsedTimeTicks(1),
            },
          }
        : effect,
  );
  return {
    ...result.state,
    combatants: new Map(result.state.combatants).set(casterId, {
      ...caster,
      activeEffects,
    }),
  };
}

function isMageArmorDurationEffect(
  effect: BattleActiveEffect,
): effect is MageArmorDurationEffect {
  return (
    effect.kind === "spellBaseArmorClass" &&
    effect.expiresAt.kind === "duration"
  );
}

function mageArmorBattle(
  input: {
    readonly includeArmoredTarget?: boolean;
  } = {},
): BattleRuntimeSession {
  const combatants = [
    battleCreature({
      combatantId: casterId,
      displayName: "Mage Armor Caster",
      initiative: 20,
      armorClass: unarmoredDexArmorClass(),
      spellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spellRecord()],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    }),
    ...(input.includeArmoredTarget === true
      ? [
          battleCreature({
            combatantId: armoredTargetId,
            displayName: "Armored Target",
            initiative: 10,
            armorClass: mediumArmorClassState(),
          }),
        ]
      : []),
  ];
  return startBattleRight({
    battleId: battleId("mage-armor-selected-identity"),
    combatants,
  });
}

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleRuntimeSession {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function battleCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly armorClass: ArmorClassState;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "wizard", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
      armorClass: input.armorClass,
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

function spellRecord(): SpellRecord {
  const unit = unitLibrary.requireUnit(mageArmorUnitId);
  if (unit.kind !== "spell") {
    throw new Error("Expected Mage Armor Unit to be a Spell.");
  }
  return unit;
}

function mageArmorAct(session: BattleRuntimeSession): ActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.tag === "spellSlot" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        mageArmorUnitId &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "persistentArmorEffect",
  );
  if (act === undefined) {
    throw new Error("Expected Mage Armor spell act.");
  }
  return act;
}

function targetChoiceHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "targetChoice" }> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
      candidate.kind === "targetChoice",
  );
  if (hole === undefined) {
    throw new Error("Expected Mage Armor target choice hole.");
  }
  return hole;
}

function spellTargetChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: CombatantId,
  sourceProcedureRef: BattleProcedureExecutionRef,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        sourceProcedureRef,
      },
      {
        kind: "spellTargetKnownWilling",
        casterId,
        targetId,
        sourceProcedureRef,
      },
    ],
  };
}

function unarmoredDexArmorClass(): ArmorClassState {
  return {
    ...defaultArmorClassState(),
    abilityModifiers: {
      ...defaultArmorClassState().abilityModifiers,
      dex: armorAbilityModifier(mageArmorDexModifier),
    },
  };
}

function mediumArmorClassState(): ArmorClassState {
  return {
    ...defaultArmorClassState(),
    base: {
      kind: "armor",
      category: "medium",
      formula: { kind: "medium_dex_max_2", base: 14 },
    },
  };
}

function selfTargetAdmitted(session: BattleRuntimeSession): boolean {
  return targetChoiceHole(mageArmorAct(session).initialHoles).choices.includes(
    casterId,
  );
}

function storedArmorBaseStillUnarmored(
  combatant: BattleCreatureState,
): boolean {
  return (
    combatant.armorClass.base.kind === "ability_sum" &&
    combatant.armorClass.base.source === "default_unarmored"
  );
}

function projectedBaseIsMageArmor(armorClass: ArmorClassState): boolean {
  return (
    armorClass.base.kind === "ability_sum" &&
    armorClass.base.source === "spell_base_plus_ability" &&
    Number(armorClass.base.base) === mageArmorBaseArmorClass &&
    armorClass.base.abilityModifiers.length === 1 &&
    armorClass.base.abilityModifiers[0] === "dex"
  );
}

function level1SlotsExpended(state: BattleState, actorId: CombatantId): number {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected character spellcaster.");
  }
  return (
    actor.origin.spellcasting?.spellSlots.find(
      (slot) => Number(slot.spellLevel) === 1,
    )?.expended ?? 0
  );
}

function requireCombatant(
  state: BattleState,
  combatantId: CombatantId,
): BattleCreatureState {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return combatant;
}

function requireResolved(result: BattleResolutionResult): ResolvedBattleResult {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved result, got ${result.tag}.`);
  }
  return result;
}
