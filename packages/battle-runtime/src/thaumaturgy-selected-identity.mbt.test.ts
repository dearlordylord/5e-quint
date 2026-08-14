import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1D2-THAUMATURGY-BOOMING-VOICE thaumaturgy
// UNIT-IDENTITY-REPLAY: L1D2-THAUMATURGY-BOOMING-VOICE thaumaturgy doResolveThaumaturgyBoomingVoice
import { describe, expect, it } from "vitest";

import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  mbtSpecPath,
  reducerRouteStartBattle,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";

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
  resolveBattleSubject,
  startBattleSessionRight,
  statBlockCreatureInit,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  type BattleFill,
  type BattleHole,
  type BattleRuntimeSession,
} from "./index.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";

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
          discover: () => {
            const initial = battleWithThaumaturgy();
            const act = findAct(initial, thaumaturgySubject);
            const resolved = requireResolved(
              resolveBattleSubject({
                state: initial.state,
                subject: act.subject,
                fills: [thaumaturgyCountFill(initial, 0)],
              }),
            );
            return projectThaumaturgyState(
              battleRuntimeSessionForTest({
                ...initial,
                state: resolved.state,
              }),
              "resolved",
            );
          },
        },
      ],
    },
  ],
});

type ThaumaturgyRouteProjection = {
  readonly route: readonly ReducerRouteEvent[];
};

describe("Thaumaturgy selected identity route replay", () => {
  it("observes Booming Voice qRoute through public reducer events", () => {
    expect(observeThaumaturgyBoomingVoiceRoute()).toEqual({
      route: [
        reducerRouteStartBattle("battleActionEconomy"),
        {
          kind: "discoverBattleActs",
          subject: "rollModifierEffect",
          holes: [],
          owner: "battleActiveEffect",
        },
        {
          kind: "resolveBattleSubjectWithoutFill",
          subject: "rollModifierEffect",
          holes: [],
          owner: "battleActiveEffect",
        },
      ],
    } satisfies ThaumaturgyRouteProjection);
  });
});

function initialThaumaturgyRouteProjection(): ThaumaturgyRouteProjection {
  return { route: [reducerRouteStartBattle("battleActionEconomy")] };
}

function observeThaumaturgyBoomingVoiceRoute(): ThaumaturgyRouteProjection {
  const state = battleWithThaumaturgy();
  const act = findAct(state, thaumaturgySubject);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [thaumaturgyCountFill(state, 0)],
    }),
  );
  return {
    route: [
      ...initialThaumaturgyRouteProjection().route,
      ...(act.routeEvents ?? []),
      ...(resolved.routeEvents ?? []),
    ],
  };
}

function battleWithThaumaturgy(): BattleRuntimeSession {
  return startBattleSessionRight({
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
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "cleric",
            abilityModifier: 3,
          },
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
  session: BattleRuntimeSession,
  activeOneMinuteEffectCount: number,
): BattleFill {
  const act = findAct(session, thaumaturgySubject);
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
  session: BattleRuntimeSession,
  lastResult: ThaumaturgyProjection["lastResult"],
): ThaumaturgyProjection {
  return {
    casterEffectCount:
      session.state.combatants
        .get(fighterId)
        ?.activeEffects.filter(
          (effect) => effect.kind === "thaumaturgyBoomingVoice",
        ).length ?? 0,
    actionAvailable: discoverBattleActs(session).some(
      (act) =>
        act.subject.tag === "actionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "thaumaturgy" &&
        battleActSpellPresentation(act)?.invocation.procedure ===
          "thaumaturgyBoomingVoice",
    ),
    intimidationRollMode:
      requiredAbilityCheckRollMode(session.state, fighterId, "cha", {
        skill: "intimidation",
      }) ?? "normal",
    wisdomIntimidationRollMode:
      requiredAbilityCheckRollMode(session.state, fighterId, "wis", {
        skill: "intimidation",
      }) ?? "normal",
    perceptionRollMode:
      requiredAbilityCheckRollMode(session.state, fighterId, "cha", {
        skill: "perception",
      }) ?? "normal",
    lastResult,
  };
}
