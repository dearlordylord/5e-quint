// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1H-ELDRITCH-BLAST eldritch_blast
// UNIT-IDENTITY-MBT-REPLAY: L1H-ELDRITCH-BLAST eldritch_blast doDiscoverLevelFiveBeamTargetHoles doResolveTwoCreatureBeamsSameTarget doResolveTwoCreatureBeamsSplitTargets doResolveCreatureAndObjectBeamTargets
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  armorClass,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  DieRollResult,
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
  battleObjectId,
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

const beamSequenceSelectedIdentityDriverSchema = {
  init: {},
  doDiscoverLevelFiveBeamTargetHoles: {},
  doResolveTwoCreatureBeamsSameTarget: {},
  doResolveTwoCreatureBeamsSplitTargets: {},
  doResolveCreatureAndObjectBeamTargets: {},
  step: {},
} as const;
type BeamSequenceSelectedIdentityDriverAction = Exclude<
  keyof typeof beamSequenceSelectedIdentityDriverSchema,
  "init" | "step"
>;

const eldritchBlastUnitId = "eldritch_blast";
const initialSkeletonHp = 13;
const initialZombieHp = 11;
const initialObjectHp = 5;

type BeamSequenceSelectedIdentityLastResult =
  | "init"
  | "discovered"
  | "sameTargetResolved"
  | "splitTargetResolved"
  | "creatureObjectResolved";
type BeamSequenceSelectedIdentityProjection = {
  readonly initialCreatureTargetHoles: number;
  readonly initialObjectTargetHoles: number;
  readonly skeletonHp: number;
  readonly zombieHp: number;
  readonly objectHp: number;
  readonly actionAvailable: boolean;
  readonly lastResult: BeamSequenceSelectedIdentityLastResult;
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly BeamSequenceSelectedIdentityDriverAction[];
  readonly expected: BeamSequenceSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1H-ELDRITCH-BLAST";
  readonly unitId: typeof eldritchBlastUnitId;
  readonly actions: readonly BeamSequenceSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type ResolvedBattleResult = Extract<
  BattleResolutionResult,
  { readonly tag: "resolved" }
>;
type BeamTargetHoles = {
  readonly creature: readonly Extract<
    BattleHole,
    { readonly kind: "targetChoice" }
  >[];
  readonly object: readonly Extract<
    BattleHole,
    { readonly kind: "objectTargetChoice" }
  >[];
};
type BeamAttackOutcome = {
  readonly total: number;
  readonly naturalD20: number;
  readonly damageGroups?: readonly (readonly number[])[];
};
type ObjectTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "objectTargetChoice" }
>;
type SpellObjectTargetFact = Extract<
  ObjectTargetChoiceFill["spatialFacts"][number],
  { readonly kind: "spellObjectTarget" }
>;

