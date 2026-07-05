// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-cast-component-suppression
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay PPW-T05-SUBTLE-METAMAGIC-FOCUSED-MBT sorcerer_metamagic
// UNIT-IDENTITY-REPLAY: PPW-T05-SUBTLE-METAMAGIC-FOCUSED-MBT sorcerer_metamagic doResolveSubtleFalseLife doRejectSubtleFalseLifeWithoutSorceryPoints
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_SUBTLE_COMPONENT_SUPPRESSION
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Subtle Spell: spending
//   1 Sorcery Point suppresses Verbal, Somatic, and focus-replaceable
//   Material components, while unaffordable use is rejected.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic: a spell
//   uses a known option by spending its Sorcery Point cost.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Components:
//   component requirements are canonical Spell Definition facts.
import { resourceCount } from "@dnd/shared/types";
import { expect, it } from "vitest";

import {
  admitSpellMetamagicApplications,
  SUBTLE_METAMAGIC_EFFECT_KIND,
  subtleSpellComponentProjectionForApplications,
} from "./battle-reducer/metamagic.ts";
import { supportedSpellActs } from "./battle-reducer/spells-profiles.ts";
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
import { damageRollFillWithGroups } from "./battle-runtime-test-support.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import {
  barkskinUnitId,
  falseLifeUnitId,
  spellCasterId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleReducerStartRouteEvent,
  discoverBattleActs,
  type AvailableBattleAct,
  type BattleReducerRouteEvent,
  type BattleSubject,
} from "./index.ts";
import {
  resolveBattleSubject,
  spellSlotInvocationRef,
  type BattleState,
} from "./unit-profile-admission-test-support.ts";

type SubtleFalseLifeProjection = {
  readonly verbalSuppressed: boolean;
  readonly somaticSuppressed: boolean;
  readonly materialSuppressed: boolean;
  readonly materialPreserved: boolean;
  readonly sorceryPointsRemaining: number;
  readonly tempHp: number;
  readonly lastResult:
    | "init"
    | "subtleFalseLife"
    | "unaffordableSubtleFalseLife";
};

const subtleMetamagicRouteReplayDriverSchema = {
  init: {},
  doRouteSpellComponentProjection: {},
  stepRouteSpellComponentProjection: {},
} as const;

type SubtleMetamagicRouteReplayProjection = {
  readonly route: readonly BattleReducerRouteEvent[];
};

type SubtleFalseLifeAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};

defineSelectedIdentityReplayAndQntReplay({
  describeLabel:
    "Sorcerer Subtle Spell component suppression selected identity replay",
  taskId: "PPW-T05-SUBTLE-METAMAGIC-FOCUSED-MBT",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-sorcerer-metamagic-subtle-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      SubtleFalseLife: "subtleFalseLife",
      UnaffordableSubtleFalseLife: "unaffordableSubtleFalseLife",
    },
  },
  witnessInvalidScenarioReasons: {
    unaffordableSubtleFalseLife: "unsupportedActOption",
  },
  projectionSchema: {
    verbalSuppressed: "bool",
    somaticSuppressed: "bool",
    materialSuppressed: "bool",
    materialPreserved: "bool",
    sorceryPointsRemaining: "int",
    tempHp: "int",
    lastResult: "variant",
  },
  initialProjection: {
    verbalSuppressed: false,
    somaticSuppressed: false,
    materialSuppressed: false,
    materialPreserved: false,
    sorceryPointsRemaining: 2,
    tempHp: 0,
    lastResult: "init",
  },
  units: [
    {
      unitId: "sorcerer_metamagic",
      procedures: [
        {
          actionName: "doResolveSubtleFalseLife",
          projectionAfter: {
            verbalSuppressed: true,
            somaticSuppressed: true,
            materialSuppressed: true,
            materialPreserved: false,
            sorceryPointsRemaining: 1,
            tempHp: 11,
            lastResult: "subtleFalseLife",
          },
          discover: () => subtleFalseLifeProjection(resolveSubtleFalseLife()),
        },
        {
          actionName: "doRejectSubtleFalseLifeWithoutSorceryPoints",
          projectionAfter: {
            verbalSuppressed: false,
            somaticSuppressed: false,
            materialSuppressed: false,
            materialPreserved: false,
            sorceryPointsRemaining: 0,
            tempHp: 0,
            lastResult: "unaffordableSubtleFalseLife",
          },
          discover: () => rejectSubtleFalseLifeWithoutSorceryPoints(),
        },
      ],
    },
  ],
});

