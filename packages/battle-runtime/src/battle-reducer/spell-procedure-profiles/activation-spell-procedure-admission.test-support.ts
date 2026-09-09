import { spellMechanicsHeaderPath } from "@dnd/surface/surface/spell-mechanics-path";
import { type BattleCreatureState } from "../../battle-state-execution.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import { spellCasterId } from "../../unit-profile-admission-catalog.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import type { SpellAdmissionActor } from "./profile.ts";

export function mechanicsSource(spellId: string) {
  return mechanicsSourceFromSpell(spellRecord(spellId));
}

export function mechanicsSourceFromSpell(
  spell: ReturnType<typeof spellRecord>,
) {
  const source = spellAdmissionSource(spell);
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

export type InvalidDirectEffectFixture =
  | readonly []
  | readonly [{ readonly kind: "none" }];

export function spellWithInvalidDirectEffects(
  base: ReturnType<typeof spellRecord>,
  effects: InvalidDirectEffectFixture,
): ReturnType<typeof spellRecord> {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected activation mechanics.");
  }
  const [firstPhase, ...remainingPhases] = base.mechanics.phases;
  const withInvalidEffects = (phase: typeof firstPhase) =>
    phase.kind !== "direct"
      ? phase
      : Object.defineProperty({ ...phase }, "effects", {
          configurable: true,
          enumerable: true,
          // These fixtures intentionally bypass the Surface effect schema
          // so admission can report the owned path for malformed effects.
          value: effects,
          writable: true,
        });
  return {
    ...base,
    mechanics: {
      ...base.mechanics,
      phases: [
        withInvalidEffects(firstPhase),
        ...remainingPhases.map(withInvalidEffects),
      ],
    },
  };
}

export function withUnmodeledObjectField<Value extends object>(
  value: Value,
  field: string,
): Value {
  return Object.defineProperty({ ...value }, field, {
    configurable: true,
    enumerable: true,
    value: true,
    writable: true,
  });
}

export function mapNonEmptyFirst<Value>(
  [first, ...rest]: readonly [Value, ...Value[]],
  mapFirst: (value: Value) => Value,
): readonly [Value, ...Value[]] {
  return [mapFirst(first), ...rest];
}

export const headers = [
  spellMechanicsHeaderPath("level"),
  spellMechanicsHeaderPath("school"),
  spellMechanicsHeaderPath("range"),
  spellMechanicsHeaderPath("components"),
  spellMechanicsHeaderPath("duration"),
  spellMechanicsHeaderPath("castingTime"),
  spellMechanicsHeaderPath("family"),
];

export const targetSelectionConstraintMutations = [
  ["typeFilter", { typeFilter: ["beast"] as const }],
  [
    "creatureSizeFilter",
    {
      targetKinds: ["creature"] as const,
      creatureSizeFilter: { kind: "exact", creatureSize: "medium" } as const,
    },
  ],
  [
    "stateFilter",
    {
      targetKinds: ["creature"] as const,
      stateFilter: ["falling"] as const,
    },
  ],
  [
    "disposition",
    { targetKinds: ["creature"] as const, disposition: "willing" as const },
  ],
  [
    "visibility",
    {
      targetKinds: ["creature"] as const,
      visibility: "caster_can_see" as const,
    },
  ],
] as const;

export const chainedTargetSelectionConstraintMutations = (
  ["primary", "leap"] as const
).flatMap((branch) =>
  targetSelectionConstraintMutations.map(
    ([name, mutation]) => [branch, name, mutation] as const,
  ),
);

export function spellAdmissionActor(): SpellAdmissionActor {
  const actor = spellBattle({ preparedSpells: [] }).state.combatants.get(
    spellCasterId,
  );
  if (!isSpellAdmissionActor(actor)) {
    throw new Error("Expected a spellcasting character fixture.");
  }
  return actor;
}

export function isSpellAdmissionActor(
  actor: BattleCreatureState | undefined,
): actor is SpellAdmissionActor {
  return (
    actor?.origin.kind === "character" &&
    actor.origin.spellcasting?.canCastSpells === true
  );
}

export function greaterInvisibilityCollisionSpell() {
  const base = spellRecord("invisibility");
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected activation mechanics.");
  }
  return decodeSpellRecordForTest({
    ...base,
    id: "synthetic_greater_invisibility_collision",
    name: "Synthetic Greater Invisibility Collision",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic_greater_invisibility_collision",
    },
    mechanics: {
      ...base.mechanics,
      level: 4,
      duration: {
        kind: "concentration",
        upTo: { amount: 1, unit: "minute" },
      },
      phases: base.mechanics.phases.map((phase) =>
        phase.kind !== "direct" ||
        phase.attachment.kind !== "hole" ||
        phase.attachment.value.kind !== "target"
          ? phase
          : {
              ...phase,
              attachment: {
                ...phase.attachment,
                value: {
                  ...phase.attachment.value,
                  selection: { mode: "one" },
                },
              },
            },
      ),
    },
  });
}

export function renamedSpell(spellId: string, syntheticId: string) {
  const base = spellRecord(spellId);
  return decodeSpellRecordForTest({
    ...base,
    id: syntheticId,
    name: "Synthetic Renamed Spell",
    provenance: {
      kind: "synthetic-test",
      section: syntheticId,
    },
  });
}

export function greaterRestorationCollisionSpell() {
  const base = spellRecord("lesser_restoration");
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected activation mechanics.");
  }
  return decodeSpellRecordForTest({
    ...base,
    id: "synthetic_greater_restoration_collision",
    name: "Synthetic Greater Restoration Collision",
    provenance: {
      kind: "synthetic-test",
      section: "synthetic_greater_restoration_collision",
    },
    mechanics: {
      ...base.mechanics,
      level: 5,
      phases: base.mechanics.phases.map((phase) =>
        phase.kind !== "direct"
          ? phase
          : {
              ...phase,
              effects: [
                {
                  kind: "remove_condition",
                  condition: {
                    kind: "choose",
                    from: ["charmed", "petrified"],
                  },
                },
              ],
            },
      ),
    },
  });
}