const casterId = combatantId("beam-sequence-selected-identity-caster");
const skeletonId = combatantId("beam-sequence-selected-identity-skeleton");
const zombieId = combatantId("beam-sequence-selected-identity-zombie");
const objectId = battleObjectId("beam-sequence-selected-identity-object");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Beam sequence selected identity Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1H-ELDRITCH-BLAST",
    unitId: "eldritch_blast",
    actions: [
      "doDiscoverLevelFiveBeamTargetHoles",
      "doResolveTwoCreatureBeamsSameTarget",
      "doResolveTwoCreatureBeamsSplitTargets",
      "doResolveCreatureAndObjectBeamTargets",
    ],
    sequences: [
      {
        name: "level-five-opens-two-creature-and-two-object-target-holes",
        actions: ["doDiscoverLevelFiveBeamTargetHoles"],
        expected: expectedProjection({ lastResult: "discovered" }),
      },
      {
        name: "same-creature-target-allocation-keeps-beams-independent",
        actions: ["doResolveTwoCreatureBeamsSameTarget"],
        expected: expectedProjection({
          skeletonHp: 9,
          actionAvailable: false,
          lastResult: "sameTargetResolved",
        }),
      },
      {
        name: "different-creature-target-allocation-resolves-each-beam",
        actions: ["doResolveTwoCreatureBeamsSplitTargets"],
        expected: expectedProjection({
          skeletonHp: 9,
          zombieHp: 7,
          actionAvailable: false,
          lastResult: "splitTargetResolved",
        }),
      },
      {
        name: "creature-and-object-target-allocation-resolves-each-beam",
        actions: ["doResolveCreatureAndObjectBeamTargets"],
        expected: expectedProjection({
          skeletonHp: 9,
          objectHp: 1,
          actionAvailable: false,
          lastResult: "creatureObjectResolved",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Beam sequence selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<BeamSequenceSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createBeamSequenceSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Beam Sequence selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Beam Sequence selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Eldritch Blast beam sequence selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-beam-sequence-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createBeamSequenceSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: beamSequenceSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createBeamSequenceSelectedIdentityDriver() {
  return defineDriver(beamSequenceSelectedIdentityDriverSchema, () => {
    let projection = projectInitialBattle("init");

    function reset(): void {
      projection = projectInitialBattle("init");
    }

    return {
      init: reset,
      doDiscoverLevelFiveBeamTargetHoles: () => {
        projection = projectInitialBattle("discovered");
      },
      doResolveTwoCreatureBeamsSameTarget: () => {
        projection = projectResolvedBattle(
          resolveEldritchBlastTwoBeamSequence({
            targetFills: (holes) => [
              spellTargetFill(beamCreatureTargetHole(holes, 0), skeletonId),
              spellTargetFill(beamCreatureTargetHole(holes, 1), skeletonId),
            ],
            outcomes: [hitForFour(), miss()],
          }),
          "sameTargetResolved",
        );
      },
      doResolveTwoCreatureBeamsSplitTargets: () => {
        projection = projectResolvedBattle(
          resolveEldritchBlastTwoBeamSequence({
            targetFills: (holes) => [
              spellTargetFill(beamCreatureTargetHole(holes, 0), skeletonId),
              spellTargetFill(beamCreatureTargetHole(holes, 1), zombieId),
            ],
            outcomes: [hitForFour(), hitForFour()],
          }),
          "splitTargetResolved",
        );
      },
      doResolveCreatureAndObjectBeamTargets: () => {
        projection = projectResolvedBattle(
          resolveEldritchBlastTwoBeamSequence({
            targetFills: (holes) => [
              spellTargetFill(beamCreatureTargetHole(holes, 0), skeletonId),
              spellObjectTargetFill(beamObjectTargetHole(holes, 1)),
            ],
            outcomes: [hitForFour(), hitForFour()],
          }),
          "creatureObjectResolved",
        );
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function expectedProjection(
  overrides: Partial<BeamSequenceSelectedIdentityProjection> = {},
): BeamSequenceSelectedIdentityProjection {
  return {
    initialCreatureTargetHoles: 2,
    initialObjectTargetHoles: 2,
    skeletonHp: initialSkeletonHp,
    zombieHp: initialZombieHp,
    objectHp: initialObjectHp,
    actionAvailable: true,
    lastResult: "init",
    ...overrides,
  };
}

function projectInitialBattle(
  lastResult: Extract<
    BeamSequenceSelectedIdentityLastResult,
    "init" | "discovered"
  >,
): BeamSequenceSelectedIdentityProjection {
  const state = eldritchBlastBattle();
  const targetHoles = beamTargetHoles(eldritchBlastAct(state).initialHoles);
  return {
    ...projectBattleState(state),
    initialCreatureTargetHoles: targetHoles.creature.length,
    initialObjectTargetHoles: targetHoles.object.length,
    objectHp: initialObjectHp,
    lastResult,
  };
}

function projectResolvedBattle(
  result: ResolvedBattleResult,
  lastResult: Exclude<
    BeamSequenceSelectedIdentityLastResult,
    "init" | "discovered"
  >,
): BeamSequenceSelectedIdentityProjection {
  return {
    ...projectBattleState(result.state),
    initialCreatureTargetHoles: 2,
    initialObjectTargetHoles: 2,
    objectHp: objectHpAfterResolution(result),
    lastResult,
  };
}

function projectBattleState(
  state: BattleState,
): Omit<
  BeamSequenceSelectedIdentityProjection,
  | "initialCreatureTargetHoles"
  | "initialObjectTargetHoles"
  | "objectHp"
  | "lastResult"
> {
  const snapshot = snapshotBattle(state);
  return {
    skeletonHp: combatantHp(state, skeletonId),
    zombieHp: combatantHp(state, zombieId),
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
  };
}

function resolveEldritchBlastTwoBeamSequence(input: {
  readonly targetFills: (holes: BeamTargetHoles) => readonly BattleFill[];
  readonly outcomes: readonly [BeamAttackOutcome, BeamAttackOutcome];
}): ResolvedBattleResult {
  const state = eldritchBlastBattle();
  const act = eldritchBlastAct(state);
  const subject = act.subject;
  const targetFills = input.targetFills(beamTargetHoles(act.initialHoles));
  const afterFirstBeam = appendBeamOutcome({
    state,
    subject,
    fills: targetFills,
    outcome: input.outcomes[0],
  });
  const afterSecondBeam = appendBeamOutcome({
    state,
    subject,
    fills: afterFirstBeam,
    outcome: input.outcomes[1],
  });
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: afterSecondBeam,
    }),
  );
}

function appendBeamOutcome(input: {
  readonly state: BattleState;
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
  readonly fills: readonly BattleFill[];
  readonly outcome: BeamAttackOutcome;
}): readonly BattleFill[] {
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject: input.subject,
      fills: input.fills,
    }),
    "attackRoll",
  );
  const withAttack = [
    ...input.fills,
    attackRollFill(attackRoll, {
      total: input.outcome.total,
      naturalD20: input.outcome.naturalD20,
    }),
  ];
  if (input.outcome.damageGroups === undefined) {
    return withAttack;
  }

  const damage = requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject: input.subject,
      fills: withAttack,
    }),
    "rolledDice",
  );
  return [
    ...withAttack,
    damageRollFillWithGroups(damage, input.outcome.damageGroups),
  ];
}

