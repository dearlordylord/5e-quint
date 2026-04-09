import { Schema } from "effect";

import type { ClassName } from "#/features/class-tables.ts";
import { SRD_SPELLS } from "#/features/spell-registry.ts";
import type { SpellName } from "#/types.ts";

export const MODELED_PREPARED_SPELLS = [
  "bless",
  "burning_hands",
  "fireball",
  "guiding_bolt",
  "haste",
  "healing_word",
  "hold_person",
  "inflict_wounds",
  "spirit_guardians",
] as const satisfies ReadonlyArray<SpellName>;

export type ModeledPreparedSpell = (typeof MODELED_PREPARED_SPELLS)[number];

export const ModeledPreparedSpellSchema = Schema.Literal(
  ...MODELED_PREPARED_SPELLS,
);

export type ModeledPreparedSpellInfo = {
  readonly name: ModeledPreparedSpell;
  readonly baseLevel: number;
  readonly castingTime: "action" | "bonusAction";
  readonly concentration: boolean;
  readonly durationTurns?: number;
};

const MODELED_PREPARED_SPELLS_BY_CLASS = {
  barbarian: [],
  bard: ["healing_word"],
  cleric: [
    "bless",
    "guiding_bolt",
    "healing_word",
    "hold_person",
    "inflict_wounds",
    "spirit_guardians",
  ],
  druid: [],
  fighter: [],
  monk: [],
  paladin: ["bless"],
  ranger: [],
  rogue: [],
  sorcerer: ["burning_hands", "fireball", "haste"],
  warlock: [],
  wizard: ["burning_hands", "fireball", "haste", "hold_person"],
} as const satisfies Readonly<
  Record<ClassName, ReadonlyArray<ModeledPreparedSpell>>
>;

function snakeCaseSpellName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCastingTime(
  castingTime: string,
): "action" | "bonusAction" | null {
  if (castingTime === "Action") return "action";
  if (castingTime === "Bonus Action") return "bonusAction";
  return null;
}

function parseConcentrationDurationTurns(duration: string): number | undefined {
  const match = /^Concentration, up to (\d+) (minute|minutes|hour|hours)$/.exec(
    duration,
  );
  if (match == null) return undefined;
  const count = Number(match[1]);
  const unit = match[2];
  if (unit.startsWith("minute")) return count * 10;
  if (unit.startsWith("hour")) return count * 600;
  return undefined;
}

function requireSpellInfo(
  spellName: ModeledPreparedSpell,
): ModeledPreparedSpellInfo {
  const entry = SRD_SPELLS.find(
    (info) => snakeCaseSpellName(info.name) === spellName,
  );
  if (entry == null)
    throw new Error(
      `Missing SRD spell registry entry for modeled prepared spell ${spellName}`,
    );
  const castingTime = normalizeCastingTime(entry.castingTime);
  if (castingTime == null)
    throw new Error(
      `Unsupported casting time for modeled prepared spell ${spellName}: ${entry.castingTime}`,
    );
  const durationTurns = entry.concentration
    ? parseConcentrationDurationTurns(entry.duration)
    : undefined;
  if (entry.concentration && durationTurns == null) {
    throw new Error(
      `Unsupported concentration duration for modeled prepared spell ${spellName}: ${entry.duration}`,
    );
  }
  return {
    name: spellName,
    baseLevel: entry.level,
    castingTime,
    concentration: entry.concentration,
    ...(durationTurns == null ? {} : { durationTurns }),
  };
}

export const MODELED_PREPARED_SPELL_INFO: Readonly<
  Record<ModeledPreparedSpell, ModeledPreparedSpellInfo>
> = Object.fromEntries(
  MODELED_PREPARED_SPELLS.map((spellName) => [
    spellName,
    requireSpellInfo(spellName),
  ]),
) as Readonly<Record<ModeledPreparedSpell, ModeledPreparedSpellInfo>>;

export function getModeledPreparedSpellInfo(
  spellName: SpellName,
): ModeledPreparedSpellInfo | null {
  return spellName in MODELED_PREPARED_SPELL_INFO
    ? MODELED_PREPARED_SPELL_INFO[spellName as ModeledPreparedSpell]
    : null;
}

export function defaultPreparedSpellsForClassLevels(
  classLevels: Readonly<Partial<Record<ClassName, number>>>,
  slotsMax: ReadonlyArray<number>,
): ReadonlySet<ModeledPreparedSpell> {
  const highestSlotLevel = slotsMax.reduce(
    (current, count, index) => (count > 0 ? index + 1 : current),
    0,
  );
  const prepared = new Set<ModeledPreparedSpell>();
  for (const [className, spells] of Object.entries(
    MODELED_PREPARED_SPELLS_BY_CLASS,
  ) as ReadonlyArray<
    readonly [ClassName, ReadonlyArray<ModeledPreparedSpell>]
  >) {
    if ((classLevels[className] ?? 0) <= 0) continue;
    for (const spellName of spells) {
      if (MODELED_PREPARED_SPELL_INFO[spellName].baseLevel <= highestSlotLevel)
        prepared.add(spellName);
    }
  }
  return prepared;
}
