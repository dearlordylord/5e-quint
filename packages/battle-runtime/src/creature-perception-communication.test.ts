import { expect, test } from "vitest";

import {
  combatantPerceptionCommunicationProjection,
  type BattleFill,
  type BattleCreatureState,
  type BattleHole,
  type BattleState,
  type BattleSubject,
} from "./index.ts";
import {
  battleId,
  characterSeed,
  combatantId,
  discoverBattleActs,
  requireResolved,
  resolveBattleSubject,
  spellRecord,
  startBattleRight,
  statBlockCatalog,
  statBlockCreatureInit,
  statBlockRecord,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

const characterCombatantId = combatantId("projection-character");
const statBlockCombatantId = combatantId("projection-stat-block");

test("projects Stat Block senses and authored communication text", () => {
  const statBlock = {
    ...statBlockRecord(),
    statBlock: {
      ...statBlockRecord().statBlock,
      senses: [{ kind: "darkvision", rangeFeet: 60 }],
      languages: ["Common", "Synthetic Signal Code"],
      skillModifiers: [{ skill: "perception", modifier: 4 }],
    },
  } satisfies StatBlockRecord;
  const combatant = statBlockCombatant(statBlock);

  expect(combatantPerceptionCommunicationProjection(combatant)).toEqual({
    specialSenses: [{ kind: "darkvision", rangeFeet: 60 }],
    passivePerception: 14,
    communication: {
      kind: "statBlockCommunicationText",
      languages: {
        kind: "authoredStatBlockLanguageEntries",
        entries: ["Common", "Synthetic Signal Code"],
      },
    },
  });
});

test("projects absent Stat Block languages distinctly from authored entries", () => {
  const base = statBlockRecord();
  const { languages: _languages, ...statBlockWithoutLanguages } =
    base.statBlock;
  const combatant = statBlockCombatant({
    ...base,
    statBlock: statBlockWithoutLanguages,
  });

  expect(
    combatantPerceptionCommunicationProjection(combatant).communication,
  ).toEqual({
    kind: "statBlockCommunicationText",
    languages: { kind: "absentStatBlockLanguages" },
  });
});

test("projects character languages and speech while not Incapacitated", () => {
  const combatant = characterCombatant({
    knownLanguages: ["Common", "Druidic", "Goblin"],
  });

  expect(combatantPerceptionCommunicationProjection(combatant)).toEqual({
    specialSenses: [],
    passivePerception: 12,
    communication: {
      kind: "characterRetainedCommunication",
      knownLanguages: ["Common", "Druidic", "Goblin"],
      speech: {
        kind: "retainedCharacterSpeech",
        blockedByCondition: false,
      },
    },
  });
});

test("projects retained character speech as blocked by Incapacitated", () => {
  const combatant = characterCombatant({
    knownLanguages: ["Common", "Druidic", "Goblin"],
    conditions: ["incapacitated"],
  });

  expect(
    combatantPerceptionCommunicationProjection(combatant).communication,
  ).toEqual({
    kind: "characterRetainedCommunication",
    knownLanguages: ["Common", "Druidic", "Goblin"],
    speech: {
      kind: "retainedCharacterSpeech",
      blockedByCondition: true,
    },
  });
});

test("projects Wild Shape form senses while retaining character communication", () => {
  const form = {
    ...statBlockCatalog.requireStatBlock("stat_block_riding_horse"),
    statBlock: {
      ...statBlockCatalog.requireStatBlock("stat_block_riding_horse").statBlock,
      senses: [{ kind: "blindsight", rangeFeet: 10 }],
      languages: ["Synthetic Beast Vocalization"],
      skillModifiers: [{ skill: "perception", modifier: 5 }],
    },
  } satisfies StatBlockRecord;
  const initial = wildShapeBattle({
    knownLanguages: ["Common", "Druidic", "Goblin"],
    knownForms: [
      statBlockCatalog.requireStatBlock("stat_block_rat"),
      form,
      statBlockCatalog.requireStatBlock("stat_block_lizard"),
      statBlockCatalog.requireStatBlock("stat_block_cat"),
    ],
  });
  const assumed = requireResolved(
    resolveWildShapeAssumeFormWithMergedEquipment(initial, form.id),
  );
  const combatant = requireCombatant(assumed.state, characterCombatantId);

  expect(combatantPerceptionCommunicationProjection(combatant)).toEqual({
    specialSenses: [{ kind: "blindsight", rangeFeet: 10 }],
    passivePerception: 15,
    communication: {
      kind: "characterRetainedCommunication",
      knownLanguages: ["Common", "Druidic", "Goblin"],
      speech: {
        kind: "retainedCharacterSpeech",
        blockedByCondition: false,
      },
    },
  });
});

function statBlockCombatant(statBlock: StatBlockRecord): BattleCreatureState {
  const state = startBattleRight({
    battleId: battleId("battle:projection-stat-block"),
    combatants: [
      statBlockCreatureInit({
        combatantId: statBlockCombatantId,
        initiative: 10,
        statBlock,
      }),
    ],
  });
  return requireCombatant(state, statBlockCombatantId);
}

function characterCombatant(input: {
  readonly knownLanguages: ["Common", ...("Druidic" | "Goblin")[]];
  readonly conditions?: readonly ["incapacitated"];
}): BattleCreatureState {
  const state = startBattleRight({
    battleId: battleId("battle:projection-character"),
    combatants: [
      characterSeed({
        combatantId: characterCombatantId,
        initiative: 20,
        knownLanguages: input.knownLanguages,
        d20Statistics: {
          abilityScores: {
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 14,
            cha: 10,
          },
          savingThrowProficiencies: [],
          skillProficiencies: [],
          skillExpertise: [],
        },
        ...(input.conditions === undefined
          ? {}
          : { conditions: input.conditions }),
      }),
    ],
  });
  return requireCombatant(state, characterCombatantId);
}

function wildShapeBattle(input: {
  readonly knownLanguages: ["Common", ...("Druidic" | "Goblin")[]];
  readonly knownForms: readonly StatBlockRecord[];
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle:projection-wild-shape"),
    combatants: [
      characterSeed({
        combatantId: characterCombatantId,
        displayName: "Druid",
        initiative: 20,
        classLevels: [{ className: "druid", level: 2 }],
        knownLanguages: input.knownLanguages,
        resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
        druidWildShapeKnownForms: input.knownForms,
        spellcasting: {
          ...wizardSpellcasting({
            cantrips: [spellRecord("produce_flame")],
            preparedSpells: [spellRecord("cure_wounds")],
          }),
          sourceClassName: "druid",
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function wildShapeAssumeFormSubject(
  state: BattleState,
  formStatBlockId: string,
): Extract<BattleSubject, { readonly tag: "druidWildShape" }> {
  const subject = discoverBattleActs(state).find(
    (act) =>
      act.subject.tag === "druidWildShape" &&
      act.subject.action === "assumeForm" &&
      act.subject.formStatBlockId === formStatBlockId,
  )?.subject;
  if (subject?.tag !== "druidWildShape") {
    throw new Error("Expected Druid Wild Shape assume-form subject.");
  }
  return subject;
}

function resolveWildShapeAssumeFormWithMergedEquipment(
  state: BattleState,
  formStatBlockId: string,
) {
  const subject = wildShapeAssumeFormSubject(state, formStatBlockId);
  const needsDisposition = resolveBattleSubject({
    state,
    subject,
    fills: [],
  });
  if (needsDisposition.tag !== "needsHoles") {
    throw new Error("Expected Wild Shape object handling hole.");
  }
  const hole = requireWildShapeEquipmentDispositionHole(needsDisposition.holes);
  return resolveBattleSubject({
    state,
    subject,
    fills: [wildShapeDispositionFill(hole)],
  });
}

function requireWildShapeEquipmentDispositionHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "wildShapeEquipmentDisposition" }> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<
      BattleHole,
      { readonly kind: "wildShapeEquipmentDisposition" }
    > => candidate.kind === "wildShapeEquipmentDisposition",
  );
  if (hole === undefined) {
    throw new Error("Expected Wild Shape equipment disposition hole.");
  }
  return hole;
}

function wildShapeDispositionFill(
  hole: Extract<BattleHole, { readonly kind: "wildShapeEquipmentDisposition" }>,
): Extract<BattleFill, { readonly kind: "wildShapeEquipmentDisposition" }> {
  return {
    kind: "wildShapeEquipmentDisposition",
    holeId: hole.holeId,
    value: {
      formLimbs: { kind: "canHandleObjects" },
      choices: hole.candidates.map((item) => ({
        item,
        disposition: "merges" as const,
      })),
    },
  };
}

function requireCombatant(
  state: BattleState,
  combatantId: typeof characterCombatantId | typeof statBlockCombatantId,
): BattleCreatureState {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant: ${combatantId}.`);
  }
  return combatant;
}
