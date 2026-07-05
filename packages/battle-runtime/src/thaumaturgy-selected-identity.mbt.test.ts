// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1D2-THAUMATURGY-BOOMING-VOICE thaumaturgy
// UNIT-IDENTITY-REPLAY: L1D2-THAUMATURGY-BOOMING-VOICE thaumaturgy doResolveThaumaturgyBoomingVoice
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import type { SpellRecord } from "@dnd/surface/surface/types";

import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import {
  battleId,
  cantripSpellInvocationRef,
  characterSeed,
  discoverBattleActs,
  fighterId,
  findAct,
  findHole,
  requiredAbilityCheckRollMode,
  requireResolved,
  startBattleRight,
  statBlockCreatureInit,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import {
  resolveBattleSubject,
  type BattleFill,
  type BattleHole,
  type BattleState,
} from "./index.ts";

type BattleRollMode = "normal" | "advantage" | "disadvantage";

type ThaumaturgyProjection = {
  readonly casterEffectCount: number;
  readonly actionAvailable: boolean;
  readonly intimidationRollMode: BattleRollMode;
  readonly wisdomIntimidationRollMode: BattleRollMode;
  readonly perceptionRollMode: BattleRollMode;
  readonly lastResult: "init" | "resolved";
};

const thaumaturgySubject = {
  tag: "actionSpell" as const,
  actorId: fighterId,
  invocation: cantripSpellInvocationRef(
    "thaumaturgy",
    "thaumaturgyBoomingVoice",
  ),
  mode: { tag: "cast" as const },
};

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Thaumaturgy selected identity replay",
  taskId: "L1D2-THAUMATURGY-BOOMING-VOICE",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-thaumaturgy-selected-identity.mbt.qnt",
  ),
  projectionSchema: {
    casterEffectCount: "int",
    actionAvailable: "bool",
    intimidationRollMode: "str",
    wisdomIntimidationRollMode: "str",
    perceptionRollMode: "str",
    lastResult: "variant",
  },
  witnessProtocolField: "qProtocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: { lastResult: { Init: "init", Resolved: "resolved" } },
  initialProjection: {
    casterEffectCount: 0,
    actionAvailable: true,
    intimidationRollMode: "normal",
    wisdomIntimidationRollMode: "normal",
    perceptionRollMode: "normal",
    lastResult: "init",
  },
  units: [
    {
      unitId: "thaumaturgy",
      procedures: [
        {
          actionName: "doResolveThaumaturgyBoomingVoice",
          projectionAfter: {
            casterEffectCount: 1,
            actionAvailable: false,
            intimidationRollMode: "advantage",
            wisdomIntimidationRollMode: "normal",
            perceptionRollMode: "normal",
            lastResult: "resolved",
          },
          discover: () => {
            const initial = battleWithThaumaturgy();
            const resolved = requireResolved(
              resolveBattleSubject({
                state: initial,
                subject: thaumaturgySubject,
                fills: [thaumaturgyCountFill(initial, 0)],
              }),
            ).state;
            return projectThaumaturgyState(resolved, "resolved");
          },
        },
      ],
    },
  ],
});

function battleWithThaumaturgy(): BattleState {
  return startBattleRight({
    battleId: battleId("thaumaturgy-selected-identity"),
    combatants: [
      characterSeed({
        initiative: 20,
        classLevels: [{ className: "cleric", level: 1 }],
        spellcasting: {
          ...wizardSpellcasting({
            cantrips: [srdThaumaturgySpell()],
            preparedSpells: [],
            spellSlots: [],
          }),
          sourceClassName: "cleric",
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function srdThaumaturgySpell(): SpellRecord {
  const unit = unitLibrary.requireUnit("thaumaturgy");
  if (unit.kind !== "spell") {
    throw new Error("Expected SRD catalog unit thaumaturgy to be a Spell.");
  }
  return unit;
}

function thaumaturgyCountFill(
  state: BattleState,
  activeOneMinuteEffectCount: number,
): BattleFill {
  const act = findAct(state, thaumaturgySubject);
  const hole = findThaumaturgyCountHole(act.initialHoles);
  return {
    kind: "thaumaturgyActiveOneMinuteEffectCount",
    holeId: hole.holeId,
    value: { activeOneMinuteEffectCount },
  };
}

function findThaumaturgyCountHole(holes: readonly BattleHole[]) {
  const hole = findHole(holes, "thaumaturgyActiveOneMinuteEffectCount");
  if (hole.kind !== "thaumaturgyActiveOneMinuteEffectCount") {
    throw new Error("Expected Thaumaturgy active-effect count hole.");
  }
  return hole;
}

function projectThaumaturgyState(
  state: BattleState,
  lastResult: ThaumaturgyProjection["lastResult"],
): ThaumaturgyProjection {
  return {
    casterEffectCount:
      state.combatants
        .get(fighterId)
        ?.activeEffects.filter(
          (effect) => effect.kind === "thaumaturgyBoomingVoice",
        ).length ?? 0,
    actionAvailable: discoverBattleActs(state).some(
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.invocation.spellId === "thaumaturgy" &&
        act.subject.invocation.procedure === "thaumaturgyBoomingVoice",
    ),
    intimidationRollMode:
      requiredAbilityCheckRollMode(state, fighterId, "cha", {
        skill: "intimidation",
      }) ?? "normal",
    wisdomIntimidationRollMode:
      requiredAbilityCheckRollMode(state, fighterId, "wis", {
        skill: "intimidation",
      }) ?? "normal",
    perceptionRollMode:
      requiredAbilityCheckRollMode(state, fighterId, "cha", {
        skill: "perception",
      }) ?? "normal",
    lastResult,
  };
}