function hitForFour(): BeamAttackOutcome {
  return { total: 18, naturalD20: 12, damageGroups: [[4]] };
}

function miss(): BeamAttackOutcome {
  return { total: 1, naturalD20: 1 };
}

function eldritchBlastBattle(): BattleState {
  const result = startBattle({
    battleId: battleId("beam-sequence-selected-identity"),
    combatants: [
      battleCreature({
        combatantId: casterId,
        displayName: "Eldritch Blast Caster",
        initiative: 20,
        side: partySide,
        currentHp: 12,
        classLevel: 5,
        spellcasting: {
          sourceClassName: "warlock",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(3),
          canCastSpells: true,
          cantrips: [spellRecord()],
          preparedSpells: [],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [],
        },
      }),
      battleCreature({
        combatantId: skeletonId,
        displayName: "Skeleton Target",
        initiative: 10,
        side: oppositionSide,
        currentHp: initialSkeletonHp,
      }),
      battleCreature({
        combatantId: zombieId,
        displayName: "Zombie Target",
        initiative: 5,
        side: oppositionSide,
        currentHp: initialZombieHp,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function battleCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly currentHp: number;
  readonly classLevel?: number;
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
          className: input.spellcasting?.sourceClassName ?? "fighter",
          level: input.classLevel ?? 1,
        },
      ],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp),
      maxHp: Hp(input.currentHp),
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
  const unit = unitLibrary.requireUnit(eldritchBlastUnitId);
  if (unit.kind !== "spell") {
    throw new Error("Expected Eldritch Blast Unit to be a Spell.");
  }
  return unit;
}

function eldritchBlastAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === casterId &&
      candidate.subject.invocation.spellId === eldritchBlastUnitId,
  );
  if (act === undefined) {
    throw new Error("Expected Eldritch Blast action Spell act.");
  }
  return act;
}

function beamTargetHoles(holes: readonly BattleHole[]): BeamTargetHoles {
  return {
    creature: holes.filter(
      (
        hole,
      ): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
        hole.kind === "targetChoice",
    ),
    object: holes.filter(
      (
        hole,
      ): hole is Extract<BattleHole, { readonly kind: "objectTargetChoice" }> =>
        hole.kind === "objectTargetChoice",
    ),
  };
}

