// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1H-MAGE-ARMOR mage_armor
// UNIT-IDENTITY-MBT-REPLAY: L1H-MAGE-ARMOR mage_armor doDiscoverMageArmorUnarmoredSelfTarget doRejectMageArmorArmoredTarget doResolveMageArmorBaseArmorClassProjection doExpireMageArmorDuration
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  abilityModifier as armorAbilityModifier,
  currentArmorClass,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  elapsedTimeTicks,
  elapsedTimeTicksFromHours,
} from "@dnd/shared-algebras/elapsed-time-algebra";
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
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleCreatureInit,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

const mageArmorSelectedIdentityDriverSchema = {
  init: {},
  doDiscoverMageArmorUnarmoredSelfTarget: {},
  doRejectMageArmorArmoredTarget: {},
  doResolveMageArmorBaseArmorClassProjection: {},
  doExpireMageArmorDuration: {},
  step: {},
} as const;
type MageArmorSelectedIdentityDriverAction = Exclude<
  keyof typeof mageArmorSelectedIdentityDriverSchema,
  "init" | "step"
>;

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
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly MageArmorSelectedIdentityDriverAction[];
  readonly expected: MageArmorSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1H-MAGE-ARMOR";
  readonly unitId: typeof mageArmorUnitId;
  readonly actions: readonly MageArmorSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
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
const mageArmorArmorClass = mageArmorBaseArmorClass + mageArmorDexModifier;
const mageArmorDurationTicks = Number(requireElapsedHours(8));
const casterId = combatantId("mage-armor-selected-identity-caster");
const armoredTargetId = combatantId(
  "mage-armor-selected-identity-armored-target",
);
const partySide = battleCombatantSide("party");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Mage Armor selected identity Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1H-MAGE-ARMOR",
    unitId: "mage_armor",
    actions: [
      "doDiscoverMageArmorUnarmoredSelfTarget",
      "doRejectMageArmorArmoredTarget",
      "doResolveMageArmorBaseArmorClassProjection",
      "doExpireMageArmorDuration",
    ],
    sequences: [
      {
        name: "unarmored-self-target-is-admitted",
        actions: ["doDiscoverMageArmorUnarmoredSelfTarget"],
        expected: expectedProjection({ lastResult: "discovered" }),
      },
      {
        name: "armored-target-is-rejected-before-spend",
        actions: ["doRejectMageArmorArmoredTarget"],
        expected: expectedProjection({
          armoredTargetRejected: true,
          lastResult: "armoredRejected",
        }),
      },
      {
        name: "base-ac-projects-from-active-effect-not-stored-armor",
        actions: ["doResolveMageArmorBaseArmorClassProjection"],
        expected: expectedProjection({
          mageArmorEffectPresent: true,
          projectedBaseIsMageArmor: true,
          armorClass: mageArmorArmorClass,
          mageArmorDurationTicks,
          level1SlotsExpended: 1,
          actionAvailable: false,
          lastResult: "resolved",
        }),
      },
      {
        name: "timed-duration-expiry-cleans-up-ac-projection",
        actions: ["doExpireMageArmorDuration"],
        expected: expectedProjection({
          level1SlotsExpended: 1,
          actionAvailable: false,
          lastResult: "durationExpired",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Mage Armor selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<MageArmorSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createMageArmorSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Mage Armor selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Mage Armor selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Mage Armor selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-mage-armor-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createMageArmorSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: mageArmorSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createMageArmorSelectedIdentityDriver() {
  return defineDriver(mageArmorSelectedIdentityDriverSchema, () => {
    let projection = projectInitialBattle("init");

    function reset(): void {
      projection = projectInitialBattle("init");
    }

    return {
      init: reset,
      doDiscoverMageArmorUnarmoredSelfTarget: () => {
        projection = projectInitialBattle("discovered");
      },
      doRejectMageArmorArmoredTarget: () => {
        projection = projectArmoredTargetRejection();
      },
      doResolveMageArmorBaseArmorClassProjection: () => {
        projection = projectResolvedBattle(resolveMageArmorSelf(), "resolved");
      },
      doExpireMageArmorDuration: () => {
        projection = projectExpiredDurationBattle();
      },
      step: () => {},
      getState: () => projection,
    };
  });
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
  const state = mageArmorBattle();
  return {
    ...projectBattleState(state),
    selfTargetAdmitted: selfTargetAdmitted(state),
    armoredTargetRejected: false,
    lastResult,
  };
}

function projectArmoredTargetRejection(): MageArmorSelectedIdentityProjection {
  const state = mageArmorBattle({ includeArmoredTarget: true });
  const act = mageArmorAct(state);
  const target = targetChoiceHole(act.initialHoles);
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [spellTargetChoiceFill(target, armoredTargetId)],
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
    combatants: tickDurationEffects(nearlyExpired.combatants),
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
      effect.sourceSpellId === mageArmorUnitId,
  );
  const projectedArmorClass = activeEffectArmorClass(caster);
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
  const state = mageArmorBattle();
  const act = mageArmorAct(state);
  const target = targetChoiceHole(act.initialHoles);
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [spellTargetChoiceFill(target, casterId)],
    }),
  );
}

