import type {
  ActivationPhase,
  ClassName,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { expect } from "vitest";
import { type BattleCreatureInit } from "./index.ts";
import { unitLibrary } from "./unit-profile-admission-catalog-support.ts";

export function spellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  expect(unit.kind).toBe("spell");
  return unit as SpellRecord;
}

export function spellWithSaveGateRepeatSaves(
  base: SpellRecord,
  id: string,
): SpellRecord {
  if (
    base.mechanics.family !== "activation" &&
    base.mechanics.family !== "triggered_reaction"
  ) {
    throw new Error("Expected phased spell mechanics.");
  }
  const phase = base.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    throw new Error("Expected first phase to be a save gate.");
  }
  const repeatPhase = {
    ...phase,
    repeatSaves: [
      { cadence: "end_of_target_turn", onSuccess: "ends_on_target" },
    ],
  } as const satisfies ActivationPhase;

  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      phases: [repeatPhase],
    },
  } as SpellRecord;
}

export function hideousLaughterWithPhase(
  base: SpellRecord,
  mapPhase: (
    phase: Extract<ActivationPhase, { readonly kind: "save_gate" }>,
  ) => ActivationPhase,
): SpellRecord {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected Hideous Laughter activation mechanics.");
  }
  const phase = base.mechanics.phases[0];
  if (phase?.kind !== "save_gate") {
    throw new Error("Expected Hideous Laughter save gate.");
  }
  return {
    ...base,
    mechanics: {
      ...base.mechanics,
      phases: [mapPhase(phase)],
    },
  } as SpellRecord;
}

export function thunderwaveWithoutDirectPhase(
  base: SpellRecord,
  id: string,
): SpellRecord {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected Thunderwave activation mechanics.");
  }
  const [phase] = base.mechanics.phases;
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      phases: [phase],
    },
  } as SpellRecord;
}

export function thunderwaveWithoutFailedSavePush(
  base: SpellRecord,
  id: string,
): SpellRecord {
  const { phase, directPhase, damage } = thunderwaveSaveGateParts(base);
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      phases: [{ ...phase, onFail: damage }, directPhase],
    },
  } as SpellRecord;
}

export function thunderwaveWithFailedSaveDamage(
  base: SpellRecord,
  id: string,
  mutateDamage: (
    damage: ReturnType<typeof thunderwaveSaveGateParts>["damage"],
  ) => ReturnType<typeof thunderwaveSaveGateParts>["damage"],
): SpellRecord {
  const { phase, directPhase, damage, riders } = thunderwaveSaveGateParts(base);
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      phases: [
        {
          ...phase,
          onFail: {
            kind: "composite",
            effects: [mutateDamage(damage), ...riders],
          },
        },
        directPhase,
      ],
    },
  } as SpellRecord;
}

export function thunderwaveWithFixedSaveDc(
  base: SpellRecord,
  id: string,
): SpellRecord {
  const { phase, directPhase } = thunderwaveSaveGateParts(base);
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      phases: [{ ...phase, dc: { kind: "fixed", dc: 12 } }, directPhase],
    },
  } as SpellRecord;
}

export function thunderwaveWithSaveGateCone(
  base: SpellRecord,
  id: string,
): SpellRecord {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected Thunderwave activation mechanics.");
  }
  const [phase, directPhase] = base.mechanics.phases;
  if (
    phase?.kind !== "save_gate" ||
    phase.attachment.kind !== "area" ||
    directPhase === undefined
  ) {
    throw new Error("Expected Thunderwave area save gate and direct phase.");
  }
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      phases: [
        {
          ...phase,
          attachment: {
            ...phase.attachment,
            shape: { kind: "cone", lengthFeet: 15 },
          },
        },
        directPhase,
      ],
    },
  } as SpellRecord;
}

export function thunderwaveSaveGateParts(base: SpellRecord) {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected Thunderwave activation mechanics.");
  }
  const [phase, directPhase] = base.mechanics.phases;
  if (phase?.kind !== "save_gate" || directPhase === undefined) {
    throw new Error("Expected Thunderwave save gate and direct phase.");
  }
  if (phase.onFail.kind !== "composite") {
    throw new Error("Expected Thunderwave composite failed-save effect.");
  }
  const [damage, ...riders] = phase.onFail.effects;
  if (damage?.kind !== "damage") {
    throw new Error("Expected Thunderwave failed-save damage.");
  }
  return { phase, directPhase, damage, riders };
}

export function eldritchBlastWithTargetCount(
  base: SpellRecord,
  id: string,
  count: unknown,
): SpellRecord {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected Eldritch Blast activation mechanics.");
  }
  const [phase] = base.mechanics.phases;
  if (
    phase?.kind !== "attack_roll" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target"
  ) {
    throw new Error("Expected Eldritch Blast target hole.");
  }
  return {
    ...base,
    id,
    mechanics: {
      ...base.mechanics,
      phases: [
        {
          ...phase,
          attachment: {
            ...phase.attachment,
            value: {
              ...phase.attachment.value,
              selection: {
                ...phase.attachment.value.selection,
                count,
              },
            },
          },
        },
      ],
    },
  } as SpellRecord;
}

export function singleSpellcastingSourceClassName(
  classLevels: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"],
): ClassName {
  if (classLevels.length !== 1) {
    throw new Error("Test spellcasting fixtures require one source class.");
  }
  const [classLevel] = classLevels;
  return classLevel.className;
}
