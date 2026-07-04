// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-cast-duration-and-concentration
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3MMETA-16-EXTENDED-CAST-DURATION-CONCENTRATION-SLICE sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: L3MMETA-16-EXTENDED-CAST-DURATION-CONCENTRATION-SLICE sorcerer_metamagic doResolveExtendedCreatureSizeIncrease
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_EXTENDED_CAST_DURATION_CONCENTRATION
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Extended Spell: a spell with
//   duration at least 1 minute doubles its duration to a 24-hour maximum and,
//   when it requires Concentration, grants Advantage on maintenance saves.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Enlarge/Reduce:
//   Concentration up to 1 minute and a creature size-change effect.
import { it } from "vitest";
import { resourceCount } from "@dnd/shared/types";

import { concentrationSavingThrowHole } from "./battle-reducer/damage-apply.ts";
import { EXTENDED_METAMAGIC_EFFECT_KIND } from "./battle-reducer/metamagic.ts";
import {
  characterBattleResourceIsPointPool,
  type CharacterBattleMetamagicOptionFact,
  type CharacterBattlePointPoolResourceState,
} from "./character-battle-resources.ts";
import {
  defineDriver,
  focusedMbtMaxSteps,
  MBT_TEST_TIMEOUT_MS,
  mbtSpecPath,
  reducerRoutedMetamagicStateCheck,
  run,
} from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  enlargeReduceUnitId,
  spellCasterId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  battleReducerStartRouteEvent,
  type BattleReducerRouteEvent,
} from "./index.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { knownWillingSpellTargetFill } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  discoverBattleActs,
  resolveBattleSubject,
  type BattleState,
} from "./unit-profile-admission-test-support.ts";

type ExtendedCreatureSizeProjection = {
  readonly sorceryPointsRemaining: number;
  readonly durationTicks: number;
  readonly concentrationSavingThrowMode: "normal" | "advantage";
  readonly lastResult: "init" | "extendedCreatureSizeIncrease";
};

const extendedMetamagicRouteReplayDriverSchema = {
  init: {},
  doRouteSpellDurationProjection: {},
  stepRouteSpellDurationProjection: {},
} as const;

type ExtendedMetamagicRouteReplayProjection = {
  readonly route: readonly BattleReducerRouteEvent[];
};

defineSelectedIdentityWitness({
  describeLabel: "Sorcerer Extended Spell creature-size selected identity MBT",
  taskId: "L3MMETA-16-EXTENDED-CAST-DURATION-CONCENTRATION-SLICE",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-sorcerer-metamagic-extended-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      ExtendedCreatureSizeIncrease: "extendedCreatureSizeIncrease",
    },
  },
  projectionSchema: {
    sorceryPointsRemaining: "int",
    durationTicks: "int",
    concentrationSavingThrowMode: "str",
    lastResult: "variant",
  },
  initialProjection: {
    sorceryPointsRemaining: 2,
    durationTicks: 0,
    concentrationSavingThrowMode: "normal",
    lastResult: "init",
  },
  units: [
    {
      unitId: "sorcerer_metamagic",
      procedures: [
        {
          actionName: "doResolveExtendedCreatureSizeIncrease",
          projectionAfter: {
            sorceryPointsRemaining: 1,
            durationTicks: 20,
            concentrationSavingThrowMode: "advantage",
            lastResult: "extendedCreatureSizeIncrease",
          },
          discover: () =>
            extendedCreatureSizeProjection(
              resolveExtendedCreatureSizeIncrease(),
            ),
        },
      ],
    },
  ],
});

it(
  "compares Extended Spell duration-projection public reducer route to copied qRoute",
  async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-sorcerer-metamagic.route.mbt.qnt",
      ),
      init: "init",
      step: "stepRouteSpellDurationProjection",
      driver: createExtendedMetamagicRouteReplayDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(1),
      stateCheck: reducerRoutedMetamagicStateCheck,
    });
  },
  MBT_TEST_TIMEOUT_MS,
);

