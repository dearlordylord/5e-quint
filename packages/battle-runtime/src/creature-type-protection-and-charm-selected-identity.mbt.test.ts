// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1H-ANIMAL-FRIENDSHIP animal_friendship
// UNIT-IDENTITY-MBT-REPLAY: L1H-ANIMAL-FRIENDSHIP animal_friendship doDiscoverAnimalFriendshipBeastTargetAdmission doResolveAnimalFriendshipFailedSaveCharmed doResolveAnimalFriendshipCasterDamageBreak
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
  type Condition,
} from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord, StatBlockRecord } from "@dnd/surface/surface/types";

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
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { applyPreparedSlotSpellDamage } from "./battle-reducer/spells-damage-fills.ts";

const creatureTypeProtectionAndCharmSelectedIdentityDriverSchema = {
  init: {},
  doDiscoverAnimalFriendshipBeastTargetAdmission: {},
  doResolveAnimalFriendshipFailedSaveCharmed: {},
  doResolveAnimalFriendshipCasterDamageBreak: {},
  step: {},
} as const;
type CreatureTypeProtectionAndCharmSelectedIdentityDriverAction = Exclude<
  keyof typeof creatureTypeProtectionAndCharmSelectedIdentityDriverSchema,
  "init" | "step"
>;

type CreatureTypeProtectionAndCharmSelectedIdentityLastResult =
  | "init"
  | "discovered"
  | "resolved"
  | "damageBreakResolved";