it(
  "compares Subtle Spell component-projection public reducer route to copied qRoute",
  async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-sorcerer-metamagic.route.mbt.qnt",
      ),
      init: "init",
      step: "stepRouteSpellComponentProjection",
      driver: createSubtleMetamagicRouteReplayDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: focusedMbtMaxSteps(1),
      stateCheck: reducerRoutedMetamagicStateCheck,
    });
  },
  MBT_TEST_TIMEOUT_MS,
);

it("labels public Subtle scalar-buff acts as Subtle Spell", () => {
  const act = subtleFalseLifeAct(subtleFalseLifeBattle({ sorceryPoints: 2 }));

  expect(act.label).toBe("False Life (Subtle Spell)");
  expect(act.summary).toContain("Subtle Spell.");
  expect(act.label).not.toContain("Quickened Spell");
  expect(act.summary).not.toContain("Quickened Spell");
});

it("does not discover Subtle bonus-action scalar-buff acts rejected by admission", () => {
  const state = subtleBarkskinBattle({ sorceryPoints: 2 });
  const acts = discoverBattleActs(state);

  expect(
    acts.some(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === barkskinUnitId &&
        candidate.subject.invocation.procedure === "scalarBuff" &&
        candidate.subject.metamagic === undefined,
    ),
  ).toBe(true);
  expect(
    acts.some(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === barkskinUnitId &&
        candidate.subject.invocation.procedure === "scalarBuff" &&
        candidate.subject.metamagic?.some(
          (selection) => selection.effectKind === SUBTLE_METAMAGIC_EFFECT_KIND,
        ) === true,
    ),
  ).toBe(false);
});

function resolveSubtleFalseLife(): {
  readonly state: BattleState;
  readonly projection: Omit<
    SubtleFalseLifeProjection,
    "sorceryPointsRemaining" | "tempHp" | "lastResult"
  >;
} {
  const state = subtleFalseLifeBattle({ sorceryPoints: 2 });
  const actor = state.combatants.get(spellCasterId);
  if (actor === undefined) {
    throw new Error("Expected Subtle Spell caster.");
  }
  const act = subtleFalseLifeAct(state);
  const subject = act.subject;
  const falseLifeSpell = spellRecord(falseLifeUnitId);
  const admitted = admitSpellMetamagicApplications({
    state,
    actor,
    actorId: spellCasterId,
    invocation: supportedFalseLifeInvocation(state),
    subject,
  });
  if (admitted.tag !== "ok") {
    throw new Error(`Expected Subtle Spell admission: ${admitted.message}`);
  }
  const projection = subtleSpellComponentProjectionForApplications(
    admitted.applications,
  );
  if (projection === null) {
    throw new Error("Expected Subtle Spell component projection.");
  }
  expect(falseLifeSpell.mechanics.components).toEqual({
    v: true,
    s: true,
    m: "a drop of alcohol",
  });
  const rollHole = requireHole(act.initialHoles, "rolledDice");
  const resolved = resolveBattleSubject({
    state,
    subject,
    fills: [damageRollFillWithGroups(rollHole, [[4, 3]])],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(
      `Expected Subtle False Life to resolve, got ${resolved.tag}.`,
    );
  }
  return {
    state: resolved.state,
    projection: {
      verbalSuppressed: projection.suppressedComponents.some(
        (component) => component.kind === "verbal",
      ),
      somaticSuppressed: projection.suppressedComponents.some(
        (component) => component.kind === "somatic",
      ),
      materialSuppressed: projection.suppressedComponents.some(
        (component) => component.kind === "material",
      ),
      materialPreserved: projection.preservedComponents.length > 0,
    },
  };
}

function createSubtleMetamagicRouteReplayDriver() {
  return defineDriver(subtleMetamagicRouteReplayDriverSchema, () => {
    let route: readonly BattleReducerRouteEvent[] =
      observeSubtleFalseLifeInitialRoute();

    function reset(): void {
      route = observeSubtleFalseLifeInitialRoute();
    }

    function recordResolvedRoute(): void {
      route = observeSubtleFalseLifeRoute();
    }

    reset();

    return {
      init: reset,
      doRouteSpellComponentProjection: recordResolvedRoute,
      stepRouteSpellComponentProjection: recordResolvedRoute,
      getState: (): SubtleMetamagicRouteReplayProjection => ({ route }),
    };
  });
}

function observeSubtleFalseLifeInitialRoute() {
  return [battleReducerStartRouteEvent()] as const;
}

function observeSubtleFalseLifeRoute() {
  const state = subtleFalseLifeBattle({ sorceryPoints: 2 });
  const act = subtleFalseLifeAct(state);
  const rollHole = requireHole(act.initialHoles, "rolledDice");
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [damageRollFillWithGroups(rollHole, [[4, 3]])],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(
      `Expected Subtle False Life route replay to resolve, got ${resolved.tag}.`,
    );
  }
  return [
    battleReducerStartRouteEvent(),
    ...(act.routeEvents ?? []),
    ...(resolved.routeEvents ?? []),
  ];
}