function beamCreatureTargetHole(
  holes: BeamTargetHoles,
  beamIndex: number,
): Extract<BattleHole, { readonly kind: "targetChoice" }> {
  const hole = holes.creature[beamIndex];
  if (hole === undefined) {
    throw new Error(`Expected Eldritch Blast beam ${beamIndex + 1} target.`);
  }
  return hole;
}

function beamObjectTargetHole(
  holes: BeamTargetHoles,
  beamIndex: number,
): Extract<BattleHole, { readonly kind: "objectTargetChoice" }> {
  const hole = holes.object[beamIndex];
  if (hole === undefined) {
    throw new Error(
      `Expected Eldritch Blast beam ${beamIndex + 1} object target.`,
    );
  }
  return hole;
}

function spellTargetFill(
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
        spellId: eldritchBlastUnitId,
      },
    ],
  };
}

function spellObjectTargetFill(
  hole: Extract<BattleHole, { readonly kind: "objectTargetChoice" }>,
): ObjectTargetChoiceFill {
  return {
    kind: "objectTargetChoice",
    holeId: hole.holeId,
    value: objectId,
    spatialFacts: [
      {
        kind: "spellObjectTarget",
        casterId,
        objectId,
        spellId: eldritchBlastUnitId,
        rangeFeet: movementFeet(120),
        armorClass: armorClass(13),
        damageDisposition: {
          kind: "hitPoints",
          hitPoints: Hp(initialObjectHp),
        },
      } satisfies SpellObjectTargetFact,
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: {
    readonly total: number;
    readonly naturalD20: number;
  },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [firstGroup, ...restGroups] = groups;
  if (
    firstGroup === undefined ||
    groups.some((group) => group.length === 0)
  ) {
    throw new Error("Expected non-empty rolled damage groups.");
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
  const [first, ...rest] = group;
  if (first === undefined) {
    throw new Error("Expected at least one die result.");
  }

  return {
    results: [DieRollResult(first), ...rest.map(DieRollResult)],
  };
}

function requireResultHole<Kind extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: Kind,
): Extract<BattleHole, { readonly kind: Kind }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${kind} hole, got ${result.tag}.`);
  }

  const hole = result.holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: Kind }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function requireResolved(result: BattleResolutionResult): ResolvedBattleResult {
  if (result.tag !== "resolved") {
    throw new Error(`Expected Eldritch Blast to resolve, got ${result.tag}.`);
  }
  return result;
}

function combatantHp(state: BattleState, targetId: CombatantId): number {
  const combatant = snapshotBattle(state).combatants.find(
    (candidate) => candidate.combatantId === targetId,
  );
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${targetId}.`);
  }
  return combatant.hp;
}

function objectHpAfterResolution(result: ResolvedBattleResult): number {
  if (!("objectDamages" in result)) {
    return initialObjectHp;
  }
  const damage = result.objectDamages.find(
    (candidate) => candidate.objectId === objectId,
  );
  return damage?.kind === "hitPoints"
    ? Number(damage.nextHitPoints)
    : initialObjectHp;
}

function normalizeBeamSequenceSelectedIdentityQuintState(
  raw: unknown,
): BeamSequenceSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    initialCreatureTargetHoles: numberFromQuintInt(
      state["qInitialCreatureTargetHoles"],
      "qInitialCreatureTargetHoles",
    ),
    initialObjectTargetHoles: numberFromQuintInt(
      state["qInitialObjectTargetHoles"],
      "qInitialObjectTargetHoles",
    ),
    skeletonHp: numberFromQuintInt(state["qSkeletonHp"], "qSkeletonHp"),
    zombieHp: numberFromQuintInt(state["qZombieHp"], "qZombieHp"),
    objectHp: numberFromQuintInt(state["qObjectHp"], "qObjectHp"),
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
): BeamSequenceSelectedIdentityProjection["lastResult"] {
  if (
    raw === "init" ||
    raw === "discovered" ||
    raw === "sameTargetResolved" ||
    raw === "splitTargetResolved" ||
    raw === "creatureObjectResolved"
  ) {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const beamSequenceSelectedIdentityStateCheck = stateCheck(
  normalizeBeamSequenceSelectedIdentityQuintState,
  (
    spec: BeamSequenceSelectedIdentityProjection,
    impl: BeamSequenceSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