type AnimalFriendshipTargetAdmission = {
  readonly beastTargetAdmitted: boolean;
  readonly humanoidTargetAdmitted: boolean;
};
type CreatureTypeProtectionAndCharmSelectedIdentityProjection = {
  readonly beastTargetAdmitted: boolean;
  readonly humanoidTargetAdmitted: boolean;
  readonly targetCharmed: boolean;
  readonly animalFriendshipEffectPresent: boolean;
  readonly actionAvailable: boolean;
  readonly firstLevelSlotsExpended: number;
  readonly lastResult: CreatureTypeProtectionAndCharmSelectedIdentityLastResult;
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly CreatureTypeProtectionAndCharmSelectedIdentityDriverAction[];
  readonly expected: CreatureTypeProtectionAndCharmSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1H-ANIMAL-FRIENDSHIP";
  readonly unitId: CreatureTypeProtectionAndCharmSpellUnitId;
  readonly actions: readonly CreatureTypeProtectionAndCharmSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const animalFriendshipUnitId = "animal_friendship";
type CreatureTypeProtectionAndCharmSpellUnitId =
  typeof animalFriendshipUnitId;

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type CharacterCreatureInit = Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>;
type CharacterClassName =
  CharacterCreatureInit["classLevels"][number]["className"];
type CharacterSpellcastingInit = NonNullable<
  CharacterCreatureInit["spellcasting"]
>;

const casterId = combatantId(
  "creature-type-protection-and-charm-selected-identity-caster",
);
const beastTargetId = combatantId(
  "creature-type-protection-and-charm-selected-identity-beast",
);
const humanoidTargetId = combatantId(
  "creature-type-protection-and-charm-selected-identity-humanoid",
);
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error(
    "Creature Type Protection and Charm selected identity catalogs must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1H-ANIMAL-FRIENDSHIP",
    unitId: "animal_friendship",
    actions: [
      "doDiscoverAnimalFriendshipBeastTargetAdmission",
      "doResolveAnimalFriendshipFailedSaveCharmed",
      "doResolveAnimalFriendshipCasterDamageBreak",
    ],
    sequences: [
      {
        name: "beast-target-admitted-and-humanoid-excluded",
        actions: ["doDiscoverAnimalFriendshipBeastTargetAdmission"],
        expected: expectedProjection({
          beastTargetAdmitted: true,
          lastResult: "discovered",
        }),
      },
      {
        name: "failed-wisdom-saving-throw-applies-source-owned-charmed",
        actions: ["doResolveAnimalFriendshipFailedSaveCharmed"],
        expected: expectedProjection({
          beastTargetAdmitted: true,
          targetCharmed: true,
          animalFriendshipEffectPresent: true,
          actionAvailable: false,
          firstLevelSlotsExpended: 1,
          lastResult: "resolved",
        }),
      },
      {
        name: "caster-damage-break-clears-source-owned-charmed",
        actions: ["doResolveAnimalFriendshipCasterDamageBreak"],
        expected: expectedProjection({
          beastTargetAdmitted: true,
          actionAvailable: false,
          firstLevelSlotsExpended: 1,
          lastResult: "damageBreakResolved",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Creature Type Protection and Charm selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<CreatureTypeProtectionAndCharmSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver =
          createCreatureTypeProtectionAndCharmSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Creature Type Protection and Charm selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Creature Type Protection and Charm selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Creature Type Protection and Charm selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-creature-type-protection-and-charm-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createCreatureTypeProtectionAndCharmSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: creatureTypeProtectionAndCharmSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createCreatureTypeProtectionAndCharmSelectedIdentityDriver() {
  return defineDriver(
    creatureTypeProtectionAndCharmSelectedIdentityDriverSchema,
    () => {
      let state = animalFriendshipBattle();
      let targetAdmission = emptyAnimalFriendshipTargetAdmission();
      let lastResult: CreatureTypeProtectionAndCharmSelectedIdentityLastResult =
        "init";

      function reset(): void {
        state = animalFriendshipBattle();
        targetAdmission = emptyAnimalFriendshipTargetAdmission();
        lastResult = "init";
      }

      function recordAdmission(): void {
        targetAdmission = animalFriendshipTargetAdmission(state);
      }

      return {
        init: reset,
        doDiscoverAnimalFriendshipBeastTargetAdmission: () => {
          state = animalFriendshipBattle();
          recordAdmission();
          lastResult = "discovered";
        },
        doResolveAnimalFriendshipFailedSaveCharmed: () => {
          state = animalFriendshipBattle();
          recordAdmission();
          state = resolveAnimalFriendshipFailedSave(state);
          lastResult = "resolved";
        },
        doResolveAnimalFriendshipCasterDamageBreak: () => {
          state = animalFriendshipBattle();
          recordAdmission();
          state = applyPreparedSlotSpellDamage(
            resolveAnimalFriendshipFailedSave(state),
            beastTargetId,
            1,
            { damageSourceId: casterId },
          );
          lastResult = "damageBreakResolved";
        },
        step: () => {},
        getState: () =>
          projectCreatureTypeProtectionAndCharmSelectedIdentityState(
            state,
            targetAdmission,
            lastResult,
          ),
      };
    },
  );
}

function expectedProjection(
  overrides: Partial<CreatureTypeProtectionAndCharmSelectedIdentityProjection> = {},
): CreatureTypeProtectionAndCharmSelectedIdentityProjection {
  return {
    beastTargetAdmitted: false,
    humanoidTargetAdmitted: false,
    targetCharmed: false,
    animalFriendshipEffectPresent: false,
    actionAvailable: true,
    firstLevelSlotsExpended: 0,
    lastResult: "init",
    ...overrides,
  };
}

function emptyAnimalFriendshipTargetAdmission(): AnimalFriendshipTargetAdmission {
  return {
    beastTargetAdmitted: false,
    humanoidTargetAdmitted: false,
  };
}

function srdSpellRecord(
  unitId: CreatureTypeProtectionAndCharmSpellUnitId,
): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function animalFriendshipBattle(): BattleState {
  const spell = srdSpellRecord(animalFriendshipUnitId);
  const result = startBattle({
    battleId: battleId("creature-type-protection-and-charm-selected-identity"),
    combatants: [
      spellcasterCreature({
        combatantId: casterId,
        displayName: "Animal Friendship caster",
        initiative: 20,
        side: partySide,
        className: "druid",
        spellcasting: {
          sourceClassName: "druid",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [spell],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      statBlockCreature({
        combatantId: beastTargetId,
        statBlock: statBlockWithCreatureType("beast"),
        initiative: 10,
        side: oppositionSide,
      }),
      statBlockCreature({
        combatantId: humanoidTargetId,
        statBlock: statBlockWithCreatureType("humanoid"),
        initiative: 9,
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function spellcasterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly className: CharacterClassName;
  readonly spellcasting: CharacterSpellcastingInit;
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
      classLevels: [{ className: input.className, level: 1 }],
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
      spellcasting: input.spellcasting,
    },
  };
}

function statBlockCreature(input: {
  readonly combatantId: CombatantId;
  readonly statBlock: StatBlockRecord;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.statBlock.statBlock.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "statBlock",
      statBlock: input.statBlock,
      currentHp: Hp(statBlockLiteralNumber(input.statBlock.statBlock.hp)),
      maxHp: Hp(statBlockLiteralNumber(input.statBlock.statBlock.hp)),
      tempHp: Hp(0),
    },
  };
}

function statBlockWithCreatureType(
  creatureType: StatBlockRecord["statBlock"]["creatureType"],
): StatBlockRecord {
  const base = statBlockCatalog.requireStatBlock("stat_block_goblin_warrior");
  return {
    ...base,
    id: `stat_block_selected_identity_${creatureType}`,
    name: `Selected Identity ${creatureType}`,
    statBlock: {
      ...base.statBlock,
      displayName: `Selected Identity ${creatureType}`,
      creatureType,
    },
  };
}

function statBlockLiteralNumber(
  value: StatBlockRecord["statBlock"]["hp"],
): number {
  if (typeof value === "number") {
    return value;
  }
  if (value.kind === "literal") {
    return value.value;
  }
  throw new Error("Expected literal stat block number.");
}

function animalFriendshipTargetAdmission(
  state: BattleState,
): AnimalFriendshipTargetAdmission {
  const targetHole = requireHole(
    animalFriendshipSpellAct(state).initialHoles,
    "spellTargetList",
  );
  return {
    beastTargetAdmitted: targetHole.choices.includes(beastTargetId),
    humanoidTargetAdmitted: targetHole.choices.includes(humanoidTargetId),
  };
}

function resolveAnimalFriendshipFailedSave(state: BattleState): BattleState {
  const act = animalFriendshipSpellAct(state);
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(targetHole, [beastTargetId]);
  const saveHole = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "savingThrowOutcome",
  );
  return requireResolvedState(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(saveHole, [
          { targetId: beastTargetId, succeeded: false },
        ]),
      ],
    }),
    "Expected Animal Friendship to resolve.",
  );
}

function animalFriendshipSpellAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      candidate.subject.invocation.spellId === animalFriendshipUnitId &&
      Number(candidate.subject.invocation.slotLevel) === 1,
  );
  if (act === undefined) {
    throw new Error("Expected Animal Friendship spell act.");
  }
  return act;
}

function spellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget",
      casterId,
      targetId,
      spellId: animalFriendshipUnitId,
    })),
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
    value: { outcomes },
  };
}

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  return requireHole(requireNeedsHolesResult(result).holes, kind);
}

