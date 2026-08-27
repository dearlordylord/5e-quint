// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
import { isIncapacitated } from "@dnd/shared-algebras/conditions-algebra";
import type { Language } from "@dnd/shared/game-facts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { CreatureSense } from "@dnd/surface/surface/types";
import type { StatBlockCommunication } from "@dnd/surface/surface/types";

import type { BattleCreatureState } from "./battle-state-execution.ts";
import type { BattleRuntimeContext } from "./battle-runtime-context.ts";
import {
  activeDruidWildShapeForm,
  combatantSkillModifier,
} from "./battle-reducer/druid-wild-shape.ts";

export type BattleCreatureSpecialSense = CreatureSense & {
  readonly qualifier?: "unimpeded_by_magical_darkness";
};

export type BattleStatBlockCommunicationText =
  | {
      readonly kind: "absentStatBlockLanguages";
    }
  | {
      readonly kind: "casterLanguagesReference";
    }
  | {
      readonly kind: "authoredStatBlockLanguageEntries";
      readonly entries: ReadonlyNonEmptyArray<string>;
    };

export type BattleCharacterSpeechProjection = {
  readonly kind: "retainedCharacterSpeech";
  readonly blockedByCondition: boolean;
};

export type BattleCreatureCommunicationProjection =
  | {
      readonly kind: "characterRetainedCommunication";
      readonly knownLanguages: ReadonlyNonEmptyArray<Language>;
      readonly speech: BattleCharacterSpeechProjection;
    }
  | {
      readonly kind: "statBlockCommunicationText";
      readonly languages: BattleStatBlockCommunicationText;
    };

export type BattleCreaturePerceptionCommunicationProjection = {
  readonly specialSenses: readonly BattleCreatureSpecialSense[];
  readonly passivePerception: number;
  readonly communication: BattleCreatureCommunicationProjection;
};

export function combatantPerceptionCommunicationProjection(
  combatant: BattleCreatureState,
  context: BattleRuntimeContext,
): BattleCreaturePerceptionCommunicationProjection {
  return {
    specialSenses: combatantSpecialSenses(combatant),
    passivePerception: combatantPassivePerception(combatant),
    communication: combatantCommunicationProjection(combatant, context),
  };
}

function combatantPassivePerception(combatant: BattleCreatureState): number {
  const activeForm = activeDruidWildShapeForm(combatant);
  if (activeForm !== null) return activeForm.statBlock.passivePerception;
  if (combatant.origin.kind === "statBlock") {
    return combatant.origin.mechanics.passivePerception;
  }
  return 10 + combatantSkillModifier(combatant, "perception");
}

function combatantSpecialSenses(
  combatant: BattleCreatureState,
): readonly BattleCreatureSpecialSense[] {
  const activeForm = activeDruidWildShapeForm(combatant);
  if (activeForm !== null) {
    return activeForm.statBlock.senses ?? [];
  }
  if (combatant.origin.kind === "statBlock") {
    return combatant.origin.mechanics.specialSenses;
  }
  return [];
}

function combatantCommunicationProjection(
  combatant: BattleCreatureState,
  context: BattleRuntimeContext,
): BattleCreatureCommunicationProjection {
  if (combatant.origin.kind === "character") {
    return {
      kind: "characterRetainedCommunication",
      knownLanguages: combatant.origin.knownLanguages,
      speech: {
        kind: "retainedCharacterSpeech",
        blockedByCondition: isIncapacitated(combatant.conditions),
      },
    };
  }
  const presentation = context.statBlocks.get(combatant.combatantId);
  if (presentation === undefined) {
    return {
      kind: "statBlockCommunicationText",
      languages: { kind: "absentStatBlockLanguages" },
    };
  }
  return {
    kind: "statBlockCommunicationText",
    languages: statBlockCommunicationText(presentation.communication),
  };
}

function statBlockCommunicationText(
  communication: StatBlockCommunication,
): BattleStatBlockCommunicationText {
  if (
    communication.kind !== "spoken_and_understood" &&
    communication.kind !== "understood_but_cannot_speak"
  ) {
    return { kind: "absentStatBlockLanguages" };
  }
  if (communication.languages.kind === "all") {
    return { kind: "casterLanguagesReference" };
  }
  if (communication.languages.kind === "named") {
    return {
      kind: "authoredStatBlockLanguageEntries",
      entries: communication.languages.languages,
    };
  }
  return {
    kind: "authoredStatBlockLanguageEntries",
    entries: [
      ...communication.languages.languages,
      `other languages (${communication.languages.additionalLanguages})`,
    ],
  };
}