function rejectSubtleFalseLifeWithoutSorceryPoints(): SubtleFalseLifeProjection {
  const state = subtleFalseLifeBattle({ sorceryPoints: 0 });
  const rollHole = requireHole(
    spellAct({ state, spellId: falseLifeUnitId }).initialHoles,
    "rolledDice",
  );
  const rejected = resolveBattleSubject({
    state,
    subject: subtleFalseLifeSubject(),
    fills: [damageRollFillWithGroups(rollHole, [[4, 3]])],
  });
  expect(rejected).toMatchObject({
    tag: "invalid",
    message: "Metamagic requires enough unexpended Sorcery Points.",
  });
  expect(rejected).not.toHaveProperty("state");
  expect(sorceryPointsRemaining(state)).toBe(0);
  return {
    verbalSuppressed: false,
    somaticSuppressed: false,
    materialSuppressed: false,
    materialPreserved: false,
    sorceryPointsRemaining: sorceryPointsRemaining(state),
    tempHp: state.combatants.get(spellCasterId)?.tempHp ?? 0,
    lastResult: "unaffordableSubtleFalseLife",
  };
}

function subtleFalseLifeAct(state: BattleState): SubtleFalseLifeAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is SubtleFalseLifeAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === falseLifeUnitId &&
      candidate.subject.invocation.procedure === "scalarBuff" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === SUBTLE_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined || act.subject.tag !== "actionSpell") {
    throw new Error("Expected Subtle False Life spell act.");
  }
  return act;
}

function subtleFalseLifeProjection(input: {
  readonly state: BattleState;
  readonly projection: Omit<
    SubtleFalseLifeProjection,
    "sorceryPointsRemaining" | "tempHp" | "lastResult"
  >;
}): SubtleFalseLifeProjection {
  return {
    ...input.projection,
    sorceryPointsRemaining: sorceryPointsRemaining(input.state),
    tempHp: input.state.combatants.get(spellCasterId)?.tempHp ?? 0,
    lastResult: "subtleFalseLife",
  };
}

function subtleFalseLifeBattle(input: {
  readonly sorceryPoints: number;
}): BattleState {
  const spell = spellRecord(falseLifeUnitId);
  return spellBattle({
    preparedSpells: [spell],
    casterClassLevels: [{ className: "sorcerer", level: 2 }],
    casterResources: [
      {
        unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
        pointsRemaining: resourceCount(input.sorceryPoints),
      },
    ],
    casterMetamagic: {
      sorceryPointResourceUnitId: "sorcerer_font_of_magic",
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: [subtleMetamagicOption()],
    },
  });
}

function subtleBarkskinBattle(input: {
  readonly sorceryPoints: number;
}): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(barkskinUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    casterClassLevels: [{ className: "sorcerer", level: 3 }],
    casterResources: [
      {
        unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
        pointsRemaining: resourceCount(input.sorceryPoints),
      },
    ],
    casterMetamagic: {
      sorceryPointResourceUnitId: "sorcerer_font_of_magic",
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: [subtleMetamagicOption()],
    },
  });
}

function subtleFalseLifeSubject() {
  return {
    tag: "actionSpell",
    actorId: spellCasterId,
    invocation: spellSlotInvocationRef(falseLifeUnitId, 1, "scalarBuff"),
    mode: { tag: "cast" },
    metamagic: [{ effectKind: SUBTLE_METAMAGIC_EFFECT_KIND }],
  } as const;
}

function supportedFalseLifeInvocation(state: BattleState) {
  const actor = state.combatants.get(spellCasterId);
  if (actor === undefined) {
    throw new Error("Expected Subtle Spell caster.");
  }
  const invocation = supportedSpellActs(actor, state).find(
    (candidate) =>
      candidate.spell.id === falseLifeUnitId &&
      candidate.procedure === "scalarBuff",
  );
  if (invocation === undefined) {
    throw new Error("Expected False Life scalar buff invocation.");
  }
  return invocation;
}

function subtleMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: SUBTLE_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function sorceryPointsRemaining(state: BattleState): number {
  const actor = state.combatants.get(spellCasterId);
  const resource =
    actor?.origin.kind === "character"
      ? actor.origin.resources.find(
          (candidate): candidate is CharacterBattlePointPoolResourceState =>
            candidate.unit.id === "sorcerer_font_of_magic" &&
            characterBattleResourceIsPointPool(candidate),
        )
      : undefined;
  if (resource === undefined) {
    throw new Error("Expected Sorcery Point resource.");
  }
  return Number(resource.pointsRemaining);
}