function requireNeedsHolesResult(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  if (result.tag !== "needsHoles") {
    throw new Error("Expected needsHoles result.");
  }
  return result;
}

function requireResolvedState(
  result: BattleResolutionResult,
  message: string,
): BattleState {
  if (result.tag !== "resolved") {
    throw new Error(
      result.tag === "invalid" ? `${message} ${result.message}` : message,
    );
  }
  return result.state;
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

function projectCreatureTypeProtectionAndCharmSelectedIdentityState(
  state: BattleState,
  targetAdmission: AnimalFriendshipTargetAdmission,
  lastResult: CreatureTypeProtectionAndCharmSelectedIdentityLastResult,
): CreatureTypeProtectionAndCharmSelectedIdentityProjection {
  const snapshot = snapshotBattle(state);
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === beastTargetId,
  );
  if (target === undefined) {
    throw new Error(
      "Expected Creature Type Protection and Charm selected identity target.",
    );
  }
  return {
    beastTargetAdmitted: targetAdmission.beastTargetAdmitted,
    humanoidTargetAdmitted: targetAdmission.humanoidTargetAdmitted,
    targetCharmed: snapshotHasCondition(target.conditions, "charmed"),
    animalFriendshipEffectPresent:
      animalFriendshipEffectPresentOnBeastTarget(state),
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    firstLevelSlotsExpended: expendedSlotsForSpellLevel(state, casterId, 1),
    lastResult,
  };
}

function snapshotHasCondition(
  conditions: readonly Condition[],
  condition: Condition,
): boolean {
  return conditions.includes(condition);
}

function animalFriendshipEffectPresentOnBeastTarget(state: BattleState): boolean {
  return (
    state.combatants.get(beastTargetId)?.activeEffects.some(
      (effect) =>
        effect.kind === "spellCondition" &&
        effect.sourceSpellId === animalFriendshipUnitId &&
        effect.sourceCombatantId === casterId &&
        effect.condition === "charmed",
    ) ?? false
  );
}

function expendedSlotsForSpellLevel(
  state: BattleState,
  combatantId: CombatantId,
  spellLevel: number,
): number {
  const combatant = state.combatants.get(combatantId);
  if (combatant?.origin.kind !== "character") {
    throw new Error(
      "Expected Creature Type Protection and Charm caster character origin.",
    );
  }
  return (
    combatant.origin.spellcasting?.spellSlots.find(
      (slot) => slot.spellLevel === spellLevel,
    )?.expended ?? 0
  );
}

function normalizeCreatureTypeProtectionAndCharmSelectedIdentityQuintState(
  raw: unknown,
): CreatureTypeProtectionAndCharmSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    beastTargetAdmitted: booleanField(state, "qBeastTargetAdmitted"),
    humanoidTargetAdmitted: booleanField(state, "qHumanoidTargetAdmitted"),
    targetCharmed: booleanField(state, "qTargetCharmed"),
    animalFriendshipEffectPresent: booleanField(
      state,
      "qAnimalFriendshipEffectPresent",
    ),
    actionAvailable: booleanField(state, "qActionAvailable"),
    firstLevelSlotsExpended: numberFromQuintInt(
      state["qFirstLevelSlotsExpended"],
      "qFirstLevelSlotsExpended",
    ),
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
): CreatureTypeProtectionAndCharmSelectedIdentityLastResult {
  if (
    raw === "init" ||
    raw === "discovered" ||
    raw === "resolved" ||
    raw === "damageBreakResolved"
  ) {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const creatureTypeProtectionAndCharmSelectedIdentityStateCheck = stateCheck(
  normalizeCreatureTypeProtectionAndCharmSelectedIdentityQuintState,
  (
    spec: CreatureTypeProtectionAndCharmSelectedIdentityProjection,
    impl: CreatureTypeProtectionAndCharmSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
