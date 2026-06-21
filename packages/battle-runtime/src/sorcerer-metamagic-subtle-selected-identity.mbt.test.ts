// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-cast-component-suppression
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt PPW-T05-SUBTLE-METAMAGIC-FOCUSED-MBT sorcerer_metamagic
// UNIT-IDENTITY-MBT-REPLAY: PPW-T05-SUBTLE-METAMAGIC-FOCUSED-MBT sorcerer_metamagic doResolveSubtleFalseLife doRejectSubtleFalseLifeWithoutSorceryPoints
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
import { expect } from "vitest";

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
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { damageRollFillWithGroups } from "./battle-runtime-test-support.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  falseLifeUnitId,
  spellCasterId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
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

defineSelectedIdentityWitness({
  describeLabel: "Sorcerer Subtle Spell component suppression selected identity MBT",
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

function resolveSubtleFalseLife(): {
  readonly state: BattleState;
  readonly projection: Omit<
    SubtleFalseLifeProjection,
    "sorceryPointsRemaining" | "tempHp" | "lastResult"
  >;
} {
  const state = subtleFalseLifeBattle({ sorceryPoints: 2 });
  const subject = subtleFalseLifeSubject();
  const actor = state.combatants.get(spellCasterId);
  if (actor === undefined) {
    throw new Error("Expected Subtle Spell caster.");
  }
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
  const rollHole = requireHole(
    spellAct({ state, spellId: falseLifeUnitId }).initialHoles,
    "rolledDice",
  );
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