function resolveExtendedCreatureSizeIncrease(): BattleState {
  return resolveExtendedCreatureSizeIncreaseSubject().state;
}

function observeExtendedCreatureSizeIncreaseRoute() {
  const resolved = resolveExtendedCreatureSizeIncreaseSubject();
  return [
    battleReducerStartRouteEvent(resolved.initialState),
    ...(resolved.act.routeEvents ?? []),
    ...(resolved.routeEvents ?? []),
  ];
}

function createExtendedMetamagicRouteReplayDriver() {
  return defineDriver(extendedMetamagicRouteReplayDriverSchema, () => {
    let route: readonly BattleReducerRouteEvent[] =
      observeExtendedCreatureSizeIncreaseInitialRoute();

    function reset(): void {
      route = observeExtendedCreatureSizeIncreaseInitialRoute();
    }

    function recordResolvedRoute(): void {
      route = observeExtendedCreatureSizeIncreaseRoute();
    }

    reset();

    return {
      init: reset,
      doRouteSpellDurationProjection: recordResolvedRoute,
      stepRouteSpellDurationProjection: recordResolvedRoute,
      getState: (): ExtendedMetamagicRouteReplayProjection => ({ route }),
    };
  });
}

function observeExtendedCreatureSizeIncreaseInitialRoute() {
  const resolved = resolveExtendedCreatureSizeIncreaseSubject();
  return [battleReducerStartRouteEvent(resolved.initialState)];
}

function resolveExtendedCreatureSizeIncreaseSubject() {
  const spell = spellRecord(enlargeReduceUnitId);
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    casterClassLevels: [{ className: "sorcerer", level: 2 }],
    casterResources: [
      {
        unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
        pointsRemaining: resourceCount(2),
      },
    ],
    casterMetamagic: {
      sorceryPointResourceUnitId: "sorcerer_font_of_magic",
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: [extendedMetamagicOption()],
    },
  });
  const extendedAct = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === enlargeReduceUnitId &&
      candidate.subject.invocation.procedure === "creatureSizeIncrease" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === EXTENDED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (extendedAct === undefined || extendedAct.subject.tag !== "actionSpell") {
    throw new Error("Expected Extended Enlarge/Reduce spell act.");
  }
  const resolved = resolveBattleSubject({
    state,
    subject: extendedAct.subject,
    fills: [
      knownWillingSpellTargetFill(
        requireHole(extendedAct.initialHoles, "targetChoice"),
        enlargeReduceUnitId,
        spellCasterId,
        spellCasterId,
      ),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(
      `Expected Extended Enlarge/Reduce to resolve, got ${resolved.tag}.`,
    );
  }
  return { initialState: state, act: extendedAct, ...resolved };
}

function extendedMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: EXTENDED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function extendedCreatureSizeProjection(
  state: BattleState,
): ExtendedCreatureSizeProjection {
  const caster = state.combatants.get(spellCasterId);
  const sizeChangeEffect = caster?.activeEffects.find(
    (effect) => effect.kind === "spellCreatureSizeChange",
  );
  const sorceryPointResource =
    caster?.origin.kind === "character"
      ? caster.origin.resources.find(
          (candidate): candidate is CharacterBattlePointPoolResourceState =>
            candidate.unit.id === "sorcerer_font_of_magic" &&
            characterBattleResourceIsPointPool(candidate),
        )
      : undefined;
  const durationTicks =
    sizeChangeEffect?.expiresAt.kind === "concentration"
      ? Number(sizeChangeEffect.expiresAt.durationTicks)
      : 0;
  const concentrationSavingThrowMode =
    caster !== undefined &&
    concentrationSavingThrowHole(caster, 4)?.rollMode === "advantage"
      ? "advantage"
      : "normal";
  return {
    sorceryPointsRemaining:
      sorceryPointResource === undefined
        ? 0
        : Number(sorceryPointResource.pointsRemaining),
    durationTicks,
    concentrationSavingThrowMode,
    lastResult: "extendedCreatureSizeIncrease",
  };
}