function mageArmorNearlyExpiredState(result: ResolvedBattleResult): BattleState {
  const caster = requireCombatant(result.state, casterId);
  const activeEffects: BattleActiveEffect[] = caster.activeEffects.map(
    (effect) =>
      isMageArmorDurationEffect(effect) && effect.sourceSpellId === mageArmorUnitId
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
    effect.kind === "spellBaseArmorClass" && effect.expiresAt.kind === "duration"
  );
}

function mageArmorBattle(input: {
  readonly includeArmoredTarget?: boolean;
} = {}): BattleState {
  const combatants = [
    battleCreature({
      combatantId: casterId,
      displayName: "Mage Armor Caster",
      initiative: 20,
      side: partySide,
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
            side: partySide,
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

function startBattleRight(input: Parameters<typeof startBattle>[0]): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function battleCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide;
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
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "wizard", level: 1 }],
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

function mageArmorAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      candidate.subject.invocation.spellId === mageArmorUnitId &&
      candidate.subject.invocation.procedure === "persistentArmorEffect",
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
    (candidate): candidate is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
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
        spellId: mageArmorUnitId,
      },
      {
        kind: "spellTargetKnownWilling",
        casterId,
        targetId,
        spellId: mageArmorUnitId,
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

function selfTargetAdmitted(state: BattleState): boolean {
  return targetChoiceHole(mageArmorAct(state).initialHoles).choices.includes(
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
    armorClass.base.sourceUnitId === mageArmorUnitId &&
    Number(armorClass.base.base) === mageArmorBaseArmorClass &&
    armorClass.base.abilityModifiers.length === 1 &&
    armorClass.base.abilityModifiers[0] === "dex"
  );
}

function level1SlotsExpended(
  state: BattleState,
  actorId: CombatantId,
): number {
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

function normalizeMageArmorSelectedIdentityQuintState(
  raw: unknown,
): MageArmorSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    selfTargetAdmitted: booleanField(state, "qSelfTargetAdmitted"),
    armoredTargetRejected: booleanField(state, "qArmoredTargetRejected"),
    mageArmorEffectPresent: booleanField(state, "qMageArmorEffectPresent"),
    storedArmorBaseStillUnarmored: booleanField(
      state,
      "qStoredArmorBaseStillUnarmored",
    ),
    projectedBaseIsMageArmor: booleanField(
      state,
      "qProjectedBaseIsMageArmor",
    ),
    armorClass: numberFromQuintInt(state["qArmorClass"], "qArmorClass"),
    mageArmorDurationTicks: numberFromQuintInt(
      state["qMageArmorDurationTicks"],
      "qMageArmorDurationTicks",
    ),
    level1SlotsExpended: numberFromQuintInt(
      state["qLevel1SlotsExpended"],
      "qLevel1SlotsExpended",
    ),
    actionAvailable: booleanField(state, "qActionAvailable"),
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

function mbtLastResult(
  raw: unknown,
): MageArmorSelectedIdentityProjection["lastResult"] {
  if (
    raw === "init" ||
    raw === "discovered" ||
    raw === "armoredRejected" ||
    raw === "resolved" ||
    raw === "durationExpired"
  ) {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

function requireElapsedHours(hours: number) {
  const parsed = elapsedTimeTicksFromHours(hours);
  if (Either.isLeft(parsed)) {
    throw new Error(`invalid test elapsed hours: ${hours}`);
  }
  return parsed.right;
}

const mageArmorSelectedIdentityStateCheck = stateCheck(
  normalizeMageArmorSelectedIdentityQuintState,
  (
    spec: MageArmorSelectedIdentityProjection,
    impl: MageArmorSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
