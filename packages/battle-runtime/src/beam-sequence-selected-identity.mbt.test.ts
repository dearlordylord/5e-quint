// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1H-ELDRITCH-BLAST eldritch_blast
// UNIT-IDENTITY-REPLAY: L1H-ELDRITCH-BLAST eldritch_blast doDiscoverLevelFiveBeamTargetHoles doResolveTwoCreatureBeamsSameTarget doResolveTwoCreatureBeamsSplitTargets doResolveCreatureAndObjectBeamTargets
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE
import { Either } from "effect";

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
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";

const eldritchBlastUnitId = "eldritch_blast";
const initialSkeletonHp = 13;
const initialZombieHp = 11;
const initialObjectHp = 5;

type BeamSequenceLastResult =
  | "init"
  | "discovered"
  | "sameTargetResolved"
  | "splitTargetResolved"
  | "creatureObjectResolved";

const BEAM_SEQUENCE_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  Discovered: "discovered",
  SameTargetResolved: "sameTargetResolved",
  SplitTargetResolved: "splitTargetResolved",
  CreatureObjectResolved: "creatureObjectResolved",
} as const;

type BeamSequenceProjection = {
  readonly initialCreatureTargetHoles: number;
  readonly initialObjectTargetHoles: number;
  readonly skeletonHp: number;
  readonly zombieHp: number;
  readonly objectHp: number;
  readonly actionAvailable: boolean;
  readonly lastResult: BeamSequenceLastResult;
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

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Beam sequence selected identity replay",
  taskId: "L1H-ELDRITCH-BLAST",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-beam-sequence-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: { lastResult: BEAM_SEQUENCE_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG },
  projectionSchema: {
    initialCreatureTargetHoles: "int",
    initialObjectTargetHoles: "int",
    skeletonHp: "int",
    zombieHp: "int",
    objectHp: "int",
    actionAvailable: "bool",
    lastResult: "variant",
  },
  initialProjection: projectInitialBattle("init"),
  units: [
    {
      unitId: eldritchBlastUnitId,
      procedures: [
        {
          actionName: "doDiscoverLevelFiveBeamTargetHoles",
          projectionAfter: projectInitialBattle("discovered"),
          discover: () => projectInitialBattle("discovered"),
        },
        {
          actionName: "doResolveTwoCreatureBeamsSameTarget",
          projectionAfter: projectResolvedBattle(
            resolveEldritchBlastTwoBeamSequence({
              targetFills: (holes) => [
                spellTargetFill(beamCreatureTargetHole(holes, 0), skeletonId),
                spellTargetFill(beamCreatureTargetHole(holes, 1), skeletonId),
              ],
              outcomes: [hitForFour(), miss()],
            }),
            "sameTargetResolved",
          ),
          discover: () =>
            projectResolvedBattle(
              resolveEldritchBlastTwoBeamSequence({
                targetFills: (holes) => [
                  spellTargetFill(beamCreatureTargetHole(holes, 0), skeletonId),
                  spellTargetFill(beamCreatureTargetHole(holes, 1), skeletonId),
                ],
                outcomes: [hitForFour(), miss()],
              }),
              "sameTargetResolved",
            ),
        },
        {
          actionName: "doResolveTwoCreatureBeamsSplitTargets",
          projectionAfter: projectResolvedBattle(
            resolveEldritchBlastTwoBeamSequence({
              targetFills: (holes) => [
                spellTargetFill(beamCreatureTargetHole(holes, 0), skeletonId),
                spellTargetFill(beamCreatureTargetHole(holes, 1), zombieId),
              ],
              outcomes: [hitForFour(), hitForFour()],
            }),
            "splitTargetResolved",
          ),
          discover: () =>
            projectResolvedBattle(
              resolveEldritchBlastTwoBeamSequence({
                targetFills: (holes) => [
                  spellTargetFill(beamCreatureTargetHole(holes, 0), skeletonId),
                  spellTargetFill(beamCreatureTargetHole(holes, 1), zombieId),
                ],
                outcomes: [hitForFour(), hitForFour()],
              }),
              "splitTargetResolved",
            ),
        },
        {
          actionName: "doResolveCreatureAndObjectBeamTargets",
          projectionAfter: projectResolvedBattle(
            resolveEldritchBlastTwoBeamSequence({
              targetFills: (holes) => [
                spellTargetFill(beamCreatureTargetHole(holes, 0), skeletonId),
                spellObjectTargetFill(beamObjectTargetHole(holes, 1)),
              ],
              outcomes: [hitForFour(), hitForFour()],
            }),
            "creatureObjectResolved",
          ),
          discover: () =>
            projectResolvedBattle(
              resolveEldritchBlastTwoBeamSequence({
                targetFills: (holes) => [
                  spellTargetFill(beamCreatureTargetHole(holes, 0), skeletonId),
                  spellObjectTargetFill(beamObjectTargetHole(holes, 1)),
                ],
                outcomes: [hitForFour(), hitForFour()],
              }),
              "creatureObjectResolved",
            ),
        },
      ],
    },
  ],
});

function projectInitialBattle(
  lastResult: Extract<BeamSequenceLastResult, "init" | "discovered">,
): BeamSequenceProjection {
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
  lastResult: Exclude<BeamSequenceLastResult, "init" | "discovered">,
): BeamSequenceProjection {
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
  BeamSequenceProjection,
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
          cantrips: [eldritchBlastSpellRecord()],
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
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
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

function eldritchBlastSpellRecord(): SpellRecord {
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
      (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
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
  if (firstGroup === undefined || groups.some((group) => group.length === 0)) {
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
